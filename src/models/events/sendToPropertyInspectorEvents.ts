import type { EntityType } from '@/models/entity'
import type { Service } from '@/models/service'

export type SendToPropertyInspectorEvent = {
  payload: SendToPropertyInspectorEventData
}

export type SendToPropertyInspectorEventData =
  | ConnectionStateEvent
  | GetEntitiesEvent
  | GetEntityEvent
  | GetServicesEvent

type BasePluginEvent = {
  event: string
}

export type ConnectionStateEvent = BasePluginEvent & {
  event: 'connectionState'
  connected: boolean
  error: number
}

export type GetEntitiesEvent = BasePluginEvent & {
  event: 'getEntities'
  entities: EntityType[]
}

export type GetEntityEvent = BasePluginEvent & {
  event: 'getEntityAttributes'
  attributes: string[]
}

export type GetServicesEvent = BasePluginEvent & {
  event: 'getServices'
  services: Service[]
}
