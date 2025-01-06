// @ts-expect-error ts-checker doesn't understand yaml imports
import defaultDisplayConfiguration from '../../../public/config/default-display-config.yml'
import axios from 'axios'
import { renderString } from 'nunjucks'
import yaml from 'js-yaml'
import type { StateMessage } from '@/modules/homeassistant/homeassistant'

export interface RenderingConfig {
  feedbackLayout: string | null
  feedback: {
    title: string
    icon: string | null
    value: string
  } | null
  icon: string | null
  color: string | null
  labelTemplates: string[] | null
  customTitle: string | null
  isAction: boolean
  isMultiAction: boolean
  rotationPercent: number
}

export class EntityConfigFactory {
  displayConfiguration = defaultDisplayConfiguration

  colors = {
    unavailable: '#505050',

    neutral: '#FFF',
    passive: '#a1a1a1',
    active: '#e9b200',

    ok: '#08ac00',
    warn: '#a13300',
    error: '#a10000'
  }

  /**
   * @param displayConfigurationURL : String
   */
  constructor(displayConfigurationURL: string) {
    axios.defaults.headers['Cache-Control'] = 'public, max-age=86400'

    if (displayConfigurationURL) {
      console.log(`Loading display configuration from ${displayConfigurationURL}`)
      axios
        .get(displayConfigurationURL)
        .then((response) => (this.displayConfiguration = yaml.load(response.data)))
        .catch((error) =>
          console.log(
            `Failed to download display configuration from ${displayConfigurationURL}: ${error}`
          )
        )
    }
  }

  /**
   *
   * @param domain
   * @param stateObject
   * @param displaySettings
   * @returns {{color: *, icon: *, labelTemplates: *}}
   */
  determineConfig(
    domain: string,
    stateObject: StateMessage,
    displaySettings: {
      iconSettings: string
    }
  ) {
    const attributes = stateObject.attributes
    const deviceClass = attributes.device_class

    const renderingConfig = this.getConfig(domain, stateObject, deviceClass)

    if (displaySettings.iconSettings === 'HIDE') {
      // Remove default if icon should not be rendered
      renderingConfig.icon = null
    } else if (
      attributes.icon &&
      (!renderingConfig.icon || displaySettings.iconSettings === 'PREFER_HA')
    ) {
      // Use icon from home-assistant, if no default or preferred
      renderingConfig.icon = attributes.icon
    }
    const rgbColor = attributes.rgb_color
    if (rgbColor) {
      renderingConfig.color = this.rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2])
    }

    return renderingConfig
  }

  getConfig(
    domain: string,
    stateObject: { state: string },
    deviceClass: string
  ): Partial<RenderingConfig> {
    const resolvers: object[] = []
    this.addResolverConfig(resolvers, stateObject.state, domain, deviceClass)
    resolvers.reverse()

    const feedbackLayoutString = this.resolve('feedbackLayout', resolvers) as string | null
    const feedbackValueString = this.resolve('feedback', resolvers) as string | null
    const iconString = this.resolve('icon', resolvers) as string | null
    const colorString = this.resolve('color', resolvers) as string | null
    const labelTemplates = this.resolve('labelTemplates', resolvers) as string[] | null

    const feedbackLayout = this.render(feedbackLayoutString, stateObject)
    const renderedFeedback = this.render(feedbackValueString, stateObject)
    const feedback = feedbackValueString ? JSON.parse(renderedFeedback!) : {}

    const icon = this.render(iconString, stateObject)
    const color = this.render(colorString, stateObject)

    return {
      feedbackLayout: feedbackLayout,
      feedback: feedback,
      icon: icon,
      color: color,
      labelTemplates: labelTemplates
    }
  }

  addResolverConfig(resolvers: unknown[], state: string, domain: string, deviceClass: string) {
    const config = this.displayConfiguration

    const defaultConfig = {
      icon: config._icon,
      color: config._color,
      labelTemplates: config._labelTemplates
    }
    resolvers.push(defaultConfig)

    const defaultStateConfig = config._states?.[state]
    if (defaultStateConfig) resolvers.push(defaultStateConfig)

    const domainConfig = config[domain]
    const domainStateConfig = domainConfig?.states?.[state]
    if (domainConfig) resolvers.push(domainConfig)
    if (domainStateConfig) resolvers.push(domainStateConfig)

    if (deviceClass) {
      const domainClassConfig = config[domain]?.classes?.[deviceClass]
      const domainClassStateConfig = domainClassConfig?.states?.[state]
      if (domainClassConfig) resolvers.push(domainClassConfig)
      if (domainClassStateConfig) resolvers.push(domainClassStateConfig)
    }
  }

  /**
   * @returns String
   */
  render(string: string | null, stateObject: object) {
    if (string) {
      const renderedString = renderString(string, stateObject)
      if (renderedString) {
        return renderedString.trim()
      }
    }
    return string
  }

  resolve(prop: string, resolvers: object[]): object | null {
    for (const resolver of resolvers) {
      if (Object.hasOwn(resolver, prop)) {
        // @ts-expect-error This is a dynamic property access, can't be typed in current implementation
        return resolver[prop]
      }
    }
    return null
  }

  rgbToHex(r: number, g: number, b: number) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
  }
}
