<script setup>
import { gameData, appendGameToString } from '../utils/gameData';
import { ref } from "vue";
import { handleCurrencyHistoryChange } from '../utils/helpers.utils';
import { getCurrencyImage, imageExists } from '../utils/gameData';

const props = defineProps(['data', 'context']);

const isExpanded = ref(false);

</script>

<template>
    <div class="session-summary-bar-container flex-column" :class="{ expanded: isExpanded }">
        <button @click="isExpanded = !isExpanded">EXPAND</button>
        <div class="session-summary-information flex-row">
            <div>SESSION TIME</div>
            <div>VARIOUS STATS</div>
            <div class="summary-currency-list flex-column">
                <template v-for="currency in context.config.currencies">
                    <div v-if="currency.tracked" v-show="currency.primary || isExpanded"
                        class="summary-currency-list-entry flex-row">
                        <div class="summary-currency-entry-name">
                            <img v-if="imageExists(context.gameName, currency.id)" class="currency-image" :src="getCurrencyImage(context.gameName, currency.id)"
                                :alt="$t(appendGameToString(currency.id))" />
                            <div v-else>{{ $t(appendGameToString(currency.id)) }}</div>
                        </div>
                        <div class="summary-currency-entry-name"> {{
                            context.sessionData.cachedDays[context.date]?.getCurrencyInitialValues(currency.id) }} →
                        </div>
                        <input type="number" class="summary-currency-entry-input"
                            :class="{ overridden: context.sessionData.cachedDays[context.date]?.hasOverride() }"
                            :id="currency.id"
                            :value="context.sessionData.cachedDays[context.date]?.getCurrencyValue(currency.id)"
                            @change="(e) => handleCurrencyHistoryChange(context.gameName, context.date, currency.id, Number.parseInt(e.target.value))" />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style lang="css" scoped>
.session-summary-bar-container {
    position: absolute;
    bottom: 0;
    height: 4em;
    width: 100%;
    background-color: var(--accent-color);
    color: var(--accent-font-color);
    display: inline-flex;
    flex-direction: column;
    transition: height 0.2s;



    &.expanded {

        height: 15em;
    }
}

.session-summary-information {
    justify-content: space-between;
    align-items: center;
    align-content: center;
    padding: 0.2em 2em;
    flex-grow: 1;
    overflow-y: auto;
}

.summary-currency-list {
    gap: 0.4em;
    align-items: flex-end;
}

.summary-currency-list-entry {
    gap: 1em;
    align-items: center;

    input {
        background-color: rgba(0, 0, 0, 0.2);
        padding: 0.15em;
        border: none;
        border-radius: 0.1em;
        width: 5em;

        &:focus {
            background-color: rgba(0, 0, 0, 0.5);
        }
    }
}
</style>