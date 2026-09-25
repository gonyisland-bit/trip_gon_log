import { SpotPocketPlatform, PocketCategory } from '../types';
import { detectPlatform } from './pocketStorage';

export interface ScrapedSpotCandidate {
  title: string;
  category: PocketCategory;
  memo?: string;
  city?: string;
  country?: string;
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
  authorName?: string;
  candidates: ScrapedSpotCandidate[];
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

  // Japan
  if (/도쿄|tokyo|시부야|신주쿠|긴자|아사쿠사|롯폰기|하라주쿠|오모테산도|우에노|아키하바라/.test(combined)) {
    return { city: '도쿄', country: 'JAPAN' };
  }
  if (/오사카|osaka|도톤보리|난바|우메다|신사이바시|유니버셜/.test(combined)) {
    return { city: '오사카', country: 'JAPAN' };
  }
  if (/교토|kyoto|기요미즈|아라시야마|기온|후시미이나리/.test(combined)) {
    return { city: '교토', country: 'JAPAN' };
  }
  if (/후쿠오카|fukuoka|하카타|텐진|나카스|유후인|벳푸/.test(combined)) {
    return { city: '후쿠오카', country: 'JAPAN' };
  }
  if (/삿포로|sapporo|오타루|비에이|후라노|홋카이도|hokkaido/.test(combined)) {
    return { city: '삿포로', country: 'JAPAN' };
  }
  if (/오키나와|okinawa|나하|국제거리/.test(combined)) {
    return { city: '오키나와', country: 'JAPAN' };
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
 */
export function extractMultiSpotCandidates(caption: string): ScrapedSpotCandidate[] {
  if (!caption) return [];
  const lines = caption.split(/[\r\n]+/);
  const candidates: ScrapedSpotCandidate[] = [];

  // Pattern 1: Numbered list "1. OOO", "1) OOO", "① OOO", "[1] OOO"
  const numberedRegex = /^([1-9]|10)[\s.\)\]、:-]+\s*([^\r\n—–-]+)(?:[—–-](.*))?$/;
  // Pattern 2: Emoji or bullet pins "📍 OOO", "✔️ OOO", "▫️ OOO"
  const pinRegex = /^(?:📍|🏷️|▫️|✔️|📌|▪️|\*)\s*([^\r\n—–-]+)(?:[—–-](.*))?$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const numMatch = line.match(numberedRegex);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10);
      const rawTitle = numMatch[2].replace(/#[\w가-힣]+/g, '').trim();
      const extraMemo = numMatch[3] ? numMatch[3].trim() : '';
      if (rawTitle && rawTitle.length >= 2 && rawTitle.length <= 40) {
        const { city, country } = detectCityAndCountry(line);
        candidates.push({
          index: idx,
          title: rawTitle,
          category: inferCategory(`${rawTitle} ${extraMemo}`),
          memo: extraMemo,
          city,
          country
        });
      }
      continue;
    }

    const pinMatch = line.match(pinRegex);
    if (pinMatch) {
      const rawTitle = pinMatch[1].replace(/#[\w가-힣]+/g, '').trim();
      const extraMemo = pinMatch[2] ? pinMatch[2].trim() : '';
      if (rawTitle && rawTitle.length >= 2 && rawTitle.length <= 40) {
        const { city, country } = detectCityAndCountry(line);
        candidates.push({
          index: candidates.length + 1,
          title: rawTitle,
          category: inferCategory(`${rawTitle} ${extraMemo}`),
          memo: extraMemo,
          city,
          country
        });
      }
    }
  }

  return candidates.slice(0, 10);
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

  // 3. Instagram / Threads / Blog / General Web
  if (!thumbnailUrl || !title) {
    // Attempt 1: Microlink API (High quality OpenGraph parser)
    try {
      const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(fullUrl)}&screenshot=false`;
      const res = await fetch(microlinkUrl, { headers: { 'Accept': 'application/json' } });
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
      console.warn('[snsScraper] Microlink API failed:', e);
    }

    // Attempt 2: AllOrigins CORS proxy fallback with HTML DOMParser
    if (!thumbnailUrl || !title) {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fullUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.contents) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(json.contents, 'text/html');

            const getMeta = (prop: string) => 
              doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
              doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') || '';

            if (!title) title = getMeta('og:title') || doc.querySelector('title')?.textContent || '';
            if (!memo) memo = getMeta('og:description') || getMeta('description') || '';
            // Collect all og:image and twitter:image meta tags
            const metaImages = doc.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], meta[property="twitter:image"]');
            metaImages.forEach((m) => {
              const content = m.getAttribute('content');
              if (content && /^https?:\/\//i.test(content) && !allImages.includes(content)) {
                allImages.push(content);
              }
            });

            const img = allImages[0] || getMeta('og:image') || getMeta('twitter:image');
            if (img && !thumbnailUrl) {
              thumbnailUrl = img;
            }

            // Look for additional images in page articles/main/media
            const imgElements = doc.querySelectorAll('article img, main img, figure img, img');
            imgElements.forEach((el) => {
              const src = el.getAttribute('src');
              if (
                src && 
                /^https?:\/\//i.test(src) && 
                !src.includes('profile') && 
                !src.includes('avatar') && 
                !src.includes('logo') && 
                !src.endsWith('.svg') &&
                !allImages.includes(src)
              ) {
                allImages.push(src);
              }
            });

            // Instagram carousel regex extraction from JSON scripts if present
            if (platform === 'instagram' || platform === 'threads') {
              const displayUrlMatches = json.contents.match(/"display_url":"(https:[^"]+)"/g);
              if (displayUrlMatches) {
                displayUrlMatches.forEach((m: string) => {
                  try {
                    const matchedUrl = m.replace(/"display_url":"/, '').replace(/"$/, '').replace(/\\u0026/g, '&');
                    if (matchedUrl && !allImages.includes(matchedUrl)) {
                      allImages.push(matchedUrl);
                    }
                  } catch (_) {}
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('[snsScraper] AllOrigins fallback failed:', e);
      }
    }
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
  let finalMemo = memo.slice(0, 300);

  if (targetImgIndex && candidates.length > 0) {
    const matched = candidates.find(c => c.index === targetImgIndex);
    if (matched) {
      finalTitle = matched.title;
      finalCategory = matched.category;
      if (matched.memo) finalMemo = matched.memo;
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
    allImages: allImages.slice(0, 10),
    targetImgIndex,
    city,
    country,
    authorName: authorName ? authorName.replace(/^@/, '') : undefined,
    candidates
  };
}
