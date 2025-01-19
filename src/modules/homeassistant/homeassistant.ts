import { ServiceAction } from '@/modules/homeassistant/actions/service-action'
import { ExecuteScriptCommand } from '@/modules/homeassistant/commands/execute-script-command'
import { SubscribeEventsCommand } from '@/modules/homeassistant/commands/subscribe-events-command'
import { GetStatesCommand } from '@/modules/homeassistant/commands/get-states-command'
import { GetServicesCommand } from '@/modules/homeassistant/commands/get-services-command'
import { Command } from '@/modules/homeassistant/commands/command'

export interface StateMessage {
  entity_id: string
  last_updated: string
  last_changed: string
  state: string
  attributes: {
    icon: string
    friendly_name: string
    device_class: string
    last_updated: string
    last_changed: string
    rgb_color: number[]
  }
}

export class Homeassistant {
  requests: Map<unknown, (data: unknown) => void>
  requestIdSequence: number
  websocket: WebSocket
  accessToken: string
  onReady: () => void
  onError: (message: string) => void
  lastFullSync: number | null

  constructor(
    url: string,
    accessToken: string,
    onReady: () => void,
    onError: (message: string) => void,
    onClose: (ev: CloseEvent) => void
  ) {
    this.requests = new Map()
    this.requestIdSequence = 1
    this.websocket = new WebSocket(url)
    this.accessToken = accessToken
    this.onReady = onReady
    this.onError = onError

    this.websocket.onmessage = (evt) => this.handleMessage(evt)
    this.websocket.onerror = () => {
      this.onError('Failed to connect to ' + url)
    }
    this.websocket.onclose = onClose
    this.lastFullSync = null
  }

  close() {
    this.websocket.onclose = null
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close()
    }
  }

  handleMessage(msg: MessageEvent) {
    const messageData: {
      type: string
      id: unknown
      success: unknown
      error: { message: string }
      result: unknown
      event: unknown
      message: string
    } = JSON.parse(msg.data)

    switch (messageData.type) {
      case 'auth_required':
        this.sendAuthentication()
        break
      case 'result':
        if (!messageData.success) {
          throw messageData.error.message
        }
        if (this.requests.has(messageData.id)) {
          this.requests.get(messageData.id)!(messageData.result)
        }
        break
      case 'event':
        if (this.requests.has(messageData.id)) {
          this.requests.get(messageData.id)!(messageData.event)
        }
        break
      case 'auth_ok':
        if (this.onReady) {
          this.onReady()
        }
        break
      case 'auth_failed':
        if (this.onError) {
          this.onError(messageData.message)
        }
        break
      case 'auth_invalid':
        if (this.onError) {
          this.onError(messageData.message)
        }
        break
    }
  }

  sendAuthentication() {
    const authMessage = {
      type: 'auth',
      access_token: this.accessToken
    }

    this.websocket.send(JSON.stringify(authMessage))
  }

  getStatesDebounced(callback: (data: StateMessage[]) => void) {
    if (!this.lastFullSync || Date.now() - this.lastFullSync > 2000) {
      this.lastFullSync = Date.now()
      this.getStates(callback)
    }
  }

  getStates(callback: (data: StateMessage[]) => void) {
    const getStatesCommand = new GetStatesCommand(this.nextRequestId())
    this.sendCommand(getStatesCommand, callback)
  }

  getServices(callback: (data: object) => void) {
    const getServicesCommand = new GetServicesCommand(this.nextRequestId())
    this.sendCommand(getServicesCommand, callback)
  }

  subscribeEvents(
    callback: (event: {
      data: {
        new_state: StateMessage
      }
    }) => void
  ) {
    const subscribeEventCommand = new SubscribeEventsCommand(this.nextRequestId())
    this.sendCommand(subscribeEventCommand, callback)
  }

  callService(
    service: string,
    domain: string,
    entity_id: unknown | null = null,
    serviceData = null,
    callback: (data: unknown) => void = () => {}
  ) {
    const executeScriptCmd = new ExecuteScriptCommand(this.nextRequestId(), [
      new ServiceAction(domain, service, entity_id ? [entity_id] : null, serviceData || {})
    ])
    this.sendCommand(executeScriptCmd, callback)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendCommand(command: Command, callback: (data: any) => void) {
    if (callback) {
      this.requests.set(command.id, callback)
    }

    console.log(`Sending HomeAssistant command:\n ${JSON.stringify(command, null, 2)}`)
    this.websocket.send(JSON.stringify(command))
  }

  nextRequestId() {
    this.requestIdSequence = this.requestIdSequence + 1
    return this.requestIdSequence
  }
}
