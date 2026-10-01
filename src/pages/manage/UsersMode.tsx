import { Save, Trash2, Check, Search, ShieldCheck, Edit, Users, Mail, KeyRound } from 'lucide-react';
import { Trip } from '../../types';
import { UserProfileAvatar } from '../../components/UserProfileAvatar';
import { ConfirmModal } from '../../components/ConfirmModal';
import type { ManageHubState } from './useManageHubState';
import { OwnContentMigrationCard } from './OwnContentMigrationCard';
import { MembersTable } from './MembersTable';

export function UsersMode({ s }: { s: ManageHubState }) {
  const {
    usersList, userSearchQuery, setUserSearchQuery, setEditingUser, setIsUserEditModalOpen,
    setDelegatingUser, setIsDelegatingModalOpen, userActionToast, currentAdminEmail,
    newAdminEmailInput, setNewAdminEmailInput, adminEmailSaving, userFilterStatus,
    setUserFilterStatus, userCurrentPage, setUserCurrentPage, USERS_PER_PAGE, isTargetAdminAccount,
    handleUpdateAdminEmail, handleApproveUser, handleVerifyUser, handleRejectUser, handleDeleteUserByAdmin,
    handleToggleUserPermission, title, handleContainerScroll,
    passwordResetTarget, setPasswordResetTarget, handleSendPasswordReset
  } = s;

  return (
    <div
      onScroll={handleContainerScroll}
      className="w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100dvh-60px)] animate-in fade-in duration-200"
    >
      {/* Header */}
      <div className="flex flex-col gap-1 border-b-2 border-black dark:border-white pb-4">
        <div className="flex items-center justify-between">
          <span className="text-micro font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
            REGISTERED USERS & PERMISSIONS MANAGEMENT
          </span>
          <span className="text-meta font-mono px-2 py-0.5 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark uppercase font-bold">
            TOTAL: {usersList.length}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
          USERS
        </h2>
        <p className="text-xs text-black/60 dark:text-white/60 font-mono">
          [가입 회원 목록 조회, 개인정보 수정, 이용 제한 및 특정 여정 편집 위임 관리]
        </p>
      </div>

      <OwnContentMigrationCard />

      {/* Action Toast */}
      {userActionToast && (
        <div className="p-3 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>{userActionToast}</span>
        </div>
      )}

      {/* Admin Account Configuration Panel (Swiss Minimal) */}
      <div className="border border-black/20 dark:border-white/20 p-4 sm:p-5 flex flex-col gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-black dark:text-white" />
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black dark:text-white">
              SUPER ADMIN ACCOUNT CONFIG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-meta font-mono text-black/60 dark:text-white/60 uppercase">CURRENT:</span>
            <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 border border-red-500/30">
              {currentAdminEmail}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/60 dark:text-white/60" />
            <input
              type="email"
              value={newAdminEmailInput}
              onChange={e => setNewAdminEmailInput(e.target.value)}
              placeholder="새 관리자 이메일 주소 입력 (가입 승인 메일 수신처)..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
            />
          </div>
          <button
            type="button"
            onClick={handleUpdateAdminEmail}
            disabled={adminEmailSaving || !newAdminEmailInput.trim()}
            className="btn btn-primary flex"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{adminEmailSaving ? 'SAVING...' : 'UPDATE EMAIL'}</span>
          </button>
        </div>
      </div>

      {/* 1. ADMINISTRATORS SECTION (Separated Top View) */}
      {(() => {
        const adminsList = usersList.filter(u => isTargetAdminAccount(u.email, u.role));
        if (adminsList.length === 0) return null;

        return (
          <div className="flex flex-col border border-black/20 dark:border-white/20 p-4 sm:p-5 gap-3 bg-black/[0.015] dark:bg-white/[0.015]">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black dark:text-white">
                  ADMINISTRATORS ({adminsList.length})
                </span>
              </div>
              <span className="text-meta font-mono text-black/60 dark:text-white/60">
                최고 관리자 및 서브 관리자 계정 그룹
              </span>
            </div>

            <div className="divide-y divide-black/10 dark:divide-white/10 border border-black/10 dark:border-white/10 bg-surface dark:bg-surface-dark">
              {adminsList.map((adminUser) => {
                const isSuper = adminUser.email?.toLowerCase() === 'gonyisland@naver.com';
                const fullName = `${adminUser.lastName} ${adminUser.firstName}`.trim() || '관리자';
                const isOnline = adminUser.lastActiveAt && (Date.now() - adminUser.lastActiveAt < 60 * 60 * 1000);

                return (
                  <div key={adminUser.uid} className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Avatar & Admin Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <UserProfileAvatar profile={adminUser} size="md" fallbackName={fullName} />
                        {isOnline && (
                          <span 
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161616] animate-pulse" 
                            title="최근 1시간 내 활동 중 (ONLINE)"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                            {fullName}
                          </span>
                          {adminUser.username && (
                            <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                              @{adminUser.username}
                            </span>
                          )}
                          <span className="text-xs font-mono text-black/60 dark:text-white/60">
                            ({adminUser.email})
                          </span>
                          {isSuper ? (
                            <span className="px-2 py-0.5 text-micro font-mono font-extrabold uppercase tracking-wider bg-red-600 text-white leading-none">
                              SUPER ADMIN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-micro font-mono font-extrabold uppercase tracking-wider bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark leading-none">
                              ADMIN
                            </span>
                          )}
                          {isOnline && (
                            <span className="px-1.5 py-0.2 text-micro font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 leading-none">
                              ONLINE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-meta font-mono text-black/60 dark:text-white/60 flex-wrap">
                          <span>가입: {adminUser.createdAt ? new Date(adminUser.createdAt).toLocaleDateString() : '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Permission Toggles & Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
                      {/* Edit Info Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(adminUser);
                          setIsUserEditModalOpen(true);
                        }}
                        className="tap-target p-1.5 border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black transition-colors cursor-pointer"
                        title="관리자 정보 수정"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 2. Members as a sheet: search, filters, sorting, batch actions, CSV (MembersTable) */}
      <MembersTable s={s} />

      <ConfirmModal
        isOpen={Boolean(passwordResetTarget)}
        title="SEND PASSWORD RESET"
        message={`${passwordResetTarget?.email || ''} 주소로 비밀번호 재설정 메일을 보내시겠습니까? 회원이 메일의 링크에서 새 비밀번호를 정합니다.`}
        confirmLabel="메일 보내기"
        cancelLabel="취소"
        iconType="info"
        confirmVariant="black"
        onConfirm={handleSendPasswordReset}
        onCancel={() => setPasswordResetTarget(null)}
      />
    </div>
  );
}
