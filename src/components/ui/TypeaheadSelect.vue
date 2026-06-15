<template>
  <div ref="pickerEl" class="pi-entity-picker">
    <div class="pi-entity-search" :class="{ open: isOpen }">
      <span class="pi-search-icon">&#128269;</span>
      <input
        ref="searchInput"
        :value="inputDisplayValue"
        type="text"
        :placeholder="isOpen ? 'Filter…' : placeholder"
        autocomplete="off"
        spellcheck="false"
        :class="{ 'has-value': !isOpen && modelValue }"
        @focus="onFocus"
        @input="filter = $event.target.value"
        @keydown="onKeydown"
      />
      <button
        v-if="modelValue"
        class="pi-clear-btn"
        tabindex="-1"
        aria-label="Clear selection"
        @mousedown.prevent="clear"
      >
        ✕
      </button>
    </div>

    <div v-if="isOpen" class="pi-entity-dropdown">
      <div ref="listEl" class="pi-entity-list">
        <div
          v-for="(item, index) in filteredItems"
          :key="item.id"
          :ref="(el) => (itemRefs[index] = el)"
          class="pi-entity-item"
          :class="{ selected: item.id === modelValue, focused: index === focusedIndex }"
          @mousedown.prevent="select(item.id)"
          @mouseenter="focusedIndex = index"
        >
          <span
            v-if="item.group"
            class="pi-entity-badge"
            :style="{ background: groupColor(item.group) }"
            >{{ item.group }}</span
          >
          <span class="pi-entity-name">{{ item.label }}</span>
          <span v-if="item.id !== item.label" class="pi-entity-id">{{ item.id }}</span>
        </div>
      </div>
      <div class="pi-entity-count">{{ filteredItems.length }} of {{ items.length }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const GROUP_COLORS = {
  light: '#b8860b',
  switch: '#2dd4bf',
  sensor: '#34d399',
  cover: '#a78bfa',
  media_player: '#f87171',
  climate: '#2563eb',
  binary_sensor: '#fb923c',
  input_boolean: '#2dd4bf',
  automation: '#e879f9',
  script: '#a78bfa',
  scene: '#16a34a',
  default: '#6b7280'
}

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  items: {
    required: true,
    type: Array // { id: string, label: string, group?: string }[]
  },
  placeholder: {
    type: String,
    default: 'No selection'
  }
})

const emit = defineEmits(['update:modelValue'])

const filter = ref('')
const isOpen = ref(false)
const focusedIndex = ref(-1)
const itemRefs = ref([])
const pickerEl = ref(null)
const searchInput = ref(null)

const selectedItem = computed(() => props.items.find((i) => i.id === props.modelValue) ?? null)

const inputDisplayValue = computed(() => {
  if (!isOpen.value && selectedItem.value) {
    return selectedItem.value.label
  }
  return filter.value
})

const filteredItems = computed(() => {
  if (!filter.value) return props.items
  const lc = filter.value.toLowerCase()
  return props.items.filter(
    (i) => i.id.toLowerCase().includes(lc) || i.label.toLowerCase().includes(lc)
  )
})

watch(filteredItems, () => {
  focusedIndex.value = -1
  itemRefs.value = []
})

function groupColor(group) {
  return GROUP_COLORS[group] ?? GROUP_COLORS.default
}

function onFocus() {
  filter.value = ''
  isOpen.value = true
  focusedIndex.value = -1
}

function select(id) {
  emit('update:modelValue', id)
  isOpen.value = false
  filter.value = ''
  searchInput.value?.blur()
}

function clear() {
  emit('update:modelValue', '')
  filter.value = ''
  isOpen.value = false
}

function scrollFocused() {
  itemRefs.value[focusedIndex.value]?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(e) {
  if (!isOpen.value && e.key !== 'Escape') {
    isOpen.value = true
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex.value = Math.min(focusedIndex.value + 1, filteredItems.value.length - 1)
    scrollFocused()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
    scrollFocused()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const idx = focusedIndex.value >= 0 ? focusedIndex.value : 0
    const item = filteredItems.value[idx]
    if (item) select(item.id)
  } else if (e.key === 'Escape') {
    isOpen.value = false
    filter.value = ''
    searchInput.value?.blur()
  }
}

function onDocumentMousedown(e) {
  if (pickerEl.value && !pickerEl.value.contains(e.target)) {
    isOpen.value = false
    filter.value = ''
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))
</script>
