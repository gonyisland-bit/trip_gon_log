import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Loader2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Trip } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTitle: string;
  homeSubtitle: string;
  onSaveSettings: (title: string, subtitle: string) => Promise<void>;
  trashedJourneys: Trip[];
  onRestoreJourney: (id: number) => Promise<void>;
  onPermanentDeleteJourney: (id: number) => Promise<void>;
  isLoggedIn: boolean;
}

type SettingsTab = 'general' | 'trash';

export function SettingsModal({
  isOpen,
  onClose,
  homeTitle,
  homeSubtitle,
  onSaveSettings,
  trashedJourneys,
  onRestoreJourney,
  onPermanentDeleteJourney,
  isLoggedIn,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [title, setTitle] = useState(homeTitle);
  const [subtitle, setSubtitle] = useState(homeSubtitle);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(homeTitle);
      setSubtitle(homeSubtitle);
      setActiveTab('general');
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
      alert('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (id: number) => {
    setLoadingId(id);
    try {
      await onRestoreJourney(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    setLoadingId(id);
    try {
      await onPermanentDeleteJourney(id);
    } finally {
      setLoadingId(null);
    }
  };

  const formatDeletedDate = (ts: number | null | undefined) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#F9F8F6] dark:bg-[#161616] border border-black/20 dark:border-white/20 w-full max-w-lg relative transition-colors duration-300 shadow-2xl rounded-none flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-black uppercase tracking-widest text-black dark:text-white">
              App Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black/60 dark:text-white/60"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/10 dark:border-white/10 shrink-0">
          {[
            { id: 'general' as SettingsTab, label: 'General' },
            {
              id: 'trash' as SettingsTab,
              label: `Trash${trashedJourneys.length > 0 ? ` (${trashedJourneys.length})` : ''}`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-grow">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-5">
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
          )}

          {/* TRASH TAB */}
          {activeTab === 'trash' && (
            <div className="p-6 md:p-8">
              {!isLoggedIn ? (
                <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs font-bold tracking-widest uppercase">
                  로그인 후 휴지통을 관리할 수 있습니다.
                </div>
              ) : trashedJourneys.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <Trash2 className="w-10 h-10 text-black/20 dark:text-white/20" />
                  <p className="text-black/40 dark:text-white/40 text-xs font-bold tracking-widest uppercase">
                    휴지통이 비어 있습니다.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold tracking-wide">
                      삭제된 여정입니다. 복구하거나 영구 삭제할 수 있습니다.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {trashedJourneys.map((journey) => (
                      <div
                        key={journey.id}
                        className="flex items-center gap-3 p-3 border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 shrink-0 overflow-hidden border border-black/10 dark:border-white/10 bg-black/5">
                          <img
                            src={journey.img}
                            alt={journey.title}
                            className="w-full h-full object-cover grayscale opacity-60"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                          <div className="font-bold text-xs uppercase tracking-tight truncate text-black dark:text-white">
                            {journey.title}
                          </div>
                          <div className="text-[9px] text-black/40 dark:text-white/40 font-medium mt-0.5">
                            {journey.date}
                          </div>
                          <div className="text-[9px] text-red-500/70 dark:text-red-400/70 font-bold mt-0.5 uppercase tracking-wider">
                            삭제: {formatDeletedDate(journey.deletedAt)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRestore(journey.id)}
                            disabled={loadingId === journey.id}
                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-50 text-black dark:text-white"
                          >
                            {loadingId === journey.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            복구
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(journey.id)}
                            disabled={loadingId === journey.id}
                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors disabled:opacity-50"
                          >
                            {loadingId === journey.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            영구삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
