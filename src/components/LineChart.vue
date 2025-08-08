<script setup>
import { Line } from 'vue-chartjs';
import { ref, watch } from 'vue';
import { getCurrentDateNumberForGame, getDateNumberWithOffset } from '../utils/date.utils';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { _addGrace, color } from 'chart.js/helpers';

ChartJS.defaults.color = "#ddd";
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler)
const props = defineProps(['data', 'context', 'currency']);

let data = ref([]);

console.log(data);

let chartData = {};

let config = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            grid: {
                color: '#555',
            },
            ticks: {
                maxTicksLimit:17
            }
        },
        y: {
            grace: "50%",
            grid: {
                color: '#555',
            },
            ticks: {
            }
        }
    }
}

function getGradient(ctx, chartArea) {
    let width, height, gradient;
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
        // Create the gradient because this is either the first render
        // or the size of the chart has changed
        width = chartWidth;
        height = chartHeight;
        gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, props.context.config?.accent_color);
    }

    return gradient;
}

watch(() => props.context.sessionData.cachedDays, async () => {
    let currentDate = getCurrentDateNumberForGame(props.context.sessionData.lastSelectedRegion.reset_time);
    let startDate = getDateNumberWithOffset(currentDate, -30);
    let res = await props.context.sessionData.getCurrencyDataForRange(props.currency, startDate, currentDate)
    data.value = res[1];

    chartData = {
        labels: res[0],
        datasets: [{
            label: 'Polychromes', data: data.value,
            fill: {
                target: 'origin', above: function (context) {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;

                    if (!chartArea) {
                        // This case happens on initial chart load
                        return;
                    }
                    return getGradient(ctx, chartArea);
                }
            },
            borderColor: props.context.config?.accent_color, tension: 0.15
        }]

    }
}, { deep: 5 });

</script>

<template>
    <Line v-if="data.length > 0" :data="chartData" :options="config"></Line>
</template>