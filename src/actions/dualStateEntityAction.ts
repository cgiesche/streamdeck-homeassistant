import { type KeyAction, action, streamDeck } from '@elgato/streamdeck'
import type { HassEntity } from 'home-assistant-js-websocket'

import { GenericEntityAction } from '@/actions/genericEntityAction'
import type { RenderingConfig } from '@/models/renderConfig'

@action({ UUID: 'de.perdoctus.streamdeck.homeassistant.dual-state-entity' })
export class DualStateEntityAction extends GenericEntityAction {
  override async updateKeypadDisplay(
    renderingConfig: RenderingConfig,
    action: KeyAction,
    stateObject: HassEntity
  ) {
    if (renderingConfig.customTitle) {
      await action.setTitle(renderingConfig.customTitle)
    }
    if (this.activeStates.indexOf(stateObject.state) !== -1) {
      streamDeck.logger.debug(`Setting state of ${action.id} to 1`)
      await action.setState(1)
    } else {
      streamDeck.logger.debug(`Setting state of ${action.id} to 0`)
      await action.setState(0)
    }
  }
}
