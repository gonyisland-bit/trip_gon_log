import type { ArtId } from '../../art/catalog';

// The cities offered on the first-journey hero, each with the scene shown while it is lit
export interface FirstTripPick { name: string; code: string; art: ArtId }

export const FIRST_TRIP_DESTINATIONS: FirstTripPick[] = [
  { name: '다낭', code: 'DAD', art: 'beach-relaxation' },
  { name: '파리', code: 'PAR', art: 'landmark-paris' },
  { name: '발리', code: 'DPS', art: 'beach-surfing' },
  { name: '도쿄', code: 'TYO', art: 'landmark-japan' },
  { name: '시드니', code: 'SYD', art: 'poolside-cocktail' },
  { name: '방콕', code: 'BKK', art: 'city-walk' },
];

/** Seconds a city stays lit */
export const FIRST_TRIP_PERIOD = 3.6;
