import React, { useState } from 'react';
import { X, Lock, Loader2, KeyRound } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface PasswordVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email: string;
}

export function PasswordVerifyModal({
  isOpen,
  onClose,
  onSuccess,
  email,
}: PasswordVerifyModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Re-verify credentials
      await signInWithEmailAndPassword(auth, email, password);
      setPassword('');
      onSuccess();
    } catch (err: any) {
      console.warn('Password verification failed:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('비밀번호가 일치하지 않습니다.');
      } else {
        setError('인증 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[750] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-[#161616] border border-black dark:border-white shadow-2xl p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-black dark:text-white" />
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black dark:text-white">
              VERIFY PASSWORD
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-black/70 dark:text-white/70 font-mono">
          개인정보 보호를 위해 계정 비밀번호를 입력해 주세요.
        </div>

        {error && (
          <div className="p-2 text-xs font-mono bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-60">
              비밀번호 (PASSWORD)
            </label>
            <div className="relative flex items-center">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-xs font-mono text-black dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase hover:opacity-85 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>확인 중...</span>
                </>
              ) : (
                <span>CONFIRM</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
