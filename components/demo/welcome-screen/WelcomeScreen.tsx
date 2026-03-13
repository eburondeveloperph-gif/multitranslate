
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import './WelcomeScreen.css';
import { useLogStore } from '../../../lib/state';

const WelcomeScreen: React.FC = () => {
  const turns = useLogStore(state => state.turns);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever turns update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content empty">
          <h1>Multilinguahe</h1>
          <p className="welcome-tagline">Native Dutch & English Dual Translation</p>
          <div className="status-indicator">
            <span className="dot"></span> Ready to translate
          </div>
          <p className="welcome-hint">Start the stream and speak to begin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-screen chat-layout" ref={scrollRef}>
      <div className="chat-thread">
        {turns.map((turn, index) => (
          <div 
            key={index} 
            className={`turn-block ${turn.role} ${turn.isFinal ? 'final' : 'interim'}`}
          >
            <div className="turn-inner">
              <span className="turn-label">
                {turn.role === 'user' ? 'Input' : 'Translation'}
              </span>
              <div className="turn-text-wrapper">
                <p className="turn-text">
                  {turn.text}
                  {(!turn.isFinal && index === turns.length - 1) && <span className="cursor"></span>}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;
