# 0110 — Kalıp durumu geçmişi susar, pil yalnız açık işi sayar

| | |
|---|---|
| **Durum** | Onaylandı (2026-10-25; plan turu 2026-10-25, Karar 17–24) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | `src/lib/musteriDurumu.js`: türetme (`:79-83`), kalıp kümesi (`:157-163`), pil (`:174-182`), satır durumu (`:186-191`); müşteri detay penceresinin kalıp kartı (`src/components/customers/CustomerDetailModal.jsx:1088-1102` aralığına döner, bugün `:1103-1130`). Yalnız **türetilen etiket metni** değişen iki ekran: müşteri formunun kalıp ızgarası (`src/components/customers/CustomerAddEditForm.jsx:366`, `:372`) ve zaman çizelgesinin Extra Kalıp seçicisi (`src/components/customers/detail/MachineTimeline.jsx:353`); ikisi de `kalipDurumuTuret`'i çağırır ve R18 ile kayda geçer (QA turu K-1) |
| **Bağımlı spec'ler** | 0106 (durum alanları, türetme, pil, kalıp kartı), 0107 (ayna satır ölçütü), 0108 (bağ canlılığı ve `kalipBekliyorMu`) |
| **Ters çevrilen kriterler** | **Kurallar:** **0106 R20/2 ve Karar 23** (payda her zaman kümenin toplamıdır), **0106 R21, R21/2 ve Karar 11, 24** (`bekliyor` yalnız makina durumu dolu kayıtlarda çizilir), **0106 R11, R11/2 ve Karar 20, 38** (detay penceresinde kalıp satırı ve durum seçicisi). **0108 plan turu Karar 17 ters çevrilmez** (QA turu Karar 7, B-1): damga taşıyan kayıt `teslim` türetmez, kopmuş bağın bugünkü cevabı korunur. 0106 R10 (elle değer kazanır), R17 (küme), R18 (en geri kalmış durum), R19 (boş küme pilsiz), R22 (renkler) ve 0108'in bekleyen ölçütü aynen kalır. **Kabul kriterleri (ölçüm 15, Karar 8, AC-23):** 0106 AC-7, AC-11, AC-12, AC-13, AC-17, AC-18, AC-19, AC-21, AC-22, AC-29, AC-40, AC-42 ile AC-38 ve AC-39'un yalnız detay yarıları; 0107 AC-26 ve AC-28; 0109 AC-20. *Plan turu Karar 23 ve 24 ile ölçülen sayı:* **yirmi iki beklenti, beş dosya** (0106 AC-11 ve Karar 31 ile 0108 AC-29 R1/3 yüzünden kırılmaz; 0106 triyaj bulgu 3'ün detay yarısı ve 0107'nin saf testindeki kanıt kaydı beklentisi eklenir); tam liste planın §4'ünde |

---

## Intent

Kullanıcı müşteri listesinde "KALIP ÜRETİMDE 1/6" pilini gösterip soruyor: bu müşteriye yeni bir Extra Kalıp sipariş edildi, üretimdeki kalıp o. Paydadaki 6, makinayla birlikte yıllar önce teslim edilmiş beş kalıbı da sayıyor. İkinci isteği müşteri detay penceresinden: kalıp kartına 0106 ile gelen durum seçicisi sütunu kalksın, kart eski sade hâline dönsün.

Bugün iki kural birlikte bu sonucu üretiyor. Türetme, işareti ve bağı olmayan kalıba "Sipariş bekliyor" diyor, yani kayıttaki her eski kalıp açık bir iş sayılıyor; pil onları makina durumu boş olduğu için çizmiyor ama paydada sayıyor. Sonuç, sayının anlattığı şeyin kullanıcının sorduğu şey olmaması: kullanıcı "kaç kalıp üretimde" diye soruyor, pil "bu makinanın kaç kalıbından kaçı" diye cevap veriyor.

Bu iş bittiğinde işaretlenmemiş ve hiçbir forma girmemiş kalıp teslim edilmiş sayılacak, yani sessiz kalacak; pil yalnız açık işi sayacak ve bütün açık kalıplar aynı aşamadaysa sayı yazmayacak; detay penceresinin kalıp kartı 0106 öncesi hâline dönecek. Türetilen her değer elle değiştirilebilir kalacak.

---

## Requirements

### A. Türetilen kalıp durumu

- **R1.** İşareti (`uretimFormGonder`) ve üretim formu damgası (`uretimFormId`) **ikisi de boş** olan kalıp **`teslim`** türetir. Bugün `bekliyor` türetiyor. Ölçüt iki alanın **boşluğudur**, bağın canlılığı değil: `!uretimFormGonder && !doluMu(uretimFormId)` (QA turu Karar 7, B-1).
- **R1/2.** Kural tek ve ayrımsızdır: müşteri kalıbı ile Extra Kalıp satışı aynı sonucu verir. Gerekçe Karar 1'de.
- **R1/3.** **Damga taşıyan kayıt hiçbir hâlde `teslim` türetmez.** `uretimFormId` dolu ama bağ canlı değilse (form çöpte, form yok ya da o formda bu kalıbın satırı yok) 0108'in bugünkü cevabı korunur: işaretsizse `bekliyor`, işaretliyse `gonderildi`. Gerekçe ve ölçülmüş bedel Karar 7'de; bu yüzden 0108 Karar 17, AC-43 ve R15 ters çevrilmez ve C4 gerçekten sağlanır.
- **R2.** İşaret ya da bağ varken 0106 ve 0108'in kuralları **aynen** geçerlidir: canlı bağ ve tamamlanmamış satır `uretimde`, canlı bağ ve tamamlanmış satır `hazir`, işaretli ama bağsız kalıp `gonderildi`. Formun dönemi sonlandırılmış olsa da sonuç değişmez (Karar 2).
- **R3.** `bekliyor` değeri, adı ("Sipariş bekliyor"), sırası ve pili kalkmaz; elle seçilebilen bir durum olarak kalır ve seçildiğinde çizilir.
- **R4.** Elle yazılmış değer her zaman türetilenin önündedir (0106 R10 aynen). Türetilen `teslim` dahil her değer kullanıcı tarafından değiştirilebilir; yazma yolları R16'da.
- **R5.** Hiçbir kayda alan yazılmaz, göç yoktur. Türetme okuma anındadır; aynı veri eski sürümde eski cevabı verir.
- **R6.** 0108'in bekleyen kalıp ölçütü (`kalipBekliyorMu`) ve onu okuyan üç yer (üretim formunun getirmesi, Anasayfa sayacı, yeni formun başlangıç tarihi) **değişmez**. O ölçüt işaret ve bağ okur, türetilen durumu okumaz; bu spec sonrası da bugünkü sonucu verir.
- **R6/2.** İki okumanın çaprazı korunur: **bekleyen bir kalıp hiçbir hâlde `teslim` türetmez.** 0108 AC-43 bu değişmezi sabitliyor (`uretimFormId` dolu ve bağ kopmuş kayıt hem bekleyendir hem `bekliyor` ya da `gonderildi` türetir). R1/3 bu yüzden zorunludur: R1 bağın canlılığına bakarsa aynı kayıt üretim formunun getirmesinde ve Anasayfa sayacında bekleyen, müşteri listesinde teslim edilmiş görünürdü ve bugünkü veride tam bu hâlde yedi Extra Kalıp var (ölçüm 2, ölçüm 18).
- **R7.** Üretimi biten kalıbın "Teslim edildi"ye geçişi **elle kalır** (Karar 2). Türetme `teslim`i yalnız R1'in yolundan verir; tamamlanmış satırın durumu `hazir` olmaya devam eder ve kalıp "Teslim Bekleyenler" süzgecinde durur. Üretim formunun `kapali` alanı türetmeye girmez, üretim formu haritasının şekli değişmez.
- **R7/2.** 0106'nın X11 bilinen sınırı (`kalipIdx` konumdur, kalıp silinince bağ kayar ve son konumun satırı hiçbir kalıba düşmez) **görünürlüğünü korur**: satırı düşen kalıp damga taşıdığı için R1/3 ile `bekliyor` türetmeye devam eder, yani bugünkü gibi pille görünür. R1'in `teslim`i bu sapmayı sessizleştirmez (QA turu Karar 11, ölçüm 19).

### B. Pilin sayısı

- **R8.** Pilin paydası **gösterilebilir** kümedir, kümenin toplamı değil. Gösterilebilir olmayan (bugün yalnız `teslim`) kalıplar paydaya girmez.
- **R9.** Gösterilebilir kümenin tamamı aynı durumdaysa sayı yazılmaz. "KALIP ÜRETİMDE 3/3" yerine "KALIP ÜRETİMDE" yazar. Karışık kümede sayı yazar: {2 `uretimde`, 1 `hazir`} kümesi "KALIP ÜRETİMDE 2/3" verir.
- **R10.** `bekliyor` kapısı kalkar: pil makina durumuna bakmaz, `kalipPili` ikinci parametresini almaz. R1'den sonra `bekliyor` yalnız elle yazılarak doğduğu için bastırılacak bir gürültü kalmaz.
- **R11.** Gösterilebilir durum yoksa kalıp pili çizilmez (0106 R19 aynen); `teslim` tek başına pil çizdirmez.
- **R12.** "Teslim Bekleyenler" süzgeci, sayısı ve `satirDurumu.teslimBekliyor` ölçütü değişmez (makina `hazir` ya da en az bir kalıp `hazir`). R1 `hazir` üretmediği için süzgeç bu spec'le ne daralır ne genişler.

### C. Müşteri detay penceresinin kalıp kartı

- **R13.** Kalıp kartı 0106 öncesi hâline döner: başlık `Kalıplar (n)`, gövde tek akışta sarılan etiketler, satır düzeni yok, durum seçicisi yok, ayna satırın salt okunur durum ibaresi yok.
- **R13/2.** `durumBaglami` prop'u, `CustomerDetailModal.jsx:65`'teki `durumBaglami = null` varsayılanı ve `:1197`'deki `durumBaglami={durumBaglami}` iletme satırı **aynen kalır**: zaman çizelgesi `turetilen`'i oradan okur (`MachineTimeline.jsx:353`). Kart kalkınca pencerenin kendi kullanımı kalmaz ama prop kullanılmıyor görünmesine rağmen silinemez; silinirse çizelgenin seçicisi "Otomatik ()" yazar ve 0106 AC-12 ile AC-29 kırılır (QA turu Karar 9, ölçüm 17). Pencerede kalkacak içe aktarmalar yalnız `kalipDurumuTuret`, `aynaDurumu`, `aynaSatirMi`, `musteriKalipAnahtari`, `KALIP_DURUM_ADLARI`, `AYNA_SATIR_IBARESI` ve `KalipDurumuSecici`'dir; `durumYaz`, `makinaDurumuOf`, `MAKINA_DURUM_ADLARI`, `MAKINA_DURUMU_ETIKETI` ve `MakinaDurumuSecici` makina durumu satırı için kalır (R15).
- **R14.** Etiketin metni (`ölçü — ad`), renkleri ve `extraSatistan` ayrımı (kırmızı tint, "Extra Kalıp Satışı'ndan" başlığı) bugünkü hâliyle kalır.
- **R15.** Aynı penceredeki **makina durumu satırı** (`detay-makina-durumu`) ve **zaman çizelgesindeki Extra Kalıp durum seçicisi** dokunulmaz (Takım Yöneticisi açıkça böyle istedi).
- **R16.** Müşteri kalıbının elle durumu bundan sonra yalnız müşteri formunun kalıp ızgarasında yazılır; Extra Kalıp'ınki zaman çizelgesinde. Yazma yolu kapanmaz, tekilleşir; R4'ün "değiştirilebilir" güvencesi bu iki yolla karşılanır.
- **R16/2.** Yazma yolu **kapanmaz ama derinleşir**: müşteri kalıbının durumunu yazmak bundan sonra düzenleme formunu açıp **kaydetmeyi** gerektirir, oysa bugün detaydaki seçici pencere açıkken anında yazıyor (0106 Karar 20'nin gerekçesi buydu). Ölçtüm, yol kapanmıyor: detay penceresinin "Düzenle" düğmesi `cust_detail_edit` ile çizilir (`CustomerDetailModal.jsx:1153`) ve `Customers.openEdit`'i izinsiz çağırır (`Customers.jsx:690`, `:261`), yani yalnız `cust_detail_edit` taşıyan kullanıcı da formu açabilir (ölçüm 20). Bedel kayda geçti (QA turu Karar 15).
- **R17.** `detay-kalip-satiri` ölçüm kimliği ve detay penceresindeki `ayna-kalip-durumu` kalkar. Müşteri formundaki `ayna-kalip-durumu` (0106) ve `ayna-uretim-formu` (0107) kalır.
- **R17/2.** İki kimliğin hangi bileşende durduğu ve hangi test satırının hangisini okuduğu **ölçüldü, uygulama turuna bırakılmaz** (ölçüm 12, QA turu Karar 10): kimlik `CustomerDetailModal.jsx:1116` (kalkar) ve `CustomerAddEditForm.jsx:366` (kalır). Testlerde **form** (kalır): `ui/extra-kalip-isareti-0107.test.jsx:71` ve `:165`, `ui/musteri-durumu-0106.test.jsx:161` ve `:253`. **Detay** (kalkar): `ui/extra-kalip-isareti-0107.test.jsx:74`, `ui/musteri-durumu-0106.test.jsx:164` ve `:273`. Kalkan `detay-kalip-satiri` kimliğini okuyan iki satır `ui/musteri-durumu-0106.test.jsx:270` (AC-38'in detay yarısı) ve `:283` (AC-39'un detay yarısı).

---

### D. QA turunda eklenen kurallar (2026-10-25)

- **R18.** **Türetilen etiketin metni bilinçli olarak değişir ve mekanizması dokunulmaz.** Seçicinin ilk seçeneği `otomatikEtiket(turetilen)`'den gelir (`musteriDurumu.js:87-89`) ve `kalipDurumuTuret`'i üç ekran çağırır: müşteri formunun kalıp ızgarası (`CustomerAddEditForm.jsx:372`), zaman çizelgesinin Extra Kalıp seçicisi (`MachineTimeline.jsx:353`) ve bugünkü detay kartı (kalkar). R1'den sonra yeni eklenen, henüz işaretlenmemiş kalıp **"Otomatik (Teslim edildi)"** yazar; formun ayna ibaresi de işaretsiz Extra Kalıp'ta "Teslim edildi · Extra Kalıp satışından" olur (`aynaDurumu` yoluyla). Etiketi duruma göre değiştirmek yeni bir kavram getirdiği için R3 ve C7 korunur, sonuç **bilinen sınır** olarak yazılır ve sürüm notuna girer: "Yeni eklenen kalıp, üretim formuna gönder işaretlenene kadar Teslim edildi türetir; işaret konulunca Sipariş verildi olur." (QA turu Karar 12, ölçüm 16.)
- **R19.** **Detay penceresinde kalıp durumu artık hiç görünmez ve bu bilinçlidir.** R13 ile seçici, R17 ile ayna satırın salt okunur ibaresi kalkar; aynı pencerede makina durumu satırı R15 ile okunur kalır. Yani pencerede makina durumu okunur, kalıp durumu okunamaz; görmek için "Düzenle" ile form açılır (R16/2). 0106 Karar 20 seçiciyi oraya tam bu okunabilirlik için koymuştu, karar Takım Yöneticisi'nin açık isteğiyle geri alınıyor ama kaybedilen yetenek **bilinen sınır** olarak yazılır ve sürüm notunda bir cümleyle duyurulur (QA turu Karar 14).

---

## Zorunlu kısıtlar

- **C1.** Yeni kalıcı alan, yeni ayar, yeni izin, yeni bölüm, yeni sunucu kuralı ve göç yoktur.
- **C2.** `musteriDurumu.js` saf kalır: React almaz, saat okumaz, veri yazmaz.
- **C3.** Ekranlar durum dizesi karşılaştırmaz ve pil seçmez; 0106'nın kaynak taraması (üç gerekçeli istisnasıyla) aynen geçerlidir.
- **C4.** 0108'in `kalipBekliyorMu` gövdesi ve imzası değişmez; bu spec yalnız `kalipDurumuTuret` tarafına dokunur.
- **C4/2.** İki okuma birbiriyle çelişmez (R6/2): `kalipBekliyorMu` `true` döndüren hiçbir kayıt `teslim` türetmez. Bu, R1'in ölçütünü alan boşluğuna bağlamanın (R1/3) **zorunlu** gerekçesidir ve 0108 AC-43 ile ölçülür.
- **C5.** Üretim formu haritasının şekli ve `uretimFormHaritasi`'nın imzası değişmez; `kapali` türetmeye girmez (Karar 2, R7).
- **C6.** Stok ekranı, Anasayfa kutuları (bekleyen kalıp sayacı dahil, R6), Çöp Kutusu ve üretim formunun kendi ekranı 0 piksel değişmez.
- **C6/2.** Müşteri formunun kalıp ızgarası ve zaman çizelgesinin Extra Kalıp seçicisi **yalnız türetilen etiket metninde** değişir (R18); yerleşimi, seçenek listesi, yazma yolu ve izin dalları aynı kalır. Bu iki ekran AC-22'nin değişenler listesinde sayılır.
- **C7.** `KALIP_DURUMU` değerleri, adları, sırası ve yedi pilin paleti değişmez (0106 R18/2, R22/3). Kontrast testinin yedi kaydı `tests/tasarim-kontrast.test.js:88-94`'tedir ve hepsi `src/lib/musteriDurumu.js`'i okumaya devam eder; amber "KALIP SİPARİŞİ BEKLİYOR" kaydı R3 gereği yerinde kalır (ölçüldü).
- **C8.** Değişen kanıt kayıtları Görsel kanıt bölümünde adıyla sayılır ve `beklenen: "degisti"` + `onay` alır; adı sayılmayan hiçbir `musteri-*` kaydı `ayni`den çıkmaz (Ö-1, Karar 13).
- **C9.** `DurumPilleri` pilleri `key={p.metin}` ile çizer (`DurumPili.jsx:15`); R9 sayıyı kaldırınca metinler kısalır ama satırda en çok bir kalıp pili olduğu için çakışma olmaz. İleride ikinci bir kalıp pili eklenirse anahtar çakışır, bu bilinen sınır kayda geçti (QA turu K-9'un emsali).

---

## Kapsam dışı

- **X1.** Kalıba kalıcı kimlik verilmesi ve üretim formu satırının ona bağlanması — *neden:* veri göçü ister, README'de açık bulgu olarak duruyor.
- **X2.** Üretimi biten kalıbın "Teslim edildi"ye toplu ya da otomatik geçmesi ("Dönemi Sonlandır"a teslim anlamı bağlamak, formda toplu işaretleme, makina teslim edilince kalıpları da saymak) — *neden:* Karar 2 ile reddedildi; dönem sonlandırılmadan teslim edilen kalıplar var, yani bugünkü veride güvenilir bir teslim sinyali yok. README'ye açık bulgu olarak yazılır.
- **X3.** "Şu tarihten eski kayıtlar teslim sayılır" yürürlük tarihi ayarı — *neden:* Karar 1'de ölçülmüş bedeliyle reddedildi.
- **X4.** Eski kayıtlara toplu `kalipDurumu` damgası (göç) — *neden:* 4866 kalıp satırına alan yazar, geri alınamaz ve türetmeyi o satırlarda sonsuza kadar susturur.
- **X5.** Müşteri **formundaki** kalıp durumu seçicisi — *neden:* Takım Yöneticisi yalnız detay penceresini istedi; elle yazmanın yolu olarak kalması gerekiyor (R4, R16).
- **X6.** Zaman çizelgesinin Extra Kalıp seçicisi ve detay penceresinin makina durumu satırı — *neden:* "dokunma" denildi.
- **X7.** Makina pili, ödeme pili ve Durum sütununun yerleşimi — *neden:* şikayet kalıp pilinin sayısında.

---

## Ölçümler

> **Kaynak notu (QA turu K-5):** 1, 2, 3, 4, 5, 8 ve 14 numaralı ölçümler **analistin yerel yedeğinden** (2026-10-22, `veri.json`) alındı; dosya depoda ve kayıtlı bir yolda değil, yani geliştirici bu sayıları yeniden ölçemez. Hiçbir kabul kriteri bu sayılara bağlanmaz: AC-9 girdisini ham veriyle yazar (AC-24) ve bütün sayısal beklentiler kanıt fikstüründen (`scripts/evidence/0009-sayfa.jsx:338-356`) ya da test düzeneğinden gelir. Kod ölçümleri (6, 7, 9, 10, 11, 12, 13 ve QA turunun 15-20'si) canlı ağaçta doğrulandı.

1. **Veri (analistin yerel yedeği, 2026-10-22):** 1265 canlı müşteri, 4866 müşteri kalıbı satırı, 1219 canlı Extra Kalıp satışı, 1219 ayna satır. Yani ayna olmayan müşteri kalıbı 3647, toplam kalıp kümesi 4866.
2. **İşaret ve bağ:** müşteri kalıplarının **hiçbirinde** `uretimFormGonder` ya da `uretimFormId` yok (0 ve 0). Extra Kalıp'ların 2'si işaretli, 7'sinde artık var olmayan bir forma bağ var. `uretimFormlari` bölümü **boş**.
3. **`makinaDurumu` dolu kayıt sayısı: 0.** 0106'nın R21 kapısı bu yüzden bugüne kadar hiç açılmadı; eski kalıpların "Sipariş bekliyor" pili hiç görünmedi.
4. **Küme büyüklükleri:** 1265 kaydın 1264'ünde en az bir kalıp var, 1106'sında birden fazla. Extra Kalıp'ı olan 545 müşteride ortalama küme 4,89, medyan 5, en büyük 15. Yani yeni bir Extra Kalıp üretime girdiğinde payda tipik olarak 5, en kötü 15 olur.
5. **Ekran görüntüsünün aritmetiği doğrulandı:** İSS-POLİMETAL 6 kalıplık küme, 1'i canlı bağlı (`uretimde`), 5'i işaretsiz (`bekliyor`, makina durumu boş olduğu için bastırılmış) → pil "KALIP ÜRETİMDE 1/6". Sayı 0106 R20'den, payda 0106 R20/2'den geliyor.
6. **`tamamlandi` 0106'dan önce üç yerde okunuyordu:** satır zemini (`src/components/stock/UretimFormu.jsx:415`), form listesindeki "n/m" sayacı (aynı dosya `:516`) ve yazdırma şablonu (`src/components/stock/uretimFormPrint.js:65`); üç satır numarası da doğrulandı. Kullanıcıya görünmeyen bir sonucu yoktu; 0106 onu ilk kez bir durum kaynağı yaptı.
7. **`kapali` bugün yalnız form ekranında (`src/components/stock/UretimFormu.jsx`) geçiyor.** **Okuma:** `:214` (yeni kalıp eklemeyi engelliyor), `:325` ve `:348` (düğme ile şerit dalı), `:523` (listede "kapalı" yazıyor). **Yazma ve varsayılan:** `:39` (kayıt varsayılanı), `:105` (kopyalama), `:327` ve `:340` (sonlandır ve geri al). Okuma iddiası doğru, sayım eksikti (QA turu K-3). Türetmeye hiç girmiyor ve Karar 2 ile girmeyecek.
8. **Türetmede `uretimde`nin koşulu "canlı bağ ve `tamamlandi` yok".** Kullanıcı satırı tamamlandı işaretlemediği sürece kalıp sonsuza kadar üretimde görünür; ekran görüntüsündeki MENEKŞE ET GALERİSİ'nin yedi kalıbı bu durumda.
9. **Hiçbir türetme yolu bugün `teslim` vermiyor** (`kalipDurumuTuret` dört dalının hiçbiri). R1 ilk `teslim` yolunu açar; üretimi bitmiş kalıbın çıkışı Karar 2 ile elle kalır, yani kalıp başına bir seçimdir ve medyan küme 5'tir (ölçüm 4). Bu, spec'in bilerek açık bıraktığı tek iştir (X2).
10. **Harita şekli kütüphane içidir:** `uretimFormHaritasi`'nın sonucu üç yerde kuruluyor (`Customers.jsx:117`, `Dashboard.jsx:200`, `UretimFormu.jsx:22` ve `:232`) ve hepsinde yalnız kütüphane fonksiyonlarına parametre olarak veriliyor; hiçbir ekran `harita.get(...)` yazmıyor. Karar 2 ile bu şekle dokunulmuyor (C5).
11. **Kalıp kartının 0106 öncesi hâli** commit `d7aacc0^`, `CustomerDetailModal.jsx:1088-1102`: koşul (`:1088`), `KartBolum` ile `flex` + `wrap` kap ve kalıp başına tek `span` (`:1089-1101`, on üç satır), kapanış (`:1102`). Geri dönüş bu on beş satırlık bloktur; `extraSatistan` ifadesi ve `detailKalipSatisAdedi` prop'u iki sürümde birebir aynıdır (doğrulandı).
12. **`ayna-kalip-durumu` iki dosyada:** `CustomerDetailModal.jsx:1116` (kalkar) ve `CustomerAddEditForm.jsx:366` (kalır). Kimliği okuyan yedi test satırının hangi bileşeni çizdiği **bu turda ölçüldü ve R17/2'ye yazıldı**, uygulama turuna bırakılmadı: form (kalır) `ui/extra-kalip-isareti-0107.test.jsx:71` ve `:165` ile `ui/musteri-durumu-0106.test.jsx:161` ve `:253`; detay (kalkar) `ui/extra-kalip-isareti-0107.test.jsx:74` ile `ui/musteri-durumu-0106.test.jsx:164` ve `:273`.
13. **`kalipPili`'nin ikinci parametresi** yalnız `satirDurumu` (`:189`) ve saf testin yardımcı fonksiyonu (`musteri-durumu-0106.test.js:126`) tarafından veriliyor; ekranlar `kalipPili`'yi hiç çağırmıyor (0106 taraması bunu zaten yasaklıyor).
14. **Ayna satırların tamamı `partSaleId` taşıyor** (1219 ayna, 1219 satış). 0106'nın "kimliksiz eski ayna satırlar iki kez sayılır" bilinen sınırının bu veride karşılığı yok.

### QA turu ölçümleri (2026-10-25)

15. **Ters çevrilen beklentileri saydım: on sekiz beklenti, altı dosya** (*plan turu Karar 23 ile düzeltildi: ölçülen sayı yirmi iki beklenti, beş dosya; aşağıdaki liste QA turundaki hâliyle durur*). `tests/musteri-durumu-0106.test.js`: AC-7 (`:68`), AC-11'in üç expect'i (`:76-78`), AC-12'nin dördüncüsü (`:89`), AC-13'ün ikincisi (`:92`), Karar 31'in ilki (`:81`), AC-18 (`:130`), AC-19'un üçü (`:133-135`), AC-21'in ikincisi (`:143`), AC-40 ve AC-42'nin küme beklentisi (`:168`), AC-29'un `"KALIP SİPARİŞİ BEKLİYOR 2/3"`u (`:180`). `tests/ui/musteri-durumu-0106.test.jsx`: AC-17 ve AC-22 (`:117`), AC-40'ın ikisi (`:149-152`), AC-14 ve AC-13'ün `"Otomatik (Sipariş bekliyor)"`u (`:237`), AC-38'in detay yarısı (`:266-279`), AC-39'un detay satırı yarısı (`:283`). `tests/ui/extra-kalip-isareti-0107.test.jsx`: **AC-28** (`:68-75`; iki yarısı birden, çünkü metin değişir **ve** detaydaki öğe kalkar, yani kriterin "formda ve detayda harfi harfine aynı" iddiası konusuz kalır) ve **AC-26** (`:76-80`; pil hiç çizilmez). `tests/ui/uretim-formu-bagi-0108.test.jsx`: **AC-29**'un ilk bloğu (`:189-194`). `tests/ui/makina-durumu-ondoldur-0109.test.jsx`: **AC-20** (`:75-80`). **R1/3 ile `tests/uretim-formu-bagi-0108.test.js` AC-43 (`:86-94`) listeden düşer**, çünkü damgalı kayıt `teslim` türetmez.
16. **Türetilen etiketin üç çağıranı ölçüldü:** `kalipDurumuTuret` yalnız `CustomerAddEditForm.jsx:372`, `MachineTimeline.jsx:353` ve `CustomerDetailModal.jsx:1122`'de (kalkar) çağrılıyor; ilk seçeneğin metni `otomatikEtiket` ile `musteriDurumu.js:87-89`'da kuruluyor. `ui/makina-durumu-ondoldur-0109.test.jsx:79` yeni eklenen kalıbın bugün "Otomatik (Sipariş bekliyor)" yazdığını ölçüyor, yani R1'in bu ekranda görünür bir sonucu var (R18).
17. **`durumBaglami` zinciri:** `Customers.jsx:680` → `CustomerDetailModal` (`:65` varsayılan) → üç kullanım: `:1117` (ayna ibare, kalkar), `:1122` (seçici, kalkar) ve **`:1197` zaman çizelgesine iletme (kalmak zorunda)**. Çizelge `turetilen`'i oradan okuyor (`MachineTimeline.jsx:353`). Kart kalkınca pencerede kullanılmıyor görünen bir prop kalır (R13/2).
18. **Çelişkinin ölçüsü:** `kalipBekliyorMu` işaret **ya da** damga dolu ve bağ canlı değilse `true` döner (`musteriDurumu.js:121-125`); 0108 AC-43 (`tests/uretim-formu-bagi-0108.test.js:86-94`) aynı kaydın `bekliyor` ya da `gonderildi` türettiğini sabitliyor. R1 bağın canlılığına bakarsa aynı kayıt üretim formunun getirmesinde bekleyen, müşteri listesinde teslim edilmiş olur; ölçüm 2'ye göre bugünkü veride bu hâlde yedi Extra Kalıp var. R1/3 bu çelişkiyi hiç doğurmaz ve kullanıcının şikayetini yine tam çözer, çünkü müşteri kalıplarının hiçbirinde damga yok (ölçüm 2: 0 ve 0).
19. **0106 X11 sapmasının görünürlüğü:** `kalipIdx` konum olduğu için kalıp silinince bağ kayar ve son konumun satırı hiçbir kalıba düşmez (`tests/musteri-durumu-0106.test.js:102-121`). Satırı düşen kalıp damga taşır, yani R1/3 ile `bekliyor` türetmeye devam eder ve bugünkü gibi pille görünür. R1 bağın canlılığına bakarsa aynı kalıp `teslim` türetir ve "yanlış ama görünür" olan sapma "yanlış ve sessiz" olurdu (R7/2).
20. **Yazma yolu kapanmıyor, derinleşiyor:** detay penceresinin "Düzenle" düğmesi `cust_detail_edit` ile çizilir (`CustomerDetailModal.jsx:1153`) ve `onOpenEdit` → `Customers.openEdit`'i ek izin denetimi olmadan çağırır (`Customers.jsx:690`, `:261`); liste satırındaki düzenleme düğmesi ayrıca `cust_edit` ister (`:663`). Yani yalnız `cust_detail_edit` taşıyan kullanıcı da formu açıp kalıp durumunu yazabilir; R4'ün güvencesi korunuyor, bedel iki tık (R16/2).
21. **Süzgeç doğrulandı:** `satirDurumu.teslimBekliyor` = makina `hazir` ya da kümede `hazir` (`musteriDurumu.js:190`); R1 yalnız `bekliyor`u `teslim`e çeviriyor, `hazir` üretmiyor ve `hazir` tüketmiyor, yani ölçüt değişmiyor. Kanıt fikstüründe süzgeç sayısı önce 3 (862, 865, 866), sonra 3; `musteriler-0106-suzgec` ekranının `etiket:Teslim Bekleyenler (3)` adımı geçerli kalıyor (R12, AC-16).
22. **Kontrast kayıtları doğrulandı:** `tests/tasarim-kontrast.test.js:88-94`'teki yedi müşteri pili kaydı `src/lib/musteriDurumu.js`'i okuyor ve R3 ile C7 gereği yerinde kalıyor; amber `amb700`/`ambBg2` çifti "KALIP SİPARİŞİ BEKLİYOR" için duruyor.
23. **Kanıt kayıtlarını saydım ve fikstürle hesapladım** (`docs/evidence/kanit-eslemesi.json`, `scripts/evidence/0009-sayfa.jsx:338-356`): **değişen beş kayıt** `musteriler-0106-piller` ve `musteriler-0106-suzgec` (`Customers.jsx`), `musteri-detay-0106-kalip` (**iki dosyada**: `CustomerDetailModal.jsx` ve `MachineTimeline.jsx`) ve `musteri-formu-0106-durum` (`CustomerAddEditForm.jsx`); hepsi bugün `beklenen: "ayni"`. **Değişmeyen üç kayıt** `musteri-formu-0107-ayna`, `-dar` ve `kalip-formu-0107-duzenle`, çünkü 862 kaydının tek kalıbı ayna ve bağlı satışın durumu `hazir`. Satır satır fark: FLORYA UN "KALIP ÜRETİMDE 1/4" → sayısız, UFUK MAKİNA "KALIP SİPARİŞİ BEKLİYOR 3/3" → pil yok, ÇÖMLEK GIDA "KALIP HAZIR · TESLİM BEKLİYOR 1/2" → sayısız, OX CO "KALIP ÜRETİMDE 2/4" → sayısız; formda 867 kaydının K40 ve O70 seçicileri "Otomatik (Sipariş bekliyor)" → "Otomatik (Teslim edildi)".
24. **`kalipPili`'nin ikinci parametresini geçiren iki yer** (ölçüm 13 doğrulandı): `satirDurumu` (`musteriDurumu.js:189`) ve saf testin yardımcı fonksiyonu (`tests/musteri-durumu-0106.test.js:126`). İkincisi güncellenmezse argüman sessizce yok sayılır ve tarama bunu yakalamaz, bu yüzden AC-15 o satırı da kapsar.
25. **Spec'in bölümlerini 0109 ile karşılaştırdım:** 0110'da Görsel kanıt, Definition of Done ve Karar kaydı bölümleri yoktu; 0109'da üçü de vardı (`specs/done/0109-makina-durumu-stoktan-on-doldurulur.md`). Üçü bu turda eklendi (Karar 13, Karar 16).

---

## Kararlar (Takım Yöneticisi, 2026-10-25)

### Karar 1. İşaretsiz ve bağsız kalıp `teslim` türetir, değer elle değiştirilebilir kalır

Gerekçe: "üretim formuna gönder" işareti siparişin sinyalidir ve hem müşteri formunda hem Extra Kalıp satış formunda kalıbın yanında duruyor. İşaretlenmemiş kalıp sipariş değildir, kaydın anlattığı makinanın yanında gelen kalıptır. Takım Yöneticisi'nin tek şartı kullanıcının değeri değiştirebilmesidir: türetilen değer hiçbir yere yazılmaz (R5), elle seçilen değer her zaman önündedir (R4) ve iki yazma yolu açık kalır (R16: müşteri formunun kalıp ızgarası, zaman çizelgesinin Extra Kalıp seçicisi). Bedeli kabul edildi: yeni bir satışta kalıplar henüz işaretlenmemişken "kalıpları sipariş edilmedi" uyarısı çıkmaz; kullanıcı kutuyu işaretleyince kayıt "KALIP SİPARİŞ VERİLDİ" ile zaten görünür hâle gelir ve ölçüm 3 bu uyarının bugüne kadar hiç çıkmadığını gösteriyor.

Reddedilen seçenekler ve ölçülmüş bedelleri:
- `bekliyor` kalsın, kapısı yalnız makina durumu `montaj` ya da `hazir` iken açılsın: eski kalıplar seçicide ve müşteri formunda "Otomatik (Sipariş bekliyor)" yazmaya devam ederdi, yani istek pilde karşılanır ekranın geri kalanında karşılanmazdı; kural da iki yerde (türetme ve pil) yaşamaya devam ederdi.
- Extra Kalıp ile müşteri kalıbı ayrışsın (müşteri kalıbı `teslim`, Extra Kalıp `bekliyor`): 1219 canlı Extra Kalıp'ın 1217'si işaretsiz, yani kapı kaldırılırsa 545 müşteri amber "KALIP SİPARİŞİ BEKLİYOR" pili alırdı; kapı kalsaydı makina durumu dolan ilk kayıtta aynı gürültü geri gelirdi (0106 ölçüm 8).
- Yürürlük tarihi ayarı: yeni ayar alanı, Ayarlar ekranı ve kalıp başına tarih çözümü (müşteri kalıbı makinanın tarihinden, Extra Kalıp kendi tarihinden) gerekirdi; aynı sonucu çok daha pahalıya verirdi.

**QA turu daraltması (2026-10-25, Karar 7):** "bağsız" ölçütü `uretimFormId` alanının **boşluğu** olarak sabitlendi; damga taşıyan ama bağı kopmuş kayıt bu kararın kapsamına girmez. Kararın gerekçesi ("işaret siparişin sinyalidir") damgalı kayda uymuyor, çünkü o kayıt bir kez forma girmiştir.

### Karar 2. Üretimi biten kalıbın teslime geçişine bu spec'te dokunulmaz

Takım Yöneticisi'nin gerekçesi: dönemi sonlandırılmamış ama teslim edilmiş kalıplar var, yani "Dönemi Sonlandır" bir teslim sinyali değil. Analistin önerisi (kapalı dönemin tamamlanmış satırı `teslim` sayılsın) bu yüzden reddedildi: kuralı koymak, veride olmayan bir bilgiyi varmış gibi otomatikleştirirdi ve yanlış kalıpları sessizleştirirdi.

Bugünkü hâl korunur (R7, C5): tamamlanmış satır `hazir` kalır, kalıp "KALIP HAZIR · TESLİM BEKLİYOR" pilini ve "Teslim Bekleyenler" süzgecindeki yerini elle "Teslim edildi" yazılana kadar korur. Ölçülmüş bedel kayda geçti: çıkış kalıp başına bir seçimdir ve medyan küme 5'tir (ölçüm 4, ölçüm 9), yani süzgeç zamanla dolar. Bu, kendi kararını ve kendi spec'ini bekleyen ayrı bir iştir (X2) ve README'ye açık bulgu olarak yazılır.

### Karar 3. Payda gösterilebilir küme olur, türdeş kümede sayı yazılmaz

"KALIP ÜRETİMDE 1/6" yerine "KALIP ÜRETİMDE"; {2 `uretimde`, 1 `hazir`} hâlâ "KALIP ÜRETİMDE 2/3" yazar. Gerekçe: sayının tek işi "açık işin ne kadarı bu aşamada" sorusunu cevaplamaktır, kapalı işi paydaya koymak cevabı bozuyor. 0106 Karar 23 paydayı küçültmeye "bastırılan kalıpları gizler" diye karşı çıkmıştı; o gerekçe Karar 1'den sonra geçersiz kalıyor, çünkü bastırılan kalıp kavramı kalkıyor ve paydadan düşen tek şey teslim edilmiş kalıp oluyor.

Reddedilen seçenekler: sayının tamamen kalkması (birden çok kalıbı olan 1106 kayıtta "kaçı" bilgisi kaybolurdu) ve bugünkü hâlin korunması (şikayetin kendisi çözülmezdi; Karar 1 tek başına "1/6"yı "1/6" bırakır, çünkü teslim edilmiş kalıp da paydada sayılır).

### Analistin spec'te verdiği kararlar

- **Karar 4.** `bekliyor` değeri silinmez, elle seçilebilen bir durum olarak kalır (R3). Değeri listeden çıkarmak elle "Sipariş bekliyor" yazılmış kayıtları sessizce başka bir duruma düşürürdü ve 0106'nın paletini bozardı.
- **Karar 5.** Detay penceresinde ayna satırın salt okunur durum ibaresi de kalkar (R13). Takım Yöneticisi "eski hâline dönsün" dedi; 0106 öncesi kartta satır düzeni yoktu, yalnız etiketler vardı. İbareyi tek başına bırakmak kartta iki ayrı satır biçimi yaratırdı.
- **Karar 6.** Üç parça (türetme, pil sayısı, kalıp kartı) tek spec'tir. Üçü de aynı iki dosyaya ve aynı test dosyalarına dokunuyor, görsel kanıt turu ortak; ayrı spec'ler aynı ekranları iki kez çekerdi.

### QA turunda verilen kararlar (2026-10-25)

### Karar 7. R1'in ölçütü alan boşluğudur, bağın canlılığı değil (B-1)

R1 "İşareti ve canlı bağı olmayan" diyordu ve iki okunuşu vardı: ölçüt `!uretimFormGonder && !bagCanliMi(...)` ise damgası dolu ama bağı kopmuş işaretsiz kalıp da `teslim` türetirdi; ölçüt `!uretimFormGonder && !doluMu(uretimFormId)` ise türetmezdi. AC-3 ilkini seçmiş, AC-7 ise "0108'in saf testi dokunulmadan yeşil kalır" demişti; ikisi bir arada **sağlanamıyordu**, çünkü 0108 AC-43 tam o kaydı ölçüyor (`tests/uretim-formu-bagi-0108.test.js:87` ve `:93`, ölçüm 18).

Karar ikinci okunuş: **damga taşıyan kayıt hiçbir hâlde `teslim` türetmez** (R1, R1/3). Gerekçe üç ölçüme dayanıyor. (1) `kalipBekliyorMu` değişmediği için (C4, R6) ilk okunuş aynı kaydı üretim formunun getirmesinde ve Anasayfa sayacında **bekleyen**, müşteri listesinde **teslim edilmiş** yapardı; 0108 AC-43 bu çaprazı bilerek sabitlemişti ve bugünkü veride tam bu hâlde yedi Extra Kalıp var (ölçüm 2, ölçüm 18). (2) Karar 1'in kendi gerekçesi "işaret siparişin sinyalidir"; üretim formu damgası aynı sinyalin daha güçlüsüdür, yani "hiç sipariş edilmemiş" argümanı damgalı kayda uymaz. (3) İkinci okunuş kullanıcının şikayetini eksiksiz çözer: müşteri kalıplarının hiçbirinde damga ya da bağ yok (ölçüm 2: 0 ve 0), yani 4866 satırın tamamı bu okunuşla da susar. İlk okunuş karşılığında hiçbir şey kazandırmıyor, yalnız iki ekranın birbiriyle çelişmesini satın alıyordu. Sonuç: AC-3 ters çevrildi, AC-7 doğru oldu, "Ters çevrilen kriterler" satırından 0108 maddesi düştü ve C4 ile C4/2 gerçekten sağlanıyor.

### Karar 8. Ters çevrilen kabul kriterleri adıyla sayılır (B-2)

Satır yalnız R ve Karar numaraları sayıyordu; ölçüm 15 on sekiz beklentinin altı dosyada ters çevrildiğini gösterdi (0106'nın iki dosyası, 0107, 0108 ve 0109'un UI testleri). Projenin kuralı kırmızıya düşen her testin bilinçli mi gerileme mi olduğunun **önceden** yazılı olmasıdır (0092, 0097 ve 0109 aynı deseni izledi). Karar: satır kriter numaralarını saysın, her beklenti test yorumunda "spec 0110 ile" notu alsın ve AC-23 ters çevrilenlerin sayısını sabitlesin.

### Karar 9. `durumBaglami` prop zinciri korunur (B-3)

Kart kalkınca pencerede kullanılmıyor **görünen** bir prop kalıyor, ama `:1197` onu zaman çizelgesine iletiyor (ölçüm 17). R15 "dokunulmaz" diyor; dokunmamanın yolu bu satırı korumaktır ve en olası temizlik hatası tam budur. Karar: R13/2 prop'u, varsayılanını, iletme satırını ve kalkacak içe aktarmaların tam listesini yazar; AC-19 çizelgenin ilk seçeneğinin dolu geldiğini ölçer.

### Karar 10. `ayna-kalip-durumu` eşlemesi spec'e yazılır, uygulama turuna bırakılmaz (Ö-3)

Ölçüm 12 "hangisinin hangi bileşeni çizdiği uygulama turunda ayrılmalı" diyordu; bu turda yedi test satırının tamamı ölçüldü. `getByTestId` tek öğe bulamazsa hata verir, yani aynı kimliğin iki bileşende durduğu bir testte hangi satırın silineceği yazılı olmazsa geliştirici deneyerek bulur ve yanlış yarıyı silebilir. Karar: eşleme R17/2'ye yazıldı, ölçüm 12'nin son cümlesi sonuçla değiştirildi.

### Karar 11. 0106'nın X11 sapması görünür kalır (Ö-5)

Karar 7'nin doğal sonucu kayda geçti: satırı düşen kalıp damga taşıdığı için `bekliyor` türetmeye devam eder ve bugünkü gibi pille görünür (R7/2, ölçüm 19). Kapsam dışı bırakmak (X1) bir sapmanın görünürlüğünü azaltmaya izin vermez; hangi yönde değiştiğinin yazılı olması gerekir.

### Karar 12. Türetilen etiketin metni bilinçli değişir, mekanizmasına dokunulmaz (Ö-4)

R1'den sonra yeni eklenen, henüz işaretlenmemiş kalıbın seçicisi "Otomatik (Teslim edildi)" yazacak ve formun ayna ibaresi işaretsiz Extra Kalıp'ta "Teslim edildi" diyecek (ölçüm 16). Karar 1 bedeli "pilde uyarı çıkmaz" diye kaydetmişti, ama gerçek bedel pil değil: yanlış ifade kullanıcının **veri girdiği** ekranda görünüyor. Etiketi duruma göre değiştirmek yeni bir kavram getirir (R3 ve C7 korunur), bu yüzden karar kaydetmek ve duyurmaktır: R18 bilinen sınırı ve sürüm notu cümlesini yazar, C6/2 iki ekranı 0 piksel listesinden çıkarır, AC-22 onları değişenler listesine alır, AC-26 cümleyi ölçer.

### Karar 13. Görsel kanıt bölümü eklenir, değişen kayıtlar adıyla sayılır (Ö-1)

AC-22 tek ekran adı vermiyordu. Ölçüm 23 beş kaydın değiştiğini, üçünün değişmediğini ve `musteri-detay-0106-kalip`'in **iki dosyada** kayıtlı olduğunu gösterdi. `tests/kanit-eslemesi.test.js` varsayılan olarak 0 piksel bekler, yani kayıt `degisti` + `onay` almazsa kanıt testi kırmızı kalır. Karar: 0109'daki gibi bir Görsel kanıt bölümü eklenir, C8 "adı sayılmayan kayıt `ayni`den çıkmaz" kuralını yazar.

### Karar 14. Detay penceresinde kalıp durumunun hiç görünmemesi bilinen sınır olarak kaydedilir (Ö-6)

R13 ve R17 kartın iki durum göstergesini de kaldırıyor, R15 ise aynı pencerede makina durumu satırını koruyor; yani pencerede makina durumu okunur, kalıp durumu okunamaz. 0106 Karar 20 seçiciyi oraya tam bu okunabilirlik için koymuştu. Takım Yöneticisi'nin isteği açıktır ve tartışmaya açılmıyor, ama kaybedilen yetenek kayda geçmezse ileride "durum neden detayda görünmüyor" sorusu yeni bir istek olarak geri döner. Karar: R19 bilinen sınırı ve sürüm notu cümlesini yazar, AC-17 "kartta hiçbir durum bilgisi yazmaz, bu bilinçlidir" notunu taşır.

### Karar 15. Yazma yolunun derinleşmesi kayda geçer (K-10)

R16 "yazma yolu kapanmaz, tekilleşir" diyordu; ölçüm 20 kapanmadığını doğruladı (detay penceresinin "Düzenle" düğmesi `cust_detail_edit` ile formu açıyor ve `openEdit` ek izin istemiyor), ama müşteri kalıbının durumunu yazmak bundan sonra formu açıp **kaydetmeyi** gerektiriyor. R16/2 bedeli yazar.

### Karar 16. Definition of Done bölümü eklenir (Ö-2)

Spec'te tamamlanma tanımı yoktu (ölçüm 25); her önceki spec'te vardı ve yayın politikası orada duruyor. Karar: dokunulacak test dosyaları, kanıt turu, README güncellemesi, açık bulgunun korunması, sürüm notu ve "Commit ve sürüm yayını yalnız açık talimatla yapılır" satırı eklenir.

### Plan turunda verilen kararlar (2026-10-25, Takım Yöneticisi bütün önerileri onayladı)

- **Karar 17.** R9'un "türdeş kümede sayı yok" kuralı tek koşulla yazılır: sayı yalnız `sayi < gösterilebilir kümenin büyüklüğü` iken yazılır. Gerekçe: tek kalıplı kümenin bugünkü "sayı yok" kuralını da kendiliğinden kapsar, ikinci bir dal gerekmez.
- **Karar 18.** Gösterilebilir küme süzgeci yalnız `teslim`'i dışarıda bırakır (R8'in "bugün yalnız `teslim`" ifadesi). Listeyi genelleştirmek yeni bir kavram getirirdi.
- **Karar 19.** Kalıp kartını kaydırmadan çeken yeni ekran `musteri-detay-0110-kalip` (OX CO, dört kalıp) eklenir. `musteri-detay-0106-kalip` zaman çizelgesine kaydırıldığı için kartı görüntünün dışında bırakabiliyordu. Ekran bu spec'ten önceki kodla da çekildi, yani ilk raporunda "önce görüntüsü yok" değil gerçek bir fark taşır ve `degisti` + onay alır.
- **Karar 20.** `musteri-detay-0106-kalip` kaydı ölçüme göre işlenir: değiştiği ölçüldü, Görsel kanıt tablosundaki gibi `degisti` alır.
- **Karar 21.** AC-29 gerçek `Customers` ile, `customerActions: ["cust_detail_edit"]` kullanıcısıyla ölçülür: detayın "Düzenle"si → formdaki kalıp seçicisi → Kaydet → kayıttaki `kalipDurumu`.
- **Karar 22.** `CLAUDE.md` güncellemesi uygulama commit'ine girer (0108 ve 0109'da kapanışa kalan belge yüzünden uygulama commit'i tek başına bir belge testini kırıyordu).
- **Karar 23.** AC-23'ün sayımı plan dosyasında satır satır tutulur; sayıyı sabitleyen ayrı bir test yazılmaz (bir yorum silinince anlamsız kırılırdı). **Ölçülen sayı spec'in sayısından farklı:** ters çevrilen beklenti **yirmi iki, beş dosyada** (yirmi biri test beklentisi, biri Karar 24'ün sonucu olan `tests/extra-kalip-isareti-0107.test.js` kanıt kaydı beklentisi). R1/3 (QA turu Karar 7) sonrası 0106 saf testinin AC-11'i (`:76-78`) ve Karar 31'i (`:81`) ile `tests/ui/uretim-formu-bagi-0108.test.jsx` AC-29'u **kırılmaz** (damgalı kayıt `teslim` türetmez); listeye 0106 saf testinin AC-29 küme beklentisi zaten girmişti, ölçümün kaçırdığı yarılar 0106 UI testinin triyaj bulgusu 3'ünün detay yarısıdır. Tam liste planın §4'ünde. `tests/uretim-formu-bagi-0108.test.jsx` dosyası dokunulmadan yeşil kalır.
- **Karar 24 (uygulama turu, Takım Yöneticisi onayı).** Ölçüm 23'ün "değişmeyen üç kayıt" hesabı eksikti: `musteri-formu-0107-ayna`, `-dar` ve `kalip-formu-0107-duzenle` pencerelerinin içeriği piksel piksel aynı kaldı, ama pencerenin arkasındaki karartılmış müşteri listesi değişti (UFUK MAKİNA'nın "KALIP SİPARİŞİ BEKLİYOR 3/3" pili kalkınca Durum sütunu daralıyor ve satırlar kayıyor). Üç kayıt `degisti` + `Takım Yöneticisi · 2026-10-25 · spec 0110 R8, R9` onayı alır; C8 ve AC-31 bu üç adı değişenler listesine alır.

---

## Kabul kriterleri

### A. Türetme

- **AC-1.** İşaretsiz, bağsız müşteri kalıbı `teslim` türetir ve kayda hiçbir alan yazılmaz.
- **AC-2.** İşaretsiz, bağsız Extra Kalıp satışı `teslim` türetir.
- **AC-3.** `uretimFormId`'si dolu ama formu çöpte, formu yok ya da o formda satırı olmayan kalıp **`teslim` türetmez**: işaretsizse `bekliyor`, işaretliyse `gonderildi` (R1/3; 0108 Karar 17 ve AC-43 aynen kalır, QA turu Karar 7).
- **AC-4.** Canlı bağlı, tamamlanmamış satır `uretimde`; canlı bağlı, tamamlanmış satır `hazir` türetir.
- **AC-5.** Dönemi sonlandırılmış (`kapali`) formun tamamlanmış satırı da `hazir` türetir ve `kalipDurumuTuret` ile `uretimFormHaritasi` `kapali` alanını hiç okumaz (Karar 2; kaynak taraması).
- **AC-6.** Elle yazılmış `bekliyor` türetilenin önüne geçer ve pilde amber çizilir; elle yazılmış değer müşteri formunun kalıp ızgarasından ve zaman çizelgesinin Extra Kalıp seçicisinden değiştirilebilir.
- **AC-7.** `kalipBekliyorMu`, `musteriKalibiBekliyorMu` ve `extraKalipBekliyorMu` bu spec'ten önceki bütün girdilerde aynı sonucu verir ve **`tests/uretim-formu-bagi-0108.test.js` dokunulmadan yeşil kalır** (AC-43 dahil; R1/3 bunu mümkün kılar, QA turu Karar 7). *Plan turu Karar 23 ile:* 0108'in UI testinin AC-29'u da ters çevrilmez (damgalı kayıt R1/3 ile `bekliyor` türetir), `tests/ui/uretim-formu-bagi-0108.test.jsx` dokunulmadan yeşil kalır.
- **AC-8.** Üretim formunun "Bekleyen Kalıpları Getir"i, Anasayfa sayacı ve yeni formun başlangıç tarihi bu spec'ten önceki sonucu verir.

### B. Pil

- **AC-9.** Ham veriyle: altı kalıplı bir kayıtta biri canlı bağlı ve satırı tamamlanmamış, beşi işaretsiz ve damgasızsa küme {5 `teslim`, 1 `uretimde`} türer ve pil "KALIP ÜRETİMDE" yazar, sayı yazmaz (ekran görüntüsündeki kaydın aritmetiği, ölçüm 5; kriter türetmeyi de ölçer, QA turu K-6).
- **AC-10.** {2 `uretimde`, 1 `hazir`} kümesi "KALIP ÜRETİMDE 2/3" yazar.
- **AC-11.** {7 `uretimde`, 1 `teslim`} kümesi "KALIP ÜRETİMDE" yazar.
- **AC-12.** Kümenin tamamı `teslim` ise kalıp pili çizilmez.
- **AC-13.** Küme boşsa kalıp pili çizilmez.
- **AC-14.** Makina durumu boş olan kayıtta elle `bekliyor` yazılmış kalıp pili çizilir (R10; kapı kalktı).
- **AC-15.** `kalipPili` ikinci parametre almaz, `satirDurumu` ona makina durumu geçirmez (kaynak taraması) ve ikinci argümanı bugün geçiren tek test satırı olan `tests/musteri-durumu-0106.test.js:126`'daki yardımcı fonksiyon da tek argümana iner (ölçüm 24; güncellenmezse argüman sessizce yok sayılır ve tarama bunu yakalamaz).
- **AC-16.** "Teslim Bekleyenler" süzgecinin sayısı ve kapsadığı kayıtlar, aynı veride bu spec'ten önceki sonucun aynısıdır.

### C. Kalıp kartı

- **AC-17.** Müşteri detay penceresinin kalıp kartı yalnız etiketleri çizer: `combobox` yok, `detay-kalip-satiri` yok, `ayna-kalip-durumu` yok. **Kartta hiçbir durum bilgisi yazmaz ve bu bilinçlidir** (R19, QA turu Karar 14).
- **AC-18.** Etiketlerin metni, sırası ve `extraSatistan` renk ayrımı 0106 öncesi hâliyle aynıdır.
- **AC-19.** Aynı pencerede `detay-makina-durumu` ve zaman çizelgesinin Extra Kalıp durum seçicisi aynen çalışır (yazma dahil) ve çizelgenin seçicisinin ilk seçeneği **dolu** `Otomatik (<türetilen>)` gelir, yani `durumBaglami` penceresinden geçmeye devam eder (R13/2, QA turu Karar 9).
- **AC-20.** Müşteri formunun kalıp ızgarasındaki durum seçicisi, `ayna-kalip-durumu` ve `ayna-uretim-formu` aynen kalır.
- **AC-21.** `cust_detail_edit` izni olmayan kullanıcıda kart aynı görünür (seçici olmadığı için izne bağlı dal kalmaz).
- **AC-22.** Görsel kanıt: Stok ekranı, Anasayfa (bekleyen kalıp sayacı dahil), Çöp Kutusu ve üretim formu 0 piksel. **Değişen dört ekran:** müşteri listesi (pil metni), müşteri detay penceresi (kart), **müşteri formunun kalıp ızgarası** ve **zaman çizelgesinin Extra Kalıp seçicisi** (son ikisi yalnız türetilen etiket metninde, C6/2, R18). Kayıt adları ve onay metni Görsel kanıt bölümünde.

### D. QA turu kriterleri (2026-10-25)

- **AC-23.** Ters çevrilen beklentiler **yirmi ikidir** ve beş dosyadadır (ölçüm 15, Karar 8, plan turu Karar 23 ve 24; liste planın §4'ünde); her biri test yorumunda "spec 0110 ile" notu taşır. `tests/uretim-formu-bagi-0108.test.js` ve `tests/ui/uretim-formu-bagi-0108.test.jsx` **listede değildir** ve dokunulmadan yeşil kalır (AC-7).
- **AC-24.** Damgası dolu ama bağı kopmuş işaretsiz kalıp hem `kalipBekliyorMu` ile **bekleyendir** hem `bekliyor` türetir; aynı kayıt üretim formunun getirmesinde, Anasayfa sayacında ve müşteri listesinin pilinde birbiriyle çelişmez (R6/2, C4/2, ölçüm 18).
- **AC-25.** Hiçbir girdide `kalipBekliyorMu` `true` iken `kalipDurumuTuret` `teslim` dönmez (değişmez; 0108 AC-43 ile aynı çaprazı ölçer).
- **AC-26.** Yeni eklenen, henüz işaretlenmemiş kalıbın seçicisinin ilk seçeneği "Otomatik (Teslim edildi)" yazar; "Üretim formuna gönder" işaretlenince "Otomatik (Sipariş verildi)" olur. İşaretsiz Extra Kalıp'ın müşteri formundaki ayna ibaresi "Teslim edildi · Extra Kalıp satışından" olur. Üçü de bilinçlidir (R18, Karar 12) ve sürüm notunda yazar.
- **AC-27.** Detay penceresinde kalıp durumu hiçbir biçimde okunamaz; makina durumu satırı okunur kalır. Bu bilinen sınır olarak yazılıdır (R19, Karar 14).
- **AC-28.** `durumBaglami` prop'u, `CustomerDetailModal.jsx:65` varsayılanı ve `:1197` iletme satırı durur; `uretimFormHaritasi` liste, form ve detay açılırken toplam **bir kez** çağrılır (0106 AC-29 dokunulmadan yeşil kalır, R13/2).
- **AC-29.** Yalnız `cust_detail_edit` taşıyan (yani `cust_edit`'i olmayan) kullanıcı detay penceresinin "Düzenle" düğmesiyle formu açıp kalıp durumunu yazabilir; R4'ün güvencesi bu kullanıcıda da sağlanır (R16/2, ölçüm 20).
- **AC-30.** 0106'nın X11 bilinen sınırında satırı düşen kalıp `bekliyor` türetmeye devam eder ve pille görünür; `teslim` türetmez (R7/2, ölçüm 19).
- **AC-31.** Görsel kanıt bölümünde adı sayılan kayıtlar `beklenen: "degisti"` + `onay` taşır ve adı sayılmayan hiçbir `musteri-*` kaydı `ayni`den çıkmaz (C8, ölçüm 23). *Plan turu Karar 24 ile:* `musteri-formu-0107-ayna`, `-dar` ve `kalip-formu-0107-duzenle` 0 piksel kalmaz, pencere içerikleri aynı kalır; adları tabloya alındı.
- **AC-32.** `tests/tasarim-kontrast.test.js:88-94`'teki yedi müşteri pili kaydı dokunulmadan yeşil kalır (C7, ölçüm 22).

---

## Görsel kanıt

Taban `0110-taban-piksel-raporu.json` (bu spec'ten önceki kodla, 0 fark), iş raporu `0110-piksel-raporu.json`. Kayıtlar `docs/evidence/kanit-eslemesi.json`'da; onay metni her değişen kayıtta `Takım Yöneticisi · 2026-10-25 · spec 0110 R8, R9, R13`.

| Ekran | Dosya kaydı | Beklenen | Neden |
|---|---|---|---|
| `musteriler-0106-piller` | `src/components/Customers.jsx` | `degisti` | Dört satırın pil metni: FLORYA UN "KALIP ÜRETİMDE 1/4" → sayısız, UFUK MAKİNA "KALIP SİPARİŞİ BEKLİYOR 3/3" → pil yok, ÇÖMLEK GIDA "KALIP HAZIR · TESLİM BEKLİYOR 1/2" → sayısız, OX CO "KALIP ÜRETİMDE 2/4" → sayısız (R8, R9, R10) |
| `musteriler-0106-suzgec` | `src/components/Customers.jsx` | `degisti` | Aynı satırlar süzülmüş hâlde; süzgeç sayısı 3'te kalır ve `etiket:Teslim Bekleyenler (3)` adımı geçerli (R12, ölçüm 21) |
| `musteri-detay-0106-kalip` | `src/components/customers/CustomerDetailModal.jsx` **ve** `src/components/customers/detail/MachineTimeline.jsx` (iki kayıt) | `degisti` | Kart sade hâline döner: satır düzeni, seçici ve ayna ibaresi kalkar (R13, R17). Çizelgenin seçicisi iki tarafta da "Otomatik (Hazır)" (bağlı satış `hazir`); `MachineTimeline.jsx` kaydının farkı karttan gelir (triyaj bulgu 1) |
| `musteri-formu-0106-durum` | `src/components/customers/CustomerAddEditForm.jsx` | `degisti` | *Ölçülen fark (triyaj bulgu 1):* 867'nin K40 ve O70'i fikstürde elle `teslim` taşır, seçiciler iki tarafta da "Teslim edildi"; fark yalnız pencerenin arkasındaki müşteri listesinden gelir (Karar 24'ün nedeni, piksel sayısı `musteri-formu-0107-ayna` ile aynı) |
| `musteri-formu-0110-teslim` (yeni, triyaj bulgu 1) | `src/components/customers/CustomerAddEditForm.jsx` | `degisti` | FLORYA UN'un (863) Y50, Y55 ve K40 seçicileri "Otomatik (Sipariş bekliyor)" → "Otomatik (Teslim edildi)" (R18, AC-26). Onay `spec 0110 R18` |
| `musteri-detay-0110-cizelge` (yeni, triyaj bulgu 1) | `src/components/customers/detail/MachineTimeline.jsx` | `degisti` | Damgasız ve işaretsiz Extra Kalıp'ın çizelge seçicisi "Otomatik (Sipariş bekliyor)" → "Otomatik (Teslim edildi)"; kart da sade hâline döner (R18, R13). Onay `spec 0110 R18` |
| `musteri-formu-0107-ayna`, `musteri-formu-0107-ayna-dar` | `CustomerAddEditForm.jsx` | `degisti` (plan turu Karar 24) | Pencerenin içeriği aynı (862 kaydının ayna satırı `hazir`); arkadaki karartılmış listede Durum sütunu daralır. Onay `spec 0110 R8, R9` |
| `kalip-formu-0107-duzenle` | `PartSaleForm.jsx` | `degisti` (plan turu Karar 24) | Aynı neden |
| `musteri-detay-0110-kalip` (yeni, plan turu Karar 19) | `CustomerDetailModal.jsx` | `degisti` | Kalıp kartı kaydırılmadan: satır düzeni ve dört seçici kalkar, etiketler tek akışta (R13) |
| Öteki bütün `musteri-*`, `stok-*`, `uygulama-*`, `ayarlar-*` kayıtları | — | `ayni` | C6 ve C8 |

Sade kart için yeni bir ekran açılırsa adı `musteri-detay-0110-kalip` olur ve ilk raporunda `fark: "önce görüntüsü yok"` doğar, `piksel` anahtarı olmaz (0009'un doğuş kuralı).

---

## Definition of Done

- **Kütüphane:** `src/lib/musteriDurumu.js`'te `kalipDurumuTuret` (R1, R1/3) ve `kalipPili` (R8, R9, R10, imzadan ikinci parametre düşer) güncellenir; `kalipBekliyorMu` gövdesi ve imzası **dokunulmaz** (C4). Modül saf kalır (C2).
- **Ekran:** `CustomerDetailModal.jsx`'in kalıp kartı `d7aacc0^` hâline döner (ölçüm 11), `durumBaglami` zinciri korunur (R13/2); `satirDurumu` `kalipPili`'ye tek argüman geçirir.
- **Yeni testler:** saf `tests/kalip-durumu-0110.test.js` (R1, R1/3, R6/2, R8, R9, R10, taramalar) ve ekran `tests/ui/kalip-durumu-0110.test.jsx` (kart, pil metinleri, izin dalı).
- **Dokunulan testler:** `tests/musteri-durumu-0106.test.js`, `tests/ui/musteri-durumu-0106.test.jsx`, `tests/ui/extra-kalip-isareti-0107.test.jsx`, `tests/extra-kalip-isareti-0107.test.js` (Karar 24), `tests/ui/makina-durumu-ondoldur-0109.test.jsx`; `tests/ui/uretim-formu-bagi-0108.test.jsx` dokunulmaz (Karar 23); her ters çevrilen beklenti "spec 0110 ile" notu alır (AC-23).
- **Dokunulmayan testler:** `tests/uretim-formu-bagi-0108.test.js` (AC-7), `tests/tasarim-kontrast.test.js` (AC-32), `tests/kanit-eslemesi.test.js` ve `tests/tasarim-kaynak.test.js` (kayıt içeriği dışında).
- **Kanıt turu:** taban ve iş raporu çekilir, Görsel kanıt tablosundaki kayıtlar `degisti` + `onay` alır, ötekiler `ayni` kalır (C8, AC-31). *Plan turu ve triyaj ile:* on bir kayıt (yedi eski ekranın sekiz kaydı, Karar 19'un yeni ekranı ve triyaj bulgu 1'in iki yeni ekranı).
- `npm test` ve `npm run lint` yeşil; lint hata sayısı sıfır (kalkan içe aktarmalar temizlenir, R13/2'nin listesi dışına çıkılmaz).
- **Yeni alan, ayar, izin, bölüm, sunucu kuralı ve göç yok** (C1); `db.cjs`, `serverAuth.cjs`, `merge.js` ve `kilitAlanlari.js` dokunulmaz (tarama).
- **README:** `specs/README.md`'nin 0110 satırı "Uygulandı" hâline çevrilir (commit ve plan atfıyla); **"Üretimi biten kalıbın Teslim edildi'ye geçişi elle" açık bulgusu korunur** (X2, Karar 2) ve X1'in kalıcı kimlik bulgusu yerinde kalır.
- **Sürüm notu** planın kendi bölümünde yazılır ve üç cümleyi taşır: eski kalıpların pilden düşmesi, yeni kalıbın işaretlenene kadar "Teslim edildi" türetmesi (R18) ve detay penceresinde kalıp durumunun artık okunamaması (R19).
- **Commit ve sürüm yayını yalnız açık talimatla yapılır.**

---

## Karar kaydı (QA turu, 2026-10-25)

Bir geliştirici başlamadan önce cevapsız kalan sorular çıkarıldı, her biri canlı kodda ölçüldü ve Takım Yöneticisi hepsini onayladı.

| # | Derece | Boşluk | Karar | İşlendiği yer |
|---|---|---|---|---|
| B-1 | Bloklayıcı | R1'in iki okunuşu var; AC-3 ile AC-7 birbirini yalanlıyor ve seçilen okunuş "bekleyen kalıp teslim edilmiş görünür" çelişkisini doğuruyor | Ölçüt alan boşluğudur, bağın canlılığı değil; damgalı kayıt `teslim` türetmez | R1, R1/3, R6/2, C4/2, AC-3, AC-7, AC-24, AC-25, Karar 7, ölçüm 18 |
| B-2 | Bloklayıcı | "Ters çevrilen kriterler" satırı hiçbir kabul kriteri numarası saymıyor; dört spec'in testleri sessizce kırmızıya düşecek | On sekiz beklenti altı dosyada adıyla sayılır, her biri "spec 0110 ile" notu alır | Başlık satırı, AC-23, Karar 8, ölçüm 15 |
| B-3 | Bloklayıcı | R13 `durumBaglami`'nı pencerenin tek tüketicisi sanıyor; prop zinciri kesilirse R15 ve AC-19 sessizce kırılır | Prop, varsayılan ve iletme satırı korunur; kalkacak içe aktarmaların tam listesi yazılır | R13/2, AC-19, AC-28, Karar 9, ölçüm 17 |
| Ö-1 | Önemli | Görsel kanıt bölümü yok; değişen kayıtlar ve `degisti` + `onay` kuralı yazılı değil | Bölüm eklenir, beş kayıt adıyla sayılır | Görsel kanıt, C8, AC-31, Karar 13, ölçüm 23 |
| Ö-2 | Önemli | Definition of Done bölümü yok | Bölüm eklenir; test listesi, kanıt turu, README, sürüm notu ve yayın politikası yazılır | Definition of Done, Karar 16, ölçüm 25 |
| Ö-3 | Önemli | Ölçüm 12'nin uygulama turuna bıraktığı `ayna-kalip-durumu` ayrımı bugün ölçülebilir | Yedi test satırının eşlemesi spec'e yazılır | R17/2, ölçüm 12, Karar 10 |
| Ö-4 | Önemli | Yeni eklenen kalıbın seçicisi "Otomatik (Teslim edildi)" yazacak; ne spec ne C6 ne AC-22 anıyor | Mekanizma dokunulmaz, sonuç bilinen sınır olur ve sürüm notuna girer | R18, C6/2, AC-22, AC-26, Karar 12, ölçüm 16 |
| Ö-5 | Önemli | R1, 0106'nın X11 sapmasını görünürden sessize çeviriyor | B-1'in kararıyla kapanır ve kayda geçer | R7/2, AC-30, Karar 11, ölçüm 19 |
| Ö-6 | Önemli | R13 ve Karar 5'ten sonra detay penceresinde kalıp durumu hiç görünmez olur; bilinen sınır olarak kayıtlı değil | Bilinen sınır yazılır ve sürüm notunda duyurulur | R19, AC-17, AC-27, Karar 14 |
| K-1 | Küçük | Etkilenen alanlar satırı `kalipDurumuTuret`'in öteki iki çağıranını saymıyor | İki dosya satıra eklenir | Başlık satırı, R18, ölçüm 16 |
| K-2 | Küçük | Ölçüm 6 ve 7 dosya yolu vermiyor; iki dosya `src/components/stock/` altında | Tam yol yazılır | Ölçüm 6, ölçüm 7 |
| K-3 | Küçük | Ölçüm 7 `kapali`'nin dört satırını sayıyor, alan dokuz satırda geçiyor | Okuma ve yazma ayrı sayılır | Ölçüm 7 |
| K-4 | Küçük | Ölçüm 11 geri dönüşün koşul ve kapanış satırlarını aralığın dışında bırakıyor | Aralık `:1088-1102` olarak yazılır | Ölçüm 11 |
| K-5 | Küçük | Veri ölçümlerinin kaynağı depoda yok; geliştirici yeniden ölçemez | Kaynak notu eklenir, hiçbir kriter o sayılara bağlanmaz | Ölçümler bölümünün kaynak notu |
| K-6 | Küçük | AC-9 girdisini türetilmiş durumla veriyor, ölçüm 5 ham veriyle | AC-9 ham veriyle yazılır, kriter türetmeyi de ölçer | AC-9 |
| K-7 | Küçük | C7 kontrast testine atıf vermiyor | Atıf eklenir | C7, AC-32, ölçüm 22 |
| K-8 | Küçük | AC-15'in taraması ikinci argümanı geçiren test yardımcısını kapsamıyor | Kriter o satırı da kapsar | AC-15, ölçüm 24 |
| K-9 | Küçük | R17 kalkan `detay-kalip-satiri` kimliğini okuyan iki test satırını saymıyor | İki atıf yazılır; `DurumPilleri`'nin metin anahtarı da kayda geçer | R17/2, C9 |
| K-10 | Küçük | R16 "yazma yolu kapanmaz" diyor ama yolun derinleştiğini söylemiyor | Bedel yazılır; yolun kapanmadığı ölçülerek doğrulanır | R16/2, AC-29, Karar 15, ölçüm 20 |
