<template>
  <div class="container p-1">

    <b-form>
      <h5>Server Settings</h5>

      <div>
        <b-form-group
            label="Home Assistant Server URL"
            description="example: ws://localhost:8123/api/websocket"
            label-for="serverUrl"
            :state="serverUrlState">
          <b-form-input size="sm" id="serverUrl" v-model="serverUrl" :state="serverUrlState" trim
                        required></b-form-input>
        </b-form-group>
      </div>

      <div>
        <b-form-group
            label="Access-Token"
            label-for="accessToken"
            :state="accessTokenState">
          <b-form-input size="sm" type="password" id="accessToken" v-model="accessToken" :state="accessTokenState" trim
                        required></b-form-input>
          <b-form-text>Long-lived access tokens can be created using the "Long-Lived Access Tokens" section at the
            bottom of a user's Home Assistant profile page. Source: <a
                href='https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token'>Home Assistant
              documentation</a>.
          </b-form-text>
        </b-form-group>
      </div>

      <p class="text-danger" v-if="haError">{{ haError }}</p>

      <div>
        <b-button size="sm" id="btnSave" v-on:click="saveGlobalSettings" v-bind:disabled="isHaSettingsComplete">Save and
          (re)connect
        </b-button>
      </div>
    </b-form>

    <hr>

    <b-form v-if="haConnected">
      <h5>Entity Settings</h5>

      <b-form-group
          label="Domain"
          label-for="domain"
          description="The domain of the entity you want to configure">
        <b-form-select size="sm" id="domain" v-on:change="service = null; entity = null" v-model="domain"
                       :options="availableDomains"></b-form-select>
      </b-form-group>

      <b-form-group
          label="Entity"
          label-for="entity"
          description="The id of the entity you want to configure"
          v-if="domainEntities.length > 0">
        <b-form-select size="sm" id="entity" v-on:change="service = null; serviceLongPress = null;" v-model="entity" :options="domainEntities"
                       value-field="value.entityId"
                       text-field="text"></b-form-select>
      </b-form-group>

      <b-form-group
          label="Service"
          label-for="service"
          description="(Optional) Service that should be called when the stream deck button is pressed."
          v-if="domainServices.length > 0">
        <b-input-group>
          <b-form-select size="sm" id="service" v-model="service" :options="domainServices" value-field="serviceId"
                         text-field="serviceId"></b-form-select>
          <b-input-group-append>
            <b-button size="sm" v-on:click="service = null">Clear</b-button>
          </b-input-group-append>
        </b-input-group>
      </b-form-group>

      <b-form-group
          label="Service Data JSON"
          label-for="serviceData"
          description="(Optional) Service data that will be sent with the service call. If not specified in the JSON-Object, the attribute 'entity_id' will be added automatically."
          :invalid-feedback="serviceDataFeedback"
          :state="!serviceDataFeedback"
          v-if="service">
        <b-form-textarea
            class="text-monospace"
            size="sm"
            id="serviceData"
            v-model="serviceData"
            rows="5"
            :state="!serviceDataFeedback"
        ></b-form-textarea>
      </b-form-group>

      <b-form-group
          label="Service (long press)"
          label-for="serviceLongPress"
          description="(Optional) Service that will be called when the stream deck button is pressed and held for longer than 300ms."
          v-if="domainServices.length > 0">
        <b-input-group>
          <b-form-select size="sm" id="serviceLongPress" v-model="serviceLongPress" :options="domainServices"
                         value-field="serviceId"
                         text-field="serviceId"></b-form-select>
          <b-input-group-append>
            <b-button size="sm" v-on:click="serviceLongPress = null">Clear</b-button>
          </b-input-group-append>
        </b-input-group>
      </b-form-group>

      <b-form-group
          label="Service (long press) Data JSON"
          label-for="serviceDataLongPress"
          description="(Optional) Service data that will be sent with the service call. If not specified in the JSON-Object, the attribute 'entity_id' will be added automatically."
          :invalid-feedback="serviceDataLongPressFeedback"
          :state="!serviceDataLongPressFeedback"
          v-if="serviceLongPress">
        <b-form-textarea
            class="text-monospace"
            size="sm"
            id="serviceDataLongPress"
            v-model="serviceDataLongPress"
            rows="5"
            :state="!serviceDataLongPressFeedback"
        ></b-form-textarea>
      </b-form-group>

      <b-form-checkbox
          size="sm"
          id="chkButtonTitle"
          v-model="useCustomTitle">Enable custom button title
      </b-form-checkbox>

      <div v-if="useCustomTitle">
        <p class="text-danger">You have to clear the main title in the main stream deck window to make this title
          template work.</p>
        <b-form-group
            label-for="buttonTitle"
            :description="'Available variables: ' + entityAttributes">
          <b-form-input
              size="sm"
              id="textarea"
              v-model="buttonTitle"
          ></b-form-input>
        </b-form-group>
      </div>

      <b-form-checkbox
          size="sm"
          id="chkUsebuttonTitle"
          v-if="!useStateImagesForOnOffStates"
          v-model="useCustomButtonLabels">Enable custom labels
      </b-form-checkbox>

      <div v-if="useCustomButtonLabels">
        <b-form-group
            label-for="buttonLabels"
            :description="'Available variables: ' + entityAttributes">
          <b-form-textarea
              size="sm"
              id="buttonLabels"
              v-model="buttonLabels"
              rows="4" max-rows="4"
              placeholder="Line 1 (may overlap with icon)
Line 2 (may overlap with icon)
Line 3
Line 4 (may overlap with title)">
          </b-form-textarea>
        </b-form-group>
      </div>

      <b-form-checkbox
          size="sm"
          id="chkEnableServiceIndicator"
          v-model="enableServiceIndicator">Show visual service indicator
      </b-form-checkbox>

      <b-form-checkbox
          size="sm"
          id="chkHideIcon"
          v-model="hideIcon">Hide button icon
      </b-form-checkbox>

      <b-button size="sm" id="btnActionSave" v-on:click="saveSettings" v-bind:disabled="!domain">Save entity config
      </b-button>

    </b-form>
  </div>
</template>

<script>
import StreamDeck from "@/modules/common/streamdeck";
import {ObjectUtils} from "@/modules/common/utils";
import {Entity, Homeassistant} from "@/modules/common/homeassistant";

export default {
  name: 'PiComponent',
  components: {},
  props: {},
  data: () => {
    return {
      serverUrl: "",
      accessToken: "",

      domain: "",
      entity: "",

      service: "",
      serviceData: "",
      serviceLongPress: "",
      serviceDataLongPress: "",

      // Custom Labels
      useCustomTitle: false,
      buttonTitle: "{{friendly_name}}",

      useStateImagesForOnOffStates: false, // determined by action ID (manifest)
      useCustomButtonLabels: false,
      buttonLabels: "",
      enableServiceIndicator: true,
      hideIcon: false,

      availableDomains: [],
      availableEntities: [],
      availableServices: [],
      currentStates: [],

      // Home-Assistant-State
      haConnected: false,
      haError: ""
    }
  },
  created: function () {
    window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
      this.$SD = new StreamDeck(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo);

      // Dual State entity (custom icons for on/off)
      const inActionInfoObject = JSON.parse(inActionInfo);
      if (inActionInfoObject["action"] === "de.perdoctus.streamdeck.homeassistant.dual-state-entity") {
        this.useStateImagesForOnOffStates = true;
      }

      this.$SD.on("globalsettings", (globalSettings) => {
        if (globalSettings) {
          this.serverUrl = globalSettings.serverUrl;
          this.accessToken = globalSettings.accessToken;

          if (this.serverUrl && this.accessToken) {
            this.connectHomeAssistant()
          }
        }
      })

      this.$SD.on("connected", (actionInfo) => {
        this.$SD.requestGlobalSettings()
        let actionSettings = actionInfo.payload.settings
        this.domain = actionSettings["domain"]
        this.entity = actionSettings["entityId"]

        if (actionSettings["service"]) {
          this.service = actionSettings["service"].id
          this.serviceData = actionSettings["service"].data
        }
        if (actionSettings["serviceLongPress"]) {
          this.serviceLongPress = actionSettings["serviceLongPress"].id
          this.serviceDataLongPress = actionSettings["serviceLongPress"].data
        }

        this.enableServiceIndicator = actionSettings["enableServiceIndicator"] || actionSettings["enableServiceIndicator"] === undefined;
        this.hideIcon = actionSettings["hideIcon"];

        this.useCustomTitle = actionSettings["useCustomTitle"]
        this.buttonTitle = actionSettings["buttonTitle"] || "{{friendly_name}}"

        this.useCustomButtonLabels = actionSettings["useCustomButtonLabels"]
        this.buttonLabels = actionSettings["buttonLabels"]

        // backward compatibility
        if (actionSettings["buttonLabelLine1"] || actionSettings["buttonLabelLine1"] || actionSettings["buttonLabelLine3"]) {
          const l1 = actionSettings["buttonLabelLine1"] || ""
          const l2 = actionSettings["buttonLabelLine2"] || ""
          const l3 = actionSettings["buttonLabelLine3"] || ""
          this.buttonLabels = `${l1}\n${l2}\n${l3}`
        }
      })
    }
  },

  computed: {
    serverUrlState: function () {
      return this.serverUrl && this.serverUrl.length > 4
    },

    accessTokenState: function () {
      return this.accessToken && this.accessToken.length > 4
    },

    serviceDataFeedback: function () {
      if (!this.serviceData) {
        return "";
      }
      try {
        const json = JSON.parse(this.serviceData);
        return (typeof json === "object") ? "" : "Service data must be an JSON object."
      } catch (e) {
        return "Invalid JSON string.";
      }
    },

    serviceDataLongPressFeedback: function () {
      if (!this.serviceDataLongPress) {
        return "";
      }
      try {
        const json = JSON.parse(this.serviceDataLongPress);
        return (typeof json === "object") ? "" : "Service data must be an JSON object."
      } catch (e) {
        return "Invalid JSON string.";
      }
    },

    isHaSettingsComplete: function () {
      return !this.serverUrl || !this.accessToken
    },

    domainServices: function () {
      return Object.keys(this.availableServices[this.domain] || [])
          .map(key => {
            return {
              serviceId: key,
              serviceDetails: this.availableServices[this.domain][key]
            }
          })
    },

    domainEntities: function () {
      return this.availableEntities
          .filter((entityInfo) => entityInfo.value.domain === this.domain || this.domain === "homeassistant")
    },

    entityAttributes: function () {
      let currentEntityState = this.currentStates.find((state) => state.entity.entityId === this.entity)
      if (currentEntityState && currentEntityState.attributes) {
        return "{{state}}, " + currentEntityState.attributes
            .map(attribute => `{{${attribute}}}`)
            .join(", ")
      }
      return "-"
    },

  },

  methods: {
    connectHomeAssistant: function () {
      if (this.$HA) {
        this.$HA.close();
      }

      try {
        this.$HA = new Homeassistant(this.serverUrl, this.accessToken, () => {
              this.haConnected = true;
              this.$HA.getStates((states) => {
                this.availableDomains = Array.from(states
                    .map(state => new Entity(state.entity_id).domain)
                    .reduce((acc, curr) => acc.add(curr), new Set(["homeassistant", "notify"])))
                    .sort();

                this.availableEntities = states
                    .map((state) => {
                          return {
                            value: new Entity(state.entity_id),
                            text: state.attributes.friendly_name || state.entity_id
                          }
                        }
                    )
                    .sort((a, b) => (a.text.toLowerCase() > b.text.toLowerCase()) ? 1 : ((b.text.toLowerCase() > a.text.toLowerCase()) ? -1 : 0))

                this.currentStates = states
                    .map((state) => {
                      return {
                        entity: new Entity(state.entity_id),
                        attributes: ObjectUtils.paths(state.attributes)
                      }
                    })
              });
              this.$HA.getServices((services) => {
                this.availableServices = services;
              });
            },
            (message) => {
              this.haConnected = false;
              this.haError = message;
            }
        )
      } catch (e) {
        this.haError = e
      }
    },

    saveGlobalSettings: function () {
      this.haError = "";
      this.$SD.saveGlobalSettings({"serverUrl": this.serverUrl, "accessToken": this.accessToken});
      this.connectHomeAssistant()
    },

    saveSettings: function () {
      let actionSettings = {
        domain: this.domain,
        entityId: this.entity,

        service: {
          id: this.service,
          data: this.serviceData
        },
        serviceLongPress: {
          id: this.serviceLongPress,
          data: this.serviceDataLongPress
        },

        useCustomTitle: this.useCustomTitle,
        buttonTitle: this.buttonTitle,

        useStateImagesForOnOffStates: this.useStateImagesForOnOffStates, // determined by action ID (manifest)
        enableServiceIndicator: this.enableServiceIndicator,
        hideIcon: this.hideIcon,
        useCustomButtonLabels: this.useCustomButtonLabels,
        buttonLabels: this.buttonLabels
      }

      this.$SD.saveSettings(actionSettings)
    }
  }
}

</script>
