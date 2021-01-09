<template>
  <span>Nothing to see here!</span>
</template>

<script>
import StreamDeck from "@/modules/common/streamdeck";
import {Entity, Homeassistant} from "@/modules/common/homeassistant";
import {IconFactory} from "@/modules/plugin/imageUtils";

export default {
  name: 'Plugin',
  props: {},
  data: () => {
    return {
      $SD: null,
      $HA: null,
      actionSettings: {},
      globalSettings: {}
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
        window.setTimeout(connectHomeAssistant, 2000)
      }

      const onHAClosed = (msg) => {
        console.log(`Home Assistant connection closed, trying to reopen connection: ${msg}`)
        window.setTimeout(connectHomeAssistant, 2000)
      }

      this.$SD.on("connected", () => {
        this.$SD.requestGlobalSettings();
      })

      this.$SD.on("keyDown", (message) => {
        console.log(this.actionSettings)
        if (this.$HA) {
          let context = message.context
          let settings = this.actionSettings[context];
          this.$HA.callService(settings.service, new Entity(settings.entityId), () => {
          })
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

      const updateState = (state) => {
        let entity = new Entity(state.entity_id);
        let changedContext = Object.keys(this.actionSettings).find(key => this.actionSettings[key].entityId === entity.entityId);

        if (!changedContext) {
          return;
        }

        let newState = state.state;
        let stateAttributes = state.attributes;
        let deviceClass = stateAttributes.device_class || "default";

        console.log(`Finding image for context ${changedContext}: ${entity.domain}.${deviceClass}(${newState})`)

        if (changedContext) {
          if (IconFactory[entity.domain] && IconFactory[entity.domain][deviceClass]) {
            console.log(`... sucess!`)
            // domain, class, state
            let svg = IconFactory[entity.domain][deviceClass](newState, stateAttributes);
            let image = "data:image/svg+xml;charset=utf8," + svg;
            this.$SD.setImage(changedContext, image)
          } else if (IconFactory[entity.domain] && IconFactory[entity.domain]["default"]) {
            console.log(`... sucess (fallback)!`)
            let svg = IconFactory[entity.domain]["default"](newState, stateAttributes);
            setButtonSVG(svg, changedContext);
          } else {
            console.log(`... failed!`)
          }
        }
      }

      let setButtonSVG = (svg, changedContext) => {
        let image = "data:image/svg+xml;charset=utf8," + svg;
        this.$SD.setImage(changedContext, image)
      }
    }
  },
}

</script>
