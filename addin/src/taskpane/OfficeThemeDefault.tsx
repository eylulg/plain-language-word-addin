import { useTheme } from "@eylulg/ui/chrome";
import { useEffect, useState } from "react";

interface OfficeThemeDefaultProps {
  /** Whether Word's current theme is dark, or undefined when Word does not report one. */
  readDark: () => boolean | undefined;
}

/**
 * Follows Word's Office theme while the user has no stored choice. Nothing is written to
 * storage, so a later Office theme change still applies until the toggle is used. Render it
 * after the toggle so its class change is the last one in a commit.
 */
export function OfficeThemeDefault({ readDark }: OfficeThemeDefaultProps) {
  const { theme } = useTheme();
  const [dark, setDark] = useState(readDark);

  useEffect(() => {
    const refresh = () => setDark(readDark());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [readDark]);

  useEffect(() => {
    if (theme !== "system" || dark === undefined) return;
    document.documentElement.classList.toggle("dark-mode", dark);
  }, [theme, dark]);

  return null;
}
