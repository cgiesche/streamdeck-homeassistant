<template>
  <div class="pi-root">
    <!-- ── Connection status bar (collapsed global settings) ──────────────── -->
    <div v-if="!globalSettingsExpanded" class="pi-connection-bar">
      <span class="pi-status-dot connected" aria-hidden="true"></span>
      <span class="pi-connection-url">{{ serverUrl }}</span>
      <button
        class="pi-btn-icon"
        type="button"
        aria-label="Edit global settings"
        @click="globalSettingsExpanded = true"
      >
        ⚙
      </button>
    </div>

    <!-- ── Global Settings ────────────────────────────────────────────────── -->
    <div v-if="globalSettingsExpanded" class="mb-3">
      <p class="pi-section-header mt-0">Global Settings</p>

      <div class="mb-3">
        <label class="pi-label" for="serverUrl">Server URL</label>
        <input id="serverUrl" v-model="serverUrl" class="pi-input" type="url" />
        <div class="pi-hint">
          Without SSL: http://localhost:8123<br />
          With SSL: https://ha.mydomain.net:8123
        </div>
      </div>

      <div class="mb-3">
        <label class="pi-label" for="accessToken">Access Token</label>
        <input
          id="accessToken"
          v-model="accessToken"
          class="pi-input"
          required
          type="password"
          autocomplete="current-password"
        />
        <div class="pi-hint">
          Create a long-lived token under your HA profile page.
          <a
            href="https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token"
            target="_blank"
            rel="noopener"
            >Documentation</a
          >
        </div>
      </div>

      <div class="mb-3">
        <label class="pi-label" for="displayConfig">Display theme</label>
        <select
          id="displayConfig"
          v-model="displayConfiguration"
          :disabled="displayConfigurationUrlOverride.length > 0"
          class="pi-select"
        >
          <option
            v-for="availableConfiguration in manifest['display-configs']"
            :key="availableConfiguration"
            :value="availableConfiguration"
          >
            {{ availableConfiguration.title }}
          </option>
        </select>

        <label for="displayConfigUrlOverride" class="pi-label mt-2">Custom theme URL</label>
        <input
          id="displayConfigUrlOverride"
          v-model="displayConfigurationUrlOverride"
          class="pi-input"
          type="url"
          placeholder="file://c:/custom.yml"
        />
        <div class="pi-hint">
          Override with a custom YAML config.
          <a
            target="_blank"
            rel="noopener"
            href="https://raw.githubusercontent.com/cgiesche/streamdeck-homeassistant/master/public/config/default-display-config.yml"
            >Example</a
          >
        </div>
      </div>

      <div v-if="haError" class="pi-alert pi-alert-danger" role="alert">
        <span style="flex: 1; font-size: 12px">{{ haError }}</span>
        <button class="pi-alert-dismiss" type="button" aria-label="Dismiss" @click="haError = ''">
          ✕
        </button>
      </div>

      <button
        :disabled="!isHaSettingsComplete || haConnectionState === 'connecting'"
        class="pi-btn pi-btn-primary pi-btn-block"
        type="button"
        @click="saveGlobalSettings"
      >
        <span
          v-if="haConnectionState === 'connecting'"
          class="pi-spinner"
          aria-hidden="true"
        ></span>
        {{ haConnectionState === 'connected' ? 'Save and reconnect' : 'Save and connect' }}
      </button>
      <button
        v-if="haConnectionState === 'connected'"
        class="pi-btn pi-btn-ghost pi-btn-block mt-2"
        type="button"
        @click="globalSettingsExpanded = false"
      >
        Close
      </button>
    </div>

    <!-- ── Tab bar + content ──────────────────────────────────────────────── -->
    <template v-if="haConnectionState === 'connected' && !globalSettingsExpanded">
      <div class="pi-tabs">
        <button
          class="pi-tab"
          :class="{ active: activeTab === 'appearance' }"
          type="button"
          @click="activeTab = 'appearance'"
        >
          Appearance
        </button>
        <button
          class="pi-tab"
          :class="{ active: activeTab === 'short_press' }"
          type="button"
          @click="activeTab = 'short_press'"
        >
          Short Press
          <span v-if="serviceShortPress.serviceId" class="pi-tab-badge"></span>
        </button>
        <button
          class="pi-tab"
          :class="{ active: activeTab === 'long_press' }"
          type="button"
          @click="activeTab = 'long_press'"
        >
          Long Press
          <span v-if="serviceLongPress.serviceId" class="pi-tab-badge"></span>
        </button>
        <template v-if="controllerType === 'Encoder'">
          <button
            class="pi-tab"
            :class="{ active: activeTab === 'screen_tap' }"
            type="button"
            @click="activeTab = 'screen_tap'"
          >
            Screen Tap
            <span v-if="serviceTap.serviceId" class="pi-tab-badge"></span>
          </button>
          <button
            class="pi-tab"
            :class="{ active: activeTab === 'rotation' }"
            type="button"
            @click="activeTab = 'rotation'"
          >
            Rotation
            <span v-if="serviceRotation.serviceId" class="pi-tab-badge"></span>
          </button>
        </template>
      </div>

      <!-- ── Appearance pane ──────────────────────────────────────────────── -->
      <div v-show="activeTab === 'appearance'">
        <label class="pi-label">Entity</label>
        <TypeaheadSelect v-model="entity" class="mb-3" :items="entityItems" placeholder="No entity selected" />

        <!-- Icon source radio group -->
        <div class="mb-3">
          <label class="pi-label">Icon source</label>
          <div class="pi-radio-group">
            <label class="pi-radio-label">
              <input v-model="iconSettings" type="radio" value="PREFER_PLUGIN" />
              Plugin
              <span class="pi-hint">Plugin icon preferred; falls back to HA entity icon.</span>
            </label>
            <label class="pi-radio-label">
              <input v-model="iconSettings" type="radio" value="PREFER_HA" />
              Home Assistant
              <span class="pi-hint">HA entity icon preferred; falls back to plugin icon.</span>
            </label>
            <label class="pi-radio-label">
              <input v-model="iconSettings" type="radio" value="HIDE" />
              Hide
            </label>
          </div>
        </div>

        <!-- Icon layout -->
        <div v-if="iconSettings !== 'HIDE'" class="mb-3">
          <label class="pi-label">Icon layout</label>
          <div class="pi-seg">
            <input id="iconLayoutStandard" v-model="iconLayout" type="radio" value="STANDARD" />
            <label for="iconLayoutStandard">Standard</label>
            <input id="iconLayoutBottom" v-model="iconLayout" type="radio" value="BOTTOM" />
            <label for="iconLayoutBottom">Bottom</label>
            <input id="iconLayoutFull" v-model="iconLayout" type="radio" value="FULL" />
            <label for="iconLayoutFull">Full</label>
          </div>
          <span class="pi-hint"
            >Standard: icon top, 2 labels below. Bottom: icon bottom, 2 labels above. Full: icon
            fills button, 4 labels overlaid.</span
          >
        </div>

        <!-- Service indicator (Keypad only) -->
        <template v-if="controllerType !== 'Encoder'">
          <PiToggleRow
            id="chkEnableServiceIndicator"
            v-model="enableServiceIndicator"
            label="Visual service indicators"
            class="mb-2"
          />
        </template>

        <!-- Custom title toggle -->
        <PiToggleRow id="chkButtonTitle" v-model="useCustomTitle" label="Custom title">
          <input
            id="buttonTitle"
            v-model="buttonTitle"
            class="pi-input mb-1"
            placeholder="{{friendly_name}}"
            type="text"
          />
          <div class="pi-hint" style="color: var(--pi-warning)">
            Clear the title in the main Stream Deck window for this template to take effect.
          </div>
          <details v-if="entityAttributes.length" class="pi-vars">
            <summary>Available variables</summary>
            <div class="pi-vars-content">
              <div v-for="attr in entityAttributes" :key="attr" class="pi-var-item">
                {{ attr }}
              </div>
            </div>
          </details>
        </PiToggleRow>

        <!-- Custom labels toggle -->
        <PiToggleRow id="chkCustomLabels" v-model="useCustomButtonLabels" label="Custom labels">
          <textarea
            id="buttonLabels"
            v-model="buttonLabels"
            class="pi-textarea mb-1"
            placeholder="Enter up to 4 lines. First two lines will overlap with the icon."
            rows="4"
          ></textarea>
          <details v-if="entityAttributes.length" class="pi-vars">
            <summary>Available variables</summary>
            <div class="pi-vars-content">
              <div v-for="attr in entityAttributes" :key="attr" class="pi-var-item">
                {{ attr }}
              </div>
            </div>
          </details>
        </PiToggleRow>

        <!-- Label font size -->
        <div class="pi-form-row">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px">
            <label class="pi-label" for="labelFontSize" style="margin: 0; flex: 1">Label font size: {{ labelFontSize }}px</label>
            <button
              v-if="labelFontSize !== 48"
              class="pi-btn-icon"
              style="font-size: 11px; padding: 2px 6px"
              title="Reset to default"
              @click="labelFontSize = 48"
            >reset</button>
          </div>
          <input
            id="labelFontSize"
            v-model.number="labelFontSize"
            type="range"
            class="pi-range"
            min="12"
            max="72"
            step="2"
          />
        </div>
      </div>

      <!-- ── Short Press pane ─────────────────────────────────────────────── -->
      <div v-show="activeTab === 'short_press'">
        <ServiceCallConfiguration
          v-model="serviceShortPress"
          :available-entities="availableEntities"
          :available-services="availableServices"
        />
      </div>

      <!-- ── Long Press pane ──────────────────────────────────────────────── -->
      <div v-show="activeTab === 'long_press'">
        <ServiceCallConfiguration
          v-model="serviceLongPress"
          :available-entities="availableEntities"
          :available-services="availableServices"
        />
      </div>

      <!-- ── Screen Tap pane (Encoder only) ───────────────────────────────── -->
      <div v-if="controllerType === 'Encoder'" v-show="activeTab === 'screen_tap'">
        <ServiceCallConfiguration
          v-model="serviceTap"
          :available-entities="availableEntities"
          :available-services="availableServices"
        />
      </div>

      <!-- ── Rotation pane (Encoder only) ─────────────────────────────────── -->
      <div v-if="controllerType === 'Encoder'" v-show="activeTab === 'rotation'">
        <ServiceCallConfiguration
          v-model="serviceRotation"
          :available-entities="availableEntities"
          :available-services="availableServices"
        />

        <details class="pi-vars mt-2 mb-3">
          <summary>Available variables</summary>
          <div class="pi-vars-content">
            <div class="pi-var-text">
              <span v-pre class="pi-var-item">{{ ticks }}</span> — ticks rotated (negative =
              left, positive = right).
            </div>
            <div class="pi-var-text">
              <span v-pre class="pi-var-item">{{ rotationPercent }}</span> — 0–100 rotation
              percentage.
            </div>
            <div class="pi-var-text">
              <span v-pre class="pi-var-item">{{ rotationAbsolute }}</span> — 0–255 absolute
              rotation value.
            </div>
          </div>
        </details>

        <label class="pi-label" for="rotationTickMultiplier">
          Tick multiplier
          <span class="pi-badge ms-1">×{{ rotationTickMultiplier }}</span>
        </label>
        <input
          id="rotationTickMultiplier"
          v-model="rotationTickMultiplier"
          class="pi-range"
          max="10"
          min="0.1"
          step="0.1"
          type="range"
        />
        <div class="pi-hint mb-3">Each dial tick is multiplied by this value.</div>

        <label class="pi-label" for="rotationTickBucketSizeMs">
          Tick bucket size
          <span class="pi-badge ms-1">{{ rotationTickBucketSizeMs }} ms</span>
        </label>
        <input
          id="rotationTickBucketSizeMs"
          v-model="rotationTickBucketSizeMs"
          class="pi-range"
          max="1000"
          min="0"
          step="50"
          type="range"
        />
        <div class="pi-hint mb-2">
          Aggregates ticks for this duration before firing the service call. Zero = one call per
          tick.
        </div>
      </div>

      <!-- ── Save button ───────────────────────────────────────────────────── -->
      <button class="pi-btn pi-btn-primary pi-btn-block mt-2" type="button" @click="saveSettings">
        Save configuration
      </button>
    </template>
  </div>
</template>

<script setup>
import defaultManifest from '../../public/config/manifest.yml'
import { StreamDeck } from '@/modules/common/streamdeck'
import { Settings, GlobalSettings } from '@/modules/common/settings'
import { Homeassistant } from '@/modules/homeassistant/homeassistant'
import { Entity } from '@/modules/pi/entity'
import { Service } from '@/modules/pi/service'
import { computed, onMounted, ref, watch } from 'vue'
import ServiceCallConfiguration from '@/components/ServiceCallConfiguration.vue'
import { ObjectUtils } from '@/modules/common/utils'
import TypeaheadSelect from '@/components/ui/TypeaheadSelect.vue'
import PiToggleRow from '@/components/ui/PiToggleRow.vue'
import axios from 'axios'
import yaml from 'js-yaml'

const manifest = ref(defaultManifest)

const globalSettingsExpanded = ref(true)
const activeTab = ref('appearance')

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
const iconLayout = ref('STANDARD')
const labelFontSize = ref(48)
const availableEntityDomains = ref([])
const availableEntities = ref([])
const entityItems = computed(() =>
  availableEntities.value.map((e) => ({ id: e.entityId, label: e.title, group: e.domain }))
)
const availableServiceDomains = ref([])
const availableServices = ref([])
const currentStates = ref([])
const haConnectionState = ref('disconnected') // disconnected, connecting, connected
const haError = ref('')

const controllerType = ref('')

onMounted(() => {
  updateManifest()

  window.connectElgatoStreamDeckSocket = (
    inPort,
    inPropertyInspectorUUID,
    inRegisterEvent,
    inInfo,
    inActionInfo
  ) => {
    $SD = new StreamDeck(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo)

    // Dual State entity (custom icons for on/off)
    const inActionInfoObject = JSON.parse(inActionInfo)

    useStateImagesForOnOffStates.value =
      inActionInfoObject['action'] === 'de.perdoctus.streamdeck.homeassistant.dual-state-entity'
    controllerType.value = inActionInfoObject.payload.controller

    $SD.on('globalsettings', (globalSettings) => {
      if (globalSettings) {
        GlobalSettings.migrate(globalSettings)
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
        settings['display']['enableServiceIndicator'] ||
        settings['display']['enableServiceIndicator'] === undefined
      iconSettings.value = settings['display']['iconSettings']
      iconLayout.value = settings['display']['iconLayout'] ?? 'STANDARD'
      labelFontSize.value = settings['display']['labelFontSize'] ?? 48
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
    .get(
      'https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/manifest.yml'
    )
    .then((response) => (manifest.value = yaml.load(response.data)))
    .catch((error) => console.log(`Failed to download updated manifest.yml: ${error}`))
}

watch(haConnectionState, (state) => {
  if (state === 'connected') globalSettingsExpanded.value = false
  if (state === 'disconnected') globalSettingsExpanded.value = true
})

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
            states
              .map((state) => state.entity_id.split('.')[0])
              .reduce((acc, curr) => acc.add(curr), new Set())
          ).sort()

          availableEntities.value = states
            .map((state) => {
              let splittedId = state.entity_id.split('.')
              return new Entity(
                splittedId[0],
                splittedId[1],
                state.attributes.friendly_name || state.entity_id
              )
            })
            .sort((a, b) =>
              a.title.toLowerCase() > b.title.toLowerCase()
                ? 1
                : b.title.toLowerCase() > a.title.toLowerCase()
                  ? -1
                  : 0
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
              return new Service(domain, serviceName, serviceData.fields, serviceData.target)
            })
          })
          availableServices.value.push(
            new Service(
              'streamdeck',
              'open_url',
              {
                url: {
                  description: 'The URL to open (http, https, or any OS-registered protocol)',
                  example: 'https://example.com',
                  required: true
                }
              },
              null
            )
          )
          availableServiceDomains.value = ['streamdeck', ...Object.keys(services).sort()]
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

async function saveGlobalSettings() {
  haError.value = ''

  let displayConfigurationsSettings = { ...displayConfiguration.value }

  if (displayConfigurationUrlOverride.value) {
    try {
      await axios.get(displayConfigurationUrlOverride.value)
    } catch (error) {
      haError.value = `Could not read custom display configuration: ${error}`
      return
    }
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
    version: 7,

    controllerType: controllerType.value,

    display: {
      entityId: entity.value,
      useCustomTitle: useCustomTitle.value,
      buttonTitle: buttonTitle.value,
      enableServiceIndicator: enableServiceIndicator.value,
      iconSettings: iconSettings.value,
      iconLayout: iconLayout.value,
      labelFontSize: labelFontSize.value,
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
