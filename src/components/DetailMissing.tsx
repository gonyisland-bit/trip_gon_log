import React, { useEffect, useState } from 'react';
import { DetailSkeleton } from './EditorialSkeleton';
import { EmptyScene } from './scenes/EmptyScene';

/**
 * A journey page whose journey is not in the lists: gone, or a link that is not ours. The skeleton waits a moment
 * (a journey just made takes a beat to arrive), then the page says so and leads back, instead of loading for ever.
 */
export function DetailMissing({ onBack }: { onBack: () => void }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 1800);
    return () => window.clearTimeout(t);
  }, []);
  if (!gone) return <DetailSkeleton />;
  return (
    <div className="min-h-[70dvh] flex items-center justify-center px-4">
      <EmptyScene kind="lost" title="여정을 찾을 수 없어요" copy="지워졌거나 볼 수 없는 여정입니다. 목록에서 다시 골라 주세요." action={{ label: '여정 목록으로', onClick: onBack }} />
    </div>
  );
}
