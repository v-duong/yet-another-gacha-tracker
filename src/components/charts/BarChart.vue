<script setup>
import { Bar } from 'vue-chartjs';
import { ref, watch } from 'vue';
import { getCurrentDateNumberForGame, getDateNumberWithOffset } from '../../utils/date.utils';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { _addGrace } from 'chart.js/helpers';

ChartJS.defaults.color = "#ddd";
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler)
const props = defineProps(['data', 'context', 'currency']);

let data = ref({});

let chartData = {};

let config = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            grid: {
                color: '#555',
            },
            stacked: true
        },
        y: {
            grace: "15%",
            grid: {
                color: '#555',
            },
            stacked: true
        }
    }
}

watch(() => props.context.sessionData.cachedDays, async () => {
    let currentDate = getCurrentDateNumberForGame(props.context.sessionData.lastSelectedRegion.reset_time);
    let res = await props.context.sessionData.getWeeklyCurrencyGainsForRange(props.currency, currentDate, 5);

    data.value = res[1];

    chartData = {
        labels: res[0],
        datasets: [
            {
                label: 'dailies',
                data: res[1].map(x => x.daily),
                backgroundColor: 'rgba(64, 194, 255, 0.8)',
                borderColor: props.context.config?.accent_color
            },
            {
                label: 'weeklies',
                data: res[1].map(x => x.weekly),
                backgroundColor: 'rgba(75, 255, 162, 0.8)',
                borderColor: props.context.config?.accent_color
            },
            {
                label: 'periodic',
                data: res[1].map(x => x.periodic),
                backgroundColor: 'rgba(255, 145, 255, 0.8)',
                borderColor: props.context.config?.accent_color
            },
            {
                label: 'event',
                data: res[1].map(x => x.event),
                backgroundColor: 'rgba(255, 124, 160, 0.8)',
                borderColor: props.context.config?.accent_color
            },
            {
                label: 'premium',
                data: res[1].map(x => x.premium),
                backgroundColor: 'rgba(255, 184, 100, 0.8)',
                borderColor: props.context.config?.accent_color
            },
        ]

    }
}, { immediate: "yes", deep: 5 });

</script>

<template>
    <Bar v-if="Object.keys(data).length > 0" :data="chartData" :options="config"></Bar>
</template>