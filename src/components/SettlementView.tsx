import React, { useState } from 'react';
import { 
  UserPlus, Trash2, Coins, ArrowRight, Calculator, AlertCircle, ChevronRight 
} from 'lucide-react';
import { Trip, TimelineItem, FlightItem, StayItem, TransitItem, TabType } from '../types';

const EXCHANGE_RATES: { [currency: string]: number } = {
  KRW: 1,
  USD: 1380, // 1 USD = 1380 KRW
  JPY: 9.0,  // 1 JPY = 9.0 KRW
  EUR: 1480, // 1 EUR = 1480 KRW
  CNY: 190,  // 1 CNY = 190 KRW
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
}: SettlementViewProps) {
  const members = trip.members && trip.members.length > 0 ? trip.members : ['나'];
  const [newMemberName, setNewMemberName] = useState('');

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
            currency: item.currency || 'KRW',
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
          name: `${item.title || '항공권'} (${item.fromCode} → ${item.toCode})`,
          itemType: 'flight',
          date: item.date || '항공일정',
          cost: item.cost,
          currency: item.currency || 'KRW',
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
          currency: item.currency || 'KRW',
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
          name: `${item.ticketType || '이동수단'} (${item.title || item.route})`,
          itemType: 'transit',
          date: item.date || '이동일정',
          cost: item.cost,
          currency: item.currency || 'KRW',
          paidBy: item.paidBy || '나',
          rawItem: item,
        });
      }
    });

    // Sort by date chronologically
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineData, flights, stays, transits]);

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

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 text-left text-black dark:text-white max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Cost card */}
        <div className="bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/20 p-4 flex flex-col justify-center">
          <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 block mb-1">
            Total Trip Expense (총 지출)
          </span>
          <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₩ {totalExpenseKRW.toLocaleString()}
          </span>
        </div>

        {/* Member Count & Share card */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-4 flex flex-col justify-center">
          <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-black/45 dark:text-white/45 block mb-1">
            Individual Share (1인당 정산 금액)
          </span>
          <span className="text-lg md:text-xl font-black">
            ₩ {sharePerPerson.toLocaleString()}
          </span>
          <span className="text-[9px] opacity-40">({members.length}명 균등 배분)</span>
        </div>

        {/* Rates Guide card */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-3 flex flex-col justify-center text-[10px] leading-relaxed text-black/50 dark:text-white/50">
          <span className="font-bold text-black/70 dark:text-white/70 uppercase text-[8px] tracking-wider mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-orange-500" /> 환율 기준 (KRW 환산용)
          </span>
          <div>1 USD = 1,380 원</div>
          <div>100 JPY = 900 원 (1 JPY = 9.0원)</div>
          <div>1 EUR = 1,480 원</div>
          <div>1 CNY = 190 원</div>
        </div>
      </div>

      {/* 3. Expense Ledger (정산 기록표) */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="py-2.5 px-4 bg-black/3 dark:bg-white/3 border-b border-black/10 dark:border-white/10">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55">
            📋 날짜별 결제 항목 리스트
          </span>
        </div>

        {expenseItems.length === 0 ? (
          <div className="text-center py-12 text-xs md:text-sm font-bold text-black/40 dark:text-white/40 uppercase">
            지출 내역이 없습니다. (각 카드에 금액을 등록해 주세요)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 uppercase text-[8px] md:text-[9px] font-black tracking-widest text-black/50 dark:text-white/50">
                  <th className="py-3 px-4">날짜</th>
                  <th className="py-3 px-4">항목명 / 분류</th>
                  <th className="py-3 px-4">결제자</th>
                  <th className="py-3 px-4 text-right">등록 금액</th>
                  <th className="py-3 px-4 text-right">원화 환산</th>
                  <th className="py-3 px-4 text-center">이동</th>
                </tr>
              </thead>
              <tbody>
                {expenseItems.map((item, idx) => {
                  const krwAmount = parseCostToKRW(item.cost, item.currency);
                  return (
                    <tr 
                      key={`${item.itemType}-${item.id}-${idx}`}
                      className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/3 dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-black/60 dark:text-white/60">
                        {item.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold flex items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-wider bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded-sm">
                            {item.itemType}
                          </span>
                          <span className="truncate max-w-[200px] md:max-w-xs">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {item.paidBy}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {item.cost} {item.currency}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-black dark:text-white">
                        ₩ {krwAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            let mappedTab: TabType = 'timeline';
                            if (item.itemType === 'flight') mappedTab = 'flights';
                            else if (item.itemType === 'stay') mappedTab = 'stays';
                            else if (item.itemType === 'transit') mappedTab = 'transit';
                            onJumpToItem(mappedTab, item.id, item.itemType === 'timeline' ? item.date : undefined);
                          }}
                          className="p-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded hover:bg-black/5 dark:hover:bg-white/5"
                          title="해당 카드로 이동"
                        >
                          <ChevronRight className="w-4 h-4 mx-auto" />
                        </button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Member Balances Status */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-4 shadow-sm flex flex-col gap-3">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55 border-b border-black/5 dark:border-white/5 pb-2">
            👤 개인별 지출 및 정산 현황
          </span>
          <div className="flex flex-col gap-2.5">
            {members.map(name => {
              const paid = memberPaidStats[name] || 0;
              const balance = memberBalances[name] || 0;
              return (
                <div key={name} className="flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold">{name}</span>
                    <span className="text-[10px] text-black/40 dark:text-white/40">
                      총 결제: ₩ {paid.toLocaleString()}
                    </span>
                  </div>
                  <span className={`font-mono font-black text-sm ${
                    balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : balance < 0 ? 'text-red-500 dark:text-red-400' : ''
                  }`}>
                    {balance > 0 ? `+ ₩ ${balance.toLocaleString()}` : balance < 0 ? `- ₩ ${Math.abs(balance).toLocaleString()}` : '₩ 0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer Suggestions */}
        <div className="bg-[#10b981]/5 border border-[#10b981]/20 p-4 shadow-sm flex flex-col gap-3">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 border-b border-[#10b981]/10 pb-2 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-600" /> 💸 추천 송금 방법 (정산 가이드)
          </span>
          {transfers.length === 0 ? (
            <div className="text-center py-6 text-xs text-black/40 dark:text-white/40 font-bold">
              송금할 내역이 없습니다. 정산이 완벽히 끝났습니다!
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
                  <span className="font-mono font-black text-black dark:text-white">
                    ₩ {tr.amount.toLocaleString()}
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
