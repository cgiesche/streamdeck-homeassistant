<template>
  <span>Nothing to see here!</span>
</template>

<script>
'use strict';
import StreamDeck from "@/modules/common/streamdeck";
import {Homeassistant} from "@/modules/homeassistant/homeassistant";
import {EntityButtonImageFactory, EntityConfigFactory} from "@/modules/plugin/entityButtonImageFactory";
import nunjucks from "nunjucks"
import {Settings} from "@/modules/common/settings";

export default {
  name: 'PluginComponent',
  props: {},
  data: () => {
    return {
      $SD: null,
      $HA: null,
      $reconnectTimeout: null,
      useStateImagesForOnOffStates: false,
      actionSettings: {},
      globalSettings: {},
      buttonLongpressTimeouts: new Map(), //context, timeout
      entityConfigFactory: new EntityConfigFactory(),
      buttonImageFactory: new EntityButtonImageFactory()
    }
  },
  beforeCreate() {
    window.connectElgatoStreamDeckSocket = (inPort, inPluginUUID, inRegisterEvent, inInfo) => {
      this.$SD = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, "{}");

      this.$SD.on("globalsettings", (globalSettings) => {
            console.log("Got global settings.")
            this.globalSettings = globalSettings;
            connectHomeAssistant();
          }
      )

      const onHAConnected = () => {
        this.$HA.getStates(entitiyStatesChanged)
        this.$HA.subscribeEvents(entityStateChanged)
      }

      const onHAError = (msg) => {
        console.log(`Home Assistant connection error: ${msg}`)
        showAlert()
        window.clearTimeout(this.$reconnectTimeout)
        this.$reconnectTimeout = window.setTimeout(connectHomeAssistant, 5000)
      }

      const onHAClosed = (msg) => {
        console.log(`Home Assistant connection closed, trying to reopen connection: ${msg}`)
        showAlert()
        window.clearTimeout(this.$reconnectTimeout)
        this.$reconnectTimeout = window.setTimeout(connectHomeAssistant, 5000)
      }

      const showAlert = () => {
        Object.keys(this.actionSettings).forEach(key => this.$SD.showAlert(key))
      }

      this.$SD.on("connected", () => {
        this.$SD.requestGlobalSettings();
      })

      this.$SD.on("keyDown", (message) => {
        let context = message.context

        const timeout = setTimeout(buttonLongPress, 300, context);
        this.buttonLongpressTimeouts.set(context, timeout)
      })

      this.$SD.on("keyUp", (message) => {
        let context = message.context

        // If "long press timeout" is still present, we perform a normal press
        const lpTimeout = this.buttonLongpressTimeouts.get(context);
        if (lpTimeout) {
          clearTimeout(lpTimeout);
          this.buttonLongpressTimeouts.delete(context)
          buttonShortPress(context);
        }
      })

      this.$SD.on("willAppear", (message) => {
        let context = message.context;
        this.actionSettings[context] = Settings.parse(message.payload.settings)
        if (this.$HA) {
          this.$HA.getStates(entitiyStatesChanged)
        }
      })

      this.$SD.on("willDisappear", (message) => {
        let context = message.context;
        delete this.actionSettings[context]
      })

      this.$SD.on("didReceiveSettings", (message) => {
        let context = message.context;
        this.actionSettings[context] = Settings.parse(message.payload.settings)

        if (this.$HA) {
          this.$HA.getStates(entitiyStatesChanged)
        }
      })

      const buttonShortPress = (context) => {
        let settings = this.actionSettings[context];
        callService(context, settings.button.serviceShortPress);
      }

      const buttonLongPress = (context) => {
        this.buttonLongpressTimeouts.delete(context);
        let settings = this.actionSettings[context];
        if (settings.button.serviceLongPress.serviceId) {
          callService(context, settings.button.serviceLongPress);
        } else {
          callService(context, settings.button.serviceShortPress);
        }
      }

      const callService = (context, serviceToCall) => {
        if (this.$HA) {
          if (serviceToCall["serviceId"]) {
            try {
              const serviceIdParts = serviceToCall.serviceId.split('.');
              const serviceData = serviceToCall.serviceData ? JSON.parse(serviceToCall.serviceData) : null;
              this.$HA.callService(serviceIdParts[1], serviceIdParts[0], serviceToCall.entityId, serviceData)
            } catch (e) {
              console.error(e)
              this.$SD.showAlert(context);
            }
          }
        }
      }

      const connectHomeAssistant = () => {
        if (this.globalSettings.serverUrl && this.globalSettings.accessToken) {
          if (this.$HA) {
            this.$HA.close();
          }
          console.log("Connecting to Home Assistant " + this.globalSettings.serverUrl)
          this.$HA = new Homeassistant(this.globalSettings.serverUrl, this.globalSettings.accessToken, onHAConnected, onHAError, onHAClosed)
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
        let changedContexts = Object.keys(this.actionSettings).filter(key => this.actionSettings[key].display.entityId === stateMessage.entity_id)

        changedContexts.forEach(context => {
          try {
            if (stateMessage.last_updated != null) stateMessage.attributes["last_updated"] = new Date(stateMessage.last_updated).toLocaleTimeString();
            if (stateMessage.last_changed != null) stateMessage.attributes["last_changed"] = new Date(stateMessage.last_changed).toLocaleTimeString();

            updateContextState(context, domain, stateMessage);
          } catch (e) {
            console.error(e)
            this.$SD.setImage(context, null);
            this.$SD.showAlert(context);
          }
        })
      }

      const updateContextState = (currentContext, domain, stateObject) => {
        let contextSettings = this.actionSettings[currentContext]
        let labelTemplates = null;

        if (contextSettings.display.useCustomButtonLabels && contextSettings.display.buttonLabels) {
          labelTemplates = contextSettings.display.buttonLabels.split("\n");
        }
        let entityConfig = this.entityConfigFactory.determineConfig(domain, stateObject, labelTemplates)

        entityConfig.isAction = contextSettings.button.serviceShortPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
        entityConfig.isMultiAction = contextSettings.button.serviceLongPress.serviceId && (contextSettings.display.enableServiceIndicator === undefined || contextSettings.display.enableServiceIndicator) // undefined = on by default
        entityConfig.hideIcon = contextSettings.display.hideIcon
        const buttonImage = this.buttonImageFactory.createButton(entityConfig);

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
              this.$SD.setState(currentContext, 1);
              break;
            default:
              console.log("Setting state of " + currentContext + " to 0")
              this.$SD.setState(currentContext, 0);
          }
        } else {
          setButtonSVG(buttonImage, currentContext)
        }

        if (contextSettings.display.useCustomTitle) {
          let state = stateObject.state;
          let stateAttributes = stateObject.attributes;

          const customTitle = nunjucks.renderString(contextSettings.display.buttonTitle, {...{state}, ...stateAttributes})
          this.$SD.setTitle(currentContext, customTitle);
        }
      }
    }

    const setButtonSVG = (svg, changedContext) => {
      const image = "data:image/svg+xml;charset=utf8," + svg;
      this.$SD.setImage(changedContext, image)
    }
  }
  ,
}

</script>
