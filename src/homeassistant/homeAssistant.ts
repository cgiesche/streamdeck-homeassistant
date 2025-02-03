import streamDeck from '@elgato/streamdeck'
import {
  type Collection,
  type Connection,
  type HassEntities,
  type HassEntity,
  type HassServiceTarget,
  type HassServices,
  callService,
  createConnection,
  createLongLivedTokenAuth,
  entitiesColl
} from 'home-assistant-js-websocket'
import { renderString } from 'nunjucks'

import type { ActionSettings } from '@/models/settings/settings'

type UpdateActionCallback = (entity: HassEntity) => void

export class HomeAssistant {
  private connection: Nullable<Connection> = null
  private connectionError = 0
  private entities: Nullable<Collection<HassEntities>> = null
  private readonly listeners: Map<string, { entityId: string; callback: UpdateActionCallback }> =
    new Map()

  async connect(url: string, accessToken: string) {
    this.close()
    const auth = createLongLivedTokenAuth(url, accessToken)
    try {
      this.connectionError = 0
      this.connection = await createConnection({ auth })
      this.entities = entitiesColl(this.connection)
      this.entities.subscribe((entities) => {
        this.handleStateChanges(entities)
      })
    } catch (error) {
      if (typeof error === 'number') {
        this.connectionError = error
      } else {
        this.connectionError = -1
      }
      streamDeck.logger.error('Error connecting to Home Assistant:', error)
    }
  }

  close() {
    this.connection?.close()
    this.connection = null
  }

  getConnectionState() {
    return {
      connected: this.connection !== null,
      error: this.connectionError
    }
  }

  async getStates(): Promise<Array<HassEntity>> {
    if (this.connection == null) return []
    try {
      return await this.connection.sendMessagePromise({ type: 'get_states' })
    } catch (e) {
      streamDeck.logger.error('Error fetching states', e)
    }
    return []
  }

  getState(entityId: string): Nullable<HassEntity> {
    return this.entities?.state[entityId]
  }

  async getServices(): Promise<HassServices> {
    if (this.connection == null) return {}
    try {
      return await this.connection.sendMessagePromise({ type: 'get_services' })
    } catch (e) {
      streamDeck.logger.error('Error fetching states', e)
    }
    return {}
  }

  async callService(actionSettings: ActionSettings, serviceDataAttributes = {}): Promise<boolean> {
    if (this.connection == null) {
      return false
    } else if (!actionSettings.serviceId) {
      // Don't display an alert error if no action is configured
      return true
    }

    try {
      const serviceIdParts = actionSettings.serviceId.split('.')
      let serviceData = {}
      if (actionSettings.serviceData) {
        const renderedServiceData = renderString(actionSettings.serviceData, serviceDataAttributes)
        serviceData = JSON.parse(renderedServiceData) as object
      }

      let target: Nullable<HassServiceTarget> = undefined
      if (actionSettings.entityId != null) {
        target = {
          entity_id: actionSettings.entityId
        }
      }
      await callService(this.connection, serviceIdParts[0], serviceIdParts[1], serviceData, target)
    } catch (e) {
      streamDeck.logger.error('Error calling service', e)
      return false
    }
    return true
  }

  subscribe(actionId: string, entityId: string, callback: UpdateActionCallback) {
    this.listeners.set(actionId, { entityId, callback })
    const entityState = this.getState(entityId)
    if (entityState) {
      callback(entityState)
    }
  }

  unsubscribe(actionId: string) {
    this.listeners.delete(actionId)
  }

  private handleStateChanges(event: HassEntities) {
    for (const listener of this.listeners.values()) {
      const entity = event[listener.entityId]
      if (entity) {
        listener.callback(entity)
      }
    }
  }
}
