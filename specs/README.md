# specs/

Bu klasör, Altunmak CRM'de yapılacak işlerin **ne olduğunu ve neden istendiğini** sabitler.
Çözüm burada yazmaz; çözüm koddadır.

## Kurallar

1. **Spec'siz iş başlamaz.** `specs/` altında spec'i olmayan bir özelliğe dokunulmaz.
2. **Numara sırayla verilir ve yeniden kullanılmaz.** Biten spec `specs/done/` klasörüne
   taşınır, numarası serbest kalmaz.
3. Dosya adı: `specs/<dört-haneli-no>-<kebab-ad>.md` → `specs/0001-bayi-konsinye-envanteri.md`
4. Branch adı numarayı taşır: `feature/0001-bayi-konsinye-envanteri`
5. **Öneri kuralı:** soru, bulgu veya seçenek önerisiz sunulmaz. Kararı Takım Yöneticisi verir.
6. **Belirsizlikte varsayma.** Doküman ile kod çeliştiğinde kod doğrulanır, çelişki raporlanır.

## Durumlar

| Durum | Anlamı |
|---|---|
| **Taslak** | Analist yazdı, onay bekliyor. Kod yazılmaz. |
| **Onaylandı** | Takım Yöneticisi onayladı. Geliştirme başlayabilir. |
| **Geliştiriliyor** | Branch açıldı, iş sürüyor. |
| **Tamamlandı** | Tüm kabul kriterleri karşılandı, SCORECARD doldu, `done/`e taşındı. |
| **Kapatıldı** | İş yapılmadan kapandı: kapsamı başka spec'ler devraldı ya da ihtiyaç ortadan kalktı. Dosya `done/`e taşınır, başına kapatma gerekçesi ve devralan spec'ler yazılır, numarası serbest kalmaz. |

## Sıradaki işler

Spec'i henüz yazılmamış işler için numara ayrılmıştır ki atıf yapılabilsin.

**Bekleyen işlerin yapılma sırası (2026-10-03):** 0069 (0026 ve 0050–0068 tamamlandı). Kuyrukta başka
bekleyen iş yok. 0069 bir bakım işidir ve sürüm yayınından hemen sonraki geniş deneme aralığında
yapılmalıdır; yayın öncesine sıkıştırılmaz. Numara sırayı vermiyor; sıra bu satırda yazılı.

**Numara değişikliği (2026-09-27, Takım Yöneticisi kararı):** bekleyen yedi iş yapılma sırasına göre
0020–0026 aralığına taşındı. Eski numaralar (0004 → 0024, 0005 → 0023, 0031 → 0025, 0032 → 0021,
0033 → 0020, 0034 → 0022, 0035 → 0026) kural 2 gereği **yeniden kullanılmaz**; bu satır eşlemenin
kalıcı kaydıdır.

| No | İş | Neden beklemede |
|---|---|---|
| **0006** | Evrak satır bazlı satış kaydı | **Tamamlandı** (commit 715c237, 4f5422f); `specs/done/` altında. |
| **0007** | Bayi aracılığıyla kalıp satışı ve borç atıfı | **Tamamlandı**, v3.39.0 ile yayınlandı. |
| **0008** | Gider modülü yayın perdesi | **Tamamlandı ve kaldırıldı** (perde 2026-09-30'da indirildi, commit d65c3b7); gider, kasa ve çek modülleri **v3.40.0** ile kullanıma açıldı (26beb23). |
| **0009** | Tasarım sözlüğü (paylaşılan arayüz bileşenleri) | **Tamamlandı** (commit 6a5b32f, 5217b19); `src/components/tasarim.jsx` + `docs/tasarim-sozlugu.md`. |
| **0010** | Müşteriler ekranının yeni tasarıma geçmesi | **Kapatıldı**; kapsamı 0014, 0015 ve 0016'ya devredildi (`specs/done/` altında). |
| **0011** | Uyarı şeridine serbest içerik | **Tamamlandı** (commit 907a280, 7ec2d4c); `specs/done/` altında. |
| 0012, 0013 | (boş) | Numaralar kullanılmadı; bir sonraki iş bunlardan devam edebilir. |
| **0014** | Sekme ve süzgeç birliği | **Tamamlandı** (commit 7689c55, 9516134); `specs/done/` altında. |
| **0015** | Form birliği | **Tamamlandı** (commit 44f3911 ve done commit'i); `specs/done/` altında. |
| **0016** | Liste, boş durum ve uyarı birliği | **Tamamlandı** (commit d749f0a, 745a028 ve done commit'i); `specs/done/` altında. |
| **0020** | Personel giderinin makinaya ve modele atanabilmesi | **Tamamlandı** (commit 8ca7fbe, 1b74c01); `specs/done/` altında. Kural gider motorunda tek yerde (`atanabilirMi`: yalnız kira ortak); makina bazlı ekranlarda personel kalemi "Personel gideri" etiketiyle, çalışan adı basılmaz. |
| **0021** | Gider taksitlendirme ve vergi ödemesi takibi | **Tamamlandı** (commit 51690d4, 73d54a6); `specs/done/` altında. Taksit planı (1–60), kısmen ödendi durumu, kirada kiraya veren ile vergi dairesi (stopaj) ayrı ödeme hedefi; 0024 bu ödeme modelinin (`odemeHedefleri`) üstüne kurulacak. |
| **0022** | Üretim partisi ve parti bazlı maliyet | **Tamamlandı** (commit 90d68d8, 05a2916); `specs/done/` altında. Ayın ortak gideri açık partiler ve partisiz makinalar arasında adet oranında bölünür; 0002 X9 kararı dar biçimde geri açıldı (parti planlama aracı değil). |
| **0023** | Çalışan mesaisi ve primi | **Tamamlandı** (commit 55b54f8, 88ed17e); `specs/done/` altında. Mesai, prim ve ikramiye aya özgü ek ödeme satırı olarak girilir; tutar girişi, saat takibi değil. |
| **0024** | Kasa, banka hesapları ve ödemenin kalemden ayrılması | **Tamamlandı** (A: commit 4298f67, B: 3033714, done c7c3a23); `specs/done/` altında. Ödeme artık kendi kaydı olan bir harekettir (`{tarih, tutar, yontem, hesapId, giderId, taksitId}`), kısmi ödeme, avans ve mahsup, tedarikçi ve çalışan ekstresi. 0040, 0041 ve 0042 bu ödeme kaydının üstüne kurulur. |
| **0025** | Çıplak sabit renklerin temizliği (ekran bileşenleri) | **Tamamlandı** (Takım Yöneticisi bildirimi, 2026-09-28). Spec yazılmadı, iş doğrudan yapıldı. **Kayda geçen ölçüm:** aynı gün yapılan taramada ekran bileşenlerinde tema değişkenine hiç bağlanmamış 99 satır sabit renk görünüyor (`ServerLogin` 19, `App` 17, `Finance` 9, `Harita` 6, `Dashboard` 6, `ServisPanosu` 5, `Giderler` 5, `DonemRaporu` 5 ve diğerleri). Bir bölümü bilinçli olabilir (giriş ve kilit ekranı tema yüklenmeden çizilir, harita renk skalası veri anlamı taşır). Kapsam bundan darsa bu satır düzeltilmelidir. |
| **0026** | Genel aramanın yeni modülleri kapsaması (Taslak) | **Başlanmadı.** Önündeki engeller kalktı (0020–0024 tamamlandı) ama **kapsamı büyüdü**: 0040'ın çek portföyü de aranabilir olmalı. Bu yüzden yine en sonda; sırası 0042'den sonra. |
| **0030** | Bakım paketi: karanlık tema renkleri, bayi yedek parça etiketi, tekrarlayan giderler tablosu, tarih bombası | **Tamamlandı** (commit 3234f65, 3bfc6b7); `specs/done/` altında. Tanımsız tema değişkeni koruma testi (`tests/tema-degisken.test.js`) kalıcı. |
| **0040** | Çek portföyü ve alınan çekin ciro edilerek ödenmesi (Taslak) | Gelen çek bugün yalnız tahsilat kaydı üzerinde bir etiket; çekin kendisi (numara, banka, keşideci, vade) kayıtlı değil. Müşteri bu çekleri ciro ederek gider ödüyor. **Yanında bir hata da düzeltiyor:** ciro edilen çek hiçbir zaman "tahsil edildi" işaretlenmediği için o tahsilat Finans'ta ve aylık raporda gelire hiç girmiyor. |
| **0041** | Bir giderin birden çok ödeme yöntemiyle ödenmesi (Taslak) | Mekanizma 0024 ile zaten var (her ödeme kendi `yontem` alanını taşıyor, kısmi ödeme serbest); eksik olan görünürlük: kalem formundaki tek yöntem alanı yanıltıyor, listede kırılım yok, tek pencerede çok satırlı ödeme girilemiyor. |
| **0042** | Personel ödemesinin iki hedefe ayrılması ve yöntem seçicinin açılır listeye taşınması (Taslak) | Kira zaten iki hedefli (kiraya verene havale, vergi dairesine kredi kartı) ve **bugün çalışıyor**; personelde resmi ile elden tek hedefte, ayrı ödenemiyor. Ayrıca gider formundaki beş düğmelik yöntem satırı açılır listeye taşınır ve kural tasarım sözlüğüne yazılır. |
| **0043** | Menüde "Mali İşler" grubu (Taslak) | Menü on üç satıra çıktı; Finans, Giderler ve Kasa tek başlık altında toplanır, kapalıyken menü üç satır kısalır. **Hiçbir sekmenin adı ve kimliği değişmez** (kimlikler izin kayıtlarında ve sunucu eşlemesinde geçiyor). Küçük iş, tek dosya (`App.jsx` kenar çubuğu), veri modeline dokunmuyor; sırası esnek, 0040 öncesine de alınabilir. |
| **0044** | Servis, Extra Kalıp ve yedek parça tahsilatlarının hesaba bağlanması (Taslak) | Kasa bakiyesi bugün gerçek bakiyeden bu üç kaynak kadar eksik; 0024 X3'te bilinçli bırakılan sınır kullanımda yetersiz bulundu ve geri açıldı. **Seçenek A:** üç bölüme hesap alanı eklenir, bakiye bunları mevcut gelir kurallarıyla sayar. Seçenek B (ödemeyi gerçek kayda çevirmek, kısmi tahsilat) ayrı tutuldu. Sırası 0040'tan sonra: çek kuralı orada netleşiyor. |
| **0045** | Tutar alanlarında binlik ayracı ve form düğmeleri arasındaki boşluk (Taslak) | Gerçek kullanımda bildirilen iki görsel kusur. (1) Kuruşlu `TutarInput` yazarken basamaklamıyor, yanındaki özet kutusu basamaklıyor; `ui.jsx MoneyInput` basamaklıyor ama tam sayı, o yüzden gider tarafı kendi alanını yazmış. Tek yerde düzeltilir, on dosyayı kapsar; imleç davranışı kabul kriteri. (2) `Modal` alt kabı boşluk vermiyor, 0015 her formun sarmalayıcı yazmasını istiyor ve **altı form** bunu atlamış; düzeltme boşluğu kabın kendisine verir, kural yapıya döner. |
| **0046** | Gider formundan hedef bazlı ödeme, hesap seçimi ve çek cirosu (Taslak) | Bugün formdaki "ödendi olarak kaydet" **tek hesap ve tek yöntem** alıp kalemin bütün hedeflerine uyguluyor, taksitli kalemde ise hiç görünmüyor; ciro yalnız Kasa › Çek Portföyü'nden yapılabiliyor. Bu iş her ödeme hedefine (personelde resmi/elden, kirada kiraya veren/vergi dairesi) kendi satırını veriyor ve çeki kalemden seçtiriyor. **Yeni kalıcı alan yok**, yalnız giriş yüzeyi değişiyor; risk doğrulama ve tek işlemde yazım bütünlüğünde. |
| **0047** | Aylık Gider ve Kasa Raporu | **Tamamlandı** (commit db3eba2, done 13d7842); `specs/done/` altında. Gizlilik kuralı daraltıldı: çalışan bazlı tutar yazdırılamaz, toplamlar yazdırılır; koruma kaynak taramasından çıktı temelli teste taşındı. |
| **0048** | Gider düzenleme formunda ödeme bölümünün canlı olmaması | **Tamamlandı** (commit 71a3506 + done); `specs/done/` altında. Düzenleme kipinde hedefler ve tutarlar canlı formdan, ödenen tutarlar kayıtlı hareketlerden gelir. |
| **0049** | Portföye elle çek ekleme ve kendi çekimizle ödeme | **Tamamlandı** (A 6259114, B d93b813, done 268c73c); `specs/done/` altında. Çekin tutar/para birimi/vadesi kendi kaydında; tahsilatsız çek portföye girer; kendi çekimiz yazılınca borç kapanır, bakiye banka çeki ödediğinde düşer. |
| **0050** | Form pencerelerinin boyutu ve müşteri detayının uzunluğu (**Onaylandı** 2026-09-30) | İki şikâyet, tek sebep: ekranlar aşağı doğru uzun. Gider ve Kasa pencereleri hem dar hem birbirinden farklı (560 / 760 / türe göre değişen); genişleyince mevcut sarmalayan satırlar yan yana dizilip boy kısalıyor, alan düzenine dokunmadan. Müşteri detayındaki "Maliyet ve Kâr" kutusu 0016'nın katlanan kart desenine geçiyor, varsayılan kapalı. |
| **0051** | Bakım paketi: hesapsız kayıtlarda başlangıç tarihi ve ödemenin hangi hedefi kapattığı (**Onaylandı** 2026-09-30) | (1) Hesapsız ödeme ve tahsilat listeleri sistem öncesi kayıtlarla dolu; tek eşik tarihiyle süzülür (**liste süzgeci, bakiye süzgeci değil**). (2) `Kasa.satirAciklamasi` hareketin `taksitId`'sine bakmadığı için stopaj ödemesi "Kira" diye küçük tutarla görünüyor; hedef `hedefAdi`'dan yazılır. 0030 bakım paketi deseni. |
| **0052** | Kasa sekmesinin kendi izni (Taslak) | Sunucu izinlerinde Kasa kutusu yok: 0024 C6'da türev sekme olarak tasarlandı (Giderler + Finans varsa kendiliğinden görünür). Sonucu, yöneticinin Kasa'yı **geri alamaması**. Kutu eklenir, 0024'ün veri kuralı **önkoşul** olarak kalır (kutu + Giderler + Finans). Eski kullanıcılar hak kaybetmez; `kasaHesaplari` Kasa'ya bağlanır, `hesapHareketleri` Giderler'de kalır (ödeme gider formundan da yazılıyor). |
| **0053** | Ödeme yöntemi satırın alanı olsun, çek her ödeme yolundan kullanılsın (Taslak, R2) | Üç şikâyet, tek sebep: yöntem yanlış yerde. Kalem düzeyindeki "Varsayılan ödeme yöntemi" kaldırılır; bir hedef **birden çok satırla** ödenebilir; çek (ciro ve kendi çekimiz) ödemenin girildiği **her yerde** seçilir. **R1 (TY kararı): her şey formda** — düzenleme formunda da ödeme girilir ve silinir (0046 R15 geri alınır), form ile ödeme penceresi **tek paylaşılan bileşen** olur. Ek ödeme ayrı hedef OLMAZ (0023 C8 korunur), ama **hedef ile yöntem bağımsızdır**: elden bileşeni havaleyle, resmi bileşeni nakit ödenebilir; çok satırlı ödeme her gider türü için geçerli (100.000 hammaddenin yarısı havale yarısı nakit). "Elden" sözcüğünün iki anlamı Context'te. |
| **0054** | Ek ödeme maaştan ayrı bir ödeme hedefi olsun (Taslak) | **0023 C8 ödeme tarafında geri alınıyor.** Maaşı ödenmiş kaleme prim eklenince bugün kapanmış hedef yeniden açılıyor ve kullanıcı ödeme ekranında kalanı aramak zorunda kalıyor. Personel hedefleri dörde çıkar: maaş (resmi), maaş (elden), ek ödeme (resmi), ek ödeme (elden); ek ödeme tek başına ödenir. Ayrım zaten `personelHedefKirilimi`'nde hesaplanıyor, iş onu hedefe yükseltmek. Göç yok, gider tarafı değişmez. |
| **0055** | Rapordaki kalem listesi seçeneği kalksın, liste hep gelsin (Taslak) | 0047 R32 geri alınıyor: kutu her açılışta işaretli geliyor ve liste raporun asıl işe yarayan bölümü; kullanılmayan seçenek ekranda bir soru, kodda bir dal demek. Kutu üç ekrandan ve parametre motordan kalkar. Dar iş, rakamlara ve gizliliğe dokunmaz. |
| **0056** | Deneme döneminde kasa hesaplarının silinebilmesi (Taslak) | Gider ve Kasa deneme hâlinde, tam kullanım 01.01.2027. 0024 R16 hareketi olan hesabın silinmesini kapatıyor; deneme döneminde bu koruma **tarihe bağlı olarak askıya alınır** ve dönem bitince kendiliğinden döner (0008 perdesiyle aynı yaklaşım). Silerken hareketler ya başka hesaba taşınır ya hesapsız bırakılır; hiçbir kayıt silinmez. Para birimi kilidi kalır (çevrim yok), açılış bakiyesi zaten serbest. |
| **0057** | Taksitli hedefin ilk taksiti formdan ödenebilsin (Taslak) | Altı taksitli yeni giderde ödeme kutusunda yalnız tarih kalıyor: `formOdemesi.js`'te `pasif = satirlar.length > 1` bütün taksitli hedefleri formda kapatıyor (0046 R6/X3). Satır çizilir, hangi taksidi ödediği seçilir, varsayılan en yakın vadeli açık taksit. **Tek gerçek risk:** yeni kalemde taksit kimlikleri geçici, bağ **sıra** üzerinden kurulmalı. Dar istisna kalır: o düzenlemede planı değişen hedef pasif. |
| **0058** | Hesapsız kayıtların kapsam dışı bırakılabilmesi (Taslak) | Kasa'daki hesapsız tahsilat listesi geçmiş kayıtlarla dolu, iş listesi olmaktan çıkmış. **Önemli not:** bu kayıtlar bugün de hiçbir bakiyeye girmiyor (0024 R8), yani kasa yanlış değil; sorun liste temizliği. Satır bazında kalıcı "kapsam dışı" kararı, geri alınabilir, toplu işlemli; karar tek bir listede `{kaynak, kayitId}` olarak tutulur (dört bölüme ayrı sütun eklenmez). 0051'in tarih süzgeci görünüm, bu karar kalıcı. |
| **0059** | Gider ve kasa raporu aylık rapor diliyle yazılsın (Tamamlandı) | İki belge iki ayrı dosyada, iki ayrı sunum diliyle yazılmış: faaliyet raporu kutulu, koyu başlık şeritli, firma firma detaylı ve **geçen ayla karşılaştırmalı**; gider raporu düz başlıklı özet. Ortak **sunum modülü** kurulur (yalnız çerçeve ve biçim, hiçbir gider alanı adı taşımaz, gizlilik taraması bozulmaz), geçen ay karşılaştırması ve altı detay tablosu eklenir. Veri zaten elde, gösterilmiyor; rakamlar değişmez. |
| **0060** | Ödeme neyin ödemesi olduğunu söylesin: stopaj, fazla mesai, prim, ikramiye, avans (Tamamlandı) | Taksitlendirilmiş stopaj listede yalnız "Kira" diye görünüyor (kök bulundu: hedef rozetleri yalnız taksitsiz kirada çiziliyor); personele ödenen avans, fazla mesai, prim ve ikramiye hiçbir ödeme ekranında belirtilmiyor. Hedef adı tek kaynaktan her yere taşınır, ek ödeme türü ve mahsup payı görünür olur, rapor bunları **tür bazında** detaylandırır. 0047/0054'ün gizlilik yasağı dar biçimde gevşetilir: tür toplamı evet, çalışan adı ve kişi bazlı tutar hayır. |
| **0061** | Geçmiş aylardan kalan borçlar: açık kalemler listesi ve yaşlandırma (Tamamlandı) | Vadesi girilmemiş eski bir borç hiçbir listede kalem olarak görünmüyor (hatırlatıcı vade şartıyla süzüyor, Dönem Raporu tahakkuk esaslı) ve hiçbir yerde yaşlandırma yok. Dönem Raporu'nun süzgecine **"Açık kalemler (tüm dönemler)"** kipi eklenir (hatırlatma kapsamı emsali, yedinci sekme yok), satır hedef başına, yaş **gider tarihinden**, kovalar 0-30/31-60/61-90/90+; taraf kırılımı ve rapora yaşlandırma tablosu. Toplam borç özetiyle eşit. |
| **0062** | Giderler ve Kasa listelerinde sayfalama (Tamamlandı) | Taramada `gider/`, `kasa/` ve `cek/` klasörlerinden **hiçbir dosya** paylaşılan sayfalama bileşenini kullanmıyor, tek dilimleme çağrısı yok; uygulamanın geri kalanı yıllardır sayfalıyor. Beş liste tanım gereği sonsuz büyüyor (hesap hareketleri, hesapsız kayıtlar, çek portföyü, makina kârlılığı, ekstre) ve kalem listesi Tarih Aralığı kipinde binlerce satıra çıkabiliyor. İki sessiz tuzak kapatılır: **toplamlar** ve **toplu işlemler** sayfaya bağlanmaz, yürüyen bakiye sayfalar arası sürekli kalır. |
| **0063** | Tahsilat hesabı sorulmayan iki giriş noktası: yeni müşteri ilk ödemesi ve bayi satışları (Tamamlandı) | 0044 tahsilatı hesaba bağladı ama iki nokta dışarıda kaldı, ikisi de paranın gerçekten geldiği an: makina satışının **ilk ödemesi** (satır satır yöntem seçiliyor, hesap sorulmuyor) ve **Bayiler sekmesinden** yapılan yedek parça / Extra Kalıp satışı. Bayi tarafı neredeyse hazır (iki form alanı zaten içeriyor, `kasaHesaplari` geçirilmemiş); ilk ödeme tarafında hesap **satırın alanı** olur ve seçici tek paylaşılan bileşene taşınır. Yeni kalıcı alan, sunucu ve izin değişikliği yok. |
| **0064** | Eksik kayıt kilitleri: Giderler, Kasa, katalog, ayarlar ve veri araçları (Tamamlandı) | Kayıt bazlı kilit 11 alanda var, `gider/`, `kasa/`, `cek/` ve `settings/` klasörlerinde **hiç yok**. `dataVersion` yetmiyor: birleştirme yalnız eklemeleri geri uyguluyor, düzenleme kaybediliyor ve **aynı kaleme iki eşzamanlı ödeme ikisi de ekleme olduğu için ikisi de yaşıyor** (kalem iki kez ödenir, çek iki alacaklıya gider). Katalog hem kilitsiz hem birleştirmesiz, orada yeni kayıt bile toptan kayboluyor. Kilit uç noktası türü doğrulamadığı için iş tamamen istemci bağlaması: sunucu, DB, izin değişmiyor. |
| **0065** | Parça stoğu çakışmada kaybolmasın: stok hareketi birleştirilsin (Tamamlandı) | `partStock` ve `partStockLog` **ne kilitli ne birleştirmede**: iki kullanıcı aynı anda stok düşüren iki iş kaydedince kaybedenin **kaydı korunuyor, düşümü siliniyor** ve log'da iz kalmıyor; stok sessizce şişiyor. Kilitle çözülmez (stok küresel). Log birleştirilir, adet **bu birleştirmenin kendi hareketlerinden** yeniden hesaplanır (göç yok), geri alma satır silmek yerine **karşı hareket** yazar, bugünkü sapma için salt okunur tutarlılık raporu. Dikkat: sayım düzeltmesi log'a mutlak değer yazıyor, diğer tipler fark. |
| **0066** | Kasa işlemleri izin ekranında giderden ayrılsın (Taslak) | İzin tanımlarında "Kasa ve hesaplar" bir **grup** ve bu grup gider izinleri dizisinin içinde: ekranda Gider işlemleri akordeonunun son bölümü. Kasa kendi akordeonuna taşınır; izin boyutu yine `giderActions` kalır (Kasa sekmesi Giderler'i önkoşul tuttuğu için ayrı boyut göç ve sunucu işi demek, karşılığı yok). Servis Panosu akordeonunun hazır deseni. |
| **0067** | Giderler'de kutu düzeni ve müşteri detayından maliyet kutusunun kaldırılması (Taslak) | Dönem Raporu'nda en çok bakılan tablo en altta: kalem listesi makina maliyet kovalarının üstüne, "Kime Ne Kadar Borçluyuz" listenin hemen altına (0061'in açık kalemler kipinde zaten böyle, normal kip ona uyar). Müşteri detayındaki "Maliyet ve Kâr" kutusu kaldırılır, bileşen Makina Kârlılığı'nda kalır; 0050'nin katlanır kutu kararının o yarısı geri alınır, yerel tercih ve araç adımı temizlenir. |
| **0068** | Denetim sonrası kapatılacaklar: işlem geçmişi etiketi, çek dışa aktarması, çöp kutusuna girmeyen veri (Taslak) | Dört altyapı denetlendi. **Temiz:** kullanıcı geçmişi etiketleri, yedek paketleri (33 bölümün hepsi), sunucu bölüm adları, içe aktarmanın silmeyen yazımı. **Kapatılacak:** üretim partisi işlem geçmişinde ham anahtarla görünüyor (+ kapsam testi); çek portföyü 21 dışa aktarma raporunun hiçbirinde yok; dokuz bölüm kalıcı siliniyor, bunlardan **tedarikçi** (ekstre erişilmez kalıyor) ve **üretim partisi** (silinince bütün makinaların maliyeti sessizce değişiyor) çöp kutusuna alınır, kalan yedi için onay penceresi "çöp kutusuna gitmez" der. |
| **0069** | Electron 44 ve şifreli SQLite sürücüsünün yükseltilmesi (Taslak) | `electron` 42.11.5 → 44.4.4 (iki major) ve `better-sqlite3-multiple-ciphers` 12.11.1 → 13.0.3 **tek dalda**: Electron majoru zaten yerel modülleri yeniden derlemeye zorluyor. Spec'in sebebi **sessiz düşüş**: `db.cjs` şifreli sürücü yüklenemezse yalnız konsol uyarısıyla şifresiz `better-sqlite3`'e düşüyor, uygulama açılmaya devam ediyor; yani bozuk derleme fark edilmez. "Açıldı" kanıt sayılmaz, şifreli sürücünün yüklendiği kanıtlanır. On Electron testi (yerleşim testleri Chromium majorunda en kırılganı), paketleme, kurulum ve otomatik güncelleme kapsamda. |

## Açık bulgular (spec'i yok, karar bekliyor)

İş sırasında bulunan ama o işin kapsamında olmayan sorunlar. Kural 1 gereği düzeltilmeden önce Takım Yöneticisi karar verir.

| Bulgu | Nerede bulundu | Öneri |
|---|---|---|

Şu an açık bulgu yok. **Kapatılanlar:** `makina-odeme.test.js` tarih bombası ve karanlık temada beyaz kalan teslim ayrıntı
kutusu (`n050`), ikisi de 0030 ile (2026-09-27). 0030'un saat kaydırma taraması iki tarih bombası daha buldu
(`gider-perdesi-yedek`, `musteri-detay-bolumler`), onlar da aynı işte sabitlendi; yöntem `specs/done/0030-uygulama-plani.md` §7'de.

## Bu projede tek gerçek kaynaklar

Şablondaki atıflar bu projede şu dosyalara karşılık gelir:

| Aranan | Yer |
|---|---|
| Mimari, modül yerleşimi, veri kalıcılığı kuralları, karar defteri, bilinçli kapsam dışı kararlar | `CLAUDE.md` |
| Test stratejisi ve mevcut testler | `tests/`, `tests/ui/`, `scripts/tests/` |
| Sunucu yetki modeli | `electron/serverAuth.cjs`, `src/lib/permissions.js` |
| Görsel kanıt | `docs/evidence/<no>-ac<n>.png` |

Ayrı bir sözlük (`docs/domain.md`) henüz yok. İlk gerçek ihtiyaç doğduğunda açılır;
o ana kadar domain terimleri `CLAUDE.md` ve kod içindeki Türkçe adlandırmadan alınır.
