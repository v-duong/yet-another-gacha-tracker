<script setup>
import { ref, watch } from 'vue';
import { format, millisecondsToHours, millisecondsToMinutes, millisecondsToSeconds } from 'date-fns';

const props = defineProps(['date', 'onZero']);

let countdown = ref("");
let fallbackDate = 0;
let currentTimeout = 0;

const getCountdownString = () => {
    if (props.date == null)
        return ''

    let interval = props.date - new Date();
    if (interval < 0 && fallbackDate > 0) {
        interval = fallbackDate - new Date();
    }

    let hours = millisecondsToHours(interval);
    let minutes = millisecondsToMinutes(interval) % 60;
    let seconds = millisecondsToSeconds(interval) % 60;
    return `${hours <= 9 && hours >= 0 ? 0 : ''}${hours}:${minutes <= 9 && minutes >= 0 ? 0 : ''}${minutes}:${seconds <= 9 && seconds >= 0 ? 0 : ''}${seconds}`;
};

tick();

function tick() {
    if ((props.date - new Date()) < 0) {
        if (props.onZero)
            fallbackDate = props.onZero();
    }
    countdown.value = getCountdownString();
    currentTimeout = setTimeout(tick, 1000);
}

</script>

<template>
    <div :title="date">{{ countdown }}</div>
</template>