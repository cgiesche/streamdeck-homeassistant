<template>
  <span>Nothing to see here!</span>
</template>

<script setup>
import {StreamDeck} from "@/modules/common/streamdeck";
import {Homeassistant} from "@/modules/homeassistant/homeassistant";
import {SvgUtils} from "@/modules/plugin/svgUtils";
import {EntityButtonImageFactory} from "@/modules/plugin/entityButtonImageFactory";
import nunjucks from "nunjucks"
import {Settings} from "@/modules/common/settings";
import {onMounted, ref} from "vue";
import {EntityConfigFactory} from "@/modules/plugin/entityConfigFactory";
import defaultActiveStates from '../../public/config/active-states.json'
import axios from "axios";

const entityConfigFactory = new EntityConfigFactory()
const buttonImageFactory = new EntityButtonImageFactory()
const touchScreenImageFactory = new EntityButtonImageFactory({width: 200, height: 100})
const svgUtils = new SvgUtils();

const $SD = ref(null)
const $HA = ref(null)
const $reconnectTimeout = ref({})
const globalSettings = ref({})
const actionSettings = ref([])
const buttonLongpressTimeouts = ref(new Map()) //context, timeout

const activeStates = ref(defaultActiveStates)

let rotationTimeout = [];
let rotationAmount = [];
let rotationPercent = [];

onMounted(async () => {

  window.connectElgatoStreamDeckSocket = (inPort, inPluginUUID, inRegisterEvent, inInfo) => {
    $SD.value = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, "{}");

    $SD.value.on("globalsettings", (inGlobalSettings) => {
          console.log("Got global settings.")
          globalSettings.value = inGlobalSettings;
          connectHomeAssistant();
        }
    )

    $SD.value.on("connected", () => {
      $SD.value.requestGlobalSettings();
    })

    $SD.value.on("keyDown", (message) => {
      buttonDown(message.context);
    })

    $SD.value.on("keyUp", (message) => {
      buttonUp(message.context);
    })

    $SD.value.on("willAppear", (message) => {
      let context = message.context;
      rotationAmount[context] = 0;
      rotationPercent[context] = 0;
      actionSettings.value[context] = Settings.parse(message.payload.settings)
      if ($HA.value) {
        $HA.value.getStates(entityStatesChanged)
      }
    })

    $SD.value.on("willDisappear", (message) => {
      let context = message.context;
      delete actionSettings.value[context]
    })

    $SD.value.on("dialRotate", (message) => {
      let context = message.context;
      let settings = actionSettings.value[context];
      let scaledTicks = message.payload.ticks * (settings.rotationTickMultiplier || 1);
      let tickBucketSizeMs = settings.rotationTickBucketSizeMs || 300;

      rotationAmount[context] += scaledTicks;
      rotationPercent[context] += scaledTicks;
      if (rotationPercent[context] < 0) {
        rotationPercent[context] = 0;
      } else if (rotationPercent[context] > 100) {
        rotationPercent[context] = 100;
      }

      if (rotationTimeout[context])
        return;

      let serviceCall = () => {
        callService(context, settings.button.serviceRotation, {
          ticks: rotationAmount[context],
          rotationPercent: rotationPercent[context],
          rotationAbsolute: 2.55 * rotationPercent[context]
        });
        rotationAmount[context] = 0;
        rotationTimeout[context] = null;
      };

      if (tickBucketSizeMs > 0) {
        rotationTimeout[context] = setTimeout(serviceCall, tickBucketSizeMs);
      } else {
        serviceCall();
      }

    })

    $SD.value.on("dialDown", (message) => {
      buttonDown(message.context);
    })

    $SD.value.on("dialUp", (message) => {
      buttonUp(message.context);
    })

    $SD.value.on("touchTap", (message) => {
      let context = message.context;
      let settings = actionSettings.value[context];
      callService(context, settings.button.serviceTap);
    })

    $SD.value.on("didReceiveSettings", (message) => {
      let context = message.context;
      rotationAmount[context] = 0;
      actionSettings.value[context] = Settings.parse(message.payload.settings)
      if ($HA.value) {
        $HA.value.getStates(entityStatesChanged)
      }
    })
  }

  await fetchActiveStates();
})

async function fetchActiveStates() {
  try {
    activeStates.value = (await axios.get('https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/active-states.json')).data;
  } catch (error) {
    console.log(`Failed to download updated active-states.json: ${error}`)
  }
}

function connectHomeAssistant() {
  console.log("Connecting to Home Assistant")
  if (globalSettings.value.serverUrl && globalSettings.value.accessToken) {
    if ($HA.value) {
      $HA.value.close();
    }
    console.log("Connecting to Home Assistant " + globalSettings.value.serverUrl)
    $HA.value = new Homeassistant(globalSettings.value.serverUrl, globalSettings.value.accessToken, onHAConnected, onHAError, onHAClosed)
  }
}

const onHAConnected = () => {
  $HA.value.getStates(entityStatesChanged)
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
    let newState = event.data.new_state;
    updateState(newState)
  }
}

function updateState(stateMessage) {
  if (!stateMessage.entity_id) {
    console.log(`Missing entity_id in updated state: ${stateMessage}`)
    return;
  }

  let domain = stateMessage.entity_id.split('.')[0]
  let changedContexts = Object.keys(actionSettings.value).filter(key => actionSettings.value[key].display.entityId === stateMessage.entity_id)

  changedContexts.forEach(context => {
    try {
      if (stateMessage.last_updated != null) stateMessage.attributes["last_updated"] = new Date(stateMessage.last_updated).toLocaleTimeString();
      if (stateMessage.last_changed != null) stateMessage.attributes["last_changed"] = new Date(stateMessage.last_changed).toLocaleTimeString();

      updateContextState(context, domain, stateMessage);
    } catch (e) {
      console.error(e)
      $SD.value.setImage(context, null);
      $SD.value.showAlert(context);
    }
  })
}

function updateContextState(currentContext, domain, stateObject) {
  let contextSettings = actionSettings.value[currentContext]
  let labelTemplates = null;

  if (contextSettings.display.useCustomButtonLabels && contextSettings.display.buttonLabels) {
    labelTemplates = contextSettings.display.buttonLabels.split("\n");
  }
  let entityConfig = entityConfigFactory.determineConfig(domain, stateObject, labelTemplates)

  entityConfig.isAction = contextSettings.button.serviceShortPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
  entityConfig.isMultiAction = contextSettings.button.serviceLongPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
  entityConfig.hideIcon = contextSettings.display.hideIcon

  if (entityConfig.rotationPercent !== undefined) {
    rotationPercent[currentContext] = entityConfig.rotationPercent
  }

  if (contextSettings.display.useCustomTitle) {
    let state = stateObject.state;
    let stateAttributes = stateObject.attributes;

    entityConfig.customTitle = nunjucks.renderString(contextSettings.display.buttonTitle, {...{state}, ...stateAttributes})

    $SD.value.setTitle(currentContext, entityConfig.customTitle);
  }

  if (contextSettings.display.useEncoderLayout) {
    if (!entityConfig.feedbackLayout) {
      entityConfig.feedbackLayout = {layout: "$A1"};
    }
    $SD.value.setFeedbackLayout(currentContext, entityConfig.feedbackLayout);
    
    if (!entityConfig.feedback) {
      entityConfig.feedback = {}
    }
    entityConfig.feedback.title = entityConfig.customTitle !== undefined ? entityConfig.customTitle : "";
    entityConfig.feedback.icon = "data:image/svg+xml;charset=utf8," + svgUtils.generateIconSVG(entityConfig.icon, entityConfig.color);
    if (entityConfig.feedback.value === undefined) {
      entityConfig.feedback.value = entityConfig.state;
    }
    $SD.value.setFeedback(currentContext, entityConfig.feedback);
  } else if (contextSettings.display.useStateImagesForOnOffStates) {
    if (activeStates.value.indexOf(stateObject.state) !== -1) {
      console.log("Setting state of " + currentContext + " to 1")
      $SD.value.setState(currentContext, 1);
    } else {
      console.log("Setting state of " + currentContext + " to 0")
      $SD.value.setState(currentContext, 0);
    }
  } else {
    if (contextSettings.controllerType === 'Encoder') {
      const buttonImage = touchScreenImageFactory.createButton(entityConfig);
      setButtonSVG(buttonImage, currentContext)
    } else {
      const buttonImage = buttonImageFactory.createButton(entityConfig);
      setButtonSVG(buttonImage, currentContext)
    }
  }
}

function setButtonSVG(svg, changedContext) {
  const image = "data:image/svg+xml;charset=utf8," + svg;
  if (actionSettings.value[changedContext].controllerType === 'Encoder') {
    $SD.value.setFeedbackLayout(changedContext, {"layout": "$A0"});
    $SD.value.setFeedback(changedContext, {"full-canvas": image, "canvas": null, "title": ""})
  } else {
    $SD.value.setImage(changedContext, image)
  }
}

function buttonDown(context) {
  const timeout = setTimeout(buttonLongPress, 300, context);
  buttonLongpressTimeouts.value.set(context, timeout)
}

function buttonUp(context) {
  // If "long press timeout" is still present, we perform a normal press
  const lpTimeout = buttonLongpressTimeouts.value.get(context);
  if (lpTimeout) {
    clearTimeout(lpTimeout);
    buttonLongpressTimeouts.value.delete(context)
    buttonShortPress(context);
  }
}

function buttonShortPress(context) {
  let settings = actionSettings.value[context];
  callService(context, settings.button.serviceShortPress);
}

function buttonLongPress(context) {
  buttonLongpressTimeouts.value.delete(context);
  let settings = actionSettings.value[context];
  if (settings.button.serviceLongPress.serviceId) {
    callService(context, settings.button.serviceLongPress);
  } else {
    callService(context, settings.button.serviceShortPress);
  }
}

function callService(context, serviceToCall, serviceDataAttributes = {}) {
  if ($HA.value) {
    if (serviceToCall["serviceId"]) {
      try {
        const serviceIdParts = serviceToCall.serviceId.split('.');

        let serviceData = null;
        if (serviceToCall.serviceData) {
          let renderedServiceData = nunjucks.renderString(serviceToCall.serviceData, serviceDataAttributes)
          serviceData = JSON.parse(renderedServiceData);
        }

        $HA.value.callService(serviceIdParts[1], serviceIdParts[0], serviceToCall.entityId, serviceData)
      } catch (e) {
        console.error(e)
        $SD.value.showAlert(context);
      }
    }
  }
}

</script>
