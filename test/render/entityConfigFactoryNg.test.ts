import axios from 'axios'
import { expect, it, vi } from 'vitest'

import { IconSettings } from '@/models/settings/settings'
import { EntityConfigFactory } from '@/render/entityConfigFactoryNg'

import { buildTestEntity, buildTestSettings } from '../testUtils'

vi.mock('axios')

it('test prefer plugin icon', () => {
  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.iconSettings = IconSettings.PREFER_PLUGIN

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.icon).toBe('mdi:lightbulb')
})

it('test prefer home assistant icon', () => {
  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.iconSettings = IconSettings.PREFER_HA

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.icon).toBe('mdi:floor-lamp')
})

it('test prefer home assistant icon with no entity icon', () => {
  const entity = buildTestEntity()
  entity.attributes.icon = undefined
  const settings = buildTestSettings()
  settings.display.iconSettings = IconSettings.PREFER_HA

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.icon).toBe('mdi:lightbulb')
})

it('test hide icon', () => {
  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.iconSettings = IconSettings.HIDE

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.icon).toBe(null)
})

it('test single action indicator', () => {
  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.enableServiceIndicator = true
  settings.button.serviceShortPress.serviceId = 'light.turn_on'

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.isAction).toBe(true)
  expect(renderConfig.isMultiAction).toBe(false)
})

it('test multi action indicator', () => {
  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.enableServiceIndicator = true
  settings.button.serviceShortPress.serviceId = 'light.turn_on'
  settings.button.serviceLongPress.serviceId = 'light.turn_on'

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.isAction).toBe(true)
  expect(renderConfig.isMultiAction).toBe(true)
})

it('test parse attribute color', () => {
  const entity = buildTestEntity()
  entity.attributes.rgb_color = [217, 52, 13]
  const settings = buildTestSettings()

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.color).toBe('#d9340d')
})

it('test parse no attribute color', () => {
  const entity = buildTestEntity()
  entity.attributes.rgb_color = undefined
  const settings = buildTestSettings()

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.color).toBe('#888888')
})

it('test custom button labels', () => {
  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.useCustomButtonLabels = true
  settings.display.buttonLabels = 'test1\ntest2\ntest3'

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.labelTemplates).toStrictEqual(['test1', 'test2', 'test3'])
})

it('test custom title', () => {
  const entity = buildTestEntity()
  entity.state = 'On'
  const settings = buildTestSettings()
  settings.display.useCustomTitle = true
  settings.display.buttonTitle = 'State: {{ state }}'

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.customTitle).toBe('State: On')
})

it('test entity with device class', () => {
  const entity = buildTestEntity()
  entity.entity_id = 'binary_sensor.my_test_plug'
  entity.attributes.device_class = 'plug'
  const settings = buildTestSettings()

  const renderConfig = new EntityConfigFactory().buildRenderConfig(entity, settings)
  expect(renderConfig.icon).toBe('mdi:power-plug-off-outline')
})

it('test setting custom display configuration', async () => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(axios.get).mockResolvedValue({
    data: `
light:
  icon: mdi:string-lights`
  })

  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.iconSettings = IconSettings.PREFER_PLUGIN

  const entityConfigFactory = new EntityConfigFactory()
  await entityConfigFactory.setDisplayConfigurationUrl('https://localhost/random-fake-url')

  const renderConfig = entityConfigFactory.buildRenderConfig(entity, settings)
  expect(renderConfig.icon).toBe('mdi:string-lights')
})

it('test setting bad custom display configuration', async () => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(axios.get).mockResolvedValue({
    data: '!@#$% BAD YAML DATA'
  })

  const entity = buildTestEntity()
  const settings = buildTestSettings()
  settings.display.iconSettings = IconSettings.PREFER_PLUGIN

  const entityConfigFactory = new EntityConfigFactory()
  await entityConfigFactory.setDisplayConfigurationUrl('https://localhost/random-fake-url')

  const renderConfig = entityConfigFactory.buildRenderConfig(entity, settings)
  expect(renderConfig.icon).toBe('mdi:lightbulb')
})
