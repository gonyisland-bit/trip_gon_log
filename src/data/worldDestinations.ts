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
    dayOffset: number;
    items: {
      time: string;
      type: 'transit' | 'activity' | 'dining' | 'stay';
      place: string;
      memo: string;
      cost?: string;
    }[];
  }[];
  isCustom?: boolean;
}

export const WORLD_COUNTRIES: DestinationCountry[] = [
  {
    "code": "JP",
    "nameEn": "JAPAN",
    "nameKo": "일본",
    "aliases": [
      "일본",
      "japan",
      "jp",
      "도쿄",
      "오사카",
      "교토"
    ],
    "bestSeason": "3월~5월 (벚꽃), 10월~11월 (단풍)",
    "avoidSeason": "7월 말~8월, 5월 초",
    "avoidReason": "8월 극심한 폭염 및 태풍, 5월 초 골든위크 인파 집중",
    "popularCities": [
      "도쿄",
      "오사카",
      "교토",
      "후쿠오카",
      "삿포로",
      "나고야",
      "오키나와",
      "고베",
      "나라"
    ]
  },
  {
    "code": "KR",
    "nameEn": "SOUTH KOREA",
    "nameKo": "대한민국",
    "aliases": [
      "대한민국",
      "south korea",
      "kr",
      "서울",
      "부산",
      "제주"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "서울",
      "부산",
      "제주",
      "강릉",
      "경주",
      "인천",
      "속초",
      "전주"
    ]
  },
  {
    "code": "TW",
    "nameEn": "TAIWAN",
    "nameKo": "대만",
    "aliases": [
      "대만",
      "taiwan",
      "tw",
      "타이베이",
      "가오슝",
      "타이중"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "타이베이",
      "가오슝",
      "타이중",
      "타이난",
      "화롄",
      "지우펀"
    ]
  },
  {
    "code": "HK",
    "nameEn": "HONG KONG",
    "nameKo": "홍콩",
    "aliases": [
      "홍콩",
      "hong kong",
      "hk",
      "홍콩",
      "구룡",
      "센트럴"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "홍콩",
      "구룡",
      "센트럴",
      "침사추이",
      "란타우"
    ]
  },
  {
    "code": "MO",
    "nameEn": "MACAU",
    "nameKo": "마카오",
    "aliases": [
      "마카오",
      "macau",
      "mo",
      "마카오",
      "타이파",
      "코타이"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "마카오",
      "타이파",
      "코타이",
      "콜로안"
    ]
  },
  {
    "code": "CN",
    "nameEn": "CHINA",
    "nameKo": "중국",
    "aliases": [
      "중국",
      "china",
      "cn",
      "상하이",
      "베이징",
      "칭다오"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "상하이",
      "베이징",
      "칭다오",
      "장가계",
      "청두",
      "광저우",
      "시안"
    ]
  },
  {
    "code": "MN",
    "nameEn": "MONGOLIA",
    "nameKo": "몽골",
    "aliases": [
      "몽골",
      "mongolia",
      "mn",
      "울란바토르",
      "고비사막",
      "테를지"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "울란바토르",
      "고비사막",
      "테를지",
      "홉스골"
    ]
  },
  {
    "code": "VN",
    "nameEn": "VIETNAM",
    "nameKo": "베트남",
    "aliases": [
      "베트남",
      "vietnam",
      "vn",
      "다낭",
      "하노이",
      "호치민"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "다낭",
      "하노이",
      "호치민",
      "나트랑",
      "푸꾸옥",
      "호이안",
      "사파"
    ]
  },
  {
    "code": "TH",
    "nameEn": "THAILAND",
    "nameKo": "태국",
    "aliases": [
      "태국",
      "thailand",
      "th",
      "방콕",
      "치앙마이",
      "푸켓"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "방콕",
      "치앙마이",
      "푸켓",
      "파타야",
      "코사무이",
      "끄라비"
    ]
  },
  {
    "code": "PH",
    "nameEn": "PHILIPPINES",
    "nameKo": "필리핀",
    "aliases": [
      "필리핀",
      "philippines",
      "ph",
      "세부",
      "보라카이",
      "보홀"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "세부",
      "보라카이",
      "보홀",
      "마닐라",
      "코론",
      "엘니도"
    ]
  },
  {
    "code": "SG",
    "nameEn": "SINGAPORE",
    "nameKo": "싱가포르",
    "aliases": [
      "싱가포르",
      "singapore",
      "sg",
      "싱가포르",
      "센토사",
      "마리나베이"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "싱가포르",
      "센토사",
      "마리나베이"
    ]
  },
  {
    "code": "MY",
    "nameEn": "MALAYSIA",
    "nameKo": "말레이시아",
    "aliases": [
      "말레이시아",
      "malaysia",
      "my",
      "쿠알라룸푸르",
      "코타키나발루",
      "페낭"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "쿠알라룸푸르",
      "코타키나발루",
      "페낭",
      "랑카위",
      "말라카"
    ]
  },
  {
    "code": "ID",
    "nameEn": "INDONESIA",
    "nameKo": "인도네시아",
    "aliases": [
      "인도네시아",
      "indonesia",
      "id",
      "발리",
      "자카르타",
      "족자카르타"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "발리",
      "자카르타",
      "족자카르타",
      "롬복",
      "코모도"
    ]
  },
  {
    "code": "LA",
    "nameEn": "LAOS",
    "nameKo": "라오스",
    "aliases": [
      "라오스",
      "laos",
      "la",
      "비엔티안",
      "루앙프라방",
      "방비엥"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "비엔티안",
      "루앙프라방",
      "방비엥"
    ]
  },
  {
    "code": "KH",
    "nameEn": "CAMBODIA",
    "nameKo": "캄보디아",
    "aliases": [
      "캄보디아",
      "cambodia",
      "kh",
      "씨엠립",
      "프놈펜",
      "캄폿"
    ],
    "bestSeason": "11월~3월 (건기 쾌적)",
    "avoidSeason": "6월~9월",
    "avoidReason": "몬순 우기(게릴라성 스콜 및 침수) 및 무더위",
    "popularCities": [
      "씨엠립",
      "프놈펜",
      "캄폿"
    ]
  },
  {
    "code": "MV",
    "nameEn": "MALDIVES",
    "nameKo": "몰디브",
    "aliases": [
      "몰디브",
      "maldives",
      "mv",
      "말레",
      "마아푸시",
      "아리 아톨"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "말레",
      "마아푸시",
      "아리 아톨"
    ]
  },
  {
    "code": "IN",
    "nameEn": "INDIA",
    "nameKo": "인도",
    "aliases": [
      "인도",
      "india",
      "in",
      "뉴델리",
      "뭄바이",
      "자이푸르"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "뉴델리",
      "뭄바이",
      "자이푸르",
      "아그라",
      "고아",
      "바라나시"
    ]
  },
  {
    "code": "NP",
    "nameEn": "NEPAL",
    "nameKo": "네팔",
    "aliases": [
      "네팔",
      "nepal",
      "np",
      "카트만두",
      "포카라",
      "에베레스트"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "카트만두",
      "포카라",
      "에베레스트"
    ]
  },
  {
    "code": "FR",
    "nameEn": "FRANCE",
    "nameKo": "프랑스",
    "aliases": [
      "프랑스",
      "france",
      "fr",
      "파리",
      "니스",
      "리옹"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "파리",
      "니스",
      "리옹",
      "마르세유",
      "보르도",
      "스트라스부르",
      "콜마르"
    ]
  },
  {
    "code": "IT",
    "nameEn": "ITALY",
    "nameKo": "이탈리아",
    "aliases": [
      "이탈리아",
      "italy",
      "it",
      "로마",
      "피렌체",
      "베네치아"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "로마",
      "피렌체",
      "베네치아",
      "밀라노",
      "나폴리",
      "아말피",
      "포지타노"
    ]
  },
  {
    "code": "ES",
    "nameEn": "SPAIN",
    "nameKo": "스페인",
    "aliases": [
      "스페인",
      "spain",
      "es",
      "바르셀로나",
      "마드리드",
      "세비야"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "바르셀로나",
      "마드리드",
      "세비야",
      "그라나다",
      "발렌시아",
      "말라가",
      "이비자"
    ]
  },
  {
    "code": "GB",
    "nameEn": "UNITED KINGDOM",
    "nameKo": "영국",
    "aliases": [
      "영국",
      "united kingdom",
      "gb",
      "런던",
      "에든버러",
      "맨체스터"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "런던",
      "에든버러",
      "맨체스터",
      "옥스퍼드",
      "케임브리지",
      "리버풀"
    ]
  },
  {
    "code": "CH",
    "nameEn": "SWITZERLAND",
    "nameKo": "스위스",
    "aliases": [
      "스위스",
      "switzerland",
      "ch",
      "취리히",
      "인터라켄",
      "제네바"
    ],
    "bestSeason": "6월~9월 (트레킹/하이킹), 12월~3월 (설경/스키)",
    "avoidSeason": "11월, 4월",
    "avoidReason": "환절기 흐린 날씨 및 케이블카 정기 점검 기간",
    "popularCities": [
      "취리히",
      "인터라켄",
      "제네바",
      "루체른",
      "체르마트",
      "그린델발트"
    ]
  },
  {
    "code": "DE",
    "nameEn": "GERMANY",
    "nameKo": "독일",
    "aliases": [
      "독일",
      "germany",
      "de",
      "베를린",
      "뮌헨",
      "프랑크푸르트"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "베를린",
      "뮌헨",
      "프랑크푸르트",
      "함부르크",
      "쾰른",
      "하이델베르크"
    ]
  },
  {
    "code": "AT",
    "nameEn": "AUSTRIA",
    "nameKo": "오스트리아",
    "aliases": [
      "오스트리아",
      "austria",
      "at",
      "빈",
      "잘츠부르크",
      "할슈타트"
    ],
    "bestSeason": "6월~9월 (트레킹/하이킹), 12월~3월 (설경/스키)",
    "avoidSeason": "11월, 4월",
    "avoidReason": "환절기 흐린 날씨 및 케이블카 정기 점검 기간",
    "popularCities": [
      "빈",
      "잘츠부르크",
      "할슈타트",
      "인스부르크",
      "그라츠"
    ]
  },
  {
    "code": "CZ",
    "nameEn": "CZECH REPUBLIC",
    "nameKo": "체코",
    "aliases": [
      "체코",
      "czech republic",
      "cz",
      "프라하",
      "체스키크룸로프",
      "브르노"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "프라하",
      "체스키크룸로프",
      "브르노",
      "카를로비바리"
    ]
  },
  {
    "code": "HU",
    "nameEn": "HUNGARY",
    "nameKo": "헝가리",
    "aliases": [
      "헝가리",
      "hungary",
      "hu",
      "부다페스트",
      "데브레첸",
      "에게르"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "부다페스트",
      "데브레첸",
      "에게르",
      "세게드"
    ]
  },
  {
    "code": "HR",
    "nameEn": "CROATIA",
    "nameKo": "크로아티아",
    "aliases": [
      "크로아티아",
      "croatia",
      "hr",
      "두브로브니크",
      "자그레브",
      "스플리트"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "두브로브니크",
      "자그레브",
      "스플리트",
      "플리트비체",
      "흐바르",
      "자다르"
    ]
  },
  {
    "code": "PT",
    "nameEn": "PORTUGAL",
    "nameKo": "포르투갈",
    "aliases": [
      "포르투갈",
      "portugal",
      "pt",
      "리스본",
      "포르투",
      "신트라"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "리스본",
      "포르투",
      "신트라",
      "파루",
      "코임브라",
      "마데이라"
    ]
  },
  {
    "code": "GR",
    "nameEn": "GREECE",
    "nameKo": "그리스",
    "aliases": [
      "그리스",
      "greece",
      "gr",
      "아테네",
      "산토리니",
      "미코노스"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "아테네",
      "산토리니",
      "미코노스",
      "크레타",
      "자킨토스"
    ]
  },
  {
    "code": "NL",
    "nameEn": "NETHERLANDS",
    "nameKo": "네덜란드",
    "aliases": [
      "네덜란드",
      "netherlands",
      "nl",
      "암스테르담",
      "로테르담",
      "위트레흐트"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "암스테르담",
      "로테르담",
      "위트레흐트",
      "헤이그",
      "히트호른"
    ]
  },
  {
    "code": "BE",
    "nameEn": "BELGIUM",
    "nameKo": "벨기에",
    "aliases": [
      "벨기에",
      "belgium",
      "be",
      "브뤼셀",
      "브뤼헤",
      "겐트"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "브뤼셀",
      "브뤼헤",
      "겐트",
      "안트베르펜"
    ]
  },
  {
    "code": "DK",
    "nameEn": "DENMARK",
    "nameKo": "덴마크",
    "aliases": [
      "덴마크",
      "denmark",
      "dk",
      "코펜하겐",
      "오르후스",
      "오덴세"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "코펜하겐",
      "오르후스",
      "오덴세",
      "빌룬"
    ]
  },
  {
    "code": "NO",
    "nameEn": "NORWAY",
    "nameKo": "노르웨이",
    "aliases": [
      "노르웨이",
      "norway",
      "no",
      "오슬로",
      "베르겐",
      "트롬쇠"
    ],
    "bestSeason": "6월~9월 (트레킹/하이킹), 12월~3월 (설경/스키)",
    "avoidSeason": "11월, 4월",
    "avoidReason": "환절기 흐린 날씨 및 케이블카 정기 점검 기간",
    "popularCities": [
      "오슬로",
      "베르겐",
      "트롬쇠",
      "스타방에르",
      "플롬"
    ]
  },
  {
    "code": "SE",
    "nameEn": "SWEDEN",
    "nameKo": "스웨덴",
    "aliases": [
      "스웨덴",
      "sweden",
      "se",
      "스톡홀름",
      "예테보리",
      "말뫼"
    ],
    "bestSeason": "6월~9월 (트레킹/하이킹), 12월~3월 (설경/스키)",
    "avoidSeason": "11월, 4월",
    "avoidReason": "환절기 흐린 날씨 및 케이블카 정기 점검 기간",
    "popularCities": [
      "스톡홀름",
      "예테보리",
      "말뫼",
      "웁살라"
    ]
  },
  {
    "code": "FI",
    "nameEn": "FINLAND",
    "nameKo": "핀란드",
    "aliases": [
      "핀란드",
      "finland",
      "fi",
      "헬싱키",
      "로바니에미",
      "탐페레"
    ],
    "bestSeason": "6월~9월 (트레킹/하이킹), 12월~3월 (설경/스키)",
    "avoidSeason": "11월, 4월",
    "avoidReason": "환절기 흐린 날씨 및 케이블카 정기 점검 기간",
    "popularCities": [
      "헬싱키",
      "로바니에미",
      "탐페레",
      "투르쿠"
    ]
  },
  {
    "code": "PL",
    "nameEn": "POLAND",
    "nameKo": "폴란드",
    "aliases": [
      "폴란드",
      "poland",
      "pl",
      "바르샤바",
      "크라쿠프",
      "그단스크"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "바르샤바",
      "크라쿠프",
      "그단스크",
      "브로츠와프"
    ]
  },
  {
    "code": "IE",
    "nameEn": "IRELAND",
    "nameKo": "아일랜드",
    "aliases": [
      "아일랜드",
      "ireland",
      "ie",
      "더블린",
      "코크",
      "골웨이"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "더블린",
      "코크",
      "골웨이",
      "킬라니"
    ]
  },
  {
    "code": "RO",
    "nameEn": "ROMANIA",
    "nameKo": "루마니아",
    "aliases": [
      "루마니아",
      "romania",
      "ro",
      "부쿠레슈티",
      "브라쇼브",
      "클루지나포카"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "부쿠레슈티",
      "브라쇼브",
      "클루지나포카",
      "시비우"
    ]
  },
  {
    "code": "SI",
    "nameEn": "SLOVENIA",
    "nameKo": "슬로베니아",
    "aliases": [
      "슬로베니아",
      "slovenia",
      "si",
      "류블랴나",
      "블레드",
      "피란"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "류블랴나",
      "블레드",
      "피란",
      "포스토이나"
    ]
  },
  {
    "code": "IS",
    "nameEn": "ICELAND",
    "nameKo": "아이슬란드",
    "aliases": [
      "아이슬란드",
      "iceland",
      "is",
      "레이캬비크",
      "비크",
      "아쿠레이리"
    ],
    "bestSeason": "6월~9월 (트레킹/하이킹), 12월~3월 (설경/스키)",
    "avoidSeason": "11월, 4월",
    "avoidReason": "환절기 흐린 날씨 및 케이블카 정기 점검 기간",
    "popularCities": [
      "레이캬비크",
      "비크",
      "아쿠레이리",
      "골든 서클"
    ]
  },
  {
    "code": "TR",
    "nameEn": "TURKEY",
    "nameKo": "튀르키예",
    "aliases": [
      "튀르키예",
      "turkey",
      "tr",
      "이스탄불",
      "카파도키아",
      "안탈리아"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "이스탄불",
      "카파도키아",
      "안탈리아",
      "파묵칼레",
      "이즈미르"
    ]
  },
  {
    "code": "EG",
    "nameEn": "EGYPT",
    "nameKo": "이집트",
    "aliases": [
      "이집트",
      "egypt",
      "eg",
      "카이로",
      "기자",
      "룩소르"
    ],
    "bestSeason": "11월~3월 (온화하고 쾌적)",
    "avoidSeason": "5월~9월",
    "avoidReason": "한낮 45도 이상의 살인적 폭염과 사막 열풍",
    "popularCities": [
      "카이로",
      "기자",
      "룩소르",
      "아스완",
      "후르가다",
      "알렉산드리아"
    ]
  },
  {
    "code": "MA",
    "nameEn": "MOROCCO",
    "nameKo": "모로코",
    "aliases": [
      "모로코",
      "morocco",
      "ma",
      "마라케시",
      "카사블랑카",
      "페스"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "마라케시",
      "카사블랑카",
      "페스",
      "셰프샤우엔",
      "라바트"
    ]
  },
  {
    "code": "ZA",
    "nameEn": "SOUTH AFRICA",
    "nameKo": "남아프리카공화국",
    "aliases": [
      "남아프리카공화국",
      "south africa",
      "za",
      "케이프타운",
      "요하네스버그",
      "더반"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "케이프타운",
      "요하네스버그",
      "더반",
      "크루거"
    ]
  },
  {
    "code": "KE",
    "nameEn": "KENYA",
    "nameKo": "케냐",
    "aliases": [
      "케냐",
      "kenya",
      "ke",
      "나이로비",
      "마사이마라",
      "몸바사"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "나이로비",
      "마사이마라",
      "몸바사"
    ]
  },
  {
    "code": "TZ",
    "nameEn": "TANZANIA",
    "nameKo": "탄자니아",
    "aliases": [
      "탄자니아",
      "tanzania",
      "tz",
      "잔지바르",
      "세렝게티",
      "다르에스살람"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "잔지바르",
      "세렝게티",
      "다르에스살람",
      "킬리만자로"
    ]
  },
  {
    "code": "AE",
    "nameEn": "UNITED ARAB EMIRATES",
    "nameKo": "아랍에미리트",
    "aliases": [
      "아랍에미리트",
      "united arab emirates",
      "ae",
      "두바이",
      "아부다비",
      "샤르자"
    ],
    "bestSeason": "11월~3월 (온화하고 쾌적)",
    "avoidSeason": "5월~9월",
    "avoidReason": "한낮 45도 이상의 살인적 폭염과 사막 열풍",
    "popularCities": [
      "두바이",
      "아부다비",
      "샤르자"
    ]
  },
  {
    "code": "JO",
    "nameEn": "JORDAN",
    "nameKo": "요르단",
    "aliases": [
      "요르단",
      "jordan",
      "jo",
      "암만",
      "페트라",
      "와디럼"
    ],
    "bestSeason": "11월~3월 (온화하고 쾌적)",
    "avoidSeason": "5월~9월",
    "avoidReason": "한낮 45도 이상의 살인적 폭염과 사막 열풍",
    "popularCities": [
      "암만",
      "페트라",
      "와디럼",
      "사해",
      "아카바"
    ]
  },
  {
    "code": "QA",
    "nameEn": "QATAR",
    "nameKo": "카타르",
    "aliases": [
      "카타르",
      "qatar",
      "qa",
      "도하",
      "알와크라",
      "루사일"
    ],
    "bestSeason": "11월~3월 (온화하고 쾌적)",
    "avoidSeason": "5월~9월",
    "avoidReason": "한낮 45도 이상의 살인적 폭염과 사막 열풍",
    "popularCities": [
      "도하",
      "알와크라",
      "루사일"
    ]
  },
  {
    "code": "SA",
    "nameEn": "SAUDI ARABIA",
    "nameKo": "사우디아라비아",
    "aliases": [
      "사우디아라비아",
      "saudi arabia",
      "sa",
      "리야드",
      "제다",
      "알울라"
    ],
    "bestSeason": "11월~3월 (온화하고 쾌적)",
    "avoidSeason": "5월~9월",
    "avoidReason": "한낮 45도 이상의 살인적 폭염과 사막 열풍",
    "popularCities": [
      "리야드",
      "제다",
      "알울라",
      "메디나"
    ]
  },
  {
    "code": "US",
    "nameEn": "UNITED STATES",
    "nameKo": "미국",
    "aliases": [
      "미국",
      "united states",
      "us",
      "뉴욕",
      "로스앤젤레스",
      "샌프란시스코"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "뉴욕",
      "로스앤젤레스",
      "샌프란시스코",
      "라스베이거스",
      "호놀룰루",
      "시애틀",
      "시카고"
    ]
  },
  {
    "code": "CA",
    "nameEn": "CANADA",
    "nameKo": "캐나다",
    "aliases": [
      "캐나다",
      "canada",
      "ca",
      "밴쿠버",
      "토론토",
      "몬트리올"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "밴쿠버",
      "토론토",
      "몬트리올",
      "퀘벡",
      "밴프",
      "캘거리"
    ]
  },
  {
    "code": "MX",
    "nameEn": "MEXICO",
    "nameKo": "멕시코",
    "aliases": [
      "멕시코",
      "mexico",
      "mx",
      "칸쿤",
      "멕시코시티",
      "플라야델카르멘"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "칸쿤",
      "멕시코시티",
      "플라야델카르멘",
      "툴룸",
      "와하카"
    ]
  },
  {
    "code": "CU",
    "nameEn": "CUBA",
    "nameKo": "쿠바",
    "aliases": [
      "쿠바",
      "cuba",
      "cu",
      "아바나",
      "바라데로",
      "트리니다드"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "아바나",
      "바라데로",
      "트리니다드",
      "비냘레스"
    ]
  },
  {
    "code": "PE",
    "nameEn": "PERU",
    "nameKo": "페루",
    "aliases": [
      "페루",
      "peru",
      "pe",
      "리마",
      "쿠스코",
      "마추픽추"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "리마",
      "쿠스코",
      "마추픽추",
      "아레키파",
      "푸노"
    ]
  },
  {
    "code": "BR",
    "nameEn": "BRAZIL",
    "nameKo": "브라질",
    "aliases": [
      "브라질",
      "brazil",
      "br",
      "리우데자네이루",
      "상파울루",
      "살바도르"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "리우데자네이루",
      "상파울루",
      "살바도르",
      "이구아수"
    ]
  },
  {
    "code": "AR",
    "nameEn": "ARGENTINA",
    "nameKo": "아르헨티나",
    "aliases": [
      "아르헨티나",
      "argentina",
      "ar",
      "부에노스아이레스",
      "바릴로체",
      "우수아이아"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "부에노스아이레스",
      "바릴로체",
      "우수아이아",
      "엘칼라파테",
      "이구아수"
    ]
  },
  {
    "code": "CL",
    "nameEn": "CHILE",
    "nameKo": "칠레",
    "aliases": [
      "칠레",
      "chile",
      "cl",
      "산티아고",
      "산페드로데아타카마",
      "토레스델파이네"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "산티아고",
      "산페드로데아타카마",
      "토레스델파이네",
      "이스터섬"
    ]
  },
  {
    "code": "CO",
    "nameEn": "COLOMBIA",
    "nameKo": "콜롬비아",
    "aliases": [
      "콜롬비아",
      "colombia",
      "co",
      "보고타",
      "메데인",
      "카르타헤나"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "보고타",
      "메데인",
      "카르타헤나",
      "칼리"
    ]
  },
  {
    "code": "AU",
    "nameEn": "AUSTRALIA",
    "nameKo": "호주",
    "aliases": [
      "호주",
      "australia",
      "au",
      "시드니",
      "멜버른",
      "브리즈번"
    ],
    "bestSeason": "10월~4월 (따뜻한 남반구 봄·여름)",
    "avoidSeason": "6월~8월",
    "avoidReason": "남반구 겨울철 쌀쌀한 기온 및 잦은 강우",
    "popularCities": [
      "시드니",
      "멜버른",
      "브리즈번",
      "퍼스",
      "골드코스트",
      "케언즈"
    ]
  },
  {
    "code": "NZ",
    "nameEn": "NEW ZEALAND",
    "nameKo": "뉴질랜드",
    "aliases": [
      "뉴질랜드",
      "new zealand",
      "nz",
      "오클랜드",
      "퀸스타운",
      "크라이스트처치"
    ],
    "bestSeason": "10월~4월 (따뜻한 남반구 봄·여름)",
    "avoidSeason": "6월~8월",
    "avoidReason": "남반구 겨울철 쌀쌀한 기온 및 잦은 강우",
    "popularCities": [
      "오클랜드",
      "퀸스타운",
      "크라이스트처치",
      "로토루아"
    ]
  },
  {
    "code": "FJ",
    "nameEn": "FIJI",
    "nameKo": "피지",
    "aliases": [
      "피지",
      "fiji",
      "fj",
      "난디",
      "수바",
      "마마누카제도"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "난디",
      "수바",
      "마마누카제도"
    ]
  },
  {
    "code": "GU",
    "nameEn": "GUAM",
    "nameKo": "괌",
    "aliases": [
      "괌",
      "guam",
      "gu",
      "투몬",
      "하갓냐",
      "타무닝"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "투몬",
      "하갓냐",
      "타무닝"
    ]
  },
  {
    "code": "MP",
    "nameEn": "SAIPAN",
    "nameKo": "사이판",
    "aliases": [
      "사이판",
      "saipan",
      "mp",
      "가라판",
      "마르피",
      "수수페"
    ],
    "bestSeason": "봄·가을 (4월~6월, 9월~10월)",
    "avoidSeason": "7월~8월",
    "avoidReason": "여름철 폭염 및 관광객 극심한 인파 집중",
    "popularCities": [
      "가라판",
      "마르피",
      "수수페"
    ]
  }
];

export const WORLD_CITIES: DestinationCity[] = [
  {
    "nameEn": "Tokyo",
    "nameKo": "도쿄",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 35.6762,
    "lng": 139.6503,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "도쿄 중심 광장",
      "도쿄 대표 랜드마크",
      "도쿄 전망대"
    ],
    "hiddenGems": [
      "도쿄 로컬 카페거리",
      "도쿄 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Osaka",
    "nameKo": "오사카",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 34.6937,
    "lng": 135.5023,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "오사카 중심 광장",
      "오사카 대표 랜드마크",
      "오사카 전망대"
    ],
    "hiddenGems": [
      "오사카 로컬 카페거리",
      "오사카 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kyoto",
    "nameKo": "교토",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 35.0116,
    "lng": 135.7681,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "교토 중심 광장",
      "교토 대표 랜드마크",
      "교토 전망대"
    ],
    "hiddenGems": [
      "교토 로컬 카페거리",
      "교토 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Fukuoka",
    "nameKo": "후쿠오카",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 33.5902,
    "lng": 130.4017,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "후쿠오카 중심 광장",
      "후쿠오카 대표 랜드마크",
      "후쿠오카 전망대"
    ],
    "hiddenGems": [
      "후쿠오카 로컬 카페거리",
      "후쿠오카 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sapporo",
    "nameKo": "삿포로",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 43.0618,
    "lng": 141.3545,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "삿포로 중심 광장",
      "삿포로 대표 랜드마크",
      "삿포로 전망대"
    ],
    "hiddenGems": [
      "삿포로 로컬 카페거리",
      "삿포로 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Nagoya",
    "nameKo": "나고야",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 35.1815,
    "lng": 136.9066,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "나고야 중심 광장",
      "나고야 대표 랜드마크",
      "나고야 전망대"
    ],
    "hiddenGems": [
      "나고야 로컬 카페거리",
      "나고야 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Okinawa",
    "nameKo": "오키나와",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 26.2124,
    "lng": 127.6809,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "오키나와 중심 광장",
      "오키나와 대표 랜드마크",
      "오키나와 전망대"
    ],
    "hiddenGems": [
      "오키나와 로컬 카페거리",
      "오키나와 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kobe",
    "nameKo": "고베",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 34.6901,
    "lng": 135.1955,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "고베 중심 광장",
      "고베 대표 랜드마크",
      "고베 전망대"
    ],
    "hiddenGems": [
      "고베 로컬 카페거리",
      "고베 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Nara",
    "nameKo": "나라",
    "countryEn": "JAPAN",
    "countryKo": "일본",
    "lat": 34.6851,
    "lng": 135.8048,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "나라 중심 광장",
      "나라 대표 랜드마크",
      "나라 전망대"
    ],
    "hiddenGems": [
      "나라 로컬 카페거리",
      "나라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Seoul",
    "nameKo": "서울",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 37.5665,
    "lng": 126.978,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "서울 중심 광장",
      "서울 대표 랜드마크",
      "서울 전망대"
    ],
    "hiddenGems": [
      "서울 로컬 카페거리",
      "서울 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Busan",
    "nameKo": "부산",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 35.1796,
    "lng": 129.0756,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "부산 중심 광장",
      "부산 대표 랜드마크",
      "부산 전망대"
    ],
    "hiddenGems": [
      "부산 로컬 카페거리",
      "부산 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Jeju",
    "nameKo": "제주",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 33.4996,
    "lng": 126.5312,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "제주 중심 광장",
      "제주 대표 랜드마크",
      "제주 전망대"
    ],
    "hiddenGems": [
      "제주 로컬 카페거리",
      "제주 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Gangneung",
    "nameKo": "강릉",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 37.7519,
    "lng": 128.8761,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "강릉 중심 광장",
      "강릉 대표 랜드마크",
      "강릉 전망대"
    ],
    "hiddenGems": [
      "강릉 로컬 카페거리",
      "강릉 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Gyeongju",
    "nameKo": "경주",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 35.8562,
    "lng": 129.2247,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "경주 중심 광장",
      "경주 대표 랜드마크",
      "경주 전망대"
    ],
    "hiddenGems": [
      "경주 로컬 카페거리",
      "경주 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Incheon",
    "nameKo": "인천",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 37.4563,
    "lng": 126.7052,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "인천 중심 광장",
      "인천 대표 랜드마크",
      "인천 전망대"
    ],
    "hiddenGems": [
      "인천 로컬 카페거리",
      "인천 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sokcho",
    "nameKo": "속초",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 38.207,
    "lng": 128.5918,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "속초 중심 광장",
      "속초 대표 랜드마크",
      "속초 전망대"
    ],
    "hiddenGems": [
      "속초 로컬 카페거리",
      "속초 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Jeonju",
    "nameKo": "전주",
    "countryEn": "SOUTH KOREA",
    "countryKo": "대한민국",
    "lat": 35.8242,
    "lng": 127.148,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "전주 중심 광장",
      "전주 대표 랜드마크",
      "전주 전망대"
    ],
    "hiddenGems": [
      "전주 로컬 카페거리",
      "전주 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Taipei",
    "nameKo": "타이베이",
    "countryEn": "TAIWAN",
    "countryKo": "대만",
    "lat": 25.033,
    "lng": 121.5654,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "타이베이 중심 광장",
      "타이베이 대표 랜드마크",
      "타이베이 전망대"
    ],
    "hiddenGems": [
      "타이베이 로컬 카페거리",
      "타이베이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kaohsiung",
    "nameKo": "가오슝",
    "countryEn": "TAIWAN",
    "countryKo": "대만",
    "lat": 22.6273,
    "lng": 120.3014,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "가오슝 중심 광장",
      "가오슝 대표 랜드마크",
      "가오슝 전망대"
    ],
    "hiddenGems": [
      "가오슝 로컬 카페거리",
      "가오슝 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Taichung",
    "nameKo": "타이중",
    "countryEn": "TAIWAN",
    "countryKo": "대만",
    "lat": 24.1477,
    "lng": 120.6736,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "타이중 중심 광장",
      "타이중 대표 랜드마크",
      "타이중 전망대"
    ],
    "hiddenGems": [
      "타이중 로컬 카페거리",
      "타이중 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Tainan",
    "nameKo": "타이난",
    "countryEn": "TAIWAN",
    "countryKo": "대만",
    "lat": 22.9997,
    "lng": 120.2270,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "타이난 중심 광장",
      "타이난 대표 랜드마크",
      "타이난 전망대"
    ],
    "hiddenGems": [
      "타이난 로컬 카페거리",
      "타이난 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hualien",
    "nameKo": "화롄",
    "countryEn": "TAIWAN",
    "countryKo": "대만",
    "lat": 23.9872,
    "lng": 121.6016,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "화롄 중심 광장",
      "화롄 대표 랜드마크",
      "화롄 전망대"
    ],
    "hiddenGems": [
      "화롄 로컬 카페거리",
      "화롄 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Jiufen",
    "nameKo": "지우펀",
    "countryEn": "TAIWAN",
    "countryKo": "대만",
    "lat": 25.1099,
    "lng": 121.8452,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "지우펀 중심 광장",
      "지우펀 대표 랜드마크",
      "지우펀 전망대"
    ],
    "hiddenGems": [
      "지우펀 로컬 카페거리",
      "지우펀 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hong Kong",
    "nameKo": "홍콩",
    "countryEn": "HONG KONG",
    "countryKo": "홍콩",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "홍콩 중심 광장",
      "홍콩 대표 랜드마크",
      "홍콩 전망대"
    ],
    "hiddenGems": [
      "홍콩 로컬 카페거리",
      "홍콩 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kowloon",
    "nameKo": "구룡",
    "countryEn": "HONG KONG",
    "countryKo": "홍콩",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "구룡 중심 광장",
      "구룡 대표 랜드마크",
      "구룡 전망대"
    ],
    "hiddenGems": [
      "구룡 로컬 카페거리",
      "구룡 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Central",
    "nameKo": "센트럴",
    "countryEn": "HONG KONG",
    "countryKo": "홍콩",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "센트럴 중심 광장",
      "센트럴 대표 랜드마크",
      "센트럴 전망대"
    ],
    "hiddenGems": [
      "센트럴 로컬 카페거리",
      "센트럴 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Tsim Sha Tsui",
    "nameKo": "침사추이",
    "countryEn": "HONG KONG",
    "countryKo": "홍콩",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "침사추이 중심 광장",
      "침사추이 대표 랜드마크",
      "침사추이 전망대"
    ],
    "hiddenGems": [
      "침사추이 로컬 카페거리",
      "침사추이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Lantau",
    "nameKo": "란타우",
    "countryEn": "HONG KONG",
    "countryKo": "홍콩",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "란타우 중심 광장",
      "란타우 대표 랜드마크",
      "란타우 전망대"
    ],
    "hiddenGems": [
      "란타우 로컬 카페거리",
      "란타우 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Macau",
    "nameKo": "마카오",
    "countryEn": "MACAU",
    "countryKo": "마카오",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마카오 중심 광장",
      "마카오 대표 랜드마크",
      "마카오 전망대"
    ],
    "hiddenGems": [
      "마카오 로컬 카페거리",
      "마카오 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Taipa",
    "nameKo": "타이파",
    "countryEn": "MACAU",
    "countryKo": "마카오",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "타이파 중심 광장",
      "타이파 대표 랜드마크",
      "타이파 전망대"
    ],
    "hiddenGems": [
      "타이파 로컬 카페거리",
      "타이파 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cotai",
    "nameKo": "코타이",
    "countryEn": "MACAU",
    "countryKo": "마카오",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코타이 중심 광장",
      "코타이 대표 랜드마크",
      "코타이 전망대"
    ],
    "hiddenGems": [
      "코타이 로컬 카페거리",
      "코타이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Coloane",
    "nameKo": "콜로안",
    "countryEn": "MACAU",
    "countryKo": "마카오",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "콜로안 중심 광장",
      "콜로안 대표 랜드마크",
      "콜로안 전망대"
    ],
    "hiddenGems": [
      "콜로안 로컬 카페거리",
      "콜로안 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Shanghai",
    "nameKo": "상하이",
    "countryEn": "CHINA",
    "countryKo": "중국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "상하이 중심 광장",
      "상하이 대표 랜드마크",
      "상하이 전망대"
    ],
    "hiddenGems": [
      "상하이 로컬 카페거리",
      "상하이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Beijing",
    "nameKo": "베이징",
    "countryEn": "CHINA",
    "countryKo": "중국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "베이징 중심 광장",
      "베이징 대표 랜드마크",
      "베이징 전망대"
    ],
    "hiddenGems": [
      "베이징 로컬 카페거리",
      "베이징 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Qingdao",
    "nameKo": "칭다오",
    "countryEn": "CHINA",
    "countryKo": "중국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "칭다오 중심 광장",
      "칭다오 대표 랜드마크",
      "칭다오 전망대"
    ],
    "hiddenGems": [
      "칭다오 로컬 카페거리",
      "칭다오 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Zhangjiajie",
    "nameKo": "장가계",
    "countryEn": "CHINA",
    "countryKo": "중국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "장가계 중심 광장",
      "장가계 대표 랜드마크",
      "장가계 전망대"
    ],
    "hiddenGems": [
      "장가계 로컬 카페거리",
      "장가계 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Chengdu",
    "nameKo": "청두",
    "countryEn": "CHINA",
    "countryKo": "중국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "청두 중심 광장",
      "청두 대표 랜드마크",
      "청두 전망대"
    ],
    "hiddenGems": [
      "청두 로컬 카페거리",
      "청두 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Guangzhou",
    "nameKo": "광저우",
    "countryEn": "CHINA",
    "countryKo": "중국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "광저우 중심 광장",
      "광저우 대표 랜드마크",
      "광저우 전망대"
    ],
    "hiddenGems": [
      "광저우 로컬 카페거리",
      "광저우 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Xian",
    "nameKo": "시안",
    "countryEn": "CHINA",
    "countryKo": "중국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "시안 중심 광장",
      "시안 대표 랜드마크",
      "시안 전망대"
    ],
    "hiddenGems": [
      "시안 로컬 카페거리",
      "시안 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Ulaanbaatar",
    "nameKo": "울란바토르",
    "countryEn": "MONGOLIA",
    "countryKo": "몽골",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "울란바토르 중심 광장",
      "울란바토르 대표 랜드마크",
      "울란바토르 전망대"
    ],
    "hiddenGems": [
      "울란바토르 로컬 카페거리",
      "울란바토르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Gobi",
    "nameKo": "고비사막",
    "countryEn": "MONGOLIA",
    "countryKo": "몽골",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "고비사막 중심 광장",
      "고비사막 대표 랜드마크",
      "고비사막 전망대"
    ],
    "hiddenGems": [
      "고비사막 로컬 카페거리",
      "고비사막 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Terelj",
    "nameKo": "테를지",
    "countryEn": "MONGOLIA",
    "countryKo": "몽골",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "테를지 중심 광장",
      "테를지 대표 랜드마크",
      "테를지 전망대"
    ],
    "hiddenGems": [
      "테를지 로컬 카페거리",
      "테를지 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Khuvsgul",
    "nameKo": "홉스골",
    "countryEn": "MONGOLIA",
    "countryKo": "몽골",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "홉스골 중심 광장",
      "홉스골 대표 랜드마크",
      "홉스골 전망대"
    ],
    "hiddenGems": [
      "홉스골 로컬 카페거리",
      "홉스골 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Da Nang",
    "nameKo": "다낭",
    "countryEn": "VIETNAM",
    "countryKo": "베트남",
    "lat": 16.0544,
    "lng": 108.2022,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "다낭 중심 광장",
      "다낭 대표 랜드마크",
      "다낭 전망대"
    ],
    "hiddenGems": [
      "다낭 로컬 카페거리",
      "다낭 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hanoi",
    "nameKo": "하노이",
    "countryEn": "VIETNAM",
    "countryKo": "베트남",
    "lat": 21.0285,
    "lng": 105.8542,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "하노이 중심 광장",
      "하노이 대표 랜드마크",
      "하노이 전망대"
    ],
    "hiddenGems": [
      "하노이 로컬 카페거리",
      "하노이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Ho Chi Minh",
    "nameKo": "호치민",
    "countryEn": "VIETNAM",
    "countryKo": "베트남",
    "lat": 10.8231,
    "lng": 106.6297,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "호치민 중심 광장",
      "호치민 대표 랜드마크",
      "호치민 전망대"
    ],
    "hiddenGems": [
      "호치민 로컬 카페거리",
      "호치민 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Nha Trang",
    "nameKo": "나트랑",
    "countryEn": "VIETNAM",
    "countryKo": "베트남",
    "lat": 12.2388,
    "lng": 109.1967,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "나트랑 중심 광장",
      "나트랑 대표 랜드마크",
      "나트랑 전망대"
    ],
    "hiddenGems": [
      "나트랑 로컬 카페거리",
      "나트랑 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Phu Quoc",
    "nameKo": "푸꾸옥",
    "countryEn": "VIETNAM",
    "countryKo": "베트남",
    "lat": 10.2899,
    "lng": 103.984,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "푸꾸옥 중심 광장",
      "푸꾸옥 대표 랜드마크",
      "푸꾸옥 전망대"
    ],
    "hiddenGems": [
      "푸꾸옥 로컬 카페거리",
      "푸꾸옥 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hoi An",
    "nameKo": "호이안",
    "countryEn": "VIETNAM",
    "countryKo": "베트남",
    "lat": 15.8801,
    "lng": 108.338,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "호이안 중심 광장",
      "호이안 대표 랜드마크",
      "호이안 전망대"
    ],
    "hiddenGems": [
      "호이안 로컬 카페거리",
      "호이안 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sapa",
    "nameKo": "사파",
    "countryEn": "VIETNAM",
    "countryKo": "베트남",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "사파 중심 광장",
      "사파 대표 랜드마크",
      "사파 전망대"
    ],
    "hiddenGems": [
      "사파 로컬 카페거리",
      "사파 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bangkok",
    "nameKo": "방콕",
    "countryEn": "THAILAND",
    "countryKo": "태국",
    "lat": 13.7563,
    "lng": 100.5018,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "방콕 중심 광장",
      "방콕 대표 랜드마크",
      "방콕 전망대"
    ],
    "hiddenGems": [
      "방콕 로컬 카페거리",
      "방콕 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Chiang Mai",
    "nameKo": "치앙마이",
    "countryEn": "THAILAND",
    "countryKo": "태국",
    "lat": 18.7883,
    "lng": 98.9853,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "치앙마이 중심 광장",
      "치앙마이 대표 랜드마크",
      "치앙마이 전망대"
    ],
    "hiddenGems": [
      "치앙마이 로컬 카페거리",
      "치앙마이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Phuket",
    "nameKo": "푸켓",
    "countryEn": "THAILAND",
    "countryKo": "태국",
    "lat": 7.8804,
    "lng": 98.3923,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "푸켓 중심 광장",
      "푸켓 대표 랜드마크",
      "푸켓 전망대"
    ],
    "hiddenGems": [
      "푸켓 로컬 카페거리",
      "푸켓 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Pattaya",
    "nameKo": "파타야",
    "countryEn": "THAILAND",
    "countryKo": "태국",
    "lat": 12.9276,
    "lng": 100.8771,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "파타야 중심 광장",
      "파타야 대표 랜드마크",
      "파타야 전망대"
    ],
    "hiddenGems": [
      "파타야 로컬 카페거리",
      "파타야 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Koh Samui",
    "nameKo": "코사무이",
    "countryEn": "THAILAND",
    "countryKo": "태국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코사무이 중심 광장",
      "코사무이 대표 랜드마크",
      "코사무이 전망대"
    ],
    "hiddenGems": [
      "코사무이 로컬 카페거리",
      "코사무이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Krabi",
    "nameKo": "끄라비",
    "countryEn": "THAILAND",
    "countryKo": "태국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "끄라비 중심 광장",
      "끄라비 대표 랜드마크",
      "끄라비 전망대"
    ],
    "hiddenGems": [
      "끄라비 로컬 카페거리",
      "끄라비 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cebu",
    "nameKo": "세부",
    "countryEn": "PHILIPPINES",
    "countryKo": "필리핀",
    "lat": 10.3157,
    "lng": 123.8854,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "세부 중심 광장",
      "세부 대표 랜드마크",
      "세부 전망대"
    ],
    "hiddenGems": [
      "세부 로컬 카페거리",
      "세부 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Boracay",
    "nameKo": "보라카이",
    "countryEn": "PHILIPPINES",
    "countryKo": "필리핀",
    "lat": 11.9674,
    "lng": 121.9248,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "보라카이 중심 광장",
      "보라카이 대표 랜드마크",
      "보라카이 전망대"
    ],
    "hiddenGems": [
      "보라카이 로컬 카페거리",
      "보라카이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bohol",
    "nameKo": "보홀",
    "countryEn": "PHILIPPINES",
    "countryKo": "필리핀",
    "lat": 9.85,
    "lng": 124.1435,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "보홀 중심 광장",
      "보홀 대표 랜드마크",
      "보홀 전망대"
    ],
    "hiddenGems": [
      "보홀 로컬 카페거리",
      "보홀 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Manila",
    "nameKo": "마닐라",
    "countryEn": "PHILIPPINES",
    "countryKo": "필리핀",
    "lat": 14.5995,
    "lng": 120.9842,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마닐라 중심 광장",
      "마닐라 대표 랜드마크",
      "마닐라 전망대"
    ],
    "hiddenGems": [
      "마닐라 로컬 카페거리",
      "마닐라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Coron",
    "nameKo": "코론",
    "countryEn": "PHILIPPINES",
    "countryKo": "필리핀",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코론 중심 광장",
      "코론 대표 랜드마크",
      "코론 전망대"
    ],
    "hiddenGems": [
      "코론 로컬 카페거리",
      "코론 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "El Nido",
    "nameKo": "엘니도",
    "countryEn": "PHILIPPINES",
    "countryKo": "필리핀",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "엘니도 중심 광장",
      "엘니도 대표 랜드마크",
      "엘니도 전망대"
    ],
    "hiddenGems": [
      "엘니도 로컬 카페거리",
      "엘니도 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Singapore",
    "nameKo": "싱가포르",
    "countryEn": "SINGAPORE",
    "countryKo": "싱가포르",
    "lat": 1.3521,
    "lng": 103.8198,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "싱가포르 중심 광장",
      "싱가포르 대표 랜드마크",
      "싱가포르 전망대"
    ],
    "hiddenGems": [
      "싱가포르 로컬 카페거리",
      "싱가포르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sentosa",
    "nameKo": "센토사",
    "countryEn": "SINGAPORE",
    "countryKo": "싱가포르",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "센토사 중심 광장",
      "센토사 대표 랜드마크",
      "센토사 전망대"
    ],
    "hiddenGems": [
      "센토사 로컬 카페거리",
      "센토사 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Marina Bay",
    "nameKo": "마리나베이",
    "countryEn": "SINGAPORE",
    "countryKo": "싱가포르",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마리나베이 중심 광장",
      "마리나베이 대표 랜드마크",
      "마리나베이 전망대"
    ],
    "hiddenGems": [
      "마리나베이 로컬 카페거리",
      "마리나베이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kuala Lumpur",
    "nameKo": "쿠알라룸푸르",
    "countryEn": "MALAYSIA",
    "countryKo": "말레이시아",
    "lat": 3.139,
    "lng": 101.6869,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "쿠알라룸푸르 중심 광장",
      "쿠알라룸푸르 대표 랜드마크",
      "쿠알라룸푸르 전망대"
    ],
    "hiddenGems": [
      "쿠알라룸푸르 로컬 카페거리",
      "쿠알라룸푸르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kota Kinabalu",
    "nameKo": "코타키나발루",
    "countryEn": "MALAYSIA",
    "countryKo": "말레이시아",
    "lat": 5.9804,
    "lng": 116.0735,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코타키나발루 중심 광장",
      "코타키나발루 대표 랜드마크",
      "코타키나발루 전망대"
    ],
    "hiddenGems": [
      "코타키나발루 로컬 카페거리",
      "코타키나발루 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Penang",
    "nameKo": "페낭",
    "countryEn": "MALAYSIA",
    "countryKo": "말레이시아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "페낭 중심 광장",
      "페낭 대표 랜드마크",
      "페낭 전망대"
    ],
    "hiddenGems": [
      "페낭 로컬 카페거리",
      "페낭 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Langkawi",
    "nameKo": "랑카위",
    "countryEn": "MALAYSIA",
    "countryKo": "말레이시아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "랑카위 중심 광장",
      "랑카위 대표 랜드마크",
      "랑카위 전망대"
    ],
    "hiddenGems": [
      "랑카위 로컬 카페거리",
      "랑카위 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Malacca",
    "nameKo": "말라카",
    "countryEn": "MALAYSIA",
    "countryKo": "말레이시아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "말라카 중심 광장",
      "말라카 대표 랜드마크",
      "말라카 전망대"
    ],
    "hiddenGems": [
      "말라카 로컬 카페거리",
      "말라카 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bali",
    "nameKo": "발리",
    "countryEn": "INDONESIA",
    "countryKo": "인도네시아",
    "lat": -8.3405,
    "lng": 115.092,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "발리 중심 광장",
      "발리 대표 랜드마크",
      "발리 전망대"
    ],
    "hiddenGems": [
      "발리 로컬 카페거리",
      "발리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Jakarta",
    "nameKo": "자카르타",
    "countryEn": "INDONESIA",
    "countryKo": "인도네시아",
    "lat": -6.2088,
    "lng": 106.8456,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "자카르타 중심 광장",
      "자카르타 대표 랜드마크",
      "자카르타 전망대"
    ],
    "hiddenGems": [
      "자카르타 로컬 카페거리",
      "자카르타 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Yogyakarta",
    "nameKo": "족자카르타",
    "countryEn": "INDONESIA",
    "countryKo": "인도네시아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "족자카르타 중심 광장",
      "족자카르타 대표 랜드마크",
      "족자카르타 전망대"
    ],
    "hiddenGems": [
      "족자카르타 로컬 카페거리",
      "족자카르타 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Lombok",
    "nameKo": "롬복",
    "countryEn": "INDONESIA",
    "countryKo": "인도네시아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "롬복 중심 광장",
      "롬복 대표 랜드마크",
      "롬복 전망대"
    ],
    "hiddenGems": [
      "롬복 로컬 카페거리",
      "롬복 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Komodo",
    "nameKo": "코모도",
    "countryEn": "INDONESIA",
    "countryKo": "인도네시아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코모도 중심 광장",
      "코모도 대표 랜드마크",
      "코모도 전망대"
    ],
    "hiddenGems": [
      "코모도 로컬 카페거리",
      "코모도 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Vientiane",
    "nameKo": "비엔티안",
    "countryEn": "LAOS",
    "countryKo": "라오스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "비엔티안 중심 광장",
      "비엔티안 대표 랜드마크",
      "비엔티안 전망대"
    ],
    "hiddenGems": [
      "비엔티안 로컬 카페거리",
      "비엔티안 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Luang Prabang",
    "nameKo": "루앙프라방",
    "countryEn": "LAOS",
    "countryKo": "라오스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "루앙프라방 중심 광장",
      "루앙프라방 대표 랜드마크",
      "루앙프라방 전망대"
    ],
    "hiddenGems": [
      "루앙프라방 로컬 카페거리",
      "루앙프라방 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Vang Vieng",
    "nameKo": "방비엥",
    "countryEn": "LAOS",
    "countryKo": "라오스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "방비엥 중심 광장",
      "방비엥 대표 랜드마크",
      "방비엥 전망대"
    ],
    "hiddenGems": [
      "방비엥 로컬 카페거리",
      "방비엥 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Siem Reap",
    "nameKo": "씨엠립",
    "countryEn": "CAMBODIA",
    "countryKo": "캄보디아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "씨엠립 중심 광장",
      "씨엠립 대표 랜드마크",
      "씨엠립 전망대"
    ],
    "hiddenGems": [
      "씨엠립 로컬 카페거리",
      "씨엠립 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Phnom Penh",
    "nameKo": "프놈펜",
    "countryEn": "CAMBODIA",
    "countryKo": "캄보디아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "프놈펜 중심 광장",
      "프놈펜 대표 랜드마크",
      "프놈펜 전망대"
    ],
    "hiddenGems": [
      "프놈펜 로컬 카페거리",
      "프놈펜 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kampot",
    "nameKo": "캄폿",
    "countryEn": "CAMBODIA",
    "countryKo": "캄보디아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "캄폿 중심 광장",
      "캄폿 대표 랜드마크",
      "캄폿 전망대"
    ],
    "hiddenGems": [
      "캄폿 로컬 카페거리",
      "캄폿 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Male",
    "nameKo": "말레",
    "countryEn": "MALDIVES",
    "countryKo": "몰디브",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "말레 중심 광장",
      "말레 대표 랜드마크",
      "말레 전망대"
    ],
    "hiddenGems": [
      "말레 로컬 카페거리",
      "말레 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Maafushi",
    "nameKo": "마아푸시",
    "countryEn": "MALDIVES",
    "countryKo": "몰디브",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마아푸시 중심 광장",
      "마아푸시 대표 랜드마크",
      "마아푸시 전망대"
    ],
    "hiddenGems": [
      "마아푸시 로컬 카페거리",
      "마아푸시 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Ari Atoll",
    "nameKo": "아리 아톨",
    "countryEn": "MALDIVES",
    "countryKo": "몰디브",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아리 아톨 중심 광장",
      "아리 아톨 대표 랜드마크",
      "아리 아톨 전망대"
    ],
    "hiddenGems": [
      "아리 아톨 로컬 카페거리",
      "아리 아톨 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "New Delhi",
    "nameKo": "뉴델리",
    "countryEn": "INDIA",
    "countryKo": "인도",
    "lat": 28.6139,
    "lng": 77.209,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "뉴델리 중심 광장",
      "뉴델리 대표 랜드마크",
      "뉴델리 전망대"
    ],
    "hiddenGems": [
      "뉴델리 로컬 카페거리",
      "뉴델리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Mumbai",
    "nameKo": "뭄바이",
    "countryEn": "INDIA",
    "countryKo": "인도",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "뭄바이 중심 광장",
      "뭄바이 대표 랜드마크",
      "뭄바이 전망대"
    ],
    "hiddenGems": [
      "뭄바이 로컬 카페거리",
      "뭄바이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Jaipur",
    "nameKo": "자이푸르",
    "countryEn": "INDIA",
    "countryKo": "인도",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "자이푸르 중심 광장",
      "자이푸르 대표 랜드마크",
      "자이푸르 전망대"
    ],
    "hiddenGems": [
      "자이푸르 로컬 카페거리",
      "자이푸르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Agra",
    "nameKo": "아그라",
    "countryEn": "INDIA",
    "countryKo": "인도",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아그라 중심 광장",
      "아그라 대표 랜드마크",
      "아그라 전망대"
    ],
    "hiddenGems": [
      "아그라 로컬 카페거리",
      "아그라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Goa",
    "nameKo": "고아",
    "countryEn": "INDIA",
    "countryKo": "인도",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "고아 중심 광장",
      "고아 대표 랜드마크",
      "고아 전망대"
    ],
    "hiddenGems": [
      "고아 로컬 카페거리",
      "고아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Varanasi",
    "nameKo": "바라나시",
    "countryEn": "INDIA",
    "countryKo": "인도",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "바라나시 중심 광장",
      "바라나시 대표 랜드마크",
      "바라나시 전망대"
    ],
    "hiddenGems": [
      "바라나시 로컬 카페거리",
      "바라나시 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kathmandu",
    "nameKo": "카트만두",
    "countryEn": "NEPAL",
    "countryKo": "네팔",
    "lat": 27.7172,
    "lng": 85.324,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "카트만두 중심 광장",
      "카트만두 대표 랜드마크",
      "카트만두 전망대"
    ],
    "hiddenGems": [
      "카트만두 로컬 카페거리",
      "카트만두 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Pokhara",
    "nameKo": "포카라",
    "countryEn": "NEPAL",
    "countryKo": "네팔",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "포카라 중심 광장",
      "포카라 대표 랜드마크",
      "포카라 전망대"
    ],
    "hiddenGems": [
      "포카라 로컬 카페거리",
      "포카라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Everest",
    "nameKo": "에베레스트",
    "countryEn": "NEPAL",
    "countryKo": "네팔",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "에베레스트 중심 광장",
      "에베레스트 대표 랜드마크",
      "에베레스트 전망대"
    ],
    "hiddenGems": [
      "에베레스트 로컬 카페거리",
      "에베레스트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Paris",
    "nameKo": "파리",
    "countryEn": "FRANCE",
    "countryKo": "프랑스",
    "lat": 48.8566,
    "lng": 2.3522,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "파리 중심 광장",
      "파리 대표 랜드마크",
      "파리 전망대"
    ],
    "hiddenGems": [
      "파리 로컬 카페거리",
      "파리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Nice",
    "nameKo": "니스",
    "countryEn": "FRANCE",
    "countryKo": "프랑스",
    "lat": 43.7102,
    "lng": 7.262,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "니스 중심 광장",
      "니스 대표 랜드마크",
      "니스 전망대"
    ],
    "hiddenGems": [
      "니스 로컬 카페거리",
      "니스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Lyon",
    "nameKo": "리옹",
    "countryEn": "FRANCE",
    "countryKo": "프랑스",
    "lat": 45.764,
    "lng": 4.8357,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "리옹 중심 광장",
      "리옹 대표 랜드마크",
      "리옹 전망대"
    ],
    "hiddenGems": [
      "리옹 로컬 카페거리",
      "리옹 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Marseille",
    "nameKo": "마르세유",
    "countryEn": "FRANCE",
    "countryKo": "프랑스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마르세유 중심 광장",
      "마르세유 대표 랜드마크",
      "마르세유 전망대"
    ],
    "hiddenGems": [
      "마르세유 로컬 카페거리",
      "마르세유 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bordeaux",
    "nameKo": "보르도",
    "countryEn": "FRANCE",
    "countryKo": "프랑스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "보르도 중심 광장",
      "보르도 대표 랜드마크",
      "보르도 전망대"
    ],
    "hiddenGems": [
      "보르도 로컬 카페거리",
      "보르도 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Strasbourg",
    "nameKo": "스트라스부르",
    "countryEn": "FRANCE",
    "countryKo": "프랑스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "스트라스부르 중심 광장",
      "스트라스부르 대표 랜드마크",
      "스트라스부르 전망대"
    ],
    "hiddenGems": [
      "스트라스부르 로컬 카페거리",
      "스트라스부르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Colmar",
    "nameKo": "콜마르",
    "countryEn": "FRANCE",
    "countryKo": "프랑스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "콜마르 중심 광장",
      "콜마르 대표 랜드마크",
      "콜마르 전망대"
    ],
    "hiddenGems": [
      "콜마르 로컬 카페거리",
      "콜마르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Rome",
    "nameKo": "로마",
    "countryEn": "ITALY",
    "countryKo": "이탈리아",
    "lat": 41.9028,
    "lng": 12.4964,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "로마 중심 광장",
      "로마 대표 랜드마크",
      "로마 전망대"
    ],
    "hiddenGems": [
      "로마 로컬 카페거리",
      "로마 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Florence",
    "nameKo": "피렌체",
    "countryEn": "ITALY",
    "countryKo": "이탈리아",
    "lat": 43.7696,
    "lng": 11.2558,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "피렌체 중심 광장",
      "피렌체 대표 랜드마크",
      "피렌체 전망대"
    ],
    "hiddenGems": [
      "피렌체 로컬 카페거리",
      "피렌체 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Venice",
    "nameKo": "베네치아",
    "countryEn": "ITALY",
    "countryKo": "이탈리아",
    "lat": 45.4408,
    "lng": 12.3155,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "베네치아 중심 광장",
      "베네치아 대표 랜드마크",
      "베네치아 전망대"
    ],
    "hiddenGems": [
      "베네치아 로컬 카페거리",
      "베네치아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Milan",
    "nameKo": "밀라노",
    "countryEn": "ITALY",
    "countryKo": "이탈리아",
    "lat": 45.4642,
    "lng": 9.19,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "밀라노 중심 광장",
      "밀라노 대표 랜드마크",
      "밀라노 전망대"
    ],
    "hiddenGems": [
      "밀라노 로컬 카페거리",
      "밀라노 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Naples",
    "nameKo": "나폴리",
    "countryEn": "ITALY",
    "countryKo": "이탈리아",
    "lat": 40.8518,
    "lng": 14.2681,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "나폴리 중심 광장",
      "나폴리 대표 랜드마크",
      "나폴리 전망대"
    ],
    "hiddenGems": [
      "나폴리 로컬 카페거리",
      "나폴리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Amalfi",
    "nameKo": "아말피",
    "countryEn": "ITALY",
    "countryKo": "이탈리아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아말피 중심 광장",
      "아말피 대표 랜드마크",
      "아말피 전망대"
    ],
    "hiddenGems": [
      "아말피 로컬 카페거리",
      "아말피 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Positano",
    "nameKo": "포지타노",
    "countryEn": "ITALY",
    "countryKo": "이탈리아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "포지타노 중심 광장",
      "포지타노 대표 랜드마크",
      "포지타노 전망대"
    ],
    "hiddenGems": [
      "포지타노 로컬 카페거리",
      "포지타노 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Barcelona",
    "nameKo": "바르셀로나",
    "countryEn": "SPAIN",
    "countryKo": "스페인",
    "lat": 41.3879,
    "lng": 2.1699,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "바르셀로나 중심 광장",
      "바르셀로나 대표 랜드마크",
      "바르셀로나 전망대"
    ],
    "hiddenGems": [
      "바르셀로나 로컬 카페거리",
      "바르셀로나 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Madrid",
    "nameKo": "마드리드",
    "countryEn": "SPAIN",
    "countryKo": "스페인",
    "lat": 40.4168,
    "lng": -3.7038,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마드리드 중심 광장",
      "마드리드 대표 랜드마크",
      "마드리드 전망대"
    ],
    "hiddenGems": [
      "마드리드 로컬 카페거리",
      "마드리드 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Seville",
    "nameKo": "세비야",
    "countryEn": "SPAIN",
    "countryKo": "스페인",
    "lat": 37.3891,
    "lng": -5.9845,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "세비야 중심 광장",
      "세비야 대표 랜드마크",
      "세비야 전망대"
    ],
    "hiddenGems": [
      "세비야 로컬 카페거리",
      "세비야 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Granada",
    "nameKo": "그라나다",
    "countryEn": "SPAIN",
    "countryKo": "스페인",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "그라나다 중심 광장",
      "그라나다 대표 랜드마크",
      "그라나다 전망대"
    ],
    "hiddenGems": [
      "그라나다 로컬 카페거리",
      "그라나다 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Valencia",
    "nameKo": "발렌시아",
    "countryEn": "SPAIN",
    "countryKo": "스페인",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "발렌시아 중심 광장",
      "발렌시아 대표 랜드마크",
      "발렌시아 전망대"
    ],
    "hiddenGems": [
      "발렌시아 로컬 카페거리",
      "발렌시아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Malaga",
    "nameKo": "말라가",
    "countryEn": "SPAIN",
    "countryKo": "스페인",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "말라가 중심 광장",
      "말라가 대표 랜드마크",
      "말라가 전망대"
    ],
    "hiddenGems": [
      "말라가 로컬 카페거리",
      "말라가 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Ibiza",
    "nameKo": "이비자",
    "countryEn": "SPAIN",
    "countryKo": "스페인",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "이비자 중심 광장",
      "이비자 대표 랜드마크",
      "이비자 전망대"
    ],
    "hiddenGems": [
      "이비자 로컬 카페거리",
      "이비자 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "London",
    "nameKo": "런던",
    "countryEn": "UNITED KINGDOM",
    "countryKo": "영국",
    "lat": 51.5074,
    "lng": -0.1278,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "런던 중심 광장",
      "런던 대표 랜드마크",
      "런던 전망대"
    ],
    "hiddenGems": [
      "런던 로컬 카페거리",
      "런던 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Edinburgh",
    "nameKo": "에든버러",
    "countryEn": "UNITED KINGDOM",
    "countryKo": "영국",
    "lat": 55.9533,
    "lng": -3.1883,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "에든버러 중심 광장",
      "에든버러 대표 랜드마크",
      "에든버러 전망대"
    ],
    "hiddenGems": [
      "에든버러 로컬 카페거리",
      "에든버러 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Manchester",
    "nameKo": "맨체스터",
    "countryEn": "UNITED KINGDOM",
    "countryKo": "영국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "맨체스터 중심 광장",
      "맨체스터 대표 랜드마크",
      "맨체스터 전망대"
    ],
    "hiddenGems": [
      "맨체스터 로컬 카페거리",
      "맨체스터 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Oxford",
    "nameKo": "옥스퍼드",
    "countryEn": "UNITED KINGDOM",
    "countryKo": "영국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "옥스퍼드 중심 광장",
      "옥스퍼드 대표 랜드마크",
      "옥스퍼드 전망대"
    ],
    "hiddenGems": [
      "옥스퍼드 로컬 카페거리",
      "옥스퍼드 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cambridge",
    "nameKo": "케임브리지",
    "countryEn": "UNITED KINGDOM",
    "countryKo": "영국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "케임브리지 중심 광장",
      "케임브리지 대표 랜드마크",
      "케임브리지 전망대"
    ],
    "hiddenGems": [
      "케임브리지 로컬 카페거리",
      "케임브리지 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Liverpool",
    "nameKo": "리버풀",
    "countryEn": "UNITED KINGDOM",
    "countryKo": "영국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "리버풀 중심 광장",
      "리버풀 대표 랜드마크",
      "리버풀 전망대"
    ],
    "hiddenGems": [
      "리버풀 로컬 카페거리",
      "리버풀 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Zurich",
    "nameKo": "취리히",
    "countryEn": "SWITZERLAND",
    "countryKo": "스위스",
    "lat": 47.3769,
    "lng": 8.5417,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "취리히 중심 광장",
      "취리히 대표 랜드마크",
      "취리히 전망대"
    ],
    "hiddenGems": [
      "취리히 로컬 카페거리",
      "취리히 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Interlaken",
    "nameKo": "인터라켄",
    "countryEn": "SWITZERLAND",
    "countryKo": "스위스",
    "lat": 46.6863,
    "lng": 7.8632,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "인터라켄 중심 광장",
      "인터라켄 대표 랜드마크",
      "인터라켄 전망대"
    ],
    "hiddenGems": [
      "인터라켄 로컬 카페거리",
      "인터라켄 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1527668752968-14dc70a27c95?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Geneva",
    "nameKo": "제네바",
    "countryEn": "SWITZERLAND",
    "countryKo": "스위스",
    "lat": 46.2044,
    "lng": 6.1432,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "제네바 중심 광장",
      "제네바 대표 랜드마크",
      "제네바 전망대"
    ],
    "hiddenGems": [
      "제네바 로컬 카페거리",
      "제네바 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Lucerne",
    "nameKo": "루체른",
    "countryEn": "SWITZERLAND",
    "countryKo": "스위스",
    "lat": 47.0502,
    "lng": 8.3093,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "루체른 중심 광장",
      "루체른 대표 랜드마크",
      "루체른 전망대"
    ],
    "hiddenGems": [
      "루체른 로컬 카페거리",
      "루체른 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Zermatt",
    "nameKo": "체르마트",
    "countryEn": "SWITZERLAND",
    "countryKo": "스위스",
    "lat": 45.9765,
    "lng": 7.7491,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "체르마트 중심 광장",
      "체르마트 대표 랜드마크",
      "체르마트 전망대"
    ],
    "hiddenGems": [
      "체르마트 로컬 카페거리",
      "체르마트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Grindelwald",
    "nameKo": "그린델발트",
    "countryEn": "SWITZERLAND",
    "countryKo": "스위스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "그린델발트 중심 광장",
      "그린델발트 대표 랜드마크",
      "그린델발트 전망대"
    ],
    "hiddenGems": [
      "그린델발트 로컬 카페거리",
      "그린델발트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Berlin",
    "nameKo": "베를린",
    "countryEn": "GERMANY",
    "countryKo": "독일",
    "lat": 52.52,
    "lng": 13.405,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "베를린 중심 광장",
      "베를린 대표 랜드마크",
      "베를린 전망대"
    ],
    "hiddenGems": [
      "베를린 로컬 카페거리",
      "베를린 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Munich",
    "nameKo": "뮌헨",
    "countryEn": "GERMANY",
    "countryKo": "독일",
    "lat": 48.1351,
    "lng": 11.582,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "뮌헨 중심 광장",
      "뮌헨 대표 랜드마크",
      "뮌헨 전망대"
    ],
    "hiddenGems": [
      "뮌헨 로컬 카페거리",
      "뮌헨 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Frankfurt",
    "nameKo": "프랑크푸르트",
    "countryEn": "GERMANY",
    "countryKo": "독일",
    "lat": 50.1109,
    "lng": 8.6821,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "프랑크푸르트 중심 광장",
      "프랑크푸르트 대표 랜드마크",
      "프랑크푸르트 전망대"
    ],
    "hiddenGems": [
      "프랑크푸르트 로컬 카페거리",
      "프랑크푸르트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hamburg",
    "nameKo": "함부르크",
    "countryEn": "GERMANY",
    "countryKo": "독일",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "함부르크 중심 광장",
      "함부르크 대표 랜드마크",
      "함부르크 전망대"
    ],
    "hiddenGems": [
      "함부르크 로컬 카페거리",
      "함부르크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cologne",
    "nameKo": "쾰른",
    "countryEn": "GERMANY",
    "countryKo": "독일",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "쾰른 중심 광장",
      "쾰른 대표 랜드마크",
      "쾰른 전망대"
    ],
    "hiddenGems": [
      "쾰른 로컬 카페거리",
      "쾰른 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Heidelberg",
    "nameKo": "하이델베르크",
    "countryEn": "GERMANY",
    "countryKo": "독일",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "하이델베르크 중심 광장",
      "하이델베르크 대표 랜드마크",
      "하이델베르크 전망대"
    ],
    "hiddenGems": [
      "하이델베르크 로컬 카페거리",
      "하이델베르크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Vienna",
    "nameKo": "빈",
    "countryEn": "AUSTRIA",
    "countryKo": "오스트리아",
    "lat": 48.2082,
    "lng": 16.3738,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "빈 중심 광장",
      "빈 대표 랜드마크",
      "빈 전망대"
    ],
    "hiddenGems": [
      "빈 로컬 카페거리",
      "빈 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Salzburg",
    "nameKo": "잘츠부르크",
    "countryEn": "AUSTRIA",
    "countryKo": "오스트리아",
    "lat": 47.8095,
    "lng": 13.055,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "잘츠부르크 중심 광장",
      "잘츠부르크 대표 랜드마크",
      "잘츠부르크 전망대"
    ],
    "hiddenGems": [
      "잘츠부르크 로컬 카페거리",
      "잘츠부르크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hallstatt",
    "nameKo": "할슈타트",
    "countryEn": "AUSTRIA",
    "countryKo": "오스트리아",
    "lat": 47.5622,
    "lng": 13.6493,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "할슈타트 중심 광장",
      "할슈타트 대표 랜드마크",
      "할슈타트 전망대"
    ],
    "hiddenGems": [
      "할슈타트 로컬 카페거리",
      "할슈타트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Innsbruck",
    "nameKo": "인스부르크",
    "countryEn": "AUSTRIA",
    "countryKo": "오스트리아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "인스부르크 중심 광장",
      "인스부르크 대표 랜드마크",
      "인스부르크 전망대"
    ],
    "hiddenGems": [
      "인스부르크 로컬 카페거리",
      "인스부르크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Graz",
    "nameKo": "그라츠",
    "countryEn": "AUSTRIA",
    "countryKo": "오스트리아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "그라츠 중심 광장",
      "그라츠 대표 랜드마크",
      "그라츠 전망대"
    ],
    "hiddenGems": [
      "그라츠 로컬 카페거리",
      "그라츠 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Prague",
    "nameKo": "프라하",
    "countryEn": "CZECH REPUBLIC",
    "countryKo": "체코",
    "lat": 50.0755,
    "lng": 14.4378,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "프라하 중심 광장",
      "프라하 대표 랜드마크",
      "프라하 전망대"
    ],
    "hiddenGems": [
      "프라하 로컬 카페거리",
      "프라하 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cesky Krumlov",
    "nameKo": "체스키크룸로프",
    "countryEn": "CZECH REPUBLIC",
    "countryKo": "체코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "체스키크룸로프 중심 광장",
      "체스키크룸로프 대표 랜드마크",
      "체스키크룸로프 전망대"
    ],
    "hiddenGems": [
      "체스키크룸로프 로컬 카페거리",
      "체스키크룸로프 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Brno",
    "nameKo": "브르노",
    "countryEn": "CZECH REPUBLIC",
    "countryKo": "체코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "브르노 중심 광장",
      "브르노 대표 랜드마크",
      "브르노 전망대"
    ],
    "hiddenGems": [
      "브르노 로컬 카페거리",
      "브르노 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Karlovy Vary",
    "nameKo": "카를로비바리",
    "countryEn": "CZECH REPUBLIC",
    "countryKo": "체코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "카를로비바리 중심 광장",
      "카를로비바리 대표 랜드마크",
      "카를로비바리 전망대"
    ],
    "hiddenGems": [
      "카를로비바리 로컬 카페거리",
      "카를로비바리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Budapest",
    "nameKo": "부다페스트",
    "countryEn": "HUNGARY",
    "countryKo": "헝가리",
    "lat": 47.4979,
    "lng": 19.0402,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "부다페스트 중심 광장",
      "부다페스트 대표 랜드마크",
      "부다페스트 전망대"
    ],
    "hiddenGems": [
      "부다페스트 로컬 카페거리",
      "부다페스트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Debrecen",
    "nameKo": "데브레첸",
    "countryEn": "HUNGARY",
    "countryKo": "헝가리",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "데브레첸 중심 광장",
      "데브레첸 대표 랜드마크",
      "데브레첸 전망대"
    ],
    "hiddenGems": [
      "데브레첸 로컬 카페거리",
      "데브레첸 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Eger",
    "nameKo": "에게르",
    "countryEn": "HUNGARY",
    "countryKo": "헝가리",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "에게르 중심 광장",
      "에게르 대표 랜드마크",
      "에게르 전망대"
    ],
    "hiddenGems": [
      "에게르 로컬 카페거리",
      "에게르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Szeged",
    "nameKo": "세게드",
    "countryEn": "HUNGARY",
    "countryKo": "헝가리",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "세게드 중심 광장",
      "세게드 대표 랜드마크",
      "세게드 전망대"
    ],
    "hiddenGems": [
      "세게드 로컬 카페거리",
      "세게드 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Dubrovnik",
    "nameKo": "두브로브니크",
    "countryEn": "CROATIA",
    "countryKo": "크로아티아",
    "lat": 42.6507,
    "lng": 18.0944,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "두브로브니크 중심 광장",
      "두브로브니크 대표 랜드마크",
      "두브로브니크 전망대"
    ],
    "hiddenGems": [
      "두브로브니크 로컬 카페거리",
      "두브로브니크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Zagreb",
    "nameKo": "자그레브",
    "countryEn": "CROATIA",
    "countryKo": "크로아티아",
    "lat": 45.815,
    "lng": 15.9819,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "자그레브 중심 광장",
      "자그레브 대표 랜드마크",
      "자그레브 전망대"
    ],
    "hiddenGems": [
      "자그레브 로컬 카페거리",
      "자그레브 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Split",
    "nameKo": "스플리트",
    "countryEn": "CROATIA",
    "countryKo": "크로아티아",
    "lat": 43.5081,
    "lng": 16.4402,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "스플리트 중심 광장",
      "스플리트 대표 랜드마크",
      "스플리트 전망대"
    ],
    "hiddenGems": [
      "스플리트 로컬 카페거리",
      "스플리트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Plitvice",
    "nameKo": "플리트비체",
    "countryEn": "CROATIA",
    "countryKo": "크로아티아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "플리트비체 중심 광장",
      "플리트비체 대표 랜드마크",
      "플리트비체 전망대"
    ],
    "hiddenGems": [
      "플리트비체 로컬 카페거리",
      "플리트비체 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hvar",
    "nameKo": "흐바르",
    "countryEn": "CROATIA",
    "countryKo": "크로아티아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "흐바르 중심 광장",
      "흐바르 대표 랜드마크",
      "흐바르 전망대"
    ],
    "hiddenGems": [
      "흐바르 로컬 카페거리",
      "흐바르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Zadar",
    "nameKo": "자다르",
    "countryEn": "CROATIA",
    "countryKo": "크로아티아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "자다르 중심 광장",
      "자다르 대표 랜드마크",
      "자다르 전망대"
    ],
    "hiddenGems": [
      "자다르 로컬 카페거리",
      "자다르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Lisbon",
    "nameKo": "리스본",
    "countryEn": "PORTUGAL",
    "countryKo": "포르투갈",
    "lat": 38.7223,
    "lng": -9.1393,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "리스본 중심 광장",
      "리스본 대표 랜드마크",
      "리스본 전망대"
    ],
    "hiddenGems": [
      "리스본 로컬 카페거리",
      "리스본 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Porto",
    "nameKo": "포르투",
    "countryEn": "PORTUGAL",
    "countryKo": "포르투갈",
    "lat": 41.1579,
    "lng": -8.6291,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "포르투 중심 광장",
      "포르투 대표 랜드마크",
      "포르투 전망대"
    ],
    "hiddenGems": [
      "포르투 로컬 카페거리",
      "포르투 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sintra",
    "nameKo": "신트라",
    "countryEn": "PORTUGAL",
    "countryKo": "포르투갈",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "신트라 중심 광장",
      "신트라 대표 랜드마크",
      "신트라 전망대"
    ],
    "hiddenGems": [
      "신트라 로컬 카페거리",
      "신트라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Faro",
    "nameKo": "파루",
    "countryEn": "PORTUGAL",
    "countryKo": "포르투갈",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "파루 중심 광장",
      "파루 대표 랜드마크",
      "파루 전망대"
    ],
    "hiddenGems": [
      "파루 로컬 카페거리",
      "파루 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Coimbra",
    "nameKo": "코임브라",
    "countryEn": "PORTUGAL",
    "countryKo": "포르투갈",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코임브라 중심 광장",
      "코임브라 대표 랜드마크",
      "코임브라 전망대"
    ],
    "hiddenGems": [
      "코임브라 로컬 카페거리",
      "코임브라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Madeira",
    "nameKo": "마데이라",
    "countryEn": "PORTUGAL",
    "countryKo": "포르투갈",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마데이라 중심 광장",
      "마데이라 대표 랜드마크",
      "마데이라 전망대"
    ],
    "hiddenGems": [
      "마데이라 로컬 카페거리",
      "마데이라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Athens",
    "nameKo": "아테네",
    "countryEn": "GREECE",
    "countryKo": "그리스",
    "lat": 37.9838,
    "lng": 23.7275,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아테네 중심 광장",
      "아테네 대표 랜드마크",
      "아테네 전망대"
    ],
    "hiddenGems": [
      "아테네 로컬 카페거리",
      "아테네 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Santorini",
    "nameKo": "산토리니",
    "countryEn": "GREECE",
    "countryKo": "그리스",
    "lat": 36.3932,
    "lng": 25.4615,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "산토리니 중심 광장",
      "산토리니 대표 랜드마크",
      "산토리니 전망대"
    ],
    "hiddenGems": [
      "산토리니 로컬 카페거리",
      "산토리니 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Mykonos",
    "nameKo": "미코노스",
    "countryEn": "GREECE",
    "countryKo": "그리스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "미코노스 중심 광장",
      "미코노스 대표 랜드마크",
      "미코노스 전망대"
    ],
    "hiddenGems": [
      "미코노스 로컬 카페거리",
      "미코노스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Crete",
    "nameKo": "크레타",
    "countryEn": "GREECE",
    "countryKo": "그리스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "크레타 중심 광장",
      "크레타 대표 랜드마크",
      "크레타 전망대"
    ],
    "hiddenGems": [
      "크레타 로컬 카페거리",
      "크레타 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Zakynthos",
    "nameKo": "자킨토스",
    "countryEn": "GREECE",
    "countryKo": "그리스",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "자킨토스 중심 광장",
      "자킨토스 대표 랜드마크",
      "자킨토스 전망대"
    ],
    "hiddenGems": [
      "자킨토스 로컬 카페거리",
      "자킨토스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Amsterdam",
    "nameKo": "암스테르담",
    "countryEn": "NETHERLANDS",
    "countryKo": "네덜란드",
    "lat": 52.3676,
    "lng": 4.9041,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "암스테르담 중심 광장",
      "암스테르담 대표 랜드마크",
      "암스테르담 전망대"
    ],
    "hiddenGems": [
      "암스테르담 로컬 카페거리",
      "암스테르담 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Rotterdam",
    "nameKo": "로테르담",
    "countryEn": "NETHERLANDS",
    "countryKo": "네덜란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "로테르담 중심 광장",
      "로테르담 대표 랜드마크",
      "로테르담 전망대"
    ],
    "hiddenGems": [
      "로테르담 로컬 카페거리",
      "로테르담 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Utrecht",
    "nameKo": "위트레흐트",
    "countryEn": "NETHERLANDS",
    "countryKo": "네덜란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "위트레흐트 중심 광장",
      "위트레흐트 대표 랜드마크",
      "위트레흐트 전망대"
    ],
    "hiddenGems": [
      "위트레흐트 로컬 카페거리",
      "위트레흐트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "The Hague",
    "nameKo": "헤이그",
    "countryEn": "NETHERLANDS",
    "countryKo": "네덜란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "헤이그 중심 광장",
      "헤이그 대표 랜드마크",
      "헤이그 전망대"
    ],
    "hiddenGems": [
      "헤이그 로컬 카페거리",
      "헤이그 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Giethoorn",
    "nameKo": "히트호른",
    "countryEn": "NETHERLANDS",
    "countryKo": "네덜란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "히트호른 중심 광장",
      "히트호른 대표 랜드마크",
      "히트호른 전망대"
    ],
    "hiddenGems": [
      "히트호른 로컬 카페거리",
      "히트호른 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Brussels",
    "nameKo": "브뤼셀",
    "countryEn": "BELGIUM",
    "countryKo": "벨기에",
    "lat": 50.8503,
    "lng": 4.3517,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "브뤼셀 중심 광장",
      "브뤼셀 대표 랜드마크",
      "브뤼셀 전망대"
    ],
    "hiddenGems": [
      "브뤼셀 로컬 카페거리",
      "브뤼셀 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bruges",
    "nameKo": "브뤼헤",
    "countryEn": "BELGIUM",
    "countryKo": "벨기에",
    "lat": 51.2093,
    "lng": 3.2247,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "브뤼헤 중심 광장",
      "브뤼헤 대표 랜드마크",
      "브뤼헤 전망대"
    ],
    "hiddenGems": [
      "브뤼헤 로컬 카페거리",
      "브뤼헤 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Ghent",
    "nameKo": "겐트",
    "countryEn": "BELGIUM",
    "countryKo": "벨기에",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "겐트 중심 광장",
      "겐트 대표 랜드마크",
      "겐트 전망대"
    ],
    "hiddenGems": [
      "겐트 로컬 카페거리",
      "겐트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Antwerp",
    "nameKo": "안트베르펜",
    "countryEn": "BELGIUM",
    "countryKo": "벨기에",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "안트베르펜 중심 광장",
      "안트베르펜 대표 랜드마크",
      "안트베르펜 전망대"
    ],
    "hiddenGems": [
      "안트베르펜 로컬 카페거리",
      "안트베르펜 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Copenhagen",
    "nameKo": "코펜하겐",
    "countryEn": "DENMARK",
    "countryKo": "덴마크",
    "lat": 55.6761,
    "lng": 12.5683,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코펜하겐 중심 광장",
      "코펜하겐 대표 랜드마크",
      "코펜하겐 전망대"
    ],
    "hiddenGems": [
      "코펜하겐 로컬 카페거리",
      "코펜하겐 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Aarhus",
    "nameKo": "오르후스",
    "countryEn": "DENMARK",
    "countryKo": "덴마크",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "오르후스 중심 광장",
      "오르후스 대표 랜드마크",
      "오르후스 전망대"
    ],
    "hiddenGems": [
      "오르후스 로컬 카페거리",
      "오르후스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Odense",
    "nameKo": "오덴세",
    "countryEn": "DENMARK",
    "countryKo": "덴마크",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "오덴세 중심 광장",
      "오덴세 대표 랜드마크",
      "오덴세 전망대"
    ],
    "hiddenGems": [
      "오덴세 로컬 카페거리",
      "오덴세 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Billund",
    "nameKo": "빌룬",
    "countryEn": "DENMARK",
    "countryKo": "덴마크",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "빌룬 중심 광장",
      "빌룬 대표 랜드마크",
      "빌룬 전망대"
    ],
    "hiddenGems": [
      "빌룬 로컬 카페거리",
      "빌룬 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Oslo",
    "nameKo": "오슬로",
    "countryEn": "NORWAY",
    "countryKo": "노르웨이",
    "lat": 59.9139,
    "lng": 10.7522,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "오슬로 중심 광장",
      "오슬로 대표 랜드마크",
      "오슬로 전망대"
    ],
    "hiddenGems": [
      "오슬로 로컬 카페거리",
      "오슬로 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bergen",
    "nameKo": "베르겐",
    "countryEn": "NORWAY",
    "countryKo": "노르웨이",
    "lat": 60.3913,
    "lng": 5.3221,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "베르겐 중심 광장",
      "베르겐 대표 랜드마크",
      "베르겐 전망대"
    ],
    "hiddenGems": [
      "베르겐 로컬 카페거리",
      "베르겐 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Tromso",
    "nameKo": "트롬쇠",
    "countryEn": "NORWAY",
    "countryKo": "노르웨이",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "트롬쇠 중심 광장",
      "트롬쇠 대표 랜드마크",
      "트롬쇠 전망대"
    ],
    "hiddenGems": [
      "트롬쇠 로컬 카페거리",
      "트롬쇠 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Stavanger",
    "nameKo": "스타방에르",
    "countryEn": "NORWAY",
    "countryKo": "노르웨이",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "스타방에르 중심 광장",
      "스타방에르 대표 랜드마크",
      "스타방에르 전망대"
    ],
    "hiddenGems": [
      "스타방에르 로컬 카페거리",
      "스타방에르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Flam",
    "nameKo": "플롬",
    "countryEn": "NORWAY",
    "countryKo": "노르웨이",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "플롬 중심 광장",
      "플롬 대표 랜드마크",
      "플롬 전망대"
    ],
    "hiddenGems": [
      "플롬 로컬 카페거리",
      "플롬 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Stockholm",
    "nameKo": "스톡홀름",
    "countryEn": "SWEDEN",
    "countryKo": "스웨덴",
    "lat": 59.3293,
    "lng": 18.0686,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "스톡홀름 중심 광장",
      "스톡홀름 대표 랜드마크",
      "스톡홀름 전망대"
    ],
    "hiddenGems": [
      "스톡홀름 로컬 카페거리",
      "스톡홀름 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Gothenburg",
    "nameKo": "예테보리",
    "countryEn": "SWEDEN",
    "countryKo": "스웨덴",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "예테보리 중심 광장",
      "예테보리 대표 랜드마크",
      "예테보리 전망대"
    ],
    "hiddenGems": [
      "예테보리 로컬 카페거리",
      "예테보리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Malmo",
    "nameKo": "말뫼",
    "countryEn": "SWEDEN",
    "countryKo": "스웨덴",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "말뫼 중심 광장",
      "말뫼 대표 랜드마크",
      "말뫼 전망대"
    ],
    "hiddenGems": [
      "말뫼 로컬 카페거리",
      "말뫼 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Uppsala",
    "nameKo": "웁살라",
    "countryEn": "SWEDEN",
    "countryKo": "스웨덴",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "웁살라 중심 광장",
      "웁살라 대표 랜드마크",
      "웁살라 전망대"
    ],
    "hiddenGems": [
      "웁살라 로컬 카페거리",
      "웁살라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Helsinki",
    "nameKo": "헬싱키",
    "countryEn": "FINLAND",
    "countryKo": "핀란드",
    "lat": 60.1699,
    "lng": 24.9384,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "헬싱키 중심 광장",
      "헬싱키 대표 랜드마크",
      "헬싱키 전망대"
    ],
    "hiddenGems": [
      "헬싱키 로컬 카페거리",
      "헬싱키 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Rovaniemi",
    "nameKo": "로바니에미",
    "countryEn": "FINLAND",
    "countryKo": "핀란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "로바니에미 중심 광장",
      "로바니에미 대표 랜드마크",
      "로바니에미 전망대"
    ],
    "hiddenGems": [
      "로바니에미 로컬 카페거리",
      "로바니에미 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Tampere",
    "nameKo": "탐페레",
    "countryEn": "FINLAND",
    "countryKo": "핀란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "탐페레 중심 광장",
      "탐페레 대표 랜드마크",
      "탐페레 전망대"
    ],
    "hiddenGems": [
      "탐페레 로컬 카페거리",
      "탐페레 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Turku",
    "nameKo": "투르쿠",
    "countryEn": "FINLAND",
    "countryKo": "핀란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "투르쿠 중심 광장",
      "투르쿠 대표 랜드마크",
      "투르쿠 전망대"
    ],
    "hiddenGems": [
      "투르쿠 로컬 카페거리",
      "투르쿠 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Warsaw",
    "nameKo": "바르샤바",
    "countryEn": "POLAND",
    "countryKo": "폴란드",
    "lat": 52.2297,
    "lng": 21.0122,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "바르샤바 중심 광장",
      "바르샤바 대표 랜드마크",
      "바르샤바 전망대"
    ],
    "hiddenGems": [
      "바르샤바 로컬 카페거리",
      "바르샤바 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Krakow",
    "nameKo": "크라쿠프",
    "countryEn": "POLAND",
    "countryKo": "폴란드",
    "lat": 50.0647,
    "lng": 19.945,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "크라쿠프 중심 광장",
      "크라쿠프 대표 랜드마크",
      "크라쿠프 전망대"
    ],
    "hiddenGems": [
      "크라쿠프 로컬 카페거리",
      "크라쿠프 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Gdansk",
    "nameKo": "그단스크",
    "countryEn": "POLAND",
    "countryKo": "폴란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "그단스크 중심 광장",
      "그단스크 대표 랜드마크",
      "그단스크 전망대"
    ],
    "hiddenGems": [
      "그단스크 로컬 카페거리",
      "그단스크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Wroclaw",
    "nameKo": "브로츠와프",
    "countryEn": "POLAND",
    "countryKo": "폴란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "브로츠와프 중심 광장",
      "브로츠와프 대표 랜드마크",
      "브로츠와프 전망대"
    ],
    "hiddenGems": [
      "브로츠와프 로컬 카페거리",
      "브로츠와프 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Dublin",
    "nameKo": "더블린",
    "countryEn": "IRELAND",
    "countryKo": "아일랜드",
    "lat": 53.3498,
    "lng": -6.2603,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "더블린 중심 광장",
      "더블린 대표 랜드마크",
      "더블린 전망대"
    ],
    "hiddenGems": [
      "더블린 로컬 카페거리",
      "더블린 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cork",
    "nameKo": "코크",
    "countryEn": "IRELAND",
    "countryKo": "아일랜드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "코크 중심 광장",
      "코크 대표 랜드마크",
      "코크 전망대"
    ],
    "hiddenGems": [
      "코크 로컬 카페거리",
      "코크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Galway",
    "nameKo": "골웨이",
    "countryEn": "IRELAND",
    "countryKo": "아일랜드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "골웨이 중심 광장",
      "골웨이 대표 랜드마크",
      "골웨이 전망대"
    ],
    "hiddenGems": [
      "골웨이 로컬 카페거리",
      "골웨이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Killarney",
    "nameKo": "킬라니",
    "countryEn": "IRELAND",
    "countryKo": "아일랜드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "킬라니 중심 광장",
      "킬라니 대표 랜드마크",
      "킬라니 전망대"
    ],
    "hiddenGems": [
      "킬라니 로컬 카페거리",
      "킬라니 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bucharest",
    "nameKo": "부쿠레슈티",
    "countryEn": "ROMANIA",
    "countryKo": "루마니아",
    "lat": 44.4268,
    "lng": 26.1025,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "부쿠레슈티 중심 광장",
      "부쿠레슈티 대표 랜드마크",
      "부쿠레슈티 전망대"
    ],
    "hiddenGems": [
      "부쿠레슈티 로컬 카페거리",
      "부쿠레슈티 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Brasov",
    "nameKo": "브라쇼브",
    "countryEn": "ROMANIA",
    "countryKo": "루마니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "브라쇼브 중심 광장",
      "브라쇼브 대표 랜드마크",
      "브라쇼브 전망대"
    ],
    "hiddenGems": [
      "브라쇼브 로컬 카페거리",
      "브라쇼브 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cluj-Napoca",
    "nameKo": "클루지나포카",
    "countryEn": "ROMANIA",
    "countryKo": "루마니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "클루지나포카 중심 광장",
      "클루지나포카 대표 랜드마크",
      "클루지나포카 전망대"
    ],
    "hiddenGems": [
      "클루지나포카 로컬 카페거리",
      "클루지나포카 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sibiu",
    "nameKo": "시비우",
    "countryEn": "ROMANIA",
    "countryKo": "루마니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "시비우 중심 광장",
      "시비우 대표 랜드마크",
      "시비우 전망대"
    ],
    "hiddenGems": [
      "시비우 로컬 카페거리",
      "시비우 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Ljubljana",
    "nameKo": "류블랴나",
    "countryEn": "SLOVENIA",
    "countryKo": "슬로베니아",
    "lat": 46.0569,
    "lng": 14.5058,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "류블랴나 중심 광장",
      "류블랴나 대표 랜드마크",
      "류블랴나 전망대"
    ],
    "hiddenGems": [
      "류블랴나 로컬 카페거리",
      "류블랴나 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bled",
    "nameKo": "블레드",
    "countryEn": "SLOVENIA",
    "countryKo": "슬로베니아",
    "lat": 46.3683,
    "lng": 14.1146,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "블레드 중심 광장",
      "블레드 대표 랜드마크",
      "블레드 전망대"
    ],
    "hiddenGems": [
      "블레드 로컬 카페거리",
      "블레드 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Piran",
    "nameKo": "피란",
    "countryEn": "SLOVENIA",
    "countryKo": "슬로베니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "피란 중심 광장",
      "피란 대표 랜드마크",
      "피란 전망대"
    ],
    "hiddenGems": [
      "피란 로컬 카페거리",
      "피란 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Postojna",
    "nameKo": "포스토이나",
    "countryEn": "SLOVENIA",
    "countryKo": "슬로베니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "포스토이나 중심 광장",
      "포스토이나 대표 랜드마크",
      "포스토이나 전망대"
    ],
    "hiddenGems": [
      "포스토이나 로컬 카페거리",
      "포스토이나 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Reykjavik",
    "nameKo": "레이캬비크",
    "countryEn": "ICELAND",
    "countryKo": "아이슬란드",
    "lat": 64.1466,
    "lng": -21.9426,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "레이캬비크 중심 광장",
      "레이캬비크 대표 랜드마크",
      "레이캬비크 전망대"
    ],
    "hiddenGems": [
      "레이캬비크 로컬 카페거리",
      "레이캬비크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Vik",
    "nameKo": "비크",
    "countryEn": "ICELAND",
    "countryKo": "아이슬란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "비크 중심 광장",
      "비크 대표 랜드마크",
      "비크 전망대"
    ],
    "hiddenGems": [
      "비크 로컬 카페거리",
      "비크 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Akureyri",
    "nameKo": "아쿠레이리",
    "countryEn": "ICELAND",
    "countryKo": "아이슬란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아쿠레이리 중심 광장",
      "아쿠레이리 대표 랜드마크",
      "아쿠레이리 전망대"
    ],
    "hiddenGems": [
      "아쿠레이리 로컬 카페거리",
      "아쿠레이리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Golden Circle",
    "nameKo": "골든 서클",
    "countryEn": "ICELAND",
    "countryKo": "아이슬란드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "골든 서클 중심 광장",
      "골든 서클 대표 랜드마크",
      "골든 서클 전망대"
    ],
    "hiddenGems": [
      "골든 서클 로컬 카페거리",
      "골든 서클 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Istanbul",
    "nameKo": "이스탄불",
    "countryEn": "TURKEY",
    "countryKo": "튀르키예",
    "lat": 41.0082,
    "lng": 28.9784,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "이스탄불 중심 광장",
      "이스탄불 대표 랜드마크",
      "이스탄불 전망대"
    ],
    "hiddenGems": [
      "이스탄불 로컬 카페거리",
      "이스탄불 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cappadocia",
    "nameKo": "카파도키아",
    "countryEn": "TURKEY",
    "countryKo": "튀르키예",
    "lat": 38.6431,
    "lng": 34.8289,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "카파도키아 중심 광장",
      "카파도키아 대표 랜드마크",
      "카파도키아 전망대"
    ],
    "hiddenGems": [
      "카파도키아 로컬 카페거리",
      "카파도키아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Antalya",
    "nameKo": "안탈리아",
    "countryEn": "TURKEY",
    "countryKo": "튀르키예",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "안탈리아 중심 광장",
      "안탈리아 대표 랜드마크",
      "안탈리아 전망대"
    ],
    "hiddenGems": [
      "안탈리아 로컬 카페거리",
      "안탈리아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Pamukkale",
    "nameKo": "파묵칼레",
    "countryEn": "TURKEY",
    "countryKo": "튀르키예",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "파묵칼레 중심 광장",
      "파묵칼레 대표 랜드마크",
      "파묵칼레 전망대"
    ],
    "hiddenGems": [
      "파묵칼레 로컬 카페거리",
      "파묵칼레 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Izmir",
    "nameKo": "이즈미르",
    "countryEn": "TURKEY",
    "countryKo": "튀르키예",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "이즈미르 중심 광장",
      "이즈미르 대표 랜드마크",
      "이즈미르 전망대"
    ],
    "hiddenGems": [
      "이즈미르 로컬 카페거리",
      "이즈미르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cairo",
    "nameKo": "카이로",
    "countryEn": "EGYPT",
    "countryKo": "이집트",
    "lat": 30.0444,
    "lng": 31.2357,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "카이로 중심 광장",
      "카이로 대표 랜드마크",
      "카이로 전망대"
    ],
    "hiddenGems": [
      "카이로 로컬 카페거리",
      "카이로 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Giza",
    "nameKo": "기자",
    "countryEn": "EGYPT",
    "countryKo": "이집트",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "기자 중심 광장",
      "기자 대표 랜드마크",
      "기자 전망대"
    ],
    "hiddenGems": [
      "기자 로컬 카페거리",
      "기자 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Luxor",
    "nameKo": "룩소르",
    "countryEn": "EGYPT",
    "countryKo": "이집트",
    "lat": 25.6872,
    "lng": 32.6396,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "룩소르 중심 광장",
      "룩소르 대표 랜드마크",
      "룩소르 전망대"
    ],
    "hiddenGems": [
      "룩소르 로컬 카페거리",
      "룩소르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Aswan",
    "nameKo": "아스완",
    "countryEn": "EGYPT",
    "countryKo": "이집트",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아스완 중심 광장",
      "아스완 대표 랜드마크",
      "아스완 전망대"
    ],
    "hiddenGems": [
      "아스완 로컬 카페거리",
      "아스완 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hurghada",
    "nameKo": "후르가다",
    "countryEn": "EGYPT",
    "countryKo": "이집트",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "후르가다 중심 광장",
      "후르가다 대표 랜드마크",
      "후르가다 전망대"
    ],
    "hiddenGems": [
      "후르가다 로컬 카페거리",
      "후르가다 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Alexandria",
    "nameKo": "알렉산드리아",
    "countryEn": "EGYPT",
    "countryKo": "이집트",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "알렉산드리아 중심 광장",
      "알렉산드리아 대표 랜드마크",
      "알렉산드리아 전망대"
    ],
    "hiddenGems": [
      "알렉산드리아 로컬 카페거리",
      "알렉산드리아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Marrakech",
    "nameKo": "마라케시",
    "countryEn": "MOROCCO",
    "countryKo": "모로코",
    "lat": 31.6295,
    "lng": -7.9811,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마라케시 중심 광장",
      "마라케시 대표 랜드마크",
      "마라케시 전망대"
    ],
    "hiddenGems": [
      "마라케시 로컬 카페거리",
      "마라케시 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Casablanca",
    "nameKo": "카사블랑카",
    "countryEn": "MOROCCO",
    "countryKo": "모로코",
    "lat": 33.5731,
    "lng": -7.5898,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "카사블랑카 중심 광장",
      "카사블랑카 대표 랜드마크",
      "카사블랑카 전망대"
    ],
    "hiddenGems": [
      "카사블랑카 로컬 카페거리",
      "카사블랑카 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Fes",
    "nameKo": "페스",
    "countryEn": "MOROCCO",
    "countryKo": "모로코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "페스 중심 광장",
      "페스 대표 랜드마크",
      "페스 전망대"
    ],
    "hiddenGems": [
      "페스 로컬 카페거리",
      "페스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Chefchaouen",
    "nameKo": "셰프샤우엔",
    "countryEn": "MOROCCO",
    "countryKo": "모로코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "셰프샤우엔 중심 광장",
      "셰프샤우엔 대표 랜드마크",
      "셰프샤우엔 전망대"
    ],
    "hiddenGems": [
      "셰프샤우엔 로컬 카페거리",
      "셰프샤우엔 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Rabat",
    "nameKo": "라바트",
    "countryEn": "MOROCCO",
    "countryKo": "모로코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "라바트 중심 광장",
      "라바트 대표 랜드마크",
      "라바트 전망대"
    ],
    "hiddenGems": [
      "라바트 로컬 카페거리",
      "라바트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cape Town",
    "nameKo": "케이프타운",
    "countryEn": "SOUTH AFRICA",
    "countryKo": "남아프리카공화국",
    "lat": -33.9249,
    "lng": 18.4241,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "케이프타운 중심 광장",
      "케이프타운 대표 랜드마크",
      "케이프타운 전망대"
    ],
    "hiddenGems": [
      "케이프타운 로컬 카페거리",
      "케이프타운 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Johannesburg",
    "nameKo": "요하네스버그",
    "countryEn": "SOUTH AFRICA",
    "countryKo": "남아프리카공화국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "요하네스버그 중심 광장",
      "요하네스버그 대표 랜드마크",
      "요하네스버그 전망대"
    ],
    "hiddenGems": [
      "요하네스버그 로컬 카페거리",
      "요하네스버그 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Durban",
    "nameKo": "더반",
    "countryEn": "SOUTH AFRICA",
    "countryKo": "남아프리카공화국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "더반 중심 광장",
      "더반 대표 랜드마크",
      "더반 전망대"
    ],
    "hiddenGems": [
      "더반 로컬 카페거리",
      "더반 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kruger",
    "nameKo": "크루거",
    "countryEn": "SOUTH AFRICA",
    "countryKo": "남아프리카공화국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "크루거 중심 광장",
      "크루거 대표 랜드마크",
      "크루거 전망대"
    ],
    "hiddenGems": [
      "크루거 로컬 카페거리",
      "크루거 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Nairobi",
    "nameKo": "나이로비",
    "countryEn": "KENYA",
    "countryKo": "케냐",
    "lat": -1.2921,
    "lng": 36.8219,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "나이로비 중심 광장",
      "나이로비 대표 랜드마크",
      "나이로비 전망대"
    ],
    "hiddenGems": [
      "나이로비 로컬 카페거리",
      "나이로비 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Masai Mara",
    "nameKo": "마사이마라",
    "countryEn": "KENYA",
    "countryKo": "케냐",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마사이마라 중심 광장",
      "마사이마라 대표 랜드마크",
      "마사이마라 전망대"
    ],
    "hiddenGems": [
      "마사이마라 로컬 카페거리",
      "마사이마라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Mombasa",
    "nameKo": "몸바사",
    "countryEn": "KENYA",
    "countryKo": "케냐",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "몸바사 중심 광장",
      "몸바사 대표 랜드마크",
      "몸바사 전망대"
    ],
    "hiddenGems": [
      "몸바사 로컬 카페거리",
      "몸바사 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Zanzibar",
    "nameKo": "잔지바르",
    "countryEn": "TANZANIA",
    "countryKo": "탄자니아",
    "lat": -6.1659,
    "lng": 39.2026,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "잔지바르 중심 광장",
      "잔지바르 대표 랜드마크",
      "잔지바르 전망대"
    ],
    "hiddenGems": [
      "잔지바르 로컬 카페거리",
      "잔지바르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Serengeti",
    "nameKo": "세렝게티",
    "countryEn": "TANZANIA",
    "countryKo": "탄자니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "세렝게티 중심 광장",
      "세렝게티 대표 랜드마크",
      "세렝게티 전망대"
    ],
    "hiddenGems": [
      "세렝게티 로컬 카페거리",
      "세렝게티 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Dar Es Salaam",
    "nameKo": "다르에스살람",
    "countryEn": "TANZANIA",
    "countryKo": "탄자니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "다르에스살람 중심 광장",
      "다르에스살람 대표 랜드마크",
      "다르에스살람 전망대"
    ],
    "hiddenGems": [
      "다르에스살람 로컬 카페거리",
      "다르에스살람 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Kilimanjaro",
    "nameKo": "킬리만자로",
    "countryEn": "TANZANIA",
    "countryKo": "탄자니아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "킬리만자로 중심 광장",
      "킬리만자로 대표 랜드마크",
      "킬리만자로 전망대"
    ],
    "hiddenGems": [
      "킬리만자로 로컬 카페거리",
      "킬리만자로 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Dubai",
    "nameKo": "두바이",
    "countryEn": "UNITED ARAB EMIRATES",
    "countryKo": "아랍에미리트",
    "lat": 25.2048,
    "lng": 55.2708,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "두바이 중심 광장",
      "두바이 대표 랜드마크",
      "두바이 전망대"
    ],
    "hiddenGems": [
      "두바이 로컬 카페거리",
      "두바이 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Abu Dhabi",
    "nameKo": "아부다비",
    "countryEn": "UNITED ARAB EMIRATES",
    "countryKo": "아랍에미리트",
    "lat": 24.4539,
    "lng": 54.3773,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아부다비 중심 광장",
      "아부다비 대표 랜드마크",
      "아부다비 전망대"
    ],
    "hiddenGems": [
      "아부다비 로컬 카페거리",
      "아부다비 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sharjah",
    "nameKo": "샤르자",
    "countryEn": "UNITED ARAB EMIRATES",
    "countryKo": "아랍에미리트",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "샤르자 중심 광장",
      "샤르자 대표 랜드마크",
      "샤르자 전망대"
    ],
    "hiddenGems": [
      "샤르자 로컬 카페거리",
      "샤르자 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Amman",
    "nameKo": "암만",
    "countryEn": "JORDAN",
    "countryKo": "요르단",
    "lat": 31.9454,
    "lng": 35.9284,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "암만 중심 광장",
      "암만 대표 랜드마크",
      "암만 전망대"
    ],
    "hiddenGems": [
      "암만 로컬 카페거리",
      "암만 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Petra",
    "nameKo": "페트라",
    "countryEn": "JORDAN",
    "countryKo": "요르단",
    "lat": 30.3285,
    "lng": 35.4444,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "페트라 중심 광장",
      "페트라 대표 랜드마크",
      "페트라 전망대"
    ],
    "hiddenGems": [
      "페트라 로컬 카페거리",
      "페트라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Wadi Rum",
    "nameKo": "와디럼",
    "countryEn": "JORDAN",
    "countryKo": "요르단",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "와디럼 중심 광장",
      "와디럼 대표 랜드마크",
      "와디럼 전망대"
    ],
    "hiddenGems": [
      "와디럼 로컬 카페거리",
      "와디럼 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Dead Sea",
    "nameKo": "사해",
    "countryEn": "JORDAN",
    "countryKo": "요르단",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "사해 중심 광장",
      "사해 대표 랜드마크",
      "사해 전망대"
    ],
    "hiddenGems": [
      "사해 로컬 카페거리",
      "사해 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Aqaba",
    "nameKo": "아카바",
    "countryEn": "JORDAN",
    "countryKo": "요르단",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아카바 중심 광장",
      "아카바 대표 랜드마크",
      "아카바 전망대"
    ],
    "hiddenGems": [
      "아카바 로컬 카페거리",
      "아카바 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Doha",
    "nameKo": "도하",
    "countryEn": "QATAR",
    "countryKo": "카타르",
    "lat": 25.2854,
    "lng": 51.531,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "도하 중심 광장",
      "도하 대표 랜드마크",
      "도하 전망대"
    ],
    "hiddenGems": [
      "도하 로컬 카페거리",
      "도하 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Al Wakrah",
    "nameKo": "알와크라",
    "countryEn": "QATAR",
    "countryKo": "카타르",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "알와크라 중심 광장",
      "알와크라 대표 랜드마크",
      "알와크라 전망대"
    ],
    "hiddenGems": [
      "알와크라 로컬 카페거리",
      "알와크라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Lusail",
    "nameKo": "루사일",
    "countryEn": "QATAR",
    "countryKo": "카타르",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "루사일 중심 광장",
      "루사일 대표 랜드마크",
      "루사일 전망대"
    ],
    "hiddenGems": [
      "루사일 로컬 카페거리",
      "루사일 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Riyadh",
    "nameKo": "리야드",
    "countryEn": "SAUDI ARABIA",
    "countryKo": "사우디아라비아",
    "lat": 24.7136,
    "lng": 46.6753,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "리야드 중심 광장",
      "리야드 대표 랜드마크",
      "리야드 전망대"
    ],
    "hiddenGems": [
      "리야드 로컬 카페거리",
      "리야드 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Jeddah",
    "nameKo": "제다",
    "countryEn": "SAUDI ARABIA",
    "countryKo": "사우디아라비아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "제다 중심 광장",
      "제다 대표 랜드마크",
      "제다 전망대"
    ],
    "hiddenGems": [
      "제다 로컬 카페거리",
      "제다 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Alula",
    "nameKo": "알울라",
    "countryEn": "SAUDI ARABIA",
    "countryKo": "사우디아라비아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "알울라 중심 광장",
      "알울라 대표 랜드마크",
      "알울라 전망대"
    ],
    "hiddenGems": [
      "알울라 로컬 카페거리",
      "알울라 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Medina",
    "nameKo": "메디나",
    "countryEn": "SAUDI ARABIA",
    "countryKo": "사우디아라비아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "메디나 중심 광장",
      "메디나 대표 랜드마크",
      "메디나 전망대"
    ],
    "hiddenGems": [
      "메디나 로컬 카페거리",
      "메디나 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "New York",
    "nameKo": "뉴욕",
    "countryEn": "UNITED STATES",
    "countryKo": "미국",
    "lat": 40.7128,
    "lng": -74.006,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "뉴욕 중심 광장",
      "뉴욕 대표 랜드마크",
      "뉴욕 전망대"
    ],
    "hiddenGems": [
      "뉴욕 로컬 카페거리",
      "뉴욕 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Los Angeles",
    "nameKo": "로스앤젤레스",
    "countryEn": "UNITED STATES",
    "countryKo": "미국",
    "lat": 34.0522,
    "lng": -118.2437,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "로스앤젤레스 중심 광장",
      "로스앤젤레스 대표 랜드마크",
      "로스앤젤레스 전망대"
    ],
    "hiddenGems": [
      "로스앤젤레스 로컬 카페거리",
      "로스앤젤레스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1580655653885-65763b2597d0?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "San Francisco",
    "nameKo": "샌프란시스코",
    "countryEn": "UNITED STATES",
    "countryKo": "미국",
    "lat": 37.7749,
    "lng": -122.4194,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "샌프란시스코 중심 광장",
      "샌프란시스코 대표 랜드마크",
      "샌프란시스코 전망대"
    ],
    "hiddenGems": [
      "샌프란시스코 로컬 카페거리",
      "샌프란시스코 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Las Vegas",
    "nameKo": "라스베이거스",
    "countryEn": "UNITED STATES",
    "countryKo": "미국",
    "lat": 36.1699,
    "lng": -115.1398,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "라스베이거스 중심 광장",
      "라스베이거스 대표 랜드마크",
      "라스베이거스 전망대"
    ],
    "hiddenGems": [
      "라스베이거스 로컬 카페거리",
      "라스베이거스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Honolulu",
    "nameKo": "호놀룰루",
    "countryEn": "UNITED STATES",
    "countryKo": "미국",
    "lat": 21.3069,
    "lng": -157.8583,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "호놀룰루 중심 광장",
      "호놀룰루 대표 랜드마크",
      "호놀룰루 전망대"
    ],
    "hiddenGems": [
      "호놀룰루 로컬 카페거리",
      "호놀룰루 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1542259009477-d625272157b7?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Seattle",
    "nameKo": "시애틀",
    "countryEn": "UNITED STATES",
    "countryKo": "미국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "시애틀 중심 광장",
      "시애틀 대표 랜드마크",
      "시애틀 전망대"
    ],
    "hiddenGems": [
      "시애틀 로컬 카페거리",
      "시애틀 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Chicago",
    "nameKo": "시카고",
    "countryEn": "UNITED STATES",
    "countryKo": "미국",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "시카고 중심 광장",
      "시카고 대표 랜드마크",
      "시카고 전망대"
    ],
    "hiddenGems": [
      "시카고 로컬 카페거리",
      "시카고 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Vancouver",
    "nameKo": "밴쿠버",
    "countryEn": "CANADA",
    "countryKo": "캐나다",
    "lat": 49.2827,
    "lng": -123.1207,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "밴쿠버 중심 광장",
      "밴쿠버 대표 랜드마크",
      "밴쿠버 전망대"
    ],
    "hiddenGems": [
      "밴쿠버 로컬 카페거리",
      "밴쿠버 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Toronto",
    "nameKo": "토론토",
    "countryEn": "CANADA",
    "countryKo": "캐나다",
    "lat": 43.6532,
    "lng": -79.3832,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "토론토 중심 광장",
      "토론토 대표 랜드마크",
      "토론토 전망대"
    ],
    "hiddenGems": [
      "토론토 로컬 카페거리",
      "토론토 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Montreal",
    "nameKo": "몬트리올",
    "countryEn": "CANADA",
    "countryKo": "캐나다",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "몬트리올 중심 광장",
      "몬트리올 대표 랜드마크",
      "몬트리올 전망대"
    ],
    "hiddenGems": [
      "몬트리올 로컬 카페거리",
      "몬트리올 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Quebec",
    "nameKo": "퀘벡",
    "countryEn": "CANADA",
    "countryKo": "캐나다",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "퀘벡 중심 광장",
      "퀘벡 대표 랜드마크",
      "퀘벡 전망대"
    ],
    "hiddenGems": [
      "퀘벡 로컬 카페거리",
      "퀘벡 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Banff",
    "nameKo": "밴프",
    "countryEn": "CANADA",
    "countryKo": "캐나다",
    "lat": 51.1784,
    "lng": -115.5708,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "밴프 중심 광장",
      "밴프 대표 랜드마크",
      "밴프 전망대"
    ],
    "hiddenGems": [
      "밴프 로컬 카페거리",
      "밴프 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Calgary",
    "nameKo": "캘거리",
    "countryEn": "CANADA",
    "countryKo": "캐나다",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "캘거리 중심 광장",
      "캘거리 대표 랜드마크",
      "캘거리 전망대"
    ],
    "hiddenGems": [
      "캘거리 로컬 카페거리",
      "캘거리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cancun",
    "nameKo": "칸쿤",
    "countryEn": "MEXICO",
    "countryKo": "멕시코",
    "lat": 21.1619,
    "lng": -86.8515,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "칸쿤 중심 광장",
      "칸쿤 대표 랜드마크",
      "칸쿤 전망대"
    ],
    "hiddenGems": [
      "칸쿤 로컬 카페거리",
      "칸쿤 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Mexico City",
    "nameKo": "멕시코시티",
    "countryEn": "MEXICO",
    "countryKo": "멕시코",
    "lat": 19.4326,
    "lng": -99.1332,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "멕시코시티 중심 광장",
      "멕시코시티 대표 랜드마크",
      "멕시코시티 전망대"
    ],
    "hiddenGems": [
      "멕시코시티 로컬 카페거리",
      "멕시코시티 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Playa Del Carmen",
    "nameKo": "플라야델카르멘",
    "countryEn": "MEXICO",
    "countryKo": "멕시코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "플라야델카르멘 중심 광장",
      "플라야델카르멘 대표 랜드마크",
      "플라야델카르멘 전망대"
    ],
    "hiddenGems": [
      "플라야델카르멘 로컬 카페거리",
      "플라야델카르멘 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Tulum",
    "nameKo": "툴룸",
    "countryEn": "MEXICO",
    "countryKo": "멕시코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "툴룸 중심 광장",
      "툴룸 대표 랜드마크",
      "툴룸 전망대"
    ],
    "hiddenGems": [
      "툴룸 로컬 카페거리",
      "툴룸 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Oaxaca",
    "nameKo": "와하카",
    "countryEn": "MEXICO",
    "countryKo": "멕시코",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "와하카 중심 광장",
      "와하카 대표 랜드마크",
      "와하카 전망대"
    ],
    "hiddenGems": [
      "와하카 로컬 카페거리",
      "와하카 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Havana",
    "nameKo": "아바나",
    "countryEn": "CUBA",
    "countryKo": "쿠바",
    "lat": 23.1136,
    "lng": -82.3666,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아바나 중심 광장",
      "아바나 대표 랜드마크",
      "아바나 전망대"
    ],
    "hiddenGems": [
      "아바나 로컬 카페거리",
      "아바나 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Varadero",
    "nameKo": "바라데로",
    "countryEn": "CUBA",
    "countryKo": "쿠바",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "바라데로 중심 광장",
      "바라데로 대표 랜드마크",
      "바라데로 전망대"
    ],
    "hiddenGems": [
      "바라데로 로컬 카페거리",
      "바라데로 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Trinidad",
    "nameKo": "트리니다드",
    "countryEn": "CUBA",
    "countryKo": "쿠바",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "트리니다드 중심 광장",
      "트리니다드 대표 랜드마크",
      "트리니다드 전망대"
    ],
    "hiddenGems": [
      "트리니다드 로컬 카페거리",
      "트리니다드 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Vinales",
    "nameKo": "비냘레스",
    "countryEn": "CUBA",
    "countryKo": "쿠바",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "비냘레스 중심 광장",
      "비냘레스 대표 랜드마크",
      "비냘레스 전망대"
    ],
    "hiddenGems": [
      "비냘레스 로컬 카페거리",
      "비냘레스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Lima",
    "nameKo": "리마",
    "countryEn": "PERU",
    "countryKo": "페루",
    "lat": -12.0464,
    "lng": -77.0428,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "리마 중심 광장",
      "리마 대표 랜드마크",
      "리마 전망대"
    ],
    "hiddenGems": [
      "리마 로컬 카페거리",
      "리마 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cusco",
    "nameKo": "쿠스코",
    "countryEn": "PERU",
    "countryKo": "페루",
    "lat": -13.5319,
    "lng": -71.9675,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "쿠스코 중심 광장",
      "쿠스코 대표 랜드마크",
      "쿠스코 전망대"
    ],
    "hiddenGems": [
      "쿠스코 로컬 카페거리",
      "쿠스코 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Machu Picchu",
    "nameKo": "마추픽추",
    "countryEn": "PERU",
    "countryKo": "페루",
    "lat": -13.1631,
    "lng": -72.545,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마추픽추 중심 광장",
      "마추픽추 대표 랜드마크",
      "마추픽추 전망대"
    ],
    "hiddenGems": [
      "마추픽추 로컬 카페거리",
      "마추픽추 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Arequipa",
    "nameKo": "아레키파",
    "countryEn": "PERU",
    "countryKo": "페루",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "아레키파 중심 광장",
      "아레키파 대표 랜드마크",
      "아레키파 전망대"
    ],
    "hiddenGems": [
      "아레키파 로컬 카페거리",
      "아레키파 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Puno",
    "nameKo": "푸노",
    "countryEn": "PERU",
    "countryKo": "페루",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "푸노 중심 광장",
      "푸노 대표 랜드마크",
      "푸노 전망대"
    ],
    "hiddenGems": [
      "푸노 로컬 카페거리",
      "푸노 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Rio De Janeiro",
    "nameKo": "리우데자네이루",
    "countryEn": "BRAZIL",
    "countryKo": "브라질",
    "lat": -22.9068,
    "lng": -43.1729,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "리우데자네이루 중심 광장",
      "리우데자네이루 대표 랜드마크",
      "리우데자네이루 전망대"
    ],
    "hiddenGems": [
      "리우데자네이루 로컬 카페거리",
      "리우데자네이루 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sao Paulo",
    "nameKo": "상파울루",
    "countryEn": "BRAZIL",
    "countryKo": "브라질",
    "lat": -23.5505,
    "lng": -46.6333,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "상파울루 중심 광장",
      "상파울루 대표 랜드마크",
      "상파울루 전망대"
    ],
    "hiddenGems": [
      "상파울루 로컬 카페거리",
      "상파울루 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Salvador",
    "nameKo": "살바도르",
    "countryEn": "BRAZIL",
    "countryKo": "브라질",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "살바도르 중심 광장",
      "살바도르 대표 랜드마크",
      "살바도르 전망대"
    ],
    "hiddenGems": [
      "살바도르 로컬 카페거리",
      "살바도르 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Iguacu",
    "nameKo": "이구아수",
    "countryEn": "BRAZIL",
    "countryKo": "브라질",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "이구아수 중심 광장",
      "이구아수 대표 랜드마크",
      "이구아수 전망대"
    ],
    "hiddenGems": [
      "이구아수 로컬 카페거리",
      "이구아수 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Buenos Aires",
    "nameKo": "부에노스아이레스",
    "countryEn": "ARGENTINA",
    "countryKo": "아르헨티나",
    "lat": -34.6037,
    "lng": -58.3816,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "부에노스아이레스 중심 광장",
      "부에노스아이레스 대표 랜드마크",
      "부에노스아이레스 전망대"
    ],
    "hiddenGems": [
      "부에노스아이레스 로컬 카페거리",
      "부에노스아이레스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bariloche",
    "nameKo": "바릴로체",
    "countryEn": "ARGENTINA",
    "countryKo": "아르헨티나",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "바릴로체 중심 광장",
      "바릴로체 대표 랜드마크",
      "바릴로체 전망대"
    ],
    "hiddenGems": [
      "바릴로체 로컬 카페거리",
      "바릴로체 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Ushuaia",
    "nameKo": "우수아이아",
    "countryEn": "ARGENTINA",
    "countryKo": "아르헨티나",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "우수아이아 중심 광장",
      "우수아이아 대표 랜드마크",
      "우수아이아 전망대"
    ],
    "hiddenGems": [
      "우수아이아 로컬 카페거리",
      "우수아이아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "El Calafate",
    "nameKo": "엘칼라파테",
    "countryEn": "ARGENTINA",
    "countryKo": "아르헨티나",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "엘칼라파테 중심 광장",
      "엘칼라파테 대표 랜드마크",
      "엘칼라파테 전망대"
    ],
    "hiddenGems": [
      "엘칼라파테 로컬 카페거리",
      "엘칼라파테 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Iguazu",
    "nameKo": "이구아수",
    "countryEn": "ARGENTINA",
    "countryKo": "아르헨티나",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "이구아수 중심 광장",
      "이구아수 대표 랜드마크",
      "이구아수 전망대"
    ],
    "hiddenGems": [
      "이구아수 로컬 카페거리",
      "이구아수 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Santiago",
    "nameKo": "산티아고",
    "countryEn": "CHILE",
    "countryKo": "칠레",
    "lat": -33.4489,
    "lng": -70.6693,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "산티아고 중심 광장",
      "산티아고 대표 랜드마크",
      "산티아고 전망대"
    ],
    "hiddenGems": [
      "산티아고 로컬 카페거리",
      "산티아고 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "San Pedro De Atacama",
    "nameKo": "산페드로데아타카마",
    "countryEn": "CHILE",
    "countryKo": "칠레",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "산페드로데아타카마 중심 광장",
      "산페드로데아타카마 대표 랜드마크",
      "산페드로데아타카마 전망대"
    ],
    "hiddenGems": [
      "산페드로데아타카마 로컬 카페거리",
      "산페드로데아타카마 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Torres Del Paine",
    "nameKo": "토레스델파이네",
    "countryEn": "CHILE",
    "countryKo": "칠레",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "토레스델파이네 중심 광장",
      "토레스델파이네 대표 랜드마크",
      "토레스델파이네 전망대"
    ],
    "hiddenGems": [
      "토레스델파이네 로컬 카페거리",
      "토레스델파이네 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Easter Island",
    "nameKo": "이스터섬",
    "countryEn": "CHILE",
    "countryKo": "칠레",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "이스터섬 중심 광장",
      "이스터섬 대표 랜드마크",
      "이스터섬 전망대"
    ],
    "hiddenGems": [
      "이스터섬 로컬 카페거리",
      "이스터섬 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Bogota",
    "nameKo": "보고타",
    "countryEn": "COLOMBIA",
    "countryKo": "콜롬비아",
    "lat": 4.711,
    "lng": -74.0721,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "보고타 중심 광장",
      "보고타 대표 랜드마크",
      "보고타 전망대"
    ],
    "hiddenGems": [
      "보고타 로컬 카페거리",
      "보고타 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Medellin",
    "nameKo": "메데인",
    "countryEn": "COLOMBIA",
    "countryKo": "콜롬비아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "메데인 중심 광장",
      "메데인 대표 랜드마크",
      "메데인 전망대"
    ],
    "hiddenGems": [
      "메데인 로컬 카페거리",
      "메데인 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cartagena",
    "nameKo": "카르타헤나",
    "countryEn": "COLOMBIA",
    "countryKo": "콜롬비아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "카르타헤나 중심 광장",
      "카르타헤나 대표 랜드마크",
      "카르타헤나 전망대"
    ],
    "hiddenGems": [
      "카르타헤나 로컬 카페거리",
      "카르타헤나 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cali",
    "nameKo": "칼리",
    "countryEn": "COLOMBIA",
    "countryKo": "콜롬비아",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "칼리 중심 광장",
      "칼리 대표 랜드마크",
      "칼리 전망대"
    ],
    "hiddenGems": [
      "칼리 로컬 카페거리",
      "칼리 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Sydney",
    "nameKo": "시드니",
    "countryEn": "AUSTRALIA",
    "countryKo": "호주",
    "lat": -33.8688,
    "lng": 151.2093,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "시드니 중심 광장",
      "시드니 대표 랜드마크",
      "시드니 전망대"
    ],
    "hiddenGems": [
      "시드니 로컬 카페거리",
      "시드니 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Melbourne",
    "nameKo": "멜버른",
    "countryEn": "AUSTRALIA",
    "countryKo": "호주",
    "lat": -37.8136,
    "lng": 144.9631,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "멜버른 중심 광장",
      "멜버른 대표 랜드마크",
      "멜버른 전망대"
    ],
    "hiddenGems": [
      "멜버른 로컬 카페거리",
      "멜버른 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Brisbane",
    "nameKo": "브리즈번",
    "countryEn": "AUSTRALIA",
    "countryKo": "호주",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "브리즈번 중심 광장",
      "브리즈번 대표 랜드마크",
      "브리즈번 전망대"
    ],
    "hiddenGems": [
      "브리즈번 로컬 카페거리",
      "브리즈번 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Perth",
    "nameKo": "퍼스",
    "countryEn": "AUSTRALIA",
    "countryKo": "호주",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "퍼스 중심 광장",
      "퍼스 대표 랜드마크",
      "퍼스 전망대"
    ],
    "hiddenGems": [
      "퍼스 로컬 카페거리",
      "퍼스 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Gold Coast",
    "nameKo": "골드코스트",
    "countryEn": "AUSTRALIA",
    "countryKo": "호주",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "골드코스트 중심 광장",
      "골드코스트 대표 랜드마크",
      "골드코스트 전망대"
    ],
    "hiddenGems": [
      "골드코스트 로컬 카페거리",
      "골드코스트 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Cairns",
    "nameKo": "케언즈",
    "countryEn": "AUSTRALIA",
    "countryKo": "호주",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "케언즈 중심 광장",
      "케언즈 대표 랜드마크",
      "케언즈 전망대"
    ],
    "hiddenGems": [
      "케언즈 로컬 카페거리",
      "케언즈 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Auckland",
    "nameKo": "오클랜드",
    "countryEn": "NEW ZEALAND",
    "countryKo": "뉴질랜드",
    "lat": -36.8485,
    "lng": 174.7633,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "오클랜드 중심 광장",
      "오클랜드 대표 랜드마크",
      "오클랜드 전망대"
    ],
    "hiddenGems": [
      "오클랜드 로컬 카페거리",
      "오클랜드 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Queenstown",
    "nameKo": "퀸스타운",
    "countryEn": "NEW ZEALAND",
    "countryKo": "뉴질랜드",
    "lat": -45.0312,
    "lng": 168.6626,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "퀸스타운 중심 광장",
      "퀸스타운 대표 랜드마크",
      "퀸스타운 전망대"
    ],
    "hiddenGems": [
      "퀸스타운 로컬 카페거리",
      "퀸스타운 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1589802829985-817e51171b92?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Christchurch",
    "nameKo": "크라이스트처치",
    "countryEn": "NEW ZEALAND",
    "countryKo": "뉴질랜드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "크라이스트처치 중심 광장",
      "크라이스트처치 대표 랜드마크",
      "크라이스트처치 전망대"
    ],
    "hiddenGems": [
      "크라이스트처치 로컬 카페거리",
      "크라이스트처치 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Rotorua",
    "nameKo": "로토루아",
    "countryEn": "NEW ZEALAND",
    "countryKo": "뉴질랜드",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "로토루아 중심 광장",
      "로토루아 대표 랜드마크",
      "로토루아 전망대"
    ],
    "hiddenGems": [
      "로토루아 로컬 카페거리",
      "로토루아 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Nadi",
    "nameKo": "난디",
    "countryEn": "FIJI",
    "countryKo": "피지",
    "lat": -17.8065,
    "lng": 177.415,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "난디 중심 광장",
      "난디 대표 랜드마크",
      "난디 전망대"
    ],
    "hiddenGems": [
      "난디 로컬 카페거리",
      "난디 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Suva",
    "nameKo": "수바",
    "countryEn": "FIJI",
    "countryKo": "피지",
    "lat": -18.1416,
    "lng": 178.4419,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "수바 중심 광장",
      "수바 대표 랜드마크",
      "수바 전망대"
    ],
    "hiddenGems": [
      "수바 로컬 카페거리",
      "수바 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Mamanuca Islands",
    "nameKo": "마마누카제도",
    "countryEn": "FIJI",
    "countryKo": "피지",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마마누카제도 중심 광장",
      "마마누카제도 대표 랜드마크",
      "마마누카제도 전망대"
    ],
    "hiddenGems": [
      "마마누카제도 로컬 카페거리",
      "마마누카제도 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Tumon",
    "nameKo": "투몬",
    "countryEn": "GUAM",
    "countryKo": "괌",
    "lat": 13.5137,
    "lng": 144.8058,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "투몬 중심 광장",
      "투몬 대표 랜드마크",
      "투몬 전망대"
    ],
    "hiddenGems": [
      "투몬 로컬 카페거리",
      "투몬 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Hagatna",
    "nameKo": "하갓냐",
    "countryEn": "GUAM",
    "countryKo": "괌",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "하갓냐 중심 광장",
      "하갓냐 대표 랜드마크",
      "하갓냐 전망대"
    ],
    "hiddenGems": [
      "하갓냐 로컬 카페거리",
      "하갓냐 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Tamuning",
    "nameKo": "타무닝",
    "countryEn": "GUAM",
    "countryKo": "괌",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "타무닝 중심 광장",
      "타무닝 대표 랜드마크",
      "타무닝 전망대"
    ],
    "hiddenGems": [
      "타무닝 로컬 카페거리",
      "타무닝 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Garapan",
    "nameKo": "가라판",
    "countryEn": "SAIPAN",
    "countryKo": "사이판",
    "lat": 15.2078,
    "lng": 145.7198,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "가라판 중심 광장",
      "가라판 대표 랜드마크",
      "가라판 전망대"
    ],
    "hiddenGems": [
      "가라판 로컬 카페거리",
      "가라판 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Marpi",
    "nameKo": "마르피",
    "countryEn": "SAIPAN",
    "countryKo": "사이판",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "마르피 중심 광장",
      "마르피 대표 랜드마크",
      "마르피 전망대"
    ],
    "hiddenGems": [
      "마르피 로컬 카페거리",
      "마르피 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  },
  {
    "nameEn": "Susupe",
    "nameKo": "수수페",
    "countryEn": "SAIPAN",
    "countryKo": "사이판",
    "lat": 0.0,
    "lng": 0.0,
    "tags": [
      "City",
      "Culture",
      "Gourmet"
    ],
    "bestMonths": [
      3,
      4,
      5,
      9,
      10,
      11
    ],
    "avoidMonths": [
      {
        "months": [
          7,
          8
        ],
        "reason": "여름철 무더위 및 혼잡"
      }
    ],
    "iconicSpots": [
      "수수페 중심 광장",
      "수수페 대표 랜드마크",
      "수수페 전망대"
    ],
    "hiddenGems": [
      "수수페 로컬 카페거리",
      "수수페 뒷골목 히든 스폿"
    ],
    "coverImage": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
  }
];

export const DEFAULT_PRESET_TRIP_PLANS: PresetTripPlan[] = [
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

export const PRESET_TRIP_PLANS = DEFAULT_PRESET_TRIP_PLANS;

// LocalStorage Preset CRUD Helpers
export function getSavedPresets(): PresetTripPlan[] {
  try {
    const custom = localStorage.getItem('custom_trip_presets');
    const customList: PresetTripPlan[] = custom ? JSON.parse(custom) : [];
    
    // Also check for hidden default preset IDs
    const hidden = localStorage.getItem('deleted_preset_ids');
    const hiddenIds: string[] = hidden ? JSON.parse(hidden) : [];

    const activeDefaults = DEFAULT_PRESET_TRIP_PLANS.filter(p => !hiddenIds.includes(p.id));
    return [...customList, ...activeDefaults];
  } catch (_) {
    return DEFAULT_PRESET_TRIP_PLANS;
  }
}

export function saveCustomPreset(preset: PresetTripPlan): PresetTripPlan[] {
  try {
    const current = localStorage.getItem('custom_trip_presets');
    let list: PresetTripPlan[] = current ? JSON.parse(current) : [];
    const existingIndex = list.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...preset, isCustom: true };
    } else {
      list = [{ ...preset, isCustom: true }, ...list];
    }
    localStorage.setItem('custom_trip_presets', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('tripPresetsChanged'));
    return getSavedPresets();
  } catch (_) {
    return DEFAULT_PRESET_TRIP_PLANS;
  }
}

export function deletePresetById(id: string): PresetTripPlan[] {
  try {
    // If in custom presets, remove
    const current = localStorage.getItem('custom_trip_presets');
    if (current) {
      let list: PresetTripPlan[] = JSON.parse(current);
      list = list.filter(p => p.id !== id);
      localStorage.setItem('custom_trip_presets', JSON.stringify(list));
    }
    // If it is a default preset, mark as deleted
    if (DEFAULT_PRESET_TRIP_PLANS.some(p => p.id === id)) {
      const hidden = localStorage.getItem('deleted_preset_ids');
      const hiddenIds: string[] = hidden ? JSON.parse(hidden) : [];
      if (!hiddenIds.includes(id)) {
        hiddenIds.push(id);
        localStorage.setItem('deleted_preset_ids', JSON.stringify(hiddenIds));
      }
    }
    window.dispatchEvent(new CustomEvent('tripPresetsChanged'));
    return getSavedPresets();
  } catch (_) {
    return DEFAULT_PRESET_TRIP_PLANS;
  }
}

export function restoreDefaultPresets(): PresetTripPlan[] {
  try {
    localStorage.removeItem('custom_trip_presets');
    localStorage.removeItem('deleted_preset_ids');
    window.dispatchEvent(new CustomEvent('tripPresetsChanged'));
    return DEFAULT_PRESET_TRIP_PLANS;
  } catch (_) {
    return DEFAULT_PRESET_TRIP_PLANS;
  }
}

export function saveAllPresets(presets: PresetTripPlan[]): PresetTripPlan[] {
  try {
    const customList = presets.filter(p => p.isCustom);
    const presentDefaultIds = presets.filter(p => !p.isCustom).map(p => p.id);
    const deletedDefaultIds = DEFAULT_PRESET_TRIP_PLANS
      .filter(p => !presentDefaultIds.includes(p.id))
      .map(p => p.id);

    localStorage.setItem('custom_trip_presets', JSON.stringify(customList));
    localStorage.setItem('deleted_preset_ids', JSON.stringify(deletedDefaultIds));
    window.dispatchEvent(new CustomEvent('tripPresetsChanged'));
    return presets;
  } catch (_) {
    return presets;
  }
}

export function findCountryByNameOrAlias(query: string): DestinationCountry | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();

  // 1단계: 100% 완전 일치 우선 (코드, 영문명, 한글명, 별칭 완전 일치)
  const exact = WORLD_COUNTRIES.find(c => 
    c.code.toLowerCase() === q ||
    c.nameEn.toLowerCase() === q ||
    c.nameKo.toLowerCase() === q ||
    c.aliases.some(alias => alias.toLowerCase() === q)
  );
  if (exact) return exact;

  // 2단계: 접두사 일치 (검색어가 3자 이상일 때만 허용하여 2자리 코드 오인 차단)
  if (q.length >= 3) {
    const prefix = WORLD_COUNTRIES.find(c =>
      c.nameEn.toLowerCase().startsWith(q) ||
      q.startsWith(c.nameEn.toLowerCase()) ||
      c.nameKo.toLowerCase().startsWith(q) ||
      q.startsWith(c.nameKo.toLowerCase())
    );
    if (prefix) return prefix;
  }

  // 3단계: 3글자 이상 별칭 부분 일치 (최후의 수단)
  return WORLD_COUNTRIES.find(c =>
    c.aliases.some(alias => alias.length >= 3 && (alias.toLowerCase().includes(q) || q.includes(alias.toLowerCase())))
  );
}

export function findCityByNameOrAlias(query: string): DestinationCity | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();

  // 1단계: 완전 일치 우선
  const exact = WORLD_CITIES.find(city => 
    city.nameEn.toLowerCase() === q ||
    city.nameKo.toLowerCase() === q
  );
  if (exact) return exact;

  // 2단계: 3글자 이상 부분 일치
  if (q.length >= 2) {
    return WORLD_CITIES.find(city => 
      city.nameEn.toLowerCase().startsWith(q) ||
      q.startsWith(city.nameEn.toLowerCase()) ||
      city.nameKo.toLowerCase().startsWith(q) ||
      q.startsWith(city.nameKo.toLowerCase()) ||
      (q.length >= 3 && (q.includes(city.nameKo.toLowerCase()) || q.includes(city.nameEn.toLowerCase())))
    );
  }

  return undefined;
}
