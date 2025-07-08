/* eslint-disable @typescript-eslint/unbound-method */
import { type KeyAction, streamDeck } from '@elgato/streamdeck'
import { expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { DualStateEntityAction } from '@/actions/dualStateEntityAction'
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

it('test updating keypad display state', async () => {
  const mockAction = mock<KeyAction>()
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  const configFactory = new EntityConfigFactory()
  const action = new DualStateEntityAction(homeAssistant, configFactory)

  const settings = buildTestSettings()
  const entity = buildTestEntity()

  entity.state = 'off'
  await action.updateDisplay(settings, 'myAction', entity)
  expect(mockAction.setState).toHaveBeenCalledWith(0)

  entity.state = 'on'
  await action.updateDisplay(settings, 'myAction', entity)
  expect(mockAction.setState).toHaveBeenCalledWith(1)
})

it('test updating keypad display title', async () => {
  const mockAction = mock<KeyAction>()
  vi.mocked(streamDeck.actions.getActionById).mockReturnValue(mockAction)

  const homeAssistant = new HomeAssistant()
  const configFactory = new EntityConfigFactory()
  const action = new DualStateEntityAction(homeAssistant, configFactory)

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
