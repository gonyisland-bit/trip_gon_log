/**
 * 정렬 순서 단일 소스 원칙 (Single Source of Truth) 헬퍼
 * 
 * 정렬 규칙:
 * 1. 로컬스토리지 journey_order에 사용자 지정 순서가 있으면 우선 반영.
 * 2. 신규 생성 여정 등 journey_order에 아직 등록되지 않은 최신 항목은 무조건 최상단(맨 앞)에 배치.
 * 3. 둘 다 미지정 시 displayOrder 오름차순, displayOrder도 같으면 id(생성시각) 최신순으로 맨 앞에 배치.
 */
export function sortJourneysByOrder<T extends { id: number; displayOrder?: number }>(
  items: T[],
  customOrderIds?: number[]
): T[] {
  if (!items || items.length === 0) return [];

  let order: number[] | null = customOrderIds || null;
  if (!order) {
    try {
      const saved = localStorage.getItem('journey_order');
      if (saved) {
        order = JSON.parse(saved);
      }
    } catch (_) {}
  }

  // 1. 순서 배열이 있는 경우
  if (order && Array.isArray(order) && order.length > 0) {
    const idMap = new Map<number, number>(order.map((id, idx) => [id, idx]));
    return [...items].sort((a, b) => {
      const idxA = idMap.has(a.id) ? idMap.get(a.id)! : -1;
      const idxB = idMap.has(b.id) ? idMap.get(b.id)! : -1;

      // 0순위 항목은 어떤 경우에도 무조건 최상단(맨 앞)에 배치
      if (idxA === 0) return -1;
      if (idxB === 0) return 1;

      // 둘 다 저장된 순서가 있는 경우: order 인덱스 오름차순 (0, 1, 2...)
      if (idxA !== -1 && idxB !== -1) {
        return idxA - idxB;
      }

      // a만 order에 있는 경우: order 항목이 미등록 항목보다 우선
      if (idxA !== -1 && idxB === -1) {
        return -1;
      }
      // b만 order에 있는 경우: b가 우선
      if (idxA === -1 && idxB !== -1) {
        return 1;
      }

      // 둘 다 order에 없는 경우: displayOrder 비교 후 생성 시각(id) 최신순
      const orderA = a.displayOrder !== undefined ? a.displayOrder : 999999;
      const orderB = b.displayOrder !== undefined ? b.displayOrder : 999999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return b.id - a.id;
    });
  }

  // 2. 순서 배열이 없는 경우: displayOrder 기준 (둘 다 없거나 같으면 최신 id 우선)
  return [...items].sort((a, b) => {
    const orderA = a.displayOrder !== undefined ? a.displayOrder : 999999;
    const orderB = b.displayOrder !== undefined ? b.displayOrder : 999999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return b.id - a.id;
  });
}
