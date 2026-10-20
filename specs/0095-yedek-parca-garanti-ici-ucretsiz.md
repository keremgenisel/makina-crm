# 0095 — Yedek parça satışında garanti içi ücretsiz verme

| | |
|---|---|
| **Durum** | Onaylandı (revizyon 4, plan turu 2026-10-20) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Stok › Yedek Parça Satışı, müşteri detayı (zaman çizelgesi ve yedek parça toplamı), bayi detayı (borç kutusu ve yedek parça geçmişi), bayi silme onayı, Servis ve Kargo Panosu'nun kargo **detay penceresi** (kart değişmez), Anasayfa, Müşteriler, Finans, Aylık Faaliyet Raporu, Ayarlar › Sahipsiz Kayıtlar, Dışa Aktar; saf motorlar `utils`, `satisTahsilat`, `aylikRapor`, `bayiKaskad` |
| **Bağımlı spec'ler** | yok (0007'nin ücretsiz kalıp kuralı ve 0044'ün tahsilat kuralı emsaldir) |

---

## Intent

Fabrika, garanti kapsamındaki bir makinaya yedek parça gönderdiğinde para almıyor. Bugün bunu kaydetmenin
yolu yok: satışın fiyatı sıfır yazılıyor, kayıt "ödenmedi" kaldığı için alıcı Anasayfa'nın borçlular
kutusunda ve Müşteriler'in borçlu süzgecinde sıfır liralık bir borçla görünmeye devam ediyor; "ödendi"
işaretlenirse de kasaya hiç girmemiş bir tahsilat varmış gibi oluyor. Servis tarafında bu soru yıllar önce
çözülmüş durumda: garanti aktifken değişen parça ücretsiz sayılıyor ve hiçbir borç üretmiyor.

Başarı: yedek parça satışında da "garanti içi, ücretsiz verildi" denebilmesi. O kayıt hiçbir ekranda borç,
gelir ve tahsilat üretmez; buna karşılık parça stoktan düşmeye, makinaya tahsis edilmeye, kargo panosuna
düşmeye ve makina geçmişinde görünmeye devam eder. Ücretsiz verilen parça da verilmiş parçadır.

---

## Requirements

- **R1.** Bir yedek parça satışı "garanti içi, ücretsiz verildi" olarak işaretlenebilir.
- **R2.** Varsayılan **ücretlidir**. İşaret yalnız kullanıcı koyduğunda konur. (Serviste varsayılan terstir:
  garanti aktifken parça ücretsiz sayılır, kullanıcı "garanti dışı" diyerek ücretliye çevirir. Yedek parça
  satışı normalde bir satıştır, varsayılanı tersine çevirmek bugünkü bütün kayıt akışını sessizce değiştirir.)
- **R3.** İşaret **her alıcı türünde** konabilir: müşteri, bayi ve anlaşmasız dış firma. *(Karar 1, onaylandı)*
- **R4.** Alıcı müşteriyse o makinanın garanti durumu formda yazar. Garantisi bitmiş ya da garanti bitiş
  tarihi hiç girilmemiş makinada işaret konabilir, ama bir uyarı çıkar; uyarı kaydı engellemez. Alıcı bayi
  ya da dış firmaysa hangi makina için alındığı satış anında belli olmadığı için garanti durumu yazılmaz ve
  uyarı çıkmaz. *(Karar 1, onaylandı)*
- **R4/3.** Garanti durumu satırı alıcı müşteri seçiliyken **kutu işaretli olmasa da** çizilir (AC-3); uyarı
  yalnız kutu işaretliyken çıkar. Bu yüzden müşteri alıcılı bütün form ekranlarının görüntüsü değişir ve kanıtta
  `degisti` kaydını alır. *(Plan turu K5, onaylandı)*
- **R4/2.** Garanti ölçütü `selectedCust.warrantyEnd >= bugün`dür ve buradaki "bugün" **`utils.yerelBugun()`**
  ile okunur. `ServiceForm.jsx:50` aynı karşılaştırmayı `today()` ile yapıyor ve `today()` UTC döndürüyor
  (Türkiye'de 00:00 ile 03:00 arası dünü verir); servisin o satırı bu işte değiştirilmez (C5, X1, X9) ve iki
  yerin bilinçli olarak ayrıştığı burada kayıtlıdır. Sonuç yalnız bir uyarı şeridi olduğu için risk düşüktür,
  ama yeni kodda bilinen bozuk yardımcıyı kullanmak CLAUDE.md'nin gün sınırı kuralını eskitir (0003, 0072 dersi).
- **R5.** Ücretsiz satış **hiçbir yerde borç üretmez**: Anasayfa'nın borçlu firmaları ve borçlu
  bayi/servis kutusu, Müşteriler'in borçlu süzgeci ve satır boyaması, müşteri detayının kalan borcu, bayi
  detayının borç toplamı, Finans'ın toplam alacağı, aylık raporun alacağı ve alacak yaşlandırması, Stok ›
  Yedek Parça Satışı listesinin borç toplamı.
- **R6.** Ücretsiz satış hiçbir yerde **gelir ve tahsilat** üretmez: Finans'ın cirosu, aylık raporun yedek
  parça tutarı ve KDV'si, tahsilat listeleri, kasa bakiyesi.
- **R7.** Ücretsiz satışta KDV hesaplanmaz ve tevkifat seçilemez. Ödeme yöntemi, çek vadesi ve tahsil
  durumu, kredi kartı taksiti ve komisyonu, tahsilat hesabı sorulmaz; kayıtta bu alanlar temizlenir.
- **R7/2.** Temizlenen alanların tam listesi: `yontem` (boş), `vadeTarihi` (boş), `tahsilEdildi` (false),
  `taksitSayisi` (null), `kartKomisyonu` (null), `hesapId` (null), `tevkifatli`/`tevkifatPay`/`tevkifatPayda`
  (anahtar hiç yok), **`odendi` (false)** ve **`tahsilatTarihi` (null)**. Son ikisi R7'nin ilk hâlinde yoktu:
  düzenlemede ödenmiş bir satış ücretsiz işaretlenince ödeme kutusu gizlenir ama `odendi: true` kayıtta kalır
  ve dışa aktarmanın "Ödendi" sütunu "Evet", bayi detayının rozeti "Ödendi" der. Ücretsiz kayıtta ödeme durumu
  diye bir şey yoktur. Gerekçe: C2'nin okuduğu `satisTahsilEdildi` doğrudan `odendi`'ye bakar; `true` kalırsa
  borçsuzluk iki ayrı sebebe dayanır ve hangisinin çalıştığı ölçülemez. Ayrıca bayat `hesapId`
  `kasa.js:198`'deki `hesapKullanimi` sayımında kalır ve hesabın silinmesini sebepsiz engeller.
  *Reddedilen seçenek:* `odendi`'yi olduğu gibi bırakmak (Extra Kalıp bugün böyle yapıyor); maliyeti her
  ekranda ayrı "ücretsiz mi" dalı yazmaktır, C2'nin tek yol kuralı zayıflar.
- **R7/4.** Ücretsiz kayıtta `yedekParcaRec`'in **kredi kartı dalı hiç çalışmaz** ve **tevkifat doğrulaması
  atlanır**. C7'nin "yöntem boş olduğu için dal çalışmaz" ölçümü yalnız kaydın sonucuna bakıyordu; form durumunda
  "Kredi Kartı" + komisyon yansıtma kalmışsa dal, `ucretsizUygula`'dan **önce** çalışıp saklı birim fiyatı KDV
  matrahına ölçekler ve R12'yi bozar. Aynı şekilde form durumunda kalmış bozuk bir tevkifat oranı, kutu
  işaretliyken kaydı sebepsiz engellerdi. *(Plan turu K1, K2, onaylandı)*
- **R7/3.** Hesaba bağlı, ödenmiş bir satış ücretsize çevrilince o hesabın yürüyen bakiyesinden tutarı
  **geriye dönük düşer**, çünkü bakiye saklanmaz, türetilir (0024 R1) ve `satisTahsilatKalemi` bedeli sıfır
  olan kaydı hiç üretmez. Bu beklenen davranıştır, düzeltme kendiliğinden olur; sürüm notunda yazar ki
  kullanıcı "kasam değişti" diye gelmesin.
- **R8.** Parça **stoktan düşer** (bugünkü kuralla: stok yetersizse yalnız mevcut kadarı), stok hareketi
  yazılır, alıcı müşteriyse otomatik makina tahsisi yapılır, bayi alıcıda elle tahsis aynen çalışır.
- **R9.** Kargo, pano, teslim şekli, farklı teslimat adresi ve kargo/sevk etiketi akışı değişmez.
- **R10.** Ücretsiz satış listelerde, makina geçmişinde ve bayi detayında **"garanti kapsamında (ücretsiz)"**
  ibaresiyle görünür (Extra Kalıp'ın bugünkü metninin aynısı); yerinde tutar yazılmaz.
- **R10/2.** İbarenin **tek tanımı** olur (`UCRETSIZ_IBARESI`, saf kitaplıkta) ve Extra Kalıp'ın bugün düz
  metin yazan üç yeri de oradan okur: `SimpleDealers.jsx:692`, `MachineTimeline.jsx:328`,
  `deriveCustomerDetail.js:57`. Kaynak taraması düz metni yasaklar. Gerekçe: iki kayıt türünün aynı cümleyi
  kullanması R10'un amacıdır; beşinci kopya eklenirse biri güncellenip diğerleri kalır (0093'ün
  `URETIM_DEGIL_IBARESI` dersi).
- **R11.** Ücretsiz kayıtta **ödeme durumu göstergeleri çizilmez**: hem düğmeler hem rozetler. Dört yer:
  `YedekParcaSatisTab.jsx:259` (Stok satırının "Ödendi / Ödenmedi" düğmesi), `MachineTimeline.jsx:283`
  ("Ödendi" düğmesi) ve `:289` ("Çek tahsil edildi" düğmesi), `SimpleDealers.jsx:657` (bayi detayının yedek
  parça geçmişindeki "Ödendi / Ödenmedi" **rozeti**). Rozet R11'in ilk hâlinde kapsam dışı kalıyordu; emsal
  tersini yapıyor: `SimpleDealers.jsx:694` Extra Kalıp'ın aynı rozetini de `!p.ucretsizMi` ile gizliyor.
  Gerekçe: kırmızı "Ödenmedi" rozeti ücretsiz kayıtta yanlış bilgidir ve R5'in amacını, hayalet borç
  görünümünü bitirmeyi, tam olarak baltalar. *Reddedilen seçenek:* rozeti "Ücretsiz" olarak yeniden yazmak;
  maliyeti aynı satırda R10'un ibaresi zaten durduğu için iki ayrı ücretsiz işareti oluşmasıdır.
- **R12.** Girilmiş birim fiyat kayıtta **saklanır**; işaret kaldırılınca aynı fiyatla geri döner. *(Karar 3, onaylandı)*
- **R13.** Toplu satışta (çok satırlı ekleme kipi) işaret **form düzeyindedir**: o kayıtta doğan bütün
  satırlar aynı işareti alır. *(Karar 2, onaylandı)*
- **R14.** Düzenlemede işaret konabilir ve kaldırılabilir. Kaldırılınca kayıt yeniden ücretli olur ve
  borç/gelir hesaplarına girer.
- **R14/2.** **Kaldırma alanı kayıttan siler**, `false` yazmaz; yazım tek kurucudan geçer. Düzenleme kolu
  `yedekParcaGuncelle` = `{ ...eski, ...rec }` eski alanları silmez: işaret kapalıyken `rec`'te anahtar yoksa
  eski `true` korunur ve işaret **asla kaldırılamaz**, yani R14 bugünkü kurucuyla hiç çalışmaz. Çözüm
  `satisTevkifatUygula` deseninin aynısı: `ucretsizUygula(rec, form)` alanı her çağrıda `delete` eder, yalnız
  form işaretliyse `true` yazar. Context bu tuzağı (spec 0079 R5/1) yazıyordu ama hiçbir madde silmeyi
  istemiyordu. *Reddedilen seçenek:* `ucretsizMi: !!form.ucretsizMi` ile her zaman yazmak; C4 ve C3 ile
  çelişir (kapalı değer gövdeye girmez).
- **R15.** Yedek parça satışlarının dışa aktarmasında ücretsiz olup olmadığı bir sütunda yazar (Extra
  Kalıp'ın "Ücretsiz mi" sütununun emsali).
- **R16.** Yeni eylem izni yoktur; işaret satışın kendi ekleme/düzenleme izniyle konur ve kaldırılır.
- **R16/2.** **Kabul edilen sınır:** işaret bir alacağı sıfırlar, ama bunun için yeni izin açılmaz ve sunucuya
  alan denetimi (`serverAuth.ALAN_IZINLERI`) eklenmez; yazım bölüm düzeyinde güvenilir. İz, satışın İşlem
  Geçmişi'ndeki `duzenlendi` kaydında kalır. Emsal: 0006 C8 ve 0088'in bölüm düzeyi güveni aynı sınırı yazılı
  taşıyor. Yazılmazsa ilk denetimde boşluk gibi görünür.
- **R17.** Kalıcı alanın adı **`ucretsizMi`**'dir, Extra Kalıp'takiyle aynı; veritabanı sütunu da aynı adı
  taşır, yani `part_sales` ve `yedek_parca_satis` tablolarında aynı ada sahip iki sütun olur. Gerekçe: aynı
  kavram aynı adla sorulursa `ucretsizMi` okuyan ortak bir yardımcı (ör. `satisUcretsizMi(r)`) mümkün olur;
  ayrı ad her ortak yardımcıda iki dal yazdırır. C5'in "aynı ada bağlanmazlar" uyarısı **servisin**
  `parcaGarantiDisi` bayrağı içindir (ters yönlü, farklı kayıt türü), Extra Kalıp'ın `ucretsizMi`'si için değil.
- **R18.** Formun kapıları ve kutunun yeri: **(a)** kutu `toplam > 0` kapısının **dışında**, fiyat alanlarının
  hemen altında çizilir, çünkü garanti parçasına fiyat girilmemesi normal hâldir ve bugün ödeme bloğu
  (`YedekParcaSatisForm.jsx:227`), toplam kutusu (`:283`) ve tahsilat hesabı o kapının içindedir; **(b)** ödeme
  bloğunun, toplam kutusunun, tevkifat alanının (`:156`, bugün kapısız) ve tahsilat hesabının kapısı
  `toplam > 0 && !ucretsiz` olur; **(c)** **Fatura Tipi alanı** (`:149`, bugün kapısız) ücretsizde çizilmez ve
  kayıtta `faturaTipi` boş kalır. (c) olmazsa aylık raporun fatura tipi kırılımına sıfır TL'lik bir satır düşer
  ve ücretsiz teslimin "Faturalı Yurtiçi" olduğu iddia edilir. İşaret kaldırılınca fatura tipi **geri gelmez**
  (fiyattan farklı olarak, R12): form varsayılanı "Faturalı Yurtiçi"yi gösterir ve kaydeder; görünen değer
  kaydedilenle aynı olduğu için sessiz değişiklik yoktur, sürüm notunda yazar (plan turu K4). *Reddedilen seçenek:* `faturaTipi`'ni
  "Faturalı Yurtiçi" bırakmak; KDV sıfır olsa da rapor ücretsiz sevki faturalı satış gibi sayar.
- **R19.** Dışa aktarma satırında (`SettingsExport.yedekParcaExportRow`): **"Birim Fiyat"** hücresi ham kalır
  (R12 gereği saklı fiyat), **"Toplam"**, **"Ürün Bedeli (Komisyon Hariç)"** ve iki tevkifat hücresi **boş**
  yazılır (sıfır değil), "Ödendi" ve "Ödeme Yöntemi" boş kalır, yeni **"Ücretsiz mi?"** sütunu Evet/Hayır
  yazar ve yeri "Ürün Bedeli (Komisyon Hariç)"in hemen ardıdır. Emsal `SettingsExport.jsx:284`: Extra Kalıp ham
  "Ücret"i dolu bırakıp türetilmiş hücreyi `""` yapıyor ve tevkifat hücrelerini `["", ""]` yazıyor (`:289`),
  sütunu da aynı yerde taşıyor. Gerekçe: boş hücre "tahsil edilecek bir şey yok" der, 0,00 ise "sıfır liraya
  satıldı" der ve bugünkü kaçamağın okunuşu tam olarak budur; sütun sırası emsalle aynı olmalı, çünkü iki satırı
  yan yana okuyan kullanıcı aynı yerde arar. *Reddedilen seçenek:* sıfır yazmak; dışa aktarmadan okuyan kişi
  ücretsiz kaydı sıfır fiyatlı satıştan ayırt edemez ve X5'teki geçmiş karmaşası yeniden üretilir.
- **R20.** Aylık Faaliyet Raporu'nda **adet ile para ayrılır**: adet sayaçları (`yedekKargoAdet`,
  `yedekKargoMiktar` ve teslim şekli sayıları `yedekKargoTeslim`) ücretsizi **sayar**; para kovaları
  (`yedekKargoTutar`, `yedekKargoKdv`, `yedekKargoMusteriTutar`, `yedekKargoBayiTutar`,
  `yedekKargoTeslimTutar`) **saymaz**; **fatura tipi kırılımı** (`kargoFatura`) ücretsizi hiç almaz, çünkü o
  bir vergi tablosudur; **`yedekKargoDetay`** satırı kalır, Miktar hücresi dolu, Tutar ve KDV hücresi boş,
  Durum hücresi R10'un ibaresi olur (bugün "Ödenmedi" yazıyor). Bu, Extra Kalıp'tan **bilinçli sapmadır**
  (ölçüm 5): orada ücretsiz kayıt adet sayısından da düşülüyor. Gerekçe: Intent'in "ücretsiz verilen parça da
  verilmiş parçadır" cümlesi çıktıda görünür olmalı; sapma yazılı olmazsa iki kayıt türü aynı raporda farklı
  davranır ve hangisinin doğru olduğu sorusu her bakışta yeniden açılır. *Reddedilen seçenek:* Extra Kalıp'ı
  birebir kopyalamak; Intent'in cümlesi çıktıda kaybolur. Raporda "Ücretsiz" yazan tek Durum hücresi
  servis detay satırınındır (`printTemplates.js:1640`, servisin ücretsiz parçası) ve **değişmez**; Extra Kalıp detay
  tablosunda Durum sütunu yoktur. Yedek parça satırı ibareyi yazar; iki metin farklı kayıt türlerine aittir (plan turu
  K6; plan turundaki "Extra Kalıp" atfı uygulamada ölçülerek düzeltildi).
- **R21.** Servis ve Kargo Panosu'nda ibare **yalnız kargo detay penceresinde** görünür: "Genel Toplam"
  (`KargoPanosu.jsx:168`) ve kalem satırı (`:179`). **Kargo kartı değişmez**, çünkü kartta hiç tutar yoktur
  (`KargoKart`, `:24-107`: yalnız parça adı ve adet). AC-24'ün ilk hâli kartta olmayan bir tutarın yerine ibare
  koymayı istiyordu. Pano akışı (sürükleme, durum, arşiv, kargo/sevk etiketi) aynen kalır (R9).
- **R22.** Satış üreten yol **beştir**, dördü aynı formu kullanır (Stok sekmesi, Servis ve Kargo Panosu'nun
  düğmesi, müşteri detayı, bayi detayı) ve beşincisi **Evrak'ın "CRM'e Kaydet"idir**
  (`src/lib/evrakUygula.js:24`, `yeniYedekParcaSatisCoklu`; formu kullanmaz). Evrak yolu işareti **hiç
  yazmaz**: teklif kalemi fiyatlıdır, kayıt ücretli doğar ve `evrakUygula.js` bu işte değişmez; kaynak taraması
  bunu sabitler. Context'in "dört giriş noktası" cümlesi beşinci yolu kapsam dışı sanmaya yol açıyordu; C4
  sayesinde davranış bugün de doğru çıkıyor ama bu tesadüftür, yazılı karar olmalı. *Reddedilen seçenek:*
  Evrak'a da kutu eklemek; fiyatlı bir teklif kalemine ücretsiz demek çelişkilidir ve X2'nin mantığıyla uyuşmaz.

- **R23.** **Karışık parti.** Toplu satış tek işaretle doğar (R13) ama düzenleme tek satırlıktır; bir parti
  sonradan hem ücretli hem ücretsiz satır taşıyabilir. Partiye uygulanan ödeme düğmeleri (Stok satırı, makina
  geçmişi) yalnız **ücretli** satırlara yazar; partinin bütün satırları ücretsizse düğme çizilmez. Kargo detay
  penceresinin "Genel Toplam"ı ücretli satırların toplamıdır; ibare yalnız bütün satırlar ücretsizse yazar, kalem
  satırında ibare satır başınadır. *Gerekçe:* aksi hâlde "Ödendi" ücretsiz satıra `odendi: true` yazar (R7/2'ye
  aykırı). *(Plan turu K3, onaylandı)*
- **R24.** İbare sabiti (`UCRETSIZ_IBARESI`) yalnız **çekirdek metni** taşır; `deriveCustomerDetail`'in
  " · " öneki gibi birleştirmeler çağıranda kalır. *(Plan turu K7)*

---

## Constraints

### Uyulması zorunlu

- **C1.** **Bedel tek okuma yolundan geçer.** Bugün bir yedek parça satışının bedeli (miktar × birim fiyat)
  biri dışa verilmiş olmak üzere **on üç yerde** hesaplanıyor (Context, ölçüm 2). İşaret bu okuma yolunun
  içine yazılır (`yedekParcaBedeli` ücretsiz kayıtta sıfır döner) ve on iki kopya ona bağlanır. Kopyalardan
  biri atlanırsa o ekran ücretsiz parçayı ücretliymiş gibi göstermeye devam eder ve rakamlar ekranlar arasında
  ayrışır (Finans ile aylık raporun ayrışması bu projede iki kez hata oldu). Revizyon 1'in "sekiz yer" sayısı
  **eksikti**: dört kopya sayılmamıştı ve ikisi doğrudan bu spec'in konusudur (`bayiKaskad.js:22` bir alacak
  uyarısıdır, yani R5'in kapsamı; `KargoPanosu.jsx:179` R21'in kapsamı). Kural ölçüm 2 tablosunun **her
  satırını** bağlamaktır, sabit bir sayıyı değil.
- **C1/2.** Yeni bir satır içi kopya **kaynak taramasıyla yasaklanır**: `src` ve `electron` altında
  `miktar` ile `birimFiyat`'ı çarpan ifade yalnız `yedekParcaBedeli`'nin kendi tanımında bulunabilir, gerekçeli
  istisna listesi tam yolludur ve eskiyince test kırılır. İstisnalar (plan turu P4): yedek parça kaydı olmayan
  teklif/fatura kalemleri (`Documents.jsx`, `documents/FaturaFormModal.jsx`, `printTemplates.js`,
  `aylikRapor.js`'in teklif toplamı, `evrakUretim.js`) ve saklı kayıt değil form satırı okuyan iki yer
  (`YedekParcaSatisForm.jsx:55`, `CustomerDetailModal.jsx:282`; ölçüm 2'nin son paragrafı). Emsal: 0065'in `stokHareketi` taraması
  (`Math.abs(l.miktar)` ile brüt toplayan kod yasak). Gerekçe: on iki kopyayı bir kez bağlamak yetmez,
  on üçüncüsünün doğmasını test engellemeli.
- **C2.** Borçluluk da tek okuma yolundan geçer (`isYedekParcaBorcluMu`). Ücretsiz kayıt bu yolun içinde
  borçsuz sayılır; her ekran kendi "ücretsiz mi" dalını yazmaz.
- **C3.** Yeni kalıcı alan **dört nokta kuralıyla** eklenir. Alan boolean olduğu için `...rest` ile
  kendiliğinden okunmaz, SELECT eşlemesi açık yazılır. Emsal **`tevkifatOku`** (`electron/db.cjs:560`) ve
  **`kisitOku`** (0076): yazım `toInt` ile tek sütun, okuma `toBool(x) ? { ucretsizMi: true } : {}`.
  `panoGizli` ve `fabrikaTeslim` emsali **yalnız** "boolean sütun açık SELECT eşlemesi ister" kısmı için
  geçerlidir; gövdeye yazma kısmı için değil, çünkü o ikisi okumada koşulsuz yazılıyor
  (`db.cjs:1416` `toBool(panoGizli)`) ve alan her kayıtta gövdeye giriyor. Revizyon 1'in C3'ü bu yüzden
  kendi C4'üyle **çelişiyordu**.
- **C3/2.** Koşulsuz yazımın bedeli ölçüldü: karışık sürümde güncellenmemiş istemci alanı göndermez, yeni
  sunucunun saklı gövdesinde alan vardır, `serverAuth.degisenBolumler` bölümü değişmiş görür ve kısıtlı
  kullanıcı her kayıtta 403 alır. 0091'in `undefined` dersi ve 0078'in `bosOlmayan` kuralı aynı sebeple
  yazılmıştı.
- **C4.** **Göç yok.** Alanı olmayan eski kayıt ücretlidir; eski kayıtların çıktısı birebir aynı kalır.
  İşaret kapalıyken alan gövdeye yazılmaz (sunucu karşılaştırması null ile yokluğu ayırır).
- **C5.** Servisin `parcaGarantiDisi` bayrağına **dokunulmaz**. İki bayrak ters yönlüdür ve farklı kayıt
  türlerine aittir; aynı ada ya da aynı yardımcıya bağlanmazlar ("mesai" sözcüğünün iki anlamı dersi).
- **C5/2.** Bu uyarı **servisin** bayrağı içindir. Extra Kalıp'ın `ucretsizMi`'si aynı kavramdır (aynı yön,
  aynı soru) ve R17 gereği yedek parça da aynı adı kullanır; iki kayıt türünün tek ortak yardımcıya bağlanması
  burada istenen şeydir, yasak olan şey değil.
- **C6.** Sunucu yetki modeli, bölüm eşlemesi ve birleştirme kuralları değişmez.
- **C7.** Kredi kartı komisyonu anlık görüntüsü ücretsiz kayıtta yazılmaz; ücretliye dönen kayıtta bugünkü
  kuralla yeniden doğar. (R7/2 `yontem`'i boşalttığı için `yedekParcaRec`'in bugünkü kredi kartı dalı hiç
  çalışmaz ve `kartKomisyonu` kendiliğinden `null` olur; ölçüldü.)
- **C8.** `satisTahsilat.satisTahsilatKalemi`'nin YEDEK dalı, Extra Kalıp'ın `:30` emsalinin aynısını taşır:
  `if (r.ucretsizMi) return null;`. Bedel sıfır olduğu için dal zaten null döndürür, ama niyet kodda okunur
  olur ve iki kayıt türü aynı yerde aynı dalı taşır. `tahsilatHesapDurumu`'nun nedeni ücretsiz kayıtta
  "Garanti kapsamında verildi, kasaya girecek tutar yok." olur (bugün genel "Kasaya girecek tutar yok."
  metnini veriyor, `satisTahsilat.js:53`).

### KAPSAM DIŞI

- **X1.** Servisteki garanti mantığı değişmez — *neden:* orada çalışıyor; bu iş yalnız yedek parça satışına
  aynı imkânı verir.
- **X2.** Ücretsiz verme nedeni için ayrı alan (garanti / jest / hatalı sevk) açılmaz — *neden:* istek
  garanti içindir, kayıtta not alanı var; ayrı bir neden listesi ayrı iştir.
- **X3.** Extra Kalıp formuna ücretsiz kutusu geri getirilmez — *neden:* o kayıtta alan var ve okunuyor ama
  forma giriş kapısı yok (Context, ölçüm 3); ayrı ve küçük bir iştir, bu spec'in kapsamını iki kayıt türüne
  yayar.
- **X4.** Garanti bitmişken işaret konmasının engellenmesi — *neden:* bayi ve dış firma alıcıda hangi
  makina için alındığı belli değil, engel koymak bugünkü sıfır fiyat kaçamağını geri çağırır. Uyarı var,
  engel yok (R4).
- **X5.** Bugüne kadar sıfır fiyatla girilmiş satışların geçmişe dönük işaretlenmesi — *neden:* hangisinin
  garanti, hangisinin eksik giriş olduğu veriden anlaşılmaz; kullanıcı istediğini tek tek düzenler.
- **X6.** Ücretsiz verilen parçanın maliyetinin bir yere gider olarak yazılması — *neden:* parça maliyeti
  bu uygulamada stok hareketinden izlenir, parça alış maliyeti gider kaydı değildir (0087 R1, 0002 R3).
- **X7.** Servis ve Kargo Panosu'nun **kartına** ücretsiz rozeti eklenmesi — *neden:* kartta hiç tutar yok
  (R21), parça ücretsiz de olsa kargo akışı aynıdır (R9) ve kartın söylediği şey sevkiyattır, bedel değil;
  dördüncü rozet bugünkü üç rozetli satırı dar sütunda taşırır ve kartın 0 piksel kanıtını bozar.
- **X8.** Evrak'ın "CRM'e Kaydet" akışına ücretsiz kutusu eklenmesi — *neden:* R22; fiyatlı bir teklif
  kalemine ücretsiz demek çelişkilidir ve X2'nin mantığıyla uyuşmaz.
- **X9.** `ServiceForm.jsx:50`'nin `today()` kullanımının `yerelBugun`'e çevrilmesi — *neden:* servisin garanti
  mantığı değişmez (X1, C5); yeni kod R4/2 ile doğru yardımcıyı kullanır, eski yolun düzeltilmesi ayrı iştir.

---

## Context

### Ölçüm 1: bugün sıfır fiyat girmek borcu kapatmıyor

Borçluluk ölçütü `src/lib/utils.js:713`: `isYedekParcaBorcluMu(s) = !s.deletedAt && !satisTahsilEdildi(s)`.
**Tutara bakmaz.** Sonucu, fiyatı sıfır girilmiş bir satış "ödendi" işaretlenmediği sürece borçlu kalır:

| Yer | Bugünkü davranış |
|---|---|
| `src/lib/utils.js:765` `customerHasAnyDebt` | Müşteri borçlu sayılır (tutar denetimi yok) |
| `src/components/Dashboard.jsx:129` | Sıfır liralık satır borçlular kutusunda listelenir |
| `src/components/Dashboard.jsx:156` | Bayi alıcıda Borçlu Bayi/Servis kutusunda görünür |
| `src/components/SimpleDealers.jsx:93` | Bayi detayının borç toplamında satır olarak durur |
| `src/components/customers/detail/deriveCustomerDetail.js:201` | Müşterinin ek borcuna sıfır eklenir |
| `src/components/Finance.jsx:325` | `bedel <= 0` ile süzülür, **toplam doğru** |
| `src/lib/aylikRapor.js:437` | `kargoBedeli(s) > 0` ile süzülür, **toplam doğru** |

Yani rakamlar bugün yanlış değil, görünürlük yanlış: iki rapor sıfırı eliyor, dört ekran elemiyor. Bu da
sıfır fiyatın bir çözüm değil, kullanıcının elindeki tek kaçamak olduğunu gösteriyor.

### Ölçüm 2: bedelin on iki tanımı var

Bir satışın bedeli bugün şu yerlerde hesaplanıyor. Formül on üçünde de aynı (13. satır `Number` ile çözer); işaret eklenirken bu
dağınıklık işin asıl riski, C1 bu yüzden kural. Revizyon 1 sekiz satır sayıyordu, son dördü QA turunda
bulundu ve tablonun "QA turu" sütununda işaretlendi; on üçüncüsü plan turunda bulundu (P1). Ücretsiz
kayıtta Son Satışlar satırı tutar yerine ibareyi yazar.

| # | Yer | Ne | QA turu |
|---|---|---|---|
| 1 | `src/lib/utils.js:712` | `yedekParcaBedeli`, dışa verilmiş tek yol | yok |
| 2 | `src/lib/satisTahsilat.js:14` | `yedekBedeli`, modül içi | atıf düzeltildi (eskiden `:17`) |
| 3 | `src/lib/aylikRapor.js:76` | `kargoBedeli`, modül içi | yok |
| 4 | `src/components/Finance.jsx:128` | `kargoBedel`, modül içi | yok |
| 5 | `src/components/Finance.jsx:460` | aynı adla ikinci yerel kopya | yok |
| 6 | `src/components/Dashboard.jsx:237` | satır içi, çek vadesi listesi | yok |
| 7 | `src/components/KargoPanosu.jsx:130` | satır içi, detay penceresinin genel toplamı | yok |
| 8 | `src/components/settings/SettingsExport.jsx:49` ve `:52` | satır içi, üç çağrı | yok |
| 9 | `src/components/KargoPanosu.jsx:179` | satır içi, detay penceresinin kalem satırı | **eklendi** |
| 10 | `src/components/stock/YedekParcaSatisTab.jsx:228` | satır içi, Stok satırının tutarı | **eklendi** |
| 11 | `src/lib/bayiKaskad.js:22` | satır içi, bayi silme onayındaki açık alacak | **eklendi** |
| 12 | `src/components/settings/SettingsSahipsiz.jsx:48` | satır içi, sahipsiz kayıt satırının açıklaması | **eklendi** |
| 13 | `src/lib/dashboardStats.js:45` | satır içi (`Number` ile, `parseMoney` değil), Anasayfa "Son Satışlar" tutarı | **plan turu** |

`src/components/YedekParcaSatisForm.jsx:55` ve `src/components/customers/CustomerDetailModal.jsx:282`
bu tabloya **girmez**: ikisi de saklı kayıt değil, form satırları üzerinden hesaplar (biri formun kendi
toplamı, diğeri düzenlemede komisyonu geri çıkaran ön doldurma). R12 gereği saklı birim fiyatı okumaları
doğrudur ve değişmez.

### Ölçüm 3: Extra Kalıp'ta işaret var, giriş kapısı yok

`partSales[].ucretsizMi` alanı veride duruyor, veritabanında sütunu var (`electron/db.cjs:190`) ve
okunuyor; `src/lib/satisTahsilat.js:30` ücretsiz kalıbı tahsilat dışında, `src/lib/utils.js:704`
`kalipBorcTarafi` borç dışında bırakıyor; `MachineTimeline.jsx:328` ve `SimpleDealers.jsx:692`
"garanti kapsamında (ücretsiz)" yazıyor. Ama kaydı kuran `src/lib/kalipSatisi.js:12` alanı **her zaman
`false`** yazıyor ve `PartSaleForm` içinde kutu yok: bugün yalnız eski kayıtlarda dolu olabilir. Bu spec'in
istediği davranışın motor tarafı yani zaten yazılmış ve denenmiş; eksik olan yedek parça tarafındaki
karşılığı. Metin de oradan alınır (R10), iki kayıt türü aynı cümleyi kullansın.

### Ölçüm 4: servisin garanti kuralı

`src/components/ServiceForm.jsx:50` garanti aktifliğini `selectedCust.warrantyEnd >= today()` ile ölçüyor,
`:65` `parcaUcretsizMi`'yi hesaplıyor, `:405` kutuyu ters yönlü çiziyor ("Garanti kapsamı dışı (ücretli)" /
"Garanti kapsamında, parça ücretsiz verildi"). Garanti ölçütü aynen bu spec'te de kullanılır (R4), ama
bayrağın yönü ve varsayılanı terstir (R2, C5) ve "bugün" `yerelBugun` ile okunur (R4/2).

İkinci bir fark ölçüldü: servisin kutusu **yalnız `warrantyAktif` iken** çizilir (`:404`), yani garantisi
bitmiş makinada servis tarafında kutu hiç yoktur ve parça kendiliğinden ücretlidir. Yedek parçada kutu her
hâlde çizilir, garanti yoksa uyarı çıkar ve engel konmaz (R4, X4). Bu bilinçli sapmadır: bayi ve dış firma
alıcıda hangi makina için alındığı belli değildir.

### Ölçüm 5: aylık raporun yedek parça sayaçları ve Extra Kalıp'tan sapma

`hesaplaAylikRapor`'un yedek parça bölümünde (`aylikRapor.js:163-200`) bedel sıfırlansa bile ücretsiz kayıt
şu altı yerde durmaya devam eder; her biri için R20 bir karar veriyor:

| Yer | Bedel sıfırlanınca ne olur | R20'nin kararı |
|---|---|---|
| `yedekKargoAdet` (`:543`) ve çıktıdaki "N yedek parça satışı" (`printTemplates.js:1729`, `:1781`) | satış sayısına girer | **sayar** |
| `yedekKargoMiktar` (`:175`) | sevk edilen adede girer | **sayar** |
| `yedekKargoTeslim` (`:184-186`) | teslim şekli sayılarına girer | **sayar** |
| `kargoFatura` (`ftEkle`, `:182`) | FATURA TİPİ KIRILIMI'na bir adetlik sıfır TL satır düşer | **almaz** |
| `yedekKargoTeslimTutar` (`:183`) ve para kovaları (`:178-181`) | sıfır ekler | **saymaz** |
| `yedekKargoDetay` (`:188-198`, çıktı `printTemplates.js:1635`) | Tutar 0, KDV 0, Durum "Ödenmedi" | satır kalır, Tutar ve KDV boş, Durum ibare |

Extra Kalıp emsali tersidir ve ölçüldü: `aylikRapor.js:143` ücretsiz kaydı döngünün en başında atlıyor,
`:538` `extraKalipAdet`'ten düşüyor, `:155` `extraKalipDetay`'ın tutarını boş bırakıyor. R20 adet tarafında
bilerek sapıyor, para ve vergi tarafında emsale uyuyor.

### Ölçüm 6: ödeme durumu göstergeleri dört yerde

| Yer | Tür | Extra Kalıp'ta karşılığı |
|---|---|---|
| `YedekParcaSatisTab.jsx:259` | düğme ("Ödendi" / "Ödenmedi") | yok (Stok'ta Extra Kalıp satırı yok) |
| `MachineTimeline.jsx:283` | düğme ("Ödendi") | `:149` ve `:164`, `!psList[0].ucretsizMi` ile gizli |
| `MachineTimeline.jsx:289` | düğme ("Çek tahsil edildi") | `:339`, `!p.ucretsizMi` ile gizli |
| `SimpleDealers.jsx:657` | **rozet** ("Ödendi" / "Ödenmedi") | `:694`, `!p.ucretsizMi` ile gizli |

Dördüncüsü rozettir, düğme değil; R11'in ilk hâli yalnız düğme dediği için kapsam dışı kalıyordu.

### Etkilenen veri ve tuzaklar

- Bölüm `yedekParcaSatislar`, tablo `yedek_parca_satis` (`electron/db.cjs:201`). Yeni alan dört nokta +
  açık SELECT eşlemesi (C3).
- Kayıt kurucu `src/lib/yedekParcaSatis.js` `yedekParcaRec`; düzenleme kolu `yedekParcaGuncelle`
  (`{...eski, ...rec}` eski alanları silmez, temizleme buradan geçer, spec 0079 R5/1 dersi).
- Stok düşümü `yeniYedekParcaSatis` içinde; ücretsizde **değişmez** (R8).
- **Beş** giriş noktası var (R22): dördü aynı formu kullanıyor (Stok sekmesi, Servis ve Kargo Panosu'nun
  düğmesi, müşteri detayı, bayi detayı) ve kutu formda olduğu için dördünde birden çıkar; beşincisi
  `src/lib/evrakUygula.js:24`, formu kullanmaz ve işareti hiç yazmaz.
- `tahsilatHesapDurumu(SATIS_KAYNAK.YEDEK, ...)` bedel sıfırken bugün zaten "Kasaya girecek tutar yok"
  diyor; C1 uygulanınca hesap sorusu kendiliğinden kapanır (R7) ve C8 nedeni ücretsize özel hâle getirir.
- **Tuzak:** `yedekParcaGuncelle`'nin `{ ...eski, ...rec }` birleştirmesi işaretin kaldırılmasını sessizce
  yutar; tek kurucu zorunludur (R14/2, spec 0079 R5/1 dersi).
- **Tuzak:** formun ödeme bloğu, toplam kutusu ve tahsilat hesabı `toplam > 0` kapısının içinde, tevkifat
  alanı ve Fatura Tipi ise kapısız; kutunun yeri ve dört kapının yeni hâli R18'de yazılı.
- **Tuzak:** `bayiKaskad.js:19` `isYedekParcaBorcluMu`'yu bayi silme onayındaki açık alacak uyarısı için
  çağırıyor. C2 uygulanınca ücretsiz satış o uyarıdan da düşer; istenen davranış budur ama R5'in ilk
  listesinde yoktu (artık var).
- **Tuzak:** `kasa.js:198` ve `:228` `hesapKullanimi` hesabı `hesapId`'si olan yedek parça kayıtlarını
  sayıyor. Bayat `hesapId` ücretsiz kayıtta kalırsa hesabın silinmesi sebepsiz engellenir (R7/2).
- **Tuzak:** `Finance.jsx:462` kredi kartı dalı Extra Kalıp'ta `!p.ucretsizMi` süzgecini taşıyor, yedek parça
  dalı (`:466`) taşımıyor. C7 ve R7/2 `kartKomisyonu`'nu `null` yaptığı için dal çalışmaz; yine de iki dalın
  ayrıştığı bilinsin.
- Yazdırılan çıktılar **para taşımıyor**, ölçüldü: makina geçmişi raporu yedek parça **tahsislerini** tarih,
  ad, miktar ve bayi olarak yazıyor (`printTemplates.js:506-526`), kargo/sevk etiketinin İÇERİK satırı "parça ·
  adet" (`yedekParcaEtiketVerisi`, `:719`). Genel arama da tutar yazmıyor (`GlobalSearch.jsx:145`). Üçü de bu
  işte değişmez (R9).

---

## Kararlar (Takım Yöneticisi onayı: 2026-10-20)

Aşağıdaki üç kararın her biri **önerilen seçenekle** kapandı; metinler kararın gerekçesini ve
reddedilen seçeneğin maliyetini kalıcı kayıt olarak taşır.

**Karar 1 (onaylandı: önerilen seçenek): işaret hangi alıcıda konabilir?**
Öneri: **her alıcıda** (müşteri, bayi, anlaşmasız dış firma); müşteri alıcıda garanti durumu yazılır ve
garanti yoksa uyarı çıkar, bayi/dış firma alıcıda uyarı çıkmaz.
*Neden:* garanti kapsamındaki parça bugün sıklıkla makinaya bakan bayiye gönderiliyor ve o satırda makina
belli değil (tahsis sonradan yapılıyor); yalnız müşteri alıcıya izin verilirse bayi hâlâ sıfır fiyat
kaçamağına mahkûm kalır ve ölçüm 1'deki hayalet borç bayi tarafında sürer.
*Alternatif:* yalnız alıcı müşteri ve garanti aktifken (servis emsalinin birebir kopyası). *Maliyeti:*
bayi üzerinden giden garanti parçası kaydedilemez.
*Bu önerinin maliyeti:* kullanıcı garanti dışı bir parçayı da ücretsiz işaretleyebilir. Uyarı ve her
ekranda görünen "garanti kapsamında (ücretsiz)" ibaresi dışında engel yoktur.

**Karar 2 (onaylandı: önerilen seçenek): toplu satışta işaretin kapsamı.**
Öneri: **form düzeyinde** (o kayıtta doğan bütün satırlar aynı işareti alır).
*Neden:* fatura tipi ve tevkifat da toplu satışta form düzeyindedir (spec 0079 R5); aynı sevkiyatın bir
satırı ücretli bir satırı ücretsiz olan hâl istisnadır ve iki kayıtla girilebilir.
*Alternatif:* satır başına kutu. *Maliyeti:* üç alanlı satır dörde çıkar, dar pencerede yerleşim bozulur ve
satır bazlı durum yönetimi gerekir.

**Karar 3 (onaylandı: önerilen seçenek): ücretsiz işaretliyken girilmiş fiyat ne olur?**
Öneri: **kayıtta saklanır**, ama hiçbir yerde tahsil edilmez ve gösterilmez; işaret kaldırılınca geri gelir.
*Neden:* Extra Kalıp'ta bugün tam olarak böyle (ölçüm 3: ücretsiz kalıbın `ucret` alanı dolu olabilir,
borca ve gelire girmez); yanlışlıkla işaretleyip geri alan kullanıcı fiyatı yeniden yazmak zorunda kalmaz.
*Alternatif:* işaretlenince fiyat sıfırlanır. *Maliyeti:* geri alma veri kaybıdır; ayrıca "bu parçanın liste
fiyatı neydi" sorusunun cevabı kaybolur.

---

## Acceptance Criteria

- **AC-1.** Yeni yedek parça satışı formunda "garanti içi, ücretsiz verildi" kutusu çizilir ve varsayılan
  olarak işaretsizdir.
- **AC-1/2.** Kutu **hiç fiyat girilmemiş formda da** çizilir (bugünkü ödeme bloğu `toplam > 0` kapısının
  içinde, kutu o kapının dışında; R18a).
- **AC-2.** Kutu alıcı türü seçicisinin **iki** değerinde (Bayi, Müşteri) ve bayi türünün
  "Diğer (anlaşmasız firma)" alt hâlinde çizilir. (Formda üç düğmeli bir seçici yok: seçici iki düğmedir,
  anlaşmasız dış firma bayi arama kutusunun ilk seçeneğidir.)
- **AC-3.** Garantisi bugünden ileride biten bir müşteri seçilince formda garanti durumu bitiş tarihiyle
  yazar.
- **AC-4.** Garantisi geçmişte bitmiş müşteri seçilip kutu işaretlenince uyarı çıkar; kayıt yine yapılır.
- **AC-5.** Garanti bitiş tarihi hiç girilmemiş müşteride de aynı uyarı çıkar.
- **AC-6.** Alıcı bayi seçiliyken kutu işaretlenince garanti uyarısı çıkmaz.
- **AC-7.** Kutu işaretliyken ödeme yöntemi, çek vadesi, kredi kartı taksiti ve tahsilat hesabı alanları
  çizilmez.
- **AC-7/2.** Kutu işaretliyken formun "Genel Toplam" kutusu da çizilmez (girilmiş fiyat saklanır ama
  gösterilmez, R12 ve R18b).
- **AC-8.** Kutu işaretliyken tevkifat kutusu çizilmez ve kayıtta tevkifat alanları bulunmaz.
- **AC-9.** Ücretsiz kaydedilen satışın bedeli, bedeli hesaplayan **bütün** okuma yollarında sıfırdır:
  ölçüm 2 tablosunun **her satırı** için ayrı ölçüm (bugün on üç satır; sabit bir sayıya değil tabloya atıf
  yapılır, çünkü revizyon 1'in "sekiz" sayısı eksikti).
- **AC-10.** Ücretsiz satış müşteriyi borçlu yapmaz: `customerHasAnyDebt` bu satış tek borç kaynağıyken
  `false` döner.
- **AC-11.** Ücretsiz satış Anasayfa'nın borçlu firmaları kutusunda görünmez.
- **AC-12.** Ücretsiz satış Müşteriler ekranının borçlu süzgecinde listeye gelmez ve satırı boyamaz.
- **AC-13.** Alıcı bayi olan ücretsiz satış bayi detayının borç toplamında ve Borçlu Bayi/Servis kutusunda
  görünmez.
- **AC-14.** Ücretsiz satış müşteri detayının kalan borcuna eklenmez.
- **AC-15.** Ücretsiz satış Finans'ın toplam alacağına girmez.
- **AC-16.** Ücretsiz satış aylık raporun alacağına ve alacak yaşlandırmasına girmez.
- **AC-17.** Ücretsiz satış aylık raporun yedek parça **para kovalarına** girmez (`yedekKargoTutar`,
  `yedekKargoKdv`, `yedekKargoMusteriTutar`, `yedekKargoBayiTutar`, `yedekKargoTeslimTutar`); **adet
  sayaçlarına girer** (`yedekKargoAdet`, `yedekKargoMiktar`, `yedekKargoTeslim`). Sekiz alanın her biri ayrı
  ölçülür (ölçüm 5 tablosunun ilk üç ve beşinci satırı).
- **AC-18.** Ücretsiz satış tahsilat listelerine ve kasa bakiyesine girmez; "ödendi" işaretlenirken
  tahsilat hesabı sorulmaz.
- **AC-19.** Ücretsiz satışta parça miktarı kadar stoktan düşer ve stok hareketi yazılır.
- **AC-20.** Stok yetersizken ücretsiz satışta da yalnız mevcut kadarı düşer, satış tam miktarla kaydedilir.
- **AC-21.** Alıcı müşteri olan ücretsiz satışta otomatik makina tahsisi aynen yapılır.
- **AC-22.** Ücretsiz satış Stok › Yedek Parça Satışı listesinde, makina geçmişinde ve bayi detayında
  "garanti kapsamında (ücretsiz)" yazar; o satırda tutar yazmaz.
- **AC-23.** Ücretsiz kayıtta ödeme durumu göstergeleri çizilmez: üç düğme (`YedekParcaSatisTab.jsx:259`,
  `MachineTimeline.jsx:283`, `:289`) ve **bir rozet** (`SimpleDealers.jsx:657`); dördü ayrı ölçülür
  (ölçüm 6 tablosu).
- **AC-24.** Servis ve Kargo Panosu'nun kargo **detay penceresi** ücretsiz partide iki yerde de ibareyi
  yazar: "Genel Toplam" (`KargoPanosu.jsx:168`) ve kalem satırı (`:179`).
- **AC-24/2.** Kargo **kartı** değişmez: ücretsiz partide de bugünkü içeriği (iki rozet, teslim durumu, parça
  adı ve adet) çizer, tutar ve ücretsiz rozeti yoktur (R21, X7). Pano akışı (sürükleme, durum değiştirme,
  arşivleme, kargo/sevk etiketi) ücretsiz partide de aynen çalışır.
- **AC-25.** Çok satırlı ekleme kipinde işaret o kayıtta doğan bütün satırlara aynı yazılır.
- **AC-26.** Düzenlemede işaret kaldırılınca saklı birim fiyat geri gelir ve kayıt yeniden borç üretir.
- **AC-26/2.** İşaret kaldırılan kayıtta alan **bulunmaz** (`false` da değil): `yedekParcaGuncelle`'nin
  `{ ...eski, ...rec }` birleştirmesi eski `true`'yu korumaz (R14/2).
- **AC-27.** İşaret alanı hiç olmayan eski kayıtların bedeli, borcu, geliri ve ekran metni spec öncesiyle
  birebir aynıdır; ölçüm **altın fikstürle** yapılır: `tests/fixtures/0095-ucretsizsiz-once.json`, spec öncesi
  kodla `YAZ_0095=1` ile üretilir ve `yedekParcaBedeli`, `isYedekParcaBorcluMu`, `satisTahsilatKalemleri`
  çıktılarını, `hesaplaAylikRapor`'un yedek parça alanlarını ve Finans'ın alacak ile ciro kovalarını taşır.
  Emsal: `0079-tevkifatsiz-once.json`, `0092-havuz-once.json`.
- **AC-28.** Ücretsiz satışta tahsil edilecek KDV sıfırdır; TL, USD ve EUR kayıtlarının üçünde de, bilinmeyen
  para birimi taşıyan kayıtta da (bugünkü TL kovası kuralı korunur).
- **AC-29.** Dışa aktarma satırında yeni "Ücretsiz mi?" sütunu Evet/Hayır yazar ve yeri "Ürün Bedeli
  (Komisyon Hariç)"in hemen ardıdır (Extra Kalıp'taki yerinin aynısı).
- **AC-29/2.** Ücretsiz satırda "Birim Fiyat" hücresi **ham saklı fiyatı** gösterir; "Toplam", "Ürün Bedeli
  (Komisyon Hariç)", "Ödendi", "Ödeme Yöntemi" ve iki tevkifat hücresi **boştur** (sıfır değil, Extra
  Kalıp'ın `SettingsExport.jsx:284` ve `:289` emsali).
- **AC-30.** Veritabanı gidiş dönüşünde işaret korunur; işaret kapalıyken alan okunan gövdede **bulunmaz**
  (`undefined`, `false` değil). `panoGizli` ve `fabrikaTeslim` roundtrip testleri `false` bekliyor, bu alan
  beklemez; ayrım `tevkifatOku` emsalindendir (C3).
- **AC-31.** Yeni eylem izni, yeni veri bölümü ve yeni birleştirme kuralı eklenmediği kaynak taramasıyla
  gösterilir.
- **AC-32.** Kaynak taraması `src` ve `electron` altında `miktar` ile `birimFiyat`'ı çarpan ikinci bir ifadeyi
  yasaklar; gerekçeli istisna listesi tam yolludur ve eskiyince test kırılır (C1/2).
- **AC-33.** İşaret kapalı kayıtta, saklı gövde ile istemcinin geri gönderdiği gövde
  `serverAuth.stableStringify` ile birebir aynıdır (alan iki tarafta da yok); bölüm "değişmiş" görünmez (C3/2).
- **AC-34.** İşaretin yazımı tek kurucudan geçer: kaynak taraması `ucretsizMi` atamasını `ucretsizUygula`
  dışında yasaklar (R14/2, `satisTevkifatUygula` emsali). Tarama Extra Kalıp yollarını gerekçeli, tam yollu
  istisna listesiyle dışarıda bırakır: `kalipSatisi.js` (X3), `db.cjs`'in `part_sales` okuması ve yazması,
  `PartSaleForm.jsx`'in hesap sorgusu nesnesi (plan turu P3).
- **AC-35.** Ücretsiz işaretlenen kayıtta `yontem`, `vadeTarihi`, `tahsilEdildi`, `taksitSayisi`,
  `kartKomisyonu`, `hesapId`, `odendi` ve `tahsilatTarihi` temizlenir; tevkifat alanları kayıtta bulunmaz
  (R7/2). Sekiz alan ayrı ayrı ölçülür.
- **AC-36.** Ödenmiş ve hesaba bağlı bir satış ücretsize çevrilince o hesabın yürüyen bakiyesinden tutarı
  düşer ve `hesapKullanimi` o kaydı artık saymaz (R7/3).
- **AC-37.** Ücretsiz satış aylık raporun **fatura tipi kırılımına** (`yedekKargoFaturaKirilimi`) hiç girmez
  (R20).
- **AC-38.** Aylık raporun "YEDEK PARÇA ALAN FİRMALAR" tablosunda ücretsiz satırın Miktar hücresi doludur,
  Tutar ve KDV hücresi boştur, Durum hücresi "garanti kapsamında (ücretsiz)" yazar (R20).
- **AC-39.** Kutu işaretliyken formun "Fatura Tipi" alanı çizilmez ve kayıtta `faturaTipi` boş kalır (R18c).
- **AC-40.** Evrak'ın "CRM'e Kaydet" akışından doğan yedek parça satışı **ücretlidir** (alan kayıtta yok);
  `evrakUygula.js`'in işareti hiç yazmadığı kaynak taramasıyla gösterilir (R22).
- **AC-41.** Garanti karşılaştırması `yerelBugun()` ile yapılır: `TZ=Europe/Istanbul` altında yerel saat
  00:30 iken garantisi **dün** biten makinada uyarı **çıkar** (`today()` UTC'de dünü verdiği için garantiyi aktif
  sayar ve uyarı çıkmazdı); garantisi bugün biten makinada uyarı çıkmaz (iki yolda da aynı, ayırt edici değil).
  Revizyon 3'ün metni ayırt edici olmayan durumu sınıyordu (plan turu P2). `ServiceForm`'un
  `today()` satırı değişmediği taramayla gösterilir (R4/2, X9).
- **AC-42.** Görsel kanıt kaydı: `docs/evidence/kanit-eslemesi.json`'da 0095 raporuna bakan kayıtlar
  `beklenen: "degisti"` ve `onay: "Takım Yöneticisi · 2026-10-20 · spec 0095 R1"` taşır; eski raporlara bakan
  kayıtlar `ayni` kalır.
- **AC-43.** "garanti kapsamında (ücretsiz)" ibaresi tek yerden okunur; kaynak taraması düz metni yasaklar ve
  Extra Kalıp'ın üç eski yeri de aynı sabiti kullanır (R10/2).
- **AC-44.** Kalıcı alanın adı `ucretsizMi`'dir ve `part_sales` ile `yedek_parca_satis` tablolarında aynı adı
  taşır (R17).
- **AC-45.** Ücretsiz satış müşteri detayının "Yedek Parça" toplamına (`detailYedekParcaNet`) ve KDV'sine
  (`detailYedekParcaKdv`) sıfır katar.
- **AC-46.** Ücretsiz kayıtta `tahsilatHesapDurumu` `sor: false` döner ve nedeni "Garanti kapsamında verildi,
  kasaya girecek tutar yok." olur (C8).
- **AC-48.** Karışık partide ödeme düğmeleri yalnız ücretli satırlara `odendi` yazar; bütün satırları ücretsiz
  partide düğme çizilmez; kargo detayının Genel Toplamı ücretli satırların toplamıdır (R23).
- **AC-49.** Anasayfa "Son Satışlar" listesinde ücretsiz satış tutar yerine ibareyi yazar (ölçüm 2 satır 13).
- **AC-50.** Ücretsiz kayıtta, form durumunda "Kredi Kartı" + komisyon yansıtma ve bozuk tevkifat oranı kalmış
  olsa da kayıt yapılır ve saklı birim fiyat girilenle aynıdır (R7/4).
- **AC-47.** Ücretsiz satış bayi silme onayındaki açık alacak uyarısında (`bayiBagliSayilar.acikAlacak` ve
  `odenmemis`) görünmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Bedel ve borçluluk kuralı saf motorda tek yerde; ölçüm 2 tablosundaki **on iki** kopya tek okuma
      yoluna bağlandı ve kaynak taraması ikinci bir tanımı yasaklıyor (C1, C1/2, AC-32).
- [ ] Finans, aylık rapor ve ekranlar aynı kaynağı okuyor; ücretsiz kayıtta üçü de sıfır gösteriyor.
- [ ] Dört nokta kuralı uygulandı (`SCHEMA_SQL` + `applyColumnMigrations` + `INSERT` + açık `SELECT`
      eşlemesi, `tevkifatOku` emsali) ve `db-roundtrip` testine eklendi; işaret kapalıyken alanın gövdede
      bulunmadığı ayrıca ölçüldü (C3, AC-30).
- [ ] AC-27'nin altın fikstürü (`tests/fixtures/0095-ucretsizsiz-once.json`) spec öncesi kodla `YAZ_0095=1`
      ile üretildi ve kıyas testi yeşil.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; bu açıkça yazıldı.
- [ ] Soft-delete ve çöp kutusu simetrisi korundu (ücretsiz satış da çöpe gidip geri gelir, stok karşı
      hareketi aynen çalışır).
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı (kargo/sevk etiketi) değişmedi ya da
      değiştiyse TR/EN birlikte güncellendi.
- [ ] Çoklu para kuralına uyuluyor; bilinmeyen para birimi tanımlı biçimde ele alınıyor.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (ücretsiz işaretli form, garanti uyarısı hâli, Stok liste
      satırı, kargo **detay penceresi**, bayi detayı satırı, boş ve hata durumları dâhil). Yeni ekran adları
      `yedek-parca-formu-ucretsiz`, `yedek-parca-formu-ucretsiz-uyari`, `stok-yedek-parca-ucretsiz`,
      `kargo-detay-ucretsiz`.
- [ ] `docs/evidence/kanit-eslemesi.json` güncellendi: dört dosyanın (`YedekParcaSatisForm`,
      `YedekParcaSatisTab`, `MachineTimeline`, `SimpleDealers`) 0095 kayıtları `beklenen: "degisti"` +
      `onay: "Takım Yöneticisi · 2026-10-20 · spec 0095 R1"`; eski raporlara bakan kayıtlar `ayni` kaldı
      (AC-42).
- [ ] Etkilenen mevcut test dosyaları listelendi ve ters çevrilen kriterlere test yorumunda "spec 0095 ile"
      notu düşüldü: `tests/yedek-parca-satis.test.js`, `tests/ui/yedek-parca-satis.test.jsx`,
      `tests/ui/bayi-yedek-parca-borc.test.jsx`, `tests/ui/finance-yedek-parca.test.jsx`,
      `tests/yedek-parca-export.test.js`, `tests/ui/kargo-panosu.test.jsx`,
      `scripts/tests/db-roundtrip.cjs`, `tests/dashboard-stats.test.js` (plan turu P1).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin yedek parça bölümüne ücretsiz işareti, tek okuma yolu kuralı ve alan adının Extra
      Kalıp'la paylaşıldığı yazıldı.
- [ ] Sürüm notunda iki cümle var: ücretsize çevrilen eski bir ödemenin hesap bakiyesinden geriye dönük
      düşeceği (R7/3) ve ücretsiz kaydın aylık raporda adet olarak sayılıp para toplamına girmeyeceği (R20).
- [x] Takım Yöneticisi işi istedi ve üç kararı onayladı (2026-10-20). **Commit ve sürüm yayını
      yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-20)

Yirmi iki bulgunun tamamı Takım Yöneticisi tarafından onaylandı ve bu spec'e işlendi.

| # | Derece | Bulgu | Karar | İşlendiği yer |
|---|---|---|---|---|
| B-1 | Bloklayıcı | Ölçüm 2 sekiz yer sayıyor, bedel on iki yerde hesaplanıyor; eksikler `KargoPanosu:179`, `YedekParcaSatisTab:228`, `bayiKaskad:22`, `SettingsSahipsiz:48` | Tablo on iki satıra çıkar, AC sabite değil tabloya atıf yapar, yeni kopya taramayla yasaklanır | C1, C1/2, ölçüm 2, AC-9, AC-32 |
| B-2 | Bloklayıcı | C3'ün `panoGizli` emsali koşulsuz yazıyor ve C4 ile çelişiyor | Emsal `tevkifatOku` / `kisitOku` olur; karışık sürüm riski yazılır | C3, C3/2, AC-30, AC-33 |
| B-3 | Bloklayıcı | `{ ...eski, ...rec }` işaretin kaldırılmasını yutuyor, R14 çalışmıyor | Tek kurucu alanı her çağrıda siler, yalnız işaretliyken yazar | R14/2, AC-26/2, AC-34 |
| Ö-1 | Önemli | AC-24 kargo kartında olmayan bir tutarı varsayıyor | İbare yalnız detay penceresinde; kart değişmez | R21, X7, AC-24, AC-24/2 |
| Ö-2 | Önemli | R7 `odendi` ve `tahsilatTarihi`'ni temizlemiyor | Sekiz alanın tam listesi yazılır, ikisi eklenir | R7/2, AC-35 |
| Ö-3 | Önemli | R11 yalnız düğme diyor, bayi detayındaki rozet kapsam dışı | Düğme ve rozet; dört yer adıyla sayılır | R11, ölçüm 6, AC-23 |
| Ö-4 | Önemli | Aylık raporun dört sayacı ve detay tablosu tanımsız | Adet sayar, para ve vergi saymaz, detay satırı ibare yazar | R20, ölçüm 5, AC-17, AC-37, AC-38 |
| Ö-5 | Önemli | Formun `toplam > 0` kapıları, kutunun yeri ve Fatura Tipi kararsız | Kutu kapının dışında, dört kapı ücretsizi de süzer, Fatura Tipi çizilmez | R18, AC-1/2, AC-7/2, AC-39 |
| Ö-6 | Önemli | Giriş noktası beş, spec dört diyor (`evrakUygula.js:24`) | Beşinci yol yazılır, işareti hiç yazmadığı taramayla sabitlenir | R22, X8, AC-40 |
| Ö-7 | Önemli | AC-27'nin ölçüm yöntemi yok | Altın fikstür ve üretim bayrağı yazılır | AC-27, DoD |
| Ö-8 | Önemli | AC-29 "bedel hücresi sıfır" belirsiz, üç para hücresi var | Birim Fiyat ham, türetilmişler boş, sütun Extra Kalıp'ın yerinde | R19, AC-29, AC-29/2 |
| Ö-9 | Önemli | R4'ün "bugün"ü tanımsız, emsal UTC `today()` kullanıyor | `yerelBugun`; servisin satırı değişmez, ayrışma yazılır | R4/2, X9, AC-41 |
| Ö-10 | Önemli | Görsel kanıt kaydı ve onay dizesi DoD'de yok | Dört dosyanın kaydı, onay dizesi ve dört yeni ekran adı yazılır | AC-42, DoD |
| K-1 | Küçük | İki atıf kaymış (`satisTahsilat.js:17`, `ServiceForm.jsx:51`) | `:14` ve `:50` olarak düzeltildi | ölçüm 2, ölçüm 4 |
| K-2 | Küçük | AC-2 üç seçenek varsayıyor, formda iki düğme var | İki değer artı bayinin "Diğer" alt hâli | AC-2 |
| K-3 | Küçük | İbare üç yerde düz metin, tek sabiti yok | Tek tanım, üç eski yer de oradan okur, tarama yasaklar | R10/2, AC-43 |
| K-4 | Küçük | Alanın adı hiç yazılmamış | `ucretsizMi`, iki tabloda aynı ad; C5 yalnız servisin bayrağı içindir | R17, C5/2, AC-44 |
| K-5 | Küçük | R16 alacağı sıfırlayan işareti izinsiz bırakıyor | Kabul edilen sınır yazılır, yeni izin ve alan denetimi yok | R16/2 |
| K-6 | Küçük | Etkilenen mevcut testler sayılmamış | Yedi dosya listelendi, ters çevirmeye not kuralı yazıldı | DoD |
| K-7 | Küçük | Müşteri detayının yedek parça toplamı listede yok | R6'nın kapsamına girer, sıfır katar | AC-45 |
| K-8 | Küçük | "Kasaya girecek tutar yok" nedeni ücretsizde genel | Ücretsize özel neden, Extra Kalıp'ın dalı eklenir | C8, AC-46 |
| K-9 | Küçük | Geçmişe dönük bakiye değişimi yazılı değil | R7/3 ve sürüm notu cümlesi | R7/3, AC-36, DoD |

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

---

## Revizyonlar

- 1 · 2026-10-20 · İlk taslak. Ölçümler bu makinedeki kodla yapıldı (dal `feat/0094-harita-ilce`,
  `0ae3815` üstü). Üç karar onay bekliyor.
- 2 · 2026-10-20 · Takım Yöneticisi onayı: üç kararın tamamı önerilen seçenekle kapandı, durum
  Onaylandı'ya geçti. Requirements, Constraints ve Acceptance Criteria değişmedi.
- 3 · 2026-10-20 · QA boşluk turu: yirmi iki bulgunun tamamı onaylandı ve işlendi (üç bloklayıcı, on önemli,
  dokuz küçük). Üç bloklayıcı: ölçüm 2'de dört eksik bedel kopyası bulundu ve tablo on iki satıra çıktı
  (C1, C1/2, AC-9, AC-32); C3'ün gösterdiği `panoGizli` emsali kendi C4'üyle çelişiyordu, doğru emsal
  `tevkifatOku` oldu (C3, C3/2, AC-30, AC-33); `{ ...eski, ...rec }` yüzünden işaretin kaldırılamadığı
  ölçüldü ve tek kurucu zorunlu kılındı (R14/2, AC-26/2, AC-34). Yeni maddeler R17–R22, C8, X7–X9,
  ölçüm 5 ve ölçüm 6, AC-32–AC-47. Düzeltilen atıflar: `satisTahsilat.js:14` (eskiden `:17`),
  `ServiceForm.jsx:50` (eskiden `:51`). Bütün kararlar Karar kaydı tablosunda.
- 4 · 2026-10-20 · Plan turu (`specs/0095-uygulama-plani.md`), Takım Yöneticisi bütün maddeleri onayladı. P1: bedelin
  on üçüncü kopyası (`dashboardStats.js:45`, Anasayfa Son Satışlar) ölçüm 2'ye girdi, sayılar güncellendi, AC-49.
  P2: AC-41'in yönü düzeltildi (ayırt edici durum dün biten garanti). P3: AC-34'ün taramasına Extra Kalıp istisnaları.
  P4: C1/2'nin taramasına teklif/fatura ve form satırı istisnaları. K1/K2: R7/4, AC-50. K3: karışık parti R23, AC-48.
  K4: R18c'ye fatura tipinin geri gelmediği notu. K5: R4/3. K6: R20'ye raporun servis "Ücretsiz" metninin değişmediği notu (uygulamada atıf düzeltildi).
  K7: R24.
