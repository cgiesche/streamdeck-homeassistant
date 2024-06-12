export class StreamDeck {

    constructor(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
        let actionInfo = JSON.parse(inActionInfo);

        this.propertyInspectorUUID = inPropertyInspectorUUID;
        this.events = ELGEvents.eventEmitter();

        this.streamDeckWebsocket = new WebSocket('ws://localhost:' + inPort);
        this.streamDeckWebsocket.onopen = () => {
            let json = {
                "event": inRegisterEvent,
                "uuid": inPropertyInspectorUUID
            };
            this.streamDeckWebsocket.send(JSON.stringify(json));
            this.events.emit("connected", actionInfo);
        };

        this.on = (evt, fn) => this.events.on(evt, fn)

        this.streamDeckWebsocket.onmessage = (evt) => {
            let incomingEvent = JSON.parse(evt.data);
            switch (incomingEvent.event) {
                case "didReceiveGlobalSettings":
                    this.events.emit("globalsettings", incomingEvent.payload['settings']);
                    break;
                case "keyDown":
                    this.events.emit("keyDown", incomingEvent)
                    break;
                case "keyUp":
                    this.events.emit("keyUp", incomingEvent)
                    break;
                case "dialDown":
                    this.events.emit("dialDown", incomingEvent)
                    break;
                case "dialUp":
                    this.events.emit("dialUp", incomingEvent)
                    break;
                case "dialRotate":
                    this.events.emit("dialRotate", incomingEvent)
                    break;
                case "touchTap":
                    this.events.emit("touchTap", incomingEvent)
                    break;
                case "systemDidWakeUp":
                    this.events.emit("systemDidWakeUp", incomingEvent)
                    break;
                case "willAppear":
                    this.events.emit("willAppear", incomingEvent)
                    break;
                case "willDisappear":
                    this.events.emit("willDisappear", incomingEvent)
                    break;
                case "didReceiveSettings":
                    this.events.emit("didReceiveSettings", incomingEvent)
                    break;
                case "sendToPlugin":
                    this.events.emit("sendToPlugin", incomingEvent)
                    break;
                default:
                    console.log(`Unhandled Event: ${incomingEvent.event}`)
                    break;
            }
        };
    }

    requestGlobalSettings() {
        let getGlobalSettingsMessage = {
            "event": "getGlobalSettings",
            "context": this.propertyInspectorUUID
        };
        this.streamDeckWebsocket.send(JSON.stringify(getGlobalSettingsMessage))
    }

    saveGlobalSettings(payload) {
        let message = {
            "event": "setGlobalSettings",
            "context": this.propertyInspectorUUID,
            "payload": payload
        };

        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    saveSettings(actionSettings) {
        let message = {
            "event": "setSettings",
            "context": this.propertyInspectorUUID,
            "payload": actionSettings
        }
        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    setTitle(context, title) {
        let message = {
            "event": "setTitle",
            "context": context,
            "payload": {
                "title": title,
                "target": 0,
            }
        }
        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    setImage(context, image) {
        let message = {
            "event": "setImage",
            "context": context,
            "payload": {
                "image": image,
                "target": 0,
                "state": 0
            }
        }

        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    setFeedback(context, payload) {
        let message = {
            "event": "setFeedback",
            "context": context,
            "payload": payload
        }

        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    setFeedbackLayout(context, payload) {
        let message = {
            "event": "setFeedbackLayout",
            "context": context,
            "payload": payload
        }

        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    showAlert(context) {
        let message = {
            "event": "showAlert",
            "context": context
        }

        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    showOk(context) {
        let message = {
            "event": "showOk",
            "context": context
        }

        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    setState(context, number) {
        let message = {
            "event": "setState",
            "context": context,
            "payload": {
                "state": number
            }
        }

        this.streamDeckWebsocket.send(JSON.stringify(message))
    }

    log(message) {
        let messageEvent = {
            "event": "logMessage",
            "payload": {
                "message": message
            }
        }

        this.streamDeckWebsocket.send(JSON.stringify(messageEvent))
    }
}

const ELGEvents = {
    eventEmitter: function () {
        const eventList = new Map();

        const on = (name, fn) => {
            if (!eventList.has(name)) eventList.set(name, ELGEvents.pubSub());

            return eventList.get(name).sub(fn);
        };

        const has = (name) =>
            eventList.has(name);

        const emit = (name, data) =>
            eventList.has(name) && eventList.get(name).pub(data);

        return Object.freeze({on, has, emit, eventList});
    },

    pubSub: function pubSub() {
        const subscribers = new Set();

        const sub = fn => {
            subscribers.add(fn);
            return () => {
                subscribers.delete(fn);
            };
        };

        const pub = data => subscribers.forEach(fn => fn(data));
        return Object.freeze({pub, sub});
    }
};
