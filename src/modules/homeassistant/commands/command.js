/**
 * The Command class acts as an abstract base class for creating commands
 * that can be used to interact with the HomeAssistant WebSocket API.
 */
export class Command {
    /**
     * Constructs a Command instance.
     * @param {number} requestId - The unique identifier for the command request.
     * @param {string} type - The type of the command. Must be a non-empty string.
     * @throws {TypeError} If an attempt is made to instantiate Command directly.
     * @throws {Error} If the requestId is not a non-negative number.
     * @throws {Error} If the type is not a non-empty string.
     */
    constructor(requestId, type) {
        // Prevent direct instantiation of this abstract class.
        if (new.target === Command) {
            throw new TypeError("Cannot instantiate abstract class Command directly");
        }

        if (typeof requestId !== 'number' || requestId < 0) {
            throw new Error('requestId must be a non-negative number');
        }

        if (typeof type !== 'string' || !type.trim()) {
            throw new Error('type must be a non-empty string');
        }

        this.id = requestId;
        this.type = type;
    }
}

