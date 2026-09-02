import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight, Calendar, Star, Plus } from 'lucide-react';
import { Trip, Plan } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../components/SummaryView';

interface CountryInfo {
  code: string;
  name: string;
  nameKo: string;
  currency: string;
  currencySymbol: string;
  rateToKRW: number;
  cities: string[];
  center: [number, number]; // [lat, lng]
  zoom: number;
}

const COUNTRIES_DATA: CountryInfo[] = [
  // ─── EAST ASIA ─────────────────────────────────────────────────────────────
  {
    code: 'JP',
    name: 'JAPAN',
    nameKo: '일본',
    currency: 'JPY',
    currencySymbol: '¥',
    rateToKRW: 9.0,
    cities: ['TOKYO', 'OSAKA', 'KYOTO', 'FUKUOKA', 'SAPPORO', 'NAGOYA', 'OKINAWA', 'KOBE', 'NARA'],
    center: [36.2048, 138.2529],
    zoom: 5.5,
  },
  {
    code: 'KR',
    name: 'SOUTH KOREA',
    nameKo: '대한민국',
    currency: 'KRW',
    currencySymbol: '₩',
    rateToKRW: 1.0,
    cities: ['SEOUL', 'BUSAN', 'JEJU', 'GANGNEUNG', 'GYEONGJU', 'INCHEON', 'SOKCHO', 'JEONJU'],
    center: [36.5, 127.8],
    zoom: 6.5,
  },
  {
    code: 'TW',
    name: 'TAIWAN',
    nameKo: '대만',
    currency: 'TWD',
    currencySymbol: 'NT$',
    rateToKRW: 43.0,
    cities: ['TAIPEI', 'KAOHSIUNG', 'TAICHUNG', 'TAINAN', 'HUALIEN', 'JIUFEN'],
    center: [23.7, 121.0],
    zoom: 7,
  },
  {
    code: 'HK',
    name: 'HONG KONG',
    nameKo: '홍콩',
    currency: 'HKD',
    currencySymbol: 'HK$',
    rateToKRW: 177.0,
    cities: ['HONG KONG', 'KOWLOON', 'CENTRAL', 'TSIM SHA TSUI', 'LANTAU'],
    center: [22.3193, 114.1694],
    zoom: 11,
  },
  {
    code: 'MO',
    name: 'MACAU',
    nameKo: '마카오',
    currency: 'MOP',
    currencySymbol: 'MOP$',
    rateToKRW: 172.0,
    cities: ['MACAU', 'TAIPA', 'COTAI', 'COLOANE'],
    center: [22.1987, 113.5439],
    zoom: 12,
  },
  {
    code: 'CN',
    name: 'CHINA',
    nameKo: '중국',
    currency: 'CNY',
    currencySymbol: '¥',
    rateToKRW: 190.0,
    cities: ['SHANGHAI', 'BEIJING', 'QINGDAO', 'ZHANGJIAJIE', 'CHENGDU', 'GUANGZHOU', 'XIAN'],
    center: [35.8617, 104.1954],
    zoom: 4,
  },
  {
    code: 'MN',
    name: 'MONGOLIA',
    nameKo: '몽골',
    currency: 'MNT',
    currencySymbol: '₮',
    rateToKRW: 0.4,
    cities: ['ULAANBAATAR', 'GOBI', 'TERELJ', 'KHUVSGUL'],
    center: [46.8625, 103.8467],
    zoom: 5,
  },

  // ─── SOUTHEAST ASIA ────────────────────────────────────────────────────────
  {
    code: 'VN',
    name: 'VIETNAM',
    nameKo: '베트남',
    currency: 'VND',
    currencySymbol: '₫',
    rateToKRW: 0.055,
    cities: ['DA NANG', 'HANOI', 'HO CHI MINH', 'NHA TRANG', 'PHU QUOC', 'HOI AN', 'SAPA'],
    center: [15.8, 108.0],
    zoom: 5.5,
  },
  {
    code: 'TH',
    name: 'THAILAND',
    nameKo: '태국',
    currency: 'THB',
    currencySymbol: '฿',
    rateToKRW: 38.0,
    cities: ['BANGKOK', 'CHIANG MAI', 'PHUKET', 'PATTAYA', 'KOH SAMUI', 'KRABI'],
    center: [14.5, 101.0],
    zoom: 5.5,
  },
  {
    code: 'PH',
    name: 'PHILIPPINES',
    nameKo: '필리핀',
    currency: 'PHP',
    currencySymbol: '₱',
    rateToKRW: 24.5,
    cities: ['CEBU', 'BORACAY', 'BOHOL', 'MANILA', 'CORON', 'EL NIDO'],
    center: [12.8797, 121.7740],
    zoom: 5.5,
  },
  {
    code: 'SG',
    name: 'SINGAPORE',
    nameKo: '싱가포르',
    currency: 'SGD',
    currencySymbol: 'S$',
    rateToKRW: 1040,
    cities: ['SINGAPORE', 'SENTOSA', 'MARINA BAY'],
    center: [1.3521, 103.8198],
    zoom: 11,
  },
  {
    code: 'MY',
    name: 'MALAYSIA',
    nameKo: '말레이시아',
    currency: 'MYR',
    currencySymbol: 'RM',
    rateToKRW: 295.0,
    cities: ['KUALA LUMPUR', 'KOTA KINABALU', 'PENANG', 'LANGKAWI', 'MALACCA'],
    center: [4.2105, 101.9758],
    zoom: 5.5,
  },
  {
    code: 'ID',
    name: 'INDONESIA',
    nameKo: '인도네시아',
    currency: 'IDR',
    currencySymbol: 'Rp',
    rateToKRW: 0.088,
    cities: ['BALI', 'JAKARTA', 'YOGYAKARTA', 'LOMBOK', 'KOMODO'],
    center: [-0.7893, 113.9213],
    zoom: 5,
  },
  {
    code: 'LA',
    name: 'LAOS',
    nameKo: '라오스',
    currency: 'LAK',
    currencySymbol: '₭',
    rateToKRW: 0.065,
    cities: ['VIENTIANE', 'LUANG PRABANG', 'VANG VIENG'],
    center: [19.8563, 102.4955],
    zoom: 6,
  },
  {
    code: 'KH',
    name: 'CAMBODIA',
    nameKo: '캄보디아',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['SIEM REAP', 'PHNOM PENH', 'KAMPOT'],
    center: [12.5657, 104.9910],
    zoom: 6.5,
  },
  {
    code: 'MV',
    name: 'MALDIVES',
    nameKo: '몰디브',
    currency: 'MVR',
    currencySymbol: 'Rf',
    rateToKRW: 90.0,
    cities: ['MALE', 'MAAFUSHI', 'ARI ATOLL'],
    center: [3.2028, 73.2207],
    zoom: 7,
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
    center: [46.6, 2.3],
    zoom: 5.5,
  },
  {
    code: 'IT',
    name: 'ITALY',
    nameKo: '이탈리아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['ROME', 'FLORENCE', 'VENICE', 'MILAN', 'NAPLES', 'AMALFI', 'POSITANO'],
    center: [42.5, 12.5],
    zoom: 5.5,
  },
  {
    code: 'ES',
    name: 'SPAIN',
    nameKo: '스페인',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BARCELONA', 'MADRID', 'SEVILLE', 'GRANADA', 'VALENCIA', 'MALAGA', 'IBIZA'],
    center: [40.4, -3.7],
    zoom: 5.5,
  },
  {
    code: 'GB',
    name: 'UNITED KINGDOM',
    nameKo: '영국',
    currency: 'GBP',
    currencySymbol: '£',
    rateToKRW: 1750,
    cities: ['LONDON', 'EDINBURGH', 'MANCHESTER', 'OXFORD', 'CAMBRIDGE', 'LIVERPOOL'],
    center: [54.5, -2.5],
    zoom: 5.5,
  },
  {
    code: 'CH',
    name: 'SWITZERLAND',
    nameKo: '스위스',
    currency: 'CHF',
    currencySymbol: 'CHF',
    rateToKRW: 1540,
    cities: ['ZURICH', 'INTERLAKEN', 'GENEVA', 'LUCERNE', 'ZERMATT', 'GRINDELWALD'],
    center: [46.8, 8.2],
    zoom: 7,
  },
  {
    code: 'DE',
    name: 'GERMANY',
    nameKo: '독일',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BERLIN', 'MUNICH', 'FRANKFURT', 'HAMBURG', 'COLOGNE', 'HEIDELBERG'],
    center: [51.1, 10.4],
    zoom: 5.5,
  },
  {
    code: 'AT',
    name: 'AUSTRIA',
    nameKo: '오스트리아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['VIENNA', 'SALZBURG', 'HALLSTATT', 'INNSBRUCK', 'GRAZ'],
    center: [47.5162, 14.5501],
    zoom: 6.5,
  },
  {
    code: 'CZ',
    name: 'CZECH REPUBLIC',
    nameKo: '체코',
    currency: 'CZK',
    currencySymbol: 'Kč',
    rateToKRW: 58.0,
    cities: ['PRAGUE', 'CESKY KRUMLOV', 'BRNO', 'KARLOVY VARY'],
    center: [49.8175, 15.4730],
    zoom: 6.5,
  },
  {
    code: 'HU',
    name: 'HUNGARY',
    nameKo: '헝가리',
    currency: 'HUF',
    currencySymbol: 'Ft',
    rateToKRW: 3.7,
    cities: ['BUDAPEST', 'DEBRECEN', 'EGER', 'SZEGED'],
    center: [47.1625, 19.5033],
    zoom: 6.5,
  },
  {
    code: 'HR',
    name: 'CROATIA',
    nameKo: '크로아티아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['DUBROVNIK', 'ZAGREB', 'SPLIT', 'PLITVICE', 'HVAR', 'ZADAR'],
    center: [45.1, 15.2],
    zoom: 6,
  },
  {
    code: 'PT',
    name: 'PORTUGAL',
    nameKo: '포르투갈',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['LISBON', 'PORTO', 'SINTRA', 'FARO', 'COIMBRA', 'MADEIRA'],
    center: [39.3999, -8.2245],
    zoom: 6,
  },
  {
    code: 'GR',
    name: 'GREECE',
    nameKo: '그리스',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['ATHENS', 'SANTORINI', 'MYKONOS', 'CRETE', 'ZAKYNTHOS'],
    center: [39.0742, 21.8243],
    zoom: 6,
  },
  {
    code: 'NL',
    name: 'NETHERLANDS',
    nameKo: '네덜란드',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['AMSTERDAM', 'ROTTERDAM', 'UTRECHT', 'THE HAGUE', 'GIETHOORN'],
    center: [52.1326, 5.2913],
    zoom: 7,
  },
  {
    code: 'BE',
    name: 'BELGIUM',
    nameKo: '벨기에',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BRUSSELS', 'BRUGES', 'GHENT', 'ANTWERP'],
    center: [50.5039, 4.4699],
    zoom: 7.5,
  },
  {
    code: 'TR',
    name: 'TURKEY',
    nameKo: '튀르키예',
    currency: 'TRY',
    currencySymbol: '₺',
    rateToKRW: 42.0,
    cities: ['ISTANBUL', 'CAPPADOCIA', 'ANTALYA', 'PAMUKKALE', 'IZMIR'],
    center: [38.9637, 35.2433],
    zoom: 5.5,
  },
  {
    code: 'IS',
    name: 'ICELAND',
    nameKo: '아이슬란드',
    currency: 'ISK',
    currencySymbol: 'kr',
    rateToKRW: 9.8,
    cities: ['REYKJAVIK', 'VIK', 'AKUREYRI', 'GOLDEN CIRCLE'],
    center: [64.9631, -19.0208],
    zoom: 6,
  },

  // ─── AMERICAS & OCEANIA ───────────────────────────────────────────────────
  {
    code: 'US',
    name: 'UNITED STATES',
    nameKo: '미국',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['NEW YORK', 'LOS ANGELES', 'SAN FRANCISCO', 'LAS VEGAS', 'HONOLULU', 'SEATTLE', 'CHICAGO'],
    center: [39.8, -98.5],
    zoom: 4,
  },
  {
    code: 'GU',
    name: 'GUAM',
    nameKo: '괌',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['TUMON', 'HAGATNA', 'TAMUNING'],
    center: [13.4443, 144.7937],
    zoom: 11,
  },
  {
    code: 'MP',
    name: 'SAIPAN',
    nameKo: '사이판',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['GARAPAN', 'MARPI', 'SUSUPE'],
    center: [15.1850, 145.7467],
    zoom: 11,
  },
  {
    code: 'CA',
    name: 'CANADA',
    nameKo: '캐나다',
    currency: 'CAD',
    currencySymbol: 'C$',
    rateToKRW: 1010,
    cities: ['VANCOUVER', 'TORONTO', 'MONTREAL', 'QUEBEC', 'BANFF', 'CALGARY'],
    center: [56.1, -106.3],
    zoom: 3.5,
  },
  {
    code: 'AU',
    name: 'AUSTRALIA',
    nameKo: '호주',
    currency: 'AUD',
    currencySymbol: 'A$',
    rateToKRW: 900,
    cities: ['SYDNEY', 'MELBOURNE', 'BRISBANE', 'PERTH', 'GOLD COAST', 'CAIRNS'],
    center: [-25.2, 133.7],
    zoom: 4,
  },
  {
    code: 'NZ',
    name: 'NEW ZEALAND',
    nameKo: '뉴질랜드',
    currency: 'NZD',
    currencySymbol: 'NZ$',
    rateToKRW: 840,
    cities: ['AUCKLAND', 'QUEENSTOWN', 'CHRISTCHURCH', 'ROTORUA'],
    center: [-40.9006, 174.8860],
    zoom: 5,
  },
  {
    code: 'MX',
    name: 'MEXICO',
    nameKo: '멕시코',
    currency: 'MXN',
    currencySymbol: '$',
    rateToKRW: 72.0,
    cities: ['CANCUN', 'MEXICO CITY', 'PLAYA DEL CARMEN', 'TULUM'],
    center: [23.6345, -102.5528],
    zoom: 4.5,
  },
  {
    code: 'AE',
    name: 'UNITED ARAB EMIRATES',
    nameKo: '아랍에미리트',
    currency: 'AED',
    currencySymbol: 'AED',
    rateToKRW: 375.0,
    cities: ['DUBAI', 'ABU DHABI', 'SHARJAH'],
    center: [23.4241, 53.8478],
    zoom: 7,
  },
];

const KNOWN_CITY_COORDS: { [key: string]: [number, number] } = {
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
  istanbul: [41.0082, 28.9784],
  이스탄불: [41.0082, 28.9784],
  cappadocia: [38.6431, 34.8289],
  카파도키아: [38.6431, 34.8289],
  reykjavik: [64.1466, -21.9426],
  레이캬비크: [64.1466, -21.9426],
  newyork: [40.7128, -74.0060],
  뉴욕: [40.7128, -74.0060],
  losangeles: [34.0522, -118.2437],
  로스앤젤레스: [34.0522, -118.2437],
  sanfrancisco: [37.7749, -122.4194],
  샌프란시스코: [37.7749, -122.4194],
  lasvegas: [36.1699, -115.1398],
  라스베이거스: [36.1699, -115.1398],
  honolulu: [21.3069, -157.8583],
  호놀룰루: [21.3069, -157.8583],
  hawaii: [21.3069, -157.8583],
  하와이: [21.3069, -157.8583],
  guam: [13.4443, 144.7937],
  괌: [13.4443, 144.7937],
  tumon: [13.5137, 144.8058],
  투몬: [13.5137, 144.8058],
  saipan: [15.1850, 145.7467],
  사이판: [15.1850, 145.7467],
  garapan: [15.2078, 145.7198],
  가라판: [15.2078, 145.7198],
  vancouver: [49.2827, -123.1207],
  밴쿠버: [49.2827, -123.1207],
  toronto: [43.6532, -79.3832],
  토론토: [43.6532, -79.3832],
  banff: [51.1784, -115.5708],
  밴프: [51.1784, -115.5708],
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

interface MapPinGroup {
  city: string;
  country: string;
  lat: number;
  lng: number;
  journeys: (Trip | Plan)[];
}

interface MapHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onCreateTripForCountry?: (countryName: string) => void;
  isDarkMode: boolean;
}

export function MapHubPage({ trips, plans, onNavigate, onCreateTripForCountry, isDarkMode }: MapHubPageProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const highlightLayerRef = useRef<any>(null);
  const selectPinRef = useRef<any>(null);
  const yellowMarkersRef = useRef<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedPinGroup, setSelectedPinGroup] = useState<MapPinGroup | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

  // Favorite countries (Wishlist) state stored in localStorage
  const [favoriteCountries, setFavoriteCountries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wishlist_countries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavoriteCountry = (code: string) => {
    setFavoriteCountries(prev => {
      const updated = prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code];
      try {
        localStorage.setItem('wishlist_countries', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const allJourneys = useMemo(() => [...trips, ...plans], [trips, plans]);

  // Group journeys into geographic pins (Multi-city per country support)
  const pinGroups: MapPinGroup[] = useMemo(() => {
    const map = new Map<string, MapPinGroup>();

    allJourneys.forEach(journey => {
      const pointsToPin: { name: string; lat: number; lng: number }[] = [];

      // 1. Check locations array on journey
      if (journey.locations && journey.locations.length > 0) {
        journey.locations.forEach(locObj => {
          if (locObj.lat && locObj.lng) {
            pointsToPin.push({ name: locObj.name, lat: locObj.lat, lng: locObj.lng });
          } else if (locObj.name) {
            const clean = cleanAdministrativeDistricts(locObj.name).trim();
            const key = clean.toLowerCase().replace(/\s+/g, '');
            const coords = KNOWN_CITY_COORDS[key] || KNOWN_CITY_COORDS[clean];
            if (coords) {
              pointsToPin.push({ name: clean, lat: coords[0], lng: coords[1] });
            }
          }
        });
      }

      // 2. Parse locationStr (split multiple cities e.g. "도쿄, 오사카")
      const locStr = journey.locationStr || journey.country || '';
      if (locStr) {
        const cleanLoc = cleanAdministrativeDistricts(locStr);
        const parts = cleanLoc.split(/[,·/|]/).map(p => p.trim()).filter(Boolean);

        parts.forEach(part => {
          const cleanPart = cleanAdministrativeDistricts(part).trim();
          const key = cleanPart.toLowerCase().replace(/\s+/g, '');

          let coords: [number, number] | null = null;
          if (KNOWN_CITY_COORDS[key]) {
            coords = KNOWN_CITY_COORDS[key];
          } else if (KNOWN_CITY_COORDS[cleanPart]) {
            coords = KNOWN_CITY_COORDS[cleanPart];
          } else if (journey.lat && journey.lng && parts.length === 1) {
            coords = [journey.lat, journey.lng];
          } else {
            // Match against country
            const matchedCountry = COUNTRIES_DATA.find(c =>
              c.name.toLowerCase() === key ||
              c.nameKo === cleanPart ||
              c.cities.some(cty => cty.toLowerCase() === key)
            );
            if (matchedCountry) {
              coords = matchedCountry.center;
            }
          }

          if (coords) {
            if (!pointsToPin.some(p => Math.abs(p.lat - coords![0]) < 0.05 && Math.abs(p.lng - coords![1]) < 0.05)) {
              pointsToPin.push({ name: cleanPart, lat: coords[0], lng: coords[1] });
            }
          }
        });
      }

      // 3. Fallback to direct journey lat/lng
      if (pointsToPin.length === 0 && journey.lat && journey.lng) {
        pointsToPin.push({
          name: journey.locationStr || journey.country || 'Unknown',
          lat: journey.lat,
          lng: journey.lng,
        });
      }

      // Add each extracted point into the pin groups map
      pointsToPin.forEach(pt => {
        const groupKey = `${pt.lat.toFixed(2)}_${pt.lng.toFixed(2)}`;
        if (!map.has(groupKey)) {
          map.set(groupKey, {
            city: pt.name.toUpperCase(),
            country: (journey.country || '').toUpperCase(),
            lat: pt.lat,
            lng: pt.lng,
            journeys: [],
          });
        }
        const grp = map.get(groupKey)!;
        if (!grp.journeys.some(j => j.id === journey.id)) {
          grp.journeys.push(journey);
        }
      });
    });

    return Array.from(map.values());
  }, [allJourneys]);

  // Country selection handler: highlights country area and places pulse selection pin
  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    setIsSearchDropdownOpen(false);
    setSearchQuery(country.name);

    const map = mapRef.current;
    const L = (window as any).L;
    if (map && L) {
      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      if (selectPinRef.current) {
        map.removeLayer(selectPinRef.current);
        selectPinRef.current = null;
      }

      // Boundary highlight circle
      const radiusMeters = Math.max(140000, (11 - country.zoom) * 95000);
      highlightLayerRef.current = L.circle(country.center, {
        radius: radiusMeters,
        color: '#DC2626',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#DC2626',
        fillOpacity: 0.12,
      }).addTo(map);

      // Selected country pulse pin
      const selectHtml = `
        <div class="relative w-10 h-10 flex items-center justify-center select-none pointer-events-none">
          <span class="absolute w-12 h-12 rounded-full bg-red-600/30 animate-ping"></span>
          <span class="absolute w-8 h-8 rounded-full bg-red-600/35"></span>
          <span class="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-lg"></span>
        </div>
      `;
      const selectIcon = L.divIcon({
        className: 'custom-select-pin',
        html: selectHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      selectPinRef.current = L.marker(country.center, { icon: selectIcon, zIndexOffset: 1200 }).addTo(map);

      map.flyTo(country.center, country.zoom, { duration: 1.2 });
    }
  };

  // Close country handler: removes highlight and restores South Korea center view
  const handleCloseCountry = () => {
    setSelectedCountry(null);
    setSearchQuery('');
    const map = mapRef.current;
    if (map) {
      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      if (selectPinRef.current) {
        map.removeLayer(selectPinRef.current);
        selectPinRef.current = null;
      }
      // Restore South Korea center view
      map.flyTo([36.0, 127.5], 3.2, { duration: 1.2 });
    }
  };

  // ESC key to close modal or selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPinGroup) setSelectedPinGroup(null);
        else if (isWishlistModalOpen) setIsWishlistModalOpen(false);
        else if (selectedCountry) handleCloseCountry();
        setIsSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCountry, selectedPinGroup, isWishlistModalOpen]);

  // Initialize Leaflet Map centered on South Korea
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [36.0, 127.5], // Centered on South Korea
      zoom: 3.2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileUrl = isDarkMode
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; Esri &copy; OpenStreetMap',
      maxZoom: 16,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tiles on dark mode change
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = isDarkMode
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; Esri &copy; OpenStreetMap',
      maxZoom: 16,
    }).addTo(map);
  }, [isDarkMode]);

  // Render Red Pins for registered journeys
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    pinGroups.forEach(group => {
      const pinHtml = `
        <div class="relative cursor-pointer group select-none flex justify-center" style="width: 26px; height: 34px;">
          <!-- City Badge floating above the pin -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap bg-black text-white font-sans text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 border border-white/20 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
            ${group.city}
          </div>
          <!-- Red SVG Pin: Sharp bottom tip is precisely at (13, 34) -->
          <div class="relative w-full h-full drop-shadow-md transition-transform duration-150 group-hover:scale-110 origin-bottom">
            <svg viewBox="0 0 24 34" width="26" height="34" fill="none" xmlns="http://www.w3.org/2000/svg" class="block">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#DC2626"/>
              <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
            </svg>
            ${group.journeys.length > 1 ? `
              <span class="absolute -top-1 -right-1 bg-black text-white dark:bg-white dark:text-black font-mono font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-black shadow-xs">
                ${group.journeys.length}
              </span>
            ` : ''}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-map-pin',
        html: pinHtml,
        iconSize: [26, 34],
        iconAnchor: [13, 34],
      });

      const marker = L.marker([group.lat, group.lng], { icon }).addTo(map);

      marker.on('click', () => {
        setSelectedPinGroup(group);
      });

      markersRef.current.push(marker);
    });
  }, [pinGroups]);

  // Render Yellow Pins for favorite countries (Wishlist)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    yellowMarkersRef.current.forEach(m => map.removeLayer(m));
    yellowMarkersRef.current = [];

    favoriteCountries.forEach(code => {
      const country = COUNTRIES_DATA.find(c => c.code === code);
      if (!country) return;

      const yellowPinHtml = `
        <div class="relative cursor-pointer group select-none flex justify-center" style="width: 26px; height: 34px;">
          <!-- Country Badge floating above the pin -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap bg-amber-500 text-black font-sans text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 border border-black/20 shadow-sm">
            ★ ${country.name}
          </div>
          <!-- Yellow SVG Pin: Sharp bottom tip is precisely at (13, 34) -->
          <div class="relative w-full h-full drop-shadow-md transition-transform duration-150 group-hover:scale-110 origin-bottom">
            <svg viewBox="0 0 24 34" width="26" height="34" fill="none" xmlns="http://www.w3.org/2000/svg" class="block">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#EAB308"/>
              <polygon points="12,6.5 13.6,9.8 17.2,10.3 14.6,12.8 15.2,16.5 12,14.8 8.8,16.5 9.4,12.8 6.8,10.3 10.4,9.8" fill="#FFFFFF"/>
            </svg>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-yellow-pin',
        html: yellowPinHtml,
        iconSize: [26, 34],
        iconAnchor: [13, 34],
      });

      const marker = L.marker(country.center, { icon, zIndexOffset: 600 }).addTo(map);
      marker.on('click', () => {
        handleSelectCountry(country);
      });

      yellowMarkersRef.current.push(marker);
    });
  }, [favoriteCountries]);

  // Filtered countries for search
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES_DATA;
    const q = searchQuery.trim().toLowerCase();
    return COUNTRIES_DATA.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameKo.includes(q) ||
      c.cities.some(city => city.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Wishlist countries full data
  const wishlistCountriesData = useMemo(() => {
    return favoriteCountries
      .map(code => COUNTRIES_DATA.find(c => c.code === code))
      .filter(Boolean) as CountryInfo[];
  }, [favoriteCountries]);

  const isCurrentCountryFavorite = selectedCountry && favoriteCountries.includes(selectedCountry.code);

  return (
    <main className="relative w-full h-[calc(100vh-56px)] flex flex-col bg-white dark:bg-[#0A0A0A] overflow-hidden select-none font-sans">
      {/* 1. Top Bar: Search & Wishlist Button */}
      <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-auto z-[500] flex flex-wrap items-center gap-2.5">
        
        {/* Country Search Bar */}
        <div className="relative w-72 sm:w-80">
          <div className="relative bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-black/50 dark:text-white/50 shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="Search country or city..."
              className="w-full bg-transparent text-xs font-sans font-bold uppercase tracking-wider text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleCloseCountry}
                className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Suggestions */}
          {isSearchDropdownOpen && filteredCountries.length > 0 && (
            <>
              <div className="fixed inset-0 z-[490]" onClick={() => setIsSearchDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 shadow-2xl max-h-60 overflow-y-auto z-[510] divide-y divide-black/10 dark:divide-white/10 animate-in fade-in duration-150">
                {filteredCountries.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">
                        {c.nameKo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {favoriteCountries.includes(c.code) && (
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      )}
                      <span className="text-[9px] font-mono font-bold text-black/50 dark:text-white/50 border border-black/15 dark:border-white/15 px-1">
                        {c.currency}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={() => setIsWishlistModalOpen(true)}
          className="bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl px-3.5 py-2 text-xs font-black uppercase tracking-wider font-sans text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
          title="가고싶은 나라 즐겨찾기 목록"
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span>WISHLIST ({favoriteCountries.length})</span>
        </button>
      </div>

      {/* 2. Full-bleed Leaflet Map */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 3. Selected Country Info Panel (Swiss Minimal Editorial Tone) */}
      {selectedCountry && (
        <div className="absolute bottom-6 left-4 sm:left-6 z-[500] max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between border-b border-black/15 dark:border-white/15 pb-3">
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                COUNTRY DOSSIER
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-sans uppercase tracking-tight text-black dark:text-white">
                {selectedCountry.name}
              </h2>
              <span className="text-xs text-black/50 dark:text-white/50 font-medium">
                {selectedCountry.nameKo}
              </span>
            </div>
            <button
              onClick={handleCloseCountry}
              className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
              title="닫기 (전체보기 복원)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-b border-black/15 dark:border-white/15 text-xs font-mono">
            <div>
              <span className="text-[8.5px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">
                CURRENCY / 통화
              </span>
              <span className="font-bold text-black dark:text-white">
                {selectedCountry.currency} ({selectedCountry.currencySymbol})
              </span>
            </div>
            <div>
              <span className="text-[8.5px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">
                RATE / 환율 (KRW)
              </span>
              <span className="font-bold text-black dark:text-white">
                1 {selectedCountry.currency} ≈ ₩{selectedCountry.rateToKRW.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="py-3 border-b border-black/15 dark:border-white/15">
            <span className="text-[8.5px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold mb-1">
              MAJOR TRAVEL CITIES / 주요 여행도시
            </span>
            <div className="flex flex-wrap gap-1 text-[10px] font-sans font-black text-black/80 dark:text-white/80 uppercase">
              {selectedCountry.cities.map((city) => (
                <span key={city} className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5">
                  {city}
                </span>
              ))}
            </div>
          </div>

          {/* Actions: Favorite Toggle & Create Journey */}
          <div className="pt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFavoriteCountry(selectedCountry.code)}
              className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider font-sans border transition-colors cursor-pointer rounded-none ${
                isCurrentCountryFavorite
                  ? 'bg-amber-500 text-black border-amber-600 hover:bg-amber-400'
                  : 'bg-black/5 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isCurrentCountryFavorite ? 'fill-black' : ''}`} />
              <span>{isCurrentCountryFavorite ? 'FAVORITED' : 'WISHLIST'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onCreateTripForCountry) {
                  onCreateTripForCountry(selectedCountry.name);
                } else {
                  onNavigate('archive');
                }
              }}
              className="flex-1 py-2 px-3 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-xs font-black uppercase tracking-wider font-sans flex items-center justify-center gap-1 cursor-pointer rounded-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>여정 만들기</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Wishlist Modal */}
      {isWishlistModalOpen && (
        <div
          onClick={() => setIsWishlistModalOpen(false)}
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111111] max-w-lg w-full border border-black/20 dark:border-white/20 shadow-2xl flex flex-col max-h-[82vh] overflow-hidden rounded-none animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-black/15 dark:border-white/15 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <h3 className="text-base sm:text-lg font-black font-sans uppercase tracking-tight text-black dark:text-white">
                  WISHLIST COUNTRIES ({wishlistCountriesData.length})
                </h3>
              </div>
              <button
                onClick={() => setIsWishlistModalOpen(false)}
                className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-2.5 divide-y divide-black/10 dark:divide-white/10">
              {wishlistCountriesData.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/40 dark:text-white/40">
                  가고싶은 나라가 아직 없습니다.<br />지도에서 나라를 선택한 후 'WISHLIST' 버튼을 눌러 추가하세요.
                </div>
              ) : (
                wishlistCountriesData.map(c => (
                  <div
                    key={c.code}
                    className="pt-2.5 first:pt-0 flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => {
                        handleSelectCountry(c);
                        setIsWishlistModalOpen(false);
                      }}
                      className="cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black uppercase tracking-tight text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                          {c.name}
                        </span>
                        <span className="text-xs text-black/50 dark:text-white/50 font-medium shrink-0">
                          {c.nameKo}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-black/40 dark:text-white/40 block mt-0.5 truncate">
                        {c.cities.slice(0, 4).join(', ')} · 1 {c.currency} ≈ ₩{c.rateToKRW.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsWishlistModalOpen(false);
                          if (onCreateTripForCountry) {
                            onCreateTripForCountry(c.name);
                          } else {
                            onNavigate('archive');
                          }
                        }}
                        className="px-2.5 py-1.5 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-wider font-sans hover:opacity-85 transition-opacity flex items-center gap-1 cursor-pointer rounded-none"
                      >
                        <Plus className="w-3 h-3" />
                        <span>여정 만들기</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavoriteCountry(c.code)}
                        className="p-1.5 text-black/30 dark:text-white/30 hover:text-red-500 transition-colors cursor-pointer"
                        title="즐겨찾기 삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Journey List Modal when a Pin is Clicked */}
      {selectedPinGroup && (
        <div 
          onClick={() => setSelectedPinGroup(null)}
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111111] max-w-md w-full border border-black/20 dark:border-white/20 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden rounded-none animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-black/15 dark:border-white/15 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block">
                  REGISTERED JOURNEYS
                </span>
                <h3 className="text-lg sm:text-xl font-black font-sans uppercase tracking-tight text-black dark:text-white">
                  {selectedPinGroup.city}
                </h3>
                {selectedPinGroup.country && (
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">
                    {selectedPinGroup.country} · {selectedPinGroup.journeys.length} JOURNEY{selectedPinGroup.journeys.length > 1 ? 'S' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPinGroup(null)}
                className="p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Journey Card List */}
            <div className="flex-1 overflow-y-auto divide-y divide-black/10 dark:divide-white/10 p-2">
              {selectedPinGroup.journeys.map(journey => {
                const isPlan = journey.tags?.includes('Plan') || journey.title.includes('(Plan)');
                const cleanTitle = journey.title.replace(' (Plan)', '');

                return (
                  <div
                    key={journey.id}
                    onClick={() => {
                      setSelectedPinGroup(null);
                      onNavigate('detail', journey.id);
                    }}
                    className="p-3 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    {/* Square Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 aspect-square shrink-0 border border-black/15 dark:border-white/15 overflow-hidden bg-black/10">
                      <img
                        src={getEffectiveImageUrl(journey.img)}
                        alt={cleanTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {cleanTitle}
                        </h4>
                        {isPlan ? (
                          <span className="px-1 py-0.5 bg-blue-600 text-white font-mono text-[8px] font-black uppercase tracking-widest shrink-0">
                            PLAN
                          </span>
                        ) : (
                          <span className="px-1 py-0.5 bg-black text-white dark:bg-white dark:text-black font-mono text-[8px] font-black uppercase tracking-widest shrink-0">
                            LOG
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-black/60 dark:text-white/60 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-black/40 dark:text-white/40" />
                        <span>{journey.date}</span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Marker CSS Overrides */}
      <style>{`
        .custom-map-pin, .custom-yellow-pin, .custom-select-pin {
          background: transparent !important;
          border: none !important;
          overflow: visible !important;
        }
      `}</style>
    </main>
  );
}
