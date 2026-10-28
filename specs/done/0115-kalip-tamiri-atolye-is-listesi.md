# 0115 — Tamire gelen kalıp atölyenin iş listesine düşer

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2: QA turu ve plan turu Karar 47–59, 2026-10-28; triyaj yedi bulgu; uygulama commit `7661066`; plan `specs/done/0115-uygulama-plani.md`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Servis formunun yeni kalıp bölümü (`src/components/ServiceForm.jsx`) ve iki kurucusu (`CustomerDetailModal.saveService`, `ServisPanosu.kaydet`); servis kaydında bir yeni JSON alan (`electron/db.cjs`, `services`); parça tipi tanımına dördüncü davranış bayrağı (`src/lib/constants.js` `INIT_PART_TYPES` emsali, `partTypeDefs` meta JSON) ve paneli (`PartTypeManager`); bir kerelik göç (`electron/db.cjs`, `kasaGocu` emsali); Kalıp Üretim Formu (`src/components/stock/UretimFormu.jsx` satır listesi, `collectPending`, `uretimFormModel.js` satır modeli, `uretimFormPrint.js` çıktı) ve manuel satır penceresi (`UretimSatirEkleModal.jsx`); Servis ve Kargo Panosu kartı ve bırakma işleyicisi (`ServisPanosu.jsx`); Makina Geçmişi satırı (`customers/detail/MachineTimeline.jsx`); Servis Formu çıktısının etiket tablosu ve Kargo Etiketi'nin altıncı durumu (`src/lib/printTemplates.js`); panoya üretim formlarını salt okunur geçiren üç çağrı (`App.jsx` ana pencere ve kiosk, `components/ServisPencere.jsx` köprüsü). **QA turunda eklenenler (2026-10-28):** yeni saf modül `src/lib/kalipTamiri.js` (dedektör, bekleyen tamir, rozet özeti ve metin sabitleri, R3/2); aynı üç çağrıya `partTypeDefs` (öneri için, R11/2) ve `CustomerDetailModal` → `ServiceForm` prop'u; üretim formuna `services` zinciri (`App.jsx` → `components/Stock.jsx` → `stock/UretimFormu.jsx`, R18/2); parça kartının ipucu alanı (`src/components/PartManager.jsx`, R6/2); çeviri anahtarının ekranı (`src/components/settings/SettingsTranslations.jsx`, R35/2); kilit alanı kaydı (`src/lib/kilitAlanlari.js`, R27/4). Dokunulmayan ama adıyla yazılanlar: `src/lib/musteriDurumu.js` (kalıp durumu makinesi, C1), müşteri formunun kalıp ızgarası, `kalipDefs` |
| **Bağımlı spec'ler** | 0106, 0108, 0110 (kalıp durumu makinesi ve bekleyen kalıp ölçütü; bu spec hiçbirine dokunmaz, C1), 0087 (parça tipi davranış bayrağı deseninin bugünkü sahibi), 0100 (saf motor + ekran ayrımı deseni), 0113 (servis parça ücretinin tahsilat esası; revizyon ücreti oradan faturalanır, C7), 0015 (paylaşılan form etiket sözleşmesi) |
| **Ters çevrilen kriterler** | **0015 AC-7**: paylaşılan formlardaki onay kutusu sayısı sabitlenmiş; servis formunun değeri `{kutu: 2, liste: 6}` iken `{kutu: 3, liste: 6}` olur (`tests/ui/form-paylasilan.test.jsx:150`). **0015 AC-9 ve AC-10 ters çevrilmez, genişletilir:** test modaldaki bütün `<label>` metinlerini topluyor (`:22`), yani yeni kutunun metni listeye girer; 0079'un tevkifat kutusu ve 0095'in ücretsiz kutusu için kurulan desen aynen uygulanır (yeni kutu kendi sabitiyle süzülür, iki servis açılış noktasında birer kez, diğer altı formda sıfır kez sayılır) ve geri kalan etiketler birebir aynı kalır; bu desenin üçüncü uygulamasıdır. **`tests/kargo-etiketi.test.js`** "beş durum" diyen başlık ve vaka listesi altıya çıkar (`:18`, `:28`); `SABIT_BASLIKLAR` dizisi (`:16`) **değişmez**. **`tests/ceviri-kapsam.test.js`** servis sözlüğünün anahtar kümesini iki yönlü sabitliyor; yeni anahtar dört yere birlikte girer (R35/2). **`tests/ui/form-paylasilan.test.jsx`** ayrıca `partTypeDefs` prop'u vermeyen pano düzeneğini kullanıyor (`:31-32`), yani öneri o düzenekte çizilmez ve etiket listeleri aynen kalır (AC-81). **Etkilenmeyenler ölçüldü:** `tests/uretim-form-print.test.js` yalnız belge kabuğunu ve gruplamayı iddia ediyor, sütun sayısını iddia etmiyor, yani Tür sütunu onu kırmaz; 0106, 0107, 0108 ve 0110'un `kaynakTip` iddiaları bugünkü iki değeri kullanıyor ve üçüncü kaynak türü kalıp durumu haritasına hiç girmediği için (`musteriDurumu.js:53-57` tanımadığı türe `null` döner) o beş dosya dokunulmadan geçer. **`CLAUDE.md` düzeltmesi:** Kargo Etiketi başlıkları arasında "KARGO-TAKİP NO" yazılı, oysa şablonun alt bandında yalnız iki hücre var (`printTemplates.js:864-867`) ve testin kendi sabiti de bunu doğruluyor; o cümle düzeltilir |

---

## Intent

Fabrikaya tamir için kalıp geliyor ve atölyenin bunu okuyacağı yazılı bir iş emri yok. Servisçi kalıbı alıp getiriyor, serbest metne "44*80 ERKEK KALIPLAR REVİZE" yazıyor, kalıp bir tezgâhın üstünde bekliyor. Atölye kimin getirdiğini ve ne yapılacağını hiçbir listeden göremiyor; müşteri arayıp kalıbını sorduğunda cevap vermek için birini bulmak gerekiyor.

İş hacmi küçük değil ve hızla büyüyor: kalıp revize kalemi geçen 45 servis var ve bunların 27'si 2026'da, yani iki haftada bir kalıp geliyor. Buna karşılık bugüne kadar hiçbir kalıp üretim formuna girmemiş.

Bu iş bittiğinde servisçi kalıbı kabul ederken bir kutu işaretleyecek, kalıplar atölyenin kendi formuna **Tamir** satırı olarak düşecek, atölye formu basıp çalışacak ve bitirdiğinde satırı onaylayacak. Pano, kalıbı hâlâ atölyede olan bir servisin kapatılmak üzere olduğunu söyleyecek. Kalıp müşteriye kargo etiketiyle geri gidecek. Makina geçmişinde ne yapıldığı yazılı kalacak.

---

## Requirements

### A. Dedektör ve model

- **R1.** Bir parçanın kalıp işi olup olmadığını **parçanın tipi** söyler, adı söylemez. Parça tipi tanımına dördüncü bir davranış bayrağı eklenir; bugünkü üçü makinaya atanır, stoktan düşer, raporda görünür.
- **R1/2.** Bayrağın anahtarı **`kalipIsi`**, kutunun etiketi **"Kalıp işi"**. Bugünkü üç bayrağın (`makinaSecici`, `stokDus`, `raporGoster`) kardeşidir ve hiçbirine bağlı değildir: `stokDus`'un `makinaSecici`'ye bağlılığı (`PartTypeManager.jsx:42` `normalizeFlags`) yeni bayrağa uygulanmaz. Sistem tiplerinin bütün kutuları pasif çizildiği için (`:160-162`) bayrak yalnız kullanıcı tipine verilebilir; bu R2'nin kendisidir.
- **R2.** Bayrak kullanıcının kendi oluşturduğu tipe de verilebilir, yani fabrika revize, yeni yapım ve taşlama için ayrı tipler açıp hepsine aynı bayrağı koyabilir. Yeni bir sistem tipi tohumlanmaz.
- **R3.** "Bu parça kalıp işi mi" sorusunun **tek okuma yolu** bir saf yardımcıdır (parça → tipi → bayrak). Ekranlar bu soruyu kendi başına cevaplamaz.
- **R3/2.** Dedektör ve bütün türev hesaplar tek saf modülde yaşar: **`src/lib/kalipTamiri.js`**. Dışa verdiği adlar: `parcaKalipIsiMi(part, partTypeDefs)` (tek dedektör; parçanın `tip` alanı tipin **adıyla** eşlenir, boş değer "Standart" sayılır, canlı tip listesinde bulunmayan ad kalıp işi değildir), `kalipAdDeseni(ad)` (R6/2), `tamirListesi(servis)`, `kalipAtolyedeMi(servis)`, `tamirAnahtari(servisId, kalipId)`, `tamirSatirHaritasi(uretimFormlari)`, `bekleyenTamirler(services, harita)`, `tamirOzeti(servis, harita)` → `{ toplam, biten, bitmemis }`, `tamirYaz(kayit, liste)`. Metin sabitleri aynı modülde: `TAMIR_ROZETI`, `KALIP_ISI_ONERISI`, `KALIP_KUTU_ETIKETI`, `KALIP_KUTU_IPUCU`, `TAMIR_BOS_HATASI`, `TAMIR_BILDIRIMI`, `TUR_ADLARI` (R39).
- **R4.** Bayrak yeni olduğu için hiçbir kalemde yok. **Bir kerelik göç** bayrağı taşıyan bir tip oluşturur ve ad desenine uyan kalemleri o tipe alır. Desen: adında "KALIP" ve "REVİZE" birlikte geçen, kalıp mili, kalıp rulmanı ve kalıp yatağı kalıplarını içermeyen kalem.
- **R4/2.** Göç yazacağı listeyi **var sayamaz**: parça tipi listesi ayrı tablo değil, `meta` tablosunda tek JSON satırıdır (`db.cjs:916-917` yazım, `:1567-1568` okuma) ve satır yoksa boş dizi döner. Kural: göç yalnız satır **varken ve dizi boş değilken** çalışır, yeni tipi listenin **sonuna ekler** ve var olan hiçbir tipi değiştirmez; satır yoksa hiçbir şey yazmaz ve `meta` bayrağını da yazmaz (bir sonraki açılışta yeniden denenir). Yeni tip bir **kullanıcı tipidir** (`sistem: false`, kendi `id`'si, paletin sıradaki rengi, yalnız `kalipIsi` açık): adı değiştirilebilir ve silinebilir; silinince parçaları Standart'a döner ve özellik kapanır, bu bilinen sınırdır.
- **R4/3.** Göçün eşleme kuralları: katlama **JavaScript'te Türkçe küçültmeyle** yapılır (SQLite'ın `upper`/`LIKE`'ı yalnız ASCII katlar, yani "REVİZE" ile "revize" orada eşleşmez), yalnız `ad` okunur (`adEN`, `kod` ve `tanim` okunmaz), yalnız `deletedAt` boş parçalar kapsamdadır ve yalnız tipi boş ya da "Standart" olan parça taşınır. Üç dışlama aynı katlamayla uygulanır.
- **R5.** Ad deseni **yalnız göçte** kullanılır. Ekranlarda, motorda ve doğrulamada ad metnine bakan hiçbir kural yazılmaz.
- **R6.** Tipi işaretsiz olup adında kalıp geçen bir parça kaydedilirken formda ipucu çıkar ("tipini seçerseniz servis formunda kalıp önerisi çalışır"). Engel değil.
- **R6/2.** İpucunun koşulu ad aramasıdır, yani C8'in yasağıyla çelişir. Çözüm: desen tek yerde, `kalipTamiri.js`'in **`kalipAdDeseni(ad)`** fonksiyonunda yaşar ve iki çağıranı olur, göç ve bu ipucu. Tarama kuralı "desenin metni yalnız bu modülde geçer" diye yazılır (C14); ekran, motor ve doğrulama kendi ad aramasını yazmaz.

### B. Servis kaydı ve formu

- **R7.** Servis kaydı iki şey taşır: kalıbın atölyeye girdiği **işareti** ve atölyeye girecek kalıpların **listesi** (ad ve ölçü).
- **R7/2.** Alan adı **`atolyeKaliplari`**, girişleri `{ id, ad, olcu }`. Kayıtta **iki alan yoktur**: işaret listenin boş olmamasıdır ve tek okuma yolu `kalipAtolyedeMi(servis)`'tir (R14 zaten "açık işaret, boş liste" hâlini yasaklıyor, yani ikinci bir doğruluk kaynağı tutmak yalnız ayrışma riski üretir). Formdaki açık kutu kayıt öncesi **geçici form alanıdır** (`_` önekli, `_kartYeniTaban` emsali) ve kayda yazılmaz; var olan kayıtta kutu listenin dolu olmasıyla açılır. R7'nin "iki şey taşır" ifadesi bu maddeyle okunur.
- **R7/3.** Her girişin **kalıcı kendi kimliği** vardır (`uid()`). Kimlik iki kurucuda üretilir ve saf yazıcıya parametre olarak geçer (`tamirYaz` kimlik üretmez, 0111 deseni); form durumu düzenleme boyunca kimlikleri taşır ve kaydetme değişmeyen girişlerin kimliğini **korur**. Konumsal indeks kullanılmaz (C2).
- **R8.** Liste servis kaydının **tek bir alanıdır** (bugünkü değişen parçalar alanının deseni); alt tablo açılmaz.
- **R8/2.** Sütunun deseni `degisenParcalar` **değildir**: o alan her kayıtta koşulsuz yazılıyor (`db.cjs:719` `json(s.degisenParcalar ?? [])`) ve koşulsuz okunuyor (`:1411`), yani her servisin gövdesinde boş dizi olarak duruyor. Yeni sütun 0100'ün `uretimDurumu` ve 0114'ün `ihracOku` **ayıklama** desenini izler: boş liste `null` yazılır, okuma sütunu destructuring ile `...rest`'ten ayıklar ve yalnız dolu değeri gövdeye ekler. R8'in "değişen parçalar deseni" ifadesi yalnız "alt tablo açılmaz, tek alan" anlamındadır.
- **R9.** İşaret kapalıysa liste kayıttan silinir; kapalı değer gövdeye yazılmaz.
- **R10.** Kutu "kalıp servisi" diye sormaz, **kalıbın kendisinin atölyeye girip girmediğini** sorar. Makinanın kalıp mili, kalıp rulmanı ve kalıp yatağı gibi parçalarını değiştirmenin bu kutuyu işaretlemediği formda yazılıdır.
- **R10/2.** Kutunun çizilmesi servis türüne ve onarım yerine **bağlı değildir**: Yerinde Onarım, Fabrikada Onarım, Fabrika Teslim ve anlaşmasız dış servis dahil her serviste çizilir. Intent'in kendi senaryosu servisçinin kalıbı yerinden alıp getirmesidir, yani onarım yerine kapı koymak o senaryoyu dışarıda bırakır.
- **R11.** Kalıp işi tipli bir kalem eklenince kutunun üstünde **öneri** çıkar. Öneri kutuyu kendiliğinden işaretlemez.
- **R11/2.** Öneri dedektörü çağırdığı için forma **`partTypeDefs`** gerekir; bugün ne `ServiceForm` (`:16`) ne `ServisPanosu` bu prop'u alıyor. Zincir dört yere eklenir: `CustomerDetailModal` → `ServiceForm`, panonun sekme çağrısı (`App.jsx:1734`), kiosk çağrısı (`:1421`) ve köprünün anlık görüntüsü (`ServisPencere.jsx` `BOS` içine **salt okunur**; `YAZILABILIR` listesine girmez). Prop verilmemişse öneri çizilmez ve ekran hata vermez (bugünkü test düzenekleri bu hâlde çalışıyor).
- **R12.** Atölyeye girecek kalıplar üç kaynaktan seçilir: kalıp işi tipli kalemlerden ön doldurulan satır, firmanın kayıtlı kalıpları, elle giriş. Elle giriş istisna değil, birinci sınıf bir yoldur.
- **R13.** Ön doldurma kalemin adını **bütün olarak** taşır; ad ayrıştırılmaz (önek, erkek ve dişi) ve ölçü boş gelir.
- **R14.** Kutu açık ama hiçbir kalıp seçilmemişse kayıt reddedilir ve nedeni yazılır.
- **R14/2.** Sınır değerler: aynı serviste **yinelenen kalıp serbesttir** (iki özdeş kalıp gerçekten gelebilir), listenin üst sınırı yoktur, **ölçü boş kalabilir** (R13 ön doldurmada zaten boş geliyor); yalnız **adı boş** giriş kaydedilmez ve nedeni o satırın altında yazar. Kayıtlı kalıptan ya da kalemden gelen giriş bir **kopyadır**: seçim kalıbın kaydına geri bağ yazmaz (R15).
- **R15.** Kaydetme kalıbın kendi kaydına, kalıbın durumuna ve müşteri formuna **hiçbir şey yazmaz**.
- **R15/2.** Formda satırı olan bir giriş servis düzenlemesinde listeden çıkarılırsa, **formdaki satır kalır** ve kaynağını kaybeder (R24 ile aynı kural); rozet yalnız kayıttaki güncel girişleri sayar.

### C. Kalıp Üretim Formu

- **R16.** Satır **tür** taşır: üretim ya da tamir. Tür satırın kendi alanıdır.
- **R16/2.** Satırın alanı **`tur`**, değerleri **`"uretim"`** ve **`"tamir"`**; `emptyRow()` varsayılanı `"uretim"` (`uretimFormModel.js:6-23`). Tür sütunu ekranda ve çıktıda **ilk sütundur** (Kalıp Kodu'nun önünde).
- **R17.** Tamir satırının kaynağı **servis kaydıdır**; bugünkü iki kaynak türüne (müşteri kalıbı, Extra Kalıp) üçüncüsü eklenir.
- **R17/2.** Üçüncü tür **`kaynakTip: "servis_tamir"`**, `kaynakId` servisin kimliği, girişin kimliği **yeni alanda** (`kaynakKalipId`) durur ve `kalipIdx` tamirde **`null`** kalır. `musteriDurumu.js`'in `satirAnahtari`'sı dokunulmaz: tanımadığı türe `null` döndüğü için tamir satırı kalıp durumu haritasına hiç girmez (C1 mekanizmayla garanti edilir, R21).
- **R18.** "Bekleyen Tamirleri Getir" işaretli ama hiçbir canlı formda satırı olmayan tamirleri toplar ve **tarih süzgeci uygulamaz**. Düğme bekleyen tamir sayısını yazar.
- **R18/2.** Form bugün `services` dizisini **hiç almıyor** (`Stock.jsx:20-33` prop listesi, `App.jsx:1704` çağrısı); sayı ve getirme için zincire `services={liveServices}` **salt okunur** eklenir. Ters yönde kural kesindir: **form kaydı servis bölümüne hiçbir şey yazmaz** (bugünkü iki kaynağa `uretimFormId` damgalayan dal, `UretimFormu.jsx:124-136`, üçüncü tür için çalışmaz). Sunucuda `services` yalnız `["customers","dealers","settings","servis"]` sekmelerine eşli (`serverAuth.cjs:117`), yani damga yalnız Stok sekmesi olan atölye kullanıcısının her kaydını 403 yapardı. Damgasız tasarım bu yüzden tercih değil zorunluluktur (C12).
- **R19.** Tamir satırı servis tarihini taşır ve hangi servisten geldiğini satırın altında yazar.
- **R20.** Aynı tamir iki forma birden girmez.
- **R20/2.** "Zaten bir formda var mı" sorusu damgayla değil, **canlı formların taranmasıyla** cevaplanır: `tamirSatirHaritasi(uretimFormlari)` anahtar başına satırı verir (`uretimFormHaritasi` emsali, çöpteki form okunmaz) ve R18 ile R20 aynı haritayı kullanır. Rozet de aynı haritadan okur, yani panonun rozeti ile formun satırı tek kaynaktan gelir (C3).
- **R21.** Tamir satırı kalıp durumu haritasına **girmez**: kalıp durumu, pil, bekleyen kalıp ölçütü ve müşteri listesi birebir bugünkü gibi davranır.
- **R22.** Form çöpe atılırsa tamir yeniden bekleyen olur; geri alınınca listeden çıkar.
- **R23.** Atölye tamir satırını silerse servisin işareti kayıtta kalır ve geçmişe dönük bir beyan olarak okunur.
- **R23/2.** Atölye satırı silip formu kaydedince tamir **yeniden bekleyen olur** ve "Bekleyen Tamirleri Getir" onu yeniden ekler; bu müşteri kalıbındaki bugünkü davranışın aynısıdır (0108: satır silinip form kaydedilince kalıp döner). Satırı kalıcı kaldırmanın yolu servis kaydındaki kalıbı listeden çıkarmaktır (R15/2). R23'ün "geçmişe dönük beyan" ifadesi yalnız servisin işaretinin kayıtta durduğunu anlatır, üçüncü bir "reddedildi" damgası eklenmez.
- **R24.** Servis kaydı çöpe atılırsa formdaki tamir satırları **formda kalır** ve kaynağını kaybeder.
- **R24/2.** Tamir satırı müşteriye göre gruplanan listede **o müşterinin kendi grubuna** düşer (`groupByMusteri` anahtarı `id:<musteriId>`, `uretimFormPrint.js:20`) ve getirilen satırlar listenin **sonuna** eklenir (bugünkü `collectPending` davranışı). Ayrı bir tamir grubu açılmaz; ayrımı Tür sütunu verir (X8).

### D. Servis ve Kargo Panosu

- **R25.** Servis kartı, kalıbı hâlâ atölyede olan serviste **rozet** taşır: bitmemiş tamir sayısı ve toplam.
- **R25/2.** Rozetin biçimi tek sabitten gelir (`TAMIR_ROZETI`): "KALIP ATÖLYEDE" ve ardından **bitmemiş / toplam** (0106'nın pil sözleşmesiyle aynı ayraç). "Biten" tanımı: canlı bir formda `tamamlandi` satırı olan giriş; **hiçbir formda satırı olmayan giriş bitmemiştir**. Aksi hâlde işaretli ama hiç forma girmemiş servis panoda sessiz kalır, yani bu işin çözdüğü sorun geri döner.
- **R26.** Kartı Tamamlandı'ya sürüklemek engellenmez; bitmemiş tamir varsa bildirim çıkar ve rozet Tamamlandı sütununda da kalır.
- **R27.** Üretim formu yazabilen kullanıcıda bildirimde tek tıkla "kalıpları da bitti işaretle" düğmesi bulunur; düğme basıldığı anda formun kilidini sınar.
- **R27/2.** Düğmenin kapısı **iki şartlıdır**: Stok sekmesi görünür (`App.jsx:207` `kargoYetki` kardeşi, ör. `uretimYetki`) **ve** `makeCanDo(serverPermissions, "stockActions")("stock_uretim_edit")`. Yalnız eylem iznine bakmak yetmez: `makeCanDo` tanımsız boyutta koşulsuz `true` döner (`permissions.js:18-23`) ve kiosk kullanıcısının `stockActions`'ı tanımsızdır, yani düğme çizilir ve yazım sunucuda 403 alır. R28 bu kapının sonucudur, ayrı kiosk dalı yazılmaz.
- **R27/3.** Bildirim bugünkü anlamıyla düğme taşıyamaz: `showToast(text, type)` düz metindir ve üç saniyede kaybolur (`App.jsx:561-565`). Bitmemiş tamir varsa kart taşındıktan **sonra** mevcut `ConfirmDialog` açılır (servis adı, bitmemiş sayısı, "Kalıpları da bitti işaretle" ve "Kapat"); kapısı geçmeyen kullanıcıda pencere yerine bugünkü düz bildirim çıkar (R28).
- **R27/4.** Bir servisin kalıpları **birden çok formda** olabilir: düğme ilgili bütün formların `uretim_formu` kilidini anlık listeyle sınar (`useKilitListesi`, panoda zaten var, `ServisPanosu.jsx:126`) ve biri başkasındaysa **hiçbir şey yazmaz**, nedeni bildirir. Kilit kaydına da yazılır: `kilitAlanlari.js:20` `uretim_formu` penceresi listesi `ServisPanosu.jsx`'i içerir (0064'ün taraması yalnız dört klasörü denetlediği için eksikliği yakalamaz).
- **R28.** Kioskta düğme çizilmez, yalnız bildirim kalır.
- **R29.** Atölye kalıbı bitirince kart yanıp sönmez ve ses çıkarmaz.
- **R30.** Rozet sayı yazar, kalıp adı yazmaz.
- **R31.** Yeni kart türü yoktur: sütun eşlemesi, sürükleme önekleri, arşiv ve alarm davranışı değişmez.
- **R32.** Panoya üretim formları **salt okunur** geçirilir (ana pencere, kiosk ve ayrı pencere köprüsü); köprünün yazılabilir listesine girmez.
- **R32/2.** Yazma yalnız **ana pencere sekmesindendir**: pano `setUretimFormlari`'nı isteğe bağlı prop olarak alır ve düğmeyi ancak prop varken ve R27/2 kapısı geçerken çizer. Ayrı pencerede ve kioskta düğme yok, rozet var; köprünün yazılabilir listesi altı bölüm kalır (`ServisPencere.jsx:15`). R32'nin "salt okunur" ifadesi köprü için kesin, ana pencere için düğmenin kapısıyla okunur.
- **R33.** Ters yön yoktur: atölye son tamir satırını bitirince servis otomatik tamamlanmaz.

### E. Görünürlük ve çıktılar

- **R34.** Makina Geçmişi'ndeki servis satırı rozet ve kalıp adlarını gösterir.
- **R35.** Servis Formu çıktısına tek bir etiket satırı eklenir ("Atölyeye Alınan Kalıplar") ve yalnız kalıp varken basılır.
- **R35/2.** Çeviri anahtarı **`atolyeKaliplariLabel`** ("ATÖLYEYE ALINAN KALIPLAR" ve "MOLDS TAKEN INTO WORKSHOP") dört yere birlikte girer: `DEFAULT_SERVIS_TRANSLATIONS.TR`, `.EN`, `SettingsTranslations`'ın `GROUPS` listesi ve iki yönlü kapsam testi (`tests/ceviri-kapsam.test.js`). Satırın değeri girişlerin `ad · Ölçü: x` biçiminde, orta noktayla ayrılmış listesidir (etiketle aynı biçim, R37/2).
- **R36.** Üretim formu çıktısına Tür sütunu eklenir; tamir satırının kalıp hücresinde servis tarihi basılır.
- **R36/2.** Sayılar: ekranda tablo altı sütundan yediye çıkar, grup başlığının `colSpan`'ı 6 → 7 olur (`UretimFormu.jsx`) ve boş durum satırının bugünkü `colSpan={7}` değeri doğru hale gelir (bugün tutarsız); çıktıda beş sütun altıya, iki `colspan="5"` altıya çıkar (`uretimFormPrint.js:49`, `:86`). Tamir satırının servis tarihi **Kalıp hücresinde adın altındaki ikinci satırda** basılır; R36'nın "kalıp hücresinde" ifadesi bunu söyler.
- **R37.** Kargo Etiketi'ne **altıncı durum** eklenir: tamir edilen kalıbın müşteriye dönüşü. Şablon tek kalır ve başlıklar birebir korunur; içerik biçimi Extra Kalıp etiketiyle aynıdır (ad ve ölçü).
- **R37/2.** Altıncı durumun adaptörü **`tamirEtiketVerisi(servis, { customers, factory })`** ve sarmalayıcısı `tamirEtiketYazdir` (`kalipEtiketVerisi` emsali, `printTemplates.js:756`). Alanlar: içerik **servisin bütün listesi** (`ad · Ölçü: x`), `teslimSekli` sabit "Kargo", `tarih` **servis tarihi** (adaptör saat okumaz), gönderen fabrika, alıcı müşterinin kayıtlı adresi. Etikette "tamir" ibaresi ve ek hücre **yok** (C10). `opts.kargoFirma` ve `opts.kargoTakipNo` şablonda hiç basılmıyor (alt bantta yalnız iki hücre var, `printTemplates.js:866-867`), yani adaptör onları üretmez.
- **R38.** Etiket düğmesi iki yerde bulunur: üretim formu satırında ve Makina Geçmişi'ndeki servis satırında.
- **R38/2.** Kaynağı kopmuş satırda (servis çöpte ya da bulunamıyor, R24) ve müşterisi çözülemeyen satırda etiket düğmesi **çizilmez**; alıcı adresi müşteri kaydından geldiği için (AC-64) kaynaksız satır boş bir etiket basardı.
- **R39.** Rozet, öneri, ipucu ve bildirim metinleri tek sabitten gelir; ekranlar metin yazmaz.

### F. Düzeltilen iki kusur

- **R40.** Manuel Satır Ekle penceresinde müşteri ve onun kalıbı seçilerek eklenen satır **kaynak bağını** alır; kalıp işaretlenir ve aynı kalıp ikinci bir forma çekilemez. Müşteri seçilmeden eklenen serbest satır bugünkü gibi bağsız kalır.
- **R40/2.** R40'ın ikinci cümlesi bugünkü davranışa göre düzeltilir: **müşteri seçilmeden satır eklenemez**, çünkü `addRows` erken dönüyor ve düğme pasif (`UretimSatirEkleModal.jsx:66`, `:96`). Serbest (müşterisiz) satır yolu açılmaz (X11).
- **R40/3.** Pencere müşterinin bütün `kaliplar` dizisini listeliyor (`:26-30`), yani `partSaleId` taşıyan **ayna** satırlar da listede. Ayna satır seçilince bağ `kaynakTip: "extra_kalip"` ve `kaynakId: ps.id` olarak yazılır (müşteri kalıbı olarak değil) ve listede `AYNA_SATIR_IBARESI` ile işaretlenir; aynanın kendisine `uretimFormId` yazılmaz. Aksi hâlde 0107'nin kapattığı kusur geri açılır: aynaya ikinci bir yazıcı girer ve aynı kalıp bir satıştan bir aynadan iki forma çekilebilir.
- **R41.** Üretim formunun "bu kaynak zaten formda var mı" kümesi üç kaynak türünü doğru ayırır; bugünkü iki dallı koşul üçüncü türü Extra Kalıp anahtarıyla eşliyor.

---

## Zorunlu kısıtlar

- **C1.** **Kalıp durumu makinesi dokunulmaz.** Altıncı bir kalıp durumu değeri, yeni pil, yeni renk ve kontrast kaydı yok; 0106, 0108 ve 0110'un kuralları ve testleri olduğu gibi kalır. Mekanizma ölçüldü: üretim formu satır anahtarı tanımadığı kaynak türüne `null` döner (`musteriDurumu.js:53-57`), yani tamir satırı o haritaya hiç girmez.
- **C2.** Kalıbın kendi kaydına ve müşteri formuna yazılmaz. Konumsal kalıp indeksine (`kalipIdx`) ikinci bir yazıcı eklenmez; bu indeksin kırılganlığı 0106 ve 0108'de açık bulgudur.
- **C3.** İki tek yol: dedektör (R3) ve servisin kalıp listesini yazan kurucu. İkinci bir yazıcı ve ikinci bir dedektör yazılmaz (kaynak taraması).
- **C4.** Parça tipi tanımı meta JSON'da yaşar, yeni sütun gerekmez. Servisin kalıp listesi **tek bir JSON sütunudur** ve dört nokta kuralıyla eklenir; boş değer gövdeye yazılmaz.
- **C5.** Göç yalnız yerel veritabanı açılışında bir kez çalışır ve kendi `meta` bayrağını yazar; yedek almaz, çünkü tip ataması veri kaybı değildir ve kullanıcı tipi elle düzeltebilir.
- **C6.** Yeni eylem izni, yeni veri bölümü ve yeni sunucu kuralı yoktur. Ölçüldü: parça tipi bölümü Ayarlar sekmesine, servis bölümü müşteri ve servis sekmelerine, üretim formu bölümü Stok sekmesine eşli; her yazım kendi sekmesinden yapılır. Salt okunur iş olmadığı için bu bilinçli bir karardır ve testle sabitlenir.
- **C7.** Para tarafı değişmez: revizyon ücreti bugünkü parça kalemiyle faturalanır, 0113'ün tahsilat esası aynen işler, kalıp bölümü hiçbir tutar yazmaz.
- **C8.** Ekranlarda, motorda ve doğrulamada parça adında metin araması yasaktır (R5, tarama).
- **C9.** İşaret taşımayan veride bütün hesaplar, ekranlar ve çıktılar bugünküyle birebir aynıdır.
- **C10.** Kargo Etiketi tek şablon kalır ve altı durumun başlıkları birebir aynıdır (bugünkü beş durumun kuralı).
- **C11.** Yeni sütun **ayıklama** kuralıyla eklenir (R8/2): boş liste `null` yazılır, okuma sütunu `...rest`'ten destructuring ile ayıklar ve yalnız dolu değeri gövdeye koyar. İşaretsiz veride kaydedilen gövde spec öncesiyle **birebir** aynıdır; aksi hâlde her servis yeni bir anahtar taşır ve sekmesi kısıtlı kullanıcı her kayıtta 403 alır (0100 ve 0114'ün aynı dersi).
- **C12.** Üretim formunun kaydı **`services` bölümüne hiçbir şey yazmaz** (R18/2). Ölçüldü: bölüm Stok sekmesine eşli değil, yani damga atölye kullanıcısının kaydını reddettirirdi.
- **C13.** Panonun üretim formu yazması yalnız **ana pencere sekmesindendir**; köprünün yazılabilir listesi ve kiosk değişmez (R32/2).
- **C14.** Parça adı deseni yalnız `kalipTamiri.js`'in `kalipAdDeseni` fonksiyonunda geçer (R6/2); C8'in yasağı bu tek istisnayla okunur ve tarama bunu sabitler.

---

## Kapsam dışı

- **X1.** Kalıbın tamir geçmişi, yani "bu kalıp kaç kez revize gördü" — *neden:* ölçüm tekrarın neredeyse olmadığını gösteriyor (45 kayıt, 42 farklı müşteri) ve bu soruyu cevaplamak tamiri kalıp kaydına bağlamayı gerektirir, yani C2'yi açar. Soru bugün makina geçmişinden okunur.
- **X2.** Müşteri listesinde tamir pili — *neden:* kalıp kaydına yazmıyoruz, yani pili besleyecek bağ yok. İstenirse o spec bağı kendi doğrulayıcısıyla kurar; bu spec'ten sonra eklemek geriye dönük çalışmaz, yalnız yeni kayıtlarda çalışır.
- **X3.** Erkek ve dişi için ayrı alan — *neden:* bilgi yalnız parça adının metninde (`100_ERKEK KALIPLAR REVİZE`); adı ayrıştırmak dedektörü ada bağlamakla aynı kırılganlıktır (R5, ölçüm 4).
- **X4.** Tamirin kargo durumu, kargo firması, takip numarası, teslim işareti ve panoda kargo kartı — *neden:* makinanın kendisinde de bu alanların hiçbiri yok; makinanın tek sevk belgesi basılı etiket (ölçüm 13). Tamiri makinadan sıkı takip etmek tutarsız olur ve tamire kendi kaydını vermeyi gerektirir.
- **X5.** Tamir edilen kalıp için farklı teslimat adresi — *neden:* kalıp geldiği yere, müşterinin kayıtlı adresine döner.
- **X6.** Tamirin fiyatlandırılması ve ücret alanı — *neden:* parça kataloğundaki revize kalemiyle bugün çalışıyor (ölçüm 6).
- **X7.** Anasayfa'da bekleyen tamir sayacı — *neden:* atölye formu zaten açıyor ve düğmedeki sayı kaybolma riskini kapatıyor; ikinci sayaç bilgi eklemeden tekrar olur.
- **X8.** Tamir için ayrı bir form türü — *neden:* atölye tek liste okuyor; Tür sütunu ayrımı kâğıt üstünde de veriyor.
- **X9.** Servis kaydının işçilik ve parça için iki ayrı fatura tipi taşıması — *neden:* aynı sınır 0114'te de çıktı; servis kaydının tek fatura tipi alanı ikisini birlikte kapsıyor ve bunu ayırmak bambaşka bir iştir.
- **X10.** Ad desenine göre süregelen otomatik sınıflama — *neden:* R5 ve ölçüm 4; desen yalnız göçün bir kerelik tahminidir.
- **X11.** Manuel Satır Ekle penceresinde müşterisiz (serbest) satır yolu — *neden:* bugün böyle bir yol yok (düğme pasif, `UretimSatirEkleModal.jsx:96`) ve açmak bu işin amacı değil; R40/2 bugünkü davranışı yazıya geçirir.
- **X12.** Etikette tamir ibaresi, kargo firması ve takip numarası — *neden:* C10 ve R37/2; şablonun alt bandında yalnız iki hücre var ve bugünkü beş durumda da bu alanlar basılmıyor.

---

## Ölçümler (2026-10-27 ve 2026-10-28 yedekleri, bugünkü kod)

1. **Hacim ve dedektör.** Kalıp revize kalemi (katalogdaki altı kalıp revize parçasından en az biri) geçen **45 canlı servis** var, 42 farklı müşteride. Yıla göre: 2017-2023 arası yılda 1-2, 2024'te 4, 2025'te 5, **2026'da 27**. Bir yılda beş katına çıkmış.
2. **Serbest metin güvenilmez bir dedektör.** Metninde "kalıp" geçen 124 canlı servisin **65'i** aslında makinanın kalıp adlı parçasıdır (kalıp mili, kalıp rulmanı, kalıp yatağı) ve yalnız 12'si metinden gerçek kalıp işi diye okunabiliyor. Yani ilk ölçümümde kalıp işini **dörtte bir** buluyordum; doğru dedektör parça kalemi.
3. **Parça tipi alanı var ve boş.** `parts` tablosunda `tip` sütunu ve `partTypeDefs` kullanıcı listesi var; tanımlı yalnız üç sistem tipi (Standart, Konveyör Saç, Bant), **329 canlı parçanın 313'ü Standart** ve adında "kalıp" geçen 34 parçanın **hepsi** Standart. Alan kullanılmıyor.
4. **Ad eşlemesi bugün çalışıyor ama kural olamaz.** Katalogda "REVİZE" geçen **26 parçanın yalnız 6'sı kalıp**; gerisi kazan, karıştırıcı, üst alüminyum tabla, piston, dişli kutusu, konveyör gerdirme sacı ve iki makina dönüşümü. "KALIP" ve "REVİZE" birlikte arandığında bugün tam 6 doğru kalem çıkıyor, sıfır yanlış pozitif; ama kural metne bağlı kalırsa yeni bir ad ("ERKEK KALIPLAR YENİ YAPILDI") sessizce kaçar, "KALIP MİLİ REVİZE" ise yanlış pozitif verir.
5. **Tip tanımı zaten davranış taşıyor.** `INIT_PART_TYPES` üç bayrak (`makinaSecici`, `stokDus`, `raporGoster`) ve sistem tipleri için stabil bir `rol` anahtarı taşıyor. Dördüncü bayrak yeni bir kavram değil.
6. **Para tarafı çalışıyor.** Kalıp işi olan servislerin 11'inde revize parça kalemi var ve 12'sinin hepsi ödenmiş; yalnız birinde servis ücreti girilmiş, yani revizyon işçilik olarak değil parça olarak faturalanıyor.
7. **Üretim formu pratikte kullanılmıyor.** Canlı **tek** form var, içinde **tek** satır (kaynağı Extra Kalıp). 4.862 müşteri kalıp satırının **sıfırında** üretim formu işareti ya da bağı var; Extra Kalıp satışlarının 3'ünde işaret, 8'inde bağ var. Elle yazılmış kalıp durumu 12 kayıtta.
8. **Tarihe bağlı itme çalışmaz.** Canlı tek formun dönemi **26.10.2026 ile 26.10.2026**, yani tek gün. Servis tarihi 12.10.2026 olan bir tamir o formun dönemine hiç girmez. "Bekleyen Kalıpları Getir" kalıpları satış tarihine göre süzüyor (müşteri kalıbında `installDate`, Extra Kalıp'ta `tarih`), yani 2014'te satılmış bir makinanın 2026'daki tamiri dönemi 2014'e uzanan bir form olmadan çekilemez.
9. **Kalıp durumu makinesi korunur, mekanizmasıyla.** `satirAnahtari` yalnız `musteri` ve `extra_kalip` türlerine anahtar üretiyor, tanımadığı türe `null` dönüyor (`musteriDurumu.js:53-57`); `uretimFormHaritasi` anahtarsız satırı haritaya koymuyor ve `formSilinceDonenSayisi` onu atlıyor. Üçüncü kaynak türü bu yüzden 0106, 0108 ve 0110'u hiç etkilemiyor.
10. **Manuel satır penceresi bağ yazmıyor (kusur).** `addRows` satıra `kaynakTip`, `kaynakId` ve `kalipIdx` yazmıyor (`UretimSatirEkleModal.jsx:65-86`). Sonucu: kalıbın durumu değişmiyor, damga oluşmuyor ve aynı kalıp "Bekleyen Kalıpları Getir" ile ikinci bir forma daha çekilebiliyor.
11. **"Zaten formda var mı" kümesi iki dallı (kusur).** Kaynak türü `musteri` değilse **koşulsuz** Extra Kalıp anahtarı üretiliyor (`UretimFormu.jsx:225-227`); üçüncü tür eklenince tamir satırı Extra Kalıp anahtarıyla eşleşir. Kimlikler rastgele sayı olduğu için çakışma neredeyse imkansız ama kod yanlış.
12. **Sunucu değişmiyor.** Bölüm eşlemeleri: `partTypeDefs` → `["settings"]` (grup `settings`), `services` → `["customers","dealers","settings","servis"]` (grup `customerActions`), `uretimFormlari` → `["stock","settings"]` (grup `stockActions`). Her yazım kendi sekmesinden yapılıyor: işaret ve kalıp listesi servis kaydına (müşteri ve servis sekmesi), tamir satırı üretim formuna (Stok sekmesi), bayrak tip tanımına (Ayarlar). Panonun rozeti yalnız okur.
13. **Makinanın kargo takibi yok.** `customers` tablosunda `kargoDurum`, `kargoFirma` ve `kargoTakipNo` gibi hiçbir alan yok; bu alanlar yalnız yedek parça ve Extra Kalıp kayıtlarında. Makinanın sevk belgesi Sandık Etiketi ve müşteri detayından basılıyor (`CustomerDetailModal.jsx:843`).
14. **Kargo Etiketi altı başlık taşıyor, yedi değil.** Şablonun alt bandında iki hücre var, TESLİM ŞEKLİ ve TARİH (`printTemplates.js:866-867`, iki hücre); testin kendi sabiti de altı başlık sayıyor (`tests/kargo-etiketi.test.js:16`). `CLAUDE.md` başlıklar arasında "KARGO-TAKİP NO" yazıyor, bu yanlış.
15. **Servis Formu çıktısının deseni hazır.** Çıktı bir etiket ve değer tablosu artı `<h2>` bölümlerinden oluşuyor; parça ücreti satırı koşullu basılıyor (`printTemplates.js:328`), yani "yalnız varsa bas" deseni yerinde.
16. **Panonun üretim formuna erişimi yok.** Pano bugün `uretimFormlari` prop'u almıyor (ana pencere, kiosk ve ayrı pencere köprüsünün üçünde de yok); köprünün yazılabilir listesi altı bölüm (`ServisPencere.jsx:15`) ve üretim formları orada değil.

---

### QA turu ölçümleri (2026-10-28)

17. **Spec hiçbir yeni tanımlayıcıyı adlandırmıyordu.** Bayrağın anahtarı, dedektörün modülü, servis alanı, satırın tür alanı ve üçüncü kaynak türü spec'te geçmiyordu; oysa bu adlara dallanan yer en az yedi: `satirAnahtari` (`musteriDurumu.js:53-57`), `collectPending`'in `already` kümesi (`UretimFormu.jsx:222-227`), `emptyRow` (`uretimFormModel.js:6-23`), ekran tablosu ve `buildPrintHtml` (`uretimFormPrint.js:37-66`), pano kartı, `MachineTimeline` servis satırı ve `kalipEtiketVerisi` kardeşi (`printTemplates.js:756`).
18. **Tamir satırının kimliği için tek aday konumsal indeksti.** R7 listeyi çoklu, R25 rozeti "sayı ve toplam" yapıyor, yani bir servis birden çok satır üretir; R18 ve R20 satır başına kimlik ister. Elde kalan tek şey listedeki konumdu, oysa C2 konumsal indeksi yasaklıyor ve servis formu listeyi yeniden sıralayıp araya satır silebiliyor (0106 ve 0108'in açık bulgusu).
19. **Liste alanının deseni spec içinde çelişiyordu.** `degisenParcalar` her kayıtta koşulsuz yazılıyor (`db.cjs:719`) ve koşulsuz okunuyor (`:1411`), yani her servisin gövdesinde boş dizi duruyor; servis okuması alanların çoğunu `...rest` ile yayıyor (`:1406`), yani ayıklanmayan yeni sütun her servise `null` koyar. R9, C4 ve AC-27'nin istediği davranış `uretimDurumu` ve `ihracOku` ayıklamasıdır.
20. **Panonun üretim formu yazması köprüde mümkün değil.** `YAZILABILIR` altı bölüm (`ServisPencere.jsx:15`) ve köprü fonksiyon taşımıyor; AC-50 yazma istiyor, R32 ve AC-56 yazılabilir listeye girmeyi yasaklıyor.
21. **Eylem izni tek başına kioskta yanlış pozitif.** `makeCanDo` tanımsız boyutta koşulsuz `true` döner (`permissions.js:18-23`); kiosk izni `{ tabs: ["servis"], customerActions: [...] }`, yani `stockActions` tanımsız ve `canDo("stock_uretim_edit")` **true**. Sunucuda `uretimFormlari` `["stock","settings"]` sekmelerine eşli (`serverAuth.cjs:118`), yani yazım 403 alır. Panonun kendi `canDo`'su ayrıca `customerActions`'a bağlı (`ServisPanosu.jsx:86`).
22. **Eylemli bildirim diye bir şey yok.** `showToast(text, type)` düz metindir ve üç saniyede kaybolur (`App.jsx:561-565`, `ServisPencere.jsx` aynısı); panonun bütün bildirimleri bu imzayı kullanıyor.
23. **Üretim formu `services` dizisini almıyor.** `Stock` prop listesinde yok (`Stock.jsx:20-33`), App'in çağrısı geçmiyor (`:1704`), `UretimFormu` de almıyor. Ters yönde `saveForm` iki kaynağa `uretimFormId` damgalıyor (`UretimFormu.jsx:124-136`); aynısı serviste yapılsa `services` bölümü Stok sekmesine eşli olmadığı için 403 gelir (`serverAuth.cjs:117`).
24. **Öneri için gereken tip listesi forma gitmiyor.** `ServiceForm` prop listesinde `partTypeDefs` yok (`:16`); `ServisPanosu` da almıyor (üç çağrı: `App.jsx:1421`, `:1734`, `ServisPencere.jsx` anlık görüntüsü). `CustomerDetailModal` listeye sahip (`:83`), yani eksik halka formun kendisi.
25. **Göçün yazacağı liste yok olabilir.** Parça tipi listesi `meta` tablosunda tek JSON satırıdır (`db.cjs:916-917`, `:1567-1568`) ve satır yoksa boş dizi döner; App yüklemede yalnız **dolu** listeyi uygular (`App.jsx:1169`). Göç tek elemanlı liste yazarsa App onu aynen uygular ve üç sistem tipi (Standart, Konveyör Saç, Bant) durumdan düşer, sonraki kayıt da kısaltılmış listeyi geri yazar. Sistem tipi olarak eklemek de olmaz: sistem tiplerinin bütün kutuları pasif çizilir (`PartTypeManager.jsx:160-162`).
26. **R6'nın ipucusu C8 ile çelişiyordu.** İpucunun koşulu tanım gereği ad aramasıdır; AC-10 ise ad aramasını göç dışında her yerde yasaklıyor, yani iki kriter aynı anda sağlanamaz.
27. **AC-42'nin anlattığı yol yok.** `addRows` müşteri seçilmemişse erken dönüyor (`UretimSatirEkleModal.jsx:66`) ve düğme `disabled={!selMusteri || selKalipIdxs.size === 0}` (`:96`), yani müşterisiz satır hiç doğmuyor.
28. **Manuel pencere ayna kalıpları da listeliyor.** Pencere müşterinin bütün `kaliplar` dizisini gösteriyor (`:26-30`), yani `partSaleId` taşıyan ayna satırlar da seçilebilir; `kaynakTip: "musteri"` yazılırsa `saveForm` aynanın kendisine damga atar (`UretimFormu.jsx:124-130`), oysa 0107 ayna kutusunu kaldırıp durumu satıştan okutuyor (`musteriDurumu.js:106-118`) ve `musteriKalibiBekliyorMu` ayna satırı baştan atlıyor (`:130`).
29. **Göçün eşlemesi SQL'de katlanamaz.** SQLite'ın `upper` ve `LIKE`'ı yalnız ASCII katlar, yani "REVİZE" ile "revize" ve "İ" ile "i" eşleşmez; ölçüm 3'e göre bugün eşleşecek 34 parçanın hepsi Standart tipte, yani kullanıcı tipini ezme sorusu bugün boş ama kural yazılı olmalı.
30. **Parça tipi kayda adla bağlı.** `parts[].tip` tipin **adını** tutuyor (`PartManager.jsx:423`, `:503`), eşleşme birebir dize (`PartTypeManager.jsx:80`, `:87`, `:93`); ad değişince parçalar taşınıyor, tip silinince parçalar "Standart"a düşüyor. Dedektör bu yüzden adla eşler ve canlı listede bulunmayan adı kalıp işi saymaz.
31. **Kutunun çizilme koşulu tanımsızdı.** Servis türü ve onarım yeri alanları formda bağımsız; Intent'in senaryosu servisçinin kalıbı yerinden getirmesi, yani onarım yerine kapı koymak o senaryoyu dışarıda bırakır.
32. **Tablo sayıları bugün tutarsız.** Ekran tablosu altı sütun ama boş durum satırı `colSpan={7}`, grup başlığı `colSpan={6}`; çıktıda beş sütun ve iki `colspan="5"` (`uretimFormPrint.js:49`, `:86`). Tür sütunu eklenince ekrandaki yedi değeri doğru hale gelir.
33. **Çeviri anahtarı dört yere girer.** `DEFAULT_SERVIS_TRANSLATIONS.TR`, `.EN`, `SettingsTranslations`'ın `GROUPS` listesi ve iki yönlü kapsam testi (`tests/ceviri-kapsam.test.js`); ekrana eklenmeyen anahtar testi kırar ve kullanıcı İngilizcesini düzeltemez.

*QA turu ölçümlerinin kaynağı bugünkü çalışan ağaçtır (2026-10-28); satır numaraları o günün dosyalarına aittir.*

## Kararlar (Takım Yöneticisi, 2026-10-27 ve 2026-10-28)

Takım Yöneticisi yirmi kararın hepsini analistin önerisiyle verdi.

**Karar 1. Tamir servis kaydı olarak girilir; kalıbın kendi kaydına, kalıp durumuna ve müşteri formuna dokunulmaz.** *Gerekçe:* C1 ve C2. Bu karar üç riski birden dışarıda bırakıyor: kalıp durumu makinesinin değişmesi, konumsal kalıp indeksine ikinci yazıcı, ve tek form işaretçisinin tamir yüzünden ezilmesi.

**Karar 2. Tamir müşteri detayının Makina Geçmişi satırında görünür.** *Gerekçe:* R34; "bu makinaya ne yapıldı" sorusu orada soruluyor.

**Karar 3. Müşteri formunda hiçbir şey değişmez.** *Gerekçe:* kalıp ızgarası, durum seçicisi ve piller 0105, 0106, 0109 ve 0110'un dokunduğu en kalabalık form; dışarıda kalıyor.

**Karar 4. Kutu "kalıp atölyeye girecek" diye sorar.** *Gerekçe:* ölçüm 2; "kalıp servisi" adı olsa kutu çoğu zaman yanlış işaretlenir.

**Karar 5. Üç kaynak, serbest giriş birinci sınıf.** *Gerekçe:* R12 ve ölçüm 4.

**Karar 6. Üretim formu satırı tür taşır (üretim ya da tamir), aynı formda.** *Gerekçe:* atölye tek liste okuyor (X8).

**Karar 7. Tamir satırı tarihe göre çekilmez: servis tamiri bekleyen yapar, form onu tarih süzgeci olmadan toplar.** *Gerekçe:* ölçüm 8. Bu karar analistin "satır servisten itilir" ifadesinin düzeltilmesidir: adım adım akış yazılırken satırın düşeceği bir formun kayıt anında var olmayabileceği görüldü.

**Karar 8. Panoda yeni kart türü yok; servis kartına rozet ve Tamamlandı'da uyarı.** *Gerekçe:* panonun birimi iş, parça değil; kargo kartı kendi `kargoDurum` alanının sahibi, tamir değil.

**Karar 9. Uyarı engellemez.** *Gerekçe:* pano atölye katında hızlı kullanılıyor ve sert engel işaretin kaldırılmasıyla aşılır; servis gerçekten kalıp dönmeden bitebilir.

**Karar 10. Otomatik yazma yok, tek tıkla teklif var.** *Gerekçe:* ölçüm 12 (kiosk üretim formu yazamaz, 403), formun bütün nesneyi yazması yüzünden sessiz kayıp riski, ve doğruluğun yönü (atölyenin imzasını servisçi atamaz).

**Karar 11. Alarm yok.** *Gerekçe:* alarm bu panoda yalnız yeni iş gelmesine ayrılmış; durum değişiminde alarm vermek alarmı değersizleştirir.

**Karar 12. Ters yön yok.** *Gerekçe:* panonun Tamamlandı'ya geçişi bitiş zamanını damgalıyor ve işçilik süresi ondan hesaplanıyor.

**Karar 13. Kargo Etiketi'ne altıncı durum eklenir; kargo durumu, firma ve takip numarası eklenmez.** *Gerekçe:* ölçüm 13; makinanın da bu alanları yok.

**Karar 14. Kargo Etiketi şablonu kullanılır, Sandık Etiketi değil.** *Gerekçe:* kalıp kargo boyutunda ve Extra Kalıp sevkiyatı bugün bu etiketi kullanıyor; Sandık Etiketi brüt kilo taşıyan makina sandığının belgesi.

**Karar 15. Dedektör parça tipidir, ad değil.** *Gerekçe:* ölçüm 3 ve 4. Bu karar analistin "revize kaleminden ad eşlemesiyle anla" önerisinin düzeltilmesidir; soru Takım Yöneticisi'nden geldi ("uygulama nasıl anlayacak") ve ölçüm ad eşlemesini çürüttü.

**Karar 16. Bir kerelik göç ad desenini kullanır; desen kalıcı kural olmaz.** *Gerekçe:* R4 ve R5; özellik kurulum yapılmadan hiç çalışmasın diye, ama tahmin veriye yazılıp düzeltilebilir olsun diye.

**Karar 17. Ön doldurma kalemin adını bütün olarak taşır, ayrıştırmaz.** *Gerekçe:* X3. Bu karar analistin "yarı ve model kalem adından gelir" ifadesinin düzeltilmesidir: model bilgisi kalemin model listesinde yapılandırılmış halde var ama erkek ve dişi yalnız ad metninde.

**Karar 18. Manuel satır penceresinin bağ kusuru ve "zaten formda var mı" kusuru bu işin kapsamına alınır.** *Gerekçe:* ölçüm 10 ve 11; dokunulacak kod tam orası ve ikisi de ayrı spec açmaya değmeyecek kadar küçük.

**Karar 19. Servis kaydı çöpe atılırsa tamir satırları formda kalır.** *Gerekçe:* atölye işi yapmış olabilir ve bir ekranın başka bir ekranın iş listesini silmesi doğru değil; satır kaynağını kaybeder, rozet kaybolur.

**Karar 20. Anasayfa'ya bekleyen tamir sayacı eklenmez; sayı toplama düğmesinde yazar.** *Gerekçe:* X7.

---

### QA turunda verilen kararlar (2026-10-28)

Takım Yöneticisi yirmi altı bulgunun hepsini analistin önerisiyle onayladı.

**Karar 21. Bütün yeni tanımlayıcılar spec'te adıyla yazılır.** *Gerekçe:* ölçüm 17; adsız spec `kaynakKalipId` yerine `kalipIdx` kullanan bir uygulamayı mümkün kılar ve o uygulama C1'i sessizce kırar (R1/2, R3/2, R7/2, R16/2, R17/2, R35/2, R37/2).

**Karar 22. Listenin her girişi kalıcı kendi kimliğini taşır; konumsal indeks kullanılmaz.** *Gerekçe:* ölçüm 18 ve C2 (R7/3).

**Karar 23. Yeni sütun ayıklama desenini izler, `degisenParcalar` desenini izlemez; işaret ayrı sütun değil, listeden türetilir.** *Gerekçe:* ölçüm 19; yanlış desen her servise anahtar ekler ve kısıtlı kullanıcıyı her kayıtta 403 yapar (R7/2, R8/2, C11).

**Karar 24. Panonun yazması yalnız ana pencere sekmesindendir.** *Gerekçe:* ölçüm 20; köprü fonksiyon taşımıyor ve yazılabilir listeyi büyütmek formu iki pencereden yazılır hale getirir (R32/2, C13).

**Karar 25. Düğmenin kapısı Stok sekmesi ile eylem iznini birlikte ister.** *Gerekçe:* ölçüm 21; tek şart kioskta düğme çizip 403 üretir (R27/2).

**Karar 26. Teklif bildirim yerine onay penceresinde sunulur.** *Gerekçe:* ölçüm 22; üç saniyede kaybolan bildirime yazma düğmesi konmaz, `ConfirmDialog` zaten paylaşılan ilkeldir (R27/3).

**Karar 27. Üretim formuna `services` salt okunur geçer ve form servis bölümüne hiçbir şey yazmaz.** *Gerekçe:* ölçüm 23; damga atölye kullanıcısının kaydını 403 yapar, yani damgasızlık zorunluluktur (R18/2, C12).

**Karar 28. `partTypeDefs` dört yere eklenir ve prop yoksa öneri çizilmez.** *Gerekçe:* ölçüm 24; eksik prop öneriyi kioskta ve ayrı pencerede sessizce kapatırdı (R11/2).

**Karar 29. Göç yalnız dolu bir tip listesine ekler; satır yoksa hiçbir şey yazmaz ve bayrağını da yazmaz.** *Gerekçe:* ölçüm 25; sistem tiplerinin düşmesi kalıcı ve sessiz bir veri modeli kaybıdır (R4/2).

**Karar 30. Göçün yeni tipi kullanıcı tipidir, sistem tipi değildir.** *Gerekçe:* ölçüm 25; sistem tipinin kutuları pasif çizildiği için R2 ile çelişirdi (R4/2).

**Karar 31. Ad deseni tek fonksiyonda yaşar ve ipucu onu çağırır.** *Gerekçe:* ölçüm 26; ipucu özelliğin kurulumsuz kalmasını engelleyen tek uyarıdır, atmak yerine desen tek kaynağa hapsedilir (R6/2, C14).

**Karar 32. Göç JavaScript'te Türkçe katlamayla eşler, yalnız `ad`ı okur, yalnız canlı ve tipi boş ya da Standart olan parçayı taşır.** *Gerekçe:* ölçüm 29; SQL katlaması AC-5 ile AC-6'yı ölçülemez yapar ve kullanıcı tipini ezmemek AC-9'un ruhudur (R4/3).

**Karar 33. Dedektör tipin adıyla eşler; canlı listede bulunmayan ad kalıp işi değildir.** *Gerekçe:* ölçüm 30; kayıttaki bağ kimlik değil addır (R3/2).

**Karar 34. AC-42 bugünkü davranışa göre yazılır; serbest satır yolu açılmaz.** *Gerekçe:* ölçüm 27 ve X11 (R40/2).

**Karar 35. Manuel pencerede ayna satır Extra Kalıp bağıyla yazılır.** *Gerekçe:* ölçüm 28; aynaya ikinci yazıcı eklemek 0107'nin kapattığı kusuru geri açar (R40/3).

**Karar 36. Kutu her servis türü ve onarım yerinde çizilir.** *Gerekçe:* ölçüm 31 ve Intent'in kendi senaryosu (R10/2).

**Karar 37. Rozet "bitmemiş / toplam" yazar ve satırı olmayan giriş bitmemiş sayılır.** *Gerekçe:* R25/2; aksi hâlde işaretli ama forma hiç girmemiş servis panoda sessiz kalır.

**Karar 38. Düğme birden çok formu yazabilir ve hepsinin kilidini sınar; biri kilitliyse hiçbir şey yazılmaz.** *Gerekçe:* bir servisin kalıpları farklı formlara dağılabilir; kısmi yazma atölyenin listesini yarım bırakır (R27/4).

**Karar 39. Kilit kaydına pano da yazılır.** *Gerekçe:* devralma ön denetimi alan etiketlerini o listeden okur ve 0064'ün taraması bu klasörü denetlemiyor (R27/4).

**Karar 40. Etiket servisin bütün listesini basar; teslim şekli "Kargo", tarih servis tarihidir ve ek ibare yoktur.** *Gerekçe:* C10 ve AC-62; üçüncü hücre ya da ibare başlık eşitliğini kırar (R37/2, X12).

**Karar 41. Kaynağı kopmuş satırda etiket düğmesi çizilmez.** *Gerekçe:* alıcı adresi müşteri kaydından gelir, kaynaksız satır boş etiket basar (R38/2).

**Karar 42. Tür sütunu ilk sütundur; `colSpan` sayıları ekranda yediye, çıktıda altıya çıkar ve servis tarihi Kalıp hücresinde adın altına basılır.** *Gerekçe:* ölçüm 32; sayılar yazılı olmazsa bugünkü tutarsızlık büyür (R16/2, R36/2).

**Karar 43. Çeviri anahtarı dört yere birlikte girer.** *Gerekçe:* ölçüm 33 (R35/2).

**Karar 44. Tamir satırı müşterinin kendi grubuna düşer ve listenin sonuna eklenir.** *Gerekçe:* atölye tek liste okuyor ve ayrımı Tür sütunu veriyor (R24/2, X8).

**Karar 45. Listeden çıkarılan girişin form satırı kalır; silinen satır yeniden bekleyen olur.** *Gerekçe:* Karar 19'un simetrisi ve 0108'in bugünkü davranışı; ters kural üçüncü bir damga ister ve C2'yi açar (R15/2, R23/2).

**Karar 46. Sınır değerler yazılı: yinelenen kalıp serbest, üst sınır yok, ölçü boş serbest, adı boş giriş reddedilir.** *Gerekçe:* R14/2; iki özdeş kalıp gerçekten gelebilir ve ön doldurma ölçüyü zaten boş bırakır.

### Plan turunda verilen kararlar (2026-10-28)

Takım Yöneticisi uygulama planındaki on üç önerinin hepsini onayladı (`specs/done/0115-uygulama-plani.md`).

**Karar 47. AC-72'nin üretim formu çıktısı "Tür sütunu dışında birebir" okunur.** *Gerekçe:* R16/2 ve R36/2 Tür sütununu koşulsuz istiyor, yani işaretsiz veride de çıktı değişir. Kıyas Tür başlığını, `data-tur` işaretli hücreleri ve `colspan="6"` → `"5"` dönüşümünü ayıklar ve ayıklamanın gerçekten iş yaptığını da ölçer.

**Karar 48. Tamir satırı `servisTarihi` kopyasını taşır; kaynak satırı canlı okunur.** *Gerekçe:* R19 servis tarihini ister ve R24 kaynağı kopan satırın da tarihini göstermesini gerektirir. Kaynak satırı "Servis · `<tür>` · `<tarih>`" servisten canlı okunur, servis bulunamazsa "Servis kaydı bulunamadı" yazar.

**Karar 49. Göçün tipinin adı "Kalıp Revize"; aynı adda tip varsa göç hiçbir şey yazmaz ama bayrağını yazar.** *Gerekçe:* kullanıcı tipi elle açmış olabilir; ad Türkçe katlamayla karşılaştırılır. Kimlik `tip_<zaman>`, renk panelin kuralıyla (`palet[kullanıcı tipi sayısı % n]`). `db.cjs` `src/`'yi okuyamadığı için (paket yalnız `dist/` ve `electron/` taşır) palet anahtarları `electron/` tarafına kopyalanır ve eşitlik testle sabitlenir.

**Karar 50. "Firmanın kayıtlı kalıpları" servisin makina kaydının `kaliplar` dizisidir, ayna satırlar dahil.** *Gerekçe:* servis tek makinaya bağlı ve kalıp kimin satışından gelmiş olursa olsun atölyeye aynı kalıp girer; seçim kopya olduğu için (R14/2) ayna satıra hiçbir şey yazılmaz.

**Karar 51. Kayıtlı kalıp kutusu değerle eşlenir; kutu açılınca liste boşsa kalıp işi kalemleri ön doldurulur.** *Gerekçe:* kayıtlı kalıplar kimlik taşımıyor (C2), yani eşleme ad + ölçüdür: aynı ad ve ölçüde giriş varsa kutu işaretli, işaretlemek giriş ekler, kaldırmak ilk eşleşeni çıkarır. Ön doldurma kalıp işi tipli her kalem için bir giriştir (ad bütün, ölçü boş); kalemin `miktar`'ı girişi çoğaltmaz.

**Karar 52. Doğrulama `tamirDogrula(form)`, kimlik kurucuda.** *Gerekçe:* C3. `tamirDogrula` `{ hata, satirHatalari }` döner; iki kurucu çağırır ve hataları `_tamirHatalari` geçici alanına yazar. Kimlikler kurucuda `uid()` ile verilir (`tamirListesiKur(form, yeniId)`), `tamirYaz` yalnız yazar.

**Karar 53. Panonun düğmesi yalnız var olan satırları işaretler.** *Gerekçe:* R33'ün simetrisi ve Karar 10; forma hiç girmemiş giriş için satır uydurmak atölyenin listesine görmediği iş koyar. Onay penceresi forma girmemiş giriş sayısını ayrıca yazar; kapalı dönemdeki formda da işaretleme serbesttir (bugünkü satır onayı gibi).

**Karar 54. "Bekleyen Tamirleri Getir" kapalı dönemde çalışmaz.** *Gerekçe:* "Bekleyen Kalıpları Getir" ile aynı kural; kapalı dönem salt okunurdur.

**Karar 55. Rozet tek bileşen `TamirRozeti`, amber; sözlüğe taşınmaz.** *Gerekçe:* üç kullanım yeri (pano, Makina Geçmişi, sınama) aynı bileşeni çağırır; renk `ambBg`/`amb700` ve `tasarim-kontrast`'a satır eklenir. Sözlüğün "Bilinen borç" bölümüne not düşülür.

**Karar 56. Metinler.** Kutu "Kalıp atölyeye girecek"; ipucu "Makinanın kalıp mili, kalıp rulmanı ya da kalıp yatağı gibi parçalarını değiştirmek bu kutuyu işaretlemeyi gerektirmez; kutu kalıbın kendisinin atölyeye girdiğini söyler."; öneri "Bu serviste kalıp işi kalemi var; kalıp atölyeye girecekse kutuyu işaretleyin."; boş liste "Atölyeye girecek en az bir kalıp seçin."; boş ad "Kalıp adını girin."; bildirim "Bu servisin `n` kalıbı atölyede henüz bitmedi."; onay penceresi başlığı "Kalıplar atölyede", gövdesi "`<firma>` servisinin `n` kalıbı henüz bitmedi.", düğmeleri "Kalıpları da bitti işaretle" ve "Kapat"; getirme düğmesi "Bekleyen Tamirleri Getir (`n`)"; tip kutusu "Kalıp işi"; rozet "KALIP ATÖLYEDE bitmemiş/toplam"; tür adları "Üretim" ve "Tamir". Hepsi `kalipTamiri.js`'ten (R39).

**Karar 57. Göç yalnız yerel veritabanında çalışır; sürüm notu "önce sunucu PC" der.** *Gerekçe:* C5; istemci PC'nin veritabanı açılmaz.

**Karar 58. Sürüm notu: önce sunucu PC, sonra bütün istemciler; güncelleme bitene kadar kutu kullanılmaz.** *Gerekçe:* güncellenmemiş sunucu yeni sütunu bilmez ve listeyi düşürür, güncellenmemiş istemci servisi düzenleyince listeyi siler.

**Karar 59. Ad deseni ve göç planı `electron/kalipTamiriGocuSaf.mjs`'te saf ES modülüdür; `kalipTamiri.js` deseni oradan yeniden dışa verir.** *Gerekçe:* `db.cjs` paketlenmiş uygulamada `src/`'ye erişemez (`build.files` yalnız `dist/**` ve `electron/**`); `kasaGocuSaf.mjs` emsali. C14'ün "desen yalnız `kalipAdDeseni`'nde" kuralı fonksiyon için okunur: desenin metni yalnız bu electron modülünde geçer, `kalipTamiri.js` aynı fonksiyonu dışa verir.

### Karar kaydı

| # | Bulgu | Derece | Karar | İşlendiği maddeler |
|---|---|---|---|---|
| B-1 | Yeni tanımlayıcılar adsız | Bloklayıcı | Karar 21 | R1/2, R3/2, R7/2, R16/2, R17/2, R35/2, R37/2, AC-74 |
| B-2 | Tamir satırının kaynak kimliği | Bloklayıcı | Karar 22 | R7/3, AC-75, AC-76 |
| B-3 | Sütun yazım ve okuma deseni | Bloklayıcı | Karar 23 | R7/2, R8/2, C11, AC-23, AC-27, AC-77 |
| Ö-1 | R32 ile R27 çelişkisi | Önemli | Karar 24 | R32/2, C13, AC-56, AC-95 |
| Ö-2 | Düğmenin yetki kapısı | Önemli | Karar 25 | R27/2, AC-48, AC-49, AC-92 |
| Ö-3 | Eylemli bildirim yok | Önemli | Karar 26 | R27/3, AC-93 |
| Ö-4 | `services` zinciri ve yazma yasağı | Önemli | Karar 27 | R18/2, C12, AC-79, AC-80 |
| Ö-5 | `partTypeDefs` zinciri | Önemli | Karar 28 | R11/2, AC-81 |
| Ö-6 | Göçün yazacağı liste | Önemli | Karar 29, Karar 30 | R4/2, AC-82, AC-83 |
| Ö-7 | İpucu ile ad yasağı çelişkisi | Önemli | Karar 31 | R6/2, C14, AC-10, AC-11, AC-86 |
| Ö-8 | AC-42'nin yolu yok | Önemli | Karar 34 | R40/2, X11, AC-42, AC-101 |
| Ö-9 | Manuel pencerede ayna satır | Önemli | Karar 35 | R40/3, AC-102 |
| Ö-10 | Göçün eşleme kuralları | Önemli | Karar 32, Karar 33 | R3/2, R4/3, AC-5, AC-6, AC-84, AC-85 |
| K-1 | Kutunun çizilme koşulu | Küçük | Karar 36 | R10/2, AC-87 |
| K-2 | Rozetin biçimi | Küçük | Karar 37 | R25/2, AC-44, AC-91 |
| K-3 | "Biten" tanımı | Küçük | Karar 37 | R25/2, AC-45, AC-91 |
| K-4 | Etiketin alanları | Küçük | Karar 40 | R37/2, X12, AC-96 |
| K-5 | Kaynaksız satırda etiket | Küçük | Karar 41 | R38/2, AC-97 |
| K-6 | Tür sütunu ve `colSpan` | Küçük | Karar 42 | R16/2, R36/2, AC-61, AC-98 |
| K-7 | Çeviri anahtarının dört yeri | Küçük | Karar 43 | R35/2, AC-99 |
| K-8 | Tamir satırının grubu ve sırası | Küçük | Karar 44 | R24/2, AC-100 |
| K-9 | Liste sınır değerleri | Küçük | Karar 46 | R14/2, AC-88 |
| K-10 | Giriş çıkarılınca satırın hâli | Küçük | Karar 45 | R15/2, AC-89 |
| K-11 | Silinen satır yeniden bekleyen | Küçük | Karar 45 | R23/2, AC-90 |
| K-12 | Kilit alanı kaydı | Küçük | Karar 39 | R27/4, AC-103 |
| K-13 | Satır atfı kaymaları | Küçük | Karar 21 | ölçüm 10, 14, 15 |
| P-1 | Tür sütunu ile AC-72 | Önemli | Karar 47 | AC-72 |
| P-2 | Servis tarihi ve kaynak satırı | Küçük | Karar 48 | R19, R24 |
| P-3 | Göç tipinin adı ve çakışma | Önemli | Karar 49 | R4/2 |
| P-4 | Kayıtlı kalıpların kaynağı | Küçük | Karar 50 | R12 |
| P-5 | Onay kutusu eşlemesi ve ön doldurma | Önemli | Karar 51 | R12, R13 |
| P-6 | Doğrulama ve kimliğin yeri | Önemli | Karar 52 | R7/3, R14 |
| P-7 | Düğmenin kapsamı | Küçük | Karar 53 | R27 |
| P-8 | Kapalı dönemde getirme | Küçük | Karar 54 | R18 |
| P-9 | Rozet bileşeni ve rengi | Küçük | Karar 55 | R25 |
| P-10 | Metinler | Küçük | Karar 56 | R39 |
| P-11 | Göçün yeri | Küçük | Karar 57 | C5 |
| P-12 | Karışık sürüm | Önemli | Karar 58 | C11 |
| P-13 | `db.cjs` `src/`'yi okuyamaz | Bloklayıcı | Karar 59 | R6/2, C14 |

## Kabul kriterleri

### Dedektör, tip ve göç

- **AC-1.** Parça tipi panelinde her tip satırında dördüncü bir davranış kutusu çizilir.
- **AC-2.** Bayrak işaretli bir tipe atanmış parça kalıp işi sayılır.
- **AC-3.** Bayrak işaretsiz tipe atanmış, adında "KALIP REVİZE" geçen parça kalıp işi **sayılmaz**.
- **AC-4.** Bayrak kullanıcının oluşturduğu tipe de verilebilir ve iki ayrı tip aynı bayrağı taşıyabilir.
- **AC-5.** Göç, adında "KALIP" ve "REVİZE" birlikte geçen kalemleri bayraklı tipe alır; eşleme Türkçe katlamayla yapılır, yani "revize" yazımı da eşleşir (R4/3).
- **AC-6.** Göç "KALIP MİLİ", "KALIP RULMANI" ve "KALIP YATAĞI" kalemlerine dokunmaz; dışlama da aynı katlamayla uygulanır.
- **AC-7.** Göç "KAZAN REVİZE" ve "KARIŞTIRICI REVİZE" gibi kalıp dışı revize kalemlerine dokunmaz.
- **AC-8.** Göç ikinci açılışta yeniden çalışmaz (kendi `meta` bayrağı).
- **AC-9.** Göçten sonra kullanıcının elle değiştirdiği tip, sonraki açılışta geri alınmaz.
- **AC-10.** Kaynak taraması: parça adı deseni yalnız `kalipTamiri.js`'in `kalipAdDeseni` fonksiyonunda geçer; ekran, motor ve doğrulama kendi ad aramasını yazmaz (C14, R6/2).
- **AC-11.** Tipi işaretsiz, adında kalıp geçen bir parça kaydedilirken ipucu görünür ve koşulu `kalipAdDeseni`'nden okunur; kayıt engellenmez.

### Servis formu ve kaydı

- **AC-12.** Müşteri detayından açılan servis formunda kalıp kutusu bulunur.
- **AC-13.** Servis ve Kargo Panosu'ndan açılan servis formunda aynı kutu bulunur ve iki formun alan etiketleri birbiriyle aynıdır.
- **AC-14.** Extra Kalıp ve yedek parça formlarında bu kutu **bulunmaz**.
- **AC-15.** Kalıp işi tipli kalem eklenince öneri görünür.
- **AC-16.** Öneri kutuyu işaretlemez; kutu kullanıcı tıklayana kadar kapalı kalır.
- **AC-17.** Kalıp işi tipli kalem yoksa öneri çizilmez.
- **AC-18.** Kutu açılınca üç kaynak bölümü çizilir.
- **AC-19.** Ön doldurulan satırın kalıp alanı kalemin adını bütün olarak taşır.
- **AC-20.** Ön doldurulan satırın ölçü alanı **boş** gelir.
- **AC-21.** Firmanın kayıtlı kalıpları onay kutusuyla listelenir.
- **AC-22.** Elle girilen kalıp, listede karşılığı olmadan kaydedilir.
- **AC-23.** Kaydedilen gövdede `atolyeKaliplari` listesi (kimlik, ad, ölçü) bulunur; işaret ayrı alan değildir, `kalipAtolyedeMi` ile listeden türetilir (R7/2).
- **AC-24.** Hata yolu: kutu açık ve hiç kalıp seçilmemişse kayıt reddedilir ve nedeni görünür.
- **AC-25.** Kutu kapatılıp kaydedilen kayıtta kalıp listesi **hiç yoktur**.
- **AC-26.** Kaydedilen gövdede müşteri kaydının kalıpları, kalıp durumu ve `uretimFormId` alanları değişmez.
- **AC-27.** Kutu kapalı kayıtta sütun `null` yazılır ve okunan gövdede anahtar **hiç yoktur** (boş dizi de değil, C11).

### Üretim formu

- **AC-28.** Satır listesinde Tür sütunu bulunur ve üretim satırı "Üretim" yazar.
- **AC-29.** Tamir satırı "Tamir" yazar ve zemini ayrıdır.
- **AC-30.** "Bekleyen Tamirleri Getir" işaretli tamirleri forma ekler.
- **AC-31.** Getirme formun tarih aralığına bakmaz: dönemi tek gün olan forma, aylar önceki servisin tamiri de gelir.
- **AC-32.** Düğme bekleyen tamir sayısını yazar.
- **AC-33.** Aynı tamir ikinci bir forma eklenmez.
- **AC-34.** Tamir satırı servis tarihini ve kaynağını satırın altında yazar.
- **AC-35.** Tamir satırı olan formda müşteri kalıbının durumu ve pili değişmez.
- **AC-36.** Tamir satırı olan form çöpe atılınca tamir yeniden bekleyen olur.
- **AC-37.** Çöpten geri alınınca bekleyen listesinden çıkar.
- **AC-38.** Form silme onayı tamir satırlarını dönecek kalıp sayısına katmaz (o sayı müşteri kalıbı ve Extra Kalıp için tanımlı).
- **AC-39.** Atölye tamir satırını silince servisin işareti kayıtta kalır.
- **AC-40.** Servis kaydı çöpe atılınca formdaki tamir satırları formda kalır.
- **AC-41.** Manuel Satır Ekle'de müşteri kalıbı seçilerek eklenen satır kaynak bağını taşır.
- **AC-42.** Manuel pencerede müşteri seçilmeden satır eklenemez: düğme pasiftir ve hiçbir satır doğmaz (R40/2, X11).
- **AC-43.** Üç kaynak türü "zaten formda var mı" kümesinde birbirine karışmaz.

### Pano

- **AC-44.** Bitmemiş tamiri olan servis kartı rozet taşır ve "bitmemiş / toplam" sayısını yazar (R25/2).
- **AC-45.** Bütün girişleri canlı bir formda tamamlandı işaretli olan serviste rozet çizilmez.
- **AC-46.** Kart Tamamlandı'ya sürüklenir ve bitmemiş tamir varsa bildirim çıkar.
- **AC-47.** Sürükleme engellenmez: kart Tamamlandı sütununa geçer.
- **AC-48.** Stok sekmesi görünen ve üretim formunu düzenleyebilen kullanıcıda, ana pencerede onay penceresi düğmesiyle açılır (R27/2, R27/3).
- **AC-49.** Kioskta düğme çizilmez (izin boyutu tanımsız olsa da kapı Stok sekmesini ister), yalnız düz bildirim çıkar.
- **AC-50.** Düğme basılınca o servisin bütün tamir satırları tamamlandı işaretlenir.
- **AC-51.** Hata yolu: formu başka kullanıcı kilitlemişse düğme yazmaz ve nedeni bildirir.
- **AC-52.** Atölye son tamir satırını bitirince servisin durumu değişmez.
- **AC-53.** Tamir biten kart yanıp sönmez ve ses çıkarmaz.
- **AC-54.** Rozet kalıp adı yazmaz.
- **AC-55.** Sürükleme önekleri, sütun eşlemesi ve arşiv davranışı değişmez.
- **AC-56.** Ayrı pencerede rozet çizilir, düğme çizilmez ve üretim formları köprünün yazılabilir listesine girmez (R32/2).

### Görünürlük ve çıktılar

- **AC-57.** Makina Geçmişi'ndeki servis satırı rozet ve kalıp adlarını gösterir.
- **AC-58.** Kalıp taşımayan servis satırı rozet göstermez.
- **AC-59.** Servis Formu çıktısında kalıp varken etiket satırı basılır.
- **AC-60.** Kalıp yokken o satır **hiç basılmaz**.
- **AC-61.** Üretim formu çıktısında Tür sütunu ilk sütun olarak basılır ve tamir satırının servis tarihi Kalıp hücresinde adın altına basılır (R36/2).
- **AC-62.** Kargo Etiketi'nin altıncı durumunda başlıklar diğer beş durumla birebir aynıdır.
- **AC-63.** Etiketin içeriği "ad · ölçü" biçiminde basılır.
- **AC-64.** Etiketin alıcısı müşterinin kayıtlı adresidir, göndereni fabrikadır.
- **AC-65.** Etiket düğmesi üretim formu satırında ve Makina Geçmişi servis satırında bulunur; panoda bulunmaz.
- **AC-66.** Rozet, öneri, ipucu ve bildirim metinlerinin düz metni ekran dosyalarında geçmez (tarama).

### Veri, sunucu ve kıyas

- **AC-67.** Servisin kalıp listesi dört nokta kuralıyla eklenir ve `db-roundtrip` testinde gidip gelir.
- **AC-68.** Temiz kurulumda alan vardır (`db-clean-install`).
- **AC-69.** Yeni eylem izni ve yeni sunucu kuralı eklenmediği testle sabitlenir: işaret ve kalıp listesi yazan servis düzenlemesi bugünkü izinle 200 döner.
- **AC-70.** Tamir satırı ekleyen üretim formu yazımı bugünkü Stok izniyle 200 döner.
- **AC-71.** Bayrağı yazan tip tanımı güncellemesi bugünkü Ayarlar izniyle 200 döner.
- **AC-72.** Kıyas: işaret taşımayan bir veri kümesinde müşteri listesi, kalıp pilleri, bekleyen kalıp sayısı, üretim formu çıktısı ve servis formu çıktısı spec öncesi kodla **birebir** aynıdır.
- **AC-73.** 0106, 0108 ve 0110'un kalıp durumu testleri dokunulmadan geçer.

---

### QA turu kriterleri (2026-10-28)

- **AC-74.** Adların tamamı testle sabitlenir: bayrak `kalipIsi`, alan `atolyeKaliplari`, modül `src/lib/kalipTamiri.js` ve dokuz dışa verdiği ad, satır alanları `tur`, `kaynakTip: "servis_tamir"` ve `kaynakKalipId`, çeviri anahtarı `atolyeKaliplariLabel`, adaptör `tamirEtiketVerisi`.
- **AC-75.** Listenin her girişi kendi kimliğini taşır; servis düzenlemesi değişmeyen girişlerin kimliğini korur.
- **AC-76.** Formdaki satır girişin kimliğiyle eşlenir: liste yeniden sıralanınca satır aynı kalıpta kalır.
- **AC-77.** Kıyas: işaretsiz veride kaydedilen servis gövdesi spec öncesi kodla birebir aynıdır (yeni anahtar yok).
- **AC-78.** Tamir satırı `satirAnahtari`'ndan `null` döner ve üretim formu haritasına girmez (C1 mekanizması).
- **AC-79.** Üretim formu kaydı `services` dizisine dokunmaz.
- **AC-80.** Bekleyen tamir sayısı ve getirme `services` prop'undan okunur; prop boşken düğme sıfır yazar ve ekran hata vermez.
- **AC-81.** `partTypeDefs` verilmeyen pano düzeneğinde öneri çizilmez ve form hata vermez.
- **AC-82.** Göç `meta` satırı yokken hiçbir şey yazmaz, bayrağını da yazmaz; sistem tipleri yerinde kalır.
- **AC-83.** Göç yeni tipi listenin sonuna ekler ve var olan tipleri değiştirmez.
- **AC-84.** Göç "REVİZE" ve "revize" yazımını aynı sayar ve yalnız `ad` alanını okur.
- **AC-85.** Göç çöpteki parçaya ve tipi Standart olmayan parçaya dokunmaz.
- **AC-86.** Kaynak taraması: desenin metni yalnız `kalipAdDeseni` içinde geçer ve ipucu onu çağırır.
- **AC-87.** Kutu her servis türünde ve her onarım yerinde (yerinde onarım ve anlaşmasız dış servis dâhil) çizilir.
- **AC-88.** Sınır değerler: aynı kalıp iki kez girilebilir, ölçü boş bırakılabilir, adı boş giriş reddedilir ve nedeni satırın altında görünür.
- **AC-89.** Listeden çıkarılan girişin form satırı formda kalır ve kaynağını kaybeder; rozet güncel girişleri sayar.
- **AC-90.** Atölye tamir satırını silip formu kaydedince tamir yeniden bekleyen olur ve getirme onu yeniden ekler.
- **AC-91.** Rozetin metni tek sabitten gelir; hiçbir formda satırı olmayan giriş bitmemiş sayılır.
- **AC-92.** İzin boyutu tanımsız kiosk kullanıcısında düğme çizilmez (kapı Stok sekmesini de ister).
- **AC-93.** Bitmemiş tamir varken kart Tamamlandı'ya geçer ve onay penceresi açılır; kapısı geçmeyen kullanıcıda pencere yerine düz bildirim çıkar.
- **AC-94.** Düğme birden çok formdaki satırları yazar ve her formun kilidini sınar; biri başkasındaysa hiçbir şey yazılmaz.
- **AC-95.** Köprünün yazılabilir listesi altı bölüm kalır (tarama).
- **AC-96.** Etiketin teslim şekli "Kargo", tarihi servis tarihi, içeriği servisin bütün listesidir; ek ibare ve kargo takip hücresi yok.
- **AC-97.** Kaynağı kopmuş üretim formu satırında etiket düğmesi çizilmez.
- **AC-98.** Yazdırmada Tür sütunu ve altı `colspan` basılır; ekranda grup başlığı yedi sütunu kaplar.
- **AC-99.** Çeviri anahtarı dört yerde birden bulunur ve kapsam testi geçer.
- **AC-100.** Tamir satırı müşterinin kendi grubunda ve listenin sonunda çizilir.
- **AC-101.** Manuel pencerede müşteri seçilmeden ekleme düğmesi pasiftir.
- **AC-102.** Manuel pencerede ayna satır seçilince bağ `extra_kalip` yazılır ve ayna kaydına `uretimFormId` yazılmaz.
- **AC-103.** Kaynak taraması: `KILIT_ALANLARI.uretim_formu` pencereler listesi `ServisPanosu.jsx`'i içerir.

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Dedektör ve bekleyen tamir hesabı React'sız **saf motorda** yazıldı ve kendi testi var; ekranlar yalnız gösteriyor (C3).
- [ ] Panonun rozeti ile üretim formunun satırı aynı kaynağı okuyor (C3).
- [ ] Servisin kalıp listesi dört nokta kuralıyla eklendi ve `db-roundtrip` ile `db-clean-install` testlerine girdi (C4).
- [ ] Göç yalnız yerel veritabanı açılışında bir kez çalışıyor, kendi `meta` bayrağını yazıyor ve ikinci kez çalışmıyor (C5, AC-8).
- [ ] Yeni veri bölümü yok; yeni eylem izni ve sunucu kuralı **eklenmediği açıkça yazıldı** ve üç yazım yoluyla testle sabitlendi (C6, AC-69, AC-70, AC-71).
- [ ] Kalıp durumu makinesine dokunulmadığı taramayla ve 0106, 0108, 0110 testlerinin dokunulmadan geçmesiyle gösterildi (C1, AC-73).
- [ ] Parça adında metin aramasının göç dışında hiçbir yerde olmadığı taramayla sabitlendi (C8, AC-10).
- [ ] Soft-delete ve çöp kutusu simetrisi korundu: formun çöpe atılması, geri alınması ve servisin çöpe atılması ayrı ayrı kriterli (AC-36, AC-37, AC-40).
- [ ] Kullanıcıya görünen bütün metinler Türkçe; Servis Formu çıktısının yeni satırı için TR ve EN çeviri anahtarları eklendi (R35).
- [ ] Kargo Etiketi'nin altı durumunda başlıkların birebir aynı olduğu testle sabitlendi (C10, AC-62).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi; kutu kapalı ve açık, rozetli ve rozetsiz kart, kiosk hâli ve hata yolları (AC-24, AC-51) dâhil.
- [ ] İşaretsiz veride kıyas testi birebir geçiyor (C9, AC-72).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: yeni kavram, ve Kargo Etiketi başlık listesindeki "KARGO-TAKİP NO" hatası düzeltildi (ölçüm 14).
- [ ] Yeni tanımlayıcıların tamamı (alan, modül, fonksiyonlar, satır alanları, çeviri anahtarı, adaptör) spec'te yazılı ve testle sabit (B-1, AC-74).
- [ ] Liste girişinin kimliği kalıcı; hiçbir yerde konumsal indeks kullanılmadı (B-2, C2, AC-75, AC-76).
- [ ] Yeni sütun ayıklama kuralıyla eklendi; kapalı kayıtta gövdede anahtar yok ve işaretsiz veride gövde kıyası birebir (C11, AC-27, AC-77).
- [ ] Üretim formunun `services` bölümüne yazmadığı ve panonun yalnız ana pencereden yazdığı testle sabit (C12, C13, AC-79, AC-95).
- [ ] Ad deseni yalnız tek fonksiyonda; ipucu onu çağırıyor (C14, AC-10, AC-86).
- [ ] Göç yalnız dolu tip listesine ekliyor, satır yokken hiçbir şey yazmıyor ve sistem tipleri yerinde (AC-82, AC-83).
- [ ] Prop zincirleri (`services`, `partTypeDefs`) eklendi; eksik prop'ta ekran çökmüyor ve öneri çizilmiyor (AC-80, AC-81).
- [ ] Çeviri anahtarı dört yere birlikte girdi (AC-99).
- [ ] Kilit alanı kaydı güncellendi (AC-103).
- [ ] **Karar kaydı tablosu dolduruldu** (yirmi altı bulgu, derecesiyle).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `7661066` | Dal `feat/0115-kalip-tamiri`, taban `86a76b5`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (2026-10-28), plan turu (Karar 47–59) |
| **Düzeltme turu sayısı** | 1 | Triyaj: yedi bulgu (1 orta-düşük, 5 düşük, 1 belge): taslaktan dönen formda geçici giriş anahtarı çakışıyordu (kod düzeltmesi); pano kurucusunun kalıp doğrulaması, "Kalıpları da bitti işaretle"nin kapsamı (başka servis, çöpteki form) ve kalıpsız serviste etiket düğmesinin yokluğu testsizdi; üretim formu çıktısı kalıp adını kaçışsız basıyordu (eski kusur, yeni yoldan erişilebilir); Manuel Satır Ekle başka formda bağlı kalıbı ikinci forma bağlayabiliyordu (kod düzeltmesi, kalıp pasif çizilir); ana dizindeki spec kopyası eskiydi |
| **Bulgu gerçek/gürültü oranı** | 7 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 436 dosya, 5918 test (Electron dahil); lint 0 hata |
| **Kaçan hata** | 2 | Taslak anahtar çakışması ve manuel pencerenin ikinci bağı; ikisi de triyajda yakalandı |

**Görsel kanıt:** 34 ekran × 2 tema; 17 yeni ekran, var olan 17 ekranın 9'u bilinçli değişti (servis formu, parça tipi paneli, pano kartı, üretim formu), 8'i 0 piksel; taban son kodla 0 fark.

**Bu spec'ten çıkarılan ders:** Bileşen içi sayaçla üretilen geçici anahtar, form taslağa yazılıyorsa kalıcı veridir: taslak geri yüklenince sayaç sıfırdan başlar ve eski girişle çakışır, yani geçici anahtarın kaynağı formun kendisi olmalı. Bir kaynak bağını yeni bir yoldan (burada manuel pencere) yazmaya başlayan değişiklik, o bağın "ikinci forma çekilemez" kuralını yalnız eski yolda değil yeni yolda da sınamalı. İki kurucuya kopyalanan doğrulamada metin taraması davranışı korumaz; reddetme dalı her kurucuda ayrı ölçülmeli.
