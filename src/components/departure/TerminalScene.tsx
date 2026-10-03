import { artSrc } from '../../art/Art';
import { Bear, BearRide } from '../../art/bear/Bear';
import { WeatherParticleCanvas } from '../weather/WeatherParticleCanvas';
import type { WeatherEffectType } from '../WeatherEffectLayer';

// The terminal's window: the airport lobby with the bears waiting at the gate, filling a rounded window that has the
// picture's own proportions, with the weather outside falling over it. Over the picture (v1.3.9 pilot of the vector bear
// kit) one bear walks across the floor pulling its case, and now and then a plane takes off beyond the glass.

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
        className="absolute inset-0 w-full h-full object-cover select-none"
      />
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <BearRide vehicle="flight" className="tgl-term-plane absolute" />
        <Bear pose="suitcase" className="tgl-term-walker absolute" />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <WeatherParticleCanvas type={weatherType} intensity={intensity} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
