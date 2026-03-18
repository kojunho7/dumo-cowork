import { createSignal, createContext, useContext, Accessor, createMemo } from "solid-js";
import { flatten, translator, resolveTemplate } from "@solid-primitives/i18n";
import { ko, en, Dictionary } from "./dict";

export type Locale = "ko" | "en";

export interface I18nContextType {
  locale: Accessor<Locale>;
  setLocale: (lang: Locale) => void;
  t: (key: string, variables?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType>();

export const dictionaries: Record<Locale, Dictionary> = {
  ko,
  en,
};

export function I18nProvider(props: { locale?: Locale; children: any }) {
  const [locale, setLocale] = createSignal<Locale>(props.locale || "ko");
  
  const dict = createMemo(() => flatten(dictionaries[locale()]));
  const t = translator(dict, resolveTemplate);
  
  // Wrap `t` to ignore missing key TS warnings cleanly when interpolating, if necessary.
  const tWrapper = (key: string, variables?: Record<string, any>) => {
    return (t as any)(key, variables) || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: tWrapper }}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
