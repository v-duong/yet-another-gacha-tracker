<script setup lang="ts">
import { watch } from 'vue';
import { appendGameToString, SteppedRewardEntry } from '../utils/gameData';
import { handleTaskRecordChange } from '../utils/helpers.utils';
import { dateNumberToDate, dateToDateNumber, getLastWeeklyResetDateNumber } from "../utils/date.utils";

const props = defineProps(['data', 'gameName', 'taskType', 'date', 'sessionData']);
const stepValue = defineModel({ default: 0 });

let maxSteps = 0;
let minSteps = 0;
let cachedValue: number = -4;
props.data.stepped_rewards?.forEach((entry: SteppedRewardEntry) => {
    if (entry.step > maxSteps) maxSteps = entry.step;
});

watch(() => props.sessionData, () => {
    let x = props.sessionData.cachedDays[props.date]?.getProgress(props.taskType, props.data.id);
    let res = props.sessionData.getHighestProgressForSteppedinRange(props.taskType, props.data.id, getLastWeeklyResetDateNumber(props.gameName, props.date), props.date);

    if (x != null) {
        stepValue.value = x;
    } 

    minSteps = res.highest;
    stepValue.value = stepValue.value < minSteps ? minSteps : stepValue.value;
    console.log(res)
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
        handleTaskRecordChange(props.gameName, props.taskType, props.date, props.data, stepValue.value);
        cachedValue = stepValue.value;
    }
}


</script>


<template>
    <div class="task-entry flex-row">
        <div class="stepped-counter flex-row">
            <button @click="decrement">-</button>
            <input type="number" class="step-input" v-model="stepValue" :id="data.id" @change="// @ts-ignore 
                (e) => { clampStepValueAndUpdate(); }" />
            <div>/ {{ maxSteps }}</div>
            <button @click="increment">+</button>
        </div>
        <p>{{ data.id }}</p>
        <div class="rewards-list">
            <div class="reward-list-item">
                <div v-for="(value, currency) in getTotalFromStepped(data.stepped_rewards)">
                    {{ value }} {{
                        // @ts-ignore
                        $t(appendGameToString(currency))
                    }}</div>
            </div>
        </div>
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