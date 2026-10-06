<template>
  <h1>
    Tente ir para 
    <a :href="`${origin}/_gerar`" target="_blank">{{ origin }}/_gerar</a>
  </h1>
</template>

<script setup>
const origin = window.location.origin
</script>
