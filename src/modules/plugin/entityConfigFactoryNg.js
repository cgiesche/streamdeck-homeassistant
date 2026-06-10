import defaultDisplayConfiguration from '../../../public/config/default-display-config.yml'
import nunjucks from 'nunjucks'

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
   * @param {(() => Promise<object>) | null} configLoader - async function that resolves to parsed config object
   */
  constructor(configLoader = null) {
    if (configLoader) {
      configLoader()
        .then((config) => (this.displayConfiguration = config))
        .catch((error) => console.log(`Failed to load display configuration: ${error}`))
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
    } else if (
      attributes.icon &&
      (!renderingConfig.icon || displaySettings.iconSettings === 'PREFER_HA')
    ) {
      // Use icon from home-assistant, if no default or preferred
      renderingConfig.icon = attributes.icon
    }
    let rgbColor = attributes.rgb_color
    if (rgbColor) {
      renderingConfig.color = this.rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2])
    }

    renderingConfig.iconLayout = displaySettings.iconLayout ?? 'STANDARD'

    if (displaySettings.backgroundColor) {
      renderingConfig.backgroundColor = displaySettings.backgroundColor
      renderingConfig.backgroundColorEnd = displaySettings.backgroundColorEnd || null
    }
    return renderingConfig
  }

  static #TEMPLATED_PROPS = ['feedbackLayout', 'icon', 'color', 'backgroundColor', 'backgroundColorEnd']
  static #DEFAULT_PROPS = ['icon', 'color', 'backgroundColor', 'backgroundColorEnd', 'labelTemplates']

  getConfig(domain, stateObject, deviceClass) {
    const resolvers = []
    this.addResolverConfig(resolvers, stateObject.state, domain, deviceClass)
    resolvers.reverse()

    const renderingConfig = {}
    for (const prop of EntityConfigFactory.#TEMPLATED_PROPS) {
      renderingConfig[prop] = this.render(this.resolve(prop, resolvers), stateObject)
    }
    renderingConfig.labelTemplates = this.resolve('labelTemplates', resolvers)

    const feedbackValueString = this.resolve('feedback', resolvers)
    renderingConfig.feedback = {}
    if (feedbackValueString) {
      const renderedFeedback = this.render(feedbackValueString, stateObject)
      try {
        renderingConfig.feedback = JSON.parse(renderedFeedback)
      } catch {
        console.error(`Failed to parse feedback JSON for entity ${stateObject.entity_id}: ${renderedFeedback}`)
      }
    }

    return renderingConfig
  }

  addResolverConfig(resolvers, state, domain, deviceClass) {
    let config = this.displayConfiguration

    const defaultConfig = {}
    for (const prop of EntityConfigFactory.#DEFAULT_PROPS) {
      const value = config[`_${prop}`]
      if (value) defaultConfig[prop] = value
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
  render(string, stateObject) {
    if (string) {
      let renderedString = nunjucks.renderString(string, stateObject)
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
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
  }
}
