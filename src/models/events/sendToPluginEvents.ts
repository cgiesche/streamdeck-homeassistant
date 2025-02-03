export type SendToPluginEventData =
  | GetEntitiesEvent
  | ReconnectEvent
  | GetConnectionStateEvent
  | GetEntityEvent
  | GetServicesEvent

type SendToPluginBaseEvent = { event: string }
type GetEntitiesEvent = SendToPluginBaseEvent & { event: 'getEntities' }
type GetServicesEvent = SendToPluginBaseEvent & { event: 'getServices' }
type GetConnectionStateEvent = SendToPluginBaseEvent & { event: 'getConnectionState' }

export type ReconnectEvent = SendToPluginBaseEvent & {
  event: 'reconnect'
  serverUrl: string
  accessToken: string
}

export type GetEntityEvent = SendToPluginBaseEvent & {
  event: 'getEntityAttributes'
  entityId: string
}
