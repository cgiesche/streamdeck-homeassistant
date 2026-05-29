const CURRENT_VERSION = 7

function migrateV1(s) {
  const v2 = {
    version: 2,
    display: {
      domain: s['domain'],
      entityId: s['entityId'],
      useCustomTitle: s['useCustomTitle'],
      buttonTitle: s['buttonTitle'] || '{{friendly_name}}',
      enableServiceIndicator: s['enableServiceIndicator'] || s['enableServiceIndicator'] === undefined,
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
    v6.display.buttonLabels = v6.display.buttonLabels
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n')
  }
  return v6
}

function migrateV6(s) {
  const v7 = { ...s, display: { ...s.display }, version: 7 }
  v7.display.labelFontSize = 48
  return v7
}

const MIGRATIONS = {
  1: migrateV1,
  2: migrateV2,
  3: migrateV3,
  4: migrateV4,
  5: migrateV5,
  6: migrateV6
}

export class Settings {
  static parse(settings) {
    if (!settings.version) settings.version = 1
    let current = settings
    while (current.version < CURRENT_VERSION) {
      const migrate = MIGRATIONS[current.version]
      if (!migrate) break
      current = migrate(current)
    }
    return current
  }
}

export class GlobalSettings {
  static migrate(globalSettings) {
    if (!globalSettings?.serverUrl) return globalSettings
    globalSettings.serverUrl = globalSettings.serverUrl
      .replace(/^ws:\/\//, 'http://')
      .replace(/^wss:\/\//, 'https://')
      .replace(/\/api\/websocket$/, '')
    return globalSettings
  }
}
