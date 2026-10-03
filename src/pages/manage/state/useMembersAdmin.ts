import { useState, useEffect } from 'react';
import { collection, doc, deleteDoc, updateDoc, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { setDoc } from '../../../utils/ownership';
import { db } from '../../../firebase';
import { UserProfile } from '../../../types';
import { notify, confirmDialog } from '../../../utils/feedback';
import { VERIFY_PROBLEM, deleteAuthAccount, verifyAuthAccount } from '../../../utils/accountCleanup';
import { sendResetMail } from '../../../utils/emailVerification';
import type { ManageHubPageProps, ManageMode } from '../useManageHubState';

type MembersProps = Pick<ManageHubPageProps, 'trips' | 'plans' | 'onSaveTrip' | 'isLoggedIn'> & { activeMode: ManageMode };

// USERS tab: members, approval, admin mail, password reset, per-journey editors. Every action saves at once.
export function useMembersAdmin({ trips, plans, onSaveTrip, isLoggedIn, activeMode }: MembersProps) {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState<boolean>(false);
  const [delegatingUser, setDelegatingUser] = useState<UserProfile | null>(null);
  const [isDelegatingModalOpen, setIsDelegatingModalOpen] = useState<boolean>(false);
  const [userActionToast, setUserActionToast] = useState<string | null>(null);

  // Admin Account Dynamic Management
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>(() => localStorage.getItem('cached_super_admin_email') || 'gonyisland@naver.com');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState<string>('');
  const [adminEmailSaving, setAdminEmailSaving] = useState<boolean>(false);

  // Helper to determine if account is super admin or admin
  const isTargetAdminAccount = (email?: string, role?: string) => {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return clean === 'gonyisland@naver.com' || clean === currentAdminEmail.toLowerCase().trim() || role === 'admin';
  };

  useEffect(() => {
    if (activeMode !== 'USERS' || !isLoggedIn) return;

    // Dual-source user profile map to guarantee 100% visibility even under Firestore security rule limits
    const usersMap = new Map<string, UserProfile>();

    const updateCombinedList = () => {
      const combined = Array.from(usersMap.values());
      combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUsersList(combined);
    };

    // 1. Primary listener: public safe path (users/public/users)
    const unsubPublicUsers = onSnapshot(collection(db, 'users', 'public', 'users'), (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.email) {
          const cleanEmail = data.email.toLowerCase().trim();
          const isAdminAcc = isTargetAdminAccount(cleanEmail, data.role);
          const finalRole = isAdminAcc ? 'admin' : (data.role || 'user');
          const finalStatus = isAdminAcc ? 'approved' : (data.status || 'approved');

          usersMap.set(docSnap.id, {
            uid: docSnap.id,
            email: data.email,
            username: data.username || '',
            profileType: data.profileType || 'icon',
            profileIcon: data.profileIcon || 'smile',
            profileImage: data.profileImage || '',
            lastName: data.lastName || '',
            firstName: data.firstName || '',
            birthdate: data.birthdate || '',
            phone: data.phone || '',
            role: finalRole,
            status: finalStatus,
            approvalToken: data.approvalToken || '',
            permissions: data.permissions || { canCreate: true, canEdit: isAdminAcc, canDelete: isAdminAcc },
            createdAt: data.createdAt || 0,
            lastActiveAt: data.lastActiveAt || 0,
          });
        }
      });
      updateCombinedList();
    }, (err: Error) => {
      console.warn('Notice: public/users listener notice:', err);
    });

    // 2. Secondary listener: root users collection (merges with public)
    const unsubRootUsers = onSnapshot(collection(db, 'users'), (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.forEach(docSnap => {
        if (docSnap.id === 'public') return; // Skip public root document
        const data = docSnap.data();
        if (data.email) {
          const cleanEmail = data.email.toLowerCase().trim();
          const isAdminAcc = isTargetAdminAccount(cleanEmail, data.role);
          const existing = usersMap.get(docSnap.id);
          const finalRole = isAdminAcc ? 'admin' : (data.role || existing?.role || 'user');
          const finalStatus = isAdminAcc ? 'approved' : (data.status || existing?.status || 'approved');

          usersMap.set(docSnap.id, {
            uid: docSnap.id,
            email: data.email,
            username: data.username || existing?.username || '',
            profileType: data.profileType || existing?.profileType || 'icon',
            profileIcon: data.profileIcon || existing?.profileIcon || 'smile',
            profileImage: data.profileImage || existing?.profileImage || '',
            lastName: data.lastName || existing?.lastName || '',
            firstName: data.firstName || existing?.firstName || '',
            birthdate: data.birthdate || existing?.birthdate || '',
            phone: data.phone || existing?.phone || '',
            role: finalRole,
            status: finalStatus,
            approvalToken: data.approvalToken || existing?.approvalToken || '',
            permissions: data.permissions || existing?.permissions || { canCreate: true, canEdit: isAdminAcc, canDelete: isAdminAcc },
            createdAt: data.createdAt || existing?.createdAt || 0,
            lastActiveAt: data.lastActiveAt || existing?.lastActiveAt || 0,
          });
        }
      });
      updateCombinedList();
    }, (err: Error) => {
      console.warn('Notice: root users listener restricted by rules, relying on public/users:', err);
    });

    // Listen to admin settings for dynamic superAdminEmail
    const unsubAdminConfig = onSnapshot(doc(db, 'users', 'public', 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.superAdminEmail && typeof data.superAdminEmail === 'string') {
          setCurrentAdminEmail(data.superAdminEmail);
        }
      }
    }, (err) => {
      console.warn('Failed to listen to admin settings:', err);
    });

    return () => {
      unsubPublicUsers();
      unsubRootUsers();
      unsubAdminConfig();
    };
  }, [activeMode, isLoggedIn, currentAdminEmail]);

  const handleUpdateAdminEmail = async () => {
    const trimmed = newAdminEmailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      notify("유효한 이메일 주소를 입력해 주세요.");
      return;
    }
    setAdminEmailSaving(true);
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'admin'), {
        superAdminEmail: trimmed
      }, { merge: true });
      setCurrentAdminEmail(trimmed);
      try {
        localStorage.setItem('cached_super_admin_email', trimmed);
      } catch (_) {}
      setNewAdminEmailInput('');
      setUserActionToast(`최고 관리자 이메일이 [${trimmed}]로 변경되었습니다.`);
      setTimeout(() => setUserActionToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to update admin email:", err);
      notify(`관리자 이메일 저장 실패: ${err?.message || err}`);
    } finally {
      setAdminEmailSaving(false);
    }
  };

  const handleApproveUser = async (user: UserProfile) => {
    try {
      await Promise.allSettled([
        updateDoc(doc(db, 'users', user.uid), { status: 'approved', approvedAt: Date.now() }),
        setDoc(doc(db, 'users', 'public', 'users', user.uid), { ...user, status: 'approved', approvedAt: Date.now() }, { merge: true }),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'approved' } : u));
      setUserActionToast(`[${user.lastName} ${user.firstName}] 님의 이용 제한을 풀었습니다.`);
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to approve user:', err);
      notify('승인 처리 중 오류가 발생했습니다.');
    }
  };

  // A member stuck behind the verification mail: the operator marks the address verified
  const handleVerifyUser = async (user: UserProfile, confirmed = false) => {
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.username || user.email;
    if (!confirmed && !await confirmDialog(`[${fullName} (${user.email})] 님의 메일 인증을 운영자가 대신 처리할까요? 본인 주소가 맞는지 확인한 뒤 눌러 주세요.`, { title: 'VERIFY', confirmLabel: '인증 처리' })) return;
    const result = await verifyAuthAccount(user.uid);
    if (result !== 'verified') {
      notify(VERIFY_PROBLEM[result], 'error');
      return;
    }
    await Promise.allSettled([
      updateDoc(doc(db, 'users', user.uid), { status: 'approved', approvedAt: Date.now(), emailVerifiedAt: Date.now() }),
      setDoc(doc(db, 'users', 'public', 'users', user.uid), { status: 'approved', approvedAt: Date.now(), emailVerifiedAt: Date.now() }, { merge: true }),
    ]);
    setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'approved' } : u));
    setUserActionToast(`[${fullName}] 님의 메일 인증을 처리했습니다. 다음 접속부터 바로 이용할 수 있습니다.`);
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleRejectUser = async (user: UserProfile, confirmed = false) => {
    if (!confirmed && !await confirmDialog(`[${user.lastName} ${user.firstName}] 님의 이용을 제한할까요? 로그인하면 바로 로그아웃됩니다.`, { title: 'RESTRICT', confirmLabel: '이용 제한' })) return;
    try {
      await Promise.allSettled([
        updateDoc(doc(db, 'users', user.uid), { status: 'rejected', rejectedAt: Date.now() }),
        setDoc(doc(db, 'users', 'public', 'users', user.uid), { ...user, status: 'rejected', rejectedAt: Date.now() }, { merge: true }),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'rejected' } : u));
      setUserActionToast(`[${user.lastName} ${user.firstName}] 님의 이용을 제한했습니다.`);
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to reject user:', err);
      notify('거절 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteUserByAdmin = async (user: UserProfile, confirmed = false) => {
    if (isTargetAdminAccount(user.email, user.role)) {
      notify("관리자 계정은 삭제할 수 없습니다.");
      return;
    }
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.username || user.email;
    if (!confirmed && !await confirmDialog(`정말로 회원 [${fullName} (${user.email})] 계정을 영구 삭제하시겠습니까?\n모든 프로필 데이터가 완전히 제거됩니다.`)) return;

    try {
      await Promise.allSettled([
        deleteDoc(doc(db, 'users', user.uid)),
        deleteDoc(doc(db, 'users', 'public', 'users', user.uid)),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.filter(u => u.uid !== user.uid));
      // The sign-in account goes too when the server has a service account; otherwise it removes
      // itself the next time it signs in (no empty profile is brought back)
      const account = await deleteAuthAccount(user.uid);
      setUserActionToast(account === 'deleted'
        ? `[${fullName}] 회원 계정을 삭제했습니다. 같은 이메일로 다시 가입할 수 있습니다.`
        : `[${fullName}] 회원 프로필을 삭제했습니다. 로그인 계정은 다음 로그인 때 정리됩니다.`);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      notify(`회원 삭제 중 오류가 발생했습니다: ${err?.message || err}`);
    }
  };

  // Admins cannot set another member's password from the browser; Firebase emails a reset link instead
  const [passwordResetTarget, setPasswordResetTarget] = useState<UserProfile | null>(null);

  const handleSendPasswordReset = async () => {
    const user = passwordResetTarget;
    setPasswordResetTarget(null);
    if (!user?.email) return;
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.username || user.email;
    try {
      await sendResetMail(user.email);
      setUserActionToast(`[${fullName}] 님에게 비밀번호 재설정 메일을 보냈습니다.`);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to send password reset email:', err);
      notify(`재설정 메일 발송 중 오류가 발생했습니다: ${err?.message || err}`);
    }
  };

  const handleSaveUserEdit = async (updated: Partial<UserProfile>) => {
    if (!editingUser) return;
    try {
      const cleanData: Record<string, any> = {};
      Object.entries(updated).forEach(([k, v]) => {
        if (v !== undefined) cleanData[k] = v;
      });

      await Promise.allSettled([
        setDoc(doc(db, 'users', editingUser.uid), cleanData, { merge: true }),
        setDoc(doc(db, 'users', 'public', 'users', editingUser.uid), cleanData, { merge: true })
      ]);
      setUsersList(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, ...cleanData } : u));
      setIsUserEditModalOpen(false);
      setEditingUser(null);
      setUserActionToast('유저 정보가 수정되었습니다.');
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to update user:', err);
      notify('유저 정보 수정에 실패했습니다.');
    }
  };

  const handleToggleTripAllowedEditor = async (tripId: number, targetUser: UserProfile) => {
    const trip = trips.find(t => t.id === tripId) || plans.find(p => p.id === tripId);
    if (!trip) return;
    const currentEditors = trip.allowedEditors || [];
    const hasAccess = currentEditors.includes(targetUser.uid) || currentEditors.includes(targetUser.email);
    const newEditors = hasAccess
      ? currentEditors.filter(id => id !== targetUser.uid && id !== targetUser.email)
      : [...currentEditors, targetUser.uid];

    await onSaveTrip(tripId, { allowedEditors: newEditors });
    setUserActionToast(`[${trip.title}] 여정 편집 권한이 ${!hasAccess ? '부여' : '회수'}되었습니다.`);
    setTimeout(() => setUserActionToast(null), 2500);
  };

  return {
    usersList, editingUser, setEditingUser, isUserEditModalOpen, setIsUserEditModalOpen, delegatingUser,
    setDelegatingUser, isDelegatingModalOpen, setIsDelegatingModalOpen, userActionToast, currentAdminEmail,
    newAdminEmailInput, setNewAdminEmailInput, adminEmailSaving, isTargetAdminAccount, handleUpdateAdminEmail,
    handleApproveUser, handleVerifyUser, handleRejectUser, handleDeleteUserByAdmin, passwordResetTarget,
    setPasswordResetTarget, handleSendPasswordReset, handleSaveUserEdit, handleToggleTripAllowedEditor,
  };
}
