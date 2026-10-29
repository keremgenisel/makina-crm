# 0118 — Manuel Satır Ekle penceresi: kalıbın kodu ve bekleyen tamirler

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2: QA turu ve plan turu Karar 35–44, 2026-10-29; uygulama commit `b395fb2`; plan `specs/done/0118-uygulama-plani.md`) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** Kalıp Üretim Formu'nun "Manuel Satır Ekle" penceresi (`stock/UretimSatirEkleModal.jsx`), onu açan ekran (`stock/UretimFormu.jsx`: pencerenin prop'ları ve dönem kapısı), satır modelindeki ölü alan (`stock/uretimFormModel.js`), iki yeni metin sabiti (`lib/kalipTamiri.js`). Tamir satırı ve bekleyen tamir ölçütü `lib/kalipTamiri.js`'ten okunur, orada yeni **kural** yazılmaz. **Kanıt ve test:** `tests/manuel-satir-0118.test.js`, `tests/ui/manuel-satir-0118.test.jsx`, `tests/fixtures/0115-veri.js` (ölü alanın dördüncü kopyası), `scripts/evidence/0009-sayfa.jsx` (dört yeni ekran), `docs/evidence/0118-piksel-raporu.json`. **Belge:** `CLAUDE.md`'nin 0115 bölümü, `specs/README.md`. |
| **Bağımlı spec'ler** | 0115 (tamir satırını, bekleyen ölçütünü ve bu pencerenin kaynak bağını kuran spec). **0117 tamamlandı** (commit `ad28cce`, `main` `6a5e7ad`), yani `specs/README.md`'nin "önce 0117 önerilir" notu geçmiştir; 0117 `UretimFormu.jsx`'in etiket düğmesini (`:490-495`) sildi, bu iş `:308-321` ve `:500-515` aralıklarına dokunur, ortak satır yoktur. 0116 ile ilgisi yoktur. Dokunulan dosyayı tarayan iki test var: 0101 AC-30 (`tests/kalip-capi-0101.test.js:131-136`, pencerede `kalipCapi` okuması) ve 0115'in manuel pencere blokları. 0050'nin pencere boyutu taraması (`tests/ui/form-pencere-boyutu.test.jsx:71-80`) yalnız gider ve kasa pencerelerini kapsar, bu pencere kapsamında değildir (ölçüldü). |
| **Ters çevrilen kriterler** | Yok, ölçüldü. 0115'in manuel pencere kriterleri (0115 AC-42, 0115 AC-41, 0115 AC-101, 0115 AC-102 ve "başka formda" triyajı) aynen geçerli kalır. **Bu, R15/2'nin seçimine bağlıdır:** 0115'in beş test çağrısı ekle düğmesini `/Satıra Ekle/` ile buluyor (`tests/ui/kalip-tamiri-0115-uretim.test.jsx:151, 160, 178, 180, 194`) ve beşi de sıfır ya da bir seçimli hâli sınıyor; metin yalnız çoklu seçimde değiştiği için beş çağrı da dokunulmadan geçer. Kapalı dönem kapısı (R16/2) bugünkü izin veren davranışı daraltır, ama o davranışı sabitleyen hiçbir test yoktur (ölçüldü), yani kriter ters çevrilmez. |

---

## Intent

Atölye kalıbı tornaya bağlarken CNC programını kalıbın koduyla buluyor, ama üretim formuna elle satır eklerken o kodu kendisi yazmak zorunda; pencere kalıbı biliyor, kodunu da biliyor, yine de alanı boş bırakıyor. İkincisi, aynı pencereden tamir eklenemiyor: bugün tamirleri forma getirmenin tek yolu bütün firmaların bekleyen tamirlerini toptan getiren düğme, oysa atölye çoğu zaman tek bir firmanın tek bir kalıbını eklemek istiyor. Takım Yöneticisi ikisini de bu pencerede çözmek istiyor. Bu iş bittiğinde kalıp seçilince kodu alana kendiliğinden gelir ve satırın kod sütununa yazılır, ve aynı pencerede o firmanın serviste bekleyen kalıpları listelenip üretim kalıplarıyla birlikte tek seferde forma eklenebilir.

---

## Requirements

### A. Kalıbın kodu

- **R1.** Pencerede **müşterinin kalıp listesinden** bir kalıp seçilince kod alanı o kalıbın katalogdaki koduyla dolar. Pencerenin katalog dalı (müşteri seçilmeden çizilen liste) bu kuralın dışındadır ve ön doldurma yazılmaz; o daldan ekleme yapılamıyor ve arama durumu hiç yazılmıyor (ölçüm 11).
- **R1/2.** Kod alanı yeni bir alan değildir: bugünkü üç manuel alandan "CNC Programı" girdisi (`torna`) kaldırılır ve **aynı ızgarada, aynı konumda** "Kalıp Kodu" etiketli alan açılır. Izgara üç alan kalır (Kalıp Kodu, Kalıp Ölçüsü, Makina Kalıp Çapı). Form durumundaki anahtar `kalipKodu`, satırdaki anahtar da `kalipKodu`'dur; pencere `kod` adıyla ikinci bir anahtar açmaz. Yer tutucu tek kalıpta `ör: KF-ADA-001` (kataloğun kendi yer tutucusu, `KalipManager.jsx:122`), çok kalıpta `Her kalıp kendi kodunu kullanır` (ölçü alanının bugünkü deseni).
- **R2.** Alan düzenlenebilir kalır; kullanıcının yazdığı değer ön doldurmanın üstüne yazar ve korunur.
- **R2/2.** Önceliğin tek kuralı: **tek kalıp seçiliyken alan o satırın kodunun kendisidir** (yazılan değer, boşaltılmışsa boş değer, olduğu gibi satıra yazılır); **birden çok kalıp seçiliyken alan yok sayılır** ve her satır kendi kalıbının katalog kodunu alır. Ölçü alanının bugünkü önceliği (`k?.olcu || draftRow.kalipOlcusu`, `UretimSatirEkleModal.jsx:89`) bu işte **değişmez**; iki alanın önceliği bilinçli olarak ayrışır (X8).
- **R3.** Birden çok kalıp seçiliyse alan boşalır ve eklenen her satır kendi kalıbının kodunu alır. Bu, aynı penceredeki ölçü alanının bugünkü davranışının aynısıdır.
- **R3/2.** "Birden çok kalıp" sayımı **yalnız seçili üretim kalıplarını** sayar; seçili tamir sayısı kod alanını ve ölçü alanını etkilemez (R14/2).
- **R4.** Alana yazılan değer eklenen satırın kod sütununa yazılır; pencere ikinci bir yere kod yazmaz.
- **R5.** Seçilen kalıbın katalogda kodu yoksa alan boş kalır ve altında kodun nereden girileceğini söyleyen bir ipucu çıkar. İpucu engel değildir, satır yine eklenir.
- **R5/2.** İpucunun metni, yeri ve bastırıldığı durumlar: metin `Bu kalıbın katalogda kodu yok. Ayarlar › Katalog › Kalıp Modelleri'nde girebilirsiniz.`, yeri **kod alanının hemen altı**, görünürlüğü **yalnız tek kalıp seçili** iken. Çok kalıp seçiliyken alan bilinçli boştur ve ipucu çizilmez. Kalıbın adı katalogda hiç bulunamıyorsa (`def` yok, `UretimSatirEkleModal.jsx:33`) **aynı** metin çıkar, ikinci bir metin yazılmaz. Panelin ekrandaki adı "Kalıp Modelleri"dir (`Settings.jsx:54`); "Kalıplar" yazılmaz.
- **R6.** Bugün hiçbir ekranda ve hiçbir çıktıda görünmeyen eski alan (`torna`) kaldırılır; yerine ikinci bir görünmez alan açılmaz.
- **R6/2.** Ad tuzağı: ekranın ve çıktının "Kalıp CNC Torna Ölçüleri" sütunu `torna`'yı değil `makinaKalipCapi`'yi basıyor (başlık `UretimFormu.jsx:434` ve hücre `:467`; çıktıda başlık `uretimFormPrint.js:48` ve hücre `:73`). O sütun, başlığı ve hücresi **dokunulmaz**; kaldırılan yalnız pencerenin girdisi ve satır modelindeki anahtardır.

### B. Bekleyen tamirler

- **R7.** Pencerede müşteri seçilince, o firmanın serviste bekleyen kalıpları kalıp listesinin altında ayrı bir bölümde listelenir.
- **R7/2.** Bölümün yeri: **sağ sütunda, kalıp listesinin hemen altında**, kendi kaydırmasıyla (kalıp listesinin `maxHeight: 268` deseni). Müşteri değişince (`pickMusteri`) tamir seçimi de **sıfırlanır**; bugün yalnız kalıp seçimi sıfırlanıyor (`UretimSatirEkleModal.jsx:49`), seçim taşınırsa başka firmanın tamiri eklenebilir.
- **R7/3.** Süzme **kayıt düzeyindedir:** `String(servis.customerId) === String(seçili kaydın id'si)`. Sol panel firmaları değil makina kayıtlarını listeler (aynı firmanın iki makinası iki satırdır, `:128-140`), bu yüzden aynı firmanın başka makinasının tamiri o satır seçilince görünür. Karşılaştırma dize ile yapılır; toptan getirme düğmesinin `Number(servis.customerId)` emsali (`UretimFormu.jsx:316`) sayısal kimliklerde aynı sonucu verir ama dize kimlikte çökmez.
- **R8.** Her giriş kalıbın adı, ölçüsü ve servis tarihiyle çizilir.
- **R8/2.** Satır metni `<ad> · <ölçü> · <fmtTR(servis.date)>`; boş ölçü atlanır (kalıp listesinin `filter(Boolean).join(" · ")` deseni, `UretimSatirEkleModal.jsx:181`). Servis türü yazılmaz. Tarih biçimi `fmtTR` (12/10/2026), yani satırın formdaki kaynak metniyle aynı biçim (`tamirKaynakMetni`); çıktının `fmtDate` biçimi (12.10.2026) burada kullanılmaz, yoksa kullanıcı aynı tarihi iki biçimde görür.
- **R9.** Girişler kalıplar gibi işaretlenerek seçilir ve "Satıra Ekle" ile forma eklenir.
- **R9/2.** Seçim kümesinin anahtarı `kalipTamiri.tamirAnahtari(servis.id, giris.id)`'dir (`kalipTamiri.js:127`); pencere ada, sıraya ya da ikinci bir anahtara göre seçim tutmaz. Giriş adı serbest giriştir, yani iki ayrı servisin aynı adlı girişi olabilir.
- **R10.** Eklenen satır tamir türünde doğar ve servis bağını taşır.
- **R10/2.** Mekanizma: rozet ve bitti işaretleme **kayıtlı** formların haritasından okunur (`tamirSatirHaritasi`), yani pencereden eklenen satır **form kaydedildikten sonra** bugünkü gibi çalışır. Kargo etiketi servis kaydından basılır ve bu satırdan etkilenmez: 0117 R11 ile düğme üretim formundan kalktı, bugün panonun servis kartında ve Makina Geçmişi'nin servis satırındadır. Üretim formunda etiket aranmaz.
- **R11.** Bekleyen tamiri olmayan firmada bölüm boş durum metniyle çizilir.
- **R11/2.** Metinler tek yerden gelir (0115 R39): boş durum `kalipTamiri.TAMIR_YOK`'u yeniden kullanır ("Bekleyen tamir yok.") ve altına ikinci satır olarak tamirin nereden doğduğunu yazar (servis formundaki kalıp kutusu); bölüm başlığı için `kalipTamiri.js`'e tek sabit eklenir (`MANUEL_TAMIR_BASLIGI = "SERVİSTE BEKLEYEN KALIPLAR"`). Pencere bu iki metni satır içi yazmaz.
- **R12.** Herhangi bir canlı üretim formunda satırı olan tamir bu listede görünmez; ölçüt toptan getirme düğmesinin ölçütüyle aynıdır ve pencere kendi kuralını yazmaz.
- **R12/2.** Pencere ölçütü **çağırmaz**, ekranın hazır sonucunu prop olarak alır: `UretimFormu`'nun `bekleyenler` dizisi (`[{ servis, giris }]`, `UretimFormu.jsx:309`). O hesabın haritası açık formun **taslağını** içerir (`[...uretimFormlari.filter(f => f.id !== form.id), form]`, `:308`), yani bu oturumda eklenip henüz kaydedilmemiş tamir de listeden düşer. Pencere `services` ve `uretimFormlari` almaz; `bekleyenTamirler(`, `tamirSatirHaritasi(` ve `atolyeKaliplari` pencerede hiç geçmez (R22 taraması). Aksi hâlde kullanıcı aynı tamiri ekler, pencereyi yeniden açar, tamir yine listede görünür ve aynı forma ikinci satır doğar.
- **R13.** Tamirler tarihe göre süzülmez; bugünkü bekleyen kuralında tarih süzgeci yoktur.
- **R14.** Üretim kalıbı ve tamir aynı seçimde birlikte seçilebilir ve tek seferde eklenir.
- **R14/2.** Üç manuel alan (kod, ölçü, makina kalıp çapı) **yalnız üretim satırlarına** uygulanır. Tamir satırı tek kurucudan doğar (C1) ve kodunu da ölçüsünü de o kurucu yazar (`kalipTamiri.js:169, 171`); pencere kurucunun çıktısını sonradan değiştirmez.
- **R15.** Ekle düğmesinin metni seçilen kalıp ve tamir sayısını birlikte sayar; hiçbiri seçilmemişken düğme pasiftir.
- **R15/2.** Metnin tam kuralı: toplam seçim **0 ya da 1 iken `Satıra Ekle`** (bugünkü metin, değişmez), toplam **1'den büyükken `<n> Satır Ekle`** (sayı kalıp ve tamiri birlikte sayar). Bugünkü "<n> Kalıp Ekle" metnindeki "Kalıp" sözcüğü kalkar, çünkü seçim tamir de içerebilir. 0/1 metninin korunması 0115'in beş test çağrısını dokunulmadan geçirir (başlık satırı).
- **R16.** Dönemi sonlandırılmış formda ekleme reddedilir ve nedeni söylenir.
- **R16/2.** Bu kapı **bu işte açılır, bugün yoktur:** `openAddModal` (`UretimFormu.jsx:321`) ve pencerenin `onAdd`'i (`:514`) dönemi hiç denetlemiyor, yani kapalı döneme manuel satır bugün eklenebiliyor. Kapalı dönemde pencere **açılmaz** ve diğer iki yolla **birebir aynı** metin basılır: `Bu dönem sonlandırılmış, yeni kalıp eklenemez.` (`:227` ve `:312`). Ekrandaki şerit zaten "Düzenleyebilir ama yeni kalıp ekleyemezsiniz." diyor (`:374`), yani kapı ekranın sözünü tutar.

### C. Pencere, kaynak ve kanıt (QA turu, 2026-10-29)

- **R17.** Pencere **geniş** açılır (`wide`, 900 × 94vh) ve kendi sayısını yazmaz. Ölçüm 12: bugünkü `width={780}` **ölü bir prop**, `Modal`'ın imzasında `width` yok (`ui.jsx:440`), yani pencere dar varsayılanda (520 × 90vh) çiziliyor ve `260px 1fr` ızgarasının sağ sütunu yaklaşık 190 piksel kalıyor. Tasarım sözlüğü bu sınıfı yazıyor (`docs/tasarim-sozlugu.md:290-293`): veri girme pencereleri Sınıf 1'dir, `wide` geçer, `maxWidth`/`maxHeight` yazmaz, "yeni bir veri girme penceresi de bu sınıfta açılır". Görünüm bilinçli değişir, yani kanıt kaydı `beklenen: "degisti"` ve onay satırı taşır.
- **R18.** Pencere `tasarim.jsx`'i **içe aktarmaz**; ipucu (R5/2) ve boş durum (R11/2) pencerenin bugünkü satır içi deseniyle çizilir (bugünkü "Bu müşteriye ait kayıtlı kalıp yok" boş durumu da satır içidir, `UretimSatirEkleModal.jsx:160-163`). Gerekçe ölçülmüş bir kapıdır: `tests/tasarim-kaynak.test.js:141-144` "`tasarim.jsx`'i kullanan her dosya" ile `docs/evidence/kanit-eslemesi.json` anahtarları arasında **eşitlik** kuruyor; pencerenin bugün anahtarı yok, yani bir `Ipucu` ya da `BosDurum` içe aktarımı bu işe yeni bir eşleme anahtarı, kendi piksel raporu ve pencerenin bütün hâllerinin iki temada çekimini ekler. Pencere 0015 ve 0016 taramalarının kapsamında değildir (`tests/form-kaynak.test.js:17-19`, `tests/liste-kaynak.test.js:14-18`), yani satır içi kalmak hiçbir kuralı çiğnemez.
- **R19.** Ölü alanın taraması `src/` ve `electron/` kapsamındadır. Alan dördüncü bir yerde daha duruyor: `tests/fixtures/0115-veri.js:35`'in satır yardımcısı. O anahtar da kaldırılır; ölçüm 13, kaldırmanın 0115 altınını bozmadığını gösteriyor.
- **R20.** Eklenen satırların sırası: önce seçilen üretim kalıpları, sonra tamirler, ikisi de listenin **sonuna** (0115 R24/2 deseni). Pencere ekleme sonrası **bildirim basmaz** (bugünkü davranış: `addRows` yalnız `onAdd` ve `onClose` çağırıyor, `UretimSatirEkleModal.jsx:96-97`); pencerenin kapanması geri bildirimdir. İki toplama düğmesinin bildirimleri değişmez.
- **R21.** Kapanış bekçisi: pencerenin satır üreten yolu **iki** kalır (üretim için `emptyRow()` tabanlı kurucu, tamir için `tamirSatiriKur`) ve manuel alan sayısı **üç** kalır. Üçüncü bir kaynak ya da dördüncü bir alan testi kırar.
- **R22.** Adlar: testid'ler `manuel-tamir-bolumu`, `manuel-tamir-giris`, `manuel-tamir-bos`, `manuel-kod-ipucu`, `manuel-ekle-dugmesi`; test dosyaları `tests/manuel-satir-0118.test.js` (saf kurallar ve taramalar) ile `tests/ui/manuel-satir-0118.test.jsx` (pencere ve gerçek `UretimFormu`). Tarama şunu sabitler: `UretimSatirEkleModal.jsx` içinde `bekleyenTamirler(`, `tamirSatirHaritasi(`, `tamirAnahtari(` **tanımı** ve `atolyeKaliplari` geçmez; `tamirSatiriKur(` tam **bir kez** geçer; `torna` hiç geçmez.

---

## Zorunlu kısıtlar

- **C1.** Tamir satırı tek kurucudan doğar (0115'in `tamirSatiriKur`'u); pencere satırı alan alan kendisi kurmaz.
- **C2.** "Bekleyen tamir" ölçütü tek yerde kalır (0115'in `bekleyenTamirler`'i); pencere onu firmaya göre yalnız **süzer**, yeniden tanımlamaz.
- **C3.** Yeni kalıcı alan yok. Kaldırılan ölü alan satırların JSON'unda yaşayabilir; okunmadığı için göç yazılmaz.
- **C4.** Yeni eylem izni, yeni veri bölümü ve yeni sunucu kuralı yok. Pencere servis kaydına hiçbir şey yazmaz, yalnız okur.
- **C5.** Kalıbın kodu kataloğun alanıdır; pencere kod üretmez, türetmez ve kataloğa yazmaz.
- **C6.** 0115'in "başka bir canlı formda satırı olan kalıp seçilemez" kuralı kalıplar için aynen durur; tamirler için aynı korumayı bekleyen ölçütü zaten sağlar.
- **C7.** Pencerenin bugünkü iki bağı (kapat, satır ekle) korunur; pencere forma doğrudan yazmaz.
- **C8.** Para yok: bu işte hiçbir tutar okunmaz ya da yazılmaz.
- **C9.** Bekleyen tamirin tek kaynağı ekranın hesabıdır (R12/2). Pencere ikinci bir hesap kurmaz, ikinci bir harita gezmez.
- **C10.** Pencerenin iki yeni metni (bölüm başlığı ve boş durum) `lib/kalipTamiri.js`'te durur (0115 R39). Ekrana yazılan üçüncü bir kopya yoktur.
- **C11.** Kalıbın kodu kataloğun alanıdır ve pencerenin ön doldurması **tek yönlüdür:** okunur, kataloğa geri yazılmaz (C5'in uygulaması). Ölçü alanının önceliği bu işte değişmez; kod ile ölçünün önceliğinin ayrışması bilinçlidir ve X8'de yazılıdır.

---

## Kapsam dışı

- **X1.** Pencereden yeni servis kaydı açmak — *neden:* Takım Yöneticisi bu seçeneği değerlendirip reddetti; servis formunun tamamı (ücret, parça, garanti) pencereye girerdi ve ölçtüm, servis bölümünü yazmak Müşteriler, Bayiler, Ayarlar ya da Servis sekmelerinden birini istiyor, yani yalnız Stok sekmesi olan kullanıcı 403 alır ve sunucu kuralı da değişmek zorunda kalır. İstenirse kendi spec'ini hak eder.
- **X2.** Katalogdaki kod alanının toplu doldurulması — *neden:* veri girişidir, kod işi değildir; nerede boş olduğu ölçüldü ve aşağıda yazılı.
- **X3.** CNC programı için ayrı bir sütun ya da çıktı alanı — *neden:* ölçtüm, alan bugün hiçbir ekranda ve çıktıda yok ve kalıbın kodu zaten kendi sütununda basılıyor; ikinci bir sütun aynı rakamı iki kez gösterirdi.
- **X4.** "Bekleyen Tamirleri Getir" düğmesinin kaldırılması — *neden:* hepsini toptan getirme yolu işe yarıyor; bu pencere seçmeli ve firma bazlı ikinci yoldur.
- **X5.** Tamirin servis kaydından silinmesi ya da düzenlenmesi — *neden:* tamirin tek sahibi servis kaydıdır (0115 C1); pencere okuyucudur.
- **X6.** Kalıbın adıyla katalog eşlemesinin değiştirilmesi — *neden:* bugünkü eşleme ad üzerinden çalışıyor ve bu işte dokunulmuyor.
- **X7.** Müşterisi bulunamayan tamirin pencereden erişilebilmesi — *neden:* ölçtüm, `bekleyenTamirler` çöpte olmayan bütün servisleri tarıyor, ama müşterisi silinmiş servisin tamiri hiçbir firma satırında görünmez (seçilecek satır yok). Toptan getirme düğmesi onu yine getirir ve satırı boş firma adıyla kurar. Bilinen sınır, bu işte kapatılmıyor.
- **X8.** Ölçü alanının önceliğinin düzeltilmesi — *neden:* bugünkü kural kalıbın değerini üstün tutuyor (`k?.olcu || draftRow.kalipOlcusu`), yani kullanıcının yazdığı ölçü, kalıbın kayıtlı ölçüsü varken yok sayılıyor. Aynı deliği kodda açmıyoruz (R2/2), ama ölçünün kuralını değiştirmek 0115'ten beri süren davranışı ters çevirir ve kendi spec'ini hak eder (açık bulgu).
- **X9.** Pencerenin tasarım sözlüğüne dönüştürülmesi — *neden:* R18'de ölçüldü; dönüşüm bu küçük işe bir kanıt turu (yeni eşleme anahtarı ve piksel raporu) ekler. Pencerenin bütün üslubu satır içidir, sözlüğe geçişi kendi işidir.

---

## Ölçümler (2026-10-27 yedeği, bugünkü kod)

1. Pencerenin üçüncü manuel alanı (`torna`) kaynakta üç yerde geçiyor: satır modeli (`uretimFormModel.js:16`), pencerenin girdisi (`UretimSatirEkleModal.jsx:209`) ve satır kurucusu (`:88`); dördüncü kopya test fikstüründedir (ölçüm 13). **Hiçbir ekranda ve hiçbir çıktıda basılmıyor** (kaynak taraması): ekran tablosunda **altı veri sütunu ve bir işlem sütunu** var (`colSpan={7}`, `UretimFormu.jsx:432-439`), çıktıda altı sütun (`uretimFormPrint.js:44-49`) ve bu alan ikisinde de yok.
2. Canlı veride bu alanı dolu satır **yok** (tek canlı form, tek satır).
3. Pencere satıra kalıbın kodunu **zaten yazıyor** (`UretimSatirEkleModal.jsx:80`, `kalipKodu: k?.kod || ""`), katalogdan okuyarak; yani kod satırın kod sütununa bugün de kendiliğinden giriyor. (İlk turda `:84` yazmıştım, o satır müşteri adıdır; dosya 0115'ten beri değişmedi.)
4. **Kataloğun kodu çoğunlukla boş:** 81 canlı kalıp tanımının **24'ünde** kod var. 4.857 müşteri kalıp satırının tamamı katalogla adından eşleşiyor ama yalnız **20'si** kodu dolu bir tanıma denk geliyor. Yani ön doldurma bugün satırların binde dördünde değer üretir; gerisi ancak Ayarlar › Katalog › Kalıplar'da kod girildikçe dolar. Bu bir engel değil, beklentinin ölçüsüdür.
5. Tamir satırını kuran fonksiyon ve bekleyen ölçütü 0115'te hazır; pencere ikisini de çağırabilir.
6. Pencere bugün servisleri ve üretim formlarını almıyor; onu açan ekran ikisini de zaten hesaplıyor (bekleyen tamir listesi ve canlı formların tamir haritası), yani yeni hesap değil, var olan sonucun iletilmesi gerekiyor.
7. Canlı veride bekleyen tamir **yok**: 883 canlı servisin hiçbirinde kalıp listesi yok (0115 yeni yayınlandı). Yani bölüm ilk gün boş durumla açılır ve boş durum metni gerçekten görünen hâldir.
8. Ölçü alanı bugün tek kalıpta o kalıbın ölçüsüyle doluyor, çok kalıpta boşalıyor ve yer tutucusu nedenini yazıyor; R3 aynı deseni koda uygular.
9. 0115'in manuel pencere kriterleri (başka formda olan kalıbın pasif çizilmesi, kaynak bağının yazılması) bu işte korunur; pencereye bölüm eklemek onları etkilemiyor.

### QA turu ölçümleri (2026-10-29)

10. **Ad tuzağı ölçüldü:** ekranın ve çıktının "Kalıp CNC Torna Ölçüleri" sütunu `torna`'yı değil `makinaKalipCapi`'yi basıyor (başlık `UretimFormu.jsx:434`, hücre `:467`; çıktıda `uretimFormPrint.js:48` ve `:73`). "CNC" sözcüğünü arayan geliştirici yanlış sütunu siler; R6/2 sütunu dokunulmaz ilan ediyor.
11. **Pencerenin katalog dalı ölü:** `kalipSearch` durumu hiç yazılmıyor (`const [kalipSearch] = useState("")`, `UretimSatirEkleModal.jsx:15`) ve katalog dalı yalnız müşteri seçilmemişken çiziliyor (`:39-44`), o hâlde de ekleme kapalı (`addRows` müşteri ister, `:74`). R1 ön doldurmayı yalnız müşterinin kalıp listesine bağlıyor.
12. **Pencere 780 değil 520 piksel:** `width={780}` (`:104`) ölü bir prop, `Modal` imzası `title, onClose, children, footer, wide, maxWidth, maxHeight, overflowVisible` (`ui.jsx:440`). Sağ sütun yaklaşık 190 piksel kalıyor ve kalıp listesi orada (`maxHeight: 268`). 0050'nin boyut taraması bu pencereyi kapsamıyor (`tests/ui/form-pencere-boyutu.test.jsx:71-80`, yalnız gider ve kasa pencereleri), yani R17 test borcu doğurmaz.
13. **Ölü alanın dördüncü kopyası ve altın:** `tests/fixtures/0115-veri.js:35` satır yardımcısı `torna: ""` taşıyor. Fikstürün başlığı "veriyi değiştirmek altını geçersiz kılar" diyor, ama `tests/fixtures/0115-once.json` içinde `torna` dizesi **hiç yok** (ölçtüm), yani anahtarı kaldırmak altını bozmaz.
14. **Kapalı dönem kapısı yok:** `openAddModal` (`UretimFormu.jsx:321`) ve `onAdd` (`:514`) `form.kapali`'yı hiç okumuyor; iki toplama düğmesi okuyor (`:227`, `:312`). Ekrandaki şerit ise "Düzenleyebilir ama yeni kalıp ekleyemezsiniz." diyor (`:374`). Bugünkü izin veren davranışı sabitleyen hiçbir test yok (tarama), yani R16/2 kriter ters çevirmez.
15. **Ekle düğmesinin metni beş test çağrısının hedefi:** `tests/ui/kalip-tamiri-0115-uretim.test.jsx:151, 160, 178, 180, 194` düğmeyi `/Satıra Ekle/` ile buluyor ve beşi de sıfır ya da bir seçimli hâli sınıyor; hiçbir test "2 Kalıp Ekle" metnini iddia etmiyor. R15/2 bu yüzden yalnız çoklu seçim metnini değiştiriyor.
16. **Bekleyen hesabının haritası açık formun taslağını içeriyor** (`UretimFormu.jsx:308`), yani ekranın `bekleyenler` sonucu bu oturumda eklenmiş ama kaydedilmemiş tamiri de düşüyor. Pencere ölçütü kendisi çağırırsa bu koruma kaybolur ve aynı tamir aynı forma ikinci kez eklenebilir; R12 ve AC-19 bunu yakalamaz, çünkü ikisi de **başka** formu sınıyor.
17. **Sol panel firmaları değil makina kayıtlarını listeliyor** (`UretimSatirEkleModal.jsx:128-140`, ad ve model yan yana), yani aynı firmanın iki makinası iki satırdır; kalıp listesi de o kaydın `kaliplar`'ıdır. Toptan getirme düğmesi müşteriyi `Number(servis.customerId)` ile çözüyor (`UretimFormu.jsx:316`). R7/3 süzmeyi kayıt düzeyinde ve dize karşılaştırmasıyla sabitliyor.
18. **Müşteri değişince yalnız kalıp seçimi sıfırlanıyor** (`pickMusteri`, `UretimSatirEkleModal.jsx:49`); ikinci bir seçim kümesi eklenirse sıfırlama da genişlemeli (R7/2).
19. **Tasarım sözlüğü kapısı:** `UretimSatirEkleModal.jsx` `tasarim.jsx`'i içe aktarmıyor ve `docs/evidence/kanit-eslemesi.json`'da anahtarı yok (83 dosya, stok altında yedi dosya kayıtlı, bu yok). `tests/tasarim-kaynak.test.js:141-144` eşitlik kuruyor, yani bir `Ipucu` ya da `BosDurum` içe aktarımı yeni eşleme anahtarı ve kendi piksel raporunu zorunlu kılar (R18).
20. **Metin kaynakları hazır:** `kalipTamiri.TAMIR_YOK` ("Bekleyen tamir yok.", `kalipTamiri.js:27`) toptan getirme düğmesinin de bastığı metindir; seçim anahtarı `tamirAnahtari` (`:127`) ve tamir satırının tek kurucusu `tamirSatiriKur` (`:165`) yerinde. Tamirin kodunu ve ölçüsünü kurucu kendisi yazıyor (`:169`, `:171`), yani manuel alanların tamir satırına uygulanması C1'i çiğner (R14/2).
21. **Tarih biçimi iki tane:** `fmtTR` (12/10/2026; satırın kaynak metni `tamirKaynakMetni` onu kullanıyor) ve `fmtDate` (12.10.2026; üretim formu çıktısı). Pencere ikisini de içe aktarmıyor; R8/2 `fmtTR`'yi seçiyor.
22. **Pencere ekleme sonrası bildirim basmıyor** (`addRows`, `:96-97`), iki toplama düğmesi basıyor. R20 bugünkü davranışı koruyor.
23. **Tamir satırı kalıp durumu haritasına girmiyor** (0115 C6 doğrulandı): `musteriDurumu.satirAnahtari` tanımadığı kaynak türüne `null` dönüyor (`musteriDurumu.js:53-57`), yani `uretimFormHaritasi` tamir satırını hiç görmez. AC-18 bu işte yeni kod istemiyor.
24. **Kapalı dönemdeki form bağı canlı tutuyor:** ne `uretimFormHaritasi` ne `tamirSatirHaritasi` `kapali`'ya bakıyor (yalnız `deletedAt`), yani kapalı formdaki tamir bekleyen sayılmaz. R12 bunu 0108 AC-18 ile aynı kuralla devralıyor.
25. **0101 AC-30 pencereyi tarıyor:** `tests/kalip-capi-0101.test.js:131-136` `UretimFormu.jsx` ve `UretimSatirEkleModal.jsx` içindeki `X.kalipCapi` okumalarının yalnız `c.kalipCapi` ya da `cust?.kalipCapi` olmasını istiyor. Tamir yolu çapı kendisi okumamalı; `tamirSatiriKur` zaten `musteri?.kalipCapi`'yi kendi içinde okuyor (`kalipTamiri.js:171`).
26. **Kanıt fikstürü hazır:** `tests/fixtures/0115-veri.js` kodlu bir kalıp (`HAMBURGER`, `KALIP_DEFS` içinde kod `HB-98`) ve kodsuz bir kalıp (`KASAP KÖFTE`, katalogda karşılığı yok) taşıyor, yani R5'in iki dalı için yeni fikstür gerekmiyor. Kanıt aracının adımları da yeterli: `dugme:` metni içeren düğmeyi, `tikla:` çocuğu olmayan birebir metni buluyor (`scripts/evidence/0009-sayfa.jsx:1628-1646`).
27. **Yeniden doğrulanamayan ölçümler:** ölçüm 2, 4 ve 7 canlı veri sayılarıdır. Bu turda yerel veritabanı (`~/Library/Application Support/makina-crm/`), proje kökünde `*.db` ve yedek JSON bulunamadı; üçü 2026-10-27 yedeğine dayalı olarak kabul edildi, yeniden ölçülmedi. Kodla doğrulanabilen her ölçüm doğrulandı.

---

## Kararlar (Takım Yöneticisi, 2026-10-29)

1. **Bekleyen tamirler o firmaya süzülerek pencerede listelenir** (analistin önerisi, Takım Yöneticisi kabul etti). Servis bağı korunur, yani rozet, bitti işaretleme ve kargo etiketi çalışmaya devam eder.
2. **Pencereden yeni servis kaydı açılmaz** (X1). Takım Yöneticisi seçenekleri gördükten sonra süzülmüş listeyi seçti.
3. **Kod alanı ön doldurulur ve satırın kod sütununa yazılır; görünmeyen eski alan kaldırılır** (analistin önerisi). Gerekçe ölçümdür: istenen "kalıbın kodu o alana gelsin"dir, ama o alan bugün hiçbir yerde görünmüyor, yani yalnız ön doldurmak hiçbir şeyi değiştirmezdi. **Takım Yöneticisi bu kararı tek satırda geri çevirebilir;** iki seçenek de ölçüldü:
   - *Seçenek B:* alan yalnız ön doldurulur, yazdığı yer değişmez. Maliyeti sıfır, görünür etkisi de sıfır. Önermiyorum.
   - *Seçenek C:* alan kendi sütununu kazanır (ekranda ve çıktıda yedinci sütun). Kalıbın kodu zaten kendi sütununda basıldığı için aynı rakam iki kez görünür ve çıktının altı sütunlu düzeni değişir. Önermiyorum.
4. **Kodu olmayan kalıpta ipucu çıkar, engel çıkmaz** (analistin önerisi). Ölçüm 4 gösteriyor ki bugün kalıpların çok büyük kısmında kod yok; kullanıcı alanın neden boş geldiğini ekrandan öğrenmezse özelliği bozuk sanır.
5. **Üretim ve tamir aynı seçimde eklenebilir** (analistin önerisi). Atölye tek pencerede iş topluyor; iki ayrı tura bölmek pencereyi iki kez açtırır.

### QA turunda verilen kararlar (2026-10-29)

6. **Kod alanı yeni bir alan değil, "CNC Programı" girdisinin yerine geçer** (R1/2). Etiketi "Kalıp Kodu", anahtarı `kalipKodu`, ızgara üç alan kalır. *Gerekçe:* adlandırılmamış alan iki geliştiriciye iki şey yazdırır; yeni bir alan açmak R6'yı çiğner ve X3'ün reddettiği "ikinci sütun" durumuna düşer.
7. **Önceliğin tek kuralı: tek kalıpta alan satırın kodunun kendisidir, çok kalıpta yok sayılır** (R2/2). *Gerekçe:* ölçü alanının bugünkü deseni (kalıp kazanır) koda uygulanırsa AC-5 düşer; ters öncelik ise çok seçimde iki satıra aynı kodu yazıp AC-7'yi düşürür. Bu kural üç kriteri birden karşılar ve ölçünün yedek düşme deliğini koda taşımaz.
8. **Ölçü alanının önceliği bu işte değişmez** (X8, C11). *Gerekçe:* 0115'ten beri süren davranışı ters çevirir; açık bulgu olarak kalır.
9. **Kalıp sayımı yalnız üretim kalıplarını sayar, tamir seçimi kod ve ölçü alanını etkilemez** (R3/2, R14/2). *Gerekçe:* tamir satırı tek kurucudan doğar (C1) ve kodunu da ölçüsünü de o kurucu yazar; manuel alanları tamire uygulamak C1'i sessizce çiğner.
10. **Kapalı dönem kapısı bu işte açılır, "bugünkü gibi" ibaresi kalkar** (R16/2). Pencere açılmaz ve iki toplama düğmesiyle birebir aynı metin basılır. *Gerekçe:* ölçüm 14, kapının bugün hiç olmadığını ve ekrandaki şeridin zaten vermediği sözü verdiğini gösteriyor; yanlış ön kabul geliştiriciyi var olmayan bir davranışı korumaya çalıştırır.
11. **Pencere `wide` açılır ve ölü `width` prop'u kaldırılır** (R17). *Gerekçe:* ölçüm 12; bölümün yerini ölçmeden yazmak 190 piksellik bir sütunda kullanılamaz liste üretir. `wide` tasarım sözlüğünün kendi kuralıdır, yeni sayı üretmez ve 0050 taraması bu pencereyi kapsamaz. Görünüm bilinçli değişir.
12. **Pencere ekranın hazır `bekleyenler` sonucunu alır, ölçütü kendisi çağırmaz** (R12/2, C9). *Gerekçe:* ölçüm 16; aksi hâlde aynı tamir aynı forma iki kez eklenebilir ve R12 ile AC-19 bunu yakalamaz.
13. **Süzme kayıt düzeyindedir ve dize karşılaştırmasıyla yapılır** (R7/3). *Gerekçe:* ölçüm 17; pencerenin kalıp listesi de o kaydın kalıplarıdır, tamiri firma düzeyine çıkarmak pencerenin içinde iki ayrı kapsam yaratır.
14. **Pencere tasarım sözlüğünü içe aktarmaz, ipucu ve boş durum satır içi çizilir** (R18, X9). *Gerekçe:* ölçüm 19; sözlüğe girmek bu küçük işe yeni bir kanıt eşlemesi anahtarı ve piksel raporu ekler, pencere ise 0015 ve 0016 taramalarının kapsamında bile değil.
15. **İpucu yalnız tek kalıp seçiliyken çizilir ve katalogda hiç bulunamayan kalıpta da aynı metni basar** (R5/2). *Gerekçe:* çok seçimde ipucu çıkarsa bilinçli boşluk hata gibi görünür ve Karar 4'ün gerekçesi tersine döner; iki hâlde de yapılacak şey katalogda kod girmektir.
16. **Panelin adı "Kalıp Modelleri"dir** ve ipucu, ölçüm 4, Karar 3 ile Definition of Done bu adı kullanır (`Settings.jsx:54`). *Gerekçe:* "Kalıplar" adında bir panel yok; yanlış adres kullanıcıyı boş gezdirir.
17. **Ekle düğmesinin metni yalnız çoklu seçimde değişir** (R15/2): 0 ve 1'de "Satıra Ekle", 1'in üstünde "<n> Satır Ekle". *Gerekçe:* ölçüm 15; sayma isteği yalnız çoklu seçimde anlamlıdır, "Kalıp" sözcüğü tamir karışınca yanlış olur ve 0/1 metninin korunması beş test çağrısını dokunulmadan geçirir.
18. **Seçim anahtarı `tamirAnahtari(servis.id, giris.id)`'dir** (R9/2). *Gerekçe:* giriş adı serbest giriştir, iki servisin aynı adlı girişi olabilir; anahtarı kurucuyla aynı yerden almak çakışmayı baştan keser.
19. **Giriş satırı `<ad> · <ölçü> · <fmtTR(tarih)>` biçiminde çizilir** (R8/2). *Gerekçe:* `fmtTR` tamirin kendi dünyasında kullanılan biçimdir (formun satır altı metni de o), yani kullanıcı aynı tarihi iki biçimde görmez.
20. **Boş durum `TAMIR_YOK`'u yeniden kullanır, bölüm başlığı yeni tek sabittir** (R11/2, C10). *Gerekçe:* ölçüm 7 bölümün ilk gün boş açılacağını söylüyor, yani boş durum gerçekten görünen hâl; metni tek yerde tutmak 0115 R39 kuralıdır.
21. **Satır sırası üretim sonra tamir, ikisi de listenin sonuna; ekleme sonrası bildirim yok** (R20). *Gerekçe:* ölçüm 22; sıra yazılmazsa AC-21 "iki satır doğar" dışında hiçbir şeyi sabitlemez ve bildirim eklemek pencerenin bugünkü davranışını istenmeden değiştirir.
22. **Müşteri değişince tamir seçimi de sıfırlanır** (R7/2). *Gerekçe:* ölçüm 18; seçim taşınırsa başka firmanın tamiri eklenebilir.
23. **R10'un mekanizması yazılır: rozet ve bitti işaretleme kayıttan sonra, kargo etiketi servis kaydından** (R10/2). *Gerekçe:* 0117 R11 etiketi üretim formundan kaldırdı; "bugünkü gibi çalışır" cümlesi geliştiriciyi orada etiket aramaya iter.
24. **R1 yalnız müşterinin kalıp listesine uygulanır** (R1, ölçüm 11). *Gerekçe:* katalog dalı ölüdür ve o hâlde ekleme kapalıdır; ölü dala ön doldurma yazmak ölü kod üretir.
25. **Sütun ad tuzağı yazılır, sütun dokunulmaz** (R6/2, ölçüm 10). *Gerekçe:* "Kalıp CNC Torna Ölçüleri" sütunu `makinaKalipCapi`'yi basıyor; "CNC" arayan geliştirici yanlış sütunu siler.
26. **Ölü alan taraması `src/` ve `electron/` kapsamındadır ve test fikstüründeki dördüncü kopya da kaldırılır** (R19, ölçüm 13). *Gerekçe:* kapsamı yazılmamış tarama ya fikstürde kırılır ya ölü adı testlerde yaşatır; ölçüm, kaldırmanın 0115 altınını bozmadığını gösteriyor.
27. **Testid'ler, test dosyaları ve tarama listesi adlandırılır** (R22). *Gerekçe:* 0115 ve 0117'de kriter ile test eşlemesini ad üzerinden kurduk; adlandırılmamış tarama neyin yasak olduğunu söylemez.
28. **Kapanış bekçisi eklenir: iki satır kaynağı, üç manuel alan** (R21). *Gerekçe:* 0116 ve 0117'de aynı bekçi, sonraki işin bu pencereye sessizce dördüncü bir alan eklemesini engelliyor.
29. **Müşterisi bulunamayan tamir kapsam dışıdır** (X7). *Gerekçe:* seçilecek firma satırı yok; toptan getirme düğmesi onu yine getiriyor, yani iş kaybolmuyor.
30. **Kanıt dört ekranla alınır ve çekimde adım uyarısı olmaz** (Definition of Done). *Gerekçe:* 0117 Karar 51'den beri kanıt aracı bulunamayan adımı rapora yazıyor; uyarılı çekim yanlış ekranı kanıt sanmak demektir.
31. **Yeniden doğrulanamayan üç ölçüm kabul edildi ve ölçüm 27'ye yazıldı.** *Gerekçe:* "Belirsizlikte varsayma" kuralı; sayıların yeniden ölçülmediği yazılı olmadan kabul edilmesi sessiz varsayım olurdu.
32. **Bağımlı spec'ler satırı 0117'nin tamamlandığını yazar** (başlık satırı). *Gerekçe:* `specs/README.md`'nin "önce 0117 önerilir" notu artık geçmiştir ve sıra kararı gerekmiyor.
33. **Kataloğun kodunun boşluğu açık bulgu olarak zaten yazılı** (`specs/README.md` satır 185); Definition of Done maddesi "yazıldı" yerine "doğrulandı" olur. *Gerekçe:* yapılmış işi yeniden yapmak spec'i kirletir.
34. **0101 AC-30'un taraması korunur: tamir yolu çapı kendisi okumaz** (ölçüm 25). *Gerekçe:* kurucu çapı kendi içinde okuyor, pencerede üçüncü bir okuma taramayı kırar.

### Plan turunda verilen kararlar (2026-10-29)

Takım Yöneticisi uygulama planındaki on önerinin hepsini onayladı (`specs/done/0118-uygulama-plani.md`).

35. **Ölü alanın taraması kelime sınırlıdır ve harita verisi gerekçeyle dışarıdadır** (AC-9, AC-30). Desen `\btorna\b`, `torna:` ve `.torna`; `src/lib/map/` taranmaz. *Gerekçe:* düz alt dize taraması harita verisindeki şehir adlarında (ör. Tornavacas) eşleşir; bölge dosyaları üretilmiş veridir, alan adı taşımaz.
36. **Dört kanıt ekranının kaydı `UretimFormu.jsx` anahtarına yazılır; eski kodla çekildikleri için `beklenen: "degisti"`** (DoD, AC-39). *Gerekçe:* pencere `tasarim.jsx`'i içe almadığı için eşlemede anahtar alamaz (AC-39); pencereyi açan ekran sözlüğü kullanıyor ve kayıt rejimine zaten giriyor.
37. **Kapalı dönem metni ekranda tek yerel sabittir** (`DONEM_KAPALI_METNI`, R16/2, AC-24). İki toplama düğmesi ve pencere kapısı onu okur. *Gerekçe:* "birebir aynı metin" şartı üç kopyayla değil tek tanımla sağlanır; metin yalnız bu ekranda kullanıldığı için kütüphaneye taşınmaz.
38. **İpucunun ölçütü katalogda kodun yokluğudur, alanın değeri değil; yalnız tek kalıpta çizilir** (R5/2, AC-3, AC-40, AC-41). *Gerekçe:* kullanıcı alana kendi değerini yazınca ipucu kaybolursa kataloğun eksikliği gizlenir; ipucunun işi kataloğu düzeltmeye yönlendirmektir.
39. **Seçim tek kalıba inince alan o kalıbın katalog koduyla yeniden dolar; tamir seçimi alana dokunmaz** (R2/2, AC-37). *Gerekçe:* alan yalnız tek kalıpta anlamlıdır, yeniden doldurma ölçü alanının bugünkü davranışıyla aynıdır; tamir satırı manuel alanları okumadığı için alanı değiştirmesi gereksizdir.
40. **Tamirin müşterisi dize karşılaştırmasıyla bulunur; çap kurucuda okunur** (R7/3, Karar 34). *Gerekçe:* kimlikler sayı ya da dize gelebilir (eski veri); kurucu çapı zaten okuyor, pencerede ikinci okuma 0101 AC-30'u kırar.
41. **Pencerenin yeni prop'u `bekleyenler`; pencere `services` ve `uretimFormlari` almaz** (R12/2, C9). *Gerekçe:* ölçüt ekranda açık formun taslağıyla bir kez hesaplanır; prop'un adı neyin geldiğini söyler, pencere ölçütü kendisi çağıramaz.
42. **AC-45 gerçek `UretimFormu` kaydıyla ve panonun rozetiyle ölçülür; etiket verisi önce ve sonra karşılaştırılır** (R10/2). *Gerekçe:* rozetler aynı haritadan okunur (0115), kayıt ekranın gerçek yolundan geçmezse ölçüm haritayı değil düzeneği sınar.
43. **Kapı bildirimi tek argümanlı `showToast(metin)`** (AC-24). *Gerekçe:* iki toplama düğmesi bugün böyle çağırıyor; tür argümanı eklemek "birebir aynı" şartını bozar.
44. **`CLAUDE.md`'de 0118 bölümü 0117'nin önüne konur; kapanış bekçisinin dilimi `(spec 0118, plan` ile `(spec 0117, plan` arasıdır. 0115 bölümünün güncellemesi `specs/0115-` içermez** (R21, AC-49). *Gerekçe:* yerleşim kuralı önceki spec'lerle aynı; 0115'in kapanış bekçisi bölümünde done dışı atıf arar.

### Karar kaydı

| # | Bulgu | Derece | Karar |
|---|---|---|---|
| B-1 | Kod alanının kimliği, adı ve yazdığı anahtar yazılmamış | Bloklayıcı | R1/2, Karar 6, AC-30 |
| B-2 | Ön doldurma ile yazılan değer arasındaki öncelik tanımsız (AC-5 ↔ AC-7) | Bloklayıcı | R2/2, Karar 7, AC-31, AC-32 |
| B-3 | Kapalı dönem kapısı yok, R16 var olmayan davranışa atıf yapıyor | Bloklayıcı | R16/2, Karar 10, AC-24, ölçüm 14 |
| B-4 | Pencere 520 piksel, `width={780}` ölü prop; yeni bölümün yeri ölçülemez | Bloklayıcı | R17, Karar 11, AC-33, ölçüm 12 |
| B-5 | R15 beş test çağrısını ters çevirebilir, başlık satırı "yok" diyor | Bloklayıcı | R15/2, Karar 17, AC-22, ölçüm 15 |
| B-6 | Bekleyen listesinin kaynağı yazılmamış, aynı tamir iki kez eklenebilir | Bloklayıcı | R12/2, C9, Karar 12, AC-34, ölçüm 16 |
| Ö-1 | Firma mı makina kaydı mı, kimlik karşılaştırması tanımsız | Önemli | R7/3, Karar 13, AC-35, ölçüm 17 |
| Ö-2 | Manuel alanlar tamir satırına uygulanıyor mu, tamir sayıma giriyor mu | Önemli | R3/2, R14/2, Karar 9, AC-36, AC-37 |
| Ö-3 | Bölümün yeri ve müşteri değişince seçimin sıfırlanması | Önemli | R7/2, Karar 22, AC-38, ölçüm 18 |
| Ö-4 | `tasarim.jsx` içe aktarımı kanıt eşlemesi rejimini açıyor | Önemli | R18, X9, Karar 14, AC-39, ölçüm 19 |
| Ö-5 | İpucunun metni, yeri, bastırılması ve panel adı | Önemli | R5/2, Karar 15, Karar 16, AC-40, AC-41 |
| Ö-6 | Tamir girişinin seçim anahtarı | Önemli | R9/2, Karar 18, AC-42 |
| Ö-7 | AC-9'un tarama kapsamı ve ölü alanın dördüncü kopyası | Önemli | R19, Karar 26, AC-9, ölçüm 13 |
| Ö-8 | Giriş satırının metni ve tarih biçimi | Önemli | R8/2, Karar 19, AC-14, ölçüm 21 |
| Ö-9 | Boş durum metni ve bölüm başlığı için kaynak | Önemli | R11/2, C10, Karar 20, AC-43 |
| Ö-10 | Satır sırası ve ekleme sonrası bildirim | Önemli | R20, Karar 21, AC-21, AC-44, ölçüm 22 |
| Ö-11 | R10'un "kargo etiketi bugünkü gibi" cümlesi mekanizmayı yanlış ima ediyor | Önemli | R10/2, Karar 23, AC-45 |
| K-1 | Ölçüm 3'ün satır atfı (`:84` → `:80`) | Küçük | ölçüm 3 |
| K-2 | Ölçüm 1'in sütun sayısı ve geçiş sayısı | Küçük | ölçüm 1 |
| K-3 | "Kalıp CNC Torna Ölçüleri" sütunu `makinaKalipCapi`'yi basıyor | Küçük | R6/2, Karar 25, AC-46, ölçüm 10 |
| K-4 | Panel adı üç yerde yanlış | Küçük | R5/2, Karar 16, ölçüm 4 |
| K-5 | Test dosyaları ve testid'ler adlandırılmamış | Küçük | R22, Karar 27 |
| K-6 | Taramanın neyi yasakladığı yazılmamış | Küçük | R22, AC-47 |
| K-7 | Kanıt ekranları ve adım uyarısı kuralı | Küçük | Karar 30, ölçüm 26, DoD |
| K-8 | Bir DoD maddesi zaten yapılmış (README satır 185) | Küçük | Karar 33, DoD |
| K-9 | Pencerenin katalog dalı ölü; R1 hangi listeye uygulanır | Küçük | R1, Karar 24, ölçüm 11 |
| K-10 | 0101 AC-30 pencerede yeni `kalipCapi` okuması kabul etmiyor | Küçük | Karar 34, AC-48, ölçüm 25 |
| K-11 | Müşterisi bulunamayan tamir pencereden erişilemez | Küçük | X7, Karar 29 |
| K-12 | Üç ölçüm bu turda yeniden doğrulanamadı | Küçük | ölçüm 27, Karar 31 |
| K-13 | Kapanış bekçisi yok | Küçük | R21, Karar 28, AC-49 |
| P-1 | Ölü alan taraması harita verisinde eşleşir | Önemli | Karar 35, AC-9, AC-30 |
| P-2 | Pencere kanıt eşlemesinde anahtar alamaz | Önemli | Karar 36, AC-39, DoD |
| P-3 | Kapalı dönem metninin kaynağı | Küçük | Karar 37, AC-24 |
| P-4 | İpucunun ölçütü | Küçük | Karar 38, AC-3, AC-40, AC-41 |
| P-5 | Tek kalıba inen seçimde alanın değeri | Küçük | Karar 39, AC-37 |
| P-6 | Tamirin müşterisi ve çap okuması | Küçük | Karar 40, AC-48 |
| P-7 | Pencerenin prop'u | Küçük | Karar 41, AC-34 |
| P-8 | AC-45'in ölçüm yolu | Küçük | Karar 42, AC-45 |
| P-9 | Kapı bildiriminin biçimi | Küçük | Karar 43, AC-24 |
| P-10 | Belge yerleşimi ve kapanış bekçisi | Küçük | Karar 44, AC-49 |

---

## Kabul kriterleri

### A. Kod

- **AC-1.** Kodu dolu bir kalıp seçilince kod alanı o kodu gösterir.
- **AC-2.** Kodu boş bir kalıp seçilince alan boş kalır.
- **AC-3.** Kodu boş kalıp seçiliyken kodun nereden girileceğini söyleyen ipucu çizilir.
- **AC-4.** İpucu varken satır yine eklenebilir.
- **AC-5.** Tek kalıp seçiliyken kullanıcı alana kendi değerini yazarsa eklenen satır o değeri taşır (kalıbın katalog kodu dolu olsa da).
- **AC-6.** İki kalıp seçilince alan boşalır ve yer tutucu nedenini yazar.
- **AC-7.** İki kalıp seçiliyken eklenen iki satırın her biri kendi kalıbının kodunu taşır.
- **AC-8.** Eklenen satırın kod sütunu formda ve çıktıda bu değeri gösterir.
- **AC-9.** Kaldırılan ölü alan adı `src/` ve `electron/` altında hiç geçmez ve `tests/fixtures/0115-veri.js`'teki dördüncü kopya da kalkar (tarama).
- **AC-10.** Üretim formunun ekran tablosu (altı veri sütunu ve bir işlem sütunu) ile çıktısı (altı sütun) bugünkü sütunlarıyla kalır.

### B. Bekleyen tamirler

- **AC-11.** Müşteri seçilmeden tamir bölümü çizilmez.
- **AC-12.** Bekleyen tamiri olan firma seçilince bölüm o firmanın girişlerini listeler.
- **AC-13.** Başka firmanın bekleyen tamiri bu listede görünmez.
- **AC-14.** Her giriş kalıbın adını, ölçüsünü ve servis tarihini `<ad> · <ölçü> · GG/AA/YYYY` biçiminde gösterir; ölçüsü boş giriş ayraçsız çizilir.
- **AC-15.** Bekleyen tamiri olmayan firmada bölüm boş durum metniyle çizilir.
- **AC-16.** Seçilen tamir eklenince satır tamir türünde doğar.
- **AC-17.** Eklenen tamir satırı servis bağını taşır ve kaynak satırı formda servisi gösterir.
- **AC-18.** Eklenen tamir satırının kalıp durumu haritasına girmediği doğrulanır (0115 C6 aynen).
- **AC-19.** Bir canlı formda satırı olan tamir listede görünmez.
- **AC-20.** Aynı tamir eklendikten ve form kaydedildikten sonra pencere yeniden açıldığında listede yoktur.
- **AC-21.** Bir üretim kalıbı ile bir tamir birlikte seçilip tek seferde eklenir ve iki satır doğar; sıra önce üretim, sonra tamir ve ikisi de listenin sonundadır.
- **AC-22.** Ekle düğmesinin metni birden çok seçimde toplam sayıyı yazar ("2 Satır Ekle"); sıfır ve tek seçimde metin "Satıra Ekle" kalır.
- **AC-23.** Hiçbir şey seçilmemişken ekle düğmesi pasiftir.
- **AC-24.** Dönemi sonlandırılmış formda pencere açılmaz ve iki toplama düğmesiyle birebir aynı metin bildirilir.
- **AC-25.** Pencere servis kaydına hiçbir şey yazmaz: tamir eklendikten sonra servisin gövdesi değişmemiştir.

### C. Dokunulmayanlar

- **AC-26.** Başka canlı formda satırı olan kalıp pencerede pasif çizilir ve seçilemez.
- **AC-27.** Müşteri kalıbı seçilerek eklenen satırın kaynak bağı bugünkü gibi yazılır.
- **AC-28.** "Bekleyen Tamirleri Getir" düğmesi ve sayısı bugünkü gibi çalışır.
- **AC-29.** `npm test` yeşil, `npm run lint` hata sayısı sıfır.

### QA turu kriterleri (2026-10-29)

- **AC-30.** Pencerenin manuel alanları üç tanedir ve ilki "Kalıp Kodu"dur; "CNC Programı" etiketi ve `torna` anahtarı kaynakta hiç geçmez.
- **AC-31.** Tek kalıp seçiliyken alan boşaltılırsa eklenen satırın kodu da boştur (katalog kodu geri gelmez).
- **AC-32.** İki kalıp seçiliyken alana değer yazılırsa o değer hiçbir satıra yazılmaz; iki satır kendi kalıplarının kodlarını taşır.
- **AC-33.** Pencere `wide` açılır; kaynağında `width=` ile `maxWidth`/`maxHeight` geçmez (tarama).
- **AC-34.** Tamir eklendikten sonra form **kaydedilmeden** pencere yeniden açıldığında o tamir listede yoktur; pencere kaynağında `bekleyenTamirler(`, `tamirSatirHaritasi(` ve `atolyeKaliplari` geçmez (tarama).
- **AC-35.** Aynı firmanın iki makina kaydı varsa, seçilen kaydın servisindeki tamir listelenir, öteki kaydın tamiri listelenmez.
- **AC-36.** Kod, ölçü ve makina kalıp çapı alanları doluyken eklenen tamir satırı bu üç değeri taşımaz; kodunu ve ölçüsünü servis girişinden alır.
- **AC-37.** Bir kalıp ve bir tamir seçiliyken kod alanı boşalmaz, kalıbın kodunu göstermeye devam eder.
- **AC-38.** Müşteri değiştirilince seçili tamirler sıfırlanır ve ekle düğmesi pasife döner.
- **AC-39.** `UretimSatirEkleModal.jsx` `tasarim.jsx`'ten hiçbir şey içe aktarmaz (tarama) ve `docs/evidence/kanit-eslemesi.json`'da anahtarı yoktur.
- **AC-40.** İki kalıp seçiliyken (biri kodsuz olsa da) ipucu çizilmez.
- **AC-41.** Adı katalogda hiç bulunmayan kalıp seçilince ipucu çizilir ve metni kodu boş olan kalıptakiyle aynıdır.
- **AC-42.** İki ayrı servisin aynı adlı girişi varken yalnız işaretlenen giriş eklenir; öteki seçilmemiş kalır.
- **AC-43.** Boş durum metni `TAMIR_YOK` sabitiyle birebir aynıdır ve bölüm başlığı `kalipTamiri.js`'teki sabitten gelir; pencere ikisini satır içi yazmaz (tarama).
- **AC-44.** Manuel ekleme sonrası bildirim basılmaz; iki toplama düğmesinin bildirimleri aynen kalır.
- **AC-45.** Pencereden eklenen tamir satırı kaydedilince panonun servis kartındaki rozet ve Makina Geçmişi'ndeki rozet güncellenir; kargo etiketi çıktısı değişmez.
- **AC-46.** Ekranın ve çıktının "Kalıp CNC Torna Ölçüleri" sütunu başlığıyla ve `makinaKalipCapi` hücresiyle aynen kalır.
- **AC-47.** Pencere kaynağında `tamirSatiriKur(` tam bir kez geçer.
- **AC-48.** Pencere ve üretim formu kaynağında `kalipCapi` okumaları yalnız `c.kalipCapi` ve `cust?.kalipCapi`'dir (0101 AC-30 aynen geçer).
- **AC-49.** Kapanış bekçisi: pencerenin satır üreten yolu iki, manuel alanı üçtür (tarama).

---

## Definition of Done

- [ ] Bütün kabul kriterleri karşılandı; kriter ile test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Bekleyen tamir ölçütü ve tamir satırı kurucusu tek kaynaktan çağrıldı; pencerede ikinci kopya yazılmadığı taramayla sabitlendi (`bekleyenTamirler(`, `tamirSatirHaritasi(`, `tamirAnahtari(` tanımı ve `atolyeKaliplari` yok; `tamirSatiriKur(` bir kez).
- [ ] Pencere bekleyen listesini ekranın hazır sonucundan aldı; `services` ve `uretimFormlari` prop'u almadığı yazıldı.
- [ ] Kapalı dönem kapısı açıldı ve basılan metin iki toplama düğmesiyle birebir aynı.
- [ ] Pencere `wide` açıldı, ölü `width` prop'u kaldırıldı ve görünüm değişikliği kanıt kaydında `beklenen: "degisti"` ile onaylandı.
- [ ] Pencerenin `tasarim.jsx`'i içe aktarmadığı taramayla sabitlendi; `docs/evidence/kanit-eslemesi.json`'a anahtar eklenmedi.
- [ ] Kapanış bekçisi yazıldı: iki satır kaynağı, üç manuel alan.
- [ ] Yeni kalıcı alan, veri bölümü, eylem izni ve sunucu kuralı **eklenmediği** açıkça yazıldı.
- [ ] Kaldırılan ölü alan için göç yazılmadığı ve eski satırlardaki değerin okunmadığı yazıldı; `satirlar` bir JSON sütunu olduğu için eski değerin kayıtta yaşamaya devam ettiği de yazıldı (`db.cjs:1063`, `:1676`).
- [ ] Görsel kanıt alındı; pencerenin kodlu, kodsuz, tamirli ve tamirsiz dört hâli kayıtlı (`uretim-formu-0118-manuel-kodlu`, `-kodsuz`, `-tamirli`, `-tamirsiz`) ve çekim çıktısında `adimUyarilari` **yok** (0117 Karar 51 kuralı).
- [ ] `npm test` **tamamı** yeşil (çıktısıyla; 0115'in manuel pencere blokları ve 0101 AC-30 dokunulmadan geçti), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0115 bölümü güncellendi: manuel pencerenin üçüncü kaynağı (firmaya süzülmüş bekleyen tamirler), kod alanının ön doldurması ve önceliği, kaldırılan ölü alan, pencerenin `wide` boyutu ve kapalı dönem kapısı.
- [ ] Kataloğun kod alanının çoğunlukla boş olduğu `specs/README.md`'nin açık bulgularına **yazılı olduğu doğrulandı** (satır 185) ve panel adı "Kalıp Modelleri" olarak düzeltildi.
- [ ] Ölçü alanının önceliği (X8) `specs/README.md`'nin açık bulgularına yazıldı.
- [ ] `specs/README.md`'nin "önce 0117 önerilir" notu güncellendi (0117 tamamlandı, `main` `6a5e7ad`).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `b395fb2` | Dal `feat/0118-manuel-satir`, taban `6a5e7ad`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (B-1–B-6, Ö-1–Ö-11, K-1–K-13, Karar 6–34), plan turu (Karar 35–44) |
| **Düzeltme turu sayısı** | 1 | Triyaj: üç test boşluğu: tamir satırının müşteri alanları (kurucuya `null` verilse testler geçiyordu), Karar 38'in ipucu ölçütü (alanın değerine bağlanınca geçiyordu), Karar 40'ın dize karşılaştırması (`===` ile geçiyordu). Üçüne iddia eklendi, kod değişmedi |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 442 dosya, 6020 test (Electron dahil, triyaj öncesi); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** ölü alanın düz alt dize taraması harita verisindeki şehir adlarında eşleşiyordu (Karar 35); pencere `tasarim.jsx` almadığı için kanıt eşlemesinde anahtar alamıyordu (Karar 36). Mutasyon ölçümünde ipucunun "yalnız tek kalıp" şartı ilk testlerde yakalanmadı, kodsuz kalıbı önce seçen test eklendi. Kalıbın kendi ölçüsünün manuel ölçüye üstünlüğü testte sabitlendi (X8, açık bulgu).

**Görsel kanıt:** 11 ekran × 2 tema; pencerenin dört hâli değişti, öteki yedi ekran 0 piksel; taban son kodla 0 fark; hiçbir çekimde adım uyarısı yok.

**Bu spec'ten çıkarılan ders:** Kurucuya geçirilen bir argümanın etkisi, kurucunun okuduğu bütün alanlar iddia edilmeden ölçülmüş sayılmaz: "satır doğdu" testi, satırın yarısı boş doğsa da geçer. Bir kuralın gerekçesi "eski veri böyle gelebilir" ise o veri fikstürde bulunmalı; yoksa kural testsiz kalır.
