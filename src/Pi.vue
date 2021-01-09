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
        <div class="sdpi-item">
          <div class="sdpi-item-label"><label for="titleTemplate">Title Template</label></div>
          <input class="sdpi-item-value" id="titleTemplate" value="${this.state}" disabled>
        </div>
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
      titleTemplate: "",

      availableDomains: [],
      availableEntities: [],
      availableServices: []
    }
  },
  beforeCreate() {
    window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
      this.$SD = new StreamDeck(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo);
      this.$SD.on("globalsettings", (globalSettings) => {
        if (globalSettings) {
          this.serverUrl = globalSettings.serverUrl;
          this.accessToken = globalSettings.accessToken;

          if (this.serverUrl && this.accessToken) {
            this.$HA = new Homeassistant(this.serverUrl, this.accessToken, () => {
              this.$HA.getStates((states) => {
                this.availableDomains = states
                    .map(state => new Entity(state.entity_id).domain)
                    .reduce(
                        (acc, curr) => acc.add(curr), new Set()
                    );

                this.availableEntities = states
                    .map((state) => {
                          return {
                            value: new Entity(state.entity_id),
                            text: state.attributes.friendly_name
                          }
                        }
                    )
              });
              this.$HA.getServices((services) => {
                this.availableServices = services;
              });
            })
          }
        }
      })

      this.$SD.on("connected", (actionInfo) => {
        this.$SD.requestGlobalSettings()
        let actionSettings = actionInfo.payload.settings
        this.domain = actionSettings["domain"]
        this.entity = actionSettings["entityId"]
        this.service = actionSettings["service"]
        this.titleTemplate = actionSettings["titleTemplate"]
      })
    }
  },

  computed: {
    isHaSettingsComplete: function () {
      return !this.serverUrl || !this.accessToken
    },

    domainServices: function () {
      let services = Object.keys(this.availableServices[this.domain] || [])
          .map(key => {
            return {
              serviceId: key,
              serviceDetails: this.availableServices[this.domain][key]
            }
          });
      console.log("SERVICES")
      console.log(services)
      return services
    },

    domainEntities: function () {
      let domains = this.availableEntities
          .filter((entityInfo) => entityInfo.value.domain === this.domain);
      console.log("ENTITIES")
      console.log(domains)
      return domains
    }
  },

  methods: {
    saveGlobalSettings: function () {
      this.$SD.saveGlobalSettings({"serverUrl": this.serverUrl, "accessToken": this.accessToken});

      if (this.$HA) {
        this.$HA.close();
      }
      this.$HA = new Homeassistant(this.serverUrl, this.accessToken, () => {
        this.$HA.getStates(
            (states) => {
              this.availableDomains = states
                  .map(state => new Entity(state.entity_id).domain)
                  .reduce(
                      (acc, curr) => acc.add(curr), new Set()
                  );

              this.availableEntities = states
                  .map((state) => {
                        return {
                          value: new Entity(state.entity_id),
                          text: state.attributes.friendly_name
                        }
                      }
                  )
            }
        );
        this.$HA.getServices((services) => {
          this.availableServices = services;
        });
      })
    },

    saveSettings: function () {
      let actionSettings = {
        domain: this.domain,
        entityId: this.entity,
        service: this.service,
        titleTemplate: this.titleTemplate,
      }

      this.$SD.saveSettings(actionSettings)
    }
  }
}

</script>
