/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI } from '../lib/state';

export default function Header() {
  const { toggleSidebar } = useUI();

  return (
    <header>
      <div className="header-left"></div>
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