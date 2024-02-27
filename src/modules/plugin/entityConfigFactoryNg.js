import defaultIconMappings from '../../../public/config/default-display-config.yml'
import axios from 'axios'
import nunjucks from 'nunjucks'
import yaml from 'js-yaml';

export class EntityConfigFactory {

  iconMappings = defaultIconMappings
  colors = {
    unavailable: '#505050',

    neutral: '#FFF',
    passive: '#a1a1a1',
    active: '#e9b200',

    ok: '#08ac00',
    warn: '#a13300',
    error: '#a10000'
  }

  constructor() {
    axios.get('https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/default-display-config.yml')
      .then(response => this.iconMappings = yaml.load(response.data))
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
    const state = stateObject.state
    const attributes = stateObject.attributes
    const deviceClass = attributes.device_class

    let renderingConfig = this.getConfig(domain, state, deviceClass)

    if (displaySettings.iconSettings === "HIDE") {
      // Remove default if icon should not be rendered
      renderingConfig.icon = null;
    } else if (attributes.icon && (!renderingConfig.icon || displaySettings.iconSettings === "PREFER_HA")) {
      // Use icon from home-assistant, if no default or preferred
      renderingConfig.icon = attributes.icon
    }
    let rgbColor = attributes.rgb_color
    if (rgbColor) {
      renderingConfig.color = this.rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2])
    }

    return renderingConfig
  }


  getConfig(domain, state, deviceClass) {
    const resolvers = []

    const defaultConfig = {}
    if (this.iconMappings._icon) defaultConfig.icon = this.iconMappings._icon
    if (this.iconMappings._color) defaultConfig.color = this.iconMappings._color
    if (this.iconMappings._labelTemplates) defaultConfig.labelTemplates = this.iconMappings._labelTemplates
    resolvers.push(defaultConfig)

    const defaultStateConfig = this.iconMappings._states?.[state]
    if (defaultStateConfig) resolvers.push(defaultStateConfig)

    const domainConfig = this.iconMappings[domain]
    const domainStateConfig = domainConfig?.states?.[state]
    if (domainConfig) resolvers.push(domainConfig)
    if (domainStateConfig) resolvers.push(domainStateConfig)

    if (deviceClass) {
      const domainClassConfig = this.iconMappings[domain]?.classes?.[deviceClass]
      const domainClassStateConfig = domainClassConfig?.states?.[state]
      if (domainClassConfig) resolvers.push(domainClassConfig)
      if (domainClassStateConfig) resolvers.push(domainClassStateConfig)
    }

    resolvers.reverse()

    const iconString = this.resolve('icon', resolvers)
    const colorString = this.resolve('color', resolvers)
    const labelTemplates = this.resolve('labelTemplates', resolvers)

    const icon = this.render(iconString, state)
    const color = this.render(colorString, state)

    return {
      icon: icon,
      color: color,
      labelTemplates: labelTemplates
    }
  }

  /**
   * @returns String
   */
  render(string, state) {
    if (string && string.startsWith('!nunjucks')) {
      let renderedString = nunjucks.renderString(string.slice(10), { state })
      if (renderedString) {
        return renderedString.trim()
      }
    }
    return string;
  }

  resolve(prop, resolvers) {
    for (const resolver of resolvers) {
      if (Object.hasOwn(resolver, prop)) {
        return resolver[prop]
      }
    }
  }

  rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

}
