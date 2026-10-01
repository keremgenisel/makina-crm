# 0056 — Deneme Döneminde Kasa Hesaplarının Silinebilmesi

| | |
|---|---|
| **Durum** | Tamamlandı (commit `cea1b45`, dal `feat/0056-deneme-donemi`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa ekranı (hesap listesi ve formu), gider ayarları, hesap bağı taşıyan bölümler |
| **Bağımlı spec'ler** | 0003 (yerel bugün kuralı) · 0024 (kasa hesapları ve koruma kuralları) · 0040 (ciro hareketleri hesapsızdır) · 0044 (tahsilatın hesabı) · 0049 (verilen çek) · 0051 (hesapsız kayıt listeleri) · 0052 (kasa sekme izni) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 15 bulgu işlendi, 5'i bloklayıcıydı. Taşımanın hedef hesap koşulları yazıldı (para birimi R17, virman R18, verilen çek R19); sunucunun iki bölümü reddettiği bulundu (R20); "bugün" ile "alan yok / alan boş" ayrımı netleşti (R1, R2); `hesapKullanimi`'nin kırılım vermediği için yeni yardımcı tanımlandı (R7). E bölümü (R17–R24) ve AC-19…AC-32 eklendi.<br>**R2 (2026-10-01, plan onayı):** taşımanın izni yalnız `kasa_hesap`: sunucuda dar "hesap taşıma yazımı" istisnası (Q1, R25; R15 bu yazım için daralır); pencere `wide` (Q2); virman/verilen çek reddi kaydın adıyla, düğmeler pasif (Q3, R26); çöpteki kayıtlar da taşınır, sayım canlıları gösterir (Q4, R27); ayar formu varsayılanı gösterip yazar, boş = kapalı (Q5); kapı `bugun` parametresi alır (Q7). F bölümü (R25–R27) eklendi. |

---

## Intent

Gider ve Kasa bölümleri şu an deneme hâlinde; **tam kullanım 1 Ocak 2027'de başlayacak.** Bu dönemde
kullanıcı hesapları deneyerek kuruyor: yanlış türde hesap açıyor, yanlış para birimi seçiyor, gereksiz
hesap kalıyor. Ama 0024 gerçek kullanımı düşünerek sıkı korumalar koydu: **hareketi olan hesap
silinemiyor**, yalnız kapatılabiliyor.

O korumalar gerçek kullanımda doğru. Deneme döneminde ise yanlış kurulmuş bir hesabı temizlemenin yolunu
kapatıyor ve kullanıcı ekranı denemeyle kirlenmiş hâlde 2027'ye taşımak zorunda kalıyor.

Başarı şu demek: deneme dönemi boyunca hesap silinebiliyor ve hareketleri kaybolmadan başka bir hesaba
taşınabiliyor; dönem bitince 0024'ün korumaları **kendiliğinden** geri geliyor.

---

## Requirements

### A. Deneme dönemi

- **R1.** Gider ayarlarına bir **deneme dönemi bitiş tarihi** alanı eklenir; varsayılan **01.01.2027**.
  Bu tarihe kadar (dâhil değil, o gün dönem kapanmış sayılır) genişletilmiş düzenleme açıktır.
  Karşılaştırma `bugun < bitis` biçimindedir ve **`utils.yerelBugun()`** ile yapılır; `today()` UTC
  döndürdüğü için Türkiye'de 00:00–03:00 arası dünü verir (0003'ün kuralı, 0051 de onu kullanıyor).
  Kapı tek saf fonksiyondadır: **`denemeDonemiAcik(giderAyarlari, bugun)`**; ekranlar kendi tarih
  karşılaştırmasını yazmaz.
- **R2.** **"Alan yok" ile "alan boş" ayrı anlam taşır.** `giderAyarlari` içinde alan **hiç yoksa**
  varsayılan `"2027-01-01"` kabul edilir; böylece mevcut kurulumlar kendiliğinden deneme dönemine girer ve
  o tarihte kendiliğinden kapanır (R4). Alan **boş dizeyse** deneme dönemi kapalı sayılır ve korumalar
  hemen yürürlüğe girer.
- **R3.** Kasa ekranında deneme döneminde olunduğu ve ne zaman biteceği yazılı durur; kullanıcı bunun
  **geçici** bir hâl olduğunu ekranda görür. Metin: **"Deneme dönemi 01.01.2027'de biter. O tarihten sonra
  hareketi olan hesap silinemez, yalnız kapatılabilir."** (tarih ayardan okunur).
- **R4.** Dönem bitince hesap silme ve taşıma seçenekleri kendiliğinden kapanır; kimsenin bir şeyi
  kaldırması gerekmez.
- **R5.** Dönemin bitmesi hiçbir veriyi değiştirmez; yalnız düğmeler kaybolur.

### B. Hesap silme ve taşıma

- **R6.** Deneme döneminde **hareketi olan hesap da silinebilir.**
- **R7.** Silme onayı, o hesaba bağlı kayıtları **türüyle sayar**: gider ödemeleri, virmanlar, çalışan
  avansları, müşteri tahsilatları, servis / Extra Kalıp / yedek parça tahsilatları ve verilen çekler.
  Bugünkü `kasa.hesapKullanimi` (`kasa.js:178`) altı bağ türünü sayıyor ama **tek bir sayı** döndürüyor;
  bu yüzden yanına **`hesapKullanimDetayi(hesapId, hareketler, veri)`** eklenir
  (`{odeme, virman, avans, payments, servis, kalip, yedekParca, verilenCek}`). `hesapKullanimi` geriye
  dönük uyumlu kalır ve `Kasa.jsx:470` ile `:528`'in bugünkü çağrıları değişmez.
- **R8.** Silerken iki yol sunulur: **hareketleri başka bir hesaba taşı** (varsayılan) ya da **hesapsız
  bırak**. Hedef hesabın koşulları R17, R18 ve R19'da yazılıdır; koşulları karşılayan açık hesap yoksa
  yalnız "hesapsız bırak" sunulur ve nedeni yazılır.
- **R9.** Hesapsız bırakılan kayıtlar bugünkü "hesabı belirtilmemiş" listelerine düşer ve oradan yeniden
  atanabilir; kaybolmazlar.
- **R10.** **Hiçbir ödeme, tahsilat, borç, avans ya da çek kaydı silinmez**; yalnız hesap bağı değişir.
  Kalemlerin ödenmiş durumu ve borçlar aynen kalır.
- **R11.** Hesabı kapatma (bugünkü davranış) yerinde kalır; silme onun yerine geçmez.

### C. Para birimi ve açılış bakiyesi

- **R12.** Hareketi olan hesabın **para birimi yine değiştirilemez**, deneme döneminde de. Çevrim
  yapılmadığı için değiştirmek bütün geçmiş tutarları sessizce başka bir para birimiymiş gibi okutur.
  Yanlış para birimiyle açılmış hesabın çözümü B bölümüdür: doğru hesabı aç, hareketleri taşı, eskisini
  sil.
- **R13.** **Açılış bakiyesi bugün de değiştirilebiliyor** ve öyle kalır. Bakiye saklanmaz, hareketlerden
  türer; dolayısıyla bir hesabın rakamını oynatmanın tek yolu açılış bakiyesidir ve bu ekranda bir
  ipucuyla yazılır.

### D. Yetki ve iz

- **R14.** Silme ve taşıma **`kasa_hesap`** izni ister; Kasa sekmesi kuralı (0052) aynen geçerlidir.
- **R15.** Taşıma, hareket ve tahsilat kayıtlarının hesap alanını değiştirdiği için sunucunun bugünkü
  yazma kuralları geçerlidir; işlem bunları karşılamıyorsa kullanıcıya nedeni söylenir.

### E. Taşımanın koşulları ve bütünlüğü (QA turu, R1)

- **R17.** **Hedef hesabın para birimi kaynakla aynı olmalıdır** (`secilebilirHesaplar(hesaplar, kaynak.paraBirimi)`
  deseni) ve hesap açık olmalıdır. Gerekçe: R12 para birimi değişimini yasaklıyor çünkü çevrim yapılmıyor;
  USD bir hesabın hareketlerini TRY hesaba taşımak **aynı sonucu** verir, yani yasak arka kapıdan açılır.
- **R18.** **Virman hesapsız bırakılamaz ve hedef karşı bacakla aynı olamaz.** Virman iki bacaklıdır
  (`hesapId` ve `karsiHesapId`); `hesapKullanimi` onu her iki alandan da sayıyor (`kasa.js:181`) ve
  `hesapBakiyeleri` virmanı iki tarafa yazıp bilinmeyen kimliği yok sayıyor, yani **tek bacaklı virman**
  kalan hesapta tek yönlü bir para hareketi gösterir ve bakiye sessizce değişir (C1 çiğnenir).
  `virmanDogrula` ayrıca aynı hesaba virmanı yasaklıyor. İki koşul sağlanamıyorsa silme reddedilir ve
  kullanıcıya "önce şu virmanı silin" denir; böylece R10 korunur (sistem kayıt silmez, kullanıcı siler).
- **R19.** **Verilen çek varsa hedef hesap banka türünde ve TL olmalıdır** (0049: verilen çek yalnız TL bir
  banka hesabından yazılır ve bakiye, banka çeki ödediğinde o hesaptan düşer). Koşul sağlanamıyorsa o çek
  taşınamaz ve silme reddedilir, nedeni yazılır.
- **R20.** **Sunucu istisnası iki bölüm için genişletilir.** `serverAuth.cjs:358`
  `TAHSILAT_HESAP_BOLUMLERI = {services, partSales, yedekParcaSatislar}` ve `:413` yalnız bu üç bölümde
  "yalnız `hesapId` değişti" yazımını grup kısıtından muaf tutuyor; **`payments` ve `cekler` listede yok**,
  yani Kasa kullanıcısının (gider ve finans sekmeli, müşteri eylem izni olmayabilir) taşıma yazımı makina
  tahsilatı ve verilen çek yüzünden 403 alır. Aynı istisna bu iki bölüm için de tanınır (koşul aynı:
  ekleme ve silme yok, yalnız `hesapId` değişmiş, kullanıcıda Kasa görünür). Yeni izin boyutu yoktur (C3).
- **R21.** **Açılış bakiyesi taşınmaz.** Açılış bakiyesi hareket değil hesabın alanıdır; silinen hesapla
  birlikte gider. Onay ekranı bunu söyler ("Silinen hesabın açılış bakiyesi taşınmaz; gerekirse hedef
  hesabın açılış bakiyesini güncelleyin"), R13 zaten o alanın düzenlenebildiğini söylüyor.
- **R22.** **Hesapsız hareketler etkilenmez:** avanstan **mahsup** (0024 B) ve **ciro** hareketleri
  (0040 R5) hiçbir hesaba bağlı değildir, bu yüzden sayıma ve taşımaya girmez. Taşınan tek çek bağı
  **verilen** çekin yazıldığı hesaptır; ciro edilmiş çekler etkilenmez.
- **R23.** **Silme ve taşıma tek yazımdır:** hesabın silinmesi ile altı bağın değişmesi **aynı durum
  güncellemesinde** gider (tek POST, 0046 R17 deseni), böylece yarım kalan bir taşıma kayıtları olmayan bir
  hesaba bağlı bırakmaz. Sunucu reddederse bugünkü hata yolu geçerlidir; geri alma mekanizması kapsam
  dışıdır (0046 X9 çizgisi).
- **R24.** **Bilinen sınır (çok kullanıcılı):** `mergeLocalIntoReloaded` yalnız eklemeleri yeniden
  uyguladığı için, taşıma sırasında başka bir PC yazarsa taşıma kaybolabilir ve hesap silinmiş olduğu hâlde
  kayıtlar eski hesaba bağlı kalabilir; kullanıcı işlemi yineler. Tek PC ve sunucu PC'de bu durum oluşmaz.
- **R16.** Silme ve taşıma işlem geçmişine yazılır: silme bugünkü `entity: "kasa_hesap"` ve
  `action: "silindi"` ile, taşıma yeni **`action: "hareket_tasindi"`** ile. Yeni dize
  `SettingsAuditLog.jsx` etiket haritasına eklenir, yoksa ham anahtar olarak görünür (CLAUDE.md kuralı);
  `detail` kaynak ve hedef hesap adını ve taşınan kayıt sayısını taşır.

### F. Plan onayında eklenenler (R2)

- **R25.** **Taşımanın izni yalnız `kasa_hesap` (Q1).** Var olan hareketin hesabını değiştirmek bugün türünün iznini
  ister (ödeme `gider_odeme`, virman `virman`, avans `avans`) ve verilen çek bağsız çek olduğu için her değişikliği
  `gider_odeme` ister; bunlar taşımada içerik değişmediği hâlde Kasa kullanıcısını 403'e düşürürdü. Sunucu dar bir
  **hesap taşıma yazımı** tanır: aynı yazımda bir hesap siliniyor, kullanıcıda `kasa_hesap` var, değişen her hareket,
  tahsilat, satış kaydı ve çekte değişen tek alan `hesapId` / `karsiHesapId` ve eski değeri silinen hesap, yeni değeri
  açık bir hedef hesap ya da boş. Bu yazımda tür izinleri ve müşteri grubu aranmaz. R15 bu yazım için daralır;
  başka her yazımda bugünkü kurallar aynen geçerlidir.
- **R26.** **Ret nedenleri kaydın adıyla (Q3):** koşul sağlanamazsa "Taşı" (ve virman varken "Hesapsız bırak") pasiftir;
  neden kaydı tarih ve hesaplarıyla anar ("15/09/2026 virmanı (Merkez Kasa ↔ Ziraat): önce bu virmanı silin").
- **R27.** **Çöpteki kayıtlar da taşınır (Q4):** taşıma ve hesapsız bırakma çöptekiler dahil bütün kayıtlara uygulanır
  (çöpten dönen kayıt silinmiş bir hesaba bağlı kalmasın); sayım bugünkü `hesapKullanimi` kuralıyla canlıları gösterir.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla; taşıma hiçbir tutarı değiştirmez.
- **C2.** Yeni kalıcı sütun yoktur: deneme dönemi tarihi `giderAyarlari` içinde bir alandır (0051'in
  `hesapsizBaslangic` deseni); "yok" ile "boş" ayrımı R2'de yazılıdır.
- **C6.** **Bakiye hiçbir yolda sessizce değişmez:** taşıma tutarları değiştirmez (C1) ve tek bacaklı
  virman bırakılmaz (R18). Hedef hesabın bakiyesinin artması taşınan hareketlerin doğal sonucudur, bir
  düzeltme değildir.
- **C3.** Yeni izin boyutu ve yeni sunucu bölümü yoktur.
- **C4.** 0024'ün korumaları **kaldırılmaz**, yalnız bir tarihe kadar askıya alınır.
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Hesabın para biriminin değiştirilebilmesi — *neden:* R12; çevrim yapılmadan değiştirmek bütün
  geçmişi yanlış okutur, taşıma yolu aynı sonucu güvenle verir.
- **X2.** Bakiyenin doğrudan yazılabilmesi ("bakiyeyi şu yap") — *neden:* bakiye türetilen bir rakamdır
  (0024 C1); doğrudan yazmak hareketlerle çelişen bir sayı üretir. Açılış bakiyesi bu işi yapar (R13).
- **X3.** Deneme döneminde başka korumaların gevşetilmesi (ödeme silme, çek durumu, taksit kuralları) —
  *neden:* talep yok; gevşetme listesi uzadıkça dönem bittiğinde geri dönüşü denetlemek zorlaşır.
- **X4.** Bütün kasa verisini topluca silip sıfırlayan bir "deneme verisini temizle" düğmesi — *neden:*
  ayrı ve çok daha riskli bir karar; istenirse kendi spec'iyle.
- **X5.** Deneme döneminin kullanıcıya göre ya da bilgisayara göre değişmesi — *neden:* firma geneli tek
  tarih.

---

## Context

- **Bugünkü kurallar (doğrulandı).** `Kasa.jsx` silme düğmesini yalnız `hesapKullanimi(...) === 0` iken
  çiziyor ve onay metni "hiç hareketi yok" diyor; `kasa.hesapDogrula` hareketi olan hesabın para
  birimini kilitliyor. İkisi de 0024 R15/R16.
- **Açılış bakiyesi zaten serbest.** `hesapDogrula` açılış bakiyesine hiçbir kilit koymuyor; hareketi
  olan hesapta da değiştirilebiliyor. Yani "kasanın rakamı değiştirilemiyor" sorunu aslında yok;
  değiştirilemeyen şey **bakiyenin kendisi**, çünkü bakiye hareketlerden türüyor (0024 C1). R13 bunu
  ekranda söyleyerek karışıklığı bitiriyor.
- **Hesabı silinmiş kayıt zaten biliniyor.** 0051 hesapsız kayıt listelerinde "silinmiş hesap" diye bir
  neden tutuyor; yani bağı kopmuş kaydın nereye düşeceği ve nasıl geri atanacağı bugün de çalışıyor.
  R9 bu yolu kullanır, yeni bir kavram açmaz.
- **Hesap bağı altı yerde ve `hesapKullanimi` altısını da sayıyor (doğrulandı).** `kasa.js:178-185`:
  `hesapHareketleri` (ödeme, virman, avans; virman `hesapId` **ya da** `karsiHesapId` üzerinden),
  `payments`, `services`, `partSales`, `yedekParcaSatislar` (0044) ve **verilen çek** (0049, satır 184).
  Taşıma ve hesapsız bırakma altısını da kapsamalı; biri atlanırsa o kayıtlar kaybolmuş bir hesaba bağlı
  kalır ve bakiyeden sessizce düşer. Fonksiyon tek bir **sayı** döndürüyor, kırılım vermiyor (R7).
- **Sunucu istisnası üç bölümle sınırlı (QA turunda ölçüldü).** `serverAuth.cjs:358`
  `TAHSILAT_HESAP_BOLUMLERI` yalnız `services`, `partSales` ve `yedekParcaSatislar`'ı içeriyor; `:413` bu
  üçünde "yalnız `hesapId` değişti" yazımını grup kısıtından muaf tutuyor. `payments` ve `cekler` dışarıda,
  yani taşıma bugünkü kurallarla Kasa kullanıcısında 403 alır (R20).
- **Virmanın iki bacağı (doğrulandı).** `hesapBakiyeleri` virmanı `ekle(m.hesapId, …)` ve
  `ekle(m.karsiHesapId, …)` ile iki tarafa yazıyor; `ekle` bilinmeyen hesabı sessizce yok sayıyor. Bir bacak
  hesapsız kalırsa kalan hesapta tek yönlü para hareketi görünür. R18 bu yüzden virmanı ayrı kural yapıyor.
- **Neden tarihe bağlı.** Kuralı elle açıp kapatmak, 2027'de kapatmayı unutmak demek. Tarihe bağlamak,
  gerçek kullanım başladığında korumaların kendiliğinden dönmesini sağlar (R4). Bu, 0008'in yayın
  perdesiyle aynı yaklaşım: geçici bir hâl, kaldırma yolu baştan yazılı.

---

## Acceptance Criteria

### Dönem

- **AC-1.** Gider ayarlarında deneme dönemi bitiş tarihi görünür; alan hiç yazılmamışken varsayılan
  01.01.2027 gibi davranır (R2).
- **AC-2.** Kasa ekranı deneme döneminde olunduğunu ve bitiş tarihini yazar.
- **AC-3.** Tarih geçmişken hareketi olan hesapta silme düğmesi çıkmaz (bugünkü davranış).
- **AC-4.** Tarih boşaltılınca da silme düğmesi çıkmaz.
- **AC-5.** Dönemin bitmesi hiçbir hesabı, hareketi ya da bakiyeyi değiştirmez.

### Silme ve taşıma

- **AC-6.** Deneme döneminde hareketi olan hesapta silme düğmesi görünür.
- **AC-7.** Silme onayı bağlı kayıtları **türüyle ve sayısıyla** listeler (`hesapKullanimDetayi`), ve
  açılış bakiyesinin taşınmadığını söyler (R7, R21).
- **AC-8.** "Başka hesaba taşı" seçilince bütün bağlı kayıtlar o hesaba geçer ve hedef hesabın bakiyesi
  buna göre değişir; hedef listesi yalnız **açık ve aynı para biriminde** hesapları gösterir (R17).
- **AC-9.** "Hesapsız bırak" seçilince kayıtlar hesapsız kalır, hiçbir bakiyeye girmez ve hesapsız
  listelerinde görünür.
- **AC-10.** Her iki yolda da hiçbir ödeme, tahsilat, avans ya da çek kaydı silinmez.
- **AC-11.** Her iki yolda da kalemlerin ödenmiş durumu ve borç toplamları değişmez.
- **AC-12.** Altı bağ türü de (ödeme, virman, avans, müşteri tahsilatı, satış tahsilatı, verilen çek)
  taşınır ya da hesapsız bırakılır; hiçbiri kayıp hesaba bağlı kalmaz.
- **AC-13.** Hesabı kapatma seçeneği yerinde kalır.
- **AC-14.** Silme ve taşıma işlem geçmişine yazılır.

### Para birimi ve açılış

- **AC-15.** Hareketi olan hesabın para birimi deneme döneminde de değiştirilemez ve nedeni yazar.
- **AC-16.** Hareketi olan hesabın açılış bakiyesi değiştirilebilir ve bakiye buna göre güncellenir.
- **AC-17.** Ekran, bakiyenin hareketlerden türediğini ve doğrudan yazılamayacağını söyler.
- **AC-18.** `kasa_hesap` izni olmayan kullanıcı silme ve taşıma düğmelerini görmez.

### QA turunda eklenen kriterler

- **AC-19.** Farklı para birimindeki hesap taşıma hedefi olarak listelenmez; uygun hesap yokken yalnız
  "hesapsız bırak" sunulur ve nedeni yazılır (R17).
- **AC-20.** Virman hesapsız bırakılamaz; hedef karşı bacakla aynı seçilemez ve silme nedenli olarak
  reddedilir (R18).
- **AC-21.** Tek bacaklı virman oluşmaz; hiçbir hesabın bakiyesi taşımadan sonra sessizce değişmez
  (R18, C6).
- **AC-22.** Verilen çeki olan hesapta hedef yalnız açık TL banka hesabı olabilir; değilse silme
  reddedilir (R19).
- **AC-23.** Kasa kullanıcısı (Müşteriler eylem izni olmadan) taşımayı yapabilir; `payments` ve `cekler`
  yazımı 403 almaz (R20).
- **AC-24.** Taşıma ve silme tek yazımda gider; sunucu reddederse hiçbiri kaydedilmez (R23).
- **AC-25.** Mahsup ve ciro hareketleri sayımda ve taşımada görünmez (R22).
- **AC-26.** Ciro edilmiş çekler taşımadan etkilenmez; yalnız verilen çekin hesabı değişir (R22).
- **AC-27.** Dönem kapısı tek saf fonksiyondan gelir ve `yerelBugun` kullanır; gece yarısı ile saat üç
  arasında dünün tarihine düşmez (R1).
- **AC-28.** Deneme dönemi bitiş günü geldiğinde (o gün dâhil) silme düğmesi çıkmaz (R1).
- **AC-29.** `hesapKullanimi` bugünkü sayısını vermeye devam eder (geriye dönük uyum, R7).
- **AC-30.** Taşıma işlem geçmişinde `hareket_tasindi` etiketiyle, kaynak ve hedef hesapla görünür
  (R16).
- **AC-31.** Kasa ekranındaki deneme dönemi metni R3'teki cümledir.
- **AC-32.** Açılış bakiyesi alanının altındaki ipucu: "Bakiye hareketlerden hesaplanır, doğrudan
  yazılamaz; bir hesabın başlangıç rakamını açılış bakiyesiyle ayarlayın." (R13, AC-17).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Dönem kapısı tek saf fonksiyonda (`denemeDonemiAcik`) ve `yerelBugun` ile; ekranlar kendi tarih
      karşılaştırmasını yazmaz (R1, AC-27).
- [x] Hedef hesap koşulları (para birimi, virman, verilen çek) testli (AC-19, AC-20, AC-22).
- [x] Sunucu istisnası `payments` ve `cekler` için genişletildi ve uçtan uca testte sabitlendi (AC-23).
- [x] Taşıma ve silmenin tek yazımda gittiği testle gösterildi (AC-24).
- [x] Altı bağ türünün hepsi testle kapsandı (AC-12).
- [x] Taşıma ve hesapsız bırakmanın hiçbir kaydı silmediği ve borçları değiştirmediği testle gösterildi
      (AC-10, AC-11).
- [x] Görsel kanıt eklendi (`docs/evidence/0056-*.jpg`): deneme dönemi ibaresi, silme onayı ve iki yol.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: deneme dönemi kapısı, 0024 R16'nın tarihe bağlı askısı ve kaldırma yolu.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R1 QA turu (15 bulgu, 5'i bloklayıcı), R2 plan onayı (Q1–Q7; R25–R27). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Bir triyaj turu (2 bulgu). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Silme penceresinin kanıt kaydı yoktu (CI kırmızı; kanıt çekimi sürerken triyaja gelindi); sunucudaki taşıma istisnası deneme dönemine bağlı değildi (R4/C4 sunucuda geçerli değildi). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Dönem varsayılan açık olduğu için "hareketi olan hesap silinemez" testleri dönem kapalı ayarla koşuldu (bilinçli); çek portföyü ekranları 0 piksel. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Arayüzde tarihe bağlanan bir gevşetme, sunucuya da gevşetme ekliyorsa kapı iki tarafa birden konmalı; "dönem bitince korumalar kendiliğinden döner" vaadi yalnız düğmeleri değil sunucunun kabul ettiği yazımları da kapsar ve sunucu kapısı kayıtlı ayardan okunmalı (aynı yazımda açılamasın). İkincisi: varsayılanı "açık" olan, gerçek tarihe bağlı bir kapı, testleri saate bağımlı yapar; bugün geçen testler 2027'de kırılırdı. Kapıya bağlı her test ya sahte saat ya da açık uçlu bir tarih kullanmalı. Üçüncüsü: kanıt yeni bir pencere eklendiğinde yalnız o pencereyi değil, ona yer açan komşu öğeleri de gösterir; "N hareket" yazısının kırılması ancak çekimde görüldü. Dördüncüsü (tekrar eden): kanıt kaydı CI'yı kırar; yeni tasarım dosyası ekleyen işte kanıt çekimi uygulamanın parçası sayılmalı, sona bırakılmamalı.
