<script setup>
import { ref } from 'vue';
import { format, millisecondsToHours, millisecondsToMinutes, millisecondsToSeconds } from 'date-fns';

const props = defineProps(['date']);

let countdown = ref("");

const getCountdownString = () => {
    let interval = props.date - new Date(); 
    let hours = millisecondsToHours(interval);
    let minutes = millisecondsToMinutes(interval) % 60;
    let seconds = millisecondsToSeconds(interval) % 60;
    return `${hours <= 9 && hours >= 0 ? 0 : ''}${hours}:${minutes <= 9 && minutes >= 0 ? 0 : ''}${minutes}:${seconds <= 9 && seconds >= 0 ? 0 : ''}${seconds}`;
};

tick();

function tick() {
    countdown.value = getCountdownString();
    setTimeout(tick, 1000);
}

</script>

<template>
    <div>{{ countdown }}</div>
</template>