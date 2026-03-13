/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import cn from 'classnames';

interface MicVisualizerProps {
  volume: number;
  isActive: boolean;
}

const NUM_BARS = 32;

const MicVisualizer: React.FC<MicVisualizerProps> = ({ volume, isActive }) => {
  const bars = Array.from({ length: NUM_BARS }, (_, i) => {
    // Make the visualizer symmetrical and more dynamic in the center
    const barIndex = i < NUM_BARS / 2 ? i : NUM_BARS - 1 - i;
    const heightFactor = Math.pow(barIndex / (NUM_BARS / 2), 2);
    const baseHeight = 2;
    const maxHeight = 30;
    const dynamicHeight = Math.max(0, volume * maxHeight * (1.2 - heightFactor));
    const height = baseHeight + dynamicHeight;

    return (
      <div
        key={i}
        className="mic-visualizer-bar"
        style={{ height: `${height}px` }}
      />
    );
  });

  return (
    <div className={cn('mic-visualizer-container', { active: isActive })}>
      {bars}
    </div>
  );
};

export default MicVisualizer;
