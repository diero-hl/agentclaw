import { createContext, useContext, useEffect } from "react";

interface ThemeContextType {
  theme: "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
