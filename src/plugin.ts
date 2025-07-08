import streamDeck, { LogLevel } from '@elgato/streamdeck'
import axios from 'axios'
import { WebSocket } from 'ws'

import { DualStateEntityAction } from '@/actions/dualStateEntityAction'
import { GenericEntityAction } from '@/actions/genericEntityAction'
import { HomeAssistant } from '@/homeassistant/homeAssistant'
import type { GlobalSettings } from '@/models/settings/globalSettings'
import { EntityConfigFactory } from '@/render/entityConfigFactoryNg'

// Set the WebSocket variable globally as the Home Assistant library expects it to be available.
const global = globalThis as never as { WebSocket?: typeof WebSocket }
global.WebSocket = WebSocket

// Set the default cache control header for all requests
axios.defaults.headers['Cache-Control'] = 'public, max-age=86400'

const homeAssistant = new HomeAssistant()
const entityConfigFactory = new EntityConfigFactory()

streamDeck.logger.setLevel(LogLevel.INFO)
streamDeck.actions.registerAction(new GenericEntityAction(homeAssistant, entityConfigFactory))
streamDeck.actions.registerAction(new DualStateEntityAction(homeAssistant, entityConfigFactory))
await streamDeck.connect()

// Reconnect to Home Assistant when the global settings are changed.
await streamDeck.settings.getGlobalSettings<GlobalSettings>().then(async (settings) => {
  // Convert the old WebSocket URL format to the new format required by the Home Assistant library.
  if (
    settings.serverUrl &&
    (settings.serverUrl.startsWith('wss://') || settings.serverUrl.startsWith('ws://'))
  ) {
    settings.serverUrl = settings.serverUrl
      .replace('ws://', 'http://')
      .replace('wss://', 'https://')
      .replace('/api/websocket', '')
    await streamDeck.settings.setGlobalSettings(settings)
  }

  if (settings.serverUrl && settings.accessToken) {
    streamDeck.logger.info('Connecting to Home Assistant...')
    await homeAssistant.connect(settings.serverUrl, settings.accessToken)
  } else {
    streamDeck.logger.info(
      'No Home Assistant server URL or access token set, not connecting to Home Assistant.'
    )
  }
  await entityConfigFactory.setDisplayConfigurationUrl(settings.displayConfiguration?.urlOverride)
})

// Reconnect when resuming from sleep.
streamDeck.system.onSystemDidWakeUp(() => {
  streamDeck.logger.info('System woke up, reconnecting to Home Assistant...')
  homeAssistant.reconnect()
})
