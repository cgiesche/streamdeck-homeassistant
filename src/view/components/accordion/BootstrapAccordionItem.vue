<template>
  <div class="accordion-item">
    <h2 class="accordion-header" :id="itemId">
      <button
        class="accordion-button collapsed"
        type="button"
        data-bs-toggle="collapse"
        :data-bs-target="'#collapse' + itemId"
        aria-expanded="true"
        :aria-controls="'collapse' + itemId"
      >
        {{ title }}
      </button>
    </h2>
    <div
      :id="'collapse' + itemId"
      class="accordion-collapse collapse"
      :aria-labelledby="itemId"
      :data-bs-parent="'#' + accordionId"
    >
      <div class="accordion-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  accordionId: string
  itemId: string
  title: string
}>()
</script>
