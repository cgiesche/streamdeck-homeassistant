<template>
  <div class="container-fluid">
    <h1>Global Settings</h1>
    <div class="clearfix mb-3">
      <div class="mb-3">
        <label class="form-label" for="serverUrl">Server URL</label>
        <input id="serverUrl" v-model="serverUrl" class="form-control form-control-sm" type="url" />
        <div class="form-text"><strong>Without SSL</strong> http://localhost:8123</div>
        <div class="form-text">
          <strong>With SSL</strong> https://ha.mydomain.net:8123<br />(requires a trusted certificate)
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
        :disabled="!isHaSettingsComplete || haConnectionState === ConnectionState.CONNECTING"
        class="btn btn-sm btn-primary float-end"
        v-on:click="saveGlobalSettings"
      >
        <span
          v-if="haConnectionState === ConnectionState.CONNECTING"
          aria-hidden="true"
          class="spinner-border spinner-border-sm"
          role="status"
        />
        <span>{{ haConnectionState === ConnectionState.CONNECTED ? 'Save and reconnect' : 'Save and connect' }}</span>
      </button>
    </div>

    <!-- ======================================================================================================= -->

    <div v-if="haConnectionState === ConnectionState.CONNECTED" class="clearfix mb-3">
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

      <template v-if="controllerType !== ControllerType.ENCODER">
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
          <input
            class="form-check-input"
            type="radio"
            id="radioPlugin"
            :value="IconSettings.PREFER_PLUGIN"
            v-model="iconSettings"
          />
          <label class="form-check-label" for="radioPlugin"> Prefer icon from plugin (recommended) </label>
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="radio"
            id="radioHomeAssistant"
            :value="IconSettings.PREFER_HA"
            v-model="iconSettings"
          />
          <label class="form-check-label" for="radioHomeAssistant"> Prefer icon from HA </label>
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="radio"
            id="radioHide"
            :value="IconSettings.HIDE"
            v-model="iconSettings"
          />
          <label class="form-check-label" for="radioHide"> Hide icon </label>
        </div>
      </div>

      <h1>{{ controllerType }} actions</h1>

      <AccordionComponent id="presses" class="mb-2">
        <AccordionItem accordion-id="presses" item-id="shortPress" title="Short Press">
          <ServiceCallConfiguration
            v-model="serviceShortPress"
            :available-entities="availableEntities"
            :available-services="availableServices"
            class="mb-2"
          />
        </AccordionItem>

        <AccordionItem accordion-id="presses" item-id="longPress" title="Long Press">
          <ServiceCallConfiguration
            v-model="serviceLongPress"
            :available-entities="availableEntities"
            :available-services="availableServices"
            class="mb-2"
          />
        </AccordionItem>

        <template v-if="controllerType === ControllerType.ENCODER">
          <AccordionItem accordion-id="presses" item-id="touch" title="Screen tap">
            <ServiceCallConfiguration
              v-model="serviceTap"
              :available-entities="availableEntities"
              :available-services="availableServices"
              class="mb-2"
            />
          </AccordionItem>

          <AccordionItem accordion-id="presses" item-id="dialRotate" title="Rotation">
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
          </AccordionItem>
        </template>
      </AccordionComponent>

      <button class="btn btn-sm btn-primary float-end" v-on:click="saveSettings">Save configuration</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import axios from 'axios'
import {
  ERR_CANNOT_CONNECT,
  ERR_CONNECTION_LOST,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
  ERR_INVALID_AUTH_CALLBACK,
  ERR_INVALID_HTTPS_TO_HTTP
} from 'home-assistant-js-websocket'
import { load as yamlLoad } from 'js-yaml'
import { type Ref, computed, onMounted, ref, watch } from 'vue'

import type { Entity } from '@/models/entity.ts'
import type { SendToPluginEventData } from '@/models/events/sendToPluginEvents.ts'
import type { SendToPropertyInspectorEvent } from '@/models/events/sendToPropertyInspectorEvents.ts'
import type { Service } from '@/models/service.ts'
import type { GlobalSettings } from '@/models/settings/globalSettings.ts'
import { type ActionSettings, IconSettings, type Settings } from '@/models/settings/settings.ts'
import AccordionComponent from '@/view/components/accordion/BootstrapAccordion.vue'
import AccordionItem from '@/view/components/accordion/BootstrapAccordionItem.vue'
import EntitySelection from '@/view/components/EntitySelection.vue'
import ServiceCallConfiguration from '@/view/components/ServiceCallConfiguration.vue'

// @ts-expect-error ts-checker doesn't understand yaml imports
import defaultManifest from '../../../public/config/manifest.yml'

axios.defaults.headers['Cache-Control'] = 'public, max-age=86400'

const manifest = ref(defaultManifest)

const { streamDeckClient } = window.SDPIComponents

const serverUrl = ref('')
const accessToken = ref('')
const displayConfiguration = ref()
const displayConfigurationUrlOverride = ref('')

const entity = ref('')
const entityAttributes = ref([''])

const serviceShortPress: Ref<ActionSettings> = ref({})
const serviceLongPress: Ref<ActionSettings> = ref({})
const serviceTap: Ref<ActionSettings> = ref({})
const serviceRotation: Ref<ActionSettings> = ref({})

const rotationTickMultiplier = ref(1)
const rotationTickBucketSizeMs = ref(300)

const useCustomTitle = ref(false)
const buttonTitle = ref('{{friendly_name}}')
const useCustomButtonLabels = ref(false)
const buttonLabels = ref('')
const enableServiceIndicator = ref(true)
const iconSettings = ref(IconSettings.PREFER_PLUGIN)
const availableEntities = ref(new Array<Entity>())
const availableServices = ref(new Array<Service>())

enum ConnectionState {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected'
}
const haConnectionState = ref(ConnectionState.DISCONNECTED)
const haError = ref('')

enum ControllerType {
  KEYPAD = 'Keypad',
  ENCODER = 'Encoder'
}
const controllerType = ref(ControllerType.KEYPAD)

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Window {
    SDPIComponents: {
      streamDeckClient: {
        getConnectionInfo: () => Promise<{ actionInfo: { action: string; payload: { controller: ControllerType } } }>
        getGlobalSettings: () => Promise<GlobalSettings>
        setGlobalSettings: (settings: GlobalSettings) => Promise<void>
        getSettings: () => Promise<{ settings: Settings }>
        setSettings: (settings: Settings) => Promise<void>
        send: (action: string, payload: SendToPluginEventData) => Promise<void>
        sendToPropertyInspector: {
          subscribe: (callback: (event: SendToPropertyInspectorEvent) => void) => void
        }
      }
    }
  }
}

onMounted(async () => {
  const connectionInfo = await streamDeckClient.getConnectionInfo()
  controllerType.value = connectionInfo.actionInfo.payload.controller

  await updateManifest()
  await loadGlobalSettings()
  await loadSettings()

  streamDeckClient.sendToPropertyInspector.subscribe(handlePluginEvents)
  await streamDeckClient.send('sendToPlugin', { event: 'getConnectionState' })
})

watch(entity, async (newValue, _) => {
  await streamDeckClient.send('sendToPlugin', { event: 'getEntityAttributes', entityId: newValue })
})

async function updateManifest() {
  try {
    const response = await axios.get<string>(
      'https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/manifest.yml'
    )
    manifest.value = yamlLoad(response.data)
  } catch (error) {
    console.log(`Failed to download updated manifest.yml: ${error}`)
  }
}

const isHaSettingsComplete = computed(() => {
  return serverUrl.value && accessToken.value
})

async function saveGlobalSettings() {
  haError.value = ''

  // validate custom config
  if (displayConfigurationUrlOverride.value) {
    try {
      await axios.get(displayConfigurationUrlOverride.value)
      displayConfiguration.value.urlOverride = displayConfigurationUrlOverride.value
    } catch (error) {
      haError.value = `Could not read custom display configuration: ${error}`
    }
  }

  await streamDeckClient.setGlobalSettings({
    serverUrl: serverUrl.value,
    accessToken: accessToken.value,
    displayConfiguration: displayConfiguration.value
  })

  haConnectionState.value = ConnectionState.CONNECTING
  await streamDeckClient.send('sendToPlugin', {
    event: 'reconnect',
    serverUrl: serverUrl.value,
    accessToken: accessToken.value,
    customDisplayConfigurationUrl: displayConfigurationUrlOverride.value
  })
}

async function loadGlobalSettings() {
  const globalSettings = await streamDeckClient.getGlobalSettings()
  serverUrl.value = globalSettings.serverUrl
  accessToken.value = globalSettings.accessToken

  displayConfiguration.value = globalSettings.displayConfiguration
  displayConfigurationUrlOverride.value = globalSettings.displayConfiguration?.urlOverride ?? ''
}

async function loadSettings() {
  const settings = (await streamDeckClient.getSettings()).settings

  entity.value = settings.display?.entityId ?? ''
  enableServiceIndicator.value = settings.display?.enableServiceIndicator ?? true
  iconSettings.value = settings.display?.iconSettings ?? IconSettings.PREFER_PLUGIN
  useCustomTitle.value = settings.display?.useCustomTitle ?? false
  buttonTitle.value = settings.display?.buttonTitle || '{{friendly_name}}'
  useCustomButtonLabels.value = settings.display?.useCustomButtonLabels ?? false
  buttonLabels.value = settings.display?.buttonLabels ?? ''
  serviceShortPress.value = settings.button?.serviceShortPress ?? {}
  serviceLongPress.value = settings.button?.serviceLongPress ?? {}
  serviceTap.value = settings.button?.serviceTap ?? {}
  serviceRotation.value = settings.button?.serviceRotation ?? {}
  rotationTickMultiplier.value = settings.rotationTickMultiplier ?? 1
  rotationTickBucketSizeMs.value = settings.rotationTickBucketSizeMs ?? 300
}

async function saveSettings() {
  const settings: Settings = {
    version: 5,

    display: {
      entityId: entity.value,
      useCustomTitle: useCustomTitle.value,
      buttonTitle: buttonTitle.value,
      enableServiceIndicator: enableServiceIndicator.value,
      iconSettings: iconSettings.value,
      useCustomButtonLabels: useCustomButtonLabels.value,
      buttonLabels: buttonLabels.value
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

  await streamDeckClient.setSettings(settings)
}

function populateHomeAssistantData() {
  if (haConnectionState.value !== ConnectionState.CONNECTED) return
  streamDeckClient.send('sendToPlugin', { event: 'getEntities' })
  streamDeckClient.send('sendToPlugin', { event: 'getEntityAttributes', entityId: entity.value })
  streamDeckClient.send('sendToPlugin', { event: 'getServices' })
}

function setConnectionErrorMessage(error: number) {
  const errorMessages = new Map<number, string>([
    [ERR_CANNOT_CONNECT, 'Could not connect to server'],
    [ERR_INVALID_AUTH, 'Invalid credentials'],
    [ERR_CONNECTION_LOST, 'Connection lost'],
    [ERR_HASS_HOST_REQUIRED, 'Invalid or missing server URL'],
    [ERR_INVALID_HTTPS_TO_HTTP, 'Server HTTPS to HTTP error'],
    [ERR_INVALID_AUTH_CALLBACK, 'Invalid auth callback']
  ])
  haError.value = errorMessages.get(error) || 'Unknown error'
}

function handlePluginEvents(event: SendToPropertyInspectorEvent) {
  if (event.payload.event === 'connectionState') {
    haConnectionState.value = event.payload.connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED
    if (event.payload.error != 0) {
      setConnectionErrorMessage(event.payload.error)
    }
    populateHomeAssistantData()
  } else if (event.payload.event === 'getEntities') {
    availableEntities.value = event.payload.entities.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    )
  } else if (event.payload.event == 'getEntityAttributes') {
    entityAttributes.value = ['{{state}}', ...event.payload.attributes.map((attr) => `{{${attr}}}`)]
  } else if (event.payload.event == 'getServices') {
    availableServices.value = event.payload.services
  }
}
</script>
