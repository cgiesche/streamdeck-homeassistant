export type EntityType = {
  domain: string
  name: string
  title: string
  entityId: string
}

export class Entity implements EntityType {
  domain: string
  name: string
  title: string
  entityId: string

  constructor(entityId: string, friendlyName: Nullable<string>) {
    const splitId = entityId.split('.')
    this.domain = splitId[0]
    this.name = splitId[1]
    this.title = friendlyName || entityId
    this.entityId = entityId
  }
}
