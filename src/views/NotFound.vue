<template>
  <div class="container text-center mt-5">
    <h2>Página não encontrada</h2>
    <p class="mt-3">
      Tente ir para
      <RouterLink :to="{ name: 'gerar' }" class="btn btn-primary ms-2">Gerar Comprovante</RouterLink>
    </p>
  </div>
</template>

<script setup>
</script>
