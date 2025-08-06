import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { gameData, gameList } from './utils/gameData';
import { resolveResource } from '@tauri-apps/api/path';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';

export const SUPPORT_LOCALES = ['en']

export function setupI18n(options = { locale: 'en' }) {
  const i18n = createI18n(options);
  setI18nLanguage(i18n, options.locale);
  return i18n
}

export function setI18nLanguage(i18n, locale) {
  if (i18n.mode === 'legacy') {
    i18n.global.locale = locale
  } else {
    i18n.global.locale.value = locale
  }
  /**
   * NOTE:
   * If you need to specify the language setting for headers, such as the `fetch` API, set it here.
   * The following is an example for axios.
   *
   * axios.defaults.headers.common['Accept-Language'] = locale
   */
  document.querySelector('html').setAttribute('lang', locale)
}

export async function loadLocaleMessages(i18n, locale, fallback) {
  let concatMessages = {}, jsonString = "";
  const resourceDirectory = await resolveResource('resources/i18n');
  const generalLocalePath = `${resourceDirectory}/${locale}.json`;
  const fallbackLocalePath = `${resourceDirectory}/${fallback}.json`;

  if (await exists(generalLocalePath)) {
    jsonString = await readTextFile(generalLocalePath);
  } else if (await exists(fallbackLocalePath)) {
    jsonString = await readTextFile(fallbackLocalePath);
  } else {
    jsonString = "{}";
  }

  concatMessages = JSON.parse(jsonString);


  for await (const entry of gameList.list) {
    //console.log(`${gameData[entry.name].localePath}/${locale}.json`)
    jsonString = "";

    const gameLocalePath = `${gameData[entry.name].localePath}/${locale}.json`;
    const fallbackGameLocalePath = `${gameData[entry.name].localePath}/${fallback}.json`;
    let localeData;

    if (await exists(gameLocalePath)) {
      jsonString = await readTextFile(gameLocalePath);
    } else if (await exists(fallbackGameLocalePath)) {
      jsonString = await readTextFile(fallbackGameLocalePath);
    } else {
      jsonString = "{}";
    }


    try {
      localeData = JSON.parse(jsonString)
    } catch (e) {
      console.log(e);
      continue;
    }

    concatMessages[entry.name] = localeData;
  }

  //console.log(concatMessages);
  // set locale and locale message
  i18n.global.setLocaleMessage(locale, concatMessages);

  return nextTick()
}