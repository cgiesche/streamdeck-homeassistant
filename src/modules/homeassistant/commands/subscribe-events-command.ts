import { Command } from '@/modules/homeassistant/commands/command'

/**
 * The SubscribeEventCommand class, a subclass of Command, specifically handles
 * subscription to event types in HomeAssistant.
 */
export class SubscribeEventsCommand extends Command {
  event_type: string

  /**
   * Constructs a SubscribeEventCommand instance.
   * @param {number} requestId - The unique identifier for the command request.
   */
  constructor(requestId: number) {
    super(requestId, 'subscribe_events')
    this.event_type = 'state_changed'
  }
}
