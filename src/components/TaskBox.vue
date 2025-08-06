<script setup>
import TaskEntryCheckbox from './TaskEntryCheckbox.vue'
import TaskEntryStepped from './TaskEntryStepped.vue';
import { getNextDailyResetTime, getNextWeeklyResetTime } from '../utils/helpers.utils';
import { ref } from 'vue';
import Countdown from './Countdown.vue';

const props = defineProps(['name','data','gameName', 'date', 'sessionData']);

let resetTime = ref(0);

if (props.name == 'daily')
    resetTime.value = getNextDailyResetTime(props.gameName);
else if (props.name == 'weekly')
    resetTime.value = getNextWeeklyResetTime(props.gameName);

</script>

<template>
    <div class="task-box">
        <div class="task-box-header flex-row">
            <p>{{ name }}</p>
            <Countdown :date="resetTime" :key="resetTime"></Countdown>
        </div>
        <ul>
            <li class="task-list-item" v-for="taskItem in data">
                <TaskEntryCheckbox v-if="taskItem.rewards != null" :data="taskItem" :taskType="name" :gameName="props.gameName" :date="props.date" :sessionData="props.sessionData"></TaskEntryCheckbox>
                <TaskEntryStepped v-else-if="taskItem.stepped_rewards != null" :data="taskItem" :taskType="name" :gameName="props.gameName" :date="props.date" :sessionData="props.sessionData"></TaskEntryStepped>
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

.task-entry {
    gap: 2em;
    justify-content: space-between;
    padding: 0.75em 1em;
    flex-grow: 1;
}

.task-list-item {
    display: inline-flex;
    width: 100%;
}
</style>