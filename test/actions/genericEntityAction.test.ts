/* eslint-disable @typescript-eslint/unbound-method */
import { type DialAction, type KeyAction, streamDeck } from '@elgato/streamdeck'
import { expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { GenericEntityAction } from '@/actions/genericEntityAction'
import { HomeAssistant } from '@/homeassistant/homeAssistant'
import { EntityConfigFactory } from '@/render/entityConfigFactoryNg'

import { buildTestEntity, buildTestSettings } from '../testUtils'

vi.mock('@elgato/streamdeck', async (importOriginal) => {
  const mod: { streamDeck: { logger: object } } = await importOriginal()
  return {
    ...mod,
    streamDeck: {
      logger: mod.streamDeck.logger,
      actions: {
        getActionById: vi.fn()
      }
    }
  }
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
