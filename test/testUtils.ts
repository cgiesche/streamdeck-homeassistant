import type { HassEntity } from 'home-assistant-js-websocket'

import { IconSettings, type Settings } from '@/models/settings/settings'

export function buildTestEntity(): HassEntity {
  return {
    attributes: {
      icon: 'mdi:floor-lamp'
    },
    context: {
      id: '',
      user_id: null,
      parent_id: null
    },
    entity_id: 'light.my_test_light',
    last_changed: '',
    last_updated: '',
    state: 'off'
  }
}

export function buildTestSettings(): Settings {
  return {
    button: {
      serviceLongPress: {},
      serviceRotation: {},
      serviceShortPress: {},
      serviceTap: {}
    },
    display: {
      buttonLabels: '',
      buttonTitle: '',
      enableServiceIndicator: false,
      entityId: '',
      iconSettings: IconSettings.PREFER_PLUGIN,
      useCustomButtonLabels: false,
      useCustomTitle: false
    },
    rotationTickBucketSizeMs: 0,
    rotationTickMultiplier: 0,
    version: 5
  }
}
