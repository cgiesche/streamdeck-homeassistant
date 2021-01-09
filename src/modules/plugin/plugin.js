import StreamDeck from "../common/streamdeck";
import {Homeassistant, Entity} from "../common/homeassistant";
import {IconFactory} from "./imageUtils";

window.connectElgatoStreamDeckSocket = (inPort, inPluginUUID, inRegisterEvent, inInfo) => {
    let actionSettings = {};
    const SD = new StreamDeck(inPort, inPluginUUID, inRegisterEvent, inInfo, "{}");

    SD.on("globalsettings", (globalSettings) => {
            console.log("Global Settings!")
            if (globalSettings.serverUrl && globalSettings.accessToken) {
                if (window.$HA) {
                    window.$HA.close();
                }
                window.$HA = new Homeassistant(globalSettings.serverUrl, globalSettings.accessToken, onHomeassistantConnected)
            }
        }
    )

    SD.on("connected", () => {
        SD.requestGlobalSettings();
    })

    SD.on("keyDown", (message) => {
        if (window.$HA) {
            let context = message.context
            let settings = actionSettings[context];
            window.$HA.callService(settings.service, new Entity(settings.entityId), () => {
            })
        }
    })

    SD.on("willAppear", (message) => {
        let context = message.context;
        actionSettings[context] = message.payload.settings

        if (window.$HA) {
            window.$HA.getStates(entitiyStatesChanged)
        }
    })

    SD.on("didReceiveSettings", (message) => {
        let context = message.context;
        actionSettings[context] = message.payload.settings
    })

    const onHomeassistantConnected = () => {
        window.$HA.getStates(entitiyStatesChanged)
        window.$HA.subscribeEvents(entityStateChanged)
    }

    const entitiyStatesChanged = (event) => {
        event.forEach(updateState)
    }

    const entityStateChanged = (event) => {
        if (event) {
            let newState = event.data.new_state;
            updateState(newState)
        }
    }

    const updateState = (state) => {
        let entity = new Entity(state.entity_id);
        let changedContexts = Object.keys(actionSettings).filter(key => actionSettings[key].entityId === entity.entityId);

        changedContexts.forEach(changedContext => {
            let newState = state.state;
            let stateAttributes = state.attributes;
            let deviceClass = stateAttributes.device_class || "default";

            console.log(`Finding image for context ${changedContext}: ${entity.domain}.${deviceClass}(${newState})`)

            if (changedContext) {
                if (IconFactory[entity.domain] && IconFactory[entity.domain][deviceClass]) {
                    console.log(`... sucess!`)
                    // domain, class, state
                    let svg = IconFactory[entity.domain][deviceClass](newState, stateAttributes);
                    let image = "data:image/svg+xml;charset=utf8," + svg;
                    SD.setImage(changedContext, image)
                } else if (IconFactory[entity.domain] && IconFactory[entity.domain]["default"]) {
                    console.log(`... sucess (fallback)!`)
                    let svg = IconFactory[entity.domain]["default"](newState, stateAttributes);
                    setButtonSVG(svg, changedContext);
                } else {
                    console.log(`... failed!`)
                }
            }
        })
    }

    function setButtonSVG(svg, changedContext) {
        let image = "data:image/svg+xml;charset=utf8," + svg;
        SD.setImage(changedContext, image)
    }
}
