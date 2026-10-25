# 0108 — Üretim formundan çıkan kalıp yeniden bekleyen olur

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3, plan turu 2026-10-25; uygulama commit `40bfeaa`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Üretim formunun bekleyen kalıp toplaması, satır silme, form silme ve başlangıç tarihi hesabı (`src/components/stock/UretimFormu.jsx:19-31`, `:103-138`, `:140-148`, `:200-201`, `:227-283`, silme onayı `:549-560`); Anasayfa'nın bekleyen kalıp sayacı (`src/components/Dashboard.jsx:197-208`, `useMemo` bağımlılıkları dahil); `src/lib/musteriDurumu.js` (0107'nin `musteriKalibiBekliyorMu`'sunun imzası ve gövdesi, mevcut `uretimFormHaritasi`'nın üstünde yeni saf çekirdek, 0106'nın `kalipDurumuTuret`'i); Çöp Kutusu'nun üretim formu satırı (`src/components/settings/SettingsTrash.jsx:337`); `tests/uretim-bekleyen-tarih.test.js` düzeneği |
| **Bağımlı spec'ler** | 0107 (ayna satırın atlanması; bu spec'in ölçütü onun üstüne biner), 0106 (üretim formu bağının haritası `uretimFormHaritasi`, satır anahtarları, `kalipDurumu`), 0007 (Extra Kalıp ve bağın `partSales` tarafı) |
| **Ters çevrilen kriterler** | *(revizyon 2)* **0106'nın Karar 17'si ters çevrilir** (R15, Karar 16): damga dolu ama bağ canlı değilken türetilen durum `gonderildi` değil `bekliyor` olur; 0106'nın ilgili kriteri ve testi bu spec'te güncellenir. `tests/uretim-bekleyen-tarih.test.js`'in **ilk** bloğundaki `uretimFormId: 9` taşıyan kalıp "sayılmaz" beklentisi, o kimlikte canlı form bulunmadığı için bu spec'le **sayılır** hâle gelir; testin düzeneğine o formun kendisi eklenerek beklenti korunur (ölçüm 9, ölçüm 23) |

---

## Intent

Bir kalıp kalıp üretim formuna bir kez eklenince, o formdan çıkarılsa ya da form silinse bile bir daha hiçbir yoldan üretim formuna gönderilemiyor. Kullanıcı "Bekleyen Kalıpları Getir" dediğinde gelmiyor, Anasayfa'nın bekleyen kalıp sayısında da görünmüyor, yani kaybolduğu bile anlaşılmıyor. Kalıp üretilmiş sanılıyor.

Yanlışlıkla eklenen bir satırı silmek ya da yanlış açılmış bir formu çöpe atmak bugün geri dönüşü olmayan bir işlem. Tek kurtarma yolu o tarihten önceki bir yedek dosyasını geri yüklemek.

Bu iş bittiğinde bir kalıbın beklemede olup olmadığı saklı bir işaretten değil, üretim formu bağının gerçekten durup durmadığından okunacak. Formdan çıkarılan ya da formu silinen kalıp yeniden bekleyen listesine dönecek, form çöpten geri alınınca listeden kendiliğinden çıkacak ve hiçbir yere ters yazma yapılmayacak.

---

## Requirements

### Bekleyen kalıp tanımı

- **R1.** *(revizyon 2, QA turu)* Bir kalıp **bekleyen** sayılır: üretim formuna gönderme işareti **ya da** üretim formu bağı dolu, bağ **canlı değil** ve kalıbın elle yazılmış durumu üretimin bittiğini söylemiyor.
- **R1/2.** "İşaret ya da bağ" ölçütü 0107 R6/2 ile aynı sorudur ve aynı cevabı verir. 0107 damgayı temizlemediği için veride işareti silinmiş ama bağı duran kayıtlar var (ölçüm 13); işaret tek şart olsaydı böyle bir kalıbın formu çöpe atılsa da bekleyen sayılmaz, 0106 ise ona "sipariş verildi" demeye devam ederdi, yani kalıp ilelebet kaybolurdu.
- **R2.** Bağ **canlı** demek, üç şartın birlikte sağlanmasıdır: kalıpta üretim formu kimliği dolu, o kimlikte çöpte olmayan bir üretim formu var ve o formda bu kalıbın satırı var.
- **R3.** Ölçüt tek bir saf yerde yazılır ve üç okuyucu onu çağırır: üretim formunun bekleyen toplaması, Anasayfa'nın bekleyen kalıp sayacı ve yeni formun başlangıç tarihi hesabı. Hiçbiri kendi ölçütünü yazmaz; kaynak taramasıyla sabitlenir.
- **R3/2.** *(revizyon 2, QA turu)* Ölçütün şekli R18'de yazılıdır: 0107'nin `musteriKalibiBekliyorMu`'su bugün yalnız kaydı alıyor (ölçüm 11), canlılık ise bağ anahtarını ve haritayı istiyor. 0107 R16/2'nin "yalnız gövde değişir" sözü bu yüzden daraltılır: imza da değişir ve üç çağrı yerine ikinci kez dokunulur.
- **R4.** Kalıbın **elle** yazılmış durumu `hazir` ya da `teslim` ise kalıp bekleyen sayılmaz. Türetilmiş durum bu kuralı tetiklemez; kural yalnız kullanıcının açıkça yazdığı değere bakar.
- **R4/2.** *(revizyon 2, QA turu)* Kural **koşulsuzdur**: bağı hiç kurulmamış, yalnız işaretli bir kalıp da elle `hazir` ya da `teslim` yazıldığında listeden ve sayaçtan çıkar. Bu bugünkü davranışı değiştirir (bugün iki okuyucu da `kalipDurumu`'na hiç bakmıyor, ölçüm 18) ve sürüm notuna girer.
- **R4/3.** Yalnız bu iki değer kısa devre yapar. Elle `bekliyor`, `gonderildi` ya da `uretimde` yazılmış kalıp, öteki şartlar sağlanıyorsa bekleyen kalır.
- **R5.** Ölçüt hem müşteri kalıplarına hem Extra Kalıp satışlarına aynı biçimde uygulanır; bağ anahtarı 0106'nın anahtarıdır.

### Hiçbir yere ters yazma yapılmaz

- **R6.** Bağ koptuğunda kalıbın üretim formu kimliği **silinmez**. Karar okuma anında verilir.
- **R7.** Kalıp yeni bir forma eklenip form kaydedilince kimlik bugünkü gibi üzerine yazılır; eski kimlik için ayrı bir temizlik adımı yoktur.

### Bağın koptuğu dört hâl

- **R8.** Satır formdan silinip form kaydedilince o satırın kalıbı yeniden bekleyen olur.
- **R8/2.** *(revizyon 2, QA turu)* **Kaydedilmeden** bekleyen olmaz: satır açık formdan silinip form kaydedilmemişse ölçüt kayıtlı formdan "bağ canlı" okur ve "Bekleyen Kalıpları Getir" o kalıbı getirmez (ölçüm 17). Hiç kaydedilmemiş yeni formda aynı akış kalıbı hemen geri getirir, çünkü damga hiç yazılmadı. İki kipin bu asimetrisi bilinçlidir ve kriterle sabitlenir.
- **R9.** Form çöpe atılınca o formdaki bütün kalıplar yeniden bekleyen olur.
- **R10.** Çöpe atılmış form geri alınınca kalıpları bekleyen listesinden kendiliğinden çıkar; hiçbir alan yazılmaz.
- **R11.** Form kalıcı silinince (Çöp Kutusu'ndan elle ya da otuz günlük otomatik temizlikle) kalıpları bekleyen kalır.
- **R12.** "Dönemi Sonlandır" bağı kırmaz: sonlandırılmış formdaki kalıplar bekleyen sayılmaz.

### Kullanıcı ne olacağını önceden görür

- **R13.** Üretim formu silme onayı kaç kalıbın bekleyen listesine döneceğini yazar. Sıfırsa cümle yazılmaz.
- **R13/2.** *(revizyon 2, QA turu)* Sayı şöyle tanımlıdır: bu formun satırlarından, kaynağı duran (çöpte olmayan müşteri ya da canlı Extra Kalıp), damgası **bu formu** gösteren ve form çöpe atıldıktan sonra bekleyen ölçütünü sağlayan kalıplar. Hesap aynı saf ölçütle, bu form çıkarılmış bir harita üzerinde yapılır; ikinci bir sayım kuralı yazılmaz. Satır sayısı ölçüt değildir: elle eklenen satır kaynak taşımaz ve hiç damgalanmadı, kaynağı başka forma yeniden damgalanmış satır dönmez, kaynağı silinmiş satır dönmez, elle `hazir` ya da `teslim` yazılmış kalıp dönmez (ölçüm 14).
- **R13/3.** Onayın cümlesi kalıpların **hemen** döndüğünü ve formu geri almanın onları listeden çıkardığını (R10) birlikte söyler; bugünkü "çöp kutusuna taşınacak, geri alabilirsiniz" cümlesi korunur (ölçüm 27).
- **R14.** Çöp Kutusu'ndaki üretim formu satırı formu tanınır biçimde adlandırır: tarih aralığı ve varsa not. Bugün boş görünüyor (ölçüm 8), yani geri alınacak form ayırt edilemiyor; R10'un kullanılabilmesi için bu satır düzeltilir.
- **R14/2.** *(revizyon 2, QA turu)* Biçim **form listesinin bugünkü dönem metninin aynısıdır** (`UretimFormu.jsx:512-514`): `fmtDate` ile "GG.AA.YYYY", iki uç aynı günse tek tarih, değilse "01.10.2026 – 31.10.2026". İki yerin ayrışmaması için metin tek yerde kurulur ve ikisi onu çağırır; yeri `fmtDate`'in zaten durduğu `src/components/stock/uretimFormPrint.js`'tir. Yedek zinciri listeyle aynı: `baslangicTarihi` ile `bitisTarihi`, yoksa eski tek alan `tarih`, o da yoksa `fmtDate`'in `—` değeri (`openEdit` ve liste sıralaması aynı sırayı okuyor, `:98-99`, `:484-485`, `:512-513`; ölçüm 24).
- **R14/3.** Etiket `SettingsTrash.jsx` içinde satır içi kurulur, `copKutusu.js`'e taşınmaz: o dosya yalnız 0078'in altı bölümünün etiketini tutuyor, öteki bütün eski satırların etiketi satır içidir (ölçüm 25). Etiketin kendi ekran testi olur.

### Tutarlılık

- **R15.** *(revizyon 2, QA turu)* 0106'nın kalıp durumu türetmesi ile bu spec'in canlılık ölçütü **aynı haritayı ve aynı canlılık ölçütünü** okur ve aynı şeyi söyler: damga dolu ama bağ canlı değilse türetilen durum `bekliyor` olur (0106 Karar 17 ters çevrilir, Karar 16), yani kalıp müşteri satırında "KALIP SİPARİŞİ BEKLİYOR" gösterirken bekleyen listesinde de görünür.
- **R15/2.** Bedeli yazılıdır: 0106'nın `bekliyor` pili makina durumu boş satırlarda bastırıldığı için (0106 R21) bazı satırlarda pil büsbütün kaybolur. Elle yazılmış durum bu kuraldan etkilenmez (0106 R10, değer kazanır).
- **R16.** Anasayfa sayacı ile üretim formunun getirmesi arasındaki tarih farkı korunur (0107 R15): sayaç tarihten bağımsızdır, getirme tarih aralığına bağlıdır.
- **R17.** 0107'nin ayna satır atlaması bu spec'in ölçütünden **önce** uygulanır: ayna satır hiçbir hâlde bekleyen sayılmaz.

### Ölçütün şekli ve çağrı yerleri (revizyon 2, QA turu)

- **R18.** Ölçütün şekli: tek saf çekirdek kaydı, bağ anahtarını ve haritayı alır (`kalipBekliyorMu(k, anahtar, harita)`); üstünde iki ince sarmalayıcı anahtarı kurar, biri müşteri kalıbı için (`musteriKalibiBekliyorMu(k, musteriId, i, harita)`), biri Extra Kalıp satışı için (`extraKalipBekliyorMu(ps, harita)`). İkisi de 0106'nın anahtarlarını kullanır (C2). Extra Kalıp tarafı artık kendi kuralını satır içinde yazmaz (bugün üç yerde yazıyor, ölçüm 12).
- **R18/2.** `enEskiBekleyenKalipTarihi` üçüncü argüman olarak `uretimFormlari` alır ve tek çağıranı (`UretimFormu.openNew`) onu geçer.
- **R19.** Anasayfa sayacının `useMemo` bağımlılık listesine `uretimFormlari` girer (bugün `[customers, partSales]`, ölçüm 15). Yoksa form çöpe atıldıktan sonra sayaç güncellenmez ve bu tam olarak bu spec'in düzelttiği sessiz bayatlama sınıfından bir hata olur.
- **R20.** Harita ölçütün zorunlu girdisidir ve üç çağrı yerinin onu geçtiği kaynak taramasıyla sabitlenir. **Bilinen sınır:** haritayı geçmeyen bir çağıran (ör. `uretimFormlari` prop'u verilmeyen bir test düzeneği) bütün damgalı kalıpları bekleyen görür, çünkü boş harita "hiç canlı form yok" demektir. Bugün hiçbir çizim yeri bu tuzağa düşmüyor (ölçüm 16); yeni bir düzenek kurulurken prop geçilir.

---

## Constraints

### Uyulması zorunlu

- **C1.** Yeni kalıcı alan, veri göçü, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı, yeni birleştirme kuralı ve yeni kilit alanı yok. **İzin eklenmediği açıkça yazılıdır.**
- **C2.** Bağ anahtarı 0106'nın anahtarıdır (`musteri:<müşteri>:<konum>` ve `extra_kalip:<satış>`); ikinci bir anahtar şeması üretilmez.
- **C2/2.** *(revizyon 2, QA turu)* Harita **her ekranda bir kez** kurulur (`useMemo` ya da tıklama başına), satır başına değil. "Tek kez kurulur" tek bir global harita demek değildir: bugün 0106 ile `Customers.jsx` kendi haritasını kuruyor, Anasayfa ve üretim formu ekranı da kendi haritasını kuracak (ölçüm 22).
- **C3.** 0108, 0107'nin üstüne gelir. İki spec aynı üç okuyucuya dokunuyor (getirme, sayaç, tarih hesabı), bu yüzden sıra zorunludur.
- **C4.** `kalipIdx` bir konumdur, kimlik değildir (0106 R9/2). Bu spec o kırılganlığı düzeltmez (X4).
- **C4/2.** *(revizyon 2, QA turu)* Ama zararı **büyür** ve bu açıkça yazılıdır: bugün konum kaymasının sonucu yalnız yanlış pildir; bu işten sonra anahtar eşleşmediği için bağ kopmuş sayılır, kalıp bekleyen listesine döner ve ikinci bir forma eklenebilir (ölçüm 19). Sürüm notunda yazılır, düzeltme X4'te kalır.
- **C5.** Çöp kutusu simetrisi: geri alma ve kalıcı silme kaynağa hiçbir şey yazmaz (bugünkü davranış korunur, R6).
- **C6.** Üretim formu kaydetmenin damgalama adımı değişmez (`UretimFormu.jsx:103-138`).
- **C7.** *(revizyon 2, QA turu)* Kanıt kayıtlarının yaşam döngüsü: bu işte **hiçbir mevcut kayıt `degisti` olmaz**. Bugünkü çöp ekranlarının hiçbirinde üretim formu satırı yok ve silme onayının ekranı da yok (ölçüm 21), yani etiket değişikliği sıfır piksel üretir. İki yeni ekran ilk raporda `fark: "önce görüntüsü yok"` ile doğar (piksel anahtarı taşımaz) ve kayıtları `beklenen: "ayni"` olarak girer.

### KAPSAM DIŞI

- **X1.** Bağ koptuğunda üretim formu kimliğinin silinmesi, yani ters yazma kolu — *neden:* okuma anında çözüm aynı sonucu veriyor ve üç ek yazma noktası (satır silme, form silme, otomatik temizlik) ile bir geri yazma noktası (çöpten geri alma) açmayı gerektirmiyor; yazma kolu seçilirse çöpten geri alma bağı yeniden kurmak zorunda kalır ve veri göçü sorusu da açılır.
- **X2.** Üretilmiş kalıbın kalıcı kaydı: form silinse de "bu kalıp üretildi" bilgisinin durması — *neden:* bu bir arşiv kavramıdır ve 0106 arşivi bilinçle kapsam dışı bıraktı; kullanıcı bugün elle "Hazır" ya da "Teslim edildi" yazarak bunu sabitleyebiliyor (R4) ve bu spec o yolu kuralın parçası yapıyor.
- **X3.** Üretim formu silme yetkisi ve kimin silebileceği — *neden:* değişmiyor.
- **X4.** `kalipIdx`'in konumsal kırılganlığı — *neden:* `specs/README.md`'de açık bulgu; kalıba kalıcı kimlik vermeyi ve veri göçünü istiyor.
- **X5.** Silinen formun satırlarındaki "Bitti" işaretinin korunması — *neden:* satır formla birlikte gidiyor; korumak X2'nin arşiv kavramını gerektirir.
- **X6.** Bekleyen listesinde kalıbın neden geri döndüğünün yazılması (formdan çıkarıldı, formu silindi) — *neden:* getirme bir eylemdir, rapor değildir; bildirim bugünkü gibi yalnız kaç kalıp eklendiğini söyler.
- **X7.** Kalıp başka bir forma eklendikten sonra çöpten geri alınan eski formun satırının hayalet kalması — *neden:* kabul edilen sınır, ölçüm 7'de yazılı; engellemek formlar arası kilit kavramı ister.
- **X8.** *(revizyon 2, QA turu)* "Dönemi Yeniden Aç"ın kalıcı olmaması — *neden:* "Dönemi Sonlandır" diziyi hemen yazıyor (`UretimFormu.jsx:321-330`), "Yeniden Aç" yalnız form durumunu değiştiriyor ve Kaydet'e kadar yazılmıyor (`:334`); bu spec'ten önce de böyleydi, R12'yi etkilemiyor ve kendi küçük işini hak ediyor (ölçüm 28).
- **X9.** *(revizyon 2, QA turu)* Aynı kalıbın iki canlı formda bulunmasının engellenmesi — *neden:* `collectPending`'in "bu formda zaten var" kümesi yalnız açık formun satırlarından kuruluyor (`:216-223`), ama damga tek formu gösterdiği için üçüncü bir kopya oluşamaz; iki canlı formda bulunma yalnız X7'nin kabul ettiği hayalet satır hâliyle mümkündür (ölçüm 26). Engellemek X7'nin istediği formlar arası kilidi ister.

---

## Context

Üretim formu kaydedilirken `UretimFormu.saveForm` (`:103-138`) her satırın kaynağına form kimliğini damgalıyor: müşteri kalıbına `customers[].kaliplar[i].uretimFormId` (`:122`), Extra Kalıp satışına `partSales[].uretimFormId` (`:128`). Bekleyen kalıpları toplayan `collectPending` bu kimliği gördüğü kalıbı atlıyor (`:233` müşteri kalıbı, 0107'den beri `musteriKalibiBekliyorMu` ile; `:257` Extra Kalıp), Anasayfa sayacı da aynı şartı kullanıyor (`Dashboard.jsx:202`, `:204`).

Spec 0106 aynı bağı okuma tarafında zaten çözdü: `musteriDurumu.uretimFormHaritasi` (`:58-70`) **yalnız çöpte olmayan** formlardan `formId → (anahtar → satır)` haritası kuruyor ve `kalipDurumuTuret` (`:73-80`) form ya da satır bulunamazsa durumu `gonderildi`ye düşürüyor, "hazır" saymıyor. Yani 0106 bağın kopabileceğini zaten biliyor ve o hâli doğru yorumluyor; bu spec aynı bilgiyi bekleyen kalıp tanımına taşıyor.

Üretim formu çöp kutusuna gidiyor (`uretimFormlari` bölümünde `deletedAt`), Çöp Kutusu'nda geri alma ve kalıcı silme satırı var (`SettingsTrash.jsx:337`, `:183-184`) ve otuz günlük otomatik temizlik bölümü kapsıyor (`App.jsx:1094`). Üçünün hiçbiri kaynağa dokunmuyor.

Bilinen tuzaklar: yeni kalıcı alan olmadığı için dört nokta kuralı devreye girmez; `uretimFormlari` zaten `MERGE_KEYS`'te ve App'in birleştirmesinde (`App.jsx:285`, `:314`). Birleştirme bu işten etkilenmez çünkü ölçüt okuma anında türüyor ve saklanmıyor.

---

## Ölçümler

Hepsi 2026-10-25, kaynak okumasıyla.

1. **Form kimliği yalnız yazılıyor, hiç temizlenmiyor.** `src/` altında `uretimFormId`'ye yazan iki yer var (`UretimFormu.jsx:122`, `:128`), okuyan yedi yer var (`:23`, `:26`, `:233`, `:257`, `Dashboard.jsx:202`, `:204`, `musteriDurumu.js:74`); temizleyen hiçbir yer yok.
2. **Satır silme kaynağa dokunmuyor.** `deleteRow` (`:200-201`) yalnız formun satır dizisinden çıkarıyor.
3. **Form silme kaynağa dokunmuyor.** `deleteForm` (`:140-148`) yalnız `deletedAt` damgalıyor.
4. **Geri alma ve kalıcı silme de dokunmuyor.** `SettingsTrash.jsx:183` geri almada yalnız `deletedAt`'i kaldırıyor, `:184` kalıcı silmede yalnız kaydı diziden çıkarıyor.
5. **Kalıp iki listeden birden düşüyor.** Kimlik dolu olduğu için hem `collectPending` atlıyor ("Bu tarih aralığında bekleyen yeni kalıp yok.") hem Anasayfa sayacı saymıyor, yani kaybın hiçbir izi kalmıyor. Tek kurtarma yolu o tarihten önceki yedek dosyası.
6. **0106 aynı kopmayı zaten doğru okuyor.** `uretimFormHaritasi` çöpteki formu atıyor (`:61`) ve `kalipDurumuTuret` form ya da satır yoksa `gonderildi` diyor (`:76-78`). Yani bugün bağı kopmuş bir kalıp müşteri listesinde "KALIP SİPARİŞ VERİLDİ" gösteriyor ama bekleyen listesinde yok: iki ekran aynı kayıt için iki ayrı şey söylüyor.
7. **Kabul edilecek sınır.** Çöpteki bir formun kalıbı yeni bir forma eklenirse kimlik yeni formu gösterir; eski form sonradan geri alınırsa onun satırı artık hiçbir bağın sahibi değildir ve yazdırma çıktısında hayalet satır olarak kalır. Durum bugün de üretilebilir (aynı kalıp elle iki forma eklenebilir) ve engellemek formlar arası kilit kavramı ister.
8. **Çöp Kutusu'ndaki üretim formu satırı boş görünüyor.** Etiket `u.tarih`'i okuyor (`SettingsTrash.jsx:337`) ama form artık `baslangicTarihi` ve `bitisTarihi` tutuyor (`UretimFormu.jsx:31-39`; eski tek alan yalnız geriye dönük okumada, `:98-99`, `:484-485`, `:512-513`). Yani tarih aralığı değişikliğinden sonra oluşturulmuş her form çöpte `—` olarak listeleniyor ve notu yoksa hangi form olduğu anlaşılmıyor.
9. **Tek test etkileniyor.** `tests/uretim-bekleyen-tarih.test.js`'in ilk bloğunda `uretimFormId: 9` taşıyan bir kalıp "zaten forma eklendi, sayılmaz" diye yazılı; düzenekte 9 kimlikli form olmadığı için yeni ölçütle bağ canlı değildir ve kalıp sayılır. Beklentiyi korumak için düzeneğe o form eklenir; testin amacı (en eski bekleyenin bulunması) değişmez.
10. **Form sayısı bugün sıfır.** Yedekte kayıtlı üretim formu yok (spec 0106 ölçümü, 2026-10-24), yani bu spec bugün hiçbir kaydın görünürlüğünü değiştirmiyor; kuralı ilk form oluşturulmadan önce yerine koymak en ucuz zamandır.

### QA turu (2026-10-25, 0107 uygulandıktan sonra)

11. **0107'nin ölçütü yalnız kaydı alıyor.** `musteriKalibiBekliyorMu(k)` = ayna değil ve işaret dolu ve bağ boş (`musteriDurumu.js:116`); bağ anahtarı ve harita parametresi yok.
12. **Üç çağrı yeri ve haritaya erişimleri.** `UretimFormu.jsx:233` (bileşenin `uretimFormlari` prop'u var), `Dashboard.jsx:202` (var), `enEskiBekleyenKalipTarihi(customers, partSales)` (`:19`, çağrısı `:90`) ve bu üçüncüsünün harita parametresi hiç yok. Extra Kalıp tarafı üç yerde de kendi kuralını satır içinde yazıyor (`UretimFormu.jsx:26`, `:256-257`, `Dashboard.jsx:204`).
13. **0107'nin bıraktığı sınıf.** 0107 damgayı temizlemedi (C1'i korudu), yani veride `uretimFormId` dolu ve `uretimFormGonder` boş kayıtlar var; 0107 ölçüm 17 bunu kanıt aracının verisinde de buldu (`0009-sayfa.jsx:354`, satış 872). 0107 bu ikiliği ibarede `uretimFormGonder || uretimFormId` ile çözdü (`musteriDurumu.js:112`).
14. **Silme onayının bugünkü şekli.** Onay listeden açılıyor ve yalnız bir kimlik tutuyor (`delConfirm`, `:549-560`), gövdesi tek cümle. Satır sayısı ölçüt olamaz: elle eklenen satır `kaynakTip: null` taşıyor (`uretimFormModel.js:20-22`) ve hiç damgalanmadı, kaynağı başka forma yeniden damgalanmış satır dönmez (ölçüm 7), kaynağı silinmiş satır dönmez, elle `hazir` ya da `teslim` yazılmış kalıp dönmez (R4).
15. **Anasayfa sayacının bağımlılıkları.** `Dashboard.jsx:197-208` `useMemo` bağımlılıkları `[customers, partSales]`; `uretimFormlari` yok.
16. **Çizim yeri sayımı.** Anasayfa onbir yerde çiziliyor: on test dosyası, kanıt aracı ve App. `uretimFormlari` prop'unu yalnız App ve `tests/ui/extra-kalip-isareti-0107.test.jsx` geçiyor; o testin Anasayfa düzenekleri damgasız kalıplar kullanıyor ve kanıt aracının iki Anasayfa düzeneğinde de damgalı kalıp yok, yani boş harita bugün hiçbir sayıyı değiştirmiyor. Prop'un varsayılanı `[]` (`Dashboard.jsx:20`).
17. **Kaydedilmemiş satır silme penceresi.** `deleteRow` yalnız açık formun satır dizisini değiştiriyor (`:200-201`); damga ve kayıtlı form Kaydet'e kadar durur. `collectPending`'in "bu formda zaten var" kümesi açık formun satırlarından kuruluyor (`:216-223`), yani silinen satır kümeden çıkar ama ölçüt kayıtlı formdan "bağ canlı" okur.
18. **Elle yazılmış durum bugün hiç okunmuyor.** Ne `collectPending` ne Anasayfa sayacı `kalipDurumu`'na bakıyor; yani işaretli, formu hiç olmayan ve elle "Hazır" yazılmış bir kalıp bugün getiriliyor ve sayılıyor.
19. **Konum kaymasının yeni sonucu.** Bağ anahtarı `musteri:<id>:<konum>` (`musteriDurumu.js:51`). Bugün kaymanın zararı yalnız yanlış pil; canlılık ölçütünden sonra anahtar eşleşmeyeceği için bağ kopmuş sayılır, kalıp bekleyen listesine döner ve ikinci bir forma eklenebilir.
20. **0106'nın varsayılanı.** `kalipDurumuTuret` (`:73-80`) damga dolu ve satır bulunamazsa `gonderildi` döndürüyor (0106 Karar 17); o karar canlılık ölçütü yokken verildi. Yani bugün bağı kopmuş kalıp müşteri satırında "KALIP SİPARİŞ VERİLDİ" gösteriyor.
21. **Kanıt ekranlarında üretim formu yok.** Kanıt aracının `ayarlar()` düzeneği `rawUretimFormlari={[]}` geçiyor (`0009-sayfa.jsx:314`), `cop-kutusu-0078` düzeneği de üretim formu taşımıyor; `SettingsTrash.jsx`'in on iki kaydının hepsi `ayni`. `uretim-formu` ekranı boş listeyle açılıp doğrudan "Yeni Form"a basıyor (`:796`), yani silme onayının ekranı da yok.
22. **Harita üç ekranda ayrı kurulacak.** Bugün yalnız `Customers.jsx` kuruyor (0106 R26/2); Anasayfa ve üretim formu ekranı kendi haritasını kuracak. "Tek kez kurulur" tek bir global harita demek değil.
23. **Etkilenen test bloğu ilk blok.** `tests/uretim-bekleyen-tarih.test.js:11`'deki `uretimFormId: 9` ilk `it`'in içinde; başlık satırı "ikinci blok" diyordu.
24. **Çöp etiketinin biçimi ve yedeği.** Form listesi dönem metnini zaten kuruyor: `fmtDate(bas) – fmtDate(bit)`, iki uç aynıysa tek tarih (`:512-514`); `fmtDate` "GG.AA.YYYY" verir ve boşta `—` döner (`uretimFormPrint.js:6`). Eski tek alan `tarih` yalnız geriye dönük okumada (`:98-99`, `:484-485`, `:512-513`).
25. **Çöp etiketlerinin yeri.** `copKutusu.js` yalnız 0078'in altı bölümünün etiketini tutuyor (`:17-26`); üretim formu dahil bütün eski satırların etiketi `SettingsTrash.jsx` içinde satır içi kuruluyor (`:325-340`).
26. **Aynı kalıp iki canlı formda.** Dört yol denendi: aynı formda ikinci kez getirme (`already` engelliyor), damgası canlı formu gösteren kalıbı başka formda getirme (ölçüt engelliyor), damgası çöpteki formu gösteren kalıbı yeni forma alıp kaydetme (damga yeni formu gösterir, eski formun satırı geri alınırsa hayalet kalır, X7), elle satır ekleme (damga yazılmaz). Yani üçüncü bir kopya oluşamıyor.
27. **Silme onayının metni.** Bugün tek cümle: "Bu üretim formu çöp kutusuna taşınacak. Ayarlar → Çöp Kutusu'ndan geri alabilirsiniz." (`:558`).
28. **"Dönemi Yeniden Aç" kalıcı değil.** "Dönemi Sonlandır" diziyi hemen yazıyor (`:321-330`), "Yeniden Aç" yalnız form durumunu değiştiriyor (`:334`).
29. **Otuz günlük temizliğin görünmeyen yanı.** Kalıplar form çöpe atıldığı anda döner; temizlikte (`App.jsx:1094`) hiçbir şey değişmez. Buna karşılık R10'un kaçış yolu otuz gün sonra sessizce sona erer.
30. **`uretimFormId` okuyan gerekçeli istisnalar.** Ölçütün dışında kalanlar: `musteriDurumu.js`'in kendisi (harita ve türetme), `saveForm`'un damgalama adımı (`:122`, `:128`) ve kanıt aracının düzenekleri.
31. **Satır atıfları 0107'den sonra kaydı.** Düzeltilenler: `musteriDurumu.js` harita `:58-70`, türetme `:73-80`, çöp süzmesi `:61`; `Dashboard.jsx:197-208` ve işaret okuması `:202`; Extra Kalıp döngüsünün koşulları `:256-257`; `enEskiBekleyenKalipTarihi` `:19-31`; `saveForm` `:103-138`; `deleteRow` `:200-201`; `deleteForm` `:140-148`; geriye dönük tarih okumaları `:98-99`, `:484-485`, `:512-513`. Doğrulanan atıflar: `UretimFormu.jsx:233`, `:26`, `:23`, `:122`, `:128`, `SettingsTrash.jsx:337`, `:183-184`, `App.jsx:1094`, `:285`, `:314`, `Dashboard.jsx:204`.

---

## Kararlar (Takım Yöneticisi, 2026-10-25)

Üç karar da onaylandı.

- **Karar 1. Çözüm okuma anındadır** (R1, R6): bağın canlılığı her bakışta hesaplanır, hiçbir alan silinmez. Yazma anında çözüm reddedildi: dört yazma noktası (satır silme, formu çöpe atma, kalıcı silme, otuz günlük otomatik temizlik) ve bir geri yazma noktası (çöpten geri alma) açar; otuz günlük temizlik uygulama açılışında kullanıcı görmeden çalıştığı için oradaki bir hata sessiz kalır ve tam olarak bu spec'in düzelttiği kusur sınıfına geri döner. Okuma anında çözüm 0106'nın bugün zaten kurduğu haritayı paylaşıyor, iki ekranın ayrışmasını kapatıyor (ölçüm 6) ve göç sorusunu hiç açmıyor. Yazmanın tek üstünlüğü hesabın bir kez yapılmasıydı; harita tek geçişte kurulduğu için bu ölçülebilir bir kazanç değil.
- **Karar 2. Kapalı bir formu silmek kalıplarını bekleyen listesine döndürür** (R9) ve silme onayı kaç kalıbın döneceğini yazar (R13). "Bitti" işaretli satırların kalıplarının dönmemesi reddedildi: silinmiş formun satır bilgisini bir yerde saklamayı, yani 0106'nın bilinçle kapsam dışı bıraktığı arşiv kavramını (X2) açmayı gerektirir. Kapalı bir formu silmek üretim kaydını yok etmek demektir ve doğru yol "Dönemi Sonlandır"dır (R12); kalıpların dönmesi bu durumda yanlış bir işlemin görünür sonucudur, kusur değil. Kullanıcının üretimi bitmiş bir kalıbı listeden çıkarma yolu zaten var: durumu elle "Hazır" ya da "Teslim edildi" yazmak (R4).
- **Karar 3. Çöp Kutusu'ndaki üretim formu etiketi bu spec'te düzeltilir** (R14). Ayrı açık bulgu olarak bırakılması reddedildi: R10 çöpten geri almayı kuralın parçası yapıyor, oysa bugün etiket artık var olmayan bir alanı okuduğu için tarih aralığı değişikliğinden sonra oluşmuş her form çöpte tek tire görünüyor (ölçüm 8) ve geri alınacak form ayırt edilemiyor. Düzeltme tek satır ve spec'in zaten dokunduğu iki dosyanın içinde.

### Analistin spec'te verdiği kararlar

- **Karar 4.** Elle yazılmış "Hazır" ve "Teslim edildi" kalıbı bekleyen olmaktan çıkarır, **türetilmiş** aynı durum çıkarmaz (R4, AC-8). Gerekçe: türetilmiş durum bağdan okunuyor, bağ kopunca o bilgi de gidiyor; kullanıcının açıkça yazdığı değer ise formun kaybından bağımsızdır ve Karar 2'nin öngördüğü kaçış yolunu kuran tek şeydir.
- **Karar 5.** Bağ anahtarı yeniden tanımlanmaz, 0106'nın anahtarları ve haritası kullanılır (C2, R15). Harita ikinci kez kurulmaz.
- **Karar 6.** Kalıbın geri dönme nedeni (formdan çıkarıldı, formu silindi) bekleyen listesinde yazılmaz (X6): getirme bir eylemdir, rapor değildir ve bildirim bugünkü gibi yalnız kaç kalıp eklendiğini söyler.

### QA turunda verilen kararlar (2026-10-25)

- **Karar 7. Bekleyen ölçütünün ilk şartı "işaret ya da bağ"dır** (R1, R1/2, bulgu B-1). Yalnız işaret reddedildi: 0107 damgayı temizlemediği için veride işareti silinmiş ama bağı duran kayıtlar var (ölçüm 13) ve böyle bir kalıp formu çöpe atılsa da hiç geri dönmez, üstelik müşteri satırında "sipariş verildi" görünmeye devam eder. Aynı soruyu 0107 ibarede `uretimFormGonder || uretimFormId` ile çözdü; aynı soru uygulamanın her yerinde aynı cevabı vermeli, yoksa 0107'nin düzeltmesi bir hücrede tutar ve bekleyen kuralında kırılır.
- **Karar 8. Ölçütün şekli yazılır: bir saf çekirdek, iki ince sarmalayıcı** (R18, R18/2, bulgu B-2). 0107 R16/2'nin "yalnız gövde değişir" sözü daraltıldı, çünkü canlılık bağ anahtarını ve haritayı istiyor, oysa bugünkü ölçüt yalnız kaydı alıyor (ölçüm 11) ve `enEskiBekleyenKalipTarihi`'nin harita parametresi hiç yok (ölçüm 12). Extra Kalıp tarafı da aynı çekirdeği çağırır; R3 ile R5 tek ölçüt istiyor ve şekli yazılmazsa geliştirici üç ayrı varyant üretir, AC-12'nin taraması yazılamaz.
- **Karar 9. Silme onayındaki sayı ölçütün kendisiyle hesaplanır** (R13/2, bulgu B-3). Satır sayısı reddedildi: dört ayrı sebeple yanlış (elle eklenen satır, başka forma yeniden damgalanmış kaynak, silinmiş kaynak, elle "Hazır" ya da "Teslim edildi"; ölçüm 14). Kullanıcıya gösterilen bir sayı, tarif ettiği kuralın kendisiyle hesaplanmalı; hesap bu form çıkarılmış bir harita üzerinde aynı saf ölçütle yapılır, ikinci bir sayım kuralı yazılmaz.
- **Karar 10. Anasayfa sayacının bağımlılık listesine `uretimFormlari` eklenir** (R19, bulgu Ö-1). Bugünkü liste `[customers, partSales]` (ölçüm 15); eksik bağımlılık form çöpe atıldıktan sonra sayacı bayat bırakır ve bu tam olarak bu spec'in düzelttiği sessiz kayıp sınıfından bir hata olur. Kaynak taraması yakalamaz, bu yüzden kendi testi olur.
- **Karar 11. Harita zorunlu girdidir, sınırı yazılır** (R20, bulgu Ö-2). Boş haritayı "hiç canlı form yok" saymak kuralın doğal sonucudur, ama haritayı geçmeyen bir çağıran bütün damgalı kalıpları bekleyen görür. Bugün hiçbir çizim yeri bu tuzağa düşmüyor (ölçüm 16), yani kural bedelsiz; sınırın yazılması 0105'in `appSettings = {}` ve 0091'in yükleme yolu derslerinin bu spec'teki karşılığıdır.
- **Karar 12. Kaydedilmeden bekleyen olmaz ve bu yazılır** (R8/2, bulgu Ö-3). Açık formun taslağını ölçüte sokmak reddedildi: ölçüt saf kalmalı ve kayıtlı veriden okumalı. Ama "yanlışlıkla sildim, geri gelsin" bu işin en sık akışı, bu yüzden davranış kriterle sabitlenir ve yeni formla kayıtlı form arasındaki asimetri (yeni formda kalıp hemen döner, çünkü damga hiç yazılmadı) açıkça yazılır.
- **Karar 13. Elle yazılmış "Hazır" ve "Teslim edildi" koşulsuz kısa devre yapar** (R4/2, R4/3, bulgu Ö-4). Kuralı yalnız bağı kopmuş kalıba uygulamak reddedildi: Karar 2'nin kaçış yolu "üretilmiş kalıbı listeden çıkar" olduğu için bağı hiç kurulmamış kalıp da aynı yolu kullanabilmeli. Bugünkü davranışı değiştirdiği için (iki okuyucu da `kalipDurumu`'na hiç bakmıyor, ölçüm 18) iki kriter ve bir sürüm notu satırı eklenir; yalnız bu iki değer kısa devre yapar.
- **Karar 14. C4 konum kaymasının zararının büyüdüğünü yazar** (C4/2, bulgu Ö-5). "Ne düzeltir ne büyütür" ifadesi düzeltildi: bugün kaymanın sonucu yalnız yanlış pil, bu işten sonra kalıp bekleyen listesine de döner ve ikinci bir forma eklenebilir (ölçüm 19). Düzeltme X4'te kalır, ama sürüm notunda ve spec'te yazılı olur; yazılmaması ilerideki triyajı yanıltır.
- **Karar 15. Kanıtta hiçbir kayıt `degisti` olmaz, iki yeni ekran eklenir** (C7, bulgu Ö-7). Mevcut kaydı `degisti` yapmak reddedildi: bugünkü çöp ekranlarının hiçbirinde üretim formu satırı yok ve silme onayının ekranı da yok (ölçüm 21), yani etiket değişikliği sıfır piksel üretir. Gereksiz `degisti` Takım Yöneticisi onayı ister, `done`'a taşımada geri çevrilmek zorunda kalır ve değişen ekranı göstermez. Aynı sınıf bulgu 0107'de de çıktı.
- **Karar 16. 0106'nın Karar 17'si ters çevrilir: bağı kopmuş kalıbın türetilen durumu `bekliyor` olur** (R15, R15/2, bulgu Ö-6). Bugünkü hâli korumak reddedildi: ölçüm 6'nın şikâyeti "iki ekran aynı kayıt için iki ayrı şey söylüyor" ve yalnız üyelik birleşirse şikâyetin yarısı açık kalır, kullanıcı müşteri satırında "sipariş verildi" okurken üretim formu o kalıbı bekleyen sayar. 0106'nın varsayılanı canlılık ölçütü yokken verilmiş muhafazakâr bir karardı (ölçüm 20); bu spec ölçütü ilk kez ölçülebilir hâle getiriyor. Bedeli yazılı: 0106'nın bir kriteri ve testi ters çevrilir, `bekliyor` pili makina durumu boş satırlarda bastırıldığı için bazı satırlarda pil kaybolur.

### Plan turunda verilen kararlar (2026-10-25, Takım Yöneticisi bütün önerileri onayladı)

- **Karar 17 (U1). Kopmuş bağda türetilen durum kalıbın işaretine bakar** (R15'i daraltır): bağ canlı değilse kalıp hiç forma girmemiş gibi okunur; işaretliyse `gonderildi` ("KALIP SİPARİŞ VERİLDİ"), işaretsizse (0107'nin bıraktığı damgalı, işaretsiz kayıt) `bekliyor`. Spec'in "her durumda `bekliyor`" metni reddedildi: o hâlde iki işaretli bekleyen kalıp (biri hiç forma girmemiş, biri formu silinmiş) iki farklı pil gösterirdi ve pil formun geçmişine bağlanırdı. R15'in amacı korunur: bekleyen listesindeki hiçbir kalıp "üretimde" ya da "hazır" görünmez. **AC-29 ve AC-43 bu kararla daraltılır:** "SİPARİŞİ BEKLİYOR" yalnız işaretsiz damgalı kalıpta; işaretli kalıpta "SİPARİŞ VERİLDİ". 0106 Karar 17 yalnız işaretsiz kayıtta ters çevrilir.
- **Karar 18 (U2).** Silme onayındaki sayı saf `musteriDurumu.formSilinceDonenSayisi(form, { customers, partSales, uretimFormlari })` ile, bu form çıkarılmış haritada ve ölçütün kendisiyle hesaplanır; aynı anahtar iki kez sayılmaz.
- **Karar 19 (U3).** "Kaynak duran" = canlı müşteri ya da canlı Extra Kalıp (çöptekiler sayılmaz); ayna satır sarmalayıcıda atlanır.
- **Karar 20 (U4).** Onayda bugünkü cümle aynen kalır; sayı sıfır değilse ikinci cümle `formSilmeDonusMetni(n)` ("Formdaki N kalıp hemen bekleyen kalıplar listesine döner; formu geri alırsanız listeden yeniden çıkar."), metin kütüphanede, öğe `uretim-sil-donus`.
- **Karar 21 (U5).** 0106 ve 0107'nin etkilenen testleri "spec 0108 ile" notuyla güncellenir; kriterlerin yönü (bağlı kalıp beklemez, bağsız işaretli bekler) değişmez.
- **Karar 22 (U6).** Kanıt 0107'nin düzeltilmiş yoluyla: yeni ekranlar araca önce eklenir, iş raporu eski ↔ yeni çekilir, taban son kodla ikinci kez çekilir ve kayıtlar açıkça `beklenen: "ayni"` ile tabana bağlanır. `tasarim-kaynak` `ayni` kayıtta `piksel: 0` istediği için C7'nin "önce görüntüsü yok" ile doğma yolu uygulanamaz; C7'nin amacı (hiçbir mevcut kayıt `degisti` olmaz) korunur.
- **Karar 23 (U7).** Mevcut 0106/0107 kanıt ekranları da çekime alınır; damgalı her kalıbın satırı 870 numaralı formda olduğu için fark beklenmez.
- **Karar 24 (U8–U12).** Sayacın yeniden hesabı gerçek Dashboard'un yeniden çiziminde ölçülür (mutasyonla); harita getirmede tıklama başına, başlangıç tarihinde çağrı başına, sayaçta ve silme onayında `useMemo` ile kurulur; konum kayması saf testle sabitlenir; dönem metni tek yardımcıdan ve tarama iki çağıranı sabitler; Extra Kalıp sarmalayıcısı tür denetlemez (çöp ve tarih süzmeleri çağıranda).
- **Uygulama notu (kanıt aracı).** Üretim formu listesinin satır düğmeleri yalnız simgeli ve başlıksız olduğu için araca `satir-son-dugme` adımı eklendi (ilk tablo satırının son düğmesi). Yeni ekranlar `stokEkrani`'nı değiştirmez (mevcut ekranlar etkilenmesin diye `UretimFormu` doğrudan çizilir).

---

## Acceptance Criteria

### Bekleyen tanımı

- **AC-1.** Üretim formuna gönderme işareti dolu, form kimliği boş olan kalıp bekleyen sayılır (bugünkü davranış korunur).
- **AC-2.** Form kimliği dolu ve o kimlikte çöpte olmayan bir formda kalıbın satırı varsa kalıp bekleyen sayılmaz.
- **AC-3.** Form kimliği dolu ama o kimlikte hiçbir form yoksa kalıp bekleyen sayılır.
- **AC-4.** Form kimliği dolu, form var ama çöpteyse kalıp bekleyen sayılır.
- **AC-5.** Form kimliği dolu, form canlı ama o formda kalıbın satırı yoksa kalıp bekleyen sayılır.
- **AC-6.** Elle `hazir` yazılmış kalıp, bağı kopmuş olsa da bekleyen sayılmaz.
- **AC-7.** Elle `teslim` yazılmış kalıp, bağı kopmuş olsa da bekleyen sayılmaz.
- **AC-8.** Üretim formundan türeyen `hazir` durumu (elle yazılmamış) kalıbı bekleyen olmaktan çıkarmaz.
- **AC-9.** *(revizyon 2)* Ne gönderme işareti ne form kimliği taşıyan kalıp hiçbir hâlde bekleyen sayılmaz (R1, Karar 7).
- **AC-10.** Ölçüt Extra Kalıp satışında da aynı beş hâlde aynı sonucu verir.
- **AC-11.** Ayna satır (0107) hiçbir hâlde bekleyen sayılmaz.
- **AC-12.** *(revizyon 2)* Kaynak taraması: bekleyen ölçütü tek saf yerde yazılıdır; getirme, Anasayfa sayacı ve başlangıç tarihi hesabı `uretimFormId` üzerinden kendi ölçütünü yazmaz. Tarama `src/components/stock/UretimFormu.jsx` ile `src/components/Dashboard.jsx`'e bakar (0107 R11/2 deseni); gerekçeli istisnalar `musteriDurumu.js`'in kendisi, `saveForm`'un damgalama adımı ve kanıt aracının düzenekleridir (ölçüm 30).

### Dört kopma hâli, uçtan uca

- **AC-13.** Bir kalıp forma eklenip form kaydedildikten sonra satırı silinip form yeniden kaydedilince "Bekleyen Kalıpları Getir" o kalıbı yeniden getirir.
- **AC-14.** Form çöpe atılınca "Bekleyen Kalıpları Getir" o formdaki kalıpları yeniden getirir.
- **AC-15.** Çöpe atılmış form geri alınınca aynı kalıplar bekleyen listesinden çıkar ve getirme onları getirmez.
- **AC-16.** Geri alma hiçbir kalıbın form kimliğini değiştirmez.
- **AC-17.** Form Çöp Kutusu'ndan kalıcı silinince kalıpları bekleyen kalır.
- **AC-18.** "Dönemi Sonlandır" ile kapatılmış formdaki kalıplar bekleyen sayılmaz.
- **AC-19.** Yeniden getirilen kalıp yeni forma eklenip kaydedilince form kimliği yeni formu gösterir.

### Sayaç ve tarih

- **AC-20.** Anasayfa'nın "Üretimde Bekleyen Kalıplar" sayacı bağı kopmuş kalıbı sayar.
- **AC-21.** Sayaç, satırı canlı bir formda duran kalıbı saymaz.
- **AC-22.** Yeni formun başlangıç tarihi hesabı bağı kopmuş kalıbın tarihini de dikkate alır, yani geçmiş tarihli kopmuş kalıp yeni formda getirilebilir.
- **AC-23.** Sayaç tarihten bağımsız kalır, getirme tarih aralığına bağlı kalır; aradaki fark bilinçli olarak korunur.

### Kullanıcıya görünen

- **AC-24.** *(revizyon 2)* Üretim formu silme onayı kaç kalıbın bekleyen listesine döneceğini yazar; sayı R13/2'nin tanımına göre hesaplanır ve satır sayısı değildir.
- **AC-25.** Dönecek kalıp yoksa onayda o cümle yazılmaz.
- **AC-26.** Çöp Kutusu'ndaki üretim formu satırı formun tarih aralığını yazar.
- **AC-27.** Notu olan form çöp satırında notuyla birlikte görünür.
- **AC-28.** *(revizyon 2)* Tarih aralığı boş olan (çok eski) formun çöp satırı eski tek alan `tarih`'e, o da boşsa `fmtDate`'in `—` değerine düşer ve ekran çökmez (R14/2).

### Tutarlılık ve değişmeyenler

- **AC-29.** *(revizyon 2)* Bağı kopmuş bir kalıp müşteri listesinde "KALIP SİPARİŞİ BEKLİYOR" pilini gösterir ve aynı anda bekleyen listesinde görünür; iki ekran aynı haritayı ve aynı canlılık ölçütünü okur (R15, Karar 16).
- **AC-30.** Üretim formu kaydetmenin damgalama adımı değişmez.
- **AC-31.** Kaynak taraması: bu iş yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı ve yeni birleştirme kuralı eklemez.
- **AC-32.** `tests/uretim-bekleyen-tarih.test.js` düzeneğine ilgili form eklendikten sonra testin bütün beklentileri aynen geçerli kalır.

### QA turu kriterleri (2026-10-25)

- **AC-33.** Form kimliği dolu, gönderme işareti boş ve bağı kopmuş kalıp bekleyen sayılır (Karar 7).
- **AC-34.** Ölçüt tek saf çekirdek artı iki sarmalayıcıdır ve `enEskiBekleyenKalipTarihi` üçüncü argüman olarak `uretimFormlari` alır; tek çağıranı onu geçer (R18, R18/2).
- **AC-35.** Extra Kalıp satışı tarafı da aynı çekirdeği çağırır; getirme, sayaç ve tarih hesabı `ps.uretimFormGonder` ile `ps.uretimFormId` üzerinden kendi kuralını yazmaz (R18).
- **AC-36.** Silme onayındaki sayı elle eklenen satırı, kaynağı başka forma damgalanmış satırı, kaynağı silinmiş satırı ve elle `hazir` ya da `teslim` yazılmış kalıbı saymaz (R13/2).
- **AC-37.** Anasayfa sayacı bir form çöpe atıldıktan sonra yeniden çizilmeye gerek kalmadan artar (`useMemo` bağımlılığı, R19).
- **AC-38.** Haritayı almayan bir çağıranda bütün damgalı kalıplar bekleyen görünür; bu bilinen sınır testle sabitlenir ve üç çağrı yerinin haritayı geçtiği taramayla gösterilir (R20).
- **AC-39.** Satır açık formdan silinip form kaydedilmeden "Bekleyen Kalıpları Getir" o kalıbı getirmez; hiç kaydedilmemiş yeni formda aynı akış kalıbı hemen getirir (R8/2).
- **AC-40.** Bağı hiç kurulmamış, yalnız işaretli ve elle `hazir` yazılmış kalıp ne getirilir ne sayılır; aynısı `teslim` için de geçerlidir (R4/2).
- **AC-41.** Elle `uretimde`, `gonderildi` ya da `bekliyor` yazılmış kalıp, öteki şartlar sağlanıyorsa bekleyen kalır (R4/3).
- **AC-42.** Konum kayması sonrası bağ kopmuş sayılır: kalıp bekleyen listesine döner ve ikinci bir forma eklenebilir; davranış testle sabitlenir ve bilinen sınır olarak yazılır (C4/2).
- **AC-43.** Damga dolu ama bağ canlı değilken 0106'nın türetmesi `bekliyor` döner; elle yazılmış durum bu kuraldan etkilenmez (R15, Karar 16).
- **AC-44.** Çöp Kutusu'ndaki dönem metni form listesindeki metinle birebir aynıdır (aynı yardımcıdan gelir): iki uç aynı günse tek tarih, değilse iki tarih (R14/2, R14/3).

---

## Görsel kanıt

| Kriter | Ekran | Ne gösterir | Kayıt |
|---|---|---|---|
| AC-24 | **Yeni:** üretim formu listesi ve silme onayı (satırlı form) | Onayda dönecek kalıp sayısı | `UretimFormu.jsx`, yeni ekran |
| AC-25 | **Yeni:** aynı onay, dönecek kalıbı olmayan form | Cümle yazmıyor | Aynı yeni ekran, ikinci adım |
| AC-26, AC-27, AC-44 | **Yeni:** Ayarlar, Çöp Kutusu, çöpte üretim formu olan düzenek | Dönem metniyle adlandırılmış satır, notuyla birlikte | `SettingsTrash.jsx`, yeni ekran |

Kanıt kayıtları `docs/evidence/kanit-eslemesi.json`'a eklenir. **Hiçbir mevcut kayıt `degisti` olmaz** (C7, Karar 15): bugünkü çöp ekranlarının hiçbirinde üretim formu satırı yok ve `uretim-formu` ekranı boş listeyle açılıp yeni form düzenleyicisine geçiyor (ölçüm 21), yani etiket ve onay değişikliği mevcut ekranlarda sıfır piksel üretir. Yeni ekranlar ilk raporda `fark: "önce görüntüsü yok"` ile doğar (piksel anahtarı taşımaz) ve kayıtları `beklenen: "ayni"` olarak girer. Kanıt aracının `ayarlar()` düzeneğine çöpte bir üretim formu, `stokEkrani`'na ise satırlı iki form eklenir.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Bekleyen ölçütü React'sız saf modülde yazıldı ve kendi testi var; arayüz yalnız çağırıyor.
- [x] Aynı bağı okuyan iki yer (0106'nın durum türetmesi ve bu spec'in ölçütü) **aynı haritayı ve aynı canlılık ölçütünü** kullanıyor ve aynı şeyi söylüyor (R15); harita her ekranda bir kez kuruluyor, satır başına değil (C2/2).
- [x] Ölçütün imzası, iki sarmalayıcısı ve `enEskiBekleyenKalipTarihi`'nin üçüncü argümanı yazıldı; Extra Kalıp tarafı da aynı çekirdeği çağırıyor (R18, AC-34, AC-35).
- [x] Anasayfa sayacının `useMemo` bağımlılık listesine `uretimFormlari` eklendi ve kendi testi var (R19, AC-37).
- [x] Silme onayındaki sayı ölçütün kendisiyle hesaplanıyor; dört sapma testle dışlandı (R13/2, AC-36).
- [x] Yeni kalıcı alan yok; dört nokta kuralı devreye girmiyor ve bu AC-31 ile gösterildi.
- [x] Yeni veri bölümü yok; `BLOB_SECTIONS` / `MERGE_KEYS` dokunulmadı.
- [x] **Yeni eylem izni eklenmedi** (C1); sunucu tarafı değişmedi ve bu kaynak taramasıyla gösterildi.
- [x] Çöp kutusu simetrisi korundu: geri alma ve kalıcı silme kaynağa yazmıyor (C5), geri alma AC-15 ve AC-16 ile ölçüldü.
- [x] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı yok, çeviri anahtarı eklenmedi.
- [x] Para gösterilmiyor; çoklu para kuralı devreye girmiyor.
- [x] Arayüz kriterlerinin görsel kanıtı eklendi (boş durum, yani dönecek kalıbı olmayan formun onayı ve çöpte üretim formu olan Çöp Kutusu dâhil); **hiçbir mevcut kanıt kaydı `degisti` olmadı** (C7).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'nin üretim formu, 0106 ve 0107 bölümleri güncellendi: bekleyen kalıbın ölçütü artık saklı kimlik değil bağın canlılığıdır, ölçüt "işaret ya da bağ" ile başlar ve 0106'nın kopmuş bağ varsayılanı `bekliyor` oldu.
- [x] `specs/README.md`'nin "Açık bulgular" tablosundaki `kalipIdx` satırına bu spec'in zararı büyüttüğü notu düşüldü (C4/2).
- [x] Sürüm notu yazıldı: bir formu çöpe atmak kalıplarını bekleyen listesine **hemen** döndürür ve geri almak listeden çıkarır; elle "Hazır" ya da "Teslim edildi" yazılmış kalıp artık hiç gönderilmemiş olsa da listede görünmez; kalıp sırası değişmiş kayıtlarda kalıp bekleyen listesine dönebilir; çöpten geri alma hakkı otuz gün sonra sona erer.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu, 2026-10-25)

Yirmi bir bulgu çıkarıldı, Takım Yöneticisi hepsini onayladı ve spec'e işlendi.

| No | Derece | Bulgu | Nereye işlendi |
|---|---|---|---|
| B-1 | Bloklayıcı | R1'in ilk şartı 0107'nin bıraktığı damgalı ve işaretsiz kayıtları kalıcı olarak öksüz bırakıyor | R1, R1/2, Karar 7, AC-9, AC-33, ölçüm 13 |
| B-2 | Bloklayıcı | Ölçütün imzası, adı ve Extra Kalıp karşılığı tanımsız; 0107 R16/2'nin sözü tutmuyor | R3/2, R18, R18/2, Karar 8, AC-34, AC-35, ölçüm 11, ölçüm 12 |
| B-3 | Bloklayıcı | Silme onayındaki sayı tanımsız; satır sayısı dört sebeple yanlış | R13/2, Karar 9, AC-24, AC-36, ölçüm 14 |
| Ö-1 | Önemli | Anasayfa sayacının `useMemo` bağımlılıkları eksik kalacak | R19, Karar 10, AC-37, ölçüm 15 |
| Ö-2 | Önemli | Haritayı almayan çağıran bütün damgalı kalıpları bekleyen görür | R20, Karar 11, AC-38, ölçüm 16 |
| Ö-3 | Önemli | Satır silindikten sonra kaydedilmeden getirme çalışmıyor | R8/2, Karar 12, AC-39, ölçüm 17 |
| Ö-4 | Önemli | R4 hiç gönderilmemiş kalıbı da listeden çıkarır; bugünkü davranış değişiyor | R4/2, R4/3, Karar 13, AC-40, AC-41, ölçüm 18 |
| Ö-5 | Önemli | C4'ün "ne büyütür" iddiası yanlış: konum kayması kalıbı bekleyen listesine döndürür | C4/2, Karar 14, AC-42, ölçüm 19, DoD |
| Ö-6 | Önemli | İki ekran hâlâ iki şey söylüyor: liste "bekliyor", müşteri satırı "Sipariş verildi" | R15, R15/2, Karar 16, AC-29, AC-43, ölçüm 20 |
| Ö-7 | Önemli | Görsel kanıt planı yanlış: bugünkü ekranlarda üretim formu satırı yok | C7, Karar 15, Görsel kanıt tablosu, DoD, ölçüm 21 |
| K-1 | Küçük | "Harita tek kez kurulur" ifadesi bugünkü mimariyle çelişiyor | C2, C2/2, DoD, ölçüm 22 |
| K-2 | Küçük | Başlık "ikinci blok" diyor, ölçüm 9 "ilk blok" | Başlık (Ters çevrilen kriterler), ölçüm 23 |
| K-3 | Küçük | Çöp satırının tarih biçimi tanımsız | R14/2, AC-44, ölçüm 24 |
| K-4 | Küçük | AC-28'in "bugünkü yedek değer"i ölçülemez | R14/2, AC-28, ölçüm 24 |
| K-5 | Küçük | Etiketin yeri yazılı değil (`copKutusu.js` mi, satır içi mi) | R14/3, ölçüm 25 |
| K-6 | Küçük | Aynı kalıbın iki canlı formda bulunması hangi hâllerde mümkün | X9, ölçüm 26 |
| K-7 | Küçük | Silme onayının metni kalıpların hemen döndüğünü söylemiyor | R13/3, ölçüm 27 |
| K-8 | Küçük | "Dönemi Yeniden Aç" kalıcı değil | X8, ölçüm 28 |
| K-9 | Küçük | Otuz günlük temizliğin görünmeyen yanı (geri alma hakkı sessizce sona erer) | DoD sürüm notu, ölçüm 29 |
| K-10 | Küçük | AC-12'nin taramasının kapsamı ve istisnaları belirsiz | AC-12, ölçüm 30 |
| K-11 | Küçük | Satır atıfları 0107'den sonra kaydı | Başlık, Context, ölçüm 1-8, ölçüm 31 |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `40bfeaa` | Dal `feat/0108-uretim-formu-bagi`, taban `3169f71`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | Revizyon 2 QA turu (21 bulgu), revizyon 3 plan turu (Karar 17–24; kopmuş bağın pili işarete bağlandı) |
| **Düzeltme turu sayısı** | 1 | Triyaj: üç bulgu (1 orta, 1 düşük-orta, 1 düşük): "boş" onay ekranı (triyaj anında düzeltilmişti, bekçi test eklendi), silme sayısının damga şartı testsizdi, kapanış belge adımları |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Bulgu 1 ilk çekimin önizlemesine bakıyordu; kusur gerçekti, düzeltmesi triyajla çakıştı |
| **Regresyon sayısı** | 0 | Tam takım 411 dosya, 5501 test (Electron dahil); lint 0 hata; tip denetimi temiz |
| **Kaçan hata** | 0 | Kusur testleri eski kodla kırmızı, önkoşullar yeşil; altı mutasyonun altısı yakalandı (beşi uygulamada, biri triyajda) |

**Görsel kanıt:** 25 ekran × 2 tema; iş raporunda yalnız silme onayı ve Çöp Kutusu ekranı değişti, 0106 pilleri dahil mevcut 22 ekran 0 fark (C7); taban son kodla 50 görüntü 0 fark.

**Bu spec'ten çıkarılan ders:** Kanıt ekranı sıralanan bir listede "n. satır" seçiyorsa düzenekteki dizinin sırası değil ekranın sıralaması belirleyicidir; iki ekranın farklı şeyi gösterdiğini çekimden sonra görüntüyle doğrulamak gerekir (0 piksel testi bunu yakalamaz). Bir sayım şartının testi, o şartın tek başına belirleyici olduğu hâli kurmalı; başka bir şartın zaten dışladığı satır şartı sınamaz.
