import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hasError?: boolean;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  // 'underline' (the name stays for callers) is the auth forms' 40px pill, 'box' the compact 36px pill of modal forms
  variant?: 'underline' | 'box';
}

// Pill password field with a show/hide toggle so users can check what they typed
export function PasswordInput({
  value,
  onChange,
  onBlur,
  placeholder,
  hasError = false,
  autoComplete = 'current-password',
  required = false,
  autoFocus = false,
  id,
  variant = 'underline',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const fieldClass = variant === 'box'
    ? `w-full h-9 pl-3.5 pr-10 bg-black/[0.03] dark:bg-white/[0.06] border rounded-full outline-none text-sm text-black dark:text-white ${
        hasError ? 'border-red-500' : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
      }`
    : `w-full h-10 pl-4 pr-11 bg-black/[0.03] dark:bg-white/[0.06] border rounded-full text-sm focus:outline-none transition-colors ${
        hasError
          ? 'border-red-500 text-red-600 dark:text-red-400'
          : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
      }`;

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        aria-pressed={visible}
        title={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        className={`absolute right-1 top-0 ${variant === 'box' ? 'h-9 w-9' : 'h-10 w-10'} rounded-full flex items-center justify-center text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer`}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
