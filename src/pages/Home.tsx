import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Trip, Plan } from '../types';

interface HomePageProps {
  onNavigate: (view: string, tripId?: number | null) => void;
  trips: Trip[];
  plans: Plan[];
  handleMoveToArchive: (plan: Plan) => void;
  homeTitle: string;
  homeSubtitle: string;
  heroJourneyIds?: number[];
  onEditTrip?: (id: number) => void;
  isLoggedIn?: boolean;
}

export function HomePage({
  onNavigate,
  trips,
  plans,
  handleMoveToArchive,
  homeTitle,
  homeSubtitle,
  heroJourneyIds = [],
  onEditTrip,
  isLoggedIn = false,
}: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [heroSlide, setHeroSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const filters = ['All', '2026', '2025', '2024', 'Kyoto', 'Paris', 'Personal', 'Business'];
  const filteredTrips = activeFilter === 'All' ? trips : trips.filter(t => t.tags.includes(activeFilter));

  // Resolve hero journeys from heroJourneyIds. Fallback to trips[0] if nothing selected.
  const allJourneys: (Trip | Plan)[] = [...trips, ...plans];
  const heroJourneys: (Trip | Plan)[] = heroJourneyIds.length > 0
    ? heroJourneyIds
        .map(id => allJourneys.find(j => j.id === id))
        .filter(Boolean) as (Trip | Plan)[]
    : (trips[0] ? [trips[0]] : []);

  const currentHero = heroJourneys[heroSlide] || heroJourneys[0];

  // Auto-advance carousel every 6s when multiple heroes
  useEffect(() => {
    if (heroJourneys.length <= 1) return;
    const timer = setInterval(() => {
      goToNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [heroJourneys.length, heroSlide]);

  // Reset slide when heroJourneys changes
  useEffect(() => {
    setHeroSlide(0);
  }, [heroJourneyIds.join(',')]);

  const goToSlide = useCallback((idx: number) => {
    if (isTransitioning || idx === heroSlide) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setHeroSlide(idx);
      setIsTransitioning(false);
    }, 350);
  }, [heroSlide, isTransitioning]);

  const goToPrev = () => {
    const next = (heroSlide - 1 + heroJourneys.length) % heroJourneys.length;
    goToSlide(next);
  };

  const goToNext = () => {
    const next = (heroSlide + 1) % heroJourneys.length;
    goToSlide(next);
  };

  return (
    <main className="animate-in fade-in duration-700 w-full">
      
      {/* ===== Hero Section (Carousel if multiple) ===== */}
      <section
        className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden group border-b border-black/20 dark:border-white/20"
      >
        {/* Background image (transitions) */}
        {currentHero && (
          <img
            key={currentHero.id}
            src={currentHero.img || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2400&auto=format&fit=crop"}
            alt={currentHero.title || "Hero Trip"}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms] ${isTransitioning ? 'opacity-0 scale-110' : 'opacity-100 scale-100 group-hover:scale-105'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        )}
        {!currentHero && (
          <img
            src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2400&auto=format&fit=crop"
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 md:via-black/40 to-transparent pointer-events-none" />

        {/* Clickable area for navigating to hero journey */}
        {currentHero && (
          <div
            className="absolute inset-0 cursor-pointer z-0"
            onClick={() => onNavigate('detail', currentHero.id)}
          />
        )}

        {/* Text content */}
        <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 md:p-16 w-full md:w-2/3 lg:w-1/2 text-white z-10 pointer-events-none">
          <div className="pointer-events-auto max-w-full">
            <h1
              className="text-4xl min-[390px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] uppercase drop-shadow-xl"
              style={{ wordBreak: 'keep-all' }}
            >
              {homeTitle.includes('<br />') ? (
                homeTitle.split('<br />').map((part, idx) => (
                  <React.Fragment key={idx}>
                    {part}
                    {idx < homeTitle.split('<br />').length - 1 && <br />}
                  </React.Fragment>
                ))
              ) : homeTitle.includes('\n') ? (
                homeTitle.split('\n').map((part, idx) => (
                  <React.Fragment key={idx}>
                    {part}
                    {idx < homeTitle.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))
              ) : (
                homeTitle
              )}
            </h1>
          </div>
          <div className="pointer-events-auto max-w-full pr-4 mt-6 md:mt-8">
            <p className="text-sm md:text-base text-white/80 drop-shadow-md break-keep">
              {homeSubtitle}
            </p>
          </div>
        </div>

        {/* Featured label + slide dots */}
        {currentHero && (
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col items-end gap-2 z-10">
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 border border-white/20 dark:border-white/10 rounded-sm">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/90 dark:text-white/90 drop-shadow-sm">
                Featured: {currentHero.title}
              </span>
            </div>
            {/* Slide dots */}
            {heroJourneys.length > 1 && (
              <div className="flex items-center gap-1.5">
                {heroJourneys.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
                    className={`rounded-full transition-all ${
                      idx === heroSlide
                        ? 'w-4 h-1.5 bg-white'
                        : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Carousel nav arrows (only when multiple) */}
        {heroJourneys.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/25 border border-white/15 text-white rounded-full transition-all backdrop-blur-sm"
              aria-label="Previous hero"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/25 border border-white/15 text-white rounded-full transition-all backdrop-blur-sm"
              aria-label="Next hero"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
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
                className="border border-black/20 dark:border-white/20 p-4 bg-white/50 dark:bg-black/20 flex flex-col group cursor-pointer w-full relative"
                onClick={() => onNavigate('detail', plan.id)}
              >
                {/* Edit button */}
                {isLoggedIn && onEditTrip && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditTrip(plan.id); }}
                    className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-all"
                    title="편집"
                    aria-label="Edit journey cover"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                <div className="aspect-[4/3] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative">
                  <img src={plan.img} alt={plan.title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="text-xs tracking-widest text-black/50 dark:text-white/50 mb-1 break-words">
                  {plan.date}
                </div>
                <div className="font-bold tracking-tight uppercase text-sm mb-4 break-words">
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
              onClick={() => onNavigate('detail', trip.id)}
            >
              {/* Edit button (pen icon) */}
              {isLoggedIn && onEditTrip && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEditTrip(trip.id); }}
                  className="absolute top-7 right-7 z-10 p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-all"
                  title="편집"
                  aria-label="Edit journey cover"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
              <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative">
                <img
                  src={trip.img}
                  alt={trip.title}
                  className="absolute inset-0 w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
              </div>
              <div className="mt-auto">
                <div className="flex flex-wrap gap-1 mb-2">
                  {trip.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] uppercase font-bold tracking-widest bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm text-black/60 dark:text-white/60">{tag}</span>
                  ))}
                </div>
                <div className="text-xs tracking-widest text-black/50 dark:text-white/50 mb-1 transition-colors break-words">
                  {trip.date}
                </div>
                <div className="font-bold tracking-tight uppercase text-sm break-words">
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
