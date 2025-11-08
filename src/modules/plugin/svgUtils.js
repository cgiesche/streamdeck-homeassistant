import Snap from 'snapsvg-cjs'
import { urlencode } from 'nunjucks/src/filters'
import * as Mdi from '@mdi/js'
import nunjucks from 'nunjucks'

export class SvgUtils {
  constructor(resolution = { width: 288, height: 288 }) {
    this.buttonRes = resolution
    this.halfRes = {
      width: this.buttonRes.width / 2,
      height: this.buttonRes.height / 2
    }
    this.fontSize = 48
    this.lineAttr = {
      fill: '#FFF',
      'font-family': 'sans-serif',
      'font-weight': 'bold',
      'font-size': `${this.fontSize}px`,
      'text-anchor': 'middle'
    }
    this.snap = Snap(this.buttonRes.width, this.buttonRes.height)
  }

  /**
   * Renders a complete button image based on the given rendering-config.
   * @return string
   */
  renderButtonSVG(renderingConfig, stateObject) {
    const buttonLabels = this.renderTemplates(renderingConfig.labelTemplates, {
      ...stateObject.attributes,
      ...{ state: stateObject.state }
    })
    return this.#generateButtonSVG(
      buttonLabels,
      renderingConfig.icon,
      renderingConfig.color,
      renderingConfig.isAction,
      renderingConfig.isMultiAction
    )
  }

  /**
   * Renders the given MDI as SVG.
   * @return string
   */
  renderIconSVG(mdiIconName, iconColor) {
    return this.#generateIconSVG(mdiIconName, iconColor)
  }

  renderTemplates(templates, values) {
    return templates
      ? templates
          .map((template) => (template ? template : ''))
          .map((template) => nunjucks.renderString(template, values))
      : []
  }

  #generateIconSVG(mdiIconName, color) {
    let iconData = null
    if (mdiIconName) {
      iconData = Mdi[this.#toPascalCase(mdiIconName)]
    }

    const iconSVG = this.snap.path(iconData)
    iconSVG.attr('fill', color)
    const iconBBox = iconSVG.getBBox()
    const iconHeight = iconBBox.height
    const iconWidth = iconBBox.width
    const targetHeight = this.buttonRes.height / 1.3
    const targetWidth = this.buttonRes.width / 1.3
    const scaleFactor = Math.min(targetHeight / iconHeight, targetWidth / iconWidth)
    iconSVG.transform(`scale(${scaleFactor})`)

    let outerSVG = this.snap.outerSVG()
    this.snap.clear()
    return outerSVG
  }

  #generateButtonSVG(labels, mdiIconName, iconColor, isAction = false, isMultiAction = false) {
    let iconData = null
    if (mdiIconName) {
      iconData = Mdi[this.#toPascalCase(mdiIconName)]
    }

    if (iconData) {
      const iconSVG = this.snap.path(iconData)
      iconSVG.attr('fill', iconColor)
      const iconBBox = iconSVG.getBBox()
      const iconHeight = iconBBox.height
      const iconWidth = iconBBox.width
      const targetHeight = this.halfRes.height / 1.2
      const targetWidth = this.buttonRes.width / 1.3
      const scaleFactor = Math.min(targetHeight / iconHeight, targetWidth / iconWidth)
      const xPos = (this.buttonRes.width - iconWidth * scaleFactor) / 2 - iconBBox.x * scaleFactor
      const yPos = (this.halfRes.height - iconHeight * scaleFactor) / 2 - iconBBox.y * scaleFactor
      iconSVG.transform(`translate(${xPos} ${yPos}) scale(${scaleFactor})`)
    }

    if (isAction) {
      const color = isMultiAction ? '#3e89ff' : '#62ff65'
      this.snap.circle(this.buttonRes.width - 1, 0, 30).attr('fill', color)
    }

    let currentLineNumber = 0
    for (let i = 0; i < labels.length; i++) {
      let lines = labels[i].split('\n')
      for (let i = currentLineNumber; i < lines.length + currentLineNumber; i++) {
        this.#drawText(lines[i - currentLineNumber], i)
      }
      currentLineNumber += lines.length
    }

    // Debug Grid
    // this.snap.line(this.halfRes, 0, this.halfRes, this.buttonRes).attr("stroke", "#FFFFFF")
    // this.snap.line(this.halfRes / 2, 0, this.halfRes / 2, this.buttonRes).attr("stroke", "#FFFFFF")
    // this.snap.line(this.halfRes * 1.5, 0, this.halfRes * 1.5, this.buttonRes).attr("stroke", "#FFFFFF")
    // this.snap.line(0, this.halfRes, this.buttonRes, this.halfRes).attr("stroke", "#FFFFFF")
    // this.snap.line(0, this.halfRes / 2, this.buttonRes, this.halfRes / 2).attr("stroke", "#FFFFFF")
    // this.snap.line(0, this.halfRes * 1.5, this.buttonRes, this.halfRes * 1.5).attr("stroke", "#FFFFFF")

    let outerSVG = this.snap.outerSVG()
    this.snap.clear()
    return outerSVG
  }

  #drawText(text, lineNr) {
    const escapedText = urlencode(text)
    const quarterHeight = this.buttonRes.height / 4
    this.snap
      .text(
        0,
        quarterHeight - (quarterHeight * 1.2 - this.fontSize) / 2 + lineNr * quarterHeight,
        escapedText
      )
      .attr(this.lineAttr)
      .transform(`translateX(${this.halfRes.width})`)
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
