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
  // ──────────────────────────────────────────────────────────────────────────
  // Step 3A: Microlink API — img_index=1~8 병렬 호출로 슬라이드별 이미지 수집
  // Instagram 서버는 ?img_index=N URL마다 해당 슬라이드 이미지를 og:image로 반환.
  // Microlink는 서버사이드 렌더링으로 이를 안정적으로 파싱함 (CORS 없음).
  // ──────────────────────────────────────────────────────────────────────────

  const shortcodeForCarousel = platform === 'instagram'
    ? (fullUrl.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/)?.[1] || '')
    : '';

  // Base URL without img_index (always the /p/{shortcode}/ form)
  const basePostUrl = shortcodeForCarousel
    ? `https://www.instagram.com/p/${shortcodeForCarousel}/`
    : fullUrl;

  // Helper: call Microlink for a given URL and extract image URL + metadata
  const fetchMicrolinkImage = async (url: string, timeoutMs = 7000): Promise<{ imageUrl: string; title: string; desc: string }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=false`;
      const res = await fetch(apiUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      if (!res.ok) return { imageUrl: '', title: '', desc: '' };
      const json = await res.json();
      const data = json?.data;
      return {
        imageUrl: data?.image?.url || data?.logo?.url || '',
        title: data?.title || '',
        desc: data?.description || '',
      };
    } catch {
      return { imageUrl: '', title: '', desc: '' };
    } finally {
      clearTimeout(timer);
    }
  };

  if (platform === 'instagram' && shortcodeForCarousel) {
    // --- Primary: Microlink img_index=1~8 병렬 호출 ---
    const MAX_SLIDES = 8;
    const slideUrls = Array.from({ length: MAX_SLIDES }, (_, i) =>
      `${basePostUrl}?img_index=${i + 1}`
    );

    const microlinkResults = await Promise.allSettled(
      slideUrls.map(u => fetchMicrolinkImage(u, 7000))
    );

    let firstImageUrl = '';
    for (const r of microlinkResults) {
      if (r.status !== 'fulfilled') continue;
      const { imageUrl, title: t, desc: d } = r.value;

      // Capture metadata from first slide
      if (!title && t) title = t;
      if (!memo && d) memo = d;

      if (!imageUrl) continue;

      // Deduplicate: skip if this URL is already collected (same image = carousel ended)
      if (!allImages.includes(imageUrl)) {
        allImages.push(imageUrl);
        if (!firstImageUrl) firstImageUrl = imageUrl;
      }
    }

    // Set thumbnail from first valid image
    if (!thumbnailUrl && firstImageUrl) thumbnailUrl = firstImageUrl;

    // If Microlink returned nothing at all, try the bare post URL once more
    if (allImages.length === 0) {
      const fallback = await fetchMicrolinkImage(basePostUrl, 8000);
      if (fallback.imageUrl) {
        allImages.push(fallback.imageUrl);
        thumbnailUrl = fallback.imageUrl;
      }
      if (!title && fallback.title) title = fallback.title;
      if (!memo && fallback.desc) memo = fallback.desc;
    }

  } else {
    // Non-Instagram: single Microlink call
    try {
      const { imageUrl, title: t, desc: d } = await fetchMicrolinkImage(fullUrl, 8000);
      if (!title && t) title = t;
      if (!memo && d) memo = d;
      if (imageUrl && !allImages.includes(imageUrl)) {
        allImages.push(imageUrl);
        if (!thumbnailUrl) thumbnailUrl = imageUrl;
      }
    } catch (e) {
      console.warn('[snsScraper] Microlink fallback failed:', e);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3B: HTML Proxy Scraping — 보조 폴백 (이미지가 부족하거나 Instagram 비일반 URL일 때)
  // ──────────────────────────────────────────────────────────────────────────
  const isInstagramOrThreads = platform === 'instagram' || platform === 'threads';
  const needsFallbackScrape = isInstagramOrThreads || allImages.length <= 1;

  if (needsFallbackScrape) {
    const shortcode = shortcodeForCarousel;

    // Fast fetch helper with configurable timeout
    const fetchWithTimeout = async (url: string, timeoutMs: number = 5000): Promise<string> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return '';
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          return json.contents || JSON.stringify(json);
        }
        return await res.text();
      } catch {
        return '';
      } finally {
        clearTimeout(timer);
      }
    };

    // Helper: validate carousel image URL
    const isValidCarouselUrl = (u: string): boolean => {
      if (!u || !/^https?:\/\//i.test(u)) return false;
      if (/\bs(\d{2,3})x\1\b/.test(u)) return false;
      if (/\/?(150x150|90x90|avatar|profile|logo|sprite|favicon|icon)/i.test(u)) return false;
      if (u.endsWith('.svg') || u.endsWith('.gif')) return false;
      return true;
    };

    const sourceImageSets: string[][] = [];
    const scrapeTasks: Promise<string>[] = [];

    if (platform === 'instagram' && shortcode) {
      // Source A: Instagram official embed endpoint
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      scrapeTasks.push(fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(embedUrl)}`, 4000));
      scrapeTasks.push(fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(embedUrl)}`, 5000));

      // Source B: ddinstagram JSON API
      scrapeTasks.push(fetchWithTimeout(`https://api.ddinstagram.com/p/${shortcode}`, 4000));
      const ddUrl = `https://www.ddinstagram.com/p/${shortcode}/`;
      scrapeTasks.push(fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(ddUrl)}`, 4000));
    } else {
      scrapeTasks.push(fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(fullUrl)}`, 4000));
      scrapeTasks.push(fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(fullUrl)}`, 5000));
    }

    const results = await Promise.allSettled(scrapeTasks);

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const htmlOrJson = r.value;
      if (!htmlOrJson || htmlOrJson.length < 100) continue;

      const sourceImages: string[] = [];

      // JSON API parsing (ddinstagram)
      if (htmlOrJson.trimStart().startsWith('{') || htmlOrJson.trimStart().startsWith('[')) {
        try {
          const apiData = JSON.parse(htmlOrJson);
          if (apiData?.post?.caption && !memo) {
            memo = apiData.post.caption;
            if (!title) title = cleanSnsTitle(memo, 'instagram');
          }
          if (Array.isArray(apiData?.post?.carousel_media)) {
            apiData.post.carousel_media.forEach((item: any) => {
              const u = item.image_url || item.display_url || item.url;
              if (u && isValidCarouselUrl(u) && !sourceImages.includes(u)) sourceImages.push(u);
            });
          } else if (apiData?.post?.image_url && isValidCarouselUrl(apiData.post.image_url)) {
            if (!sourceImages.includes(apiData.post.image_url)) sourceImages.push(apiData.post.image_url);
          }
          if (apiData?.contents && typeof apiData.contents === 'string') {
            const innerMatches = apiData.contents.match(/"display_url"\s*:\s*"(https:[^"]+)"/g);
            if (innerMatches) {
              innerMatches.forEach((m: string) => {
                try {
                  const raw = m.replace(/"display_url"\s*:\s*"/, '').replace(/"$/, '');
                  const clean = raw.replace(/\\u0026/g, '&').replace(/\\/g, '');
                  if (isValidCarouselUrl(clean) && !sourceImages.includes(clean)) sourceImages.push(clean);
                } catch (_) {}
              });
            }
          }
        } catch (_) {}
      }

      // Regex: display_url
      const displayUrlMatches = htmlOrJson.match(/"display_url"\s*:\s*"(https:[^"]+)"/g);
      if (displayUrlMatches) {
        displayUrlMatches.forEach((m: string) => {
          try {
            const raw = m.replace(/"display_url"\s*:\s*"/, '').replace(/"$/, '');
            const clean = raw.replace(/\\u0026/g, '&').replace(/\\/g, '');
            if (isValidCarouselUrl(clean) && !sourceImages.includes(clean)) sourceImages.push(clean);
          } catch (_) {}
        });
      }

      // DOM parsing
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlOrJson, 'text/html');
        const getMeta = (prop: string) =>
          doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
          doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') || '';

        if (!title) title = getMeta('og:title') || doc.querySelector('title')?.textContent || '';
        if (!memo) memo = getMeta('og:description') || getMeta('description') || '';

        doc.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((m) => {
          let content = m.getAttribute('content');
          if (content) {
            content = content.replace(/&amp;/g, '&');
            if (isValidCarouselUrl(content) && !sourceImages.includes(content)) sourceImages.push(content);
          }
        });

        doc.querySelectorAll('img.EmbeddedMediaImage, img[srcset], img[data-src]').forEach((el) => {
          const srcset = el.getAttribute('srcset');
          if (srcset) {
            const parts = srcset.split(',').map(s => s.trim().split(/\s+/));
            parts.sort((a, b) => {
              const wa = parseInt((a[1] || '0').replace('w', ''), 10);
              const wb = parseInt((b[1] || '0').replace('w', ''), 10);
              return wb - wa;
            });
            const largest = parts[0]?.[0];
            if (largest && isValidCarouselUrl(largest) && !sourceImages.includes(largest)) {
              sourceImages.push(largest);
            }
          }
          const dataSrc = el.getAttribute('data-src') || el.getAttribute('data-original');
          if (dataSrc && isValidCarouselUrl(dataSrc) && !sourceImages.includes(dataSrc)) {
            sourceImages.push(dataSrc);
          }
        });
      } catch (_) {}

      if (sourceImages.length > 0) sourceImageSets.push(sourceImages);
    }

    // Merge: richest source first
    if (sourceImageSets.length > 0) {
      sourceImageSets.sort((a, b) => b.length - a.length);
      for (const imgSet of sourceImageSets) {
        for (const u of imgSet) {
          if (!allImages.includes(u)) allImages.push(u);
        }
      }
    }

    if (!thumbnailUrl && allImages.length > 0) {
      thumbnailUrl = allImages[0];
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
    allImages: allImages.slice(0, 15),
    targetImgIndex,
    city,
    country,
    authorName: authorName ? authorName.replace(/^@/, '') : undefined,
    candidates
  };
}
