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
        v-bind:key="entity as any"
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
import { computed, type PropType, ref } from 'vue'
import { Entity } from '@/modules/pi/entity'

const props = defineProps({
  modelValue: {
    required: true,
    type: Object as PropType<Entity>,
    default: () => new Entity('', '', '')
  },
  availableEntities: {
    required: true,
    type: Object as PropType<Array<Entity>>
  }
})

const emit = defineEmits(['update:modelValue'])

const entityFilter = ref('')

const filteredEntities = computed(() => {
  if (!entityFilter.value) {
    return props.availableEntities
  }

  const filterLc = entityFilter.value.toLowerCase()
  return props.availableEntities.filter((entity) => {
    const entityIdMatches = entity.entityId.toLowerCase().indexOf(filterLc) !== -1
    const titleMatches = entity.title.toLowerCase().indexOf(filterLc) !== -1
    return entityIdMatches || titleMatches
  })
})
</script>
