// Disk şifreleme durumunu OS'a göre tespit eder. UYGULAMA BitLocker/FileVault'u AÇMAZ — bu OS'un
// işidir ve kurtarma anahtarı sorumluluğu taşır (yanlış yönetilirse veri kaybı). Burada yalnızca
// durum OKUNUR ve "Güvenlik Durumu" ekranında gösterilir.
// NOT (Windows): manage-bde -status genelde YÖNETİCİ ister; uygulama normal kullanıcıyla çalışınca
// komut hata verir → "unknown". Bu bilinçli: yanlış "kapalı" göstermektense "bilinmiyor" deriz.
const { execFile } = require("child_process");

// Saf ayrıştırıcı (test edilebilir): platform + komut çıktısından "on"|"off"|"unknown" üretir.
// manage-bde/fdesetup çıktısı yerelleştirilmiş olabilir (TR/EN), o yüzden iki dile de bakılır.
function parseDiskEncryption(platform, stdout) {
  const s = String(stdout || "");
  if (platform === "darwin") {
    if (/FileVault is On/i.test(s)) return "on";
    if (/FileVault is Off/i.test(s)) return "off";
    return "unknown";
  }
  if (platform === "win32") {
    if (/Protection\s*Status\s*:?\s*Protection On|Koruma\s*Durumu\s*:?\s*Koruma Açık|Protection On/i.test(s)) return "on";
    if (/Protection Off|Koruma Kapalı|Fully Decrypted|Tümüyle Çözülmüş|Fully Decrypted/i.test(s)) return "off";
    return "unknown";
  }
  return "unknown";
}

function checkDiskEncryption() {
  return new Promise((resolve) => {
    const platform = process.platform;
    const done = (state) => resolve({ state, platform });
    if (platform === "darwin") {
      execFile("fdesetup", ["status"], { timeout: 8000 }, (err, stdout) =>
        done(err ? "unknown" : parseDiskEncryption(platform, stdout)));
    } else if (platform === "win32") {
      const drive = process.env.SystemDrive || "C:";
      execFile("manage-bde", ["-status", drive], { timeout: 12000, windowsHide: true }, (err, stdout) =>
        done(err ? "unknown" : parseDiskEncryption(platform, stdout)));
    } else {
      done("unknown");
    }
  });
}

module.exports = { parseDiskEncryption, checkDiskEncryption };
