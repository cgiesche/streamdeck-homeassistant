import { describe, it, expect } from 'vitest'
import { Settings, CURRENT_VERSION } from './settings.js'

describe('Settings.parse v8 -> v9 per-dial indicator migration', () => {
  it('adds the new indicator/layout display defaults', () => {
    const parsed = Settings.parse({ version: 8, display: {}, button: {} })
    expect(parsed.version).toBe(CURRENT_VERSION)
    expect(parsed.display.useCustomIndicator).toBe(false)
    expect(parsed.display.customIndicator).toBe('')
    expect(parsed.display.feedbackLayoutOverride).toBe('')
  })

  it('preserves existing display fields while adding the new ones', () => {
    const parsed = Settings.parse({
      version: 8,
      display: { entityId: 'light.den', backgroundColor: '#123456' },
      button: {}
    })
    expect(parsed.display.entityId).toBe('light.den')
    expect(parsed.display.backgroundColor).toBe('#123456')
    expect(parsed.display.useCustomIndicator).toBe(false)
  })

  it('carries a v1 config all the way to v9 with the new fields present', () => {
    const parsed = Settings.parse({ version: 1, entityId: 'light.den' })
    expect(parsed.version).toBe(CURRENT_VERSION)
    expect(parsed.display).toHaveProperty('useCustomIndicator', false)
    expect(parsed.display).toHaveProperty('customIndicator', '')
    expect(parsed.display).toHaveProperty('feedbackLayoutOverride', '')
  })
})
