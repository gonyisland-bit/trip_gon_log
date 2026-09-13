export interface DestinationCountry {
  code: string;
  nameEn: string;
  nameKo: string;
  aliases: string[];
  bestSeason: string;
  avoidSeason: string;
  avoidReason: string;
  popularCities: string[];
}

export interface DestinationCity {
  nameEn: string;
  nameKo: string;
  countryEn: string;
  countryKo: string;
  lat: number;
  lng: number;
  tags: string[];
  bestMonths: number[]; // 1-12
  avoidMonths: { months: number[]; reason: string }[];
  iconicSpots: string[];
  hiddenGems: string[];
  coverImage: string;
}

export interface PresetTripPlan {
  id: string;
  title: string;
  subtitle: string;
  country: string;
  city: string;
  durationDays: number;
  tags: string[];
  coverImg: string;
  theme: 'shopping' | 'food' | 'activity' | 'nature' | 'art' | 'culture';
  highlights: string[];
  schedule: {
    dayOffset: number; // 0 for day 1, 1 for day 2, etc.
    items: {
      time: string;
      type: 'transit' | 'activity' | 'dining' | 'stay';
      place: string;
      memo: string;
      cost?: string;
    }[];
  }[];
}

export const WORLD_COUNTRIES: DestinationCountry[] = [
  {
    code: 'JP',
    nameEn: 'JAPAN',
    nameKo: '일본',
    aliases: ['일본', 'japan', 'jp', 'nihon', 'nippon'],
    bestSeason: '3월~5월 (벚꽃), 10월~11월 (단풍)',
    avoidSeason: '7월 말~8월, 5월 초',
    avoidReason: '8월 극심한 폭염 및 태풍, 5월 초 골든위크 극심한 인파 집중',
    popularCities: ['도쿄', '오사카', '교토', '후쿠오카', '삿포로']
  },
  {
    code: 'FR',
    nameEn: 'FRANCE',
    nameKo: '프랑스',
    aliases: ['프랑스', 'france', 'fr', 'paris'],
    bestSeason: '5월~6월, 9월~10월',
    avoidSeason: '8월',
    avoidReason: '8월 현지 여름휴가(바캉스)로 로컬 상점 및 레스토랑 대거 휴업',
    popularCities: ['파리', '니스', '리옹', '마르세유']
  },
  {
    code: 'VN',
    nameEn: 'VIETNAM',
    nameKo: '베트남',
    aliases: ['베트남', 'vietnam', 'vn', 'viet nam'],
    bestSeason: '11월~3월 (건기 쾌적)',
    avoidSeason: '9월~11월 (중부 우기·태풍), 6월~8월 (폭염)',
    avoidReason: '다낭/호이안 등 중부 지역 가을철 집중 폭우 및 침수 리스크',
    popularCities: ['다낭', '하노이', '호치민', '나트랑', '푸꾸옥']
  },
  {
    code: 'TH',
    nameEn: 'THAILAND',
    nameKo: '태국',
    aliases: ['태국', 'thailand', 'th', 'bangkok'],
    bestSeason: '11월~2월 (건기 온화)',
    avoidSeason: '4월 (극심한 폭염), 8월~10월 (몬순 우기)',
    avoidReason: '4월 40도에 육박하는 폭염, 9월 몬순 게릴라성 스콜 및 도로 침수',
    popularCities: ['방콕', '치앙마이', '푸켓', '파타야']
  },
  {
    code: 'CH',
    nameEn: 'SWITZERLAND',
    nameKo: '스위스',
    aliases: ['스위스', 'switzerland', 'ch', 'swiss'],
    bestSeason: '6월~9월 (알프스 트레킹), 12월~3월 (스키)',
    avoidSeason: '11월, 4월',
    avoidReason: '케이블카/산악열차 비수기 정기 점검 및 흐린 날씨 빈발',
    popularCities: ['인터라켄', '취리히', '체르마트', '루체른', '제네바']
  },
  {
    code: 'IT',
    nameEn: 'ITALY',
    nameKo: '이탈리아',
    aliases: ['이탈리아', '이태리', 'italy', 'it', 'italia'],
    bestSeason: '4월~6월, 9월~10월',
    avoidSeason: '7월~8월',
    avoidReason: '남유럽 살인적 폭염(40도 육박) 및 8월 페라고스토(성모승천일) 상점 휴업',
    popularCities: ['로마', '밀라노', '피렌체', '베네치아']
  },
  {
    code: 'ES',
    nameEn: 'SPAIN',
    nameKo: '스페인',
    aliases: ['스페인', 'spain', 'es', 'espana'],
    bestSeason: '4월~6월, 9월~10월',
    avoidSeason: '7월~8월',
    avoidReason: '안달루시아/마드리드 한낮 42도 이상 폭염',
    popularCities: ['바르셀로나', '마드리드', '세비야', '그라나다']
  },
  {
    code: 'US',
    nameEn: 'USA',
    nameKo: '미국',
    aliases: ['미국', 'usa', 'us', 'america', 'united states'],
    bestSeason: '도시별 상이 (동부 5~10월, 서부 연중)',
    avoidSeason: '11월 말 (추수감사절), 12월 말 (크리스마스)',
    avoidReason: '공항 및 도로 극심한 교통 체증 및 항공편 지연/폭설 리스크',
    popularCities: ['뉴욕', '로스앤젤레스', '샌프란시스코', '하와이', '라스베이거스']
  },
  {
    code: 'TW',
    nameEn: 'TAIWAN',
    nameKo: '대만',
    aliases: ['대만', '타이완', 'taiwan', 'tw'],
    bestSeason: '10월~3월 (쾌적하고 선선)',
    avoidSeason: '6월~8월 (태풍 및 폭염)',
    avoidReason: '여름철 잦은 태풍 상륙 및 고온다습한 기후',
    popularCities: ['타이베이', '가오슝', '타이난', '화롄']
  },
  {
    code: 'KR',
    nameEn: 'SOUTH KOREA',
    nameKo: '대한민국',
    aliases: ['대한민국', '한국', 'korea', 'south korea', 'kr'],
    bestSeason: '4월~5월 (봄), 9월~10월 (청명한 가을)',
    avoidSeason: '7월 중순~8월 중순 (장마·폭염)',
    avoidReason: '집중호우 장마전선 및 열대야 폭염',
    popularCities: ['서울', '부산', '제주', '강릉', '경주']
  }
];

export const WORLD_CITIES: DestinationCity[] = [
  {
    nameEn: 'Tokyo',
    nameKo: '도쿄',
    countryEn: 'JAPAN',
    countryKo: '일본',
    lat: 35.6762,
    lng: 139.6503,
    tags: ['Shopping', 'Gourmet', 'City', 'Cafe'],
    bestMonths: [3, 4, 5, 10, 11, 12],
    avoidMonths: [
      { months: [7, 8], reason: '습도 높은 여름 폭염 및 게릴라 호우' },
      { months: [5], reason: '5월 초 일본 골든위크 대규모 인파 및 숙소비 급등' }
    ],
    iconicSpots: ['시부야 스카이', '신주쿠 교엔', '도쿄 타워', '긴자 쇼핑거리'],
    hiddenGems: ['나카메구로 빈티지 카페거리', '키치조지 이노카시라 공원', '다이칸야마 티사이트'],
    coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop'
  },
  {
    nameEn: 'Kyoto',
    nameKo: '교토',
    countryEn: 'JAPAN',
    countryKo: '일본',
    lat: 35.0116,
    lng: 135.7681,
    tags: ['Culture', 'History', 'Nature', 'Gourmet'],
    bestMonths: [3, 4, 10, 11],
    avoidMonths: [
      { months: [7, 8], reason: '분지 지형 특유의 찌는 듯한 폭염(38도 이상)' }
    ],
    iconicSpots: ['기요미즈데라(청수사)', '후시미 이나리 신사', '아라시야마 대나무숲'],
    hiddenGems: ['철학의 길 작은 다도 찻집', '우지 녹차마을', '기온 골목 선술집'],
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop'
  },
  {
    nameEn: 'Osaka',
    nameKo: '오사카',
    countryEn: 'JAPAN',
    countryKo: '일본',
    lat: 34.6937,
    lng: 135.5023,
    tags: ['Gourmet', 'Theme Park', 'Shopping', 'City'],
    bestMonths: [3, 4, 5, 10, 11],
    avoidMonths: [
      { months: [7, 8], reason: '한여름 폭염 및 태풍' }
    ],
    iconicSpots: ['도톤보리 글리코상', '오사카성', '유니버설 스튜디오 재팬(USJ)'],
    hiddenGems: ['나카자키초 감성 카페거리', '신세카이 쿠시카츠 골목', '우메다 한큐 백화점 식품관'],
    coverImage: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=1200&auto=format&fit=crop'
  },
  {
    nameEn: 'Paris',
    nameKo: '파리',
    countryEn: 'FRANCE',
    countryKo: '프랑스',
    lat: 48.8566,
    lng: 2.3522,
    tags: ['Art', 'Romance', 'Architecture', 'Gourmet'],
    bestMonths: [4, 5, 6, 9, 10],
    avoidMonths: [
      { months: [8], reason: '8월 현지 바캉스 시즌으로 로컬 레스토랑 휴업 다수' }
    ],
    iconicSpots: ['에펠탑', '루브르 박물관', '개선문 & 샹젤리제', '오르세 미술관'],
    hiddenGems: ['마레 지구 프렌치 부티크', '생마르탱 운하 피크닉', '몽마르트르 언덕 뒤뜰 카페'],
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop'
  },
  {
    nameEn: 'Interlaken',
    nameKo: '인터라켄',
    countryEn: 'SWITZERLAND',
    countryKo: '스위스',
    lat: 46.6863,
    lng: 7.8632,
    tags: ['Nature', 'Activity', 'Trekking', 'Relaxation'],
    bestMonths: [6, 7, 8, 9],
    avoidMonths: [
      { months: [11, 4], reason: '산악 케이블카 정기 점검 및 흐린 날씨 빈발' }
    ],
    iconicSpots: ['융프라우요흐', '피르스트 액티비티', '브리엔츠 호수 유람선', '하더 쿨룸'],
    hiddenGems: ['그린델발트 글레이셔 협곡', '이젤트발트 한적한 호숫가', '라우터브루넨 폭포 마을'],
    coverImage: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?q=80&w=1200&auto=format&fit=crop'
  },
  {
    nameEn: 'Da Nang',
    nameKo: '다낭',
    countryEn: 'VIETNAM',
    countryKo: '베트남',
    lat: 16.0544,
    lng: 108.2022,
    tags: ['Resort', 'Food', 'Relaxation', 'Activity'],
    bestMonths: [1, 2, 3, 4, 5],
    avoidMonths: [
      { months: [9, 10, 11], reason: '중부 몬순 우기(집중 호우 및 침수 리스크)' }
    ],
    iconicSpots: ['미케 비치', '바나힐 골든 브릿지', '용다리 야경', '마블 마운틴'],
    hiddenGems: ['호이안 올드타운 로컬 야시장', '안방 비치 프라이빗 카페', '손트라 반도 원숭이 언덕'],
    coverImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1200&auto=format&fit=crop'
  },
  {
    nameEn: 'Bangkok',
    nameKo: '방콕',
    countryEn: 'THAILAND',
    countryKo: '태국',
    lat: 13.7563,
    lng: 100.5018,
    tags: ['Gourmet', 'City', 'Shopping', 'Culture'],
    bestMonths: [11, 12, 1, 2],
    avoidMonths: [
      { months: [4], reason: '한낮 기온 40도 이상의 살인적인 폭염' },
      { months: [9, 10], reason: '게릴라성 스콜 및 도로 침수 잦음' }
    ],
    iconicSpots: ['왓 아룬(새벽 사원)', '아이콘시암', '짜뚜짝 주말시장', '왕궁'],
    hiddenGems: ['딸랏너이 예술 벽화거리', '차오프라야 강변 히든 루프탑', '통로 트렌디 브런치 카페'],
    coverImage: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop'
  },
  {
    nameEn: 'Barcelona',
    nameKo: '바르셀로나',
    countryEn: 'SPAIN',
    countryKo: '스페인',
    lat: 41.3879,
    lng: 2.1699,
    tags: ['Art', 'Architecture', 'Food', 'Beach'],
    bestMonths: [4, 5, 6, 9, 10],
    avoidMonths: [
      { months: [7, 8], reason: '습하고 무더운 남유럽 폭염 및 전 세계 관광객 극심한 혼잡' }
    ],
    iconicSpots: ['사그라다 파밀리아', '구엘 공원', '바르셀로네타 해변', '카사 바트요'],
    hiddenGems: ['엘 본 지구 감성 타파스 바', '벙커 델 카르멜 노을 뷰포인트', '보케리아 시장 뒷골목 하몽집'],
    coverImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop'
  }
];

export const PRESET_TRIP_PLANS: PresetTripPlan[] = [
  {
    id: 'preset-tokyo-cafe',
    title: 'TOKYO VINTAGE & CAFE HOPPING',
    subtitle: '감성 카페 & 스트리트 빈티지 쇼핑 3박 4일',
    country: 'JAPAN',
    city: '도쿄',
    durationDays: 4,
    tags: ['Cafe', 'Shopping', 'City', 'Design'],
    coverImg: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
    theme: 'shopping',
    highlights: ['나카메구로 메구로강 카페거리', '시부야 스카이 360도 야경', '다이칸야마 티사이트 서점'],
    schedule: [
      {
        dayOffset: 0,
        items: [
          { time: '09:00 AM', type: 'transit', place: '인천국제공항 출발', memo: '도쿄 하네다/나리타행 탑승' },
          { time: '12:30 PM', type: 'transit', place: '도쿄 도착 & 시내 이동', memo: '스카이라이너 탑승 후 신주쿠/시부야 방면' },
          { time: '03:00 PM', type: 'stay', place: '시부야 부티크 호텔 체크인', memo: '짐 보관 및 가벼운 휴식' },
          { time: '05:30 PM', type: 'activity', place: '시부야 스카이 전망대', memo: '골든아워 일몰과 도쿄 야경 감상' },
          { time: '08:00 PM', type: 'dining', place: '신주쿠 오모이데요코초', memo: '정겨운 꼬치구이와 하이볼 한잔' }
        ]
      },
      {
        dayOffset: 1,
        items: [
          { time: '10:00 AM', type: 'dining', place: '나카메구로 블루보틀 & 로스터리', memo: '강변 산책과 스페셜티 모닝 커피' },
          { time: '01:00 PM', type: 'activity', place: '다이칸야마 T-SITE 츠타야 서점', memo: '건축 미학 감상 및 아트 매거진 구경' },
          { time: '04:00 PM', type: 'activity', place: '시모키타자와 빈티지 숍 투어', memo: '유니크한 스트리트 패션 & 소품 쇼핑' },
          { time: '07:30 PM', type: 'dining', place: '하라주쿠 로컬 우동 맛집', memo: '수타 면발의 붓카케 우동' }
        ]
      },
      {
        dayOffset: 2,
        items: [
          { time: '10:30 AM', type: 'activity', place: '긴자 식스 & 도버 스트리트 마켓', memo: '도쿄 하이엔드 패션 & 라이프스타일 셀렉트숍' },
          { time: '01:30 PM', type: 'dining', place: '긴자 스시 오마카세', memo: '신선한 에도마에 스시 런치' },
          { time: '04:00 PM', type: 'activity', place: '오모테산도 힐즈 & 캣스트리트', memo: '유명 건축가 안도 다다오의 쇼핑몰과 감성 골목' },
          { time: '08:00 PM', type: 'dining', place: '롯폰기 모리타워 바', memo: '도쿄 타워가 한눈에 들어오는 야경 라운지' }
        ]
      },
      {
        dayOffset: 3,
        items: [
          { time: '09:30 AM', type: 'dining', place: '츠키지 장외시장 아침식사', memo: '신선한 카이센동과 계란말이' },
          { time: '11:30 AM', type: 'activity', place: '기념품 & 면세 쇼핑', memo: '도쿄 바나나, 드럭스토어, 잡화' },
          { time: '02:00 PM', type: 'transit', place: '공항 이동 및 출국 수속', memo: '귀국 항공편 탑승' }
        ]
      }
    ]
  },
  {
    id: 'preset-swiss-alps',
    title: 'SWISS ALPS & ADVENTURE',
    subtitle: '인터라켄 액티비티 & 알프스 힐링 트레킹 5박 6일',
    country: 'SWITZERLAND',
    city: '인터라켄',
    durationDays: 6,
    tags: ['Nature', 'Trekking', 'Adventure', 'Relaxation'],
    coverImg: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?q=80&w=1200&auto=format&fit=crop',
    theme: 'nature',
    highlights: ['융프라우요흐 유럽의 지붕', '피르스트 글라이더 & 플라이어', '브리엔츠 호수 에메랄드 크루즈'],
    schedule: [
      {
        dayOffset: 0,
        items: [
          { time: '01:00 PM', type: 'transit', place: '취리히 공항 도착 후 SBB 기차 탑승', memo: '스위스 패스로 인터라켄 동역 이동' },
          { time: '04:30 PM', type: 'stay', place: '인터라켄 샬레 호텔 체크인', memo: '융프라우 뷰 테라스에서 웰컴 티' },
          { time: '07:00 PM', type: 'dining', place: '로컬 치즈 퐁듀 레스토랑', memo: '따뜻한 스위스 전통 퐁듀와 와인' }
        ]
      },
      {
        dayOffset: 1,
        items: [
          { time: '08:30 AM', type: 'transit', place: '아이거 익스프레스 케이블카', memo: '그린델발트 터미널에서 초고속 곤돌라' },
          { time: '10:30 AM', type: 'activity', place: '융프라우요흐 유럽 정상(3,454m)', memo: '얼음 궁전 탐험 및 스핑크스 전망대 파노라마' },
          { time: '02:00 PM', type: 'activity', place: '클라이네 샤이덱 파노라마 트레킹', memo: '알프스 야생화와 빙하를 보며 내리막 걷기' },
          { time: '06:30 PM', type: 'dining', place: '그린델발트 산장 디너', memo: '스위스식 감자전 뢰스티와 맥주' }
        ]
      },
      {
        dayOffset: 2,
        items: [
          { time: '09:00 AM', type: 'activity', place: '그린델발트 피르스트(First)', memo: '클리프 워크 절벽 흔들다리 걷기' },
          { time: '11:30 AM', type: 'activity', place: '피르스트 마운틴 카트 & 글라이더', memo: '짜릿한 알프스 질주 액티비티' },
          { time: '03:00 PM', type: 'activity', place: '바흐알프제(Bachalpsee) 호수 트레킹', memo: '만년설이 비치는 거울 호수 산책' }
        ]
      }
    ]
  },
  {
    id: 'preset-paris-art',
    title: 'PARIS ROMANTIC & ART WALK',
    subtitle: '파리 미술관 & 에펠 낭만 로드 5박 6일',
    country: 'FRANCE',
    city: '파리',
    durationDays: 6,
    tags: ['Art', 'Museum', 'Romance', 'Architecture'],
    coverImg: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop',
    theme: 'art',
    highlights: ['루브르 & 오르세 미술관 도슨트', '샹드마르스 공원 에펠탑 피크닉', '마레 지구 프렌치 브런치'],
    schedule: [
      {
        dayOffset: 0,
        items: [
          { time: '02:00 PM', type: 'transit', place: '샤를 드골 공항 도착 및 시내 이동', memo: 'RER B선 탑승 후 호텔 이동' },
          { time: '04:30 PM', type: 'stay', place: '마레 지구 오스만 양식 호텔 체크인', memo: '클래식 발코니와 파리 시가지 전망' },
          { time: '07:30 PM', type: 'dining', place: '생제르맹 프렌치 비스트로', memo: '어니언 스프와 비프 부르기뇽' }
        ]
      },
      {
        dayOffset: 1,
        items: [
          { time: '09:00 AM', type: 'activity', place: '루브르 박물관 모닝 투어', memo: '모나리자, 사모트라케의 니케 감상' },
          { time: '01:00 PM', type: 'dining', place: '튈르리 정원 야외 카페', memo: '바게트 샌드위치와 에스프레소' },
          { time: '03:00 PM', type: 'activity', place: '오르세 미술관', memo: '모네, 고흐, 르누아르 인상파 걸작 감상' },
          { time: '08:00 PM', type: 'activity', place: '바토무슈 센강 유람선', memo: '조명이 켜진 에펠탑과 노트르담 야경' }
        ]
      }
    ]
  },
  {
    id: 'preset-danang-relax',
    title: 'DA NANG & HOI AN SLOW ESCAPE',
    subtitle: '다낭 해변 리조트 & 호이안 등불 야시장 4박 5일',
    country: 'VIETNAM',
    city: '다낭',
    durationDays: 5,
    tags: ['Resort', 'Relaxation', 'Gourmet', 'NightMarket'],
    coverImg: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1200&auto=format&fit=crop',
    theme: 'food',
    highlights: ['미케 비치 오션뷰 인피니티 풀', '호이안 올드타운 소원배 띄우기', '바나힐 골든 브릿지 인생샷'],
    schedule: [
      {
        dayOffset: 0,
        items: [
          { time: '11:00 AM', type: 'transit', place: '다낭 국제공항 도착', memo: '프라이빗 픽업 차량 탑승' },
          { time: '01:00 PM', type: 'stay', place: '미케 비치 5성급 리조트 체크인', memo: '오션뷰 풀빌라에서 휴식' },
          { time: '05:00 PM', type: 'dining', place: '목 해산물 식당', memo: '칠리 크랩, 갈릭 버터 새우 파티' }
        ]
      },
      {
        dayOffset: 1,
        items: [
          { time: '10:00 AM', type: 'activity', place: '바나힐 테마파크 & 골든 브릿지', memo: '구름 위 거대한 두 손 조형물' },
          { time: '04:00 PM', type: 'transit', place: '호이안 고도시 이동', memo: '전통 가옥과 노란 벽의 올드타운' },
          { time: '06:30 PM', type: 'activity', place: '투본강 소원배 & 등불 야시장', memo: '오색빛깔 야경과 야시장 로컬 간식' }
        ]
      }
    ]
  }
];

export function findCountryByNameOrAlias(query: string): DestinationCountry | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return WORLD_COUNTRIES.find(c => 
    c.nameEn.toLowerCase() === q ||
    c.nameKo === q ||
    c.aliases.some(alias => alias.toLowerCase() === q || q.includes(alias.toLowerCase()))
  );
}

export function findCityByNameOrAlias(query: string): DestinationCity | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return WORLD_CITIES.find(city => 
    city.nameEn.toLowerCase() === q ||
    city.nameKo === q ||
    q.includes(city.nameKo) ||
    q.includes(city.nameEn.toLowerCase())
  );
}
