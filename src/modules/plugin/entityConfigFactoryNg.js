import defaultDisplayConfiguration from '../../../public/config/default-display-config.yml'
import axios from 'axios'
import nunjucks from 'nunjucks'
import yaml from 'js-yaml'
import { number } from 'nunjucks/src/tests'

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
  constructor(displayConfigurationURL) {
    if (displayConfigurationURL) {
      console.log(`Loading display configuration from ${displayConfigurationURL}`)
      axios.get(displayConfigurationURL)
        .then(response => this.displayConfiguration = yaml.load(response.data))
        .catch(error => console.log(`Failed to download display configuration from ${displayConfigurationURL}: ${error}`))
    }
  }

  /**
   *
   * @param domain
   * @param stateObject
   * @param displaySettings
   * @returns {{color: *, icon: *, labelTemplates: *}}
   */
  determineConfig(domain, stateObject, displaySettings) {
    const attributes = stateObject.attributes
    const deviceClass = attributes.device_class

    let renderingConfig = this.getConfig(domain, stateObject, deviceClass)

    if (displaySettings.iconSettings === 'HIDE') {
      // Remove default if icon should not be rendered
      renderingConfig.icon = null
    } else if (attributes.icon && (!renderingConfig.icon || displaySettings.iconSettings === 'PREFER_HA')) {
      // Use icon from home-assistant, if no default or preferred
      renderingConfig.icon = attributes.icon
    }
    let rgbColor = attributes.rgb_color
    if (rgbColor) {
      renderingConfig.color = this.rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2])
    }

    return renderingConfig
  }


  getConfig(domain, stateObject, deviceClass) {
    const resolvers = []
    this.addResolverConfig(resolvers, stateObject.state, domain, deviceClass)
    resolvers.reverse()

    const feedbackLayoutString = this.resolve('feedbackLayout', resolvers)
    const feedbackValueString = this.resolve('feedbackLayout', resolvers)
    const iconString = this.resolve('icon', resolvers)
    const colorString = this.resolve('color', resolvers)
    const labelTemplates = this.resolve('labelTemplates', resolvers)

    const feedbackLayout= this.render(feedbackLayoutString, stateObject)
    const feedbackValue= this.render(feedbackValueString, stateObject)

    const icon = this.render(iconString, stateObject)
    const color = this.render(colorString, stateObject)

    return {
      feedbackLayout: feedbackLayout,
      feedback: { value: feedbackValue},
      icon: icon,
      color: color,
      labelTemplates: labelTemplates
    }
  }

  addResolverConfig(resolvers, state, domain, deviceClass) {
    let config = this.displayConfiguration

    const defaultConfig = {}
    if (config._icon) defaultConfig.icon = config._icon
    if (config._color) defaultConfig.color = config._color
    if (config._labelTemplates) defaultConfig.labelTemplates = config._labelTemplates
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
  render(string, stateObject) {
    if (string && string.startsWith('!nunjucks')) {
      let renderedString = nunjucks.renderString(string.slice(10), stateObject)
      if (renderedString) {
        return renderedString.trim()
      }
    }
    return string
  }

  resolve(prop, resolvers) {
    for (const resolver of resolvers) {
      if (Object.hasOwn(resolver, prop)) {
        return resolver[prop]
      }
    }
  }

  rgbToHex(r, g, b) {
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)
  }

}
