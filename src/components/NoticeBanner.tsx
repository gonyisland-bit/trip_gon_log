import React, { useEffect, useState } from 'react';
import { Info, Wrench, X } from 'lucide-react';
import { EMPTY_NOTICE, noticeLive, subscribeNotice, type SiteNotice } from '../utils/notice';

// The operator's site notice above every page (v1.3.7). Maintenance stays; info can be closed, and
// stays closed on this device until the operator changes the message (v1.3.8; it used to come back
// with every new session).
export function NoticeBanner() {
  const [n, setN] = useState<SiteNotice>(EMPTY_NOTICE);
  const [closed, setClosed] = useState<string | null>(() => { try { return localStorage.getItem('tgl_notice_closed'); } catch { return null; } });
  useEffect(() => subscribeNotice(setN), []);
  if (!noticeLive(n)) return null;
  const key = `${n.updatedAt || 0}`;
  if (n.level === 'info' && closed === key) return null;
  const maint = n.level === 'maintenance';
  const Icon = maint ? Wrench : Info;
  return (
    <div role={maint ? 'alert' : 'status'} className={`w-full px-4 py-2 flex items-center justify-center gap-2 text-[13px] font-bold ${maint ? 'bg-red-600 text-white' : 'bg-butter text-butter-ink'}`}>
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="min-w-0 break-keep text-center">{n.message}</span>
      {n.until ? <span className="font-mono text-micro opacity-75 shrink-0 hidden sm:inline">~ {new Date(n.until).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> : null}
      {!maint && (
        <button
          type="button"
          onClick={() => { setClosed(key); try { localStorage.setItem('tgl_notice_closed', key); } catch { /* closed until the page reloads */ } }}
          aria-label="공지 닫기"
          className="w-7 h-7 rounded-full grid place-items-center shrink-0 hover:bg-black/10"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
