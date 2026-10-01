# 0063 — Tahsilat Hesabı Sorulmayan İki Giriş Noktası: Yeni Müşteri İlk Ödemesi ve Bayi Satışları

| | |
|---|---|
| **Durum** | Taslak |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Yeni müşteri formunun (yalnız ekleme kipi) ilk ödemesi, müşteri detayının tahsilat formu, Bayiler sekmesindeki yedek parça ve Extra Kalıp satışı |
| **Bağımlı spec'ler** | 0024 (kasa, `payments.hesapId`) · 0044 (tahsilatların hesaba bağlanması) · 0040 (çek: gelir ancak tahsil/ciro ile) · 0007 (bayi aracılı kalıpta borç atfı) · 0051 (hesapsız kayıtlar) · 0058 (hesapsız kayıtların kapsam dışı bırakılması, R6'nın çerçevesi) · 0053 (yöntem satırın alanıdır) · 0009/0011 (görsel kanıt eşlemesi) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 14 bulgu işlendi, 3'ü bloklayıcıydı. Hesapsız **makina** tahsilatının hiçbir iş listesinde görünmediği bulundu (AC-6 daraltıldı, R4), seçiciyi satır düzenleyicisine koymanın içe alma döngüsü doğurduğu görüldü (R15), makina tahsilatının `durum` kaynağı olmadığı tespit edildi (R14). R14–R20, C6–C7, X6 ve AC-21…AC-32 eklendi.<br>**R2 (2026-10-01, plan onayı):** ön seçim paylaşılan alanın `varsayilan` girdisiyle, yalnız hiç seçilmemiş (`undefined`) satırda yapılır (Q1, R21); makina tahsilatının ipucu "hiçbir bakiyeye girmez" der (Q2, R22); müşteri detayının ekleme kipine ön seçim gelir (Q3, R13 açıklaması); `musteri-tahsilat-hesap` kanıt kaydı `degisti` olur (Q4, R19/AC-30 istisnası); düzenleme kipi form düzeyinde ve kayıt yolu aynı (Q5); yuva güncellemesi çağıranın işlevsel güncelleyicisiyle (Q6, R23); uçtan uca deneme gerçek App jsdom testiyle (Q7). |

---

## Intent

0044 tahsilatı kasa hesabına bağladı, ama iki giriş noktası dışarıda kaldı ve ikisi de para
**gerçekten elimize geçtiği** anlar:

1. **Yeni müşteri formunun ilk ödemesi.** Makina satışında alınan kapora ve peşin tahsilat burada
   giriliyor; satır satır yöntem seçiliyor (nakit, havale, çek, kredi kartı) ama **hangi hesaba
   girdiği sorulmuyor**. Bu, işletmenin en büyük tek tahsilatı ve hiçbir hesaba düşmüyor.
2. **Bayiler sekmesinden yapılan satışlar.** Bayi detayından açılan "Yedek Parça Satışı" ve "Bayi
   Aracılığıyla Kalıp Satışı" formlarında ödendi işaretlenebiliyor ama **hesap seçilemiyor**.

Sonuç ikisinde de aynı: para alınmış, kasa bunu görmüyor. İki giriş noktasının **sonrası farklı**
(QA turunda doğrulandı): bayi satışı hesapsız kalınca 0051'in "hesabı belirtilmemiş tahsilatlar"
listesine düşer ve kullanıcı aynı işi ikinci kez Kasa ekranından yapar; **makina tahsilatı hiçbir
listede görünmez** (`kasa.hesapsizTahsilatlar` yalnız servis, Extra Kalıp ve yedek parçayı tarar), yani
orada para sessizce kaybolur. İkisi de 0044'ün ortadan kaldırmak istediği iş, makina tarafı daha da
görünmez olduğu için daha acil.

Başarı şu demek: parayı aldığımız her formda hangi hesaba girdiği aynı alanla sorulyor ve
"hesabı belirtilmemiş tahsilatlar" listesi yalnız geçmişten gelen kayıtlardan oluşuyor, yeni
kayıtlardan değil.

---

## Requirements

### A. Yeni müşteri formunun ilk ödemesi

- **R1.** İlk ödeme satırlarının **her satırında** tahsilat hesabı seçilir. Hesap satırın alanıdır,
  çünkü yöntem satırın alanıdır: kapora nakit kasaya, kalan havale bankaya girebilir (0053'ün kuralının
  tahsilat tarafındaki karşılığı). **Kapsam yalnız ekleme kipidir:** ilk ödeme bölümü (`PaymentRowsEditor`)
  `CustomerAddEditForm.jsx:445`'te `modal === "add"` dalında çizilir, düzenleme kipinde yalnız ödenen
  toplam yazar ve ödemeler müşteri detayından yönetilir. Düzenleme formuna hesap alanı eklenmez.
- **R2.** Alan yalnız Kasa yetkisi olan kullanıcıda çizilir (0044'ün kuralı: hesap alanı ancak hesap
  listesi verilince görünür); yetkisiz kullanıcıda form bugünkü hâliyle kalır. **Kapı `null`dır, boş dizi
  değil** (R16).
- **R3.** Ön seçim 0044'ün bugünkü yardımcısından gelir (en son kullanılan tahsilat hesabı); liste
  satışın para birimiyle uyumlu **açık** hesaplardır ve uyumsuz hesap ön seçilmez.
- **R4.** Hesap **boş bırakılabilir**; boş kalan satır hesapsız kaydedilir, hiçbir bakiyeye girmez ve
  hesap zorunlu alan değildir. **Boş hesap kayda `null` olarak yazılmaz, alan hiç yazılmaz:** bugünkü
  ekleme kolu deseni (`CustomerDetailModal.jsx:647` `...(kasaYetki && hesapId !== "" && != null ? { hesapId } : {})`;
  kayıt kurucular da `form.hesapId !== undefined` koşuluna bakar, `yedekParcaSatis.js:77`, `kalipSatisi.js:38`).
  Gerekçe 0001'de bulunan `stableStringify` dersidir: sunucu karşılaştırmasında `null` ile yokluk ayrıdır,
  gereksiz `null` alan eski kayıtları "değişmiş" gösterip 403 riski doğurur.
  **Hesapsız kalan ilk ödeme hiçbir iş listesinde görünmez** (`kasa.hesapsizTahsilatlar` `kasa.js:269`
  yalnız `satisKalemleri`'ni, yani servis / Extra Kalıp / yedek parçayı tarar; `payments` kaynak değildir).
  Bu bilinen boşluk X3 ve 0058 X6 ile aynıdır ve bu spec onu kapatmaz; bayi satışında (B parçası) kayıt
  listeye girer.
- **R5.** İlk ödeme kayıtları hesabı kayda yazar; tutar, KDV, kredi kartı komisyonu ve kalan borç
  hesapları **değişmez**. Yazan yer saf motordur: `src/lib/makinaOdeme.js` `ilkSatisOdemeleri` satırın
  `hesapId`'sini kurduğu kayda geçirir (bugün taşımıyor: `:25`, `:30`, `:32`); `alinanTutar` hesabı
  (`isPaymentReceived` süzmesi, `:34`) olduğu gibi kalır. Testi `tests/makina-odeme.test.js`.
- **R6.** **Çek ve kredi kartı satırında hesap "para nereye girecek" sorusudur, bakiyeye hemen
  girmez:** çek ancak tahsil edilince, kart blokaj bitince hesaba düşer (0040 ve 0044'ün tek tahsilat
  kuralı aynen korunur).

### B. Bayi ekranından yapılan satışlar

- **R7.** Bayi detayından açılan "Yedek Parça Satışı" ve "Bayi Aracılığıyla Kalıp Satışı" formlarında
  hesap alanı çizilir.
- **R8.** **Yeni arayüz yazılmaz.** İki form bu alanı zaten içeriyor ve ödendi işaretlenince gösteriyor;
  yalnız Bayiler ekranına hesap listesi ve ön seçim geçirilmediği için gizli kalıyor (Context'te
  doğrulandı). İş, eksik iki değerin bağlanmasıdır.
- **R9.** Alanın davranışı Stok ve müşteri detayındakiyle **birebir aynıdır**: ödendi işaretlenince
  görünür, aynı ön seçim, aynı "neden sorulmuyor" ibaresi.
- **R10.** Bayiye satışta hesap sorusu yalnız "para hangi hesaba girdi" sorusudur; **borç atfı
  değişmez** (0007'nin kuralı: bayi aracılı kalıpta borçlu bayidir).

### C. Tek seçici

- **R11.** Tahsilat hesabı seçicisi **tek paylaşılan bileşenden** gelir. Müşteri detayının tahsilat
  formundaki yerel seçici de o bileşene taşınır; üç ayrı kopya bırakılmaz.
- **R12.** Para birimi uyumu, kapalı hesabın listelenmemesi ve ön seçim kuralı **tek yerde** durur.
- **R13.** Müşteri detayının tahsilat formu bugün **bütün satırlar için tek hesap** soruyor; satır bazına
  geçince davranış korunur: ön seçim her satıra aynı hesabı koyar, kullanıcı isteyen satırı değiştirir.
  **Yalnız ekleme kipi satırlıdır:** form iki kiplidir, `paymentForm.id` varsa tek kayıt düzenlenir (kendi
  yöntem ve tutar alanlarıyla, `CustomerDetailModal.jsx:1344-1392`) ve orada satır kavramı yoktur; hesap
  seçicisi düzenleme kipinde **form düzeyinde kalır**.

### QA turunda eklenenler (R1)

- **R14.** **Makina tahsilatı için motora yeni kaynak eklenmez; `durum` nesnesini çağıran kurar.**
  `TahsilatHesapAlani`'nın girdisi `tahsilatHesapDurumu(kaynak, kayit, ops)` çıktısıdır ve `SATIS_KAYNAK`
  üç değerdir (`satisTahsilat.js:6`): `payments` için kaynak yok, motor onu bilmez. Satırın durumu yerinde
  kurulur: `{ sor: parseMoney(satir.tutar) > 0, currency: form.currency || "TRY", tutar: parseMoney(satir.tutar) }`;
  tutarı sıfır olan satırda alan çizilmez. `src/lib/satisTahsilat.js` **değişmez** (X3). Gerekçe: üç kaynaklı
  motor "bu bedelin ne kadarı bizim" sorusunu yanıtlar, makina tahsilatında o soru yoktur, girilen tutar
  zaten tahsil edilen paradır.
- **R15.** **Seçici satır düzenleyicisine yuva olarak verilir, içine gömülmez.** `PaymentRowsEditor`
  `src/components/ui.jsx:211`'de; `TahsilatHesapAlani` ise `src/components/kasa/TahsilatHesap.jsx:5`'te
  `../ui`'den `Field, Select, Btn, Modal, Icon` içe alır. Seçiciyi düzenleyicinin içine koymak
  `ui.jsx → kasa/TahsilatHesap → ui.jsx` **içe alma döngüsü** demektir; aynı tuzak `KartTaksitAlani.jsx:4`'te
  yazılıdır ("./ui'den (Icon) import ETME, ui.jsx bu bileşeni PaymentRowsEditor içinde kullanıyor, döngü olur").
  Çözüm: `PaymentRowsEditor` satır başına bir **yuva** props'u alır (ör. `satirEki={(satir, i, guncelle) => …}`),
  çağıranlar (`CustomerAddEditForm`, `CustomerDetailModal`) `TahsilatHesapAlani`'nı oraya verir. Tek bileşen
  kuralı (R11) korunur, `ui.jsx` kasa katmanını tanımaz (C6).
- **R16.** **Yetki kapısı `null`dır.** Formlar alanı `kasaHesaplari ?` truthiness'ine bakarak çizer
  (`PartSaleForm.jsx:247`, `YedekParcaSatisForm.jsx:234`) ve **boş dizi truthy'dir**; bu yüzden App
  `Customers`'a `kasaYetki ? kasaHesaplari : []` verirken (`App.jsx:1471`) `CustomerDetailModal` formlara
  `kasaYetki ? kasaHesaplari : null` olarak yeniden süzer (`:1474`), `Stock`'a ise doğrudan `null` gider
  (`:1473`). `SimpleDealers` ve `CustomerAddEditForm` **Stok desenini** kullanır:
  `kasaHesaplari={kasaYetki ? kasaHesaplari : null}` ve `tahsilatHesapVarsayilan={kasaYetki ? tahsilatHesapVarsayilan : null}`.
  Boş dizi geçilirse yetkisiz kullanıcı "… para biriminde açık hesap yok" ibareli bir alan görür ve R2
  sessizce ihlal edilir.
- **R17.** **"Tek seçici" ölçülebilir:** `src/components/` altında `TahsilatHesap.jsx` dışında hiçbir dosya
  `HESAP_TUR_AD`'ı içe almaz **ve** `aria-label="Tahsilat hesabı"` yalnız `TahsilatHesap.jsx`'te geçer.
  Bugünkü yerel kopya `CustomerDetailModal.jsx:1400-1415`'tedir (kendi `Select`'i, `secilebilirHesaplar` +
  `HESAP_TUR_AD`, boş değer `""`; paylaşılan bileşen `null` kullanır) ve kaldırılır. Kaynak taraması mevcut
  `tests/ui/tahsilat-hesap.test.jsx`'in 0063 bloğunda durur.
- **R18.** **Para birimi değişince satırların hesabı temizlenir.** Paylaşılan alanın bugünkü davranışı
  (`TahsilatHesap.jsx:38-39` `uyumluHesapId` → `onChange(null)`) ilk ödeme satırları için de geçerlidir:
  satışın para birimi değişince uyumsuz kalan satır hesapları boşalır. Gerekçe (QA bulgusu): `hesapBakiyeleri`
  üç satış kaynağında hesabın para birimini kaydınkiyle karşılaştırıp atlar (`kasa.js:93-94`), ama **makina
  tahsilatı bacağında (`:86`) böyle bir denetim yoktur**; uyumsuz hesap seçili bir `payments` kaydı o hesabın
  bakiyesine kendi para biriminde girer. Bu iş hesap yazan yeni bir yol açtığı için formdaki temizlik şarttır;
  motor bacağı bu işte **değişmez** (X6).
- **R19.** **Görsel kanıt.** Etkilenen üç dosyanın `docs/evidence/kanit-eslemesi.json` kaydı bugün
  `beklenen: "ayni"`dir (`SimpleDealers.jsx` → `bayiler-liste`, `bayi-formu`; `CustomerAddEditForm.jsx` →
  `musteri-formu`, `musteri-formu-hata`; `CustomerDetailModal.jsx` → `musteri-detay` …) ve
  `tests/tasarim-kaynak.test.js:135` `ayni` kayıtta **0 piksel** bekler. Bu kayıtlar `ayni` **kalır** ve bu
  doğrulanır: araçtaki `musteri-formu` ekranı `kasaHesaplari` almaz ve ilk ödeme satırı boştur,
  `bayi-formu` ise bayi kayıt formudur, satış formu değildir (`scripts/evidence/0009-sayfa.jsx:446`, `:449`).
  Alanın göründüğü **yeni ekranlar** görüntü aracına eklenir (`musteri-formu-ilk-odeme`,
  `bayi-yedek-parca-formu`, `bayi-kalip-formu`), kendi raporunu üretir (`0063-piksel-raporu.json` + JPEG) ve
  kayıtları yazılır. Mevcut bir ekranın görünümü yine de değişiyorsa o kayıt `beklenen: "degisti"` + `onay`
  (`Takım Yöneticisi · YYYY-AA-GG · spec 0063 R<no>`) alır ve spec `done`'a taşınırken `ayni`ye çevrilir.
- **R20.** **Kredi kartı satırının bakiyeye gireceği tutar kaydın `tutar`ıdır.** `ilkSatisOdemeleri` KK
  satırında `makinaKartOdemesi` sonucunu yazar (`makinaOdeme.js:29-30`), yani karta yansıtılan KDV ve
  komisyon dahil brüt kart tutarı. Blokaj bitince hesaba o tutar girer; yeni bir hesap yapılmaz, net mal
  bedeli kullanılmaz (R5'in "tutar değişmez" kuralının ölçüsü).

### F. Plan onayında eklenenler (R2)

- **R21.** **Ön seçim tek yerde, yalnız ilk açılışta.** `TahsilatHesapAlani` isteğe bağlı `varsayilan(pb)` girdisi alır: alan
  soruluyorken değer `undefined` ise (satır hiç seçilmemiş) uyumlu ön seçimi (`uyumluHesapId`) yazar. Kullanıcının boşalttığı
  satır `null` olur ve yeniden doldurulmaz; para birimi değişince boşalan satır (R18) da yeniden doldurulmaz. Gerekçe: ön seçim
  satır eklenirken yapılsaydı tutar sonradan girildiğinde ve para birimi değiştiğinde yanlış kalırdı; kural R12 gereği tek
  bileşende durur (plan Q1).
- **R22.** **Makina tahsilatının ipucu.** Çağıranın kurduğu `durum` `listedeBekler: false` taşır ve alan "seçilmezse hiçbir
  bakiyeye girmez" der; bugünkü "Kasa'da hesabı belirtilmemiş tahsilatlar arasında bekler" metni makina tahsilatı için yanlıştır
  (R4, X3). Metin yine tek bileşendedir (plan Q2).
- **R13 açıklaması.** Müşteri detayının tahsilat formunda ekleme kipinde bugün ön seçim yoktu (alan "Hesap belirtilmedi" ile
  açılıyordu). Bu işle her satıra R3'ün ön seçimi gelir: alana dokunmadan kaydeden kullanıcı artık en son kullanılan hesabı alır.
  AC-18 "aynı hesabı seçen kullanıcı aynı kaydı alır" olarak ölçülür; ön seçim ayrıca test edilir; sürüm notunda tek satır (plan Q3).
- **R19/AC-30 istisnası.** `musteri-tahsilat-hesap` ekranı (kasa yetkili, boş satırlı tahsilat formu) form düzeyindeki "Hesap"
  alanı kalktığı için değişir; kaydı `beklenen: "degisti"` + `onay: Takım Yöneticisi · 2026-10-01 · spec 0063 R13` alır, done'da
  `ayni`ye çevrilir. Diğer bütün kayıtlarda 0 piksel (plan Q4).
- **Düzenleme kipi.** Tek kayıt, form düzeyinde paylaşılan alan, `durum = { sor: true, currency, tutar }` (tutar sıfırken de
  çizilir); kayıt yolu (`""`/`null` → `null`) aynen kalır; R4'ün "yazılmaz" kuralı ekleme yollarınındır (plan Q5).
- **R23.** **Yuva güncellemesi işlevseldir.** Çağıranlar yuvadaki `onChange`'i satır düzenleyicisinin kapanıştaki dizisiyle değil
  kendi durumlarında işlevsel güncelleyiciyle yazar; aksi hâlde aynı anda ön seçim yapan iki satır birbirini ezer (plan Q6).
- **Uçtan uca deneme (DoD).** Gerçek `App` jsdom testiyle: yeni müşteri + iki satırlı ilk ödeme → Kasa bakiyesi; bayi satışı →
  bakiye ve hesapsız liste (plan Q7).

---

## Constraints

- **C1.** **Yeni kalıcı alan yoktur:** `payments.hesapId`, `part_sales.hesapId` ve
  `yedek_parca_satis.hesapId` 0024 ve 0044 ile zaten var. Veritabanı şeması, birleştirme ve yedek
  değişmez.
- **C2.** **Sunucu ve izin değişmez:** bu formların ekleme izinleri (tahsilat ekleme, yedek parça
  ekleme, kalıp ekleme) aynen aranır; `hesapId` alan düzeyinde denetlenmiyor, bu yüzden yeni bir
  yetki kapısı doğmaz.
- **C3.** Motorlar değişmez: tutar, gelir ve bakiye kuralları 0044'ün tek kaynağından okunur, hesap
  yalnız kaydın alanıdır.
- **C4.** Hesap hiçbir formda zorunlu değildir (R4); zorunlu olsa eski alışkanlıkla hızlı kayıt
  yapan kullanıcı engellenir.
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** **`src/components/ui.jsx` `tasarim.jsx`'i içe almaz.** `tests/tasarim-kaynak.test.js:136-137`
  "tasarim"dan içe alan dosya listesini `kanit-eslemesi.json` anahtarlarıyla **eşitler** ve `ui.jsx` o
  listede değildir; seçici ya da `Ipucu` doğrudan `ui.jsx`'e girerse test kırılır. R15'in yuva çözümü bunu
  zaten önler, kısıt kuralı yazılı tutar.
- **C7.** `src/lib/satisTahsilat.js` değişmez: `SATIS_KAYNAK` üç değerde kalır, `tahsilatHesapDurumu`
  `payments` bilmez (R14, X3).

### KAPSAM DIŞI

- **X1.** Bayi detayındaki "Ödendi / Ödenmedi" rozetinin düğmeye çevrilmesi — *neden:* o rozet bugün
  salt okunur; ödendi işareti yedek parça için Stok › Yedek Parça Satışı'nda, kalıp için müşteri
  detayının zaman çizelgesinde değiştiriliyor ve **iki yerde de hesap penceresi var**. Düğme eklemek
  ayrı bir izin ve pencere kararı demek. Gerekirse ayrı iştir.
- **X2.** Servis Panosu'nun hesap sorması — *neden:* 0044'ün kararı sürüyor (pano hızlı iş ekranıdır).
- **X3.** Makina tahsilatının satış tahsilatı motoruna kaynak olarak eklenmesi — *neden:* `payments`
  0024'ten beri kendi yolundan bakiyeye giriyor; iki yolu birleştirmek 0044'ün kapsamını yeniden açar.
  **Sonucu bilerek kabul ediliyor:** hesapsız kalan ilk ödeme hiçbir iş listesinde görünmez (R4); bu
  boşluk 0058 X6 ile aynıdır ve ayrı iştir.
- **X4.** Hesabın zorunlu hâle gelmesi ya da hesapsız kayda uyarı çıkması — *neden:* C4; hesapsız
  kayıt 0051'in listesinde zaten görünüyor.
- **X5.** Bayi satışında **bayinin borcunun** hesaba bağlanması — *neden:* R10; borç ve tahsilat ayrı
  sorular, karıştırılırsa 0007'nin atıf kuralı bozulur.
- **X6.** `kasa.hesapBakiyeleri`'nin **makina tahsilatı bacağına** (`kasa.js:86`) para birimi denetimi
  eklenmesi — *neden:* R18; bugün yok ve eklemek var olan bakiyeleri değiştirebilir. Bu iş formda temizlikle
  korunur (R18), motor düzeltmesi ayrı iştir.

---

## Context

- **Bayi tarafı neredeyse hazır (doğrulandı).** `YedekParcaSatisForm` ve `PartSaleForm` paylaşılan
  tahsilat hesabı alanını **zaten içeriyor**: ikisi de `kasaHesaplari` verilmişse ve `odendi` işaretliyse
  alanı çiziyor, ön seçimi de aynı yardımcıdan yapıyor. `SimpleDealers.jsx`'te ise `kasaHesaplari`
  sözcüğü **hiç geçmiyor** ve App o ekrana bu değeri göndermiyor. Yani B parçası iki değerin
  bağlanmasıdır; arayüz, doğrulama ve test altyapısı yerinde. 0044 bunu bilerek dışarıda bırakmıştı
  ("bayi formları hesap sormaz"), gerekçesi o gün kapsamı küçük tutmaktı.
- **İlk ödeme tarafı gerçek iş.** Yeni müşteri formunun ilk ödeme satırları paylaşılan ödeme satırı
  düzenleyicisinden geliyor ve o düzenleyicide hesap alanı yok; satırları kayda çeviren yardımcı da
  `hesapId` taşımıyor (kayıt alanları: müşteri, tarih, para birimi, yöntem, tutar, çek vadesi, kart
  komisyonu). Dolayısıyla satıştaki kapora hiçbir hesaba düşmüyor.
- **Aynı düzenleyici iki ekranda.** Müşteri detayının tahsilat formu da aynı satır düzenleyicisini
  kullanıyor, ama hesap seçicisi **satırların dışında, form başına bir tane**. Yani bugün nakit + havale
  karışık bir tahsilat tek hesaba yazılıyor. Hesap alanını satır düzenleyicisinin içine koymak iki
  ekranı birden çözer ve bu yanlışı da düzeltir (R1, R13).
- **Daha ucuz bir alternatif vardı, seçilmedi.** Yeni müşteri formuna da müşteri detayındaki gibi
  **form başına tek hesap** eklenebilirdi; değişiklik daha küçük olurdu. Seçilmedi, çünkü makina
  satışının ilk ödemesi pratikte karışık oluyor (kapora elden, kalan havaleyle) ve tek hesap bu veriyi
  baştan yanlış kaydeder. Üstelik satır bazı, iki ekranın aynı bileşeni paylaşmasını sürdürür; tek
  hesap seçeneği müşteri detayındaki bugünkü sınırı kalıcı hâle getirirdi.
- **Kalıcı alan gerekmiyor.** Üç bölümün `hesapId` sütunu 0024 ve 0044 ile açıldı ve her satır kendi
  tahsilat kaydını ürettiği için satır bazında hesap veri modeline birebir oturuyor. Bu yüzden iş
  dört nokta kuralına, birleştirmeye ve sunucuya dokunmuyor (C1, C2); risk düşük.
- **İki giriş noktasının hesapsız sonucu farklı (QA turunda bulundu).** `kasa.hesapsizTahsilatlar`
  (`kasa.js:269`) listesini `satisKalemleri(v)`'den kurar, yani yalnız servis, Extra Kalıp ve yedek parça;
  `payments` o yolun hiçbir yerinde yok. Bayi satışı hesapsız kalınca Kasa'nın iş listesine girer ve
  düzeltilebilir, makina tahsilatı hiçbir yerde görünmez. X3 bunu kapsam dışı bıraktığı için A parçasının
  başarı ölçüsü "hesapsız kalmayacak bir alan sunmak"tır, "listeden temizlemek" değil (R4, AC-6).
- **Seçici paylaşılan ama bir yerde kopyası var.** `TahsilatHesapAlani` / `TahsilatHesapPenceresi` /
  `tahsilatOnSecim` `src/components/kasa/TahsilatHesap.jsx`'te; `ServiceForm`, `PartSaleForm`,
  `YedekParcaSatisForm` ve `YedekParcaSatisTab` onu kullanıyor. Müşteri detayının tahsilat formu ise
  `CustomerDetailModal.jsx:1400-1415`'te **kendi Select'ini** çiziyor (ve boş değeri `null` değil `""`
  tutuyor). R11'in kaldıracağı kopya tek ve yeri belli.
- **Çek ve kartın zamanlaması tuzak.** Hesap sorulunca para hemen bakiyeye girmiş gibi görünmesi
  beklenebilir; oysa 0040 çeki ancak tahsil ya da ciroda gelir sayar, 0044 kartı blokaj bitince
  hesaba yazar. Alan "nereye girecek" sorusudur ve bu kural değişmez (R6); aksi hâlde bakiye şişer.

---

## Acceptance Criteria

### Yeni müşteri ilk ödemesi

- **AC-1.** Yeni müşteri formunun ilk ödeme satırlarında hesap seçilebilir.
- **AC-2.** İki satır iki ayrı hesaba yazılabilir ve kayıtlar bu hesaplarla doğar.
- **AC-3.** Kasa yetkisi olmayan kullanıcıda hesap alanı **DOM'da yoktur** (boş listeyle çizilmiş bir alan
  da sayılmaz) ve kayıt bugünkü gibi oluşur.
- **AC-4.** Ön seçim en son kullanılan tahsilat hesabıdır.
- **AC-5.** Listede yalnız satışın para birimiyle uyumlu açık hesaplar vardır; uyumsuz hesap ön
  seçilmez.
- **AC-6.** Hesap boş bırakılan satır hesapsız kaydedilir ve hiçbir bakiyeye girmez; kayıtta `hesapId`
  alanı hiç yazılmaz (`null` da değil). Makina tahsilatı Kasa'nın hesapsız tahsilat listesinde **görünmez**
  (bilinen boşluk, R4 ve X3).
- **AC-7.** Nakit satırın tutarı hesabın bakiyesine girer.
- **AC-8.** Çek satırı hesap seçili olsa bile tahsil edilmeden bakiyeye girmez.
- **AC-9.** Kredi kartı satırı blokaj süresi bitmeden bakiyeye girmez; blokaj bitince hesaba giren tutar
  kaydın `tutar`ıdır (karta yansıtılan KDV ve komisyon dahil), net mal bedeli değil (R20).
- **AC-10.** Tutar, KDV, kart komisyonu ve kalan borç bu işten önce ve sonra aynıdır.

### Bayi satışları

- **AC-11.** Bayi detayından açılan yedek parça satışı formunda ödendi işaretlenince hesap alanı
  görünür.
- **AC-12.** Bayi aracılığıyla kalıp satışı formunda ödendi işaretlenince hesap alanı görünür.
- **AC-13.** Seçilen hesap kayda yazılır ve tutar o hesabın bakiyesine girer.
- **AC-14.** Kasa yetkisi olmayan kullanıcıda alan DOM'da yoktur (App ve ekran `null` geçirir, boş dizi
  değil; R16).
- **AC-15.** Alanın davranışı Stok › Yedek Parça Satışı'ndaki ile aynıdır (aynı ön seçim, aynı ibare).
- **AC-16.** Bayi aracılı kalıp satışında borç atfı değişmez (borçlu bayidir).

### Tek seçici ve tutarlılık

- **AC-17.** Tahsilat hesabı seçicisi tek paylaşılan bileşenden gelir; ölçü: `src/components/` altında
  `TahsilatHesap.jsx` dışında hiçbir dosya `HESAP_TUR_AD` içe almaz ve `aria-label="Tahsilat hesabı"` yalnız
  o dosyada geçer (R17).
- **AC-18.** Müşteri detayının tahsilat formu **ekleme kipinde** satır bazına geçtikten sonra da bugünkü
  sonucu üretir (tek hesap seçen kullanıcı aynı kaydı alır); **düzenleme kipi değişmez** (tek kayıt, form
  düzeyinde hesap; R13).
- **AC-19.** Veritabanı şeması, birleştirme ve yedek paketi değişmez.
- **AC-20.** Sunucu yazma denetimi değişmez: bu formların bugünkü ekleme izinleri yeterlidir, hesap
  alanı yeni bir 403 doğurmaz (`hesapId` `ALAN_IZINLERI`'nde yoktur, `TAHSILAT_HESAP_BOLUMLERI` `payments`
  ve `cekler`'i 0056 R20 ile zaten içerir).

### QA turunda eklenenler (R1)

- **AC-21.** Müşteri **düzenleme** formunda ilk ödeme bölümü ve dolayısıyla hesap alanı yoktur (R1).
- **AC-22.** İlk ödeme satırının hesabı `src/lib/makinaOdeme.js` `ilkSatisOdemeleri` tarafından kayda
  yazılır; aynı girdiyle `alinanTutar` bu işten önce ve sonra aynıdır (`tests/makina-odeme.test.js`).
- **AC-23.** Tutarı sıfır (ya da boş) olan ilk ödeme satırında hesap alanı çizilmez (R14).
- **AC-24.** `src/lib/satisTahsilat.js` değişmemiştir: `SATIS_KAYNAK` üç değerdir ve `tahsilatHesapDurumu`
  `payments` okumaz (C7).
- **AC-25.** `src/components/ui.jsx` ne `kasa/TahsilatHesap`'ı ne `tasarim`'ı içe alır; hesap alanı satır
  düzenleyicisine yuva olarak geçer (R15, C6).
- **AC-26.** Satışın para birimi değişince ilk ödeme satırlarının uyumsuz kalan hesapları boşalır (R18).
- **AC-27.** Bayi formlarında hesap alanı **ödendi işaretli değilken** çizilmez (bugünkü davranış, R9).
- **AC-28.** Bayi yedek parça satışında çok satırlı (batch) kayıtların hepsi aynı hesabı taşır ve her
  kayıt kendi tutarıyla o hesabın bakiyesine girer.
- **AC-29.** Bayi satışında ödendi işareti kaldırılıp kayıt edilirse hesap korunur ama tutar hiçbir
  bakiyeye girmez (`tahsilatSayilirMi` `odendi === true` ister; 0044 R9).
- **AC-30.** `docs/evidence/kanit-eslemesi.json`'daki mevcut kayıtlar `beklenen: "ayni"` kalır ve ilgili
  ekranlarda 0 piksel fark ölçülür (R19).
- **AC-31.** Alanın göründüğü yeni ekranların kanıt kaydı ve JPEG'leri depoda durur (R19).
- **AC-32.** `tests/tasarim-kaynak.test.js` ve `tests/ui/tahsilat-hesap.test.jsx` yeşildir (C6, R17).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Seçicinin tek bileşen olduğu kaynak taramasıyla gösterildi: `HESAP_TUR_AD` ve
      `aria-label="Tahsilat hesabı"` yalnız `TahsilatHesap.jsx`'te (AC-17, R17).
- [ ] `CustomerDetailModal.jsx:1400-1415`'teki yerel seçici kaldırıldı (R11).
- [ ] Hesap alanı `PaymentRowsEditor`'a **yuva** olarak geçti; `ui.jsx` ne `kasa/TahsilatHesap`'ı ne
      `tasarim`'ı içe alıyor (R15, C6, AC-25).
- [ ] `durum` nesnesi çağıranda kuruldu; `src/lib/satisTahsilat.js` değişmedi (R14, C7, AC-24).
- [ ] App `SimpleDealers`'a ve `CustomerAddEditForm`'a `kasaHesaplari` / `tahsilatHesapVarsayilan`'ı
      `kasaYetki ? … : null` olarak geçiriyor (R16, AC-3, AC-14).
- [ ] Hesapsız kaydın `hesapId` alanını hiç yazmadığı testle sabitlendi (R4, AC-6).
- [ ] Hesapsız makina tahsilatının hiçbir iş listesinde görünmediği **bilinen boşluk olarak** yazılı ve
      0058 X6 ile aynı olduğu belirtildi (R4, X3).
- [ ] Çek ve kredi kartının bakiyeye erken girmediği testle sabitlendi (AC-8, AC-9).
- [ ] Müşteri detayının tahsilat formunda davranışın korunduğu testle gösterildi (AC-18).
- [ ] Gerçek uygulama üzerinden uçtan uca denendi: yeni müşteri + ilk ödeme ve bayi satışı sonrası
      Kasa bakiyesi ve hesapsız listesi kontrol edildi.
- [ ] Görsel kanıt eklendi (`docs/evidence/0063-*.jpg` + `0063-piksel-raporu.json`): ilk ödeme
      satırlarında hesap alanı, bayi yedek parça ve kalıp formlarında hesap alanı; yeni ekranlar görüntü
      aracına eklendi ve `kanit-eslemesi.json` kayıtları yazıldı (R19, AC-31).
- [ ] Mevcut kanıt kayıtlarının `ayni` kaldığı doğrulandı (0 piksel; R19, AC-30).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: 0044 bölümündeki "Servis Panosu ve bayi formları hesap sormaz" cümlesinin
      bayi yarısı düzeltildi, ilk ödemenin satır bazlı hesabı, seçicinin tek bileşen olduğu ve hesapsız
      makina tahsilatının hâlâ hiçbir listede olmadığı yazıldı.
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
