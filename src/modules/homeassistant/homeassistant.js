import {ServiceAction} from "@/modules/homeassistant/actions/service-action";
import {ExecuteScriptCommand} from "@/modules/homeassistant/commands/execute-script-command";
import {SubscribeEventsCommand} from "@/modules/homeassistant/commands/subscribe-events-command";
import {GetStatesCommand} from "@/modules/homeassistant/commands/get-states-command";
import {GetServicesCommand} from "@/modules/homeassistant/commands/get-services-command";

export class Homeassistant {

    constructor(url, accessToken, onReady, onError, onClose) {
        this.requests = new Map()
        this.requestIdSequence = 1
        this.websocket = new WebSocket(url)
        this.accessToken = accessToken;
        this.onReady = onReady;
        this.onError = onError;

        this.websocket.onmessage = (evt) => this.handleMessage(evt);
        this.websocket.onerror = () => {this.onError("Failed to connect to " + url)};
        this.websocket.onclose = onClose;
    }

    close() {
        this.websocket.onclose = null;
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.close();
        }
    }

    handleMessage(msg) {
        let messageData = JSON.parse(msg.data);

        switch (messageData.type) {
            case "auth_required":
                this.sendAuthentication();
                break;
            case "result":
                if (!messageData.success) {
                    throw messageData.error.message
                }
                if (this.requests.has(messageData.id)) {
                    this.requests.get(messageData.id)(messageData.result);
                }
                break;
            case "event":
                if (this.requests.has(messageData.id)) {
                    this.requests.get(messageData.id)(messageData.event);
                }
                break;
            case "auth_ok":
                if (this.onReady) {
                    this.onReady();
                }
                break;
            case "auth_failed":
                if (this.onError) {
                    this.onError(messageData.message);
                }
                break;
            case "auth_invalid":
                if (this.onError) {
                    this.onError(messageData.message);
                }
                break;
        }
    }

    sendAuthentication() {
        let authMessage = {
            "type": "auth",
            "access_token": this.accessToken
        }

        this.websocket.send(JSON.stringify(authMessage))
    }

    getStates(callback) {
        let getStatesCommand = new GetStatesCommand(this.nextRequestId());
        this.sendCommand(getStatesCommand, callback);
    }

    getServices(callback) {
        let getServicesCommand = new GetServicesCommand(this.nextRequestId());
        this.sendCommand(getServicesCommand, callback)
    }

    subscribeEvents(callback) {
        let subscribeEventCommand = new SubscribeEventsCommand(this.nextRequestId());
        this.sendCommand(subscribeEventCommand, callback);
    }

    callService(service, domain, entity_id = null, serviceData = null, callback = null) {
        let executeScriptCmd = new ExecuteScriptCommand(this.nextRequestId(), [
            new ServiceAction(domain, service, entity_id ? [entity_id] : [], serviceData || {})
        ]);
        this.sendCommand(executeScriptCmd, callback)
    }

    sendCommand(command, callback) {
        if (callback) {
            this.requests.set(command.id, callback);
        }

        console.log(`Sending HomeAssistant command:\n ${JSON.stringify(command,null,2)}`)
        this.websocket.send(JSON.stringify(command));
    }

    nextRequestId() {
        this.requestIdSequence = this.requestIdSequence + 1;
        return this.requestIdSequence;
    }
}

