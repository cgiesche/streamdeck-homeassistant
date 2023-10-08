export class Service {

    domain
    name
    title
    description
    dataFields
    target
    serviceId

    constructor(domain, name, title, description, dataFields, target) {
        this.domain = domain;
        this.name = name;
        this.title = title;
        this.description = description;
        this.dataFields = dataFields;
        this.target = target;
        this.serviceId = `${domain}.${name}`;
    }

}
