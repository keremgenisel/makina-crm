# 0075 — Tevkifatlı Fatura Girişi (gider tarafı)

| | |
|---|---|
| **Durum** | Onaylandı, uygulanıyor (revizyon 2, 2026-10-07) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi formu ve motoru, tekrarlayan gider tanımı, ödeme hedefleri, borç özeti, açık kalemler, ödeme hatırlatıcısı, Finans KDV karşılaştırma kartı, 0047 raporu |
| **Bağımlı spec'ler** | 0001 (KDV, kova, borç özeti) · 0011 (kanıt eşlemesi) · 0021 (ödeme hedefleri, stopaj emsali) · 0047 (rapor kutusu) · 0053 (tek ödeme editörü, hedef blokları) · 0059 (altın rapor dosyaları) · 0060 (hedef adları) · 0062 (sayfalama) · 0071 (KDV dâhil giriş) · 0072 (dört nokta sütun deseni) · 0074 (davranış kapıları) |
| **Revizyon** | 1 · 2026-10-07 QA turu: B-1..B-7, Ö-8..Ö-21, K-22..K-26 işlendi (Takım Yöneticisi onayı) · 2 · 2026-10-07 uygulama planı onayı: S1–S13 işlendi (R10, R12, R18, R26, R28, R38–R44, AC-41, AC-44; DoD sürüm notu); plan `specs/0075-uygulama-plani.md` |

---

## Intent

Fabrikaya **çok nadir** tevkifatlı fatura geliyor (nakliye, temizlik, işgücü, danışmanlık, yapım işi
gibi kalemlerde). Tevkifatlı faturada mal veya hizmet bedelinin KDV'si ikiye bölünür: bir kısmını
satıcıya ödersiniz, kalanını **siz** vergi dairesine beyan edip ödersiniz (KDV2).

Bugün uygulamada bu kalem girilemiyor. Kullanıcı ya faturanın gerçek rakamlarını bozarak giriyor
(tutarı ödediği paraya eşitliyor, KDV yanlış kalıyor) ya da vergi dairesine ödediği kısmı **ikinci bir
gider kalemi** olarak açıyor ki bu çift sayımdır: matrah artı tam KDV zaten ilk kalemde.

Bunun uygulamada hazır bir emsali var: **kira stopajı.** Kira kalemi tek kalemdir, iki ödeme hedefi
taşır (kiraya veren ve vergi dairesi), vergi dairesine giden kısım ayrı gider sayılmaz. Tevkifat aynı
şekildir, yalnız kesilen şey gelir vergisi değil KDV'dir.

Başarı şu demek: faturanın üstündeki rakamlar olduğu gibi giriliyor, uygulama tedarikçiye ödenecek
tutarı ve vergi dairesine ödenecek tutarı kendisi ayırıyor, ikisi ayrı ayrı ödenebiliyor ve indirilecek
KDV bozulmuyor.

**Nadir olduğu için giriş alanları varsayılan olarak gizlidir:** kalem formunda bir onay kutusu
açılınca çıkar (uygulamanın "📍 Farklı adrese kargolat" ve "📦 Panoya gönder" deseni).

---

## Requirements

### A. Onay kutusu ve alanlar

- **R1.** Gider kalemi formunda **"Bu fatura tevkifatlı"** onay kutusu bulunur; varsayılan **kapalı**.
  Kapalıyken tevkifatla ilgili hiçbir alan, özet satırı ve ödeme hedefi görünmez ve bugünkü form
  birebir aynı kalır.
- **R2.** Kutu açılınca görünenler: **tevkifat oranı** seçici, **tevkifat taksit sayısı** ve **vade**
  (stopaj bölümünün emsali) ve bir **özet bloğu** (aşağıda R12).
- **R3.** Tevkifat oranı **kesir** olarak seçilir (pay / payda), hazır seçeneklerden: 2/10, 3/10, 4/10,
  5/10, 7/10, 9/10. Yüzde olarak girilmez, çünkü mevzuat ve faturanın kendisi kesir yazar; kullanıcı
  faturadan okuyup seçer. Liste **tek sabittir** (`TEVKIFAT_ORANLARI`, `src/lib/gider.js`) ve seçenek
  etiketi yalnız kesirdir ("5/10"); yanına **işlem cinsi yazılmaz** (K-23), çünkü aynı oran birkaç
  işlemde geçerlidir (X5 ile tutarlı) ve etikete işlem adı yazmak listeyi mevzuat rehberi gibi
  gösterir. Yeni oran eklemek tek satırdır ve payda veride durduğu için göç gerekmez (R32).
- **R4.** Seçici **açılır liste** olur (tasarım sözlüğünün "beş ve üstü seçenek → açılır liste" kuralı).

### B. Hesap

- **R5.** **Tek hesap yeri.** Tevkifat tutarı tek bir saf fonksiyondan gelir: **`tevkifatKurus(k, dav)`**
  (`stopajKurus` emsali, `gider.js:174`); form, liste, borç özeti, rapor ve ödeme hedefleri onu çağırır,
  kendi çarpımını yazmaz (kaynak taraması). Davranış kapısı **ayrı bir fonksiyondur** (R9), ikisi tek
  ada yüklenmez (Ö-8).
- **R6.** Zincir, kalemin **KDV hariç tutarı** (matrah) üzerinden:
  1. Toplam KDV = matrah × KDV oranı (bugünkü `kdvKurus`, değişmez)
  2. Tevkifat = toplam KDV × (pay / payda)
  3. Kalan KDV = toplam KDV − tevkifat
  4. Tedarikçiye ödenecek = matrah + kalan KDV
  5. Vergi dairesine ödenecek = tevkifat
- **R7.** Kuruş hesabı: tevkifat yuvarlanır, **artık kuruş kalan KDV'de kalır** (yani tedarikçiye
  gider). Böylece tedarikçiye ödenecek artı vergi dairesine ödenecek, matrah artı tam KDV'ye kuruşu
  kuruşuna eşittir.
- **R8.** Ödenecek tutar formülü bugünkü deseni izler, `gider.js:182`'de tek satır değişir:
  `odenecekKurus` artık `kalemKurus − stopaj − tevkifat + KDV`'dir. Stopaj ve tevkifat bağımsız hesaplanır (bir kalemde ikisi
  birden pratikte olmaz, R20). **Beş tüketici bu tek satırdan beslenir** (Ö-9): `hedefToplamKurus`'un ANA
  dalı (`:229`), `satirsizHedefler` (`:238`) ve `odemeHedefleri` üzerinden borç özeti, hatırlatıcı, açık
  kalemler, tedarikçi ekstresi ve 0041 yöntem kırılımı; `odemeDurumu`, `borcKapsamindaMi` ve 0061 ek
  kural istemez. **Çapraz test:** tevkifatlı kalemin iki hedefinin `toplamK` toplamı
  `kalemKurus + kdvKurus`'a eşittir; eşitlik testi olmadan atlanan bir dal ancak sahada görülür.
- **R9.** Tevkifat yalnız **normal davranışlı** kalemde olabilir. **İki ayrı kapı** vardır (Ö-8):
  **`tevkifatliMi(dav)`** davranış kapısıdır (`kdvliMi` / `tedarikciSecilirMi` / `sgkDavranisiMi`
  komşusu, `gider.js:65-67`) ve formun kutuyu çizip çizmemesini belirler; **`tevkifatKurus(k, dav)`**
  tutar kapısıdır ve sıfır dönerse hedef hiç doğmaz (R17). Üçüncü bir `kalemTevkifatliMi` yazılmaz, tek
  ölçüt `tevkifatKurus > 0`'dır (`stopajKurus > 0` emsali). Personel ve SGK'da KDV yok; kiralama işlemi
  KDV tevkifatına tabi değil.
- **R10.** Doğrulama **`giderKalemDogrula`**'da yapılır (Ö-15) ve hata alanları yazılıdır: oran
  seçilmemiş, pay sıfır ya da paydadan büyük → **`tevkifatPay`**; KDV oranı sıfırken tevkifat →
  **`kdvOrani`** (KDV'si olmayan faturada tevkifat olmaz). Kutu kapalıyken doğrulama üç alanı **kayıttan siler**
  (revizyon 2, S6: `dagitimAy` deseni; okuma tarafı boş alanı yazmadığı için null ile yokluk sunucu karşılaştırmasında
  ayrışırdı), mevcut temizleme satırlarının yanında. Kural tek saf fonksiyondadır, **`tevkifatDogrula`**; kalem
  doğrulaması ve tanım formu ikisi de onu çağırır (S5, R39). Alan adı
  yazılmazsa `HataMetni` yanlış alanın altında çıkar ve AC-11 ile AC-12 ölçülemez.
- **R11.** **KDV dâhil giriş (0071) ile kesişim:** "KDV dâhil" seçiliyken girilen rakam **matrah + tam
  KDV** sayılır. 0071'in iki fonksiyonu **hiç değişmez** (Ö-11): `kdvAyir(girilenTutar, kdvOran)`
  (`GiderForm.jsx:109`) ve `girilenHaric(girilenTutar, kdvYonu, kdvOran)` (`:111`, `:114`); tevkifat
  **ayrılan matrah** üzerinden hesaplanır (R6'nın zinciri). Formda kira için yazılı olan ipucunun
  (`GiderForm.jsx:124`) tevkifat eşi yazılır. Girilen rakam faturanın ödenecek genel toplamı
  **değildir** ve form bunu yazar (R13).

### C. Formda görünen

- **R12.** Kutu açıkken özet bloğu altı satırı gösterir: Matrah, Toplam KDV, Tevkifat, Kalan KDV,
  **Tedarikçiye ödenecek**, **Vergi dairesine ödenecek**. Blok **kira kutusunun birebir eşidir**
  (`GiderForm.jsx:353-357`; dört satır artı ödenecek satırı) ve **kira kutusunun yerinde, formun sağ sütununda** durur
  (revizyon 2, S2): kutu açıkken normal kalemin `normal-ozet` bloğunun yerini alır, çünkü o bloğun "Ödenecek" satırı
  tutar artı tam KDV yazar ve tevkifatlı kalemde yanlış olur; kutu kapalıyken `normal-ozet` aynen kalır (C3),
  rakamlar önizleme kaleminden türetilir ve `tl2` ile yazılır (Ö-20). Satır etiketleri sabit, tutarlar
  motordan: formda ikinci bir çarpım yoktur (R5).
- **R13.** Üç kalıcı bilgi notu, her biri tek sabitten:
  - **Çift sayım:** vergi dairesine ödenen tevkifat ayrı bir gider kalemi değildir; matrah ve tam KDV
    bu kalemdedir, tevkifat bu kalemin vergi dairesi bölümünden ödenir (kiranın
    `STOPAJ_AYRI_KALEM_NOTU`'sunun eşi).
  - **KDV dâhil:** "KDV dâhil" seçildiğinde girilen rakamın matrah artı **tam** KDV olduğu, faturanın
    ödenecek toplamı olmadığı.
  - **Alt sınır:** tevkifat sınırının (2026'da KDV dâhil 12.000 TL, fatura başına) satıcının
    sorumluluğunda olduğu ve uygulamanın bunu **denetlemediği**.
- **R14.** **Alt sınır denetlenmez.** Uygulama tutara bakıp "bu faturada tevkifat olmaz" demez.
  Gerekçeler: biz faturayı alan tarafız, kararı satıcı verir; sayı her yıl değişir (2024'te 6.900,
  2026'da 12.000) ve koda gömülürse her Ocak bakım gerektirir; bazı işlemlerde sınır uygulanmaz, yani
  tek kuralla doğru davranmak mümkün değil. Not yazılı kalır (R13).

### D. Ödeme hedefi

- **R15.** **Yeni ödeme hedefi `HEDEF.TEVKIFAT`** eklenir ve `HEDEF_SIRASI`'na **stopajın hemen önüne**
  girer (ana, elden, ek resmi, ek elden, tevkifat, stopaj; Ö-18). Sıra ödeme penceresindeki blok
  sırasını belirler (0053); ikisi aynı taraf satırında toplandığı ve birlikte olmadığı için görünen sıra
  tek hedeflidir. Yeni bileşen dalı yazılmaz, `OdemeGirisi` hedef listesini olduğu gibi çizer (C1).
  Stopaj hedefi
  yeniden kullanılmaz: kira stopajı gelir vergisi stopajıdır, tevkifat KDV'dir; aynı hedefe konsa
  "stopaj" sözcüğü iki anlama gelir ve hedef adı tevkifatlı kalemde yanlış görünür (0023'te "mesai"
  sözcüğüyle yaşanan tuzağın aynısı).
- **R16.** Hedef adı **tek tablodan** (0060 R24): yönelme "Vergi dairesine (KDV tevkifatı)", yalın
  "Vergi dairesi (tevkifat)". Yalın hâlin stopajdan ayrılması bilinçlidir; aynı kalemde ikisi birden
  olmasa da rozet ve başlık hangi vergi olduğunu söyler. Kayıt **`HEDEF_ADLARI.genel`**'e yazılır
  (B-7): tevkifat bir **davranış değildir**, bu yüzden yeni bir davranış anahtarı açılmaz ve
  `hedefAdKaydi`'na dal eklenmez, else dalı onu zaten alır (`odemeYontemi.js:146-149`).
  `tests/hedef-adlari-0060.test.js`'in **iki sıralı altın listesi** (`:23` yönelme, `:25` yalın) stopajın
  hemen arkasına yeni adlarla güncellenir; `AD` düz metin taraması (`:41`) değişmez, "Vergi dairesi"
  öneki yeni adı da yakalar.
- **R17.** Tevkifatı sıfır olan kalemde hedef **hiç doğmaz** (stopajın `stK > 0` kapısının emsali).
- **R18.** Hedef **taksitlenebilir**, vadesi kendi satırının vadesidir. **Ayrı vade sütunu açılmaz**
  (0070'in revizyon 2 dersi: `sgkVade` sütunu açılmadı, vade hedefin satırında durur). Üç şart yazılı:
  - **Satırlı doğma zorunlu (B-1):** tevkifatı sıfırdan büyük kalem **her zaman satırlı doğar**
    (`tevkifatIkiHedef` kapısı, `odemeSatirlariKur`'daki `kiraIkiHedef = dav === KIRA && stK > 0`
    emsali, `gider.js:429`). `satirsizHedefler`'e tevkifat dalı **eklenmez** (göç yok, R34; eski kalemde
    tevkifat olamaz). Aksi hâlde hedef `vade: null` ile doğar ve hatırlatıcı vadesiz hedefi hiç almadığı
    için R23 ile AC-25 ölçülemez (0070'de aynı hata bir kez bulundu).
  - **Hedef tutarı:** `hedefToplamKurus`'a (`gider.js:226`) `hedef === HEDEF.TEVKIFAT` dalı eklenir.
  - **Plan ve form (B-2):** `plan.tevkifatTaksitSayisi` ve `plan.tevkifatVade` eklenir, `vadeOf(h)`
    zincirine (`:438-439`) `HEDEF.TEVKIFAT` girer, `GiderForm` alanı `tv[0]?.vade` ile satırdan kurar
    (`:44`'ün `stopajVade: stp[0]?.vade` emsali) ve `:141`'in plan nesnesine artı `:143`'ün bağımlılık
    dizisine eklenir. Beş yerden biri atlanırsa vade sessizce kaybolur. **Revizyon 2 (S7):** yerler yedidir;
    `giderKalemDogrula`'nın plan nesnesi (`gider.js:613`), form alanlarının silindiği satır (`:614`) ve vade
    doğrulamaları (`:618-619` emsali) de değişir.
  - **Boş vade (revizyon 2, S3):** tevkifat vadesi boş bırakılırsa satır **ana vadeyi** alır (`vadeOf` zincirinde
    `plan.tevkifatVade || plan.ilkVade`); ikisi de boşsa null kalır ve ana hedef de null olduğu için iki hedef tutarlıdır
    (borç özeti ve açık kalemler yine gösterir, hatırlatıcı ana hedefle birlikte bekler). Tanımdan üretilen kalemin
    ana vadesi de boştur (R26).
- **R19.** Vergi dairesine **çek ciro edilmez ve kendi çekimiz yazılmaz**: engel bugün zaten var
  (`formOdemesi.js:232`, `h.hedef !== HEDEF.ANA`), yeni kod gerekmez. Eksik olan tek şey **mesajdır**
  (Ö-13): hedefe göre haritaya (`CIRO_YALNIZ_ANA_NEDENI`, `:16`) `[HEDEF.TEVKIFAT]` kaydı eklenir
  (stopaj cümlesinin KDV eşi); yoksa kullanıcı genel yedeği ("Bu bölüm çekle ödenemez.") görür ve
  nedenini öğrenmez.
- **R20.** Stopaj ve tevkifat aynı kalemde teknik olarak birlikte durabilir (motor ikisini bağımsız
  hesaplar) ama pratikte olmaz; ek bir engel, uyarı ya da tespit yazılmaz. **Gerekçe yazılı** (K-22):
  kirada `STOPAJ_KDV_NOTU` (`GiderAlanlari.jsx:210`) stopaj ve KDV birlikte girildiğinde koşullu uyarı
  basıyor, ama o uyarı iki farklı **vergi rejiminin** çelişmesini anlatıyor (kiraya veren şahıssa stopaj,
  şirketse KDV); stopaj artı tevkifat ise çelişki değil, yalnız nadir.
- **R36.** Kalemin **ödeme durumu** iki hedeften türer (Ö-10): tevkifatı ödenmemiş kalem `odemeDurumu`
  "kismen" döner ve dönem raporunun "ödenmeyen gider" kartında görünür; iki hedef de ödenince "odendi".
  Bu bugünkü kira stopajı davranışının aynısıdır, yeni kod istemez, yalnız testlenir.
- **R37.** Formun **ana vade etiketi** iki hedefli kalemde hedef adından kurulur (Ö-12):
  `GiderForm.jsx:228`'deki üç dallı etiket zinciri (taksitli, stopajlı kira, varsayılan) tevkifatlı
  kalem için bir koşul daha alır ve "Tedarikçiye son ödeme" yazar; metin tablodan gelir (0060 R30).
  İki vade alanı yan yana dururken
  ikisinin de "Son ödeme tarihi" demesi yanıltır; kira bu sorunu çözmüş.

### E. Tüketiciler

- **R21.** **Borç özeti:** tevkifat hedefinin kalanı, stopajla **aynı** sentetik "Vergi dairesi" taraf
  satırında toplanır. Taraf adı sabiti (`VERGI_DAIRESI`) değişmez, `satirlar` dizisine yeni tür
  eklenmez, kutu şekli aynı kalır. Dal yazılı (B-4): `borcOzeti`'ndeki eleme (`gider.js:1077`)
  `h.hedef === HEDEF.STOPAJ` yerine `STOPAJ || TEVKIFAT` olur. **`vergi.adet` hedef başına artar** ve bu
  bugünkü davranıştır, değişmez: aynı kalemde ikisi birden olursa (R20, pratikte olmaz) sayaç 2 artar;
  bilinçli kabul edilir.
- **R22.** **Açık kalemler:** tevkifat hedefinin tarafı "Vergi dairesi"dir ve dal açıkça yazılır
  (B-3): `acikKalemler.js:49`'daki `tarafTur` zincirinin ilk dalı `h.hedef === HEDEF.STOPAJ` yerine
  `STOPAJ || TEVKIFAT` olur (zincirin kalanı aynı: sgk, personel, tedarikçi, seçilmemiş). **Dal yazılmazsa tevkifat hedefi
  "Tedarikçi seçilmemiş"e değil tedarikçinin KENDİ satırına düşer** (kalem normal ve tedarikçisi
  seçili), yani vergi dairesine gidecek para tedarikçinin açık borcunu şişirir. Yaşlandırma ve kova
  dağılımı bugünkü kurallarla.
- **R23.** **Ödeme hatırlatıcısı:** tevkifat hedefi stopajla aynı dalda, kendi vadesiyle kendi
  satırında görünür. İki satır değişir (Ö-17): taraf `STOPAJ || TEVKIFAT` ile `VERGI_DAIRESI`
  (`odemeHatirlatma.js:102`), vade etiketi tevkifatta **"Tevkifat vadesi"** (`:106`'daki
  `h.taksitli ? "Taksit vadesi" : stopaj ? "Stopaj vadesi" : vadeEtiketi(k)` zincirine girer).
  `:107`'nin `personel: personel && !stopaj` koşulu tevkifatta zaten false (kalem normal), dokunulmaz.
  Biri atlanırsa taraf "Tedarikçi" ya da etiket "Son ödeme" görünür.
- **R24.** **Tedarikçi ekstresi değişmez:** ekstre yalnız ANA hedefin paylarını okuduğu için tevkifat
  oraya hiç girmez (çapraz test).
- **R25.** **0047 raporuna "GİDER · TEVKİFAT" kutusu** eklenir (kesilen, ödenen, ay sonunda açık);
  stopaj kutusunun birebir emsali, tevkifatsız ayda basılmaz. Üç parça yazılı (B-6):
  - **Motor:** `tevkifatOzeti(kalemler, turMap)` eklenir, `stopajOzeti`'nin birebir eşi
    (`gider.js:342-354`): aynı şekil (`kesilenK`, `odenenK = kesilenK − acikK`, `acikK`), açık tutar
    `odemeHedefleri`'nden tevkifat hedefinin `kalanK`'sı, kapsam `tevkifatKurus > 0` olan kalemler
    (Ö-16). 0047'nin dönem kilidi (ay sonu süzülmüş hareketler) aynen geçerli; üç satırın farklı
    kaynaklardan gelmesi o kilidi bozar.
  - **Rapor nesnesi:** `tevkifat: {kesilen, odenen, acik} | null` eklenir (`giderRaporu.js:154`'ün
    `stopaj` kaydının emsali).
  - **Kutu ve sıra:** kutu `gider` dizisinde (`:342`) **`stopajKutu`'dan hemen sonra** durur.
  **`hesaplaGiderRaporu`'nun dönüşüne `tevkifatToplam` EKLENMEZ** ve özet kutusuna "Kesilen tevkifat"
  satırı **girmez** (`:293`'ün "Kesilen stopaj" satırının eşi yazılmaz), böylece
  `tests/fixtures/0059-gider-rapor-once.json` altın dosyası değişmez ve 0059'un koruma değeri düşmez.
- **R26.** **Tekrarlayan gider tanımında** da tevkifat tanımlanabilir (aynı onay kutusu ve alanlar);
  tanımdan üretilen kalem bunları taşır. **Revizyon 2 (S4):** tanımda yalnız onay kutusu ve oran vardır; tevkifat
  taksit sayısı ve vadesi tanımda **yoktur** (tanımın ana vadesi ve stopaj taksiti de yok). Üretilen kalem tevkifat
  hedefiyle satırlı doğar, vadesi null'dır (R18 boş vade); kullanıcı kalemi açınca girer. Aynı tedarikçiden her ay gelen tevkifatlı nakliye faturası
  gerçek bir durumdur ve alanların tanıma taşınması `dagitimAy` deseniyle aynıdır. **Kopyalama yalnız
  normal davranış dalında** yapılır (Ö-14): `tekrarlayanUret`'in taban kalem nesnesine
  (`gider.js:812-818`) koşulsuz yazılmaz, `tevkifatliMi(dav)` kapısıyla normal dalda yazılır; başka
  davranışta tanımda kalmış değer taşınmaz. Emsal ve ters ders aynı yerde: tedarikçi
  `tedarikciSecilirMi(dav)` ile kopyalanıyor (`:816`), SGK bileşeni ise 0074 R34 ile bilinçli
  kopyalanmıyor. Taban nesneye koşulsuz yazılırsa kira ya da personel tanımından üretilen kaleme ölü
  alan girer ve R9 veride delinir.

### F. KDV ve değişmeyenler

- **R27.** **İndirilecek KDV değişmez.** Alıcı olarak KDV'nin **tamamını** indiririz; tevkifat kısmı
  KDV2 ile beyan edilip ayrıca ödenir. Dönem raporunun indirilecek KDV toplamı ve KDV
  karşılaştırmasının farkı, ödeneceği ve devredeni **aynen** kalır (çapraz test).
- **R28.** Finans'ın KDV Karşılaştırması kartına **bilgi satırı** eklenir: "Tevkifatla beyan edilecek
  KDV (KDV2)". **Yukarıdaki farka eklenmez** ve satırın yanında bu tutarın kalemin vergi dairesi
  bölümünden ödendiği yazılıdır; yoksa aynı para hem kalemde hem kartta borç gibi okunur. **Değer
  motordan gelir** (B-5, C1, R5): `kdvKarsilastir`'a (`gider.js:1111`) isteğe bağlı **üçüncü parametre**
  (dönemin tevkifat toplamı) eklenir ve dönüşe **`tevkifatKdv2`** alanı girer; **parametresiz çağrı
  birebir eski çıktıyı verir**. Finans kartı (`KdvKarsilastirmaKarti.jsx`) o alanı yazar, kart kendi
  çarpımını yapmaz. **Revizyon 2 (S9):** aynı kart Giderler'de de çizilir (`Giderler.jsx:124`) ve iki ekran üçüncü
  parametreyi aynı kaynaktan geçirir (`tevkifatOzeti` ile dönem kalemlerinin kesilen toplamı; `hesaplaGiderRaporu`
  değişmez), yani iki ekran aynı rakamı gösterir (0001 C10); **0047 raporu üçüncü parametreyi geçirmez** (kendi tevkifat kutusunu kullanır, R25),
  yani raporun KDV kutusu ve 0047 ile 0059'un altın çıktıları değişmez.
- **R29.** **Makina maliyeti değişmez:** kalemin tutarı (matrah) ve kovası aynı kalır, tevkifat yalnız
  ödemeyi ikiye böler (çapraz test).
- **R30.** Kalemin tutarı, kova dağılımı, dönem gider toplamı, 0072 dağıtımı ve 0062 sayfalaması
  etkilenmez.

### G. Veri

- **R31.** Üç yeni alan, **`giderler` ve `gider_tanimlari`** tablolarında: `tevkifatli` (INTEGER
  boolean, açık `toInt`/`toBool`; `teslimatFarkli` emsali), `tevkifatPay` ve `tevkifatPayda` (INTEGER).
  Kapalı ya da boş değer okumada blob'a **yazılmaz** (`bosOlmayan`; sunucu karşılaştırması, 0070 ve
  0072 deseni). **Dört nokta kuralı tablo başınadır** (Ö-19): tek küme `GIDER_TEVKIFAT_COLUMNS`,
  `applyColumnMigrations`'ta **iki** `ensureColumns` çağrısı (`db.cjs:1055-1059` emsali;
  `GIDER_SGK_YOL_COLUMNS` yalnız `giderler`'e, `GIDER_KDV_YONU_COLUMN` ve `GIDER_DAGITIM_COLUMN` iki
  tabloya uygulanıyor), `SCHEMA_SQL`'de iki tablonun satırına, **iki** INSERT listesine ve **iki** SELECT
  eşlemesine. Bir tablonun INSERT'i atlanırsa tanımdaki değer sessizce kaybolur.
- **R32.** Payda veride durur, bütün bugünkü oranlar /10 olsa bile: ileride /10 dışı bir oran gelirse
  veri taşıma gerekmez.
- **R33.** `gider_taksitleri.hedef` yeni `"tevkifat"` değerini taşır (roundtrip testli).
- **R34.** **Göç yok:** alanları olmayan eski kalem tevkifatsızdır ve bugünkü gibi davranır.
- **R35.** Sunucu, izin ve merge değişmez: tevkifatlı kalem sıradan bir gider kalemidir
  (`gider_add/edit/delete`), ödemesi `gider_odeme` ister, ödeme izni hedefe bakmaz.

### H. Uygulama planı kararları (revizyon 2)

- **R38 (S1).** Dal `feat/0075-tevkifat`, `feat/0074-sgk-turu` (`e660e20`) üstünde; 0074'ün davranış kapılarına dayanır.
- **R39 (S5).** `tevkifatDogrula(form, dav)` saf ve tektir. Tanımda KDV oranı boş ("tarihe göre") reddedilmez; yalnız
  açıkça sıfır yazılmış oran reddedilir. Üretimde çözülen oran sıfır çıkarsa `tevkifatKurus` sıfırdır ve hedef doğmaz
  (R17).
- **R40 (S7).** Ödeme almış tevkifat satırı plan değişiminde korunur (elden hedefinin deseni); kutu kapatılır ya da oran
  düşürülür ve tutar ödenenin altına inerse kayıt `planYenidenBol` hatasıyla reddedilir, hata `tevkifatli` alanının
  altında görünür; 0048'in kaybolan hedef göstergesi formda bunu zaten anlatır.
- **R41 (S8).** Kalem listesinde tevkifatlı satırın "Ödenecek" hücresi tedarikçiye ödenecek kısmı gösterir ve altında
  küçük **"tevkifat hariç"** ibaresi taşır. Listenin alt dipnotu **değişmez** (değişirse tevkifatsız bütün liste ekranları
  piksel değiştirir, C3).
- **R42 (S10).** `tests/fixtures/0059-gider-rapor-once.json` değişmez; altın karşılaştırmanın ayıklama satırı yeni
  `tevkifat` alanını dışarıda bırakır (0060, 0061, 0070 emsali).
- **R43 (S12).** Tekrarlayan tanım listesinin tutar hücresinde tevkifatlı tanım için **"Tevkifat 5/10"** satırı (KDV
  yön satırının emsali); yoksa tanımın tevkifatlı olduğu hiçbir yerde görünmez.
- **R44 (S13).** `TEVKIFAT_ORANLARI` `[{ pay, payda }]` biçimindedir, seçici değeri ve etiketi "pay/payda"dır.

---

## Constraints

- **C1.** **Davranış ve hesap kuralları tek kapıdan geçer:** `tevkifatliMi(dav)` (davranış),
  `tevkifatKurus(k, dav)` (tutar), `HEDEF_ADLARI.genel` (ad), `tevkifatOzeti` (rapor). Ekranlara
  `hedef === "tevkifat"` dalı dağıtılmaz; motorda zorunlu dallar R18, R21, R22, R23 ve R25'te adıyla
  yazılıdır.
- **C2.** **Çift sayım yasağı:** tevkifat tutarı yalnız kalemin KDV'sinin içinde sayılır; vergi
  dairesine ödenen kısım yeni bir gider değildir ve gider toplamına ikinci kez girmez.
- **C3.** Tevkifatsız kalemde motor çıktısı, form görünümü ve bütün raporlar **birebir bugünküdür**
  (regresyon eşiği sıfır).
- **C4.** Yeni izin, yeni sunucu kuralı ve yeni bölüm yoktur; sunucuda şu listeler **değişmez**
  (K-25): `BLOB_SECTIONS`, `SECTION_GROUP`, `BOLUM_SEKMELERI`, `EYLEM_IDLERI`, `ALAN_IZINLERI`,
  `KAYIT_DUZENLE_IZINLERI` ve `MERGE_KEYS`. Tevkifatlı kalem `giderler` bölümünde
  `gider_add/edit/delete`, ödemesi `hesapHareketleri` bölümünde `gider_odeme` ile geçer.
- **C5.** Kuruş tamsayısıyla hesaplanır; parçaların toplamı bütüne eşittir (R7).
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** **Satış tarafı: bizim kestiğimiz tevkifatlı fatura** — *neden:* Takım Yöneticisi kararı,
  bu spec gider tarafıdır. Fabrikanın bakım onarım hizmeti mevzuat listesinde var (7/10) ama **yalnız
  belirlenmiş alıcılara** (kamu kurumu, banka, BİT, KİT); müşteri profili özel firmalar olduğu için
  pratikte çıkmıyor. Açılırsa tahsil edilecek tutar, beyan edilen satış KDV'si, Finans, aylık rapor,
  alacak hesabı ve KDV karşılaştırması birlikte değişir; ayrı ve büyük bir iştir. (Uygulamada yurt içi
  fatura çıktısı yok, yalnız Yurt Dışı Fatura var, yani o iş çıktı işi değil rakam işidir.)
- **X2.** Alt sınırın (12.000 TL) denetlenmesi ya da ayarlanabilir eşik olarak tutulması — *neden:*
  R14.
- **X3.** Tam tevkifat (10/10) rejimi — *neden:* kısmi tevkifattan farklı bir rejim; ihtiyaç
  belirtilmedi, gerekirse oran listesine bir satır eklemek ayrı bir karardır.
- **X4.** KDV2 beyannamesinin kendisi, beyan dönemi takibi, e-beyanname bağlantısı — *neden:* bu spec
  bir gider kalemi işidir, beyan muhasebecinin işi.
- **X5.** Tevkifat oranının gider türünden ya da tedarikçiden otomatik türetilmesi — *neden:* oran
  işlemin cinsine bağlı, tedarikçiye değil; aynı tedarikçi farklı oranlı iki fatura kesebilir.
  Kullanıcı faturadan okuyup seçer.
- **X6.** Geçmişte yanlış girilmiş (tutarı ödenen paraya eşitlenmiş ya da ikinci kalem açılmış)
  kayıtların tespiti ve düzeltilmesi — *neden:* veri bunu ayırt etmeye yetmez; kullanıcı istediği
  kalemi düzenler.

---

## Context

- **Araştırılan mevzuat (2026).** Kısmi tevkifat oranları ve alıcı koşulu: makine, teçhizat, demirbaş
  ve taşıtlara ait tadil, bakım ve onarım **7/10** (yalnız belirlenmiş alıcılar); etüt, plan-proje,
  danışmanlık, denetim **9/10**; işgücü temini **9/10**; temizlik, çevre ve bahçe bakımı **9/10**;
  yemek servis ve organizasyon **5/10**; servis taşımacılığı **5/10**; karayolu ile yük taşıma
  **2/10**; yapım işleri **4/10** (belirlenmiş alıcılar, 5 milyon TL üstü projelerde KDV mükellefleri
  de); hurda, atık ve külçe metal **7/10** ya da **9/10**. Alt sınır **KDV dâhil 12.000 TL** ve
  **fatura başına**; işlemi parçalara bölmek mevzuata aykırı. Oran listesi (R3) bu kümeyi kapsar.
- **Fabrikanın göreceği kalemler.** Varsayılan gider türlerinden **Nakliye** doğrudan bu kapsamda
  (karayolu yük taşıma 2/10); temizlik, işgücü, danışmanlık ve yapım işi de normal davranışlı
  kalemler olarak giriliyor. Yani tevkifatın yalnız normal davranışta olması (R9) bütün gerçek
  durumları kapsıyor.
- **Hazır emsal: kira stopajı.** Kodda tek kalemin iki ödeme hedefi taşıması, vergi dairesinin
  sentetik taraf satırı, hedef başına taksit ve vade, hatırlatıcıda hedef başına satır, raporda
  "GİDER · STOPAJ" kutusu ve "ayrı kalem olarak girmeyin" notu hepsi **zaten var**. Bu spec'in
  maliyetinin düşük olmasının nedeni, yeni bir mekanizma değil var olanın ikinci bir örneğini açmak
  olmasıdır. Ödenecek tutar formülü de hazır: bugün `kalem − stopaj + KDV`, tevkifatla
  `kalem − stopaj − tevkifat + KDV`.
- **Neden stopaj hedefi yeniden kullanılmıyor.** İki tutar da vergi dairesine gider ve borç özetinde
  aynı satırda toplanır (R21), yani ekranda bir şey bölünmüyor. Ayrımın sebebi adlandırma: kira
  stopajı gelir vergisi, tevkifat KDV. Projede bu tuzağın bedeli bir kez ödendi: "mesai" sözcüğü
  servis işçilik süresi ile bordro fazla mesaisi arasında karıştı ve 0023 ikisini ayrı alanlara
  bölmek zorunda kaldı, üstüne bir kaynak taraması testi yazıldı.
- **En ince yer: KDV dâhil girişle kesişim.** Tevkifatlı faturada "KDV dâhil toplam" iki farklı rakam
  olabilir: matrah artı **tam** KDV (24.000) ya da faturanın ödenecek genel toplamı (22.000, matrah
  artı kalan KDV). Faturanın üstünde ikisi de yazılı olabilir. R11 girilen rakamı **tam KDV dâhil**
  sayar; alternatif (genel toplamı girdirmek) ayırma formülünü tevkifat oranına da bağlar ve 0071'in
  "tek ayırma yeri" kuralını bozar. R13'ün notu ve R12'nin özet bloğu bunu ekranda açık tutar.
- **İndirilecek KDV neden değişmiyor.** Alıcı tevkifata uğrayan KDV'nin tamamını KDV1'de indirir;
  tevkifat kısmını KDV2 ile beyan edip öder. Yani dönem raporunun indirilecek KDV'si ve Finans'ın
  karşılaştırma farkı bugünkü gibi doğrudur (R27). Değişen tek şey vergi dairesine giden **nakit**,
  ve o nakit zaten kalemin ödeme hedefinde izleniyor. Kartta yalnız bilgi satırı olmasının sebebi
  budur (R28): aynı tutar hem kalemde hem kartta borç olarak sayılırsa çift sayım gibi okunur.
- **Nadir olduğu için gizli.** Uygulamanın kurulu deseni: nadir kullanılan alan kümesi bir onay
  kutusunun arkasında durur ve kapalıyken ekran değişmez ("📍 Farklı adrese kargolat" / `teslimatFarkli`,
  "📦 Servis ve Kargo Panosuna gönder"). Gider formu bugün de uzun; tevkifat alanlarını her kalemde
  göstermek bütün kullanıcılara nadir bir durumun bedelini ödetirdi.
- **Örnek (test verisi olacak).** Matrah 20.000,00 TL, KDV %20, tevkifat 5/10:
  toplam KDV **4.000,00**, tevkifat **2.000,00**, kalan KDV **2.000,00**, tedarikçiye ödenecek
  **22.000,00**, vergi dairesine ödenecek **2.000,00**. 7/10 ile: tevkifat 2.800,00, kalan KDV
  1.200,00, tedarikçiye 21.200,00. (Hesabın bu spec'e gelen ilk taslağında toplam KDV 4.800 TL
  yazılıydı; o rakam matrahı 24.000 olan bir faturaya ait, testler bu bölümdeki sayılarla kurulmalı.)
- **Yuvarlama neden kalan KDV'de.** Tevkifat beyan edilen ve ödenen tutardır, yuvarlanması gereken
  odur; artığı ona eklemek beyanla faturayı ayırır. Artık kuruşu tedarikçi tarafında bırakmak
  parçaların toplamını bütüne eşit tutar (R7) ve uygulamanın bugünkü bölme alışkanlığıyla uyumludur.

---

## Acceptance Criteria

### Onay kutusu ve alanlar

- **AC-1.** Gider formunda "Bu fatura tevkifatlı" kutusu vardır ve varsayılan kapalıdır.
- **AC-2.** Kutu kapalıyken tevkifat alanları, özet bloğu ve ödeme hedefi hiç çizilmez; form bugünkü
  hâliyle aynıdır.
- **AC-3.** Kutu açılınca oran seçici, taksit sayısı, vade ve özet bloğu görünür.
- **AC-4.** Oran açılır listeden kesir olarak seçilir ve altı seçeneği (2/10, 3/10, 4/10, 5/10, 7/10,
  9/10) içerir.
- **AC-5.** Kutu kapatılınca oran, taksit ve vade alanları temizlenir ve kayda yazılmaz.

### Hesap

- **AC-6.** Matrah 20.000, KDV %20, tevkifat 5/10 olan kalemde: toplam KDV 4.000,00; tevkifat
  2.000,00; kalan KDV 2.000,00; tedarikçiye ödenecek 22.000,00; vergi dairesine 2.000,00.
- **AC-7.** Aynı kalem 7/10 ile: tevkifat 2.800,00; kalan KDV 1.200,00; tedarikçiye 21.200,00.
- **AC-8.** Yuvarlama gereken bir oranda tedarikçiye ödenecek artı vergi dairesine ödenecek, matrah
  artı tam KDV'ye kuruşu kuruşuna eşittir; artık kuruş kalan KDV'dedir.
- **AC-9.** Tevkifat tutarı tek fonksiyondan (`tevkifatKurus`) gelir; bileşenlerde ve raporda ikinci
  bir çarpım yoktur (kaynak taraması).
- **AC-39.** Tevkifatlı kalemin iki hedefinin `toplamK` toplamı `kalemKurus + kdvKurus`'a eşittir
  (çapraz test).
- **AC-40.** Tevkifatı ödenmemiş kalemin ödeme durumu "kısmen"dir ve dönem raporunun ödenmeyen gider
  kartında görünür; iki hedef de ödenince "ödendi" olur.
- **AC-10.** Tevkifat yalnız normal davranışta açılabilir; personel, SGK ve kira kaleminde kutu yoktur.
- **AC-11.** KDV oranı sıfırken tevkifatlı kayıt reddedilir ve nedeni yazılır.
- **AC-12.** Oran seçilmemiş, payı sıfır ya da paydadan büyük kayıt reddedilir.
- **AC-13.** "KDV dâhil" seçili tevkifatlı kalemde girilen rakam matrah artı tam KDV sayılır; saklanan
  tutar KDV hariç matrahtır.

### Formda görünen

- **AC-14.** Özet bloğu altı satırı (matrah, toplam KDV, tevkifat, kalan KDV, tedarikçiye, vergi
  dairesine) gösterir ve rakamları kaydedilecek değerlerle aynıdır.
- **AC-15.** Üç bilgi notu (çift sayım, KDV dâhil anlamı, alt sınır denetlenmiyor) ekranda yazılıdır ve
  her biri tek sabitten gelir.
- **AC-16.** Tutar alt sınırın (12.000 TL) altında olsa da kayıt engellenmez ve uyarı üretilmez.
- **AC-41.** Özet bloğu kira kutusunun yerinde (formun sağ sütunu) ve biçiminde çizilir; kutu açıkken `normal-ozet`
  çizilmez (revizyon 2, S2).
- **AC-42.** Tevkifatlı kalemde ana vade etiketi hedef adından kurulur ("Tedarikçiye son ödeme"),
  iki vade alanı aynı metni taşımaz.
- **AC-43.** Oran listesi tek sabitten gelir ve seçenek etiketinde işlem cinsi yazmaz.

### Ödeme hedefi

- **AC-17.** Tevkifatlı kalemde iki ödeme hedefi vardır; ikisi ayrı ayrı ve kısmen ödenebilir.
- **AC-18.** Tevkifatı sıfır olan kalemde tevkifat hedefi hiç doğmaz.
- **AC-19.** Hedef adı cümle içinde "Vergi dairesine (KDV tevkifatı)", başlıkta "Vergi dairesi
  (tevkifat)" olarak tek tablodan gelir; bileşenlerde düz metin yoktur (kaynak taraması).
- **AC-20.** Tevkifat hedefi taksitlendirilebilir; vadesi kendi satırının vadesidir ve yeni bir vade
  sütunu açılmamıştır.
- **AC-44.** Tevkifatı sıfırdan büyük kalem **satırlı** doğar; tevkifat hedefinin vadesi tevkifat vadesi, o boşsa
  ana vadedir (ikisi de boşsa null; revizyon 2, S3) ve `satirsizHedefler`'de tevkifat dalı yoktur (kaynak taraması).
- **AC-45.** Form alanı satırdan geri kurulur: kaydedilip yeniden açılan kalemde tevkifat taksit sayısı
  ve vadesi aynı görünür.
- **AC-46.** Hedef adı `HEDEF_ADLARI.genel`'dedir; `hedefAdKaydi`'na yeni dal eklenmemiştir (kaynak
  taraması) ve 0060'ın iki altın listesi yeni adlarla yeşildir.
- **AC-21.** Tevkifat hedefinde çek seçeneği yoktur ve nedeni yazılıdır.
- **AC-22.** Tevkifat hedefinin ödemesi `gider_odeme` ister ve sıradan ödeme penceresinden yapılır.

### Tüketiciler

- **AC-23.** Borç özetinde tevkifat kalanı, stopajla aynı "Vergi dairesi" taraf satırında toplanır;
  yeni satır türü eklenmemiştir.
- **AC-24.** Açık kalemler görünümünde tevkifat hedefinin tarafı "Vergi dairesi"dir ve **tedarikçinin
  kendi satırına girmez**: tedarikçisi seçili tevkifatlı kalemde tedarikçinin açık borcu yalnız ANA
  hedefin kalanıdır.
- **AC-25.** Ödeme hatırlatıcısında tevkifat hedefi kendi vadesiyle kendi satırında, tarafı "Vergi
  dairesi" ve vade etiketi "Tevkifat vadesi" olarak görünür.
- **AC-26.** Tedarikçi ekstresinde tevkifat tutarı hiç geçmez.
- **AC-27.** 0047 raporunda "GİDER · TEVKİFAT" kutusu kesilen, ödenen ve açık tutarı gösterir;
  tevkifatsız ayda basılmaz.
- **AC-28.** Tekrarlayan tanımda tevkifat tanımlanabilir ve üretilen kalem onu taşır.
- **AC-47.** Kira ya da personel tanımında kalmış tevkifat değeri üretilen kaleme **taşınmaz**.
- **AC-48.** 0047 raporunun rapor nesnesine `tevkifatToplam` eklenmemiştir ve özet kutusunda "Kesilen
  tevkifat" satırı yoktur; `tests/fixtures/0059-gider-rapor-once.json` altın dosyası değişmemiştir.

### Değişmeyenler

- **AC-29.** Dönem raporunun indirilecek KDV toplamı tevkifatlı kalemde **tam** KDV'dir.
- **AC-30.** KDV karşılaştırmasının farkı, ödeneceği ve devredeni tevkifattan etkilenmez.
- **AC-31.** Finans kartındaki "Tevkifatla beyan edilecek KDV (KDV2)" satırı bilgi satırıdır, farka
  eklenmez ve nereden ödendiği yazılıdır.
- **AC-49.** `kdvKarsilastir` üçüncü parametresiz çağrıldığında çıktısı birebir eskisidir; 0047 raporu
  o parametreyi geçirmez ve raporun KDV kutusu değişmez.
- **AC-50.** Tevkifat hedefinin ödemesi tedarikçi ekstresine hiç girmez ve ekstrenin son bakiyesi borç
  özetindeki tedarikçi satırıyla eşit kalır (çapraz test).
- **AC-32.** Makina maliyeti ve kova dağılımı tevkifattan etkilenmez (çapraz test).
- **AC-33.** Tevkifatsız kalemlerden oluşan bir veri kümesinde motor çıktısı bu işten önce ve sonra
  birebir aynıdır.

### Veri

- **AC-34.** Üç alan iki tabloda roundtrip edilir; kapalı ya da boş değerler blob'a yazılmaz.
- **AC-35.** Hedefi `"tevkifat"` olan taksit satırı roundtrip edilir.
- **AC-36.** Alanları olmayan eski kalem tevkifatsız davranır; göç kodu yazılmamıştır.
- **AC-37.** Temiz kurulum ve roundtrip testleri tevkifatlı kalemle yeşildir.
- **AC-38.** Yeni izin, sunucu kuralı ve bölüm eklenmemiştir.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Dosyalar (Ö-21): motor
      `tests/tevkifat-0075.test.js` (zincir, AC-6 ve AC-7 rakamları, yuvarlama eşitliği, hedef doğma
      kapısı, doğrulama alanları, `tevkifatOzeti`, çapraz testler), bileşen
      `tests/ui/tevkifat-0075.test.jsx` (kutu kapalı ve açık, özet bloğu, üç not, oran listesi, iki
      hedefli ödeme, tanım formu), rapor `tests/gider-kasa-raporu-0075.test.js`; ek bloklar
      `hedef-adlari-0060` (iki altın liste), `ui/finance-gider-kdv` (bilgi satırı), `db-roundtrip.cjs`
      ve `db-clean-install.cjs`.
- [ ] Context'teki örnek rakamlar (AC-6, AC-7) motor testinde birebir sabitlendi.
- [ ] Parçaların toplamının bütüne eşitliği yuvarlama gerektiren bir oranla testlendi (AC-8) ve iki
      hedefin toplamının `kalemKurus + kdvKurus`'a eşitliği çapraz testle (AC-39).
- [ ] Satırlı doğma ve vadenin null olmaması testle sabitlendi (AC-44, AC-45).
- [ ] Açık kalemlerde tevkifatın tedarikçi satırına girmediği testle gösterildi (AC-24) ve tedarikçi
      ekstresinde hiç geçmediği çapraz testle (AC-26, AC-50).
- [ ] İndirilecek KDV, KDV karşılaştırması ve makina maliyetinin değişmediği çapraz testlerle
      gösterildi (AC-29, AC-30, AC-32); `kdvKarsilastir`'ın parametresiz çıktısının birebir aynı kaldığı
      (AC-49).
- [ ] Tevkifatsız veride motor çıktısının değişmediği, `gider.test.js`, `kdv-dahil-0071.test.js` ve
      `makina-maliyeti.test.js` **dokunulmadan** yeşil kalarak gösterildi (AC-32, AC-33).
- [ ] 0059'un altın dosyalarının (`tests/fixtures/0059-gider-rapor-once.json`,
      `0059-aylik-faaliyet.html`) değişmediği doğrulandı (AC-48).
- [ ] Görsel kanıt: `docs/evidence/0075-taban-piksel-raporu.json` ve `0075-piksel-raporu.json`
      (K-24). **C3'ün ölçülebilir kanıtı** (triyaj 2026-10-07, plan §6, Takım Yöneticisi onayı): kutunun kendisi
      normal kalemin formuna eklendiği için (R1) normal davranışlı form ekranları kutu satırı kadar değişir; **kutu olmayan
      kira, personel ve SGK formları ile tevkifatsız listeler, raporlar ve KDV kartı 0 piksel** beklenir; değişen
      ekranlar kutu açık form ve özet bloğu, ödeme penceresinde iki hedef, borç özetindeki vergi dairesi
      satırı, raporun tevkifat kutusu, Finans KDV kartındaki bilgi satırı. `GiderForm`, `DonemRaporu`,
      `OdemeGirisi` ve `KdvKarsilastirmaKarti` tasarım sözlüğünü kullandığı için
      `docs/evidence/kanit-eslemesi.json` kayıtları değişen ekranlarda `beklenen: "degisti"` artı onay
      satırı taşır; spec `done`'a taşınırken `ayni`ye çevrilir.
- [ ] `npm test` yeşil (çıktısıyla, Electron testleri dahil), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: tevkifatın yalnız gider tarafında olduğu, stopajla farkı (KDV ile gelir
      vergisi), KDV dâhil girişte hangi rakamın girildiği, alt sınırın denetlenmediği, indirilecek
      KDV'nin değişmediği, tevkifatlı kalemin satırlı doğduğu.
- [ ] Sürüm notu (plan §7): tevkifatlı fatura artık onay kutusuyla girilebiliyor; **karışık sürüm uyarısı** (revizyon 2,
      S11): önce sunucu bilgisayarı, sonra bütün istemciler; güncelleme bitene kadar tevkifatlı kalem girilmez
      (güncellenmemiş sunucu üç sütunu düşürür, güncellenmemiş istemci "tevkifat" hedefli satırları tanımaz ve kalemi
      düzenlerken temizler).
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
