import { describe, it, expect } from 'vitest'
import { EntityConfigFactory } from './entityConfigFactoryNg.js'

const theme = {
  light: {
    icon: 'mdi:lightbulb',
    color: "{% if state == 'on' %}#FFCC00{% endif %}"
  }
}

async function factoryWith(config) {
  const factory = new EntityConfigFactory(() => Promise.resolve(config))
  await factory.loaded
  return factory
}

function stateOf(state) {
  return { entity_id: 'light.test', state, attributes: {} }
}

describe('EntityConfigFactory templating', () => {
  it('renders a conditional template', async () => {
    const factory = await factoryWith(theme)
    const config = factory.determineConfig('light', stateOf('on'), {})
    expect(config.color).toBe('#FFCC00')
  })

  it('returns an empty value instead of the raw template when it renders empty', async () => {
    const factory = await factoryWith(theme)
    const config = factory.determineConfig('light', stateOf('off'), {})
    expect(config.color).toBe('')
    expect(config.icon).toBe('mdi:lightbulb')
  })

  it('resolves loaded with the remote config applied', async () => {
    const factory = await factoryWith(theme)
    expect(factory.displayConfiguration).toBe(theme)
  })

  it('resolves loaded even when the config fails to load', async () => {
    const factory = new EntityConfigFactory(() => Promise.reject(new Error('offline')))
    await expect(factory.loaded).resolves.toBeUndefined()
  })
})
