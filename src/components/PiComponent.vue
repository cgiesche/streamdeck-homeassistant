<template>
  <div class="container-fluid">
    <h1>Global Settings</h1>
    <div class="clearfix mb-3">
      <div class="mb-3">
        <label class="form-label" for="serverUrl">Server URL</label>
        <input id="serverUrl" v-model="serverUrl" class="form-control form-control-sm" type="url" />
        <div class="form-text"><strong>Without SSL</strong> ws://localhost:8123/api/websocket</div>
        <div class="form-text">
          <strong>With SSL</strong> wss://ha.mydomain.net:8123/api/websocket (requires a trusted certificate)
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="accessToken">Access-Token</label>
        <input id="accessToken" v-model="accessToken" class="form-control form-control-sm" required type="password" />
        <div class="form-text">
          Long-lived access tokens can be created using the "Long-Lived Access Tokens" section at the bottom of a user's
          Home Assistant profile page.
          <a
            class="info"
            href="https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token"
            target="_blank"
            >Home Assistant documentation</a
          >
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="displayConfig">Display configuration ("Theme")</label>
        <div class="input-group">
          <select
            :disabled="displayConfigurationUrlOverride.length > 0"
            id="displayConfig"
            v-model="displayConfiguration"
            class="form-select form-select-sm"
          >
            <option
              v-for="availableConfiguration in manifest['display-configs']"
              :key="availableConfiguration"
              :value="availableConfiguration"
            >
              {{ availableConfiguration.title }}
            </option>
          </select>
        </div>

        <div class="mt-3">
          <label for="formFileSm" class="form-label">Custom display configuration URL</label>
          <input
            v-model="displayConfigurationUrlOverride"
            class="form-control form-control-sm"
            type="url"
            placeholder="file://c:/custom.yml"
          />
          <div class="form-text">
            Specify path or URL to customized display configuration. Unsupported!
            <a
              target="_blank"
              href="https://raw.githubusercontent.com/cgiesche/streamdeck-homeassistant/master/public/config/default-display-config.yml"
            >
              Example </a
            >.
          </div>
        </div>
      </div>

      <div v-if="haError" class="alert alert-danger alert-dismissible" role="alert">
        {{ haError }}
        <button class="btn-close" type="button" @click="haError = ''" />
      </div>

      <button
        :disabled="!isHaSettingsComplete || haConnectionState === 'connecting'"
        class="btn btn-sm btn-primary float-end"
        v-on:click="saveGlobalSettings"
      >
        <span
          v-if="haConnectionState === 'connecting'"
          aria-hidden="true"
          class="spinner-border spinner-border-sm"
          role="status"
        />
        <span>{{ haConnectionState === 'connected' ? 'Save and reconnect' : 'Save and connect' }}</span>
      </button>
    </div>

    <!-- ======================================================================================================= -->

    <div v-if="haConnectionState === 'connected'" class="clearfix mb-3">
      <h1>{{ controllerType }} appearance</h1>

      <EntitySelection class="mb-3" :available-entities="availableEntities" v-model="entity" />

      <div class="form-check form-switch">
        <input id="chkButtonTitle" v-model="useCustomTitle" class="form-check-input" type="checkbox" />
        <label class="form-check-label" for="chkButtonTitle">Use custom title</label>
      </div>

      <div v-if="useCustomTitle">
        <div class="mb-3">
          <input
            id="buttonTitle"
            v-model="buttonTitle"
            class="form-control form-control-sm"
            placeholder="{{friendly_name}}"
            type="text"
          />
          <span class="form-text text-danger">
            You have to clear the main title in the main stream deck window to make this title template work.
          </span>
          <details>
            <summary>Available variables</summary>
            <div v-for="attr in entityAttributes" v-bind:key="attr" class="form-text font-monospace">
              {{ attr }}
            </div>
          </details>
        </div>
      </div>

      <div class="form-check form-switch">
        <input id="chkCustomLabels" v-model="useCustomButtonLabels" class="form-check-input" type="checkbox" />
        <label class="form-check-label" for="chkCustomLabels">Custom labels</label>
      </div>

      <div v-if="useCustomButtonLabels">
        <div class="mb-3">
          <textarea
            id="buttonLabels"
            v-model="buttonLabels"
            class="form-control font-monospace"
            placeholder="Line 1 (may overlap with icon)"
            rows="4"
          />
          <details>
            <summary>Available variables</summary>
            <div v-for="attr in entityAttributes" v-bind:key="attr" class="form-text font-monospace">
              {{ attr }}
            </div>
          </details>
        </div>
      </div>

      <template v-if="controllerType !== 'Encoder'">
        <div class="form-check form-switch">
          <input
            id="chkEnableServiceIndicator"
            v-model="enableServiceIndicator"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label" for="chkEnableServiceIndicator"> Show visual service indicators </label>
        </div>
      </template>

      <div class="mt-3 mb-3">
        <div class="form-check">
          <input class="form-check-input" type="radio" id="radioPlugin" value="PREFER_PLUGIN" v-model="iconSettings" />
          <label class="form-check-label" for="radioPlugin"> Prefer icon from plugin (recommended) </label>
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="radio"
            id="radioHomeAssistant"
            value="PREFER_HA"
            v-model="iconSettings"
          />
          <label class="form-check-label" for="radioHomeAssistant"> Prefer icon from HA </label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="radio" id="radioHide" value="HIDE" v-model="iconSettings" />
          <label class="form-check-label" for="radioHide"> Hide icon </label>
        </div>
      </div>

      <h1>{{ controllerType }} actions</h1>

      <AccordeonComponent id="presses" class="mb-2">
        <AccordeonItem accordeon-id="presses" item-id="shortPress" title="Short Press">
          <ServiceCallConfiguration
            v-model="serviceShortPress"
            :available-entities="availableEntities"
            :available-services="availableServices"
            class="mb-2"
          />
        </AccordeonItem>

        <AccordeonItem accordeon-id="presses" item-id="longPress" title="Long Press">
          <ServiceCallConfiguration
            v-model="serviceLongPress"
            :available-entities="availableEntities"
            :available-services="availableServices"
            class="mb-2"
          />
        </AccordeonItem>

        <template v-if="controllerType === 'Encoder'">
          <AccordeonItem accordeon-id="presses" item-id="touch" title="Screen tap">
            <ServiceCallConfiguration
              v-model="serviceTap"
              :available-entities="availableEntities"
              :available-services="availableServices"
              class="mb-2"
            />
          </AccordeonItem>

          <AccordeonItem accordeon-id="presses" item-id="dialRotate" title="Rotation">
            <ServiceCallConfiguration
              v-model="serviceRotation"
              :available-entities="availableEntities"
              :available-services="availableServices"
            />

            <details class="mb-2">
              <summary>Available variables</summary>
              <div class="form-text">
                <span v-pre class="text-info font-monospace">{{ ticks }}</span> - The number of ticks the dial was
                rotated (negative value for left turn, positive value for right turn).
              </div>
              <div class="form-text">
                <span v-pre class="text-info font-monospace">{{ rotationPercent }}</span> - A number between 0 and 100
                that represents the rotation percentage value of the dial.
              </div>
              <div class="form-text">
                <span v-pre class="text-info font-monospace">{{ rotationAbsolute }}</span> - A number between 0 and 255
                that represents the absolute rotation value of the dial.
              </div>
            </details>

            <label class="form-label" for="rotationTickMultiplier">
              Dial rotation tick multiplier (x{{ rotationTickMultiplier }})
            </label>
            <input
              id="rotationTickMultiplier"
              v-model="rotationTickMultiplier"
              class="form-range"
              max="10"
              min="0.1"
              step="0.1"
              type="range"
            />
            <div class="form-text mb-2">
              Each tick of the dial will be multiplied with this value. This results in faster or slower value changes.
            </div>

            <label class="form-label" for="rotationTickBucketSizeMs">
              Dial rotation tick bucket size ({{ rotationTickBucketSizeMs }} ms)
            </label>
            <input
              id="rotationTickBucketSizeMs"
              v-model="rotationTickBucketSizeMs"
              class="form-range"
              max="1000"
              min="0"
              step="50"
              type="range"
            />
            <div class="form-text mb-2">
              If greater than zero, ticks are aggregated for the given amount of milliseconds and then passed to your
              service call. This results in less service calls. A value of zero will result in a service call for each
              tick, which may cause trouble with home assistant.
            </div>
          </AccordeonItem>
        </template>
      </AccordeonComponent>

      <button class="btn btn-sm btn-primary float-end" v-on:click="saveSettings">Save configuration</button>
    </div>
  </div>
</template>

<script setup>
import defaultManifest from '../../public/config/manifest.yml'
import { StreamDeck } from '@/modules/common/streamdeck'
import { Settings } from '@/modules/common/settings'
import { Homeassistant } from '@/modules/homeassistant/homeassistant'
import { Entity } from '@/modules/pi/entity'
import { Service } from '@/modules/pi/service'
import { computed, onMounted, ref } from 'vue'
import ServiceCallConfiguration from '@/components/ServiceCallConfiguration.vue'
import { ObjectUtils } from '@/modules/common/utils'
import AccordeonComponent from '@/components/accordeon/BootstrapAccordeon.vue'
import AccordeonItem from '@/components/accordeon/BootstrapAccordeonItem.vue'
import EntitySelection from '@/components/EntitySelection.vue'
import axios from 'axios'
import yaml from 'js-yaml'

axios.defaults.headers = {
  'Cache-Control': 'public, max-age=86400'
}

let manifest = ref(defaultManifest)

let $HA = null
let $SD = null

const serverUrl = ref('')
const accessToken = ref('')
const displayConfiguration = ref()
const displayConfigurationUrlOverride = ref('')

const entity = ref('')

const serviceShortPress = ref({})
const serviceLongPress = ref({})
const serviceTap = ref({})
const serviceRotation = ref({})

const rotationTickMultiplier = ref(1)
const rotationTickBucketSizeMs = ref(300)

const useCustomTitle = ref(false)
const buttonTitle = ref('{{friendly_name}}')
const useStateImagesForOnOffStates = ref(false) // determined by action ID (manifest)
const useCustomButtonLabels = ref(false)
const buttonLabels = ref('')
const enableServiceIndicator = ref(true)
const iconSettings = ref('PREFER_PLUGIN')
const availableEntityDomains = ref([])
const availableEntities = ref([])
const availableServiceDomains = ref([])
const availableServices = ref([])
const currentStates = ref([])
const haConnectionState = ref('disconnected') // disconnected, connecting, connected
const haError = ref('')

const controllerType = ref('')

onMounted(() => {
  updateManifest()

  window.connectElgatoStreamDeckSocket = (inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) => {
    $SD = new StreamDeck(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo)

    // Dual State entity (custom icons for on/off)
    const inActionInfoObject = JSON.parse(inActionInfo)

    useStateImagesForOnOffStates.value =
      inActionInfoObject['action'] === 'de.perdoctus.streamdeck.homeassistant.dual-state-entity'
    controllerType.value = inActionInfoObject.payload.controller

    $SD.on('globalsettings', (globalSettings) => {
      if (globalSettings) {
        serverUrl.value = globalSettings.serverUrl
        accessToken.value = globalSettings.accessToken

        let displayConfigurationFromSettings = globalSettings.displayConfiguration
        if (displayConfigurationFromSettings) {
          displayConfiguration.value = displayConfigurationFromSettings
          if (displayConfigurationFromSettings.urlOverride) {
            displayConfigurationUrlOverride.value = displayConfigurationFromSettings.urlOverride
          }
        }

        if (serverUrl.value && accessToken.value) {
          connectHomeAssistant()
        }
      }
    })

    $SD.on('connected', (actionInfo) => {
      $SD.requestGlobalSettings()

      let settings = Settings.parse(actionInfo.payload.settings)

      entity.value = settings['display']['entityId']
      enableServiceIndicator.value =
        settings['display']['enableServiceIndicator'] || settings['display']['enableServiceIndicator'] === undefined
      iconSettings.value = settings['display']['iconSettings']
      useCustomTitle.value = settings['display']['useCustomTitle']
      buttonTitle.value = settings['display']['buttonTitle'] || '{{friendly_name}}'
      useCustomButtonLabels.value = settings['display']['useCustomButtonLabels']
      buttonLabels.value = settings['display']['buttonLabels']
      serviceShortPress.value = settings['button']['serviceShortPress']
      serviceLongPress.value = settings['button']['serviceLongPress']
      serviceTap.value = settings['button']['serviceTap']
      serviceRotation.value = settings['button']['serviceRotation']
      rotationTickMultiplier.value = settings['rotationTickMultiplier'] || 1
      rotationTickBucketSizeMs.value = settings['rotationTickBucketSizeMs'] || 300
    })
  }
})

function updateManifest() {
  console.log('Updating manifest.')
  axios
    .get('https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/manifest.yml')
    .then((response) => (this.manifest = yaml.load(response.data)))
    .catch((error) => console.log(`Failed to download updated manifest.yml: ${error}`))
}

const isHaSettingsComplete = computed(() => {
  return serverUrl.value && accessToken.value
})

const entityAttributes = computed(() => {
  let currentEntityState = currentStates.value.find((state) => state.entityId === entity.value)
  if (currentEntityState && currentEntityState.attributes) {
    let attributes = currentEntityState.attributes.map((attribute) => `{{${attribute}}}`)
    return ['{{state}}', ...attributes]
  }
  return []
})

function connectHomeAssistant() {
  if ($HA) {
    $HA.close()
  }

  haConnectionState.value = 'connecting'

  try {
    $HA = new Homeassistant(
      serverUrl.value,
      accessToken.value,
      () => {
        haConnectionState.value = 'connected'
        $HA.getStates((states) => {
          availableEntityDomains.value = Array.from(
            states.map((state) => state.entity_id.split('.')[0]).reduce((acc, curr) => acc.add(curr), new Set())
          ).sort()

          availableEntities.value = states
            .map((state) => {
              let splittedId = state.entity_id.split('.')
              return new Entity(splittedId[0], splittedId[1], state.attributes.friendly_name || state.entity_id)
            })
            .sort((a, b) =>
              a.title.toLowerCase() > b.title.toLowerCase() ? 1 : b.title.toLowerCase() > a.title.toLowerCase() ? -1 : 0
            )

          currentStates.value = states.map((state) => {
            return {
              entityId: state.entity_id,
              attributes: ObjectUtils.paths(state.attributes)
            }
          })
        })
        $HA.getServices((services) => {
          availableServices.value = Object.entries(services).flatMap((domainServices) => {
            const domain = domainServices[0]
            return Object.entries(domainServices[1]).map((services) => {
              let serviceName = services[0]
              let serviceData = services[1]
              return new Service(
                domain,
                serviceName,
                serviceData.name,
                serviceData.description,
                serviceData.fields,
                serviceData.target
              )
            })
          })
          availableServiceDomains.value = Object.keys(services).sort()
        })
      },
      (message) => {
        haError.value = message
        haConnectionState.value = 'disconnected'
      },
      () => {
        haConnectionState.value = 'disconnected'
      }
    )
  } catch (e) {
    haError.value = e
    haConnectionState.value = 'disconnected'
  }
}

function saveGlobalSettings() {
  haError.value = ''

  let displayConfigurationsSettings = displayConfiguration.value

  // validate custom config
  if (displayConfigurationUrlOverride.value) {
    axios
      .get(displayConfigurationUrlOverride.value)
      .then()
      .catch((error) => (haError.value = `Could not read custom display configuration: ${error}`))

    displayConfigurationsSettings.urlOverride = displayConfigurationUrlOverride.value
  }

  $SD.saveGlobalSettings({
    serverUrl: serverUrl.value,
    accessToken: accessToken.value,
    displayConfiguration: displayConfigurationsSettings
  })

  connectHomeAssistant()
}

function saveSettings() {
  let settings = {
    version: 5,

    controllerType: controllerType.value,

    display: {
      entityId: entity.value,
      useCustomTitle: useCustomTitle.value,
      buttonTitle: buttonTitle.value,
      enableServiceIndicator: enableServiceIndicator.value,
      iconSettings: iconSettings.value,
      useCustomButtonLabels: useCustomButtonLabels.value,
      buttonLabels: buttonLabels.value,
      useStateImagesForOnOffStates: useStateImagesForOnOffStates.value // determined by action ID (manifest)
    },

    button: {
      serviceShortPress: serviceShortPress.value,
      serviceLongPress: serviceLongPress.value,
      serviceTap: serviceTap.value,
      serviceRotation: serviceRotation.value
    },

    rotationTickMultiplier: rotationTickMultiplier.value,
    rotationTickBucketSizeMs: rotationTickBucketSizeMs.value
  }

  $SD.saveSettings(settings)
}
</script>
