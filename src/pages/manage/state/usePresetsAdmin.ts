import React, { useState, useMemo, useEffect, useRef } from 'react';
import { doc } from 'firebase/firestore';
import { setDoc } from '../../../utils/ownership';
import { db } from '../../../firebase';
import { PresetTripPlan, getSavedPresets, restoreDefaultPresets, saveAllPresets } from '../../../data/worldDestinations';
import type { DirtyDomain } from './dirtyDomain';

// Trip recommendation templates (SYSTEM › starting setup), users/public/settings/presets
export function usePresetsAdmin() {
  const [saveRevision, setSaveRevision] = useState(0);
  const [presetsList, setPresetsList] = useState<PresetTripPlan[]>(() => getSavedPresets());
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
  const [presetThemeFilter, setPresetThemeFilter] = useState<string>('all');
  const [editingPreset, setEditingPreset] = useState<PresetTripPlan | null>(null);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [presetToDelete, setPresetToDelete] = useState<PresetTripPlan | null>(null);
  const [showRestorePresetsConfirm, setShowRestorePresetsConfirm] = useState<boolean>(false);

  // Snapshot of saved Presets state for dirty checking
  const savedPresetsSnapshotRef = useRef<string>(JSON.stringify(getSavedPresets()));

  // Listen to external preset changes (e.g. from CreateTripModal or other windows)
  useEffect(() => {
    const handlePresetsChanged = () => {
      const current = getSavedPresets();
      setPresetsList(current);
      savedPresetsSnapshotRef.current = JSON.stringify(current);
    };
    window.addEventListener('tripPresetsChanged', handlePresetsChanged);
    return () => window.removeEventListener('tripPresetsChanged', handlePresetsChanged);
  }, []);

  // PRESET Management Handlers
  const handleOpenNewPreset = () => {
    setEditingPreset({
      id: `preset_custom_${Date.now()}`,
      title: '',
      subtitle: '',
      country: '',
      city: '',
      durationDays: 4,
      tags: [],
      coverImg: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      theme: 'culture',
      highlights: [],
      schedule: [],
      isCustom: true
    });
    setIsPresetModalOpen(true);
  };

  const handleOpenEditPreset = (preset: PresetTripPlan) => {
    setEditingPreset({ ...preset, highlights: [...preset.highlights] });
    setIsPresetModalOpen(true);
  };

  const handleSavePresetModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset || !editingPreset.title.trim()) return;
    const nextList = [...presetsList];
    const idx = nextList.findIndex(p => p.id === editingPreset.id);
    if (idx >= 0) {
      nextList[idx] = { ...editingPreset, isCustom: true };
    } else {
      nextList.unshift({ ...editingPreset, isCustom: true });
    }
    setPresetsList(nextList);
    setIsPresetModalOpen(false);
    setEditingPreset(null);
  };

  const handleDeletePresetClick = (preset: PresetTripPlan) => {
    setPresetToDelete(preset);
  };

  const handleConfirmDeletePreset = () => {
    if (!presetToDelete) return;
    const nextList = presetsList.filter(p => p.id !== presetToDelete.id);
    setPresetsList(nextList);
    setPresetToDelete(null);
  };

  const handleConfirmRestorePresets = () => {
    const restored = restoreDefaultPresets();
    setPresetsList(restored);
    savedPresetsSnapshotRef.current = JSON.stringify(restored);
    setShowRestorePresetsConfirm(false);
  };

  const isPresetsDirty = useMemo(() => {
    return (savedPresetsSnapshotRef.current || '[]') !== JSON.stringify(presetsList);
  }, [presetsList, saveRevision]);

  const markSaved = () => {
    savedPresetsSnapshotRef.current = JSON.stringify(presetsList);
    setSaveRevision(prev => prev + 1);
  };

  const domain: DirtyDomain = {
    isDirty: isPresetsDirty,
    save: async () => {
      try {
        saveAllPresets(presetsList);
        await setDoc(doc(db, 'users', 'public', 'settings', 'presets'), {
          presets: presetsList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.warn('Firestore presets sync notice:', fErr);
      }
      markSaved();
    },
    reset: () => {
      if (savedPresetsSnapshotRef.current) {
        try {
          setPresetsList(JSON.parse(savedPresetsSnapshotRef.current));
        } catch (_) {}
      }
      setSaveRevision(prev => prev + 1);
    },
    markSaved,
  };

  return {
    domain,
    state: {
      presetsList, presetSearchQuery, setPresetSearchQuery, presetThemeFilter, setPresetThemeFilter,
      editingPreset, setEditingPreset, isPresetModalOpen, setIsPresetModalOpen, presetToDelete, setPresetToDelete,
      showRestorePresetsConfirm, setShowRestorePresetsConfirm, handleOpenNewPreset, handleOpenEditPreset,
      handleSavePresetModal, handleDeletePresetClick, handleConfirmDeletePreset, handleConfirmRestorePresets,
      isPresetsDirty,
    },
  };
}
