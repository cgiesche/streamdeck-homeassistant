import {
  type DialAction,
  type DialDownEvent,
  type DialRotateEvent,
  type DialUpEvent,
  type DidReceiveSettingsEvent,
  type KeyAction,
  type KeyDownEvent,
  type KeyUpEvent,
  type SendToPluginEvent,
  SingletonAction,
  type TouchTapEvent,
  type WillAppearEvent,
  type WillDisappearEvent,
  action,
  streamDeck
} from '@elgato/streamdeck'
import axios from 'axios'
import type { HassEntity, HassService } from 'home-assistant-js-websocket'
import { load as yamlLoad } from 'js-yaml'

import type { HomeAssistant } from '@/homeassistant/homeAssistant'
import { Entity } from '@/models/entity'
import type {
  GetEntityEvent,
  ReconnectEvent,
  SendToPluginEventData
} from '@/models/events/sendToPluginEvents'
import type { SendToPropertyInspectorEventData } from '@/models/events/sendToPropertyInspectorEvents'
import type { RenderingConfig } from '@/models/renderConfig'
import type { Service } from '@/models/service'
import type { LegacySettings, Settings } from '@/models/settings/settings'
import { latestSettingsVersion, migrateSettings } from '@/models/settings/settings'
import type { EntityConfigFactory } from '@/render/entityConfigFactoryNg'
import { SvgUtils } from '@/render/svgUtils'

// @ts-expect-error ts-checker doesn't understand yaml imports
import defaultActiveStates from '../../public/config/active-states.yml'

@action({ UUID: 'de.perdoctus.streamdeck.homeassistant.entity' })
export class GenericEntityAction extends SingletonAction<Settings> {
  private readonly homeAssistant: HomeAssistant
  private readonly entityConfigFactory: EntityConfigFactory
  private readonly svgUtils = new SvgUtils()

  private readonly entityLastUpdateTime = new Map<string, string>()
  private readonly rotationTimeout = new Map<string, NodeJS.Timeout>()
  private readonly rotationAmount = new Map<string, number>()
  private readonly rotationPercent = new Map<string, number>()
  private readonly buttonLongPressTimeouts = new Map<string, NodeJS.Timeout>()
  protected activeStates = defaultActiveStates as Array<string>

  constructor(homeAssistant: HomeAssistant, entityConfigFactory: EntityConfigFactory) {
    super()
    this.homeAssistant = homeAssistant
    this.entityConfigFactory = entityConfigFactory
    void this.fetchActiveStates().then()
  }

  private async fetchActiveStates() {
    try {
      const response = await axios.get<string>(
        'https://cdn.jsdelivr.net/gh/cgiesche/streamdeck-homeassistant@master/public/config/active-states.yml'
      )
      this.activeStates = yamlLoad(response.data) as string[]
    } catch (error) {
      streamDeck.logger.error('Failed to download updated active-states.json', error)
    }
  }

  async updateDisplay(settings: Settings, actionId: string, stateObject: HassEntity) {
    const action = streamDeck.actions.getActionById(actionId)
    if (action == null) {
      streamDeck.logger.warn(`Action ${actionId} not found`)
      return
    }

    const renderingConfig = this.entityConfigFactory.buildRenderConfig(stateObject, settings)
    if (action.isDial()) {
      await this.updateDialDisplay(renderingConfig, action, stateObject)
    } else {
      await this.updateKeypadDisplay(renderingConfig, action, stateObject)
    }
  }

  private async updateDialDisplay(
    renderingConfig: RenderingConfig,
    action: DialAction,
    stateObject: HassEntity
  ) {
    await action.setFeedbackLayout(renderingConfig.feedbackLayout)

    renderingConfig.feedback.title = renderingConfig.customTitle ?? ''
    renderingConfig.feedback.icon =
      'data:image/svg+xml;charset=utf8,' +
      this.svgUtils.renderIconSVG(renderingConfig.icon, renderingConfig.color)
    renderingConfig.feedback.value ??= this.svgUtils
      .renderTemplates(renderingConfig.labelTemplates, {
        ...stateObject.attributes,
        state: stateObject.state
      })
      .join(' ')
    await action.setFeedback(renderingConfig.feedback)
  }

  protected async updateKeypadDisplay(
    renderingConfig: RenderingConfig,
    action: KeyAction,
    stateObject: HassEntity
  ) {
    if (renderingConfig.customTitle) {
      await action.setTitle(renderingConfig.customTitle)
    }

    renderingConfig.color ||= this.activeStates.includes(stateObject.state)
      ? this.entityConfigFactory.colors.active
      : this.entityConfigFactory.colors.neutral

    const image =
      'data:image/svg+xml;charset=utf8,' +
      this.svgUtils.renderButtonSVG(renderingConfig, stateObject)
    await action.setImage(image)
  }

  override async onWillAppear(ev: WillAppearEvent<Settings>) {
    let settings = ev.payload.settings as LegacySettings | Settings
    if (settings.version != latestSettingsVersion) {
      streamDeck.logger.info(`Migrating settings from version ${settings.version} to latest`)
      settings = migrateSettings(settings)
      await ev.action.setSettings(settings)
    }

    this.configureEntitySubscription(ev.action.id, settings)
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>) {
    this.configureEntitySubscription(ev.action.id, ev.payload.settings)
  }

  private configureEntitySubscription(actionId: string, settings: Settings) {
    this.entityLastUpdateTime.delete(actionId)
    this.rotationAmount.set(actionId, 0)
    this.rotationPercent.set(actionId, 0)
    this.homeAssistant.subscribe(actionId, settings.display.entityId, async (entity) => {
      if (entity.last_updated == this.entityLastUpdateTime.get(actionId)) return

      this.entityLastUpdateTime.set(actionId, entity.last_updated)
      await this.updateDisplay(settings, actionId, entity)
    })
  }

  override onWillDisappear(ev: WillDisappearEvent<Settings>) {
    this.homeAssistant.unsubscribe(ev.action.id)
  }

  override async onKeyDown(ev: KeyDownEvent<Settings>) {
    await this.onButtonDown(ev.action.id, ev.payload.settings)
  }

  override async onDialDown(ev: DialDownEvent<Settings>) {
    await this.onButtonDown(ev.action.id, ev.payload.settings)
  }

  override async onKeyUp(ev: KeyUpEvent<Settings>) {
    await this.onButtonUp(ev.action.id, ev.payload.settings)
  }

  override async onDialUp(ev: DialUpEvent<Settings>) {
    await this.onButtonUp(ev.action.id, ev.payload.settings)
  }

  private async onButtonDown(actionId: string, settings: Settings) {
    if (!settings.button.serviceLongPress.serviceId) {
      await this.onButtonShortPress(actionId, settings)
    } else {
      const timeout = setTimeout(async () => {
        await this.onButtonLongPress(actionId, settings)
      }, 300)
      this.buttonLongPressTimeouts.set(actionId, timeout)
    }
  }

  private async onButtonUp(actionId: string, settings: Settings) {
    const timeout = this.buttonLongPressTimeouts.get(actionId)
    if (timeout) {
      clearTimeout(timeout)
      this.buttonLongPressTimeouts.delete(actionId)
      await this.onButtonShortPress(actionId, settings)
    }
  }

  private async onButtonLongPress(actionId: string, settings: Settings) {
    this.buttonLongPressTimeouts.delete(actionId)
    const callSuccessful = await this.homeAssistant.callService(settings.button.serviceLongPress)
    if (!callSuccessful) {
      await streamDeck.actions.getActionById(actionId)?.showAlert()
    }
  }

  private async onButtonShortPress(actionId: string, settings: Settings) {
    const callSuccessful = await this.homeAssistant.callService(settings.button.serviceShortPress)
    if (!callSuccessful) {
      await streamDeck.actions.getActionById(actionId)?.showAlert()
    }
  }

  override async onTouchTap(ev: TouchTapEvent<Settings>) {
    const callSuccessful = await this.homeAssistant.callService(
      ev.payload.settings.button.serviceTap
    )
    if (!callSuccessful) {
      await ev.action.showAlert()
    }
  }

  override async onDialRotate(ev: DialRotateEvent<Settings>) {
    const actionId = ev.action.id
    const settings = ev.payload.settings
    const scaledTicks = ev.payload.ticks * (settings.rotationTickMultiplier ?? 1)
    const tickBucketSizeMs = settings.rotationTickBucketSizeMs ?? 300

    const newRotationAmount = (this.rotationAmount.get(actionId) ?? 0) + scaledTicks
    let newRotationPercent = (this.rotationPercent.get(actionId) ?? 0) + scaledTicks
    newRotationPercent = Math.min(100, Math.max(0, newRotationPercent))
    this.rotationAmount.set(actionId, newRotationAmount)
    this.rotationPercent.set(actionId, newRotationPercent)

    // If there is already a pending timeout, don't create another
    if (this.rotationTimeout.has(actionId)) return

    const serviceCall = async () => {
      const callSuccessful = await this.homeAssistant.callService(settings.button.serviceRotation, {
        ticks: this.rotationAmount.get(actionId),
        rotationPercent: this.rotationPercent.get(actionId),
        rotationAbsolute: 2.55 * this.rotationPercent.get(actionId)!
      })
      if (!callSuccessful) {
        await ev.action.showAlert()
      }
      this.rotationAmount.set(actionId, 0)
      this.rotationTimeout.delete(actionId)
    }

    if (tickBucketSizeMs > 0) {
      this.rotationTimeout.set(actionId, setTimeout(serviceCall, tickBucketSizeMs))
    } else {
      await serviceCall()
    }
  }

  override async onSendToPlugin(ev: SendToPluginEvent<SendToPluginEventData, Settings>) {
    switch (ev.payload.event) {
      case 'getEntities':
        await this.onGetEntities()
        break
      case 'getServices':
        await this.onGetServices()
        break
      case 'reconnect':
        await this.onReconnect(ev.payload)
        break
      case 'getConnectionState':
        await this.sendConnectionState()
        break
      case 'getEntityAttributes':
        await this.onGetEntityAttributes(ev.payload)
        break
    }
  }

  private async onGetEntities() {
    const states = await this.homeAssistant.getStates()
    const entities = states.map(
      (state) => new Entity(state.entity_id, state.attributes.friendly_name)
    )
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: 'getEntities',
      entities: entities
    } as SendToPropertyInspectorEventData)
  }

  private async onGetServices() {
    function getTargetDomains(service: HassService): string[] {
      try {
        type Target = Nullable<{ entity?: { domain: string[] }[] }>
        return (service.target as Target)?.entity?.at(0)?.domain ?? []
      } catch (e) {
        console.log(e)
        return []
      }
    }

    const haServices = await this.homeAssistant.getServices()
    const services = Object.entries(haServices).flatMap((domainServices) => {
      const domain = domainServices[0]
      return Object.entries(domainServices[1]).map((haService) => {
        return {
          serviceId: `${domain}.${haService[0]}`,
          domain: domain,
          name: haService[0],
          title: haService[1].name,
          description: haService[1].description,
          dataFields: Object.entries(haService[1].fields).map((field) => ({
            name: field[0],
            info: {
              required: field[1].required,
              description: field[1].description,
              example: field[1].example
            }
          })),
          domains: getTargetDomains(haService[1])
        } as Service
      })
    })

    await streamDeck.ui.current?.sendToPropertyInspector({
      event: 'getServices',
      services: services
    } as SendToPropertyInspectorEventData)
  }

  private async onGetEntityAttributes(ev: GetEntityEvent) {
    const state = await this.homeAssistant.getState(ev.entityId)
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: 'getEntityAttributes',
      attributes: state == null ? [] : Object.keys(state.attributes)
    } as SendToPropertyInspectorEventData)
  }

  private async onReconnect(ev: ReconnectEvent) {
    await this.homeAssistant.connect(ev.serverUrl, ev.accessToken)
    await this.sendConnectionState()
  }

  private async sendConnectionState() {
    const connectionState = this.homeAssistant.getConnectionState()
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: 'connectionState',
      connected: connectionState.connected,
      error: connectionState.error
    } as SendToPropertyInspectorEventData)
  }
}
