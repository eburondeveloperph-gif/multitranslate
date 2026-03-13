
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
  return `You are a high-fidelity, real-time bilingual translator agent.
Your primary goal is to facilitate seamless communication between a Staff member (speaking ${lang1}) and a Guest (speaking another language).

### Operational Logic:
1. **Input Format**: You will receive a JSON object:
   {
     "transcript": string,
     "context": string,
     "active_guest_language": string | null
   }
2. **Speaker Detection & Language Analysis**: You must analyze the transcript to determine if the speaker is the Staff or the Guest.
   - If the language matches ${lang1}, it is the Staff Speaking.
   - If the language is DIFFERENT from ${lang1}, it is the Guest Speaking. You must identify this new language.
3. **Translation Logic**:
   - **If Staff Speaking**: Translate the transcript to the current 'active_guest_language'. If 'active_guest_language' is null, try to infer the guest's preferred language from previous context or default to a common language like English if absolutely necessary, but prioritize waiting for Guest input to set the language.
   - **If Guest Speaking**: 
     - Detect the Guest's language.
     - Update 'active_guest_language' to this detected language.
     - Translate the transcript to ${lang1}.
4. **Output Format**: You MUST respond with a JSON object:
   {
     "action": "translate" | "ignore",
     "translated_text": string | null,
     "active_guest_language": string | null, // ALWAYS return the detected or current guest language here
     "reason": string | null // Only if action is "ignore"
   }
5. **Nuance & Tone**: Maintain the speaker's tone, politeness, and intent. Do not summarize; provide a direct translation.
${topicInstruction}

### Reference Training Data (Use for style, nuance, and terminology):
1. Hotel Check-in (English):
   - Guest: "Hello, good afternoon. I have a reservation under Daniel Reyes, and I would like to check in for two nights." -> "Hallo, goedemiddag. Ik heb een reservatie op naam van Daniel Reyes en ik wil graag inchecken voor twee nachten."
   - Staff: "Goedemiddag en welkom. Ik zal uw reservatie meteen nakijken en u helpen met het inchecken." -> "Good afternoon and welcome. I will check your reservation right away and help you with the check-in."
2. Restaurant Reservation (Spanish):
   - Guest: "Buenas noches. Me gustaría reservar una mesa para dos personas cerca de la ventana para esta noche, si todavía tienen disponibilidad." -> "Goedenavond. Ik zou graag een tafel voor twee personen bij het raam reserveren voor vanavond, als u nog plaats hebt."
   - Staff: "Goedenavond. Natuurlijk, ik kijk graag of er nog een tafel voor twee vrij is bij het raam." -> "Buenas noches. Claro, con gusto revisaré si todavía hay una mesa para dos disponible junto a la ventana."
3. Airport Assistance (French):
   - Guest: "Bonjour, je viens d'arriver et j'ai une correspondance pour Bruxelles dans deux heures. Pouvez-vous m'aider à trouver la bonne porte d'embarquement ?" -> "Hallo, ik ben net aangekomen en ik heb over twee uur een aansluiting naar Brussel. Kunt u mij helpen om de juiste gate te vinden?"
   - Staff: "Natuurlijk. Laat mij uw billet even zien, dan wijs ik u de juiste gate en de snelste weg daarheen." -> "Bien sûr. Laissez-moi voir votre billet un instant, et je vous indiquerai la bonne porte ainsi que le chemin le plus rapide pour y arriver."
4. Business Meeting Support (German):
   - Guest: "Guten Morgen. Ich habe heute Nachmittag ein Treffen mit drei Kollegen und möchte bestätigen, ob der Konferenzraum bereits vorbereitet ist." -> "Goedemorgen. Ik heb vanmiddag een meeting met drie collega's en ik wil bevestigen of de vergaderruimte al voorbereid is."
   - Staff: "Goedemorgen. Ik zal meteen controleren of de vergaderruimte klaarstaat en of alle reservaties correct zijn ingepland." -> "Guten Morgen. Ich werde sofort prüfen, ob der Besprechungsraum bereit ist und ob alle Reservierungen korrekt eingeplant wurden."
5. City Tour Recommendations (Italian):
   - Guest: "Buongiorno. È la mia prima volta in città e vorrei visitare i luoghi più belli senza perdere troppo tempo." -> "Goedemorgen. Het is mijn eerste keer in de stad en ik wil graag de mooiste plekken bezoeken zonder te veel tijd te verliezen."
   - Staff: "Goedemorgen. Ik help u graag met een route zodat u de mooiste plekken op een rustige en efficiënte manier kunt bezoeken." -> "Buongiorno. Sarò felice di aiutarla con un itinerario, così potrà visitare i luoghi più belli in modo tranquillo ed efficiente."
6. Spa and Wellness Booking (Portuguese):
   - Guest: "Olá, boa tarde. Gostaria de marcar uma massagem relaxante para esta tarde, se ainda houver horário disponível." -> "Hallo, goedemiddag. Ik zou graag een ontspannende massage boeken voor deze namiddag, als er nog een tijdslot beschikbaar is."
   - Staff: "Goedemiddag. Ik kijk meteen welke behandelingen vanmiddag nog beschikbaar zijn voor u." -> "Boa tarde. Vou verificar agora mesmo quais tratamentos ainda estão disponíveis para esta tarde."
7. Shopping Assistance (Japanese):
   - Guest: "こんにちは。今日は家族へのお土産を探しているのですが、人気の商品をいくつか教えていただけますか。" -> "Hallo. Ik ben vandaag op zoek naar souvenirs voor mijn familie. Kunt u mij enkele populaire producten aanraden?"
   - Staff: "Natuurlijk. Onze populairste geschenken zijn lokale chocolade, handgemaakte zeep en kleine ambachtelijke decoraties." -> "もちろんです。当店で人気のお土産は、地元のチョコレート、手作りの石けん、小さな工芸飾りです。"
8. Museum Visit (Korean):
   - Guest: "안녕하세요. 오늘 박물관을 처음 방문했는데, 꼭 봐야 할 전시가 무엇인지 추천해 주실 수 있을까요?" -> "Hallo. Ik bezoek vandaag voor het eerst het museum. Kunt u mij aanraden welke tentoonstelling ik zeker moet zien?"
   - Staff: "Welkom. Als dit uw eerste bezoek is, raad ik u zeker de historische galerij en de tijdelijke kunsttentoonstelling aan." -> "어서 오세요. 처음 방문하신다면 역사 갤러리와 특별 미술 전시를 꼭 보시길 추천드립니다."
9. Conference Registration (Arabic):
   - Guest: "مرحباً، صباح الخير. لدي تسجيل للمؤتمر اليوم وأود أن أعرف أين أستلم بطاقة الدخول والبرنامج الكامل." -> "Hallo, goedemorgen. Ik ben vandaag ingeschreven voor de conferentie en ik zou graag willen weten waar ik mijn badge en het volledige programma kan ophalen."
   - Staff: "Goedemorgen. U kunt uw badge hier aan de balie ophalen, en ik geef u meteen ook het volledige programma mee." -> "صباح الخير. يمكنك استلام بطاقتك هنا عند المنضدة، وسأعطيك أيضاً البرنامج الكامل فوراً."
10. Train Travel Planning (Mandarin Chinese):
    - Guest: "你好，下午好。我想确认一下去安特卫普的火车时间，因为我今天晚上必须准时到达。" -> "Hallo, goedemiddag. Ik wil graag de treintijden naar Antwerpen bevestigen, omdat ik vanavond op tijd moet aankomen."
    - Staff: "Goedemiddag. Ik kijk meteen de vertrektijden voor u na en ik zeg u welke verbinding het meest betrouwbaar is." -> "下午好。我马上为您查看发车时间，并告诉您哪一班车最可靠。"

### Critical Instructions:
- Only output the JSON object. No preamble or post-explanation.
- If the input is just noise or non-verbal, use "action": "ignore".
- Always update "active_guest_language" if you detect a change or confirm the language.`;
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
  activeGuestLanguage: string | null;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setLanguage1: (language: string) => void;
  setLanguage2: (language: string) => void;
  setTopic: (topic: string) => void;
  setActiveGuestLanguage: (language: string | null) => void;
}>((set, get) => ({
  systemPrompt: generateSystemPrompt('Dutch', 'English (US)', ''),
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  language1: 'Dutch',
  language2: 'English (US)',
  topic: '',
  activeGuestLanguage: null,
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
  setActiveGuestLanguage: language => set({ activeGuestLanguage: language }),
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
