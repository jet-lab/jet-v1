import type { Locale } from '../models/JetTypes';
import * as Jet_UI_EN from './languages/Jet_UI_EN.json';
import * as Jet_Definitions_EN from './languages/Jet_Definitions_EN.json';
import * as Jet_UI_ZH from './languages/Jet_UI_ZH.json';
import * as Jet_Definitions_ZH from './languages/Jet_Definitions_ZH.json';
import * as Jet_UI_KR from './languages/Jet_UI_KR.json';
import * as Jet_Definitions_KR from './languages/Jet_Definitions_KR.json';
import * as Jet_UI_RU from './languages/Jet_UI_RU.json';
import * as Jet_Definitions_RU from './languages/Jet_Definitions_RU.json';
import * as Jet_UI_TR from './languages/Jet_UI_TR.json';
import * as Jet_Definitions_TR from './languages/Jet_Definitions_TR.json';
import * as Jet_UI_DE from './languages/Jet_UI_DE.json';
import * as Jet_Definitions_DE from './languages/Jet_Definitions_DE.json';
import { USER } from '../store';

// Check to see if user's locale is special case of Crimea
const isCrimea = (locale: Locale): boolean => {
  const postalCode: string = locale?.postal.toString().substring(0, 2);
  if (postalCode === "95" || postalCode === "96" || postalCode === "97" || postalCode === "98") {
    return true;
  } else {
    return false
  }
}

// Get user's preferred language from browser
// Use fallback if not
export const getLocale = async (): Promise<void> => {
  let locale: Locale | null = null;
  let language: string = window.navigator.languages[1];
  let geobanned: boolean = false;
  let preferredLanguage = localStorage.getItem('jetPreferredLanguage');
  if (!Object.keys(dictionary).includes(language)) {
    language = 'en';
  }
  if (preferredLanguage) {
    language = preferredLanguage;
  }

  try {
    const resp = await fetch('https://ipinfo.io/json?token=46ceefa5641a93', {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    locale = await resp.json();
    geoBannedCountries.forEach(c => {
      if (c.code === locale?.country) {
        // If country is Ukraine, checks if first two digits
        // of the postal code further match Crimean postal codes.
        if (locale?.country !== "UA" || isCrimea(locale)) {
          geobanned = true;
        }
      }
    });
  } catch (err) {
    console.log(err);
  }

  USER.update(user => {
    user.locale = locale;
    user.geobanned = geobanned;
    return user;
  });
};

// Banned countries
export const geoBannedCountries = [
  {
    country: "Afghanistan",
    code: "AF"
  }, 
  {
    country: "Crimea (Ukraine)",
    code: "UA"
  }, 
  {
    country: "Cuba",
    code: "CU"
  }, 
  {
    country: "Democratic Republic of Congo",
    code: "CD"
  }, 
  {
    country: "Iran",
    code: "IR"
  }, 
  {
    country: "Iraq",
    code: "IQ"
  }, 
  {
    country: "Libya",
    code: "LY"
  }, 
  {
    country: "North Korea",
    code: "KP"
  }, 
  {
    country: "Sudan",
    code: "SD"
  }, 
  {
    country: "Syria",
    code: "SY"
  },
  {
    country: "Tajikistan",
    code: "TJ"
  },
  {
    country: "Venezuela",
    code: "VE"
  }
];

// Dictionary of UI text throughout Jet
export const dictionary: any = {
  // English
  en: Jet_UI_EN,
  // Mandarin
  zh: Jet_UI_ZH,
  //Russian
  ru: Jet_UI_RU,
  //Turkish
  tr: Jet_UI_TR,
  //Korean
  kr: Jet_UI_KR,
  //German
  de: Jet_UI_DE
};

// Definitions of various terminology
export const definitions: any = {
  en: Jet_Definitions_EN,
  zh: Jet_Definitions_ZH,
  ru: Jet_Definitions_RU,
  tr: Jet_Definitions_TR,
  kr: Jet_Definitions_KR,
  de: Jet_Definitions_DE,
}
