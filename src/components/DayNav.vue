<script setup>
import { dateNumberToDate, getCurrentDateNumberForGame, getDateNumberWithOffset } from '../utils/date.utils';

const props = defineProps(['context', 'updateCallback']);

function getDateString() {
    return dateNumberToDate(props.context.date).toLocaleDateString();
}

function getDayOfWeek() {
    return dateNumberToDate(props.context.date).toLocaleDateString("en-US", { weekday: 'long' });
}

function shiftDate(offset){
    let newDate = getDateNumberWithOffset(props.context.date, offset);

    if (newDate > getCurrentDateNumberForGame(props.context.sessionData.lastSelectedRegion.reset_time))
        return;

    props.context.date = getDateNumberWithOffset(props.context.date, offset);
    props.context.sessionData.lastSelectedDay = props.context.date;
    props.updateCallback();
}

</script>


<template>
    <div class="date-nav-container flex-row">
        <button @click="()=>shiftDate(-1)">◄</button>
        <div class="date-display-parent flex-column">
            <div class="date-num">{{ getDateString() }}</div>
            <div>{{ getDayOfWeek() }}</div>
        </div>
        <button @click="()=>shiftDate(1)">►</button>
    </div>
</template>

<style lang="css" scoped>
.date-nav-container {
    gap: 1em;
    align-items: center;
}

.date-display-parent {
    width: 5em;
    text-align: center;
}

.date-num {
    font-weight: bold;
}
</style>