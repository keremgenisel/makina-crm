# 0106 — Müşteri satırları makina ve kalıp durumunu renkli pille gösterir

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3, plan turu 2026-10-24; uygulama commit `d7aacc0`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Yeni saf kütüphane `src/lib/musteriDurumu.js`; müşteri formunun Makina ve Kalıp bölümleri (`src/components/customers/CustomerAddEditForm.jsx:163-358`, kalıp satırı ızgarası `:317`); müşteri detayının kalıp listesi (`src/components/customers/CustomerDetailModal.jsx:1090-1101`); Extra Kalıp satırlarının durum seçicisi (`src/components/customers/detail/MachineTimeline.jsx:147`, `:324-351`); müşteri listesinin yeni Durum sütunu ve süzgeç pili (`src/components/Customers.jsx:538-575`); yeni `uretimFormlari` prop'u (`src/components/Customers.jsx:23-48`, App'in tek çağrısı `src/App.jsx:1702`); satışta damgalama (`src/lib/satisKaydi.js`, `Customers.deductMachineStock`); `electron/db.cjs` **üç** yeni sütun (iki yeni alan adı); `tests/tasarim-kontrast.test.js` 0030 bloğu; kanıt aracı ve `docs/evidence/kanit-eslemesi.json` |
| **Bağımlı spec'ler** | 0100 (stok üretim durumu, `uretimDurumuOf`, `DURUM_ADLARI`, rozet renkleri), 0104 (satışta damgalama sırası, Karar 36), 0103 (parti damgası), 0007 (Extra Kalıp, `partSales` tur "Kalıp" ve kalıbın müşteri listesine kopyalanması), 0006 (Extra Kalıp'ın tek kayıt yolu `kalipSatisi.js`), 0009/0014 (pil ve süzgeç tasarım sözlüğü), 0030 (tema değişkeni kuralı ve kontrast testi), 0096/0100 (yeni sütunun ayıklamalı okunması), 0082 (kimlik bazlı kaynak taraması) |
| **Ters çevrilen kriterler** | Yok. Hiçbir mevcut kriterin yönü değişmiyor; müşteri listesinin kırmızı zemini ve "Borçlu Firmalar" pili olduğu gibi kalıyor |

---

## Intent

Kullanıcı müşteri listesine bakınca bir makinanın hangi aşamada olduğunu göremiyor. Montajda mı, bitti mi, teslim edildi mi; kalıbı sipariş edildi mi, üretimde mi, hazır mı. Bu bilgi bugün ya hiç tutulmuyor ya da üç ayrı ekrana dağılmış durumda: makinanın montaj durumu satılmadan önce Makina Stoğu'nda, kalıbın üretim durumu Kalıp Üretim Formu'nda, borç durumu müşteri satırının kırmızı zemininde.

Kullanıcı bu üç bilgiyi tek bakışta, Excel'de yaptığı gibi renkle görmek istiyor. Müşteriden gelen renk tablosu yedi durum sayıyor ve her birinin etiket metnini de yazmış.

Bu iş bittiğinde müşteri satırında üç bilgi birden okunacak: borç kırmızı zeminle (bugünkü hâliyle), makinanın aşaması bir pille, kalıpların aşaması ikinci bir pille. Kalıp aşamasının çoğu Kalıp Üretim Formu'ndan kendiliğinden türeyecek, kullanıcının elle yapacağı tek iş teslim ettiğini işaretlemek olacak.

---

## Requirements

### Makina durumu

- **R1.** Müşteri kaydının yeni alanı `makinaDurumu` üç değer alır: `montaj`, `hazir`, `teslim`. Boş değer "bilinmiyor" demektir ve hiçbir pil çizdirmez.
- **R2.** Stoktan yapılan satışta stok satırının üretim durumu müşteri kaydına **damgalanır** (`montaj` ya da `hazir`). Damgalama `satisKaydi.js`'in bugünkü damgalayıcılarının (`partiDamgala`, `uretimTarihiDamgala`) yanında, aynı yerde ve aynı sırada yapılır (0104 Karar 36: `deductMachineStock` `setCustomers`'tan önce çağrılır); yazan tek fonksiyon `satisKaydi.makinaDurumuDamgala(kayit, stokSatiri)`'dır.
- **R2/2.** Damgalanan değer stok satırının **ekranda görünen** durumudur, yani `stokDurumu.uretimDurumuOf(stokSatiri)`'nun sonucudur: alanı boş olan satır Makina Stoğu'nda "Satışa hazır" rozetiyle duruyor (ölçüm 10) ve satıştan sonra da öyle görünmelidir. `uretimDurumuOf` **yalnız bu tek yerde**, yalnız yazma anında çağrılır; çağrı `satisKaydi.js`'tedir ve kaynak taramasıyla sabitlenir (ölçüm 11, Karar 18).
- **R3.** Stok dışı satışta (manuel seri, eski kayıt, Evrak'tan doğan kayıt) alan **boş doğar**. Hiçbir varsayılan yazılmaz.
- **R4.** Alan müşteri formunda bir seçiciyle her zaman değiştirilebilir: boş (seçilmedi) / Montajda / Hazır / Teslim edildi. Boş seçenek alanı kayıttan siler.
- **R4/2.** Seçicinin yeri Garanti Bitiş ızgarasının (`CustomerAddEditForm.jsx:395-402`) hemen altı, `giderYetki` bloğunun (`:404`) **önüdür**; kendi `Field`'ında çizilir ve hiçbir yetki perdesine girmez. Üretim Tarihi ile Üretim partisi alanları gider yetkisinin içindedir (ölçüm 12), bu yüzden "Üretim Tarihi'nin komşusu" tarifi seçiciyi sessizce gider yetkisine bağlardı (Karar 19).
- **R5.** Alan müşteri detay penceresinde de aynı seçiciyle değiştirilebilir. Üretim boyunca durum birkaç kez değişeceği için bütün formu açmak zorunlu olmamalıdır.
- **R6.** Stok tarafının kuralı değişmez: `stokDurumu.uretimDurumuOf` boş değeri "satışa hazır" saymaya devam eder.
- **R6/2.** Kural **okuma** tarafındadır: `musteriDurumu.js` müşteri kaydının `makinaDurumu` alanını okurken boş değeri "bilinmiyor" sayar, "hazır" saymaz, ve `uretimDurumuOf` çağırmaz. Yazma tarafının tek istisnası R2/2'dir (damgalama anı). İki kural birbirine karıştırılmaz: müşterinin boş alanı pil çizdirmez, stoğun boş alanı satışa hazırdır.

### Kalıp durumu

- **R7.** Kalıbın durumu beş değer alır: `bekliyor`, `gonderildi`, `uretimde`, `hazir`, `teslim`. Alan adı iki yerde de `kalipDurumu`'dur: müşteri kalıbında (`customers[].kaliplar[i].kalipDurumu`) ve Extra Kalıp satışında (`partSales[].kalipDurumu`).
- **R7/2.** `kaliplar`'ın **`partSaleId` taşıyan** satırı bir Extra Kalıp satışının **aynasıdır**, bağımsız bir kalıp değildir: Extra Kalıp satışı kaydedilince `kalipSatisi.yeniKalipSatislari` o satırı müşterinin listesine `{ad, olcu, partSaleId}` olarak kopyalıyor (ölçüm 13). Ayna satırın kendi durumu yoktur; durumu bağlı `partSales` kaydından okunur, `kalipDurumu` ona yazılmaz ve ekranlarda seçicisi çizilmez (yalnız türetilmiş durumu salt okunur görünür, R11/2 ve R12/2).
- **R8.** Alan boşken durum **türetilir**. Türetme sırası:

  | Koşul | Durum |
  |---|---|
  | `uretimFormId` dolu, bağlı üretim formu satırı `tamamlandi` | `hazir` |
  | `uretimFormId` dolu, satır `tamamlandi` değil | `uretimde` |
  | `uretimFormId` dolu ama form ya da satır bulunamıyor | `gonderildi` |
  | `uretimFormGonder` işaretli, `uretimFormId` boş | `gonderildi` |
  | İkisi de yok | `bekliyor` |

- **R8/2.** Türetme **yalnız kaydın kendi işaretlerini** okur: `uretimFormGonder` ve `uretimFormId`. Ayna satırda (R7/2) bu iki işaret hiç yoktur, çünkü `uretimFormId` Extra Kalıp'ta `partSales` kaydına yazılıyor (`UretimFormu.jsx:129`) ve bekleyen kalıp o kayıttan toplanıyor (`:256-280`, ölçüm 14). Bu yüzden ayna satır üzerinden türetme yapılmaz.
- **R9.** Üretim formu satırının bağı `kaynakTip` + `kaynakId` + `kalipIdx` üçlüsüdür: müşteri kalıbında `("musteri", customer.id, i)`, Extra Kalıp'ta `("extra_kalip", partSale.id)`. Çöpteki üretim formu bağ kurmaz.
- **R9/2.** `kalipIdx` bir **konumdur**, kimlik değildir (ölçüm 15). Müşteri formundan bir kalıp silinince **ya da bir Extra Kalıp satışı silinip aynası müşterinin listesinden çıkınca** (`CustomerDetailModal.jsx:495`) sonraki bütün kalıpların konumu kayar, `uretimFormId` kalıpta kalır ama form satırı artık başka kalıbı işaret eder. *(Triyaj bulgu 1 ile düzeltildi; önceki metin "o kalıplar `gonderildi` görünür" diyordu.)* Kayan kalıp yeni konumundaki **başka kalıbın satırını okur ve onun durumunu gösterebilir** (A hazır, B ve C üretimde iken A silinince B "hazır" görünür ve kayıt "Teslim Bekleyenler"e girebilir); yalnız formun son konumuna denk gelen satır hiçbir kalıba düşmez, aynı formda o konumda satırı olmayan kalıp `gonderildi` görünür. Davranış `tests/musteri-durumu-0106.test.js`'te sabitlenmiştir ve sürüm notuna yazılır. Bu spec bağı yalnız **okur**, kırılganlığı düzeltmez (X11); sınır bilinen sınır olarak yazılır ve kullanıcı gerekirse `kalipDurumu`'nu elle yazarak düzeltir.
- **R10.** Alan doluysa türetme yapılmaz, yazılan değer kazanır. Seçicinin **ilk seçeneği "Otomatik (`<türetilen>`)"** biçimindedir ve boş değeri yazar; kullanıcı ona dönünce kalıp akışa geri bağlanır. Biçim Evrak'ın tür seçicisinin desenidir (`Documents.jsx:1092`).
- **R11.** Seçici müşteri formunun kalıp satırında, bugünkü "Üretim formuna gönder" kutusunun komşusunda çizilir; müşteri detayının kalıp listesinde de aynı seçici vardır.
- **R11/2.** İki ekranın şekli (ölçüm 16, Karar 20):
  - **Form:** kalıp satırının ızgarası `"auto 1fr 1fr auto 36px"` iken `"auto 1fr 1fr auto auto 36px"` olur; seçici "Üretim formuna gönder" kutusunun sağına girer, dar pencerede satır alta sarar.
  - **Detay:** kalıplar bugün tek satırlık rozet şeridi (`flex-wrap` içinde `span`); bölüm **satır listesine** çevrilir. Her satırda solda ölçü ve ad, sağda durum seçicisi; Extra Kalıp'tan gelen satırın bugünkü renk ayrımı (kırmızı tint) satırın solunda korunur.
  - İki ekranda da ayna satırın seçicisi çizilmez (R7/2); yerinde türetilmiş durumun adı salt okunur yazar.
- **R12.** Extra Kalıp satışının seçicisi müşteri detayındaki Extra Kalıp kaydında bulunur. Ayrı bir ekran açılmaz.
- **R12/2.** O kayıt zaman çizelgesindedir: tek kalıplı girişin başlığı `MachineTimeline.jsx:147`, partideki satırlar `:324-351` (ölçüm 17). Seçici her Extra Kalıp satırının altına, ödeme anahtarının komşusuna konur ve `cust_kalip_edit` ile çizilir. Dosya "Etkilenen alanlar"da sayılır ve kendi kanıt ekranını alır (`musteri-detay-0106-kalip`).

### Pil gösterimi

- **R13.** Müşteri listesine Model sütununun sağına **Durum** sütunu eklenir (Makina Stoğu'ndaki yeriyle aynı, spec 0100). Sütun yalnız müşteri listesinde çizilir, bayilerde çizilmez.
- **R14.** Hücrede en çok üç pil alt alta durur: ödeme pili, makina pili, kalıp pili. Sıra budur.
- **R15.** Ödeme pili, satır bugünkü `debtorIds` kümesindeyse çizilir, metni **ÖDEME BEKLİYOR**, rengi kırmızıdır. Satırın kırmızı zemini ve hover davranışı **aynen kalır**; pil onun yerine geçmez, yanına eklenir.
- **R16.** Makina pili:

  | Durum | Metin | Renk | Token (metin / zemin) |
  |---|---|---|---|
  | `montaj` | MONTAJ YAPILIYOR | mor | `pur700` / `purBg` |
  | `hazir` | MAKİNA HAZIR | yeşil | `grn700` / `grnBg` |
  | `teslim` | pil yok | yok | yok |
  | boş | pil yok | yok | yok |

- **R16/2.** İki renk **Makina Stoğu'nun rozetleriyle birebir aynıdır** (`MakinaStokTab.jsx:16-19`: montajda mor, satışa hazır yeşil). Aynı kavram iki ekranda aynı rengi taşır; mavi Stok'ta "önceki partiden kaldı" demektir ve bu yüzden makina durumuna verilmez (ölçüm 18, Karar 21).

- **R17.** Kalıp pili, kaydın kalıp kümesinden hesaplanır. Küme = o müşteri kaydının `kaliplar` listesinin **`partSaleId` taşımayan** satırları **artı** o kayda bağlı canlı Extra Kalıp satışları (`partSales`, tur "Kalıp", `customerId` eşleşen, `deletedAt` yok).
- **R17/2.** `partSaleId`'li satır kümeye **girmez**, çünkü aynı kalıbı temsil eder (R7/2): girse hem sayı iki katına çıkar hem de ayna satır her zaman `bekliyor` türettiği için üretimi bitmiş bir Extra Kalıp bütün satırı geriye çekerdi (ölçüm 13, Karar 22).
- **R17/3.** Bilinen sınır: `partSaleId` taşımayan **eski** ayna satırlar ayırt edilemez ve kümede iki kez görünür. Detay penceresinin bugünkü konum sezgisi (`i >= kaliplar.length - detailKalipSatisAdedi`, `deriveCustomerDetail.js:219`) bir sayının kaynağı olacak kadar güvenilir değildir, bu yüzden ayrım **yalnız `partSaleId`** ile yapılır (ölçüm 19).
- **R18.** Pil, **gösterilebilir** durumların en geri kalmışını gösterir. Sıra: `bekliyor` < `gonderildi` < `uretimde` < `hazir` < `teslim`. `bekliyor` R21 ile bastırıldıysa sıradaki durum pile geçer; gösterilebilir durum kalmazsa pil çizilmez.

  | Durum | Metin | Renk | Token (metin / zemin) |
  |---|---|---|---|
  | `bekliyor` | KALIP SİPARİŞİ BEKLİYOR | amber | `amb700` / `ambBg2` |
  | `gonderildi` | KALIP SİPARİŞ VERİLDİ | nötr | `n600` / `n150`, kenar `n200` |
  | `uretimde` | KALIP ÜRETİMDE | mavi | `blu700` / `bluBg` |
  | `hazir` | KALIP HAZIR · TESLİM BEKLİYOR | teal | `teal2` / `tealBg`, kenar `tealBr` |
  | hepsi `teslim` | pil yok | yok | yok |

- **R18/2.** Palet Karar 9'un turuncusunu **amber**le değiştirir, çünkü turuncu (`orTx`) ile amber (`amb700`) ton farkı aydınlıkta 9, karanlıkta 14 derecedir ve zeminleri 1,05 ile 1,20 kontrast oranındadır, yani iki pil ayırt edilemez (ölçüm 20). Turuncu ayrıca borç pilinin kırmızısına 17 derece yakındır. "Sipariş bekliyor" uyarı niteliğini amber taşır, "üretimde" mavi, "hazır" teal olur; makina pilleri mor ve yeşildir (R16). Yedi pilin ton ayrımı en az 26 derecedir (kalan en yakın çift kırmızı ile amber) ve renk tek başına anlam taşımaz, her pil adını da yazar (0100 R14/2).

- **R19.** Küme boşsa (kalıbı olmayan makina) kalıp pili çizilmez.
- **R20.** Pilin sonunda sayı yazar: **o durumdaki kalıp sayısı / kümenin toplamı** (örnek "KALIP ÜRETİMDE 2/4"). Küme tek kalıplıysa sayı yazılmaz.
- **R20/2.** Payda her zaman **kümenin toplamıdır**, pil R21 ile bastırılmış kalıpları da sayar: {3 `bekliyor`, 1 `uretimde`} kümesi ve boş makina durumu "KALIP ÜRETİMDE 1/4" yazar, "1/1" yazmaz. Kullanıcının sorusu "bu makinanın kaç kalıbından kaçı bu aşamada"dır; paydayı küçültmek bastırılan kalıpları gizler ve "1/1" ile "4/4" aynı görünür (Karar 23).
- **R21.** `bekliyor` durumundaki pil **yalnız makina durumu dolu olan kayıtlarda** çizilir. Hiç işaret taşımayan eski kayıtlar böylece sessiz kalır; akışa girmiş bir kayıtta ise müşterinin istediği "kimse harekete geçmedi" uyarısı görünür. Diğer dört durum bu şarta bağlı değildir, çünkü üretim formuyla ilişkilenmiş kalıp zaten akışa girmiştir.
- **R21/2.** "Makina durumu dolu" üç değerin hepsini kapsar, `teslim`'i de: teslim edilmiş makinanın bekleyen kalıbı hâlâ bir iştir (Karar 24).
- **R22.** Pil `musteriDurumu.js`'in döndürdüğü `{metin, renk, zemin, kenar}` ile çizilir, renkler tema token'larındandır ve karanlık temada `tasarim-kontrast` testinin eşiğini geçer.
- **R22/2.** Tasarım sözlüğünde rozet yapı taşı **yoktur** (ölçüm 21): `Rozet` bileşeni `MakinaStokTab.jsx:21-23`'te yerel ve dışa verilmemiş durumda. Bu spec paylaşılan bir rozet açmaz, çünkü Stok ekranını kapsamına sokar (R28, AC-33 0 piksel ister). Pilin biçimi Stok rozetinin ölçülerinin aynısıdır (11,5 punto, 700 kalınlık, 6 köşe yarıçapı, "3px 9px" dolgu) ve `docs/tasarim-sozlugu.md`'nin "Bilinen borç" bölümüne madde yazılır: bugün iki yerel kopya var, üçüncü kopya yazılmadan önce rozet sözlüğe taşınır (Karar 25).
- **R22/3.** `tasarim-kontrast.test.js` ölçülen her token çiftinin **adı verilen dosyada** `var(--token,` olarak geçmesini istiyor (`:101-105`). Renkler kütüphanede durduğu için 0030 bloğuna eklenen kayıtların dosyası `src/lib/musteriDurumu.js`'tir, bileşen değil (ölçüm 22).

### Süzgeç

- **R23.** Müşteri listesinin süzgeç çubuğuna **"Teslim Bekleyenler"** pili eklenir. Ölçüt: makina durumu `hazir` **veya** kümede en az bir kalıp `hazir`. Sayı pilin üzerinde yazar.
- **R23/2.** Sayı bugünkü beş pilin desenini izler: ham `customers` dizisinden, **aramadan ve seçili süzgeçten bağımsız** (`Customers.jsx:501-506`: `customers.length`, `customers.filter(...).length`, `debtorIds.size`). `useFilteredList`'in `oncesi` kümesi burada kullanılmaz, çünkü `oncesi` zaten `filterFn`'i uygulamış kümedir ve müşteri listesinde süzgeç pili `filterFn`'in kendisidir; pil kendi sayısını süzer ve seçiliyken sayı kümenin tamamına eşitlenirdi (ölçüm 23). 0100'ün `oncesi` deseni Stok'ta geçerli çünkü orada durum süzgeci **ikinci** süzgeçtir (Karar 26).
- **R23/3.** Bugünkü veride pil **0 gösterir**: kayıtlı üretim formu yok ve hiçbir müşteri kaydında `makinaDurumu` yok (göç yok, C3), yani `hazir` hiçbir yerde türemez ya da damgalanmaz. Pil yeni satışlar damgalandıkça ve ilk üretim formu açıldıkça dolar; beklenti sürüm notuna yazılır (ölçüm 8, Karar 27).
- **R24.** Süzgeç bugünkü "Borçlu Firmalar" pilinin komşusudur, onun yerine geçmez, ikisi aynı `Segment`'in seçenekleridir ve aynı anda yalnız biri seçilidir (bugünkü davranış).

### Tek hesap ve yeni kütüphane

- **R25.** Bütün kurallar yeni saf kütüphane **`src/lib/musteriDurumu.js`**'tedir: durum sabitleri, türetme, en geri kalmış durum seçimi, pil metni ve rengi, süzgeç ölçütü, kalıp kümesi. Kütüphane React almaz, saat okumaz, veri yazmaz.
- **R26.** Üretim formu bağının haritası kütüphanede **bir kez** kurulur (`uretimFormHaritasi(uretimFormlari)`), satır başına bütün formları tarayan kod yazılmaz.
- **R26/2.** Harita `Customers.jsx`'te tek `useMemo` ile kurulur ve **aynı nesne olarak** listeye, müşteri formuna ve detay penceresine iletilir; üç yerde yeniden kurulmaz. Form ve detay da türetilmiş duruma ihtiyaç duyar, çünkü R10'un "Otomatik (`<türetilen>`)" etiketi onu okur.
- **R27.** Ekranlar durum türetmez, pil metni ya da rengi yazmaz; yalnız kütüphanenin döndürdüğünü çizer. Kaynak taraması bunu sabitler.

### Değişmeyenler

- **R28.** Stok ekranı, Parti Üretim Panosu, Kalıp Üretim Formu, Dashboard, Analiz, yazdırma çıktıları ve dışa aktarma dosyaları bu spec'le değişmez.
- **R29.** `uretimFormGonder` ve `uretimFormId` alanlarının yazım yolları değişmez; bu spec onları yalnız **okur**.
- **R30.** Yeni izin, yeni izin boyutu, yeni sunucu kuralı ve yeni birleştirme kuralı yoktur. Durum değişikliği üç yolda üç mevcut kimlikle kapanır: müşteri **formu** `cust_edit`, müşteri **detay penceresi** `cust_detail_edit` ("Ana kaydı düzenle", detayın yerinde düzenlemelerinin bugünkü kimliği), Extra Kalıp `cust_kalip_edit` (ölçüm 25).
- **R30/2.** Bilinen sınır: sunucu bu iki alanı **bölüm düzeyinde** güvenir. `serverAuth.cjs:569-573` `ALAN_IZINLERI` yalnız `services.durum`, `partSales.kargoDurum` ve `yedekParcaSatislar.kargoDurum`'u izliyor, `customers` için hiç kaydı yok; yani kimlik kapıları istemci tarafındadır (bugün `odendi` gibi diğer bütün alanlarla aynı sınır). İki işaret alanı için alan denetimi açmak yeni sunucu kuralı olurdu (Karar 28).

### Yeni prop

- **R31.** `Customers` yeni bir prop alır: `uretimFormlari = []`. Bugün bu prop yok (`Customers.jsx:23-48`) ve App'in tek `<Customers …>` çağrısı (`App.jsx:1702`) onu geçmiyor, oysa `liveUretimFormlari` App'te hazır (`:887`) ve Dashboard ile Stock'a veriliyor (ölçüm 24).
- **R32.** App prop'u **kapısız** geçirir (durum bir izin konusu değil, R30). `Customers` prop'u okumaz, yalnız kütüphaneye, forma ve detay penceresine iletir.
- **R33.** Varsayılan `[]` zorunludur: `<Customers …>` çizen otuz beş dosyanın hiçbiri prop'u geçmiyor (otuz üç test, `scripts/evidence/0009-sayfa.jsx`, `scripts/tests/layout/suzgec.jsx`). Boş liste "form yok" demektir ve türetmenin tanımlı dalıdır: bütün kalıplar `bekliyor` ya da `gonderildi` türetir (0105 R24 emsali).

---

## Constraints

### Uyulması zorunlu

- **C1.** Müşteri satırının kırmızı zemini, `customerHasAnyDebt` kuralı ve "Borçlu Firmalar" süzgeci **değişmez**. Borç en ağırlıklı işarettir (Takım Yöneticisi kararı) ve zemin olarak kalır.
- **C2.** **Üç** yeni sütun (iki yeni alan adı) dört nokta kuralıyla açılır: `customers.makinaDurumu TEXT`, `customer_kaliplar.kalipDurumu TEXT` ve `part_sales.kalipDurumu TEXT`.
- **C2/2.** Okuma **ayıklamalıdır** ve üç tablonun tekniği farklıdır (ölçüm 26):
  - `customer_kaliplar` okuması alanları tek tek kuruyor (`db.cjs:1350-1358`), yeni alan bugünkü desenle koşullu eklenir.
  - `customers` (`:1363`) ve `part_sales` (`:1441`) okumaları `...rest` yayıyor; yeni alan destructuring ile ayrılır ve yalnız doluyken geri yazılır (`stock` okumasının 0100 deseni, `:1404-1411`).
  - Ayıklanmazsa alanı tanımayan istemcinin gövdesi sunucu karşılaştırmasında sürekli "değişmiş" görünür (0096 C3/2, 0100 C2 dersi).
- **C3.** Göç yoktur. Hiçbir eski kayda değer yazılmaz.
- **C4.** Durum dizeleri (`"montaj"`, `"hazir"`, `"teslim"`, `"bekliyor"`, `"gonderildi"`, `"uretimde"`) ekran dosyalarında düz metin olarak karşılaştırılmaz; kütüphanenin sabitleri kullanılır (0100'ün kuralı).
- **C4/2.** Tarama **kimlik bazlıdır** ve gerekçeli, tam yollu istisna listesi taşır (0082 C9 deseni), çünkü üç dize bugün başka kavramlarla üç ekran dosyasında geçiyor (ölçüm 27): `"bekliyor"` tahsis durumu anahtarı (`stock/YedekParcaSatisTab.jsx:22`), `"gonderildi"` teklif durumu (`Documents.jsx:21`, `Dashboard.jsx:221`), `"hazir"` pano sütun anahtarı (`stock/PartiUretimPanosu.jsx:9`). Düz sözcük taraması ilk günden kırmızı başlar.
- **C4/3. Ad tuzağı (0023 R10 ve 0074 emsali).** Teklifin `gonderildi`'si ile kalıbın `gonderildi`'si, panonun `hazir`'ı ile kalıbın `hazir`'ı, Evrak'ın "Teslim Şekli" alanı ile `teslim` ayrı kavramlardır ve hiçbir alan paylaşmazlar. Kalıp durumunun alan adı yalnız `kalipDurumu`'dur; yeni bir alan açılırken bu adlar kullanılmaz.
- **C5.** Pil metinleri tek yerde sabittir. Uygulamanın yazımı **"MAKİNA"**dır, müşterinin tablosundaki "MAKİNE" değil; uygulama her yerde "Makina" diyor (Makina Modeli, Makina Stoğu, Makina Maliyeti).
- **C6.** Ayraç `·` orta noktasıdır, tire değil ("KALIP HAZIR · TESLİM BEKLİYOR").
- **C7.** Kütüphanenin hesapları müşteri sayısıyla doğrusal olmalıdır. Üretim formu haritası bir kez kurulur (R26) ve kalıp kümesi için `partSales` müşteri kimliğine göre bir kez gruplanır.
- **C8.** Yeni Durum sütunu dar pencerede satırı taşırmamalıdır; piller alt alta durur, yan yana değil.
- **C8/2.** C8 **görsel kanıtla** karşılanır (`musteriler-0106-piller` ekranı), yerleşim testi açılmaz: müşteri tablosu `KartBolum varyant="kart"` içinde `overflow: auto` ile yatay kaydığı için taşma riski düşüktür ve Electron yerleşim testi bu işin boyutunu gereksiz büyütür. Hiçbir kabul kriteri dar pencereyi ölçmez, bu bilinçli.

- **C9.** Kanıt kayıtlarının yaşam döngüsü yazılıdır: değişen üç ekranın ve üç yeni ekranın kayıtları iş sürerken `0106-piksel-raporu.json`'da `degisti` + `onay` ile durur, spec `specs/done`'a taşınmadan önce **kapanışta yeniden çekilen** `0106-taban-piksel-raporu.json`'a bağlanıp `ayni`ye çevrilir (0091/0093/0105 emsali). Eski raporların kayıtlarına dokunulmaz, çünkü rapor kaydedilmiş bir ölçümdür ve kod değişince değişmez (ölçüm 28).
- **C10.** Stok ekranının rozetleri, `uretimDurumuOf`'un davranışı ve `Rozet` bileşeni değişmez (R28, AC-33); bu spec Stok'u 0 piksel tutar ve paylaşılan rozet açmaz (R22/2).

### KAPSAM DIŞI

- **X1.** Arşiv kavramı. Müşterinin tablosundaki "Kayıt arşive taşınınca" satırı uygulanmaz — *neden:* teslim edilen satır zaten pilsiz kalıyor, arşiv ayrı bir ekran ve ayrı bir veri kuralı demek (Takım Yöneticisi kararı 1).
- **X2.** Gri "KALIP TESLİM EDİLDİ" pili — *neden:* bütün eski kayıtları kaplayıp gürültü yaratır, pilin yokluğu zaten "iş bitti" demektir (Takım Yöneticisi kararı 1).
- **X3.** Teslim tarihi alanı — *neden:* Takım Yöneticisi yalnız işaret istedi, tarih istemedi (karar 4).
- **X4.** Evrak ekranındaki iki kutuya durum eklemek — *neden:* `durum` kutusu teklifin satış sürecini tutuyor ve `onaylandi` değeri CRM'e Kaydet düğmesinin kapısı; ayrıca üretim satıştan sonra işliyor, bir belgede birden çok makina olabiliyor ve Evrak'tan doğmayan müşteri kayıtları hiç renk almazdı (ölçüm 1, Takım Yöneticisi kararı).
- **X5.** Durum değişiminin işlem geçmişine ayrı eylem olarak yazılması — *neden:* müşteri kaydının düzenlenmesi zaten kaydediliyor.
- **X6.** Pano benzeri toplu işaretleme ekranı — *neden:* elle yapılacak tek iş teslim işareti, kalan dört durum türetiliyor; toplu ekran kullanım görülmeden yazılmaz.
- **X7.** Bayi listesinde durum sütunu — *neden:* bayi kaydının makinası ve kalıbı yok.
- **X8.** Yazdırma ve dışa aktarma çıktılarına durum eklenmesi — *neden:* ekranda okunan bir işaret, belge alanı değil.
- **X9.** "Montajda", "Kalıp üretimde" gibi ek süzgeç pilleri — *neden:* bu spec tek süzgeç getiriyor (R23); diğerleri kullanım görülünce ayrı iş.
- **X10.** Makina durumunun satıştan sonra stok tarafına geri yazılması — *neden:* stok satırı satışta siliniyor, geri bağ yok.
- **X11.** Üretim formu bağının indeks kırılganlığını düzeltmek (`kalipIdx` yerine kalıba kimlik vermek) — *neden:* kalıba kimlik vermek veri göçü demektir ve C3 "göç yoktur" diyor; bu spec bağı yalnız okur, sınırı R9/2'de yazar (Karar 29).
- **X12.** `partSaleId` taşımayan eski ayna satırları ayıklamak — *neden:* tek ölçüt konum sezgisi olurdu, bir sayının ("2/4") kaynağı olacak kadar güvenilir değil; sınır R17/3'te yazılı (Karar 30).
- **X13.** Rozetin tasarım sözlüğüne taşınması — *neden:* Stok ekranını bu işin kapsamına ve kanıt turuna sokar; borç sözlüğe yazılır (R22/2, Karar 25).

---

## Context

- Müşteri satırının tek zemini bugün borçlu kırmızısıdır (`Customers.jsx:572`, `redBg`, hover `redBg2`); kümeyi `debtorIds` (`:104`) `utils.customerHasAnyDebt` ile kurar. Süzgeç "Borçlu Firmalar" pilidir (`:504`).
- Müşteri tablosunun başlıkları `Customers.jsx:538-563` arasındadır (`thead`; başlık dizisi `:540-558`): Sıra, Satın Alan, Satış Yapan, Ülke / Şehir, Model, Seri No, Kalıp Sayısı, Makina Kalıp Çapı, Garanti Bitiş, Fatura, ardından dört isteğe bağlı fiyat sütunu ve işlem sütunu.
- Müşteri formunun Makina bölümü `CustomerAddEditForm.jsx:163` ile başlar; kalıp satırları `:315-358` arasında, her satırda ad, ölçü ve **"Üretim formuna gönder"** onay kutusu vardır. Üretim Tarihi ve Üretim partisi alanları `:404-429` arasında ve yalnız gider yetkisiyle çizilir (Garanti Bitiş ızgarası `:395-402`, gider kapısı `:404`).
- Müşteri kalıbının bugünkü şekli `{ad, olcu, fiyat?, partSaleId?, uretimFormGonder?, uretimFormId?}`'dir; tablosu `customer_kaliplar` (`db.cjs:132`), okuması alanları tek tek kurar (`:1350-1358`), üretim sütunları `KALIPLAR_URETIM_COLUMNS` (`:493`) ile açılmıştır.
- Kalıp üretim formu `uretimFormlari` bölümündedir; kapsayıcıda `baslangicTarihi`, `bitisTarihi`, `kapali`, `satirlar` vardır. Satır modeli `src/components/stock/uretimFormModel.js`: `tamamlandi`, `kaynakTip` (`"musteri"` | `"extra_kalip"`), `kaynakId`, `kalipIdx`.
- `uretimFormId` kalıp bir forma eklendiğinde kaynağa yazılır (`UretimFormu.jsx:122` müşteri kalıbına, `:129` Extra Kalıp'a); bekleyen kalıpları toplayan `collectPending` müşteri kalıplarını `:231-252`, Extra Kalıp'ı `:256-280` arasında tarar. Dashboard `uretimFormGonder && !uretimFormId` olanları "bekleyen kalıp" diye sayar (`:200`, `:204`).
- Stok tarafında `stock[].uretimDurumu` `montaj` ya da `hazir` değerini taşır (spec 0100); `stokDurumu.uretimDurumuOf` boş değeri `hazir` sayar. Satışta stok satırı silindiği için bu değer bugün müşteri kaydına taşınmıyor.
- Müşteri detayında kalıplar `CustomerDetailModal.jsx:1090-1101`'de tek satırlık rozet şeridi olarak listeleniyor (`flex-wrap` içinde `span`, satır başına kontrol alanı yok); Extra Kalıp satışları zaman çizelgesinde kendi girişlerini taşıyor (`MachineTimeline.jsx:147`, `:324-351`).
- `useFilteredList` isteğe bağlı `ikinciFiltre` parametresi alıyor ve `oncesi` kümesini döndürüyor (spec 0100 P2); `oncesi` **`filterFn`'i uygulamış** kümedir (`useFilteredList.js:18-24`). Stok'ta süzgeç rozetlerinin sayıları bu kümeden okunuyor, ama müşteri listesinde süzgeç pili `filterFn`'in kendisidir (`Customers.jsx:119-124`) ve beş pilin sayısı ham `customers`'tan geliyor (`:501-506`).

---

## Ölçümler

1. **Evrak'taki iki kutu** `Documents.jsx:1090-1101`: birincisi `form.tur` (Otomatik / Makina Satışı / Yedek Parça / Kalıp / Diğer), ikincisi `form.durum` (`DURUM_OPTS = ["taslak","gonderildi","onaylandi","iptal"]`, `:21`). `durum === "onaylandi"` CRM'e Kaydet düğmesinin kapısıdır (`:1077`) ve `teklifUretimDurumu` ona bakar. Bu yüzden o kutu genişletilemez (X4).
2. **Teslim kavramı kodda yok.** `teslimEdildi`, `teslimTarihi` ve `teslimDurumu` adları yalnız Evrak ve yazdırma dosyalarında geçiyor ("Teslim Şekli" alanı), kayıt durumu olarak hiçbir yerde yok.
3. **Arşiv kavramı müşteride yok.** `panoGizli` yalnız servis ve kargo tarafında.
4. **Müşteri kalıbında durum alanı yok.** Bugünkü alanlar ölçüldü (Context). `customer_kaliplar` tablosunda `kalipDurumu` sütunu yok.
5. **Üretim formu bağı tam.** `kaynakTip`/`kaynakId`/`kalipIdx` üçlüsü müşteri kalıbını ve Extra Kalıp satışını birebir işaret ediyor; `uretimFormId` ters bağı da taşıyor, yani harita tek geçişte kurulabiliyor.
6. **Tema token'ları hazır:** mavi `bluBg`/`blu700`, yeşil `grnBg`/`grn700`, amber `ambBg2`/`amb700`, mor `purBg`/`pur700`, turuncu `ambBg3`/`orTx` (`theme.js:52-101`). Turuncu metin token'ı `orTx` bugün müşteri listesinin isteğe bağlı fiyat sütunu başlıklarında kullanılıyor, yani aynı ekranda ikinci bir turuncu doğacak (C8'in kontrast şartı buradan geliyor).
7. **Kanıt ekranları var:** `musteriler-liste`, `musteriler-gruplu`, `musteriler-bos-arama`, `musteriler-bos-kayit`; form tarafında `musteri-formu` ve altı türevi; detayda `musteri-detay` ve yedi türevi.
8. **Veri ölçümleri (2026-10-24, yedekten; yedek dosyası bu oturumda elde yok):** 1265 makina kaydının 1106'sında birden çok kalıp var, yani sayılı pil istisna değil kural. 1219 Extra Kalıp satışının yalnız 2'sinde `uretimFormGonder` işareti var. Kayıtlı üretim formu sayısı 0. Bugün ~54 satır kırmızı (7'si kalan borç, 47'si ödenmemiş servis). Stokta 21 canlı satır, 10'u montajda.
9. **Ölçüm 8'in sonucu R21'in gerekçesi:** işaretsiz 1217 Extra Kalıp ve yüzlerce müşteri kalıbı tek kuralla uyarı rengine düşerdi. Makina durumu şartı bunu kesiyor.

### QA turu (2026-10-24)

10. **Stok satırının üretim durumu boş kalabilir.** `stokDurumu.js:15` `uretimDurumuOf` alanı olmayan satırı `hazir` sayıyor; `:17` `uretimDurumuYaz` değeri yalnız kullanıcı seçiciye dokununca yazıyor (`MakinaStokTab.jsx:282-283`) ve stoğa yeni eklenen makina `montaj` doğuyor (`:63`). Yani 0100 öncesinden kalan ve dokunulmamış satırların alanı boştur ama ekranda "Satışa hazır" rozeti taşır (`:231`).
11. **R2 ile R6 çelişiyordu.** "Damgalanır (`montaj` ya da `hazir`)" ve AC-1'in "satışa hazır makina `hazir` ile doğar" ifadesi, boş alanı `hazir`'a çevirmeyi gerektiriyor; bu tam olarak `uretimDurumuOf`'un kuralıdır, oysa R6 müşteri tarafının onu çağırmasını yasaklıyordu. Çözüm R2/2 ve R6/2: çağrı yalnız yazma anında, kural okuma tarafında.
12. **Makina durumu seçicisinin R4'teki yeri yetki perdesinin içindeydi.** `CustomerAddEditForm.jsx:404` `giderYetki &&` ile başlayan ızgarada Üretim Tarihi (`:406`) ve ipucu var; Üretim partisi bloğu (`:418-429`) kendi kapısında. "Üretim Tarihi'nin komşusu" tarifi seçiciyi gider yetkisi olmayan satış kullanıcısından gizlerdi.
13. **Extra Kalıp kalıbı müşterinin kalıp listesine kopyalanıyor.** `kalipSatisi.js:55-57` (`yeniKalipSatislari`) her Extra Kalıp kaydını `customers[].kaliplar`'a `{ad, olcu, partSaleId}` olarak ekliyor; ayna satır `uretimFormGonder` ve `uretimFormId` taşımıyor. R17'nin ilk kümesi bu yüzden her Extra Kalıp'ı iki kez sayardı ve ayna satır kalıcı `bekliyor` türettiği için üretimi bitmiş bir kalıp bile satırı geriye çekerdi.
14. **Extra Kalıp'ın üretim bağı yalnız `partSales`'te.** `UretimFormu.jsx:129` `uretimFormId`'yi `partSales` kaydına yazıyor, `collectPending:256-280` bekleyen Extra Kalıp'ı o kayıttan topluyor; aynaya hiç dokunulmuyor. Dashboard'un bekleyen kalıp sayacı da aynı ayrımla doğru çalışıyor (`Dashboard.jsx:196-206`: `kaliplar` ve `partSales` ayrı sayılıyor, ayna işaret taşımadığı için sayılmıyor).
15. **`kalipIdx` konumdur.** `uretimFormModel.js:22` yorumu "kaynak dizisindeki index" diyor, `UretimFormu.jsx:250` `kalipIdx: i` yazıyor. Müşteri formu kalıp silmeyi `filter((_, idx) => idx !== i)` ile yapıyor (`CustomerAddEditForm.jsx:343-346`), yani silinen satırdan sonraki her kalıbın konumu kayıyor ve form satırı başka kalıbı işaret ediyor.
16. **Seçicilerin fiziksel yeri yoktu.** Formun kalıp satırı beş sütunlu ızgara (`CustomerAddEditForm.jsx:317`, `"auto 1fr 1fr auto 36px"`: sıra, ad, ölçü, "Üretim formuna gönder", sil); detayın kalıp listesi tek satırlık rozet şeridi (`CustomerDetailModal.jsx:1090-1101`), `Select` sığmıyor.
17. **Extra Kalıp kaydı zaman çizelgesinde.** `MachineTimeline.jsx:147` tek kalıplı girişin başlığı, `:324-351` partideki satırlar; düzenleme `cust_kalip_edit` ile `onEditPartSale`'i açıyor. Dosyanın `kanit-eslemesi.json`'da kendi kayıtları var, yani R12 dördüncü bir dosyayı değiştiriyor.
18. **Stok rozetlerinin renkleri.** `MakinaStokTab.jsx:16-19`: montajda **mor** (`pur700`/`purBg`), satışa hazır yeşil (`grn700`/`grnBg`), önceki partiden kaldı mavi (`blu700`/`bluBg`). R16'nın mavi `montaj`'ı Stok'un "önceki partiden kaldı" rengiyle, R18'in mor `hazir`'ı Stok'un "montajda" rengiyle çakışıyordu; makina pili ile kalıp pili aynı hücrede alt alta durduğu için mor iki anlama gelirdi.
19. **Ayna satır için ikinci bir ayrım yolu yok.** Detay penceresi konumla tahmin ediyor (`CustomerDetailModal.jsx:1092`, `k.partSaleId != null || i >= detailView.kaliplar.length - detailKalipSatisAdedi`; sayı `deriveCustomerDetail.js:219`, `deletedAt` süzmüyor). Sezgisel ölçüt bir rozet için yeterli, "2/4" sayısı için değil.
20. **Turuncu ile amber ayırt edilemiyor.** `orTx` ile `amb700` ton farkı aydınlıkta **9 derece** (H 17° ve 26°), karanlıkta **14 derece** (24° ve 38°); doygunluk ve parlaklık neredeyse aynı, zeminleri (`ambBg3`, `ambBg2`) 1,05 ve 1,20 kontrast oranında. `orTx` ile `red700` arasında yalnız 17 derece var. Kalan bütün renk çiftlerinin ton farkı en az 38 derece. Onaylanan paletin yedi pilinin metin/zemin kontrastı (aydınlık / karanlık): kırmızı 5,30 / 5,54 · mor 6,48 / 8,34 · yeşil 4,79 / 8,16 · amber 4,51 / 7,24 · nötr 6,92 / 6,25 · mavi 6,16 / 6,09 · teal 5,25 / 8,69; hepsi WCAG AA eşiğinin (4,5) üstünde.
21. **Tasarım sözlüğünde rozet yok.** `tasarim.jsx`'te `Rozet` araması boş; bileşen `MakinaStokTab.jsx:21-23`'te yerel ve dışa verilmemiş, renk haritası `:16-19`'da. Sözlüğün altı yapı taşı arasında rozet geçmiyor.
22. **Kontrast testi dosya adı doğruluyor.** `tasarim-kontrast.test.js:101-105` ölçülen her token çiftinin adı verilen dosyada `var(--token,` olarak geçmesini istiyor; metin çiftleri (`METIN_0030`) ve kenar çiftleri (`KENAR_0030`) ayrı ölçülüyor (`:93-99`).
23. **`oncesi` müşteri listesinde işe yaramaz.** `useFilteredList.js:18-24`'te `oncesi` zaten `filterFn`'i uygulamış kümedir ve `ikinciFiltre` verilmezse `filtered === oncesi`. `Customers.jsx:119-124` süzgeç pillerini `filterFn` içinde çözüyor, `:501-506` bütün sayıları ham `customers` üzerinden hesaplıyor. 0100'ün deseni Stok'ta geçerli çünkü orada durum süzgeci ikinci süzgeçtir.
24. **`uretimFormlari` prop'u yok.** `Customers.jsx:23-48` prop listesinde geçmiyor, App'in tek `<Customers …>` satırı (`App.jsx:1702`) geçmiyor; `liveUretimFormlari` `:887`'de hazır ve Dashboard (`:1697`) ile Stock'a (`:1704`) veriliyor. `<Customers` çizen otuz beş dosya sayıldı (otuz üç test, `scripts/evidence/0009-sayfa.jsx`, `scripts/tests/layout/suzgec.jsx`), hiçbiri prop'u geçmez.
25. **İki ayrı düzenleme kimliği var.** `serverPermissionDefs.js:81` `cust_edit` ("Müşteri düzenle"), `:85` `cust_detail_edit` ("Ana kaydı düzenle"), `:119` `cust_kalip_edit` ("Kalıp satışını düzenle"); detay penceresi yerinde düzenlemeleri `cust_detail_edit` ile kapatıyor (`CustomerDetailModal.jsx:1078`).
26. **Üç tablonun okuma tekniği farklı.** `customer_kaliplar` alanları tek tek kuruyor (`db.cjs:1350-1358`); `customers` (`:1363`) ve `part_sales` (`:1441`) `...rest` yayıyor, yani yeni TEXT sütun `null` olarak gövdeye girerdi. 0100'ün çözümü `stock` okumasında duruyor (`:1404-1411`).
27. **Durum dizeleri başka kavramlarla çakışıyor.** `"bekliyor"` → `stock/YedekParcaSatisTab.jsx:22` (tahsis durumu anahtarı) ve iki yorum satırı; `"gonderildi"` → `Documents.jsx:21` (`DURUM_OPTS`), `Dashboard.jsx:221`; `"hazir"` → `stock/PartiUretimPanosu.jsx:9` (pano sütun anahtarı). `"montaj"`, `"teslim"` ve `"uretimde"` `src/components` altında düz metin olarak hiç geçmiyor.
28. **Kanıt kaydının iki hâli var.** `tasarim-kaynak.test.js:160` `beklenen: "ayni"` kaydın rapor satırında `piksel === 0` istiyor; `0009-ekran.cjs:68` yeni ekranın ilk satırına `fark: "önce görüntüsü yok"` yazıyor ve **`piksel` anahtarı hiç olmuyor**; `kanit-eslemesi.test.js:26` `specs/done`'daki bir spec'in `degisti` kaydını hata sayıyor. Değişen üç ekranın bugünkü kayıt sayıları: `Customers.jsx` 11, `CustomerAddEditForm.jsx` 38, `CustomerDetailModal.jsx` 29, hepsi `ayni` ve hepsi eski raporlara bağlı.

---

## Kararlar (Takım Yöneticisi, 2026-10-24)

1. **Gri "teslim edildi" pili kalkar.** Teslim edilen satır renksiz kalır, arşiv kavramına da gerek kalmaz (X1, X2).
2. **Kalıp pili sayılıdır** ("2/4"), çünkü makinaların çoğunda birden çok kalıp var (R20, ölçüm 8).
3. **Kapsam hem makinayla gelen kalıplar hem Extra Kalıp satışlarıdır** (R17).
4. **Teslim tarihi yazılmaz**, yalnız işaret tutulur (X3).
5. **Kutuların yeri Evrak değil müşteri kaydıdır** (R4, R11, X4).
6. **Kalıp durumu üretim formundan türer ve elle düzeltilebilir** (R8, R10).
7. **Makina durumu stoktan damgalanır ve elle düzeltilebilir** (R2, R4).
8. **"Otomatik (X)" seçeneği** kalıp seçicisinin ilk seçeneğidir, Evrak'ın tür kutusunun deseniyle (R10).
9. **Turuncu "sipariş bekliyor" kalır**, çünkü bir iş uyarısıdır; "üretim formuna gönderildi" ara adımı renksizdir; "üretimde" sarı yerine **amber** olur, turuncuyla ayrılsın diye (R18).
10. **Sayı kümesi Extra Kalıpları da içerir**, tek pil ve tek sayı olur (R17, R20).
11. **Eski kayıtlar sessiz kalır**, pilsiz satır "bilinmiyor" demektir; müşteri tarafında boş makina durumu "hazır" sayılmaz (R6, R21).
12. **Tek süzgeç pili eklenir: "Teslim Bekleyenler"** (R23, X9).

### Analistin spec'te verdiği kararlar

13. **Makina durumu türetilmez, damgalanır.** Stok satırı satışta siliniyor, türetecek canlı kaynak kalmıyor; bu yüzden makina seçicisinde "Otomatik" seçeneği yoktur, kalıp seçicisinde vardır (R2, R10).
14. **Durum müşteri detayında da değiştirilebilir** (R5, R11). Teslim işareti günlük bir iştir, bunun için bütün müşteri formunu açıp kilit almak kullanımı düşürür ve asıl riskimiz zaten sistemin işaretlenmemesidir.
15. **Alan adı iki yerde de `kalipDurumu`** (R7). Spec 0095'in `ucretsizMi` emsali: aynı kavram iki tabloda aynı adı taşır, tek okuma yolu yazmak kolaylaşır.
16. **Pil metinlerinde "MAKİNA"** yazılır, müşterinin "MAKİNE" yazımı uygulamanın diline uyarlanır (C5).
17. **Bulunamayan üretim formu `gonderildi`'ye düşer** (R8). Çöpe atılmış form yüzünden kalıbın "hazır" görünmesi yanlış bilgi olurdu.

### QA turunda verilen kararlar (2026-10-24)

18. **Damgalanan değer stok satırının ekranda görünen durumudur** ve `uretimDurumuOf` yalnız yazma anında, yalnız `satisKaydi.js`'te çağrılır (R2/2, R6/2). Kullanıcı satışı yaparken stok ekranında "Satışa hazır" yazısını görüyor; satıştan sonra aynı makinanın "bilinmiyor" olması bilgi kaybı olurdu. İki kuralın karışmaması R6'nın asıl derdiydi, o da okuma tarafında korunuyor.
19. **Makina durumu seçicisi yetki perdesinin dışındadır** ve yeri Garanti Bitiş ile Üretim Tarihi arasıdır (R4/2). Gider yetkisi olmayan satış kullanıcısı bu işareti günlük olarak değiştirecek (Karar 14).
20. **Seçicinin iki ekranda şekli kararlaştırıldı** (R11/2): formun ızgarası altı sütuna çıkar, detayın rozet şeridi satır listesine çevrilir. Kalıbı çok olan kayıtlar kural olduğu için (ölçüm 8) satır listesi zaten daha okunur; şekil kararlaştırılmazsa görsel kanıt turunda iki kez değişirdi.
21. **Makina pilleri Stok rozetleriyle aynı renktedir:** montaj mor, hazır yeşil (R16/2). Aynı kavramın iki ekranda iki renk olması işareti anlamsızlaştırır.
22. **Küme ayna satırları dışarıda bırakır** (R17/2). `partSaleId` açık bağ olduğu için ayrımı türetmeye gerek yok; Dashboard'un bekleyen kalıp sayacı da bu ayrımla doğru çalışıyor (ölçüm 14).
23. **Payda her zaman kümenin toplamıdır** (R20/2). Paydayı küçültmek bastırılan kalıpları gizler ve "1/1" ile "4/4" aynı görünür.
24. **R21'in "makina durumu dolu" ölçütü `teslim`'i de kapsar** (R21/2). Teslim edilmiş makinanın bekleyen kalıbı hâlâ bir iştir.
25. **Paylaşılan rozet açılmaz, borç sözlüğe yazılır** (R22/2, X13). Stok'u 0 piksel tutmak zorunlu (AC-33); paylaşılan bileşene çevirmek görünümü aynı tutsa bile kapsamı büyütür ve kanıt turunu ikiye katlar.
26. **Süzgeç pilinin sayısı bugünkü beş pilin desenini izler**, `oncesi` kullanılmaz (R23/2). Altıncı pilin beşinden farklı davranması tutarsızlık olur; `oncesi` kullanmak `listFilter`'ı `ikinciFiltre`'ye taşımayı gerektirir, bu da beş pilin bugünkü sayısını değiştirir ve AC-27 ile çelişir.
27. **Pilin ilk gün 0 göstermesi beklenen davranıştır** ve sürüm notuna yazılır (R23/3). Boş pil "çalışmıyor" diye bildirilir; beklentiyi önceden yazmak düzeltme turunu önler.
28. **Sunucu alan denetimi açılmaz**, sınır yazılır (R30/2). İki işaret alanı için güvenlik sınırı açmaya değmez, ama sınırın yazılı olması gerekir.
29. **İndeks kırılganlığı düzeltilmez, sınır yazılır** (R9/2, X11). Bu spec yeni bir hata üretmiyor, var olan kırılgan bağı okumaya başlıyor; sınır yazılmazsa kullanıcı yanlış pili uygulamanın hatası sanır.
30. **Eski ayna satırların çift sayılması kabul edilen sınırdır** (R17/3, X12).


### Plan turu kararları (2026-10-24)

**Karar 31 (onaylandı): harita anahtarı form kimliğini de taşır.** `uretimFormHaritasi` yalnız canlı formlardan `formId → Map(anahtar → satır)` kurar; anahtar müşteri kalıbında `musteri:<kaynakId>:<kalipIdx>`, Extra Kalıp'ta `extra_kalip:<kaynakId>`. Arama kalıbın kendi `uretimFormId`'siyle yapılır: çöpteki form ya da başka formdaki aynı üçlü bağ kurmaz ve R8'in "bulunamıyor" dalı (`gonderildi`) doğal olarak doğar. R9/2'nin konum kırılganlığı yalnız aynı formun içinde kalır.

**Karar 32 (onaylandı): detayda makina durumu seçicisi kalıp kartının hemen üstünde tek satırdır** ("Makina durumu: [seçici]", `cust_detail_edit`). Kalıp durumuyla aynı soruyu cevaplar; alan ızgarası salt okunur kartlardan oluştuğu için oraya `Select` konmaz.

**Karar 33 (onaylandı): iki seçici ortak bileşendir.** `src/components/customers/DurumSecici.jsx` `MakinaDurumuSecici` ve `KalipDurumuSecici`'yi dışa verir; form, detay ve zaman çizelgesi onları çağırır. Seçenek listesi ve "Otomatik (…)" etiketi kütüphaneden gelir (R27, C4).

**Karar 34 (onaylandı): pil yerel bileşendir ve sözlük borcuna ikinci kopya olarak yazılır.** `src/components/customers/DurumPili.jsx` Stok rozetinin ölçüleriyle çizer. Ölçüldü: bugün rozet yalnız `MakinaStokTab.jsx`'te; R22/2'nin "iki yerel kopya" cümlesi bu işle doğru olur. Borç maddesi iki kopyayı adıyla yazar ve "üçüncüsünden önce sözlüğe taşınır" der.

**Karar 35 (onaylandı): ton ayrımı testte ölçülür.** `tasarim-kontrast` 0030 bloğuna metin token'larından HSL tonu hesaplayan yardımcı eklenir; altı renkli pilin her çifti iki temada en az 26 derece ayrılır ve hiçbir pil ikinci bir pille aynı token çiftini kullanmaz (AC-24). Karanlık temada eşik tutmazsa renk uygulama turunda değiştirilmez, Takım Yöneticisine sorulur. Ödeme pilinin çifti `red700` / `redBg2`'dir (satır zemini `redBg` olduğu için pil zemini bir ton koyu).

**Karar 36 (onaylandı): satır başına durum tek haritadan.** `Customers` tek `useMemo` ile müşteri kimliği → `{makinaPili, kalipPili, teslimBekliyor}` haritası kurar; hücre, süzgeç ölçütü ve süzgeç sayısı aynı haritayı okur (C7).

**Karar 37 (onaylandı): sözlük atıfları güncellenir.** `Customers.jsx:499`, `:533` ve `MachineTimeline.jsx:88` atıfları bu işin eklediği satırlarla kayar; `docs/tasarim-sozlugu.md`'de düzeltilir (0105 Karar 34 emsali).

**Karar 38 (onaylandı): detayda seçicinin çizilip çizilmeyeceği yalnız `partSaleId` ile belirlenir.** Kırmızı tint'in ölçütü bugünkü konum sezgisiyle aynen kalır (görsel ipucu); seçici veri yazdığı için ayrım açık bağa dayanır (R17/3). Eski aynada çizilen seçicinin yazdığı değer zararsızdır, o satır kümeye girmez.

**Karar 39 (onaylandı): damga mevcut zincirin üçüncü halkasıdır.** `deductMachineStock` içinde `makinaDurumuDamgala(partiDamgala(uretimTarihiDamgala(clean, satir), satir), satir)`; serili ve serisiz dal ile seri bekleyen düzenlemenin düşüm kolu aynı noktadan geçer.

**Karar 40 (onaylandı): tek yazıcı.** `musteriDurumu.durumYaz(kayit, alan, deger)` alanı her çağrıda siler, değer o alanın geçerli değerlerinden biriyse geri yazar (0101 `kalipCapiYaz` deseni). Form, detay ve zaman çizelgesi bunu çağırır; boş seçenek alanı siler (R4, R10).

**Karar 41 (Takım Yöneticisi, uygulama turu 2026-10-24): ton ayrımı tam dereceyle ölçülür.** Ölçüldü: kırmızı (`red700`) ile amber (`amb700`) aydınlık temada 25,96 derece, karanlıkta 30 dereceden fazla ayrık. Ölçüm 20'deki rakamlar tam dereceye yuvarlanmıştı; test farkı yuvarlayarak 26 ile karşılaştırır, renkler değişmez.

### Triyaj kararları (2026-10-25)

**Karar 42 (triyaj bulgu 2): formda elle seçilmiş makina durumu stok damgasına önceliklidir** (`satisKaydi.makinaDurumuDamgala`, `uretimTarihiDamgala` emsali; R2'nin tamamlayıcısı). Damga kayıt anında yazılır; ekleme formunda stok satırı seçilince makina durumu seçicisi önizleme göstermez ve "Seçilmedi" kalır, değer kayıttan sonra görünür (bilinçli: önizleme göstermek formda damgayla elle seçimi ayırt edilemez kılardı; App testi sabitler).

**Karar 43 (triyaj bulgu 4): ödeme pili ince `redBr` kenarı taşır.** Borçlu satırın hover zemini pilin zemini (`redBg2`) ile aynı olduğu için fare üstündeyken pilin sınırı kayboluyordu; kenar kontrast testinin 0030 bloğunda ölçülür (aynı satırdaki "Taksit Gecikti" rozeti kapsam dışı).

**Triyaj bulgu 3:** satışı bulunamayan ayna satır (Extra Kalıp başka müşteriye taşındıysa) formda ve detayda "—" yazar. Ayna satırın müşteri değişiminde taşınmaması bu spec'ten eski, ayrı bir sorundur.

**Uygulama notu (2026-10-24):** görsel kanıtta değişen ekranlar "Görsel kanıt" tablosundan fazla: makina durumu satırı her müşteri detayında, seçici her müşteri formunda çizildiği için bütün form ve detay türevleri değişti; Stok, pano, Kalıp Üretim Formu ve Anasayfa 0 piksel (C10 tuttu). Bilinçli güncellenen eski testler: 0104 AC-6'nın kayıt nesnesi (`makinaDurumu: "hazir"`, R2), 0079 ve 0095 ekran kıyasları (`tests/fixtures/0106-ayikla.js`), `suzgec-yerlesim` (altı süzgeç); hepsi "spec 0106 ile" notlu.

---

## Acceptance Criteria

### Makina durumu

- **AC-1.** Stoktan satılan montajdaki makinanın müşteri kaydı `makinaDurumu: "montaj"` ile doğar; stoktan satılan satışa hazır makina `"hazir"` ile doğar. **Alanı boş olan** stok satırı satılınca da `"hazir"` damgalanır (ekranda "Satışa hazır" rozetiyle duruyordu, R2/2).
- **AC-2.** Stok dışı (manuel seri) satışta alan kayda hiç yazılmaz, ne boş dize ne null.
- **AC-3.** Müşteri formunun makina seçicisi dört seçenek gösterir (boş, Montajda, Hazır, Teslim edildi) ve seçilen değer kayda yazılır; boş seçenek alanı siler.
- **AC-4.** Müşteri detayındaki seçici aynı değeri yazar ve pencereyi kapatmaz.
- **AC-5.** `makinaDurumu` boş olan kayıt hiçbir makina pili çizdirmez; `"teslim"` olan da çizdirmez.
- **AC-6.** Stok ekranının durum sütunu ve `uretimDurumuOf` davranışı değişmedi (0100'ün testleri dokunulmadan yeşil).

### Kalıp durumu ve türetme

- **AC-7.** `uretimFormGonder` işaretsiz, `uretimFormId` boş kalıbın türetilmiş durumu `bekliyor`.
- **AC-8.** `uretimFormGonder` işaretli, `uretimFormId` boş kalıbın durumu `gonderildi`.
- **AC-9.** `uretimFormId` dolu ve bağlı satır `tamamlandi` değilse durum `uretimde`.
- **AC-10.** Bağlı satır `tamamlandi` ise durum `hazir`.
- **AC-11.** `uretimFormId` dolu ama form çöpte ya da satır bulunamıyorsa durum `gonderildi` (Karar 17).
- **AC-12.** Extra Kalıp satışı aynı beş durumu aynı kurallarla türetir; bağı `("extra_kalip", partSale.id)`.
- **AC-13.** `kalipDurumu` dolu olan kalıpta türetme çalışmaz, yazılan değer kazanır.
- **AC-14.** Seçicinin ilk seçeneğinin metni "Otomatik (" ile başlar ve parantez içinde o anki türetilmiş durumun adını taşır; seçilince alan silinir ve kalıp türetmeye geri döner.

### Pil gösterimi

- **AC-15.** Borçlu satırın zemini bugünkü `redBg`, hover `redBg2` ve `title` metni **birebir aynı** kalır.
- **AC-16.** Borçlu satır ayrıca "ÖDEME BEKLİYOR" pili taşır.
- **AC-17.** `montaj` durumundaki makina mor "MONTAJ YAPILIYOR", `hazir` yeşil "MAKİNA HAZIR" pili taşır; iki renk Stok rozetlerinin token'larının aynısıdır (R16/2).
- **AC-18.** Kümedeki en geri kalmış durum pilde görünür: biri `bekliyor`, biri `hazir` olan iki kalıplı kayıtta pil `bekliyor` durumundadır.
- **AC-19.** Pil sayısı o durumdaki kalıp sayısı ve toplamı yazar ("KALIP ÜRETİMDE 2/4"); tek kalıplı kayıtta sayı yazılmaz. Payda bastırılmış kalıpları da sayar: {3 `bekliyor`, 1 `uretimde`} ve boş makina durumu "KALIP ÜRETİMDE 1/4" yazar (R20/2).
- **AC-20.** Bütün kalıpları `teslim` olan kayıt kalıp pili taşımaz; kalıbı olmayan kayıt da taşımaz.
- **AC-21.** `bekliyor` pili yalnız `makinaDurumu` dolu olan kayıtta çizilir (`teslim` de dolu sayılır); boş olanda çizilmez, ama aynı kayıttaki `uretimde` ya da `hazir` pili çizilir ve gösterilebilir durum kalmazsa pil hiç çizilmez (R18, R21/2).
- **AC-22.** Bir satırda en çok üç pil ve sırası ödeme, makina, kalıptır.
- **AC-23.** Durum sütunu Model'in sağındadır ve bayi listesinde (`isCustomer` false) çizilmez.
- **AC-24.** Yedi pilin altı renkli olanının metin/zemin çifti ve nötr pilin kenar/zemin çifti `tasarim-kontrast`'ın 0030 bloğunda ölçülür ve iki temada da eşiği geçer; kayıtların dosyası `src/lib/musteriDurumu.js`'tir (R22/3). Ölçülen çiftlerin ton ayrımı en az 26 derecedir ve hiçbir pil ikinci bir pille aynı token çiftini kullanmaz (R18/2).

### Süzgeç

- **AC-25.** "Teslim Bekleyenler" pili makina durumu `hazir` olan ya da en az bir kalıbı `hazir` olan kayıtları listeler.
- **AC-26.** Pilin üzerindeki sayı ham `customers` dizisinden gelir, aramadan ve seçili süzgeçten bağımsızdır (bugünkü beş pilin deseni); `useFilteredList`'in `oncesi` kümesi kullanılmaz (R23/2).
- **AC-27.** "Borçlu Firmalar" pilinin kümesi ve sayısı değişmedi.

### Kütüphane ve değişmeyenler

- **AC-28.** Durum türetmesi, en geri kalmış durum seçimi, pil metni ve rengi `src/lib/musteriDurumu.js`'tedir; `src/components` altında durum dizeleriyle karşılaştırma ve pil metni düz yazımı yoktur (kaynak taraması).
- **AC-29.** Üretim formu haritası bir kez kurulur: 1000 müşteri ve 50 formla yapılan ölçümde harita kurulumu bir kez çağrılır (casus) ve toplam süre eşiğin altındadır. Aynı nesne listeye, forma ve detay penceresine iletilir, üç yerde yeniden kurulmaz (R26/2).
- **AC-30.** Üç yeni sütunun gidiş dönüşü doğrulanır ve **boş değer gövdeye yazılmaz** (`db-roundtrip.cjs`, spec öncesi gövde fikstürü `0106-govde-once.json`); `customers` ve `part_sales` okumaları alanı destructuring ile ayırır (C2/2).
- **AC-31.** Temiz kurulumda üç sütun da oluşur (`db-clean-install.cjs`).
- **AC-32.** Yeni izin, yeni izin kimliği, yeni sunucu kuralı ve yeni birleştirme kuralı eklenmedi (içerik taraması).
- **AC-33.** Dashboard'un bekleyen kalıp sayacı, Kalıp Üretim Formu'nun satır toplaması, Parti Üretim Panosu ve stok ekranı değişmedi (mevcut testleri dokunulmadan yeşil).
- **AC-34.** Yazdırma çıktıları ve dışa aktarma dosyaları durum alanlarını okumaz (kaynak taraması).

### QA turu kriterleri (2026-10-24)

- **AC-35.** `uretimDurumuOf` çağrısı `src` altında yalnız `stokDurumu.js`, Stok ekranı ve `satisKaydi.js`'tedir; `musteriDurumu.js` ve müşteri ekranları onu çağırmaz (kaynak taraması, R6/2).
- **AC-36.** Makina durumu seçicisi gider yetkisi **olmayan** kullanıcıda da çizilir ve Garanti Bitiş ile Üretim Tarihi arasındadır (R4/2).
- **AC-37.** `partSaleId` taşıyan `kaliplar` satırı kümeye girmez: bir Extra Kalıp satışı olan kayıtta pilin paydası **1**'dir, 2 değil; satış `hazir` ise pil `hazir` gösterir, ayna satır yüzünden `bekliyor`'a düşmez (R17/2, R7/2).
- **AC-38.** Ayna satırda durum seçicisi çizilmez (form ve detay); yerinde türetilmiş durumun adı salt okunur görünür (R11/2).
- **AC-39.** Extra Kalıp'ın seçicisi zaman çizelgesindeki Extra Kalıp satırındadır ve `cust_kalip_edit` ile çizilir; detay penceresinin kalıp seçicisi `cust_detail_edit` ile (R12/2, R30).
- **AC-40.** `Customers` `uretimFormlari` prop'unu `[]` varsayılanıyla alır: prop'u geçmeyen otuz beş düzenek yeşil kalır ve boş listede bütün kalıplar `bekliyor` ya da `gonderildi` türetir (R31, R33).
- **AC-41.** Durum dizelerinin taraması kimlik bazlıdır ve üç istisnası (tahsis durumu, teklif durumu, pano sütunu) tam yolla ve gerekçeyle listelenir (C4/2).
- **AC-42.** `musteriDurumu.js` React almaz, saat okumaz, veri yazmaz ve `uretimFormlari` verilmediğinde çökmez (R25).
- **AC-43.** Paylaşılan rozet açılmadı: `tasarim.jsx`'te rozet yoktur, `MakinaStokTab.jsx`'in yerel `Rozet`'i değişmedi ve `docs/tasarim-sozlugu.md`'nin "Bilinen borç" bölümünde rozet maddesi var (R22/2, X13).
- **AC-44.** Kanıt kayıtları kapanışta yeniden çekilen `0106-taban-piksel-raporu.json`'a bağlı ve `ayni`dir; hiçbir kayıt `degisti` olarak kalmaz (C9).

---

## Görsel kanıt

Taban raporu bu spec'ten önceki kodla çekilir, kapanışta yeniden çekilir. Kayıtların yaşam döngüsü C9'da yazılı: iş sürerken `0106-piksel-raporu.json` ve `degisti` + `onay`, kapanışta yeniden çekilen `0106-taban-piksel-raporu.json` ve `ayni`.

| Ekran | Beklenen |
|---|---|
| `musteriler-liste` | **Değişti**: yeni Durum sütunu ve piller |
| `musteriler-0106-piller` (yeni) | Üç pilli satır, sayılı kalıp pili, yedi rengin yan yana ayrımı, dar pencere (C8/2) |
| `musteriler-0106-suzgec` (yeni) | "Teslim Bekleyenler" süzgeci seçili liste |
| `musteri-formu` | **Değişti**: makina durumu seçicisi ve kalıp satırındaki durum seçicisi (altı sütunlu ızgara) |
| `musteri-formu-0106-durum` (yeni) | İki seçici de dolu, "Otomatik (Üretimde)" seçeneği açık, ayna satırda seçici yok |
| `musteri-detay` | **Değişti**: kalıp bölümü satır listesine çevrildi, her satırda durum seçicisi |
| `musteri-detay-0106-kalip` (yeni) | Zaman çizelgesindeki Extra Kalıp satırının durum seçicisi (`MachineTimeline.jsx`) |
| `musteriler-gruplu`, `musteriler-bos-arama`, `musteriler-bos-kayit` | Durum sütunu başlığı eklendiği için **değişti** |
| Stok, pano, Kalıp Üretim Formu ekranları | 0 piksel (C10) |

---

## Definition of Done

- [x] Kırk dört kabul kriterinin hepsi karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Bütün kurallar `src/lib/musteriDurumu.js`'te; ekranlar yalnız çiziyor ve kaynak taraması bunu sabitliyor (R25, R27, AC-28).
- [x] Üç yeni sütun dört nokta kuralıyla açıldı, üç tablonun okuması ayıklamalı, göç yok (C2, C2/2, C3, AC-30, AC-31).
- [x] Yeni izin, sunucu kuralı ve birleştirme kuralı eklenmediği taramayla doğrulandı (R30, AC-32).
- [x] Kullanıcıya görünen bütün metinler Türkçe; "MAKİNA" yazımı kullanıldı (C5).
- [x] Görsel kanıt alındı, değişen ekranlar iş sürerken `degisti` + `onay` ile kaydedildi, değişmeyenler 0 piksel; kapanışta taban raporu yeniden çekildi ve bütün kayıtlar `ayni`ye çevrildi (C9, AC-44).
- [x] Pil paleti ölçüldü: yedi pil iki temada kontrast eşiğini geçer, ton ayrımı en az 26 derece (R18/2, AC-24).
- [x] Yeni `uretimFormlari` prop'u varsayılanıyla eklendi ve otuz beş düzenek yeşil (R31, R33, AC-40).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] CLAUDE.md'nin ilgili bölümü güncellendi.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu, 2026-10-24)

| # | Boşluk | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| B-1 | Extra Kalıp kalıbı `kaliplar`'a da yazılıyor, küme çift sayıyor ve ayna satır kalıcı `bekliyor` türetiyor | Bloklayıcı | Küme `partSaleId`'siz satırlar ∪ canlı Extra Kalıp satışları; ayna satırın durumu `partSales`'ten okunur, seçicisi çizilmez | R7/2, R8/2, R17, R17/2, R17/3, AC-37, AC-38, ölçüm 13, 14, 19, Karar 22, 30, X12 |
| B-2 | Boş `uretimDurumu` satılınca ne damgalanır; R2 ile R6 çelişiyor | Bloklayıcı | Damga `uretimDurumuOf`'un sonucu, çağrı yalnız yazma anında ve yalnız `satisKaydi.js`'te; R6 okuma kuralı olur | R2, R2/2, R6, R6/2, AC-1, AC-35, ölçüm 10, 11, Karar 18 |
| B-3 | Turuncu ile amber 9 derece ton farkıyla ayırt edilemiyor; makina `montaj` Stok'ta mor, kalıp `hazir` mor | Bloklayıcı | Yedi pilin paleti yeniden kuruldu: kırmızı, mor, yeşil, amber, nötr, mavi, teal; Karar 9 revize | R16, R16/2, R18, R18/2, AC-17, AC-24, ölçüm 18, 20, Karar 21 |
| Ö-1 | `uretimFormlari` prop'u yok, otuz beş düzenek onu geçmiyor | Önemli | Prop `[]` varsayılanıyla eklenir, App kapısız geçirir, harita tek yerde kurulur | R26/2, R31, R32, R33, AC-29, AC-40, AC-42, ölçüm 24 |
| Ö-2 | Makina seçicisinin yeri gider yetkisi perdesinin içinde | Önemli | Garanti Bitiş ile Üretim Tarihi arasına, perdenin önüne | R4, R4/2, AC-36, ölçüm 12, Karar 19 |
| Ö-3 | Kanıt kayıtlarının yaşam döngüsü yazılmamış | Önemli | İki aşama yazıldı: `degisti` + `onay`, kapanışta yeniden çekilen tabana bağlı `ayni` | C9, AC-44, Görsel kanıt, ölçüm 28 |
| Ö-4 | AC-26 `oncesi` diyor, oysa müşteri listesinde pil `filterFn`'in kendisi | Önemli | Sayı ham `customers`'tan, bugünkü beş pilin deseniyle | R23/2, AC-26, ölçüm 23, Karar 26 |
| Ö-5 | "Tasarım sözlüğünün rozeti" yok, `Rozet` MakinaStokTab'da yerel | Önemli | Paylaşılan rozet açılmaz, biçim Stok'un ölçüleriyle aynı, borç sözlüğe yazılır | R22, R22/2, R22/3, C10, AC-43, ölçüm 21, 22, Karar 25, X13 |
| Ö-6 | C4 taraması üç ekran dosyasındaki başka kavramlara takılır | Önemli | Kimlik bazlı tarama, gerekçeli üç istisna, ad tuzağı maddesi | C4/2, C4/3, AC-41, ölçüm 27 |
| Ö-7 | R12 dördüncü dosyayı (`MachineTimeline.jsx`) değiştiriyor, listede yok | Önemli | Dosya ve satırları "Etkilenen alanlar"a, yeni kanıt ekranı | Etkilenen alanlar, R12/2, AC-39, Görsel kanıt, ölçüm 17 |
| Ö-8 | `bekliyor` bastırılınca pil ne gösterir, sayının paydası ne olur | Önemli | Gösterilebilir durumların en geri kalmışı; payda her zaman kümenin toplamı | R18, R20/2, R21/2, AC-19, AC-21, Karar 23, 24 |
| Ö-9 | `kalipIdx` konum tabanlı, kalıp silinince bağlar kayıyor | Önemli | Düzeltilmez, sınır yazılır | R9/2, X11, ölçüm 15, Karar 29 |
| Ö-10 | Seçicilerin fiziksel yeri belirsiz (beş sütunlu ızgara, rozet şeridi) | Önemli | Form ızgarası altı sütun, detayın kalıp bölümü satır listesi | R11/2, Görsel kanıt, ölçüm 16, Karar 20 |
| K-1 | "İki yeni sütun" aslında üç sütun | Küçük | Üç sütun, iki alan adı | Etkilenen alanlar, C2, AC-30, AC-31, DoD |
| K-2 | Üç tablonun ayıklama tekniği farklı, C2 yalnız birini anıyor | Küçük | Üç teknik ayrı ayrı yazıldı | C2/2, AC-30, ölçüm 26 |
| K-3 | R30 `cust_edit` diyor, detayın kimliği `cust_detail_edit` | Küçük | Üç yol üç kimlikle yazıldı | R30, AC-39, ölçüm 25 |
| K-4 | Sunucu alan denetimi yok, durum bölüm düzeyinde yazılır | Küçük | Alan denetimi açılmaz, sınır yazılır | R30/2, Karar 28 |
| K-5 | Kontrast kaydının dosyası bileşen değil kütüphane olmalı | Küçük | Kayıtların dosyası `src/lib/musteriDurumu.js` | R22/3, AC-24, ölçüm 22 |
| K-6 | AC-24'ün "beş renk" sayısı yanlış, nötr pilin ölçüm kuralı yok | Küçük | Altı renkli pil metin çiftiyle, nötr pil kenar çiftiyle ölçülür | AC-24, ölçüm 20 |
| K-7 | C8'in ölçümü yok | Küçük | Görsel kanıtla karşılanır, yerleşim testi açılmaz | C8/2, Görsel kanıt |
| K-8 | Dört satır atfı kaymış | Küçük | `Documents.jsx:1077`, `UretimFormu.jsx:129`, `db.cjs:1350-1358`, `theme.js:52-101` ve Context atıfları düzeltildi | Context, Ölçüm 1, Ölçüm 6, C2/2 |
| K-9 | Süzgeç bugünkü veride 0 gösterir | Küçük | Beklenti sürüm notuna yazılır | R23/3, Karar 27 |

**Toplam:** 22 boşluk (3 Bloklayıcı, 10 Önemli, 9 Küçük); hepsi Takım Yöneticisi tarafından onaylandı.

---

## SCORECARD

| | |
|---|---|
| **Uygulama commit** | `d7aacc0` (kapanış ayrı commit) |
| **Dal** | `feat/0106-musteri-durumu` (taban `52651a1`) |
| **Spec revizyon sayısı** | 3 (revizyon 2 QA turu, 22 bulgu; revizyon 3 plan onayı, on öneri, Karar 31–40); uygulamada Karar 41 (ton ayrımı tam dereceyle, TY), triyajda Karar 42–43 |
| **Düzeltme turu sayısı** | 1. Triyaj: 5 bulgu (1 orta, 4 düşük): R9/2 kayma davranışı yanlış yazılmıştı (başka kalıbın durumu görünebilir; Extra Kalıp silme tetikleyicisi; test ve sürüm notu), formdaki elle seçimin önceliği belgelenmemişti (Karar 42), satışı bulunamayan ayna satır boş yazıyordu ("—"), ödeme pili hover'da kayboluyordu (redBr kenarı, Karar 43), belge düzeni (kapanışta) |
| **Bulgu gerçek/gürültü oranı** | 5 / 0 |
| **Regresyon / kaçan hata** | 0 / 0. Spec'in ölçümü (26 derece) tam dereceye yuvarlanmıştı; test 25,96'yı yakaladı, TY kararıyla yuvarlanarak ölçülür |
| **Testler** | `musteri-durumu-0106` (saf, taramalar), `ui/musteri-durumu-0106` (liste, süzgeç, form, detay, zaman çizelgesi, harita casusu, triyaj), `ui/musteri-durumu-0106-app` (gerçek App damgası, önizlemesiz seçici), `tasarim-kontrast` (yedi pil, iki kenar, ton ayrımı), `db-roundtrip.cjs`, `db-clean-install.cjs`; "spec 0106 ile" güncellenenler 0104 AC-6, 0079 ve 0095 kıyasları, `suzgec-yerlesim` (Electron, altı süzgeç). Yedi mutasyon ve bir veritabanı mutasyonu yakalandı |
| **Görsel kanıt** | İş turunda taban eski kod ↔ eski kod 114 görüntü 0 fark (Karar 36 emsali: bu sonuç kapanışta yeniden çekilen taban raporunun yerine burada durur). İş raporu `0106-piksel-raporu.json`: 25 ekran değişti (makina durumu satırı her detayda, seçici her formda; spec'in tablosundan fazla, uygulama notu), 4 yeni ekran; Stok, pano, Kalıp Üretim Formu ve Anasayfa 0 piksel (C10). Kapanış: `0106-taban-piksel-raporu.json` son kod ↔ onaylı görüntüler, 122 görüntü 0 fark; 34 kayıt `ayni`. Kapanışta araçta belirlenimsizlik bulundu ve düzeltildi: önceki çalışmadan kalan form taslağı ("Yarım kalan taslak bulundu" şeridi) müşteri formu ekranlarında sahte fark üretiyordu; sayfa artık `crmdraft:` anahtarlarını silerek başlar |
| **Bilinen sınırlar** | `kalipIdx` konum bağı (R9/2, X11, README açık bulgu); `partSaleId`'siz eski ayna satırlar çift sayılır (R17/3); taşınan Extra Kalıp'ın aynası eski müşteride kalır (README açık bulgu); sunucu iki alanı bölüm düzeyinde güvenir (R30/2); süzgeç ilk gün 0 (sürüm notu) |

**Bu spec'ten çıkarılan ders:** Spec'teki sayısal eşik ölçüm hassasiyetiyle birlikte yazılmalı; "26 derece" tam dereceye yuvarlanmış bir ölçümdü ve testte 25,96 olarak döndü. Kanıt aracında `localStorage` çalıştırmalar arasında kalıyor; bir ekran durumu yerel depoya yazıyorsa sayfa başında temizlenmeli, yoksa sahte fark ancak kapanış çekiminde görünür.
