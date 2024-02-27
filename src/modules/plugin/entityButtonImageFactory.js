'use strict'
import nunjucks from 'nunjucks'
import { SvgUtils } from './svgUtils'
import * as Mdi from '@mdi/js'

export class EntityButtonImageFactory {

  constructor(resolution = { width: 144, height: 144 }) {
    this.svgUtils = new SvgUtils(resolution)
  }

  renderButtonSVG(renderingConfig, stateObject) {
    let icon = null
    if (renderingConfig.icon) {
      icon = Mdi[this.#toPascalCase(renderingConfig.icon)]
    }
    const buttonLines = this.#applyValuesToTemplates(renderingConfig.labelTemplates, { ...stateObject.attributes, ...{ state: stateObject.state } })
    return this.svgUtils.generateButtonSVG(buttonLines, icon, renderingConfig.color, renderingConfig.isAction, renderingConfig.isMultiAction)
  }

  #applyValuesToTemplates(templates, values) {
    return templates ? templates
      .map(template => template ? template : "")
      .map(
      template => nunjucks.renderString(template, values)
    ) : []
  }

  #toPascalCase = (iconName) => {
    const iconNameRaw = iconName.substring(4)
    const iconNamePascalCase = iconNameRaw.replace(/(^\w|-\w)/g, this.#clearAndUpper)
    return 'mdi' + iconNamePascalCase
  }

  #clearAndUpper = (text) => {
    return text.replace(/-/, '').toUpperCase()
  }

}
