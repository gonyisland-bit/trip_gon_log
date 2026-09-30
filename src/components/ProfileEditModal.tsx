import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Upload, ClipboardPaste, Trash2, Loader2, Sparkles, Image as ImageIcon,
  Smile, Check, User as UserIcon, Camera
} from 'lucide-react';
import { UserProfile } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { AVATAR_CATEGORIES, PROFILE_PRESET_ICONS, UserProfileAvatar } from './UserProfileAvatar';
import type { AvatarCategory } from './profile/FlatAvatars';
import { purgeMyFiles, uploadFileToR2 } from '../utils/storageHelper';
import { deleteOwnContent } from '../utils/ownership';
import { compressImage } from '../utils/imageHelper';
import { deleteUser, updatePassword } from 'firebase/auth';
import { PasswordInput } from './PasswordInput';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { notify } from '../utils/feedback';
import { withdrawAccount } from '../utils/accountCleanup';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updated: Partial<UserProfile>) => Promise<void>;
  title?: string;
  isAdminEditing?: boolean;
}

export function ProfileEditModal({
  isOpen,
  onClose,
  user,
  onSave,
  title = '내 프로필 수정',
  isAdminEditing = false,
}: ProfileEditModalProps) {
  const [username, setUsername] = useState(user.username || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [birthdate, setBirthdate] = useState(user.birthdate || '');
  const [phone, setPhone] = useState(user.phone || '');
  
  // Profile Avatar State
  const [profileType, setProfileType] = useState<'icon' | 'image'>(user.profileType || 'icon');
  const [profileIcon, setProfileIcon] = useState<string>(user.profileIcon || 'user');
  const [profileImage, setProfileImage] = useState<string>(user.profileImage || '');

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'icon' | 'image'>(user.profileType || 'icon');
  const [selectedCategory, setSelectedCategory] = useState<'all' | AvatarCategory>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Own password change (profile editing is reached through password re-verification)
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const newPasswordError = newPassword && newPassword.length < 6 ? '비밀번호는 최소 6자 이상이어야 합니다.' : '';
  const newPasswordConfirmError = newPasswordConfirm && newPasswordConfirm !== newPassword ? '비밀번호가 일치하지 않습니다.' : '';
  const canChangePassword = newPassword.length >= 6 && newPasswordConfirm === newPassword && !isChangingPassword;

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(user.username || '');
      setLastName(user.lastName || '');
      setFirstName(user.firstName || '');
      setBirthdate(user.birthdate || '');
      setPhone(user.phone || '');
      setProfileType(user.profileType || 'icon');
      setProfileIcon(user.profileIcon || 'user');
      setProfileImage(user.profileImage || '');
      setActiveTab(user.profileType || 'icon');
      setIsAvatarPickerOpen(false);
      setErrorMsg('');
      setIsSaving(false);
      setIsConfirmOpen(false);
      setIsDeleteConfirmOpen(false);
      setIsDeleting(false);
      setIsPasswordSectionOpen(false);
      setNewPassword('');
      setNewPasswordConfirm('');
      setIsPasswordConfirmOpen(false);
      setIsChangingPassword(false);
      setPasswordMsg(null);
    }
  }, [isOpen, user]);

  const handleChangePassword = async () => {
    setIsPasswordConfirmOpen(false);
    if (!auth.currentUser || !canChangePassword) return;
    setIsChangingPassword(true);
    setPasswordMsg(null);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setNewPasswordConfirm('');
      setPasswordMsg({ type: 'success', text: '비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.' });
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordMsg({ type: 'error', text: '보안을 위해 재로그인이 필요합니다. 로그아웃 후 다시 로그인하여 변경해 주세요.' });
      } else if (err.code === 'auth/weak-password') {
        setPasswordMsg({ type: 'error', text: '비밀번호가 너무 약합니다. 6자 이상으로 다시 입력해 주세요.' });
      } else {
        setPasswordMsg({ type: 'error', text: `비밀번호 변경에 실패했습니다: ${err?.message || err}` });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setIsDeleting(true);
    try {
      // Friends, journeys, personal documents, files, profile, then the sign-in account (v1.3.6)
      await withdrawAccount({ deleteContent: deleteOwnContent, purgeFiles: () => purgeMyFiles().then(() => {}) });
      alert('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
      window.location.href = '/';
    } catch (err: any) {
      console.error('Account deletion error:', err);
      if (err.code === 'auth/requires-recent-login') {
        notify('보안을 위해 재로그인이 필요합니다. 로그아웃 후 다시 로그인하여 탈퇴를 진행해 주세요.');
      } else {
        notify(`탈퇴 처리 중 오류가 발생했습니다: ${err?.message || err}`);
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  // Handle global paste for profile image when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processAndUploadImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, user.uid]);

  if (!isOpen) return null;

  // Process & Upload 1:1 Image
  const processAndUploadImage = async (file: File) => {
    setIsUploading(true);
    setErrorMsg('');
    try {
      const compressedBlob = await compressImage(file, 600, 600, 0.85);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `users/profiles/${user.uid}_${Date.now()}_${safeName}`;
      
      let downloadUrl = '';
      try {
        downloadUrl = await uploadFileToR2(compressedBlob, storagePath);
      } catch (uploadErr) {
        console.warn('R2 upload warning, using local preview:', uploadErr);
        // Fallback to data URL if R2 fails
        downloadUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedBlob);
        });
      }

      setProfileImage(downloadUrl);
      setProfileType('image');
      setActiveTab('image');
    } catch (err: any) {
      console.error('Failed to process image:', err);
      setErrorMsg('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processAndUploadImage(file);
    }
  };

  const handlePasteClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            const file = new File([blob], `pasted_profile_${Date.now()}.${ext}`, { type: imageType });
            await processAndUploadImage(file);
            return;
          }
        }
      }
      notify('클립보드에 복사된 이미지가 없습니다. 이미지를 복사한 후 다시 시도하거나 Ctrl+V를 눌러주세요.');
    } catch (err) {
      console.warn('Clipboard read error:', err);
      notify('클립보드 이미지를 붙여넣으려면 키보드 단축키 Ctrl+V를 사용해주세요.');
    }
  };

  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!lastName.trim() || !firstName.trim()) {
      setErrorMsg('성(Last Name)과 이름(First Name)을 모두 입력해 주세요.');
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername && trimmedUsername !== (user.username || '').trim().toLowerCase()) {
      setIsSaving(true);
      try {
        const uq = query(collection(db, 'users'), where('username', '==', trimmedUsername));
        const snap = await getDocs(uq);
        const hasOtherUser = snap.docs.some(d => d.id !== user.uid);
        if (hasOtherUser) {
          setErrorMsg('이미 다른 사용자가 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.');
          setIsSaving(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Username uniqueness check warning:', checkErr);
      } finally {
        setIsSaving(false);
      }
    }

    // Open ConfirmModal for 2-step verification
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const updatedData: Partial<UserProfile> = {
        username: username.trim(),
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        // Birthday and phone are no longer collected (v1.3.6): saving the profile clears old values
        birthdate: '',
        phone: '',
        profileType,
        profileIcon: profileType === 'icon' ? (profileIcon || 'user') : '',
        profileImage: profileType === 'image' ? (profileImage || '') : '',
      };

      await onSave(updatedData);
      setIsConfirmOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setErrorMsg('프로필 저장 중 오류가 발생했습니다.');
      setIsConfirmOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const currentPreviewProfile: Partial<UserProfile> = {
    username: username.trim(),
    lastName: lastName.trim(),
    firstName: firstName.trim(),
    profileType,
    profileIcon,
    profileImage,
  };

  const filteredIcons = PROFILE_PRESET_ICONS.filter(i => 
    selectedCategory === 'all' ? true : i.category === selectedCategory
  );

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-lg bg-surface dark:bg-surface-dark border border-black dark:border-white shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-extrabold uppercase tracking-wider text-black dark:text-white">
                {title}
              </span>
              {isAdminEditing && (
                <span className="text-micro font-mono font-bold uppercase px-1.5 py-0.5 bg-red-600 text-white leading-none">
                  ADMIN MODE
                </span>
              )}
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSaveClick} className="flex flex-col gap-5">
            {/* 1. 1:1 Profile Avatar - Clean Minimal State with Change Button */}
            <div className="flex flex-col items-center justify-center gap-2.5 p-4 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10">
              <div className="relative group">
                <UserProfileAvatar 
                  profile={currentPreviewProfile} 
                  size="xl" 
                  className="shadow-sm" 
                />
                {profileType === 'image' && profileImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileImage('');
                      setProfileType('icon');
                      setProfileIcon('user');
                    }}
                    className="tap-target absolute -top-1 -right-1 p-1 bg-red-600 text-white text-micro font-mono hover:bg-red-700 transition-colors shadow-xs"
                    title="이미지 제거 및 기본값으로 복귀"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Action Button: Open Avatar Picker Modal */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setIsAvatarPickerOpen(true)}
                  className="btn btn-primary btn-sm flex"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>프로필 변경</span>
                </button>
                {profileType === 'image' && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileImage('');
                      setProfileType('icon');
                      setProfileIcon('user');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    기본값 복귀
                  </button>
                )}
              </div>
              <span className="text-micro font-mono text-black/60 dark:text-white/60">
                1:1 비율 프로필 · 아이콘 및 이미지 등록 지원
              </span>
            </div>

            {/* 2. User Account & Identity Information */}
            <div className="space-y-3 text-xs font-mono">
              {/* Username (아이디) Field */}
              <div>
                <label className="block text-micro font-bold uppercase tracking-wider opacity-60 mb-1">
                  Username
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="예: traveler_gon, alex99"
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-mono focus:border-black dark:focus:border-white text-black dark:text-white"
                />
                <span className="text-micro text-black/60 dark:text-white/60 mt-0.5 block">
                  * 로그인 이메일 외에 여정 및 서비스 내에서 표시될 고유 아이디입니다.
                </span>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro font-bold uppercase tracking-wider opacity-60 mb-1">
                    Last name
                  </label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-sans focus:border-black dark:focus:border-white text-black dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-micro font-bold uppercase tracking-wider opacity-60 mb-1">
                    First name
                  </label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-sans focus:border-black dark:focus:border-white text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Email (Read-Only) */}
              <div>
                <label className="block text-micro font-bold uppercase tracking-wider opacity-60 mb-1">
                  이메일 (EMAIL - 읽기 전용)
                </label>
                <input 
                  type="email" 
                  disabled
                  value={user.email}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none text-xs font-mono opacity-60 cursor-not-allowed text-black dark:text-white"
                />
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-3 border-t border-black/10 dark:border-white/10">
              <button 
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="btn btn-primary flex-1 flex"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <span>SAVE PROFILE</span>
                )}
              </button>
            </div>

            {/* Password Change (User Only) */}
            {!isAdminEditing && (
              <div className="pt-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-meta font-mono font-bold uppercase tracking-wider opacity-60">
                    Password
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsPasswordSectionOpen(v => !v); setPasswordMsg(null); }}
                    aria-expanded={isPasswordSectionOpen}
                    className="btn btn-secondary btn-sm"
                  >
                    {isPasswordSectionOpen ? 'CLOSE' : 'CHANGE'}
                  </button>
                </div>
                {isPasswordSectionOpen && (
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-micro font-bold uppercase tracking-wider opacity-60 mb-1">
                        New password
                      </label>
                      <PasswordInput
                        variant="box"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="6자 이상"
                        autoComplete="new-password"
                        hasError={Boolean(newPasswordError)}
                      />
                      {newPasswordError && (
                        <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">{newPasswordError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-micro font-bold uppercase tracking-wider opacity-60 mb-1">
                        Confirm password
                      </label>
                      <PasswordInput
                        variant="box"
                        value={newPasswordConfirm}
                        onChange={setNewPasswordConfirm}
                        placeholder="새 비밀번호를 한 번 더 입력"
                        autoComplete="new-password"
                        hasError={Boolean(newPasswordConfirmError)}
                      />
                      {newPasswordConfirmError && (
                        <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">{newPasswordConfirmError}</p>
                      )}
                    </div>
                    {passwordMsg && (
                      <p className={`text-[11px] font-mono ${passwordMsg.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-black/70 dark:text-white/70'}`}>
                        {passwordMsg.text}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPasswordConfirmOpen(true)}
                      disabled={!canChangePassword}
                      className="btn btn-primary flex"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>변경 중...</span>
                        </>
                      ) : (
                        <span>UPDATE PASSWORD</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Account Deletion Area (User Only) */}
            {!isAdminEditing && (
              <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                <span className="text-meta font-mono text-black/60 dark:text-white/60">
                  더 이상 계정을 사용하지 않는 경우
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="btn btn-outline-danger btn-sm"
                >
                  Delete account
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 2-Step Swiss Minimal ConfirmModal before Saving */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="SAVE PROFILE"
        message="프로필 변경 사항을 저장하시겠습니까? (이메일 외 아이디 및 1:1 프로필이 즉시 반영됩니다)"
        confirmLabel="저장 확인"
        cancelLabel="취소"
        iconType="info"
        confirmVariant="black"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {/* 2-Step Swiss Minimal ConfirmModal before Changing Password */}
      <ConfirmModal
        isOpen={isPasswordConfirmOpen}
        title="CHANGE PASSWORD"
        message="비밀번호를 변경하시겠습니까? 다음 로그인부터 새 비밀번호를 사용해야 합니다."
        confirmLabel="변경 확인"
        cancelLabel="취소"
        iconType="info"
        confirmVariant="black"
        onConfirm={handleChangePassword}
        onCancel={() => setIsPasswordConfirmOpen(false)}
      />

      {/* 2-Step Swiss Minimal ConfirmModal before Deleting Account */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="DELETE ACCOUNT"
        message="정말로 회원 탈퇴하시겠습니까? 탈퇴 시 모든 프로필 및 데이터가 영구 삭제되며 복구할 수 없습니다."
        confirmLabel="Delete"
        cancelLabel="취소"
        iconType="alert"
        confirmVariant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Sub-Modal: 1:1 Profile Avatar Picker (Icon Grid or Image Upload) */}
      {isAvatarPickerOpen && (
        <div 
          className="fixed inset-0 z-player flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsAvatarPickerOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-surface dark:bg-surface-dark border border-black dark:border-white shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-black dark:text-white" />
                <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black dark:text-white">
                  CHANGE AVATAR · 프로필 선택
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(false)}
                className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Icon Presets vs Custom Image */}
            <div className="flex items-center gap-1 border-b border-black/10 dark:border-white/10 pb-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('icon')}
                className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
                  activeTab === 'icon'
                    ? 'border-b-2 border-black dark:border-white text-black dark:text-white font-extrabold'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                기본 아이콘
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
                  activeTab === 'image'
                    ? 'border-b-2 border-black dark:border-white text-black dark:text-white font-extrabold'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                1:1 이미지 등록
              </button>
            </div>

            {/* Tab 1: Icon Presets */}
            {activeTab === 'icon' && (
              <div className="flex flex-col gap-2.5">
                {/* Category Filters */}
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                  {[{ id: 'all', label: '전체' }, ...AVATAR_CATEGORIES].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`h-7 px-3 rounded-full text-meta font-bold border cursor-pointer transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent'
                          : 'border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Icons Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 max-h-52 overflow-y-auto p-1">
                  {filteredIcons.map(item => {
                    const IconComponent = item.icon;
                    const isSelected = profileType === 'icon' && profileIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setProfileIcon(item.id);
                          setProfileType('icon');
                        }}
                        title={item.label}
                        aria-pressed={isSelected}
                        aria-label={item.label}
                        className={`aspect-square rounded-full overflow-hidden transition-transform cursor-pointer ${
                          isSelected ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-surface dark:ring-offset-surface-dark' : 'hover:scale-105'
                        }`}
                      >
                        <IconComponent className="w-full h-full block" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: 1:1 Image Upload / Drag & Drop / Clipboard Paste */}
            {activeTab === 'image' && (
              <div className="flex flex-col gap-2.5">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  className="hidden" 
                />

                <div
                  onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[110px] ${
                    isDragOver
                      ? 'border-red-600 bg-red-600/5 text-red-600'
                      : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white bg-white dark:bg-[#111]'
                  }`}
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                      <span>1:1 프로필 이미지 업로드 중...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mb-1.5 text-black/60 dark:text-white/60" />
                      <span className="text-xs font-mono font-bold text-black dark:text-white">
                        클릭하여 이미지 선택 또는 여기에 드래그
                      </span>
                      <span className="text-meta font-mono text-black/60 dark:text-white/60 mt-1">
                        * 기존 이미지가 있어도 덮어쓰기 교체 가능 · 1:1 권장
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePasteClick}
                    className="btn btn-secondary flex-1 flex"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>클립보드 붙여넣기 (Ctrl+V)</span>
                  </button>

                  {profileImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileImage('');
                        setProfileType('icon');
                        setProfileIcon('user');
                      }}
                      className="py-2 px-2 text-[11px] font-mono font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Bottom Confirm Button */}
            <div className="pt-2 border-t border-black/10 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(false)}
                className="btn btn-primary w-full flex"
              >
                <Check className="w-3.5 h-3.5" />
                <span>선택 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
