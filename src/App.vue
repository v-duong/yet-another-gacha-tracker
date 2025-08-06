<script setup lang="ts">
import './assets/css/main.css'
import GameList from "./components/GameList.vue";
import GameTrackerView from "./components/GameTrackerView.vue";
//await invoke("tester", { fileName: "test" });

</script>

<template>

  <main class="container">
    <Suspense>
      <GameList />
    </Suspense>
    <Suspense>
      <GameTrackerView />
    </Suspense>
  </main>

</template>
