import React, { useId } from 'react';

// Flat profile illustrations (v1.3.6): round, paper-toned portraits that sit with the app's
// Swiss Soft surfaces. Each preset keeps the id of the line icon it replaces, so profiles
// saved with the old presets show the new art without a migration.

const INK = '#23211E';
const SKIN = ['#F2CDA8', '#E3AD85', '#C68D65'];
const HAIR = { ink: '#2B2825', brown: '#5B3F2C', sand: '#B98A5A' };
const BG = { sand: '#EDE5D6', stone: '#E2DED5', clay: '#F0D9CC', wheat: '#F2E4C4', mist: '#DDE3EA' };

type Hair = 'short' | 'long' | 'bun' | 'cap' | 'glasses' | 'beanie' | 'curly';

function Frame({ bg, children, className }: { bg: string; children: (clip: string) => React.ReactNode; className?: string }) {
  const id = `av${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <clipPath id={id}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill={bg} />
      <g clipPath={`url(#${id})`}>{children(id)}</g>
    </svg>
  );
}

function Face({ y = 28 }: { y?: number }) {
  return (
    <>
      <circle cx="28" cy={y} r="1.4" fill={INK} />
      <circle cx="36" cy={y} r="1.4" fill={INK} />
      <path d={`M29 ${y + 4.5} Q32 ${y + 7} 35 ${y + 4.5}`} stroke={INK} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  );
}

const SHORT = 'M21 27 C20 17 26 13 33 13 C40 13 45 18 43 27 C40 21 34 19 27 21 C24 22 22 24 21 27Z';

function Person({ hair, skin, hairColor, shirt, bg, className }: {
  hair: Hair; skin: string; hairColor: string; shirt: string; bg: string; className?: string;
}) {
  return (
    <Frame bg={bg} className={className}>
      {() => (
        <>
          {hair === 'long' && <path d="M19 29 C18 16 25 11 32 11 C39 11 46 16 45 29 L47 46 L17 46 Z" fill={hairColor} />}
          <path d="M9 66 C9 50 19 43 32 43 C45 43 55 50 55 66 Z" fill={shirt} />
          <rect x="27.5" y="34" width="9" height="10" rx="3" fill={skin} />
          <circle cx="32" cy="27" r="11" fill={skin} />
          {hair === 'curly' && [[22, 21], [26, 16], [32, 14], [38, 16], [42, 21], [21, 27], [43, 27]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill={hairColor} />
          ))}
          {(hair === 'short' || hair === 'glasses' || hair === 'cap') && <path d={SHORT} fill={hairColor} />}
          {hair === 'long' && <path d="M21 26 C23 17 29 15 34 15 C39 15 43 19 43 26 C38 20 30 20 21 26Z" fill={hairColor} />}
          {hair === 'bun' && (
            <>
              <circle cx="32" cy="12" r="5.5" fill={hairColor} />
              <path d="M21 26 C21 18 26 15 32 15 C38 15 43 18 43 26 C39 21 25 21 21 26Z" fill={hairColor} />
            </>
          )}
          {hair === 'cap' && (
            <>
              <path d="M20.5 24 C20.5 16 26 12.5 32 12.5 C38 12.5 43.5 16 43.5 24 Z" fill="#D93025" />
              <rect x="30" y="21.5" width="19" height="3.5" rx="1.75" fill="#B3261E" />
            </>
          )}
          {hair === 'beanie' && (
            <>
              <path d="M20.5 25 C20.5 16 26 12.5 32 12.5 C38 12.5 43.5 16 43.5 25 Z" fill="#D9A441" />
              <rect x="19.5" y="22" width="25" height="5" rx="2.5" fill="#C08A2C" />
              <circle cx="32" cy="11.5" r="3" fill="#C08A2C" />
            </>
          )}
          <Face />
          {hair === 'glasses' && (
            <g stroke={INK} strokeWidth="1.3" fill="none">
              <circle cx="27.5" cy="28" r="3.6" />
              <circle cx="36.5" cy="28" r="3.6" />
              <path d="M31.1 28 H32.9" />
            </g>
          )}
        </>
      )}
    </Frame>
  );
}

function Baby({ className }: { className?: string }) {
  return (
    <Frame bg={BG.wheat} className={className}>
      {() => (
        <>
          <path d="M12 66 C12 52 21 46 32 46 C43 46 52 52 52 66 Z" fill="#F7F3EA" />
          <circle cx="32" cy="31" r="14" fill={SKIN[0]} />
          <path d="M32 17.5 C34 14 37.5 14 37 17" stroke={HAIR.brown} strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="24.5" cy="35" r="2.6" fill="#E9A08A" opacity=".55" />
          <circle cx="39.5" cy="35" r="2.6" fill="#E9A08A" opacity=".55" />
          <Face y={31} />
        </>
      )}
    </Frame>
  );
}

function Cat({ className }: { className?: string }) {
  const fur = '#E3A45A';
  return (
    <Frame bg={BG.sand} className={className}>
      {() => (
        <>
          <path d="M18 26 L20 11 L30 21 Z M46 26 L44 11 L34 21 Z" fill={fur} />
          <path d="M21.5 22 L22 15 L27 20 Z M42.5 22 L42 15 L37 20 Z" fill="#F0D9CC" />
          <path d="M12 66 C12 52 21 47 32 47 C43 47 52 52 52 66 Z" fill={fur} />
          <circle cx="32" cy="32" r="15" fill={fur} />
          <ellipse cx="32" cy="37" rx="7" ry="5" fill="#F7EBDD" />
          <circle cx="26" cy="30" r="1.6" fill={INK} />
          <circle cx="38" cy="30" r="1.6" fill={INK} />
          <path d="M30.5 34.5 H33.5 L32 36.2 Z" fill="#B3261E" />
          <g stroke={INK} strokeWidth="1" strokeLinecap="round" opacity=".55">
            <path d="M22 36 H15" /><path d="M22 38.5 L15.5 40" /><path d="M42 36 H49" /><path d="M42 38.5 L48.5 40" />
          </g>
        </>
      )}
    </Frame>
  );
}

function Dog({ className }: { className?: string }) {
  const fur = '#C99B6C';
  return (
    <Frame bg={BG.stone} className={className}>
      {() => (
        <>
          <path d="M12 66 C12 52 21 47 32 47 C43 47 52 52 52 66 Z" fill={fur} />
          <circle cx="32" cy="31" r="14.5" fill={fur} />
          <ellipse cx="18.5" cy="30" rx="5" ry="10" transform="rotate(14 18.5 30)" fill={HAIR.brown} />
          <ellipse cx="45.5" cy="30" rx="5" ry="10" transform="rotate(-14 45.5 30)" fill={HAIR.brown} />
          <ellipse cx="32" cy="37" rx="8" ry="6" fill="#EFE2D0" />
          <circle cx="26.5" cy="29" r="1.6" fill={INK} />
          <circle cx="37.5" cy="29" r="1.6" fill={INK} />
          <ellipse cx="32" cy="34.5" rx="2.6" ry="2" fill={INK} />
          <path d="M29.5 39 Q32 41 34.5 39" stroke={INK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </>
      )}
    </Frame>
  );
}

function Rabbit({ className }: { className?: string }) {
  const fur = '#FAF6EE';
  return (
    <Frame bg={BG.clay} className={className}>
      {() => (
        <>
          <ellipse cx="25" cy="13" rx="4.5" ry="12" fill={fur} />
          <ellipse cx="39" cy="13" rx="4.5" ry="12" fill={fur} />
          <ellipse cx="25" cy="14" rx="2" ry="8" fill="#E9B4A2" />
          <ellipse cx="39" cy="14" rx="2" ry="8" fill="#E9B4A2" />
          <path d="M12 66 C12 52 21 47 32 47 C43 47 52 52 52 66 Z" fill={fur} />
          <circle cx="32" cy="33" r="14" fill={fur} />
          <circle cx="27" cy="31" r="1.6" fill={INK} />
          <circle cx="37" cy="31" r="1.6" fill={INK} />
          <path d="M30.8 35.5 H33.2 L32 37 Z" fill="#D9776A" />
          <path d="M32 37 V39 M32 39 Q30 41 28.5 40 M32 39 Q34 41 35.5 40" stroke={INK} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        </>
      )}
    </Frame>
  );
}

function Bird({ className }: { className?: string }) {
  const body = '#3F4B5C';
  return (
    <Frame bg={BG.mist} className={className}>
      {() => (
        <>
          <circle cx="32" cy="36" r="17" fill={body} />
          <ellipse cx="32" cy="42" rx="10" ry="9" fill="#EDE5D6" />
          <path d="M28 20 Q31 13 35 19" stroke={body} strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="26.5" cy="31" r="2.2" fill="#FFFDF9" />
          <circle cx="37.5" cy="31" r="2.2" fill="#FFFDF9" />
          <circle cx="26.8" cy="31.3" r="1.2" fill={INK} />
          <circle cx="37.2" cy="31.3" r="1.2" fill={INK} />
          <path d="M29 35 L35 35 L32 39 Z" fill="#D9A441" />
        </>
      )}
    </Frame>
  );
}

function Fish({ className }: { className?: string }) {
  const body = '#6F8FBF';
  return (
    <Frame bg={BG.mist} className={className}>
      {() => (
        <>
          <path d="M44 32 L55 23 L55 41 Z" fill="#5B79A8" />
          <ellipse cx="29" cy="32" rx="17" ry="12" fill={body} />
          <path d="M26 21 Q31 15 37 21" fill="#5B79A8" />
          <path d="M33 25 Q36 32 33 39" stroke="#FFFDF9" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".6" />
          <circle cx="20" cy="30" r="2.4" fill="#FFFDF9" />
          <circle cx="20.3" cy="30.3" r="1.3" fill={INK} />
          <path d="M13.5 34 Q15.5 35.5 17.5 34" stroke={INK} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </>
      )}
    </Frame>
  );
}

type AvatarArt = React.FC<{ className?: string }>;
const person = (hair: Hair, skin: string, hairColor: string, shirt: string, bg: string): AvatarArt =>
  ({ className }) => <Person hair={hair} skin={skin} hairColor={hairColor} shirt={shirt} bg={bg} className={className} />;

export interface FlatAvatarPreset {
  id: string;
  label: string;
  category: 'face' | 'baby' | 'animal';
  art: AvatarArt;
}

// Ids are the old line-icon ids, so saved profiles pick up the matching illustration
export const FLAT_AVATARS: FlatAvatarPreset[] = [
  { id: 'user', label: '짧은 머리', category: 'face', art: person('short', SKIN[1], HAIR.ink, INK, BG.sand) },
  { id: 'smile', label: '긴 머리', category: 'face', art: person('long', SKIN[0], HAIR.brown, '#D93025', BG.clay) },
  { id: 'smile-plus', label: '올림머리', category: 'face', art: person('bun', SKIN[0], HAIR.ink, '#EDE5D6', BG.stone) },
  { id: 'laugh', label: '모자', category: 'face', art: person('cap', SKIN[2], HAIR.ink, INK, BG.wheat) },
  { id: 'meh', label: '안경', category: 'face', art: person('glasses', SKIN[1], HAIR.sand, '#3F4B5C', BG.mist) },
  { id: 'frown', label: '비니', category: 'face', art: person('beanie', SKIN[0], HAIR.brown, INK, BG.stone) },
  { id: 'heart', label: '곱슬머리', category: 'face', art: person('curly', SKIN[2], HAIR.ink, '#D9A441', BG.sand) },
  { id: 'baby', label: '아기', category: 'baby', art: Baby },
  { id: 'cat', label: '고양이', category: 'animal', art: Cat },
  { id: 'dog', label: '강아지', category: 'animal', art: Dog },
  { id: 'rabbit', label: '토끼', category: 'animal', art: Rabbit },
  { id: 'bird', label: '새', category: 'animal', art: Bird },
  { id: 'fish', label: '물고기', category: 'animal', art: Fish },
];

const PEOPLE = FLAT_AVATARS.filter(a => a.category === 'face');

export function flatAvatarById(id?: string): FlatAvatarPreset | undefined {
  return FLAT_AVATARS.find(a => a.id === id);
}

/** A stable portrait for someone who has not picked one, from their name or id */
export function flatAvatarFor(seed: string): FlatAvatarPreset {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PEOPLE[h % PEOPLE.length];
}
