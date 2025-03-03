import * as fs from 'node:fs'

import { expect, it } from 'vitest'

import type { RenderingConfig } from '@/models/renderConfig'
import { SvgUtils } from '@/render/svgUtils'

it('render button svg with temperature units', () => {
  const renderConfig: RenderingConfig = {
    feedbackLayout: '$A1',
    feedback: {},
    icon: 'mdi:thermometer',
    color: '#ffa500',
    labelTemplates: ['', '', '{{state}}{{unit_of_measurement}}'],
    isAction: true,
    isMultiAction: true
  }

  const svgUtils = new SvgUtils()
  const renderedButton = svgUtils.renderButtonSVG(renderConfig, {
    state: '70.5',
    attributes: {
      unit_of_measurement: '°F'
    }
  })

  const expectedButton = fs.readFileSync('resources/button-temperature.svg', 'utf8')
  expect(renderedButton).toBe(expectedButton)
})

it('render button svg with empty label template', () => {
  const renderConfig: RenderingConfig = {
    feedbackLayout: '$A1',
    feedback: {},
    icon: 'mdi:thermometer',
    color: '#ffa500',
    labelTemplates: null,
    isAction: true,
    isMultiAction: true
  }

  const svgUtils = new SvgUtils()
  const renderedButton = svgUtils.renderButtonSVG(renderConfig, {
    state: '70.5',
    attributes: {
      unit_of_measurement: '°F'
    }
  })

  const expectedButton = fs.readFileSync('resources/button-empty-template.svg', 'utf8')
  expect(renderedButton).toBe(expectedButton)
})

it('render button with no actions', () => {
  const renderConfig: RenderingConfig = {
    feedbackLayout: '$A1',
    feedback: {},
    icon: 'mdi:door',
    color: '#AAAAAA',
    labelTemplates: ['', '', '{{state}}{{unit_of_measurement}}'],
    isAction: false,
    isMultiAction: false
  }

  const svgUtils = new SvgUtils()
  const renderedButton = svgUtils.renderButtonSVG(renderConfig, {
    state: 'open',
    attributes: {}
  })

  const expectedButton = fs.readFileSync('resources/button-no-action.svg', 'utf8')
  expect(renderedButton).toBe(expectedButton)
})

it('render button with single action', () => {
  const renderConfig: RenderingConfig = {
    feedbackLayout: '$A1',
    feedback: {},
    icon: 'mdi:door',
    color: '#AAAAAA',
    labelTemplates: ['', '', '{{state}}{{unit_of_measurement}}'],
    isAction: true,
    isMultiAction: false
  }

  const svgUtils = new SvgUtils()
  const renderedButton = svgUtils.renderButtonSVG(renderConfig, {
    state: 'open',
    attributes: {}
  })

  const expectedButton = fs.readFileSync('resources/button-single-action.svg', 'utf8')
  expect(renderedButton).toBe(expectedButton)
})

it('render button with multi action', () => {
  const renderConfig: RenderingConfig = {
    feedbackLayout: '$A1',
    feedback: {},
    icon: 'mdi:door',
    color: '#AAAAAA',
    labelTemplates: ['', '', '{{state}}{{unit_of_measurement}}'],
    isAction: true,
    isMultiAction: true
  }

  const svgUtils = new SvgUtils()
  const renderedButton = svgUtils.renderButtonSVG(renderConfig, {
    state: 'open',
    attributes: {}
  })

  const expectedButton = fs.readFileSync('resources/button-multi-action.svg', 'utf8')
  expect(renderedButton).toBe(expectedButton)
})

it('render button with complex template', () => {
  const renderConfig: RenderingConfig = {
    feedbackLayout: '$A1',
    feedback: {},
    icon: null,
    color: '#0021fd',
    labelTemplates: [
      '{{ friendly_name | replace("Doorbell", "Front Door") }}',
      '{{ fps }} FPS',
      '{% if is_online %}Online{% else %}Offline{% endif %}'
    ]
  }

  const svgUtils = new SvgUtils()
  const renderedButton = svgUtils.renderButtonSVG(renderConfig, {
    state: 'open',
    attributes: {
      friendly_name: 'Doorbell Camera',
      fps: 10,
      is_online: true
    }
  })

  const expectedButton = fs.readFileSync('resources/button-complex-template.svg', 'utf8')
  expect(renderedButton).toBe(expectedButton)
})

it('render icon', () => {
  const svgUtils = new SvgUtils()
  const renderedIcon = svgUtils.renderIconSVG('mdi:garage-lock', '#ff6600')

  const expectedIcon = fs.readFileSync('resources/icon.svg', 'utf8')
  expect(renderedIcon).toBe(expectedIcon)
})
