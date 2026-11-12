# 0144 — Sipariş belgesinde parça altı malzeme ve fiyatlı nüsha

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-12; yedi karar ve mockup turunun A-R5 netleştirmesi dâhil). Revizyon 2: plan turunun on bir kararı işlendi (Karar 34–44); triyajda B-R5/7. **Tamamlandı:** commit `c4a08686`, plan `specs/done/0144-uygulama-plani.md` |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Sipariş Listesi penceresinin yazdırma çıktısı (`siparisRaporu.js`), yazdırma düğmesi ve yeni nüsha soru penceresi (`rapor/`), sipariş penceresinin soru durumu (`stock/SiparisPenceresi.jsx`), saf motor `siparisIhtiyaci.js`'in belge bölümleri, para biçimi yardımcıları (`malzeme.js`, `siparisIhtiyaci.js`), kanıt aracının belge ekranı, altı kıyas altınının ayıklaması |
| **Bağımlı spec'ler** | 0134 (sipariş ihtiyacı motoru), 0140 (tedarikçi odaklı liste ve belge), 0142 (belgenin parça odaklı sütunları, paranın kalkması), 0143 (boydan sipariş işareti), 0139 (kilogram fire), 0132 (malzeme kartı, fiyat kümesi, kayıtlı kur), 0126 (iç içe pencerede Escape) |
| **QA turu** | 2026-11-12: 33 bulgu (5 Bloklayıcı, 17 Önemli, 11 Küçük); hepsi onaylandı ve spec'e işlendi |
| **Düzeltilen iddialar** | Dört: `fiyatMetni`'nin ondalık sayısı (C5), motorda zaten duran kuruş tabanlı tutar metinleri (Context), belge satırının `malzemeli` bayrağının anlamı (Context), fiyatsız nüsha kıyasının satır sayısı (C4, AC-42) |

---

## Intent

Satın almayı yapan kişi sipariş listesini bastığında tedarikçiye "şu parçalar için şu malzemeleri kes" diyor. Bugün belge bu iki bilgiyi iki ayrı tabloda veriyor: üstte parçalar ve adetleri, altta alınacak malzeme toplamı. Hangi parçanın hangi toplamın içinde olduğunu ve o parçanın ne kadar malzeme götürdüğünü kâğıtta hiç kimse göremiyor; kesimci tedarikçiye "bu 70 pul kaç çubuk eder" diye sorduğunda cevap belgede yok. Takım Yöneticisi her parçanın altında o parçanın malzemesini ve miktarını, aşağıda da bölümün toplamını istiyor.

İkinci istek fiyat: aynı belgenin fiyatlı bir nüshası. Bugün belgede hiç rakam yok, bu yüzden siparişin ne tutacağı ancak ekrandaki pencereye geri dönüp malzeme kartlarına bakarak anlaşılıyor. Yazdır düğmesi fiyatlı mı fiyatsız mı diye sormalı; fiyatlı nüshada sipariş miktarının yanında birim fiyat ve tutar bulunmalı.

Başarı şöyle görünür: tedarikçiye verilen kâğıtta her parçanın altında `malzeme · PASLANMAZ 304` satırı var, ölçü sütununda `Ø30 · 400 mm çubuk`, miktar sütununda `7 boy` yazıyor; bölümün sonunda o firmadan alınacak malzemenin toplamı duruyor. Fiyatlı nüshada aynı satırların yanında `2,85 $/kg` ve `44,53 $` görünüyor ve bölümün sonunda toplam hem dövizle hem kayıtlı kurla TL olarak yazıyor. (Ölçü metni `cubukEki`'nin bugünkü biçimidir, ön ek `MALZEME_ETIKETI`'dir; QA turu karar 6 ve karar 29.)

---

## Requirements

### A. Parçanın altındaki malzeme

- **A-R1.** Belgede malzemeden kesilen her parçanın altındaki malzeme satırı, bugün yalnız malzemenin adını yazıyor; bundan sonra aynı satır o parça için alınacak malzemeyi de söyler: malzemenin kesiti (boydan sipariş edilen malzemede çubuk boyuyla birlikte) ve miktar.
- **A-R1/2.** Satırın kaynağı motordur: her parçanın her kesidi için pay motorda hesaplanır ve belge satırına hazır malzeme satırları dizisi olarak yazılır. Belge kurucusu kesit anahtarıyla eşleştirme yapmaz. Giriş, parça ile kesit anahtarı başına tektir. Gerekçe: bir parça aynı kesitte iki kalemle görünebilir (Ölçüm M) ve ölçü girişinin boyu üç ondalığa yuvarlanmışken kesidin `kesimBoyu`'su hamdır (Ölçüm N); eşleştirmeyi belgeye bırakmak orada kayan nokta kuralı yazmak olur, C1 bunu yasaklar.
- **A-R1/3.** Satırın kesiti `Ölçü` sütununa, miktarı `Sipariş adedi` sütununa yazılır (sağa dayalı). Parça tablosunun başlıkları değişmez: `["Parça", "Ölçü", "Sipariş adedi"]` (0142 AC-3 ve AC-7 bunları birebir sabitliyor).
- **A-R1/4.** Satır bugünkü `malzeme · ` ön ekiyle (`MALZEME_ETIKETI`) başlamaya devam eder (0142 AC-8); ön ek satırın parçanın alt satırı olduğunu söyler.
- **A-R1/5.** Bir parçanın malzeme satırlarının sırası kalemlerinin sırasıdır (bugünkü `olculer` sırası).
- **A-R2.** Bir kesidi **yalnız bir parça** kullanıyorsa, o parçanın altındaki miktar bölümün toplam satırındaki miktarın aynısıdır (yukarı yuvarlanmış, varsa asgari siparişe tamamlanmış ya da elle girilmiş hâli). Gerekçe: bölünme yoktur, iki rakamın ayrışması okuyucuyu yanıltır.
- **A-R2/2.** "Yalnız bir parça" ölçütü kesidin farklı **parça** sayısıdır, kesit satırındaki giriş sayısı değil. Aynı parçanın aynı kesitteki bütün kalemleri tek malzeme satırında toplanır (0142 AC-14'ün kardeşi: orada aynı ölçünün kalemleri toplanıyordu, burada aynı kesidin farklı boyları). Gerekçe: iki kalemli tek parçada satır bazında ölçmek toplamın rakamını iki satıra basar ve kesimci iki rakamı toplayıp fazla sipariş verir.
- **A-R3.** Bir kesidi **birden çok parça** paylaşıyorsa her parçanın altındaki miktar o parçanın payıdır ve yuvarlanmaz: kilogramla sipariş edilen malzemede kilogram, boydan sipariş edilen malzemede kesirli boy adedi ve karşılığı kilogram.
- **A-R3/2.** Kesirli boy adedi en çok üç ondalıkla (motorun bugünkü `sayiHane` biçimi), kilogram `kgMetni` ile (üç ondalık) yazılır. Belgenin bugünkü sayı biçimi `raporSunumu.sayi` sıfır ondalık bastığı için (Ölçüm J) pay o biçimle yazılmaz.
- **A-R4.** Pay, bölümün toplam satırıyla **aynı tabandan** gelir: boydan sipariş edilen satırda tam çubuk ağırlığıyla (fire eklenmez), kilogramla sipariş edilen satırda fire dâhil kilogramla.
- **A-R5.** Paylaşılan kesitte yukarı yuvarlama, asgari siparişe tamamlama ve elle girilmiş sipariş miktarı yalnız bölümün toplam satırında görünür; A-R3'ün payları bunları içermez. A-R2'nin tek parçalı satırı toplamın rakamını yazdığı için orada fark doğmaz.
- **A-R6.** Payların toplamı bölümün toplamından küçük kaldığında bölümün sonunda bunu söyleyen tek bir not bulunur. Fark yoksa not basılmaz.
- **A-R6/2.** Notun metni tek sabittir, yeri toplam tablosunun hemen altıdır (bugünkü `KESIT_KAPALI_UYARISI`'nın önünde) ve eşiği 0,001 kilogramdır: bu eşiğin altındaki fark basılmaz. Gerekçe: kilo yolunda payların toplamı matematikte toplama eşit ama kayan noktada eşit olmayabilir; gösterimde görünmeyen fark için not basmak gürültüdür.
- **A-R6/3.** Not yalnız toplam, payların toplamından 0,001 kilogramdan fazla **büyükken** basılır. Elle girilen değer toplamı payların altına indirdiğinde not basılmaz; o durumu bugünkü elle notu (`ELLE_NOTU`) zaten söyler (plan turu Karar 38).
- **A-R7.** Hazır parçanın (malzeme kalemi olmayan parçanın) altında malzeme satırı bugün olduğu gibi yoktur.
- **A-R8.** Ölçüsü girilmemiş malzeme kalemi pay üretmez; bugünkü "ölçüsü girilmemiş" ibaresi parçanın adının altında kalır.
- **A-R8/2.** Ölçüsü girilmemiş kalemin malzeme adı satırı bugün olduğu gibi basılmaya devam eder; kesit ve miktar hücreleri **boş dize** kalır. Gerekçe: `detayTablo` boş hücreye `null` geçilince tire koyar (Ölçüm K) ve satırı kaldırmak fiyatsız nüshanın kıyasını (C4) daha da bozar.
- **A-R8/3.** Payı olmayan satırlar (ölçüsü girilmemiş kalem, malzemesi çöpte ya da bulunamayan kalem) bugünkü malzeme adı dizisinden gelmeye devam eder; payı olan satırlar A-R1/2'nin dizisinden gelir. Alan yerinde kalır (0142 AC-8 onu sabitliyor).
- **A-R9.** Parçası sipariş edilmeyen (bütün parçaları kapatılmış) malzeme satırı yalnız bölümün toplam tablosunda görünür, hiçbir parçanın altında yazılmaz.
- **A-R9/2.** Tersi durumda, yani kesidi "sipariş etme" işaretli ama parçası açıkken, malzeme satırı basılır, miktar hücresi boş kalır ve satırın altında sipariş edilmediğini söyleyen kısa ibare bulunur. Gerekçe: pay yazmak tedarikçiye sipariş edilmeyen malzemeyi kesmesini söyler; satırı hiç basmamak parçanın hangi malzemeden kesildiğini saklar. Bölümün sonundaki bugünkü `KESIT_KAPALI_UYARISI` aynen kalır.
- **A-R9/3.** Fiyatlı nüshada böyle bir satırın birim fiyat ve tutar hücreleri de boş kalır; satır parça satırının tutarına ve bölümün tutarsız satır sayacına girmez. Gerekçe: miktar boşken çarpımın sonucunu yazmak tutarsızdır ve satır sipariş edilmiyor, tutarsız da sayılmamalı (plan turu Karar 37).
- **A-R10.** İki firmanın malzemesinden kesilen parça iki bölümde basılmaya devam eder ve her bölümde yalnız o firmanın malzeme satırını ve payını taşır.
- **A-R10/2.** Tedarikçisi girilmemiş malzemenin satırı da payla basılır ve satırın altında bölümün toplamına girmediği yazar. Gerekçe: bu satırlar Ana tedarikçisinin bölümüne düşen parçanın altında görünür ama kesitleri hiçbir belge bölümünün toplamında yoktur (belge yalnız tedarikçisi çözülen kesitleri bölümlere koyar); söylenmezse A-R6'nın notu her baskıda yanar ve anlamını yitirir. A-R6'nın farkı bu satırları saymaz.
- **A-R10/3.** Tedarikçisi girilmemiş malzeme satırının tutarı fiyatlı nüshada parça satırının tutarına girer, bölümün toplamına girmez. Gerekçe: satır o parçanın altındadır ve pay parçanın maliyet atfıdır; toplama girmediğini satırın ibaresi zaten söyler (plan turu Karar 36).
- **A-R11.** Alınacak malzeme toplamı tablosu bugünkü yerinde, her tedarikçi bölümünün sonunda kalır. Belgenin sonunda bütün tedarikçileri birleştiren bir toplam tablosu yoktur.

### B. Fiyatlı ve fiyatsız nüsha

- **B-R1.** Sipariş listesinin "Yazdır" düğmesi belgeyi doğrudan basmaz; fiyatlı mı fiyatsız mı basılacağını sorar ve vazgeçilebilir. Seçim kaydedilmez, her baskıda yeniden sorulur.
- **B-R1/2.** Pencere `src/components/rapor/` altında kendi dosyasındadır ve `DilSecPenceresi`'nin kardeşidir (`Modal`, `maxWidth={300}`, iki düğme); başlığı, iki düğmesinin metni ve `data-testid`'si o dosyanın sabitleridir. Pencere yazdırma API'sini çağırmaz, yalnız sorar (0140 E-R7).
- **B-R1/3.** Sorunun durumu sipariş penceresinde (`SiparisPenceresi`) tutulur ve yazdırma düğmesine geri çağırımla iner; soru açıkken sipariş penceresinin `onClose`'u hiçbir şey yapmaz (0126'nın iç içe pencere kuralı). Gerekçe: `Modal` Escape'i `window`'da dinler, emsal `CustomerDetailModal` bu korumayı yapmadığı için orada Escape iki pencereyi birden kapatıyor (Ölçüm L); burada kapatması pencerenin geçici düzenlemelerini de geri alınamaz biçimde silerdi.
- **B-R2.** Fiyatsız nüsha, A bölümünün getirdiği malzeme satırları dışında bugünkü belgenin aynısıdır: hiçbir fiyat, tutar ya da para birimi yazmaz.
- **B-R2/2.** Fiyat kipi belge kurucusunun seçeneğidir ve varsayılanı **fiyatsızdır**; seçenek verilmeyen çağrı bugünkü belgeyi üretir. Gerekçe: 0142'nin AC-4 ve AC-6 kriterleri belgenin tamamında "Tutar", "Birim fiyat" ve para deseni olmadığını iddia ediyor (Ölçüm R); varsayılan fiyatlı olsa iki kriter gerekçesiz kırılırdı.
- **B-R3.** Fiyatlı nüshada parça tablosunun ve toplam tablosunun sonuna iki sütun eklenir: birim fiyat ve tutar. Fiyatsız nüshada bu iki sütun hiç çizilmez.
- **B-R3/2.** Fiyatlı nüshada parça tablosu beş sütuna çıkar. Yerleşim ölçütü konmaz, kabul edilen sınırdır: yazdırma HTML'inde yerleşim testi yok ve gövde 720 piksel. İki yeni sütun sağa dayalıdır.
- **B-R3/3.** MODELLER tablosu fiyatlı nüshada da iki sütun kalır (para taşımaz).
- **B-R4.** Malzeme satırının birim fiyatı o malzemenin bugünkü kilo fiyatıdır (çaplı malzemede ham çapa düşen fiyat bandından), tutarı o satırın miktarı ile birim fiyatın çarpımıdır.
- **B-R4/2.** Fiyatlı nüshada boy cinsinden satırın miktar hücresi kilogramı da yazar; fiyatsız nüshada bugünkü gibi yalnız boy adedi yazar. Gerekçe: birim fiyat kilogram başınadır, "7 boy" ile çarpımı okunmaz; fiyatsız nüshaya dokunmamak C4 kıyasını korur.
- **B-R4/4.** Fiyatlı nüshada toplam tablosunun boy cinsinden satırı da kilogramı yazar (`7 boy · 62,580 kg`), ki çarpım okunabilsin; fiyatsız nüsha değişmez (plan turu Karar 39).
- **B-R4/3.** Bandın fiyatı girilmemişse birim fiyat malzemenin kilo fiyatıdır (motorun bugünkü yedeği).
- **B-R5.** Malzemeden kesilen parçanın satırındaki tutar, o bölümdeki malzeme satırlarının tutarlarının toplamıdır; birim fiyat sütunu o satırda boş kalır (parçanın birim fiyatı diye bir şey yoktur).
- **B-R5/2.** Malzeme kalemi olan ama hiçbir kalemi çözülemeyen parçada (malzemesi çöpte, bulunamıyor ya da ağırlığı hesaplanamıyor) birim fiyat ve tutar hücreleri boş kalır ve satırın altında kısa neden yazar; bölümün tutarsız satır sayacı bu satırı sayar. Gerekçe: bugünkü "malzemesi aşağıda" nedeni bu satırda yanlış olur, çünkü altında malzeme satırı yoktur.
- **B-R5/6.** "Hiçbir kalemi çözülemiyor" ölçütü: parçanın malzeme kalemi var ama o bölümdeki satırının hiçbir malzeme satırı pay taşımıyor (kesidi çözülemiyor). Bu durumda neden yazılır ve sayaç bir artar (plan turu Karar 40).
- **B-R5/3.** Birim fiyatın ve tutarın hangi kuralla yazılacağı parçanın **malzeme kalemi olup olmamasına** bakar, belge satırının yerleşim bayrağına bakmaz. Gerekçe: belge bölümlerini kuran yedek dal malzemeli parçayı da `malzemeli: false` ile yazıyor (Ölçüm O); bayrağa bakmak o parçaya B-R6'nın maliyet birim fiyatını basar ve B-R5 ile çelişir.
- **B-R5/4.** Parçanın malzeme satırları birden çok para biriminde ise parça satırı para birimi başına toplam yazar ve bunu bölüm toplamıyla aynı yardımcıdan alır. İki para birimi toplanmaz.
- **B-R5/5.** Malzeme satırlarından birinin tutarı hesaplanamıyorsa parça satırı çözülen satırların toplamını yazar; eksiklik bölümün tutarsız satır sayacından okunur.
- **B-R5/7.** Triyaj (2026-11-12): pay taşıyan malzeme satırının yanında payı olmayan bir kalem (ölçüsü girilmemiş ya da malzemesi çözülemeyen) da varsa parça satırı çözülen satırların toplamının altında kısa neden yazar ve bölümün tutarsız satır sayacı bir artar; yoksa ölçüsüz kalemin kesit satırı olmadığı için eksiklik hiçbir sayaca girmiyordu.
- **B-R6.** Hazır parçanın birim fiyatı parçanın bugünkü maliyetidir, tutarı maliyet ile sipariş adedinin çarpımıdır; ikisi de Türk lirasıdır.
- **B-R6/2.** Hazır parçanın birim fiyatı birimiyle yazılır (`₺/adet`); malzeme satırının birimi `/kg` olduğu için aynı sütunda ikisi karışmaz.
- **B-R7.** Rakamlar malzemenin kendi kayıtlı para biriminde yazılır. Bölümün sonunda tek toplam satırı bulunur: para birimi başına toplam ve ayrıca malzemelerin kayıtlı kurlarıyla çevrilmiş Türk lirası toplamı.
- **B-R7/2.** Bölümün toplamı, toplam tablosunun satır tutarları ile o bölümdeki hazır parçaların tutarlarının toplamıdır. Parça satırlarındaki tutarlar (paylar) toplama **girmez** ve bunun böyle olduğu toplam satırının yanında tek cümleyle kâğıtta yazar. Gerekçe: aynı para iki yerde görünüyor ve payların toplamı yuvarlama ile asgari sipariş yüzünden toplam tablosundan küçük kalıyor (A-R5); ilişkisi yazılmazsa okuyucunun ilk sorusu "hangisi doğru" olur. Ödenecek rakam malzeme toplamıdır, pay yalnız maliyeti parçaya atfeder.
- **B-R7/3.** Bölümde Türk lirası dışında para birimi yoksa Türk lirası karşılığı eki basılmaz. Gerekçe: aynı rakamı iki kez yazmak iki kalem gibi okunur.
- **B-R8.** Tutarı hesaplanamayan satır (fiyatı girilmemiş, dövizde kuru girilmemiş ya da para birimi tanınmayan malzeme) rakam yerine nedenini yazar; bölümün toplamı o satırı saymaz ve toplamın yanında kaç satırın tutarsız kaldığı belirtilir.
- **B-R8/2.** Sayaç bölümdeki tutarı yazılamayan her satırı sayar: kesit satırlarını ve hazır parça satırlarını birlikte. Gerekçe: toplamın eksik olmasının nedeni ikisi de olabilir.
- **B-R9.** Fiyatlı nüshanın başlık bilgisinde "Fiyatlı nüsha" ibaresi bulunur; fiyatsız nüshada böyle bir ibare yoktur.
- **B-R9/2.** Fiyatlı nüshanın dosya adı fiyatsızdan ayrılır (bugünkü ada "Fiyatli" eki). Gerekçe: iki nüsha aynı adla aynı klasöre kaydedilince biri diğerini ezer; ad, tedarikçiye gitmemesi gereken kopyayı da söyler.
- **B-R9/3.** İbare başlık bandının girdi satırının sonuna bir kez yazılır; bölüm başlıklarında (orada girdi metni zaten tekrarlanıyor) yazmaz.
- **B-R10.** Fiyatlı nüsha ayrı bir izin istemez: sipariş listesini açabilen kullanıcı iki nüshayı da basar.
- **B-R11.** Sipariş penceresinin ekranında fiyat, tutar ve para birimi görünmemeye devam eder; fiyat yalnız fiyatlı nüshada vardır.
- **B-R12.** Belge yalnız Türkçedir; para biçimi Türkçe binlik ve ondalık ayracıyla, para birimi simgesi rakamın sonunda yazılır.
- **B-R13.** Bugünkü basılabilirlik kuralı korunur: geçersiz değerli satır varsa ya da basılacak satır yoksa düğme pasiftir, soru penceresi açılmaz ve nedeni yanında yazar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Parça payının hesabı saf motorda yapılır (`siparisIhtiyaci.js`); belge kurucusu ve pencere çarpım, bölme ya da toplama yazmaz. 0134 C3/2 ve 0142 C4 ile aynı kural.
- **C2.** Motorun bugün duran para alanları (`fiyat`, `paraBirimi`, `kur`, `tutar`, `tutarK`, `tutarTLK`, `tutarNeden`, bölümün `tutarTLK`'si) yeniden hesaplanmaz, yeniden adlandırılmaz. 0142 bunları yalnız çizimden kaldırmıştı; bu spec aynı alanları geri okur.
- **C2/2.** Bu spec'in bütün yeni motor alanları yalnız `tedarikciBolumleri.belge` satırlarında doğar; `kesitler`, `kesitler[].parcalar` ve `malzemeGruplari` tek alan bile almaz. Gerekçe: altı kıyas altını (0135, 0138, 0139, 0141, 0142, 0143) kesit satırlarını karşılaştırıyor ve yalnız `olculer` ile `belge`'yi ayıklıyor (Ölçüm Q); kesit satırına alan eklemek altı altını birden geçersiz kılar, `belge` ise her kıyasta zaten düşüyor.
- **C3.** Sipariş kilosu ve boy adedi hesabı değişmez: 0143'ün boy adedi kuralı (uzunlukta tolerans, fireyi saymama), 0139'un kilogram fire bantları ve 0131 öncesinden gelen asgari sipariş kuralı aynen kalır. Bu spec yalnız var olan rakamı parçalara dağıtıp gösterir.
- **C4.** Fiyatsız nüshanın kıyası malzeme satırlarının **tamamını** ayıklar (parça tablosundaki `malzeme · ` ile başlayan satırların hepsi düşer); geri kalan her şey (parça satırları, toplam tablosu, notlar, başlık bandı, MODELLER tablosu, sayfa sonları) spec öncesi belgeyle birebir aynıdır. Gerekçe: A yalnız hücre eklemiyor, satır SAYISINI da değiştiriyor (bugün malzeme adı başına bir satır, bundan sonra kesit başına bir satır; aynı malzemeden iki kesidi olan parçada bugün bir, yarın iki satır). "Yeni hücreleri ayıkla" biçimindeki kıyas bu yüzden sağlanamaz; değişen şeyin kendisi malzeme satırıdır, kıyasın işi değişmeyeni sabitlemektir.
- **C4/2.** Fiyatsız nüshada A-R6'nın fark notu da doğabilir (C4'ün "notlar birebir" iddiasıyla çelişir); kıyasın ayıklaması malzeme satırlarıyla birlikte bu notun sabitini birebir metinle düşürür. Gerekçe: not A bölümünün ürünüdür, kıyasın işi değişmeyeni sabitlemektir (plan turu Karar 34).
- **C5.** Tutar ve birim fiyat metni tek yerde kurulur; belge kurucusu kendi para biçimi yazmaz. `utils.fmtCur` kullanılmaz (ondalık basmaz ve simgeyi rakamın önüne koyar). Üç yardımcı:
  1. Tutar `siparisIhtiyaci.pbTutarMetni(tutarK, paraBirimi)` ve Türk lirası karşılığı `tlMetni(tutarTLK)` ile yazılır. İkisi kuruş alanından okur, tam iki ondalık basar ve simgeyi sona koyar; 0142 ekrandan kaldırdığı için bugün ölü duruyorlar (Ölçüm I).
  2. Birim fiyat `malzeme.fiyatMetni(fiyat, pb)` ile yazılır. Bu biçim **iki ile dört ondalık** arasıdır (Ölçüm H); kullanıcının girdiği hassasiyet korunur, yoksa `2,8534 $/kg` "2,85" görünür ve çarpım tutmaz.
  3. `/kg` eki `malzeme.js`'e kendi yardımcısı olarak çıkar; bugün `kumeOzeti` içinde satır içi yazılı.
- **C5/2.** Belge kurucusunun fiyat seçeneğinin adı `fiyatli`'dir, `paraGoster` değil: 0140'ın testi `{ paraGoster: true }` ile belgenin parasız çıktığını iddia ediyor ve gerekçesiz kırılmamalı (plan turu Karar 35).
- **C6.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı ve göç yoktur. Belge anlıktır, hiçbir şey kaydedilmez.
- **C7.** Belge yalnız Türkçe kalır (0134 E-R6); çeviri anahtarı eklenmez.

### KAPSAM DIŞI

- **X1.** Sipariş penceresinin ekranında fiyat ve tutar sütunları — *neden:* Takım Yöneticisi kararı (2026-11-12); 0142 C-R1 yürürlükte kalır, iş yalnız belgeyi büyütür.
- **X2.** Belgenin sonunda bütün tedarikçileri birleştiren toplam tablosu — *neden:* Takım Yöneticisi kararı (2026-11-12); bölümler sayfa sonuyla ayrılıyor ve her firmaya kendi sayfası veriliyor, birleşik sayfa tedarikçiye verilmeyecek bir ek olurdu.
- **X3.** Fiyatlı nüsha için ayrı izin kimliği ya da gider yetkisi kapısı — *neden:* Takım Yöneticisi kararı (2026-11-12); satın almayı yapan kişiye Giderler sekmesi vermek gerekirdi.
- **X4.** Payı toplam satırının yuvarlanmış miktarına göre parçalara bölmek — *neden:* bölünemez. Ø30 çubuğu paylaşan iki parça ayrı ayrı yuvarlanınca 5 + 3 = 8 boy çıkıyor, birlikte 7 boy; kesimci iki rakamı toplayıp fazla sipariş verirdi.
- **X5.** İngilizce nüsha — *neden:* belge 0134'ten beri yalnız Türkçe.
- **X6.** Basılan fiyatın kaydedilmesi, fiyat geçmişine yazılması ya da teklif kaydı üretilmesi — *neden:* belge salt okunur bir çıktıdır (0140 R21).
- **X7.** Parça ihtiyacı tablosuna ve tedarikçi bölümlerinin ekran tablolarına pay sütunu eklemek — *neden:* X1 ile aynı; ekranın bugünkü sütunları yeterli.
- **X8.** Birim fiyatın hangi tarihteki fiyat olduğunu seçmek — *neden:* sipariş bugün verilir; motor bugünkü fiyat kümesini okur (0134 R22/2).

---

## Context

### Bugünkü belge

`src/lib/siparisRaporu.js` (72 satır) belgeyi kurar; sunum dilini `raporSunumu.js`'ten alır ve hücreleri kendisi kaçışlar. Yapı: başlık bandı bir kez, `MODELLER` tablosu, sonra tedarikçi başına bir bölüm (ilk bölüm hariç her birinin üstünde sayfa sonu). Bölümün içinde:

- `parcaTablo` → `BELGE_SUTUNLARI.parca` = `["Parça", "Ölçü", "Sipariş adedi"]`. Malzemeden kesilen parçanın altına `[kucuk("malzeme · ad"), "", ""]` satırı basılır: **miktar yok, kesit yok** (0142 B-R3, AC-8, AC-10).
- `toplamTablo` → `BELGE_SUTUNLARI.toplam` = `["Malzeme", "Kesit", "Alınacak"]`; `alinacak(k)` boy cinsinden satırda "n boy", değilse `kgMetni(k.siparisKg)` yazar (0143 C-R2).
- `KESIT_KAPALI_UYARISI` ve `ELLE_NOTU` notları.

`basilacakBolumler(sonuc)` motorun `tedarikciBolumleri.belge` dizisini süzer; `belgeDurumu(sonuc)` düğmenin etkinliğini ve nedenini verir (`BELGE_HATALI`, `BELGE_BOS`).

`src/components/rapor/SiparisRaporuDugmesi.jsx` (21 satır) `window.appPrint.printHtml` ile basar ve dosya adını `Siparis-Listesi-<bugün>.pdf` verir. Yorumunda bugünkü karar yazılı: "Spec 0142 A-R6 (AC-5): para seçeneği yok, belge her zaman parasız." Bu spec o satırı ters çevirir.

### Motorda hazır duran veri

`src/lib/siparisIhtiyaci.js`:

- `belgeBolumleriKur` (satır 460 civarı) belge satırını kurar: `{ partId, ad, siparis, duzenlendi, kitSira, malzemeli, olculer, malzemeAdlari }`. `olculer` `parcaOlculeri`'nden gelir ve her ölçü `{ malzemeId, malzemeAd, tedarikciId, anahtar, bicim, kesit, boy, adet, eksik, metin }` taşır. **`anahtar` kesit satırının anahtarıdır**, yani parça satırından kesit satırına bağ bugün zaten var ve yeni alan gerekmiyor.
- `kesitHesabi` (satır 570 civarı) kesit satırını kurar: `parcalar` dizisi her parçanın `{ partId, ad, adet, hamKg, fireliKg, fire, ekFireKg, kesimBoyu }` bilgisini taşır. Yani "bu kesidin kaçı hangi parça için" bilgisi de hazır. Satırda ayrıca `netKg`, `fireKg`, `siparisKg`, `tamKg`, `boyAdedi`, `asgariFark`, `fiyat`, `bant`, `tutar`, `tutarK`, `tutarTLK`, `tutarNeden`, `paraBirimi`, `kur`, `elle`, `parcalarKapali` var.
- Payın tabanı C3 gereği satırla aynı olmalı: boy yolunda `siparisKg = boyAdedi × tamKg` (fire girmez), kilo yolunda `siparisKg = netKg + fireKg`. Buna göre pay, boy yolunda `(adet × kesimBoyu) ÷ cubukBoyu` kesirli boyu ve `pay × tamKg` kilosu; kilo yolunda `adet × fireliKg`.
- Tolerans (`UZUNLUK_TOLERANSI_MM`, 0,005 mm) toplam uzunluğa bir kez uygulanıyor ve paya uygulanmaz; A-R2 sayesinde tek parçalı kesitte bu bir fark üretmez (toplamın rakamı yazılır).
- Hazır parçanın birim maliyeti bölüm kurucusunda zaten hesaplanıyor: `tedarikciBolumleriKur` içinde `birimK = parcaMaliyetKurus(p, undefined, setKat, malzemeKat)` ve `tutarK = birimK × k.siparis`, nedeni `MALIYET_YOK`. Belge satırında bu alanlar yok, eklenmesi gerekir.
- Para birimi alanları: `paraBirimi` (`PARA_BIRIMLERI` = TRY/USD/EUR), `kur` (TL'de 1, dövizde kartın kayıtlı kuru, 0132 Karar 40), nedenler `NEDEN_FIYAT_YOK`, `NEDEN_KUR_YOK`, `NEDEN_PARA_BIRIMI`. Tutarı çözülemeyen satırda `tutar`, `tutarK` ve `tutarTLK` üçü birden null olur.

### Para biçimi

`utils.fmtCur` bu belgeye uymaz (`maximumFractionDigits: 0` ve simge rakamın önünde: `$1.234`). `makinaStandartMaliyet.kurusMetni` yalnız TL basar. Belgenin ihtiyacı iki ondalıklı, simgesi sonda, para birimi parametreli bir metin ("44,53 $", "2,85 $/kg", "2.226,40 ₺") ve **`malzeme.fiyatMetni(fiyat, pb)` bunu zaten veriyor** (`ikiHane` biçimi, `PARA_SIMGE` simgesi sonda); birim fiyat onun sonuna birimi ekler, tutar doğrudan onu kullanır. Kilogram ve pay metni bugünkü `kgMetni` (üç ondalık) ile yazılır ki toplam satırıyla aynı biçimde görünsün. C5 gereği belge kurucusu kendi biçimini yazmaz.

### Ölçüm: kesit paylaşımı yaygın (müşterinin gerçek malzeme listesi, 2026-11-12)

Kesit anahtarı `malzeme|işaret|çubuk boyu|biçim|kesit`; **parçanın boyu anahtara girmez**, yani aynı malzemenin aynı çapındaki bütün parçalar tek kesit satırında toplanıyor. Müşterinin listesinde ölçüsü girilebilir 91 satır var:

- 47 kesit grubu; **26 grubu birden çok parça paylaşıyor ve bu gruplar 70 satırı (yüzde 77) kapsıyor**, 21 grup tek parçalı.
- En kalabalık gruplar: PASLANMAZ 304 Ø16 → 6 parça (6 ayrı boy), Ø35 → 5, Ø30 → 5, Ø20 → 4, Ø10 → 3; POM DELRİN Ø70 → 3, Ø60 → 3; DELRİN LEVHA Ø40 → 3.
- Yani bugün belgedeki "PASLANMAZ 304 · Ø16 · 12,4 kg" satırının altı ayrı parçadan geldiği kâğıtta hiç görünmüyor: A bölümünün değeri buradan geliyor ve A-R6'nın notu bu 26 grupta sık görünecek.
- Boydan sipariş edilecek on satırda (müşterinin "adet = kaç boy" yazdığı satırlar) `malzeme + çap + çubuk boyu` üçlüsü **hiç tekrar etmiyor**: hepsi tek parçalı. Yani A-R2 sayesinde kesirli boy adedi bugünkü veride hiç basılmaz; kullanıcı yalnız tam rakam görür. Kesirli pay, ileride aynı çubuk boyuyla ikinci bir parça işaretlendiğinde çıkar.
- Bu sayılar müşterinin yerel malzeme listesinden ölçüldü; dosya depoda yok ve ölçüm betiği (`scripts/olc/0139-kaynak-kiyas.mjs` emsali) CI'da koşmaz. Rakamlar sonraki turlarda yeniden doğrulanamaz (QA turu, Ölçüm U).

### Bilinen tuzaklar

- `raporSunumu.detayTablo` boş hücreyi `c ?? "—"` ile basar: `null` geçen hücreye tire koyar, boş dize boş kalır. Bugünkü malzeme satırı boş dize geçiyor; yeni boş hücreler de boş dize olmalı, yoksa fiyatsız nüshada tire belirir ve C4 kıyası kırılır.
- Sütun sayısı fiyat kipine göre değiştiği için `BELGE_SUTUNLARI` iki hâlli olur; 0142 AC-7, AC-45 ve AC-48 sütunların tek yerde yazılı olmasını istiyor, bu kural korunmalı.
- `Modal` Escape'i `window`'da dinler: soru penceresi sipariş penceresinin üstünde açıldığı için 0126'nın iç içe pencere kuralı uygulanır (soru açıkken sipariş penceresinin `onClose`'u hiçbir şey yapmaz).
- Pencere emsali `src/components/DilSecPenceresi.jsx` (TR/EN sorar, `maxWidth={300}`, iki düğme). Yeni soru penceresi onun kardeşidir; iki yerden açılmadığı için ayrı dosya zorunlu değil, ama `rapor/` klasöründe durması 0140 E-R7'nin "pencerenin dosyası yazdırma API'sini çağırmaz" kuralına uyar.
- 0142'nin kıyas altını `tests/fixtures/0142-once.json` ve dar ayıklaması `tests/fixtures/0142-ayikla.js` var; bu spec'in kıyası aynı deseni izler ve malzeme satırlarının tamamını ayıklar (C4).
- **Bir parça aynı kesitte iki kalemle görünebilir** ve bu fikstürde zaten var: `0142-veri.js`'in 13 numaralı parçası "Aynı kesit farklı boy" (Ø62 × 50 ve Ø62 × 75) aynı kesit anahtarına iki ölçü girişi ve kesit satırına iki `parcalar` girişi üretir (Ölçüm M). Kesit anahtarı parçanın boyunu taşımaz.
- **Ölçü girişinin boyu ile kesidin `kesimBoyu`'su aynı sayı değil:** `parcaOlculeri` boyu üç ondalığa yuvarlıyor, kesit girişi ham değeri saklıyor (Ölçüm N). Ölçüyü payına boyla eşleştirmek kayan noktada kırılır; A-R1/2 bu yüzden eşleştirmeyi motora veriyor.
- **Belge satırının `malzemeli` bayrağı "malzeme kalemi var" demek değil,** "malzemeyle yerleşti" demektir: hiçbir kaleminin tedarikçisi olmayan malzemeli parça Ana tedarikçisinin bölümüne `malzemeli: false` ile yazılıyor (Ölçüm O). B-R5/3 ölçütü kalemden okutur.
- `raporSunumu.sayi` sıfır ondalık basar (Ölçüm J): kesirli payı belgenin bugünkü sayı yardımcısıyla yazmak 4,5'i "5" yapar.
- `siparisIhtiyaci.js`'te kuruş tabanlı `tlMetni` ve `pbTutarMetni` zaten duruyor (iki ondalık, simge sonda, para birimi parametreli) ve 0142'den beri hiçbir yerden okunmuyor (Ölçüm I). Belgenin aradığı biçim bunlar; `malzeme.fiyatMetni` ise iki ile dört ondalık arasıdır (Ölçüm H).
- 0142'nin AC-4 ve AC-6 kriterleri belgenin **tamamında** "Tutar", "Birim fiyat" ve para deseni bulunmadığını iddia ediyor (Ölçüm R); fiyat kipinin varsayılanı fiyatsız olmazsa ikisi de kırılır (B-R2/2).
- Kıyas altınlarının hepsi kesit satırlarını karşılaştırıyor (Ölçüm Q): yeni alanın yeri C2/2 ile `belge`'ye sabitlendi.
- Kapatılan parçanın sipariş adedi sıfıra çekildiği için kesit satırına hiç girmiyor (Ölçüm P): A-R9 bugünkü motorla kendiliğinden sağlanıyor, yeni kural gerekmiyor.
- Kesit satırının `kesitMetni` alanı işaretli satırda çubuk boyunu zaten taşıyor; parçası çubuktan uzun olduğu için kilogramla sipariş edilen işaretli satırda da taşır (Ölçüm W). AC-15 bu alanı okur, yeniden kurmaz.
- Kesit satırları düzenlenmiş sipariş adetleriyle kuruluyor (Ölçüm X): pay düzenlemeyi izler, A-R5'in yuvarlama ve asgari sipariş farkı yalnız toplam satırında kalır.

### QA turunda ölçülenler (2026-11-12)

Hepsi HEAD'de (v3.58.0 + 0142 + 0143) doğrulandı.

| # | Ölçüm |
|---|---|
| **A** | `siparisRaporu.js` 72 satır, `SiparisRaporuDugmesi.jsx` 21 satır; düğmenin yorumundaki "para seçeneği yok, belge her zaman parasız" cümlesi yerinde. |
| **B** | `belgeBolumleriKur` satır 457, `kesitHesabi` satır 571 (spec'in "460 ve 570 civarı" tahmini doğru). |
| **C** | Belge satırının alanları: `partId`, `ad`, `siparis`, `duzenlendi`, `kitSira`, `malzemeli`, `olculer`, `malzemeAdlari`. Tutar alanı yok. |
| **D** | `olculer` girişinin alanları ve `anahtar`'ın kesit satırının anahtarı olması doğrulandı; parça satırından kesit satırına bağ bugün var. |
| **E** | Kesit satırının `parcalar` girişleri: `partId`, `ad`, `adet`, `hamKg`, `fireliKg`, `fire`, `ekFireKg`, `kesimBoyu`. |
| **F** | Kesit satırının para alanları (`fiyat`, `bant`, `tutar`, `tutarK`, `tutarTLK`, `tutarNeden`, `paraBirimi`, `kur`) yerinde; tutarı çözülemeyen satırda `tutar`, `tutarK` ve `tutarTLK` üçü birden null. |
| **G** | Pay tabanı satırla aynı: kilo yolunda `netKg + fireKg` toplamı `Σ adet × fireliKg`'ye eşit, boy yolunda `siparisKg = boyAdedi × tamKg` ve fire girmiyor. |
| **H** | `malzeme.fiyatMetni` en az iki, en çok **dört** ondalık basar (C5 "iki ondalık" diyordu). |
| **I** | `siparisIhtiyaci.js` 653-656: `tlMetni(k)` ve `pbTutarMetni(k, pb)` kuruş tabanlı, tam iki ondalık, simge sonda; 0142'den beri hiçbir yerden okunmuyor. |
| **J** | `raporSunumu.sayi` sıfır ondalık basar; belgenin `n()` yardımcısı onu kullanıyor. |
| **K** | `detayTablo` boş hücreyi `c ?? "—"` ile basar: `null` tire olur, boş dize boş kalır. |
| **L** | `Modal` Escape'i `window`'da dinler; emsal `CustomerDetailModal` `DilSecPenceresi` açıkken koruma yapmıyor, Escape iki pencereyi birden kapatıyor. |
| **M** | `0142-veri.js`'in 13 numaralı parçası aynı kesit anahtarına iki ölçü ve iki `parcalar` girişi üretiyor. |
| **N** | `parcaOlculeri` boyu üç ondalığa yuvarlıyor, kesit girişinin `kesimBoyu`'su ham. |
| **O** | `belgeBolumleriKur`'un yedek dalı malzemeli parçayı da `malzemeli: false` ile yazıyor. |
| **P** | Kapatılan parçanın sipariş adedi sıfır olduğu için kesit satırına girmiyor. |
| **Q** | Altı kıyas altını kesit satırlarını karşılaştırıyor; `ayikla0142` yalnız `olculer`, `belge` ve `belgeYeri`'ni düşürüyor, 0140'ın kıyası `tedarikciBolumleri`'ni bütünüyle siliyor. |
| **R** | `siparis-raporu-0142` AC-4 ve AC-6 belgenin tamamında "Tutar", "Birim fiyat" ve para deseni olmadığını iddia ediyor. |
| **S** | `malzemeler` iki giriş noktasına da (Ayarlar › Katalog ve Stok › Parça Stoğu) kapısız iniyor; AC-36 bugünkü prop zinciriyle sağlanabilir. |
| **T** | Kanıt aracı belgeyi ekran olarak çiziyor (`siparis-0142-belge`, `siparis-0143-belge`): belgenin görsel kanıtı yerleşik bir desen. |
| **U** | Kesit paylaşımı ölçümü (47 grup, 26 paylaşım) yerel bir dosyadan geldi; depoda kanıtı yok. |
| **V** | Bandın fiyatı boşsa birim fiyat malzemenin kilo fiyatına düşüyor. |
| **W** | `kesitMetni` alanı işaretli satırda çubuk boyunu, parçası çubuktan uzun olan işaretli satırda da taşıyor. |
| **X** | Kesit satırları düzenlenmiş sipariş adetleriyle kuruluyor (`parcaDuzenle` kesit kurulumundan önce koşuyor). |

### QA turunda verilen kararlar (2026-11-12)

Bir geliştirici başlamadan önce cevapsız kalan sorular çıkarıldı; 33 boşluğun hepsi Takım Yöneticisi tarafından onaylandı.

1. **Bloklayıcı.** Parça satırı ile kesit payının eşleşmesi motorda yapılır; pay parça ve kesit başına hazır gelir, belge anahtar eşleştirmesi yazmaz (A-R1/2; Ölçüm M, N).
2. **Bloklayıcı.** "Yalnız bir parça" ölçütü farklı parça sayısıdır; aynı parçanın aynı kesitteki kalemleri tek satırda toplanır (A-R2/2).
3. **Bloklayıcı.** Fiyatsız nüshanın kıyası malzeme satırlarının tamamını ayıklar; satır sayısı değiştiği için "yeni hücreleri ayıkla" biçimi sağlanamaz (C4, AC-42).
4. **Bloklayıcı.** Bütün yeni motor alanları yalnız `belge` satırlarında doğar; kesit satırları ve `parcalar` dokunulmaz (C2/2; Ölçüm Q).
5. **Bloklayıcı.** Bölüm toplamı toplam tablosu ile hazır parçaların tutarlarıdır; parça payları toplama girmez ve bu kâğıtta yazar (B-R7/2).
6. **Önemli.** Kesit `Ölçü` sütununa, miktar `Sipariş adedi` sütununa yazılır; başlıklar değişmez (A-R1/3).
7. **Önemli.** `malzeme · ` ön eki kalır (A-R1/4); Intent'in örneği kodun bastığı biçime çevrildi.
8. **Önemli.** Kesirli boy en çok üç ondalıkla, kilogram `kgMetni` ile yazılır (A-R3/2; Ölçüm J).
9. **Önemli.** A-R6'nın notu tek sabittir, yeri toplam tablosunun altıdır, eşiği 0,001 kilogramdır (A-R6/2).
10. **Önemli.** Kesidi kapatılmış, parçası açık satır basılır; miktar boş, nedeni satırda (A-R9/2).
11. **Önemli.** Tedarikçisi girilmemiş malzemenin satırı payla basılır, toplama girmediği yazar ve fark notuna girmez (A-R10/2).
12. **Önemli.** Ölçüsü girilmemiş kalemin adı satırı durur, hücreleri boş dize kalır (A-R8/2; Ölçüm K).
13. **Önemli.** Malzemesi çözülemeyen malzemeli parçanın birim fiyat ve tutar hücreleri boş, nedeni satırda (B-R5/2).
14. **Önemli.** Birim fiyat ve tutar kuralı parçanın malzeme kalemine bakar, belge satırının yerleşim bayrağına bakmaz (B-R5/3; Ölçüm O).
15. **Önemli.** Çok para birimli parça satırı para birimi başına toplam yazar (B-R5/4).
16. **Önemli.** Bir satırın tutarı yoksa parça satırı çözülen satırların toplamını yazar (B-R5/5).
17. **Önemli.** Fiyatlı nüshada boy cinsinden satırın miktarı kilogramı da yazar (B-R4/2).
18. **Önemli.** Soru penceresi `rapor/` altında kendi dosyasıdır; metinleri orada, `DilSecPenceresi` emsali (B-R1/2).
19. **Önemli.** Sorunun durumu sipariş penceresindedir ve soru açıkken Escape sipariş penceresini kapatmaz (B-R1/3; Ölçüm L).
20. **Önemli.** Tutar `pbTutarMetni` ve `tlMetni` ile, birim fiyat `fiyatMetni` ile ve `/kg` eki tek yardımcıdan (C5; Ölçüm H, I).
21. **Önemli.** Fiyat kipinin varsayılanı fiyatsızdır (B-R2/2; Ölçüm R).
22. **Önemli.** Fiyatlı nüshanın dosya adı fiyatsızdan ayrılır (B-R9/2).
23. **Küçük.** "Fiyatlı nüsha" ibaresi başlık bandının girdi satırında bir kez yazar (B-R9/3).
24. **Küçük.** Malzeme satırlarının sırası kalemlerin sırasıdır (A-R1/5).
25. **Küçük.** Payı olmayan satırlar bugünkü malzeme adı dizisinden gelir; alan yerinde kalır (A-R8/3).
26. **Küçük.** Bandın fiyatı boşsa birim fiyat malzemenin kilo fiyatıdır (B-R4/3; Ölçüm V).
27. **Küçük.** Hazır parçanın birim fiyatı `₺/adet` birimiyle yazar (B-R6/2).
28. **Küçük.** Fiyatlı nüshanın beş sütunu için yerleşim ölçütü konmaz, kabul edilen sınırdır (B-R3/2).
29. **Küçük.** MODELLER tablosu fiyatlı nüshada da iki sütun kalır (B-R3/3).
30. **Küçük.** Tutarsız satır sayacı kesit ve hazır parça satırlarını birlikte sayar (B-R8/2).
31. **Küçük.** Bölümde döviz yoksa Türk lirası karşılığı eki basılmaz (B-R7/3).
32. **Küçük.** Intent'in kesit örneği `cubukEki`'nin bugünkü metnine çevrildi (Intent; karar 7 ile aynı satır).
33. **Küçük.** Kesit paylaşımı ölçümünün kaynağının yerel olduğu ve depoda kanıtı bulunmadığı Context'e yazıldı (Ölçüm U).

### QA turu karar kaydı (2026-11-12)

| # | Derece | Cevapsız kalan soru | Karar | İşlendiği madde |
|---|---|---|---|---|
| 1 | Bloklayıcı | Parça satırı hangi kesit payını okuyacak? | Pay motorda, parça ve kesit başına | A-R1/2 |
| 2 | Bloklayıcı | "Yalnız bir parça" nasıl ölçülür? | Farklı parça sayısı; kalemler tek satırda | A-R2/2 |
| 3 | Bloklayıcı | Kıyas satır sayısı değişince nasıl tutar? | Malzeme satırlarının tamamı ayıklanır | C4, AC-42 |
| 4 | Bloklayıcı | Yeni motor alanları nereye yazılır? | Yalnız `belge` satırlarına | C2/2 |
| 5 | Bloklayıcı | Bölüm toplamı neyi sayar? | Toplam tablosu ve hazır parçalar; paylar hariç | B-R7/2 |
| 6 | Önemli | Kesit ve miktar hangi hücrede? | Ölçü ve Sipariş adedi; başlıklar değişmez | A-R1/3 |
| 7 | Önemli | `malzeme · ` ön eki kalıyor mu? | Kalıyor | A-R1/4 |
| 8 | Önemli | Kesirli boy ve kilogram hangi biçimde? | Üç ondalık; `sayi` kullanılmaz | A-R3/2 |
| 9 | Önemli | Fark notunun metni, yeri ve eşiği? | Tek sabit, toplamın altı, 0,001 kg | A-R6/2 |
| 10 | Önemli | Kesidi kapalı, parçası açık satır? | Basılır, miktar boş, nedeni satırda | A-R9/2 |
| 11 | Önemli | Tedarikçisiz malzemenin payı? | Basılır, toplama girmediği yazar | A-R10/2 |
| 12 | Önemli | Ölçüsü girilmemiş kalemin satırı? | Durur, hücreleri boş dize | A-R8/2 |
| 13 | Önemli | Malzemesi çözülemeyen parçanın tutarı? | Boş hücre, kısa neden | B-R5/2 |
| 14 | Önemli | Birim fiyat kuralı hangi bayrağa bakar? | Parçanın malzeme kalemine | B-R5/3 |
| 15 | Önemli | İki para birimli parça satırı? | Para birimi başına toplam | B-R5/4 |
| 16 | Önemli | Bir satırın tutarı yoksa parça satırı? | Çözülen satırların toplamı | B-R5/5 |
| 17 | Önemli | Boy satırı fiyatlı nüshada doğrulanabilir mi? | Miktar kilogramı da yazar | B-R4/2 |
| 18 | Önemli | Soru penceresinin dosyası ve metinleri? | `rapor/` altında, kendi sabitleri | B-R1/2 |
| 19 | Önemli | Escape iki pencereyi mi kapatır? | Durum sipariş penceresinde, `onClose` korunur | B-R1/3 |
| 20 | Önemli | Tutar ve birim fiyat hangi yardımcıdan? | `pbTutarMetni`, `tlMetni`, `fiyatMetni` | C5 |
| 21 | Önemli | Fiyat kipinin varsayılanı? | Fiyatsız | B-R2/2 |
| 22 | Önemli | İki nüsha aynı dosya adıyla mı iner? | Fiyatlıda ayrı ad | B-R9/2 |
| 23 | Küçük | "Fiyatlı nüsha" ibaresi nerede? | Başlık bandının girdi satırında | B-R9/3 |
| 24 | Küçük | Malzeme satırlarının sırası? | Kalem sırası | A-R1/5 |
| 25 | Küçük | Malzeme adı dizisinin kaderi? | Payı olmayan satırlar için kalır | A-R8/3 |
| 26 | Küçük | Bandın fiyatı boşsa? | Malzemenin kilo fiyatı | B-R4/3 |
| 27 | Küçük | Hazır parçanın birim fiyatının birimi? | `₺/adet` | B-R6/2 |
| 28 | Küçük | Beş sütunun yerleşim ölçütü? | Konmaz, kabul edilen sınır | B-R3/2 |
| 29 | Küçük | MODELLER tablosu fiyatlı nüshada? | İki sütun kalır | B-R3/3 |
| 30 | Küçük | Tutarsız sayacı neyi sayar? | Kesit ve hazır parça satırları | B-R8/2 |
| 31 | Küçük | Hepsi TL olan bölümde TL karşılığı? | Basılmaz | B-R7/3 |
| 32 | Küçük | Intent'in kesit örneği kodla uyuşuyor mu? | Kodun metnine çevrildi | Intent |
| 33 | Küçük | Kesit paylaşımı ölçümü doğrulanabilir mi? | Kaynağının yerel olduğu yazıldı | Context, Ölçüm U |

### Plan turunda verilen kararlar (2026-11-12)

Uygulama planının on bir önerisi Takım Yöneticisi tarafından onaylandı.

| # | Konu | Karar | İşlendiği madde |
|---|---|---|---|
| 34 | C4 ile A-R6 çelişiyor | Kıyas fark notunun sabitini de ayıklar | C4/2 |
| 35 | Seçenek adı | `fiyatli` (`paraGoster` değil) | C5/2 |
| 36 | Tedarikçisiz satırın tutarı | Parça satırına girer, bölüm toplamına girmez | A-R10/3 |
| 37 | Kapalı kesitin fiyatlı satırı | Birim ve tutar boş, sayaca girmez | A-R9/3 |
| 38 | Elle küçültülen toplam | Not yalnız toplam büyükken | A-R6/3 |
| 39 | Toplam tablosunun boy satırı | Fiyatlıda kilogram eki | B-R4/4 |
| 40 | B-R5/2'nin ölçütü | Malzeme kalemi var, pay taşıyan satır yok | B-R5/6 |
| 41 | Pencerede para | Yeni alanlar yalnız `belge` dizisinde, ekran değişmez | C2/2, AC-37 |
| 42 | İç içe Modal | Pencereyi düğme bileşeni çizer, sonra çizildiği için üstte | B-R1/3 |
| 43 | Kanıt | Değişen iki eski belge ekranı `degisti` ile işaretlenir, kapanışta `ayni` | DoD |
| 44 | Beş sütun | Yerleşim ölçütü konmaz (Karar 28 ile aynı) | B-R3/2 |

---

## Acceptance Criteria

### A. Parçanın altındaki malzeme

- **AC-1.** Kesidi yalnız bir parça kullanıyorsa o parçanın altındaki malzeme satırı bölümün toplam satırındaki miktarı aynen yazar (kilogram yolunda aynı kilogram, boy yolunda aynı boy adedi).
- **AC-2.** Kesidi iki parça paylaşıyorsa her parçanın altındaki satır kendi kilogramını yazar ve iki rakamın toplamı, asgari sipariş devreye girmemişse, toplam satırının kilogramına eşittir.
- **AC-3.** Boydan sipariş edilen bir kesidi iki parça paylaşıyorsa her parçanın altındaki satır kesirli boy adedini ve karşılığı kilogramı yazar (örnek: `4,5 boy · 10,040 kg`; boy en çok üç ondalık, kilogram `kgMetni`).
- **AC-4.** Boy yolunda payın kilogramı kesirli boy ile tam çubuk ağırlığının çarpımıdır; fire eklenmez.
- **AC-5.** Kilogram yolunda payın kilogramı fire dâhildir (yüzde fire ve çap bandına göre kilogram fire).
- **AC-6.** Paylaşılan bir kesitte asgari sipariş toplam satırını büyüttüğünde paylar büyümez; payların toplamı toplamdan küçük kalır.
- **AC-7.** Paylaşılan bir kesitte miktar elle girildiğinde toplam satırı elle değeri, parça payları hesaplanan değerleri yazar; kesidi tek parça kullanıyorsa parçanın altı da elle değeri yazar.
- **AC-8.** Payların toplamı bölümün toplamından küçükse bölümün sonunda farkı açıklayan not basılır.
- **AC-9.** Payların toplamı toplama eşitse o not basılmaz.
- **AC-10.** Bütün parçaları kapatılmış kesit satırı yalnız toplam tablosunda görünür, hiçbir parçanın altında yazılmaz.
- **AC-11.** Hazır parçanın (malzeme kalemi olmayan) altında malzeme satırı basılmaz.
- **AC-12.** Ölçüsü girilmemiş malzeme kalemi pay satırı üretmez ve parçanın adının altındaki "ölçüsü girilmemiş" ibaresi yerinde kalır.
- **AC-13.** İki firmanın malzemesinden kesilen parça iki bölümde basılır ve her bölümde yalnız o firmanın malzeme satırı ve payı görünür.
- **AC-14.** Aynı malzemede aynı ölçünün iki kalemi tek malzeme satırında basılır ve payı iki kalemin adetlerinin toplamıyla hesaplanır.
- **AC-15.** Malzeme satırının kesit hücresi, boydan sipariş edilen satırda çubuk boyunu da yazar; kilogramla sipariş edilende yazmaz.
- **AC-16.** Alınacak malzeme toplamı tablosu bölümün sonunda basılır ve belgenin sonunda birleşik bir toplam tablosu basılmaz.

### B. Fiyatlı ve fiyatsız nüsha

- **AC-17.** "Yazdır"a tıklanınca belge basılmaz, fiyatlı ve fiyatsız seçenekli pencere açılır.
- **AC-18.** Pencere kapatılırsa (vazgeçilirse) hiçbir belge basılmaz.
- **AC-19.** Aynı düğmeye ikinci kez tıklandığında soru yeniden sorulur (önceki seçim hatırlanmaz).
- **AC-20.** Fiyatsız seçilince basılan belgede hiçbir fiyat, tutar, para birimi simgesi ve "Fiyatlı nüsha" ibaresi yoktur.
- **AC-21.** Fiyatlı seçilince parça tablosunda ve toplam tablosunda birim fiyat ve tutar sütunları bulunur; fiyatsız nüshada bu iki sütun hiç çizilmez.
- **AC-22.** Fiyatlı nüshada malzeme satırının birim fiyatı malzemenin kilo fiyatını kendi para biriminde yazar (örnek: "2,85 $/kg").
- **AC-23.** Çaplı malzemede birim fiyat ham çapa düşen fiyat bandından gelir.
- **AC-24.** Malzeme satırının tutarı o satırın miktarı ile birim fiyatın çarpımıdır.
- **AC-25.** Toplam tablosunun satır tutarı motorun hesapladığı tutardır (sipariş kilogramı ile birim fiyatın çarpımı).
- **AC-26.** Malzemeden kesilen parçanın satırındaki tutar, o bölümdeki malzeme satırlarının tutarlarının toplamıdır ve birim fiyat hücresi boş kalır.
- **AC-27.** Hazır parçanın birim fiyatı bugünkü parça maliyeti, tutarı maliyet ile sipariş adedinin çarpımıdır ve ikisi de Türk lirası yazılır.
- **AC-28.** Maliyeti girilmemiş hazır parçanın tutar hücresinde rakam değil nedeni yazar.
- **AC-29.** Bölümün sonunda toplam satırı para birimi başına toplamı yazar (örnek: "44,53 $ + 112,24 €").
- **AC-30.** Aynı toplam satırı malzemelerin kayıtlı kurlarıyla çevrilmiş Türk lirası toplamını da yazar.
- **AC-31.** Fiyatı girilmemiş malzemenin satırında tutar yerine nedeni yazar ve bölüm toplamı o satırı saymaz.
- **AC-32.** Kuru girilmemiş döviz malzemenin satırında tutar yerine nedeni yazar.
- **AC-33.** Para birimi tanınmayan malzemenin satırında tutar yerine nedeni yazar.
- **AC-34.** Bölümde tutarı hesaplanamayan satır varsa toplamın yanında kaç satırın tutarsız kaldığı yazar; yoksa bu ek yazılmaz.
- **AC-35.** Fiyatlı nüshanın başlık bilgisinde "Fiyatlı nüsha" ibaresi bulunur.
- **AC-36.** Fiyatlı nüsha gider yetkisi olmayan ve Ayarlar sekmesi görünmeyen bir kullanıcıda da basılabilir (yalnız sipariş listesi izni yeter).
- **AC-37.** Sipariş penceresinin ekranında fiyat, tutar ve para birimi simgesi çizilmez (0142 C-R1 korunur).
- **AC-38.** Geçersiz değerli satır varken "Yazdır" pasiftir, soru penceresi açılmaz ve nedeni yanında yazar.
- **AC-39.** Basılacak satır yokken "Yazdır" pasiftir ve nedeni yanında yazar.
- **AC-40.** Belgenin tamamı Türkçedir; para biçimi Türkçe ayraçlı ve simge rakamın sonundadır.
- **AC-41.** Soru penceresi açıkken Escape sipariş penceresini kapatmaz, yalnız soruyu kapatır.

### Kıyas ve düzen

- **AC-42.** Parça tablosundaki malzeme satırlarının tamamı ayıklandığında fiyatsız nüsha, spec öncesi koddan üretilmiş altın belgeyle birebir aynıdır (parça satırları, toplam tablosu, notlar, başlık bandı, MODELLER tablosu ve sayfa sonları dâhil).
- **AC-43.** Belgenin sütun başlıkları tek yerde tanımlıdır ve fiyatlı/fiyatsız iki hâli de oradan gelir.
- **AC-44.** Parça payı motorda hesaplanır; belge kurucusu ve pencere dosyasında pay, tutar ya da toplam aritmetiği yoktur (kaynak taraması).
- **AC-45.** Tutar ve birim fiyat metni tek yerde kurulur ve belge kurucusu kendi para biçimini yazmaz (kaynak taraması).

### QA turu kriterleri (2026-11-12)

#### Pay ve malzeme satırı

- **AC-46.** Parça payı motorda hesaplanır ve belge satırına hazır gelir; belge kurucusunda ve pencere dosyasında kesit anahtarıyla eşleştirme, bölme ya da çarpma yoktur (kaynak taraması).
- **AC-47.** Aynı parçanın aynı kesitteki iki kalemi tek malzeme satırında basılır ve satırın miktarı iki kalemin adetlerinin toplamıyla hesaplanır.
- **AC-48.** Kesidi iki kalemle tek bir parça kullanıyorsa satır toplam satırının rakamını bir kez yazar (iki satıra bölünmez).
- **AC-49.** Malzeme satırının kesidi `Ölçü` hücresinde, miktarı `Sipariş adedi` hücresindedir; parça tablosunun başlıkları birebir `["Parça", "Ölçü", "Sipariş adedi"]` kalır.
- **AC-50.** Malzeme satırı `malzeme · ` ön ekiyle başlar.
- **AC-51.** Kesirli boy adedi en çok üç ondalıkla, kilogram üç ondalıkla yazılır; belgenin sıfır ondalıklı sayı yardımcısı pay satırında kullanılmaz.
- **AC-52.** Payların toplamı ile bölümün toplamı arasındaki fark 0,001 kilogramın altındaysa A-R6'nın notu basılmaz, üstündeyse basılır.
- **AC-53.** Kesidi "sipariş etme" işaretli ama parçası açık satır basılır, miktar hücresi boş kalır ve satırın altında sipariş edilmediği yazar; bölümün sonundaki bugünkü kapalı kesit uyarısı yerinde kalır.
- **AC-54.** Tedarikçisi girilmemiş malzemenin satırı payla basılır, bölümün toplamına girmediği satırda yazar ve A-R6'nın farkına girmez.
- **AC-55.** Ölçüsü girilmemiş kalemin malzeme adı satırı basılır; kesit ve miktar hücreleri boştur, tire basılmaz.
- **AC-56.** Payı olmayan malzeme satırları (ölçüsü girilmemiş, malzemesi çöpte ya da bulunamayan kalem) bugünkü malzeme adı dizisinden gelir.
- **AC-57.** Bir parçanın malzeme satırları kalemlerinin sırasıyla basılır.

#### Fiyatlı nüsha

- **AC-58.** Bölümün toplamı toplam tablosunun satır tutarları ile hazır parçaların tutarlarının toplamıdır; parça satırlarının tutarları toplama girmez ve bunu söyleyen cümle belgede yazar.
- **AC-59.** Malzeme kalemi olan ama hiçbir kalemi çözülemeyen parçanın birim fiyat ve tutar hücreleri boştur, nedeni satırda yazar ve bölümün tutarsız satır sayacı onu sayar.
- **AC-60.** Hiçbir kaleminin tedarikçisi olmadığı için Ana tedarikçisinin bölümüne düşen malzemeli parçaya maliyet birim fiyatı basılmaz (ölçüt parçanın malzeme kalemidir, belge satırının yerleşim bayrağı değil).
- **AC-61.** Malzeme satırları iki para biriminde olan parçanın satırı para birimi başına toplam yazar.
- **AC-62.** Malzeme satırlarından birinin tutarı hesaplanamıyorsa parça satırı çözülen satırların toplamını yazar.
- **AC-63.** Fiyatlı nüshada boy cinsinden satırın miktar hücresi kilogramı da yazar; fiyatsız nüshada yalnız boy adedi yazar.
- **AC-64.** Tutar kuruş alanından tam iki ondalıkla, birim fiyat malzemenin fiyat biçimiyle ve `/kg` ekiyle basılır; belge kurucusu kendi para biçimini yazmaz (kaynak taraması).
- **AC-65.** Fiyat kipi verilmeyen belge çağrısı fiyatsız nüsha üretir.
- **AC-66.** Fiyatlı nüshanın dosya adı fiyatsız nüshanınkinden ayrıdır.
- **AC-67.** "Fiyatlı nüsha" ibaresi başlık bandının girdi satırında bir kez bulunur; bölüm başlıklarında bulunmaz.
- **AC-68.** Bandı olan ama bandın fiyatı girilmemiş çaplı malzemede birim fiyat malzemenin kilo fiyatıdır.
- **AC-69.** Hazır parçanın birim fiyatı `₺/adet` birimiyle yazılır.
- **AC-70.** MODELLER tablosu fiyatlı nüshada da iki sütundur.
- **AC-71.** Bölümün tutarsız satır sayacı kesit satırlarını ve hazır parça satırlarını birlikte sayar.
- **AC-72.** Bölümde Türk lirası dışında para birimi yoksa Türk lirası karşılığı eki basılmaz.
- **AC-73.** Soru penceresi `rapor/` altındaki kendi dosyasındadır, metinleri o dosyanın sabitleridir ve durumu sipariş penceresinde tutulur (kaynak taraması; davranışı AC-41 ölçer).

#### Kıyas

- **AC-74.** Motorun kesit satırları ve `parcalar` girişleri bu spec'le tek alan bile almaz; 0135, 0138, 0139, 0141, 0142 ve 0143 kıyasları yeni ayıklama olmadan yeşil kalır.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Parça payı ve tutar toplamaları saf motorda (`siparisIhtiyaci.js`) yazıldı ve kendi testi var; belge kurucusu yalnız gösteriyor.
- [ ] Motorun yeni alanları yalnız `tedarikciBolumleri.belge` satırlarında; kesit satırları ve `parcalar` dokunulmadı ve altı kıyas yeni ayıklama olmadan yeşil (C2/2, AC-74).
- [ ] Parça satırı ile kesit payının eşleşmesi motorda; belge kurucusu anahtar eşleştirmesi yazmıyor (A-R1/2, AC-46).
- [ ] Bölüm toplamının kapsamı kâğıtta yazılı: paylar toplama girmiyor (B-R7/2, AC-58).
- [ ] Soru penceresinin durumu sipariş penceresinde ve soru açıkken Escape sipariş penceresini kapatmıyor (B-R1/3, AC-41, AC-73).
- [ ] Aynı sayıyı üreten iki yüzey (parça payı ve kesit toplamı) aynı tabandan hesaplanıyor (C3 çapraz testi).
- [ ] Yeni kalıcı alan yok; bu durum spec'te açıkça yazıldı (C6).
- [ ] Yeni veri bölümü yok (C6).
- [ ] Yeni eylem izni **eklenmedi** ve bu açıkça yazıldı (B-R10, X3).
- [ ] Soft-delete simetrisi etkilenmiyor (belge salt okunur).
- [ ] Kullanıcıya görünen tüm metinler Türkçe; belge yalnız Türkçe olduğu için çeviri anahtarı eklenmedi (C7).
- [ ] Para gösterimi çoklu para kuralına uyuyor; fiyatı, kuru ya da para birimi tanınmayan malzeme tanımlı biçimde ele alınıyor (AC-31, AC-32, AC-33).
- [ ] Tutar ve birim fiyat metni tek yerden geliyor; `/kg` eki de tek yardımcıdan (C5, AC-64).
- [ ] Soru penceresinin görsel kanıtı eklendi; fiyatlı ve fiyatsız belgenin kanıtı eklendi (hata ve boş durum dâhil).
- [ ] Fiyatsız nüshanın kıyas altını spec öncesi kodla üretildi ve malzeme satırlarının tamamı ayıklanarak AC-42 ile karşılaştırıldı.
- [ ] QA turunun 33 kararı spec'e işlendi; kriter karşılığı olmayan kararlar (28, 32, 33) gerekçesiyle yazılı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Yeni kavram veya mimari karar varsa `CLAUDE.md` güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | Revizyon 2 plan turunda: on bir öneri (C4 ile A-R6 çelişkisi, `fiyatli` adı, tedarikçisiz ve kapalı satırın tutarı, elle küçültülen toplam dahil) |
| **Düzeltme turu sayısı** | 1 | Triyaj (2026-11-12), dört bulgu |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Soru açıkken belge basılamaz olunca pencere kapanamıyordu; ölçüsüz kalem parça tutarını sessizce eksik bırakıyordu; karışık parçanın tedarikçisiz kalemi (0142'den beri, açık bulgu); AC-44 taraması boşluksuz aritmetiği kaçırıyordu. Ara mesajdaki birim fiyat bulgusu analist tarafından geri çekildi |
| **Regresyon sayısı** | 0 | Fiyatsız nüsha malzeme satırları ayıklanınca spec öncesi belgeyle birebir; altı kıyas ayıklamasız yeşil; 17 pencere ve katalog ekranı 0 piksel |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:** iki ayrı yerde yazılmış aynı koşul (soruyu çizen `soruAcik && d.etkin`, koruyan yalnız `nushaSoru`)
yalnız verinin dışarıdan değiştiği yolda ayrışır ve o yol testlerde yoktur; çizim ile korumayı aynı yüklemden türetmek gerekir. Ayrıca
mutasyon denemesi, kıyas ve senaryo verisinin "iki boylu tek parça" hâlini taşımadığını gösterdi: ölçütü (farklı parça sayısı) giriş
sayısından ayıran tek veri o hâldi.
