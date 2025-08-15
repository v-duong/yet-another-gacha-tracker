<script setup>
import TaskEntryCheckbox from './TaskEntryCheckbox.vue'
import TaskEntryStepped from './TaskEntryStepped.vue';
import TaskEntryRankedStages from './TaskEntryRankedStages.vue';
import { getCurrentDateNumberForGame, getNextDailyResetTime, getNextWeeklyResetTime } from "../utils/date.utils";
import { onUpdated, ref, watch } from 'vue';
import Countdown from './Countdown.vue';

const props = defineProps(['name', 'context', 'data']);

let resetTime = ref(0);

function getResetTime() {
    if (props.name == 'daily')
        resetTime.value = getNextDailyResetTime(props.context.gameName);
    else if (props.name == 'weekly')
        resetTime.value = getNextWeeklyResetTime(props.context.gameName);
}

function shouldShowTimer(){
    if(props.name == 'periodic') return false;

    if (props.name=='daily' || props.name=='weekly') {
        return props.context.date == getCurrentDateNumberForGame(props.context.gameName)
    }

    return true;
}

watch(() => props.context.sessionData, () => getResetTime(), { immediate: "yes" });

</script>

<template>
    <div class="task-box">
        <div v-show="name != 'periodic'" class="task-box-header flex-row">
            <p>{{ $t(name) }}</p>
            <Countdown v-if="shouldShowTimer()" :date="resetTime" :key="resetTime"></Countdown>
        </div>
        <ul>
            <li class="task-list-item" v-for="taskItem in data">
                <TaskEntryCheckbox v-if="taskItem.rewards != null" :data="taskItem" :taskType="name" :context="context">
                </TaskEntryCheckbox>
                <TaskEntryStepped v-else-if="taskItem.stepped_rewards != null" :data="taskItem" :taskType="name"
                    :context="context"></TaskEntryStepped>
                <TaskEntryRankedStages v-else-if="taskItem.ranked_stages != null" :data="taskItem" :taskType="name"
                    :context="context"></TaskEntryRankedStages>
            </li>
        </ul>
    </div>
</template>

<style lang="css" scoped>
.task-box-header {
    font-weight: bold;
    justify-content: space-between;
    padding: 0.75em 1em;
    border-bottom: 1px solid var(--background-color-highlight);
}


</style>