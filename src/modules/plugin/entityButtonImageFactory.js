import * as Mdi from "@mdi/js";
import nunjucks from "nunjucks"
import {SvgUtils} from "@/modules/plugin/svgUtils";

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

        console.log(`Finding entity-config for ${domain}.${deviceClass}(${state})`)

        if (this[domain] && this[domain][deviceClass]) {
            console.log(`... sucess (device class)!`)
            return this[domain][deviceClass](state, stateAttributes, labelTemplates);
        } else if (this[domain] && this[domain]["default"]) {
            console.log(`... sucess (domain)!`)
            return this[domain]["default"](state, stateAttributes, labelTemplates);
        } else {
            console.log(`... sucess (generic default)!`)
            return this.default(state, stateAttributes, labelTemplates);
        }
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

    light = this.switch

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

            let nonRetardedTemperature = 0 + state;
            if (attributes.unit_of_measurement === "°F") {
                nonRetardedTemperature = nonRetardedTemperature / 1.8
            }

            let color = "#00a400";
            if (nonRetardedTemperature < 5) {
                color = "#3838f8";
            } else if (nonRetardedTemperature > 25) {
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
                customizableDefaultConfig.templates.push("{{temperature}}°C", "{{humidity}}%")
            }

            return customizableDefaultConfig;
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

export class EntityButtonImageFactory {

    svgUtils = new SvgUtils();

    createButton(entityConfig) {
        const buttonLines = this.#applyValuesToTemplates(entityConfig.templates, {...entityConfig.attributes, ...{state: entityConfig.state}});
        return this.svgUtils.generateButtonSVG(buttonLines, entityConfig.icon, entityConfig.color, entityConfig.isAction, entityConfig.isMultiAction)
    }

    #applyValuesToTemplates(templates, values) {
        return templates ? templates.map(
            template => nunjucks.renderString(template, values)
        ) : []
    }

}
