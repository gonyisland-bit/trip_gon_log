import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { migrateToOwnContent } from '../../utils/ownContentMigration';
import { confirmDialog, notify } from '../../utils/feedback';

// Operator tool (v1.3.6 phase 3): one press moves the shared content to owners before the new
// Firestore rules are published. Safe to press again.
export function OwnContentMigrationCard() {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  const run = async () => {
    const ok = await confirmDialog(
      '기존 여정 · 플랜 · 일정에 주인과 열람자를 붙이고, 포켓 · 위시리스트 · 캘린더 · 매거진을 내 문서로 복사합니다. 지우는 데이터는 없고 다시 눌러도 안전합니다.',
      { title: 'DATA MOVE', confirmLabel: '이전 시작' },
    );
    if (!ok) return;
    setRunning(true);
    setLines([]);
    try {
      await migrateToOwnContent(line => setLines(prev => [...prev, line]));
      notify('데이터 이전을 마쳤습니다. 새 Firestore 규칙을 게시해 주세요.', 'success');
    } catch (err: any) {
      console.error('Own content migration failed:', err);
      setLines(prev => [...prev, `실패: ${err?.message || err}`]);
      notify('데이터 이전 중 오류가 났습니다. 다시 눌러 이어서 진행할 수 있습니다.', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-card bg-surface dark:bg-surface-dark p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-mono text-micro font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">v1.3.6 · 본인 콘텐츠</span>
          <h3 className="text-base font-extrabold">데이터 이전</h3>
          <p className="text-meta text-black/60 dark:text-white/60">새 규칙을 게시하기 전에 한 번 눌러 주세요.</p>
        </div>
        <button type="button" onClick={run} disabled={running} className="btn btn-primary">
          {running && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          {running ? '이전 중' : '이전 시작'}
        </button>
      </div>
      {lines.length > 0 && (
        <ul className="font-mono text-meta text-black/70 dark:text-white/70 flex flex-col gap-1" aria-live="polite">
          {lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </section>
  );
}
