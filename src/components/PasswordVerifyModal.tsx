import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Sheet, useSheetClose } from './Sheet';

interface PasswordVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email: string;
}

// Asks for the account password again before something private opens (v1.3.8: the shared Sheet)
export function PasswordVerifyModal({ isOpen, onClose, onSuccess, email }: PasswordVerifyModalProps) {
  if (!isOpen) return null;
  return (
    <Sheet label="비밀번호 확인" onClose={onClose} placement="center" tone="paper" panelClassName="sm:max-w-sm">
      <VerifyForm onSuccess={onSuccess} email={email} />
    </Sheet>
  );
}

function VerifyForm({ onSuccess, email }: { onSuccess: () => void; email: string }) {
  const close = useSheetClose();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword('');
      onSuccess();
    } catch (err: any) {
      console.warn('Password verification failed:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('비밀번호가 일치하지 않습니다.');
      } else {
        setError('확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 pt-2">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-surface dark:bg-surface-dark grid place-items-center shrink-0"><KeyRound className="w-5 h-5" aria-hidden /></span>
        <div className="min-w-0 flex flex-col">
          <h2 className="text-[17px] font-extrabold tracking-tight leading-tight">비밀번호 확인</h2>
          <p className="text-meta text-black/55 dark:text-white/55 break-keep">개인정보를 지키려고 비밀번호를 한 번 더 확인합니다.</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-label="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="h-11 w-full rounded-full px-4 bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-[14px] font-bold outline-none focus:border-red-600 dark:focus:border-red-400 transition-colors"
        />
        {error && <p role="alert" className="px-2 text-meta font-bold text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={close} className="btn btn-secondary flex-1">취소</button>
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />확인 중</> : '확인'}
        </button>
      </div>
    </form>
  );
}
