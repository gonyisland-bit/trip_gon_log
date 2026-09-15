import { SpotPocketItem, SpotPocketPlatform } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'trip_spot_pockets';

const DEFAULT_SAMPLE_SPOTS: SpotPocketItem[] = [
  {
    id: 'sample-spot-1',
    title: '푸글렌 도쿄 (Fuglen Tokyo)',
    category: 'cafe',
    memo: '시부야 요요기공원 근처 노르웨이 감성 카페. 낮에는 핸드드립 커피, 저녁엔 칵테일 바. 야외 벤치 자리가 사진 명당.',
    sourceUrl: 'https://www.instagram.com',
    platform: 'instagram',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80',
    country: 'Japan',
    city: 'Tokyo',
    lat: 35.6669,
    lng: 139.6924,
    address: '1 Chome-16-11 Tomigaya, Shibuya City, Tokyo 151-0063',
    createdAt: 1715000000000,
  },
  {
    id: 'sample-spot-2',
    title: '이치란 라멘 시부야점',
    category: 'food',
    memo: '오후 3~4시 애매한 시간대에 방문하면 웨이팅 15분 이내. 비밀 소스는 3배 추천, 차슈 추가 필수!',
    sourceUrl: 'https://www.youtube.com',
    platform: 'youtube',
    thumbnailUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    country: 'Japan',
    city: 'Tokyo',
    lat: 35.6617,
    lng: 139.7011,
    address: '1 Chome-22-7 Jinnan, Shibuya City, Tokyo 150-0041',
    createdAt: 1715001000000,
  },
  {
    id: 'sample-spot-3',
    title: '오르세 미술관 5층 시계탑',
    category: 'spot',
    memo: '5층 카페테리아 대형 시계창 뒤편이 인생샷 스팟. 뮤지엄 패스 소지자도 공식 홈에서 사전 시간 예약 필수!',
    sourceUrl: 'https://blog.naver.com',
    platform: 'blog',
    thumbnailUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80',
    country: 'France',
    city: 'Paris',
    lat: 48.8599,
    lng: 2.3265,
    address: "1 Rue de la Légion d'Honneur, 75007 Paris",
    createdAt: 1715002000000,
  },
  {
    id: 'sample-spot-4',
    title: '런던 베이글 뮤지엄 안국',
    category: 'cafe',
    memo: '캐치테이블 현장 등록 오전 9시 시작. 감자 치즈 베이글 & 트러플 머쉬룸 수프 조합 추천.',
    sourceUrl: 'https://www.instagram.com',
    platform: 'instagram',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    country: '대한민국',
    city: '서울',
    lat: 37.5794,
    lng: 126.9856,
    address: '서울특별시 종로구 북촌로4길 20',
    createdAt: 1715003000000,
  }
];

export function getSavedPockets(): SpotPocketItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_SPOTS));
      return DEFAULT_SAMPLE_SPOTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_SPOTS;
  } catch (_) {
    return DEFAULT_SAMPLE_SPOTS;
  }
}

/**
 * Real-time listener for Firestore pocket items.
 * Ensures instant multi-device synchronization across different PCs and mobile devices.
 */
export function subscribePockets(callback: (items: SpotPocketItem[]) => void): () => void {
  try {
    const docRef = doc(db, 'users', 'public', 'settings', 'pockets');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.items)) {
        const cloudItems: SpotPocketItem[] = snap.data()?.items;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudItems));
        callback(cloudItems);
      } else {
        // If Firestore document does not exist yet, seed with initial pockets
        const initial = getSavedPockets();
        setDoc(docRef, { items: initial, updatedAt: Date.now() }, { merge: true }).catch(() => {});
        callback(initial);
      }
    }, (err) => {
      console.warn('[pocketStorage] Real-time listener error, falling back to local cache:', err);
      callback(getSavedPockets());
    });
  } catch (err) {
    console.warn('[pocketStorage] Failed to initialize Firestore listener:', err);
    callback(getSavedPockets());
    return () => {};
  }
}

export async function savePockets(items: SpotPocketItem[]): Promise<void> {
  // Always update local cache immediately for zero-latency UI response
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  try {
    const docRef = doc(db, 'users', 'public', 'settings', 'pockets');
    await setDoc(docRef, { items, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.error('[pocketStorage] Failed to save pockets to Firestore server:', err);
  }
}

export async function syncPocketsFromCloud(): Promise<SpotPocketItem[]> {
  try {
    const docRef = doc(db, 'users', 'public', 'settings', 'pockets');
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      const cloudItems: SpotPocketItem[] = snap.data()?.items;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudItems));
      return cloudItems;
    }
  } catch (err) {
    console.warn('[pocketStorage] Cloud sync failed:', err);
  }
  return getSavedPockets();
}

export function detectPlatform(url?: string): SpotPocketPlatform {
  if (!url) return 'web';
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('blog.naver.com') || lower.includes('tistory.com') || lower.includes('brunch.co.kr')) return 'blog';
  if (lower.includes('maps.google.') || lower.includes('goo.gl/maps') || lower.includes('maps.app.goo.gl')) return 'maps';
  return 'web';
}

export function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function findNearbySpots(
  spots: SpotPocketItem[],
  currentLat: number,
  currentLng: number,
  radiusMeters = 300
): { spot: SpotPocketItem; distance: number }[] {
  const results: { spot: SpotPocketItem; distance: number }[] = [];

  for (const s of spots) {
    if (typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)) {
      const dist = calculateDistanceInMeters(currentLat, currentLng, s.lat, s.lng);
      if (dist <= radiusMeters) {
        results.push({ spot: s, distance: dist });
      }
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}
