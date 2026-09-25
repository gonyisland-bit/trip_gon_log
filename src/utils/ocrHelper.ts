/**
 * OCR Helper for extracting text (such as restaurant/spot names) from feed images
 * Useful when Instagram/Threads posts have place names inside carousel card images rather than text caption.
 */

export interface OcrResult {
  fullText: string;
  candidates: string[];
  descriptionText: string;
}

/**
 * Extracts visible text from an image URL using OCR Space free REST API.
 */
export async function extractTextFromImageUrl(
  imageUrl: string,
  language: 'kor' | 'eng' | 'jpn' = 'kor'
): Promise<OcrResult> {
  if (!imageUrl || !imageUrl.trim()) {
    return { fullText: '', candidates: [], descriptionText: '' };
  }

  try {
    const encodedUrl = encodeURIComponent(imageUrl.trim());
    // OCR.space free API endpoint with standard demo key
    const apiUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodedUrl}&language=${language}&isOverlayRequired=false&detectOrientation=true&scale=true`;

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`OCR API HTTP error: ${res.status}`);
    }

    const data = await res.json();

    if (data.IsErroredOnProcessing) {
      const errorMessage = data.ErrorMessage ? data.ErrorMessage.join(', ') : 'OCR 인식 실패';
      throw new Error(errorMessage);
    }

    const parsedResults = data.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      return { fullText: '', candidates: [], descriptionText: '' };
    }

    const rawText: string = parsedResults[0]?.ParsedText || '';
    
    // System & SNS noise regex (status bar time, battery, social UI buttons)
    const isNoiseText = (text: string): boolean => {
      const lower = text.toLowerCase();
      // Status bar time: e.g. "12:30", "오후 3:12", "AM 9:00"
      if (/\b\d{1,2}:\d{2}\b/.test(lower)) return true;
      if (/\b(오전|오후|am|pm)\b/i.test(lower) && /\d/.test(lower)) return true;
      // Network / battery
      if (/\b(lte|5g|4g|wifi|wi-fi|volte|skt|kt|lgu|sk텔레콤)\b/i.test(lower)) return true;
      if (/^\d{1,3}%$/.test(text.trim())) return true;
      // SNS UI keywords
      if (/^(좋아요|댓글|공유|저장|팔로우|팔로잉|게시물|스토리|릴스|instagram|threads|인스타그램|프로필|검색|홈|메시지|dm|direct|알림|더보기)$/i.test(text.trim())) return true;
      if (/^(like|likes|comment|comments|share|save|follow|following|posts|reels|profile|search|home|message)$/i.test(text.trim())) return true;
      // Only digits or symbols
      if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()]+$/.test(text)) return true;
      return false;
    };

    // 1. Extract spot title candidates with intelligent priority
    const allLines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const candidateList: string[] = [];

    // Helper: add candidate if valid
    const addCandidate = (val: string) => {
      const cleaned = val
        .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣぁ-んァ-ヶー一-龠·•-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length >= 2 && cleaned.length <= 35 && !isNoiseText(cleaned)) {
        if (!candidateList.includes(cleaned)) {
          candidateList.push(cleaned);
        }
      }
    };

    // Priority A: Quoted texts (e.g. "멘야무사시", '스타벅스', [도쿄 맛집])
    allLines.forEach(line => {
      const quoteMatches = line.match(/["'“「『\[]([^"'”」』\]]{2,30})["'”」』\]]/g);
      if (quoteMatches) {
        quoteMatches.forEach(q => {
          const inner = q.slice(1, -1).trim();
          addCandidate(inner);
        });
      }
    });

    // Priority B: Full non-noise lines
    allLines.forEach(line => {
      if (!isNoiseText(line)) {
        addCandidate(line);
      }
    });

    // Priority C: Meaningful words if lines are too long
    allLines.forEach(line => {
      if (!isNoiseText(line) && line.length > 20) {
        const segments = line.split(/[·•,\/|]\s*/);
        segments.forEach(seg => addCandidate(seg));
      }
    });

    const candidates = candidateList.slice(0, 12);

    // 2. Extract clean description / note text (excluding noise lines)
    const descLines = allLines
      .filter(line => line.length > 1 && !isNoiseText(line))
      .filter(line => !/^\d+$/.test(line));

    const descriptionText = descLines.join('\n').slice(0, 600).trim();

    return {
      fullText: rawText.trim(),
      candidates,
      descriptionText
    };
  } catch (err: any) {
    console.warn('[ocrHelper] OCR extraction error:', err);
    throw err;
  }
}
