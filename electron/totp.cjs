// İki adımlı doğrulama (TOTP — Google Authenticator uyumlu) + tek kullanımlık kurtarma kodları.
// Sunucu tarafında (electron main) çalışır; secret ve doğrulama tamamen yerel, internet gerekmez.
const crypto = require("crypto");
const { generateSecret: otpSecret, generateURI, generateSync, verifySync, createGuardrails } = require("otplib");

// otplib 12'nin `authenticator.generateSecret()`'i 10 baytlık (16 Base32 hane) anahtar üretiyordu ve
// 2FA'sı açık kullanıcıların veritabanındaki anahtarları bu uzunlukta. otplib 13 RFC 4226 gereği 16
// bayttan kısa anahtarı reddeder (SecretTooShortError); alt sınır yalnız bu eski anahtarlar çalışmaya
// devam etsin diye 10 bayta çekildi. Yeni anahtarlar 13'ün varsayılanıyla 20 bayt üretilir.
const KORUMA = createGuardrails({ MIN_SECRET_BYTES: 10 });
// ±30 sn tolerans (12'deki `window: 1` = ±1 adım): telefon ile sunucu saati birebir aynı olmasa da kod kabul edilsin.
const TOLERANS_SN = 30;

const SERVICE = "Altunmak CRM";

function generateSecret() { return otpSecret(); }
// Authenticator'a QR ile eklenecek otpauth:// URI'si
function keyuri(username, secret) { return generateURI({ issuer: SERVICE, label: username || "kullanici", secret }); }
// 6 haneli kodu secret ile doğrula (zaman penceresi dahil). `epoch` (saniye) yalnız testler içindir.
function verifyToken(token, secret, epoch) {
  if (!token || !secret) return false;
  try {
    return verifySync({ secret, token: String(token).replace(/\s/g, ""), epochTolerance: TOLERANS_SN, guardrails: KORUMA, ...(epoch != null && { epoch }) }).valid === true;
  } catch { return false; }
}
// Test/kolaylık: bir secret için o anki (ya da verilen andaki) geçerli kodu üret
function currentToken(secret, epoch) { return generateSync({ secret, guardrails: KORUMA, ...(epoch != null && { epoch }) }); }

// ── Kurtarma kodları (tek kullanımlık yedek) ─────────────────────────────────
function generateRecoveryCodes(n = 8) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex hane
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}
// Kurtarma kodları düz değil, hash'li saklanır (şifre gibi). Büyük/küçük ve boşluk duyarsız.
function hashRecovery(code) {
  return crypto.createHash("sha256").update(String(code).trim().toUpperCase().replace(/\s/g, "")).digest("hex");
}
// Verilen kod hash listesinde var mı? Varsa eşleşen hash'i döndür (tüketmek için), yoksa null.
function matchRecovery(code, hashes) {
  if (!code) return null;
  const h = hashRecovery(code);
  return Array.isArray(hashes) && hashes.includes(h) ? h : null;
}

module.exports = { generateSecret, keyuri, verifyToken, currentToken, generateRecoveryCodes, hashRecovery, matchRecovery };
