// Map hub data and helpers (split out of MapHub.tsx in v1.3 P5-6): country
// facts, city name maps and coordinates, time zones and small geo helpers.

import { Trip, Plan } from '../../types';
import { findCityByNameOrAlias, WORLD_CITIES } from '../../data/worldDestinations';

export interface CountryInfo {
  code: string;
  name: string;
  nameKo: string;
  currency: string;
  currencySymbol: string;
  rateToKRW: number;
  cities: string[];
  center: [number, number]; // [lat, lng]
  zoom: number;
  continent: string;
  continentKo: string;
}

export const COUNTRIES_DATA: CountryInfo[] = [
  // ─── EAST ASIA ─────────────────────────────────────────────────────────────
  {
    code: 'JP',
    name: 'JAPAN',
    nameKo: '일본',
    currency: 'JPY',
    currencySymbol: '¥',
    rateToKRW: 9.30,
    cities: ['TOKYO', 'OSAKA', 'KYOTO', 'FUKUOKA', 'SAPPORO', 'NAGOYA', 'OKINAWA', 'KOBE', 'NARA'],
    center: [35.6762, 139.6503], // Tokyo
    zoom: 5.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'KR',
    name: 'SOUTH KOREA',
    nameKo: '대한민국',
    currency: 'KRW',
    currencySymbol: '₩',
    rateToKRW: 1.0,
    cities: ['SEOUL', 'BUSAN', 'JEJU', 'GANGNEUNG', 'GYEONGJU', 'INCHEON', 'SOKCHO', 'JEONJU'],
    center: [37.5665, 126.9780], // Seoul
    zoom: 6.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'TW',
    name: 'TAIWAN',
    nameKo: '대만',
    currency: 'TWD',
    currencySymbol: 'NT$',
    rateToKRW: 43.2,
    cities: ['TAIPEI', 'KAOHSIUNG', 'TAICHUNG', 'TAINAN', 'HUALIEN', 'JIUFEN'],
    center: [25.0330, 121.5654], // Taipei
    zoom: 7,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'HK',
    name: 'HONG KONG',
    nameKo: '홍콩',
    currency: 'HKD',
    currencySymbol: 'HK$',
    rateToKRW: 177.4,
    cities: ['HONG KONG', 'KOWLOON', 'CENTRAL', 'TSIM SHA TSUI', 'LANTAU'],
    center: [22.2819, 114.1581], // Central
    zoom: 11,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'MO',
    name: 'MACAU',
    nameKo: '마카오',
    currency: 'MOP',
    currencySymbol: 'MOP$',
    rateToKRW: 172.0,
    cities: ['MACAU', 'TAIPA', 'COTAI', 'COLOANE'],
    center: [22.1987, 113.5439], // Macau
    zoom: 12,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'CN',
    name: 'CHINA',
    nameKo: '중국',
    currency: 'CNY',
    currencySymbol: '¥',
    rateToKRW: 191.5,
    cities: ['SHANGHAI', 'BEIJING', 'QINGDAO', 'ZHANGJIAJIE', 'CHENGDU', 'GUANGZHOU', 'XIAN'],
    center: [39.9042, 116.4074], // Beijing
    zoom: 4,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'MN',
    name: 'MONGOLIA',
    nameKo: '몽골',
    currency: 'MNT',
    currencySymbol: '₮',
    rateToKRW: 0.4,
    cities: ['ULAANBAATAR', 'GOBI', 'TERELJ', 'KHUVSGUL'],
    center: [47.9212, 106.9186], // Ulaanbaatar
    zoom: 5,
    continent: 'Asia',
    continentKo: '아시아',
  },

  // ─── SOUTHEAST & SOUTH ASIA ───────────────────────────────────────────────
  {
    code: 'VN',
    name: 'VIETNAM',
    nameKo: '베트남',
    currency: 'VND',
    currencySymbol: '₫',
    rateToKRW: 0.0546,
    cities: ['DA NANG', 'HANOI', 'HO CHI MINH', 'NHA TRANG', 'PHU QUOC', 'HOI AN', 'SAPA'],
    center: [21.0285, 105.8542], // Hanoi
    zoom: 5.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'TH',
    name: 'THAILAND',
    nameKo: '태국',
    currency: 'THB',
    currencySymbol: '฿',
    rateToKRW: 38.4,
    cities: ['BANGKOK', 'CHIANG MAI', 'PHUKET', 'PATTAYA', 'KOH SAMUI', 'KRABI'],
    center: [13.7563, 100.5018], // Bangkok
    zoom: 5.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'PH',
    name: 'PHILIPPINES',
    nameKo: '필리핀',
    currency: 'PHP',
    currencySymbol: '₱',
    rateToKRW: 24.5,
    cities: ['CEBU', 'BORACAY', 'BOHOL', 'MANILA', 'CORON', 'EL NIDO'],
    center: [14.5995, 120.9842], // Manila
    zoom: 5.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'SG',
    name: 'SINGAPORE',
    nameKo: '싱가포르',
    currency: 'SGD',
    currencySymbol: 'S$',
    rateToKRW: 1040,
    cities: ['SINGAPORE', 'SENTOSA', 'MARINA BAY'],
    center: [1.3521, 103.8198], // Singapore
    zoom: 11,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'MY',
    name: 'MALAYSIA',
    nameKo: '말레이시아',
    currency: 'MYR',
    currencySymbol: 'RM',
    rateToKRW: 295.0,
    cities: ['KUALA LUMPUR', 'KOTA KINABALU', 'PENANG', 'LANGKAWI', 'MALACCA'],
    center: [3.1390, 101.6869], // Kuala Lumpur
    zoom: 5.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'ID',
    name: 'INDONESIA',
    nameKo: '인도네시아',
    currency: 'IDR',
    currencySymbol: 'Rp',
    rateToKRW: 0.088,
    cities: ['BALI', 'JAKARTA', 'YOGYAKARTA', 'LOMBOK', 'KOMODO'],
    center: [-6.2088, 106.8456], // Jakarta
    zoom: 5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'LA',
    name: 'LAOS',
    nameKo: '라오스',
    currency: 'LAK',
    currencySymbol: '₭',
    rateToKRW: 0.065,
    cities: ['VIENTIANE', 'LUANG PRABANG', 'VANG VIENG'],
    center: [17.9757, 102.6331], // Vientiane
    zoom: 6,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'KH',
    name: 'CAMBODIA',
    nameKo: '캄보디아',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['SIEM REAP', 'PHNOM PENH', 'KAMPOT'],
    center: [11.5564, 104.9282], // Phnom Penh
    zoom: 6.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'MV',
    name: 'MALDIVES',
    nameKo: '몰디브',
    currency: 'MVR',
    currencySymbol: 'Rf',
    rateToKRW: 90.0,
    cities: ['MALE', 'MAAFUSHI', 'ARI ATOLL'],
    center: [4.1755, 73.5093], // Male
    zoom: 7,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'IN',
    name: 'INDIA',
    nameKo: '인도',
    currency: 'INR',
    currencySymbol: '₹',
    rateToKRW: 16.5,
    cities: ['NEW DELHI', 'MUMBAI', 'JAIPUR', 'AGRA', 'GOA', 'VARANASI'],
    center: [28.6139, 77.2090], // New Delhi
    zoom: 4.5,
    continent: 'Asia',
    continentKo: '아시아',
  },
  {
    code: 'NP',
    name: 'NEPAL',
    nameKo: '네팔',
    currency: 'NPR',
    currencySymbol: '₨',
    rateToKRW: 10.2,
    cities: ['KATHMANDU', 'POKHARA', 'EVEREST'],
    center: [27.7172, 85.3240], // Kathmandu
    zoom: 7,
    continent: 'Asia',
    continentKo: '아시아',
  },

  // ─── EUROPE ────────────────────────────────────────────────────────────────
  {
    code: 'FR',
    name: 'FRANCE',
    nameKo: '프랑스',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['PARIS', 'NICE', 'LYON', 'MARSEILLE', 'BORDEAUX', 'STRASBOURG', 'COLMAR'],
    center: [48.8566, 2.3522], // Paris
    zoom: 5.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'IT',
    name: 'ITALY',
    nameKo: '이탈리아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['ROME', 'FLORENCE', 'VENICE', 'MILAN', 'NAPLES', 'AMALFI', 'POSITANO'],
    center: [41.9028, 12.4964], // Rome
    zoom: 5.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'ES',
    name: 'SPAIN',
    nameKo: '스페인',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BARCELONA', 'MADRID', 'SEVILLE', 'GRANADA', 'VALENCIA', 'MALAGA', 'IBIZA'],
    center: [40.4168, -3.7038], // Madrid
    zoom: 5.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'GB',
    name: 'UNITED KINGDOM',
    nameKo: '영국',
    currency: 'GBP',
    currencySymbol: '£',
    rateToKRW: 1750,
    cities: ['LONDON', 'EDINBURGH', 'MANCHESTER', 'OXFORD', 'CAMBRIDGE', 'LIVERPOOL'],
    center: [51.5074, -0.1278], // London
    zoom: 5.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'CH',
    name: 'SWITZERLAND',
    nameKo: '스위스',
    currency: 'CHF',
    currencySymbol: 'CHF',
    rateToKRW: 1540,
    cities: ['ZURICH', 'INTERLAKEN', 'GENEVA', 'LUCERNE', 'ZERMATT', 'GRINDELWALD'],
    center: [46.9480, 7.4474], // Bern
    zoom: 7,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'DE',
    name: 'GERMANY',
    nameKo: '독일',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BERLIN', 'MUNICH', 'FRANKFURT', 'HAMBURG', 'COLOGNE', 'HEIDELBERG'],
    center: [52.5200, 13.4050], // Berlin
    zoom: 5.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'AT',
    name: 'AUSTRIA',
    nameKo: '오스트리아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['VIENNA', 'SALZBURG', 'HALLSTATT', 'INNSBRUCK', 'GRAZ'],
    center: [48.2082, 16.3738], // Vienna
    zoom: 6.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'CZ',
    name: 'CZECH REPUBLIC',
    nameKo: '체코',
    currency: 'CZK',
    currencySymbol: 'Kč',
    rateToKRW: 58.0,
    cities: ['PRAGUE', 'CESKY KRUMLOV', 'BRNO', 'KARLOVY VARY'],
    center: [50.0755, 14.4378], // Prague
    zoom: 6.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'HU',
    name: 'HUNGARY',
    nameKo: '헝가리',
    currency: 'HUF',
    currencySymbol: 'Ft',
    rateToKRW: 3.7,
    cities: ['BUDAPEST', 'DEBRECEN', 'EGER', 'SZEGED'],
    center: [47.4979, 19.0402], // Budapest
    zoom: 6.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'HR',
    name: 'CROATIA',
    nameKo: '크로아티아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['DUBROVNIK', 'ZAGREB', 'SPLIT', 'PLITVICE', 'HVAR', 'ZADAR'],
    center: [45.8150, 15.9819], // Zagreb
    zoom: 6,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'PT',
    name: 'PORTUGAL',
    nameKo: '포르투갈',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['LISBON', 'PORTO', 'SINTRA', 'FARO', 'COIMBRA', 'MADEIRA'],
    center: [38.7223, -9.1393], // Lisbon
    zoom: 6,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'GR',
    name: 'GREECE',
    nameKo: '그리스',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['ATHENS', 'SANTORINI', 'MYKONOS', 'CRETE', 'ZAKYNTHOS'],
    center: [37.9838, 23.7275], // Athens
    zoom: 6,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'NL',
    name: 'NETHERLANDS',
    nameKo: '네덜란드',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['AMSTERDAM', 'ROTTERDAM', 'UTRECHT', 'THE HAGUE', 'GIETHOORN'],
    center: [52.3676, 4.9041], // Amsterdam
    zoom: 7,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'BE',
    name: 'BELGIUM',
    nameKo: '벨기에',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BRUSSELS', 'BRUGES', 'GHENT', 'ANTWERP'],
    center: [50.8503, 4.3517], // Brussels
    zoom: 7.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'DK',
    name: 'DENMARK',
    nameKo: '덴마크',
    currency: 'DKK',
    currencySymbol: 'kr',
    rateToKRW: 200.0,
    cities: ['COPENHAGEN', 'AARHUS', 'ODENSE', 'BILLUND'],
    center: [55.6761, 12.5683], // Copenhagen
    zoom: 6.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'NO',
    name: 'NORWAY',
    nameKo: '노르웨이',
    currency: 'NOK',
    currencySymbol: 'kr',
    rateToKRW: 130.0,
    cities: ['OSLO', 'BERGEN', 'TROMSO', 'STAVANGER', 'FLAM'],
    center: [59.9139, 10.7522], // Oslo
    zoom: 5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'SE',
    name: 'SWEDEN',
    nameKo: '스웨덴',
    currency: 'SEK',
    currencySymbol: 'kr',
    rateToKRW: 130.0,
    cities: ['STOCKHOLM', 'GOTHENBURG', 'MALMO', 'UPPSALA'],
    center: [59.3293, 18.0686], // Stockholm
    zoom: 5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'FI',
    name: 'FINLAND',
    nameKo: '핀란드',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['HELSINKI', 'ROVANIEMI', 'TAMPERE', 'TURKU'],
    center: [60.1699, 24.9384], // Helsinki
    zoom: 5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'PL',
    name: 'POLAND',
    nameKo: '폴란드',
    currency: 'PLN',
    currencySymbol: 'zł',
    rateToKRW: 345.0,
    cities: ['WARSAW', 'KRAKOW', 'GDANSK', 'WROCLAW'],
    center: [52.2297, 21.0122], // Warsaw
    zoom: 6,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'IE',
    name: 'IRELAND',
    nameKo: '아일랜드',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['DUBLIN', 'CORK', 'GALWAY', 'KILLARNEY'],
    center: [53.3498, -6.2603], // Dublin
    zoom: 6.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'RO',
    name: 'ROMANIA',
    nameKo: '루마니아',
    currency: 'RON',
    currencySymbol: 'lei',
    rateToKRW: 295.0,
    cities: ['BUCHAREST', 'BRASOV', 'CLUJ-NAPOCA', 'SIBIU'],
    center: [44.4268, 26.1025], // Bucharest
    zoom: 6,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'SI',
    name: 'SLOVENIA',
    nameKo: '슬로베니아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['LJUBLJANA', 'BLED', 'PIRAN', 'POSTOJNA'],
    center: [46.0569, 14.5058], // Ljubljana
    zoom: 7.5,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'IS',
    name: 'ICELAND',
    nameKo: '아이슬란드',
    currency: 'ISK',
    currencySymbol: 'kr',
    rateToKRW: 9.8,
    cities: ['REYKJAVIK', 'VIK', 'AKUREYRI', 'GOLDEN CIRCLE'],
    center: [64.1466, -21.9426], // Reykjavik
    zoom: 6,
    continent: 'Europe',
    continentKo: '유럽',
  },
  {
    code: 'TR',
    name: 'TURKEY',
    nameKo: '튀르키예',
    currency: 'TRY',
    currencySymbol: '₺',
    rateToKRW: 42.0,
    cities: ['ISTANBUL', 'CAPPADOCIA', 'ANTALYA', 'PAMUKKALE', 'IZMIR'],
    center: [39.9334, 32.8597], // Ankara
    zoom: 5.5,
    continent: 'Europe',
    continentKo: '유럽',
  },

  // ─── AFRICA ────────────────────────────────────────────────────────────────
  {
    code: 'EG',
    name: 'EGYPT',
    nameKo: '이집트',
    currency: 'EGP',
    currencySymbol: 'E£',
    rateToKRW: 28.0,
    cities: ['CAIRO', 'GIZA', 'LUXOR', 'ASWAN', 'HURGHADA', 'ALEXANDRIA'],
    center: [30.0444, 31.2357], // Cairo
    zoom: 5.5,
    continent: 'Africa',
    continentKo: '아프리카',
  },
  {
    code: 'MA',
    name: 'MOROCCO',
    nameKo: '모로코',
    currency: 'MAD',
    currencySymbol: 'DH',
    rateToKRW: 138.0,
    cities: ['MARRAKECH', 'CASABLANCA', 'FES', 'CHEFCHAOUEN', 'RABAT'],
    center: [34.0209, -6.8416], // Rabat
    zoom: 5.5,
    continent: 'Africa',
    continentKo: '아프리카',
  },
  {
    code: 'ZA',
    name: 'SOUTH AFRICA',
    nameKo: '남아프리카공화국',
    currency: 'ZAR',
    currencySymbol: 'R',
    rateToKRW: 75.0,
    cities: ['CAPE TOWN', 'JOHANNESBURG', 'DURBAN', 'KRUGER'],
    center: [-25.7479, 28.2293], // Pretoria
    zoom: 5,
    continent: 'Africa',
    continentKo: '아프리카',
  },
  {
    code: 'KE',
    name: 'KENYA',
    nameKo: '케냐',
    currency: 'KES',
    currencySymbol: 'KSh',
    rateToKRW: 10.5,
    cities: ['NAIROBI', 'MASAI MARA', 'MOMBASA'],
    center: [-1.2921, 36.8219], // Nairobi
    zoom: 6,
    continent: 'Africa',
    continentKo: '아프리카',
  },
  {
    code: 'TZ',
    name: 'TANZANIA',
    nameKo: '탄자니아',
    currency: 'TZS',
    currencySymbol: 'TSh',
    rateToKRW: 0.52,
    cities: ['ZANZIBAR', 'SERENGETI', 'DAR ES SALAAM', 'KILIMANJARO'],
    center: [-6.1630, 35.7516], // Dodoma
    zoom: 6,
    continent: 'Africa',
    continentKo: '아프리카',
  },

  // ─── MIDDLE EAST ───────────────────────────────────────────────────────────
  {
    code: 'AE',
    name: 'UNITED ARAB EMIRATES',
    nameKo: '아랍에미리트',
    currency: 'AED',
    currencySymbol: 'AED',
    rateToKRW: 375.0,
    cities: ['DUBAI', 'ABU DHABI', 'SHARJAH'],
    center: [24.4539, 54.3773], // Abu Dhabi
    zoom: 7,
    continent: 'Middle East',
    continentKo: '중동',
  },
  {
    code: 'JO',
    name: 'JORDAN',
    nameKo: '요르단',
    currency: 'JOD',
    currencySymbol: 'JD',
    rateToKRW: 1920.0,
    cities: ['AMMAN', 'PETRA', 'WADI RUM', 'DEAD SEA', 'AQABA'],
    center: [31.9454, 35.9284], // Amman
    zoom: 7,
    continent: 'Middle East',
    continentKo: '중동',
  },
  {
    code: 'QA',
    name: 'QATAR',
    nameKo: '카타르',
    currency: 'QAR',
    currencySymbol: 'QR',
    rateToKRW: 375.0,
    cities: ['DOHA', 'AL WAKRAH', 'LUSAIL'],
    center: [25.2854, 51.5310], // Doha
    zoom: 8.5,
    continent: 'Middle East',
    continentKo: '중동',
  },
  {
    code: 'SA',
    name: 'SAUDI ARABIA',
    nameKo: '사우디아라비아',
    currency: 'SAR',
    currencySymbol: 'SR',
    rateToKRW: 365.0,
    cities: ['RIYADH', 'JEDDAH', 'ALULA', 'MEDINA'],
    center: [24.7136, 46.6753], // Riyadh
    zoom: 5,
    continent: 'Middle East',
    continentKo: '중동',
  },

  // ─── AMERICAS (Normalized to East Pacific Longitude Coordinates) ───────────
  {
    code: 'US',
    name: 'UNITED STATES',
    nameKo: '미국',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['NEW YORK', 'LOS ANGELES', 'SAN FRANCISCO', 'LAS VEGAS', 'HONOLULU', 'SEATTLE', 'CHICAGO'],
    center: [38.9072, 282.9631], // Washington, D.C. (-77.0369 + 360)
    zoom: 4.8,
    continent: 'North America',
    continentKo: '북미',
  },
  {
    code: 'CA',
    name: 'CANADA',
    nameKo: '캐나다',
    currency: 'CAD',
    currencySymbol: 'C$',
    rateToKRW: 1010,
    cities: ['VANCOUVER', 'TORONTO', 'MONTREAL', 'QUEBEC', 'BANFF', 'CALGARY'],
    center: [45.4215, 284.3028], // Ottawa (-75.6972 + 360)
    zoom: 4.5,
    continent: 'North America',
    continentKo: '북미',
  },
  {
    code: 'MX',
    name: 'MEXICO',
    nameKo: '멕시코',
    currency: 'MXN',
    currencySymbol: '$',
    rateToKRW: 72.0,
    cities: ['CANCUN', 'MEXICO CITY', 'PLAYA DEL CARMEN', 'TULUM', 'OAXACA'],
    center: [19.4326, 260.8668], // Mexico City (-99.1332 + 360)
    zoom: 4.5,
    continent: 'North America',
    continentKo: '중남미',
  },
  {
    code: 'CU',
    name: 'CUBA',
    nameKo: '쿠바',
    currency: 'CUP',
    currencySymbol: '$',
    rateToKRW: 57.0,
    cities: ['HAVANA', 'VARADERO', 'TRINIDAD', 'VINALES'],
    center: [23.1136, 277.6334], // Havana (-82.3666 + 360)
    zoom: 6.5,
    continent: 'North America',
    continentKo: '중남미',
  },
  {
    code: 'PE',
    name: 'PERU',
    nameKo: '페루',
    currency: 'PEN',
    currencySymbol: 'S/.',
    rateToKRW: 365.0,
    cities: ['LIMA', 'CUSCO', 'MACHU PICCHU', 'AREQUIPA', 'PUNO'],
    center: [-12.0464, 282.9572], // Lima (-77.0428 + 360)
    zoom: 5,
    continent: 'South America',
    continentKo: '남미',
  },
  {
    code: 'BR',
    name: 'BRAZIL',
    nameKo: '브라질',
    currency: 'BRL',
    currencySymbol: 'R$',
    rateToKRW: 245.0,
    cities: ['RIO DE JANEIRO', 'SAO PAULO', 'SALVADOR', 'IGUACU'],
    center: [-15.7975, 312.1081], // Brasilia (-47.8919 + 360)
    zoom: 4,
    continent: 'South America',
    continentKo: '남미',
  },
  {
    code: 'AR',
    name: 'ARGENTINA',
    nameKo: '아르헨티나',
    currency: 'ARS',
    currencySymbol: '$',
    rateToKRW: 1.4,
    cities: ['BUENOS AIRES', 'BARILOCHE', 'USHUAIA', 'EL CALAFATE', 'IGUAZU'],
    center: [-34.6037, 301.6184], // Buenos Aires (-58.3816 + 360)
    zoom: 4,
    continent: 'South America',
    continentKo: '남미',
  },
  {
    code: 'CL',
    name: 'CHILE',
    nameKo: '칠레',
    currency: 'CLP',
    currencySymbol: '$',
    rateToKRW: 1.45,
    cities: ['SANTIAGO', 'SAN PEDRO DE ATACAMA', 'TORRES DEL PAINE', 'EASTER ISLAND'],
    center: [-33.4489, 289.3307], // Santiago (-70.6693 + 360)
    zoom: 4,
    continent: 'South America',
    continentKo: '남미',
  },
  {
    code: 'CO',
    name: 'COLOMBIA',
    nameKo: '콜롬비아',
    currency: 'COP',
    currencySymbol: '$',
    rateToKRW: 0.33,
    cities: ['BOGOTA', 'MEDELLIN', 'CARTAGENA', 'CALI'],
    center: [4.7110, 285.9279], // Bogota (-74.0721 + 360)
    zoom: 5.5,
    continent: 'South America',
    continentKo: '남미',
  },

  // ─── OCEANIA ───────────────────────────────────────────────────────────────
  {
    code: 'AU',
    name: 'AUSTRALIA',
    nameKo: '호주',
    currency: 'AUD',
    currencySymbol: 'A$',
    rateToKRW: 900,
    cities: ['SYDNEY', 'MELBOURNE', 'BRISBANE', 'PERTH', 'GOLD COAST', 'CAIRNS'],
    center: [-35.2809, 149.1300], // Canberra
    zoom: 4,
    continent: 'Oceania',
    continentKo: '오세아니아',
  },
  {
    code: 'NZ',
    name: 'NEW ZEALAND',
    nameKo: '뉴질랜드',
    currency: 'NZD',
    currencySymbol: 'NZ$',
    rateToKRW: 840,
    cities: ['AUCKLAND', 'QUEENSTOWN', 'CHRISTCHURCH', 'ROTORUA'],
    center: [-41.2865, 174.7762], // Wellington
    zoom: 5,
    continent: 'Oceania',
    continentKo: '오세아니아',
  },
  {
    code: 'FJ',
    name: 'FIJI',
    nameKo: '피지',
    currency: 'FJD',
    currencySymbol: 'FJ$',
    rateToKRW: 610.0,
    cities: ['NADI', 'SUVA', 'MAMANUCA ISLANDS'],
    center: [-18.1416, 178.4419], // Suva
    zoom: 7.5,
    continent: 'Oceania',
    continentKo: '오세아니아',
  },
  {
    code: 'GU',
    name: 'GUAM',
    nameKo: '괌',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['TUMON', 'HAGATNA', 'TAMUNING', 'GUAM'],
    center: [13.4757, 144.7489], // Hagatna
    zoom: 11,
    continent: 'Oceania',
    continentKo: '오세아니아',
  },
  {
    code: 'MP',
    name: 'SAIPAN',
    nameKo: '사이판',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['GARAPAN', 'MARPI', 'SUSUPE', 'SAIPAN'],
    center: [15.1850, 145.7467], // Saipan
    zoom: 11,
    continent: 'Oceania',
    continentKo: '오세아니아',
  },
];

export const KNOWN_CITY_COORDS: { [key: string]: [number, number] } = {
  // Korean and English City Dictionary
  tokyo: [35.6762, 139.6503],
  도쿄: [35.6762, 139.6503],
  osaka: [34.6937, 135.5023],
  오사카: [34.6937, 135.5023],
  kyoto: [35.0116, 135.7681],
  교토: [35.0116, 135.7681],
  fukuoka: [33.5902, 130.4017],
  후쿠오카: [33.5902, 130.4017],
  sapporo: [43.0618, 141.3545],
  삿포로: [43.0618, 141.3545],
  nagoya: [35.1815, 136.9066],
  나고야: [35.1815, 136.9066],
  okinawa: [26.2124, 127.6809],
  오키나와: [26.2124, 127.6809],
  kobe: [34.6901, 135.1955],
  고베: [34.6901, 135.1955],
  nara: [34.6851, 135.8048],
  나라: [34.6851, 135.8048],
  seoul: [37.5665, 126.9780],
  서울: [37.5665, 126.9780],
  busan: [35.1796, 129.0756],
  부산: [35.1796, 129.0756],
  jeju: [33.4996, 126.5312],
  제주: [33.4996, 126.5312],
  gangneung: [37.7519, 128.8761],
  강릉: [37.7519, 128.8761],
  sokcho: [38.2070, 128.5918],
  속초: [38.2070, 128.5918],
  gyeongju: [35.8562, 129.2247],
  경주: [35.8562, 129.2247],
  incheon: [37.4563, 126.7052],
  인천: [37.4563, 126.7052],
  jeonju: [35.8242, 127.1480],
  전주: [35.8242, 127.1480],
  danang: [16.0544, 108.2022],
  다낭: [16.0544, 108.2022],
  hanoi: [21.0285, 105.8542],
  하노이: [21.0285, 105.8542],
  hochiminh: [10.8231, 106.6297],
  호치민: [10.8231, 106.6297],
  nhatrang: [12.2388, 109.1967],
  나트랑: [12.2388, 109.1967],
  phuquoc: [10.2899, 103.9840],
  푸꾸옥: [10.2899, 103.9840],
  hoian: [15.8801, 108.3380],
  호이안: [15.8801, 108.3380],
  bangkok: [13.7563, 100.5018],
  방콕: [13.7563, 100.5018],
  chiangmai: [18.7883, 98.9853],
  치앙마이: [18.7883, 98.9853],
  phuket: [7.8804, 98.3923],
  푸켓: [7.8804, 98.3923],
  pattaya: [12.9276, 100.8771],
  파타야: [12.9276, 100.8771],
  cebu: [10.3157, 123.8854],
  세부: [10.3157, 123.8854],
  boracay: [11.9674, 121.9248],
  보라카이: [11.9674, 121.9248],
  bohol: [9.8500, 124.1435],
  보홀: [9.8500, 124.1435],
  manila: [14.5995, 120.9842],
  마닐라: [14.5995, 120.9842],
  taipei: [25.0330, 121.5654],
  타이베이: [25.0330, 121.5654],
  kaohsiung: [22.6273, 120.3014],
  가오슝: [22.6273, 120.3014],
  taichung: [24.1477, 120.6736],
  타이중: [24.1477, 120.6736],
  singapore: [1.3521, 103.8198],
  싱가포르: [1.3521, 103.8198],
  kualalumpur: [3.1390, 101.6869],
  쿠알라룸푸르: [3.1390, 101.6869],
  kotakinabalu: [5.9804, 116.0735],
  코타키나발루: [5.9804, 116.0735],
  bali: [-8.3405, 115.0920],
  발리: [-8.3405, 115.0920],
  jakarta: [-6.2088, 106.8456],
  자카르타: [-6.2088, 106.8456],
  paris: [48.8566, 2.3522],
  파리: [48.8566, 2.3522],
  nice: [43.7102, 7.2620],
  니스: [43.7102, 7.2620],
  lyon: [45.7640, 4.8357],
  리옹: [45.7640, 4.8357],
  rome: [41.9028, 12.4964],
  로마: [41.9028, 12.4964],
  florence: [43.7696, 11.2558],
  피렌체: [43.7696, 11.2558],
  venice: [45.4408, 12.3155],
  베네치아: [45.4408, 12.3155],
  milan: [45.4642, 9.1900],
  밀라노: [45.4642, 9.1900],
  naples: [40.8518, 14.2681],
  나폴리: [40.8518, 14.2681],
  barcelona: [41.3879, 2.1699],
  바르셀로나: [41.3879, 2.1699],
  madrid: [40.4168, -3.7038],
  마드리드: [40.4168, -3.7038],
  seville: [37.3891, -5.9845],
  세비야: [37.3891, -5.9845],
  london: [51.5074, -0.1278],
  런던: [51.5074, -0.1278],
  edinburgh: [55.9533, -3.1883],
  에든버러: [55.9533, -3.1883],
  zurich: [47.3769, 8.5417],
  취리히: [47.3769, 8.5417],
  interlaken: [46.6863, 7.8632],
  인터라켄: [46.6863, 7.8632],
  geneva: [46.2044, 6.1432],
  제네바: [46.2044, 6.1432],
  lucerne: [47.0502, 8.3093],
  루체른: [47.0502, 8.3093],
  zermatt: [45.9765, 7.7491],
  체르마트: [45.9765, 7.7491],
  berlin: [52.5200, 13.4050],
  베를린: [52.5200, 13.4050],
  munich: [48.1351, 11.5820],
  뮌헨: [48.1351, 11.5820],
  frankfurt: [50.1109, 8.6821],
  프랑크푸르트: [50.1109, 8.6821],
  vienna: [48.2082, 16.3738],
  비엔나: [48.2082, 16.3738],
  빈: [48.2082, 16.3738],
  salzburg: [47.8095, 13.0550],
  잘츠부르크: [47.8095, 13.0550],
  hallstatt: [47.5622, 13.6493],
  할슈타트: [47.5622, 13.6493],
  prague: [50.0755, 14.4378],
  프라하: [50.0755, 14.4378],
  ceskykrumlov: [48.8127, 14.3175],
  체스키크롬로프: [48.8127, 14.3175],
  budapest: [47.4979, 19.0402],
  부다페스트: [47.4979, 19.0402],
  dubrovnik: [42.6507, 18.0944],
  두브로브니크: [42.6507, 18.0944],
  zagreb: [45.8150, 15.9819],
  자그레브: [45.8150, 15.9819],
  split: [43.5081, 16.4402],
  스플리트: [43.5081, 16.4402],
  lisbon: [38.7223, -9.1393],
  리스본: [38.7223, -9.1393],
  porto: [41.1579, -8.6291],
  포르투: [41.1579, -8.6291],
  athens: [37.9838, 23.7275],
  아테네: [37.9838, 23.7275],
  santorini: [36.3932, 25.4615],
  산토리니: [36.3932, 25.4615],
  amsterdam: [52.3676, 4.9041],
  암스테르담: [52.3676, 4.9041],
  brussels: [50.8503, 4.3517],
  브뤼셀: [50.8503, 4.3517],
  bruges: [51.2093, 3.2247],
  브뤼헤: [51.2093, 3.2247],
  copenhagen: [55.6761, 12.5683],
  코펜하겐: [55.6761, 12.5683],
  oslo: [59.9139, 10.7522],
  오슬로: [59.9139, 10.7522],
  bergen: [60.3913, 5.3221],
  베르겐: [60.3913, 5.3221],
  stockholm: [59.3293, 18.0686],
  스톡홀름: [59.3293, 18.0686],
  helsinki: [60.1699, 24.9384],
  헬싱키: [60.1699, 24.9384],
  warsaw: [52.2297, 21.0122],
  바르샤바: [52.2297, 21.0122],
  krakow: [50.0647, 19.9450],
  크라쿠프: [50.0647, 19.9450],
  dublin: [53.3498, -6.2603],
  더블린: [53.3498, -6.2603],
  bucharest: [44.4268, 26.1025],
  부쿠레슈티: [44.4268, 26.1025],
  ljubljana: [46.0569, 14.5058],
  류블랴나: [46.0569, 14.5058],
  bled: [46.3683, 14.1146],
  블레드: [46.3683, 14.1146],
  cairo: [30.0444, 31.2357],
  카이로: [30.0444, 31.2357],
  luxor: [25.6872, 32.6396],
  룩소르: [25.6872, 32.6396],
  marrakech: [31.6295, -7.9811],
  마라케시: [31.6295, -7.9811],
  casablanca: [33.5731, -7.5898],
  카사블랑카: [33.5731, -7.5898],
  capetown: [-33.9249, 18.4241],
  케이프타운: [-33.9249, 18.4241],
  nairobi: [-1.2921, 36.8219],
  나이로비: [-1.2921, 36.8219],
  zanzibar: [-6.1659, 39.2026],
  잔지바르: [-6.1659, 39.2026],
  newdelhi: [28.6139, 77.2090],
  뉴델리: [28.6139, 77.2090],
  delhi: [28.6139, 77.2090],
  델리: [28.6139, 77.2090],
  kathmandu: [27.7172, 85.3240],
  카트만두: [27.7172, 85.3240],
  amman: [31.9454, 35.9284],
  암만: [31.9454, 35.9284],
  petra: [30.3285, 35.4444],
  페트라: [30.3285, 35.4444],
  doha: [25.2854, 51.5310],
  도하: [25.2854, 51.5310],
  riyadh: [24.7136, 46.6753],
  리야드: [24.7136, 46.6753],
  mexicocity: [19.4326, 260.8668],
  멕시코시티: [19.4326, 260.8668],
  lima: [-12.0464, 282.9572],
  리마: [-12.0464, 282.9572],
  cusco: [-13.5319, 288.0325],
  쿠스코: [-13.5319, 288.0325],
  machupicchu: [-13.1631, 287.4550],
  마추픽추: [-13.1631, 287.4550],
  riodejaneiro: [-22.9068, 316.8271],
  리우데자네이루: [-22.9068, 316.8271],
  saopaulo: [-23.5505, 313.3667],
  상파울루: [-23.5505, 313.3667],
  buenosaires: [-34.6037, 301.6184],
  부에노스아이레스: [-34.6037, 301.6184],
  santiago: [-33.4489, 289.3307],
  산티아고: [-33.4489, 289.3307],
  bogota: [4.7110, 285.9279],
  보고타: [4.7110, 285.9279],
  havana: [23.1136, 277.6334],
  아바나: [23.1136, 277.6334],
  nadi: [-17.8065, 177.4150],
  난디: [-17.8065, 177.4150],
  suva: [-18.1416, 178.4419],
  수바: [-18.1416, 178.4419],
  istanbul: [41.0082, 28.9784],
  이스탄불: [41.0082, 28.9784],
  cappadocia: [38.6431, 34.8289],
  카파도키아: [38.6431, 34.8289],
  reykjavik: [64.1466, -21.9426],
  레이캬비크: [64.1466, -21.9426],
  newyork: [40.7128, 285.9940],
  뉴욕: [40.7128, 285.9940],
  losangeles: [34.0522, 241.7563],
  로스앤젤레스: [34.0522, 241.7563],
  sanfrancisco: [37.7749, 237.5806],
  샌프란시스코: [37.7749, 237.5806],
  lasvegas: [36.1699, 244.8602],
  라스베이거스: [36.1699, 244.8602],
  honolulu: [21.3069, 202.1417],
  호놀룰루: [21.3069, 202.1417],
  hawaii: [21.3069, 202.1417],
  하와이: [21.3069, 202.1417],
  guam: [13.4443, 144.7937],
  괌: [13.4443, 144.7937],
  tumon: [13.5137, 144.8058],
  투몬: [13.5137, 144.8058],
  hagatna: [13.4763, 144.7502],
  하갓냐: [13.4763, 144.7502],
  tamuning: [13.4877, 144.7811],
  타무닝: [13.4877, 144.7811],
  saipan: [15.1850, 145.7467],
  사이판: [15.1850, 145.7467],
  garapan: [15.2078, 145.7198],
  가라판: [15.2078, 145.7198],
  marpi: [15.2833, 145.8167],
  마르피: [15.2833, 145.8167],
  susupe: [15.1500, 145.7167],
  수수페: [15.1500, 145.7167],
  male: [4.1755, 73.5093],
  말레: [4.1755, 73.5093],
  maafushi: [3.9416, 73.4897],
  마아푸시: [3.9416, 73.4897],
  ariatoll: [3.8833, 72.8333],
  아리아톨: [3.8833, 72.8333],
  vik: [63.4186, -19.0060],
  비크: [63.4186, -19.0060],
  akureyri: [65.6835, -18.0878],
  아쿠레이리: [65.6835, -18.0878],
  goldencircle: [64.3100, -20.3000],
  골든서클: [64.3100, -20.3000],
  sentosa: [1.2494, 103.8303],
  센토사: [1.2494, 103.8303],
  marinabay: [1.2847, 103.8610],
  마리나베이: [1.2847, 103.8610],
  taipa: [22.1569, 113.5586],
  타이파: [22.1569, 113.5586],
  cotai: [22.1468, 113.5654],
  코타이: [22.1468, 113.5654],
  coloane: [22.1197, 113.5619],
  콜로안: [22.1197, 113.5619],
  kowloon: [22.3193, 114.1694],
  구룡: [22.3193, 114.1694],
  tsimshatsui: [22.2988, 114.1722],
  침사추이: [22.2988, 114.1722],
  lantau: [22.2591, 113.9525],
  란타우: [22.2591, 113.9525],
  mamanucaislands: [-17.6667, 177.0833],
  마마누카제도: [-17.6667, 177.0833],
  vancouver: [49.2827, 236.8793],
  밴쿠버: [49.2827, 236.8793],
  toronto: [43.6532, 280.6168],
  토론토: [43.6532, 280.6168],
  banff: [51.1784, 244.4292],
  밴프: [51.1784, 244.4292],
  sydney: [-33.8688, 151.2093],
  시드니: [-33.8688, 151.2093],
  melbourne: [-37.8136, 144.9631],
  멜버른: [-37.8136, 144.9631],
  auckland: [-36.8485, 174.7633],
  오클랜드: [-36.8485, 174.7633],
  queenstown: [-45.0312, 168.6626],
  퀸스타운: [-45.0312, 168.6626],
  cancun: [21.1619, -86.8515],
  칸쿤: [21.1619, -86.8515],
  dubai: [25.2048, 55.2708],
  두바이: [25.2048, 55.2708],
  abudhabi: [24.4539, 54.3773],
  아부다비: [24.4539, 54.3773],
};

// Korean city to English city canonical mapping for search
export const CITY_KO_MAP: Record<string, string> = {
  '뉴욕': 'NEW YORK',
  '로스앤젤레스': 'LOS ANGELES',
  '엘에이': 'LOS ANGELES',
  '샌프란시스코': 'SAN FRANCISCO',
  '라스베이거스': 'LAS VEGAS',
  '라스베가스': 'LAS VEGAS',
  '시애틀': 'SEATTLE',
  '시카고': 'CHICAGO',
  '호놀룰루': 'HONOLULU',
  '하와이': 'HONOLULU',
  '보스턴': 'BOSTON',
  '워싱턴': 'WASHINGTON',
  '마이애미': 'MIAMI',
  '밴쿠버': 'VANCOUVER',
  '토론토': 'TORONTO',
  '몬트리올': 'MONTREAL',
  '퀘벡': 'QUEBEC',
  '밴프': 'BANFF',
  '캘거리': 'CALGARY',
  '칸쿤': 'CANCUN',
  '멕시코시티': 'MEXICO CITY',
  '파리': 'PARIS',
  '니스': 'NICE',
  '리옹': 'LYON',
  '런던': 'LONDON',
  '에든버러': 'EDINBURGH',
  '로마': 'ROME',
  '밀라노': 'MILAN',
  '피렌체': 'FLORENCE',
  '베네치아': 'VENICE',
  '나폴리': 'NAPLES',
  '바르셀로나': 'BARCELONA',
  '마드리드': 'MADRID',
  '세비야': 'SEVILLE',
  '취리히': 'ZURICH',
  '인터라켄': 'INTERLAKEN',
  '제네바': 'GENEVA',
  '루체른': 'LUCERNE',
  '체르마트': 'ZERMATT',
  '프라하': 'PRAGUE',
  '비엔나': 'VIENNA',
  '부다페스트': 'BUDAPEST',
  '베를린': 'BERLIN',
  '뮌헨': 'MUNICH',
  '프랑크푸르트': 'FRANKFURT',
  '암스테르담': 'AMSTERDAM',
  '브뤼셀': 'BRUSSELS',
  '코펜하겐': 'COPENHAGEN',
  '오슬로': 'OSLO',
  '스톡홀름': 'STOCKHOLM',
  '헬싱키': 'HELSINKI',
  '바르샤바': 'WARSAW',
  '더블린': 'DUBLIN',
  '리스본': 'LISBON',
  '포르투': 'PORTO',
  '아테네': 'ATHENS',
  '산토리니': 'SANTORINI',
  '이스탄불': 'ISTANBUL',
  '카파도키아': 'CAPPADOCIA',
  '두바이': 'DUBAI',
  '아부다비': 'ABU DHABI',
  '시드니': 'SYDNEY',
  '멜버른': 'MELBOURNE',
  '브리즈번': 'BRISBANE',
  '퍼스': 'PERTH',
  '오클랜드': 'AUCKLAND',
  '퀸스타운': 'QUEENSTOWN',
  '방콕': 'BANGKOK',
  '치앙마이': 'CHIANG MAI',
  '푸켓': 'PHUKET',
  '파타야': 'PATTAYA',
  '다낭': 'DA NANG',
  '하노이': 'HANOI',
  '호치민': 'HO CHI MINH',
  '나트랑': 'NHA TRANG',
  '푸꾸옥': 'PHU QUOC',
  '세부': 'CEBU',
  '보라카이': 'BORACAY',
  '보홀': 'BOHOL',
  '마닐라': 'MANILA',
  '싱가포르': 'SINGAPORE',
  '쿠알라룸푸르': 'KUALA LUMPUR',
  '코타키나발루': 'KOTA KINABALU',
  '발리': 'BALI',
  '자카르타': 'JAKARTA',
  '타이베이': 'TAIPEI',
  '가오슝': 'KAOHSIUNG',
  '홍콩': 'HONG KONG',
  '마카오': 'MACAU',
  '도쿄': 'TOKYO',
  '오사카': 'OSAKA',
  '교토': 'KYOTO',
  '후쿠오카': 'FUKUOKA',
  '삿포로': 'SAPPORO',
  '나고야': 'NAGOYA',
  '오키나와': 'OKINAWA',
  '고베': 'KOBE',
  '나라': 'NARA',
  '서울': 'SEOUL',
  '부산': 'BUSAN',
  '제주': 'JEJU',
  '인천': 'INCHEON',
  '강릉': 'GANGNEUNG',
  '속초': 'SOKCHO',
  '경주': 'GYEONGJU',
  '전주': 'JEONJU',
  '괌': 'GUAM',
  '투몬': 'TUMON',
  '사이판': 'SAIPAN',
  '가라판': 'GARAPAN',
  '마르피': 'MARPI',
  '수수페': 'SUSUPE',
  '하갓냐': 'HAGATNA',
  '타무닝': 'TAMUNING',
  '말레': 'MALE',
  '마아푸시': 'MAAFUSHI',
  '아리아톨': 'ARI ATOLL',
  '비크': 'VIK',
  '아쿠레이리': 'AKUREYRI',
  '골든서클': 'GOLDEN CIRCLE',
  '센토사': 'SENTOSA',
  '마리나베이': 'MARINA BAY',
  '타이파': 'TAIPA',
  '코타이': 'COTAI',
  '콜로안': 'COLOANE',
  '침사추이': 'TSIM SHA TSUI',
  '란타우': 'LANTAU',
  '마마누카': 'MAMANUCA ISLANDS',
};

export function findCountryForGroup(
  countryStr?: string, 
  cityStr?: string, 
  coords?: { lat: number; lng: number }
): CountryInfo | undefined {
  if (!countryStr && !cityStr && !coords) return undefined;
  const cClean = (countryStr || '').toUpperCase().trim();
  const cityClean = (cityStr || '').toUpperCase().trim();

  // 0. Explicit territory & city-state fast mapping (GUAM, SAIPAN, etc.)
  if (cityClean === 'GUAM' || cityClean.includes('GUAM') || cityStr?.includes('괌')) {
    const guam = COUNTRIES_DATA.find(c => c.code === 'GU');
    if (guam) return guam;
  }
  if (cityClean === 'SAIPAN' || cityClean.includes('SAIPAN') || cityStr?.includes('사이판')) {
    const saipan = COUNTRIES_DATA.find(c => c.code === 'MP');
    if (saipan) return saipan;
  }

  // 1. Direct code or name match by country string
  if (cClean) {
    let found = COUNTRIES_DATA.find(c => 
      c.code === cClean || 
      c.name.toUpperCase() === cClean || 
      c.nameKo === countryStr ||
      cClean.includes(c.name.toUpperCase()) ||
      (countryStr && countryStr.includes(c.nameKo))
    );
    if (found) return found;
  }

  // 2. Direct name match by city string (for city-states or island destinations)
  if (cityClean) {
    let found = COUNTRIES_DATA.find(c =>
      c.name.toUpperCase() === cityClean ||
      c.nameKo === cityStr ||
      cityClean.includes(c.name.toUpperCase()) ||
      (cityStr && cityStr.includes(c.nameKo))
    );
    if (found) return found;
  }

  // 3. City name in country's cities list match
  if (cityClean) {
    let found = COUNTRIES_DATA.find(c =>
      c.cities.some(cty => cty.toUpperCase() === cityClean || cityClean.includes(cty.toUpperCase()))
    );
    if (found) return found;
  }

  // 4. Proximity fallback by coordinates
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    let closest: CountryInfo | null = null;
    let minDeg = Infinity;
    for (const c of COUNTRIES_DATA) {
      let diffLng = Math.abs(coords.lng - c.center[1]);
      while (diffLng > 180) diffLng = Math.abs(diffLng - 360);
      const degDist = Math.hypot(coords.lat - c.center[0], diffLng);
      if (degDist < minDeg) {
        minDeg = degDist;
        closest = c;
      }
    }
    // Match if within ~350km (~3.5 degrees)
    if (closest && minDeg < 3.5) {
      return closest;
    }
  }

  return undefined;
}

// Country Code to IANA Timezone mapping
export const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  TW: 'Asia/Taipei',
  HK: 'Asia/Hong_Kong',
  MO: 'Asia/Macau',
  CN: 'Asia/Shanghai',
  MN: 'Asia/Ulaanbaatar',
  VN: 'Asia/Ho_Chi_Minh',
  TH: 'Asia/Bangkok',
  PH: 'Asia/Manila',
  SG: 'Asia/Singapore',
  MY: 'Asia/Kuala_Lumpur',
  ID: 'Asia/Jakarta',
  LA: 'Asia/Vientiane',
  KH: 'Asia/Phnom_Penh',
  MV: 'Indian/Maldives',
  IN: 'Asia/Kolkata',
  NP: 'Asia/Kathmandu',
  GB: 'Europe/London',
  FR: 'Europe/Paris',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  DE: 'Europe/Berlin',
  CH: 'Europe/Zurich',
  AT: 'Europe/Vienna',
  CZ: 'Europe/Prague',
  HU: 'Europe/Budapest',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels',
  PT: 'Europe/Lisbon',
  GR: 'Europe/Athens',
  TR: 'Europe/Istanbul',
  IS: 'Atlantic/Reykjavik',
  NO: 'Europe/Oslo',
  SE: 'Europe/Stockholm',
  FI: 'Europe/Helsinki',
  DK: 'Europe/Copenhagen',
  PL: 'Europe/Warsaw',
  IE: 'Europe/Dublin',
  HR: 'Europe/Zagreb',
  US: 'America/New_York',
  CA: 'America/Toronto',
  MX: 'America/Mexico_City',
  CU: 'America/Havana',
  BR: 'America/Sao_Paulo',
  AR: 'America/Argentina/Buenos_Aires',
  CL: 'America/Santiago',
  PE: 'America/Lima',
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  GU: 'Pacific/Guam',
  MP: 'Pacific/Saipan',
  FJ: 'Pacific/Fiji',
  AE: 'Asia/Dubai',
  QA: 'Asia/Qatar',
  EG: 'Africa/Cairo',
  ZA: 'Africa/Johannesburg',
};

// Calculate real-time info: formatted local time, date, and diff from KST (UTC+9)
export function getCountryLiveTime(countryCode: string, now: Date) {
  const timeZone = COUNTRY_TIMEZONE_MAP[countryCode] || 'UTC';

  // Format time in target timezone
  const timeStr = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);

  const dateStr = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(now);

  // 12-hour format for travel clock widget (am/pm, 8:55)
  let ampm = 'am';
  let dotTime = '12:00';
  try {
    const targetDateObj = new Date(now.toLocaleString('en-US', { timeZone }));
    const rawH = targetDateObj.getHours();
    const rawM = targetDateObj.getMinutes();
    ampm = rawH >= 12 ? 'pm' : 'am';
    const h12 = rawH % 12 || 12;
    const m2 = String(rawM).padStart(2, '0');
    dotTime = `${h12}:${m2}`;
  } catch (_) {}

  // Time difference in hours compared to Korea (KST, UTC+9)
  try {
    const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const targetDate = new Date(now.toLocaleString('en-US', { timeZone }));
    const diffMs = targetDate.getTime() - kstDate.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    const sign = diffHours > 0 ? '+' : diffHours < 0 ? '-' : '±';
    const absH = Math.abs(diffHours);
    const diffText = `${sign}${absH}:00`;

    return { timeStr, dateStr, diffText, diffHours, timeZone, second: now.getSeconds(), ampm, dotTime };
  } catch (_) {
    return { timeStr, dateStr, diffText: '±0:00', diffHours: 0, timeZone, second: now.getSeconds(), ampm, dotTime };
  }
}

/** 1,000원에 가장 가까운 통화 기준 단위(1, 10, 100, 1,000, 10,000) 산출 */
export function getOptimalCurrencyUnit(rate: number, currency: string): number {
  if (currency === 'JPY') return 100;
  if (currency === 'VND' || currency === 'IDR') return 10000;
  if (!rate || rate <= 0) return 1;
  const target = 1000;
  const ideal = target / rate;
  const power = Math.round(Math.log10(ideal));
  return Math.max(1, Math.pow(10, power));
}

export function shiftGeoJsonCoordinates(coords: any, lngOffset: number): any {
  if (typeof coords[0] === 'number') {
    return [coords[0] + lngOffset, coords[1]];
  }
  return coords.map((sub: any) => shiftGeoJsonCoordinates(sub, lngOffset));
}
