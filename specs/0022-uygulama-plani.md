# 0022 Uygulama Planı: Üretim Partisi ve Parti Bazlı Maliyet

| | |
|---|---|
| **Bağlı spec** | `specs/0022-uretim-partisi.md` (R2, plan onayıyla onaylandı) |
| **Durum** | Uygulandı, commit bekliyor. 2026-09-27: P1–P10 onaylandı; spec R2; görünüm TY onaylı. Dal `feat/0022-uretim-partisi`. |
| **Önkoşul** | 0001 (gider), 0002 (makina maliyeti), 0008 (yayın perdesi), 0021 (dal tabanı) |

---

## 0. Kodda doğrulanan dayanaklar (2026-09-27)

| Konu | Bulgu |
|---|---|
| Ortak pay | `makinaMaliyeti.js` `hesaplaMakinaMaliyetleri`: `uretilenAy` haritası, ay döngüsünde `pay = floor(ortak / n)`, artık ilk makinaya; üretim yoksa `dagitilmamis`. |
| Makina sırası | `makinaSirasi` (üretim tarihi, seri, tür, kimlik) = 0002 R17c. |
| Damgalama | `satisKaydi.uretimTarihiDamgala`; `Customers.jsx:257, :265` satışta çağırıyor. |
| Dönen stok | `Customers.jsx:432` yeni stok satırına `uretimTarihi: donenStokUretimTarihi(...)`. |
| Dönem özeti | `karlilikOzeti.stokta` (R19/AC-74) ve `dagitilmamis`. |
| Sunucu | `GIDER_BOLUMLERI`, `BOLUM_SEKMELERI`, `EYLEM_IDLERI` (`tedarikciler`/`standartGiderler` deseni). |
| Perde | Gider modülü üretimde `GIDER_PERDESI` arkasında; türevler `giderYetki`'ye bakar. |
| Kalem zamanı | Gider kalemlerinde oluşturulma zamanı yok: "sonradan eklendi" ancak anlık görüntüyle ölçülür (P3). |

## 1. Kararlar

| No | Karar |
|---|---|
| P1 | Ay içi artık, en önce üretilmiş makinası olan hak sahibine; parti içi artık ilk üretilen makinaya. |
| P2 | Partili makinanın ortak payı üretim tarihine bakmaz; yürürlük öncesi parti ayları sayılmaz; bütün ayları öncesiyse "veri yok". |
| P3 | Kapanışta `kapanisOrtaklari` anlık görüntüsü; bugünkü ay ortağı farklıysa uyarı satırı. |
| P4 | Uyarı Giderler > Makina ve Model'de, düşen atamaların yanında. |
| P5 | Adedi 0 olan açık parti hak sahibi değil; listede ipucu. |
| P6 | `BOLUM_SEKMELERI` `["gider", "stock"]`; `GIDER_BOLUMLERI`'ne eklenir. *(Triyaj: `stock` etkisizdi, çıkarıldı; §5.)* |
| P7 | Stok formunda parti seçici yalnız `giderYetki` ile; yazma stok izinleriyle. |
| P8 | Parti listesinde havuz toplamı ve makina başı pay; açık partide "geçici" rozeti. |
| P9 | AC-9 metni R7'ye uyduruldu: "Geçici: parti kapanınca bu ibare kalkar." |
| P10 | Ay tablosunu birebir karşılaştıran mevcut test kırılırsa tek tek onaya gelir. |

## 2. Adım sırası

1. Koruma testleri (AC-6, AC-7, AC-8, AC-12 bugünkü kodda yeşil).
2. Motor (`makinaMaliyeti.js`), yardımcılar (`uretimPartisi.js`, `satisKaydi.partiDamgala`).
3. DB, sunucu, merge.
4. Damgalama ve dönen stok (Customers).
5. Arayüz: Giderler > Üretim Partileri, stok formu, maliyet detayı, kârlılık, Makina ve Model.
6. Tam koşu, lint.
7. Görsel kanıt, TY onayı.
8. Belgeler.

## 3. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-22, AC-23 | `uretim-partisi.test.js` + `ui/uretim-partisi` |
| AC-2, AC-20 | `uretim-partisi.test.js` + `ui/uretim-partisi` |
| AC-3, AC-4, AC-5, AC-15, AC-17, AC-18, AC-19 | `uretim-partisi.test.js` |
| AC-6, AC-7, AC-8, AC-12 | `uretim-partisi.test.js` + mevcut `makina-maliyeti.test.js` |
| AC-9, AC-10, AC-13, AC-16 | `uretim-partisi.test.js` + `ui/uretim-partisi` |
| AC-11 | `uretim-partisi.test.js` + `ui/uretim-partisi` |
| AC-14 | `uretim-partisi.test.js` + `ui/uretim-partisi` |
| AC-21 | `ui/uretim-partisi` (gerçek Customers silme akışı) + motor |
| C4, C5 | `db-roundtrip`, `db-clean-install`, `merge`, `server-authz`, `server-security.cjs` |

## 4. Uygulama notları (2026-09-27)

- **Motor:** `makinaMaliyeti.js` ay tablosu hak sahibi bölmesi (`partiPaylari`), parti havuzu dağıtımı, `partiler` özeti (havuz, makina başı pay, `degisimler`), `karlilikIc` `parti`/`gecici`, `karlilikOzeti.stokta.partiler`. Yardımcılar `uretimPartisi.js` (`partiDogrula`, `partiAylari`, `partiKapanisUygula`, `partiMakinaSayisi`), `satisKaydi.partiDamgala`. Parti yokken mevcut maliyet testleri değişmeden yeşil (P10: kırılan test çıkmadı).
- **Kanıt:** 236 çekim; değişen yalnız Giderler ekranları (görünüm sekmelerine "Üretim Partileri"), yeni parti ekranları ve stok formu (`0022-piksel-raporu.json`, 52 JPEG). **Tarih Aralığı kipinde altı sekme tek satıra sığmıyor** ("Makina Kârlılığı" alt satıra iner); içerik genişliği ve kısa etiket denendi, sığmadı. TY kararı: kaydırma kalır (0014'ün dar pencere davranışı).
- **Belgeler:** `CLAUDE.md` 0022 bölümü (0002 X9'un geri açıldığı yazılı); tarihli notlar `specs/done/0002` R2, R11, X9; sözlük satır numaraları (Giderler.jsx 183/200/224); `tests/spec-atiflari.test.js` `TASINACAK`'a 0022 dosyaları.

## 5. Triyaj düzeltmeleri (2026-09-27)

- **Bulgu 1:** tarihsiz partili makina parti havuzundan pay alıyor ama özetler üretim tarihi istediği için hiçbir satırda görünmüyordu. Özetlerde tarih `ozetTarihi` (üretim tarihi, yoksa partinin başlangıç ayının ilk günü); "bilinmiyor" ve kâr hesaplanabilirliği de buna bakar. Model havuzu tarihe bakmaya devam eder. Test `uretim-partisi` (stokta 2 makina / 1.000 ₺, satış özeti).
- **Bulgu 2:** başlangıcı gelecek aydaki açık parti "yürürlük öncesi / veri yok" sayılıyordu. Motor `partiBaslamadi` ayrı durumu (pay 0, veri yok değil); maliyet detayı "Parti henüz başlamadı (ay)" der. Testler `uretim-partisi` + `ui/uretim-partisi`.
- **Bulgu 3:** `BOLUM_SEKMELERI.uretimPartileri` yalnız `["gider"]`; `stock` etkisizdi (stok bağı `stock` bölümünde; gider bölümü K6 aynasıyla zaten korunuyor). Yorum ve spec C5'e tarihli not. Test `server-authz`; `server-security.cjs`'deki stok kullanıcısı senaryosu değişmeden geçer.
