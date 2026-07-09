// İki adımlı doğrulama (TOTP — Google Authenticator uyumlu) + tek kullanımlık kurtarma kodları.
// Sunucu tarafında (electron main) çalışır; secret ve doğrulama tamamen yerel, internet gerekmez.
const crypto = require("crypto");
const { authenticator } = require("otplib");

// ±1 adım (±30 sn) tolerans: telefon ile sunucu saati birebir aynı olmasa da kod kabul edilsin.
authenticator.options = { window: 1 };

const SERVICE = "Altunmak CRM";

function generateSecret() { return authenticator.generateSecret(); }
// Authenticator'a QR ile eklenecek otpauth:// URI'si
function keyuri(username, secret) { return authenticator.keyuri(username || "kullanici", SERVICE, secret); }
// 6 haneli kodu secret ile doğrula (zaman penceresi dahil)
function verifyToken(token, secret) {
  if (!token || !secret) return false;
  try { return authenticator.check(String(token).replace(/\s/g, ""), secret); } catch { return false; }
}
// Test/kolaylık: bir secret için o anki geçerli kodu üret
function currentToken(secret) { return authenticator.generate(secret); }

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
