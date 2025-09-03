<script setup>
import { gameData, getPrimaryCurrency } from '../utils/gameData';
import { sessionData } from '../utils/sessionData';
import { ref, watch } from 'vue';
import { updateGameView } from '../utils/helpers.utils';
import TaskBox from './TaskBox.vue';
import SessionSummaryBar from './SessionSummaryBar.vue';
import DayNav from './DayNav.vue';
import LineChart from './charts/LineChart.vue';
import PremiumItemBox from './PremiumItemBox.vue';
import GameSummaryPanel from './GameSummaryPanel.vue';
import EventTaskBox from './EventTaskBox.vue';
import BarChart from './charts/BarChart.vue';

const currentContext = ref({ gameName: "", config: {}, sessionData: {}, date: "" })
const currentChart = ref('line');

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
        <div class="info-panel-parent flex-row">
            <GameSummaryPanel class="game-summary-parent" :context="currentContext" />
            <div class="chart-panel-container flex-column">
                <div class="chart-tabs-parent flex-row">
                    <div class="chart-tab" :class="{active: currentChart == 'line'}" @click="currentChart = 'line'">Line</div>
                    <div class="chart-tab" :class="{active: currentChart == 'bar'}"  @click="currentChart = 'bar'">Bar</div>
                </div>
                <div class="chart-parent">
                    <LineChart :context="currentContext" :currency="getPrimaryCurrency(currentContext.gameName)" v-if="currentChart=='line'" />
                    <BarChart  :context="currentContext" :currency="getPrimaryCurrency(currentContext.gameName)" v-if="currentChart=='bar'" />
                </div>
            </div>
        </div>
        <div class="task-container">
            <TaskBox v-if="currentContext.config?.daily != null" id="daily-tasks" :name="'daily'"
                :context="currentContext" :data="currentContext.config?.daily" />
            <TaskBox v-if="currentContext.config?.weekly != null" id="weekly-tasks" :name="'weekly'"
                :context="currentContext" :data="currentContext.config?.weekly" />
            <PremiumItemBox id="premium-items" :name="'premium'" :context="currentContext" />
            <TaskBox v-if="currentContext.config?.periodic != null" id="periodic-tasks" :name="'periodic'"
                :context="currentContext" :data="currentContext.config?.periodic" />
            <EventTaskBox id="event-tasks" :name="'event'" :context="currentContext"
                :data="currentContext.config?.event" :userData="currentContext.customEventConfig" />
        </div>
        <SessionSummaryBar :context="currentContext" />
    </div>

</template>

<style lang="css" scoped>
.info-panel-parent {
    position: relative;
    gap: 1em;
    padding: 1em;
}

.game-summary-parent {
    max-width: 14em;
    width: 14em;
    border-radius: 0.2em;
}

.chart-panel-container {
    position: relative;
    width: calc(100% - 15em - 4em);
}

.chart-parent {
    height: 17em;
    padding: 1em;
    position: relative;
    background-color: var(--background-color-tertiary);
    border-radius: 0 0.2em 0.2em 0.2em;
}

.chart-tab {
    background-color: var(--background-color-secondary);
    padding: 0.5em 1em;
    border-radius: 0.4em 0.4em 0 0;

    &.active {
        background-color: var(--background-color-tertiary);
        border-bottom: 1px solid  var(--accent-color);;
    }

    &:hover {
        background-color: var(--accent-color);
    }
}

.main-view-container {
    width: 100%;
    min-height: 100vh;
    --container-gap-value: 1em;
    position: relative;
    background-color: var(--background-color-primary);
    flex-grow: 0;
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