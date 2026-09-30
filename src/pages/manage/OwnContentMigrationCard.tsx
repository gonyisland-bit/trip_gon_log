import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { clearContactDetails, migrateToOwnContent } from '../../utils/ownContentMigration';
import { confirmDialog, notify } from '../../utils/feedback';
import { connectFamily, personCard } from '../../utils/friends';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '../../types';

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

  const clearContacts = async () => {
    const ok = await confirmDialog('모든 회원 프로필에 남아 있는 생일 · 전화번호를 지웁니다. 되돌릴 수 없습니다.', { title: 'CLEAR CONTACTS', confirmLabel: '지우기', danger: true });
    if (!ok) return;
    setRunning(true);
    try {
      const n = await clearContactDetails();
      setLines(prev => [...prev, `생일 · 전화번호를 지운 회원: ${n}명`]);
      notify('생일 · 전화번호를 지웠습니다.', 'success');
    } catch (err: any) {
      console.error('Contact cleanup failed:', err);
      notify('지우지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setRunning(false);
    }
  };

  // 5-a: members who already read the operator's journeys become the operator's friends
  const linkFamily = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const ok = await confirmDialog('지금 내 여정을 보고 있는 회원을 모두 친구로 연결합니다. 이미 친구인 회원은 건너뜁니다.', { title: 'FAMILY', confirmLabel: '친구로 연결' });
    if (!ok) return;
    setRunning(true);
    try {
      const prof = await getDoc(doc(db, 'users', user.uid));
      const n = await connectFamily(personCard(user.uid, prof.exists() ? prof.data() as UserProfile : null, user.displayName));
      setLines(prev => [...prev, `친구로 연결한 회원: ${n}명`]);
      notify(n ? `${n}명과 친구가 되었습니다.` : '새로 연결할 회원이 없습니다.', 'success');
    } catch (err: any) {
      console.error('Family connect failed:', err);
      notify('친구로 연결하지 못했습니다. 새 규칙이 게시됐는지 확인해 주세요.', 'error');
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
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={linkFamily} disabled={running} className="btn btn-secondary">가족 친구 연결</button>
          <button type="button" onClick={clearContacts} disabled={running} className="btn btn-outline-danger">생일 · 전화번호 지우기</button>
          <button type="button" onClick={run} disabled={running} className="btn btn-primary">
            {running && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {running ? '진행 중' : '이전 시작'}
          </button>
        </div>
      </div>
      {lines.length > 0 && (
        <ul className="font-mono text-meta text-black/70 dark:text-white/70 flex flex-col gap-1" aria-live="polite">
          {lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </section>
  );
}
