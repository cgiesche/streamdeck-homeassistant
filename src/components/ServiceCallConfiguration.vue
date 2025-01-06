<template>
  <div>
    <div class="mb-3">
      <label class="form-label" for="domain">Domain</label>
      <div class="input-group">
        <select
          id="domain"
          v-model="selectedDomain"
          class="form-select form-select-sm"
          @change="
            // prettier-ignore
            update('serviceId', null);
            update('entityId', null)
          "
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
            {{ domainService.title }}
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
        :model-value="props.modelValue.entityId"
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
import { computed, onMounted, type PropType, ref } from 'vue'
import { renderString } from 'nunjucks'
import EntitySelection from '@/components/EntitySelection.vue'
import type { Service } from '@/modules/pi/service'
import type { Entity } from '@/modules/pi/entity'

const titleSort = (s1: { title: string }, s2: { title: string }) =>
  s1.title.toLowerCase() > s2.title.toLowerCase() ? 1 : -1

const props = defineProps({
  modelValue: {
    required: true,
    type: Object,
    default: () => ({
      serviceId: null,
      entityId: null,
      serviceData: null
    })
  },
  availableServices: {
    required: true,
    type: Object as PropType<Array<Service>>
  },
  availableEntities: {
    required: true,
    type: Object as PropType<Array<Entity>>
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedDomain = ref('')

onMounted(() => {
  if (props.modelValue && props.modelValue['serviceId']) {
    selectedDomain.value = props.modelValue['serviceId'].split('.')[0]
  }
})

function update(key: string, value: unknown) {
  console.log(`Update ${key} to ${JSON.stringify(value)}`)
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function clear(...keys: string[]) {
  const clearedValue = { ...props.modelValue }
  keys.forEach((key) => delete clearedValue[key])
  emit('update:modelValue', clearedValue)
}

const availableDomains = computed(() => {
  if (!props.availableServices.length) {
    return []
  }
  return props.availableServices
    .map((service) => service.domain)
    .filter((element, index, array) => array.indexOf(element) === index)
    .sort()
})

const domainServices = computed(() => {
  if (!props.availableServices.length || !selectedDomain.value) {
    return []
  }
  return props.availableServices.filter((service) => service.domain === selectedDomain.value).sort(titleSort)
})

const domainEntities = computed(() => {
  if (!props.availableServices || !props.availableEntities || !props.modelValue || !props.modelValue.serviceId) {
    return []
  }
  const selectedService = props.availableServices.filter(
    (service) => service.serviceId === props.modelValue.serviceId
  )[0]
  if (selectedService && selectedService.target && selectedService.target.entity) {
    // target.entity may contain a single or an array of entities. Make sure we always work with array.
    const targetEntities = ensureArray(selectedService.target.entity)
    const targetDomains = targetEntities
      .filter((entity) => entity.domain)
      .flatMap((entity) => ensureArray(entity.domain))
    if (targetDomains.length > 0) {
      return props.availableEntities.filter((entity) => targetDomains.includes(entity.domain)).sort(titleSort)
    } else {
      return props.availableEntities.filter((entity) => entity).sort(titleSort)
    }
  }
  return []
})

const serviceDataInvalidFeedback = computed(() => {
  const serviceDataString = props.modelValue.serviceData
  if (!serviceDataString) {
    return ''
  }
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
  if (!(props.availableServices.length && props.availableEntities && props.modelValue && props.modelValue.serviceId)) {
    return []
  }
  const selectedService = props.availableServices.filter(
    (service) => service.serviceId === props.modelValue.serviceId
  )[0]
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

function ensureArray(input: unknown) {
  return Array.isArray(input) ? input : [input]
}
</script>
