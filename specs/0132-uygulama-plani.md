# 0132 uygulama planı: malzeme kataloğu ve malzemeden türeyen parça maliyeti

Spec: `specs/0132-malzeme-katalogu-ve-parca-maliyeti.md` (QA turu karar 1–23, plan turu Karar 24–34). Dal `feat/0132-malzeme`,
taban `cda169c9`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/gecerlilik.js` (yeni) | `gecerliGunMu`, `gecerlilikTarihiDogrula` ve tarih metinleri buraya taşınır; `urunAgaci` aynı adla yeniden dışa verir (Karar 24). |
| `src/lib/malzeme.js` (yeni) | Saf motor: biçimler, ağırlık, bant, kur, fire, boy yöntemi, eksiklik, fiyat geçmişi (yazıcı ve tarihli okuma), doğrulayıcılar, katalog haritası, kullanım, çöp etiketi, metinler. |
| `src/lib/urunAgaci.js` | Tek okuma yolu dördüncü parametre `malzemeKat`; öncelik set, malzeme, kırılım, elle; `setOzeti` listeyi bileşene indirir; `maliyetKaynagi` `malzeme` türü; `maliyetGecmisiYaz` `malzeme` kapısı. |
| `src/lib/makinaStandartMaliyet.js` | `modelMaliyetleri` ve `partiHesabi` veri nesnesinde `malzemeler`. |
| `src/lib/parcaAktarma.js` | Malzeme kaynaklı parçada maliyet hücresi alınmaz (`MALZEME_EXCEL_HATASI`), dışa aktarma çözülmüş maliyet. |
| `src/components/MalzemeManager.jsx`, `MalzemeFiyatPenceresi.jsx` (yeni) | Panel, kart, fiyat penceresi ve etki önizlemesi. |
| `src/components/PartManager.jsx` | Malzeme satırı bölümü, kaynak pasifliği, canlı ağırlık ve tutar, sayaç. |
| `Settings.jsx`, `MakinaMaliyeti.jsx`, `App.jsx` | Panel, prop zinciri (kur dahil), önbellek bağımlılıkları, durum, kayıt, birleştirme, temizlik. |
| `settings/SettingsTrash.jsx`, `SettingsBackup.jsx`, `SettingsExport.jsx`, `SettingsImport.jsx`, `SettingsAuditLog.jsx` | Çöp, yedek, aktarma, iz etiketi. |
| `src/lib/copKutusu.js`, `yedekPaketleri.js`, `bolumAdlari.js`, `kilitAlanlari.js`, `merge.js` | Tek etiket, paket, sözlük, kilit, birleştirme. |
| `electron/serverAuth.cjs`, `server.cjs`, `db.cjs` | Bölüm haritaları, sözlük, tablo `malzemeler`, `parts.malzemeSatiri`. |
| Testler | `malzeme-0132`, `malzeme-0132-kiyas` (+ `fixtures/0132-once.json`, `fixtures/0132-veri.js`), `ui/malzeme-0132`, `ui/malzeme-0132-parca`, `ui/malzeme-0132-app`; ek bloklar `merge`, `server-authz`, `server-security.cjs`, `db-roundtrip.cjs`, `db-clean-install.cjs`, `kilit-alanlari`, `yedek-paketleri-0086`, `parca-aktarma`. |

## 2. Tek okuma yolunun on üç çağrı yeri (C1/2)

1. `urunAgaci` set dalı, 2. tek parça dalı, 3. `setOzeti` bileşeni: `malzemeKat`. 4. `gecmisliKayit`: `malzeme` kapısı. 5. `maliyetKaynagi`:
`malzemeKat`. 6. `PartManager` sayacı, 7. tarih yoklaması (kapı), 8. formun canlı maliyeti (malzeme özeti), 9. liste hücresi ve kaynağı:
`malzemeKat`. 10. `makinaStandartMaliyet` model maliyeti: `malzemeKat` (veri nesnesinden). 11. `parcaAktarma` dışa aktarma: `malzemeKat`.
12. kırılım ve set denetimi: malzemeli parçaya ayrı kural (R21). 13. geçmiş kararı: kapı.

## 3. Adım sırası

1. Altın kıyas (spec öncesi kod). 2. Kanıt tabanı. 3. `gecerlilik.js` + `malzeme.js` + testi. 4. Okuma yolu. 5. Veri katmanı (db, sunucu,
sözlükler, birleştirme, yedek, kilit). 6. App. 7. Ekranlar (panel, pencere, parça kartı, çöp). 8. Okuyucular (maliyet motoru, Excel).
9. Testler, taramalar, mutasyonlar. 10. Sonra çekimi ve eşleme. 11. Tam takım, lint, belgeler.

## 4. Riskler ve kararlar

Spec'te Karar 24–34 (plan turu) ve Karar 35–40 (uygulama).

## 5. Kriter ↔ test eşlemesi

| Kriterler | Test |
|---|---|
| AC-2–4, 6, 7, 11–13, 16, 21–26, 29–46, 51, 53, 62–65, 67–71, 78–85, 90–93 | `malzeme-0132.test.js` |
| AC-56, 57, 58 | `malzeme-0132-kiyas.test.js` (+ saf test) |
| AC-1, 3–6, 8–10, 14–20, 27, 43, 47–50, 54, 55, 75, 76, 94, 95 | `ui/malzeme-0132.test.jsx` |
| AC-28–38 (ekran), 45, 46, 66, 84 | `ui/malzeme-0132-parca.test.jsx` |
| AC-52, 59, 85 (ekran), 87, 89 | `ui/malzeme-0132-app.test.jsx` |
| AC-87, 88 (ekran) | `ui/malzeme-0132-yedek.test.jsx` |
| AC-59, 60 | `merge.test.js` |
| AC-72–74 | `malzeme-0132.test.js` (Excel bloğu) |
| AC-77 | `server-authz`, `server-security.cjs` |
| AC-61, 87 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-86 | `kilit-alanlari` |
| AC-88 | `yedek-paketleri-0086` |

## 6. Triyaj (2026-11-05)

Dokuz bulgu düzeltildi; spec Karar 41–46. Kod: `malzeme.js` (belirsiz sayı, biçime göre kilo fiyatı eksikliği, et kalınlığı, etki önizlemesi tek okuma yolundan), `MalzemeFiyatPenceresi.jsx` (kayıtlı kurla açılış, gereksiz eslint susturması kalktı), `MalzemeManager.jsx` ("Günün kurunu kullan"), `urunAgaci.maliyetGecmisiYaz` (`malzemeKat` seçeneği) ve `PartManager.jsx` (`ek` ile geçirir), `parcaAktarma.js` (setin karşılaştırması malzeme listesiyle). Testler: `malzeme-0132` triyaj bloğu (bulgu 2–7), `ui/malzeme-0132` (bulgu 1, 2, 8; AC-9/AC-10 yeniden yazıldı, AC-48'in zorunlu kur girişi kalktı), `ui/malzeme-0132-parca` (bulgu 6), `ui/malzeme-0132-app` (AC-89'un zorunlu kur girişi kalktı). Kanıt: 39 ekran son kodla yeniden çekildi; taban raporu `docs/evidence/0132-taban-piksel-raporu.json` (son kodla iki çekim, 78 görüntü 0 fark; iki ekranın ilk taban çekiminde sağ kenardaki açılır liste okunda çıkan 71 piksellik gürültü yeniden çekimde sıfırlandı). Gerçek değişiklik yalnız dört fiyat penceresi görüntüsünde (kayıtlı kur ve "Günün kurunu kullan"); JPEG'leri yeniden üretildi.
