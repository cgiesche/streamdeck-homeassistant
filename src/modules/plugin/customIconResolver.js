import { iconToSVG } from '@iconify/utils/lib/svg/build'
import { LruCache } from '../common/lruCache.js'

// Failed lookups (e.g. icon not yet defined in HA, transient errors) are retried after this delay
export const FAILURE_RETRY_MS = 60_000

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
    if (cached && !(cached.failedAt && Date.now() - cached.failedAt >= FAILURE_RETRY_MS)) {
      return cached.request
    }

    const generation = this._generation
    const entry = { failedAt: null }
    entry.request = this._loadIcon(parsed.set, parsed.icon)
      .then(renderIcon)
      .catch((error) => {
        if (error?.code === 'unknown_command' && generation === this._generation) {
          this._available = false
        }
        return null
      })
      .then((icon) => {
        if (!icon) entry.failedAt = Date.now()
        return icon
      })

    this._cache.set(key, entry)
    return entry.request
  }
}

export async function applyCustomIcon(renderingConfig, resolver) {
  if (!resolver || !parseIcon(renderingConfig.icon)) return

  renderingConfig.customIcon = await resolver.resolve(renderingConfig.icon)
  if (renderingConfig.customIcon) return

  const fallbackIcon = renderingConfig.fallbackIcon ?? null
  if (parseIcon(fallbackIcon)) {
    // The fallback (e.g. from a custom display config) may itself be a custom icon
    renderingConfig.customIcon = await resolver.resolve(fallbackIcon)
    renderingConfig.icon = renderingConfig.customIcon ? fallbackIcon : null
    return
  }
  renderingConfig.icon = fallbackIcon
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

  if (!isWellFormedSvg(body)) return null

  return {
    body: body.trim(),
    viewBox: values.join(' ')
  }
}

// A malformed body would break the whole button image, so reject it and use the fallback icon instead
function isWellFormedSvg(body) {
  if (typeof DOMParser === 'undefined') return true
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
    'image/svg+xml'
  )
  return doc.getElementsByTagName('parsererror').length === 0
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderPaths(iconData) {
  const primary = iconData.path ? `<path d="${escapeAttribute(iconData.path)}"/>` : ''
  const secondary = iconData.path2
    ? `<path d="${escapeAttribute(iconData.path2)}" opacity=".4"/>`
    : ''
  return `${primary}${secondary}`
}
