# 0078 — Kasa ve Gider Kayıtları Çöp Kutusuna Alınır

| | |
|---|---|
| **Durum** | Onaylandı, uygulanıyor (revizyon 2, 2026-10-07) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | `hesapHareketleri`, `cekler`, `giderTanimlari`, `giderTurleri`, `standartGiderler`, `kasaHesaplari` bölümleri; App'in canlı dizi türetmesi; Çöp Kutusu; yedek; 30 günlük temizlik |
| **Bağımlı spec'ler** | **0068 (çöp kutusu deseni, tedarikçi ve üretim partisi emsali)** · 0077 (C maddesi bu bölümleri kendiliğinden kapsar) · 0024 (hareketler) · 0040/0049 (çekler) · 0001 (gider türü davranışı) · 0011 (kanıt eşlemesi) · 0026 (arama, R11) · 0051 ("hesabı silinmiş" nedeni, R13) · 0052 (`yedekKasa` ayrımı, R28) · 0056 (hesap taşıma, R26) · 0058 (kapsam dışı ve gizlilik, R14 ve R24) · 0065 (`partStockLog` kararı, X6) |
| **Revizyon** | 0068'in "kalan yedi bölüm kalıcı silinir" kararının altısını geri alır · 1 · 2026-10-07 QA turu (B-1…B-6, Ö-7…Ö-20, K-21…K-25 işlendi) · 2 · 2026-10-07 uygulama planı onayı: S1–S11 işlendi (R12, R13, R22, R25, R26, R29, R30, AC-34, yeni G bölümü R33–R40); plan `specs/0078-uygulama-plani.md` |

---

## Intent

Spec 0068 çöp kutusu denetimini yapmış, dokuz bölümden **tedarikçi** ile **üretim partisini** çöp
kutusuna almış, kalan yedisi için onay penceresine "bu kayıt çöp kutusuna gitmez, kalıcı silinir"
cümlesini koymuştu. O yedisinden **altısı** bu spec'le çöp kutusuna alınır.

En acıtanı **hesap hareketleri**: yanlışlıkla silinen bir ödemenin tutarı, tarihi, hesabı ve bağlı
olduğu taksit bilgisi geri gelmiyor; kullanıcı hepsini yeniden girmek zorunda. Çekler, tekrarlayan
tanımlar, gider türleri, standart giderler ve kasa hesapları da aynı sınıfta.

İkinci bir kazanç var: hareketler çöp kutusuna girince silme işlemi `deletedAt` yazan bir
**düzenleme** hâline gelir ve **spec 0077'nin C maddesi (silme birleştirmede korunur) onları
kendiliğinden kapsar.** 0077'nin X1'inde kapsam dışı bırakılan "kalıcı silinen bölümlerde silme
birleştirmede kayboluyor" sorunu böylece ikinci bir mekanizma yazılmadan kapanır.

Başarı şu demek: yanlışlıkla silinen bir ödeme Çöp Kutusu'ndan geri alınıyor, geri alınınca bakiye
ve kalemin ödeme durumu eski hâline dönüyor, ve bu silme çakışmada da kaybolmuyor.

---

## Requirements

### A. Kapsam

- **R1.** Şu **altı** bölüm çöp kutusuna alınır: **`hesapHareketleri`** (ödeme, virman, avans,
  mahsup), **`cekler`**, **`giderTanimlari`**, **`giderTurleri`**, **`standartGiderler`**,
  **`kasaHesaplari`**.
- **R2.** Silme artık `deletedAt` damgasıdır; kayıt diziden çıkarılmaz. Çöp Kutusu'ndan **Geri Al**
  ve **Kalıcı Sil** yapılır, 30 gün sonra kendiliğinden kalıcı silinir (0068'in bugünkü yolu).
- **R3.** **Kalıcılık metni kalkar, çünkü artık yanlış.** `KALICI_SILME_NOTU` bugün sekiz dosyada on
  yedi yerde ve bu altı bölümün onay pencerelerinin hepsinde basılıyor: `Kasa.jsx:739`,
  `settings/SettingsGiderTanimlari.jsx:299`, `settings/GiderTurManager.jsx:163` ve `:178`,
  `kasa/HesapSilPenceresi.jsx:35`, `cek/CekPortfoyu.jsx:368`, `gider/StandartGiderler.jsx:130`,
  `Settings.jsx:295`, artı Çöp Kutusu'nun bilgi satırı (`settings/SettingsTrash.jsx:313`,
  `data-testid="kalici-silme-notu"`, `KALICI_SILINEN_BOLUMLER` ile). Bu iş: (a) notu bu yerlerin
  hepsinden kaldırır, (b) `copKutusu.js`'ten **`KALICI_SILME_NOTU` ve `KALICI_SILINEN_BOLUMLER`
  sabitlerini siler**, (c) Çöp Kutusu'nun bilgi satırını kaldırır, (d) 0068'in `cop-kutusu-0068`
  ve `ui/cop-kutusu-0068` testlerindeki AC-16/AC-17 bloklarını **ters çevirir** (artık bu dosyalar
  kalıcılık metni içermez). "çöpe düşmez / çöp kutusuna düşmez" serbest metin yasağı **kalır**
  (0068 AC-39), çünkü o negatif bir taramadır ve sabite ihtiyacı yok.
  *Karar gerekçesi:* notu `kasaKapsamDisi` için bırakmak reddedildi; orada silme kullanıcının
  "kapsama al" düğmesidir (X1), yani cümle kullanıcıyı yanlış yönlendirir. Altı bölüm çöp kutusuna
  girdikten sonra kullanıcıya görünen hiçbir kalıcı silme penceresi kalmıyor.
- **R4.** Bugünkü silme engelleri **aynen korunur** ve çöp kutusu onları zayıflatmaz: hareketi olan
  kasa hesabı silinemez (kapatılır; deneme dönemi istisnası 0056'daki gibi), kullanımdaki gider türü
  yalnız aynı davranıştaki başka bir türe taşınarak silinebilir, kullanımdaki tedarikçi silinemez.
  **Tekrarlayan tanım için yeni bir engel açılmaz** (bugün serbestçe siliniyor ve bu korunur); çöp
  kutusu bunu zaten iyileştirir, çünkü tanım geri alınabildiği için kalemlerin `tanimId` bağı
  anlamını yeniden kazanır (R15).
- **R5.** Dört nokta kuralı, **beş tablo artı bir meta JSON**: `hesap_hareketleri`, `cekler`,
  `gider_tanimlari`, `standart_giderler`, `kasa_hesaplari` tablolarına `deletedAt TEXT` eklenir
  (şema, `TABLES_WITH_TRASH`, INSERT; okuma `...rest` ile gelir). `TABLES_WITH_TRASH` bugün on sekiz
  tablo (`db.cjs:551`), **yirmi üçe** çıkar. `giderTurleri` meta JSON'dur, alanı kayıtla birlikte
  taşınır ve listeye girmez. Bir tablonun INSERT'ü atlanırsa `deletedAt` sessizce kaybolur ve çöpe
  atılan kayıt bir sonraki yüklemede geri gelir.

### B. Canlı dizi tek yerde türetilir (işin en riskli yeri)

- **R6.** **App dört bölümün canlı hâlini türetir ve ekranlara onu verir**: `hesapHareketleri`,
  `giderTanimlari`, `standartGiderler`, `kasaHesaplari`. Ham dizi yalnız Ayarlar'a (yedek ve Çöp
  Kutusu) gider. Bu, 0068'in `liveTedarikciler` / `liveUretimPartileri` deseninin aynısıdır.
  **`giderTurleri` ve `cekler` ham gitmeye devam eder** (R11, R12); onlarda süzme yalnız gösterim
  noktasındadır. Değişiklik yüzeyi App'te ölçüldü: altı bölümün **otuz** prop geçişi var
  (`hesapHareketleri` 4, `cekler` 6, `giderTanimlari` 3, `giderTurleri` 6, `standartGiderler` 3,
  `kasaHesaplari` 8). Canlıya çevrilecek geçiş sayısı **on dört** (3 + 2 + 2 + 7; Ayarlar'ın dört geçişi ham kalır), ham kalan **on
  altı** (triyaj revizyonu, AC-37). Plan bu sayıyı kontrol listesi olarak taşır: atlanan tek geçiş o ekranda çöptekini gösterir.
- **R7.** **`hesapHareketleri`'nin null kapısı korunur.** `hesapHareketleri` başlangıçta **null**'dur
  (0024 triyajı) ve kapı `hareketBolumuVar = Array.isArray(hesapHareketleri)` (`App.jsx:811`);
  `hareketYazici` ile `hareketListesi` ondan türüyor (`:812-813`). `withoutDeleted(null)` **`[]`
  döndürür** (`utils.js:834`), yani ham diziye uygulanan naif bir canlı türetme kapıyı **daima
  doğru** yapar ve bölümü göndermeyen (güncellenmemiş) sunucuya bağlı istemci ödeme girişini açar,
  kullanıcı ödeme yazar, sunucu onu düşürür. Bu yüzden: canlı türetme **`hareketListesi`'nin üstüne**
  oturur (o zaten `[]`'e normalleştirilmiş) ve `hareketBolumuVar` **ham `hesapHareketleri`'ni
  okumaya devam eder**.
- **R8.** **Motorlar ve bileşenler değişmez:** canlı diziyi aldıkları için kendi içlerinde
  `deletedAt` süzmesi yazmazlar. Gerekçe: `hesapHareketleri`'ni okuyan on iki kitaplık dosyası var
  (ödeme durumu, bakiye, ekstre, yöntem kırılımı, çek planı, 0047 raporu, arama, birleştirme) ve her
  birine ayrı süzme yazmak, **atlanan tek bir süzmenin silinmiş bir ödemeyi bakiyede saydırması**
  demektir. Tek türetme noktası bu riski ortadan kaldırır. İstisnalar R11, R12 ve R13'te adıyla
  yazılıdır (ham okuyan davranış çözümü, çek zenginleştirmesi ve `hesapKullanimi`).
- **R9.** Setter kuralı korunur: bileşenler canlı dizi alır ama **tam diziye** yazar (işlevsel
  güncelleyici). Canlı diziyi geri yazmak çöptekileri sessizce kalıcı siler; bu hata uygulamada bir
  kez yaşandı (2026-09-28, müşteri detayındaki tahsilat yazımı).
- **R10.** Kaynak taraması: canlıya çevrilen **dört** bölümü okuyan ekranların hiçbiri ham diziyi
  almaz (Ayarlar dışında). Tarama `giderTurleri` ve `cekler`'i **hariç tutar** ve bu istisna
  taramanın yanında gerekçesiyle yazılır.

### C. Okuma anında çözüm: çöpteki kaydın anlamı kaybolmaz

- **R11.** **Gider türü (en tehlikelisi):** `davranisOf` türü bulamazsa **normal**'e düşüyor
  (`gider.js:59`), yani çöpteki bir kira türü kalemleri sessizce normal kaleme çevirir ve tutar,
  stopaj, kova, makina maliyeti hepsi değişir. Bu yüzden **davranış çözümü çöptekileri de görür**:
  `turHaritasi` ham listeden kurulur (`gider.js:58`) ve harita hiçbir yerde `withoutDeleted` ile
  süzülmez (kaynak taraması). Gizleme **yalnız şu beş yerdedir:** gider formunun tür seçicisi, tanım
  formunun tür seçicisi, `GiderTurManager` listesi, Dönem Raporu'nun tür süzgeci ve 0026 aramasının
  sonuç satırı. **Arama da ham haritadan okur:** `aramaGider.js` personel kalemini ve tanımını
  davranışa bakarak hiç göstermiyor (0026 R2); harita canlı listeden kurulursa çöpe atılmış personel
  türünün kalemleri aramada görünür hâle gelir, yani gizlilik duvarı sessizce delinir.
- **R12.** **Çek:** tahsilatı zenginleştiren `cekleriUygula` çöptekileri de görür (`cek.js:108`,
  `deletedAt` süzmesi yok ve eklenmez); yoksa çekli bir tahsilat çek kaydını kaybedip eski
  `tahsilEdildi` işaretine düşer ve **gelir tanıma değişir**. App'in bugünkü `bagliCekler` türetmesi
  (`ceklerBagli`) ham listeden türemeye devam eder; süzme **tüketicinin içindedir**. Tam liste R36'da (revizyon 2, S6). Tahsilatı duran çek zaten silinemez (0040 kuralı) ama bağsız çeklerde de kural tektir.
- **R13.** **Kasa hesabı:** çöpteki hesabın hareketleri yerinde kalır; bakiye yalnız canlı hesaplar
  için hesaplanır ve o hareketler "hesabı silinmiş" nedeniyle hesapsız listesinde görünür (0051'de
  bu neden zaten var). **`hesapKullanimi` canlı hareketleri sayar:** bugün hareketleri `deletedAt`
  denetimi olmadan filtreliyor (`kasa.js:192`; aynı fonksiyondaki `bagli` yardımcısında denetim var,
  hareketlerde yok), yani bütün hareketleri çöpte olan bir hesap **hiç silinemez** ve kullanıcı
  nedenini anlamaz. `hesapKullanimDetayi` ve `hesapTasimaPlani` aynı kümeyi **sayar** (canlı girdiyle; `kasa.js` değişmez). **Revizyon 2 (S8):**
  0056'nın taşıması gibi çöpteki hareketin hesabı da **taşınır**; geri alınan hareket doğru hesapta döner.
- **R14.** **0058'in kapsam dışı temizliği çöpteki kaydı silinmiş sayar.** Bugün sunucu tarafı
  `kapsamGirisiGecersizMi` kararı `!h` (hareket **bulunamadı**) ile veriyor (`serverAuth.cjs:384-385`)
  ve istemci tarafı `kasa.kapsamDisiTemizle` "kaydı kalıcı silinmiş" ölçütünü kullanıyor; soft-delete
  ile kayıt dizide kaldığı için giriş "geçerli" sayılır ve temizlik istisnası hiç çalışmaz. İki
  tarafta da ölçüt **`!h || h.deletedAt`** olur (istemcide `kapsamDisiTemizle`'ye canlı hareketler verilerek); aynı fonksiyonun "hesap mevcut" denetimi
  (`serverAuth.cjs:392`) de **canlı** hesaba bakar. Yoksa kapsam dışı girişi çöpteki bir harekete
  bağlı kalır ve kullanıcı onu listeden hiç temizleyemez.
- **R15.** **Tekrarlayan tanım:** çöpteki tanımdan üretilmiş kalemler yerinde kalır; sunucunun
  `tanimliUretimMi` denetimi tanımı **ham listede** arar, yoksa çöpe atılmış tanımın o ayki kalemi
  403 alır.
- **R16.** **Standart gider:** çöpe atma **sürüm** düzeyindedir, grup düzeyinde değil. `standartGiderAyi`
  ve `standartGruplar` **canlı** sürümler üzerinden işler (grup başına tek sürüm kuralı değişmedi);
  bir grubun bütün sürümleri çöpe atılırsa grup listede görünmez ve o ayın tutarı sıfır olur. Geri
  almada ad çakışması denetimi **grup kimliği** üzerindendir (R18).
- **R17.** Kural tek cümlede: **silmede alan temizlenmez, bağ okuma anında çözülür** (0001'den beri
  uygulamanın kuralı); çöp kutusu bu kuralı değiştirmez, yalnız "canlı mı" sorusunu ekler.

### D. Geri alma ve kalıcı silme

- **R18.** Geri almada aynı adda canlı bir kayıt varsa işlem yapılmaz ve nedeni yazılır (0068'in
  `geriAlmaAdCakismasi` kuralı; gider türü, kasa hesabı ve standart gider grubu için).
- **R19.** **Hareket geri alınınca bakiye ve kalemin ödeme durumu eski hâline döner**, çünkü ikisi de
  okuma anında türetiliyor; ek bir işlem gerekmez.
- **R20.** **Geri alma ebeveyni denetlemez.** Çeki ya da hesabı çöpte olan bir hareket geri
  alınabilir ve engellenmez: hareket geri döner, hesabı çöpteyse "hesabı silinmiş" nedeniyle hesapsız
  listesinde görünür (R13'ün zaten tanımladığı durum) ve kullanıcı isterse ebeveyni de geri alır.
  *Gerekçe:* kaskad damgası yoktur, bunlar iki ayrı silme kararıdır; zinciri zorunlu kılmak
  kullanıcıyı doğru sırayı bilmeye mecbur eder.
- **R21.** **Çeke bağlı hareket koruması, üç yolda birden.** `cekId` taşıyan **canlı** hareketi olan
  çek kalıcı silinemez; koruma **aynı yardımcıdan** okunur ve üç yerde uygulanır: Çöp Kutusu
  satırının **Kalıcı Sil** düğmesi, **çöpü boşalt** ve 30 günlük `purgeOldTrash`'in `koru`
  parametresi. 0040'ın `ciroluTahsilatIdleri` deseni birebir izlenir ve engellenen satırda neden
  yazılır. Üç yoldan biri açık kalırsa `cekId`'li hareketler kaydı olmayan çeke bağlı yetim kalır,
  ki 0040 bunu açıkça yasaklamış.
- **R22.** 30 günlük temizlik **bölüm başına açık çağrıdır** ve altı yeni çağrı yazılır: App yüklemede
  her bölüm için ayrı satır taşıyor (`App.jsx:1057-1077`, bugün **yirmi bir** çağrı, revizyon 2 ölçümü; yirmi yediye çıkar). `cekler` çağrısı
  `koru` ile R21'in korumasını uygular, diğer beşi korumasızdır. "Kapsar" demek yetmez: çağrı
  yazılmazsa o bölümün çöpü hiç temizlenmez.
- **R23.** Çöp Kutusu'nda altı yeni satır türü; gider ve kasa satırları bugünkü gibi **yetkiye göre**
  süzülür (`giderYetki` / `kasaVeriYetki`), yetkisiz kullanıcının "çöpü boşalt"ı onlara dokunmaz.
  İş iki koldadır: `SettingsTrash.jsx` bugün yirmi bir `items.push` satırı taşıyor, **altı yeni satır**
  eklenir; `emptyTrash` (`:214`, bölüm dalları `:245` ve `:285`) için de **altı yeni dal** yazılır.
  `kasaHesaplari` ile `cekler` kasa yetkisine, diğer dördü gider yetkisine bağlanır. `emptyTrash`
  dalı yazılmazsa "çöpü boşalt" bu altı bölümü hiç temizlemez ve çöp kutusu şişer.
- **R24.** Satır etiketleri kaydı tanıtır ve **sabit bir eşlemeden** okunur: hareket türü
  ("Ödeme", "Virman", "Avans", "Avanstan mahsup") artı tarih ve tutar; çek "banka · no"; tanım
  "tür · açıklama"; tür "ad"; standart gider "grup adı"; hesap "ad · tür". **Yazılmayanlar:** kalem
  adı, tedarikçi adı ve çalışan adı (0058 R21'in işlem geçmişi kuralı ve 0001 K21 gizliliği), çekte
  keşideci.

### E. İzin, sunucu, yedek

- **R25.** Sunucu **iki fonksiyon dışında değişmez** (revizyon 2, S1: R26 ve R14): çöpe atma
  `eylemDenetimi`'nde silme sayılır ve silme iznini ister (`serverAuth.cjs:708` `aktifMi` ve `:736`
  SİL dalı `deletedAt` damgasını zaten silme sayıyor, çöpteki kaydın purge'ü muaf); geri alma ile
  çöpteki kaydın kalıcı silinmesi bölüm düzeyinde geçer. `KASA_SEKMELI_KAYITLAR`'ın
  `kasaKaydiDegistiMi` denetimi soft-delete'i `stableStringify` karşılaştırmasıyla değişiklik olarak
  yakalar, yani R27 bedelsizdir.
- **R26.** **Değişen birinci fonksiyon `hesapTasimaYazimiMi`** (`serverAuth.cjs:419-425`): silinen hesabı
  **kimlik yokluğundan** buluyor (`eskiH.filter(h => !yeniIdler.has(String(h.id)))`), soft-delete ile
  kimlik dizide kaldığı için `silinen.size === 0` oluyor ve fonksiyon `false` dönüyor. Sonuç: 0056'nın
  deneme dönemi istisnası hiç çalışmaz ve hesap taşıyan kullanıcı (yalnız `kasa_hesap` ile Kasa
  sekmesi olan) **403 alır**. Ölçüt "kimlik yok **ya da** `deletedAt` bu yazımda yeni dolmuş" olur;
  `server-authz` ve `server-security.cjs`'in `tasiyici` kullanıcısı bu yolu ölçer.
- **R27.** Hareketin çöpe atılması, türüne göre bugünkü izni ister (`gider_odeme` / `virman` /
  `avans`), ve virman ile avans ayrıca **Kasa sekmesi** ister (`KASA_SEKMELI_KAYITLAR` aynen işler).
- **R28.** Yedek paketleri değişmez: altı bölüm bugünkü paketlerinde kalır, çöptekiler de yedeğe
  girer (yedek bütün nesneyi taşır). **0052'nin kısmi geri yükleme ayrımı `deletedAt`'e bakmaz:**
  `yedekKasa.js`'in `kasaHareketiMi` ve `kasaCekiMi` ölçütleri çöptekileri de korunacak kümede sayar,
  yani Kasa'sı olmayan kullanıcının geri yüklemesi çöpteki virman, avans ve verilen çeki de bugünkü
  hâliyle korur ve geri yükleme çöp durumunu olduğu gibi taşır. Küme `deletedAt` ile ikiye bölünürse
  o kullanıcının kaydı 0052'nin koruması yüzünden 403 alır.
- **R29.** Yeni izin ve yeni bölüm yoktur; sunucu değişikliği iki fonksiyonla sınırlıdır: `hesapTasimaYazimiMi` (R26) ve
  `kapsamGirisiGecersizMi` (R14).

### F. 0077 ile ilişki

- **R30.** 0077'nin C maddesi bu altı bölümü **kendiliğinden kapsamaz** (revizyon 2, S2): `merge.js`'in `KALICI_SILINEN`
  kümesi onları adıyla dışarıda tutuyor. Altısı kümeden çıkarılır (kalan: `kasaKapsamDisi`, `partStockLog`); böylece
  0077 R35a'nın "tabanda olup sunucuda olmayan kayıt eklenmez" kuralı da bu bölümlere uygulanır ve kalıcı silinmiş kayıt
  birleştirmede dirilmez. App'in birleştirmedeki silme yardımcısı `hesapHareketleri`'nin null başlangıcına dayanıklıdır.
- **R31.** 0077'nin **X1'i kapanır**: X1 yedi bölüm sayıyordu, bu spec **altısını** çöp kutusuna
  alıyor, geriye **bir** bölüm (`kasaKapsamDisi`, aşağıda X1) artı `partStockLog` kalıyor; ikisinde de
  "silme" veri kaybı değildir. Sayı belge denetiminde kullanılır (AC-32).
- **R32.** **0077 tamamlandı** (`kayitSirasi.js` 0077 R1 ile değişmiş durumda), bu yüzden C maddesi
  hazırdır ve bu spec onu yalnız **kapsam olarak** genişletir; taslaktaki "önce hangisi" tartışması
  düşer.

### G. Uygulama planı kararları (revizyon 2)

- **R33 (S3).** Hareket dizisini motordan toplu geri yazan çek işlemleri (`CekPortfoyu` karşılıksız, ciro iptali,
  verilen çeki kapatma) tam diziye uygulanan işlevsel güncelleyiciyle yazar; canlı dizinin geri yazılması çöpteki
  hareketleri kalıcı silerdi (R9'un sınıfı). AC-15 bu yolu ayrıca sınar.
- **R34 (S4).** **Çeke bağlı (`cekId`'li) hareket çöp kutusuna girmez.** Çek işlemlerinin (ciro iptali, karşılıksız,
  verilen çeki kapatma) sildiği hareketler bugünkü gibi kalıcı silinir, çünkü çek durumunun türevidir; kullanıcı çekli
  hareketi zaten elle silemiyor (0073). Çöp Kutusu'nda çeke bağlı hareket satırı oluşmaz.
- **R35 (S5).** Bağsız çekin (alınan ya da verilen) silinmesi, R21'in yardımcısıyla aynı şartı ister: o çeke bağlı canlı
  hareket yoktur. Verilen çekte önce "iptal" (hareketleri kapatır) gerekir. Bu yeni bir engeldir (TY onayı, C3'ün
  sıkılaştırma yönünde istisnası); bugün ödenmiş verilen çekin silinmesi bağsız hareket bırakıyordu.
- **R36 (S6).** Çek tüketicilerinin tam listesi. **Canlı** (çöpteki çek görünmez ve sayılmaz): portföy
  (`portfoySatirlari`), ciro adayları, 0047 raporunun çek özeti (`cekAyOzeti`), genel arama, Excel dışa aktarma,
  hesap kullanımı ve taşıma sayımı, yinelenen çek uyarısı, bakiyedeki verilen çek kalemi. **Ham:** `cekleriUygula`,
  `ceklerBagli`, `ciroluTahsilatIdleri`. R35 yüzünden çöpteki verilen çeke bağlı canlı hareket kalmaz; bakiye tutarlıdır.
- **R37 (S7).** App'in kendi hesapları da (`giderlerOdemeli`, `giderKasaRaporVerisi`, `makinaMaliyet`,
  `tahsilatHesapVarsayilan`, `kapsamDisiTemizle`, arama verisi) canlı dizileri okur. Ham adlar yalnız yükleme, kayıt,
  birleştirme ve Ayarlar'da kalır; kaynak taraması bunu izinli satır listesiyle sınar, AC-37'nin sayısı da kalır.
- **R38 (S9).** Standart gider ekranda **grup** olarak silinir: grubun bütün sürümleri aynı damgayı alır, Çöp Kutusu'nda
  grup başına tek satır görünür, geri alma o damgalı sürümleri döndürür. "Son sürümü geri al" bir geri alma eylemidir ve
  kalıcı kalır (X1 mantığı).
- **R39 (S8).** R13'ün son cümlesi değişti: çöpteki hareket de hesap taşımasında taşınır (0056 ile aynı).
- **R40 (S10).** Ölçülen sayılar: `KALICI_SILME_NOTU` sekiz dosyada on yedi yer, Çöp Kutusu'nda yirmi bir `items.push`,
  altı bölümün otuz prop geçişi, temizlik çağrısı yirmi bir (yirmi yediye çıkar).

---

## Constraints

- **C1.** **Tek türetme noktası:** canlıya çevrilen dört bölümün canlı dizisi App'te bir kez
  türetilir; motorlara ve bileşenlere süzme dağıtılmaz (R6, R8).
- **C2.** **Çöpteki kaydın anlamı kaybolmaz:** davranış, çek durumu ve tanım bağı ham listeden
  çözülür (C bölümü). Bir kaydı çöpe atmak, ona bağlı canlı kayıtların rakamını değiştirmez.
  Bu yüzden `giderTurleri` ile `cekler` **bilinçli olarak ham kalır** ve süzme tüketicinin
  içindedir (R11, R12); C1 ile C2 çatışırsa C2 kazanır, çünkü C1'in ihlali bir ekranda fazla satır,
  C2'nin ihlali sessiz rakam bozulmasıdır.
- **C3.** Bugünkü silme engelleri ve izinler korunur; çöp kutusu bir gevşetme değildir.
- **C4.** Yeni izin ve yeni bölüm yoktur, veri göçü yazılmaz: alanı olmayan eski kayıt canlıdır.
  `deletedAt` okumada **boşsa blob'a yazılmaz** (`...rest` zaten böyle davranır ve mevcut on sekiz
  tabloda aynı desen var); yeni sütunun davranışı onların aynısıdır. Gerekçe: 0001'de
  `stableStringify`'ın undefined ile null'u karıştırması yüzünden sekmesi kısıtlı kullanıcı her
  kayıtta 403 almıştı, aynı sınıf risk.
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** **`kasaKapsamDisi` (kapsam dışı girişleri) çöp kutusuna alınmaz** — *neden:* o bölümde
  "silme" zaten **geri alma eylemidir**: kullanıcı "kapsama al" deyince giriş siliniyor ve kayıt iş
  listesine dönüyor. Çöp kutusuna alınırsa her "kapsama al" çöp kutusuna bir satır bırakır, üstelik
  0058'in otomatik temizliği (kaydına hesap atanınca girişi düşürme) de çöp kutusunu doldurur. Veri
  kaybı yok, geri alma zaten var.
- **X2.** **Kullanıcı hesapları** (`users`) — *neden:* yönetimsel kayıt, veri değil; silinen
  kullanıcının işlemleri kayıt günlüklerinde adıyla duruyor. İstenirse ayrı iştir.
- **X3.** **İşlem geçmişi ve kullanıcı geçmişinin 12 aylık budaması** — *neden:* bilinçli saklama
  süresi.
- **X4.** **Çöp kutusunun 30 günlük otomatik temizliği** — *neden:* bugünkü kural, bu spec onu altı
  bölüme genişletir ama süreyi tartışmaz.
- **X5.** Alt tabloların (taksitler, ek ödemeler, model satırları, tahsisler, müşterinin kalıpları)
  kendi başına çöp kutusuna alınması — *neden:* ebeveyniyle birlikte gidip geliyorlar.
- **X6.** `partStock` ve `partStockLog` — *neden:* hareket zaten silinmiyor, geri alma **karşı
  hareket** yazıyor (0065); adet türetilmiş bir önbellek.

---

## Context

- **0068 ne karar vermişti.** Dokuz kalıcı silinen bölümden ikisini çöp kutusuna aldı (tedarikçi:
  ekstre erişilemez kalıyordu; üretim partisi: silinince bütün makinaların maliyeti sessizce
  değişiyordu), kalan yedi için `KALICI_SILME_NOTU` sabitini yazdı. O karar alınırken **ödeme
  hareketlerinin geri alınamamasının bedeli tartılmamış** görünüyor: bir ödemeyi yanlış silen
  kullanıcı tutarı, tarihi, hesabı ve taksit bağını yeniden kurmak zorunda ve hangi taksite bağlı
  olduğunu hatırlamayabilir.
- **En riskli iş süzme noktalarıdır, ve çözümü mimaride.** `hesapHareketleri` on iki kitaplık
  dosyasında okunuyor: `gider.js` (ödeme durumu), `kasa.js` (bakiye, ekstre, avans, hesapsız liste,
  taşıma), `odemeYontemi.js` (yöntem kırılımı, hedef payları), `formOdemesi.js` (ödeme girişi),
  `cek.js` (ciro ve kendi çek planı), `giderRaporu.js` (0047), `aramaGider.js` (0026), `merge.js`,
  `yedekKasa.js`, `makinaMaliyeti.js`, `stokHareketi.js`, `utils.js`. Her birine ayrı `deletedAt`
  süzmesi yazmak, **atlanan tek bir süzmenin silinmiş bir ödemeyi bakiyede saydırması** demek:
  sessiz ve tehlikeli. R5'in tek türetme noktası (0068'in `liveTedarikciler` deseni) bu riski
  tamamen kaldırır, çünkü motorların imzası bile değişmez.
- **Gider türü neden ayrı bir tehlike.** `davranisOf` şöyle yazılmış:
  `turMap?.get(String(kalem?.turId))?.davranis || DAVRANIS.NORMAL`. Tür haritası çöptekileri
  dışlarsa, çöpe atılmış bir **kira** türünün kalemleri sessizce **normal** kalem olur: stopaj
  kaybolur, ödenecek tutar değişir, kova "ortak"tan çıkar, makina maliyeti oynar. Hiçbir uyarı
  çıkmaz. R9 bu yüzden "davranış çözümü ham listeden" diyor; tür yalnız seçicilerde gizlenir. Aynı
  sınıf tehlike çekte de var (R10): çek kaydını kaybeden tahsilat eski `tahsilEdildi` işaretine
  düşer ve **gelir tanıma** değişir.
- **0077 ile kazanç.** 0077'nin C maddesi `deletedAt` alanında yerel değerin kazanmasıdır ve kapsamı
  "çöp kutusuna giren bölümler" diye genel yazıldı. Bu altı bölüm çöp kutusuna girince C onları
  kendiliğinden kapsar, yani **0077'nin X1'i (kalıcı silinenlerde silme birleştirmede kayboluyor)
  ikinci bir mekanizma yazılmadan kapanır.** 0065'in `bilinenLogIdleri` tabanını bütün bölümlere
  genelleme işine hiç girilmez. İki spec'i bu sırayla yapmanın asıl faydası budur.
- **Neden `kasaKapsamDisi` dışarıda.** O bölümde kaydın varlığı "bu satırı iş listesinde görme"
  demek; silinmesi kullanıcının "kapsama al" düğmesidir, yani zaten geri almanın kendisi. Çöp
  kutusuna alınırsa her geri alma çöp kutusuna bir satır bırakır ve 0058'in otomatik temizliği
  (kaydına hesap atanan girişin düşmesi) çöp kutusunu doldurur. Kaybolan veri yok.
- **`hesapHareketleri`'nin null'u bir işarettir, dizi değil.** 0024 triyajında bölümü göndermeyen
  sunucuya karşı bilinçli bir kapı kurulmuş: `useState(null)` ve `Array.isArray` ile "bölüm var mı"
  sorusu. `withoutDeleted` null'u `[]`'e çevirdiği için naif bir canlı türetme bu işareti yok eder ve
  istemci, sunucunun düşüreceği ödemeleri kabul eder. R7 bu yüzden türetmenin `hareketListesi`'nin
  üstüne oturmasını şart koşuyor. Bu, canlı dizi işinin en sessiz tuzağı.
- **0056'nın hesap taşıması kimlik yokluğuna bakıyor.** `hesapTasimaYazimiMi` silinen hesabı diziden
  **kaybolan kimlikle** buluyor; soft-delete bu varsayımı kırıyor ve deneme döneminin bütün hesap
  silme ve taşıma penceresi 403'e düşüyor. "Sunucu değişmez" iddiası bu yüzden tam doğru değil ve
  R26 tek fonksiyonu adıyla açıyor. Aynı sınıfı 0058'in kapsam dışı temizliğinde de görüyoruz (R14):
  orada da ölçüt "kayıt bulunamadı", yani soft-delete sessizce kuralın dışında kalıyor. **Ders:
  "kayıt yok" diye yazılmış her denetim, çöp kutusu kapsamı genişlerken yeniden okunmalı.**
- **Kalıcılık metni artık yanlış.** 0068 yedi bölüm için bir sabit ve bir "hangi bölümler" cümlesi
  yazmıştı; altısı çöp kutusuna girince kullanıcıya görünen hiçbir kalıcı silme penceresi kalmıyor.
  Metni `kasaKapsamDisi` için bırakmak da yanlış, çünkü orada silme kullanıcının "kapsama al"
  düğmesidir. R3 bu yüzden iki sabiti birden kaldırıyor ve 0068'in iki test bloğunu ters çeviriyor;
  "çöpe düşmez" serbest metin yasağı negatif tarama olduğu için yerinde kalıyor.
- **Setter tuzağı.** Bileşenler canlı dizi alıp **tam diziye** yazmak zorunda. Bu hata uygulamada bir
  kez yaşandı: müşteri detayında tahsilat eklemek bütün müşterilerin çöpteki tahsilatlarını siliyordu
  (2026-09-28 triyajı, `tests/ui/tahsilat-cop-korunur.test.jsx`). Altı yeni bölüm için aynı sınıf
  testin yazılması şart (R7).

---

## Acceptance Criteria

### Çöpe atma ve geri alma

- **AC-1.** Silinen bir **ödeme hareketi** Çöp Kutusu'nda görünür ve geri alınabilir.
- **AC-2.** Geri alınan ödeme hareketinden sonra hesap bakiyesi ve kalemin ödeme durumu eski hâline
  döner.
- **AC-3.** Virman, avans ve mahsup için aynı sonuç alınır.
- **AC-4.** Silinen **çek** çöp kutusunda görünür ve geri alınabilir.
- **AC-5.** Silinen **tekrarlayan tanım**, **gider türü**, **standart gider** ve **kasa hesabı** için
  aynı sonuç alınır.
- **AC-6.** Çöp Kutusu satır etiketleri kaydı tanıtır; avans ve mahsup satırında **çalışan adı
  geçmez**.
- **AC-7.** Geri almada aynı adda canlı kayıt varsa işlem yapılmaz ve nedeni yazılır.
- **AC-8.** 30 gün sonra altı bölümün çöptekileri kalıcı silinir.
- **AC-9.** Çöpteki kayıt kalıcı silinebilir; `cekId` taşıyan **canlı** hareketi olan çek kalıcı
  silinemez ve neden yazılır.

### Canlı dizi ve süzme

- **AC-10.** Çöpe atılmış bir ödeme hiçbir bakiyeye, ekstreye, yöntem kırılımına, ödeme durumuna,
  hatırlatıcıya ve 0047 raporuna girmez.
- **AC-11.** Çöpe atılmış bir çek portföyde, ciro adaylarında ve çek özetinde görünmez.
- **AC-12.** Çöpe atılmış tanım, tür, standart gider ve hesap kendi ekranlarında ve seçicilerinde
  görünmez.
- **AC-13.** Canlıya çevrilen dört bölümün dizisi App'te bir kez türetilir; motorların imzası
  değişmemiştir (kaynak taraması).
- **AC-14.** Ekranlar o dört bölümün ham dizisini almaz (Ayarlar dışında; kaynak taraması).
  Tarama `giderTurleri` ve `cekler`'i hariç tutar ve istisna gerekçesiyle yazılıdır.
- **AC-15.** Bir ekrandan yazım yapıldığında çöpteki kayıtlar korunur (setter tam diziye yazar); altı
  bölüm için ayrı ayrı testlendi.

### Okuma anında çözüm

- **AC-16.** Çöpe atılmış bir **kira** türüne bağlı kalemin davranışı **kira** kalır: stopaj hedefi,
  ödenecek tutar, kova ve makina maliyeti değişmez.
- **AC-17.** Çöpe atılmış bir çeke bağlı tahsilatın gelir tanıma davranışı değişmez.
- **AC-18.** Çöpe atılmış hesabın hareketleri yerinde kalır ve "hesabı silinmiş" nedeniyle hesapsız
  listesinde görünür.
- **AC-19.** Çöpe atılmış tanımdan üretilmiş kalemler yerinde kalır; aynı tanımdan yeni kalem üretimi
  sunucuda reddedilmez.
- **AC-20.** Çöpe atılmış standart gider sürümü ay hesabına girmez.

### Korunan engeller

- **AC-21.** Hareketi olan kasa hesabı yine silinemez (deneme dönemi istisnası aynen çalışır).
- **AC-22.** Kullanımdaki gider türü yine yalnız aynı davranıştaki türe taşınarak silinir.
- **AC-23.** Tahsilatı duran çek yine silinemez.

### İzin ve sunucu

- **AC-24.** Ödeme ve mahsup hareketinin çöpe atılması `gider_odeme`, virman `virman`, avans `avans`
  ister.
- **AC-25.** Virman ve avansın çöpe atılması ayrıca Kasa sekmesi ister.
- **AC-26.** Çöp Kutusu'ndaki gider ve kasa satırları yetkisiz kullanıcıya görünmez ve "çöpü boşalt"
  onlara dokunmaz.
- **AC-27.** Sunucuda yeni kural eklenmemiştir (`server-authz` ile ölçüldü).

### Veri ve 0077 ile kesişim

- **AC-28.** Beş tabloda `deletedAt` roundtrip edilir ve `giderTurleri`'nde kayıtla taşınır; alanı
  olmayan eski kayıt canlı sayılır.
- **AC-29.** Göç kodu yazılmamıştır.
- **AC-30.** 0077'nin C maddesi bu altı bölümü kapsar: çöpe atılmış bir ödeme birleştirmeden sonra
  **çöpte kalır** (geri gelmez).
- **AC-31.** Çöpten geri alınmış bir ödeme birleştirmeden sonra **geri alınmış kalır**.
- **AC-32.** 0077'nin X1 listesi güncellendi: yedi bölümden altısı kapandı, geriye `kasaKapsamDisi`
  kaldı (belge denetimi).
- **AC-33.** `kasaKapsamDisi` çöp kutusuna alınmamıştır ve "kapsama al" çöp kutusuna satır bırakmaz.
- **AC-34.** Yeni izin ve yeni bölüm eklenmemiştir; sunucu değişikliği iki fonksiyonla sınırlıdır (R29).

### Kalıcılık metni ve canlı dizi kapıları

- **AC-35.** `KALICI_SILME_NOTU` ve `KALICI_SILINEN_BOLUMLER` sabitleri kaldırıldı; sekiz dosyada
  kalıcılık metni kalmadı; Çöp Kutusu'nun bilgi satırı yok; 0068'in `cop-kutusu-0068` ve
  `ui/cop-kutusu-0068` testlerindeki AC-16/AC-17 blokları ters çevrildi; "çöpe düşmez" serbest metin
  yasağı (0068 AC-39) **yerinde**.
- **AC-36.** `hesapHareketleri` bölümünü göndermeyen sunucuya bağlanan istemcide ödeme girişi
  **kapalı** kalır ve `hareketBolumuYok` uyarısı görünür; `hareketBolumuVar` ham diziyi okur (kaynak
  taraması artı davranış testi).
- **AC-37.** App'te altı bölümün otuz prop geçişinden **on dördü** canlı diziyi, **on altısı** ham diziyi taşır
  (Ayarlar'ın dört geçişi: Çöp Kutusu ve yedek ham dizi ister; `giderTurleri` 6, `cekler` 6); sayı testle sabitlendi.
  *Triyaj revizyonu:* ilk metin "on sekiz / on iki" diyordu ve Ayarlar'ı canlı sayıyordu.

### Okuma anında çözüm (ek kriterler)

- **AC-38.** Çöpe atılmış bir **personel** türüne bağlı kalem genel aramada **çıkmaz** (0026 R2
  gizliliği korunur).
- **AC-39.** Çöpteki gider türü yalnız beş gösterim yerinde gizlidir (gider formu seçici, tanım formu
  seçici, `GiderTurManager`, Dönem Raporu tür süzgeci, arama sonucu); `turHaritasi` hiçbir yerde
  `withoutDeleted` ile kurulmaz (kaynak taraması).
- **AC-40.** Bütün hareketleri çöpte olan bir kasa hesabı **silinebilir** (`hesapKullanimi` canlı
  hareketleri sayar); çöpteki hareketin hesabı taşınmaz.
- **AC-41.** Kaydına hesap atanmış olup girişi çöpteki bir harekete bağlı olan kapsam dışı kaydı
  temizlenir ve bu yazım `kasa_hesap` izni olmayan kullanıcıda **403 almaz** (istemci ve sunucu
  ayrı ayrı).
- **AC-42.** Bir standart gider grubunun bütün sürümleri çöpe atılınca grup listede görünmez ve o
  ayın tutarı sıfır olur; geri alma ad çakışmasını grup kimliği üzerinden denetler.

### Geri alma, kalıcı silme ve Çöp Kutusu ekranı (ek kriterler)

- **AC-43.** Çeki ya da hesabı çöpte olan bir hareket geri alınabilir; işlem engellenmez ve hareket
  hesapsız listesinde "hesabı silinmiş" nedeniyle görünür.
- **AC-44.** Çek koruması üç yolda da uygulanır: Çöp Kutusu satırının Kalıcı Sil düğmesi, "çöpü
  boşalt" ve 30 günlük temizlik.
- **AC-45.** "Çöpü boşalt" altı bölümün çöptekilerini de temizler (yetki süzmesiyle), yani
  `emptyTrash`'in yeni dalları çalışır.
- **AC-46.** Hareket satırında kalem adı, tedarikçi adı ve çalışan adı **geçmez**; çek satırında
  keşideci **geçmez**.

### Sunucu, yedek ve veri (ek kriterler)

- **AC-47.** Deneme dönemi açıkken hesabın çöpe atılıp hareketlerinin taşındığı yazım, yalnız
  `kasa_hesap` ve Kasa sekmesi olan kullanıcıda **403 almaz** (`server-security.cjs` `tasiyici`).
- **AC-48.** Kasa sekmesi olmayan kullanıcının kısmi geri yüklemesi çöpteki virman, avans ve verilen
  çeki bugünkü hâliyle korur ve 403 almaz.
- **AC-49.** Boş `deletedAt` kayıt blob'una yazılmaz; sekmesi kısıtlı kullanıcı bu altı bölümü
  değiştirmeyen yazımlarda 403 almaz.
- **AC-50.** `TABLES_WITH_TRASH` yirmi üç tablodur; temiz kurulumda da altı bölüm çöp kutusuna
  girebilir (`db-clean-install`).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. **Test dosyaları:**
      `tests/cop-kutusu-0078.test.js` (saf: `purgeOldTrash` çağrıları, çek koruma yardımcısı,
      `hesapKullanimi`'nın canlı sayımı, `kapsamGirisiGecersizMi` ölçütü, prop sayısı taraması,
      kalıcılık metni taraması), `tests/ui/cop-kutusu-0078.test.jsx` (Çöp Kutusu'nda altı satır,
      geri alma, yetki süzmesi, `emptyTrash`), `tests/ui/cop-koruma-0078.test.jsx` (altı bölüm için
      setter tuzağı, `tahsilat-cop-korunur` deseni); ek bloklar `kasa.test.js` (bakiye, ekstre,
      hesap kullanımı), `gider.test.js` (çöpteki kira türünün davranışı), `cek.test.js` (çöpteki
      çekin tahsilatı), `ui/genel-arama-0026.test.jsx` (AC-38), `merge.test.js` (0077 kesişimi),
      `server-authz.test.js` ve `scripts/tests/server-security.cjs` (AC-47),
      `scripts/tests/db-roundtrip.cjs` ve `db-clean-install.cjs` (AC-28, AC-50); **güncellenen**
      `cop-kutusu-0068.test.js` ve `ui/cop-kutusu-0068.test.jsx` (AC-35).
- [ ] **Süzme bütünlüğü testi:** çöpe atılmış bir ödeme ile bütün tüketiciler (bakiye, ekstre, ödeme
      durumu, yöntem kırılımı, hatırlatıcı, 0047 raporu, arama) ayrı ayrı sınandı (AC-10).
- [ ] **Çöp koruma testi:** altı bölümün her biri için, bir ekrandan yazım yapıldığında çöptekilerin
      korunduğu gösterildi (AC-15); `tahsilat-cop-korunur` testinin deseni izlendi.
- [ ] Gider türü ve çek için "anlamı kaybolmaz" çapraz testleri yazıldı (AC-16, AC-17) ve bu ikisinin
      ham dizi istisnası kaynakta gerekçesiyle yazılı (AC-14, AC-39); ikisi de sessiz veri bozulması
      riski taşıyor.
- [ ] 0077 ile kesişim testlendi (AC-30, AC-31) ve 0077'nin X1 metni güncellendi (AC-32).
- [ ] Görsel kanıt: `0078-taban-piksel-raporu.json` ve `0078-piksel-raporu.json`. **Değişmesi
      beklenen ekranlar:** Çöp Kutusu (altı yeni satır türü, kalkan bilgi satırı) ve kalıcılık metni
      kalkan altı silme penceresi (`SettingsTrash`, `Kasa`, `GiderTurManager`, `StandartGiderler`,
      `CekPortfoyu`, `HesapSilPenceresi`, artı `Settings` tür paneli açıklaması); **diğer bütün
      ekranlarda 0 piksel.** Tasarım sözlüğünü kullanan bu dosyaların
      `docs/evidence/kanit-eslemesi.json` kayıtları `beklenen: "degisti"` artı onay satırı taşır
      (`tests/kanit-eslemesi.test.js` ve `tests/tasarim-kaynak.test.js` bunu denetliyor).
- [ ] `npm test` yeşil (çıktısıyla, Electron testleri dahil), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: altı bölüm çöp kutusunda, dört bölümün canlı dizisinin App'te
      türetildiği ve `giderTurleri` ile `cekler`'in bilinçli olarak ham kaldığı, `hesapHareketleri`
      null kapısının korunduğu, davranış ve çek çözümünün ham listeden yapıldığı,
      `KALICI_SILME_NOTU` ile `KALICI_SILINEN_BOLUMLER`'in **kaldırıldığı**, `hesapTasimaYazimiMi`'nin
      neden değiştiği, 0068'in kararının hangi kısmının geri alındığı.
- [ ] Sürüm notu: yanlışlıkla silinen ödeme, çek, tanım, tür, standart gider ve hesap artık Çöp
      Kutusu'ndan geri alınabiliyor.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
