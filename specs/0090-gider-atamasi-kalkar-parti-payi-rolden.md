# 0090 — Gider ataması ve aylara dağıtım kalkar, parti payı yeni hesaptan gelir

| | |
|---|---|
| **Durum** | Uygulanıyor (revizyon 3, plan onayı 2026-10-17) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Etkilenen alanlar** | Gider formu ve tekrarlayan tanım formu (iki kutu), tekrarlayan tanım listesinin atama sütunu, Dönem Raporu (kovalar kutusu ve kalem listesinin atama sütunu), yazdırılan Aylık Gider ve Kasa Raporu (bir kutu), üç silme onayının atama cümlesi, Makina Maliyeti › Üretim Partileri (iki sütun, adet sütununun kaynağı, kapanış anlık görüntüsü, değişim kutusu, başlık ve boş durum metni), Makina Maliyeti › Parti Hesabı (ayrım ibaresi), yeni maliyet motoru (aylık genel gider havuzu ve parti satırı), bugünkü maliyet motorunun son çağrısı, üretim partisinde bir kalıcı alan, silinen üç paylaşılan bileşen ve ölü prop'lar, tasarım sözlüğü (bir örnek satırı ve bir borç satırı), kullanıcı rehberinin atama ve dağıtım atıfları ile iki PDF, görsel kanıt aracının altı ekranı ve kanıt eşlemesi |
| **Onaylayan** | Takım Yöneticisi |
| **Bağımlı spec'ler** | 0089 (**önkoşul:** iki maliyet görünümü kalkmış olmalı; AC-6, AC-7 ve kıyas testi bu spec'le ters çevrilir), 0088 (rol tablosu ve yeni motor; bu spec onun havuz kavramını aya indirir), 0022 (üretim partileri; R3, R12, R13, R15 kuralları **aynen** korunur, girdisi değişir), 0001 (kova bölmesi ve AC-82; motorda kalır, ekrandan kalkar; AC-28'in atama cümlesi kalkar), 0020 · 0072 · 0076 (kovaya ve dağıtıma bağlı kurallar; motor kuralları değişmez, ekran kriterleri ters çevrilir), 0002 (bugünkü maliyet motorunun son tüketicisi burada kapanır), 0030 (tekrarlayan tanım tablosunun sütun sayısı ve Electron yerleşim ölçümü), 0047 · 0059 · 0061 (yazdırılan rapor, altın dosyaları ve kutu sınırı olarak kullanılan başlık), 0067 · 0080 · 0081 (Dönem Raporu kutu düzeni, kalem listesi, katlanan kutu sayısı), 0078 (çöpteki türün kalemi), 0009 (tasarım sözlüğü, görsel kanıt kaydı ve ekran metni taraması) |
| **Taban** | 0089 kapanışı (`26779e0`) |
| **Revizyon** | · 1 · 2026-10-17 ilk taslak<br>· 2 · 2026-10-17 QA boşluk analizi: yirmi üç bulgu işlendi (altısı bloklayıcı). Parti satırının tek kaynağı motora bağlandı (R37, R38), aylık havuzun tek yolu yazıldı (C15), atama ve dağıtım alanlarının yazma kuralı ile ölçüm noktası netleşti (R5/2), tanım listesinin atama sütunu kapsama girdi (R10/2), 0089'un altın dosyalarının korunması karara bağlandı (C16, C17), silinen bileşenler, üç silme onayı, tasarım sözlüğü, kanıt aracı ve rehber ölçülmüş tablolarla kapsama alındı<br>· 3 · 2026-10-17 plan onayı: K1–K9 işlendi (doğrulayıcının atama hataları, 0089 altınına ek ekran altını, bölme kuralının yeri, ay haritası kapsamı, durum önceliği, rehber commit dışı) |

---

## Intent

Müşteri makina maliyeti hesabını karmaşık buldu; 0087, 0088 ve 0089 ile hesap yeniden kuruldu ve
eski ekranlar kalktı. Ama günlük iş hâlâ eski modelin iki sorusunu soruyor: her gider kaydında
"bu gider hangi makinaya ya da hangi modellere yüklenecek" ve "kaç aya yayılacak". Bugün bu iki
sorunun cevabı yeni maliyet ekranındaki hiçbir rakamı değiştirmiyor; dahası biri sessizce yanlış
çalışıyor, çünkü "makina maliyetine girmesin" işaretlenmiş bir gider, türünün rolü "genel gidere
girer" ise yeni hesabın havuzuna tam tutarıyla giriyor. Kullanıcı aynı gideri iki yerde dışlamaya
çalışıyor, hangisinin geçtiğini hiçbir ekran söylemiyor.

Takım Yöneticisi kararı (2026-10-17): iki kutu da kalkar, Giderler'deki Makina Maliyeti Kovaları
kutusu da kalkar, ve bu üçünün geriye kalan tek gerçek çıktısı olan üretim partisi payı yeni
hesaptan yeniden kurulur.

Bu iş bittiğinde gider kaydetmek iki soru azalmış olacak, uygulamada tek bir maliyet modeli
kalacak, üretim partisinin makina başı payı korunacak ve o pay artık ürün ağacından gelen tedarik
faturalarını ikinci kez saymayacak, çünkü havuzun kapısı tür rolü olacak.

---

## Requirements

### Giriş kapıları kapanır

- **R1.** Gider formunda makina maliyet ataması bölümü hiç çizilmez; hiçbir davranışta (normal, kira, personel, SGK) görünmez.
- **R2.** Gider formunda aylara dağıtım alanı hiç çizilmez.
- **R3.** Tekrarlayan gider tanımı formunda da ikisi çizilmez.
- **R4.** Eski kayıtların atama ve dağıtım verisi korunur: atama ya da dağıtım taşıyan bir kalem düzenlenip kaydedildiğinde bu veri birebir geri yazılır, sessizce silinmez.
- **R5.** Yeni kaydedilen kalem ve yeni tanım bu alanları hiç taşımaz; alan boş değerle de yazılmaz.
- **R5/2.** Kural tek yerdedir ve "taşıyorsa birebir geri yaz, taşımıyorsa anahtarı hiç yazma" biçimindedir: kalemde `gider.giderKalemDogrula`, tanımda tanım formunun kayıt kurucusu. Bugün doğrulayıcı atama türünü boş dize, makina alanlarını null ve model satırlarını boş dizi olarak **her zaman** yazıyor (`gider.js:785`, `:788`); bu yazım kalkar. Ölçüm noktası **kaydedilen gövdedir** (0088'in gövde fikstürü deseni), yeniden yüklenmiş kayıt değil: veritabanı okuması bu işte değişmez ve her kaleme bugünkü gibi boş atama alanlarını koymaya devam eder (`db.cjs:1527-1528`, tanımda `:1531-1532`; C7 ve X4 gereği).
- **R5/3.** (revizyon 3, K1) Atama ya da dağıtım taşıyan kalemde doğrulayıcı **hata ve uyarı üretmez** (kullanıcının düzeltecek alanı yok): yalnız sayı biçimini çözer (formdaki metin → sayı; kayıtlı değer için birebir aynı) ve bugünkü iki tutarlılık kuralını korur: atanamayan davranışta (kira, SGK) atama düşer, makina ya da "dağıtılmasın" atamasında dağıtım düşer. "Taşıyor" = atama türü boş değil ya da dağıtım ayı birden büyük. Bugünkü hata ve uyarıları sınayan motor kriterleri ters çevrilir (0001 K25/K38, 0020, 0072 R5/R17/R19, 0076 R15/2).
- **R6.** Tanımdan kalem üretimi tanımda duran atama ve dağıtım verisini bugünkü gibi kopyalamaya devam eder; davranış değişmez, yalnız yeni tanımda bu veri doğmaz.

### Görünen çıktılar kalkar

- **R7.** Dönem Raporu'nda Makina Maliyeti Kovaları kutusu yok.
- **R8.** Aynı kutunun gövdesindeki "bağı kopmuş atama" uyarı satırı (0089 R12) da yok; başka bir ekrana taşınmaz.
- **R9.** Dönem Raporu'nun katlanan yan kutusu dörde iner: Gider Türü Kırılımı, KDV Karşılaştırması, Tedarikçi Kırılımı, Ödeme Yöntemi Kırılımı. Dördü kapalı başlar, davranışları değişmez.
- **R10.** Gider Kalemleri listesinde atama sütunu yok; sütun sayısı sekize iner. Dağıtım rozeti de yok. Tablonun boş durum, alt toplam ve dipnot satırlarının sütun genişlikleri de sekize uyar (bugün dokuz, dört ve üç; `DonemRaporu.jsx:452`, `:463`, `:466`, `:469`).
- **R10/2.** Ayarlar › Tekrarlayan Giderler listesinde de atama sütunu yok; başlık sayısı yediye iner ve atama hücresini çizen yardımcı kalkar (`SettingsGiderTanimlari.jsx:179`, `:151-156`). Yeni tanım bu veriyi doğurmadığı için sütun her yeni tanımda "Ortak" yazardı.
- **R11.** Yazdırılan Aylık Gider ve Kasa Raporu'nda maliyet dağılımı kutusu yok. Raporun başka hiçbir kutusu değişmez.
- **R11/2.** Kalkan yalnız basılan kutudur. `giderKasaRaporu`'nun döndürdüğü nesnede kova alanı **yerinde kalır** (`giderRaporu.js:157`) ve okunmayan ölü alan olur; yalnız kutuyu kuran satır ile onun gider bölümü dizisindeki yeri silinir (`:334-335`, `:369`).

### Parti payı yeni hesaptan gelir

- **R12.** Makina Maliyeti › Üretim Partileri listesindeki ortak gider havuzu ve makina başı pay sütunları yeni maliyet hesabından gelir; bugünkü maliyet motorundan değil.
- **R13.** Bir ayın genel gider havuzu, o ayda gider tarihi olan ve türünün rolü "genel gidere girer" olan kalemlerin gider tutarları toplamıdır. Rolü "ürün ağacından gelir" ya da "maliyete girmez" olan tür, rolü verilmemiş tür ve türsüz kalem havuza girmez.
- **R14.** Ayın havuzu hak sahiplerine ağırlık oranında bölünür: o ay açık olan ve makinası bulunan her parti (ağırlık = partinin güncel canlı makina adedi) ve o ay üretilmiş partisiz her makina (ağırlık 1). Bölme kuruşla ve aşağı yuvarlanarak yapılır, artık kuruş en önce üretilmiş makinası olan hak sahibine gider. Bu, 0022 R13'ün kuralıdır ve değişmez; yalnız bölünen tutarın kaynağı değişir.
- **R15.** Partinin havuzu, hak kazandığı ayların paylarının toplamıdır. Makina başı pay havuzun makina adedine bölümüdür, aşağı yuvarlanır, artık kuruş en önce üretilen makinaya gider (0022 R3).
- **R16.** Partinin hak kazandığı aylar: açık partide başlangıçtan içinde bulunulan aya, kapalı partide başlangıçtan bitişe; yürürlük ayından önceki aylar sayılmaz (0022 R3, R12).
- **R17.** Makina adedi sıfır olan parti hak sahibi değildir; havuzu sıfırdır ve makina başı pay yerine bugünkü ipucu yazılır (0022 R14).
- **R18.** Başlangıcı gelecek ayda olan parti "veri yok" değildir, henüz başlamamıştır: havuzu sıfırdır ve satırda nedeni yazılır.
- **R19.** Açık partide bugünkü geçici işaretleri korunur: durum rozeti ve makina başı payın altındaki geçici ibaresi.
- **R20.** Parti havuzu hesap ayarlarındaki dönemden ve varsayılan üretim adedinden **bağımsızdır**; partinin kendi aylarını ve kendi makina adedini kullanır.
- **R21.** Hiçbir canlı türün rolü "genel gidere girer" değilse parti satırının havuzu rakam yerine nedenini yazar; sessiz sıfır gösterilmez.
- **R22.** Parti satırında havuzun kaynağı yazılır: partinin aylarındaki genel gider. Kullanıcı rakama bakıp hangi kapıdan geldiğini anlar.

### Kapanış anlık görüntüsü

- **R23.** Parti kapatıldığında partinin her ayının o anki genel gider havuzu bir anlık görüntü olarak saklanır.
- **R24.** Kapanmış partilerin aylarında genel gider sonradan değişirse Üretim Partileri'ndeki değişim kutusu bugünkü metinle o satırları gösterir; kaynağı yeni anlık görüntüdür.
- **R25.** 0090 öncesinde kapanmış partilerin eski anlık görüntüsü okunmaz ve karşılaştırılmaz; bu partiler için değişim satırı çizilmez. Eski veri silinmez.
- **R26.** Aralığı değişmeyen kapalı parti yeniden kaydedildiğinde anlık görüntü korunur; parti yeniden açılınca silinir (0022 R15 davranışı).

### Kapanan hesap

- **R27.** Bugünkü maliyet motoru artık hiçbir yerden çağrılmaz; uygulamanın bu ağır hesabı yapmadığı bir durum kalmaz.
- **R28.** Üretim Partileri ekranı bugünkü maliyet sonucunu almaz.
- **R29.** Yeni eylem izni yok; parti tanımı, kapatma ve silme bugünkü iznini ister.
- **R30.** Üretim Partileri'nin boş durum metni partisiz makinaların da bölünmede sayıldığını söyler; bugünkü cümle (payın üretildikleri ayın payı olduğu) artık hiçbir ekranda gösterilmediği için yanlış beklenti kurar.

### Parti satırının tek kaynağı

- **R31.** Yeni motor parti başına **tek nesne** döndürür: `{ id, adet, havuzK, makinaBasiK, durum, neden }`. `durum` beş değerden biridir: `tamam`, `makinaYok`, `baslamadi`, `rolYok`, `yururlukOncesi`. Ekran yalnız bu nesneyi okur; satırdaki adet, ipucu, havuz ve makina başı pay hücrelerinin dördü de buradan gelir.
- **R32.** Partinin makina adedi, R14'ün ağırlığını üreten **aynı** makina kümesinden sayılır (bugünkü makina listesi yardımcısı: canlı müşteri makinaları + canlı stok satırları). İki sayının eşitliği testle sabitlenir.
- **R33.** Sıfır havuzun nedenleri ayrılır: (a) genel rolü olan türler var ama partinin aylarında o türlerden kalem yok, rakam sıfır yazılır ve neden yazılmaz; (b) partinin bütün ayları yürürlük ayından önce, `yururlukOncesi` nedeni yazılır; (c) bir ayda hiç hak sahibi yoksa o ayın havuzu hiçbir partiye girmez, bu bilinen sınırdır ve kapsam dışıdır (X9).
- **R34.** Makina Maliyeti › Parti Hesabı'ndaki "Genel gider payı (birim)" sütununa tek satırlık ayrım ibaresi eklenir: o pay hesap ayarlarının döneminden ve varsayılan adedinden gelir, Üretim Partileri'ndeki pay partinin kendi aylarından gelir, iki rakam toplanmaz (X8'in ekrandaki karşılığı).
- **R35.** Üretim Partileri'nin başlıktaki açıklama cümlesi de güncellenir (`UretimPartileri.jsx:64`): havuzun kapısı tür rolüdür ve ad "genel gider"dir, bugünkü "ortak gider … eşit dağılır" cümlesi kalkan kova kutusunun dilidir.

### Kapanış anlık görüntüsünün yazımı

- **R36.** Yeni kalıcı alanın adı `kapanisGenelHavuzlari`, içeriği JSON `{ "YYYY-AA": kuruş }`. Okuma koşulludur: alan boşken gövdeye **hiç yazılmaz** (bugünkü planlanan adetler deseni), null da yazılmaz. Parti yeniden açılınca anahtar silinir, null'a çekilmez.
- **R36/2.** (revizyon 3, K4) Motorun ay haritası yürürlük ayından `max(içinde bulunulan ay, en geç parti bitişi)`'ne kadar her ayı kapsar. Kapanış yardımcısı kapanacak aralıkta haritada olmayan bir ay görürse kayıt yapılmaz ve nedeni bildirimle söylenir.
- **R37.** Anlık görüntünün girdisi yeni motorun ay tablosudur: motor ay → havuz haritasını (kuruş) dışa verir, Üretim Partileri onu kapanış yardımcısına geçirir, yardımcı tutarı doğrudan okur. Harita yoksa **kayıt yapılmaz** ve nedeni bildirimle söylenir; sessizce boş anlık görüntü yazılmaz. Bugün prop kesilince boş nesne yazılıyor (`uretimPartisi.js:39-43`, `UretimPartileri.jsx:43`) ve değişim kutusu o parti için sonsuza dek sessiz kalıyor.

### Silinen bileşenler ve ölü bağlar

- **R37/2.** (revizyon 3, K5) Durum önceliği: `baslamadi` → `makinaYok` → `yururlukOncesi` → `rolYok` → `tamam`. `rolYok` 0088 triyajının kuralıyla: canlı genel tür yok **ve** partinin havuzu sıfır.
- **R37/3.** (revizyon 3, K3, K8) Ağırlıklı bölme yeni motorda yazılır; bugünkü motorun dosyasına dokunulmaz (bir sürüm sonra siliniyor, X3) ve eşdeğerlik AC-36'nın fikstürüyle ve çakışan parti, partisiz makina, tarihsiz makina vakalarıyla kanıtlanır. Parti hesabı App'te değil Makina Maliyeti ekranında kurulur.
- **R38.** Çizilmeyen bileşen bırakılmaz: `AtamaAlani`, `DagitimAlani` ve `ModelSatirlari` (`gider/GiderAlanlari.jsx`), `KovaKarti` ile `dusenAtamaKalemSayisi` ve `dusenAtamaMetni` (`gider/DonemRaporu.jsx:41-77`) silinir.
- **R39.** Üç silme onayının atama cümlesi kalkar: müşteri silme (`Customers.jsx:696`), stok makinası silme (`stock/MakinaStokTab.jsx:211`) ve özel model silme (`ModelsManager.jsx:176`). `makinaGiderSayisi` ve `modelKullanim` çağrıları da kalkar. Model yeniden adlandırılınca gider satırlarını taşıyan zincir (`modelAdiTasi`) **kalır** (C7, veri bozulmaz).
- **R40.** Ölü prop ve memolar kaldırılır: gider formunun stok, müşteri ve model prop'ları ile Giderler'in model listesi memosu (`Giderler.jsx:87`), kalem listesinin stok, müşteri, standart model ve özel model prop'ları ile canlı model seti ve makina çözücü memoları (`DonemRaporu.jsx:269`, `:299`). Giderler'in kendi stok, müşteri ve canlı model değerleri rapor motoru için kalır.

### Birlikte güncellenen üç kayıt

- **R41.** Tasarım sözlüğü: katlanan kart örneğinin dosya ve satır atfı güncellenir (`docs/tasarim-sozlugu.md:128`, bugün `DonemRaporu.jsx:85`'i gösteriyor ve kova kutusu silinince satır kayar); atama alanının gri bilgi kutusu "Bilinen borç" listesinden "Ödenen borç (spec 0090)" bölümüne taşınır (`:391`) ve borç listesinin ad taramasından düşer.
- **R42.** Görsel kanıt aracı: konusu kalkan ekranlar silinir, bulunamayacak adımlar düzeltilir, yeni durumlar için ekran eklenir (Context'teki tablo). Araç bulunamayan adımı yalnız uyarıyla geçtiği için düzeltilmeyen ekran sessizce yanlış kadraj çeker ve sahte "0 fark" raporlar.
- **R43.** Kullanıcı rehberi: atama ve dağıtım atıfları ile atama bölümü kalkar, iki PDF yeniden üretilir. **Açık kalemlerin yaşlandırma kovalarına dokunulmaz** (ayrı kavram, 0061); toptan "kova" araması rehberin o bölümünü de bozar.

---

## Constraints

### Uyulması zorunlu

- **C1.** 0089 önkoşuldur: iki maliyet görünümü kalkmadan bu iş başlamaz, çünkü kova ve dağıtımın oradaki çıktıları bu spec'in kaldırma yüzeyini değiştirir.
- **C2.** Havuzun tabanı kalemin **gider tutarıdır** (matrah + indirilemeyen KDV, 0076 `kalemGiderTutari`), matrah değil. Kısıtlı gider kuralları değişmez.
- **C3.** Aynı sayıyı üreten iki yol yazılmaz: hesap ayarlarının dönemine eşit bir aralıkta aylık havuzların toplamı, 0088'in dönem havuzuyla kuruş kuruş eşit olmalıdır ve bu eşitlik testle sabitlenir. Üçüncü bir toplama yolu açılmaz.
- **C4.** Üretim tarihi tek zincirden çözülür (bugünkü makina listesi yardımcısı, 0088 R9/3); ikinci bir üretim tarihi kuralı yazılmaz.
- **C5.** Hesap saf motorda yazılır ve kendi testi olur; ekran çarpma ve bölme yapmaz (0088 ile aynı tarama).
- **C6.** Gizlilik: personel türü havuzda tek satırdır, motor ve ekran çalışan alanlarını okumaz. Kova kutusunun ve yazdırılan kutunun kalkması gizliliği daraltır, hiçbir yerde gevşetmez.
- **C7.** Veri silinmez. Kalemlerin atama ve dağıtım alanları, model satırları alt tablosu ve partinin eski kapanış alanı yerinde kalır; okunmayan ölü alan olur (0082'nin ölü tablo deseni). Göç yazılmaz.
- **C8.** Yeni kalıcı alan dört nokta kuralıyla eklenir ve veritabanı gidiş dönüş testine girer. Boş değer gövdeye yazılmaz (sunucu karşılaştırması null ile yokluğu ayırır).
- **C9.** Motorun kova alanları (dört kova, kova katkısı, bağı kopmuş atamalar) bugünkü gider raporu motorunda kalır; çağıranı olmaz. 0001 AC-82'nin "dört kova = dönem toplamı" eşitliği motor düzeyinde korunur.
- **C10.** Bugünkü maliyet motorunun dosyası ve testi bir sürüm boyunca yerinde kalır (0089 R5 deseni, geri dönüş yolu). Ondan hâlâ kullanılan yardımcılar (makina listesi, satış kuru bilgisi, dönen stok tarihi, kat değeri doğrulaması) kalır.
- **C11.** Yürürlük ayı kuralı değişmez: yürürlük öncesi tarihli kalem hiçbir hesaba girmez.
- **C12.** Yazdırılan Aylık Faaliyet Raporu'nun çıktısı değişmez (ayrı belge, altın dosya korunur).
- **C13.** Sunucu izinleri, bölüm eşlemeleri ve birleştirme kuralları değişmez; yeni bölüm açılmaz.
- **C14.** Yeni alanın adı atama ve dağıtım kavramlarına benzemez; ad tuzağı taramasıyla korunur (0023 "mesai", 0074 "rol" dersleri).
- **C15.** Aylık havuzun **tek yolu** vardır: ay aralığıyla gider raporu motorunu çağırıp tür kırılımını okuyan tek yardımcı, aylar için döngüde. Yürürlük kırpması, çöpteki tür, kısıtlı gider tabanı ve türsüz kalem kuralları böylece ikinci kez yazılmaz ve C3'ün eşitliği tanım gereği tutar. Hız sorunu çıkarsa çözüm ay başına önbellektir; kalemleri aya ve türe göre ayrıca toplayan **ikinci bir yol yazılmaz** (0082'nin kapattığı tuzak).
- **C16.** 0089'un kıyas altınları **yenilenmez**, karşılaştırma daraltılır: kutu listesinden kova satırı düşer; ekranın tam metninden ve kalem listesinden kova kutusu, atama hücreleri ve dağıtım rozeti karşılaştırmadan önce ayıklanır (0089'un kopmuş atama satırı için yaptığının aynısı); yazdırma HTML'inden maliyet dağılımı kutusu ayıklanır. Altının değeri spec öncesi koddan üretilmiş olmasıdır; yenilenirse 0089'un güvencesi kaybolur ve bu spec'in "başka hiçbir şey değişmedi" iddiası ölçülemez. **Revizyon 3 (K2):** 0089 altınında kalem listesi ve tam ekran metni hücreleri birleştirilmiş düz dizedir, atama hücreleri ondan güvenle ayıklanamaz. Bu iki karşılaştırma için 0090 öncesi kodla, atama sütunu DOM'da hücre düzeyinde çıkarılarak üretilmiş **ek** bir altın (`tests/fixtures/0090-ekran-once.json`) kullanılır; 0089 altını yenilenmez ve rapor nesnesi, kalan dört kutu ve yazdırma HTML'i (kutu ayıklanarak) onunla karşılaştırılmaya devam eder.
- **C17.** 0059'un altın rapor nesnesi (`tests/fixtures/0059-gider-rapor-once.json`) ve iki yerde sabitlenmiş özeti (`tests/satis-tevkifat-0079.test.js:381`, `tests/gider-kasa-raporu-0084.test.js:50`) değişmez; R11/2 bunu garanti eder. Aylık Faaliyet Raporu'nun altın dizesi de değişmez (C12).
- **C18.** "Motor çağrılmaz" taraması dar yazılır: `hesaplaMakinaMaliyetleri`, `karlilikOzeti`, `makinaKarlilik` ve `fiyatOnerisi` `src` altında hiç çağrılmaz. Aynı dosyadan hâlâ kullanılan yardımcılar (makina listesi, satış kuru bilgisi, dönen stok tarihi, kat değeri doğrulaması) kapsam dışıdır (C10) ve `scripts` altında iki gerekçeli istisna adıyla sabitlenir (`scripts/evidence/0009-sayfa.jsx`, `scripts/tests/0088-kiyas-fikstur.mjs`; 0089 C10 deseni).

### KAPSAM DIŞI

- **X1.** Peşin ödenen giderin yeni havuzda aylara yayılması — *neden:* yeni havuz bilinçli olarak tür kırılımından okunuyor (0088 C); kalem kalem yürüyen ikinci bir havuz hesabı ayrı iştir. Müşteri gerçek veride dönem şişmesi görürse ayrı spec'le açılır.
- **X2.** Tek bir gider kalemini havuzdan dışlama — *neden:* 0088'in kararı rolün tür düzeyinde olmasıdır; kalem düzeyinde bayrak bu spec'in kaldırdığı karmaşıklığın aynısını geri getirir.
- **X3.** Bugünkü maliyet motorunun dosyasının (500 satır) ve testinin (457 satır) silinmesi — *neden:* geri dönüş yolu bir sürüm açık kalır; silme ayrı iştir.
- **X4.** Atama, model satırları, dağıtım ayı ve partinin eski kapanış alanının veritabanından kaldırılması — *neden:* veri kaybı riski; ölü alan zararsızdır.
- **X5.** Makina ya da seri bazında maliyet ve kârlılık — *neden:* 0089'un bilinçli kaybı; bu spec onu geri getirmez.
- **X6.** Kova alanlarının gider raporu motorundan çıkarılması — *neden:* motor çıktısının daralması 0001, 0020, 0072 ve 0076'nın motor testlerini ve altın fikstürlerini topluca etkiler; kazanç yok.
- **X7.** Üretim partisinin üretim planlama aracına dönüşmesi — *neden:* 0022 C7 kararı yerinde.
- **X8.** Parti payının yeni ekranın Parti Hesabı görünümüne taşınması ya da standart maliyetle toplanması — *neden:* iki rakam iki soruyu cevaplar (gerçekleşen genel gider payı ve standart maliyet); toplanmaları 0088'in ayrım kararını bozar.
- **X9.** Hiç hak sahibi olmayan ayın havuzunun bir yere yazılması — *neden:* bugünkü davranış da öyledir (o ayın payı dağıtılmamış kalır) ve ekranı 0089 ile kalktı; yeni bir dağıtım kuralı yazmak R14'ün ağırlıklı bölmesini bozar. Bilinen sınır olarak yazılır.

---

## Context

### Bugünkü durum, ölçülmüş

| Ne | Nerede | Bugün |
|---|---|---|
| Atama kutusu | `GiderForm.jsx:563` | Çizilir, bütün atanabilir davranışlarda |
| Dağıtım alanı | `GiderForm.jsx:569` | Çizilir, kira dahil bütün davranışlarda |
| Tanım formundaki ikisi | `SettingsGiderTanimlari.jsx:299`, `:303` | Çizilir |
| Tanım listesindeki atama sütunu | `SettingsGiderTanimlari.jsx:179` (sekiz başlık), hücre `:151-156` | Çizilir; model satırları, "Dağıtılmasın", "Makina", "Ortak" |
| Kovalar kutusu | `Giderler.jsx:381` → `DonemRaporu.jsx:49` | Çizilir, 0089 R12 ile bağı kopmuş atama satırı eklendi (`:41`, `:74`) |
| Kalem listesinin atama sütunu | `DonemRaporu.jsx:445` (dokuz başlık), içerik `:301`, rozet `:317` | Çizilir |
| Yazdırılan kutu | `giderRaporu.js:334` | "GİDER · MALİYET DAĞILIMI", dört kova ve toplam |
| Parti sütunları | `UretimPartileri.jsx:90`, `:91` | Bugünkü motorun `partiler` çıktısından (`havuz`, `makinaBasi`) |
| Parti adedi ve ipucu | `UretimPartileri.jsx:87`, `:88` | Aynı çıktının `adet` alanından; motor kesilince kaynağı kalmaz (R31) |
| Atama yazımı | `gider.js:785`, `:788`, `:810` | Doğrulayıcı atama alanlarını **her zaman** yazar; dağıtım boşsa anahtarı siler |
| Silme onaylarının atama cümlesi | `Customers.jsx:696`, `stock/MakinaStokTab.jsx:211`, `ModelsManager.jsx:176` | "atanmış N gider kalemi … ortak gidere düşer" |
| Kapanış anlık görüntüsü | `uretimPartisi.js:39` `kapanisAnlikGoruntusu`, `:46` `partiKapanisUygula` | Ayın kova tabanlı ortak giderini saklar; ay tablosu verilmezse **sessizce boş** nesne yazar |
| Değişim kutusu | `UretimPartileri.jsx` (0089 R11 ile buraya taşındı) | Anlık görüntü ile bugünkü ortak giderin farkı |
| Motor çağrısı | `App.jsx:935` | `maliyetYetki && serverMode !== null` kapısıyla, tek tüketici Üretim Partileri |

### Neden bu iş gerekli: üç ölçüm

1. **Yeni ekran iki kutudan hiçbirini okumuyor.** Genel gider havuzu `makinaStandartMaliyet.js`
   `rolHavuzlari` → `hesaplaGiderRaporu().turKirilimi` zincirinden geliyor, yani tür başına toplam.
   Tür kırılımı her kalemi `gider.js:1129`'da toplar; atamaya ve dağıtım ayına bakmaz.
2. **Sessiz çelişki.** "Makina maliyetine girmesin" (dağıtılmasın) işaretli kalem, türünün rolü
   "genel gidere girer" ise yeni havuza tam tutarıyla girer. Tersi de doğrudur: makinaya atanmış
   kalem eski modelde ortak havuzdan düşerdi, yeni havuzdan düşmez. Hangisinin geçtiğini ekran
   söylemiyor.
3. **Geriye kalan tek gerçek çıktı parti payı.** Atamanın dört, dağıtımın iki görünen izi var ve
   bunların arasında bir makina ya da model maliyeti yok, çünkü o ekranlar 0089 ile kalktı. Yani
   bugün iki kutu tek yönlü bir ayara dönüştü: parayı havuzdan çıkarabiliyorsunuz, nereye gittiğini
   göremiyorsunuz.

### Neden atamasız eski motor bir seçenek değil

Atama kalkarsa bugünkü motorda bütün kova ortak olur ve tedarik faturaları da parti havuzuna
girer; ürün ağacından gelen malzeme ikinci kez sayılır. Müşterinin tablosunda 4,25 milyonluk
tedarik ile 9,58 milyonluk genel masrafın hiçbir yerde toplanmamasının nedeni tam buydu. Rolü
bilen tek hesap yeni hesaptır; bu yüzden parti payı oraya taşınır.

### Neden ağırlıklı bölme korunuyor

Partinin aylarındaki havuzu doğrudan partinin makina adedine bölmek iki yerde yanlış rakam üretir:
çakışan iki parti ortak ayı iki kez sayar, ve o ayda üretilmiş partisiz makinaların payı da partiye
yazılır. 0022 R13'ün ağırlıklı bölmesi ikisini de çözüyor ve kuralın kendisi ekranda görünmüyor,
yani müşterinin "karışık" dediği yüzeyi büyütmüyor. Bu yüzden kural aynen korunur, yalnız bölünen
tutarın kaynağı değişir.

### Kapanış anlık görüntüsünün tuzağı

Bugün kapanmış partilerin anlık görüntüsü kova tabanlı ortak gideri taşıyor. Karşılaştırmanın
tabanı değiştiği için, göç yazılmazsa aylarında atama ya da dağıtım bulunan **her** kapalı parti
kapanıştan sonra hiçbir şey değişmemiş olsa da "değişti" satırı üretir. Çözüm yeni bir alanda
yazmak ve eskiyi hiç okumamak: göç yok, veri silinmez, yanlış satır çıkmaz, 0090 sonrası kapanan
partilerde kutu tam çalışır. Bedeli, 0090 öncesi kapanmış partilerin bu kutuda hiç görünmemesidir.

### Kaldırma ile kırılan yerler (yirmi üç satır, ölçüldü)

| Yer | Ne kırılır |
|---|---|
| `tests/ui/personel-atama.test.jsx` | formun atama bölümü, kova kutusu ve kopmuş atama satırı (0020) |
| `tests/ui/gider-dagitim-0072.test.jsx:68` | formdaki dağıtım alanı, rozet ve kova kutusu (0072 AC-35) |
| `tests/ui/kisitli-gider-0076.test.jsx` | dağıtım rozeti ve kova ekran kriterleri |
| `tests/ui/gider-form.test.jsx` | atama alanlarının form durumuna yazılması |
| `tests/ui/kdv-dahil-0071.test.jsx` | atama bağlı form beklentileri |
| `tests/ui/sgk-turu-0074.test.jsx` | SGK kaleminde atama yazılmaması |
| `tests/ui/gider-tanim-tablo.test.jsx:18` | tanım tablosunun sekiz başlığı (0030 AC-14) |
| `scripts/tests/gider-tanim-yerlesim.cjs:46` | Electron: "dört satır ve sekiz başlık" (0030 AC-13) |
| `scripts/tests/layout/gider-tanim-veri.js:14-15` | yerleşim düzeneğinin atama hücresi (tablonun en geniş hücresi) |
| `tests/kutular-kapali-0081.test.js` ve `tests/ui/kutular-kapali-0081.test.jsx` | beş yan kutu sayısı ve kova kutusunun dört dilimi |
| `scripts/tests/donem-raporu-yerlesim.cjs:13`, `:34` | Electron: beş kutu listesi ve sıra (0067, 0081) |
| `tests/ui/kutu-duzeni-0067.test.jsx` | Dönem Raporu'nun kutu sırası |
| `tests/ui/sayfalama-0062.test.jsx`, `tests/ui/acik-kalemler.test.jsx` | kova kutusunun varlığına bakan satırlar |
| `tests/ui/sayfalama-kalkar-0080.test.jsx` | kalem listesinin sütunları ve atama hücresi |
| `tests/ui/gider-gorunum-0089-kiyas.test.jsx` | beş kutu, ekranın tam metni, kalem listesi ve yazdırma HTML'i (C16) |
| `tests/ui/gider-gorunum-0089.test.jsx` | kopmuş atama satırının metni ve sayımı (0089 R12) |
| `tests/gider-gorunum-0089.test.js:35`, `:57` | "src'de motoru çağıran yalnız App" ve App memo satırının birebir metni (0089 AC-6, AC-7) |
| `tests/gider-kasa-raporu-0059.test.js:50` | basılan kutu başlıkları listesi |
| `tests/gider-kasa-raporu-0061.test.js:12` | "MALİYET DAĞILIMI" başlığını dilim sınırı olarak kullanıyor |
| `tests/gider-gizlilik.test.js:227` | aynı başlığı SGK kutusunun sınırı olarak kullanıyor |
| `tests/ui/customers-delete-cascade.test.jsx:119`, `tests/ui/stock-makina-delete.test.jsx:22`, `tests/ui/models-manager-gider.test.jsx:13`, `tests/ui/gider-perdesi.test.jsx:139`, `:145` | üç silme onayının atama cümlesi (R39) |
| `tests/ekran-spec-no.test.js:20`, `:21` | silinen bileşenlerin ekran metinlerinin **varlığını** istiyor (R38) |
| `tests/tasarim-kaynak.test.js:101` (AC-20), `:110` (AC-18) | sözlüğün örnek satırı ve "Bilinen borç" ad listesi (R41) |
| (revizyon 3, plan ölçümü) `tests/uretim-partisi.test.js`, `tests/ui/uretim-partisi.test.jsx`, `tests/ui/makina-maliyeti-0088-app.test.jsx`, `tests/ui/gider-gorunum-0089-app.test.jsx`, `tests/ui/gider-settings.test.jsx`, `tests/gider.test.js`, `tests/gider-dagitim-0072.test.js`, `tests/personel-atama.test.js`, `tests/kisitli-gider-0076.test.js`, `scripts/tests/db-roundtrip.cjs` | kapanış yardımcısı, eski motor sonucu ve `kapanisOrtaklari` ile kurulmuş düzenekler, tanım formunun atama alanı, doğrulayıcı hataları (K1), yeni alan |

### Ters çevrilen kriterler (on üç satır, on bir spec)

| Spec | Kriter | Yeni beklenti |
|---|---|---|
| 0001 | AC-28 (atanmış gider sayısı onayda) | cümle yok |
| 0001 | AC-82'nin ekran yarısı (dört kova = dönem toplamı) | motor düzeyinde korunur, ekranda yok (C9) |
| 0001 / 0020 | AC-84 (modele atanmış gider sayısı onayda) | cümle yok |
| 0020 | kova ekran kriterleri, personel atama uyarısı | form bölümü ve kutu yok |
| 0030 | AC-13, AC-14 (tanım tablosu sekiz başlık, Electron ölçümü) | yedi başlık |
| 0061 | kutu sınırı olarak kullanılan başlık | yeni sınır |
| 0067 | kutu sırası | kova kutusu yok |
| 0072 | AC-35 ve rozet kriterleri | alan ve rozet yok |
| 0076 | kova ekran kriterleri | yok |
| 0080 | kalem listesi sütunları | sekiz sütun |
| 0081 | "beş yan kutu kapalı başlar" | dört yan kutu |
| 0088 | parti ekranının düzeneği | yeni motor nesnesiyle |
| 0089 | AC-6, AC-7 (motor yalnız App'te, memo satırı), R12 (kopmuş atama satırı) | motor hiç çağrılmaz, satır yok |
| 0001 · 0020 · 0072 · 0076 | doğrulayıcının atama ve dağıtım hataları ve uyarıları (K25/K38, 0072 R5/R17/R19, 0076 R15/2; revizyon 3, K1) | atama taşıyan kalemde hata ve uyarı yok, biçim çözülür |

### Görsel kanıtın bedeli (ölçüldü)

| Ekran | Bugün | Karar |
|---|---|---|
| `gider-formu-personel-makina` (`:706`) | adım `kaydir:Makina maliyeti ataması` | silinir |
| `gider-formu-0072`, `-0072-makina`, `-0072-kira` (`:868-870`) | adım `doldur:Maliyete dağıtım (ay)=12` ve `kaydir:Maliyete dağıtım` | silinir |
| `ayarlar-gidertanim-0072` (`:871`) | aynı adımlar | silinir |
| `giderler-0089-kova-dusen` (`:730`) | kova kutusundaki kopmuş atama satırı | silinir |
| `giderler-0081-hepsi-acik` (`:611`) | adım `tikla:Makina Maliyeti Kovaları` | adım çıkarılır |
| `maliyetPartiEkrani` düzeneği (`:530`, `:538`) | bugünkü motoru kuruyor | yeni hesaba geçirilir |
| `giderler-rapor`, `giderler-0062-kalemler`, `giderler-0080-kalemler-tam`, `giderler-0072-liste`, `gider-formu`, `ayarlar-gidertanim`, `gider-tanim-tablo`, `maliyet-uretim-partileri` | bugünkü hâliyle çizilir | `beklenen: "degisti"` + TY onayı |
| yeni: `maliyet-0090-parti-neden`, `giderler-0090-rapor` | yok | eklenir (rol yok ve başlamadı durumları, kutusuz Dönem Raporu) |

**Araç bulunamayan adımı yalnız uyarıyla geçer.** Düzeltilmeyen ekran sessizce yanlış kadraj çeker ve sahte "0 fark" raporlar; 0089'da `giderler-0068-parti-sil` tam böyleydi.

### Rehberin atıfları (altı atıf, bir ad tuzağı)

| Yer | Metin |
|---|---|
| `docs/rehber/gider-kasa-kurulum.html:311` | tanım formunun alan listesinde "Makina maliyeti ataması" |
| `docs/rehber/gider-kasa-rehberi.html:127` | içindekiler satırı ("… kira, personel, atama, taksit …") |
| `:298` | "Gerekiyorsa atama yapın (bkz. 3.7)" |
| `:336-338` | "Her gider dört kovadan birine düşer" tablosu |
| `:589` | "Dönem Raporu'nun Makina Maliyeti Kovaları kutusunda toplam olarak görünür" |
| `:739` | "stopajı ve kova dağılımı bozulur" |
| **Dokunulmaz:** `:286`, `:551`, `:561` | buradaki "kova" açık kalemlerin **yaşlandırma kovası**dır (0061) |

### Bilinen tuzaklar

- **Dört nokta kuralı:** yeni alan şemaya, sütun göçüne, yazmaya ve okumaya birlikte girer; gidiş dönüş testine eklenir.
- **Boş değer gövdeye yazılmaz:** sunucunun bölüm karşılaştırması null ile yokluğu ayırır; yoksa kısıtlı kullanıcı her kayıtta 403 alır.
- **Çöpteki tür:** tür haritası ham kurulur, çöpteki genel türün kalemi havuza girer (0078 C2); 0088'in havuzu da böyledir.
- **Ay dönümü:** açık partinin son ayı "bugün"e bağlıdır; bugün yerel gündür, evrensel saat değil (0072 triyajı).
- **Altın dosyalar:** 0059'un altın rapor nesnesi ve iki özeti değişmez (R11/2, C17); 0089'un iki altını yenilenmez, karşılaştırma daraltılır (C16); Aylık Faaliyet Raporu'nun altın dizesi değişmez (C12). Yani bu işte **hiçbir altın dosya yeniden üretilmez**.
- **Ters çevrilecek kriterler:** yukarıdaki tabloda on üç satır, on bir spec.
- **Ad tuzağı iki yerde:** rehberin yaşlandırma "kova"ları açık kalemlerin kovasıdır (R43); yeni alanın adı eski kapanış alanına ve atama ile dağıtım kavramlarına benzemez (C14, R36).
- **Sessiz geçen adım:** görsel kanıt aracı bulunamayan adımda yalnız uyarı yazar; düzeltilmeyen ekran sahte "0 fark" raporlar.
- **Ölçüm noktası:** "yeni kayıtta anahtar yok" iddiası yalnız kaydedilen gövdede ölçülebilir; veritabanı okuması boş atama alanlarını koymaya devam eder (R5/2).
- **Kanıt eşlemesinde tarihsel kayıtlar:** `UretimPartileri.jsx` için duran üç kayıt aracın artık üretmediği ekran adlarını taşıyor (`giderler-uretim-partileri`, `giderler-uretim-partisi-formu`, `giderler-0068-parti-sil`; araçtaki karşılıkları `maliyet-*`). Geçmiş raporlara baktıkları için test kırmazlar; bu işte yeni kayıt eklenirken üçünün tarihsel olduğu not edilir, yeniden adlandırma ayrı iştir.

---

## Acceptance Criteria

### Giriş kapıları

- **AC-1.** Yeni gider formunda makina maliyet ataması bölümü hiç çizilmez; normal, kira, personel ve SGK davranışlarının dördünde de yoktur.
- **AC-2.** Yeni gider formunda aylara dağıtım alanı hiç çizilmez.
- **AC-3.** Tekrarlayan gider tanımı formunda atama bölümü ve dağıtım alanı hiç çizilmez.
- **AC-4.** Model ataması ve iki model satırı taşıyan eski bir kalem formda açılıp kaydedildiğinde kaydın atama türü ve model satırları birebir korunur.
- **AC-5.** On iki aya dağıtılmış eski bir kalem formda açılıp kaydedildiğinde dağıtım ayı korunur.
- **AC-6.** Yeni kaydedilen kalemin **gövdesinde** atama türü, makina alanları, model satırları ve dağıtım ayı anahtarları hiç yoktur (boş değerle de yazılmaz). Ölçüm kaydedilen gövdedir, yeniden yüklenmiş kayıt değil (R5/2).
- **AC-7.** Yeni kaydedilen tanımın gövdesinde aynı anahtarlar hiç yoktur; ölçüm yine gövde anındadır.
- **AC-8.** Atama ve dağıtım taşıyan eski bir tanımdan kalem üretildiğinde üretilen kalem bu veriyi bugünkü gibi taşır.

### Kalkan çıktılar

- **AC-9.** Dönem Raporu'nda kovalar kutusu hiç çizilmez.
- **AC-10.** Bağı kopmuş atama uyarı satırı hiçbir ekranda yoktur.
- **AC-11.** Dönem Raporu'nun katlanan yan kutusu dörttür ve dördü kapalı başlar.
- **AC-12.** Gider Kalemleri tablosunun başlık satırı sekiz sütundur ve içinde atama başlığı yoktur; boş durum, alt toplam ve dipnot satırları da bu sekiz sütuna uyar (sütun kayması yok).
- **AC-12/2.** Ayarlar › Tekrarlayan Giderler tablosunun başlık satırı yedi sütundur ve içinde atama başlığı yoktur; aynı tablo 1280 px pencerede yatay kaydırma olmadan bütün sütunları gösterir (Electron ölçümü, 0030 AC-13).
- **AC-13.** Dağıtım rozeti hiçbir ekranda yoktur.
- **AC-14.** Yazdırılan Aylık Gider ve Kasa Raporu'nda maliyet dağılımı kutusunun başlığı geçmez.
- **AC-15.** Aynı raporun kalan bütün kutuları ve satırları spec öncesi çıktıyla birebir aynıdır: 0089'un altın HTML'i yenilenmez, karşılaştırmadan önce yalnız maliyet dağılımı kutusu ayıklanır (C16).
- **AC-16.** Aylık Faaliyet Raporu'nun çıktısı bayt bayt aynıdır.

### Aylık genel gider havuzu

- **AC-17.** Rolü "genel gidere girer" üç türün aynı aydaki kalemleri toplanır; o ayın havuzu bu toplamdır.
- **AC-18.** Rolü "ürün ağacından gelir" türün kalemi havuza girmez.
- **AC-19.** Rolü "maliyete girmez" türün kalemi havuza girmez.
- **AC-20.** Rolü verilmemiş türün kalemi havuza girmez.
- **AC-21.** Türü tanımsız ya da bulunamayan kalem havuza girmez.
- **AC-22.** Çöpteki genel türün kalemi havuza girer.
- **AC-23.** Kısıtlı gider kalemi havuza matrah ile indirilemeyen KDV'nin toplamıyla girer.
- **AC-24.** Yürürlük ayından önceki aya tarihli kalem havuza girmez.
- **AC-25.** Hesap ayarlarının dönemine eşit bir aralıkta aylık havuzların toplamı, 0088'in dönem havuzuna kuruş kuruş eşittir.

### Parti payı

- **AC-26.** Üç aylık, tek, makinası olan bir parti: havuz, üç ayın havuzlarının toplamına eşittir.
- **AC-27.** Makina başı pay havuzun makina adedine bölümüdür, aşağı yuvarlanır; makinaların paylarının toplamı havuza eşittir ve artık kuruş en önce üretilen makinaya gider.
- **AC-28.** Çakışan iki parti: ortak ayın havuzu adet ağırlığıyla bölünür ve iki partinin o aydan aldığı payın toplamı ayın havuzuna eşittir.
- **AC-29.** O ay üretilmiş partisiz bir makina ağırlık bir ile sayılır; partinin o aydan aldığı pay buna göre küçülür.
- **AC-30.** Yürürlük öncesi ayları olan parti: o aylar havuza girmez, kalan aylar girer.
- **AC-31.** Başlangıcı gelecek ayda olan parti: havuz sıfır, satırda "başlamadı" nedeni yazılır.
- **AC-32.** Makinası olmayan parti: havuz sıfır, makina başı pay yerine bugünkü ipucu yazılır.
- **AC-33.** Açık parti: durum rozeti ve makina başı payın altındaki geçici ibaresi bugünkü metinlerle çizilir.
- **AC-34.** Hiçbir canlı türün rolü "genel gidere girer" değilse parti satırının havuzu rakam yerine nedenini yazar.
- **AC-35.** Parti havuzu hesap ayarlarındaki dönem ve varsayılan adet hiç girilmemişken de hesaplanır; ayarsız durumdan etkilenmez.
- **AC-36.** Kıyas: atama, dağıtım ve kısıt taşımayan, bütün canlı türlerinin rolü "genel gidere girer" olan fikstürde yeni parti havuzu ve makina başı pay, spec öncesi kodun ürettiği rakamla birebir aynıdır.
- **AC-37.** Parti satırında havuzun kaynağını söyleyen ibare çizilir.
- **AC-38.** Havuz ve makina başı pay yalnız Türk lirası biçiminde gösterilir; parti satırında başka para birimi ve kur ibaresi geçmez.
- **AC-38/2.** Motor parti başına tek nesne döndürür ve beş durum değerinin hepsi üretilebilir; satırın adedi, ipucu, havuz ve makina başı pay hücreleri bu nesneden okunur, ekran ikinci bir kaynağa bakmaz.
- **AC-38/3.** Partinin adedi ile aynı partinin bölünmedeki ağırlığı aynı sayıdır (aynı makina kümesinden); fikstürde makinaların paylarının toplamı havuza eşit kalır.
- **AC-38/4.** Genel rolü olan türler varken partinin aylarında o türlerden kalem yoksa havuz sıfır yazılır ve neden yazılmaz; partinin bütün ayları yürürlük ayından önceyse satırda "yürürlük öncesi" nedeni yazılır.
- **AC-38/5.** Parti Hesabı görünümündeki "Genel gider payı (birim)" sütununda ayrım ibaresi çizilir ve iki rakamın toplanmadığını söyler.
- **AC-38/6.** Üretim Partileri'nin başlıktaki açıklama cümlesi havuzun kapısının tür rolü olduğunu söyler ve "ortak gider" ifadesini taşımaz.

### Kapanış anlık görüntüsü

- **AC-39.** Parti kapatıldığında yeni anlık görüntü partinin her ayı için o anki genel havuzla yazılır.
- **AC-40.** Aralığı değişmeyen kapalı parti yeniden kaydedildiğinde anlık görüntü değişmez.
- **AC-41.** Kapalı partinin bitişi silinince anlık görüntü silinir.
- **AC-42.** Spec öncesi kapanmış parti (yeni alanı olmayan, eski alanı olan): değişim kutusunda satırı yoktur.
- **AC-43.** Yeni alanı yazılı kapalı partinin bir ayının havuzu sonradan değişirse değişim kutusunda o ay için tek satır çıkar ve kapanıştaki, bugünkü ve fark tutarları yazar.
- **AC-44.** Partinin eski kapanış alanı hiçbir yerde okunmaz ve mevcut kayıtlarda korunur.
- **AC-45.** Yeni alan kaydedilip yeniden yüklendiğinde birebir geri gelir; boşken gövdeye yazılmaz (null da yazılmaz).
- **AC-45/2.** Ay tablosu verilmediğinde parti kaydı yapılmaz ve nedeni bildirimle söylenir; boş anlık görüntü yazılmaz.
- **AC-45/3.** Yeni alanın adı atama ve dağıtım kavramlarını ve eski kapanış alanının adını taşımaz (ad taraması).

### Kapanan hesap ve sınırlar

- **AC-46.** `hesaplaMakinaMaliyetleri`, `karlilikOzeti`, `makinaKarlilik` ve `fiyatOnerisi` `src` altında hiç çağrılmaz; `scripts` altında iki gerekçeli istisna adıyla sabitlenir. Aynı dosyadan kullanılan yardımcılar kapsam dışıdır (C10, C18).
- **AC-47.** Üretim Partileri ekranı bugünkü maliyet sonucunu almaz.
- **AC-48.** Personel türü havuzda tek satırdır; motor çıktısında çalışan adı ve çalışan bazlı tutar yoktur.
- **AC-49.** Yeni eylem izni eklenmedi; parti tanımı, kapatma ve silme bugünkü iznini ister.
- **AC-50.** Üretim Partileri'nin boş durum metni partisiz makinaların bölünmede sayıldığını söyler.
- **AC-51.** Ekranlar hesap yapmaz: parti ekranında çarpma ve bölme işlemi bulunmaz.
- **AC-52.** Otuz altı aylık üç parti ve üç bin kalemli veride parti sütunlarının hesabı iki saniyenin altında tamamlanır; ölçüm **ve gider raporu motoru çağrı sayısı** test çıktısına yazılır (C15).
- **AC-53.** Üç silme onayında atama cümlesi yoktur (müşteri, stok makinası, özel model); model yeniden adlandırıldığında gider kalemlerinin ve tanımlarının model satırları yeni adı taşımaya devam eder.
- **AC-54.** Silinen üç paylaşılan bileşen ile kova kartı ve kopmuş atama yardımcıları kaynakta hiç yoktur; onların ekran metinleri de yoktur (tarama).
- **AC-55.** Gider formu stok, müşteri ve model prop'u almaz; kalem listesi stok, müşteri, standart model ve özel model prop'u almaz (tarama).
- **AC-56.** Tasarım sözlüğünün katlanan kart örneği doğru dosya ve satırı gösterir; atama alanının gri bilgi kutusu "Ödenen borç (spec 0090)" bölümündedir ve "Bilinen borç" listesinde yoktur.
- **AC-57.** Görsel kanıt aracında atama ve dağıtım adımı taşıyan ekran kalmaz; silinen altı ekran yoktur, iki yeni ekran vardır ve değişen ekranların kanıt kaydı `beklenen: "degisti"` ile onay dizesini taşır.
- **AC-58.** Kullanıcı rehberinde atama ve dağıtım atıfları yoktur; açık kalemlerin yaşlandırma kovalarını anlatan üç satır aynen durur; iki PDF yeniden üretilmiştir. Rehber analistin dosyasıdır ve git'te izlenmez: geliştirici düzeltir ve PDF'leri üretir ama commitlemez; kanıt el ölçümüdür (revizyon 3, K7).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Aylık havuz ve parti payı React'sız saf motorda yazıldı ve kendi testi var; ekran yalnız gösteriyor.
- [ ] Aylık havuz **tek yoldan** hesaplanıyor (ay aralığıyla tür kırılımı); ikinci bir toplama yolu açılmadı (C15, tarama ile gösterildi) ve çağrı sayısı AC-52'nin çıktısında yazılı.
- [ ] Parti satırı motorun tek nesnesinden okunuyor; adet ile bölünmedeki ağırlığın aynı sayı olduğu testle sabitlendi (R31, R32).
- [ ] Aylık havuzların toplamı ile 0088'in dönem havuzunun eşitliği çapraz testle sabitlendi (C3).
- [ ] Spec öncesi kodla üretilmiş kıyas fikstürü eklendi ve AC-36 onunla ölçüldü.
- [ ] Sürüm notu 0090 öncesi kapanmış partilerin değişim kutusunun susduğunu söylüyor (R25; revizyon 3, K9).
- [ ] **Hiçbir altın dosya yeniden üretilmedi:** 0059'un rapor nesnesi ve iki özeti aynen (R11/2, C17), 0089'un iki altını yenilenmedi, karşılaştırmanın ayıklama listesi genişletildi (C16), Aylık Faaliyet Raporu'nun altın dizesi aynen (C12).
- [ ] Yeni kalıcı alan dört nokta kuralıyla eklendi ve gidiş dönüş testine girdi; boş değer gövdeye yazılmıyor.
- [ ] Yeni veri bölümü yok; bölüm eşlemeleri ve birleştirme kuralları değişmedi (tarama ile gösterildi).
- [ ] Yeni eylem izni yok; bu durum açıkça yazıldı.
- [ ] Çöp kutusu simetrisi korundu (parti çöp kutusuna gider, geri alma ve temizleme değişmedi).
- [ ] Silinen ekran ve kutuların testleri ters çevrildi; ters çevrilen her kriterin yanına "spec 0090 ile" notu yazıldı. Context'teki iki tablo (kırılan yerler, ters çevrilen kriterler) baştan sona gezildi ve hiçbiri atlanmadı.
- [ ] Çizilmeyen bileşen bırakılmadı: üç paylaşılan alan, kova kartı ve kopmuş atama yardımcıları silindi; ölü prop ve memolar kaldırıldı (R38, R40).
- [ ] Üç silme onayının atama cümlesi kalktı; model adı taşıma zinciri duruyor (R39).
- [ ] Tasarım sözlüğünün örnek satır atfı güncellendi ve atama kutusunun borcu "Ödenen borç (spec 0090)" bölümüne taşındı (R41).
- [ ] Kullanıcıya görünen bütün metinler Türkçe. Yazdırılan rapor çeviri sözlüğü kullanmaz (metinler gömülü Türkçe), bu yüzden artık çeviri anahtarı yok; bunun yerine kalkan kutunun başlığını **dilim sınırı** olarak kullanan üç test güncellendi (`gider-gizlilik.test.js:227`, `gider-kasa-raporu-0059.test.js:50`, `gider-kasa-raporu-0061.test.js:12`).
- [ ] Para gösterimi tek para birimi kuralına uyuyor (AC-38).
- [ ] Görsel kanıt eklendi (gider formu, tanım formu ve tanım tablosu, Dönem Raporu, kalem listesi, Üretim Partileri, Parti Hesabı, boş ve neden durumları); Context'teki kanıt tablosunun her satırı uygulandı; atama ya da dağıtım adımı taşıyan ekran kalmadı ve kanıt eşlemesi `beklenen: "degisti"` + `Takım Yöneticisi · YYYY-AA-GG · spec 0090 R42` onay dizesiyle güncellendi. **Bu tablo atlanırsa kanıt sahte "0 fark" raporlar.**
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Kullanıcı rehberinin altı atfı ve atama bölümü kalktı (Context'teki tablo), yaşlandırma kovalarını anlatan üç satıra dokunulmadı, iki PDF yeniden üretildi (R43).
- [ ] `CLAUDE.md` güncellendi: tek maliyet modeli, ölü alanlar (atama, model satırları, dağıtım ayı, eski kapanış alanı ve gider raporu motorunun kova alanları), parti payının yeni kaynağı ve yeni kalıcı alan.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-17)

Yirmi üç bulgunun hepsi Takım Yöneticisi tarafından onaylandı ve spec'e işlendi.

| No | Derece | Bulgu | Karar |
|---|---|---|---|
| B-1 | Bloklayıcı | Parti satırının adet ve durum kaynağı tanımsız | R31, R32, AC-38/2, AC-38/3 |
| B-2 | Bloklayıcı | Aylık havuzun hesap yolu yazılmamış, AC-52'nin bütçesi buna bağlı | C15, AC-52 |
| B-3 | Bloklayıcı | Doğrulayıcı atama alanlarını her zaman yazıyor, ölçüm noktası belirsiz | R5/2, AC-6, AC-7 |
| B-4 | Bloklayıcı | Tanım listesindeki atama sütunu kapsamda değil | R10/2, AC-12/2 |
| B-5 | Bloklayıcı | 0089'un kıyas testi bu işle çelişiyor | C16, AC-15 |
| B-6 | Bloklayıcı | Rapor nesnesinin kova alanının kaderi yazılmamış, iki özete bağlı | R11/2, C17 |
| Ö-7 | Önemli | Üç silme onayı atama dilini konuşmaya devam ediyor | R39, AC-53 |
| Ö-8 | Önemli | Ters çevrilecek kriterler listesi eksik, ölçülmüş tablo yok | Context'te iki tablo |
| Ö-9 | Önemli | Tasarım sözlüğünün iki atfı kırılır | R41, AC-56 |
| Ö-10 | Önemli | Bileşenler silinecek mi, yalnız çizilmeyecek mi | R38, AC-54 |
| Ö-11 | Önemli | Kanıt aracında altı ekran sessizce yanlış görüntü üretir | R42, AC-57, kanıt tablosu |
| Ö-12 | Önemli | Aynı sekmede iki ayrı makina başı pay, ayrım tek taraflı | R34, AC-38/5 |
| Ö-13 | Önemli | Yeni kalıcı alanın adı ve şekli belirsiz | R36, AC-45, AC-45/3 |
| Ö-14 | Önemli | Anlık görüntüyü kim yazar, ay tablosunu kim verir | R37, AC-45/2 |
| Ö-15 | Önemli | Sıfır havuzun yalnız bir nedeni kapsanmış | R33, AC-38/4, X9 |
| Ö-16 | Önemli | Rehberde altı atıf ve bir ad tuzağı | R43, AC-58, rehber tablosu |
| K-17 | Küçük | Atama sütunu kalkınca üç sütun genişliği kayar | R10, AC-12 |
| K-18 | Küçük | Kalem listesinin dört prop'u ve iki memosu ölü kalır | R40, AC-55 |
| K-19 | Küçük | Context tablosunda bir satır atfı yanlış | tablo düzeltildi |
| K-20 | Küçük | AC-46 motorun yardımcılarını da kapsıyor görünüyor | C18, AC-46 |
| K-21 | Küçük | DoD'deki çeviri anahtarı satırının dayanağı yok | DoD satırı değişti |
| K-22 | Küçük | Parti ekranının başlık cümlesi de eski modeli anlatıyor | R35, AC-38/6 |
| K-23 | Küçük | Kanıt eşlemesinde üç tarihsel ekran adı duruyor | Bilinen tuzaklar'a not |

---

## Karar kaydı (plan onayı 2026-10-17, revizyon 3)

| No | Konu | Karar |
|---|---|---|
| K1 | Görünmeyen atamanın doğrulama hatası kaydı kilitler | Atama taşıyan kalemde hata/uyarı yok, biçim çözülür, iki tutarlılık kuralı kalır (R5/3) |
| K2 | 0089 altını düz metin, atama hücreleri ayıklanamaz | Kalem listesi ve tam metin için ek `0090-ekran-once.json`; 0089 altını yenilenmez (C16) |
| K3 | Ağırlıklı bölme kuralının yeri | Yeni motorda; eski dosyaya dokunulmaz; eşdeğerlik testle (R37/3) |
| K4 | Ay haritasının kapsamı | Yürürlükten en geç aya; eksik ayda kayıt reddi (R36/2) |
| K5 | Durum önceliği | baslamadi → makinaYok → yururlukOncesi → rolYok → tamam (R37/2) |
| K6 | AC-52'nin 2 sn sınırı | Sınır kalır; aşarsa ay önbelleği |
| K7 | Rehber analistin | Düzeltilir, PDF'ler üretilir, commitlenmez; AC-58 el ölçümü |
| K8 | Parti hesabının yeri | Makina Maliyeti ekranı (`useMemo`, `useBugun`) |
| K9 | Eski kapalı partilerin değişim kutusu susar | Sürüm notunda söylenir |
| Ek | Spec tablosunun saymadığı on test dosyası ve doğrulayıcı kriterleri | Kırılan yerler ve ters çevrilen kriter tablolarına eklendi |

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
