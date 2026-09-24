# 0002: Uygulama Planı, Makina Maliyeti ve Kârlılık

| | |
|---|---|
| **Bağlı spec** | `specs/0002-makina-maliyeti-ve-karlilik.md` (R5) |
| **Durum** | 2026-09-24: M1–M12 önerilerinin tamamı kullanıcı tarafından kabul edildi; uygulama başladı (branch `feat/0001-gider` üzerinde). |
| **Önkoşul** | 0001 uygulandı ve triyajı kapandı (commit `565b0ff`, `7957a1f`). |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve
spec'in kodla çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar M1–M12) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Gerçek satış bedeli | `fabrikaSatisBedeli > 0 ? o : faturaBedeliOf(c)`; `faturaBedeliOf` faturasızda 0 döner. Finans ve aylık rapor bu kuralı **ayrı ayrı** yazmış | `aylikRapor.js:77`, `Finance.jsx:~155`, `utils.js:287` |
| İkinci el | Devir **aynı müşteri kaydını** değiştirir: `isResale:true`, `prevOwners[]`'a eski sahip eklenir; `installDate`, bedeller, `komisyon`, `sourceStockId` dokunulmaz. Yani `isResale` kaydı **fabrikanın ilk satışının kendisidir** | `CustomerDetailModal.jsx:663-687` |
| İkinci elde Finans / rapor | Finans ilk satışı saymaya devam eder; aylık rapor `!c.isResale` ile satıştan çıkarır (ikisi zaten ayrışık) | `Finance.jsx:114-116`, `aylikRapor.js:76,87` |
| Stoktan satış | `deductMachineStock` `sourceStockId` yazar, stok satırını **kalıcı siler** (`addedDate` kaybolur). Seri sonradan girilince düzenlemede de çalışır | `Customers.jsx:248-262, 283-287, 319` |
| Stok girişi | `addedDate` formda düzenlenebilir ("Stoğa Giriş Tarihi"); kit düşümü `partStockLog {tip:"makina_uretimi", referansId: stockId, tarih: today()}` | `MakinaStokTab.jsx:37-67, 234` |
| Müşteri silinince | Makina stoğa `addedDate: today()`, not "Silinen müşteriden geri döndü" ile yeni satır olarak döner; çöpten geri alma bu satırı `geriDonenStokBul` (model+seri+not) ile kaldırır | `Customers.jsx:413-431`, `SettingsTrash.jsx:42-58` |
| Kur | `rates = {usd, eur}` küçük harf, "1 birim = X TL"; saatlik, başarısızsa `null`. Yalnız Dashboard/Finans/Giderler'e gider, **Customers'a gitmez** | `App.jsx:631-649, 1309-1317` |
| Satış kaydı oluşturan yollar | `Customers.jsx doAdd` (teklif dönüşümü de prefill ile buradan geçer), düzenleme `save`, `SettingsImport.jsx:252`, sunucu birleştirme, yedek geri yükleme | ajan taraması |
| Gider motoru | `kovaKurus` (iç, kuruş), `kovaDagilimi` (TL), `makinaCozucuOlustur`, `canliModelSeti`, `yururlukKapsami`, `standartGiderAyi`, `ayEkle/ayOf/tamAylar` hazır; `kurus/tl/kalemKurus` dışa açık değil | `gider.js` |
| DB | `customers` tablosunda `REAL` örnekleri var (`fabrikaSatisBedeli`, `komisyon`, `brutKg`); okuma `SELECT *` + `...c` ile düz sütunu otomatik taşır. `giderAyarlari` JSON sütunu hazır | `db.cjs:94-110, 418-427, 490-530, 1063-1073, 281, 447` |
| Emsal ekran | `MakinaModelGorunumu.jsx` dönem kovalarını gösterir, maliyet hesabı yapmaz ("0002'nin işi" notu) | `gider/MakinaModelGorunumu.jsx` |
| Detay modalı | `CustomerDetailModal` bugün `giderler/giderYetki/stock/rates` almıyor; alan ızgarası `:984` | `CustomerDetailModal.jsx:39-67, 984` |

---

## 1. Mimari özet

İki katmanlı saf motor, arayüz yalnız gösterir (C3, C9):

1. **`hesaplaMakinaMaliyetleri(veri, ayarlar)`**, dönemden bağımsız, pahalı kısım. Tek geçişte:
   makina listesi ve üretim tarihleri → ay bazlı üretim sayıları → ay bazlı ortak gider (gerçekleşen **veya**
   standart) → pay dağıtımı → model havuzları → doğrudan giderler. Çıktı: makina başına maliyet kırılımı
   (`Map` anahtarı müşteri/stok kimliği), ay tablosu, havuz tablosu.
2. **`karlilikOzeti(sonuc, veri, {baslangic, bitis})`**, ucuz kısım: dönemde satılanlar, kâr, marj, çarpan,
   stokta bekleyen maliyet, satış bedeli girilmemişler, dağıtılmamış ortak, yüklenmemiş malzeme, standart fark.
3. **`fiyatOnerisi(sonuc, {model, baslangic, bitis, yontem, deger})`**, saf.

Ağır hesap **App seviyesinde bir kez** memoize edilir (yalnız `giderYetki` varken), sonuç Giderler sekmesine
ve müşteri detayına prop olarak iner. Böylece iki ekran aynı rakamı gösterir ve hesap iki kez yapılmaz.

---

## 2. Değişecek ve eklenecek dosyalar

### Saf motor
| Dosya | Değişiklik |
|---|---|
| `src/lib/makinaMaliyeti.js` **(yeni)** | `uretimTarihiCoz`, `makinaListesi`, `hesaplaMakinaMaliyetleri`, `karlilikOzeti`, `fiyatOnerisi`, `marjBicim`/`carpanBicim`, `satisTL`. Kuruş tamsayısı. React'sız |
| `src/lib/satisKaydi.js` **(yeni)** | Yazma tarafı saf yardımcıları: `satisKuruUygula(eski, yeni, rates, bugun)` (R12 kuralları), `uretimTarihiDamgala(kayit, stokSatiri)` |
| `src/lib/gider.js` | **Yalnız dışa açma:** `kalemKovalariKurus(k, {davranis, makinaCoz, canliModeller})` (mevcut `kovaKurus`'un sarmalı, mantık değişmez; R2 "aynı fonksiyon"), `kurus`, `tl` export. Rapor davranışı değişmez |
| `src/lib/utils.js` | `gercekSatisBedeli(c)` tek kaynak (C2); `Finance.jsx` ve `aylikRapor.js` buna geçer, davranış aynı |

### Kalıcılık (C4'ün üç istisnası)
| Dosya | Değişiklik |
|---|---|
| `electron/db.cjs` | `customers.satisKuru REAL`, `customers.uretimTarihi TEXT` dört nokta kuralıyla (`SCHEMA_SQL`, `CUSTOMERS_MALIYET_COLUMNS` + `ensureColumns`, INSERT listesi ve `.run` eşlemesi, okuma `...c` ile otomatik). **M3 onaylanırsa** `stock.uretimTarihi TEXT` aynı kuralla |
| `appSettings.giderAyarlari` | Ortak gider kaynağı **yeni sütun açmadan** mevcut JSON'a alan olarak: `giderAyarlari.ortakGiderKaynagi: "gercek" \| "standart"` (M9) |
| `src/types.d.ts` | yeni alanlar |
| `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs` | yeni sütunlar |

### Yazma yolları
| Dosya | Değişiklik |
|---|---|
| `src/components/Customers.jsx` | `doAdd`/`deductMachineStock`: stok satırından `uretimTarihi` damgası (R1b); `save` ekle/düzenle: `satisKuruUygula` (R12); müşteri silinip stoğa dönerken üretim tarihini taşıma (M3) |
| `src/components/customers/CustomerAddEditForm.jsx` | "Üretim tarihi" tarih alanı (elle düzeltme, R1b) ve salt görünür "Satış kuru: 1 USD = X TL" satırı (AC-12); ikisi de yalnız `giderYetki` ile çizilir (M8) |
| `src/components/settings/SettingsImport.jsx` | Var olan kaydı yeniden içe alırken `satisKuru`/`uretimTarihi` korunur (`isResale` deseni, `:158`); yeni kayıtta kur yazılmaz (R13'e düşer) |
| `src/App.jsx` | `rates` ve `giderYetki` Customers'a; `makinaMaliyetSonucu` memo'su; Giderler'e ve Customers'a iletim |

### Arayüz
| Dosya | Değişiklik |
|---|---|
| `src/components/Giderler.jsx` | `GORUNUMLER`'e `{value:"karlilik", label:"Makina Kârlılığı"}` (R26) |
| `src/components/gider/MakinaKarliligi.jsx` **(yeni)** | Dönem özeti tablosu, özet satırları, kaynak etiketi, "stoktan çekilen parçalar hariç" ve "bugünkü veriye göre" notları |
| `src/components/gider/MakinaMaliyetDetay.jsx` **(yeni)** | Makina kırılımı (doğrudan, malzeme payları, ortak pay, komisyon, satış bedeli, toplam). Giderler'de satır tıklamasında ve müşteri detayında **aynı bileşen** |
| `src/components/gider/FiyatOnerisi.jsx` **(yeni)** | Model seçici, dönem, üç yöntem, geçerli aralık uyarıları |
| `src/components/customers/CustomerDetailModal.jsx` + `Customers.jsx` | `giderYetki` ise "Maliyet ve Kâr" kutusu (`MakinaMaliyetDetay`), yoksa hiç çizilmez |
| `src/components/settings/SettingsGider.jsx` | Ortak gider kaynağı seçimi + "tüm kullanıcıların rakamı değişir" notu (C4-3) |

### Dokunulmayanlar
`Finance.jsx` ekranı (yalnız `gercekSatisBedeli` refaktörü, görünüm aynı; R26, AC-69), `aylikRapor.js` çıktısı (X10),
`printTemplates.js`, `SettingsExport.jsx` (maliyet dışa aktarılmaz), `serverAuth.cjs` (yeni bölüm/izin yok, C5),
`merge.js` (yeni dizi yok; yeni alanlar kayıtla taşınır).

---

## 3. Adım sırası

1. **C2 refaktörü:** `gercekSatisBedeli` + Finans/rapor geçişi + çapraz test. Önce, çünkü motor buna dayanır.
2. **Motor:** `gider.js` dışa açma → `makinaMaliyeti.js` (üretim tarihi çözümü → sayım → ortak pay → havuz →
   doğrudan → özet → öneri). Testler motorla aynı adımda (AC'lerin çoğu burada kanıtlanır).
3. **Kalıcılık:** DB sütunları, roundtrip ve temiz kurulum testleri, `types.d.ts`.
4. **Yazma yolları:** `satisKaydi.js` + Customers/Import/silme-dönüş. UI testleriyle.
5. **Bağlama:** App memo, prop iletimi, yetki kapısı.
6. **Arayüz:** Kârlılık alt görünümü, detay kutusu, fiyat önerisi, ayar.
7. **Doğrulama:** tam paket, lint, build; binlerce kayıtla süre ölçümü (C9); CLAUDE.md.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**M1. İkinci el kaydı listeden çıkarılmamalı.** Spec R27 "ikinci el devirler hiç listelenmez" diyor ve R1c onları
üretim saymıyor. Ancak kodda devir **yeni kayıt açmıyor**; `isResale:true` kayıt, fabrikanın ilk satışının ta
kendisi (bedel ve `installDate` ilk satışa ait). Kaydı dışlarsak R14'ün istediği "ilk satışın kârı" kaybolur ve
C2 bozulur (Finans bu satışı sayıyor).
*Öneri:* `isResale` kaydı **ilk satış olarak** `installDate` döneminde listelenir, üretim sayısına bir kez girer;
ikinci satış (`prevOwners[].soldDate`) hiçbir hesap üretmez. AC-21 ve AC-46 doğal olarak sağlanır (dönem
`installDate`'e bakar). Spec'e not: R27/R1c'deki "ikinci el devir" ifadesi ayrı kayıt varsayıyor.

**M2. Kurun her düzenlemede yazılması eski satışları bozar.** R12 "kaydedilirken kur alanı boşsa o günün kuru
yazılır" diyor. Kelimesi kelimesine uygulanırsa 2021'deki kursuz bir USD satışında telefon numarası düzeltmek
bugünün kurunu yazar; kayıt "kesin" görünür ama yanlış olur (R13'ün tam tersi).
*Öneri:* Kur **yeni kayıtta** ve **para birimi değiştiğinde** yazılır. Kursuz mevcut kayıtta yalnız
`installDate` son 30 gün içindeyse yazılır (çevrimdışı kaydedilip sonra açılan yeni satış); daha eskisi
"yaklaşık" kalır. Gerekçe: R12'nin amacı satış anının kurunu tutmak; 30 günlük pencere çevrimdışı durumunu
kapatır, geçmişe sahte kesinlik yazmaz.

**M3. Stoğa geri dönen makinanın üretim tarihi.** R1c geri dönen satırı dönüş ayında saymıyor, doğru. Ama makina
yeniden satılınca `doAdd` stok satırının `addedDate`'ini (dönüş günü) üretim tarihi yazar; makina hiç
sayılmadığı bir ayın payını alır ve o ayın payları toplamı ortak gideri aşar (R2'nin tam eşitlik kuralı bozulur).
*Öneri:* Dönen stok satırına makinanın çözülmüş üretim tarihi `stock.uretimTarihi` olarak taşınır; üretim tarihi
çözümünde stok satırı için önce bu alan, sonra `addedDate`. Böylece makina **özgün ayında** bir kez sayılır
(müşterisi çöpte olduğu için orada sayılmaz, AC-45), dönüş ayına eklenmez (AC-44). Bu, C4'ün ikinci istisnasının
(üretim tarihi alanı) stok tablosuna uzanmasıdır; **açık onay istiyorum**. Onay yoksa alternatif: dönen satır hiç
sayılmaz ve satılırsa "üretim tarihi bilinmiyor" ile maliyetsiz gösterilir. Bu değişiklik öncesi dönmüş eski
satırlar (alan boş, not eşleşiyor) için: çöpteki müşteriyi `geriDonenStokBul`'un tersiyle (model + seri) bulup
tarihini kullan, bulunamazsa sayma.

**M4. "Malzeme payı alamamış makina" tanımı.** Birden çok havuzda (her biri bağımsız tüketilir, AC-26) "artan"
belirsiz. Ayrıca havuzlar ileriye çalıştığı için (R17b) gider takibinden önceki bütün eski makinalar "pay
alamamış" görünür.
*Öneri:* Bir makina, modelinin tarihi makinanın üretiminden önce veya aynı gün olan **en az bir havuzu varken**
hiçbir havuzdan pay almadıysa sayılır. İlk havuzdan önce üretilenler sayılmaz. AC-51 (40 kapasite, 45 makina → 5)
bu tanımla sağlanır.

**M5. Havuz ve özetin "ne zamana kadar" hali.** "Yüklenmemiş malzeme" ve "stokta bekleyen maliyet" aralığa göre
değişir.
*Öneri:* İkisi de **aralık bitişi itibarıyla** hesaplanır (R7'nin stok satırı kuralıyla tutarlı): tarihi ≤ bitiş olan
havuzlar, üretimi ≤ bitiş olan makinalarca tüketilmiş kabul edilir. Makina başı maliyet ise dönemden bağımsızdır
(tüm veriyle; C10).

**M6. Yürürlük öncesi kalemler ve makinalar.** R10 yürürlük öncesi **üretilen** makinada rakam göstermiyor.
*Öneri:* (a) Yürürlük öncesi tarihli gider kalemleri 0001 raporunda olduğu gibi hiçbir hesaba girmez (DoD'daki
"dört sınıf = 0001 toplamı" eşitliği ancak böyle tutar). (b) Yürürlük öncesi üretilen makina, doğrudan atanmış
gideri olsa bile "gider verisi girilmemiş" gösterilir ve dönem toplamlarına girmez; özet bunları ayrı sayar.
(c) Bu makinalar yürürlük sonrası havuzlardan da pay almaz (üretimleri havuz tarihinden önce, R17b zaten sağlar).

**M7. TL'ye çevrilemeyen satış.** Kayıtlı kur yok ve güncel kur da alınamadı (çevrimdışı açılış).
*Öneri:* Makina "TL karşılığı hesaplanamadı" diye ayrı satırda sayılır, toplamlara girmez (R4'ün "satış bedeli
girilmemiş" deseni). Kâr sıfır gösterilmez.

**M8. Üretim tarihi alanı kime görünür.** Spec alanı düzenleme formuna koyuyor ama R15 maliyet verisini gider
yetkisine bağlıyor.
*Öneri:* Alan ve kur satırı yalnız `giderYetki` ile çizilir; yetkisiz kullanıcının kaydetmesi alanları korur (form
kaydın kendisini yayıyor). Sunucu tarafında ek denetim gerekmez: alan maliyet değil, düz tarih.

**M9. Ortak gider kaynağının yeri.** C4-3 "giderAyarlari desenini izler" diyor.
*Öneri:* Yeni sütun değil, mevcut `giderAyarlari` JSON'una `ortakGiderKaynagi` alanı. Dört nokta kuralı zaten
karşılanmış, `mergeAppSettings` ve `disAppSettingsSuz` davranışı kendiliğinden doğru (sunucu üzerinden paylaşılır).
Varsayılan `"gercek"`.

**M10. Standart kaynakta sürüm kuralı.** Spec R22 "o aya uyan sürümlerin toplamı" diyor; 0001 triyaj bulgu 4 ise
birleştirme sonrası çift açık sürümü önlemek için **grup başına tek sürüm** seçiyor.
*Öneri:* `standartGiderAyi(liste, ay).toplam` aynen kullanılır (gruplar arası toplam, grup içinde tek sürüm). Spec'teki
cümle bu anlama gelir; ikinci bir kural yazılmaz. "Hiç sürümü olmayan kalem" (AC-65) = o ayda geçerli sürümü
olmayan grup; özet bunları adıyla listeler.

**M11. "Son 12 ay" tanımı ve komisyonun para birimi.** *Öneri:* Son 12 ay = içinde bulunulan ay dahil geriye 12
takvim ayı (ay bazlı ortak payla uyumlu). Komisyon satış kaydının `currency`'si ve aynı kurla çevrilir (R4b);
ayrı alan yok.

**M12. Performans ölçümü ve görsel kanıt.** C9 "binlerce kayıt" diyor. *Öneri:* 5.000 makina + 20.000 gider
kalemiyle sentetik veri üreten bir test; ağır hesabın süresi ölçülüp konsola yazılır, test gevşek bir üst sınır
(1 sn) koyar ki CI'da titremesin. Görsel kanıt (`docs/evidence`) 0001'de sizin kararınızla alınmadı; burada da
alınmamasını öneriyorum, DoD'dan düşülür.

**Genel riskler**
- *Finans refaktörü (adım 1) yan etki:* davranış aynı kalmalı; mevcut Finans/aylık rapor testleri + yeni çapraz
  test kilit.
- *Tarih karşılaştırması:* hepsi `YYYY-MM-DD` metin; ay anahtarı `ayOf`. Ay sınırı testleri (31 Mart / 1 Nisan).
- *Model adı eşleştirme:* `trLower` (0001 `canliModelSeti` ile aynı); makina modeli değişirse hesap yeniden yapılır
  (C10).
- *Pahalı App memo:* bağımlılık listesi yalnız ilgili diziler (müşteriler, stok, giderler, türler, standart,
  modeller, ayarlar, kur). Kur saatlik değiştiği için yalnız kursuz satışların TL karşılığı `karlilikOzeti`'nde
  hesaplanır, ağır memo'ya kur girmez.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>`. `M` = `tests/makina-maliyeti.test.js` (motor), `UI-K` = `tests/ui/makina-karliligi.test.jsx`,
`UI-D` = `tests/ui/customer-maliyet-kutusu.test.jsx`, `UI-F` = `tests/ui/makina-karliligi.test.jsx` içindeki "Fiyat önerisi" bloğu,
`UI-S` = `tests/ui/customers-satis-alanlari.test.jsx`, `S` = `tests/satis-kaydi.test.js`.

| Kriter | Test | Kanıt |
|---|---|---|
| AC-1, AC-32 | M | 300.000 / 5 = 60.000; başka ayda satılan makinanın payı üretim ayında sabit |
| AC-2, AC-8 | M + UI-D | 60.000 + 20.000 + 15.000 = 95.000; detay satırları toplamı = maliyet |
| AC-3, AC-4, AC-58 | M + UI-K | kâr 405.000, %81,0; zarar etiketi; marj 1, çarpan 2 ondalık |
| AC-5, AC-6 | M + `tests/gercek-bedel-capraz.test.js` | fabrika bedeli önceliği; boşsa fatura bedeli; Finans ve motor aynı makina için aynı bedel (C2) |
| AC-7, AC-36 | UI-K + UI-D | "stoktan çekilen parçaların maliyeti hariç" ve kaynak etiketi her iki ekranda |
| AC-9 | M | makina kârları toplamı = dönem toplamı (kuruş eşitliği) |
| AC-10, AC-64 | M + UI-D | yürürlük öncesi üretim → "gider verisi girilmemiş"; yürürlük içi boş ay → pay 0, uyarı yok |
| AC-11 | M | üretimsiz ay → hata yok, "dağıtılmamış ortak gider" |
| AC-12, AC-41, AC-72 | S + UI-S + `db-roundtrip.cjs` | kur yazılır ve yeniden açılınca aynı; üretim tarihi damgası; USD→EUR yenilenir, TL'de boşalır |
| AC-13, AC-14, AC-53, AC-54, AC-55 | M + S + UI-K | kayıtlı kur sabit; kursuz eski satış güncel kurla "yaklaşık"; USD ve TL birlikte; komisyon aynı kurla; çevrimdışı kayıt engellenmez |
| AC-15, AC-16, AC-17, AC-18, AC-39, AC-61, AC-62, AC-63 | M (`fiyatOnerisi`) + UI-F | 106.667 / 100.000 / 176.000; yöntem yazar; %100 ve negatif reddi; 0,8 zararına uyarı; tam TL |
| AC-19, AC-59, AC-60 | M + UI-F | son 12 ay ortalaması, dönem yazar; üretimsiz modelde neden yazılı, öneri yok |
| AC-20 | UI-K | satışsız dönemde boş durum |
| AC-21, AC-46 | M | devredilmiş makina yalnız ilk satış döneminde; ikinci satış hesap üretmez (M1) |
| AC-22 | UI-D + UI-S (plan M8) | yetkisizde detay kutusu ve form alanları yok; alt görünüm Giderler sekmesinde olduğu için sekme kapısına bağlı (0001 AC-18) |
| AC-23, AC-24, AC-25, AC-26, AC-40 | M | havuz 40.000 / pay 1.000; kalan 39.000; tükenen havuz pay vermez; iki havuz toplamı; modeller arası sızma yok |
| AC-27, AC-76 | M | model kovası ortağa girmez; 70.000'in 20.000 kalanı ortağa (0001 `kovaKurus` üzerinden) |
| AC-28 | M | üretimsiz modelde tutar "yüklenmemiş malzeme" |
| AC-29, AC-30, AC-74 | M + UI-K | stoktaki makinaya atanmış gider üretim maliyetinde; satılınca stok satırından düşer; başlıkta bitiş tarihi |
| AC-31 | M | dağıtılmasın kalemi hiçbir makinada ve havuzda yok |
| AC-33, AC-43 | M + UI-D | doğrudan müşteri kaydı notu; tahmini üretim tarihi etiketi |
| AC-34, AC-35, AC-37, AC-65 | M + UI-K | kaynak standart/gerçekleşen ayrık; fark satırı; sürümsüz grup belirtilir |
| AC-38, AC-56, AC-57 | M | 2,19; maliyet 0 → çarpan "—"; satış 0 → marj "—", hata yok |
| AC-42 | M | kayıtsız tarihte `makina_uretimi` hareketinin tarihi |
| AC-44, AC-45 | M + UI-S | dönen makina dönüş ayına eklenmez (M3); çöpteki sayılmaz, geri alınınca döner |
| AC-47 | M | 300.000 / 7: aşağı yuvarlama, artık kuruş ilk makinaya, toplam tam |
| AC-48, AC-49, AC-50 | M | 15 Mart havuzu 1 Mart makinasına pay vermez; havuz sırası tarih+kimlik, iki çalıştırma aynı; aynı gün seri sırası |
| AC-51 | M | 45'e 40 kapasite → 5 (M4) |
| AC-52, AC-73 | M + UI-K | bedelsiz makina ayrı satır, adet ve maliyetle; toplamlara girmez |
| AC-66 | M + UI-K | ayı kesen aralıkta iki ay bazlı satır rakam yerine açıklama |
| AC-67 | M | dönem `installDate`'e göre |
| AC-68 | M | Extra Kalıp geliri kâra girmez |
| AC-69 | UI-K + UI-D | alt görünümde ve detayda var, Finans'ta yok |
| AC-70, AC-71 | M | kira/personel atamalı olsa bile ortak; silinmiş model satırı ortağa, payı yükseltir |
| AC-75 | M + UI-S | elle üretim tarihi → tahmini etiketi kalkar, pay yeni ayın |
| DoD: dört sınıf toplamı | M | makina + model + ortak + dağıtılmayan = `hesaplaGiderRaporu(...).toplam` |
| DoD: C9 süre | M ("C9: tek geçiş ve süre" bloğu) | 5.000 makina / 20.000 kalem: ölçülen **66 ms** (M12; test 3 sn gevşek sınır koyar) |
| DoD: C4 alanlar | `db-roundtrip.cjs`, `db-clean-install.cjs`, `tests/utils.test.js` (`mergeAppSettings`) | sütunlar ve `giderAyarlari.ortakGiderKaynagi` gidiş-dönüş |
| DoD: dışa aktarma | `tests/ui/gider-gizlilik-cikti.test.jsx` (genişletme) | satış kuru ve üretim tarihi hiçbir dışa aktarmada yok; maliyet türetildiği için hiçbir üreticiye girmez |
| C2 | `tests/gercek-bedel-capraz.test.js` + `tests/utils.test.js` | aylık rapor satış tutarı = kârlılık satış bedeli toplamı; `gercekSatisBedeli` kuralı |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| M1 | İkinci el kaydı | İlk satış olarak listelenir |
| M2 | Kur damgası zamanı | Yeni kayıt, para birimi değişimi, son 30 gün |
| M3 | Dönen makinanın üretim tarihi | `stock.uretimTarihi` taşınır (C4-2'nin stoka uzanması) |
| M4 | Payı alamamış makina | En az bir uygun havuz varken hiç pay almayan |
| M5 | Özet satırlarının zamanı | Aralık bitişi itibarıyla |
| M6 | Yürürlük öncesi | Kalemler ve makinalar hesap dışı, ayrı sayılır |
| M7 | Kursuz ve kurun alınamadığı satış | Ayrı satır, toplam dışı |
| M8 | Form alanlarının görünürlüğü | Yalnız gider yetkisiyle |
| M9 | Kaynak ayarının yeri | `giderAyarlari.ortakGiderKaynagi` |
| M10 | Standart sürüm kuralı | 0001 `standartGiderAyi` aynen |
| M11 | Son 12 ay | İçinde bulunulan ay dahil 12 takvim ayı |
| M12 | Performans ve görsel kanıt | Sentetik ölçüm testi; görsel kanıt yok |
| M13 | Aynı modelin birden çok havuzu | **Paralel** (kullanıcı kararı, 2026-09-24): her havuz bağımsız, makina kendinden önce tarihli her havuzdan birer pay alır; havuz sırası yalnız determinizm için |

---

## 7. Uygulama notları (2026-09-24)

- **M13 (uygulama sırasında çıkan çelişki):** Spec R17/AC-26 paralel tüketimi, R17c/AC-49 sıralı tüketimi
  anlatıyordu. Kullanıcı paralel'i seçti. Bilinen sınır: aynı malzemenin ardışık iki alımı aynı makinaları kapsarsa
  çakışan makinalar iki kez pay alır; farklı malzemeler (ayrı faturalar) doğru dağılır. AC-49 testi sıranın
  deterministik olduğunu sabitler.
- **Kalıcı alanlar (C4):** `customers.satisKuru REAL`, `customers.uretimTarihi TEXT`, `stock.uretimTarihi TEXT` (M3),
  `appSettings.giderAyarlari.ortakGiderKaynagi` (yeni sütun yok, M9). Mevcut kayıtlar değiştirilmedi; eski kayıtlar
  boş alanla çözüm zincirine ve yaklaşık hesaba düşer.
- **Refaktör:** `utils.gercekSatisBedeli` Finans ve aylık raporun iki ayrı kopyasının yerini aldı (davranış aynı; Finans
  eskiden negatif fabrika bedelini de kabul ediyordu, artık yalnız > 0; anlamsız veri için tek fark).
- **0001 motoruna dokunuş:** yalnız dışa açma (`kalemKovalariKurus`, `kurus`, `tl`); rapor davranışı aynı.
- **İçe aktarma:** var olan kayıt yeniden içe alınırken kur ve üretim tarihi korunur; para birimi değişmişse kur temizlenir.
- **Görsel kanıt:** M12 gereği alınmadı.

## 8. Triyaj düzeltmeleri (2026-09-24)

| # | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Ay tablosu ilk gider/üretim ayından başlıyor, öncesindeki aylarda dağıtılmamış ortak gider ve standart fark sessizce 0 | Tablo yürürlük ayından başlar; yürürlük yoksa en erken veri ayı, standart kaynakta en erken standart başlangıcı dahil | `makina-maliyeti.test.js` |
| 2 | Çapraz test devredilmiş kaydı içermiyordu; aylık rapor `isResale`'i satıştan çıkarıyor, kârlılık (Finans gibi) sayıyor | **Karar (b):** ayrışma spec Context'ine yazıldı, çapraz test farkı sabitliyor. Raporun da ilk satışı sayması (a) ayrı iş olarak önerildi, rapor rakamını değiştirdiği için bu işte yapılmadı | `gercek-bedel-capraz.test.js` |
| 3 | Eski "geri dönen" stok satırı not metniyle tanınıyor; not düzenlenirse makina dönüş ayında yeniden üretim sayılır. Customers sabiti değil elle yazılmış metni kullanıyordu | Customers `GERI_DONEN_STOK_NOTU` kullanır; stok düzenleme kaydında tarihsiz eski geri dönen satıra çöpteki müşterisinden özgün üretim tarihi yazılır (not değişse de korunur), formda bu tarih ve maliyetin onu kullandığı yazar. Yükleme anında toplu doldurma bilerek yapılmadı: sekmesi kısıtlı istemcide stok bölümüne yazma (403) riski | `ui/stock-geri-donen-uretim.test.jsx`, `makina-maliyeti.test.js` |
| 4 | Giderler'in yedek hesabı stok hareketlerini geçmiyordu; `atanamayanMakinaGideri` ölü alan; model satırlarında key yok | Yedek hesap kaldırıldı (tek kaynak App memo'su); alan kaldırıldı; key eklendi | `ui/makina-karliligi.test.jsx`, `makina-maliyeti.test.js` |
