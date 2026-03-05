'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'linkery-primary-color';
export const DEFAULT_PRIMARY = 'indigo';

export const MANTINE_COLORS = [
  'blue', 'cyan', 'teal', 'green', 'lime', 'yellow', 'orange',
  'red', 'pink', 'grape', 'violet', 'indigo', 'gray',
] as const;

export type MantineColorName = (typeof MANTINE_COLORS)[number];

interface ThemeContextValue {
  primaryColor: MantineColorName;
  setPrimaryColor: (color: MantineColorName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  primaryColor: DEFAULT_PRIMARY,
  setPrimaryColor: () => {},
});

export function useThemeColor() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState<MantineColorName>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRIMARY;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (MANTINE_COLORS as readonly string[]).includes(stored)) {
      return stored as MantineColorName;
    }
    return DEFAULT_PRIMARY;
  });

  const setPrimaryColor = useCallback((color: MantineColorName) => {
    setPrimaryColorState(color);
    localStorage.setItem(STORAGE_KEY, color);
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        primaryColor,
        fontFamily: 'var(--font-geist-sans)',
      }),
    [primaryColor],
  );

  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor }}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
