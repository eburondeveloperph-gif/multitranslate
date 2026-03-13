/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface HistoryItem {
  id: number;
  sourceText: string;
  translatedText: string;
  lang1: string;
  lang2: string;
  timestamp: Date;
}

interface HistoryState {
  history: HistoryItem[];
  addHistoryItem: (item: {
    sourceText: string,
    translatedText: string,
    lang1: string,
    lang2: string,
  }) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      addHistoryItem: (item) =>
        set((state) => ({
          history: [
            { ...item, id: Date.now(), timestamp: new Date() },
            ...state.history, // Add to the top of the list
          ],
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'translation-history-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);