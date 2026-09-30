// Modifier key label for shortcut hints: ⌘ on Apple keyboards, Ctrl elsewhere
export const shortcutMod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl ';
