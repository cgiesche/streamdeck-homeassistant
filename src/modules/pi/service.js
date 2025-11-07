export class Service {

    domain
    name
    dataFields
    target
    serviceId

  constructor(domain, name, dataFields, target) {
    this.domain = domain
    this.name = name
    this.dataFields = dataFields
    this.target = target
    this.serviceId = `${domain}.${name}`
  }
}
