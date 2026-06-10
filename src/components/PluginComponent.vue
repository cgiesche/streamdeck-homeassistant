<template>
  <span>Nothing to see here!</span>
</template>

<script setup>
import { GlobalSettings, Settings } from '@/modules/common/settings'
import { StreamDeck } from '@/modules/common/streamdeck'
import { LruCache } from '@/modules/common/lruCache'
import { Homeassistant } from '@/modules/homeassistant/homeassistant'
import { EntityConfigFactory } from '@/modules/plugin/entityConfigFactoryNg'
import { SvgUtils, WIDTH, HEIGHT } from '@/modules/plugin/svgUtils'
import axios from 'axios'
import yaml from 'js-yaml'
import nunjucks from 'nunjucks'
import { onMounted, ref } from 'vue'
import defaultActiveStates from '../../public/config/active-states.yml'

let entityConfigFactory
const svgUtils = new SvgUtils()

const imageCache = new LruCache(30)

async function fetchEntityPictureAsDataUri(entityPictureUrl, serverUrl) {
  const fullUrl = entityPictureUrl.startsWith('http')
    ? entityPictureUrl
    : serverUrl.replace(/\/$/, '') + entityPictureUrl

  const cached = imageCache.get(fullUrl)
  if (cached) return cached

  try {
    const response = await fetch(fullUrl)
    if (!response.ok) return null
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(blobUrl)
        const canvas = document.createElement('canvas')
        canvas.width = WIDTH
        canvas.height = HEIGHT
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        const scale = Math.max(WIDTH / img.width, HEIGHT / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (WIDTH - w) / 2, 0, w, h)
        const dataUri = canvas.toDataURL('image/jpeg', 0.2)
        imageCache.set(fullUrl, dataUri)
        resolve(dataUri)
      }
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl)
        resolve(null)
      }
      img.src = blobUrl
    })
  } catch {
    return null
  }
}

const $SD = ref(null)
const $HA = ref(null)
let reconnectTimeout = null
const globalSettings = ref({})
const actionSettings = ref({})
const buttonLongpressTimeouts = new Map()
let haEntitySubscription = null
let subscriptionGeneration = 0
// Tracks the latest render started per context so stale async renders
// (slow entity picture fetch, SVG rasterization) never overwrite newer ones.
const renderGeneration = new Map()

const activeStates = ref(defaultActiveStates)

const rotationTimeout = {}
const rotationAmount = {}
const rotationPercent = {}

onMounted(async () => {
  window.connectElgatoStreamDeckSocket = (inPort, inPluginUUID, inRegisterEvent, inInfo) => {
    $SD.value = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, '{}')

    $SD.value.on('globalsettings', (inGlobalSettings) => {
      $SD.value.log('Got global settings.')
      const originalJson = JSON.stringify(inGlobalSettings)
      const migratedSettings = GlobalSettings.migrate(inGlobalSettings)
      if (JSON.stringify(migratedSettings) !== originalJson) {
        $SD.value.saveGlobalSettings(migratedSettings)
      }
      globalSettings.value = migratedSettings
      const configUrl =
        migratedSettings.displayConfiguration?.urlOverride ||
        migratedSettings.displayConfiguration?.url
      entityConfigFactory = new EntityConfigFactory(
        configUrl ? () => axios.get(configUrl).then((r) => yaml.load(r.data)) : null
      )
      connectHomeAssistant()
    })

    $SD.value.on('connected', () => {
      $SD.value.requestGlobalSettings()
    })

    $SD.value.on('keyDown', (message) => {
      buttonDown(message.context)
    })

    $SD.value.on('keyUp', (message) => {
      buttonUp(message.context)
    })

    $SD.value.on('willAppear', (message) => {
      let context = message.context
      rotationAmount[context] = 0
      rotationPercent[context] = 0
      actionSettings.value[context] = Settings.parse(message.payload.settings)
      if ($HA.value) {
        $HA.value.getStatesDebounced(entityStatesChanged)
        resubscribeEntities()
      }
    })

    $SD.value.on('willDisappear', (message) => {
      let context = message.context
      delete actionSettings.value[context]
      renderGeneration.delete(context)
      resubscribeEntities()
    })

    $SD.value.on('dialRotate', (message) => {
      let context = message.context
      let settings = actionSettings.value[context]
      let scaledTicks = message.payload.ticks * (settings.rotationTickMultiplier || 1)
      let tickBucketSizeMs = settings.rotationTickBucketSizeMs || 300

      rotationAmount[context] += scaledTicks
      rotationPercent[context] += scaledTicks
      if (rotationPercent[context] < 0) {
        rotationPercent[context] = 0
      } else if (rotationPercent[context] > 100) {
        rotationPercent[context] = 100
      }

      if (rotationTimeout[context]) return

      let serviceCall = () => {
        callService(context, settings.button.serviceRotation, {
          ticks: rotationAmount[context],
          rotationPercent: rotationPercent[context],
          rotationAbsolute: 2.55 * rotationPercent[context]
        })
        rotationAmount[context] = 0
        rotationTimeout[context] = null
      }

      if (tickBucketSizeMs > 0) {
        rotationTimeout[context] = setTimeout(serviceCall, tickBucketSizeMs)
      } else {
        serviceCall()
      }
    })

    $SD.value.on('dialDown', (message) => {
      buttonDown(message.context)
    })

    $SD.value.on('dialUp', (message) => {
      buttonUp(message.context)
    })

    $SD.value.on('touchTap', (message) => {
      let context = message.context
      let settings = actionSettings.value[context]
      callService(context, settings.button.serviceTap)
    })

    $SD.value.on('didReceiveSettings', (message) => {
      let context = message.context
      rotationAmount[context] = 0
      actionSettings.value[context] = Settings.parse(message.payload.settings)
      if ($HA.value) {
        $HA.value.getStatesDebounced(entityStatesChanged)
        resubscribeEntities()
      }
    })
  }

  await fetchActiveStates()
})

async function fetchActiveStates() {
  try {
    const response = await axios.get(
      'https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/active-states.yml'
    )
    activeStates.value = yaml.load(response.data)
  } catch (error) {
    console.log(`Failed to download updated active-states.yml: ${error}`)
  }
}

function connectHomeAssistant() {
  console.log('Connecting to Home Assistant')
  if (globalSettings.value.serverUrl && globalSettings.value.accessToken) {
    if ($HA.value) {
      $HA.value.close()
    }
    console.log('Connecting to Home Assistant ' + globalSettings.value.serverUrl)
    $HA.value = new Homeassistant(
      globalSettings.value.serverUrl,
      globalSettings.value.accessToken,
      onHAConnected,
      onHAError,
      onHAClosed
    )
  }
}

const onHAConnected = () => {
  $HA.value.getStatesDebounced(entityStatesChanged)
  resubscribeEntities()
}

function onHAError(msg) {
  haEntitySubscription = null
  showAlert()
  console.log(`Home Assistant connection error: ${msg}`)
  window.clearTimeout(reconnectTimeout)
  reconnectTimeout = window.setTimeout(connectHomeAssistant, 5000)
}

function onHAClosed(msg) {
  haEntitySubscription = null
  showAlert()
  console.log(`Home Assistant connection closed, trying to reopen connection: ${msg}`)
  window.clearTimeout(reconnectTimeout)
  reconnectTimeout = window.setTimeout(connectHomeAssistant, 5000)
}

function getConfiguredEntityIds() {
  return [
    ...new Set(
      Object.values(actionSettings.value)
        .map((s) => s.display.entityId)
        .filter(Boolean)
    )
  ]
}

async function resubscribeEntities() {
  if (!$HA.value) return
  const generation = ++subscriptionGeneration

  if (haEntitySubscription) {
    const unsubscribe = haEntitySubscription
    haEntitySubscription = null
    try {
      await unsubscribe()
    } catch {
      // connection may already be gone
    }
  }

  const entityIds = getConfiguredEntityIds()
  if (entityIds.length === 0) return

  let subscription = null
  try {
    subscription = await $HA.value.subscribeEntitiesChanged(entityIds, entityStateChanged)
  } catch (e) {
    console.log(`Failed to subscribe to entity changes: ${e}`)
    return
  }

  if (generation !== subscriptionGeneration) {
    // A newer resubscribe started while we were awaiting; discard this one.
    try {
      await subscription?.()
    } catch {
      // ignore
    }
    return
  }
  haEntitySubscription = subscription
}

function showAlert() {
  Object.keys(actionSettings.value).forEach((key) => $SD.value.showAlert(key))
}

function entityStatesChanged(event) {
  event.forEach(updateState)
}

function entityStateChanged(event) {
  const newState = event?.variables?.trigger?.to_state
  if (newState) {
    updateState(newState)
  }
}

function updateState(stateMessage) {
  if (!stateMessage.entity_id) {
    console.log(`Missing entity_id in updated state: ${stateMessage}`)
    return
  }

  let domain = stateMessage.entity_id.split('.')[0]
  let changedContexts = Object.keys(actionSettings.value).filter(
    (key) => actionSettings.value[key].display.entityId === stateMessage.entity_id
  )

  const enrichedState = {
    ...stateMessage,
    attributes: { ...stateMessage.attributes }
  }
  if (enrichedState.last_updated != null)
    enrichedState.attributes['last_updated'] = new Date(enrichedState.last_updated).toLocaleTimeString()
  if (enrichedState.last_changed != null)
    enrichedState.attributes['last_changed'] = new Date(enrichedState.last_changed).toLocaleTimeString()

  changedContexts.forEach((context) => {
    const generation = (renderGeneration.get(context) ?? 0) + 1
    renderGeneration.set(context, generation)
    updateContextState(context, domain, enrichedState, generation).catch((e) => {
      console.error(e)
      $SD.value.setImage(context, null)
      $SD.value.showAlert(context)
    })
  })
}

function isEncoder(contextSettings) {
  return contextSettings.controllerType === 'Encoder'
}

async function updateContextState(currentContext, domain, stateObject, generation) {
  const isStale = () => renderGeneration.get(currentContext) !== generation
  let contextSettings = actionSettings.value[currentContext]
  if (!contextSettings) return
  let renderingConfig = entityConfigFactory.determineConfig(
    domain,
    stateObject,
    contextSettings.display
  )

  const showIndicators = contextSettings.display.enableServiceIndicator !== false // undefined = on by default
  renderingConfig.isAction = contextSettings.button.serviceShortPress.serviceId && showIndicators
  renderingConfig.isMultiAction =
    contextSettings.button.serviceLongPress.serviceId && showIndicators
  renderingConfig.labelFontSize = contextSettings.display.labelFontSize ?? 48

  if (renderingConfig.rotationPercent !== undefined) {
    rotationPercent[currentContext] = renderingConfig.rotationPercent
  }

  if (contextSettings.display.useCustomTitle) {
    let state = stateObject.state
    let stateAttributes = stateObject.attributes
    renderingConfig.customTitle = nunjucks.renderString(contextSettings.display.buttonTitle, {
      state,
      ...stateAttributes
    })
  }

  if (contextSettings.display.useCustomButtonLabels) {
    renderingConfig.labelTemplates = contextSettings.display.buttonLabels.split('\n')
  }

  if (!renderingConfig.color) {
    renderingConfig.color =
      activeStates.value.includes(stateObject.state)
        ? entityConfigFactory.colors.active
        : entityConfigFactory.colors.neutral
  }

  const entityPicture = stateObject.attributes?.entity_picture
  if (entityPicture && globalSettings.value?.serverUrl) {
    renderingConfig.backgroundImage = await fetchEntityPictureAsDataUri(
      entityPicture,
      globalSettings.value.serverUrl
    )
  }
  if (isStale()) return

  if (isEncoder(contextSettings)) {
    if (!renderingConfig.feedbackLayout) {
      renderingConfig.feedbackLayout = '$A1'
    }
    $SD.value.setFeedbackLayout(currentContext, { layout: renderingConfig.feedbackLayout })

    if (!renderingConfig.feedback) {
      renderingConfig.feedback = {}
    }
    renderingConfig.feedback.title = renderingConfig.customTitle ?? ''
    if (renderingConfig.feedback.value === undefined) {
      renderingConfig.feedback.value = svgUtils
        .renderTemplates(renderingConfig.labelTemplates, {
          ...stateObject.attributes,
          state: stateObject.state
        })
        .join(' ')
    }
    renderingConfig.feedback.icon = await svgUtils.svgToJpegDataUri(
      svgUtils.renderButtonSVG({ ...renderingConfig, labelTemplates: [] }, stateObject)
    )
    if (isStale()) return
    $SD.value.setFeedback(currentContext, renderingConfig.feedback)
  } else if (contextSettings.display.useStateImagesForOnOffStates) {
    if (renderingConfig.customTitle) {
      $SD.value.setTitle(currentContext, renderingConfig.customTitle)
    }
    if (activeStates.value.includes(stateObject.state)) {
      console.log('Setting state of ' + currentContext + ' to 1')
      $SD.value.setState(currentContext, 1)
    } else {
      console.log('Setting state of ' + currentContext + ' to 0')
      $SD.value.setState(currentContext, 0)
    }
  } else {
    if (renderingConfig.customTitle) {
      $SD.value.setTitle(currentContext, renderingConfig.customTitle)
    }
    const image = await svgUtils.svgToJpegDataUri(
      svgUtils.renderButtonSVG(renderingConfig, stateObject)
    )
    if (isStale()) return
    $SD.value.setImage(currentContext, image)
  }
}

function buttonDown(context) {
  const timeout = setTimeout(buttonLongPress, 300, context)
  buttonLongpressTimeouts.set(context, timeout)
}

function buttonUp(context) {
  // If "long press timeout" is still present, we perform a normal press
  const lpTimeout = buttonLongpressTimeouts.get(context)
  if (lpTimeout) {
    clearTimeout(lpTimeout)
    buttonLongpressTimeouts.delete(context)
    buttonShortPress(context)
  }
}

function buttonShortPress(context) {
  let settings = actionSettings.value[context]
  callService(context, settings.button.serviceShortPress)
}

function buttonLongPress(context) {
  buttonLongpressTimeouts.delete(context)
  let settings = actionSettings.value[context]
  if (settings.button.serviceLongPress.serviceId) {
    callService(context, settings.button.serviceLongPress)
  } else {
    callService(context, settings.button.serviceShortPress)
  }
}

function callService(context, serviceToCall, serviceDataAttributes = {}) {
  if (!serviceToCall['serviceId']) return

  try {
    let serviceData = null
    if (serviceToCall.serviceData) {
      let renderedServiceData = nunjucks.renderString(
        serviceToCall.serviceData,
        serviceDataAttributes
      )
      serviceData = JSON.parse(renderedServiceData)
    }

    if (serviceToCall.serviceId === 'streamdeck.open_url') {
      const url = serviceData?.url
      if (url) {
        $SD.value.openUrl(url)
      } else {
        $SD.value.showAlert(context)
      }
      return
    }

    const serviceIdParts = serviceToCall.serviceId.split('.')
    if ($HA.value) {
      $HA.value
        .callService(serviceIdParts[0], serviceIdParts[1], serviceToCall.entityId, serviceData)
        .catch((e) => {
          console.error(e)
          $SD.value.showAlert(context)
        })
    }
  } catch (e) {
    console.error(e)
    $SD.value.showAlert(context)
  }
}
</script>
