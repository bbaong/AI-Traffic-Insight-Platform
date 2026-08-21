import crypto from 'crypto';

const MOBILE_RE = /^01[016789]\d{7,8}$/;

function requireKey(name: 'PHONE_ENCRYPTION_KEY' | 'PHONE_HASH_PEPPER'): Buffer {
  const raw = process.env[name]?.trim();
  if (!raw) {
    throw new Error(`${name} 환경변수가 없습니다.`);
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(`${name}는 base64 디코딩 후 32바이트여야 합니다.`);
  }
  return buf;
}

/** 숫자만 */
export function digitsOnly(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '');
}

/** 01012345678 → 010-1234-5678 (11자리) / 10자리는 3-3-4 */
export function formatPhoneKr(digits: string): string {
  const d = digitsOnly(digits);
  if (d.length === 11) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  throw new Error('휴대폰 번호 길이가 올바르지 않습니다.');
}

export function assertValidMobile(phone: string): string {
  const d = digitsOnly(phone);
  if (!MOBILE_RE.test(d)) {
    throw new Error('휴대폰 번호만 허용됩니다. (예: 01012345678)');
  }
  return d;
}

/** 조회·UNIQUE용 HMAC (입력은 숫자만) */
export function hashPhone(digits: string): string {
  const d = digitsOnly(digits);
  const pepper = requireKey('PHONE_HASH_PEPPER');
  return crypto.createHmac('sha256', pepper).update(d, 'utf8').digest('hex');
}

/**
 * AES-256-GCM. 저장 문자열: base64(iv).base64(tag).base64(ciphertext)
 * 평문은 하이픈 형식(010-5234-1245)
 */
export function encryptPhone(displayPlain: string): string {
  const key = requireKey('PHONE_ENCRYPTION_KEY');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    cipher.update(displayPlain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    enc.toString('base64'),
  ].join('.');
}

export function decryptPhone(blob: string): string {
  const key = requireKey('PHONE_ENCRYPTION_KEY');
  const parts = String(blob ?? '').split('.');
  if (parts.length !== 3) {
    throw new Error('전화번호 암호문 형식이 올바르지 않습니다.');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

/** 저장용 한 번에: digits 검증 → display · hash · enc */
export function preparePhoneForStorage(rawPhone: string): {
  digits: string;
  display: string;
  phoneHash: string;
  phoneEnc: string;
} {
  const digits = assertValidMobile(rawPhone);
  const display = formatPhoneKr(digits);
  return {
    digits,
    display,
    phoneHash: hashPhone(digits),
    phoneEnc: encryptPhone(display),
  };
}

/** 목록 표시용 — 실패 시 마스킹 */
export function safeDecryptPhone(blob: string): string {
  try {
    // 마이그레이션 전 평문(하이픈) 호환
    if (/^01[016789]\d{0,2}-/.test(blob) || /^\d{10,11}$/.test(blob)) {
      return formatPhoneKr(blob);
    }
    return decryptPhone(blob);
  } catch {
    return '(복호화 실패)';
  }
}