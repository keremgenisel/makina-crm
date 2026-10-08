# 0076 — Kısmen İndirilebilen Gider ve İndirilemeyen KDV (binek araç %70)

| | |
|---|---|
| **Durum** | Tamamlandı (commit `c9e95ea`, dal `feat/0076-kisitli-gider`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi formu ve motoru, tekrarlayan tanım, kova dağılımı, dönem raporu, **makina maliyeti**, Finans KDV karşılaştırması, 0047 raporu, Ayarlar › Gider Ayarları |
| **Bağımlı spec'ler** | 0001 (KDV, kova, "dört kova = genel toplam") · 0002 (makina maliyeti, maliyet notları) · 0072 (ortak payın aylara dağıtımı) · 0071 (KDV dâhil giriş) · 0075 (tevkifat; onay kutusu şekli) · 0047 (aylık gider ve kasa raporu) · 0059 (altın çıktılar, R39) · 0062 (liste alt toplamı) · 0067 (kutu sırası ve Electron yerleşim testi, R24) · 0026 (genel arama, R21) · 0022 (parti payları ortak kovadan) · 0011 (kanıt eşlemesi) |
| **Revizyon** | 2 · 2026-10-08 uygulama planı onayı (plan Q1–Q11 işlendi: R12, R15, R20, R24, R27, R37, R39, AC-36) |

---

## Intent

Fabrikanın binek araçlarına ait yakıt, bakım, onarım, sigorta gibi giderlerin kanunen **en fazla
%70'i** indirilebiliyor; kalan %30 kanunen kabul edilmeyen gider (KKEG). Aynı kısıtlama KDV'ye de
yansıyor: KDV'nin yalnız %70'i indirilebiliyor, %30'u indirilemiyor.

Bugün uygulama kalemin KDV'sinin **tamamını** indirilecek KDV sayıyor. 1.000 TL + %20 KDV'li bir
yakıt faturasında 200 TL indirilecek KDV yazıyor, oysa indirilebilen 140 TL. Sonuç: Finans'taki KDV
Karşılaştırması ödenecek KDV'yi **eksik gösteriyor** ve kullanıcı gerçekte daha fazla ödüyor.

İkinci ve daha sinsi sonuç: indirilemeyen 60 TL **geri gelmeyen gerçek paradır.** Uygulama maliyeti
KDV hariç tutardan hesaplıyor, çünkü KDV'nin devletten geri alındığını varsayıyor. Bu kalemde o
varsayım yanlış: harcanan 1.200 TL'nin 1.060 TL'si gerçek maliyettir, ama uygulama 1.000 TL
yüklüyor.

**Takım Yöneticisi kararı: maliyet tabanı düzeltilir.** Gerekçe TY'nin kendi cümlesi: *"makina
maliyetine girmeyen bir harcama olmaz."* Yani indirilemeyen KDV kalemin gider tutarına katılır ve
makina maliyetine girer.

Başarı şu demek: yakıt faturası olduğu gibi giriliyor, indirilecek KDV 140 TL olarak sayılıyor,
kalemin gider tutarı 1.060 TL oluyor ve bu rakam makina maliyetine yansıyor; KKEG tutarı da
muhasebeciye verilmek üzere raporda duruyor.

---

## Requirements

### A. Onay kutusu, oran ve kapsam

- **R1.** Gider kalemi formunda **"Gider kısıtlaması uygulanıyor (binek araç)"** onay kutusu bulunur;
  varsayılan **kapalı**. Kapalıyken kısıtlamayla ilgili hiçbir alan, satır ve rakam görünmez ve form
  bugünküyle birebir aynıdır (0075'in şekli).
- **R2.** Kutu açılınca **indirilebilir oran** alanı çıkar (yüzde, tam sayı, 0–100). Varsayılanı
  **Ayarlar › Giderler › Gider Ayarları**'ndaki orandan gelir (varsayılan **70**), kalemde
  düzeltilebilir. Bu, `stopajOrani`'nın bugünkü desenidir.
- **R3.** Oran **sabit %70 olarak koda gömülmez.** İki gerçek sebebi var: (a) 2020'de getirilmiş bir
  parametre, değişebilir; (b) depoya toplu alınan yakıt hem ticari hem binek araçta kullanılıyorsa
  faturanın yalnız bir kısmı kısıtlıdır ve kullanıcının kendi dağıtımına göre oran 70 değil, örneğin
  88 çıkar (GİB özelgesi tam bu durumu ele alıyor).
- **R4.** **Bu bir gider türü davranışı DEĞİLDİR, kalemin bayrağıdır.** Aynı "Yakıt" türü hem
  kamyonetin (%100) hem binek aracın (%70) yakıtını kapsar; kısıtlama türe değil araca bağlıdır.
  Türe bağlansa kullanıcı iki ayrı "Yakıt" türü açmak zorunda kalırdı.
- **R5.** Bayrak yalnız **normal davranışlı** kalemde açılabilir (`kisitliGiderMi(dav)` tek kapısı,
  `kdvliMi` / `tevkifatliMi` komşusu). Personel ve SGK'da KDV yok; **kira bedelinin** kısıtlaması
  oran değil **aylık tavandır** (ayrı mekanizma, X1).
- **R6.** Doğrulama: bayrak açıkken oran 0–100 aralığında tam sayı olmalıdır; dışındaki değer
  reddedilir ve nedeni yazılır. Bayrak kapanınca oran alanı temizlenir ve kayda yazılmaz.
  **Aralığın iki ucu serbesttir:** 0 gerçek bir değerdir (tamamen özel kullanımdaki araçta KDV'nin
  tamamı indirilemez, KKEG kalemin bütünüdür), 100 de kaydedilir ama **etkisi olmadığı için rozet
  ve kısıtlama özet satırları çizilmez** ve kalem bayraksıza birebir eşit davranır (etkisiz rozet
  gürültüdür). İki uç da kriterle sabitlenir (AC-39).
- **R7.** **KDV oranı sıfır olabilir** (0075'in tersine): KDV'si olmayan kısıtlı bir giderde bölünecek
  KDV yoktur ama KKEG matrahı yine anlamlıdır. Bayrak bu yüzden KDV şartı aramaz.
- **R8.** **Oran kalemde saklanır ve okuma anında kalemden çözülür; motor ayarları görmez.**
  `kalemKurus`, `kdvKurus` ve `kovaKurus` imzaları `(k, dav)`'dir ve `gider.js` `appSettings`'i
  hiçbir yerde almaz; bu saflık korunur (C1). Buradan üç kural çıkar:
  1. Bayrak açık ama saklanan oran boş ya da geçersizse motor **%100** sayar, yani kısıtlama yoktur
     ve bütün türev rakamlar bugünkü değerlerini verir (R13 ile aynı sonuç, sessiz yanlış rakam yok).
  2. Doğrulama bayrak açıkken geçerli oran olmadan kaydı reddeder (R6), yani bu durum yalnız
     dışarıdan gelen bozuk veride görülür.
  3. **Tanımda** oran boş olabilir ve "o ayın ayar oranı" demektir; `tekrarlayanUret` üretilen kaleme
     **somut** oran yazar (`t.indirilebilirOran ?? varsayilanIndirilebilirOran(giderAyarlari)`).
     Emsal 0071'in `t.kdvOrani ?? getKdvRateForDate(...)` ve kiranın `giderAyarlari.stopajOrani`
     çözümüdür; fonksiyon `giderAyarlari`'yı zaten parametre alıyor.
- **R9.** Varsayılan oranın **tek okuma yolu** saf `varsayilanIndirilebilirOran(giderAyarlari)`'dır:
  ayar yok ya da bozuksa **70** döner. Form, tanım formu ve `tekrarlayanUret` bu yardımcıyı çağırır;
  kaynakta ikinci bir `?? 70` yazılmaz (tarama). **Ayarı boşaltmak 70'e dönmek demektir**, "kısıtlama
  kapalı" demek değildir.

### B. Hesap (tek yer)

- **R10.** Bütün türev tutarlar **tek bir saf fonksiyon kümesinden** gelir; form, liste, kova, rapor ve
  makina maliyeti aynı fonksiyonları çağırır, kendi çarpımını yazmaz (kaynak taraması).
- **R11.** Zincir, kalemin KDV hariç tutarı (matrah) ve bugünkü `kdvKurus` üzerinden:
  1. İndirilebilir KDV = toplam KDV × oran
  2. İndirilemeyen KDV = toplam KDV − indirilebilir KDV
  3. KKEG matrahı = matrah − (matrah × oran)
  4. KKEG toplamı = KKEG matrahı + indirilemeyen KDV
  5. **Gider tutarı (maliyet tabanı) = matrah + indirilemeyen KDV**
- **R12.** Yuvarlama: **indirilebilir KDV yuvarlanır**, artık kuruş indirilemeyen tarafa düşer.
  Gerekçe: indirilebilir KDV beyan edilen (KDV1'de indirilen) tutardır, yuvarlanması gereken odur;
  artığı maliyet tarafında bırakmak parçaların toplamını bütüne eşit tutar. (0075'in "beyan edilen
  tutar yuvarlanır" kuralının aynısı.) **Rev. 2 (plan Q4):** KKEG matrahında da aynı kural: indirilebilir
  gider kısmı (matrah × oran) yuvarlanır, artık kuruş KKEG matrahında kalır.
- **R13.** Bayraksız kalemde oran %100 gibi davranır: indirilemeyen KDV sıfır, gider tutarı matraha
  eşit, KKEG sıfır. Yani bütün türev rakamlar bugünkü değerlerini verir.

### C. İki tutar: fatura tarafı ve maliyet tarafı

- **R14.** Kalemin **iki tutarı** olur ve ikisi ayrı ayrı adlandırılır:
  - **matrah / fatura tutarı** (bugünkü `kalemKurus`): faturada yazan, kullanıcının girdiği, KDV'nin
    ve stopajın hesaplandığı tutar.
  - **gider tutarı** (yeni): matrah + indirilemeyen KDV; **harcanan paranın maliyet tarafı.**
  Bayraksız kalemde ikisi **birebir eşittir**, bu yüzden bugünkü hiçbir rakam değişmez (C3).
  `kalemKurus` modül içidir ve dışa yalnız `kalemTutari` ile açılır; maliyet tarafının tüketicileri
  bu yüzden sayılabilir kadar azdır (R15).
- **R15.** **Maliyet tarafına geçen tüketiciler** (gider tutarını okur):
  dönem raporunun **toplamı**, ödenen / ödenmeyen gider, **tür kırılımı**, **tedarikçi harcaması**,
  **kova dağılımı** (`kovaKurus` tabanı) ve kovadan türeyen her şey: **makina maliyeti**, kârlılık,
  fiyat önerisi, Makina ve Model görünümü, 0072'nin aylara dağıtımı, 0022'nin parti payları.
  Dört ayrıntı yazılı olmalıdır:
  1. **İndirilemeyen KDV kalemin kovasını izler.** Makinaya atanmış kalemde tamamı o makinaya,
     "dağıtılmasın"da tamamı maliyet dışına, atamasızda ortak kovaya girer. **Model atamasında model
     satırları değişmez** (birim maliyetler faturadan, yani matrah tabanlıdır) ve fark `top − model`
     ile **ortak** kovaya düşer. **Rev. 2 (plan Q2):** model kovasının üst sınırı **matrahtır**
     (`min(model satırları, matrah)`), gider tutarı değil; matrahı aşan eski ya da bozuk model satırı
     indirilemeyen KDV'yi modele çekemez. Bayraksız kalemde matrah ile gider tutarı eşit olduğu için
     bugünkü çıktı değişmez.
  2. **Model dağılımının doğrulama sınırı matrah kalır** (kullanıcı faturada yazan tutarı dağıtır;
     sınırı gider tutarına çıkarmak faturada olmayan bir tutarı dağıtmaya davet eder). Formun
     uyarısı kısıtlı kalemde "Dağıtılmayan X ₺ **ve indirilemeyen KDV** ortak gidere yazılacak."
     olur, yoksa uyarının rakamı ortak kovanın gerçeğiyle tutmaz.
  3. **Standart ortak gider kaynağında etki sınırlıdır** (0072'nin aynı sınırı):
     `ortakGiderKaynagi: "standart"` seçiliyken ayın ortak gideri standart tablodan geldiği için
     ortak kovaya düşen indirilemeyen KDV makina maliyetine **girmez**; etki yalnız makinaya ve
     modele atanmış kısıtlı kalemde görülür. R27'nin maliyet notu bu ayrımı yazar.
  4. **0047 raporunun KALEMLER tablosu** da gider tutarını basar (ekranla aynı taban), çünkü raporun
     "Toplam gider" satırı gider tutarına geçiyor ve tablo onunla tutmalıdır; ayrı bir açıklama
     sütunu eklenmez, KKEG kutusu rakamı zaten verir.
  5. **Rev. 2 (plan Q5):** aynı tabanı gösteren iki komşu da gider tutarına geçer: **Makina ve Model
     görünümünün kalem satırları** (satırlar kova toplamıyla tutmalı) ve tedarikçi kırılımının
     **"Harcama (KDV hariç)"** başlığı **"Harcama"** olur (R22'nin gerekçesiyle).
- **R16.** **Fatura ve ödeme tarafında kalanlar** (matrahı ya da ödenecek tutarı okur, değişmez):
  `kdvKurus`, `stopajKurus`, 0075'in tevkifatı, **ödenecek tutar**, ödeme hedefleri, borç özeti,
  ödeme hatırlatıcısı, açık kalemler, ekstreler ve bütün Kasa tarafı. Ödeme tarafı zincirin tamamı
  `odenecekKurus` üzerinden kuruludur, bu yüzden bu madde bedelsizdir.
- **R17.** **Ödenecek tutar değişmez:** tedarikçiye matrah + KDV'nin tamamı ödenir (örnekte 1.200 TL).
  Oran yalnız "ne kadarını devletten geri alıyoruz" sorusunu etkiler. Borç da aynı kalır.
- **R18.** **"Dört kova = genel toplam" eşitliği korunur** (0001 AC-82): hem toplam hem kova aynı
  gider tutarı tabanından türer.
- **R19.** 0062'nin alt toplamı ve kalem listesinin tutar sütunu **gider tutarını** gösterir, böylece
  sütun alt toplamla tutar. Satırda **rozet** kısıtlamayı açıklar: rozet **tutar hücresinde**,
  tutarın altında (`data-testid="kisitli-rozeti"`), metni tek yardımcıdan (`kisitliRozetMetni`,
  0072'nin `dagitimRozetMetni` emsali): oran ve indirilemeyen KDV tutarı yazılı, ör.
  "%70 indirilebilir · indirilemeyen KDV 60,00". **0072'nin dağıtım rozeti atama hücresinde kalır**,
  ikisi aynı satırda birlikte görünebilir ve çarpışmaz.
- **R20.** **KDV sütunu ve alt toplamı da mutabık kalır.** Satırın KDV hücresi **tam** KDV'yi
  göstermeye devam eder (faturada yazan odur) ve kısıtlı satırda altına indirilebilir tutar yazılır
  (0075'in tevkifat hücresi deseni); listenin **KDV alt toplamı iki rakam** taşır: "KDV 200,00 ·
  indirilebilir 140,00". Yoksa listenin KDV alt toplamı (tam KDV) ile raporun "İndirilecek KDV"
  kartı (R23 ile indirilebilir KDV) aynı dönemde 200,00 ve 140,00 diye ayrışır ve kullanıcı iki
  rakamı mutabık edemez. Kartın etiketi ("İndirilecek KDV") değişmez. **Rev. 2 (plan Q8):** ikinci
  rakam ("· indirilebilir …") yalnız görünen listede kısıtlı kalem varken yazılır; iki rakamın eşit
  olduğu listede yazılmaz (R6'nın "etkisiz gösterge gürültüdür" ilkesi).
- **R21.** Genel aramanın (0026) tutar eşitliği kuralı **değişmez**: matrah ve ödenecek tutar aranır,
  üçüncü bir tutar eklenmez (yoksa aynı sorgu daha çok kaydı bulurdu). **Arama sonucu satırının
  gösterdiği tutar da matrahtır** (aranan rakamla aynı olması gerekir); ekranda 1.060, arama
  satırında 1.000 görünmesi bilinçli bir sınırdır ve bu maddede yazılıdır.
- **R22.** **"KDV hariç" diyen kalıcı metinler düzeltilir.** Bugün dört yerde gider toplamının KDV
  hariç olduğu yazılı ve R15 bu iddiayı yanlışa düşürür:
  1. kalem listesinin tutar sütununun **başlığı** (`"KDV hariç"`) → **"Tutar"**,
  2. "Toplam gider (KDV hariç)" kartı → **"Toplam gider"**,
  3. "Ödenmemiş gider (KDV hariç)" kartı → **"Ödenmemiş gider"**,
  4. Giderler başlığının altındaki "Gider toplamlarına KDV hariç tutar girer." cümlesi → "Gider
     toplamlarına KDV hariç tutar girer; kısıtlı kalemlerde indirilemeyen KDV de eklenir."
  Ayrıca Dönem Raporu'nun kırılım cümlesindeki "KDV hariç" ibaresi ve `gider.js`'in modül sözleşmesi
  yorumları aynı anlamda güncellenir. **Bu değişiklik kısıtlı kalem olmasa da görünür**, yani bu
  ekranlarda piksel farkı beklenir (K-20'nin kanıt listesi, kayıt `beklenen: "degisti"`); C3'ün sıfır
  fark şartı rakamlar için geçerli kalır, metinler için değil.
  *Gerekçe:* 1.060 rakamının üstünde "KDV hariç" yazması, bu spec'in ortadan kaldırmak için yazıldığı
  sessiz uyumsuzluğun aynısıdır.

### D. İndirilecek KDV ve KKEG

- **R23.** Dönem raporunun **indirilecek KDV** toplamı artık `indirilebilirKdv`'yi toplar
  (bugün kalemin KDV'sinin tamamını topluyor: motorda tek satır). Bu, Finans'taki KDV
  Karşılaştırması kartının doğrulandığı tek noktadır.
- **R24.** Dönem raporu ve 0047 belgesi iki **bilgi rakamı** daha taşır: **indirilemeyen KDV** ve
  **KKEG** (matrah kısmı, KDV kısmı ve toplamı ayrı ayrı okunur). Kısıtlı kalem yoksa satırlar
  **basılmaz ve çizilmez.** İki ayrıntı yazılı olmalıdır:
  1. **Yeni kutu açılmaz:** rakamlar bugünkü **"KDV satırı"** kartına iki satır olarak girer. 0067
     Dönem Raporu'nun kutu sırasını sabitledi ve Electron yerleşim testi (`donem-raporu-yerlesim`)
     1280 ile 1024 px'te sırayı, taşmayı ve üst üste binmeyi ölçüyor; yeni kutu o kararı, o testi ve
     kanıt listesini birden açar. Bu yolla sıra ve yerleşim testi dokunulmaz kalır.
  2. **Rapor nesnesine tek alan eklenir:** `hesaplaGiderRaporu` çıktısında tek nesne
     (`kisitli: { adet, indirilebilirKdv, indirilemeyenKdv, kkegMatrah, kkegKdv, kkegToplam }`) ve
     `adet === 0` ise alan **hiç** eklenmez. Ekran ve 0047 bu nesneyi okur, kendi toplamını yazmaz
     (R10). Dört ayrı kök alan hem altın JSON'u hem ekranları dört yerden bağlardı; tek nesne tek
     `delete` satırı ve tek tarama demektir (R39).
  3. **Rev. 2 (plan Q6):** "KDV satırı" kartı (`KdvKarsilastirmaKarti`) Finans ile paylaşılır. İki bilgi
     satırı isteğe bağlı `kisitli` prop'uyla gelir ve onu **yalnız Giderler** verir; Finans yalnız
     düzeltilmiş indirilecek KDV'yi alır (R23, AC-24), ekranı başka değişmez. Satırlar tam ay olmayan
     aralıkta da çizilir (dönem toplamıdır, aya bağlı değildir).
- **R25.** KKEG rakamı **gider toplamına eklenmez** (zaten içindedir) ve hiçbir hesabı değiştirmez;
  muhasebeciye verilecek bir sayıdır.
- **R26.** Ekranda ve raporda yazılı kalıcı not: **uygulamanın gider toplamı vergi matrahı değildir.**
  Uygulama harcanan parayı ölçer; KKEG, amortisman ve benzeri vergi kavramları matrahı ayrıca
  belirler. Bu not, (A) kararının gider toplamını vergi matrahından **daha da** uzaklaştırdığı için
  şarttır. Metin **tek sabittir** (`VERGI_MATRAHI_NOTU`) ve **iki yerde** görünür: Giderler
  başlığının altındaki cümlenin devamı (R22'nin 4. maddesiyle aynı satır) ve 0047'nin gider
  bölümünün dipnotu; kısıtlı kalem olmasa da görünür.
- **R27.** **Maliyet notlarına** (`MaliyetNotlari`) satır eklenir: maliyet indirilemeyen KDV'yi
  **içerir**. 0002 R3'ün "maliyet stoktan çekilen parçaların alış maliyetini içermez" notunun yanında
  durur ve maliyetin gösterildiği her yerde görünür. Standart ortak gider kaynağında not R15/3'ün
  sınırını söyler (ortak kovadan gelen kısım o kaynakta maliyete girmez). **Rev. 2 (plan Q7):** not,
  0072'nin dağıtım notu gibi **koşulludur**: maliyet motoru kısıtlı kalem gördüğünde (`kisitliVar`)
  görünür, bayraksız veride maliyet ekranları değişmez.
- **R28.** KKEG kısaltması ekranda **açılır**: ilk geçtiği yerde "Kanunen kabul edilmeyen gider
  (KKEG)", sonra kısaltma. Form ve rapor etiketleri aynı sabitten okur (`KKEG_ETIKETI`).
  Kullanıcı fabrika çalışanıdır, muhasebe kısaltması açıklanmadan yazılmaz (C6).

### E. Formda görünen

- **R29.** **Tek ve birleşik özet bloğu.** 0075 `tevkifat-ozet`'i `normal-ozet`'in *yerine* çiziyor;
  üçüncü bir blok varyantı dört kombinasyon ve dört bakım yüzeyi demek olurdu. Bunun yerine özet
  bloğu tektir ve hangi kutu açıksa onun satırları eklenir: Matrah, Toplam KDV, (tevkifat açıksa)
  tevkifat satırları, İndirilebilir KDV, İndirilemeyen KDV, **Gider tutarı (maliyete giren)**, KKEG,
  **Tedarikçiye ödenecek**. `normal-ozet` ve `tevkifat-ozet` kimlikleri **korunur** (0075 testleri
  yeşil kalsın); iki ayrı blok birden çizilmez. Rakamlar kaydedilecek motorun kendisinden gelir
  (önizleme ile kayıt aynı).
- **R30.** Formda kalıcı bilgi notu: indirilemeyen KDV'nin maliyete katıldığı, buna karşılık vergi
  açısından KKEG olduğu, yani uygulamanın gider toplamının muhasebenin matrahından farklı olduğu
  (R26'nın kalem düzeyindeki yüzü).
- **R31.** 0071 ile kesişim: "KDV dâhil" girişte rakam bugünkü gibi matrah + tam KDV sayılır,
  `kdvAyir` değişmez; oran ayırmadan **sonra** uygulanır.
- **R32.** 0075 ile kesişim: **ikisi bağımsızdır, sıra sorunu yoktur.** Tevkifat KDV'nin *kime*
  ödendiğini böler, kısıtlama *ne kadarının indirilebildiğini*; ikisi de toplam KDV'den hesaplanır.
  Aynı kalemde ikisi birden varsa: indirilebilir KDV toplam KDV × oran, tevkifat toplam KDV ×
  pay/payda, tedarikçiye matrah + (toplam KDV − tevkifat), maliyete matrah + indirilemeyen KDV.
  Pratikte yakıt faturası tevkifatlı gelmez; motor yine ikisini birlikte doğru hesaplar.

### F. Veri

- **R33.** İki yeni alan, **`giderler` ve `gider_tanimlari`** tablolarında, tek sütun kümesi adıyla
  (`GIDER_KISIT_COLUMNS = [["kisitliGider","INTEGER"],["indirilebilirOran","INTEGER"]]`): dört nokta
  **iki tablo için ayrı ayrı** işler (iki `CREATE`, iki `ensureColumns`, iki INSERT, iki okuma).
  Yazma ve okuma 0075'in çifti gibi tek yerde toplanır (`kisitYaz` / `kisitOku`; kapalıysa okuma
  `{}` döner, `bosOlmayan` ile birlikte), böylece kapalı ya da boş değer blob'a **yazılmaz** (sunucu
  karşılaştırması; 0070/0072/0075 deseni). Tablolardan birinin INSERT'ü atlanırsa alan sessizce
  kaybolur, bu projede bir kez yaşandı.
- **R34.** Varsayılan oran `appSettings.giderAyarlari.indirilebilirOran` (JSON dört nokta, yeni sütun
  yok), Ayarlar › Giderler › Gider Ayarları'nda, `gider_tanim` izniyle; geçersiz değerde kayıt yok ve
  neden yazılır (`hatirlatmaEsikGun` deseni). Okuma tarafı R9'un tek yardımcısıdır.
- **R35.** **Tekrarlayan tanımda** da tanımlanabilir ve üretilen kalem taşır: yakıt tipik bir aylık
  tekrarlayan giderdir. Tanım tarafı kendi yüzeyidir ve üç parçası yazılıdır: tanım formunda kutu ve
  oran alanı (**oran boş bırakılabilir ve "ayardaki oran" demektir**, R8/3), tanım listesinde
  "Kısıtlı %70" ya da oran boşsa "Kısıtlı (ayardaki oran)" ibaresi (0075'in "Tevkifat 5/10" emsali),
  davranış kapısı kalemle aynı (`kisitliGiderMi`).
- **R36.** **Göç yok.** Alanları olmayan eski kalem kısıtsızdır: KDV'nin tamamı indirilir, gider
  tutarı matraha eşittir, yani bugünkü davranış.
- **R37.** Sunucu, izin, merge ve bölümler değişmez: kısıtlı kalem sıradan bir gider kalemidir.
  **Rev. 2 (plan Q9):** `db.cjs` sunucu PC'de çalıştığı için güncellenmemiş sunucu iki sütunu tanımaz ve
  bayrak sessizce kaybolur; güncellenmemiş istemci bayrağı görmez. Sürüm notu: önce sunucu PC, sonra
  bütün istemciler; güncelleme bitene kadar kutu işaretlenmez (0071 ve 0075 emsali).

### G. Bilinçli rakam değişikliği ve regresyon eşiği

- **R38.** Yayın anında hiçbir kalemde bayrak olmadığı için **görünen rakamlar değişmez** (metinler
  R22 ile değişir). Kullanıcı geçmiş bir yakıt kalemini işaretlediğinde o ayın ortak gideri, o ayda
  üretilen makinaların **maliyeti, kârlılığı ve fiyat önerisi** değişir. Bu, 0072'nin "maliyet
  bugünkü veriden türer" karakteriyle aynıdır ve beklenen davranıştır; sürüm notu bu üç çıktıyı
  adıyla sayar ve etkinin yalnız işaretlenen kalemlerin aylarıyla sınırlı olduğunu yazar.
- **R39.** **Altın çıktıların ayrımı.** 0059'un altın **HTML**'i birebir aynı kalır (kısıtlı kalem
  olmayan fikstürde R24'ün satırları basılmaz). Altın **JSON** tam nesne `toEqual` ile
  karşılaştırıldığı için R24'ün tek yeni anahtarı testin ayıklama adımına bir `delete` satırıyla
  eklenir; emsal 0060 (`ekOdemeTurleri`, `stopaj`), 0061 (`yaslandirma`), 0070 (`sgk`) ve 0075
  (`tevkifat`) satırlarıdır. C3 ve AC-36 bu ayrımla okunur: "birebir aynı" rakamlar ve HTML için,
  JSON için "tek yeni anahtar, ayıklamada yazılı". **Rev. 2 (plan Q1):** 0059'un altın HTML'i **Aylık
  Faaliyet Raporu**'dur; Gider ve Kasa Raporu'nun altın HTML'i yoktur. R26'nın her zaman basılan dipnotu
  bu yüzden altın HTML ile çelişmez; gider raporunun HTML'i yeni testte dipnotla birlikte denetlenir.
  **AC-36'nın kanıtı (plan Q3):** spec 0076'dan önceki kodla bayraksız bir veri kümesinin bütün motor
  çıktıları (dönem raporu, kova, makina maliyeti iki kaynakla, kârlılık, fiyat önerisi, KDV
  karşılaştırması) `tests/fixtures/0076-bayraksiz-once.json`'a yazıldı; test aynı veriyi yeni kodla
  çalıştırıp `toEqual` ile karşılaştırır.

---

## Constraints

- **C1.** **Tek kapı:** bayrağın hangi davranışta açılabildiği, oran, indirilebilir ve indirilemeyen
  KDV, KKEG ve gider tutarı hepsi tek fonksiyonlardan gelir. Ekranlara `k.kisitliGider ? ...` dalı
  dağıtılmaz. Motor **saf ve ayarsız** kalır: oran kalemden çözülür, `gider.js` `appSettings`
  almaz (R8).
- **C2.** **Çift sayım yasağı:** indirilemeyen KDV yalnız **gider tutarının** içinde bir kez sayılır.
  Ne ayrı bir gider kalemi olarak girilir, ne ödenecek tutara eklenir, ne de KKEG satırı gider
  toplamına eklenir.
- **C3.** **Bayraksız kalemde bütün RAKAMLAR birebir bugünküdür:** motor çıktısı, dönem raporu, kova,
  makina maliyeti, KDV karşılaştırması, 0047 ve 0059'un altın çıktıları (regresyon eşiği sıfır).
  İki bilinçli istisna yazılıdır ve rakam değildir: R22'nin etiket ve cümle düzeltmeleri (piksel
  farkı beklenir) ve R39'un altın JSON'a eklenen tek anahtarı.
- **C4.** Kuruş tamsayısı; indirilebilir artı indirilemeyen KDV toplam KDV'ye, matrah artı
  indirilemeyen KDV gider tutarına kuruşu kuruşuna eşittir.
- **C5.** Yeni izin, yeni sunucu kuralı ve yeni bölüm yoktur.
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** **Binek otomobil kiralama bedelinin aylık tavanı** (2026: KDV hariç 46.000 TL; aşan kısım
  KKEG) — *neden:* bu bir **tavan**, oran değil; farklı bir mekanizma, her yıl değişen bir tutar ve
  kira davranışının kendi hesabına dokunur (R5). Ayrı iştir.
- **X2.** **Binek otomobil alımında** doğrudan gider yazılabilecek ÖTV + KDV sınırı (2026:
  1.200.000 TL) ve amortismana esas kıymet sınırı (1.380.000 TL; vergiler maliyete eklenirse veya
  ikinci elde 2.600.000 TL) — *neden:* uygulamada amortisman ve demirbaş kavramı hiç yok.
- **X3.** **Vergi matrahının hesaplanması** (KKEG'lerin matraha eklenmesi, geçici vergi, kurumlar
  vergisi) — *neden:* R26; uygulama harcamayı ölçer, matrahı muhasebeci hesaplar. Uygulama yalnız
  KKEG rakamını verir.
- **X4.** Aracın ruhsat türünden (binek / ticari) oranın otomatik türetilmesi, araç kartı, plaka
  bazlı gider takibi — *neden:* uygulamada araç kaydı yok; kullanıcı kalemde işaretler. Araç kartı
  ayrı ve büyük bir iştir.
- **X5.** İndirilemeyen KDV'nin vergi açısından "gider yazılabilir mi yoksa KKEG mi" tartışmasının
  karara bağlanması — *neden:* GİB'in duruşu KKEG olduğu yönünde ve uygulama bu rakamı zaten ayrı
  veriyor; nasıl beyan edileceği muhasebecinin kararı.
- **X6.** Geçmişte tam KDV ile girilmiş yakıt kalemlerinin toplu işaretlenmesi — *neden:* hangi
  kalemin binek araca ait olduğunu veri söylemiyor; kullanıcı istediği kalemi düzenler (R38).

---

## Context

- **Doğrulanan mevzuat.** **GVK 40/5** (7194 sayılı Kanunla 2020'den beri): kiralama yoluyla edinilen
  veya işletmeye dahil olan binek otomobillerin giderlerinin **en fazla %70'i** indirilebilir, kalanı
  KKEG. Yakıta uygulandığı GİB özelgesiyle teyitli (E-62030549-125-1051404, 06.08.2024) ve özelge tam
  olarak **depoya toplu alınan akaryakıt** durumunu ele alıyor, bu yüzden R3'ün serbest oranı gerçek
  bir ihtiyaç. KDV tarafı ayrı maddeden: **KDV 30/d**, kazancın tespitinde indirimi kabul edilmeyen
  gidere ait KDV indirilemez. Kural yalnız yakıt değil, binek otomobilin bakım, onarım, sigorta,
  kasko, otopark, lastik gibi bütün cari giderlerini kapsar; bu yüzden bayrağın etiketi "yakıt"
  değildir. **Ticari araç istisnası:** ruhsatında "ticari" yazan kamyonet ve panelvanda kısıtlama yok,
  KDV'nin tamamı indirilir, giderin %100'ü yazılır. Fabrikada kamyonet, forklift ve iş makinesi
  bulunması çok muhtemel olduğu için bayrağın kalem bazında olması (R4) şart.
- **Örnek (test verisi olacak).** Matrah 1.000,00 TL, KDV %20, oran %70:
  toplam KDV **200,00**; indirilebilir KDV **140,00**; indirilemeyen KDV **60,00**; KKEG matrahı
  **300,00**; KKEG toplamı **360,00**; **gider tutarı 1.060,00**; tedarikçiye ödenecek **1.200,00**.
- **Kodda tek nokta.** Bugün `hesaplaGiderRaporu` içinde `indKdv += kdvKurus(k, dav)` satırı
  indirilecek KDV'nin **tek** toplandığı yer; R23 bu satırın düzeltilmesidir ve KDV
  karşılaştırmasının yanlışlığı buradan geliyor. Maliyet tarafında ise `toplam += kalemKurus(k, dav)`
  ile `kova[key] += kovaKurus(...)` **aynı tabandan** türüyor; 0001'in "dört kova = genel toplam"
  eşitliği (AC-82) bu yüzden kendiliğinden korunuyor. R15 tabanı değiştirirken ikisini birlikte
  değiştirir, eşitlik bozulmaz (R18).
- **Neden iki tutar, neden `kalemKurus` büyütülmüyor.** `kalemKurus`'u doğrudan büyütmek iki yerde
  kırılır: (a) `odenecekKurus = kalem − stopaj − tevkifat + kdv` formülü indirilemeyen KDV'yi ikinci
  kez sayar ve ödenecek 1.260 çıkar; (b) kullanıcının girdiği 1.000 TL hiçbir yerde görünmez olur,
  faturayla tutmayan bir rakam kalır. R14'ün iki tutarı bunu ayırıyor: fatura tarafı girilen ve
  ödenen rakamı korur, maliyet tarafı gerçek harcamayı taşır. Bayraksız kalemde ikisi eşit olduğu
  için bugünkü davranış hiç değişmez.
- **Neden listede gider tutarı gösteriliyor.** 0062'nin alt toplamı bütün listeden hesaplanıyor;
  satırda matrah (1.000) gösterip altta gider toplamını (1.060) yazmak kullanıcının mutabakat
  yapmasını imkânsız kılar. Sütun gider tutarını gösterip rozetle açıklamak hem toplamla tutuyor hem
  nedenini söylüyor. Girilen rakamla gösterilen rakamın ayrışması bu projede yeni değil: 0071'den
  beri "KDV dâhil" girişte kullanıcı 24.000 girip kayıt 20.000 saklıyor ve bu formda yazılı.
- **Taban değişiyor ama o tabanı tarif eden metinler yerinde kalıyor.** Bugün dört ayrı yerde gider
  toplamının "KDV hariç" olduğu yazılı: kalem listesinin tutar sütununun başlığı, iki özet kartının
  etiketi ve Giderler başlığının altındaki kalıcı cümle. R15 rakamı 1.060'a çıkarırken bu metinler
  düzeltilmezse ekran, bu spec'in ortadan kaldırmak için yazıldığı sessiz uyumsuzluğun kendisini
  üretir: doğru rakamın üstünde yanlış bir tanım. R22 bu yüzden dördünü birden değiştirir ve bedelini
  (kısıtlı kalem olmasa da görülen piksel farkı) açıkça kabul eder. Aynı sınıf ikinci bir ayrışma
  KDV sütununda: liste satırları tam KDV'yi toplarken kart indirilebilir KDV'yi gösterecek, bu
  yüzden R20 alt toplamı iki rakamla yazar.
- **Motorun saflığı oranın nerede saklanacağını belirliyor.** `gider.js` hiçbir yerde `appSettings`
  almıyor ve tutar fonksiyonlarının imzası `(k, dav)`. Yani varsayılan oran bir ayar olsa da kalemin
  kendi oranı **kayıtta** olmak zorunda; motor okuma anında ayara uzanamaz. R8 bundan üç kural
  çıkarıyor: oransız bayraklı kalem %100 sayılır (sessiz yanlış rakam yerine bugünkü davranış),
  doğrulama bu durumu baştan engeller, tanımdan üretim somut oran yazar. Üçüncüsünün emsali 0071'in
  "tarihe göre KDV oranı" çözümüdür: tanımda boş, üretimde somut.
- **Vergi ile yönetim muhasebesinin ayrımı, bu spec'in can alıcı yeri.** Vergi açısından indirilemeyen
  60 TL KKEG'dir, yani matrahtan düşülemez. Uygulama açısından aynı 60 TL **harcanmış ve geri
  gelmeyecek** paradır. Makina maliyeti bir vergi hesabı değil, "bu makina bize kaça mal oldu"
  sorusudur; TY'nin kararı ("makina maliyetine girmeyen bir harcama olmaz") bu soruya göre doğrudur.
  Ama bunun bir bedeli var: uygulamanın gider toplamı vergi matrahından **daha da** uzaklaşır. R26'nın
  notu ve R24'ün KKEG rakamı bu bedeli görünür kılar; yoksa ileride "uygulamanın rakamı beyanla neden
  tutmuyor" sorusu cevapsız kalır.
- **Kira neden dışarıda.** Binek otomobil **kirasının** kısıtlaması %70 değil, aylık tavandır
  (2026'da KDV hariç 46.000 TL). Bayrağı kira davranışına da açmak, tavan kuralını orana sıkıştırarak
  yanlış giriş yapmayı davet ederdi. R5 bayrağı normal davranışa kilitliyor, X1 tavanı ayrı iş olarak
  saklıyor.
- **Tevkifatla (0075) ilişkisi düşünüldü ve sorun çıkmıyor.** İlk bakışta bir sıra sorunu var gibi
  görünüyor ama yok: tevkifat KDV'yi **kime** ödediğine göre böler, kısıtlama **ne kadarını
  indirebildiğine** göre; ikisi de toplam KDV'den bağımsız hesaplanır (R32). Tevkifata uğrayan KDV'nin
  indirilebilirliği de aynı %70'e tabidir, yani sonuç yine 140 TL.
- **Bu spec neden 0075'ten pahalı.** 0075 tevkifatta hiçbir maliyet rakamına dokunmuyordu; bu spec
  maliyet tabanını değiştiriyor, yani `kovaKurus`, dönem toplamı, tür kırılımı, 0072'nin aylara
  dağıtımı, makina maliyeti, kârlılık ve fiyat önerisi birlikte etkilenir ve bütün çapraz testler
  elden geçer. Bayraksız veride sıfır fark şartı (C3) bu riski tutan tek güvencedir.

---

## Acceptance Criteria

### Onay kutusu ve oran

- **AC-1.** Formda "Gider kısıtlaması uygulanıyor (binek araç)" kutusu vardır ve varsayılan kapalıdır.
- **AC-2.** Kutu kapalıyken kısıtlamaya ait hiçbir alan, özet satırı ve rozet çizilmez; form bugünkü
  hâliyle aynıdır.
- **AC-3.** Kutu açılınca oran alanı Ayarlar'daki varsayılanla (70) dolu gelir ve değiştirilebilir.
- **AC-4.** Oran 0–100 dışındaki değerde kayıt reddedilir ve nedeni yazılır; tam sayı olmayan değer
  de reddedilir.
- **AC-5.** Kutu kapatılınca oran temizlenir ve kayda yazılmaz.
- **AC-6.** Bayrak yalnız normal davranışta açılabilir; personel, SGK ve kira kaleminde kutu yoktur.
- **AC-7.** KDV oranı sıfır olan kısıtlı kalem kaydedilebilir; KKEG matrahı hesaplanır, KDV
  bölünmesi sıfırdır.
- **AC-8.** Ayarlar'daki varsayılan oran `gider_tanim` izniyle değiştirilir; geçersiz değerde kayıt
  yapılmaz ve neden yazılır.

### Hesap

- **AC-9.** Matrah 1.000, KDV %20, oran %70 olan kalemde: toplam KDV 200,00; indirilebilir KDV
  140,00; indirilemeyen KDV 60,00; KKEG matrahı 300,00; KKEG toplamı 360,00; gider tutarı 1.060,00;
  tedarikçiye ödenecek 1.200,00.
- **AC-10.** Yuvarlama gereken bir oranda indirilebilir artı indirilemeyen KDV toplam KDV'ye, matrah
  artı indirilemeyen KDV gider tutarına kuruşu kuruşuna eşittir; artık kuruş indirilemeyen taraftadır.
- **AC-11.** Bütün türev tutarlar tek fonksiyon kümesinden gelir; bileşenlerde ikinci bir çarpım,
  kaynakta ikinci bir `?? 70` ve motorda `appSettings` okuması yoktur (kaynak taraması).
- **AC-12.** Bayraksız kalemde gider tutarı matraha eşittir, indirilemeyen KDV ve KKEG sıfırdır.

### Maliyet tarafı

- **AC-13.** Dönem raporunun gider toplamı kısıtlı kalemde gider tutarını (1.060) sayar.
- **AC-14.** Tür kırılımı ve tedarikçi harcaması gider tutarını sayar.
- **AC-15.** Kova dağılımı gider tutarından bölünür ve **dört kovanın toplamı genel toplama eşittir**;
  model atamalı kısıtlı kalemde model satırları değişmez ve indirilemeyen KDV ortak kovaya düşer,
  makinaya atanmışta tamamı o makinaya, "dağıtılmasın"da maliyet dışına girer.
- **AC-16.** Makina maliyeti kısıtlı kalemin gider tutarını yükler; indirilemeyen KDV maliyete girer.
  `ortakGiderKaynagi: "standart"` seçiliyken ortak kovadan gelen kısım maliyete **girmez** (yalnız
  makinaya ve modele atanmış kalem etkiler) ve maliyet notu bunu söyler.
- **AC-17.** 0072 ile dağıtılmış kısıtlı kalemde aylık paylar gider tutarından bölünür.
- **AC-18.** Kalem listesinin tutar sütunu gider tutarını gösterir, alt toplamla tutar ve **tutar
  hücresinde** oranı ile indirilemeyen KDV'yi yazan rozet vardır; 0072'nin dağıtım rozeti atama
  hücresinde kalır ve ikisi aynı satırda birlikte görünebilir.

### Fatura ve ödeme tarafı (değişmeyenler)

- **AC-19.** Ödenecek tutar matrah artı **tam** KDV'dir (1.200,00); kısıtlamadan etkilenmez.
- **AC-20.** Borç özeti, ödeme hatırlatıcısı, açık kalemler ve ekstreler kısıtlamadan etkilenmez.
- **AC-21.** `kdvKurus`, stopaj ve 0075'in tevkifatı matrahtan hesaplanmaya devam eder.
- **AC-22.** Genel aramanın tutar eşitliği kuralı değişmez (matrah ve ödenecek; üçüncü tutar yok) ve
  arama sonucu satırının gösterdiği tutar matrahtır.

### İndirilecek KDV ve KKEG

- **AC-23.** Dönem raporunun indirilecek KDV toplamı kısıtlı kalemde 140,00 sayar, 200,00 değil.
- **AC-24.** Finans'ın KDV Karşılaştırması bu düzeltilmiş toplamı kullanır; farkı, ödeneceği ve
  devredeni ona göre verir.
- **AC-25.** Dönem raporunda ve 0047 belgesinde indirilemeyen KDV ile KKEG (matrah, KDV, toplam)
  bilgi rakamları **bugünkü "KDV satırı" kartının içinde** görünür (yeni kutu açılmaz, 0067'nin
  kutu sırası ve Electron yerleşim testi dokunulmaz); kısıtlı kalem yoksa basılmaz ve çizilmez ve
  rapor nesnesine alan hiç eklenmez.
- **AC-26.** KKEG rakamı gider toplamına eklenmez.
- **AC-27.** "Uygulamanın gider toplamı vergi matrahı değildir" notu ekranda ve raporda yazılıdır.
- **AC-28.** Maliyet notlarında maliyetin indirilemeyen KDV'yi içerdiği yazılıdır ve maliyetin
  gösterildiği her yerde görünür.

### Form ve kesişimler

- **AC-29.** Bayrak açıkken **tek** özet bloğu yedi satırı gösterir ve rakamları kaydedilecek
  değerlerle aynıdır; tevkifat kutusu da açıkken aynı blok iki kutunun satırlarını birden taşır ve
  iki ayrı blok çizilmez (`normal-ozet` ve `tevkifat-ozet` kimlikleri korunur).
- **AC-30.** "KDV dâhil" girişli kısıtlı kalemde ayırma bugünkü gibi çalışır ve oran ayırmadan sonra
  uygulanır; saklanan tutar KDV hariç matrahtır.
- **AC-31.** Hem tevkifatlı hem kısıtlı kalemde: indirilebilir KDV toplam KDV × oran, tevkifat toplam
  KDV × pay/payda, tedarikçiye matrah + (toplam KDV − tevkifat), maliyete matrah + indirilemeyen KDV.

### Veri ve regresyon

- **AC-32.** İki alan `giderler` **ve** `gider_tanimlari` tablolarında roundtrip edilir; kapalı ya da
  boş değerler blob'a yazılmaz (tek `kisitYaz` / `kisitOku` çifti).
- **AC-33.** Varsayılan oran `giderAyarlari` içinde roundtrip edilir.
- **AC-34.** Tekrarlayan tanımda tanımlanabilir (oran boş bırakılabilir), tanım listesi durumu yazar
  ve üretilen kalem **somut** oran taşır (tanımın oranı, yoksa o anki ayar oranı).
- **AC-35.** Alanları olmayan eski kalem kısıtsız davranır; göç kodu yazılmamıştır.
- **AC-36.** Bayraksız kalemlerden oluşan bir veri kümesinde dönem raporu, kova, makina maliyeti, KDV
  karşılaştırması ve 0059'un altın **HTML**'i bu işten önce ve sonra **birebir aynıdır**; altın JSON
  yalnız R24'ün tek yeni anahtarıyla farklıdır ve o anahtar testin ayıklama adımında yazılıdır.
- **AC-37.** Temiz kurulum ve roundtrip testleri kısıtlı kalemle yeşildir.
- **AC-38.** Yeni izin, sunucu kuralı ve bölüm eklenmemiştir.

### Sınır değerler, metinler ve bozuk veri

- **AC-39.** Oran **0** olan kısıtlı kalemde KDV'nin tamamı indirilemez, KKEG kalemin bütünüdür ve
  gider tutarı matrah + tam KDV olur; oran **100** olan kalem bayraksıza birebir eşit davranır ve
  rozet ile kısıtlama özet satırları çizilmez.
- **AC-40.** Bayrağı açık ama oranı boş ya da geçersiz olan (dışarıdan gelmiş) kalem %100 sayılır:
  indirilemeyen KDV ve KKEG sıfır, gider tutarı matraha eşit; hiçbir yerde hata ya da NaN yoktur.
- **AC-41.** Ayar yok ya da bozukken varsayılan oran 70'tir ve ayarı boşaltmak 70'e döner
  (kısıtlamayı kapatmaz).
- **AC-42.** Tutar sütununun başlığı ile iki özet kartının etiketi "KDV hariç" demez; Giderler
  başlığının altındaki cümle kısıtlı kalemlerde indirilemeyen KDV'nin de eklendiğini yazar.
- **AC-43.** Listenin KDV alt toplamı tam KDV ile indirilebilir KDV'yi birlikte gösterir ve kısıtlı
  satırın KDV hücresi tam KDV'nin altına indirilebilir tutarı yazar.
- **AC-44.** KKEG ilk geçtiği yerde açık adıyla yazılır ve bütün etiketler tek sabitten okur.
- **AC-45.** 0047 raporunun KALEMLER tablosundaki tutar, ekrandaki tutarla aynı tabandan gelir
  (gider tutarı) ve raporun "Toplam gider" satırıyla tutar.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. **Test dosyaları:**
      `tests/kisitli-gider-0076.test.js` (motor: AC-9 rakamları, yuvarlama eşitliği, kova atama
      matrisi, oran uçları ve bozuk oran, `tekrarlayanUret`, varsayılan oran yardımcısı, kaynak
      taramaları), `tests/ui/kisitli-gider-0076.test.jsx` (kutu, birleşik özet, doğrulama, liste
      rozeti ve iki alt toplam, düzeltilen metinler, Ayarlar oranı, tanım formu ve listesi),
      `tests/gider-kasa-raporu-0076.test.js` (KDV satırı kartındaki iki bilgi rakamı ve kısıtlı
      kalem yokken basılmaması); **ek bloklar** `gider.test.js`, `makina-maliyeti.test.js` (AC-16,
      AC-17), `gider-kdv-capraz.test.js` (AC-24), `gider-gizlilik.test.js`, `ui/finance-gider-kdv`,
      `sayfalama-0062` (alt toplam), `db-roundtrip.cjs` ve `db-clean-install.cjs` (AC-32, AC-37);
      **güncellenen** `gider-kasa-raporu-0059` (R39'un `delete` satırı). *(Uygulamada `gider.test.js`
      bloğu yazılmadı: o kriterler plan §5 gereği `kisitli-gider-0076.test.js`'te; ek bloklar ayrıca
      `gider-dagitim-0072`, `ui/genel-arama-0026`.)*
- [x] Context'teki örnek rakamlar (AC-9) motor testinde birebir sabitlendi.
- [x] Parçaların toplamının bütüne eşitliği yuvarlama gerektiren bir oranla testlendi (AC-10).
- [x] **Bayraksız veride sıfır fark** çapraz testlerle gösterildi: dönem raporu, kova, makina
      maliyeti, KDV karşılaştırması ve 0059'un altın HTML'i (AC-36). Bu, işin en önemli
      güvencesidir. Altın JSON'un tek yeni anahtarı ayıklama adımında yazılı (R39).
- [x] "Dört kova = genel toplam" eşitliği kısıtlı kalemle ve **dört atama türüyle** testlendi
      (AC-15).
- [x] Ödeme tarafının (ödenecek, borç, hatırlatıcı, açık kalemler, ekstre) etkilenmediği testlendi
      (AC-19, AC-20).
- [x] 0075 ile birlikte çalıştığı testlendi (AC-31) ve iki kutu birden açıkken tek özet bloğu
      çizildiği gösterildi (AC-29).
- [x] Görsel kanıt: `0076-taban-piksel-raporu.json` ve `0076-piksel-raporu.json`. **Değişmesi
      beklenen ekranlar:** gider formu (kutu açık, birleşik özet), Dönem Raporu kalem listesi (yeni
      sütun başlığı, rozet, iki alt toplam), Giderler kart satırı ve başlık cümlesi (R22), KDV
      satırı kartı, maliyet detayı ve maliyet notları; **kutu kapalı form ve diğer bütün ekranlar
      0 piksel.** Tasarım sözlüğünü kullanan bu dosyaların `docs/evidence/kanit-eslemesi.json`
      kayıtları `beklenen: "degisti"` artı onay satırı taşır (`tests/kanit-eslemesi.test.js` ve
      `tests/tasarim-kaynak.test.js` bunu denetliyor).
- [x] `npm test` yeşil (çıktısıyla, Electron testleri dahil; `donem-raporu-yerlesim` ve
      `form-pencere-yerlesim` dahil), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: kalemin iki tutarı (matrah ve gider tutarı), hangi tüketicinin
      hangisini okuduğu, indirilemeyen KDV'nin kalemin kovasını izlediği ve standart kaynaktaki
      sınırı, oranın kalemde saklandığı ve motorun ayar okumadığı, indirilecek KDV'nin artık oranla
      hesaplandığı, maliyetin indirilemeyen KDV'yi içerdiği, gider toplamının vergi matrahı
      olmadığı ve "KDV hariç" metinlerinin neden değiştiği, bayrağın tür davranışı olmadığı.
- [x] Sürüm notu: kısıtlı gider işaretlendiğinde o ayın ortak gideri ile o ayda üretilen makinaların
      **maliyeti, kârlılığı ve fiyat önerisi** değişir; etki yalnız işaretlenen kalemlerin aylarıyla
      sınırlıdır (R38).
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R1 taslak, R2 plan onayı (Q1–Q11: model kovasının üst sınırı matrah, KDV kartı bilgisi yalnız Giderler'de ve tam ay dışında da, KDV alt toplamında ikinci rakam yalnız kısıtlı kalem varken, AC-36 kanıtı spec öncesi kodla üretilen motor çıktısı, R22 metin güncellemeleri). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: Gider Ayarları'nda `hesapsizBaslangic` gerilemesi, görsel kanıtın eksik olması, spec durum satırının "Taslak" kalması. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçü de gerçek; birincisi kullanıcıya görünen bir veri kaybıydı. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 1 | Gider Ayarları formunun başlangıç satırına eklenen yorum `hesapsizBaslangic` alanını yuttu (kayıtta ayar siliniyordu); yayına çıkmadan triyajda düzeltildi, bütün ayar nesnesiyle test eklendi. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir tutarın anlamını ikiye bölmek (fatura tarafındaki matrah ile gider tarafındaki gider tutarı), bütün tüketicileri tek tek "hangisini okuyorsun" diye sınıflandırmayı gerektirir; asıl güvence büyütülen tutarı değil, **dokunulmayan** tutarı okuyan yerlerin bayraksız ve bayraklı veride aynı kalmasıdır (ödenecek tutar, borç, hatırlatıcı). Bunu en ucuz kanıtlayan şey, spec'ten önceki kodla üretilmiş motor çıktısını fikstür olarak saklamaktı. İkincisi: tek satırlık bir yorum, aynı satırdaki başka bir alanı sessizce silebilir; ayar formlarının testleri tek alanı değil bütün ayar nesnesini karşılaştırmalı. Üçüncüsü: başlık metni gibi küçük bir değişiklik (R22) yüzden fazla ekranın görüntüsünü değiştirir; tam görsel kanıt parçalı çekimle ve aynı turda yeniden çekimle (sarsıntılı ekranlar) planlanmalı.
