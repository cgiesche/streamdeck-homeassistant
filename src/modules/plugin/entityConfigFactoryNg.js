import defaultIconMappings from '../../../public/config/default-display-config.yml'
import axios from 'axios'
import nunjucks from 'nunjucks'
import yaml from 'js-yaml'

export class EntityConfigFactory {

  defaultDisplayConfig = defaultIconMappings
  customDisplayConfig = null

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
   *
   * @param customConfigLocation : String
   */
  constructor(customConfigLocation) {
    if (customConfigLocation) {
      console.log(`Trying to load custom display-config from ${customConfigLocation}`)
      axios.get(customConfigLocation)
        .then(response => this.customDisplayConfig = yaml.load(response.data))
        .catch(error => console.log(`Failed to load custom config: ${error}`))
    }

    axios.get('https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/default-display-config.yml')
      .then(response => this.defaultDisplayConfig = yaml.load(response.data))
      .catch(error => console.log(`Failed to download updated default-display-config.yml: ${error}`))
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
    this.addResolverConfig(resolvers, this.defaultDisplayConfig, stateObject.state, domain, deviceClass)
    this.addResolverConfig(resolvers, this.customDisplayConfig, stateObject.state, domain, deviceClass)
    resolvers.reverse()

    const iconString = this.resolve('icon', resolvers)
    const colorString = this.resolve('color', resolvers)
    const labelTemplates = this.resolve('labelTemplates', resolvers)

    const icon = this.render(iconString, stateObject)
    const color = this.render(colorString, stateObject)

    return {
      icon: icon,
      color: color,
      labelTemplates: labelTemplates
    }
  }

  addResolverConfig(resolvers, config, state, domain, deviceClass) {
    if (!config) {
      return
    }

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
