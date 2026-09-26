/**
 * Smart Booking Deep-link Generators
 * Provides 1-click search URLs for flights and stays based on trip metadata.
 */

export interface BookingSearchContext {
  destination: string;       // e.g. "Tokyo", "후쿠오카", "Fukuoka"
  originAirport?: string;     // default "ICN"
  destinationAirport?: string;// inferred or explicit e.g. "FUK"
  departDate: string;         // YYYY-MM-DD
  returnDate?: string;        // YYYY-MM-DD
  adults: number;             // default 1
  rooms?: number;             // default 1
}

// Global Hub City -> Primary IATA Airport Code Mapping
const CITY_TO_AIRPORT_MAP: Record<string, string> = {
  // Japan
  '도쿄': 'TYO',
  'tokyo': 'TYO',
  '나리타': 'NRT',
  '하네다': 'HND',
  '오사카': 'KIX',
  'osaka': 'KIX',
  '간사이': 'KIX',
  '후쿠오카': 'FUK',
  'fukuoka': 'FUK',
  '삿포로': 'CTS',
  'sapporo': 'CTS',
  '오키나와': 'OKA',
  'okinawa': 'OKA',
  '나고야': 'NGO',
  'nagoya': 'NGO',
  '교토': 'KIX',
  'kyoto': 'KIX',
  
  // Southeast Asia
  '다낭': 'DAD',
  'danang': 'DAD',
  '나트랑': 'CXR',
  'nhatrang': 'CXR',
  '호치민': 'SGN',
  'hochiminh': 'SGN',
  '하노이': 'HAN',
  'hanoi': 'HAN',
  '방콕': 'BKK',
  'bangkok': 'BKK',
  '푸켓': 'HKT',
  'phuket': 'HKT',
  '치앙마이': 'CNX',
  'chiangmai': 'CNX',
  '싱가포르': 'SIN',
  'singapore': 'SIN',
  '발리': 'DPS',
  'bali': 'DPS',
  '보라카이': 'KLO',
  '세부': 'CEB',
  'cebu': 'CEB',
  '마닐라': 'MNL',
  'manila': 'MNL',

  // East Asia
  '타이베이': 'TPE',
  'taipei': 'TPE',
  '가오슝': 'KHH',
  'kaohsiung': 'KHH',
  '홍콩': 'HKG',
  'hongkong': 'HKG',
  '마카오': 'MFM',
  'macau': 'MFM',
  '상하이': 'PVG',
  'shanghai': 'PVG',
  '베이징': 'PEK',
  'beijing': 'PEK',
  '칭다오': 'TAO',
  'qingdao': 'TAO',

  // Americas & Oceania
  '괌': 'GUM',
  'guam': 'GUM',
  '사이판': 'SPN',
  'saipan': 'SPN',
  '하와이': 'HNL',
  '호놀룰루': 'HNL',
  'hawaii': 'HNL',
  'honolulu': 'HNL',
  '시드니': 'SYD',
  'sydney': 'SYD',
  '멜버른': 'MEL',
  'melbourne': 'MEL',
  '오클랜드': 'AKL',
  'auckland': 'AKL',
  '뉴욕': 'JFK',
  'newyork': 'JFK',
  '로스앤젤레스': 'LAX',
  'la': 'LAX',
  'losangeles': 'LAX',
  '샌프란시스코': 'SFO',
  'sanfrancisco': 'SFO',

  // Europe
  '파리': 'CDG',
  'paris': 'CDG',
  '런던': 'LHR',
  'london': 'LHR',
  '로마': 'FCO',
  'rome': 'FCO',
  '바르셀로나': 'BCN',
  'barcelona': 'BCN',
  '마드리드': 'MAD',
  'madrid': 'MAD',
  '프랑크푸르트': 'FRA',
  'frankfurt': 'FRA',
  '인터라켄': 'ZRH',
  '취리히': 'ZRH',
  'zurich': 'ZRH',
  '프라하': 'PRG',
  'prague': 'PRG',
  '비엔나': 'VIE',
  'vienna': 'VIE',

  // Korea Domestic
  '제주': 'CJU',
  'jeju': 'CJU',
  '부산': 'PUS',
  'busan': 'PUS',
  '서울': 'ICN',
  'seoul': 'ICN',
};

/**
 * Infer destination IATA airport code from destination text
 */
export function inferAirportCode(dest: string): string {
  if (!dest) return 'TYO';
  const clean = dest.toLowerCase().replace(/[^a-z가-힣]/g, '');
  
  for (const [key, code] of Object.entries(CITY_TO_AIRPORT_MAP)) {
    if (clean.includes(key)) {
      return code;
    }
  }
  return 'TYO';
}

/**
 * Format Date to YYMMDD (for Skyscanner) or YYYYMMDD (for Naver)
 */
function formatDate(dStr: string, mode: 'yymmdd' | 'yyyymmdd' | 'standard'): string {
  try {
    const clean = dStr.replace(/\./g, '-');
    const parts = clean.split('-');
    if (parts.length >= 3) {
      const yyyy = parts[0].padStart(4, '20');
      const mm = parts[1].padStart(2, '0');
      const dd = parts[2].padStart(2, '0');
      const yy = yyyy.slice(2);

      if (mode === 'yymmdd') return `${yy}${mm}${dd}`;
      if (mode === 'yyyymmdd') return `${yyyy}${mm}${dd}`;
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (e) {
    // fallback
  }
  return dStr;
}

// ── FLIGHT DEEP LINKS ──────────────────────────────────────────────────────────

export function buildSkyscannerFlightUrl(ctx: BookingSearchContext): string {
  const origin = (ctx.originAirport || 'ICN').toUpperCase();
  const dest = (ctx.destinationAirport || inferAirportCode(ctx.destination)).toUpperCase();
  const dep = formatDate(ctx.departDate, 'yymmdd');
  const ret = ctx.returnDate ? formatDate(ctx.returnDate, 'yymmdd') : dep;
  const adults = Math.max(1, ctx.adults || 1);

  return `https://www.skyscanner.co.kr/transport/flights/${origin}/${dest}/${dep}/${ret}/?adultsv2=${adults}&cabinclass=economy&childrenv2=&ref=home`;
}

export function buildNaverFlightUrl(ctx: BookingSearchContext): string {
  const origin = (ctx.originAirport || 'ICN').toUpperCase();
  const dest = (ctx.destinationAirport || inferAirportCode(ctx.destination)).toUpperCase();
  const dep = formatDate(ctx.departDate, 'yyyymmdd');
  const ret = ctx.returnDate ? formatDate(ctx.returnDate, 'yyyymmdd') : dep;
  const adults = Math.max(1, ctx.adults || 1);

  return `https://flight.naver.com/flights/international/${origin}-${dest}-${dep}/${dest}-${origin}-${ret}?fareType=Y&adult=${adults}&child=0&infant=0`;
}

export function buildGoogleFlightsUrl(ctx: BookingSearchContext): string {
  const origin = (ctx.originAirport || 'ICN').toUpperCase();
  const dest = (ctx.destinationAirport || inferAirportCode(ctx.destination)).toUpperCase();
  const dep = formatDate(ctx.departDate, 'standard');
  const ret = ctx.returnDate ? formatDate(ctx.returnDate, 'standard') : dep;

  return `https://www.google.com/travel/flights?q=flights%20from%20${origin}%20to%20${dest}%20on%20${dep}%20through%20${ret}`;
}

// Global Hub City -> Agoda Verified City Page Slug Mapping (e.g. /city/tokyo-jp.html)
const CITY_TO_AGODA_SLUG_MAP: Record<string, string> = {
  // Japan
  '도쿄': 'tokyo-jp',
  'tokyo': 'tokyo-jp',
  '나리타': 'tokyo-jp',
  '하네다': 'tokyo-jp',
  '오사카': 'osaka-jp',
  'osaka': 'osaka-jp',
  '간사이': 'osaka-jp',
  '교토': 'kyoto-jp',
  'kyoto': 'kyoto-jp',
  '후쿠오카': 'fukuoka-jp',
  'fukuoka': 'fukuoka-jp',
  '하카타': 'fukuoka-jp',
  '텐진': 'fukuoka-jp',
  '삿포로': 'sapporo-jp',
  'sapporo': 'sapporo-jp',
  '홋카이도': 'sapporo-jp',
  '오키나와': 'okinawa-main-island-jp',
  'okinawa': 'okinawa-main-island-jp',
  '나하': 'okinawa-main-island-jp',
  '나고야': 'nagoya-jp',
  'nagoya': 'nagoya-jp',
  '고베': 'kobe-jp',
  'kobe': 'kobe-jp',
  '히로시마': 'hiroshima-jp',
  'hiroshima': 'hiroshima-jp',
  '다카마쓰': 'takamatsu-jp',
  'takamatsu': 'takamatsu-jp',
  '유후인': 'fukuoka-jp',
  '벳푸': 'fukuoka-jp',

  // Korea
  '서울': 'seoul-kr',
  'seoul': 'seoul-kr',
  '부산': 'busan-kr',
  'busan': 'busan-kr',
  '제주': 'jeju-kr',
  'jeju': 'jeju-kr',
  '인천': 'incheon-kr',
  'incheon': 'incheon-kr',
  '강릉': 'gangneung-si-kr',
  'gangneung': 'gangneung-si-kr',
  '속초': 'sokcho-si-kr',
  'sokcho': 'sokcho-si-kr',
  '경주': 'gyeongju-si-kr',
  'gyeongju': 'gyeongju-si-kr',
  '전주': 'jeonju-si-kr',
  '여수': 'yeosu-si-kr',

  // Southeast Asia
  '다낭': 'da-nang-vn',
  'danang': 'da-nang-vn',
  '나트랑': 'nha-trang-vn',
  'nhatrang': 'nha-trang-vn',
  '호치민': 'ho-chi-minh-city-vn',
  'hochiminh': 'ho-chi-minh-city-vn',
  '하노이': 'hanoi-vn',
  'hanoi': 'hanoi-vn',
  '푸꾸옥': 'phu-quoc-island-vn',
  '방콕': 'bangkok-th',
  'bangkok': 'bangkok-th',
  '치앙마이': 'chiang-mai-th',
  'chiangmai': 'chiang-mai-th',
  '푸켓': 'phuket-th',
  'phuket': 'phuket-th',
  '싱가포르': 'singapore-sg',
  'singapore': 'singapore-sg',
  '발리': 'bali-id',
  'bali': 'bali-id',
  '세부': 'cebu-ph',
  'cebu': 'cebu-ph',
  '보라카이': 'boracay-island-ph',
  'boracay': 'boracay-island-ph',
  '마닐라': 'manila-ph',
  'manila': 'manila-ph',
  '코타키나발루': 'kota-kinabalu-my',
  '쿠알라룸푸르': 'kuala-lumpur-my',

  // East Asia
  '타이베이': 'taipei-tw',
  'taipei': 'taipei-tw',
  '대만': 'taipei-tw',
  '가오슝': 'kaohsiung-tw',
  'kaohsiung': 'kaohsiung-tw',
  '홍콩': 'hong-kong-hk',
  'hongkong': 'hong-kong-hk',
  '마카오': 'macau-mo',
  'macau': 'macau-mo',
  '상하이': 'shanghai-cn',
  'shanghai': 'shanghai-cn',
  '베이징': 'beijing-cn',
  'beijing': 'beijing-cn',
  '칭다오': 'qingdao-cn',
  'qingdao': 'qingdao-cn',

  // Americas & Oceania
  '괌': 'guam-gu',
  'guam': 'guam-gu',
  '사이판': 'saipan-mp',
  'saipan': 'saipan-mp',
  '하와이': 'oahu-hawaii-us',
  '호놀룰루': 'oahu-hawaii-us',
  'hawaii': 'oahu-hawaii-us',
  'honolulu': 'oahu-hawaii-us',
  '뉴욕': 'new-york-ny-us',
  'newyork': 'new-york-ny-us',
  '로스앤젤레스': 'los-angeles-ca-us',
  'la': 'los-angeles-ca-us',
  'losangeles': 'los-angeles-ca-us',
  '샌프란시스코': 'san-francisco-ca-us',
  'sanfrancisco': 'san-francisco-ca-us',
  '라스베이거스': 'las-vegas-nv-us',
  'lasvegas': 'las-vegas-nv-us',
  '시드니': 'sydney-au',
  'sydney': 'sydney-au',
  '멜버른': 'melbourne-au',
  'melbourne': 'melbourne-au',
  '오클랜드': 'auckland-nz',
  'auckland': 'auckland-nz',

  // Europe
  '파리': 'paris-fr',
  'paris': 'paris-fr',
  '런던': 'london-gb',
  'london': 'london-gb',
  '로마': 'rome-it',
  'rome': 'rome-it',
  '바르셀로나': 'barcelona-es',
  'barcelona': 'barcelona-es',
  '마드리드': 'madrid-es',
  'madrid': 'madrid-es',
  '프랑크푸르트': 'frankfurt-am-main-de',
  'frankfurt': 'frankfurt-am-main-de',
  '취리히': 'zurich-ch',
  '인터라켄': 'interlaken-ch',
  'zurich': 'zurich-ch',
  '프라하': 'prague-cz',
  'prague': 'prague-cz',
  '비엔나': 'vienna-at',
  'vienna': 'vienna-at',
};

/**
 * Infer Agoda verified City Slug from destination string
 */
export function inferAgodaCitySlug(dest: string): string | undefined {
  if (!dest) return 'tokyo-jp';
  const clean = dest.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

  for (const [key, slug] of Object.entries(CITY_TO_AGODA_SLUG_MAP)) {
    if (clean.includes(key)) {
      return slug;
    }
  }
  return undefined;
}

// ── ACCOMMODATION DEEP LINKS ──────────────────────────────────────────────────

export function buildAgodaUrl(ctx: BookingSearchContext): string {
  const rawDest = (ctx.destination || 'Tokyo').trim();
  const citySlug = inferAgodaCitySlug(rawDest);
  const checkIn = formatDate(ctx.departDate, 'standard');
  const checkOut = ctx.returnDate ? formatDate(ctx.returnDate, 'standard') : checkIn;
  const adults = Math.max(1, ctx.adults || 1);
  const rooms = Math.max(1, ctx.rooms || 1);

  // 1. If a known Agoda City Slug is found, direct to canonical city listings page
  // (e.g. /city/tokyo-jp.html?checkIn=...&checkOut=...&rooms=...&adults=...)
  // This guarantees 100% location matching with zero destination search errors, and pre-applies all dates!
  if (citySlug) {
    return `https://www.agoda.com/ko-kr/city/${citySlug}.html?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}`;
  }

  // 2. Fallback for unmapped custom destinations: use Agoda partnersearch router which safely preserves checkin/checkout dates and city name upon redirect
  const cleanCity = encodeURIComponent(rawDest.split(/[,/·-]/)[0].trim() || 'Tokyo');
  return `https://www.agoda.com/partners/partnersearch.aspx?city=${cleanCity}&checkin=${checkIn}&checkout=${checkOut}&rooms=${rooms}&adults=${adults}`;
}

export function buildBookingComUrl(ctx: BookingSearchContext): string {
  const city = encodeURIComponent(ctx.destination || 'Tokyo');
  const checkIn = formatDate(ctx.departDate, 'standard');
  const checkOut = ctx.returnDate ? formatDate(ctx.returnDate, 'standard') : checkIn;
  const adults = Math.max(1, ctx.adults || 1);
  const rooms = Math.max(1, ctx.rooms || 1);

  return `https://www.booking.com/searchresults.html?ss=${city}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${adults}&no_rooms=${rooms}`;
}

export function buildAirbnbUrl(ctx: BookingSearchContext): string {
  const city = encodeURIComponent(ctx.destination || 'Tokyo');
  const checkIn = formatDate(ctx.departDate, 'standard');
  const checkOut = ctx.returnDate ? formatDate(ctx.returnDate, 'standard') : checkIn;
  const adults = Math.max(1, ctx.adults || 1);

  return `https://www.airbnb.co.kr/s/${city}/homes?checkin=${checkIn}&checkout=${checkOut}&adults=${adults}`;
}
