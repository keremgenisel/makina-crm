# 0067 — Giderler'de Kutu Düzeni ve Müşteri Detayından Maliyet Kutusunun Kaldırılması

| | |
|---|---|
| **Durum** | Onaylandı · uygulamada |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler > Dönem Raporu (kutu sırası), müşteri detay modalı (maliyet ve kâr kutusu) |
| **Bağımlı spec'ler** | 0002 (maliyet kutusunun doğuşu) · 0009/0011 (görsel kanıt kuralı) · 0016 (denetimli katlanan kart sözleşmesi) · 0020 (gizlilik kaynak taraması) · 0050 (kutunun katlanır ve varsayılan kapalı hâli) · 0061 (açık kalemler kipi) · 0062 (kalem listesinde sayfalama) |
| **Revizyon** | R1 (QA turu, 2026-10-02): geliştirici hazırlığı denetimi, 16 bulgu işlendi, 4'ü bloklayıcıydı. Kutunun kaldırılmasının bugün yeşil **üç testi** kırdığı bulundu (R12), hatırlatma kipinde borç özetinin hiç olmadığı ölçüldü (R5), **iki ayrı boş durumun** farklı davrandığı görüldü (R4) ve etkilenen kanıt kayıtlarının hepsinin `ayni` olduğu tespit edildi (R13). R12–R18, C6 ve AC-15…AC-30 eklendi.<br>**R3 (2026-10-02, uygulama):** R25 (`rapor.bos` dalı borç özetini zaten çiziyor; R4, AC-6, AC-29 düzeltildi). **R2 (2026-10-02, plan onayı):** bütün öneriler kabul (Q1–Q6): kanıt listesi tam çekimle belirlenir, R13'ün elle listesi düzeltildi (R19), görüntü aracındaki iki maliyet kutusu ekranı yerine kutusuz detay ekranı (R20), `BorcOzeti` her yerde içeriği kadar ve tam genişlik (R21), `rates` CustomerDetailModal'dan da çıkar (R22), `liste-kaynak` sayısı 4 → 3 (R23), rakamların aynılığının ölçüsü (R24). AC-31…AC-35. |

---

## Intent

İki ayrı görünüm isteği, ikisi de salt düzen:

1. **Giderler > Dönem Raporu'nda sıra yanlış.** Ekranın asıl içeriği olan **gider kalemleri listesi en
   altta**, makina maliyet kovaları ve kırılım kartları onun üstünde. Kullanıcı her girişte kartları
   geçip aşağı kaydırıyor. Kalem listesi kovaların üstüne çıkmalı, **"Kime Ne Kadar Borçluyuz" kutusu da
   listenin hemen altına** gelmeli.
2. **Müşteri detayındaki "Maliyet ve Kâr" kutusu kalkmalı.** Maliyet ve kârlılık Giderler >
   Makina Kârlılığı'nda zaten var; müşteri detayında ikinci bir yer tutmasına gerek kalmadı.

İkisi aynı sınıf iş: hiçbir hesap, alan, izin ya da sunucu davranışı değişmiyor, yalnız ne nerede
çiziliyor değişiyor. Bu yüzden tek spec.

---

## Requirements

### A. Dönem Raporu'nun kutu sırası

- **R1.** Yeni sıra: özet kartları → **gider kalemleri listesi** → **"Kime Ne Kadar Borçluyuz"** →
  makina maliyet kovaları → kalan kırılım kartları.
- **R2.** Kalan kartların kendi içindeki bugünkü sırası ve yan yana yerleşimi korunur; yalnız borç özeti
  bulunduğu satırdan çıkar ve o satır kalan kartlarıyla devam eder. İki yerleşim ayrıntısı yazılıdır:
  **(a)** borç özeti bugün `flex: "2 1 300px"` ile satır içi bir karttır; listenin altında **tam genişlik**
  (kendi satırı) çizilir, yoksa 300 px'lik bir kart ekranın solunda yalnız kalır.
  **(b)** kart sayısı üçten ikiye düştüğü için kalan iki kartın genişliği değişir; yerleşim **Electron'da**
  ölçülür (1280 ve 1024 px'te taşma ve üst üste binme yok; `suzgec-yerlesim.test.js` ve
  `form-pencere-yerlesim.test.js` emsali, jsdom yerleşim yapmaz).
- **R3.** Kalem listesinin süzgeçleri, sayfalaması ve alt toplamı değişmez (0062'nin sayfalaması olduğu
  gibi çalışır).
- **R4.** **İki boş durum dalı var ve ikisi de bugünkü hâliyle kalır:** `rapor.yururlukOncesi` dalında
  `BosDurum` + `BorcOzeti`; `rapor.bos` dalında da `BosDurum` + `BorcOzeti` (`{rapor.bos && <BorcOzeti … />}`). İki dal
  borç özetini **birlikte** çizer; bu iş ikisine de dokunmaz (X3: bu iş yalnız sıra). *(R25 düzeltmesi: QA turundaki
  "`rapor.bos` dalında yalnız `BosDurum`" tespiti yanlıştı.)*
- **R5.** "Hatırlatma kapsamı" ve "açık kalemler" kiplerindeki bugünkü düzen değişmez. **Emsal yalnız
  açık kalemler kipidir** (QA turu düzeltmesi): orada `AcikKalemler` → `BorcOzeti` sırası var ve yeni sıra
  normal kipi ona benzetir. **Hatırlatma kipinde borç özeti bugün HİÇ YOK** (yalnız `UyariSeridi` +
  `KalemListesi`) ve bu işle **eklenmez**; bu iş sıra işidir, yeni kart koymaz.

### B. Müşteri detayındaki maliyet kutusu

- **R6.** Müşteri detay modalındaki "Maliyet ve Kâr" kutusu **kaldırılır**.
- **R7.** Aynı bileşen **Giderler > Makina Kârlılığı'nda kalır**; maliyet hesabı, motor ve oradaki detay
  görünümü değişmez.
- **R8.** Kutunun açık/kapalı durumunu bu bilgisayarda tutan yerel tercih ve onu okuyan/yazan kod
  temizlenir; artık kullanılmayan yardımcılar bırakılmaz. Yerler: `CustomerDetailModal.jsx:487-488`
  (`maliyetAcik` durumu ve `maliyetDegis`) ile `:1071-1073` (kutu ve `MakinaMaliyetDetay` çağrısı).
  **Prop zinciri de temizlenir, ama seçerek:** kutu kalkınca `makinaMaliyet` müşteri detayında
  kullanılmaz hâle gelir ve App → Customers → CustomerDetailModal zincirinden çıkarılır; **`rates`
  kalır** (0002 R12'nin satış kuru alanı onu okuyor) ve App'teki `makinaMaliyet` memo'su Giderler için
  **korunur**.
- **R9.** Görüntü aracının her sayfada bu tercihi silen adımı gereksizleşir ve kaldırılır: yalnız
  `scripts/evidence/0009-sayfa.jsx:451-453` (`localStorage.removeItem("maliyetKutusuAcik")` ve yorumu).
  **Komşu ekranlar kalır:** aynı dosyadaki `maliyet-detay-personel`, `maliyet-detay-parti-acik` ve
  `maliyet-detay-parti-kapali` ekranları `MakinaMaliyetDetay`'ı doğrudan çiziyor, müşteri detayı üzerinden
  değil; silinmezler.
- **R10.** Müşteri detayının geri kalanı (alan ızgarası, sahiplik geçmişi, makina geçmişi, öteki
  katlanan kartlar) değişmez; kutunun yerinde boşluk kalmaz.
- **R11.** **0050'nin kararı bu spec'le geri alınır:** kutu artık "varsayılan kapalı katlanan kart"
  değil, müşteri detayında hiç yok. **Not nereye yazılır:** `specs/done/0050-*.md`'nin maliyet kutusu
  maddelerine ve ilgili kabul kriterlerine (varsayılan kapalı, `maliyetKutusuAcik` tercihi, AC-12) tarihli
  not düşülür; **0016**'nın denetimli katlanan kart maddesine de aynı not girer (R12 a). Emsal: 0020'nin
  "spec-atiflari TASINACAK" deseni ve 0055'in 0047 AC-39/AC-57'ye düştüğü not.

### C. QA turunda eklenenler (R1)

- **R12.** **Kutunun kaldırılması bugün yeşil olan üç testi kırar; üçü de adıyla ele alınır.**
  **(a)** `tests/liste-kaynak.test.js:116` kutunun JSX'ini birebir sabitliyor (0016'nın denetimli katlanan
  kart sözleşmesi): o satır taramadan çıkarılır ve 0016'ya tarihli not düşülür (R11).
  **(b)** `tests/ui/customer-maliyet-kutusu.test.jsx` baştan sona bu kutuyu sınayan bir dosyadır
  (0002 ve 0050 kriterleri, `maliyetKutusuAcik` dahil): **silinir**, çünkü kapsamı tamamen bu kutudur.
  **(c)** `tests/gider-gizlilik.test.js:50-51` `CustomerDetailModal.jsx`'te `makinaKarlilik(` geçen satır
  sayısını **bire** sabitliyor ve o satırın `<MakinaMaliyetDetay detay={makinaKarlilik(` içermesini
  istiyor (0020'nin gizlilik güvencesi): iddia **tersine çevrilir**, satır sayısı **0** olur. Yani
  `CustomerDetailModal.jsx` `makinaKarlilik`'i hiç çağırmaz; bu bilinçli olarak **daha güçlü** bir
  gizlilik güvencesidir ve testin yorumunda böyle yazılır.
- **R13.** **Etkilenen kanıt kayıtları adıyla ele alınır; hepsi bugün `ayni` (0 piksel).**
  `CustomerDetailModal.jsx`: `musteri-detay`, `musteri-detay-bolumler`, `musteri-detay-bos`,
  `musteri-detay-yeni-sahip`, `musteri-detay-tahsis`. `DonemRaporu.jsx` ve `Giderler.jsx`:
  `giderler-rapor`, `giderler-rapor-personel-acik`. Her biri `beklenen: "degisti"` + `onay`
  (`Takım Yöneticisi · YYYY-AA-GG · spec 0067 R1/R6`) alır ve spec `done`'a taşınırken `ayni`ye çevrilir
  (0009/0011 kuralı). Yazılmazsa `tests/kanit-eslemesi.test.js` ve `tasarim-kaynak.test.js` 0 piksel
  bekleyip kırmızı döner.
- **R14.** `tests/ui/makina-karliligi.test.jsx:71`'deki `localStorage.setItem("maliyetKutusuAcik", "0")`
  satırı ve "müşteri detayındaki tercih buraya uygulanmaz" yorumu kaldırılır; `:75`'teki
  `queryByTestId("maliyet-kar-kutusu")` null iddiası **kalır** (artık hiçbir yerde olmadığını da doğrular).
- **R15.** **Kaynakta `maliyetKutusuAcik` dizesi hiç geçmez** (kaynak taraması); R8'in temizliği bununla
  ölçülür.
- **R16.** **AC-5'in ölçüsü:** `KalemListesi`'ne geçen props birebir aynıdır (diff yalnız JSX konumunda) ve
  mevcut `ui/giderler` ile 0062 sayfalama testleri **dokunulmadan** yeşil kalır.
- **R17.** **AC-14'ün ölçüsü:** kutu bugün `giderYetki` kapısının arkasındadır, yani gider yetkisi olmayan
  kullanıcı onu **zaten** görmüyordu; ölçü `makinaMaliyet` prop'u boşken müşteri detayının render'ının
  değişmemesidir.
- **R18.** **Kutunun yerinde boşluk kalmaz:** kutu `style={{ marginBottom: 16 }}` taşıyor; kaldırılırken o
  boşluk da gider ve üstündeki ile altındaki bölüm arasında fazladan aralık oluşmaz. Ölçü piksel kanıtıdır
  (R13).

### D. Plan onayında eklenenler (R2)

- **R19.** **R13'ün elle yazılmış ekran listesi düzeltilir.** Saydığı beş müşteri detayı ekranı görüntü aracında gider
  yetkisi ve `makinaMaliyet` olmadan açılır, kutuyu zaten çizmez; kutuyu çizen `musteri-detay-maliyet-kapali` /
  `-acik` listede yoktu. Sıra değişikliği ise normal Dönem Raporu'nu çizen bütün ekranları değiştirir. Kanıt **tam
  önce/sonra çekimiyle** belirlenir: gerçekten değişen her ekran `0067-piksel-raporu.json`'a `beklenen: "degisti"` +
  TY onayıyla bağlanır, değişmeyenler `ayni`. (Kayıt yazılmasa testlerin kırmızı döneceği iddiası da yanlıştı: testler
  eski raporları okur, ekranı yeniden çizmez.)
- **R20.** **Görüntü aracındaki `musteri-detay-maliyet-kapali` ve `-acik` ekranları ile `MALIYET_0050` sabiti
  silinir**; yerine `musteri-detay-0067` gelir (gider yetkisi ve maliyet verisiyle açılan, kutusuz detay; AC-8, AC-14'ün
  görsel kanıtı). 0050 raporlarına bağlı eski kayıtları tarihçe olarak kalır.
- **R21.** **`BorcOzeti` her yerde içeriği kadar ve tam genişlik çizilir:** bileşenin kendi `flex: "2 1 300px"` stili
  kaldırılır (sütun yönlü kapta 300 px yükseklik tabanı demekti; değişiklikten sonra kart hiçbir yerde satır içinde
  değil). Açık kalemler ve `yururlukOncesi` ekranlarında yükseklik değişirse kanıtta görünür ve onaya girer; sıra (R5)
  değişmez.
- **R22.** **`rates` CustomerDetailModal'dan da çıkar:** satış kuru `Customers.jsx`'te okunur; App → Customers geçişi
  kalır, Customers → CustomerDetailModal'daki `rates` ve `makinaMaliyet` ikisi de kalkar (R8'in "kullanılmayan
  bırakılmaz" kuralı). `ui/customers-satis-alanlari` dokunulmadan yeşil kalır.
- **R23.** **`liste-kaynak.test.js`'te `KartBolum` sayısı 4 → 3** olur ve yorum güncellenir (R12 a'ya ek; yapılmazsa test
  kırılır).
- **R25.** **R4 düzeltmesi (uygulamada bulundu, 2026-10-02):** `rapor.bos` dalı da borç özetini **çiziyor**
  (`Giderler.jsx` `{rapor.bos && <BorcOzeti ozet={borc} />}`); R4'ün "yalnız `BosDurum`" iddiası yanlıştı. Bugünkü hâl
  korunur (bu iş yalnız sıra). R4, AC-6, AC-29 ve Context bu bilgiye göre doğrudan düzeltildi (triyaj); X7
  zaten yapılmış olanı kapsam dışı sayıyordu ve geçersiz işaretlendi.
- **R24.** **Rakamların aynılığının ölçüsü:** motor dosyalarının `git diff`'i boş; yeni testte aynı veriyle motor ve
  kart çıktıları sabit beklenen değerlerle karşılaştırılır; mevcut motor testleri dokunulmadan yeşil kalır.

---

## Constraints

- **C1.** Hiçbir hesap değişmez: maliyet motoru, kârlılık özeti ve gider raporu aynı sonucu üretir.
- **C2.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C3.** Maliyet verisinin görünürlük kapısı değişmez (gider yetkisi olmayan kullanıcı maliyeti hiçbir
  yerde görmez).
- **C4.** Kutular tasarım sözlüğünün bugünkü yapı taşlarıyla çizilmeye devam eder; yeni bir kart tipi
  üretilmez.
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** **Mevcut testler gelişigüzel gevşetilmez:** R12'nin üç testi ya adıyla kaldırılır (b) ya da
  iddiası **daraltılmak yerine güçlendirilir** (c); kalan gizlilik ve sözleşme taramaları yerinde kalır.

### KAPSAM DIŞI

- **X1.** Giderler > Makina Kârlılığı'ndaki maliyet detayının kaldırılması — *neden:* maliyet orada
  anlamlı, istenen yalnız müşteri detayından çıkarılması.
- **X2.** Maliyet hesabının, kova dağıtımının ya da kârlılık metriklerinin değişmesi — *neden:* C1.
- **X3.** Dönem Raporu'ndaki kartların içeriğinin değişmesi (yeni rakam, yeni kırılım) — *neden:* bu iş
  yalnız sıra.
- **X4.** Kutu sırasının kullanıcı tarafından ayarlanabilmesi — *neden:* tek doğru sıra var, ayar
  gereksiz karmaşıklık.
- **X5.** Müşteri detayında maliyet yerine bir "Giderler'de görüntüle" bağlantısı konması — *neden:*
  istenmedi; gerekirse ayrı ve küçük bir iştir.
- **X6.** Hatırlatma kipine borç özeti eklenmesi — *neden:* R5; bugün yok ve bu iş yeni kart koymaz.
- **X7.** *(Geçersiz, R25.)* "`rapor.bos` dalına borç özeti eklenmesi" kapsam dışı sayılmıştı; dal borç özetini zaten
  çiziyor, eklenecek bir şey yok.
- **X8.** Görüntü aracındaki `maliyet-detay-*` ekranlarının silinmesi — *neden:* R9; onlar bileşeni
  doğrudan çiziyor ve bileşen kalıyor.

---

## Context

- **Bugünkü sıra (doğrulandı).** Dönem Raporu şu sırada çiziliyor: beş özet kartı, makina maliyet
  kovaları kartı, tür kırılımı + KDV karşılaştırması, tedarikçi kırılımı + ödeme yöntemi kırılımı +
  borç özeti, en sonda gider kalemleri listesi. Yani ekranın en çok bakılan tablosu en altta.
- **İstenen sıra zaten bir kipte var.** 0061'in "açık kalemler" kipinde liste üstte ve borç özeti hemen
  altında çiziliyor. Yani bu iş normal kipi o kiple **tutarlı** hâle getiriyor, yeni bir düzen icat
  etmiyor. Aynı şey hatırlatma kapsamı kipi için de geçerli.
- **Borç özeti bugün bir satırın üçüncü kartı.** Tedarikçi kırılımı ve yöntem kırılımıyla yan yana
  duruyor; listenin altına alınırken o satırın iki kartla kalacağı ve genişliklerin buna göre oturacağı
  hesaplanmalı (R2). Tek gerçek yerleşim ayrıntısı bu.
- **Maliyet kutusunun geçmişi.** Kutu 0002 ile müşteri detayına kondu (Giderler'deki detayla **aynı
  bileşen**), 0050 ile kullanıcının isteğiyle katlanır ve varsayılan kapalı yapıldı; durumu bu
  bilgisayarda yerel bir tercihte tutuluyor ve görüntü aracı her sayfada o tercihi siliyor. Şimdi kutu
  bütünüyle kaldırılıyor; yani 0050'nin o yarısı geri alınıyor (R11) ve yanında getirdiği yerel tercih
  ile araç adımı da gereksizleşiyor (R8, R9). Bu iki temizliği yazmazsak kullanılmayan kod ve anlamsız
  bir test adımı geride kalır.
- **QA turu: üç test kutuya bağlı.** 0016'nın kaynak taraması kutunun JSX'ini, 0002/0050'nin test dosyası
  kutunun davranışını, 0020'nin gizlilik taraması ise `CustomerDetailModal.jsx`'te `makinaKarlilik(`
  satırının **bir** olmasını sabitliyor. Üçü de bu işte ele alınmalı; (c) tersine çevrilince gizlilik
  güvencesi güçlenir (R12).
- **QA turu: iki kipin ikisi de emsal değil.** Açık kalemler kipinde `AcikKalemler` → `BorcOzeti` sırası
  var, ama hatırlatma kipinde borç özeti hiç yok. Spec'in "aynı şey hatırlatma kipi için de geçerli"
  cümlesi düzeltildi (R5).
- **İki boş durum dalı.** `yururlukOncesi` ve `rapor.bos` dallarının ikisi de borç özetini çiziyor; ikisi de bugünkü
  hâliyle korunur (R4, R25 ile düzeltildi; QA turu `rapor.bos` dalının çizmediğini sanmıştı).
- **Kaldırma güvenli.** Bileşen Giderler > Makina Kârlılığı'nda da kullanılıyor, yani kaldırılan şey
  yalnız müşteri detayındaki **çağrı yeri**; bileşenin kendisi ve maliyet motoru yerinde kalır.

---

## Acceptance Criteria

### Sıra

- **AC-1.** Dönem Raporu'nda gider kalemleri listesi makina maliyet kovaları kartından **önce** çizilir.
- **AC-2.** "Kime Ne Kadar Borçluyuz" kutusu kalem listesinin hemen altındadır.
- **AC-3.** Özet kartları en üstte kalır.
- **AC-4.** Kalan kırılım kartlarının kendi sırası korunur ve borç özetinin çıktığı satır iki kartla
  düzgün yerleşir; **ölçü Electron'da** 1280 ve 1024 px'te taşma ve üst üste binme olmamasıdır (R2 b).
- **AC-5.** Kalem listesinin süzgeçleri, sayfalaması ve alt toplamı bu işten önce ve sonra aynıdır; ölçü
  `KalemListesi` props'unun birebir aynı olması ve `ui/giderler` ile 0062 testlerinin dokunulmadan yeşil
  kalmasıdır (R16).
- **AC-6.** **İki boş durum da** bugünkü hâliyle kalır: `yururlukOncesi` ve `rapor.bos` dallarının ikisinde de borç
  özeti çizilir (R4, R25).
- **AC-7.** Açık kalemler kipinin düzeni değişmez; hatırlatma kipinde borç özeti **yoktur ve eklenmez**
  (R5).

### Maliyet kutusu

- **AC-8.** Müşteri detay modalında "Maliyet ve Kâr" kutusu yoktur.
- **AC-9.** Giderler > Makina Kârlılığı'ndaki maliyet detayı aynen çalışır.
- **AC-10.** Maliyet ve kârlılık rakamları bu işten önce ve sonra aynıdır.
- **AC-11.** `maliyetKutusuAcik` dizesi kaynakta hiç geçmez ve onu okuyan/yazan kod kalmaz (R15).
- **AC-12.** Görüntü aracında o tercihi silen adım kalmaz; `maliyet-detay-*` ekranları **kalır** (R9).
- **AC-13.** Müşteri detayının öteki bölümleri ve katlanan kartları değişmez; kutunun `marginBottom`'u da
  gittiği için üstündeki ve altındaki bölüm arasında fazladan boşluk kalmaz (R18).
- **AC-14.** Gider yetkisi olmayan kullanıcı kutuyu **zaten** görmüyordu; `makinaMaliyet` prop'u boşken
  müşteri detayının render'ı bu işten önce ve sonra aynıdır (R17).

### QA turunda eklenenler (R1)

- **AC-15.** `tests/liste-kaynak.test.js`'teki maliyet kutusu satırı kaldırılmıştır ve 0016'ya tarihli not
  düşülmüştür (R12 a, R11).
- **AC-16.** `tests/ui/customer-maliyet-kutusu.test.jsx` silinmiştir (R12 b).
- **AC-17.** `tests/gider-gizlilik.test.js` artık `CustomerDetailModal.jsx`'te `makinaKarlilik(` geçen
  **sıfır** satır bekler ve bu iddia yeşildir (R12 c).
- **AC-18.** `CustomerDetailModal.jsx` `makinaKarlilik`'i hiç çağırmaz ve `MakinaMaliyetDetay`'ı içe
  almaz (R12 c).
- **AC-19.** `MakinaMaliyetDetay` ve maliyet motoru kaynakta durur; Giderler > Makina Kârlılığı'ndaki
  çağrısı değişmez (R7).
- **AC-20.** `makinaMaliyet` prop'u App → Customers → CustomerDetailModal zincirinden çıkarılmıştır;
  `rates` kalmıştır ve satış kuru alanı çalışır (R8).
- **AC-21.** App'teki `makinaMaliyet` memo'su Giderler için korunmuştur (R8).
- **AC-22.** `tests/ui/makina-karliligi.test.jsx`'teki `maliyetKutusuAcik` kurulumu kaldırılmış, null
  iddiası korunmuştur (R14).
- **AC-23.** Borç özeti listenin altında **tam genişlik** çizilir (R2 a).
- **AC-24.** `specs/done/0050-*.md`'nin ilgili maddelerine ve kriterlerine tarihli not düşülmüştür (R11).
- **AC-25.** Tam önce/sonra çekiminde değişen her ekran `0067-piksel-raporu.json`'a `beklenen: "degisti"` + onayla
  bağlanır; değişmeyenler `ayni` (R19; R13'ün elle yazılmış yedi kayıtlık listesi yerine).
- **AC-26.** `tests/kanit-eslemesi.test.js` ve `tasarim-kaynak.test.js` yeşildir (R13).
- **AC-27.** Maliyet motoru ve kârlılık özeti dosyaları bu işte değişmemiştir (C1).
- **AC-28.** Dönem Raporu'ndaki kartların içeriği (rakamlar, kırılımlar) değişmemiştir (X3).
- **AC-29.** Hatırlatma kipinde borç özeti yoktur (X6); `rapor.bos` dalında bugünkü gibi vardır (R25).
- **AC-30.** `CLAUDE.md`'nin 0002 bölümündeki "müşteri detayında Maliyet ve Kâr kutusu (iki yer AYNI
  bileşen)" cümlesi ve 0050 bölümündeki maliyet kutusu paragrafı güncellenmiştir.

### Plan onayında eklenenler (R2)

- **AC-31.** Kanıt tam çekimle alınmış, değişen her ekran `0067` raporuna `degisti` + onayla bağlanmıştır (R19).
- **AC-32.** Görüntü aracında `musteri-detay-maliyet-*` ekranları ve `MALIYET_0050` yoktur; `musteri-detay-0067`
  vardır (R20).
- **AC-33.** `BorcOzeti` `flex` stili taşımaz; her yerde tam genişlik çizilir (R21).
- **AC-34.** CustomerDetailModal `rates` ve `makinaMaliyet` prop'u almaz; satış kuru çalışır (R22).
- **AC-35.** `liste-kaynak.test.js` `KartBolum` sayısı 3'tür (R23).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kaynak taraması kaldırılan yerel tercihin ve ölü kodun kalmadığını doğruluyor (AC-11, AC-18).
- [ ] R12'nin üç testi ele alındı: 0016 taramasından satır çıkarıldı, `ui/customer-maliyet-kutusu.test.jsx`
      silindi, 0020'nin gizlilik iddiası **sıfır satır** olarak güçlendirildi (AC-15, AC-16, AC-17).
- [ ] `specs/done/0050-*.md` ve 0016'nın ilgili maddelerine tarihli not düşüldü (R11, AC-24).
- [ ] `makinaMaliyet` prop zinciri temizlendi, `rates` korundu, App'teki memo yerinde (AC-20, AC-21).
- [ ] Maliyet ve kârlılık rakamlarının değişmediği çapraz testle gösterildi (AC-10, AC-27).
- [ ] İki boş durumun ve iki kipin düzeni testle sabitlendi (AC-6, AC-7, AC-29).
- [ ] Kart satırının yerleşimi **Electron'da** 1280 ve 1024 px'te ölçüldü (AC-4).
- [ ] Görsel kanıt eklendi (`docs/evidence/0067-*.jpg` + `0067-piksel-raporu.json`, yeni taban): yeni kutu
      sırası ve maliyet kutusu olmayan müşteri detayı. Tam çekimde değişen her ekran (Dönem Raporu'nu çizen Giderler
      ekranları, borç özeti yüksekliği değişen boş durum / yürürlük öncesi / uygulama menüsü ekranları,
      `musteri-detay-0067`) `beklenen: "degisti"` + onay aldı ve `done`'a taşınırken `ayni`ye çevrilecek; R13'ün saydığı
      beş müşteri detayı ekranı 0 piksel kaldı ve `ayni` kaydedildi (R19, AC-25, AC-26).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: Dönem Raporu'nun kutu sırası; 0002 bölümündeki "müşteri detayında Maliyet
      ve Kâr kutusu (iki yer AYNI bileşen)" cümlesi ve 0050 bölümündeki maliyet kutusu paragrafı
      (varsayılan kapalı, `maliyetKutusuAcik`, görüntü aracının silme adımı) düzeltildi (AC-30).
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
