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
    this._statesDebounceTimer = null
    this._pendingStateCallbacks = new Set()

    const auth = createLongLivedTokenAuth(url, accessToken)

    createConnection({ auth, setupRetry: 3 })
      .then((conn) => {
        if (this._closed) {
          conn.close()
          return
        }
        this._connection = conn
        conn.addEventListener('disconnected', () => !this._closed && onClose?.())
        conn.addEventListener(
          'reconnect-error',
          () => !this._closed && onError?.('Reconnection failed')
        )
        onReady?.()
      })
      .catch((err) => {
        if (!this._closed)
          onError?.(HA_ERROR_MESSAGES[err] ?? `Connection error (${err})`, {
            isAuthError: err === ERR_INVALID_AUTH
          })
      })
  }

  close() {
    this._closed = true
    clearTimeout(this._statesDebounceTimer)
    this._statesDebounceTimer = null
    this._pendingStateCallbacks.clear()
    this._connection?.close()
    this._connection = null
  }

  // Coalesces bursts of calls into one get_states request, but every callback
  // is eventually invoked (trailing-edge debounce, max one sync per 2s).
  getStatesDebounced(callback) {
    this._pendingStateCallbacks.add(callback)
    if (this._statesDebounceTimer) return

    const elapsed = Date.now() - (this._lastFullSync ?? 0)
    const delay = Math.max(0, 2000 - elapsed)
    this._statesDebounceTimer = setTimeout(() => {
      this._statesDebounceTimer = null
      this._lastFullSync = Date.now()
      const callbacks = [...this._pendingStateCallbacks]
      this._pendingStateCallbacks.clear()
      this.getStates((states) => callbacks.forEach((cb) => cb(states)))
    }, delay)
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
    if (!this._connection) {
      return Promise.reject(new Error('Not connected to Home Assistant'))
    }
    const target = entity_id ? { entity_id } : undefined
    return haCallService(this._connection, domain, service, serviceData, target)
  }
}
