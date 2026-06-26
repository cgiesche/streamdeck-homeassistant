const FORWARDED_EVENTS = new Set([
  'keyDown',
  'keyUp',
  'dialDown',
  'dialUp',
  'dialRotate',
  'touchTap',
  'systemDidWakeUp',
  'willAppear',
  'willDisappear',
  'didReceiveSettings',
  'sendToPlugin'
])

export class StreamDeck {
  constructor(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    let actionInfo = JSON.parse(inActionInfo)

    // Registration info from the Stream Deck app: app version, OS/platform,
    // plugin version, device model. Used by the PI debug report.
    this.info = inInfo ? JSON.parse(inInfo) : {}
    this.actionInfo = actionInfo
    this.propertyInspectorUUID = inPropertyInspectorUUID
    this.events = ELGEvents.eventEmitter()

    this.streamDeckWebsocket = new WebSocket('ws://localhost:' + inPort)
    this.streamDeckWebsocket.onopen = () => {
      this.#send({
        event: inRegisterEvent,
        uuid: inPropertyInspectorUUID
      })
      this.events.emit('connected', actionInfo)
    }

    this.on = (evt, fn) => this.events.on(evt, fn)

    this.streamDeckWebsocket.onmessage = (evt) => {
      const incomingEvent = JSON.parse(evt.data)
      if (incomingEvent.event === 'didReceiveGlobalSettings') {
        this.events.emit('globalsettings', incomingEvent.payload['settings'])
      } else if (FORWARDED_EVENTS.has(incomingEvent.event)) {
        this.events.emit(incomingEvent.event, incomingEvent)
      } else {
        console.log(`Unhandled Event: ${incomingEvent.event}`)
      }
    }
  }

  #send(message) {
    this.streamDeckWebsocket.send(JSON.stringify(message))
  }

  requestGlobalSettings() {
    this.#send({ event: 'getGlobalSettings', context: this.propertyInspectorUUID })
  }

  saveGlobalSettings(payload) {
    this.#send({ event: 'setGlobalSettings', context: this.propertyInspectorUUID, payload })
  }

  saveSettings(actionSettings) {
    this.#send({ event: 'setSettings', context: this.propertyInspectorUUID, payload: actionSettings })
  }

  setTitle(context, title) {
    this.#send({ event: 'setTitle', context, payload: { title, target: 0 } })
  }

  setImage(context, image) {
    this.#send({ event: 'setImage', context, payload: { image, target: 0, state: 0 } })
  }

  setFeedback(context, payload) {
    this.#send({ event: 'setFeedback', context, payload })
  }

  setFeedbackLayout(context, payload) {
    this.#send({ event: 'setFeedbackLayout', context, payload })
  }

  showAlert(context) {
    this.#send({ event: 'showAlert', context })
  }

  showOk(context) {
    this.#send({ event: 'showOk', context })
  }

  setState(context, number) {
    this.#send({ event: 'setState', context, payload: { state: number } })
  }

  log(message) {
    this.#send({ event: 'logMessage', payload: { message } })
  }

  openUrl(url) {
    this.#send({ event: 'openUrl', payload: { url } })
  }
}

const ELGEvents = {
  eventEmitter: function () {
    const eventList = new Map()

    const on = (name, fn) => {
      if (!eventList.has(name)) eventList.set(name, ELGEvents.pubSub())

      return eventList.get(name).sub(fn)
    }

    const has = (name) => eventList.has(name)

    const emit = (name, data) => eventList.has(name) && eventList.get(name).pub(data)

    return Object.freeze({ on, has, emit, eventList })
  },

  pubSub: function pubSub() {
    const subscribers = new Set()

    const sub = (fn) => {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    }

    const pub = (data) => subscribers.forEach((fn) => fn(data))
    return Object.freeze({ pub, sub })
  }
}
