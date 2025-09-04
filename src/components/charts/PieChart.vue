<script setup>
import { Pie } from 'vue-chartjs';
import { ref, watch, watchEffect } from 'vue';
import { getCurrentDateNumberForGame } from '../../utils/date.utils';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, ArcElement, PieController } from 'chart.js'
import { _addGrace } from 'chart.js/helpers';

ChartJS.defaults.color = "#ddd";
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, PieController, ArcElement)
const props = defineProps(['data', 'context', 'currency']);

let data = ref({});

let chartData = {};

let config = {
    responsive: true,
    maintainAspectRatio: false,
    type: 'pie'
}

watchEffect(async () => {
    let currentDate = getCurrentDateNumberForGame(props.context.sessionData.lastSelectedRegion.reset_time);
    let res = await props.context.sessionData.getMonthlyCurrencyGainsForRange(props.currency, currentDate, 1);

    data.value = res;

    console.log(res);

    chartData = {
        labels: ['dailies', 'weeklies', 'periodic', 'event', 'premium'],
        datasets: [
            {
                data: [res.daily, res.weekly, res.periodic, res.event, res.premium],
                backgroundColor: [
                    'rgba(64, 194, 255, 0.8)',
                    'rgba(75, 255, 162, 0.8)',
                    'rgba(255, 145, 255, 0.8)',
                    'rgba(255, 124, 160, 0.8)',
                    'rgba(255, 184, 100, 0.8)',

                ],
                borderColor: props.context.config?.accent_color
            }
        ]

    }
});

</script>

<template>
    <Pie v-if="Object.keys(data).length > 0" :data="chartData" :options="config" />
</template>