import React, { useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { notify } from '../../utils/feedback';

// iPhone · iPad → pocket (v1.3.6 6-c). iOS web apps cannot join the share sheet, so a Shortcut
// does it: it takes the shared link or text and opens /pocket?share_text=…, the same path the
// Android share target uses (utils/shareTarget picks the first web link out of it).

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function IosShortcutGuide({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const [open, setOpen] = useState(isIOS);
  const base = `${window.location.origin}/pocket?share_text=`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(base);
      notify('주소를 복사했습니다. 단축어의 텍스트 동작에 붙여 넣어 주세요.', 'success');
    } catch {
      notify(base, 'info');
    }
  };

  return (
    <section className={cardClass}>
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="flex items-center justify-between gap-2 text-left">
        <span className="flex flex-col gap-0.5">
          <span className={labelClass}>iPhone · iPad</span>
          <span className="text-[14px] font-bold">SNS 링크를 포켓에 담는 단축어</span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          <p className="text-meta text-black/60 dark:text-white/60 break-keep">
            한 번 만들어 두면 인스타그램 · 유튜브 · 블로그의 공유 버튼에서 <b>Tripgon 포켓에 담기</b>를 누를 때 포켓 담기 화면이 바로 열립니다.
            Android는 설치한 앱이 공유 목록에 이미 나옵니다.
          </p>
          <ol className="flex flex-col gap-2 pl-5 list-decimal text-[14px] leading-relaxed break-keep">
            <li><b>단축어</b> 앱 → 오른쪽 위 <b>+</b> → 이름을 <b>Tripgon 포켓에 담기</b>로.</li>
            <li>아래 <b>세부사항</b> 버튼 → <b>공유 시트에서 보기</b> 켜기. 받는 유형은 <b>URL</b>과 <b>텍스트</b>만 남깁니다.</li>
            <li>동작 추가 → <b>URL 인코딩</b>(입력: 단축어 입력).</li>
            <li>동작 추가 → <b>텍스트</b>에 아래 주소를 붙여 넣고, 끝에 변수 <b>인코딩된 텍스트</b>를 넣습니다.</li>
            <li>동작 추가 → <b>URL 열기</b>(입력: 텍스트). 완료.</li>
          </ol>
          <div className="flex items-center gap-2 min-w-0">
            <code className="flex-1 min-w-0 truncate font-mono text-meta px-3 h-9 leading-9 rounded-full bg-black/[0.05] dark:bg-white/10">{base}</code>
            <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={copy}>
              <Copy className="w-3.5 h-3.5" aria-hidden />복사
            </button>
          </div>
          <p className="text-meta text-black/55 dark:text-white/55 break-keep">단축어는 Safari로 열립니다. Safari에서도 Tripgon에 로그인해 두세요.</p>
        </div>
      )}
    </section>
  );
}
