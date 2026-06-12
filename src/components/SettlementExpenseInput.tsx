import React from 'react';

interface SettlementExpenseInputProps {
  cost?: string;
  currency?: string;
  paidBy?: string;
  members?: string[];
  isEditMode: boolean;
  onUpdate: (updates: { cost: string; currency?: string; paidBy?: string }) => void;
  className?: string;
}

export const formatNumberWithCommas = (val: string): string => {
  const clean = val.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) return clean;
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export function SettlementExpenseInput({
  cost = '',
  currency = 'KRW',
  paidBy = '',
  members = [],
  isEditMode,
  onUpdate,
  className = '',
}: SettlementExpenseInputProps) {
  const displayMembers = members.length > 0 ? members : ['나'];

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithCommas(e.target.value);
    onUpdate({ cost: formatted, currency, paidBy });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ cost, currency: e.target.value, paidBy });
  };

  const handlePaidByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ cost, currency, paidBy: e.target.value });
  };

  if (isEditMode) {
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
            value={currency}
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
          <option value="">결제자 선택</option>
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
      <span>💳 {cost} {currency}</span>
      {paidBy && <span className="text-black/40 dark:text-white/40 font-normal">({paidBy} 결제)</span>}
    </div>
  );
}
