interface SettingsV1 {
  version: 1 | null
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
    serviceShortPress: {
      serviceId: string
      entityId: string
      serviceData: string
    }
    serviceLongPress: {
      serviceId: string
      entityId: string
      serviceData: string
    }
  }
}

interface SettingsV4 {
  version: 4
  display: {
    domain: string
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
    serviceShortPress: {
      serviceId: string
      entityId: string
      serviceData: string
    }
    serviceLongPress: {
      serviceId: string
      entityId: string
      serviceData: string
    }
    serviceRotation: {
      serviceId: string
      entityId: string
      serviceData: string
    }
    serviceTap: {
      serviceId: string
      entityId: string
      serviceData: string
    }
  }
  controllerType: string
  rotationTickMultiplier: number
  rotationTickBucketSizeMs: number
}

export interface SettingsV5 {
  version: 5
  display: {
    domain: string
    entityId: string
    useCustomTitle: boolean
    buttonTitle: string
    enableServiceIndicator: boolean
    useCustomButtonLabels: boolean
    buttonLabels: string
    useStateImagesForOnOffStates: boolean
    iconSettings: string
  }
  button: {
    serviceShortPress: {
      serviceId: string
      entityId: string
      serviceData: string
    }
    serviceLongPress: {
      serviceId: string
      entityId: string
      serviceData: string
    }
    serviceRotation: {
      serviceId: string
      entityId: string
      serviceData: string
    }
    serviceTap: {
      serviceId: string
      entityId: string
      serviceData: string
    }
  }
  controllerType: string
  rotationTickMultiplier: number
  rotationTickBucketSizeMs: number
}

export type SettingsType = SettingsV1 | SettingsV2 | SettingsV3 | SettingsV4 | SettingsV5

export class Settings {
  static parse(settings: SettingsType): SettingsV5 {
    console.log(`Parsing version ${settings.version} settings: ${JSON.stringify(settings)}`)

    if (!settings.version || settings.version === 1) {
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

      return this.parse(settingsV2)
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

      return this.parse(settingsV3)
    }

    if (settings.version === 3) {
      const settingsV4: SettingsV4 = {
        ...settings,
        version: 4,
        button: {
          ...settings.button,
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

      return this.parse(settingsV4)
    }

    if (settings.version === 4) {
      delete settings.display.hideIcon
      const settingsV5: SettingsV5 = {
        ...settings,
        version: 5,
        display: {
          ...settings.display,
          iconSettings: settings.display.hideIcon ? 'HIDE' : 'PREFER_PLUGIN'
        }
      }

      return this.parse(settingsV5)
    }

    if (settings.version === 5) {
      return settings
    } else {
      throw new Error(`Unsupported settings version: ${settings.version}`)
    }
  }
}
