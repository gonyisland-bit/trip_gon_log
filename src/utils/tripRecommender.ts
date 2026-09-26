import { DestinationCity, DestinationCountry, WORLD_CITIES, WORLD_COUNTRIES, PresetTripPlan } from '../data/worldDestinations';

export interface CuratedTripProposal {
  id: string;
  title: string;
  subtitle: string;
  countryEn: string;
  countryKo: string;
  cityName: string;
  cityObj: DestinationCity;
  theme: string;
  themeLabel: string;
  startDate: string;
  endDate: string;
  durationDays: number; // 박수 (예: 3 -> 3박 4일)
  nightsDays: string;
  coverImg: string;
  seasonBadge: string;
  seasonNote: string;
  highlights: string[];
  tags: string[];
  locations: { name: string; lat: number; lng: number; country: string }[];
  timeline: {
    date: string;
    items: {
      time: string;
      title: string;
      location: string;
      memo: string;
      category: string;
      type: 'transit' | 'activity' | 'dining' | 'stay';
    }[];
  }[];
}

export interface TripCriteria {
  continent?: string; // 'all' | 'asia' | 'europe' | 'north_america' | 'south_america' | 'oceania' | 'africa'
  theme?: string; // 'all' | 'food' | 'shopping' | 'nature' | 'activity' | 'art' | 'relax'
  country?: DestinationCountry | null;
  city?: DestinationCity | null;
  targetYear?: number;
  targetMonth?: number; // 1-12 (0: all)
  durationDays?: number; // 3, 4, 5, 7, 10
  seedOffset?: number;
}

export const CONTINENTS = [
  { id: 'all', labelEn: 'ALL', labelKo: '전세계' },
  { id: 'asia', labelEn: 'ASIA', labelKo: '아시아' },
  { id: 'europe', labelEn: 'EUROPE', labelKo: '유럽' },
  { id: 'north_america', labelEn: 'N.AMERICA', labelKo: '북미' },
  { id: 'south_america', labelEn: 'S.AMERICA', labelKo: '남미' },
  { id: 'oceania', labelEn: 'OCEANIA', labelKo: '오세아니아' },
  { id: 'africa', labelEn: 'AFRICA', labelKo: '아프리카' },
] as const;

export const CONTINENT_COUNTRY_MAP: Record<string, string[]> = {
  asia: ['JAPAN', 'SOUTH KOREA', 'TAIWAN', 'VIETNAM', 'THAILAND', 'CHINA', 'HONG KONG', 'MACAU', 'SINGAPORE', 'MALAYSIA', 'INDONESIA', 'PHILIPPINES', 'MONGOLIA', 'INDIA', 'NEPAL', 'LAOS', 'CAMBODIA', 'MALDIVES', 'SRI LANKA', 'UZBEKISTAN', 'KAZAKHSTAN', 'GEORGIA', 'ARMENIA', 'AZERBAIJAN', 'TURKEY', 'UNITED ARAB EMIRATES', 'QATAR', 'SAUDI ARABIA', 'JORDAN', 'ISRAEL', 'OMAN'],
  europe: ['FRANCE', 'ITALY', 'UNITED KINGDOM', 'SPAIN', 'GERMANY', 'SWITZERLAND', 'AUSTRIA', 'CZECH REPUBLIC', 'HUNGARY', 'PORTUGAL', 'NETHERLANDS', 'BELGIUM', 'GREECE', 'CROATIA', 'ICELAND', 'NORWAY', 'SWEDEN', 'FINLAND', 'DENMARK', 'IRELAND', 'POLAND', 'SLOVENIA', 'MALTA', 'CYPRUS', 'ESTONIA', 'LATVIA', 'LITHUANIA', 'ROMANIA', 'BULGARIA'],
  north_america: ['USA', 'CANADA', 'MEXICO', 'CUBA', 'JAMAICA', 'COSTA RICA', 'PANAMA'],
  south_america: ['BRAZIL', 'ARGENTINA', 'CHILE', 'PERU', 'COLOMBIA', 'BOLIVIA', 'ECUADOR'],
  oceania: ['AUSTRALIA', 'NEW ZEALAND', 'GUAM', 'SAIPAN', 'FIJI'],
  africa: ['EGYPT', 'MOROCCO', 'SOUTH AFRICA', 'KENYA', 'TANZANIA', 'MADAGASCAR', 'MAURITIUS', 'SEYCHELLES', 'TUNISIA']
};

/**
 * 국가 또는 도시의 bestSeason 문자열 (예: "3월~5월 (벚꽃), 10월~11월", "11월~3월")에서
 * 해당하는 1~12월 숫자 배열을 정확하게 추출
 */
export function parseBestMonthsFromSeasonString(seasonText?: string): number[] {
  if (!seasonText) return [];
  const text = seasonText.trim();
  const monthsSet = new Set<number>();

  // 1. 범위 매칭 (예: 11월~3월, 4월-6월, 10~11월)
  const rangeRegex = /(\d{1,2})\s*월?\s*[~–\-]\s*(\d{1,2})\s*월?/g;
  let match: RegExpExecArray | null;

  while ((match = rangeRegex.exec(text)) !== null) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    if (start >= 1 && start <= 12 && end >= 1 && end <= 12) {
      if (start <= end) {
        for (let m = start; m <= end; m++) {
          monthsSet.add(m);
        }
      } else {
        // 연도 넘어가는 경우 (예: 11월~3월 -> 11, 12, 1, 2, 3)
        for (let m = start; m <= 12; m++) {
          monthsSet.add(m);
        }
        for (let m = 1; m <= end; m++) {
          monthsSet.add(m);
        }
      }
    }
  }

  // 2. 단일 월 매칭 (예: 5월, 10월 등 단독 월)
  const singleRegex = /(\d{1,2})\s*월/g;
  while ((match = singleRegex.exec(text)) !== null) {
    const m = parseInt(match[1], 10);
    if (m >= 1 && m <= 12) {
      monthsSet.add(m);
    }
  }

  return Array.from(monthsSet).sort((a, b) => a - b);
}

/**
 * CuratedTripProposal 제안을 PresetTripPlan(템플릿) 형식으로 변환
 */
export function convertProposalToPreset(prop: CuratedTripProposal) {
  const schedule = prop.timeline.map((day, dayIdx) => ({
    dayOffset: dayIdx,
    items: day.items.map(it => ({
      time: it.time,
      type: (it.type || 'activity') as 'transit' | 'activity' | 'dining' | 'stay',
      place: it.title,
      memo: it.memo,
      cost: ''
    }))
  }));

  const themeToUse = ['shopping', 'food', 'activity', 'nature', 'art', 'culture'].includes(prop.theme)
    ? (prop.theme as 'shopping' | 'food' | 'activity' | 'nature' | 'art' | 'culture')
    : 'culture';

  return {
    id: `custom-template-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: prop.title,
    subtitle: prop.subtitle,
    country: prop.countryEn,
    city: prop.cityName,
    durationDays: prop.durationDays,
    tags: [prop.countryEn, prop.theme.toUpperCase(), ...prop.tags],
    coverImg: prop.coverImg,
    theme: themeToUse,
    highlights: prop.highlights,
    schedule,
    isCustom: true
  };
}

/**
 * 선택 지역 및 월에 따른 스위스 미니멀 기후/기온 메트릭
 */
export function getClimateMiniMetric(cityNameKo?: string, countryNameKo?: string, month: number = 10): string {
  const cName = cityNameKo || '';
  const cntry = countryNameKo || '';

  // 동남아/열대권 특성
  const isTropical = ['방콕', '다낭', '발리', '싱가포르', '하노이', '푸켓', '치앙마이', '세부', '보라카이'].some(t => cName.includes(t)) ||
    ['태국', '베트남', '인도네시아', '필리핀', '싱가포르', '말레이시아'].some(t => cntry.includes(t));

  if (isTropical) {
    if ([11, 12, 1, 2].includes(month)) {
      return 'AVG 27~30°C · 건기 최적 시즌 · 비가 적고 쾌적한 관광';
    } else if ([3, 4, 5].includes(month)) {
      return 'AVG 33~36°C · 핫 시즌 · 실내 쇼핑몰 & 나이트마켓 추천';
    } else {
      return 'AVG 29~32°C · 우기 스콜 시즌 · 스콜 대비 & 칠링 휴양';
    }
  }

  // 삿포로 등 한랭지
  if (['삿포로', '하코다테', '오타루'].some(t => cName.includes(t))) {
    if ([12, 1, 2].includes(month)) {
      return 'AVG -4~-1°C · 파우더 스노우 시즌 · 설경 & 눈축제 이상적';
    } else if ([7, 8].includes(month)) {
      return 'AVG 21~25°C · 청정 여름 시즌 · 라벤더 꽃밭 & 쾌적한 산책';
    }
  }

  // 온대 북반구 기본
  if ([3, 4, 5].includes(month)) {
    return 'AVG 15~21°C · 온화하고 화창한 봄 시즌 · 쾌적한 도심 산책';
  } else if ([6, 7, 8].includes(month)) {
    return 'AVG 26~31°C · 활기찬 여름 썸머 페스티벌 · 쿨링 실내 & 야경 투어';
  } else if ([9, 10, 11].includes(month)) {
    return 'AVG 16~22°C · 맑고 청명한 단풍 최적 시즌 · 야외 관광 이상적';
  } else {
    return 'AVG 4~11°C · 차분한 윈터 라이프 & 온천/미식 · 낭만적인 도시 야경';
  }
}

/**
 * 주어진 월의 2번째 금요일(주말 연계 추천 출발일) 날짜 구하기
 */
function getSecondFridayOfMonth(year: number, month: number): Date {
  const d = new Date(year, month - 1, 1);
  let fridayCount = 0;
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 5) {
      fridayCount++;
      if (fridayCount === 2) {
        return new Date(d);
      }
    }
    d.setDate(d.getDate() + 1);
  }
  // 혹시 못 찾으면 15일 반환
  return new Date(year, month - 1, 15);
}

function formatDateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 현재 시점 기준 가장 가까운 최적 출발 시기 산출
 */
export function calculateNearestBestDate(
  city: DestinationCity,
  baseYear?: number,
  targetMonth?: number,
  durationDays: number = 3
): { startDate: string; endDate: string; startMonth: number; isUpcomingBest: boolean } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  const yearToUse = baseYear && baseYear >= currentYear ? baseYear : currentYear;
  const bestMonths = city.bestMonths && city.bestMonths.length > 0 ? city.bestMonths : [4, 5, 9, 10, 11];

  let chosenYear = yearToUse;
  let chosenMonth: number;
  let isUpcomingBest = true;

  if (targetMonth && targetMonth >= 1 && targetMonth <= 12) {
    // 사용자가 특정 월을 지정한 경우
    chosenMonth = targetMonth;
    // 지정된 연도가 현재 연도인데 이미 해당 월의 중순이 지났다면 이듬해로 이월
    if (chosenYear === currentYear && (chosenMonth < currentMonth || (chosenMonth === currentMonth && currentDay > 20))) {
      chosenYear = currentYear + 1;
    }
    isUpcomingBest = bestMonths.includes(chosenMonth);
  } else {
    // 사용자가 월을 정하지 않고 가장 가까운 최적 시기를 요구한 경우
    if (chosenYear === currentYear) {
      // 올해 남은 월 중 bestMonths 탐색
      const remainingBest = bestMonths.filter(m => m > currentMonth || (m === currentMonth && currentDay <= 15));
      if (remainingBest.length > 0) {
        chosenMonth = remainingBest[0];
      } else {
        // 올해 최적 시즌이 모두 지났으면 내년의 첫 최적 월
        chosenYear = currentYear + 1;
        chosenMonth = bestMonths[0];
      }
    } else {
      // 다른 미래 연도를 지정한 경우 해당 연도의 첫 번째 최적 월
      chosenMonth = bestMonths[0];
    }
  }

  const startDateObj = getSecondFridayOfMonth(chosenYear, chosenMonth);
  const endDateObj = new Date(startDateObj);
  endDateObj.setDate(endDateObj.getDate() + durationDays);

  return {
    startDate: formatDateToIso(startDateObj),
    endDate: formatDateToIso(endDateObj),
    startMonth: chosenMonth,
    isUpcomingBest
  };
}

/**
 * 테마별 감성 타이틀 & 서브타이틀 템플릿
 */
const THEME_PRESETS_META: Record<string, {
  label: string;
  titleTemplates: ((city: string) => string)[];
  subtitleTemplates: string[];
}> = {
  food: {
    label: 'FOOD · 미식 탐방',
    titleTemplates: [
      (city) => `${city} 골목 미식 & 심야 식당 여정`,
      (city) => `${city} 로컬 미식과 감성 카페 투어`,
      (city) => `${city} 셰프들의 숨은 맛집 탐방 트립`
    ],
    subtitleTemplates: [
      '현지인이 사랑하는 대표 골목 맛집과 계절 별미를 즐기는 미식 여행',
      '전통 시장부터 미슐랭 다이닝까지 오감을 만족시키는 코스',
      '소박한 로컬 맛집과 감성 디저트를 음미하는 여유로운 동선'
    ]
  },
  shopping: {
    label: 'SHOPPING · 도심 트렌드',
    titleTemplates: [
      (city) => `${city} 어반 라이프스타일 & 셀렉트샵 투어`,
      (city) => `${city} 트렌드 거리 & 백화점 럭셔리 쇼핑`,
      (city) => `${city} 빈티지 마켓과 디자이너 브랜드 산책`
    ],
    subtitleTemplates: [
      '핫한 편집숍과 부티크 거리를 둘러보는 스타일리시한 도시 여정',
      '도심의 감각적인 플래그십 스토어와 기념품 쇼핑을 함께 즐기는 일정',
      '골목 구석구석 숨은 디자이너 샵과 면세 쇼핑을 만끽하는 코스'
    ]
  },
  nature: {
    label: 'NATURE · 힐링 자연',
    titleTemplates: [
      (city) => `${city} 근교 자연 & 피톤치드 힐링 트립`,
      (city) => `${city} 해변과 노을이 머무는 휴식 여정`,
      (city) => `${city} 숲길 산책과 고즈넉한 온천 쉼표`
    ],
    subtitleTemplates: [
      '도심의 번잡함을 벗어나 맑은 공기와 풍경 속에서 재충전하는 시간',
      '계절의 아름다움이 깃든 자연 공원과 탁 트인 전망을 즐기는 여행',
      '몸과 마음을 편안하게 녹여주는 자연 속 휴양 코스'
    ]
  },
  activity: {
    label: 'ACTIVITY · 액티비티',
    titleTemplates: [
      (city) => `${city} 다이내믹 시티 & 어드벤처 투어`,
      (city) => `${city} 테마파크 & 야경 명소 익스플로어`,
      (city) => `${city} 바이크 라이딩과 아웃도어 트립`
    ],
    subtitleTemplates: [
      '활기 넘치는 어트랙션과 이색 체험으로 가득 채운 다채로운 여정',
      '랜드마크 전망대부터 액티브한 레저까지 신나는 탐험 코스',
      '도시의 숨겨진 뷰포인트를 찾아 걷고 즐기는 액티비티'
    ]
  },
  art: {
    label: 'ART · 문화 예술',
    titleTemplates: [
      (city) => `${city} 뮤지엄 & 건축 디자인 산책`,
      (city) => `${city} 예술 골목과 헤리티지 감성 투어`,
      (city) => `${city} 갤러리와 현대 건축을 만나는 여정`
    ],
    subtitleTemplates: [
      '세계적인 미술관과 감각적인 현대 건축물을 감상하는 인스피레이션 코스',
      '역사 깊은 유적과 현대적 예술 공간이 조화를 이루는 문화 여행',
      '도시의 고유한 예술적 감성과 영감을 채우는 시간'
    ]
  },
  all: {
    label: 'DISCOVERY · 올라운드 여정',
    titleTemplates: [
      (city) => `${city} 핵심 랜드마크 & 올라운드 트립`,
      (city) => `${city} 에센셜 시티 익스플로어`,
      (city) => `${city} 첫 여행자를 위한 시그니처 코스`
    ],
    subtitleTemplates: [
      '도시의 대표 랜드마크와 로컬 분위기를 균형 있게 누리는 완성형 여정',
      '핵심 관광 명소와 현지인의 일상을 모두 경험하는 완벽한 동선',
      '누구와 떠나도 실패 없는 시그니처 추천 코스'
    ]
  }
};

/**
 * 도시와 테마에 맞는 추천 여정 제안 생성기
 */
export function generateCuratedTripProposals(criteria: TripCriteria): CuratedTripProposal[] {
  const {
    theme = 'all',
    continent = 'all',
    country = null,
    city = null,
    targetYear,
    targetMonth,
    durationDays: rawDuration,
    seedOffset = 0
  } = criteria;

  // 1. 후보 도시 선별 풀(Pool) 생성
  let candidateCities: DestinationCity[] = [];

  if (city) {
    // 특정 도시가 지정된 경우 해당 도시 단독
    candidateCities = [city];
  } else if (country) {
    // 국가가 지정된 경우 해당 국가의 도시들
    candidateCities = WORLD_CITIES.filter(c => 
      c.countryEn.toLowerCase() === country.nameEn.toLowerCase() ||
      c.countryKo === country.nameKo
    );
  } else {
    // 국가/도시 미지정: 대륙 필터 반영
    if (continent && continent !== 'all') {
      const allowedCountries = CONTINENT_COUNTRY_MAP[continent] || [];
      candidateCities = WORLD_CITIES.filter(c => allowedCountries.includes(c.countryEn.toUpperCase()));
    } else {
      candidateCities = [...WORLD_CITIES];
    }
  }

  // 2. 테마 필터링 (all이 아닌 경우 태그 일치 우선)
  if (theme !== 'all' && !city) {
    const themeKeyword = theme.toLowerCase();
    const matched = candidateCities.filter(c => 
      (c.tags || []).some(t => t.toLowerCase().includes(themeKeyword))
    );
    if (matched.length >= 3) {
      candidateCities = matched;
    }
  }

  // 3. 시기(targetMonth) 필터링 우선 정렬
  if (targetMonth && targetMonth >= 1 && targetMonth <= 12 && !city) {
    const bestInMonth = candidateCities.filter(c => (c.bestMonths || []).includes(targetMonth));
    if (bestInMonth.length >= 3) {
      candidateCities = bestInMonth;
    }
  }

  // 후보 도시가 부족할 경우 fallback
  if (candidateCities.length === 0) {
    candidateCities = [...WORLD_CITIES];
  }

  // 4. 상황별 3개 여정 조합 생성
  const proposals: CuratedTripProposal[] = [];

  // 상황 A: 단일 도시가 정해진 경우 (사례 2의 도시 선택 시) -> 3가지 다른 테마의 여정 제안
  if (city) {
    const themeList = ['food', 'shopping', 'nature', 'art', 'activity'];
    const chosenThemes = theme !== 'all' 
      ? [theme, ...themeList.filter(t => t !== theme).slice(0, 2)]
      : ['food', 'shopping', 'nature'];

    const durations = rawDuration ? [rawDuration, rawDuration, rawDuration] : [3, 4, 5];

    chosenThemes.forEach((tKey, idx) => {
      const dur = durations[idx % durations.length];
      const dateCalc = calculateNearestBestDate(city, targetYear, targetMonth, dur);
      const meta = THEME_PRESETS_META[tKey] || THEME_PRESETS_META.all;
      const title = meta.titleTemplates[(idx + seedOffset) % meta.titleTemplates.length](city.nameKo);
      const subtitle = meta.subtitleTemplates[(idx + seedOffset) % meta.subtitleTemplates.length];

      const spots = [...(city.iconicSpots || []), ...(city.hiddenGems || [])];
      const highlights = spots.slice(idx * 2, idx * 2 + 3);
      if (highlights.length === 0) highlights.push(`${city.nameKo} 중심가`, `${city.nameKo} 대표 랜드마크`);

function buildRichCuratedTimeline(
  city: DestinationCity,
  startDateStr: string,
  durationDays: number,
  themeKey: string,
  highlights: string[]
): { date: string; items: { time: string; title: string; location: string; memo: string; category: string; type: 'activity' | 'dining' | 'stay' | 'transit' }[] }[] {
  const totalDays = durationDays + 1;
  const meta = THEME_PRESETS_META[themeKey] || THEME_PRESETS_META.all;
  const spots = [...highlights, ...(city.iconicSpots || []), ...(city.hiddenGems || [])];

  return Array.from({ length: totalDays }).map((_, dIdx) => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + dIdx);
    const dStr = formatDateToIso(d);
    const isFirstDay = dIdx === 0;
    const isLastDay = dIdx === totalDays - 1;

    const spotA = spots[dIdx % spots.length] || `${city.nameKo} 대표 명소`;
    const spotB = spots[(dIdx + 1) % spots.length] || `${city.nameKo} 테마 스팟`;

    if (isFirstDay) {
      return {
        date: dStr,
        items: [
          {
            time: '10:00 AM',
            title: `${city.nameKo} 도착 및 이동`,
            location: `${city.nameKo} 공항 / 중심역`,
            memo: '현지 도착 후 도심 이동 및 교통편 확인',
            category: '교통',
            type: 'transit' as const
          },
          {
            time: '12:00 PM',
            title: '호텔 체크인 & 짐 보관',
            location: `${city.nameKo} 도심 숙소`,
            memo: '숙소 체크인 또는 짐 보관 후 가벼운 복장으로 출발',
            category: '숙소',
            type: 'stay' as const
          },
          {
            time: '01:30 PM',
            title: `${city.nameKo} 로컬 런치`,
            location: `${city.nameKo} 미식 거리`,
            memo: '현지인들이 즐겨 찾는 첫 번째 로컬 다이닝',
            category: '식사',
            type: 'dining' as const
          },
          {
            time: '03:30 PM',
            title: spotA,
            location: spotA,
            memo: `${meta.label} 큐레이터 추천 핵심 랜드마크 탐방`,
            category: '관광',
            type: 'activity' as const
          },
          {
            time: '07:00 PM',
            title: `${city.nameKo} 시그니처 디너`,
            location: `${city.nameKo} 야경 거리`,
            memo: '첫날의 여독을 푸는 여유로운 정찬 및 야경 산책',
            category: '식사',
            type: 'dining' as const
          }
        ]
      };
    }

    if (isLastDay) {
      return {
        date: dStr,
        items: [
          {
            time: '09:30 AM',
            title: '호텔 체크아웃',
            location: `${city.nameKo} 숙소`,
            memo: '체크아웃 후 짐 정리 및 마지막 날 일정 준비',
            category: '숙소',
            type: 'stay' as const
          },
          {
            time: '11:00 AM',
            title: spotA,
            location: spotA,
            memo: '여행을 마무리하는 감성 명소 및 기념품 쇼핑',
            category: '관광',
            type: 'activity' as const
          },
          {
            time: '01:00 PM',
            title: '마지막 로컬 런치 & 카페',
            location: `${city.nameKo} 카페거리`,
            memo: '현지 스페셜티 커피와 함께 여정 기록 정리',
            category: '식사',
            type: 'dining' as const
          },
          {
            time: '04:00 PM',
            title: `${city.nameKo} 공항 이동 & 출국 수속`,
            location: `${city.nameKo} 국제공항`,
            memo: '공항 도착, 면세점 쇼핑 및 귀국 항공편 탑승',
            category: '교통',
            type: 'transit' as const
          }
        ]
      };
    }

    return {
      date: dStr,
      items: [
        {
          time: '09:30 AM',
          title: '모닝 브런치 & 베이커리',
          location: `${city.nameKo} 감성 카페`,
          memo: '신선한 로컬 브런치로 상쾌하게 시작하는 아침',
          category: '식사',
          type: 'dining' as const
        },
        {
          time: '11:00 AM',
          title: spotA,
          location: spotA,
          memo: `${meta.label} 테마를 온전히 느끼는 대표 명소 투어`,
          category: '관광',
          type: 'activity' as const
        },
        {
          time: '01:30 PM',
          title: `${city.nameKo} 숨은 맛집 탐방`,
          location: `${city.nameKo} 골목 맛집`,
          memo: '큐레이터가 엄선한 현지식 오리지널 미식',
          category: '식사',
          type: 'dining' as const
        },
        {
          time: '03:30 PM',
          title: spotB,
          location: spotB,
          memo: '도심 속 여유와 이국적인 정취를 즐기는 스팟',
          category: '관광',
          type: 'activity' as const
        },
        {
          time: '07:30 PM',
          title: `${city.nameKo} 로컬 나이트 라이프`,
          location: `${city.nameKo} 야간 명소`,
          memo: '아름다운 야경과 함께하는 디너 & 바 타임',
          category: '식사',
          type: 'dining' as const
        }
      ]
    };
  });
}

      const timeline = buildRichCuratedTimeline(city, dateCalc.startDate, dur, tKey, highlights);

      proposals.push({
        id: `proposal-${city.nameEn}-${tKey}-${idx}`,
        title,
        subtitle,
        countryEn: city.countryEn,
        countryKo: city.countryKo,
        cityName: city.nameKo,
        cityObj: city,
        theme: tKey,
        themeLabel: meta.label,
        startDate: dateCalc.startDate,
        endDate: dateCalc.endDate,
        durationDays: dur,
        nightsDays: `${dur}박 ${dur + 1}일`,
        coverImg: city.coverImage,
        seasonBadge: `${dateCalc.startMonth}월 최적 시즌`,
        seasonNote: dateCalc.isUpcomingBest
          ? `${dateCalc.startMonth}월은 ${city.nameKo}을(를) 여행하기 가장 온화하고 쾌적한 최적 시기입니다.`
          : `${dateCalc.startMonth}월 방문 일정 — 현지 분위기를 만끽할 수 있는 시즌입니다.`,
        highlights,
        tags: [city.countryEn, tKey.toUpperCase(), `${dur}박${dur + 1}일`],
        locations: [{ name: city.nameKo, lat: city.lat, lng: city.lng, country: city.countryEn }],
        timeline
      });
    });

    return proposals;
  }

  // 상황 B: 도시가 미정인 경우 (사례 1, 사례 3, 사례 4, 사례 5) -> 3개의 매력적인 도시를 선정하여 제안
  // 셔플 알고리즘 적용
  const shuffled = [...candidateCities].sort((a, b) => {
    const hashA = (a.nameEn.length * 31 + seedOffset * 17) % 100;
    const hashB = (b.nameEn.length * 31 + seedOffset * 17) % 100;
    return hashA - hashB;
  });

  // 서로 다른 3개 도시 선택
  const selectedCities: DestinationCity[] = [];
  const seenCountries = new Set<string>();

  for (const c of shuffled) {
    if (selectedCities.length >= 3) break;
    if (country) {
      // 국가가 지정된 경우: 해당 국가 내 서로 다른 도시들을 3개 채움
      if (!selectedCities.some(sc => sc.nameEn === c.nameEn)) {
        selectedCities.push(c);
      }
    } else {
      // 국가 미지정인 경우: 여러 국가로 분산되도록 우선 선별
      if (!seenCountries.has(c.countryEn) || candidateCities.length <= 5) {
        selectedCities.push(c);
        seenCountries.add(c.countryEn);
      }
    }
  }

  // 3개가 안 채워졌으면 중복 국가라도 채움
  if (selectedCities.length < 3) {
    for (const c of shuffled) {
      if (selectedCities.length >= 3) break;
      if (!selectedCities.some(sc => sc.nameEn === c.nameEn)) {
        selectedCities.push(c);
      }
    }
  }

  const durToUse = rawDuration || 4;

  selectedCities.forEach((cObj, idx) => {
    const activeTheme = theme !== 'all' ? theme : (['food', 'nature', 'shopping'][idx % 3]);
    const dateCalc = calculateNearestBestDate(cObj, targetYear, targetMonth, durToUse);
    const meta = THEME_PRESETS_META[activeTheme] || THEME_PRESETS_META.all;
    const title = meta.titleTemplates[(idx + seedOffset) % meta.titleTemplates.length](cObj.nameKo);
    const subtitle = meta.subtitleTemplates[(idx + seedOffset) % meta.subtitleTemplates.length];

    const spots = [...(cObj.iconicSpots || []), ...(cObj.hiddenGems || [])];
    const highlights = spots.slice(0, 3);
    if (highlights.length === 0) highlights.push(`${cObj.nameKo} 중심가`, `${cObj.nameKo} 대표 명소`);

    const timeline = buildRichCuratedTimeline(cObj, dateCalc.startDate, durToUse, activeTheme, highlights);

    proposals.push({
      id: `proposal-${cObj.nameEn}-${activeTheme}-${idx}`,
      title,
      subtitle,
      countryEn: cObj.countryEn,
      countryKo: cObj.countryKo,
      cityName: cObj.nameKo,
      cityObj: cObj,
      theme: activeTheme,
      themeLabel: meta.label,
      startDate: dateCalc.startDate,
      endDate: dateCalc.endDate,
      durationDays: durToUse,
      nightsDays: `${durToUse}박 ${durToUse + 1}일`,
      coverImg: cObj.coverImage,
      seasonBadge: `${dateCalc.startMonth}월 최적 시즌`,
      seasonNote: dateCalc.isUpcomingBest
        ? `${dateCalc.startMonth}월은 ${cObj.nameKo}을(를) 여행하기 가장 온화하고 쾌적한 최적 시기입니다.`
        : `${dateCalc.startMonth}월 출발 — 현지 분위기를 만끽할 수 있는 추천 일정입니다.`,
      highlights,
      tags: [cObj.countryEn, activeTheme.toUpperCase(), `${durToUse}박${durToUse + 1}일`],
      locations: [{ name: cObj.nameKo, lat: cObj.lat, lng: cObj.lng, country: cObj.countryEn }],
      timeline
    });
  });

  return proposals;
}
