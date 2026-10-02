import { Camera, Coffee, Lightbulb, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react';
import type { PocketCategory } from '../../types';

// A spot's category is told by its icon and its label, never by a colour of its own. One list for the pocket hub,
// the spot sheet and the scrap sheet. The key order is the order the hub's filter shows them in.

export const CATEGORY_META: Record<PocketCategory, { label: string; icon: LucideIcon }> = {
  food: { label: 'FOOD', icon: Utensils },
  cafe: { label: 'CAFE', icon: Coffee },
  spot: { label: 'SPOT', icon: Camera },
  shopping: { label: 'SHOP', icon: ShoppingBag },
  tip: { label: 'TIP', icon: Lightbulb },
};

/** The order a form offers them in */
export const CATEGORY_FORM_ORDER: PocketCategory[] = ['spot', 'food', 'cafe', 'shopping', 'tip'];
