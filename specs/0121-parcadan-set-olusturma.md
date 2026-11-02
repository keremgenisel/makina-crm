# 0121 — Parçalardan set oluşturma ve set hazırlama

| | |
|---|---|
| **Durum** | Uygulandı, kapanış bekliyor (plan `specs/0121-uygulama-plani.md`, plan turu 2026-11-02 Karar 38–51). Kökeni: Takım Yöneticisi'nin 2026-11-01 isteği ve aynı gün verdiği **beş** kararı; iç içe set yasağı, çöpteki bileşenin maliyeti eksik yapması ve yeni izin açılmaması analistin kararıdır. QA boşluk analizi 2026-11-02, 32 bulgu işlendi) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/PartManager.jsx` (parça kartına setin içeriği bölümü), `src/lib/urunAgaci.js` (içerik kuralları, doğrulama, maliyetin üçüncü kaynağı, metinler), yeni `src/lib/setUretimi.js` (set hazırlama ve geri alma, saf), `src/lib/stokHareketi.js` (dört yeni hareket tipi ve adları), `src/components/stock/PartStokTab.jsx` (satırda rozet ve "Set Hazırla" düğmesi, pencere), yeni `src/components/stock/SetHazirlaPenceresi.jsx`, `src/components/stock/StokHareketleriPenceresi.jsx` (geri alma düğmesi), `src/components/settings/SettingsAuditLog.jsx` (iki yeni eylemin etiketi), `src/lib/merge.js` (içerikteki parça kimliğinin yeniden eşlenmesi), `electron/db.cjs` (yeni JSON sütunu), `src/components/Settings.jsx` ve `src/components/Stock.jsx` (ham parça dizisinin iletilmesi, R6/2), `src/lib/parcaAktarma.js` ile `src/components/settings/SettingsExport.jsx` (setin maliyet hücresi, R12/2), `src/components/ServiceForm.jsx` ve `src/components/YedekParcaSatisForm.jsx` (seçimden sonraki içerik satırı, R26/2), `src/lib/kilitAlanlari.js` (pencerenin kilit alanı listesine girmesi, R29/2), `src/lib/makinaStandartMaliyet.js` (katalogla okuma ve kit kesişimi uyarısı, R9/2 ve R32/2); plan turuyla eklenen `src/App.jsx` (Stock'a ham parça dizisi, Karar 38) ve `src/components/maliyet/ModelMaliyetleri.jsx` (kesişim uyarısının ekranı, Karar 39). **Dokunulmayan iki dosya:** `src/components/ui.jsx` ve içindeki `SearchPick` (C10). **Test:** yeni `tests/set-icerigi-0121.test.js`, `tests/ui/set-icerigi-0121.test.jsx`, `tests/ui/set-uretimi-0121.test.jsx`, `tests/set-icerigi-0121-kiyas.test.js`; ek bloklar `merge`, `islem-gecmisi-etiketleri`, `db-roundtrip.cjs`, `db-clean-install.cjs`, `stok-hareketi` (iki kriterin genişletilmesi, R33), `kirilim-toplami-0099`, `maliyet-gecmisi-0097-cagri` (casusun bütün argümanları iletmesi, R33), `kilit-alanlari`, `ui/form-pencere-boyutu`. **Kanıt:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`. **Belge:** `CLAUDE.md`; `specs/README.md`'nin kuyruk satırı (`:31`), paragrafı (`:34`) ve tablo satırı (`:182`) **zaten yazılı**, kapanışta yalnız "(Tamamlandı)" düşer (ölçüm 31). Sunucu kuralları, izin tanımları, veri bölümleri ve yazdırma çıktıları dokunulmaz. |
| **Bağımlı spec'ler** | 0087 (parçanın alış maliyeti ve ürün ağacı adetleri), 0096 (hammadde kırılımı, maliyetin tek okuma yolu), 0097 (tarihli parça maliyeti), 0065 (stok hareketi motoru ve karşı hareketle geri alma), 0088 (model maliyetinin bu maliyeti okuması). |
| **Ters çevrilen kriterler** | **Üç kriter, hepsinin iddiası korunarak** (QA turu, ölçüm 15). **(1) 0099 AC-26'nın sayı sınırı:** `PartManager.jsx`'te `parcaMaliyetKurus(` çağrısı en çok 2 sayılıyor, setin maliyeti aynı okuma yolundan geldiği için artabilir; artarsa sınır "spec 0121 ile" yükseltilir, kriterin asıl iddiası (**PartManager toplama yapmaz:** `reduce(`, `+=` ve `kurus(` yok) aynen korunur ve canlı önizleme tek `formMaliyeti` sonucundan gelir (R2/3). **(2) 0065 AC-21** (`tests/stok-hareketi.test.js:157`) `IADE_TIPI` anahtarlarını dört değere **birebir** eşitliyor; iki yeni anahtarla genişletilir. **(3) 0065 AC-20** (`:284`) `stokEtkisi(` çağıran dosyaları beş dosyaya birebir eşitliyor; `setUretimi.js` eklenir. Ayrıca 0097 AC-52'nin casusu (`tests/maliyet-gecmisi-0097-cagri.test.js:10`) üçüncü argümanı yutuyor, `(...a)` ile iletir hâle getirilir; beklenen çağrı sayısı değişmez. 0065 AC-25'in pencere testi **kırılmaz** (satır sayısı ve metin eşleşmesi düğmeden etkilenmez, ölçüm 32), ama `StokHareketleriPenceresi.jsx:6-7` ile `PartStokTab.jsx:16`'nın "salt okunur, veri yazmaz" yorumları güncellenir. |

---

## Intent

Fabrika bugün bazı parçaları set olarak satıyor: ayna mahruti dişlisi takımı, tel mekanizma full set, şanzuman rulman seti gibi. Bu setler katalogda sıradan parça olarak duruyor, içlerinde ne olduğu hiçbir yerde yazmıyor. Sonucu iki yerde acıtıyor: setin maliyeti girilemiyor (on beş setin on dördünde maliyet boş, üçü bütün model kitlerinin içinde olduğu için makina maliyeti eksik hesaplanıyor) ve set hazırlanırken tezgâhtan çekilen parçalar stoktan düşmüyor. Takım Yöneticisi, parçaları seçerek set tanımlayabilmek ve hazırlanan seti stoğa alabilmek istiyor. Bu iş bittiğinde setin içeriği kayıtlıdır, maliyeti bileşenlerinden kendiliğinden gelir ve "Set Hazırla" dedikçe bileşenler stoktan düşüp setin stoğu artar; satış, servis ve teklif tarafında hiçbir şey değişmez.

---

## Requirements

### A. Setin içeriği

- **R1.** Parça kaydı, içinde hangi parçalardan kaçar adet olduğunu tutabilir. İçeriği olan parça **settir**, içeriği boş olan parça bugünkü sıradan parçadır.
- **R1/2.** Set ayrı bir kayıt türü, ayrı bir liste ya da ayrı bir sekme **değildir**: katalogdaki parçanın kendisidir. Servis formu, yedek parça satışı, Evrak teklifi, model kiti, Analiz ve dışa aktarma seti bugünkü gibi tek parça olarak görür.
- **R1/3.** Alanın adı **`parts[].setIcerigi`**, satırı **`{ partId, miktar }`** (adet alanının adı model kitiyle aynı, Context), sütunu `setIcerigi TEXT`'tir. Dört yeni hareket tipi: bileşen düşümü `set_uretimi` ve iadesi `set_uretimi_iade`, setin kendi girişi `set_girisi` ve karşıtı `set_girisi_iptal`; okunur adları sırasıyla "Set hazırlandı (bileşen düşümü)", "Set hazırlama geri alındı (bileşen)", "Set hazırlandı", "Set hazırlama geri alındı". `icerik` ve `bilesenler` adları kullanılmaz (biri teklif kalemiyle ve kargo içeriğiyle, öteki hammadde satırlarıyla karışır).
- **R2.** İçerik parça kartından düzenlenir: parça seçilir, adet yazılır, satır kaldırılabilir. Bölüm her parçada çizilir; içerik boşken ne olduğunu ve ne işe yaradığını söyleyen bir açıklama ile "Bileşen Ekle" düğmesinden ibarettir.
- **R2/2.** Bölümün başlığı "Setin içeriği", kimlikleri `set-icerigi` (kap), `set-bilesen-satiri` (satır), `set-icerigi-bos` (boş durum), `set-toplam` (toplam kutusu); açıklama ve ipucu metinleri `urunAgaci.js`'te sabittir (ekranda yerel kopya yazılmaz).
- **R2/3.** Setin maliyeti, eksik bileşen sayısı ve bileşen fiyatlarının toplamı **kaydedilmemiş formda da** görünür ve üçü de pencere başına tek canlı sonuçtan (`formMaliyeti`'nin dönüşü) gelir; hesabı `urunAgaci.js`'te saf bir fonksiyon yapar. Ekranda ikinci bir toplama ya da üçüncü bir `formMaliyeti` çağrısı yazılmaz (0099 AC-26).
- **R3.** Adet en az 1 tam sayıdır. Geçersiz adet kaydı engeller ve nedeni satırın yanında yazar.
- **R4.** Aynı parça içerikte iki kez bulunamaz; ikinci kez seçilirse satır eklenmez, adedi artırılması gerektiği söylenir.
- **R5.** **İç içe set yasaktır.** Bir setin içeriğine, içeriği olan başka bir parça eklenemez; seçicide böyle parçalar listelenmez ve kayıtta reddedilir. Bir parça kendi içeriğine de eklenemez.
- **R5/2.** Yasak **iki yönlüdür**: başka bir setin içeriğinde geçen parçaya sonradan içerik eklenmesi de reddedilir ve nedeni o setlerin adıyla yazılır (en çok üç ad, sonrası "+n"). Buna ek olarak maliyet okuması bir bileşenin içeriğine **hiç bakmaz**: bileşenin maliyeti kendi elle girilen ya da hammadde kırılımından gelen değeridir, içeriği olan bileşen maliyeti eksik sayılır (R10). Böylece göçsüz veride kalmış bir iç içe set özyinelemeye yol açmaz.
- **R6.** İçerikteki parçanın **adı kopyalanmaz**, okuma anında katalogdan çözülür. Çöpe atılmış parça satırda "silinmiş parça", katalogda hiç bulunmayan kimlik "kaydı bulunamayan parça" ibaresiyle görünür ve ikisi de maliyeti eksik yapar (R10).
- **R6/2.** Ad çözümü **ham parça dizisinden** yapılır (emsali `urunAgaci.hammaddeTedarikciAdi`), seçici ayrıca süzülür. Parça kartı ve Set Hazırla penceresi `rawParts` prop'unu alır (`Settings.jsx` ve `Stock.jsx` iletir, App'te zaten var); prop verilmezse canlı diziye düşülür, yani bugünkü test düzenekleri bozulmaz. Seçicinin ölçütü "çöpte değil, içeriği boş ve kendisi değil"dir. Maliyet okuması canlı kümeden yapılır, yani çöpteki bileşen maliyeti eksik yapar ama satırda adıyla görünür.
- **R7.** İçeriğin tek yazma yolu parça kartının kayıt fonksiyonudur: boş içerik kayda **hiç yazılmaz**, dolu içerik her kayıtta yeniden kurulur. Form kopyasından artakalan alan kayda sızmaz.

- **R7/2.** **İçeriği olan kayıtta maliyet geçmişi motoru hiç çalıştırılmaz** ve kayıtta duran geçmiş **aynen korunur**, silinmez; içerik kaldırılınca eski geçmiş yeniden devreye girer. Kapı tek yerdedir ve 0097'nin iki yazma yolu da (parça kartının kayıt fonksiyonu ve içe aktarma) ondan geçer.

### B. Maliyet ve fiyat

- **R8.** Setin maliyeti **bileşenlerinin maliyetlerinin toplamıdır**: her bileşenin birim maliyeti × içerikteki adedi. Elle girilen maliyet ve hammadde kırılımı, içeriği olan parçada **okunmaz** (öncelik: içerik > hammadde kırılımı > elle girilen).
- **R8/2.** Maliyet **tarihlidir**: sorulan tarihteki bileşen maliyetlerinin toplamıdır (0097'nin tarihli okuma kuralı). Setin kendisine maliyet geçmişi **yazılmaz**; geçmiş bileşenlerde durur.
- **R9.** Maliyetin okuma yolu bugünkü tek fonksiyondur, değişen yalnız imzasıdır: katalog verilince setin maliyeti çözülür. Katalog verilmeyen çağrıda bugünkü davranış birebir korunur.
- **R9/2.** Üçüncü parametre **bütün zincire** eklenir: `parcaMaliyetKurus(p, tarih, katalog)` ve onu saran `parcaMaliyetiVar` (eş adı `maliyetGirildiMi`), `parcaMaliyetMetni` ile `maliyetKaynagi` parametreyi aynı sırayla iletir; `maliyetKaynagi` üçüncü bir tür döner (`{ tur: "icerik", n: bileşen sayısı }`) ve kartın kaynak ibaresi onu yazar. Katalogun şekli `Map(String(partId) → parça)`, kurucusu `urunAgaci.setKatalogu(parts)`; emsali `makinaStandartMaliyet.js:200`'ün `parcaHaritasi`'sıdır. Çağıranlar haritayı bir kez kurar, satır başına dizi taraması yazmaz (0097 AC-52'nin çağrı sayısı eşitliği korunur). Okuyucuların tam listesi ölçüm 9'dadır ve dokuzdur.
- **R10.** Bir bileşenin maliyeti yoksa (girilmemiş, parça çöpte ya da bulunamıyor) **setin maliyeti yoktur**: sıfır sayılmaz, "girilmedi" sayılır. Kaç bileşenin eksik olduğu parça kartında yazar.
- **R10/2.** R27'nin saydığı sayaç, parça kartının **"maliyeti girilmemiş parça"** sayacıdır (`maliyetsizSayi`, maliyeti çözülemeyen canlı parçalar); hammadde süzgecinin "girilmemiş" sayısı (`girilmemisSayi`, kırılımı olmayan parçalar) **değişmez** ve set kırılımsız olduğu için o süzgeçte görünmeye devam eder. Bu bilinçli bir ayrımdır.
- **R11.** Satış fiyatı **elle kalır**. Bileşenlerin satış fiyatlarının toplamı parça kartında bilgi olarak gösterilir ve tek tıkla fiyat alanına yazılabilir; bu düğme yalnız alanı doldurur, kaydı değiştirmez.
- **R11/2.** Fiyat toplamı **tek okuma yolundan** (`utils.partFiyatForCurrency(p, "TRY")`) okunur ve düğme yalnız **`fiyatTRY`** alanını doldurur, USD ve EUR alanlarına dokunmaz; metni "TL fiyatı toplamına eşitle" ve toplamı olmayan sette pasiftir.
- **R12.** İçerik **para birimi taşımaz**: toplamlar TL'dir, bileşenlerin TL fiyatı ve TL maliyeti okunur. Bileşenin TL fiyatı yoksa fiyat toplamı o satırı saymaz ve bunu söyler.

- **R12/2.** **Parça dışa ve içe aktarması:** dışa aktarmanın maliyet hücresine katalog iletilir ve setin çözülmüş maliyeti yazılır (sütun sayısı ve sırası değişmez); içe aktarmada setin maliyet hücresi **alınmaz** ve nedeni satır numarasıyla bildirilir (emsali `urunAgaci.HAMMADDE_EXCEL_HATASI`, yeni bir sabit). İçerik Excel'e hiç girmez (X10) ve içe aktarmanın uygulama kolu bugünkü `{ ...x, ...guncel }` birleştirmesiyle içeriği zaten korur (ölçüm 21).

### C. Set hazırlama

- **R13.** "Set Hazırla" işlemi tek adımda iki yöne yazar: bileşenler stoktan düşer, setin kendi stoğu girilen adet kadar artar.
- **R13/2.** Setin kendi satırı **her zaman** yazılır, bileşen tarafında hiç düşüm olmasa bile (bugünkü veride bu her hazırlama demektir, ön koşul maddesi ve ölçüm 8). Bileşen satırı yalnız gerçekten düşülen parça için doğar.
- **R14.** İşlem Stok › Parça Stoğu'nda **setin satırındaki** düğmeden açılır; penceresinde hazırlanan adet, tarih ve isteğe bağlı not girilir, bileşen tablosu gereken, stokta olan ve düşecek adedi gösterir.
- **R14/2.** Bileşen tablosu **canlı stoktan** türer ve yalnız gösterimdir; kırpma **kayıt anında** yeniden hesaplanır. Pencere açıkken başka bir kullanıcı stok düşürürse yazılan sayı önizlemeden farklı olabilir, tek kaynak kayıt anıdır.
- **R15.** Hazırlanan adet en az 1 tam sayıdır. Tarih takvimde var olan bir gün olmalı ve gelecekte olamaz (0097'nin tarih kuralı).
- **R15/2.** "Bugün" **yerel gündür** (`useBugun`, 0097'nin kuralı), `today()`'in UTC günü değil; alanın varsayılanı ve gelecek sınırı ondan gelir. Takvim denetimi `urunAgaci.gecerliGunMu` ile yapılır ama hata metinleri `setUretimi.js`'te iki yeni sabittir ("Hazırlama tarihi takvimde var olan bir gün olmalı." ve "Hazırlama tarihi bugünden sonra olamaz."); 0097'nin "Geçerlilik tarihi…" metinleri maliyet geçmişine aittir ve burada kullanılmaz. Alt sınır denetimi hiç kullanılmaz. **Tarih hareketin etiketidir:** geçmiş tarihli bir hazırlama stoğu geriye dönük hesaplamaz (adet türetilmiş önbellektir ve yazım anında uygulanır), stok satırının `sonGuncelleme` damgası bugünkü emsalini korur.
- **R16.** **Bileşen stoğu yetmezse iş durmaz:** eldeki kadarı düşer, eksik kalan düşmez, set yine hazırlanır ve stoğu artar. Stok hiçbir zaman sıfırın altına inmez. Pencerede hangi bileşenin eksik kaldığı yazar. Bu uygulamanın bugünkü kırpma kuralıdır ve ikinci bir kopyası yazılmaz.
- **R16/2.** Eksik kalan bileşen hareketin **notuna** yazılır: satırların notu "Set hazırlandı · n adet" ve eksik varsa "· m bileşen stokta yoktu" cümlesini taşır. Kullanıcının girdiği isteğe bağlı not yalnız **setin satırına** yazılır, bileşen satırlarına kopyalanmaz (n satıra kopyalanırsa hareket penceresi okunmaz olur). Eksiklik için ayrı alan ya da bölüm açılmaz.
- **R17.** İçeriği boş parçada bu işlem **yoktur**: düğme çizilmez.
- **R18.** Her hazırlama tek bir işlem kimliği taşır; bileşen satırları ve setin satırı bu kimliğe bağlanır. Ayrı bir veri bölümü açılmaz, hazırlama stok hareketlerinin kendisidir.
- **R18/2.** İşlem kimliği `uid()`'den gelir ve **hiçbir bölümün kaydına işaret etmez**; birleştirmede çevrilmez (`merge.js`'in `logBagHaritasi`'sına eklenmez, ölçüm 29), hareketin `partId`'si ise bugünkü kuralla yeniden eşlenir.
- **R18/3.** Hareket satırları adedi kendi içinde taşır: setin içeriği sonradan değişse de eski hazırlamalar etkilenmez ve geri alma **log'dan** okur, içeriği yeniden okumaz.
- **R19.** Hazırlama stok hareketidir: gider, maliyet dönemi, parti ve satış hesaplarına **girmez**.

### D. Geri alma

- **R20.** Yanlış girilen hazırlama geri alınabilir: setin stoğu azalır, o hazırlamada gerçekten düşülmüş bileşenler stoğa döner.
- **R20/2.** Geri alınabilirlik ölçütü **setin kendi net girişidir** (giriş eksi iptal), bileşenlerin net düşümü değil; bileşen satırı hiç yazılmamış bir hazırlama da geri alınır ve yalnız setin stoğunu azaltır.
- **R21.** Geri alma eski satırı **silmez**, karşı hareket yazar (0065 R6). İkinci kez geri alma etkisizdir.
- **R21/2.** Bu, 0065 motorunun bugünkü iki fonksiyonuyla yapılamaz (ölçüm 7), bu yüzden **aynı modüle aynadaki ikizleri eklenir**: `netGirisler(log, referansId, tip)` (giriş eksi iptal) ve `karsiGirisler(...)` (miktarı negatif, tipi ayrı bir `IPTAL_TIPI` haritasından). `setUretimi.js` bileşen tarafının bugünkü `karsiHareketler`'i ile setin tarafının `karsiGirisler`'ini **tek yazımda** birleştirir; `stokEtkisi` dokunulmaz, iki yeni tip de fark taşır.
- **R22.** *(QA turu 2026-11-02 ile değişti, eski hâli "geri almada da kırpma geçerlidir" idi.)* Geri alma **ya hep ya hiçtir**: setin bu hazırlamadan kalan net girişi eldeki stoktan fazlaysa hiçbir hareket yazılmaz ve nedeni pencerede yazar ("Bu hazırlamanın n adedi satılmış ya da kullanılmış; geri almak için önce stok sayımını düzeltin."). Stok hiçbir zaman eksiye inmez. Kırpma yalnız hazırlamada, bileşen tarafında uygulanır (R16); yarısı geri alınmış bir hazırlama hiçbir ekranda anlatılamazdı (X12).
- **R23.** Ayrı bir "seti sök" işlemi **yoktur** (X3).

### E. Ekranlar

- **R24.** Parça Stoğu satırında set rozetle tanınır (bileşen sayısıyla) ve "Set Hazırla" düğmesi Düzelt ile Hareketler arasında durur. Öteki satırlar ve bugünkü düğmeler değişmez.
- **R24/2.** Rozetin metni "SET · n bileşen", biçimi `MakinaStokTab`'ın model rozetiyle aynıdır ve **Yedek Parça hücresinin içinde**, adın altında durur (sütun sayısı değişmez, 0102'nin dersi). Düğmenin metni "Set Hazırla", pencerenin başlığı "Set Hazırla · <ad>" ve pencere `wide` açılır (tasarım sözlüğünün "Pencere boyutu" kuralı: veri girme penceresi `maxWidth` yazmaz).
- **R25.** Stok Hareketleri penceresinde hazırlama ve geri alma satırları okunur adlarıyla görünür; geri alınabilir hazırlamanın satırında "Geri Al" düğmesi vardır, geri alınmış olanda yerine ibare yazar. Pencere bunun dışında salt okunur kalır.
- **R25/2.** Pencereye `canDoStock` iletilir ve **yalnız "Geri Al" düğmesi** izne bağlanır; pencerenin kendisi bugünkü gibi kapısız kalır (satırdaki "Hareketler" düğmesinin bugün hiçbir kapısı yok, ölçüm 25, ve onu daraltmak kapsam dışıdır). Pencere artık veri yazdığı için `StokHareketleriPenceresi.jsx:6-7` ile `PartStokTab.jsx:16`'nın "salt okunur, veri yazmaz" yorumları güncellenir.
- **R26.** *(QA turu 2026-11-02 ile daraltıldı; rozet yarısı X9'a geçti.)* Parça seçicilerinde set **tek satırdır** ve kayıt tek kalemdir, stoktan yalnız setin kendi adedi düşer. Seçicinin arama sonucu listesinde rozet çizilmez (X9).
- **R26/2.** İçerik **seçimden sonra**, seçimin altında salt okunur bir satır olarak okunur: yalnız servis formunun değişen parça sepetinde ve yedek parça satış formunun seçili parça kutusunda (orada zaten bir bilgi kutusu var). Metin "Set · n bileşen" ve bileşen listesidir. `ui.jsx` ile `SearchPick` dokunulmaz (C10); Evrak'ın düz `<select>`'i ve `ModelsManager` ile Parça Stoğu'nun kendi seçicileri kapsam dışıdır (ölçüm 13).
- **R27.** Parça kartının "maliyeti girilmemiş parça" sayacı seti de kapsar: maliyeti çözülemeyen set sayılır.

### F. Yetki, iz ve değişmeyenler

- **R28.** Set hazırlama ve geri alma bugünkü **"Stok miktarı düzelt"** yetkisine bağlıdır; yeni eylem izni açılmaz. Yetkisi olmayan kullanıcıda düğmeler çizilmez.
- **R28/2.** O yetkinin kimliği **`stock_parca_edit`**'tir (etiketi "Stok miktarı düzelt"); komşu iki kimlik (`stock_parca_add`, `stock_parca_pin`) kullanılmaz.
- **R29.** *(QA turu 2026-11-02 ile değişti; eski gerekçe "komşusu Stok Miktarını Düzelt de kilit tutmuyor" ölçümle yanlış çıktı, ölçüm 14.)* İçeriğin düzenlenmesi parça kartının bugünkü yetkisine ve kilidine tabidir; **yeni kilit alanı açılmaz**.
- **R29/2.** Set Hazırla penceresi de bugünkü **`partstock`** kilidini setin kimliğiyle alır (komşusu "Stok Miktarını Düzelt" penceresi de alıyor) ve başkası kilitliyse pencere yerine `LockConflict` çizilir; `kilitAlanlari.js`'te `partstock` alanının pencere listesine yeni dosya eklenir. İki kullanıcı aynı seti aynı anda hazırlayıp bileşenleri iki kez düşmesin.
- **R30.** İşlem Geçmişi'ne iki yeni eylem yazılır (hazırlandı, geri alındı); varlık bugünkü stok parçası varlığıdır, ad setin adıdır, ayrıntı adettir.
- **R30/2.** Eylem kimlikleri `set_hazirlandi` ("Set Hazırlandı") ve `set_geri_alindi` ("Set Hazırlama Geri Alındı"); varlık bugünkü `stok_parca` (etiketi hazır), `entityId` setin kimliği, `entityName` setin adı, ayrıntı `{ adet }`.
- **R31.** Satış, servis, teklif, kargo, Analiz, aylık rapor ve bütün yazdırma çıktıları **değişmez**. Set satılınca bugünkü gibi yalnız setin kendi satırı stoktan düşer, bileşenleri düşmez.
- **R32.** Model kiti değişmez: kitte duran bir set, makina üretiminde yine kendi adediyle düşer.

- **R32/2.** Ama kitte **hem set hem bileşeni** duruyorsa model maliyeti aynı parçayı iki kez sayar (ölçüm 16; bugün setlerin maliyeti boş olduğu için hata görünmüyor, içerik girilince doğar). Model Maliyetleri satır düzeyinde bilgi uyarısı yazar (`eksikSayisi` emsali: motor kesişen setleri döndürür, ekran "kitte hem set hem bileşeni var: X" yazar); kayıt engellenmez, düzeltme veri işidir (X11).

### G. Ters çevrilen kriterler, kanıt ve ölçüm (QA turu, 2026-11-02)

- **R33.** Üç test "spec 0121 ile" notuyla güncellenir ve **iddiaları aynen korunur** (başlık satırındaki liste): 0065 AC-21'in `IADE_TIPI` anahtar listesi iki yeni anahtarla, 0065 AC-20'nin dosya listesi `setUretimi.js` ile, 0097 AC-52'nin casusu bütün argümanları ileten `(...a)` biçimiyle. Casus düzeltilmezse maliyet zinciri testte sessizce katalogsuz çalışır ve beklenen çağrı sayısı yanlış yeşil verir.
- **R34.** Kanıt kayıtları: rozet ve düğme eklendiği için Parça Stoğu'nun satır listesini çizen `stok-parca-uyari` ile parça kartının `katalog-parca` ve `katalog-parca-yeni` kayıtları **`beklenen: "degisti"` ve onayla** yazılır (ölçüm 27). Yeni ekranlar `parca-stok-0121-set`, `parca-stok-0121-hazirla`, `parca-stok-0121-hazirla-eksik`, `parca-stok-0121-hareket`, `katalog-parca-0121-set`, `katalog-parca-0121-bos`. Görüntü aracına içeriği olan bir fikstür parçası eklenir, yoksa rozet hiç çizilmez.
- **R35.** Spec'in canlı veri ölçümleri (aşağıdaki altı madde) yeniden doğrulanamadı (ölçüm 28): uygulama turunun ilk adımı bu rakamları, özellikle R32/2'nin kit kesişimini, güncel veriyle yeniden ölçmektir. Rakamlar kararların gerekçesidir, kriterin ölçüsü değildir.

---

## Constraints

### Uyulması zorunlu

- **C1.** Maliyetin **tek okuma yolu** korunur (0096 C, 0097): setin maliyeti de `urunAgaci`'nın bugünkü fonksiyonundan okunur, ekranda ya da başka bir motorda ikinci bir toplama yazılmaz (kaynak taraması).
- **C2.** **Katalog verilmeyen çağrı sessizce yanlış sayı üretemez.** Fonksiyonun yeni parametresi isteğe bağlıdır ve verilmediğinde setin maliyeti `null` döner, yani "girilmedi" görünür; asla bileşenler yokmuş gibi sıfır ya da elle girilmiş eski değer dönmez. Bugün bu fonksiyonu çağıran beş yer (parça kartının üç çağrısı, model maliyeti, parça aktarması) spec'te tek tek sayılır ve hepsi katalogla çağrılır.
- **C3.** Stok hareketi motorunun kuralları korunur (0065): hareket satırı silinmez, geri alma karşı harekettir, `manuel_duzelt` dışındaki her tip farktır, net düşüm kalmamış kayıtta geri alma etkisizdir. Yeni tipler bu motora eklenir, kendi hesapları yazılmaz.
- **C4.** Kırpma kuralı tek yerden gelir (`utils.stokKirparakDus`): "eldeki kadarı düş, eksik kalanı fantom bırak". İkinci bir kırpma kodu yazılmaz.
- **C5.** Yeni kalıcı alan dört nokta kuralıyla eklenir (`SCHEMA_SQL` + `applyColumnMigrations` + `INSERT` + `SELECT`), emsali `parts.hammaddeler` JSON sütunudur: boş içerik `NULL` yazılır ve okumada gövdeye **hiç** girmez.
- **C6.** Birleştirmede içerikteki parça kimliği, yeniden kimliklendirilen parçayı izler (emsali `hammaddeler[].tedarikciId`). `parts` zaten birleşen bir bölümdür (0077).
- **C7.** Yeni veri bölümü, yeni sunucu kuralı ve yeni izin kimliği **yoktur**; `parts`, `partStock` ve `partStockLog` bölümlerinin bugünkü eşlemeleri yeterlidir. Spec bunu açıkça yazar.
- **C8.** Göç yoktur: mevcut on beş setin içeriği elle girilecektir, hiçbir kayıt otomatik dönüştürülmez (ad deseniyle set tahmin etmek yasaktır, 0115 C'nin dersi).

- **C9.** İki yeni hareket tipinin hesabı **`stokHareketi.js`'te kalır** (R21/2'nin iki yeni fonksiyonu dahil); `setUretimi.js` stok adedi aritmetiği yazmaz, yalnız motorun çıktısını tek yazımda uygular (kaynak taraması).
- **C10.** `src/components/ui.jsx` ve içindeki `SearchPick` **dokunulmaz**: dört çağıranı birden besler ve 0120'de bilinçli olarak yerinde bırakıldı. Set rozetinin seçici listesine girmemesinin nedeni budur (X9).
- **C11.** Maliyet geçmişi motorunun kapısı **tek yerdedir** (R7/2): içeriği olan kayıtta ne parça kartı ne içe aktarma geçmiş yazar. İki yazma yolu ayrı ayrı korunursa 0096'nın dersi tekrarlanır.
- **C12.** Yeni **kilit alanı** açılmaz; pencere bugünkü `partstock` alanını paylaşır ve `kilitAlanlari.js`'in pencere listesine girer (R29/2).

### KAPSAM DIŞI

- **X1.** Set satılınca bileşenlerin stoktan düşmesi (patlatma) — *neden:* Takım Yöneticisi setin kendi stoğunu seçti; setin stoğu üretimde artar, satışta azalır. Patlatma bu modelde çift düşüm olurdu.
- **X2.** Setin fiyatının bileşenlerden türemesi — *neden:* setler indirimli satılıyor (örnek: bileşen fiyat toplamı 1.850 TL olan set 3.000 TL'ye satılıyor), türetme bugünkü fiyatları bozar. Toplam yalnız bilgi ve tek tıklık öneridir (R11).
- **X3.** Ayrı bir "seti sök" işlemi — *neden:* hata düzeltmenin yolu geri almadır (R20); raftaki seti bilerek bozmak bugün yaşanmış bir ihtiyaç değil.
- **X4.** Setin içeriğinin teklif, servis formu ve fatura çıktılarına basılması — *neden:* Takım Yöneticisi kararı; çıktı şablonları ve TR/EN çeviri anahtarları dokunulmadan kalır.
- **X5.** İç içe set, yani setin içinde set — *neden:* maliyet hesabında döngü riski ve "setin setinin stoğu" sorusu; tek seviye bütün bilinen ihtiyacı karşılıyor (R5).
- **X6.** Bileşen stoğu yetmeyince uyarı penceresi çıkarıp kullanıcıya sormak — *neden:* bütün stoklar bugün sıfır, her hazırlamada onay penceresi çıkardı; kırpma kuralı ekranda yazılı olarak uygulanır (R16).
- **X7.** Set hazırlamanın maliyete, gidere ya da partiye yazılması — *neden:* hazırlama bir stok hareketidir, satın alma değil; malzemenin gideri zaten faturasıyla kayıtlı.
- **X8.** Parça sayımının yapılması — *neden:* veri işidir, kod işi değil. Aşağıdaki ön koşul maddesine bakın.
- **X9.** Parça seçicisinin **arama sonucu listesinde** ve Evrak'ın `<select>`'inde set rozeti — *neden:* `<option>` zenginleştirilemez ve `SearchPick`'in sonuç satırı dört çağıranın ortak bileşenidir (C10); beş seçicinin yalnız ikisinde çizilebilen bir rozet "rozetsizse set değil" diye yanlış güven verir. Okuma ihtiyacı seçimden sonra karşılanır (R26/2).
- **X10.** Setin içeriğinin Excel'e girmesi — *neden:* içe aktarma hücreleri konuma göre eşler ve değişken uzunlukta bir liste sütuna sığmaz; içerik parça kartından girilir, aktarma onu bugünkü birleştirmeyle korur (R12/2).
- **X11.** Kitte hem set hem bileşeni duruyorsa kaydın engellenmesi — *neden:* bugün 22 model kitinin hepsinde bu durum var, engel koymak bütün kitleri kilitlerdi; uyarı yazılır, düzeltme veri işidir (R32/2).
- **X12.** Kısmen geri alınan hazırlama — *neden:* bileşenler tam dönüp setin stoğu kırpılırsa kayıt rafla kalıcı olarak ayrışır ve "geri alınmış" ibaresi yanlış olur; geri alma ya hep ya hiçtir (R22).

### Bilinen ön koşul

Bu özellik, parça stoğu gerçekten sayılmadan doğru rakam üretmez. Ölçüm: 172 parça stok satırının 171'i tam sıfır, biri pozitif (o da silinmiş bir parçaya ait), 210 canlı parçanın hiç stok satırı yok. Bu veriyle set hazırlandığında hiçbir bileşen düşmez (R16 kırpması) ve setin stoğu karşılığı olmayan bir sayı olarak artar. Özellik çalışır, ama anlamı sayımdan sonra doğar. Sürüm notunda yazılacaktır.

---

## Context

**Parça kaydı ve bugünkü maliyet zinciri.** Parça kartı `src/components/PartManager.jsx`'tedir; kaydın tek kurucusu `hazirla(kayit, eski, ek)`'dir (`:262`) ve içinde `hazirlaTemel` form kopyalarını ayıklar (`:251-256`), 0097'nin `gecmisliKayit` adımı maliyet geçmişini yazar. Maliyetin bugünkü iki kaynağı: elle girilen `maliyet` ve 0096'nın `hammaddeler` kırılımı; kırılım doluysa elle değer **okunmaz** ve kayıt fonksiyonu `maliyet` anahtarını siler. Setin içeriği bu zincirin üçüncü kaynağıdır ve aynı yerde kurulur.

**Tek okuma yolu** `urunAgaci.parcaMaliyetKurus(p, tarih)` (`src/lib/urunAgaci.js:43`) ve kardeşi `parcaMaliyetiVar` (`:54`). Bugünkü okuyucuları **dokuz yerdedir** (QA turu ölçüm 9; spec'in ilk hâli beş diyordu ve iki sarmalayıcıyı saymıyordu): `PartManager.jsx:177` (form özeti, doğrudan), `:344` (tarih hatası, doğrudan), `:315` (maliyeti girilmemiş parça sayacı, `maliyetGirildiMi` ile), `:445` (liste hücresinin rengi, `maliyetGirildiMi` ile), `:446` (liste hücresinin rakamı, `parcaMaliyetMetni` ile), `urunAgaci.js:154`'ün `maliyetKaynagi`'sı, `makinaStandartMaliyet.js:210` (model maliyetinin birim maliyeti, **tarihli**) ve `parcaAktarma.js:19/53/57` (dışa ve içe aktarma). Fonksiyonun bugünkü imzası katalog taşımıyor: setin maliyetini tek başına çözemez, bu yüzden C2'nin kuralı yazıldı.

**Ürün ağacı adetleri.** Model kiti `defaultParcalar` dizisidir ve satırı `{partId, ad, miktar}` taşır (22 canlı modelin hepsinde var, kit uzunluğu 52 ile 76 arası). Setin içeriği en yakın emsal olarak aynı alan adını (`miktar`) kullanır; kitten farkı adı kopyalamamasıdır (R6).

**Stok hareketi motoru (0065).** `src/lib/stokHareketi.js` tek kaynaktır: `IADE_TIPI` (`:11`) her tipin karşı hareketini, `HAREKET_TIP_AD` (`:15`) okunur adını verir; `stokEtkisi` `manuel_duzelt` dışındaki her tipi fark sayar (`:26-37`), `netDusumleri` bir kaydın kalan net düşümünü, `karsiHareketler` geri alma satırlarını üretir (`:62`). Bugünkü tipler: `stok_girisi`, `manuel_duzelt`, `servis`, `bayi_satis`, `satis`, `makina_uretimi` ve dört iadesi. Hareket kayıtlarının dağılımı (ölçüm): 883 servis, 71 bayi satışı, 34 sayım düzeltmesi, 18 stok girişi, 15 servis iadesi.

**Kırpma kuralı** `utils.stokKirparakDus` (`src/lib/utils.js:887`): eldeki kadarı düşer, stok sıfırın altına inmez, eksik kalan "fantom" olur ve kayıt yine tam yazılır. Servis parçalarının yolu bunu kullanır.

**Parça Stoğu ekranı.** `src/components/stock/PartStokTab.jsx`; tablo başlıkları `["Yedek Parça", "Modeller", "Fiyat", "Stok", "Son Güncelleme", ""]` (`:164`), satırın düğmeleri `+ Ekle` (`stock_parca_add`), `Düzelt` (`stock_parca_edit`), `Hareketler` ve yıldız (`stock_parca_pin`). İşlem geçmişi `logAction` ile yazılıyor: `stok_eklendi` ve `stok_duzeltildi`, varlık `stok_parca`, ayrıntı `{ miktar }` (`:81`, `:94`). Hareket penceresi `StokHareketleriPenceresi.jsx` bugün salt okunurdur ve sütunları `["Tarih", "Hareket", "Miktar", "Not"]`'tur (`:32`).

**Ölçüm (01.11.2026 20:36 yedeği, ölçüm sonrası silindi).**

1. Katalogda **380 canlı parça** var; adında set, takım ya da full geçen **15 parça** gerçekte settir, ama hiçbirinin içeriği kayıtlı değil.
2. Bu 15 setin **14'ünde maliyet boş**. Üçü (1500 mm KONVEYÖR SAÇI FULL, 100_AYNA MAHRUTİ DİŞLİSİ TAKIM, SİSTEM CİVATA 1 TAKIM İÇİN TÜM CİVATALAR) **22 model kitinin hepsinde** duruyor, yani Makina Maliyeti ekranının direkt maliyeti bugün bu üç kalem kadar eksik.
3. Setler gerçekten satılıyor: 100_AYNA MAHRUTİ DİŞLİSİ TAKIM 141 serviste ve 38 kargo satışında, 140'lık kardeşi 33 ve 13, 100_TEL MEKANİZMA FULL SET 7 ve 11 kayıtta geçiyor.
4. Bileşenler katalogda tek tek duruyor: adında "RULMAN" geçen 34, "TEL MEKANİZMA" geçen 25 parça var. Örnek olarak DİŞLİ KUTUSU ŞANZUMAN RULMANLARI FULL (3.000 TL) adının içinde bileşenlerini sayıyor ve karşılıkları katalogda mevcut (500, 200, 375 ve 400 TL).
5. **Parça stoğu pratikte tutulmuyor:** 172 stok satırının 171'i tam sıfır, biri pozitif; 210 canlı parçanın hiç stok satırı yok. Ön koşul maddesi buradan geliyor.
6. 135 parçada hammadde kırılımı girilmiş, yani maliyetin ikinci kaynağı gerçekten kullanılıyor; setlerin hiçbirinde yok.

**Bilinen tuzaklar.** `parts` bölümü birleşmeye dahildir (0077) ve yeniden kimliklendirme yapılır, bu yüzden içerikteki `partId` remap edilmezse başka bilgisayarda eklenmiş bir bileşen yanlış parçaya bağlanır. `partStockLog` birleşmede yalnız eklemeleri taşır ve kalıcı silinenler listesindedir (0077 X1), yeni tipler bu davranışa girer. `kirilim-toplami-0099`'un kaynak taraması `PartManager.jsx`'te toplama (`reduce(`, `+=`) yasaklıyor; setin toplamı da orada hesaplanmayacak, saf modülden gelecek.

### QA turu ölçümleri (2026-11-02)

7. `netDusumleri` (`stokHareketi.js:48-59`) miktarı `Math.abs` ile **düşüm** sayar ve `karsiHareketler` (`:62`) her zaman pozitif miktarlı tek bir `IADE_TIPI[tip]` satırı üretir; `IADE_TIPI` tek tipi tek karşı tipe eşler. Setin `+N` satırını geri almak `−N` gerektirir, yani bugünkü iki imza bunu yapamaz (R21/2).
8. `utils.stokKirparakDus` (`:887-898`) `dus > 0` olmayan parçaya satır yazmaz ve emsali `servisParcaDus` (`servisStok.js:23`) `dusumler.length === 0` iken log'a hiç dokunmaz. Ön koşul maddesinin rakamıyla (171/172 satır sıfır, 210 parçanın satırı yok) bugün her hazırlamanın tek satırı setin kendi satırı olur (R13/2, R20/2).
9. Maliyetin okuyucuları dokuz yerdedir (Context'te tek tek sayılı); dördü sarmalayıcıdan (`maliyetGirildiMi`, `parcaMaliyetMetni`, `maliyetKaynagi`) geçer ve hiçbiri katalog taşımaz.
10. `gecmisliKayit` (`urunAgaci.js:129-134`) her kayıtta `maliyetGecmisiYaz(eski, parcaMaliyetKurus(temel))` çağırır; katalogsuz çağrı `null` dönerse sete "girilmedi oldu" kaydı yazılır, katalogla çağrılırsa içerik toplamı sete geçmiş olarak saklanır. İçe aktarma aynı motoru ikinci kez çağırır (`parcaAktarma.js:57`). AC-13 bu iki yol kapatılmadan sağlanamaz (R7/2).
11. Parça kartı yalnız **canlı** diziyi alıyor: `Settings.jsx:273` `parts={parts}`, App `parts={liveParts}` (`App.jsx:1740`) ve `PartManager.jsx:314`'ün yorumu da bunu yazıyor; `rawParts` Settings'e zaten geliyor. Çöpteki bileşen listede hiç olmadığı için "silinmiş parça" ile "kaydı bulunamayan parça" ayırt edilemez (R6/2).
12. R5 yalnız tek yönü kapatıyordu: bileşen olarak kullanılan bir parçaya sonradan içerik eklenmesi hiçbir yerde denetlenmiyor, yani iç içe set arka kapıdan kayda girebilir (R5/2).
13. Parça seçicileri beş yerde ve üç ayrı bileşenle: `ServiceForm.jsx:396` (`SearchPick`), `YedekParcaSatisForm.jsx:186` ve `:220` (`SearchPick`), `Documents.jsx:1448` (düz `<select>`), `ModelsManager.jsx:239` (`SearchPick`), `stock/PartStokTab.jsx:250` (`SearchSelect`). Rozet yalnız ikisinde çizilebilir (R26, X9).
14. "Set hazırlama kilit tutmaz, komşusu da tutmuyor" gerekçesi yanlıştı: `PartStokTab.jsx:20-21` `lockPartId = modal && form.partId` ile hem Ekle hem **Düzelt** penceresi `useLock("partstock", pid)` tutuyor ve kilitliyken `LockConflict` çiziyor (`:271-277`) (R29, R29/2).
15. Üç test ters çevrilmek zorunda: `tests/stok-hareketi.test.js:157` `Object.keys(IADE_TIPI).sort()`'u dört değere **birebir** eşitliyor, `:284` `stokEtkisi(` çağıran dosyaları beş dosyaya birebir eşitliyor, `tests/maliyet-gecmisi-0097-cagri.test.js:10`'un casusu `(p, tarih)` imzasıyla üçüncü argümanı yutuyor (R33).
16. `modelMaliyeti` (`makinaStandartMaliyet.js:205-213`) kit satırlarını bağımsız topluyor; kitte hem set hem bileşeni duruyorsa aynı parça iki kez girer. Ölçüm 2'ye göre üç set 22 model kitinin hepsinde duruyor, yani risk gerçek (R32/2).
17. İki "bugün" var: `today()` UTC (`utils.js:6`), `yerelBugun()` yerel (`:25`). 0097 bilinçli olarak `useBugun` kullanıyor (`PartManager.jsx:311`), stok yolları ise `today()` (`servisStok.js:31`, `PartStokTab.jsx:80`); `mergeAndUpdate` stok satırının `sonGuncelleme`'sini `today()` ile damgalıyor (`utils.js:877`) (R15/2).
18. 0097'nin doğrulayıcısının metinleri maliyet geçmişine ait: `TARIH_GECERSIZ_HATASI` "Geçerlilik tarihi takvimde var olan bir gün olmalı.", `TARIH_GELECEK_HATASI` "Geçerlilik tarihi bugünden sonra olamaz." (`urunAgaci.js:78-79`). Aynı cümleyi ikinci bir anlamda kullanmak 0070'in "mesai" tuzağıdır (R15/2).
19. Kısmi geri alma üç maddeyi birden çelişkiye sokuyordu: R22 setin stoğunda kırpma istiyor, R20 bileşenleri tam geri veriyor, R21 ikinci geri almayı etkisiz sayıyor. 2 hazırlanıp 2 satılmış sette bileşenler tam dönerdi, setin stoğu 0'da kalırdı ve hazırlama "geri alınmış" görünürdü (R22, X12).
20. Eksik kalan (fantom) bileşen hiçbir yerde izlenmiyor: `stokKirparakDus` yalnız gerçek düşümleri döndürüyor ve servis emsali de izlemiyor. Bugünkü veride bu "her hazırlama" demek (R16/2).
21. Aktarma: `parcaDisaAktarmaSatiri(p)` tek parça alıyor (`parcaAktarma.js:20`) ve `maliyetHucresi` katalogsuz çağırıyor (`:19`), yani setin hücresi boş kalırdı; içe aktarma setin `maliyet` hücresini sessizce kaydediyor (`:55`, `kirilimli` yalnız hammaddeye bakıyor) ve 0096'nın uyarı cümlesinin karşılığı yok. Uygulama kolu `{ ...x, ...guncel }` olduğu için (`:83`) içerik korunuyor, bu doğru davranış (R12/2).
22. `merge.js:198-199`'un hammadde emsali yalnız `adds.parts`'a uygulanıyor ve `adds` sunucuda olmayan **yeni** kayıtlardır (`:92`); var olan 15 setin içeriğine birleştirmede dokunulmaz (AC-33).
23. 0099 AC-26 (`tests/kirilim-toplami-0099.test.js:28-33`) `formMaliyeti(` ve `parcaMaliyetKurus(` çağrılarını ikiye, `reduce(` ve `+=` sayısını sıfıra sabitliyor ve `:36-37` iki satırı birebir pinliyor; canlı önizleme bu yüzden tek sonuçtan gelmek zorunda (R2/3).
24. Fiyatın tek okuma yolu `utils.partFiyatForCurrency(part, "TRY")` (`:578`, boş değer `""`); parça kartında üç fiyat alanı var (R11/2).
25. "Stok miktarı düzelt" etiketi `stock_parca_edit` kimliğine ait (`serverPermissionDefs.js:222`); satırdaki "Hareketler" düğmesi hiçbir `canDoStock` kapısı taşımıyor (`PartStokTab.jsx:218`) (R28/2, R25/2).
26. Parça kartında iki sayaç yan yana duruyor: `maliyetsizSayi` (`:315`, maliyeti çözülemeyen parçalar) ve `girilmemisSayi` (`:297`, hammadde kırılımı olmayanlar, süzgecin seçeneği) (R10/2).
27. Kanıt kayıtları: `PartStokTab.jsx`'in kayıtları `parca-stok-formu`, `stok-bos-parca` ve satır listesini çizen `stok-parca-uyari` (0015/0016/0065 taban raporları); `PartManager.jsx`'in on dokuz kaydı var ve satır listesi `katalog-parca` ile `katalog-parca-yeni`'de (R34).
28. Canlı veri ölçümleri **yeniden doğrulanamadı**: ölçümün dayandığı 01.11.2026 20:36 yedeği ölçümden sonra silinmiş, `~/Library/Application Support/makina-crm` klasörü yok, depoda `*.db` ve JSON yedek yok (R35).
29. `merge.js:232`'nin `logBagHaritasi`'sı bağı **tipe göre** çeviriyor; yeni tipler haritada olmayacağı için işlem kimliği olduğu gibi kalır (doğru davranış) ve `:239` hareketin `partId`'sini yeniden eşler (R18/2).
30. Sunucu gerçekten dokunulmaz: `partStock` ve `partStockLog` bölümlerinin `EYLEM_IDLERI` kaydı yok, ikisi de `stockActions` grubundadır (`serverAuth.cjs:45-46`) ve sekme eşlemelerinde `stock` var (`:116-117`); yani ekle ve sil bölüm düzeyinde geçer (C7).
31. `specs/README.md` zaten yazılı (kuyruk `:31`, paragraf `:34`, tablo `:182`) ve orada "**Beş karar** aynı gün verildi" deniyor, üçünün analistin kararı olduğu yazılıyor; spec'in başlık satırı sekiz diyordu (başlık satırı düzeltildi).
32. 0065 AC-25'in pencere testi (`tests/ui/stok-geri-alma-0065.test.jsx:130`) satır sayısını ve metin eşleşmesini ölçüyor, düğme eklenmesinden **kırılmaz**; düzeneği `canDoStock` vermediği için varsayılan açıktır ama fikstür parçalarının içeriği olmadığı için "Set Hazırla" da çizilmez.

### QA turunda verilen kararlar (2026-11-02)

Takım Yöneticisi'nin 2026-11-01'de verdiği beş karar burada **Karar 1-5**'tir: (1) set ayrı bir kayıt türü değil, içeriği olan bir parçadır; (2) setin kendi stoğu olur, hazırlamada bileşenler düşer ve setin stoğu artar, patlatma yoktur; (3) fiyat elle kalır, maliyet içerikten ve tarihli gelir; (4) içerik yalnız parça kartında ve parçayı seçerken görünür, çıktılar değişmez; (5) bileşen stoğu yetmezse uygulamanın bugünkü kırpma kuralı uygulanır, iş durmaz. QA turunun 32 bulgusu **Karar 6-37**'dir.

- **Karar 6 (B-1).** Alan `parts[].setIcerigi`, satır `{ partId, miktar }`, sütun `setIcerigi TEXT`; dört hareket tipinin adı ve okunur adı yazıldı (R1/3).
- **Karar 7 (B-2).** Setin kendi satırının geri alınması için 0065 motoruna `netGirisler` ve `karsiGirisler` eklenir; hesap `stokHareketi.js`'te kalır (R21/2, C9).
- **Karar 8 (B-3).** Geri alınabilirlik ölçütü setin kendi net girişidir ve setin satırı bileşen düşümü olmasa da yazılır (R13/2, R20/2).
- **Karar 9 (B-4).** Katalog parametresi maliyet zincirinin dört fonksiyonuna birden eklenir, şekli `Map`, kurucusu `setKatalogu`; `maliyetKaynagi` üçüncü türü döner (R9/2).
- **Karar 10 (B-5).** İçeriği olan kayıtta maliyet geçmişi motoru hiç çalışmaz ve var olan geçmiş korunur; kapı tek yerdedir (R7/2, C11).
- **Karar 11 (B-6).** Ad çözümü ham diziden yapılır, `rawParts` prop'u eklenir ve verilmediğinde canlı diziye düşülür (R6/2).
- **Karar 12 (B-7).** İç içe set yasağı iki yönlü olur ve maliyet okuması bileşenin içeriğine hiç bakmaz (R5/2).
- **Karar 13 (B-8).** R26 ikiye bölünür: seçimden sonraki içerik satırı kapsamda, seçici listesindeki rozet kapsam dışı (R26, R26/2, X9, C10).
- **Karar 14 (Ö-1).** Set Hazırla penceresi bugünkü `partstock` kilidini alır; R29'un yanlış gerekçesi düzeltildi (R29, R29/2, C12).
- **Karar 15 (Ö-2).** Üç test "spec 0121 ile" notuyla genişletilir, iddiaları korunur (R33, başlık satırı).
- **Karar 16 (Ö-3).** Kitte hem set hem bileşeni varsa Model Maliyetleri bilgi uyarısı yazar, kayıt engellenmez (R32/2, X11).
- **Karar 17 (Ö-4).** "Bugün" yerel gündür ve tarih hareketin etiketidir, stoğu geriye dönük hesaplamaz (R15/2).
- **Karar 18 (Ö-5).** Takvim denetimi 0097'nin fonksiyonundan, hata metinleri `setUretimi.js`'in iki yeni sabitinden gelir (R15/2).
- **Karar 19 (Ö-6).** Geri alma ya hep ya hiçtir; R22 ters çevrildi, kısmi geri alma kapsam dışı (R22, X12).
- **Karar 20 (Ö-7).** Eksik kalan bileşen hareketin notuna yazılır, ayrı alan açılmaz (R16/2).
- **Karar 21 (Ö-8).** Dışa aktarmada setin maliyeti yazılır, içe aktarmada alınmaz ve nedeni bildirilir; içerik Excel'e girmez (R12/2, X10).
- **Karar 22 (Ö-9).** AC-33 yeni eklenen sete daraltıldı, var olan setin içeriğinin eşlenmemesi bilinen sınır olarak yazıldı.
- **Karar 23 (Ö-10).** Canlı önizlemenin üç rakamı `formMaliyeti`'nin dönüşüne eklenir, pinlenen iki satır aynen kalır (R2/3).
- **Karar 24 (Ö-11).** Fiyat toplamı `partFiyatForCurrency`'den okunur ve düğme yalnız `fiyatTRY`'yi doldurur (R11/2).
- **Karar 25 (Ö-12).** İzin kimliği `stock_parca_edit` yazıldı; yalnız "Geri Al" düğmesi izne bağlanır, pencere kapısız kalır (R28/2, R25/2).
- **Karar 26 (K-1).** Başlık satırı beş TY kararı ve üç analist kararı diye düzeltildi (başlık satırı, ölçüm 31).
- **Karar 27 (K-2).** R27'nin saydığı sayaç `maliyetsizSayi`'dır; hammadde süzgecinin sayısı değişmez (R10/2).
- **Karar 28 (K-3).** Bölümün başlığı, dört kimliği ve metinlerin yeri yazıldı (R2/2).
- **Karar 29 (K-4).** Rozetin metni ve yeri, düğmenin metni ve pencerenin `wide` boyutu yazıldı (R24/2).
- **Karar 30 (K-5).** İki eylem kimliği, etiketleri ve ayrıntısı yazıldı (R30/2).
- **Karar 31 (K-6).** Değişecek üç kanıt kaydı ve altı yeni ekran adı yazıldı (R34).
- **Karar 32 (K-7).** Kullanıcının notu yalnız setin satırına yazılır (R16/2).
- **Karar 33 (K-8).** Canlı veri ölçümlerinin yeniden doğrulanamadığı yazıldı ve uygulama turunun ilk adımı oldu (R35, ölçüm 28).
- **Karar 34 (K-9).** İşlem kimliğinin kaynağı ve birleştirmede çevrilmemesi yazıldı (R18/2).
- **Karar 35 (K-10).** Bileşen tablosu canlı stoktan türer, kırpma kayıt anında yeniden hesaplanır (R14/2).
- **Karar 36 (K-11).** `specs/README.md` zaten yazılı, kapanışta yalnız "(Tamamlandı)" düşer (başlık satırı, ölçüm 31).
- **Karar 37 (K-12).** İçerik değişince eski hazırlamaların etkilenmediği değişmezi yazıldı (R18/3).

### Plan turunda verilen kararlar (2026-11-02)

Uygulama planının belirsizlik maddeleri (`specs/0121-uygulama-plani.md` §3) Takım Yöneticisi tarafından olduğu gibi kabul edildi.

- **Karar 38 (P1).** App, Stock'a yalnız canlı parça dizisini veriyordu; `rawParts={parts}` prop'u eklenir ve `src/App.jsx` etkilenen alanlara yazıldı (R6/2).
- **Karar 39 (P2).** Kesişim uyarısı `src/components/maliyet/ModelMaliyetleri.jsx`'te çizilir; motor kesişimi döndürür, ekran yalnız yazar (R32/2).
- **Karar 40 (P3).** `IADE_TIPI` yalnız `set_uretimi` anahtarını alır; `set_girisi` → `set_girisi_iptal` ayrı `IPTAL_TIPI` haritasındadır. R33'ün "iki yeni anahtar" ifadesi bir anahtar olarak okunur (iki yeni tip adı, biri `IADE_TIPI`'de, biri `IPTAL_TIPI`'de). Ya hep ya hiç yoklaması da `stokHareketi.js`'tedir (C9).
- **Karar 41 (P4).** "Geri Al" tıklaması `useKilitListesi` ile `partstock` kilidine (setin kimliği) anlık bakar, başkasındaysa bildirimle reddeder; yeni kilit alanı açılmaz, `StokHareketleriPenceresi.jsx` alanın pencere listesine girer (C12).
- **Karar 42 (P5).** İçerik doluyken parça kartında elle maliyet alanı ve hammadde bölümü pasif ve nedenlidir, geçerlilik tarihi ve maliyet geçmişi listesi çizilmez; saklı `maliyet`, `hammaddeler` ve `maliyetGecmisi` kayıtta aynen kalır, içerik kaldırılınca geri gelir.
- **Karar 43 (P6).** Maliyet geçmişinin tek kapısı `maliyetGecmisiYaz`'ın seçeneğindeki `set` bayrağıdır (yeni kaydın içeriğinden okunur): doluysa geçmiş aynen döner, hata yoktur. Üç çağıran geçirir: kayıt fonksiyonu, kayıttan önceki tarih yoklaması, içe aktarma (tarama).
- **Karar 44 (P7).** "Geri Al" düğmesi yalnız setin kendi `set_girisi` satırındadır; bileşen satırları düğme taşımaz. Geri alınmış satırda ibare "Geri alındı".
- **Karar 45 (P8).** Geri almanın tarihi yerel gündür (`useBugun`), notu "Set hazırlama geri alındı".
- **Karar 46 (P9).** Fiyat toplamı `parseMoney(partFiyatForCurrency(p, "TRY")) × adet` ile `urunAgaci.js`'te hesaplanır; düğme sonucu tamsayı dize olarak `fiyatTRY`'ye yazar (alan `MoneyInput`, tam sayı).
- **Karar 47 (P10).** Servis formu ve yedek parça formunun salt okunur içerik satırında bileşen adları canlı diziden çözülür (iki form ham diziyi almaz); bulunamayan bileşen "listede olmayan parça" yazar (yeni sabit, `urunAgaci.LISTEDE_OLMAYAN_PARCA`).
- **Karar 48 (P11).** R5/2'nin iki yönlü yasağı yalnız canlı setlere bakar; çöpteki setten geri alma iç içe hâl doğurabilir, R5/2'nin okuma kuralı onu güvenli kılar.
- **Karar 49 (P12).** R35'in canlı veri ölçümü güncel yedek olmadan yapılamaz; yedek verilmezse kapanışta "ölçülemedi" yazılır, kesişim uyarısı test fikstürüyle kanıtlanır.
- **Karar 50 (P13).** 0099 AC-26'nın `parcaMaliyetKurus(` sınırı aşılmazsa yükseltilmez.
- **Karar 51 (P14).** Bileşensiz hazırlamanın notu spec'in cümlesiyle aynen; sürüm notunda sayım ön koşulu yazılır.

### Uygulamada verilen kararlar (2026-11-02)

- **Karar 52.** Rozet ve seçimden sonraki içerik satırı tek dosyada: yeni `src/components/stock/SetRozeti.jsx` (`SetRozeti`, `SetIcerikSatiri`, `setBilesenSayisi`). 0087 AC-6 satış ve stok ekranlarının (`PartStokTab`, `ServiceForm`, `YedekParcaSatisForm`) `urunAgaci`'yı doğrudan içe almasını yasaklıyor; bu ekranlar içerik sorusunu bu dosyadan sorar, tarama gevşetilmedi.
- **Karar 53.** Ölçüm 27 değişen kanıt kayıtlarını eksik saydı: parça kartının düzenleme ya da ekleme penceresi açık **bütün** ekranları yeni bölümle değişti (on bir ekran: `katalog-parca`, `-yeni`, dört `-0096-*`, iki `-0097-*`, üç `-0099-*`) ve hareket penceresinin başlığına boş bir sütun eklendiği için `parca-stok-hareketleri` de değişti. Hepsi `degisti` ve onayla yazıldı; listeyi gösteren ekranlar (`ayarlar-yedekparca*`), servis ve yedek parça formları ve Model Maliyetleri 0 piksel.
- **Karar 54.** Dördüncü bir test "spec 0121 ile" güncellendi: `tests/hammadde-0096.test.js` AC-32 Model Maliyetleri'nin `parcaMaliyetKurus(p, tarih)` imzasını birebir arıyordu; desen `parcaMaliyetKurus(p, tarih, partMap)` oldu, iddia aynı.
- **Karar 55.** `Settings`'in `rawParts` varsayılanı boş dizidir; ham dizi verilmemiş ya da boşsa canlı diziye düşülür (R6/2'nin "verilmezse" kuralı). Hareket penceresinin anlık kilit denetimi kendi kilidini saymasın diye App, Stock'a `aktifKullanici` da verir (Karar 41'in gereği).
- **Karar 56.** `docs/tasarim-sozlugu.md`'nin iki `dosya:satır` atıfı kaydı (`PartStokTab.jsx:148`, `ModelMaliyetleri.jsx:84`; ikincisi spec öncesinde de bir satır kaymıştı).

### Karar kaydı

| Bulgu | Derece | Karar | Nereye işlendi |
|---|---|---|---|
| B-1 alan ve tip adları yok | Bloklayıcı | Kabul | R1/3, AC-35 |
| B-2 setin satırı motorla geri alınamıyor | Bloklayıcı | Kabul | R21/2, C9, AC-36 |
| B-3 geri alma ölçütü ve bileşensiz hazırlama | Bloklayıcı | Kabul | R13/2, R20/2, AC-37 |
| B-4 kardeş fonksiyonların imzası | Bloklayıcı | Kabul | R9/2, AC-38 |
| B-5 setin maliyet geçmişi doğuyor | Bloklayıcı | Kabul | R7/2, C11, AC-39 |
| B-6 ham parça dizisi yok | Bloklayıcı | Kabul | R6/2, AC-40 |
| B-7 ters yönlü iç içe set | Bloklayıcı | Kabul | R5/2, AC-41, AC-42 |
| B-8 R26'nın uygulama yeri yok | Bloklayıcı | Kabul | R26, R26/2, X9, C10, AC-43 |
| Ö-1 kilit gerekçesi yanlış | Önemli | Kabul | R29, R29/2, C12, AC-44 |
| Ö-2 iki kriter daha ters çevriliyor | Önemli | Kabul | R33, başlık satırı, AC-45 |
| Ö-3 kit kesişiminde çift sayım | Önemli | Kabul | R32/2, X11, AC-46 |
| Ö-4 tarihin anlamı ve bugünün kaynağı | Önemli | Kabul | R15/2, AC-47, AC-48 |
| Ö-5 hata metinleri yanlış konuşuyor | Önemli | Kabul | R15/2, AC-47 |
| Ö-6 kısmi geri alma çelişkisi | Önemli | Kabul | R22, X12, AC-25 |
| Ö-7 eksik kalan izlenmiyor | Önemli | Kabul | R16/2, AC-49 |
| Ö-8 aktarmada setin maliyeti | Önemli | Kabul | R12/2, X10, AC-50 |
| Ö-9 AC-33 yalnız yeni sette doğru | Önemli | Kabul | AC-33 |
| Ö-10 canlı önizlemenin kaynağı | Önemli | Kabul | R2/3, AC-51 |
| Ö-11 fiyat okuma yolu ve alan | Önemli | Kabul | R11/2, AC-52 |
| Ö-12 izin kimliği ve pencere kapısı | Önemli | Kabul | R28/2, R25/2, AC-53 |
| K-1 karar sayısı ve atfı | Küçük | Kabul | Başlık satırı |
| K-2 iki sayaç | Küçük | Kabul | R10/2, AC-30 |
| K-3 bölümün kimlikleri | Küçük | Kabul | R2/2, AC-54 |
| K-4 rozet, düğme, pencere boyutu | Küçük | Kabul | R24/2, AC-55 |
| K-5 eylem kimlikleri | Küçük | Kabul | R30/2, AC-56 |
| K-6 kanıt kayıtları | Küçük | Kabul | R34, AC-57 |
| K-7 notun yeri | Küçük | Kabul | R16/2, AC-58 |
| K-8 ölçümler doğrulanamadı | Küçük | Kabul | R35, ölçüm 28 |
| K-9 işlem kimliği ve birleştirme | Küçük | Kabul | R18/2, AC-59 |
| K-10 tablonun kaynağı | Küçük | Kabul | R14/2, AC-60 |
| K-11 README zaten yazılı | Küçük | Kabul | Başlık satırı, ölçüm 31 |
| K-12 içerik değişince eski hazırlama | Küçük | Kabul | R18/3, AC-61 |

---

## Acceptance Criteria

- **AC-1.** İçeriği boş bir parçanın kartında "Setin içeriği" bölümü, açıklaması ve "Bileşen Ekle" düğmesi çizilir; kayıtta içerik alanı oluşmaz.
- **AC-2.** İki bileşen eklenip kaydedilen parça set olur: kayıtta içerik iki satırdır, satırlar yalnız parça kimliği ve adet taşır.
- **AC-3.** Adet alanına 0, boş ya da ondalıklı değer girilirse kayıt yapılmaz ve nedeni satırın yanında yazar.
- **AC-4.** Katalogda zaten içerikte olan bir parça ikinci kez seçilirse satır eklenmez ve adedin artırılması gerektiği söylenir.
- **AC-5.** İçeriği olan bir parça, başka bir setin içerik seçicisinde listelenmez; kayıt yoluyla eklenmeye çalışılırsa reddedilir.
- **AC-6.** Bir parça kendi içeriğine eklenemez.
- **AC-7.** İçerikteki bir parça çöpe atılırsa satır, adı **ham diziden** çözülerek "silinmiş parça" ibaresiyle görünür ve setin maliyeti "girilmedi" olur.
- **AC-8.** Ham dizide de bulunmayan bir kimlik içerikte duruyorsa satır "kaydı bulunamayan parça" ibaresiyle görünür ve maliyeti eksik yapar; iki ibare aynı veride **ayrı ayrı** ölçülür.
- **AC-9.** Bütün bileşenlerinin maliyeti girilmiş bir setin maliyeti, bileşen maliyeti × adet toplamına **kuruşu kuruşuna** eşittir.
- **AC-10.** Bir bileşenin maliyeti girilmemişse setin maliyeti `null` döner (sıfır değil) ve kartta kaç bileşenin eksik olduğu yazar.
- **AC-11.** İçeriği olan parçada elle girilmiş maliyet ve hammadde kırılımı okunmaz: ikisi de doluyken maliyet yine içerikten gelir.
- **AC-12.** Bileşenin maliyeti geçmişte değişmişse setin maliyeti sorulan tarihe göre değişir: aynı set iki farklı tarihte iki farklı rakam verir.
- **AC-13.** Setin kendi kaydına maliyet geçmişi yazılmaz: içerik ya da bileşen maliyeti değişse de setin maliyet geçmişi boş kalır. Aynı iddia **iki yazma yolunda da** ölçülür (parça kartının kaydı ve Excel içe aktarması).
- **AC-14.** Maliyet okuma yolu katalog verilmeden çağrılırsa setin maliyeti `null` döner (sıfır ya da elle girilmiş eski değer değil) ve bu dört fonksiyonun hepsinde böyledir; içeriği olmayan parçalarda çıktı spec öncesiyle **birebir** aynıdır (kıyas testi).
- **AC-15.** Parça kartı bileşenlerin satış fiyatı toplamını gösterir; "fiyatı buna eşitle" düğmesi yalnız fiyat alanını doldurur, kaydı tek başına değiştirmez.
- **AC-16.** Bir bileşenin TL fiyatı yoksa fiyat toplamı o satırı saymaz ve bunu ekranda söyler.
- **AC-17.** Parça Stoğu'nda setin satırında rozet (bileşen sayısıyla) ve "Set Hazırla" düğmesi çizilir; içeriği olmayan satırda düğme yoktur.
- **AC-18.** "Stok miktarı düzelt" yetkisi olmayan kullanıcıda "Set Hazırla" düğmesi çizilmez.
- **AC-19.** Bileşen stokları yeterliyken 2 adet set hazırlanınca her bileşen içerikteki adedinin iki katı kadar düşer ve setin stoğu 2 artar.
- **AC-20.** Bileşen stoğu yetersizken set yine hazırlanır: eldeki kadarı düşer, stok sıfırın altına inmez, setin stoğu yine artar ve eksik kalan bileşenler pencerede listelenir.
- **AC-21.** Hazırlanan adet 0 ya da tam sayı değilse, tarih takvimde yoksa ya da gelecekteyse işlem yapılmaz ve nedeni yazar.
- **AC-22.** Hazırlamanın bütün hareketleri (bileşenler ve set) tek bir işlem kimliği taşır.
- **AC-23.** Geri alma karşı hareket yazar: setin stoğu azalır, o hazırlamada gerçekten düşülmüş bileşenler stoğa döner, eski satırlar listede kalır.
- **AC-24.** Aynı hazırlama ikinci kez geri alınmaya çalışılırsa hiçbir hareket yazılmaz ve stok değişmez.
- **AC-25.** *(QA turu 2026-11-02 ile ters çevrildi.)* Set hazırlandıktan sonra satılmışsa geri alma **hiçbir hareket yazmaz** ve nedeni pencerede görünür; stok ve bileşenler değişmez.
- **AC-26.** Stok Hareketleri penceresinde hazırlama ve geri alma satırları okunur adlarıyla görünür; geri alınmış hazırlamanın satırında düğme yerine ibare yazar.
- **AC-27.** Bileşenin kendi hareket listesinde de aynı hazırlama eksi satır olarak görünür.
- **AC-28.** Set bir servise ya da kargo satışına eklenince kayıt tek kalemdir ve stoktan yalnız setin kendi adedi düşer; bileşenlere dokunulmaz.
- **AC-29.** *(QA turu 2026-11-02 ile daraltıldı.)* Parça seçicisinde set tek satırdır ve seçildikten **sonra** içeriği salt okunur satırda görünür; arama sonucu listesinde rozet yoktur ve servis formu çıktısı spec öncesiyle aynıdır.
- **AC-30.** Parça kartının "maliyeti girilmemiş parça" sayacı maliyeti çözülemeyen seti de sayar; hammadde süzgecinin "girilmemiş" sayısı **değişmez**.
- **AC-31.** İşlem Geçmişi'ne hazırlama ve geri alma yazılır; iki eylemin de etiketi etiket haritasında vardır.
- **AC-32.** Yeni alan dört nokta kuralıyla eklenmiştir: boş içerik veritabanına `NULL` yazılır ve okunan gövdede anahtar hiç bulunmaz (roundtrip testi).
- **AC-33.** Birleştirmede yeniden kimliklendirilen bir parça, **bu birleştirmede eklenen** bir setin içeriğinde yeni kimliğiyle görünür. Sunucuda zaten duran bir setin içeriği eşlenmez; bu bilinen sınır (emsali 0096'nın hammadde kırılımı) kriterde adıyla yazılır.
- **AC-34.** Aylık rapor, Finans, Analiz ve model kiti çıktıları spec öncesiyle birebir aynıdır (kıyas testi).

### QA turu kriterleri (2026-11-02)

- **AC-35.** Alanın adı, satır şekli ve dört hareket tipinin adı spec'teki gibidir; dört tipin okunur adı `HAREKET_TIP_AD`'da, iki karşı tip eşlemesi kendi haritasındadır.
- **AC-36.** Setin satırının geri alınması `stokHareketi.js`'in iki yeni fonksiyonundan gelir; `setUretimi.js`'te stok adedi aritmetiği yoktur (kaynak taraması) ve `stokEtkisi` değişmemiştir.
- **AC-37.** Bileşen stoğu hiç olmayan bir hazırlama (bugünkü veride her hazırlama) kaydedilir, setin satırı yazılır ve sonradan geri alınabilir: setin stoğu azalır, yazılacak bileşen iadesi yoktur.
- **AC-38.** Maliyet zincirinin dört fonksiyonu da katalogla çağrılır (dokuz okuyucu); `maliyetKaynagi` içeriği olan parçada üçüncü türü döner ve kartın kaynak ibaresi onu yazar.
- **AC-39.** İçeriği olan parça kaydedilince maliyet geçmişine hiçbir kayıt yazılmaz, kayıtta duran geçmiş aynen korunur ve içerik kaldırılınca o geçmiş yeniden devreye girer.
- **AC-40.** Ham parça dizisi verilmediğinde ekran canlı diziye düşer ve çöker ya da boş satır çizmez (bugünkü test düzenekleri bozulmaz).
- **AC-41.** Başka bir setin içeriğinde geçen parçaya içerik eklenmesi reddedilir ve neden o setlerin adını yazar.
- **AC-42.** Maliyet okuması bir bileşenin içeriğine bakmaz: veride duran iç içe sette özyineleme olmaz, iç setin maliyeti eksik sayılır.
- **AC-43.** Servis formunun sepetinde ve yedek parça satış formunun seçili parça kutusunda setin içeriği salt okunur görünür; `ui.jsx` değişmemiştir (kaynak taraması) ve Evrak'ın seçicisinde rozet yoktur.
- **AC-44.** Set Hazırla penceresi `partstock` kilidini setin kimliğiyle alır; kayıt başkasındaysa pencere yerine `LockConflict` çizilir ve `kilitAlanlari.js`'in pencere listesi yeni dosyayı taşır.
- **AC-45.** Ters çevrilen üç kriter "spec 0121 ile" notuyla güncellenmiştir ve iddiaları korunmuştur; 0097 AC-52'nin casusu bütün argümanları iletir ve beklenen çağrı sayısı değişmemiştir.
- **AC-46.** Kitinde hem set hem o setin bileşeni olan modelin satırında bilgi uyarısı çizilir; kayıt engellenmez ve maliyet rakamı bugünkü kuralla hesaplanır.
- **AC-47.** Hazırlama tarihi yerel güne göre doğrulanır: takvimde olmayan ve gelecek tarih reddedilir, metinler "Hazırlama tarihi" ile başlar ve 0097'nin "Geçerlilik tarihi" metinleri kullanılmaz.
- **AC-48.** Geçmiş tarihli bir hazırlama stoğu geriye dönük hesaplamaz: adet yazım anında uygulanır ve hareket satırının tarihi girilen gündür.
- **AC-49.** Bileşen stoğu yetersizken yazılan hareketlerin notu eksik bileşen sayısını söyler.
- **AC-50.** Dışa aktarmada setin maliyet hücresi çözülmüş maliyeti taşır; içe aktarmada setin maliyet hücresi alınmaz ve nedeni satır numarasıyla bildirilir. Sütun sayısı ve sırası değişmez, içerik Excel'e girmez ve içe aktarma mevcut setin içeriğini korur.
- **AC-51.** Setin maliyeti, eksik bileşen sayısı ve fiyat toplamı kaydedilmemiş formda da görünür ve tek `formMaliyeti` sonucundan gelir; 0099'un pinlediği iki satır aynen durur, `PartManager.jsx`'te toplama yoktur.
- **AC-52.** Fiyat toplamı `partFiyatForCurrency` ile okunur ve düğme yalnız `fiyatTRY` alanını doldurur; USD ve EUR alanları ile kayıt değişmez, toplamı olmayan sette düğme pasiftir.
- **AC-53.** "Geri Al" düğmesi `stock_parca_edit` olmayan kullanıcıda çizilmez ama pencerenin kendisi açılır.
- **AC-54.** Bölümün başlığı ve dört kimliği spec'teki gibidir; metinler `urunAgaci.js`'ten gelir ve ekranda yerel kopyası yoktur (kaynak taraması).
- **AC-55.** Set satırının rozeti "SET · n bileşen" metnini taşır ve Yedek Parça hücresinin içindedir (tablonun sütun sayısı değişmez); pencere `wide` açılır ve `maxWidth` yazmaz.
- **AC-56.** İşlem Geçmişi'ne `set_hazirlandi` ve `set_geri_alindi` yazılır, ikisinin etiketi etiket haritasındadır ve ayrıntı adedi taşır.
- **AC-57.** Üç var olan kanıt kaydı `degisti` ve onayla yazılmıştır, altı yeni ekran rapordadır ve görüntü aracının fikstüründe içeriği olan bir parça vardır.
- **AC-58.** Kullanıcının girdiği not yalnız setin hareket satırında görünür, bileşen satırlarında görünmez.
- **AC-59.** Hazırlamanın işlem kimliği birleştirmede çevrilmez (`logBagHaritasi`'na eklenmemiştir) ama hareketin `partId`'si yeniden eşlenir.
- **AC-60.** Pencere açıkken stok değişirse kayıt anındaki kırpma uygulanır: yazılan düşüm önizlemeden farklı olabilir ve stok eksiye inmez.
- **AC-61.** Setin içeriği hazırlamadan sonra değiştirilse de o hazırlamanın geri alınması log'daki adetleri döndürür.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap içeren iş React'sız **saf motorda** yazıldı (`urunAgaci.js` maliyet, yeni `setUretimi.js` stok) ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Maliyeti üreten başka bir yol açılmadı: tek okuma yolu taraması yeşil, `PartManager.jsx`'te toplama yok, katalog parametresi zincirin dört fonksiyonuna birden iletildi ve dokuz okuyucunun hepsi güncellendi.
- [ ] Stok hesabı `stokHareketi.js`'te kaldı: iki yeni fonksiyon oraya yazıldı, `setUretimi.js`'te adet aritmetiği yok (tarama) ve `stokEtkisi` değişmedi.
- [ ] Maliyet geçmişinin kapısı tek yerde: içeriği olan kayıtta ne parça kartı ne içe aktarma geçmiş yazıyor, var olan geçmiş silinmiyor.
- [ ] Yeni kalıcı alan **dört nokta kuralıyla** eklendi ve `db-roundtrip` ile `db-clean-install` testlerine girdi.
- [ ] Yeni veri bölümü **yok**; birleştirmede içerikteki parça kimliğinin yeniden eşlenmesi eklendi ve testi var.
- [ ] Yeni eylem izni **yok**: işlem bugünkü "Stok miktarı düzelt" yetkisine (`stock_parca_edit`) bağlandı ve bu spec'te açıkça yazıldı; `serverAuth.cjs` dokunulmadı (ölçüm 30).
- [ ] Yeni kilit alanı **yok**: pencere bugünkü `partstock` alanını paylaşıyor ve `kilitAlanlari.js`'in pencere listesine girdi.
- [ ] `src/components/ui.jsx` ve `SearchPick` dokunulmadı (tarama).
- [ ] Ters çevrilen üç kriter "spec 0121 ile" notuyla güncellendi, iddiaları korundu; 0097 AC-52'nin casusu bütün argümanları iletiyor.
- [ ] Dışa ve içe aktarma kararı uygulandı: setin maliyeti dışa yazılıyor, içeriden alınmıyor ve nedeni bildiriliyor.
- [ ] Kitte hem set hem bileşeni duran modeller ölçüldü ve uyarı satırı eklendi.
- [ ] Spec'in canlı veri ölçümleri güncel veriyle yeniden ölçüldü (yedek silindiği için QA turunda doğrulanamadı, ölçüm 28).
- [ ] Soft-delete simetrisi: çöpe atılan bileşen ve çöpten dönen bileşen setin maliyetinde doğru davranıyor.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı değişmediği için çeviri anahtarı eklenmedi.
- [ ] Para gösterimi TL'dir ve bileşenin TL fiyatı yokken davranış tanımlı (AC-16).
- [ ] Arayüz kriterlerinin **görsel kanıtı** alındı: altı yeni ekran (`parca-stok-0121-set`, `-hazirla`, `-hazirla-eksik`, `-hareket`, `katalog-parca-0121-set`, `-bos`) ve bilinçli değişen üç var olan ekran (`stok-parca-uyari`, `katalog-parca`, `katalog-parca-yeni`) `degisti` ve onayla `kanit-eslemesi.json`'a yazıldı; taban raporu 0 fark.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: setin tanımı, maliyetin üçüncü kaynağı, yeni hareket tipleri ve kırpma kuralı.
- [ ] Sürüm notunda ön koşul yazıldı: parça sayımı yapılmadan setin stoğu anlam taşımaz.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

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
