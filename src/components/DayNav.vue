<script setup>
import { dateNumberToDate, getDateNumberWithOffset } from '../utils/date.utils';

const props = defineProps(['context', 'updateCallback']);

function getDateString() {
    return dateNumberToDate(props.context.date).toLocaleDateString();
}

function shiftDate(offset){
    props.context.date = getDateNumberWithOffset(props.context.date, offset);
    props.context.sessionData.lastSelectedDay = props.context.date;
    props.updateCallback();
}

</script>


<template>
    <div class="date-nav-container flex-row">
        <button @click="()=>shiftDate(-1)">◄</button>
        <div class="date-display">{{ getDateString() }}</div>
        <button @click="()=>shiftDate(1)">►</button>
    </div>
</template>

<style lang="css" scoped>
.date-nav-container {
    gap: 1em;
    align-items: center;
}

.date-display {
    width: 5em;
    text-align: center;
}
</style>