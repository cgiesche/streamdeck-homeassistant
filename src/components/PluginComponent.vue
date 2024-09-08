<template>
  <span>Nothing to see here!</span>
</template>

<script setup>
import { StreamDeck } from '@/modules/common/streamdeck'
import { Homeassistant } from '@/modules/homeassistant/homeassistant'
import { SvgUtils } from '@/modules/plugin/svgUtils'
import nunjucks from 'nunjucks'
import { Settings } from '@/modules/common/settings'
import { onMounted, ref } from 'vue'
import { EntityConfigFactory } from '@/modules/plugin/entityConfigFactoryNg'
import defaultActiveStates from '../../public/config/active-states.yml'
import axios from 'axios'
import yaml from 'js-yaml'

let entityConfigFactory
const buttonSvgUtils = new SvgUtils()
const touchScreenSvgUtils = new SvgUtils({ width: 200, height: 100 })

const $SD = ref(null)
const $HA = ref(null)
const $reconnectTimeout = ref({})
const globalSettings = ref({})
const actionSettings = ref([])
const buttonLongpressTimeouts = ref(new Map()) //context, timeout

const activeStates = ref(defaultActiveStates)

let rotationTimeout = []
let rotationAmount = []
let rotationPercent = []

onMounted(async () => {

  window.connectElgatoStreamDeckSocket = (inPort, inPluginUUID, inRegisterEvent, inInfo) => {
    $SD.value = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, '{}')

    $SD.value.on('globalsettings', (inGlobalSettings) => {
        console.log('Got global settings.')
        globalSettings.value = inGlobalSettings
        entityConfigFactory = new EntityConfigFactory(inGlobalSettings.displayConfiguration?.urlOverride || inGlobalSettings.displayConfiguration?.url)
        connectHomeAssistant()
      }
    )

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
      }
    })

    $SD.value.on('willDisappear', (message) => {
      let context = message.context
      delete actionSettings.value[context]
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

      if (rotationTimeout[context])
        return

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
      }
    })
  }

  await fetchActiveStates()
})

async function fetchActiveStates() {
  try {
    axios.get('https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/active-states.yml')
      .then(response => activeStates.value = yaml.load(response.data))
      .catch(error => console.log(`Failed to download updated active-states.json: ${error}`))
  } catch (error) {
    console.log(`Failed to download updated active-states.json: ${error}`)
  }
}

function connectHomeAssistant() {
  console.log('Connecting to Home Assistant')
  if (globalSettings.value.serverUrl && globalSettings.value.accessToken) {
    if ($HA.value) {
      $HA.value.close()
    }
    console.log('Connecting to Home Assistant ' + globalSettings.value.serverUrl)
    $HA.value = new Homeassistant(globalSettings.value.serverUrl, globalSettings.value.accessToken, onHAConnected, onHAError, onHAClosed)
  }
}

const onHAConnected = () => {
  $HA.value.getStatesDebounced(entityStatesChanged)
  $HA.value.subscribeEvents(entityStateChanged)
}

function onHAError(msg) {
  showAlert()
  console.log(`Home Assistant connection error: ${msg}`)
  window.clearTimeout($reconnectTimeout)
  $reconnectTimeout.value = window.setTimeout(connectHomeAssistant, 5000)
}

function onHAClosed(msg) {
  showAlert()
  console.log(`Home Assistant connection closed, trying to reopen connection: ${msg}`)
  window.clearTimeout($reconnectTimeout)
  $reconnectTimeout.value = window.setTimeout(connectHomeAssistant, 5000)
}

function showAlert() {
  Object.keys(actionSettings.value).forEach(key => $SD.value.showAlert(key))
}

function entityStatesChanged(event) {
  event.forEach(updateState)
}

function entityStateChanged(event) {
  if (event) {
    let newState = event.data.new_state
    updateState(newState)
  }
}

function updateState(stateMessage) {
  if (!stateMessage.entity_id) {
    console.log(`Missing entity_id in updated state: ${stateMessage}`)
    return
  }

  let domain = stateMessage.entity_id.split('.')[0]
  let changedContexts = Object.keys(actionSettings.value).filter(key => actionSettings.value[key].display.entityId === stateMessage.entity_id)

  changedContexts.forEach(context => {
    try {
      if (stateMessage.last_updated != null) stateMessage.attributes['last_updated'] = new Date(stateMessage.last_updated).toLocaleTimeString()
      if (stateMessage.last_changed != null) stateMessage.attributes['last_changed'] = new Date(stateMessage.last_changed).toLocaleTimeString()

      updateContextState(context, domain, stateMessage)
    } catch (e) {
      console.error(e)
      $SD.value.setImage(context, null)
      $SD.value.showAlert(context)
    }
  })
}

function updateContextState(currentContext, domain, stateObject) {
  let contextSettings = actionSettings.value[currentContext]
  let buttonRenderingConfig = entityConfigFactory.determineConfig(domain, stateObject, contextSettings.display)

  buttonRenderingConfig.isAction = contextSettings.button.serviceShortPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
  buttonRenderingConfig.isMultiAction = contextSettings.button.serviceLongPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
  buttonRenderingConfig.hideIcon = contextSettings.display.hideIcon

  if (buttonRenderingConfig.rotationPercent !== undefined) {
    rotationPercent[currentContext] = buttonRenderingConfig.rotationPercent
  }

  if (contextSettings.display.useCustomTitle) {
    let state = stateObject.state
    let stateAttributes = stateObject.attributes
    buttonRenderingConfig.customTitle = nunjucks.renderString(contextSettings.display.buttonTitle, { ...{ state }, ...stateAttributes })
  }

  if (contextSettings.display.useCustomButtonLabels) {
    buttonRenderingConfig.labelTemplates = contextSettings.display.buttonLabels.split('\n')
  }

  if (contextSettings.display.useEncoderLayout) {
    if (!buttonRenderingConfig.feedbackLayout) {
      buttonRenderingConfig.feedbackLayout = '$A1'
    }
    $SD.value.setFeedbackLayout(currentContext, { layout: buttonRenderingConfig.feedbackLayout })

    if (!buttonRenderingConfig.feedback) {
      buttonRenderingConfig.feedback = {}
    }
    buttonRenderingConfig.feedback.title = buttonRenderingConfig.customTitle ? buttonRenderingConfig.customTitle : ''
    buttonRenderingConfig.feedback.icon = 'data:image/svg+xml;charset=utf8,' + buttonSvgUtils.renderIconSVG(buttonRenderingConfig.icon, buttonRenderingConfig.color)
    if (buttonRenderingConfig.feedback.value === undefined) {
      buttonRenderingConfig.feedback.value = buttonSvgUtils.renderTemplates(buttonRenderingConfig.labelTemplates, { ...stateObject.attributes, ...{ state: stateObject.state } }).join(' ')
    }
    $SD.value.setFeedback(currentContext, buttonRenderingConfig.feedback)

  } else if (contextSettings.display.useStateImagesForOnOffStates) {
    if (buttonRenderingConfig.customTitle) {
      $SD.value.setTitle(currentContext, buttonRenderingConfig.customTitle)
    }
    if (activeStates.value.indexOf(stateObject.state) !== -1) {
      console.log('Setting state of ' + currentContext + ' to 1')
      $SD.value.setState(currentContext, 1)
    } else {
      console.log('Setting state of ' + currentContext + ' to 0')
      $SD.value.setState(currentContext, 0)
    }
  } else {
    if (buttonRenderingConfig.customTitle) {
      $SD.value.setTitle(currentContext, buttonRenderingConfig.customTitle)
    }

    buttonRenderingConfig.isAction = contextSettings.button.serviceShortPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
    buttonRenderingConfig.isMultiAction = contextSettings.button.serviceLongPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default

    if (!buttonRenderingConfig.color) {
      buttonRenderingConfig.color = activeStates.value.indexOf(stateObject.state) !== -1 ? entityConfigFactory.colors.active : entityConfigFactory.colors.neutral
    }

    if (contextSettings.controllerType === 'Encoder') {
      const buttonSVG = touchScreenSvgUtils.renderButtonSVG(buttonRenderingConfig, stateObject)
      setButtonSVG(buttonSVG, currentContext)
    } else {
      const buttonSVG = buttonSvgUtils.renderButtonSVG(buttonRenderingConfig, stateObject)
      setButtonSVG(buttonSVG, currentContext)
    }
  }
}

function setButtonSVG(svg, changedContext) {
  const image = 'data:image/svg+xml;,' + svg
  if (actionSettings.value[changedContext].controllerType === 'Encoder') {
    $SD.value.setFeedbackLayout(changedContext, { 'layout': '$A0' })
    $SD.value.setFeedback(changedContext, { 'full-canvas': image, 'canvas': null, 'title': '' })
  } else {
    $SD.value.setImage(changedContext, image)
  }
}

function buttonDown(context) {
  const timeout = setTimeout(buttonLongPress, 300, context)
  buttonLongpressTimeouts.value.set(context, timeout)
}

function buttonUp(context) {
  // If "long press timeout" is still present, we perform a normal press
  const lpTimeout = buttonLongpressTimeouts.value.get(context)
  if (lpTimeout) {
    clearTimeout(lpTimeout)
    buttonLongpressTimeouts.value.delete(context)
    buttonShortPress(context)
  }
}

function buttonShortPress(context) {
  let settings = actionSettings.value[context]
  callService(context, settings.button.serviceShortPress)
}

function buttonLongPress(context) {
  buttonLongpressTimeouts.value.delete(context)
  let settings = actionSettings.value[context]
  if (settings.button.serviceLongPress.serviceId) {
    callService(context, settings.button.serviceLongPress)
  } else {
    callService(context, settings.button.serviceShortPress)
  }
}

function callService(context, serviceToCall, serviceDataAttributes = {}) {
  if ($HA.value) {
    if (serviceToCall['serviceId']) {
      try {
        const serviceIdParts = serviceToCall.serviceId.split('.')

        let serviceData = null
        if (serviceToCall.serviceData) {
          let renderedServiceData = nunjucks.renderString(serviceToCall.serviceData, serviceDataAttributes)
          serviceData = JSON.parse(renderedServiceData)
        }

        $HA.value.callService(serviceIdParts[1], serviceIdParts[0], serviceToCall.entityId, serviceData)
      } catch (e) {
        console.error(e)
        $SD.value.showAlert(context)
      }
    }
  }
}

</script>
