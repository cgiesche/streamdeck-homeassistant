import type { SettingsType } from '@/modules/common/settings'

export interface BaseCommand {
  context: string
}

export interface WillAppearCommand extends BaseCommand {
  payload: {
    settings: SettingsType
  }
}

export interface DialRotateCommand extends BaseCommand {
  payload: {
    ticks: number
  }
}

export interface DidReceiveSettingsCommand extends BaseCommand {
  payload: {
    settings: SettingsType
  }
}

export interface GlobalSettings {
  serverUrl: string
  accessToken: string
  displayConfiguration: {
    url: string
    urlOverride: string
  }
}

export class StreamDeck {
  propertyInspectorUUID: string
  events: Readonly<{
    on: (name: string, fn: (data: never) => void) => unknown
    has: (name: string) => boolean
    emit: (name: string, data: object) => false | void
    eventList: Map<string, unknown>
  }>
  streamDeckWebsocket: WebSocket
  on: (evt: string, fn: (data: never) => void) => unknown

  constructor(
    inPort: number,
    inPropertyInspectorUUID: string,
    inRegisterEvent: string,
    inInfo: string,
    inActionInfo: string
  ) {
    const actionInfo = JSON.parse(inActionInfo)

    this.propertyInspectorUUID = inPropertyInspectorUUID
    this.events = ELGEvents.eventEmitter()

    this.streamDeckWebsocket = new WebSocket('ws://localhost:' + inPort)
    this.streamDeckWebsocket.onopen = () => {
      const json = {
        event: inRegisterEvent,
        uuid: inPropertyInspectorUUID
      }
      this.streamDeckWebsocket.send(JSON.stringify(json))
      this.events.emit('connected', actionInfo)
    }

    this.on = (evt, fn) => this.events.on(evt, fn)

    this.streamDeckWebsocket.onmessage = (evt) => {
      const incomingEvent = JSON.parse(evt.data)
      switch (incomingEvent.event) {
        case 'didReceiveGlobalSettings':
          this.events.emit('globalsettings', incomingEvent.payload['settings'])
          break
        case 'keyDown':
          this.events.emit('keyDown', incomingEvent)
          break
        case 'keyUp':
          this.events.emit('keyUp', incomingEvent)
          break
        case 'dialDown':
          this.events.emit('dialDown', incomingEvent)
          break
        case 'dialUp':
          this.events.emit('dialUp', incomingEvent)
          break
        case 'dialRotate':
          this.events.emit('dialRotate', incomingEvent)
          break
        case 'touchTap':
          this.events.emit('touchTap', incomingEvent)
          break
        case 'systemDidWakeUp':
          this.events.emit('systemDidWakeUp', incomingEvent)
          break
        case 'willAppear':
          this.events.emit('willAppear', incomingEvent)
          break
        case 'willDisappear':
          this.events.emit('willDisappear', incomingEvent)
          break
        case 'didReceiveSettings':
          this.events.emit('didReceiveSettings', incomingEvent)
          break
        case 'sendToPlugin':
          this.events.emit('sendToPlugin', incomingEvent)
          break
        default:
          console.log(`Unhandled Event: ${incomingEvent.event}`)
          break
      }
    }
  }

  requestGlobalSettings() {
    const getGlobalSettingsMessage = {
      event: 'getGlobalSettings',
      context: this.propertyInspectorUUID
    }
    this.streamDeckWebsocket.send(JSON.stringify(getGlobalSettingsMessage))
  }

  saveGlobalSettings(payload: unknown) {
    const message = {
      event: 'setGlobalSettings',
      context: this.propertyInspectorUUID,
      payload: payload
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  saveSettings(actionSettings: unknown) {
    const message = {
      event: 'setSettings',
      context: this.propertyInspectorUUID,
      payload: actionSettings
    }
    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  setTitle(context: unknown, title: string) {
    const message = {
      event: 'setTitle',
      context: context,
      payload: {
        title: title,
        target: 0
      }
    }
    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  setImage(context: unknown, image: unknown) {
    const message = {
      event: 'setImage',
      context: context,
      payload: {
        image: image,
        target: 0,
        state: 0
      }
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  setFeedback(context: unknown, payload: unknown) {
    const message = {
      event: 'setFeedback',
      context: context,
      payload: payload
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  setFeedbackLayout(context: unknown, payload: unknown) {
    const message = {
      event: 'setFeedbackLayout',
      context: context,
      payload: payload
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  showAlert(context: unknown) {
    const message = {
      event: 'showAlert',
      context: context
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  showOk(context: unknown) {
    const message = {
      event: 'showOk',
      context: context
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  setState(context: unknown, number: unknown) {
    const message = {
      event: 'setState',
      context: context,
      payload: {
        state: number
      }
    }

    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  log(message: unknown) {
    const messageEvent = {
      event: 'logMessage',
      payload: {
        message: message
      }
    }

    this.streamDeckWebsocket.send(JSON.stringify(messageEvent))
  }
}

const ELGEvents = {
  eventEmitter: function () {
    const eventList = new Map()

    const on = (name: string, fn: unknown) => {
      if (!eventList.has(name)) eventList.set(name, ELGEvents.pubSub())

      return eventList.get(name).sub(fn)
    }

    const has = (name: string) => eventList.has(name)

    const emit = (name: string, data: unknown) =>
      eventList.has(name) && eventList.get(name).pub(data)

    return Object.freeze({ on, has, emit, eventList })
  },

  pubSub: function pubSub() {
    const subscribers = new Set<(value: unknown) => unknown>()

    const sub = (fn: (value: unknown) => unknown) => {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    }

    const pub = (data: unknown) => subscribers.forEach((fn) => fn(data))
    return Object.freeze({ pub, sub })
  }
}
