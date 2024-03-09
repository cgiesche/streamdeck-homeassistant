import * as Mdi from "@mdi/js";

export class EntityConfigFactory {

    constructor() {
        // Todo: configurable colors
        this.colors = {
            unavailable: "#505050",

            neutral: "#FFF",
            passive: "#a1a1a1",
            active: "#e9b200",

            ok: "#08ac00",
            warn: "#a13300",
            error: "#a10000"
        }
    }

    determineConfig(domain, stateObject, labelTemplates) {
        let state = stateObject.state;
        let stateAttributes = stateObject.attributes;
        let deviceClass = stateAttributes.device_class || "default";

        if (this[domain] && this[domain][deviceClass]) {
            return this[domain][deviceClass](state, stateAttributes, labelTemplates);
        } else if (this[domain] && this[domain]["default"]) {
            return this[domain]["default"](state, stateAttributes, labelTemplates);
        }

        return this.default(state, stateAttributes, labelTemplates);

    }

    default(state, attributes, templates) {
        const icon = Mdi[this.#tryGetIconFromAttributes(attributes)] || null;
        let color = this.colors.unavailable;

        if (state) {
            color = this.colors.neutral;
        }

        if (!templates) {
            templates = []
            templates.push("\n\n{{friendly_name}}", "{{state}}")
        }

        return {
            state,
            attributes,
            templates,
            icon,
            color
        }
    }

    "switch" = {
        "default": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);

            if (state === 'on') {
                defaultConfig.icon = defaultConfig.icon || Mdi.mdiToggleSwitch
                defaultConfig.color = this.colors.active
            } else if (state === 'off') {
                defaultConfig.icon = defaultConfig.icon || Mdi.mdiToggleSwitchOff
                defaultConfig.color = this.colors.neutral;
            }

            return defaultConfig;
        }
    }

    input_boolean = this.switch

    "light" = {
        "default": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);

            if (state === 'on') {
                defaultConfig.icon = defaultConfig.icon || Mdi.mdiLightbulb;
                defaultConfig.color = this.colors.active;
            } else if (state === 'off') {
                defaultConfig.icon = defaultConfig.icon || Mdi.mdiLightbulbOff;
                defaultConfig.color = this.colors.neutral;
            }

            return defaultConfig;
        }
    }

    "binary_sensor" = {
        "default": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);

            if (state === 'on') {
                defaultConfig.icon = Mdi.mdiCircleSlice8
                defaultConfig.color = this.colors.active
            } else if (state === 'off') {
                defaultConfig.icon = Mdi.mdiCircleOutline
                defaultConfig.color = this.colors.neutral
            }

            return defaultConfig;
        },

        "plug": (state, attributes, templates) => {
            const defaultConfig = this.binary_sensor.default(state, attributes, templates);

            if (state === 'on') {
                defaultConfig.icon = Mdi.mdiPowerPlugOutline
            } else if (state === 'off') {
                defaultConfig.icon = Mdi.mdiPowerPlugOffOutline
            }

            return defaultConfig;
        },

        "window": (state, attributes, templates) => {
            const defaultConfig = this.binary_sensor.default(state, attributes, templates);

            if (state === 'on') {
                defaultConfig.icon = Mdi.mdiWindowOpenVariant
            } else if (state === 'off') {
                defaultConfig.icon = Mdi.mdiWindowClosedVariant
            }

            return defaultConfig;
        }
    }
    "cover" = {
        "garage": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);

            if (state === 'open') {
                defaultConfig.icon = Mdi.mdiGarageOpen
                defaultConfig.color = this.colors.active
            } else if (state === 'closed') {
                defaultConfig.icon = Mdi.mdiGarage
                defaultConfig.color = this.colors.neutral
            } else if (state === 'closing') {
                defaultConfig.icon = Mdi.mdiArrowDownBox
                defaultConfig.color = this.colors.active
            } else if (state === 'opening') {
                defaultConfig.icon = Mdi.mdiArrowUpBox
                defaultConfig.color = this.colors.active
            }

            return defaultConfig;
        }
    }
    sensor = {
        "humidity": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);
            defaultConfig.icon = defaultConfig.icon || Mdi.mdiWaterPercent
            defaultConfig.color = "#3f3fdb";
            defaultConfig.templates = ["\n\n{{state}}{{unit_of_measurement}}"]
            return defaultConfig;
        },

        "temperature": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);
            defaultConfig.icon = defaultConfig.icon || Mdi.mdiThermometer;
            defaultConfig.color = "#00a400";
            defaultConfig.templates = ["\n\n{{state}}{{unit_of_measurement}}"]

            let temperature = 0 + state;
            if (attributes.unit_of_measurement === "°F") {
                temperature = (temperature - 32) * 5 / 9;
            }

            if (temperature < 5) {
                defaultConfig.color = "#3838f8";
            } else if (temperature > 25) {
                defaultConfig.color = "#fa4848";
            }

            return defaultConfig;
        },

        "battery": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);
            defaultConfig.templates = ["\n\n{{state}}{{unit_of_measurement}}"]

            if (state < 15) {
                defaultConfig.color = "#FF0000"
            } else if (state < 30) {
                defaultConfig.color = "#ff8600"
            } else {
                defaultConfig.color = "#00a400"
            }

            return defaultConfig;
        },

        "power": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);
            defaultConfig.icon = Mdi.mdiFlash
            defaultConfig.templates = ["\n\n{{state}}W"]

            return defaultConfig;
        },

    }

    weather = {
        "default": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);
            defaultConfig.color = this.colors.neutral;
            defaultConfig.templates = ["\n\n {{temperature}}{{temperature_unit | default('°C')}}", "{{humidity}}%"]

            switch (state) {
                case 'clear-night':
                    defaultConfig.icon = Mdi.mdiWeatherNight;
                    break;
                case 'cloudy':
                    defaultConfig.icon = Mdi.mdiWeatherCloudy;
                    break;
                case 'fog':
                    defaultConfig.icon = Mdi.mdiWeatherFog;
                    break;
                case 'hail':
                    defaultConfig.icon = Mdi.mdiWeatherHail;
                    break;
                case 'lightning':
                    defaultConfig.icon = Mdi.mdiWeatherLightning;
                    break;
                case 'lightning-rainy':
                    defaultConfig.icon = Mdi.mdiWeatherLightningRainy;
                    break;
                case 'partlycloudy':
                    defaultConfig.icon = Mdi.mdiWeatherPartlyCloudy
                    break;
                case 'pouring':
                    defaultConfig.icon = Mdi.mdiWeatherPouring
                    break;
                case 'rainy':
                    defaultConfig.icon = Mdi.mdiWeatherRainy
                    break;
                case 'snowy':
                    defaultConfig.icon = Mdi.mdiWeatherSnowy
                    break;
                case 'snowy-rainy':
                    defaultConfig.icon = Mdi.mdiWeatherSnowyRainy
                    break;
                case 'sunny':
                    defaultConfig.icon = Mdi.mdiWeatherSunny
                    break;
                case 'windy':
                    defaultConfig.icon = Mdi.mdiWeatherWindy
                    break;
                case 'windy-variant':
                    defaultConfig.icon = Mdi.mdiWeatherWindyVariant
                    break;
                default:
                    break;
            }

            return defaultConfig;
        }
    }

    lock = {
        "default": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);

            if (state === 'locked') {
                defaultConfig.icon = Mdi.mdiLock;
                defaultConfig.color = this.colors.ok;
            } else if (state === 'locking') {
                defaultConfig.icon = Mdi.mdiLockClock;
                defaultConfig.color = this.colors.active;
            } else if (state === 'unlocked') {
                defaultConfig.icon = Mdi.mdiLockOpen;
                defaultConfig.color = this.colors.warn;
            } else {
                defaultConfig.icon = Mdi.mdiLockQuestion;
            }

            return defaultConfig;
        }
    }

    vacuum = {
        "default": (state, attributes, templates) => {
            const defaultConfig = this.default(state, attributes, templates);
            defaultConfig.icon = defaultConfig.icon || Mdi.mdiRobotVacuum;
            defaultConfig.templates = ["\n\n{{state}}"]

            if (state === "cleaning") {
                defaultConfig.color = this.colors.active;
            } else if (state === "returning") {
                defaultConfig.color = this.colors.ok;
            } else if (state === "idle" || state === 'docked') {
                defaultConfig.color = this.colors.neutral;
            }

            return defaultConfig;
        }
    }

    #tryGetIconFromAttributes = (attributes) => {
        if (!attributes.icon)
            return;
        const input = attributes.icon
        const parts = input.split(':');
        const camelCaseParts = parts[1].split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1));
        return parts[0] + camelCaseParts.join('');
    }
}
