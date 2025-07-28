import streamDeck from '@elgato/streamdeck'

interface SettingsV1 {
  version: 1
  domain: string
  entityId: string
  useCustomTitle: boolean
  buttonTitle: string
  enableServiceIndicator: boolean
  hideIcon: boolean
  useCustomButtonLabels: boolean
  buttonLabels: string
  useStateImagesForOnOffStates: boolean
  service: {
    id: string
    data: string
  }
  serviceLongPress: {
    id: string
    data: string
  }
}

interface SettingsV2 {
  version: 2
  display: {
    domain: string
    entityId: string
    useCustomTitle: boolean
    buttonTitle: string
    enableServiceIndicator: boolean
    hideIcon: boolean
    useCustomButtonLabels: boolean
    buttonLabels: string
    useStateImagesForOnOffStates: boolean
  }
  button: {
    service: {
      domain: string
      name: string
      data: string
    }
    serviceLongPress: {
      domain: string
      name: string
      data: string
    }
  }
}

interface SettingsV3 {
  version: 3
  display: {
    domain: string
    entityId: string
    useCustomTitle: boolean
    buttonTitle: string
    enableServiceIndicator: boolean
    hideIcon: boolean
    useCustomButtonLabels: boolean
    buttonLabels: string
    useStateImagesForOnOffStates: boolean
  }
  button: {
    serviceShortPress: ActionSettings
    serviceLongPress: ActionSettings
  }
}

interface SettingsV4 {
  version: 4
  display: {
    entityId: string
    useCustomTitle: boolean
    buttonTitle: string
    enableServiceIndicator: boolean
    hideIcon: boolean | undefined
    useCustomButtonLabels: boolean
    buttonLabels: string
    useStateImagesForOnOffStates: boolean
  }
  button: {
    serviceShortPress: ActionSettings
    serviceLongPress: ActionSettings
    serviceRotation: ActionSettings
    serviceTap: ActionSettings
  }
  controllerType: string
  rotationTickMultiplier: number
  rotationTickBucketSizeMs: number
}

export type SettingsV5 = {
  version: 5
  display: {
    entityId: string
    useCustomTitle: boolean
    buttonTitle: string
    enableServiceIndicator: boolean
    useCustomButtonLabels: boolean
    buttonLabels: string
    iconSettings: IconSettings
  }
  button: {
    serviceShortPress: ActionSettings
    serviceLongPress: ActionSettings
    serviceRotation: ActionSettings
    serviceTap: ActionSettings
  }
  rotationTickMultiplier: number
  rotationTickBucketSizeMs: number
}

export type Settings = {
  version: 6
  display: {
    entityId: string
    useCustomTitle: boolean
    buttonTitle: string
    enableServiceIndicator: boolean
    useCustomButtonLabels: boolean
    buttonLabels: string
    iconSettings: IconSettings
  }
  button: {
    serviceShortPress: ActionSettings
    serviceLongPress: ActionSettings
    serviceRotation: ActionSettings
    serviceTap: ActionSettings
  }
  rotationTickMultiplier: number
  rotationTickBucketSizeMs: number
}

export type ActionSettings = {
  entityId?: Nullable<string>
  serviceId?: Nullable<string>
  serviceData?: Nullable<string>
}

export enum IconSettings {
  HIDE = 'HIDE',
  PREFER_HA = 'PREFER_HA',
  PREFER_PLUGIN = 'PREFER_PLUGIN'
}

export type LegacySettings = SettingsV1 | SettingsV2 | SettingsV3 | SettingsV4 | SettingsV5

export const latestSettingsVersion = 6

export function migrateSettings(settings: LegacySettings | Settings): Settings {
  if (settings.version === undefined || settings.version == 1) {
    const settingsV2: SettingsV2 = {
      version: 2,
      display: {
        domain: settings.domain,
        entityId: settings.entityId,
        useCustomTitle: settings.useCustomTitle,
        buttonTitle: settings.buttonTitle || '{{friendly_name}}',
        enableServiceIndicator:
          settings.enableServiceIndicator || settings.enableServiceIndicator === undefined,
        hideIcon: settings.hideIcon,
        useCustomButtonLabels: settings.useCustomButtonLabels,
        buttonLabels: settings.buttonLabels,
        useStateImagesForOnOffStates: settings.useStateImagesForOnOffStates // determined by action ID (manifest)
      },
      button: {
        service: {
          domain: '',
          name: '',
          data: ''
        },
        serviceLongPress: {
          domain: '',
          name: '',
          data: ''
        }
      }
    }

    if (settings.service) {
      settingsV2.button.service.domain = settings.domain
      settingsV2.button.service.name = settings.service.id
      settingsV2.button.service.data = settings.service.data
    }
    if (settings.serviceLongPress) {
      settingsV2.button.serviceLongPress.domain = settings.domain
      settingsV2.button.serviceLongPress.name = settings.serviceLongPress.id
      settingsV2.button.serviceLongPress.data = settings.serviceLongPress.data
    }

    return migrateSettings(settingsV2)
  }

  if (settings.version === 2) {
    const settingsV3: SettingsV3 = {
      version: 3,
      display: settings.display,
      button: {
        serviceShortPress: {
          serviceId: '',
          entityId: '',
          serviceData: ''
        },
        serviceLongPress: {
          serviceId: '',
          entityId: '',
          serviceData: ''
        }
      }
    }

    if (settings.button.service.name) {
      settingsV3.button.serviceShortPress = {
        serviceId: settings.button.service.domain + '.' + settings.button.service.name,
        entityId: settings.display.entityId,
        serviceData: settings.button.service.data
      }
    }

    if (settings.button.serviceLongPress.name) {
      settingsV3.button.serviceLongPress = {
        serviceId:
          settings.button.serviceLongPress.domain + '.' + settings.button.serviceLongPress.name,
        entityId: settings.display.entityId,
        serviceData: settings.button.serviceLongPress.data
      }
    }

    return migrateSettings(settingsV3)
  }

  if (settings.version === 3) {
    const settingsV4: SettingsV4 = {
      version: 4,
      display: {
        ...settings.display,
        entityId: `${settings.display.domain}.${settings.display.entityId}`
      },
      button: {
        serviceShortPress: {
          ...settings.button.serviceShortPress,
          entityId: `${settings.display.domain}.${settings.button.serviceShortPress.entityId}`
        },
        serviceLongPress: {
          ...settings.button.serviceLongPress,
          entityId: `${settings.display.domain}.${settings.button.serviceLongPress.entityId}`
        },
        serviceRotation: {
          serviceId: '',
          entityId: '',
          serviceData: ''
        },
        serviceTap: {
          serviceId: '',
          entityId: '',
          serviceData: ''
        }
      },
      controllerType: 'Keypad',
      rotationTickMultiplier: 1,
      rotationTickBucketSizeMs: 300
    }

    return migrateSettings(settingsV4)
  }

  if (settings.version === 4) {
    const settingsV5: SettingsV5 = {
      ...settings,
      version: 5,
      display: {
        ...settings.display,
        iconSettings: settings.display.hideIcon ? IconSettings.HIDE : IconSettings.PREFER_PLUGIN
      }
    }

    return migrateSettings(settingsV5)
  }

  if (settings.version === 5) {
    const settingsV6: Settings = {
      ...settings,
      version: 6,
      display: {
        ...settings.display,
        entityId: fixDuplicateDomain(settings.display.entityId) || ''
      },
      button: {
        serviceShortPress: {
          ...settings.button.serviceShortPress,
          entityId: fixDuplicateDomain(settings.button.serviceShortPress?.entityId)
        },
        serviceLongPress: {
          ...settings.button.serviceLongPress,
          entityId: fixDuplicateDomain(settings.button.serviceLongPress?.entityId)
        },
        serviceRotation: {
          ...settings.button.serviceRotation,
          entityId: fixDuplicateDomain(settings.button.serviceRotation?.entityId)
        },
        serviceTap: {
          ...settings.button.serviceTap,
          entityId: fixDuplicateDomain(settings.button.serviceTap?.entityId)
        }
      }
    }

    return settingsV6
  }

  return settings
}

/**
 * Fixes duplicate domains in entityId strings.
 * For example, "light.light.foobar" becomes "light.foobar".
 */
function fixDuplicateDomain(entityId?: string | null): string | undefined | null {
  if (!entityId) {
    return entityId
  }

  const parts = entityId.split('.')
  if (parts.length == 3 && parts[0] === parts[1]) {
    streamDeck.logger.warn(`Fixing duplicate domain in entityId: ${entityId}`)
    return parts[0] + '.' + parts.slice(2).join('.')
  }

  return entityId
}
