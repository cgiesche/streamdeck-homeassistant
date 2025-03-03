<template>
  <div :id="id" class="accordion">
    <slot />
  </div>
</template>
<script lang="ts" setup>
defineProps<{ id: string }>()
</script>
