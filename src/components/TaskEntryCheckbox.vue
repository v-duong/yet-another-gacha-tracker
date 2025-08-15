<script setup>
import { appendGameToString, getCurrencyImage, imageExists } from '../utils/gameData';
import { handleTaskRecordChange } from '../utils/helpers.utils';
import './style/TaskEntry.css'
const props = defineProps(['data', 'taskType', 'context']);
</script>

<template>
    <div class="task-entry-container flex-column">
        <div class="task-entry flex-row align-items-center">
            <input class="task-checkbox" type="checkbox"
                :checked="context.sessionData.cachedDays[context.date]?.getProgress(taskType, data.id)" :id="data.id"
                @change="(e) => handleTaskRecordChange(context.gameName, taskType, context.date, data, e.target.checked ? 1 : 0)" />
            <p>{{ $t(appendGameToString(data.id)) }}</p>
            <div class="rewards-list">
                <div class="reward-list-item" v-for="reward in data.rewards">
                    <div class="currency-display">
                        {{ reward.amount }}
                        <img v-if="imageExists(context.gameName, reward.currency)" class="currency-image"
                            :src="getCurrencyImage(context.gameName, reward.currency)"
                            :alt="$t(appendGameToString(reward.currency))" />
                        <div v-else> {{ $t(appendGameToString(reward.currency)) }}</div>
                    </div>
                </div>
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