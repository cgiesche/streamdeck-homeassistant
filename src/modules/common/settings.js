import { trimBlankLabelLines } from './labelLines.js'

export const CURRENT_VERSION = 9
export const DEFAULT_LABEL_FONT_SIZE = 48

function migrateV1(s) {
  const v2 = {
    version: 2,
    display: {
      domain: s['domain'],
      entityId: s['entityId'],
      useCustomTitle: s['useCustomTitle'],
      buttonTitle: s['buttonTitle'] || '{{friendly_name}}',
      enableServiceIndicator: s['enableServiceIndicator'] !== false,
      hideIcon: s['hideIcon'],
      useCustomButtonLabels: s['useCustomButtonLabels'],
      buttonLabels: s['buttonLabels'],
      useStateImagesForOnOffStates: s['useStateImagesForOnOffStates']
    },
    button: {
      service: { domain: '', name: '', data: '' },
      serviceLongPress: { domain: '', name: '', data: '' }
    }
  }
  if (s['service']) {
    v2.button.service.domain = s['domain']
    v2.button.service.name = s['service'].id
    v2.button.service.data = s['service'].data
  }
  if (s['serviceLongPress']) {
    v2.button.serviceLongPress.domain = s['domain']
    v2.button.serviceLongPress.name = s['serviceLongPress'].id
    v2.button.serviceLongPress.data = s['serviceLongPress'].data
  }
  return v2
}

function migrateV2(s) {
  const v3 = { ...s, version: 3 }
  v3.button.serviceShortPress = s.button.service.name
    ? { serviceId: `${s.button.service.domain}.${s.button.service.name}`, entityId: s.display.entityId, serviceData: s.button.service.data }
    : { serviceId: '', entityId: '', serviceData: '' }
  v3.button.serviceLongPress = s.button.serviceLongPress.name
    ? { serviceId: `${s.button.serviceLongPress.domain}.${s.button.serviceLongPress.name}`, entityId: s.display.entityId, serviceData: s.button.serviceLongPress.data }
    : { serviceId: '', entityId: '', serviceData: '' }
  delete v3.button.service
  return v3
}

function migrateV3(s) {
  const v4 = { ...s, version: 4 }
  v4.button.serviceRotation = { serviceId: '', entityId: '', serviceData: '' }
  v4.button.serviceTap = { serviceId: '', entityId: '', serviceData: '' }
  v4.controllerType = 'Keypad'
  v4.rotationTickMultiplier = 1
  v4.rotationTickBucketSizeMs = 300
  return v4
}

function migrateV4(s) {
  const v5 = { ...s, display: { ...s.display }, version: 5 }
  v5.display.iconSettings = v5.display.hideIcon ? 'HIDE' : 'PREFER_PLUGIN'
  delete v5.display.hideIcon
  return v5
}

function migrateV5(s) {
  const v6 = { ...s, display: { ...s.display }, version: 6 }
  v6.display.iconLayout = 'STANDARD'
  if (v6.display.buttonLabels) {
    const lines = trimBlankLabelLines(v6.display.buttonLabels.split('\n'), 2)
    v6.display.buttonLabels = lines.join('\n')
  }
  return v6
}

function migrateV6(s) {
  const v7 = { ...s, display: { ...s.display }, version: 7 }
  v7.display.labelFontSize = DEFAULT_LABEL_FONT_SIZE
  return v7
}

function migrateV7(s) {
  const v8 = { ...s, display: { ...s.display }, version: 8 }
  v8.display.backgroundColor = ''
  v8.display.backgroundColorEnd = ''
  return v8
}

function migrateV8(s) {
  const v9 = { ...s, display: { ...s.display }, version: 9 }
  // Per-dial (Encoder) progress-bar overrides. Empty/false means "use the theme
  // default", so existing dials are unchanged.
  v9.display.useCustomIndicator = false
  v9.display.customIndicator = ''
  v9.display.feedbackLayoutOverride = ''
  return v9
}

const MIGRATIONS = {
  1: migrateV1,
  2: migrateV2,
  3: migrateV3,
  4: migrateV4,
  5: migrateV5,
  6: migrateV6,
  7: migrateV7,
  8: migrateV8
}

export class Settings {
  // Pure: never mutates the passed-in settings object.
  static parse(settings) {
    // JSON round-trip instead of structuredClone: settings always originate
    // from JSON, and the Stream Deck runtime's Chromium may predate
    // structuredClone (Chrome 98).
    let current = settings ? JSON.parse(JSON.stringify(settings)) : {}
    if (!current.version) current.version = 1
    while (current.version < CURRENT_VERSION) {
      const migrate = MIGRATIONS[current.version]
      if (!migrate) break
      current = migrate(current)
    }
    if (current.display) {
      // Normalize so consumers can rely on a plain boolean
      // (legacy settings stored undefined for "enabled").
      current.display.enableServiceIndicator = current.display.enableServiceIndicator !== false
    }
    return current
  }
}

export class GlobalSettings {
  // Pure: returns a new object, never mutates the input.
  static migrate(globalSettings) {
    if (!globalSettings?.serverUrl) return globalSettings
    return {
      ...globalSettings,
      serverUrl: globalSettings.serverUrl
        .replace(/^ws:\/\//, 'http://')
        .replace(/^wss:\/\//, 'https://')
        .replace(/\/api\/websocket$/, '')
    }
  }
}
