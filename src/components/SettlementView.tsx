import React, { useState, useRef } from 'react';
import { 
  UserPlus, Coins, ArrowRight, AlertCircle, Plus, Trash2,
  ChevronRight, ChevronDown, Paperclip, Loader2, X, ExternalLink
} from 'lucide-react';
import { Trip, TimelineItem, FlightItem, StayItem, TransitItem, TabType, CustomExpenseItem } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';

const EXCHANGE_RATES: { [currency: string]: number } = {
  KRW: 1,
  USD: 1380,
  JPY: 9.0,
  EUR: 1480,
  CNY: 190,
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  KRW: '₩', USD: '$', JPY: '¥', EUR: '€', CNY: '¥',
};

const TYPE_CODES: { [key: string]: string } = {
  timeline: 'L', flight: 'F', stay: 'S', transit: 'T', custom: '+'
};

const TYPE_COLORS: { [key: string]: string } = {
  timeline: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  flight: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  stay: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  transit: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  custom: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
};

const formatNumberWithCommas = (val: string): string => {
  const clean = val.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) return clean;
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const compactDate = (dateStr: string): string => {
  if (!dateStr || dateStr.includes('일정')) return dateStr;
  const normalized = dateStr.replace(/-/g, '.');
  const parts = normalized.split('.');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
};

const isPdf = (url: string) => url?.toLowerCase().includes('.pdf') || url?.toLowerCase().includes('application%2Fpdf');

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
  onUpdateCustomExpenses?: (items: CustomExpenseItem[]) => void;
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
  onUpdateCustomExpenses,
}: SettlementViewProps) {
  const members = trip.members && trip.members.length > 0 ? trip.members : ['나'];
  const customExpenses: CustomExpenseItem[] = trip.customExpenses || [];

  const [newMemberName, setNewMemberName] = useState('');
  // Two-tap navigation state: first click activates, second jumps
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  // Accordion expand for attachments
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  // Custom expense add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', date: '', cost: '', currency: defaultCurrency, paidBy: '' });
  // File upload state
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadKey, setActiveUploadKey] = useState<string | null>(null);
  // Lightbox for attachments
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // --- Collect all expense items ---
  const expenseItems = React.useMemo(() => {
    const list: Array<{
      id: number | string;
      name: string;
      itemType: 'timeline' | 'flight' | 'stay' | 'transit' | 'custom';
      date: string;
      cost: string;
      currency: string;
      paidBy: string;
      rawItem: any;
    }> = [];

    Object.entries(timelineData).forEach(([date, items]) => {
      (items || []).forEach(item => {
        if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
          list.push({ id: item.id, name: item.place || '일정 지출', itemType: 'timeline', date, cost: item.cost, currency: item.currency || defaultCurrency, paidBy: item.paidBy || '나', rawItem: item });
        }
      });
    });

    flights.forEach(item => {
      if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
        list.push({ id: item.id, name: `${item.title || '항공권'} ${item.fromCode}→${item.toCode}`, itemType: 'flight', date: item.date || '항공일정', cost: item.cost, currency: item.currency || defaultCurrency, paidBy: item.paidBy || '나', rawItem: item });
      }
    });

    stays.forEach(item => {
      if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
        const checkInDate = item.dateRange.split('-')[0].trim();
        list.push({ id: item.id, name: item.title || '숙소 예약', itemType: 'stay', date: checkInDate || '숙소일정', cost: item.cost, currency: item.currency || defaultCurrency, paidBy: item.paidBy || '나', rawItem: item });
      }
    });

    transits.forEach(item => {
      if (item.cost && item.cost !== '-' && item.cost.trim() !== '') {
        list.push({ id: item.id, name: `${item.ticketType || '이동수단'} ${item.title || item.route}`, itemType: 'transit', date: item.date || '이동일정', cost: item.cost, currency: item.currency || defaultCurrency, paidBy: item.paidBy || '나', rawItem: item });
      }
    });

    // Custom expense items
    customExpenses.forEach(item => {
      list.push({ id: item.id, name: item.name || '기타 지출', itemType: 'custom', date: item.date, cost: item.cost, currency: item.currency || defaultCurrency, paidBy: item.paidBy || '나', rawItem: item });
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineData, flights, stays, transits, defaultCurrency, customExpenses]);

  // --- KRW conversion ---
  const parseCostToKRW = (costStr: string, currency: string): number => {
    const clean = costStr.replace(/[^0-9.]/g, '');
    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    return Math.round(val * (EXCHANGE_RATES[currency.toUpperCase()] || 1));
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

  const sharePerPerson = Math.round(totalExpenseKRW / Math.max(1, members.length));

  const memberBalances = React.useMemo(() => {
    const balances: { [name: string]: number } = {};
    members.forEach(m => { balances[m] = (memberPaidStats[m] || 0) - sharePerPerson; });
    return balances;
  }, [members, memberPaidStats, sharePerPerson]);

  const transfers = React.useMemo(() => {
    const debtors = Object.entries(memberBalances).filter(([_, b]) => b < 0).map(([name, bal]) => ({ name, amount: -bal }));
    const creditors = Object.entries(memberBalances).filter(([_, b]) => b > 0).map(([name, bal]) => ({ name, amount: bal }));
    const result: Array<{ from: string; to: string; amount: number }> = [];
    let dIdx = 0, cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const d = debtors[dIdx], c = creditors[cIdx];
      const amt = Math.min(d.amount, c.amount);
      if (amt > 0.5) result.push({ from: d.name, to: c.name, amount: Math.round(amt) });
      d.amount -= amt; c.amount -= amt;
      if (d.amount < 0.1) dIdx++;
      if (c.amount < 0.1) cIdx++;
    }
    return result;
  }, [memberBalances]);

  // --- Member management ---
  const handleAddMember = () => {
    const n = newMemberName.trim();
    if (!n) return;
    if (members.includes(n)) { alert("이미 등록된 인원입니다."); return; }
    onUpdateMembers([...members, n]);
    setNewMemberName('');
  };
  const handleRemoveMember = (name: string) => {
    if (members.length <= 1) { alert("최소 한 명의 인원은 여정에 설정되어 있어야 합니다."); return; }
    if (window.confirm(`정말 '${name}' 인원을 삭제하시겠습니까?`)) {
      onUpdateMembers(members.filter(m => m !== name));
    }
  };

  // --- Navigation (two-tap) ---
  const handleRowClick = (rowKey: string, item: typeof expenseItems[0]) => {
    if (item.itemType === 'custom') {
      // Custom items have no jump target, just toggle select
      setSelectedRowKey(prev => prev === rowKey ? null : rowKey);
      return;
    }
    if (selectedRowKey === rowKey) {
      // Second tap → navigate
      let mappedTab: TabType = 'timeline';
      if (item.itemType === 'flight') mappedTab = 'flights';
      else if (item.itemType === 'stay') mappedTab = 'stays';
      else if (item.itemType === 'transit') mappedTab = 'transit';
      onJumpToItem(mappedTab, item.id as number, item.itemType === 'timeline' ? item.date : undefined);
      setSelectedRowKey(null);
    } else {
      // First tap → activate
      setSelectedRowKey(rowKey);
    }
  };

  // --- Custom expenses CRUD ---
  const handleAddCustom = () => {
    if (!newItem.name.trim() || !newItem.cost.trim()) { alert("항목명과 금액을 입력해 주세요."); return; }
    const item: CustomExpenseItem = {
      id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: newItem.name.trim(),
      date: newItem.date || '',
      cost: formatNumberWithCommas(newItem.cost),
      currency: newItem.currency || defaultCurrency,
      paidBy: newItem.paidBy || (members[0] || '나'),
      attachments: [],
    };
    onUpdateCustomExpenses?.([...customExpenses, item]);
    setNewItem({ name: '', date: '', cost: '', currency: defaultCurrency, paidBy: '' });
    setShowAddForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    if (window.confirm('이 항목을 삭제하시겠습니까?')) {
      onUpdateCustomExpenses?.(customExpenses.filter(c => c.id !== id));
    }
  };

  // --- Attachment upload ---
  const handleAttachmentUpload = async (customId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const user = auth.currentUser;
    if (!user) { alert("로그인이 필요합니다."); return; }
    setUploadingKey(customId);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const storagePath = `users/public/settlements/${trip.id}/${customId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      const updated = customExpenses.map(c => {
        if (c.id === customId) {
          return { ...c, attachments: [...(c.attachments || []), ...urls] };
        }
        return c;
      });
      onUpdateCustomExpenses?.(updated);
    } catch (e) {
      console.error('Attachment upload failed:', e);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setUploadingKey(null);
      setActiveUploadKey(null);
    }
  };

  const handleDeleteAttachment = (customId: string, url: string) => {
    const updated = customExpenses.map(c => {
      if (c.id === customId) {
        return { ...c, attachments: (c.attachments || []).filter(a => a !== url) };
      }
      return c;
    });
    onUpdateCustomExpenses?.(updated);
  };

  return (
    <div className="p-3 md:p-5 flex flex-col gap-5 text-left text-black dark:text-white max-w-4xl mx-auto w-full animate-in fade-in duration-300">

      {/* Lightbox for attachments */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setLightboxUrl(null)}>
            <X className="w-6 h-6" />
          </button>
          {isPdf(lightboxUrl) ? (
            <iframe src={lightboxUrl} className="w-full max-w-3xl h-[80vh] bg-white" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightboxUrl} className="max-w-full max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}

      {/* 1. Member Settings Panel */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55">
            👥 여정 참석 인원 ({members.length}명)
          </span>
          {isEditing && <span className="text-[9px] text-orange-500 font-bold uppercase">편집 중</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <span key={m} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold rounded-sm">
              {m}
              {isEditing && (
                <button onClick={() => handleRemoveMember(m)} className="text-red-500 hover:text-red-700 transition-colors" title="인원 삭제">✕</button>
              )}
            </span>
          ))}
        </div>
        {isEditing && (
          <div className="flex gap-2 mt-2">
            <input type="text" placeholder="참석자 이름 입력..." value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
              className="bg-[#EAE8E3] dark:bg-white/10 px-2.5 py-1 outline-none text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-44"
              onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
            />
            <button onClick={handleAddMember} className="bg-black text-white dark:bg-white dark:text-black px-3.5 py-1 text-xs font-black uppercase tracking-widest rounded-sm hover:opacity-85 transition-opacity flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> 추가
            </button>
          </div>
        )}
      </div>

      {/* 2. Total Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/20 p-4 flex flex-col justify-center">
          <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 block mb-1">총 지출 (Total)</span>
          <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">₩{totalExpenseKRW.toLocaleString()}</span>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-4 flex flex-col justify-center">
          <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-black/45 dark:text-white/45 block mb-1">1인당 ({members.length}명 균등)</span>
          <span className="text-lg md:text-xl font-black whitespace-nowrap">₩{sharePerPerson.toLocaleString()}</span>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 p-3 flex flex-col justify-center text-[10px] leading-relaxed text-black/50 dark:text-white/50">
          <span className="font-bold text-black/70 dark:text-white/70 uppercase text-[8px] tracking-wider mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-orange-500" /> 환율 기준
          </span>
          <div className="text-[9px]">USD 1,380 · JPY 9.0 · EUR 1,480 · CNY 190 (₩)</div>
          <div className="text-[8px] opacity-60 mt-0.5">※ 여정 기간 기준 일괄 적용</div>
        </div>
      </div>

      {/* 3. Expense Ledger */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="py-2 px-3 bg-black/3 dark:bg-white/3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55">
            📋 결제 기록 ({expenseItems.length}건)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-black/30 dark:text-white/30 font-bold uppercase hidden sm:block">1번 클릭:활성 · 2번 클릭:이동</span>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:opacity-85 transition-opacity"
            >
              <Plus className="w-3 h-3" /> 직접 추가
            </button>
          </div>
        </div>

        {/* Add custom expense form */}
        {showAddForm && (
          <div className="px-3 py-3 border-b border-black/10 dark:border-white/10 bg-emerald-500/5 flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">날짜</label>
              <input type="date" value={newItem.date.replace(/\./g, '-')}
                onChange={e => setNewItem(v => ({ ...v, date: e.target.value.replace(/-/g, '.') }))}
                className="bg-white dark:bg-[#222] border border-black/10 dark:border-white/10 px-1.5 py-1 text-[10px] font-bold text-black dark:text-white outline-none rounded-sm"
              />
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-[100px]">
              <label className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">항목명</label>
              <input type="text" placeholder="항목명 입력" value={newItem.name}
                onChange={e => setNewItem(v => ({ ...v, name: e.target.value }))}
                className="bg-white dark:bg-[#222] border border-black/10 dark:border-white/10 px-1.5 py-1 text-[10px] font-bold text-black dark:text-white outline-none rounded-sm w-full"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">금액</label>
              <div className="flex items-center border border-black/10 dark:border-white/10 bg-white dark:bg-[#222] rounded-sm overflow-hidden">
                <input type="text" placeholder="0" value={newItem.cost}
                  onChange={e => setNewItem(v => ({ ...v, cost: formatNumberWithCommas(e.target.value) }))}
                  className="bg-transparent px-1.5 py-1 text-[10px] font-bold text-black dark:text-white outline-none w-20"
                />
                <select value={newItem.currency} onChange={e => setNewItem(v => ({ ...v, currency: e.target.value }))}
                  className="bg-transparent border-l border-black/10 dark:border-white/10 px-1 py-1 text-[9px] font-bold text-black/60 dark:text-white/60 outline-none cursor-pointer">
                  <option value="KRW">₩</option>
                  <option value="USD">$</option>
                  <option value="JPY">¥</option>
                  <option value="EUR">€</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">결제자</label>
              <select value={newItem.paidBy} onChange={e => setNewItem(v => ({ ...v, paidBy: e.target.value }))}
                className="bg-white dark:bg-[#222] border border-black/10 dark:border-white/10 px-1.5 py-1 text-[10px] font-bold text-black dark:text-white outline-none rounded-sm cursor-pointer">
                <option value="">USER</option>
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              <button onClick={handleAddCustom}
                className="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:opacity-85 transition-opacity">
                추가
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 border border-black/20 dark:border-white/20 text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black/60 dark:text-white/60">
                취소
              </button>
            </div>
          </div>
        )}

        {expenseItems.length === 0 ? (
          <div className="text-center py-12 text-xs md:text-sm font-bold text-black/40 dark:text-white/40 uppercase">
            지출 내역이 없습니다. (각 카드에 금액을 등록하거나 직접 추가해 주세요)
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
                  <th className="py-2 px-1.5 text-center whitespace-nowrap">📎</th>
                </tr>
              </thead>
              <tbody>
                {expenseItems.map((item, idx) => {
                  const rowKey = `${item.itemType}-${item.id}-${idx}`;
                  const isSelected = selectedRowKey === rowKey;
                  const isExpanded = expandedRowKey === rowKey;
                  const krwAmount = parseCostToKRW(item.cost, item.currency);
                  const customItem = item.itemType === 'custom' ? (item.rawItem as CustomExpenseItem) : null;
                  const attachments = customItem?.attachments || [];

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        className={`border-b border-black/5 dark:border-white/5 transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/8 dark:bg-emerald-400/8'
                            : 'hover:bg-black/3 dark:hover:bg-white/3'
                        }`}
                      >
                        {/* DAY */}
                        <td
                          className="py-2 px-1.5 font-bold text-black/50 dark:text-white/50 whitespace-nowrap text-[9px] cursor-pointer"
                          onClick={() => handleRowClick(rowKey, item)}
                        >
                          {compactDate(item.date)}
                        </td>
                        {/* ITEM */}
                        <td
                          className="py-2 px-1.5 max-w-[90px] md:max-w-[140px] cursor-pointer"
                          onClick={() => handleRowClick(rowKey, item)}
                        >
                          <div className="font-bold flex items-center gap-1 min-w-0">
                            <span className={`text-[7px] md:text-[8px] font-black px-1 py-0.5 rounded-sm shrink-0 ${TYPE_COLORS[item.itemType] || ''}`}>
                              {TYPE_CODES[item.itemType] || '?'}
                            </span>
                            <span className={`truncate text-[9px] md:text-[10px] transition-colors ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : ''}`} title={item.name}>
                              {item.name}
                            </span>
                            {/* Navigation arrow shown only when selected and item has a target */}
                            {isSelected && item.itemType !== 'custom' && (
                              <ChevronRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-pulse" />
                            )}
                            {/* Delete button for custom items */}
                            {item.itemType === 'custom' && (
                              <button
                                onClick={e => { e.stopPropagation(); handleDeleteCustom(item.id as string); }}
                                className="ml-1 text-red-400 hover:text-red-600 transition-colors shrink-0"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        {/* USER */}
                        <td className="py-2 px-1.5 whitespace-nowrap" onClick={() => handleRowClick(rowKey, item)}>
                          {isEditing && onUpdateExpense && item.itemType !== 'custom' ? (
                            <select
                              value={item.paidBy}
                              onChange={e => { e.stopPropagation(); onUpdateExpense(item.itemType as any, item.id as number, 'paidBy', e.target.value); }}
                              onClick={e => e.stopPropagation()}
                              className="bg-transparent border border-black/10 dark:border-white/10 px-1 py-0.5 text-[9px] font-bold text-black dark:text-white rounded-sm cursor-pointer outline-none bg-white dark:bg-[#222] max-w-[60px]"
                            >
                              <option value="">USER</option>
                              {members.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">{item.paidBy || '-'}</span>
                          )}
                        </td>
                        {/* PAY */}
                        <td className="py-2 px-1.5 text-right font-mono font-bold whitespace-nowrap cursor-pointer" onClick={() => handleRowClick(rowKey, item)}>
                          {isEditing && onUpdateExpense && item.itemType !== 'custom' ? (
                            <div className="inline-flex items-center border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 p-0.5 rounded-sm" onClick={e => e.stopPropagation()}>
                              <input
                                type="text" value={item.cost}
                                onChange={e => onUpdateExpense(item.itemType as any, item.id as number, 'cost', formatNumberWithCommas(e.target.value))}
                                className="w-12 md:w-16 bg-transparent outline-none text-[9px] md:text-[10px] font-bold text-right px-0.5 text-black dark:text-white"
                              />
                              <select value={item.currency}
                                onChange={e => onUpdateExpense(item.itemType as any, item.id as number, 'currency', e.target.value)}
                                className="bg-transparent outline-none text-[8px] md:text-[9px] font-bold text-black/60 dark:text-white/60 pl-0.5 cursor-pointer">
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
                        <td className="py-2 px-1.5 text-right font-mono font-black text-black dark:text-white whitespace-nowrap text-[9px] md:text-[10px] cursor-pointer" onClick={() => handleRowClick(rowKey, item)}>
                          ₩{krwAmount.toLocaleString()}
                        </td>
                        {/* Accordion toggle (attachment) */}
                        <td className="py-2 px-1.5 text-center">
                          {item.itemType === 'custom' && (
                            <button
                              onClick={e => { e.stopPropagation(); setExpandedRowKey(prev => prev === rowKey ? null : rowKey); }}
                              className={`p-1 rounded transition-colors ${isExpanded ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white'}`}
                              title="첨부파일 보기"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Accordion: Attachments for custom items */}
                      {isExpanded && customItem && (
                        <tr className="border-b border-black/5 dark:border-white/5">
                          <td colSpan={6} className="px-3 py-3 bg-black/2 dark:bg-white/2">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" /> 첨부파일 (영수증 / 예약확인서)
                                </span>
                                {/* Upload button */}
                                <div>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={e => { if (activeUploadKey) handleAttachmentUpload(activeUploadKey, e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                  />
                                  <button
                                    onClick={() => { setActiveUploadKey(customItem.id); fileInputRef.current?.click(); }}
                                    disabled={uploadingKey === customItem.id}
                                    className="flex items-center gap-1 px-2 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                                  >
                                    {uploadingKey === customItem.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Plus className="w-3 h-3" />
                                    )}
                                    파일 추가
                                  </button>
                                </div>
                              </div>

                              {/* Attachment thumbnails */}
                              {attachments.length === 0 ? (
                                <div className="text-[9px] text-black/30 dark:text-white/30 italic py-2">
                                  첨부된 파일이 없습니다.
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {attachments.map((url, aIdx) => (
                                    <div key={aIdx} className="relative group">
                                      {isPdf(url) ? (
                                        <button
                                          onClick={() => setLightboxUrl(url)}
                                          className="w-16 h-16 md:w-20 md:h-20 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center justify-center text-red-500 dark:text-red-400 hover:opacity-80 transition-opacity rounded-sm"
                                        >
                                          <ExternalLink className="w-5 h-5 mb-1" />
                                          <span className="text-[8px] font-bold">PDF</span>
                                        </button>
                                      ) : (
                                        <button onClick={() => setLightboxUrl(url)} className="w-16 h-16 md:w-20 md:h-20 rounded-sm overflow-hidden border border-black/10 dark:border-white/10 hover:opacity-80 transition-opacity">
                                          <img src={url} alt={`attachment-${aIdx}`} className="w-full h-full object-cover" />
                                        </button>
                                      )}
                                      {/* Delete button on hover */}
                                      <button
                                        onClick={() => handleDeleteAttachment(customItem.id, url)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px]"
                                        title="첨부파일 삭제"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Split Balance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    <span className="text-[10px] text-black/40 dark:text-white/40 whitespace-nowrap">결제: ₩{paid.toLocaleString()}</span>
                  </div>
                  <span className={`font-mono font-black text-sm whitespace-nowrap ${balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : balance < 0 ? 'text-red-500 dark:text-red-400' : ''}`}>
                    {balance > 0 ? `+₩${balance.toLocaleString()}` : balance < 0 ? `-₩${Math.abs(balance).toLocaleString()}` : '₩0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#10b981]/5 border border-[#10b981]/20 p-4 shadow-sm flex flex-col gap-3">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 border-b border-[#10b981]/10 pb-2 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-600" /> 💸 추천 송금 (정산 가이드)
          </span>
          {transfers.length === 0 ? (
            <div className="text-center py-6 text-xs text-black/40 dark:text-white/40 font-bold">송금할 내역이 없습니다. 정산 완료!</div>
          ) : (
            <div className="flex flex-col gap-3">
              {transfers.map((tr, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white dark:bg-[#1a1a1a] border border-black/5 dark:border-white/5 px-3 py-2.5 text-xs rounded-sm shadow-sm">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-red-500 dark:text-red-400">{tr.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                    <span className="text-emerald-600 dark:text-emerald-400">{tr.to}</span>
                  </div>
                  <span className="font-mono font-black text-black dark:text-white whitespace-nowrap">₩{tr.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
