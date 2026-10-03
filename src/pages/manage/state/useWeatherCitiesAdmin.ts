import { useState, useMemo, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { setDoc } from '../../../utils/ownership';
import { db } from '../../../firebase';
import { CityWeatherConfig } from '../../../types';
import { cleanAdministrativeDistricts } from '../../../components/SummaryView';
import { notify } from '../../../utils/feedback';
import type { DirtyDomain } from './dirtyDomain';

// Shared calendar weather cities (SYSTEM › starting setup), users/public/settings/calendar_weather_cities
export function useWeatherCitiesAdmin() {
  const [saveRevision, setSaveRevision] = useState(0);
  const [calendarWeatherCities, setCalendarWeatherCities] = useState<CityWeatherConfig[]>(() => {
    try {
      const saved = localStorage.getItem('cached_calendar_weather_cities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      { name: '서울', nameEn: 'SEOUL', country: 'KR', lat: 37.5665, lng: 126.9780, timezone: 'Asia/Seoul' },
      { name: '도쿄', nameEn: 'TOKYO', country: 'JP', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
      { name: '오사카', nameEn: 'OSAKA', country: 'JP', lat: 34.6937, lng: 135.5023, timezone: 'Asia/Tokyo' },
      { name: '파리', nameEn: 'PARIS', country: 'FR', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
      { name: '제주', nameEn: 'JEJU', country: 'KR', lat: 33.4996, lng: 126.5312, timezone: 'Asia/Seoul' },
      { name: '후쿠오카', nameEn: 'FUKUOKA', country: 'JP', lat: 33.5904, lng: 130.4017, timezone: 'Asia/Tokyo' },
    ];
  });
  const [searchCalendarCityQuery, setSearchCalendarCityQuery] = useState<string>('');
  const [calendarCityMovedEn, setCalendarCityMovedEn] = useState<string | null>(null);
  const calendarCityMovedTimerRef = useRef<any>(null);
  const [isSavingCalendar, setIsSavingCalendar] = useState<boolean>(false);
  const [calendarSaveSuccess, setCalendarSaveSuccess] = useState<boolean>(false);

  // Snapshot of saved Calendar Weather Cities for accurate dirty checking
  const savedCalendarCitiesSnapshotRef = useRef<string>(JSON.stringify(calendarWeatherCities));

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.cities) && data.cities.length > 0) {
          // If current state matches saved snapshot (not dirty), sync with incoming Firestore data
          if (savedCalendarCitiesSnapshotRef.current === JSON.stringify(calendarWeatherCities)) {
            setCalendarWeatherCities(data.cities);
            savedCalendarCitiesSnapshotRef.current = JSON.stringify(data.cities);
            try {
              localStorage.setItem('cached_calendar_weather_cities', JSON.stringify(data.cities));
            } catch (_) {}
          }
        }
      }
    }, (err) => {
      console.warn("ManageHub calendar weather sync notice:", err);
    });
    return () => unsub();
  }, [calendarWeatherCities]);

  const handleAddCalendarWeatherCity = (
    placeName: string,
    coords: { lat: number; lng: number } | null,
    address: string,
    countryName?: string,
    cityName?: string
  ) => {
    if (!coords || !coords.lat || !coords.lng) return;
    const rawName = cityName || placeName || '도시';
    const cleaned = cleanAdministrativeDistricts(rawName);
    const finalName = cleaned || rawName;
    const finalEn = (cityName || placeName || 'CITY').toUpperCase().replace(/,\s*(SOUTH KOREA|KOREA|JAPAN|FRANCE|USA|VIETNAM|THAILAND|UK|SPAIN).*$/i, '').trim();
    const finalCountry = countryName || 'WORLD';
    let tz = 'UTC';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_) {}

    const newCity: CityWeatherConfig = {
      name: finalName,
      nameEn: finalEn,
      country: finalCountry.slice(0, 2).toUpperCase(),
      lat: coords.lat,
      lng: coords.lng,
      timezone: tz
    };

    const exists = calendarWeatherCities.some(c => c.nameEn.toUpperCase() === newCity.nameEn.toUpperCase());
    if (exists) {
      notify('이미 등록된 도시입니다.');
      return;
    }
    const updated = [...calendarWeatherCities, newCity];
    setCalendarWeatherCities(updated);
    setSearchCalendarCityQuery('');
  };

  const handleMoveCalendarWeatherCity = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === calendarWeatherCities.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...calendarWeatherCities];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCalendarWeatherCities(updated);

    setCalendarCityMovedEn(temp.nameEn);
    if (calendarCityMovedTimerRef.current) clearTimeout(calendarCityMovedTimerRef.current);
    calendarCityMovedTimerRef.current = setTimeout(() => {
      setCalendarCityMovedEn(null);
    }, 1200);
  };

  const handleRemoveCalendarWeatherCity = (cityEn: string) => {
    if (calendarWeatherCities.length <= 1) {
      notify('최소 1개 이상의 날씨 지역이 필요합니다.');
      return;
    }
    const updated = calendarWeatherCities.filter(c => c.nameEn.toUpperCase() !== cityEn.toUpperCase());
    setCalendarWeatherCities(updated);
  };

  const writeCities = async () => {
    localStorage.setItem('cached_calendar_weather_cities', JSON.stringify(calendarWeatherCities));
    await setDoc(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'), { cities: calendarWeatherCities }, { merge: true });
  };

  const isCalendarDirty = useMemo(() => {
    return (savedCalendarCitiesSnapshotRef.current || '[]') !== JSON.stringify(calendarWeatherCities);
  }, [calendarWeatherCities, saveRevision]);

  const markSaved = () => {
    savedCalendarCitiesSnapshotRef.current = JSON.stringify(calendarWeatherCities);
    setSaveRevision(prev => prev + 1);
  };

  const reset = () => {
    if (savedCalendarCitiesSnapshotRef.current) {
      try {
        setCalendarWeatherCities(JSON.parse(savedCalendarCitiesSnapshotRef.current));
      } catch (_) {}
    }
    setSaveRevision(prev => prev + 1);
  };

  const handleSaveCalendarSettings = async () => {
    setIsSavingCalendar(true);
    try {
      await writeCities();
      markSaved();
      setCalendarSaveSuccess(true);
      setTimeout(() => setCalendarSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save calendar weather cities:', err);
      notify('캘린더 날씨 도시 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingCalendar(false);
    }
  };

  const domain: DirtyDomain = {
    isDirty: isCalendarDirty,
    save: async () => {
      try {
        await writeCities();
      } catch (cErr) {
        console.warn('Firestore calendar weather cities sync notice:', cErr);
      }
      markSaved();
      setCalendarSaveSuccess(true);
      setTimeout(() => setCalendarSaveSuccess(false), 2000);
    },
    reset,
    markSaved,
  };

  return {
    domain,
    state: {
      calendarWeatherCities, searchCalendarCityQuery, setSearchCalendarCityQuery, calendarCityMovedEn,
      isSavingCalendar, calendarSaveSuccess, handleAddCalendarWeatherCity, handleMoveCalendarWeatherCity,
      handleRemoveCalendarWeatherCity, handleSaveCalendarSettings, isCalendarDirty,
    },
  };
}
