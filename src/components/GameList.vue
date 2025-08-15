<script setup>
import { gameList, gameData } from '../utils/gameData';
import { sessionData } from '../utils/sessionData';
import { convertFileSrc } from '@tauri-apps/api/core';
import Countdown from './Countdown.vue';
import { getNextDailyResetTime } from '../utils/date.utils';

</script>

<template>
    <ul class="game-list-parent">
        <li v-for="game in gameList.list" @click="{ sessionData.currentGameView = game.name; }">
            <img :src="convertFileSrc(gameData[game.name].imagesPath + '/icon.png')" alt="icon"></img>
            <div class="game-info-container">
                <p>{{ $t(`${game.name}.${gameData[game.name].config.name_key != null ?
                    gameData[game.name].config.name_key
                    : 'game_title'}`) }}</p>
                <Countdown class="list-timer" :date="getNextDailyResetTime(game.name)"></Countdown>
            </div>
        </li>
    </ul>
</template>

<style lang="css" scoped>
.game-list-parent {
    background-color: var(--background-color-secondary);
    width: 20em;

    li {
        display: flex;
        flex-direction: row;
        gap: 0.5em;
        align-items: center;
        padding: 0.5em 1.2em;


        img {
            height: 3em;
            width: 3em;
            border-radius: 10%;
        }

        p {
            font-style: bold;
        }
    }

    li:hover {
        background-color: var(--background-color-highlight);
    }
}

.list-timer {
    font-size: 0.75em;
}
</style>