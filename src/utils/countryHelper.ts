// Mapping dictionary for multilingual country search and normalization

export interface CountryMapping {
  name: string;      // Standardized English uppercase name (e.g. JAPAN, SOUTH KOREA)
  korean: string;    // Common Korean name (e.g. 일본, 대한민국)
  aliases: string[]; // Variations, ISO codes, city names, etc.
}

export const COUNTRY_MAPPINGS: CountryMapping[] = [
  {
    name: 'JAPAN',
    korean: '일본',
    aliases: ['일본', 'japan', 'nihon', 'nippon', '日本', 'jp', '도쿄', '오사카', '교토', '후쿠오카', '삿포로', 'tokyo', 'osaka', 'kyoto', 'fukuoka', 'sapporo', '나고야', 'nagoya', '오키나와', 'okinawa']
  },
  {
    name: 'SOUTH KOREA',
    korean: '대한민국',
    aliases: ['대한민국', '한국', 'korea', 'south korea', 'kr', 'seoul', 'busan', '서울', '부산', '제주', 'jeju', '인천', 'incheon']
  },
  {
    name: 'TAIWAN',
    korean: '대만',
    aliases: ['대만', '타이완', 'taiwan', 'tai wan', '台灣', '臺灣', 'tw', '타이베이', '타이페이', 'taipei', '가오슝', 'kaohsiung', '타이난', 'tainan']
  },
  {
    name: 'VIETNAM',
    korean: '베트남',
    aliases: ['베트남', 'vietnam', 'việt nam', 'viet nam', 'vn', '다낭', 'danang', '하노이', 'hanoi', '호치민', 'ho chi minh', '나트랑', '냐짱', 'nha trang', '푸꾸옥', 'phu quoc']
  },
  {
    name: 'THAILAND',
    korean: '태국',
    aliases: ['태국', '타이', 'thailand', 'ประเทศไทย', 'thai', 'th', '방콕', 'bangkok', '치앙마이', 'chiang mai', '푸켓', 'phuket', '파타야', 'pattaya']
  },
  {
    name: 'USA',
    korean: '미국',
    aliases: ['미국', '미합중국', 'usa', 'united states', 'america', 'us', '뉴욕', 'new york', 'la', '로스앤젤레스', 'los angeles', '샌프란시스코', 'san francisco', '하와이', 'hawaii', '괌', 'guam', '사이판', 'saipan', '라스베가스', 'las vegas', '시애틀', 'seattle']
  },
  {
    name: 'FRANCE',
    korean: '프랑스',
    aliases: ['프랑스', '불란서', 'france', 'french', 'fr', '파리', 'paris', '니스', 'nice', '리옹', 'lyon', '마르세유', 'marseille']
  },
  {
    name: 'ITALY',
    korean: '이탈리아',
    aliases: ['이탈리아', '이태리', 'italy', 'italia', 'it', '로마', 'rome', 'roma', '피렌체', 'florence', '베네치아', '베니스', 'venice', '밀라노', 'milan']
  },
  {
    name: 'UNITED KINGDOM',
    korean: '영국',
    aliases: ['영국', 'uk', 'united kingdom', 'great britain', 'england', 'gb', '런던', 'london', '에든버러', 'edinburgh']
  },
  {
    name: 'GERMANY',
    korean: '독일',
    aliases: ['독일', 'germany', 'deutschland', 'de', '베를린', 'berlin', '뮌헨', 'munich', '프랑크푸르트', 'frankfurt']
  },
  {
    name: 'SPAIN',
    korean: '스페인',
    aliases: ['스페인', '에스파냐', 'spain', 'españa', 'espana', 'es', '바르셀로나', 'barcelona', '마드리드', 'madrid', '세비야', 'sevilla', 'seville']
  },
  {
    name: 'SWITZERLAND',
    korean: '스위스',
    aliases: ['스위스', 'switzerland', 'swiss', 'ch', '취리히', 'zurich', '제네바', 'geneva', '인터라켄', 'interlaken', '체르마트', 'zermatt']
  },
  {
    name: 'AUSTRIA',
    korean: '오스트리아',
    aliases: ['오스트리아', 'austria', 'at', '비엔나', '빈', 'vienna', 'wien', '잘츠부르크', 'salzburg']
  },
  {
    name: 'CZECHIA',
    korean: '체코',
    aliases: ['체코', 'czechia', 'czech', 'cz', '프라하', 'prague', 'praha']
  },
  {
    name: 'HUNGARY',
    korean: '헝가리',
    aliases: ['헝가리', 'hungary', 'hu', '부다페스트', 'budapest']
  },
  {
    name: 'SINGAPORE',
    korean: '싱가포르',
    aliases: ['싱가포르', '싱가폴', 'singapore', 'sg']
  },
  {
    name: 'HONG KONG',
    korean: '홍콩',
    aliases: ['홍콩', 'hong kong', 'hk']
  },
  {
    name: 'MACAU',
    korean: '마카오',
    aliases: ['마카오', 'macau', 'mo']
  },
  {
    name: 'CHINA',
    korean: '중국',
    aliases: ['중국', 'china', '中国', 'cn', '베이징', 'beijing', '상하이', 'shanghai']
  },
  {
    name: 'PHILIPPINES',
    korean: '필리핀',
    aliases: ['필리핀', 'philippines', 'ph', '세부', 'cebu', '보라카이', 'boracay', '마닐라', 'manila']
  },
  {
    name: 'MALAYSIA',
    korean: '말레이시아',
    aliases: ['말레이시아', 'malaysia', 'my', '쿠알라룸푸르', 'kuala lumpur', '코타키나발루', 'kota kinabalu']
  },
  {
    name: 'INDONESIA',
    korean: '인도네시아',
    aliases: ['인도네시아', '발리', 'bali', 'indonesia', 'id']
  },
  {
    name: 'AUSTRALIA',
    korean: '호주',
    aliases: ['호주', '오스트레일리아', 'australia', 'au', '시드니', 'sydney', '멜버른', 'melbourne']
  },
  {
    name: 'NEW ZEALAND',
    korean: '뉴질랜드',
    aliases: ['뉴질랜드', 'new zealand', 'nz', '오클랜드', 'auckland']
  },
  {
    name: 'CANADA',
    korean: '캐나다',
    aliases: ['캐나다', 'canada', 'ca', '밴쿠버', 'vancouver', '토론토', 'toronto']
  },
  {
    name: 'TURKEY',
    korean: '튀르키예',
    aliases: ['튀르키예', '터키', 'turkey', 'türkiye', 'tr', '이스탄불', 'istanbul']
  },
  {
    name: 'NETHERLANDS',
    korean: '네덜란드',
    aliases: ['네덜란드', 'netherlands', 'holland', 'nl', '암스테르담', 'amsterdam']
  },
  {
    name: 'BELGIUM',
    korean: '벨기에',
    aliases: ['벨기에', 'belgium', 'be', '브뤼셀', 'brussels']
  },
  {
    name: 'PORTUGAL',
    korean: '포르투갈',
    aliases: ['포르투갈', 'portugal', 'pt', '리스본', 'lisbon', '포르투', 'porto']
  }
];

/**
 * Given a search query string, returns matching English country names.
 * e.g., "일본" -> ["JAPAN"], "대만 여행" -> ["TAIWAN"]
 */
export function getMatchedCountryNamesFromQuery(query: string): string[] {
  if (!query) return [];
  const q = query.trim().toLowerCase();
  const matched = new Set<string>();

  for (const c of COUNTRY_MAPPINGS) {
    if (c.name.toLowerCase().includes(q) || c.korean.toLowerCase().includes(q)) {
      matched.add(c.name);
      continue;
    }
    for (const alias of c.aliases) {
      if (q.includes(alias.toLowerCase()) || alias.toLowerCase().includes(q)) {
        matched.add(c.name);
        break;
      }
    }
  }

  return Array.from(matched);
}

/**
 * Checks whether an item's country, location string, or address matches the query
 * including Korean country names and English country representations.
 */
export function matchesCountryOrQuery(
  item: { country?: string; locationStr?: string; locations?: { country?: string; name?: string }[] },
  query: string
): boolean {
  if (!query) return false;
  const q = query.trim().toLowerCase();
  
  // 1. Find if query references any known country
  const queryCountries = getMatchedCountryNamesFromQuery(q);

  if (queryCountries.length > 0) {
    // Check item's primary country
    if (item.country) {
      const itemCountryUpper = item.country.trim().toUpperCase();
      if (queryCountries.includes(itemCountryUpper)) return true;
    }

    // Check item's location string against the matched countries
    const locStr = (item.locationStr || '').toLowerCase();
    for (const targetCountry of queryCountries) {
      const mapping = COUNTRY_MAPPINGS.find(m => m.name === targetCountry);
      if (mapping) {
        if (locStr.includes(mapping.name.toLowerCase()) || locStr.includes(mapping.korean.toLowerCase())) {
          return true;
        }
        for (const alias of mapping.aliases) {
          if (locStr.includes(alias.toLowerCase())) {
            return true;
          }
        }
      }
    }

    // Check item's multi-locations array
    if (Array.isArray(item.locations)) {
      for (const loc of item.locations) {
        if (loc.country && queryCountries.includes(loc.country.trim().toUpperCase())) {
          return true;
        }
        const locName = (loc.name || '').toLowerCase();
        for (const targetCountry of queryCountries) {
          const mapping = COUNTRY_MAPPINGS.find(m => m.name === targetCountry);
          if (mapping) {
            if (locName.includes(mapping.name.toLowerCase()) || locName.includes(mapping.korean.toLowerCase())) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}
