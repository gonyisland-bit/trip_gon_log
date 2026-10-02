import React from 'react';
import { ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { useExchangeRates } from '../../utils/exchangeRates';

// Home exchange widget (v1.3.8): the three currencies travellers ask about, in won, from the latest daily rates.
// The up/down arrow compares with the previous published day and appears only once the app has seen an earlier day.

const CURRENCIES: { code: string; per: number }[] = [
  { code: 'USD', per: 1 },
  { code: 'JPY', per: 100 }, // quoted per 100 yen, as banks do
  { code: 'EUR', per: 1 },
];

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ExchangeWidget() {
  const { rates, prevRates, date } = useExchangeRates();
  return (
    <section className="w-full max-w-[1920px] mx-auto mt-6 sm:mt-8 px-4 sm:px-8 md:px-12 select-none font-mono">
      <div className="w-full py-2 sm:py-2.5 px-3.5 sm:px-5 rounded-full bg-surface dark:bg-surface-dark flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 shrink-0 pr-2 sm:pr-3 border-r border-black/10 dark:border-white/10">
          <Coins className="w-3.5 h-3.5 text-black/60 dark:text-white/60" aria-hidden />
          <span className="font-extrabold text-meta uppercase tracking-wider text-black/70 dark:text-white/70 hidden xs:inline">EXCHANGE</span>
        </div>

        <div className="flex-1 flex items-center justify-around gap-1.5 sm:gap-3 text-xs sm:text-[13px]">
          {CURRENCIES.map((c, idx) => {
            const now = (rates[c.code] ?? 0) * c.per;
            const before = prevRates?.[c.code] ? prevRates[c.code] * c.per : null;
            const diff = before ? now - before : null;
            const up = diff !== null && diff > 0;
            return (
              <div key={c.code} className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-extrabold text-meta sm:text-xs text-black/60 dark:text-white/60 tracking-wider">{c.code}</span>
                <span className="font-extrabold text-xs sm:text-sm text-black dark:text-white tracking-tight tabular-nums">{fmt(now)}</span>
                {diff !== null && Math.abs(diff) >= 0.005 && (
                  <span className={`inline-flex items-center text-micro font-bold tabular-nums ${up ? 'text-red-500' : 'text-blue-500'}`}>
                    {up ? <ChevronUp className="w-3 h-3" aria-label="상승" /> : <ChevronDown className="w-3 h-3" aria-label="하락" />}
                    <span className="hidden sm:inline">{fmt(Math.abs(diff))}</span>
                  </span>
                )}
                {idx < CURRENCIES.length - 1 && <span className="text-black/60 dark:text-white/60 ml-1.5 sm:ml-3 hidden xs:inline">/</span>}
              </div>
            );
          })}
        </div>

        <span className="text-micro sm:text-meta text-black/60 dark:text-white/60 shrink-0 pl-2 sm:pr-1 border-l border-black/10 dark:border-white/10 hidden sm:inline font-bold tabular-nums">
          {date ? `${date.slice(5).replace('-', '.')} 기준` : 'KRW'}
        </span>
      </div>
    </section>
  );
}
