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

    <b-form v-if="haConnected">
      <hr>
      <h5>Display Settings</h5>
      <p>These settings define what is displayed on your stream deck button.</p>

      <b-form-group
          label="Domain"
          label-for="domain"
          description="The domain of the entity you want to display">
        <b-form-select size="sm" id="domain" v-on:change="entity = null" v-model="domain"
                       :options="availableEntityDomains"></b-form-select>
      </b-form-group>

      <b-form-group
          label="Entity"
          label-for="entity"
          description="The entity you want to display"
          v-if="domainEntities.length > 0">
        <b-form-select size="sm" id="entity" v-model="entity"
                       :options="domainEntities"
                       text-field="title"
                       value-field="entityId">
        </b-form-select>
      </b-form-group>

      <b-form-checkbox
          size="sm"
          id="chkButtonTitle"
          v-model="useCustomTitle">Custom title
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
          v-model="useCustomButtonLabels">Custom labels
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
          v-model="hideIcon">Hide icon
      </b-form-checkbox>

      <hr>
      <h5>Button Settings</h5>
      <h6>Short Press</h6>
      <ServiceCallConfiguration :available-entities="availableEntities"
                                :available-services="availableServices"
                                v-model="serviceShortPress"

      ></ServiceCallConfiguration>

      <h6>Long Press</h6>
      <ServiceCallConfiguration :available-entities="availableEntities"
                                :available-services="availableServices"
                                v-model="serviceLongPress"></ServiceCallConfiguration>

      <b-button size="sm" id="btnActionSave" v-on:click="saveSettings" v-bind:disabled="!domain">Save entity config
      </b-button>

    </b-form>
  </div>
</template>

<script>
import StreamDeck from "@/modules/common/streamdeck";
import {ObjectUtils} from "@/modules/common/utils";
import {Homeassistant} from "@/modules/homeassistant/homeassistant";
import {Settings} from "@/modules/common/settings";
import {Entity} from "@/modules/pi/entity";
import {Service} from "@/modules/pi/service";
import ServiceCallConfiguration from "@/components/ServiceCallConfiguration.vue";

export default {
  name: 'PiComponent',
  components: {ServiceCallConfiguration},
  props: {},
  data: () => {
    return {
      serverUrl: "",
      accessToken: "",

      domain: "",
      entity: "",

      serviceShortPress: {},
      serviceLongPress: {},

      // Custom Labels
      useCustomTitle: false,
      buttonTitle: "{{friendly_name}}",

      useStateImagesForOnOffStates: false, // determined by action ID (manifest)
      useCustomButtonLabels: false,
      buttonLabels: "",
      enableServiceIndicator: true,
      hideIcon: false,

      availableEntityDomains: [],
      availableEntities: [],

      availableServiceDomains: [],
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

        let settings = Settings.parse(actionInfo.payload.settings);

        this.domain = settings["display"]["domain"]
        this.entity = settings["display"]["entityId"]
        this.enableServiceIndicator = settings["display"]["enableServiceIndicator"] || settings["display"]["enableServiceIndicator"] === undefined;
        this.hideIcon = settings["display"]["hideIcon"];
        this.useCustomTitle = settings["display"]["useCustomTitle"]
        this.buttonTitle = settings["display"]["buttonTitle"] || "{{friendly_name}}"
        this.useCustomButtonLabels = settings["display"]["useCustomButtonLabels"]
        this.buttonLabels = settings["display"]["buttonLabels"]
        this.serviceShortPress = settings["button"]["serviceShortPress"]
        this.serviceLongPress = settings["button"]["serviceLongPress"]
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

    isHaSettingsComplete: function () {
      return !this.serverUrl || !this.accessToken
    },

    domainEntities: function () {
      return this.availableEntities.filter((entity) => entity.domain === this.domain)
    },

    entityAttributes: function () {
      let currentEntityState = this.currentStates.find((state) => state.entityId === this.entity)
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
                this.availableEntityDomains = Array.from(states
                    .map(state => state.entity_id.split('.')[0])
                    .reduce((acc, curr) => acc.add(curr), new Set()))
                    .sort();

                this.availableEntities = states
                    .map((state) => {
                          let splittedId = state.entity_id.split('.');
                          return new Entity(splittedId[0], splittedId[1], state.attributes.friendly_name || state.entity_id)
                        }
                    )
                    .sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase()) ? 1 : ((b.title.toLowerCase() > a.title.toLowerCase()) ? -1 : 0))

                this.currentStates = states
                    .map((state) => {
                      return {
                        entityId: state.entity_id,
                        attributes: ObjectUtils.paths(state.attributes)
                      }
                    })
              });
              this.$HA.getServices((services) => {
                this.availableServices = Object.entries(services).flatMap(domainServices => {
                  const domain = domainServices[0];
                  return Object.entries(domainServices[1]).map(services => {
                    let serviceName = services[0];
                    let serviceData = services[1];
                    return new Service(domain, serviceName, serviceData.name, serviceData.description, serviceData.fields, serviceData.target);
                  })
                })
                this.availableServiceDomains = Object.keys(services).sort();
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
      let settings = {
        version: 3,

        display: {
          domain: this.domain,
          entityId: this.entity,
          useCustomTitle: this.useCustomTitle,
          buttonTitle: this.buttonTitle,
          enableServiceIndicator: this.enableServiceIndicator,
          hideIcon: this.hideIcon,
          useCustomButtonLabels: this.useCustomButtonLabels,
          buttonLabels: this.buttonLabels,
          useStateImagesForOnOffStates: this.useStateImagesForOnOffStates // determined by action ID (manifest)
        },

        button: {
          serviceShortPress: this.serviceShortPress,
          serviceLongPress: this.serviceLongPress,
        }

      }

      this.$SD.saveSettings(settings)
    }
  }
}

</script>
