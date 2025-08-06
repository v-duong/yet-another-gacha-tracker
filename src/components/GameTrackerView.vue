<script setup>
import { gameData } from '../utils/gameData';
import { sessionData } from '../utils/sessionData';
import TaskBox from './TaskBox.vue';
import SessionSummaryBar from './SessionSummaryBar.vue';
import { onBeforeUpdate, ref, watch } from 'vue';
import { updateGameView } from '../utils/helpers.utils';

let currentGame = ref(""), currentConfig, currentGameSession= ref("");

await updateCurrent();

watch(()=>sessionData.currentGameView, async ()=> await updateCurrent());

async function updateCurrent() {
    currentGame.value = sessionData.currentGameView;
    currentConfig = gameData[currentGame.value]?.config;
    await updateGameView(currentGame.value);
    currentGameSession.value = sessionData.cachedGameSession[currentGame.value];
}
</script>

<template>
    <div class="main-view-container"
        :style="{ '--accent-color': currentConfig?.accent_color != null ? currentConfig?.accent_color : '', '--accent-font-color': currentConfig?.accent_font_color != null ? currentConfig?.accent_font_color : '' }">
        <div class="top-bar">{{ currentGame }}</div>
        <div class="task-container" :key="currentGameSession">
            <TaskBox v-if="currentConfig?.daily != null" id="daily-tasks" :name="'daily'" :data="currentConfig?.daily"
                :gameName="currentGame" :date="currentGameSession?.lastSelectedDay" :sessionData="currentGameSession" />
            <TaskBox v-if="currentConfig?.weekly != null" id="weekly-tasks" :name="'weekly'"
                :data="currentConfig?.weekly" :gameName="currentGame" :date="currentGameSession?.lastSelectedDay"
                :sessionData="currentGameSession" />
        </div>
        <SessionSummaryBar />
    </div>

</template>

<style lang="css" scoped>
.main-view-container {
    width: 100%;
    min-height: 100vh;
    --container-gap-value: 1em;
    position: relative;
}

.top-bar {
    background-color: var(--accent-color);
    color: var(--accent-font-color);
    width: 100%;
    height: 4em;
    display: block;
}

.task-container {
    display: flex;
    flex-direction: row;
    gap: var(--container-gap-value);
    margin: 1em;
    flex-wrap: wrap;
}

.task-box {
    background-color: var(--background-color-secondary);
    border-radius: 0.2em;
    flex-grow: 1;


    @media screen and (min-width: 800px) {
        width: 100%;
    }

    @media screen and (min-width: 1050px) {
        width: calc(100% / 2 - var(--container-gap-value) - 1px);
    }

    @media screen and (min-width: 1440px) {
        width: calc(100% / 3 - var(--container-gap-value) * 2 - 1px);
    }

}
</style>