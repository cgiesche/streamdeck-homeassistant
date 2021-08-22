<template>
  <span>Nothing to see here!</span>
</template>

<script>
import StreamDeck from "@/modules/common/streamdeck";
import {Entity, Homeassistant} from "@/modules/common/homeassistant";
import {EntityButtonImageFactory, EntityConfigFactory} from "@/modules/plugin/entityButtonImageFactory";
import nunjucks from "nunjucks"

export default {
  name: 'Plugin',
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
            updateContextState(context, entity, stateMessage);
          } catch (e) {
            console.error(e)
            this.$SD.setImage(context, null);
            this.$SD.showAlert(context);
          }
        })
      }

      const updateContextState = (currentContext, entity, stateObject) => {
        let contextSettings = this.actionSettings[currentContext]
        let labelTemplates = null;

        if (contextSettings.useCustomButtonLabels && contextSettings.buttonLabels) {
          labelTemplates = contextSettings.buttonLabels.split("\n");
        }
        let entityConfig = this.entityConfigFactory.determineConfig(entity.domain, stateObject, labelTemplates)

        entityConfig.isAction = contextSettings.service.id
        entityConfig.isMultiAction = contextSettings.serviceLongPress.id
        const buttonImage = this.buttonImageFactory.createButton(entityConfig);

        if (contextSettings.useStateImagesForOnOffStates) {
          if (stateObject.state === "on") {
            this.$SD.setState(currentContext, 1);
          } else {
            this.$SD.setState(currentContext, 0);
          }
        } else {
          setButtonSVG(buttonImage, currentContext)
        }

        if (contextSettings.useCustomTitle) {
          let state = stateObject.state;
          let stateAttributes = stateObject.attributes;
          const customTitle = nunjucks.renderString(contextSettings.buttonTitle, {...{state}, ...stateAttributes})
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
