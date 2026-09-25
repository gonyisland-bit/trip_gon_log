/**
 * OCR Helper for extracting text (such as restaurant/spot names) from feed images
 * Useful when Instagram/Threads posts have place names inside carousel card images rather than text caption.
 */

export interface OcrResult {
  fullText: string;
  candidates: string[];
}

/**
 * Extracts visible text from an image URL using OCR Space free REST API.
 */
export async function extractTextFromImageUrl(
  imageUrl: string,
  language: 'kor' | 'eng' | 'jpn' = 'kor'
): Promise<OcrResult> {
  if (!imageUrl || !imageUrl.trim()) {
    return { fullText: '', candidates: [] };
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
      return { fullText: '', candidates: [] };
    }

    const rawText: string = parsedResults[0]?.ParsedText || '';
    const cleanLines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length >= 2 && !/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()]+$/.test(line))
      // Filter out overly long noise sentences, keep spot-like lines
      .map(line => line.replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣぁ-んァ-ヶー一-龠·•-]/g, '').trim())
      .filter(line => line.length >= 2 && line.length <= 40);

    // Deduplicate candidates
    const candidates = Array.from(new Set(cleanLines)).slice(0, 8);

    return {
      fullText: rawText.trim(),
      candidates
    };
  } catch (err: any) {
    console.warn('[ocrHelper] OCR extraction error:', err);
    throw err;
  }
}
