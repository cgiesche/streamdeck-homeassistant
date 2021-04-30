<template>
  <span>Nothing to see here!</span>
</template>

<script>
import StreamDeck from "@/modules/common/streamdeck";
import {Entity, Homeassistant} from "@/modules/common/homeassistant";
import {IconFactory} from "@/modules/plugin/imageUtils";
import jinja from "jinja-js"

export default {
  name: 'Plugin',
  props: {},
  data: () => {
    return {
      $SD: null,
      $HA: null,
      $reconnectTimeout: null,
      actionSettings: {},
      globalSettings: {},
      buttonLongpressTimeouts: new Map() //context, timeout
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
        showOk()
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

      const showOk = () => {
        Object.keys(this.actionSettings).forEach(key => this.$SD.showOk(key))
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
        this.actionSettings[context] = message.payload.settings
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
        this.actionSettings[context] = message.payload.settings

        if (this.$HA) {
          this.$HA.getStates(entitiyStatesChanged)
        }
      })

      const buttonShortPress = (context) => {
        let settings = this.actionSettings[context];
        callService(context, settings.service);
      }

      const buttonLongPress = (context) => {
        this.buttonLongpressTimeouts.delete(context);
        let settings = this.actionSettings[context];
        if (settings.serviceLongPress.id) {
          callService(context, settings.serviceLongPress);
        } else {
          callService(context, settings.service);
        }
      }

      const callService = (context, serviceToCall) => {
        let settings = this.actionSettings[context];
        if (this.$HA) {
          if (serviceToCall) {
            try {
              const entity = new Entity(settings.entityId);
              const serviceData = serviceToCall.data ? JSON.parse(serviceToCall.data) : {};
              // add default entity_id if not specified
              if (!serviceData.entity_id) {
                serviceData.entity_id = entity.entityId;
              }
              this.$HA.callService(serviceToCall.id, entity, serviceData)
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
        let entity = new Entity(stateMessage.entity_id)
        let changedContexts = Object.keys(this.actionSettings).filter(key => this.actionSettings[key].entityId === entity.entityId)

        changedContexts.forEach(context => {
          try {
            updateContextState(context, stateMessage, entity);
          } catch (e) {
            console.error(e)
            this.$SD.setImage(context, null);
            this.$SD.showAlert(context);
          }
        })
      }

      const updateContextState = (currentContext, stateMessage, entity) => {
        let contextSettings = this.actionSettings[currentContext]
        let state = stateMessage.state;
        let stateAttributes = stateMessage.attributes;
        let deviceClass = stateAttributes.device_class || "default";

        console.log(`Finding image for context ${currentContext}: ${entity.domain}.${deviceClass}(${state})`)
        let labelTemplate = null;
        if (contextSettings.useCustomButtonLabels) {
          labelTemplate = {
            line1: contextSettings.buttonLabelLine1,
            line2: contextSettings.buttonLabelLine2,
            line3: contextSettings.buttonLabelLine3,
          }
        }

        let svg;
        if (IconFactory[entity.domain] && IconFactory[entity.domain][deviceClass]) {
          console.log(`... sucess!`)
          // domain, class, state
          svg = IconFactory[entity.domain][deviceClass](state, stateAttributes, labelTemplate);
        } else if (IconFactory[entity.domain] && IconFactory[entity.domain]["default"]) {
          console.log(`... sucess (fallback)!`)
          svg = IconFactory[entity.domain]["default"](state, stateAttributes, labelTemplate);
        } else {
          svg = IconFactory.default(state, stateAttributes, labelTemplate);
        }
        setButtonSVG(svg, currentContext)

        if (contextSettings.useCustomTitle) {
          const customTitle = jinja.render(contextSettings.buttonTitle, {...{state}, ...stateAttributes})
          this.$SD.setTitle(currentContext, customTitle);
        }
      }
    }

    let setButtonSVG = (svg, changedContext) => {
      let image = "data:image/svg+xml;charset=utf8," + svg;
      this.$SD.setImage(changedContext, image)
    }
  }
  ,
}

</script>
