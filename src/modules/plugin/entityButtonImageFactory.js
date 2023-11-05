'use strict';
import nunjucks from "nunjucks"
import {SvgUtils} from "./svgUtils";

export class EntityButtonImageFactory {

    constructor(resolution = {width: 144, height: 144}) {
        this.svgUtils = new SvgUtils(resolution);
    }

    createButton(entityConfig) {
        const buttonIcon = entityConfig.hideIcon ? null : entityConfig.icon;
        const buttonLines = this.#applyValuesToTemplates(entityConfig.templates, {...entityConfig.attributes, ...{state: entityConfig.state}});
        return this.svgUtils.generateButtonSVG(buttonLines, buttonIcon, entityConfig.color, entityConfig.isAction, entityConfig.isMultiAction)
    }

    #applyValuesToTemplates(templates, values) {
        return templates ? templates.map(
            template => nunjucks.renderString(template, values)
        ) : []
    }

}
