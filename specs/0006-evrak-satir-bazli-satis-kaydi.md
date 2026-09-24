# 0006 — Evrak Satır Bazlı Satış Kaydı

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-24, uygulama planı `specs/0006-uygulama-plani.md` onayıyla, E16) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Evrak Yönetimi (teklif kaydetme akışı), Extra Kalıp satışları, yedek parça (kargo) satışları, müşteri/makina kaydı, parça stoğu, Bayiler |
| **Bağımlı spec'ler** | yok |
| **Revizyon** | R1 (2026-09-24): onay öncesi QA boşluk analizi; 20 açık nokta karara bağlandı — Context yanlış satır yapısına bakıyordu (teklif satırı `subItems` taşır, `urunTip` faturaya aittir), üretim alt kalem bazına çevrildi, makina satırındaki parça ve bant kalemleri tanımlandı, sunucu bölüm-sekme eşlemesi ve ekleme izinleri eklendi, kısmi kayıt tek yönlü bayrak yerine kimlik listesine bağlandı, iskonto payı birim fiyata yansıtıldı, belgenin bayi alıcısı için yeni kalıcı alanlar yazıldı; R1/R3/R4/R5/R8/R9/R10/R11/R12/R14/R16/R18 güncellendi, R20 eklendi, C8/X6/X7 ve Context genişletildi, AC-13 düzeltildi, AC-31…AC-44 eklendi. Spec henüz "Taslak" olduğu için SCORECARD'ın revizyon sayacı işlemez (o sayaç onaydan sonrasını ölçer). R2 (2026-09-24, plan turu E1–E16, onay öncesi): arayüzün her satıra tek ürün koyduğu görüldü; makinayla verilen kalıp ayrımı açık bir satır seçimine bağlandı (R3/R4), makina formu her zaman açılır (R9), belgenin üçüncü kalıcı alanı nihai müşteri (R12/R13), bayi kimliği yeniden eşlenmez (R12), `customers` bölümüne de "evrak" (C8), iskonto artığı ve makina bedeli kuralı (R11), belirsiz kalem tanımı (R18), birden çok makina ve yarıda kalan form (R21/R22) eklendi. |

---

## Intent

Fabrika bir teklifi onayladığında o belgenin içindeki her kalem CRM'de karşılığını bulmuyor.
Makina satıldığında makina kaydı açılıyor ama aynı belgedeki yedek parçalar hiçbir yere
düşmüyor; yedek parça Evrak'tan kaydedildiğinde ise uygulamanın gerçek yedek parça satışı
değil, hiçbir ekranın doğru saymadığı ayrı bir kayıt doğuyor. Bayi aracılığıyla yapılan
satışlarda ise bayinin kim olduğu hiç kaydedilmiyor. Sonuç, Evrak ile CRM arasında sessiz bir
sızıntı: belge doğru, kayıt eksik, ciro yanlış.

Başarı şu demek: onaylanan bir belgenin **her satırı** kendi türüne göre doğru kaydı üretiyor;
makinayla birlikte verilen kalıp Extra Kalıp sayılmıyor, ayrıca satılan kalıp Extra Kalıp
satışı oluyor, yedek parça uygulamanın gerçek yedek parça satışı olarak kaydedilip stoktan
düşüyor, ve belge bir bayiye kesildiyse bu bilgi kayıtta kalıyor. Kullanıcı, belgeyi
kaydettikten sonra hangi satırın ne ürettiğini tek bakışta görüyor.

---

## Requirements

- **R1.** Belge kaydedildiğinde kayıt üretimi **alt kalem bazında** yapılır. Belgeye tek bir tür atanıp
  diğer kalemlerin yok sayılması sona erer; her alt kalem kendi türüne göre işlenir. Teklif satırı bir kap
  gibidir: içinde makina, kalıp, parça ve bant alt kalemleri birlikte bulunabilir (`subItems[].type`),
  dolayısıyla "satırın türü" diye tek bir şey yoktur.
- **R2.** **Makina satırı** bugünkü davranışını korur: yeni müşteri kaydı açar veya mevcut müşteriye makina
  ekler.
- **R3.** Kalıp satırı açık bir **rol** taşır: **"Makinayla verilir"** veya **"Extra Kalıp"** (satır
  verisinde `kalipRolu`, yeni sütun yok). "Makinayla verilir" kalıp müşterinin kalıp listesine girer ve **Extra
  Kalıp satışı üretmez.** Varsayılan: belgede makina alt kalemi varsa "makinayla", yoksa "Extra". Eski (gruplu)
  satırlarda kalıp aynı satırda makinayla birlikteyse rol zorunlu olarak "makinayla"dır. *(R2: bugünkü arayüzde
  her satır tek ürün taşıdığı ve makinanın kalıbı kendi satırında durduğu için "aynı satırda makina var mı"
  kuralı yeni belgelerde bütün kalıpları Extra Kalıp yapardı.)*
- **R4.** Rolü "Extra Kalıp" olan kalıp alt kalemi Extra Kalıp satışı üretir ve müşterinin kalıp listesine
  extra olarak eklenir. Ayrım satır sırasına bakmaz; satırlar yer değiştirdiğinde sonuç değişmez.
- **R5.** **Parça alt kalemi**, uygulamanın gerçek yedek parça (kargo) satışını üretir. Evrak artık
  `partSales` üzerinde ayrı bir yedek parça türü üretmez. Bu kural, parça alt kaleminin **makina seçili bir
  satırda** bulunduğu durumda da geçerlidir: makinayla birlikte verilen parça da satılmış ve stoktan çıkan
  gerçek bir parçadır. Kalıptaki ayrımın (R3) sebebi kalıbın müşterinin kalıp listesine girmesidir; parçada
  böyle bir liste yoktur. Özet, makina satırından gelen parça kayıtlarını ayrıca belirtir.
- **R6.** Yedek parça satırı, parça kataloğundan seçilmiş bir parçaya bağlı olmalıdır. Serbest metinle
  yazılmış satır için kayıt üretilmez; kullanıcıya hangi satırın neden atlandığı söylenir.
- **R7.** Evrak'tan üretilen yedek parça satışı, aynı satışın Stok ekranından girilen hâliyle **aynı**
  davranır: stoktan düşer, aynı alanları taşır, aynı yerlerde görünür.
- **R8.** **Ya hep ya hiç:** üretilecek kayıtların gerektirdiği izinlerden herhangi biri eksikse **hiçbir
  kayıt üretilmez**, hiçbir stok hareketi yazılmaz ve kullanıcıya hangi iznin eksik olduğu söylenir. Kural
  yalnız stok yetkisi için değil, üretilecek her kayıt türü için geçerlidir (yedek parça satışı, Extra Kalıp
  satışı, müşteri/makina kaydı). Kayıt üretilip stok düşümünün atlanması ve kısmen yazma **yasaktır**.
- **R9.** Kaydetme **tek bir düğmedir** ("CRM'e Kaydet"); belge türüne göre dallanan iki ayrı düğme sona
  erer. Karma bir belgede önce makina alt kalemi işlenir: müşteri formu ön doldurulmuş hâlde açılır,
  kullanıcı kaydedince kalan alt kalemler o müşteriye bağlı olarak otomatik üretilir ve özet gösterilir.
  **Makina alt kalemi için form her zaman açılır** (seri numarası ve stok seçimi orada yapılır, R2); belge
  zaten bir müşteriye bağlıysa makina dışı alt kalemler önce üretilir, form en sonda açılır. Makina alt kalemi
  olmayan belgede form hiç açılmaz.
- **R10.** Belge, **üretilmiş alt kalem kimliklerinin listesini** taşır. Bu liste yalnız büyür ve çakışma
  birleştirmesinde iki tarafın **birleşimi** alınır; ayrı bir "kısmen kaydedildi" bayrağı tutulmaz.
  Belgenin durumu bu listeden türetilir: liste boşsa kaydedilmemiş, bir kısmını kapsıyorsa **kısmen
  kaydedildi**, üretilebilir alt kalemlerin tamamını kapsıyorsa kaydedilmiş. Aynı belge yeniden
  kaydedildiğinde listedeki alt kalemler **ikinci kez üretilmez**, yalnız eksik kalanlar üretilir.
  Mükerrer koruması **alt kalem kimliğine** göredir (satır kimliğine değil), çünkü üretim alt kalem
  düzeyindedir. Üretilen yedek parça ve Extra Kalıp kaydı belge kimliğini ve alt kalem kimliğini taşır
  (`teklifId`, `teklifKalemId`); makina kaydı mevcut `fromTeklifId` bağını kullanır. "Üretilen kayıtlar"
  listesi bu bağlardan türetilir. Üretilmiş bir alt kalem belgeden sonradan silinirse üretilen kayıt **otomatik silinmez**;
  özet bunu uyarı olarak gösterir, silmeyi kullanıcı kendi ekranından yapar.
- **R11.** Belge iskontosu, alt kalem tutarlarına oranla dağıtılır; her kayıt kendi payı düşülmüş tutarla
  oluşur. Üretilen kayıtlar tek bir tutar değil **birim fiyat ve miktar** taşıdığı için iskonto payı
  **birim fiyata** yansıtılır (alt kalemin payı bölü miktarı). Dağıtımdan artan kuruş, tutarı en büyük alt
  kaleme yazılır; üretilen kayıtların toplamı belgenin iskontolu toplamına tam eşit kalır. Dağıtım fiyatı olan
  **bütün** alt kalemler üzerinden yapılır; kuruş artığı **miktarı 1 olan** en büyük tutarlı kaleme yazılır
  (yoksa kalan birkaç kuruş özette "yuvarlama farkı" olarak belirtilir). **Makina bedeli**, makina alt kaleminin
  iskontolu payı ile aynı müşteriye "makinayla verilir" rolündeki kalıpların payının toplamıdır (bu kalıplar
  ayrı kayıt üretmediği için tutarları makinaya katılır).
- **R12.** Belgenin alıcısı **bayi** de olabilir. Alıcı bayi olduğunda üretilen yedek parça satışı, alıcısı
  o bayi olan bir satış olarak kaydedilir. Bugün belgenin alıcısı yalnız müşteri olabildiği için bu, belgeye
  **üç yeni kalıcı alan** eklenmesi demektir (alıcı tipi, bayi kimliği ve R13'ün nihai müşterisi); üçü de dört
  nokta kuralına tabidir. Nihai müşteri çakışma birleştirmesinde müşteri kimliği olarak yeniden eşlenir; **bayi
  kimliği yeniden eşlenmez**, çünkü bayiler birleştirilmez (yedek parça satışındaki bayi kimliğiyle aynı kural). Alıcı bayi seçildiğinde belgenin
  firma bilgileri bayinin kayıtlı bilgileriyle doldurulur, alanlar elle düzenlenebilir kalır ve yazdırma
  şablonu değişmez.
- **R13.** Alıcısı bayi olan bir belgede kalıp veya makina satırı varsa, kullanıcı **nihai müşteriyi ayrıca
  seçebilir** ve seçim belgede saklanır (kısmen kaydedilmiş belge yeniden kaydedilince tekrar sorulmaz): belgenin muhatabı ile malın gideceği makina aynı olmak zorunda değildir. Nihai müşteri
  seçilmemişse kalıp ve makina satırları için kayıt üretilmez ve nedeni söylenir.
- **R14.** Bayi aracılığıyla yapılan satışta bayi, üretilen Extra Kalıp kaydının **satış yapan firması**
  olarak yazılır. Makina tarafında akış müşteri formunu ön doldurup kullanıcıya açtığı için (R9), bu ön
  doldurmaya **satış yapan firma alanı eklenir** ve bayinin adıyla dolu gelir; kullanıcı formda
  değiştirebilir. Bugün o alan ön doldurmada hiç yok, bayi bilgisi baştan kayboluyor.
- **R15.** Üretilen her kayıt kaynak belgeye bağlı kalır ve belge "kaydedildi" durumunu alır.
- **R16.** Kayıt üretimi bittiğinde kullanıcıya bir **özet** gösterilir: hangi alt kalem ne üretti, hangi
  alt kalem neden atlandı. Özet, işlem nereden tetiklenirse tetiklensin gösterilir; Evrak ekranı tek giriş
  noktası değildir, aynı işlem Anasayfa'daki teklif takip kartından da başlatılabiliyor. Özet kalıcı bir
  kayıt değildir, ancak belge satırında **"üretilen kayıtlar" listesi** R10'daki kimlik kümesinden her
  zaman görülebilir.
- **R17.** Evrak'tan üretilen yedek parça satışı **Servis ve Kargo Panosuna düşmez**; kullanıcı isterse
  Stok ekranından panoya gönderir.
- **R18.** Türü belirsiz alt kalemler ve **bant** alt kalemleri kayıt üretmez; özet bunu ayrıca belirtir.
  **Belirsiz** = türü makina, kalıp veya parça olmayan alt kalem ile modeli seçilmemiş makina alt kalemi (müşteri
  kaydı modelsiz açılmaz). Alt kalem türlerinde "diğer" diye bir değer yoktur; "diğer" yalnız belge düzeyindeki tür
  seçimidir.
- **R19.** Bir bayinin adı değiştirildiğinde, o bayiyi satış yapan firma olarak taşıyan Extra Kalıp
  satışları da yeni adla güncellenir.
- **R21.** Belgede birden çok makina alt kalemi varsa her "CRM'e Kaydet" **tek** makina işler; kalan makina
  kalemleri üretilmemiş kalır ve belge "kısmen kaydedildi" olur; kullanıcı tekrar kaydedince sıradaki makinanın
  formu açılır. Kalıp ve parçalar ilk makinanın müşterisine bağlanır.
- **R22.** Makina formu kaydedilmeden kapatılırsa bekleyen üretim iptal edilir. Belge müşteriye bağlı değilse
  makina dışı alt kalemler de üretilmez (bağlanacak müşteri yoktur); bağlıysa onlar formdan önce üretilmiş
  olduğundan belge "kısmen kaydedildi" kalır.
- **R20.** Üretilen kayıtların **para birimi belgenin para birimidir**; belge TL dışı bir para birimindeyse
  üretilen kaydın fatura tipi "Faturalı Yurtdışı", TL ise "Faturalı Yurtiçi" olur. Bu, bugünkü davranışın
  aynısıdır ve değiştirilmez.

---

## Constraints

### Uyulması zorunlu

- **C1.** Yeni bir satış kaydı türü icat edilmez. Extra Kalıp mevcut kalıp satışı kaydıdır, yedek parça
  mevcut yedek parça (kargo) satışı kaydıdır.
- **C2.** `partSales` üzerinde yedek parça türü **artık hiçbir formdan üretilmez.**
- **C3.** Evrak'tan üretilen kayıt, aynı kaydın elle açılan formundan çıkanla **aynı alanlara** sahip olur.
  İki yol ayrışamaz; ayrışırsa aynı satış iki ekranda farklı görünür.
- **C4.** Stok düşümü mevcut tek kaynaktan yapılır, kopyalanmaz.
- **C5.** Mükerrer koruması zorunludur: aynı belge iki kez kayıt üretemez (R10).
- **C6.** Kullanıcıya görünen tüm metinler Türkçedir.
- **C7.** **Kabul edilen sınır:** bugüne kadar Evrak'ın ürettiği eski yedek parça kayıtları otomatik olarak
  taşınmaz. Bu spec onları düzeltmez; oldukları yerde kalırlar ve Finans ile aylık rapor onları bugünkü gibi
  farklı sayar. Temizlik kullanıcının elinde, yeniden girip eskisini silmek suretiyle olur.
- **C8.** Yetki: mevcut Evrak eylem izinleri geçerlidir; üretilen her kayıt ayrıca kendi eylem iznini ister
  (R8). **Yeni bir izin boyutu tanımlanmaz ve mevcut denetimler gevşetilmez.** İki somut gereklilik vardır:
  (1) sunucudaki bölüm-sekme eşlemesine (`BOLUM_SEKMELERI`) `yedekParcaSatislar`, `partStock`, `partStockLog`
  ve `partSales` için **"evrak"** eklenmelidir; Extra Kalıp müşterinin kalıp listesini de güncellediği için
  **`customers` bölümüne de** "evrak" eklenir (R2), kayıt düzeyindeki `cust_add` denetimi aynen kalır. Makina
  kaydı müşteri formu Müşteriler sekmesinde açıldığı için o sekmeyi gerektirir; sekmesi olmayan kullanıcıda
  makina adımı eksik izin sayılır (R8), aksi hâlde yalnız Evrak sekmesi olan kullanıcıda her kayıt
  403 alır (bu sınıf hata bu projede servis kiosk kullanıcısında yaşandı); (2) ekleme eylem izinleri
  (yedek parça için `yedek_parca_add`, Extra Kalıp için `cust_kalip_add`) **aranmaya devam eder**; Evrak
  iznini yeterli sayan bir istisna yazılmaz, izin yoksa R8 gereği hiçbir kayıt üretilmez.
  **Kabul edilen sınır (uygulama triyajı, 24.09.2026):** bu mimaride düzenleme bölüm düzeyinde güvenilir; ekleme ve
  silme kayıt düzeyinde denetlenir. Bölümlere "evrak" eklenmesi, yalnız Evrak sekmesi olan kullanıcının bu beş
  bölümdeki **mevcut** kayıtları da düzenleyebilmesi demektir (satış bedeli, borç, ödendi işareti, stok miktarı).
  "Mevcut denetimler gevşetilmez" cümlesi ekleme/silme denetimleri içindir; düzenleme genişlemesi bilerek kabul
  edildi. Gerekirse Evrak yolundan gelen müşteri yazımını yalnız kalıp listesi alanlarıyla (`kaliplar`,
  `kalipSayisi`) sınırlayan bir alan denetimi ayrı iş olarak eklenebilir.

### KAPSAM DIŞI

- **X1.** Eski yedek parça kayıtlarının göçü ve geriye dönük Finans/rapor düzeltmesi — *neden:* kayıpsız
  göç mümkün değil, o kayıtlarda miktar tutara gömülü ve parça bağı yok. Tek kullanımlık bir göç için
  kalıcı kod borcu alınmaz (C7).
- **X2.** Yurt dışı faturanın satış kaydı üretmesi — *neden:* bugün de üretmiyor; fatura, satışın kendisi
  değil belgesidir.
- **X3.** Proformanın satış kaydı üretmesi — *neden:* proforma taahhüt değildir; kayıt onaylanan teklifden
  doğar.
- **X4.** Makinanın bayiye satılması, yani bayi stoğuna makina kaydı — *neden:* makina kaydı sahipliği
  temsil ediyor; bayi stoğu ayrı bir kavram ve kendi işi.
- **X5.** Bayi konsinye envanteri — *neden:* bağımsız ve daha büyük bir iş.
- **X6.** "Diğer" ve **bant** alt kalemlerinin kayda dönüşmesi — *neden:* ne olduğu belirsiz bir kalemden
  hangi kaydın üretileceği tanımlanamaz; bant ise bir aksesuar kalemidir ve uygulamada karşılığı olan bir
  satış kaydı yoktur. Kullanıcının özette uyarılması yeterlidir (R18).
- **X7.** Belge iskontosunun KDV matrahı üzerindeki etkisinin yeniden modellenmesi ve belgedeki KDV
  oranının üretilen kayda taşınması — *neden:* bu spec iskontoyu yalnız alt kalemlere dağıtır (R11); KDV
  kuralları değişmez. Üretilen kayıtlarda KDV alanı yoktur, KDV fatura tipi üzerinden hesaplanır (R20) ve
  bu bilinçlidir.
- **X8.** Servis kaydı üretimi — *neden:* servis Evrak'tan doğmuyor.

---

## Context

Kodda doğrulanmış mevcut durum:

- **Teklif satırının gerçek yapısı.** Bir teklif satırı `{rowId, pickTip, selectedModel, selectedKalip,
  selectedPart, subItems[]}` biçimindedir ve asıl ürün bilgisi **alt kalemlerdedir**: `subItems[].type` =
  `makina` / `kalip` / `parca` / `bant` (`Documents.jsx:112`, `:650-679`). Yani **tek bir satır aynı anda
  makina, kalıp ve parça taşıyabilir**; "satırın türü" diye tek bir şey yoktur. R1, R3, R4 ve R5 bu yapıya
  göre yazılmıştır. **Dikkat:** `urunTip` alanı teklifin değil **yurt dışı faturasının** satır yapısına
  aittir (`Documents.jsx:256-270`); ikisi karıştırılmamalıdır.
- **Belgeye tek tür atanıyor.** `effectiveTeklifTur` (`src/lib/utils.js:856`) bir belgeye tek bir tür veriyor
  ve öncelik sırası makina, parça, kalıp, diğer. Kaydetme düğmeleri de bu türe göre dallanıyor: "makina" ise
  müşteri formunu açan dönüştürme, "parca" veya "kalip" ise doğrudan kaydetme (`Documents.jsx:820-833`).
  Karma bir belgede makina varsa belge "makina" sayılıyor ve aynı belgedeki yedek parça kalemleri hiçbir
  kayda dönüşmüyor. R1'in çözdüğü kök sorun budur; R9 da düğme dallanmasını kaldırır.
- **Sunucu yetki katmanı Evrak'ı tanımıyor.** `serverAuth.cjs`'te `yedekParcaSatislar`, `partStock`,
  `partStockLog` ve `partSales` bölümlerinin `BOLUM_SEKMELERI` listelerinde `"evrak"` yok; ekleme izinleri de
  `yedek_parca_add` (stockActions) ve `cust_kalip_add` (customerActions). Yalnız Evrak sekmesi olan bir
  kullanıcı bugünkü hâliyle bu kayıtları yazamaz. C8 bunu bağlar.
- **Bugün ne üretiliyor.** `handleKaydetSatis` (`src/App.jsx:474-517`) yalnız iki kolu işliyor: parça kolu
  `partSales` içine `tur: "Parça"` yazıyor, kalıp kolu `tur: "Kalıp"` yazıp müşterinin `kaliplar` dizisine
  ekliyor. Makina ise ayrı akıştan (`handleDonusturTeklif`) müşteri formunu ön dolduruyor; o ön doldurmada
  **satış yapan firma alanı yok**, yani bayi bilgisi baştan kayboluyor.
- **Üretilen yedek parça kaydı hiçbir yere oturmuyor.** Finans yalnız `"Kalıp"` ve (artık üretilmeyen)
  `"YedekParca"` türlerini sayıyor (`Finance.jsx:118-119`), aylık rapor ise tür ayrımı yapmadan bütün
  `partSales` kayıtlarını Extra Kalıp sayıyor (`aylikRapor.js:60`, `:117-118`). Aynı satış Finans'ta ciroya
  girmiyor ama borçlu firma listesine giriyor; raporda ise kalıp satışı olarak görünüyor. Bu spec'in
  tetikleyicisi bu tutarsızlıktır.
- **Gerçek yedek parça satışı zaten tam bağlı.** `yedekParcaSatislar` kaydı stok düşümünü
  (`src/lib/yedekParcaStok.js`), makinaya tahsisi, kargo takibini, bayi veya müşteri alıcıyı, sunucu
  yetkisini, birleştirmeyi ve çöp kutusunu destekliyor; Finans, aylık rapor ve Analiz onu doğru sayıyor.
  R5'in "gerçek kayıt" dediği şey budur.
- **Parça bağı zorunlu.** Ortak kayıt yolu (`src/lib/yedekParcaSatis.js`, `yedekParcaRec`) parça seçilmeden
  kayıt üretmiyor. R6 bu kuralı Evrak tarafına taşıyor.
- **Belge bağı için yeni bir alan gerekecek.** Extra Kalıp kaydında belgeye bağlanacak alan var, ancak yedek
  parça satışı kaydında yok. R15'in belge bağını kurabilmesi için bu kayda bir belge alanı eklenmesi ve
  "bu teklif kullanıldı mı" kontrolünün o alanı da görmesi gerekir.
- **Evrak alıcısı yalnız müşteri.** Belgenin alıcı araması `customers` üzerinde çalışıyor
  (`Documents.jsx:387`); dosyanın tamamında bayi kavramı yok. R12 ve R13'ün en büyük parçası bu.
- **Bayi adı kaskadı var ama eksik.** Bayi adı değişince `services.islemFirma`, `customers.satisYapan` ve
  `prevOwners[].satisYapan` güncelleniyor (`SimpleDealers.jsx:197-233`), ancak Extra Kalıp satışındaki satış
  yapan firma alanı bu listede yok. R19 bu boşluğu kapatır.

Bilinen tuzaklar:

- **Kalıcı alan kuralı.** Yedek parça kaydına eklenecek belge alanı bu projede dört yere birden eklenmezse
  değer sessizce kaybolur; ayrıca birleştirme haritasında belge kimliğinin yeniden eşlenmesi gerekir.
- **Mükerrer üretim ve tek yönlü bayrak.** Belgenin "satış tamamlandı" işareti (`satisTamam`) bugün tek
  yönlü bir boolean: hem çakışma birleştirmesinde hem yüklemede "yereldeki true, sunucunun false'unu
  ezmesin" kuralıyla korunuyor (`App.jsx:239`, `:958`). Üçüncü bir durum bu mantığa oturmaz ve LAN'da
  kaybolur; R10 bu yüzden bayrak yerine **yalnız büyüyen, birleşimi alınan bir kimlik listesi** kullanır.
- **Kuruş artığı.** İskonto dağıtımında (R11) toplamın belgeye eşit kalması, artan kuruşun tanımlı bir
  satıra yazılmasına bağlıdır.
- **Yetki duvarı.** Evrak yetkisi olup stok yetkisi olmayan kullanıcı gerçek bir senaryodur; R8 bu durumda
  sessizce yarım iş yapılmasını yasaklar.

---

## Acceptance Criteria

- **AC-1.** Bir makina satırı ve bir yedek parça satırı içeren belge kaydedildiğinde hem makina kaydı hem
  yedek parça satışı oluşur; hiçbir satır sessizce atlanmaz.
- **AC-2.** Makina satırının altında yer alan bir kalıp, müşterinin kalıp listesine girer ve Extra Kalıp
  satışı olarak kaydedilmez.
- **AC-3.** Kendi satırında yer alan bir kalıp Extra Kalıp satışı olarak kaydedilir ve müşterinin kalıp
  listesinde extra olarak görünür.
- **AC-4.** Aynı belgede hem makina altında hem ayrı satırda kalıp varsa, yalnız ayrı satırdaki Extra Kalıp
  satışı üretilir; ikisi karışmaz.
- **AC-5.** Katalogdan seçilmiş bir parça satırı gerçek yedek parça satışı üretir ve bu satış Stok
  ekranındaki listede görünür.
- **AC-6.** Üretilen yedek parça satışı, elle girilen bir yedek parça satışıyla aynı alanları taşır (alıcı,
  parça, miktar, birim fiyat, para birimi, fatura tipi, tarih).
- **AC-7.** Üretilen yedek parça satışı kadar parça stoktan düşer ve stok hareketi kaydedilir.
- **AC-8.** Serbest metinle yazılmış, katalogda karşılığı olmayan parça satırı için kayıt üretilmez ve
  kullanıcıya o satırın adı ile atlanma nedeni gösterilir.
- **AC-9.** Stok yazma yetkisi olmayan bir kullanıcı parça satırı içeren bir belgeyi kaydetmeye
  çalıştığında hiçbir kayıt üretilmez, stok değişmez ve nedeni bildirilir.
- **AC-10.** Karma belgede müşteri kaydı oluşturulduktan sonra kalan satırlar aynı müşteriye bağlanır.
- **AC-11.** Kullanıcı makina formunu yarıda bırakırsa belge "kısmen kaydedildi" olarak görünür.
- **AC-12.** Kısmen kaydedilmiş bir belge yeniden kaydedildiğinde, daha önce üretilmiş satırlar ikinci kez
  üretilmez; yalnız eksik kalanlar oluşur.
- **AC-13.** İskontosu 10.000 TL olan ve alt kalem toplamları 60.000 ile 40.000 TL olan bir TL belgede
  (tutarlar KDV hariç) üretilen kayıtların tutarları 54.000 ve 36.000 TL olur.
- **AC-14.** İskonto dağıtımında kuruş artığı tutarı en büyük satıra yazılır ve üretilen kayıtların toplamı
  belgenin iskontolu toplamına tam eşit olur.
- **AC-15.** Alıcısı bayi seçilen bir belgedeki parça satırı, alıcısı o bayi olan bir yedek parça satışı
  üretir.
- **AC-16.** Alıcısı bayi olan bir belgede kalıp satırı varsa ve nihai müşteri seçilmemişse kalıp için kayıt
  üretilmez; kullanıcıya nedeni söylenir.
- **AC-17.** Nihai müşteri seçilen bir belgede kalıp satırı o müşteriye Extra Kalıp satışı olarak kaydedilir
  ve satış yapan firma olarak belgenin bayisi yazılır.
- **AC-18.** Üretilen kayıtlar kaynak belgeye bağlanır ve belge listesinde "kaydedildi" durumu görünür.
- **AC-19.** Kayıt üretimi bittiğinde gösterilen özet, üretilen her kaydın türünü ve atlanan her satırın
  nedenini listeler.
- **AC-20.** Evrak'tan üretilen yedek parça satışı Servis ve Kargo Panosunda görünmez.
- **AC-21.** Türü belirsiz bir satır içeren belgede özet, o satırın kayda dönüşmediğini belirtir.
- **AC-22.** Bir bayinin adı değiştirildiğinde, o bayiyi satış yapan firma olarak taşıyan Extra Kalıp
  satışları yeni adla görünür ve bayinin açık alacağı bölünmez.
- **AC-23.** Evrak, hiçbir durumda `partSales` üzerinde yedek parça türünde kayıt üretmez.
- **AC-24.** Evrak'tan üretilen bir yedek parça satışı Finans cirosunda ve aylık raporda aynı tutarla
  görünür; iki ekran aynı satış için farklı rakam vermez.
- **AC-25.** Evrak'tan üretilen bir Extra Kalıp satışı Finans, aylık rapor ve Analiz sekmesinde elle girilen
  bir Extra Kalıp satışıyla aynı şekilde sayılır.
- **AC-26.** Yalnız "diğer" satırlardan oluşan bir belge kaydedildiğinde hiçbir kayıt üretilmez ve kullanıcı
  bunu özetten öğrenir.
- **AC-27.** Hiç satırı olmayan bir belge kaydedilmeye çalışıldığında hata verilmez, kullanıcıya kaydedilecek
  satır bulunmadığı söylenir.
- **AC-28.** Bir belgeden üretilmiş yedek parça satışı sonradan silindiğinde stok geri döner; Evrak'tan
  üretilmiş olması bu davranışı değiştirmez.
- **AC-29.** Müşterisi silinen bir müşteri silme kaskadında, Evrak'tan üretilmiş kayıtlar da diğerleriyle
  aynı şekilde işlem görür.
- **AC-30.** Aynı belgeden iki kez kayıt üretilmeye çalışıldığında stok ikinci kez düşmez.
- **AC-31.** Makina modeli seçili bir satırda yer alan parça alt kalemi de gerçek yedek parça satışı üretir
  ve stoktan düşer; özet bu kaydın makina satırından geldiğini belirtir.
- **AC-32.** Bant alt kalemi hiçbir kayıt üretmez ve özet bunu belirtir.
- **AC-33.** Yalnız Evrak sekmesi olan bir kullanıcı, gereken eylem izinlerine sahipse belgeyi kaydedebilir
  ve üretilen kayıtlar sunucuda reddedilmez.
- **AC-34.** Üretilecek kayıtların gerektirdiği izinlerden biri eksik olduğunda hiçbir kayıt üretilmez,
  hiçbir stok hareketi yazılmaz ve kullanıcıya eksik izin bildirilir.
- **AC-35.** Belge, üretilmiş alt kalem kimliklerini listesinde taşır; iki istemci aynı belgenin farklı
  kalemlerini üretirse çakışma birleştirmesinden sonra liste ikisinin birleşimidir ve hiçbir kalem ikinci
  kez üretilmez.
- **AC-36.** Üretilmiş bir alt kalem belgeden silindiğinde üretilen kayıt silinmez; özet bunu uyarı olarak
  gösterir.
- **AC-37.** Miktarı 2 olan ve birim fiyatı 30.000 TL olan bir alt kaleme 6.000 TL iskonto payı düştüğünde
  üretilen kaydın birim fiyatı 27.000 TL olur ve kayıt toplamı 54.000 TL kalır.
- **AC-38.** Alıcısı bayi seçilen bir belge kaydedilip yeniden açıldığında alıcı tipi ve bayi bilgisi
  korunur.
- **AC-39.** Alıcısı bayi olan bir belgenin yazdırma çıktısı bayinin firma bilgileriyle çıkar ve bu alanlar
  elle düzenlenebilir.
- **AC-40.** Bayi aracılığıyla yapılan bir makina satışında müşteri formu açıldığında satış yapan firma
  alanı bayinin adıyla dolu gelir ve kullanıcı değiştirebilir.
- **AC-41.** Belge kaydetme tek bir düğmeyle başlar; makina alt kalemi olan karma bir belgede önce müşteri
  formu açılır, form kaydedilince kalan alt kalemler üretilir ve özet gösterilir.
- **AC-42.** Aynı işlem Anasayfa'daki teklif takip kartından başlatıldığında da özet gösterilir.
- **AC-43.** Kaydedilmiş bir belgenin satırında üretilen kayıtların listesi görülebilir.
- **AC-44.** Para birimi USD olan bir belgeden üretilen kayıtların para birimi USD, fatura tipi "Faturalı
  Yurtdışı" olur.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Satır bazlı üretim kararı (hangi satır ne üretir) React'sız **saf bir fonksiyonda**; arayüz yalnız
      sonucu uygular ve özeti gösterir.
- [ ] Yedek parça ve Extra Kalıp kayıtları **mevcut ortak yollardan** üretiliyor; Evrak için ikinci bir
      kayıt yolu yazılmadı (C3, C4). Bu, testle gösterildi.
- [ ] Belge bağı alanı **ve belgenin yeni alıcı alanları** (alıcı tipi, bayi kimliği) **dört nokta
      kuralıyla** eklendi (`SCHEMA_SQL` + `applyColumnMigrations` + `INSERT` + `SELECT`), `db-roundtrip`
      testine girdi ve birleştirme haritasında bayi kimliği yeniden eşleniyor.
- [ ] Sunucu bölüm-sekme eşlemesine `yedekParcaSatislar`, `partStock`, `partStockLog` ve `partSales` için
      `"evrak"` eklendi; yalnız Evrak sekmesi olan kullanıcının kaydının 403 almadığı uçtan uca testle
      gösterildi (C8, AC-33).
- [ ] Üretilmiş alt kalem kimlikleri listesi yalnız büyüyor ve çakışma birleştirmesinde birleşim alınıyor;
      tek yönlü `satisTamam` bayrağının yerini aldığı testle gösterildi (R10, AC-35).
- [ ] "Bu teklif kullanıldı mı" kontrolü yeni belge bağını da görüyor; kullanılmış bir teklif ikinci kez
      dönüştürülemiyor.
- [ ] Mükerrer koruması testle sabitlendi: aynı belge iki kez kaydedildiğinde ne kayıt ne stok hareketi
      ikilenmiyor (AC-12, AC-30).
- [ ] Stok yetkisi olmayan kullanıcıda hiçbir kısmi yazma olmadığı testle gösterildi (AC-9).
- [ ] Finans ile aylık raporun aynı satış için aynı rakamı verdiği çapraz testle gösterildi (AC-24).
- [ ] Kullanıcıya görünen tüm metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (`docs/evidence/0006-ac<n>.png`), özet ekranı ve atlanan
      satır durumu dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` satır bazlı üretim kuralıyla güncellendi; `partSales` yedek parça türünün artık
      üretilmediği yazıldı.
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
