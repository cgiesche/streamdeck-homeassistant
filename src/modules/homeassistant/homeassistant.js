import {
  createConnection,
  createLongLivedTokenAuth,
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

// A connection whose network path dies silently (NAT/proxy/CDN drops it
// without a FIN or RST) never fires a close event, and messages sent on it are
// lost until the OS gives up retransmitting (~15 minutes on Linux). Ping Home
// Assistant periodically and force a reconnect when it stops answering.
const HEARTBEAT_INTERVAL_MS = 30000
const HEARTBEAT_TIMEOUT_MS = 10000
const HEARTBEAT_TIMED_OUT = Symbol('heartbeat timed out')

export class Homeassistant {
  constructor(url, accessToken, onReady, onError, onClose) {
    this._connection = null
    this._lastFullSync = null
    this._closed = false
    this._statesDebounceTimer = null
    this._pendingStateCallbacks = new Set()
    this._heartbeatTimer = null
    this._heartbeatPending = false
    this._closeReason = null

    const auth = createLongLivedTokenAuth(url, accessToken)

    createConnection({ auth, setupRetry: 3 })
      .then((conn) => {
        if (this._closed) {
          conn.close()
          return
        }
        this._connection = conn
        conn.addEventListener('disconnected', () => {
          if (this._closed) return
          const reason = this._closeReason ?? 'socket closed'
          this._closeReason = null
          onClose?.(reason)
        })
        conn.addEventListener(
          'reconnect-error',
          () => !this._closed && onError?.('Reconnection failed')
        )
        this._heartbeatTimer = setInterval(() => this._heartbeat(), HEARTBEAT_INTERVAL_MS)
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
    clearInterval(this._heartbeatTimer)
    this._heartbeatTimer = null
    clearTimeout(this._statesDebounceTimer)
    this._statesDebounceTimer = null
    this._pendingStateCallbacks.clear()
    this._connection?.close()
    this._connection = null
  }

  async _heartbeat() {
    const conn = this._connection
    if (!conn?.connected || this._heartbeatPending) return
    this._heartbeatPending = true
    let timer
    try {
      await Promise.race([
        conn.ping(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(HEARTBEAT_TIMED_OUT), HEARTBEAT_TIMEOUT_MS)
        })
      ])
    } catch (e) {
      // Other rejections mean the socket already closed; the 'disconnected'
      // handler deals with those.
      if (e === HEARTBEAT_TIMED_OUT && !this._closed && conn === this._connection) {
        this._closeReason = `no reply to ping within ${HEARTBEAT_TIMEOUT_MS / 1000}s`
        conn.reconnect(true)
      }
    } finally {
      clearTimeout(timer)
      this._heartbeatPending = false
    }
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

  async subscribeEntitiesChanged(entityIds, callback) {
    if (!this._connection) return null
    try {
      return await this._connection.subscribeMessage(callback, {
        type: 'subscribe_trigger',
        trigger: {
          platform: 'state',
          entity_id: entityIds
        }
      })
    } catch (e) {
      if (e?.code !== 'invalid_format' || entityIds.length <= 1) throw e
      // Batch rejected due to one or more invalid entity IDs — retry one-by-one so
      // a single misconfigured button doesn't break live updates for all others.
      console.warn('subscribe_trigger batch failed with invalid_format; retrying per entity')
      const unsubscribers = []
      for (const entityId of entityIds) {
        try {
          const unsub = await this._connection.subscribeMessage(callback, {
            type: 'subscribe_trigger',
            trigger: { platform: 'state', entity_id: entityId }
          })
          unsubscribers.push(unsub)
        } catch {
          console.warn(`Skipping invalid entity "${entityId}" — check its configuration in Stream Deck`)
        }
      }
      if (unsubscribers.length === 0) throw e
      return async () => {
        await Promise.all(unsubscribers.map((u) => u().catch(() => {})))
      }
    }
  }

  callService(domain, service, entity_id = null, serviceData = {}) {
    if (!this._connection) {
      return Promise.reject(new Error('Not connected to Home Assistant'))
    }
    // Use execute_script (not call_service) so HA renders Jinja templates in
    // serviceData server-side, e.g. {{ state_attr(...) }}. The plain
    // call_service WS API does not template service data.
    const step = {
      service: `${domain}.${service}`,
      data: serviceData || {}
    }
    if (entity_id) {
      step.target = { entity_id }
    }
    return this._connection.sendMessagePromise({
      type: 'execute_script',
      sequence: [step]
    })
  }
}
