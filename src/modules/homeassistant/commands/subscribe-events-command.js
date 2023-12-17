import {Command} from "@/modules/homeassistant/commands/command";

/**
 * The SubscribeEventCommand class, a subclass of Command, specifically handles
 * subscription to event types in HomeAssistant.
 */
export class SubscribeEventsCommand extends Command {
    /**
     * Constructs a SubscribeEventCommand instance.
     * @param {number} requestId - The unique identifier for the command request.
     */
    constructor(requestId) {
        super(requestId, "subscribe_events");
        this.event_type = "state_changed";
    }
}
