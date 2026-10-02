import { createContext, useContext } from 'react';

// Whether the hub around a component is the one on screen. Hub drawers are kept alive after their first visit, so a
// hub that was left is still mounted; anything it puts on the page itself (an attribute on <html> that hides the
// tab bar, say) has to follow this, or it outlives the visit. Outside a drawer (the web) a hub is always visible.
export const HubVisibleContext = createContext(true);
export const useHubVisible = () => useContext(HubVisibleContext);
