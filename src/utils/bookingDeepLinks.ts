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

// Global Hub City -> Agoda Numeric City ID Mapping
const CITY_TO_AGODA_ID_MAP: Record<string, string> = {
  // Japan
  '도쿄': '5085',
  'tokyo': '5085',
  '나리타': '5085',
  '하네다': '5085',
  '오사카': '14549',
  'osaka': '14549',
  '간사이': '14549',
  '교토': '1784',
  'kyoto': '1784',
  '후쿠오카': '13840',
  'fukuoka': '13840',
  '하카타': '13840',
  '텐진': '13840',
  '삿포로': '14555',
  'sapporo': '14555',
  '홋카이도': '14555',
  '오키나와': '17180',
  'okinawa': '17180',
  '나하': '17180',
  '나고야': '14551',
  'nagoya': '14551',
  '고베': '14550',
  'kobe': '14550',
  '히로시마': '14552',
  'hiroshima': '14552',
  '다카마쓰': '14554',
  'takamatsu': '14554',
  '유후인': '85834',
  '벳푸': '18398',

  // Korea
  '서울': '14690',
  'seoul': '14690',
  '부산': '14692',
  'busan': '14692',
  '제주': '14694',
  'jeju': '14694',
  '인천': '14691',
  'incheon': '14691',
  '강릉': '14697',
  'gangneung': '14697',
  '속초': '14699',
  'sokcho': '14699',
  '경주': '14695',
  'gyeongju': '14695',
  '전주': '14700',
  '여수': '14705',

  // Southeast Asia
  '다낭': '16440',
  'danang': '16440',
  '나트랑': '2679',
  'nhatrang': '2679',
  '호치민': '13170',
  'hochiminh': '13170',
  '하노이': '2758',
  'hanoi': '2758',
  '푸꾸옥': '85873',
  '방콕': '9395',
  'bangkok': '9395',
  '치앙마이': '7401',
  'chiangmai': '7401',
  '푸켓': '16056',
  'phuket': '16056',
  '싱가포르': '4064',
  'singapore': '4064',
  '발리': '17193',
  'bali': '17193',
  '세부': '4010',
  'cebu': '4010',
  '보라카이': '17464',
  'boracay': '17464',
  '마닐라': '8584',
  'manila': '8584',
  '코타키나발루': '14526',
  '쿠알라룸푸르': '14524',

  // East Asia
  '타이베이': '4951',
  'taipei': '4951',
  '가오슝': '756',
  'kaohsiung': '756',
  '홍콩': '16808',
  'hongkong': '16808',
  '마카오': '1845',
  'macau': '1845',
  '상하이': '14522',
  'shanghai': '14522',
  '베이징': '14521',
  'beijing': '14521',
  '칭다오': '14520',
  'qingdao': '14520',

  // Americas & Oceania
  '괌': '1841',
  'guam': '1841',
  '사이판': '1842',
  'saipan': '1842',
  '하와이': '2365',
  '호놀룰루': '2365',
  'hawaii': '2365',
  'honolulu': '2365',
  '뉴욕': '318',
  'newyork': '318',
  '로스앤젤레스': '16822',
  'la': '16822',
  'losangeles': '16822',
  '샌프란시스코': '16823',
  'sanfrancisco': '16823',
  '라스베이거스': '17040',
  'lasvegas': '17040',
  '시드니': '1303',
  'sydney': '1303',
  '멜버른': '1300',
  'melbourne': '1300',
  '오클랜드': '1308',
  'auckland': '1308',

  // Europe
  '파리': '1574',
  'paris': '1574',
  '런던': '2114',
  'london': '2114',
  '로마': '708',
  'rome': '708',
  '바르셀로나': '1787',
  'barcelona': '1787',
  '마드리드': '18687',
  'madrid': '18687',
  '프랑크푸르트': '16850',
  'frankfurt': '16850',
  '취리히': '2310',
  '인터라켄': '2310',
  'zurich': '2310',
  '프라하': '1578',
  'prague': '1578',
  '비엔나': '1577',
  'vienna': '1577',
};

/**
 * Infer Agoda numeric City ID from destination string
 */
export function inferAgodaCityId(dest: string): string | undefined {
  if (!dest) return '5085';
  const clean = dest.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

  for (const [key, id] of Object.entries(CITY_TO_AGODA_ID_MAP)) {
    if (clean.includes(key)) {
      return id;
    }
  }
  return undefined;
}

// ── ACCOMMODATION DEEP LINKS ──────────────────────────────────────────────────

export function buildAgodaUrl(ctx: BookingSearchContext): string {
  const rawDest = (ctx.destination || 'Tokyo').trim();
  const cityId = inferAgodaCityId(rawDest);
  const checkIn = formatDate(ctx.departDate, 'standard');
  const checkOut = ctx.returnDate ? formatDate(ctx.returnDate, 'standard') : checkIn;
  const adults = Math.max(1, ctx.adults || 1);
  const rooms = Math.max(1, ctx.rooms || 1);

  // If a known Agoda City ID is found, direct to ko-kr/search with exact city code and dates (HTTP 200, dates 100% applied)
  if (cityId) {
    return `https://www.agoda.com/ko-kr/search?city=${cityId}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}`;
  }

  // Fallback for custom unmapped cities: use Agoda partner router which safely preserves checkin/checkout dates upon redirect
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
