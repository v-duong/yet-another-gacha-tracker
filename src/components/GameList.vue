<script setup>
import { gameList, gameData } from '../utils/gameData';
import { sessionData } from '../utils/sessionData';
import { convertFileSrc } from '@tauri-apps/api/core';

</script>

<template>
    <ul class="game-list-parent">
        <li v-for="game in gameList.list" @click="{sessionData.currentGameView = game.name; }">
            <img :src=convertFileSrc(gameData[game.name].iconPath)></img>
            <p>{{ $t(`${game.name}.${ gameData[game.name].config.name_key != null ? gameData[game.name].config.name_key : 'game_title'}`) }}</p>
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
</style>