import { useEffect, useState } from 'react';
import { subscribeFriends, type Friend } from '../../utils/friends';

/** This member's friends, live (empty when signed out) */
export function useFriends(uid: string | null | undefined): { friends: Friend[]; loaded: boolean } {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    if (!uid) { setFriends([]); return; }
    return subscribeFriends(list => { setFriends(list); setLoaded(true); });
  }, [uid]);
  return { friends, loaded };
}
