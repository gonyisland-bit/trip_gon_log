import { SpotPocketPlatform, PocketCategory } from '../types';
import { detectPlatform } from './pocketStorage';

export interface ScrapedSpotCandidate {
  title: string;
  category: PocketCategory;
  memo?: string;
  city?: string;
  country?: string;
  address?: string;
  index?: number;
}

export interface ScrapedSpotData {
  sourceUrl: string;
  platform: SpotPocketPlatform;
  title: string;
  category: PocketCategory;
  memo: string;
  thumbnailUrl: string;
  allImages: string[];
  targetImgIndex?: number;
  city?: string;
  country?: string;
  address?: string;
  authorName?: string;
  candidates: ScrapedSpotCandidate[];
}

/**
 * Extracts address line from notes if present (e.g. "주소: 도쿄도 ...", "위치: 서울시 ...")
 */
export function extractAddressFromText(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(?:📍\s*)?(?:주소|위치|address|오시는\s*길)[:\s]+([^\r\n,]+(?:,\s*[^\r\n]+)?)/i);
  if (match && match[1]) {
    return match[1].trim().slice(0, 120);
  }
  return undefined;
}

/**
 * Extracts img_index parameter from Instagram URLs (e.g. ?img_index=3 or &img_index=3)
 */
export function extractImgIndex(url: string): number | undefined {
  try {
    const parsed = new URL(url);
    const idx = parsed.searchParams.get('img_index');
    if (idx) {
      const num = parseInt(idx, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch (_) {
    const match = url.match(/[?&]img_index=(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return undefined;
}

/**
 * Cleans SNS title noise like "Instagram의 OOO님: ...", " | YouTube", "... on Threads"
 */
export function cleanSnsTitle(rawTitle: string, platform: SpotPocketPlatform): string {
  if (!rawTitle) return '';
  let cleaned = rawTitle.trim();

  // Instagram pattern: "Username on Instagram: \"Title...\"" or "Instagram의 Username님: \"...\""
  cleaned = cleaned.replace(/^(Instagram의\s*[^:]+님:\s*["“]?|[^:]+\s*on\s*Instagram:\s*["“]?)/i, '');
  cleaned = cleaned.replace(/["”]?\s*•\s*Instagram\s*(사진\s*및\s*동영상|photos\s*and\s*videos)?.*$/i, '');

  // Threads pattern: "Username (@user) on Threads: \"...\""
  cleaned = cleaned.replace(/^[^:]+\s*on\s*Threads:\s*["“]?/i, '');
  cleaned = cleaned.replace(/["”]?\s*•\s*Threads.*$/i, '');

  // Twitter / X pattern: "Username on X: \"...\""
  cleaned = cleaned.replace(/^[^:]+\s*on\s*(X|Twitter):\s*["“]?/i, '');
  cleaned = cleaned.replace(/["”]?\s*\/\s*(X|Twitter)$/i, '');

  // YouTube pattern: "... - YouTube"
  cleaned = cleaned.replace(/\s*-\s*YouTube$/i, '');

  // Naver Blog pattern: "... : 네이버 블로그"
  cleaned = cleaned.replace(/\s*:\s*네이버\s*블로그$/i, '');

  // Strip wrapping quotes
  cleaned = cleaned.replace(/^["'“](.*)["'”]$/, '$1').trim();

  // If title is too long (contains entire caption), take first meaningful sentence or line
  if (cleaned.length > 50) {
    const lines = cleaned.split(/[\r\n]+/);
    if (lines[0] && lines[0].trim().length > 3) {
      cleaned = lines[0].trim();
    } else {
      const sentence = cleaned.split(/[.!?]\s+/)[0];
      if (sentence && sentence.length >= 3) {
        cleaned = sentence;
      }
    }
  }

  // Remove hashtags from title
  cleaned = cleaned.replace(/#[\w가-힣]+/g, '').trim();

  return cleaned.slice(0, 80);
}

/**
 * Heuristically infers pocket category from title and text content
 */
export function inferCategory(text: string): PocketCategory {
  const lower = text.toLowerCase();

  // Cafe keywords
  if (/카페|커피|디저트|베이커리|베이글|빙수|티하우스|cafe|coffee|bakery|dessert|tea|espresso/.test(lower)) {
    return 'cafe';
  }

  // Food keywords
  if (/맛집|식당|라멘|우동|스시|초밥|오마카세|구이|야키토리|이자카야|고기|돼지|소고기|치킨|피자|파스타|버거|분식|포차|food|restaurant|ramen|sushi|dining|bistro|bar|pub/.test(lower)) {
    return 'food';
  }

  // Shopping keywords
  if (/쇼핑|빈티지|편집샵|소품샵|플래그십|아울렛|백화점|마켓|굿즈|기념품|shopping|store|shop|market|boutique|vintage/.test(lower)) {
    return 'shopping';
  }

  // Tip keywords
  if (/꿀팁|팁|준비물|환전|패스|웨이팅|교통편|주의사항|예약방법|체크리스트|tip|guide|howto|pass/.test(lower)) {
    return 'tip';
  }

  // Default spot
  return 'spot';
}

/**
 * Detects major travel city and country from text
 */
export function detectCityAndCountry(text: string): { city?: string; country?: string } {
  const combined = text.toLowerCase();

  // Japan (Prioritize distinct regional cities first)
  if (/후쿠오카|fukuoka|하카타|hakata|텐진|tenjin|나카스|nakasu|다이묘|daimyo|야쿠인|yakuin|이토시마|itoshima|유후인|yufuin|벳푸|beppu|기타큐슈|kitakyushu|규슈|kyushu/.test(combined)) {
    return { city: '후쿠오카', country: 'JAPAN' };
  }
  if (/오사카|osaka|도톤보리|난바|namba|nanba|우메다|umeda|신사이바시|shinsaibashi|유니버셜|usj/.test(combined)) {
    return { city: '오사카', country: 'JAPAN' };
  }
  if (/교토|kyoto|기요미즈|아라시야마|기온|gion|후시미이나리|가와라마치/.test(combined)) {
    return { city: '교토', country: 'JAPAN' };
  }
  if (/삿포로|sapporo|오타루|otaru|비에이|biei|후라노|furano|홋카이도|hokkaido|스스키노|susukino/.test(combined)) {
    return { city: '삿포로', country: 'JAPAN' };
  }
  if (/오키나와|okinawa|나하|naha|국제거리|이시가키|미야코/.test(combined)) {
    return { city: '오키나와', country: 'JAPAN' };
  }
  if (/나고야|nagoya|사카에/.test(combined)) {
    return { city: '나고야', country: 'JAPAN' };
  }
  if (/도쿄|tokyo|시부야|shibuya|신주쿠|shinjuku|긴자|ginza|아사쿠사|asakusa|롯폰기|roppongi|하라주쿠|harajuku|오모테산도|omotesando|우에노|ueno|아키하바라|akihabara|이케부쿠로|ikebukuro|오다이바|odaiba|시나가와|shinagawa|메구로|meguro|세타가야|다이칸야마/.test(combined)) {
    return { city: '도쿄', country: 'JAPAN' };
  }

  // Korea
  if (/서울|seoul|성수|강남|홍대|연남|이태원|한남|명동|종로|북촌|익선|잠실|여의도/.test(combined)) {
    return { city: '서울', country: 'KOREA' };
  }
  if (/제주|jeju|서귀포|애월|구좌|함덕|협재|성산/.test(combined)) {
    return { city: '제주', country: 'KOREA' };
  }
  if (/부산|busan|해운대|광안리|서면|남포|영도|기장/.test(combined)) {
    return { city: '부산', country: 'KOREA' };
  }

  // Europe & Americas & Asia
  if (/파리|paris|에펠|루브르|오르세/.test(combined)) {
    return { city: '파리', country: 'FRANCE' };
  }
  if (/런던|london|빅벤|타워브릿지|노팅힐/.test(combined)) {
    return { city: '런던', country: 'UK' };
  }
  if (/뉴욕|new york|맨해튼|브루클린/.test(combined)) {
    return { city: '뉴욕', country: 'USA' };
  }
  if (/방콕|bangkok|치앙마이|chiang mai|푸켓|phuket/.test(combined)) {
    return { city: '방콕', country: 'THAILAND' };
  }
  if (/다낭|danang|나트랑|nha trang|호치민|하노이/.test(combined)) {
    return { city: '다낭', country: 'VIETNAM' };
  }
  if (/대만|taiwan|타이베이|taipei|가오슝/.test(combined)) {
    return { city: '타이베이', country: 'TAIWAN' };
  }

  return {};
}

/**
 * Extracts multiple spot candidates from text if post introduces a list (e.g. "Tokyo Best 5", "1. 멘야무사시 2. 푸글렌")
 * Uses a multi-line buffer to capture all trailing address, business hours, and tip lines under each spot.
 */
export function extractMultiSpotCandidates(caption: string): ScrapedSpotCandidate[] {
  if (!caption) return [];
  const lines = caption.split(/[\r\n]+/);
  const candidates: ScrapedSpotCandidate[] = [];

  // Pattern 1: Numbered list "1. OOO", "1) OOO", "① OOO", "[1] OOO"
  const numberedRegex = /^([1-9]|10)[\s.\)\]、:-]+\s*([^\r\n—–-]+)(?:[—–-](.*))?$/;
  // Pattern 2: Emoji or bullet pins "📍 OOO", "✔️ OOO", "▫️ OOO"
  const pinRegex = /^(?:📍|🏷️|▫️|✔️|📌|▪️|\*)\s*([^\r\n—–-]+)(?:[—–-](.*))?$/;

  let currentCandidate: ScrapedSpotCandidate | null = null;
  const candidateMemoLines: string[] = [];

  const flushCurrent = () => {
    if (currentCandidate) {
      const fullMemo = [
        currentCandidate.memo,
        ...candidateMemoLines
      ].filter(Boolean).join('\n').trim();
      currentCandidate.memo = fullMemo.slice(0, 2000);
      currentCandidate.category = inferCategory(`${currentCandidate.title} ${fullMemo}`);
      if (!currentCandidate.address) {
        currentCandidate.address = extractAddressFromText(fullMemo);
      }
      candidates.push(currentCandidate);
      currentCandidate = null;
      candidateMemoLines.length = 0;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const numMatch = line.match(numberedRegex);
    const pinMatch = !numMatch ? line.match(pinRegex) : null;

    if (numMatch || pinMatch) {
      flushCurrent();
      const idx = numMatch ? parseInt(numMatch[1], 10) : candidates.length + 1;
      const rawTitle = (numMatch ? numMatch[2] : pinMatch![1]).replace(/#[\w가-힣]+/g, '').trim();
      const inlineMemo = (numMatch ? numMatch[3] : pinMatch![2]) ? (numMatch ? numMatch[3] : pinMatch![2])!.trim() : '';

      if (rawTitle && rawTitle.length >= 2 && rawTitle.length <= 50) {
        const { city, country } = detectCityAndCountry(line);
        const address = extractAddressFromText(line);
        currentCandidate = {
          index: idx,
          title: rawTitle,
          category: inferCategory(`${rawTitle} ${inlineMemo}`),
          memo: inlineMemo,
          city,
          country,
          address
        };
      }
    } else if (currentCandidate) {
      // Accumulate subsequent lines (address, hours, tips, notes) under this candidate until next candidate begins
      candidateMemoLines.push(line);
      // Auto-detect city & country from detailed address line if not detected yet
      if (!currentCandidate.city) {
        const { city, country } = detectCityAndCountry(line);
        if (city) {
          currentCandidate.city = city;
          currentCandidate.country = country;
        }
      }
      if (!currentCandidate.address) {
        const addr = extractAddressFromText(line);
        if (addr) currentCandidate.address = addr;
      }
    }
  }
  flushCurrent();

  return candidates.slice(0, 15);
}

/**
 * Main Scraper: Fetches and synthesizes metadata for any SNS or web URL
 */
export async function scrapeSnsMetadata(rawUrl: string): Promise<ScrapedSpotData> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('URL을 입력해주세요.');
  }

  // Ensure protocol
  const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const platform = detectPlatform(fullUrl);
  const targetImgIndex = extractImgIndex(fullUrl);

  let title = '';
  let memo = '';
  let thumbnailUrl = '';
  const allImages: string[] = [];
  let authorName = '';

  // 1. YouTube oEmbed
  if (platform === 'youtube') {
    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(fullUrl)}`);
      if (res.ok) {
        const json = await res.json();
        title = json.title || '';
        authorName = json.author_name || '';
        if (json.thumbnail_url) {
          thumbnailUrl = json.thumbnail_url;
          allImages.push(json.thumbnail_url);
        }
      }
    } catch (e) {
      console.warn('[snsScraper] YouTube oEmbed failed:', e);
    }
  }

  // 2. Twitter / X oEmbed
  else if (platform === 'x') {
    try {
      const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(fullUrl)}`);
      if (res.ok) {
        const json = await res.json();
        authorName = json.author_name ? `@${json.author_name}` : '';
        // Extract text from json.html (<p lang="...">Text</p>)
        if (json.html) {
          const textMatch = json.html.match(/<p[^>]*>(.*?)<\/p>/i);
          if (textMatch) {
            memo = textMatch[1].replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
            title = cleanSnsTitle(memo, 'x');
          }
        }
      }
    } catch (e) {
      console.warn('[snsScraper] Twitter oEmbed failed:', e);
    }
  }

  // 3. Instagram / Threads / Blog / General Web: 단일 대표 썸네일 & 메타데이터 초고속 추출
  try {
    const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(fullUrl)}&screenshot=false`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(microlinkUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (data) {
        if (!title && data.title) title = data.title;
        if (!memo && data.description) memo = data.description;
        if (data.image?.url) {
          thumbnailUrl = data.image.url;
          allImages.push(data.image.url);
        }
        if (data.publisher) authorName = data.publisher;
      }
    }
  } catch (e) {
    console.warn('[snsScraper] Microlink fast fetch failed:', e);
  }

  // Instagram 폴백: Microlink가 이미지를 못 가져온 경우 ddinstagram 또는 embed 단일 호출
  if (platform === 'instagram' && !thumbnailUrl) {
    const shortcode = fullUrl.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[1];
    if (shortcode) {
      try {
        const ddRes = await fetch(`https://api.ddinstagram.com/p/${shortcode}`, { signal: AbortSignal.timeout(3000) });
        if (ddRes.ok) {
          const ddJson = await ddRes.json();
          if (ddJson?.post?.caption && !memo) {
            memo = ddJson.post.caption;
            if (!title) title = cleanSnsTitle(memo, 'instagram');
          }
          const imgUrl = ddJson?.post?.image_url || ddJson?.post?.carousel_media?.[0]?.image_url;
          if (imgUrl) {
            thumbnailUrl = imgUrl;
            allImages.push(imgUrl);
          }
        }
      } catch (_) {}
    }
  }

  if (!thumbnailUrl && allImages.length > 0) {
    thumbnailUrl = allImages[0];
  }


  // Clean title & infer fields
  const cleanedTitle = cleanSnsTitle(title || memo, platform);
  const combinedText = `${cleanedTitle} ${title} ${memo}`;
  const category = inferCategory(combinedText);
  const { city, country } = detectCityAndCountry(combinedText);
  const candidates = extractMultiSpotCandidates(memo || title);

  // If URL explicitly specified ?img_index=N, pick corresponding candidate if matched
  let finalTitle = cleanedTitle || '추천 여행 스팟';
  let finalCategory = category;
  let finalMemo = memo.slice(0, 2000).trim();
  let finalAddress = extractAddressFromText(memo);
  let finalCity = city;
  let finalCountry = country;

  if (targetImgIndex && candidates.length > 0) {
    const matched = candidates.find(c => c.index === targetImgIndex);
    if (matched) {
      finalTitle = matched.title;
      finalCategory = matched.category;
      if (matched.memo) finalMemo = matched.memo;
      if (matched.address) finalAddress = matched.address;
      if (matched.city) finalCity = matched.city;
      if (matched.country) finalCountry = matched.country;
    }
  }

  // If img_index points to an image in allImages
  if (targetImgIndex && allImages.length >= targetImgIndex) {
    thumbnailUrl = allImages[targetImgIndex - 1];
  }

  return {
    sourceUrl: fullUrl,
    platform,
    title: finalTitle,
    category: finalCategory,
    memo: finalMemo,
    thumbnailUrl,
    allImages: allImages.slice(0, 15),
    targetImgIndex,
    city: finalCity,
    country: finalCountry,
    address: finalAddress,
    authorName: authorName ? authorName.replace(/^@/, '') : undefined,
    candidates
  };
}
