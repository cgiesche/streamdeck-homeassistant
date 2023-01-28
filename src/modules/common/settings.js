export class Settings {

    static parse(settings) {
        if (!settings.version) {
            settings.version = 1
        }

        console.log(`Parsing version ${settings.version} settings: ${JSON.stringify(settings)}`)

        if (settings.version === 1) {
            let settingsV2 = {
                version: 2,
                display: {
                    domain: settings["domain"],
                    entityId: settings["entityId"],
                    useCustomTitle: settings["useCustomTitle"],
                    buttonTitle: settings["buttonTitle"] || "{{friendly_name}}",
                    enableServiceIndicator: settings["enableServiceIndicator"] || settings["enableServiceIndicator"] === undefined,
                    hideIcon: settings["hideIcon"],
                    useCustomButtonLabels: settings["useCustomButtonLabels"],
                    buttonLabels: settings["buttonLabels"],
                    useStateImagesForOnOffStates: settings["useStateImagesForOnOffStates"] // determined by action ID (manifest)
                },
                button: {
                    service: {
                        domain: "",
                        name: "",
                        data: ""
                    },
                    serviceLongPress: {
                        domain: "",
                        name: "",
                        data: ""
                    },
                }
            }

            if (settings["service"]) {
                settingsV2.button.service.domain = settings["domain"]
                settingsV2.button.service.name = settings["service"].id
                settingsV2.button.service.data = settings["service"].data
            }
            if (settings["serviceLongPress"]) {
                settingsV2.button.serviceLongPress.domain = settings["domain"]
                settingsV2.button.serviceLongPress.name = settings["serviceLongPress"].id
                settingsV2.button.serviceLongPress.data = settings["serviceLongPress"].data
            }

            return this.parse(settingsV2);
        }

        if (settings.version === 2) {
            let settingsV3 = settings;
            settingsV3.version = 3
            settingsV3.button.serviceShortPress = {
                serviceId: "",
                entityId: "",
                serviceData: "",
            }
            settingsV3.button.serviceLongPress = {
                serviceId: "",
                entityId: "",
                serviceData: "",
            }

            if (settings.button.service.name) {
                settingsV3.button.serviceShortPress = {
                    serviceId: settings.button.service.domain + '.' + settings.button.service.name,
                    entityId: settings.display.entityId,
                    serviceData: settings.button.service.data,
                }
            }
            if (settings.button.serviceLongPress.name) {
                settingsV3.button.serviceLongPress = {
                    serviceId: settings.button.serviceLongPress.domain + '.' + settings.button.serviceLongPress.name,
                    entityId: settings.display.entityId,
                    serviceData: settings.button.serviceLongPress.data,
                }
            }

            return this.parse(settingsV3)
        }

        if (settings.version === 3) {
            return settings;
        }
    }
}
