# 0024 — Kasa, Banka Hesapları ve Ödemenin Kalemden Ayrılması

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-28, plan onayıyla; plan `specs/0024-uygulama-plani.md` Q1–Q10). A parçası uygulanıyor, B bekliyor (C11). |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler (ödeme, borç özeti, hatırlatıcı), Finans (müşteri tahsilatı), çalışan tanımı, yeni Kasa ekranı |
| **Bağımlı spec'ler** | 0001 (gider kaydı) · 0003 (ödeme hatırlatıcısı) · 0021 (taksit) · 0023 (mesai ve prim) |
| **Revizyon** | R1 (2026-09-28): onay öncesi QA boşluk analizi; 15 açık nokta karara bağlandı — 0001 X4'ün bu spec'e devrettiği toplu ödeme kararı cevaplandı (R2, X9), ödeme durumunun tek zinciri yazıldı (R3; taksit ve kalem ödeme hareketinden türer), mahsubun kendi kaydı olduğu ve kalan formülü tanımlandı (R10), ödeme üst sınırı kalana bağlandı (AC-7), para birimi sınırları ile kart hesabının borç yönü (C5), hesapsız ödemenin bakiyeye girmediği (R8), hesap kapatmanın kuralları (R16), silinen tedarikçi ve çalışanın hareketlerinin durduğu (C8), hesap seçmekle ekranı görmenin farklı yetkiler olduğu (C6), perde inikken tahsilat hesap alanının da gizlendiği (C7), göçün yalnız sunucu PC'sinde bir kez çalıştığı (R4) ve işin A ile B parçasına bölündüğü (C11) yazıldı; AC-28…AC-36 eklendi. R2 (2026-09-28, plan onayı): 0021'in taksit bayrağı doğruluk kaynağı olmaktan çıkar, taksidin ve kalemin ödeme durumu hareketten okuma anında türetilir (R3/Q1, Q2); göç tutarı motor gerektirdiği için göç hareketi "hedefi tam kapatır" işaretiyle yazılır ve göçten önce otomatik yedek alınır (R4/Q3, Q4); hızlı ödeme tutarı ve hesabı dolu bir pencereyle yapılır (R17/Q5); tahsilat hesap seçicisi müşteri detayındaki ödeme formundadır (C6/Q6); sunucu eşlemesi ve eylem kimlikleri yazıldı (C6/Q7); taksidin kısmi ödenmesi ve taksitli kalemde ödemenin taksite bağlanması (R18/Q8); Kasa üst sekmesinin görünürlüğü (C6/Q9); A parçasından sonraki ara hâl (C11/Q10). |

---

## Intent

Bugün uygulama "bu gider ödendi mi" sorusunu tek bir onay kutusuyla cevaplıyor. Gerçekte para bir yerden
çıkıyor: kasadan, banka hesabından ya da kredi kartından. Fabrika sahibi iki şeyi bilmek istiyor: kasada
ve hesapta ne kadar param var, ve kime ne kadar borçluyum. Bunların ikisi de bugün uygulamada yok; ödeme
kalemin bir alanı olduğu için ne hesap bakiyesi tutulabiliyor, ne bir ödemenin yarısı kaydedilebiliyor,
ne de bir tedarikçiyle karşılıklı hesap (ekstre) görülebiliyor. Çalışana verilen avans hiç girilemiyor,
girilirse gider gibi sayılıp maliyeti çift şişiriyor.

Başarı şu demek: kasa ve banka hesapları tanımlı, her ödeme bir hesaptan çıkmış bir hareket, bir borç
parça parça kapatılabiliyor, çalışan avansı verilip maaştan mahsup edilebiliyor, ve bir tedarikçi ya da
çalışan için "ne doğdu, ne ödendi, ne kaldı" tek ekranda okunabiliyor.

**Bu, sıradaki işlerin en büyüğü ve en risklisi.** Takım Yöneticisi isterse iki parçaya bölünebilir:
(A) hesaplar, ödeme kaydı ve kısmi ödeme, (B) avans, mahsup ve ekstre. Bölünürse A önce yapılır, çünkü B
onun ödeme kaydına dayanır.

---

## Requirements

- **R1.** Kasa ve banka hesapları tanımlanabilir: ad, tür (kasa / banka / kredi kartı), para birimi ve
  açılış bakiyesi.
- **R2.** Bir gider ödemesi artık kalemin bir alanı değil, **kendi kaydı olan bir hareket**: tarih, tutar,
  yöntem, çıktığı hesap ve neyi ödediği. **Bir ödeme hareketi tek bir hedefi kapatır** (bir gider kalemi,
  bir taksit ya da bir avans). Tek banka çıkışıyla üç faturayı kapatan kullanıcı üç ödeme kaydı girer;
  toplu ödeme ve bir ödemenin birden çok kaleme dağıtılması kapsam dışıdır (X9). Bu, 0001 X4'ün bu spec'e
  devrettiği kararın cevabıdır.
- **R3.** Bir kalem **parça parça** ödenebilir. Kalemin ödeme durumu ödemelerinden türetilir:
  ödenmedi / kısmen (ödenen ve kalan tutar) / ödendi.
  **Tek zincir:** ödeme hareketleri **tek gerçek kaynaktır**. Taksidin "ödendi" işareti bir ödeme hareketi
  üretir ve taksidin durumu o hareketten türetilir (ikinci bir bayrak saklanmaz); kalemin `odendi` ve
  `odemeTarihi` alanları da hareketlerden türetilip yazılır (0021'in seçtiği yönle aynı). Böylece ödeme
  durumu üç ayrı yerden türemez.
  **Okuma anında türetme (R2, Q1, Q2):** ödeme durumu kaleme ve taksit satırına **yazılmaz**; App hareketlerden bir kez
  türetir (`odemeleriUygula`) ve gider ekranları, borç özeti ve hatırlatıcı bu zenginleştirilmiş kalemleri okur.
  0021'in saklı taksit bayrağı ve kalemin saklı `odendi` / `odemeTarihi` alanları göçten sonra doğruluk kaynağı değildir
  (sütunlar uyumluluk için durur, yazılmaz). Sunucunun ödeme izni bu alanlardan değil, hareket bölümünün ekleme ve silme
  denetiminden gelir; 0001'in `odendi` alan denetimi ve 0021'in satır denetimi bu yüzden hareket denetimine geçer.
- **R4.** Mevcut veri kaybolmaz: bugünkü `odendi` ve `odemeTarihi` bilgisi, geçişte o kalemi tam kapatan
  bir ödeme hareketine dönüşür (ödeme yöntemi ve hesap boş olabilir, "hesap belirtilmemiş" sayılır).
  **Göç yalnız yerel veritabanı katmanında, sunucu PC'sinde bir kez çalışır** (şema göçü deseni); istemcide
  hiç çalışmaz. LAN'da her istemci açılışta çalıştırırsa aynı kalem için iki hareket doğar; tekrarsızlık
  kalem başına üretilmiş hareketin izinden denetlenir (AC-22).
  **Göç hareketi (R2, Q3, Q4):** veritabanı katmanı KDV, stopaj ve ek ödemeleri hesaplayan motoru çağıramadığı için
  ödenmiş taksitsiz kalemin göç hareketi tutar taşımaz, **"hedefini tam kapatır"** işaretiyle yazılır (`tamKapatir`);
  ödenmiş taksit satırının hareketi satırın tutarıyla yazılır. Göç hareketi hesapsızdır (R8). Göç çalışmadan hemen önce
  veritabanının zaman damgalı bir kopyası otomatik alınır.
- **R17.** (R2, Q5) Hızlı ödeme bir pencereyle yapılır: tutar hedefin kalanıyla, hesap son kullanılan hesapla dolu gelir,
  tek "Kaydet" ile kapanır. Listedeki ödeme düğmesi, Anasayfa hatırlatma düğmesi, 0021'in ödeme planı penceresi ve kira
  anahtarları bu pencereyi açar. Hedefin kayıtlı ödemeleri aynı pencerede listelenir ve silinebilir (AC-6).
- **R18.** (R2, Q8) Taksitli ya da iki hedefli (kira) kalemde her ödeme bir **taksite** bağlanır; taksit kısmen ödenebilir,
  tamamı ödenince "ödendi" olur. Taksitsiz kalemde ödeme kaleme bağlanır. Taksit planı değişirken ödeme almış taksitler
  (kısmen de olsa) korunur.
- **R5.** 0021'in taksitleri bozulmaz: bir taksitin ödendi işaretlenmesi bir ödeme hareketi üretir ve
  taksit planı ile ödeme kayıtları birbirini tekrarlamaz.
- **R6.** Müşteri tahsilatı da bir hesaba girer: tahsilat kaydına hangi hesaba girdiği yazılabilir.
- **R7.** Hesap ekranı hareketleri ve **yürüyen bakiyeyi** gösterir: açılış bakiyesi, giren, çıkan, kalan.
- **R8.** **Hesap bakiyesi yalnız kaydı olan hareketleri sayar.** Servis, Extra Kalıp ve yedek parça
  bedellerinin "ödendi" işaretiyle kapatılması bir hesap hareketi üretmez (X3); ekran bunu açıkça yazar,
  böylece kullanıcı bakiyeyi banka bakiyesi sanmaz. **Göçten gelen "hesap belirtilmemiş" ödemeler de**
  (R4) hiçbir bakiyeye girmez ve aynı etikette ayrıca sayılır.
- **R9.** Çalışana **avans** verilebilir: bir hesaptan çıkan, o çalışandan alacağa geçen bir hareket.
- **R10.** Avans, sonraki bir maaş kaleminden **mahsup** edilebilir; mahsup edilen tutar kadar o kalemin
  kalanı azalır ve avans borcu kapanır. **Mahsup kendi kaydıdır** (avansı kalemle bağlayan bir hareket) ve
  **hesap hareketi değildir**, çünkü para hareket etmez. Kalemin ödenecek tutarı türetilmiş bir rakam olduğu
  için azaltılmaz; hesap şudur: **kalan = ödenecek tutar − ödemeler − mahsuplar**, ve "ödendi" bu kalan
  sıfırlanınca oluşur.
- **R11.** **Avans bir gider değildir.** Avans verildiğinde hiçbir gider kalemi doğmaz, hiçbir makina
  maliyeti değişmez; gider maaş kalemi doğduğunda doğar.
- **R12.** Tedarikçi **ekstresi**: seçilen tedarikçi için doğan borçlar, yapılan ödemeler ve kalan bakiye
  tarih sırasıyla listelenir.
- **R13.** Çalışan ekstresi: aynı yapı, artı verilen ve mahsup edilen avanslar.
- **R14.** "Kime ne kadar borçluyuz" özeti (0001'in borç özeti) ödenen kısmı düşerek **kalan** borcu
  gösterir; ödeme hatırlatıcısı (0003) da kalan tutarı ve kısmen ödenmiş kalemleri sayar.
- **R15.** Hesaplar arası **virman** (kasadan bankaya para aktarımı) kaydedilebilir; virman gider ya da
  gelir sayılmaz.
- **R16.** Bir hesap silinmek istendiğinde hareketi varsa silinmez; kapatılabilir (yeni harekete
  kapanmış hesap seçilemez, geçmişi durur). **Kapatma için bakiyenin sıfır olması gerekmez ve kapatma geri
  alınabilir.**

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır (0001 ile aynı); bakiye hareketlerden türetilir, ayrı bir
  alanda tutulmaz.
- **C2.** **Çift kayıt (muhasebe) sistemi kurulmaz.** Bu bir kasa ve borç takibidir, defter değildir.
- **C3.** **Çift sayım yasağı** (0001 C19 ve 0021 R7 ile aynı sınıf): bir para hareketi ya gideri doğurur
  ya bir borcu kapatır, ikisini birden yapmaz. Ödeme hareketi, avans ve virman gider üretmez.
- **C4.** Maliyet ve kârlılık hesabı (0002) ödeme tarafından **etkilenmez**; gider doğduğu ayda maliyete
  girer, ne zaman ödendiği maliyeti değiştirmez.
- **C5.** Bir hesabın para birimi değişmez ve bir hesap içinde kur çevrimi yapılmaz; farklı para birimi
  farklı hesaptır. Üç somut sonucu vardır: (1) bir harekete yalnız **aynı para birimindeki** hesaplar
  seçilebilir, TL dışı bir tahsilata TL hesabı seçilemez ve uygun hesap yoksa alan boş kalıp nedeni yazılır;
  (2) **virman yalnız aynı para birimi** hesapları arasında yapılır, farklı para birimi denenirse
  engellenir; (3) **kredi kartı hesabında bakiye borç yönlüdür** (negatif değere izin verilir) ve ekranda
  "kalan" değil **"borç"** etiketi kullanılır.
- **C6.** **Kasa ekranı hem gider hem finans yetkisi ister**, çünkü para girişini ve çıkışını birlikte
  gösterir. Yalnız birine sahip kullanıcı ekranı görmez; ekranın yarısını göstermek yanlış bakiye
  demektir. **Bu R6 ile çelişmez:** tahsilata hesap **seçmek** Finans ekranının parçasıdır ve finans yetkisi
  yeterlidir; hesap **ekranını görmek ve hareket listesini okumak** iki yetkiyi birlikte ister.
  **Uygulama (R2, Q6, Q7, Q9):** tahsilat, müşteri detayındaki ödeme formunda girilir (Finans ekranında tahsilat formu
  yoktur); hesap seçici orada, yalnız yayın perdesi kalkıkken ve kullanıcının Finans sekmesi varken çizilir. Kasa bir üst
  sekmedir, kendi sekme izni yoktur: görünürlüğü gider sekmesi + Finans sekmesi + perde kalkık kuralından türer. Sunucuda
  `kasaHesaplari` ve `hesapHareketleri` bölümleri `giderActions` grubunda, sekme eşlemesi yalnız `gider` ve gider bölümleri
  listesindedir; eylem kimlikleri hesap tanımı ve kapatma için `kasa_hesap`, ödeme hareketi için mevcut `gider_odeme`,
  virman için `virman`.
- **C7.** Gider modülünün yayın perdesi (0008) inikken kasa da kullanıcıya kapalıdır. **Tahsilattaki hesap
  alanı da gizlenir**, yoksa kullanıcı göremediği bir hesaba veri yazar.
- **C8.** Silme yumuşaktır (çöp kutusu) ve mevcut kaskad kurallarına uyar: bir tedarikçi ya da çalışan
  silinirken hareketleri **silinmez**: ekstrede "silinmiş taraf" olarak görünürler ve bakiyeleri durur.
  Kalan borcu varsa silme onayında uyarı çıkar (0001'in bayi silme kaskadındaki açık alacak uyarısının
  aynısı); **avans borcu açık olan çalışanda** uyarı daha güçlü yazılır, çünkü orada fabrikanın alacağı
  vardır.
- **C9.** Kullanıcıya görünen metinler Türkçedir.
- **C10.** Yeni kalıcı alanlar ve listeler dört (liste ise beş) nokta kuralına uyar.
- **C11.** **İş iki parçaya bölünür ve sırası sabittir.** **A parçası:** hesaplar, ödeme kaydı, kısmi ödeme,
  borç özeti, hatırlatıcı, virman, göç ve yetki (AC-1…AC-12 ve AC-18…AC-27). **B parçası:** avans, mahsup ve
  ekstre (AC-13…AC-17). A önce yapılır, B onun ödeme kaydına dayanır; her parça kendi PR'ı ve kendi
  kanıtıyla gelir ve spec ikisi bitmeden `done`'a taşınmaz. Tek parça hâlinde bu iş gözden geçirilemez bir
  değişiklik üretir (16 gereksinim, 27 kriter).
  **Ara hâl (R2, Q10):** A kendi başına kullanılabilir olarak teslim edilir (hesap, ödeme, virman, göç); spec `done`'a
  taşınmaz, README'de "A tamamlandı, B bekliyor" yazar.

### KAPSAM DIŞI

- **X1.** Banka entegrasyonu, hesap hareketi içe aktarma, mutabakat — *neden:* elle giriş modeliyle
  başlanıyor; entegrasyon ayrı ve büyük bir iştir.
- **X2.** Çift kayıt defteri, hesap planı, mizan, bilanço — *neden:* C2; kullanıcı mali müşavirle çalışıyor.
- **X3.** Servis, Extra Kalıp ve yedek parça bedellerinin "ödendi" işaretinin hesap hareketine
  dönüştürülmesi — *neden:* bu dört bölümde ödeme bir tutar-tarih-yöntem üçlüsü olarak kaydedilmiyor, tek
  bir bayrak; hepsini harekete çevirmek bu işi iki katına çıkarır ve mevcut Finans ekranını baştan yazmayı
  gerektirir. Sonucu R8'de yazılı sınır. **Bedeli:** hesap bakiyesi gerçek banka bakiyesinden bu tahsilatlar
  kadar eksik kalır. Kullanıcı bunu yetersiz bulursa ayrı bir iş olarak açılır; önerim önce R8'in etiketli
  hâliyle kullanmak, çünkü asıl ihtiyaç "kime ne kadar borçluyum" tarafındadır.
- **X4.** Çek portföyü takibi (çek giriş-çıkış, ciro, karşılıksız) — *neden:* bugün çekin yalnız tahsil
  edilip edilmediği izleniyor; portföy ayrı bir kavramdır.
- **X5.** Nakit akış tahmini ve bütçe — *neden:* önce gerçekleşen hareketlerin doğru girilmesi gerekir.
- **X6.** Kredi kartı ekstresi eşleştirme ve kart borcunun dönem kapanışı — *neden:* 0021 taksitleri vade
  olarak zaten izliyor; ekstre eşleştirme X1 ile aynı sınıf.
- **X7.** Çoklu şube ya da çoklu firma kasası — *neden:* tek firma, tek fabrika.
- **X8.** Personel maaş bordrosu üretimi — *neden:* uygulama beyan ve bordro üretmez (0001 X3).
- **X9.** Toplu ödeme ve bir ödemenin birden çok kaleme dağıtılması — *neden:* 0001 X4 bu kararı bu spec'e
  devretmişti; cevap R2'de verildi. Dağıtım mantığı, 0001'in bilinçli olarak dışarıda tuttuğu cari hesabı
  arka kapıdan geri getirir ve işi ikiye katlar. Kullanıcı tek çıkışla birden çok fatura kapatıyorsa her
  fatura için bir ödeme kaydı girer.

---

## Context

- **Bugünkü gider ödeme modeli ikili ve kalemin içinde.** `giderler` tablosunda `odemeYontemi`,
  `sonOdemeTarihi`, `odendi`, `odemeTarihi` var; ödeme ayrı bir kayıt değil. 0001 bunu bilerek ikili
  bıraktı (X10), 0021 taksitle ilk istisnayı açtı, bu iş genelleştiriyor.
- **Müşteri tahsilatı ayrı bir tabloda ve kısmen hazır.** `payments` tablosu (`customer_id`, `tarih`,
  `tutar`, `currency`, `yontem`, `vadeTarihi`, `tahsilEdildi`, `taksitSayisi`, `kartKomisyonu`) gerçek bir
  ödeme kaydı; hesap bağı eklemek burada ucuzdur (R6). Buna karşılık servis, Extra Kalıp ve yedek parça
  satışlarında ödeme bir **bayrak** (`odendi` + `yontem`, çekte `tahsilEdildi`), ayrı kayıt yok. X3'ün
  sebebi bu asimetridir.
- **Kasa, banka hesabı ve avans kavramları kodda hiç yok.** Arama bunu doğruluyor: `krediKarti.js` yalnız
  banka komisyonu ve blokaj hesabı yapıyor, hesap bakiyesi tutmuyor. Yani bu iş sıfırdan bir bölüm ekler;
  mevcut bir yapıyı değiştirmekten çok, ona bağlanmaktan doğan risk taşır.
- **Borç özeti ve hatırlatıcı ödemeyi ikili varsayıyor.** `gider.js borcOzeti` ve
  `odemeHatirlatma.odemeHatirlatmalari` "ödenmiş kalemi hariç tut" mantığıyla çalışıyor. Kısmi ödeme
  gelince bu iki yerin **kalan tutarla** çalışması gerekir (R14); atlanırsa yarısı ödenmiş bir kalem
  hatırlatıcıda tam tutarıyla görünür ve kullanıcı iki kez öder.
- **Neden en sona bırakıldı.** İki sebep: (1) gider verisinin bir iki ay gerçek kullanımda girilmesi,
  hangi ödeme alışkanlığının gerçekten takip edildiğini gösterir; (2) 0021 (taksit) ve 0023 (mesai) bu işin
  üzerine bina edeceği ödeme ve personel modelini netleştirir. Bu iş onlardan önce yapılırsa ödeme kaydı
  iki kez tasarlanır.
- **Yetki.** Yeni eylem kimlikleri gider boyutuna (`giderActions`) eklenir; kasa ekranının kendisi C6
  gereği iki yetkiyi birden ister. Sunucu tarafında yeni bölümlerin `BOLUM_SEKMELERI` eşlemesi ve kayıt
  düzeyinde ekleme/silme denetimi gerekir, yoksa kısıtlı kullanıcı 403 alır ya da yazabilmemesi gereken
  yere yazar.
- **Göç riski.** R4 bir veri göçüdür: mevcut ödenmiş kalemler ödeme hareketine dönüşür. Göç bir kez
  çalışır ve geri alınamaz; kullanıcının verisi üzerinde denenmeden önce yedek alınması ve göçün
  tekrarlanabilirliğinin (aynı kalem iki ödeme üretmemesi) testle sabitlenmesi şarttır.

---

## Acceptance Criteria

- **AC-1.** Kasa hesabı açılış bakiyesiyle tanımlanır ve listede görünür.
- **AC-2.** Banka hesabı ve kredi kartı hesabı da tanımlanabilir; türleri ayırt edilir.
- **AC-3.** Bir gider kalemine, hesabı belirtilmiş bir ödeme kaydedilir; kalem "ödendi" olur.
- **AC-4.** Ödenecek tutarın bir kısmı ödendiğinde kalem "kısmen" olur; ödenen ve kalan tutar doğru yazar.
- **AC-5.** Kalan tutar da ödendiğinde kalem "ödendi" olur ve kalan sıfırlanır.
- **AC-6.** Ödeme silindiğinde kalem durumu geri döner (ödendi → kısmen ya da ödenmedi).
- **AC-7.** **Kalandan** fazla ödeme kaydedilemez ve neden söylenir; sınır ödenecek tutar eksi ödenen eksi
  mahsup edilen tutardır (R3, R10).
- **AC-8.** Ödeme yapılan hesabın bakiyesi ödeme tutarı kadar azalır.
- **AC-9.** Müşteri tahsilatına hesap seçildiğinde o hesabın bakiyesi tahsilat kadar artar.
- **AC-10.** Hesap ekranı hareketleri tarih sırasıyla ve yürüyen bakiyeyle gösterir.
- **AC-11.** Hesap ekranı, bakiyenin yalnız kaydı olan hareketleri içerdiğini yazar (R8).
- **AC-12.** Hesaplar arası virman iki hesabın bakiyesini karşılıklı değiştirir ve gider raporunda
  görünmez.
- **AC-13.** Çalışana avans verildiğinde hesap bakiyesi azalır, çalışanın avans borcu doğar, **hiçbir
  gider kalemi doğmaz**.
- **AC-14.** Avans bir maaş kaleminden mahsup edildiğinde o kalemin ödenecek tutarı azalır ve avans borcu
  kapanır.
- **AC-15.** Avans verilen ay ile mahsup edilen ay farklı olduğunda iki ayın gider toplamları değişmez
  (yalnız ödeme tarafı değişir).
- **AC-16.** Tedarikçi ekstresi doğan borç, yapılan ödeme ve kalan bakiyeyi doğru gösterir.
- **AC-17.** Çalışan ekstresi maaş, mesai ve prim (0023) ile avans hareketlerini birlikte gösterir.
- **AC-18.** Borç özeti kısmen ödenmiş kalemde **kalan** tutarı sayar.
- **AC-19.** Ödeme hatırlatıcısı kısmen ödenmiş kalemi kalan tutarıyla gösterir; tamamen ödenmiş kalemi
  göstermez.
- **AC-20.** 0021'in taksiti ödendi işaretlendiğinde bir ödeme hareketi doğar ve tutar iki kez sayılmaz.
- **AC-21.** Göç: eskiden "ödendi" işaretli bir kalem, göçten sonra tam kapatan bir ödeme hareketine
  sahiptir ve durumu "ödendi" kalır.
- **AC-22.** Göç iki kez çalıştığında aynı kalem için ikinci bir ödeme hareketi üretilmez.
- **AC-23.** Makina maliyeti ve kârlılık, ödeme kaydedilmesinden ve avanstan etkilenmez.
- **AC-24.** Hareketi olan hesap silinemez; kapatılan hesap yeni harekette seçilemez, geçmişinde görünür.
- **AC-25.** Yalnız gider yetkisi olan ya da yalnız finans yetkisi olan kullanıcı kasa ekranını görmez.
- **AC-26.** Yayın perdesi inikken kasa ekranı ve kasa verisi kullanıcıya görünmez.
- **AC-27.** Kısıtlı kullanıcı sunucudan kasa bölümlerine yetkisiz yazma yapamaz (403).
- **AC-28.** Tek bir ödeme hareketi yalnız bir hedefe bağlanır; iki gider kalemini birden kapatan bir ödeme
  kaydedilemez (R2, X9).
- **AC-29.** TL dışı bir müşteri tahsilatına TL hesabı seçilemez; uygun para biriminde hesap yoksa alan boş
  kalır ve nedeni yazılır (C5).
- **AC-30.** Farklı para birimindeki iki hesap arasında virman kaydedilemez (C5).
- **AC-31.** Kredi kartı hesabının bakiyesi borç olarak gösterilir ve etiketi "borç"tur (C5).
- **AC-32.** Hesabı belirtilmemiş bir ödeme hiçbir hesabın bakiyesini değiştirmez ve ekranda bu durum
  belirtilir (R8).
- **AC-33.** Kapatılmış bir hesap bakiyesi sıfır olmasa da kapatılabilir ve kapatma geri alınabilir (R16).
- **AC-34.** Avans borcu açık olan bir çalışan silinmek istendiğinde onayda bu borç uyarı olarak görünür;
  silme sonrası hareketler ekstrede "silinmiş taraf" olarak durur (C8).
- **AC-35.** Yayın perdesi inikken müşteri tahsilatındaki hesap alanı da gizlenir (C7).
- **AC-36.** Bir taksit ödendi işaretlendiğinde doğan ödeme hareketi tek gerçek kaynaktır; taksidin durumu
  ikinci bir bayrakta saklanmaz (R3).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap, ödeme, avans ve virman hesapları saf motorda (React'sız, testli), 0001 ve 0002 deseniyle.
- [ ] Göç testle kapsandı: bir kez çalışır, tekrarı ikinci kayıt üretmez (AC-21, AC-22); yalnız sunucu
      PC'sinin yerel veritabanı katmanında çalıştığı, istemcide çalışmadığı gösterildi (R4).
- [ ] Göç öncesi otomatik yedek alındı ya da kullanıcıya yedek alması gerektiği ekranda açıkça söylendi.
- [ ] İş A ve B parçası olarak iki PR hâlinde teslim edildi; A önce birleşti ve spec ikisi bitmeden
      `done`'a taşınmadı (C11).
- [ ] Kalıcı alanlar dört (liste ise beş) noktada eklendi; roundtrip ve temiz kurulum testleri kapsıyor.
- [ ] Sunucu yetki eşlemesi yapıldı ve `server-authz` ile uçtan uca testte sabitlendi (AC-27).
- [ ] Borç özeti ve ödeme hatırlatıcısı kalan tutarla çalışıyor (AC-18, AC-19).
- [ ] Çift sayım yasağı testle sabitlendi: ödeme, avans ve virman gider üretmiyor (C3, AC-13, AC-23).
- [ ] Görsel kanıt eklendi (`docs/evidence/0024-*.jpg`): hesap listesi, hareket ekranı, kısmen ödenmiş
      kalem, ekstre; aydınlık ve karanlık tema.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: ödeme modelinin ikiliden hareket kaydına geçişi, R8'in sınırı ve C6'nın
      çift yetki kuralı yazıldı.
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
