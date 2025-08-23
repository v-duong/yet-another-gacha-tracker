<script setup>
import TaskEntryCheckbox from './TaskEntryCheckbox.vue'
import TaskEntryStepped from './TaskEntryStepped.vue';
import TaskEntryRankedStages from './TaskEntryRankedStages.vue';
import { getCurrentDateNumberForGame, getNextDailyResetTime, getNextWeeklyResetTime } from "../utils/date.utils";
import { onUpdated, ref, watch } from 'vue';
import Countdown from './Countdown.vue';
import TaskInputModal from './TaskInputModal.vue';
import TaskEntryGeneric from './TaskEntryGeneric.vue';

const props = defineProps(['name', 'context', 'data', 'userData']);
</script>

<template>
    <div class="task-box">
        <div class="task-box-header flex-row">
            <p>{{ $t(name) }}</p>
            <button class="square-button" v-on:click="$refs.modal.showModal()">+</button>
        </div>
        <ul>
            <li class="task-list-item" v-for="taskItem in data">
                <TaskEntryCheckbox v-if="taskItem.rewards != null" :data="taskItem" :taskType="name" :context="context">
                </TaskEntryCheckbox>
                <TaskEntryStepped v-else-if="taskItem.stepped_rewards != null" :data="taskItem" :taskType="name"
                    :context="context"></TaskEntryStepped>
                <TaskEntryRankedStages v-else-if="taskItem.ranked_stages != null" :data="taskItem" :taskType="name"
                    :context="context"></TaskEntryRankedStages>
            </li>
            <li class="task-list-item" v-for="taskItem in userData">
                <TaskEntryCheckbox v-if="taskItem.rewards != null" :data="taskItem" :taskType="name" :context="context">
                </TaskEntryCheckbox>
                <TaskEntryStepped v-else-if="taskItem.stepped_rewards != null" :data="taskItem" :taskType="name"
                    :context="context"></TaskEntryStepped>
                <TaskEntryRankedStages v-else-if="taskItem.ranked_stages != null" :data="taskItem" :taskType="name"
                    :context="context"></TaskEntryRankedStages>
            </li>
            <li class="task-list-item" v-for="(eventItem, key) in context.sessionData.cachedDays[context.date].eventProgress">
                <TaskEntryGeneric v-if="!eventItem.hasMatchingConfig" :data="eventItem" :taskName="key" :taskType="name" :context="context">
                </TaskEntryGeneric>
            </li>
        </ul>
        <TaskInputModal ref="modal" :name="'Event Task Input'" :context="context" :type="'event'"></TaskInputModal>
    </div>

</template>

<style lang="css" scoped>
.task-box-header {
    font-weight: bold;
    justify-content: space-between;
    padding: 0.75em 1em;
    border-bottom: 1px solid var(--background-color-highlight);
}
</style>