import { bearSvg, travellerHtml, type BearPose, type Vehicle } from './kit';

// The bear of the kit (art/bear/kit.ts) as a React element. It fills the box `className` gives it and keeps its
// proportions; `moving` off draws the same pose standing still. Decoration only, so it is hidden from screen readers.

const fill = (html: string) => html.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"');

export function Bear({ pose = 'stand', moving = true, className = '' }: { pose?: BearPose; moving?: boolean; className?: string }) {
  return <span aria-hidden className={`block ${className}`} dangerouslySetInnerHTML={{ __html: fill(bearSvg(pose, moving)) }} />;
}

export function BearRide({ vehicle, moving = true, className = '' }: { vehicle: Vehicle; moving?: boolean; className?: string }) {
  const html = travellerHtml(vehicle, false, moving).replace(/^<div style="[^"]*">/, '<div style="width:100%;height:100%">');
  return <span aria-hidden className={`block ${className}`} dangerouslySetInnerHTML={{ __html: fill(html) }} />;
}
