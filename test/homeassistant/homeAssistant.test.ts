/* eslint-disable @typescript-eslint/unbound-method */
import {
  type Collection,
  type Connection,
  ERR_INVALID_AUTH,
  type HassEntities,
  type HassEntity,
  type HassServices,
  callService,
  createConnection,
  entitiesColl
} from 'home-assistant-js-websocket'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'

import { HomeAssistant } from '@/homeassistant/homeAssistant'

vi.mock('home-assistant-js-websocket')

beforeEach(() => {
  vi.resetAllMocks()
})

it('test unconnected connection state', () => {
  const homeAssistant = new HomeAssistant()
  const connectionState = homeAssistant.getConnectionState()

  expect(connectionState.connected).toBe(false)
  expect(connectionState.error).toBe(0)
})

it('test connected connection state', async () => {
  vi.mocked(createConnection).mockResolvedValue(mock<Connection>())

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')
  const connectionState = homeAssistant.getConnectionState()

  expect(connectionState.connected).toBe(true)
  expect(connectionState.error).toBe(0)
})

it('test error connection state', async () => {
  vi.mocked(createConnection).mockRejectedValue(ERR_INVALID_AUTH)

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')
  const connectionState = homeAssistant.getConnectionState()

  expect(connectionState.connected).toBe(false)
  expect(connectionState.error).toBe(ERR_INVALID_AUTH)
})

it('test unknown error connection state', async () => {
  vi.mocked(createConnection).mockRejectedValue(new Error('test error'))

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')
  const connectionState = homeAssistant.getConnectionState()

  expect(connectionState.connected).toBe(false)
  expect(connectionState.error).toBe(-1)
})

describe('test functions without a connection', () => {
  const homeAssistant = new HomeAssistant()

  it('getStates', async () => {
    const states = await homeAssistant.getStates()
    expect(states).toEqual([])
  })

  it('getState', async () => {
    const entity = await homeAssistant.getState('test-entity')
    expect(entity).toBeUndefined()
  })

  it('getServices', async () => {
    const services = await homeAssistant.getServices()
    expect(services).toEqual({})
  })

  it('callService', async () => {
    const result = await homeAssistant.callService({ serviceId: 'light.turn_off' })
    expect(result).toBe(false)
  })
})

describe('test functions with a connection error', () => {
  const homeAssistant = new HomeAssistant()

  beforeEach(async () => {
    const connection = mock<Connection>()
    vi.mocked(connection.sendMessagePromise).mockRejectedValue(new Error('test error'))
    vi.mocked(callService).mockRejectedValue(new Error('test error'))
    vi.mocked(createConnection).mockResolvedValue(connection)

    await homeAssistant.connect('test-url', 'test-token')
  })

  it('getStates', async () => {
    const states = await homeAssistant.getStates()
    expect(states).toEqual([])
  })

  it('getState', async () => {
    const entity = await homeAssistant.getState('test-entity')
    expect(entity).toBeUndefined()
  })

  it('getServices', async () => {
    const services = await homeAssistant.getServices()
    expect(services).toEqual({})
  })

  it('callService', async () => {
    const result = await homeAssistant.callService({ serviceId: 'light.turn_off' })
    expect(result).toBe(false)
  })
})

it('test getting single entity state', async () => {
  const connection = mock<Connection>()
  vi.mocked(connection.sendMessagePromise).mockResolvedValue(buildTestStates())
  vi.mocked(createConnection).mockResolvedValue(connection)

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')

  const entity = await homeAssistant.getState('light.my_test_light')
  expect(entity?.entity_id).toEqual('light.my_test_light')
  expect(entity?.state).toEqual('on')

  const entity2 = await homeAssistant.getState('door.my_test_door')
  expect(entity2?.entity_id).toEqual('door.my_test_door')
  expect(entity2?.state).toEqual('closed')
})

it('test getting all entity states', async () => {
  const connection = mock<Connection>()
  vi.mocked(connection.sendMessagePromise).mockResolvedValue(buildTestStates())
  vi.mocked(createConnection).mockResolvedValue(connection)

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')

  const states = await homeAssistant.getStates()
  expect(states.length).toEqual(2)
  expect(states[0].entity_id).toEqual('light.my_test_light')
  expect(states[0].state).toEqual('on')
  expect(states[1].entity_id).toEqual('door.my_test_door')
  expect(states[1].state).toEqual('closed')
})

it('test getting all services', async () => {
  const connection = mock<Connection>()
  vi.mocked(connection.sendMessagePromise).mockResolvedValue(buildTestServices())
  vi.mocked(createConnection).mockResolvedValue(connection)

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')

  const services = await homeAssistant.getServices()
  expect(services.light.turn_on.name).toEqual('Turn on')
  expect(services.light.turn_on.description).toEqual('Turn on light')
  expect(services.light.turn_off.name).toEqual('Turn off')
  expect(services.light.turn_off.description).toEqual('Turn off light')
  expect(services.switch.toggle.name).toEqual('Toggle')
  expect(services.switch.toggle.description).toEqual('Toggle switch')
})

describe('test calling services', () => {
  const homeAssistant = new HomeAssistant()

  beforeEach(async () => {
    vi.mocked(createConnection).mockResolvedValue(mock<Connection>())
    await homeAssistant.connect('test-url', 'test-token')
  })

  it('without entityId', async () => {
    const callServiceMock = vi.mocked(callService)
    callServiceMock.mockResolvedValue('success')
    const result = await homeAssistant.callService({ serviceId: 'light.turn_off' })
    expect(result).toBe(true)

    const lastCall = callServiceMock.mock.lastCall
    expect(lastCall?.at(1)).toBe('light')
    expect(lastCall?.at(2)).toBe('turn_off')
    expect(lastCall?.at(3)).toStrictEqual({})
    expect(lastCall?.at(4)).toBeUndefined()
  })

  it('with entityId', async () => {
    const callServiceMock = vi.mocked(callService)
    callServiceMock.mockResolvedValue('success')
    const result = await homeAssistant.callService({
      serviceId: 'light.turn_off',
      entityId: 'light.my_test_light'
    })
    expect(result).toBe(true)

    const lastCall = callServiceMock.mock.lastCall
    expect(lastCall?.at(1)).toBe('light')
    expect(lastCall?.at(2)).toBe('turn_off')
    expect(lastCall?.at(3)).toStrictEqual({})
    expect(lastCall?.at(4)).toStrictEqual({ entity_id: 'light.my_test_light' })
  })

  it('with serviceData', async () => {
    const callServiceMock = vi.mocked(callService)
    callServiceMock.mockResolvedValue('success')
    const result = await homeAssistant.callService({
      serviceId: 'light.turn_off',
      entityId: 'light.my_test_light',
      serviceData: '{ "brightness": 100 }'
    })
    expect(result).toBe(true)

    const lastCall = callServiceMock.mock.lastCall
    expect(lastCall?.at(1)).toBe('light')
    expect(lastCall?.at(2)).toBe('turn_off')
    expect(lastCall?.at(3)).toStrictEqual({ brightness: 100 })
    expect(lastCall?.at(4)).toStrictEqual({ entity_id: 'light.my_test_light' })
  })

  it('with no service action defined', async () => {
    vi.mocked(callService).mockRejectedValue(new Error('test error'))
    const result = await homeAssistant.callService({})
    expect(result).toBe(true)
  })
})

it('test subscribing to events', async () => {
  vi.useFakeTimers()
  let subscribedEntities: Nullable<string[]>
  const connection = mock<Connection>()
  vi.mocked(createConnection).mockResolvedValue(connection)
  const entitiesCollectionMock = mock<Collection<HassEntities>>()
  entitiesCollectionMock.subscribe.mockReturnValue(() => {})
  vi.mocked(entitiesColl).mockImplementation((_connection, entityIds) => {
    subscribedEntities = entityIds
    return entitiesCollectionMock
  })

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')

  let callbackCalled = false
  homeAssistant.subscribe('actionId1', 'light.my_test_light', (entity) => {
    expect(entity.entity_id).toEqual('light.my_test_light')
    callbackCalled = true
  })
  homeAssistant.subscribe('actionId2', 'light.another_light', (_) => {
    expect(true).toBe(false) // This should never be called
  })
  homeAssistant.subscribe('actionId3', 'door.front_door', (_) => {
    expect(true).toBe(false) // This should never be called
  })

  expect(entitiesCollectionMock.subscribe.mock.calls).toHaveLength(0)
  vi.advanceTimersByTime(1000)
  expect(entitiesCollectionMock.subscribe.mock.calls).toHaveLength(1)

  expect(subscribedEntities).toHaveLength(3)
  expect(subscribedEntities).toContain('light.my_test_light')
  expect(subscribedEntities).toContain('light.another_light')
  expect(subscribedEntities).toContain('door.front_door')

  const subscriptionCallback = entitiesCollectionMock.subscribe.mock.lastCall?.at(0)
  const states = buildTestStates()
  subscriptionCallback!({ 'light.my_test_light': states[0], 'door.my_test_door': states[1] })
  expect(callbackCalled).toBe(true)

  homeAssistant.unsubscribe('actionId1')
  homeAssistant.unsubscribe('actionId3')

  vi.advanceTimersByTime(1000)
  expect(entitiesCollectionMock.subscribe.mock.calls).toHaveLength(2)

  expect(subscribedEntities).toHaveLength(1)
  expect(subscribedEntities).toContain('light.another_light')
})

it('test connection heartbeat', async () => {
  vi.useFakeTimers()
  const connection = mock<Connection>()
  vi.mocked(createConnection).mockResolvedValue(connection)

  const entitiesCollectionMock = mock<Collection<HassEntities>>()
  vi.mocked(entitiesColl).mockReturnValue(entitiesCollectionMock)

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')
  homeAssistant.subscribe('action', 'entityId', () => {})

  expect(connection.ping.mock.calls).toHaveLength(0)
  vi.advanceTimersByTime(5000)
  expect(connection.ping.mock.calls).toHaveLength(1)

  // Test that the heartbeat interval is reset when new events are received
  const subscriptionCallback = entitiesCollectionMock.subscribe.mock.lastCall?.at(0)
  for (let i = 0; i < 20; i++) {
    vi.advanceTimersByTime(4000)
    subscriptionCallback!({})
  }
  expect(connection.ping.mock.calls).toHaveLength(1)

  vi.advanceTimersByTime(5000)
  expect(connection.ping.mock.calls).toHaveLength(2)
})

it('test reconnecting', async () => {
  const connection = mock<Connection>()
  vi.mocked(createConnection).mockResolvedValue(connection)

  const homeAssistant = new HomeAssistant()
  await homeAssistant.connect('test-url', 'test-token')

  homeAssistant.reconnect()
  expect(connection.reconnect.mock.calls).toHaveLength(1)
})

function buildTestStates(): HassEntity[] {
  return [
    {
      attributes: {
        icon: 'mdi:floor-lamp'
      },
      context: {
        id: 'test_light_id',
        user_id: 'test_light_user_id',
        parent_id: null
      },
      entity_id: 'light.my_test_light',
      last_changed: '2023-01-01T00:00:00.000000+00:00',
      last_updated: '2024-01-01T00:00:00.000000+00:00',
      state: 'on'
    },
    {
      attributes: {
        icon: 'mdi:door'
      },
      context: {
        id: 'test_door_id',
        user_id: 'test_door_user_id',
        parent_id: null
      },
      entity_id: 'door.my_test_door',
      last_changed: '2023-01-02T00:00:00.000000+00:00',
      last_updated: '2024-01-02T00:00:00.000000+00:00',
      state: 'closed'
    }
  ]
}

function buildTestServices(): HassServices {
  return {
    light: {
      turn_on: {
        name: 'Turn on',
        description: 'Turn on light',
        fields: {}
      },
      turn_off: {
        name: 'Turn off',
        description: 'Turn off light',
        fields: {}
      }
    },
    switch: {
      toggle: {
        name: 'Toggle',
        description: 'Toggle switch',
        fields: {}
      }
    }
  }
}
