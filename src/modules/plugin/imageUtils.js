import nunjucks from "nunjucks"
import {SvgUtils} from "@/modules/plugin/svgUtils";
import * as Mdi from "@mdi/js";

const colors = {
    action: "#FFFFFF",
    passive: "#bbbbbb",
    active: "#e9b200",
    bg: "#4E4E61",
    bgRed: "#700300",
    bgBlue: "#003d70"
};

const svgUtils = new SvgUtils();

export const IconFactory = {

    getS: function (iconName) {
        const iconNameRaw = iconName.substring(4)
        const iconNamePascalCase = iconNameRaw.replace(/(^\w|-\w)/g, IconFactory.clearAndUpper)
        return "mdi" + iconNamePascalCase;
    },

    clearAndUpper: function (text) {
        return text.replace(/-/, "").toUpperCase();
    },

    default: (state, attributes, labelTemplates) => {
        const lines = IconFactory.applyValues(labelTemplates, {...attributes, ...{state}})
        var icon = null;
        if (attributes.icon) {
            icon = Mdi[IconFactory.getS(attributes.icon)];
        }
        return svgUtils.generateButtonSVG(lines, icon, colors.active)
    },

    "switch": {
        default: (state, attributes, labelTemplates) => {
            const lines = IconFactory.applyValues(labelTemplates, {...attributes, ...{state}})

            let icon;
            let color;
            if (state === "on") {
                icon = Mdi.mdiToggleSwitch
                color = colors.active
            } else {
                icon = Mdi.mdiToggleSwitchOff;
                color = colors.passive
            }
            return svgUtils.generateButtonSVG(lines, icon, color)
        }
    },

    "light": {
        default: (state, attributes, labelTemplates) => {
            return IconFactory.switch.default(state, attributes, labelTemplates);
        }
    },

    "input_boolean": {
        default: (state, attributes, labelTemplates) => {
            return IconFactory.switch.default(state, attributes, labelTemplates);
        }
    },

    sensor: {
        _defaultLabelTemplate: [
            "",
            "",
            "{{state}} {{unit_of_measurement}}"
        ],

        battery: (state, attributes, labelTemplate) => {
            return IconFactory.default(state, attributes, labelTemplate || IconFactory.sensor._defaultLabelTemplate)
        },

    },

    applyValues: (labelTemplates, values) => {
        return labelTemplates ? labelTemplates.map(
            template => nunjucks.renderString(template, values)
        ) : []
    }
}
