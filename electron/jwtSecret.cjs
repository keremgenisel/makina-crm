// JWT imza anahtarının nereden geleceğine/nereye yazılacağına dair SAF karar (I/O yok, test edilebilir).
// Amaç: anahtarı DB'de (data.db meta) düz metin tutmak yerine OS anahtarlığında (safeStorage:
// Windows DPAPI / macOS Keychain) şifreli tutmak. Sızan bir yedek/çalınan disk ile kalıcı admin
// token üretilememesi için. Mevcut kurulumlarda DB'deki eski anahtar KORUNARAK taşınır, böylece
// göç sırasında istemci oturumları (aynı anahtarla imzalı token'lar) geçersiz olmaz.
//
// Öncelik: safeStorage dosyasındaki anahtar > DB'deki eski anahtar (göç) > yeni üretilen.
//   - fileSecret varsa: onu kullan, hiçbir yere yazma.
//   - yoksa dbSecret'i (varsa) ya da generated'ı kullan; safeStorage varsa dosyaya yaz ve
//     DB'deki düz metni temizle (clearDb). safeStorage yoksa eski davranışa düş (DB'de tut).
function planSecret({ fileSecret, dbSecret, generated, canEncrypt }) {
  if (fileSecret) return { secret: fileSecret, writeFile: false, clearDb: false, dbFallback: false };
  const secret = dbSecret || generated;
  if (!canEncrypt) return { secret, writeFile: false, clearDb: false, dbFallback: true };
  return { secret, writeFile: true, clearDb: !!dbSecret, dbFallback: false };
}

module.exports = { planSecret };
