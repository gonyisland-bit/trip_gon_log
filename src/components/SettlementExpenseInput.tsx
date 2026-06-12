import React from 'react';

interface SettlementExpenseInputProps {
  cost?: string;
  currency?: string;
  paidBy?: string;
  members?: string[];
  isEditMode: boolean;
  onUpdate: (updates: { cost: string; currency?: string; paidBy?: string }) => void;
  className?: string;
  defaultCurrency?: string;
  vertical?: boolean;
}

export const getDefaultCurrencyForLocation = (locationStr: string = ''): string => {
  const loc = locationStr.toLowerCase();
  
  // Japan
  if (
    loc.includes('일본') || 
    loc.includes('japan') || 
    loc.includes('도쿄') || 
    loc.includes('오사카') || 
    loc.includes('후쿠오카') || 
    loc.includes('홋카이도') || 
    loc.includes('교토') || 
    loc.includes('오키나와') || 
    loc.includes('나고야') || 
    loc.includes('삿포로') ||
    loc.includes('tokyo') ||
    loc.includes('osaka') ||
    loc.includes('fukuoka') ||
    loc.includes('hokkaido') ||
    loc.includes('kyoto') ||
    loc.includes('okinawa') ||
    loc.includes('nagoya') ||
    loc.includes('sapporo')
  ) {
    return 'JPY';
  }
  
  // USA / US territories
  if (
    loc.includes('미국') || 
    loc.includes('usa') || 
    loc.includes('united states') || 
    loc.includes('하와이') || 
    loc.includes('hawaii') || 
    loc.includes('괌') || 
    loc.includes('guam') || 
    loc.includes('사이판') || 
    loc.includes('saipan') || 
    loc.includes('뉴욕') || 
    loc.includes('new york') || 
    loc.includes('로스앤젤레스') || 
    loc.includes('los angeles') || 
    loc.includes('lax') || 
    loc.includes('샌프란시스코') || 
    loc.includes('san francisco')
  ) {
    return 'USD';
  }
  
  // Europe
  if (
    loc.includes('유럽') || 
    loc.includes('europe') || 
    loc.includes('프랑스') || 
    loc.includes('france') || 
    loc.includes('독일') || 
    loc.includes('germany') || 
    loc.includes('이탈리아') || 
    loc.includes('italy') || 
    loc.includes('스페인') || 
    loc.includes('spain') || 
    loc.includes('네덜란드') || 
    loc.includes('netherlands') || 
    loc.includes('오스트리아') || 
    loc.includes('austria') || 
    loc.includes('파리') || 
    loc.includes('paris') || 
    loc.includes('로마') || 
    loc.includes('roma') || 
    loc.includes('rome') || 
    loc.includes('뮌헨') ||
    loc.includes('munich')
  ) {
    return 'EUR';
  }
  
  // China
  if (
    loc.includes('중국') || 
    loc.includes('china') || 
    loc.includes('상하이') || 
    loc.includes('shanghai') || 
    loc.includes('베이징') || 
    loc.includes('beijing') || 
    loc.includes('홍콩') || 
    loc.includes('hong kong') || 
    loc.includes('마카오') ||
    loc.includes('macau')
  ) {
    return 'CNY';
  }
  
  return 'KRW';
};

export const formatNumberWithCommas = (val: string): string => {
  const clean = val.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) return clean;
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export function SettlementExpenseInput({
  cost = '',
  currency,
  paidBy = '',
  members = [],
  isEditMode,
  onUpdate,
  className = '',
  defaultCurrency = 'KRW',
  vertical = false,
}: SettlementExpenseInputProps) {
  const activeCurrency = currency || defaultCurrency;
  const displayMembers = members.length > 0 ? members : ['나'];

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithCommas(e.target.value);
    onUpdate({ cost: formatted, currency: activeCurrency, paidBy });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ cost, currency: e.target.value, paidBy });
  };

  const handlePaidByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ cost, currency: activeCurrency, paidBy: e.target.value });
  };

  if (isEditMode) {
    if (vertical) {
      return (
        <div 
          className={`flex flex-col items-end gap-1 text-[9px] md:text-[10px] font-bold ${className}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 p-0.5 rounded-sm w-20 md:w-24">
            <input
              type="text"
              value={cost}
              onChange={handleCostChange}
              placeholder="0"
              className="w-full bg-transparent outline-none text-[9px] md:text-[10px] font-bold text-right px-0.5 text-black dark:text-white"
            />
            <select
              value={activeCurrency}
              onChange={handleCurrencyChange}
              className="bg-transparent outline-none text-[8px] md:text-[9px] font-bold text-black/60 dark:text-white/60 border-l border-black/10 dark:border-white/10 pl-0.5 cursor-pointer shrink-0"
            >
              <option value="KRW">₩</option>
              <option value="USD">$</option>
              <option value="JPY">¥</option>
              <option value="EUR">€</option>
              <option value="CNY">¥</option>
            </select>
          </div>

          <select
            value={paidBy}
            onChange={handlePaidByChange}
            className="bg-white dark:bg-[#222] border border-black/10 dark:border-white/10 px-1 py-0.5 text-[8px] md:text-[9px] font-bold text-black/60 dark:text-white/60 rounded-sm cursor-pointer w-20 md:w-24 outline-none"
          >
            <option value="">USER</option>
            {displayMembers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div 
        className={`flex flex-wrap items-center gap-1.5 text-[10px] md:text-xs font-bold ${className}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 p-0.5 rounded-sm">
          <input
            type="text"
            value={cost}
            onChange={handleCostChange}
            placeholder="0"
            className="w-16 md:w-20 bg-transparent outline-none text-[10px] md:text-xs font-bold text-right px-1 text-black dark:text-white"
          />
          <select
            value={activeCurrency}
            onChange={handleCurrencyChange}
            className="bg-transparent outline-none text-[9px] md:text-[10px] font-bold text-black/60 dark:text-white/60 border-l border-black/10 dark:border-white/10 pl-1 cursor-pointer"
          >
            <option value="KRW">₩ KRW</option>
            <option value="USD">$ USD</option>
            <option value="JPY">¥ JPY</option>
            <option value="EUR">€ EUR</option>
            <option value="CNY">¥ CNY</option>
          </select>
        </div>

        <select
          value={paidBy}
          onChange={handlePaidByChange}
          className="bg-white dark:bg-[#222] border border-black/10 dark:border-white/10 px-1 py-0.5 text-[9px] md:text-[10px] font-bold text-black/60 dark:text-white/60 rounded-sm cursor-pointer"
        >
          <option value="">USER</option>
          {displayMembers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // View Mode
  if (!cost || cost === '-') return null;

  return (
    <div className={`inline-flex items-center flex-wrap gap-1 px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[9px] md:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 normal-case ${className}`}>
      <span>💳 {cost} {activeCurrency}</span>
      {paidBy && <span className="text-black/40 dark:text-white/40 font-normal">({paidBy} 결제)</span>}
    </div>
  );
}
