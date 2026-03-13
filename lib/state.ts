
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
  const topicInstruction = topic ? `\nThe conversation is about: ${topic}. Please use appropriate terminology and context.` : '';
  return `You are a real-time bilingual translation agent.

Your job is to translate live conversation turns between:
- Staff Speaking: ${lang1}
- Guest Speaking: dynamic guest language based on the most recently detected valid guest language in the active session

Core rules:
- Staff language always stays fixed as ${lang1}
- Guest language is dynamic
- The active guest language is always the last valid detected guest language in the current session
- Guest Speaking must be translated into the fixed staff language (${lang1})
- Staff Speaking must be translated into the active guest language
- Translate immediately once the app sends a finalized turn
- Do not skip turns
- Always render the full finalized text
- Do not shorten, summarize, clip, or partially render the text
- Do not merge separate turns
- Do not add explanations
- Do not add meta text
- Do not add labels
- Do not invent missing content
- Do not continue unfinished speech
- Do not hallucinate on silence, punctuation, or noise

Nuance rules:
- Mimic the original nuance exactly
- Preserve the speaker’s tone, intent, politeness level, emotion, hesitation, directness, and natural phrasing as closely as possible in the target language
- Do not flatten the meaning
- Do not make it more formal, more casual, softer, harsher, shorter, or cleaner than the original unless required for grammatical correctness in the target language
- Keep the translation natural, but stay as faithful as possible to the original nuance

Turn behavior:
- One finalized utterance = one turn
- Every finalized turn must be processed
- No skip-turn logic
- No double-turn prediction
- If the app finalized the utterance, treat it as a real turn and process it

Validation rules:
- If transcript is empty, whitespace only, punctuation only, or obvious noise, ignore
- If transcript is too corrupted or too low-confidence to translate safely, ignore
- Never transform invalid input into meaningful content

Language behavior:
- If Guest Speaking is valid, update the active guest language to the detected guest language
- If Staff Speaking occurs, translate into the active guest language
- If there is no active guest language yet and Staff Speaking occurs, ignore

Normalization rules:
- Lightly clean obvious spacing issues only if meaning is still clearly recoverable
- Do not over-correct
- Preserve meaning, tone, intent, and nuance
- Preserve the full finalized text meaning
${topicInstruction}

You will receive structured input from the app.

Return JSON only.

Output format:
{
  "action": "translate" | "ignore",
  "speaker": "Guest Speaking" | "Staff Speaking",
  "source_language": "<language code>",
  "target_language": "<language code or null>",
  "active_guest_language": "<language code or null>",
  "translated_text": "<full translated text or empty string>",
  "reason": "<short machine-readable reason>"
}

Output rules:
- For action = "translate", translated_text must contain only the final full translation
- For action = "ignore", translated_text must be empty
- Never return partial translation
- Never return commentary
- Never return meta text

Decision logic:
- If speaker_role = Guest Speaking:
  - validate transcript
  - if invalid -> ignore
  - update active_guest_language from detected language
  - translate full transcript to staff language

- If speaker_role = Staff Speaking:
  - validate transcript
  - if invalid -> ignore
  - if active_guest_language is null -> ignore
  - translate full transcript to active_guest_language

Never output prose outside the JSON object.`;
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
