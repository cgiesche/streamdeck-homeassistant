import { Command } from '@/modules/homeassistant/commands/command'
import { Action } from '@/modules/homeassistant/actions/action'

/**
 * CallExecuteScriptCommand
 *
 * Facilitates the execution of multiple actions, including service calls, in a single command. This command
 * is a substantial improvement over the "call_service" command, as it incorporates and evaluates Jinja templates.
 * This enhancement enables more dynamic and context-sensitive operations within HomeAssistant.
 */
export class ExecuteScriptCommand extends Command {
  /**
   * Constructs a CallExecuteScriptCommand instance.
   *
   * @param {number} requestId - Number of iterations for execution. Must be non-negative.
   * @param {Action[]} [actions=[]] - Array of ScriptCommand instances. Optional, defaults to empty.
   * @throws {TypeError} if actions is not an array or has non-Action elements.
   */
  constructor(requestId, actions = []) {
    super(requestId, 'execute_script')

    if (!Array.isArray(actions)) {
      throw new TypeError('Actions must be an array')
    }

    if (actions.some((action) => !(action instanceof Action))) {
      throw new TypeError('Elements in actions must be Action instances or subclasses')
    }

    this.sequence = actions
  }
}
