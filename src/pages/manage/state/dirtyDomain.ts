// One editable part of the manage hub (landing, weather cities, presets). The hub shell asks each
// part whether it changed and saves, resets or re-baselines them together (P5-b3-2b).
export interface DirtyDomain {
  isDirty: boolean;
  /** Write the current values; the part re-baselines itself on success */
  save: () => Promise<void>;
  /** Put the last saved values back */
  reset: () => void;
  /** Treat the current values as saved */
  markSaved: () => void;
}
