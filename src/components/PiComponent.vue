<template>
  <div class="container-fluid">

    <h1>Server Settings</h1>
    <div class="clearfix">

      <div class="mb-3">
        <label class="form-label" for="serverUrl">Server URL</label>
        <input id="serverUrl" v-model="serverUrl" class="form-control form-control-sm" type="email">
        <div class="form-text"><strong>Without SSL</strong> ws://localhost:8123/api/websocket
        </div>
        <div class="form-text"><strong>With SSL</strong> wss://ha.mydomain.net:8123/api/websocket (requires a trusted
          certificate)
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="accessToken">Access-Token</label>
        <input id="accessToken" v-model="accessToken" class="form-control form-control-sm" required type="password">
        <div class="form-text">Long-lived access tokens can be created using the "Long-Lived Access Tokens"
          section at the
          bottom of a user's Home Assistant profile page.
          <a class="info"
             href='https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token' target="_blank">Home
            Assistant
            documentation</a></div>
      </div>


      <div v-if="haError" class="alert alert-danger alert-dismissible" role="alert">
        {{ haError }}
        <button class="btn-close" type="button" @click="haError = ''"></button>
      </div>

      <button id="mybutton" :disabled="!isHaSettingsComplete || haConnectionState === 'connecting'"
              class="btn btn-sm btn-primary float-end"
              v-on:click="saveGlobalSettings">
        <span v-if="haConnectionState === 'connecting'" aria-hidden="true" class="spinner-border spinner-border-sm"
              role="status"></span>
        <span>{{ haConnectionState === 'connected' ? "Reconnect" : "Connect" }}</span>
      </button>
    </div>

    <div v-if="haConnectionState === 'connected'" class="clearfix mb-3">
      <h1>Button appearance</h1>

      <div class="mb-3">
        <label class="form-label" for="accessToken">Domain</label>
        <select id="domain" v-model="domain" class="form-select form-select-sm"
                title="The domain of the entity you want to display"
                v-on:change="entity = ''">
          <option v-for="availableDomain in availableEntityDomains" v-bind:key="availableDomain">{{
              availableDomain
            }}
          </option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label" for="entity">Entity</label>
        <select id="entity" v-model="entity" class="form-select form-select-sm" title="The entity you want to display">
          <option v-for="domainEntity in domainEntities" v-bind:key="domainEntity.entityId"
                  :value="domainEntity.entityId">{{
              domainEntity.title
            }}
          </option>
        </select>
      </div>

      <div class="form-check">
        <input id="chkButtonTitle" v-model="useCustomTitle" class="form-check-input" type="checkbox">
        <label class="form-check-label" for="chkButtonTitle">Use custom title</label>
      </div>

      <div v-if="useCustomTitle">

        <div class="mb-3">
          <input id="buttonTitle" v-model="buttonTitle" class="form-control form-control-sm"
                 placeholder="{{friendly_name}}"
                 type="text">
          <span class="form-text text-danger">You have to clear the main title in the main stream deck window to make this
            title
            template work.</span>
          <details>
            <summary>Available variables</summary>
            <div v-for="attr in entityAttributes" v-bind:key="attr" class="form-text font-monospace">{{ attr }}</div>
          </details>
        </div>
      </div>

      <div class="form-check">
        <input id="chkCustomLabels" v-model="useCustomButtonLabels" class="form-check-input" type="checkbox">
        <label class="form-check-label" for="chkCustomLabels">Custom labels</label>
      </div>

      <div v-if="useCustomButtonLabels">
        <div class="mb-3">
          <textarea id="buttonLabels" v-model="buttonLabels" class="form-control font-monospace"
                    placeholder="Line 1 (may overlap with icon)"
                    rows="4"></textarea>
          <details>
            <summary>Available variables</summary>
            <div v-for="attr in entityAttributes" v-bind:key="attr" class="form-text font-monospace">{{ attr }}</div>
          </details>
        </div>
      </div>

      <div class="form-check">
        <input id="chkEnableServiceIndicator" v-model="enableServiceIndicator" class="form-check-input" type="checkbox">
        <label class="form-check-label" for="chkEnableServiceIndicator">Show visual service indicators</label>
      </div>

      <div class="form-check mb-3">
        <input id="chkHideIcon" v-model="hideIcon" class="form-check-input" type="checkbox">
        <label class="form-check-label" for="chkHideIcon">Hide icon</label>
      </div>

      <h1>Button actions</h1>

      <h6>Short Press</h6>
      <ServiceCallConfiguration v-model="serviceShortPress"
                                :available-entities="availableEntities"
                                :available-services="availableServices"

      ></ServiceCallConfiguration>

      <h6>Long Press</h6>
      <ServiceCallConfiguration v-model="serviceLongPress"
                                :available-entities="availableEntities"
                                :available-services="availableServices"></ServiceCallConfiguration>

      <button id="mybutton" :disabled="!domain" class="btn btn-sm btn-primary float-end"
              v-on:click="saveSettings">
        Save configuration
      </button>

    </div>
  </div>
</template>

<script setup>

import {StreamDeck} from "@/modules/common/streamdeck";
import {Settings} from "@/modules/common/settings";
import {Homeassistant} from "@/modules/homeassistant/homeassistant";
import {Entity} from "@/modules/pi/entity";
import {Service} from "@/modules/pi/service";
import {computed, onMounted, ref} from "vue";
import ServiceCallConfiguration from "@/components/ServiceCallConfiguration.vue";
import {ObjectUtils} from "@/modules/common/utils";

let $HA = null;
let $SD = null;

const serverUrl = ref("")
const accessToken = ref("")
const domain = ref("")
const entity = ref("")
const serviceShortPress = ref({})
const serviceLongPress = ref({})
const useCustomTitle = ref(false)
const buttonTitle = ref("{{friendly_name}}")
const useStateImagesForOnOffStates = ref(false) // determined by action ID (manifest)
const useCustomButtonLabels = ref(false)
const buttonLabels = ref("")
const enableServiceIndicator = ref(true)
const hideIcon = ref(false)
const availableEntityDomains = ref([])
const availableEntities = ref([])
const availableServiceDomains = ref([])
const availableServices = ref([])
const currentStates = ref([])
const haConnectionState = ref("disconnected") // disconnected, connecting, connected
const haError = ref("")


onMounted(() => {
  window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
    $SD = new StreamDeck(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo);

    // Dual State entity (custom icons for on/off)
    const inActionInfoObject = JSON.parse(inActionInfo);
    if (inActionInfoObject["action"] === "de.perdoctus.streamdeck.homeassistant.dual-state-entity") {
      useStateImagesForOnOffStates.value = true;
    }

    $SD.on("globalsettings", (globalSettings) => {
      if (globalSettings) {
        serverUrl.value = globalSettings.serverUrl;
        accessToken.value = globalSettings.accessToken;

        if (serverUrl.value && accessToken.value) {
          connectHomeAssistant()
        }
      }
    })

    $SD.on("connected", (actionInfo) => {
      $SD.requestGlobalSettings()

      let settings = Settings.parse(actionInfo.payload.settings);

      domain.value = settings["display"]["domain"]
      entity.value = settings["display"]["entityId"]
      enableServiceIndicator.value = settings["display"]["enableServiceIndicator"] || settings["display"]["enableServiceIndicator"] === undefined;
      hideIcon.value = settings["display"]["hideIcon"];
      useCustomTitle.value = settings["display"]["useCustomTitle"]
      buttonTitle.value = settings["display"]["buttonTitle"] || "{{friendly_name}}"
      useCustomButtonLabels.value = settings["display"]["useCustomButtonLabels"]
      buttonLabels.value = settings["display"]["buttonLabels"]
      serviceShortPress.value = settings["button"]["serviceShortPress"]
      serviceLongPress.value = settings["button"]["serviceLongPress"]
    })
  }
})

const isHaSettingsComplete = computed(() => {
  return serverUrl.value && accessToken.value
})


const domainEntities = computed(() => {
  return availableEntities.value.filter((entity) => entity.domain === domain.value)
})


const entityAttributes = computed(() => {
  let currentEntityState = currentStates.value.find((state) => state.entityId === entity.value)
  if (currentEntityState && currentEntityState.attributes) {
    let attributes = currentEntityState.attributes.map(attribute => `{{${attribute}}}`);
    return ["{{state}}", ...attributes]
  }
  return []
})

function connectHomeAssistant() {
  if ($HA) {
    $HA.close();
  }

  haConnectionState.value = 'connecting';

  try {
    $HA = new Homeassistant(serverUrl.value, accessToken.value, () => {
          haConnectionState.value = 'connected';
          $HA.getStates((states) => {
            availableEntityDomains.value = Array.from(states
                .map(state => state.entity_id.split('.')[0])
                .reduce((acc, curr) => acc.add(curr), new Set()))
                .sort();

            availableEntities.value = states
                .map((state) => {
                      let splittedId = state.entity_id.split('.');
                      return new Entity(splittedId[0], splittedId[1], state.attributes.friendly_name || state.entity_id)
                    }
                )
                .sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase()) ? 1 : ((b.title.toLowerCase() > a.title.toLowerCase()) ? -1 : 0))

            currentStates.value = states
                .map((state) => {
                  return {
                    entityId: state.entity_id,
                    attributes: ObjectUtils.paths(state.attributes)
                  }
                })
          });
          $HA.getServices((services) => {
            availableServices.value = Object.entries(services).flatMap(domainServices => {
              const domain = domainServices[0];
              return Object.entries(domainServices[1]).map(services => {
                let serviceName = services[0];
                let serviceData = services[1];
                return new Service(domain, serviceName, serviceData.name, serviceData.description, serviceData.fields, serviceData.target);
              })
            })
            availableServiceDomains.value = Object.keys(services).sort();
          });
        },
        (message) => {
          haError.value = message;
          haConnectionState.value = 'disconnected';
        },
        () => {
          haConnectionState.value = 'disconnected';
        }
    )
  } catch (e) {
    haError.value = e
    haConnectionState.value = 'disconnected';
  }
}


function saveGlobalSettings() {
  haError.value = "";
  $SD.saveGlobalSettings({"serverUrl": serverUrl.value, "accessToken": accessToken.value});
  connectHomeAssistant()
}


function saveSettings() {
  let settings = {
    version: 3,

    display: {
      domain: domain.value,
      entityId: entity.value,
      useCustomTitle: useCustomTitle.value,
      buttonTitle: buttonTitle.value,
      enableServiceIndicator: enableServiceIndicator.value,
      hideIcon: hideIcon.value,
      useCustomButtonLabels: useCustomButtonLabels.value,
      buttonLabels: buttonLabels.value,
      useStateImagesForOnOffStates: useStateImagesForOnOffStates.value // determined by action ID (manifest)
    },

    button: {
      serviceShortPress: serviceShortPress.value,
      serviceLongPress: serviceLongPress.value,
    }

  }

  $SD.saveSettings(settings)
}

</script>
