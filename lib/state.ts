
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionDeclaration,
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

const generateSystemPrompt = (lang1: string, lang2: string, topic: string) => {
  const topicInstruction = topic ? `The conversation is about: ${topic}. Please use appropriate terminology and context.` : '';
  return `You are an expert language translator. Your only task is to translate text from ${lang1} to ${lang2}, or from ${lang2} to ${lang1}.

**CRITICAL INSTRUCTIONS:**
1. DETECT the language of the input text (${lang1} or ${lang2}).
2. TRANSLATE the input text into the other language.
3. OUTPUT **ONLY** THE TRANSLATED TEXT.
4. OUTPUT **ONLY** THE TRANSLATED TEXT.
5. OUTPUT **ONLY** THE TRANSLATED TEXT.

**DO NOT:**
- DO NOT add any prefixes, labels, or explanations (e.g., "In Spanish: ...").
- DO NOT have a conversation.
- DO NOT add any commentary or remarks.
- DO NOT ask questions.

Your entire response must be the translated phrase. For example, if the input is "Hello" and the target language is Spanish, your output must be "Hola", not "The translation is Hola".
${topicInstruction}
`;
};


/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  language1: string;
  language2: string;
  topic: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setLanguage1: (language: string) => void;
  setLanguage2: (language: string) => void;
  setTopic: (topic: string) => void;
}>((set, get) => ({
  systemPrompt: generateSystemPrompt('Dutch', 'English (US)', ''),
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  language1: 'Dutch',
  language2: 'English (US)',
  topic: '',
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setLanguage1: language => set({
    language1: language,
    systemPrompt: generateSystemPrompt(language, get().language2, get().topic)
  }),
  setLanguage2: language => set({
    language2: language,
    systemPrompt: generateSystemPrompt(get().language1, language, get().topic)
  }),
  setTopic: topic => set({
    topic: topic,
    systemPrompt: generateSystemPrompt(get().language1, get().language2, topic)
  }),
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description: string;
  parameters: any;
  isEnabled: boolean;
  scheduling: FunctionResponseScheduling;
}

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
