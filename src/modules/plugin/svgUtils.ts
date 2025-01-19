import Snap from 'snapsvg-cjs'
import * as Mdi from '@mdi/js'
import { renderString } from 'nunjucks'
import type { RenderingConfig } from '@/modules/plugin/entityConfigFactoryNg'

export class SvgUtils {
  private buttonRes: { width: number; height: number }
  private halfRes: { width: number; height: number }
  private readonly fontSize: number
  private lineAttr: {
    fill: string
    'font-family': string
    'font-weight': string
    'font-size': string
    'text-anchor': string
    stroke: string
    strokeWidth: number
  }
  private snap: Snap.Paper

  constructor(resolution = { width: 144, height: 144 }) {
    this.buttonRes = resolution
    this.halfRes = {
      width: this.buttonRes.width / 2,
      height: this.buttonRes.height / 2
    }
    this.fontSize = 24
    this.lineAttr = {
      fill: '#FFF',
      'font-family': 'sans-serif',
      'font-weight': 'bold',
      'font-size': `${this.fontSize}px`,
      'text-anchor': 'middle',
      stroke: '#000',
      strokeWidth: 4
    }
    this.snap = Snap(this.buttonRes.width, this.buttonRes.height)
  }

  /**
   * Renders a complete button image based on the given rendering-config.
   * @return string
   */
  renderButtonSVG(
    renderingConfig: Partial<RenderingConfig>,
    stateObject: {
      attributes: object
      state: unknown
    }
  ) {
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
  renderIconSVG(mdiIconName: string | null | undefined, iconColor: string) {
    return this.#generateIconSVG(mdiIconName, iconColor)
  }

  renderTemplates(templates: string[] | null | undefined, values: object) {
    return templates
      ? templates
          .map((template) => (template ? template : ''))
          .map((template) => renderString(template, values))
      : []
  }

  #generateIconSVG(mdiIconName: string | null | undefined, color: string) {
    let iconData = null
    if (mdiIconName) {
      // @ts-expect-error dynamic import of icon based on name
      iconData = Mdi[this.#toPascalCase(mdiIconName)]
    }

    const iconSVG = this.snap.path(iconData)
    iconSVG.attr({ fill: color })
    const iconBBox = iconSVG.getBBox()
    const iconHeight = iconBBox.height
    const iconWidth = iconBBox.width
    const targetHeight = this.buttonRes.height / 1.3
    const targetWidth = this.buttonRes.width / 1.3
    const scaleFactor = Math.min(targetHeight / iconHeight, targetWidth / iconWidth)
    iconSVG.transform(`scale(${scaleFactor})`)

    const outerSVG = this.snap.outerSVG()
    this.snap.clear()
    return outerSVG
  }

  #generateButtonSVG(
    labels: string[],
    mdiIconName: string | null | undefined,
    iconColor: string | null | undefined,
    isAction = false,
    isMultiAction = false
  ) {
    let iconData = null
    if (mdiIconName) {
      // @ts-expect-error dynamic import of icon based on name
      iconData = Mdi[this.#toPascalCase(mdiIconName)]
    }

    if (iconData) {
      const iconSVG = this.snap.path(iconData)
      iconSVG.attr({ fill: iconColor })
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
      this.snap.circle(this.buttonRes.width - 1, 0, 15).attr({ fill: color })
    }

    let currentLineNumber = 0
    for (let i = 0; i < labels.length; i++) {
      const lines = labels[i].split('\n')
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

    const outerSVG = this.snap.outerSVG()
    this.snap.clear()
    return outerSVG
  }

  #drawText(text: string, lineNr: number) {
    const escapedText = encodeURIComponent(text)
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

  #toPascalCase = (iconName: string) => {
    const iconNameRaw = iconName.substring(4)
    const iconNamePascalCase = iconNameRaw.replace(/(^\w|-\w)/g, this.#clearAndUpper)
    return 'mdi' + iconNamePascalCase
  }

  #clearAndUpper = (text: string) => {
    return text.replace(/-/, '').toUpperCase()
  }
}
