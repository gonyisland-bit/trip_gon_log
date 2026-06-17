import React, { useState, useEffect, useMemo } from 'react';
import { Plus, GripVertical, ChevronDown } from 'lucide-react';
import { Plan } from '../types';
import { JourneyCardMenu } from './Home';

interface PlanHubPageProps {
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddPlan: () => void;
  handleMoveToArchive: (plan: Plan) => void;
  isLoggedIn: boolean;
  onDeletePlan: (id: number) => Promise<void>;
  onEditPlan?: (id: number) => void;
  onClonePlan?: (id: number) => void;
  onReorderPlans?: (orderedIds: number[]) => void;
  initialTagFilter?: string | null;
}

function getTripStartDate(dateRangeStr: string): Date {
  if (!dateRangeStr) return new Date(0);
  const parts = dateRangeStr.split(' - ');
  const startStr = parts[0].trim().replace(/\./g, '-');
  const d = new Date(startStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// Helper to extract year and English short month for magazine styling
function getYearAndMonth(dateRangeStr: string): { year: string; month: string } {
  if (!dateRangeStr) return { year: '', month: '' };
  const parts = dateRangeStr.split(/\s*[-—–]\s*/);
  const cleanFirst = parts[0]?.trim();
  if (cleanFirst) {
    const dots = cleanFirst.split('.');
    if (dots.length >= 2) {
      const year = dots[0];
      const monthNum = parseInt(dots[1], 10);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[monthNum - 1] || dots[1];
      return { year, month };
    }
  }
  return { year: '', month: '' };
}

export function PlanHubPage({
  plans,
  onNavigate,
  onAddPlan,
  handleMoveToArchive,
  isLoggedIn,
  onDeletePlan,
  onEditPlan,
  onClonePlan,
  onReorderPlans,
  initialTagFilter,
}: PlanHubPageProps) {
  const [activeFilter, setActiveFilter] = useState(initialTagFilter || 'All');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'user' | 'date' | 'place'>('user');
  const [draggedPlanId, setDraggedPlanId] = useState<number | null>(null);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  useEffect(() => {
    setLocalPlans(plans);
  }, [plans]);

  useEffect(() => {
    if (initialTagFilter) {
      setActiveFilter(initialTagFilter);
    }
  }, [initialTagFilter]);

  const filters = useMemo(() => {
    const uniqueTags = new Set<string>();
    localPlans.forEach(p => {
      if (p.tags) {
        p.tags.forEach(tag => {
          if (tag) uniqueTags.add(tag);
        });
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [localPlans]);

  const sortedPlans = useMemo(() => {
    if (sortBy === 'date') {
      return [...localPlans].sort((a, b) => {
        // Chronological: earliest (closest) first for upcoming plans
        return getTripStartDate(a.date).getTime() - getTripStartDate(b.date).getTime();
      });
    }
    if (sortBy === 'place') {
      return [...localPlans].sort((a, b) => {
        const locA = a.locationStr || '';
        const locB = b.locationStr || '';
        return locA.localeCompare(locB);
      });
    }
    return localPlans;
  }, [localPlans, sortBy]);

  const filteredPlans = activeFilter === 'All' ? sortedPlans : sortedPlans.filter(p => p.tags.includes(activeFilter));

  const handlePlanDragStart = (e: React.DragEvent, id: number) => {
    if (sortBy !== 'user') return;
    setDraggedPlanId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePlanDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (sortBy !== 'user' || draggedPlanId === null || draggedPlanId === id) return;
    setLocalPlans(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(p => p.id === draggedPlanId);
      const toIdx = arr.findIndex(p => p.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  const handlePlanDrop = () => {
    setDraggedPlanId(null);
    if (sortBy === 'user' && onReorderPlans) {
      onReorderPlans(localPlans.map(p => p.id));
    }
  };

  return (
    <main onClick={() => setActiveCardId(null)} className="animate-in fade-in duration-500 min-h-screen w-full">
      <div className="p-6 md:px-12 md:py-12 border-b border-black/20 dark:border-white/20 bg-[#EAE8E3]/30 dark:bg-[#1a1a1a]/30 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase mb-2 sm:mb-3 break-keep" style={{ wordBreak: 'keep-all' }}>Upcoming Plans</h1>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed opacity-70 break-keep">비행기 티켓, 숙소 예약, 동선 계획. 다음 여행을 완벽하게 준비하기 위한 캔버스입니다.</p>
          
          {/* Active Filter and Sorting Layout */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            {/* Tag Filter Dropdown */}
            <div className="relative inline-block text-left z-20">
              <button 
                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                className="text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest border border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-transparent text-black dark:text-white transition-colors flex items-center gap-1.5 rounded-sm"
              >
                <span>Tag Filter: {activeFilter}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTagDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-xl z-20 max-h-60 overflow-y-auto rounded-sm py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {filters.map(f => (
                      <button
                        key={f}
                        onClick={() => {
                          setActiveFilter(f);
                          setIsTagDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors ${
                          activeFilter === f 
                            ? 'bg-black text-white dark:bg-white dark:text-black' 
                            : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-widest text-black/40 dark:text-white/40">정렬 기준:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest border border-black/20 dark:border-white/20 px-3 py-1.5 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              >
                <option value="user" className="bg-[#F9F8F6] dark:bg-[#111111]">사용자 순서</option>
                <option value="date" className="bg-[#F9F8F6] dark:bg-[#111111]">시간별 순서</option>
                <option value="place" className="bg-[#F9F8F6] dark:bg-[#111111]">장소별 순서</option>
              </select>
            </div>
          </div>
        </div>
        {isLoggedIn && (
          <button onClick={onAddPlan} className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 w-auto">
            <Plus className="w-3.5 h-3.5" /> New Plan
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6 md:p-12 w-full">
        {filteredPlans.map((plan) => {
          const { year, month } = getYearAndMonth(plan.date);
          return (
            <div
              key={plan.id}
              style={{ containerType: 'inline-size' }}
              className={`group cursor-pointer aspect-[3/4] w-full overflow-hidden transition-all border relative shadow-[0_0_15px_rgba(239,68,68,0.08)] ${
                draggedPlanId === plan.id ? 'opacity-40' : 'opacity-100'
              } ${
                activeCardId === plan.id
                  ? 'border-red-600 dark:border-red-400 ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                  : 'border-red-600/50 dark:border-red-400/50 bg-[#111]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (activeCardId === plan.id) {
                  onNavigate('detail', plan.id);
                } else {
                  setActiveCardId(plan.id);
                }
              }}
              draggable={isLoggedIn && sortBy === 'user'}
              onDragStart={(e) => handlePlanDragStart(e, plan.id)}
              onDragOver={(e) => handlePlanDragOver(e, plan.id)}
              onDrop={handlePlanDrop}
              onDragEnd={() => setDraggedPlanId(null)}
            >
              {/* Background cover image */}
              <img
                src={plan.img}
                alt={plan.title}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
                  activeCardId === plan.id ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
                }`}
              />

              {/* Magazine Overlay Gradient */}
              <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

              {/* Magazine Cover Text Layout */}
              <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                {/* Top Header Row: Title & Issue Date */}
                <div className="flex justify-between items-start gap-3 w-full">
                  <h3
                    className="text-[5.5cqw] font-black uppercase tracking-tight leading-none font-serif text-white drop-shadow-md max-w-[70%] line-clamp-2"
                    style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
                  >
                    {plan.title}
                  </h3>
                  {month && year && (
                    <div className="flex flex-col items-end shrink-0 text-right leading-none font-mono">
                      <span className="text-[3.8cqw] font-black tracking-widest text-amber-500 uppercase">{month}</span>
                      <span className="text-[2.8cqw] font-bold tracking-widest text-white/60 mt-0.5">{year}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Row: Date & Status */}
                <div className="mt-auto flex flex-col gap-1.5">
                  {plan.tags && plan.tags.filter(t => t !== 'Plan' && t !== 'Archived').length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {plan.tags.filter(t => t !== 'Plan' && t !== 'Archived').slice(0, 2).map(tag => (
                        <span key={tag} className="text-[2.6cqw] uppercase font-bold tracking-widest bg-white/10 px-1.5 py-0.5 rounded-sm text-white/95">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[3cqw] tracking-widest text-white/70 font-mono truncate uppercase">{plan.date}</div>
                    <div className="text-[2.6cqw] tracking-[0.2em] font-black text-amber-500/95 uppercase">UPCOMING PLAN</div>
                  </div>
                </div>
              </div>

              {/* Hamburger menu */}
              <JourneyCardMenu
                isLoggedIn={isLoggedIn}
                onEdit={onEditPlan ? () => onEditPlan(plan.id) : undefined}
                onDelete={() => onDeletePlan(plan.id)}
                onClone={onClonePlan ? () => onClonePlan(plan.id) : undefined}
                onMove={() => handleMoveToArchive(plan)}
                moveLabel="아카이브로 이동"
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
