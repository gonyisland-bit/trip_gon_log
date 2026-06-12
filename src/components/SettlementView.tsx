import React, { useState } from 'react';
import { 
  UserPlus, Trash2, Coins, ArrowRight, Calculator, AlertCircle
} from 'lucide-react';
import { Trip, TimelineItem, FlightItem, StayItem, TransitItem, TabType } from '../types';

const EXCHANGE_RATES: { [currency: string]: number } = {
  KRW: 1,
  USD: 1380, // 1 USD = 1380 KRW
  JPY: 9.0,  // 1 JPY = 9.0 KRW
  EUR: 1480, // 1 EUR = 1480 KRW
  CNY: 190,  // 1 CNY = 190 KRW
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  KRW: '₩',
  USD: '$',
  JPY: '¥',
  EUR: '€',
  CNY: '¥',
};

const TYPE_CODES: { [key: string]: string } = {
  timeline: 'L',
  flight: 'F',
  stay: 'S',
  transit: 'T',
};

const TYPE_COLORS: { [key: string]: string } = {
  timeline: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  flight: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  stay: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  transit: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

const formatNumberWithCommas = (val: string): string => {
  const clean = val.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) return clean;
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/** Format full date string to compact: "2025.09.25" -> "25.09.25" */
const compactDate = (dateStr: string): string => {
  if (!dateStr || dateStr.includes('일정')) return dateStr;
  // Handles YYYY.MM.DD or YYYY-MM-DD
  const normalized = dateStr.replace(/-/g, '.');
  const parts = normalized.split('.');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
};

interface SettlementViewProps {
  trip: Trip;
  timelineData: { [date: string]: TimelineItem[] };
  flights: FlightItem[];
  stays: StayItem[];
  transits: TransitItem[];
  isEditing: boolean;
  onUpdateMembers: (members: string[]) => void;
  onJumpToItem: (tab: TabType, id: number, date?: string) => void;
  defaultCurrency?: string;
  onUpdateExpense?: (itemType: 'timeline' | 'flight' | 'stay' | 'transit', id: number, field: 'cost' | 'currency' | 'paidBy', value: any) => void;
}

export function SettlementView({
  trip,
  timelineData,
  flights,
  stays,
  transits,
  isEditing,
  onUpdateMembers,
  onJumpToItem,
  defaultCurrency = 'KRW',
  onUpdateExpense,
}: SettlementViewProps) {
  const members = trip.members && trip.members.length > 0 ? trip.members : ['나'];
  const [newMemberName, setNewMemberName] = useState('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // 1. Collect all expenses
  const expenseItems = React.useMemo(() => {
    const list: Array<{
      id: number;
      name: string;
      itemType: 'timeline' | 'flight' | 'stay' | 'transit';
      date: string;
      cost: string;
      currency: string;
      paidBy: string;
      rawItem: any;
    }> = [];

    // Timeline expenses
    Object.entries(timelineData).forEach(([date, items]) => {
      (items || []).forEach(item => {
        if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
          list.push({
            id: item.id,
            name: item.place || '일정 지출',
            itemType: 'timeline',
            date,
            cost: item.cost,
            currency: item.currency || defaultCurrency,
            paidBy: item.paidBy || '나',
            rawItem: item,
          });
        }
      });
    });

    // Flight expenses
    flights.forEach(item => {
      if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
        list.push({
          id: item.id,
          name: `${item.title || '항공권'} ${item.fromCode}→${item.toCode}`,
          itemType: 'flight',
          date: item.date || '항공일정',
          cost: item.cost,
          currency: item.currency || defaultCurrency,
          paidBy: item.paidBy || '나',
          rawItem: item,
        });
      }
    });

    // Stay expenses
    stays.forEach(item => {
      if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
        const checkInDate = item.dateRange.split('-')[0].trim();
        list.push({
          id: item.id,
          name: item.title || '숙소 예약',
          itemType: 'stay',
          date: checkInDate || '숙소일정',
          cost: item.cost,
          currency: item.currency || defaultCurrency,
          paidBy: item.paidBy || '나',
          rawItem: item,
        });
      }
    });

    // Transit expenses
    transits.forEach(item => {
      if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
        list.push({
          id: item.id,
          name: `${item.ticketType || '이동수단'} ${item.title || item.route}`,
          itemType: 'transit',
          date: item.date || '이동일정',
          cost: item.cost,
          currency: item.currency || defaultCurrency,
          paidBy: item.paidBy || '나',
          rawItem: item,
        });
      }
    });

    // Sort by date chronologically
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineData, flights, stays, transits, defaultCurrency]);

  // 2. Parse costs to KRW and accumulate balances
  const parseCostToKRW = (costStr: string, currency: string): number => {
    const clean = costStr.replace(/[^0-9.]/g, '');
    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    const rate = EXCHANGE_RATES[currency.toUpperCase()] || 1;
    return Math.round(val * rate);
  };

  const { totalExpenseKRW, memberPaidStats } = React.useMemo(() => {
    let total = 0;
    const stats: { [name: string]: number } = {};
    members.forEach(m => { stats[m] = 0; });

    expenseItems.forEach(item => {
      const krw = parseCostToKRW(item.cost, item.currency);
      total += krw;
      
      const payer = members.includes(item.paidBy) ? item.paidBy : members[0];
      stats[payer] = (stats[payer] || 0) + krw;
    });

    return { totalExpenseKRW: total, memberPaidStats: stats };
  }, [expenseItems, members]);

  // 3. Calculate share and transfers
  const sharePerPerson = Math.round(totalExpenseKRW / Math.max(1, members.length));
  
  const memberBalances = React.useMemo(() => {
    const balances: { [name: string]: number } = {};
    members.forEach(m => {
      balances[m] = (memberPaidStats[m] || 0) - sharePerPerson;
    });
    return balances;
  }, [members, memberPaidStats, sharePerPerson]);

  const transfers = React.useMemo(() => {
    const debtors = Object.entries(memberBalances)
      .filter(([_, bal]) => bal < 0)
      .map(([name, bal]) => ({ name, amount: -bal }));
    const creditors = Object.entries(memberBalances)
      .filter(([_, bal]) => bal > 0)
      .map(([name, bal]) => ({ name, amount: bal }));

    const result: Array<{ from: string; to: string; amount: number }> = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const transferAmount = Math.min(debtor.amount, creditor.amount);
      if (transferAmount > 0.5) {
        result.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(transferAmount),
        });
      }

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;

      if (debtor.amount < 0.1) dIdx++;
      if (creditor.amount < 0.1) cIdx++;
    }

    return result;
  }, [memberBalances]);

  // 4. Handle member management
  const handleAddMember = () => {
    const cleanName = newMemberName.trim();
    if (!cleanName) return;
    if (members.includes(cleanName)) {
      alert("이미 등록된 인원입니다.");
      return;
    }
    onUpdateMembers([...members, cleanName]);
    setNewMemberName('');
  };

  const handleRemoveMember = (nameToRemove: string) => {
    if (members.length <= 1) {
      alert("최소 한 명의 인원은 여정에 설정되어 있어야 합니다.");
      return;
    }
    if (window.confirm(`정말 '${nameToRemove}' 인원을 삭제하시겠습니까? 관련된 결제 기록의 결제자가 다른 사람으로 바뀔 수 있습니다.`)) {
      onUpdateMembers(members.filter(m => m !== nameToRemove));
    }
  };

  const handleJumpToItem = (item: typeof expenseItems[0]) => {
    let mappedTab: TabType = 'timeline';
    if (item.itemType === 'flight') mappedTab = 'flights';
    else if (item.itemType === 'stay') mappedTab = 'stays';
    else if (item.itemType === 'transit') mappedTab = 'transit';
    onJumpToItem(mappedTab, item.id, item.itemType === 'timeline' ? item.date : undefined);
  };

  return (
    <div className="p-3 md:p-5 flex flex-col gap-5 text-left text-black dark:text-white max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* 1. Member Settings Panel */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55">
            👥 여정 참석 인원 ({members.length}명)
          </span>
          {isEditing && (
            <span className="text-[9px] text-orange-500 font-bold uppercase">
              편집 중
            </span>
          )}
        </div>
        
        {/* Members tags list */}
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <span 
              key={m} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold rounded-sm"
            >
              {m}
              {isEditing && (
                <button
                  onClick={() => handleRemoveMember(m)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="인원 삭제"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>

        {/* Add new member form (Only in edit mode) */}
        {isEditing && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="참석자 이름 입력..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="bg-[#EAE8E3] dark:bg-white/10 px-2.5 py-1 outline-none text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-44"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember(); }}
            />
            <button
              onClick={handleAddMember}
              className="bg-black text-white dark:bg-white dark:text-black px-3.5 py-1 text-xs font-black uppercase tracking-widest rounded-sm hover:opacity-85 transition-opacity flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" /> 추가
            </button>
          </div>
        )}
      </div>

      {/* 2. Total Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Cost card */}
        <div className="bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/20 p-4 flex flex-col justify-center">
          <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 block mb-1">
            총 지출 (Total)
          </span>
          <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            ₩{totalExpenseKRW.toLocaleString()}
          </span>
        </div>

        {/* Member Count & Share card */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-4 flex flex-col justify-center">
          <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-black/45 dark:text-white/45 block mb-1">
            1인당 ({members.length}명 균등)
          </span>
          <span className="text-lg md:text-xl font-black whitespace-nowrap">
            ₩{sharePerPerson.toLocaleString()}
          </span>
        </div>

        {/* Rates Guide card */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-3 flex flex-col justify-center text-[10px] leading-relaxed text-black/50 dark:text-white/50">
          <span className="font-bold text-black/70 dark:text-white/70 uppercase text-[8px] tracking-wider mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-orange-500" /> 환율 기준
          </span>
          <div className="text-[9px]">USD 1,380 · JPY 9.0 · EUR 1,480 · CNY 190 (₩)</div>
          <div className="text-[8px] opacity-60 mt-0.5">※ 여정 기간 기준 일괄 적용</div>
        </div>
      </div>

      {/* 3. Expense Ledger (정산 기록표) */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="py-2 px-3 bg-black/3 dark:bg-white/3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55">
            📋 결제 기록 ({expenseItems.length}건)
          </span>
          <span className="text-[8px] text-black/30 dark:text-white/30 font-bold uppercase">항목 클릭 시 이동</span>
        </div>

        {expenseItems.length === 0 ? (
          <div className="text-center py-12 text-xs md:text-sm font-bold text-black/40 dark:text-white/40 uppercase">
            지출 내역이 없습니다. (각 카드에 금액을 등록해 주세요)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 uppercase text-[7px] md:text-[8px] font-black tracking-widest text-black/50 dark:text-white/50">
                  <th className="py-2 px-1.5 whitespace-nowrap">DAY</th>
                  <th className="py-2 px-1.5">ITEM</th>
                  <th className="py-2 px-1.5 whitespace-nowrap">USER</th>
                  <th className="py-2 px-1.5 text-right whitespace-nowrap">PAY</th>
                  <th className="py-2 px-1.5 text-right whitespace-nowrap">PAY(₩)</th>
                </tr>
              </thead>
              <tbody>
                {expenseItems.map((item, idx) => {
                  const krwAmount = parseCostToKRW(item.cost, item.currency);
                  const rowKey = `${item.itemType}-${item.id}-${idx}`;
                  const isHovered = hoveredRow === rowKey;
                  return (
                    <tr 
                      key={rowKey}
                      onClick={() => handleJumpToItem(item)}
                      onMouseEnter={() => setHoveredRow(rowKey)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`border-b border-black/5 dark:border-white/5 last:border-b-0 transition-colors cursor-pointer ${isHovered ? 'bg-emerald-500/5 dark:bg-emerald-400/5' : 'hover:bg-black/3 dark:hover:bg-white/3'}`}
                    >
                      {/* DAY */}
                      <td className="py-2 px-1.5 font-bold text-black/50 dark:text-white/50 whitespace-nowrap text-[9px]">
                        {compactDate(item.date)}
                      </td>
                      {/* ITEM */}
                      <td className="py-2 px-1.5 max-w-[90px] md:max-w-[140px]">
                        <div className="font-bold flex items-center gap-1 min-w-0">
                          <span className={`text-[7px] md:text-[8px] font-black px-1 py-0.5 rounded-sm shrink-0 ${TYPE_COLORS[item.itemType] || ''}`}>
                            {TYPE_CODES[item.itemType] || '?'}
                          </span>
                          {isEditing ? (
                            <span className="truncate text-[9px] md:text-[10px]" title={item.name}>{item.name}</span>
                          ) : (
                            <span className={`truncate text-[9px] md:text-[10px] transition-colors ${isHovered ? 'text-emerald-600 dark:text-emerald-400' : ''}`} title={item.name}>{item.name}</span>
                          )}
                        </div>
                      </td>
                      {/* USER (paidBy) */}
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        {isEditing && onUpdateExpense ? (
                          <select
                            value={item.paidBy}
                            onChange={(e) => { e.stopPropagation(); onUpdateExpense(item.itemType, item.id, 'paidBy', e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border border-black/10 dark:border-white/10 px-1 py-0.5 text-[9px] font-bold text-black dark:text-white rounded-sm cursor-pointer outline-none bg-white dark:bg-[#222] max-w-[60px]"
                          >
                            <option value="">USER</option>
                            {members.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{item.paidBy || '-'}</span>
                        )}
                      </td>
                      {/* PAY (original) */}
                      <td className="py-2 px-1.5 text-right font-mono font-bold whitespace-nowrap">
                        {isEditing && onUpdateExpense ? (
                          <div className="inline-flex items-center border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 p-0.5 rounded-sm" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={item.cost}
                              onChange={(e) => onUpdateExpense(item.itemType, item.id, 'cost', formatNumberWithCommas(e.target.value))}
                              className="w-12 md:w-16 bg-transparent outline-none text-[9px] md:text-[10px] font-bold text-right px-0.5 text-black dark:text-white"
                            />
                            <select
                              value={item.currency}
                              onChange={(e) => onUpdateExpense(item.itemType, item.id, 'currency', e.target.value)}
                              className="bg-transparent outline-none text-[8px] md:text-[9px] font-bold text-black/60 dark:text-white/60 pl-0.5 cursor-pointer"
                            >
                              <option value="KRW">₩</option>
                              <option value="USD">$</option>
                              <option value="JPY">¥</option>
                              <option value="EUR">€</option>
                              <option value="CNY">¥</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[9px] md:text-[10px]">{CURRENCY_SYMBOLS[item.currency] || item.currency}{item.cost}</span>
                        )}
                      </td>
                      {/* PAY(₩) */}
                      <td className="py-2 px-1.5 text-right font-mono font-black text-black dark:text-white whitespace-nowrap text-[9px] md:text-[10px]">
                        ₩{krwAmount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Split Balance Breakdown (정산 결과 및 송금) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Member Balances Status */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-4 shadow-sm flex flex-col gap-3">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55 border-b border-black/5 dark:border-white/5 pb-2">
            👤 개인별 지출 현황
          </span>
          <div className="flex flex-col gap-2.5">
            {members.map(name => {
              const paid = memberPaidStats[name] || 0;
              const balance = memberBalances[name] || 0;
              return (
                <div key={name} className="flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold">{name}</span>
                    <span className="text-[10px] text-black/40 dark:text-white/40 whitespace-nowrap">
                      결제: ₩{paid.toLocaleString()}
                    </span>
                  </div>
                  <span className={`font-mono font-black text-sm whitespace-nowrap ${
                    balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : balance < 0 ? 'text-red-500 dark:text-red-400' : ''
                  }`}>
                    {balance > 0 ? `+₩${balance.toLocaleString()}` : balance < 0 ? `-₩${Math.abs(balance).toLocaleString()}` : '₩0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer Suggestions */}
        <div className="bg-[#10b981]/5 border border-[#10b981]/20 p-4 shadow-sm flex flex-col gap-3">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 border-b border-[#10b981]/10 pb-2 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-600" /> 💸 추천 송금 (정산 가이드)
          </span>
          {transfers.length === 0 ? (
            <div className="text-center py-6 text-xs text-black/40 dark:text-white/40 font-bold">
              송금할 내역이 없습니다. 정산 완료!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {transfers.map((tr, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between bg-white dark:bg-[#1a1a1a] border border-black/5 dark:border-white/5 px-3 py-2.5 text-xs rounded-sm shadow-sm"
                >
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-red-500 dark:text-red-400">{tr.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                    <span className="text-emerald-600 dark:text-emerald-400">{tr.to}</span>
                  </div>
                  <span className="font-mono font-black text-black dark:text-white whitespace-nowrap">
                    ₩{tr.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
