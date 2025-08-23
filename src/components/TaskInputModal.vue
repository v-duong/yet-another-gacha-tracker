<script setup>
import { ref, useTemplateRef } from 'vue';
import { appendGameToString } from '../utils/gameData';
import { handleTaskRecordChange } from '../utils/helpers.utils';

const props = defineProps(['name', 'context', 'type']);
const taskEntry = defineModel({ default: { id: '', type: 'checkbox', rewards: ref([]) } });

const modal = useTemplateRef('modal');
let warning = ref('');

function showModal() {
    modal.value.showModal();
}

function resetTask() {
    taskEntry.value.id = '';
    taskEntry.value.type = 'checkbox';
    taskEntry.value.rewards.value = []
}

function addReward() {
    taskEntry.value.rewards.value.push({ currency: '', amount: 0 })
}

function removeReward(item) {
    console.log(item)
    let i = taskEntry.value.rewards.value.findIndex(x => x == item);
    taskEntry.value.rewards.value.splice(i, 1);
}

function closeModal() {
    resetTask();
    modal.value.close();
}

function submitData() {
    warning.value = ''
    taskEntry.value.id = taskEntry.value.id.trim();

    if (!taskEntry.value.id) {
        warning.value = 'empty name'
        return;
    }


    if (props.type == 'event') {
        handleTaskRecordChange(props.context.gameName, 'event', props.context.date, {id: taskEntry.value.id, rewards: taskEntry.value.rewards.value}, 1);
    }

    resetTask();
    modal.value.close();
}

resetTask();

defineExpose({ showModal });
</script>

<template>
    <dialog ref="modal" class="modal-box">
        <div class="task-box-header flex-row">
            <p>{{ name }}</p>
        </div>
        <div class="task-input-parent flex-column">
            <div v-if="warning != ''">{{ warning }}</div>
            <div class="task-row flex-row align-items-center">
                <div>Task Name</div>
                <input id="name" type="text" v-model="taskEntry.id"></input>
            </div>
            <!--
            <div class="task-row flex-row align-items-center">
                <div>Task Type</div>
                <select id="type" v-model="taskEntry.type">
                    <option value="checkbox">Simple Task</option>
                    <option value="stepped">Multi-step Task</option>
                </select>
            </div>
            -->
            <div class="task-row flex-row align-items-center">
                <div>Rewards</div>
                <div class="flex-column" style="gap:0.5em">
                    <div class="currency-entry flex-row align-items-center" v-for="reward in taskEntry.rewards.value">
                        <select v-model="reward.currency" :key="reward.currency">
                            <option value="">-</option>
                            <option v-for="currency in context.config.currencies" :value="currency.id"> {{
                                $t(appendGameToString(currency.id)) }}
                            </option>
                        </select>
                        <input class="number-input" type="number" v-model="reward.amount">
                        <button class="square-button" @click="() => removeReward(reward)">x</button>
                    </div>
                    <button class="square-button" @click="addReward">+</button>
                </div>

            </div>
            <div>
                <button @click="submitData">OK</button>
                <button @click="closeModal">Cancel</button>
            </div>
        </div>
    </dialog>
</template>

<style lang="css" scoped>
.modal-box {
    min-width: 25em;
}

.task-box-header {
    font-weight: bold;
    justify-content: space-between;
    padding: 0.75em 1em;
    border-bottom: 1px solid var(--background-color-highlight);
}

.task-input-parent {
    padding: 1em;
    gap: 0.75em;
}

.task-row {
    gap: 0.5em;
    align-items: baseline;

    input {
        flex-grow: 1;
    }

    .number-input {
        width: 5em;
    }
}

.currency-entry {
    gap: 0.5em;
}
</style>