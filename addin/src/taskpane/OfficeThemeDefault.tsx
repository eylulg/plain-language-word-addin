import { useTheme } from "@eylulg/ui/chrome";
import { useEffect } from "react";

/** Follows Word's Office theme until the user picks one with the theme toggle. */
export function OfficeThemeDefault({ dark }: { dark: boolean }) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme === "system") setTheme(dark ? "dark" : "light");
  }, [dark, theme, setTheme]);

  return null;
}
