<script setup>
import { ref, watch } from 'vue';
import { appendGameToString, getCurrencyImage, imageExists } from '../utils/gameData';
import { handleRankedStageRecordChange } from '../utils/helpers.utils';
import { getLastPeriodicResetDateNumber, getLastWeeklyResetDateNumber, getNextPeriodicResetTime } from "../utils/date.utils";
import './style/TaskEntry.css'
import Countdown from './Countdown.vue';

const props = defineProps(['data', 'taskType', 'context']);
const lastRecords = ref(null);

let highestDate = 0;
let maxSteps = 0;
let resetTime = 0;

props.data.stepped_rewards?.forEach((entry) => {
    if (entry.step > maxSteps) maxSteps = entry.step;
});

watch(() => [props.context.date, props.context.sessionData], () => {
    let rankedProgressObj = props.context.sessionData.cachedDays[props.context.date]?.getRankedProgress(props.taskType, props.data.id);
    let resetDay = 0;

    if (lastRecords.value == null) {
        lastRecords.value = {};
    }

    props.data.ranked_stages.stages.forEach(stage => {
        lastRecords.value[stage.id] = { prev: null, current: null };
    })

    if (props.taskType == 'weekly') {
        resetDay = getLastWeeklyResetDateNumber(props.context.gameName, props.context.date);
    }
    else if (props.taskType == 'periodic' && "reset_day" in props.data) {
        resetDay = getLastPeriodicResetDateNumber(props.data.reset_day, props.context.date, props.data.reset_period);
    }
    else
        return;

    resetTime = getNextPeriodicResetTime(props.context.gameName, props.data.reset_day, props.context.date, props.data.reset_period);

    let res = props.context.sessionData.getHighestProgressForRankedStagesinRange(props.taskType, props.data, resetDay, props.context.date);
    let prevProgress = res[0];

    highestDate = res[1];

    for (const key in prevProgress) {
        lastRecords.value[key].prev = prevProgress[key];
        lastRecords.value[key].current = prevProgress[key];
    }

    for (const key in rankedProgressObj) {
        lastRecords.value[key].current = rankedProgressObj[key];
    }
}, { immediate: true, deep: 4 })

function getTotalFromStepped(stepped_rewards_array) {
    let resObj = {};
    try {
        stepped_rewards_array.forEach((entry) => {
            entry.currencies.forEach(currency => {
                if (resObj[currency.currency] == null)
                    resObj[currency.currency] = 0;
                resObj[currency.currency] += currency.amount;
            });
        });
        return resObj;
    } catch (e) {
        console.error(e)
        return {};
    }
}



function clampStepValueAndUpdate(step, id, source) {
    if (step < lastRecords.value[id].prev) {
        step = lastRecords.value[id].prev;
        source.value = step;
        return;
    }
    //
    // if (cachedValue != stepValue.value) {
    //     handleTaskRecordChange(props.context.gameName, props.taskType, props.context.date, props.data, stepValue.value);
    //     cachedValue = stepValue.value;
    // }

    handleRankedStageRecordChange(props.context.gameName, props.taskType, props.context.date, props.data, step, id);
}

function getValueFromLastRecords(s) {
    if (lastRecords.value == null)
        return null;

    if (lastRecords.value[s].current != null)
        return lastRecords.value[s].current;

    return lastRecords.value[s].prev;
}


function getPrevValueFromLastRecords(s) {
    if (lastRecords.value == null)
        return null;

    return lastRecords.value[s].prev;
}


</script>


<template>
    <div class="task-entry-container flex-column">
        <div class="stage-header flex-row">
            <div>{{ $t(appendGameToString(data.id)) }}</div>
            <Countdown v-if="taskType == 'periodic'" :date="resetTime" />
        </div>
        <div class="stage-list flex-row">
            <template v-for="stage in data.ranked_stages.stages">
                <div class="stage-list-entry flex-column">
                    <div>{{ $t(appendGameToString(stage.id)) }}</div>
                    <div class="stepped-counter flex-row">
                        <select class="stage-reward-dropdown" :id="stage.id" :value="getValueFromLastRecords(stage.id)"
                            :key="lastRecords.value" @change="
                                (e) => { clampStepValueAndUpdate(e.target.value, e.target.id, e.target); }">
                            <option value="" v-show="getValueFromLastRecords(stage.id) == null">-</option>
                            <option v-for="rewardTier in stage.rewards"
                                v-show="rewardTier.step >= getPrevValueFromLastRecords(stage.id)"
                                :value="rewardTier.step">
                                {{ $t(appendGameToString(data.ranked_stages.progress_labels[rewardTier.step])) }}
                            </option>
                        </select>
                    </div>
                    <div class="rewards-list">
                        <div class="reward-list-item">
                            <div v-for="(value, currency) in getTotalFromStepped(stage.rewards)"
                                class="currency-display">
                                {{ value }}
                                <img v-if="imageExists(context.gameName, currency)" class="currency-image" :src="getCurrencyImage(context.gameName, currency)"
                                    :alt="$t(appendGameToString(currency))" />
                                <div v-else> {{ $t(appendGameToString(currency)) }} </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<style lang="css" scoped>
.stage-header {
    justify-content: space-between;
    font-weight: bold;
    padding-bottom: 1em;

}

.stage-list {
    flex-wrap: wrap;
    gap: 0.33em;
}

.stage-list-entry {
    gap: 0.5em;
    flex-grow: 1;
    padding-bottom: 0.75em;
}
</style>