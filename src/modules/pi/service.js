export class Service {

    #domain
    #name
    #title
    #description
    #dataFields
    #target

    constructor(domain, name, title, description, dataFields, target) {
        this.#domain = domain;
        this.#name = name;
        this.#title = title;
        this.#description = description;
        this.#dataFields = dataFields;
        this.#target = target;
    }

    get serviceId() {
        return `${this.#domain}.${this.#name}`;
    }

    get domain() {
        return this.#domain;
    }

    get name() {
        return this.#name;
    }

    get title() {
        return this.#title;
    }

    get description() {
        return this.#description;
    }

    get dataFields() {
        return this.#dataFields;
    }

    get target() {
        return this.#target;
    }

}
