<template>
  <div class="container">
    <ul>
      <li>{{selectedDomain}}</li>
      <li>{{selectedService}}</li>
      <li>{{selectedEntity}}</li>
    </ul>

    <b-form-group
        label="Service domain"
        label-for="serviceDomain">
      <b-form-select size="sm" id="serviceDomain" v-model="selectedDomain" :options="availableDomains" v-on:change="selectedService = null; selectedEntity = null;"></b-form-select>
    </b-form-group>

    <b-form-group
        label="Service"
        label-for="service"
        description="(Optional) Service that should be called when the stream deck button is pressed."
        v-if="selectedDomain">
      <b-input-group>
        <b-form-select size="sm" id="service" v-model="selectedService" :options="domainServices"></b-form-select>
        <b-input-group-append>
          <b-button size="sm" v-on:click="selectedService = null">Clear</b-button>
        </b-input-group-append>
      </b-input-group>
    </b-form-group>

    <b-form-group
        label="Entity"
        label-for="entity"
        description="(Optional) Entity to call the service on."
        v-if="selectedService">
      <b-input-group>
        <b-form-select size="sm" id="service" v-model="selectedEntity" :options="domainEntities"
                       text-field="name"></b-form-select>
        <b-input-group-append>
          <b-button size="sm" v-on:click="selectedEntity = null">Clear</b-button>
        </b-input-group-append>
      </b-input-group>
    </b-form-group>

    <b-form-group
        label="Service Data JSON"
        label-for="serviceData"
        description="(Optional) Service data that will be sent with the service call. If not specified in the JSON-Object, the attribute 'entity_id' will be added automatically."
        :invalid-feedback="serviceDataFeedback"
        :state="!serviceDataFeedback"
        v-if="selectedService">
      <b-form-textarea
          class="text-monospace"
          size="sm"
          id="serviceData"
          v-model="serviceData"
          rows="5"
          :state="!serviceDataFeedback"
      ></b-form-textarea>
    </b-form-group>
  </div>
</template>
<script>
export default {
  props: [
    'availableServices', // Service[]
    'availableEntities', // Entity[]
  ],
  emits: [
    'update:selectedDomain',
    'update:selectedService',
    'update:selectedEntity',
    'update:serviceData',
  ],
  data() {
    return {
      selectedDomain: "",
      selectedService: "",
      selectedEntity: "",
      serviceData: ""
    }
  },
  computed: {
    availableDomains: function () {
      if (!this.availableServices) {
        return [];
      }
      return Object.keys(this.availableServices).sort()
    },
    domainServices: function () {
      if (!this.availableServices || !this.selectedDomain) {
        return [];
      }
      return convertToArray(this.availableServices[this.selectedDomain]);
    },
    domainEntities: function () {
      if (!this.availableEntities || !this.selectedDomain) {
        return [];
      }
      let entityPrefix = this.selectedDomain + ".";
      return this.availableEntities.filter((e) => e.entity_id.startsWith(entityPrefix));
    },
    serviceDataFeedback: function () {
      if (!this.serviceData) {
        return "";
      }
      try {
        const json = JSON.parse(this.serviceData);
        return (typeof json === "object") ? "" : "Service data must be an JSON object."
      } catch (e) {
        return "Invalid JSON string: " + e;
      }
    },
  }
}

function convertToArray(object) {
  return Object.entries(object).map(entry => {
    return {
      text: entry[0],
      value: {
        id: entry[0],
        data: entry[1]
      }
    }
  })
}
</script>
