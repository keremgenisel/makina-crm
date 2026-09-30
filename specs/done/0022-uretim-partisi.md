# 0022 — Üretim Partisi ve Parti Bazlı Maliyet

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-27; commit `90d68d8`, dal `feat/0022-uretim-partisi`; plan `specs/done/0022-uygulama-plani.md` P1–P10) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Makina stoğu, makina maliyeti ve kârlılık, gider dönem raporu, Giderler sekmesi |
| **Bağımlı spec'ler** | 0001 (gider kaydı), 0002 (makina maliyeti) |
| **Revizyon** | R1 (2026-09-27): onay öncesi QA boşluk analizi, 0002'nin uygulanmış koduna ve metnine göre; 14 açık nokta karara bağlandı — ayın gideri bütün hak sahipleri arasında adet oranında bölünen tek kurala indirildi (R4, R5 onun özel hâli), parti adedinin güncel toplam olduğu ve açık partide payların değişebileceği yazıldı, kapsadığı ayların açık partide bugüne kadar olduğu tanımlandı (R3), parti bağının satışta damgalanacağı ve dönen stokta korunacağı eklendi (R2), partili makinanın ayın üretim sayısına girmediği kural oldu (R12), "kesinleşir" dili 0002 C10 ile çeliştiği için "geçici ibaresi kalkar" olarak düzeltildi (R7, R8, AC-10), geriye dönük gider uyarısının yeri dönem raporu oldu (R8, AC-11), silmenin okuma anında çözüldüğü ve kalıcı olduğu yazıldı (R11), parti tanımlarının yeri ile izinleri ve sunucu eşlemesi tanımlandı (C5), ad benzersizliği ve bitiş ayı sınırı eklendi (R1); AC-3/AC-4/AC-16 düzeltildi, AC-17…AC-23 eklendi. R2 (2026-09-27, plan onayı): ay içi kuruş artığının sahibi yazıldı (R13/P1); partili makinanın üretim tarihi ve yürürlükle ilişkisi tanımlandı (R12/P2); kapanmış partinin ayındaki değişikliğin kapanış anlık görüntüsüyle tespit edileceği ve yeri kararlaştırıldı (R15/P3, P4); adedi sıfır olan açık partinin hak sahibi sayılmadığı yazıldı (R14/P5); sunucu eşlemesi gider bölümleri listesini de kapsar (C5/P6); stok formundaki parti seçici yalnız gider yetkisiyle çizilir (C5/P7); AC-9'un metni R7'ye uyduruldu (P9). |

---

## Intent

Fabrika her ay düzenli üretim yapmıyor, **parti parti** üretiyor: bir ay 70 makinalık üretim
başlıyor, üç ay sürüyor, sonra bir süre üretim olmuyor. Uygulamanın maliyet hesabı ise aylık:
bir ayın ortak gideri o ay üretilen makina sayısına bölünüyor. Bu, gerçek üretim biçiminde yanlış
rakam üretiyor. Üretim başladığı ama hiçbir makinanın bitmediği aylarda ortak gider hiçbir
makinaya dağıtılmadan bekliyor; partinin bittiği ve 70 makinanın birden stoğa girdiği ayda ise o
tek ayın gideri 70'e bölünüyor ve makina başına maliyet olduğundan çok düşük çıkıyor.

Başarı şu demek: kullanıcı bir üretim partisi açıp makinaları ona bağlayabiliyor; partinin
sürdüğü ayların ortak giderleri o partinin makinalarına dağılıyor; ve "bu partinin makinası bana
kaça mal oldu" sorusu, üretimin kaç aya yayıldığından bağımsız olarak doğru cevabı veriyor.

---

## Requirements

- **R1.** Kullanıcı **üretim partisi** tanımlayabilir: parti adı veya numarası, başlangıç ayı, bitiş ayı
  (parti kapanınca girilir) ve isteğe bağlı açıklama. **Ad benzersizdir** (Türkçe büyük ve küçük harf
  duyarsız, tedarikçi deseni); aynı ad ikinci kez kaydedilmez, yoksa aynı üretim iki havuza bölünür.
  **Bitiş ayı başlangıç ayından önce girilemez**; denenirse işlem yapılmaz ve nedeni söylenir.
- **R2.** Stoğa eklenen bir makina bir partiye bağlanabilir. Bağlama stok kaydı üzerinden yapılır ve
  makina satıldıktan sonra da korunur. **Korunmanın yolu damgalamadır:** satışta stok satırı fiziken
  silindiği için (bugün yalnız kaynak stok kimliği ve üretim tarihi müşteri kaydına yazılıyor,
  `satisKaydi.uretimTarihiDamgala`) parti bağı da **aynı anda müşteri kaydına damgalanır**; yoksa bağ satış
  anında kaybolur ve satılmış makina aylık kurala düşer. **Silinen müşteriden stoğa dönen makina** partisini
  korur (üretim tarihiyle aynı taşıma yolu) ve dönüş ayında yeni üretim sayılmaz.
- **R3.** **Bir partinin ortak gider payı** şöyle bulunur: partinin kapsadığı ayların ortak giderleri
  toplanır ve partiye bağlı makinalara eşit bölünür. Kuruş artığı partinin ilk üretilen makinasına yazılır;
  "ilk" sırası 0002 R17c'nin deterministik kuralıdır (üretim tarihi, seri no, kayıt kimliği).
  **Kapsadığı aylar:** açık parti başlangıç ayından **içinde bulunulan aya** kadar, kapalı parti başlangıç
  ayından bitiş ayına kadar.
- **R4.** Bir ayın ortak gideri **bütün hak sahipleri arasında makina adedi oranında** bölünür: o ayda açık
  olan her parti **kendi makina adediyle**, o ay üretilmiş her **partisiz** makina **birer adetle** sayılır.
  Parti kendi payını kendi makinalarına eşit dağıtır, partisiz makina payını kendisi alır. Böylece ayın
  gideri tek yoldan bölünür ve dağıtılan toplam ayın ortak giderine eşit kalır (AC-15).
  **Adet, partinin güncel toplam adedidir** (o aydaki adedi değil), çünkü R3 partinin bütün havuzunu bütün
  makinalarına bölüyor. Sonucu bilerek kabul ediliyor: açık partiye yeni makina eklenince önceki ayların
  payları da değişir; bu, R7'nin "açık partide maliyet geçicidir" kuralının doğal sonucudur.
- **R5.** Bir ayda hiçbir parti açık değilse R4 kendiliğinden bugünkü kurala iner: o ayın gideri o ay
  üretilen partisiz makinalara eşit dağılır; hiç üretim de yoksa dağıtılmadan kalır ve dönem özetinde
  belirtilir. R5, R4'ün özel hâlidir; iki ayrı hesap yazılmaz.
- **R6.** **Partiye bağlı olmayan makina** bugünkü davranışını korur: ortak gider payı üretildiği ayın
  payıdır. İki yöntem aynı anda yaşayabilir.
- **R7.** Parti **açıkken** o partinin makinalarının maliyeti **geçici** sayılır: her ekranda geçici olduğu
  ve parti kapanınca ibarenin kalkacağı yazılır. **"Geçici" bir etikettir, rakamın dondurulmayacağı
  anlamına gelir:** 0002 C10 gereği maliyet türetilmiş bir rakamdır, kaydedilmez.
- **R8.** Parti kapandığında (bitiş ayı girildiğinde) **geçici ibaresi kalkar**; rakam dondurulmaz.
  Sonradan o aylara gider eklenirse pay yeniden hesaplanır (0002 C10) ve bu durum **dönem raporunda bir
  satır** olarak gösterilir ("kapanmış partinin ayına gider eklendi", 0001'in "düşen atamalar" deseni).
  Kayıt anında modal çıkarılmaz; her gider düzenlemesinde kapanmış partileri taramak orantısız olurdu.
- **R9.** Model havuzu payları (malzeme) ve makinaya doğrudan atanmış giderler **değişmez**; parti yalnız
  ortak gider payının tabanını değiştirir.
- **R10.** Kârlılık özeti ve makina maliyet detayı, makinanın hangi partiden geldiğini gösterir.
- **R11.** Parti silinirse makinaların ortak gider payı R6'daki aylık kurala döner; silme onayında kaç
  makinanın etkileneceği yazar. **Çözüm okuma anındadır, alan temizlenmez** (0002'nin makina bağı emsali):
  parti bulunamazsa makina aylık kurala düşer, böylece çöpten geri alma bağı geri getirir. Parti silme
  **kalıcıdır** (tedarikçi ve gider türü deseni), çöp kutusuna düşmez; onaydaki sayı bilgilendiricidir,
  silmeyi engellemez.
- **R12.** **Partili makina, üretildiği ayın üretim sayısına girmez**: payını partiden alır ve ayın
  bölmesinde parti bir hak sahibi olarak yer alır (R4). Bu kural, 0002 R1c'nin "üretim sayısı" tanımıyla
  bu spec'in tabanının çakışmasını önler; makinanın üretim tarihi partisiyle çelişirse **parti kazanır**,
  çünkü parti kullanıcının beyanıdır.
  **Yürürlük (R2, P2):** partili makinanın ortak payı üretim tarihine bakmaz. Partinin yürürlük ayından önceki
  ayları hiçbir hesaba girmez; partinin bütün ayları yürürlük öncesiyse makina "gider verisi girilmemiş" sayılır.
  Model havuzu payı (R9) yine üretim tarihine bakar.
- **R13.** (R2, P1) Ayın ortak gideri hak sahiplerine ağırlık oranında kuruşla, aşağı yuvarlanarak bölünür; ay
  içindeki kuruş artığı **en önce üretilmiş makinası olan hak sahibine** yazılır (0002 R17c sırası). Parti içindeki
  artık R3'teki gibi partinin ilk üretilen makinasına gider.
- **R14.** (R2, P5) Makinası olmayan açık parti o ayda hak sahibi sayılmaz: ayın gideri partisiz makinalara, o da
  yoksa "dağıtılmamış" olarak kalır. Makinalar partiye bağlandıkça R4'ün güncel adet kuralı önceki ayları yeniden
  böler. Parti listesinde bu durum için bir ipucu gösterilir.
- **R15.** (R2, P3, P4) R8'in tespiti **kapanış anlık görüntüsüyle** yapılır: parti kapatılırken her ayının o anki
  ortak gideri partiye yazılır (`kapanisOrtaklari`); bugünkü ay ortağı bu değerden farklıysa Giderler > Makina ve
  Model görünümünde, düşen atamalar kutusunun yanında "kapanmış partinin ayında ortak gider değişti" satırı çıkar
  (kapanıştaki ve bugünkü tutarla). Gider kalemlerinde oluşturulma zamanı olmadığı için "sonradan eklendi" başka yoldan
  ölçülemez; anlık görüntü ekleme, düzenleme ve silmenin hepsini yakalar. Anlık görüntü yalnız uyarının referansıdır,
  maliyet değildir (0002 C10 ile çelişmez); parti yeniden açılırsa silinir.

---

## Constraints

- **C1.** Hesap saf motorda yapılır ve 0002'nin mevcut hesabıyla **tek kaynak** olarak birleşir; ikinci bir
  maliyet motoru yazılmaz.
- **C2.** Kuruş tamsayısı, aşağı yuvarlama ve artık kuruş kuralı 0002 ile aynıdır.
- **C3.** Gelir tarafı, kâr, marj ve çarpan tanımları değişmez.
- **C4.** Yeni kalıcı alanlar beşli kurala uyar (şema, göç, yazma, okuma, birleştirme).
- **C5.** Yeni izin boyutu tanımlanmaz ve sınırlar burada çizilir: **parti tanımları Giderler sekmesinde**
  yaşar ve `gider_tanim` iznine bağlıdır (tedarikçi deseni, çünkü parti maliyet dağıtımının tabanıdır);
  **makinayı partiye bağlama stok kaydındadır** ve `stock_makina_add` / `stock_makina_edit` iznine bağlıdır.
  Yeni veri bölümü sunucudaki `BOLUM_SEKMELERI` eşlemesinde **gider ve stok** sekmelerini birlikte içerir;
  eksik kalırsa kısıtlı kullanıcıda ekran açılır ama kaydetme 403 verir (bu sınıf hata 0001 ve 0006'da
  yaşandı).
  (R2, P6) Bölüm sunucunun gider bölümleri listesine de girer (`GIDER_BOLUMLERI`: sekme listesi tanımsız kullanıcı
  yazamaz, 0001 K6). (R2, P7) Stok formundaki parti seçici **yalnız gider yetkisi açıkken** çizilir (gider sekmesi ve
  0008 yayın perdesi kalkık); müşteri formundaki üretim tarihi alanıyla aynı kural. Perde inikken mevcut bağ korunur,
  yalnız seçici gizlenir.
  **Güncelleme (2026-09-27, triyaj):** sunucu eşlemesinden `stock` çıkarıldı. Makinayı partiye bağlamak `stock`
  bölümündeki `partiId` alanıdır ve parti bölümüne dokunmaz; bu yüzden C5'in "stok sekmesinde kaydetme 403 verir"
  gerekçesi bu bölüm için geçerli değildi. Parti bölümü gider bölümü olduğu için gider sekmesi olmayan kullanıcıyı K6
  aynası zaten reddediyor; eşlemede `stock` bulunması yalnız yanlış izlenim veriyordu.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** **Kabul edilen sınır:** parti, üretim planlama aracı değildir. Kapasite, iş emri, aşama takibi ve
  termin yönetimi bu spec'in konusu değil; parti yalnız maliyet dağıtımının tabanıdır.

### KAPSAM DIŞI

- **X1.** Üretim planlama, iş emri, aşama ve termin takibi — *neden:* C7; bambaşka ve çok daha büyük bir
  modül.
- **X2.** Parti içinde makina bazında farklı ağırlık (büyük makina daha çok pay) — *neden:* 0002 X2'deki
  karar sürüyor, eşit pay; fark malzemeden geliyor.
- **X3.** Partinin ortak giderini aylara gün bazında bölmek — *neden:* ay en küçük birim; gün bazlı bölme
  gider verisinin doğruluğunu aşan bir hassasiyet iddiasıdır.
- **X4.** Kalıp üretim formuyla (Stok > Üretim) birleştirme — *neden:* o form kalıp üretimi içindir ve
  makina partisiyle aynı şey değildir; ikisini birleştirmek her ikisini de bozar.
- **X5.** Geçmiş makinaların toplu olarak partilere atanması — *neden:* kullanıcı isterse tek tek bağlar;
  toplu araç ayrı iştir.
- **X6.** Partinin kendi kâr veya ciro raporu — *neden:* kârlılık makina bazında hesaplanıyor; parti
  toplamı istenirse ayrı bir görünüm işidir.

---

## Context

- **Bugünkü taban ay.** 0002 R2 ortak gider payını "ayın ortak gideri bölü o ay üretilen makina sayısı"
  olarak tanımlıyor; R11 de bir ayda hiç üretim yoksa o ayın giderinin dağıtılmadan kaldığını söylüyor.
  Üretim tarihi stoğa giriş tarihinden geliyor (0002 R1b). Parti parti üretimde bu üç kural birlikte
  bozuk sonuç veriyor: üretim ayları boş, teslim ayı aşırı kalabalık.
- **Karar bilerek ertelenmişti.** 0002'nin kapsam dışı listesinde parti kavramı (X9) şu gerekçeyle
  duruyordu: uygulamada üretim partisi diye bir kayıt yok ve eklemek üretim planlamasını baştan kurmak
  demek. Bu spec o kararı geri açıyor ama dar tutuyor (C7): parti bir planlama aracı değil, maliyet
  dağıtımının tabanı.
- **Kalıp üretim formuyla karıştırılmamalı.** Stok sekmesindeki üretim formu (`uretimFormlari`) kalıp
  üretimi içindir: satırları kalıp adı, ölçüsü ve müşterisidir. Makina üretim partisi ayrı bir kavramdır;
  X4 bunu yazılı hale getirir.
- **Makina üretim tarihi zaten kayıtlı.** 0002 ile birlikte satışta stok satırının tarihi müşteri kaydına
  yazılıyor ve çözüm zinciri kurulu. Parti bağı bu zincirin yanına eklenir; üretim tarihi partiyle
  çelişirse parti kazanır, çünkü kullanıcının beyanıdır.
- **Satışta stok satırı siliniyor, bağ damgalanmalı (R2).** Bugün `satisKaydi.uretimTarihiDamgala`
  (`:29-33`) stok satırının tarihini müşteri kaydına yazıyor; `sourceStockId` dışında stok satırından hiçbir
  şey kalmıyor. Parti bağı aynı damgalamaya girmezse satışta kaybolur.
- **"Kesinleşme" 0002 ile çelişiyordu (R7, R8).** 0002 C10: "Kabul edilen sınır: maliyet türetilmiş bir
  rakamdır, kaydedilmez. Geçmiş bir ayın verisi değiştiğinde o ayın payları ve ondan türeyen kârlar yeniden
  hesaplanır." Bu yüzden parti kapanması rakamı dondurmaz, yalnız "geçici" ibaresini kaldırır.
- **Geçici maliyet fikri yeni değil.** 0002 zaten "gider verisi girilmemiş" durumunda rakam yerine açıklama
  gösteriyor. Açık partide de aynı dil kullanılır (R7): rakam gösterilir ama geçici olduğu yazılır.

Bilinen tuzaklar:

- **Kapanmamış parti.** Kullanıcı partiyi kapatmayı unutursa maliyet sonsuza kadar geçici kalır ve her yeni
  ay payı seyreltir. Dönem özetinde açık partiler görünür olmalı.
- **Örtüşen partiler.** İki parti aynı ayda açıksa payın nasıl bölüneceği tanımsız kalırsa iki ekran iki
  farklı rakam üretir (R4).
- **Geriye dönük gider.** Kapanmış bir partinin aylarına sonradan gider eklenmesi, kesinleşmiş sanılan
  maliyeti değiştirir (R8); sessiz değişmemeli.
- **İki taban aynı anda.** Partili ve partisiz makinalar aynı ayda üretilmişse o ayın ortak gideri iki
  yoldan birden bölünmemeli; R4 ve R5 birlikte okunmalı ve testle sabitlenmeli.

---

## Acceptance Criteria

- **AC-1.** Kullanıcı ad, başlangıç ayı ve açıklamayla bir üretim partisi oluşturabilir.
- **AC-2.** Stoğa eklenen bir makina bir partiye bağlanabilir ve bağ satış sonrasında da görünür.
- **AC-3.** Başlangıcı Ocak, bitişi Mart olan ve 70 makinası bulunan bir partide, **o üç ayda başka açık
  parti ve partisiz üretim yoksa**, üç ayın ortak giderleri toplanır ve 70'e bölünür.
- **AC-4.** Aynı partide kuruş artığı partinin **ilk üretilen** makinasına yazılır (sıra: üretim tarihi,
  seri no, kayıt kimliği; 0002 R17c) ve payların toplamı üç ayın ortak gider toplamına tam eşittir.
- **AC-5.** Bir ayda 30 makinalık ve 70 makinalık iki parti açıksa o ayın ortak gideri 30'a 70 oranında
  bölünür.
- **AC-6.** Hiç partisi olmayan bir ayda ortak gider, o ay üretilen partisiz makinalara eşit dağılır.
- **AC-7.** Hiç üretim ve hiç açık parti olmayan bir ayda ortak gider dağıtılmaz ve dönem özetinde
  "dağıtılmamış" olarak görünür.
- **AC-8.** Partisiz bir makinanın ortak gider payı, üretildiği ayın payıdır; parti kuralı onu etkilemez.
- **AC-9.** Açık partideki bir makinanın maliyeti gösterilirken geçici olduğu ve parti kapanınca bu
  ibarenin kalkacağı yazar (R2: R7 ile uyumlu metin; rakam dondurulmaz).
- **AC-10.** Parti kapatıldığında "geçici" ibaresi kalkar; rakam dondurulmaz ve sonraki veri değişikliği
  onu yine etkiler (0002 C10).
- **AC-11.** Kapanmış bir partinin aylarından birine sonradan gider eklendiğinde paylar yeniden hesaplanır
  ve dönem raporunda "kapanmış partinin ayına gider eklendi" satırı görünür; kayıt anında modal çıkmaz.
- **AC-12.** Model havuzu payları ve makinaya doğrudan atanmış giderler parti kuralından etkilenmez.
- **AC-13.** Makina maliyet detayı ve kârlılık listesi makinanın partisini gösterir.
- **AC-14.** Bir parti silindiğinde silme onayında etkilenecek makina sayısı yazar; silme sonrası o
  makinalar aylık kurala döner.
- **AC-15.** Aynı ayda hem partili hem partisiz makina üretilmişse o ayın ortak gideri iki kez sayılmaz;
  dağıtılan toplam, ayın ortak giderine eşittir.
- **AC-17.** Bir ayda 70 makinalık bir parti açıkken o ay 2 partisiz makina üretilmişse ayın ortak gideri
  72 adet üzerinden bölünür: 70 birim partiye, 2 birim o iki makinaya gider.
- **AC-18.** Açık bir partiye yeni makina eklendiğinde önceki ayların payları da yeniden hesaplanır ve
  toplam yine ayların ortak gider toplamına eşit kalır.
- **AC-19.** Partiye bağlı bir makina, üretildiği ayın üretim sayısına girmez; o ayın partisiz makinalarının
  payı bundan etkilenmez.
- **AC-20.** Partiye bağlı bir makina satıldığında parti bağı müşteri kaydında korunur ve maliyeti partiden
  gelmeye devam eder.
- **AC-21.** Silinen bir müşteriden stoğa dönen makina partisini korur ve dönüş ayında yeni üretim
  sayılmaz.
- **AC-22.** Var olan bir partiyle aynı adda (büyük ve küçük harf farkı dâhil) ikinci bir parti kaydedilmez;
  kullanıcıya nedeni söylenir.
- **AC-23.** Bitiş ayı başlangıç ayından önce girilen bir parti kaydedilmez; kullanıcıya nedeni söylenir.
- **AC-16.** Dönem özetindeki mevcut "üretilmiş ama satılmamış makinaların taşıdığı maliyet" satırı
  (0002 R7) **parti kırılımıyla genişletilir** ve açık partiler orada görünür; ikinci bir benzer satır
  açılmaz.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Parti dağıtımı 0002'nin maliyet motoruna **tek kaynak** olarak eklendi; ikinci motor yazılmadı (C1).
- [x] Ayın ortak giderinin iki yoldan birden dağıtılmadığı testle gösterildi (AC-15).
- [x] Yeni kalıcı alanlar beşli kuralla eklendi ve `db-roundtrip` ile `db-clean-install` testlerine girdi.
- [x] Birleştirme haritasında parti kimliği yeniden eşleniyor.
- [x] Parti bağının satışta müşteri kaydına damgalandığı ve dönen stok satırında korunduğu testle
      gösterildi (R2, AC-20, AC-21).
- [x] Sunucu bölüm-sekme eşlemesi parti bölümü için **gider ve stok** sekmelerini içeriyor; kısıtlı
      kullanıcının yazımının 403 almadığı uçtan uca testle gösterildi (C5).
- [x] Bir ayın gideri tek yoldan bölündü: parti ve partisiz hak sahiplerinin toplamı ayın ortak giderine
      eşit (AC-15, AC-17).
- [x] Görsel kanıt eklendi (`docs/evidence/0022-*.jpg`), açık parti ve kapanmış parti durumları dâhil.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` parti tabanıyla güncellendi; 0002'deki X9 kararının bu spec ile geri açıldığı yazıldı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 onay anında işlendi (P1–P10). Onaydan sonra bir kez değişti: C5'e triyaj notu (sunucu eşlemesinden `stock` çıktı). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: üç düşük önemli bulgu; görünüm değişmedi (taban 0 piksel). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Tarihsiz partili makinanın özetlerden kaybolması, başlamamış partinin "veri yok" sayılması, etkisiz sunucu eşlemesi. | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Parti yokken motor çıktısı 0002 ile aynı; mevcut testlerin hiçbiri kırılmadı. Bilinçli görünüm değişikliği: Tarih Aralığı kipinde sekme çubuğu iki satır (TY kabulü). Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**

- Bir kural bir tarihi "gereksiz" yaptığında (R12: partili makinanın payı üretim tarihine bakmaz), o tarihi şart koşan
  bütün tüketiciler de taranmalı; motor payı hesapladı ama özetler hâlâ tarih istedi (triyaj bulgu 1).
- "Boş aralık" iki farklı nedenden doğabilir (yürürlük öncesi ya da henüz başlamamış); ikisini tek duruma indirmek
  kullanıcıya yanlış açıklama gösterir (triyaj bulgu 2).
- Sunucu eşlemesi yazılırken bölümün gerçekten hangi ekrandan yazıldığı doğrulanmalı; spec'in gerekçesi (C5) bir
  varsayıma dayanıyordu ve eşleme okuyana yanlış bir izlenim verdi (triyaj bulgu 3).
- Yeni sekme eklemek dar kiplerde yerleşimi bozabilir; görüntü aracının tüm kipleri çekmesi bunu kanıt aşamasında
  yakaladı.
