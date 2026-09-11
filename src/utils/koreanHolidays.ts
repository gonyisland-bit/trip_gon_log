/**
 * 한국 공휴일 및 대체공휴일 자동 계산 유틸리티
 * (양력 고정 공휴일 + 음력 3대 명절 정밀 매핑 + 대체공휴일 규정 반영)
 */

export interface KoreanHoliday {
  date: string; // YYYY-MM-DD
  name: string; // 공휴일 명칭 (예: '설날', '추석 연휴', '삼일절', '대체공휴일')
  isHoliday: boolean;
}

// 음력 3대 명절 (설날 3일, 부처님오신날, 추석 3일) 양력 변환 테이블 (2020년 ~ 2035년)
const LUNAR_HOLIDAYS_TABLE: {
  [year: number]: {
    seollal: [string, string, string]; // [전날, 당일, 다음날] MM-DD
    buddha: string; // MM-DD
    chuseok: [string, string, string]; // [전날, 당일, 다음날] MM-DD
  };
} = {
  2020: {
    seollal: ['01-24', '01-25', '01-26'],
    buddha: '04-30',
    chuseok: ['09-30', '10-01', '10-02'],
  },
  2021: {
    seollal: ['02-11', '02-12', '02-13'],
    buddha: '05-19',
    chuseok: ['09-20', '09-21', '09-22'],
  },
  2022: {
    seollal: ['01-31', '02-01', '02-02'],
    buddha: '05-08',
    chuseok: ['09-09', '09-10', '09-11'],
  },
  2023: {
    seollal: ['01-21', '01-22', '01-23'],
    buddha: '05-27',
    chuseok: ['09-28', '09-29', '09-30'],
  },
  2024: {
    seollal: ['02-09', '02-10', '02-11'],
    buddha: '05-15',
    chuseok: ['09-16', '09-17', '09-18'],
  },
  2025: {
    seollal: ['01-28', '01-29', '01-30'],
    buddha: '05-05',
    chuseok: ['10-05', '10-06', '10-07'],
  },
  2026: {
    seollal: ['02-16', '02-17', '02-18'],
    buddha: '05-24',
    chuseok: ['09-24', '09-25', '09-26'],
  },
  2027: {
    seollal: ['02-05', '02-06', '02-07'],
    buddha: '05-13',
    chuseok: ['09-14', '09-15', '09-16'],
  },
  2028: {
    seollal: ['01-26', '01-27', '01-28'],
    buddha: '05-02',
    chuseok: ['10-02', '10-03', '10-04'],
  },
  2029: {
    seollal: ['02-12', '02-13', '02-14'],
    buddha: '05-20',
    chuseok: ['09-21', '09-22', '09-23'],
  },
  2030: {
    seollal: ['02-02', '02-03', '02-04'],
    buddha: '05-09',
    chuseok: ['09-11', '09-12', '09-13'],
  },
  2031: {
    seollal: ['01-22', '01-23', '01-24'],
    buddha: '05-28',
    chuseok: ['09-30', '10-01', '10-02'],
  },
  2032: {
    seollal: ['02-10', '02-11', '02-12'],
    buddha: '05-16',
    chuseok: ['09-18', '09-19', '09-20'],
  },
  2033: {
    seollal: ['01-30', '01-31', '02-01'],
    buddha: '05-06',
    chuseok: ['10-07', '10-08', '10-09'],
  },
  2034: {
    seollal: ['02-18', '02-19', '02-20'],
    buddha: '05-25',
    chuseok: ['09-26', '09-27', '09-28'],
  },
  2035: {
    seollal: ['02-07', '02-08', '02-09'],
    buddha: '05-15',
    chuseok: ['09-15', '09-16', '09-17'],
  },
};

// 양력 고정 공휴일 정의
const SOLAR_FIXED_HOLIDAYS: { [mmdd: string]: string } = {
  '01-01': '신정',
  '03-01': '3·1절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
};

// 대체공휴일 적용 대상 고정 공휴일 (현충일, 신정 제외)
const SUBSTITUTE_ELIGIBLE_SOLAR = new Set([
  '03-01', // 3·1절
  '05-05', // 어린이날
  '08-15', // 광복절
  '10-03', // 개천절
  '10-09', // 한글날
  '12-25', // 성탄절
]);

/**
 * 특정 날짜 문자열(YYYY-MM-DD)의 요일을 반환 (0: 일요일, 6: 토요일)
 */
function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * 날짜에 N일을 더한 YYYY-MM-DD 반환
 */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

/**
 * 연도(year)에 해당하는 모든 한국 공휴일 및 대체공휴일을 Map 형태로 반환
 * Key: 'YYYY-MM-DD'
 */
export function getKoreanHolidays(year: number): Map<string, KoreanHoliday> {
  const holidays = new Map<string, KoreanHoliday>();

  // 1. 양력 고정 공휴일 등록
  Object.entries(SOLAR_FIXED_HOLIDAYS).forEach(([mmdd, name]) => {
    const dateStr = `${year}-${mmdd}`;
    holidays.set(dateStr, { date: dateStr, name, isHoliday: true });
  });

  // 2. 음력 명절 등록 (설날, 부처님오신날, 추석)
  const lunarData = LUNAR_HOLIDAYS_TABLE[year];
  if (lunarData) {
    // 설날 (전날, 당일, 다음날)
    const [sEve, sDay, sNext] = lunarData.seollal;
    holidays.set(`${year}-${sEve}`, { date: `${year}-${sEve}`, name: '설날 연휴', isHoliday: true });
    holidays.set(`${year}-${sDay}`, { date: `${year}-${sDay}`, name: '설날', isHoliday: true });
    holidays.set(`${year}-${sNext}`, { date: `${year}-${sNext}`, name: '설날 연휴', isHoliday: true });

    // 부처님오신날
    const buddhaDate = `${year}-${lunarData.buddha}`;
    if (holidays.has(buddhaDate)) {
      // 만약 어린이날(5.5) 등과 겹치는 경우
      const existing = holidays.get(buddhaDate)!;
      holidays.set(buddhaDate, { date: buddhaDate, name: `${existing.name}·부처님오신날`, isHoliday: true });
    } else {
      holidays.set(buddhaDate, { date: buddhaDate, name: '부처님오신날', isHoliday: true });
    }

    // 추석 (전날, 당일, 다음날)
    const [cEve, cDay, cNext] = lunarData.chuseok;
    holidays.set(`${year}-${cEve}`, { date: `${year}-${cEve}`, name: '추석 연휴', isHoliday: true });
    holidays.set(`${year}-${cDay}`, { date: `${year}-${cDay}`, name: '추석', isHoliday: true });
    holidays.set(`${year}-${cNext}`, { date: `${year}-${cNext}`, name: '추석 연휴', isHoliday: true });
  }

  // 3. 대체공휴일(Substitute Holidays) 계산
  // A. 고정 양력 공휴일 (3·1절, 어린이날, 광복절, 개천절, 한글날, 성탄절) + 부처님오신날:
  //    토요일 또는 일요일과 겹칠 경우 다음 첫 번째 비공휴일을 대체공휴일로 지정
  SUBSTITUTE_ELIGIBLE_SOLAR.forEach((mmdd) => {
    const dateStr = `${year}-${mmdd}`;
    const dayOfWeek = getDayOfWeek(dateStr);
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 토 또는 일
      let subDate = addDays(dateStr, dayOfWeek === 6 ? 2 : 1);
      while (holidays.has(subDate)) {
        subDate = addDays(subDate, 1);
      }
      holidays.set(subDate, { date: subDate, name: '대체공휴일', isHoliday: true });
    }
  });

  // 부처님오신날 대체공휴일 (2023년부터 적용)
  if (lunarData) {
    const buddhaDate = `${year}-${lunarData.buddha}`;
    const dayOfWeek = getDayOfWeek(buddhaDate);
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      let subDate = addDays(buddhaDate, dayOfWeek === 6 ? 2 : 1);
      while (holidays.has(subDate)) {
        subDate = addDays(subDate, 1);
      }
      holidays.set(subDate, { date: subDate, name: '대체공휴일', isHoliday: true });
    }
  }

  // B. 설날 및 추석 연휴 대체공휴일:
  //    연휴 3일 중 일요일이나 다른 공휴일과 겹치는 경우, 연휴 다음 첫 번째 비공휴일을 대체공휴일로 지정
  if (lunarData) {
    // 설날 검사
    const seollalDates = lunarData.seollal.map(d => `${year}-${d}`);
    const hasSeollalSunOverlap = seollalDates.some(d => getDayOfWeek(d) === 0);
    if (hasSeollalSunOverlap) {
      let subDate = addDays(seollalDates[2], 1);
      while (holidays.has(subDate)) {
        subDate = addDays(subDate, 1);
      }
      holidays.set(subDate, { date: subDate, name: '대체공휴일', isHoliday: true });
    }

    // 추석 검사
    const chuseokDates = lunarData.chuseok.map(d => `${year}-${d}`);
    const hasChuseokSunOverlap = chuseokDates.some(d => getDayOfWeek(d) === 0);
    // 개천절(10.03) 등 다른 고정 공휴일과 겹치는 경우도 대체공휴일 대상
    const hasOtherHolidayOverlap = chuseokDates.some(d => SOLAR_FIXED_HOLIDAYS[d.slice(5)]);
    if (hasChuseokSunOverlap || hasOtherHolidayOverlap) {
      let subDate = addDays(chuseokDates[2], 1);
      while (holidays.has(subDate)) {
        subDate = addDays(subDate, 1);
      }
      holidays.set(subDate, { date: subDate, name: '대체공휴일', isHoliday: true });
    }
  }

  return holidays;
}

/**
 * 특정 날짜(YYYY-MM-DD 또는 YYYY.MM.DD)의 공휴일 정보를 조회
 */
export function getHolidayInfo(dateStr: string): KoreanHoliday | null {
  if (!dateStr) return null;
  const normalized = dateStr.replace(/\./g, '-');
  const [yStr] = normalized.split('-');
  const year = parseInt(yStr, 10);
  if (isNaN(year)) return null;

  const holidays = getKoreanHolidays(year);
  return holidays.get(normalized) || null;
}
