export const supportedLanguages = ["en", "es", "pt", "fr", "ar", "zh", "ja", "ko", "hi"];

export const languageNames = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  ar: "العربية",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  hi: "हिन्दी"
};

const intlLocales = {
  en: "en-US",
  es: "es-ES",
  pt: "pt-PT",
  fr: "fr-FR",
  ar: "ar-u-nu-latn",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN"
};

const STORAGE_KEY = "click-lang";
let currentLanguage = "en";
let dictionary = {};

export function t(key, variables = {}) {
  const value = dictionary[key];
  if (value === undefined) return key;
  return String(value).replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
  );
}

export function getLanguage() {
  return currentLanguage;
}

export function getIntlLocale() {
  return intlLocales[currentLanguage] ?? intlLocales.en;
}

export async function initI18n() {
  const saved = readSavedLanguage();
  const browserLanguage = (navigator.language || "en").slice(0, 2).toLowerCase();
  const initial = saved ?? (supportedLanguages.includes(browserLanguage) ? browserLanguage : "en");
  await setLanguage(initial);
}

export async function setLanguage(language) {
  const next = supportedLanguages.includes(language) ? language : "en";
  let data = null;

  try {
    data = await fetchLocale(next);
  } catch (error) {
    if (next !== "en") {
      try {
        data = await fetchLocale("en");
      } catch {
        data = null;
      }
    }
  }

  if (!data) {
    if (Object.keys(dictionary).length === 0) {
      throw new Error("Unable to load any locale");
    }
    return;
  }

  currentLanguage = next;
  dictionary = data;

  document.documentElement.lang = next;
  document.documentElement.dir = next === "ar" ? "rtl" : "ltr";

  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage may be unavailable in private browsing contexts.
  }

  applyTranslations();
  syncLanguageSelects();

  document.dispatchEvent(
    new CustomEvent("languagechange", {
      detail: { language: next, dictionary }
    })
  );
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-list]").forEach((element) => {
    const lines = t(element.dataset.i18nList)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    element.replaceChildren(
      ...lines.map((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        return item;
      })
    );
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  });

  const titleElement = document.querySelector("title");
  if (titleElement) titleElement.textContent = t("meta_title");

  const descriptionElement = document.querySelector('meta[name="description"]');
  if (descriptionElement) descriptionElement.setAttribute("content", t("meta_description"));

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", t("meta_title"));

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", t("meta_description"));
}

export function syncLanguageSelects() {
  document.querySelectorAll(".lang-select").forEach((select) => {
    select.value = currentLanguage;
  });
}

async function fetchLocale(language) {
  const response = await fetch(`locales-v2/${language}.json`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Locale ${language} could not be loaded`);
  }
  return response.json();
}

function readSavedLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return supportedLanguages.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}
