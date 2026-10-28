# 0114 Uygulama planı: ihraç kayıtlı fatura satış tipine eklenir

Spec `specs/done/0114-ihrac-kayitli-fatura.md` (plan turu Karar 27–41, triyaj Karar 42). Tamamlandı: uygulama commit `e3768a8`. Dal `feat/0114-ihrac-kayitli`, taban `68fc888` (v3.51.0).

## 1. Dosyalar

**Yeni**
- `src/lib/ihracKayitli.js`: kapı, seçim çevrimi (`satisTipiSecimi`, `satisTipiUygula`), tek yazıcı (`ihracKayitliUygula`), doğrulama, form taşıyıcısı (`ihracKayitliFormu`), dışa aktarma hücreleri, rozet gösterim kuralı ve bütün metinler.
- `src/components/SatisTipiSecici.jsx`: dört formun ortak satış tipi seçicisi (servis `ihracDahil={false}`).
- `src/components/IhracKayitliAlani.jsx`: açıklama, ibare ve Kopyala, fatura notu, yedek parça sınırı, KDV kutusu özeti, teal rozet.
- Testler: `tests/ihrac-kayitli-0114.test.js`, `tests/ui/ihrac-kayitli-0114.test.jsx`, `tests/ui/ihrac-kayitli-0114-app.test.jsx`, `tests/ui/ihrac-kayitli-0114-giderler.test.jsx` (Giderler kartı ayrı dosyada: 0081'in kutuAc taraması), `tests/ui/ihrac-kayitli-0114-kiyas.test.jsx`; veri `tests/fixtures/0114-veri.js`, spec öncesi altın `tests/fixtures/0114-once.json`.

**Değişen**
- Motor: `utils.js` (`ihracKayitliEtkinMi`, `satisKdvBolumu`, `tahsilKdvOrani`), `satisTevkifat.js` (kart tabanı `ihracTaban`, eskime denetimleri, özet), `gider.js` (`kdvKarsilastir` adlandırılmış seçeneği), `giderKdv.js` (`ertelenen`), `aylikRapor.js` (`ihracKayitliTeslim`), `printTemplates.js` (kutu ve iki dipnot).
- Yazım yolları: `Customers.jsx` (iki kol), `kalipSatisi.js` (`kalipSatisOrtak`, `kalipGuncelle`, `kalipSatisiEkle` doğrulaması), `yedekParcaSatis.js` (`yedekParcaRec`, `yedekParcaGuncelle`).
- Formlar: `CustomerAddEditForm.jsx`, `PartSaleForm.jsx`, `YedekParcaSatisForm.jsx`, `ServiceForm.jsx` (yalnız seçici), `SatisTevkifatAlani.jsx` (pasif dal, kart uyarısı iki dalda).
- Ekranlar: `MachineTimeline.jsx`, `YedekParcaSatisTab.jsx`, `CustomerDetailModal.jsx` (borç satırı, iki form açılışında `ihracKayitliFormu`), `PaymentSection.jsx`, `KdvKarsilastirmaKarti.jsx`, `Finance.jsx`, `Giderler.jsx`, `SettingsExport.jsx`.
- Veri: `electron/db.cjs` (dört nokta, üç tablo).
- Testler: `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs`, `server-security.cjs`, `tests/server-authz.test.js`, `tests/tasarim-kontrast.test.js`; "spec 0114 ile" genişletilen dört test (§4).
- Kanıt ve belge: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0114-*`, `kanit-eslemesi.json`, `docs/tasarim-sozlugu.md` (satır atıfları ve rozet notu), `CLAUDE.md`.
- Dokunulmayanlar (tarama): `SALE_TYPES`, `normalizeSaleType`, `isFaturali`, `isYurtIci`, `serverAuth.cjs`, `server.cjs`, `merge.js`, `giderRaporu.js`, `theme.js`.

## 2. Adım sırası

0. Çalışma kopyası `../wt0114`, Electron kurulumu, README satırı.
1. AC-30 altını kod değişmeden (`YAZ_0114=1`).
2. Motor ve saf testler. 3. Yazım yolları ve veritabanı. 4. Arayüz. 5. Testler ve bozmalar. 6. Kanıt, belge, tam takım.

## 3. Kararlar

Spec'teki Karar 27–41. Uygulamada bulunan iki şey: alan alan kurulan iki düzenleme formu işareti taşımıyordu (Karar 38, düzeltildi ve ölçüldü); spec'in ölçüm 12'si 0095'in iki tam eşitlikli kıyasını kaçırmıştı (Karar 39).

## 4. Ters çevrilen kriterler

Yok. Dört testin metni, iddiası korunarak genişledi ("spec 0114 ile" notlu): `tests/ucretsiz-yedek-parca-0095-kiyas.test.js` ve `tests/ui/ucretsiz-yedek-parca-0095-kiyas.test.jsx` (dışa aktarma satırı önek + boş ek sütun), `tests/musteri-durumu-0106.test.js` AC-30 (iki okuma regex'i yeni alanı kabul eder), `tests/satis-tevkifat-0079.test.js` AC-28 (tevkifat sütunları sondan üçüncü ve dördüncü).

## 5. Kriter ↔ test

S = `tests/ihrac-kayitli-0114.test.js`, U = `tests/ui/ihrac-kayitli-0114.test.jsx`, A = `tests/ui/ihrac-kayitli-0114-app.test.jsx`, K = `tests/ui/ihrac-kayitli-0114-kiyas.test.jsx`, E = Electron betikleri.

| AC | Test |
|---|---|
| 1–4, 12 | U "seçici dört formda" |
| 5, 28 | A "eklenen makina …" |
| 6, 7, 64 | A (makina iki kol; Extra Kalıp ve toplu yedek parça), S "AC-64 (saf yarısı)", "AC-64 (0111 yolu)", C12 taraması |
| 8 | S "AC-8 / R6" |
| 9 | U "AC-9" |
| 10, 56 | A "AC-10 / AC-56", U "AC-56", S "AC-10 (saf yarısı)" |
| 11 | S "AC-11" (Karar 32: ekranı yok) |
| 13 | S "AC-12 (saf yarısı) / AC-13 / R8" |
| 14–17 | S "B: KDV'nin tek kapısı" |
| 18, 57 | S "tahsil oranı ve kart tabanı", U "AC-57 (ekran)" |
| 19, 20, 59 | S "AC-19", "AC-20", "AC-59 (rapor yarısı)", U "AC-24 / … / AC-59" |
| 21 | S "AC-21" |
| 22, 23, 27 | U Finans |
| 24–26, 58 | S "AC-24", "C11, AC-58 (saf yarısı)", U Finans kartı, `ui/ihrac-kayitli-0114-giderler` (Giderler kartı, var ve yok) |
| 29 | S "AC-29 / C9" |
| 30 | K (spec öncesi altın) |
| 31–35 | U "işaret açıkken form" |
| 36–40, 61–63, 66 | U "rozet ve Kalan Borç satırı", S "AC-66" |
| Karar 42 (triyaj 2) | U "Karar 42 (triyaj 2, R9)" |
| C5 (triyaj 3) | U "C5 (triyaj 3)": servis formu ve kaydedilen servis `ihracKayitli` anahtarı taşımaz |
| 41 | S "AC-41 / R28" |
| 42–48, 60, 68–70 | S "E: aylık rapor kutusu" (triyaj 1: partili yedek parça ve Extra Kalıp tek teslim), "AC-46 / AC-47 / R33" |
| 49–51 | E `db-roundtrip.cjs`, `db-clean-install.cjs` |
| 52 | `server-authz` 0114 bloğu, E `server-security.cjs` |
| 53 | S "AC-53" |
| 54, 55 | S "adlar ve kapı", "AC-55" |
| 65 | U "AC-65", S "AC-65 (yedek parça)" |
| 67 | U "AC-67", S seçim çevrimi |
| R26/3 | `tasarim-kontrast` ("İhraç kayıtlı rozeti") |

**Bozma ölçümleri:** Extra Kalıp ve toplu yedek parça formlarından işaret taşıyıcısının kaldırılması, müşteri düzenleme kolunun yazıcısız kalması, pasif tevkifat dalının kaldırılması, kart tabanı işaretinin kaldırılması, rapor kutularının sırasının ters çevrilmesi, GBP kovasının TL'ye düşmemesi, ücretsizde silmemesi ve müşteri okumasının alanı ayıklamaması; triyajda ayrıca rapor anahtarının (yedek parça ve Extra Kalıp) kayıt başına yapılması, servis formunun seçimi `...a` ile yayması ve KDV hücresinin alt satırının kaldırılması; hepsi en az bir testi kırdı.

**Görsel kanıt:** `docs/evidence/0114-piksel-raporu.json` (spec öncesi kod ↔ bu iş, 50 görüntü: var olan 14 ekran iki temada 0 piksel, 11 yeni `*-0114` ekranı bilinçli değişti), `0114-taban-piksel-raporu.json` (son kodla iki çekim, 0 fark).

## 6. Sürüm notu

Makina, Extra Kalıp ve yedek parça satışında satış tipi listesine "İhraç Kayıtlı" eklendi. Kendi ürettiğimiz malı ihracatçı bir firmaya ihraç edilmek şartıyla sattığımızda seçilir: fatura KDV'li kesilir ama KDV müşteriye borç yazılmaz, Toplam Alacak'a ve Ödenmesi Muhtemel KDV'ye girmez. Formda faturaya yazılacak 11/1-c ibaresi kopyalanabilir biçimde durur (uygulama yurt içi fatura basmaz). Ertelenen KDV müşteri detayında ve Stok'ta rozetle, Finans ve Giderler'in KDV Karşılaştırması kartında bilgi satırıyla, Aylık Faaliyet Raporu'nda "İhraç Kayıtlı Teslimler" kutusuyla görünür; dışa aktarma raporlarına iki sütun eklendi. Servis bu kapsamda değildir. **Önce sunucu PC, sonra bütün istemciler güncellenmelidir.** Güncellenmemiş bir bilgisayar işaretli bir kaydı düzenlerse işaret kalıcı olarak silinir ve makinanın kalan borcu KDV dahil yeniden yazılır; bütün bilgisayarlar güncellenene kadar bu seçenek kullanılmamalıdır.

## 6b. Kapanış sonrası ek düzeltme (Karar 43)

Müşteri listesinin Fatura sütunu (`Customers.jsx`) ve Makina Geçmişi'nin satış olayı (`deriveCustomerDetail.js` `tip`, `MachineTimeline.jsx`) satış tipini `satisTipiSecimi`'nden, rengini `satisTipiPilStili`'nden okur; iki ekran `SALE_TYPE_STYLE`'ı artık doğrudan okumaz (tarama). Testler: U "Ek düzeltme (satış tipi pili)" iki test, S "Ek düzeltme: satış tipi pilinin rengi"; iki bozmayla ölçüldü. Kanıt `0114b-piksel-raporu.json` (liste, gruplu liste, 0106 pilleri, 0079 detayı ve müşteri formu 0 piksel; yeni `musteriler-0114-pil` ve iki 0114 detay ekranı değişti), taban `0114b-taban-piksel-raporu.json` (0 fark). Sürüm notuna eklenecek cümle: "Müşteri listesinde ve makina geçmişinde ihraç kayıtlı satış kendi pilini taşır."

## 6c. Rapor ayrıntısı (Karar 44, 45)

`aylikRapor.js`: `ftEkle` kaydı alır ve ihraç kayıtlı kaydı "İhraç Kayıtlı" satırına koyar (`FT_SIRA`: Faturalı Yurtiçi'nin arkasında); `satisDetay.faturaTipi` `satisTipiSecimi`; `kdvBol` etiket (firma, tür) alır ve iki kutu için `detay` biriktirir. `printTemplates.js`: iki kutunun altında `detayTablo`. Testler: S "AC-46 / Karar 44", üç "Karar 45" testi, "Karar 44 / 45 (çıktı)"; ters çevrilen "AC-44 / Karar 44" (eski AC-68); genişletilen `satis-tevkifat-0079` AC-43 (nesne `detay` taşır, toplamlar kutuya eşit) ve AC-30 kıyası (tevkifat detayı iki taraftan ayıklanır, ayıklamanın iş yaptığı ölçülür). Üç bozmayla ölçüldü. Sürüm notuna eklenecek cümle: "Aylık Faaliyet Raporu'nda ihraç kayıtlı satışlar fatura tipi kırılımında kendi satırında görünür; tevkifatlı satışlar ve ihraç kayıtlı teslimler firma firma listelenir."

## 7. Açık bulgular

- **Extra Kalıp düzenleme formu tevkifatı taşımıyor (0079'dan beri).** `CustomerDetailModal.openEditPartSale` tevkifat alanlarını forma kopyalamıyor; tevkifatlı bir Extra Kalıp düzenlenip kaydedilince tevkifat siliniyor. Bugünkü veride tevkifatlı Extra Kalıp yok (spec ölçüm 3). Düzeltme tek satır ve testle gelmeli; ayrı iş (spec'in README satırında ve `CLAUDE.md`'de de yazılı).
