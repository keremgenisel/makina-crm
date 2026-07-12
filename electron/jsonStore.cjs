// At-rest şifreli JSON dosya deposu (istemci veri önbelleği gibi hassas blob'lar için).
// safeStorage (Windows DPAPI / macOS Keychain) varsa dosya şifreli yazılır; yoksa düz metne
// düşülür ve eski düz metin dosyalar okunmaya devam eder (bir sonraki yazımda şifrelenir).
// Biçim: [MAGIC | safeStorage.encryptString(json)]  ya da  düz UTF-8 JSON.
const fs = require("fs");
const { safeStorage } = require("electron");

const MAGIC = Buffer.from("ENCJSON1\0", "utf-8");

function available() {
  try { return !!safeStorage?.isEncryptionAvailable?.(); } catch { return false; }
}

// Atomik yaz (tmp + rename). safeStorage varsa şifreli.
function writeJson(p, obj) {
  const json = JSON.stringify(obj);
  const tmp = p + ".tmp";
  if (available()) fs.writeFileSync(tmp, Buffer.concat([MAGIC, safeStorage.encryptString(json)]));
  else fs.writeFileSync(tmp, json, "utf-8");
  fs.renameSync(tmp, p);
}

function readJson(p) {
  const buf = fs.readFileSync(p);
  if (buf.length >= MAGIC.length && buf.subarray(0, MAGIC.length).equals(MAGIC)) {
    return JSON.parse(safeStorage.decryptString(buf.subarray(MAGIC.length)));
  }
  return JSON.parse(buf.toString("utf-8")); // eski düz metin
}

module.exports = { writeJson, readJson, MAGIC };
