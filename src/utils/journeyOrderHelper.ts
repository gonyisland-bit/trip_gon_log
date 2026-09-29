/**
 * 여정 정렬 단일 소스: Firestore에 저장된 displayOrder (모든 기기가 같은 순서를 봄).
 *
 * 1. customOrderIds가 주어지면 그 순서를 우선(목록에 없는 항목은 뒤, displayOrder 순).
 * 2. displayOrder 오름차순, 같으면 id(생성 시각) 최신순.
 *
 * 예전에는 기기별 localStorage `journey_order`를 우선해 기기마다 순서가 달랐습니다.
 * 그 값은 더 이상 읽지 않으며, 남아 있으면 지웁니다.
 */
try { localStorage.removeItem('journey_order'); } catch (_) {}

function byDisplayOrder(a: { id: number; displayOrder?: number }, b: { id: number; displayOrder?: number }): number {
  const orderA = a.displayOrder ?? 999999;
  const orderB = b.displayOrder ?? 999999;
  if (orderA !== orderB) return orderA - orderB;
  return b.id - a.id;
}

export function sortJourneysByOrder<T extends { id: number; displayOrder?: number }>(
  items: T[],
  customOrderIds?: number[]
): T[] {
  if (!items || items.length === 0) return [];
  if (!customOrderIds?.length) return [...items].sort(byDisplayOrder);
  const idMap = new Map<number, number>(customOrderIds.map((id, idx) => [id, idx]));
  return [...items].sort((a, b) => {
    const idxA = idMap.get(a.id);
    const idxB = idMap.get(b.id);
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return byDisplayOrder(a, b);
  });
}

/** Order after putting `newId` in front: every other journey moves back one place */
export function orderWithNewFirst<T extends { id: number; displayOrder?: number }>(items: T[], newId: number): number[] {
  return [newId, ...sortJourneysByOrder(items).map(j => j.id).filter(id => id !== newId)];
}
