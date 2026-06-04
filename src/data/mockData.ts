import { Sun, Cloud, CloudRain } from 'lucide-react';
import { Trip, Plan, TripDate, TimelineData, FlightItem, StayItem, TransitItem } from '../types';

export const initialTrips: Trip[] = [
  { id: 1, title: 'KYOTO, JAPAN', date: '2025.04.12 - 04.16', tags: ['2025', 'Kyoto', 'Personal'], img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1600&auto=format&fit=crop', mapImg: 'https://images.unsplash.com/photo-1588421357574-87938a86fa28?q=80&w=1600&auto=format&fit=crop', locationStr: 'Kyoto, Japan' },
  { id: 2, title: 'PARIS, FRANCE', date: '2024.10.05 - 10.12', tags: ['2024', 'Paris', 'Business'], img: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop', mapImg: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop', locationStr: 'Paris, France' },
  { id: 3, title: 'JEJU, KOREA', date: '2024.08.20 - 08.23', tags: ['2024', 'Jeju', 'Personal'], img: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=800&auto=format&fit=crop', mapImg: 'https://images.unsplash.com/photo-1580528448896-1c4fa4b04ff1?q=80&w=1600&auto=format&fit=crop', locationStr: 'Jeju Island, South Korea' },
  { id: 4, title: 'LONDON, UK', date: '2024.01.10 - 01.18', tags: ['2024', 'London', 'Personal'], img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800&auto=format&fit=crop', mapImg: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?q=80&w=1600&auto=format&fit=crop', locationStr: 'London, UK' },
];

export const initialPlans: Plan[] = [
  { id: 101, title: 'TOKYO, JAPAN (Plan)', date: '2026.09.10 - 09.15', tags: ['2026', 'Tokyo', 'Personal'], img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop', mapImg: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1600&auto=format&fit=crop', locationStr: 'Tokyo, Japan' }
];

export const tripDates: TripDate[] = [
  { id: 'all', date: 'ALL', label: 'All Days', weather: null },
  { id: 'd1', date: '2025.04.12', label: 'Day 1', weather: { icon: Sun, temp: '24°' } },
  { id: 'd2', date: '2025.04.13', label: 'Day 2', weather: { icon: Cloud, temp: '20°' } },
  { id: 'd3', date: '2025.04.14', label: 'Day 3', weather: { icon: CloudRain, temp: '18°' } },
];

export const timelineDataByDate: TimelineData = {
  '2025.04.12': [
    { id: 1, time: '10:30 AM', type: 'transit', place: '간사이 국제공항 도착', cost: '-', memo: '입국 심사 30분 소요', x: 20, y: 15, img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=200&auto=format&fit=crop' },
    { id: 2, time: '12:00 PM', type: 'transit', place: '하루카 특급열차', cost: '¥3,600', memo: '교토역으로 이동 중', img: null },
    { id: 3, time: '13:45 PM', type: 'dining', place: '스마트 커피', cost: '¥1,200', memo: '프렌치 토스트와 커피, 레트로한 분위기', x: 45, y: 40, location: 'Teramachi-dori, Nakagyo Ward, Kyoto', hours: '08:00 AM - 19:00 PM', link: 'https://maps.google.com/?q=Smart+Coffee+Kyoto', img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=200&auto=format&fit=crop' },
    { id: 4, time: '15:30 PM', type: 'stay', place: '에이스 호텔 교토', cost: '예약완료', memo: '스탠다드 킹 룸, 쿠마 켄고 디자인', x: 50, y: 50, location: '214-1 Kurumayacho, Nakagyo Ward, Kyoto', hours: 'Check-in 15:00', link: 'https://maps.google.com/?q=Ace+Hotel+Kyoto', img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=200&auto=format&fit=crop' },
    { id: 5, time: '17:00 PM', type: 'activity', place: '카모가와 강 산책', cost: '-', memo: '노을 질 때의 풍경이 아름다움', x: 60, y: 45, location: 'Kamogawa River, Kyoto', img: 'https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?q=80&w=200&auto=format&fit=crop' },
    { id: 6, time: '19:30 PM', type: 'dining', place: '기온 거리 저녁 식사', cost: '¥8,500', memo: '오반자이 코스 요리', x: 55, y: 65, location: 'Gion, Higashiyama Ward, Kyoto', hours: '17:00 PM - 22:00 PM', link: 'https://maps.google.com/?q=Gion+Kyoto', img: null },
  ],
  '2025.04.13': [
    { id: 7, time: '09:00 AM', type: 'activity', place: '아라시야마 치쿠린', cost: '무료', memo: '아침 일찍 방문하여 사람 없을 때 산책', x: 30, y: 35, location: 'Arashiyama, Ukyo Ward, Kyoto', hours: '24 Hours Open', link: 'https://maps.google.com/?q=Arashiyama+Bamboo+Grove', img: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=200&auto=format&fit=crop' },
    { id: 8, time: '12:30 PM', type: 'dining', place: '아라시야마 요시무라', cost: '¥2,500', memo: '도게츠교가 보이는 소바 맛집', x: 33, y: 40, location: 'Arashiyama Nakaoshitacho, Nishikyo Ward, Kyoto', hours: '11:00 AM - 17:00 PM', link: 'https://maps.google.com/?q=Arashiyama+Yoshimura', img: null },
  ]
};

export const initialFlightsByTrip: { [tripId: number]: FlightItem[] } = {
  1: [
    {
      id: 1,
      title: 'OUTBOUND FLIGHT',
      date: '2025.04.12',
      fromCode: 'ICN',
      fromTerminal: 'TERMINAL T1',
      fromTime: '08:00 AM',
      toCode: 'KIX',
      toTerminal: 'TERMINAL T1',
      toTime: '10:10 AM',
      flightNo: 'KE721',
      seat: '14A',
      pnr: 'A8B9C2'
    },
    {
      id: 2,
      title: 'INBOUND FLIGHT',
      date: '2025.04.16',
      fromCode: 'KIX',
      fromTerminal: 'TERMINAL T1',
      fromTime: '18:30 PM',
      toCode: 'ICN',
      toTerminal: 'TERMINAL T2',
      toTime: '20:30 PM',
      flightNo: 'KE722',
      seat: '14B',
      pnr: 'A8B9C2'
    }
  ]
};

export const initialStaysByTrip: { [tripId: number]: StayItem[] } = {
  1: [
    {
      id: 1,
      status: 'BOOKING CONFIRMED',
      title: 'ACE HOTEL KYOTO',
      dateRange: '2025.04.12 - 04.15 (3 Nights)',
      address: '214-1 Kurumayacho, Nakagyo Ward, Kyoto',
      memo: '스탠다드 킹 룸. 체크인 시 여권 필요. 조식 포함.',
      confNo: 'HTL-9921',
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop'
    }
  ]
};

export const initialTransitByTrip: { [tripId: number]: TransitItem[] } = {
  1: [
    {
      id: 1,
      ticketType: 'TRAIN TICKET',
      date: '2025.04.12',
      title: 'HARUKA EXPRESS',
      route: 'Kansai Airport → Kyoto Station',
      time: '11:14 AM',
      seat: 'Car 4, 12A',
      bookingRef: 'TRN-881'
    }
  ]
};
