# 0049 — Portföye Elle Çek Ekleme ve Kendi Çekimizle Ödeme

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-30; A commit `6259114`, B commit `d93b813`, dal `feat/0049-cek`; plan `specs/done/0049-uygulama-plani.md` Q1–Q12) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa › Çek Portföyü, gider formu ve ödeme penceresi, kasa bakiyesi, `cekler` bölümü |
| **Bağımlı spec'ler** | 0024 (kasa ve ödeme hareketi) · 0040 (çek portföyü ve ciro) · 0046 (formdan ödeme) |
| **Revizyon** | R1 (2026-09-30, plan onayı): iş A (elle alınan çek) ve B (verilen çek) parçalarına bölündü (Q1); bağlı çekin tutar/para birimi/vadesi kopyalanmaz, tek okuma yolu `cekBilgisi` (R2/Q2); verilen çek yalnız TL ve en az bir gideri kapatarak doğar, X8 (R7/Q3); bakiye çekin tam tutarıyla ödendiği gün, seçilen banka hesabından düşer (R10/Q4); kendi çek motoru ve penceresi ciroyla ortak (C2/Q5); formda yalnız ANA satırda (R9/Q6); ödeme penceresinden ortak pencereyi açan düğme (R9/Q7); sunucu kayıt düzeyinde (R15/Q8); 0047 raporu (Q9); yedek ve birleştirme (C6/Q10); bağsız çekin kimden bilgisi ve silinmesi (R1, R5/Q11); görsel kanıt (Q12). |

---

## Intent

Bildirilen durum: **gider ödenirken ne gider formundan ne de Kasa'dan çek ciro edilebiliyor**, ve
fabrikanın **kendi çek defterinden yazıp verdiği çek** hiçbir yerde yok.

İkisinin de sebebi bulundu ve ikisi de aynı boşluğun iki yüzü: uygulamada bir çek, ancak bir **müşteri
tahsilatının yanında** doğabiliyor. Portföy ekranı bir çeki, `paymentId`'si canlı bir tahsilata
çözülmüyorsa hiç listelemiyor; çekin tutarı, para birimi ve vadesi de kendi kaydında değil, o
tahsilatın üzerinde duruyor. Sonuç:

- Elde duran ama tahsilat olarak girilmemiş bir çek (0040'tan önce alınmış, müşteri olmayan birinden
  gelmiş, ya da bir satışın karşılığı olmayan çek) portföyde **görünmüyor**, dolayısıyla ciro edilemiyor.
  Portföy boşken hem Kasa'daki "Ciro Et" düğmesi hiç çıkmıyor hem de gider formundaki "Çek (ciro)"
  seçeneği "portföyde çek yok" diyor. Kullanıcının gördüğü "ciro edilemiyor" tam olarak budur.
- Kendi çekimiz ise kavram olarak yok: 0040 X1'de bilerek kapsam dışı bırakılmıştı, şimdi ihtiyaç doğdu.

Başarı şu demek: elde duran bir çek portföye elle girilebiliyor ve gider ödemesinde ciro edilebiliyor;
fabrika kendi çekini yazıp bir gideri onunla kapatabiliyor, ve o paranın hesaptan ne zaman çıktığı
doğru görünüyor.

---

## Requirements

### A. Portföye elle çek ekleme (alınan çek)

- **R1.** Kasa › Çek Portföyü'nden **tahsilata bağlı olmayan** bir alınan çek eklenebilir: çek numarası,
  banka, keşideci, **tutar**, **para birimi**, **vade**, alınma tarihi, tür (hamiline / nama / resmi) ve
  kimden alındığı (serbest metin ya da müşteri).
- **R2.** Çekin **tutarı, para birimi ve vadesi artık çekin kendi alanlarıdır** ve portföy bunları oradan
  okur. Tahsilata bağlı çekte bu alanlar tahsilattan doldurulur ve **tahsilat düzenlenince güncellenir**;
  böylece okuma tek yoldan olur.
  **Uygulama (R1, Q2):** alanlar yalnız **bağsız** çekte saklanır. Bağlı çekte tutar, para birimi, vade, alınma tarihi ve
  müşteri okuma anında tahsilattan çözülür; tek okuma yolu `cek.cekBilgisi`. Kopyalama ve senkron yazım yapılmaz
  (tahsilatın düzenlendiği her yolun `cekler`'e de yazması gerekirdi; unutan yol çek tutarını sessizce eskitir ve
  tahsilat izinli kullanıcının yazımı çek bölümüne taşardı). AC-10 okuma anında sağlanır.
- **R3.** Elle eklenen çek **gelir yaratmaz.** Tahsilat kaydı yoktur, Finans'a ve aylık rapora girmez;
  yalnız portföyde duran bir kıymettir. Bu, belgenin ve ekranın söylediği bir kuraldır.
- **R4.** Elle eklenen çek, tahsilata bağlı çekle **aynı biçimde ciro edilir** (0040 kuralları aynen:
  bütün olarak, tek alacaklıya, hesapsız hareketle, bakiyeye dokunmadan).
- **R5.** Elle eklenen çek silinebilir; ciro edilmişse önce ciro iptal edilir (0040 deseni).
- **R6.** Elle eklenen çek **tahsil edildi** işaretlenebilir ama **hiçbir hesabın bakiyesine girmez**;
  ekran bunun sebebini yazar (tahsilat kaydı yok). Bu, bilinçli bir sınırdır (X4).

### B. Kendi çekimiz (verilen çek)

- **R7.** Fabrikanın kendi çek defterinden yazdığı çek kaydedilebilir: çek numarası, banka (bizim banka),
  tutar, para birimi, vade, kime verildiği (tedarikçi / çalışan / serbest ad) ve açıklama.
  **Uygulama (R1, Q3):** verilen çek her zaman **TL**'dir ve en az bir gider kalemini kapatarak doğar (ciro deseni);
  para birimi alanı yoktur. Banka, seçilen TL banka hesabıdır (`hesapId`).
- **R8.** Verilen çekin durumları: **yazıldı** (elde değil, alacaklıda), **ödendi** (banka ödedi),
  **karşılıksız**, **iptal**.
- **R9.** Bir gider, ödeme yöntemi **"Çek (kendi)"** seçilerek kendi çekimizle ödenebilir. Giriş noktaları
  ciro ile aynıdır: **gider formunun ödeme satırı** (0046) ve **ödeme penceresi**.
  **Uygulama (R1, Q5–Q7):** plan motoru ciroyla ortaktır (aday, varsayılan dağıtım, fark, `odemeDogrula`). Formda
  "Çek (kendi)" yalnız ANA satırda ve kasa yetkisiyle. Çok kaleme dağıtım Kasa › Çek Portföyü "Çek Yaz" penceresindedir
  (ciro penceresinin kendi kipi); ödeme penceresindeki "Kendi çekiyle öde" düğmesi aynı pencereyi o kalemin alacaklısı
  seçili açar.
- **R10.** Çek yazıldığında **giderin borcu kapanır** (ödeme hareketi doğar) ama **hesap bakiyesi
  değişmez.** Bakiye, çek **"ödendi"** olduğunda azalır. Bu, alınan çekteki kuralın aynadaki hâlidir:
  para gerçekten hareket ettiğinde bakiyeye girer.
  **Uygulama (R1, Q4):** ödeme hareketleri hesapsız ve `cekId`'li doğar (borç kapanır, bakiye değişmez). Çek "ödendi"
  olunca bakiye, çekin yazımda seçilen banka hesabından, ödendiği tarihte, **çekin tam tutarıyla** düşer (fark dahil;
  bankanın ödediği çekin tamamıdır). Bakiye hareketlerden değil çek kaydından okunur; çift sayım olmaz.
- **R11.** Verilen çek **karşılıksız** ya da **iptal** olursa kapattığı gider borcu **yeniden açılır**.
- **R12.** Bir çek bütün olarak tek alacaklıya yazılır; tutarı o alacaklının açık kalemlerine dağıtılır ve
  fark uyarı olarak gösterilir (ciro ile aynı kural).
- **R13.** Vadesi yaklaşan ve geçen **kendi çeklerimiz** portföy ekranında ayırt edilir.

### C. Ortak

- **R14.** Çek Portföyü ekranı **alınan** ve **verilen** çekleri ayrı ayrı gösterir; toplamları
  karıştırmaz.
- **R15.** Her iki işlem de **`gider_odeme`** izni ister; izinsiz kullanıcı düğmeleri görmez.
  **Uygulama (R1, Q8):** `paymentId`'si boş çekte (bağsız alınan ya da verilen) ekleme, silme ve her durum değişikliği
  `gider_odeme` ister; bağlı çekte bugünkü kural aynen. Değişen bütün çek kayıtları bağsızsa `gider_odeme`'li kullanıcı
  müşteri grubu kısıtına takılmaz. Yeni verilen çek aynı yazımda ona bağlı bir ödeme hareketi ister.
  **Triyaj (2026-09-30):** bağlı çeki bağsıza (ya da tersine) çeviren yazım iki izni birden ister (`gider_odeme` ve
  `cust_payment_edit`). Kısmi geri yüklemede çek bölümü sahibine göre bölünür (bağlı çekler Müşteri verileriyle, bağsız
  çekler Giderler ile; tek paket seçiliyse öbürünün çekleri korunur).
- **R16.** Kasa ekranının bugünkü kuralları geçerlidir: gider ve finans yetkisi birlikte gerekir, yayın
  perdesi inikken ekran kapalıdır.
- **R17.** Gider ödemeleri TL'dir; TL dışı çek ciro edilemez ve TL dışı kendi çekimizle gider ödenemez
  (0040'taki kural korunur, nedeni yazılır).
- **R18.** Her iki çek türünün de geçmişi (durum değişiklikleri, kime verildi, hangi kalemleri kapattı)
  okunabilir.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır.
- **C2.** **Tek gerçek kaynak:** ciro ve ödeme hareketleri yine `cek.js` ile `kasa.js`'in bugünkü
  fonksiyonlarından geçer; verilen çek için ayrı bir ödeme mekanizması yazılmaz, mevcut
  `hesapHareketleri` kaydı kullanılır.
- **C3.** **Çift sayım yasağı:** elle eklenen çek gelir değildir (R3); kendi çekimiz yazıldığında bakiye
  değişmez, ödendiğinde bir kez değişir (R10). Aynı para iki kez sayılmaz.
- **C4.** Gider tutarı, KDV'si, dönem raporu ve makina maliyeti bu işten **etkilenmez**; değişen yalnız
  ödeme tarafıdır.
- **C5.** Bugünkü çek verisi bozulmaz: tahsilata bağlı çekler aynı davranır, `cekGelirMi` ve
  `tahsilatSayilirMi` kuralları değişmez.
- **C6.** Yeni alanlar dört (liste ise beş) nokta kuralına uyar; `paymentId` boş olabilir hâle gelir ve
  bunu okuyan her yer (portföy, silme koruması, merge) buna göre gözden geçirilir.
- **C7.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Çekin teminata verilmesi — *neden:* 0040 X2'deki karar sürüyor.
- **X2.** Karekod okutma, Findeks sorgusu, banka entegrasyonu, elektronik takas — *neden:* 0040 X3 ve X4.
- **X3.** Senet (bono) — *neden:* 0040 X5.
- **X4.** Elle eklenen çekin tahsil edilince hesaba para girişi yazması — *neden:* arkasında tahsilat
  kaydı yok; bakiyeye girmesi için "geliri olmayan nakit girişi" diye yeni bir kavram gerekir ve o, kasa
  modelinin ayrı bir kararıdır. R6 sınırı ekranda yazılı.
- **X5.** Kendi çeklerimizin çek defteri olarak yönetilmesi (yaprak numarası takibi, kalan yaprak sayısı)
  — *neden:* ihtiyaç ödeme aracı olarak kullanmak; defter yönetimi ayrı bir iştir.
- **X6.** Verilen çeklerin ödeme hatırlatıcısına (Anasayfa) girmesi — *neden:* hatırlatıcı gider
  kalemlerinin vadesini sayıyor; çek vadesi ayrı bir kavram ve portföy ekranında gösteriliyor (R13).
  İstenirse ayrı iş.
- **X8.** Gidere bağlı olmayan (hiçbir borcu kapatmayan) verilen çek ve TL dışı verilen çek — *neden:* R1 Q3; verilen
  çekin bu işteki amacı gider ödemektir.
- **X7.** Müşteriden alınan çekin bir müşteri tahsilatına sonradan bağlanması — *neden:* bugün zaten var
  (0040: eski çek tahsilatları formdan bağlanabiliyor); bu iş bağsız çeki ekliyor.

---

## Context

- **Kök sebep (doğrulandı).** `src/lib/cek.js` `portfoySatirlari` her çek için
  `const p = pById.get(String(c.paymentId)); if (!p) continue;` diyor: **tahsilatı çözülmeyen çek
  listelenmiyor.** Satırın tutarı `p.tutar`, para birimi `p.currency`, vadesi `p.vadeTarihi`, yani bu üç
  bilgi çekin kendisinde değil tahsilatta duruyor. Çek kaydı da yalnız `yeniCek(kayit, paymentId, ...)`
  ile, müşteri tahsilatı yollarından doğuyor (`Customers.jsx`, `CustomerDetailModal.jsx`, `ui.jsx`).
- **Portföye elle çek eklenemiyor.** `cek/CekPortfoyu.jsx`'te satır düğmeleri yalnız "Ciro Et", "Durum" ve
  "Geçmiş"; ekleme yok. Dolayısıyla elde duran ama tahsilat olarak girilmemiş bir çek uygulamaya hiç
  giremiyor.
- **Ciro mekanizması çalışıyor, girdisi yok.** Gider formundaki "Çek (ciro)" seçeneği (0046) ve
  Kasa'daki "Ciro Et" düğmesi (0040) yerinde; ikisi de `ciroCekleri`/`portfoySatirlari` ile portföydeki TL
  çekleri okuyor. Portföy boş olduğu için ikisi de boş çıkıyor. Yani bildirilen hata bir ciro hatası
  değil, bir **giriş** eksikliği.
- **Kendi çekimiz hiç yok.** 0040 X1: "Kendi çek defterimizden yazdığımız çekler (verilen çek, muhasebede
  103) kapsam dışı; kullanıcının anlattığı akış gelen çeki ciro etmekti." O gün doğru olan karar bugün
  ihtiyacı karşılamıyor; bu spec onu geri açıyor. Ödeme yöntemi listesinde "Çek (ciro)" ile düz "Çek"in
  ayrı durması da o gün bu ihtimal için bırakılmıştı.
- **Neden verilen çek bakiyeyi hemen düşürmemeli.** Alınan çekte para hesaba çek tahsil edilince giriyor
  (`kasa.tahsilatSayilirMi`). Aynası: kendi çekimizi yazdığımızda para henüz çıkmamıştır, banka çeki
  ödediğinde çıkar. Bakiyeyi yazım anında düşürmek, bankada duran parayı yok gösterir ve mutabakatı
  bozar. Borcun kapanması ile paranın çıkması **ayrı anlardır**; uygulama bu ayrımı zaten ciroda
  (borç kapanır, bakiye değişmez) ve kart blokajında (0044) yapıyor.
- **Veri modeli etkisi.** Çekin tutar, para birimi ve vadesi kendi alanlarına taşınıyor (R2) ve
  `paymentId` boş olabilir hâle geliyor. Bunu okuyan yerler gözden geçirilmeli: portföy satırları, çekli
  tahsilatın silinme koruması (0040: ciro edilmiş çekli tahsilat silinemez), merge'deki `paymentId`
  remap'i ve yedek paketi. Bu, işin en riskli parçasıdır; motor değil, **bağların** işidir.

---

## Acceptance Criteria

### Elle çek ekleme ve ciro

- **AC-1.** Kasa › Çek Portföyü'nden tahsilata bağlı olmayan bir alınan çek eklenir ve listede görünür.
- **AC-2.** Elle eklenen çekin tutarı, para birimi ve vadesi kendi kaydından okunur.
- **AC-3.** Elle eklenen çek Finans'ta ve aylık raporda gelire girmez.
- **AC-4.** Elle eklenen TL çek bir gider kalemine ciro edilir; kalemin borcu kapanır.
- **AC-5.** Bu ciro hiçbir hesabın bakiyesini değiştirmez.
- **AC-6.** Gider formundaki "Çek (ciro)" seçeneği elle eklenen çeki de listeler.
- **AC-7.** Elle eklenen çek silinir; ciro edilmişse önce ciro iptali istenir.
- **AC-8.** Elle eklenen çek "tahsil edildi" işaretlendiğinde bakiye değişmez ve sebebi ekranda yazar.
- **AC-9.** Tahsilata bağlı çeklerin bugünkü davranışı değişmez (gelir, ciro, karşılıksız).
- **AC-10.** Tahsilatın tutarı düzenlenince bağlı çekin tutarı da güncellenir.

### Kendi çekimiz

- **AC-11.** Kendi çekimiz kaydedilir ve portföyde "verilen" tarafında görünür.
- **AC-12.** Bir gider "Çek (kendi)" yöntemiyle ödenir; kalemin borcu kapanır.
- **AC-13.** Çek yazıldığında hiçbir hesabın bakiyesi değişmez.
- **AC-14.** Çek "ödendi" işaretlendiğinde seçilen hesabın bakiyesi çek tutarı kadar azalır.
- **AC-15.** Çek "karşılıksız" ya da "iptal" olduğunda kapattığı gider borcu yeniden açılır.
- **AC-16.** Bir çek birden çok açık kaleme dağıtılabilir; dağıtılan toplam çek tutarını aşamaz.
- **AC-17.** Çek tutarı kapatılan borçlardan büyükse fark uyarı olarak gösterilir ve borç kapatmaz.
- **AC-18.** Vadesi geçmiş ve yaklaşan kendi çeklerimiz portföyde ayırt edilir.
- **AC-19.** TL dışı çekle gider ödenemez ve nedeni yazılır.
- **AC-20.** Kendi çekimiz gider formunun ödeme satırından da yazılabilir.

### Ortak

- **AC-21.** Portföy ekranı alınan ve verilen çekleri ayrı gösterir; toplamlar karışmaz.
- **AC-22.** `gider_odeme` izni olmayan kullanıcı çek ekleme ve kendi çeki yazma düğmelerini görmez.
- **AC-23.** Kısıtlı kullanıcı sunucudan bu kayıtlara yetkisiz yazma yapamaz (403).
- **AC-24.** Yayın perdesi inikken ekran ve düğmeler görünmez.
- **AC-25.** Yeni alanlar veritabanına yazılıp geri okunur; temiz kurulumda da çalışır.
- **AC-26.** Gider toplamları, KDV ve makina maliyeti bu işten önce ve sonra aynıdır.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Ciro ve ödeme hareketleri mevcut fonksiyonlardan geçiyor; ikinci bir mekanizma yazılmadı (C2).
- [x] Çift sayım yasağı testle sabitlendi: elle çek gelir değil, kendi çekimiz bir kez bakiyeye giriyor
      (AC-3, AC-13, AC-14).
- [x] `paymentId` boş olabilen çekin bütün tüketicileri gözden geçirildi (portföy, silme koruması, merge,
      yedek) ve testle kapsandı.
- [x] Yeni alanlar dört (liste ise beş) noktada eklendi; roundtrip ve temiz kurulum testleri kapsıyor.
- [x] Sunucu yetki eşlemesi güncellendi ve uçtan uca testte sabitlendi (AC-23).
- [x] Görsel kanıt eklendi (`docs/evidence/0049-*.jpg`): elle çek ekleme, verilen çek listesi, gider
      formunda iki çek seçeneği. A raporu `0049-piksel-raporu.json`, B raporu `0049b-piksel-raporu.json`, taban
      `0049-taban-piksel-raporu.json`.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` 0040 bölümü güncellendi: çekin kendi tutar/vade alanları, bağsız çek ve verilen çek.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R1 plan onayı anında işlendi (Q2 bağlı çekte alan kopyalanmaz, Q3 yalnız TL ve gidere bağlı verilen çek, X8). Onaydan sonra triyaj notu R15'e eklendi (bağlı↔bağsız geçişi iki izin, kısmi geri yükleme). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Bir triyaj turu (3 bulgu). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Kanıt kaydı eksik (CI kırmızı, çekim sürüyordu); yalnız Giderler geri yüklemesi bağlı çekleri geri alıyordu (gerçek, gelir değişirdi); bağlı çeki bağsıza çeviren yazım cust_payment_edit'i atlıyordu (güvenlik, gerçek). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | 0040 testleri aynen geçiyor; eski bağlı çek kaydı okunurken 0040 şekliyle kalıyor (null alanlar blob'a yazılmıyor). Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir bölümün iki sahibi olunca (tahsilata bağlı çekler müşteri tarafının, bağsız ve verilen çekler gider tarafının) bölüm düzeyinde çalışan her yol (kısmi geri yükleme, grup istisnası, alan denetimi) bu ayrımı ayrı ayrı gözetmek zorunda; tek bir "veya" koşulu bir sahibin iznini sessizce atlattı. Kayıt düzeyinde sahiplik bir kez tanımlanmalı (burada `paymentId`'nin boşluğu) ve her yol aynı tanımı kullanmalı. İkincisi: bağlı çekte alanları kopyalamamak (okuma anında çözmek) senkron yazım ve sunucu yetkisi sorunlarının tamamını baştan kaldırdı; türetilebilen veri saklanmamalı.
