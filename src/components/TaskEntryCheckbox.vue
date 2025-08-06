<script setup>
import { appendGameToString } from '../utils/data.utils';
import { handleDataChange } from '../utils/helpers.utils';

const props = defineProps(['data', 'gameName','taskType', 'date',  'sessionData']);

let progress;



</script>

<template>
    <div class="task-entry flex-row">
        <input class="task-checkbox" type="checkbox" :checked="sessionData.cachedDays[date].getProgress(taskType, data.id)" :id="data.id" @change="(e) => handleDataChange(props.gameName,props.taskType,props.date, data, e.target.checked ? 1 : 0)"/>
        <p>{{ $t(`${data.id}`) }}</p>
        <div class="rewards-list">
            <div class="reward-list-item" v-for="reward in data.rewards">
                <div>{{ reward.amount }} {{ $t(appendGameToString(reward.currency)) }}</div>
            </div>
        </div>
    </div>
</template>


<style lang="css" scoped>
.task-checkbox {
    background-color: black;
    --box-size: 1.25em;
    width: var(--box-size);
    height: var(--box-size);
}
</style>