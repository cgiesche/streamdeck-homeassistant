<template>
  <div class="accordion-item">
    <h2 class="accordion-header" :id="itemId">
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#collapse' + itemId" aria-expanded="true" :aria-controls="'collapse' + itemId">
        {{ title }}
      </button>
    </h2>
    <div :id="'collapse' + itemId" class="accordion-collapse collapse" :aria-labelledby="itemId" :data-bs-parent="'#' + accordeonId">
      <div class="accordion-body">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  accordeonId: {
    type: String,
    required: true
  },
  itemId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
})
</script>
