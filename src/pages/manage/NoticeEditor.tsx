import React, { useEffect, useState } from 'react';
import { Segment } from '../../components/ui/Segment';
import { DEFAULT_WELCOME, EMPTY_NOTICE, WELCOME_DAYS, saveNotice, saveWelcome, subscribeNotice, type SiteNotice, type WelcomeNotice } from '../../utils/notice';
import { notify } from '../../utils/feedback';

// SYSTEM → 공지 (v1.3.7): the site notice everyone sees above the page, including a maintenance mode.
const toLocal = (ms?: number) => {
  if (!ms) return '';
  const d = new Date(ms - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

export function NoticeEditor() {
  const [n, setN] = useState<SiteNotice>(EMPTY_NOTICE);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => subscribeNotice(v => { if (!loaded) { setN(v); setLoaded(true); } }), [loaded]);

  const save = async () => {
    setSaving(true);
    try { await saveNotice(n); notify(n.on ? '공지를 올렸습니다.' : '공지를 내렸습니다.', 'success'); }
    catch { notify('공지를 저장하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <section className="rounded-card bg-surface dark:bg-surface-dark p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55">Site notice</span>
          <span className="text-[15px] font-extrabold">모든 화면 위 공지</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={n.on}
          aria-label="공지 켜기"
          onClick={() => setN({ ...n, on: !n.on })}
          className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${n.on ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform ${n.on ? 'translate-x-4' : ''}`} />
        </button>
      </div>
      <Segment<SiteNotice['level']>
        block
        ariaLabel="공지 종류"
        value={n.level}
        onChange={(level) => setN({ ...n, level })}
        options={[{ value: 'info', label: '안내 (닫을 수 있음)' }, { value: 'maintenance', label: '점검 (닫을 수 없음)' }]}
      />
      <input
        id="notice-message"
        value={n.message}
        maxLength={200}
        onChange={(e) => setN({ ...n, message: e.target.value })}
        placeholder={n.level === 'maintenance' ? '10월 3일 02:00–04:00 서버 점검으로 저장이 잠시 멈춥니다.' : '새 기능: 친구에게 메모를 남길 수 있어요.'}
        className="h-11 px-4 rounded-full border border-black/15 dark:border-white/15 bg-transparent text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        aria-label="공지 문구"
      />
      <label className="flex items-center gap-3 text-[14px]">
        <span className="font-bold shrink-0">자동으로 내릴 시각</span>
        <input
          id="notice-until"
          type="datetime-local"
          value={toLocal(n.until)}
          onChange={(e) => setN({ ...n, until: e.target.value ? new Date(e.target.value).getTime() : 0 })}
          className="h-10 px-3 rounded-full border border-black/15 dark:border-white/15 bg-transparent text-[13px]"
        />
      </label>
      <button type="button" onClick={save} disabled={saving} className="btn btn-primary self-start">{saving ? '저장 중' : '저장'}</button>
    </section>
  );
}

// SYSTEM → 신규 가입 환영: an automatic line for members in their first days. {name} is replaced.
export function WelcomeEditor() {
  const [w, setW] = useState<WelcomeNotice>(DEFAULT_WELCOME);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => subscribeNotice(v => { if (!loaded) { setW({ ...DEFAULT_WELCOME, ...(v.welcome || {}) }); setLoaded(true); } }), [loaded]);

  const save = async () => {
    setSaving(true);
    try { await saveWelcome(w); notify(w.on ? '환영 공지를 켰습니다.' : '환영 공지를 껐습니다.', 'success'); }
    catch { notify('환영 공지를 저장하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <section className="rounded-card bg-surface dark:bg-surface-dark p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55">Welcome</span>
          <span className="text-[15px] font-extrabold">신규 가입 환영</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={w.on}
          aria-label="환영 공지 켜기"
          onClick={() => setW({ ...w, on: !w.on })}
          className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${w.on ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform ${w.on ? 'translate-x-4' : ''}`} />
        </button>
      </div>
      <input
        id="welcome-message"
        value={w.message}
        maxLength={200}
        onChange={(e) => setW({ ...w, message: e.target.value })}
        placeholder={DEFAULT_WELCOME.message}
        className="h-11 px-4 rounded-full border border-black/15 dark:border-white/15 bg-transparent text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        aria-label="환영 공지 문구"
      />
      <span className="text-meta text-black/55 dark:text-white/55 break-keep">{'{name}'}은 회원 이름으로 바뀝니다. 회원이 닫으면 그 계정에선 다시 뜨지 않고, 문구를 바꾸면 기간 안의 회원에게 한 번 더 뜹니다.</span>
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-bold">가입 후 보여 줄 기간</span>
        <Segment<string>
          block
          size="sm"
          ariaLabel="가입 후 보여 줄 기간"
          value={String(w.days)}
          onChange={(v) => setW({ ...w, days: Number(v) })}
          options={WELCOME_DAYS.map(d => ({ value: String(d), label: `${d}일` }))}
        />
      </div>
      <button type="button" onClick={save} disabled={saving} className="btn btn-primary self-start">{saving ? '저장 중' : '저장'}</button>
    </section>
  );
}
