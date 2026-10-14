# 0084 — Kira stopajı üç aylık beyan dönemiyle ödenir

| | |
|---|---|
| **Durum** | Uygulanıyor (dal `feat/0084-stopaj-donemi`; plan `specs/0084-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme atanmadı |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Mali İşler › Giderler (gider formunun stopaj bölümü, yeni Stopaj Dönemleri penceresi, başlık satırı, borç özeti), Anasayfa ödeme hatırlatıcısı, Ayarlar › Giderler › Gider Ayarları, Aylık Gider ve Kasa Raporu'nun stopaj kutusu ve vade tabloları, tasarım sözlüğü, Electron yerleşim düzeneği, görsel kanıt |
| **Bağımlı spec'ler** | 0001 (kira davranışı, stopaj oranı, yürürlük ayı), 0021 (stopaj ayrı ödeme hedefi, taksit planı, çift sayım yasağı), 0024 (ödeme bir harekettir, bir ödeme bir kalemi kapatır), 0042 ve 0054 (satırsız kalemde hedef sırasıyla dağıtım), 0003 (ödeme hatırlatıcısı), 0040 ve 0049 (çok kaleme dağıtım çekirdeği), 0047 · 0059 · 0060 (raporun stopaj kutusu, vade tabloları, altın dosya), 0061 (açık kalemler), 0064 (kayıt kilidi), 0050 (pencere boyutu), 0051 ve 0074 (öneri formu doldurur deseni), 0076 (motor ayar okumaz), 0080 (sözlüğün sayfalama istisnası), 0082 (ters çevrilen prop kriteri), 0083 (Giderler başlığı ve kanıt tabanı) |
| **Taban** | Satır numaraları 0082 kapanışı `52df9a9`'a göre verildi (0083 kapanışı `c1c5496` ile aynı kaldı; dal onun üstünde). **Sıra kararı (C8): 0083 önce uygulanır, bu iş sonra**; 0084 Giderler'in başlık satırını değiştirdiği için 0083'ün yeni çekilmiş kanıt tabanını geçersiz kılar |
| **Ters çevrilen kriterler** | 0082 (AC-34, yalnız `aktifKullanici` yarısı; R19 prop'u geri getirir) · 0083 (AC-25: görüntü aracının SHA sabitlemesi; araç bu işte yeni ekran alır, test "0083'ün ekran adları araçta duruyor" iddiasına çevrilir, D1) |
| **Revizyon** | · 1 · 2026-10-14 ilk taslak · 2 · 2026-10-14 geliştirme öncesi QA turu (B-1…B-6, Ö-7…Ö-15, K-16…K-23 işlendi; vadenin yazma noktası, satırsız kalemin sınırı, dağıtım çekirdeğinin taşınması, raporun vade tabloları) · 3 · 2026-10-14 plan onayı (D1–D3 ölçüm düzeltmeleri, P1–P10 kararları; bkz. "Plan onayı kararları") · 4 · 2026-10-14 triyaj (Takım Yöneticisi): R13 ve AC-16 kapsamı tam ödenmiş kalemi içerir (açık kısım borç özetiyle eşit, kesilen dönemin gerçek toplamı); AC-11 yeni ipucu yalnız ön dolu değer dururken; R13 "ödeme satırı sayısı" ödenmişleri de sayar |

---

## Intent

Fabrika işyeri kirasının stopajını **her ay kesiyor ama vergi dairesine üç ayda bir, üç ayın
stopajını birlikte ödüyor** (muhtasar beyanın üç aylık dönemi). Uygulamada bugün stopaj kira
kaleminin ayrı ödeme hedefidir (0021) ve her kalem kendi başına izlenir: üç aylık ödeme yapılınca
kullanıcı üç ayrı kalemi bulup üç ayrı ödeme girmek zorunda, hangi ayların kapandığını kendi
kafasında tutuyor. Üstelik stopaj vadesi bugün **elle** giriliyor ve tanımdan üretilen kira
kaleminde hiç doldurulmuyor, yani vadesiz kalıyor ve ödeme hatırlatıcısına hiç girmiyor (0021
R13). Sonuç: üç aylık beyan tarihi uygulamadan hatırlatılmıyor.

Başarı şu: beyan dönemi bir ayardır; yeni kira kaleminin stopaj vadesi o döneme göre formda
**ön dolar**; "Stopaj Dönemleri" penceresi dönem dönem kesilen, ödenen ve açık stopajı gösterir;
bir dönemin bütün ödeme satırları **tek pencereden, tek tarih ve tek hesapla** ödenir;
hatırlatıcı beyan tarihini tek satırda söyler.

Değişmeyen şey: stopaj **gider kalemi değildir** (0021 R7, çift sayım yasağı). Brüt kira zaten
gider toplamındadır; bu spec yalnız **ödeme tarafını** düzenler.

---

## Requirements

### A. Beyan dönemi ayarı

- **R1.** Ayarlar › Giderler › Gider Ayarları'na iki alan gelir:
  **"Kira stopajı beyan dönemi"** (`Aylık` | `Üç aylık`, varsayılan **Üç aylık**) ve
  **"Stopaj ödeme günü"** (1–31 tam sayı, varsayılan **26**). İkisi de
  `appSettings.giderAyarlari` içinde (`stopajBeyanDonemi`, `stopajOdemeGunu`); **yeni veritabanı
  sütunu yoktur**, mevcut JSON nesnesine girerler. Yetki `gider_tanim`, ayar sunucu paylaşımlıdır.
  Alanlar `SettingsGider.jsx`'te **iki yere** birlikte eklenir: formun ilk durumu ve `kaydet`'in
  `setAppSettings` alan listesi (0076 triyajının dersi, Ö-8).
- **R2.** Doğrulama tek saf fonksiyonda: dönem iki değerden biri olmalı, gün 1–31 tam sayı olmalı;
  geçersizse **hiçbir alan kaydedilmez** ve neden yazılır (0003 ve 0076 ayar deseni). Alan hiç
  yoksa ya da bozuksa okuma yolu varsayılanı verir (üç aylık, 26) ve bu **tek okuma yoludur**
  (`stopajBeyanAyari(giderAyarlari)`); kaynakta ikinci bir `?? 26` yasaktır.

### B. Beyan dönemi hesabı (saf, tek yerde)

- **R3.** Yeni saf modül `src/lib/stopajDonemi.js`. Tek kavram: bir kira kaleminin **beyan dönemi**,
  kalemin **gider tarihinin** ayından türer. Üç aylık kipte takvim dönemleri sabittir:
  Ocak-Mart · Nisan-Haziran · Temmuz-Eylül · Ekim-Aralık. Aylık kipte dönem kalemin kendi ayıdır.
- **R4.** Dönemin **ödeme tarihi** = dönemi izleyen ayın ayarlı günü. Ekim-Aralık dönemi izleyen
  yılın Ocak ayına düşer. Gün o ayda yoksa **ay sonuna kırpılır**. Hesap mevcut yardımcıyla
  yapılır ve kurgusu şudur: dönemin **son ayı** ve ayarlı günden bir tarih dizesi kurulur, sonra
  `gider.ayEkleGun(dize, 1)` çağrılır. Ölçülmüş örnekler: `ayEkleGun("2026-03-26", 1)` →
  `2026-04-26`, `ayEkleGun("2026-12-26", 1)` → `2027-01-26`, `ayEkleGun("2026-03-31", 1)` →
  `2026-04-30`. Ara dize takvimde olmayan bir güne denk gelse de (ör. `"2026-02-31"`) fonksiyon
  onu yalnız aritmetikte kullanır ve sonucu hedef ayın gün sayısına kırpar. Kırpmayı yapan
  `gunSayisi` modül içidir (`gider.js:314`, dışa verilmemiş); **dışa verilmez ve kırpma ikinci kez
  yazılmaz** (C3'ün taraması bunu da kapsar).
- **R5.** Resmî tatil ve hafta sonu kaydırması **yapılmaz**: tarih takvimden hesaplanır, kullanıcı
  gerekirse kalemin vadesini elle değiştirir (bulgu B3).
- **R6.** Dönemin adlandırması tek yerden gelir; dönem nesnesi **üç** adlandırıcı verir ve
  ekranlar kendi metnini kurmaz (bulgu K-17):
  `donemAdi` → `"2026 1. dönem (Ocak-Mart)"` (aylık kipte `"Mart 2026"`),
  `odemeAciklamasi` → `"2026 1. dönem kira stopajı"` (hareketin açıklaması, R16),
  `hatirlatmaAdi` → `"2026 1. dönem kira stopajı"` (hatırlatıcı satırı, adet metni satırda
  eklenir, R20).

### C. Vade formda ön dolar

- **R7.** Vade **türetilmez, saklanır**: `odemeHedefleri` ve onu okuyan otuzdan fazla çağıran
  değişmez (bulgu B1). Yazma noktası ikidir ve ikisi de çağırandır, motor değil (bulgu B-4):
  1. **Gider formu, yalnız yeni kalem kipinde:** "Vergi dairesi (stopaj)" bölümündeki
     **Stopaj vadesi** alanı, kalemin beyan döneminin ödeme tarihiyle **ön dolar**. Kullanıcı
     alana dokunmadıkça gider tarihi değiştikçe yeniden hesaplanır; dokunduktan sonra elle
     girilen değer üstündür ve aynen saklanır. **Düzenleme kipinde ön doldurma yapılmaz**, yani
     vadesi boş eski bir kayıt açılıp kaydedilince vadesi sessizce değişmez.
  2. **`tekrarlayanUret`:** `plan.stopajVade`'yi doldurur, ama değeri **çağırandan** alır
     (revizyon 3, P1): yeni isteğe bağlı seçenek `stopajVadeOf(tarih)`; tek çağıran
     (`Giderler.jsx:135`) onu `stopajDonemi.js`'ten verir. Gerekçe: `stopajDonemi.js` R4 gereği
     `gider.js`'in `ayEkleGun`'unu içe alır; `gider.js` de onu içe alsaydı döngüsel içe aktarma
     olurdu. Seçenek verilmezse bugünkü davranış birebir aynıdır. Ölçüldü: üretilen kira kalemi
     zaten satırlı doğuyor (`:1016` `odemeSatirlariKur`, bugün plan `{}`), yani değişiklik tek
     argümandır ve kaydın şeklini değiştirmez.
  `giderKalemDogrula`, `odemeSatirlariKur` ve `vadeOf` imzaları ile davranışı **değişmez**; motor
  ayar okumaz (0076 R8/C1).
- **R8.** Form alanının ipucu değişir (bulgu K-19). Bugünkü metin (`GiderForm.jsx:499`):
  "Opsiyonel. Girilmezse stopaj borç özetinde görünür, hatırlatıcıya girmez." Yeni metin ön
  doldurmayı anlatır: "Beyan döneminin ödeme tarihi dolduruldu (26.04.2026); gerekirse
  değiştirin." Stopaj taksit sayısı ≥ 2 ise bugünkü kural aynen kalır (ilk taksitin vadesi
  zorunlu, 0021) ve **ön doldurma yapılmaz**.
- **R9.** `tekrarlayanUret` ile tanımdan üretilen kira kaleminin stopaj hedefi de bu vadeyi alır.
  Bugün vadesiz doğuyor ve hatırlatıcıya hiç girmiyor; bu spec'ten sonra girer.
- **R10.** Ayar sonradan değişirse **üretilmiş kalemlerin vadesi değişmez** (0001'in stopaj oranı
  kuralıyla aynı); ayar yeni kayıtta ön doldurur. Göç yoktur. **Pencerenin dönem gruplaması ise
  canlıdır** (bulgu Ö-10): ayar üç aylıktan aylığa çevrilirse geçmiş dönemler yeniden gruplanır,
  kısmen ödenmiş bir çeyrek üç aylık satıra bölünür. Toplam açık stopaj değişmez, yalnız satır
  dağılımı değişir; bu kabul edilen davranıştır.
- **R11.** Bugünkü iki doğrulama korunur: stopaj vadesi gider tarihinden önce olamaz; taksitli
  stopajda ilk vade zorunludur.

### D. Stopaj Dönemleri penceresi ve toplu ödeme

- **R12.** Giderler başlığında, "Hatırlatma kapsamı" ve "Açık kalemler" düğmelerinin komşusu olarak
  **"Kira stopajı (N dönem açık)"** düğmesi. Düğme **yalnız Dönem Raporu görünümünde** çizilir
  (`gorunum === "rapor"`, komşularının bugünkü kapısı, `Giderler.jsx:286` ve `:294`) ve yalnız
  açık dönem varsa (N > 0). **N dönem sayar, kalem saymaz** (K-21; kartın kalem sayma kuralı R20'de
  ayrıdır). Düğme `src/components/gider/StopajDonemleri.jsx` penceresini açar (0050 Sınıf 1,
  `wide`). Pencere **dönem seçicisinden bağımsızdır** (hatırlatma kapsamının emsali): bir beyan
  dönemi üç ayı kapsadığı için seçili aya bağlanamaz.
- **R13.** Pencere dönem başına bir satır gösterir: dönem adı · kesilen stopaj · ödenen · **açık** ·
  ödeme tarihi · ödeme satırı sayısı (ödenmiş satırlar dahil, revizyon 4) · durum (ödendi / kısmen / açık / vadesi geçti). Sıra ödeme
  tarihine göre, en eski açık dönem üstte; kapanmış dönemler varsayılan olarak gizli, "Kapanmış
  dönemleri göster" ile açılır. Kapsam **borç özetiyle aynı tek kuraldan** gelir
  (`borcKapsamindaMi`: çöp, tarihsiz, yürürlük öncesi, gelecek tarihli hariç), **yalnız "tam ödenmiş
  kalem hariç" şartı uygulanmaz** (revizyon 4): stopajı ve kirası ödenmiş kalem de dönemine girer. Aksi
  hâlde dönemin kesileni eksik görünür ve "Kapanmış dönemleri göster" hiç dolmaz. Başka ek kural yoktur.
  Üç ince nokta:
  1. **Satırın ödeme tarihi hesaplanan dönem tarihidir** (bulgu Ö-11). Dönemdeki herhangi bir
     ödeme satırının kendi vadesi ondan farklıysa satırda işaret durur ("kalem vadeleri farklı");
     ödeme kipinde her satır kendi vadesini yazar. "Vadesi geçti" durumu satırın **kendi**
     vadesine, vadesi yoksa hesaplanan dönem tarihine göre belirlenir.
  2. **İçinde bulunulan, henüz kapanmamış dönem de listelenir** (bulgu Ö-12), "dönem henüz
     kapanmadı" işaretiyle, ve **ödenebilir**: motor daha kira gelip gelmeyeceğini bilemez, erken
     ödeme meşrudur, kalan sonradan ayrıca ödenir.
  3. Pencerenin **açık toplamı** `stopajOzeti(borç kapsamındaki kalemler, turMap)`'in açığıyla eşittir;
     **kesilen ve ödenen** dönemin gerçek toplamıdır (tam ödenmiş kalemler dahil, revizyon 4). Ölçüldü:
     `stopajOzeti` (`gider.js:465`) kendi kapsam süzgecini uygulamıyor, yalnız kira olmayan ve
     stopajı sıfır kalemi atlıyor; süzme çağırana aittir. Raporun kutusu kendi **ay** kapsamıyla
     çağırmaya devam eder, yani iki sayı farklı kapsamdan gelebilir (bulgu Ö-14).
- **R14.** Satırdaki **"Dönemi öde"** aynı pencerede ödeme kipini açar: dönemin açık stopaj
  **ödeme satırlarını** listeler (kalem adı, ayı, taksit sırası varsa numarası, kendi vadesi, açık
  tutar), tek **ödeme tarihi**, tek **hesap**, tek **yöntem**, tek **açıklama** (K-16) ve satır
  başına düzeltilebilir tutar. Varsayılan dağıtım her satırın tam kalanıdır; toplam ekranda
  yazılıdır. Liste kalem başına değil ödeme satırı başınadır, çünkü stopaj hedefi taksitlenebilir
  ve bir kalemin birden çok stopaj satırı aynı dönemde olabilir (bulgu Ö-7).
- **R15.** Kayıt **ödeme satırı başına bir ödeme hareketi** yazar (tek yazımda): 0024'ün "bir ödeme
  bir kalemi kapatır" kuralı **değişmez** ve her hareket bugünkü `kasa.odemeDogrula`'dan geçer.
  Her hareket o satırın `taksitId`'sini taşır; hareket nesnesinde `hedef` alanı yoktur, bağ
  `taksitId`'dir (ölçüldü, `kasa.js:409`: satırlı kalemde `taksitId` zorunlu). **Ya hep ya hiç**:
  bir satır doğrulamadan geçmezse hiçbir hareket yazılmaz, hata satırın yanında görünür.
  **Dağıtım çekirdeği paylaşılır, ama bugünkü hâliyle paylaşılabilir değil** (bulgu B-3, ölçüm
  Context'te): `cek.js`'in `dagitimHareketleri`'si dışa verilmemiş ve `hesapId: null` değerini
  sabit yazıyor, aday üreticisi `ciroAdaylari` ise yalnız ANA hedefi topluyor. Bu yüzden:
  1. Çekirdek `src/lib/kasa.js`'e taşınır ve parametreleşir (revizyon 3, P4):
     `cokKalemOdemeleri({ satirlar, adaylar, tarih, hesapId, hesaplar, yontem, aciklama, turMap, bayrak, ek })`.
     `hesaplar` eklendi (`odemeDogrula` hesabı listeden doğrular). Çekirdek **bütün** satırların
     hatalarını anahtar başına toplar (`satirHatalari`, R15'in "hata satırın yanında" şartı);
     `cek.js`'in sarmalayıcısı bugünkü gibi yalnız ilk hatalı satırın hatalarını döndürür, çeke
     özgü fark ve fark uyarısı `cek.js`'te kalır, `cekId` `ek` ile eklenir.
  2. `cek.js`'in iki plan fonksiyonu (`ciroPlani`, `kendiCekPlani`) onu çağırır; çıktıları birebir
     aynı kalır ve bunu 0040 ile 0049'un dokunulmamış testleri kanıtlar.
  3. Stopaj adayları `stopajDonemi.js`'te yeni `stopajAdaylari(kalemler, turMap, ayar)` ile
     üretilir (STOPAJ hedefinin açık ödeme satırları, dönem anahtarıyla).
- **R16.** Hareketlerin açıklaması boş bırakılırsa dönemin `odemeAciklamasi`'dır ("2026 1. dönem
  kira stopajı"), böylece Kasa'nın hareket listesinde üç satırın aynı ödemeye ait olduğu okunur.
- **R17.** Kapsam vadeye değil **beyan dönemine** bakar: vadesi boş eski stopaj hedefleri de
  listelenir. **Ama satırsız (eski) kalemin stopajı bu pencereden ödenemez** (bulgu B-1, ölçüm
  Context'te): satırı olmayan kalemde ödeme hedefe bağlanamaz, girilen tutar `HEDEF_SIRASI` ile
  önce kiraya verene sayılır. Bu yüzden satırsız kalemin stopaj hedefi dönem satırında **salt
  okunur** görünür, toplu ödemede **seçilemez** ve nedeni yazılır: "Bu kalemin ödeme satırları
  yok; kalemi bir kez kaydedin, stopaj ayrı ödenebilir hâle gelir." Dönüşüm yolu 0021 R13 ile
  0042'nin "satırsız eski kalem kaydedilince satırlar kalıcı olur" kuralıdır; bu işte otomatik
  dönüşüm yapılmaz (X8).
- **R18.** Yetki `gider_odeme`; yoksa pencere salt okunur açılır, "Dönemi öde" çizilmez. Sunucu,
  izin boyutu ve veritabanı **değişmez** (hareketler bugünkü izni istiyor). Hareket bölümü olmayan
  (güncellenmemiş) sunucuda da pencere salt okunur açılır (revizyon 3, P7; 0024 triyajının emsali).
- **R19.** Kilit (0064): toplu ödeme, dönemdeki kalemlerin `gider` kilidine anlık olarak bakar
  (`useKilitListesi`'nin `baskasiKilitli`'si); başkasının açtığı tek kalem varsa **işlem bütünüyle
  reddedilir** ve neden o kalemin adıyla yazılır (0064'ün toplu işlem kuralı). Pencere kilit
  tutmaz. Bunun için `Giderler` bileşeni **`aktifKullanici` prop'unu geri alır**: ölçüldü, prop'u
  0082 AC-34 kaldırdı ve `useKilitListesi(aktifKullanici)` (`src/hooks/useKilitListesi.js:36`) onu
  kendi kilidini ayırt etmek için istiyor. 0082'nin kriteri "iki ölü prop" olarak yeniden yazılır
  ve testinin yorumuna "spec 0084 ile güncellendi" notu girer (bulgu B-5).

### E. Hatırlatıcı ve rapor

- **R20.** Anasayfa ödeme hatırlatıcısında, **aynı vadeye ve aynı beyan dönemine** düşen stopaj
  hedefleri tek satırda toplanır: "2026 1. dönem kira stopajı · 3 kalem", tutar açık toplam, vade
  dönemin ödeme tarihi (personel satırının emsali, `tur: "stopaj"`). Kartın iki sayısı **kalem**
  saymaya devam eder (0003 AC-14 ve 0021 R14 eşitliği korunur; ölçüldü: `kalemSayilari`
  (`odemeHatirlatma.js:73`) sayıları gruplamadan **önceki** öğelerden çıkarıyor, yani eşitlik
  kendiliğinden korunur). Gruplama için `odemeHatirlatmalari`'nın seçeneklerine beyan ayarı
  eklenir (R2'nin tek okuma yolu; verilmezse varsayılan) ve **üç** çağıran güncellenir
  (revizyon 3, D3): `Dashboard.jsx` (Anasayfa), `Giderler.jsx` (hatırlatma kapsamı) ve
  `giderKasaRaporu`. Gruplama yalnız **iki ya da daha çok** stopaj hedefi aynı vade ve aynı
  dönemdeyse yapılır (P3); tek hedef bugünkü normal satır olarak kalır. Anasayfa penceresinde grup
  satırının kendi "Ödendi" düğmesi yoktur: personel satırının emsaliyle "▸ Kalemleri göster" ile
  açılır ve alt satırlar bugünkü "Ödendi" düğmesini taşır (P2). **Kira kaleminin ANA hedefi ayrı satır olarak kalır**
  (K-20): gruplama yalnız stopaj hedeflerini birleştirir, aynı kalem kiraya verene bir, vergi
  dairesine bir satırda görünmeye devam eder (bugünkü davranış). "Giderlerde Görüntüle" bugünkü
  hatırlatma kapsamını açar.
- **R21.** Aylık Gider ve Kasa Raporu iki yerde değişir:
  1. **"GİDER · STOPAJ"** kutusuna beyan dönemi tablosu eklenir: ayın kalemlerinin düştüğü
     dönem(ler) için dönem adı, kesilen, ödenen, açık ve ödeme tarihi. Kutunun bugünkü satırları
     (kesilen · ödenen · açık) **aynen kalır**, tablo boşsa basılmaz.
  2. **Vade tablolarına `stopaj` dalı eklenir** (bulgu B-2). Ölçüldü: `giderRaporu.js:121`
     `vadeSatirlari` yalnız `v.tur === "personel"` dalını biliyor, geri kalan her satır için
     `giderAySonuById.get(String(v.id))` yapıyor; gruplanmış stopaj satırının `id`'si olmadığı için
     rapor onu `tarih: null, tur: "(türsüz)"` olarak basar. Dal personel dalının emsaliyle yazılır
     (tarih yok, tür "Kira stopajı", taraf "Vergi dairesi", adet ve dönem adı). **0059'un altın
     dosyası değişmez** (revizyon 3, D2): ölçüldü, `gider-kasa-raporu-0059.test.js:170`–`:173`
     karşılaştırmadan önce `gider.vadeler` ve `gider.stopaj`'ı zaten ayıklıyor; o test dokunulmadan
     yeşil kalır, yeni dal ve dönem tablosu `tests/gider-kasa-raporu-0084.test.js`'te sabitlenir.
  Gizlilik sınırı değişmez: stopaj kira kalemine aittir, personel verisi taşımaz.
- **R22.** Borç özetindeki "Vergi dairesi" satırı ve rozetleri (0075) **değişmez**. Açık kalemler
  ekranı (0061) da değişmez: stopaj satırları bugünkü gibi hedef başına listelenir.

### F. Ortak

- **R23.** Stopaj bir ödeme kavramıdır: gider tarihi, dönem raporu toplamları, ödenmemiş gider
  kartı, KDV, kova bölmesi, makina maliyeti ve tedarikçi borcu **etkilenmez** (0021 R5'in aynısı).
  `stopajToplam` ve `stopajSatirlari` alanları değişmez.
- **R24.** Veri ayak izi sıfırdır: ayar `giderAyarlari` JSON'una, vade zaten var olan
  `gider_taksitleri.vade` sütununa (`electron/db.cjs:256`) yazılır. Yeni tablo, yeni sütun, göç ve
  merge kuralı yoktur.
- **R25.** Yeni pencere **iki kayıt listesine** eklenir, yoksa var olan iki test düşer (bulgu Ö-9):
  1. `src/lib/kilitAlanlari.js` `KILITSIZ_DOSYALAR` (`:56`), gerekçesi "toplu ödeme anlık
     denetimle (R19); pencere kilit tutmaz". `src/components/gider/` altındaki her dosya ya
     `KILIT_ALANLARI`'nda ya gerekçeli bu listede olmalıdır.
  2. `tests/ui/form-pencere-boyutu.test.jsx` `SINIF1` (`:71`, 0050 AC-15 taraması): pencere yalnız
     `wide` geçer ve `maxWidth`/`maxHeight` yazmaz.
- **R26.** Electron yerleşim düzeneğine stopajlı bir kira kalemi eklenir, **yalnız kısa dalda**
  (bulgu Ö-13). Ölçüldü: `scripts/tests/layout/donem-raporu.jsx:16` `KALEMLER`'i tek kalıptan
  üretiyor ve kira kalemi yok, yani yeni düğme o sayfada hiç çizilmez; `?uzun` dalı ise
  `scripts/tests/donem-raporu-yerlesim.cjs:99`'da tam **70 satır** iddia ediyor, bu yüzden kalem
  uzun dala eklenmez (`UZUN ? [] : [KIRA]` deseni).

---

## Constraints

### Uyulması zorunlu

- **C1.** Stopaj **ayrı gider kalemi olarak üretilmez** (0021 R7). `STOPAJ_AYRI_KALEM_NOTU`
  yerinde kalır; bu spec o notu doğrular, çürütmez.
- **C2.** `odemeHedefleri` imzası ve davranışı değişmez. Vade saklanan değerden okunur; okuma
  anında beyan döneminden vade türetilmez (bulgu B1). `giderKalemDogrula`, `odemeSatirlariKur` ve
  `vadeOf` de değişmez; vadeyi çağıranlar doldurur (R7).
- **C3.** Dönem hesabı tek yerde (`src/lib/stopajDonemi.js`): dönem anahtarı, **üç adlandırıcı**
  (R6) ve ödeme tarihi başka hiçbir dosyada hesaplanmaz; `gunSayisi` dışa verilmez ve kırpma
  ikinci kez yazılmaz (R4). Kaynak taraması bunu sabitler.
- **C4.** Toplu ödeme yeni bir ödeme modeli getirmez: hareket başına tek `giderId`, tek `taksitId`,
  `kasa.odemeDogrula`'nın bugünkü sınırları. Yeni alan (ör. "ödeme grubu kimliği") eklenmez; dönem
  bağı hareketin açıklamasında ve kalemin kendi döneminde durur.
- **C5.** Yalnız **kira** davranışının stopajı kapsamdadır. KDV tevkifatı (0075) ayrı hedef ve ayrı
  beyandır, dokunulmaz; SGK (0074) kendi kalemidir.
- **C6.** Pencere listeleri sayfalanmaz: dönem listesi yılda dört satır, bir dönemin ödeme satırı
  listesi en çok birkaç satırdır. Gerekçe `docs/tasarim-sozlugu.md`'nin "Sayfalama" bölümüne
  istisna maddesi olarak yazılır (0080'in deseni). **`tests/sayfalama-0062.test.js`'in `LISTELER`
  tablosuna kayıt eklenmez** (ölçüldü, bulgu K-18): o testin klasör taraması
  `src/components/gider/*.jsx` içinde yalnız elle pager yazılmasını yasaklıyor (`.slice((page` ve
  "Sonraki ›" dizelerini arıyor); `LISTELER` kaydı eklenirse test `usePagination` çağrısı ister,
  yani tersine sayfalama eklemeye zorlar.
- **C7.** Gizlilik: yeni pencere ve rapor tablosu çalışan adı, personel tutarı ya da kişi bazlı
  veri taşımaz; `gider-gizlilik.test.js`'in yasak listeleri gevşetilmez.
- **C8.** **Sıra ve kanıt kararı (bulgu B-6).** 0083 önce uygulanır, bu iş sonra: R12'nin düğmesi
  Giderler'in başlık satırını değiştirdiği için 0083'ün yeni çekilmiş kanıt tabanını geçersiz
  kılar (README'nin 0082'yi en sona koyarken kullandığı gerekçenin aynısı). Düğme yalnız Dönem
  Raporu görünümünde çizildiği için (R12) bilinçli değişen küme **rapor görünümünün Giderler
  ekranları** ile yeni pencere, gider formu, ayar ekranı ve hatırlatıcı ekranlarıdır; kümenin
  kendisi iş raporunun fark listesinden okunur, spec önden "bütün Giderler ekranları" demez.
- **C9.** Gider ayarı nesnesinin birebir sınandığı testler iki yeni alanla güncellenir ve koruma
  genişletilir (bulgu Ö-8): `tests/ui/gider-settings.test.jsx:83` ve `:95`
  `expect(yeni.giderAyarlari).toEqual({…})` ile **tam** nesneyi sınıyor. Aynı dosyada 0076'nın
  triyaj dersi yazılı: "oran alanı eklenirken başlangıç tarihi formun ilk durumundan düşmüş, başka
  bir alan kaydedilince 0051 eşiği sessizce siliniyordu." Bu yüzden testin 0076 triyaj bloğu
  genişletilir: dolu ayarla açılan formda yalnız beyan dönemi değiştirilip kaydedilince diğer
  bütün alanlar korunur.

### KAPSAM DIŞI

- **X1.** Muhtasar beyanname belgesi ya da beyan çıktısı üretmek. Uygulama beyan hazırlamaz,
  yalnız ne zaman ne kadar ödendiğini izler.
- **X2.** Resmî tatil ve hafta sonu kaydırması, idari uzatmalar (R5).
- **X3.** KDV tevkifatının (KDV2) beyan dönemi, SGK'nın ödeme dönemi, geçici vergi.
- **X4.** Stopajın kiraya verene göre kırılımı (iki ayrı kiralanan yerin stopajını ayrı ayrı
  beyan etmek). Vergi dairesine tek ödeme yapılıyor, dönem toplamı yeterli; istenirse ayrı iş.
- **X5.** Geçmiş kalemlerin vadesini toplu doldurmak (göç). Eski kalemler penceredeki dönem
  satırında görünür; vadesi boş kalır.
- **X6.** Stopaj oranının tarihe göre değişmesi (oran bugün kalemde saklanıyor ve ayar yeni kalemde
  ön dolduruyor, 0001; bu spec oranı hiç değiştirmez).
- **X7.** Stopaj ödemesinin çekle yapılması. Bugünkü kural (çek yalnız ANA hedefe, 0075
  `CIRO_YALNIZ_ANA_NEDENI`) aynen kalır; toplu stopaj ödemesinde çek yöntemi yoktur.
- **X8.** Ödeme akışının içinde satırsız kalemi satırlıya çevirmek. Gider kaydını yazmak demektir:
  `gider_odeme` değil `gider_edit` ister, 0064'ün kilidini ödeme penceresinin içinde devralmak
  gerekir ve kullanıcının görmediği bir kayıt değişikliği olur. Üçü de bu spec'in "yalnız ödeme
  tarafı" sınırını aşar (R17'nin salt okunur satırı bunun yerine geçer).

---

## Context

### Bugünkü mekanizma (doğrulandı, `52df9a9`)

| Ne | Yer | Bugün |
|---|---|---|
| Kira hesabı (brüt, stopaj, net, KDV) | `src/lib/gider.js:82` | `kiraHesapla`; stopaj ve KDV brüt üzerinden |
| Stopaj tutarı | `src/lib/gider.js:268`, `:277` | `stopajKurus`, yalnız kira davranışında |
| Ödeme hedefleri | `src/lib/gider.js:298`, `:382`–`:400` | `HEDEF.STOPAJ` sırası en sonda; `odemeHedefleri` tek hesap |
| Satırsız eski kalemin stopajı | `src/lib/gider.js:342`–`:351` | `{ vade: null, eski: true }`, hatırlatıcıya girmez |
| Ay ekleme ve ay sonuna kırpma | `src/lib/gider.js:314`, `:316` | `gunSayisi` modül içi, `ayEkleGun` dışa verili |
| Satır planı ve vade | `src/lib/gider.js:547`, `:565` | `vadeOf(STOPAJ) = plan.stopajVade`; taksit `planYenidenBol` |
| Planın kurulduğu yer | `src/lib/gider.js:639`, `:759` | `giderKalemDogrula`; **`giderAyarlari` almıyor** |
| Vade doğrulamaları | `src/lib/gider.js:766`–`:767` | taksitliyse ilk vade zorunlu; vade gider tarihinden önce olamaz |
| Tanımdan üretim (kira) | `src/lib/gider.js:952`, `:988`–`:995`, `:1016` | `giderAyarlari`'nı **alıyor**, oranı oradan okuyor, **vade yazmıyor**; kalem `odemeSatirlariKur` ile **satırlı** doğuyor |
| Stopaj özeti | `src/lib/gider.js:465` | `stopajOzeti`: kesilen = ödenen + açık; **kendi kapsam süzgeci yok** |
| Satırsız kalemde ödeme dağıtımı | `src/lib/gider.js:1357` | ödenen tutar `HEDEF_SIRASI` ile dağılır (ana, sonra stopaj) |
| Hedef kalanı | `src/lib/gider.js:1376` | satırsız kalemde **bütün hedeflerin** kalanı toplanır |
| Bir ödeme bir kalem, taksit bağı | `src/lib/kasa.js:400`, `:408`, `:409` | satırlı kalemde `taksitId` zorunlu |
| Çok kaleme dağıtım çekirdeği | `src/lib/cek.js:183`, `:237` | `ciroAdaylari` **yalnız ANA hedef**; `dagitimHareketleri` **dışa verilmemiş**, `hesapId: null` sabit |
| Hatırlatıcıda gruplama emsali | `src/lib/odemeHatirlatma.js:46`, `:73` | personel kalemleri tek satırda; kart sayıları gruplamadan önceki öğelerden |
| Açık kalemlerde taraf | `src/lib/acikKalemler.js:50` | stopaj ve tevkifat → `tarafTur: "vergiDairesi"` |
| Raporun stopaj kutusu | `src/lib/giderRaporu.js:101`, `:342` | `stopajOzeti` → "GİDER · STOPAJ" |
| Raporun vade tabloları | `src/lib/giderRaporu.js:121` | `vadeSatirlari`: yalnız `personel` dalı, diğerleri `v.id` ile ay sonu haritasından |
| Ayar ekranı deseni | `src/components/settings/SettingsGider.jsx:20`, `:29`–`:46` | altı alan; `kaydet` alan listesini **açıkça** yazıyor |
| Form stopaj bölümü | `src/components/GiderForm.jsx:489`–`:501` | taksit sayısı + vade; ipucu `:499` |
| "Ayrı kalem girmeyin" notu | `src/components/gider/GiderAlanlari.jsx:246` | `STOPAJ_AYRI_KALEM_NOTU` |
| Başlık düğmelerinin kapısı | `src/components/Giderler.jsx:286`, `:294` | ikisi de `gorunum === "rapor"` |
| `aktifKullanici` prop'u | `src/App.jsx` Giderler çağrısı | **yok** (0082 AC-34 kaldırdı); `Kasa.jsx:159`, `:261` kullanıyor |
| Kilit alanı kaydı | `src/lib/kilitAlanlari.js:56` | `KILITSIZ_DOSYALAR`, gerekçeli liste |
| Pencere boyutu taraması | `tests/ui/form-pencere-boyutu.test.jsx:71` | `SINIF1` listesi |
| Gider ayarı nesnesi testi | `tests/ui/gider-settings.test.jsx:83`, `:95` | `toEqual` ile **birebir** nesne |
| Yerleşim düzeneği | `scripts/tests/layout/donem-raporu.jsx:16` | `KALEMLER` tek kalıp, kira kalemi yok; `?uzun` 70 satır |
| Taksit satırının vadesi | `electron/db.cjs:254`–`:258` | `gider_taksitleri.vade` sütunu **zaten var** |

### Ölçülmüş sonuçlar

1. **Vade bugün hiç dolmuyor.** Elle girilmezse boş; tanımdan üretilen kira kaleminde her zaman
   boş. Yani üç aylık beyan tarihi uygulamada hiçbir yerde yazılı değil.
2. **Üretilen kira kalemi zaten satırlı doğuyor** (`gider.js:1016`), yani R9 tek satırlık bir
   `plan` argümanıdır ve kaydın şeklini değiştirmez (yeni alt satır, göç ya da merge kuralı yok).
3. **Satırsız kalemde stopaj ayrı ödenemez.** `odemeHedefKalaniK(kalem, dav, null)` bütün
   hedeflerin kalanını topluyor (`:1376`) ve `odemeleriUygula`'nın satırsız dalı ödemeyi
   `HEDEF_SIRASI` ile ANA'dan başlatarak dağıtıyor (`:1357`). Girilen tutar önce kiraya verene
   sayılır, yani R17'nin ödeme yolu yalnız satırlı kalemde vardır (B-1).
4. **Dağıtım çekirdeği bugünkü hâliyle paylaşılamaz.** `dagitimHareketleri` dışa verilmemiş bir
   `const` (`cek.js:237`), `hesapId: null` değerini sabit yazıyor; aday üreticisi `ciroAdaylari`
   (`:183`) `if ((t.hedef || HEDEF.ANA) !== HEDEF.ANA) continue;` ile yalnız ANA hedefi topluyor.
   Paylaşım için çekirdeğin taşınması ve yeni bir aday üreticisi gerekiyor (B-3).
5. **Raporun vade tabloları gruplanmış satırı tanımıyor.** `vadeSatirlari` (`giderRaporu.js:121`)
   yalnız `personel` dalını biliyor; `id`'si olmayan grup satırı `tur: "(türsüz)"` basılır ve
   0059'un altın dosyası bu tabloları sabitliyor (B-2).
6. **Kart sayıları kendiliğinden korunuyor.** `kalemSayilari` (`odemeHatirlatma.js:73`) sayıları
   gruplamadan önceki öğelerden çıkarıyor, yani R20'nin gruplaması 0003 AC-14 eşitliğini bozmaz.
7. **Veri ayak izi sıfır:** ayar JSON'a, vade var olan sütuna yazılır. Dört nokta kuralı, göç ve
   merge değişikliği yok. Bu spec'in riski veri tarafında değil, ekran ve ödeme akışında.

### Ödeme tarihi hesabının kurgusu (R4)

`gunSayisi` modül içi olduğu için kırpma yeniden yazılamaz; tek yol `ayEkleGun`'u dönemin **son
ayı** ve ayarlı günden kurulan bir dizeyle çağırmaktır.

| Dönem | Ayarlı gün | Ara dize | `ayEkleGun(dize, 1)` |
|---|---|---|---|
| 2026 Ocak-Mart | 26 | `2026-03-26` | `2026-04-26` |
| 2026 Ekim-Aralık | 26 | `2026-12-26` | `2027-01-26` |
| 2026 Ocak-Mart | 31 | `2026-03-31` | `2026-04-30` |
| 2026 Şubat (aylık kip) | 31 | `2026-02-31` | `2026-03-31` |

Ara dize takvimde olmayan bir güne denk gelse de fonksiyon onu yalnız aritmetikte kullanır ve
sonucu hedef ayın gün sayısına kırpar.

### Etkilenen testler (ölçüldü)

| Dosya | Durum |
|---|---|
| `tests/ui/gider-settings.test.jsx:83`, `:95` | **Güncellenir**: `toEqual` nesnesi iki yeni alanla; 0076 triyaj bloğu genişletilir (C9) |
| `tests/kilit-alanlari.test.js` | **Kayıt gerekir**: yeni pencere `KILITSIZ_DOSYALAR`'a gerekçeyle (R25/1) |
| `tests/ui/form-pencere-boyutu.test.jsx:71` | **Kayıt gerekir**: `SINIF1`'e yeni pencere (R25/2) |
| `tests/sayfalama-0062.test.js` | **Dokunulmaz**: klasör taraması elle pager'ı yasaklıyor, `LISTELER` kaydı istenmiyor (C6) |
| `tests/standart-kalkar-0082.test.js:126` (AC-34; revizyon 3: dosya düğüm testidir, `ui/` değil) | **Ters çevrilir**: "üç ölü prop" → "iki ölü prop"; yorumda "spec 0084 ile güncellendi" (R19) |
| `tests/fixtures/0059-gider-rapor-once.json` | **Dokunulmaz** (revizyon 3, D2): karşılaştırma `vadeler` ve `stopaj`'ı ayıklıyor |
| `tests/yerlesim-0083.test.js` (AC-25) | **Ters çevrilir** (D1): SHA sabitlemesi yerine 0083'ün ekran adlarının araçta durması |
| `tests/fixtures/0059-aylik-faaliyet.html` | **Dokunulmaz**: faaliyet raporu değişmez (0059'un altın dizesi) |
| `scripts/tests/layout/donem-raporu.jsx:16` | **Güncellenir**: kısa dala stopajlı kira kalemi (R26) |
| `scripts/tests/donem-raporu-yerlesim.cjs:99` | **Dokunulmaz**: `?uzun` dalı tam 70 satır istiyor, kalem uzun dala eklenmez |
| 0040 ve 0049'un çek testleri | **Dokunulmaz**: çekirdek taşınır, çıktı birebir aynı kalır (R15/2 kanıtı) |
| `tests/spec-atiflari.test.js` | `TASINACAK` bu işin planı yazılınca iki dosyasını alır, done'a taşınırken boşaltılır (K-23) |

### Bulgular (öneri kuralı 5)

**B1 · Vade türetilsin mi, yazılsın mı?** Beyan tarihi kalemin verisinden hesaplanabiliyor, yani
iki yol var.

- **(a) Karar: kayıt değeri olarak yazılır (R7, R9).** Gerekçe: `odemeHedefleri` imzasına ayar
  eklemek otuzdan fazla çağıranı ilgilendirir (borç özeti, hatırlatıcı, ekstre, Kasa, çek, rapor,
  açık kalemler); ayarı geçirmeyi atlayan tek yer **sessizce farklı vade** gösterir ve bu hata
  testlerde kolay kaçar. Ayrıca projenin yerleşik kuralı budur: ayar yeni kayıtta ön doldurur,
  üretilmiş kayıt ayar değişince değişmez (stopaj oranı, KDV oranı, indirilebilir oran böyle).
  Maliyeti: eski kalemlerin vadesi boş kalır, ama R17 onları yine listeler.
- (b) Okuma anında türetilir: eski kalemler de kendiliğinden vade kazanır ve ayar değişince bütün
  vadeler güncellenir. Maliyeti: imza değişikliğinin yayılması ve yukarıdaki sessiz tutarsızlık
  riski; ayrıca saklanan vade ile gösterilen vade iki ayrı gerçek olur.
- **QA turu eki (B-4):** yazma noktası ön doldurmadır, sessiz kayıt değil. Form yeni kalem kipinde
  alanı doldurur ve kullanıcı dokunmadıkça gider tarihiyle yeniden hesaplar; düzenleme kipinde
  doldurmaz; `tekrarlayanUret` `plan.stopajVade`'yi kendisi verir. Gerekçe: kullanıcı kaydetmeden
  önce hangi tarihin yazılacağını görür ve değiştirebilir, motor ayar okumaz (0076 R8/C1) ve
  projenin "öneri yalnız formu doldurur" deseni korunur (0051, 0074).

**B2 · Toplu ödeme tek hareket mi, satır başına hareket mi?** Kullanıcı bankadan tek tutar ödüyor.

- **(a) Karar: ödeme satırı başına hareket, tek pencereden (R15).** Gerekçe: 0024'ün "bir ödeme bir
  kalemi kapatır" kuralı bütün ödeme zincirinin (ekstre, yöntem kırılımı, kalan hesabı, taksit
  bağı) dayanağı; tek harekete çok kalem bağlamak hareket modeline yeni alan ve bütün
  tüketicilere yeni dal demek. Kullanıcı yine tek ekrandan tek kez giriyor, açıklamada dönem adı
  yazıyor (R16). Maliyeti: Kasa'nın hareket listesinde o günde üç satır görünür.
- (b) Tek hareket, çok kalem: ekranda birebir banka hareketi gibi görünür. Maliyeti: `giderId`
  tek alan olduğu için yeni bir bağ tablosu ya da dizi alanı, `odemeleriUygula`, ekstre, yöntem
  kırılımı, 0073 düzenleme ve sunucu denetiminin hepsinde yeni dal; bu spec'in on katı iş.
- **QA turu eki (Ö-7):** birim **kalem değil ödeme satırıdır**, çünkü stopaj hedefi taksitlenebilir
  ve bir kalemin birden çok stopaj satırı aynı dönemde olabilir; hareketin bağı `taksitId`'dir,
  `hedef` diye bir alan yoktur.

**B3 · Ödeme günü hafta sonuna düşerse.** Beyan tarihi (ayın 26'sı) hafta sonu ya da resmî tatile
düşerse ödeme ilk iş gününe kayar.

- **Karar: kaydırma yapılmaz (R5).** Gerekçe: resmî tatil takvimi yıl yıl veri girmek demek ve
  bu veri eskidikçe yanlış tarih üretir; vade bir hatırlatma eşiğidir, ödemeyi engellemez.
  Kullanıcı gerekirse kalemin vadesini elle değiştirir. Maliyeti: hatırlatıcı bir iki gün önce
  uyarır, bu zarar değil.
- Alternatif: hafta sonu kaydırması (yalnız Cumartesi/Pazar, tatiller hariç) eklenir. Yarı
  doğruluk üretir: resmî tatilleri bilmediği için yine elle düzeltme gerekir.

**B4 · Hatırlatıcıda gruplama (R20) şart mı?** Gruplamazsak üç aylık dönemde aynı vadeli üç satır
görünür; iki kiralanan yer varsa altı satır.

- **Karar: gruplanır (R20).** Gerekçe: ekranda tek ödeme yapılacak, tek satır okunur; personel
  satırının emsali var, kart sayıları kalem saymaya devam ediyor. Maliyeti:
  `odemeHatirlatma.js`'in satır üretiminde bir dal, iki çağıranda ayarın geçirilmesi ve
  **raporun vade tablolarında bir dal** (B-2).
- Alternatif: gruplama yok. Daha az kod, ama hatırlatıcı kalabalıklaşır ve kullanıcı "bu üç satır
  aynı ödeme mi" sorusunu kendi cevaplar.

**B5 · Rapora dönem tablosu (R21/1) şart mı?**

- **Karar: eklenir.** Gerekçe: rapor ayın stopajını zaten yazıyor; üç aylık düzende "bu ay kesilen"
  ile "ne zaman ödenecek" ayrı bilgiler ve ikincisi bugün hiçbir çıktıda yok. Maliyeti: bir tablo
  ve altın dosya güncellemesi (0059 deseni).
- Alternatif: rapora dokunmamak; kullanıcı dönem bilgisini yalnız ekranda görür.

### Plan onayı kararları (revizyon 3, Takım Yöneticisi, 2026-10-14)

| No | Karar | Nereye işlendi |
|---|---|---|
| D1 | 0083 AC-25'in SHA sabitlemesi "0083'ün ekran adları araçta duruyor" iddiasına çevrilir | Başlık tablosu, Context (etkilenen testler), DoD |
| D2 | 0059 altın dosyası değişmez (karşılaştırma vade ve stopaj alanlarını zaten ayıklıyor); yeni dal 0084 rapor testinde | R21/2, Context, DoD |
| D3 | Hatırlatıcının üç çağıranı (Dashboard, Giderler, rapor) beyan ayarını geçirir | R20 |
| P1 | `tekrarlayanUret` vadeyi `stopajVadeOf(tarih)` seçeneğiyle çağırandan alır (döngüsel içe aktarma yok) | R7/2 |
| P2 | Anasayfa penceresinde grup satırı personel emsaliyle açılır, alt satırlar "Ödendi" taşır | R20 |
| P3 | Gruplama yalnız iki ya da daha çok stopaj hedefinde; tek hedef normal satır | R20 |
| P4 | Çekirdek imzasına `hesaplar`; satır hataları anahtar başına; çek sarmalayıcısının çıktısı birebir aynı | R15/1 |
| P5 | Toplu ödeme `formOdemesi.odemeGirisiYaz` ile yazılır (0073 R20 tek yazma yolu) | Plan §3 |
| P6 | Ödeme kipinde hesap `sonKullanilanHesap`, yöntem `sonKullanilanYontem`; seçenekler çeksiz | Plan §3 |
| P7 | Hareket bölümü olmayan sunucuda pencere salt okunur, "Dönemi öde" çizilmez | R18'in eki, Plan §3 |
| P8 | "Elle değiştirildi" bilgisi yalnız formun durumunda; ön doldurma kira + stopaj > 0 + taksit sayısı 1 iken | R7/1, R8 |
| P9 | Dal `c1c5496` üstünde; kanıt önce turu orada, taban turu iki parçada | C8, Plan §4 |
| P10 | README'nin yalnız 0084 satırı ve sıra cümlesi commit'e girer | Plan §4 |

### QA turu kararları (revizyon 2, Takım Yöneticisi, 2026-10-14)

| Bulgu | Karar | Nereye işlendi |
|---|---|---|
| B-1 | Satırsız (eski) kalemin stopajı salt okunur satır olarak görünür, toplu ödemede seçilemez, nedeni yazılı; otomatik dönüşüm kapsam dışı | R17, X8, Context ölçüm 3, AC-22, AC-23 |
| B-2 | Raporun `vadeSatirlari`'na `stopaj` dalı eklenir ve 0059'un altın JSON'u yenilenir | R21/2, AC-31, Context ölçüm 5, DoD |
| B-3 | Dağıtım çekirdeği `kasa.js`'e taşınıp parametreleşir, `cek.js` onu çağırır, stopaj adayları yeni `stopajAdaylari` | R15/1–3, AC-32, Context ölçüm 4 |
| B-4 | Vade formda **ön dolar** (yeni kalem kipinde, dokunulmadıkça yeniden hesaplanır), düzenleme kipinde doldurulmaz; `tekrarlayanUret` planı doldurur; motor imzası değişmez | R7, R8, C2, AC-10, AC-11, AC-12 |
| B-5 | `aktifKullanici` prop'u `Giderler`'e geri gelir; 0082 AC-34 ters çevrilir | Başlık tablosu, R19, AC-29 |
| B-6 | Düğme yalnız Dönem Raporu görünümünde; sıra kararı 0083 önce; kanıt kümesi iş raporundan okunur | R12, C8, AC-15, DoD (kanıt maddesi) |
| Ö-7 | Birim ödeme satırıdır, hareket `taksitId` taşır, "hedef" alanı yok | R14, R15, AC-20 |
| Ö-8 | Gider ayarı nesnesinin birebir testleri güncellenir, 0076 triyaj bloğu genişletilir | C9, R1, AC-4, DoD |
| Ö-9 | Pencere `KILITSIZ_DOSYALAR` ve `SINIF1` listelerine eklenir | R25, AC-37 |
| Ö-10 | Ayar değişince pencerenin dönem gruplaması geriye dönük değişir, toplam değişmez; kabul edilir | R10, AC-13 |
| Ö-11 | Dönem satırı hesaplanan tarihi gösterir, farklı vade varsa işaret, "vadesi geçti" satırın kendi vadesinden | R13/1, AC-17 |
| Ö-12 | Henüz kapanmamış dönem de listelenir ve ödenebilir, işaretiyle | R13/2, AC-18 |
| Ö-13 | Yerleşim düzeneğinin kısa dalına stopajlı kira kalemi eklenir, uzun dal dokunulmaz | R26, AC-38 |
| Ö-14 | Pencerenin toplamı `stopajOzeti(borç kapsamındaki kalemler)` ile eşittir; raporun ay kapsamı farklıdır | R13/3, AC-16 |
| Ö-15 | Ödeme tarihi `ayEkleGun`'un dönem son ayı kurgusuyla hesaplanır; `gunSayisi` dışa verilmez, kırpma ikinci kez yazılmaz | R4, C3, Context tablosu, AC-7, AC-8 |
| K-16 | R14'ün alan listesine tek açıklama eklenir | R14 |
| K-17 | Dönem nesnesi üç adlandırıcı verir (`donemAdi`, `odemeAciklamasi`, `hatirlatmaAdi`) | R6, C3, AC-9 |
| K-18 | `LISTELER` kaydı eklenmez, klasör taraması yeterli; ölçüm yazılı | C6, Context (etkilenen testler) |
| K-19 | Form ipucunun eski ve yeni metni adıyla yazılır | R8, AC-11 |
| K-20 | Kira kaleminin ANA hedefi hatırlatıcıda ayrı satır olarak kalır | R20, AC-30 |
| K-21 | Düğmenin sayısı dönem sayar, kalem saymaz | R12, AC-15 |
| K-22 | Başlık tablosuna "Ters çevrilen kriterler" satırı eklenir | Başlık tablosu |
| K-23 | `tests/spec-atiflari.test.js` `TASINACAK` bakımı DoD'ye yazılır | DoD, Context (etkilenen testler) |

---

## Acceptance Criteria

### Ayar ve dönem hesabı

- **AC-1.** Gider Ayarları'nda beyan dönemi (`Aylık`/`Üç aylık`) ve ödeme günü alanları var;
  varsayılanları üç aylık ve 26; `gider_tanim` izni olmayan kullanıcıda pasif.
- **AC-2.** Gün 0, 32, boş olmayan metin ya da ondalık girilirse kayıt olmaz, neden yazılır ve
  diğer gider ayarları da kaydedilmez.
- **AC-3.** Ayar hiç yokken okuma yolu üç aylık + 26 verir; bozuk değer de varsayılana düşer.
- **AC-4.** Dolu ayarla açılan formda yalnız beyan dönemi değiştirilip kaydedilince diğer bütün
  gider ayarları (stopaj oranı, yürürlük ayı, hatırlatma eşiği, indirilebilir oran, hesapsız
  başlangıç, deneme dönemi bitişi) korunur; kaydedilen nesne iki yeni alanı da taşır (C9).
- **AC-5.** Üç aylık kipte 2026-02-10 tarihli kalemin dönemi "2026 1. dönem (Ocak-Mart)", ödeme
  tarihi 2026-04-26; 2026-11-05 tarihli kalemin dönemi "2026 4. dönem (Ekim-Aralık)", ödeme tarihi
  **2027-01-26**.
- **AC-6.** Aylık kipte 2026-03-31 tarihli kalemin dönemi "Mart 2026", ödeme tarihi 2026-04-26.
- **AC-7.** Ödeme günü 31 iken Ocak-Mart döneminin ödeme tarihi 2026-04-30'a kırpılır (Nisan 30
  günlük); Şubat'a düşen aylık dönem 28'e (artık yılda 29'a) kırpılır. Hesap `ayEkleGun` ile
  yapılır (R4'ün kurgusu).
- **AC-8.** Kaynak taraması: dönem anahtarı, üç adlandırıcı ve ödeme tarihi yalnız
  `src/lib/stopajDonemi.js`'te hesaplanır; bileşenlerde ikinci bir hesap yok, `gunSayisi` dışa
  verilmemiş ve ikinci bir ay sonu kırpması yazılmamış.
- **AC-9.** Dönem nesnesinin üç adlandırıcısı R6'daki metinleri verir ve pencere, hareket
  açıklaması ile hatırlatıcı satırı bu üç değerden beslenir.

### Vade

- **AC-10.** Yeni kira kalemi formunda stopaj vadesi alanı, beyan döneminin ödeme tarihiyle **ön
  dolu** açılır; gider tarihi değiştirilince (alana dokunulmadıysa) tarih yeniden hesaplanır;
  alana dokunulduktan sonra elle girilen değer korunur ve aynen saklanır.
- **AC-11.** Düzenleme kipinde ön doldurma yapılmaz: vadesi boş eski bir kalem açılıp hiçbir şey
  değiştirilmeden kaydedilince vadesi **boş kalır**. Form ipucu R8'in yeni metnini **yalnız ön dolu
  değer dururken** taşır (yeni kalem); düzenlemede ya da elle değiştirilmiş vadede bugünkü metin kalır
  (revizyon 4).
- **AC-12.** `tekrarlayanUret` ile üretilen kira kaleminin stopaj satırı vadeli doğar ve ödeme
  hatırlatıcısına girer (bugün vadesiz doğuyor ve girmiyor); kalemin satır yapısı değişmez
  (ANA + STOPAJ, bugünkü gibi).
- **AC-13.** Ayar değiştirilince var olan kalemlerin stopaj vadesi değişmez. Pencerenin dönem
  gruplaması ise yeni ayara göre yeniden kurulur ve **toplam açık stopaj aynı kalır** (yalnız satır
  dağılımı değişir).
- **AC-14.** Vade gider tarihinden önce olamaz kuralı, taksitli stopajda ilk vadenin zorunluluğu ve
  stopaj sıfıra çekildiğinde ödenmiş satırın korunması (0021) bozulmaz.

### Pencere ve toplu ödeme

- **AC-15.** "Kira stopajı (N dönem açık)" düğmesi **yalnız Dönem Raporu görünümünde** ve yalnız
  açık dönem varken çizilir; diğer dört görünümde hiç yok. N **dönem** sayar.
- **AC-16.** Pencere dönem satırlarını ödeme tarihine göre sıralar; kesilen = ödenen + açık her
  satırda tutar; toplamın açık kısmı `stopajOzeti(borç kapsamındaki kalemler, turMap)`'in açığıyla,
  kesileni tam ödenmiş kalemler dahil dönem kalemlerinin `stopajOzeti`'yle aynıdır (revizyon 4).
- **AC-17.** Dönem satırı hesaplanan dönem ödeme tarihini gösterir; dönemdeki bir ödeme satırının
  kendi vadesi farklıysa satırda "kalem vadeleri farklı" işareti çizilir; "vadesi geçti" durumu
  satırın kendi vadesine, vadesi yoksa hesaplanan tarihe göre belirlenir.
- **AC-18.** İçinde bulunulan, henüz kapanmamış dönem listelenir, "dönem henüz kapanmadı"
  işaretini taşır ve ödenebilir.
- **AC-19.** Kapanmış dönemler varsayılan olarak gizli; "Kapanmış dönemleri göster" ile listelenir.
- **AC-20.** "Dönemi öde" dönemin açık stopaj **ödeme satırlarını** açık tutarlarıyla listeler;
  kayıt **satır başına bir** hareket yazar, hepsi `tur: "odeme"`, her biri o satırın `taksitId`'si
  ile, aynı tarih ve aynı hesapla.
- **AC-21.** Bir satırın tutarı kalanı aşarsa hiçbir hareket yazılmaz, hata o satırda görünür.
- **AC-22.** Satırsız (eski) kalemin stopaj hedefi dönem satırında salt okunur görünür, toplu
  ödemede seçilemez ve nedeni ekranda yazılıdır.
- **AC-23.** Satırsız kalemin stopajına bu pencereden ödeme kaydedilemez; kalem bir kez kaydedilip
  satırlı hâle gelince aynı dönemden ödenebilir.
- **AC-24.** Açıklama boş bırakılırsa hareketlerin açıklaması dönemin `odemeAciklamasi`'dır.
- **AC-25.** Ödeme sonrası kalemlerin stopaj hedefleri "ödendi" olur, borç özetinin vergi dairesi
  satırı o kadar düşer, hesap bakiyesi toplam tutar kadar azalır.
- **AC-26.** Çöpteki kalem, yürürlük öncesi tarihli kalem ve gelecek tarihli kalem hiçbir dönemde
  sayılmaz (borç özetiyle aynı kapsam).
- **AC-27.** `gider_odeme` izni olmayan kullanıcıda pencere açılır, "Dönemi öde" çizilmez.
- **AC-28.** Dönemdeki bir kalem başka kullanıcının kilidindeyse ödeme bütünüyle reddedilir ve
  neden o kalemin adıyla bildirilir.
- **AC-29.** `Giderler` bileşeni `aktifKullanici` prop'unu alır ve kilit denetiminde kendi
  kilidini başkasının kilidinden ayırır; 0082'nin ölü prop kriteri iki prop olarak güncellenmiştir.

### Hatırlatıcı, rapor ve değişmeyenler

- **AC-30.** Aynı vadeye ve aynı döneme düşen üç stopaj hedefi hatırlatıcıda tek satırda
  ("… · 3 kalem") görünür; aynı kira kaleminin ANA hedefi **ayrı** satır olarak kalır; kartın
  vadesi geçmiş ve yaklaşan sayıları kalem saymaya devam eder.
- **AC-31.** Raporun vade tabloları gruplanmış stopaj satırını kendi dalıyla basar (tarih yok, tür
  "Kira stopajı", taraf "Vergi dairesi", adet ve dönem adı); "(türsüz)" satır üretilmez ve 0059'un
  altın dosyasındaki tek değişiklik bu satırlardır.
- **AC-32.** Dağıtım çekirdeği `kasa.js`'e taşınmıştır ve `cek.js`'in iki plan fonksiyonu onu
  çağırır; 0040 ile 0049'un testleri dokunulmadan yeşildir (çıktı birebir aynı).
- **AC-33.** Raporun "GİDER · STOPAJ" kutusunun bugünkü üç satırı birebir aynı; dönem tablosu
  eklenir, ayın kalemi yoksa kutu ve tablo hiç basılmaz.
- **AC-34.** Gizlilik taramaları yeşil: yeni pencere ve rapor tabloları personel verisi taşımaz.
- **AC-35.** Çapraz kontrol: dönem raporunun toplam gideri, ödenmemiş gider kartı, KDV
  karşılaştırması, kova dağılımı ve makina maliyeti bu spec'ten **etkilenmez** (aynı veriyle
  önce/sonra birebir aynı).
- **AC-36.** Tedarikçi borcu ve tedarikçi ekstresi stopajı içermez (0021 R8 aynen).
- **AC-37.** Yeni pencere `KILITSIZ_DOSYALAR`'da gerekçesiyle ve `SINIF1`'de kayıtlıdır; iki
  tarama testi yeşildir ve pencere yalnız `wide` geçer.
- **AC-38.** Electron yerleşim testinde Dönem Raporu sayfası stopajlı kira kalemiyle çizilir, yeni
  düğme görünür ve başlık satırı 1280 ile 1024 px'te taşmaz; `?uzun` dalı yine tam 70 satırdır.
- **AC-39.** Kaynak taraması: `electron/`, `src/lib/merge.js` ve veritabanı şeması değişmemiştir.

---

## Definition of Done

- [ ] R1–R26 uygulanmış; dönem hesabı tek saf modülde, toplu ödeme taşınmış dağıtım çekirdeğiyle,
      vade formda ön dolarak.
- [ ] AC-1…AC-39 testlerle karşılanmış: `tests/stopaj-donemi-0084.test.js` (motor, dönem ve vade,
      TZ sabitli), `tests/ui/stopaj-donemi-0084.test.jsx` (pencere, toplu ödeme, satırsız kalemin
      salt okunur satırı, izin, kilit), `tests/gider-kasa-raporu-0084.test.js` (rapor kutusu ve
      vade tabloları), ek bloklar `gider.test.js` (tekrarlayan üretim), `odeme-hatirlatma.test.js`
      (gruplama), `ui/gider-form` (ön doldurma), `ui/gider-settings` (ayar ve C9'un koruması),
      `gider-gizlilik.test.js`, `cek.test.js` ve `cek-0049.test.js` (çekirdek taşıma, dokunulmadan
      yeşil).
- [ ] Önce/sonra kanıtı: stopajlı veriyle motor çıktısı (dönem raporu, kova, maliyet) bu spec'ten
      önceki kodla birebir aynı (`tests/fixtures/0084-stopaj-once.json`).
- [ ] 0059'un altın rapor dosyası ve `0059-aylik-faaliyet.html` dokunulmamış, 0059 testi
      dokunulmadan yeşil (D2); gruplanmış stopaj satırı ve dönem tablosu 0084 rapor testinde.
- [ ] 0083'ün AC-25 testi ekran adları iddiasına çevrilmiş, yorumunda bu spec'e atıf var (D1).
- [ ] 0082'nin ölü prop kriteri (AC-34) iki prop olarak güncellenmiş, yorumunda bu spec'e atıf var.
- [ ] Yeni pencere `src/lib/kilitAlanlari.js` `KILITSIZ_DOSYALAR`'a gerekçesiyle ve
      `tests/ui/form-pencere-boyutu.test.jsx` `SINIF1`'e eklenmiş (R25).
- [ ] `scripts/tests/layout/donem-raporu.jsx`'in kısa dalına stopajlı kira kalemi eklenmiş, uzun
      dal dokunulmamış; Electron yerleşim testi yeşil.
- [ ] `npm test` ve `npm run lint` yeşil; Electron testleri koşulmuş.
- [ ] Görsel kanıt: 0083 uygulandıktan **sonra** çekilmiş (C8); bilinçli değişen küme iş raporunun
      fark listesinden okunmuş ve `beklenen: "degisti"` + onay satırıyla, değişen ekranın kaydı
      olan her dosyaya yazılmış; `docs/evidence/0084-*` ve `kanit-eslemesi.json` güncel.
- [ ] `docs/tasarim-sozlugu.md`'de sayfalama istisnası (C6) yazılı.
- [ ] `CLAUDE.md`'nin gider bölümüne beyan dönemi mekanizması ve satırsız kalemin bilinen sınırı
      eklenmiş.
- [ ] `specs/README.md` güncel; `tests/spec-atiflari.test.js` `TASINACAK` listesi bu işin iki
      dosyasıyla doldurulmuş ve done'a taşınırken boşaltılmış (K-23).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu**, kanıt eşlemesindeki `degisti` kayıtları `ayni`ye çevrildi
      (`kanit-eslemesi.test.js`, 0011 AC-11c) ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

Uygulama bittiğinde doldurulur.
