# 0042 — Personel Ödemesinin İki Hedefe Ayrılması ve Yöntem Seçicinin Açılır Listeye Taşınması

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-29, plan onayıyla; plan `specs/0042-uygulama-plani.md` Q1–Q11). Uygulanıyor, dal `feat/0042-personel-hedef`. |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Personel gider kalemi, ödeme hedefleri, borç özeti, ödeme hatırlatıcısı, çalışan ekstresi, gider formu ve tanım formu, tasarım sözlüğü |
| **Bağımlı spec'ler** | 0001 (personel davranışı, tamam) · 0021 (ödeme hedefleri, tamam) · 0023 (ek ödemeler, tamam) · 0024 (ödeme hareketi, tamam) · 0041 (çok yöntemli ödeme, tamam) |
| **Revizyon** | R1 (QA turu, 2026-09-29): 16 bulgu işlendi, 5'i bloklayıcıydı. En önemlisi, spec'in icat ettiği veri göçü kaldırıldı (R8). R2 (2026-09-29, plan onayı): satırsız personel de okuma anında iki hedefe bölünür (R8/Q1); tek hedefli personelin adı "Çalışana" kalır (R15/Q2); satırlı personelde kaleme bağlı hareket hedef sırasıyla dağılır (R8/Q3); ödeme almış eski taksitli personel kalemi bölünmez (R8/Q4); boş elden vadesi resmi vadesini alır (R14/Q5); hatırlatıcı ve borç özeti kalem sayar (R6, R12/Q6); mahsup hedef seçimi mevcut taksit seçicisidir (R13/Q7); gizlilik deseni (R15/Q8); sözlük kuralının yeri (R10/Q9); liste rozeti (R5/Q10); görsel kanıt (Q11). |

---

## Intent

Bir gider kaleminin bütün parçaları aynı yoldan ödenmiyor. Personelde resmi kısım bankadan havale
ediliyor, elden verilen kısım nakit çıkıyor. Kirada da durum aynı: kira kiraya verene havale ediliyor,
stopaj vergi dairesine kredi kartıyla ödeniyor.

Bu ikisinden **kira zaten çalışıyor**. 0021 kira kalemini iki ödeme hedefine ayırdı (kiraya verene ve
vergi dairesine), her hedefin kendi vadesi ve kendi ödemesi var, dolayısıyla biri havale biri kredi
kartı olabiliyor. **Personelde böyle bir ayrım yok:** resmi ve elden tutar tek bir hedefte toplanıyor, tek
vade, tek kalan. Kullanıcı iki ayrı ödeme girebiliyor ama hangi ödemenin resmi hangisinin elden kısmı
kapattığı hiçbir yerde yazmıyor; "resmi kısmı ödedik, elden kalanı kaldı" cümlesi uygulamada kurulamıyor.

İkinci ve daha küçük konu ekranda: ödeme yöntemi gider formunda ve tekrarlayan gider tanımında beş
seçenekli bir düğme satırı olarak duruyor ve tek başına bir satır kaplıyor. Aynı seçim ödeme penceresinde
zaten açılır listeden yapılıyor. Aynı soru için iki farklı görünüm var ve geniş olanı en dar formda
duruyor.

Başarı şu demek: personel kalemi de kira gibi iki hedefle ödeniyor, her hedefin kendi ödemesi ve kendi
yöntemi oluyor; ve yöntem seçimi her yerde aynı, yer kaplamayan biçimde yapılıyor.

---

## Requirements

- **R1.** Personel kalemi **iki ödeme hedefi** taşır: **resmi** ve **elden**. Her hedefin kendi tutarı,
  kendi vadesi, kendi ödemesi ve kendi kalanı olur.
- **R2.** Hedef tutarları kalemin bugünkü alanlarından türetilir ve formülü şudur (0023 ek ödemeleri
  dahil):
  - `resmiKurus = resmiTutar + Σ ekOdemeler[].resmiTutar`
  - `eldenKurus = eldenTutar + Σ ekOdemeler[].eldenTutar`

  İkisinin toplamı `gider.js` `kalemKurus`'un personel dalına **tam eşittir** ve bu eşitlik testle
  sabitlenir (C1, AC-6).
- **R3.** Bir hedefin tutarı sıfırsa o hedef hiç görünmez ve kalem **satırsız** kalır, bugünkü davranışını
  aynen sürdürür (yalnız resmi ödenen çalışanda tek hedef). İkisi de sıfırsa kalem zaten kaydedilemez
  (0023: genel toplam sıfırdan büyük olmalı).
- **R4.** **İki hedefli personel kalemi, kira emsaliyle birebir aynı biçimde satırlı doğar.** Bugün
  `gider.js:230` `kiraIkiHedef = dav === DAVRANIS.KIRA && stK > 0` stopajlı kirayı her zaman satırlı
  yapıyor ve ödeme `taksitId` ile satıra, dolayısıyla hedefe bağlanıyor; satırsız kalemde ödemenin hedefi
  yoktur, sırayla dağıtılır. Personelde de resmi ve elden **ikisi de sıfırdan büyükse** kalem satırlı doğar
  (`personelIkiHedef`). Her hedef ayrı ödenir ve **ayrı ödeme yöntemi** taşıyabilir; ödeme 0024'ün hareket
  kaydıdır ve 0041'in `kasa.cokluOdemeDogrula`'sı hedef başına sınırı kendiliğinden uygular.
- **R5.** Kalemin ödeme durumu iki hedeften türetilir: ikisi de açık → ödenmedi, biri kapalı → kısmen,
  ikisi de kapalı → ödendi. **Yeni bir durum kavramı tanımlanmaz:** bu, 0021'in satırlı kalemde zaten
  gösterdiği "Kısmen ödendi n/m" rozetine ve 0024'ün hareketlerden türeyen durumuna bağlanır.
  **Uygulama (R2, Q10):** iki hedefli personel kalemi listede 0021'in "Kısmen ödendi n/m" rozeti ve "Ödeme planı"
  düğmesiyle gösterilir; kiradaki iki ayrı hedef anahtarı personelde kullanılmaz (hedef adları listede yazmaz).
- **R6.** Borç özeti, ödeme hatırlatıcısı ve çalışan ekstresi hedef bazında çalışır; **personel gizliliği
  korunur**: hedef kırılımı varsayılan olarak kapalıdır (0001 K21 kuralı). Ödeme hatırlatıcısının personel
  kuralı değişmez (R11).
  **Uygulama (R2, Q6):** hatırlatıcının personel satırındaki sayı ve borç özetinin çalışan kalem listesi kalem
  kimliğine göre tekilleştirilir (iki hedef aynı kalemi iki kez saydırmaz; 0003 AC-14 eşitliği).
- **R7.** Kira kalemindeki iki hedefli davranış **aynen korunur**; bu iş onu değiştirmez, personeli aynı
  desene getirir.
  **Triyaj (2026-09-29):** satırsız eski kirada her hedefin durumu artık kendi kalanından türer (eskiden kalemin genel
  durumunu kopyalıyordu). Kiraya veren ödenmiş, stopaj açıksa kiraya veren hedefi "Ödendi" olur; eskiden liste
  "Kısmen · kalan 0,00" yazıyordu. Bu bir düzeltmedir; kiranın hedefleri, tutarları ve dağıtımı değişmedi.
- **R8.** **Veri göçü yazılmaz.** Dönüşüm 0021 R13'ün kurduğu yoldan gider: eski personel kalemi okuma
  anında iki hedefle görünür, ilk kaydedildiğinde satırları kalıcı olur. `odemeSatirlariKur`'un
  `eskiHedef` dalı (`gider.js:233-237`) satırsız eski kalem ödenmişse hedef satırlarını ödenmiş olarak
  doğuruyor; 0024'ten beri ödeme durumu satıra yazılmadığı, hareketlerden türediği için taşınacak bir
  bayrak da yok. "Ödenen tutar önce resmi hedefe yazılır, artan elden hedefe geçer" kuralı
  `odemeleriUygula`'nın satırsız dalında (`gider.js:926-931`) **zaten vardır** ve yeniden yazılmaz.
  **Uygulama (R2, Q1, Q3, Q4):** `odemeHedefleri` ve `odemeleriUygula` satırsız dalı hedef listesi üzerinde çalışır
  (ANA → ELDEN → STOPAJ); satırsız iki tutarlı personel kalemi okuma anında resmi ve elden hedefiyle görünür,
  elden hedefinin vadesi yoktur. Satırlı personel kaleminde taksit seçilmeden girilmiş (kaleme bağlı) hareket
  hedef sırasıyla dağılır (önce resmi, hedef içinde vade sırası); kirada dağıtım değişmez. Elden satırı olmayan
  eski satırlı personel kaleminde ödeme almış ana satır varsa kalem **bölünmez**, tek hedefli kalır ve formda
  bunu söyleyen bir ipucu çıkar (hareketler ana satırlara bağlı; bölmek göç olurdu).
- **R9.** Ödeme yöntemi seçimi gider formunda (`GiderForm.jsx:244`) ve tekrarlayan gider tanımında
  (`SettingsGiderTanimlari.jsx:221`) **açılır listeye** taşınır; ödeme penceresindeki mevcut açılır liste
  değişmez.
- **R10.** Tasarım sözlüğüne (`docs/tasarim-sozlugu.md`) **ne zaman segment, ne zaman açılır liste**
  kullanılacağı kuralı **ölçüsüyle** yazılır: seçenek sayısı **dörtten fazlaysa** ya da etiketler uzunsa
  açılır liste; üç ve altındaki, birbirini dışlayan, kısa etiketli seçimler segment; sekme ve süzgeç
  çubukları her zaman segment (0014 birliği korunur). Ödeme yöntemi beş seçenekli olduğu için açılır
  listeye taşınır ve bu, kuralın ilk uygulaması olur.
- **R11.** Yöntem seçicinin görünümü değişir, **seçenekleri ve davranışı değişmez**: `ODEME_SECENEKLERI`
  beş seçenek olarak kalır, aynı varsayılan, aynı kayıt. **"Çek (ciro)" bu listede yer almaz** (0040 R19:
  elle seçilemez, yalnız Çek Portföyü'nden ciro edilirken atanır).
- **R12.** **Ödeme hatırlatıcısında personel yine bölüm başına tek toplu satırdır**
  (`odemeHatirlatma.js:44-53`, 0003 R3 ve AC-17). Satırın tutarı iki hedefin açık toplamı, vadesi en erken
  açık hedefin vadesidir; hedef kırılımı yalnız satır açılınca ve gizlilik kuralıyla görünür. Hedef başına
  ayrı satır gösterilmez, çünkü bu kayıt dışı ayrımı hatırlatıcı listesinde açığa çıkarırdı.
  **Triyaj (2026-09-29):** personel kalemi hatırlatıcıda gruplar arasında bölünmez; bir hedefi gecikmişse bütün açık
  hedefleriyle "vadesi geçmiş" grubuna, değilse eşik içindeki bir hedefi varsa "yaklaşan" grubuna bütün olarak girer
  (tutar açık hedeflerin toplamı, vade en erken açık vade). Kirada hedef başına gruplama (0021) değişmedi.
- **R13.** **Avanstan mahsup** (0024 B) hangi hedefi kapatacağını kullanıcıya sorar; varsayılan **ilk açık
  hedeftir** (resmi), çünkü mevcut dağıtım sırası budur. Avans borcu sınırı ve `mahsupDogrula`'nın kalan
  hesabı değişmez, yalnız hedef seçimi eklenir.
  **Uygulama (R2, Q7):** mahsup kipindeki taksit seçicisi (0024 B) personel satırlı olunca "Resmi / Elden"
  listeler; varsayılan ilk açık resmi satırıdır. Yeni kod yazılmaz.
- **R14.** **Vade için yeni sütun açılmaz.** Satırlı modelde her hedefin vadesi `taksitler[].vade`'dir.
  Kalemin `sonOdemeTarihi` alanı resmi hedefin ilk vadesi olarak kalır (bugünkü davranış:
  `GiderForm.jsx:31` `ana[0].vade`); elden vadesi yeni bir **form** alanıdır ve satıra yazılır.
  **Uygulama (R2, Q5):** elden vadesi boş bırakılırsa resmi vadesi kullanılır (`eldenVade || ilkVade`);
  tekrarlayan üretim bugünkü gibi vadesiz kalır.
- **R15.** Hedef adları ekranda **"Resmi"** ve **"Elden"** olur (kullanıcının kendi sözcükleri, 0001 ile
  aynı çizgi) ve `hedefAdi` üzerinden çözülür. C6 gereği bu adlar ve tutarları yazdırma ile dışa aktarma
  çıktılarına girmez; `tests/gider-gizlilik.test.js` yasaklı ad listesine `HEDEF.ELDEN` değeri ve
  `hedefAdi` çıktısı eklenir.

  **Uygulama (R2, Q2, Q8):** "Resmi" adı yalnız iki hedefli personel kaleminde kullanılır; tek hedefli personel
  "Çalışana" der (`hedefAdi` kalemi isteğe bağlı parametre olarak alır). Gizlilik testi `HEDEF.ELDEN`, `"elden"`,
  `hedefAdi` ve `personelHedefKurus` adlarını tarar.
  **Uygulama (R2, Q9):** R10 kuralı sözlükte `Segment` bölümünün "Ne zaman açılır liste?" alt başlığıdır; `Select`
  `tasarim.jsx` bileşeni olmadığı için dosya:satır örneği yerine düz metin atıf kullanılır.

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır; iki hedefin toplamı kalemin ödenecek tutarına **tam** eşittir.
- **C2.** **Tek gerçek kaynak:** hedef hesabı 0021'in `odemeHedefleri` yolundan geçer; personel için ikinci
  bir hedef hesabı yazılmaz.
- **C3.** Kalemin toplam tutarı, KDV'si, stopajı ve maliyete girişi değişmez; bu iş yalnız **ödeme**
  tarafını böler (0021 R5 ile aynı çizgi).
- **C4.** Maliyet ve kârlılık hesabı (0002) hedef ayrımından etkilenmez.
- **C5.** Yeni izin boyutu tanımlanmaz.
- **C6.** Personel gizliliği hiçbir yerde gevşemez; hedef adları ve tutarları yazdırma ve dışa aktarma
  çıktılarına girmez (`tests/gider-gizlilik.test.js` kapsamı genişler).
- **C7.** **Veri göçü yoktur** (R8). Yeni kalıcı **alan** da açılmaz: hedef vadeleri `taksitler[].vade`
  alanında durur (R14). Değişen tek kalıcı şey, `gider_taksitleri.hedef` sütununun taşıyabileceği
  **değer kümesidir** (C9), bu da yeni sütun gerektirmez.
- **C9.** `HEDEF` kümesi genişler: bugün `gider.js:114` `{ ANA: "ana", STOPAJ: "stopaj" }`. Buna
  **`ELDEN: "elden"`** eklenir; resmi kısım **ANA olarak kalır** (kimlik değişmez, yalnız `hedefAdi`
  personelde "Resmi" der). `_odenen` nesnesi hedef kimliğiyle anahtarlanır ve `odemeleriUygula`'nın
  dağıtımı sabit ana→stopaj sırası yerine hedef listesi üzerinde yürür. Paralel bir alan açılmaz ve
  `stopaj` anahtarı personel için yeniden anlamlandırılmaz (C2).
- **C8.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Kira hedeflerinin değiştirilmesi — *neden:* R7; bugünkü davranış doğru çalışıyor.
- **X2.** Normal (kira ve personel dışı) kalemlerin hedeflere bölünmesi — *neden:* orada borç tek
  alacaklıya, tek kalem; parça parça ödeme 0024 ile zaten var (0041).
- **X3.** Resmi ve elden kısmın ayrı ayrı makinaya atanması — *neden:* atama kalem düzeyindedir (0020) ve
  dağıtım tabanı resmi ile eldenin toplamıdır; ikiye bölmek maliyet hesabını değiştirir, bu iş ödeme
  tarafındadır.
- **X4.** Resmi kısım için bordro, SGK ya da damga vergisi hesabı — *neden:* uygulama beyan üretmez
  (0001 X3).
- **X5.** Uygulamadaki bütün segmentli seçicilerin açılır listeye çevrilmesi — *neden:* R10 kuralı yazar,
  bu iş yalnız ödeme yöntemi seçicisini dönüştürür; toplu dönüşüm gözden geçirilemez büyüklükte olur ve
  0014'ün sekme birliğini bozar.
- **X6.** Ek ödemelerin (mesai, prim) kendi başına ayrı hedef olması — *neden:* 0023'te ek ödeme maaşın
  parçasıdır; resmi ya da elden olmasına göre iki hedeften birine katılır.
- **X7.** Elden hedefinin taksitlendirilmesi — *neden:* `odemeSatirlariKur` bugün iki plan parametresi
  alıyor (`taksitSayisi` ana için, `stopajTaksitSayisi` stopaj için) ve üçüncü bir hedef üçüncü bir plan
  sorusu demektir. Elden ödeme uygulamada ay içinde tek seferdir. v1'de elden hedefi **tek satırdır** ve
  yalnız vadesi girilir; resmi hedef bugünkü `taksitSayisi` ile taksitlenir.

---

## Context

- **Kira bugün iki hedefli (doğrulandı).** `gider.js` içinde `HEDEF = { ANA, STOPAJ }` ve ödeme satırları
  `{id, hedef, sira, vade, tutar, odendi, odemeTarihi}`. Stopajı olan kira kalemi iki hedefle doğuyor,
  ödeme hareketi bir satıra bağlanıyor ve her hareket kendi `yontem` alanını taşıyor. Yani "kira havale,
  stopaj kredi kartı" bugün yapılabiliyor. Kullanıcının bunu bilmiyor olması ayrıca not edilmelidir;
  sürüm notunda tek cümleyle söylenmesi yeterli olabilir.
- **Personel tek hedefli.** `gider.js`'te personel kaleminin ödenecek tutarı `resmiTutar + eldenTutar`
  (0023 ile ek ödemeler de eklendi) ve tek bir ANA hedefe düşüyor. Ad çözümü motorda değil görünüm
  katmanındadır: `hedefAdi` **`src/components/gider/GiderAlanlari.jsx:160`**'ta ve personel için bugün
  "Çalışana" yazıyor. Bu yüzden iki ayrı yöntem girilse bile hangi ödemenin hangi kısmı kapattığı kayıtta
  yok.
- **İki hedef demek satırlı kalem demek (doğrulandı).** `gider.js:230`
  `const kiraIkiHedef = dav === DAVRANIS.KIRA && stK > 0;` stopajlı kirayı **her zaman** satırlı yapıyor;
  ödeme `taksitId` ile satıra bağlandığı için hedefi belli oluyor. Satırsız kalemde ödemenin hedefi
  yoktur: `odemeleriUygula` (`gider.js:926-931`) tutarı önce ANA hedefine, artanı ikinci hedefe dağıtır.
  R4 bu yüzden satırlı modeli seçiyor; yoksa "resmi havale, elden nakit" veride ayırt edilemezdi.
- **Göç gerekmiyor (doğrulandı).** `odemeSatirlariKur`'un `eskiHedef` dalı (`gider.js:233-237`) satırsız
  eski kalemi kaydedildiği anda hedef satırlarına çeviriyor ve kalem ödenmişse satırlar ödenmiş doğuyor
  (0021 R13, yorumda "veri taşıma yok" yazılı). 0024'ten beri ödeme durumu satıra yazılmıyor,
  hareketlerden türüyor (`gider.js:384`). Spec'in ilk taslağındaki bir kerelik göç (eski R8) bu yüzden
  kaldırıldı: göç, yedek geri yükleme yolunu (0024 triyajındaki `kasaGocuSaf.mjs` dersi), göç izini ve
  tekrar korumasını gerektirirdi.
- **Hatırlatıcıda personel toplanıyor (doğrulandı).** `odemeHatirlatma.js:44-53` personel kalemlerini
  **bölüm başına tek toplu satırda** topluyor (0003 R3, AC-17). Hedef başına satır göstermek bu bilinçli
  gizlilik kararını geri alırdı; R12 kuralı korur.
- **0041'in hazır kazancı.** 0041 ile gelen `kasa.cokluOdemeDogrula` (`kasa.js:128-154`) sınırı **hedef
  başına** uyguluyor ve hata metnindeki hedef adını dışarıdan enjekte edilen `hedefAdi` ile kuruyor. İki
  hedefli personel kalemi bu doğrulamayı kendiliğinden miras alır; bu işte yeniden yazılmaz.
- **Neden yeni bir kavram değil.** HEDEF mekanizması 0021'de kuruldu, 0024'te ödeme hareketiyle
  birleşti ve borç özeti, hatırlatıcı, ekstre bu yoldan besleniyor. Personeli aynı yola koymak yeni bir
  mekanizma değil, var olanın ikinci kullanıcısıdır. Ödemeye "resmi mi elden mi" diye ayrı bir etiket
  koymak ikinci bir yol açardı; C2 bunu yasaklıyor.
- **Dokunulan yerler.** `odemeHedefleri` çıktısını okuyan her yer etkilenir: gider listesi durum sütunu,
  borç özeti, ödeme hatırlatıcısı, çalışan ekstresi, ödeme penceresi hedef seçimi ve tekrarlayan üretim.
  Bu işin riski buradadır; testlerin bu beş tüketiciyi de kapsaması gerekir.
- **Yöntem seçici nerede (adıyla).** Açılır liste: ödeme kayıt penceresi ve çalışan avansı penceresi.
  Düğme satırı (`Segment`): **`GiderForm.jsx:244`** ve **`SettingsGiderTanimlari.jsx:221`** (ikincisinin
  etiketi 0041 ile "Varsayılan ödeme yöntemi" oldu). Aynı soru, iki görünüm. Dar formda beş düğmelik satır
  bir satır yer kaplıyor; açılır liste aynı işi tek alanda yapıyor. Dönüştürülecek yer bu ikisidir,
  üçüncüsü yoktur.
- **Sözlük borcu.** 0009 ile kurulan tasarım sözlüğü segmenti tanımlıyor ama "kaç seçenekten sonra açılır
  liste" sorusunu cevaplamıyor. Bu yüzden her yeni form kendi kararını veriyor ve görünüm yeniden
  çatallanıyor. R10, kuralı ekranın içinde değil sözlükte sabitliyor (0009'un kurduğu çalışma biçimi).

---

## Acceptance Criteria

- **AC-1.** Resmi ve elden tutarı olan personel kalemi iki hedefle görünür ve **satırlı** doğar.
- **AC-2.** Yalnız resmi tutarı olan personel kaleminde tek hedef görünür ve kalem satırsız kalır.
- **AC-3.** Resmi hedef havaleyle, elden hedef nakitle ödenebilir ve iki ödeme ayrı yöntemle kaydedilir.
- **AC-4.** Yalnız resmi hedef ödendiğinde kalem "kısmen" olur ve kalan elden tutarı gösterir.
- **AC-5.** İki hedef de ödendiğinde kalem "ödendi" olur.
- **AC-6.** İki hedefin toplamı kalemin ödenecek tutarına (`kalemKurus` personel dalı) tam eşittir.
- **AC-7.** Ek ödemenin (fazla mesai, prim, ikramiye) resmi kısmı resmi hedefe, elden kısmı elden hedefe
  katılır.
- **AC-8.** Borç özetinde personel hedef kırılımı varsayılan olarak kapalıdır.
- **AC-9.** Ödeme hatırlatıcısında personel **bölüm başına tek toplu satır** olarak kalır; satırın tutarı
  iki hedefin açık toplamı, vadesi en erken açık hedefin vadesidir.
- **AC-10.** Çalışan ekstresinde iki hedef ayrı okunur.
- **AC-11.** Hedef adları ve tutarları hiçbir yazdırma ve dışa aktarma çıktısında görünmez; gizlilik testi
  `HEDEF.ELDEN` değerini ve `hedefAdi` çıktısını da tarar.
- **AC-12.** Kira kaleminin iki hedefli davranışı değişmez.
- **AC-13.** Veri göçü yazılmaz: ödenmiş eski personel kalemi kaydedildiğinde iki hedefi de ödenmiş olarak
  doğar (`odemeSatirlariKur` `eskiHedef` yolu).
- **AC-14.** Kısmen ödenmiş eski personel kaleminde ödenen tutar okuma anında önce resmi hedefe yazılır,
  artan elden hedefe geçer (`odemeleriUygula` dağıtımı; yeni bir hesap yazılmaz).
- **AC-15.** Aynı kalem iki kez kaydedildiğinde ikinci bir hedef satırı ya da ödeme üretilmez.
- **AC-16.** Gider formunda ödeme yöntemi açılır listeden seçilir ve seçenekler aynıdır.
- **AC-17.** Tekrarlayan gider tanımında ödeme yöntemi açılır listeden seçilir.
- **AC-18.** Yöntem seçicinin değişmesi kaydedilen değeri değiştirmez (aynı kalem aynı yöntemle kaydedilir).
- **AC-19.** Makina maliyeti ve kârlılık hedef ayrımından etkilenmez.
- **AC-20.** Ödeme penceresinde hedef seçilebilir ve girilen tutar **o hedefin** kalanını aşamaz
  (0041 `cokluOdemeDogrula` hedef başına sınırı).
- **AC-21.** Bir personel kalemi tek pencerede iki satırla, iki hedefe ve iki yöntemle ödenebilir.
- **AC-22.** Avanstan mahsupta hedef seçilir; varsayılan ilk açık hedeftir ve avans borcu sınırı değişmez.
- **AC-23.** Elden hedefi taksitlendirilemez: formda elden için yalnız vade alanı vardır (X7).
- **AC-24.** Resmi hedef taksitlendirildiğinde elden hedefi tek satır olarak kalır.
- **AC-25.** Hedef vadeleri `taksitler[].vade` alanında saklanır; `giderler` tablosuna yeni vade sütunu
  eklenmez.
- **AC-26.** İki tutarı da sıfır olan personel kalemi kaydedilemez.
- **AC-27.** `HEDEF` kümesi genişlediğinde kira kaleminin ana ve stopaj satırları aynı kimliklerle çalışır
  (`gider_taksitleri.hedef` eski değerleri bozulmaz).
- **AC-28.** `ODEME_SECENEKLERI` beş seçenek olarak kalır ve "Çek (ciro)" yeni açılır listede yer almaz.
- **AC-29.** Tasarım sözlüğündeki segment ile açılır liste kuralı ölçüsüyle yazılıdır ve bu iş ona atıf
  yapar.

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hedef hesabı tek yerde (0021'in `odemeHedefleri` yolu); personel için ikinci hesap yazılmadı (C2).
- [ ] `odemeHedefleri` çıktısını okuyan beş tüketicinin (liste, borç özeti, hatırlatıcı, ekstre, ödeme
      penceresi) testleri güncellendi.
- [ ] **Veri göçü yazılmadığı** kaynak taramasıyla sabitlendi; dönüşüm 0021 R13 yolundan gidiyor ve
      tekrarı ikinci kayıt üretmiyor (AC-13, AC-14, AC-15).
- [ ] Hedef kümesi genişlemesi kira satırlarını bozmadı (AC-27) ve `_odenen` dağıtımı hedef listesi
      üzerinde genelleştirildi (C9).
- [ ] Ödeme hatırlatıcısının personel toplama kuralı korundu (AC-9); 0003 AC-17 regresyon testi yeşil.
- [ ] Gizlilik testi hedef alanlarını da kapsıyor (AC-11).
- [ ] `docs/tasarim-sozlugu.md` segment ile açılır liste kuralıyla güncellendi (R10).
- [ ] Görsel kanıt eklendi (`docs/evidence/0042-*.jpg`): iki hedefli personel kalemi, yeni yöntem seçici;
      aydınlık ve karanlık tema. **Yöntem seçicisinin görünümü bilerek değiştiği için**
      `docs/evidence/kanit-eslemesi.json`'da `GiderForm` ve `SettingsGiderTanimlari` kayıtları
      `beklenen: "degisti"` + `onay` (`Takım Yöneticisi · YYYY-AA-GG · spec 0042 R9`) taşır; spec `done`'a
      taşınırken bu kayıtlar `ayni`ye çevrilir (0009/0011 kuralı, `kanit-eslemesi.test.js`).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: personelin iki hedefi ve yöntem seçici kuralı yazıldı.
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
