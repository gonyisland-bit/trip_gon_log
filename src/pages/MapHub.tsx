import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight, Calendar, Star, Plus, Tag, MapPin, Bookmark, Home as HomeIcon, List } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Plan } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../components/SummaryView';

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
    center: [36.5, 127.8],
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
    rateToKRW: 43.0,
    cities: ['TAIPEI', 'KAOHSIUNG', 'TAICHUNG', 'TAINAN', 'HUALIEN', 'JIUFEN'],
    center: [23.7, 121.0],
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
    rateToKRW: 177.0,
    cities: ['HONG KONG', 'KOWLOON', 'CENTRAL', 'TSIM SHA TSUI', 'LANTAU'],
    center: [22.3193, 114.1694],
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
    center: [22.1987, 113.5439],
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
    rateToKRW: 190.0,
    cities: ['SHANGHAI', 'BEIJING', 'QINGDAO', 'ZHANGJIAJIE', 'CHENGDU', 'GUANGZHOU', 'XIAN'],
    center: [35.8617, 104.1954],
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
    center: [46.8625, 103.8467],
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
    rateToKRW: 0.055,
    cities: ['DA NANG', 'HANOI', 'HO CHI MINH', 'NHA TRANG', 'PHU QUOC', 'HOI AN', 'SAPA'],
    center: [15.8, 108.0],
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
    rateToKRW: 38.0,
    cities: ['BANGKOK', 'CHIANG MAI', 'PHUKET', 'PATTAYA', 'KOH SAMUI', 'KRABI'],
    center: [14.5, 101.0],
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
    center: [12.8797, 121.7740],
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
    center: [1.3521, 103.8198],
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
    center: [4.2105, 101.9758],
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
    center: [-0.7893, 113.9213],
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
    center: [19.8563, 102.4955],
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
    center: [12.5657, 104.9910],
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
    center: [3.2028, 73.2207],
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
    center: [20.5937, 78.9629],
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
    center: [28.3949, 84.1240],
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
    center: [46.6, 2.3],
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
    center: [42.5, 12.5],
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
    center: [40.4, -3.7],
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
    center: [54.5, -2.5],
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
    center: [46.8, 8.2],
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
    center: [51.1, 10.4],
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
    center: [47.5162, 14.5501],
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
    center: [49.8175, 15.4730],
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
    center: [47.1625, 19.5033],
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
    center: [45.1, 15.2],
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
    center: [39.3999, -8.2245],
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
    center: [39.0742, 21.8243],
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
    center: [52.1326, 5.2913],
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
    center: [50.5039, 4.4699],
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
    center: [56.2639, 9.5018],
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
    center: [60.4720, 8.4689],
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
    center: [60.1282, 18.6435],
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
    center: [61.9241, 25.7482],
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
    center: [51.9194, 19.1451],
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
    center: [53.1424, -7.6921],
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
    center: [45.9432, 24.9668],
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
    center: [46.1512, 14.9955],
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
    center: [64.9631, -19.0208],
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
    center: [38.9637, 35.2433],
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
    center: [26.8206, 30.8025],
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
    center: [31.7917, -7.0926],
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
    center: [-30.5595, 22.9375],
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
    center: [-0.0236, 37.9062],
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
    center: [-6.3690, 34.8888],
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
    center: [23.4241, 53.8478],
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
    center: [30.5852, 36.2384],
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
    center: [25.3548, 51.1839],
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
    center: [23.8859, 45.0792],
    zoom: 5,
    continent: 'Middle East',
    continentKo: '중동',
  },

  // ─── AMERICAS ─────────────────────────────────────────────────────────────
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
    center: [56.1, -106.3],
    zoom: 3.5,
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
    center: [23.6345, -102.5528],
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
    center: [21.5218, -77.7812],
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
    center: [-9.1900, -75.0152],
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
    center: [-14.2350, -51.9253],
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
    center: [-38.4161, -63.6167],
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
    center: [-35.6751, -71.5430],
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
    center: [4.5709, -74.2973],
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
    center: [-25.2, 133.7],
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
    center: [-40.9006, 174.8860],
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
    center: [-17.7134, 178.0650],
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
    cities: ['TUMON', 'HAGATNA', 'TAMUNING'],
    center: [13.4443, 144.7937],
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
    cities: ['GARAPAN', 'MARPI', 'SUSUPE'],
    center: [15.1850, 145.7467],
    zoom: 11,
    continent: 'Oceania',
    continentKo: '오세아니아',
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
  mexicocity: [19.4326, -99.1332],
  멕시코시티: [19.4326, -99.1332],
  lima: [-12.0464, -77.0428],
  리마: [-12.0464, -77.0428],
  cusco: [-13.5319, -71.9675],
  쿠스코: [-13.5319, -71.9675],
  machupicchu: [-13.1631, -72.5450],
  마추픽추: [-13.1631, -72.5450],
  riodejaneiro: [-22.9068, -43.1729],
  리우데자네이루: [-22.9068, -43.1729],
  saopaulo: [-23.5505, -46.6333],
  상파울루: [-23.5505, -46.6333],
  buenosaires: [-34.6037, -58.3816],
  부에노스아이레스: [-34.6037, -58.3816],
  santiago: [-33.4489, -70.6693],
  산티아고: [-33.4489, -70.6693],
  bogota: [4.7110, -74.0721],
  보고타: [4.7110, -74.0721],
  havana: [23.1136, -82.3666],
  아바나: [23.1136, -82.3666],
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
};

export function findCountryForGroup(countryStr?: string, cityStr?: string): CountryInfo | undefined {
  if (!countryStr && !cityStr) return undefined;
  const cClean = (countryStr || '').toUpperCase().trim();
  const cityClean = (cityStr || '').toUpperCase().trim();

  // 1. Direct code or name match
  let found = COUNTRIES_DATA.find(c => 
    c.code === cClean || 
    c.name.toUpperCase() === cClean || 
    c.nameKo === countryStr ||
    cClean.includes(c.name.toUpperCase()) ||
    (countryStr && countryStr.includes(c.nameKo))
  );
  if (found) return found;

  // 2. City name match
  found = COUNTRIES_DATA.find(c =>
    c.cities.some(cty => cty.toUpperCase() === cityClean || cityClean.includes(cty.toUpperCase()))
  );
  return found;
}

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
  const countryDotsRef = useRef<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedPinGroup, setSelectedPinGroup] = useState<MapPinGroup | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [wishlistTab, setWishlistTab] = useState<'countries' | 'cities'>('countries');
  const [isPlaceListModalOpen, setIsPlaceListModalOpen] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');

  // Map tile style state (esri or google)
  const [mapTileStyle, setMapTileStyle] = useState<'esri' | 'google'>(() => {
    return (localStorage.getItem('mapTileStyle') as any) || 'esri';
  });

  useEffect(() => {
    const handleTileChange = (e: any) => {
      const newStyle = e?.detail || localStorage.getItem('mapTileStyle') || 'esri';
      setMapTileStyle(newStyle);
    };
    window.addEventListener('mapTileStyleChanged', handleTileChange);
    return () => window.removeEventListener('mapTileStyleChanged', handleTileChange);
  }, []);

  // Favorite countries (Wishlist) state with Firebase Firestore synchronization & local fallback
  const [favoriteCountries, setFavoriteCountries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wishlist_countries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorite cities (Wishlist) state with Firebase Firestore synchronization & local fallback
  const [favoriteCities, setFavoriteCities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wishlist_cities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Real-time synchronization of Wishlist from Firebase
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', 'public', 'settings', 'map_wishlist'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.countries)) {
          setFavoriteCountries(data.countries);
          try {
            localStorage.setItem('wishlist_countries', JSON.stringify(data.countries));
          } catch (_) {}
        }
        if (Array.isArray(data.cities)) {
          setFavoriteCities(data.cities);
          try {
            localStorage.setItem('wishlist_cities', JSON.stringify(data.cities));
          } catch (_) {}
        }
      }
    }, (error) => {
      console.warn("Firestore map_wishlist sync error:", error);
    });

    return () => unsub();
  }, []);

  // View toggles: Pin Labels, Visited (Red pins), Wishlist (Yellow pins)
  // Pin labels are ALWAYS shown by default from the start
  const [showPinLabels, setShowPinLabels] = useState<boolean>(true);
  const [showVisitedPins, setShowVisitedPins] = useState<boolean>(true);
  const [showWishlistPins, setShowWishlistPins] = useState<boolean>(true);

  const togglePinLabels = () => {
    setShowPinLabels(prev => !prev);
  };

  const toggleVisitedPins = () => {
    setShowVisitedPins(prev => !prev);
  };

  const toggleWishlistPins = () => {
    setShowWishlistPins(prev => !prev);
  };

  const toggleFavoriteCountry = async (code: string) => {
    const isRemoving = favoriteCountries.includes(code);

    if (isRemoving) {
      // Check if any favorite city belongs to this country
      const countryData = COUNTRIES_DATA.find(c => c.code === code);
      if (countryData && countryData.cities) {
        const hasFavoritedCity = countryData.cities.some(city => 
          favoriteCities.includes(city.toUpperCase())
        );
        if (hasFavoritedCity) {
          alert(`위시리스트에 등록된 해당 국가의 도시가 포함되어 있어 국가 위시를 해제할 수 없습니다.\n먼저 도시 위시를 해제해주세요.`);
          return;
        }
      }
    }

    const updated = isRemoving
      ? favoriteCountries.filter(c => c !== code)
      : [...favoriteCountries, code];

    setFavoriteCountries(updated);
    try {
      localStorage.setItem('wishlist_countries', JSON.stringify(updated));
    } catch (_) {}

    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'map_wishlist'), {
        countries: updated,
        cities: favoriteCities,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save wishlist to server:", err);
    }
  };

  const toggleFavoriteCity = async (cityName: string) => {
    const cityUpper = cityName.toUpperCase();
    const isAdding = !favoriteCities.includes(cityUpper);
    const updatedCities = isAdding
      ? [...favoriteCities, cityUpper]
      : favoriteCities.filter(c => c !== cityUpper);

    let updatedCountries = [...favoriteCountries];
    if (isAdding) {
      const matchedCountry = COUNTRIES_DATA.find(c =>
        c.cities.some(cty => cty.toUpperCase() === cityUpper)
      );
      if (matchedCountry && !updatedCountries.includes(matchedCountry.code)) {
        updatedCountries.push(matchedCountry.code);
        setFavoriteCountries(updatedCountries);
        try {
          localStorage.setItem('wishlist_countries', JSON.stringify(updatedCountries));
        } catch (_) {}
      }
    }

    setFavoriteCities(updatedCities);
    try {
      localStorage.setItem('wishlist_cities', JSON.stringify(updatedCities));
    } catch (_) {}

    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'map_wishlist'), {
        countries: updatedCountries,
        cities: updatedCities,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save city wishlist to server:", err);
    }
  };

  const allJourneys = useMemo(() => [...trips, ...plans], [trips, plans]);

  // Group journeys into geographic pins (Multi-city per country & Same city deduplication)
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

      // Add each extracted point into the pin groups map, merging same cities
      pointsToPin.forEach(pt => {
        const ptCityClean = cleanAdministrativeDistricts(pt.name).toUpperCase().trim();

        // 1. Strip trailing country strings like ", SOUTH KOREA", ", KOREA", ", JAPAN", etc.
        let cityCleaned = ptCityClean
          .replace(/,\s*(SOUTH KOREA|KOREA|대한민국|한국|JAPAN|일본|VIETNAM|베트남|THAILAND|태국|TAIWAN|대만|CHINA|중국|USA|미국|FRANCE|프랑스|ITALY|이탈리아|UK|영국|SPAIN|스페인).*$/i, '')
          .replace(/\s+(SOUTH KOREA|KOREA|대한민국|한국|JAPAN|일본).*$/i, '')
          .trim();

        // 2. Canonical city normalizer with robust keyword matching
        let canonicalCity = cityCleaned;
        if (
          canonicalCity.includes('JEJU') || 
          canonicalCity.includes('제주') || 
          canonicalCity.includes('SEOGWIPO') || 
          canonicalCity.includes('서귀포')
        ) {
          canonicalCity = 'JEJU';
        } else if (
          canonicalCity.includes('TOKYO') || 
          canonicalCity.includes('도쿄') || 
          canonicalCity.includes('SHINJUKU') || 
          canonicalCity.includes('SHIBUYA') || 
          canonicalCity.includes('GINZA') || 
          canonicalCity.includes('신주쿠') || 
          canonicalCity.includes('시부야') || 
          canonicalCity.includes('긴자')
        ) {
          canonicalCity = 'TOKYO';
        } else if (
          canonicalCity.includes('OSAKA') || 
          canonicalCity.includes('오사카') || 
          canonicalCity.includes('UMEDA') || 
          canonicalCity.includes('NAMBA') || 
          canonicalCity.includes('우메다') || 
          canonicalCity.includes('난바')
        ) {
          canonicalCity = 'OSAKA';
        } else if (
          canonicalCity.includes('KYOTO') || 
          canonicalCity.includes('교토')
        ) {
          canonicalCity = 'KYOTO';
        } else if (
          canonicalCity.includes('FUKUOKA') || 
          canonicalCity.includes('후쿠오카') || 
          canonicalCity.includes('HAKATA') || 
          canonicalCity.includes('하카타')
        ) {
          canonicalCity = 'FUKUOKA';
        } else if (
          canonicalCity.includes('SEOUL') || 
          canonicalCity.includes('서울') || 
          canonicalCity.includes('GANGNAM') || 
          canonicalCity.includes('강남') || 
          canonicalCity.includes('HONGDAE') || 
          canonicalCity.includes('홍대') || 
          canonicalCity.includes('MYEONGDONG') || 
          canonicalCity.includes('명동')
        ) {
          canonicalCity = 'SEOUL';
        } else if (
          canonicalCity.includes('BUSAN') || 
          canonicalCity.includes('부산') || 
          canonicalCity.includes('HAEUNDAE') || 
          canonicalCity.includes('해운대')
        ) {
          canonicalCity = 'BUSAN';
        } else if (
          canonicalCity.includes('GANGNEUNG') || 
          canonicalCity.includes('강릉')
        ) {
          canonicalCity = 'GANGNEUNG';
        } else if (
          canonicalCity.includes('SOKCHO') || 
          canonicalCity.includes('속초')
        ) {
          canonicalCity = 'SOKCHO';
        } else if (
          canonicalCity.includes('GYEONGJU') || 
          canonicalCity.includes('경주')
        ) {
          canonicalCity = 'GYEONGJU';
        } else if (
          canonicalCity.includes('INCHEON') || 
          canonicalCity.includes('인천')
        ) {
          canonicalCity = 'INCHEON';
        } else if (
          canonicalCity.includes('JEONJU') || 
          canonicalCity.includes('전주')
        ) {
          canonicalCity = 'JEONJU';
        } else if (
          canonicalCity.includes('DANANG') || 
          canonicalCity.includes('DA NANG') || 
          canonicalCity.includes('다낭')
        ) {
          canonicalCity = 'DA NANG';
        } else if (
          canonicalCity.includes('HANOI') || 
          canonicalCity.includes('하노이')
        ) {
          canonicalCity = 'HANOI';
        } else if (
          canonicalCity.includes('HOCHIMINH') || 
          canonicalCity.includes('HO CHI MINH') || 
          canonicalCity.includes('호치민')
        ) {
          canonicalCity = 'HO CHI MINH';
        } else if (
          canonicalCity.includes('BANGKOK') || 
          canonicalCity.includes('방콕')
        ) {
          canonicalCity = 'BANGKOK';
        } else if (
          canonicalCity.includes('TAIPEI') || 
          canonicalCity.includes('타이베이')
        ) {
          canonicalCity = 'TAIPEI';
        } else if (
          canonicalCity.includes('HONG KONG') || 
          canonicalCity.includes('HONGKONG') || 
          canonicalCity.includes('홍콩')
        ) {
          canonicalCity = 'HONG KONG';
        } else if (
          canonicalCity.includes('PARIS') || 
          canonicalCity.includes('파리')
        ) {
          canonicalCity = 'PARIS';
        } else if (
          canonicalCity.includes('LONDON') || 
          canonicalCity.includes('런던')
        ) {
          canonicalCity = 'LONDON';
        } else if (
          canonicalCity.includes('GUAM') || 
          canonicalCity.includes('괌')
        ) {
          canonicalCity = 'GUAM';
        } else if (
          canonicalCity.includes('SAIPAN') || 
          canonicalCity.includes('사이판')
        ) {
          canonicalCity = 'SAIPAN';
        }

        // Find existing group by canonical city name OR proximity (< 0.28 degrees ~ 30km)
        let foundGroup: MapPinGroup | undefined;
        for (const existing of map.values()) {
          const sameCanonical = existing.city === canonicalCity;
          const closeDistance = Math.hypot(existing.lat - pt.lat, existing.lng - pt.lng) < 0.28;
          if (sameCanonical || closeDistance) {
            foundGroup = existing;
            break;
          }
        }

        if (foundGroup) {
          if (!foundGroup.journeys.some(j => j.id === journey.id)) {
            foundGroup.journeys.push(journey);
          }
        } else {
          const groupKey = `${canonicalCity}_${pt.lat.toFixed(2)}_${pt.lng.toFixed(2)}`;
          map.set(groupKey, {
            city: canonicalCity,
            country: (journey.country || '').toUpperCase(),
            lat: pt.lat,
            lng: pt.lng,
            journeys: [journey],
          });
        }
      });
    });

    return Array.from(map.values());
  }, [allJourneys]);

  // Filter place groups for the Registered Places Directory
  const filteredPlaceGroups = useMemo(() => {
    if (!placeSearchQuery.trim()) return pinGroups;
    const q = placeSearchQuery.trim().toLowerCase();
    return pinGroups.filter(g => 
      g.city.toLowerCase().includes(q) ||
      (g.country && g.country.toLowerCase().includes(q)) ||
      g.journeys.some(j => j.title.toLowerCase().includes(q))
    );
  }, [pinGroups, placeSearchQuery]);

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

      // Boundary highlight circle (proportional to country size/zoom)
      const radiusMeters = country.zoom >= 11
        ? 15000 // Hong Kong, Macau, Singapore
        : country.zoom >= 9
          ? 35000 // Small island nations / city states
          : country.zoom >= 7
            ? 75000 // Taiwan, Maldives, Nepal, etc.
            : Math.max(110000, (10.5 - country.zoom) * 85000);

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

      // On mobile screens, offset center downward so pin appears in the upper 1/3 of viewport above bottom sheet
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        const targetPoint = map.project(country.center, country.zoom).add([0, window.innerHeight * 0.22]);
        const targetCenter = map.unproject(targetPoint, country.zoom);
        map.flyTo(targetCenter, country.zoom, { duration: 1.2 });
      } else {
        map.flyTo(country.center, country.zoom, { duration: 1.2 });
      }
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
      // Restore South Korea center view with layer sync
      map.setView([36.0, 127.5], 3.2);
      map.invalidateSize();
      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 300);
    }
  };

  // ESC key to close modal / selection, and 'h' key to reset to global home view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === 'Escape') {
        if (selectedPinGroup) setSelectedPinGroup(null);
        else if (isPlaceListModalOpen) setIsPlaceListModalOpen(false);
        else if (isWishlistModalOpen) setIsWishlistModalOpen(false);
        else if (selectedCountry) handleCloseCountry();
        setIsSearchDropdownOpen(false);
      } else if (!isInput && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleResetToDefaultView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCountry, selectedPinGroup, isWishlistModalOpen, isPlaceListModalOpen]);

  const handleSelectCountryRef = useRef(handleSelectCountry);
  useEffect(() => {
    handleSelectCountryRef.current = handleSelectCountry;
  });

  // Geocoder & distance based country selector for direct map clicks
  const matchCountryFromLatLng = (latlng: { lat: number; lng: number }) => {
    const L = (window as any).L;
    if (!L) return;

    // Helper: geometric distance match within country influence radius
    const matchByDistance = () => {
      let closestCountry: CountryInfo | null = null;
      let minDistance = Infinity;

      for (const country of COUNTRIES_DATA) {
        const cLatLng = L.latLng(country.center[0], country.center[1]);
        const dist = cLatLng.distanceTo(L.latLng(latlng.lat, latlng.lng));

        const maxRadius = country.zoom >= 11
          ? 45000
          : country.zoom >= 9
            ? 90000
            : country.zoom >= 7
              ? 300000
              : country.zoom >= 5
                ? 800000
                : country.zoom >= 4
                  ? 1400000
                  : 2000000;

        if (dist <= maxRadius && dist < minDistance) {
          minDistance = dist;
          closestCountry = country;
        }
      }

      if (closestCountry) {
        handleSelectCountryRef.current(closestCountry);
      }
    };

    // 1. Try Google Reverse Geocoder for high-precision country matching
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat: latlng.lat, lng: latlng.lng } }, (results: any[], status: string) => {
          if (status === 'OK' && results && results.length > 0) {
            for (const result of results) {
              const countryComp = result.address_components?.find((c: any) => c.types?.includes('country'));
              if (countryComp) {
                const code = countryComp.short_name;
                const name = countryComp.long_name;
                const matched = COUNTRIES_DATA.find(c => 
                  c.code === code || 
                  c.name.toUpperCase() === name.toUpperCase() || 
                  c.nameKo === name ||
                  (result.formatted_address && c.cities.some(city => result.formatted_address.toUpperCase().includes(city)))
                );
                if (matched) {
                  handleSelectCountryRef.current(matched);
                  return;
                }
              }
            }
          }
          matchByDistance();
        });
      } catch (_) {
        matchByDistance();
      }
    } else {
      matchByDistance();
    }
  };

  // Initialize Leaflet Map centered on South Korea
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [36.0, 127.5], // Centered on South Korea
      zoom: 3.2,
      minZoom: 2.3,
      maxZoom: 18,
      zoomControl: false,
      maxBounds: [[-85, -540], [85, 540]],
      maxBoundsViscosity: 0.8,
      bounceAtZoomLimits: false,
      worldCopyJump: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Direct map click to select country
    map.on('click', (e: any) => {
      if (e && e.latlng) {
        matchCountryFromLatLng(e.latlng);
      }
    });

    const getTileConfig = (style: 'esri' | 'google', dark: boolean) => {
      if (style === 'google') {
        return {
          url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          options: {
            attribution: '&copy; Google Maps',
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            className: dark ? 'map-tiles-dark' : '',
            updateWhenIdle: false,
            updateWhenZooming: false,
            crossOrigin: true,
          }
        };
      }
      return {
        url: dark
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        options: {
          attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 18,
          tileSize: 256,
          zoomOffset: 0,
          updateWhenIdle: true,
          updateWhenZooming: false,
          crossOrigin: true,
        }
      };
    };

    const initialConfig = getTileConfig(mapTileStyle, isDarkMode);
    tileLayerRef.current = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync dark mode & mapTileStyle changes dynamically
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (mapTileStyle === 'google') {
      tileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        className: isDarkMode ? 'map-tiles-dark' : '',
        updateWhenIdle: false,
        updateWhenZooming: false,
        crossOrigin: true,
      }).addTo(map);
    } else {
      const tileUrl = isDarkMode
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 18,
        keepBuffer: 16,
        updateWhenIdle: false,
        updateWhenZooming: false,
        crossOrigin: true,
      }).addTo(map);
    }
  }, [isDarkMode, mapTileStyle]);

  // Reset to default global view (Clean reset to South Korea center view with complete mapping sync)
  const handleResetToDefaultView = () => {
    setSelectedCountry(null);
    setSelectedPinGroup(null);
    setIsPlaceListModalOpen(false);
    setIsWishlistModalOpen(false);
    setSearchQuery('');
    const map = mapRef.current;
    if (map) {
      map.stop(); // Immediately stop any in-flight animations/pans
      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      if (selectPinRef.current) {
        map.removeLayer(selectPinRef.current);
        selectPinRef.current = null;
      }
      map.setView([36.0, 127.5], 3.2);
      map.invalidateSize();
      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 300);
    }
  };

  // Render Red Pins for registered journeys (controlled by showVisitedPins and showPinLabels)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (!showVisitedPins) return;

    pinGroups.forEach(group => {
      const pinHtml = `
        <div class="relative cursor-pointer group select-none flex justify-center" style="width: 26px; height: 34px;">
          ${showPinLabels ? `
            <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px; pointer-events: none; white-space: nowrap; z-index: 1000;">
              <span style="font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 9.5px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: ${isDarkMode ? '#FFFFFF' : '#000000'}; background-color: ${isDarkMode ? '#000000' : '#FFFFFF'}; border: 1.5px solid ${isDarkMode ? '#FFFFFF' : '#000000'}; padding: 1.5px 6px; line-height: 1.2; display: inline-block; box-shadow: none; border-radius: 0;">
                ${group.city}
              </span>
            </div>
          ` : ''}
          <!-- Red SVG Pin: Sharp bottom tip is precisely at (13, 34) -->
          <div class="relative w-full h-full drop-shadow-md transition-transform duration-150 group-hover:scale-110 origin-bottom">
            <svg viewBox="0 0 24 34" width="26" height="34" fill="none" xmlns="http://www.w3.org/2000/svg" class="block">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#DC2626"/>
              <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
            </svg>
            ${group.journeys.length > 1 ? `
              <span class="absolute -top-1 -right-1 bg-black text-white dark:bg-white dark:text-black font-mono font-black text-[9.5px] w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-black shadow-xs">
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
        const c = findCountryForGroup(group.country, group.city);
        if (c) {
          handleSelectCountry(c);
        } else {
          setSelectedPinGroup(group);
        }
      });

      markersRef.current.push(marker);
    });
  }, [pinGroups, showVisitedPins, showPinLabels, isDarkMode]);

  // Render Yellow Pins for favorite countries (Wishlist, controlled by showWishlistPins and showPinLabels)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    yellowMarkersRef.current.forEach(m => map.removeLayer(m));
    yellowMarkersRef.current = [];

    if (!showWishlistPins) return;

    favoriteCountries.forEach(code => {
      const country = COUNTRIES_DATA.find(c => c.code === code);
      if (!country) return;

      const yellowPinHtml = `
        <div class="relative cursor-pointer group select-none flex justify-center" style="width: 26px; height: 34px;">
          ${showPinLabels ? `
            <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px; pointer-events: none; white-space: nowrap; z-index: 1000;">
              <span style="font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 9.5px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: ${isDarkMode ? '#FFFFFF' : '#000000'}; background-color: ${isDarkMode ? '#000000' : '#FFFFFF'}; border: 1.5px solid ${isDarkMode ? '#FFFFFF' : '#000000'}; padding: 1.5px 6px; line-height: 1.2; display: inline-block; box-shadow: none; border-radius: 0;">
                ★ ${country.name}
              </span>
            </div>
          ` : ''}
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
  }, [favoriteCountries, showWishlistPins, showPinLabels, isDarkMode]);

  // Render Faint Minimal Dot Markers for all travelable countries (Visual hint for clickable countries)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    countryDotsRef.current.forEach(m => map.removeLayer(m));
    countryDotsRef.current = [];

    COUNTRIES_DATA.forEach(country => {
      const dotHtml = `
        <div class="group relative cursor-pointer flex items-center justify-center select-none" style="width: 24px; height: 24px;">
          <!-- Hover Tooltip -->
          <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 4px; pointer-events: none; white-space: nowrap; z-index: 1000;" class="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <span style="font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: ${isDarkMode ? '#FFFFFF' : '#000000'}; background-color: ${isDarkMode ? '#000000' : '#FFFFFF'}; border: 1px solid ${isDarkMode ? '#FFFFFF' : '#000000'}; padding: 1.5px 5px; line-height: 1; display: inline-block;">
              ${country.name}
            </span>
          </div>
          <!-- Faint Dot: 7px with subtle contrast ring -->
          <div style="width: 7px; height: 7px; border-radius: 9999px; background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)'}; border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};" class="group-hover:scale-150 transition-all duration-150 shadow-2xs"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-country-dot',
        html: dotHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const dotMarker = L.marker(country.center, { icon, zIndexOffset: 300 }).addTo(map);
      dotMarker.on('click', (e: any) => {
        if (e && e.originalEvent) e.originalEvent.stopPropagation();
        handleSelectCountry(country);
      });

      countryDotsRef.current.push(dotMarker);
    });
  }, [isDarkMode]);

  // Filtered countries for search (Supports continent search e.g. "아시아", "유럽", "아프리카", "남미" and Korean city search e.g. "뉴욕", "파리", "로스앤젤레스")
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES_DATA;
    const q = searchQuery.trim().toLowerCase();
    
    // Check if query matches any mapped Korean city
    const mappedEngCity = Object.entries(CITY_KO_MAP).find(([ko]) => ko.toLowerCase().includes(q) || q.includes(ko.toLowerCase()))?.[1];

    return COUNTRIES_DATA.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameKo.includes(q) ||
      c.continent.toLowerCase().includes(q) ||
      c.continentKo.includes(q) ||
      c.cities.some(city => city.toLowerCase().includes(q)) ||
      (mappedEngCity && c.cities.some(city => city.toUpperCase() === mappedEngCity.toUpperCase() || mappedEngCity.toUpperCase().includes(city.toUpperCase())))
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
    <main className={`relative w-full h-[calc(100vh-56px)] h-[calc(100dvh-56px)] flex flex-col bg-white dark:bg-[#141414] overflow-hidden overscroll-none select-none font-sans touch-pan-x touch-pan-y ${!showPinLabels ? 'map-hide-pin-labels' : ''}`}>
      
      {/* 1. Top Bar: Search with Integrated Wishlist Star & Swiss Minimal Layer Toggles */}
      <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-auto z-[500] flex flex-wrap items-center gap-2">
        
        {/* Country & Continent Search Bar with Integrated Wishlist Star Button */}
        <div className="relative flex items-center bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl z-30">
          <div className="w-56 sm:w-72 flex items-center px-3 py-2">
            <Search className="w-3.5 h-3.5 text-black/50 dark:text-white/50 shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="SEARCH COUNTRY, CITY, CONTINENT..."
              className="w-full bg-transparent text-xs font-sans font-bold uppercase tracking-wider text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleCloseCountry}
                className="p-0.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Integrated Wishlist Star Button on the right of Search */}
          <button
            type="button"
            onClick={() => setIsWishlistModalOpen(true)}
            className={`px-3 py-2.5 border-l border-black/15 dark:border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer ${
              favoriteCountries.length > 0
                ? 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'
                : 'text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white'
            }`}
            title={`WISHLIST: ${favoriteCountries.length}`}
          >
            <Star className={`w-3.5 h-3.5 ${favoriteCountries.length > 0 ? 'fill-black text-black dark:fill-white dark:text-white' : ''}`} />
            {favoriteCountries.length > 0 && (
              <span className="text-[10px] font-mono font-black">{favoriteCountries.length}</span>
            )}
          </button>

          {/* Dropdown Suggestions */}
          {isSearchDropdownOpen && filteredCountries.length > 0 && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsSearchDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border border-black/15 dark:border-white/15 max-h-64 overflow-y-auto z-[600] shadow-2xl divide-y divide-black/5 dark:divide-white/5">
                {filteredCountries.map(c => (
                  <div
                    key={c.code}
                    onClick={() => handleSelectCountry(c)}
                    className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase text-black dark:text-white">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-sans text-black/50 dark:text-white/50">
                          ({c.nameKo})
                        </span>
                        <span className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                          {c.continentKo}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-black/40 dark:text-white/40 block mt-0.5 truncate">
                        {c.cities.slice(0, 3).join(', ')}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400">
                      {c.currency}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Swiss Minimal Monochrome Icon Toggles: Tag (Labels) / MapPin (Visited) / Bookmark (Wishlist) */}
        <div className="flex items-center border border-black/20 dark:border-white/20 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md shadow-2xl divide-x divide-black/15 dark:divide-white/15 z-10">
          {/* 1. Label Toggle (Tag) */}
          <button
            type="button"
            onClick={togglePinLabels}
            className={`p-2 sm:px-2.5 sm:py-2 transition-colors cursor-pointer flex items-center justify-center ${
              showPinLabels
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white'
            }`}
            title="TOGGLE LABELS"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>

          {/* 2. Visited Red Pins Toggle (MapPin) */}
          <button
            type="button"
            onClick={toggleVisitedPins}
            className={`p-2 sm:px-2.5 sm:py-2 transition-colors cursor-pointer flex items-center justify-center ${
              showVisitedPins
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white'
            }`}
            title="TOGGLE VISITED PINS"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>

          {/* 3. Wishlist Yellow Pins Toggle (Bookmark) */}
          <button
            type="button"
            onClick={toggleWishlistPins}
            className={`p-2 sm:px-2.5 sm:py-2 transition-colors cursor-pointer flex items-center justify-center ${
              showWishlistPins
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white'
            }`}
            title="TOGGLE WISHLIST PINS"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>

          {/* 4. Reset to Global Home View Button */}
          <button
            type="button"
            onClick={handleResetToDefaultView}
            className="p-2 sm:px-2.5 sm:py-2 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
            title="RESET VIEW (H)"
          >
            <HomeIcon className="w-3.5 h-3.5" />
          </button>

          {/* 5. Registered Journey Places List Button */}
          <button
            type="button"
            onClick={() => setIsPlaceListModalOpen(true)}
            className="p-2 sm:px-2.5 sm:py-2 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center border-l border-black/15 dark:border-white/15"
            title="PLACES LIST"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 2. Map Container (Static classes to preserve Leaflet's internal DOM state) */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0" 
      />

      {/* 3. Selected Country Card (Swiss Minimal Editorial Style - Mobile Bottom Sheet & Desktop Panel) */}
      {selectedCountry && (
        <div className="fixed sm:absolute bottom-0 sm:bottom-auto sm:top-20 left-0 right-0 sm:left-auto sm:right-6 w-full sm:w-96 max-h-[82vh] sm:max-h-[85vh] bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border-t sm:border border-black/15 dark:border-white/15 shadow-2xl z-[500] p-5 sm:p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom sm:slide-in-from-right duration-200">
          
          <div className="flex items-start justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5 font-['Inter',sans-serif]">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-500">
                  {selectedCountry.code}
                </span>
                <span className="text-[10px] font-bold text-black/40 dark:text-white/40 font-['Noto_Sans_KR',sans-serif]">
                  · {selectedCountry.continentKo}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white font-['Inter',sans-serif]">
                {selectedCountry.name}
              </h3>
              <span className="text-xs font-medium text-black/60 dark:text-white/60 font-['Noto_Sans_KR',sans-serif]">
                {selectedCountry.nameKo}
              </span>
            </div>
            <button
              onClick={handleCloseCountry}
              className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="닫기 (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* 1. Recorded Journey Cities in this Country (Tabs with counts) */}
            {(() => {
              const countryPinGroups = pinGroups.filter(g => {
                const matched = findCountryForGroup(g.country, g.city);
                return matched?.code === selectedCountry.code;
              });

              if (countryPinGroups.length === 0) return null;

              return (
                <div className="p-3 bg-red-600/5 dark:bg-red-500/10 border border-red-600/20 dark:border-red-500/20">
                  <div className="text-[10px] font-['Inter',sans-serif] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-2 flex items-center justify-between">
                    <span>RECORDED JOURNEYS</span>
                    <span className="text-[9px] font-['Noto_Sans_KR',sans-serif] font-bold text-black/50 dark:text-white/50">
                      여정 지역 선택
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-['Inter',sans-serif]">
                    {countryPinGroups.map(group => (
                      <button
                        key={group.city}
                        type="button"
                        onClick={() => setSelectedPinGroup(group)}
                        className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-white dark:bg-[#181818] border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <span>{group.city}</span>
                        <span className="text-[10px] px-1 py-0.2 bg-black/10 dark:bg-white/20 rounded-xs">
                          {group.journeys.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Currency & Exchange Info */}
            <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
              <div className="text-[10px] font-['Inter',sans-serif] font-black uppercase tracking-widest text-black/50 dark:text-white/50 mb-1">
                CURRENCY & RATE <span className="font-['Noto_Sans_KR',sans-serif] font-normal text-[9.5px]">(현지 통화)</span>
              </div>
              <div className="flex items-baseline justify-between font-['Inter',sans-serif]">
                <span className="text-base font-black">
                  {selectedCountry.currencySymbol} {selectedCountry.currency}
                </span>
                <span className="text-xs font-bold text-black/70 dark:text-white/70">
                  1 {selectedCountry.currency} ≈ ₩{selectedCountry.rateToKRW.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Main Cities Guide (With Wishlist Checkbox/Star Toggle) */}
            <div>
              <div className="text-[10px] font-['Inter',sans-serif] font-black uppercase tracking-widest text-black/50 dark:text-white/50 mb-2 flex items-center justify-between">
                <div>
                  MAJOR DESTINATIONS <span className="font-['Noto_Sans_KR',sans-serif] font-normal text-[9.5px]">(주요 여행 도시)</span>
                </div>
                <span className="text-[9px] font-['Noto_Sans_KR',sans-serif] font-bold text-amber-600 dark:text-amber-400">
                  ★ 클릭하여 위시리스트 추가
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-['Inter',sans-serif]">
                {selectedCountry.cities.map(city => {
                  const isCityFavorite = favoriteCities.includes(city.toUpperCase());
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleFavoriteCity(city)}
                      className={`px-2 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 border ${
                        isCityFavorite
                          ? 'bg-amber-500 text-black border-amber-500 shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/80 dark:text-white/80 hover:border-black dark:hover:border-white'
                      }`}
                      title={`${city} 위시리스트 토글`}
                    >
                      <Star className={`w-3 h-3 ${isCityFavorite ? 'fill-black text-black' : 'text-black/40 dark:text-white/40'}`} />
                      <span>{city}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Wishlist Toggle & Create Journey Button (Clean Swiss Minimal Grid) */}
            <div className="pt-2 border-t border-black/10 dark:border-white/10 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleFavoriteCountry(selectedCountry.code)}
                className={`w-full py-2.5 px-3 text-xs font-black uppercase tracking-widest font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                  isCurrentCountryFavorite
                    ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                    : 'bg-white dark:bg-[#161616] text-black dark:text-white border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isCurrentCountryFavorite ? 'fill-black text-black' : ''}`} />
                <span>{isCurrentCountryFavorite ? 'SAVED WISH' : 'WISH'}</span>
              </button>

              {onCreateTripForCountry && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateTripForCountry(selectedCountry.name);
                    handleCloseCountry();
                  }}
                  className="w-full py-2.5 px-3 bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-widest font-sans flex items-center justify-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>TRIP</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Wishlist Countries Modal Popup */}
      {isWishlistModalOpen && (
        <div 
          className="fixed inset-0 z-[600] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsWishlistModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 shadow-2xl p-6 select-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-3">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-500 block mb-0.5">
                  MY TRAVEL WISHLIST
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                  위시리스트 ({favoriteCountries.length + favoriteCities.length})
                </h3>
              </div>
              <button
                onClick={() => setIsWishlistModalOpen(false)}
                className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: COUNTRIES vs CITIES */}
            <div className="flex border-b border-black/10 dark:border-white/10 mb-3">
              <button
                type="button"
                onClick={() => setWishlistTab('countries')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider font-mono cursor-pointer transition-colors border-b-2 ${
                  wishlistTab === 'countries'
                    ? 'border-black dark:border-white text-black dark:text-white font-bold'
                    : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                }`}
              >
                COUNTRIES ({favoriteCountries.length})
              </button>
              <button
                type="button"
                onClick={() => setWishlistTab('cities')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider font-mono cursor-pointer transition-colors border-b-2 ${
                  wishlistTab === 'cities'
                    ? 'border-black dark:border-white text-black dark:text-white font-bold'
                    : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                }`}
              >
                CITIES ({favoriteCities.length})
              </button>
            </div>

            {wishlistTab === 'countries' ? (
              wishlistCountriesData.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/40 dark:text-white/40">
                  즐겨찾기에 등록된 국가가 없습니다. <br />
                  국가를 검색하거나 지도에서 선택하여 가고싶은 나라를 담아보세요.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 divide-y divide-black/5 dark:divide-white/5">
                  {wishlistCountriesData.map(c => (
                    <div key={c.code} className="pt-2 flex items-center justify-between gap-3">
                      <div 
                        className="cursor-pointer flex-1 min-w-0"
                        onClick={() => {
                          handleSelectCountry(c);
                          setIsWishlistModalOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black uppercase truncate text-black dark:text-white">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-sans text-black/50 dark:text-white/50">
                            ({c.nameKo})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-black/40 dark:text-white/40 block truncate">
                          {c.cities.slice(0, 3).join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onCreateTripForCountry && (
                          <button
                            type="button"
                            onClick={() => {
                              onCreateTripForCountry(c.name);
                              setIsWishlistModalOpen(false);
                            }}
                            className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black font-sans text-[10px] font-black uppercase tracking-wider cursor-pointer hover:opacity-85"
                          >
                            + 여정 만들기
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleFavoriteCountry(c.code)}
                          className="p-1 text-black/30 dark:text-white/30 hover:text-red-500 cursor-pointer"
                          title="즐겨찾기 해제"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              favoriteCities.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/40 dark:text-white/40">
                  즐겨찾기에 등록된 도시가 없습니다. <br />
                  국가 상세 카드에서 원하는 여행 도시의 ★를 눌러 담아보세요.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 divide-y divide-black/5 dark:divide-white/5">
                  {favoriteCities.map(city => {
                    const matchedCountry = COUNTRIES_DATA.find(c => c.cities.some(cty => cty.toUpperCase() === city.toUpperCase()));
                    return (
                      <div key={city} className="pt-2 flex items-center justify-between gap-3">
                        <div 
                          className="cursor-pointer flex-1 min-w-0"
                          onClick={() => {
                            if (matchedCountry) {
                              handleSelectCountry(matchedCountry);
                            }
                            setIsWishlistModalOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black uppercase truncate text-black dark:text-white">
                              {city}
                            </span>
                            {matchedCountry && (
                              <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                                · {matchedCountry.name} ({matchedCountry.nameKo})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onCreateTripForCountry && (
                            <button
                              type="button"
                              onClick={() => {
                                onCreateTripForCountry(city);
                                setIsWishlistModalOpen(false);
                              }}
                              className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black font-sans text-[10px] font-black uppercase tracking-wider cursor-pointer hover:opacity-85"
                            >
                              + 여정 만들기
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFavoriteCity(city)}
                            className="p-1 text-black/30 dark:text-white/30 hover:text-red-500 cursor-pointer"
                            title="도시 즐겨찾기 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 5. Pin Journeys Modal (When Clicking City Pin) */}
      {selectedPinGroup && (
        <div 
          className="fixed inset-0 z-[600] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPinGroup(null)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 shadow-2xl p-6 select-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                  TRIP
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white">
                  {selectedPinGroup.city}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-black/50 dark:text-white/50">
                    {selectedPinGroup.country} · {selectedPinGroup.journeys.length} JOURNEYS RECORDED
                  </span>
                  {(() => {
                    const c = findCountryForGroup(selectedPinGroup.country, selectedPinGroup.city);
                    if (!c) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setSearchQuery(c.name);
                        }}
                        className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                      >
                        [➔ {c.name} 국가 정보 보기]
                      </button>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setSelectedPinGroup(null)}
                className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
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
                    className="p-3 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-between gap-3 cursor-pointer group rounded-none"
                  >
                    <div className="w-12 h-12 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                      <img
                        src={getEffectiveImageUrl(journey.img)}
                        alt={cleanTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {cleanTitle}
                        </h4>
                        {isPlan ? (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white font-mono text-[9.5px] font-black uppercase tracking-widest shrink-0">
                            PLAN
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black font-mono text-[9.5px] font-black uppercase tracking-widest shrink-0">
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

      {/* 6. Registered Journey Places Directory Modal (신설) */}
      {isPlaceListModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPlaceListModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-xl bg-white dark:bg-[#151515] border border-black/15 dark:border-white/15 shadow-2xl p-4 sm:p-6 flex flex-col max-h-[82vh] overflow-hidden select-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/15 dark:border-white/15">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                  VISITED LOCATIONS DIRECTORY
                </span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                  등록된 여정 장소 목록 ({pinGroups.length}개 도시)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlaceListModalOpen(false)}
                className="p-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter for locations */}
            <div className="pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  value={placeSearchQuery}
                  onChange={e => setPlaceSearchQuery(e.target.value)}
                  placeholder="도시 또는 국가 검색..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 outline-none text-black dark:text-white rounded-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Place list items */}
            <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-black/10 dark:divide-white/10 mt-2 pr-1">
              {filteredPlaceGroups.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/40 dark:text-white/40">
                  검색된 등록 장소가 없습니다.
                </div>
              ) : (
                filteredPlaceGroups.map((group, idx) => {
                  const repJourney = group.journeys[0];
                  return (
                    <div
                      key={`${group.city}-${group.lat}-${group.lng}-${idx}`}
                      onClick={() => {
                        setIsPlaceListModalOpen(false);
                        const map = mapRef.current;
                        if (map) {
                          map.flyTo([group.lat, group.lng], 8, { duration: 1.2 });
                        }
                        setSelectedPinGroup(group);
                      }}
                      className="group flex items-center justify-between py-2.5 px-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 aspect-square overflow-hidden bg-black/10 shrink-0 border border-black/10 dark:border-white/10">
                          {repJourney?.img ? (
                            <img src={getEffectiveImageUrl(repJourney.img)} alt={group.city} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-black/20 dark:text-white/20">
                              <MapPin className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs sm:text-sm text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors uppercase truncate">
                              {group.city}
                            </span>
                            {group.country && (
                              <span className="text-[10px] font-mono text-black/40 dark:text-white/40 uppercase">
                                · {group.country}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-black/50 dark:text-white/50 truncate">
                            {repJourney?.title || '기록된 여정'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border border-black/10 dark:border-white/10">
                          {group.journeys.length} Trip
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Marker CSS Overrides, Swiss Minimal Typography & Label Toggle Rules */}
      <style>{`
        .custom-map-pin, .custom-yellow-pin, .custom-select-pin {
          background: transparent !important;
          border: none !important;
          overflow: visible !important;
        }
        .pin-label {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 5px;
          pointer-events: none;
          white-space: nowrap;
          display: block !important;
          z-index: 1000;
        }
        .swiss-pin-badge, .swiss-wishlist-badge {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #000000;
          background-color: #FFFFFF;
          border: 1px solid #000000;
          padding: 1.5px 5px;
          line-height: 1.25;
          display: inline-block;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .dark .swiss-pin-badge,
        .dark .swiss-wishlist-badge {
          color: #FFFFFF;
          background-color: #000000;
          border: 1px solid #FFFFFF;
        }
        .map-hide-pin-labels .pin-label {
          display: none !important;
        }
      `}</style>
    </main>
  );
}
