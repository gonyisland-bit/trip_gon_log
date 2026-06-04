import React, { useState, useRef } from 'react';
import { Clock, Plane, Bed, Train, User, Edit2, Trash2, Image as ImageIcon, ChevronUp, ChevronDown, MapPin, Map } from 'lucide-react';
import { MapArea } from '../components/MapArea';
import { ImageEditOverlay } from '../components/ImageEditOverlay';
import { Trip, TimelineItem } from '../types';
import { tripDates, timelineDataByDate } from '../data/mockData';

interface JourneyDetailPageProps {
  isLoggedIn: boolean;
  trip: Trip;
  isEditMode: boolean;
}

type TabType = 'timeline' | 'flights' | 'stays' | 'transit';

export const JourneyDetailPage: React.FC<JourneyDetailPageProps> = ({
  isLoggedIn,
  trip,
  isEditMode,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const currentTimeline = selectedDate === 'ALL' 
    ? Object.values(timelineDataByDate).flat() 
    : timelineDataByDate[selectedDate] || [];

  const mapPoints = currentTimeline.filter(item => item.x !== undefined && item.y !== undefined);
  const activeDateInfo = tripDates.find(d => d.date === selectedDate);

  const handleItemToggle = (id: number) => {
    setExpandedItemId(prevId => prevId === id ? null : id);
    if (expandedItemId !== id && itemRefs.current[id]) {
      setTimeout(() => {
        itemRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const textEditableClass = isEditMode ? 'outline-dashed outline-1 outline-red-500/50 hover:bg-black/5 dark:hover:bg-white/5 cursor-text transition-all rounded px-1 -mx-1' : '';

  return (
    <main className="animate-in slide-in-from-right-8 duration-500 flex flex-col md:flex-row h-[calc(100vh-73px)] w-full overflow-hidden">
      
      {/* Left: Map & Info Section */}
      <section className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-black/20 dark:border-white/20 relative transition-colors duration-300 h-[55vh] md:h-full shrink-0">
        <div className="p-4 md:p-8 border-b border-black/20 dark:border-white/20 z-10 bg-[#F9F8F6] dark:bg-[#111111] transition-colors shrink-0">
          <div className="flex items-center space-x-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-3 md:mb-4 transition-colors">
            <span contentEditable={isEditMode} suppressContentEditableWarning className={isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}>{trip.date}</span>
            <span>—</span>
            <span>{activeDateInfo?.label}</span>
          </div>
          
          <h1 
            contentEditable={isEditMode} suppressContentEditableWarning 
            className={`text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none break-keep ${textEditableClass}`}
            style={{ wordBreak: 'keep-all' }}
          >
            {trip.title.split(',')[0]} <br/> {trip.tags.includes('Plan') ? 'Plan' : 'Archive'}
          </h1>
          
          <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
            {trip.tags.slice(0, 2).map(tag => (
               <span key={tag} contentEditable={isEditMode} suppressContentEditableWarning className={`text-[9px] md:text-[10px] font-bold border border-black/20 dark:border-white/20 px-2 py-1 uppercase rounded-full ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}`}>
                 {tag}
               </span>
            ))}
          </div>
        </div>
        
        {/* Dynamic Map Area */}
        <MapArea 
          trip={trip}
          isEditMode={isEditMode}
          mapPoints={mapPoints}
          expandedItemId={expandedItemId}
          handleItemToggle={handleItemToggle}
          selectedDate={selectedDate}
        />
      </section>

      {/* Right: Record / Tabs Section */}
      <section className="w-full md:w-1/2 flex flex-col bg-[#F9F8F6] dark:bg-[#111111] transition-colors duration-300 flex-grow overflow-hidden">
        
        <div className="flex border-b border-black/20 dark:border-white/20 bg-[#F9F8F6] dark:bg-[#111111] sticky top-0 z-30 overflow-x-auto hide-scrollbar transition-colors shrink-0 w-full">
          {[ 
            { id: 'timeline', label: 'Timeline', icon: Clock }, 
            { id: 'flights', label: 'Flights', icon: Plane }, 
            { id: 'stays', label: 'Stays', icon: Bed }, 
            { id: 'transit', label: 'Transit', icon: Train } 
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as TabType)} 
              className={`flex-1 min-w-max py-3 px-4 md:py-4 flex items-center justify-center space-x-1.5 md:space-x-2 text-[10px] md:text-xs font-bold uppercase tracking-widest border-r border-black/20 dark:border-white/20 last:border-r-0 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white'}`}
            >
              <tab.icon className="w-3 h-3 md:w-4 md:h-4" /> <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-grow flex flex-col relative overflow-y-auto overflow-x-hidden w-full">
          {activeTab === 'timeline' && (
            <div className="animate-in fade-in duration-300 h-full flex flex-col w-full">
              <div className="flex border-b border-black/20 dark:border-white/20 bg-[#F9F8F6] dark:bg-[#111111] overflow-x-auto hide-scrollbar transition-colors shrink-0 w-full">
                {tripDates.map((d) => (
                  <button 
                    key={d.id} 
                    onClick={() => { setSelectedDate(d.date); setExpandedItemId(null); }} 
                    className={`flex-1 min-w-[80px] md:min-w-[100px] py-2 md:py-3 px-3 md:px-4 flex flex-col items-center justify-center border-r border-black/20 dark:border-white/20 last:border-r-0 transition-colors whitespace-nowrap ${selectedDate === d.date ? 'bg-black text-[#F9F8F6] dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white'}`}
                  >
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1 flex items-center gap-1">
                      {d.label} {d.weather && <span className="flex items-center gap-0.5 border-l border-current pl-1 ml-1"><d.weather.icon className="w-2.5 h-2.5 md:w-3 md:h-3" /> {d.weather.temp}</span>}
                    </span>
                    <span className="text-xs md:text-sm font-black tracking-tighter">{d.date === 'ALL' ? 'VIEW ALL' : d.date.slice(5).replace('.', '/')}</span>
                  </button>
                ))}
              </div>

              {!isLoggedIn && (
                <div className="bg-black/5 dark:bg-white/10 px-4 py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-center flex items-center justify-center gap-2 shrink-0 w-full">
                  <User className="w-3 h-3 shrink-0" /> <span className="truncate">로그인 후 기록을 수정하거나 새 일정을 추가할 수 있습니다.</span>
                </div>
              )}

              <div className="flex flex-col pb-20 w-full">
                {currentTimeline.map((item) => {
                  const isActive = expandedItemId === item.id;
                  return (
                    <div 
                      key={item.id} 
                      ref={el => { itemRefs.current[item.id] = el; }} 
                      className={`flex flex-col border-b border-black/10 dark:border-white/10 transition-colors w-full ${isActive ? 'bg-black/5 dark:bg-white/5' : ''}`}
                    >
                      <div 
                        className="group flex flex-row items-start py-4 px-4 md:py-5 md:px-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer relative w-full" 
                        onClick={() => handleItemToggle(item.id)}
                      >
                        <div className={`w-16 md:w-24 shrink-0 text-[10px] md:text-xs font-bold tracking-widest mt-1 transition-colors ${isActive ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'}`}>{item.time}</div>
                        <div className="flex-grow pr-2 md:pr-4 min-w-0">
                          <div className={`font-bold tracking-tight text-sm md:text-base flex items-center gap-2 flex-wrap ${isActive ? 'text-red-600 dark:text-red-400' : ''}`}>
                            <span contentEditable={isEditMode} suppressContentEditableWarning className={`break-words ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text' : ''}`}>{item.place}</span>
                            {isActive ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-current shrink-0" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-black/40 dark:text-white/40 shrink-0" />}
                          </div>
                          <div contentEditable={isEditMode} suppressContentEditableWarning className={`text-xs md:text-sm text-black/60 dark:text-white/60 mt-1 transition-colors break-words ${isEditMode ? 'outline-dashed outline-1 outline-red-500/50 cursor-text w-full' : ''}`}>{item.memo}</div>
                          {isLoggedIn && isActive && (
                            <div className="flex gap-4 mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                               <button className="flex items-center gap-1 hover:text-black/50 dark:hover:text-white/50 transition-colors" onClick={(e) => e.stopPropagation()}><Edit2 className="w-3 h-3"/> Edit</button>
                               <button className="flex items-center gap-1 text-red-600 hover:text-red-400 transition-colors" onClick={(e) => e.stopPropagation()}><Trash2 className="w-3 h-3"/> Delete</button>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                          {item.cost !== '-' && <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest bg-black/10 dark:bg-white/10 px-2 py-0.5 md:py-1 rounded-sm whitespace-nowrap">{item.cost}</div>}
                          {item.img ? (
                            <div className={`w-10 h-10 md:w-12 md:h-12 overflow-hidden border transition-all relative ${isActive ? 'border-red-600 dark:border-red-400 scale-110 origin-right' : 'border-black/20 dark:border-white/20'}`}>
                              <img src={item.img} alt={item.place} className={`w-full h-full object-cover transition-all ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                              <ImageEditOverlay isEditMode={isEditMode} />
                            </div>
                          ) : (
                            <div className={`w-10 h-10 md:w-12 md:h-12 border bg-black/5 dark:bg-white/5 flex items-center justify-center transition-colors relative ${isActive ? 'border-red-600 dark:border-red-400 text-red-600 scale-110 origin-right' : 'border-black/10 dark:border-white/10 text-black/30 dark:text-white/30'}`}>
                              <ImageIcon className="w-3 h-3 md:w-4 md:h-4" />
                              <ImageEditOverlay isEditMode={isEditMode} />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isActive && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6 pt-1 md:pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                          <div className="bg-white/80 dark:bg-black/40 border border-black/10 dark:border-white/10 p-3 md:p-4 flex flex-col gap-3 text-xs md:text-sm transition-colors shadow-inner">
                            {item.location && (
                              <div className="flex items-start gap-3 group/copy">
                                <Map className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 text-black/60 dark:text-white/60 shrink-0" />
                                <div className="flex-grow text-black/80 dark:text-white/80 font-medium break-words">{item.location}</div>
                              </div>
                            )}
                            {item.hours && (
                              <div className="flex items-center gap-3 text-black/80 dark:text-white/80">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-black/60 dark:text-white/60 shrink-0" />
                                <div className="font-medium">{item.hours}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab !== 'timeline' && (
             <div className="flex-grow flex items-center justify-center p-8 md:p-12 text-center text-black/50 dark:text-white/50 text-xs md:text-sm font-bold tracking-widest uppercase break-words w-full">
                {activeTab} 탭 기능은 유지되었습니다.<br/>(프로토타입 데모)
             </div>
          )}
        </div>
      </section>
    </main>
  );
};
