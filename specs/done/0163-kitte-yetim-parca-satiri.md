# 0163 — Kitte yetim kalan parça satırı

| | |
|---|---|
| **Durum** | Tamamlandı (commit `ff692569`; plan `specs/done/0163-uygulama-plani.md`) |
| **Revizyon** | 2 (2026-11-25 QA turu) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **QA turu** | 2026-11-25: 25 bulgu (4 Bloklayıcı / 10 Önemli / 11 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 3 (stok kolunun tek kural sanılması, kanıtlanamayan canlı veri rakamları, kiti okuyan yerler listesinin yazma yollarını saymaması) |
| **Etkilenen alanlar** | Model kitinin okuma yolu (`lib/urunAgaci.js`), model maliyeti (`lib/makinaStandartMaliyet.js`), sipariş ihtiyacı (`lib/siparisIhtiyaci.js`), stoğa makina eklerken "Kiti Uygula" (`stock/MakinaStokTab.jsx`) ve iki ekran: `components/maliyet/ModelMaliyetleri.jsx` ile `components/stock/SiparisPenceresi.jsx` (Parti Hesabı `components/maliyet/PartiHesabi.jsx` yalnız eksik rozetiyle) |
| **Bağımlı spec'ler** | **0087** (kit satırının şekli `{partId, ad, miktar}`, ad kopyasının parça adıyla taşınması, tek yazma yolu `kitleriGuncelle`), **0123** (kitte geçen parçanın kalıcı silinebilmesi kararı, bu kusurun doğduğu yer), **0134** (ondalık kit adedi), **0136** (donmuş parti maliyeti), **0162** (aynı kuralın Analiz'deki emsali: okuma anında birebir ad eşleşmesi), **0140** (sipariş penceresinin yeri ve `stock_siparis_listesi` izni), **0144** (belgenin fiyatlı nüshası), **0161** (sipariş satırlarının cins sıralaması) |

---

## Intent

Takım Yöneticisi 2026-11-24'te Makina Maliyeti ekranında bir kit satırının "parça silinmiş ya da yok" dediğini, oysa aynı parçanın yedek parça kataloğunda maliyetiyle durduğunu bildirdi. Kendi anlatımıyla kusurun doğuşu şu: bir parça silinip aynı parça yeniden girildiğinde, eskisinin kit satırı modelin kitinde kalıyor ve orada durmaya devam ediyor.

Ölçüm bunu doğruladı ve bir ayrıntı ekledi: yeniden girilen kayıt kite eklenmiş ve doğru çalışıyor, yanında eskinin ölü kimliğe bağlı satırı duruyor. Yani **rakam bugün doğru**, kusur görünümde ve denetimde: ekranda hesaba girmeyen bir satır duruyor, sipariş listesinin eksik parça sayacı onu sayıyor, ve kullanıcı bakınca o parçanın maliyetinin alınmadığını sanıyor.

Bu iş bittiğinde yetim satır **canlı hesaplanan** hiçbir ekranda ve hesapta görünmeyecek; aynı parça kitte zaten bağlıysa rakam hiç değişmeyecek, bağlı değilse yetim satır o parçanın maliyetini ve siparişini getirecek.

2026-11-25 QA turu kuralın kapsamını iki yerden daralttı. Birincisi stok kolu: stok kaydının kit kopyası parçanın adını hiç taşımıyor (Ölçüm D), yani düşüm anında ad eşleşmesi yazılamaz ve kural orada yalnız "Kiti Uygula" düğmesinin doldurduğu listede çalışabilir. İkincisi donmuş üretim partisi: eksik sayısı kapanış görüntüsünde kayıtlı olduğu için (Ölçüm P) "eksik" rozeti o satırlarda kalır, Intent'in yukarıdaki cümlesi bu yüzden canlı hesapla sınırlıdır.

---

## Requirements

- **R1.** Kit satırının parçası **okuma anında** çözülür. Önce kimlik: satırın `partId`'si canlı parça kataloğunda varsa o parça kullanılır (bugünkü davranış, değişmez). Kimlik çözülemiyorsa satırın **ad kopyası** (`ad`) canlı katalogdaki tek bir parçayla birebir eşleşiyorsa o parça kullanılır. Bütün kimlik karşılaştırmaları `String()` ile yapılır (kataloğun kimliği `uid()` ile sayı üretilir, kite `kitleriGuncelle` `String(partId)` yazar; `urunAgaci.js:679`), ve `partId`'si boş, `null` ya da `undefined` olan satır da "kimlik çözülemedi" sayılıp ad eşleşmesine düşer.
- **R1/2.** Birebir eşleşme şudur: iki tarafın (kit satırının `ad` kopyası ve katalog kaydının `ad` alanı) baştaki ve sondaki boşluğu yok sayılır, ikisi `utils.trLower` (`src/lib/utils.js:150`) ile Türkçe küçük harfe indirilerek karşılaştırılır. Arama normalleştiricisi (`aramaNormalize`, `src/lib/utils.js:156`) **kullanılmaz**. Kısmi eşleşme, ön ek eşleşmesi ve benzerlik **aranmaz**. Yalnız `ad` okunur; `adEN` ve `kod` eşleşmeye girmez. **İç boşluk normalleştirilmez:** "Rulman  Yatağı" (iki boşluk) ile "Rulman Yatağı" eşleşmez; `\s+` katlaması yazılmaz.
- **R1/3.** Aynı katlanmış ada inen birden çok canlı parça varsa eşleşme yapılmaz (hangisi olduğu belirsizdir) ve satır R4'e düşer.
- **R1/4.** Ad kopyası boşsa ya da yalnız boşluktan oluşuyorsa eşleşme aranmaz; satır R4'e düşer.
- **R1/5.** Kimlik çözülüyorsa ad eşleşmesi **hiç aranmaz**: kimlik önceliklidir.
- **R1/6.** Eşleşme **yalnız canlı katalogda** aranır; çöptekileri de taşıyan ham dizi (`siparisIhtiyaci.js`'in `hamParca` haritası, `:267`) ad eşleşmesinde hiç okunmaz. Çöpteki bir parçanın kimliğini taşıyan satır, aynı adda **canlı** bir parça yoksa R4'e düşer: çöpe atılmış parçanın maliyetinin eksik sayılması bilinçli bir karardır (`parcaHaritasi` `deletedAt` süzer, `makinaStandartMaliyet.js:201`; 0121 R6/2 setin bileşeni için aynısını yazar) ve ad üzerinden ters çevrilmez.
- **R2.** **Yinelenen yetim satır düşer.** Ada göre çözülen parçanın kimliğiyle **aynı modelin kitinde** başka bir **çözülmüş** satır (kimlikle ya da adla çözülen) varsa, yetim satır okuma anında yok sayılır: ekranda çizilmez, eksik sayılmaz, direkt maliyete girmez, sipariş ihtiyacı üretmez, adedi hiçbir yere eklenmez ve kit adedi sayılarını değiştirmez.
- **R2/2.** Yok sayılan satır **kayıtta aynen kalır**; hiçbir yazma yapılmaz, göç yoktur.
- **R2/3.** Kardeş satırın adedi yok sayılan satırın adediyle **toplanmaz**: kardeşin kendi adedi geçerlidir.
- **R2/4.** Kardeş ölçütü ham kit satırının **varlığıdır**, adedine bakılmaz. Adedi sıfır ya da sayıya çevrilemeyen bir kardeş de yetim satırı düşürür. Bilinen sonuç: sipariş tarafında böyle bir kardeş zaten atlandığı için (`siparisIhtiyaci.js:299` `if (!(miktar > 0)) continue;`) parça sipariş listesinden tamamen çıkar, bugün ise "eksik" sayılıyordu. Kullanıcı bunu model kartından görür ve düzeltir (R6). Ölçütün adede bağlanması iki motorun düşürdüğü satır kümesini ayırır ve C1'i kırar, bu yüzden yasaktır.
- **R2/5.** Aynı modelin kitinde **iki ya da daha çok** yetim satır aynı canlı parçaya çözülürse kitte **önce gelen** satır kalır (satır sırası veri sırasıdır), sonrakiler R2 ile düşer. Hiçbir koşulda aynı parça aynı modelin kitinde iki kez sayılmaz.
- **R3.** Ada göre çözülen ve o parçanın kitte başka satırı **olmayan** kit satırı, o parçanın satırı gibi işlenir: satırın kendi adedi korunur, birim maliyet çözülen parçadan okunur (tek okuma yolu, tarih verilirse o tarihte geçerli değer), sipariş ihtiyacı o parçaya yazılır. Satırın adı çözülen katalog kaydının adıdır.
- **R3/2.** Çözücünün döndürdüğü satır **çözülen** kimliği taşır; ham kimlik gerekiyorsa ayrı bir alanda (ör. `hamPartId`) durur. Kitin kimlik kümesi (`makinaStandartMaliyet.js:224` ve `siparisIhtiyaci.js:296`'daki `kitIdleri`) bu çözülmüş kimliklerden kurulur ve R2 ile yok sayılan satırın kimliği kümeye **girmez**. Yoksa kitte canlı bir set ile o setin bileşenini gösteren kardeşsiz yetim satır bulunduğunda kesişim uyarısı sessizce kaçar (küme ölü kimliği taşır) ve iki motorun kesişim listesi birbirinden ayrışır.
- **R4.** Ne kimliği ne adı çözülebilen satır **bugünkü gibi** kalır: Model Maliyetleri'nde "parça silinmiş ya da yok" ibaresiyle çizilir, eksik sayılır, direkt maliyete katkısı sıfırdır; sipariş tarafında bugünkü silinmiş kalem davranışını sürdürür (ihtiyaç üretmez, eksik parça sayacına girer).
- **R5.** Kural kitin bütün tüketicilerinde aynıdır ve tek kaynaktan gelir: model maliyeti (Model Maliyetleri ekranı, Parti Hesabı'nın direkt maliyeti, donmuş parti görüntüsünün üretimi), sipariş ihtiyacı (pencere ve belge, parça ihtiyacı ve malzeme kesitleri) ve stok tarafında **yalnız** "Kiti Uygula" düğmesi (R5/2).
- **R5/2.** **Stok kolu dardır.** Kural yalnız "Kiti Uygula" düğmesinin formu doldurduğu anda uygulanır: R2 ile yok sayılan satır listeye hiç girmez, R3 ile çözülen satır çözülen kimlikle girer. `deductParts` ve kayıtlı `stock[].parcalar` **dokunulmaz**; o satırlar parçanın adını hiç taşımaz (`MakinaStokTab.jsx:327` yalnız `partId` ve `miktar` yazar, Ölçüm D), yani düşüm anında ad eşleşmesi teknik olarak yazılamaz. Düğmenin yazdığı liste yeni bir stok kaydına gider, var olan hiçbir kayıt değişmez (C3 korunur).
- **R5/3.** "Kiti Uygula (N parça)" düğmesinin sayısı da **çözülmüş** kümeyi yazar (R2 ile düşen satır sayılmaz).
- **R5/4.** Bugün kayıtlı stok satırlarının `parcalar` kopyasındaki ölü kimlikler çözülmez ve temizlenmez (X10). Bugünkü davranış: böyle bir satır `stokKirparakDus`'ta eldeki stoğu sıfır gördüğü için düşüm ve hareket satırı üretmez (`utils.js:918-930`, Ölçüm F), yani zararsızdır.
- **R6.** **Model kartının kit listesi değişmez:** yetim satır orada adıyla görünmeye ve çöp düğmesiyle silinebilmeye devam eder. Bu bilinçlidir: bu işte veriden temizlik yapılmadığı için (R2/2) kullanıcının satırı elle silebileceği tek yer burasıdır.
- **R7.** Toplamlar **R2 hâlinde** korunur: yetim satırın kitte kardeşi varken modelin direkt maliyeti, kâr hesabı, öneri fiyatı, sipariş adetleri ve malzeme kesitleri **birebir bugünküdür**; yalnız eksik sayısı ve çizilen satır sayısı azalır.
- **R7/2.** **R3 hâlinde toplamlar değişir ve bu beklenir.** Kardeşsiz yetim satır çözülünce yeni bir canlı kalem doğar; sipariş tarafında beş türev birlikte değişir (`siparisIhtiyaci.js:443-446`): canlı kalem sayısı, hazır parça sayısı (`hazirSayi`), stok uyarısının ölçütü (`stoklu * 20 < toplam`), tedarikçi bölümlemesi ve 0150'nin tedarikçi seçicisi listesi. Kıyas testi hangi alanların değişmesinin beklendiğini bu maddeden okur.
- **R8.** Donmuş üretim partisinin kapanış görüntüsü (`kapanisMaliyeti`) dokunulmaz: kaydedilmiş rakamlar olduğu gibi okunur, yeniden hesaplanmaz.
- **R8/2.** **Bilinen sınır:** donmuş satırın "eksik" rozeti de değişmez. Rozet `PartiHesabi.jsx:124`'te `r.eksikSayisi > 0` ile çizilir ve donmuş makinada bu değer kapanış görüntüsünden okunur (`makinaStandartMaliyet.js:472, 480`), yani yetim satırı saymaya devam eder. Partiyi yeniden açıp kapatmak hem rakamı hem rozeti yeniler; bu işte hiçbir görüntü yeniden yazılmaz.
- **R9.** Set kesişim uyarısı (0121) aynı kuraldan geçer: yok sayılan satır kesişim hesabına girmez **ve** kesişim kümesi R3/2'nin çözülmüş kimliklerinden kurulur, yani çözülen satırın parçası hem set olarak hem bir setin bileşeni olarak görünür.

---

## Context

Ölçümler 2026-11-24 ve 2026-11-25'te yapıldı (okuma, salt okunur). Kaynak ölçümleri HEAD `4f92067d` üzerinde yeniden doğrulandı (Ölçüm A).

**Canlı veri ölçümlerinin doğrulanabilirliği.** Uygulamanın veritabanı şifreli (`sqlite3` ile açılmıyor: `file is not a database (26)`, Ölçüm C), yani aşağıdaki Ölçüm 2, 3, 4, 7 ve 8'in rakamları QA turunda **sınanamadı**. Yanlış oldukları iddia edilmiyor; "2026-11-24 ölçümü" olarak etiketlendiler ve **hiçbir test bu rakamlara bağlanmaz** (AC-17 ile AC-35 senaryoyla yazıldı, canlı kimlikler yalnız fikstürde temsil edilir). Kullanıcı o satırı elle silerse (R6) rakamlar yanlışlanır, kriterler yanlışlanmaz.

**Ölçüm 1, ibarenin tek koşulu.** "parça silinmiş ya da yok" metni `components/maliyet/ModelMaliyetleri.jsx:40`'ta, nedeni `lib/makinaStandartMaliyet.js:210`'da üretiliyor: kit satırının `partId`'si `parcaHaritasi(parts)` içinde bulunamazsa. Harita `String(p.id)` anahtarlı ve `deletedAt` taşıyanları süzüyor. İbare parçanın maliyetine bakmıyor; ekranda yazan ad da parçanın değil, kit satırının kendi `ad` kopyası.

**Ölçüm 2, kusurun canlı veride hâli (2026-11-24 ölçümü, doğrulanamadı).** Bildirilen parça kataloğda **canlı**: kimlik `1784817123366`, maliyeti bir malzeme kaleminden geliyor (mil, Ø70 × 155 mm). İki modelin kitinde o parçanın **ikişer satırı** var:

| Model | Kit | Satır 1 | Satır 2 |
|---|---|---|---|
| SWP140_DSC (standart) | 130 satır | `1793807177673`, adet 1 → kimlik yok | `1784817123366`, adet 1 → canlı |
| SWP140_DS (özel) | 119 satır | `1793807177673`, adet 1 → kimlik yok | `1784817123366`, adet 1 → canlı |

Yani maliyet ve sipariş bugün doğru hesaplanıyor; yetim satır yalnız ekranda duruyor ve eksik sayılıyor.

**Ölçüm 3, kapsamın büyüklüğü (2026-11-24 ölçümü, doğrulanamadı).** Bütün modellerin kitlerinde 2.317 satır var; yalnız **2'si** yetim (yukarıdaki iki satır, aynı parça). İkisinin de adı canlı katalogda birebir eşleşiyor ve ikisinin de kitte canlı kardeşi var, yani ikisi de R2'ye düşüyor: **bu işten sonra hiçbir rakam değişmez.** Adla da çözülemeyen (R4'e düşen) satır bugün **yok**.

**Ölçüm 4, ad eşleşmesinin güvenliği (2026-11-24 ölçümü, doğrulanamadı).** 435 canlı parçada aynı katlanmış ada inen iki kayıt **yok**, yani R1/3 dalı bugün hiç tetiklenmiyor. 2.317 kit satırının hiçbirinde `ad` kopyası boş değil (R1/4 de tetiklenmiyor). Kit satırlarının `partId` değeri **her zaman string** (2.317/2.317), karşılaştırmalar bugün de `String()` ile yapılıyor.

**Ölçüm 5, sipariş tarafı.** `lib/siparisIhtiyaci.js:280` kalemi `silinmis: !p` ile işaretliyor, `:302` ihtiyaç üretmeden geçiyor, `:354` kalemi `eksikParca` kümesine katıyor. Yani yetim satır sipariş penceresinin eksik parça sayacında da duruyor; ihtiyaç ve sipariş üretmiyor, tutara girmiyor.

**Ölçüm 6, kiti okuyan ve yazan yerler (Ölçüm U ile tamamlandı).** **Okuyanlar:** `makinaStandartMaliyet.js:207` (model maliyeti) ve `:224-225` (set kesişimi), `siparisIhtiyaci.js:294`, `stock/MakinaStokTab.jsx:61` ("Kiti Uygula"nın kaynağı), `urunAgaci.js:650` (`parcaKitAdetleri`, parça kartının adet satırı; kimlikle arıyor), `malzemeListesiAktarma.js:372` (**aktarmanın doğrulama turu** `dogrulamaTuru`; kimlikle arıyor), `ModelsManager.jsx:77` (forma açma) ve `:273-300` (kartın kit düzenlemesi). **Yazanlar:** `urunAgaci.js:669-685` (`kitleriGuncelle`, tek yazma yolu), `ModelsManager.jsx:88, 94` (doğrulama ve kayıt), `malzemeListesiAktarma.js:360` (`kitleriUygula`). R6 ve X4 kararı yazma yollarının dokunulmadığına dayanır, bu yüzden liste ikiye ayrıldı. `makinaStandartMaliyet.js` ve `siparisIhtiyaci.js` ikisi de `urunAgaci.js`'i içe alıyor, yani kural oraya konabilir ve içe alma döngüsü doğmaz (Ölçüm B).

**Ölçüm 7, kaynağı kanıtlayamıyorum (2026-11-24 ölçümü, doğrulanamadı).** Ölü kimlik `1793807177673` `Date.now()` tabanlı ve 04.11.2026 15:46'ya denk geliyor; canlı kayıt `1784817123366` 23.07.2026'ya. Parça kimliği üç yolda da `Date.now()` ile üretiliyor (parça kartı `PartManager.jsx:384`, Excel içe aktarma `SettingsImport.jsx:180`, malzeme listesinden aktarma), yani hangi yoldan geldiği kimlikten ayırt edilemiyor. **Parça kataloğu ekleme, düzenleme ve silmeyi işlem geçmişine hiç yazmıyor** (`PartManager.jsx` ve `hooks/useSimpleDefList.js`'te tek `logAction` çağrısı yok), işlem geçmişinde o kimliğe ve o ada dair hiçbir kayıt yok. Çöp kutusu boş, yani o kayıt kalıcı silinmiş. Bu yüzden kusurun nasıl doğduğunu kullanıcının anlatımının ötesinde ölçemiyorum.

**Ölçüm 8, elle temizlik yolu (2026-11-24 ölçümü; kaynak kısmı doğrulandı, canlı veri kısmı doğrulanamadı).** Model kartının kit listesi satırı `row.ad` ile çiziyor ve her satırın yanında çöp düğmesi var (`ModelsManager.jsx:281-293`), yani yetim satır oradan silinebiliyor. Kartın parça seçicisi ise model işaretiyle süzülü (`parts.filter(p => p.models?.includes(mForm.model))`, `:272`); bildirilen parçanın `models` alanı `["SWP140_DSC","SWP140_DS"]` taşıyor, yani o parça seçicide görünüyor ve gerekirse elle yeniden eklenebiliyor.

**Ölçüm 9, kusurun doğduğu karar.** Spec 0123 kalıcı silmede yalnız **sette bileşen** olan parçayı koruyor (`setteGecenParcaMi`, `SettingsTrash.jsx:183,321`, `App.jsx:1126`); **model kitinde** geçen parça kalıcı silinebiliyor, yalnız silme onayında sayılıyor. Hiçbir yol kit satırını silinen parçadan temizlemiyor ya da yeniden bağlamıyor. Bu bilinçli bir karardı; bu iş onu ters çevirmiyor, sonucunu okuma anında kapatıyor.


### QA turunda ölçülenler (2026-11-25)

Kaynak ölçümleri HEAD `4f92067d` üzerinde yapıldı.

| | Ölçüm | Sonuç |
|---|---|---|
| **A** | Spec'in bütün satır atıfları | `ModelMaliyetleri.jsx:40`, `makinaStandartMaliyet.js:210` ve `:201`, `siparisIhtiyaci.js:280`, `:302`, `:354`, `:294`, `MakinaStokTab.jsx:61`, `urunAgaci.js:650`, `malzemeListesiAktarma.js:372`, `ModelsManager.jsx:273-300`: **hepsi doğru** |
| **B** | İçe alma zinciri ve döngü riski | `makinaStandartMaliyet.js:15` ve `siparisIhtiyaci.js:13` `urunAgaci.js`'i içe alıyor; `utils.js` `urunAgaci`'yı hiç okumuyor, yani `trLower` güvenle eklenir |
| **C** | Canlı veritabanı okunabilirliği | Şifreli: `file is not a database (26)`. Ölçüm 2, 3, 4, 7 ve 8'in rakamları doğrulanamadı |
| **D** | "Kiti Uygula"nın yazdığı satırın şekli | `MakinaStokTab.jsx:327` yalnız `partId` ve `miktar` yazıyor; **ad kopyası yok** |
| **E** | Stok düşümünün kaynağı | `deductParts(form.parcalar, nid)`: düşüm kayıtlı kopyadan yapılıyor, modelin kitinden değil |
| **F** | Ölü kimlikli satırın düşümü | `stokKirparakDus` eldeki stoğu sıfır görüyor (`utils.js:918-930`), düşüm ve hareket satırı doğmuyor. AC-16 bugün de doğru |
| **G** | Stok formunda ölü kimliğin görünümü | `MakinaStokTab.jsx:355-357` yedek seçenek adı bulamayınca soru işareti yazıyor; satır ekranda adsız görünüyor |
| **H** | Kitin kimlik kümesi | `makinaStandartMaliyet.js:224` ve `siparisIhtiyaci.js:296`: ham kimliklerden kuruluyor |
| **I** | Adedi geçersiz satırın iki motordaki hâli | `makinaStandartMaliyet.js:209` adedi sıfır satırı çiziyor; `siparisIhtiyaci.js:299` o satır için hiç kalem açmıyor |
| **J** | Kit adedi doğrulaması | `urunAgaci.js:593-598` sıfırı ve geçersiz metni reddediyor, yani adedi sıfır satır yalnız eski veri ve içe aktarma yoluyla doğabilir |
| **K** | `modelMaliyeti`'nin imzası ve çağıranları | Beş parametre; `tests/dis-islem-kalkar-0138.test.js:205` çağrıların en çok beş argüman almasını iddia ediyor; dört test dosyası fonksiyonu doğrudan çağırıyor |
| **L** | Sipariş motorunun iki kataloğu | `canliParca` (`:266`) ve çöptekileri de taşıyan `hamParca` (`:267`); silinmiş kalemin adı ham diziden okunuyor (`:280`) |
| **M** | Yetim satırın sipariş penceresinde çizilmesi | `siparisIhtiyaci.js:519` `if (k.silinmis) continue;` ve `siparisRaporu.js:78`: **bugün hiç çizilmiyor** |
| **N** | Eksik sayacının metni | `SiparisPenceresi.jsx:36`: "bilgisi eksik (ölçü, ağırlık ya da fiyat)"; silinmiş parça bu üç nedenin hiçbirine girmiyor |
| **O** | R3'ün sipariş tarafındaki türevleri | `siparisIhtiyaci.js:443-446`: canlı kalem sayısı, `hazirSayi`, `stokUyarisi` ölçütü, tedarikçi bölümlemesi ve tedarikçi seçicisi listesi |
| **P** | Donmuş partide eksik rozeti | `PartiHesabi.jsx:124` rozeti `eksikSayisi`'ndan çiziyor; donmuş makinada değer kapanış görüntüsünden (`makinaStandartMaliyet.js:472, 480`) |
| **Q** | Model Maliyetleri'nin üst ibaresi | `ModelMaliyetleri.jsx:108` "N parçanın maliyeti yok" yazıyor, ama sayı `parcaYok` nedenli satırları da kapsıyor |
| **R** | Parti hesabı satır gruplaması | `makinaStandartMaliyet.js:394` anahtara eksik sayısını da koyuyor; yetim satır model düzeyinde olduğu için gruplama bozulmuyor, donmuş ve canlı satır zaten ayrı grupta |
| **S** | Kimliğin türü | `uid()` sayı üretiyor, `kitleriGuncelle` (`urunAgaci.js:679`) kite `String(partId)` yazıyor, bütün karşılaştırmalar `String()` ile |
| **T** | Katlama fonksiyonları | `utils.js:150` `trLower`, `:156` `aramaNormalize`; ayrımı kaynakta yorumla da yazılı |
| **U** | Kiti okuyan ve yazan yerlerin tam listesi | `grep defaultParcalar src/`: Ölçüm 6'nın listesinde üç yazma yolu eksikti (`kitleriGuncelle`, `ModelsManager` kaydı, `kitleriUygula`) |
| **V** | `stock.parcalar`'ın kalıcılığı | `electron/db.cjs:166, 495, 941, 943`: JSON sütun, dört nokta kuralıyla kalıcı; "Kiti Uygula"nın sonucu kayda gidiyor |
| **W** | Ekranların katalog kaynağı | `App.jsx:1764` `parts={liveParts}`, `Stock.jsx:69` onu iletiyor: stok ekranı canlı katalogla çalışıyor |
| **X** | Motor çıktısının kıyas altınları | `modelMaliyeti` ve `siparisIhtiyaci` çıktısı 0135, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0150, 0157, 0158 ve 0159 kıyaslarında donmuş |

### QA turunda verilen kararlar (2026-11-25)

Hepsi Takım Yöneticisi tarafından 2026-11-25'te onaylandı.

**Bloklayıcı**

1. **Stok kolunda ad eşleşmesi imkânsız, kural yalnız "Kiti Uygula"da çalışır.** R5 daraltıldı, R5/2, R5/3 ve R5/4 eklendi, AC-16 yeniden yazıldı, X10 açıldı. — *neden:* ad kopyası kitin dışında yaşamıyor (Ölçüm D), düşüm anında çözüm yazılamaz; daraltma C3'ü de korur çünkü yazılan şey yeni bir stok kaydıdır.
2. **Kitin kimlik kümesi çözülmüş kimliklerden kurulur.** R3/2 eklendi, R9 genişletildi, AC-23'e ikinci kriter geldi. — *neden:* aksi hâlde kitte canlı bir set ile o setin bileşenini gösteren kardeşsiz yetim satır bulunduğunda kesişim uyarısı sessizce kaçar ve iki motorun listesi ayrışır (Ölçüm H).
3. **Kardeş ölçütü ham satırın varlığıdır, adedine bakılmaz.** R2/4 eklendi. — *neden:* ölçütü adede bağlamak iki motorun düşürdüğü satır kümesini ayırır (Ölçüm I) ve tek kaynak kuralını kırar; bedeli bugün veride olmayan bir sınır durumudur (Ölçüm J).
4. **Ad haritası parametre olarak eklenmez, çözücü iki parçalıdır.** C1 yeniden yazıldı, C1/2 eklendi. — *neden:* var olan bir tarama `modelMaliyeti` çağrılarını beş argümanla sınırlıyor (Ölçüm K); bu şekil hem C5'i hem 0138'i korur.

**Önemli**

5. **Ad eşleşmesi yalnız canlı katalogda aranır.** R1/6 eklendi, AC-3 düzeltildi. — *neden:* çöpteki parçanın maliyetinin eksik sayılması bilinçli bir karar; adı üzerinden onu geri getirmek o kararı sessizce ters çevirir (Ölçüm L).
6. **Aynı parçaya çözülen iki yetim satırda ilki kalır.** R2 genelleştirildi, R2/5 eklendi. — *neden:* rakamı bozmamak bu işin ana vaadi; belirsiz bırakılırsa iki ölü kimlik aynı parçayı ikiye katlar ve sonuç bugünkünden daha yanlış olur.
7. **Donmuş partide "eksik" rozeti kalır.** R8/2 eklendi, Intent daraltıldı, kendi kriteri yazıldı. — *neden:* rozet kapanış görüntüsünden okunuyor (Ölçüm P) ve R8 onu dokunmuyor; Intent'in "hiçbir ekranda" vaadi donmuş parti için karşılanamaz.
8. **Sipariş kolunda tek görünür etki sayaçtır.** C7 eklendi, AC-14 ölçülebilir hâle getirildi. — *neden:* yetim satır bugün de hiç çizilmiyor (Ölçüm M), yani kanıt ekranı tek satırlık farkı bekler ve sıfır fark "ekran çekilmemiş" demek değildir.
9. **R3 hâlinde toplamlar değişir ve bu beklenir.** R7'ye "R2 hâlinde" kaydı yazıldı, R7/2 eklendi. — *neden:* beş türev birlikte değişiyor (Ölçüm O); kıyas testi hangi alanın değişmesinin beklendiğini bilmeden yazılamaz.
10. **Stok formunda yetim satırın adsız görünmesi ölçüme ve kritere girdi.** Ölçüm G yazıldı, AC-16'ya bağlandı. — *neden:* stok kolundaki en doğrudan görünür semptom bu ve ölçülmeyen bir semptom kabul kriterine de giremez.
11. **Kimlik karşılaştırmalarının `String()` ile yapılacağı yazıldı.** R1 genişletildi. — *neden:* kataloğun kimliği sayı, kitin kopyası string (Ölçüm S); tek karakterlik eksiklik sessiz çift sayıma yol açar ve R7'nin koruduğu tek şeyi bozar.
12. **Model Maliyetleri'nin üst ibaresinin metni kapsam dışına yazıldı.** X9 açıldı. — *neden:* sayı `parcaYok` satırlarını da kapsıyor (Ölçüm Q); metni değiştirmek 0088 ve 0091'in ekran testlerini ve kanıt ekranlarını etkiler.
13. **Kıyas kanıtı yeni altın değil, var olan on iki altının dokunulmadan yeşil kalmasıdır.** C4 ve AC-34 yeniden yazıldı, AC-35 kendi fikstürüne bağlandı. — *neden:* on iki altını yenilemek bu işin en büyük riski olurdu (Ölçüm X); var olanların yeşil kalması daha güçlü bir birebirlik kanıtıdır.
14. **Canlı veri rakamları etiketlendi ve hiçbir teste bağlanmadı.** Context'e doğrulanabilirlik notu, AC-17 ve AC-35 senaryoyla yazıldı. — *neden:* veritabanı şifreli (Ölçüm C); canlı kimliğe bağlı bir kriter kullanıcı o satırı silince yanlışlanır.

**Küçük**

15. **`trLower` ve `aramaNormalize`'a satır atfı verildi.** R1/2 güncellendi. — *neden:* 0162'nin emsali; geliştirici doğru fonksiyonu aramakla vakit kaybetmez.
16. **Ölçüm 6 okuyan ve yazan diye ikiye ayrıldı.** — *neden:* R6 ve X4 kararı yazma yollarının dokunulmadığına dayanıyor, listede görünmeyen yolun dokunulmadığı iddia edilemez (Ölçüm U).
17. **`malzemeListesiAktarma.js:372` atfının adı düzeltildi.** — *neden:* o satır `dogrulamaTuru` fonksiyonunun içinde; AC-27 yanlış adla yanlış fonksiyonu korur.
18. **AC-5'in örneği netleştirildi.** — *neden:* `trLower` zaten `I` harfini `ı`ya çeviriyor, eski örnek hangi dönüşümün yasaklandığını karıştırıyordu.
19. **İç boşluğun normalleştirilmediği yazıldı.** R1/2 güncellendi. — *neden:* yazılmazsa geliştirici iyi niyetle `\s+` katlaması ekler ve kural iki kopyaya ayrılır.
20. **Kimliği boş kit satırının R4'e düştüğü yazıldı.** R1 genişletildi. — *neden:* tek satırlık netlik R4'ün kapsamını tam yapar.
21. **Etkilenen alanlar satırına iki ekran eklendi.** — *neden:* DoD ikisinin de kanıt ekranını istiyor.
22. **Bağımlı spec'lere 0140, 0144 ve 0161 eklendi.** — *neden:* sipariş penceresinin bugünkü şekli o üç spec'ten geliyor ve AC-14 ile AC-15 onların çıktısına dokunuyor.
23. **AC-33'e emsal dosya adı yazıldı.** — *neden:* "casus ya da çağrı sayımı" ifadesi tek başına yönlendirmiyor; emsaller `maliyet-gecmisi-0097-cagri`, `gider-kapsami-0092-cagri` ve `dis-islem-0137-cagri`.
24. **Model kartının seçicisinin ikinci satırı önlemediği X6'ya yazıldı.** — *neden:* kusurun doğuş yolu bu olabilir; engellemek ayrı iş ama spec'in bunu bildiği yazılı olmalı.
25. **DoD'un sürüm notu maddesine gerekçe eklendi.** — *neden:* "Kiti Uygula"nın yazdığı liste değişiyor, yani güncellenmemiş bir bilgisayarın uyguladığı kit farklı olur; fark yalnız kullanıcı farkıdır, veri uyumsuzluğu değildir.

### QA turu karar kaydı (2026-11-25)

| | Bulgu | Derece | İşlendiği yer |
|---|---|---|---|
| **1** | Stok kolunda ad eşleşmesi imkânsız | Bloklayıcı | R5, R5/2, R5/3, R5/4, X10, AC-16, AC-36 |
| **2** | Kimlik kümesi ham kimlikten kuruluyor | Bloklayıcı | R3/2, R9, AC-23, AC-37 |
| **3** | Kardeş ölçütü tanımsız | Bloklayıcı | R2/4, AC-38 |
| **4** | Ad haritasının geçiş yolu | Bloklayıcı | C1, C1/2, AC-39 |
| **5** | Ad eşleşmesinin kataloğu | Önemli | R1/6, AC-3, AC-40 |
| **6** | İki yetim satır aynı parçaya çözülürse | Önemli | R2, R2/5, AC-41 |
| **7** | Donmuş partide eksik rozeti | Önemli | Intent, R8/2, AC-42 |
| **8** | Sipariş kolunda tek etki sayaç | Önemli | C7, AC-14, AC-43 |
| **9** | R3'ün sipariş türevleri | Önemli | R7, R7/2, AC-44 |
| **10** | Stok formunda adsız satır | Önemli | Ölçüm G, AC-16, AC-45 |
| **11** | `String()` karşılaştırması | Önemli | R1, AC-46 |
| **12** | Üst ibarenin metni | Önemli | X9 |
| **13** | Kıyas kanıtının şekli | Önemli | C4, AC-34, AC-35 |
| **14** | Canlı rakamların doğrulanabilirliği | Önemli | Context, AC-17, AC-35 |
| **15** | Katlama fonksiyonlarının satırları | Küçük | R1/2 |
| **16** | Ölçüm 6'nın eksik listesi | Küçük | Ölçüm 6 |
| **17** | Aktarma atfının adı | Küçük | Ölçüm 6, AC-27 |
| **18** | AC-5'in örneği | Küçük | AC-5 |
| **19** | İç boşluk normalleştirilmez | Küçük | R1/2 |
| **20** | Kimliği boş kit satırı | Küçük | R1 |
| **21** | Etkilenen alanlar satırı | Küçük | Başlık tablosu |
| **22** | Eksik bağımlı spec'ler | Küçük | Başlık tablosu |
| **23** | AC-33'ün emsali | Küçük | AC-33 |
| **24** | Kartın seçicisi ikinci satırı önlemiyor | Küçük | X6 |
| **25** | Sürüm notunun gerekçesi | Küçük | Definition of Done |

### Plan turunda verilen kararlar (2026-11-25)

Hepsi Takım Yöneticisi tarafından 2026-11-25'te onaylandı.

- **P1 (çözücünün `modelMaliyeti`'ne ulaşması).** `kitCozucuKur(partMap)` sonucu `WeakMap` ile katalog haritası nesnesine bağlanıp önbelleğe alınır; `modelMaliyeti` içeride `kitCozucuKur(partMap)` çağırır. — *neden:* imza beş parametrede kalır (C1/2, AC-39), aynı harita için ad haritası ikinci kez kurulmaz (C5), donmuş partide harita kurulmadığı için çözücü de kurulmaz (0136 AC-19).
- **P2 (çıktıdaki `partId`).** Kimlikle çözülen satır ham `r.partId`'yi aynen taşır; ada göre çözülen satır çözülen kimliği `String(p.id)` olarak taşır. `hamPartId` yalnız çözücünün iç çıktısındadır, motor çıktısına yazılmaz. — *neden:* yetimsiz veride çıktı bayt bayt aynı kalır (C4, AC-34); yeni anahtar on iki altını kırardı.
- **P3 (sıra).** İki geçiş: önce kimlikle çözülen kimlikler toplanır; ada göre çözülen satır kitteki sırası ne olursa olsun o kümede varsa düşer; ada göre çözülenler arasında ilki kalır (R2/5). — *neden:* canlı satır her zaman gerçek bağdır; sıraya bağlansaydı aynı veri kitin sırasına göre farklı satırı düşürürdü.
- **P4 (adedi sıfır kardeş).** Kardeş ölçütü çözücüde adede bakmadan uygulanır (R2/4); sipariş motorunun `miktar > 0` atlaması çözücüden sonra aynen kalır. — *neden:* iki motorun düşürdüğü satır kümesi aynı kalır.
- **P5 ("Kiti Uygula"nın kataloğu).** Çözücü formun aldığı `parts` (canlı katalog, Ölçüm W) ile `useMemo` içinde bir kez kurulur. — *neden:* R1/6.
- **P6 (AC-33'ün ölçümü).** `Map`'ten türeyip `values()` çağrılarını sayan katalog haritasıyla ölçülür: N modelli hesapta ad haritası bir kez kurulur. — *neden:* getter casusu, motor gösterim için `p.ad`'ı ayrıca okuduğu için kurulumu ayırt etmez.
- **P7 (görsel kanıt).** Üç yeni ekran: Model Maliyetleri (yetimli kit), sipariş penceresi (yalnız `siparis-eksik` farklı), stok formunda "Kiti Uygula" sonrası. Var olan ekranlar 0 piksel beklenir, yeniler `beklenen: "degisti"` + onay.
- **P8 (sürüm notu).** Gerekmez (yeni alan, izin, bölüm, sunucu kuralı, göç yok); "Kiti Uygula"nın farkı yalnız kullanıcı farkıdır.
- **P9 (uygulamada, AC-34'ten sapma).** Ölçüm X'in "on iki kıyasın verisi yetimsiz" varsayımı 0138 kıyasında yanlış çıktı: o test 0097'nin OZ kitini (kimlik "1", ad "Rulman") 0135 kataloğuyla birleştiriyor, katalogda 1 yok ama 74 numaralı "Rulman" var; yani veride kazara kardeşsiz bir yetim satır duruyordu ve kural onu doğru biçimde bağlıyordu (parti bölümünde OZ: eksik 1 → 0, direkt 0 → 80 TL). Takım Yöneticisi 2026-11-25'te test verisinin düzeltilmesini seçti: 0138 kıyasında satırın ad kopyası katalogda eşi olmayan bir ada çevrildi, satır spec öncesindeki gibi yetim kalır, altın değişmez ve ayıklama eklenmez. Bağlanmanın kendisi 0163 testinde sabitlendi. Öteki on bir kıyas dokunulmadan yeşil. — *neden:* test dış işlemin testidir, yetim satır orada kazaraydı; altını yenilemek C4'ün yasakladığı yoldur.

---

## Constraints

- **C1.** Karar **tek yerdedir** ve `lib/urunAgaci.js`'te durur (kit yazma yolunun zaten bulunduğu dosya; iki motor da onu içe alıyor, Ölçüm U; `utils` `urunAgaci`'yı içe almadığı için `trLower` güvenle eklenir, Ölçüm B). Tüketiciler kit satırının parçasını oradan çözer; ikinci bir ad eşleştirme kopyası yazılmaz (kaynak taraması).
- **C1/2.** Çözücü **iki parçalıdır**: `kitCozucuKur(partMap)` tüketici başına **bir kez** çağrılır ve ad haritasını kataloğun değerlerinden tek geçişte kurar; döndürdüğü `(kitSatirlari) => çözülmüş satırlar` fonksiyonu model başına koşar. Ad haritası `modelMaliyeti`'ne **parametre olarak eklenmez**: `tests/dis-islem-kalkar-0138.test.js:205` o fonksiyonun çağrılarının en çok beş argüman almasını iddia ediyor (Ölçüm K) ve altıncı parametre o kriteri ters çevirmek zorunda bırakır. Bu şekil hem C5'i hem 0138'i korur, `tarihliDirekt`'in tembel `partMap`'ini (`makinaStandartMaliyet.js:308-311`) de tek kurulumda bırakır, yani 0136 AC-19'un "tamamen donmuş partide parça motoru çağrılmaz" ölçümü bozulmaz.
- **C2.** Ekranlar karar yazmaz: Model Maliyetleri, sipariş penceresi ve `MakinaStokTab` satırı yok sayma ya da ad eşleştirme ölçütü yazmaz, motorun çıktısını çizer.
- **C3.** Yeni kalıcı alan, yeni izin, yeni veri bölümü, yeni sunucu kuralı ve göç **yok**. Hiçbir kayıt değişmez.
- **C4.** Kıyas: yetim satırı olmayan veride motorların bütün çıktıları spec öncesiyle **birebir** aynıdır. Kanıt **yeni bir altın değil**, var olanların dokunulmadan yeşil kalmasıdır: `modelMaliyeti` ve `siparisIhtiyaci` çıktıları hâlihazırda 0135, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0150, 0157, 0158 ve 0159 kıyaslarında donmuş durumda (Ölçüm X) ve hiçbirine ayıklama eklenmez. On iki altını yenilemek bu işin en büyük riski ve en zayıf kanıtı olurdu.
- **C5.** Eşleşme için katalog haritası tüketici başına **bir kez** kurulur; satır başına katalog gezilmez (2.317 satır × 435 parça taranmaz).
- **C6.** Kural, kimliği çözülen satırın davranışına dokunmaz: 0087'nin ad kopyası taşıma zinciri, 0134'ün ondalık adedi ve 0121'in set patlatması aynen kalır.
- **C7.** Sipariş penceresinde yetim satır **bugün de hiç çizilmiyor** (`siparisIhtiyaci.js:519` `if (k.silinmis) continue;`, `siparisRaporu.basilacakBolumler` de onu görmez, Ölçüm M), yani sipariş kolunda bu işin tek görünür etkisi `siparis-eksik` sayacıdır. Kanıt ekranı bu tek satırlık farkı bekler; sıfır piksel fark "ekran çekilmemiş" demek değildir.

---

## KAPSAM DIŞI

- **X1.** Yetim satırların veriden silinmesi (göç ya da kayıt anında temizlik) — *neden:* Takım Yöneticisi 2026-11-25'te okuma anında yok saymayı seçti; göç geri alınamaz ve bugün yalnız iki satır için yazılacaktı.
- **X2.** Kitte geçen parçanın kalıcı silinmesinin engellenmesi — *neden:* 0123'ün bilinçli kararı; bu iş sonucu kapatıyor, kararı ters çevirmiyor.
- **X3.** Parça kataloğu düzenlemelerinin işlem geçmişine yazılması — *neden:* ayrı bir bulgu (Ölçüm 7), kendi işi olmalı; bu işin çıktısını etkilemiyor.
- **X4.** Yetim satırın model kartının kit listesinde de gizlenmesi — *neden:* R6; veriden temizlik yapılmadığı için elle silme yolu kalmalı.
- **X5.** Model kartındaki parça seçicisinin model işaretiyle süzülmesi — *neden:* ayrı konu, bu kusurla ilgisi yok (Ölçüm 8).
- **X6.** Aynı parçanın kitte **kimlikle çözülen** iki satırı bulunması — *neden:* bugünkü davranış (ikisi de sayılır); 0121'in set kesişim uyarısı emsalinde olduğu gibi bilgi verilir, hesap değişmez. Model kartının parça seçicisi de bu ikinci satırı önlemiyor (`ModelsManager.jsx:273` "zaten var" denetimini yalnız kimlikle yapar, Ölçüm U), yani kullanıcı aynı adda canlı parçayı ikinci kez ekleyip kitte bir ölü bir canlı satır bırakabilir; kusurun doğuş yolu da bu olabilir ve engellenmesi ayrı iştir.
- **X7.** Kullanıcıya "şu modelin kitinde yetim satır var" diyen bir denetim aracı ya da bildirim — *neden:* bugün iki satır var ve ikisi de sessizce yok sayılacak; araç ayrı iş.
- **X8.** Sipariş penceresinin eksik sayacı metninin düzeltilmesi (`SiparisPenceresi.jsx:36` "N parçanın ve M malzemenin bilgisi eksik (ölçü, ağırlık ya da fiyat)") — *neden:* silinmiş parça o parantezdeki üç nedenin hiçbirine girmiyor, yani metin bugün de yanlış (Ölçüm N); bu iş sayıyı düzeltir, metni düzeltmek ayrı iştir.
- **X9.** Model Maliyetleri'nin üst ibare metninin düzeltilmesi (`ModelMaliyetleri.jsx:108` "eksik · N parçanın maliyeti yok") — *neden:* `eksikSayisi` `parcaYok` nedenli satırları da sayıyor (Ölçüm Q), yani R4'e düşen satır için metin yanlış kalır; değiştirmek 0088 ve 0091'in ekran testlerini ve kanıt ekranlarını etkiler, bu işin kapsamını gereksiz genişletir.
- **X10.** Bugün kayıtlı stok satırlarının `parcalar` kopyasındaki ölü kimliklerin çözülmesi ya da temizlenmesi — *neden:* o satırlar parçanın adını hiç taşımıyor, çözüm yazılamaz (R5/2); bugünkü hâlleri zararsız (R5/4) ve temizlik bir göç olurdu (X1).

---

## Kabul kriterleri

**Çözüm kuralı**

- **AC-1.** Kit satırının `partId`'si canlı katalogda varsa satır o parçayla çözülür; ad eşleşmesi aranmaz.
- **AC-2.** Kimliği canlı katalogda bulunmayan satır, ad kopyası canlı katalogdaki tek bir parçayla birebir eşleşiyorsa o parçayla çözülür.
- **AC-3.** Çöpteki parçanın kimliğini taşıyan satır "kimliği çözülmedi" sayılır ve ad eşleşmesine düşer; eşleşme yalnız canlı katalogda arandığı için (R1/6) aynı adda canlı bir parça yoksa satır R4'e düşer.
- **AC-4.** Eşleşme kırpma + `trLower` ile yapılır: "  Rulman Yatağı " ile "RULMAN YATAĞI" eşleşir.
- **AC-5.** Aksan katlaması yapılmaz: "Şaft" adlı kit satırı "Saft" adlı parçayla eşleşmez (tek harfte, `trLower`'ın kendi `I` dönüşümünün karıştırmadığı bir çiftle ölçülür).
- **AC-6.** Kısmi eşleşme yapılmaz: "Rulman" adlı yetim satır "Rulman 6204" parçasıyla eşleşmez.
- **AC-7.** `adEN` ve `kod` eşleşmeye girmez: adı "Bearing" olan yetim satır, `adEN`'i "Bearing" olan parçayla eşleşmez.
- **AC-8.** Aynı katlanmış ada inen iki canlı parça varsa eşleşme yapılmaz ve satır R4'e düşer.
- **AC-9.** Ad kopyası boş ya da yalnız boşluk olan yetim satır R4'e düşer.

**Yinelenen satırın düşmesi**

- **AC-10.** Ada göre çözülen parçanın kimliğiyle aynı kitte başka satır varsa yetim satır Model Maliyetleri'nin kit listesinde **çizilmez**.
- **AC-11.** O satır modelin eksik sayısına girmez.
- **AC-12.** O satırın adedi direkt maliyete girmez: modelin direkt maliyeti, toplam maliyeti ve öneri fiyatı yetim satır hiç yokmuş gibidir.
- **AC-13.** Kardeş satırın adedi değişmez (yok sayılanla toplanmaz).
- **AC-14.** Sipariş ihtiyacında o satır kalem üretmez (bugün de üretmiyordu, C7) ve eksik parça sayacına girmez: `sonuc.eksik.parca` yetim satır başına **tam olarak bir** azalır, başka hiçbir satır, adet ve tutar değişmez.
- **AC-15.** Sipariş ihtiyacında kardeş satırın ihtiyacı, stoğu ve sipariş adedi birebir bugünküdür.
- **AC-16.** "Kiti Uygula" düğmesinin doldurduğu listede o satır **hiç yoktur** (adsız, soru işaretli satır kalmaz) ve kardeş satır bugünkü gibi girer; `deductParts` ile kayıtlı `stock[].parcalar` dokunulmaz (R5/2).
- **AC-17.** Canlı veri senaryosu (Ölçüm 2'nin şekli, canlı kimliklere bağlanmadan): iki modelin kitinde aynı parçanın ikişer satırı var, birinin kimliği ölü. Yetim satırlar çizilmez, iki modelin direkt maliyeti ve sipariş adetleri spec öncesiyle birebir aynıdır. Kimlikler ve model adları fikstürde temsil edilir; kriter canlı veritabanının rakamlarına bağlanmaz.

**Kardeşi olmayan yetim satır**

- **AC-18.** Ada göre çözülen ve kitte kardeşi olmayan satır çözülen parçanın birim maliyetiyle hesaplanır; satır "silinmiş ya da yok" ibaresi taşımaz ve eksik sayılmaz.
- **AC-19.** O satırın adedi korunur (satırın kendi `miktar` değeri, ondalık dahil).
- **AC-20.** Satırın adı çözülen katalog kaydının adıdır.
- **AC-21.** Sipariş ihtiyacında o satır çözülen parçanın ihtiyacını üretir; parça malzemeliyse kesitleri de ondan gelir.
- **AC-22.** Çözülen parçanın maliyeti girilmemişse satır bugünkü "maliyeti girilmedi" dalına düşer, "silinmiş ya da yok" demez.
- **AC-23.** Çözülen parça setse set patlatması ve kesişim uyarısı o parçaya göre çalışır (R3/2'nin çözülmüş kimlik kümesiyle).

**Çözülemeyen satır ve değişmeyenler**

- **AC-24.** Ne kimliği ne adı çözülen satır "parça silinmiş ya da yok" ibaresiyle çizilir, eksik sayılır ve maliyete 0 katkı verir.
- **AC-25.** Aynı satır sipariş tarafında bugünkü silinmiş kalem davranışını sürdürür.
- **AC-26.** Model kartının kit listesi yetim satırı adıyla çizmeye ve çöp düğmesiyle silmeye devam eder (R6).
- **AC-27.** Parça kartının "Model · Adet" satırı (`urunAgaci.js:650` `parcaKitAdetleri`) ve malzeme listesinden aktarmanın **doğrulama turu** (`malzemeListesiAktarma.js:372` `dogrulamaTuru`) değişmez; ikisi de kimlikle arar ve ad eşleşmesi görmez.
- **AC-28.** Donmuş üretim partisinin kaydedilmiş maliyeti değişmez.
- **AC-29.** Analiz, aylık rapor, Finans, servis ve yazdırma çıktıları değişmez.
- **AC-30.** Hiçbir kayıt yazılmaz: senaryo boyunca model dizileri ve parça kataloğu birebir aynı kalır.

**Tek kaynak ve ölçüm**

- **AC-31.** Kaynak taraması: kit satırının parçasını çözen ikinci bir kopya (kimlik haritasında arayıp ada düşen ikinci bir ifade) `src` altında yoktur.
- **AC-32.** Kaynak taraması: `components` altında kit satırı için ad eşleştirme ya da yok sayma ölçütü yazılmaz (C2).
- **AC-33.** Ölçüm: katalog ve ad haritası tüketici başına bir kez kurulur (casus ya da çağrı sayımıyla; emsaller `maliyet-gecmisi-0097-cagri`, `gider-kapsami-0092-cagri`, `dis-islem-0137-cagri`).
- **AC-34.** Kıyas: var olan sipariş ve maliyet kıyas testleri (0135, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0150, 0157, 0158, 0159) **dokunulmadan ve ayıklama eklenmeden** yeşil kalır; hiçbir altın yenilenmez.
- **AC-35.** Kıyas: yetim satırlı **kendi fikstüründe** (iki model, bir ölü kimlik, bir kardeş) yalnız eksik sayısı ve çizilen satır kümesi değişir, para ve adet alanları değişmez.


**QA turu kriterleri (2026-11-25)**

- **AC-36.** "Kiti Uygula" sonrası formda R2 ile yok sayılan satır yoktur, R3 ile çözülen satır **çözülen** kimlikle vardır, ve düğmenin "(N parça)" sayısı çözülmüş kümeyi yazar (R5/2, R5/3).
- **AC-37.** Kitte canlı bir set ile o setin bileşenine ada göre çözülen kardeşsiz bir yetim satır varsa kesişim uyarısı **çıkar** (kimlik kümesi çözülmüş kimliklerden kurulduğu için); R2 ile yok sayılan satırın kimliği kümeye girmez.
- **AC-38.** Adedi sıfır ya da geçersiz olan bir kardeş de yetim satırı düşürür; sipariş tarafında o parça listede görünmez ve eksik sayacına girmez (R2/4'ün bilinen sonucu).
- **AC-39.** Ölçüm: ad haritası `modelMaliyeti`'ne parametre olarak eklenmez; `tests/dis-islem-kalkar-0138.test.js:205` dokunulmadan yeşil kalır.
- **AC-40.** Çöpteki bir parçanın adıyla eşleşme yapılmaz: kimliği çöpteki parçayı gösteren ve aynı adda canlı karşılığı olmayan satır R4'e düşer, maliyeti eksik sayılır.
- **AC-41.** Aynı modelin kitinde aynı canlı parçaya çözülen iki yetim satır varsa yalnız **ilki** kalır; parça iki kez sayılmaz.
- **AC-42.** Donmuş üretim partisinin satırındaki "eksik" rozeti ve kayıtlı eksik sayısı değişmez; partiyi yeniden açıp kapatmak ikisini de yeniler.
- **AC-43.** Sipariş penceresinde yetim satırlı profilde değişen tek şey `siparis-eksik` satırıdır: hiçbir tedarikçi bölümü, hazır parça satırı, kesit, işlem satırı ve tutar değişmez.
- **AC-44.** R3 hâlinde beş türev beklendiği gibi değişir: canlı kalem sayısı, `hazirSayi`, `stokUyarisi` ölçütü, tedarikçi bölümlemesi ve tedarikçi seçicisi listesi (R7/2).
- **AC-45.** "Kiti Uygula" sonrası stok formunda R2 ile düşen ölü kardeş satırı (soru işaretiyle çizilen) kalmaz; ne kimliği ne adı çözülen R4 satırı bugünkü gibi listeye girer ve "?" ile çizilir (R4, R5/2; triyaj 2026-11-25 ile daraltıldı).
- **AC-46.** Kimlik karşılaştırması `String()` ile yapılır: kitte sayı olarak duran kimlik de kardeş sayılır ve çift sayım doğmaz.

---

## Definition of Done

- [ ] Bütün kabul kriterleri karşılandı.
- [ ] `npm test` ve `npm run lint` yeşil (lint hata sayısı sıfır).
- [ ] Kural tek yerde (C1) ve çözücü iki parçalı (C1/2); kaynak taramaları (AC-31, AC-32) yazıldı.
- [ ] Yetim satırlı yeni fikstürün altını spec öncesi koddan üretildi (AC-35).
- [ ] Görsel kanıt: Model Maliyetleri, sipariş penceresi ve stok formunun "Kiti Uygula" hâli çekildi; değişen ekranlar `beklenen: "degisti"` + onay satırıyla kaydedildi. Sipariş penceresinde beklenen fark tek satırdır (C7).
- [ ] Var olan on iki sipariş ve maliyet kıyası dokunulmadan yeşil (AC-34); yalnız yetim satırlı yeni fikstür eklendi (AC-35).
- [ ] `tests/dis-islem-kalkar-0138.test.js` dokunulmadan yeşil (AC-39): `modelMaliyeti`'nin imzası büyümedi.
- [ ] Stok kolunun daraltılması yazılı doğrulandı: `deductParts` ve kayıtlı `stock[].parcalar` dokunulmadı (R5/2), mevcut kayıtların ölü kimlikleri X10'da açık bulgu olarak duruyor.
- [ ] Donmuş partilerde "eksik" rozetinin kaldığı (R8/2) ve iki ekran metninin (X8, X9) kapsam dışı olduğu plana yazıldı.
- [ ] Sürüm notu gerekmiyor (yeni alan, izin, veri bölümü, sunucu kuralı ve göç yok); plan bunu yazılı doğrular. "Kiti Uygula"nın yazdığı listenin değişmesi yalnız kullanıcı farkıdır, veri uyumsuzluğu değildir: iki hâl de geçerli bir stok kaydı üretir.

---

## SCORECARD

| | |
|---|---|
| **Uygulama** | — |
| **Testler** | — |
| **Kanıt** | — |
| **Kapanış** | — |
