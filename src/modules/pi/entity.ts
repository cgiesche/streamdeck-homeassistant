export class Entity {
  domain: string
  name: string
  title: string
  entityId: string

  constructor(domain: string, name: string, title: string) {
    this.domain = domain
    this.name = name
    this.title = title
    this.entityId = `${domain}.${name}`
  }
}
