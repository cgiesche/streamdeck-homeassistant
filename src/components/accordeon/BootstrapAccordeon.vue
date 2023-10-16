<template>
  <div :id="id" class="accordion">
    <slot></slot>
  </div>
</template>
<script setup>

defineProps({
  id: {
    type: String,
    required: true
  }
})
</script>
