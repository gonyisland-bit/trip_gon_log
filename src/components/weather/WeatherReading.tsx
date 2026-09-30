import type { CityWeatherData } from '../../utils/weatherApi';
import { getWeatherMeta } from '../../utils/weatherApi';

// One aligned reading for a place row: icon column, then temperature in tabular figures.
// Fixed widths keep every row's icon and degrees in the same columns.
export function WeatherReading({ data }: { data?: CityWeatherData }) {
  const meta = data ? getWeatherMeta(data.weatherCode, data.forecast?.[0]?.precipitationProb, data.temp) : null;
  const Icon = meta?.icon;
  return (
    <span className="flex items-center gap-1.5 shrink-0" title={meta?.labelKo}>
      <span className="w-4 h-4 inline-grid place-items-center">
        {Icon ? <Icon className={`w-4 h-4 ${meta?.colorClass || ''}`} aria-hidden /> : <span className="w-1.5 h-1.5 rounded-full bg-black/15 dark:bg-white/20" />}
      </span>
      <span className="w-9 text-right font-mono text-meta font-bold tabular-nums">
        {data ? `${data.temp}°` : '–'}
      </span>
    </span>
  );
}
