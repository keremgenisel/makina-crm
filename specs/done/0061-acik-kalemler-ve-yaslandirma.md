# 0061 — Geçmiş Aylardan Kalan Borçlar: Açık Kalemler Listesi ve Yaşlandırma

| | |
|---|---|
| **Durum** | Tamamlandı (commit `ced9635`, dal `feat/0061-acik-kalemler`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler (Dönem Raporu'nun ödeme süzgeci, kalem listesi), Aylık Gider ve Kasa Raporu |
| **Bağımlı spec'ler** | 0001 (borç özeti, K21 personel ayrıntısı) · 0003 (ödeme hatırlatıcısı, kip emsali) · 0016 (boş durum) · 0021 (stopaj hedefi, kalem sayma kuralı) · 0022 (altı sekme kabulü, C4'ün dayanağı) · 0042 (personel hedefleri) · 0047 ve 0059 (rapor) · 0060 (hedef adları) |
| **Revizyon** | R1 (QA turu, 2026-10-02): geliştirici hazırlığı denetimi, 17 bulgu işlendi, 4'ü bloklayıcıydı. Hedef başına personel satırının **K21'i ihlal ettiği** bulundu (R3, R4), listenin bugünkü `KalemListesi`'ne oturmadığı ve kipin süzgeç değeri olamayacağı görüldü (R1), uygulamada **zaten bir yaşlandırma olduğu** ölçüldü (R8, R14, X1) ve kova sayılarının kalem mi hedef mi olduğu tanımsızdı (R8, R9). R20–R26, C7–C9, X7 ve AC-24…AC-38 eklendi. **Onayla birlikte iki karar (2026-10-01, Takım Yöneticisi):** (1) kalemin **yaşı gider tarihinden** sayılır, çünkü borç o gün doğar; vade ayrı sütunda okunur (R6). (2) Vadesi girilmemiş kalem **gizlenmez**, listeye girer ve rozetle işaretlenir (R5, R8).<br>**R2 (2026-10-02, plan onayı):** bütün öneriler kabul (Q1–Q10): motor ayrı modülde (R27), sıralama (R28), kova süzmesi personel toplu satırına da uygulanır (R29), kip hatırlatma kipiyle birbirini dışlar (R30), rapor kutusunun yeri ve taraf tablosu (R31), raporun kapsamı ay sonu (R32), tek çalışanlı ayda "Çalışanlar" satırı kabul edilen risk (R33), satırdan ödeme yalnız hedef satırında (R34), vadesi geçmiş/vadesiz sayısının kalem bazlı tanımı (R35); 0060 önce kapatıldı. AC-39…AC-42. |

---

## Intent

Kullanıcı geçmiş aylardan kalan bir borcu **kalem kalem** göremiyor. Bugün elindekiler:
"Kime Ne Kadar Borçluyuz" kartı (dönemden bağımsız ama kişi bazında toplanmış), "Tedarikçilere
açık borç" tek rakamı, ödeme hatırlatıcısı (kalem kalem, ama **yalnız vadesi girilmiş** kalemler) ve
ekstre (tek tedarikçi ya da tek çalışan için).

İki somut boşluk var:

1. **Vadesi girilmemiş eski bir borç hiçbir listede kalem olarak görünmüyor.** Hatırlatıcı açık
   hedefleri vade şartıyla süzüyor, Dönem Raporu tahakkuk esaslı olduğu için kalem geçmiş ayda
   kalıyor. Bulmanın tek yolu dönemi ay ay geriye almak.
2. **Yaşlandırma yok.** "Bu borç ne zamandan kalma", "kaç gün gecikmiş", 0-30 / 31-60 / 61-90 / 90+
   gün kırılımı hiçbir ekranda ve hiçbir raporda yok. Borç kartı kişiye göre toplar, zamana göre
   toplamaz.

Başarı şu demek: tek bir yerde, dönem seçmeden, bütün açık kalemler yaşıyla ve kalan tutarıyla
okunuyor; hangi borcun ne zamandan kaldığı ve nerede biriktiği hem ekranda hem raporda görünüyor.

---

## Requirements

### A. Açık Kalemler kipi

- **R1.** **Yeni görünüm sekmesi açılmaz.** Liste, Giderler › Dönem Raporu'nun ödeme süzgeci yanındaki
  bir kiple açılır (bugünkü "Hatırlatma kapsamı" düğmesinin emsali ve komşusu): **"Açık kalemler (tüm
  dönemler)"**. Kip açıkken dönem seçici pasifleşir (emsal `fieldset disabled`, `Giderler.jsx:269`) ve
  yerine kapsam ibaresi yazılır.
  **Kip, ödeme süzgecinin bir değeri DEĞİLDİR; ayrı bir durumdur** (`acikKalemlerModu`). Sebep: hatırlatma
  kipi `filtre.odeme === "hatirlatma"` değeriyle çalışıyor ve **aynı kalem tablosunu süzüyor**
  (`Giderler.jsx:283` `KalemListesi kalemler={hatirlatmaKalemleri}`); bu liste ise farklı sütunlu ve hedef
  satırlı **başka bir tablodur** (R20). Süzgeç değeri yapılırsa liste içindeki `<select>`
  (`DonemRaporu.jsx:385`) bütün tabloyu değiştirir ve yeni tabloda o süzgeç kullanılamaz hâle gelir.
  **Kip yalnız düğmeden açılır**; liste içi süzgeç yeni tabloda kova süzgecine dönüşür (R10).
- **R2.** **Kapsam, borç özetiyle aynıdır** (çöpteki, ödenmiş, tarihsiz, yürürlük ayından önceki,
  gider tarihi gelecekte olan ve ödenecek tutarı sıfır olan kalemler hariç) ve **vade şartı yoktur**.
  Hatırlatıcıdan tek ayrımı budur.
- **R3.** Satır **ödeme hedefi başınadır**: kira kaleminin kiraya veren ve vergi dairesi tarafı, personel
  kaleminin maaş ve ek ödeme hedefleri ayrı satırlardır (borç hedef başına doğduğu için).
  **Personel bu kuralın gizlilik istisnasıdır (K21):** `borcOzeti` personeli bilerek tek satırda topluyor
  ("Çalışanlar · n kişi") ve kişi kırılımını "Adları göster" anahtarının arkasında tutuyor
  (`DonemRaporu.jsx:163`, `:168-175`). Liste aynı deseni kullanır: personel **varsayılan olarak tek toplu
  satırdır** (kişi sayısı, kalem sayısı ve kova dağılımıyla), anahtar açılınca çalışan ve hedef satırları
  görünür. Tedarikçi, "tedarikçi seçilmemiş" ve vergi dairesi satırları doğrudan görünür.
- **R4.** Satırda okunanlar: taraf (tedarikçi, çalışan topluluğu, vergi dairesi ya da "tedarikçi
  seçilmemiş"), kalem (tür ve açıklama), **gider tarihi**, vade, **yaş (gün)**, kalan tutar, durum.
  Personel toplu satırında taraf "Çalışanlar"dır ve kalem sütunu "Personel gideri" yazar; çalışan adı
  yalnız anahtar açıkken görünür.
- **R5.** Vadesi girilmemiş satır **gizlenmez**, "Vade girilmemiş" rozetiyle işaretlenir ve
  sıralamada vadeli satırlardan sonra gelir.
- **R6.** **Yaş, gider tarihinden bugüne geçen gün sayısıdır** (vadeden değil). Vade ayrı sütunda
  okunur; gecikme bilgisi vadeden türer ve ikisi karıştırılmaz. **Hesap `odemeHatirlatma.gunFarki`
  iledir** (`gunFarki(k.tarih, bugun)`): o fonksiyon ISO tarihleri gün numarasına çevirip çıkarır, saat
  taşımaz ve saat dilimi kaymaz. `new Date()` ve `Date.now()` okunmaz; mevcut alacak yaşlandırması
  `Date.now()` kullanıyor (`aylikRapor.js:379`) ve yerel gün sınırında kayabiliyor, o desen
  tekrarlanmaz.
- **R7.** Satırdan ödeme kaydedilebilir: bugünkü ödeme penceresi o hedef seçili açılır
  (`gider_odeme` izni; hatırlatıcı listesindeki "Ödendi" düğmesinin emsali). Mekanizma hazır:
  `Giderler.jsx`'teki `setOdemeHedefi({ kalemId, hedef: { hedef } })` durumu kullanılır, yeni bir yol
  açılmaz. Ödeme kaydedilip kalan sıfırlanınca **satır listeden düşer** ve kova sayıları tazelenir
  (`giderler` değişince memo yenilenir, emsal `hatirlatmaKalemleri`).

### B. Yaşlandırma

- **R8.** Kovalar **0-30 / 31-60 / 61-90 / 90+ gün**; her kovada **kalem** sayısı ve toplam kalan tutar.
  **Kova tanımı ikinci kez yazılmaz:** aynı dört kova bugün Aylık Faaliyet Raporu'nda müşteri alacakları
  için var: `aylikRapor.js:380-381`'deki `yasKovaAdi` ve `YAS_SIRA` sabiti aynı dört adı taşıyor. Kova
  adları, eşikleri ve sırası **tek saf yardımcıya** çıkarılır ve iki rapor onu çağırır.
  Yardımcının "tarihsiz → 90+ gün" dalı korunur ama gider tarafında erişilemez (kapsam `!k.tarih` olan
  kalemi zaten dışlar, R2); bu yazılı kalır ki "tarihsiz kalem neden 90+ kovada" sorusu yeniden açılmasın.
  **Sayma kuralı:** kovada ve iki çapraz sayıda **kalem** sayılır (0003 ve 0021 emsali: "kart iki sayısı
  kalem sayar"), toplam kalan ise **hedef kalanlarının toplamıdır**; satır sayısı ayrıca yazılmaz. Aynı
  kalemin iki hedefi aynı gider tarihini paylaştığı için her zaman aynı kovaya düşer, çift sayım olmaz.
- **R9.** Kovaların yanında iki çapraz sayı ayrıca okunur: **vadesi geçmiş** ve **vadesi girilmemiş**
  kalem sayısı (bunlar kova değildir, kovalarla kesişir; ikisi de kalem sayar). "Vadesi geçmiş" ölçütü
  bugünkü `gider.hedefGecti`'dir (`!h.odendi && !!h.vade && !!bugun && h.vade < bugun`), yani vadesi
  girilmemiş hedef geçmiş sayılmaz.
- **R10.** Bir kovaya tıklayınca liste o kovaya süzülür; süzme ekranda kalır, kayıtlı tercih değildir.
- **R11.** **Taraf kırılımı:** her tedarikçi, çalışan topluluğu ve vergi dairesi için kova dağılımı
  okunur, böylece "kimde ne kadar eski borç var" görünür. **Ekranda** çalışanlar `borcOzeti` deseniyle tek
  satırdır ve adlar yalnız anahtar açılınca görünür (R3); **raporda** yalnız tek satırdır, adlar hiç
  basılmaz (R16).
- **R12.** **"Bugün" yerel tarihtir** (0003'ün dersi: `today()` UTC döndürüyor, gün sınırına duyarlı
  kodda yerel bugün kullanılır) ve gün dönümünde kendiliğinden tazelenir.

### C. Rapor

- **R13.** Yaşlandırma **Aylık Gider ve Kasa Raporu'na** girer: kovalar ve taraf kırılımı. Tablo sütunları
  mevcut yaşlandırma tablosuyla hizalanır (0059 R1, aynı sunum dili): bugünkü alacak tablosu
  `["Yaş aralığı", "Firma", "Tutar", "Pay"]` (`printTemplates.js:1653`), gider tablosu
  **`["Yaş aralığı", "Kalem", "Kalan", "Pay"]`** olur ("Firma" yerine "Kalem", çünkü taraf kırılımı ayrı
  tablodur).
- **R14.** Raporda yaş **ay sonundan** sayılır, bugünden değil; dönem kilidi korunur (0047 R26) ve
  aynı **girdiyle** iki çağrı birebir aynı HTML üretir (0059 R24). **İki belgedeki yaş referansının farklı
  olması bilinçlidir:** Aylık Faaliyet Raporu alacakları rapor anından (`Date.now()`), bu belge ay sonundan
  sayar. Fark spec'te yazılı kalır ki "neden iki raporda yaş farklı" sorusu hata sanılmasın.
- **R15.** Rapordaki yaşlandırma bölümü **boşsa hiç basılmaz** (0059 R14'ün yeni tablo kuralı).
- **R16.** Personel raporda **tek satırdır**; çalışan adı ve kişi bazlı tutar yaşlandırma tablosuna da
  girmez (0047 R18, 0060 R16).

### D. Tek hesap

- **R17.** Liste ve yaşlandırma **saf motorda tek fonksiyondan** gelir; kapsam kuralı borç özetiyle
  **ortak yardımcıdan** okunur, ikinci bir kapsam tanımı yazılmaz. **Ortak yardımcı bugün yoktur ve
  çıkarılması bu işin parçasıdır:** süzgeç `borcOzeti`'nin içinde satır içi tek bir `if`'tir
  (`k.deletedAt || k.odendi || !k.tarih || k.tarih < esik || (bugun && k.tarih > bugun)`). Saf bir
  `borcKapsamindaMi(k, { esik, bugun })` çıkarılır, `borcOzeti` ve yeni fonksiyon ikisi de onu çağırır.
  **`borcOzeti`'nin çıktısı yeniden kullanılamaz:** o, kalemleri hedef başına değil **kalem** olarak
  biriktiriyor ve personelde tekilleştiriyor (`if (!c.kalemler.includes(k))`), bu yüzden hedef satırları
  yeni fonksiyonun kendi döngüsünden doğar; ortaklaşan şey **kapsam kuralıdır**, satır üretimi değil.
- **R18.** **Ödeme hatırlatıcısı değişmez.** Vade şartı orada kalır: hatırlatıcı "ne zaman ödenecek"
  sorusunu, bu liste "ne kaldı" sorusunu cevaplar.

### E. QA turunda eklenenler (R1)

- **R20.** **Kip açıkken yeni bir tablo çizilir** (`AcikKalemler`), bugünkü `KalemListesi` kullanılmaz:
  o tablo kalem bazlıdır (satır = kalem) ve atama, tutar, ödeme sütunları hedef satırına oturmaz. Hatırlatma
  kipi tabloyu değiştirmiyor, yalnız süzüyor; bu kip **tabloyu değiştirir** ve ayrımı R1'in ayrı durumu
  taşır.
- **R21.** **Kip açıkken hangi kartların kaldığı yazılıdır.** Emsal bütün raporu gizliyor
  (`Giderler.jsx:289`, `gorunum === "rapor" && rapor && !hatirlatmaModu`). Yeni kipte **"Kime Ne Kadar
  Borçluyuz" kartı görünür kalır** (dönemden bağımsızdır ve "Toplam borç" satırı R19'un karşılaştırmasını
  ekranda okunur kılar); dönem bağımlı kartlar (özet, gider türü kırılımı, tedarikçi kırılımı, KDV
  karşılaştırması, yöntem kırılımı) gizlenir.
- **R22.** **Boş durum tanımlıdır:** açık kalem yoksa tablo çizilmez, yerine `BosDurum` gelir (0016;
  başlık "Açık kalem yok", açıklama kapsamı söyler: yürürlük ayından bugüne, ödenmemiş kalemler). Boş
  listede kova kartları sıfırla çizilmez, tek boş durum kutusu kalır.
- **R23.** **X1 düzeltmesi:** müşteri alacaklarının yaşlandırması "ayrı iş" değil, **zaten var** (Aylık
  Faaliyet Raporu, `printTemplates.js:1653` "YAŞLANDIRMA (borcun yaşına göre)"). Bu iş onu **değiştirmez**;
  yalnız kova tanımını onunla paylaşır (R8).
- **R24.** **Görsel kanıt ekranları adlandırılır:** rapor belgesi için araçtaki `gider-kasa-raporu-belge`
  ekranı kullanılır (0059); açık kalemler kipi ve kova kartları için iki yeni ekran eklenir
  (`giderler-acik-kalemler`, `giderler-acik-kalemler-kova`) ve `0061-piksel-raporu.json` ile taban raporu
  üretilir.
- **R25.** **Saat dilimi sabitlenir:** gün dönümü ve yaş testleri `process.env.TZ = "Europe/Istanbul"` ile
  koşar (0003'ün dersi; CI UTC'de çalışıyor ve sabitlenmezse `today()`'e geri dönüş yakalanmaz).
- **R26.** Personel toplu satırının **kova dağılımı** da gösterilir (kişi kırılımı kapalı olsa bile
  "Çalışanlar" satırının hangi kovalarda ne kadar borcu olduğu okunur); gizlenen şey kişi, yaş değil.
- **R27.** **Motor ayrı saf modüldedir** (`src/lib/acikKalemler.js`): `gunFarki` `odemeHatirlatma.js`'tedir ve o dosya
  `gider.js`'i içe aldığı için motor `gider.js`'e konamaz (döngü). Kapsam kuralı yine tek yerdedir
  (`gider.borcKapsamindaMi`); kova adı ve sırası `src/lib/yaslandirma.js`'tedir.
- **R28.** **Sıralama:** önce vadeli satırlar (vade artan; eşitlikte yaş azalan, sonra kalem kimliği), sonra vadesiz
  satırlar (yaş azalan); personel toplu satırı en sonda.
- **R29.** **Kova süzmesi personel toplu satırına da uygulanır:** satır yalnız seçili kovadaki personel kalanını ve kalem
  sayısını gösterir; o kovada personel yoksa satır görünmez.
- **R30.** **Kip ile hatırlatma kipi birbirini dışlar** (biri açılınca öbürü kapanır); kip yalnız "Dönem Raporu"
  görünümündedir, ekranda kalır, kaydedilmez.
- **R31.** **Rapor kutusu** "GİDER · ÖDEME DURUMU"ndan hemen sonradır: kova tablosu `["Yaş aralığı", "Kalem", "Kalan",
  "Pay"]` ve taraf tablosu `["Taraf", "0-30 gün", "31-60 gün", "61-90 gün", "90+ gün", "Toplam"]`; tedarikçi adları
  basılır, personel "Çalışanlar" tek satırdır, kişi sayısı yazılmaz.
- **R32.** **Raporun kapsamı ay sonudur:** ödeme durumu ay sonu itibarıyla, `bugun = ay sonu`; gider tarihi ay sonundan
  sonra olan kalem kapsam dışıdır.
- **R33.** **Bilinen sınır:** tek çalışanlı ayda "Çalışanlar" satırı o kişinin açık borcuna eşittir (0060 R20 sınıfı,
  kabul edilen risk). Mevcut gizlilik testlerinden biri bu yüzden düşerse test gevşetilmez, karar Takım Yöneticisine
  sorulur.
- **R34.** **Satırdan ödeme yalnız hedef satırındadır** (`gider_odeme`); personel toplu satırında düğme yoktur, adlar
  açılınca her hedef satırında vardır.
- **R35.** **Çapraz sayılar kalem bazlıdır:** bir kalemin herhangi bir açık hedefi `hedefGecti` ise o kalem "vadesi
  geçmiş"e bir kez girer; açık hedeflerinden birinin vadesi yoksa "vadesi girilmemiş"e bir kez girer.
- **R19.** Açık kalemler listesinin toplamı, **kova süzmesi kapalıyken**, "Kime Ne Kadar Borçluyuz"
  kartının **"Toplam borç"** satırına eşittir (`borcOzeti.toplam`, `DonemRaporu.jsx:180`; çapraz testle
  sabitlenir); iki ekran aynı borcu iki rakamla söylemez. Süzme açıkken gösterilen toplam "seçili kovada"
  diye etiketlenir.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla.
- **C2.** **Yeni hesap yazılmaz:** kalan tutar, hedefler ve gecikme bugünkü motorlardan gelir; eklenen
  tek şey vade şartsız kapsam ve yaş kovalarıdır.
- **C3.** **Salt okunur bir görünümdür**; tek yazma yolu bugünkü ödeme penceresidir (R7).
- **C4.** **Görünüm sekmesi sayısı artmaz.** Segment bugün altı sekmeyle dolu ve Tarih Aralığı kipinde
  iki satıra bölünüyor (0022'de Takım Yöneticisi kabulü); yedinci sekme yerleşimi bozar.
- **C5.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** **K21 korunur:** personel ayrıntısı (çalışan adı ve kişi bazlı tutar) ekranda varsayılan
  kapalıdır, raporda hiç yoktur (R3, R11, R16).
- **C8.** **Kova tanımı tek yerdedir** (R8); iki rapor aynı yardımcıyı çağırır, ikinci bir eşik listesi
  yazılmaz.
- **C9.** **Ödeme süzgecinin anlamı değişmez:** kip ayrı bir durumdur, `odemeFiltre` süzgeç olarak kalır
  ve bugünkü beş değeri ("", `odenmedi`, `odendi`, `gecti`, `hatirlatma`) korunur.

### KAPSAM DIŞI

- **X1.** **Müşteri alacak yaşlandırmasının değişmesi** — *neden:* o yaşlandırma **zaten var** (Aylık
  Faaliyet Raporu, `aylikRapor.js:376-388`); bu iş ona dokunmaz, yalnız kova tanımını onunla paylaşır
  (R8, R23). Alacak tarafının referans tarihi ve sütunları bugünkü hâliyle kalır.
- **X2.** Yeni görünüm sekmesi — *neden:* C4.
- **X3.** Ödeme hatırlatıcısının vade şartının değişmesi — *neden:* R18; iki liste iki soruya bakıyor.
- **X4.** Bildirim, ses ya da açılışta pencere — *neden:* 0003'ün "sessizdir" kararı sürüyor.
- **X5.** Yaşlandırmanın CSV/XLSX'e aktarılması — *neden:* 0047 X1'deki karar sürüyor; gider verisi
  yalnız rapora girer.
- **X6.** Kova eşiklerinin kullanıcı tarafından ayarlanabilmesi — *neden:* dört kova standarttır;
  ayar bir sütun ve bir ekran daha demek, karşılığı yok. İstenirse ayrı iştir.
- **X7.** Kipin liste içindeki ödeme süzgecinden açılabilmesi — *neden:* R1, C9; kip bir görünüm kipidir,
  süzgeç değeri değildir ve yeni tabloda o süzgeç kullanılamaz.

---

## Context

- **Bugün dört yerden görülüyor, ikisi dönemden bağımsız (doğrulandı).** "Kime Ne Kadar Borçluyuz"
  kartının alt başlığı aynen "Seçili dönemden bağımsız: yürürlük ayından bugüne kadarki tüm ödenmemiş
  kalemler" diyor ve satırları tedarikçi, "tedarikçi seçilmemiş", vergi dairesi ve "Çalışanlar · n
  kişi" olarak **kişi bazında** toplar. "Tedarikçilere açık borç" kartı ise tek rakam ("Tüm dönemler,
  bugüne kadar"). İkisi de **kalem** göstermiyor.
- **Hatırlatıcı kalem gösteriyor ama vade istiyor.** `odemeHatirlatma.js` açık hedefleri
  `!h.odendi && h.kalanK > 0 && h.vade` ile süzüyor; son ödeme tarihi girilmemiş kalem hatırlatıcıya
  **hiç** girmiyor. Dönem Raporu da tahakkuk esaslı olduğu için (dönem seçicide yalnız "Ay" ve "Tarih
  Aralığı" var, "tüm zamanlar" yok) o kalem bu ayın listesinde de yok. Boşluk tam burada.
- **Kip için hazır emsal var.** Bugünkü "Hatırlatma kapsamı" düğmesi tam olarak istenen davranışı
  kuruyor: `gorunum === "rapor" && odemeFiltre === "hatirlatma"` olduğunda dönem seçici yerine kapsam
  ibaresi çiziliyor ve liste dönemden bağımsız geliyor. Yeni kip aynı mekanizmanın ikinci değeridir;
  bu yüzden yedinci sekmeye gerek yok (C4) ve iş küçülüyor.
- **Veri zaten elde.** `borcOzeti` satırlarının içinde kalem dizileri var, `odemeHedefleri` her hedefin
  kalanını ve vadesini veriyor, `gunFarki`/`gunFarkiMetni` gecikme metnini üretiyor. Eklenecek olan
  vade şartsız kapsam, yaş hesabı ve dört kova. Bu yüzden R17 tek fonksiyon istiyor: ikinci bir kapsam
  tanımı yazılırsa iki ekran farklı borç gösterir, bu sınıfta hata daha önce yaşandı.
- **Yaş neden gider tarihinden (Takım Yöneticisi kararı).** Borç kalemin tarihinde doğuyor; vade yalnız
  ödeme sözüdür ve girilmemiş olabilir. Yaşı vadeden saymak, vadesiz kalemleri yaşlandırmanın dışında
  bırakırdı ve tam olarak bugünkü boşluğu tekrar ederdi. Vade ayrı sütunda ve "vadesi geçmiş" çapraz
  sayısında yaşıyor (R9).
- **QA turu: yaşlandırma zaten var.** Aylık Faaliyet Raporu müşteri alacaklarını **aynı dört kovaya**
  dağıtıyor (`aylikRapor.js:380-381`, tablo `printTemplates.js:1653`). İki fark var: referans tarih orada
  `Date.now()` (rapor anı, dönem kilidi yok) ve tarihsiz kayıt "90+ gün" kovasına düşüyor. Bu yüzden kova
  tanımı paylaşılır (R8), yaş referansının farkı bilinçli yazılır (R14) ve X1 düzeltilir (R23).
- **QA turu: emsal tabloyu değiştirmiyor, yalnız süzüyor.** Hatırlatma kipi `filtre.odeme === "hatirlatma"`
  değeriyle çalışıyor ve **aynı** `KalemListesi`'ni süzüyor (`Giderler.jsx:283`), raporun bütün kartlarını
  da gizliyor (`:289`). Bu liste hedef satırlı ve farklı sütunlu başka bir tablo olduğu için kip ayrı bir
  duruma taşındı (R1, R20) ve hangi kartların kalacağı yazıldı (R21).
- **QA turu: paylaşılacak yardımcı bugün yok.** Kapsam süzgeci `borcOzeti`'nin içinde satır içi tek bir
  `if`; ayrıca `borcOzeti` kalemleri hedef başına değil kalem olarak biriktiriyor ve personelde
  tekilleştiriyor. Yani ortaklaşacak şey **kapsam kuralıdır**, satır üretimi değil (R17).
- **0059 ile ilişkisi.** 0059'un "vadesi geçmiş ve yaklaşan kalemler" detay tablosu hatırlatıcıdan
  beslendiği için **vade şartını miras alıyor**; yaşlandırma tablosu (R13) onun yanında durur ve
  vadesiz eski borcu da kâğıda taşır. İki tablo birbirinin yerine geçmez.

---

## Acceptance Criteria

### Liste

- **AC-1.** Dönem Raporu'nun süzgeç satırında "Açık kalemler (tüm dönemler)" kipi açılıp kapanır.
- **AC-2.** Kip açıkken dönem seçici pasiftir, kapsam ibaresi okunur ve "Kime Ne Kadar Borçluyuz" kartı
  görünür kalır; dönem bağımlı kartlar gizlenir (R21).
- **AC-3.** Geçmiş aya ait, **vadesi girilmemiş**, ödenmemiş bir kalem listede görünür.
- **AC-4.** Aynı kalem ödeme hatırlatıcısında görünmez (hatırlatıcının vade şartı korunur).
- **AC-5.** Çöpteki, ödenmiş, yürürlük öncesi ve gider tarihi gelecekte olan kalem listede yoktur.
- **AC-6.** Kira kaleminin kiraya veren ve vergi dairesi tarafı ayrı satırlardır.
- **AC-7.** Personel varsayılan olarak **tek toplu satırdır**; "Adları göster" açılınca çalışan ve hedef
  satırları görünür (R3, C7).
- **AC-8.** Satırda gider tarihi, vade, yaş ve kalan tutar okunur.
- **AC-9.** Vadesi girilmemiş satır rozetlidir ve vadeli satırlardan sonra sıralanır.
- **AC-10.** Satırdan ödeme penceresi o hedef seçili açılır; izinsiz kullanıcıda düğme yoktur.

### Yaşlandırma

- **AC-11.** Dört kova (0-30, 31-60, 61-90, 90+) **kalem** sayısı ve toplam kalanıyla okunur; sayı kalem
  sayar, satır sayısı değil (R8).
- **AC-12.** Yaş gider tarihinden sayılır; aynı vadeye sahip iki kalem farklı gider tarihleriyle
  farklı kovalara düşer.
- **AC-13.** Vadesi geçmiş ve vadesi girilmemiş sayıları kovalardan ayrı okunur; ikisi de kalem sayar ve
  "vadesi geçmiş" ölçütü `hedefGecti`'dir (vadesi girilmemiş hedef geçmiş sayılmaz).
- **AC-14.** Kovaya tıklayınca liste o kovaya süzülür.
- **AC-15.** Taraf kırılımında her tarafın kova dağılımı okunur; "Çalışanlar" satırının kova dağılımı
  kişi kırılımı kapalıyken de görünür (R26).
- **AC-16.** Gün dönümünde yaş ve kovalar yerel tarihe göre tazelenir.

### Tutarlılık ve rapor

- **AC-17.** **Kova süzmesi kapalıyken** listenin toplam kalanı "Kime Ne Kadar Borçluyuz" kartının
  "Toplam borç" satırına eşittir; süzme açıkken gösterilen toplam "seçili kovada" diye etiketlenir.
- **AC-18.** Ödeme hatırlatıcısının bugünkü çıktısı bu işten önce ve sonra aynıdır.
- **AC-19.** Raporda yaşlandırma kovaları ve taraf kırılımı basılır.
- **AC-20.** Raporda yaş ay sonundan sayılır; aynı **girdiyle** iki çağrı birebir aynı HTML üretir
  (0059 R24).
- **AC-21.** Açık kalemi olmayan ayda yaşlandırma bölümü hiç basılmaz.
- **AC-22.** Yaşlandırma tablosunda çalışan adı ve kişi bazlı tutar geçmez.
- **AC-23.** Raporun bugünkü toplamları bu işten önce ve sonra aynıdır.

### QA turunda eklenenler (R1)

- **AC-24.** Kip ayrı bir durumdur: `odemeFiltre`'nin bugünkü beş değeri ve anlamı değişmemiştir (C9).
- **AC-25.** Kip açıkken `KalemListesi` değil yeni tablo çizilir (R20).
- **AC-26.** Açık kalem yoksa tablo çizilmez, `BosDurum` görünür ve kova kartları basılmaz (R22).
- **AC-27.** Kapsam kuralı `borcKapsamindaMi` yardımcısından okunur; `borcOzeti` de aynı yardımcıyı çağırır
  ve ikinci bir kapsam tanımı yoktur (R17, kaynak taraması).
- **AC-28.** Kova adları, eşikleri ve sırası tek yardımcıdan gelir; Aylık Faaliyet Raporu da onu çağırır ve
  çıktısı bu işten önce ve sonra aynıdır (R8, R23).
- **AC-29.** Yaş `gunFarki` ile hesaplanır; motor `new Date()` ve `Date.now()` okumaz (R6, kaynak taraması).
- **AC-30.** Aynı kalemin iki hedefi aynı kovaya düşer ve kova kalem sayısına bir kez girer (R8).
- **AC-31.** Ödeme kaydedilip kalan sıfırlanınca satır listeden düşer ve kova sayıları tazelenir (R7).
- **AC-32.** Ödeme penceresi bugünkü `odemeHedefi` durumuyla açılır; yeni bir açılış yolu yoktur (R7).
- **AC-33.** Rapordaki yaşlandırma tablosunun sütunları `["Yaş aralığı", "Kalem", "Kalan", "Pay"]`'dır
  (R13).
- **AC-34.** Aylık Faaliyet Raporu'ndaki alacak yaşlandırması değişmemiştir (X1, R23).
- **AC-35.** Gün dönümü ve yaş testleri `TZ = "Europe/Istanbul"` ile koşar (R25).
- **AC-36.** Tarihsiz kalem kapsamda olmadığı için yaşlandırmada hiç görünmez (R2, R8).
- **AC-37.** "Çalışanlar" toplu satırı raporda tek satırdır ve kova tablosunda da çalışan adı geçmez
  (R11, R16).
- **AC-38.** Görsel kanıt iki yeni ekrandan ve rapor belgesi ekranından üretilmiştir (R24).

### Plan onayında eklenenler (R2)

- **AC-39.** Sıralama R28'e uyar: vadeli satırlar vadesizlerden önce, vade artan (R28).
- **AC-40.** Kova süzmesi açıkken personel toplu satırı yalnız o kovadaki kalanı gösterir, kovada personel yoksa satır
  yoktur (R29).
- **AC-41.** Açık kalemler kipi açılınca hatırlatma kipi kapanır, tersi de (R30).
- **AC-42.** Raporda taraf tablosu R31'in sütunlarıyla basılır ve kutu "GİDER · ÖDEME DURUMU"ndan sonra gelir (R31).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Kapsam kuralı `borcKapsamindaMi` yardımcısına çıkarıldı; `borcOzeti` de onu çağırıyor ve ikinci
      kapsam tanımı yok (R17, AC-27, kaynak taraması).
- [x] Kova tanımı tek yardımcıda; Aylık Faaliyet Raporu da onu çağırıyor ve çıktısı değişmedi
      (R8, AC-28, AC-34).
- [x] Yaş `gunFarki` ile hesaplanıyor; motor `new Date()` / `Date.now()` okumuyor (R6, AC-29).
- [x] Personel varsayılan kapalı; adlar yalnız anahtar açılınca görünüyor ve raporda hiç geçmiyor
      (C7, AC-7, AC-37).
- [x] Toplamın borç özetiyle eşitliği çapraz testle sabitlendi (AC-17, süzme kapalıyken).
- [x] Hatırlatıcının ve `odemeFiltre`'nin değişmediği testle gösterildi (AC-18, AC-24).
- [x] Gün dönümü testi var ve saat dilimi sabitlendi (`TZ = "Europe/Istanbul"`, 0003'ün dersi; R25).
- [x] Çıktı temelli gizlilik testi yaşlandırma tablosunu kapsıyor (AC-22, AC-37).
- [x] Görsel kanıt eklendi (`docs/evidence/0061-*.jpg` + `0061-piksel-raporu.json`, yeni taban): yeni
      `giderler-acik-kalemler` ve `giderler-acik-kalemler-kova` ekranları ile `gider-kasa-raporu-belge`
      ekranından raporun yaşlandırma bölümü (R24, AC-38).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: açık kalemler kipi (ayrı durum, yeni tablo, hangi kartların kaldığı), yaşın
      gider tarihinden `gunFarki` ile sayıldığı, kova tanımının iki raporda paylaşıldığı ve iki belgenin yaş
      referansının bilinçli olarak farklı olduğu, personelin varsayılan kapalı kaldığı, hatırlatıcı ile bu
      listenin hangi soruya baktığı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 plan onayı (Q1–Q10; R27–R35, AC-39…AC-42). Uygulamada TY'ye bir yerleşim kararı soruldu (sekme çubuğu bölünmez, sağ grup alt satıra iner); spec metnini değiştirmedi. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: 3 bulgu (çapraz sayılar süzgece uymuyordu, motorda tekrarlı hedef hesabı, süzgeçte önbelleksiz özet). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçü de gerçekti; biri kullanıcıyı yanıltan sayı, ikisi performans. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Faaliyet raporunun yaşlandırması ve hatırlatıcı birebir aynı; Giderler başlık yerleşimi bilinçli değişti (TY onaylı). Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** "Yeni sekme açmıyoruz, düğme ekliyoruz" kararı yerleşim yükünü ortadan kaldırmıyor; zaten dolu bir başlık satırına eklenen her öğe komşusunu sıkıştırır. Sekme/süzgeç çubuğuna komşu bir şey eklenecekse spec'te başlık satırının o genişlikte nasıl kırılacağı yazılmalı. İkincisi: bir "kapsam tek yerde" kuralı yazılırken mevcut bütün kopyalar taranmalı; hatırlatıcıdaki ikinci kopya ancak kaynak taraması yazılınca görüldü.
