import React from 'react';
import { Plus, Archive } from 'lucide-react';
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
}

export function PlanHubPage({
  plans,
  onNavigate,
  onAddPlan,
  handleMoveToArchive,
  isLoggedIn,
  onDeletePlan,
  onEditPlan,
}: PlanHubPageProps) {
  return (
    <main className="animate-in fade-in duration-500 min-h-screen w-full">
      <div className="p-6 md:px-12 md:py-16 border-b border-black/20 dark:border-white/20 bg-[#EAE8E3]/30 dark:bg-[#1a1a1a]/30 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6 break-keep" style={{ wordBreak: 'keep-all' }}>Upcoming Plans</h1>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed opacity-70 break-keep">비행기 티켓, 숙소 예약, 동선 계획. 다음 여행을 완벽하게 준비하기 위한 캔버스입니다.</p>
        </div>
        {isLoggedIn && (
          <button onClick={onAddPlan} className="flex items-center justify-center gap-2 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 w-auto">
            <Plus className="w-3 h-3 md:w-4 md:h-4" /> New Plan
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/20 dark:divide-white/20 border-b border-black/20 dark:border-white/20 w-full">
        {plans.map((plan) => (
          <div key={plan.id} className="group cursor-pointer p-6 flex flex-col h-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b sm:border-b-0 border-red-500/10 bg-red-500/[0.01] dark:border-red-400/10 dark:bg-red-400/[0.01] w-full relative" onClick={() => onNavigate('detail', plan.id)}>
            <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative bg-black/5">
              <img src={plan.img} alt={plan.title} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
              <JourneyCardMenu
                isLoggedIn={isLoggedIn}
                onEdit={onEditPlan ? () => onEditPlan(plan.id) : undefined}
                onDelete={() => onDeletePlan(plan.id)}
              />
            </div>
            
            <div className="mt-auto flex flex-col">
              <div className="font-bold tracking-tight uppercase text-sm break-words mb-3">
                {plan.title}
              </div>
              
              {isLoggedIn && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleMoveToArchive(plan); }}
                  className="flex justify-center items-center gap-2 w-full py-2.5 border border-black dark:border-white text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors z-10 relative"
                >
                  <Archive className="w-3.5 h-3.5" /> Move to Archive
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
