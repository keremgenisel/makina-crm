# 0077 Uygulama Planı: Kaydedilemedi Hatası, Kaybolan Silmeler ve Kayıt Perdesi

| | |
|---|---|
| **Bağlı spec** | `specs/0077-kayit-hatasi-ve-kayit-perdesi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0077-kayit` (`feat/0075-tevkifat` `5b118af` üstünde, R37) |
| **Onay** | Takım Yöneticisi, 2026-10-07: bütün öneriler (S1–S14) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Birleştirmenin elinde yalnız iki blob var; tabansız "deletedAt'te yerel kazanır" kuralı başka PC'nin silmesini diriltir
  (S2 → R14).
- `custom_models` tablosunun anahtarı model adı, kayıtta `id` yok; birleştirme `x.id` ile eşlediği için bölüm hiç
  çalışmazdı (S3 → R30).
- Sunucu PC'deki `onDataChanged` itmesi de `pendingSave`'i silip yeniden yüklüyor (S7 → R9).
- AC-58 ile R1 çelişiyordu (S5 → R38, AC-58).
- Perde eşiği "bekliyor"dan ölçülürse LAN'da her kayıtta flaş (S4 → R19).
- Yeniden kimliklendirilen parçanın adedi `stokEtkisi` yolundan zaten doğuyor (S9 → R32).

## 2. Dosyalar

- Saf: yeni `src/lib/kayitDurumu.js` (nedenler, mesaj tablosu, yeniden deneme, bastırma, veri yenileme kapısı, perde
  kararı), `src/lib/kayitSirasi.js` (dönüş şekli), `src/lib/merge.js` (yedi bölüm, kimlik alanı, `silmeler`, remap,
  parça stok çıktısı, firma).
- IPC: `electron/ipc/data.cjs` (`crm:save` `{ ok, sebep }`).
- Arayüz: `src/App.jsx`, yeni `src/components/KayitPerdesi.jsx`, `src/lib/theme.js` (`perdeBg`).
- Sunucu: `electron/server.cjs` (yalnız yorum).
- Testler: yeni `tests/kayit-durumu-0077.test.js`, `tests/ui/kayit-hatasi-0077.test.jsx`,
  `tests/ui/kayit-perdesi-0077.test.jsx`; ek bloklar `tests/merge.test.js`, `tests/kayit-sirasi.test.js`,
  `tasarim-kontrast`, `scripts/tests/server-security.cjs`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0077-*`.
- Belgeler: `CLAUDE.md`.

## 3. Kararlar

S1 → R37 · S2 → R14 · S3 → R30 · S4 → R19, R45 · S5 → R38, AC-58 · S6 → R39 · S7 → R9, R45 · S8 → R33 ·
S9 → R32 · S10 → R40 · S11 → R41 · S12 → R42 · S13 → R43 · S14 → R44.

## 4. Adım sırası

1. Dal; taban ayrı çalışma ağacından (`5b118af`), üç parçada.
2. A: nedenler, dönüş şekli, mesajlar, yeniden deneme.
3. B: veri yenileme kapısı (iki yoklama + `onDataChanged`).
4. C: `silmeler` (tabanla) ve App'te ayrı geçiş.
5. E: yedi bölüm, remap, parça stok çıktısı, firma.
6. D: perde, token, zamanlama.
7. Tam takım, Electron testleri, lint; görsel kanıt; `CLAUDE.md`, sürüm notu.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–5, 8, 9 | `kayit-durumu-0077` + `ui/kayit-hatasi-0077` + kaynak taraması |
| AC-51 | `kayit-sirasi.test.js` |
| AC-6, 7, 52, 53 | `ui/kayit-hatasi-0077` |
| AC-10–15, 17, 54, 55 | `kayit-durumu-0077` + `ui/kayit-hatasi-0077` |
| AC-16 | kaynak taraması |
| AC-18, 19, 23, 24, 56 | `merge.test.js` C + kaynak taraması |
| AC-20, 21, 22 | `ui/kayit-hatasi-0077` (gerçek App) |
| AC-25–28, 30–34, 57 | `ui/kayit-perdesi-0077` |
| AC-29 | `tema-degisken`, `tasarim-kontrast` |
| AC-35 | `server-security.cjs` + kaynak taraması |
| AC-58 | kaynak taraması |
| AC-36–48, 59, 60 | `merge.test.js` E + kaynak taraması |
| AC-49, 50 | kaynak taraması + `ui/kayit-hatasi-0077` yerel mod |

## 6. Uygulama notları

- `crm:save`'in istemci kolu 403/429/5xx'te artık `server:error` yayınlamaz; istemci yalnız ağ hatasında salt okunur
  moda düşer (eskiden bir yetki reddi bile bütün uygulamayı çevrimdışı gösteriyordu).
- `failedSaveRef` yalnız `govdeSaklanirMi` nedenlerde dolar: çakışmayı birleştirme, oturumu giriş ekranı çözer,
  yetki hatası aynı gövdeyle yine reddedilir; üçü çevrimiçine dönüşte yeniden gönderilmez.
- Tükenme mesajı ("sunucu yanıt vermedi") kendi bastırma anahtarıyla basılır: aynı nedenin "yeniden denenecek"
  uyarısı 20 sn bastırma penceresini doldurduğu için sonuç hiç söylenmiyordu (`ui/kayit-hatasi-0077` AC-7 yakaladı).
- `uyariGosterilsinMi` ilk uyarıyı (hiç kaydı olmayan anahtar) her zaman gösterir; ilk sürüm "son zaman 0" sayıp
  saatin küçük olduğu testte bastırıyordu.
- `mergeLocalIntoReloaded`'in `apply`'ı kimliği `kimlikOf` ile okur (`customModels` adla eşlenir); silme geçişi
  `silmeUygula` ayrı satırlardır ve yalnız `SILME_KORUNAN` bölümlerde çalışır.
- `mergeLocalIntoReloaded`'deki teklif özel dalı tabansız "yerel `deletedAt` kazanır" kuralını da uyguluyordu (başka PC'nin
  çöpten geri aldığı teklifi bu PC yeniden silerdi; R14'ün tarif ettiği hata). Dal kaldırıldı, teklifler genel taban
  kuralına bırakıldı; `satisTamam` ve `uretilenKalemler` birleşimi aynen (`ui/kayit-hatasi-0077` R14 testi).
- **Triyaj bulgu 1 (R35a):** stock birleşmeye alınınca başka PC'nin sattığı makina (stok satırı diziden çıkar)
  birleştirmede stoğa geri ekleniyordu. `buildMergePlan` artık kimliği tabanda olup sunucuda olmayan kaydı eklemez
  (`merge.test.js` "bulgu 1" bloğu: B sattı, A çakıştı, makina stoğa dönmez).
- **Güncellenen eski testler:** `stok-hareketi.test.js` AC-17 (0065 X5: makina stoğu artık birleşir) ve
  `kilit-alanlari.test.js` AC-23/AC-36 (0064: dört katalog listesi artık birleşir; `standardModels` dışarıda).
- Gerçek App testlerinin ayırt ediciliği mutasyonla ölçüldü: taban `null` verilince AC-20/21, kapı kaldırılınca AC-10/11/14,
  teklif dalı geri konunca R14 testi düşüyor.
- Sunucu PC'nin `onDataChanged` itmesi de kapıdan geçer (S7); kapı App'te tek yardımcıdır (`yenilemeSerbestMi`,
  üç çağrı, kaynak taraması).
- Görsel kanıt (triyaj bulgu 3): taban `5b118af` çalışma ağacından, 620 görüntü; `0077-piksel-raporu.json`'da 618 mevcut
  görüntü 0 piksel, perde iki temada yeni ekran; `0077-taban-piksel-raporu.json` perdeyi 0 piksel tekrarlar. İlk turda
  üç ekranda (servis formu ödendi, yedek parça formu kargo, kasalı menü karanlık) 37–249 piksel çıktı; iki ağaçtan
  aynı turda yeniden çekilince 0 oldu (zamanlama kaynaklı), rapor bu çekimlerle kuruldu. Koruma `kayit-durumu-0077`
  "görsel kanıt" bloğu.
- Görsel kanıt: yeni `kayit-perdesi` ekranı (gider formu penceresinin üstünde perde); diğer ekranlar 0 piksel
  beklenir. Perde `tasarim.jsx` kullanmadığı için `kanit-eslemesi.json` kaydı yok.

## 7. Sürüm notu

> **Kayıt uyarıları ve kaybolan silmeler düzeltildi.** "Değişiklikler kaydedilemedi" uyarısı artık yalnız gerçek bir
> hatada çıkıyor; başka bir kullanıcıyla çakışmada "değişiklikleriniz birleştirildi" bilgisi görünür. Peş peşe silinen
> kayıtlar artık geri gelmiyor; bayiler, notlar, makina stoğu, parça, kalıp ve parça türü tanımları ile özel makina
> modelleri çakışmada da korunuyor. Kayıt uzun sürerse kısa bir "Kaydediliyor" perdesi görünür. **Bütün istemcileri
> güncelleyin** (mesaj ve birleştirme yolu istemcide değişti; sunucuda ek koşul yok).
