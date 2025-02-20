import { expect, it } from 'vitest'

import { Entity } from '@/models/entity'

it('test constructing entity', () => {
  const entity = new Entity('light.living_room', 'Living Room Light')
  expect(entity.domain).toBe('light')
  expect(entity.name).toBe('living_room')
  expect(entity.title).toBe('Living Room Light')
  expect(entity.entityId).toBe('light.living_room')
})

it('test constructing entity without friendly name', () => {
  const entity = new Entity('light.living_room', null)
  expect(entity.domain).toBe('light')
  expect(entity.name).toBe('living_room')
  expect(entity.title).toBe('light.living_room')
  expect(entity.entityId).toBe('light.living_room')
})
