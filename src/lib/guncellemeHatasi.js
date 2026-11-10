// Güncelleme denetiminin ham hata metnini (electron-updater: HTTP durum kodu, istek adresi, yanıt başlıkları ve HTML gövdesi)
// kullanıcıya okunur tek cümleye çevirir (kullanıcı isteği 2026-11-10: GitHub 504 yanıtı ekranda başlıklarıyla basılıyordu).
// Saf: React almaz.
export const SUNUCU_ULASILAMADI = "Güncelleme sunucusuna şu an ulaşılamıyor (GitHub geçici olarak yanıt vermedi). Biraz sonra Tekrar Dene'ye basın.";
export const BAGLANTI_YOK = "İnternet bağlantısı yok ya da güncelleme sunucusuna erişilemiyor. Bağlantıyı denetleyip Tekrar Dene'ye basın.";
export const YAYIN_BULUNAMADI = "Yayın bilgisi bulunamadı (güncelleme dosyası yayında yok). Biraz sonra Tekrar Dene'ye basın.";
export const BILINMEYEN_HATA = "Güncelleme denetlenemedi.";
const SINIR = 160;

export const guncellemeHataMetni = (ham) => {
  const t = String(ham ?? "").trim();
  if (!t) return BILINMEYEN_HATA;
  // HTTP durum kodu: electron-updater mesajı "504 \"method: GET ..." ya da "HttpError: 503 ..." biçiminde başlar.
  const kod = Number((t.match(/(?:^|HttpError:\s*|status(?:Code)?[ =:]+)(\d{3})\b/i) || [])[1]);
  if (kod >= 500 && kod <= 599) return SUNUCU_ULASILAMADI;
  if (kod === 404) return YAYIN_BULUNAMADI;
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ESOCKETTIMEDOUT|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_NETWORK|ERR_CONNECTION|ERR_TIMED_OUT|net::/i.test(t)) return BAGLANTI_YOK;
  if (/time[- ]?out|timed out/i.test(t)) return SUNUCU_ULASILAMADI;
  // Tanınmayan hata: yalnız ilk satır, başlık ve HTML dökümü kesilir.
  const ilk = t.split(/\r?\n|\\n/)[0].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return ilk.length > SINIR ? `${ilk.slice(0, SINIR - 1)}…` : ilk || BILINMEYEN_HATA;
};
