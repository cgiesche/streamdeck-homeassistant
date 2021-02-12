<template>
  <div class="sdpi-wrapper">

    <div class="sdpi-item" id="messagegroup" type="group">
      <div class="sdpi-item-label">Home Assistant Settings</div>
      <div class="sdpi-item-group" id="messagegroup_items">
        <div class="sdpi-item">
          <div class="sdpi-item-label"><label for="serverUrl">Home Assistant Server URL</label></div>
          <input v-model="serverUrl" class="sdpi-item-value" id="serverUrl" placeholder="localhost:443" required>
        </div>
        <div class="sdpi-item" style="min-height: 26px">
          <div class="sdpi-item-label"><label for="accessToken">Access Token</label></div>
          <input v-model="accessToken" type="password" class="sdpi-item-value" id="accessToken" required>
        </div>
        <div class="sdpi-item">
          <div class="sdpi-item-label">Save</div>
          <button class="sdpi-item-value" id="btnSave" v-on:click="saveGlobalSettings"
                  v-bind:disabled="isHaSettingsComplete">Save
          </button>
        </div>
      </div>
    </div>

    <div class="sdpi-item" id="messagegroup2" type="group">
      <div class="sdpi-item-label">Entity Settings</div>
      <div class="sdpi-item-group" id="messagegroup2_items">
        <div class="sdpi-item">
          <div class="sdpi-item-label"><label for="domain">Domain</label></div>
          <select class="sdpi-item-value select" id="domain" v-model="domain">
            <option v-for="domain in availableDomains" v-bind:key="domain">
              {{ domain }}
            </option>
          </select>
        </div>
        <div class="sdpi-item">
          <div class="sdpi-item-label"><label for="entity">Entity</label></div>
          <select class="sdpi-item-value select" id="entity" v-model="entity">
            <option v-for="entity in domainEntities" v-bind:key="entity.value.entityId"
                    v-bind:value="entity.value.entityId">
              {{ entity.text }}
            </option>
          </select>
        </div>
        <div class="sdpi-item">
          <div class="sdpi-item-label"><label for="service">Service</label></div>
          <select class="sdpi-item-value select" id="service" v-model="service">
            <option v-for="service in domainServices" v-bind:key="service.serviceId" v-bind:value="service.serviceId">
              {{ service.serviceId }} ({{ service.serviceDetails.description }})
            </option>
          </select>
        </div>

        <div type="checkbox" class="sdpi-item">
          <div class="sdpi-item-label">Custom Title</div>
          <input class="sdpi-item-value" id="chkButtonTitle" type="checkbox" v-model="useCustomTitle">
          <label for="chkButtonTitle"><span></span></label>
        </div>

        <template v-if="useCustomTitle">
          <div class="sdpi-item">
            <div class="sdpi-item-label"><label for="txtbuttonTitle">Title Template*</label></div>
            <input v-model="buttonTitle" class="sdpi-item-value" id="txtbuttonTitle">
          </div>
          <p class="altColor">Available variables: {{ entityAttributes }}</p>
          <p style="color: coral">You have to clear the main title to make this title template work.</p>
        </template>

        <div type="checkbox" class="sdpi-item">
          <div class="sdpi-item-label">Custom Labels</div>
          <input class="sdpi-item-value" id="chkUsebuttonTitle" type="checkbox" v-model="useCustomButtonLabels">
          <label for="chkUsebuttonTitle"><span></span></label>
        </div>

        <template v-if="useCustomButtonLabels">
          <div class="sdpi-item">
            <div class="sdpi-item-label"><label for="txtLine1">Button line 1</label></div>
            <input v-model="buttonLabelLine1" class="sdpi-item-value" id="txtLine1">
          </div>
          <div class="sdpi-item">
            <div class="sdpi-item-label"><label for="txtLine2">Button line 2</label></div>
            <input v-model="buttonLabelLine2" class="sdpi-item-value" id="txtLine2">
          </div>
          <div class="sdpi-item">
            <div class="sdpi-item-label"><label for="txtLine3">Button line 3</label></div>
            <input v-model="buttonLabelLine3" class="sdpi-item-value" id="txtLine3">
          </div>
          <p>Available variables: {{ entityAttributes }}</p>
        </template>

        <div class="sdpi-item">
          <div class="sdpi-item-label">Save</div>
          <button class="sdpi-item-value" id="btnActionSave" v-on:click="saveSettings" v-bind:disabled="!domain">Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import StreamDeck from "@/modules/common/streamdeck";
import {ObjectUtils} from "@/modules/common/utils";
import {Entity, Homeassistant} from "@/modules/common/homeassistant";

export default {
  name: 'Pi',
  props: {},
  data: () => {
    return {
      serverUrl: "",
      accessToken: "",

      domain: "",
      entity: "",
      service: "",

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
      availableAttributes: []
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
        this.service = actionSettings["service"]

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

      this.$HA = new Homeassistant(this.serverUrl, this.accessToken, () => {
        this.$HA.getStates((states) => {
          this.availableDomains = states
              .map(state => new Entity(state.entity_id).domain)
              .sort()
              .reduce(
                  (acc, curr) => acc.add(curr), new Set()
              );

          this.availableEntities = states
              .map((state) => {
                    return {
                      value: new Entity(state.entity_id),
                      text: state.attributes.friendly_name || state.entity_id
                    }
                  }
              )
              .sort((a,b) => (a.text > b.text) ? 1 : ((b.text > a.text) ? -1 : 0))

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
      })
    },

    saveGlobalSettings: function () {
      this.$SD.saveGlobalSettings({"serverUrl": this.serverUrl, "accessToken": this.accessToken});
      this.connectHomeAssistant()
    },

    saveSettings: function () {
      let actionSettings = {
        domain: this.domain,
        entityId: this.entity,
        service: this.service,

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
