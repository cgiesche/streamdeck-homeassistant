export class Entity {
  domain
  name
  title
  entityId

  constructor(domain, name, title) {
    this.domain = domain
    this.name = name
    this.title = title
    this.entityId = `${domain}.${name}`
  }
}
