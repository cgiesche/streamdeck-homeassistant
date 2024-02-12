<template>
  <div>
    <label class="form-label" for="entity">Entity</label>
    <select size="5" id="entity" @change="emit('update:modelValue', $event.target.value)" :value="modelValue"
            class="form-select form-select-sm mb-1" title="The entity you want to display">
      <option v-for="entity in filteredEntities" v-bind:key="entity" :value="entity.entityId">{{
          entity.title
        }}
      </option>
    </select>
    <input type="text" class="form-control form-control-sm" v-model="entityFilter"
           placeholder="Filter by name or entity_id...">
  </div>
</template>
<script setup>

import {computed, ref} from "vue";
import {Entity} from "@/modules/pi/entity";

const props = defineProps({
  modelValue: {
    required: true,
    type: Object,
    default: () => (new Entity())
  },
  availableEntities: {
    required: true,
    type: [] // Entity[]
  }
})

const emit = defineEmits([
  'update:modelValue'
])

const entityFilter = ref("")

const filteredEntities = computed(() => {
  if (!entityFilter.value) {
    return props.availableEntities
  }

  let filterLc = entityFilter.value.toLowerCase();
  return props.availableEntities.filter(entity => {
    let entityIdMatches = entity.entityId.toLowerCase().indexOf(filterLc) !== -1;
    let titleMatches = entity.title.toLowerCase().indexOf(filterLc) !== -1;
    return entityIdMatches || titleMatches
  })
})

</script>