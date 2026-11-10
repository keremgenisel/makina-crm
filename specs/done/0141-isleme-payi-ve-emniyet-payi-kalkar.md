# 0141 — İşleme payı ve emniyet payı kalkar

| | |
|---|---|
| **Durum** | **Tamamlandı** (2026-11-10, commit `3da4bccb`; plan `specs/done/0141-uygulama-plani.md`, plan turu kararlar 31–40, triyaj planın §6'sında) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Parça kartının maliyet kalemleri (`MaliyetKalemleriAlani.jsx`, `MalzemeSatiriAlani.jsx`, `PartManager.jsx`), Ayarlar › Katalog › Malzemeler (`MalzemeManager.jsx`), Stok › Parça/Yedek Parça Stoğu › Sipariş Listesi (`stock/SiparisPenceresi.jsx`), saf motorlar `malzeme.js` ve `siparisIhtiyaci.js`, form kurucuları `src/lib/urunAgaci.js` (`kalemFormu`) ve `src/lib/maliyetKalemleri.js` (eski alan okuması), `electron/db.cjs` (iki tablo, bir göç) ve yeni `electron/islemePayiGocuSaf.mjs`, kıyas fikstürleri ve altınları, `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs`, `scripts/tests/dis-islem-gocu.cjs`, `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, silinecek `tests/ui/emniyet-payi-0134.test.jsx`, `CLAUDE.md` |
| **Bağımlı spec'ler** | 0132 (işleme payını getirdi), 0134 (emniyet payını getirdi), 0135 (maliyet kalemleri ve eski `malzemeSatiri` okuması), 0139 (fire kilogramı, kalıyor), 0140 (sipariş penceresi, uygulandı ve kapandı), 0138 (kaldırma ve göç emsali), 0115 (göçün üç açılış dalı dersi), 0070 (ölü sütun emsali, QA turunda düzeltildi) |
| **QA turu** | 2026-11-10, 30 bulgu (5 Bloklayıcı / 14 Önemli / 11 Küçük); hepsi Takım Yöneticisi tarafından onaylandı ve spec'e işlendi |
| **Düzeltilen iddialar** | 4 (0070'in ölü sütun emsali, 0140'ın kapanış durumu, malzemeler okumasının ayıklaması, ham ölçünün çağıran sayısı) |
| **Ölçüm** | 2026-11-10, canlı veritabanı: 381 parça, 9 malzeme kartı; kaldırılacak dört alanın dolu kayıt sayısı **sıfır** |

---

## Intent

Fabrika maliyet ve sipariş hesabını müşterinin kendi Excel dosyasına göre kuruyor. O dosyada iki
kavram yok: parçanın bitmiş ölçüsü ile satın alınan malzemenin ölçüsü arasındaki ayrım, ve
"ihtiyacın biraz üstünde sipariş et" payı. Excel'de yazılan ölçü doğrudan satın alınan ölçüdür ve
sipariş adedi ihtiyacın kendisidir.

Uygulama bu iki kavramı taşıyor: her malzeme kaleminde ölçünün yanında bir işleme payı alanı var
(biçime göre bir ile üç alan), malzeme kartında ve parça kartında da birer emniyet payı alanı var.
İkisi de bugün hiçbir kayıtta dolu değil ve müşterinin veri modelinde karşılığı yok. Yönetim bu
alanların kalkmasını istedi.

Başarı şuna benzer: parça kartının maliyet kalemi ve malzeme kartı yalnız müşterinin cevabı olan
soruları soruyor, ne eksik ne fazla. Girilen ölçü satın alınan ölçüdür, sipariş adedi ihtiyacın
yukarı yuvarlanmışıdır, ve kaldırma hiçbir parçanın maliyetini ne artırır ne azaltır.

---

## Requirements

### A. İşleme payı kalkar

- **A-R1.** Parçanın malzeme kaleminde işleme payı alanı **yoktur**. Kalem beş alandan birini de
  (çap, kalınlık, genişlik, en, boy payı) göstermez ve kaydetmez.
- **A-R1/2.** Kayıtta kalmış payı **forma açılışta da** katlayan tek saf fonksiyon vardır ve
  `malzemeSatiriFormu` (dolayısıyla `kalemFormu`) onu çağırır: pay ölçüye eklenir, pay anahtarı
  forma hiç girmez. Göç yalnız yerel veritabanı açılışında çalıştığı için (istemci PC'de hiç
  çalışmaz), bu katlama olmadan eski kayıt forma girilen ölçüyle açılır ve dokunulmadan
  kaydedilince maliyeti **sessizce düşer**. Kural D-R3'ün kuralıyla aynı fonksiyondur
  (QA turu, B4).
- **A-R2.** Girilen ölçü satın alınan ölçüdür. Ağırlık, kesit ve fire bandı doğrudan girilen
  ölçüden hesaplanır.
- **A-R2/2.** Katlamanın sonucu **ölçü ile payın ondalık hane sayısının büyüğüne** yuvarlanır,
  yani yalnız kayan nokta artığı silinir: kayan nokta toplamı `10,1 + 0,2` değerini
  `10,299999999999999` yapıyor ve yuvarlama olmadan kartta on beş haneli bir ölçü görünür. Ağırlık
  ve kuruş değişmez (QA turu, Ö4). *(Triyaj 2026-11-10, bulgu 2: ilk yazılan "üç ondalık" kuralı
  üç ondalıktan hassas girilmiş ölçüde maliyeti değiştiriyordu: Ø99,9996 × 1000,0004, pay 4/5,
  +8 kuruş; Ø139,99951 × 5999,9995, +82 kuruş.)*
- **A-R3.** Kalemin canlı özetindeki ağırlık ibaresi "pay dahil" demez; yalnız "Ağırlık" der.
  Fire dahil ağırlık satırı aynen kalır.
- **A-R3/2.** Özet satırının yeni metni "Ağırlık: X · fire dahil: Y" biçimindedir (bugünkü tek
  satır düzeni korunur) ve `data-testid="malzeme-ham-kg"` ile `malzeme-fireli-kg` kimlikleri
  değişmez (QA turu, K5).
- **A-R4.** Boruda et kalınlığının çapın yarısından küçük olması kuralı aynen kalır.
- **A-R5.** İşleme payı doğrulaması ve hata metni kalkar.

#### QA turunda eklenen maddeler (2026-11-10)

- **A-R6.** Pay kalktıktan sonra "ham ölçü" **girilen ölçüdür** ve sipariş penceresinin "Net kg"
  sütunu ile kalemin ham ağırlığı aynı sayıdır (motor `netKg = Σ hamKg × adet` ile topluyor).
  Alan ve test kimlikleri (`hamOlculer`, `hamKesit`, `tamBoyKg`, `malzeme-ham-kg`) **değişmez**;
  yeniden adlandırma kapsam dışıdır (X7). Bu eşitlik kayda geçer ki bir sonraki spec adları
  yeniden adlandırmaya kalkmasın (QA turu, Ö10).

### B. Emniyet payı kalkar

- **B-R1.** Malzeme kartında emniyet payı alanı **yoktur**.
- **B-R1/2.** Malzeme kartının alan ızgarası yedi alandan **altıya** iner ve iki sütunlu düzende
  son satırdaki tek alan kalkar. Alan sırası ve ızgara aynen kalır (ek düzen işi yapılmaz); bu
  bilinçli görünüm değişikliği kanıt kaydında `degisti` olarak işaretlenir (QA turu, Ö12).
- **B-R2.** Parça kartının maliyet bölümünde emniyet payı alanı **yoktur**.
- **B-R2/2.** Alanın etrafındaki iskelet de kalkar: `PartManager`'ın `hatalar.pay` anahtarı ve
  `bosHatalar` nesnesinin `pay` alanı, `MaliyetKalemleriAlani`'nın yalnız bu alanı saran
  `<fieldset disabled={set}>` kabı, `MalzemeSatiriAlani`'nın `PAY_ALANI` içe alımı ve
  `hatalar[PAY_ALANI[ad]]` okuması. Bunlar lint hatası vermez, sessizce kalır (QA turu, Ö11).
- **B-R3.** Sipariş ihtiyacı adedi, ihtiyacın yukarı yuvarlanmışıdır; hiçbir yüzde uygulanmaz.
  Bu kural kit satırından gelen adette, setten patlatılan adette ve öneri adedinde aynıdır.
- **B-R4.** Sipariş penceresinin parça ihtiyacı tablosunda "Emniyet payı" sütunu **yoktur**;
  tablo sekiz sütundan yedi sütuna iner.
- **B-R4/2.** Tablonun üstünde tek cümlelik ibare durur: "Ham ihtiyaç ile İhtiyaç yalnız setten
  patlatılan parçalarda ayrışır; başka hiçbir pay uygulanmaz." Metin `src/lib/siparisIhtiyaci.js`'te
  sabittir (0140 C-R12 emsali). Gerekçe: iki sütunun farkını bugüne kadar açıklayan tek şey kalkan
  "Emniyet payı" sütunuydu; kullanıcı aynı iki sayıyı yan yana görünce sütunu bozuk sanar
  (QA turu, Ö13).
- **B-R5.** "Ham ihtiyaç" ve "İhtiyaç" sütunları **ikisi de kalır**. Pay kalktıktan sonra yalnız
  kit satırından beslenen parçada ikisi **aynı** sayıyı gösterir (ham ihtiyaç da yukarı
  yuvarlanıyor); setten patlatılan adet yuvarlanmadan ham ihtiyaca eklendiği için o parçalarda
  ikisi gerçekten ayrışır. Eşitlik de bilgidir: hiçbir pay uygulanmadığını söyler.
- **B-R6.** Emniyet payı doğrulaması, etiketi, ipucusu ve hata metni kalkar.

#### QA turunda eklenen maddeler (2026-11-10)

- **B-R7.** Öneri adedinin **iki yolu** da paydan arınır: satırın `oneri` alanı (düzenlemeden
  önceki sipariş adedinin kopyası) ve yalnız düzenleme girdisi verilince kurulan öneri kaynağı
  (kit ihtiyacı artı düzenlenmemiş setlerin patlatması eksi stok). Payın iki çarpımı ikinci
  yoldadır, bu yüzden parametresiz çağrıda ölçülemez; AC-19 düzenleme girdisiyle ölçülür
  (QA turu, Ö9).

### C. Kalanlar (bilinçli olarak kaldırılmayanlar)

- **C-R1.** Malzeme kartının **varsayılan fire (%)** alanı kalır. Müşterinin Excel'i plastik
  malzemelerde yüzde fire kullanıyor (`% FİRE EKLEME = 10`), bu alan onun karşılığıdır.
- **C-R2.** Malzeme kartının **fire kilogram bantları** kalır (spec 0139).
- **C-R3.** Malzeme kaleminin **parça düzeyindeki fire (%)** alanı kalır; malzemedeki varsayılanı
  ezme önceliği değişmez.
- **C-R4.** Malzeme kartının **asgari sipariş (kilogram)** alanı kalır; sipariş motorundaki
  asgariye yükseltme, boy adedini artırma ve uyarı davranışı değişmez.
- **C-R5.** Malzeme kartının **geldiği boy** ve **boy fiyatı** alanları, kalemin **maliyet
  yöntemi** seçicisi ve boy yolunun bütün hesabı değişmez.
- **C-R6.** Kalemin **adet** alanı değişmez.

### D. Veri ve göç

- **D-R1.** `parts.emniyetPayi` ve `malzemeler.emniyetPayi` sütunları şemada **ölü sütun** olarak
  kalır: ne okunur ne yazılır, satırlar silinmez.
- **D-R1/2.** "Ölü sütun" **değerleri korumaz**: veritabanı her kayıtta `DELETE` ve `INSERT` ile
  yeniden yazıldığı için sütun, yazma yolundan çıktığı andan sonraki ilk kayıtta bütün satırlarda
  NULL olur. Bugün dolu kayıt olmadığı için (0/381 ve 0/9) veri kaybı yoktur; korunan şey satırlar
  ve şemadır, değerler değil. 0138'in emsali ölü **tablo**ydu ve tablo hiç yazılmadığı için orada
  satırlar gerçekten korunuyordu (QA turu, Ö1).
- **D-R2.** İşleme payı kalıcı bir sütun değil, kalemin JSON'u içindeki anahtardır; kaldırılması
  yeni bir anahtarın yazılmaması demektir.
- **D-R2/2.** Pay **iki** JSON sütununda yaşıyor: `parts.maliyetKalemleri` ve 0132'den kalan
  `parts.malzemeSatiri`. İkisi de şemada kalır (QA turu, K4).
- **D-R3.** Yerel veritabanı açılışında bir dönüşüm, işleme payı taşıyan her kalemi payı ölçünün
  üstüne ekleyerek ve pay anahtarını silerek çevirir (`çap 96` + `pay 4` → `çap 100`). Dönüşüm
  parçanın maliyetini **değiştirmez**.
- **D-R3/2.** Dönüşüm **iki alanı birlikte** çevirir: `maliyetKalemleri[]` ve `malzemeSatiri`.
  Gerekçe: `maliyetKalemleriOf` kalem listesi boşken eski `malzemeSatiri`'nden malzeme kalemi
  türetiyor (0135 göç yazmadı), yani pay orada da yaşıyor; atlanırsa 0132 döneminden kalan parça
  düzenlenince maliyeti düşer (QA turu, B3).
- **D-R3/3.** Dönüşüm yalnız bu **iki sütunu** `UPDATE` ile yazar, blob yolunu (`writeBlobToDb`)
  kullanmaz ve başka hiçbir sütuna dokunmaz (0138'in `UPDATE parts SET maliyetKalemleri` emsali).
  Blob yolu bütün tabloları yeniden yazar ve D-R1/2'nin sütun boşalmasını göç anında tetiklerdi
  (QA turu, Ö5).
- **D-R4.** Dönüşüm **bayrak taşımaz** ve her yerel açılışta çalışır; pay taşıyan kalem yoksa
  hiçbir şey yazmaz ve yedek almaz.
- **D-R4/2.** Dönüşüm `migrateFromJsonIfNeeded`'in **üç açılış dalında da** çağrılır (var olan
  veritabanı, temiz kurulum, JSON içe aktarma; `applyColumnMigrations` kuralı). Veritabanı yedeği
  (`data.db.isleme-payi-gocu-<zaman>.bak`) yalnız değişecek kalem varken alınır (0138 emsali);
  yoksa alınmaz. İstemci kipinde yerel veritabanı açılmadığı için hiç çalışmaz (QA turu, Ö3).
- **D-R5.** Emniyet payı için göç yazılmaz.

#### QA turunda eklenen maddeler (2026-11-10)

- **D-R6.** Göç **iki testle** ölçülür (0138 emsali): planı saf testle
  (`electron/islemePayiGocuSaf.mjs`), yazımı, yedeği ve ikinci açılışı gerçek veritabanıyla
  (`scripts/tests/isleme-payi-gocu.cjs`, `ELECTRON_TESTLERI` listesine eklenir). AC-35 ve AC-36
  yalnız gerçek veritabanıyla ölçülebilir (QA turu, Ö14).

---

## Constraints

### Uyulması zorunlu

- **C1.** **Payı olmayan veride bütün çıktılar birebir aynıdır.** Maliyet zinciri, satış fiyatı,
  Model Maliyetleri, Parti Hesabı, Excel dışa ve içe aktarma, malzeme zammı etki önizlemesi ve
  sipariş ihtiyacı spec öncesi kodla karşılaştırılır (`0141-once.json`, `YAZ_0141=1`).
  **Altının verisi `0139-veri.js`'in paysız kopyasıdır** (en zengin fikstür: dört malzeme, fire
  bant tablosu, boy yöntemi, set, asgari sipariş) ve altın kaldırmadan **önce** eski kodla yazılır.
  Bugünkü beş fikstürün hepsi işleme payı, ikisi emniyet payı taşıdığı için "payı olmayan veri"
  yeniden kurulmak zorundadır; aynı kopya C2'nin hazırlık adımıyla ortaktır (QA turu, B5).
- **C2.** **Kıyas fikstürlerinin işleme payı ölçüye toplanır.** Ölçüm:
  `tests/fixtures/0133-veri.js`, `0134-veri.js`, `0135-veri.js`, `0137-veri.js` ve `0139-veri.js`
  dosyalarının malzeme kalemlerinde `payCap` 2 ile 4, `payBoy` 3 ile 5 arasında **dolu** değerler
  var. Pay motordan kalkınca bu fikstürler eski çıktıyı üretmez. Çözüm D-R3'ün aynı kuralıdır:
  fikstürün ölçüsü payı kadar büyütülür, pay anahtarı silinir, ham ölçü değişmez.
- **C2/2.** **Emniyet payı üç altını işleme payı gibi kurtarmaz; hazırlık adımı gerekir.** Ölçüm:
  `0135-veri.js` iki malzemeye `emniyetPayi` 5 ve 12, `0139-veri.js` bir malzemeye 5 yazıyor;
  bu yüzden `0135-once.json` ile `0139-once.json` parça satırlarında `"pay": 5` ve payla
  hesaplanmış ihtiyaç (ham 70 → 74, ham 140 → 147) duruyor, `0140-once.json` ise 29 tane
  `"pay": null` anahtarı taşıyor. Emniyet payı bir ölçüye toplanamaz, adedi çarpar. Çözüm iki
  adımdır: (1) **kod değişmeden** üç fikstürden `emniyetPayi` silinir ve üç altın **eski kodla**
  yeniden üretilir (davranış aynıdır, pay sıfıra iner, altın hâlâ spec öncesi kodun çıktısıdır);
  (2) kaldırmadan sonra altınlar birebir tutar. Kalan tek fark `pay` anahtarının yokluğudur ve o
  `tests/fixtures/0141-ayikla.js` ile iki taraftan ayıklanır (`0139-ayikla.js`, `0135-ayikla.js`,
  `0131-ayikla.js` emsali) (QA turu, B1).
- **C2/3.** **`0138-once.json` işleme payını kayıt gövdesi olarak taşıyor.** Ölçüm: o altının
  `kayitGovdesi` bloğu parçanın kaydedilen gövdesini basıyor ve içinde
  `malzemeSatiri.payCap = 4`, `payBoy = 5` ile `maliyetKalemleri[0].payCap = 2`, `payBoy = 3`
  duruyor; fikstürün ölçüsü büyütülünce gövdedeki `cap` ve `boy` da değişir, pay anahtarları
  kaybolur. Çözüm: ayıklama yardımcısı aynı katlama kuralını **altının kendisine** de uygular
  (gövdedeki payı ölçüye ekler, anahtarı siler) ve karşılaştırma ondan sonra yapılır (QA turu, B2).
  *(Uygulamada düzeltildi, triyaj bulgu 3: 0138 kıyası `0135-veri.js`'i de okuyor; o fikstürden
  emniyet payı silinince (C2/2) eski kodun çıktısı da değiştiği için `0138-once.json` öteki üçü
  gibi hazırlık adımında **eski kodla yeniden üretildi**. Ayıklamanın katlaması zararsız kalır.)*
- **C3.** Fire bandı seçimi ham çaptan okunmaya devam eder; ham çap artık girilen çaptır.
- **C4.** İki emsal **ayrı şeyler** söyler, karıştırılmaz. 0070'in `sgkTutar`'ı bugün hâlâ
  yazılıyor ve okunuyor (`INSERT` parametresi, `ensureColumns` kaydı ve okumanın `bosOlmayan`
  satırı yerinde); orada kalkan şey yalnız **motorların okuması**, veritabanı yolu değil.
  "Okuma ve yazma yolu kalkar, şema dokunulmaz, satır silinmez" tanımına uyan tek emsal 0138'in
  `dis_islemler` tablosudur. Bu spec ikinciyi uygular ve sonucu D-R1/2'de yazılıdır
  (QA turu, Ö2).
- **C5.** Göçün çekirdeği saf bir ES modülüdür ve kaynak klasörünü okumaz (`electron/kasaGocuSaf.mjs`,
  `kalipTamiriGocuSaf.mjs`, `disIslemGocuSaf.mjs` emsali). Pay anahtarı ile ölçü adının eşlemesi o
  modülde kendi sabiti olarak durur; `src/lib/malzeme.js` içe alınamaz.
- **C6.** Yeni izin, yeni veri bölümü, yeni sunucu kuralı ve yeni birleştirme kuralı yok. Bu bir
  kaldırma işidir.
- **C7.** `FIRE_BOY_UYARISI` metnindeki "talaş işleme payında" ifadesi **kalır**: o cümle malzemenin
  fiziksel olarak nerede kaybolduğunu söyler, kalkan alana atıf yapmaz.
- **C8.** Sipariş motorunun opt-in sözleşmeleri (`tedarikciOdakli`, `duzenleme`) ve dönüş şekli
  B-R4 dışında değişmez; `pay` alanı parça satırından kalkar.
- **C9.** Yazdırılan sipariş raporu emniyet payını hiç basmıyor (0140 ile yeniden yazıldı, hazır
  parça tablosunun sütunları Parça, İhtiyaç, Stok ve Sipariş adedi; ölçüldü); çıktı değişmez.
- **C10.** Ters çevrilen kriterler ve silinen test dosyası **listelenir**. Ölçüm: emniyet payının
  turunu dört dosya sabitliyor (`scripts/tests/db-roundtrip.cjs`'in beş iddiası = 0134 AC-58,
  AC-59, AC-60 ve C4 iki kez; `scripts/tests/db-clean-install.cjs`'in değer turu;
  `scripts/tests/dis-islem-gocu.cjs`'in 0138 AC-26 ile C4'ündeki `emniyetPayi === 5` beklentisi;
  bütünüyle bu alana ait 102 satırlık `tests/ui/emniyet-payi-0134.test.jsx`). Ters çevrilen
  kriterlerin testine "spec 0141 ile" notu düşülür, dosya silinmesi 0138'in 0137 testlerini
  silme emsalini izler (QA turu, Ö6).
- **C11.** Kanıt eşlemesi dosya dosya güncellenir. Ölçüm: `docs/evidence/kanit-eslemesi.json`'da
  `MalzemeSatiriAlani.jsx` 67, `MaliyetKalemleriAlani.jsx` 93, `MalzemeManager.jsx` 38 ve
  `stock/SiparisPenceresi.jsx` 6 kayıt taşıyor ve hepsi `beklenen: "ayni"`. Bilinçli değişen
  ekranlar (parça kartının iki kipi, malzeme kartının iki kipi, sipariş penceresinin parça
  ihtiyacı tablosu) `beklenen: "degisti"` artı `onay` satırıyla işaretlenir
  (`Takım Yöneticisi · 2026-11-10 · spec 0141 A-R1/B-R1/B-R4`), geri kalanı "ayni" kalır
  (QA turu, Ö7).
- **C12.** Kanıt aracının fikstürü de katlanır: `scripts/evidence/0009-sayfa.jsx` parçanın malzeme
  satırını `cap: 140, boy: 78, payCap: 4, payBoy: 5` ile kuruyor. Ölçü katlanmazsa kanıt
  ekranlarındaki ağırlık ve maliyet de değişir ve "yalnız alan kalktı" iddiası ölçülemez
  (QA turu, Ö8).
- **C13.** `alanDogrula`'nın `ustHata` parametresi **yerinde kalır** (genel yardımcının
  parametresidir, emniyet payına ait değil); AC-26'nın taraması yalnız altı kimliği arar
  (QA turu, K8).

### KAPSAM DIŞI

- **X1.** Asgari sipariş alanının kaldırılması — *neden:* bu bir tedarikçi gerçeğidir ("100 kilodan
  az satmıyorum"), kullanıcı tercihi değil; sipariş listesinde elle düzeltmekle çözülmez çünkü
  kullanıcı asgariyi aklında tutmak zorunda kalır.
- **X2.** Parça düzeyindeki fire alanının kaldırılması — *neden:* tek alan ve kaldırılırsa fire
  önceliği zinciri de gider; "bu parçada hurda çok" durumu çıkarsa geri getirmek yeni spec olur.
- **X3.** "Ham ihtiyaç" ve "İhtiyaç" sütunlarının tek sütuna indirilmesi — *neden:* B-R5; setten
  patlatılan parçada iki sayı gerçekten ayrışır ve dün çıkmış bir ekrandan sütun çıkarmak ikinci
  bir görünüm değişikliğidir.
- **X4.** Ölü sütunların şemadan düşürülmesi — *neden:* C4; kazancı yok, riski var.
- **X5.** Alüminyum, 8620 ve 1050 malzemelerinin fire kuralının belirlenmesi — *neden:* müşteriden
  cevap bekliyor (spec 0139 X3); bu spec'in konusu kaldırmak, doldurmak değil.
- **X6.** Canlı veritabanındaki eksik malzeme verisinin tamamlanması (plastiklerin %10 firesi,
  alüminyumun özgül ağırlığı) — *neden:* veri girişi işidir, kod işi değil; Ek 2'de listelendi.
- **X7.** Malzeme kaleminin ölçü alanlarının yeniden adlandırılması ya da biçim listesinin
  değişmesi — *neden:* bu spec yalnız pay alanlarını kaldırır.

---

## Context

### Bugünkü davranış

**İşleme payı.** `src/lib/malzeme.js:30` `PAY_ALANI` beş ölçüyü beş pay anahtarına eşler
(`cap → payCap`, `kalinlik → payKalinlik`, `genislik → payGenislik`, `en → payEn`, `boy → payBoy`).
`BICIMLER` (satır 31-36) her biçimin `paylar` listesini taşır: mil ve boru `["cap","boy"]`, lama
`["kalinlik","genislik","boy"]`, sac `["kalinlik","en","boy"]`. Boruda **et kalınlığının payı yok**,
yani model zaten payı olmayan ölçüyü biliyor.

`hamOlculer` (satır 199-211) ham ölçüyü üretir:

```js
const payAd = b.paylar.includes(ad) ? PAY_ALANI[ad] : null;
o[ad] = v + (payAd ? (sayiOf(satir[payAd]) || 0) : 0);
```

Bu ham ölçü **dört** yere gider: `hacimMm3` (ağırlık), `hamKesit` (satır 236-239, sipariş kesit
anahtarı), `ekFireKg`'ın bant seçimi (ham çap) ve `tamBoyKg` (satır 231; sipariş motorunun tam boy
ağırlığı oradan gelir). Pay kalkınca dördü de girilen ölçüyü okur (QA turu, K3).

Doğrulama `malzemeSatiriDogrula` (satır 407-428) ölçü döngüsünden sonra pay döngüsünü koşar; sıfır
olmayan pay kayda yazılır, boş ve sıfır yazılmaz (`PAY_HATASI = "İşleme payı negatif olamaz."`).
`SATIR_ALANLARI` (satır 429) beş pay anahtarını taşır, bu yüzden `malzemeSatiriFormu` kaydı forma
açarken payları da taşır.

Arayüz `src/components/MalzemeSatiriAlani.jsx:78-83`: her ölçünün altında, yalnız `b.paylar`
listesindeyse, `"<Ölçü> işleme payı (mm)"` alanı. Özet satırı (satır 90) `"Pay dahil ağırlık"` der.

**Emniyet payı.** İki alan: `malzemeler.emniyetPayi` ve `parts.emniyetPayi` (ikisi de REAL, dört
nokta kuralıyla; `db.cjs:585` `EMNIYET_PAYI_COLUMN`). Sabitler `malzeme.js:323-326`
(`EMNIYET_PAYI_HATASI`, `emniyetPayiDogrula`, `EMNIYET_PAYI_ETIKETI`, `EMNIYET_PAYI_IPUCU`).
Malzeme kartı alanı `MalzemeManager.jsx:228`, kaydet beyaz listesinde satır 135. Parça kartı alanı
`MaliyetKalemleriAlani.jsx`'in `PayAlani` bileşeni (satır 26-32, çizim satır 103), `PartManager`
onu `emniyetPayi`/`setEmniyetPayi`/`payHata` props'uyla iki kipte çizer (satır 724 ve 783) ve
kayıt fonksiyonunda doğrular (satır 336, 350, 499).

Motor `src/lib/siparisIhtiyaci.js:153-159` `emniyetPayiOf`: parçanın payı varsa o, yoksa malzeme
kalemlerinin malzemelerindeki payların en büyüğü, hiçbiri yoksa sıfır. Payın üç kullanıcısı var:

| Yer | Bugün | Pay kalkınca |
|---|---|---|
| Kit satırı (satır 222) | `k.ihtiyac += k.set ? yukari(ham) : yukari(ham * (1 + k.pay / 100))` | `k.ihtiyac += yukari(ham)` |
| Setten patlatma (satır 258) | `k.ihtiyac += yukari(k.patlatmaHam * (1 + k.pay / 100))` | `yukari(k.patlatmaHam)` |
| Öneri adedi (satır 309, 314) | aynı çarpım iki yerde | çarpım kalkar |

Dikkat: kit satırında **ham ihtiyaç da yukarı yuvarlanıyor** (`k.ham += yukari(ham)`, satır 221),
yani pay kalkınca "Ham ihtiyaç" ile "İhtiyaç" o parçalarda eşitlenir. İki sütunun gerçekten
ayrıştığı tek yer setten patlatma: orada `k.ham += k.patlatmaHam` yuvarlanmadan eklenir (satır 258)
ve ihtiyaç onun yukarı yuvarlanmışıdır. B-R5 bu ölçüme dayanır.

Parça satırı `pay` alanını dışarı veriyor (satır 265) ve `stock/SiparisPenceresi.jsx:206` bunu
"Emniyet payı" sütununda, satır 218'de `data-testid="siparis-pay"` hücresinde basıyor. **Yazdırılan
rapor (`siparisRaporu.js`) bu sütunu hiç basmıyor** (ölçüldü).

### Ölçüm (2026-11-10, canlı veritabanı)

| Alan | Dolu kayıt |
|---|---|
| `malzemeler.emniyetPayi` | 0 / 9 |
| `parts.emniyetPayi` | 0 / 381 |
| `malzemeler.asgariSiparis` | 0 / 9 (kalıyor, X1) |
| Kalemde işleme payı | 0 (hiçbir parçada `maliyetKalemleri` yok) |

Yani bugün taşınacak veri yok. Dış işlem kataloğunda (0138) ölçüm aynıydı ve orada göç yine
yazıldı; gerekçe sürüm arası penceredir (aşağıda Kararlar 3).

### Bilinen tuzaklar

1. **Kıyas altınları.** C2'de yazıldı: fikstürlerin payı dolu, altınlar yenilenmez.
   `0140-once.json` ve `0139-once.json` içindeki "işleme payında" eşleşmeleri alan değil,
   `FIRE_BOY_UYARISI` cümlesidir (C7).
2. **Göç paketlenmiş uygulamada `src/` okuyamaz** (0115 ve 0138 dersi); C5.
3. **Örnek katalog** (`src/lib/ornekKatalog.js`) emniyet payı ve işleme payı **yazmıyor** (ölçüldü);
   `asgariSiparis: "100"` yazıyor ve o alan kalıyor.
4. **İçe aktarma aracı** (`src/lib/malzemeListesiAktarma.js`) pay yazmıyor (ölçüldü), yani spec
   0139'un aracı bu kaldırmadan etkilenmez.
5. **Veritabanı yuvarlak testi** `scripts/tests/db-roundtrip.cjs:935` ve `:1051` pay taşıyan kayıt
   yazıp geri okuyor; bu iki kayıt payı bırakacak biçimde güncellenir.
6. **Spec 0140 uygulandı ve kapandı** (uygulama `f7812271`, kapanış `74200ea6`; spec
   `specs/done/0140-tedarikci-odakli-siparis-listesi.md`). Bu spec 0140'ın B-R4 ile çakışan iki
   kriterini ters çevirir ve atıflar `done/` altındaki dosyaya yapılır (QA turu, K1).

### QA turunda ölçülenler (2026-11-10)

Hepsi HEAD'de kodla doğrulandı (0140 uygulandıktan sonraki hâl).

- **Ölçüm A.** `tests/fixtures/0135-veri.js` iki malzemeye `emniyetPayi` 5 ve 12, `0139-veri.js` bir
  malzemeye 5 yazıyor; bu yüzden `0135-once.json` ile `0139-once.json` parça satırlarında
  `"pay": 5` ve payla hesaplanmış ihtiyaç duruyor (ham 70 → ihtiyaç 74, ham 140 → ihtiyaç 147).
- **Ölçüm B.** `0140-once.json` 29 tane `"pay": null` anahtarı taşıyor; C8 o alanı satırdan
  kaldırdığı için anahtarın yokluğu da altını bozar.
- **Ölçüm C.** `tests/dis-islem-kalkar-0138-kiyas.test.js`'in `kayitGovdesi` bloğu parçanın
  kaydedilen gövdesini basıyor ve `0138-once.json` içinde `kayitGovdesi[0].malzemeSatiri.payCap = 4`,
  `payBoy = 5`, `kayitGovdesi[9].maliyetKalemleri[0].payCap = 2`, `payBoy = 3` duruyor.
- **Ölçüm D.** `src/lib/maliyetKalemleri.js` kalem listesi boşken `parts.malzemeSatiri`'nden malzeme
  kalemi türetiyor (`maliyetKalemleriOf`), yani işleme payı o eski alanda da yaşıyor.
- **Ölçüm E.** `urunAgaci.kalemFormu` kalemi `malzemeSatiriFormu` ile açıyor, o da `SATIR_ALANLARI`'nı
  okuyarak beş pay anahtarını forma taşıyor; `malzemeSatiriDogrula` kaydı sıfırdan kurduğu için pay
  anahtarı listeden çıktığı anda kayıttan da düşer. Göç ise `db.cjs`'in üç yerel açılış dalında
  çalışıyor, istemci PC'de hiç çalışmıyor.
- **Ölçüm F.** Beş kıyas fikstürünün hepsi işleme payı taşıyor (`0133-veri.js`, `0134-veri.js`,
  `0135-veri.js`, `0137-veri.js`, `0139-veri.js`), ikisi emniyet payı da taşıyor; yani "payı olmayan
  veri" diye bir fikstür yok.
- **Ölçüm G.** `writeBlobToDb` her kayıtta `DELETE FROM parts` ve `INSERT` yapıyor, `malzemeler` için
  aynısı; bir sütun `INSERT` listesinden çıkınca bir sonraki kayıtta bütün satırlarda NULL olur.
- **Ölçüm H.** 0070'in `sgkTutar`'ı bugün hâlâ yazılıyor ve okunuyor (`INSERT` parametresi,
  `ensureColumns` kaydı, okumanın `bosOlmayan` satırı); o emsalde kalkan şey yalnız motorların
  okumasıydı.
- **Ölçüm I.** 0138'in `disIslemGocu`'su üç açılış dalında çağrılıyor ve veritabanı yedeğini yalnız
  değişecek parça varken alıyor.
- **Ölçüm J.** Kayan nokta toplamı 0134 triyajında ölçülmüştü: `10,1 + 0,2` değeri
  `10,299999999999999` çıkıyor; motor kesit anahtarını bu yüzden üç ondalığa yuvarlıyor.
- **Ölçüm K.** 0138'in göçü `UPDATE parts SET maliyetKalemleri = ? WHERE id = ?` ile yalnız bir
  sütun yazıyor, blob yolunu kullanmıyor.
- **Ölçüm L.** Emniyet payının turunu dört dosya sabitliyor: `scripts/tests/db-roundtrip.cjs`'in beş
  iddiası, `scripts/tests/db-clean-install.cjs`'in değer turu, `scripts/tests/dis-islem-gocu.cjs`'in
  `emniyetPayi === 5` beklentisi ve 102 satırlık `tests/ui/emniyet-payi-0134.test.jsx`.
- **Ölçüm M.** `docs/evidence/kanit-eslemesi.json`'da `MalzemeSatiriAlani.jsx` 67,
  `MaliyetKalemleriAlani.jsx` 93, `MalzemeManager.jsx` 38, `stock/SiparisPenceresi.jsx` 6 kayıt
  taşıyor ve hepsi `beklenen: "ayni"`.
- **Ölçüm N.** `scripts/evidence/0009-sayfa.jsx` parçanın malzeme satırını
  `cap: 140, boy: 78, payCap: 4, payBoy: 5` ile kuruyor.
- **Ölçüm O.** Öneri adedi iki yerde yaşıyor: satırın `oneri` alanı (düzenlemeden önceki sipariş
  adedinin kopyası) ve yalnız düzenleme girdisi verilince kurulan öneri kaynağı; payın iki çarpımı
  ikinci yoldadır, parametresiz çağrıda o yol hiç kurulmaz.
- **Ölçüm P.** Sipariş motoru `netKg = Σ hamKg × adet` ile topluyor ve pencere o sütunu "Net kg"
  diye yazıyor; `hamKg` bugün pay dahil ağırlıktır.
- **Ölçüm R.** Kalkan alanın etrafındaki iskelet: `PartManager`'ın `hatalar.pay` anahtarı ve
  `bosHatalar`'ın `pay` alanı, `MaliyetKalemleriAlani`'nın yalnız `PayAlani`'yı saran
  `<fieldset disabled={set}>` kabı, `MalzemeSatiriAlani`'nın `PAY_ALANI` içe alımı ve
  `hatalar[PAY_ALANI[ad]]` okuması.
- **Ölçüm S.** Malzeme kartı iki sütunlu ızgarada yedi alan çiziyor (ad, alaşım, özgül ağırlık,
  varsayılan fire, emniyet payı, geldiği boy, asgari sipariş).
- **Ölçüm T.** 0140'ın tedarikçi bölümlerindeki hazır parça satırı `pay` alanı **taşımıyor**; pay
  yalnız `parcaSatirlari`'nda ve pencerenin parça ihtiyacı tablosunda duruyor (sekiz başlık).
- **Ölçüm U.** `hamOlculer`'in dört çağıranı var: `hacimMm3` (ağırlık), `hamKesit`, `ekFireKg`'ın
  bant seçimi ve `tamBoyKg`.
- **Ölçüm V.** `malzemeler` okuması `emniyetPayi`'yi ayıklamıyor; genel
  `Object.entries(rest).filter(([, v]) => v != null)` süzgecini kullanıyor, yani dolu değer gövdeye
  giriyor. `parts` okuması destructuring ile ayırıyor.
- **Ölçüm Y.** 0140 uygulandı (`f7812271`) ve kapandı (`74200ea6`); spec
  `specs/done/0140-tedarikci-odakli-siparis-listesi.md`.
- **Ölçüm Z.** 0140 ile yeniden yazılan `siparisRaporu.js` emniyet payını basmıyor; hazır parça
  tablosunun sütunları Parça, İhtiyaç, Stok ve Sipariş adedi (C9 doğrulandı).

### QA turunda verilen kararlar (2026-11-10)

1. **Emniyet payının üç altını hazırlık adımıyla yenilenir, altın yine eski kodun çıktısıdır**
   (Bloklayıcı; C2/2, AC-41; Ölçüm A, Ölçüm B).
2. **`0138-once.json`'un kayıt gövdesi ayıklama yardımcısıyla katlanır, dosya diskte değişmez**
   (Bloklayıcı; C2/3, AC-41; Ölçüm C).
3. **Göç iki alanı birlikte çevirir (`maliyetKalemleri` ve `malzemeSatiri`)** (Bloklayıcı; D-R3/2,
   AC-33, AC-37; Ölçüm D).
4. **Payı forma açılışta da katlayan tek saf fonksiyon yazılır** (Bloklayıcı; A-R1/2, AC-11;
   Ölçüm E).
5. **`0141-once.json`'un verisi `0139-veri.js`'in paysız kopyasıdır ve altın kaldırmadan önce
   yazılır** (Bloklayıcı; C1, AC-40; Ölçüm F).
6. **Ölü sütun değerleri korumaz; ilk kayıtta boşalır ve bu yazılı** (Önemli; D-R1/2, AC-38;
   Ölçüm G).
7. **C4'ün iki emsali ayrıldı; bu spec 0138'in tanımını uygular** (Önemli; C4; Ölçüm H).
8. **Göç üç açılış dalında çağrılır, yedek yalnız değişecek kalem varken alınır** (Önemli; D-R4/2;
   Ölçüm I).
9. **Katlamanın sonucu kayan nokta artığından arındırılır** (Önemli; A-R2/2; Ölçüm J; triyaj bulgu 2 ile "üç ondalık" yerine ölçü ile payın hane sayısı).
10. **Göç yalnız iki JSON sütununu `UPDATE` eder, blob yolunu kullanmaz** (Önemli; D-R3/3; Ölçüm K).
11. **Ters çevrilen kriterler ve silinen test dosyası listelenir** (Önemli; C10, Definition of Done;
    Ölçüm L).
12. **Kanıt eşlemesi dosya dosya güncellenir, değişen ekran `degisti` ve onaylı olur** (Önemli;
    C11, Definition of Done; Ölçüm M).
13. **Kanıt aracının fikstürünün ölçüsü de katlanır** (Önemli; C12; Ölçüm N).
14. **AC-19 düzenleme girdisiyle ölçülür; öneri adedinin iki yolu da paydan arınır** (Önemli; B-R7,
    AC-19; Ölçüm O).
15. **"Net kg" ile ham ağırlığın eşitliği kayda geçer, adlar değişmez** (Önemli; A-R6; Ölçüm P).
16. **Kalkan alanın etrafındaki iskelet de sayılır** (Önemli; B-R2/2, Ek 1; Ölçüm R).
17. **Malzeme kartının ızgarası altı alana iner, düzen aynen kalır** (Önemli; B-R1/2; Ölçüm S).
18. **İki sütunun farkını açıklayan ibare tablonun üstüne yazılır** (Önemli; B-R4/2; Ölçüm T).
19. **Göç iki testle ölçülür: saf çekirdek ve gerçek veritabanı** (Önemli; D-R6, AC-33–AC-37).
20. **Kıyas kararı Definition of Done'a madde olarak girdi** (Küçük; Definition of Done).
21. **0140'ın kapanış durumu düzeltildi** (Küçük; Bilinen tuzaklar 6; Ölçüm Y).
22. **`malzemeler` okumasına ayıklama eklenir** (Küçük; Ek 1; Ölçüm V).
23. **Ham ölçünün dört çağıranı yazıldı** (Küçük; Context; Ölçüm U).
24. **İşleme payının iki JSON sütununda yaşadığı yazıldı** (Küçük; D-R2/2; Ölçüm D).
25. **Özet satırının yeni metni ve test kimlikleri yazıldı** (Küçük; A-R3/2).
26. **`MalzemeSatiriAlani`'nın emniyet payını anlatan yorumu güncellenir** (Küçük; Ek 1; Ölçüm R).
27. **AC-12'nin tarama istisnaları tam yollu ve sayılı yazılır** (Küçük; AC-12).
28. **`alanDogrula`'nın `ustHata` parametresi yerinde kalır** (Küçük; C13).
29. **Ek 2'nin satır sayılarının kaynağı yazıldı** (Küçük; Ek 2).
30. **Başlık tablosunun etkilenen alanlar satırı tamamlandı** (Küçük; başlık tablosu).

### QA turu karar kaydı (2026-11-10)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Emniyet payı üç altını bozuyor | Bloklayıcı | Hazırlık adımıyla yenilenir | C2/2, AC-41 |
| 2 | 0138 altını kayıt gövdesinde pay taşıyor | Bloklayıcı | Ayıklama altına da uygulanır | C2/3, AC-41 |
| 3 | Göç eski `malzemeSatiri`'ni kapsamıyor | Bloklayıcı | İki alan birlikte çevrilir | D-R3/2 |
| 4 | Form kaydı payı sessizce düşürüyor | Bloklayıcı | Forma açılışta katlanır | A-R1/2, AC-11 |
| 5 | Yeni altının verisi yazılmamış | Bloklayıcı | `0139-veri.js`'in paysız kopyası | C1, AC-40 |
| 6 | Ölü sütun ilk kayıtta boşalıyor | Önemli | Cümle düzeltildi | D-R1/2, AC-38 |
| 7 | 0070 emsali kodla çelişiyor | Önemli | İki emsal ayrıldı | C4 |
| 8 | Göçün dalları ve yedeği yazılmamış | Önemli | Üç dal, koşullu yedek | D-R4/2 |
| 9 | Katlamanın yuvarlaması tanımsız | Önemli | Üç ondalık | A-R2/2 |
| 10 | Göçün yazdığı sütunlar yazılmamış | Önemli | İki sütun `UPDATE` | D-R3/3 |
| 11 | Ters çevrilen kriterler sayılmamış | Önemli | Liste ve DoD maddesi | C10, DoD |
| 12 | Kanıt eşlemesinin 204 kaydı | Önemli | `degisti` + onay kuralı | C11, DoD |
| 13 | Kanıt aracının fikstürü pay taşıyor | Önemli | Ölçüsü katlanır | C12 |
| 14 | AC-19 parametresiz çağrıda ölçülemez | Önemli | Düzenleme girdisiyle | B-R7, AC-19 |
| 15 | "Net kg" ile ham ağırlık eşitleniyor | Önemli | Kayda geçti, adlar durur | A-R6 |
| 16 | Kalkan alanın iskeleti sayılmamış | Önemli | Dört yer yazıldı | B-R2/2, Ek 1 |
| 17 | Malzeme kartının ızgarası değişiyor | Önemli | Altı alan, düzen aynı | B-R1/2 |
| 18 | İki sütunun farkı ekranda açıklanmıyor | Önemli | Tek cümlelik ibare | B-R4/2 |
| 19 | Göçün test türü yazılmamış | Önemli | Saf artı Electron | D-R6 |
| 20 | Kıyas kararı DoD'da yazılı değil | Küçük | Madde eklendi | Definition of Done |
| 21 | 0140 kapandı, tuzak güncel değil | Küçük | Düzeltildi | Bilinen tuzaklar 6 |
| 22 | Malzemeler okuması ayıklama yapmıyor | Küçük | Ayıklama eklenir | Ek 1 |
| 23 | Ham ölçünün çağıran sayısı eksik | Küçük | Dört çağıran | Context |
| 24 | Payın iki sütunda yaşadığı yazılmamış | Küçük | D-R2/2 eklendi | D-R2/2 |
| 25 | Özet satırının yeni metni yazılmamış | Küçük | Metin ve kimlikler | A-R3/2 |
| 26 | Yorum emniyet payının yerini anlatıyor | Küçük | Güncellenir | Ek 1 |
| 27 | Tarama istisnaları eksik | Küçük | Tam yollu liste | AC-12 |
| 28 | `ustHata` parametresinin kaderi | Küçük | Yerinde kalır | C13 |
| 29 | Ek 2'nin sayılarının kaynağı yok | Küçük | Kaynak yazıldı | Ek 2 |
| 30 | Etkilenen alanlar eksik | Küçük | Tamamlandı | Başlık tablosu |


---

## Acceptance Criteria

### A. İşleme payı

- **AC-1.** Yuvarlak mil biçimli bir malzeme kaleminde yalnız çap ve boy alanı çizilir; "çap işleme
  payı" ve "boy işleme payı" alanları yoktur.
- **AC-2.** Lama biçiminde kalınlık, genişlik ve boy alanları çizilir; üç pay alanı yoktur.
- **AC-3.** Sac biçiminde kalınlık, en ve boy alanları çizilir; üç pay alanı yoktur.
- **AC-4.** Boru biçiminde çap, et ve boy alanları çizilir; pay alanı yoktur.
- **AC-5.** Çap 100 ve boy 108 girilen paslanmaz kalemin ağırlığı, özgül ağırlık 7,894 ile
  6,69593 kg çıkar (Excel'in 6,696 değerinin %0,001 içinde).
- **AC-6.** Kalemin özet satırı "Ağırlık" yazar; "Pay dahil" ifadesi ekranda hiç geçmez.
- **AC-7.** Kalemin özet satırındaki "fire dahil" ağırlık ve değeri değişmez.
- **AC-8.** Fire kilogram bandı girilen çaptan seçilir: çap 100 olan paslanmaz kalemde ek fire
  0,35 kg olur.
- **AC-9.** Boruda et kalınlığı çapın yarısına eşit ya da büyükse kayıt reddedilir ve hata
  et alanında görünür.
- **AC-10.** Kaydedilen kalemde beş pay anahtarının hiçbiri yoktur.
- **AC-11.** `payCap` taşıyan eski bir kalem forma açılıp dokunulmadan kaydedilirse, kaydedilen
  kalemde pay anahtarı yoktur ve ölçü payı kadar büyümüştür (maliyet değişmez). Ölçüm veritabanı
  olmadan, forma açılışın katlamasıyla yapılır (A-R1/2; QA turu, B4).
- **AC-12.** Kaynakta `PAY_ALANI`, `payCap`, `payBoy`, `payKalinlik`, `payGenislik`, `payEn`
  kimlikleri ve "işleme payı" etiket metni geçmez. İstisnalar tam yollu ve sayılı yazılır: göç
  modülünün kendi eşlemesi, `FIRE_BOY_UYARISI` cümlesi, göç testinin fikstürü, katlanmış kıyas
  fikstürleri ve `scripts/evidence/0009-sayfa.jsx` (QA turu, K7).

### B. Emniyet payı

- **AC-13.** Malzeme kartının ekleme kipinde emniyet payı alanı yoktur.
- **AC-14.** Malzeme kartının düzenleme kipinde emniyet payı alanı yoktur.
- **AC-15.** Parça kartının maliyet bölümünde, "Elle sabit" kipinde emniyet payı alanı yoktur.
- **AC-16.** Parça kartının maliyet bölümünde, "Hesapla" kipinde emniyet payı alanı yoktur.
- **AC-17.** Kit adedi 1 olan, stoğu 0 olan ve 10 makinalık satırda geçen bir parçanın sipariş
  ihtiyacı 10'dur (daha önce payı %10 olan malzemeyle 11 çıkıyordu).
- **AC-18.** Setten patlatılan bileşenin ihtiyacı da payı uygulamadan yukarı yuvarlanır.
- **AC-19.** Öneri adedi payı uygulamadan hesaplanır: payı %10 olan malzemeyi kullanan, kit adedi
  1 olan ve 10 makinalık satırda geçen stoksuz parçanın öneri adedi 10'dur. Ölçüm **düzenleme
  girdisiyle** yapılır ve iki yolu da kapsar: satırın `oneri` alanı ile öneri kaynağının adedi
  (B-R7; QA turu, Ö9).
- **AC-20.** Kaydedilen malzeme kartında `emniyetPayi` anahtarı yoktur.
- **AC-21.** Kaydedilen parçada `emniyetPayi` anahtarı yoktur.
- **AC-22.** `emniyetPayi` değeri dolu eski bir parça kaydedilirse anahtar düşer ve sipariş
  ihtiyacı pay uygulanmamış değeri verir.
- **AC-23.** Sipariş penceresinin parça ihtiyacı tablosunda yedi başlık vardır ve "Emniyet payı"
  bunların arasında değildir.
- **AC-24.** "Ham ihtiyaç" ve "İhtiyaç" sütunları tabloda durur; yalnız kit satırından beslenen
  parçada ikisi aynı sayıyı gösterir (kit adedi 3,571 ve 70 makinada ikisi de 250).
- **AC-25.** Bileşen miktarı 1,5 olan bir setten 3 adet patlatılan parçada ham ihtiyaç 4,5,
  ihtiyaç 5 görünür; iki sütun ayrı sayı taşır.
- **AC-26.** Kaynakta `emniyetPayi`, `emniyetPayiOf`, `EMNIYET_PAYI_ETIKETI`, `EMNIYET_PAYI_IPUCU`,
  `EMNIYET_PAYI_HATASI` ve `emniyetPayiDogrula` kimlikleri geçmez (tarama); `alanDogrula`'nın
  `ustHata` parametresi aranmaz, yerinde kalır (C13; QA turu, K8).
- **AC-27.** Yazdırılan sipariş raporunun çıktısı spec öncesiyle birebir aynıdır.

### C. Kalanlar

- **AC-28.** Malzeme kartının varsayılan fire (%) alanı durur ve 10 girildiğinde plastik bir
  kalemin fireli ağırlığı ham ağırlığın 1,1 katı olur.
- **AC-29.** Malzeme kartının fire kilogram bant tablosu durur ve altı bantlı tabloda çap 100 için
  0,35 kg seçilir.
- **AC-30.** Malzeme kaleminin parça düzeyindeki fire (%) alanı durur ve malzemedeki varsayılanı
  ezer.
- **AC-31.** Malzeme kartının asgari sipariş alanı durur; sipariş kilosu asgarinin altındaysa
  kilo asgariye yükselir ve uyarı yazılır.
- **AC-32.** Boy yöntemli kalemin oranı, geldiği boy ve boy fiyatı davranışı değişmez.

### D. Veri, göç ve kıyas

- **AC-33.** İşleme payı taşıyan bir kalemi olan parça, yerel veritabanı açılışında payı ölçüye
  eklenmiş ve pay anahtarı silinmiş olarak okunur; aynı ölçüm eski `malzemeSatiri` alanında pay
  taşıyan parça için de yapılır (D-R3/2; QA turu, B3).
- **AC-34.** Göçten önce ve sonra o parçanın maliyeti kuruşuna kadar aynıdır.
- **AC-35.** Pay taşıyan kalem yoksa göç hiçbir satır yazmaz ve veritabanı yedeği almaz.
- **AC-36.** Göç ikinci açılışta yeniden çalışır ve hiçbir şeyi değiştirmez (pay anahtarı
  kalmadığı için).
- **AC-37.** Çöpteki parçaların kalemleri de göçten geçer (iki alanın ikisi de).
- **AC-38.** `parts` ve `malzemeler` tablolarında `emniyetPayi` sütunu durur ve satırlar
  silinmemiştir; sütunun **değerleri** ilk kayıtta boşalır ve bu beklenen sonuçtur (D-R1/2;
  QA turu, Ö1).
- **AC-39.** `emniyetPayi` değeri dolu bir gövde kaydedilirse değer veritabanına yazılmaz ve
  okumada gövdeye girmez.
- **AC-40.** Payı olmayan veride maliyet zinciri, satış fiyatı, Model Maliyetleri, Parti Hesabı,
  Excel dışa ve içe aktarma, zam etki önizlemesi ve sipariş ihtiyacı spec öncesi altınla birebir
  aynıdır (`0141-once.json`).
- **AC-41.** Altın dosyaların kaderi dosya dosya ölçülür: `0133-once.json` bayt bayt değişmez;
  `0135-once.json`, `0138-once.json`, `0139-once.json` ve `0140-once.json` **kaldırmadan önce**
  hazırlık adımında eski kodla yenilenir ve kaldırmadan sonra bayt bayt değişmez (C2/2, C2/3);
  dördünde kalan `pay` anahtarı ve 0138'in kayıt gövdesi `tests/fixtures/0141-ayikla.js` ile iki
  taraftan ayıklanır (QA turu, B1 ve B2; triyaj bulgu 3: 0138 de yenilendi). Dosyaların özeti adlı
  testte sabittir.

### QA turu kriterleri (2026-11-10)

**İşleme payının kalkması ve katlama**

- **AC-42.** `payCap` ve `payBoy` taşıyan bir kalem forma açıldığında ölçü alanları katlanmış değeri
  gösterir ve pay alanı çizilmez (A-R1/2).
- **AC-43.** Form katlamasından sonra kalemin canlı maliyeti, kaldırmadan önceki maliyetle kuruşuna
  kadar aynıdır (A-R1/2).
- **AC-44.** Katlama yalnız kayan nokta artığını siler: çap 10,1 ve pay 0,2 girilmiş kalem 10,3
  olur, 10,299999999999999 değil; çap 99,9996 ve pay 4 girilmiş kalem 103,9996 olur, kesilmez
  (A-R2/2; triyaj bulgu 2).
- **AC-45.** Katlama tek saf fonksiyondadır ve göç ile form aynı fonksiyonu çağırır (tarama,
  A-R1/2, D-R3).
- **AC-46.** Kalemin özet satırı "Ağırlık: X · fire dahil: Y" biçiminde tek satırdır ve iki test
  kimliği (`malzeme-ham-kg`, `malzeme-fireli-kg`) yerindedir (A-R3/2).
- **AC-47.** Sipariş penceresinin "Net kg" sütunu ile kalemin ham ağırlığı aynı sayıdır; alan ve
  test kimlikleri değişmemiştir (A-R6).

**Emniyet payının kalkması**

- **AC-48.** Malzeme kartının alan ızgarası altı alan çizer ve alan sırası değişmemiştir (B-R1/2).
- **AC-49.** `PartManager`'ın hata nesnesinde `pay` anahtarı yoktur ve `MaliyetKalemleriAlani`'da
  boş `fieldset` kalmamıştır (B-R2/2).
- **AC-50.** `MalzemeSatiriAlani` `PAY_ALANI`'nı içe almaz ve pay hatası okumaz (B-R2/2).
- **AC-51.** Sipariş penceresinin parça ihtiyacı tablosunun üstünde iki sütunun farkını açıklayan
  ibare görünür ve metni motorun sabitinden gelir (B-R4/2).
- **AC-52.** Tedarikçi bölümlerindeki hazır parça satırı bu spec'ten önce de `pay` taşımıyordu ve
  sonra da taşımaz; çıktının o yarısı değişmez (C8).

**Veri, göç ve testler**

- **AC-53.** Eski `malzemeSatiri` alanında pay taşıyan parça göçten geçer: pay ölçüye eklenir,
  anahtar silinir ve maliyet değişmez (D-R3/2).
- **AC-54.** Göç yalnız `maliyetKalemleri` ve `malzemeSatiri` sütunlarını `UPDATE` eder; başka hiçbir
  sütun ve tablo değişmez (D-R3/3).
- **AC-55.** Göç üç açılış dalının her birinde çalışır (var olan veritabanı, temiz kurulum, JSON içe
  aktarma) (D-R4/2).
- **AC-56.** Veritabanı yedeği yalnız değişecek kalem varken alınır; pay yoksa yedek dosyası
  oluşmaz (D-R4/2, AC-35).
- **AC-57.** Göçün planı saf testle, yazımı ve ikinci açılışı Electron betiğiyle ölçülür ve betik
  `ELECTRON_TESTLERI` listesindedir (D-R6).
- **AC-58.** `malzemeler` okuması `emniyetPayi`'yi gövdeye yazmaz (bugün genel null süzgeciyle
  yazıyordu) (Ek 1, AC-39).
- **AC-59.** Ters çevrilen 0134 ve 0138 kriterleri listelenmiştir, testlerine "spec 0141 ile" notu
  düşülmüştür ve `tests/ui/emniyet-payi-0134.test.jsx` silinmiştir (C10).
- **AC-60.** `scripts/evidence/0009-sayfa.jsx` fikstürünün ölçüsü katlanmıştır ve kanıt
  ekranlarındaki ağırlık ile maliyet değişmemiştir (C12).
- **AC-61.** Bilinçli değişen kanıt ekranları `beklenen: "degisti"` ve onay satırıyla kayıtlıdır,
  geri kalanı "ayni" kalmıştır (C11).
- **AC-62.** `0141-once.json` `0139-veri.js`'in paysız kopyasından ve kaldırmadan önce eski kodla
  üretilmiştir; kıyas boş geçmez (sipariş satırı, maliyet satırı, fiyat ve etki satırı üretir)
  (C1, AC-40).

### Plan turu kriterleri (2026-11-10)

- **AC-63.** `payCap` taşıyan eski bir parça maliyet bölümüne **dokunulmadan** kaydedilirse kaydedilen gövdenin iki alanında
  (`maliyetKalemleri`, `malzemeSatiri`) pay anahtarı yoktur, ölçü payı kadar büyümüştür ve maliyet değişmez (A-R1/3).
- **AC-64.** Pay taşıyan ve göçten geçmemiş bir parçanın maliyeti, sipariş ihtiyacı, satış fiyatı ve Excel dışa aktarması
  katlanmış hâliyle aynıdır (okuma tek türetmede katlar; A-R1/3).
- **AC-65.** Katlama beş kıyas fikstürünün bütün malzeme kalemlerinde maliyeti kuruşuna kadar korur (A-R2/2, karar 32).
- **AC-66.** Temiz kurulumda ve var olan veritabanında `parts.emniyetPayi` ve `malzemeler.emniyetPayi` sütunları vardır
  (`ensureColumns` kaydı kalır; D-R1/3).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap içeren iş saf motorda; arayüz yalnız gösteriyor.
- [ ] Aynı sayıyı üreten başka ekran/rapor varsa ikisi aynı kaynağı kullanıyor.
- [ ] Kaldırılan alanlar için dört nokta kuralının tersi uygulandı: sütunlar şemada bırakıldı,
      `INSERT` ve `SELECT` yollarından çıkarıldı, `db-roundtrip` testi güncellendi.
- [ ] Yeni veri bölümü yok; **yeni eylem izni eklenmediği açıkça yazıldı** (C6).
- [ ] Soft-delete ve çöp kutusu simetrisi etkilenmedi (göç çöptekileri de kapsıyor, AC-37).
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı değişmedi (AC-27).
- [ ] Para gösterimi değişmedi.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi; kalkan alanların ekranları yeniden çekildi ve
      `docs/evidence/kanit-eslemesi.json` kayıtları güncellendi.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (0132, 0134, 0135, 0139, 0140 bölümlerindeki pay atıfları).
- [ ] Kıyas kararı uygulandı: üç fikstürün emniyet payı silindi ve üç altın **kaldırmadan önce**
      eski kodla yenilendi; `0133-once.json` bayt bayt korundu, `0138-once.json` ayıklamayla
      karşılaştırıldı (C2/2, C2/3).
- [ ] Katlama tek saf fonksiyonda ve göç ile form onu birlikte çağırıyor (A-R1/2, D-R3).
- [ ] Göç iki JSON sütununu kapsıyor, üç açılış dalında çağrılıyor ve yedeği koşullu alıyor
      (D-R3/2, D-R3/3, D-R4/2).
- [ ] Ters çevrilen 0134 ve 0138 kriterleri listelendi, testlerine "spec 0141 ile" notu düşüldü ve
      `tests/ui/emniyet-payi-0134.test.jsx` silindi (C10).
- [ ] Kanıt eşlemesinde değişen ekranlar `degisti` ve onaylı; kanıt aracının fikstürü katlandı
      (C11, C12).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin kararları (2026-11-10)

1. **Kullanılmayacak alanlar kaldırılır.** Müşterinin Excel'inde karşılığı olmayan ve bugün hiçbir
   kayıtta dolu olmayan alanlar programdan çıkar.
2. **Kaldırılacaklar:** malzeme kaleminin beş işleme payı alanı, malzeme kartının ve parça kartının
   emniyet payı alanları.
3. **Kalacaklar:** varsayılan fire (%), fire kilogram bantları, asgari sipariş, parça düzeyindeki
   fire. Analistin önerisi kabul edildi (X1, X2).
4. **"Ham ihtiyaç" ve "İhtiyaç" sütunları ikisi de kalır.** Analistin önerisi kabul edildi (B-R5).
5. **Sütunlar şemada ölü kalır.** Analistin önerisi kabul edildi (D-R1).

### Analistin kararları, onaylandı (Takım Yöneticisi, 2026-11-10)

Üç önerinin hepsi kabul edildi.

1. **Göç bayrak taşımaz ve her yerel açılışta çalışır (D-R3, D-R4).** Gerekçe: bayraklı tek
   seferlik göç (0138 deseni) yalnız yükseltme anındaki veriyi düzeltir; sürüm arası pencerede
   güncellenmemiş bir bilgisayardan gelen pay bayrak zaten yazıldığı için hiç çevrilmez ve o
   parçanın maliyeti **sessizce düşer**. Sessiz maliyet düşmesi bu projede üç kez hata oldu.
   Bayrakla uğraşmayınca dönüşüm kendiliğinden kalıcı bir savunma olur; bedeli, pay anahtarı
   taşıyan kalem olup olmadığını soran tek bir sorgudur ve yokken hiçbir şey yazmaz.
   **Reddedilen alternatifler:** (a) bayraklı tek seferlik göç, pencereden sonra gelen payı
   kaçırır; (b) `hamOlculer`'in eski anahtarı okumayı sürdürmesi, motoru sadeleştirmez ve kartta
   görünen ölçü maliyeti açıklamaz; (c) hiç göç yazmamak, pay taşıyan parça düzenlenince
   maliyetinin düşmesi demektir.
2. **Kıyas fikstürlerinin payı ölçüye toplanır, altınlar yenilenmez (C2).** Gerekçe: altın
   dosyalar spec öncesi davranışın kaydıdır; yenilenirse "davranış değişmedi" iddiası kendi
   kendini doğrulayan bir cümleye iner. Payı ölçüye toplamak ham ölçüyü koruduğu için altınlar
   bayt bayt geçerli kalır. **Reddedilen alternatif:** beş altını yeniden üretmek.
3. **Dönüşümün kuralı ile göçün kuralı aynı fonksiyondur.** Gerekçe: fikstür dönüşümü ve veri
   göçü aynı işlemi yapar (payı ölçüye ekle, anahtarı sil); iki ayrı yerde yazılırsa biri
   düzeltilip öteki unutulur.

### Plan turunda verilen kararlar (Takım Yöneticisi, 2026-11-10; plan `specs/0141-uygulama-plani.md` §3)

On önerinin hepsi kabul edildi.

31. **Katlama üç yerde çağrılır (R1, Bloklayıcı).** Ölçüm: `PartManager.jsx`'in kayıt fonksiyonu maliyet bölümüne dokunulmadıysa
    `maliyetKalemleri` ve eski üç alanı (`malzemeSatiri` dahil) eski kayıttan aynen kopyalıyor (0135 kuralı); A-R1/2'nin form
    katlaması bu yolu kapsamıyordu ve pay kayıtta kalıp maliyeti sessizce düşürürdü. **A-R1/3:** aynı saf fonksiyon (a)
    `maliyetKalemleriOf`'ta (tek türetme: motor, sipariş, fiyat, Excel ve form açılışı göç görmemiş kaydı da doğru okur), (b)
    parça kartının dokunulmamış kayıt yolunda (yazılan iki alan katlanır), (c) `malzemeSatiriFormu`'nda çağrılır. Bu, Kararlar 1'in
    reddettiği (b) alternatifi değildir: motor eski anahtarı okumaz, katlama türetme anında olur (AC-63, AC-64).
32. **Yuvarlamanın zararsızlığı geniş ölçülür (R2).** AC-34 ve AC-43 beş fikstürün bütün malzeme kalemlerinde kuruş eşitliğiyle
    ölçülür (AC-65).
33. **Çekirdek `src`'ye bağlanır (R3).** Katlama `electron/islemePayiGocuSaf.mjs`'te durur; `src/lib/maliyetKalemleri.js` ve
    `malzeme.js` onu içe alır (0115 `kalipTamiriGocuSaf.mjs` emsali). `maliyetKalemleri.js`'in "lib modülü içe almaz" kuralına bu
    dosya istisna olarak yazılır (dosya hiçbir şey içe almaz, döngü yoktur).
34. **Ters çevrilen testlerin listesi genişler (R4).** C10'un saydıklarına 0132, 0133, 0135, 0139 ve 0140 testleri eklenir (plan
    §0 Ö-3). Payın kendisini sınayan it blokları silinir ve yeni testteki karşılığına notla bağlanır; payla birlikte başka şey
    sınayanlar katlanmış veriyle aynı iddiayı sürdürür. AC-59 bu listeyle ölçülür.
35. **0139 AC-5 yeniden yazılır (R5):** "çap payı üst banda taşır" yerine girilen çap 141 olan kalem, aynı kilogram beklentisi (C3).
36. **`EMNIYET_PAYI_COLUMN`'un `ensureColumns` kaydı kalır (R6).** **D-R1/3:** sütunlar yalnız yazma ve okuma yolundan çıkar; kayıt
    zararsızdır ve AC-38 iki kurulum türünde aynı sonucu verir (AC-66). Ek 1'in bu satırı buna göre okunur.
37. **Göçün her açılıştaki tarama maliyeti kabul edilir (R7);** saf testte 5.000 parçalı planın süresi kaba eşikle ölçülür.
38. **Sürüm arası pencere kabul edilir (R8):** istemcinin eski gövdesi payı geri getirirse bir sonraki yerel açılışta yeniden
    katlanır; arada A-R1/3(a) doğru hesaplatır. Sürüm notu "önce sunucu PC" der.
39. **Kanıt gürültüsü iki taraflı tekrarla ayrılır (R9);** `degisti` yalnız gerçek değişen ekranlara yazılır.
40. **`0140-once.json` de yeniden üretilir (R10).** *(Uygulamada: fark boş değil, çünkü 0140 kıyası `0139-veri.js`'i de okuyor ve o fikstürden emniyet payı silindi; yenilenen altın yine eski kodun çıktısıdır, triyaj bulgu 3.)*

### Açık, müşteriden cevap bekleyen (bu spec'i bloke etmez)

1. Alüminyum, 8620 semente ve 1050 imalat çeliğinde fire kuralı (spec 0139 X3).
2. Kestamit özgül ağırlığı: Excel 1,15, kartta 1,18 girili.
3. 8620 ve 1050 için girilen 7,8 değerinin doğrulanması.

---

### QA turunun kararlara etkisi (2026-11-10)

Takım Yöneticisi'nin beş kararı ve analistin üç kararı aynen durur. Analistin 1. kararı (göç bayrak
taşımaz, her yerel açılışta çalışır) **yetersiz çıktı**: göç yalnız yerel veritabanı açılışında
çalışıyor, istemci PC'de hiç çalışmıyor, yani "sessiz maliyet düşmesi" gerekçesi form yolunda açık
kalıyordu. Karar aynı gerekçeyle genişletildi: payı forma açılışta da katlayan aynı saf fonksiyon
(A-R1/2). Analistin 2. kararı (altınlar yenilenmez) **işleme payı için geçerli, emniyet payı için
değil**: emniyet payı bir ölçüye toplanamadığı için üç altın hazırlık adımında, kaldırmadan önce,
eski kodla yenilenir ve altın yine spec öncesi davranışın kaydı kalır (C2/2). Analistin 3. kararı
(dönüşümün kuralı ile göçün kuralı aynı fonksiyondur) üçüncü bir çağıran kazandı: form.

Kapsam iki yerde büyüdü: göç eski `malzemeSatiri` alanını da çevirir (D-R3/2) ve kanıt aracının
fikstürü katlanır (C12). Bir yerde daraldı: ölü sütunun değerleri korunmuyor, yalnız satırlar ve
şema korunuyor (D-R1/2). Dört iddia düzeltildi: 0070'in ölü sütun emsali, 0140'ın kapanış durumu,
malzemeler okumasının ayıklaması ve ham ölçünün çağıran sayısı.

---

## Ek 1: kaldırılacak alanların kaynak haritası

| Dosya | İşleme payı | Emniyet payı |
|---|---|---|
| `src/lib/malzeme.js` | `PAY_ALANI`, `BICIMLER[*].paylar`, `hamOlculer`'in pay satırı, `malzemeSatiriDogrula`'nın pay döngüsü, `PAY_HATASI`, `SATIR_ALANLARI`'nın beş anahtarı | `EMNIYET_PAYI_HATASI`, `emniyetPayiDogrula`, `EMNIYET_PAYI_ETIKETI`, `EMNIYET_PAYI_IPUCU`, `malzemeDogrula`'nın alan satırı, `malzemeFormu`'nun alanı |
| `src/components/MalzemeSatiriAlani.jsx` | pay alanının çizimi, "Pay dahil ağırlık" ibaresi, `PAY_ALANI` içe alımı, `hatalar[PAY_ALANI[ad]]` okuması, satır 10'daki yorum | — |
| `src/components/MalzemeManager.jsx` | — | alan (satır 228), kaydet beyaz listesi (satır 135), iki içe alma |
| `src/components/MaliyetKalemleriAlani.jsx` | — | `PayAlani` bileşeni, çizim satırı, iki içe alma, yalnız bu alanı saran `<fieldset disabled={set}>` kabı |
| `src/components/PartManager.jsx` | — | boş form alanı, kayıt fonksiyonunun ayıklaması ve yazımı, form açılışı, doğrulama, iki kipteki props, `hatalar.pay` anahtarı ve `bosHatalar`'ın `pay` alanı |
| `src/lib/siparisIhtiyaci.js` | — | `emniyetPayiOf`, `k.pay`, üç çarpım, parça satırının `pay` alanı |
| `src/components/stock/SiparisPenceresi.jsx` | — | "Emniyet payı" başlığı ve `siparis-pay` hücresi |
| `electron/db.cjs` | göç çağrısı üç açılış dalına eklenir | iki `INSERT`; `parts` okumasının ayıklaması (bugün destructuring ile ayırıyor) ve `malzemeler` okumasına **yeni** ayıklama (bugün ayırmıyor, genel `v != null` süzgeci kullanıyor, QA turu K2); `EMNIYET_PAYI_COLUMN`'un `applyColumnMigrations` kaydı (sütun şemada kalır) |
| `electron/islemePayiGocuSaf.mjs` | **yeni**, saf çekirdek (iki alanı birlikte çevirir) | — |
| `src/lib/urunAgaci.js` | `kalemFormu`'nun katlaması (A-R1/2; `malzemeSatiriFormu` üzerinden) | — |
| `src/lib/maliyetKalemleri.js` | eski `malzemeSatiri` okumasının göç kapsamı (D-R3/2); `maliyetKalemleriOf` katlar (A-R1/3) | — |
| `scripts/tests/db-roundtrip.cjs` | pay taşıyan iki kayıt | emniyet payının beş iddiası (C10) |
| `scripts/tests/db-clean-install.cjs` | — | değer turunun iddiası (C10) |
| `scripts/tests/dis-islem-gocu.cjs` | — | 0138 AC-26 ile C4'ün `emniyetPayi === 5` beklentisi (C10) |
| `scripts/evidence/0009-sayfa.jsx` | fikstürün ölçüsü katlanır (C12) | — |
| `docs/evidence/kanit-eslemesi.json` | değişen ekranların kaydı (C11) | değişen ekranların kaydı (C11) |
| `tests/ui/emniyet-payi-0134.test.jsx` | — | **silinir** (C10) |
| `CLAUDE.md` | 0132 ve 0135 bölümlerindeki pay atıfları | 0134, 0139 ve 0140 bölümlerindeki pay atıfları |

## Ek 2: ölçüm sırasında bulunan canlı veri eksikleri (X6, kapsam dışı)

Satır sayıları ("48 plastik satır") bu spec'in ölçümünde değil, **spec 0139'un kaynak dosya
ölçümünde** sayıldı; sayının kaynağı o ölçümdür (QA turu, K9).

| Bulgu | Sonucu |
|---|---|
| TEFLON, KESTAMİT, DERLİN kartlarında varsayılan fire boş | Excel'de bu malzemeler %10 fire alıyor; 48 plastik satırın maliyeti %10 düşük |
| ALÜMİNYUM 5083 ve 6013 kartlarında özgül ağırlık boş (kilo fiyatları 290 ve 295 TL girili) | O parçaların maliyeti "girilmedi" döner |
| KESTAMİT özgül ağırlığı 1,18, Excel 1,15 | %2,6 maliyet farkı |
| 8620 ve 1050 kartlarında 7,8 girili, Excel o sayfalarda hesap yapmıyor | Değer doğrulanmalı |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `3da4bccb` | Dal `feat/0141-pay-kalkar`, taban `74200ea6`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (30 bulgu), plan turu (revizyon 2, kararlar 31–40: dokunulmamış kayıt dalı katlamayı atlıyordu) |
| **Düzeltme turu sayısı** | 1 | Triyaj: bir orta, iki düşük bulgu |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Kanıt raporları ve eşleme üretilmemişti; sabit üç ondalık yuvarlama hassas ölçüde maliyeti kuruşlarca değiştiriyordu; AC-41'in metni uygulanan altın yenilemesiyle çelişiyordu |
| **Regresyon sayısı** | 0 | Tam takım 519 dosya, 7264 test, Electron dahil; lint 0 hata |
| **Kaçan hata** | 1 | Triyaj bulgu 2 (yuvarlamanın zararsızlığı yalnız bir ve dört ondalıklı olmayan ölçülerle ölçülmüştü) |

**Uygulamada bulunanlar:** plan turunda ölçülen dokunulmamış kayıt dalı (0135'in "eski alanları aynen kopyala" kuralı) form katlamasını atlıyordu; katlama tek türetmeye ve o dala da kondu. Kıyas fikstürleri birbirini okuduğu için 0138 ve 0140 altınları da eski kodla yenilenmek zorunda kaldı. Tarama kullanıcıya görünen iki eski "işleme payı dahil" metnini yakaladı. AC-5'in "%0,001" iddiası ölçüyle tutmadı (fark %0,00108; Excel'in 6,696'sı üç ondalıklı gösterim). Kanıt aracı aynı kodun iki çekiminde birçok pencerede 96–480 piksel oynuyor; gerçek değişim iki taraflı tekrar çekimle ayrıldı (45 ekran).

**Bu spec'ten çıkarılan ders:** "kayıtta kalmış veri formda dönüştürülür" kuralı, kaydı formdan geçirmeden yazan her yolu da (burada dokunulmamış düzenleme) saymalı; dönüştürmenin asıl yeri tek türetmedir. Yuvarlamanın "zararsız" olduğu iddiası, kuralın varsaydığından hassas girdilerle ölçülmeli. Altın dosyaların "değişmez" iddiası, fikstürlerin birbirini okuyup okumadığı ölçülmeden yazılmamalı.
