import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MessageSquare, Trash2, Edit3, Check, Send, MapPin, Shield, LogIn
} from 'lucide-react';
import { SpotPocketItem, PocketComment } from '../types';

interface PocketCommentModalProps {
  isOpen: boolean;
  spot: SpotPocketItem | null;
  onClose: () => void;
  onSaveComments: (spotId: string, comments: PocketComment[]) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  currentUser: { uid?: string; displayName?: string | null; email?: string | null } | null;
  onOpenAuthModal?: () => void;
}

export const PocketCommentModal: React.FC<PocketCommentModalProps> = ({
  isOpen,
  spot,
  onClose,
  onSaveComments,
  isLoggedIn,
  isAdmin,
  currentUser,
  onOpenAuthModal,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setNewCommentText('');
      setEditingCommentId(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !spot) return null;

  const comments = spot.comments || [];

  // Permission check: admin can manage all comments; users can only manage their own
  const canManageComment = (comment: PocketComment): boolean => {
    if (isAdmin) return true;
    if (!isLoggedIn || !currentUser) return false;
    if (comment.authorId && currentUser.uid && comment.authorId === currentUser.uid) return true;
    if (comment.authorEmail && currentUser.email && comment.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    return false;
  };

  const isAuthor = (comment: PocketComment): boolean => {
    if (!currentUser) return false;
    if (comment.authorId && currentUser.uid && comment.authorId === currentUser.uid) return true;
    if (comment.authorEmail && currentUser.email && comment.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    return false;
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !spot) return;

    const authorDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'USER';
    const newComment: PocketComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: newCommentText.trim(),
      createdAt: Date.now(),
      authorId: currentUser?.uid || 'anonymous',
      authorName: authorDisplayName,
      authorEmail: currentUser?.email || undefined,
    };

    const updatedComments = [...comments, newComment];
    onSaveComments(spot.id, updatedComments);
    setNewCommentText('');

    setTimeout(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteComment = (commentId: string) => {
    if (!spot) return;
    const target = comments.find(c => c.id === commentId);
    if (!target || !canManageComment(target)) return;

    if (window.confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      const updatedComments = comments.filter(c => c.id !== commentId);
      onSaveComments(spot.id, updatedComments);
    }
  };

  const handleStartEdit = (comment: PocketComment) => {
    if (!canManageComment(comment)) return;
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!spot || !editingText.trim()) return;
    const target = comments.find(c => c.id === commentId);
    if (!target || !canManageComment(target)) return;

    const updatedComments = comments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          text: editingText.trim(),
          updatedAt: Date.now(),
        };
      }
      return c;
    });

    onSaveComments(spot.id, updatedComments);
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header (Swiss Minimal Header) */}
        <div className="px-5 py-4 border-b border-black/15 dark:border-white/15 flex items-start justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 text-black dark:text-white">
                {spot.category.toUpperCase()}
              </span>
              {(spot.city || spot.country) && (
                <span className="text-[10.5px] font-mono text-black/50 dark:text-white/50 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0 text-red-600" />
                  <span>{spot.city || spot.country}</span>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-black dark:text-white truncate font-sans">
              {spot.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono font-bold text-black/70 dark:text-white/70">
                COMMENTS ({comments.length})
              </span>
              <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                · 장소 메모 및 후기
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-black/15 dark:border-white/15 hover:bg-black/10 dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none shrink-0"
            title="닫기 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Comments List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-black/5 dark:divide-white/5">
          {comments.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full border border-black/15 dark:border-white/15 flex items-center justify-center text-black/40 dark:text-white/40">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono text-black/50 dark:text-white/50 pt-1">
                등록된 댓글이 아직 없습니다.
              </p>
              <p className="text-[11px] text-black/40 dark:text-white/40">
                이 장소에 대한 팁, 방문 후기, 메모를 남겨보세요.
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const canManage = canManageComment(comment);
              const isOwnComment = isAuthor(comment);
              const isEditing = editingCommentId === comment.id;

              return (
                <div key={comment.id} className="pt-3.5 first:pt-0 group">
                  {/* Author & Meta Row */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-black dark:text-white truncate">
                        {comment.authorName}
                      </span>

                      {/* Author badge */}
                      {isOwnComment && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1 py-0.2 border border-black/20 dark:border-white/20 bg-black text-white dark:bg-white dark:text-black rounded-none">
                          YOU
                        </span>
                      )}

                      {/* Admin badge if commenter is admin email */}
                      {comment.authorEmail && (comment.authorEmail.includes('admin') || comment.authorEmail.includes('gon')) && !isOwnComment && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1 py-0.2 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" />
                          <span>ADMIN</span>
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                        {formatDate(comment.createdAt)}
                        {comment.updatedAt && ' (수정됨)'}
                      </span>
                    </div>

                    {/* Manage Actions (Edit / Delete) - Only for Author or Admin */}
                    {canManage && !isEditing && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(comment)}
                          className="p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                          title="댓글 수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-red-500/70 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="댓글 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment Body or Edit Input */}
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white font-sans outline-none rounded-none resize-none focus:border-black dark:focus:border-white"
                        placeholder="댓글을 수정하세요..."
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 text-[11px] font-mono border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors cursor-pointer rounded-none"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-3 py-1 text-[11px] font-mono font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 rounded-none"
                        >
                          <Check className="w-3 h-3" />
                          <span>저장</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-[13px] text-black/80 dark:text-white/85 font-sans leading-relaxed break-keep whitespace-pre-wrap pl-0.5">
                      {comment.text}
                    </p>
                  )}
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        {/* 3. Bottom Form Area */}
        <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/15 dark:border-white/15 shrink-0">
          {!isLoggedIn ? (
            <div className="flex items-center justify-between gap-3 p-2.5 border border-dashed border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5">
              <span className="text-xs font-mono text-black/60 dark:text-white/60">
                댓글을 작성하려면 로그인이 필요합니다.
              </span>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer rounded-none shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>SIGN IN</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddComment} className="flex flex-col gap-2">
              <div className="relative flex items-center">
                <textarea
                  ref={textareaRef}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(e);
                    }
                  }}
                  rows={2}
                  placeholder="댓글이나 팁, 메모를 입력하세요 (Enter로 등록, Shift+Enter 줄바꿈)..."
                  className="w-full pl-3 pr-24 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 text-black dark:text-white font-sans outline-none rounded-none resize-none focus:border-black dark:focus:border-white placeholder:text-black/35 dark:placeholder:text-white/35 leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="absolute right-2 bottom-2 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer rounded-none shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>등록</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-black/40 dark:text-white/40 px-1">
                <span>작성자: {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'USER'}</span>
                {isAdmin && <span className="text-red-600 font-bold">관리자 권한 활성</span>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
