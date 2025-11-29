import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export const useUiStore = create<UiState>()(
    persist(
        (set) => ({
            theme: 'dark',
            toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
        }),
        {
            name: 'ui-storage',
        }
    )
);
