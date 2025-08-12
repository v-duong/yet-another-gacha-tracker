<script setup lang="ts">
import { ref, watch } from 'vue';
import { appendGameToString, SteppedRewardEntry } from '../utils/gameData';
import { handleTaskRecordChange } from '../utils/helpers.utils';
import { dateNumberToDate, getLastPeriodicResetDateNumber, getLastWeeklyResetDateNumber } from "../utils/date.utils";
import './style/TaskEntry.css'

const props = defineProps(['data', 'taskType', 'context']);
const stepValue = defineModel({ default: 0 });
const lastRecords = ref();

let maxSteps = 0;
let minSteps = 0;
let cachedValue: number = -4;


props.data.stepped_rewards?.forEach((entry: SteppedRewardEntry) => {
    if (entry.step > maxSteps) maxSteps = entry.step;
});

watch(() => [props.context.date, props.context.sessionData], () => {
    let x = props.context.sessionData.cachedDays[props.context.date]?.getProgress(props.taskType, props.data.id);
    let resetDay = 0;

    if (props.taskType == 'weekly')
        resetDay = getLastWeeklyResetDateNumber(props.context.gameName, props.context.date);
    else if (props.taskType == 'periodic' && "reset_day" in props.data)
        resetDay = getLastPeriodicResetDateNumber(props.data.reset_day, props.context.date, props.data.reset_period);
    else
        return;

    let res = props.context.sessionData.getHighestProgressForTaskinRange(props.taskType, props.data.id, resetDay, props.context.date);

    if (x != null) {
        stepValue.value = x;
    } else {
        stepValue.value = res.highest;
    }

    minSteps = res.highest;
    stepValue.value = stepValue.value < minSteps ? minSteps : stepValue.value;
    lastRecords.value = res;
}, { immediate: true })

function getTotalFromStepped(stepped_rewards_array: SteppedRewardEntry[]) {
    let resObj: { [key: string]: number } = {};
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


function decrement() {
    stepValue.value--;
    clampStepValueAndUpdate();
}
function increment() {
    stepValue.value++;
    clampStepValueAndUpdate();
}

function clampStepValueAndUpdate() {
    if (stepValue.value < minSteps)
        stepValue.value = minSteps;
    if (stepValue.value > maxSteps)
        stepValue.value = maxSteps;

    if (cachedValue != stepValue.value) {
        handleTaskRecordChange(props.context.gameName, props.taskType, props.context.date, props.data, stepValue.value);
        cachedValue = stepValue.value;
    }
}


</script>


<template>
    <div class="task-entry-container flex-column">
        <div class="task-entry flex-row">
            <div class="stepped-counter flex-row">
                <button @click="decrement">-</button>
                <input type="number" class="step-input" v-model="stepValue" :id="data.id" @change="// @ts-ignore 
                    (e) => { clampStepValueAndUpdate(); }" />
                <div>/ {{ maxSteps }}</div>
                <button @click="increment">+</button>
            </div>
            <p>{{ $t(appendGameToString(data.id)) }}</p>
            <div class="rewards-list">
                <div class="reward-list-item">
                    <div v-for="(value, currency) in getTotalFromStepped(data.stepped_rewards)">
                        {{ value }} {{
                            $t(appendGameToString(currency))
                        }}</div>
                </div>
            </div>
        </div>
        <div v-show="lastRecords.highestDate != 0"> Previous record: {{ lastRecords.highest }} on {{
            dateNumberToDate(lastRecords.highestDate).toISOString().slice(0,10) }}</div>
    </div>

</template>

<style lang="css" scoped>
.stepped-counter {
    gap: 0.33em;
    align-items: center;

    button {
        background-color: var(--background-color-highlight);
        border: none;
        width: 1.15em;
        height: 1.15em;
    }

    .step-input {
        width: 2.5em;
        background-color: rgba(0, 0, 0, 0.33);
        border: none;
        text-align: center;
        color: var(--main-text-color);
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type=number] {
        -moz-appearance: textfield;
        appearance: textfield;
    }

    div {
        text-wrap-mode: nowrap;
    }
}
</style>