# 0047 — Aylık Gider ve Kasa Raporu

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-30; commit `db3eba2`, dal `feat/0047-gider-kasa-raporu`; plan `specs/done/0047-uygulama-plani.md` Q1–Q11) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler ekranı, Kasa ekranı, yazdırma şablonları, gizlilik koruma testi |
| **Bağımlı spec'ler** | 0001 (gider kaydı ve gizlilik) · 0020 (personel etiketi) · 0021, 0024 (ödeme ve kasa) · 0040 (çek) · 0041 (ödeme yöntemi kırılımı) · 0042 (personel hedefleri) · 0044 (tahsilatın hesabı) · 0046 (form ödemesi) — hepsi tamamlandı |
| **Revizyon** | R1 (2026-09-30): taslak gözden geçirmesi (mockup üzerinden). Altı dezavantaj karara bağlandı: dönem kilidi, para birimi blokları, yazdırma seçenekleri, hesapsız hareket listesi ve tek düğme bileşeni **F bölümü** olarak eklendi (R26–R34); personel ayrıntı sayfası **reddedildi** (X9); Finans üçüncü giriş noktası oldu (R2); X6 yeniden yazıldı; AC-29…AC-40 eklendi.<br>**R2 (2026-09-30, QA turu):** geliştirici hazırlığı denetimi, 18 bulgu işlendi, 6'sı bloklayıcıydı. Rapor kurucusunun ve düğmenin **dosya yerleşimi** gizlilik taramasıyla çakışıyordu (R35, R36, C8); ay seçici üç ekranda düğmenin kendisine taşındı (R3); iki motor yeteneği (ay açılış/kapanış bakiyesi, çekin ay sonu durumu) eksikti (R37, R38); R13, R14, R16 kapsamı ve AC-7 ile R26 çelişkisi çözüldü; G bölümü (R35–R45) ve AC-41…AC-56 eklendi.<br>**R3 (2026-09-30, plan onayı):** ay sonu kilidi hareketlerin ay sonuna süzülmesini de içerir (R26/Q1); AC-4 R40 deseniyle daraltıldı (Q2); yetki kapısı üç ekranda `kasaYetki` (R23/Q3); veri App'te tek memodan (R39/Q4); motorda olmayan sayımlar motora (C2/Q5); personel satırları (R18/Q6); kaynaklar (Q7); ay alanı (R2, R3/Q8); sınır durumları (Q9); görsel kanıt (Q10); salt okunurluk (Q11). |

---

## Intent

Finans'ta ayın sonunda tek tuşla alınan bir **Aylık Faaliyet Raporu** var: satışlar, tahsilat, alacak,
servis, hepsi bir arada, yazdırılabilir. Fabrika sahibi bu raporu ay kapanışında alıp saklıyor.

Giderler ve Kasa tarafında bunun karşılığı yok. Gider ekranındaki Dönem Raporu yalnız ekranda duruyor;
kapatınca gidiyor, mali müşavire gönderilemiyor, ay sonunda dosyalanamıyor. Kasa'da da aynı: hesap
bakiyeleri, hareketler ve çek portföyü ekranda var, kâğıda dökülemiyor. Sonuç: paranın girdiği taraf
raporlanıyor, çıktığı taraf raporlanmıyor.

Başarı şu demek: Giderler ve Kasa ekranlarından, seçili ay için tek tuşla yazdırılabilir bir rapor
alınıyor; raporda o ayın gideri türüyle ve tedarikçisiyle, ödenen ile ödenmeyen ayrımıyla, hesapların
açılış ve kapanış bakiyeleriyle, çek portföyünün durumuyla birlikte duruyor. Ve **çalışan bazlı hiçbir
tutar bu kâğıda çıkmıyor.**

---

## Requirements

### A. Rapor ve kapsamı

- **R1.** Seçili **ay** için tek bir yazdırılabilir rapor üretilir: **"Aylık Gider ve Kasa Raporu"**.
  İki bölümden oluşur: **Gider** ve **Kasa**.
- **R2.** Rapor **üç** yerden alınır: **Giderler**, **Kasa** ve **Finans**. Üçü de aynı belgeyi üretir. Finans'ta düğme, mevcut Aylık Faaliyet Raporu düğmesinin yanında durur ve **o ekranın mevcut ay seçicisini** kullanır; böylece ay sonunda iki rapor tek yerden alınır.
  **Uygulama (R3, Q4, Q8):** App tek bir `giderKasaRaporVerisi` memosu kurar ve üç ekrana aynen geçirir (yalnız
  `kasaYetki` ile dolu); aynı ay aynı belgeyi yapısal olarak verir. Düğme isteğe bağlı `ay` prop'u alır: Finans
  `raporAy`'ını verir ve düğme kendi ay alanını çizmez; diğer ekranlarda kendi alanı (varsayılan önceki ay).
- **R3.** **Ayı rapor düğmesinin kendisi seçer.** Düğmenin yanında bir ay alanı (`<input type="month">`)
  durur, varsayılanı **önceki aydır** (Finans'ın `oncekiAy` deseni; ay kapanışında alınan bir belge için
  doğru varsayılan). Ekranın kendi dönem seçimi tek bir ayı kapsıyorsa alan ona ön dolu gelir. Üç ekranda
  davranış birebir aynıdır ve aynı ay seçildiğinde aynı belge çıkar. Gerekçe: `Kasa.jsx`'te dönem ya da ay
  durumu **hiç yok**, `Giderler`'in seçicisi ise **Tarih Aralığı** kipinde iki aya yayılabiliyor (0022);
  seçiciyi düğmeye taşımak R33'ün "tek bileşen" hedefini gerçekten sağlar ve ekranın kipinden bağımsız
  kılar.
- **R4.** Yazdırma, uygulamanın bugünkü yazdırma yolunu kullanır (önizleme penceresi, yazdır ve kapat);
  yeni bir çıktı biçimi icat edilmez.

### B. Gider bölümünün içeriği

- **R5.** **Özet:** ayın toplam gideri, ödenen ve ödenmeyen tutar, indirilecek KDV, kesilen stopaj.
- **R6.** **Gider türü kırılımı:** her tür için kalem sayısı ve toplam tutar.
- **R7.** **Tedarikçi kırılımı:** tedarikçi başına toplam ve o tedarikçiye açık borç; tedarikçisi
  seçilmemiş kalemler ayrı satırda toplanır.
- **R8.** **Ödeme durumu:** vadesi geçmiş ve yaklaşan ödemelerin sayısı ile tutarı.
- **R9.** **Maliyet dağılımı:** ayın giderinin makinaya, modele ve ortağa düşen bölümleri (dört kova),
  yalnız toplamlar.
- **R10.** **KDV karşılaştırması:** aynı ayın hesaplanan satış KDV'si ile indirilecek gider KDV'si ve
  aradaki fark; rakam Finans'takiyle **aynı fonksiyondan** gelir, yeniden hesaplanmaz.
- **R11.** **Kalem listesi:** tarih, tür, açıklama, tedarikçi, tutar ve ödeme durumu sütunlarıyla.

### C. Kasa bölümünün içeriği

- **R12.** **Hesap tablosu:** her hesap için ayın açılış bakiyesi, giren, çıkan ve kapanış bakiyesi.
- **R13.** **Hareket özeti beş satırdır:** ödeme, tahsilat, virman, avans ve **mahsup**; her biri sayı ve
  tutarıyla. Mahsup satırında "para hareketi değildir, hiçbir bakiyeye girmez" yazar (0024 R10); sayılmazsa
  hareket sayıları veritabanındakiyle tutmaz. **Tahsilat satırı 0044'ün dört kaynağını birlikte sayar**
  (makina tahsilatı, servis, Extra Kalıp, yedek parça) ve kaynak kırılımını verir; bakiyeye giren para artık
  dört yerden gelir.
- **R14.** **Ödeme yöntemi kırılımı bölüme göre farklı tanımlanır:**
  - **Gider bölümünde** 0041'in `donemYontemKirilimi`'si kullanılır: **dönemin kalemlerine** yapılan
    ödemeler, ödeme tarihinden bağımsız (0041 Q3 kararı, ekranla aynı rakam, C2).
  - **Kasa bölümünde** **ayın içinde yapılan** ödeme hareketleri sayılır, çünkü o bölüm nakit görünümüdür.

  İkisinin farklı olabileceği belgede tek cümleyle yazılır ("Gider bölümü ayın kalemlerini, Kasa bölümü ayın
  hareketlerini sayar"). AC-14'ün "ayın ödeme toplamına eşittir" ölçütü **Kasa bölümü** için tanımlıdır.
- **R15.** **Çek portföyü:** ay sonunda elde duran çeklerin sayısı ve tutarı, ay içinde tahsil edilen,
  ciro edilen ve karşılıksız çıkan çekler.
- **R16.** **Hesabı belirtilmemiş hareketler** ayrı bir satırda sayılır ve bakiyeye girmediği yazılır;
  böylece rapordaki bakiye ile gerçek bakiye arasındaki fark görünür olur. **Ciro hareketleri bu sayıya ve
  R31'in listesine girmez:** ciro kasıtlı olarak hesapsızdır ve 0040 R18 ile `hesapsizOdemeler`'den zaten
  hariç tutulmuştur (eksik veri değildir); ciro edilen çekler çek bölümünde sayılır (R15). **0044'ün
  hesabı belirtilmemiş tahsilatları ayrı bir satırdır** ve gider tarafındaki hesapsız ödemelerle
  karıştırılmaz (0044 kararı).
- **R17.** **Açık çalışan avansı toplamı** tek bir rakam olarak yazılır.

### D. Gizlilik (bu işin en kritik parçası)

- **R18.** Rapora **hiçbir çalışan adı ve çalışan bazlı tutar** girmez. Personel gideri, tür kırılımında
  ve kalem listesinde **tek toplam satırı** olarak görünür ("Personel gideri"), tıpkı makina bazlı
  ekranlarda olduğu gibi.
- **R19.** **Resmi ve elden ayrımı rapora girmez**; personel tarafında yalnız toplam yazılır.
  **Uygulama (R3, Q6):** tür kırılımında personel türü satırı tür adı ve toplamıyla basılır, `calisanlar` alt kırılımı
  okunmaz; kalem listesinde bütün personel kalemleri tek satırdır ("Ay geneli", "Personel gideri", toplam, toplu
  durum); kalem sayısı yazılmaz (çalışan sayısını ele verir).
- **R20.** Fazla mesai, prim ve ikramiye satırları rapora girmez; toplamın içinde erir.
- **R21.** Çalışan avansı **kişi bazında** yazılmaz (R17'deki tek toplam yeterlidir).
- **R22.** Gizlilik, kaynak taramasıyla değil **çıktının kendisiyle** korunur: rapor, ayırt edici çalışan
  adı ve tutar içeren veriyle üretilir ve çıktının bunları içermediği doğrulanır.

### E. Yetki ve görünürlük

- **R23.** Rapor düğmesi yalnız **gider yetkisi** olan kullanıcıya görünür; Kasa ekranındaki düğme
  ayrıca Kasa'nın bugünkü çift yetki kuralına tabidir.
  **Uygulama (R3, Q3):** kapı üç ekranda da **`kasaYetki`**dir (Giderler + Finans sekmesi, perde kalkık). Belge her
  zaman iki bölümü birden taşır; yalnız gider yetkili kullanıcıya kasa bölümü eksik bir belge vermek X6'nın reddettiği
  "aynı ad, kişiye göre farklı içerik" durumu olurdu. Giderler sekmesi olup Finans sekmesi olmayan kullanıcı düğmeyi görmez.
- **R24.** Yayın perdesi inikken rapor alınamaz (ekranlar zaten kapalı).
- **R25.** Rapor **salt okunurdur**: hiçbir kaydı değiştirmez, yeni izin kimliği tanımlanmaz.

### F. Dönem kilidi, para birimi ve yazdırma seçenekleri

- **R26.** **Rapor dönem sonuna kilitlidir.** Bütün rakamlar ayın son gününe kadar olan veriden hesaplanır:
  açık borç "ay sonu itibarıyla ödenmemiş", kasa kapanış bakiyesi ayın son günündeki bakiye, çek portföyü
  ay sonundaki durum, açık avans ay sonundaki tutar. Hiçbir rakam "bugüne" göre hesaplanmaz.
  **Mekanizma hazırdır, yeni bir kilit katmanı yazılmaz:** `gider.borcOzeti`, `odemeHatirlatma.odemeHatirlatmalari`
  ve `gider.hesaplaGiderRaporu` üçü de `bugun`'ü **parametre** alıyor; kilit, bu fonksiyonlara
  `bugun = ayın son günü` geçirilerek sağlanır (C2 böyle korunur).
  **Uygulama (R3, Q1):** `bugun` parametresi yetmez: kalemin ödeme durumu `odemeleriUygula`'dan bütün hareketlerle
  türüyor. Kurucu motorlara **ay sonuna kadarki girdiyi** verir: ödeme ve mahsup hareketleri `tarih ≤ ay sonu`
  süzülüp `odemeleriUygula`'dan geçer, avans borcu aynı süzülmüş hareketlerle, çek durumu `gecmis`'ten (R38), kasa
  aralıkla (R37), kart blokajı `bugun = ay sonu` ile. Bu girdinin tarih süzgecidir, yeni hesap değildir (C2).
- **R27.** Sonuç olarak rapor **tekrarlanabilirdir**: aynı ay ne zaman yazdırılırsa aynı belge çıkar,
  o aya ait veri değişmediği sürece. **Çöp kutusu bu kapsamdadır:** motorlar `deletedAt`'lı kaydı hiç
  saymadığı için bugün çöpe atılan ya da kalıcı silinen bir kalem **geçmiş ayın** raporunu da değiştirir;
  R29'un uyarısı bunu içerir. Her bölüm başlığı hangi zamana ait olduğunu yazar
  ("Eylül 2026 dönemi" ya da "30.09.2026 itibarıyla").
- **R28.** "Yaklaşan ödemeler" ay sonundan sonraki eşik günü kapsar (varsayılan yedi gün), yani ertesi ayın
  ilk haftasını; bu, aylık bir belgede "sırada ne var" sorusunun cevabıdır.
- **R29.** Belgede, raporun yazdırıldığı andaki veriyle üretildiği ve o aya sonradan kayıt girilirse
  rakamların değişeceği yazar. Sürüm arşivi tutulmaz.
- **R30.** **Hesaplar para birimine göre ayrı bloklarda** raporlanır; her bloğun kendi toplamı olur ve
  **para birimleri arası toplam yazılmaz**. Kur çevrimi yapılmaz.
- **R31.** **Hesabı belirtilmemiş hareketler sayılmakla kalmaz, listelenir:** tarih, tutar ve hangi kaleme
  ait olduğu. Personel kalemine ait satır "Personel gideri" etiketiyle yazılır. Liste, kullanıcının gidip
  düzeltebilmesi içindir.
  **Triyaj (2026-09-30, TY onayı): R31'in istisnası.** Personel ödemeleri ve çalışan avansları hesapsız listede satır
  satır yazılmaz; her biri tek toplu satırdır ("Personel ödemeleri · n adet" ve "Çalışan avansları · n adet", toplam
  tutarla). Satır satır yazmak tek bir çalışanın elden tutarını ya da avansını tarihiyle kâğıda düşürüyordu (R18, R19, R21).
  Ayrıntı Giderler ve Kasa ekranlarındadır.
- **R32.** ~~Kalem listesi isteğe bağlıdır~~ **(0055 ile geri alındı, 2026-10-01: seçenek kaldırıldı, liste hep gelir.)** Varsayılan **açık**. Kapatıldığında belge kısalır, diğer
  bölümler aynen kalır. Seçenek yazdırmadan önce görünür bir kutudur.
- **R33.** Rapor düğmesi **tek bir paylaşılan bileşendir** ve yetki kapısı (gider yetkisi, Kasa'nın çift
  yetki kuralı, yayın perdesi) **tek yerde** hesaplanır; üç ekran aynı kapıyı kullanır.
- **R34.** Kasa bölümündeki hesap tablosunun başlığı paranın nakit hareketi olduğunu söyler
  ("nakit hareketleri"), ciro ile karışmasın diye.

### G. Dosya yerleşimi, motor genişlemesi ve sınır durumları (QA turu, R2)

- **R35.** **Rapor kurucusu kendi dosyasında durur** (`src/lib/giderRaporu.js`), `printTemplates.js`'e
  yazılmaz. Sebep ölçülebilir: `tests/gider-gizlilik.test.js` o dosyayı **üç ayrı desenle** tarıyor ve
  üçü de rapor koduyla çakışır: satır 11 `YASAKLI` deseni **`giderler` sözcüğünü** içeriyor (satır 15
  `printTemplates.js`'in eşleşmemesini şart koşuyor), satır 49-50 `YONTEM` deseni `hesapHareketleri`,
  `yontemKirilimi` ve `donemYontemKirilimi`'ni yasaklıyor, satır 59-60 `HEDEF_DESEN` `hedefAdi` ile
  `"elden"`i yasaklıyor. Üç tarama `printTemplates.js`'i hedeflemeye **aynen devam eder** (AC-25); yeni
  dosya çıktı temelli testle korunur (R22, AC-24). Belgeyi önizlemeye gönderen çağrı mevcut yazdırma
  yolunu kullanır, HTML'i üreten kod o dosyada durmaz.
- **R36.** **Paylaşılan rapor düğmesi `src/components/gider/` klasörünün dışında durur** (örnek
  `src/components/rapor/GiderKasaRaporuDugmesi.jsx`) ve yazdırma çağrısını **o** yapar; `Giderler.jsx`
  yalnız bileşeni yerleştirir. Sebep: aynı testin satır 24-26'sı `Giderler.jsx`, `GiderForm.jsx` ve
  `src/components/gider/` klasöründeki **her dosyayı** `readdirSync` ile gezip
  `appPrint|printHtml|downloadCSV|XLSX|writeFile` aramasını yasaklıyor. Bu kural **gevşetilmez**; bu bir
  yer seçimi sorunudur. `Finance.jsx` ve `Kasa.jsx` taramada olmadığı için onlarda düğme serbesttir.
  R33'ün yetki kapısı da bu tek dosyada bir fonksiyon olarak durur.
- **R37.** **`kasa.hesapBakiyeleri`'ne aralık parametresi eklenir.** Bugün bütün zamanın yürüyen bakiyesini
  veriyor, tarih aralığı yok (aralıklı devreden bakiye yalnız ekstrelerde var). Aralık verildiğinde: aralık
  öncesi satırlar **"devreden = ayın açılışı"** olarak katlanır, aralık içi satırlar giren ve çıkan olur,
  sonuç kapanıştır (ekstrenin devreden deseni). **Aralıksız çağrı bugünkü davranışı birebir korur** ve
  mevcut ekran testleri değişmez. Bu, C2'nin "ikinci hesap yazılmaz" kuralının gereğidir: rakam motorda
  olmadığı için rapor içinde ikinci bir toplama yapılırsa tam olarak C2 çiğnenir.
- **R38.** **Çekin ay sonu durumu için saf bir yardımcı eklenir** (`cekDurumuAyinSonunda(cek, ayinSonGunu)`):
  çekin `gecmis` satırlarının o tarihe kadar olan sonuncusu, yoksa "portföyde". Bugün `cek.portfoySatirlari`
  çekin **güncel** `durum` alanına bakıyor (`ELDE_DURUMLAR` = portföyde + tahsile verildi), bu yüzden eylülde
  elde olup ekimde tahsil edilen çek eylül raporunda yanlış görünürdü. Geçmişi olmayan eski çekte güncel
  durum kullanılır ve belgede dipnotla söylenir. R15'in dört rakamı (elde, tahsil, ciro, karşılıksız) aynı
  `gecmis` tarihlerinden gelir.
- **R39.** **Finans'a dört dizi daha geçirilir:** `hesapHareketleri`, `kasaHesaplari`, `cekler`,
  `tedarikciler`; veri **yalnız `kasaYetki` ile** verilir (0046'nın `cekler` deseni). `Finance.jsx` bugün
  `giderler`, `giderTurleri` ve `giderYururlukAy`'ı alıyor ve `hesaplaGiderRaporu`'nu KDV kartı için zaten
  çağırıyor, ama bu dördünü almıyor; geçirilmezse Finans'tan alınan rapor kasa bölümünü boş üretir.
  Yetkisiz kullanıcıda düğme zaten çizilmez (R23).
- **R40.** **AC-7'nin kapsamı daraltılır:** rapor ile Anasayfa hatırlatıcısı yalnız **içinde bulunulan ay**
  için aynı kapsamı verir (ikisi de `odemeHatirlatmalari`'nı çağırır, rapor `bugun` yerine ay sonunu
  geçirir). Geçmiş aylarda karşılaştırma yapılmaz: hatırlatıcı bugüne göre (0003, `useBugun`), rapor ay
  sonuna göre çalışır ve farklı olmaları beklenen davranıştır.
- **R41.** **Hesabın açılış tarihi:** hesap, `acilisTarihi`nin ayından **önceki** aylarda raporda hiç
  görünmez (henüz yoktur). Açılış ayında açılış bakiyesi **ayrı bir "açılış" satırıdır**, "giren" tarafına
  yazılmaz (ekrandaki `acilisK` deseni). Ay ortasında açılan hesapta ayın açılışı sıfır kabul edilir.
- **R42.** **Kapatılmış hesap:** o ay hareketi olan ya da kapanış bakiyesi sıfırdan farklı olan kapalı
  hesap raporda **görünür** (yoksa toplam tutmaz) ve satırında "kapalı" ibaresi durur; hem hareketi hem
  bakiyesi sıfır olan kapalı hesap listeye girmez.
- **R43.** **Kalem listesi kutusunun durumu hatırlanmaz:** her rapor açılışında varsayılan açıktır. Makine
  yereli bir tercih için `localStorage` açmaya değmez ve üç ekranda tutarlı olur.
- **R44.** **Boş ay:** seçili ayda hiç gider ve hiç hareket yoksa rapor **yine üretilir** ve her bölüm
  "Bu ayda kayıt yok" satırıyla geçilir (AC-38'in genel hâli); düğme pasifleştirilmez, çünkü "bu ay boş"
  da raporlanacak bir bilgidir.
- **R45.** **Yürürlük öncesi ay:** yürürlük ayından önceki bir ay seçilirse belge, `hesaplaGiderRaporu`'nun
  döndürdüğü `yururlukOncesi` durumunu bir açıklamayla yazar (motor bu bilgiyi zaten veriyor), boş tablolar
  çizilmez.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır.
- **C2.** **Tek gerçek kaynak:** rapor, ekrandaki Dönem Raporu ve Kasa ile **aynı motorlardan** beslenir
  (`gider.js`, `kasa.js`, `giderKdv.js`). Rapor için ikinci bir hesap yazılmaz; ekran ile kâğıt asla
  farklı rakam göstermez. **Motorda olmayan bir rakam gerekiyorsa motor genişletilir, rapora hesap
  yazılmaz** (R37, R38); genişletme geriye dönük uyumludur ve mevcut çağrıların davranışını değiştirmez.
  **Uygulama (R3, Q5):** hareket özeti ve kasa yöntem kırılımı `kasa.hareketOzeti`, aralıklı hesapsız listeler mevcut
  fonksiyonlara isteğe bağlı aralıkla, çek ay özeti `cek.cekAyOzeti`; rapor kurucusu yalnız çağırır. `Finance.jsx`
  0020 `MALIYET` taramasında da olduğu için rapor adları (`Personel gideri`, `kovaDagilimi` vb.) oraya girmez.
- **C8.** **Dosya yerleşimi gizlilik taramasının parçasıdır** (R35, R36): rapor kurucusu
  `printTemplates.js`'in dışında, paylaşılan düğme `src/components/gider/` klasörünün dışında durur.
  `tests/gider-gizlilik.test.js`'in mevcut üç kaynak taraması ve klasör taraması **hiç gevşetilmez**;
  yeni dosyalar çıktı temelli testle korunur.
- **C3.** Rapor **gelir raporu değildir.** Kasa bölümündeki "giren" kalemi nakit görünümüdür; Finans'ın
  aylık raporundaki ciroyla toplanmaz. Belgede bu bir cümleyle yazılır.
- **C4.** Rapor hiçbir tutarı değiştirmez, hiçbir kaydı üretmez.
- **C5.** Yeni kalıcı alan yoktur; rapor tamamen mevcut veriden türer.
- **C6.** Yazdırma çıktısı beyaz kâğıt içindir; tema renkleri kâğıda taşınmaz (mevcut şablon deseni).
- **C7.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Gider ve kasa verisinin CSV/XLSX olarak dışa aktarılması — *neden:* bu iş bir kapı açıyor
  (yazdırma); ikinci kapıyı (dışa aktarma) aynı anda açmak gizlilik yüzeyini iki katına çıkarır.
  İhtiyaç doğarsa aynı gizlilik kurallarıyla ayrı iş olur.
- **X2.** Tedarikçi ve çalışan ekstresinin yazdırılması — *neden:* 0024 B9'da bilinçle kapsam dışı
  bırakıldı ve o karar değişmedi; çalışan ekstresi zaten kişi bazlıdır.
- **X3.** Serbest tarih aralığı raporu — *neden:* Finans'taki emsal aylıktır; aralık raporu ayrı bir
  karardır.
- **X4.** Raporun e-posta ile gönderilmesi — *neden:* çıktı önce kâğıda doğru düşsün.
- **X5.** Makina kârlılığı ve makina bazlı maliyet tablolarının rapora girmesi — *neden:* 0002 ve 0020
  bu rakamların yalnız ekranda kalmasına karar verdi; R9 yalnız kova toplamlarını yazar.
- **X6.** İki raporun **tek belgede birleştirilmesi** — *neden:* Finans raporunu gider yetkisi olmayan
  kullanıcı da alabiliyor. Birleştirilirse aynı adlı belge kişiye göre farklı içerik taşır: iki kişi aynı
  ayı yazdırır, iki farklı kâğıt çıkar ve alt toplamlar tutmaz. Belgeler ayrı kalır; **düğmeler yan yana
  durur** (R2).
- **X7.** Grafik, pasta dilimi ya da renkli görselleştirme — *neden:* belge tablo temellidir, mevcut
  rapor şablonuyla aynı dilde.
- **X8.** Raporun sürümlenmesi ya da arşivlenmesi (aynı ayın eski çıktısının saklanması) — *neden:* yeni
  tablo ve göç demek; R29'un tek cümlesi ihtiyacı karşılıyor.
- **X9.** **Personel ayrıntı sayfası** (çalışan bazlı tutarların isteğe bağlı ek sayfa olarak eklenmesi) —
  *neden:* taslak turunda önerildi ve **Takım Yöneticisi reddetti (2026-09-30)**. Kâğıt bir kez çıktığında
  uygulamanın izin sınırının dışına çıkar; çalışan ayrıntısı ekranda kalır. Bu kapı ileride yeniden
  açılmak istenirse kendi spec'iyle açılır.
- **X10.** Döviz hesaplarının kurla TL'ye çevrilip tek toplamda gösterilmesi — *neden:* R30; "hangi günün
  kuru" sorusu bu projede ayrı bir hassasiyet (0002 R12) ve raporun tekrarlanabilirliğini bozar.

---

## Context

- **Emsal.** Finans'ın aylık raporu saf motor `src/lib/aylikRapor.js` (`hesaplaAylikRapor`) ile
  hesaplanıyor, `printTemplates.js` içindeki `buildAylikRaporHtml` ile HTML'e dönüyor ve yazdırma
  penceresine gidiyor. Bu iş aynı deseni gider ve kasa tarafına taşır.
- **Ekrandaki hesap zaten var.** Gider tarafında `gider.js hesaplaGiderRaporu` tür ve tedarikçi
  kırılımını, borç özetini ve kovaları üretiyor; KDV karşılaştırması `giderKdv.js`'de; kasa tarafında
  `kasa.js hesapBakiyeleri` yürüyen bakiyeyi, `hesapsizOdemeler` hesabı belirtilmemiş hareketleri,
  `avansBorclari` avans borcunu veriyor. Rapor bunları çağırmalıdır (C2); yeniden hesaplamak ekran ile
  kâğıdı ayrıştırır ve bu proje o hatayı daha önce ödedi (Finans ile aylık raporun ayrışması).
- **Gizlilik duvarı bugün mutlak ve bu iş onu bilerek deliyor.** `tests/gider-gizlilik.test.js` şunları
  sabitliyor: `printTemplates.js`, `aylikRapor.js` ve `SettingsExport.jsx` gider ve personel alanlarını
  **hiç okumayacak**; üstelik **gider bileşenleri `appPrint`/`printHtml` çağıramayacak**. Yani bugün
  Giderler ekranına bir yazdırma düğmesi koymak testi kırar. Bu tesadüf değil, 0001'in kararıydı.
  Bu spec o kararı **daraltarak** yeniden çiziyor: yasak olan **gider verisinin yazdırılması** değil,
  **çalışan bazlı tutarın ve elden bileşenin** yazdırılmasıdır. Toplamlar, türler, tedarikçiler,
  hesaplar ve çekler yazdırılabilir; çalışan adı ve ona bağlı rakam yazdırılamaz.
- **Korumanın yeni biçimi.** Kaynak taraması bu ayrımı ifade edemez ("giderler" kelimesini yasaklamak
  raporu da yasaklar). Bu yüzden R22: rapor ayırt edici veriyle (tanınabilir çalışan adı, tanınabilir
  elden tutarı) üretilir ve **çıktının içinde** bunların geçmediği doğrulanır. Bu, kaynak taramasından
  güçlü bir korumadır; müşteriye giden yazdırma şablonlarındaki mevcut tarama olduğu gibi kalır.
- **Taramanın tam şekli (QA turunda ölçüldü).** `tests/gider-gizlilik.test.js` dört ayrı denetim yapıyor ve
  üçü `printTemplates.js`'i hedefliyor: satır 11 `YASAKLI` (`resmiTutar|eldenTutar|…|giderler|giderTanimlari|
  standartGiderler|tedarikciler|ekOdemeler|…`) satır 15'te `printTemplates.js`'e, satır 18'de
  `aylikRapor.js`'e, satır 21'de `SettingsExport.jsx`'e uygulanıyor; satır 49-50 `YONTEM` deseni
  (`odemeYontemi|yontemKirilimi|donemYontemKirilimi|hareketPaylari|hesapHareketleri`) aynı üç dosyada;
  satır 59-60 `HEDEF_DESEN` (`HEDEF.ELDEN|"elden"|hedefAdi|personelHedefKurus|HEDEF_AD`) yine aynı üçünde.
  Dördüncü denetim (satır 24-26) `Giderler.jsx`, `GiderForm.jsx` ve **`src/components/gider/` klasöründeki
  her dosyayı** `readdirSync` ile gezip `appPrint|printHtml|downloadCSV|XLSX|writeFile` arıyor. Bu yüzden
  bu iş taramayı gevşetmeden, yalnız **dosya yerleşimiyle** çözülür (R35, R36, C8).
- **Motorda olan ve olmayan (QA turunda doğrulandı).** Olan: `hesaplaGiderRaporu(veri, {baslangic, bitis},
  {bugun})` aralık ve `bugun` alıyor, `borcOzeti(…, bugun)` ve `odemeHatirlatmalari(…, bugun)` de öyle, yani
  ay sonu kilidi (R26) parametreyle sağlanır. Olmayan: `kasa.hesapBakiyeleri` tarih aralığı almıyor (ay
  açılış ve kapanışı yok, R37) ve `cek.portfoySatirlari` çekin **güncel** durumuna bakıyor (ay sonu durumu
  yok, R38). İki eksik motor genişletmesiyle kapanır, rapora hesap yazılmaz (C2).
- **Ekranların dönem seçicisi (QA turunda doğrulandı).** `Finance.jsx`'te `raporAy` (`<input type="month">`,
  varsayılan önceki ay) var; `Giderler` seçicisi **Tarih Aralığı** kipinde iki aya yayılabiliyor (0022);
  `Kasa.jsx`'te dönem ya da ay durumu **hiç yok**. R3 bu yüzden ayı düğmenin kendisine taşıyor.
- **Finans'ın elindeki veri (QA turunda doğrulandı).** `Finance.jsx` `giderler`, `giderTurleri` ve
  `giderYururlukAy`'ı alıyor ve `hesaplaGiderRaporu`'nu KDV kartı için zaten çağırıyor; `hesapHareketleri`,
  `kasaHesaplari`, `cekler` ve `tedarikciler`'i **almıyor** (R39). `Finance.jsx` gizlilik taramasının
  dosya listesinde olmadığı için `printHtml`'i bugün de çağırıyor (aylık rapor).
- **Personelin tek satır olması yeni değil.** 0020 makina bazlı ekranlarda personel kalemini
  "Personel gideri" etiketiyle gösteriyor ve çalışan adını basmıyor; R18 aynı kuralı rapora taşır.
- **Eski bir beklenti kapanıyor.** Gizlilik testinin içinde "rapor şablonu 0002 ile birlikte değişecek"
  notu duruyor; 0002 Finans ekranına dokunmama kararı verdiği için bu hiç olmadı. Bu spec o açık ucu
  kapatır: gider raporu Finans'ın raporuna eklenmez, **kendi belgesi** olur (X6).
- **Kasa bölümünün çift sayım riski.** Kasa'ya giren paranın bir kısmı (müşteri tahsilatları) Finans'ın
  raporunda ciro olarak zaten var. İki belgeyi toplayan biri aynı parayı iki kez sayar. C3 bunu belgenin
  içine yazılmış bir cümleyle önler; aynı sınıf uyarıyı 0001 C19, 0021 R7, 0024 C3 ve 0040 C2'de de
  koyduk.
- **Neden tek belge, iki bölüm.** Gider ve kasa ay sonunda aynı kişinin aynı soru kümesine baktığı iki
  yüzdür ("ne harcadık" ve "kasada ne oldu"), ve ödeme tarafı doğal olarak birinden ötekine akar. İki
  ayrı belge, aynı ayın iki kâğıdını üretip ilişkiyi koparırdı.

---

## Acceptance Criteria

### Rapor ve gider bölümü

- **AC-1.** Giderler ekranından seçili ay için rapor alınır ve yazdırma önizlemesi açılır.
- **AC-2.** Kasa ekranından alınan rapor, aynı ay için aynı belgeyi üretir.
- **AC-3.** Rapor başlığında ayın adı ve dönem aralığı yazar.
- **AC-4.** Gider özeti toplam gideri, ödeneni, ödenmeyeni, indirilecek KDV'yi ve kesilen stopajı
  ekrandaki Dönem Raporu ile **aynı** gösterir. **(R3 ile daraltıldı, Q2):** toplam, KDV ve stopaj her zaman aynıdır;
  ödenen ve ödenmeyen yalnız ay kapandıktan sonra o aya ödeme girilmediyse aynıdır (rapor ay sonunu, ekran bugünü
  gösterir; R40'ın AC-7 deseni).
- **AC-5.** Gider türü kırılımındaki toplam, özet toplamıyla tutarlıdır.
- **AC-6.** Tedarikçi kırılımı açık borcu gösterir; tedarikçisi seçilmemiş kalemler ayrı satırda toplanır.
- **AC-7.** **İçinde bulunulan ay** için vadesi geçmiş ve yaklaşan ödemelerin sayısı, Anasayfa
  hatırlatıcısının verdiği kapsamla aynıdır (ikisi de `odemeHatirlatmalari`'nı çağırır). Geçmiş aylarda
  karşılaştırma yapılmaz; rapor ay sonuna, hatırlatıcı bugüne göre çalışır (R40).
- **AC-8.** Dört kova toplamı ayın gider toplamına eşittir.
- **AC-9.** KDV karşılaştırması Finans kartındaki rakamla aynıdır.
- **AC-10.** Kalem listesi tarih sırasıyla basılır ve ödeme durumunu gösterir.

### Kasa bölümü

- **AC-11.** Her hesap için açılış, giren, çıkan ve kapanış bakiyesi basılır.
- **AC-12.** Kapanış bakiyesi, açılış artı giren eksi çıkana eşittir.
- **AC-13.** Hareket özeti ödeme, tahsilat, virman ve avansı ayrı ayrı sayar.
- **AC-14.** **Kasa bölümündeki** ödeme yöntemi kırılımının toplamı, ayın içinde yapılan ödeme
  hareketlerinin toplamına eşittir. **Gider bölümündeki** kırılım 0041'in kalem bazlı rakamıyla aynıdır ve
  ikisinin farklı olabileceği belgede yazılıdır (R14).
- **AC-15.** Çek bölümü ay sonunda elde duran, tahsil edilen, ciro edilen ve karşılıksız çıkan çekleri
  gösterir.
- **AC-16.** Hesabı belirtilmemiş hareketler ayrı sayılır ve bakiyeye girmediği belgede yazar.
- **AC-17.** Açık avans toplamı tek rakam olarak basılır.
- **AC-18.** Belgede, kasa bölümünün gelir raporu olmadığı ve Finans raporuyla toplanmayacağı yazar.

### Gizlilik

- **AC-19.** Raporda hiçbir çalışan adı geçmez.
- **AC-20.** Personel gideri tür kırılımında tek toplam satırı olarak görünür.
- **AC-21.** Resmi ve elden ayrımı raporun hiçbir yerinde görünmez.
- **AC-22.** Fazla mesai, prim ve ikramiye satırları raporda görünmez.
- **AC-23.** Çalışan avansı kişi bazında görünmez.
- **AC-24.** Ayırt edici çalışan adı ve elden tutarı içeren veriyle üretilen raporun çıktısında bu
  değerlerin hiçbiri bulunmaz.
- **AC-25.** Müşteriye giden yazdırma şablonları (`printTemplates.js`'in mevcut belgeleri),
  `aylikRapor.js` ve `SettingsExport.jsx` gider alanlarını okumamaya devam eder.

### Yetki

- **AC-26.** Gider yetkisi olmayan kullanıcı rapor düğmesini görmez. (R3, Q3: kapı `kasaYetki`; Finans sekmesi olmayan
  Giderler kullanıcısı da görmez.)
- **AC-27.** Yayın perdesi inikken rapor alınamaz.
- **AC-28.** Rapor alındıktan sonra hiçbir kayıt değişmemiştir.
- **AC-29.** Finans ekranındaki düğme, o ekranın mevcut ay seçicisini kullanarak aynı belgeyi üretir.

### Dönem kilidi, para birimi ve seçenekler

- **AC-30.** Geçmiş bir ayın raporu iki kez alındığında, arada o aya kayıt girilmediyse iki belge birebir
  aynıdır.
- **AC-31.** Açık borç, kasa kapanış bakiyesi, çek portföyü ve açık avans **ay sonu itibarıyla**
  hesaplanır; rapor ertesi ay alındığında bu rakamlar değişmez.
- **AC-32.** Her bölüm başlığı dönem mi yoksa ay sonu itibarıyla mı olduğunu yazar.
- **AC-33.** "Yaklaşan ödemeler" ay sonundan sonraki eşik gününü kapsar.
- **AC-34.** Belgede, raporun yazdırıldığı andaki veriyle üretildiği yazar.
- **AC-35.** Farklı para birimindeki hesaplar ayrı bloklarda listelenir ve bloklar arası toplam yazılmaz.
- **AC-36.** Tek para birimi varken tek blok çıkar ve belge bugünkü sadelikte kalır.
- **AC-37.** Hesabı belirtilmemiş hareketler tarih, tutar ve kalemiyle listelenir.
- **AC-38.** Hesabı belirtilmemiş hareket yokken o bölüm "yok" olarak geçilir, boş tablo çizilmez.
- **AC-39.** ~~Kalem listesi kutusu kapatıldığında belge o bölüm olmadan üretilir, diğer bölümler aynı kalır.~~ **(0055 ile geri alındı, 2026-10-01: seçenek kaldırıldı, liste hep gelir; ölçüsü 0055 AC-4…AC-9.)**
- **AC-40.** Üç ekrandaki düğme aynı yetki kapısından geçer; kapı kapalıyken üçünde de görünmez.

### Dosya yerleşimi, motor ve sınır durumları (R2 turu)

- **AC-41.** `tests/gider-gizlilik.test.js`'in üç kaynak taraması ve klasör taraması **gevşetilmeden**
  geçer; rapor kurucusu `printTemplates.js`'in dışındadır.
- **AC-42.** Paylaşılan rapor düğmesi `src/components/gider/` klasörünün dışındadır ve `Giderler.jsx` ile
  `gider/` klasöründeki hiçbir dosya yazdırma çağırmaz.
- **AC-43.** Rapor düğmesinin yanındaki ay alanı varsayılan olarak **önceki ayı** gösterir.
- **AC-44.** Giderler ekranı Tarih Aralığı kipindeyken de rapor alınabilir; ay alanı bağımsız çalışır.
- **AC-45.** Kasa ekranından rapor alınabilir ve ayı düğmenin kendi alanından gelir.
- **AC-46.** `hesapBakiyeleri` aralıksız çağrıldığında bugünkü çıktısını birebir verir (geriye dönük uyum).
- **AC-47.** Aralık verildiğinde ayın açılışı, giren, çıkan ve kapanışı doğru döner; aralık öncesi hareketler
  açılışa katlanır.
- **AC-48.** Eylülde elde olup ekimde tahsil edilen çek, eylül raporunda "elde" görünür; ekim raporunda
  "tahsil edildi" sayılır.
- **AC-49.** `gecmis` kaydı olmayan eski çekte güncel durum kullanılır ve belgede dipnot görünür.
- **AC-50.** Ciro hareketleri hesabı belirtilmemiş hareket sayısına ve listesine girmez.
- **AC-51.** Hesabı belirtilmemiş **tahsilatlar** ayrı bir satırda sayılır ve ödemelerle karıştırılmaz.
- **AC-52.** Hareket özeti mahsubu da sayar ve mahsubun bakiyeye girmediği belgede yazar.
- **AC-53.** Tahsilat satırı dört kaynağı (makina, servis, Extra Kalıp, yedek parça) ayrı ayrı gösterir.
- **AC-54.** Finans'tan alınan raporun kasa bölümü doludur (dört dizi geçirilmiştir).
- **AC-55.** Açılış tarihi seçili aydan sonra olan hesap raporda görünmez; açılış ayında açılış ayrı satırdır.
- **AC-56.** Hareketi ve bakiyesi sıfır olan kapalı hesap listeye girmez; hareketi olan kapalı hesap
  "kapalı" ibaresiyle görünür.
- **AC-57.** ~~Kalem listesi kutusu her açılışta varsayılan açık gelir (durum hatırlanmaz).~~ **(0055 ile geri alındı, 2026-10-01: kutu kaldırıldı; ölçüsü 0055 AC-1…AC-3.)**
- **AC-58.** Hiç kaydı olmayan ay için rapor üretilir ve bölümler "Bu ayda kayıt yok" ile geçilir.
- **AC-59.** Yürürlük ayından önceki bir ay seçilirse belge bunu açıklamayla yazar, boş tablo çizmez.
- **AC-60.** Bir kalem çöpe atıldığında geçmiş ayın raporu da değişir; belgedeki uyarı bunu kapsar.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Rapor verisi mevcut motorlardan besleniyor; ikinci bir hesap yazılmadı (C2, kaynak taraması).
- [x] Ekran ile kâğıdın aynı rakamı verdiği çapraz testle gösterildi (AC-4, AC-9).
- [x] Tekrarlanabilirlik testle gösterildi: aynı ay, farklı günlerde, aynı belge (AC-30, AC-31).
- [x] Rapor düğmesi ve yetki kapısı tek yerde; üç ekran aynı bileşeni kullanıyor (R33, AC-40).
- [x] Gizlilik koruması **çıktı temelli** teste dönüştürüldü (AC-24) ve müşteri şablonlarındaki mevcut
      kaynak taraması korundu (AC-25); `tests/gider-gizlilik.test.js` bu iki katmanı birlikte içeriyor.
- [x] Gizlilik taraması **hiç gevşetilmedi**: rapor kurucusu `printTemplates.js` dışında, düğme
      `src/components/gider/` dışında, dört denetim de eski hâliyle geçiyor (AC-41, AC-42, C8).
- [x] İki motor genişlemesi geriye dönük uyumlu: `hesapBakiyeleri` aralıksız çağrıda birebir aynı
      (AC-46), `cekDurumuAyinSonunda` saf ve testli (AC-48, AC-49).
- [x] Ay sonu kilidi `bugun` parametresiyle sağlandı, yeni kilit katmanı yazılmadı (R26, Ö-11). Q1 ile
      hareketler ayrıca `tarih ≤ ay sonu` süzülüp mevcut `odemeleriUygula`'dan geçiyor; yeni katman değil.
- [x] Finans'a dört dizi `kasaYetki` ile geçirildi ve oradan alınan raporun kasa bölümü dolu (AC-54). Q4 ile
      diziler App'in tek `giderKasaRaporVerisi` memosunda geçiyor; üç ekran aynı nesneyi alıyor.
- [x] Görsel kanıt eklendi (`docs/evidence/0047-*.jpg`): raporun gider ve kasa bölümleri, rapor düğmeleri.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: gizlilik kuralının yeni sınırı (toplam yazdırılır, çalışan bazlı tutar
      yazdırılmaz) ve raporun tek kaynaktan beslendiği yazıldı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R3 plan onayı anında işlendi. Onaydan sonra triyajda R31'e TY onaylı istisna eklendi (hesapsız listede personel ödemeleri ve avanslar toplu satır). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Bir triyaj turu (3 bulgu); ayrıca kanıt incelemesinde tutarsız göç hareketinin "₺0" yazdığı görülüp düzeltildi. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Hesapsız listede tek çalışanın elden ödemesi tarih ve tutarıyla kâğıda düşüyordu (gizlilik, gerçek); aynı ay içinde iptal edilen ciro sayılıyordu (gerçek); gizlilik testi başlığında AC-25 atfı eksikti (izlenebilirlik). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Motor genişlemeleri aralıksız çağrıda birebir aynı (AC-46); mevcut 342 ekran 0 piksel. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Toplam yazdıran bir belgede gizlilik yalnız "hangi alan okunuyor" ile korunamaz: tek tek listelenen hareketler de kişi bazlı veridir, çünkü tarih ve tutar bir çalışanı tanıtır. Çıktı temelli test (ayırt edici ad ve tutarları üretilen HTML'de aramak) bunu yakalayabilecek tek katmandı; test verisi tek çalışanlı olduğu sürece sızıntı görünmedi, iki çalışan ve hesapsız elden ödeme eklenince göründü. İkincisi: ay sonu kilidinde "durum" (çek) geçmişten okunurken aynı ay içinde geri alınan geçişler ayrıca düşünülmeli; son durum ile ay içinde yaşanan geçiş farklı sorulardır.
