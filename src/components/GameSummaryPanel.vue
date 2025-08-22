<script setup>
import { gameData, appendGameToString } from '../utils/gameData';
import { ref } from "vue";
import { handleCurrencyHistoryChange } from '../utils/helpers.utils';
import { getCurrencyImage, imageExists } from '../utils/gameData';

const props = defineProps(['context']);

</script>

<template>
    <div class="summary-box flex-column">
        <div>
            <div class="summary-header">Accumulated Pulls</div>
            <div v-for="banner in context.sessionData?.getTotalGachaPulls()" class="summary-text">
                <div>{{ banner.name }}: <b>{{ banner.amount.toFixed(2) }}</b> pulls</div>
            </div>
        </div>
        <div>
            <div class="summary-header">Total Wins in Worst Case</div>
            <div v-for="banner in context.sessionData?.getTotalGachaWins({ fullPity: true })" class="summary-text">
                <div>{{ banner.name }}: <b>{{ banner.amount.toFixed(2) }}</b> wins</div>
            </div>
        </div>
    </div>
</template>

<style lang="css" scoped>
.summary-box {
    background-color: var(--background-color-secondary);
    padding: 1em;
    gap: 0.75em;
}

.summary-header {
    font-size: 0.9em;
    font-weight: bold;
}

div.summary-text {
    font-size: 0.85em;
}
</style>