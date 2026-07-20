import { iconToSVG } from '@iconify/utils'
import { LruCache } from '../common/lruCache.js'

export function parseIcon(identifier) {
  if (typeof identifier !== 'string') return null

  const [value] = identifier.trim().split('#')
  const separator = value.indexOf(':')
  if (separator <= 0 || separator === value.length - 1) return null

  const prefix = value.substring(0, separator)
  if (prefix === 'mdi' || prefix === 'hue') return null

  return {
    set: prefix,
    icon: value.substring(separator + 1)
  }
}

export function renderIcon(iconData) {
  if (!iconData || typeof iconData !== 'object') return null

  if (iconData.renderer === 'iconify') {
    try {
      const rendered = iconToSVG(iconData)
      return normalizeIcon(rendered.body, rendered.viewBox)
    } catch {
      return null
    }
  }

  return normalizeIcon(iconData.body || renderPaths(iconData), iconData.viewBox)
}

export class CustomIconResolver {
  constructor(loadIcon) {
    this._loadIcon = loadIcon
    this._generation = 0
    this.reset()
  }

  reset() {
    this._generation += 1
    this._cache = new LruCache(100)
    this._available = true
  }

  resolve(identifier) {
    const parsed = parseIcon(identifier)
    if (!parsed || !this._available) return Promise.resolve(null)

    const key = `${parsed.set}:${parsed.icon}`
    const cached = this._cache.get(key)
    if (cached) return cached

    const generation = this._generation
    const request = this._loadIcon(parsed.set, parsed.icon)
      .then(renderIcon)
      .catch((error) => {
        if (error?.code === 'unknown_command' && generation === this._generation) {
          this._available = false
        }
        return null
      })

    this._cache.set(key, request)
    return request
  }
}

export async function applyCustomIcon(renderingConfig, resolver) {
  if (!resolver || !parseIcon(renderingConfig.icon)) return

  renderingConfig.customIcon = await resolver.resolve(renderingConfig.icon)
  if (renderingConfig.customIcon) return

  renderingConfig.icon = renderingConfig.fallbackIcon ?? null
}

function normalizeIcon(body, viewBox) {
  if (typeof body !== 'string' || !body.trim()) return null

  const values = Array.isArray(viewBox)
    ? viewBox.map(Number)
    : String(viewBox ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number)

  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value)) ||
    values[2] <= 0 ||
    values[3] <= 0
  ) {
    return null
  }

  return {
    body: body.trim(),
    viewBox: values.join(' ')
  }
}

function renderPaths(iconData) {
  const primary = iconData.path ? `<path d="${iconData.path}"/>` : ''
  const secondary = iconData.path2 ? `<path d="${iconData.path2}" opacity=".4"/>` : ''
  return `${primary}${secondary}`
}
