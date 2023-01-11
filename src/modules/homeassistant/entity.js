export class Entity {

    #entityId

    constructor(entityId) {
        this.#entityId = entityId
    }

    get domain() {
        return this.#entityId.split(".")[0]
    }

    get name() {
        return this.#entityId.split(".")[1];
    }

    get entityId() {
        return this.#entityId;
    }

}
