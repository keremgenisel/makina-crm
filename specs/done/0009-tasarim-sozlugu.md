# 0009 — Tasarım Sözlüğü (paylaşılan arayüz bileşenleri)

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-24; kod commit `6a5b32f`, dal `feat/0009-tasarim-sozlugu`; plan `specs/done/0009-uygulama-plani.md` T1–T12) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Paylaşılan arayüz bileşenleri, Giderler ekranları (Finans'taki KDV karşılaştırması kartı dâhil), Evrak alıcı bölümü, Ayarlar bölüm bileşeni |
| **Bağımlı spec'ler** | yok (0010 ve sonrası bu spec'e bağlı olacak) |
| **Revizyon** | R1 (2026-09-24): onay öncesi QA boşluk analizi; 14 açık nokta karara bağlandı — "birleştir" ile "hiçbir görünüm değişmesin" kuralları arasındaki üç çelişki varyant kararıyla çözüldü (segment için iki erişilebilirlik kipi, kart bölüm için iki görünüm varyantı), AC-10'un kapsamı sınırlandı, ölçülemez kriterler (AC-12, AC-13) ölçülebilir hâle getirildi; R1/R2/R3/R5 güncellendi, R9/R10 eklendi, Context'e kodda doğrulanan farklar ve mevcut testin beklentisi yazıldı, AC-1/2/7/9/10/12/13 düzeltildi, AC-15…AC-18 eklendi. Spec henüz "Taslak" olduğu için SCORECARD'ın revizyon sayacı işlemez (o sayaç onaydan sonrasını ölçer). R2 (2026-09-24): uygulama planı (`specs/0009-uygulama-plani.md` T1–T12) kodda doğrulanan bulgularla işlendi: gider alt görünümlerindeki dört yerel kart kopyası kapsama alındı ve `kart` varyantına ikinci başlık biçimi eklendi (R5, T4); yalnız birebir kopyaların taşınacağı, görünüşü farklı yakın kopyaların bilinen borç olacağı yazıldı (R2, T5); Evrak'ın diğer sekiz kartı kapsam dışı sayıldı (T6); gölge istisnası (AC-7, T7), karanlık tema ölçüsü (AC-8, T8) ve piksel karşılaştırmalı görsel kanıt (AC-12, T9) ölçülebilir hâle getirildi; bileşenlerin tek dosyası ve `Section`'ın yeniden adlandırılması (R1, R5, T1, T2) yazıldı; AC-19 ve AC-20 eklendi. R3 (2026-09-24, onay sonrası): AC-8'in metin ölçüsü düzeltildi; plandaki yalnız "%95" eşiği uygulamada yüksek kontrastlı okunaklı çiftleri başarısız saydı, eşik "WCAG AA (4.5) ya da aydınlığın %95'i" oldu. **İz notu (2026-09-24, spec 0011 R2):** AC-12'nin kanıt eşlemesi test dosyasından `docs/evidence/kanit-eslemesi.json` veri dosyasına taşındı. Kabul kriteri değişmedi, yalnız uygulanış biçimi değişti; SCORECARD'a dokunulmadı. |

---

## Intent

Gider ekranlarının ve Evrak'taki alıcı bölümünün tasarımı kullanıcı tarafından beğenildi ve
uygulamanın geneline yayılması istendi. Ama o tasarım bugün hiçbir yerde tanımlı değil: aynı
segmentli seçici, aynı kart bölüm, aynı boş durum kutusu birkaç dosyanın içine gömülü duruyor
ve paylaşılmıyor. Bu hâliyle ekranları tek tek dönüştürmeye başlarsak tutarlılık gelmez;
kopyalar çoğalır ve üçüncü bir varyant doğar.

Başarı şu demek: tasarımın altı yapı taşı tek bir yerde tanımlı, bugün onları kendi içinde
taşıyan ekranlar oradan besleniyor, hiçbir ekranın görünümü ve davranışı değişmemiş, ve bundan
sonraki her ekran dönüşümü bu sözlükten yapılıyor. Bu iş tek başına kullanıcıya hiçbir şey
göstermez; sonraki işleri mümkün kılar.

---

## Requirements

- **R1.** Tasarımın altı yapı taşı **paylaşılan bileşenler** olarak tek bir yerde tanımlanır:
  segmentli seçici, başlıklı kart bölüm, boş durum kutusu, uyarı şeridi, hata metni, ipucu metni.
  Altısı da **adlandırılmış props alan bileşenlerdir**; bugün bazıları ekranın içinde konumsal argümanlı
  yerel fonksiyon olarak duruyor (`bosDurum(baslik, metin, eylemler)`, `uyari(renk, baslik, metin, testId)`),
  o biçim taşınmaz. (R2, T1) Altısı tek dosyada, `src/components/tasarim.jsx`'te durur; sözlük belgesi bu dosyayı anlatır.
  Bugün zaten paylaşılan ama yanlış yerde duran tanımlar (`Segment`, `HataMetni`, `Ipucu` → `gider/GiderAlanlari.jsx`)
  oraya taşınır; eski yerde yeniden dışa aktarma (takma ad) bırakılmaz.
- **R2.** Bu öğeleri bugün kendi içinde taşıyan ekranlar (Giderler ve alt görünümleri, Evrak'ın alıcı
  bölümü) paylaşılan bileşenlere geçirilir. **Kopya tanım kalmaz**: aynı öğenin iki ayrı yerde tanımlı
  olması bu işin başarısızlığı demektir. Bu kural **tanım düzeyindedir**; aynı bileşeni kullanan iki ekranın
  görünümünü tek bir biçime indirgemek anlamına gelmez (bkz. R3 ve R5'teki varyantlar), çünkü R7 görünümün
  korunmasını şart koşuyor.
  (R2, T5) Taşınan yalnız **birebir kopyalardır**: aynı görünümü veren tanımlar. Aynı fikrin görünüşü farklı
  sürümleri (yakın kopyalar, Context'teki liste) bu işte taşınmaz, sözlükte **bilinen borç** olarak yazılır; onları
  paylaşılan bileşene sokmak ya görünümlerini değiştirir (R7) ya da yeni bir varyant ister (X5).
- **R3.** Davranış, görünen metinler, erişilebilirlik nitelikleri (`role`, `aria-*`) ve test kancaları
  (`data-testid`) **birebir korunur**. Bu, segmentli seçicinin **iki erişilebilirlik kipi** taşımasını
  gerektirir: varsayılan `radiogroup` kipi (`role="radio"` + `aria-checked`, Giderler'in bugünkü hâli) ve
  ikinci bir `group` kipi (`aria-pressed`, Evrak alıcı seçicisinin bugünkü hâli). Her ekran **kendi mevcut
  kipiyle** taşınır. Bileşenin bugünkü props davranışı da korunur (devre dışı bırakma, satır sarma); yeni
  kip yalnız ekleme yapar, mevcut olanı değiştirmez.
- **R4.** Bileşenler yalnız uygulamanın tema değişkenlerini kullanır; sabit renk kodu yazılmaz. Karanlık
  temada okunabilirlik bozulmaz.
- **R5.** Ayarlar ekranındaki mevcut bölüm bileşeni ile yeni kart bölüm **tek bir bileşende birleşir** ve
  bu bileşen **iki görünüm varyantı** taşır: `ayar` (gölgeli, geniş dolgulu, ikonlu koyu başlık,
  katlanabilir) ve `kart` (kenarlıklı, dar dolgulu, ikonsuz, küçük gri büyük harf başlık). Mevcut çağrılar
  varsayılan olarak `ayar` varyantını alır, böylece Ayarlar'ın görünümü hiç değişmez. Katlanabilirlik yalnız
  `ayar` varyantında bulunur. İki ayrı kart bileşeni kalmaz.
  (R2, T2) Birleşen bileşenin adı `KartBolum`'dur; `settings/Section.jsx` silinir ve Ayarlar'daki çağrılar yeni ada geçer
  (takma ad bırakılmaz). (R2, T4) `kart` varyantı **iki başlık biçimi** taşır: `etiket` (küçük gri büyük harf, Evrak'ın
  bugünkü hâli) ve `baslik` (15 punto koyu başlık + isteğe bağlı gri alt satır, gider kartlarının bugünkü hâli). İkisi de
  var olan görünümlerdir; yeni öğe değildir (X5).
- **R6.** Sözlük **yazıya dökülür**: her yapı taşı için ne zaman kullanılacağı ve ne zaman
  kullanılmayacağı yazılır. Yazılı olmayan sözlük, bir sonraki ekranda yeniden yorumlanır.
- **R7.** Bu iş **hiçbir ekranın görünümünü değiştirmez.** Dönüşüm öncesi ve sonrası ekranlar gözle fark
  edilir biçimde farklı olmamalıdır.
- **R8.** Yeni bir stil sistemi getirilmez: CSS framework, CSS module veya styled-components eklenmez;
  uygulamanın mevcut satır içi stil deseni korunur.
- **R9.** Paylaşılan bileşenler `data-testid` değerini **dışarıdan alır**, içeride sabit bir kimlik
  taşımaz; mevcut çağrılar bugünkü değerleri geçirir. Bugün boş durum kutusunda kimlik bileşenin içine
  gömülü, uyarı şeridinde ise parametre olarak geliyor; bu tutarsızlık dışarıdan alma yönünde giderilir.
- **R10.** Uyarı şeridinin kabul ettiği renk aileleri sabittir: **bilgi, uyarı, başarı**. Tanımsız bir
  değer verildiğinde bileşen hata vermez, **bilgi** ailesine düşer; bu davranış sözlükte yazılır. Hata
  (kırmızı) ailesi bugün yok ve bu işte eklenmez (X5).

---

## Constraints

### Uyulması zorunlu

- **C1.** **Davranış değişikliği yasak.** Bu spec yalnız kodun yerini değiştirir, ne yaptığını değil.
- **C2.** Yeni bağımlılık eklenmez.
- **C3.** Renkler tema değişkenlerinden gelir.
- **C4.** Kullanıcıya görünen tüm metinler Türkçedir ve değişmez.
- **C5.** **Mevcut testler değiştirilmeden geçmelidir.** Bu işte test dosyalarına dokunmak (sorgu
  gevşetmek, seçici değiştirmek) yasaktır; test kırılıyorsa davranış değişmiş demektir ve kod düzeltilir.
- **C6.** Kapsam yalnız sözlüktür. Eski ekranların dönüştürülmesi bu spec'te yapılmaz.

### KAPSAM DIŞI

- **X1.** Eski ekranların yeni tasarıma dönüştürülmesi — *neden:* ikinci faz; her ekran kendi işi ve kendi
  görsel kanıtı olacak.
- **X2.** Servis ve Kargo Panosu ile Faaliyet Haritası — *neden:* ikisinin kendi görsel dili var (kanban
  kartları, harita katmanları); dokunmanın riski yüksek, kazancı düşük.
- **X3.** Görsel regresyon test altyapısı — *neden:* bu ölçekte maliyeti faydasını aşar (karar); doğrulama
  mevcut testler artı önce ve sonra ekran görüntüsüyle yapılır.
- **X4.** Renk paletinin, tipografinin veya temanın değiştirilmesi — *neden:* beğenilen şey mevcut palet;
  bu iş onu taşır, yeniden tasarlamaz.
- **X5.** Yeni tasarım öğesi icat etmek — *neden:* bugün var olan altısı taşınır. Yedinci bir öğeye ihtiyaç
  çıkarsa o, ihtiyacı doğuran ekranın işinde tartışılır.
- **X6.** Erişilebilirlik iyileştirmesi — *neden:* mevcut nitelikler korunur, yenisi eklenmez; iyileştirme
  ayrı bir iştir.

---

## Context

Tasarımın bugünkü hâli, kodda doğrulanmış:

- **Segmentli seçici** `src/components/gider/GiderAlanlari.jsx:31`'de tanımlı. Gri zemin üstünde beyaz
  aktif hap; `role="radiogroup"` ve `aria-checked` taşıyor. Giderler ekranı görünüm değiştirmede
  (`Giderler.jsx:177`) ve dönem türü seçiminde (`:131`) kullanıyor. Aynı fikrin Evrak'taki alıcı tipi
  seçicisinde **ikinci bir kopyası** var (`Documents.jsx:1114-1127`) ve **iki yönden farklı**:
  (1) erişilebilirlik olarak `role="group"` + `aria-pressed` kullanıyor, `radiogroup`/`aria-checked`
  değil; (2) görünüm olarak marka renkli kenarlık ve amber zeminli iki çerçeveli düğme, etiketleri de
  "Alıcı: Bayi" gibi önekli. **Mevcut bir test bunu doğrudan bekliyor:**
  `tests/ui/documents-bayi-alici.test.jsx:51` → `aria-pressed === "true"`. Bu yüzden tek bir kipe indirgemek
  C5'i (test dosyasına dokunulmaz) ve R7'yi (görünüm değişmez) aynı anda çiğner; R3 ve R5'teki varyant
  kararı bu gerçekten doğdu.
- **Segment fikrinin üçüncü bir kopyası Analiz'de var** (`Analiz.jsx:104`, `aria-pressed`'li pil düğmesi);
  Finans, Stok ve Müşteriler ekranlarında da benzer filtre pilleri bulunuyor. Bunların dönüşümü X1 ve C6
  gereği bu işin kapsamı dışıdır, dolayısıyla "ikinci tanım kalmaz" kuralı kapsam içindeki ekranlarla
  sınırlıdır (AC-10).
- **Başlıklı kart bölüm** `Documents.jsx:1110`'da satır içi duruyor: beyaz zemin, 12 köşe, ince kenarlık,
  18 dolgu, üstte küçük gri büyük harf başlık.
- **Boş durum kutusu** `Giderler.jsx:149`: kesikli kenarlık, ortalanmış, `data-testid` taşıyor. Eski
  ekranlarda karşılığı düz bir "Kayıt bulunamadı." metni.
- **Uyarı şeridi** `Giderler.jsx:157`: renk ailesine göre zemin ve kenarlık, kalın başlık, açıklama satırı,
  `role="status"`.
- **Hata metni ve ipucu** `GiderAlanlari.jsx:23-28`: `role="alert"` hata, altında küçük gri ipucu.
- **Ayarlar'da zaten bir bölüm bileşeni var:** `src/components/settings/Section.jsx`. Bu, aynı fikrin daha
  eski ve dar bir denemesi ama **görünümü belirgin biçimde farklı**: gölgeli, 24 dolgulu, 720 piksel
  genişlik sınırlı, ikonlu 16 punto koyu başlıklı ve katlanabilir; Evrak kartı ise kenarlıklı, gölgesiz,
  18 dolgulu, ikonsuz ve küçük gri büyük harf başlıklı. R5 ikisini tek bileşende **iki varyantla**
  birleştirir; naif bir birleştirme Ayarlar'ın bütün sekmelerinin görünümünü değiştirir ve bu işin en
  görünür regresyonu olurdu.

Plan turunda (R2) kodda ayrıca doğrulananlar:

- **Segment, hata metni ve ipucu zaten paylaşılan bileşenler**, yalnız `gider/GiderAlanlari.jsx`'te duruyorlar ve Giderler
  dışında `CalisanManager` ile `FiyatOnerisi` de kullanıyor.
- **Gider kartları:** aynı kart kabı gider alt görünümlerinde dört kez yerel sabit olarak tanımlı (`DonemRaporu.jsx`,
  `MakinaModelGorunumu.jsx`, `MakinaKarliligi.jsx`, `KdvKarsilastirmaKarti.jsx`) ve başlığı Evrak'takinden farklı çiziyor
  (15 punto koyu başlık + gri alt satır). Başlığın alt boşluğu dosyaya göre 10 ya da 12 piksel; bu farklar korunur.
- **Yakın kopyalar (taşınmaz, bilinen borç):** GiderForm'un mükerrer uyarısı ve kırmızı "Kayıt yapılmadı" kutusu,
  SettingsGider'in eşik uyarısı (`role="alert"`), GiderAlanlari'nin gri bilgi kutusu, KDV kartının kesikli boş kutusu,
  MakinaMaliyetDetay'ın kesikli bilgi kutusu, Makina Kârlılığı'nın boş kartı, Giderler'deki "Hatırlatma kapsamı" aç/kapa
  düğmesi.
- **Evrak'ta aynı kart sekiz kez daha var:** `Documents.jsx`'te üç (Belge Detayları, Ürünler, Teklif Koşulları) ve
  `FaturaFormModal.jsx`'te beş. Kapsam "Evrak'ın alıcı bölümü" olduğu için dokunulmaz; sözlükte ilk dönüşüm adayları diye
  listelenir.
- **Gölgeler tema değişkeni değildir:** Segment'in aktif hapı ve Ayarlar bölümü `rgba(...)` gölge kullanıyor; temada gölge
  değişkeni yok.
- **Karanlık tema kontrastı ölçüldü** (`src/lib/theme.js` değerleri): altı bileşenin metin/zemin çiftleri karanlıkta
  aydınlıktakine eşit ya da daha yüksek; Evrak kart başlığının kontrastı (gri etiket) iki temada da düşük (2.56 / 2.98).
  Bu bugünkü görünümdür; değiştirmek X4 ve X6 dışıdır, bilinen erişilebilirlik borcu olarak yazılır.

Uygulamanın kuralları:

- Stil tamamen satır içi; CSS framework, CSS module veya styled-components yok. R8 bunu korur.
- Renkler tema değişkenleri üzerinden geliyor (`var(--...)`) ve karanlık tema bunlara bağlı.
- Arayüz testleri jsdom altında metin ve rol üzerinden sorguluyor. Bu, C5'i uygulanabilir kılıyor:
  görünüm taşınırken metin ve roller korunursa testler kendiliğinden geçer.

Bilinen tuzaklar:

- **Sessiz görünüm kayması.** Satır içi stilleri bileşene taşırken bir dolgu veya köşe değeri
  değişirse kimse fark etmez ama ekran "biraz farklı" olur. R7 bu yüzden gereksinimdir ve görsel kanıtla
  doğrulanır.
- **Sözlüğün yazılmaması.** Bileşen çıkarıp kuralını yazmazsak, bir sonraki ekranda geliştirici kendi
  yorumunu uygular ve tutarlılık yine kaybolur (R6).
- **Kapsamın kayması.** "Zaten dokunmuşken şurayı da düzeltelim" bu işin en olası çıkış yolu. C6 ve X1
  bunu kapatır.

---

## Acceptance Criteria

- **AC-1.** Segmentli seçici tek bir yerde tanımlıdır; Giderler ekranı ve Evrak'ın alıcı tipi seçicisi aynı
  bileşeni, kendi erişilebilirlik kipi ve görünüm varyantıyla kullanır.
- **AC-2.** Her ekran **kendi mevcut erişilebilirlik kipini korur**: Giderler'de `role="radiogroup"`,
  `role="radio"` ve `aria-checked`; Evrak alıcı seçicisinde `role="group"` ve `aria-pressed`.
- **AC-3.** Evrak'taki alıcı tipi seçimi dönüşümden sonra aynı çalışır: müşteri seçilince bayi alanları,
  bayi seçilince müşteri alanları bugünkü gibi temizlenir.
- **AC-4.** Boş durum kutusu tek bir yerden gelir ve gider ekranındaki `data-testid` değeri korunur.
- **AC-5.** Uyarı şeridi tek bir yerden gelir, üç renk ailesini de destekler ve `role="status"` korunur.
- **AC-6.** Hata metni `role="alert"` ile gelir; ekran okuyucu davranışı değişmez.
- **AC-7.** Yeni bileşenlerde **yedeksiz** sabit renk kodu yoktur; renkler tema değişkeninden gelir.
  `var(--n150, #f1f5f9)` biçimindeki yedekler uygulamanın mevcut desenidir ve korunur. (R2, T7) Gölgelerdeki `rgba(...)`
  değerleri istisnadır (temada gölge değişkeni yok, değiştirmek X4 olur); istisna sözlükte yazılır.
- **AC-8.** Karanlık temada altı bileşenin de metni okunabilir ve kenarlıkları görünür. (R2, T8) Ölçü: her bileşenin
  metin/zemin renk çiftinin karanlık temadaki kontrastı, aydınlık temadakinin en az %95'idir; kenarlık/zemin oranı iki
  temada da en az 1.15'tir. Değerler tema tablosundan hesaplanır. (R3) Metin ölçüsü düzeltildi: karanlık kontrast ya
  WCAG AA eşiğini (4.5) karşılar ya da, bugün aydınlıkta da AA altında kalan çiftlerde, aydınlıktakinin en az %95'idir.
  Yalnız "%95" kuralı çok yüksek kontrastlı çiftleri (ör. başlık 17.9 → 13.9) okunaklı oldukları hâlde başarısız sayıyordu.
- **AC-9.** Ayarlar ekranındaki bölümler ile yeni kart bölüm aynı bileşenden gelir; bileşen iki görünüm
  varyantı taşır ve Ayarlar'ın görünümü (gölge, dolgu, genişlik sınırı, ikonlu başlık, katlanabilirlik)
  dönüşümden sonra aynıdır. Uygulamada ikinci bir kart bileşeni kalmaz.
- **AC-10.** Kapsam içindeki ekranlarda (Giderler ve alt görünümleri, gider kartları dâhil, Evrak'ın alıcı bölümü,
  Ayarlar bölüm bileşeni) aynı yapı taşının ikinci bir **birebir** tanımı kalmaz; R2'deki yakın kopyalar bu kuralın
  dışındadır ve bilinen borç listesinde adıyla yer alır. Kapsam dışı ekranlardaki mevcut kopyalara
  (`Analiz.jsx:104` ve benzeri filtre pilleri) dokunulmaz; bunlar sözlük belgesinde **bilinen borç** olarak
  listelenir.
- **AC-11.** Mevcut arayüz testleri **hiç değiştirilmeden** geçer.
- **AC-12.** Dönüşümden etkilenen her ekran için **aynı pencere boyutunda**, aydınlık ve karanlık temada
  önce ve sonra görüntüsü alınır ve PR'da yan yana konur; farkın kabul edilebilir olup olmadığına Takım
  Yöneticisi karar verir. Görsel regresyon aracı kurulmaz (X3), doğrulama bu süreçle yapılır. (R2, T9) Görüntüler bir
  kerelik bir düzenekle alınır (test paketine girmez, yeni bağımlılık yok): gerçek bileşenler örnek veriyle, 1440×900,
  aydınlık ve karanlık; önce ve sonra görüntüleri piksel piksel karşılaştırılır ve fark eden piksel sayısı raporlanır.
  Hedef her ekranda 0 piksel farktır. Bu spec'te görsel kanıt atlanmaz.
- **AC-13.** Sözlük belgesi `docs/tasarim-sozlugu.md` olarak vardır ve altı yapı taşının **her biri** için
  şunları içerir: ad, ne zaman kullanılır, ne zaman kullanılmaz, ve en az bir gerçek kullanım örneği
  (dosya:satır). Ayrıca kapsam dışı bırakılan kopyaları bilinen borç olarak listeler.
- **AC-14.** Yeni bir bağımlılık eklenmemiştir ve CSS framework, CSS module veya styled-components
  getirilmemiştir.
- **AC-15.** Evrak alıcı tipi seçicisi dönüşümden sonra da `aria-pressed` taşır ve
  `tests/ui/documents-bayi-alici.test.jsx` hiç değiştirilmeden geçer.
- **AC-16.** Uyarı şeridine tanımsız bir renk ailesi verildiğinde bileşen hata vermez, bilgi ailesiyle
  çizilir.
- **AC-17.** Paylaşılan bileşenlerin hiçbiri içinde sabit `data-testid` taşımaz; kimlik çağıran taraftan
  gelir ve mevcut çağrılarda bugünkü değerler korunur.
- **AC-18.** Kapsam dışı ekranlardaki mevcut kopyalar bu işte değiştirilmemiştir; sözlük belgesindeki
  bilinen borç listesi bunları adlarıyla sayar. (R2) Liste R2'deki yakın kopyaları, Evrak'ın diğer sekiz kartını ve
  Evrak kart başlığının düşük kontrastını da içerir.
- **AC-19.** (R2, T4) Gider kartları (`DonemRaporu`, `MakinaModelGorunumu`, `MakinaKarliligi`, `KdvKarsilastirmaKarti`)
  `KartBolum`'un `kart` varyantını `baslik` başlık biçimiyle kullanır; yerel kart sabiti ve başlık yardımcısı kalmaz,
  görünümleri değişmez (AC-12 ölçüsüyle).
- **AC-20.** (R2, T10) Sözlük belgesindeki her dosya:satır örneği gerçek bir satırı gösterir ve o satırda ilgili
  bileşenin adı geçer; bu bir testle denetlenir.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor (görsel olanlar kanıt görüntüsüyle).
- [ ] Mevcut test dosyalarına **hiç dokunulmadı**; bu, PR'ın dosya listesinden görülüyor (C5).
- [ ] Altı yapı taşının tek tanımı kaldığı aramayla gösterildi (AC-10).
- [ ] Ayarlar bölüm bileşeninin yeni kart bölümle birleştiği gösterildi (AC-9).
- [ ] Etkilenen ekranların önce ve sonra görüntüleri eklendi (`docs/evidence/0009-*.jpg`), aydınlık ve
      karanlık tema dâhil. (Triyaj bulgu 3) Depoya her ekran ve tema için yan yana (önce | sonra), küçültülmüş bir JPEG
      ile piksel raporu (`docs/evidence/0009-piksel-raporu.json`) konur. Piksel karşılaştırması aracın ürettiği tam
      çözünürlüklü PNG'lerle yapılır; bunlar depoya konmaz. Sonucu doğrulamak için araç yeniden çalıştırılır:
      `node scripts/evidence/0009-calistir.mjs <sonra> <once>` (önce görüntüleri 0009 öncesi koddan, ör. bir git worktree'de).
- [ ] Sözlük `docs/tasarim-sozlugu.md` olarak yazıldı ve `CLAUDE.md`'ye tek satır atıf eklendi; sonraki
      ekran dönüşümlerinin ona atıf yapacağı belirtildi (AC-13).
- [ ] Dokunulan her ekran için testinin **var olup olmadığı** PR'da yazıldı; testi olmayan ekranın yalnız
      görsel kanıtla doğrulandığı açıkça belirtildi (AC-11, AC-12).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R3 (onay sonrası): AC-8'in metin ölçüsü düzeltildi. Plandaki "karanlık ≥ aydınlığın %95'i" eşiği, uygulamada çok yüksek kontrastlı ve okunaklı çiftleri (başlık 17.9 → 13.9) başarısız saydı; eşik "WCAG AA (4.5) ya da aydınlığın %95'i" oldu. R2 plan turunda, onayla eş zamanlıydı, sayılmaz. Triyajdaki DoD biçim düzeltmesi (PNG → JPEG) R/C/AC değil, sayılmaz. |
| **Düzeltme turu sayısı** | 1 | Tek triyaj turu (üç bulgu), aynı gün düzeltildi. |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçü de gerçekti: 1) dokuz Ayarlar sekmesi (ve atlanmış Parça Tipleri) görüntüyle doğrulanmamıştı, plan tersini söylüyordu; 2) kontrast testindeki eşik R3'ten gevşekti (bugün sonucu değiştirmese de); 3) DoD kanıt biçimi depodakiyle uyuşmuyordu. Bulgu 1'in düzeltmesi ayrıca aracın boş çizilen ekranı sessizce "0 fark" saydığını ortaya çıkardı (2FA ekranı); araç artık bunu hata sayıyor. |
| **Regresyon sayısı** | 0 | 43 ekran × 2 tema = 86 görüntünün hepsinde önce/sonra 0 piksel fark; mevcut test dosyalarının hiçbiri değişmeden geçti. Son durum: 179 dosya, 1943 test, lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok. |

**Bu spec'ten çıkarılan ders:** "Görünüm değişmesin" gibi gözle yargılanan bir şart, önce/sonra piksel karşılaştırmasıyla sayıya
çevrildiğinde hem çok güçlü hem de ucuz bir kanıt oldu. Ama kanıt düzeneğinin kendisi de test edilmeli. Burada üç ayrı yerden
yanıldı: sarıcının verdiği metin rengi, iki gider başlığının miras aldığı rengi gizliyordu; boş ya da çöken bir ekran önce ve sonra
aynı olduğu için "0 fark" veriyordu; kapsanan ekran listesi, değişen dosya listesinden türetilmediği için dokuz sekme dışarıda
kalmıştı. Üçünün ortak çaresi: kanıtı değişen kodun kendisine bağlamak (her kullanan dosya bir ekrana eşli, testle), boş ekranı
hata saymak ve aracın kararlılığını değişiklikten önce ölçmek. İkinci ders: plan turunda önerilen ölçülebilir eşikler (burada
AC-8) veriyle denenmeden yazılmamalı; ilk gerçek hesaplama eşiğin yanlış şeyi ölçtüğünü gösterdi.
