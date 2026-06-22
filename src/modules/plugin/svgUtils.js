import * as Mdi from '@mdi/js'
import nunjucks from 'nunjucks'
import { trimBlankLabelLines } from '../common/labelLines.js'

export const WIDTH = 288
export const HEIGHT = 288
const BG_OVERLAY_OPACITY = 0.55

export class SvgUtils {
  renderButtonSVG(renderingConfig, stateObject) {
    const labels = this.renderTemplates(renderingConfig.labelTemplates, {
      ...stateObject.attributes,
      state: stateObject.state
    })
    return this.#generateButtonSVG(
      labels,
      renderingConfig.icon,
      renderingConfig.color,
      renderingConfig.isAction,
      renderingConfig.isMultiAction,
      renderingConfig.iconLayout ?? 'STANDARD',
      renderingConfig.backgroundImage ?? null,
      renderingConfig.labelFontSize ?? 48,
      renderingConfig.backgroundColor ?? null,
      renderingConfig.backgroundColorEnd ?? null
    )
  }

  renderIconSVG(mdiIconName, iconColor) {
    const path = this.#getMdiPath(mdiIconName)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 24 24">${path ? `<path d="${path}" fill="${iconColor ?? '#FFF'}"/>` : ''}</svg>`
  }

  renderTemplates(templates, values) {
    return templates?.map((template) => nunjucks.renderString(template ?? '', values)) ?? []
  }

  #generateButtonSVG(
    labels,
    mdiIconName,
    iconColor,
    isAction = false,
    isMultiAction = false,
    iconLayout = 'STANDARD',
    backgroundImage = null,
    fontSize = 48,
    backgroundColor = null,
    backgroundColorEnd = null
  ) {
    let defsSvg = ''
    let bgColorSvg = ''
    if (backgroundColor && backgroundColorEnd) {
      defsSvg =
        `<defs><radialGradient id="bgGrad" cx="0%" cy="0%" r="141%">` +
        `<stop offset="0%" stop-color="${backgroundColor}"/>` +
        `<stop offset="100%" stop-color="${backgroundColorEnd}"/>` +
        `</radialGradient></defs>`
      bgColorSvg = `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>`
    } else if (backgroundColor) {
      bgColorSvg = `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${backgroundColor}"/>`
    }

    const backgroundSvg = backgroundImage
      ? `<image href="${backgroundImage}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice"/>` +
        `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="rgba(0,0,0,${BG_OVERLAY_OPACITY})"/>`
      : ''

    const iconPath = this.#getMdiPath(mdiIconName)

    let iconTransform, maxLines, labelIndexOffset
    if (!iconPath || iconLayout === 'FULL') {
      iconTransform = `translate(0, 0) scale(12)`
      maxLines = 4
      labelIndexOffset = 0
    } else if (iconLayout === 'BOTTOM') {
      iconTransform = `translate(72, 144) scale(6)`
      maxLines = 2
      labelIndexOffset = 0
    } else {
      iconTransform = `translate(72, 0) scale(6)`
      maxLines = 2
      labelIndexOffset = 2
    }

    const iconSvg = iconPath
      ? `<g transform="${iconTransform}"><path d="${iconPath}" fill="${iconColor ?? '#FFF'}"/></g>`
      : ''

    const indicatorColor = isMultiAction ? '#3e89ff' : '#62ff65'
    const indicator = isAction
      ? `<circle cx="${WIDTH - 1}" cy="0" r="30" fill="${indicatorColor}"/>`
      : ''

    const quarterOfArea = HEIGHT / 4
    let flatLabels = labels.flatMap((label) => label.split('\n'))
    if (maxLines === 2) {
      flatLabels = trimBlankLabelLines(flatLabels, maxLines)
    }
    const textLines = flatLabels
      .slice(0, maxLines)
      .map((line, i) => {
        const y = quarterOfArea - (quarterOfArea * 1.2 - fontSize) / 2 + (i + labelIndexOffset) * quarterOfArea
        const escaped = this.#escapeXml(line)
        const baseAttrs = `x="${WIDTH / 2}" y="${y}" font-family="sans-serif" font-weight="bold" font-size="${fontSize}px" text-anchor="middle"`
        if (iconLayout === 'FULL') {
          return (
            `<text ${baseAttrs} fill="#000" stroke="#000" stroke-width="10" stroke-linejoin="round">${escaped}</text>` +
            `<text ${baseAttrs} fill="#FFF">${escaped}</text>`
          )
        }
        return `<text ${baseAttrs} fill="#FFF">${escaped}</text>`
      })

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${defsSvg}${bgColorSvg}${backgroundSvg}${iconSvg}${indicator}${textLines.join('')}</svg>`
  }

  #getMdiPath(mdiIconName) {
    if (!mdiIconName) return null
    return Mdi[this.#toPascalCase(mdiIconName)] ?? null
  }

  #toPascalCase(iconName) {
    return (
      'mdi' + iconName.substring(4).replace(/(^\w|-\w)/g, (s) => s.replace(/-/, '').toUpperCase())
    )
  }

  svgToImageDataUri(svg, transparent = false) {
    return new Promise((resolve) => {
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
      const blobUrl = URL.createObjectURL(svgBlob)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(blobUrl)
        const canvas = document.createElement('canvas')
        canvas.width = WIDTH
        canvas.height = HEIGHT
        canvas.getContext('2d').drawImage(img, 0, 0)
        // JPEG has no alpha channel -> transparent areas become black. Use PNG
        // when no background so "none" stays transparent instead of black.
        resolve(transparent ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92))
      }
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl)
        resolve('data:image/svg+xml;,' + svg)
      }
      img.src = blobUrl
    })
  }

  #escapeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
