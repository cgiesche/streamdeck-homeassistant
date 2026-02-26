/* eslint-disable @typescript-eslint/unbound-method */
import { exec } from 'node:child_process'

import { type DialAction, type KeyAction, type KeyDownEvent, streamDeck } from '@elgato/streamdeck'
import { beforeEach, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { GenericEntityAction } from '@/actions/genericEntityAction'
import { HomeAssistant } from '@/homeassistant/homeAssistant'
import type { Settings } from '@/models/settings/settings'
import { EntityConfigFactory } from '@/render/entityConfigFactoryNg'

import { buildTestEntity, buildTestSettings } from '../testUtils'

vi.mock('node:child_process', () => ({
  exec: vi.fn((_cmd: string, callback: (error: Error | null) => void) => {
    callback(null)
    return {}
  })
}))

vi.mock('@elgato/streamdeck', async (importOriginal) => {
  const mod: { streamDeck: { logger: object } } = await importOriginal()
  return {
    ...mod,
    streamDeck: {
      logger: mod.streamDeck.logger,
      actions: {
        getActionById: vi.fn()
      },
      system: {
        openUrl: vi.fn()
      }
    }
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

it('test updating keypad display image', async () => {
  const mockAction = mock<KeyAction>()
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  const configFactory = new EntityConfigFactory()
  const action = new GenericEntityAction(homeAssistant, configFactory)

  const settings = buildTestSettings()
  const entity = buildTestEntity()

  await action.updateDisplay(settings, 'myAction', entity)
  expect(mockAction.setImage).toHaveBeenCalledTimes(1)
})

it('test updating keypad display title', async () => {
  const mockAction = mock<KeyAction>()
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  const configFactory = new EntityConfigFactory()
  const action = new GenericEntityAction(homeAssistant, configFactory)

  const settings = buildTestSettings()
  const entity = buildTestEntity()

  settings.display.useCustomTitle = false
  settings.display.buttonTitle = 'My Custom Title'
  await action.updateDisplay(settings, 'myAction', entity)
  expect(mockAction.setTitle).toHaveBeenCalledTimes(0)

  settings.display.useCustomTitle = true
  await action.updateDisplay(settings, 'myAction', entity)
  expect(mockAction.setTitle).toHaveBeenCalledWith('My Custom Title')
})

it('test updating dial display', async () => {
  const mockAction = mock<DialAction>()
  mockAction.isDial.mockReturnValue(true)
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  const configFactory = new EntityConfigFactory()
  const action = new GenericEntityAction(homeAssistant, configFactory)

  const settings = buildTestSettings()
  const entity = buildTestEntity()

  await action.updateDisplay(settings, 'myAction', entity)
  expect(mockAction.setFeedback).toHaveBeenCalledTimes(1)
  expect(mockAction.setFeedbackLayout).toHaveBeenCalledTimes(1)
})

it('streamdeck.open_url with custom scheme uses native OS opener', async () => {
  const mockAction = mock<KeyAction>()
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  vi.spyOn(homeAssistant, 'callService')
  const configFactory = new EntityConfigFactory()
  const action = new GenericEntityAction(homeAssistant, configFactory)

  const settings = buildTestSettings()
  settings.button.serviceShortPress = {
    serviceId: 'streamdeck.open_url',
    entityId: 'homeassistant://navigate/dashboard-floorplan/printer'
  }

  const ev = {
    action: { id: 'myAction' },
    payload: { settings }
  } as KeyDownEvent<Settings>

  await action.onKeyDown(ev)

  expect(streamDeck.system.openUrl).not.toHaveBeenCalled()
  expect(vi.mocked(exec)).toHaveBeenCalledWith(
    expect.stringContaining('homeassistant://navigate/dashboard-floorplan/printer'),
    expect.any(Function)
  )
  expect(homeAssistant.callService).not.toHaveBeenCalled()
})

it('streamdeck.open_url with https URL uses streamDeck.system.openUrl', async () => {
  const mockAction = mock<KeyAction>()
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  vi.spyOn(homeAssistant, 'callService')
  const configFactory = new EntityConfigFactory()
  const action = new GenericEntityAction(homeAssistant, configFactory)

  const settings = buildTestSettings()
  settings.button.serviceShortPress = {
    serviceId: 'streamdeck.open_url',
    entityId: 'https://example.com'
  }

  const ev = {
    action: { id: 'myAction' },
    payload: { settings }
  } as KeyDownEvent<Settings>

  await action.onKeyDown(ev)

  expect(streamDeck.system.openUrl).toHaveBeenCalledWith('https://example.com')
  expect(homeAssistant.callService).not.toHaveBeenCalled()
})

it('regular service calls homeAssistant.callService', async () => {
  const mockAction = mock<KeyAction>()
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  vi.spyOn(homeAssistant, 'callService').mockResolvedValue(true)
  const configFactory = new EntityConfigFactory()
  const action = new GenericEntityAction(homeAssistant, configFactory)

  const settings = buildTestSettings()
  settings.button.serviceShortPress = {
    serviceId: 'light.toggle',
    entityId: 'light.my_light'
  }

  const ev = {
    action: { id: 'myAction' },
    payload: { settings }
  } as KeyDownEvent<Settings>

  await action.onKeyDown(ev)

  expect(homeAssistant.callService).toHaveBeenCalledWith(settings.button.serviceShortPress)
  expect(streamDeck.system.openUrl).not.toHaveBeenCalled()
})
