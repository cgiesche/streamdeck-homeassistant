import fs from 'fs'

import streamDeck, { type FeedbackPayload } from '@elgato/streamdeck'
import axios from 'axios'
import type { HassEntity } from 'home-assistant-js-websocket'
import yaml from 'js-yaml'
import { renderString } from 'nunjucks'

import type { DisplayConfig, StateConfig } from '@/models/displayConfig'
import type { RenderingConfig } from '@/models/renderConfig'
import { IconSettings, type Settings } from '@/models/settings/settings'

// @ts-expect-error ts-checker doesn't understand yaml imports
import defaultDisplayConfiguration from '../../public/config/default-display-config.yml'

export class EntityConfigFactory {
  private displayConfiguration = defaultDisplayConfiguration as DisplayConfig

  colors = {
    unavailable: '#505050',

    neutral: '#FFF',
    passive: '#a1a1a1',
    active: '#e9b200',

    ok: '#08ac00',
    warn: '#a13300',
    error: '#a10000'
  }

  async setDisplayConfigurationUrl(url: Nullable<string>) {
    if (!url) {
      this.displayConfiguration = defaultDisplayConfiguration as DisplayConfig
      return
    }

    streamDeck.logger.info(`Loading display configuration from ${url}`)
    try {
      let response: string
      if (url.startsWith('file://')) {
        response = fs.readFileSync(url.replace('file://', ''), 'utf8')
      } else {
        response = (await axios.get<string>(url)).data
      }
      this.displayConfiguration = yaml.load(response) as DisplayConfig
    } catch (error) {
      streamDeck.logger.error(`Failed to download display configuration from ${url}`, error)
    }
  }

  buildRenderConfig(stateObject: HassEntity, settings: Settings) {
    const attributes = stateObject.attributes
    const deviceClass = attributes.device_class
    const renderingConfig = this.getConfig(stateObject, deviceClass)

    if (settings.display.iconSettings === IconSettings.HIDE) {
      // Remove default if icon should not be rendered
      renderingConfig.icon = null
    } else if (
      attributes.icon &&
      (!renderingConfig.icon || settings.display.iconSettings === IconSettings.PREFER_HA)
    ) {
      // Use icon from home-assistant, if no default or preferred
      renderingConfig.icon = attributes.icon
    }
    const rgbColor = attributes.rgb_color as Nullable<number[]>
    if (rgbColor) {
      renderingConfig.color = this.rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2])
    }

    renderingConfig.isAction =
      !!settings.button.serviceShortPress.serviceId &&
      (settings.display.enableServiceIndicator ?? true)
    renderingConfig.isMultiAction =
      !!settings.button.serviceLongPress.serviceId &&
      (settings.display.enableServiceIndicator ?? true)

    if (settings.display.useCustomTitle) {
      const state = stateObject.state
      const stateAttributes = stateObject.attributes
      renderingConfig.customTitle = renderString(settings.display.buttonTitle, {
        state,
        ...stateAttributes
      })
    }

    if (settings.display.useCustomButtonLabels) {
      renderingConfig.labelTemplates = settings.display.buttonLabels.split('\n')
    }

    return renderingConfig
  }

  private getConfig(stateObject: HassEntity, deviceClass: Nullable<string>): RenderingConfig {
    const stateConfigs = this.getStateConfigs(
      stateObject.state,
      stateObject.entity_id.split('.')[0],
      deviceClass
    )

    const feedbackLayoutString = this.resolve('feedbackLayout', stateConfigs)
    const feedbackValueString = this.resolve('feedback', stateConfigs)
    const iconString = this.resolve('icon', stateConfigs)
    const colorString = this.resolve('color', stateConfigs)
    const labelTemplates = this.resolve('labelTemplates', stateConfigs)

    const feedbackLayout = this.render(feedbackLayoutString, stateObject)
    const renderedFeedback = this.render(feedbackValueString, stateObject)
    let feedback: FeedbackPayload = {}
    try {
      feedback = renderedFeedback ? (JSON.parse(renderedFeedback) as FeedbackPayload) : {}
    } catch (error) {
      streamDeck.logger.error('Failed to parse feedback template', error)
    }

    const icon = this.render(iconString, stateObject)
    const color = this.render(colorString, stateObject)

    return {
      feedbackLayout: feedbackLayout || '$A1',
      feedback: feedback,
      icon: icon,
      color: color ?? this.colors.neutral,
      labelTemplates: labelTemplates
    }
  }

  private getStateConfigs(
    state: string,
    domain: string,
    deviceClass: Nullable<string>
  ): StateConfig[] {
    const config = this.displayConfiguration

    const stateConfigs = new Array<StateConfig>()
    stateConfigs.push({
      icon: config._icon,
      color: config._color,
      labelTemplates: config._labelTemplates
    })

    const defaultStateConfig = config._states?.[state]
    if (defaultStateConfig) stateConfigs.push(defaultStateConfig)

    const domainConfig = config[domain]
    if (domainConfig) {
      stateConfigs.push(domainConfig)
      const domainStateConfig = domainConfig.states?.[state]
      if (domainStateConfig) stateConfigs.push(domainStateConfig)
    }

    if (deviceClass) {
      const domainClassConfig = config[domain]?.classes?.[deviceClass]
      if (domainClassConfig) {
        stateConfigs.push(domainClassConfig)
        const domainClassStateConfig = domainClassConfig.states?.[state]
        if (domainClassStateConfig) stateConfigs.push(domainClassStateConfig)
      }
    }
    return stateConfigs.reverse()
  }

  private render(string: Nullable<string>, stateObject: HassEntity) {
    if (!string) return string
    const renderedString = renderString(string, stateObject)
    return renderedString ? renderedString.trim() : string
  }

  private resolve<K extends keyof StateConfig>(
    prop: K,
    stateConfigs: StateConfig[]
  ): Nullable<StateConfig[K]> {
    return stateConfigs.find((stateConfig) => Object.hasOwn(stateConfig, prop))?.[prop] ?? null
  }

  private rgbToHex(r: number, g: number, b: number) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
  }
}
