<template>
  <div class="mb-2">
    <b-form-group
        label="Domain"
        label-for="serviceDomain">
      <b-input-group>
        <b-form-select size="sm" id="serviceDomain"
                       :options="availableDomains"
                       v-model="selectedDomain"
                       v-on:change="update('serviceId', null); update('entityId', null)"
        ></b-form-select>
        <b-input-group-append>
          <b-button size="sm" v-on:click="selectedDomain = null; clear('serviceId', 'entityId', 'serviceData')">Clear
          </b-button>
        </b-input-group-append>
      </b-input-group>
    </b-form-group>

    <b-form-group
        label="Service"
        label-for="service"
        v-if="selectedDomain">
      <b-input-group>
        <b-form-select size="sm" id="service"
                       :options="domainServices"
                       text-field="title"
                       value-field="serviceId"
                       :value="value.serviceId"
                       @input="update('serviceId', $event)"
        ></b-form-select>
        <b-input-group-append>
          <b-button size="sm" v-on:click="clear('serviceId', 'entityId', 'serviceData')">Clear</b-button>
        </b-input-group-append>
      </b-input-group>
    </b-form-group>

    <b-form-group
        label="Entity (Optional)"
        label-for="entity"
        v-if="domainEntities.length > 0">
      <b-input-group>
        <b-form-select size="sm" id="entity"
                       :options="domainEntities"
                       text-field="title"
                       value-field="entityId"
                       :value="value.entityId"
                       @input="update('entityId', $event)"
        ></b-form-select>
        <b-input-group-append>
          <b-button size="sm" v-on:click="clear('entityId')">Clear</b-button>
        </b-input-group-append>
      </b-input-group>
    </b-form-group>

    <b-form-group
        label="Service Data JSON (Optional)"
        label-for="serviceData"
        :invalid-feedback="serviceDataFeedback"
        :state="!serviceDataFeedback"
        v-if="value.serviceId">
      <b-form-textarea
          class="text-monospace"
          size="sm"
          id="serviceData"
          :value="value.serviceData"
          @input="update('serviceData', $event)"
          rows="5"
          :state="!serviceDataFeedback"
          placeholder='{
  "option": "value"
}'
      ></b-form-textarea>
      <div class="small form-text text-muted mb-1" v-for="item in dataProperties" v-bind:key="item.name">
        <span class="text-info">{{ item.name }}</span>: {{ item.info.description }}<br>
        <span class="ml-2" v-if="item.info.example">Example: <i>{{ item.info.example }}</i></span>
      </div>
    </b-form-group>
  </div>
</template>
<script>

export default {
  props: [
    'value', // model
    'availableServices', // Service[]
    'availableEntities', // Entity[]
  ],
  emits: [
    'update:value',
  ],
  data() {
    return {
      selectedDomain: "",
    }
  },
  mounted: function () {
    if (this.value && this.value["serviceId"]) {
      this.selectedDomain = this.value["serviceId"].split('.')[0];
    }
  },
  methods: {
    update: function (key, value) {
      this.$emit('input', {...this.value, [key]: value})
    },
    clear: function (...keys) {
      let clearedValue = {...this.value};
      keys.forEach(key => clearedValue[key] = undefined)
      this.$emit('input', clearedValue)
    }
  },
  computed: {
    availableDomains: function () {
      if (!this.availableServices) {
        return [];
      }
      return this.availableServices.map(service => service.domain).filter((element, index, array) => array.indexOf(element) === index)
    },
    domainServices: function () {
      if (!this.availableServices || !this.selectedDomain) {
        return [];
      }
      return this.availableServices.filter(service => service.domain === this.selectedDomain);
    },
    domainEntities: function () {
      if (!this.availableServices || !this.availableEntities || !this.value.serviceId) {
        return [];
      }
      let selectedService = this.availableServices.filter(service => service.serviceId === this.value.serviceId)[0]
      if (selectedService && selectedService["target"] && selectedService.target["entity"]) {
        if (selectedService.target.entity["domain"]) {
          return this.availableEntities.filter(entity => entity.domain === selectedService.target.entity.domain)
        } else {
          return this.availableEntities;
        }
      } else {
        return [];
      }
    },
    serviceDataFeedback: function () {
      if (!this.value.serviceData) {
        return "";
      }
      try {
        const json = JSON.parse(this.value.serviceData);
        return (typeof json === "object") ? "" : "Service data must be an JSON object."
      } catch (e) {
        return "Invalid JSON string: " + e;
      }
    },
    dataProperties: function () {
      if (this.availableServices && this.availableEntities && this.value.serviceId) {
        let selectedService = this.availableServices.filter(service => service.serviceId === this.value.serviceId)[0]
        if (selectedService && selectedService.dataFields) {
          return Object.entries(selectedService.dataFields).map(entry => {
            return {
              "name": entry[0],
              "info": entry[1]
            }
          })
        }
      }
      return [];
    }
  }
}

</script>
