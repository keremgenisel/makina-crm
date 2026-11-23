# 0157 Uygulama planı: Parça maliyeti döviz cinsinden girilir

| | |
|---|---|
| **Spec** | `specs/done/0157-doviz-parca-maliyeti.md` (Onaylandı, 2026-11-23) |
| **Onay** | Takım Yöneticisi, 2026-11-23 ("tum onerilerini kabul ediyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0157-doviz-parca-maliyeti` (main `6a2b7b59` üstünde) |
| **Durum** | Tamamlandı (commit `0b88d517`) |

## 1. Dosyalar

- **`electron/db.cjs`:** `parts.maliyetParaBirimi` TEXT, `parts.maliyetKuru` REAL; dört nokta, okumada yalnız doluyken gövdeye. İşlem kaleminin ve geçmiş satırının döviz alanları JSON içinde (şema değişmez). Göç yok.
- **`src/lib/urunAgaci.js`:** modül içi tek okuyucu (elle döviz), `bugunkuKurus` ve işlem kaleminin tek çarpımı `gider.dovizdenLiraK` (C2/2); kardeş okuyucu `parcaDovizMaliyeti` (yalnız sipariş motoru); geçmişin üçlü tetikleyicisi ve döviz alanlarını koruyan okuma (`yeniDoviz` seçeneği); tek yazıcı ve doğrulama (tutar ayrıştırıcısı ile kur ayrıştırıcısı ayrı); işlem kaleminin para birimi ve kuru; liste metni ve Excel hücreleri (P3); metin sabitleri.
- **`src/lib/maliyetKalemleri.js`:** `ESKI_MALIYET_ANAHTARLARI` iki yeni alanı kapsar (P2).
- **`src/components/Settings.jsx`, `PartManager.jsx`, `MaliyetKalemleriAlani.jsx`:** günün kuru parça paneline iner (R2/3); para birimi seçici ve kur (yalnız Elle sabit kipinde), öneri, çevrimdışı nedeni, sapma uyarısı, lira karşılığı; işlem kalemi satırında aynısı; liste hücresi ve geçmiş listesi döviz metniyle.
- **`src/lib/parcaAktarma.js`:** 12–13. sütun okunur ve yazılır (0158'in reddi kalkar), kur altı ondalık, hata hâlleri (R18/5, P7), örnek satır (P6).
- **`src/lib/siparisIhtiyaci.js`, `src/lib/siparisRaporu.js`:** hazır parçanın ve işlem kaleminin tutarı kendi para biriminde, lira karşılıkları ayrı; işlemler toplamı para birimi başına; yeni anahtarlar yalnız dövizde (C6/2).
- **Testler:** `doviz-parca-0157` (motor, geçmiş, Excel, sipariş ve belge, taramalar), `ui/doviz-parca-0157` (kart, kalem, liste, geçmiş, pencere), `ui/doviz-parca-0157-app` (gerçek App), `ui/doviz-parca-0157-kiyas` (`0157-once.json`, `0157-veri.js`), `db-roundtrip.cjs`, `db-clean-install.cjs`; güncellenenler "spec 0157 ile".

## 2. Adım sırası

1. Kıyas altını spec öncesi koddan (main worktree), lira profilli fikstürün profili ayrıca ölçülür. 2. `db.cjs`. 3. Motor. 4. Arayüz. 5. Excel. 6. Sipariş motoru ve belge. 7. Eski testler, mutasyon. 8. Tam takım, lint, kanıt, CLAUDE.md, sürüm notu.

## 3. Kararlar

Spec'te P1–P10 (plan turunda verilen kararlar).

## 4. Kriter ↔ test

| Kriterler | Test |
|---|---|
| AC-1, AC-3–AC-6, AC-17, AC-47, AC-48, AC-50, AC-58 (ekran) | `ui/doviz-parca-0157` (kart) |
| AC-2, AC-33, AC-57, AC-61 | `ui/doviz-parca-0157-kiyas` (altın + fikstür profil ölçümü) |
| AC-7–AC-9, AC-12, AC-14–AC-16, AC-37, AC-40, AC-41, AC-52, AC-60 | `doviz-parca-0157` (motor) |
| AC-10, AC-11, AC-45, AC-46 | `ui/doviz-parca-0157` (kayıt fonksiyonu, geçmiş listesi) |
| AC-13, AC-59 | `ui/doviz-parca-0157` (kalem satırı) + motor |
| AC-18, AC-32, AC-51 | `ui/doviz-parca-0157` (liste, sayaç) + motor |
| AC-19–AC-23, AC-62 | `doviz-parca-0157` ("değişmedi": satış fiyatı, Model Maliyetleri, Parti Hesabı, set) + tarama |
| AC-24, AC-25, AC-38, AC-39 | `doviz-parca-0157` (sipariş motoru, iki nüsha) |
| AC-26 | `ui/doviz-parca-0157` (pencerede para yok) |
| AC-27–AC-31, AC-44, AC-53–AC-55 | `doviz-parca-0157` (Excel) |
| AC-34, AC-35, AC-56, AC-58 (kaynak) | `doviz-parca-0157` (taramalar, P3 ve P8 istisnaları adıyla) |
| AC-36, AC-42, AC-43 | `db-roundtrip.cjs`, `db-clean-install.cjs` + motor |
| AC-49 | `ui/doviz-parca-0157-app` (gerçek App) |

## 5. Sürüm notu

- **Önce sunucu PC, sonra bütün istemciler; güncelleme bitene kadar döviz maliyet girilmez.** Güncellenmemiş bilgisayar döviz maliyeti lira sanar (maliyet, ondan türeyen satış fiyatı ve makina maliyeti kur katı kadar düşük görünür) ve o parçayı düzenlerse para birimi ile kuru düşürür. Güncellenmemiş sunucu PC'nin `parts` tablosunda iki sütun yoktur; alanlar bir sonraki yüklemede kaybolur.
- Kur değişince maliyet kendiliğinden değişmez; parça kartından güncellenir (X1).
