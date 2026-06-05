import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ImageEditOverlay } from '../components/ImageEditOverlay';
import { Trip, Plan } from '../types';

interface HomePageProps {
  onNavigate: (view: string, tripId?: number | null) => void;
  trips: Trip[];
  plans: Plan[];
  handleMoveToArchive: (plan: Plan) => void;
  isEditMode: boolean;
  onUpdateTrip: (tripId: number, field: string, value: any) => void;
}

export function HomePage({
  onNavigate,
  trips,
  plans,
  handleMoveToArchive,
  isEditMode,
  onUpdateTrip,
}: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', '2026', '2025', '2024', 'Kyoto', 'Paris', 'Personal', 'Business'];
  const filteredTrips = activeFilter === 'All' ? trips : trips.filter(t => t.tags.includes(activeFilter));

  const textEditableClass = isEditMode ? 'outline-dashed outline-1 outline-red-500/50 hover:bg-white/10 cursor-text transition-all rounded px-1 -mx-1' : '';

  return (
    <main className="animate-in fade-in duration-700 w-full">
      
      {/* Wide Hero Section with Gradient Overlay */}
      <section 
        className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden group border-b border-black/20 dark:border-white/20 cursor-pointer" 
        onClick={() => { if (!isEditMode) onNavigate('detail', trips[0]?.id) }}
      >
        <img 
          src={trips[0]?.img || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2400&auto=format&fit=crop"} 
          alt="Hero Trip" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 md:via-black/40 to-transparent pointer-events-none" />
        {trips[0] && (
          <ImageEditOverlay 
            isEditMode={isEditMode} 
            onImageUploaded={(url) => onUpdateTrip(trips[0].id, 'img', url)} 
          />
        )}
        
        <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 md:p-16 w-full md:w-2/3 lg:w-1/2 text-white z-10 pointer-events-none">
          <div className="pointer-events-auto max-w-full">
            <h1 
              contentEditable={isEditMode} suppressContentEditableWarning 
              className={`text-4xl min-[390px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase drop-shadow-xl ${textEditableClass}`}
              style={{ wordBreak: 'keep-all' }}
            >
              Your <br />Personal <br />Travel <br />Magazine.
            </h1>
          </div>
          <div className="pointer-events-auto max-w-full pr-4 mt-6 md:mt-8">
            <p 
              contentEditable={isEditMode} suppressContentEditableWarning 
              className={`text-sm md:text-base text-white/80 drop-shadow-md truncate ${textEditableClass}`}
            >
              나만의 감성으로 기록하고 보관하는 여행 아카이브.
            </p>
          </div>
        </div>

        {/* Featured Label */}
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 bg-white/40 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 border border-white/20 dark:border-white/10 z-10 pointer-events-auto rounded-sm">
          <span 
            contentEditable={isEditMode} suppressContentEditableWarning 
            onBlur={(e) => trips[0] && onUpdateTrip(trips[0].id, 'title', e.currentTarget.innerText.replace('Featured: ', ''))}
            className={`text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/90 dark:text-white/90 drop-shadow-sm ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}`}
          >
            Featured: {trips[0]?.title}
          </span>
        </div>
      </section>

      {/* Plans Section Preview */}
      {plans.length > 0 && (
        <section className="border-b border-black/20 dark:border-white/20 p-6 md:p-12 transition-colors w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase break-keep">Upcoming Plans</h2>
              <p className="text-sm text-black/50 dark:text-white/50 mt-1 break-keep">다가오는 여행 계획을 준비하고, 여행 후 아카이브로 전환하세요.</p>
            </div>
            <button onClick={() => onNavigate('plan')} className="text-xs font-bold uppercase tracking-widest flex items-center hover:opacity-60 shrink-0">
              View All Plans <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full">
            {plans.slice(0, 4).map((plan) => (
              <div 
                key={plan.id} 
                className="border border-black/20 dark:border-white/20 p-4 bg-white/50 dark:bg-black/20 flex flex-col group cursor-pointer w-full" 
                onClick={() => { if(!isEditMode) onNavigate('detail', plan.id) }}
              >
                 <div className="aspect-[4/3] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative">
                  <img src={plan.img} alt={plan.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                  <ImageEditOverlay 
                    isEditMode={isEditMode} 
                    onImageUploaded={(url) => onUpdateTrip(plan.id, 'img', url)} 
                  />
                </div>
                <div 
                  contentEditable={isEditMode} suppressContentEditableWarning 
                  onBlur={(e) => onUpdateTrip(plan.id, 'date', e.currentTarget.innerText)}
                  onClick={(e) => isEditMode && e.stopPropagation()}
                  className={`text-xs tracking-widest text-black/50 dark:text-white/50 mb-1 break-words ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}`}
                >
                  {plan.date}
                </div>
                <div 
                  contentEditable={isEditMode} suppressContentEditableWarning 
                  onBlur={(e) => onUpdateTrip(plan.id, 'title', e.currentTarget.innerText)}
                  onClick={(e) => isEditMode && e.stopPropagation()}
                  className={`font-bold tracking-tight uppercase text-sm mb-4 break-words ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}`}
                >
                  {plan.title}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Archive Grid Section Preview */}
      <section className="flex flex-col w-full overflow-hidden">
        <div className="p-6 md:px-12 border-b border-black/20 dark:border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-4 shrink-0">
            <h2 className="text-2xl font-black tracking-tighter uppercase break-keep">Journeys Archive</h2>
          </div>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/20 dark:divide-white/20 transition-colors border-b border-black/20 dark:border-white/20 w-full">
          {filteredTrips.slice(0, 4).map((trip) => (
            <div 
              key={trip.id} 
              className="group cursor-pointer p-6 flex flex-col h-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative w-full" 
              onClick={() => { if(!isEditMode) onNavigate('detail', trip.id) }}
            >
              <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative">
                <img 
                  src={trip.img} 
                  alt={trip.title} 
                  className="absolute inset-0 w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                <ImageEditOverlay 
                  isEditMode={isEditMode} 
                  onImageUploaded={(url) => onUpdateTrip(trip.id, 'img', url)} 
                />
              </div>
              <div className="mt-auto">
                <div className="flex flex-wrap gap-1 mb-2">
                  {trip.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] uppercase font-bold tracking-widest bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm text-black/60 dark:text-white/60">{tag}</span>
                  ))}
                </div>
                <div 
                  contentEditable={isEditMode} suppressContentEditableWarning 
                  onBlur={(e) => onUpdateTrip(trip.id, 'date', e.currentTarget.innerText)}
                  onClick={(e) => isEditMode && e.stopPropagation()}
                  className={`text-xs tracking-widest text-black/50 dark:text-white/50 mb-1 transition-colors break-words ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}`}
                >
                  {trip.date}
                </div>
                <div 
                  contentEditable={isEditMode} suppressContentEditableWarning 
                  onBlur={(e) => onUpdateTrip(trip.id, 'title', e.currentTarget.innerText)}
                  onClick={(e) => isEditMode && e.stopPropagation()}
                  className={`font-bold tracking-tight uppercase text-sm break-words ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}`}
                >
                  {trip.title}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 md:px-12 flex justify-center w-full">
            <button onClick={() => onNavigate('archive')} className="text-sm font-bold uppercase tracking-widest border border-black dark:border-white px-8 py-3 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors w-full md:w-auto">
              View Entire Archive
            </button>
        </div>
      </section>
    </main>
  );
}
