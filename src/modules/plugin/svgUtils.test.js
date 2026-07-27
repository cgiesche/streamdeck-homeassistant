import { describe, it, expect } from 'vitest'
import { SvgUtils } from './svgUtils.js'

const stateObject = { state: 'on', attributes: {} }
const customIcon = {
  body: '<path d="M0 0h32v16z"/><path fill="currentColor" d="M2 2h12v12z"/><path fill="#ff0000" d="M4 4h8v8z"/>',
  viewBox: '0 0 32 16'
}

function render(config) {
  return new SvgUtils().renderButtonSVG(
    {
      labelTemplates: [],
      color: '#123456',
      ...config
    },
    stateObject
  )
}

describe('SvgUtils custom icon rendering', () => {
  it.each([
    ['STANDARD', 'translate(72, 0) scale(6)'],
    ['BOTTOM', 'translate(72, 144) scale(6)'],
    ['FULL', 'translate(0, 0) scale(12)']
  ])('renders the %s layout', (iconLayout, transform) => {
    const svg = render({ icon: 'local:crest', customIcon, iconLayout })

    expect(svg).toContain(`<g transform="${transform}"><svg width="24" height="24"`)
    expect(svg).toContain('viewBox="0 0 32 16"')
  })

  it('provides inherited status color without replacing explicit colors', () => {
    const svg = render({ icon: 'local:crest', customIcon })

    expect(svg).toContain('fill="#123456" color="#123456"')
    expect(svg).toContain('fill="currentColor"')
    expect(svg).toContain('fill="#ff0000"')
  })
})

describe('SvgUtils built-in icon regression', () => {
  it.each(['mdi:lightbulb', 'hue:adore'])('still renders %s locally', (icon) => {
    const svg = render({ icon })

    expect(svg).toContain('<g transform="translate(72, 0) scale(6)"><path d="')
    expect(svg).toContain('fill="#123456"')
  })
})
