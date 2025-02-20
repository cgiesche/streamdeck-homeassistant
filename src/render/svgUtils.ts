import * as Mdi from '@mdi/js'
import { SVG, type Svg, registerWindow } from '@svgdotjs/svg.js'
import type { HassEntity } from 'home-assistant-js-websocket'
import { renderString } from 'nunjucks'
import { createSVGWindow } from 'svgdom'

import type { RenderingConfig } from '@/models/renderConfig'

export class SvgUtils {
  private readonly buttonRes = { width: 144, height: 144 }
  private readonly fontSize = 24
  private readonly lineAttr = {
    fill: '#FFF',
    'font-family': 'sans-serif',
    'font-weight': 'bold',
    'font-size': `${this.fontSize}px`,
    'text-anchor': 'middle',
    stroke: '#000'
  }
  private readonly canvas: Svg

  constructor() {
    const window = createSVGWindow()
    const document = window.document
    registerWindow(window, document)
    this.canvas = SVG(document.documentElement) as Svg
    this.canvas.size(this.buttonRes.width, this.buttonRes.height)
  }

  /**
   * Renders a complete button image based on the given rendering-config.
   */
  renderButtonSVG(
    renderingConfig: RenderingConfig,
    stateObject: AtLeast<HassEntity, 'attributes' | 'state'>
  ) {
    const buttonLabels = this.renderTemplates(renderingConfig.labelTemplates, {
      ...stateObject.attributes,
      state: stateObject.state
    })
    return this.generateButtonSVG(
      buttonLabels,
      renderingConfig.icon,
      renderingConfig.color,
      renderingConfig.isAction,
      renderingConfig.isMultiAction
    )
  }

  /**
   * Renders the given MDI as SVG.
   */
  renderIconSVG(mdiIconName: Nullable<string>, iconColor: string) {
    return this.generateIconSVG(mdiIconName, iconColor)
  }

  renderTemplates(templates: Nullable<string[]>, values: object) {
    return templates
      ? templates
          .map((template) => (template ? template : ''))
          .map((template) => renderString(template, values))
      : []
  }

  private generateIconSVG(mdiIconName: Nullable<string>, color: string) {
    let iconData: Nullable<string> = null
    if (mdiIconName) {
      // @ts-expect-error dynamic import of icon based on name
      // eslint-disable-next-line import/namespace
      iconData = Mdi[this.toPascalCase(mdiIconName)] as Nullable<string>
    }

    if (iconData) {
      const iconSVG = this.canvas.path(iconData)
      iconSVG.fill(color)
      const iconBBox = iconSVG.bbox()
      const targetHeight = this.buttonRes.height / 1.3
      const targetWidth = this.buttonRes.width / 1.3
      const scaleFactor = Math.min(targetHeight / iconBBox.height, targetWidth / iconBBox.width)
      iconSVG.center(this.buttonRes.width / 2, this.buttonRes.height / 2)
      iconSVG.scale(scaleFactor)
    }

    const outerSVG = this.canvas.svg().replaceAll('%', '&#37;')
    this.canvas.clear()
    return outerSVG
  }

  private generateButtonSVG(
    labels: string[],
    mdiIconName: Nullable<string>,
    iconColor: string,
    isAction = false,
    isMultiAction = false
  ) {
    let iconData: Nullable<string> = null
    if (mdiIconName) {
      // @ts-expect-error dynamic import of icon based on name
      // eslint-disable-next-line import/namespace
      iconData = Mdi[this.toPascalCase(mdiIconName)] as Nullable<string>
    }

    if (iconData) {
      const iconSVG = this.canvas.path(iconData)
      iconSVG.fill(iconColor)
      const iconBBox = iconSVG.bbox()
      const targetHeight = this.buttonRes.height / 2 / 1.2
      const targetWidth = this.buttonRes.width / 1.3
      const scaleFactor = Math.min(targetHeight / iconBBox.height, targetWidth / iconBBox.width)
      iconSVG.center(this.buttonRes.width / 2, this.buttonRes.height / 4)
      iconSVG.scale(scaleFactor)
    }

    if (isAction) {
      const color = isMultiAction ? '#3e89ff' : '#62ff65'
      this.canvas
        .circle(30)
        .center(this.buttonRes.width - 1, 0)
        .fill(color)
    }

    let currentLineNumber = 0
    for (let i = 0; i < labels.length; i++) {
      const lines = labels[i].split('\n')
      for (let i = currentLineNumber; i < lines.length + currentLineNumber; i++) {
        this.drawText(lines[i - currentLineNumber], i)
      }
      currentLineNumber += lines.length
    }

    // Debug Grid
    // this.canvas.line(this.halfRes.width, 0, this.halfRes.width, this.buttonRes.height).stroke("#FFFFFF")
    // this.canvas.line(this.halfRes.width / 2, 0, this.halfRes.width / 2, this.buttonRes.height).stroke("#FFFFFF")
    // this.canvas.line(this.halfRes.width * 1.5, 0, this.halfRes.width * 1.5, this.buttonRes.height).stroke("#FFFFFF")
    // this.canvas.line(0, this.halfRes.height, this.buttonRes.width, this.halfRes.height).stroke("#FFFFFF")
    // this.canvas.line(0, this.halfRes.width / 2, this.buttonRes.width, this.halfRes.height / 2).stroke("#FFFFFF")
    // this.canvas.line(0, this.halfRes.width * 1.5, this.buttonRes.width, this.halfRes.height * 1.5).stroke("#FFFFFF")

    const outerSVG = this.canvas.svg().replaceAll('%', '&#37;')
    this.canvas.clear()
    return outerSVG
  }

  private drawText(text: string, lineNr: number) {
    if (text.length === 0) return

    const quarterHeight = this.buttonRes.height / 4
    this.canvas
      .text(text)
      .center(0, quarterHeight - (quarterHeight * 1.2 - this.fontSize) / 2 + lineNr * quarterHeight)
      .attr(this.lineAttr)
      .translate(this.buttonRes.width / 2, 0)
  }

  private toPascalCase(iconName: string) {
    const iconNameRaw = iconName.substring(4)
    const iconNamePascalCase = iconNameRaw.replace(/(^\w|-\w)/g, this.clearAndUpper)
    return 'mdi' + iconNamePascalCase
  }

  private clearAndUpper = (text: string) => text.replace(/-/, '').toUpperCase()
}
