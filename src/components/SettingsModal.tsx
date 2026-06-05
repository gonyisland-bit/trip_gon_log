import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTitle: string;
  homeSubtitle: string;
  onSaveSettings: (title: string, subtitle: string) => Promise<void>;
}

export function SettingsModal({
  isOpen,
  onClose,
  homeTitle,
  homeSubtitle,
  onSaveSettings,
}: SettingsModalProps) {
  const [title, setTitle] = useState(homeTitle);
  const [subtitle, setSubtitle] = useState(homeSubtitle);
  const [saving, setSaving] = useState(false);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(homeTitle);
      setSubtitle(homeSubtitle);
    }
  }, [isOpen, homeTitle, homeSubtitle]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(title, subtitle);
      onClose();
    } catch (err) {
      console.error(err);
      alert("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="bg-[#F9F8F6] dark:bg-[#161616] border border-black/20 dark:border-white/20 w-full max-w-md p-6 md:p-8 relative transition-colors duration-300 shadow-2xl rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black/60 dark:text-white/60"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-2.5 mb-6 border-b border-black/10 dark:border-white/10 pb-4">
          <Settings className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h2 className="text-lg font-black uppercase tracking-widest text-black dark:text-white">App Settings</h2>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Home Hub Title
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 text-xs md:text-sm font-bold text-black dark:text-white outline-none w-full focus:border-red-600 dark:focus:border-red-400 transition-colors"
              placeholder="Your Personal Travel Magazine."
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Home Hub Subtitle
            </label>
            <textarea 
              value={subtitle} 
              onChange={(e) => setSubtitle(e.target.value)}
              className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 text-xs md:text-sm font-medium text-black dark:text-white outline-none w-full h-24 resize-none focus:border-red-600 dark:focus:border-red-400 transition-colors"
              placeholder="나만의 감성으로 기록하고 보관하는 여행 아카이브."
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-none transition-all text-black/60 dark:text-white/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] font-black uppercase tracking-widest rounded-none transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
