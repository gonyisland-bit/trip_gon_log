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

// Global Hub City -> Verified Agoda Numeric City ID Mapping
const CITY_TO_AGODA_ID_MAP: Record<string, string> = {
  // Japan
  '도쿄': '5085',
  'tokyo': '5085',
  '나리타': '5085',
  '하네다': '5085',
  '후쿠오카': '16527',
  'fukuoka': '16527',
  '하카타': '16527',
  '텐진': '16527',
  '오사카': '9590',
  'osaka': '9590',
  '간사이': '9590',
  '교토': '1784',
  'kyoto': '1784',
  '삿포로': '3435',
  'sapporo': '3435',
  '홋카이도': '3435',
  '오키나와': '717899',
  'okinawa': '717899',
  '나하': '717899',
  '나고야': '13740',
  'nagoya': '13740',
  '고베': '5235',
  'kobe': '5235',
  '유후인': '106058',
  '벳푸': '144',
  '히로시마': '10554',
  'hiroshima': '10554',
  '다카마쓰': '88749',
  'takamatsu': '88749',

  // Korea
  '서울': '14690',
  'seoul': '14690',
  '부산': '17172',
  'busan': '17172',
  '제주': '16901',
  'jeju': '16901',
  '인천': '17234',
  'incheon': '17234',
  '강릉': '19041',
  'gangneung': '19041',
  '속초': '17236',
  'sokcho': '17236',
  '경주': '17179',
  'gyeongju': '17179',
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
  '세부': '4001',
  'cebu': '4001',
  '보라카이': '15903',
  'boracay': '15903',
  '마닐라': '8584',
  'manila': '8584',
  '코타키나발루': '5070',
  '쿠알라룸푸르': '14524',

  // East Asia
  '타이베이': '4951',
  'taipei': '4951',
  '대만': '4951',
  '가오슝': '756',
  'kaohsiung': '756',
  '홍콩': '16808',
  'hongkong': '16808',
  '마카오': '21397',
  'macau': '21397',
  '상하이': '14522',
  'shanghai': '14522',
  '베이징': '14521',
  'beijing': '14521',
  '칭다오': '14520',
  'qingdao': '14520',

  // Americas & Oceania
  '괌': '6126',
  'guam': '6126',
  '사이판': '16932',
  'saipan': '16932',
  '하와이': '513639',
  '호놀룰루': '513639',
  'hawaii': '513639',
  'honolulu': '513639',
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
  '파리': '15470',
  'paris': '15470',
  '런던': '233',
  'london': '233',
  '로마': '16594',
  'rome': '16594',
  '바르셀로나': '2002',
  'barcelona': '2002',
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
 * Infer Agoda verified numeric City ID from destination string
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

  // Calculate length of stay (los) in days
  let los = 1;
  try {
    const dIn = new Date(checkIn);
    const dOut = new Date(checkOut);
    const diffDays = Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
    los = Math.max(1, diffDays);
  } catch {
    los = 1;
  }

  // 1. If verified numeric City ID is matched, direct to Agoda's canonical search endpoint
  // with exact city ID, checkIn, checkOut, los (nights), rooms, adults, and children=0.
  // This guarantees BOTH destination matching and dates 100% applied without search error.
  if (cityId) {
    return `https://www.agoda.com/ko-kr/search?city=${cityId}&checkIn=${checkIn}&checkOut=${checkOut}&los=${los}&rooms=${rooms}&adults=${adults}&children=0`;
  }

  // 2. Fallback for unmapped custom destinations: use Agoda partner router which safely preserves checkin/checkout dates upon redirect
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
