import { ChevronUp, ChevronDown, Save, Trash2, MapPin } from 'lucide-react';
import { PlaceAutocompleteInput } from '../../components/PlaceAutocompleteInput';
import type { ManageHubState } from './useManageHubState';

export function CalendarMode({ s }: { s: ManageHubState }) {
  const {
    calendarWeatherCities, searchCalendarCityQuery, setSearchCalendarCityQuery, calendarCityMovedEn,
    isSavingCalendar, calendarSaveSuccess, handleAddCalendarWeatherCity,
    handleMoveCalendarWeatherCity, handleRemoveCalendarWeatherCity, handleSaveCalendarSettings,
    title, handleContainerScroll, isCalendarDirty
  } = s;

  return (
    <div
      onScroll={handleContainerScroll}
      className="w-full max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100dvh-60px)] animate-in fade-in duration-200 select-none"
    >
      {/* Header Title */}
      <div className="flex flex-col gap-1 border-b-2 border-black dark:border-white pb-4">
        <div className="flex items-center justify-between">
          <span className="text-micro font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
            CALENDAR & WEATHER CONFIGURATION
          </span>
          {isCalendarDirty && (
            <span className="px-2 py-0.5 bg-red-600 text-white font-mono text-micro font-extrabold uppercase tracking-wider animate-pulse">
              UNSAVED CHANGES
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
            CALENDAR SETTING
          </h2>
          <button
            type="button"
            onClick={handleSaveCalendarSettings}
            disabled={isSavingCalendar || !isCalendarDirty}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs ${
              calendarSaveSuccess
                ? 'bg-emerald-600 text-white border border-emerald-600'
                : isCalendarDirty
                  ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white ring-2 ring-red-600/30'
                  : 'border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
            }`}
            title={isCalendarDirty ? "변경된 캘린더 세팅 저장" : "저장할 변경사항이 없습니다"}
          >
            <Save className={`w-3.5 h-3.5 ${isSavingCalendar ? 'animate-spin' : ''}`} />
            <span>{isSavingCalendar ? 'SAVING...' : calendarSaveSuccess ? 'SAVED' : 'SAVE CALENDAR SETTINGS'}</span>
          </button>
        </div>
        <p className="text-xs text-black/60 dark:text-white/60 font-mono">
          [캘린더 허브 및 홈허브 하단에 실시간 연동될 날씨 도시 목록과 순서를 관리합니다]
        </p>
      </div>

      {/* SECTION: WEATHER CITIES MANAGEMENT */}
      <section className="flex flex-col gap-6 pt-2">
        <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600 dark:text-red-500" />
            <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
              WEATHER CITIES MANAGEMENT
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60">
            총 {calendarWeatherCities.length}개 도시 등록됨
          </span>
        </div>

        {/* Add New City Autocomplete Input */}
        <div className="flex flex-col gap-2 p-4 border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
          <span className="text-xs font-mono font-bold text-black dark:text-white uppercase tracking-wider">
            새 날씨 도시 추가 (도시명 검색)
          </span>
          <PlaceAutocompleteInput
            value={searchCalendarCityQuery}
            onChange={(val) => setSearchCalendarCityQuery(val)}
            onSelectPlace={(placeName, coords, address, countryName, cityName) => {
              handleAddCalendarWeatherCity(placeName, coords, address, countryName, cityName);
            }}
            placeholder="도시명 검색 (예: 서울, 도쿄, 오사카, 파리, 삿포로, 런던, 뉴욕...)"
            className="w-full h-9 px-3 text-xs bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white text-black dark:text-white outline-none rounded-none font-sans"
          />
          <span className="text-meta text-black/60 dark:text-white/60 font-mono">
            * 검색 후 선택 시 한글 정규화 도시명과 공식 영문 코드가 자동 등록되며, 실시간 클라우드에 영속 저장됩니다.
          </span>
        </div>

        {/* City Reorder & Management List */}
        <div className="flex flex-col border border-black/10 dark:border-white/10 divide-y divide-black/10 dark:divide-white/10 bg-white dark:bg-[#0c0c0c]">
          {calendarWeatherCities.map((c, idx) => {
            const isHomeTarget = idx < 4;
            const isMoved = calendarCityMovedEn?.toUpperCase() === c.nameEn.toUpperCase();

            return (
              <div
                key={`${c.nameEn}-${idx}`}
                className={`p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-xs font-mono transition-all duration-300 ${
                  isMoved
                    ? 'bg-red-500/15 border-l-4 border-l-red-500 text-red-700 dark:text-red-400 font-bold'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* Left: Index + Home Badge + City Info */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <span className={`text-[11px] font-bold w-4 text-center shrink-0 ${isMoved ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'}`}>
                    {idx + 1}
                  </span>

                  {isHomeTarget ? (
                    <span className="px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black text-micro font-mono font-extrabold tracking-wider uppercase shrink-0">
                      HOME 4
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 text-micro font-mono tracking-wider uppercase shrink-0">
                      CALENDAR
                    </span>
                  )}

                  <div className="flex items-baseline gap-2 min-w-0 truncate">
                    <span className="font-sans font-extrabold text-sm text-black dark:text-white truncate">
                      {c.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 shrink-0">
                      {c.nameEn}
                    </span>
                    <span className="text-micro font-mono text-black/60 dark:text-white/60 shrink-0">
                      ({c.country})
                    </span>
                  </div>
                </div>

                {/* Right: Actions (Move Up, Move Down, Delete) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveCalendarWeatherCity(idx, 'up')}
                    disabled={idx === 0}
                    className="tap-target p-1.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white"
                    title="위로 이동"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCalendarWeatherCity(idx, 'down')}
                    disabled={idx === calendarWeatherCities.length - 1}
                    className="tap-target p-1.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white"
                    title="아래로 이동"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCalendarWeatherCity(c.nameEn)}
                    disabled={calendarWeatherCities.length <= 1}
                    className="tap-target p-1.5 hover:bg-red-500/10 text-red-600/70 hover:text-red-600 dark:text-red-400/70 dark:hover:text-red-400 disabled:opacity-20 transition-colors cursor-pointer ml-1"
                    title="도시 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integration Guide Note */}
        <div className="p-4 border-l-2 border-black/40 dark:border-white/40 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-1 text-[11px] font-mono text-black/60 dark:text-white/60">
          <div className="font-bold text-black dark:text-white uppercase tracking-wider mb-0.5">
            SYSTEM PERSISTENCE & DISPLAY NOTE
          </div>
          <div>· 상위 1~4순위 [HOME 4] 도시는 홈허브 하단 날씨 위젯에 실시간 4열로 자동 노출됩니다.</div>
          <div>· 캘린더 허브에서 날씨 모드 토글 시 등록된 모든 도시가 상단 앱 스타일 알약 칩으로 노출됩니다.</div>
          <div>· 모든 변경 사항은 Firebase 중앙 서버에 실시간 저장되어 다중 디바이스에 즉각 동기화됩니다.</div>
        </div>
      </section>
    </div>
  );
}
