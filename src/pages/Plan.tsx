import React, { useState, useEffect, useMemo } from 'react';
import { Plus, GripVertical } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'user' | 'date' | 'place'>('user');
  const [draggedPlanId, setDraggedPlanId] = useState<number | null>(null);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);

  useEffect(() => {
    setLocalPlans(plans);
  }, [plans]);

  useEffect(() => {
    if (initialTagFilter) {
      setActiveFilter(initialTagFilter);
    }
  }, [initialTagFilter]);

  const baseFilters = ['All', 'Plan', 'Kyoto', 'Paris', 'Personal', 'Business'];
  const filters = baseFilters.includes(activeFilter) ? baseFilters : [...baseFilters, activeFilter];

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
    <main className="animate-in fade-in duration-500 min-h-screen w-full">
      <div className="p-6 md:px-12 md:py-16 border-b border-black/20 dark:border-white/20 bg-[#EAE8E3]/30 dark:bg-[#1a1a1a]/30 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6 break-keep" style={{ wordBreak: 'keep-all' }}>Upcoming Plans</h1>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed opacity-70 break-keep">비행기 티켓, 숙소 예약, 동선 계획. 다음 여행을 완벽하게 준비하기 위한 캔버스입니다.</p>
          
          {/* Active Filter and Sorting Layout */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button 
                  key={f} 
                  onClick={() => setActiveFilter(f)}
                  className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest border transition-colors shrink-0 ${
                    activeFilter === f 
                    ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' 
                    : 'border-black/20 text-black/50 hover:border-black/50 dark:border-white/20 dark:text-white/50 dark:hover:border-white/50'
                  }`}
                >
                  {f}
                </button>
              ))}
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
          <button onClick={onAddPlan} className="flex items-center justify-center gap-2 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 w-auto">
            <Plus className="w-3 h-3 md:w-4 md:h-4" /> New Plan
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/20 dark:divide-white/20 border-b border-black/20 dark:border-white/20 w-full">
        {filteredPlans.map((plan) => (
          <div 
            key={plan.id} 
            className={`group cursor-pointer p-6 flex flex-col h-full hover:bg-red-500/[0.04] dark:hover:bg-red-400/[0.04] transition-colors border border-red-600/80 dark:border-red-400/80 bg-red-500/[0.02] dark:bg-red-400/[0.02] w-full relative shadow-[0_0_15px_rgba(239,68,68,0.08)] ${draggedPlanId === plan.id ? 'opacity-40' : 'opacity-100'}`} 
            onClick={() => onNavigate('detail', plan.id)}
            draggable={isLoggedIn && sortBy === 'user'}
            onDragStart={(e) => handlePlanDragStart(e, plan.id)}
            onDragOver={(e) => handlePlanDragOver(e, plan.id)}
            onDrop={handlePlanDrop}
            onDragEnd={() => setDraggedPlanId(null)}
          >
            {/* Drag Handle Indicator */}
            {isLoggedIn && sortBy === 'user' && (
              <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
                <GripVertical className="w-4 h-4 text-black dark:text-white" />
              </div>
            )}

            <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative bg-black/5">
              <img src={plan.img} alt={plan.title} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500 pointer-events-none" />
              <JourneyCardMenu
                isLoggedIn={isLoggedIn}
                onEdit={onEditPlan ? () => onEditPlan(plan.id) : undefined}
                onDelete={() => onDeletePlan(plan.id)}
                onClone={onClonePlan ? () => onClonePlan(plan.id) : undefined}
                onMove={() => handleMoveToArchive(plan)}
                moveLabel="아카이브로 이동"
              />
            </div>
            
            <div className="mt-auto flex flex-col gap-1">
              <div className="flex flex-wrap gap-1 mb-1">
                {plan.tags?.filter(t => t !== 'Plan' && t !== 'Archived').map(tag => (
                  <span key={tag} className="text-[9px] uppercase font-bold tracking-widest text-black/40 dark:text-white/40">#{tag}</span>
                ))}
              </div>
              <div className="text-[10px] tracking-widest text-black/55 dark:text-white/55 mb-1 transition-colors break-words">{plan.date}</div>
              <div className="font-bold tracking-tight uppercase text-sm break-words">
                {plan.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
