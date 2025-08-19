<template>
  <QLayout view="hHh Lpr lFf">
    <QPageContainer>
      <router-view />
    </QPageContainer>
  </QLayout>
</template>

<script setup>
import { QLayout, QPageContainer } from 'quasar'
</script>