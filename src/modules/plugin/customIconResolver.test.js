import { describe, it, expect, vi } from 'vitest'
import { Homeassistant } from '../homeassistant/homeassistant.js'
import { EntityConfigFactory } from './entityConfigFactoryNg.js'
import { CustomIconResolver, applyCustomIcon, parseIcon, renderIcon } from './customIconResolver.js'

const iconData = {
  body: '<path d="M0 0h32v16z"/>',
  viewBox: [0, 0, 32, 16]
}

describe('custom icon data', () => {
  it('parses custom identifiers but leaves built-in icons local', () => {
    expect(parseIcon('mdi:lightbulb')).toBeNull()
    expect(parseIcon('hue:adore')).toBeNull()
    expect(parseIcon('lightbulb')).toBeNull()
    expect(parseIcon('custom-set:icon#variant')).toEqual({ set: 'custom-set', icon: 'icon' })
  })

  it('handles SVG bodies and path-only responses', () => {
    expect(renderIcon(iconData)).toEqual({ body: iconData.body, viewBox: '0 0 32 16' })
    expect(
      renderIcon({ path: 'M0 0h16v16z', path2: 'M4 4h8v8z', viewBox: [0, 0, 16, 16] })
    ).toEqual({
      body: '<path d="M0 0h16v16z"/><path d="M4 4h8v8z" opacity=".4"/>',
      viewBox: '0 0 16 16'
    })
    expect(renderIcon({ body: '<path/>', viewBox: [0, 0, 0, 16] })).toBeNull()
  })

  it('applies Iconify rotation and flip metadata', () => {
    const icon = renderIcon({
      renderer: 'iconify',
      body: '<path d="M0 0h16v8z"/>',
      width: 16,
      height: 8,
      rotate: 1,
      hFlip: true
    })

    expect(icon.viewBox).toBe('0 0 8 16')
    expect(icon.body).toContain('<g transform=')
  })
})

describe('CustomIconResolver', () => {
  it('uses the Home Assistant command once for concurrent and repeated requests', async () => {
    const sendMessagePromise = vi.fn(async () => iconData)
    const homeAssistant = Object.create(Homeassistant.prototype)
    homeAssistant._connection = { sendMessagePromise }
    const resolver = new CustomIconResolver((set, icon) => homeAssistant.getCustomIcon(set, icon))

    await Promise.all([resolver.resolve('custom-set:icon'), resolver.resolve('custom-set:icon')])
    await resolver.resolve('custom-set:icon')

    expect(sendMessagePromise).toHaveBeenCalledOnce()
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'custom_icons/icon',
      set: 'custom-set',
      icon: 'icon'
    })
  })

  it('caches failures and retries after a reset', async () => {
    const missingIcon = vi.fn(async () => {
      throw { code: 'not_found' }
    })
    const missingResolver = new CustomIconResolver(missingIcon)
    await missingResolver.resolve('custom-set:missing')
    await missingResolver.resolve('custom-set:missing')
    expect(missingIcon).toHaveBeenCalledOnce()

    const unavailable = vi.fn(async () => {
      throw { code: 'unknown_command' }
    })
    const unavailableResolver = new CustomIconResolver(unavailable)
    await unavailableResolver.resolve('custom-set:first')
    await unavailableResolver.resolve('custom-set:second')
    expect(unavailable).toHaveBeenCalledOnce()

    unavailable.mockResolvedValue(iconData)
    unavailableResolver.reset()
    expect(await unavailableResolver.resolve('custom-set:second')).not.toBeNull()
    expect(unavailable).toHaveBeenCalledTimes(2)
  })

  it('subscribes to Home Assistant lifecycle events', async () => {
    const callback = vi.fn()
    const subscribeEvents = vi.fn(async () => vi.fn())
    const homeAssistant = Object.create(Homeassistant.prototype)
    homeAssistant._connection = { subscribeEvents }

    await homeAssistant.subscribeEvent('homeassistant_started', callback)

    expect(subscribeEvents).toHaveBeenCalledWith(callback, 'homeassistant_started')
  })

  it('ignores unavailable results from before a reset', async () => {
    let rejectRequest
    const loadIcon = vi.fn(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        })
    )
    const resolver = new CustomIconResolver(loadIcon)
    const staleRequest = resolver.resolve('custom-set:first')

    resolver.reset()
    rejectRequest({ code: 'unknown_command' })
    await staleRequest
    loadIcon.mockResolvedValue(iconData)

    expect(await resolver.resolve('custom-set:second')).not.toBeNull()
    expect(loadIcon).toHaveBeenCalledTimes(2)
  })
})

describe('applyCustomIcon', () => {
  it('uses a resolved icon and falls back to the plugin icon when missing', async () => {
    const resolvedIcon = renderIcon(iconData)
    const renderingConfig = { icon: 'custom-set:icon' }
    await applyCustomIcon(renderingConfig, { resolve: vi.fn(async () => resolvedIcon) })
    expect(renderingConfig.customIcon).toEqual(resolvedIcon)

    const factory = new EntityConfigFactory()
    factory.getConfig = () => ({ icon: 'mdi:lightbulb', labelTemplates: [] })
    const fallbackConfig = factory.determineConfig(
      'light',
      { state: 'on', attributes: { icon: 'custom-set:missing' } },
      { iconSettings: 'PREFER_HA' }
    )
    await applyCustomIcon(fallbackConfig, { resolve: vi.fn(async () => null) })
    expect(fallbackConfig.icon).toBe('mdi:lightbulb')
  })

  it('does not request hidden or built-in icons', async () => {
    const resolver = { resolve: vi.fn() }
    await applyCustomIcon({ icon: null }, resolver)
    await applyCustomIcon({ icon: 'mdi:lightbulb' }, resolver)
    expect(resolver.resolve).not.toHaveBeenCalled()
  })
})
