import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
    theme: 'dark' | 'light';
    fontFamily: string;
    fontSize: number;
    toggleTheme: () => void;
    setFontFamily: (font: string) => void;
    setFontSize: (size: number) => void;
}

export const useUiStore = create<UiState>()(
    persist(
        (set) => ({
            theme: 'dark',
            fontFamily: 'Inter',
            fontSize: 16,
            toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
            setFontFamily: (font) => set({ fontFamily: font }),
            setFontSize: (size) => set({ fontSize: size }),
        }),
        {
            name: 'ui-storage',
        }
    )
);
