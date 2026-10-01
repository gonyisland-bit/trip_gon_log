import React from 'react';
import { Art } from '../../art/Art';
import type { ArtId } from '../../art/catalog';
import { WeatherParticleCanvas } from '../weather/WeatherParticleCanvas';
import type { WeatherEffectType } from '../WeatherEffectLayer';
import { hashString } from './departureData';

// The terminal's window (v1.3.8): on the terminal's butter tint, one scene of someone waiting
// (or the departure board when there is no ticket), with the weather outside falling over it.
const WAITING: ArtId[] = ['train-station', 'waiting-gate', 'window-waiting'];

interface TerminalSceneProps {
  /** Picks the waiting scene, so each ticket has its own */
  ticketId?: string;
  isDarkMode: boolean;
  weatherType: WeatherEffectType;
  intensity: number;
}

export function TerminalScene({ ticketId, isDarkMode, weatherType, intensity }: TerminalSceneProps) {
  const art: ArtId = ticketId ? WAITING[hashString(ticketId) % WAITING.length] : 'departure-board';
  return (
    <div className="absolute inset-0 bg-butter dark:bg-butter-dark overflow-hidden">
      <Art id={art} eager className="absolute inset-0 m-auto h-[92%] w-auto max-w-full" />
      <div className="absolute inset-0 pointer-events-none">
        <WeatherParticleCanvas type={weatherType} intensity={intensity} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
