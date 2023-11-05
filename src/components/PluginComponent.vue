<template>
  <span>Nothing to see here!</span>
</template>

<script setup>
import {StreamDeck} from "@/modules/common/streamdeck";
import {Homeassistant} from "@/modules/homeassistant/homeassistant";
import {EntityButtonImageFactory} from "@/modules/plugin/entityButtonImageFactory";
import nunjucks from "nunjucks"
import {Settings} from "@/modules/common/settings";
import {onMounted, ref} from "vue";
import {EntityConfigFactory} from "@/modules/plugin/entityConfigFactory";


const entityConfigFactory = new EntityConfigFactory()
const buttonImageFactory = new EntityButtonImageFactory()
const touchScreenImageFactory = new EntityButtonImageFactory({width: 200, height: 100})

const $SD = ref(null)
const $HA = ref(null)
const $reconnectTimeout = ref({})
const actionSettings = ref([])
const buttonLongpressTimeouts = ref(new Map()) //context, timeout

let rotationTimeout = [];
let rotationAmount = [];

onMounted(() => {
  window.connectElgatoStreamDeckSocket = (inPort, inPluginUUID, inRegisterEvent, inInfo) => {
    $SD.value = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, "{}");

    $SD.value.on("globalsettings", (globalSettings) => {
          console.log("Got global settings.")
          globalSettings.value = globalSettings;
          connectHomeAssistant(globalSettings);
        }
    )

    const onHAConnected = () => {
      $HA.value.getStates(entitiyStatesChanged)
      $HA.value.subscribeEvents(entityStateChanged)
    }

    const onHAError = (msg) => {
      console.log(`Home Assistant connection error: ${msg}`)
      showAlert()
      window.clearTimeout($reconnectTimeout)
      $reconnectTimeout.value = window.setTimeout(connectHomeAssistant, 5000)
    }

    const onHAClosed = (msg) => {
      console.log(`Home Assistant connection closed, trying to reopen connection: ${msg}`)
      showAlert()
      window.clearTimeout($reconnectTimeout)
      $reconnectTimeout.value = window.setTimeout(connectHomeAssistant, 5000)
    }

    const showAlert = () => {
      Object.keys(actionSettings.value).forEach(key => $SD.value.showAlert(key))
    }

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
      actionSettings.value[context] = Settings.parse(message.payload.settings)
      if ($HA.value) {
        $HA.value.getStates(entitiyStatesChanged)
      }
    })

    $SD.value.on("willDisappear", (message) => {
      let context = message.context;
      delete actionSettings.value[context]
    })

    $SD.value.on("dialRotate", (message) => {
      let context = message.context;
      let settings = actionSettings.value[context];

      rotationAmount[context] += message.payload.ticks;

      if (rotationTimeout[context])
        return;

      rotationTimeout[context] = setTimeout(() => {
        callService(context, settings.button.serviceRotation, {ticks: rotationAmount[context]});
        rotationAmount[context] = 0;
        rotationTimeout[context] = null;
      }, 300);

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
        $HA.value.getStates(entitiyStatesChanged)
      }
    })

    const buttonDown = (context) => {
      const timeout = setTimeout(buttonLongPress, 300, context);
      buttonLongpressTimeouts.value.set(context, timeout)
    }

    const buttonUp = (context) => {
      // If "long press timeout" is still present, we perform a normal press
      const lpTimeout = buttonLongpressTimeouts.value.get(context);
      if (lpTimeout) {
        clearTimeout(lpTimeout);
        buttonLongpressTimeouts.value.delete(context)
        buttonShortPress(context);
      }
    }

    const buttonShortPress = (context) => {
      let settings = actionSettings.value[context];
      callService(context, settings.button.serviceShortPress);
    }

    const buttonLongPress = (context) => {
      buttonLongpressTimeouts.value.delete(context);
      let settings = actionSettings.value[context];
      if (settings.button.serviceLongPress.serviceId) {
        callService(context, settings.button.serviceLongPress);
      } else {
        callService(context, settings.button.serviceShortPress);
      }
    }

    const callService = (context, serviceToCall, serviceDataAttributes = {}) => {
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

    const connectHomeAssistant = (globalSettings) => {
      console.log("Connecting to Home Assistant")
      if (globalSettings.serverUrl && globalSettings.accessToken) {
        if ($HA.value) {
          $HA.value.close();
        }
        console.log("Connecting to Home Assistant " + globalSettings.serverUrl)
        $HA.value = new Homeassistant(globalSettings.serverUrl, globalSettings.accessToken, onHAConnected, onHAError, onHAClosed)
      }
    }

    const entitiyStatesChanged = (event) => {
      event.forEach(updateState)
    }

    const entityStateChanged = (event) => {
      if (event) {
        let newState = event.data.new_state;
        updateState(newState)
      }
    }

    const updateState = (stateMessage) => {
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

    const updateContextState = (currentContext, domain, stateObject) => {
      let contextSettings = actionSettings.value[currentContext]
      let labelTemplates = null;

      if (contextSettings.display.useCustomButtonLabels && contextSettings.display.buttonLabels) {
        labelTemplates = contextSettings.display.buttonLabels.split("\n");
      }
      let entityConfig = entityConfigFactory.determineConfig(domain, stateObject, labelTemplates)

      entityConfig.isAction = contextSettings.button.serviceShortPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
      entityConfig.isMultiAction = contextSettings.button.serviceLongPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
      entityConfig.hideIcon = contextSettings.display.hideIcon

      if (contextSettings.display.useStateImagesForOnOffStates) {
        switch (stateObject.state) {
          case "on":
          case "playing":
          case "open":
          case "opening":
          case "home":
          case "locked":
          case "active":
            console.log("Setting state of " + currentContext + " to 1")
            $SD.value.setState(currentContext, 1);
            break;
          default:
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

      if (contextSettings.display.useCustomTitle) {
        let state = stateObject.state;
        let stateAttributes = stateObject.attributes;

        const customTitle = nunjucks.renderString(contextSettings.display.buttonTitle, {...{state}, ...stateAttributes})
        $SD.value.setTitle(currentContext, customTitle);
      }
    }
  }

  const setButtonSVG = (svg, changedContext) => {
    const image = "data:image/svg+xml;charset=utf8," + svg;
    if (actionSettings.value[changedContext].controllerType === 'Encoder') {
      $SD.value.setFeedback(changedContext, {"full-canvas": image, "canvas": null, "title": ""})
    } else {
      $SD.value.setImage(changedContext, image)
    }
  }
})

</script>
