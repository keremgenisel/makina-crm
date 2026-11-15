# 0146 — Kalıp durumları penceresi ve makina teslimiyle toplu teslim

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-15; üç kararın üçü de analistin önerisi yönünde kapandı). **Revizyon 2 (2026-11-15):** A parçası Takım Yöneticisi'nin ikinci turuyla değişti; kalıp kartı bugünkü hâlinde kalır, durumlar makina durumunun yanından açılan ayrı pencereye taşınır. **Revizyon 3 (2026-11-16):** QA turunun 24 bulgusu Takım Yöneticisi tarafından olduğu gibi onaylandı ve spec'e işlendi (QA kararı 1..24). **Revizyon 4 (2026-11-16, plan turu):** beş düzeltilen iddia (Plan kararı 25–27, 29, 30) ve sabitlerin toplanması (Plan kararı 28) Takım Yöneticisi tarafından onaylandı |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteri detay penceresinin makina durumu satırının `onChange`'i (`CustomerDetailModal.jsx`), yeni dosya `src/components/customers/detail/KalipDurumlari.jsx` (özet satırı, kalıp durumları penceresi ve teslim onayı birlikte; QA kararı 11), kalıp durumu kütüphanesine dört saf yardımcı ve üç metin sabiti (`src/lib/musteriDurumu.js`) |
| **Bağımlı spec'ler** | 0106 (durum alanları, pil, seçici bileşeni), 0110 (teslim türetmesi, detayda kalıp durumunun kaldırılması, küme ölçümü), 0107 (ayna satır), 0108 (bağ canlılığı, elle bitti kısa devresi), 0115 (`ConfirmDialog` seçenekleri), 0126 (iç içe pencerede Escape, dar pencere emsali), 0128 (kilit), 0050 (pencere boyutu kuralı) |
| **Kanıt** | Takım Yöneticisi'nin 2026-11-15 tarihli isteği ve aynı günkü ikinci turu ("kalıplar bölümü aşağı doğru çok uzayacak") |
| **QA turu** | 2026-11-16, 24 bulgu (3 bloklayıcı / 10 önemli / 11 küçük); hepsi Takım Yöneticisi tarafından onaylandı |
| **Düzeltilen iddialar** | 9 (Ölçüm 5'in son cümlesi, A-R4'ün bayi dalı, seçicinin varsayılan erişilebilir adı, C7'nin 0 piksel iddiası; plan turunda `teslimToplamaPlani`'nin haritasız imzası, AC-32'nin parantezi, A-R5/2'nin ibare metni; uygulamada özet örneklerinin sırası ve AC-28'in uygulamadaki sonucu) |
| **Mockup** | https://claude.ai/artifact/Cu7yunF7o6f3q8BRJpmCDx (yedi adım; onay ve pencere metinleri teklif) |

---

## Intent

Üretimi biten bir kalıp bugün "KALIP HAZIR · TESLİM BEKLİYOR" pilinde kalıyor ve o pili kapatmanın tek yolu müşteri kaydını **Düzenle** ile açıp kalıp satırının durum seçicisinden "Teslim edildi" seçmek. Teslimi yapan kişi listede pili görüyor ama kapatmak için kaydın tamamını düzenleme iznine ve o forma gitmeye mecbur kalıyor; makinayla birlikte giden altı kalıpta bu altı seçim demek.

İlk tur iki yolu birlikte onayladı: durumlar detaydan değiştirilsin (geri alma yolu) ve makina teslim edilince hazır bekleyen kalıplar için onay sorulsun (hız). İkinci tur birinci yolun yerini değiştirdi: durum seçicileri kalıp kartının içine konursa kart satır listesine döner ve **detay penceresi aşağı doğru uzar**. Bu gerçek bir bedel, çünkü kalıp kümesi büyük: spec 0110'un ölçümünde 1265 canlı müşterinin 1264'ünde kalıp var, 1106'sında birden fazla ve Extra Kalıp'ı olanlarda medyan küme 5, en büyüğü 15. Onbeş satırlık bir liste, zaten uzun olan detay penceresinin ortasına girer ve altındaki İşlemler, Sahiplik Geçmişi ve Makina Geçmişi bölümlerini ekranın dışına iter.

Çözüm kartı büyütmek değil, durumları kendi penceresine almak: makina durumunun yanında kalıpların durum özeti ve onu açan bir düğme durur, pencere yalnız **makinayla verilen** kalıpları listeler. Extra Kalıp satışları oraya girmez, çünkü onlar kendi kayıtlarıdır ve durumları zaman çizelgesinden yönetilir.

Başarı şöyle görünür: teslimi yapan kişi müşteri detayını açar, makina durumunun yanında "1 Üretimde · 2 Hazır" özetini görür (Plan kararı 29), makina durumunu "Teslim edildi" yapar ve çıkan onayda hazır bekleyen kalıpların da işaretlenmesini kabul eder; yanlış işaretlenmiş tek bir kalıbı aynı özetin yanındaki düğmeden açılan pencerede, kaydı düzenlemeye girmeden eski durumuna döndürür. Detay penceresinin boyu değişmez.

Özet bir uyarı göstergesi değil, bir envanterdir: teslim edilmiş kalıpları da sayar ve satır, makinayla verilen kalıbı olan her kayıtta çizilir (QA kararı 1). Bugünkü verinin ezici çoğunluğunda bütün kalıplar "Teslim edildi" türetiyor (0110 R1: işareti ve damgası boş kalıp teslim sayılır), yani teslim gizlenseydi satır da düğme de tam o kayıtlarda kaybolur ve yukarıdaki geri alma yolu hiç açılmazdı.

---

## Requirements

### A — Kalıp durumları makina durumunun yanındaki pencereden değiştirilir

- **A-R1.** Detay penceresinde makina durumu satırının hemen altına ikinci bir satır gelir: "Kalıp durumu" etiketi (`KALIP_DURUMU_ETIKETI`), makinayla verilen kalıpların durum özeti ve pencereyi açan düğme. Satır makina durumu satırının kardeşi olan kendi `div`'idir, aynı yazı tipi ve aynı alt boşlukla çizilir.
- **A-R1/2.** Satırın kapısı makina durumu satırıyla birebir aynıdır: yalnız `isCustomer`. Satırın kimliği `data-testid="detay-kalip-durumu"` (QA kararı 2, 14; Tuzak T4).
- **A-R1/3.** Özet satırı, kalıp durumları penceresi ve B parçasının teslim onayı **tek yeni dosyada** toplanır: `src/components/customers/detail/KalipDurumlari.jsx`. `CustomerDetailModal` yalnız bu dosyanın bileşenlerini ve `musteriDurumu.js`'in saf yardımcılarını çağırır; makina durumu satırı ve `MakinaDurumuSecici` yerinde kalır. Böylece spec 0110 AC-17'nin dokuz adlık yasağı (Ölçüm F) **hiç ters çevrilmez**, yeni dosya o taramanın ekran listesine eklenir (QA kararı 11).
- **A-R2.** **Kalıp kartı değişmez:** bugünkü rozet bulutu, başlıktaki sayı ve Extra Kalıp satırlarının ayrı tinti aynen kalır. Karta durum, seçici ya da düğme eklenmez.
- **A-R3.** Özet metni yalnız makinayla verilen kalıpları sayar ve **bütün durumları** `KALIP_SIRASI` sırasıyla (en geriden en ileriye) yazar; "Teslim edildi" de sayılır ve en sonda görünür ("2 Hazır · 1 Teslim edildi"). `kalipPili`'nin "teslim edilmiş kalıp paydaya girmez" kuralı burada uygulanmaz (Ölçüm 10, QA kararı 1). Satırın tek çizim koşulu makinayla verilen kalıp sayısının sıfırdan büyük olmasıdır.
- **A-R3/2.** Metnin biçimi: durum adları `KALIP_DURUM_ADLARI`'ndan harfi harfine alınır (küçültme yapılmaz), ayraç orta noktadır ve sayı tek durumlu kümede de yazılır ("3 Hazır"). Metni kuran yardımcı kütüphanededir ve hiçbir modül içe almaz (spec 0106 AC-42, Ölçüm H: `musteriDurumu.js`'te `^import` yasak, yani `trLower` ile küçültme yapılamaz). QA kararı 16.
- **A-R4.** Düğme `cust_detail_edit` izniyle çizilir; izin yoksa ya da salt okunur moddaysa özet kalır, düğme çizilmez. **Bayi dalı yoktur:** satır A-R1/2'nin `isCustomer` kapısında olduğu için bayi kaydında hiç çizilmez, ayrıca `CustomerDetailModal` uygulamada yalnız `isCustomer=true` ile çizilir (Ölçüm B; Bayiler sekmesi `SimpleDealers`). QA kararı 2.
- **A-R5.** Pencere yalnız makinayla verilen kalıpları listeler. Extra Kalıp satışından gelen satırlar listede **hiç çizilmez**; kayıtta varsa pencerenin altında bir ibareyle söylenir ve durumlarının zaman çizelgesinden yönetildiği yazılır.
- **A-R5/2.** İbare kütüphanede tek sabittir ve adresi verir: "`n` Extra Kalıp satışı bu listede yoktur; durumları Makina Geçmişi'ndeki satırından yönetilir." Aynı ibare özetin bu satışları saymadığını, ama "Teslim Bekleyenler" süzgecine girdiklerini de söyler (QA kararı 10, 15; Tuzak T7). **Plan kararı 27 ile metnin kesin hâli:** "`n` Extra Kalıp satışı bu listede ve özette yoktur; durumları Makina Geçmişi'ndeki satırından yönetilir ve Teslim Bekleyenler süzgecine girer." (ilk metin süzgeci anmıyordu, AC-27'yi karşılamıyordu).
- **A-R6.** Pencerenin her satırında sıra numarası, kalıbın bugünkü metni (`ölçü — ad`) ve durum seçicisi bulunur (`KalipDurumuSecici`, ilk seçeneği bugünkü türetmeyi yazan "Otomatik (…)").
- **A-R6/2.** Sıra numarası **`kaliplar` dizisindeki konumdur** (`i + 1`), süzülmüş listedeki sıra değil; ayna satırlar listeden düştüğü için ikisi farklı sonuç verir ve kullanıcı aynı kalıbı formda "4." pencerede "3." görürdü. Numara böylece `kalipIdx`'in kendisidir ve form ile pencere aynı dili konuşur (QA kararı 7).
- **A-R6/3.** Seçicinin erişilebilir adı müşteri formunun desenidir: `${i + 1}. kalıp durumu` (`CustomerAddEditForm.jsx:374` emsali). Varsayılan ad kullanılmaz, çünkü `KalipDurumuSecici`'nin varsayılanı `KALIP_DURUMU_ETIKETI`'dir ve on beş satırda on beş aynı ad doğar, üstelik satırın kendi etiketiyle çakışır (Ölçüm C). Satırın kimliği `data-testid="kalip-durum-satiri"` (QA kararı 7, 14).
- **A-R7.** Yazım tek yoldan yapılır: `durumYaz(kalip, "kalipDurumu", deger)` ile kaydın `kaliplar` dizisinde o konuma, `setCustomers` ile ve pencere kapanmadan. Ekran durum dizesi karşılaştırması yazmaz, türetmeyi kendi yeniden hesaplamaz.
- **A-R8.** "Bu satır Extra Kalıp satışından mı geldi" sorusu tek yardımcıda cevaplanır ve ölçüt kartın bugünkü ölçütüdür (`partSaleId` dolu **ya da** satır, o müşterinin Extra Kalıp satış sayısı kadar sondaki satırlardan biri). Kartın çizimi, özetin sayısı, pencerenin listesi ve B parçasının toplu işaretlemesi aynı yardımcıyı çağırır (Karar 1).
- **A-R9.** Pencere dar açılır: `<Modal title=… maxWidth={560} onClose=…>`, `footer` yok ve **`overflowVisible` verilmez**. 0126'nın seçim penceresi emsali yalnız genişlik ve footer içindir; o pencere `overflowVisible` geçer ve bu işaret `Modal`'ın `maxHeight`'ını ve `overflowY: auto`'sunu kapatır (Ölçüm G), yani birebir kopyalanırsa on beş satırlık liste pencereden taşar ve AC-9 düşer. Kaymayı `Modal`'ın varsayılan `maxHeight: 90vh` + `overflowY: auto` zinciri sağlar. Detay penceresinin yüksekliği hiçbir kalıp sayısında değişmez (QA kararı 8).
- **A-R9/2.** Pencerenin kendi kapat düğmesi yoktur, `Modal`'ın başlık çarpısı yeter: pencere kaydeder gibi davranmaz, her seçim anında yazılır ve bir "Kapat" düğmesi onay izlenimi verir (QA kararı 17).
- **A-R9/3.** Metinler ve kimlikler: pencere başlığı "Kalıp Durumları", düğme metni "Kalıp Durumları" (`Icon name="edit"`, `data-testid="detay-kalip-durumu-dugmesi"`). QA kararı 14.
- **A-R10.** Kalıp durumları penceresi ya da B parçasının onayı açıkken detay penceresinin kapanma yolu çalışmaz (0126 deseni): Escape yalnız üstteki pencereyi kapatır (Karar 3).
- **A-R10/2.** Kapı iki yere birlikte konur: detay `Modal`'ının `onClose`'u **ve** footer'daki "Kapat" düğmesi. İkisi de `Customers`'tan gelen aynı `onClose` prop'unu çağırıyor (`CustomerDetailModal.jsx:955`), yani yalnız biri kapatılırsa öteki yol açık kalır (QA kararı 19).
- **A-R11.** Müşteri formundaki kalıp ızgarası değişmez; ikinci yazma yolu olarak kalır.

### B — Makina teslim edilince hazır kalıplar da işaretlenir

- **B-R1.** Detay penceresinde makina durumu **"Teslim edildi"** seçildiğinde, o kaydın makinayla verilen kalıpları arasında durumu **"Hazır"** olan en az bir kalıp varsa onay penceresi açılır.
- **B-R1/2.** Tetiğin kararı ekranda değil **tek saf yardımcıdadır**: `teslimToplamaPlani(musteri, yeniDeger, { satisAdedi, harita })` (Plan kararı 25: ilk imza `{ kalipSatisAdedi }` haritasızdı, oysa B-R4 türetilmiş "Hazır"ı da kapsar ve türetme üretim formu haritası ister; parametre adı AC-18 gereği ekran değişkeninin adı değildir) yeni değer teslim değilse ya da hazır kalıp yoksa `null`, aksi hâlde `{ sayi, kaliplar }` döner; ekran yalnız `null` denetimi yapar ve hiçbir durum dizesi (ya da `MAKINA_DURUMU.TESLIM` karşılaştırması) yazmaz. B-R1, B-R3, B-R4, B-R5 ve B-R6'nın beşi de bu fonksiyonun dönüşüne iner (QA kararı 4; AC-17).
- **B-R2.** Makina durumu **seçim anında hemen yazılır** (seçici kaydın alanını okuyor, değer geri sıçramasın), sonra onay açılır. Onay yalnız kapsanan kalıp sayısını taşır; kabul edilirse plan **o anın kaydıyla yeniden hesaplanır** ve kapsanan kalıpların her birine `kalipDurumu: "teslim"` tek `setCustomers` çağrısında yazılır; reddedilirse kalıplara dokunulmaz. **İki hâlde de makina durumu yazılır** (onay kalıplar içindir, makina için değil). Konum listesi onayda saklanmaz: onay açıkken yoklama kaydı yeniden yükleyebilir ve saklı indeks başka kalıbı gösterebilir; yeniden hesap aynı yardımcı olduğu için ücretsizdir ve sayı bir azalsa bile yalnız gerçekten hazır olanlar işaretlenir (QA kararı 5).
- **B-R2/2.** Onayın metinleri ve `ConfirmDialog` seçenekleri yazılıdır, çünkü varsayılanlar bir silme onayınındır (Ölçüm I): `title` "Kalıplar da teslim edilsin mi?", mesaj "Makina teslim edildi olarak işaretlenecek. Hazır bekleyen `n` kalıp da teslim edildi sayılsın mı?", `icon` ve `confirmIcon` `"check"`, `confirmLabel` "Evet, İşaretle", `cancelLabel` "Yalnız makina", `confirmVariant` varsayılan birincil. İptal düğmesi "Vazgeç" değildir, çünkü vazgeçmek makina durumunu iptal etmez (QA kararı 6).
- **B-R3.** Hazır kalıp yoksa onay açılmaz, makina durumu doğrudan yazılır.
- **B-R4.** Kapsam yalnız durumu "Hazır" olan kalıplardır (elle yazılmış ya da türetilmiş, ikisi de). Üretimde, sipariş verilmiş, sipariş bekleyen ve zaten teslim edilmiş kalıplara dokunulmaz (Karar 2).
- **B-R5.** Extra Kalıp satışından gelen satırlar kapsam dışıdır, sayıya da girmez (Karar 1, A-R8).
- **B-R6.** Makina durumu "Teslim edildi"den başka bir değere çevrilince kalıplara dokunulmaz, onay da açılmaz. Teslim işareti kullanıcının kararıdır ve geri alınması A parçasının penceresinden, kalıp kalıp yapılır.
- **B-R7.** Hangi kalıpların kapsandığı ve yeni `kaliplar` dizisi tek saf yardımcıda hesaplanır (`musteriDurumu.js`); ekran karar yazmaz. Yardımcı saat okumaz, React almaz.
- **B-R7/2.** Kalıp durumları penceresi ile teslim onayı **tek durum alanını** paylaşır (ör. `null | "liste" | { onay: n }`), yani ikisinin birden açık olduğu hâl kodda temsil edilemez (Tuzak T6, QA kararı 18).
- **B-R8.** Onay kabul edilince özet metni aynı çizimde güncellenir (kayıt canlı türetildiği için ek tazeleme gerekmez).

---

## Constraints

- **C1.** Yeni kalıcı alan, yeni izin kimliği, yeni sunucu kuralı, yeni bölüm eşlemesi, yeni birleştirme kuralı ve göç yoktur. Kullanılan alan 0106'nın `kalipDurumu`'sudur.
- **C2.** Yazma kapısı `cust_detail_edit`; makina durumu satırıyla aynı izin. Sunucu `customers` bölümünü bölüm düzeyinde güvenir (alan denetimi yok, Ölçüm 9).
- **C2/2.** Bölüm düzeyinde güvenin iki ucu ölçülür: `tabs: ["customers"]` + `customerActions: ["cust_detail_edit"]` kullanıcısı kalıp durumu yazarken 200, `customerActions: []` kullanıcısı 403 alır (`server-security.cjs`, emsal spec 0145'in `stokKalipci` kullanıcısı). Yazım hem sekme hem grup kapısından geçiyor (Ölçüm J: `BOLUM_SEKMELERI.customers` beş sekme sayar), bu yüzden kriter iki kapıyı birlikte adlandırır (QA kararı 12).
- **C3.** Kilit: detay penceresi zaten `customer` kilidini tutuyor (Ölçüm 7); yeni kilit alanı açılmaz, pencere ek kilit almaz, kayıt anında ek denetim yapılmaz.
- **C4.** Extra Kalıp satışlarının durumu bu pencereden ne yazılır ne listelenir. Yazma yolu bugünkü gibi zaman çizelgesinin seçicisidir (`cust_kalip_edit`).
- **C5.** `kalipDurumuOf`, `kalipDurumuTuret`, `durumYaz`, `KalipDurumuSecici` ve pil hesabı yeniden yazılmaz, olduğu gibi çağrılır.
- **C6.** Spec 0110'un R13/R19 kararı ("detayda kalıp durumu gösterilmez, yazma yolu form ve zaman çizelgesidir") **kartın görünümü için korunur, detay penceresi için kısmen geri alınır**: kart dokunulmaz, durum detayın yeni bir penceresinden okunur ve yazılır. Ters çevrilen test kriterleri uygulama planında tek tek listelenir ve test yorumlarına "spec 0146 ile" notu düşülür.
- **C7.** Görsel kanıt: yeni satır kalıp kartının **üstüne** girdiği için kalıbı olan müşteri detay ekranlarında altındaki her şey satır yüksekliği kadar kayar; kanıt aracında on yedi `musteri-detay-*` ekranı var ve en az üçü doğrudan kalıp kartına kaydırıyor (Ölçüm D). Bu yüzden "bütün var olan ekranlar 0 piksel" beklentisi karşılanamaz. Doğru beklenti: kalıbı olan müşteri detay ekranları bilinçli değişir ve `kanit-eslemesi.json`'da `beklenen: "degisti"` + `onay` (`Takım Yöneticisi · 2026-11-16 · spec 0146 A-R1`) ile girer; kalıbı olmayan detay ekranları (`musteri-detay-bos` gibi) ve detay dışındaki bütün ekranlar 0 piksel verir; yeni satır ve yeni pencere kendi ekranlarıyla eklenir (QA kararı 3).
- **C8.** Detay penceresinin yüksekliği kalıp sayısından bağımsız kalır (A-R9); listeyi pencere dışına taşıran hiçbir çözüm kabul edilmez.
- **C8/2.** A-R9'un ölçüm yöntemi: jsdom yerleşim hesaplamaz, bu yüzden pencere kabının `maxHeight`/`overflowY` stili ve `overflowVisible` verilmediği jsdom'da iddia edilir; detayın yüksekliğinin kalıp sayısından bağımsızlığı kaynak iddiası ve 0 piksel kanıtıyla karşılanır. **Yeni Electron yerleşim testi açılmaz** (emsal `form-pencere-yerlesim.test.js` ve `bayi-modal-layout.test.js` var ama kalıp sayısı detayda hiçbir öğeyi büyütmediği için ölçülecek yerleşim riski yok; QA kararı 9).

---

## KAPSAM DIŞI

- **X1.** Extra Kalıp satışlarının toplu teslimi ve bu pencereden yönetilmesi (satış kendi kaydıdır).
- **X2.** Ters yön: makina durumunun kalıplardan türemesi.
- **X3.** Teslim tarihinin saklanması. Bu spec yalnız durumu yazar; "ne zaman teslim edildi" sorusu kalıcı bir alan ister ve ayrı iştir.
- **X4.** Müşteri listesinden ya da Teslim Bekleyenler süzgecinden toplu teslim.
- **X5.** Detay penceresindeki öteki altı onayın **ve iç içe açılan altı `Modal`'ın** (Yeni Sahip, ödeme, Extra Kalıp kaydı, yedek parça, sandık etiketi, sahiplik geçmişi düzeltme) Escape davranışının düzeltilmesi (bugün Escape hem üsttekini hem detay penceresini kapatıyor, Ölçüm 8). Yalnız bu spec'in iki penceresi korunur; aynı kusur altı pencerede de var ve bugünkü davranışta kalır (QA kararı 19).
- **X6.** `kalipIdx`'in konum olmasından doğan kayma (0106 bilinen sınırı); kalıp silinip eklenince bağın kayması bu spec'te çözülmez.
- **X7.** `detailKalipSatisAdedi`'nin çöpteki Extra Kalıp satışlarını saymasının düzeltilmesi (Ölçüm 3).
- **X8.** Kalıp kartının görünümünün elden geçirilmesi (rozet bulutu kalıyor; durum bilgisi karta hiç girmiyor).
- **X9.** Kalıp durumlarının toplu değiştirilmesi (pencerede "hepsini teslim yap" gibi bir düğme yok; toplu işlem yalnız B parçasının makina teslimiyle tetiklenen onayıdır).
- **X10.** Müşteri formundan (ikinci yazma yolu, A-R11) makina durumu "Teslim edildi" yapılınca onay sorulmaz ve kalıplara dokunulmaz. Formda kalıp seçicileri zaten satır satır elde olduğu için onay orada hız kazandırmaz ve iki yerde iki tetik bakım yüküdür (QA kararı 13).
- **X11.** Makinayla verilen kalıbı olmayıp yalnız Extra Kalıp satışı olan kayıtta hiçbir ibare görünmez (satır çizilmediği için pencere de açılmaz, A-R5/2'nin ibaresi de görünmez). Kabul edilir: o kayıtta yönetilecek makina kalıbı yok, boş pencere açmak gürültüdür; sürüm notunda yazılır (QA kararı 24).

---

## Context

### Ölçümler (2026-11-15, çalışma ağacı `main`)

1. **Makina durumu satırı** `CustomerDetailModal.jsx:1144-1152`: kalıp kartının hemen üstünde, yalnız `isCustomer`, `cust_detail_edit` varsa `MakinaDurumuSecici`, yoksa salt okunur ad. Yazım `setCustomers(p => p.map(c => c.id === detailView.id ? durumYaz(c, "makinaDurumu", v) : c))`, yani pencere kapanmadan.
2. **Kalıp kartı** `:1153-1166`: `KartBolum`, başlık "Kalıplar (n)", gövdesi `flex-wrap` rozet bulutu, her rozet `ölçü — ad`. Durum yok. Ayna satır ölçütü satır içinde: `k.partSaleId != null || i >= detailView.kaliplar.length - detailKalipSatisAdedi`.
3. **`detailKalipSatisAdedi`** `detail/deriveCustomerDetail.js:220`: o müşterinin `tur === "Kalıp"` satışlarının sayısı; **çöptekiler süzülmüyor** (`deletedAt` denetimi yok). Yani çöpe atılmış bir Extra Kalıp satışı kartın son satırlarını yanlışlıkla "Extra Kalıp'tan" gösterebilir.
4. **Kütüphanenin ayna ölçütü** `musteriDurumu.js` `aynaSatirMi`: yalnız `partSaleId != null`. Ölçüm 2'deki konum tahmini burada yok. İki ölçüt çelişiyor (Tuzak T1).
5. **Durum okuma ve yazma** `musteriDurumu.js`: `kalipDurumuOf(k, musteriKalipAnahtari(musteriId, i), harita)` elle değer varsa onu, yoksa türetmeyi verir; `durumYaz` tek yazıcıdır (alanı her çağrıda siler, geçerli değeri geri yazar); `KalipDurumuSecici` `turetilen` alır ve ilk seçeneği "Otomatik (…)" yazar; `KALIP_SIRASI` en geriden en ileriye sıralıdır ve bugün onu yalnız `kalipPili` okur (özet metni henüz yok, A-R3 ile yazılacak; düzeltilen iddia 1).
6. **Bağlam elde:** `durumBaglami` prop'u detay penceresine zaten geliyor (`CustomerDetailModal.jsx:72`) ama bugün yalnız zaman çizelgesine iletiliyor (`:1235`). Harita ve Extra Kalıp grubu için yeni prop zinciri gerekmez.
7. **Kilit:** pencere açılışta `useLock("customer", detailView?.id)` ile müşteri kaydının kilidini alıyor (`:118`). Kalıp durumu müşteri kaydının alanıdır, yani bu kilidin altındadır.
8. **Escape:** `ConfirmDialog` (`ui.jsx:477-482`) ve `Modal` Escape'i ikisi de `window`'da dinliyor. Bugün detaydaki altı onayda Escape hem onayı hem detay penceresini kapatıyor.
9. **Sunucu:** `customers` bölümünün sekme eşlemesi `serverAuth.cjs:101`; `ALAN_IZINLERI` (`:583-587`) yalnız `services.durum`, `partSales.kargoDurum` ve `yedekParcaSatislar.kargoDurum` alanlarını denetliyor, `customers` listede yok. Kalıp durumu bölüm düzeyinde geçer, yeni kural gerekmez.
10. **Süzgeç ve pil:** `satirDurumu` → `teslimBekliyor` = makina "Hazır" **ya da** en az bir kalıp "Hazır". `kalipPili` paydasında teslim edilmiş kalıp sayılmaz. Yani makina teslim edilip hazır kalıplar da işaretlenince kayıt "Teslim Bekleyenler" süzgecinden çıkar.
11. **İkinci yazma yolu** `CustomerAddEditForm.jsx:330-397`: ızgaranın her satırında "Üretim formuna gönder" kutusu ve durum seçicisi; ayna satırda ikisinin yerine salt okunur ibareler.
12. **`ConfirmDialog` seçenekleri** `ui.jsx:477`: `title`, `icon`, `confirmLabel`, `confirmIcon`, `cancelLabel`, `confirmVariant` dışarıdan verilebilir; bu onay bir silme değildir, yani varsayılan kırmızı "Evet, Sil" metni ve çöp ikonu değiştirilir.
13. **Küme büyüklüğü (0110'dan devralınan ölçüm, 2026-10-22 yedeği):** 1265 canlı müşterinin 1264'ünde kalıp var, 1106'sında birden fazla; Extra Kalıp'ı olan 545 müşteride medyan küme 5, en büyük 15. Durum seçicileri kartın içine konsaydı detay penceresi bu kayıtlarda onbeş satır uzardı; A-R2 ve C8 bu ölçüme dayanıyor.
14. **Dar pencere emsali** (0126): Evrak'ın seçim penceresi `maxWidth={600}`, `wide` değil ve footer taşımıyor. Kalıp durumları penceresi bu emsali izler; spec 0050'nin `wide` kuralı gider ve Kasa'nın veri girme pencerelerini kapsar, bu pencere o kümede değildir.

### Tuzaklar

- **T1. İki ayna ölçütü çelişiyor.** Ekran konumla tahmin ediyor (Ölçüm 2), kütüphane kimliğe bakıyor (Ölçüm 4). `partSaleId` taşımayan eski kopya satırlar bu yüzden kartta "Extra Kalıp'tan" görünürken kütüphanede kendi kalıbı sayılıyor. Özet, pencere ve toplu işaretleme tek yardımcıyı okumazsa üç yerde üç farklı sayı doğar (A-R8).
- **T2. Elle yazılan değer kalıcıdır.** `kalipBekliyorMu` elle yazılmış "Hazır" ve "Teslim edildi" değerlerinde koşulsuz `false` döner (`musteriDurumu.js:124`), yani toplu işaretlenen kalıp bir daha bekleyen kalıp listesine ve üretim formunun getirmesine girmez. Onay bu yüzden gereklidir; sessiz toplu yazım geri alınması pahalı bir karardır.
- **T3. `detailView` canlı türetiliyor** (`customers.find(c => c.id === detailViewId)`), yani `setCustomers` sonrası özet, pencere ve pil aynı çizimde güncellenir; ayrı bir tazeleme gerekmez.
- **T4. Satır `isCustomer` kapısı taşımalı.** Makina durumu satırı yalnız müşteride çiziliyor ama kalıp kartı her kayıtta. Yeni satırın kapısı A-R4'te ayrıca yazıldı; unutulursa bayi kaydında anlamsız bir özet ve düğme doğar.
- **T5. Üç sayı aynı ölçütten gelmeli.** Özet "2 hazır" derken pencere üç satır, onay "1 kalıp" diyorsa kullanıcı hangisinin doğru olduğunu bilemez; üçü de A-R8'in yardımcısını okur.
- **T6. Pencere açıkken makina durumu da değişebilir.** Kullanıcı kalıp penceresini kapatmadan makina durumunu değiştiremez (pencere üstte), ama tersi olur: onay açıkken kalıp penceresi açılmamalı. Pencerelerin sırası tek durumda tutulur, ikisi aynı anda açılmaz (B-R7/2).
- **T7. Özet ile liste pili ve süzgeç farklı küme sayar.** `kalipKumesi` ayna olmayan müşteri kalıplarına o kaydın canlı Extra Kalıp satışlarını da ekler ve teslim edilmişi paydadan düşürür (Ölçüm E); yeni özet yalnız makinayla verilen kalıpları sayar ve teslimi de yazar. Sonuç: hazır bir Extra Kalıp satışı olan kayıt, bütün makina kalıpları teslim edilse de "Teslim Bekleyenler"de kalır ve özet "hazır kalıp yok" der. Karar 1 iki ölçütün ayrı kalmasını zaten kabul etti; beklentiyi A-R5/2'nin ibaresi karşılar, kriter değil.
- **T8. `overflowVisible` kaymayı kapatır.** 0126'nın seçim penceresi onu geçiyor ve işaret `Modal`'ın `maxHeight`'ını ve `overflowY: auto`'sunu iptal ediyor (Ölçüm G); emsal birebir kopyalanırsa on beş satırlık liste pencereden taşar.
- **T9. İki pencere aynı `zIndex`'te.** `Modal` 1000, `ConfirmDialog` 1100 (Ölçüm G); yeni pencere de bir `Modal` olduğu için detay penceresiyle aynı katmandadır ve üstte görünmesi yalnız **DOM sırasından** gelir. Yeni pencere detay `Modal`'ından sonra, onun kardeşi olarak çizilir (0126 deseni).
- **T10. `ConfirmDialog`'un varsayılanı bir silme onayıdır.** `title` "Emin misiniz?", `icon` ve `confirmIcon` `trash`, `confirmLabel` "Evet, Sil", `confirmVariant` `danger` (Ölçüm I); seçenekler verilmezse teslim onayında kırmızı "Evet, Sil" ve çöp ikonu çıkar (B-R2/2).
- **T11. Onayda saklanan konum listesi bayatlar.** Onay açık dururken 10 saniyelik yoklama kaydı yeniden yükleyebilir (`veriYenilenebilirMi` yalnız kendi kaydımızı bekler) ve saklı indeks başka kalıbı gösterebilir; bu yüzden plan kabul anında yeniden hesaplanır (B-R2).
- **T12. İki yazma yolu aynı anda açılamaz.** `openEdit` detay penceresini kapatıyor (Ölçüm K), yani form taslağı ile pencerenin yazımı çakışmaz; ölçüldü, ek bir koruma gerekmez.

### QA turunda ölçülenler (2026-11-16, çalışma ağacı `main`, v3.59.0)

- **Ölçüm A.** Detay penceresinin kapanma yolu tek prop'tur: `Modal`'ın `onClose`'u ve footer'daki "Kapat" düğmesi aynı `onClose`'u çağırır (`CustomerDetailModal.jsx:955`); prop `Customers.jsx:705`'te `setDetailViewId(null); onDetailClosed?.()`. A-R10'un kapısı bu yüzden iki yere konur.
- **Ölçüm B.** `CustomerDetailModal` uygulamada yalnız `isCustomer=true` ile çizilir: Müşteriler sekmesi `Customers`, Bayiler sekmesi `SimpleDealers` (`App.jsx:1762`, `:1763`). `Customers`'ın `isCustomer=false` kolu hiçbir sekmede kullanılmıyor, yani A-R4'ün bayi dalı ölü daldı.
- **Ölçüm C.** `KalipDurumuSecici`'nin varsayılan erişilebilir adı `KALIP_DURUMU_ETIKETI`, yani "Kalıp durumu" (`DurumSecici.jsx`); müşteri formu bunu satır başına eziyor, seçiciye `${i + 1}. kalıp durumu` adını geçiyor (`CustomerAddEditForm.jsx:374`).
- **Ölçüm D.** Kanıt aracında on yedi `musteri-detay-*` ekranı var (`scripts/evidence/0009-sayfa.jsx`); `musteri-detay-0067` ve `musteri-detay-0110-kalip` doğrudan `kaydir:Kalıplar (` adımıyla çekiliyor, yani kalıp kartının çevresi görünür alanda.
- **Ölçüm E.** `kalipKumesi` kümesi: ayna olmayan müşteri kalıpları **artı** o kaydın canlı Extra Kalıp satışları; `aynaSatirMi` yalnız `partSaleId`'ye bakar. `kalipPili` teslim edilmişi paydadan düşürür. Yani liste pili ve "Teslim Bekleyenler" süzgeci, yeni özetten farklı bir küme sayar.
- **Ölçüm F.** spec 0110 AC-17 (`tests/kalip-durumu-0110.test.js:148`) `CustomerDetailModal.jsx`'te dokuz adı yasaklıyor (`KalipDurumuSecici`, `kalipDurumuTuret`, `aynaDurumu`, `aynaSatirMi`, `musteriKalipAnahtari`, `KALIP_DURUM_ADLARI`, `AYNA_SATIR_IBARESI`, `detay-kalip-satiri`, `ayna-kalip-durumu`) ve `MakinaDurumuSecici`'nin orada kalmasını istiyor.
- **Ölçüm G.** `Modal` (`ui.jsx:440-473`): `overflowVisible` verilince `maxHeight` `undefined` olur ve `overflowY` yazılmaz, yani gövde kaymaz; verilmezse `maxHeight` `90vh` (footersüz, `wide` değil) ve `overflowY: auto`. `zIndex` `Modal`'da 1000, `ConfirmDialog`'da 1100.
- **Ölçüm H.** `musteriDurumu.js` hiçbir modül içe almaz; spec 0106 AC-42 bunu taramayla sabitliyor (`^import`, `new Date`, `set[A-Z]\w*\(` yasak). Yeni yardımcılar da import edemez, yani `trLower` ile Türkçe küçültme yapılamaz.
- **Ölçüm I.** `ConfirmDialog` varsayılanları (`ui.jsx:477`): `title` "Emin misiniz?", `icon` `"trash"`, `confirmLabel` "Evet, Sil", `confirmIcon` `"trash"`, `cancelLabel` "Vazgeç", `confirmVariant` `"danger"`; altısı da dışarıdan verilebilir.
- **Ölçüm J.** `BOLUM_SEKMELERI.customers` = `["customers", "dealers", "stock", "settings", "evrak"]` (`serverAuth.cjs:101`); `SECTION_GROUP.customers` `customerActions`. `Customers`'ın `canDo`'su `dealer_` önekli olmayan her kimliği `customerActions`'a eşler (`Customers.jsx:81-85`), yani `cust_detail_edit` bayi kolunda da müşteri grubundan okunur.
- **Ölçüm K.** `openEdit` detay penceresini kapatıyor (`Customers.jsx:280`, yorumu "çift kilit sorununu çözer"), yani müşteri formu ile kalıp durumları penceresi aynı anda açık olamaz ve taslak çakışması doğmaz.
- **Ölçüm L.** 0106 kaynak taraması (`tests/musteri-durumu-0106.test.js:192`): `src/components` altında tırnaklı durum dizesi dört gerekçeli istisnayla **tam eşitlik** olarak sabitlenmiş (yeni bir tırnaklı "teslim" testi kırar) ve ekran listesinde `kalipDurumu ===` / `makinaDurumu ===` deseni yasak. Sabit üzerinden karşılaştırma (`MAKINA_DURUMU.TESLIM`) taramanın harfine takılmaz ama ruhuna aykırıdır; B-R1/2 bu yüzden kararı kütüphaneye taşır.

### QA turunda verilen kararlar (2026-11-16)

Hepsi analistin önerisi yönünde ve Takım Yöneticisi tarafından olduğu gibi onaylandı.

**Bloklayıcı**

1. **Özet teslim edilmiş kalıpları da sayar, satır makinayla verilen kalıp varsa her zaman çizilir** (A-R3). — *neden:* pencere bir düzeltme yoludur, pil gibi "dikkat çekmesi gereken durum" göstergesi değil; 0110 R1'den beri işareti ve damgası boş kalıp teslim türetiyor, yani teslim gizlenirse en yaygın kayıtta satır ve düğme kaybolur ve Intent'in söz verdiği geri alma yolu hiç açılmaz.
2. **Satır `isCustomer` kapısındadır, A-R4'ün bayi dalı düşer** (A-R1/2, A-R4). — *neden:* A-R4 ile Tuzak T4 iki farklı davranış yazıyordu ve bayi dalı ölçülemez (Ölçüm B); izin dalı gerçek ve ölçülebilir.
3. **C7 yeniden yazılır: kalıbı olan detay ekranları bilinçli değişir (`beklenen: "degisti"` + Takım Yöneticisi onay satırı), 0 piksel yalnız kalıbı olmayanlarda** (C7). — *neden:* yeni satır kalıp kartının üstüne giriyor ve on yedi detay ekranının kalıplılarını kaydırıyor (Ölçüm D); yanlış beklentiyle başlanırsa kanıt turu sonda tıkanır ve onay satırı o anda alınmak zorunda kalır.

**Önemli**

4. **Toplu teslimin tetiği tek saf yardımcıda (`teslimToplamaPlani`), ekran dize yazmaz** (B-R1/2). — *neden:* B-R1, B-R3, B-R4, B-R5 ve B-R6 tek fonksiyonun dönüşüne iner ve ekran dosyası durum dizesinden temiz kalır (Ölçüm L).
5. **Makina durumu seçim anında yazılır, onay yalnız sayı taşır, plan kabul anında yeniden hesaplanır, yazım tek `setCustomers`** (B-R2). — *neden:* saklı konum listesi onay açıkken bayatlayabilir (Tuzak T11); yeniden hesap aynı yardımcı olduğu için ücretsiz.
6. **Onay metinleri ve `ConfirmDialog` seçenekleri yazılı** (B-R2/2). — *neden:* varsayılanlar bir silme onayınındır (Ölçüm I) ve iptal düğmesi "Vazgeç" olursa makina durumunun yine yazıldığı gizlenir.
7. **Sıra numarası `kaliplar` dizisindeki konumdur, seçicinin adı `${i + 1}. kalıp durumu`, satır kimliği `kalip-durum-satiri`** (A-R6/2, A-R6/3). — *neden:* numara `kalipIdx`'in kendisi olunca pencere, form ve üretim formu bağı aynı dili konuşur; varsayılan ad on beş satırda on beş kez tekrarlanır (Ölçüm C).
8. **`maxWidth={560}`, `footer` yok, `overflowVisible` verilmez** (A-R9). — *neden:* kaymayı `Modal`'ın `maxHeight` + `overflowY` zinciri sağlıyor ve `overflowVisible` tam o zinciri iptal ediyor (Tuzak T8).
9. **AC-9 jsdom'da stil iddiasıyla ölçülür, yeni Electron yerleşim testi açılmaz** (C8/2). — *neden:* kalıp sayısı detay penceresinde hiçbir öğeyi büyütmüyor, ölçülecek yerleşim riski yok ve Electron testi on dakikalık koşuya karşılıksız yük katar.
10. **AC-11 koşullanır, ibare özet ile süzgecin farkını söyler** (A-R5/2, AC-11). — *neden:* özet ile pil farklı küme sayıyor (Ölçüm E, Tuzak T7) ve Karar 1 iki ölçütün ayrı kalmasını zaten kabul etti; beklentiyi kriter değil ibare karşılamalı.
11. **Özet satırı, pencere ve onay yeni dosyada (`detail/KalipDurumlari.jsx`) toplanır, spec 0110 AC-17 ters çevrilmez** (A-R1/3, C6). — *neden:* dokuz adın yasağı kartın sadeliğinin bekçisi; kart dokunulmadığı için bekçiyi gevşetmeye gerek yok.
12. **AC-22'nin ölçüm kullanıcısı iki uçla pinlenir** (C2/2, AC-22). — *neden:* yazım hem sekme hem grup kapısından geçiyor (Ölçüm J); iki uç birlikte ölçülmezse "bölüm düzeyinde güvenilir" iddiası kanıtlanmaz.
13. **Form yolunda onay sorulmaz** (X10). — *neden:* formda kalıp seçicileri satır satır elde, onay hız kazandırmaz ve iki tetik bakım yüküdür.

**Küçük**

14. **Pencere başlığı, düğme metni ve kimlikler yazılı** (A-R1/2, A-R6/3, A-R9/3). — *neden:* metinler spec'te durmazsa üç ayrı yerde üç ad doğar ve testler kimliksiz kalır.
15. **A-R5'in ibaresi kütüphanede tek sabit ve adres verir** (A-R5/2). — *neden:* kullanıcı eksik kalıbı arayacak, ibare nereden yönetildiğini söylemeli.
16. **Özet metninin biçimi: ad harfi harfine, orta nokta ayraç, sayı her zaman** (A-R3/2). — *neden:* kütüphane hiçbir şey içe almıyor (Ölçüm H), yani küçültme yapılamaz; sayıyı hep yazmak "3 Hazır" ile "Hazır" belirsizliğini kaldırır.
17. **Pencerede kapat düğmesi yok, başlık çarpısı yeter** (A-R9/2). — *neden:* pencere kaydeder gibi davranmıyor, her seçim anında yazılıyor; "Kapat" düğmesi onay izlenimi verir.
18. **Pencere ve onay tek durum alanını paylaşır** (B-R7/2). — *neden:* iki ayrı bayrakla "ikisi birden açık" hâli kodda temsil edilebilir kalır (Tuzak T6).
19. **A-R10'un kapısı `onClose` ve "Kapat" düğmesine birlikte konur; X5 iç içe altı `Modal`'ı da kapsar** (A-R10/2, X5). — *neden:* ikisi aynı prop'u çağırıyor (Ölçüm A) ve aynı Escape kusuru altı pencerede de var, kapsamın yarısı yazılı kalırsa uygulayıcı hepsini düzeltmeye kalkar.
20. **Ölçüm 5'in son cümlesi düzeltilir** (Ölçüm 5). — *neden:* ölçüm bugünü anlatır, yeni davranışı değil; `KALIP_SIRASI`'nı bugün yalnız `kalipPili` okuyor.
21. **AC-18 ekran değişkeninin adını kütüphaneye taşımaz** (AC-18). — *neden:* `detailKalipSatisAdedi` bir ekran değişkeninin adı, kütüphanede o adla duramaz; kriter ölçütün yerini adlandırmalı, değişkeni değil.
22. **X7'nin kullanıcıya görünen sonucu yazılır** (AC-28, sürüm notu). — *neden:* çöpe atılmış bir Extra Kalıp satışı olan kayıtta son kalıp ya da kalıplar özetten ve toplu işaretlemeden düşer; kullanıcı "altı kalıbım var, onay beşini saydı" diyecek.
23. **AC-20 için yeni altın dosya üretilmez, dokunulmazlık taraması ve var olan testler yeter** (AC-20). — *neden:* dokunulmayan dosya için gövde altını fazladan bakım yükü; spec 0110 AC-20 ızgarayı zaten sabitliyor.
24. **Yalnız Extra Kalıp satışı olan kayıtta hiçbir ibare görünmez, kabul edilir** (X11). — *neden:* o kayıtta yönetilecek makina kalıbı yok, boş pencere açmak gürültü; sürüm notunda yazılır.

### QA turu karar kaydı (2026-11-16)

| # | Konu | Karar | Derece |
|---|---|---|---|
| 1 | Özette teslim durumu | Sayılır, satır kalıp varken her zaman çizilir | Bloklayıcı |
| 2 | Bayi kaydı dalı | Satır `isCustomer` kapısında, bayi dalı düşer | Bloklayıcı |
| 3 | Görsel kanıt beklentisi | Kalıplı detay ekranları `beklenen: "degisti"` + onay | Bloklayıcı |
| 4 | Toplu teslimin tetiği | Saf yardımcı `teslimToplamaPlani`, ekran dizesiz | Önemli |
| 5 | Yazım sırası ve bayat indeks | Durum hemen yazılır, plan kabul anında yeniden hesaplanır | Önemli |
| 6 | Onay metinleri | `ConfirmDialog` seçenekleri yazılı, iptal "Yalnız makina" | Önemli |
| 7 | Satır numarası ve erişilebilir ad | `kaliplar` konumu, `${i + 1}. kalıp durumu` | Önemli |
| 8 | Pencere ölçüsü | `maxWidth={560}`, footer yok, `overflowVisible` yok | Önemli |
| 9 | AC-9'un ölçümü | jsdom stil iddiası, Electron testi açılmaz | Önemli |
| 10 | Özet ile süzgecin farkı | AC-11 koşullanır, ibare farkı söyler | Önemli |
| 11 | Dosya ayrımı | `detail/KalipDurumlari.jsx`, spec 0110 AC-17 korunur | Önemli |
| 12 | Sunucu ölçümü | İki uçlu kullanıcı (200 ve 403) | Önemli |
| 13 | Form yolu | Onay sorulmaz, kalıplara dokunulmaz | Önemli |
| 14 | Metinler ve kimlikler | Başlık, düğme ve testId'ler yazılı | Küçük |
| 15 | Extra Kalıp ibaresi | Tek sabit, adres verir | Küçük |
| 16 | Özet biçimi | Ad harfi harfine, orta nokta, sayı her zaman | Küçük |
| 17 | Pencerenin kapat düğmesi | Yok, başlık çarpısı yeter | Küçük |
| 18 | İki pencerenin sırası | Tek durum alanı | Küçük |
| 19 | Escape kapısının yeri ve kapsamı | İki yola birlikte, X5 altı `Modal`'ı da kapsar | Küçük |
| 20 | Ölçüm 5 | Son cümle düzeltildi | Küçük |
| 21 | AC-18'in ifadesi | Ölçütün yeri adlandırılır, değişken adı değil | Küçük |
| 22 | Çöpteki Extra Kalıp satışı | Bilinen sınır ve sürüm notu | Küçük |
| 23 | AC-20'nin yöntemi | Yeni altın yok, tarama yeter | Küçük |
| 24 | Yalnız Extra Kalıp'ı olan kayıt | İbare görünmez, kabul | Küçük |

### Plan turunda verilen kararlar (2026-11-16)

Hepsi uygulayıcının önerisi yönünde ve Takım Yöneticisi tarafından onaylandı (plan `specs/0146-uygulama-plani.md` §3).

25. **`teslimToplamaPlani` haritayı da alır: `{ satisAdedi, harita }`** (B-R1/2). — *neden:* haritasız fonksiyon türetilmiş "Hazır"ı göremez ve B-R4 düşer; parametre adı AC-18 gereği ekran değişkeninin adını taşımaz.
26. **AC-32 "kalıpların hepsi tek çağrıda" diye okunur** (AC-32). — *neden:* B-R2 ve AC-29 makina durumunun onaydan önce yazılmasını istiyor, bu ayrı bir çağrıdır.
27. **A-R5/2'nin ibaresi süzgeci de anar** (A-R5/2, AC-27). — *neden:* ilk metin AC-27'nin istediği süzgeç cümlesini taşımıyordu.
28. **Onay metinleri tek nesnede (`TESLIM_ONAYI`), Escape onayda "Yalnız makina" sayılır, yazımlar detay penceresinde kalır, ibare `Ipucu` ile çizilir** (B-R2/2, C3). — *neden:* sabit sayısı üçte kalır (başlık, ibare, onay); `ConfirmDialog` Escape'te `onCancel`'ı çağırır ve B-R2 "iki hâlde de makina yazılır" der; yeni dosya `setCustomers` çağırmazsa kilit taramasına girmez ve C3 korunur; sözlük kuralı yerel kopya yasaklar.
29. **Özet örnekleri kurala uyar: "1 Üretimde · 2 Hazır"** (Intent, A-R3, AC-2; uygulamada bulundu). — *neden:* A-R3 ve AC-2'nin kuralı `KALIP_SIRASI` sırasıyla en geri durumdan başlamayı söylüyor ve Karar 4 "özet satırı en geri durumu yazar" diyor, ama iki örnek "2 Hazır · 1 Üretimde" yazıyordu; kural kazandı, örnekler düzeltildi.
30. **AC-28'in kullanıcıya görünen sonucu uygulamada oluşmaz** (Ölçüm 3, AC-28, sürüm notu). — *neden:* `detailKalipSatisAdedi` kendi başına çöpteki satışları süzmüyor, ama App `Customers`'a `livePartSales` veriyor (`App.jsx`, dört `<Customers` çağrısı); çöpteki satış sayıya hiç ulaşmaz. Kriter yardımcı düzeyinde ölçülür, sürüm notundaki cümle kalkar.

---

## Acceptance Criteria

- **AC-1.** Müşteri detayında makina durumu satırının altında "Kalıp durumu" satırı çizilir: etiket, durum özeti ve pencereyi açan düğme.
- **AC-2.** Özet yalnız makinayla verilen kalıpları sayar, `KALIP_SIRASI` sırasıyla en geri durumdan başlar ve teslim edilmiş kalıpları da yazar; iki hazır ve bir üretimdeki kalıbı olan kayıtta "1 Üretimde · 2 Hazır" (Plan kararı 29), iki hazır ve bir teslim edilmiş kalıbı olan kayıtta "2 Hazır · 1 Teslim edildi" yazar. Extra Kalıp satışından gelen hazır bir kalıp bu sayıya girmez.
- **AC-3.** Makinayla verilen kalıbı olmayan kayıtta (yalnız Extra Kalıp satışı olan kayıt dahil) satır hiç çizilmez. Bütün kalıpları "Teslim edildi" olan kayıtta satır **çizilir** ve özet onları sayar.
- **AC-4.** `cust_detail_edit` izni olmayan kullanıcıda düğme çizilmez, özet kalır. `isCustomer=false` ile çizilen kayıtta satırın kendisi hiç çizilmez.
- **AC-5.** Düğme pencereyi açar; pencere yalnız makinayla verilen kalıpları listeler, Extra Kalıp satırları listede çizilmez ve kayıtta varsa bir ibareyle söylenir.
- **AC-6.** Pencerede bir kalıbın durumu değiştirilir; değer `kaliplar` dizisinde yalnız o konuma yazılır, öteki kalıplar ve kaydın başka alanları değişmez.
- **AC-7.** Seçicinin ilk seçeneği o kalıbın bugünkü türetmesini yazar ("Otomatik (Üretimde)" gibi); seçilince alan kayıttan silinir ve durum yeniden türemeye döner.
- **AC-8.** Kalıp kartı spec öncesiyle birebir aynı çizilir: rozet bulutu, başlıktaki sayı, Extra Kalıp tinti; kartta durum, seçici ya da düğme yoktur.
- **AC-9.** Pencere kabı kaymaya hazırdır: `maxWidth` 560, `footer` ve `overflowVisible` verilmemiştir, yani `Modal`'ın `maxHeight` + `overflowY: auto` zinciri yürürlüktedir (jsdom stil iddiası).
- **AC-9/2.** Onbeş kalıplı kayıtta detay penceresinin kendi gövdesine hiçbir satır eklenmez (liste yalnız pencerededir) ve kalıp sayısı detaydaki hiçbir öğeyi büyütmez (kaynak iddiası + görsel kanıt).
- **AC-10.** Makina durumu "Teslim edildi" seçilir ve kaydın hazır durumda iki kalıbı varsa onay penceresi açılır, metninde iki yazar.
- **AC-11.** AC-10'un onayı kabul edilince iki kalıbın `kalipDurumu` alanı `"teslim"` olur, makina durumu da yazılır ve özet aynı çizimde güncellenir. Kaydın başka hazır kalıbı ve hazır Extra Kalıp satışı yoksa kayıt "Teslim Bekleyenler" süzgecinden de çıkar; hazır bir Extra Kalıp satışı varsa süzgeçte kalır (Tuzak T7) ve bunu A-R5/2'nin ibaresi söyler.
- **AC-12.** AC-10'un onayı reddedilince makina durumu yazılır, kalıplara dokunulmaz; özet ve pil değişmez.
- **AC-13.** Hazır kalıbı olmayan kayıtta makina durumu "Teslim edildi" seçilince onay açılmaz ve değer doğrudan yazılır.
- **AC-14.** Üretimde, sipariş verilmiş ve sipariş bekleyen kalıplar toplu işaretlemeye girmez; onay sayısı da onları saymaz.
- **AC-15.** Extra Kalıp satışından gelen hazır kalıp toplu işaretlemeye girmez, sayıya da girmez; satışın `kalipDurumu` alanı değişmez.
- **AC-16.** Makina durumu "Teslim edildi"den "Hazır"a çevrilince onay açılmaz ve kalıpların durumu değişmez.
- **AC-17.** Özet metnini, pencere listesini ve toplu işaretlemenin kapsamını veren yardımcılar saftır: aynı girdiyle aynı sonucu verir, saat okumaz, veri yazmaz; ekran dosyasında durum dizesi karşılaştırması yoktur (kaynak taraması).
- **AC-18.** Ayna satır ölçütü kaynakta tek yerdedir: `src/components` altında `partSaleId` ile Extra Kalıp satış sayısını birlikte okuyan ifade geçmez, ölçüt yalnız `musteriDurumu.js`'tedir (kaynak taraması; yardımcının parametre adı ekran değişkeninin adı değildir). Kartın çizimi, özetin sayısı, pencerenin listesi ve onayın sayısı aynı sonucu verir.
- **AC-19.** Kalıp durumları penceresi açıkken Escape yalnız o pencereyi kapatır, detay penceresi açık kalır. Onay penceresi açıkken de aynısı geçerlidir.
- **AC-20.** Müşteri formundaki kalıp ızgarası spec öncesiyle birebir aynı davranır: `CustomerAddEditForm.jsx`'in ızgara bloğuna dokunulmadığı taramayla sabitlenir ve 0106 ile 0110'un form testleri dokunulmadan yeşil kalır. Yeni altın dosya üretilmez (QA kararı 23).
- **AC-21.** Sunucu kuralı, izin kimliği, veri bölümü, birleştirme kuralı ve veritabanı sütunu eklenmez (anlamsal tarama).
- **AC-22.** `tabs: ["customers"]` ve `customerActions: ["cust_detail_edit"]` kullanıcısının kalıp durumu yazımı sunucuda 200 alır; `customerActions: []` kullanıcısı aynı yazımda 403 alır (uçtan uca ölçüm, `server-security.cjs`).

### QA turu kriterleri (2026-11-16)

**Satır, özet ve pencere**

- **AC-23.** Satırın kimliği `detay-kalip-durumu`, düğmenin kimliği `detay-kalip-durumu-dugmesi`, pencere satırının kimliği `kalip-durum-satiri`; pencere başlığı ve düğme metni "Kalıp Durumları".
- **AC-24.** Özet metnindeki durum adları `KALIP_DURUM_ADLARI`'ndaki hâliyle (büyük harfle) yazılır, ayraç orta noktadır ve tek durumlu kümede de sayı yazılır ("3 Hazır").
- **AC-25.** Pencerenin satır numarası `kaliplar` dizisindeki konumdur: ikinci satırı bir Extra Kalıp aynası olan beş kalıplı kayıtta pencere dört satır çizer ve numaralar 1, 3, 4, 5 olur.
- **AC-26.** Pencerenin durum seçicisinin erişilebilir adı `${i + 1}. kalıp durumu` desenindedir ve pencerede aynı adı taşıyan iki öğe yoktur.
- **AC-27.** Kayıtta Extra Kalıp satışı varsa pencerenin altındaki ibare satış sayısını yazar, durumlarının Makina Geçmişi'nden yönetildiğini söyler ve "Teslim Bekleyenler" süzgecine girdiklerini belirtir; ibare kütüphanede tek sabittir.
- **AC-28.** Çöpe atılmış bir Extra Kalıp satışı olan kayıtta son kalıp özetten, pencereden ve toplu işaretlemeden düşer (X7'nin kabul edilen sonucu); bu kalıp pencereden değil, müşteri formundan elle işaretlenir ve bu sınır sürüm notunda yazılıdır. **Plan kararı 30 ile:** App `Customers`'a yalnız canlı Extra Kalıp satışlarını verir (`livePartSales`), yani bu sonuç uygulamada oluşmaz; kriter yardımcı düzeyinde (çağıranın verdiği satış sayısıyla) ölçülür ve sürüm notundan çıkar.

**Toplu teslim**

- **AC-29.** Makina durumu teslim seçilince değer onay açılmadan önce yazılır: onay ekranda dururken seçici "Teslim edildi" gösterir.
- **AC-30.** Onay kabul edilince kalıplar **o anın kaydından** yeniden hesaplanır: onay açıkken bir kalıbın durumu başka yoldan değişmişse yalnız hâlâ hazır olanlar işaretlenir ve onaydaki sayıdan az kalıp yazılabilir.
- **AC-31.** Onay penceresinin başlığı, mesajı, ikonu, onay düğmesi ("Evet, İşaretle") ve iptal düğmesi ("Yalnız makina") B-R2/2'de yazılan değerlerdir; "Evet, Sil" ve çöp ikonu çizilmez.
- **AC-32.** Kalıpların yazımı tek `setCustomers` çağrısındadır: kabulde kalıp başına ayrı çağrı yoktur. Makina durumu B-R2 ve AC-29 gereği seçim anında ayrı bir çağrıyla zaten yazılmıştır (Plan kararı 26: ilk metnin "makina durumu ve kalıplar iki ayrı kayıt gövdesi üretmez" parantezi B-R2 ile çelişiyordu).
- **AC-33.** Müşteri formundan makina durumu teslim yapılınca onay açılmaz ve kalıpların durumu değişmez (X10).

**Yapı ve ölçüm**

- **AC-34.** Özet satırı, pencere ve teslim onayı `src/components/customers/detail/KalipDurumlari.jsx`'tedir; spec 0110 AC-17'nin yasakladığı dokuz ad `CustomerDetailModal.jsx`'te geçmez ve o tarama dokunulmadan yeşil kalır.
- **AC-35.** Toplu teslimin tetiği kütüphanededir: `CustomerDetailModal.jsx` ve yeni dosya `MAKINA_DURUMU.TESLIM` ile karşılaştırma yazmaz, 0106'nın durum dizesi taraması dokunulmadan yeşil kalır (kaynak taraması).
- **AC-36.** Kalıp durumları penceresi ve teslim onayı tek durum alanını paylaşır, yani ikisi aynı anda açılamaz (kaynak ve ekran iddiası).
- **AC-37.** Detay penceresinin kapanma kapısı hem `Modal`'ın `onClose`'una hem footer'daki "Kapat" düğmesine konmuştur: üstteki pencere açıkken ikisi de detayı kapatmaz.

---

## Definition of Done

- A ve B parçalarının bütün kriterleri geçer (AC-1..AC-37).
- Özet satırı, kalıp durumları penceresi ve teslim onayı tek yeni dosyada (`src/components/customers/detail/KalipDurumlari.jsx`); `CustomerDetailModal.jsx` spec 0110 AC-17'nin dokuz adını hâlâ taşımaz ve o tarama dokunulmadan yeşil.
- Toplu teslimin tetiği ve kapsamı tek saf yardımcıda (`teslimToplamaPlani`); ekran dosyalarında durum dizesi ya da `MAKINA_DURUMU.TESLIM` karşılaştırması yok, 0106'nın iki taraması dokunulmadan yeşil.
- Ayna satır ölçütü yalnız `musteriDurumu.js`'te; kartın çizimi, özetin sayısı, pencerenin listesi ve onayın sayısı aynı sonucu veriyor (AC-18).
- Özet teslim edilmiş kalıpları da sayıyor ve satır makinayla verilen kalıbı olan her kayıtta çiziliyor; satırın kapısı `isCustomer` (AC-3, AC-4).
- Pencere `maxWidth` 560, footersüz ve `overflowVisible`'sız açılıyor; kaymayı `Modal`'ın kendi zinciri sağlıyor (AC-9).
- Ters çevrilen 0110 kriterleri planda tek tek listelenir ve test yorumlarına "spec 0146 ile" notu düşülür. QA turu ölçümüne göre spec 0110 AC-17'nin ters çevrilmesi **gerekmiyor** (QA kararı 11); listede yalnız gerçekten değişen kriterler yer alır.
- Görsel kanıt: kalıbı olan müşteri detay ekranları `kanit-eslemesi.json`'da `beklenen: "degisti"` + `onay` (`Takım Yöneticisi · 2026-11-16 · spec 0146 A-R1`) ile girer; kalıbı olmayan detay ekranları ve detay dışındaki bütün ekranlar 0 piksel verir; yeni satır ve yeni pencere kendi ekranlarıyla kanıt aracına eklenir (C7).
- Sunucu ölçümü iki uçlu: `cust_detail_edit` izinli kullanıcı 200, `customerActions: []` kullanıcısı 403 (AC-22).
- Sürüm notu yazılır: kalıpların durumu artık makina durumunun yanındaki pencereden değiştirilebilir; makina "Teslim edildi" yapılınca hazır bekleyen kalıplar için onay sorulur; Extra Kalıp satışlarının durumu bugünkü gibi zaman çizelgesinden yönetilir; yalnız Extra Kalıp satışı olan kayıtta bu satır hiç çizilmez.

---

### Kararlar (Takım Yöneticisi, 2026-11-15)

Aşağıdaki dört karar ilk iki turun kararlarıdır; QA turunun 24 kararı Context'teki "QA turunda verilen kararlar" bölümündedir ve metinde "QA kararı n" diye anılır.

**Karar 1 — Extra Kalıp satırları kartın bugünkü ölçütüyle ayrılır, ölçüt tek yardımcıya taşınır (A-R8).**
Kartta konum tahmini (`partSaleId` dolu ya da sondaki n satır) ve kütüphanede kimlik ölçütü (`aynaSatirMi`) farklı sonuç veriyordu; `partSaleId` taşımayan eski kopya satırlar kartta "Extra Kalıp'tan" görünürken kütüphanede kendi kalıbı sayılıyor. Ekranda öyle yazan bir satırı kendi kalıbı sayıp teslim yazmak kullanıcıyı şaşırtacağı ve tahmin yanlış tarafa kaysa sonucun "atlamak" olacağı için (veri bozulmaz, kullanıcı o kalıbı elle işaretler) kartın ölçütü kazandı. **Kabul edilen bedel:** kütüphanenin `aynaSatirMi`'si ile ekranın ölçütü ayrı kalır ve 0106'nın bilinen sınırı sürer; `detailKalipSatisAdedi`'nin çöpteki satışları sayması da düzeltilmez (X7).

**Karar 2 — Toplu işaretleme yalnız durumu "Hazır" olan kalıpları kapsar (B-R4).**
Üretimdeki, sipariş verilmiş ve sipariş bekleyen kalıp fiziksel olarak ortada yoktur, makinayla birlikte teslim edilemez. Ayrıca elle yazılan "teslim" değeri `kalipBekliyorMu`'yu koşulsuz kısa devre yapıyor (Tuzak T2), yani bitmemiş bir kalıbı işaretlemek onu üretim formunun getirmesinden ve Anasayfa sayacından kalıcı olarak düşürür. **Kabul edilen bedel:** kalıbı henüz bitmemiş makinalarda o kalıp sonradan elle işaretlenir; A parçasının penceresi bunun yolunu iki tıklama uzağında tutar.

**Karar 3 — İç içe pencere açıkken Escape yalnız üsttekini kapatır (A-R10).**
`ConfirmDialog` ve `Modal` Escape'i ikisi de `window`'da dinlediği için bugün pencerenin altı onayında Escape hem onayı hem detay penceresini kapatıyor; kullanıcı onayı iptal ettiğini sanırken kayıttan da çıkıyor. Bu spec'in iki penceresi (kalıp durumları ve teslim onayı) 0126 desenini uygular. **Kabul edilen bedel:** öteki altı onay bugünkü davranışta kalır ve Escape bir süre pencere içinde tutarsız olur; düzeltmesi kapsam dışı yazıldı (X5).

**Karar 4 — Durumlar karta değil kendi penceresine konur (A-R1, A-R2, A-R9, C8; Takım Yöneticisi'nin ikinci turu, 2026-11-15).**
İlk tur durum seçicilerini kalıp kartının satırlarına koyuyordu. Takım Yöneticisi kartın aşağı doğru uzayacağını belirtti ve ölçüm bunu doğruluyor: kalıp kümesi medyan 5, en büyük 15 (Ölçüm 13), yani kart detay penceresinin ortasında onbeş satır büyür ve altındaki İşlemler, Sahiplik Geçmişi ile Makina Geçmişi bölümlerini ekran dışına iter. Durumlar makina durumunun yanındaki özet ve düğmeye, oradan açılan dar bir pencereye taşındı; pencere yalnız makinayla verilen kalıpları listeler. **Kabul edilen bedel:** bir kalıbın durumunu görmek bir tıklama uzaklaşır (özet satırı en geri durumu yazdığı için "hangi aşamada" sorusu tıklamasız cevaplanır) ve 0110'un kart kararı bu spec'te korunur, yani kanıt turu ucuzlar.

---

## SCORECARD

<!-- Uygulama bitince doldurulur. -->
