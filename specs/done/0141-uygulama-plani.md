# 0141 Uygulama planı: işleme payı ve emniyet payı kalkar

| | |
|---|---|
| **Spec** | `specs/done/0141-isleme-payi-ve-emniyet-payi-kalkar.md` (Tamamlandı, 2026-11-10) |
| **Dal** | `feat/0141-pay-kalkar` (worktree `../wt0141`, `main` `74200ea6` üstünde) |
| **Durum** | **Tamamlandı** (2026-11-10, commit `3da4bccb`); onay: Takım Yöneticisi 2026-11-10, on önerinin hepsi; spec revizyon 2, kararlar 31–40 |

---

## 0. Plan turunda ölçülenler (HEAD `74200ea6`)

- **Ö-1. Dokunulmamış düzenleme payı aynen yazar.** `PartManager.jsx:341`: maliyet bölümüne dokunulmadıysa `maliyetKalemleri` ve
  üç eski alan (`malzemeSatiri` dahil) **eski kayıttan olduğu gibi** kopyalanıyor (0135 kuralı). Yani spec'in A-R1/2'si (katlama
  `malzemeSatiriFormu`'nda) bu yolu kapsamıyor: pay taşıyan parça açılıp dokunulmadan kaydedilirse pay anahtarı kayıtta kalır,
  `hamOlculer` artık okumadığı için maliyet sessizce düşer, AC-11 kırılır. Bkz. R1.
- **Ö-2. Bütün okuyucular tek türetmeden geçiyor.** `maliyetKalemleri.js:36` `maliyetKalemleriOf` kayıtlı kalemi ham döndürüyor,
  kalem listesi boşsa `malzemeSatiri`'nden kalem türetiyor; motorlar, sipariş, Excel, fiyat, form açılışı (`startEdit`) buradan
  okuyor. Katlamanın doğal tek yeri burası. Bkz. R1.
- **Ö-3. Ters çevrilecek testler C10'un saydığından fazla.** Pay anahtarı ya da emniyet payı geçen test dosyaları (tarama):
  `malzeme-0132` (AC-34, AC-35/83, AC-81, AC-82), `ui/malzeme-0132-parca` (AC-29 ve pay alanı etkileşimleri), `ui/malzeme-0132`,
  `ui/malzeme-0132-app`, `siparis-0134` (AC-19/20, AC-21, AC-81/82, Karar 32, AC-83, AC-84, Bulgu 6), `maliyet-kalemleri-0135`
  (AC-52–54/92), `ui/maliyet-kalemleri-0135`, `ui/maliyet-kalemleri-0135-app`, `fire-kg-0139` (AC-5: "çap payı parçayı üst
  banda taşır"), `malzeme-aktarma-0139`, `ui/parca-fiyati-0133-app`, `ui/siparis-0140` (Bulgu 6 ekranı), `ui/emniyet-payi-0134`
  (silinir), `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs`, `dis-islem-gocu.cjs`. Bkz. R4.
- **Ö-4. Altınların yeniden üretim anahtarları var.** `YAZ_0135`, `YAZ_0139`, `YAZ_0140` (kıyas testlerinde); `0133` ve `0138`
  altınları dokunulmaz (AC-41).
- **Ö-5. Göç çekirdeğinin `src`'ye bağlanma emsali var.** `src/lib/kalipTamiri.js` `electron/kalipTamiriGocuSaf.mjs`'den içe
  alıyor (0115). Aynı yolla `src` katlama fonksiyonunu `electron/islemePayiGocuSaf.mjs`'den alabilir (C5 ve AC-45 birlikte sağlanır).

---

## 1. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `electron/islemePayiGocuSaf.mjs` **(yeni)** | Saf çekirdek. Kendi `PAY_ESLEME` sabiti (`cap→payCap` … `boy→payBoy`, C5). `islemePayiKatla(satir)`: pay anahtarı olan her ölçüye payı ekler, sonucu **üç ondalığa** yuvarlar (A-R2/2), pay anahtarlarını siler; pay yoksa **aynı nesneyi** döndürür (değişmezlik ölçülebilsin). `islemePayiParcaKatla(p)`: `maliyetKalemleri[]` ve `malzemeSatiri`'ni birlikte katlar (D-R3/2). `islemePayiGocPlani(satirlar)`: `{ id, maliyetKalemleri, malzemeSatiri }` → değişecekler listesi. |
| `src/lib/maliyetKalemleri.js` | `maliyetKalemleriOf` döndürdüğü her malzeme kalemini `islemePayiKatla`'dan geçirir (R1). Pay yoksa nesne aynı kalır. |
| `src/lib/malzeme.js` | `PAY_ALANI`, `BICIMLER[*].paylar`, `hamOlculer`'in pay satırı, `malzemeSatiriDogrula`'nın pay döngüsü, `PAY_HATASI`, `SATIR_ALANLARI`'nın beş anahtarı kalkar; `malzemeSatiriFormu` girişte `islemePayiKatla` çağırır (A-R1/2). Emniyet payının dört sabiti, `malzemeDogrula` satırı ve `malzemeFormu` alanı kalkar. `FIRE_BOY_UYARISI` aynen (C7). |
| `src/lib/urunAgaci.js` | `kalemFormu` `malzemeSatiriFormu` üzerinden katlamayı alır; ek kod gerekmez (tarama ile ölçülür). |
| `src/lib/siparisIhtiyaci.js` | `emniyetPayiOf`, `k.pay`, kit/patlatma/öneri kaynağının çarpımları kalkar (B-R3, B-R7); parça satırının `pay` alanı kalkar (C8); ibare sabiti `HAM_IHTIYAC_IBARESI` (B-R4/2). |
| `src/components/MalzemeSatiriAlani.jsx` | Pay alanlarının çizimi, `PAY_ALANI` içe alımı, `hatalar[PAY_ALANI[ad]]` okuması, satır 10'daki yorum; özet "Ağırlık: X · fire dahil: Y", iki test kimliği aynen (A-R3/2). |
| `src/components/MaliyetKalemleriAlani.jsx` | `PayAlani`, çizimi, iki içe alma, saran `<fieldset disabled={set}>` (B-R2/2). |
| `src/components/PartManager.jsx` | Boş form alanı, kayıt ayıklaması ve yazımı, form açılışı, doğrulama, iki kipteki props, `hatalar.pay`, `bosHatalar.pay`. **Dokunulmamış dal** eski alanları kopyalarken `islemePayiParcaKatla` uygular (R1). |
| `src/components/MalzemeManager.jsx` | Alan (`228`), kaydet beyaz listesi (`135`), iki içe alma; ızgara altı alan (B-R1/2). Eski kayıttaki `emniyetPayi` kayda geri yazılmaz (AC-20). |
| `src/components/stock/SiparisPenceresi.jsx` | "Emniyet payı" başlığı ve `siparis-pay` hücresi; tablonun üstünde ibare (B-R4, B-R4/2). |
| `electron/db.cjs` | `parts` ve `malzemeler` INSERT'lerinden `emniyetPayi` çıkar; `parts` okuması destructuring ile ayıklar, `malzemeler` okumasına **yeni** ayıklama (AC-58). Göç sarmalayıcısı `islemePayiGocu(conn)` üç açılış dalında, `disIslemGocu`'dan sonra (D-R4/2); yalnız iki JSON sütununu `UPDATE` eder, değişen varsa önce `data.db.isleme-payi-gocu-<zaman>.bak`, bir işlem (transaction) içinde. `EMNIYET_PAYI_COLUMN`'un `ensureColumns` kaydı **kalır** (R6). |
| `scripts/tests/isleme-payi-gocu.cjs` **(yeni)**, `tests/db-electron.test.js` | Gerçek veritabanıyla göç; `ELECTRON_TESTLERI`'ne eklenir (AC-57). |
| `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs`, `dis-islem-gocu.cjs` | Emniyet payı iddiaları ters çevrilir ("spec 0141 ile"); pay taşıyan iki kayıt payı bırakır; yeni AC-38/39/58 iddiaları. |
| `tests/fixtures/0133-veri.js`, `0134-veri.js`, `0135-veri.js`, `0137-veri.js`, `0139-veri.js` | Payı ölçüye katla (C2); `0135`, `0139`'dan `emniyetPayi` sil (C2/2). |
| `tests/fixtures/0135-once.json`, `0139-once.json`, `0140-once.json` | Hazırlık adımında **eski kodla** yeniden üretilir (C2/2). |
| `tests/fixtures/0141-veri.js` **(yeni)**, `0141-once.json` **(yeni)**, `0141-ayikla.js` **(yeni)** | `0139-veri.js`'in paysız kopyası; altın eski kodla (`YAZ_0141=1`); ayıklama `pay` anahtarını iki taraftan siler ve `0138-once.json`'un kayıt gövdesini `islemePayiParcaKatla` ile katlar (C2/3). |
| `tests/isleme-payi-0141.test.js` **(yeni)** | Saf: katlama, motor, doğrulama, taramalar. |
| `tests/isleme-payi-gocu-0141.test.js` **(yeni)** | Saf göç planı. |
| `tests/isleme-payi-0141-kiyas.test.js` **(yeni)** | AC-40, AC-41, AC-62, AC-27. |
| `tests/ui/isleme-payi-0141.test.jsx` **(yeni)** | Parça kartı, malzeme kartı, sipariş penceresi. |
| Ö-3'teki test dosyaları | "spec 0141 ile" notuyla ters çevrilir ya da it bloğu silinir; `tests/ui/emniyet-payi-0134.test.jsx` silinir. |
| `scripts/evidence/0009-sayfa.jsx` | Fikstür `cap: 144, boy: 83` (C12); `docs/evidence/kanit-eslemesi.json` + `0141-piksel-raporu.json` + `0141-taban-piksel-raporu.json`. |
| `CLAUDE.md` | 0132, 0134, 0135, 0139, 0140 bölümlerindeki pay atıfları; yeni 0141 bölümü. |

Yeni izin, veri bölümü, sunucu kuralı ve birleştirme kuralı **yoktur** (C6).

---

## 2. Adım sırası

1. **Hazırlık, eski kodla (kaynak değişmeden):** beş fikstürün payını ölçüye katla, iki fikstürden `emniyetPayi` sil. Bütün takımı
   eski kodla koş: işleme payı katlaması tek başına hiçbir çıktıyı değiştirmemeli (ham ölçü aynı). Kıran testleri listele (Ö-3'ü
   doğrular). `0135`, `0139`, `0140` altınlarını `YAZ_*=1` ile yeniden üret; `0133-once.json` bayt bayt aynı mı bak. `0141-veri.js`
   ve `0141-once.json`'u eski kodla yaz (AC-62: kıyas boş geçmesin diye satır sayıları sınanır). Ayrı bir ara commit **önermiyorum**;
   adımın kanıtı altınların "spec öncesi koddan" üretildiği satırdır (plan §6'ya yazılır).
2. **Saf çekirdek:** `electron/islemePayiGocuSaf.mjs` ve saf testleri (AC-44, AC-45, göç planı).
3. **Motor ve türetme:** `maliyetKalemleri.js` katlaması, `malzeme.js` ve `siparisIhtiyaci.js` kaldırmaları; saf testler ve kıyas.
4. **Arayüz:** `MalzemeSatiriAlani`, `MaliyetKalemleriAlani`, `PartManager` (dokunulmamış dal katlaması dahil), `MalzemeManager`,
   `SiparisPenceresi`; UI testleri.
5. **Veritabanı:** INSERT/SELECT, göç sarmalayıcısı ve üç dal; Electron testleri.
6. **Ters çevirmeler:** Ö-3 listesi, dosya silme.
7. **Kanıt:** fikstür katlaması, taban (main) ve dal çekimi, gürültü ayrımı (0140 dersi: iki taraflı tekrar), raporlar, eşleme.
8. **Kapanış hazırlığı:** CLAUDE.md, `npm test` (Electron dahil), `npm run lint`, plan §6 uygulama notları, sürüm notu.

---

## 3. Riskler ve emin olmadığım noktalar

**R1. Katlama yalnız forma açılışta yetmez (Ö-1, Ö-2). Bloklayıcı.** Dokunulmamış düzenleme eski alanları aynen yazdığı için pay
anahtarı kayıtta kalır ve maliyet düşer; AC-11 bu yolda geçmez. *Önerim:* aynı `islemePayiKatla` üç yerde çağrılsın: (a)
`maliyetKalemleriOf` (tek türetme: motor, sipariş, Excel, fiyat ve form açılışı pay taşıyan kaydı göç görmeden de doğru hesaplar),
(b) `PartManager`'ın dokunulmamış dalı (kayda yazılan iki alan katlanır), (c) `malzemeSatiriFormu` (spec'in dediği yer; `MalzemeSatiriAlani`'nın doğrudan çağrısı için). *Gerekçe:* spec'in reddettiği (b) seçeneği motorun eski anahtarı okumasıydı; bu öneri motoru sade bırakır, katlama türetme anında ve tek fonksiyonla yapılır, sürüm arası pencerede istemci PC'nin de maliyeti doğru görmesini sağlar. AC-45'in taraması üç çağıranı da sayar.

**R2. Katlamanın üç ondalığı kuruşu oynatabilir mi?** Ham ölçü bugün yuvarlanmadan toplanıyor; katlama üç ondalığa yuvarlıyor.
Fark yalnız 1e-12 mertebesinde (kayan nokta). *Önerim:* AC-34 ve AC-43'ü beş fikstürün bütün malzeme kalemleri üzerinde kuruş
eşitliğiyle ölçmek (tek örnek yerine). *Gerekçe:* yuvarlama kararı A-R2/2'de verildi; ölçüm onun zararsızlığını gösterir.

**R3. Çekirdeğin `src`'ye bağlanması döngü kuralını bozar mı?** `maliyetKalemleri.js` 0135'ten beri "hiçbir lib modülünü içe almaz".
*Önerim:* `electron/islemePayiGocuSaf.mjs`'yi içe almasına izin vermek (lib modülü değil, hiçbir şey içe almıyor); kural yorumuna
istisna olarak yazılır. *Gerekçe:* 0115'in `kalipTamiriGocuSaf.mjs` emsali; tek fonksiyon kuralı (Kararlar 3) bunu gerektiriyor.

**R4. C10'un ters çevirme listesi eksik (Ö-3). Önemli.** Spec yalnız 0134 ve 0138'i sayıyor; 0132, 0135, 0139, 0140, 0133 testleri de
pay davranışını sabitliyor. *Önerim:* bütün dosyaların ters çevrilmesi, AC-59'un listesinin plan §6'da genişletilmesi. İşleme
payının **kendisini** sınayan it blokları (0132 AC-34, AC-81, AC-82; 0134 AC-19–21, AC-81–84, Karar 32, Bulgu 6; 0135 AC-52–54/92)
silinir ve notla yeni testteki karşılığına bağlanır; payla birlikte başka şey sınayanlar (0132 AC-35/83 fire, 0139 AC-5 bant) payı
ölçüye katlanmış veriyle aynı iddiayı sürdürür. *Gerekçe:* test sayısı sessizce azalmasın, her silmenin yeri belli olsun.

**R5. 0139 AC-5'in anlamı.** "Çap payı parçayı üst banda taşır" senaryosu pay kalkınca "girilen çap üst bantta" olur. *Önerim:* testi
çap 141 girilmiş kalemle, aynı kilogram beklentisiyle yeniden yazmak. *Gerekçe:* C3 bandın ham çaptan seçilmesini koruyor; ölçülen
şey bant seçimi, pay değil.

**R6. Emniyet payı sütununun `ensureColumns` kaydı.** Ek 1 kaydı kaldırmayı söylüyor, D-R1 ve AC-38 sütunun durmasını istiyor.
Ölçmem gereken şey: `malzemeler`'in `CREATE TABLE`'ında sütun var mı. Yoksa kaydı kaldırmak temiz kurulumda sütunu hiç oluşturmaz,
AC-38 temiz kurulumda kırılır. *Önerim:* kaydı **tutmak**, yalnız INSERT ve okuma yolundan çıkarmak. *Gerekçe:* kayıt zararsız
(var olan sütuna dokunmaz), AC-38 iki kurulum türünde aynı sonuç verir.

**R7. Göçün her açılışta tarama maliyeti.** 381 parçada `SELECT id, maliyetKalemleri, malzemeSatiri` ve JSON ayrıştırma milisaniye
mertebesi. *Önerim:* ek önlem yok; saf testte 5.000 parçalı planın süresini kaba eşikle ölçmek. *Gerekçe:* Kararlar 1 bayraksız
göçü seçti; maliyeti görünür kılmak yeter.

**R8. Göç ile blob yazımının sırası.** Göç `UPDATE` ile yazar; aynı açılışta istemci daha önceki (pay taşıyan) gövdeyi kaydederse
pay geri gelir, bir sonraki açılışta yeniden katlanır, arada R1(a) doğru hesaplatır. *Önerim:* kabul ve sürüm notunda "önce sunucu
PC" cümlesi. *Gerekçe:* D-R4 tam da bu pencere için bayraksız.

**R9. Kanıt gürültüsü.** 0140'ta main'in iki çekimi 43 ekranda kendi arasında farklıydı. *Önerim:* değişen ekran listesini
taban-taban ve dal-dal tekrarıyla ayırmak, eşlemeye yalnız gerçek değişenleri `degisti` yazmak (C11). Bilinçli değişen ekranlar:
parça kartının iki kipi (pay ve emniyet alanları), malzeme kartının iki kipi, sipariş penceresinin parça ihtiyacı tablosu; fikstür
katlandığı için öteki ekranlar 0 fark beklenir (AC-60).

**R10. `0140-once.json`'un yeniden üretimi.** 0134-veri'de emniyet payı yok; yeniden üretim aynı baytları vermeli. *Önerim:* yine de
üretip `git diff`'in boş olduğunu kaydetmek. *Gerekçe:* AC-41 üçünü birlikte sayıyor; boş fark da ölçümdür.

---

## 4. Kabul kriteri ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1–AC-4 (biçim başına alanlar, pay alanı yok) | `ui/isleme-payi-0141` (gerçek `PartManager` kartı, dört biçim) |
| AC-5 (Ø100×108, 6,69593 kg) | `isleme-payi-0141` (`malzemeOzeti`) |
| AC-6, AC-7, AC-46 (özet "Ağırlık · fire dahil", kimlikler) | `ui/isleme-payi-0141` |
| AC-8, AC-29 (bant girilen çaptan, 0,35 kg) | `isleme-payi-0141` |
| AC-9 (boru et kuralı) | `isleme-payi-0141` + `ui/isleme-payi-0141` (hata et alanında) |
| AC-10 (kayıtta pay anahtarı yok) | `isleme-payi-0141` (`malzemeSatiriDogrula`, `kalemlerDogrula`) |
| AC-11, AC-42, AC-43 (eski pay forma katlanır, dokunulmadan kayıt, canlı maliyet aynı) | `ui/isleme-payi-0141` (gerçek `Settings` › Parça; dokunulmamış ve dokunulmuş iki yol, R1) |
| AC-12, AC-26 (kimlik taramaları, istisnalar tam yollu ve sayılı) | `isleme-payi-0141` (tarama) |
| AC-13, AC-14, AC-20, AC-48 (malzeme kartı) | `ui/isleme-payi-0141` (gerçek `MalzemeManager`) |
| AC-15, AC-16, AC-21, AC-22, AC-49, AC-50 (parça kartı, iskelet) | `ui/isleme-payi-0141` + tarama |
| AC-17, AC-18, AC-19 (yukarı yuvarlama, iki öneri yolu düzenleme girdisiyle) | `isleme-payi-0141` (`siparisIhtiyaci`) |
| AC-23, AC-24, AC-25, AC-47, AC-51 (pencere tablosu, ibare, Net kg) | `ui/isleme-payi-0141` (gerçek `SiparisPenceresi`) + motor testi |
| AC-27 (yazdırılan rapor birebir) | `isleme-payi-0141-kiyas` (`siparisRaporuHtml` altında) |
| AC-28, AC-30, AC-31, AC-32 (kalanlar) | `isleme-payi-0141` |
| AC-33, AC-34, AC-37, AC-53 (göç planı iki alan, çöptekiler, maliyet aynı) | `isleme-payi-gocu-0141` (saf) |
| AC-35, AC-36, AC-54, AC-55, AC-56, AC-57 (yazım, yedek, ikinci açılış, üç dal, yalnız iki sütun) | `scripts/tests/isleme-payi-gocu.cjs` (Electron, `db-electron.test.js`) |
| AC-38, AC-39, AC-58 (ölü sütun, okuma ayıklaması) | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-40, AC-41, AC-62 (kıyas, altınların kaderi) | `isleme-payi-0141-kiyas` + güncellenen `maliyet-kalemleri-0135-kiyas`, `fire-kg-0139-kiyas`, `siparis-0140-kiyas`, `dis-islem-kalkar-0138-kiyas` |
| AC-44, AC-45 (üç ondalık, tek fonksiyon) | `isleme-payi-gocu-0141` (saf) + tarama |
| AC-52 (tedarikçi bölümü satırında `pay` hiç yok) | `isleme-payi-0141` |
| AC-59 (ters çevrilenler ve silinen dosya) | `isleme-payi-0141` (tarama: dosya yok, notlar var) + plan §6 listesi |
| AC-60, AC-61 (kanıt fikstürü, eşleme) | `tasarim-kaynak`, `kanit-eslemesi` + `0141-piksel-raporu.json` |

Her test adı `AC-<n>: …` taşır.

---

## 5. Sürüm notu taslağı

Malzeme kaleminin işleme payı alanları ve malzeme ile parça kartlarının emniyet payı alanı kalktı. Girilen ölçü satın alınan
ölçüdür; sipariş adedi ihtiyacın yukarı yuvarlanmışıdır. Bugün hiçbir kayıtta bu alanlar dolu değildi; dolu kayıt kalmışsa payı
ölçüye eklenerek açılır ve maliyeti değişmez. **Önce sunucu PC'yi güncelleyin**, sonra bütün istemcileri.

## 6. Uygulama notları

- **Hazırlık eski kodla yapıldı (adım 1):** beş fikstürün payı ölçüye katlandı, iki fikstürden emniyet payı silindi, bütün takım
  eski kodla koştu: yalnız 0138 kıyası kırıldı (0135 fikstürünü kullanıyor). Altınlar `YAZ_*=1` ile eski kodla yeniden üretildi:
  `0135-once.json`, `0139-once.json`, `0140-once.json` ve **`0138-once.json` de** (spec AC-41 0138'in diskte değişmeyeceğini
  söylüyordu; ölçüm: 0138 kıyası `0135-veri.js`'i kullandığı için emniyet payı silinince eski kodla da sipariş kısmı değişiyor, öteki
  üçüyle aynı muamele gerekti). **R10 tutmadı:** `0140-once.json` da değişti, çünkü 0140 kıyası `0139-veri.js`'i de okuyor.
  `0133-once.json` bayt bayt aynı. `0141-once.json` eski kodla yazıldı; veri `0139-veri.js`'in paysız kopyası artı bir set
  (patlatma yolu kıyasa girsin diye) ve fiyatın gerçekten türetilmesi için doğru ayar adı (`varsayilanKat`; 0139 fikstürünün
  `karKati` anahtarı motorun okuduğu ad değil, fiyat hiç türetilmiyordu).
- **Kaldırmadan sonra bütün kıyaslar geçti** (0135, 0138, 0139, 0140, 0141): `0141-ayikla.js` yalnız sipariş parça satırının `pay`
  anahtarını ve 0138'in kayıt gövdesini (aynı katlama fonksiyonuyla) ayıklar.
- **Spec iddiası düzeltmesi (AC-5):** Ø100 × 108, ρ 7,894 → 6,695928 kg; Excel'in 6,696'sıyla farkı %0,00108, yani "%0,001 içinde"
  değil. Excel'in değeri üç ondalığa yuvarlanmış gösterimdir; test beş ondalıkta 6,69593 ve üç ondalıkta 6,696'yı ölçer.
- **AC-19'un ikinci yolu gözlenemez:** öneri kaynağının adedi yalnız parçaları kapatılan kesitin **varlığını** belirler (satır
  parçasız kurulur); adedin paysızlığı motorda yüzde çarpımı kalmadığı taramasıyla ölçüldü.
- **Taramanın bulduğu iki metin:** malzeme kartının bant ipucusu ("Bandı ham çap (işleme payı dahil) seçer") ve `FIRE_KG_IPUCU`
  ("ham ağırlığına (işleme payı dahil)") kalkan kavrama atıf yapıyordu; "girilen çap" ve "ağırlığına" olarak düzeltildi.
- **Mutasyonla ölçülenler:** tek türetmenin iki kolu (kalem listesi kolu ilk turda yakalanmadı, AC-64'ün kalem listesi testi
  eklendi), dokunulmamış kayıt katlaması, form katlaması, üç ondalık yuvarlama, ibare; her biri en az bir testi kırdı.
- **Ters çevrilenler (karar 34):** `malzeme-0132` (AC-34, AC-35/83, AC-38, AC-39, AC-44, AC-46, AC-70, AC-81/82), `siparis-0134`
  (AC-13, AC-19/20, AC-21, AC-81/82, Karar 32, AC-83, AC-84), `maliyet-kalemleri-0135` (AC-26, AC-52–54/92, AC-62/63, AC-67/85, AC-69,
  AC-86/87, AC-90, AC-110, Karar 39), `fire-kg-0139` (AC-5, AC-9), `dis-islem-kalkar-0138` (tarama), `ui/maliyet-kalemleri-0135`
  (AC-12, AC-21/22, AC-45, AC-46, AC-47), `ui/maliyet-kalemleri-0135-app` (AC-45, AC-47), `ui/malzeme-0132-parca` (AC-29, AC-30–38,
  AC-45), `ui/siparis-0134` (AC-6, AC-8, AC-18), `ui/siparis-0134-app` (AC-54), `ui/siparis-0140` (Bulgu 6), dört kıyas, üç Electron
  betiği; silinen `ui/emniyet-payi-0134`. Payı yalnız veri olarak taşıyan testler katlanmış veriyle aynı iddiayı sürdürür.
- **Triyaj (2026-11-10):**
  - Bulgu 1: kanıt raporları (`0141-piksel-raporu.json`, `0141-taban-piksel-raporu.json`) üretildi, değişen ekranlar eşlemede `degisti` + onayla, AC-61'in adlı testi `isleme-payi-0141`'de (ayrıntı aşağıdaki kanıt notunda).
  - Bulgu 2: katlamanın sabit üç ondalığı, üç ondalıktan hassas ölçüde maliyeti değiştiriyordu (Ø99,9996 × 1000,0004 +8 kuruş, Ø139,99951 × 5999,9995 +82 kuruş). Yuvarlama artık ölçü ile payın hane sayısının büyüğüne yapılıyor, yani yalnız kayan nokta artığı siliniyor. AC-65'e dört ondalıklı ölçüler eklendi; spec A-R2/2, AC-44 ve karar 9 düzeltildi.
  - Bulgu 3: AC-41, C2/3 ve karar 40 uygulanan duruma göre düzeltildi (0138 ve 0140 altınları da eski kodla yenilendi); AC-41'in adlı testi altınların özetini sabitliyor.
- **Kanıt:** taban main `74200ea6` (1112 görüntü), dal 1132 görüntü; ilk karşılaştırmada 564 görüntü farklı çıktı. Farklı çıkan 283
  ekran iki koddan yeniden çekildi; iki çekimde de gürültü düzeyini (aynı kodun kendi farkının üç katı, en az 300 piksel) aşan
  45 ekran gerçek değişimdir: parça kartının malzeme ve maliyet bölümleri (pay ve emniyet alanları kalktı, özet "Ağırlık"),
  malzeme kartı (ızgara altı alan, bant ve fire ipucuları), sipariş penceresinin parça ihtiyacı tablosu (yedi başlık, ibare).
  Geri kalanlar gürültü (Giderler başlığı, select okları, bir Evrak ekranında kaydırma konumu). `0141-piksel-raporu.json` bu 45
  ekranı ve dört dosyanın değişmeyen ekranlarını taşır (54 ekran); `0141-taban-piksel-raporu.json` aynı ekranları son kodla
  yeniden çeker. Aynı kod da birçok pencerede 96–480 piksel oynadığı için değişmeyen ekranlardan yalnız 0 farklı olanlar `ayni`
  yazıldı; ötekilerin 0141 farkı aynı kodun tekrar farkına eşit (AC-61 testi bunu sabitler). Eşlemede değişen ekranlar
  `degisti` + onay (C11'in dört dosyası, ayrıca PartManager, MalzemeFiyatPenceresi, MalzemeEtkiOzeti); kapanışta `ayni`ye çevrilir.

## 7. Kapanış

Spec ve plan `specs/done/`'a taşındı, SCORECARD dolduruldu, README'ye satır eklendi, CLAUDE.md plan yolu ve commit güncellendi.
Kanıt eşlemesinin `degisti` kayıtları (AC-11c) kaldırıldı: değişimin kanıtı `0141-piksel-raporu.json` ve JPEG'lerinde durur; aynı kod
kendi tekrar çekiminde 96–480 piksel oynadığı için değişen ekranlar taban raporuna `ayni` olarak bağlanamaz (0 fark veren beş ekranın
`ayni` kaydı yerinde). AC-61 testi kapanış hâlinde: değişen ekranların rapordaki farkı ve değişmeyenlerin aynı-kod oynamasını
aşmaması. `tests/spec-atiflari.test.js` bekleme listesi boşaltıldı.
