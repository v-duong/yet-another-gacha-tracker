<script setup>
import { gameData, getPrimaryCurrency } from '../utils/gameData';
import { sessionData } from '../utils/sessionData';
import { ref, watch } from 'vue';
import { updateGameView } from '../utils/helpers.utils';
import TaskBox from './TaskBox.vue';
import SessionSummaryBar from './SessionSummaryBar.vue';
import DayNav from './DayNav.vue';
import LineChart from './LineChart.vue';
import PremiumItemBox from './PremiumItemBox.vue';

const currentContext = ref({ gameName: "", config: {}, sessionData: {}, date: "" })

await updateCurrent();

watch(() => sessionData.currentGameView, async () => await updateCurrent());

async function updateCurrent() {
    const c = currentContext.value;
    c.gameName = sessionData.currentGameView;
    c.config = gameData[c.gameName]?.config;

    await updateGameView(c.gameName);

    c.sessionData = sessionData.cachedGameSession[c.gameName];
    c.date = c.sessionData.lastSelectedDay;
}



</script>

<template>
    <div class="main-view-container"
        :style="{ '--accent-color': currentContext.config?.accent_color != null ? currentContext.config?.accent_color : '', '--accent-font-color': currentContext.config?.accent_font_color != null ? currentContext.config?.accent_font_color : '' }">
        <div class="top-bar flex-row">
            <div>{{ $t(currentContext.gameName + '.game_title') }}</div>
            <DayNav :context="currentContext" :updateCallback="async () => updateGameView(currentContext.gameName)">
            </DayNav>
        </div>
        <div class="chart-parent">
            <LineChart :context="currentContext" :currency="getPrimaryCurrency(currentContext.gameName)"></LineChart>
        </div>
        <div class="task-container">
            <TaskBox v-if="currentContext.config?.daily != null" id="daily-tasks" :name="'daily'"
                :context="currentContext" :data="currentContext.config?.daily" />
            <TaskBox v-if="currentContext.config?.weekly != null" id="weekly-tasks" :name="'weekly'"
                :context="currentContext" :data="currentContext.config?.weekly" />
            <PremiumItemBox id="premium-items" :name="'premium'" :context="currentContext" />
            <TaskBox v-if="currentContext.config?.periodic != null" id="periodic-tasks" :name="'periodic'"
                :context="currentContext" :data="currentContext.config?.periodic" />
            <TaskBox v-if="currentContext.config?.event != null" id="event-tasks" :name="'event'"
                :context="currentContext" :data="currentContext.config?.event" />
        </div>
        <SessionSummaryBar :context="currentContext" />
    </div>

</template>

<style lang="css" scoped>
.chart-parent {
    height: 16em;
    padding: 1em;
    width: calc(100% - 2em);
    position: relative;
    background-color: var(--background-color-tertiary);
}

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
    align-items: center;
    justify-content: space-around;
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
        min-width: calc(100% / 2 - var(--container-gap-value) - 2px);
        width: min-content
    }

    @media screen and (min-width: 1440px) {
        min-width: calc(100% / 3 - var(--container-gap-value) * 2 - 1px);
        width: min-content;
    }
}
</style>