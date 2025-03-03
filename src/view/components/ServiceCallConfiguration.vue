<template>
  <div>
    <div class="mb-3">
      <label class="form-label" for="domain">Domain</label>
      <div class="input-group">
        <select
          id="domain"
          v-model="selectedDomain"
          class="form-select form-select-sm"
          @change="clear('serviceId', 'entityId')"
        >
          <option v-for="availableDomain in availableDomains" :key="availableDomain" :value="availableDomain">
            {{ availableDomain }}
          </option>
        </select>
        <button
          class="btn btn-sm btn-outline-secondary"
          type="button"
          @click="
            // prettier-ignore
            selectedDomain = '';
            clear('serviceId', 'entityId', 'serviceData')
          "
        >
          Clear
        </button>
      </div>
    </div>

    <div v-if="selectedDomain" class="mb-3">
      <label class="form-label" for="service">Service</label>
      <div class="input-group">
        <select
          id="service"
          :value="modelValue.serviceId"
          class="form-select form-select-sm"
          @change="update('serviceId', ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="domainService in domainServices"
            v-bind:key="domainService.serviceId"
            :value="domainService.serviceId"
          >
            {{ domainService.title || domainService.name }}
          </option>
        </select>
        <button
          class="btn btn-sm btn-outline-secondary"
          type="button"
          @click="clear('serviceId', 'entityId', 'serviceData')"
        >
          Clear
        </button>
      </div>
    </div>

    <div v-if="domainEntities.length > 0" class="mb-3">
      <EntitySelection
        class="mb-3"
        :available-entities="domainEntities"
        @change="update('entityId', $event.target.value)"
        :model-value="props.modelValue.entityId ?? ''"
      />
      <button class="btn btn-sm btn-outline-secondary" type="button" @click="clear('entityId')">Clear</button>
    </div>

    <template v-if="props.modelValue.serviceId">
      <label class="form-label" for="serviceData">Service Data JSON (Optional)</label>
      <textarea
        id="serviceData"
        :class="{ 'is-invalid': serviceDataInvalidFeedback }"
        :value="props.modelValue.serviceData"
        class="form-control form-control-sm font-monospace"
        placeholder='{
  "option": "value"
}'
        rows="5"
        @input="update('serviceData', ($event.target as HTMLTextAreaElement).value)"
      />
      <div class="invalid-feedback" v-if="serviceDataInvalidFeedback">
        {{ serviceDataInvalidFeedback }}
      </div>

      <details v-if="dataProperties && dataProperties.length > 0">
        <summary>Available options</summary>
        <div v-for="item in dataProperties" v-bind:key="item.name" class="form-text">
          <span class="text-info font-monospace">{{ item.name }}&nbsp;</span>
          <span class="text-warning font-monospace" v-if="item.info.required">(required) </span
          >{{ item.info.description }}
          <template v-if="item.info.example">
            <br />
            <span class="ml-2">
              Example: <i>{{ item.info.example }}</i>
            </span>
          </template>
        </div>
      </details>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { renderString } from 'nunjucks'
import { computed, onMounted, ref } from 'vue'

import type { Entity } from '@/models/entity.ts'
import type { Service } from '@/models/service.ts'
import type { ActionSettings } from '@/models/settings/settings.ts'
import EntitySelection from '@/view/components/EntitySelection.vue'

const titleSort = (s1: { title: string }, s2: { title: string }) =>
  s1.title.toLowerCase() > s2.title.toLowerCase() ? 1 : -1

const props = defineProps<{
  modelValue: ActionSettings
  availableServices: Array<Service>
  availableEntities: Array<Entity>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ActionSettings): void
}>()

const selectedDomain = ref('')

onMounted(() => {
  selectedDomain.value = props.modelValue?.serviceId?.split('.')[0] || ''
})

function update(key: keyof ActionSettings, value: Nullable<string>) {
  console.log(`Update ${key} to ${JSON.stringify(value)}`)
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function clear(...keys: (keyof ActionSettings)[]) {
  const clearedValue = { ...props.modelValue }
  keys.forEach((key) => delete clearedValue[key])
  emit('update:modelValue', clearedValue)
}

const availableDomains = computed(() => {
  if (!props.availableServices.length) return []

  return props.availableServices
    .map((service) => service.domain)
    .filter((element, index, array) => array.indexOf(element) === index)
    .sort()
})

const domainServices = computed(() => {
  if (!props.availableServices.length || !selectedDomain.value) return []

  return props.availableServices.filter((service) => service.domain === selectedDomain.value).sort(titleSort)
})

const domainEntities = computed(() => {
  if (!props.availableServices || !props.availableEntities || !props.modelValue?.serviceId) return []

  const selectedService = props.availableServices.find((service) => service.serviceId === props.modelValue.serviceId)
  if (selectedService?.domains?.length) {
    return props.availableEntities.filter((entity) => selectedService.domains.includes(entity.domain)).sort(titleSort)
  } else {
    return []
  }
})

const serviceDataInvalidFeedback = computed(() => {
  const serviceDataString = props.modelValue.serviceData
  if (!serviceDataString) return ''

  try {
    const renderedServiceData = renderString(serviceDataString, {
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
  const selectedService = props.availableServices.find((service) => service.serviceId === props.modelValue?.serviceId)
  return selectedService?.dataFields || []
})
</script>
