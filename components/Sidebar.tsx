/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useSettings, useUI } from '../lib/state';
import c from 'classnames';
import { AVAILABLE_VOICES, AVAILABLE_LANGUAGES } from '../lib/constants';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { useAuth } from '../lib/auth';
import { useHistoryStore } from '../lib/history';

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const {
    systemPrompt, voice, language1, language2, topic,
    setSystemPrompt, setVoice, setLanguage1, setLanguage2, setTopic
  } = useSettings();
  const { connected } = useLiveAPIContext();
  const { isSuperAdmin } = useAuth();
  const { history, clearHistory } = useHistoryStore();

  const handleSave = () => {
    toggleSidebar();
  };

  return (
    <aside className={c('sidebar', { open: isSidebarOpen })}>
      <div className="sidebar-header">
        <h3>Settings</h3>
        <button onClick={toggleSidebar} className="close-button">
          <span className="icon">close</span>
        </button>
      </div>
      <div className="sidebar-content">
        <div className="sidebar-section">
          <fieldset disabled={connected}>
            {isSuperAdmin && (
              <label>
                System Prompt
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={10}
                  placeholder="Describe the role and personality of the AI..."
                />
              </label>
            )}
            <label>
              Voice
              <select value={voice} onChange={e => setVoice(e.target.value)}>
                {AVAILABLE_VOICES.map(v => (
                  <option key={v.value} value={v.value}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Language 1
              <select value={language1} onChange={e => setLanguage1(e.target.value)}>
                {AVAILABLE_LANGUAGES.filter(lang => lang.value !== 'auto').map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Language 2
              <select value={language2} onChange={e => setLanguage2(e.target.value)}>
                {AVAILABLE_LANGUAGES.filter(lang => lang.value !== 'auto').map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Topic (Optional)
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={4}
                placeholder="e.g., Discussing quarterly financial results, focusing on revenue growth and market expansion."
              />
            </label>
          </fieldset>
          <button
            onClick={handleSave}
            className="save-settings-button"
            disabled={connected}
          >
            Save Settings
          </button>
        </div>
        <div className="sidebar-section history-section">
          <div className="sidebar-section-title-wrapper">
            <h4 className="sidebar-section-title">Translation History</h4>
            <button
              onClick={clearHistory}
              className="clear-history-button"
              disabled={history.length === 0}
              aria-label="Clear translation history"
            >
              <span className="icon">delete_sweep</span> Clear
            </button>
          </div>
          <div className="history-list">
            {history.length > 0 ? (
              history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-item-source">
                    <strong>Source:</strong> {item.sourceText}
                  </div>
                  <div className="history-item-translation">
                    <strong>Translation:</strong> {item.translatedText}
                  </div>
                </div>
              ))
            ) : (
              <p className="history-empty-placeholder">
                No history yet. Start a translation to see it here.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}