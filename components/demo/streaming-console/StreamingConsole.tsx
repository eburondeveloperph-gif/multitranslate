
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef } from 'react';
import WelcomeScreen from '../welcome-screen/WelcomeScreen';
import { GoogleGenAI, Modality, LiveServerContent } from '@google/genai';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import {
  useSettings,
  useLogStore,
  ConversationTurn,
} from '../../../lib/state';
import { useHistoryStore } from '../../../lib/history';
import { useAuth, updateUserConversations } from '../../../lib/auth';

export default function StreamingConsole() {
  const { client, setConfig } = useLiveAPIContext();
  const { 
    systemPrompt, 
    voice, 
    language1, 
    language2, 
    currentSpeaker, 
    activeGuestLanguage, 
    setActiveGuestLanguage 
  } = useSettings();
  const { addHistoryItem } = useHistoryStore();
  const { user } = useAuth();
  const { isTtsMuted } = useLiveAPIContext();

  const turns = useLogStore(state => state.turns);
  const scrollRef = useRef<HTMLDivElement>(null);

  const playTTS = async (text: string) => {
    if (isTtsMuted) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice === 'Puck' ? 'Puck' : 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const { audioContext: getAudioContext } = await import('../../../lib/utils');
        const audioCtx = await getAudioContext({ id: 'audio-out' });
        const { AudioStreamer } = await import('../../../lib/audio-streamer');
        const streamer = new AudioStreamer(audioCtx);
        // Convert base64 to Uint8Array properly
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        streamer.addPCM16(bytes);
        await streamer.resume();
      }
    } catch (e) {
      console.error('TTS Error:', e);
    }
  };

  // Set the configuration for the Live API
  useEffect(() => {
    // Using `any` for config to accommodate `speechConfig`, which is not in the
    // current TS definitions but is used in the working reference example.
    const config: any = {
      responseModalities: [Modality.TEXT], // Changed to TEXT to receive JSON
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
    };

    setConfig(config);
  }, [setConfig, systemPrompt, voice]);

  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
          isFinal,
        });
      } else {
        addTurn({ role: 'user', text, isFinal });
      }

      // If it's final, send the structured input to the model
      if (isFinal && text.trim()) {
        const structuredInput = {
          speaker_role: currentSpeaker,
          transcript: text.trim(),
          detected_language: currentSpeaker === 'Staff Speaking' ? language1 : 'unknown',
          active_guest_language: activeGuestLanguage
        };
        client.send([{ text: JSON.stringify(structuredInput) }]);
      }
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      // We don't use the model's transcription directly anymore as we expect JSON
      console.log('Model transcription:', text);
    };

    // FIX: The 'content' event provides a single LiveServerContent object.
    // The function signature is updated to accept one argument, and groundingMetadata is extracted from it.
    const handleContent = (serverContent: LiveServerContent) => {
      const text =
        serverContent.modelTurn?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join('') ?? '';
      
      if (!text) return;

      try {
        const json = JSON.parse(text);
        if (json.action === 'translate' && json.translated_text) {
          if (json.active_guest_language) {
            setActiveGuestLanguage(json.active_guest_language);
          }

          playTTS(json.translated_text);

          const turns = useLogStore.getState().turns;
          const last = turns[turns.length - 1];

          if (last?.role === 'agent' && !last.isFinal) {
            updateLastTurn({
              text: last.text + json.translated_text,
            });
          } else {
            addTurn({ 
              role: 'agent', 
              text: json.translated_text, 
              isFinal: false 
            });
          }
        } else if (json.action === 'ignore') {
          console.log('Model ignored the turn:', json.reason);
        }
      } catch (e) {
        console.error('Failed to parse model response as JSON:', text, e);
        // Fallback: just show the raw text if it's not JSON
        const turns = useLogStore.getState().turns;
        const last = turns[turns.length - 1];
        if (last?.role === 'agent' && !last.isFinal) {
          updateLastTurn({ text: last.text + text });
        } else {
          addTurn({ role: 'agent', text, isFinal: false });
        }
      }
    };

    const handleTurnComplete = () => {
      const { turns, updateLastTurn } = useLogStore.getState();
      const last = turns[turns.length - 1];

      if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
        const updatedTurns = useLogStore.getState().turns;

        if (user) {
          updateUserConversations(user.id, updatedTurns);
        }

        const finalAgentTurn = updatedTurns[updatedTurns.length - 1];

        if (finalAgentTurn?.role === 'agent' && finalAgentTurn?.text) {
          const agentTurnIndex = updatedTurns.length - 1;
          let correspondingUserTurn = null;
          for (let i = agentTurnIndex - 1; i >= 0; i--) {
            if (updatedTurns[i].role === 'user') {
              correspondingUserTurn = updatedTurns[i];
              break;
            }
          }

          if (correspondingUserTurn?.text) {
            const translatedText = finalAgentTurn.text.trim();
            addHistoryItem({
              sourceText: correspondingUserTurn.text.trim(),
              translatedText: translatedText,
              lang1: language1,
              lang2: activeGuestLanguage || language2
            });
          }
        }
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete); // Use turncomplete for text responses

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
    };
  }, [client, addHistoryItem, user, language1, language2, currentSpeaker, activeGuestLanguage, setActiveGuestLanguage]);

  return (
    <div className="transcription-container">
      <WelcomeScreen />
    </div>
  );
}
