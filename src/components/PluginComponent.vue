<template>
  <span>Nothing to see here!</span>
</template>

<script lang="ts" setup>
import {
  type BaseCommand,
  type DialRotateCommand,
  type DidReceiveSettingsCommand,
  type GlobalSettings,
  StreamDeck,
  type WillAppearCommand
} from '@/modules/common/streamdeck'
import { Homeassistant, type StateMessage } from '@/modules/homeassistant/homeassistant'
import { SvgUtils } from '@/modules/plugin/svgUtils'
import { renderString } from 'nunjucks'
import { Settings, type SettingsV5 } from '@/modules/common/settings'
import { onMounted, type Ref, ref } from 'vue'
import { EntityConfigFactory } from '@/modules/plugin/entityConfigFactoryNg'
// @ts-expect-error ts-checker doesn't understand yaml imports
import defaultActiveStates from '../../public/config/active-states.yml'
import axios from 'axios'
import { load as yamlLoad } from 'js-yaml'

axios.defaults.headers['Cache-Control'] = 'public, max-age=86400'

let entityConfigFactory: EntityConfigFactory
const svgUtils = new SvgUtils()

const $SD: Ref<StreamDeck | null> = ref(null)
const $HA: Ref<Homeassistant | null> = ref(null)
const $reconnectTimeout: Ref<number | null> = ref(null)
const globalSettings: Ref<GlobalSettings | null> = ref(null)
const actionSettings: Ref<{ [key: string]: SettingsV5 }> = ref({})
const buttonLongpressTimeouts = ref(new Map()) //context, timeout

const activeStates = ref(defaultActiveStates)

const rotationTimeout: { [key: string]: NodeJS.Timeout | null } = {}
const rotationAmount: { [key: string]: number } = {}
const rotationPercent: { [key: string]: number } = {}

onMounted(async () => {
  window.connectElgatoStreamDeckSocket = (
    inPort: number,
    inPluginUUID: string,
    inRegisterEvent: string,
    inInfo: string
  ) => {
    $SD.value = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, '{}')

    $SD.value.on('globalsettings', (inGlobalSettings: GlobalSettings) => {
      console.log('Got global settings.')
      globalSettings.value = inGlobalSettings
      entityConfigFactory = new EntityConfigFactory(
        inGlobalSettings.displayConfiguration?.urlOverride || inGlobalSettings.displayConfiguration?.url
      )
      connectHomeAssistant()
    })

    $SD.value.on('connected', () => {
      $SD.value!.requestGlobalSettings()
    })

    $SD.value.on('keyDown', (message: BaseCommand) => {
      buttonDown(message.context)
    })

    $SD.value.on('keyUp', (message: BaseCommand) => {
      buttonUp(message.context)
    })

    $SD.value.on('willAppear', (message: WillAppearCommand) => {
      const context = message.context
      rotationAmount[context] = 0
      rotationPercent[context] = 0
      actionSettings.value[context] = Settings.parse(message.payload.settings)
      if ($HA.value) {
        $HA.value.getStatesDebounced(entityStatesChanged)
      }
    })

    $SD.value.on('willDisappear', (message: BaseCommand) => {
      const context = message.context
      delete actionSettings.value[context]
    })

    $SD.value.on('dialRotate', (message: DialRotateCommand) => {
      const context = message.context
      const settings = actionSettings.value[context]
      const scaledTicks = message.payload.ticks * (settings.rotationTickMultiplier || 1)
      const tickBucketSizeMs = settings.rotationTickBucketSizeMs || 300

      rotationAmount[context] += scaledTicks
      rotationPercent[context] += scaledTicks
      if (rotationPercent[context] < 0) {
        rotationPercent[context] = 0
      } else if (rotationPercent[context] > 100) {
        rotationPercent[context] = 100
      }

      if (rotationTimeout[context]) return

      const serviceCall = () => {
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

    $SD.value.on('dialDown', (message: BaseCommand) => {
      buttonDown(message.context)
    })

    $SD.value.on('dialUp', (message: BaseCommand) => {
      buttonUp(message.context)
    })

    $SD.value.on('touchTap', (message: BaseCommand) => {
      const context = message.context
      const settings = actionSettings.value[context]
      callService(context, settings.button.serviceTap)
    })

    $SD.value.on('didReceiveSettings', (message: DidReceiveSettingsCommand) => {
      const context = message.context
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
    axios
      .get('https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/active-states.yml')
      .then((response) => (activeStates.value = yamlLoad(response.data)))
      .catch((error) => console.log(`Failed to download updated active-states.json: ${error}`))
  } catch (error) {
    console.log(`Failed to download updated active-states.json: ${error}`)
  }
}

function connectHomeAssistant() {
  console.log('Connecting to Home Assistant')
  if (globalSettings.value && globalSettings.value.serverUrl && globalSettings.value.accessToken) {
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
  $HA.value!.getStatesDebounced(entityStatesChanged)
  $HA.value!.subscribeEvents(entityStateChanged)
}

function onHAError(msg: string) {
  showAlert()
  console.log(`Home Assistant connection error: ${msg}`)
  if ($reconnectTimeout.value) {
    window.clearTimeout($reconnectTimeout.value)
  }
  $reconnectTimeout.value = window.setTimeout(connectHomeAssistant, 5000)
}

function onHAClosed(msg: CloseEvent) {
  showAlert()
  console.log(`Home Assistant connection closed, trying to reopen connection: ${msg}`)
  if ($reconnectTimeout.value) {
    window.clearTimeout($reconnectTimeout.value)
  }
  $reconnectTimeout.value = window.setTimeout(connectHomeAssistant, 5000)
}

function showAlert() {
  Object.keys(actionSettings.value).forEach((key) => $SD.value!.showAlert(key))
}

function entityStatesChanged(event: StateMessage[]) {
  event.forEach(updateState)
}

function entityStateChanged(event: {
  data: {
    new_state: StateMessage
  }
}) {
  if (event) {
    const newState = event.data.new_state
    updateState(newState)
  }
}

function updateState(stateMessage: StateMessage) {
  if (!stateMessage.entity_id) {
    console.log(`Missing entity_id in updated state: ${stateMessage}`)
    return
  }

  const domain = stateMessage.entity_id.split('.')[0]
  const changedContexts = Object.keys(actionSettings.value).filter(
    (key) => actionSettings.value[key].display.entityId === stateMessage.entity_id
  )

  changedContexts.forEach((context) => {
    try {
      if (stateMessage.last_updated != null)
        stateMessage.attributes['last_updated'] = new Date(stateMessage.last_updated).toLocaleTimeString()
      if (stateMessage.last_changed != null)
        stateMessage.attributes['last_changed'] = new Date(stateMessage.last_changed).toLocaleTimeString()

      updateContextState(context, domain, stateMessage)
    } catch (e) {
      console.error(e)
      $SD.value!.setImage(context, null)
      $SD.value!.showAlert(context)
    }
  })
}

function isEncoder(contextSettings: SettingsV5) {
  return contextSettings.controllerType === 'Encoder'
}

function updateContextState(currentContext: string, domain: string, stateObject: StateMessage) {
  const contextSettings = actionSettings.value[currentContext]
  const renderingConfig = entityConfigFactory.determineConfig(domain, stateObject, contextSettings.display)

  renderingConfig.isAction =
    contextSettings.button.serviceShortPress.serviceId !== null &&
    contextSettings.button.serviceShortPress.serviceId !== '' &&
    (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
  renderingConfig.isMultiAction =
    contextSettings.button.serviceLongPress.serviceId !== null &&
    contextSettings.button.serviceLongPress.serviceId !== '' &&
    (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default

  if (renderingConfig.rotationPercent !== undefined) {
    rotationPercent[currentContext] = renderingConfig.rotationPercent
  }

  if (contextSettings.display.useCustomTitle) {
    const state = stateObject.state
    const stateAttributes = stateObject.attributes
    renderingConfig.customTitle = renderString(contextSettings.display.buttonTitle, {
      ...{ state },
      ...stateAttributes
    })
  }

  if (contextSettings.display.useCustomButtonLabels) {
    renderingConfig.labelTemplates = contextSettings.display.buttonLabels.split('\n')
  }

  if (isEncoder(contextSettings)) {
    if (!renderingConfig.feedbackLayout) {
      renderingConfig.feedbackLayout = '$A1'
    }
    $SD.value!.setFeedbackLayout(currentContext, { layout: renderingConfig.feedbackLayout })

    if (!renderingConfig.feedback) {
      renderingConfig.feedback = {
        title: '',
        icon: null,
        value: ''
      }
    }
    renderingConfig.feedback.title = renderingConfig.customTitle ? renderingConfig.customTitle : ''
    renderingConfig.feedback.icon =
      'data:image/svg+xml;charset=utf8,' + svgUtils.renderIconSVG(renderingConfig.icon, renderingConfig.color!)
    if (renderingConfig.feedback.value === undefined) {
      renderingConfig.feedback.value = svgUtils
        .renderTemplates(renderingConfig.labelTemplates, {
          ...stateObject.attributes,
          ...{ state: stateObject.state }
        })
        .join(' ')
    }
    $SD.value!.setFeedback(currentContext, renderingConfig.feedback)
  } else if (contextSettings.display.useStateImagesForOnOffStates) {
    if (renderingConfig.customTitle) {
      $SD.value!.setTitle(currentContext, renderingConfig.customTitle)
    }
    if (activeStates.value.indexOf(stateObject.state) !== -1) {
      console.log('Setting state of ' + currentContext + ' to 1')
      $SD.value!.setState(currentContext, 1)
    } else {
      console.log('Setting state of ' + currentContext + ' to 0')
      $SD.value!.setState(currentContext, 0)
    }
  } else {
    if (renderingConfig.customTitle) {
      $SD.value!.setTitle(currentContext, renderingConfig.customTitle)
    }

    renderingConfig.isAction =
      contextSettings.button.serviceShortPress.serviceId !== null &&
      contextSettings.button.serviceShortPress.serviceId !== '' &&
      (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
    renderingConfig.isMultiAction =
      contextSettings.button.serviceLongPress.serviceId !== null &&
      contextSettings.button.serviceLongPress.serviceId !== '' &&
      (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default

    if (!renderingConfig.color) {
      renderingConfig.color =
        activeStates.value.indexOf(stateObject.state) !== -1
          ? entityConfigFactory.colors.active
          : entityConfigFactory.colors.neutral
    }

    const buttonSVG = svgUtils.renderButtonSVG(renderingConfig, stateObject)
    setButtonSVG(buttonSVG, currentContext)
  }
}

function setButtonSVG(svg: string, changedContext: string) {
  const image = 'data:image/svg+xml;,' + svg
  if (actionSettings.value[changedContext].controllerType === 'Encoder') {
    $SD.value!.setFeedbackLayout(changedContext, { layout: '$A0' })
    $SD.value!.setFeedback(changedContext, { 'full-canvas': image, canvas: null, title: '' })
  } else {
    $SD.value!.setImage(changedContext, image)
  }
}

function buttonDown(context: string) {
  const timeout = setTimeout(buttonLongPress, 300, context)
  buttonLongpressTimeouts.value.set(context, timeout)
}

function buttonUp(context: string) {
  // If "long press timeout" is still present, we perform a normal press
  const lpTimeout = buttonLongpressTimeouts.value.get(context)
  if (lpTimeout) {
    clearTimeout(lpTimeout)
    buttonLongpressTimeouts.value.delete(context)
    buttonShortPress(context)
  }
}

function buttonShortPress(context: string) {
  const settings = actionSettings.value[context]
  callService(context, settings.button.serviceShortPress)
}

function buttonLongPress(context: string) {
  buttonLongpressTimeouts.value.delete(context)
  const settings = actionSettings.value[context]
  if (settings.button.serviceLongPress.serviceId) {
    callService(context, settings.button.serviceLongPress)
  } else {
    callService(context, settings.button.serviceShortPress)
  }
}

function callService(
  context: string,
  serviceToCall: { serviceId: string | null; serviceData: string; entityId: string },
  serviceDataAttributes = {}
) {
  if ($HA.value) {
    if (serviceToCall['serviceId']) {
      try {
        const serviceIdParts = serviceToCall.serviceId.split('.')

        let serviceData = null
        if (serviceToCall.serviceData) {
          const renderedServiceData = renderString(serviceToCall.serviceData, serviceDataAttributes)
          serviceData = JSON.parse(renderedServiceData)
        }

        $HA.value.callService(serviceIdParts[1], serviceIdParts[0], serviceToCall.entityId, serviceData)
      } catch (e) {
        console.error(e)
        $SD.value!.showAlert(context)
      }
    }
  }
}
</script>
