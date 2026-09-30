// A person's name as people say it: 성+이름 for Korean ("홍길동"), "First Last" otherwise.
// Falls back to the sign-in display name, then the username; never the email.

interface NameParts {
  lastName?: string;
  firstName?: string;
  username?: string;
}

const HANGUL = /[가-힣]/;

export function personName(profile?: NameParts | null, displayName?: string | null): string {
  const last = (profile?.lastName || '').trim();
  const first = (profile?.firstName || '').trim();
  if (last || first) {
    return HANGUL.test(last + first) ? `${last}${first}` : [first, last].filter(Boolean).join(' ');
  }
  return (displayName || '').trim() || (profile?.username || '').trim();
}

