<script setup>
import { gameData, appendGameToString } from '../utils/gameData';
import { ref, watch } from "vue";
import { updatePremiumRecord, removePremiumRecord  } from '../utils/helpers.utils';
import { getCurrencyImage, imageExists } from '../utils/gameData';
import TaskEntryCheckbox from './TaskEntryCheckbox.vue';
import './style/TaskEntry.css'

const props = defineProps(['name', 'context']);

function OnDailyPassRecordChange(date, dailyPass, value) {
    console.log(value)
    let currentSession = props.context?.sessionData.cachedDays[date];
    if (value) {
        let record = currentSession.addPremiumRecord(dailyPass.id, "currency_pass", dailyPass.currencies, 0);
        updatePremiumRecord(props.context.gameName, date, record);
    } else {
        let record = currentSession.deletePremiumRecord(0, dailyPass.id, "currency_pass");
        if (record.length > 0){
            removePremiumRecord(props.context.gameName, date, record[0]);
        }
    }
}

</script>

<template>
    <div class="task-box custom-record-box">
        <div class="task-box-header flex-row">
            <p>{{ $t(name) }}</p>
        </div>
        <ul>
            <li class="task-list-item" v-for="dailyPass in context.config.daily_currency_passes">
                <div class="task-entry-container flex-column">
                    <div class="task-entry flex-row align-items-center">
                        <input class="task-checkbox" type="checkbox"
                            :checked="context.sessionData.cachedDays[context.date]?.getPremiumRecord(0, dailyPass.id, dailyPass.id)"
                            :id="dailyPass.id"
                            @change="(e) => OnDailyPassRecordChange(context.date, dailyPass, e.target.checked ? 1 : 0)" />
                        <p>{{ $t(appendGameToString(dailyPass.id)) }}</p>
                        <div class="rewards-list">
                            <div class="reward-list-item" v-for="reward in dailyPass.currencies">
                                <div class="currency-display">
                                    {{ reward.amount }}
                                    <img v-if="imageExists(context.gameName, reward.currency)" class="currency-image"
                                        :src="getCurrencyImage(context.gameName, reward.currency)"
                                        :alt="$t(appendGameToString(reward.currency))" />
                                    <div v-else> {{ $t(appendGameToString(reward.currency)) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </li>


        </ul>
    </div>
</template>

<style lang="css" scoped>
.task-box-header {
    font-weight: bold;
    justify-content: space-between;
    padding: 0.75em 1em;
    border-bottom: 1px solid var(--background-color-highlight);
}

.task-checkbox {
    background-color: black;
    --box-size: 1.25em;
    width: var(--box-size);
    height: var(--box-size);
}
</style>