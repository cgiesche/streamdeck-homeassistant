<template>
  <div>
    <label class="form-label" for="entity">Entity</label>
    <select
      size="5"
      id="entity"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      :value="modelValue"
      class="form-select form-select-sm mb-1"
    >
      <option
        v-for="entity in filteredEntities"
        v-bind:key="entity.entityId"
        :value="entity.entityId"
        :title="entity?.entityId"
      >
        {{ entity.title }}
      </option>
    </select>
    <input
      type="text"
      class="form-control form-control-sm"
      v-model="entityFilter"
      placeholder="Filter by name or entity_id..."
    />
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'

import type { Entity } from '@/models/entity.ts'

const props = defineProps<{
  modelValue: string
  availableEntities: Array<Entity>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const entityFilter = ref('')

const filteredEntities = computed(() => {
  const filterLc = entityFilter.value.toLowerCase()
  return props.availableEntities.filter(
    ({ entityId, title }) => entityId.toLowerCase().includes(filterLc) || title.toLowerCase().includes(filterLc)
  )
})
</script>
