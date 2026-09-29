import { Save, Trash2, Check, Search, ShieldCheck, Edit, Users, Mail, KeyRound } from 'lucide-react';
import { Trip } from '../../types';
import { UserProfileAvatar } from '../../components/UserProfileAvatar';
import { ConfirmModal } from '../../components/ConfirmModal';
import type { ManageHubState } from './useManageHubState';

export function UsersMode({ s }: { s: ManageHubState }) {
  const {
    usersList, userSearchQuery, setUserSearchQuery, setEditingUser, setIsUserEditModalOpen,
    setDelegatingUser, setIsDelegatingModalOpen, userActionToast, currentAdminEmail,
    newAdminEmailInput, setNewAdminEmailInput, adminEmailSaving, userFilterStatus,
    setUserFilterStatus, userCurrentPage, setUserCurrentPage, USERS_PER_PAGE, isTargetAdminAccount,
    handleUpdateAdminEmail, handleApproveUser, handleRejectUser, handleDeleteUserByAdmin,
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
          [가입 유저 목록 조회, 개인정보 수정, 생성/편집/삭제 권한 개별 토글 및 특정 여정 편집 위임 관리]
        </p>
      </div>

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
                          {adminUser.phone && <span>전화: {adminUser.phone}</span>}
                          <span>가입: {adminUser.createdAt ? new Date(adminUser.createdAt).toLocaleDateString() : '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Permission Toggles & Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
                      {/* 3 Permission Toggles: Create / Edit / Delete */}
                      <div className="flex items-center gap-1 border border-black/15 dark:border-white/15 p-1 bg-black/[0.02] dark:bg-white/[0.02]">
                        <button
                          type="button"
                          disabled={isSuper}
                          onClick={() => handleToggleUserPermission(adminUser, 'canCreate')}
                          className={`px-2 py-1 text-meta font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            adminUser.permissions?.canCreate
                              ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold'
                              : 'text-black/60 dark:text-white/60 hover:text-black'
                          }`}
                          title="여정 생성(추가) 권한 토글"
                        >
                          추가 {adminUser.permissions?.canCreate ? 'ON' : 'OFF'}
                        </button>

                        <button
                          type="button"
                          disabled={isSuper}
                          onClick={() => handleToggleUserPermission(adminUser, 'canEdit')}
                          className={`px-2 py-1 text-meta font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            adminUser.permissions?.canEdit
                              ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold'
                              : 'text-black/60 dark:text-white/60 hover:text-black'
                          }`}
                          title="전체 여정 편집 권한 토글"
                        >
                          편집 {adminUser.permissions?.canEdit ? 'ON' : 'OFF'}
                        </button>

                        <button
                          type="button"
                          disabled={isSuper}
                          onClick={() => handleToggleUserPermission(adminUser, 'canDelete')}
                          className={`px-2 py-1 text-meta font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            adminUser.permissions?.canDelete
                              ? 'bg-red-600 text-white font-extrabold'
                              : 'text-black/60 dark:text-white/60 hover:text-black'
                          }`}
                          title="여정 삭제 권한 토글"
                        >
                          삭제 {adminUser.permissions?.canDelete ? 'ON' : 'OFF'}
                        </button>
                      </div>

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

      {/* 2. REGULAR USERS SECTION (Filtered, Paginated 20 per page) */}
      {(() => {
        const regularUsers = usersList.filter(u => !isTargetAdminAccount(u.email, u.role));

        const filteredUsers = regularUsers.filter(u => {
          if (userFilterStatus === 'PENDING' && u.status !== 'pending') return false;
          if (userFilterStatus === 'APPROVED' && u.status !== 'approved') return false;

          if (!userSearchQuery.trim()) return true;
          const q = userSearchQuery.toLowerCase();
          const name = `${u.lastName} ${u.firstName}`.toLowerCase();
          return name.includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));
        });

        const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
        const safePage = Math.min(Math.max(userCurrentPage, 1), totalPages);
        const paginatedUsers = filteredUsers.slice((safePage - 1) * USERS_PER_PAGE, safePage * USERS_PER_PAGE);

        return (
          <div className="flex flex-col gap-4">
            {/* Filter Tabs & Search Bar (Swiss Minimal) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Filter Buttons: ALL / PENDING / APPROVED */}
              <div className="flex items-center border border-black/20 dark:border-white/20 p-0.5 bg-black/5 dark:bg-white/5 shrink-0">
                {(['ALL', 'PENDING', 'APPROVED'] as const).map(filterKey => {
                  const count = filterKey === 'ALL'
                    ? regularUsers.length
                    : filterKey === 'PENDING'
                    ? regularUsers.filter(u => u.status === 'pending').length
                    : regularUsers.filter(u => u.status === 'approved').length;
                  const isActive = userFilterStatus === filterKey;
                  const label = filterKey === 'ALL' ? 'ALL' : filterKey === 'PENDING' ? 'PENDING' : 'APPROVED';

                  return (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => {
                        setUserFilterStatus(filterKey);
                        setUserCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark shadow-xs'
                          : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`text-micro px-1.5 py-0.5 font-mono leading-none ${
                        isActive 
                          ? (filterKey === 'PENDING' && count > 0 ? 'bg-red-600 text-white font-bold' : 'bg-white/20 dark:bg-black/20 text-white dark:text-black')
                          : (filterKey === 'PENDING' && count > 0 ? 'bg-red-600 text-white font-bold animate-pulse' : 'text-black/60 dark:text-white/60')
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/60 dark:text-white/60" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={e => {
                    setUserSearchQuery(e.target.value);
                    setUserCurrentPage(1);
                  }}
                  placeholder="일반 유저 검색 (이름, 이메일, 전화번호)..."
                  className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
                />
              </div>
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setUserSearchQuery('');
                    setUserCurrentPage(1);
                  }}
                  className="btn btn-secondary shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Users List Table */}
            <div className="flex flex-col border border-black/20 dark:border-white/20 divide-y divide-black/10 dark:divide-white/10 bg-surface dark:bg-surface-dark">
              {paginatedUsers.map((user) => {
                const isPending = user.status === 'pending';
                const fullName = `${user.lastName} ${user.firstName}`.trim() || '미등록';
                const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';
                const isOnline = user.lastActiveAt && (Date.now() - user.lastActiveAt < 60 * 60 * 1000);

                return (
                  <div key={user.uid} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                    {/* Left: 1x1 Avatar & User Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <UserProfileAvatar profile={user} size="lg" fallbackName={fullName} />
                        {isOnline && (
                          <span 
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161616] animate-pulse" 
                            title="최근 1시간 내 활동 중 (ONLINE)"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                            {fullName}
                          </span>
                          {user.username && (
                            <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                              @{user.username}
                            </span>
                          )}
                          <span className="text-xs font-mono text-black/60 dark:text-white/60">
                            ({user.email})
                          </span>
                          {user.status === 'rejected' ? (
                            <span className="px-2 py-0.5 text-micro font-mono font-extrabold uppercase tracking-wider bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 leading-none">
                              REJECTED
                            </span>
                          ) : isPending ? (
                            <span className="px-2 py-0.5 text-micro font-mono font-bold uppercase tracking-wider border border-red-600 text-red-600 dark:text-red-400 bg-red-500/10 leading-none animate-pulse">
                              PENDING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-micro font-mono font-bold uppercase tracking-wider border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 leading-none">
                              USER
                            </span>
                          )}
                          {isOnline && (
                            <span className="px-1.5 py-0.2 text-micro font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 leading-none">
                              ONLINE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] font-mono text-black/60 dark:text-white/60 flex-wrap">
                          {user.phone && <span>전화: {user.phone}</span>}
                          {user.birthdate && <span>생일: {user.birthdate}</span>}
                          <span>가입일: {joinDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
                      {/* If Pending: Show Instant Approve / Reject Buttons First */}
                      {isPending && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveUser(user)}
                            className="px-3 py-1.5 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark hover:bg-emerald-600 dark:hover:bg-emerald-600 dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            APPROVE
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectUser(user)}
                            className="btn btn-outline-danger btn-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {/* 3 Permission Toggles: Create / Edit / Delete */}
                      <div className="flex items-center gap-1 border border-black/15 dark:border-white/15 p-1 bg-black/[0.02] dark:bg-white/[0.02]">
                        {/* Create Permission Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleUserPermission(user, 'canCreate')}
                          className={`px-2 py-1 text-meta font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            user.permissions?.canCreate
                              ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold'
                              : 'text-black/60 dark:text-white/60 hover:text-black'
                          }`}
                          title="여정 생성(추가) 권한 토글"
                        >
                          추가 {user.permissions?.canCreate ? 'ON' : 'OFF'}
                        </button>

                        {/* Edit Permission Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleUserPermission(user, 'canEdit')}
                          className={`px-2 py-1 text-meta font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            user.permissions?.canEdit
                              ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold'
                              : 'text-black/60 dark:text-white/60 hover:text-black'
                          }`}
                          title="전체 여정 편집 권한 토글"
                        >
                          편집 {user.permissions?.canEdit ? 'ON' : 'OFF'}
                        </button>

                        {/* Delete Permission Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleUserPermission(user, 'canDelete')}
                          className={`px-2 py-1 text-meta font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            user.permissions?.canDelete
                              ? 'bg-red-600 text-white font-extrabold'
                              : 'text-black/60 dark:text-white/60 hover:text-black'
                          }`}
                          title="여정 삭제 권한 토글"
                        >
                          삭제 {user.permissions?.canDelete ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Delegate Trip Access Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDelegatingUser(user);
                          setIsDelegatingModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="특정 여정 편집 권한 위임"
                      >
                        여정 위임
                      </button>

                      {/* Edit Info Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(user);
                          setIsUserEditModalOpen(true);
                        }}
                        className="tap-target p-1.5 border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black transition-colors cursor-pointer"
                        title="유저 정보 수정"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Send Password Reset Email */}
                      <button
                        type="button"
                        onClick={() => setPasswordResetTarget(user)}
                        disabled={!user.email}
                        className="tap-target p-1.5 border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="비밀번호 재설정 메일 보내기"
                        aria-label="비밀번호 재설정 메일 보내기"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete User Account Button (Admin Forced Delete) */}
                      <button
                        type="button"
                        onClick={() => handleDeleteUserByAdmin(user)}
                        className="tap-target p-1.5 border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-red-600 hover:text-red-600 transition-colors cursor-pointer"
                        title="유저 계정 영구 삭제 (잘못 가입한 계정 제거)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center text-xs font-mono text-black/60 dark:text-white/60">
                  {userSearchQuery ? '검색 결과와 일치하는 유저가 없습니다.' : '등록된 유저가 없습니다.'}
                </div>
              )}
            </div>

            {/* Pagination Controller (Swiss Minimal - Active when > 20 users or multi-page) */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="text-xs font-mono text-black/60 dark:text-white/60">
                  SHOWING <span className="font-bold text-black dark:text-white">{(safePage - 1) * USERS_PER_PAGE + 1} - {Math.min(safePage * USERS_PER_PAGE, filteredUsers.length)}</span> OF <span className="font-bold text-black dark:text-white">{filteredUsers.length}</span> USERS
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setUserCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="btn btn-secondary btn-sm"
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setUserCurrentPage(pageNum)}
                      className={`w-7 h-7 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center justify-center border ${
                        pageNum === safePage
                          ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-black dark:border-white font-extrabold'
                          : 'border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:border-black dark:hover:border-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setUserCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
