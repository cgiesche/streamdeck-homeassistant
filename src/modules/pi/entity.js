export class Entity {

    #domain
    #name
    #title

    constructor(domain, name, title) {
        this.#domain = domain
        this.#name = name
        this.#title = title
    }

    get entityId() {
        return `${this.#domain}.${this.#name}`;
    }

    get domain() {
        return this.#domain
    }

    get name() {
        return this.#name
    }

    get title() {
        return this.#title
    }

}
