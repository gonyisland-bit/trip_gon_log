import { useState, useMemo, useEffect, useRef } from 'react';
import { LandingHeroMediaItem } from '../../../types';
import { uploadFileToR2 } from '../../../utils/storageHelper';
import { compressImage } from '../../../utils/imageHelper';
import { notify } from '../../../utils/feedback';
import type { ManageHubPageProps } from '../useManageHubState';
import type { DirtyDomain } from './dirtyDomain';

type LandingProps = Pick<ManageHubPageProps,
  'homeTitle' | 'homeSubtitle' | 'heroJourneyIds' | 'marqueeShow' | 'marqueeMessage' | 'marqueeSpeed' |
  'onSaveAllHomeSettings' | 'landingHeroImage' | 'landingHeroMedia'>;

// Guest landing (SYSTEM › landing) and the ticker (SYSTEM › notice)
export function useLandingSettings(props: LandingProps) {
  const {
    homeTitle, homeSubtitle, heroJourneyIds, marqueeShow, marqueeMessage, marqueeSpeed,
    onSaveAllHomeSettings, landingHeroImage = '', landingHeroMedia = [],
  } = props;
  const [saveRevision, setSaveRevision] = useState(0);

  const [title, setTitle] = useState(homeTitle || '');
  const [showMarquee, setShowMarquee] = useState(marqueeShow);
  const [homeMarquee, setHomeMarquee] = useState(marqueeMessage || '');
  const [homeSpeed, setHomeSpeed] = useState(marqueeSpeed || 50);

  // Landing Hero Media (Guest Mode) State - Array of Images & Videos
  const [localLandingHeroImage, setLocalLandingHeroImage] = useState<string>(landingHeroImage);
  const [localLandingHeroMedia, setLocalLandingHeroMedia] = useState<LandingHeroMediaItem[]>(() => {
    if (landingHeroMedia && landingHeroMedia.length > 0) return landingHeroMedia;
    if (landingHeroImage) {
      return [{ id: 'hero-legacy', url: landingHeroImage, type: 'image', title: 'LANDING HERO' }];
    }
    return [];
  });
  const [isUploadingLandingHero, setIsUploadingLandingHero] = useState<boolean>(false);
  const [isDraggingLandingHero, setIsDraggingLandingHero] = useState<boolean>(false);
  const [replacingLandingHeroIndex, setReplacingLandingHeroIndex] = useState<number | null>(null);
  const [dragOverLandingHeroIndex, setDragOverLandingHeroIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalLandingHeroImage(landingHeroImage);
  }, [landingHeroImage]);

  useEffect(() => {
    if (landingHeroMedia && landingHeroMedia.length > 0) {
      setLocalLandingHeroMedia(landingHeroMedia);
    } else if (landingHeroImage) {
      setLocalLandingHeroMedia([{ id: 'hero-legacy', url: landingHeroImage, type: 'image', title: 'LANDING HERO' }]);
    } else {
      setLocalLandingHeroMedia([]);
    }
  }, [landingHeroMedia, landingHeroImage]);

  const handleLandingHeroUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      notify('이미지 또는 동영상 파일만 업로드 가능합니다.');
      return;
    }

    setIsUploadingLandingHero(true);
    try {
      let fileToUpload: File | Blob = file;
      if (isImage) {
        fileToUpload = await compressImage(file, 2560, 1600, 0.85);
      }
      const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
      const path = `hero/landing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const url = await uploadFileToR2(fileToUpload, path);
      
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').toUpperCase();
      const newItem: LandingHeroMediaItem = {
        id: `guest_media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url,
        type: isVideo ? 'video' : 'image',
        title: cleanTitle || (isVideo ? 'VIDEO SCENE' : 'PHOTO MOMENT')
      };

      setLocalLandingHeroMedia(prev => [...prev, newItem]);
      if (isImage && !localLandingHeroImage) {
        setLocalLandingHeroImage(url);
      }
    } catch (err) {
      console.error('Failed to upload landing hero media:', err);
      notify('게스트 랜딩 미디어 업로드에 실패했습니다.');
    } finally {
      setIsUploadingLandingHero(false);
    }
  };

  const handleReplaceLandingHeroMedia = async (index: number, file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      notify('이미지 또는 동영상 파일만 업로드 가능합니다.');
      return;
    }

    setReplacingLandingHeroIndex(index);
    try {
      let fileToUpload: File | Blob = file;
      if (isImage) {
        fileToUpload = await compressImage(file, 2560, 1600, 0.85);
      }
      const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
      const path = `hero/landing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const url = await uploadFileToR2(fileToUpload, path);
      
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').toUpperCase();
      setLocalLandingHeroMedia(prev => prev.map((m, idx) => idx === index ? {
        ...m,
        url,
        type: isVideo ? 'video' : 'image',
        title: cleanTitle || m.title || (isVideo ? 'VIDEO SCENE' : 'PHOTO MOMENT')
      } : m));

      if (index === 0 && isImage) {
        setLocalLandingHeroImage(url);
      }
    } catch (err) {
      console.error('Failed to replace landing hero media:', err);
      notify('게스트 랜딩 미디어 교체에 실패했습니다.');
    } finally {
      setReplacingLandingHeroIndex(null);
      setDragOverLandingHeroIndex(null);
    }
  };

  const handleRemoveLandingHeroMedia = (id: string) => {
    setLocalLandingHeroMedia(prev => prev.filter(item => item.id !== id));
  };

  const handleMoveLandingHeroMedia = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= localLandingHeroMedia.length) return;
    setLocalLandingHeroMedia(prev => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const savedHomeSnapshotRef = useRef({
    title: homeTitle || '',
    showMarquee: marqueeShow,
    homeMarquee: marqueeMessage || '',
    homeSpeed: marqueeSpeed || 50,
    landingHeroImage: landingHeroImage || '',
    landingHeroMedia: JSON.stringify(landingHeroMedia || []),
  });

  const isHomeDirty = useMemo(() => {
    const snap = savedHomeSnapshotRef.current;
    return (
      (title || '').trim() !== (snap.title || '').trim() ||
      showMarquee !== snap.showMarquee ||
      (homeMarquee || '').trim() !== (snap.homeMarquee || '').trim() ||
      homeSpeed !== snap.homeSpeed ||
      (localLandingHeroImage || '').trim() !== (snap.landingHeroImage || '').trim() ||
      JSON.stringify(localLandingHeroMedia || []) !== (snap.landingHeroMedia || '[]')
    );
  }, [title, showMarquee, homeMarquee, homeSpeed, localLandingHeroImage, localLandingHeroMedia, saveRevision]);

  const markSaved = () => {
    savedHomeSnapshotRef.current = {
      title,
      showMarquee,
      homeMarquee,
      homeSpeed,
      landingHeroImage: localLandingHeroImage,
      landingHeroMedia: JSON.stringify(localLandingHeroMedia || []),
    };
    setSaveRevision(prev => prev + 1);
  };

  const reset = () => {
    const homeSnap = savedHomeSnapshotRef.current;
    setTitle(homeSnap.title);
    setShowMarquee(homeSnap.showMarquee);
    setHomeMarquee(homeSnap.homeMarquee);
    setHomeSpeed(homeSnap.homeSpeed);
    setLocalLandingHeroImage(homeSnap.landingHeroImage || '');
    try {
      setLocalLandingHeroMedia(JSON.parse(homeSnap.landingHeroMedia || '[]'));
    } catch (_) {
      setLocalLandingHeroMedia([]);
    }
    setSaveRevision(prev => prev + 1);
  };

  // Only what the hub edits (title, ticker, landing media). Every other home field is left
  // undefined so App keeps its own current value, and the magazine is not touched.
  const save = async () => {
    await onSaveAllHomeSettings(
      title,
      homeSubtitle || '',
      heroJourneyIds || [],
      undefined,
      showMarquee,
      homeMarquee,
      homeSpeed,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      localLandingHeroImage,
      localLandingHeroMedia
    );
    markSaved();
  };

  const domain: DirtyDomain = { isDirty: isHomeDirty, save, reset, markSaved };

  return {
    domain,
    state: {
      title, setTitle, showMarquee, setShowMarquee, homeMarquee, setHomeMarquee, homeSpeed, setHomeSpeed,
      setLocalLandingHeroImage, localLandingHeroMedia, setLocalLandingHeroMedia, isUploadingLandingHero,
      isDraggingLandingHero, setIsDraggingLandingHero, replacingLandingHeroIndex, dragOverLandingHeroIndex,
      setDragOverLandingHeroIndex, handleLandingHeroUpload, handleReplaceLandingHeroMedia,
      handleRemoveLandingHeroMedia, handleMoveLandingHeroMedia,
    },
  };
}
