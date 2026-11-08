# 0133 uygulama planı: satış fiyatının maliyetten türemesi

Spec: `specs/0133-satis-fiyati-maliyetten-turer.md` (QA turu 28 bulgu, plan turu Karar 29–40). Dal `feat/0133-satis-fiyati` (`../wt0133`), taban main `fd589a0d`. Plan Takım Yöneticisi'nin 2026-11-08 onayıyla; on iki önerinin hepsi kabul edildi.

## 1. Dosyalar

**Yeni**
- `src/lib/parcaFiyati.js`: satış fiyatının TEK okuma yolu (R10, R10/2, AC-51, AC-55). Kip (`fiyatKipiOf`, `maliyeteBagliMi`, `kipYaz`), kat doğrulayıcısı (`katDogrula`: belirsiz sayı, pozitif, ≤ 100, üç ondalığa yuvarlama, `zarar` işareti), ayar (`fiyatAyariOf`, `YUVARLAMA_SECENEKLERI`), bağlam (`fiyatBaglamiKur`), türetme (`turetilmisFiyat`, `parcaSatisFiyati`, `formSatisFiyati`, `setFiyatOkuyucu`), gösterim (`turetilmisFiyatSayisi`, `turetilmisFiyatMetni`), toplu kip (`topluKipOzeti`, metinler) ve tek neden kümesi. Kat ve yuvarlama çarpımı kaynakta yalnız burada (C3).
- `src/lib/fiyatListesiRaporu.js` + `src/components/rapor/FiyatListesiDugmesi.jsx`: fiyat listesi (R17/2, 0134 emsali).
- `src/components/settings/SettingsFiyat.jsx`: Ayarlar › Uygulama › Fiyat Ayarları (R20).
- Testler: `tests/parca-fiyati-0133.test.js`, `tests/parca-fiyati-0133-kiyas.test.jsx`, `tests/ui/parca-fiyati-0133.test.jsx`, `tests/ui/parca-fiyati-0133-satis.test.jsx`, `tests/ui/parca-fiyati-0133-app.test.jsx`; fikstürler `tests/fixtures/0133-veri.js`, `0133-once.json` (spec öncesi koddan, `YAZ_0133=1`), `0133-etki-girdisi.js`, `0133-etki-once.json`, `0133-yeni-ayar.js`.

**Değişen**
- `electron/db.cjs`: `parts.fiyatKipi TEXT`, `parts.karKati REAL`, `app_settings.fiyatAyarlari TEXT` (dört nokta; kip yalnız `"maliyet"` yazılır, boş değer okumada gövdeye girmez).
- `electron/serverAuth.cjs`: `AYAR_ALAN_SEKMELERI.fiyatAyarlari: ["settings"]` (R21, açık eşleme).
- `src/lib/urunAgaci.js`: `setOzeti`'nin isteğe bağlı beşinci parametresi `fiyatOku` (Karar 30); `setFiyatsizMetni` iki nedeni söyler (R22/2).
- `src/lib/malzeme.js`: `fiyatEtkisi`'nin isteğe bağlı beşinci parametresi (R16/2, opt-in), `fiyatEtkiMetni`.
- `src/lib/parcaAktarma.js`: dışa aktarma türetilmiş TL fiyatı, içe aktarma maliyete bağlı parçanın TL hücresini almaz (R18, R19, R19/2, `FIYAT_EXCEL_HATASI`).
- Satış ekranları: `Documents.jsx`, `ServiceForm.jsx`, `YedekParcaSatisForm.jsx`, `stock/PartStokTab.jsx` tek yoldan okur.
- Prop zinciri (Karar 31, 32): `App.jsx` → `Customers` → `CustomerDetailModal`; `Stock` → `PartStokTab`, `YedekParcaSatisTab`; `ServisPanosu` (sekme, kiosk, ayrı pencere), `ServisPencere` (salt okunur `malzemeler`), `SimpleDealers`. Her ekran bağlamı bir kez kurar, formlar yalnız bağlam alır.
- `PartManager.jsx`: fiyat bölümü (`FiyatAlani`), kip süzgeci, toplu kip, liste hücresi, set düğmesinin pasifliği, fiyat listesi düğmesi.
- `MalzemeFiyatPenceresi.jsx`, `MalzemeManager.jsx`: fiyat etkisi (R16).
- `Settings.jsx`, `kilitAlanlari.js` (`AYAR_KILITLI.fiyat`, panel dosyası), `SettingsAuditLog.jsx` (etiketler), `SettingsExport.jsx`, `SettingsImport.jsx`.
- `docs/tasarim-sozlugu.md`: fiyat kipi süzgecinin notu; kayan satır atıfları.

Yeni veri bölümü yok, yeni eylem izni yok.

## 2. Adım sırası

1. Kıyas altını (C4/2): yedi kalem spec öncesi koddan.
2. Veri ve sunucu eşlemesi.
3. Saf modül ve testleri.
4. Satış ekranlarının bağlanması ve prop zinciri (kıyas yeşil kalmalı).
5. Parça kartı, liste, süzgeç, toplu kip, set düğmesi.
6. Fiyat Ayarları paneli, zam penceresi, Excel, fiyat listesi.
7. Görsel kanıt, tam takım, lint, mutasyon.

## 3. Riskler ve kararlar (onaylanan öneriler)

1. **Tam liralık form girdileri (Karar 29):** servis sepeti ve yedek parça satırı `MoneyInput` ile tam lira; türetilmiş fiyat bu iki formda yukarı tam liraya yuvarlanır (`formSatisFiyati`), Evrak ve listeler kuruşlu.
2. **Set toplamı (Karar 30):** maliyet motoru fiyat bilmez; parça kartı `setOzeti`'ye okuyucu verir.
3. **Bayi ekranı (Karar 31)** ve **ekran başına bağlam (Karar 32).**
4. **Ayar alanı (Karar 33):** `app_settings.fiyatAyarlari` JSON, boşken NULL. Boşaltılan ayar `undefined` yazılır, anahtar silinmez; yükleme yolu alanı gövdeden açıkça alır (0091 R24/4 ve yükleme yolu dersi).
5. **AC-11/12, AC-29/49 dili (Karar 34), toplu işlem ve liste aynı süzülmüş küme (Karar 35).**
6. **Kat alanı düz metin (Karar 36)**, **fark kartta (Karar 37)**, **rapor 0134 deseni (Karar 38)**, **kanıt süreci (Karar 39)**, **kiosk ek izin istemez (Karar 40).**

Uygulamada bulunan (spec Karar 41–43): `malzeme.js` ↔ `parcaFiyati.js` döngüsel içe aktarması modül düzeyindeki takma adı (`KAT_BELIRSIZ_HATASI = BELIRSIZ_HATASI`) yükleme sırasına göre `undefined` bırakıyor, belirsiz kat sessizce kabul ediliyordu. Sabit çağrı anında okunur; tarama testi var. Toplu kip onayı onay simgesiyle açılır (Karar 42); boşaltılan fiyat ayarı `undefined` yazılır ve yükleme yolu alanı açıkça alır (Karar 43).

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1, AC-3–AC-7, AC-9–AC-15, AC-23, AC-31, AC-33, AC-34, AC-54, AC-60–AC-66, AC-68, AC-93, AC-94 | `parca-fiyati-0133` (motor) |
| AC-2, AC-5, AC-6, AC-7, AC-9, AC-14, AC-18, AC-23, AC-26–AC-30, AC-32, AC-49, AC-50, AC-60–AC-64, AC-70, AC-77–AC-80, AC-84, AC-86–AC-89 | `ui/parca-fiyati-0133` |
| AC-8, AC-62, AC-65, AC-66, AC-67, AC-83, AC-84, AC-97 | `ui/parca-fiyati-0133` (Fiyat Ayarları) |
| AC-16, AC-17, AC-19, AC-20, AC-24, AC-31, AC-33–AC-37, AC-56, AC-57, AC-58, AC-59, AC-69, AC-86 | `ui/parca-fiyati-0133-satis` |
| AC-48, AC-56, AC-58, AC-98 | `ui/parca-fiyati-0133-app` (gerçek App) |
| AC-21, AC-51–AC-53, AC-74, AC-78, AC-81, AC-82, AC-85, AC-90, AC-92, AC-96, C3/2 | `parca-fiyati-0133` (taramalar) |
| AC-22, AC-71, AC-72 | `parca-fiyati-0133`, `ui/parca-fiyati-0133` |
| AC-25, AC-41, AC-90, AC-91 | `parca-fiyati-0133` (fiyat listesi) |
| AC-38–AC-40, AC-73, AC-74 | `parca-fiyati-0133` (etki, altın) |
| AC-42–AC-44, AC-75, AC-76 | `parca-fiyati-0133` (Excel) |
| AC-45, AC-46, AC-95 | `parca-fiyati-0133-kiyas` (altın, spec öncesi kod) |
| AC-47, AC-80, AC-94 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-81 | `server-authz` 0133 bloğu |
| AC-54 (0087 AC-6 ters) | `urun-agaci-0087` AC-6 ("spec 0133 ile") |

## 5. "Spec 0133 ile" güncellenen bekçiler

`urun-agaci-0087` (AC-6 deseni ve fiyat yarısı), `hammadde-0096` (AC-44: iki Segment adla), `set-aramasi-0122` (AC-31 imzası), `maliyet-gecmisi-0097` (kayıt fonksiyonuna `tlKoru`), `malzeme-0132` ve `ui/set-icerigi-0121` (dışa aktarma imzası), dokuz "yeni ayar alanı yok" bekçisi (`tests/fixtures/0133-yeni-ayar.js` ayıklaması).

## 6. Sürüm notu

Önce sunucu PC, sonra istemciler. Güncellenmemiş istemci parça kaydında `fiyatKipi`/`karKati` alanlarını taşır ama okumaz; bir parçayı düzenlerse alanlar korunur (kayıt yayılır). Güncellenmemiş sunucu iki sütunu bilmez ve düşürür; güncelleme bitene kadar parçalar maliyete bağlanmaz. Varsayılan kâr katı boş doğar: Ayarlar › Uygulama › Fiyat Ayarları'ndan girilmeden maliyete bağlı parçanın fiyatı türemez.
