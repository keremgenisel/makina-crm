# 0130 — Hazırlanmış setin parçalanması ve bileşenlerin stoğa dönmesi

| | |
|---|---|
| **Durum** | Uygulandı, kapanış bekliyor (2026-11-02; plan `specs/0130-uygulama-plani.md`, plan turu Karar 1–11, uygulama Karar 12–14, triyaj Karar 15–16). |
| **Sahip** | Analist (spec), geliştirme atanmadı |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Stok › Parça Stoğu; saf motorlar `setUretimi.js`, `stokHareketi.js`; İşlem Geçmişi etiketleri |
| **Bağımlı spec'ler** | 0121 (setin içeriği ve set hazırlama), 0065 (stok hareketi motoru) |

---

## Intent

Fabrika bir seti hazırlayıp rafa koyuyor, sonra o setten vazgeçiliyor: müşteri yalnız içindeki dişliyi istiyor, ya da set yanlış hazırlanmış oluyor. Kutu açılıyor, parçalar tezgâha geri dönüyor. Takım Yöneticisi bunu uygulamaya söyleyebilmek istiyor. Bugün söyleyemiyor: hazırlamanın tersi olan tek işlem belirli bir hazırlama kaydını iptal etmek, yani hata düzeltme; rafta duran, hangi hazırlamadan geldiği bilinmeyen ya da hiç hazırlanmamış bir seti bozmanın yolu yok. Tek çare iki kez sayım düzeltmesi girmek, bu da hem setin hem her bileşenin adedini elle hesaplamak demek ve geçmişte neden değiştiğini kimse göremiyor. Bu iş bittiğinde "Seti Parçala" dedikçe setin stoğu girilen adet kadar azalır, içeriğindeki her bileşenin stoğu kadarınca artar, işlem geçmişte okunur adıyla durur ve yanlış adet girildiyse geri alınır.

---

## Requirements

- **R1.** Stoğunda seti olan bir parça, istenen adette **parçalanabilir**: setin kendi stoğu o adet kadar azalır, içeriğindeki her bileşenin stoğu `içerik adedi × parçalanan adet` kadar artar.
- **R2.** Parçalanan adet en az 1 tam sayıdır. Setin eldeki stoğundan fazla olamaz: fazlaysa hiçbir hareket yazılmaz ve nedeni söylenir (olmayan kutu açılamaz).
- **R3.** Hazırlamanın **kırpma kuralı burada uygulanmaz** (0121 R16). Set tarafı eldeki stokla sınırlıdır, bileşen tarafı giriştir ve sınırı yoktur; kısmen yazılan parçalama olmaz.
- **R4.** Stoğa dönen içerik setin **o anki** içeriğidir. Parçalama hiçbir hazırlama kaydına bağlanmaz: hiç hazırlanmamış, stoğa sayımla ya da elle girilmiş set de parçalanabilir.
- **R5.** İçeriği olmayan parça parçalanamaz. Stoğu sıfır olan set için işlem başlatılamaz.
- **R6.** Parçalama bir **stok hareketidir**, ayrı veri bölümü yoktur. Setin çıkışı ve her bileşenin girişi **tek işlem kimliği** taşır; hepsi aynı tarihi taşır.
- **R7.** Parçalama ve geri alma hareketleri stok hareketleri listesinde okunur adlarıyla görünür; setin satırı ile bileşen satırları birbirinden ayırt edilir.
- **R8.** Parçalama tarihi takvimde var olan bir gün olmalıdır ve bugünden sonra olamaz (hazırlamanın kuralıyla aynı). Tarih hareketin etiketidir, stoğu geriye dönük hesaplamaz.
- **R9.** İsteğe bağlı bir not girilebilir ve bu not **yalnız setin kendi satırına** yazılır (0121 R16/2 emsali); bileşen satırlarının notu sistemin yazdığı metindir.
- **R10.** Yapılan bir parçalama **geri alınabilir**: bileşenler yeniden düşer, setin stoğu geri artar. Ya hep ya hiç: kalan net girişi eldeki stoktan fazla olan bir bileşen varsa (kullanılmış ya da satılmış) hiçbir hareket yazılmaz ve geri alınamayan adet nedeniyle söylenir.
- **R11.** Geri alma **log'dan okur**, setin bugünkü içeriğine bakmaz: içerik parçalamadan sonra değiştirilmiş olsa da geri alma, o parçalamada gerçekten giren adetleri düşer.
- **R12.** İkinci geri alma etkisizdir (hiçbir hareket yazılmaz, hata da verilmez). Geri alınmış bir parçalamada eylem yerine "geri alındı" ibaresi görünür.
- **R13.** Bir parçalamanın geri alınıp alınmadığı **setin kendi çıkışının** kalan netinden okunur, bileşen girişlerinden değil. Bileşen hareketi doğmayan bir parçalama (içeriğin tamamı stoğa girmeyecek adetteyse) da geri alınabilir olmalıdır; aksi hâlde setin stoğu geri gelmez.
- **R14.** Parçalama, Stok › Parça Stoğu satırında "Set Hazırla"nın komşusu bir eylemle başlar; yalnız içeriği olan ve stoğu sıfırdan büyük satırda görünür.
- **R15.** Parçalama penceresi, kaydetmeden önce bileşen başına **stoğa girecek adedi**, setin eldeki stoğunu ve işlemden sonra kalacak adedi gösterir.
- **R16.** Pencere, kırpılmış bir hazırlamanın yan etkisini açıkça söyler: hazırlamada stokta olmadığı için düşülmemiş bir bileşen, parçalamada stoğa girer.
- **R17.** Parçalama penceresi setin kimliğiyle parça stoğu kilidini alır; kayıt başkasındaysa pencere yerine kilit çakışması ekranı gelir. Hareket listesindeki geri alma tıklandığında aynı kilide anlık bakılır.
- **R18.** Parçalama ve geri alma, stok miktarını düzeltme yetkisiyle yapılır; **yeni izin açılmaz**.
- **R19.** İki işlem de İşlem Geçmişi'ne kendi eylemiyle ve okunur etiketiyle düşer; ayrıntısında parçalanan adet bulunur.
- **R20.** Hazırlamanın geri alınamadığını söyleyen ret metni, sebebin **parçalama** da olabileceğini söyler (bugün yalnız "satılmış ya da kullanılmış" diyor).
- **R21.** Parçalama maliyeti etkilemez: setin maliyeti içeriğinden gelmeye devam eder, bileşenlerin maliyeti ve maliyet geçmişi değişmez, hiçbir maliyet kaydı yazılmaz.

---

## Constraints

### Uyulması zorunlu

- **C1.** Karar ve hesap React'sız saf motorda yazılır, ekran yalnız sonucu uygular (0121 C9). Pencere adet aritmetiği yapmaz.
- **C2.** Stok adedi türetilmiş önbellektir, hareket listesi **yalnız büyür**: geri alma satır silmez, ayrı tipte karşı hareket yazar (0065 C1, R6, R14). `setPartStockLog(lg => lg.filter(...))` yasağı aynen geçerlidir.
- **C3.** Setin **çıkışı** düşüm tiplerinin karşı hareket haritasına, **bileşen girişi** giriş tiplerinin iptal haritasına girer. Girişi düşüm haritasına koymak yanlış sonuç verir: net düşüm hesabı mutlak değerle çalışır ve girişi düşüm sayar (0121 R21/2'nin dersi).
- **C4.** Ad tuzağı: bugünkü `set_uretimi` **bileşen düşümüdür**, `set_girisi` **setin girişidir**. Parçalamanın tipleri bunların tersidir; adları bu ikisine benzememeli ve hazırlama tiplerine yeni anlam yüklenmemeli.
- **C5.** Yeni kalıcı alan, yeni veri bölümü, yeni izin, yeni sunucu kuralı ve yeni birleştirme kuralı yoktur. Parçalama hareketleri var olan hareket listesinin satırlarıdır ve 0065'in birleştirme kuralına tabidir (yalnız eklemeler korunur, işlem kimliği çevrilmez, parça kimliği eşlenir).
- **C6.** İç içe set yasak olduğu için (0121 R5) bileşenler set değildir: özyineleme yok, bileşenin içeriğine bakılmaz.
- **C7.** İçeriğinde çöpteki ya da kataloğda bulunamayan parça olan set de parçalanabilir; o satırın stoğu artar ve hareket listesinde bugünkü gibi "silinmiş parça" olarak görünür. Parçalama kataloğu temizlemez.

### KAPSAM DIŞI

- **X1.** Bileşen başına kısmi iade (hurda çıkan parçanın stoğa alınmaması) — *neden:* Takım Yöneticisi kararı; pencere sade kalır, hurda var olan sayım düzeltmesiyle düşülür ve geri alma hesabı tek anlamlı kalır.
- **X2.** Raftaki setin hangi hazırlamadan geldiğinin izlenmesi (parti ya da seri takibi) — *neden:* stok birbirinin yerine geçer, setin kutu bazında kimliği yok; izlemek yeni bir veri modeli demek.
- **X3.** Kırpılmış hazırlamada düşülmemiş bileşenin parçalamada da stoğa alınmaması — *neden:* fiziksel gerçek kutunun içeriğidir; eksik düşüm o anda stok sayısının yanlış olduğunu gösterir ve uygulamanın bu konudaki aracı Stok Tutarlılığı raporudur. Pencere bunu R16 ile söyler.
- **X4.** Satış, servis, teklif, Analiz, aylık rapor ve dışa aktarma tarafı — *neden:* bunlar seti tek parça görür (0121 X1) ve parçalama yalnız stok hareketidir.
- **X5.** Toplu parçalama (birden çok setin tek pencereden parçalanması) — *neden:* bugün yaşanmış ihtiyaç tek set; toplu işlem kilit ve ya hep ya hiç kuralını bütün setlere yaymayı gerektirir.
- **X6.** Kaydedilmiş bir parçalama hareketinin düzenlenmesi — *neden:* 0065 R22'nin bilinen sınırı; düzeltmenin yolu geri almadır.
- **X7.** Parçalamanın Stok Tutarlılığı raporunda ayrı bir satır ya da neden olarak görünmesi — *neden:* rapor hareket tiplerini ayırmaz, saklı adet ile log'dan türeyen adedi karşılaştırır ve parçalama hareketleri o hesaba kendiliğinden girer.

---

## Context

**0121 bu işi bilerek dışarıda bıraktı.** `specs/done/0121-parcadan-set-olusturma.md:77` (R23) "Ayrı bir 'seti sök' işlemi yoktur" der, gerekçesi X3'te yazılıdır: "hata düzeltmenin yolu geri almadır; raftaki seti bilerek bozmak bugün yaşanmış bir ihtiyaç değil". Müşteri isteğiyle bu karar geri açılıyor; 0121'in R23 ve X3 maddeleri bu spec'le ters çevrilir.

**Bugünkü tek geri yön "Geri Al"dır** (`src/lib/setUretimi.js:77` `setGeriAlPlani`, düğmesi `src/components/stock/StokHareketleriPenceresi.jsx:70`): belirli bir hazırlamanın işlem kimliğini alır, log'dan okur, setin kalan net girişi eldeki stoktan fazlaysa reddeder. İstenen işlemden üç yerde ayrılır: hazırlama kaydına bağlıdır (parçalama eldeki stoğa bağlıdır), hazırlamanın tamamını iptal eder (parçalama istenen adedi alır) ve hiç hazırlanmamış seti bozamaz. Stok birbirinin yerine geçtiği için "Geri Al"ı genişletmek yanlış olur; bu yüzden ayrı işlem.

**Hareket tipi haritaları** `src/lib/stokHareketi.js`'tedir: düşümlerin karşı hareketi `IADE_TIPI` (`:13`), girişlerin iptali `IPTAL_TIPI` (`:17`), okunur adlar `HAREKET_TIP_AD` (`:20`). Hesabın tamamı hazır ve iki yönü de kapsıyor: `netDusumleri`/`karsiHareketler` (`:60`, `:77`) düşüm tarafı, `netGirisler`/`karsiGirisler` (`:85`, `:101`) giriş tarafı, `girisGeriAlinabilir` (`:112`) ya hep ya hiç denetimi, `stokEtkisi`/`stokuUygula` (`:31`, `:48`) tek yazım. Parçalama bu motora **yeni hesap eklemez**, yalnız iki tip çiftini haritalara yazar ve var olan yardımcıları ters yönde çağırır: set tarafı için `karsiHareketler`, bileşen tarafı için `karsiGirisler` ve `girisGeriAlinabilir`.

**Hazırlamanın yazım deseni** `setUretimi.js:52` `setHazirlaPlani`'dedir: doğrulama, tek işlem kimliği (`uid()`), `{ ok, hata, hareketler }` dönüşü ve ekranın tek satırlık uygulaması `setHareketleriniUygula` (`:85`). Parçalama planı bu deseni izler. Kırpma `utils.stokKirparakDus` (`src/lib/utils.js:887`) hazırlamaya aittir, parçalamada çağrılmaz; parçalamada eldeki stok `totalMiktar` (`src/lib/utils.js:868`) ile okunur ve adet sınırı olarak kullanılır.

**Ekran noktaları:** Parça Stoğu satırının eylemleri `src/components/stock/PartStokTab.jsx:230` (Set Hazırla, yalnız içeriği olan satırda ve `stock_parca_edit` ile) ve `:231` (Hareketler). Pencereler `:252` ve `:249` satırlarında kurulur; ikisi de `hamParts`/`partStock`/`setPartStock`/`setPartStockLog` zincirini oradan alır. Hazırlama penceresinin kilidi `SetHazirlaPenceresi.jsx` içinde `useLock("partstock", set.id)`; kilit alanı kaydı `src/lib/kilitAlanlari.js:18`'de ve yeni pencere o listeye yazılmalıdır, yoksa `tests/kilit-alanlari.test.js` düşer.

**İşlem geçmişi etiketleri** `src/components/settings/SettingsAuditLog.jsx:25`'te (`set_hazirlandi`, `set_geri_alindi`; kayıt türü `stok_parca`, `:7`). Yeni iki eylem etiketsiz kalırsa ham anahtarıyla görünür ve `tests/islem-gecmisi-etiketleri.test.js` tek yönlü taramayla düşer.

**Ters çevrilecek kriter:** 0121 AC-25 (`tests/set-icerigi-0121.test.js:286`) ret metnini birebir sınar ve `/1 adedi satılmış ya da kullanılmış/` desenini arar; R20 bu metni genişletir, o satır bu spec'le güncellenir. `setUretimi.js:22` `geriAlRedMetni` metnin tek kaynağıdır.

**Ölçüm notu:** setin içeriği 0121'de göçsüz geldi ve elle girilir, yani içeriği girilmemiş bir set parçalanamaz. Bu özelliğin değeri 0121'in değeriyle aynı ön koşula bağlıdır. Kataloğun bugünkü durumu (içeriği girilmiş set sayısı, bu setlerin stoğu, kayıtlı hazırlama sayısı) spec onaylandığında güncel bir yedek dosyasıyla ölçülür; 0121 yazılırken on beş set adayı vardı ve on dördünün maliyeti boştu.

### Plan turunda verilen kararlar (2026-11-02)

Takım Yöneticisi planın bütün önerilerini 2026-11-02'de onayladı (plan `specs/0130-uygulama-plani.md`).

- **Karar 1.** Tip adları (C4): setin çıkışı **`set_parcalama`** (eksi, düşüm haritası `IADE_TIPI`'nde), karşısı **`set_parcalama_iade`** (artı); bileşen girişi **`parcalama_girisi`** (artı, giriş haritası `IPTAL_TIPI`'nde), iptali **`parcalama_girisi_iptal`** (eksi). Okunur adlar "Set parçalandı", "Set parçalama geri alındı", "Set parçalandı (bileşen girişi)", "Set parçalama geri alındı (bileşen)". *Neden:* hazırlamanın `set_uretimi` / `set_girisi` adlarıyla kök paylaşmaz, hangi haritaya girdiği yönünden okunur (C3). → **R6, R7, C3, C4, AC-28**
- **Karar 2.** Ters çevrilen kriterler üçtür, spec yalnız birini sayıyordu: 0121 AC-25 (ret metni), ayrıca `tests/stok-hareketi.test.js` (`IADE_TIPI`'nin anahtar listesi birebir) ve `tests/set-icerigi-0121.test.js` (`IPTAL_TIPI` birebir). İkisi "spec 0130 ile" notuyla yeni listelere genişler. 0121'in R23 ve X3'ünü sınayan test yok (ölçüldü); o ters çevirme yalnız `CLAUDE.md`'de yapılır. → **AC-29, DoD**
- **Karar 3.** R20'nin metni: "Bu hazırlamanın n adedi satılmış, kullanılmış ya da parçalanmış; parçalandıysa önce parçalamayı geri alın, değilse stok sayımını düzeltin." *Neden:* sebep parçalamaysa doğru çare sayım düzeltmesi değil, parçalamanın geri alınmasıdır. → **R20, AC-29**
- **Karar 4.** Geri almanın kararı setin kendi çıkışının kalan netine bağlıdır (R13): bileşen girişi yoksa `girisGeriAlinabilir`'in "boş = etkisiz" dönüşü yok sayılır ve yalnız set karşı hareketi yazılır. Bu durum normal yoldan doğmaz (içerik doğrulaması adedi en az 1 ister), doğrulanmamış eski ya da bozuk içerikte (adet 0 ya da sayı olmayan) doğar; AC-16 o fikstürle ölçülür. → **R13, AC-16**
- **Karar 5.** "Geri Al" düğmesi yalnız setin kendi Hareketler penceresinde, `set_parcalama` satırında; bileşen satırlarında düğme yok (hazırlama emsali). → **R12, R17, AC-15, AC-24**
- **Karar 6.** Pencere yalnız setin `partstock` kilidini alır; bileşen stokları kilitlenmez (hazırlama emsali, stok adedi 0065'in hareket birleştirmesiyle korunur). → **R17, AC-23**
- **Karar 7.** Notlar: setin satırında sistem notu "Set parçalandı · n adet", kullanıcı notu varsa ardından; bileşen satırlarında yalnız sistem notu; geri alma satırlarının notu "Set parçalama geri alındı". → **R9, AC-9**
- **Karar 8.** AC-32 için altın dosya yazılmaz: motorlar (aylık rapor, Analiz, Finans Özeti, parça dışa aktarması, model maliyeti) aynı veriyle, parçalama hareketleri ve stok değişikliğiyle ve onlarsız iki kez koşulur, çıktılar birebir eşit olmalı; içeriksiz ve içerikli iki veride. → **AC-32**
- **Karar 9.** Canlı veri: elde tek yedek 01.11.2026 tarihli ZIP'tir (`veri.json`) ve içeriği girilmiş set sayısı **0**'dır (spec 0122 Karar 25 ile ölçüldü); bugün parçalanabilecek set yok, değer 0121'in ön koşuluna bağlıdır. Daha yeni yedek gelirse yeniden ölçülür. → **Bağlam, ölçüm notu**
- **Karar 10.** Görsel kanıt yeni ekranlarla alınır (pencere, fazla adet hatası, kilit ekranı, hareket penceresinde açık ve geri alınmış satır); değişen var olan ekranlar tahminle değil taban ve sonra çekimiyle ölçülür (0122 dersi). → **DoD**
- **Karar 11.** AC-31 aynı günde sayım düzeltmesi olmayan veriyle ölçülür: rapor aynı gündeki sayım düzeltmesini "sıra belirsiz" sayar, bu bugünkü davranıştır ve parçalamaya özgü değildir. → **AC-31, X7**

### Uygulamada verilen kararlar (2026-11-02)

- **Karar 12.** Ters çevrilen test dördüncüsüyle tamamlandı: 0121'in AC-45 testi (`tests/set-icerigi-0121.test.js`) `tests/stok-hareketi.test.js`'teki `IADE_TIPI` listesinin metnini birebir arıyordu; "spec 0130 ile" notuyla yeni listeye (`set_parcalama` dahil) çevrildi, 0121'in kendi ters çevirmesi yerinde. → **Karar 2, DoD**
- **Karar 13.** Görsel kanıt ölçüldü (taban ve sonra çekimi, 10 var olan ekran × 2 tema): üçü değişti (`parca-stok-0121-set`, `-0121-hazirla`, `-0121-hareket`; setin satırına "Seti Parçala" düğmesi girdi, pencerelerin arkasında görünüyor), yedisi 0 piksel (`-0121-hazirla-eksik` dahil: o fikstürde setin stoğu yok, düğme çizilmez, R14). Yeni dört ekran: `parca-stok-0130-parcala`, `parca-stok-0130-hata`, `kilit-set-parcala`, `parca-stok-0130-hareket` (açık ve geri alınmış parçalama). Rapor `0130-piksel-raporu.json`. Satır kaydığı için sözlüğün `PartStokTab.jsx:148` örneği `:149` oldu (`tasarim-kaynak` AC-20). → **DoD, Karar 10**
- **Karar 14.** Pencerede "Parçalamadan sonra kalacak" adedi, istenen adet setin stoğunu aşınca "—" yazar (motor `kalacak: null` döner, eksi sayı gösterilmez); kayıt zaten reddedilir. → **R15, AC-21**

### Triyajda verilen kararlar (2026-11-02)

- **Karar 15.** Geri almanın tarihi **geri almanın yapıldığı gündür** (yerel gün, `useBugun`), parçalamanın tarihi değil; karşı hareketler o tarihi taşır. R8 yalnız parçalamanın tarihini kurallıyordu, bu yazılı değildi ve testi yoktu (triyaj bulgu 1). → **R10, AC-10**
- **Karar 16.** Triyajın öteki bulguları: kilit cevabı gelmeden iki pencerenin (parçalama ve hazırlama) kaydet düğmesi pasif ve bunu sınayan test eklendi (bulgu 2); parçalamanın iki tipinin birleştirmede işlem kimliğini çevirmediği ve parça kimliğini eşlediği `tests/merge.test.js`'te ayrıca sınandı (bulgu 4); taban raporu son kodla alındı (bulgu 5). Üçüncü bulgunun metni kesik geldi, işlem yapılmadı. AC-27'nin bekçisi `islem-gecmisi-etiketleri` testidir, ek iş gerekmedi. → **AC-23, C5, DoD**

---

## Acceptance Criteria

- **AC-1.** İçeriği `2 × A`, `1 × B` olan bir setten 3 adet parçalanınca setin stoğu 3 azalır, A'nın stoğu 6, B'nin stoğu 3 artar.
- **AC-2.** Parçalama, setin çıkışı ve her bileşenin girişi için ayrı hareket satırı yazar; hepsi aynı işlem kimliğini ve aynı tarihi taşır.
- **AC-3.** Setin stoğu 2 iken 3 adet parçalanmak istenirse hiçbir hareket yazılmaz ve neden metni döner.
- **AC-4.** Parçalanan adet 0, boş, ondalıklı ya da sayı olmayan bir metinse hiçbir hareket yazılmaz ve neden metni döner.
- **AC-5.** Bileşen stoğu sıfır olsa da parçalama tam yazılır: giriş tarafında kırpma yoktur.
- **AC-6.** Hiç hazırlanmamış, stoğu yalnız elle girilmiş bir set parçalanabilir ve bileşenleri stoğa girer.
- **AC-7.** İçeriği olmayan bir parça için parçalama işlemi reddedilir ve nedeni söylenir.
- **AC-8.** Takvimde olmayan bir tarih (31.02.2026) ya da gelecekteki bir tarih verilirse hiçbir hareket yazılmaz ve nedeni söylenir.
- **AC-9.** Kullanıcının girdiği not yalnız setin kendi hareket satırında görünür; bileşen satırlarında görünmez.
- **AC-10.** Parçalama geri alınınca setin stoğu parçalanan adet kadar geri artar ve her bileşenin stoğu girdiği adet kadar geri düşer.
- **AC-11.** Geri alma satır silmez: parçalamanın satırları yerinde kalır, karşı hareketler yeni satır olarak eklenir.
- **AC-12.** Parçalamadan sonra bir bileşen kullanıldığı için stoğu girmiş adedin altına indiyse geri alma hiçbir hareket yazmaz ve geri alınamayan adedi söyler.
- **AC-13.** Parçalamadan sonra setin içeriği değiştirilse de geri alma, o parçalamada gerçekten giren adetleri düşer (bugünkü içeriği değil).
- **AC-14.** Aynı parçalama ikinci kez geri alınırsa hiçbir hareket yazılmaz ve hata da verilmez.
- **AC-15.** Geri alınmış bir parçalamanın satırında eylem düğmesi yerine "geri alındı" ibaresi görünür.
- **AC-16.** Bileşen hareketi doğmamış bir parçalama da geri alınabilir ve setin stoğu geri gelir (etkisizlik ölçütü setin kendi çıkışıdır).
- **AC-17.** Parça Stoğu satırındaki parçalama eylemi, içeriği olmayan parçada çizilmez.
- **AC-18.** Parçalama eylemi, içeriği olan ama stoğu sıfır olan sette çizilmez.
- **AC-19.** Parçalama eylemi, stok miktarını düzeltme yetkisi olmayan kullanıcıda çizilmez.
- **AC-20.** Pencere, bileşen başına stoğa girecek adedi girilen adetle çarpılmış hâliyle gösterir ve adet değişince yeniden hesaplar.
- **AC-21.** Pencere setin eldeki stoğunu ve işlemden sonra kalacak adedi gösterir.
- **AC-22.** Pencere, kırpılmış hazırlamanın yan etkisini anlatan ibareyi her zaman gösterir.
- **AC-23.** Set başka bir kullanıcının kilidindeyse pencere içeriği yerine kilit çakışması ekranı gelir ve hiçbir hareket yazılmaz.
- **AC-24.** Hareket listesinden geri alma tıklandığında set başkasının kilidindeyse işlem reddedilir, bildirim çıkar ve hiçbir hareket yazılmaz.
- **AC-25.** Parçalama İşlem Geçmişi'ne kendi eylemiyle, parça stoğu kayıt türünde, setin adıyla ve parçalanan adetle düşer.
- **AC-26.** Parçalamanın geri alınması İşlem Geçmişi'ne ayrı bir eylem olarak düşer.
- **AC-27.** İki yeni eylemin de İşlem Geçmişi ekranında okunur Türkçe etiketi vardır (ham anahtar görünmez).
- **AC-28.** Dört yeni hareket tipinin (setin çıkışı ve karşısı, bileşen girişi ve iptali) hareket listesinde okunur Türkçe adı vardır.
- **AC-29.** Hazırlamanın geri alınamadığını söyleyen ret metni parçalanmış olma ihtimalini de söyler (0121 AC-25 ters çevrilir).
- **AC-30.** Parçalanan setin maliyeti, bileşenlerinin maliyeti ve maliyet geçmişi parçalamadan önce ve sonra birebir aynıdır.
- **AC-31.** Parçalama hareketleri yazıldıktan sonra Stok Tutarlılığı raporu o parçalar için sapma göstermez.
- **AC-32.** Parçalama hiçbir satış, servis, teklif, Analiz ya da aylık rapor çıktısını değiştirmez (içeriksiz ve içerikli veride kıyas).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Karar ve hesap saf motorda (`setUretimi.js`, `stokHareketi.js`) yazıldı, kendi testi var; pencere yalnız uyguluyor.
- [ ] Hareket tipi haritalarının (`IADE_TIPI`, `IPTAL_TIPI`, `HAREKET_TIP_AD`) üçü birlikte güncellendi.
- [ ] Yeni kalıcı alan, veri bölümü ve izin **eklenmediği** açıkça yazıldı; salt stok hareketi olduğu için sunucu ve birleştirme dokunulmadı (tarama ile gösterildi).
- [ ] Yeni pencere `src/lib/kilitAlanlari.js` kayıt listesine eklendi ve `kilit-alanlari` testi yeşil.
- [ ] İki yeni işlem geçmişi eylemi etiketleriyle eklendi ve `islem-gecmisi-etiketleri` testi yeşil.
- [ ] 0121'in R23, X3 ve AC-25 maddelerinin ters çevrildiği test yorumlarında "spec 0130 ile" notuyla işaretlendi.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (pencere, boş ve hata durumları, kilit ekranı, geri alınmış satır).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0121 bölümündeki "Ayrı 'seti sök' yok" cümlesi güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
