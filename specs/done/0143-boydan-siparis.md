# 0143 — Boy fiyatı yöntemi kalkar, yerine boydan sipariş işareti gelir

| | |
|---|---|
| **Durum** | **Tamamlandı** (commit `02d9428d`, 2026-11-12). Revizyon 2: plan turunda dokuz öneri onaylandı; triyajda üç madde (B-R5/2, B-R9/3, D-R3/6). |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Parça kartının malzeme kalemi (`MalzemeSatiriAlani.jsx`), Ayarlar › Katalog › Malzemeler (`MalzemeManager.jsx`, `MalzemeFiyatPenceresi.jsx`), saf motorlar `malzeme.js` ve `siparisIhtiyaci.js`, sipariş penceresi (`stock/SiparisPenceresi.jsx`) ve belgesi (`siparisRaporu.js`), `electron/db.cjs` (iki ölü sütun, bir göç) ve yeni `electron/boyGocuSaf.mjs`, örnek katalog, içe aktarma aracı (`malzemeListesiAktarma.js`), `src/types.d.ts`, kıyas fikstürleri ve beş altın, `scripts/tests/db-roundtrip.cjs`, `tests/ornek-katalog.test.js`, ters çevrilen dokuz test dosyası, `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md` |
| **Bağımlı spec'ler** | 0132 (boy yöntemini getirdi), 0134 (boy adedi), 0135 (kalem listesi ve eski `malzemeSatiri`), 0139 (fire kilogramı ve boy istisnası), 0138 (etkilenen beşinci altın), 0140 (pencerenin düzenleme alanı ve doğrulayıcı seçimi), 0141 (kaldırma, göç ve altın hazırlık emsali), 0142 (sipariş belgesi) |
| **QA turu** | 2026-11-12, 28 bulgu (5 Bloklayıcı / 13 Önemli / 10 Küçük); hepsi Takım Yöneticisi tarafından onaylandı ve spec'e işlendi |
| **Düzeltilen iddialar** | 4 (sipariş ihtiyacının kıyasta değişmeyeceği, etkilenen altın sayısı, `artanKg`'nin ekranda olduğu, örnek katalogda tek kaydın etkilendiği) |
| **Ölçüm** | 2026-11-12, canlı veritabanı: boy yöntemli kalem **0**, boy fiyatı girili canlı kart **0** |

---

## Intent

Fabrika malzemeyi iki ayrı şekilde satın alıyor: bazısını kilogramla, bazısını çubuk sayısıyla.
Uygulama bugün bu ayrımı **fiyatlama yöntemi** olarak soruyor ("Kilo fiyatından" mı "Boy
fiyatından" mı), ama soru yanlış yerde. Tedarikçi faturayı nasıl kesiyorsa maliyet ondan
hesaplanmalı; çubuk sayısı ise sipariş verirken lazım, maliyet hesaplarken değil.

İki soruyu tek seçiciye bağlamak işin içinden çıkılmaz hâle getirdi: boy fiyatından hesaplanan
parçanın kilosu hiç hesaplanmıyor, kilo fiyatından hesaplananın da boyu başka bir formülle
sayılıyor ve iki formül aynı veride farklı çubuk sayısı veriyor.

Başarı şuna benzer: maliyet her zaman kilogramdan hesaplanıyor, ve parçanın malzemesinin yanında
tek bir kutu var: "sipariş boydan verilir". Kutu işaretliyse sipariş listesi o malzemeyi kaç boy
alınacağıyla yazıyor, değilse kaç kilo alınacağıyla.

---

## Requirements

### A. Boy fiyatı yöntemi kalkar

- **A-R1.** Parçanın malzeme kaleminde **"Maliyet yöntemi"** seçicisi yoktur. Maliyet her zaman
  kilogramdan hesaplanır.
- **A-R2.** Malzeme kartında **"Boy fiyatı"** alanı yoktur.
- **A-R2/2.** Boy fiyatı **fiyat kümesinden** de kalkar: `malzeme.js`'in `FIYAT_ALANLARI` listesi,
  onun ikinci kopyası `MalzemeFiyatPenceresi.jsx`'in `FIYAT_ANAHTARLARI` listesi, küme anahtarı,
  "küme boş mu" ölçütü ve küme özet metninin "boy X TL" parçası. Var olan `fiyatGecmisi`
  satırlarındaki `boyFiyati` anlık görüntüsü veride kalır ama okunmaz (ölü sütun mantığının
  ikizi). Yalnız boy fiyatı girili bir kartın kümesi artık **boş** sayılır; `fiyatGecmisiYaz` o
  kartta kayıt üretmez (QA turu, Ö1).
- **A-R3.** Malzeme kartında **"Geldiği boy"** alanı yoktur; çubuk boyu artık kalemde (B-R2).
- **A-R4.** Maliyet motorunun boy dalı kalkar. Kilogram zinciri (ham ölçü, ağırlık, fire yüzdesi,
  fire kilogramı, bant, kur) aynen kalır.

- **A-R4/2.** Boy yöntemine bağlı üç metin kalkar: `NEDEN_BOY_YONTEMI` ("kilo hesaplanmaz"),
  `FIRE_BOY_YONTEMI_UYARISI` ve parça kartının `fire-kg-uygulanmadi` satırı (0139 A-R13/2 ters
  çevrilir; kilogram fire artık her kalemde uygulanır). 0139'un `FIRE_BOY_UYARISI` metni
  **işaretli** satırda yazar, çünkü B-R4 tam olarak onu söylüyor (QA turu, Ö4).
- **A-R4/3.** Yöntemin kalan izleri de kalkar: `YONTEMLER` sabiti, kalemdeki `Maliyet yöntemi`
  erişilebilir adı, özet satırının `oz.yontem !== "boy"` kapısı ve `malzemeOzeti`'nin dönüşündeki
  `yontem` ile `oran` alanları. Sipariş motoru oranı kalemin `cubukBoyu`'ndan kendi hesaplar
  (bugün de kendi hesaplıyor) (QA turu, K6, K9).

#### QA turunda eklenen maddeler (2026-11-12)

- **A-R5.** Örnek katalogda **dört** kayıt `geldigiBoy` taşıyor (lama, mil, boru, alüminyum) ve
  biri ayrıca `boyFiyati`; dördünden de geldiği boy, borudan da boy fiyatı kalkar (borunun kilo
  fiyatı zaten girili). `tests/ornek-katalog.test.js`'in "boy fiyatlı kayıt var" iddiası ters
  çevrilir (QA turu, Ö5).
- **A-R6.** 0139'un içe aktarma aracı kaleme `yontem: "kilo"` yazıyor; o anahtar kalkar (AC-26
  taraması onu yakalar) (QA turu, Ö6).
- **A-R7.** `src/types.d.ts`'in kalem tipindeki `yontem?: string` bildirimi kalkar, yerine
  `boydanSiparis?: boolean` ve `cubukBoyu?: number` gelir (QA turu, K1).

### B. Boydan sipariş işareti

- **B-R1.** Parçanın malzeme kaleminde **"Sipariş boydan verilir"** kutusu vardır. Kutu yalnız
  siparişi etkiler, maliyete girmez.
- **B-R1/2.** Kutu **dört biçimde de** çizilir (mil, boru, lama, sac): B-R3 yalnız kalemde girilen
  `boy` ölçüsünü kullandığı için biçim ayrımı gerekmez. Bugünkü `capli` kapısı ve onun
  `NEDEN_IKI_BOYUT` metni ("Lama ve sacda boy adedi hesaplanmaz") kalkar (QA turu, Ö3).
- **B-R2.** Kutu işaretliyken yanında **"Çubuk boyu (mm)"** alanı çizilir. Zorunludur; boş ya da
  sıfırsa kayıt reddedilir.
- **B-R2/2.** Çubuk boyu ölçü alanlarının bugünkü kuralıyla doğrulanır: pozitif, en çok üç
  ondalık, belirsiz yazılmış sayı reddedilir; üst sınır konmaz. Parçanın boyu çubuk boyundan
  büyükse **kayıt geçer** (B-R8) ama kalemin altında engellemeyen bir uyarı görünür
  (QA turu, Ö13).
- **B-R3.** İşaretli kalemin sipariş adedi **boy** olarak verilir:

  ```
  toplam uzunluk = Σ (parça sipariş adedi × parçanın boyu)
  boy adedi      = yukarı( toplam uzunluk ÷ çubuk boyu )
  ```

- **B-R3/2.** Kesit anahtarı **çubuk boyunu da taşır**:
  `[malzemeId, boydanSiparis, cubukBoyu, bicim, ...kesit]`. Aynı kesitten iki kalem farklı çubuk boyuyla gelebildiği için (ölçüm: aynı
  malzeme Ø30'da 400 mm, Ø10'da 3000 mm) bölen satır düzeyinde tek değer olmak zorundadır; yoksa
  B-R3'ün tek bölmesi tanımsız kalır. `cubukBoyu` anahtara üç ondalığa yuvarlanmış girer (kesit
  değerlerinin bugünkü kuralı). Yuvarlama (B-R5) **oranın toplamına bir kez** uygulanır, parça
  başına değil (QA turu, B1, K7).
- **B-R4.** **Fire boy sayısına girmez.** Ne fire yüzdesi ne de çap bandının kilogramı toplam
  uzunluğa eklenir. Fire maliyette aynen durur.
- **B-R5.** Oran, yukarı yuvarlanmadan önce **üç ondalığa** yuvarlanır. Ölçüler en çok üç
  ondalıkla giriliyor; oran bundan daha hassas okunursa türetilmiş bir boy değeri çubuğu bir
  kılpayı aşıp sayıyı bire değil ikiye çıkarır.
- **B-R6.** Kutu işaretli değilse bugünkü kilogram davranışı sürer ve **boy adedi hesaplanmaz**;
  sipariş kilogramla verilir.
- **B-R6/2.** Bu, işaretsiz satırın sipariş kilosunu **bilinçli olarak değiştirir**: bugün kilo
  yolunda da boy adedi hesaplanıyor ve sipariş kilosu çubuk sayısından türüyor
  (`siparisKg = boyAdedi × tamBoyKg`); kartın geldiği boyu kalkınca o yol kapanır ve sipariş
  kilosu **net artı fire** olur. Ölçüm: `0142-once.json`'da `yontem: "kilo"` olup boy adedi dolu
  128 satır var (örnek: 304 Çubuk Ø62, 4 boy, 572,416 kg). Aynı turda `artanKg` de kalkar (X4) ve
  `asgariFark` kilo ölçütüyle hesaplanır (QA turu, B2).
- **B-R7.** Aynı malzemenin aynı kesiti, işaretli ve işaretsiz kalemlerde geçiyorsa sipariş
  listesinde **iki ayrı satır** olur.
- **B-R8.** Parçanın boyu çubuk boyundan büyükse kalem kaydedilir ama sipariş satırında boy adedi
  hesaplanmaz ve nedeni yazılır.
- **B-R8/2.** Üç neden metninden ikisi kalkar, biri güncellenir: `NEDEN_BOY_YOK` ("geldiği boy
  girilmedi") kalkar çünkü çubuk boyu artık zorunlu alandır, `NEDEN_IKI_BOYUT` kalkar (B-R1/2) ve
  `NEDEN_KESIM_BUYUK` metni kartın geldiği boyu yerine kalemin çubuk boyuna atıf yapacak biçimde
  güncellenip B-R8'in nedeni olur (QA turu, Ö12).
- **B-R9.** Asgari sipariş (kilogram) işaretli satırda da uygulanır: kilogram karşılığı asgarinin
  altındaysa boy adedi asgariyi karşılayacak sayıya çıkarılır.
- **B-R9/2.** İşaretli satırın **sipariş kilosu** `boy adedi × bir tam çubuğun ağırlığı`dır
  (satın alınan gerçek kilo; B-R9 asgariyi bununla karşılaştırır) ve **tutarı** o kilonun kilo
  fiyatı ile kurla çarpımıdır. Net ve fire kilogramları bilgi olarak ayrıca hesaplanır (C-R3).
  Elle düzenlenen boy satırı da aynı yolu kullanır: bugünkü düzenleme dalı tutarı **boy fiyatıyla**
  çarpıyor ve o alan kalkıyor. Bir tam çubuğun ağırlığını veren yardımcı artık çubuk boyunu
  **kalemden** alır; bugün malzeme kartından okuyor ve sipariş motoru ona sentetik bir satır
  nesnesi kuruyor, o zincir de çubuk boyunu taşıyacak biçimde güncellenir (QA turu, B5).

#### Plan turunda eklenen maddeler (revizyon 2, 2026-11-12)

- **B-R8/3.** Çubuk parçadan kısa olduğu için boy adedi hesaplanamayan işaretli satır sipariş kilosunu işaretsiz satır gibi
  (net artı fire) verir ve nedeni yazar; belgede kilogramla basılır. Yoksa malzeme belgeden sessizce düşerdi (plan turu, Risk 3).
- **B-R3/3.** Kesit anahtarının biçimi `"501|boy|400|mil|30"` (işaretsizde `"501|kilo||mil|30"`); kesit satırı ve 0142'nin
  parça ölçüleri anahtarı tek yardımcıdan alır. Anahtar yalnız pencerenin geçici düzenleme durumunu adresler (plan turu, Risk 8).
- **C-R4.** İşaretli satırın kesit metni çubuk boyunu da yazar ("Ø30 · 400 mm çubuk"); pencerede ve belgenin toplam tablosunda
  aynı metin, motordan. Yoksa AC-35'in iki satırı aynı metni taşırdı (plan turu, Risk 7).
- **D-R3/4.** Göç çekirdeği yedekten geri yüklemede de çalışır (yedek dosyası malzemenin geldiği boyunu taşır; `kasaGocuSaf`
  emsali); JSON'dan aktarma dalında geldiği boyu JSON gövdesinden alır. Eski istemciden geçiş döneminde gelen boy yöntemli
  kalem, kartın geldiği boyu artık okunmadığı için kilo kalemi olarak kalır (kabul, sürüm notu) (plan turu, Risk 4).
- **D-R3/5.** Parça kartının dokunulmamış kayıt dalı kalemdeki `yontem` anahtarını **silmez** (göçün çevirmesi için gerekir);
  tek türetmede çalışma anında çevrim yapılmaz. AC-26 form yolunda ölçülür (plan turu, Risk 5).

#### Triyaj turunda eklenen maddeler (2026-11-12)

- **B-R5/2.** B-R5'in yuvarlaması **uzunlukta** yapılır, oranda değil: toplam uzunluktan `Σ adet × 0,005 mm` (parça boyu iki
  ondalıkla girildiği için parça başına en çok yarım birim) düşülür, sonra çubuk boyuna bölünüp yukarı yuvarlanır; toplam uzunluk
  sıfırdan büyükse en az 1 boy. Oranı üç ondalığa yuvarlamak toleransı çubuk boyuna bağlıyordu (12 m çubukta 2,9 mm fazla kesim
  "1 boy" çıkıyordu). Spec'in ölçtüğü örnek (70 × 14,29 = 1000,3 mm ÷ 1000) yine 1 boydur (triyaj, bulgu 1).
- **B-R9/3.** Elle girilen boy adedinin kilosu (`boy × tam çubuk ağırlığı`) asgari siparişin altındaysa elle kilo dalıyla aynı uyarı
  yazar (0140 AC-84) (triyaj, bulgu 2).
- **D-R3/6.** Göç `yontem` anahtarını **her değerde** siler (0139'un içe aktarmasının yazdığı `"kilo"` dahil); yalnız `"boy"`
  değerinde işaret ve çubuk boyu yazılır (triyaj, bulgu 3).

### C. Ekran ve belge

- **C-R1.** Sipariş penceresinde işaretli satırın miktarı `N boy` yazar, düzenleme alanı boy
  cinsindendir.
- **C-R1/2.** Düzenleme alanının boy cinsinden olması 0140'ın bugünkü davranışıdır; yeni olan,
  seçimin **işarete** bağlanmasıdır. Yöntemi okuyan iki yer birlikte güncellenir: düzenleme
  doğrulayıcısının seçimi (öneri kesidini kurarken) ve düzenlemenin uygulandığı dal
  (`kesitDuzenle`). Biri atlanırsa işaretli satıra kilogram doğrulayıcısı uygulanır ve "8" değeri
  8 kilogram sayılır (QA turu, Ö2, K8).
- **C-R2.** Sipariş belgesinin "Alınacak malzeme toplamı" satırında işaretli malzeme `N boy`
  yazar, işaretsiz malzeme kilogram yazar.
- **C-R3.** İşaretli satırda net ve fire kilogramları gösterilmeye devam eder (bilgi olarak).

### D. Veri ve göç

- **D-R1.** Kalemin yeni alanları: `boydanSiparis` (boolean) ve `cubukBoyu` (mm). İkisi de
  `maliyetKalemleri` JSON'unun içinde; yeni sütun yok.
- **D-R2.** `malzemeler.boyFiyati` ve `malzemeler.geldigiBoy` sütunları şemada **ölü sütun**
  olarak kalır: ne okunur ne yazılır, satırlar silinmez.
- **D-R2/2.** "Ölü sütun" **değerleri korumaz**: `malzemeler` tablosu her kayıtta silinip yeniden
  yazıldığı için iki sütun, yazma yolundan çıktıktan sonraki ilk kayıtta bütün satırlarda NULL
  olur; korunan şey satırlar ve şemadır (0141 D-R1/2'nin dersi). Okuma bugün genel "null değilse
  gövdeye yaz" süzgecini kullandığı için iki sütun için **açık ayıklama** eklenir (0141'in
  `emniyetPayi` emsali) (QA turu, Ö7).
- **D-R3.** Yerel veritabanı açılışında bir dönüşüm, `yontem: "boy"` taşıyan her kalemi çevirir:
  `yontem` anahtarı silinir, `boydanSiparis` işaretlenir ve `cubukBoyu`, malzeme kartının
  `geldigiBoy` değerinden milimetreye çevrilerek yazılır. Kartta geldiği boy yoksa kalem yalnız
  kilo kalemi olur.
- **D-R3/2.** Dönüşüm **iki alanı birlikte** çevirir: `maliyetKalemleri[]` ve 0132'den kalan
  `parts.malzemeSatiri` (kalem listesi boşken maliyet motoru ondan kalem türetiyor ve o nesne de
  `yontem` taşıyor). Atlanırsa o dönemden kalan boy yöntemli parça düzenlenince maliyeti sessizce
  değişir (0141'in dersi) (QA turu, Ö11).
- **D-R3/3.** Dönüşüm `migrateFromJsonIfNeeded`'in **üç açılış dalında da** çağrılır ve yalnız
  `parts`'ın iki JSON sütununu `UPDATE` eder; blob yolunu kullanmaz (0141 ve 0138 emsali). Planı
  saf testle, yazımı ve ikinci açılışı Electron betiğiyle ölçülür ve betik `ELECTRON_TESTLERI`
  listesine eklenir (QA turu, Ö10).
- **D-R4.** Dönüşüm **bayrak taşımaz** ve her yerel açılışta çalışır; çevrilecek kalem yoksa
  hiçbir şey yazmaz ve yedek almaz.
- **D-R4/2.** Çevrilecek kalem **varken** veritabanı yedeği alınır
  (`data.db.boy-gocu-<zaman>.bak`; 0141 ve 0138 emsali) (QA turu, K10).

---

## Constraints

### Uyulması zorunlu

- **C1.** Kesit anahtarı bugün `yontem` taşıyor (`[malzemeId, yontem, bicim, ...kesit]`); onun
  yerini `boydanSiparis` alır. B-R7 bu sayede kendiliğinden sağlanır, yeni bir gruplama kuralı
  yazılmaz.
- **C2.** **Beş altın etkileniyor ve ayıklama yetmez; hazırlık adımı gerekir.** Ölçüm:
  `"yontem": "boy"` geçişi `0135-once.json`'da 2, `0138-once.json`'da 3, `0139-once.json`'da 4,
  `0141-once.json`'da 15, `0142-once.json`'da 18. Değişen şey anahtar değil **değerdir**
  (`boyAdedi`, `siparisKg`, `artanKg`, `asgariFark`, maliyet), yani 0141'in anahtar silen
  ayıklaması burada kıyasın ölçtüğü şeyi yok eder. Çözüm 0141'in kanıtlanmış iki adımı:
  (1) **kod değişmeden** fikstürlerin malzemelerinden `geldigiBoy` ile `boyFiyati` kaldırılır,
  boy yöntemli kalem kiloya çevrilir ve beş altın **eski kodla** yeniden üretilir (eski kod
  geldiği boyu olmayan malzemede zaten net artı fire veriyor, yani yeni davranışla aynı);
  (2) kaldırmadan sonra altınlar birebir tutar. Altın yine spec öncesi kodun çıktısıdır
  (QA turu, B3).
- **C2/3.** Etkilenen altın **altıdır**: `0140-once.json` da `0134-veri.js`'in geldiği boyu yüzünden etkilenir
  (`"yontem": "boy"` 3, dolu boy adedi 33). Hazırlık adımı onu da kapsar ve 0141 kıyasının SHA özetleri yenilenir. Hazırlıktan
  sonra sayılar birebir tutar; kalkan ya da adı değişen alanlar (kesit anahtarının biçimi, `yontem` → `boydanSiparis`, iki kalkan
  neden metni, `artanKg`, `malzemeOzeti`'nin `yontem` ve `oran` alanları, yeni `cubukBoyu` ve `tamKg`) dar ortak ayıklamayla
  (`tests/fixtures/0143-ayikla.js`) normalleşir: eski anahtar yeni biçime çevrilir, sayısal hiçbir alana dokunulmaz
  (plan turu, Risk 1 ve 2).
- **C2/2.** Hazırlık adımı fikstürün **boy fiyatlı malzemesini** de düzeltir. Ölçüm:
  `0139-veri.js` ve `0141-veri.js` içindeki 504 numaralı malzeme yalnız `boyFiyati`, `geldigiBoy`
  ve `fire` taşıyor; özgül ağırlığı ve kilo fiyatı yok. Boy yöntemi kalkınca onu kullanan
  "Boy mil" parçasının maliyeti "girilmedi" olur ve o parça modelin kitinde olduğu için altınların
  maliyet, model, parti, fiyat ve eksik blokları da değişir. Karta özgül ağırlık ile kilo fiyatı
  eklenir ve kalem kilo kalemine çevrilir (QA turu, B4).
- **C3.** Maliyet zincirine dokunulmaz: ham ölçü, hacim, özgül ağırlık, fire yüzdesi, fire
  kilogramı, çap bandı, kur ve kuruşa yuvarlama bugünkü hâliyle kalır (kıyas altını). Kıyasın
  kapsamı **maliyet zinciri, satış fiyatı, Model Maliyetleri, Parti Hesabı ve Excel dışa
  aktarmadır**; **sipariş ihtiyacı kıyasın dışındadır** ve kendi kriterleriyle ölçülür, çünkü
  işaretsiz satırın sipariş kilosu B-R6/2 ile bilinçli olarak değişiyor (QA turu, B2).
- **C4.** Göçün çekirdeği saf bir ES modülüdür ve kaynak klasörünü okumaz (`kasaGocuSaf.mjs`,
  `disIslemGocuSaf.mjs`, `islemePayiGocuSaf.mjs` emsali).
- **C5.** Ölü sütun emsali 0070'in `sgkTutar`'ı, 0138'in `dis_islemler` tablosu ve 0141'in
  `emniyetPayi` sütunları.
- **C6.** Yeni izin, yeni veri bölümü, yeni sunucu kuralı yok.
- **C7.** Ters çevrilen kriterler ve dosyalar **listelenir**. Ölçüm: boy yöntemini ölçen dokuz
  dosya var (`malzeme-0132.test.js`'in beş bloğu, `maliyet-kalemleri-0135.test.js`'in boy fiyatlı
  kartı, `fire-kg-0139.test.js`, `isleme-payi-0141.test.js`, `siparis-0134.test.js`'in boy ve
  `artanKg` blokları, `siparis-0140.test.js`, `dis-islem-kalkar-0138-kiyas.test.js`'in zamlı
  kümesi, `scripts/tests/db-roundtrip.cjs`, `tests/ornek-katalog.test.js`). Ters çevrilen
  kriterlerin testine "spec 0143 ile" notu düşülür; yalnız boy yöntemini ölçen bloklar silinir
  (QA turu, Ö9).

### KAPSAM DIŞI

- **X1.** Boy fiyatının başka bir yerde saklanması — *neden:* A-R1; tedarikçi boy başına fiyat
  veriyorsa kilo fiyatına çevrilir, aşağıda formül var. Bu bilinçli bir bedel.
- **X2.** Çubuk boyunun malzeme kartında çap başına tabloyla tutulması — *neden:* B-R2 onu
  kaleme taşıyarak sorunu kökten çözüyor; kartta tablo tutmak ikinci bir yer açar.
- **X3.** Yerleşim hesabı (bir çubuktan kaç parça çıkar, artan ne olur) — *neden:* B-R3 tüketim
  oranıyla çalışır; ölçüm, müşterinin kendi sayılarının bu formülle tuttuğunu gösteriyor.
- **X4.** `artanKg` (çubuktan artan malzeme) alanının korunması — *neden:* yerleşim hesabı kalkınca artan hesaplanamaz; alan bugün hiçbir ekranda görünmüyor (0140 ve 0142 ile sütunu kalktı), yalnız motorun dönüşünde duruyor (QA turu, Ö8).

---

## Context

### Bugün iki ayrı formül var ve farklı sonuç veriyor

`siparisIhtiyaci.js` çubuk sayısını iki yerde hesaplıyor:

| Yol | Formül | Satır |
|---|---|---|
| Boy yöntemi | `yukarı(Σ oran × (1 + fire/100) × adet)` | 572 |
| Kilo yöntemi | `yukarı(Σ adet ÷ aşağı(çubuk boyu ÷ kesim boyu))` | 591 |

Birincisi tüketim oranı, ikincisi yerleşim. Aynı veride ayrışıyorlar. Ölçüm, Ø35 paslanmaz
dayama (70 parça × 45,71 mm, 400 mm çubuk):

| | Sonuç |
|---|---|
| Tüketim oranı | `70 × 45,71 ÷ 400 = 8,0` → **8 boy** |
| Yerleşim | `aşağı(400 ÷ 45,71) = 8` parça, `70 ÷ 8 = 8,75` → **9 boy** |
| Müşterinin Excel'i | **8 boy** |

B-R3 tüketim oranını seçiyor çünkü müşterinin sayısı o.

### Fire neden boy sayısına girmiyor

Ölçüm, Ø16 kestamit sıyırıcı (70 parça × 14,29 mm, 1.000 mm çubuk, fire %10):

| | Sonuç |
|---|---|
| Fire boy sayısına girerse | `70 × 14,29 × 1,10 ÷ 1000 = 1,10` → **2 boy** |
| Girmezse | `70 × 14,29 ÷ 1000 = 1,00` → **1 boy** |
| Müşterinin notu | "1 ADET (70 MAKİNALIK)" → **1 boy** |

Müşterinin firesi bir maliyet payıdır, ek çubuk gerektiren bir malzeme kaybı değil: 70 parça tam
olarak bir çubuktan çıkıyor. B-R4 bunu sabitliyor; fire maliyette aynen duruyor.

### B-R5'in sebebi ölçülmüş bir tuzak

Aynı örnekte parça boyu türetilmiş bir sayıdır: `1000 ÷ 70 = 14,2857`, alana `14,29` yazılır.
O zaman `70 × 14,29 = 1000,3 mm` çıkar, çubuğu 0,3 milimetre aşar ve yukarı yuvarlama **2 boy**
verir. Oran üç ondalığa yuvarlanınca `1,0003 → 1,000` olur ve sonuç **1 boy** kalır. Aynı
yuvarlama 0134 Karar 49'da kesit anahtarı için de yapılıyor.

### Boy fiyatının kilo fiyatına çevrilmesi

Tek örnek boru: müşterinin notu "1 BOY 6 METRESİ 800 TL". Çevirme:

```
bir boyun ağırlığı = (π ÷ 4) × (19² − 16²) × 6000 × 7,894 ÷ 1.000.000 = 3,906 kg
kilo fiyatı        = 800 ÷ 3,906 = 204,82 TL/kg
```

Bu çevirme **her zamda yeniden** yapılacak. Bilinen bedeldir (X1).

### Bilinen tuzaklar

1. **Kesit anahtarı `yontem` taşıyor.** C1; işaret onun yerine geçmezse işaretli ve işaretsiz
   kalemler tek satırda toplanır ve satır hem kilo hem boy olmak zorunda kalır.
2. **`tamBoyKg` çubuk boyunu karttan okuyor.** Asgari siparişin boy cinsine yuvarlanması (B-R9)
   için bu fonksiyon kalemin `cubukBoyu` değerini almalı.
3. **Boy yöntemli satırın kilosu bugün hiç hesaplanmıyor** (`NEDEN_BOY_YONTEMI`). C-R3 ile
   işaretli satırda da net ve fire kilogramları hesaplanacak; o neden metni kalkar.
4. **Örnek katalogda dört kayıt geldiği boy, biri ayrıca boy fiyatı taşıyor** (lama, mil, boru,
   alüminyum; boy fiyatlı olan "304 paslanmaz boru"). Dördü de güncellenir ve
   `tests/ornek-katalog.test.js`'in "boy fiyatlı kayıt var" iddiası ters çevrilir (A-R5,
   QA turu Ö5).
5. **Canlı veride boy yöntemli kalem yok** (ölçüm), ama göç yine yazılıyor: sürüm arası pencerede
   başka bilgisayardan gelebilir ve sessiz maliyet değişimi bu projede üç kez hata oldu.

### QA turunda ölçülenler (2026-11-12)

Hepsi HEAD'de (0142 uygulandıktan sonraki hâl) doğrulandı.

- **Ölçüm A.** Kesit anahtarı `[m.id, yontem, satir.bicim, ...kesit].join("|")`
  (`siparisIhtiyaci.js:299`); çubuk boyu anahtarda yok.
- **Ölçüm B.** `0142-once.json`'da `yontem: "kilo"` olup `boyAdedi` dolu **128 satır** var; örnek
  `304 Çubuk · Ø62 · boyAdedi 4 · siparisKg 572,416 · artanKg 66,543`. Kilo yolu bugün de çubuk
  sayısı hesaplıyor (`siparisIhtiyaci.js:591`) ve sipariş kilosu ondan türüyor (`:597`).
- **Ölçüm C.** `"yontem": "boy"` geçişi `0135-once.json`'da 2, `0138-once.json`'da 3,
  `0139-once.json`'da 4, `0141-once.json`'da 15, `0142-once.json`'da 18.
- **Ölçüm D.** `0139-veri.js` ve `0141-veri.js` içindeki 504 numaralı malzeme
  `{ boyFiyati: 1600, geldigiBoy: 6, fire: 5 }`; özgül ağırlığı ve kilo fiyatı yok. Onu kullanan
  "Boy mil" parçası modelin kitinde (`defaultParcalar` 1..10).
- **Ölçüm E.** `kesitDuzenle`'nin boy dalı tutarı `v.deger * r.fiyat` ile, yani **boy fiyatıyla**
  çarpıyor (`siparisIhtiyaci.js:545`); boy dalı ayrıca `netKg`, `fireKg` ve `siparisKg` değerlerini
  null döndürüyor (`:577`).
- **Ölçüm F.** `malzeme.js:97` `FIYAT_ALANLARI` ve ikinci kopyası
  `MalzemeFiyatPenceresi.jsx:63` `FIYAT_ANAHTARLARI` boy fiyatını taşıyor; küme anahtarı (`:107`),
  "küme boş mu" ölçütü (`:108`) ve küme özet metni (`:154`, "boy X TL") de okuyor.
- **Ölçüm G.** Yöntemi okuyan iki düzenleme yeri: doğrulayıcı seçimi (`siparisIhtiyaci.js:323`) ve
  düzenlemenin uygulandığı dal (`:537`).
- **Ölçüm H.** Boy adedi bugün yalnız çaplı biçimde hesaplanıyor; lama ve sacda `NEDEN_IKI_BOYUT`
  yazılıyor (`siparisIhtiyaci.js:586`).
- **Ölçüm I.** `MalzemeSatiriAlani.jsx:26` `s.yontem === "boy" && fireBantlariOf(...).length > 0`
  ile `fire-kg-uygulanmadi` satırını kuruyor (`:88`); `siparisIhtiyaci.js:38` ve `:42` iki boy
  metnini taşıyor.
- **Ölçüm J.** `ornekKatalog.js`'in 18, 19, 23 ve 24. satırlarındaki dört kayıt `geldigiBoy`
  taşıyor, 23. satır ayrıca `boyFiyati: "2150"`; `tests/ornek-katalog.test.js:28`
  `expect(m.some(k => k.boyFiyati > 0)).toBe(true)` diyor.
- **Ölçüm K.** `malzemeListesiAktarma.js:330` kaleme `yontem: "kilo"` yazıyor.
- **Ölçüm L.** `scripts/tests/db-roundtrip.cjs:931` `boyFiyati: 900, geldigiBoy: 6` yazıp geri
  okuyor; `malzemeler` okuması genel `v != null` süzgeci kullanıyor ve 0141 `emniyetPayi` için açık
  ayıklama eklemişti.
- **Ölçüm M.** 0142 sonrası sipariş penceresinin malzeme tablosunda "Artan kg" sütunu yok;
  `artanKg` yalnız motorun dönüşünde duruyor ve `siparis-0134.test.js:179` ile `:232` değerini
  24,445 diye sabitliyor.
- **Ölçüm N.** Boy yöntemini ölçen dokuz dosya: `malzeme-0132.test.js` (158, 238, 254, 259, 263),
  `maliyet-kalemleri-0135.test.js:27`, `fire-kg-0139.test.js:69`, `isleme-payi-0141.test.js:126`,
  `siparis-0134.test.js`, `siparis-0140.test.js:130`,
  `dis-islem-kalkar-0138-kiyas.test.js:31`, `scripts/tests/db-roundtrip.cjs:931`,
  `tests/ornek-katalog.test.js:28`.
- **Ölçüm O.** 0141'in göçü üç açılış dalında çağrılıyor, yedeği yalnız değişecek kalem varken
  alıyor ve yalnız `maliyetKalemleri` sütununu `UPDATE` ediyor; iki testle ölçülüyor (saf çekirdek
  ve Electron betiği).
- **Ölçüm P.** `malzemeSatiriDogrula` eski alana da `yontem` yazıyor (`malzeme.js:405`) ve maliyet
  motoru kalem listesi boşken `parts.malzemeSatiri`'nden kalem türetiyor.
- **Ölçüm R.** Üç neden metni var: `NEDEN_IKI_BOYUT`, `NEDEN_BOY_YOK` ("geldiği boy girilmedi") ve
  `NEDEN_KESIM_BUYUK` ("kesim boyu malzemenin boyundan uzun").
- **Ölçüm S.** Ölçü alanları `alanDogrula(..., { pozitif: true })` ile doğrulanıyor: en çok üç
  ondalık ve belirsiz yazılmış sayı reddi.
- **Ölçüm T.** Bir tam çubuğun ağırlığını veren yardımcı çubuk boyunu **malzeme kartından** okuyor
  (`malzeme.js:230`) ve sipariş motoru ona sentetik bir ölçü nesnesi kuruyor
  (`siparisIhtiyaci.js:592` ve `:612`).

### QA turunda verilen kararlar (2026-11-12)

1. **Kesit anahtarı çubuk boyunu da taşır** (Bloklayıcı; B-R3/2; Ölçüm A).
2. **İşaretsiz satırın sipariş kilosu net artı firedir; bu bilinçli değişiklik yazıldı ve sipariş
   ihtiyacı kıyasın dışına çıkarıldı** (Bloklayıcı; B-R6/2, C3, AC-33; Ölçüm B).
3. **Beş altın hazırlık adımıyla yenilenir, ayıklama yetmez** (Bloklayıcı; C2, AC-34; Ölçüm C).
4. **Fikstürün boy fiyatlı malzemesine özgül ağırlık ve kilo fiyatı eklenir** (Bloklayıcı; C2/2;
   Ölçüm D).
5. **İşaretli satırın sipariş kilosu ve tutarı kilogramdan gelir; tam çubuk ağırlığı çubuk boyunu
   kalemden alır** (Bloklayıcı; B-R9/2; Ölçüm E, Ölçüm T).
6. **Boy fiyatı fiyat kümesinden ve iki listeden de kalkar; eski geçmiş satırları okunmaz**
   (Önemli; A-R2/2; Ölçüm F).
7. **Düzenleme doğrulayıcısının seçimi işarete bağlanır, iki yer birlikte** (Önemli; C-R1/2;
   Ölçüm G).
8. **Kutu dört biçimde de çizilir; `NEDEN_IKI_BOYUT` kalkar** (Önemli; B-R1/2; Ölçüm H).
9. **Boy yöntemine bağlı üç metin kalkar, 0139'un fire uyarısı işaretli satırda yazar** (Önemli;
   A-R4/2; Ölçüm I).
10. **Örnek katalogda dört kayıt güncellenir ve bir test ters çevrilir** (Önemli; A-R5; Ölçüm J).
11. **İçe aktarma aracı `yontem` yazmaz** (Önemli; A-R6; Ölçüm K).
12. **İki ölü sütun için açık ayıklama eklenir ve değerlerin ilk kayıtta boşaldığı yazılır**
    (Önemli; D-R2/2; Ölçüm L).
13. **`artanKg`'nin bugün ekranda olmadığı düzeltildi ve iki test iddiası ters çevrilenlere girdi**
    (Önemli; X4, C7; Ölçüm M).
14. **Ters çevrilen kriterler ve dokuz dosya listelenir** (Önemli; C7, Definition of Done;
    Ölçüm N).
15. **Göç üç açılış dalında çağrılır, yalnız iki sütunu yazar ve iki testle ölçülür** (Önemli;
    D-R3/3; Ölçüm O).
16. **Göç eski `malzemeSatiri` alanındaki yöntemi de çevirir** (Önemli; D-R3/2; Ölçüm P).
17. **Üç neden metninden ikisi kalkar, biri çubuk boyuna atıf yapar** (Önemli; B-R8/2; Ölçüm R).
18. **Çubuk boyu ölçü alanlarının bugünkü kuralıyla doğrulanır** (Önemli; B-R2/2; Ölçüm S).
19. **`src/types.d.ts`'in kalem tipi güncellenir** (Küçük; A-R7).
20. **Etkilenen alanlar satırı tamamlandı** (Küçük; başlık tablosu).
21. **Bağımlı spec'lere 0138 ve 0140 eklendi** (Küçük; başlık tablosu).
22. **AC-6 ölçülebilir biçimde yazıldı** (Küçük; AC-6).
23. **AC-12 ile AC-13'ün girdisi yazıldı** (Küçük; AC-12, AC-13).
24. **`YONTEMLER`, erişilebilir ad ve özet kapısı kalkar** (Küçük; A-R4/3; Ölçüm I).
25. **Yuvarlama oranın toplamına bir kez uygulanır** (Küçük; B-R3/2).
26. **C-R1'in düzenleme alanı cümlesi 0140'a atıf olarak yazıldı** (Küçük; C-R1/2).
27. **`malzemeOzeti`'nin `yontem` ve `oran` alanları kalkar** (Küçük; A-R4/3).
28. **Göçün yedeğinin alındığı hâl yazıldı** (Küçük; D-R4/2).

### QA turu karar kaydı (2026-11-12)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Kesit anahtarı çubuk boyunu taşımıyor | Bloklayıcı | Anahtara girer | B-R3/2 |
| 2 | İşaretsizde çubuk yuvarlaması kalkıyor | Bloklayıcı | Net artı fire, kıyas daraldı | B-R6/2, C3, AC-33 |
| 3 | Beş altın etkileniyor, ayıklama yetmez | Bloklayıcı | Hazırlık adımı | C2, AC-34 |
| 4 | Fikstürün boy fiyatlı malzemesi eksik | Bloklayıcı | Kiloya çevrilir | C2/2 |
| 5 | İşaretli satırın kilosu ve tutarı tanımsız | Bloklayıcı | Kilogramdan | B-R9/2 |
| 6 | Boy fiyatı fiyat kümesinde ve iki listede | Önemli | Hepsinden kalkar | A-R2/2 |
| 7 | Doğrulayıcı seçimi yönteme bağlı | Önemli | İşarete bağlanır | C-R1/2 |
| 8 | İşaretin biçim kapısı yazılmamış | Önemli | Dört biçimde de | B-R1/2 |
| 9 | Boy metinlerinin kaderi yazılmamış | Önemli | Üçü kalkar, biri kalır | A-R4/2 |
| 10 | Örnek katalogda dört kayıt etkileniyor | Önemli | Dördü güncellenir | A-R5 |
| 11 | İçe aktarma `yontem` yazıyor | Önemli | Anahtar kalkar | A-R6 |
| 12 | Ölü sütunlar gövdeye giriyor | Önemli | Açık ayıklama | D-R2/2 |
| 13 | `artanKg` ekranda sanılıyor | Önemli | Düzeltildi | X4, C7 |
| 14 | Ters çevrilen kriterler sayılmamış | Önemli | Dokuz dosya listelendi | C7, DoD |
| 15 | Göçün dalları ve testi yazılmamış | Önemli | Üç dal, iki test | D-R3/3 |
| 16 | Göç eski alanı kapsamıyor | Önemli | İki alan birlikte | D-R3/2 |
| 17 | Neden metinlerinin kaderi belirsiz | Önemli | İkisi kalkar | B-R8/2 |
| 18 | Çubuk boyunun doğrulaması yok | Önemli | Ölçü alanı kuralı | B-R2/2 |
| 19 | Tip bildirimi güncellenmemiş | Küçük | Değişti | A-R7 |
| 20 | Etkilenen alanlar eksik | Küçük | Tamamlandı | Başlık tablosu |
| 21 | Bağımlı spec eksik | Küçük | 0138 ve 0140 | Başlık tablosu |
| 22 | AC-6 ölçülemez | Küçük | Yeniden yazıldı | AC-6 |
| 23 | AC-12 ve AC-13'ün girdisi yok | Küçük | Girdi yazıldı | AC-12, AC-13 |
| 24 | Yöntemin kalan izleri sayılmamış | Küçük | Üçü kalkar | A-R4/3 |
| 25 | Yuvarlamanın yeri belirsiz | Küçük | Toplamda bir kez | B-R3/2 |
| 26 | C-R1 yeni kural gibi okunuyor | Küçük | Atıf yazıldı | C-R1/2 |
| 27 | `malzemeOzeti`'nin alanları belirsiz | Küçük | İkisi kalkar | A-R4/3 |
| 28 | Yedeğin alındığı hâl yazılmamış | Küçük | Koşul yazıldı | D-R4/2 |


---

## Acceptance Criteria

### A. Kalkanlar

- **AC-1.** Parça kartının malzeme kaleminde "Maliyet yöntemi" seçicisi yoktur.
- **AC-2.** Malzeme kartında "Boy fiyatı" alanı yoktur.
- **AC-3.** Malzeme kartında "Geldiği boy" alanı yoktur.
- **AC-4.** "Fiyatı Güncelle" penceresinde boy fiyatı alanı yoktur.
- **AC-5.** Kaynakta `boyFiyati`, `geldigiBoy` ve `YONTEMLER` kimlikleri geçmez; tek istisna göç
  modülü ve ölü sütun tanımıdır (tarama, istisnalar tam yollu).
- **AC-6.** Boy fiyatı **dolu** bir kartın kilo kalemi, kaldırmadan önceki maliyetiyle birebir
  aynıdır (kıyas altını; QA turu, K4).

### B. İşaret ve çubuk boyu

- **AC-7.** Malzeme kaleminde "Sipariş boydan verilir" kutusu vardır ve varsayılan işaretsizdir.
- **AC-8.** Kutu işaretlenince "Çubuk boyu (mm)" alanı çizilir.
- **AC-9.** Kutu işaretli ve çubuk boyu boşken kayıt reddedilir ve hata çubuk boyu alanında
  görünür.
- **AC-10.** Kutu işaretsizken çubuk boyu kayda yazılmaz.
- **AC-11.** Kutu işaretli kalemin maliyeti, işaretsiz hâliyle birebir aynıdır.

### C. Boy adedi

- **AC-12.** Kit adedi 1, stoğu 0 ve 70 makinalık satırda geçen (yani sipariş adedi 70 olan),
  boyu 45,71 mm ve çubuk boyu 400 mm olan parçanın sipariş satırı **8 boy** verir.
- **AC-13.** Aynı girdiyle boyu 14,29 mm ve çubuk boyu 1.000 mm olan parçanın sipariş satırı
  **1 boy** verir (B-R5 yuvarlaması; QA turu, K5).
- **AC-14.** Fire yüzdesi %10 olan aynı parçada sonuç yine **1 boy**'dur; fire boy sayısını
  büyütmez.
- **AC-15.** Çap bandından kilogram firesi gelen bir parçada da boy sayısı değişmez.
- **AC-16.** Aynı kesitten iki parça aynı çubuk boyuyla işaretliyse uzunlukları toplanır ve tek
  satırda tek boy adedi çıkar.
- **AC-17.** Aynı kesitin işaretli ve işaretsiz kalemleri sipariş listesinde iki ayrı satırdır.
- **AC-18.** Parçanın boyu çubuk boyundan büyükse boy adedi hesaplanmaz ve satırda nedeni yazar.
- **AC-19.** Kutu işaretsiz satırda boy adedi hesaplanmaz ve miktar kilogram yazar.
- **AC-20.** Asgari siparişi 100 kg olan malzemede, hesaplanan boy adedinin kilogramı 100'ün
  altındaysa boy adedi asgariyi karşılayacak sayıya çıkar.

### D. Ekran ve belge

- **AC-21.** Sipariş penceresinde işaretli satırın miktarı `N boy` yazar.
- **AC-22.** Sipariş penceresinde işaretli satırın düzenleme alanına girilen değer boy sayısıdır.
- **AC-23.** Sipariş penceresinde işaretli satırın net ve fire kilogramları yazar.
- **AC-24.** Sipariş belgesinin malzeme toplamında işaretli malzeme `N boy`, işaretsiz malzeme
  kilogram yazar.

### E. Veri ve göç

- **AC-25.** Kaydedilen kalemde kutu işaretliyken `boydanSiparis` ve `cubukBoyu` vardır.
- **AC-26.** Kaydedilen kalemde `yontem` anahtarı hiç yoktur.
- **AC-27.** `yontem: "boy"` taşıyan bir kalem, yerel veritabanı açılışında işaretli ve çubuk
  boyu kartın geldiği boyundan yazılmış olarak okunur.
- **AC-28.** Kartında geldiği boy olmayan boy yöntemli kalem, göçten sonra yalnız kilo kalemidir.
- **AC-29.** Çevrilecek kalem yoksa göç hiçbir satır yazmaz ve veritabanı yedeği almaz.
- **AC-30.** Göç ikinci açılışta yeniden çalışır ve hiçbir şeyi değiştirmez.
- **AC-31.** `malzemeler` tablosunda `boyFiyati` ve `geldigiBoy` sütunları durur ve satırlar
  silinmemiştir.
- **AC-32.** Boy fiyatı dolu bir gövde kaydedilirse değer veritabanına yazılmaz ve okumada
  gövdeye girmez.

### F. Kıyas

- **AC-33.** Boy yöntemi kullanmayan veride maliyet zinciri, satış fiyatı, Model Maliyetleri,
  Parti Hesabı ve Excel dışa aktarma spec öncesi altınla birebir aynıdır (`0143-once.json`);
  **sipariş ihtiyacı kıyasın dışındadır** (C3, B-R6/2; QA turu, B2).
- **AC-34.** Altı altın (`0135`, `0138`, `0139`, `0140`, `0141`, `0142`; C2/3) hazırlık adımında **kaldırmadan
  önce** eski kodla yenilenir ve kaldırmadan sonra bayt bayt değişmez (C2, C2/2; QA turu, B3).

---


### G. QA turu kriterleri (2026-11-12)

**Anahtar, kilo ve tutar**

- **AC-35.** Aynı malzemenin aynı kesiti iki farklı çubuk boyuyla işaretliyse sipariş listesinde
  iki ayrı satır olur ve her satır kendi çubuk boyuyla bölünür (B-R3/2).
- **AC-36.** Kesit anahtarı çubuk boyunu üç ondalığa yuvarlanmış taşır (B-R3/2).
- **AC-37.** Yuvarlama oranın toplamına bir kez uygulanır; parça başına yuvarlama yapılmaz
  (B-R3/2).
- **AC-38.** İşaretsiz satırda sipariş kilosu net artı firedir; boy adedi ve artan kilo yoktur
  (B-R6/2).
- **AC-39.** İşaretli satırın sipariş kilosu boy adedi ile bir tam çubuğun ağırlığının çarpımıdır
  (B-R9/2).
- **AC-40.** İşaretli satırın tutarı sipariş kilosu ile kilo fiyatı ve kurun çarpımıdır; boy fiyatı
  hiçbir yerde okunmaz (B-R9/2).
- **AC-41.** Elle düzenlenen boy satırının tutarı da aynı yoldan hesaplanır (B-R9/2).
- **AC-42.** Bir tam çubuğun ağırlığı kalemin çubuk boyundan hesaplanır, malzeme kartından değil
  (B-R9/2).

**Alan, metin ve biçim**

- **AC-43.** Kutu mil, boru, lama ve sac biçimlerinin hepsinde çizilir ve lama kaleminde de boy
  adedi hesaplanır (B-R1/2).
- **AC-44.** Çubuk boyu alanı belirsiz yazılmış sayıyı ve negatifi reddeder, en çok üç ondalık
  kabul eder (B-R2/2).
- **AC-45.** Parçanın boyu çubuk boyundan büyükken kayıt geçer ve kalemin altında engellemeyen
  uyarı görünür (B-R2/2).
- **AC-46.** Parça kartında `fire-kg-uygulanmadi` satırı hiç çizilmez ve kilogram fire her kalemde
  uygulanır (A-R4/2).
- **AC-47.** İşaretli satırda 0139'un fire uyarısı yazar (fire boy sayısına eklenmedi) (A-R4/2).
- **AC-48.** Kaynakta `YONTEMLER`, "Maliyet yöntemi" erişilebilir adı ve `malzemeOzeti`'nin
  `yontem` ile `oran` alanları geçmez (A-R4/3, tarama).
- **AC-49.** Boy adedi hesaplanamayan satırın nedeni kalemin çubuk boyuna atıf yapar; "geldiği boy
  girilmedi" ve "lama ve sacda hesaplanmaz" metinleri kaynakta yoktur (B-R8/2).
- **AC-50.** Örnek katalogda hiçbir kayıt geldiği boy ya da boy fiyatı taşımaz ve örnekler
  doğrulamadan geçer (A-R5).
- **AC-51.** İçe aktarma aracının yazdığı kalemde `yontem` anahtarı yoktur (A-R6).

**Fiyat kümesi, veri ve göç**

- **AC-52.** Fiyat kümesi boy fiyatını taşımaz; iki liste de güncellenmiştir ve küme özet metninde
  "boy" geçmez (A-R2/2, tarama).
- **AC-53.** Yalnız boy fiyatı girili bir kartta fiyat geçmişi kaydı doğmaz (A-R2/2).
- **AC-54.** `malzemeler` okuması iki ölü sütunu gövdeye yazmaz (D-R2/2).
- **AC-55.** İki ölü sütunun değerleri ilk kayıttan sonra boştur ve satırlar silinmemiştir
  (D-R2/2).
- **AC-56.** Eski `malzemeSatiri` alanında `yontem: "boy"` taşıyan parça da göçten geçer
  (D-R3/2).
- **AC-57.** Göç üç açılış dalının her birinde çalışır ve yalnız `parts`'ın iki JSON sütununu
  yazar (D-R3/3).
- **AC-58.** Veritabanı yedeği yalnız çevrilecek kalem varken alınır (D-R4/2).
- **AC-59.** Göçün planı saf testle, yazımı ve ikinci açılışı Electron betiğiyle ölçülür
  (D-R3/3).
- **AC-60.** Ters çevrilen kriterler listelenmiştir ve testlerine "spec 0143 ile" notu
  düşülmüştür (C7).

### H. Plan turu kriterleri (revizyon 2, 2026-11-12)

- **AC-61.** Çubuk parçadan kısa işaretli satır sipariş kilosunu net artı fire verir, nedeni yazar ve belgede kilogramla basılır (B-R8/3).
- **AC-62.** Kesit anahtarı `"501|boy|400|mil|30"` biçimindedir ve 0142'nin parça ölçüleri aynı anahtarı taşır (B-R3/3).
- **AC-63.** İşaretli satırın kesit metni çubuk boyunu yazar; pencere ve belge aynı metni basar (C-R4).
- **AC-64.** Boy yöntemli kalem ve geldiği boylu malzeme taşıyan yedek geri yüklenince kalem işaretli ve çubuk boylu olur (D-R3/4).
- **AC-65.** Parça kartında maliyet bölümüne dokunulmadan kaydedilen parçanın kalemi `yontem` anahtarını korur (D-R3/5).
- **AC-66.** Ortak ayıklama yalnız adı değişen ya da kalkan alanlara dokunur; sayısal alanlar ayıklanmaz (C2/3).

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Boy adedi hesabı saf motorda; arayüz yalnız gösteriyor.
- [ ] Pencere ve belge aynı kaynağı kullanıyor.
- [ ] Yeni kalıcı alanlar kalem JSON'unda; ölü sütunlar şemada bırakıldı ve `db-roundtrip`
      testine eklendi.
- [ ] Yeni veri bölümü yok; **yeni eylem izni eklenmediği açıkça yazıldı** (C6).
- [ ] Soft-delete ve çöp kutusu simetrisi etkilenmedi.
- [ ] Kullanıcıya görünen tüm metinler Türkçe.
- [ ] Para gösterimi değişmedi; maliyet zinciri kıyas altınıyla sabitlendi.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (parça kartı, malzeme kartı, sipariş penceresi).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0132, 0134 ve 0142 bölümleri güncellendi.
- [ ] Kıyas kararı uygulandı: beş altın hazırlık adımında **kaldırmadan önce** eski kodla
      yenilendi (fikstürlerin geldiği boyu ve boy fiyatı kaldırıldı, boy kalemi kiloya çevrildi)
      ve kaldırmadan sonra bayt bayt değişmedi (C2, C2/2).
- [ ] Sipariş ihtiyacı kıyasın dışında; işaretsiz satırın sipariş kilosu kendi kriterleriyle
      ölçüldü (C3, B-R6/2).
- [ ] Ters çevrilen kriterler ve dokuz dosya listelendi, testlerine "spec 0143 ile" notu düşüldü
      (C7).
- [ ] Göç iki alanı kapsıyor, üç açılış dalında çağrılıyor, yalnız iki sütunu yazıyor ve iki
      testle ölçülüyor (D-R3/2, D-R3/3, D-R4/2).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin kararları (2026-11-12)

1. **Yedek parça ve malzeme eklerken boy fiyatı yöntemi kalkacak.**
2. **Yerine, yedek parça eklerken "bu hammadde için sipariş boydan verilir" kutusu olacak.**
3. **Parçadan kaç tane isteniyorsa ölçüsü onunla çarpılacak ve sipariş boy olarak verilecek.**

### Analistin kararları, onaylandı (Takım Yöneticisi, 2026-11-12)

Dört önerinin hepsi mockup üzerinden kabul edildi.

1. **Kutu ve çubuk boyu kalemde durur, malzeme kartında değil (B-R1, B-R2).** Gerekçe: ölçüm,
   aynı malzemenin çapına göre farklı boyda geldiğini gösteriyor (paslanmazda Ø35 → 400 mm,
   Ø10 → 3000 mm, Ø15 → 1000 mm, Ø30 → 400 mm). Kart tek değer tutuyor, dördünü birden tutamaz.
   Kaleme taşıyınca sorun kökten kalkıyor ve kartın "Geldiği boy" alanı da gerekmiyor.
   Reddedilen alternatif: kartta çap başına bir boy tablosu; ikinci bir yer açar ve kalemde zaten
   girilen çapı orada tekrar tanımlatır.
2. **Fire boy sayısına girmez (B-R4).** Gerekçe yukarıda ölçüldü: müşterinin 70 parçası tam bir
   çubuktan çıkıyor ve notu 1 boy diyor; fire eklenirse 2 çıkar. Reddedilen alternatif: fireyi
   eklemek, ki fiziksel olarak savunulabilir ama müşterinin sayısını bozar.
3. **Oran üç ondalığa yuvarlanır (B-R5).** Gerekçe: türetilmiş parça boyu (14,29) çubuğu
   0,3 mm aşıp boy sayısını ikiye çıkarıyor. Emsal 0134 Karar 49. Reddedilen alternatif:
   yuvarlamamak ve kullanıcıdan daha hassas boy girmesini beklemek.
4. **Göç yazılır ve bayrak taşımaz (D-R3, D-R4).** Gerekçe 0141 ile aynı: bayraklı tek seferlik
   göç, sürüm arası pencerede gelen kaydı kaçırır.

### QA turunun kararlara etkisi (2026-11-12)

Takım Yöneticisi'nin üç kararı ve analistin dört kararı aynen durur. Analistin 1. kararı (kutu ve
çubuk boyu kalemde) QA turunda bir sonucu daha kazandı: çubuk boyu kesit anahtarına da girer,
yoksa aynı kesitten iki farklı çubuk tek satıra düşer ve B-R3'ün bölmesi tanımsız kalır
(B-R3/2). Analistin 4. kararı (göç bayrak taşımaz) 0141'in üç ayrıntısıyla tamamlandı: üç açılış
dalı, koşullu yedek, yalnız iki sütunu yazan `UPDATE` ve eski `malzemeSatiri` alanının kapsanması
(D-R3/2, D-R3/3, D-R4/2).

Kapsam iki yerde büyüdü: işaretli satırda net ve fire kilogramının yanında **sipariş kilosu ve
tutar** da kilogramdan hesaplanır (B-R9/2) ve kutu dört biçimde de çizilir (B-R1/2). Bir yerde
daraldı: kıyas sipariş ihtiyacını kapsamaz, çünkü işaretsiz satırın sipariş kilosu bilinçli
olarak değişiyor (C3, B-R6/2). Dört iddia düzeltildi: sipariş ihtiyacının kıyasta değişmeyeceği,
etkilenen altın sayısı, `artanKg`'nin ekranda olduğu ve örnek katalogda tek kaydın etkilendiği.

### Revizyon 2 (plan turu, 2026-11-12)

Geliştiricinin planındaki dokuz öneri Takım Yöneticisi tarafından onaylandı ve C2/3, B-R3/3, B-R8/3, C-R4, D-R3/4, D-R3/5 ile
AC-61–AC-66 olarak işlendi. Etkilenen altın sayısı beşten altıya düzeltildi (0140), "ayıklama yetmez" kararı dar ayıklamayla
tamamlandı (sayılar birebir, yalnız kalkan alanlar normalleşir).

### Açık, müşteriden cevap bekleyen (bu spec'i bloke etmez)

1. Hangi malzeme hangi çapta kaç milimetrelik çubukla geliyor. Bugün yalnız beşi biliniyor
   (paslanmaz Ø35 → 400, Ø10 → 3000, Ø15 → 1000, Ø30 → 400; kestamit Ø16 → 1000).
2. Boru dışında boy başına fiyat verilen malzeme var mı (X1'in çevirme yükü onları da kapsar).

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | Revizyon 2 plan turunda: altıncı altın (0140) ve "ayıklamasız kıyas" kararının dar ayıklamayla tamamlanması dahil dokuz öneri |
| **Düzeltme turu sayısı** | 1 | Triyaj (2026-11-12), üç bulgu |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Oranın üç ondalık yuvarlaması uzun çubukta eksik sipariş veriyordu; elle boy adedinde asgari uyarısı yoktu; göç `yontem: "kilo"`'yu bırakıyordu |
| **Regresyon sayısı** | 0 | Maliyet zinciri, fiyat, model, parti ve Excel spec öncesi altınla birebir; altı eski altın bayt bayt aynı |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:** bir toleransı "oranı üç ondalığa yuvarla" diye yazmak toleransı bölene (çubuk boyuna) bağlar; tolerans
giriş hassasiyetinden geliyorsa birimi de girişin birimi (milimetre, parça başına) olmalı. Ayrıca spec'in "etkilenen altın" sayımı
anahtar aramasıyla (`"yontem": "boy"`) yapılmıştı; değer değişimini (kilo yolundaki boy adedi) aramak altıncı altını gösterdi.
