/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from 'classnames';

// FIX: Import React to use React.CSSProperties
import React, { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useLogStore } from '../../../lib/state';
import { useAuth, clearUserConversations } from '../../../lib/auth';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import MicVisualizer from '../../MicVisualizer';

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const { session, user } = useAuth();

  const {
    client,
    connected,
    connect,
    disconnect,
    isTtsMuted,
    toggleTtsMute,
  } = useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    const onVolume = (vol: number) => {
      setMicVolume(vol);
    };

    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.on('volume', onVolume);
      audioRecorder.start();
    } else {
      setMicVolume(0);
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
      audioRecorder.off('volume', onVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  const handleMicClick = () => {
    if (!session) return;
    if (connected) {
      setMuted(!muted);
    } else {
      connect();
    }
  };

  const connectButtonAction = () => {
    if (!session) return;
    if (connected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleReset = () => {
    useLogStore.getState().clearTurns();
    if (user) {
      clearUserConversations(user.id);
    }
  };

  const micButtonTitle = session
    ? connected
      ? muted
        ? 'Unmute microphone'
        : 'Mute microphone'
      : 'Connect and start microphone'
    : 'Please sign in to use the translator';

  const connectButtonTitle = session
    ? connected
      ? 'Stop streaming'
      : 'Start streaming'
    : 'Please sign in to use the translator';

  const isMicActive = connected && !muted;

  return (
    <section className="control-tray">
      <MicVisualizer volume={micVolume} isActive={isMicActive} />
      <div className="control-tray-buttons">
        <nav className={cn('actions-nav')}>
          <button
            className={cn('action-button mic-button', { active: isMicActive })}
            onClick={handleMicClick}
            title={micButtonTitle}
            disabled={!session}
            style={{ '--mic-volume': micVolume } as React.CSSProperties}
          >
            {!muted ? (
              <span className="material-symbols-outlined filled">mic</span>
            ) : (
              <span className="material-symbols-outlined filled">mic_off</span>
            )}
          </button>
          <button
            className={cn('action-button')}
            onClick={toggleTtsMute}
            aria-label={isTtsMuted ? 'Unmute audio output' : 'Mute audio output'}
            title={isTtsMuted ? 'Unmute audio output' : 'Mute audio output'}
          >
            <span className="icon">{isTtsMuted ? 'volume_off' : 'volume_up'}</span>
          </button>
          <button
            className={cn('action-button')}
            onClick={handleReset}
            aria-label="Reset Chat"
            title="Reset session logs"
          >
            <span className="icon">refresh</span>
          </button>
          {children}
        </nav>

        <div className={cn('connection-container', { connected })}>
          <div className="connection-button-container">
            <button
              ref={connectButtonRef}
              className={cn('action-button connect-toggle', { connected })}
              onClick={connectButtonAction}
              title={connectButtonTitle}
              disabled={!session}
            >
              <span className="material-symbols-outlined filled">
                {connected ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>
          <span className="text-indicator">Streaming</span>
        </div>
      </div>
    </section>
  );
}

export default memo(ControlTray);