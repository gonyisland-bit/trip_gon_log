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

// ── ACCOMMODATION DEEP LINKS ──────────────────────────────────────────────────

export function buildAgodaUrl(ctx: BookingSearchContext): string {
  const city = encodeURIComponent(ctx.destination || 'Tokyo');
  const checkIn = formatDate(ctx.departDate, 'standard');
  const checkOut = ctx.returnDate ? formatDate(ctx.returnDate, 'standard') : checkIn;
  const adults = Math.max(1, ctx.adults || 1);
  const rooms = Math.max(1, ctx.rooms || 1);

  return `https://www.agoda.com/search?city=${city}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}`;
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
