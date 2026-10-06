# 0074 — SGK Kendi Gider Türü Olsun (spec 0070'in SGK yarısının revizyonu)

| | |
|---|---|
| **Durum** | Onaylandı, uygulanıyor (revizyon 2, 2026-10-07) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider türleri (yeni kilitli davranış), tekrarlayan gider tanımı, gider kalemi formu, borç özeti, açık kalemler, ödeme hatırlatıcısı, 0047 raporu, çalışan kartı, kasa mahsup kuralı |
| **Bağımlı spec'ler** | **0070 (revize edilen)** · 0001 (davranışlar, kova, borç özeti) · 0011 (kanıt eşlemesi) · 0020 (atanabilirlik) · 0021 (ödeme hedefleri) · 0024 (ödeme hareketi, ekstre) · 0047 (rapor kutusu) · 0059 (altın rapor dosyaları) · 0060 (hedef adları, gizlilik sınırı) · 0067 (BorcOzeti'nin dört dalı) · 0071 (sıfır tutarlı kalem) |
| **Revizyon** | Bu spec, 0070'in **SGK yarısını** değiştirir; 0070'in yol parası yarısı aynen kalır. · 2 · 2026-10-07 uygulama planı onayı: S1–S12 işlendi (R2, R14, R18, R19, R22, R25, R32–R36, AC-28, AC-45, AC-47, AC-48); plan `specs/0074-uygulama-plani.md` |
| **Önceki revizyon** | 1 · 2026-10-06 QA turu: B-1..B-7, Ö-8..Ö-21, K-22..K-26 işlendi (Takım Yöneticisi onayı) |

---

## Intent

Spec 0070 SGK'yı **personel kaleminin ikinci ödeme hedefi** yaptı (kiranın stopajı deseni): tutar her
çalışanın kaleminin içinde duruyor, borç özetinde sentetik bir "SGK" satırı olarak toplanıyor ve ayın
tamamı kendine ait bir pencereden (SGK'yı Öde, ay seçicili) ödeniyor.

Kullanımda üç sorun çıktı:

1. **"Kime Ne Kadar Borçluyuz" kutusunda mantığı oturmadı:** satır gerçek bir kalemin borcu değil, on
   ayrı personel kaleminin içinden toplanmış bir ara değer. Tıklayınca gidilecek bir kalem yok.
2. **Ödeme yolu tek başına kaldı:** uygulamadaki her borç kendi gider kaleminden ödeniyor, yalnız SGK
   kendine ait bir pencereden ödeniyordu.
3. **SGK bir gider satırı olarak görünmüyordu:** gider türleri listesinde, tekrarlayan giderlerde ve
   kalem listesinde SGK diye bir şey yoktu, oysa her ay ödenen gerçek bir gider.

Takım Yöneticisi kararı: **SGK, kira ve personel gibi kilitli bir davranış olsun.** Gider türlerinde,
tekrarlayan giderlerde ve gider kalemlerinde görünsün; ödemesi, diğer bütün ödemeler gibi, kendi gider
kaleminden yapılsın.

Başarı şu demek: her ay bir SGK kalemi var, tutarı bildirgeden girilmiş, borç kutusunda "SGK" satırı
o kalemi gösteriyor ve ödeme bugünkü ödeme penceresinden yapılıyor. SGK'ya özel hiçbir ödeme yolu yok.

---

## Requirements

### A. Yeni kilitli davranış

- **R1.** `DAVRANIS`'a **`SGK: "sgk"`** eklenir. Kira ve personel gibi kilitli bir davranıştır: tür
  oluşturulurken seçilir, tür kullanıma girince değişmez, kullanımdaki tür yalnız **aynı davranıştaki**
  bir türe taşınarak silinir. Bu kuralların hiçbiri değişmez, yalnız yeni bir değer alır.
- **R2.** Davranış adı ve rozeti (`DAVRANIS_AD`, `DavranisRozeti`) SGK için eklenir; rozetin rengi
  tema değişkenlerinden gelir (çıplak renk yasağı, spec 0030). *(Revizyon 2, S11: mavi aile `--blu700`, `--bluBg`,
  `--bluBr`, borç kutusundaki "Kurum" rozetiyle aynı.)*
- **R3.** "Önerilen türleri ekle" listesine **`["SGK", "sgk"]`** eklenir
  (`GiderTurManager.jsx:16`'daki dizi). Listedeki mevcut **"Sosyal güvenlik (Bağkur)"** türü `normal`
  davranışta kalır: Bağkur, şirket sahibinin kendi primi, çalışan SGK'sı değil. **Adı DEĞİŞTİRİLMEZ**
  (K-22): kullanıcı verisinde aynı adla tür olabilir ve varsayılan listedeki adı değiştirmek "Önerilen
  türleri ekle"nin mükerrer tür üretmesine yol açar; karışıklık yeni türün davranış rozetiyle çözülür
  (SGK rozeti, Bağkur normal).
- **R4.** SGK türü üç yerde seçilebilir: gider türleri yönetimi, tekrarlayan gider tanımı, gider kalemi
  formu.

### B. SGK kaleminin şekli

- **R5.** SGK kalemi **tek ödeme hedefi (ANA) olan normal bir kalemdir.** Tutar, tarih, vade, taksit,
  çek (ciro ve kendi çekimiz), ödeme penceresi, kısmi ödeme: hepsi bugünkü kalem yollarıyla çalışır.
  Yeni ödeme yolu, yeni pencere ve yeni izin yoktur. (SGK yapılandırmasının taksitle ödenebilmesi bu
  kararın kendiliğinden gelen faydasıdır; 0070'te SGK hedefi taksitlenemiyordu.)
- **R6.** **KDV yoktur.** Tek gerçek değişiklik `kdvKurus`'tadır (B-4): bugün
  `kdvKurus = (k, dav) => (dav === PERSONEL ? 0 : kurus(k.tutar) * kdvOrani / 100)` (`gider.js:145`),
  yani SGK'da KDV hesaplanır; personel dalına SGK da eklenir. `kdvYonuSecilebilirMi` (`:160`)
  `NORMAL || (KIRA && girisYonu !== "net")` olduğu için SGK'da **zaten `false`** döner ve ek değişiklik
  istemez. Ayrıca `giderKalemDogrula`'nın `kdvYonu` ataması (`:503`) SGK'da personel gibi **null** yazar
  ve `kdvOrani` sıfıra çekilir; aksi hâlde formda tarih bazlı ön doldurulan oran kalemde kalır ve iki
  yerden biri atlandığında SGK'lı ayda KDV karşılaştırması bozulur.
- **R7.** Stopaj, çalışan bağı (`calisanId`), ek ödemeler ve elden bileşeni yoktur.
- **R8.** **Tedarikçi seçilmez:** alacaklı her zaman kurumdur, alan çizilmez.
- **R9.** **Atanamaz, her zaman ortak kovaya girer.** Değişiklik tek satırdır (Ö-9):
  `atanabilirMi = (davranis) => davranis !== DAVRANIS.KIRA` (`gider.js:60`) →
  `davranis !== KIRA && davranis !== SGK`. Ortak kovaya düşmek **kendiliğinden** olur, çünkü `kovaKurus`
  `if (!atanabilirMi(davranis)) r.ortak = top;` diyor; formun atama bölümü de aynı kapıdan gizlenir ve
  ekranda ayrı bir dal yazılmaz (C1). Gerekçe: tutar bütün çalışanların toplamıdır, tek makinaya ya da
  modele yüklenmesi anlamsızdır.
- **R10.** **Sıfır tutar yalnız tanımdan üretilen kalemde serbesttir** (Ö-8):
  `sifirTutarSerbestMi` SGK davranışını da kabul eder, ama doğrulamanın kapısı
  `tanimKalemi && sifirTutarSerbestMi(dav)` (`giderKalemDogrula:571`, 0071 R9 ve R14 kararı). Yani
  tekrarlayan tanım ayın kalemini sıfırla üretir ve bildirge gelince tutar girilir; **elle açılan SGK
  kalemi sıfır tutarla kaydedilemez** ve kullanıcıya önerilen akış tanım kurmaktır. `tanimKalemi` kapısı
  gevşetilmez. 0071'in "Tutar girilmedi" işareti ve süzgeci SGK kaleminde de çalışır.
- **R11.** Ödeme hedefinin adı tek tablodan gelir (0060 R24) ve **üç parçalı** bir değişikliktir (B-2):
  (a) bugünkü `HEDEF_ADLARI.genel[HEDEF.SGK]` kaydı (`odemeYontemi.js:136`, `ad("SGK'ya", "SGK")`)
  **silinir**, çünkü `HEDEF.SGK` kalkıyor; (b) `HEDEF_ADLARI.sgk = { [HEDEF.ANA]: ad("SGK'ya", "SGK") }`
  eklenir (kira deseni); (c) `hedefAdKaydi`'na (`:144-146`)
  `hedef === HEDEF.ANA && davranis === DAVRANIS.SGK` dalı eklenir. Dal **yazılmazsa** ad `genel[ANA]`'ya
  düşer ve ekranlarda "Tedarikçiye" görünür, AC-16 sessizce başarısız olur. Dal kitaplıkta olduğu için
  C1 ihlal edilmez; ekranlar `hedefAdi` / `hedefBasligi` çağırır, kendi metnini yazmaz.

### C. Tutarın kaynağı

- **R12.** Çalışan kartındaki **SGK alanı kalır** (0070 R2), ama artık personel kaleminin bileşeni
  değil, **aylık SGK toplamının önerisidir.**
- **R13.** **SGK kaleminin tutarı kayıtta saklanır, çalışanlardan türetilmez.** Gerekçe: bildirge aya
  göre değişir (eksik gün, işe giriş ve çıkış, teşvikler, tavan), ve türetilen tutar çalışan kartı
  düzenlendiğinde **geçmiş ayların giderini geriye dönük oynatır.**
- **R14.** Kalem formunda **"Çalışanların SGK toplamını kullan"** düğmesi tutarı doldurur ve tutar sonra
  elle düzeltilebilir. Kapsam dar yazılıdır (Ö-15): toplam yalnız **canlı** çalışanların (`deletedAt`
  yok) **dolu** `sgkMaliyet` değerlerinden hesaplanır, düğme kaç kişiden geldiğini yazar, hiç değer
  yoksa düğme **pasiftir** ve nedeni yazılıdır. Hesap saf bir yardımcıda durur (`gider.js`), formda
  satır içi toplama yazılmaz (C1). Düğme yalnız gider yetkisiyle görünür (çalışan maliyeti alanlarının
  bugünkü kuralı). *(Revizyon 2, S12: gider formu yalnız Giderler sekmesinde açılır, yani düğmeyi gören herkes gider
  yetkilidir; ayrı kapı yazılmaz, yetki kaynak taramasıyla ölçülür. Düğme tanım formunda yoktur.)*
- **R15.** Çalışan listesindeki maliyet sütunu dört bileşeni göstermeye devam eder ve toplamı
  **işverene toplam maliyet** olarak okunur. Değişen metin adıyla yazılıdır (Ö-16):
  `CalisanManager.jsx:189`'daki ipucu bugün "Gider tutarı = resmi + SGK + elden + yol parası" diyor;
  yenisi toplamın işverene toplam maliyet olduğunu, SGK'nın **personel kalemine girmediğini ve kendi
  gider kalemiyle ödendiğini** söyler. Cümle olduğu gibi kalırsa C2'nin çift sayım yasağını kullanıcıya
  yanlış anlatır.

### D. 0070'in SGK yarısının geri alınması

- **R16.** `HEDEF.SGK` ve `HEDEF_SIRASI`'ndaki yeri kaldırılır. `sgkKurus` personel toplamına girmez
  (`gider.js:99`); `odenecekKurus`'tan SGK çıkarma kaldırılır (`:175`); `satirsizHedefler`'in SGK dalı
  (`:232-233`) ve `hedefToplamKurus`'un SGK satırı (`:218`) kalkar. Personel kaleminin toplamı yine
  **resmi + elden + yol parası + ek ödemeler**, ödenecek tutarı da aynısıdır. Silinecek diğer izler
  adıyla:
  - **Ekran (B-5):** `DonemRaporu.jsx:65` `PERSONEL_IZGARA` yedi sütundan **altıya** iner, `:89` ve
    `:94` SGK sütunu kalkar, `:383` personel satırındaki "· SGK {tutar}" parçası kalkar, `:256`'nın
    0071 ölçütü (kalem tutarının sıfır olması) aynen kalır ama SGK gerekçesi silinir. Sütun kalırsa her
    personel satırında boş bir kolon durur ve 0070'in AC-43 testi yanlış yönde yeşil kalır.
  - **Borç özeti kırılımı:** `gider.js:946`'daki `c.sgk` kalkar.
  - **Form (Ö-14):** `GiderForm.jsx:25` ve `:38` form alanları, `:43` `sgkVade` okuması, `:89-90`
    çalışan kartından `sgkTutar` ön doldurması, `:127-128` `personelToplam`, `:134` kayıt, `:139-141`
    `odemeSatirlariKur` çağrısı ve bağımlılık dizisi. `:98` `calisanMaliyetsiz` denetimi **üç alana**
    iner (`resmiMaliyet`, `eldenMaliyet`, `yolParasiMaliyet`): yalnız SGK'sı girilmiş çalışan artık
    "maliyeti tanımlı" sayılmaz, aksi hâlde uyarı çıkmaz ve kullanıcı maaşsız kalem üretir.
  - **Çek yasağı (Ö-17):** `formOdemesi.js:21-22`'deki `[HEDEF.SGK]` kaydı silinir; SGK kaleminin hedefi
    ANA olduğu için çek bugünkü "yalnız ANA" kuralıyla **kendiliğinden** serbesttir (AC-11 böyle
    ölçülür).
- **R17.** SGK vadesi **bir form alanıdır, sütun değildir** (B-1): kalıcı yeri `hedef:"sgk"` taksit
  satırının `vade`'sidir (`db.cjs:522` yorumu, `GiderForm.jsx:43` `sgkVade: sgk[0]?.vade`). Kaldırılan
  şeyler: `GiderForm`'un `sgkVade` form alanı ve `odemeSatirlariKur`'un `sgkVade` parametresi
  (`GiderForm.jsx:139`). SGK kaleminin vadesi kalemin kendi `sonOdemeTarihi`'dir.
- **R18.** Toplu ödeme kaldırılır. Silinecekler adıyla:
  - `src/lib/sgkOdeme.js` ve `src/components/gider/SgkToplamOdeme.jsx`; `kilitAlanlari.js:28`'deki
    pencere kaydı.
  - **`Giderler.jsx` (B-3):** `:193-202` (durum `sgkOdemeAcik`, `sgkOde`, `sgkKaydet`, `logAction`
    "SGK · ay" satırı, toast), `:423-425` (pencere), ve **`BorcOzeti`'nin `onSgkOde` prop'u dört
    çağrıda birden** (`:335`, `:342`, `:363`, `:375`; 0067 R25'in dört dalı). Dört çağrıdan biri
    atlanırsa prop kalır ve düğme bazı dallarda görünmeye devam eder.
  - **`DonemRaporu.jsx`:** `:154` prop ve `:170` "SGK'yı Öde" düğmesi.
  - **Kanıt zinciri (B-6, zorunlu):** `docs/evidence/kanit-eslemesi.json:3669`'daki
    `src/components/gider/SgkToplamOdeme.jsx` kaydı **silinmek zorundadır**, çünkü
    `tests/tasarim-kaynak.test.js` (0011 R2) tasarım sözlüğünü içe alan dosya kümesini JSON'un anahtar
    kümesine **eşitler**. Ayrıca `scripts/evidence/0009-sayfa.jsx:903-906`'daki üç 0070 ekranı
    (`gider-formu-0070-personel`, `giderler-0070-borc-sgk`, `giderler-0070-sgk-odeme`) yeni modele göre
    yeniden kurulur ve `SGK_0070` fikstürleri SGK kalemine çevrilir; `giderler-0070-sgk-odeme` düğme
    kalkınca çöker (araç boş ya da çöken ekranı hata sayar) ve `kanit-eslemesi.json:1146`'daki atıf da
    güncellenir.
  Borç özetinin SGK satırı, kutunun diğer taraf satırları gibi yalnız gösterir.
  *(Revizyon 2, S10: 0070'in üç SGK test dosyasının SGK blokları silinir, yol parası blokları değişmeden kalır;
  yeni davranış 0074 dosyalarında sınanır.)*
- **R19.** **Borç özetindeki SGK satırı korunur, ama davranışla tetiklenir:** davranışı SGK olan
  kalemlerin açık ANA hedefleri tek "SGK" taraf satırında toplanır. Satır sentetiktir (tedarikçi kaydı
  açtırmaz, tedarikçi kartına girmez), genel açık borca girer. `SGK` taraf sabiti (`gider.js:195`) ve
  "Kurum" rozeti (`DonemRaporu.jsx:165`) korunur. **Açık kalemler motorunda üç satır değişir** (Ö-10,
  `acikKalemler.js:46-53`): `sgkHedef = h.hedef === HEDEF.SGK` yerine `dav === DAVRANIS.SGK`, `personel`
  bayrağı `dav === DAVRANIS.PERSONEL`e sadeleşir, `tarafTur` zincirinin `sgk` dalı davranışa bakar.
  Üçünden biri atlanırsa SGK kalemi "Tedarikçi seçilmemiş"e düşer (AC-24). **Revizyon 2 (S4):** Dönem Raporu'nun
  **tedarikçi kırılımı** (`hesaplaGiderRaporu.tedarikciKirilimi`) SGK kalemini personel gibi dışarıda bırakır ve kalem
  listesinin tedarikçi hücresinde "Tedarikçi seçilmemiş" yerine taraf adı "SGK" yazar (tek kitaplık yardımcısından).
- **R20.** **Ödeme hatırlatıcısının SGK toplu satırı kaldırılır** ve bu **dört yerde** iz bırakıyor
  (Ö-11, `odemeHatirlatma.js`): `:59-63` toplu satır, `:75` `sira` haritasındaki `sgk: 1` anahtarı,
  `:103` `calisanHedefleri` süzmesi, `:106-116`'daki `sgkHedef` dalı ve `vadeEtiketi`'nin "SGK vadesi"
  kolu. SGK artık ayda tek kalemdir ve normal kalem satırı olarak görünür, tarafı `SGK` sabitidir.
  (Toplu satırın gerekçesi kişi bazlı SGK'nın satır satır görünmemesiydi; o sorun artık yok.) Ölü
  kalan `sira` anahtarı ve yanlış kalan "SGK vadesi" etiketi birlikte silinir.
- **R21.** **Çalışan ekstresinin SGK dışlaması kaldırılır** (0070 R22): SGK personel kaleminin hedefi
  olmadığı için ekstre bugünkü sade hâline döner.
- **R22.** **Avanstan mahsup SGK kalemine yapılamaz** (0070 R28'in yeni biçimi) ve bugünkü kuralın
  **iki parçası** birden ele alınır (B-7, `kasa.js`): `:607`'deki "taksidin hedefi SGK ise reddet"
  dalı ve `:612-613`'teki satırsız kalemde SGK'nın kalanını sınırdan çıkaran hesap (`sgkKalanK`).
  İkincisi **tamamen kaldırılır** (SGK artık personel kaleminde değil, aksi hâlde daima sıfır dönen ölü
  kod olur); yeni kural tek satırdır: `davranisOf(kalem, turMap) === DAVRANIS.SGK` ise mahsup
  reddedilir. `SGK_MAHSUP_HATASI` metni (`:13`) korunur ama "hedefine" yerine **"kalemine"** der.
  Gerekçe aynı: avans çalışanın borcu, SGK kurumun alacağı. **Revizyon 2 (S6):** SGK denetimi personel denetiminden
  **önce** durur (yoksa "Avans yalnız personel kalemine mahsup edilir." döner ve SGK metni hiç görünmez). Ödeme
  penceresinin "Avanstan mahsup" kipi SGK kaleminde zaten çizilmez (personel kapısı); ekranda gösterilecek bir hata yoktur.
- **R23.** 0047 raporundaki **"GİDER · SGK" kutusu korunur ama kaynağı değişir** ve rapor tarafı **üç
  yerde** değişir (Ö-12, `giderRaporu.js`):
  - `:100-101` `sgkOzeti` çağrısı: imza aynı kalır (`sgkOzeti(kalemler, turMap)`) ama yeni hâli
    (Ö-13) **davranışı SGK olan kalemlerin `kalemKurus` toplamıdır**, ödenen ve açık ayrımı
    `odemeDurumu` üzerinden (stopajın `stopajOzeti` emsali). Üç satır tek kaynaktan gelmezse 0047'nin
    dönem kilidi bozulur.
  - `:120-121` hatırlatıcının `tur === "sgk"` toplu satırının rapordaki karşılığı **kalkar** (R20'nin
    sonucu); atlanırsa rapor artık üretilmeyen bir satır türünü beklemeye devam eder.
  - `:215`, `:223` ve `:231` ödeme sınıflaması ile **"SGK ödemeleri" toplu satırı** kalkar: SGK kişi
    bazlı değildir, ödemesi normal kalem ödemesi olarak listelenir.
  `<!--sgk-->` işaretleri ve kutu başlığı (`:337-340`) korunur.
- **R24.** Çalışan kartındaki ve gider formundaki SGK notları yenilenir: SGK ayrı bir gider türüdür,
  kendi kalemiyle ödenir, personel kaleminin tutarı SGK içermez.

### E. Veri

- **R25.** **Veri göçü yazılmaz.** 0070 yayınlanmadı (son yayın v3.43.0, commit `25ce74e`; 0070
  `14b74b4` ile sonra geldi), yani kullanıcı verisinde SGK'lı personel kalemi yok. **Dayanak
  ölçülebilir olmalı** (Ö-20): işe başlamadan önce yayınlanmış son sürümün etiketinde `HEDEF.SGK`
  bulunmadığı tek komutla doğrulanır ve sonucu plana yazılır; varsayım yanlışsa göç kararı değişir. **Revizyon 2 (S2):
  ölçüldü** (2026-10-07): son yayın v3.43.0 (`25ce74e`, GitHub "Latest"), `git show 25ce74e:src/lib/gider.js` içinde
  `HEDEF.SGK` ve `sgkTutar` 0 kez geçer; `14b74b4` main'de değildir. Göç yazılmaz.
- **R26.** **`giderler.sgkTutar` sütunu yerinde bırakılır**, hiçbir hesap okumaz. `sgkVade` **diye bir
  sütun yoktur** (B-1; şema `... kdvYonu TEXT, sgkTutar REAL, yolParasi REAL, dagitimAy INTEGER`,
  `db.cjs:229`, ve `GIDER_SGK_YOL_COLUMNS` yalnız `sgkTutar` ile `yolParasi`'nı taşır, `:523`);
  `yolParasi` kalır ve **okunmaya devam eder**, çünkü 0070'in yol parası yarısı duruyor (X7). Gerekçe:
  SQLite'ta sütun düşürmek tabloyu yeniden yazmak demek ve dört nokta kuralı okunmayan sütuna izin
  verir. Deneme sırasında girilmiş tutarlar veride kalır, doğrulama onları **temizlemez** (kaybolmaz
  ama artık sayılmaz).
- **R27.** `gider_taksitleri.hedef`'e artık `"sgk"` yazılmaz; yazılmış satır hedef listesinde yer
  almadığı için okuma anında dışarıda kalır ve kalemin ilk kaydında temizlenir.

### F. Türev etkiler

- **R28.** **Makina maliyeti değişir:** SGK ortak kovaya girdiği için makina maliyetine **ortak gider
  payı** olarak girer; 0070'te personel kaleminin içindeyken o kalemin atamasını (makina ya da model)
  izliyordu. Bu bilinçli bir değişikliktir ve yayınlanmamış olduğu için göç gerekmez.
- **R29.** Tür kırılımında, kova dağılımında, KDV karşılaştırmasında ve dönem toplamlarında SGK kalemi
  kendi türüyle görünür; bu kalemler zaten davranıştan bağımsız çalışır, ek kural gerekmez.

### G. Gizlilik

- **R30.** **Çalışan kartındaki kişi bazlı SGK tutarı hiçbir çıktıya girmez** (`sgkMaliyet` bugünkü
  resmi/elden yasağının aynısında kalır).
- **R31.** **SGK kaleminin tutarı tür bazında bir toplamdır ve basılır** (0060'ın çizdiği sınır: tür
  bazında toplam evet, kişi bazında hayır). Basılan alan SGK **kaleminin `tutar`** alanıdır, `sgkTutar`
  **değildir** (Ö-18); bu yüzden `gider-gizlilik.test.js:11`'deki `YASAKLI` listesi
  (`sgkTutar|yolParasi|sgkMaliyet|yolParasiMaliyet` dahil) ve `<!--sgk-->` kutu kapsaması
  **gevşetilmez**, yalnız kutu testinin fikstürü (`:264-279`) SGK davranışlı kalemlere çevrilir. Tek
  çalışanlı bir firmada bu toplam o kişinin SGK'sını dolaylı belli eder; bu, 0060'ta kabul edilen
  riskin aynısıdır.

---

### H. Plan onayıyla gelenler (revizyon 2)

- **R32 (S1).** İş `feat/0072-gider-dagitim` (`17f8256`) üstünde `feat/0074-sgk-turu` dalında yapılır.
- **R33 (S3).** **Davranış kapıları `gider.js`'te tek fonksiyonlardır:** `kdvliMi(dav)` (personel ve SGK değil; `kdvKurus`,
  doğrulama, tekrarlayan üretim ve iki formun KDV alanları), `tedarikciSecilirMi(dav)` (aynı koşul; iki formun tedarikçi
  alanı) ve `sgkDavranisiMi(dav)` (borç özeti, tedarikçi kırılımı, `sgkOzeti`, açık kalemler, hatırlatıcı, mahsup, hedef
  adı). Formlardaki `dav !== PERSONEL` kapıları bu iki kapıya çevrilir; aksi hâlde SGK'da tedarikçi ve KDV alanı çizilir.
- **R34 (S5).** Doğrulama personelde `sgkTutar`'ı ne okur ne yazar (mevcut değer kalır, R26); `tekrarlayanUret` kartın
  `sgkMaliyet`'ini artık kaleme kopyalamaz (ölü veri üretmez). SGK davranışında tekrarlayan üretim KDV'siz kalem üretir
  (tanımda oran yoksa tarihe göre oran alınmaz).
- **R35 (S7).** Kullanıcı rehberi (`docs/rehber/`) analistin dosyasıdır; uygulayıcı onu değiştirmez, planda değişmesi
  gereken paragrafları listeler.
- **R36 (S8, S9).** Sürüm notu 0074 planının §7'sindedir ve 0070 yayınlanmadığı için **yalnız yeni modeli** anlatır;
  `specs/done/0070-uygulama-plani.md` §7'deki SGK paragrafına "yerini 0074 §7 aldı" satırı eklenir. SGK kalemi ortak
  kovada olduğu için 0072 dağıtımı ek kural olmadan çalışır.

## Constraints

- **C1.** **Davranış kuralı tek kapıdan geçer:** atanabilirlik `atanabilirMi`, sıfır tutar
  `sifirTutarSerbestMi`, KDV `kdvKurus` ve `kdvYonuSecilebilirMi`, hedef adı `HEDEF_ADLARI`. Yeni
  davranış bu kapıları genişletir; ekranlara `dav === "sgk"` dalı dağıtılmaz.
- **C2.** **Çift sayım yasağı:** SGK tutarı yalnız SGK kaleminde sayılır. Personel kalemi SGK
  içermez, çalışan kartındaki alan yalnız öneri kaynağıdır ve hiçbir toplamın parçası değildir.
- **C3.** Yeni izin ve yeni sunucu kuralı yoktur ve şu listeler **değişmez** (K-25):
  `BOLUM_SEKMELERI`, `EYLEM_IDLERI`, `ALAN_IZINLERI`, `KAYIT_DUZENLE_IZINLERI` ve `MERGE_KEYS`. SGK
  türü `giderTurleri` bölümünde `gider_tanim`, kalem `giderler` bölümünde `gider_add/edit/delete`,
  ödeme `hesapHareketleri` bölümünde `gider_odeme` ile geçer.
- **C4.** Yeni kalıcı alan açılmaz; kaldırılan alanların sütunu yerinde bırakılır (R26).
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** SGK'nın çalışan bazında izlenmesi ya da kişi kişi ödenmesi — *neden:* SGK kuruma tek kalemde
  ödenir; kişi bazlı tutar R30'un yasak kapsamındadır.
- **X2.** SGK kaleminin makinaya ya da modele atanabilmesi — *neden:* R9.
- **X3.** Kalemin tutarının çalışan kartından kalıcı olarak türetilmesi — *neden:* R13; geçmiş ayları
  geriye dönük oynatır.
- **X4.** Bağkur ve şahıs primleri için ayrı davranış — *neden:* normal tür yeterli; davranış, ödeme
  ve atama kuralı farklı olduğunda açılır.
- **X5.** SGK bildirgesinden otomatik veri okuma, e-SGK ya da muhasebe entegrasyonu — *neden:* bu
  spec bir gider türü işidir.
- **X6.** Deneme verisindeki SGK tutarlarının yeni kalemlere dönüştürülmesi — *neden:* R25, R26;
  yayınlanmamış veri için göç yazmak maliyetli ve risklidir, kullanıcı o ayların SGK kalemini elle açar.
- **X7.** 0070'in **yol parası** yarısı — *neden:* o yarı çalışıyor ve değişmiyor; bu spec yalnız SGK'yı
  ele alır.

---

## Context

- **Bugün kodda ne var (sayıldı).** 0070 uygulandı (commit `14b74b4`). SGK `src/` ve `electron/`
  altında **on yedi** dosyaya dokunuyor (Ö-19): `gider.js` (`HEDEF.SGK`, `sgkKurus`, `SGK` taraf
  sabiti, `sgkOzeti`, `satirsizHedefler`, `hedefToplamKurus`, borç özetinin `c.sgk`'sı),
  `odemeYontemi.js` (hedef adı), `kasa.js` (mahsup yasağı, ekstre dışlaması), `acikKalemler.js`,
  `odemeHatirlatma.js`, `giderRaporu.js`, `formOdemesi.js` (çek yasağı kaydı), `sgkOdeme.js` ve
  `gider/SgkToplamOdeme.jsx` (toplu ödeme), `GiderForm.jsx`, `OdemeGirisi.jsx`, `Giderler.jsx`
  (pencere, dört `BorcOzeti` çağrısı, log), `DonemRaporu.jsx` (personel ızgarası, borç satırı, düğme),
  `CalisanManager.jsx` (alan ve ipucu), `kilitAlanlari.js` (pencere kaydı), `db.cjs` (`sgkTutar`
  sütunu). Ayrıca kanıt ve belge tarafı: `docs/evidence/kanit-eslemesi.json`,
  `scripts/evidence/0009-sayfa.jsx` (üç 0070 ekranı), `docs/rehber/gider-kasa-kurulum.html`. **Önemli
  düzeltme:** `sgkVade` **sütun değildir**, `hedef:"sgk"` taksit satırının vadesidir (B-1). Bu spec'in
  işi büyük ölçüde **silme**: hedef mekanizması kalkar, yerine zaten var olan "bir kalem, bir tür, bir
  hedef" yolu kullanılır.
- **SGK'ya atıf yapan testler bir elin parmağından fazla.** `calisan-sgk-0070.test.js`,
  `ui/calisan-sgk-0070.test.jsx`, `gider-kasa-raporu-0070.test.js` (doğrudan), artı
  `ek-odeme-hedefi.test.js`, `gider-kasa-raporu-0059.test.js`, `gider-gizlilik.test.js`,
  `ui/gider-ek-odeme.test.jsx`, `ui/gider-form.test.jsx`, `ui/gider-perdesi.test.jsx`,
  `ui/tahsilat-hesap.test.jsx`, `db-roundtrip.cjs`, `db-clean-install.cjs`. `sgkOzeti` değiştiği için
  0059'un altın dosyaları (`tests/fixtures/0059-gider-rapor-once.json`, `0059-aylik-faaliyet.html`)
  ayrıca denetlenir. Eksik liste, işin sonunda "npm test yeşil" maddesinde sürpriz kırmızı demek.
- **Kilitli davranış altyapısı hazır ve dar.** Davranış tür oluşturulurken seçiliyor, kullanıma girince
  kilitleniyor, silme yalnız aynı davranıştaki türe taşıyarak yapılabiliyor (`GiderTurManager`), ve
  davranışa bağlı kurallar **tek fonksiyonlarda** toplanmış: `atanabilirMi` (0020 C1),
  `sifirTutarSerbestMi` (0071), `kdvYonuSecilebilirMi` (0071), `HEDEF_ADLARI` (0060). Üçüncü bir
  davranış eklemek bu yüzden ucuz; pahalı olan, davranış dalını ekranlara dağıtmak (C1 bunu yasaklıyor).
- **"Kime Ne Kadar Borçluyuz" okuması.** TY'nin "mantıken olmadı" notunu şöyle okudum: SGK'nın o
  kutuda **yer alması** yanlış değil, ödenmemiş SGK gerçek bir borçtur ve kutunun sorusu tam olarak
  budur; yanlış olan, satırın arkasında tek bir kalem olmaması ve ödemesinin kutudan özel bir pencereyle
  yapılmasıydı. Bu yüzden satır **korunuyor** (R19) ama artık gerçek bir kalemin borcu oluyor, ödeme
  düğmesi kalkıyor ve diğer taraf satırlarıyla aynı davranıyor. Eğer TY'nin kastı "SGK o kutuda hiç
  görünmesin" ise bu R19'un tek satırlık tersi; önermiyorum, çünkü o zaman ödenmemiş SGK hiçbir borç
  listesinde görünmez.
- **Neden ortak kova.** SGK bütün çalışanların toplamıdır. Atanabilir yapılsa kullanıcı tek makinaya
  bütün ayın SGK'sını yükleyebilir, ya da model satırlarına bölmek için kişi kişi dağıtım yapması
  gerekir ki bu R30'un gizlilik sınırını zorlar. Ortak kovaya girmek maliyetten kaçmak değildir: ortak
  gider payı yoluyla ayın bütün makinalarına dağılır, yani makina maliyeti SGK'yı yine taşır.
- **Neden tutar saklanıyor, türetilmiyor.** Personel davranışının bugünkü yolu tutarı çalışan
  kaydından türetiyor (`tutar: null`), ve bunun bilinen bir karakteri var: çalışanın maaşı
  değiştirilince geçmiş ayların kalemi de değişiyor. Maaşta bu kabul edilebilir (nadiren değişir),
  SGK'da değil: bildirge her ay farklı ve geçmişi oynatmak dönem raporunu bozar. Öneri alanı kalıyor,
  karar kullanıcının (R13, R14).
- **0071 ile iyi oturuyor.** SGK'nın gerçek çalışma biçimi "tanımdan sıfır tutarlı kalem doğar,
  bildirge gelince tutar girilir"dir ve 0071 bu mekanizmayı elektrik ve su için zaten kurdu. SGK'yı
  `sifirTutarSerbestMi`'ye eklemek tek satır, ve "Tutar girilmedi" işareti unutulmayı engelliyor (R10).
- **Yayınlanmamış olması işi kolaylaştırıyor.** 0070 hiçbir sürümle kullanıcıya gitmedi, bu yüzden
  göç, geriye uyum ve sürüm notu yükü yok (R25). Buna karşılık deneme sırasında girilmiş SGK tutarları
  artık sayılmayacak: kullanıcıya "o aylar için SGK kalemini açın" demek gerekiyor, sürüm notunda
  yazılı olmalı.
- **Adlandırma tuzağı.** Varsayılan tür listesinde zaten "Sosyal güvenlik (Bağkur)" var ve `normal`
  davranışta. Yeni "SGK" türü onun yanına gelince kullanıcı ikisini karıştırabilir. Bağkur şirket
  sahibinin kendi primi, SGK çalışanların primi; ikisi farklı borç, farklı alacaklı değil ama farklı
  kavram. R3 davranışı değiştirmemeyi, gerekirse yalnız adı netleştirmeyi söylüyor.

---

## Acceptance Criteria

### Davranış

- **AC-1.** Gider türü oluştururken davranış listesinde SGK vardır ve seçilebilir.
- **AC-2.** Kullanımdaki SGK türünün davranışı değiştirilemez.
- **AC-3.** Kullanımdaki SGK türü yalnız başka bir SGK türüne taşınarak silinir. **Tek SGK türü
  varken silme reddedilir** ve mesaj `DAVRANIS_AD` üzerinden "SGK davranışında başka tür yok" der
  (`GiderTurManager.jsx:167`'nin bugünkü metni, kira ve personelle aynı davranış; K-23).
- **AC-4.** "Önerilen türleri ekle" SGK türünü ekler; "Sosyal güvenlik (Bağkur)" türü normal kalır.
- **AC-5.** Davranış rozeti SGK için çizilir ve rengi tema değişkenlerinden gelir.

### Kalem

- **AC-6.** SGK türünde kalem açılabilir; tutar, tarih ve vade girilir, kaydedilir.
- **AC-7.** SGK kaleminde KDV alanı ve KDV yönü seçicisi yoktur; `kdvKurus` sıfır döner, kaydedilen
  kalemin `kdvOrani`'sı sıfır ve `kdvYonu`'su null'dur (KDV oranı formda tarih bazlı ön doldurulsa da).
- **AC-8.** SGK kaleminde tedarikçi, çalışan, stopaj ve ek ödeme alanları yoktur.
- **AC-9.** SGK kalemi makinaya ya da modele atanamaz; kovası her zaman ortaktır.
- **AC-10.** SGK kalemi taksitlendirilebilir ve taksitleri bugünkü taksit yollarıyla ödenir.
- **AC-11.** SGK kalemine çek ciro edilebilir ve kendi çekimiz yazılabilir.
- **AC-12.** SGK kaleminin ödemesi, başka bir kalemin ödemesiyle aynı pencereden yapılır; SGK'ya özel
  ödeme penceresi yoktur.
- **AC-13.** Tekrarlayan tanım SGK davranışında kurulabilir ve ayın kalemini üretir.
- **AC-14.** SGK tanımı ve ondan üretilen kalem sıfır tutarla kaydedilebilir; kalem "Tutar girilmedi"
  işaretini taşır ve o süzgeçte görünür.
- **AC-36.** **Elle açılan** SGK kalemi sıfır tutarla kaydedilemez (0071'in `tanimKalemi` kapısı
  gevşetilmemiştir).
- **AC-15.** "Çalışanların SGK toplamını kullan" tutarı canlı çalışanların toplamıyla doldurur ve kişi
  sayısını yazar; düğme gider yetkisi olmayan kullanıcıya görünmez.
- **AC-16.** Ödeme hedefinin adı "SGK'ya" (cümle içinde) ve "SGK" (başlıkta) olarak tek tablodan gelir.
- **AC-37.** SGK kaleminin hedef adı **"Tedarikçiye" DEĞİLDİR**: `hedefAdKaydi`'nın SGK dalı vardır ve
  `HEDEF_ADLARI.genel`'de artık `HEDEF.SGK` kaydı yoktur (kaynak taraması).

### Geri alma

- **AC-17.** Personel kaleminin toplamı resmi + elden + yol parası + ek ödemelerdir; SGK girmez.
- **AC-18.** Personel kaleminin ödenecek tutarından SGK düşülmez.
- **AC-19.** Personel kaleminde SGK ödeme hedefi ve SGK vadesi **form alanı** yoktur;
  `odemeSatirlariKur` artık `sgkVade` parametresi almaz.
- **AC-38.** Dönem Raporu'nun personel ızgarası **altı** sütundur (SGK sütunu yok) ve personel kalem
  satırının detayında SGK parçası geçmez; borç özetinin çalışan kırılımında SGK alanı yoktur.
- **AC-39.** `GiderForm`'un `calisanMaliyetsiz` uyarısı **üç alana** bakar: yalnız `sgkMaliyet`'i
  girilmiş bir çalışan seçildiğinde uyarı çıkar.
- **AC-20.** `sgkOdeme.js` ve `SgkToplamOdeme.jsx` kaynakta yoktur; `BorcOzeti`'nin `onSgkOde` prop'u
  ve dört çağrısındaki geçişi yoktur; borç özetinde "SGK'yı Öde" düğmesi hiçbir dalda çıkmaz (kaynak
  taraması artı dört dalın ekran testi).
- **AC-40.** `kanit-eslemesi.json`'da `SgkToplamOdeme.jsx` kaydı yoktur ve `tasarim-kaynak.test.js` ile
  `kanit-eslemesi.test.js` yeşildir; görüntü aracının 0070 SGK ekranları yeni modele göre çalışır
  (boş ya da çöken ekran yok).
- **AC-41.** `kilitAlanlari.js`'te `SgkToplamOdeme.jsx` kaydı yoktur ve `kilit-alanlari.test.js`
  yeşildir.
- **AC-21.** Çalışan ekstresi bugünkü sade hâlindedir (SGK dışlaması yok).
- **AC-22.** Ödeme hatırlatıcısında SGK kalemi normal kalem satırı olarak görünür; toplu SGK satırı,
  `sira` haritasındaki `sgk` anahtarı ve "SGK vadesi" etiketi yoktur.

### Borç ve rapor

- **AC-23.** Borç özetinde açık SGK kalemleri tek "SGK" taraf satırında toplanır; satır genel açık
  borca girer, tedarikçi kartına girmez.
- **AC-24.** Açık kalemler görünümünde SGK kaleminin tarafı "SGK"dır, "Tedarikçi seçilmemiş" değildir.
- **AC-25.** 0047 raporunun "GİDER · SGK" kutusu SGK **davranışlı kalemlerin** `kalemKurus`
  toplamından hesaplanır, ödenen ve açık ayrımı `odemeDurumu`'ndan gelir ve üç satır aynı kaynaktan
  türer; SGK'sı olmayan ayda kutu basılmaz.
- **AC-42.** Raporun vadesi geçmiş ve yaklaşan kalem tablosunda `tur === "sgk"` toplu satır dalı yoktur
  (hatırlatıcı artık o satırı üretmiyor).
- **AC-26.** Raporda SGK ödemesi normal kalem ödemesi olarak listelenir; "SGK ödemeleri" toplu satırı
  yoktur.
- **AC-27.** SGK kalemi tür kırılımında kendi türüyle, kova dağılımında ortak kovada görünür.

### Kurallar ve gizlilik

- **AC-28.** Avanstan mahsup SGK kalemine yapılamaz; kural **davranışa** bakar, neden tek metinden
  gelir ("kalemine" der) ve ödeme girişinde gösterilir. *(Revizyon 2, S6: motor bu metni döner; ödeme penceresinde
  mahsup kipi SGK kaleminde çizilmez.)*
- **AC-43.** Satırsız personel kaleminde mahsup sınırından SGK kalanının çıkarılması **yoktur**
  (`sgkKalanK` kaynakta geçmez); personel kaleminin mahsup sınırı 0070 öncesine döner.
- **AC-29.** Çalışan kartındaki kişi bazlı SGK tutarı hiçbir yazdırma, e-posta ve dışa aktarma
  çıktısında geçmez.
- **AC-30.** Çalışan listesinde SGK'nın personel kalemine girmediği ve kendi kalemiyle ödendiği
  yazılıdır.

### Veri

- **AC-31.** Göç kodu yazılmamıştır; **`sgkTutar`** sütunu şemada durur, doğrulama onu temizlemez ve
  hiçbir hesap okumaz (kaynak taraması). `sgkVade` diye bir sütun yoktur ve aranmaz; `yolParasi`
  okunmaya devam eder.
- **AC-44.** `gider-gizlilik.test.js`'in `YASAKLI` listesi gevşetilmemiştir (`sgkTutar`, `yolParasi`,
  `sgkMaliyet`, `yolParasiMaliyet` yasakta kalır) ve `<!--sgk-->` kutusu yalnız SGK kalemlerinin
  toplamını basar.
- **AC-32.** Hedefi `"sgk"` olan eski bir taksit satırı hiçbir hesaba girmez ve kalemin ilk kaydında
  temizlenir.
- **AC-33.** `db-roundtrip` ve `db-clean-install` SGK türü ve SGK kalemiyle yeşildir.

### Tek kapı

- **AC-34.** Atanabilirlik, sıfır tutar, KDV ve hedef adı kararları tek fonksiyonlardan gelir;
  bileşenlerde `"sgk"` davranış dalı yoktur (kaynak taraması).
- **AC-35.** Yeni izin, yeni sunucu kuralı ve yeni DB sütunu eklenmemiştir; C3'teki beş liste
  değişmemiştir.
- **AC-45.** `atanabilirMi`, `sifirTutarSerbestMi`, `kdvKurus` ve `hedefAdKaydi` dışında hiçbir dosyada
  `DAVRANIS.SGK` karşılaştırması yoktur; istisna R19'un açık kalemler dalı, R22'nin mahsup kuralı ve
  R23'ün rapor kaynağıdır (hepsi `src/lib` altında, kaynak taraması). *(Revizyon 2, S3: `DAVRANIS.SGK` karşılaştırması
  yalnız `gider.js`'teki kapı tanımlarında geçer (`atanabilirMi`, `sifirTutarSerbestMi`, `kdvliMi`,
  `tedarikciSecilirMi`, `sgkDavranisiMi`); istisna listesindeki yerler `sgkDavranisiMi`'yi çağırır.)*
- **AC-47.** *(S4)* Dönem Raporu'nun tedarikçi kırılımı SGK kalemini içermez; kalem listesinde SGK kaleminin tedarikçi
  hücresi "SGK" yazar.
- **AC-48.** *(S5)* Tanımdan üretilen personel kalemi `sgkTutar` taşımaz; SGK tanımından üretilen kalem KDV'sizdir.
- **AC-46.** "Çalışanların SGK toplamını kullan" düğmesi yalnız canlı ve dolu `sgkMaliyet` değerlerini
  toplar, çöpteki çalışanı saymaz; hiç değer yokken pasiftir ve nedeni yazılıdır.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Yeni dosyalar (Ö-21): motor
      `tests/sgk-turu-0074.test.js` (davranış kapıları, borç özeti satırı, açık kalemler tarafı,
      `sgkOzeti`, mahsup yasağı, personel toplamının geri dönüşü), bileşen
      `tests/ui/sgk-turu-0074.test.jsx` (tür yöneticisi, kalem formu, borç kutusu, tanım,
      "SGK toplamını kullan"), rapor `tests/gider-kasa-raporu-0074.test.js`.
- [ ] **SGK'ya atıf yapan bütün test dosyaları gözden geçirildi** (Ö-19): 0070'in üç SGK dosyası
      (`calisan-sgk-0070.test.js`, `ui/calisan-sgk-0070.test.jsx`, `gider-kasa-raporu-0070.test.js`)
      yeni modele göre yeniden yazıldı ya da silindi, **yol parası blokları değişmeden yeşil kaldı**;
      ayrıca `ek-odeme-hedefi.test.js`, `gider-kasa-raporu-0059.test.js`, `gider-gizlilik.test.js`,
      `ui/gider-ek-odeme.test.jsx`, `ui/gider-form.test.jsx`, `ui/gider-perdesi.test.jsx`,
      `ui/tahsilat-hesap.test.jsx`, `db-roundtrip.cjs` ve `db-clean-install.cjs` denetlendi.
- [ ] `sgkOzeti` değiştiği için 0059'un altın dosyaları (`tests/fixtures/0059-gider-rapor-once.json`,
      `tests/fixtures/0059-aylik-faaliyet.html`) denetlendi; faaliyet raporunun çıktısı değişmedi.
- [ ] Personel kaleminin toplamı ve ödenecek tutarının 0070 öncesine döndüğü çapraz testle gösterildi
      (AC-17, AC-18) ve mahsup sınırının da döndüğü (AC-43).
- [ ] Hedef adı zinciri testle sabitlendi: SGK kaleminin hedefi "SGK'ya" der, "Tedarikçiye" demez
      (AC-16, AC-37).
- [ ] `gider-gizlilik.test.js` güncellendi: `YASAKLI` listesi gevşetilmedi, kutu fikstürü SGK
      davranışlı kalemlere çevrildi (AC-29, AC-44).
- [ ] **Kanıt zinciri kapatıldı** (B-6): `kanit-eslemesi.json`'dan `SgkToplamOdeme.jsx` kaydı ve
      `giderler-0070-sgk-odeme` atıfları silindi, görüntü aracındaki üç 0070 SGK ekranı yeni modele
      göre kuruldu, `tasarim-kaynak`, `kanit-eslemesi` ve `kilit-alanlari` testleri yeşil
      (AC-40, AC-41).
- [ ] İşe başlamadan önce "0070 yayınlanmadı" dayanağı doğrulandı ve sonucu plana yazıldı (R25).
- [ ] Görsel kanıt: `docs/evidence/0074-taban-piksel-raporu.json` ve `0074-piksel-raporu.json`;
      ekranlar davranış seçicisi, SGK kalemi formu, borç kutusundaki SGK satırı (düğmesiz), tekrarlayan
      SGK tanımı, raporun SGK kutusu ve **değişen 0070 ekranları** (personel formu, personel ızgarası).
      `kanit-eslemesi.json` kayıtları `beklenen: "degisti"` artı onay satırı taşır; spec `done`'a
      taşınırken `ayni`ye çevrilir.
- [ ] `npm test` yeşil (çıktısıyla, Electron testleri dahil), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0070 bölümü güncellendi: SGK artık kilitli bir davranış, personel kaleminin
      hedefi değil; `sgkVade`'nin sütun olmadığı; yol parası bölümü aynen kalır.
- [ ] Kullanıcı rehberinde (`docs/rehber/gider-kasa-kurulum.html`) değişmesi gereken yerler plan §6'da
      yazılı (R35: rehber analistin dosyasıdır, güncellemeyi analist yapar; uygulayıcı dokunmaz).
- [ ] ~~Sürüm notunda deneme verisi uyarısı var: 0070 denemesinde girilmiş SGK tutarları sayılmaz, o
      aylar için SGK kalemi açılmalı.~~ **Geçersiz (R36):** 0070 hiçbir sürümde yayınlanmadı (R25); sürüm
      notu (plan §7) yalnız yeni modeli anlatır, uyarının muhatabı kullanıcı değildir.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
