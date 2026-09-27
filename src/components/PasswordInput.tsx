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
  // 'underline' matches the auth forms, 'box' matches bordered modal forms
  variant?: 'underline' | 'box';
}

// Underline password field with a show/hide toggle so users can check what they typed
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
    ? `w-full h-9 pl-3 pr-9 bg-black/[0.02] dark:bg-white/[0.02] border outline-none text-xs font-mono text-black dark:text-white ${
        hasError ? 'border-red-500' : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
      }`
    : `w-full h-8 pl-0 pr-8 bg-transparent border-b rounded-none text-xs font-mono focus:outline-none transition-colors ${
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
        className={`absolute right-0 top-0 ${variant === 'box' ? 'h-9 w-9' : 'h-8 w-8'} flex items-center justify-center text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer`}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
