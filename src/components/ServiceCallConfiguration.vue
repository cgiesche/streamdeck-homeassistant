<template>
  <div>
    <div class="mb-2">
      <label class="pi-label">Domain</label>
      <TypeaheadSelect
        :model-value="selectedDomain"
        :items="domainItems"
        placeholder="No domain selected"
        @update:model-value="onDomainChange"
      />
    </div>

    <div v-if="selectedDomain" class="mb-2">
      <label class="pi-label">Service</label>
      <TypeaheadSelect
        :model-value="modelValue.serviceId"
        :items="serviceItems"
        placeholder="No service selected"
        @update:model-value="onServiceChange"
      />
    </div>

    <div v-if="domainEntities.length > 0" class="mb-2">
      <label class="pi-label">Entity</label>
      <TypeaheadSelect
        :model-value="props.modelValue.entityId"
        :items="entityItems"
        placeholder="No entity selected"
        @update:model-value="update('entityId', $event)"
      />
    </div>

    <template v-if="props.modelValue.serviceId">
      <label class="pi-label" for="serviceData">
        Service data JSON
        <span
          class="text-muted"
          style="font-weight: normal; text-transform: none; letter-spacing: 0"
          >(optional)</span
        >
      </label>
      <textarea
        id="serviceData"
        :class="{ 'is-invalid': serviceDataInvalidFeedback }"
        :value="props.modelValue.serviceData"
        class="pi-textarea"
        placeholder='{
  "option": "value"
}'
        rows="5"
        @input="update('serviceData', $event.target.value)"
      ></textarea>
      <div v-if="serviceDataInvalidFeedback" class="pi-invalid-feedback">
        {{ serviceDataInvalidFeedback }}
      </div>

      <details v-if="dataProperties && dataProperties.length > 0" class="pi-vars mt-1">
        <summary>Available options</summary>
        <div class="pi-vars-content">
          <div v-for="item in dataProperties" :key="item.name" class="pi-var-text">
            <span class="pi-var-item">{{ item.name }}</span>
            <button
              class="pi-btn pi-btn-icon pi-btn-ghost pi-btn-sm"
              type="button"
              :aria-label="`Add ${item.name} field`"
              title="Add field to service data"
              @click="addField(item.name, item.info)"
            >
              +
            </button>
            <span v-if="item.info.required" class="text-warning"> (required)</span>
            <template v-if="item.info.example">
              <br /><span class="text-muted"
                >Example: <i>{{ item.info.example }}</i></span
              >
            </template>
          </div>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import nunjucksEnv from '../modules/common/nunjucksEnv.js'
import TypeaheadSelect from '@/components/ui/TypeaheadSelect.vue'

const titleSort = (s1, s2) => s1.name.localeCompare(s2.name, undefined, { sensitivity: 'base' })

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      serviceId: null,
      entityId: null,
      serviceData: null
    })
  },
  availableServices: {
    required: true,
    type: Array // Service[]
  },
  availableEntities: {
    required: true,
    type: Array // Entity[]
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedDomain = ref('')

onMounted(() => {
  if (props.modelValue && props.modelValue['serviceId']) {
    selectedDomain.value = props.modelValue['serviceId'].split('.')[0]
  }
})

function update(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function clear(...keys) {
  let clearedValue = { ...props.modelValue }
  keys.forEach((key) => delete clearedValue[key])
  emit('update:modelValue', clearedValue)
}

const availableDomains = computed(() => {
  if (!props.availableServices.length) {
    return []
  }
  return [...new Set(props.availableServices.map((service) => service.domain))].sort()
})

const domainItems = computed(() => availableDomains.value.map((d) => ({ id: d, label: d })))

const serviceItems = computed(() =>
  domainServices.value.map((s) => ({ id: s.serviceId, label: s.name }))
)

const entityItems = computed(() =>
  domainEntities.value.map((e) => ({ id: e.entityId, label: e.title, group: e.domain }))
)

function onDomainChange(val) {
  selectedDomain.value = val
  clear('serviceId', 'entityId', 'serviceData')
}

function onServiceChange(val) {
  if (!val) {
    clear('serviceId', 'entityId', 'serviceData')
  } else {
    // Clear stale service data so the watcher below can prefill the
    // required fields of the newly selected service.
    emit('update:modelValue', { ...props.modelValue, serviceId: val, serviceData: '' })
  }
}

const domainServices = computed(() => {
  if (!props.availableServices.length || !selectedDomain.value) {
    return []
  }
  return props.availableServices
    .filter((service) => service.domain === selectedDomain.value)
    .sort(titleSort)
})

const domainEntities = computed(() => {
  if (
    !props.availableServices ||
    !props.availableEntities ||
    !props.modelValue ||
    !props.modelValue.serviceId
  ) {
    return []
  }
  const selectedService = props.availableServices.find(
    (service) => service.serviceId === props.modelValue.serviceId
  )
  if (selectedService && selectedService.target && selectedService.target.entity) {
    // target.entity may contain a single or an array of entities. Make sure we always work with array.
    let targetEntities = ensureArray(selectedService.target.entity)
    let targetDomains = targetEntities
      .filter((entity) => entity.domain)
      .flatMap((entity) => ensureArray(entity.domain))
    if (targetDomains.length > 0) {
      return props.availableEntities
        .filter((entity) => targetDomains.includes(entity.domain))
        .sort(titleSort)
    } else {
      return props.availableEntities.filter((entity) => entity).sort(titleSort)
    }
  }
  return []
})

const serviceDataInvalidFeedback = computed(() => {
  let serviceDataString = props.modelValue.serviceData
  if (!serviceDataString) {
    return ''
  }
  try {
    const renderedServiceData = nunjucksEnv.renderString(serviceDataString, {
      ticks: 5,
      rotationPercent: 100,
      rotationAbsolute: 100
    })

    const json = JSON.parse(renderedServiceData)
    return typeof json === 'object' ? '' : 'Service data must be an JSON object.'
  } catch (e) {
    return 'Invalid JSON string: ' + e
  }
})

const dataProperties = computed(() => {
  if (
    !(
      props.availableServices.length &&
      props.availableEntities &&
      props.modelValue &&
      props.modelValue.serviceId
    )
  ) {
    return []
  }
  const selectedService = props.availableServices.find(
    (service) => service.serviceId === props.modelValue.serviceId
  )
  if (!selectedService || !selectedService.dataFields) {
    return []
  }
  return Object.entries(selectedService.dataFields).map((entry) => {
    return {
      name: entry[0],
      info: entry[1]
    }
  })
})

function ensureArray(input) {
  return Array.isArray(input) ? input : [input]
}

function generateRequiredFieldsJson(service) {
  if (!service?.dataFields) return null
  const required = Object.entries(service.dataFields).filter(([, info]) => info.required)
  if (required.length === 0) return null
  const obj = {}
  required.forEach(([name, info]) => {
    obj[name] = info.example !== undefined ? info.example : null
  })
  return JSON.stringify(obj, null, 2)
}

watch(
  () => props.modelValue.serviceId,
  (newId) => {
    if (!newId) return
    // Only prefill when there is no service data yet — otherwise saved
    // settings arriving asynchronously would be overwritten.
    if (props.modelValue.serviceData) return
    const service = props.availableServices.find((s) => s.serviceId === newId)
    const generated = generateRequiredFieldsJson(service)
    if (generated) update('serviceData', generated)
  }
)

function addField(fieldName, fieldInfo) {
  let current = {}
  try {
    if (props.modelValue.serviceData) current = JSON.parse(props.modelValue.serviceData)
  } catch {
    /* ignore invalid JSON */
  }
  if (!(fieldName in current)) {
    current[fieldName] = fieldInfo.example !== undefined ? fieldInfo.example : null
  }
  update('serviceData', JSON.stringify(current, null, 2))
}
</script>
