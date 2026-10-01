import React from 'react';
import { artSrc } from '../../art/Art';
import { WeatherParticleCanvas } from '../weather/WeatherParticleCanvas';
import type { WeatherEffectType } from '../WeatherEffectLayer';

// The terminal's window: the airport lobby with the bears waiting at the gate, filling the rounded
// window, with the weather outside falling over it.

interface TerminalSceneProps {
  isDarkMode: boolean;
  weatherType: WeatherEffectType;
  intensity: number;
}

export function TerminalScene({ isDarkMode, weatherType, intensity }: TerminalSceneProps) {
  return (
    <div className="absolute inset-0 bg-butter dark:bg-butter-dark overflow-hidden">
      <img
        src={artSrc('terminal-airport')}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-[50%_76%] md:object-[50%_50%] select-none"
      />
      <div className="absolute inset-0 pointer-events-none">
        <WeatherParticleCanvas type={weatherType} intensity={intensity} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
