<template>
  <div class="container">
    <p>Settings should open in a separate window!</p>

    <window-portal ref="portal" open>
      <div class="container mt-3">

        <b-form>
          <h2>Home Assistant Settings</h2>

          <div>
            <b-form-group
                label="Home Assistant Server URL"
                description="example: ws://localhost:8123/api/websocket"
                label-for="serverUrl"
                :state="serverUrlState">
              <b-form-input id="serverUrl" v-model="serverUrl" :state="serverUrlState" trim required></b-form-input>
            </b-form-group>
          </div>

          <div>
            <b-form-group
                label="Access-Token"
                description="To find out how to obtain a Token, please visit https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token"
                label-for="accessToken"
                :state="accessTokenState">
              <b-form-input type="password" id="accessToken" v-model="accessToken" :state="accessTokenState" trim
                            required></b-form-input>
            </b-form-group>
          </div>

          <p class="text-danger" v-if="haError">{{haError}}</p>

          <div>
            <b-button id="btnSave" v-on:click="saveGlobalSettings" v-bind:disabled="isHaSettingsComplete">Save
            </b-button>
          </div>
        </b-form>

        <hr>

        <b-form v-if="haConnected">
          <h2>Entity Settings</h2>

          <b-form-group
              label="Domain"
              label-for="domain"
              description="The domain of the entity you want to configure">
            <b-form-select id="domain" v-on:change="service = null; entity = null" v-model="domain"
                           :options="availableDomains"></b-form-select>
          </b-form-group>

          <b-form-group
              label="Entity"
              label-for="entity"
              description="The id of the entity you want to configure">
            <b-form-select id="entity" v-on:change="service = null" v-model="entity" :options="domainEntities"
                           value-field="value.entityId"
                           text-field="value.name"></b-form-select>
          </b-form-group>

          <b-form-group
              label="Service"
              label-for="service"
              description="(Optional) Service that should be called when the stream deck button is pushed."
              v-if="domainServices.length > 0">
            <b-input-group>
              <b-form-select id="service" v-model="service" :options="domainServices" value-field="serviceId"
                             text-field="serviceId"></b-form-select>
              <b-input-group-append>
                <b-button v-on:click="service = null">Clear</b-button>
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
                id="serviceData"
                v-model="serviceData"
                rows="3"
                :state="!serviceDataFeedback"
            ></b-form-textarea>
          </b-form-group>

          <b-form-group
              label="Service (long press)"
              label-for="serviceLongPress"
              description="(Optional) Service that should be called when the stream deck button is pushed for longer than 300ms."
              v-if="domainServices.length > 0">
            <b-input-group>
              <b-form-select id="serviceLongPress" v-model="serviceLongPress" :options="domainServices"
                             value-field="serviceId"
                             text-field="serviceId"></b-form-select>
              <b-input-group-append>
                <b-button v-on:click="serviceLongPress = null">Clear</b-button>
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
                id="serviceDataLongPress"
                v-model="serviceDataLongPress"
                rows="3"
                :state="!serviceDataLongPressFeedback"
            ></b-form-textarea>
          </b-form-group>

          <b-form-checkbox
              id="chkButtonTitle"
              v-model="useCustomTitle">Enable custom button title
          </b-form-checkbox>

          <div v-if="useCustomTitle">
            <p class="text-danger">You have to clear the main title in the main stream deck window to make this title
              template work.</p>
            <b-form-group
                label-for="buttonTitle"
                :description="'Available variables: ' + entityAttributes">
              <b-form-textarea
                  id="textarea"
                  v-model="buttonTitle"
                  rows="3"
              ></b-form-textarea>
            </b-form-group>
          </div>

          <b-form-checkbox
              id="chkUsebuttonTitle"
              v-model="useCustomButtonLabels">Enable custom labels
          </b-form-checkbox>

          <div v-if="useCustomButtonLabels">
            <b-form-group
                label-for="buttonLabelLine1"
                :description="'Available variables: ' + entityAttributes">
              <b-form-textarea
                  id="buttonLabelLine1"
                  v-model="buttonLabelLine1"
                  rows="3">
              </b-form-textarea>
            </b-form-group>
            <b-form-group
                label-for="buttonLabelLine2"
                :description="'Available variables: ' + entityAttributes">
              <b-form-textarea
                  id="buttonLabelLine2"
                  v-model="buttonLabelLine2"
                  rows="3">
              </b-form-textarea>
            </b-form-group>
            <b-form-group
                label-for="buttonLabelLine3"
                :description="'Available variables: ' + entityAttributes">
              <b-form-textarea
                  id="buttonLabelLine3"
                  v-model="buttonLabelLine3"
                  rows="3">
              </b-form-textarea>
            </b-form-group>
          </div>

          <div>
            <b-button id="btnActionSave" v-on:click="saveSettings" v-bind:disabled="!domain">Save</b-button>
          </div>

        </b-form>
      </div>
    </window-portal>
  </div>
</template>

<script>
import StreamDeck from "@/modules/common/streamdeck";
import {ObjectUtils} from "@/modules/common/utils";
import {Entity, Homeassistant} from "@/modules/common/homeassistant";
import WindowPortal from "@/components/WindowPortal";

export default {
  name: 'Pi',
  components: {WindowPortal},
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

      useCustomButtonLabels: false,
      buttonLabelLine1: "",
      buttonLabelLine2: "",
      buttonLabelLine3: "",

      availableDomains: [],
      availableEntities: [],
      availableServices: [],
      availableAttributes: [],

      // Home-Assistant-State
      haConnected: false,
      haError: ""
    }
  },
  created() {
    window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
      this.$SD = new StreamDeck(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo);
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

        this.useCustomTitle = actionSettings["useCustomTitle"]
        this.buttonTitle = actionSettings["buttonTitle"] || "{{friendly_name}}"

        this.useCustomButtonLabels = actionSettings["useCustomButtonLabels"]
        this.buttonLabelLine1 = actionSettings["buttonLabelLine1"]
        this.buttonLabelLine2 = actionSettings["buttonLabelLine2"]
        this.buttonLabelLine3 = actionSettings["buttonLabelLine3"]
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
          .filter((entityInfo) => entityInfo.value.domain === this.domain)
    },

    entityAttributes: function () {
      let entityAttributes = this.availableAttributes.find((attribute) => attribute.entity.entityId === this.entity)
      if (entityAttributes && entityAttributes.attributes) {
        return "{{state}}, " + entityAttributes.attributes
            .map(attribute => `{{${attribute}}}`)
            .join(", ")
      }
      return "-"
    }
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
                    .sort()
                    .reduce(
                        (acc, curr) => acc.add(curr), new Set()
                    ));

                this.availableEntities = states
                    .map((state) => {
                          return {
                            value: new Entity(state.entity_id),
                            text: state.attributes.friendly_name || state.entity_id
                          }
                        }
                    )
                    .sort((a, b) => (a.text > b.text) ? 1 : ((b.text > a.text) ? -1 : 0))

                this.availableAttributes = states
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

        useCustomButtonLabels: this.useCustomButtonLabels,
        buttonLabelLine1: this.buttonLabelLine1,
        buttonLabelLine2: this.buttonLabelLine2,
        buttonLabelLine3: this.buttonLabelLine3
      }

      this.$SD.saveSettings(actionSettings)
    }
  }
}

</script>
