import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export interface AdminApprovalEmailPayload {
  user: UserProfile;
  adminEmail: string;
  origin: string;
}

/**
 * Sends an email notification to the administrator requesting user approval.
 * Strategy:
 * 1. Saves a 'pendingNotification' record in Firestore so ManageHub shows pending badge.
 * 2. Queues the email in Firestore 'mail' collection (Firebase Trigger Email Extension standard).
 * 3. Sends via Web3Forms API (no backend needed, delivers to any email via API key).
 * 4. Falls back to Formspree if Web3Forms fails (recipient fixed to form owner).
 */
export async function sendAdminApprovalNotification(
  user: UserProfile,
  targetAdminEmail?: string
): Promise<boolean> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://trip-gon-log.vercel.app';
    let adminEmail = targetAdminEmail?.trim();

    // 1. If admin email not provided, lookup dynamic admin email from Firestore
    if (!adminEmail) {
      try {
        const adminDoc = await getDoc(doc(db, 'users', 'public', 'settings', 'admin'));
        if (adminDoc.exists()) {
          const data = adminDoc.data();
          adminEmail = data.superAdminEmail || data.adminEmail || data.allowedAdmins?.[0] || 'gonyisland@naver.com';
        }
      } catch (lookupErr) {
        console.warn('Failed to lookup admin email from settings, using default:', lookupErr);
      }
    }

    if (!adminEmail) {
      adminEmail = 'gonyisland@naver.com';
    }

    const fullName = `${user.lastName} ${user.firstName}`.trim() || '신규 신청자';
    const approveUrl = `${origin}/?approve_uid=${user.uid}&token=${user.approvalToken || ''}`;
    const applyDate = user.createdAt ? new Date(user.createdAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR');

    const subject = `[TRIPGON LOG] 신규 회원 가입 승인 요청 - ${fullName} (@${user.username || user.email})`;
    const textContent = `
[TRIPGON LOG - 회원 가입 승인 요청]

새로운 회원이 가입을 신청하였습니다.
아래 회원 정보를 확인하신 후 승인 링크를 클릭하여 가입을 승인해 주세요.

───────────────────────────────────────
• 성명: ${fullName}
• 아이디: @${user.username || '-'}
• 이메일: ${user.email}
• 전화번호: ${user.phone || '미기재'}
• 생년월일: ${user.birthdate || '미기재'}
• 신청일시: ${applyDate}
───────────────────────────────────────

▶ [원클릭 즉시 가입 승인 링크]
사이트 관리자 모드에 직접 로그인하지 않고도 아래 링크를 클릭하시면 즉시 승인됩니다:
${approveUrl}

(본 메일은 TRIPGON LOG 가입 승인 시스템에서 자동으로 발송되었습니다.)
`.trim();

    const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #111827;">
  <div style="border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px;">
    <span style="font-size: 11px; font-weight: 700; color: #dc2626; letter-spacing: 2px; text-transform: uppercase;">TRIPGON LOG MEMBERSHIP</span>
    <h2 style="font-size: 20px; font-weight: 900; margin: 4px 0 0 0; color: #000000; text-transform: uppercase;">신규 회원 가입 승인 요청</h2>
  </div>

  <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 20px;">
    새로운 회원이 가입을 신청하였습니다. 정보를 확인하신 후 아래 <strong>[가입 승인]</strong> 버튼을 클릭해 주세요.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
    <tbody>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 14px; font-weight: 700; width: 90px; color: #6b7280;">성명</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #111827;">${fullName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 14px; font-weight: 700; color: #6b7280;">아이디</td>
        <td style="padding: 10px 14px; font-family: monospace; color: #dc2626;">@${user.username || '-'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 14px; font-weight: 700; color: #6b7280;">이메일</td>
        <td style="padding: 10px 14px; font-family: monospace; color: #111827;">${user.email}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 14px; font-weight: 700; color: #6b7280;">전화번호</td>
        <td style="padding: 10px 14px; font-family: monospace; color: #111827;">${user.phone || '미기재'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: 700; color: #6b7280;">신청일시</td>
        <td style="padding: 10px 14px; font-family: monospace; color: #6b7280;">${applyDate}</td>
      </tr>
    </tbody>
  </table>

  <!-- One-Click Approve Action Button -->
  <div style="text-align: center; margin: 32px 0 24px 0;">
    <a href="${approveUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; border-radius: 4px; text-transform: uppercase;">
      가입 승인 (APPROVE ACCOUNT)
    </a>
  </div>

  <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 16px;">
    버튼이 클릭되지 않는 경우 아래 링크를 브라우저 주소창에 직접 붙여넣으세요:<br />
    <a href="${approveUrl}" style="color: #dc2626; word-break: break-all;">${approveUrl}</a>
  </p>
</div>
`.trim();

    // 2. Save pending notification record to Firestore (visible in ManageHub)
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`), {
        uid: user.uid,
        email: user.email,
        fullName,
        username: user.username,
        phone: user.phone,
        approveUrl,
        createdAt: user.createdAt || Date.now(),
        notified: false,
      }, { merge: true });
    } catch (notifErr) {
      console.warn('Failed to save pending approval record:', notifErr);
    }

    // 3. Queue in Firestore 'mail' collection (Firebase Trigger Email extension standard)
    try {
      await addDoc(collection(db, 'mail'), {
        to: adminEmail,
        message: {
          subject,
          text: textContent,
          html: htmlContent,
        },
        createdAt: Date.now(),
        status: 'pending',
      });
    } catch (firestoreErr) {
      console.warn('Firestore mail queue notice:', firestoreErr);
    }

    // 4. Send via Web3Forms (delivers to any email, just needs access_key)
    // Web3Forms free plan: 250 submissions/month, no backend, no CORS issues
    // Access key tied to admin email - set VITE_WEB3FORMS_KEY in Vercel env
    const web3formsKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WEB3FORMS_KEY) || '';
    if (web3formsKey) {
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: web3formsKey,
            to: adminEmail,
            subject,
            from_name: 'TRIPGON LOG',
            name: `신규 가입 신청: ${fullName}`,
            email: user.email,
            message: textContent,
            html: htmlContent,
          }),
        });
        const json = await res.json();
        if (json.success) {
          return true;
        }
      } catch (w3Err) {
        console.warn('Web3Forms notification skipped:', w3Err);
      }
    }

    // 5. Formspree fallback (sends to form owner's registered email)
    try {
      await fetch('https://formspree.io/f/mqkenvba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: subject,
          _replyto: user.email,
          adminEmail,
          applicantName: fullName,
          applicantUsername: user.username,
          applicantEmail: user.email,
          applicantPhone: user.phone,
          approveUrl,
          message: textContent,
        }),
      });
    } catch (webhookErr) {
      console.warn('Formspree notification skipped:', webhookErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to dispatch admin approval email:', err);
    return false;
  }
}
