import { expect, it } from 'vitest'

import { IconSettings, type LegacySettings, migrateSettings } from '@/models/settings/settings'

it('test settings v1 migration', () => {
  const settingsV1: LegacySettings = {
    version: 1,
    domain: 'switch',
    entityId: 'my_test_switch',
    useCustomTitle: true,
    buttonTitle: 'My Switch',
    enableServiceIndicator: true,
    hideIcon: true,
    useCustomButtonLabels: true,
    buttonLabels: 'On/Off',
    useStateImagesForOnOffStates: true,
    service: {
      id: 'turn_on',
      data: "{ data: 'on' }"
    },
    serviceLongPress: {
      id: 'turn_off',
      data: "{ data: 'off' }"
    }
  }

  const migratedSettings = migrateSettings(settingsV1)
  expect(migratedSettings.version).toBe(5)
  expect(migratedSettings.display.entityId).toBe(`${settingsV1.domain}.${settingsV1.entityId}`)
  expect(migratedSettings.display.useCustomTitle).toBe(settingsV1.useCustomTitle)
  expect(migratedSettings.display.buttonTitle).toBe(settingsV1.buttonTitle)
  expect(migratedSettings.display.enableServiceIndicator).toBe(settingsV1.enableServiceIndicator)
  expect(migratedSettings.display.iconSettings).toBe(IconSettings.HIDE)
  expect(migratedSettings.display.useCustomButtonLabels).toBe(settingsV1.useCustomButtonLabels)
  expect(migratedSettings.display.buttonLabels).toBe(settingsV1.buttonLabels)
  expect(migratedSettings.button.serviceShortPress.serviceId).toBe(
    `${settingsV1.domain}.${settingsV1.service.id}`
  )
  expect(migratedSettings.button.serviceShortPress.entityId).toBe(
    `${settingsV1.domain}.${settingsV1.entityId}`
  )
  expect(migratedSettings.button.serviceShortPress.serviceData).toBe(settingsV1.service.data)
  expect(migratedSettings.button.serviceLongPress.serviceId).toBe(
    `${settingsV1.domain}.${settingsV1.serviceLongPress.id}`
  )
  expect(migratedSettings.button.serviceLongPress.entityId).toBe(
    `${settingsV1.domain}.${settingsV1.entityId}`
  )
  expect(migratedSettings.button.serviceLongPress.serviceData).toBe(
    settingsV1.serviceLongPress.data
  )
})

it('test settings v4 migration', () => {
  const settingsV4: LegacySettings = {
    version: 4,
    display: {
      entityId: 'test.entity_id',
      useCustomTitle: false,
      buttonTitle: 'My Test Entity',
      enableServiceIndicator: false,
      hideIcon: false,
      useCustomButtonLabels: false,
      buttonLabels: 'My Button Label',
      useStateImagesForOnOffStates: false
    },
    button: {
      serviceShortPress: {
        entityId: 'test.short_press_entity_id',
        serviceId: 'test.short_press_service_id',
        serviceData: "{ data: 'short_press' }"
      },
      serviceLongPress: {
        entityId: 'test.long_press_entity_id',
        serviceId: 'test.long_press_service_id',
        serviceData: "{ data: 'long_press' }"
      },
      serviceRotation: {
        entityId: 'test.rotation_entity_id',
        serviceId: 'test.rotation_service_id',
        serviceData: "{ data: 'rotation' }"
      },
      serviceTap: {
        entityId: 'test.tap_entity_id',
        serviceId: 'test.tap_service_id',
        serviceData: "{ data: 'tap' }"
      }
    },
    controllerType: 'Encoder',
    rotationTickMultiplier: 12,
    rotationTickBucketSizeMs: 570
  }

  const migratedSettings = migrateSettings(settingsV4)
  expect(migratedSettings.version).toBe(5)
  expect(migratedSettings.display.entityId).toBe(settingsV4.display.entityId)
  expect(migratedSettings.display.useCustomTitle).toBe(settingsV4.display.useCustomTitle)
  expect(migratedSettings.display.buttonTitle).toBe(settingsV4.display.buttonTitle)
  expect(migratedSettings.display.enableServiceIndicator).toBe(
    settingsV4.display.enableServiceIndicator
  )
  expect(migratedSettings.display.iconSettings).toBe(IconSettings.PREFER_PLUGIN)
  expect(migratedSettings.display.useCustomButtonLabels).toBe(
    settingsV4.display.useCustomButtonLabels
  )
  expect(migratedSettings.display.buttonLabels).toBe(settingsV4.display.buttonLabels)
  expect(migratedSettings.button.serviceShortPress.serviceId).toBe(
    settingsV4.button.serviceShortPress.serviceId
  )
  expect(migratedSettings.button.serviceShortPress.entityId).toBe(
    settingsV4.button.serviceShortPress.entityId
  )
  expect(migratedSettings.button.serviceShortPress.serviceData).toBe(
    settingsV4.button.serviceShortPress.serviceData
  )
  expect(migratedSettings.button.serviceLongPress.serviceId).toBe(
    settingsV4.button.serviceLongPress.serviceId
  )
  expect(migratedSettings.button.serviceLongPress.entityId).toBe(
    settingsV4.button.serviceLongPress.entityId
  )
  expect(migratedSettings.button.serviceLongPress.serviceData).toBe(
    settingsV4.button.serviceLongPress.serviceData
  )
  expect(migratedSettings.button.serviceRotation.serviceId).toBe(
    settingsV4.button.serviceRotation.serviceId
  )
  expect(migratedSettings.button.serviceRotation.entityId).toBe(
    settingsV4.button.serviceRotation.entityId
  )
  expect(migratedSettings.button.serviceRotation.serviceData).toBe(
    settingsV4.button.serviceRotation.serviceData
  )
  expect(migratedSettings.button.serviceTap.serviceId).toBe(settingsV4.button.serviceTap.serviceId)
  expect(migratedSettings.button.serviceTap.entityId).toBe(settingsV4.button.serviceTap.entityId)
  expect(migratedSettings.button.serviceTap.serviceData).toBe(
    settingsV4.button.serviceTap.serviceData
  )
  expect(migratedSettings.rotationTickMultiplier).toBe(settingsV4.rotationTickMultiplier)
  expect(migratedSettings.rotationTickBucketSizeMs).toBe(settingsV4.rotationTickBucketSizeMs)
})
