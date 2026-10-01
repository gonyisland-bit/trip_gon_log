import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Edit, KeyRound, Search, Trash2 } from 'lucide-react';
import type { UserProfile } from '../../types';
import { UserProfileAvatar } from '../../components/UserProfileAvatar';
import { Chip } from '../../components/ui/Chip';
import { confirmDialog } from '../../utils/feedback';
import { personName } from '../../utils/personName';
import type { ManageHubState } from './useManageHubState';

// Members as a sheet (v1.3.6), built for hundreds of rows: one line per member, sortable columns,
// a search, filter chips, several rows at once for verify / restrict / lift / delete (one
// confirmation for the batch), CSV export, and a row that opens in place for one-off actions.
// Rows load 50 at a time on this screen; past a thousand members the list should page from the
// server (api/account) instead of reading every profile.

type SortKey = 'name' | 'createdAt' | 'lastActiveAt' | 'status';
type Filter = 'all' | 'pending' | 'rejected' | 'idle';

const DAY = 86400000;
const PAGE = 50;
const STATUS_LABEL: Record<string, string> = { pending: '인증 대기', approved: '이용 중', rejected: '이용 제한' };

const fmtDate = (ms?: number) => (ms ? new Date(ms).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '–');
function ago(ms?: number): string {
  if (!ms) return '기록 없음';
  const d = Math.floor((Date.now() - ms) / DAY);
  if (d <= 0) { const h = Math.floor((Date.now() - ms) / 3600000); return h <= 0 ? '방금' : `${h}시간 전`; }
  return d < 30 ? `${d}일 전` : fmtDate(ms);
}
const nameOf = (u: UserProfile) => personName(u) || u.username || u.email;
const statusOf = (u: UserProfile) => u.status || 'approved';

function toCsv(rows: UserProfile[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ['이름', '유저네임', '이메일', '가입일', '마지막 활동', '상태'];
  const lines = rows.map(u => [nameOf(u), u.username || '', u.email, u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
    u.lastActiveAt ? new Date(u.lastActiveAt).toISOString().slice(0, 10) : '', STATUS_LABEL[statusOf(u)] || statusOf(u)].map(v => esc(String(v))).join(','));
  return '﻿' + [head.join(','), ...lines].join('\n');
}

export function MembersTable({ s }: { s: ManageHubState }) {
  const {
    usersList, isTargetAdminAccount, setEditingUser, setIsUserEditModalOpen, setDelegatingUser, setIsDelegatingModalOpen,
    setPasswordResetTarget, handleVerifyUser, handleRejectUser, handleApproveUser, handleDeleteUserByAdmin,
  } = s;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'createdAt', dir: -1 });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);

  const members = useMemo(() => usersList.filter(u => !isTargetAdminAccount(u.email, u.role)), [usersList, isTargetAdminAccount]);
  const counts = useMemo(() => ({
    all: members.length,
    pending: members.filter(u => statusOf(u) === 'pending').length,
    rejected: members.filter(u => statusOf(u) === 'rejected').length,
    idle: members.filter(u => !u.lastActiveAt || Date.now() - u.lastActiveAt > 30 * DAY).length,
  }), [members]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members.filter(u => {
      if (filter === 'pending' && statusOf(u) !== 'pending') return false;
      if (filter === 'rejected' && statusOf(u) !== 'rejected') return false;
      if (filter === 'idle' && u.lastActiveAt && Date.now() - u.lastActiveAt <= 30 * DAY) return false;
      if (!q) return true;
      return [nameOf(u), u.username || '', u.email].some(v => v.toLowerCase().includes(q));
    });
    const val = (u: UserProfile): string | number => sort.key === 'name' ? nameOf(u) : sort.key === 'status' ? statusOf(u) : (u[sort.key] || 0);
    return list.sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * sort.dir;
    });
  }, [members, query, filter, sort]);

  const visible = rows.slice(0, shown);
  const pickedRows = rows.filter(u => picked.has(u.uid));
  const allOnPage = visible.length > 0 && visible.every(u => picked.has(u.uid));

  const toggle = (uid: string) => setPicked(prev => { const n = new Set(prev); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  const togglePage = () => setPicked(prev => { const n = new Set(prev); visible.forEach(u => (allOnPage ? n.delete(u.uid) : n.add(u.uid))); return n; });
  const sortBy = (key: SortKey) => setSort(prev => ({ key, dir: prev.key === key ? (prev.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }));

  // One confirmation for the whole batch, then each member in turn
  const runBatch = async (label: string, message: string, fn: (u: UserProfile) => Promise<void>, danger = false) => {
    if (!pickedRows.length || busy) return;
    if (!await confirmDialog(message, { title: label, confirmLabel: label, danger })) return;
    setBusy(true);
    for (const u of pickedRows) { try { await fn(u); } catch { /* the handler reports its own errors */ } }
    setBusy(false);
    setPicked(new Set());
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(pickedRows.length ? pickedRows : rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tripgon-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const Th = ({ k, children, className = '' }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th scope="col" className={`px-3 py-2 text-left ${className}`}>
      <button type="button" onClick={() => sortBy(k)} className="inline-flex items-center gap-1 font-mono text-micro font-bold uppercase tracking-wider text-black/55 dark:text-white/55 hover:text-ink dark:hover:text-ink-dark">
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="w-3 h-3" aria-hidden /> : <ArrowDown className="w-3 h-3" aria-hidden />)}
      </button>
    </th>
  );

  return (
    <section className="flex flex-col gap-3" aria-label="회원 목록">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-extrabold tracking-tight">회원 <span className="font-mono text-meta text-black/50 dark:text-white/50 tabular-nums">{members.length}</span></h3>
        <button type="button" onClick={exportCsv} className="btn btn-secondary btn-sm">
          <Download className="w-3.5 h-3.5" aria-hidden />CSV{pickedRows.length ? ` ${pickedRows.length}명` : ''}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="flex items-center gap-2 h-10 px-3 rounded-full border border-black/15 dark:border-white/15 sm:w-72">
          <Search className="w-4 h-4 text-black/50 dark:text-white/50 shrink-0" aria-hidden />
          <input id="members-search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="이름 · 유저네임 · 이메일" className="flex-1 min-w-0 bg-transparent outline-none text-[14px]" aria-label="회원 찾기" />
        </label>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          {([['all', '전체'], ['pending', '인증 대기'], ['rejected', '이용 제한'], ['idle', '30일 넘게 미접속']] as [Filter, string][]).map(([f, label]) => (
            <Chip key={f} size="sm" selected={filter === f} count={counts[f]} onClick={() => { setFilter(f); setShown(PAGE); }}>{label}</Chip>
          ))}
        </div>
      </div>

      {pickedRows.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-card bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark px-4 py-2.5">
          <span className="text-[13px] font-bold mr-auto">{pickedRows.length}명 선택</span>
          <button type="button" disabled={busy} className="btn btn-sm bg-white/15 hover:bg-white/25 text-inherit" onClick={() => runBatch('인증 처리', `${pickedRows.length}명의 메일 인증을 운영자가 대신 처리할까요?`, u => handleVerifyUser(u, true))}>인증 처리</button>
          <button type="button" disabled={busy} className="btn btn-sm bg-white/15 hover:bg-white/25 text-inherit" onClick={() => runBatch('제한 해제', `${pickedRows.length}명의 이용 제한을 풀까요?`, u => handleApproveUser(u))}>제한 해제</button>
          <button type="button" disabled={busy} className="btn btn-sm bg-white/15 hover:bg-white/25 text-inherit" onClick={() => runBatch('이용 제한', `${pickedRows.length}명의 이용을 제한할까요? 로그인하면 바로 로그아웃됩니다.`, u => handleRejectUser(u, true))}>이용 제한</button>
          <button type="button" disabled={busy} className="btn btn-danger btn-sm" onClick={() => runBatch('영구 삭제', `${pickedRows.length}명의 계정을 영구 삭제할까요? 프로필이 모두 지워지고 되돌릴 수 없습니다.`, u => handleDeleteUserByAdmin(u, true), true)}>삭제</button>
          <button type="button" className="btn btn-sm btn-ghost text-inherit" onClick={() => setPicked(new Set())}>선택 해제</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-card bg-surface dark:bg-surface-dark">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="border-b border-black/10 dark:border-white/10">
            <tr>
              <th scope="col" className="w-10 px-3 py-2">
                <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="보이는 회원 모두 선택" className="accent-red-600 w-4 h-4" />
              </th>
              <Th k="name">회원</Th>
              <th scope="col" className="px-3 py-2 text-left font-mono text-micro font-bold uppercase tracking-wider text-black/55 dark:text-white/55">이메일</th>
              <Th k="createdAt">가입</Th>
              <Th k="lastActiveAt">마지막 활동</Th>
              <Th k="status">상태</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => {
              const st = statusOf(u);
              const open = openUid === u.uid;
              const online = u.lastActiveAt && Date.now() - u.lastActiveAt < 3600000;
              return (
                <React.Fragment key={u.uid}>
                  <tr className={`border-b border-black/[0.06] dark:border-white/[0.08] cursor-pointer ${open ? 'bg-black/[0.03] dark:bg-white/[0.04]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'}`} onClick={() => setOpenUid(open ? null : u.uid)}>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={picked.has(u.uid)} onChange={() => toggle(u.uid)} aria-label={`${nameOf(u)} 선택`} className="accent-red-600 w-4 h-4" />
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2.5 min-w-0">
                        <UserProfileAvatar profile={u} size="sm" fallbackName={nameOf(u)} />
                        <span className="flex flex-col min-w-0">
                          <span className="font-bold truncate">{nameOf(u)}</span>
                          {u.username && <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">@{u.username}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-black/70 dark:text-white/70 max-w-[220px] truncate">{u.email}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-black/70 dark:text-white/70">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        {online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-label="접속 중" />}
                        {ago(u.lastActiveAt)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex h-6 px-2 items-center rounded-full text-micro font-bold ${
                        st === 'rejected' ? 'bg-red-600/10 text-red-700 dark:text-red-400' : st === 'pending' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                      }`}>{STATUS_LABEL[st] || st}</span>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04]">
                      <td />
                      <td colSpan={5} className="px-3 pb-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {st === 'pending' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleVerifyUser(u)}>인증 처리</button>}
                          {st === 'rejected'
                            ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleApproveUser(u)}>제한 해제</button>
                            : <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleRejectUser(u)}>이용 제한</button>}
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDelegatingUser(u); setIsDelegatingModalOpen(true); }}>여정 위임</button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditingUser(u); setIsUserEditModalOpen(true); }}><Edit className="w-3.5 h-3.5" aria-hidden />정보 수정</button>
                          <button type="button" className="btn btn-secondary btn-sm" disabled={!u.email} onClick={() => setPasswordResetTarget(u)}><KeyRound className="w-3.5 h-3.5" aria-hidden />비밀번호 재설정 메일</button>
                          <button type="button" className="btn btn-outline-danger btn-sm ml-auto" onClick={() => handleDeleteUserByAdmin(u)}><Trash2 className="w-3.5 h-3.5" aria-hidden />삭제</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-black/55 dark:text-white/55">{query ? '찾는 회원이 없습니다.' : '해당하는 회원이 없습니다.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > shown && (
        <button type="button" className="btn btn-secondary self-center" onClick={() => setShown(n => n + PAGE)}>
          {Math.min(PAGE, rows.length - shown)}명 더 보기 <span className="font-mono text-micro opacity-60">{shown} / {rows.length}</span>
        </button>
      )}
    </section>
  );
}
