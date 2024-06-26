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
        const iconString = this.#tryGetIconFromAttributes(attributes);
        let icon = null;
        let color = this.colors.unavailable;

        if (state) {
            color = this.colors.neutral;
        }

        if (iconString) {
            icon = Mdi[iconString]
        }
        if (!templates) {
            templates = []
            if (icon) {
                templates.push(" ", " ")
            }
            templates.push("{{state}}")
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
            let icon = Mdi.mdiToggleSwitchOff;
            let color = this.colors.unavailable;

            if (state === 'on') {
                icon = Mdi.mdiToggleSwitch
                color = this.colors.active
            } else if (state === 'off') {
                color = this.colors.passive;
            }

            return {
                state,
                attributes,
                templates,
                icon,
                color
            }
        }
    }

    light = {
        "default": (state, attributes, templates) => {
            let entityConfig = this.switch.default(state, attributes, templates);

            if (attributes.supported_color_modes && attributes.supported_color_modes.includes("brightness")) {
                entityConfig.rotationPercent = (attributes.brightness / 255.0) * 100;
                entityConfig.icon = Mdi.mdiLightbulbOff;
                if (state == 'on') {
                    if (entityConfig.rotationPercent > 90) {
                        entityConfig.icon = Mdi.mdiLightbulbOn;
                    } else if (entityConfig.rotationPercent > 80) {
                        entityConfig.icon = Mdi.mdiLightbulbOn90;
                    } else if (entityConfig.rotationPercent > 70) {
                        entityConfig.icon = Mdi.mdiLightbulbOn80;
                    } else if (entityConfig.rotationPercent > 60) {
                        entityConfig.icon = Mdi.mdiLightbulbOn70;
                    } else if (entityConfig.rotationPercent > 50) {
                        entityConfig.icon = Mdi.mdiLightbulbOn60;
                    } else if (entityConfig.rotationPercent > 40) {
                        entityConfig.icon = Mdi.mdiLightbulbOn50;
                    } else if (entityConfig.rotationPercent > 30) {
                        entityConfig.icon = Mdi.mdiLightbulbOn40;
                    } else if (entityConfig.rotationPercent > 20) {
                        entityConfig.icon = Mdi.mdiLightbulbOn30;
                    } else if (entityConfig.rotationPercent > 10) {
                        entityConfig.icon = Mdi.mdiLightbulbOn20;
                    } else {
                        entityConfig.icon = Mdi.mdiLightbulbOn10;
                    }
                }
                
                entityConfig.feedbackLayout = { layout: "$B1" };
                entityConfig.feedback = {
                    value: Math.ceil(entityConfig.rotationPercent) + "%",
                    indicator: Math.ceil(entityConfig.rotationPercent)
                };
            }

            return entityConfig;
        }
    }

    input_boolean = this.switch

    "binary_sensor" = {
        "default": (state, attributes, templates) => {
            let icon;
            let color = this.colors.unavailable;

            if (state === 'on') {
                icon = Mdi.mdiCircleSlice8
                color = this.colors.active
            } else if (state === 'off') {
                icon = Mdi.mdiCircleOutline
                color = this.colors.passive
            }

            return {
                state,
                attributes,
                templates,
                icon,
                color
            }
        },

        "plug": (state, attributes, templates) => {
            const customizableDefaultConfig = this.binary_sensor.default(state, attributes, templates);

            if (state === 'on') {
                customizableDefaultConfig.icon = Mdi.mdiPowerPlugOutline
            } else if (state === 'off') {
                customizableDefaultConfig.icon = Mdi.mdiPowerPlugOffOutline
            }

            return customizableDefaultConfig;
        },

        "window": (state, attributes, templates) => {
            const customizableDefaultConfig = this.binary_sensor.default(state, attributes, templates);

            if (state === 'on') {
                customizableDefaultConfig.icon = Mdi.mdiWindowOpenVariant
            } else if (state === 'off') {
                customizableDefaultConfig.icon = Mdi.mdiWindowClosedVariant
            }

            return customizableDefaultConfig;
        }
    }
    "cover" = {
        "garage": (state, attributes, templates) => {
            let icon;
            let color = this.colors.unavailable;

            if (state === 'open') {
                icon = Mdi.mdiGarageOpen
                color = this.colors.active
            } else if (state === 'closed') {
                icon = Mdi.mdiGarage
                color = this.colors.passive
            } else if (state === 'closing') {
                icon = Mdi.mdiArrowDownBox
                color = this.colors.active
            } else if (state === 'opening') {
                icon = Mdi.mdiArrowUpBox
                color = this.colors.active
            }

            return {
                state,
                attributes,
                templates,
                icon,
                color
            }
        }
    }
    sensor = {
        "humidity": (state, attributes, templates) => {
            const icon = Mdi.mdiWaterPercent;
            let color = "#3f3fdb";

            if (!templates) {
                templates = [" ", " ", "{{state}}{{unit_of_measurement}}"]
            }

            return {
                state,
                attributes,
                templates,
                icon,
                color
            }
        },

        "temperature": (state, attributes, templates) => {
            const icon = Mdi.mdiThermometer;

            let temperature = 0 + state;
            if (attributes.unit_of_measurement === "°F") {
                temperature = (temperature - 32) * 5 / 9;
            }

            let color = "#00a400";
            if (temperature < 5) {
                color = "#3838f8";
            } else if (temperature > 25) {
                color = "#fa4848";
            }

            if (!templates) {
                templates = [" ", " ", "{{state}}{{unit_of_measurement}}"]
            }

            return {
                state,
                attributes,
                templates,
                icon,
                color
            }
        },

        "battery": (state, attributes, templates) => {
            const customizableDefaultConfig = this.default(state, attributes, templates);

            let levelColor;
            if (state < 15) {
                levelColor = "#FF0000"
            } else if (state < 30) {
                levelColor = "#ff8600"
            } else {
                levelColor = "#00a400"
            }
            customizableDefaultConfig.color = levelColor;

            if (!templates) {
                customizableDefaultConfig.templates = []
                if (customizableDefaultConfig.icon) {
                    customizableDefaultConfig.templates.push(" ", " ")
                }
                customizableDefaultConfig.templates.push("{{state}}{{unit_of_measurement}}")
            }

            return customizableDefaultConfig;
        },

        "power": (state, attributes, templates) => {
            const customizableDefaultConfig = this.default(state, attributes, templates);

            customizableDefaultConfig.icon = Mdi.mdiFlash

            if (!templates) {
                customizableDefaultConfig.templates = [" ", " ", "{{state}}W"]
            }

            return customizableDefaultConfig;
        },

    }

    weather = {
        "default": (state, attributes, templates) => {
            const customizableDefaultConfig = this.default(state, attributes, templates);

            customizableDefaultConfig.color = this.colors.neutral;

            switch (state) {
                case 'clear-night':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherNight;
                    break;
                case 'cloudy':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherCloudy;
                    break;
                case 'fog':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherFog;
                    break;
                case 'hail':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherHail;
                    break;
                case 'lightning':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherLightning;
                    break;
                case 'lightning-rainy':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherLightningRainy;
                    break;
                case 'partlycloudy':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherPartlyCloudy
                    break;
                case 'pouring':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherPouring
                    break;
                case 'rainy':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherRainy
                    break;
                case 'snowy':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherSnowy
                    break;
                case 'snowy-rainy':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherSnowyRainy
                    break;
                case 'sunny':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherSunny
                    break;
                case 'windy':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherWindy
                    break;
                case 'windy-variant':
                    customizableDefaultConfig.icon = Mdi.mdiWeatherWindyVariant
                    break;
                default:
                    break;
            }

            if (!templates) {
                customizableDefaultConfig.templates = []
                if (customizableDefaultConfig.icon) {
                    customizableDefaultConfig.templates.push(" ", " ")
                }
                customizableDefaultConfig.templates.push("{{temperature}}{{temperature_unit | default('°C')}}", "{{humidity}}%")
            }

            return customizableDefaultConfig;
        }
    }

    lock = {
        "default": (state, attributes, templates) => {
            let icon = Mdi.mdiLockQuestion;
            let color = this.colors.unavailable;

            if (state === 'locked') {
                icon = Mdi.mdiLock;
                color = this.colors.ok;
            } else if (state === 'locking') {
                icon = Mdi.mdiLockClock;
                color = this.colors.active;
            } else if (state === 'unlocked') {
                icon = Mdi.mdiLockOpen;
                color = this.colors.warn;
            }

            return {
                state,
                attributes,
                templates,
                icon,
                color
            }
        }
    }

    "media_player" = {
        "default": (state, attributes, templates) => {
            let icon = Mdi.mdiVolumeOff;
            let color = this.colors.passive;
            let rotationPercent = 0;

            if (state !== "off") {
                if (attributes.is_volume_muted) {
                    icon = Mdi.mdiVolumeMute;
                } else {
                    color = this.colors.active;
                    rotationPercent = attributes.volume_level * 100;
                    if (rotationPercent > 66) {
                        icon = Mdi.mdiVolumeHigh;
                    } else if (rotationPercent > 33) {
                        icon = Mdi.mdiVolumeMedium;
                    } else {
                        icon = Mdi.mdiVolumeLow;
                    }
                }
            }

            let feedbackLayout = { layout: "$B1" };
            let feedback = {
                value: Math.ceil(rotationPercent) + "%",
                indicator: Math.ceil(rotationPercent)
            };

            return {
                state,
                attributes,
                templates,
                icon,
                color,
                feedbackLayout,
                feedback,
                rotationPercent
            }
        }
    }

    vacuum = {
        "default": (state, attributes, templates) => {
            const icon = Mdi.mdiRobotVacuum;
            let color = this.colors.unavailable;

            if (state === "cleaning") {
                color = this.colors.active;
            } else if (state === "returning") {
                color = this.colors.ok;
            } else if (state === "idle" || state === 'docked') {
                color = this.colors.passive;
            }

            if (!templates) {
                templates = [" ", " ", "{{state}}"]
            }

            return {
                state,
                attributes,
                templates,
                icon,
                color
            }
        }
    }

    #tryGetIconFromAttributes = (attributes) => {
        const mdiIcon = attributes.icon;
        return mdiIcon ? this.#toPascalCase(mdiIcon) : null;
    }

    #toPascalCase = (iconName) => {
        const iconNameRaw = iconName.substring(4)
        const iconNamePascalCase = iconNameRaw.replace(/(^\w|-\w)/g, this.#clearAndUpper)
        return "mdi" + iconNamePascalCase;
    }

    #clearAndUpper = (text) => {
        return text.replace(/-/, "").toUpperCase();
    }

}
