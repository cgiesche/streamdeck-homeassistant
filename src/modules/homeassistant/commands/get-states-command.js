import { Command } from '@/modules/homeassistant/commands/command'

/**
 * The GetStatesCommand class, a subclass of Command, handles the retrieval of
 * state information from HomeAssistant.
 */
export class GetStatesCommand extends Command {
  /**
   * Constructs a GetStatesCommand instance.
   * @param {number} requestId - The unique identifier for the command request.
   */
  constructor(requestId) {
    super(requestId, 'get_states')
  }
}
