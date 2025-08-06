import { createApp } from "vue";
import App from "./App.vue";
import { initializeData } from "./utils/data.utils";
import { appConfigDir } from "@tauri-apps/api/path";
// @ts-ignore
import { setupI18n, loadLocaleMessages } from "./i18n.js"
import { exists, mkdir } from "@tauri-apps/plugin-fs";

let dbDir = await appConfigDir();
if (!await exists(dbDir)) mkdir(dbDir);

const i18nOptions = {
    locale: "en",
    fallbackLocale: "en",
    globalInjection: true,
    legacy: false
}

const i18n = setupI18n(i18nOptions);

initializeData().then(async () => {
    const app = createApp(App);
    app.use(i18n);
    await loadLocaleMessages(i18n, i18n.global.locale.value, i18n.global.fallbackLocale.value);
    app.mount("#app");
}).catch((e) => {
    console.log(e);
});

