<script setup>
import { ref, watch } from 'vue';
import { format, millisecondsToHours, millisecondsToMinutes, millisecondsToSeconds } from 'date-fns';

const props = defineProps(['date']);

let countdown = ref("");
let currentTimeout = 0;

const getCountdownString = () => {
    if (props.date == null)
        return ''
    let interval = props.date - new Date(); 
    let hours = millisecondsToHours(interval);
    let minutes = millisecondsToMinutes(interval) % 60;
    let seconds = millisecondsToSeconds(interval) % 60;
    return `${hours <= 9 && hours >= 0 ? 0 : ''}${hours}:${minutes <= 9 && minutes >= 0 ? 0 : ''}${minutes}:${seconds <= 9 && seconds >= 0 ? 0 : ''}${seconds}`;
};

tick();

function tick() {
    countdown.value = getCountdownString();
    currentTimeout = setTimeout(tick, 900);
}

</script>

<template>
    <div>{{ countdown }}</div>
</template>