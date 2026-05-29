import {
  createConnection,
  createLongLivedTokenAuth,
  callService as haCallService,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
  ERR_CONNECTION_LOST,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_HTTPS_TO_HTTP
} from 'home-assistant-js-websocket'

const HA_ERROR_MESSAGES = {
  [ERR_CANNOT_CONNECT]: 'Cannot connect to Home Assistant. Check the server URL.',
  [ERR_INVALID_AUTH]: 'Invalid access token.',
  [ERR_CONNECTION_LOST]: 'Connection to Home Assistant lost.',
  [ERR_HASS_HOST_REQUIRED]: 'Home Assistant host URL is required.',
  [ERR_INVALID_HTTPS_TO_HTTP]: 'Cannot connect: server uses HTTP but a secure connection (HTTPS) is required.'
}

export class Homeassistant {
  constructor(url, accessToken, onReady, onError, onClose) {
    this._connection = null
    this._lastFullSync = null
    this._closed = false

    const auth = createLongLivedTokenAuth(url, accessToken)

    createConnection({ auth, setupRetry: 3 })
      .then((conn) => {
        if (this._closed) {
          conn.close()
          return
        }
        this._connection = conn
        conn.addEventListener('disconnected', () => !this._closed && onClose?.())
        conn.addEventListener('reconnect-error', () => onError?.('Reconnection failed'))
        onReady?.()
      })
      .catch((err) => {
        if (!this._closed) onError?.(HA_ERROR_MESSAGES[err] ?? `Connection error (${err})`)
      })
  }

  close() {
    this._closed = true
    this._connection?.close()
    this._connection = null
  }

  getStatesDebounced(callback) {
    if (!this._lastFullSync || Date.now() - this._lastFullSync > 2000) {
      this._lastFullSync = Date.now()
      this.getStates(callback)
    }
  }

  getStates(callback) {
    if (!this._connection) return
    this._connection.sendMessagePromise({ type: 'get_states' }).then(callback)
  }

  getServices(callback) {
    if (!this._connection) return
    this._connection.sendMessagePromise({ type: 'get_services' }).then(callback)
  }

  subscribeEntitiesChanged(entityIds, callback) {
    if (!this._connection) return Promise.resolve(null)
    return this._connection.subscribeMessage(callback, {
      type: 'subscribe_trigger',
      trigger: {
        platform: 'state',
        entity_id: entityIds
      }
    })
  }

  callService(domain, service, entity_id = null, serviceData = {}) {
    const target = entity_id ? { entity_id } : undefined
    haCallService(this._connection, domain, service, serviceData, target)
  }
}
