# 0092 — Peşin ödenen gider kapsadığı aylara yayılır ve bitişinde hatırlatır

| | |
|---|---|
| **Durum** | Onaylandı, uygulamada (revizyon 3, plan onayı 2026-10-18) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Etkilenen alanlar** | Gider formu ve tekrarlayan tanım formu (bir alan geri döner, ortak bileşen), tekrarlayan tanım listesinin Tanım hücresi (bir satır), Dönem Raporu'nun kalem listesi (tutar hücresinde bir rozet), gider raporu motorunun **opt-in seçeneği** (`hesaplaGiderRaporu`, kalem başına aylık pay), yeni maliyet motorunun aylık ve dönem havuzu ile havuz nesnesinin alanları (`makinaStandartMaliyet.js`: `rolHavuzlari`, `aylikGenelHavuzlar`, `partiHesabi`), Makina Maliyeti › Model Maliyetleri ve Hesap Ayarları'nın pay özeti (bir bilgi satırı), Hesap Ayarları'nın rol tablosu ("Dönemde tutar" sütunu ve kalemli tür kümesi), Makina Maliyeti › Üretim Partileri (bir bilgi satırı), Anasayfa'nın Gider Ödemeleri kartı (üçüncü sayı ve alt metin) ve hatırlatma penceresi (üçüncü bölüm, boş durum metni), Ayarlar › Giderler › Gider Ayarları (bir eşik alanı), yeni saf kitaplık (kapsam bitişi ve eşik), spec 0090'ın iki kaynak taraması, görüntü aracının üç mevcut ekranı ve yeni ekranları, kullanıcı rehberi |
| **Onaylayan** | Takım Yöneticisi |
| **Bağımlı spec'ler** | 0059 (motor genişlemesinin opt-in deseni: parametresiz çıktı birebir aynı; B-1'in yolu), 0075 (tanımın yeni alanı listede görünür, R43'ün dersi), 0082 (yenilenmeyecek altın: `0082-maliyet-once.json`), 0001 ve 0002 (yürürlük öncesi tarihli kalem hiçbir hesaba girmez değişmezi; B-3), 0090 (**önkoşul ve kısmen geri alınır:** dağıtım alanını kaldıran spec; X1'i bu spec'in kendisidir, AC-2, AC-3, AC-6, AC-7, AC-13 ve iki kaynak taraması ters çevrilir), 0072 (alanın kendisi, doğrulaması, `esitBol` bölmesi ve kapsam aralığı; kavramı değişir, kuralı korunur), 0088 (rol tablosu ve dönem havuzu; C3 eşitliği bu spec'in omurgası), 0022 (parti payının ağırlıklı aylık bölmesi; **değişmez**), 0076 (gider tutarı tabanı: matrah + indirilemeyen KDV), 0003 (ödeme hatırlatıcısının kartı, penceresi ve eşik ayarı deseni; kapsamı **değişmez**), 0084 (gider ayarlarına alan ekleme deseni: ilk durum ve kaydet listesi birlikte), 0071 (KDV dâhil giriş ve tutarı girilmemiş kalem), 0078 (çöpteki türün kalemi havuza girer), 0091 (taban), 0009 (görsel kanıt kaydı ve ekran metni taraması) |
| **Taban** | 0091 kapanışı (`f6411c3`) |
| **Revizyon** | · 1 · 2026-10-18 ilk taslak<br>· 2 · 2026-10-18 QA boşluk analizi: 27 bulgu işlendi. Beş bloklayıcı cevaplandı (yaymanın mekanizması ve rapor motorunun opt-in seçeneği, havuz nesnesinin yeni tanımı, yürürlük değişmezinin korunması, kapsamın bitiş günü, yaymanın davranış kapısı); on önemli ve on iki küçük bulgu maddeye çevrildi<br>· 3 · 2026-10-18 plan onayı (`specs/0092-uygulama-plani.md`): X9/2 eklendi (eski motorun dağıtım yardımcıları kendi semantiğiyle aynen kalır, yeni yol `kapsam*` ailesini kullanır; yalnız eski hata metni ve çözücüsü yeniden adlandırılır), R25/3 (kart ve pencere metinleri), R21/3 (`yayilanAdet` yalnız havuza giren rollerin kalemlerini sayar) |

---

## Intent

Fabrika internet, sigorta, aidat ve yazılım aboneliği gibi giderleri **yılda bir kez, peşin**
ödüyor. Bu ödeme bir aya yazılıyor ama hizmeti on iki ay boyunca kullanıyor. Bugün uygulama
ödemeyi tek aya yazdığı için makina maliyeti o ayda şişiyor, kalan on bir ayda eksik çıkıyor:
ölçtüm, yılda 24.000 TL internet ödeyen ve çeyrek partiler açan bir kurulumda birinci çeyrek
partisinin makina başı payı 1.650 TL, diğer üç çeyreğin payı 450 TL, doğrusu her çeyrekte 750 TL
(Context, ölçüm 1). Aynı makinayı Ocak'ta pahalı, Mayıs'ta ucuz fiyatlıyorsunuz.

İkinci acı aynı kaydın öteki ucunda: on iki ay dolduğunda uygulama hiçbir şey söylemiyor.
Aboneliğin bittiğini ya tedarikçi arayınca ya hizmet kesilince öğreniyorsunuz. Ölçtüm, bugün
uygulamadaki tek gider hatırlatıcısı **borç** hatırlatıcısıdır ve peşin ödenen fatura ödendiği an
kapsamdan çıkıyor; "kapsadığı süre" diye bir kavram hiç yok (Context, ölçüm 3).

İkisi **tek bilginin** iki sonucu: bu gider kaç ayı kapsıyor. Bu iş bittiğinde kullanıcı gider
kaydına bu tek sayıyı girecek, maliyet o ayların hepsine eşit dağılacak, ve kapsanan süre dolmaya
yaklaştığında Anasayfa'daki gider kartı bunu söyleyecek. Ödeme tarafı hiç değişmeyecek: para yine
tek seferde, tek borç ve tek ödeme kaydıyla çıkacak.

---

## Requirements

### Kapsadığı ay sayısı alanı geri döner

- **R1.** Gider formunda, kalemin **kaç ayı kapsadığını** söyleyen bir ay sayısı alanı çizilir. Alanın anlamı "bu ödeme kaç aylık hizmeti karşılıyor"dur; boş ya da 1 değeri "tek ayı kapsıyor" demektir ve bugünkü davranışın aynısıdır.
- **R2.** Alan yalnız **normal** ve **kira** davranışında çizilir; personel ve SGK davranışında çizilmez. Gerekçe kavramındadır: maaş ve SGK bildirgesi ileriye dönük bir hizmeti karşılamaz.
- **R2/2.** Alanın kullanıcıya görünen üç metni yeniden yazılır ve tek yerde durur: etiket "Kapsadığı ay sayısı", ipucu "Yılda bir peşin ödenen giderde 12 yazın; boş ya da 1 tek ayı kapsar.", hata metni "Kapsadığı ay sayısı 1 ile 60 arasında tam sayı olmalı.". Bugünkü hata sabiti "Dağıtım ay sayısı …" diyor ve alan geri döndüğünde kullanıcıya **bu** metin görünürdü; C11 ve AC-69 bunu yasaklar.
- **R3.** Tekrarlayan gider tanımı formunda aynı alan aynı kurallarla çizilir ve tanımdan üretilen kalem değeri taşır (bugünkü kopyalama davranışı korunur).
- **R3/2.** Kapsamı birden çok ay olan tanım **listede de görünür**: tanım satırının Tanım hücresinde, bugünkü üç emsalle ("KDV dâhil girildi", "Tevkifat 5/10", "Kısıtlı %70") aynı biçimde bir satır kapsadığı ay sayısını yazar (kimlik `tanim-kapsam`). Tablonun **sütun sayısı değişmez** (0090'ın yedi sütunu korunur). Gerekçe 0075 R43'ün dersidir: tanımın yeni alanı listede görünmezse hiçbir yerde görünmez ve tanımın kapsamı ürettiği her kaleme kopyalandığı için yanlış tanım aylarca fark edilmez.
- **R4.** Geçerli değer 1 ile 60 arasında tam sayıdır; **kullanıcının yazdığı** geçersiz değer kaydı engeller ve nedenini alanın altında yazar. Boş alan 1 sayılır ve kayda yazılmaz.
- **R4/2.** **Saklı** geçersiz değer kaydı engellemez: form açılışta değeri çözücüden geçirir, geçerliyse gösterir, geçersizse alanı boş açar (yani 1 kabul eder). Gerekçe ölçüldü: bugün form durumu saklı değeri ham taşıyor ve koruyucu bozuk değeri sessizce düşürüyor; 0072 döneminden kalmış bozuk bir değer, R4 yalnız "geçersiz değer kaydı engeller" diye okunursa eski kalemi düzenlenemez hâle getirirdi (kullanıcı o sayıyı silmeden tutarı bile düzeltemezdi). 0090'ın "taşıyan eski kayıt birebir geri yazılır" kuralı **geçerli** değerler için aynen kalır (R8).
- **R5.** Alanın okunması tek bir yerden yapılır: kalemin kapsadığı ay sayısını ve kapsam aralığının ilk ve son ayını veren tek bir çözücü vardır; ekranlar ve motorlar ay aritmetiği yazmaz. **Adlar kavrama döner** (C11, C17): çözücüler `gider.js`'te `kapsamAyOf`, `kapsamliMi`, `kapsamAraligi` (`{aySayisi, ilkAy, sonAy}`), sabitler `KAPSAM_AY_MAX` ve `KAPSAM_AY_HATASI`; kapsam bitişi hesabı ve eşik yeni saf kitaplıkta (`src/lib/giderKapsami.js`); ortak form alanı `GiderAlanlari.KapsamAlani` (`KisitAlani` emsali: kalem formu ve tanım formu aynı bileşeni çizer); rozet yardımcısı `kapsamRozetMetni`, rozetin kimliği `kapsam-rozeti`. **Kalıcı alanın ve form durumunun anahtarı `dagitimAy` olarak kalır** (göç yok, adlandırma borcu X10'da yazılı).
- **R5/2.** Çözücü kapsamı **yalnız normal ve kira** davranışında döndürür (alanın çizim kapısıyla aynı, R2); başka davranıştaki saklı değer korunur ama etkisizdir: havuza yayılmaz, rozet çizilmez, hatırlatma listesine girmez. Gerekçe ölçüldü: 0072'nin alanı bütün davranışlarda çiziliyordu (bugünkü seçilebilirlik kuralı yalnız makina ve "dağıtılmasın" atamasını eliyor), yani veride kapsam taşıyan bir personel ya da SGK kalemi olabilir ve R7 atama bağını kopardığı için bu değer artık her koşulda okunur. Kapı yazılmazsa maaş on iki aya yayılır ve havuzun davranışı hatırlatmanın personeli hiç içermemesiyle (R29, AC-50) çelişir; K21 gizlilik sınırı yeni bir sızma yüzeyi kazanır.
- **R6.** Kapsam, kalemin **gider tarihinin ayından** başlar. "Kaçıncı aydayız" diye bir durum tutulmaz; aralık kalemin kendi verisinden her okumada yeniden türer.
- **R7.** Kapsam ay sayısı artık kalemin atama verisine bakmaz. Atama alanları 0090 ile ölü alan olduğu için, atama taşıyan eski bir kalemde de kapsam ay sayısı geçerliyse okunur. **Sonucu yazılıdır:** 0090 öncesinde makinaya atanmış ya da "dağıtılmasın" işaretli olup aynı zamanda dağıtım ayı taşıyan eski bir kalem, bu spec'ten sonra kapsadığı aylara yayılır; eskiden yayılmıyordu.
- **R8.** Eski kayıtların değeri korunur: kapsam ay sayısı taşıyan bir kalem ya da tanım formda açılıp kaydedildiğinde değer birebir geri yazılır.
- **R8/2.** Kapsam anahtarı 0090'ın **atama anahtarları listesinden çıkarılıp** kendi sabitine alınır ve kayıt koruyucusu iki **bağımsız** kapı alır: atama kapısı bugünkü atanabilirlik, kapsam kapısı "normal ya da kira" (R2). Sil ve yeniden yaz sırası korunur. Gerekçe ölçüldü: koruyucunun bugün tek kapısı var ve tanım formu onu "yalnız normal davranış" ile çağırıyor, yani **kira tanımının kapsamı** R7'den sonra bile sessizce düşerdi.

### Havuz kapsanan aylara yayılır

- **R9.** Genel gider havuzunun ay tablosunda, kapsamı birden çok ay olan bir kalemin tutarı o ayların hepsine **eşit** bölünür; artık kuruş son aya yazılır.
- **R9/2.** **Yaymanın mekanizması:** gider raporu motoruna bir **opt-in seçenek** eklenir (0059'un `{ liste: true }` deseni) ve kalem döngüsünün içinden, bugünkü tutar tabanının (`kisitHesabi(...).giderK`) aynısıyla kalem başına aylık pay listesi üretilir: `[{ turId, ay, payK }]`. Çağrı penceresi **yayma penceresi** olarak genişletilir (kapsamı pencereye uzanan kalemler de döngüye girsin). Yeni havuz bu listeyi **tek rapor çağrısıyla** okur, ay tablosunu bir kez kurar; dönem havuzu ve aylık havuzlar bu tablonun okuyucusu olur (R13). Seçenek verilmeyen çağrının çıktısı **birebir eskisidir**.
- **R9/3.** Gerekçe ölçüldü ve bu maddenin yazılmaması işi bloke ederdi: bugünkü havuz yolu yaymayı **üretemez**, çünkü rapor kalemleri tarihe göre süzer (pencere içinde tarihli olmayan kalem hiç dönmez). Ölçüm: Ocak tarihli, kapsamı 12 olan 24.000 TL'lik kalem, Haziran ayının havuz çağrısında hiç görünmüyor (2026-06 havuzu 3.000 TL kalıyor). Spec 0090'ın X1'i bu problemi adıyla yazmıştı: "yeni havuz bilinçli olarak tür kırılımından okunuyor; kalem kalem yürüyen ikinci bir havuz hesabı ayrı iştir." Opt-in seçenek bu ikinci hesabı yazmadan sorunu çözer: tutarın tek okuma yolu, yürürlük kırpması, çöpteki tür ve türsüz kalem kuralları aynı döngüde kalır (C2, C3).
- **R10.** Kapsamı tek ay olan kalem bugünkü gibi yalnız kendi ayına girer. Yayılmış kalem bulunmayan veride ay tablosu ve dönem havuzu spec öncesi rakamla **kuruş kuruş aynıdır**.
- **R11.** Bölünen tutar, havuzun bugün okuduğu tutarın aynısıdır: gider tutarı (matrah + indirilemeyen KDV, 0076). İkinci bir tutar hesabı yazılmaz.
- **R12.** Yayma kalemin rolüne bakmaz: "genel gidere girer" ve "ürün ağacından gelir" rollerinin ikisinde de kalem kapsadığı aylara yayılır, rolü değişmez. Rolü "maliyete girmez" olan ve türsüz kalemler bugünkü gibi hiçbir havuza girmez.
- **R12/2.** Parti Hesabı'nın **gerçekleşen tedarik karşılaştırması** da yeni ay tablosundan okunur: o ekran bugün dönem havuzunu üçüncü bir çağrıyla kuruyor ve "ürün ağacından gelir" toplamını kullanıyor. R13'ün tek tablosu bu toplam için de geçerlidir, yani kapsamı taşan bir tedarik faturası varsa karşılaştırma yalnız döneme düşen payı sayar. Standart direkt maliyet (ürün ağacından hesaplanan taraf) **değişmez**. Gerekçe: aynı kalemin bir ekranda yayılıp öbüründe yayılmadan görünmesi C4'ün yasakladığı şeyin kendisidir.
- **R13.** Dönem havuzu, dönemin **aylarının toplamıdır**. Yani Model Maliyetleri'nin dönem havuzu ile parti payının aylık havuzları aynı tablodan okunur; bugün iki ayrı çağrıyla hesaplanan bu iki rakam arasındaki eşitlik (0088 C3) korunur ve yayma ikisine birlikte uygulanır.
- **R13/2.** Havuz nesnesinin bugün ekranda olan üç parçası yeniden tanımlanır: (a) rol satırlarının tutarı pencereye düşen **yayılmış** tutardır, yani Hesap Ayarları'nın "Dönemde tutar" sütununun toplamı dönem havuzuna eşit kalır; (b) rol satırının ve türsüz sayısının **adedi** pencereye pay veren **kalem** sayısıdır (aynı kalem ay başına tekrar sayılmaz); (c) "yürürlük öncesi" bayrağı bugünkü anlamını korur (pencerenin tamamı yürürlükten önce) ve ay tablosundan türetilir. Kalemi pencerenin dışında tarihli ama kapsamı pencereye uzanan türün satırı tabloda **görünür** (rolü oradan değiştirilebilir). Gerekçe: sütun ile havuz ayrışırsa kullanıcı iki rakamı toplayamaz ve rolün değiştirilebildiği tür kümesi sessizce yanlış türü kilitler.
- **R14.** Kapsamı dönem penceresinin dışına taşan kalemin yalnız pencere içine düşen ayları sayılır. Taşan kısım kaybolmaz, ait olduğu ayların penceresinde görünür.
- **R15.** Yürürlük ayından önceki aylara düşen paylar bugünkü kuralla elenir.
- **R15/2.** **Gider tarihi yürürlük ayından önce olan kalem hiçbir aya pay vermez** (0001 ve 0002'den beri geçerli değişmez: yürürlük öncesi tarihli kalem hiçbir hesaba girmez; rapor motoru onu etkin başlangıçla baştan eler). R6 kapsamı kalemin ayından başlattığı için, "kapsamı yürürlükten önce başlayan kalem" yalnız tarihi yürürlükten önce olan kalemdir; o kalem de kapsam penceresinde elenir. Bedeli yazılıdır: yürürlükten bir ay önce peşin ödenen yıllık fatura o yılın havuzuna hiç girmez. Bu madde bir çelişkiyi kapatır: revizyon 1'in AC-25'i bu kalemin sonraki aylarının havuza girmesini istiyordu ve bu, yürürlük eşiğini ilk kez kıran değişiklik olurdu (Gider Ayarları'nın "bu aydan önceki dönemler için rapor rakam üretmez" ibaresi yalan olurdu).
- **R16.** Parti payının ağırlıklı aylık bölmesi (0022 R13) **değişmez**: ayın havuzu değişir, bölme kuralı aynı kalır.
- **R17.** Parti kapanış anlık görüntüsü bugünkü alanına, bugünkü yoldan yazılmaya devam eder; yeni bir alan açılmaz.
- **R18.** Yayma hesabı tek geçişte yapılır: aynı ekran için gider raporu motorunun çağrılma sayısı bugünkünden fazla olmaz.
- **R18/2.** Bugünkü sayılar ölçüldü (casusla): parti payı hesabı on iki aylık harita için **12**, dönem payı hesabı **1** rapor çağrısı yapıyor. R9/2'nin tek geçişi bu sayıyı artırmaz, azaltır. Ay başına geriye genişletilmiş çağrı seçeneği bu yüzden reddedildi: çağrı sayısı aynı kalırken aynı kalem altmış kez okunurdu.

### Ekranda görünürlük

- **R19.** Dönem Raporu'nun kalem listesinde, kapsamı birden çok ay olan kalemin tutar hücresinde bir rozet kapsadığı ay sayısını ve aralığını yazar (kaçıncı ay yazılmaz).
- **R19/2.** Rozetin metni tek yardımcıdan gelir ve biçimi sabittir: "12 ayı kapsıyor · 01.2026 – 12.2026" (0072'nin kaldırılan rozetinin biçimi, sözcükleri değişmiş). Rozet tutar hücresinde bugünkü kısıtlı rozetinin **altına** çizilir (sıra: önce kısıtlı, sonra kapsam); ikisini birlikte taşıyan kalem görsel kanıtta zaten var.
- **R20.** Dönem Raporu'nun hiçbir toplamı, kartı, KDV rakamı, borç özeti, tedarikçi kırılımı ve ödeme bilgisi değişmez: kalem kendi ayında tam tutarıyla raporlanmaya devam eder. Yayma yalnız maliyet tarafının kavramıdır.
- **R21.** Makina Maliyeti'nin pay özetinde, dönemde yayılmış kalem varsa kaç kalemin kapsadığı aylara yayıldığını söyleyen bir bilgi satırı çıkar; yayılmış kalem yoksa satır hiç çizilmez.
- **R21/2.** Bu satırın ölçütü **kesişimdir**: pencerenin en az bir ayına pay veren, kapsamı birden çok ay olan kalem sayılır (dönemde tarihli olma ölçütü değil, çünkü Ekim'de ödenen giderin Ocak penceresindeki payını o ölçüt açıklamaz). Sayı **motordan** gelir (havuz nesnesinde `yayilanAdet`, türsüz sayısının emsali); ekran sayım yapmaz (R23, C6). Pay özetinin boş durum dallarında (hesap ayarı girilmemiş, yürürlük öncesi, rol yok) özet erken döndüğü için satır **çizilmez**.
- **R21/3.** (revizyon 3) `yayilanAdet` havuza giren rollerin ("genel gidere girer", "ürün ağacından gelir") kalemlerini sayar; rolü "maliyete girmez" olan ve türsüz kalem havuzu değiştirmediği için sayılmaz.
- **R22.** Üretim Partileri görünümünde aynı bilgi parti tablosunun altında bir kez yazılır (parti başına tekrar edilmez).
- **R23.** Kalemin kapsadığı aylara düşen pay tutarı ekranda ay ay listelenmez. Kullanıcının göreceği şey havuzun kendisi ve kalemin kapsam rozetidir.
- **R24.** Yayma hiçbir yazdırma ya da dışa aktarma çıktısına girmez.

### Kapsam bitişi hatırlatması

- **R25.** Anasayfa'daki Gider Ödemeleri kartı **üçüncü** bir sayı gösterir: kapsadığı süre dolmaya yaklaşan ya da yeni dolmuş gider kalemi sayısı. Kart tıklanınca açılan pencerede bu kalemler üçüncü bir bölümde listelenir.
- **R25/2.** Kart **her zaman üç sayı** çizer (üçüncüsü sıfırken de; bugünkü iki sayının davranışı böyle); pencerede ise bölüm yalnız doluysa çizilir (R32). Üçüncü sayının etiketi eşiği söyler ("Kapsamı doluyor", yanında ± gün). Kartın alt metni bugün yalnız borcu anlatıyor ("Ödenmemiş, son ödeme tarihi girilmiş kalemler"); iki kavramı birlikte söyleyecek biçimde yeniden yazılır ve tek sabitte durur. Gerekçe: kartın yüksekliği veriye göre zıplamaz ve iki soruyu gösteren kartta yalnız borcu anlatan alt metin kalmaz.
- **R25/3.** (revizyon 3) Metinler: kartın üçüncü sayısının etiketi "Kapsamı doluyor (± e gün)", alt metni "Ödenmemiş ve vadesi girilmiş kalemler, kapsadığı süre dolan peşin ödemeler · Görmek için tıkla"; pencerenin bölüm başlığı "Kapsamı doluyor (n) · ± e gün"; ibare "Bu bölüm Giderler'in hatırlatma süzgecine girmez."; boş durum eki "Kapsadığı süre e gün içinde dolan ya da yeni dolmuş peşin ödenmiş gider de yok."
- **R26.** Kapsamı **kalemin** sayar: bir kalem bir satırdır.
- **R27.** Kapsam penceresi iki yönlüdür: kapsamın bitiş günü bugünden eşik kadar gün sonrasına kadar **ve** bugünden eşik kadar gün öncesine kadar olan kalemler listelenir. Eşiğin dışına çıkan kalem listeden kendiliğinden düşer, yani hatırlatma süresiz sürmez.
- **R27/2.** **Kapsamın bitiş günü** kapsamın son ayının son günüdür (var olan ay sonu yardımcısı, R40). Örnek: 15.01.2026 tarihli, kapsamı 12 olan kalemin bitişi 2026-12-31'dir. Gün farkı bugünkü hatırlatıcının gün farkı yardımcısıyla hesaplanır. Gerekçe: havuzun birimi aydır (X3) ve ay sonu, ayın payının bittiği gündür; gerçek yıldönümünden (14.01.2027) hiçbir zaman sonra olmadığı için hatırlatma geç kalmaz. Yıldönümü hesabı ay sonuna kırpma ve artık yıl tuzaklarını hatırlatmaya taşırdı, kazancı yoktu.
- **R27/3.** Pencerenin **iki ucu da dahildir**: bitişe kalan ya da bitişten geçen gün sayısının mutlak değeri eşiğe eşit olan kalem listede görünür, eşiği bir gün aşan kalem (iki yönde de) görünmez. Eşik 0 ise yalnız bitişi bugün olan kalem görünür.
- **R28.** Hatırlatma kapsamı: çöpte olmayan, yürürlük ayından sonraki, kapsamı birden çok ay olan kalemler. **Ödenmiş olması engel değildir**, çünkü bu bir borç hatırlatması değil.
- **R28/2.** Tarihi girilmemiş kalem listede **görünmez** (kapsam aralığı yoktur). Bu kural ayrıca yazılır: borç kapsamı tarihsizi kendi şartıyla eliyor, kapsam listesinin kendi şartı yoksa aralığı olmayan satır çizilirdi.
- **R29.** Personel ve SGK davranışındaki kalem bu listeye hiç girmez (R2'nin karşılığı); çalışan adı ve çalışan bazlı tutar bu listede hiçbir koşulda görünmez.
- **R30.** Satır şunları yazar: kalemin türü, açıklaması ya da tedarikçisi, kapsam aralığı ve bitişe kalan (ya da bitişten geçen) gün sayısı. Tutar yazılır.
- **R30/2.** Yazılan tutar **gider tutarıdır**, yani kalem listesinin "Tutar" sütunuyla aynı rakam (0076 R19). Ödeme hatırlatıcısının satırındaki "ödenecek" tutarı **kullanılmaz**: bu bir borç listesi değil (R28) ve peşin ödenmiş kalemin ödeneceği sıfırdır, yani sütun bilgi vermezdi. Aynı kaleme iki ekranda farklı tutar yazılmaz.
- **R31.** Sıra bitiş gününe göredir: en önce biteni en üstte.
- **R32.** Liste boşsa bölüm çizilmez; üç bölümün hepsi boşsa pencere bugünkü boş durum metnini gösterir.
- **R32/2.** Pencerenin boş durum hesabı **üç sayıya** bakar (bugün iki sayıyı topluyor; güncellenmezse yalnız üçüncü bölüm doluyken pencere boş durum metnini basardı) ve boş durum metni üçüncü kavramı da söyleyecek biçimde bir cümle kazanır. Gerekçe: üç bölümlü pencerenin boş durumu iki bölümden söz ederse kullanıcı kapsam hatırlatmasının çalışmadığını sanır.
- **R32/3.** Aynı kalem iki bölümde birden görünebilir (vadesi geçmiş borcu olan ve kapsamı dolan kalem); bölümler farklı soruya cevap verdiği için bu doğrudur ve engellenmez.
- **R33.** Bu hesap ödeme hatırlatıcısının kapsamını **değiştirmez**: borç hatırlatıcısının iki sayısı, kapsam kuralı ve Giderler'in "Hatırlatma kapsamı" süzgeci bugünkü hâliyle kalır.
- **R33/2.** Pencerenin "Giderlerde Görüntüle" düğmesi Giderler'i hatırlatma süzgeciyle açar ve o süzgeç R33 gereği değişmez; yani kapsam satırı o süzgeçte **bulunmaz**. Üçüncü bölümün başlığının altında bunu söyleyen tek cümlelik bir ibare durur ve sınır Context'e kabul edilmiş olarak yazılır. Altıncı bir süzgeç değeri bilinçli olarak eklenmez (R33 ve 0003'ün kart ile süzgeç eşitliğini açardı).
- **R34.** Satırda eylem düğmesi yoktur. Kullanıcı yenilemeyi gider kaydı girerek yapar.

### Ayar

- **R35.** Kapsam bitişi eşiği Ayarlar › Giderler › Gider Ayarları'nda gün olarak girilir; varsayılanı 30 gündür.
- **R35/2.** Ayarın kalıcı anahtarı ve okuma zinciri adıyla yazılır: `giderAyarlari.kapsamBitisEsikGun`, varsayılan sabiti `KAPSAM_BITIS_ESIK_VARSAYILAN = 30`, okuyucu `kapsamBitisEsigi(giderAyarlari)`, doğrulayıcı `kapsamBitisEsikDogrula` (0003'ün ödeme eşiği ikizi), alan etiketi "Kapsam bitişi hatırlatma eşiği (gün)". Nitelikli ad C13'ün gereğidir: "kapsam" sözcüğü uygulamada üç yerde daha var (Giderler'in hatırlatma kapsamı süzgeci, açık kalemlerin kapsamı, Kasa'nın kapsam dışı kaydı) ve üçü de borç ya da iş listesi kavramıdır.
- **R36.** Geçerli değer 0 ile 365 arasında tam sayıdır; geçersiz değerde kayıt yapılmaz ve nedeni yazılır. Eşik ödeme hatırlatma eşiğinden **ayrı** bir alandır (biri yedi gün, öteki otuz gün varsayılanıyla farklı sorulara cevap verir).
- **R37.** Eşiğin tek okuma yolu vardır ve ayar yok ya da bozuksa varsayılana döner (0003 ve 0076 deseni).

### Değişmeyenler

- **R38.** Ödeme tarafı değişmez: kapsam ay sayısı ödemeyi bölmez, taksit açmaz, vade üretmez. Peşin ödenen gider tek borç ve tek ödeme kaydıdır.
- **R39.** Yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı yok. Alan ve eşik bugünkü yerlerinde durur.
- **R40.** Yeni bir ay aritmetiği, yeni bir eşit bölme ve yeni bir "bugün" kaynağı yazılmaz; var olanlar kullanılır.
- **R41.** Kullanıcı rehberi kapsam alanını, maliyete etkisini ve hatırlatmayı anlatır. Rehber bugün **commit dışıdır** (izlenmeyen klasör); madde, 0074, 0089 ve 0090'da yapıldığı gibi analistin dosyasında güncellenir ve commit'e girmez.
- **R42.** Görsel kanıt: gider formu (alan dolu ve boş), tanım formu, tanım listesinin kapsam satırı, kalem listesi rozeti, pay özetinin bilgi satırı, Üretim Partileri'nin bilgi satırı, Anasayfa kartının üç sayısı, hatırlatma penceresinin üçüncü bölümü, Gider Ayarları'nın yeni alanı.
- **R42/2.** Değişen **mevcut** ekranlar ölçüldü ve kanıt kaydına girer: kalem listesini çizen yaklaşık altmış ekranın yalnız üçünde kapsamlı kalem var. İkisi kısıtlı ve kapsamlı aynı kalemi taşıyor (iki rozet bir arada, R19/2), biri 0072'nin iki peşin kalemini taşıyor. Adı kaldırılan spec'e atıf yapan o ekran bu spec'in adıyla yeniden adlandırılır. Kalan ekranlar etkilenmez.
- **R43.** Gizlilik güvencesi **iki yolla** verilir, çünkü bugünkü gizlilik taraması yalnız yazdırma ve dışa aktarma dosyalarını tarıyor ve yeni hatırlatma listesi bir ekrandır: (a) yeni kitaplığın kaynağında çalışan alanları (çalışan adı, resmi ve elden tutar, ek ödemeler) hiç geçmez (kaynak taraması), (b) personel ve SGK kalemi bulunan veride pencere çizilir ve ayırt edici çalışan adı ile tutar ekranda aranır (arayüz testi). R29 ve AC-50'nin "hiçbir koşulda" iddiası ancak ekran üstünde ölçülür.

---

## Constraints

### Uyulması zorunlu

- **C1.** 0090 önkoşuldur ve bu spec onun X1'ini açar. 0090'ın kaldırdığı **atama** tarafı geri gelmez: makina seçici, model satırları, kovalar ve Dönem Raporu'nun kova kutusu kapsam dışıdır (X1). Geri dönen tek şey ay sayısı alanıdır.
- **C2.** Tutarın tek okuma yolu korunur: yayılan tutar `gider.kalemGiderTutari`'dır (0076 C3). Kalemin tutarını yeniden türeten ikinci bir hesap yazılmaz.
- **C3.** Havuzun rol kuralları aynen korunur: rol tür düzeyindedir, çöpteki türün kalemi türüyle okunur (0078 C2), türsüz kalem hiçbir havuza girmez ve sayılır, yürürlük öncesi dönem boş döner. Yayma bu kuralların üstüne gelir, yerine geçmez.
- **C4.** Dönem havuzu ile ayların toplamı arasındaki eşitlik (0088 C3) testle sabitlenir. Bu eşitlik bu spec'in çift sayım güvencesidir: aynı kalem bir ekranda yayılıp öbüründe yayılmadan görünemez.
- **C5.** Ay kümesi ve üretim tarihi zinciri tek kaynaktan okunmaya devam eder (0090 C4).
- **C6.** Hesap saf motorda yazılır, ekran çarpma ve bölme yapmaz (0088 deseni, kaynak taramasıyla korunur).
- **C7.** Gider tarafı TL'dir ve kuruş tamsayısıyla hesaplanır; döviz gider kalemi yoktur. Bölme `esitBol` ile yapılır, artık kuruş kaybolmaz.
- **C8.** Gizlilik kuralı korunur: personel ayrıntısı hiçbir yeni ekrana, satıra ve çıktıya girmez (K21); yeni hatırlatma listesi personel kalemini hiç içermez.
- **C9.** Veri silinmez ve göç yazılmaz. Kapsam ay sayısı bugünkü kalıcı alanında durur; boş ve 1 değeri gövdeye yazılmaz (bugünkü yazma kuralı).
- **C10.** Ödeme hatırlatıcısının motoru ve kapsamı dokunulmaz. Kapsam bitişi **ayrı** bir saf fonksiyondur; kart iki sonucu birlikte alır. Gerekçe ölçülmüştür: 0003'ün kapsam eşitliğini (AC-14) sabitleyen testler var ve o kapsam borç kapsamıdır.
- **C11.** Alanın etiketi ve rozet metni "dağıtım" demez, "kapsadığı ay" der. Kavram değişti: eskiden maliyetin ortak kovasını bölen bir ayar, şimdi kalemin karşıladığı süreyi söyleyen bir bilgi.
- **C12.** Ayar alanı Gider Ayarları formunun **hem ilk durumuna hem kaydet listesine** eklenir (0084'ün dersi: yalnız birine eklenen alan sessizce kaydedilmez).
- **C13.** Ad tuzağı taraması: kapsam ay sayısının okuyucusu ile ödeme tarafının taksit ve vade kavramları hiçbir alan paylaşmaz (0023 "mesai", 0074 "rol" dersleri). Yeni eşik alanının adı ödeme hatırlatma eşiğine benzemez.
- **C14.** 0090'ın ters çevrilen kriterleri ve iki kaynak taraması **güncellenir, silinmez**: taramadan yalnız dağıtım alanına ve rozetine ait satırlar düşer; atamaya ait satırların hepsi aynen kalır. Yeni etiket ve rozet adı taramaya eklenir ki kavram ikinci kez kaymasın.
- **C15.** 0090'ın kıyas fikstürü (`tests/fixtures/0090-parti-once.json`, `0090-veri.js`) **yenilenmez**: o veride yayılmış kalem yoktur, yani parti rakamları birebir aynı kalmalıdır. Yaymanın kendisi için ayrı bir altın dosya üretilir ve spec öncesi kodla ölçülür.
- **C16.** Kapanış tuzağı yazılıdır ve kabul edilir: 0090 ile kapanmış bir partinin aylarında yayılan kalem varsa, o partinin kapanış karşılaştırma kutusu "değişti" satırı gösterir. Bu doğrudur (havuz gerçekten değişti) ve yeni alan açılmasını gerektirmez; sürüm notunda yazılır.
- **C17.** **Adlandırma bu spec'te kararlaştırılır ve tarama iki yönlü olur** (C11 ve C13'ün uygulaması, R5). 0090'ın "silinen bileşenler ve adlar" taraması eski bileşen adını yasaklıyor ve yasak **aynen kalır**: geri dönen alan eski adı değil R5'in adlarını alır. 0090'ın "ekran metinleri" taramasından yalnız eski alan etiketi ve eski rozet kimliği düşer; yerine yeni etiket ve yeni rozet kimliği taramaya **pozitif** olarak eklenir. 0090 AC-13'ün ikinci yarısı ("aya dağıtılmış" metni kaynakta yok) **silinmez, korunur**: yeni rozet metni o kalıbı kullanmaz. Gerekçe: eski adların geri gelmesi, kavramın ikinci kez kaymasını yasaklayan C11'i kodda görünmez kılar.
- **C18.** **Hangi altın dosyanın yenilenmediği adıyla yazılır.** Ölçüldü: 0076'nın ortak veri fikstüründe kapsamı altı ay olan bir kalem var ve o fikstür 0088 ile 0082'nin kıyas testlerini besliyor; 0089'un veri fikstüründe kapsamı on iki ay olan "Yıllık sigorta" kalemi var. Buna rağmen üç altın da **yenilenmez**: 0088 ile 0082'nin altınları eski maliyet motorunu ve rapor motorunun tür kırılımını karşılaştırıyor (ikisi de yaymadan etkilenmez), 0089'un altını Dönem Raporu ile yazdırılan raporu karşılaştırıyor (R20 ve AC-36 onları birebir koruyor). 0090'ın parti altını da yenilenmez (C15: o veride kapsamlı kalem yok, ölçüldü). Yeni altın **yalnız ay tablosu** için üretilir.
- **C19.** Yürürlük değişmezi korunur (R15/2): gider tarihi yürürlük ayından önce olan kalem hiçbir aya pay vermez. Bu spec yürürlük eşiğinin anlamını değiştirmez.

### KAPSAM DIŞI

- **X1.** Gider atamasının (makina, model satırları, kovalar) geri getirilmesi — *neden:* 0090'ın kaldırdığı karmaşıklığın kendisi oydu ve yeni hesapta karşılığı yok. Tek maliyet modeli kuralı korunur.
- **X2.** Tek bir gider kalemini havuzdan dışlama — *neden:* 0090 X2 aynen geçerli; rol tür düzeyindedir.
- **X3.** Kapsamın ay yerine gün hassasiyetinde tutulması (ör. 15 Ocak'tan 14 Ocak'a) — *neden:* havuzun birimi aydır; gün hassasiyeti bütün ay tablosunu değiştirir ve kazancı yok.
- **X4.** Yayılmış kalemin aylara düşen paylarının ay ay listelendiği bir ekran — *neden:* 0072'nin kaldırılan kutusu buydu ve kullanıcı ondan maliyet okumuyordu; havuzun kendisi ve kapsam rozeti yeterli.
- **X5.** "Yenilendi mi" sezgisi: aynı tür ve tedarikçiden sonraki dönemde kalem olup olmadığına bakıp hatırlatmayı susturma — *neden:* tedarikçi değişerek yenilenen abonelikte yanlış susar, yenilenmeyen abonelikte yanlış konuşur. İki yönlü eşik penceresi (R27) aynı işi veriyle yapıyor.
- **X6.** Hatırlatma satırını elle kapatma işareti (tekliflerin "Takipten Kaldır" deseni) — *neden:* yeni kalıcı alan ister ve R27'nin penceresi zaten listeyi kendiliğinden boşaltıyor. İstenirse ayrı küçük iş.
- **X7.** Kapsam bitişinin e-posta, bildirim ya da ses ile duyurulması — *neden:* gider hatırlatıcısı 0003'ten beri bilinçli olarak sessizdir.
- **X8.** Peşin **tahsil edilen** gelirin aylara yayılması (satış tarafı) — *neden:* bu spec gider tarafıdır; gelir tarafında böyle bir talep yok.
- **X9.** `dagitimPaylari` ve eski maliyet motorunun dağıtım yardımcılarının silinmesi — *neden:* o dosya 0089 R5 gereği bir sürüm daha yerinde duruyor; bu spec onun kodunu kullanmaz, kendi yolunu kurar.
- **X9/2.** (revizyon 3) Ölçüldü: eski maliyet motoru (`makinaMaliyeti.js`) `dagitimAyOf`, `dagitimAraligi` ve `dagitimPaylari`'nı atama şartlı semantikleriyle kullanıyor. Bu üç yardımcı o motor için **aynen** kalır (çıktısı ve testleri değişmez); yeni yol, ekranlar ve hatırlatma yalnız `kapsam*` ailesini çağırır (kaynak taraması). Eski hata sabiti ve çözücüsü eski motorda kullanılmadığı için AC-69/2 gereği yeniden adlandırılır.
- **X10.** Kapsam ay sayısının sütun adının veritabanında düzeltilmesi — *neden:* göç ister, kazancı yalnız isimlendirmedir. Bilinen adlandırma borcu olarak yazılır (Context).
- **X11.** Hatırlatma satırının Giderler'de bir süzgeç değeriyle listelenmesi — *neden:* altıncı süzgeç değeri R33'ü ve 0003'ün kart ile süzgeç eşitliğini (AC-14) açar; R33/2'nin tek cümlelik ibaresi sınırı sessiz bırakmadan söylüyor.
- **X12.** Kapsam ay sayısının başka davranışlarda (personel, SGK) kullanılabilmesi — *neden:* R2'nin kavramsal gerekçesi; saklı değer korunur ama etkisizdir (R5/2).

---

## Context

### Ölçüm 1: bugünkü sapmanın büyüklüğü (gerçek motorla, 2026-10-18)

Motoru kurgu veriyle çalıştırdım: internet 24.000 TL (15.01.2026 tarihli tek kalem, yılın tamamı
peşin), yanında aylık 3.000 TL elektrik, iki türün de rolü "genel gidere girer", yürürlük 2026-01,
dört çeyrek partisi, her birinde 20 makina.

| Ay | Bugünkü havuz |
|---|---|
| 2026-01 | **27.000 TL** |
| 2026-02 … 2026-12 | 3.000 TL |

| Parti | Havuz | Makina başı pay | Yayılsaydı |
|---|---|---|---|
| 1. Çeyrek | 33.000 TL | **1.650 TL** | 750 TL |
| 2. Çeyrek | 9.000 TL | **450 TL** | 750 TL |
| 3. Çeyrek | 9.000 TL | **450 TL** | 750 TL |
| 4. Çeyrek | 9.000 TL | **450 TL** | 750 TL |

Model Maliyetleri'nde aynı veri dönem seçimine göre şunu veriyor: 2026-01…2026-12 / 80 adet →
havuz 60.000 TL, pay **750 TL (doğru)**; 2026-01…2026-03 / 20 adet → **1.650 TL**;
2026-04…2026-06 / 20 adet → **450 TL**. Yani yıllık dönemde sapma yok, çeyreklik dönemde ve parti
bazında var. Yılın havuz toplamı iki durumda da 60.000 TL: para kaybolmuyor, yanlış aya yazılıyor.

### Ölçüm 2: alanın bugünkü hâli (0090 sonrası)

Kaldırılan şey **çizim** oldu, veri ve kural yerinde:

| Parça | Yer | Durum |
|---|---|---|
| Kalıcı alan (kalem ve tanım) | `electron/db.cjs:233`, `:265`, yazma `:553` (`dagitimAyYaz`, 1 ve boş değer `null`), okuma `:1536`, `:1540` (`bosOlmayan`) | Yerinde, dört nokta tam |
| Değer çözücü | `src/lib/gider.js:875` `dagitimAyOf`, `:879` `dagitimliMi`, `:881` `dagitimAraligi` (`{aySayisi, ilkAy, sonAy}`) | Yerinde |
| Doğrulama | `src/lib/gider.js:859` `DAGITIM_AY_MAX = 60`, `:860` `DAGITIM_AY_HATASI`, `:861` `dagitimAySayisiCoz` | Yerinde |
| Kayıt kuralı | `src/lib/gider.js:619` `ATAMA_ANAHTARLARI` (dağıtım ayı da listede), `:620` `atamaVerisiKoru`, `:631` | Yerinde, eski değeri koruyor |
| Form durumu | `src/components/GiderForm.jsx:53` | Alan form durumunda var, **çizilmiyor** |
| Tanımdan üretim | `src/lib/gider.js:987` | Değeri kopyalıyor |
| Eşit bölme | `src/lib/gider.js:324` `esitBol` (artık kuruş son parçaya), `:18` `ayEkle` | Yerinde |
| Eski bölme | `src/lib/gider.js:891` `dagitimPaylari` (yalnız **ortak kovayı** böler) | Yerinde ama tek çağıranı ölü motor (`makinaMaliyeti.js:194`) |

İki not: (1) `dagitimAyOf` bugün değeri okumak için `dagitimSecilebilirMi(k.atamaTur)` şartını da
arıyor, yani **ölü alan olan atamaya bağlı**; R7 bu bağı koparıyor. (2) eski `dagitimPaylari` kova
tabanlıdır ve kova artık hiçbir ekranı beslemiyor, bu yüzden yeni yol onu çağırmaz (X9).

### Ölçüm 3: hatırlatma tarafında bugün ne var

| Soru | Cevap | Yer |
|---|---|---|
| Peşin ödenen gider için bitiş hatırlatması var mı? | **Yok** | Kavram hiç yok |
| Gider hatırlatıcısının kapsamı nedir? | Çöpte olmayan, **ödenmemiş**, tarihi olan, yürürlük sonrası, tarihi gelecekte olmayan ve vadesi girilmiş kalemler | `src/lib/gider.js:1191` `borcKapsamindaMi`, `src/lib/odemeHatirlatma.js:115` |
| Peşin ödenmiş fatura bu kapsamda mı? | Ödendiği an **çıkıyor** | Aynı satır (`k.odendi`) |
| Kart neyi gösteriyor? | İki sayı: "Vadesi geçmiş" ve "Yaklaşan" | `src/components/gider/OdemeHatirlatma.jsx:13-31`, pencere `:120`, `:121` |
| Ayarlarda gider tarafına ait eşik var mı? | Yalnız ödeme hatırlatma eşiği (varsayılan 7 gün) | `odemeHatirlatma.js:11`, `:22`, `SettingsGider.jsx:22`, `:36`, `:51`, `:88` |
| Takip Süreleri paneli neyi ayarlıyor? | Yalnız `teklifTakipGun` | `src/components/settings/SettingsTakip.jsx:11` |
| Tekrarlayan tanımın bitiş ayı uyarı veriyor mu? | Hayır: satır yalnız **soluklaşıyor** (`opacity 0.7`) ve listenin sonuna kayıyor; "sona erdi" metni bile yok (gelecekte başlayan için "… ayında başlar" metni var) | `SettingsGiderTanimlari.jsx:126`, `:154`, `:156`, `:159` |
| Elle kapatma emsali var mı? | Var: teklifin `takipKapali` alanı, Anasayfa'daki "Takipten Kaldır" düğmesi | `App.jsx:1689`, `Dashboard.jsx:209` |

### Ölçüm 4: havuzun bugünkü iki yolu (R13'ün gerekçesi)

| Ekran | Havuzu nasıl kuruyor | Dosya |
|---|---|---|
| Model Maliyetleri, Hesap Ayarları | Dönemin tamamı için **tek çağrı** | `makinaStandartMaliyet.js:147` `rolHavuzlari(veri, baslangicAy, bitisAy, bugun)` |
| Parti Hesabı, Üretim Partileri, kapanış görüntüsü | **Ay ay**, her ay için bir çağrı | `:315` `aylikGenelHavuzlar`, `:368`, `:415` |
| İkisinin tabanı | Gider raporunun tür kırılımı (her kalemi kendi ayında, tam tutarıyla toplar) | `:111` `turKirilimiOku` → `gider.js:1088` |

**Bu yüzden yayma yalnız aylık yola eklenirse Model Maliyetleri onu görmez.** R13 dönem havuzunu
ayların toplamı olarak tanımlayarak iki yolu tek tabloya indiriyor; 0088 C3 bu eşitliği zaten
iddia ediyor ("dönemin aylık toplamı dönem havuzuna kuruş kuruş eşittir"), yani tanım değişikliği
yeni bir kural getirmiyor, var olan eşitliği tek uygulamaya çeviriyor. Yan kazanç: bugün ay başına
bir rapor çağrısı yapılıyor; tek geçişte kurulan tablo bu sayıyı artırmaz (R18).

### Ölçüm 5: bugünkü havuz yolu yaymayı üretemiyor (gerçek motorla, 2026-10-18)

Havuzun zinciri şu: rol havuzları → tür kırılımı → gider raporu motoru. Motor kalemleri **tarihe
göre** süzüyor (`gider.js`, kalem filtresi `k.tarih >= bas && k.tarih <= bitis`), yani pencere
içinde tarihli olmayan kalem hiç dönmüyor. Ölçtüm: ölçüm 1'in verisinde Ocak tarihli, kapsamı on
iki ay olan 24.000 TL'lik kalem, Haziran ayının havuz çağrısında **hiç görünmüyor** (2026-06
havuzu 3.000 TL kalıyor, 5.000 TL değil).

| Soru | Ölçüm |
|---|---|
| Ocak kalemi Haziran havuzunda görünüyor mu? | Hayır (tarih süzgeci) |
| Tür kırılımı kalem başına ay ve tutar veriyor mu? | Hayır (tür başına toplam) |
| Rapor nesnesi pencerenin kalemlerini veriyor mu? | Evet (`kalemler` alanı) |
| Parti payı hesabının rapor çağrısı sayısı (12 aylık harita) | **12** |
| Dönem payı hesabının rapor çağrısı sayısı | **1** |

Spec 0090'ın X1'i bu problemi adıyla yazmıştı: "yeni havuz bilinçli olarak tür kırılımından
okunuyor (0088 C); **kalem kalem yürüyen ikinci bir havuz hesabı ayrı iştir.**" R9/2 o ikinci
hesabı yazmadan sorunu çözüyor: rapor motorunun kendi kalem döngüsüne opt-in bir çıktı eklenir,
tutarın tek okuma yolu ve dört kural (yürürlük kırpması, çöpteki tür, 0076 tabanı, türsüz kalem)
tek yerde kalır. Bedeli yazılı: havuzun kaynağı "tür kırılımı" değil "aynı döngünün kalem başına
aylık payı" olur ve 0088 C3'ün tek kaynak iddiası bu yeni çıktıya taşınır.

### Ölçüm 6: yayılmış kalem taşıyan fikstürler (ölçüldü)

| Fikstür | Kapsamlı kalem | Kimi besliyor | Sonuç |
|---|---|---|---|
| `tests/fixtures/0076-veri.js:28` | `dagitimAy: 6`, 24.000 TL | `makina-standart-maliyet-0088`, `standart-kalkar-0082` | Altınlar eski motoru ve rapor tür kırılımını karşılaştırıyor; **yenilenmez** |
| `tests/fixtures/0089-veri.js:32` | `dagitimAy: 12`, "Yıllık sigorta" | `gider-gorunum-0089-kiyas` | Altın Dönem Raporu ve yazdırılan rapor; R20 ve AC-36 koruyor; **yenilenmez** |
| `tests/fixtures/0090-veri.js` | **yok** | `parti-genel-payi-0090` | C15 doğrulandı; parti altını **yenilenmez** |
| `tests/fixtures/0088-veri.js` | **yok** | 0088'in havuz iddiaları | Havuz rakamları güvende |

### Ölçüm 7: görsel kanıtın bedeli (ölçüldü)

Kalem listesini çizen ekran sayısı yaklaşık altmış; bunlardan **yalnız üçünde** kapsamlı kalem var.

| Ekran | Kapsamlı kalem | Ne değişir |
|---|---|---|
| `giderler-0072-liste` | iki peşin kalem (internet, yıllık depo kirası) | İki kapsam rozeti; ekran adı bu spec'in adıyla yenilenir (R42/2) |
| `giderler-0076-liste` | kısıtlı **ve** kapsamlı aynı kalem (`dagitimAy: 3`) | Aynı hücrede iki rozet, sıra R19/2 ile sabit |
| `giderler-0076-kdv` | aynı kalem | Aynı rozet (kutu açık hâlde) |
| Kalan kalem listesi ekranları | yok | Değişmez |

### Onay beklenen kararlar (öneriler yazılıdır, kararı Takım Yöneticisi verir)

| Karar | Seçenekler | Önerim ve nedeni |
|---|---|---|
| 1. Alan yeniden kullanılsın mı? | (a) bugünkü kalıcı alan yeniden kullanılır; (b) yeni alan açılır, eskisi ölü kalır | **(a).** Göç yazılmaz, dört nokta kuralı tetiklenmez, kullanıcının eski girişleri canlanır. Bedeli: eski değerler "dağıt" anlamıyla girilmişti, bazıları abonelik değil amortisman olabilir. R27'nin penceresi bunları kendiliğinden eler (kapsamı çoktan dolmuş kalem listeye girmez) ve adlandırma borcu X10'da yazılı. |
| 2. Hatırlatma nasıl susar? | (a) iki yönlü eşik penceresi; (b) satırı elle kapatma işareti | **(a).** Yeni kalıcı alan istemez ve süresiz nag üretmez. (b) ayrı küçük iş olarak kalır (X6). |
| 3. Dönem penceresinin dışına taşan kapsam | (a) taşsın, pencere neyi kapsıyorsa onu toplasın; (b) kalemin bütün tutarı kendi dönemine sıkıştırılsın | **(a).** Dönemsellik doğru olan. Bedeli yazılı: Ekim'de ödenen yıllık giderin dokuz ayı gelecek yıla gittiği için bu yılın havuzu küçülür ve ilk yıl "gider azaldı" görünür. |
| 4. Hangi roller yayılır? | (a) hepsi; (b) yalnız "genel gidere girer" | **(a), R12.** Aynı kalemin iki havuzda farklı davranması tuzaktır. Bedeli: Parti Hesabı'nın gerçekleşen tedarik karşılaştırması, peşin ödenmiş bir tedarik faturası varsa değişir. |
| 5. Eşik ayarı | (a) ayrı alan, varsayılan 30 gün; (b) ödeme eşiğiyle (7 gün) ortak | **(a), R36.** İki soru farklı: ödeme vadesi günlerle, abonelik bitişi haftalarla düşünülür. |

### Ters çevrilecek kriterler ve taramalar

| Spec | Kriter | Bu spec'te |
|---|---|---|
| 0090 | AC-2 (yeni gider formunda dağıtım alanı hiç çizilmez), `tests/ui/gider-atama-kalkar-0090.test.jsx:28`, `:40` | Alan normal ve kirada çizilir, personel ve SGK'da çizilmez |
| 0090 | AC-3 (tanım formunda dağıtım alanı yok), aynı dosya `:79` | Alan tanım formunda da çizilir |
| 0090 | AC-6, AC-7 (yeni kalemin ve tanımın gövdesinde dağıtım ayı anahtarı hiç yok), `:44`, `:84`, `tests/gider-atama-kalkar-0090.test.js:30` | Anahtar yalnız değer 1'den büyükse yazılır; girilmemişse hâlâ hiç yazılmaz |
| 0090 | AC-13 (dağıtım rozeti hiçbir yerde yok), `:154` | Kapsam rozeti tutar hücresinde çizilir (yeni kimlik ve metin). Kriterin **ikinci yarısı** ("aya dağıtılmış" metni kaynakta yok) silinmez, korunur: yeni rozet metni o kalıbı kullanmaz (C17) |
| 0090 | AC-54 ad taraması (silinen bileşenler), `tests/gider-atama-kalkar-0090.test.js:108` | **Değişmez.** Geri dönen alan eski bileşen adını almaz; ortak bileşenin adı `KapsamAlani` (R5, C17) |
| 0090 | AC-54 kaynak taraması, `tests/gider-atama-kalkar-0090.test.js:109` | `metinler` deseninden dağıtım alanı etiketi ve `dagitim-rozeti` kimliği düşer; atamaya ait altı ifade **aynen kalır** |
| 0090 | AC-54 ad taraması, `:131` | `dagitimRozetMetni` satırı düşer (yerine yeni rozet yardımcısının adı girer); `makinaGiderSayisi`, `modelKullanim`, `modelSatirlariDogrula` **aynen kalır** |
| 0090 | AC-57 (kanıt aracında dağıtım adımı taşıyan ekran kalmaz), `:161`, `:165` | Yeni kapsam ekranları eklenir; atama adımı taşıyan ekran yasağı kalır |
| 0090 | R5/3 (makina ve "dağıtılmasın" atamasında dağıtım düşer), `tests/gider-atama-kalkar-0090.test.js:46-49` | R7: kapsam ay sayısı artık atamaya bakmaz |
| 0072 | R2, R5, R6, R10, R12, R17, R19, R20 (kova tabanlı dağıtım, ortak payın bölünmesi, rozet metni) | Kavram ve taban değişti: bölünen şey kalemin gider tutarı, bölündüğü yer genel gider havuzu |
| 0003 | AC-14 (kart sayıları ile süzgeç eşitliği) | **Değişmez** (R33, C10): yeni sayı ayrı kaynaktan gelir |

### Bilinen tuzaklar

- **Yayma Dönem Raporu'na sızmamalı** (R20). Kalem kendi ayında tam tutarıyla raporlanır; sızarsa ayın gider toplamı, KDV ve borç rakamları bozulur ve 0059'un altın dosyaları kırılır. Ölçüm noktası: rapor nesnesi birebir aynı kalmalı.
- **Çift sayım yalnız eşitlikle yakalanır** (C4). Dönem havuzu ayların toplamına eşit değilse aynı kalem iki ekranda farklı sayılmış demektir.
- **Yürürlük kırpması paylardan sonra uygulanır** (R15). Önce uygulanırsa yürürlükten önce başlayan kapsamın sonraki ayları da elenir.
- **Kapanmış parti kutusu konuşacak** (C16). Bu beklenen bir sonuçtur, hata değil.
- **Ayar alanı iki yere yazılır** (C12).
- **Personel sızması** (C8, R29): yeni hatırlatma satırı tedarikçi ya da açıklama yazar; personel kalemi listeye hiç girmediği için çalışan adı yolu kapalıdır. Tarama `gider-gizlilik.test.js` deseniyle korunur.
- **Havuz yolu yaymayı üretemiyor** (ölçüm 5, R9/2). Ay başına rapor çağrısı yapılan bugünkü yolda, kalemin kendi ayı dışındaki aylarda kalem hiç görünmez. Yaymayı yalnız aylık yola eklemek Model Maliyetleri'ni yanlış bırakır, yalnız dönem yoluna eklemek parti payını yanlış bırakır; tek tablo (R13) ikisini birden çözer.
- **Havuz nesnesi ekranda** (R13/2). Rol tablosunun "Dönemde tutar" sütunu, rolü değiştirilebilen tür kümesi ve pay özetinin boş durumu bu nesnenin üç alanından okunuyor; tanımları yazılmazsa sütun ile havuz ayrışır.
- **Saklı geçersiz değer eski kaydı kilitler** (R4/2). Doğrulama giriş kapısındadır, eski kaydı düzenlenemez yapmak için değil.
- **Kapsamın bitiş günü ay sonudur** (R27/2). Yıldönümü hesabı ay sonuna kırpma ve artık yıl tuzaklarını hatırlatmaya taşırdı.
- **Personel kalemi kapsam taşıyabiliyor** (R5/2). 0072'nin alanı bütün davranışlarda çiziliyordu; davranış kapısı yazılmazsa maaşlar aylara yayılır.
- **Pencerenin boş durumu üç sayıya bakar** (R32/2). Bugünkü hesap iki sayıyı topluyor.
- **Ad tuzağı** (C13): "kapsam" sözcüğü uygulamada iki yerde daha var (hatırlatma kapsamı süzgeci, açık kalemlerin kapsamı) ve ikisi de **borç** kapsamıdır. Yeni kavramın kimlikleri bunlarla karışmayacak biçimde adlandırılır.

---

## Acceptance Criteria

### Alan

- **AC-1.** Normal davranışlı yeni gider formunda kapsadığı ay sayısı alanı çizilir.
- **AC-2.** Kira davranışında da çizilir.
- **AC-3.** Personel davranışında çizilmez.
- **AC-4.** SGK davranışında çizilmez.
- **AC-5.** Tekrarlayan gider tanımı formunda normal ve kira türünde çizilir, personel ve SGK türünde çizilmez.
- **AC-5/2.** Kapsamı 12 olan tanım, tekrarlayan tanım listesinin Tanım hücresinde kapsadığı ay sayısını yazar; tablonun sütun sayısı yedi kalır (R3/2).
- **AC-6.** Alana 0, 61, "abc" ya da ondalıklı değer girilip kaydedilmek istendiğinde kayıt yapılmaz ve alanın altında neden yazar.
- **AC-6/2.** Kapsamı 99 olan (geçersiz, saklı) eski bir kalem formda açıldığında alan boş gelir ve kalem kaydedilebilir; gövdede kapsam anahtarı yoktur (R4/2).
- **AC-7.** Alan boş bırakılırsa kaydedilen gövdede kapsam anahtarı hiç yoktur (boş değerle de yazılmaz).
- **AC-8.** Alana 1 girilirse kaydedilen gövdede kapsam anahtarı hiç yoktur.
- **AC-9.** Alana 12 girilirse kaydedilen gövdede kapsam anahtarı 12'dir.
- **AC-10.** Kapsamı 12 olan eski bir kalem formda açılıp kaydedildiğinde değer 12 olarak korunur.
- **AC-11.** Kapsamı 12 olan tanımdan üretilen kalem kapsamı 12 olarak taşır.
- **AC-11/2.** **Kira** türündeki tanımın kapsamı formda açılıp kaydedildiğinde korunur (R8/2: kapsam kapısı atama kapısından ayrı).
- **AC-12.** Atama türü "makina" olan ve kapsamı 12 olan eski bir kalemin kapsam aralığı on iki aydır (R7: atama şartı kalktı).
- **AC-13.** Kapsam aralığı gider tarihinin ayından başlar: 15.01.2026 tarihli, kapsamı 12 olan kalemin aralığı 2026-01 … 2026-12'dir.
- **AC-13/2.** Aynı kalemin kapsam **bitiş günü** 2026-12-31'dir (kapsamın son ayının son günü, R27/2).
- **AC-14.** Kapsamı 60 olan, 2026-01 tarihli kalemin son ayı 2030-12'dir (üst sınır değeri çalışır).
- **AC-14/2.** Aynı kalemin kapsam bitiş günü 2030-12-31'dir.

### Havuz

- **AC-15.** Kapsamı 12 olan, Ocak tarihli 24.000 TL'lik kalem her ayın havuzuna 2.000 TL verir.
- **AC-15/2.** Kapsamı 12 olan **personel** kalemi yalnız kendi ayının havuzundadır (R5/2); listede rozeti çizilmez.
- **AC-15/3.** Kapsamı 12 olan **SGK** kalemi için aynısı geçerlidir.
- **AC-16.** Kuruşla bölünemeyen tutarda artık kuruş **son aya** yazılır ve ayların toplamı kalemin gider tutarına eşittir.
- **AC-17.** Kapsamı girilmemiş kalem yalnız kendi ayının havuzundadır.
- **AC-18.** Yayılmış kalem bulunmayan fikstürde aylık havuz tablosu spec öncesi kodun ürettiği rakamla birebir aynıdır.
- **AC-19.** Yayılmış kalem bulunmayan fikstürde parti havuzları ve makina başı paylar 0090'ın kıyas altını (`0090-parti-once.json`) ile birebir aynıdır.
- **AC-20.** Dönem havuzu, dönemin aylarının havuzlarının toplamına kuruş kuruş eşittir (yayma varken de).
- **AC-20/2.** Hesap Ayarları'nın rol tablosundaki "Dönemde tutar" sütununun toplamı dönem havuzuna kuruş kuruş eşittir (yayma varken de, R13/2).
- **AC-20/3.** Kalemi dönem penceresinin dışında tarihli ama kapsamı pencereye uzanan türün satırı rol tablosunda görünür ve rolü oradan değiştirilebilir (R13/2).
- **AC-21.** Ölçüm 1'in verisiyle: dönem 2026-01…2026-12 ve varsayılan adet 80 iken makina başı pay 750 TL'dir (yayma öncesi de 750 TL'ydi, değişmez).
- **AC-22.** Aynı veriyle: dönem 2026-01…2026-03 ve adet 20 iken pay yayma ile 750 TL'dir (yayma öncesi 1.650 TL).
- **AC-23.** Aynı veriyle: dört çeyrek partisinin makina başı payı yayma ile dördünde de 750 TL'dir (yayma öncesi 1.650 / 450 / 450 / 450).
- **AC-24.** Kapsamı dönem penceresinin dışına taşan kalemin yalnız pencere içindeki ayları sayılır: 2026-10 tarihli, kapsamı 12 olan kalem 2026 döneminin havuzuna üç aylık payını, 2027 döneminin havuzuna dokuz aylık payını verir.
- **AC-25.** Gider tarihi yürürlük ayından önce olan, kapsamı 12 olan kalem **hiçbir aya pay vermez** (R15/2: yürürlük değişmezi korunur).
- **AC-25/2.** Yürürlük öncesi dönem seçildiğinde pay özeti bugünkü boş durumunu gösterir ve yayma bilgi satırı çizilmez (R13/2, R21/2).
- **AC-26.** Rolü "ürün ağacından gelir" olan kalem de kapsadığı aylara yayılır ve genel havuza girmez.
- **AC-26/2.** Parti Hesabı'nın gerçekleşen tedarik karşılaştırması, kapsamı partinin döneminden taşan bir tedarik faturasında yalnız döneme düşen payı sayar (R12/2).
- **AC-26/3.** Aynı veride standart direkt maliyet (ürün ağacından hesaplanan taraf) değişmez.
- **AC-27.** Rolü "maliyete girmez" olan kalem kapsamı dolu olsa da hiçbir havuza girmez.
- **AC-28.** Türsüz kalem kapsamı dolu olsa da hiçbir havuza girmez ve türsüz sayısında sayılır.
- **AC-29.** Çöpteki türün kapsamlı kalemi türünün rolüyle yayılır (0078 C2 korunur).
- **AC-30.** Çöpteki kalem hiçbir aya pay vermez.
- **AC-31.** Parti payının ağırlıklı aylık bölmesi değişmez: çakışan iki partinin ortak ayında havuz adet ağırlığıyla bölünür ve artık kuruş en önce üretilen makinası olan sahibe gider.
- **AC-32.** Aynı ekran için gider raporu motorunun çağrılma sayısı spec öncesindeki sayıdan fazla değildir (casusla ölçülür): parti payı hesabında spec öncesi 12, dönem payı hesabında 1 ölçüldü.
- **AC-32/2.** Ay tablosu **tek** rapor çağrısıyla kurulur ve aylık ile dönem havuzu aynı tablodan okunur (R9/2, R13).

### Ekran

- **AC-33.** Kalem listesinde kapsamı 12 olan kalemin tutar hücresinde rozet ay sayısını ve aralığı yazar.
- **AC-33/2.** Rozetin metni "12 ayı kapsıyor · 01.2026 – 12.2026" biçimindedir ve tek yardımcıdan gelir (R19/2).
- **AC-33/3.** Kısıtlı **ve** kapsamlı aynı kalemde tutar hücresinde iki rozet alt alta çizilir; sıra önce kısıtlı, sonra kapsam (R19/2).
- **AC-34.** Kapsamı girilmemiş kalemde rozet çizilmez.
- **AC-35.** Rozet "kaçıncı ay" bilgisi yazmaz.
- **AC-36.** Dönem Raporu'nun rapor nesnesi, dört özet kartı, kalem listesinin tutar alt toplamı, KDV satırı, borç özeti ve tedarikçi kırılımı yayma öncesiyle birebir aynıdır (kapsamlı kalem bulunan veride ölçülür).
- **AC-37.** Yazdırılan Aylık Gider ve Kasa Raporu'nun HTML'i yayma öncesiyle birebir aynıdır.
- **AC-38.** Pay özetinde, dönemde yayılmış kalem varsa kaç kalemin yayıldığını söyleyen bilgi satırı görünür.
- **AC-38/2.** Satırın sayısı motordan okunur (havuz nesnesinin yayma alanı); ekran kalem saymaz (R21/2, C6).
- **AC-39.** Yayılmış kalem yoksa bu satır hiç çizilmez.
- **AC-39/2.** Pay özetinin boş durum dallarında (hesap ayarı girilmemiş, yürürlük öncesi, rol yok) satır çizilmez (R21/2).
- **AC-40.** Üretim Partileri'nde aynı bilgi tablonun altında bir kez görünür.
- **AC-41.** Ekranlarda çarpma ve bölme yoktur (kaynak taraması): kapsam payları yalnız motordan okunur.

### Hatırlatma

- **AC-42.** Kapsamı 12 olan ve kapsamının bitişine eşikten az gün kalan kalem Anasayfa kartının üçüncü sayısında sayılır.
- **AC-42/2.** Kapsamı dolan kalem yokken kart yine üç sayı çizer ve üçüncüsü sıfır yazar (R25/2).
- **AC-43.** Aynı kalem hatırlatma penceresinin üçüncü bölümünde listelenir.
- **AC-44.** Kapsamı yeni dolmuş (bitişi bugünden eşik kadar gün öncesine kadar olan) kalem de listede görünür.
- **AC-45.** Kapsamının bitişi eşiğin iki yanının dışında kalan kalem listede görünmez.
- **AC-45/2.** Bitişe tam eşik kadar gün kalan kalem listede görünür; eşiği bir gün aşan kalem görünmez. Aynısı geçmiş yönde de geçerlidir (iki uç dahil, R27/3).
- **AC-45/3.** Eşik 0 iken yalnız bitişi bugün olan kalem görünür (R27/3).
- **AC-46.** Ödenmiş kalem listede görünür (bu bir borç listesi değildir).
- **AC-47.** Çöpteki kalem listede görünmez.
- **AC-48.** Yürürlük ayından önceki kalem listede görünmez.
- **AC-49.** Kapsamı girilmemiş kalem listede hiç görünmez.
- **AC-49/2.** Tarihi girilmemiş kalem listede görünmez (R28/2).
- **AC-50.** Personel ve SGK kalemi listede hiç görünmez; çalışan adı ve çalışan bazlı tutar listede hiçbir koşulda geçmez.
- **AC-50/2.** Personel ve SGK kalemi bulunan veride pencere çizilir, ayırt edici çalışan adı ve tutar ekranda aranır ve bulunmaz (R43 (b)).
- **AC-51.** Satır kapsam aralığını ve bitişe kalan (ya da geçen) gün sayısını yazar.
- **AC-52.** Satır tutarı yazar: gider tutarı, yani kalem listesinin "Tutar" sütunuyla aynı rakam (R30/2).
- **AC-53.** Liste bitiş gününe göre artan sıradadır.
- **AC-54.** Liste boşsa pencerenin üçüncü **bölümü** çizilmez (kartın üçüncü **sayısı** sıfır yazar, AC-42/2) ve pencere diğer iki bölümünü aynen gösterir.
- **AC-54/2.** Yalnız üçüncü bölüm dolu, diğer ikisi boşken pencere boş durum metnini **göstermez**, üçüncü bölümü çizer (R32/2).
- **AC-55.** Üç liste de boşsa pencere boş durum metnini gösterir.
- **AC-55/2.** Boş durum metni kapsam bitişinden de söz eder (R32/2).
- **AC-56.** Ödeme hatırlatıcısının iki sayısı ve Giderler'in "Hatırlatma kapsamı" süzgecinin kalem sayısı, kapsamlı kalem eklenince değişmez.
- **AC-56/2.** Üçüncü bölümün başlığının altında, bu bölümün Giderler'in hatırlatma süzgecine girmediğini söyleyen ibare görünür (R33/2).
- **AC-57.** Gider yetkisi olmayan kullanıcıda kart ve pencere bugünkü gibi hiç çizilmez.

### Ayar

- **AC-58.** Gider Ayarları'nda kapsam eşiği alanı vardır ve varsayılanı 30 gündür.
- **AC-59.** Ayar hiç yokken ya da bozukken eşik 30 gün olarak okunur.
- **AC-60.** Eşiğe -1, 366 ya da "abc" girilip kaydedilmek istendiğinde kayıt yapılmaz ve neden yazar.
- **AC-61.** Kaydedilen eşik yeniden açıldığında alanda durur (ilk durum ve kaydet listesi birlikte; C12).
- **AC-62.** Eşik değişince hatırlatma listesi aynı turda yeni eşikle hesaplanır.
- **AC-63.** Ödeme hatırlatma eşiği ile kapsam eşiği birbirinden bağımsızdır: biri değişince öteki değişmez.

### Değişmeyenler

- **AC-64.** Kapsam ay sayısı girilen kalemin ödenecek tutarı, taksit planı, vadeleri ve ödeme hedefleri değişmez.
- **AC-65.** Kapsam ay sayısı yeni bir ödeme kaydı, hareket ya da borç satırı üretmez.
- **AC-66.** Yeni eylem izni yoktur: kapsam alanını yazmak bugünkü gider ekleme ve düzenleme izinleriyle, eşiği yazmak bugünkü ayar izniyle olur.
- **AC-67.** Yeni veri bölümü, yeni sunucu kuralı ve yeni birleştirme kuralı yoktur (kaynak taraması).
- **AC-68.** Veritabanı okuma ve yazma yolu değişmemiştir: boş ve 1 değeri gövdeye yazılmaz.
- **AC-69.** Kullanıcıya görünen bütün yeni metinler Türkçedir ve "dağıtım" sözcüğünü kullanmaz.
- **AC-69/2.** Alanın etiketi, ipucu ve hata metni R2/2'de yazılan metinlerdir; eski "Dağıtım ay sayısı …" hata metni kaynakta yoktur.
- **AC-70.** Yeni adlar yerindedir ve taramada pozitif olarak aranır: çözücüler, yeni kitaplık, ortak alan bileşeni, rozet yardımcısı ve rozet kimliği (R5, C17).
- **AC-71.** 0090'ın "silinen bileşenler ve adlar" taraması değişmemiştir (eski bileşen adı hâlâ yasaktır) ve AC-13'ün "aya dağıtılmış metni kaynakta yok" yarısı hâlâ geçerlidir (C17).
- **AC-72.** 0088, 0082, 0089 ve 0090'ın altın dosyaları yenilenmemiştir ve testleri yeşildir (C18).
- **AC-73.** Ölçüm 7'nin üç mevcut ekranının kanıt kaydı güncellenmiştir; adı kaldırılan spec'e atıf yapan ekran yeniden adlandırılmıştır (R42/2).
- **AC-74.** Yeni kitaplığın kaynağında çalışan adı, resmi tutar, elden tutar ve ek ödemeler geçmez (R43 (a), kaynak taraması).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap saf motorda yazıldı (havuz yayması ve kapsam bitişi ayrı ayrı), arayüz yalnız gösteriyor; ekranda çarpma ve bölme olmadığı taramayla sabitlendi.
- [ ] **Yaymanın mekanizması R9/2'nin opt-in seçeneğiyle kuruldu:** gider raporu motorunun seçeneksiz çıktısı birebir eski, ay tablosu tek çağrıyla kuruluyor ve rapor çağrı sayısı spec öncesinden fazla değil (AC-32, AC-32/2).
- [ ] Havuz nesnesinin üç parçası R13/2'ye göre tanımlandı ve rol tablosunun sütun toplamı dönem havuzuna eşit (AC-20/2, AC-20/3).
- [ ] Yürürlük değişmezi korundu: gider tarihi yürürlükten önce olan kalem hiçbir aya pay vermiyor (AC-25, C19).
- [ ] Yaymanın davranış kapısı yazıldı: personel ve SGK kalemi kapsam taşısa da yayılmıyor (AC-15/2, AC-15/3).
- [ ] Kapsamın bitiş günü kapsamın son ayının son günü; iki uçlu pencerenin sınır değerleri testli (AC-13/2, AC-14/2, AC-45/2, AC-45/3).
- [ ] Dönem havuzu ile ayların toplamı arasındaki eşitlik testle sabitlendi (C4).
- [ ] Yayılmamış veride spec öncesi rakamlarla birebir eşitlik iki altın dosyayla gösterildi: aylık havuz tablosu (yeni altın) ve 0090'ın parti altını (**yenilenmedi**, C15).
- [ ] 0088, 0082 ve 0089'un altınları da **yenilenmedi** ve testleri yeşil; ölçüm 6'nın tablosu hangi fikstürün kapsamlı kalem taşıdığını yazıyor (C18, AC-72).
- [ ] Dönem Raporu'nun rapor nesnesi ve yazdırılan raporun HTML'i birebir aynı (AC-36, AC-37).
- [ ] Yeni kalıcı alan **açılmadı**; bugünkü alanın dört noktası dokunulmadı ve `db-roundtrip` testi yeşil.
- [ ] Yeni veri bölümü ve yeni eylem izni **yok**; bu açıkça yazıldı ve taramayla sabitlendi.
- [ ] 0090'ın ters çevrilen kriterleri ve iki kaynak taraması güncellendi; atamaya ait satırların hepsi aynen kaldığı gösterildi (C14). "Silinen bileşenler ve adlar" taraması **değişmedi** ve AC-13'ün "aya dağıtılmış" yasağı korundu (C17, AC-71).
- [ ] Bütün yeni adlar R5'te yazılan adlardır ve taramada pozitif aranıyor (AC-70); kalıcı alanın adı değişmedi (X10).
- [ ] Ayar alanının kalıcı anahtarı R35/2'de yazılan anahtardır ve formun hem ilk durumunda hem kaydet listesinde (C12, AC-61).
- [ ] Gizlilik güvencesi **iki yolla** verildi (R43): yeni kitaplığın kaynağında çalışan alanları geçmiyor (AC-74) ve personel ile SGK kalemi bulunan veride pencere ekran üstünde ölçüldü (AC-50/2). Yeni bilgi satırlarında da çalışan adı ve çalışan bazlı tutar yok.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısına yeni metin girmedi.
- [ ] Para kuruş tamsayısıyla; artık kuruş son aya yazılıyor ve ayların toplamı kalemin tutarına eşit.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (R42'nin dokuz ekranı, boş ve hata durumları dâhil) ve kanıt eşlemesi `beklenen: "degisti"` + `Takım Yöneticisi · YYYY-AA-GG · spec 0092 R42` onay dizesiyle güncellendi.
- [ ] Ölçüm 7'nin üç mevcut ekranı kanıt kaydına girdi ve adı kaldırılan spec'e atıf yapan ekran yeniden adlandırıldı (R42/2, AC-73).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır. Electron testleri de koşuldu.
- [ ] `CLAUDE.md` güncellendi: kapsam kavramı, gider raporu motorunun opt-in aylık payı, havuzun tek tablosu (dönem = ayların toplamı), havuz nesnesinin yeni alanları, kapsam bitişi hatırlatması ve eşiği, yaymanın davranış kapısı, 0072'nin kavramının nasıl değiştiği, adlandırma borcu (sütun adı) ve C16'nın kapanış sonucu.
- [ ] Sürüm notu yazıldı: kapanmış partilerin değişim kutusunun konuşabileceği (C16), ilk yılın havuzunun taşan kapsamlar yüzünden küçülebileceği (karar 3) ve yürürlükten önce peşin ödenmiş faturanın havuza hiç girmediği (R15/2).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-18)

Yirmi yedi bulgu Takım Yöneticisi tarafından onaylandı ve aşağıdaki maddelere çevrildi.

| Bulgu | Soru | Karar ve nerede yazılı |
|---|---|---|
| **B-1** | Yayma hangi mekanizmayla hesaplanır? Bugünkü havuz yolu onu üretemiyor (ölçüldü); 0090 X1 bunu "ayrı iş" diye ertelemişti | Gider raporu motoruna opt-in seçenek, kalem başına aylık pay, tek çağrı · **R9/2**, **R9/3**, ölçüm 5, **C2** |
| **B-2** | Havuz nesnesinin rol satırları, adedi ve yürürlük bayrağı yayma altında ne olur? | Satır tutarı yayılmış tutar, adet kalem sayar, bayrak bugünkü anlamını korur · **R13/2**, **AC-20/2**, **AC-20/3**, **AC-25/2** |
| **B-3** | R15 ile AC-25 çelişiyor; yürürlük öncesi tarihli kalem havuza girer mi? | Girmez, değişmez korunur · **R15**, **R15/2**, **C19**, **AC-25** |
| **B-4** | Kapsamın bitiş günü hangi gündür? | Kapsamın son ayının son günü · **R27/2**, **AC-13/2**, **AC-14/2** |
| **B-5** | Yayma davranışa bakar mı? Personel ve SGK kalemi kapsam taşıyabiliyor | Yalnız normal ve kira yayılır · **R5/2**, **X12**, **AC-15/2**, **AC-15/3** |
| **Ö-1** | Yeni ayarın kalıcı anahtarı ne? | `kapsamBitisEsikGun` ve okuma zinciri · **R35/2** |
| **Ö-2** | Yeni adlar ne ve tarama hangi yöne bakar? | Adlar R5'te, tarama iki yönlü · **R5**, **C17**, **AC-70**, **AC-71** |
| **Ö-3** | "Kaç kalem yayıldı" satırının ölçütü ve taşıyıcısı? | Kesişim, motorun alanı, boş durumda çizilmez · **R21/2**, **AC-38/2**, **AC-39/2** |
| **Ö-4** | Hatırlatma satırının tutarı hangi tutar? | Gider tutarı (kalem listesiyle aynı) · **R30/2**, **AC-52** |
| **Ö-5** | Üçüncü sayı çizilir mi, kartın alt metni ne olur? | Kart her zaman üç sayı, alt metin yeniden yazılır · **R25/2**, **AC-42/2**, **AC-54** |
| **Ö-6** | "Giderlerde Görüntüle" üçüncü bölümü kapsamıyor | Sınır ibareyle söylenir, süzgeç değişmez · **R33/2**, **X11**, **AC-56/2** |
| **Ö-7** | Tanım listesinde kapsam görünmüyor | Tanım hücresinde satır, sütun sayısı aynı · **R3/2**, **AC-5/2** |
| **Ö-8** | Saklı geçersiz değer kaydı engeller mi? | Engellemez, form boş açar · **R4/2**, **AC-6/2** |
| **Ö-9** | Parti Hesabı'nın üçüncü havuz yolu yaymayı görmüyor | O da yeni ay tablosundan okur · **R12/2**, **AC-26/2**, **AC-26/3** |
| **Ö-10** | Hangi altın yenilenmez? Kapsamlı kalem taşıyan fikstürler var | Dört altın da yenilenmez, ölçüm tabloya girdi · **C18**, ölçüm 6, **AC-72** |
| **K-1** | Hata metni "dağıtım" diyor | Üç metin yeniden yazıldı · **R2/2**, **AC-69/2** |
| **K-2** | Aynı hücrede rozet sırası? | Önce kısıtlı, sonra kapsam · **R19/2**, **AC-33/3** |
| **K-3** | Tarihsiz kalem hatırlatmada? | Görünmez · **R28/2**, **AC-49/2** |
| **K-4** | Eşiğin uçları dahil mi? | İki uç dahil · **R27/3**, **AC-45/2** |
| **K-5** | Eşik 0 ve kapsam 60 uçları? | Sıfırda yalnız bugün; 60'ın bitişi yazıldı · **R27/3**, **AC-14/2**, **AC-45/3** |
| **K-6** | Aynı kalem iki bölümde birden görünür mü? | Görünür; boş durum üç sayıya bakar · **R32/2**, **R32/3**, **AC-54/2** |
| **K-7** | Pencerenin boş durum metni yalnız borcu anlatıyor | Bir cümle eklenir · **R32/2**, **AC-55/2** |
| **K-8** | Kapsam anahtarı atama listesinde; kira tanımında düşüyor | Kendi sabitine alınır, iki bağımsız kapı · **R8/2**, **AC-11/2** |
| **K-9** | Görsel kanıtın bedeli ölçülmedi | Üç ekran ölçüldü ve kayda girdi · **R42/2**, ölçüm 7, **AC-73** |
| **K-10** | Gizlilik güvencesinin yolu yazılı değil | Kaynak taraması artı arayüz testi · **R43**, **AC-50/2**, **AC-74** |
| **K-11** | Rozet metninin biçimi? | "12 ayı kapsıyor · 01.2026 – 12.2026" · **R19/2**, **AC-33/2** |
| **K-12** | R41 commit dışı rehberi istiyor | Madde analistin dosyasına yazıldı · **R41** |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
