# 0097 — Makina maliyeti üretim tarihindeki parça maliyetiyle hesaplanır

| | |
|---|---|
| **Durum** | Onaylandı (revizyon 4, uygulama planı onayı 2026-10-20) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog › Yedek Parça (maliyet alanı, hammadde kırılımı, yeni geçerlilik tarihi ve geçmiş listesi), Makina Maliyeti › Parti Hesabı (satırlar, satır anahtarı, genel gider payı sütunu ve sütunun ayrım ibaresi, özet, tedarik karşılaştırması), Makina Maliyeti'nin üst ibaresi (dört görünümün hepsinde çizilir); saf motorlar `urunAgaci`, `makinaStandartMaliyet`, `parcaAktarma` (içe aktarma); `electron/db.cjs` parça okuma ve yazma yolu; `docs/evidence/kanit-eslemesi.json` (parça kartı ve bütün `maliyet-*` ekranları) |
| **Bağımlı spec'ler** | 0087 (parça alış maliyeti ve ürün ağacı), 0096 (hammadde kırılımı ve maliyetin tek okuma yolu), 0088 (standart maliyet motoru ve Parti Hesabı), 0090 (parti genel gider payı, `partiGenelPaylari`), 0002 (üretim tarihi zinciri, `makinaListesi`), 0091 ve 0093 (aynı ekranın son iki işi, kanıt tabanı), 0092 (kıyas fikstürü `partiHesabi` çıktısını taşıyor) |
| **Ters çevrilen kriterler** | 0088 R28 ve B-7 kararı (parti hesabı hesap ayarlarının payını kullanır), 0090 R34 ve AC-38/5 (pay ayrım ibaresi, "ikisi toplanmaz"); ayrıntı "Ters çevrilen kriterler" bölümünde |

---

## Intent

Parça maliyeti bugün tarihsiz tek bir rakam. Bir parçanın maliyeti 10 TL'den 15 TL'ye çıkınca
**5 ay önce kapanmış partinin** standart maliyeti de 15 TL'den hesaplanmaya başlıyor, çünkü motor her
çizimde parçanın güncel değerini okuyor. Satış tarafı dondurulmuş (fatura bedeli kayıtta saklı), maliyet
tarafı bugünün parası: ikisinin farkı kâr değil, kâr eksi aradaki maliyet artışı. Hata tek yöne çalışır,
kâr olduğundan küçük görünür ve zam büyüdükçe kârlı bir parti zararlı görünebilir.

Takım Yöneticisi'nin istediği kural: **bir makinanın standart direkt maliyeti, o makinanın üretildiği
tarihte geçerli olan parça maliyetleriyle hesaplanır.** 15 TL yalnız o tarihten sonra üretilenleri
etkiler. Yani belirleyici olan partinin kapanışı değil makinanın üretim tarihidir: 2026-01'de üretilmiş
bir makina, partisi hâlâ açık olsa bile 10 TL'den hesaplanır.

Aynı kayma maliyetin öteki yarısında da var ve enflasyondan bağımsız: Parti Hesabı'nın genel gider payı
partinin kendi aylarından değil Hesap Ayarları'na girilmiş dönemden geliyor (ölçüm 6). Dönem kilitli
doğru hesap aynı ekranda zaten çalışıyor ve bu görünüme verilmiyor. Maliyetin parça tarafını tarihe
oturtup genel gider tarafını yanlış dönemde bırakmak işi yarım yapar, bu yüzden ikisi tek spec'tedir.

Başarı: parça maliyeti değiştiğinde geçmiş makinaların maliyeti değişmesin; Parti Hesabı bir modelin
farklı maliyetle hesaplanan makinalarını ayrı satırda, hangi ay aralığı olduğunu yazarak göstersin; parti
kârı satış bedeliyle **aynı dönemin** maliyetini karşılaştırsın; fiyatlama ekranı (Model Maliyetleri)
bugünkü maliyetle çalışmaya devam etsin.

---

## Requirements

### Verinin tarihlenmesi

- **R1.** Parça kaydı maliyetin tarihli geçmişini taşır: her kayıt bir geçerlilik tarihi ve o tarihten
  itibaren geçerli birim maliyettir. Birim **kuruştur** (motorun birimi; TL'ye çevirme yalnız biçimlemede).
- **R1/2.** Geçmişin ilk kaydının geçerlilik tarihi **boştur** ve "başlangıçtan beri" anlamına gelir.
  Bir maliyetin ne zaman yürürlüğe girdiği geçmişe dönük bilinemez; boş tarih bunu dürüstçe söyler ve
  tarihli okumada hiçbir sorgu tarihi kayıtsız kalmaz.
- **R1/3.** (QA B-4.) Alan ve satır şekli yazılıdır, 0096 R25'in emsali: kalıcı alan
  **`parts[].maliyetGecmisi = [{ gecerli, kurus }]`**; satır kimliği taşımaz, dizi **eskiden yeniye
  sıralıdır**, `gecerli` ilk kayıtta `""` ("başlangıçtan beri") diğerlerinde `"YYYY-AA-GG"`, `kurus`
  tamsayıdır. Veritabanı sütunu `parts.maliyetGecmisi TEXT` (JSON), boş liste NULL ve gövdeye yazılmaz
  (`hammaddeler`'in deseni: `db.cjs:529` `hammaddeYaz`, okuma `:1397`). **Birim asimetrisi yazılıdır:**
  bu dizinin birimi kuruş, kardeş `parts.maliyet` alanının birimi TL'dir; iki alan hiçbir yerde toplanmaz.
- **R2.** Maliyetin **tek okuma yolu** bugünkü iki fonksiyondur (`urunAgaci.parcaMaliyetKurus` ve
  `parcaMaliyetiVar`, 0096 C1) ve tarih parametresi **aynı fonksiyonun uzantısıdır**. Tarih verilmeyen
  çağrı bugünkü çözülmüş maliyeti döndürür ve davranışı birebir değişmez.
- **R3/2.** (Plan P5, karışık sürüm.) Tarihli okuma son kaydın saklı kuruşunu **okumaz**: sorgu tarihi son kaydın
  aralığına düşüyorsa sonuç bugünkü çözülmüş değerdir. Yazıcı da "değişti mi" kararını eski kaydın çözülmüş değeriyle
  verir ve yazarken son kaydı ona eşitler. Böylece R3 kurgu gereği sağlanır: güncellenmemiş bir istemci maliyeti
  geçmişe yazmadan değiştirse de iki okuma yolu ayrışmaz. Güncellenmemiş sunucu sütunu tanımadığı için geçmişi düşürür;
  sürüm notu önce sunucu PC'yi güncellemeyi söyler.
- **R2/2.** Tarihli okuma kuralı KDV oranı emsalinin aynısıdır (`utils.getKdvRateForDate`): kayıtlar
  tarihe göre sıralanır, geçerlilik tarihi sorgu tarihinden büyük olmayan **en son** kayıt uygulanır.
- **R2/3.** Parçanın hiç geçmiş kaydı yoksa tarihli okuma bugünkü çözülmüş maliyete düşer. Maliyeti hiç
  değişmemiş parça her tarih için aynı değeri verir; göç gerekmez.
- **R2/4.** (QA Ö-8.) Emsalden **bilinçli bir sapma** var: `utils.getKdvRateForDate` sorgu tarihi boşken
  (`d = dateStr || ""`) ve bütün kayıtlardan eskiyken **en eski** kaydı uygular (`utils.js:299-307`).
  Burada öyle olmaz: tarihli okuma boş ya da biçimsiz tarihte **bugünkü çözülmüş maliyeti** döndürür ve
  boş tarih tarihli okuyucuya hiç verilmez (R10 dalı tarihsiz çağrıyı kullanır). Gerekçe ölçüm 4'tedir:
  `makinaListesi` tarihi çözülemeyen makinaya `uretimTarihi: ""` yazar; emsal aynen kopyalanırsa o makina
  sessizce en eski tarihsel maliyeti alır, yani Karar 3'ün tam tersi olur ve ekranda görünmez.
- **R3.** Değişmezlik: parçanın bugünkü çözülmüş maliyeti **her zaman geçmişin en son kaydıdır**. Bu
  yüzden bugünün tarihli okuması ile tarihsiz okuması aynı sonucu verir.
- **R4.** (QA Ö-10 ile netleşti.) Tek olan şey **karar motorudur**, çağrı yeri değil: `urunAgaci`'nda tek
  fonksiyon (`maliyetGecmisiYaz(eskiKayit, cozulmusK, tarih)`) kararı verir ve **iki** çağıranı vardır,
  parça kartının kayıt fonksiyonu (`PartManager.jsx:197` `hazirla`) ve içe aktarma (R20). Ekran listeye
  kendi başına dokunmaz, ikinci bir kural yazılmaz ve kaynak taraması iki çağıranı sabitler. Ölçüm 9'da
  yazılı: içe aktarma bugün `hazirla`'dan geçmiyor (`parcaAktarma.js:23` ve `:73`), yani R4 çağrı yeri
  olarak okunursa R20 ile çelişir.
- **R4/2.** Yazıcı her çağrıda çalışır: çözülmüş maliyet kayıttaki son kayıttan farklıysa yeni kayıt
  eklenir, aynıysa geçmişe dokunulmaz. Aynı geçerlilik tarihine ikinci kayıt yazılmaz, üzerine yazılır.
- **R4/3.** (QA Ö-11.) Maliyetin **boşaltılması da bir değişikliktir**: çözülmüş maliyet girilmişken
  "girilmedi"ye dönerse (elle alan boşaltıldı ve kırılımda tutarlı satır yok) geçmişe `kurus: null` kaydı
  yazılır. Tarihli okuma o tarihten sonrası için `null` döndürür, yani o makinalar bugünkü gibi "eksik"
  sayılır (`makinaStandartMaliyet.js:209` `neden: "maliyetYok"`) ve geçmiş listesinde satır "girilmedi"
  yazar. *Gerekçe:* R3'ün değişmezliği bu spec'in omurgasıdır ve C5 ona dayanır; boşaltma hiçbir şey
  yazmazsa bugünkü değer son kayıt olmaktan çıkar ve iki okuma yolu ayrışır. Reddedilen seçenek (son
  bilinen değeri korumak) kullanıcının sildiği maliyeti sessizce diriltirdi.
- **R5.** Maliyet değiştirilirken **geçerlilik tarihi kullanıcı tarafından girilir**, varsayılan bugündür.
  *(Karar 1)* Alan parça kartında maliyet alanının yanındadır ve yalnız bu düzenlemede çözülmüş maliyet
  değişiyorsa anlam taşır; değişmiyorsa yok sayılır ve geçmişe kayıt yazılmaz.
- **R5/2.** (QA K-8 ile netleşti.) Yeni parça eklenirken tarih sorulmaz ve **geçmişe kayıt yazılmaz**:
  R5/2 yalnız "tarih sorulmaz" demektir, "başlangıçtan beri" kaydı ilk değişiklikte doğar (R21) ve geçmişi
  boş parçada R2/3 birebir aynı sonucu verir. *Gerekçe:* ekleme yolu kayıt yazarsa her yeni parça bilgi
  taşımayan tek satırlık bir geçmiş taşır, AC-1 ile AC-16 yeni parçalar için yanlış olur ve AC-33'ün gövde
  karşılaştırması ikinci bir dal ister.
- **R5/3.** (QA Ö-9.) Tarih alanı **kırılımlı parçada da etkindir.** 0096 R21 gereği elle maliyet alanı
  kırılımda tutar varken pasiftir (`MaliyetAlani`, `disabled={kirilimK != null}`) ama maliyeti gerçekten
  değiştiren yol o parçada kırılım satırlarıdır; alan pasif yapılırsa tek değişim yolunun tarihi olmaz ve
  sessizce bugüne düşer, yani Karar 1'in önlemek için alındığı hata geri gelir. Alan maliyetin yanında
  kalır, etiketi "bu düzenlemede maliyet değişirse bu tarihten geçerli olur" der ve kırılımlı parçada
  bugünkü `maliyet-kirilimdan` satırının komşusu olarak çizilir. Gider yetkisi olmayan kullanıcıda alan
  çizilir ama kırılım aynen taşındığı için (0096 R17/3) çözülmüş maliyet değişmez ve geçmişe kayıt yazılmaz.
- **R5/4.** (QA K-4.) "Bugün" **yerel gündür** (`utils.yerelBugun`, parça panelinde `hooks/useBugun`),
  `today()` değil: `today()` UTC döndürür ve Türkiye'de 00:00–03:00 arası dünü verir, yani varsayılan tarih
  üç saat boyunca dün olur ya da aynı günkü meşru giriş C5'e takılır. `urunAgaci` saf modüldür ve zaman
  okumaz (`urunAgaci.js:1`), bu yüzden `bugun` parametre olarak verilir. Tarih kaydın başında **bir kez**
  çözülür ve `hazirla`'nın içinde okunmaz: o fonksiyon React güncelleyicisinin içinde çalışır ve iki kez
  çağrılabilir (karar eski kayıttan türediği için yazım bu hâlde de etkisizdir, ama saat okunursa değil).
- **R6.** (QA B-1 ile yeniden yazıldı.) Geçerlilik tarihi doğrulanır: biçim `YYYY-AA-GG`, takvimde var
  olan gün, **gelecek tarih reddedilir** (C5) ve **sondan bir önceki kaydın tarihinden önceki tarih
  reddedilir** (geçmiş sıralı kalır). Karşılaştırma hedefi son kayıt DEĞİL, sondan bir önceki kayıttır:
  son kaydın kendisiyle karşılaştırılması R7'nin düzeltme yolunu kapatırdı (aşağıda). Tek kayıtlı (boş
  tarihli) geçmişte her geçmiş tarih geçer, çünkü boş tarih her tarihten küçüktür (tuzak 6). Son kaydın
  tarihine eşit değer üzerine yazmadır, hata değildir. Hata kaydı engeller ve nedeni alanda yazar.
- **R6/3.** (Plan P2.) R6'nın "sondan bir önceki kayıt" sınırı **yalnız tarih düzeltmesine** (R7) uygulanır.
  Çözülmüş maliyet değişiyorsa sınır **son kayıttır**: eşit tarih üzerine yazar (AC-7), büyük tarih yeni kayıt ekler,
  küçük tarih reddedilir ("son kaydın tarihinden önce olamaz"). Aksi hâlde yeni kayıt son kaydın önüne eklenir ve
  dizi sırası bozulurdu (tuzak 6). Geçmiş boşken (ilk değişiklik) her geçmiş tarih geçer.
- **R6/2.** Geçmiş tarih serbesttir ve işin asıl kullanımıdır: zammı Mayıs'ta fark eden kullanıcı Şubat'ı
  girer, Şubat'tan sonra üretilen makinalar yeni maliyete geçer.
- **R7.** (QA B-1 ile yeniden yazıldı.) Son kaydın geçerlilik tarihi düzeltilebilir: tutar değişmeden
  yalnız tarih değişirse yeni kayıt eklenmez, son kaydın tarihi güncellenir. **Düzeltme geriye de
  işler** ve asıl ihtiyaç budur (R6/2'nin kullanımı: Mayıs'ta fark edilen zam için Şubat girmek); sınır
  R6'nın kuralıdır, yani sondan bir önceki kaydın tarihinden sonra olmak. *Gerekçe:* R6 son kaydın kendi
  tarihini eşik alsaydı tarih hiç geriye alınamaz, R7 kâğıt üstünde kalır ve X3 aradaki kaydı düzenlemeyi
  de yasakladığı için yanlış tarih kalıcı olurdu. Reddedilen seçenek (R6'yı aynen tutup R7'yi düşürmek)
  yanlış tarihin tek çaresini kaldırıyordu.
- **R7/2.** (Plan P3.) AC-11 ile AC-15 aynı durumu (tutar değişmiyor) iki ayrı yöne götürüyordu; ayıran şey
  kullanıcının tarih alanını **değiştirip değiştirmediğidir**. Alan açılıştaki değeriyle (bugün) kaldıysa yok sayılır
  (AC-11); kullanıcı değiştirdiyse ve geçmiş doluysa son kaydın tarihi düzeltilir (AC-15); geçmiş boşsa düzeltilecek
  kayıt olmadığı için yine yok sayılır. Bayrak formun durumudur, kayda yazılmaz.
- **R7/3.** (Triyaj 2026-10-20, bulgu 1 ve 3.) Tarih düzeltmesinde sondan bir önceki kayıtla **aynı gün de reddedilir**
  ("… tarihli kayıttan sonra olmalı"): aksi hâlde aynı güne iki kayıt düşer ve aradaki kaydın tutarı hiçbir tarihten
  okunamaz (R4/2, X3). Tutar değişirken son kayıtla aynı gün üzerine yazmadır (AC-7), değişmedi. Tutar değişmiyorsa
  **boşaltılmış** tarih alanı yok sayılır; maliyetle ilgisiz bir düzenleme tarih yüzünden engellenmez.
- **R8.** Parça kartı maliyet geçmişini **salt okunur** listeler: en yeni üstte, her satırda geçerlilik
  tarihi (ilk kayıtta "başlangıçtan beri" ibaresi) ve tutar. Geçmiş boşken bölüm çizilmez.
- **R8/2.** Geçmiş listesi gider yetkisi istemez (maliyet alanının kendisi de istemiyor); yalnız hammadde
  kırılımı 0096 R17'deki kapıda kalır.
- **R8/3.** (QA K-5.) Biçim ve sıra yazılıdır: saklama sırası R1/3 gereği **eskiden yeniye**, liste **ters
  çizilir** (en yeni üstte), tutar `urunAgaci.maliyetMetniKurus` ile biçimlenir (parça kartının zaten
  kullandığı kuruş biçimleyicisi, `urunAgaci.js:43`) ve "başlangıçtan beri" ile R4/3'ün "girilmedi"
  ibareleri `urunAgaci`'ndan **dışa verilen sabitlerdir** (0093 R11'in emsali), ekran metni değil. Testler
  metni sabitten okur.

### Hesap

- **R9.** Bir makinanın standart direkt maliyeti **üretim tarihinde geçerli** parça maliyetleriyle
  hesaplanır. *(Karar 2)* Tarih bugünkü üretim tarihi zincirinden okunur (`makinaMaliyeti.makinaListesi`,
  ölçüm 4); yeni bir tarih alanı açılmaz.
- **R9/2.** (QA B-2.) Tarihli maliyeti **motor hesaplar, ekran değil**, ve imza bunun için değişir:
  `partiHesabi` tarihli hesabın girdisini alır (`parts` ve iki model dizisi, ya da `modelMaliyetiOlustur(tarih)`
  üreteci) ve `modelMaliyeti`'ni belirgin **(model, üretim tarihi)** grubu başına kendi içinde çağırır.
  Bugünkü `modeller` parametresi **aynen kalır** ve bugünkü liste olarak iki işe hizmet eder: plan
  penceresi (`PartiHesabi.jsx:47`, `:49`, `:63`, `:66`, `:67` hepsi onu okuyor) ve planlanan satırların
  bugünkü maliyeti (R11). *Gerekçe:* gruplama (R12) bir hesaptır ve 0088'in "ekran çarpım yapmaz" kuralı
  onu motora koyar; `modeller`'i bugünkü liste olarak bırakmak R11 ile R15'in zaten ihtiyacı olan şeydir ve
  Model Maliyetleri'ne dokunmaz. Reddedilen seçenek (çağıran tarih → model haritası kurar) `makinaListesi`'ni
  bileşende ikinci kez kurmayı gerektiriyordu, çünkü üretim tarihleri ancak o liste kurulduktan sonra bilinir.
- **R9/3.** (QA Ö-12.) R9 **özetin ve tedarik karşılaştırmasının** rakamlarını da kapsar: satılmış
  makinanın standart maliyeti kendi üretim tarihinin direkt maliyeti artı **kendi** genel gider payıdır
  (`makinaPaylari`'ndan; payı yazılmayan durumlarda sıfır, R18'in nedeniyle), tedarik karşılaştırmasının
  standart direkt maliyeti de satırların tarihli direkt maliyetlerinden toplanır. Bugün ikisi de bugünkü
  maliyetle ve hesap ayarlarının payıyla hesaplanıyor (`makinaStandartMaliyet.js:306`, `:311`). *Gerekçe:*
  AC-24 aksi hâlde maddelerden uygulanamaz ve payı belirsiz bırakmak partinin başlık kâr rakamında "tek
  sayıda iki dönem" hatasını yeniden açar. Tedarik karşılaştırması ise gider ile standart maliyetin
  bilerek aynı aylardan okunduğu tek yerdir; oraya bugünkü maliyeti geri karıştırmak ölçüm 6'nın kendi
  gerekçesini bozardı.
- **R9/5.** (Plan P7.) Özette her satılmış makina, modelinin planlanan adedi olsa da, **kendi** üretim tarihinin
  direkt maliyeti ve kendi payıyla sayılır (AC-24). Tablo planlanan modeli bugünkü maliyetle çizdiği için (R12/3) bu
  modelde tablo ile özet ayrışabilir; ayrışma motorda yorum olarak yazılıdır.
- **R9/4.** (QA Ö-7.) Üretim tarihi **tek zincirden ve tek girdiden** çözülür: `partiHesabi` da parti
  payıyla aynı müşteri dizisini (ham, çöptekiler dahil) alır. Bugün ikisi ayrışıyor (ölçüm 9): pay hesabı
  ham diziyi alıyor, maliyet hesabı canlı diziyi; stoğa dönen makinanın özgün tarihi yalnız çöpteki
  müşteriden çözülebildiği için o makina pay tarafında gerçek tarihe, maliyet tarafında
  `URETIM_KAYNAK.BILINMIYOR`'a düşüyor. *Gerekçe:* R9'un tarihi ile R16/2'nin payı makina başına
  birleştiriliyor (`makinaPaylari[].anahtar`), dolayısıyla tek makina listesinden gelmeleri gerekir; aksi
  hâlde R10 dalı tarihi aslında bilinen makinalar için çalışır ve 0088 R9/3'ün "tek zincir" kuralı kırılır.
- **R10.** Üretim tarihi çözülemeyen makina (`URETIM_KAYNAK.BILINMIYOR`) bugünkü maliyetle hesaplanır ve
  satırda nedeni yazar. *(Karar 3)* Hesaptan düşürülmez, çünkü partinin maliyetini sessizce eksiltir.
- **R10/3.** (Plan P10.) Tarihsiz sayılan makina: üretim kaynağı `URETIM_KAYNAK.BILINMIYOR` **ya da** üretim tarihinin
  ilk on karakteri `YYYY-AA-GG` biçiminde değil. İkisi de R10 dalına gider.
- **R10/2.** (QA Ö-13.) Tarihi çözülemeyen makinalar **her zaman kendi satırında** toplanır, bugünkü
  maliyeti başka bir grupla aynı çıksa da birleşmez; o satır ay aralığı yazmaz, yerine nedenini yazar.
  *Gerekçe:* bir satırda ya ay aralığı ya neden olur; ikisini birleştirmek R12/2'nin aralığıyla R10'un
  nedenini aynı hücrede çeliştirir ve kullanıcı bazı makinaların bugünün parasıyla fiyatlandığı işaretini
  kaybeder.
- **R11.** Partinin planlanan adetleri için maliyet, parti **açıksa bugünkü** maliyettir *(Karar 4)*,
  parti **kapanmışsa bitiş ayının son günündeki** maliyettir *(Karar 6)*. Böylece kapanmış partinin bütün
  satırları aynı dönemin parasıyla olur, açık partide ise henüz üretilmemiş adet ileriye dönük fiyatlanır.
- **R11/2.** (QA K-3.) "Kapanmış"ın tek ölçütü `partiGenelPaylari`'nın **`acik`** alanıdır
  (`makinaStandartMaliyet.js:434`, `acik: !p.bitisAy`), yani `bitisAy` dolu olmak. Kayıt ayrıca
  `kapanmaZamani` taşır ve o ölçüt alınmaz: iki alan aynı parti için iki cevap demektir, pay tarafı zaten
  `bitisAy`'a karar vermiştir, maliyet tarafı onu izler. R11, R17 ve Karar 6 bu alanı okur.
- **R12.** Parti Hesabı'nda aynı modelin farklı maliyetle hesaplanan makinaları **ayrı satırda** görünür.
  Satır kaç adet olduğunu ve hangi ay aralığında üretildiğini yazar; maliyeti aynı çıkan makinalar tek
  satırda toplanır (makina başına satır açılmaz).
- **R12/6.** (Plan P9.) "Maliyeti aynı" ölçütü direkt maliyet **ve** eksik parça sayısının birlikte aynı olmasıdır:
  rakamı aynı ama eksiği farklı iki grup ayrı satırdır, ki "eksik" rozeti yalan söylemesin. (Triyaj bulgu 5, bilinçli.)
  Gruplama dönem ardışıklığına bakmaz: maliyeti eski değerine dönen makinalar (10 → 15 → 10) tek satırda toplanır ve satırın
  ay aralığı aradaki dönemi de kapsar.
- **R12/2.** Satırın ay aralığı o satırın makinalarının en eski ve en yeni üretim ayıdır; tek ay ise tek
  ay yazılır. Planlanan satır ay aralığı taşımaz, bugünkü "planlanan" rozetini korur.
- **R12/3.** (QA Ö-5.) Bölme **yalnız planlanan adedi olmayan modellere** uygulanır. Planlanan adet
  bugünkü anlamını korur ("bu modelden partide toplam bu kadar olacak") ve o model için tek satır kalır;
  bugünkü motorda da planlanan adet türetilen makinaların yerine geçiyor
  (`makinaStandartMaliyet.js:276`). *Gerekçe:* planlanan adet üretilmiş makinaları zaten kapsadığı için
  planlanan satırın yanına maliyet satırları eklemek partinin üretimini iki kez sayar ve 0088'in model-adet
  kuralını sessizce değiştirir. Seçilen okumanın bedeli, planlanan modelin üretilmiş makinalarının bugünkü
  maliyetle fiyatlanmasıdır; bu da "planlanan" rozetiyle ve R11'in metniyle görünür.
- **R12/4.** (QA Ö-3.) Satırın kimliği motordan gelir: satır kendi **`anahtar`**'ını taşır (model artı grup
  sırası, ör. `AK100#1`), ekran `key` ve `data-testid="parti-satiri-<anahtar>"` olarak onu kullanır. Tek
  gruplu modelin anahtarı **yalın model adıdır** ki bugünkü üç test çağrısı geçerli kalsın
  (`makina-maliyeti-0088`, `uretimdeki-modeller-0091`, `plan-adetler-0093`); planlanan satır işaretlenir
  (`<model>#plan`). **Plan P4 ile değişti:** planlanan satırın anahtarı da **yalın model adıdır** (R12/3 gereği
  planlanan model tek satırdır, çakışma olamaz; işaret satırın `planlanan` alanında ve rozette durur);
  `makina-maliyeti-0088.test.jsx:202` planlanan satırı `parti-satiri-AK100` ile arıyor. *Gerekçe:* bugünkü `key={r.model}` (`PartiHesabi.jsx:106`) aynı model birden çok satıra
  ayrıldığında çakışır (tuzak 1) ve anahtarı üreten şey gruplama olduğu için motora aittir (0090'ın
  `makinaPaylari[].anahtar`'ıyla aynı gerekçe).
- **R12/5.** (QA K-7.) `turetilenAdet`'in anlamı satır türüne göre tanımlıdır: bölünen satırda satırın
  kendi makina sayısıdır ve `adet`e eşittir, planlanan satırda bugünkü anlamını korur (modelin partiye
  bağlı makina sayısı). *Gerekçe:* anlamı satır türüne göre değişen alan, sonradan sessizce başka bir
  hücreye düşen şeydir.
- **R13.** Partinin toplam standart maliyeti satır toplamlarının toplamıdır; satırlara bölünmeden önceki
  rakamla kuruş kuruş aynı kalmaz, çünkü girdiler artık farklıdır. Değişmeyen şey toplamın satırlardan
  türemesidir: ekran kendi başına çarpım yapmaz (0088 C'nin kuralı korunur).
- **R14/2.** (Plan P6.) Satırın önerilen cirosu satırın **toplam maliyetinden** türer (`round(toplam maliyet ×
  katsayı)`), birim öneri × adetten değil: artık kuruş yüzünden ikisi ayrışabilir ve R13 toplamın satırlardan
  türemesini ister. Birim öneri yalnız gösterimdir.
- **R14.** Önerilen satış fiyatı satırın kendi maliyetinden türer; kâr katsayısı modelin **bugünkü**
  katsayısıdır (tarihlenmez, X2). Böylece eski satır "o tarihte hangi fiyatı vermeliydik" sorusunu
  bugünkü kâr hedefiyle cevaplar.
- **R15.** Model Maliyetleri görünümü **bugünkü** maliyetle çalışmaya devam eder. *(Karar 5)* Parça
  listesinin maliyet hücresi, "maliyeti girilmemiş" sayacı, hammadde kırılımının kaynak ibaresi ve
  parça dışa aktarması da bugünkü değeri okur; çıktıları birebir değişmez.

### Genel gider payı

- **R16.** Parti Hesabı'nın genel gider payı partinin **kendi aylarının** havuzundan gelir
  (`makinaStandartMaliyet.partiGenelPaylari`, spec 0090'ın dönem kilitli hesabı), Hesap Ayarları'nın
  döneminden değil. Aynı parti için iki görünüm (Parti Hesabı ve Üretim Partileri) artık aynı rakamı
  gösterir.
- **R16/2.** Satırın genel gider payı o satırın makinalarının paylarının toplamıdır
  (`partiGenelPaylari`'nın makina başına paylarından); birim sütunu partinin makina başı payını yazar.
  Artık kuruş yalnız toplamda görünür ve partinin havuz toplamı değişmez (0090 R15 korunur).
- **R16/3.** (QA Ö-4, tuzak 5.) Satırın pay toplamı makina paylarının **toplamıdır**, birim pay ile adedin
  çarpımı değil: artık kuruş ilk üretilen makinada durduğu için (`makinaStandartMaliyet.js:427-428`) artığı
  taşıyan satırda birim × adet ile toplam birbirine eşit çıkmaz. Ekran bu yüzden çarpım yapmaz ve sütun
  ibaresi birim rakamın partinin makina başı payı olduğunu, artığın toplamda göründüğünü söyler.
- **R17.** Planlanan adet satırının genel gider payı: **açık partide Hesap Ayarları'nın payı, kapanmış
  partide partinin makina başı payı.** *(Karar 7, onaylandı)* Satır payın kaynağını söyler.
- **R17/2.** (QA Ö-6.) R18'in "pay yazılmaz" kuralı **yalnız türetilen satırlara** uygulanır; planlanan
  satır her durumda R17'nin kuralıyla payını alır. *Gerekçe:* `partiGenelPaylari` başlangıcı gelecekte olan
  partiye `BASLAMADI` durumu ve pay yazmıyor, ama bu tam olarak bu ekranın asıl kullanım hâlidir (henüz
  başlamamış partiyi planlanan adetle fiyatlamak, `PartiHesabi.jsx:96` `bos-parti` metni bunu söylüyor) ve
  Karar 7 (b) seçeneğini zaten bu nedenle reddetti. R18 daraltılmazsa iki kural aynı hücre için zıt cevap
  verir ve onaylanan karar geri alınır.
- **R18.** (QA Ö-6 ile daraltıldı.) Durumu "başlamadı", "makina yok", "yürürlük öncesi" ya da "rol yok"
  olan partide **türetilen satırların** payı yazılmaz ve nedeni görünür (0090 R37/2'nin durum önceliği
  korunur). Neden satırın hücresinde değil tablonun üstünde tek bilgi satırı olarak çizilir; planlanan
  satır R17/2 gereği payını almaya devam eder.
- **R18/2.** (Plan P8.) Payı yazılmayan türetilen satırda pay hücresi "—" yazar ve satırın toplamında pay sıfır
  sayılır (R9/3'ün "sıfır"ı). Kapanmış ama makinası olmayan partide planlanan satırın payı da "—"dır (makina başı pay
  yok) ve satırın pay kaynağı ibaresi bunu söyler. (Triyaj bulgu 2.) Kapanmış partinin durumu "tamam" değilse (makina yok,
  rol yok, yürürlük öncesi) planlanan satırın payı da yazılmaz, satır nedeni (`payNeden`) pay kaynağı yerinde gösterir;
  tablonun üstündeki neden satırı "pay yazılmayan satır var" ölçütüyle çizilir (yalnız planlanan satırlı partide de).

### Metin, aktarma ve değişmeyenler

- **R19.** Makina Maliyeti ekranının üst ibaresi (`MakinaMaliyeti.jsx:19` `BUGUNKU_AYAR_IBARESI`) yeniden
  yazılır. Bugün "bir parçanın maliyeti değişince kapanmış partilerin rakamı da değişir" diyor; bu artık
  doğru değil. Yeni metin neyin bugünkü ayarlardan geldiğini (gider türü rolü, varsayılan üretim adedi ve
  dönem) ve bunların **yalnız Model Maliyetleri ile planlanan adet satırlarını** etkilediğini söyler.
- **R19/2.** (QA Ö-1.) Aynı iş pay sütununun ayrım ibaresine de yapılır: `PAY_AYRIM_IBARESI`
  (`PartiHesabi.jsx:17`, sütun başlığında `:101`) bugün "Hesap ayarlarının dönemi ve varsayılan adediyle;
  Üretim Partileri'ndeki pay partinin kendi aylarından gelir, ikisi toplanmaz" diyor, yani R16'nın tam
  tersini. Yeniden yazılır (iki görünümün artık aynı payı gösterdiğini ve sütunun partinin kendi aylarından
  geldiğini söyler, R16/3'ün artık kuruş cümlesiyle birlikte); sabitin adı ve `pay-ayrim-ibaresi` testId'si
  korunur. *Gerekçe:* bu cümle kullanıcının o sütun hakkındaki tek açıklaması; bırakılırsa ekran kendi
  rakamıyla çelişir, yani R19'un düzelttiği hatanın aynısı ikinci sütunda kalır. Sabiti ve testId'yi
  korumak `tests/ui/parti-genel-payi-0090-app.test.jsx:100-103`'ü tek satırlık bir ters çevirmede tutar.
- **R20.** Parça içe aktarmasında değişen maliyet **içe aktarma gününden** geçerli sayılır (R5'in
  varsayılanı); şablona tarih sütunu eklenmez (X5). Değer değişmiyorsa geçmişe kayıt yazılmaz.
- **R20/2.** (QA Ö-10.) İçe aktarma kararı R4'ün tek motorundan verir ve **saf kalır**:
  `parcaSatirlariniCoz` dördüncü parametre olarak `bugun` alır (varsayılanı yoktur, çağıran `yerelBugun`
  verir, R5/4) ve geçmişi elindeki `mevcut` kaydından türetir (`parcaAktarma.js:34`). Uygulama kolu
  `{ ...x, ...guncel }` olduğu için (`:73`) geçmiş yazılmayan satırda eski hâliyle korunur. *Gerekçe:*
  modül bugün zaman okumuyor ve okumamalı; **Plan P11:** parametre zorunludur, verilmezse anlamlı bir hata fırlatılır
  ve eski test çağrıları "spec 0097 ile" notuyla güncellenir; `bugun` parametresi olmadan R20'nin "içe aktarma günü" kuralı
  ya saf olmayan bir çağrıyla ya `parcaAktarma.js` içine yazılacak ikinci bir kuralla uygulanırdı.
- **R21.** Göç yok: mevcut parçaların geçmişi boştur, ilk maliyet değişikliğinde eski değer
  "başlangıçtan beri" kaydı olarak yazılır ve yeni değer girilen tarihten geçerli olur.
- **R21/2.** (Plan P1.) Geçmişi boş parçada maliyetin **ilk kez girilmesi** ("girilmedi" → değer) bir değişiklik
  değildir ve geçmişe kayıt yazmaz: ilk giriş başlangıçtan beri geçerlidir (R5/2 ile aynı mantık, bilgi taşımayan kayıt
  doğmaz). Aksi hâlde beta verisinde maliyeti hiç girilmemiş parçaların doldurulması bütün geçmiş partileri tarihli
  okumada "eksik" bırakırdı. Değer → "girilmedi" (R4/3) ve dolu geçmişte "girilmedi" → değer yazılmaya devam eder.
- **R22.** Yeni izin, yeni veri bölümü, yeni sunucu kuralı ve yeni kilit alanı yok.

---

## Constraints

### Uyulması zorunlu

- **C1.** Maliyetin tek okuma yolu korunur (0096 C1). Tarih parametresi aynı fonksiyonun uzantısıdır;
  ikinci bir maliyet çözücü yazılmaz ve `parts[].maliyet` ile kırılım tutarları hiçbir ekranda doğrudan
  toplanmaz. Kaynak taraması 0096'dan devralınır ve yeni fonksiyon adını kapsar.
- **C1/2.** (QA K-1.) Devralınan tarama **sayılı** ve bir regex'i var: `tests/hammadde-0096.test.js:206-212`
  dosya başına `.maliyet` okuma sayısını sabitliyor (`urunAgaci.js: 2`, `PartManager.jsx: 4`,
  `makinaMaliyeti.js: 2`) ve `makinaStandartMaliyet.js`'te `/parcaMaliyetKurus\(p\)/` arıyor; çağrı tarih
  argümanı alınca o regex düşer. İkisi de bu spec'le güncellenir (gevşetilmez, yeni sayılar ve yeni
  imzanın deseni yazılır) ve R1/3'te seçilen alan adı `/\.maliyet\b/` ile eşleşmez (`maliyetGecmisi`
  eşleşmiyor). *Gerekçe:* sayılı tarama tek okuma yolunun ev güvencesidir; sessizce gevşetmek asıl kayıp olur.
- **C2.** Geçmişte saklanan kuruş, 0096 C2'nin "toplam saklanmaz" kuralının **bilinçli istisnasıdır**.
  Bugünkü maliyet hâlâ türetilir (kırılım toplamı ya da elle girilen değer); dondurulan yalnız geçmiş
  kayıttır, çünkü geçmişi türetecek veri yok. Bu istisna spec'te yazılıdır ve başka yere genişletilmez.
- **C3.** Yeni kalıcı alan dört nokta kuralından geçer (`SCHEMA_SQL`, `applyColumnMigrations`, `INSERT`,
  okuma) ve boş değer gövdeye **yazılmaz** (`hammaddeler`'in deseni, 0096 C3/2): her parçaya `null`
  konursa sunucu karşılaştırması her kaydı değişmiş görür.
- **C4.** Tarih verilmeyen bütün çağrılar spec öncesiyle birebir aynı sonucu verir: Model Maliyetleri,
  parça listesi, "girilmemiş" sayacı, dışa aktarma hücresi ve `modelMaliyetleri`'nin seçeneksiz çıktısı.
  Kıyas fikstürüyle ölçülür (0096 ve 0092 deseni).
- **C5.** Gelecek tarihli maliyet yazılamaz. R3'ün değişmezliği buna dayanır: ileri tarihli bir kayıt
  bugünkü değerle son kaydı ayrıştırır ve iki okuma yolu çelişir. İleri tarihli zam girişi X4'tedir.
- **C6.** Birleştirme kuralı değişmez: `parts` 0077'den beri birleşir ama yalnız **eklemeler** geri
  uygulanır, var olan parçanın geçmiş düzenlemesi çakışmada sunucu kopyasına yenilir. Bilinen sınır,
  yeni remap gerekmez (geçmiş parça kaydının içindedir, başka bölüme kimlik taşımaz).
- **C7.** Ürün ağacı tarihlenmez: kit adetleri, ek maliyet kalemleri ve kâr katsayısı bugünkü hâliyle
  okunur. Eski makina bugünkü kitle, o tarihteki parça maliyetiyle hesaplanır. **Parça kaydının çöp durumu
  da tarihlenmez** (QA K-9, bilinen sınır): motor kit döngüsünden önce çöptekileri atıyor
  (`makinaStandartMaliyet.js:200` `parcaHaritasi`), yani 2026-01'de üretilmiş makinanın 2026-05'te silinmiş
  parçası tarihli okumada da "eksik"tir. Bu, "geçmiş donmuştur" cümlesinin doğru olmadığı tek yerdir ve
  yazılması R9'un ileride "silinmiş parçanın maliyetini geri getir" diye okunmasını önler.
- **C8.** Kuruş tamsayısı ve artık kuruş kuralları korunur: parti payında artık en önce üretilen makinaya
  (0090 R15), model havuzunda bugünkü sıra.
- **C9.** Göç yok, veri silinmez, hiçbir parçanın bugünkü maliyeti bu işle değişmez.
- **C10.** `parts` bölümü `stockActions` grubunda kalır; 0087 C7'nin bilinen sınırı sürüyor (stok eylemleri
  açıkça kısıtlanmış kullanıcı parça kaydını yazamaz).
- **C11.** Parti Hesabı yeni ağır hesap kurmaz: dönem kilitli pay aynı ekranda zaten hesaplanıyor
  (ölçüm 6), bu görünüme geçirilir.
- **C12.** (QA K-6.) Tarihli hesap **makina başına değil belirgin (model, üretim tarihi) başına** yapılır ve
  Parti Hesabı'nın süresi 0088'in ölçtüğü eşiğin içinde kalır (0088 C9'un süre ölçümü, 0090 AC-52'nin çağrı
  sayımı emsalleri). **Plan P12:** 0088'de süre testi yok (oradaki C9 sunucu kuralıdır); eşik 0090 AC-52'nin
  emsaliyle 2 sn, çağrı sayısı `urunAgaci.parcaMaliyetKurus`'un tarihli çağrılarından ölçülür (beklenen: belirgin
  (model, gün) sayısı × kit satırı). *Gerekçe:* aşikâr uygulama (makina başına `modelMaliyeti`) kit döngüsünü makina
  sayısıyla çarpar ve hiçbir şey kazandırmaz; evin bu motorda ölçüm alışkanlığı var.
- **C13/2.** (Plan P14.) Paylaşılan kanca `useSimpleDefList` geriye dönük uyumlu genişler: `hazirla(kayit, eski, ek)`,
  `add(ek)`, `saveEdit(ek)`. `eski` güncelleyicinin içindeki kayıttır (C13 bunun üstüne kurulur), `ek` kaydın başında bir
  kez çözülmüş tarih bilgisidir (R5/4). Yalnız PartManager `hazirla` verir; KalipManager ve CalisanManager etkilenmez.
- **C13/3.** (Triyaj bulgu 4.) Kayıt fonksiyonunun geçmiş adımı (`urunAgaci.gecmisliKayit`) karar hata dönerse null verir ve
  güncelleyici kaydı **hiç değiştirmez**: doğrulamadan sonra kaydı değiştiren dar bir yarışta yeni maliyet tarihsiz geçmişle
  yazılmaz. Kullanıcı bu durumda düzenlemenin yazılmadığını kaydı yeniden açınca görür (bilinen sınır).
- **C13.** (QA K-10.) Kayıt fonksiyonu geçmişi **kayıttan** okur, formdan gelen kopyadan değil: form alanı
  ayrıştırılıp atılır (tuzak 3'ün uygulaması). Bugünkü kanca `startEdit({ ...k })` ile bütün kaydı forma
  kopyalıyor ve `saveEdit` `hazirla({ ...x, ...editForm, ad })` yazıyor (`useSimpleDefList.js:30`, `:38`),
  yani açılışta yakalanan geçmiş kaydın güncel hâlini eziyor. Başka bir PC araya kayıt eklediyse kaybolması
  C6 ile aynı sınıfta **bilinen sınırdır**; yönü bir kez yazmak bu birleştirme tuzağının (0095 B-3, 0096
  R7/2) üçüncü kez tekrarlanmasını önler.

### KAPSAM DIŞI

- **X1.** Kit adetlerinin ve ek maliyet kalemlerinin tarihlenmesi — *neden:* istek fiyat değişimiyle
  ilgili; ürün ağacının değişmesi ayrı bir kavram ve ayrı bir veri yapısı ister. Gerekirse ayrı spec.
- **X2.** Kâr katsayısının tarihlenmesi — *neden:* katsayı geçmişi ölçmek için değil bugünkü fiyat hedefi
  için var; eski satırda bugünkü hedefle kıyaslamak istenen okumadır (R14).
- **X3.** Geçmiş satırının silinmesi ve aradaki (son olmayan) kaydın düzenlenmesi — *neden:* gerçek
  ihtiyaç yanlış tarih girmek ve onu R7 düzeltiyor; aradaki kaydı değiştirmek geçmiş rakamları sessizce
  yeniden yazar.
- **X4.** İleri tarihli maliyet girişi ("zam 1 Kasım'da başlıyor") — *neden:* C5'teki değişmezliği bozar;
  istenirse bugünkü değerin ayrı tutulmasıyla ayrı spec.
- **X5.** Parça Excel şablonuna geçerlilik tarihi sütunu — *neden:* içe aktarma hücreleri **konuma göre**
  eşliyor (`parcaAktarma.js` başlık notu), yeni sütun yalnız sona eklenebilir ve toplu tarihli maliyet
  girişi için gerçek bir talep yok.
- **X6.** Model Maliyetleri'ne tarih seçici — *neden:* Karar 5; o ekran fiyatlama aracı, makina ve tarih
  bilmiyor.
- **X7.** Satış fiyatlarının (`fiyatTRY/USD/EUR`) tarihlenmesi — *neden:* ölçüm 7, o tarafta sorun yok;
  üç yazma yolu fiyatı seçim anında kayda kopyalıyor, eski satışlar güncel listeden etkilenmiyor.
- **X8.** Enflasyon muhasebesi, geçmiş rakamın bugünkü paraya çevrilmesi — *neden:* bu uygulamanın
  kapsamı değil; iş iki tarafı aynı dönemin parasına getirmekle bitiyor.
- **X9.** Eski maliyetlerin yedek dosyalarından geriye doldurulması — *neden:* beta, geriye dönük veri
  yok (Takım Yöneticisi, 2026-10-20); elle veri girişi önerilmez.
- **X10.** Hammadde kırılımının tedarikçi ayrıntısının geçmişi — *neden:* geçmiş yalnız çözülmüş birim
  maliyeti tutuyor (önerilen saklama modeli); "o tarihte hangi tedarikçiden ne kadardı" sorusu bu işin
  dışında ve kırılımı ayrıca tarihlemek işi birkaç katına çıkarır.
- **X11.** Model havuzu ve dönem kıyası gibi Model Maliyetleri'nin öteki rakamlarının tarihlenmesi.

---

## Context

### Ölçüm 1: maliyet bugün tarihsiz tek alan, okuma yolu tek

`parts` tablosunda maliyet iki alandır ve ikisi de tarihsizdir: `maliyet REAL` ve `hammaddeler TEXT`
(`electron/db.cjs:167`). Okuma yolu 0096'dan beri tek (`src/lib/urunAgaci.js:33` `parcaMaliyetKurus`:
kırılımda tutar varsa onların toplamı, yoksa elle girilen değer). Tarihsiz çağrıları:

| Çağıran | Yer | Bu spec'te |
|---|---|---|
| Model maliyeti motoru | `makinaStandartMaliyet.js:208` | Tarih parametresi alır (R9) |
| Parça listesi hücresi ve kaynak satırı | `PartManager.jsx:374`, `:377` | Değişmez (R15) |
| "Maliyeti girilmemiş" sayacı | `PartManager.jsx:253` | Değişmez (R15) |
| Form canlı maliyeti | `PartManager.jsx:128` | Değişmez (R15) |
| Dışa aktarma hücresi | `parcaAktarma.js:19` | Değişmez (R15) |
| İçe aktarmanın kırılım denetimi | `parcaAktarma.js:50` | Değişmez, yazım tarihlenir (R20) |

### Ölçüm 2: kapanmış parti bugünkü maliyetle hesaplanıyor ve ekran bunu zaten yazıyor

`partiHesabi` model maliyetlerini canlı listeden alıyor (`makinaStandartMaliyet.js:261`, `modeller`
parametresi `modelMaliyetleri`'nin bugünkü çıktısı). Parti kapanışında dondurulan tek şey genel gider
havuzudur (`kapanisGenelHavuzlari`, 0090). Dahası ekranın üst ibaresi bunu açıkça söylüyor:

> "Rakamlar bugünkü ayarlarla hesaplanır: gider türü rolü, varsayılan üretim adedi, dönem ya da **bir
> parçanın maliyeti** değişince kapanmış partilerin rakamı da değişir." (`MakinaMaliyeti.jsx:19`)

Yani davranış bilinen ve yazılı bir özellikti; bu spec onu değiştiriyor, dolayısıyla cümle de değişiyor
(R19). Bu, metnin kendi başına bir kabul kriteri olmasının nedeni: değişmezse ekran yanlış şey söyler.

### Ölçüm 3: eski değer hiçbir yerde durmuyor

Üç yolu da denetledim: (1) alan tek, üzerine yazılıyor; (2) `PartManager` ve `useSimpleDefList` hiç
`logAction` çağırmıyor, yani katalog parçası düzenlemesi İşlem Geçmişi'ne kayıt yazmıyor; (3) sunucunun
her yazımda yazdığı `veri_kaydedildi` satırı yalnız değişen bölüm adını taşıyor, değeri taşımıyor
(`CLAUDE.md`, denetim izi bölümü). Eski değerin durduğu tek yer o tarihten önce alınmış **yedek
dosyasıdır** (JSON yedek bütün gövdeyi taşır). Bu, geriye dönük doldurmanın neden X9'da olduğunun
gerekçesidir ve işin **şimdi** yapılmasının da: her gün bir zam daha geri getirilemez hâle geliyor.

### Ölçüm 4: üretim tarihi zinciri hazır, eksik tarih dalı da hazır

`makinaMaliyeti.makinaListesi` her canlı makinaya `uretimTarihi` ve `uretimKaynak` veriyor
(`makinaMaliyeti.js:106`). Kaynak altı değer (`URETIM_KAYNAK`, `:34`): `kayit`, `stok`, `hareket`,
`dogrudan`, `tahmin`, `bilinmiyor`. Son değer R10'un dalıdır ve yorumu zaten "maliyet hesaplanmaz"
diyor; bu spec onu "bugünkü maliyetle hesaplanır ve nedeni yazılır"a çevirir. Zincir tek yerde
(0088 R9/3, AC-49), yani yeni bir tarih çözümü yazılmayacak.

### Ölçüm 5: "tarihe göre geçerli değer" emsali kanıtlanmış

KDV oranı bu uygulamada zaten tarihli dönem listesi: `appSettings.kdvRates = [{ from, rate }]` ve
`utils.getKdvRateForDate` (`utils.js:299`) sıralayıp geçerlilik tarihi sorgu tarihinden büyük olmayan en
son dönemi seçiyor, sorgu hepsinden eskiyse en eskisini uyguluyor. R2/2 bu kuralın aynısıdır ve R1/2'nin
boş tarihi aynı davranışı daha dürüst anlatır. Yani yeni kavram değil, kanıtlanmış desenin ikinci
kullanımı (0091'in "Analiz'de Göster" emsalini kullanması gibi).

### Ölçüm 6: dönem kilitli genel gider payı aynı ekranda zaten hesaplanıyor

İki rakam var ve ikisi aynı ekranda:

| Görünüm | Pay nereden | Dönem bağı |
|---|---|---|
| Üretim Partileri | `partiGenelPaylari(veri, bugun)` (`MakinaMaliyeti.jsx:42`) | **Partinin kendi açık ayları** (0090 R14) |
| Parti Hesabı | `genelGiderPayi(veri, ayarlar, bugun).payK` (`:33`, `PartiHesabi.jsx:42`) | **Hesap Ayarları'nın dönemi**, partiyle ilgisi yok |

`partiGenelPaylari` parti başına `havuzK`, `makinaBasiK` ve **makina başına pay** (`makinaPaylari`)
döndürüyor, yani R16/2'nin ihtiyacı olan rakam hazır. Sonuç `partiSonucu` adıyla hesaplanıp yalnız
Üretim Partileri'ne veriliyor; Parti Hesabı'na geçirmek yeni ağır hesap değil (C11).

Ayrıca `PayOzeti` bu görünümde çizilmiyor (yalnız `pay.payK` okunuyor), yani kaldırılacak bir pay özeti
kutusu yok; değişen tek şey tablonun sütunu.

### Ölçüm 7: satış fiyatı tarafında sorun yok

Takım Yöneticisi'nin ilk sorusu satış fiyatlarını da kapsıyordu; ölçtüm, orada kayma yok. Parça seçildiği
anda fiyat kayda kopyalanıyor ve katalogdan bir daha okunmuyor: yedek parça satışında `birimFiyat`
(`YedekParcaSatisForm.jsx:53`, `:184`), serviste `degisenParcalar[].fiyat` (`ServiceForm.jsx:396`),
teklif satırında `subItems[].birimFiyat` (`Documents.jsx:700`). Borç ve bedel de kayıttaki değerden
hesaplanıyor (`utils.yedekParcaBedeli`). Tek dikkat noktası var olan kaydı düzenlerken parçayı yeniden
seçmek ya da para birimini değiştirmek; ikisi de bilinçli. Bu yüzden satış fiyatı X7'dedir.

### Ölçüm 8: kanıt kayıtları ve "maliyet-modeller 0 piksel" beklentisinin imkânsızlığı

**Revizyon 3 düzeltmesi (QA B-3).** İlk taslak `maliyet-modeller*` ekranlarının 0 piksel fark beklemeye
devam edeceğini, bunun da R15'in kanıtı olacağını yazıyordu. Ölçtüm, mümkün değil: `MakinaMaliyeti.jsx:53`
`BUGUNKU_AYAR_IBARESI`'ni görünüm dalının **dışında**, dört görünümün hepsinin üstünde çiziyor ve kanıt
aracı her `maliyet-*` ekranında bütün bileşeni çiziyor (`scripts/evidence/0009-sayfa.jsx:554`,
`maliyetEkrani`). Yani R19'un yeni ibaresi `maliyet-modeller`, `maliyet-modeller-dokum`,
`maliyet-katsayi-formu`, `maliyet-ayarlar`, `maliyet-uretim-partileri`, `maliyet-bos-rol`,
`maliyet-bos-ayar`, `maliyet-0092-pay`, `maliyet-0092-partiler`, `maliyet-0089-parti-degisim`,
`maliyet-0090-parti-neden` dahil hepsini değiştirir. 0 piksel bekleyen bir kayıt
`tests/kanit-eslemesi.test.js`'i kırar ve işi bloklar.

Bugünkü kayıtlar (`docs/evidence/kanit-eslemesi.json`, hepsi `beklenen: "ayni"`):

| Dosya | Kayıt | Bu spec'te |
|---|---|---|
| `PartManager.jsx` | kart ekranları: `katalog-parca`, `katalog-parca-yeni` (0087 ve 0096 tabanı), `katalog-parca-0096-kirilim`, `-tutarsiz`, `-bos`, `-hata` | **degisti** + onay (tarih alanı ve geçmiş listesi) |
| `PartManager.jsx` | liste ekranları: `ayarlar-yedekparca`, `ayarlar-yedekparca-maliyetsiz` (0087 ve 0096 tabanı), `ayarlar-yedekparca-0096-suzgec`, `-0096-yetkisiz` | **ayni** kalır: R15'in gerçek piksel kanıtı (liste hücresi değişmiyor) |
| `MakinaMaliyeti.jsx`, `ModelMaliyetleri.jsx`, `PayOzeti.jsx`, `PartiHesabi.jsx`, `UretimPartileri.jsx` | bütün `maliyet-*` ekranları (dokuz + on beş + yedi + on bir kayıt, çakışanlar dahil) | **degisti** + onay; Model Maliyetleri ekranlarında fark **yalnız ibare şeridiyle sınırlıdır** |

Yani R15'in kanıtı iki parçaya ayrılır: piksel tarafında parça **listesi** ekranları, rakam tarafında
kıyas fikstürü (AC-25) artı "Model Maliyetleri'nin farkı yalnız şerit" kriteri. İlk taslağın toptan
"`PartManager.jsx` kayıtları degisti'ye çevrilecek" ifadesi de düzeltildi: liste ekranları çevrilirse
spec'in R15 için sahip olduğu tek piksel kanıtı kaybolur.

### Ölçüm 9: iki sessiz ayrışma (QA turu)

Spec'in dışında kalmış, ölçülerek bulunmuş iki ayrışma:

| Ayrışma | Ölçüm | Sonucu |
|---|---|---|
| Müşteri dizisi | `MakinaMaliyeti.jsx:42` pay hesabına **ham** diziyi veriyor (`tumMusteriler \|\| customers`), `PartiHesabi.jsx:42` maliyet hesabına **canlı** diziyi (`:31`); `partiHesabi` kendi `makinaListesi`'ni ondan kuruyor (`makinaStandartMaliyet.js:262`) | Stoğa dönen makinanın özgün tarihi yalnız çöpteki müşteriden çözülüyor (`makinaMaliyeti.js:96-101`), yani aynı makina pay tarafında gerçek tarihe, maliyet tarafında `URETIM_KAYNAK.BILINMIYOR`'a düşüyor → R9/4 |
| Pay sütununun ibaresi | `PartiHesabi.jsx:17` ve `:101` `PAY_AYRIM_IBARESI`: "… Üretim Partileri'ndeki pay partinin kendi aylarından gelir, ikisi toplanmaz"; `tests/ui/parti-genel-payi-0090-app.test.jsx:100-103` metni ve `/toplanmaz/`'ı sabitliyor | R16 bu cümleyi yanlış yapıyor; R19 ikinci ibareyi düzeltirken bu birincisi atlanmıştı → R19/2 |

Ayrıca ölçüldü: `partiGenelPaylari`'nın `adet`i modeli katalogda bulunamayan makinaları da sayıyor
(`:412`) ama `partiHesabi` onları `bulunamayan`'a koyup satırlardan çıkarıyor (`:280`), ve planlanan adedi
olan modelin makinaları da satırlarda görünmüyor (`:276`). İkisi birden AC-27'nin "bütün satırların payı
havuza eşit" değişmezliğini sağlanamaz yapıyordu; kriter buna göre daraltıldı.

### Ters çevrilen kriterler (QA Ö-2)

Her ters çevirme eski kararın yanına kaydedilir (ev kuralı); liste olmadan plan turu hangi yeşilin
kırmızıya döneceğini bilemez ve 0092 altını işi sessizce bloklar.

| Nerede | Ne | Neden |
|---|---|---|
| 0088 R28 (`specs/done/0088…:223`) ve B-7 kararı (`:604`, "Parti hesabı hangi payı kullanır? Hesap ayarlarının payını; tek varsayım") | Parti Hesabı artık partinin kendi aylarının payını kullanır | R16, ölçüm 6 |
| 0090 R34 (`:91`) ve AC-38/5 (`:356`) | Pay ayrım ibaresi ve "ikisi toplanmaz" cümlesi | R19/2 |
| `tests/gider-kapsami-0092-kiyas.test.js:32` ve `tests/fixtures/0092-havuz-once.json` | Altının `partiHesabi` bloğu yeniden üretilir (satır şekli ve pay değişti) | R12, R16 |
| `tests/ui/makina-maliyeti-0088.test.jsx:175-202`, `uretimdeki-modeller-0091.test.jsx:244`, `plan-adetler-0093.test.jsx:198` | Satır testId'si (`parti-satiri-<anahtar>`); tek gruplu modelde çağrılar aynen geçerli kalır | R12/4 |
| `tests/hammadde-0096.test.js:206-212` | Sayılı `.maliyet` taraması ve motor regex'i | C1/2 |

Her biri test yorumunda "spec 0097 ile" notuyla işaretlenir.

### Tuzaklar

1. **Satır anahtarı model adı.** `PartiHesabi.jsx:106` satırı `key={r.model}` ve
   `data-testid="parti-satiri-${r.model}"` ile çiziyor. Aynı model birden çok satıra ayrıldığında anahtar
   çakışır (React aynı anahtarlı iki satırda sessizce yanlış satırı yeniden kullanır) ve testler satırı
   adıyla bulamaz. Anahtar satırı tek olarak ayırt edecek şekilde genişletilmeli.
2. **`hazirla` maliyeti her çağrıda siliyor.** 0096 R7/2 gereği kırılımda tutar varsa `maliyet` anahtarı
   kayıttan atılıyor (`PartManager.jsx:197`). Geçmiş yazıcısı **çözülmüş** değeri okumalı (kırılım toplamı
   dahil), ham `maliyet` alanını değil; yoksa kırılımlı parçanın geçmişi hiç yazılmaz.
3. **`{ ...x, ...editForm }` birleştirmesi.** 0096'nın dersi aynen geçerli: düzenleme formu kaydı
   birleştirerek yazıyor, yeni alan her çağrıda açıkça ayrıştırılmazsa boşaltılan değer eski hâliyle geri
   gelir. Geçmiş alanı da `hazirla`'da ayrıştırılmalı.
4. **Varsayılan davranış korunmalı.** `parcaMaliyetKurus`'un tarihsiz beş çağrısı (ölçüm 1) aynı sonucu
   vermeye devam etmeli; parametre zorunlu yapılırsa dışa aktarma ve liste sessizce değişir (C4'ün kıyas
   fikstürü bunu yakalar).
5. **Artık kuruş parti payında ilk makinada.** `partiGenelPaylari` makina başı payı aşağı yuvarlıyor ve
   artığı ilk üretilen makinaya veriyor (`makinaStandartMaliyet.js:427-428`; `:426` yorum satırı). Satır
   grupları kurulurken pay
   **makina başına toplanmalı**, `makinaBasiK × adet` ile çarpılmamalı; yoksa partinin toplamı kayar.
   Aynı şey ekranda da geçerli (R16/3): artığı taşıyan satırda birim pay × adet ile satır toplamı eşit
   çıkmaz, toplam çarpımla kurulursa partinin havuzu kayar.
6. **Boş tarih sıralaması.** R1/2'nin boş geçerlilik tarihi dize karşılaştırmasında her tarihten küçüktür
   ve bu kasıtlıdır; sıralama sayısal tarihe çevrilirse boş değer sona düşer ve ilk kayıt en yeni sanılır.
7. **Üretim tarihi ayı değil günü.** Parça maliyeti güne, parti havuzu aya bağlı. Maliyet okuması
   makinanın **gün** tarihiyle yapılır (ay başına yuvarlanmaz), yoksa ayın ortasında yürürlüğe giren zam
   o ayın bütün makinalarını etkiler.
8. **Boş tarih tarihli okuyucuya verilirse EN ESKİ kaydı döndürür.** Emsal `utils.getKdvRateForDate`
   `d = dateStr || ""` yapıp `sorted[0]`'dan başlıyor (`utils.js:299-307`) ve `makinaListesi` tarihi
   çözülemeyen makinaya `uretimTarihi: ""` yazıyor; emsal aynen kopyalanırsa o makina sessizce en eski
   tarihsel maliyeti alır. R2/4 bu sapmayı yazıyor, R10 dalı tarihsiz çağrıyı kullanır.
9. **Kayıt fonksiyonu React güncelleyicisinin içinde.** `hazirla` `setItems(p => p.map(…))` içinde çalışır
   ve iki kez çağrılabilir; karar her çağrıda **eski kayıttan** türediği için yazım bu hâlde de etkisizdir,
   ama fonksiyon saati kendisi okursa (R5/4'ün yasakladığı şey) iki çağrı iki tarih üretir. Tarih kaydın
   başında bir kez çözülür ve parametre olarak geçer.
10. **Pasif alanın yanındaki aktif alan.** 0096 R21 elle maliyet alanını kırılımlı parçada pasif yapıyor
    (`MaliyetAlani`, `disabled={kirilimK != null}`); tarih alanı onunla birlikte pasifleştirilirse
    kırılımın tutarı değiştiğinde tarih girilemez ve sessizce bugüne düşer (R5/3).
11. **İçe aktarma ayrı bir çağrı yeri.** `parcaSatirlariniCoz` ve `parcaIceAktarmaUygula` `hazirla`'dan
    geçmiyor (`parcaAktarma.js:23`, `:73`); R4 çağrı yeri olarak okunursa R20 uygulanamaz, karar motoru
    paylaşılmazsa `parcaAktarma.js`'e ikinci bir kural yazılır (R4, R20/2).

---

## Kararlar (Takım Yöneticisi onayı: 2026-10-20)

Yedi karar da önerilen seçenekle kapandı. Metinler gerekçeyi ve reddedilen seçeneğin bedelini kalıcı
kayıt olarak saklar.

**Karar 1 (onaylandı: önerilen seçenek): geçerlilik tarihini kullanıcı girer.**
Seçenekler: (a) maliyeti değiştirirken kullanıcı "hangi tarihten geçerli" girer, varsayılan bugün;
(b) sistem kaydın yazıldığı günle damgalar.
Önerim (a) idi ve onaylandı: doğru tarihi fatura elinde olan kullanıcı bilir ve beta'da en sık senaryo
bir maliyeti geç fark edip güncellemek. (b) o durumda yanlış aya oturur ve düzeltilemez. Bedeli bir alan,
bir doğrulama ve R7'nin düzeltme yolu. R5, R6, R6/2, R7'ye bağlandı.

**Karar 2 (onaylandı: önerilen seçenek): makinanın tarihi üretim tarihidir.**
Seçenekler: (a) makinanın üretim tarihi; (b) partinin başlangıç ayı.
Önerim (a) idi ve onaylandı: zincir zaten tek yerde çözülü (ölçüm 4), makina başına doğru ve parti
ortasında değişen fiyatı da yakalar. (b) partinin tamamını tek fiyata sabitler, yani istenenin tersi.
R9'a bağlandı.

**Karar 3 (onaylandı: önerilen seçenek): üretim tarihi çözülemeyen makina bugünkü maliyetle.**
Seçenekler: (a) bugünkü maliyetle hesaplanır, satırda nedeni yazar; (b) hesaba girmez.
Önerim (a) idi ve onaylandı: (b) partinin maliyetini sessizce eksiltir. Emsal 0088'in tarihsiz makina
ipucu ve 0090'ın durum nedenleri. R10'a bağlandı.

**Karar 4 (onaylandı: önerilen seçenek): planlanan adet bugünkü maliyetle (açık parti).**
Seçenekler: (a) bugünkü maliyet; (b) partinin başlangıç ayının maliyeti.
Önerim (a) idi ve onaylandı: planlanan adet henüz üretilmemiş demek, ileriye dönük maliyet doğru olandır
ve satır zaten "planlanan" rozetiyle ayrışıyor. R11'e bağlandı.

**Karar 5 (onaylandı: önerilen seçenek): Model Maliyetleri bugünkü maliyetle kalır.**
Seçenekler: (a) bugünkü maliyetle kalır; (b) tarih seçici eklenir.
Önerim (a) idi ve onaylandı: o ekran fiyatlama aracı, makina ve tarih bilmiyor, güncel maliyet orada
doğru olan (yerine koyma maliyeti). (b) ayrı iş olabilir, X6. R15'e bağlandı.

**Karar 6 (onaylandı: önerilen seçenek): kapanmış partide planlanan adet bitiş ayının maliyetiyle.**
Karar 4'ün eki olarak sunuldu. Seçenekler: (a) kapanmış partide planlanan adet partinin bitiş ayının
maliyetiyle, açık partide bugünkü maliyetle; (b) her zaman bugünkü maliyetle.
Önerim (a) idi ve onaylandı: kapanmış bir partide bugünkü fiyatla hesaplanan planlanan adet, aynı tablonun
öteki satırları dönem maliyetiyle hesaplanırken tutarsız durur. Bedeli tek koşul. R11'e bağlandı.

**Karar 7 (onaylandı: önerilen seçenek): planlanan adet satırının genel gider payı açık partide Hesap
Ayarları'ndan, kapanmış partide partinin makina başı payından gelir.**
Bu soru ölçüm 6 yapılırken çıktı ve ilk altı kararın kapsamadığı tek boşluktu: R16 parti satırlarının
payını partinin kendi aylarına bağlıyor, planlanan adedin makinası olmadığı için `partiGenelPaylari`'nın
makina başına payı onu kapsamıyor.
Seçenekler: (a) açık partide Hesap Ayarları'nın payı, kapanmış partide partinin makina başı payı;
(b) her zaman partinin makina başı payı; (c) her zaman Hesap Ayarları'nın payı.
Önerim (a) idi ve onaylandı: Karar 4 ve Karar 6 ile simetrik, planlanan adet açık partide ileriye dönük
fiyatlanır, kapanmış partide dönem maliyetiyle, yani maliyet ile pay aynı mantıktan gelir ve satır içinde
çelişki olmaz. Bedeli tek koşul ve satırda payın kaynağını söyleyen kısa bir ibare.
Reddedilen seçeneklerin bedeli kayıt olarak kalır: (b) açık ve henüz makinası olmayan partide payı sıfıra
düşürür (havuz dağıtılacak makina bulamaz, 0090 X9), yani partiyi üretmeden fiyatlama yolunu kapatır ve
bu görünümün varlık nedenini (`bos-parti` metni) ortadan kaldırır. (c) ek iş istemez ama kapanmış partide
maliyeti dönem maliyetiyle, payı bugünkü ayarlarla hesaplar; aynı satırın iki yarısı iki dönemden olur ve
bu spec'in düzelttiği kaymanın yarısı geri gelir. R17'ye bağlandı.

---

## Acceptance Criteria

**Veri ve okuma**

- **AC-1.** Maliyeti hiç değişmemiş parçanın (spec öncesinden kalan **ve** bu spec'ten sonra eklenen)
  geçmişi boştur ve her tarih için bugünkü maliyeti verir.
- **AC-2.** Maliyeti 10 TL olan parça 2026-02-01 geçerlilik tarihiyle 15 TL yapıldığında geçmiş iki kayıt
  taşır: "başlangıçtan beri" 10 TL ve 2026-02-01'den 15 TL.
- **AC-3.** 2026-01-15 tarihli okuma 10 TL, 2026-02-01 tarihli okuma 15 TL, 2026-02-28 tarihli okuma
  15 TL döndürür.
- **AC-4.** Tarih verilmeyen okuma 15 TL (bugünkü çözülmüş maliyet) döndürür ve bütün tarihsiz çağıranlar
  (liste hücresi, sayaç, form, dışa aktarma) bu değeri gösterir.
- **AC-5.** Hammadde kırılımı olan parçada geçmişe yazılan değer kırılımın **toplamıdır**; kırılım
  değişince yeni kayıt o toplamla yazılır (tuzak 2).
- **AC-6.** Çözülmüş maliyet değişmeyen bir kayıtta geçmişe kayıt yazılmaz (aynı değerle iki kez kaydetmek
  geçmişi büyütmez).
- **AC-7.** Son kaydın geçerlilik tarihine eşit tarihle yapılan değişiklik yeni kayıt eklemez, son kaydın
  tutarını günceller.
- **AC-8.** Parçanın bugünkü çözülmüş maliyeti her kayıttan sonra geçmişin en son kaydına eşittir (R3).

**Form ve doğrulama**

- **AC-9.** Yeni parça eklenirken geçerlilik tarihi sorulmaz **ve geçmişe kayıt yazılmaz**; "başlangıçtan
  beri" kaydı ilk maliyet değişikliğinde doğar (R5/2, R21) ve o ana kadar tarihli okuma R2/3 ile birebir
  aynı sonucu verir.
- **AC-10.** Düzenleme formunda geçerlilik tarihi alanı bugünün tarihiyle gelir.
- **AC-11.** Maliyeti değiştirmeyen bir düzenlemede tarih alanı yok sayılır, geçmişe kayıt yazılmaz.
- **AC-12.** Gelecek tarih reddedilir, kayıt yapılmaz ve nedeni alanda yazar.
- **AC-13.** **Sondan bir önceki** kaydın tarihinden önceki tarih reddedilir, kayıt yapılmaz ve nedeni
  alanda yazar; tek kayıtlı (boş tarihli) geçmişte her geçmiş tarih kabul edilir.
- **AC-14.** Biçimsiz ya da takvimde olmayan tarih reddedilir.
- **AC-15.** Tutar aynı kalıp yalnız tarih değiştirildiğinde yeni kayıt eklenmez, son kaydın tarihi
  güncellenir (R7).
- **AC-16.** Parça kartı geçmişi en yeni üstte salt okunur listeler; ilk kayıt "başlangıçtan beri"
  ibaresiyle görünür ve geçmiş boşken bölüm çizilmez.
- **AC-17.** Geçmiş listesi gider yetkisi olmayan kullanıcıda da görünür; hammadde kırılımı bölümü 0096
  R17'deki gibi gizli kalır.

**Hesap**

- **AC-18.** 2026-01'de üretilmiş makina 10 TL'den, 2026-02'de üretilmiş makina 15 TL'den hesaplanır;
  parti kapanmış olsa da olmasa da sonuç aynıdır.
- **AC-19.** Parti Hesabı aynı modelin iki maliyet grubunu iki satırda gösterir; satırlar adet ve ay
  aralığını yazar, toplam maliyet iki satırın toplamıdır.
- **AC-20.** Maliyeti aynı çıkan makinalar tek satırda toplanır (makina başına satır açılmaz).
- **AC-21.** Üretim tarihi çözülemeyen makina bugünkü maliyetle hesaplanır, **kendi satırında** toplanır
  (bugünkü maliyeti başka bir grupla aynı çıksa da birleşmez), satır ay aralığı yazmaz ve nedenini yazar.
- **AC-22.** Açık partinin planlanan adedi bugünkü maliyetle, kapanmış partinin planlanan adedi bitiş
  ayının son günündeki maliyetle hesaplanır.
- **AC-23.** Önerilen satış fiyatı satırın kendi maliyetinden ve modelin bugünkü kâr katsayısından türer.
- **AC-24.** Özetin "Gerçeğe göre kâr" rakamı artık satış bedeliyle aynı dönemin maliyetini karşılaştırır:
  maliyeti 10'dan 15'e çıkan bir parçada eski partinin kârı değişmez.
- **AC-25.** Model Maliyetleri'nin bütün rakamları bugünkü maliyetle hesaplanır ve spec öncesiyle birebir
  aynıdır (kıyas fikstürü).

**Genel gider payı**

- **AC-26.** Parti Hesabı'nın genel gider payı partinin kendi aylarının havuzundan gelir; aynı parti için
  Üretim Partileri görünümüyle aynı makina başı payı yazar **ve sütunun ayrım ibaresi bunu söyler** (eski
  "hesap ayarlarının dönemi … ikisi toplanmaz" cümlesi kalmaz).
- **AC-27.** Satırın genel gider payı toplamı o satırın makinalarının paylarının toplamıdır ve **türetilen
  satırların** pay toplamı o satırlarda yer alan makinaların `makinaPaylari` toplamına eşittir (artık kuruş
  kaybolmaz, tuzak 5). Birim pay ile adedin çarpımı satır toplamına eşit olmak zorunda değildir (R16/3).
- **AC-27/2.** Planlanan adedi olan model ve modeli katalogda bulunamayan makinalar satırların dışındayken
  satırların pay toplamı partinin havuzundan küçüktür ve fark ekranda görünür bir nedenle açıklanır
  (bugünkü `model-bulunamayan` şeridi ve "planlanan" rozeti). İlk taslağın "bütün satırların payı havuza
  eşittir" değişmezliği ölçüm 9'da sağlanamaz bulundu.
- **AC-28.** Durumu "başlamadı", "makina yok", "yürürlük öncesi" ya da "rol yok" olan partide pay yazılmaz
  ve nedeni görünür.
- **AC-29.** Planlanan adet satırının payı açık partide Hesap Ayarları'nın payı, kapanmış partide
  partinin makina başı payıdır; satır payın hangisinden geldiğini söyler. **Durumu "başlamadı" olan
  partide de yazılır** (R17/2): bu ekranın asıl kullanım hâli henüz başlamamış partiyi planlanan adetle
  fiyatlamaktır ve AC-28'in "pay yazılmaz" kuralı yalnız türetilen satırlara uygulanır.

**Metin, aktarma ve değişmeyenler**

- **AC-30.** Makina Maliyeti'nin üst ibaresinde "bir parçanın maliyeti" ifadesi geçmez; metin bugünkü
  ayarlardan gelenin yalnız Model Maliyetleri ile planlanan adet satırlarını etkilediğini söyler.
- **AC-31.** Parça dışa aktarmasının maliyet hücresi bugünkü değeri yazar ve çıktı spec öncesiyle birebir
  aynıdır.
- **AC-32.** İçe aktarmayla değişen maliyet içe aktarma gününden geçerli olacak şekilde geçmişe yazılır;
  değer değişmeyen satırda geçmişe kayıt yazılmaz.
- **AC-33.** Yeni alan dört nokta kuralından geçer; boş geçmiş gövdeye yazılmaz ve spec öncesi gövde
  fikstürüyle karşılaştırıldığında geçmişi olmayan parçanın gövdesi birebir aynıdır.
- **AC-34.** Yeni izin, yeni veri bölümü, yeni sunucu kuralı ve yeni kilit alanı eklenmediği kaynak
  taramasıyla ölçülür: `{BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI}` zaten
  `tests/fixtures/0093-tarama-once.json` ile karşılaştırılıyor (`tests/hammadde-0096.test.js:221-223`) ve
  bu spec hiçbirini değiştirmiyor, yani **yeni fikstür üretilmez**, o dosya adıyla anılır.
- **AC-35.** `parts` birleştirmesine yeni remap eklenmez; var olan parçanın geçmiş düzenlemesinin
  çakışmada sunucu kopyasına yenildiği bilinen sınır testle sabitlenir.

**QA turu 2026-10-20: veri ve form**

- **AC-36.** Alan `parts[].maliyetGecmisi`, satır `{ gecerli, kurus }`, satır kimliği yok, dizi eskiden
  yeniye sıralı, ilk kaydın `gecerli`'si `""`, `kurus` tamsayı; veritabanı sütunu JSON ve boş liste NULL,
  gövdeye yazılmaz (R1/3).
- **AC-37.** Geçmişin birimi kuruş, kardeş `maliyet` alanının birimi TL; iki alanı toplayan yer olmadığı
  kaynak taramasıyla ölçülür (R1/3, C1).
- **AC-38.** Boş ya da biçimsiz sorgu tarihinde tarihli okuma **bugünkü** çözülmüş maliyeti döndürür, en
  eski kaydı değil; tarihi çözülemeyen makina için tarihsiz çağrı kullanılır (R2/4, tuzak 8).
- **AC-39.** Çözülmüş maliyet girilmişken boşaltılırsa geçmişe `kurus: null` kaydı yazılır; o tarihten
  sonra üretilen makinalar "eksik" sayılır ve geçmiş listesinde satır "girilmedi" yazar (R4/3).
- **AC-40.** Kırılımlı parçada tarih alanı etkindir (elle maliyet alanı pasifken de) ve kırılım tutarı
  değişince geçmişe o tarihle kayıt yazılır; gider yetkisi olmayan kullanıcının kaydında çözülmüş maliyet
  değişmediği için kayıt yazılmaz (R5/3).
- **AC-41.** Varsayılan tarih ve gelecek tarih denetimi **yerel günle** yapılır; `urunAgaci` `bugun`'ü
  parametre olarak alır ve kayıt fonksiyonu saati kendisi okumaz (R5/4, tuzak 9).
- **AC-42.** Son kaydın tarihi geriye düzeltilebilir: sondan bir önceki kaydın tarihinden sonraki bir
  geçmiş tarih kabul edilir ve yeni kayıt eklenmez, ondan önceki tarih reddedilir (R6, R7).
- **AC-43.** Geçmiş listesi en yeni üstte, tutarlar `maliyetMetniKurus` ile biçimli; "başlangıçtan beri"
  ve "girilmedi" ibareleri `urunAgaci`'ndan dışa verilen sabitlerden okunur (R8/3).
- **AC-44.** Çöpteki parça tarihli okumada da eksiktir (parça kaydının çöp durumu tarihlenmez, C7).
- **AC-45.** Kayıt fonksiyonu geçmişi kayıttan okur, formdan gelen kopyadan değil; form alanı ayrıştırılıp
  atılır (C13, tuzak 3).

**QA turu 2026-10-20: hesap ve pay**

- **AC-46.** Tarihli direkt maliyet motorda, belirgin (model, üretim tarihi) grubu başına hesaplanır;
  `modeller` parametresi bugünkü liste olarak kalır ve plan penceresinin dört okuyucusu ile planlanan
  satırların maliyeti değişmez (R9/2, C12).
- **AC-47.** Parti payı ile parti hesabı aynı müşteri dizisinden kurulur: stoğa dönen bir makina iki
  hesapta da gerçek üretim tarihine çözülür ve R10 dalına düşmez (R9/4, ölçüm 9).
- **AC-48.** Satılmış makinanın standart maliyeti kendi üretim tarihinin direkt maliyeti artı kendi genel
  gider payıdır; tedarik karşılaştırmasının standart direkt maliyeti de tarihli direkt maliyetlerden
  toplanır (R9/3, AC-24'ün dayanağı).
- **AC-49.** Planlanan adedi olan model tek satırda kalır, maliyet gruplarına bölünmez; bölme yalnız
  planlanan adedi olmayan modellere uygulanır (R12/3).
- **AC-50.** Satır `anahtar` taşır ve testId `parti-satiri-<anahtar>`'dır; tek gruplu modelin anahtarı
  yalın model adıdır (bugünkü üç test çağrısı geçerli kalır), bölünen satırların anahtarları birbirinden
  farklıdır ve React anahtar uyarısı çıkmaz (R12/4, tuzak 1).
- **AC-51.** `turetilenAdet` bölünen satırda satırın kendi makina sayısıdır ve `adet`e eşittir, planlanan
  satırda bugünkü anlamını korur (R12/5).
- **AC-52.** Parti Hesabı'nın süresi 0088'in eşiğinin içinde kalır ve `modelMaliyeti` çağrı sayısı makina
  sayısıyla değil belirgin (model, tarih) sayısıyla büyür (C12).

**QA turu 2026-10-20: metin, aktarma ve kanıt**

- **AC-53.** `PAY_AYRIM_IBARESI` yeniden yazılır: iki görünümün aynı payı gösterdiğini ve sütunun partinin
  kendi aylarından geldiğini söyler, "ikisi toplanmaz" ve "hesap ayarlarının dönemi" iddiaları kalmaz;
  sabitin adı ve `pay-ayrim-ibaresi` testId'si korunur (R19/2).
- **AC-54.** İçe aktarmanın geçmiş kararı R4'ün tek motorundan verilir ve `parcaSatirlariniCoz` `bugun`'ü
  parametre olarak alır (modül saf kalır); `parcaAktarma.js`'te ikinci bir geçmiş kuralı olmadığı kaynak
  taramasıyla ölçülür (R4, R20/2, tuzak 11).
- **AC-55.** "Kapanmış parti" ölçütü tek yerden okunur (`partiGenelPaylari`'nın `acik` alanı, yani
  `bitisAy`); `kapanmaZamani`'na bakan dal yoktur (R11/2).
- **AC-56.** Devralınan sayılı kaynak taraması ve motor regex'i güncellenir, gevşetilmez; `maliyetGecmisi`
  adı `/\.maliyet\b/` desenine girmez (C1/2).
- **AC-57.** Kanıt kayıtları ikiye ayrılır: parça **kart** ekranları ve bütün `maliyet-*` ekranları
  `beklenen: "degisti"` + onay satırı, parça **liste** ekranları (`ayarlar-yedekparca*`) `"ayni"` (ölçüm 8).
- **AC-58.** Model Maliyetleri ekranlarının görsel farkı yalnız üst ibare şeridiyle sınırlıdır: rakamlar,
  sütunlar ve sayaçlar değişmez ve R15'in rakam kanıtı kıyas fikstüründen gelir (AC-25, ölçüm 8). **Plan P13:**
  ölçüm görüntü aracının şerit altını karşılaştıran ayrı raporuyla yapılır (şerit dışı 0 piksel); araç bunu
  desteklemiyorsa yedek yol elle inceleme artı kıyas fikstürüdür ve SCORECARD'da yazılır.
- **AC-59.** Ters çevrilen kriterler (0088 R28 ve kararı, 0090 R34 ve AC-38/5, 0092 kıyas fikstürünün
  `partiHesabi` bloğu, üç satır testi, sayılı tarama) test yorumlarında "spec 0097 ile" notuyla işaretlenir.
- **AC-60.** `CLAUDE.md` bölümü maliyetin tarihli okunmasını, değişmezlik kuralını, gelecek tarih yasağını,
  Parti Hesabı'nın payının dönem bağını ve tarihlenmeyenleri yazar; 0090'ın `PAY_AYRIM_IBARESI` cümlesi
  (`CLAUDE.md:451`, "iki rakam toplanmaz") da düzeltilir.

---

## Definition of Done

- [x] Takım Yöneticisi işi istedi ve yedi kararı onayladı (2026-10-20).
      **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] Bütün kabul kriterleri karşılandı.
- [ ] Maliyetin tek okuma yolu korundu: kaynak taraması `parts[].maliyet`'in ve kırılım tutarlarının
      okuma yolu dışında okunmadığını, tarihli okumanın ikinci bir çözücüye kopyalanmadığını gösterir.
- [ ] Kıyas turu: geçmişi olmayan veride Model Maliyetleri, parça listesi, "girilmemiş" sayacı, dışa
      aktarma satırı ve `modelMaliyetleri`'nin seçeneksiz çıktısı spec öncesi altınla birebir aynı.
- [ ] Parti toplamı denetimi: **türetilen** satırların genel gider payı toplamı, o satırlarda yer alan
      makinaların `makinaPaylari` toplamına eşit; planlanan ve modeli bulunamayan makinalar dışarıdaysa
      fark ekranda görünür bir nedenle açıklanıyor (AC-27, AC-27/2).
- [ ] Tek girdi denetimi: parti payı ile parti hesabı aynı müşteri dizisinden kuruldu ve stoğa dönen
      makina iki hesapta da gerçek üretim tarihine çözülüyor (AC-47).
- [ ] Dört nokta kuralı ve boş değer denetimi `db-roundtrip.cjs` ve `db-clean-install.cjs` ile ölçüldü.
- [ ] Görsel kanıt alındı; `docs/evidence/kanit-eslemesi.json` kayıtları ölçüm 8'in tablosuna göre
      güncellendi: parça **kart** ekranları ve **bütün** `maliyet-*` ekranları `beklenen: "degisti"` + onay
      satırı (üst ibare dört görünümün hepsinde çizildiği için `maliyet-modeller*` de dahil), parça
      **liste** ekranları (`ayarlar-yedekparca*`) `"ayni"` kaldı ve R15'in piksel kanıtını taşıyor;
      Model Maliyetleri ekranlarının farkı yalnız ibare şeridi (AC-57, AC-58).
- [ ] Ters çevrilen kriterler bölümünün beş satırı uygulandı ve test yorumlarına "spec 0097 ile" notu
      düşüldü; `tests/fixtures/0092-havuz-once.json`'un `partiHesabi` bloğu yeniden üretildi (AC-59).
- [ ] `npm test` ve `npm run lint` yeşil (Electron testleri dahil).
- [ ] `CLAUDE.md`'ye bölüm eklendi: maliyetin tarihli okunması, değişmezlik kuralı (bugünkü değer =
      son kayıt), gelecek tarih yasağı, Parti Hesabı'nın payının dönem bağı ve tarihlenmeyenler (kit,
      ek maliyet, kâr katsayısı, parça kaydının çöp durumu); 0090'dan kalan `PAY_AYRIM_IBARESI` cümlesi
      (`CLAUDE.md:451`) düzeltildi (AC-60).
- [ ] Sürüm notu metni uygulama planında: parça maliyeti güncellenirken artık tarih soruluyor, eski
      partilerin rakamı bundan sonra değişmiyor, bu spec'ten önceki zamlar geriye dönük bilinmiyor.

---

## Karar kaydı (QA boşluk analizi, 2026-10-20)

Takım Yöneticisi 28 bulgunun hepsini onayladı; aşağıdaki tablo bulguyu, kararı ve spec'e indiği yeri
kalıcı kayıt olarak tutar.

| # | Derece | Bulgu | Karar ve yeri |
|---|---|---|---|
| B-1 | Bloklayıcı | R6 ile R7 çelişiyor: son kaydın tarihi geriye düzeltilemez | Karşılaştırma hedefi sondan bir önceki kayıt (R6, R7, AC-13, AC-42) |
| B-2 | Bloklayıcı | Tarihli maliyetin nerede hesaplandığı tanımsız; `partiHesabi` bugünkü anlık görüntüyü alıyor | Motor belirgin (model, tarih) başına hesaplar, `modeller` bugünkü liste kalır (R9/2, C12, AC-46) |
| B-3 | Bloklayıcı | `maliyet-modeller*` için "0 piksel" beklentisi imkânsız (ibare dört görünümün üstünde) | Ölçüm 8 ve DoD yeniden yazıldı; kanıt kart/liste olarak ayrıldı (ölçüm 8, AC-57, AC-58) |
| B-4 | Bloklayıcı | Geçmişin alan adı, satır şekli, birimi ve sırası tanımsız | `parts[].maliyetGecmisi = [{ gecerli, kurus }]`, eskiden yeniye, kuruş (R1/3, AC-36, AC-37) |
| Ö-1 | Önemli | `PAY_AYRIM_IBARESI` ekranda R16'nın tersini söylüyor | İbare yeniden yazılır, sabit ve testId korunur (R19/2, AC-26, AC-53) |
| Ö-2 | Önemli | "Ters çevrilen kriterler" bölümü hiç yok | Beş satırlık bölüm eklendi (Ters çevrilen kriterler, AC-59) |
| Ö-3 | Önemli | Satır kimliği tanımsız; `key={r.model}` çakışacak | Satır `anahtar` taşır, testId `parti-satiri-<anahtar>` (R12/4, AC-50) |
| Ö-4 | Önemli | AC-27'nin "bütün satırlar = havuz" değişmezliği sağlanamaz | Kriter türetilen satırlara daraltıldı, ikinci kriter eklendi (AC-27, AC-27/2, ölçüm 9) |
| Ö-5 | Önemli | Planlanan adedi olan modelin türetilen makinaları: R12 ile çarpışma | Bölme yalnız planlanan adedi olmayan modellere (R12/3, AC-49) |
| Ö-6 | Önemli | R18 ile R17 "başlamadı" partide çelişiyor | R18 türetilen satırlara daraltıldı (R17/2, R18, AC-29) |
| Ö-7 | Önemli | Pay ham, maliyet canlı müşteri dizisi alıyor: aynı makinanın tarihi ayrışıyor | İki hesap aynı ham diziden kurulur (R9/4, ölçüm 9, AC-47) |
| Ö-8 | Önemli | Boş tarih tarihli okuyucuya verilirse en eski kaydı döndürür | Emsalden bilinçli sapma yazıldı (R2/4, tuzak 8, AC-38) |
| Ö-9 | Önemli | Kırılımlı parçada tarih alanı pasif alanın yanında kalıyor | Alan kırılımlı parçada da etkin (R5/3, tuzak 10, AC-40) |
| Ö-10 | Önemli | İçe aktarma ikinci yazıcı: R4 ile R20 çelişiyor, `bugun` yok | Tek karar motoru iki çağıran, `parcaSatirlariniCoz` `bugun` alır (R4, R20/2, tuzak 11, AC-54) |
| Ö-11 | Önemli | Maliyetin boşaltılması tanımsız | `kurus: null` kaydı yazılır (R4/3, AC-39) |
| Ö-12 | Önemli | Satılmış makinanın maliyeti ve tedarik karşılaştırması tarihe oturmuyor | R9 ikisini de kapsar (R9/3, AC-48) |
| Ö-13 | Önemli | Tarihsiz makinanın satırı ve ay aralığı tanımsız | Kendi satırı, ay aralığı yok, neden yazılır (R10/2, AC-21) |
| K-1 | Küçük | Sayılı kaynak taraması ve motor regex'i kırılacak | Tarama güncellenir, gevşetilmez (C1/2, AC-56) |
| K-2 | Küçük | AC-34 için yeni fikstür gerekmiyor | `0093-tarama-once.json` adıyla anıldı (AC-34) |
| K-3 | Küçük | "Kapanmış parti" tanımı yazılmamış | Tek ölçüt `acik` (yani `bitisAy`) (R11/2, AC-55) |
| K-4 | Küçük | "Bugün" hangi saat | `yerelBugun`, `bugun` parametre, bir kez çözülür (R5/4, tuzak 9, AC-41) |
| K-5 | Küçük | Geçmiş listesinin biçimi ve sırası | Saklama eskiden yeniye, liste ters, ibareler sabit (R8/3, AC-43) |
| K-6 | Küçük | Performans ölçütü yok | Belirgin (model, tarih) başına hesap, 0088 eşiği (C12, AC-52) |
| K-7 | Küçük | `turetilenAdet`'in bölünen satırdaki anlamı | Satırın kendi makina sayısı (R12/5, AC-51) |
| K-8 | Küçük | R1/2, R5/2, AC-1 ve AC-9 tutarsız | Ekleme yolu kayıt yazmaz (R5/2, AC-1, AC-9) |
| K-9 | Küçük | Çöpteki parçanın tarihli okunması | C7'ye bilinen sınır cümlesi (C7, AC-44) |
| K-10 | Küçük | Düzenleme formunun bayat geçmişi | Geçmiş kayıttan okunur, form kopyası atılır (C13, AC-45) |
| K-11 | Küçük | İki satır atıfı bir satır kaymış | Tuzak 1 `:106`, tuzak 5 `:427-428` olarak düzeltildi |

---

## Revizyonlar

1. 2026-10-20, ilk taslak. Altı karar Takım Yöneticisi tarafından onaylanmış olarak yazıldı; yedinci
   karar (planlanan adet satırının genel gider payı) ölçüm 6 sırasında bulundu ve önerisiyle onaya sunuldu.
2. 2026-10-20, Karar 7 onaylandı (önerilen seçenek: açık partide Hesap Ayarları'nın payı,
   kapanmış partide partinin makina başı payı). Onay bekleyen karar kalmadı; bölüm Kararlar'a
   taşındı, R17 ve AC-29 somutlaştı. Requirements, Constraints ve kabul kriterlerinin kapsamı
   değişmedi.
3. 2026-10-20, QA boşluk analizi turu. Yirmi sekiz bulgunun hepsi onaylandı ve işlendi (karar kaydı
   tablosu). Dört bloklayıcı: R6 ile R7'nin çelişkisi (karşılaştırma hedefi sondan bir önceki kayıt),
   tarihli hesabın yeri ve `partiHesabi`'nin imzası (R9/2), `maliyet-modeller*` ekranlarının "0 piksel"
   beklentisinin imkânsızlığı (üst ibare dört görünümün üstünde çiziliyor) ve geçmişin alan adı ile satır
   şeklinin tanımsızlığı (R1/3). On üç önemli bulgu `PAY_AYRIM_IBARESI`'nin ters cümlesini, eksik "ters
   çevrilen kriterler" bölümünü, satır anahtarını, AC-27'nin sağlanamaz değişmezliğini, planlanan adedin
   bölme kuralını, R18'in kapsamını, iki hesabın ayrı müşteri dizisini, boş tarihin emsaldeki "en eskisi"
   dalını, kırılımlı parçada pasif alanın yanındaki tarihi, içe aktarmanın ikinci yazıcı olmasını,
   maliyetin boşaltılmasını, özetin ve tedarik karşılaştırmasının tarihsizliğini ve tarihsiz makinanın
   satırını kapattı. On bir küçük bulgu taramanın sayılarını, fikstür tekrarını, "kapanmış" tanımını,
   yerel günü, listenin biçimini, performans ölçütünü, `turetilenAdet`'in anlamını, ekleme yolunu,
   çöpteki parçayı, form kopyasını ve iki satır atıfını düzeltti. Yeni maddeler: R1/3, R2/4, R4/3, R5/3,
   R5/4, R9/2, R9/3, R9/4, R10/2, R11/2, R12/3, R12/4, R12/5, R16/3, R17/2, R19/2, R20/2, C1/2, C12, C13;
   yeniden yazılanlar R4, R5/2, R6, R7, R8/3 ekiyle R8, R18, C7, ölçüm 8; yeni bölümler ölçüm 9 ve "Ters
   çevrilen kriterler"; kriterler AC-60'a çıktı.
4. 2026-10-20, uygulama planı onayı. Takım Yöneticisi planın on dört önerisini kabul etti (`specs/0097-uygulama-plani.md`
   §3, P1–P14). Yeni maddeler: R3/2 (son kaydın tutarı bugünkü değerden), R6/3 (tutar değişirken sınır son kayıt), R7/2
   (tarih alanına dokunuldu mu), R9/5 (özette her satılmış makina kendi tarihiyle), R10/3 (tarihsiz ölçütü), R12/6
   (gruplama ölçütü), R14/2 (ciro satır toplamından), R18/2 (payı yazılmayan satır), R21/2 (ilk giriş kayıt yazmaz),
   C13/2 (kanca imzası); değişenler R12/4 (planlanan satır yalın adla), R20/2 (`bugun` zorunlu), C12 (süre eşiği),
   AC-58 (ölçüm yolu).
5. 2026-10-20, triyaj. Beş bulgu düzeltildi: R7/3 (eşit tarih düzeltmesi reddedilir, boş tarih alanı tutar değişmiyorsa yok
   sayılır), R18/2 eki (kapanmış partide durum tamam değilse planlanan satırın payı da yok, nedenli), R12/6 eki (gruplama dönem
   ardışıklığına bakmaz, bilinçli), C13/3 (hata dalında kayıt değişmez).
