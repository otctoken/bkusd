import { createContext, useContext, useState, type ReactNode } from "react";
type Locale = "en" | "zh";
const Context = createContext<{
  locale: Locale;
  toggle: () => void;
  t: (en: string, zh: string) => string;
}>({ locale: "en", toggle: () => {}, t: (en) => en });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, set] = useState<Locale>(() => {
    const saved = localStorage.getItem("bkusd-language");
    return saved === "en" || saved === "zh"
      ? saved
      : navigator.language.toLowerCase().startsWith("zh")
        ? "zh"
        : "en";
  });
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  return (
    <Context.Provider
      value={{
        locale,
        toggle: () =>
          set((l) => {
            const next = l === "en" ? "zh" : "en";
            localStorage.setItem("bkusd-language", next);
            return next;
          }),
        t: (en, zh) => (locale === "zh" ? zh : en),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
