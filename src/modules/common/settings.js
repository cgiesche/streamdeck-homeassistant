export class Settings {

    static parse(settings) {
        if (!settings.version) {
            settings.version = 1
        }

        console.log(`Parsing version ${settings.version} settings.`)

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
            return settings
        }
    }
}
