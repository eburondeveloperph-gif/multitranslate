/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import cn from 'classnames';
import { useUI, useSettings } from '../lib/state';

export default function Header() {
  const { toggleSidebar } = useUI();
  const { activeGuestLanguage, language1 } = useSettings();

  return (
    <header>
      <div className="header-left">
        <div className="language-status">
          <div className="lang-chip staff">
            <span className="label">Staff:</span>
            <span className="value">{language1}</span>
          </div>
          <div className={cn('lang-chip guest', { active: !!activeGuestLanguage })}>
            <span className="label">Guest:</span>
            <span className="value">{activeGuestLanguage || 'Detecting...'}</span>
          </div>
        </div>
      </div>
      <div className="header-right">
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Settings"
          title="Settings"
        >
          <span className="icon">tune</span>
        </button>
      </div>
    </header>
  );
}