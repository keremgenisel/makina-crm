# 0104 — Serisiz stok satırı düşülürken seri numarası girilebilir

| | |
|---|---|
| **Durum** | Onaylandı (revizyon 4, plan turu 2026-10-23) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteri ekleme ve seri numarası bekleyen düzenleme formunun stok seçicisi (`src/components/customers/CustomerAddEditForm.jsx:200-246`: serisiz dalda `aria-label`'lı seri numarası girişi, iki ekran metni, stok seçicisinin seri bekleyen düzenlemedeki kapısı ve model değişiminde işaretlerin sıfırlanması); `Customers.jsx`'in serisiz dalında yalnız bir bildirim (C1 istisnası, R17); `scripts/evidence/0009-sayfa.jsx` (yeni kanıt ekranı ve stoklu fikstürü); `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0104-taban-piksel-raporu.json`, `docs/evidence/0104-piksel-raporu.json`, `docs/evidence/0104-kapanis-piksel-raporu.json`; `tests/ui/stok-durumu-0100-satis.test.jsx` ya da yeni bir test dosyası ve `tests/ui/stok-durumu-0100-app.test.jsx` (AC-27) |
| **Bağımlı spec'ler** | 0100 (serisiz düşüm, motorun satır seçimi, seçenek metinleri, parti damgası kuralı), 0101 (kalıp çapının düşülen satırdan ön doldurulması), 0103 (**uygulandı**, commit `be86973` ve `d9033b6`: geçmiş kayıtların partisinin düzeltilmesi; bu spec yeni kayıtların doğru doğmasını sağlar; ortak dosya `CustomerAddEditForm.jsx`, ölçüm 21), 0022 (üretim partisi damgası), 0002 (üretim tarihi damgası) |
| **Ters çevrilen kriterler** | **Yok.** Hiçbir spec'in kriteri serisiz seçenekte seri numarası girilemediğini sabitlemiyor (ölçüm 8); değişen şey iki ekran metni, yeni bir alan ve stok seçicisinin seri bekleyen düzenlemedeki kapısıdır. Spec 0103'ün beş kriteri aynen yeşil kalır (ölçüm 24). Görsel kanıtta bir yeni ekran eklenir, mevcut altı ekran değişmez, ayrıntı "Görsel kanıt" bölümünde |

---

## Intent

Satış formu bugün seri numarasını girmek ile makinayı stoğa bağlı tutmak arasında seçim yaptırıyor:

- **"Seri no'suz stoktan düş"**: stok düşülür, üretim partisi ve üretim tarihi otomatik damgalanır, ama seri numarası alanı hiç çizilmez ve ekrandaki metin numarayı sonra girmeyi söyler.
- **"Manuel gir (stok dışı / eski müşteri)"**: seri numarası hemen yazılır, ama stok düşülmez ve `sourceStockId`, `uretimTarihi`, `partiId` birlikte boş kalır.

Stoğa makinalar seri numarası olmadan giriliyor (21 canlı satırın 18'i, ölçüm 6), yani bu ikilem neredeyse her satışta karşımıza çıkıyor. Satış anında numarası elinde olan kullanıcı doğal olarak manuel girişi seçiyor ve kayıt stok bağı olmadan doğuyor. Spec 0103'ün düzelttiği on üç kaydın tamamı bu yoldan doğdu.

Bu spec ikilemi kaldırır: serisiz bir stok satırı düşülürken seri numarası aynı ekranda girilebilir. Spec 0103 doğmuş kaydı düzeltilebilir kılar, bu spec kaydın doğru doğmasını sağlar; ikisi farklı zamanı çözer ve biri ötekinin yerini tutmaz.

---

## Requirements

### Serisiz düşümde seri numarası

- **R1.** Stok seçicisinde serisiz seçenek (`__serisiz__`) seçildiğinde seri numarası girişi **aynı ekranda** çizilir ve doldurulabilir.
- **R1/2.** Alan kendi erişilebilir adını taşır: `aria-label="Seri numarası"`. Kuşatan `Field label="Seri Numarası"` hiçbir öğeyi etiketlemiyor, çünkü `ui.jsx`'in `Field`'i yalnız ilk çocuğu ve ancak o çocuk `Input`, `Select` ya da `MoneyInput` ise etiketler; serisiz dalın çocuğu bir fragment (ölçüm 13). Ad olmadan AC-1, AC-3 ve AC-7 yer tutucuyla ölçülmek zorunda kalır.
- **R2.** Alan isteğe bağlıdır. Boş bırakılırsa bugünkü davranış birebir korunur: kayıt seri numarası bekleyen olarak doğar (`seriNoBekliyor`) ve numara sonradan düzenlemeden girilir.
- **R3.** Girilen numara **yalnız satış kaydına** yazılır (`customers.serialNo`). Düşülen stok satırına yazılmaz, çünkü o satır aynı kayıtta diziden çıkarılıyor (R6).
- **R4.** Alanın yeri seçicinin hemen altıdır, bugünkü uyarı metninin durduğu yer (Karar 8).
- **R5.** Seçicinin serisiz dalındaki metin güncellenir: numaranın şimdi girilebileceğini ve boş bırakılırsa sonra girilebileceğini söyler (Karar 1).

### Kayıt yolu

- **R6.** Kayıt yolu **değişmez**. Stok düşümü bugünkü gibi `serisizDusulecek` motorunun seçtiği satırı kimlikle düşer, `sourceStockId`, `uretimTarihi` ve `partiId` o satırdan damgalanır, satır diziden çıkarılır. Serisiz dal `serialNo`'ya hiç dokunmadığı için (ölçüm 3) form değeri kayda olduğu gibi girer ve ek kod gerekmez.
- **R7.** Düşülecek satırın seçimi girilen seri numarasından **etkilenmez**: motor satırı modele, duruma ve stoğa giriş tarihine göre seçer (spec 0100 R6/3). Kullanıcının yazdığı numara stokta aranmaz.
- **R8.** Kit ön doldurması ve kalıp çapı ön doldurması değişmez: ikisi de seçenek seçildiği anda motorun seçtiği satırdan gelir (spec 0100 R6/3, spec 0101 R13).
- **R9.** `seriNoBekliyor` yalnız seri numarası boş kaldığında doğar; bu bugünkü kuraldır ve değişmez (ölçüm 4).
- **R10.** Üretim partisi seçicisi serisiz seçimde bugünkü gibi **çizilmez** ve formda seçilmiş parti kayda girmez (spec 0100 R7/2b): parti stok satırından gelir.

### Değişmeyenler

- **R11.** Serili seçenek ve onun seri numarası kilidi değişmez.
- **R12.** "Manuel gir (stok dışı / eski müşteri)" seçeneği kalır. Amacı daralmaz, netleşir: stoğa hiç girmemiş makina ve eski müşteri kaydı. İpucusuna stoktaki bir makina satılıyorsa doğru yolun gösterildiği bir cümle eklenir (Karar 5).
- **R12/2.** O cümle hedefini adıyla söyler ve yalnız hedef ekranda varken çizilir: metin "Stoktan seçime dön" düğmesini gösterir ve cümlenin yeni yarısı `stockForModel.length > 0` koşuluna bağlanır (ölçüm 16). Manuel kipte `Select` hiç çizilmediği için "yukarıdaki seçenek" var olmayan bir şeyi gösterirdi; o modelden hiç stok yokken de dönülecek bir liste yoktur. İpucunun "Manuel girilen seri no stoktan düşülmez" ön eki aynen korunur (C7).
- **R13.** `src/lib/stokDurumu.js` motoru, `serisizDusulecek`, `serisizSecenekMetni` ve `seriliSecenekMetni` değişmez.
- **R14.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı, yeni kilit alanı ve yeni birleştirme kuralı yok.
- **R15.** Parti Üretim Panosu, Parti Hesabı ve makina maliyeti motorları değişmez. Doğru doğan kayıt bugünkü kurallarla sayılır.

### İkinci düşümün kapatılması ve sessiz bozuk kaydın görünmesi

- **R16.** Seri numarası bekleyen kaydın düzenlemesinde stok seçicisi **yalnız kaydın `sourceStockId`'si yokken** çizilir; varsa düz seri numarası girişi çizilir. Gerekçe ölçüm 11: serisiz satış stoğu kayıt anında düşer ve kayda `sourceStockId` yazar, o kaydın düzenlemesinde `wasSerialPending` doğru olduğu için `deductMachineStock` yine çağrılır ve `__serisiz__` seçilirse **ikinci** bir stok satırı düşülür, ilk satırın kimliği kaybolur. Kapı çizim katmanındadır, kayıt yolu değişmez (C1).
- **R16/2.** `sourceStockId` taşıyan seri bekleyen kaydın düzenlemesinde ikinci bir stok satırı düşülmez ve `sourceStockId` değişmez. Kaydın `sourceStockId`'si yoksa (satır yarışında kaybolmuş ya da manuel girişle boş seriyle doğmuş kayıt) stok seçicisi bugünkü gibi çizilir ve düşüm yapılır.
- **R17.** Serisiz seçim kaydedilemediğinde kullanıcı bunu görür. İki yol ölçüldü (ölçüm 15): satır yarışında `serisizDusulecek` null döner ve hiçbir şey yazılmaz; model serisiz seçimden sonra stoğu olmayan bir modele çevrilirse seçici hiç çizilmez ama işaret açık kalır. İkisinde de bugün kayıt `seriNoBekliyor` ile doğup iş listesinde görünüyordu, numara girilince o işaret hiç doğmaz. Bu yüzden: **(a)** model değişiminde `_stokSerisiz` ve `serialNo` sıfırlanır (çizim katmanı); **(b)** serisiz dalda düşülecek satır bulunamazsa bildirim çıkar ("Stoktan düşülecek satır bulunamadı, satış stok bağı olmadan kaydedildi"), kaydın şekli değişmez.
- **R18.** Serisiz dalda girilen numara o modelin **canlı bir stok satırında** duruyorsa engellemeyen bir ipucu çizilir: "Bu seri numarası stokta duruyor; o makinayı satmak için listeden serili satırı seçin." Veri hazır (`stockForModel`), motorun seçimi değişmez (R7) ve kayıt engellenmez. Gerekçe ölçüm 14: uyarısız hâlde kullanıcı aynı fiziksel makinayı bir yanda "satışa hazır" bir yanda "satıldı" sayan bir çift kayıt üretir ve veri bu çelişkiyi hiçbir yerde göstermez.

---

## Constraints

### Uyulması zorunlu

- **C1.** Değişiklik yalnız çizim katmanındadır; `satisKaydi.js` ve `stokDurumu.js`'e hiç dokunulmaz (ölçüm 3 bunun yeterli olduğunu gösteriyor). **İkinci istisna Karar 36'dır** (ekleme kolunda `deductMachineStock`'un yeri). **Birinci istisna R17/b'nin bildirimidir:** `deductMachineStock`'un serisiz dalına yalnız "satır bulunamadı" bildirimi eklenir, kaydın şekli (yazılan ve silinen anahtarlar) birebir aynı kalır. Düşüm kuralı, satır seçimi ve damgalama değişmez.
- **C2.** Spec 0100 R7/2b bozulmaz: serisiz seçim varken parti seçicisi çizilmez ve formdaki parti kayda girmez. 0100'ün bunu sabitleyen kriterleri ve triyaj testleri (`bulgu 3`) dokunulmadan yeşil kalır.
- **C3.** Spec 0101'in çap ön doldurması ve 0100'ün kit ön doldurması aynı satırdan gelmeye devam eder; seri numarası girişi bu iki doldurmayı tetiklemez ve bozmaz.
- **C4.** Boş seri numarasıyla kaydedilen satış bugünküyle **birebir aynı** kayıt üretir (alan sayısı, anahtarlar ve değerler). Kıyas fikstürüyle ölçülür.
- **C5.** Seçicinin `value` mantığı korunur: serisiz seçim işareti seri numarasından önce okunur, yani numara dolsa da seçici serisiz seçenekte kalır.
- **C6.** "Seri No Bekleyen" süzgeci ve o listenin kuralı değişmez; yalnız içine daha az kayıt düşer, çünkü numara satış anında girilebilir.
- **C7.** Manuel giriş ipucusunun "Manuel girilen seri no stoktan düşülmez" ön eki **aynen** korunur ve metin `<Ipucu>` içinde kalır: `tests/form-kaynak.test.js:49` o çifti tutuyor ve `ipucuIcinde` ile kuşatan öğeyi denetliyor (ölçüm 19). Serisiz dalın uyarı metni o listede değildir, serbesttir.
- **C8.** Spec 0103'ün kaynak taramaları dokunulmadan yeşil kalır (ölçüm 24): `tests/parti-duzeltme-0103.test.js` `useLock(` çağrısını **iki** sayar, `partiSecicisi` ifadesini birebir, `stokSecicisiKipi`'nin tanımını ve ipucunun `PANO_SEKME_ADI`'ndan geldiğini sabitler. Bu iş yeni kilit açmaz ve parti seçicisinin kapısına dokunmaz.

### KAPSAM DIŞI

- **X1.** Bugüne kadar manuel girişle satılmış makinaların stokta kalmış olabilecek satırlarının tespiti ve temizliği — *neden:* veri hangi satırın hayalet olduğunu söylemiyor (ölçüm 7): stok satırları serisiz, satılmış makinalar serili, eşleştirecek alan yok ve `makina_uretimi` stok hareketi hiç yazılmadığı için iz de yok (0103 ölçüm 16). Kullanıcı Makina Stoğu'ndan elle siler.
- **X2.** Manuel giriş seçildiğinde uyarı, onay ya da engel — *neden:* seçenek meşru bir ihtiyacı karşılıyor (stok dışı makina, eski müşteri kaydı) ve her kullanımında uyarı vermek onu kullanılamaz hâle getirir. İpucu metninin netleşmesi yeter (R12).
- **X3.** Serisiz düşümde girilen seri numarası için kayıt kilidi — *neden:* numara stokta olmadığı için seçim yarışı yok; aynı satırı iki kullanıcının düşme yarışı bugünkü triyaj kuralıyla karşılanıyor (satır kaybolursa parti ve kaynak yazılmaz, spec 0100 bulgu 3).
- **X4.** Girilen numaranın düşülen stok satırına yazılması — *neden:* satır aynı kayıtta siliniyor, yazmak ölü veri olur.
- **X5.** Stoğa makina eklenirken seri numarasının zorunlu olması — *neden:* numara makina bitince belli oluyor, stoğa girişte çoğu zaman yok; bugünkü "Boş bırakılabilir, sonra atanır" kuralı doğru.
- **X6.** Üretim formundan ya da başka bir kayıttan seri numarasının otomatik getirilmesi — *neden:* ayrı bir veri bağı kurmayı gerektirir ve kendi kararını ister.
- **X7.** "Manuel gir" seçeneğinin kaldırılması — *neden:* stok dışı satış ve eski müşteri kaydı gerçek bir ihtiyaç; seçenek kalkarsa o kayıtlar hiç girilemez.
- **X8.** Satış formunun diğer alanlarının yerleşimi ve stok seçicisinin görünümü — *neden:* bu iş bir alan ekler ve seri bekleyen düzenlemede seçicinin kapısını daraltır (R16), ekranı yeniden düzenlemez.
- **X9.** Girilen seri numarasının kırpılması — *neden:* yalnız boşluk içeren değer bugün de dolu sayılıyor (`!clean.serialNo` ölçütü, ölçüm 23) ve kırpma kayıt yolunu değiştirir (C1). Bu bugünkü manuel giriş davranışıdır; değiştirilmesi ayrı bir karardır.
- **X10.** Model değişiminde kit ve kalıp çapı ön doldurmasının eski satırdan kalması — *neden:* bu daha eski ve daha geniş bir boşluktur (model seçimi hiçbir işareti sıfırlamıyor, ölçüm 15) ve 0100 ile 0101'in ön doldurma kurallarına dokunur. R17/a yalnız bu işin açtığı yarıyı (`_stokSerisiz` ve `serialNo`) kapatır; kit ve çap için README'nin açık bulgular bölümüne madde yazılır.

---

## Context

**Ölçüm 1, seçicinin üç seçeneği.** (Satır numaraları spec 0103'ün uygulanmasından sonra güncellendi, ölçüm 21.) `CustomerAddEditForm.jsx:200` stok seçicisi yalnız ekleme ve seri numarası bekleyen düzenlemede, model seçiliyken, o modelden stok satırı varken ve manuel giriş seçilmemişken çizilir. Seçenekler `:220-225`: boş seçenek, serili satırlar (`seriliSecenekMetni`), serisiz tek seçenek (`serisizSecenekMetni`), manuel giriş.

**Ölçüm 2, serisiz dalda numara girilemiyor.** `:206-210` serisiz seçenek seçilince `serialNo` boşaltılır ve kit ile çap motorun seçtiği satırdan doldurulur. `:227-231` o dalda yalnız bir uyarı metni çizilir: "Seri no'suz satış yapılıyor, stoktan 1 adet düşülecek. Seri no'yu sonra 'Müşteriyi Düzenle' bölümünden girebilirsiniz." Seri numarası `<input>`'u `:249` satırındadır ve o satıra ancak seçici hiç çizilmediğinde ya da manuel giriş seçildiğinde ulaşılır (`:200`'ün `return`'ü).

**Ölçüm 3, kayıt yolu zaten hazır.** `Customers.jsx:273-278` serisiz dal `clean.partiId`'yi siler, `serisizDusulecek(stock, clean.model)` ile satırı bulur, `stoktanDamgala` ile `sourceStockId`, `uretimTarihi` ve `partiId` yazar ve satırı diziden çıkarır. `clean.serialNo`'ya **hiç dokunmaz**. Yani form seri numarasını taşırsa kayda olduğu gibi girer; kayıt yolunda değişiklik gerekmez.

**Ölçüm 4, `seriNoBekliyor` kuralı.** `Customers.jsx:305` ekleme kolunda `if (!clean.serialNo) clean.seriNoBekliyor = true;`, `:357` düzenleme kolunda numara girilince bayrak düşer. Numara satış anında girilirse bayrak hiç doğmaz, yani kural ek kod istemeden doğru çalışır.

**Ölçüm 5, kit ve çap ön doldurması.** `:87` `getKitAutoFill` ile `kalipCapiOnDoldur` seçenek seçildiği anda çalışır ve motorun seçtiği satırı okur (`serisizDusulecek(stockForModel, form.model)`, `:209`; yazım `:210`). Seri numarası girişi bu akışa girmez.

**Ölçüm 6, stoğa makinalar serisiz giriyor.** Kullanıcının 22 Ekim 2026 yedeğinde 21 canlı stok satırının **18'i** seri numarasız. Panonun eksik saydığı modelin üç satırı da serisiz. Stok formunda alan zaten isteğe bağlı: `MakinaStokTab.jsx:276` yer tutucusu `Boş bırakılabilir — sonra atanır` der ve numara düzenlemeden sonradan girilebilir.

**Ölçüm 7, hayalet satır mekanizmadan geliyor ama bu yedekte kanıtı yok.** Manuel girişte stok düşülmediği için, satılan makina stokta duruyorsa satırı stokta kalır ve pano onu "satışa hazır" saymaya devam eder. Bu yedekte böyle bir satır **kanıtlanamıyor**: panonun eksik saydığı modelde üç stok satırı ve iki satış planın beşini tam kapatıyor, yani sayı tutuyor. İki açıklama da mümkün (makina hiç stoğa girmedi, ya da girdi ve kullanıcı satırı elle sildi) ve veri ikisini ayırt etmiyor, çünkü `makina_uretimi` stok hareketi hiç yazılmamış (0103 ölçüm 16). Bu yüzden X1.

**Ölçüm 8, ters çevrilen kriter yok.** Hiçbir spec'in kriteri serisiz seçenekte seri numarası girilemediğini sabitlemiyor; 0100 yalnız seçeneğin **metnini** sabitler (R6/2, "durum kırılımını yazar") ve o metin değişmiyor. Serisiz dalın uyarı cümlesini okuyan test de yok. Serisiz düşümü ölçen üç test dosyası var ve üçü de seçeneği seçip kaydeder, numarayı okumaz: `tests/stok-durumu-0100.test.js:95-110` (motor, AC-51 ve AC-52), `tests/ui/stok-durumu-0100-satis.test.jsx:49, 92, 157, 227` (dosya 0103 ile 180 satır büyüdü), `tests/ui/stok-kalip-capi-0101-satis.test.jsx:84, 110`. Dördüncü dosya 0103'ün eklediği `tests/parti-duzeltme-0103.test.js`'tir: serisiz düşümü ölçmez ama aynı form dosyasını tarar (C8).

**Ölçüm 9, kanıt boşluğu.** Görüntü aracında müşteri formunu çizen **altı** ekranın hepsi `stock={[]}` ile kuruluyor: `musteri-formu` (`scripts/evidence/0009-sayfa.jsx:745`), `musteri-formu-hata` (`:746`), `musteri-formu-ilk-odeme` (`:1129`), `musteri-formu-0079` (`:1249`), `musteri-formu-0094-ilce` (`:1284`) ve 0103'ün eklediği `musteri-formu-0103-parti` (`:1285`). Yani **stok seçicisi hiçbir kanıt ekranında çizilmiyor**. Bu, 0103'ün kanıt boşluğundan farklı bir nedenle aynı sonucu verir: yeni ekran eklenmeden bu işin görsel kanıtı 0 piksel verir.

**Ölçüm 10, serisiz seçimde kilit alınmaz.** `:42` `isStockSerialPick` koşulu `!form._stokSerisiz` içerir, yani serisiz düşümde seri numarası kilidi bugün de alınmıyor. Numara girilmeye başlansa da bu değişmez (X3).

### QA turu ölçümleri (2026-10-23)

**Ölçüm 11, serisiz satış stoğu kayıt anında düşer ve düzenlemede ikinci kez düşer.** `Customers.jsx:325` ekleme kolunun sonunda `deductMachineStock` çağrılır, yani serisiz satış **kaydedildiği anda** bir stok satırını düşer ve kayda `sourceStockId` yazar. O kayıt `serialNo: ""` ve `seriNoBekliyor: true` olduğu için düzenlemesinde `wasSerialPending` doğrudur (`:356`) ve `deductMachineStock` yine çağrılır (`:362`). O kipte stok seçicisi çizilir (`CustomerAddEditForm.jsx:200`, `isSerialPendingEdit`); `__serisiz__` seçilirse serisiz dal (`Customers.jsx:273-280`) `delete clean.partiId` yapar, `serisizDusulecek` ile **ikinci** bir satır bulur, onu diziden çıkarır ve `clean.sourceStockId`'yi üzerine yazar; ilk satırın kimliği kaybolur. Bugün o kipteki doğru yol "Manuel gir"dir: `_manualSerial` doğru ve `_stokSerisiz` yanlış olduğu için hiçbir dal çalışmaz, kaydın stok bağı ve partisi korunur. 0104 hem o kipe seri numarası alanı ekliyor (AC-22) hem de Karar 5 ile kullanıcıyı `__serisiz__`'e davet ediyor, yani düzeltilmezse bir makina için iki stok satırı tüketilir. Üç test dosyasındaki `BEKLEYEN` fikstürlerinin hiçbirinde `sourceStockId` yok (`tests/ui/stok-durumu-0100-satis.test.jsx:41`, `tests/ui/stok-kalip-capi-0101-satis.test.jsx:152`), yani R16'nın kapısı mevcut testlerin hiçbirini kırmaz.

**Ölçüm 12, yeni kanıt ekranının kaydı için üçüncü bir durum yok.** `tests/kanit-eslemesi.test.js:19` yalnız `ayni` ve `degisti`'yi kabul eder, `:25` done'a taşınmış spec'in `degisti` kaydını yasaklar; `tests/tasarim-kaynak.test.js:160` `ayni` kaydın raporundaki satırda `piksel === 0` ister. Yeni bir ekranın ilk raporundaki satırı ise `scripts/evidence/0009-ekran.cjs:68` yüzünden `fark: "önce görüntüsü yok"` taşır ve **`piksel` anahtarı hiç yoktur**. Canlı emsal depoda: spec 0103'ün `musteri-formu-0103-parti` kaydı `docs/evidence/0103-kapanis-piksel-raporu.json`'u gösteriyor, `beklenen: "ayni"` ve o raporun iki satırı da `piksel: 0`. 0099, 0100, 0101, 0102 ve 0103 yeni ekranlarını bu yoldan kaydetti.

**Ölçüm 13, `Field` bu dalda hiçbir öğeyi etiketlemiyor.** `src/components/ui.jsx:65-75` `Field` yalnız **ilk** çocuğu etiketler ve ancak o çocuk `Input`, `Select` ya da `MoneyInput` ise (`isSimpleComponent`) ya da etiketlenebilir bir yerel öğe ise, ayrıca kendi `id`'si yoksa. Seri Numarası alanının çocuğu bir IIFE'nin döndürdüğü fragment olduğu için `canLabel` yanlıştır ve `<label>` `htmlFor` taşımaz; bu yüzden `getByLabelText("Seri Numarası")` çalışmaz ve mevcut testler `getByText(/Stoktan seçin/).closest("select")` ile `getByPlaceholderText("AK140-2026-001")` kullanıyor. Deponun yeni alan deseni `aria-label`'dır: `aria-label="Üretim partisi"` (0100), `aria-label="Üretim tarihi"` (0002), çap alanları (0101), `aria-label="Tahsilat hesabı"` (0063).

**Ölçüm 14, girilen numara stokta duran bir satırla eşleşebilir.** Motor satırı modele, duruma ve stoğa giriş tarihine göre seçer ve girilen numarayı hiç okumaz (R7). Kullanıcı o modelin **serili** bir stok satırının numarasını yazarsa kayıt motorun seçtiği serisiz satırın kimliğiyle doğar, serili satır stokta kalır ve `partiUretimOzeti` aynı fiziksel makinayı stok satırından "satışa hazır", müşteri kaydından "satıldı" diye iki kez sayar. Veride bu çelişkiyi gösteren alan yok. Eşleşme denetimi için gereken veri formda hazır: `stockForModel` o modelin canlı satırlarıdır.

**Ölçüm 15, serisiz seçim iki yolla boşa çıkabilir ve kayıt sessiz bozuk doğar.** (1) **Satır yarışı:** `Customers.jsx:273-280` serisiz dal önce `delete clean.partiId` yapar, `serisizDusulecek` null dönerse `sourceStockId`, `uretimTarihi` ve `partiId` yazılmaz ve stok dizisine dokunulmaz. Bugün kayıt `serialNo: ""` olduğu için `:305`'te `seriNoBekliyor: true` doğar ve "Seri No Bekleyen" süzgecinde görünür (`Customers.jsx:123`); numara girilince o bayrak hiç doğmaz, yani stok bağı, parti ve üretim tarihi olmayan kayıt **hiçbir iş listesinde görünmez**. (2) **Model değişimi:** model seçimi `setForm(p => ({ ...p, model: m.model }))`'dir ve `_stokSerisiz`, `serialNo`, `_manualSerial`, kit ve çap işaretlerinin hiçbirini sıfırlamaz; serisiz seçtikten sonra stoğu olmayan bir modele geçilirse `:200`'ün koşulu bozulur, seçici hiç çizilmez, `_stokSerisiz` açık kalır ve kayıt aynı sessiz hâlde doğar. Kit ve çapın eski satırdan kalması bu işten eski ve daha geniş bir boşluktur (X10).

**Ölçüm 16, manuel ipucusunun koşulu hedefini kapsamıyor.** İpucu `:256-259`'da ve koşulu yalnız `(modal === "add" || isSerialPendingEdit) && form._manualSerial`. "Stoktan seçime dön" düğmesi ise ayrıca `stockForModel.length > 0` ister (`:250`). Manuel kipte `Select` hiç çizilmez (`:200`'ün koşulunda `!form._manualSerial` var), yani "yukarıdaki seçenek" ekranda var olmayan bir şeydir; o modelden hiç stok yokken cümle yine çizilir ve dönülecek bir liste de yoktur.

**Ölçüm 17, "dosya değişmedi" kriteri testle ölçülemiyor.** Depoda bir dosyanın değişmediğini sabitleyen test yok. Yerleşik desen içerik taramasıdır ve canlı emsal spec 0103'ün aynı boşluk için yazdığı taramadır: `tests/parti-duzeltme-0103.test.js:54-69` `ALAN_IZINLERI.customers`'ın tanımsız olduğunu, `KILIT_ALANLARI`'nın tam listesini, `MERGE_KEYS`'in müşteri satırını ve `db.cjs`'in sütun sabitini ölçer.

**Ölçüm 18, uçtan uca emsal aynı dosyada ve iki yollu.** `tests/ui/stok-durumu-0100-app.test.jsx` gerçek App'te hem ekleme (0100 AC-41) hem düzenleme (0103 AC-31) yolunu kurup Stok › Parti Üretim Panosu'nda `pano-sayi-satildi` hücresini okuyor. Serisiz seçenekle seri numarası girilerek yapılan satışın aynı düzenekle ölçülmesi üçüncü bir testtir.

**Ölçüm 19, manuel ipucusunun ön eki pinli.** `tests/form-kaynak.test.js:49` `["customers/CustomerAddEditForm.jsx", "Manuel girilen seri no stoktan düşülmez"]` çiftini tutuyor ve `ipucuIcinde` yardımcısıyla o metnin en yakın açık öğesinin `<Ipucu>` olmasını istiyor. Karar 5'in yeni cümlesi ön eki koruduğu için tarama kırılmıyor. Serisiz dalın uyarı metni (`:227-231`) o listede değil, yani serbest.

**Ölçüm 20, mevcut kanıt kayıtları.** `docs/evidence/kanit-eslemesi.json`'da `CustomerAddEditForm.jsx` altında 23 kayıt var; 0103 turu beşi mevcut ekran için (`musteri-formu`, `-hata`, `-ilk-odeme`, `-0079`, `-0094-ilce`, hepsi `0103-piksel-raporu.json`, `beklenen: "ayni"`) ve biri yeni ekran için (`musteri-formu-0103-parti`, `0103-kapanis-piksel-raporu.json`).

**Ölçüm 21, spec 0103 uygulandı.** Commit `be86973` (uygulama) ve `d9033b6` (SCORECARD, kapanış kanıtı, `specs/done`'a taşıma). Dokunulan dosyalar: `CustomerAddEditForm.jsx`, `scripts/evidence/0009-sayfa.jsx`, `tests/parti-duzeltme-0103.test.js` (yeni), `tests/ui/stok-durumu-0100-satis.test.jsx`, `tests/ui/stok-durumu-0100-app.test.jsx`, `docs/evidence/*`, `docs/tasarim-sozlugu.md`. **`Customers.jsx` dokunulmadı**, yani bu spec'in `Customers.jsx` atıfları (`:273-278`, `:305`, `:357`) doğrudur; form dosyasının atıfları üç satır kaydı (ölçüm 1, 2, 5, 10).

**Ölçüm 22, mükerrer kayıt uyarısı bu yolda ilk kez çalışacak.** `src/lib/utils.js:744` adayın seri numarasını kırpıp Türkçe küçültüyor, `:751` bütün canlı müşteri kayıtlarıyla karşılaştırıp "seri no aynı" sebebini döndürüyor; `Customers.jsx`'in `save()` ekleme kolu sonuç boş değilse uyarı penceresi açıyor ve kayıt "Yine de Kaydet" ile geçiyor. Bugün serisiz satışın numarası her zaman boş olduğu için (`adaySeri` boş) bu koruma o yolda hiç çalışmıyordu; numara girilebilir olunca çalışacak. Denetim stokta değil müşteri kayıtlarında yapılır (ölçüm 14 ayrı bir sorudur).

**Ölçüm 23, yalnız boşluk içeren numara dolu sayılıyor.** Alan değeri kırpmadan yazıyor (`:249`), `seriNoBekliyor` ölçütü `!clean.serialNo` (`Customers.jsx:305`) ve "Seri No Bekleyen" süzgeci `c.seriNoBekliyor && !c.serialNo` (`:123`). Yani `" "` yazılırsa kayıt ne numaralı ne bekleyen olur. Bu bugünkü manuel giriş davranışıdır ve kırpma kayıt yolunu değiştirir (X9).

**Ölçüm 24, spec 0103'ün yeşil kalacak kriterleri.** `tests/parti-duzeltme-0103.test.js` şunları sabitliyor: `stokSecicisiKipi` ve `partiSecicisi` tanımlarının birebir metni (`:18-21`), `useLock(` çağrı sayısının iki ve `stok-seri` kilidinin kip koşulunun `stokSecicisiKipi`'ni okumaması (`:23-30`), ipucunun `PANO_SEKME_ADI`'ndan gelmesi ve "Parti Üretim Panosu" ile "(ön sipariş)" dizelerinin dosyada bulunmaması (`:31-37`), üretim tarihi bloğunun koşulu ve yeri (`:38-46`). Ekran kriterleri AC-27 ve AC-31 `tests/ui/stok-durumu-0100-satis.test.jsx` ile `-app.test.jsx`'te. Bu iş hiçbirine dokunmaz (C8).

---

## Kararlar (Takım Yöneticisi, 2026-10-22)

**Karar 1 (onaylandı): serisiz seçenekte seri numarası girişi eklenir.** Gerekçe ölçüm 6 ve 2: stoğa makinalar serisiz giriyor, satış anında numara elde oluyor ve form kullanıcıyı stok bağı ile numara arasında seçim yapmaya zorluyor. Reddedilenin bedeli olurdu: her manuel satışta parti, üretim tarihi ve stok bağı elle telafi edilir, hatırlanmazsa pano yine eksik sayar ve 0103'ün düzeltme kapısı sürekli kullanılan bir onarım aracına döner. Yeni metin: "Stoktan 1 adet düşülecek. Seri numarasını şimdi girebilir ya da boş bırakıp sonra 'Müşteriyi Düzenle' bölümünden girebilirsiniz."

**Karar 2 (onaylandı): bugün var olan ikinci yol kapatılmaz ama yeterli sayılmaz.** Kullanıcı makina bitince stok satırına seri numarasını yazıp (ölçüm 6, alan düzenlenebilir) satışta serili seçenekten seçebilir; bu yol çalışmaya devam eder. Yeterli sayılmaz: iki ekran arasında gidiş geliş istiyor, satış anında formda olan kullanıcıyı Stok sekmesine gönderiyor ve stok satırı serisiz kaldığı sürece aynı ikilem her satışta geri geliyor. Reddedilenin bedeli olurdu: kod değişmez ama sorun bir alışkanlık sorunu olarak kalır ve tekrarlar.

**Karar 3 (onaylandı): girilen numara yalnız satış kaydına yazılır.** Gerekçe: düşülen satır aynı kayıtta siliniyor, ona yazmak ölü veri olur (X4).

**Karar 4 (onaylandı): alan isteğe bağlı kalır.** Gerekçe: numara gerçekten sonra belli olabilir ve "Seri No Bekleyen" iş listesi o durum için var. Reddedilenin bedeli olurdu: numarası henüz olmayan satış kaydedilemez.

**Karar 5 (onaylandı): "Manuel gir" korunur, ipucusu netleşir.** Yeni cümle (Karar 12 ile düzeltilmiş hâli): "Manuel girilen seri no stoktan düşülmez; stok dışı makina ve eski müşteri kaydı için uygundur. Stoktaki bir makinayı satıyorsanız 'Stoktan seçime dön' düğmesine basın." Son cümle yalnız o modelden stok varken çizilir (R12/2). Gerekçe: bugünkü metin seçeneği "eski müşteri kaydı için uygundur" diye tanıtıyor ama kullanıcıyı stoktaki makina için de davet ediyor. Reddedilenin bedeli: doğru yol eklendikten sonra bile kullanıcı yanlış seçeneği seçmeye devam edebilir.

**Karar 6 (onaylandı): kalmış olabilecek hayalet stok satırları kapsam dışı, elle temizlenir.** Kapsam dışı X1. Gerekçe ölçüm 7: veri hangi satırın hayalet olduğunu söylemiyor ve bu yedekte böyle bir satır kanıtlanamıyor. Reddedilenin bedeli: stokta satılmış bir makina duruyorsa panonun "satışa hazır" sayısı fazla kalır; bunu ancak kullanıcı fiziksel sayımla bulur. Araç yazmak için önce hangi satırın hayalet olduğunu söyleyen bir veri gerekir, o da yok.

**Karar 7 (onaylandı): yeni bir kanıt ekranı eklenir.** Adı `musteri-formu-0104-stok`: model seçili, stokta o modelden serisiz satırlar var, serisiz seçenek seçili ve seri numarası alanı görünür. Gerekçe ölçüm 9: stok seçicisi bugün hiçbir kanıt ekranında çizilmiyor, yeni ekran olmadan değişiklik 0 piksel verir. Reddedilenin bedeli: satış formunun stok seçicisi kanıt turuna hiç girmez ve sonraki bir iş onu farkında olmadan bozabilir.

**Karar 8 (onaylandı): alanın yeri seçicinin hemen altıdır.** Gerekçe: bugünkü uyarı metninin durduğu yer ve seçimin sonucu olarak okunuyor. Reddedilenin bedeli: alan Garanti Başlangıç'ın yanına konursa seçimle ilişkisi kopar.


### QA turu kararları (2026-10-23)

**Karar 9 (onaylandı, Bloklayıcı): yeni ekranın kanıt kaydı kapanış raporunu gösterir.** Taban `0104-taban-piksel-raporu.json` yeni ekranı içermez, iş raporu `0104-piksel-raporu.json` onu "önce görüntüsü yok" ile kaydeder, eşleme kaydı `docs/evidence/0104-kapanis-piksel-raporu.json` + `beklenen: "ayni"` olur. Gerekçe ölçüm 12: eşlemede yalnız iki durum var, `ayni` kayıt raporda `piksel === 0` ister ve yeni ekranın ilk raporundaki satırda `piksel` anahtarı hiç yok. Reddedilenin bedeli olurdu: kayıt iş raporunu gösterirse `tasarim-kaynak` testi kırılır, `degisti` ile girerse done'a taşınırken AC-11c'ye takılır. Beş spec (0099, 0100, 0101, 0102, 0103) yeni ekranlarını bu yoldan kaydetti.

**Karar 10 (onaylandı, Bloklayıcı): seri numarası bekleyen düzenlemede stok seçicisinin kapısı daraltılır (R16).** Kaydın `sourceStockId`'si varsa seçici çizilmez, düz seri numarası girişi çizilir. Gerekçe ölçüm 11: serisiz satış stoğu kayıt anında düşüyor, o kaydın düzenlemesinde `deductMachineStock` yine çalışıyor ve `__serisiz__` ikinci bir satırı düşüyor; 0104 hem o kipe alanı ekliyor hem Karar 5 ile kullanıcıyı oraya yönlendiriyor. Reddedilenin bedeli olurdu: bir makina için iki stok satırı tüketilir, ilk satırın kimliği kaybolur ve panonun satışa hazır sayısı bir eksilir, yani bu spec'in önlemek için yazıldığı hatanın aynısı doğar. Düşüm yoluna koşul koymak C1'i bozar ve ekranda çalışmayan bir seçenek bırakır; kapı çizim katmanında kalır ve mevcut fikstürlerin hiçbirinde `sourceStockId` olmadığı için hiçbir test kırılmaz.

**Karar 11 (onaylandı, Önemli): yeni alan `aria-label="Seri numarası"` taşır (R1/2).** Gerekçe ölçüm 13: kuşatan `Field` bu dalda hiçbir öğeyi etiketlemiyor, çünkü çocuğu bir fragment; ad olmadan AC-1, AC-3 ve AC-7 yer tutucuyla ölçülmek zorunda kalır ve alanın ekran okuyucuda adı olmaz. Reddedilenin bedeli olurdu: iki dal aynı yer tutucuyu paylaşır ve kriterler belirsizleşir.

**Karar 12 (onaylandı, Önemli): manuel ipucusunun yeni cümlesi hedefini adıyla söyler ve stoksuz modelde çizilmez (R12/2).** Gerekçe ölçüm 16: manuel kipte `Select` hiç çizilmiyor, yani "yukarıdaki seçenek" var olmayan bir şeyi gösteriyor; "Stoktan seçime dön" düğmesi ise ayrıca o modelden stok olmasını istiyor. Reddedilenin bedeli olurdu: metin bu işin iki çıktısından biri ve yanlış hedefe yönlendiren bir ipucu, 0103'ün onarmak zorunda kaldığı yanlış yolu yeniden davet eder.

**Karar 13 (onaylandı, Önemli): girilen numara stokta duruyorsa engellemeyen ipucu çizilir (R18).** Gerekçe ölçüm 14: kullanıcı o modelin serili bir stok satırının numarasını yazarsa aynı fiziksel makina bir yanda "satışa hazır" bir yanda "satıldı" sayılır ve veri bu çelişkiyi hiçbir yerde göstermez. Reddedilenin bedeli olurdu: spec'in önlemek için yazıldığı çift kayıt sessizce üretilir. X2'nin uyarı reddi manuel giriş içindir ve orada seçenek meşrudur; burada doğru eylem bir tık uzakta.

**Karar 14 (onaylandı, Önemli): serisiz seçim boşa çıkınca kullanıcı bunu görür (R17).** Model değişiminde `_stokSerisiz` ve `serialNo` sıfırlanır; serisiz dalda satır bulunamazsa bildirim çıkar ve C1 yalnız o bildirim için gevşetilir (kaydın şekli değişmez). Gerekçe ölçüm 15: iki yolda da bugün kayıt `seriNoBekliyor` ile doğup iş listesinde görünüyor, numara girilince o işaret hiç doğmaz ve kayıt görünmez biçimde bozuk kalır. Reddedilenin bedeli olurdu: 0104'ün bütün değeri kaydın doğru doğmasıdır ve doğmadığında tek görünür işaret kalkar. Kit ile çapın model değişiminde eski satırdan kalması ayrı ve daha eski bir boşluktur, README'nin açık bulgularına yazılır (X10).

**Karar 15 (onaylandı, Önemli): AC-20 ve AC-21 içerik taramasına çevrilir.** Gerekçe ölçüm 17: "dosya değişmedi" testle ölçülemez ve deponun deseni içerik taramasıdır; canlı emsal `tests/parti-duzeltme-0103.test.js:54-69`. Commit'in değişen dosya listesi SCORECARD'a yazılır. Reddedilenin bedeli olurdu: kriter boş geçer ya da kırılgan bir hash testine döner.

**Karar 16 (onaylandı, Önemli): DoD kriter kriter eşleme verir ve AC-16 uçtan uca ölçülür (AC-27).** Gerekçe ölçüm 18: spec'in sonucu "kayıt doğru doğar" ve onu ölçen tek yer uçtan uca testtir; düzenek aynı dosyada iki yolla kurulu. Reddedilenin bedeli olurdu: iş "alan çizildi" düzeyinde kanıtlanmış olur.

**Karar 17 (onaylandı, Küçük): form dosyasındaki dokuz satır atfı güncellenir.** Gerekçe ölçüm 21: 0103 uygulandı ve dosya üç satır kaydı; `Customers.jsx` atıfları doğru kaldı çünkü o dosyaya dokunulmadı.

**Karar 18 (onaylandı, Küçük): test atıfları güncellenir ve dördüncü dosya anılır.** Gerekçe: `stok-durumu-0100-satis.test.jsx` 0103 ile 180 satır büyüdü; `parti-duzeltme-0103.test.js` aynı form dosyasını tarıyor (C8).

**Karar 19 (onaylandı, Küçük): manuel ipucusunun pinli ön eki kısıt olarak yazılır (C7).** Gerekçe ölçüm 19: `form-kaynak.test.js:49` ön eki ve kuşatan `<Ipucu>` öğesini tutuyor; yeni cümle ön eki koruduğu için kırılmıyor ama kısıt yazılı olmalı.

**Karar 20 (onaylandı, Küçük): kanıt ekranı sayısı altıya düzeltilir.** Gerekçe ölçüm 9: metin "dört" diyip beş ad sayıyordu, bugün formu çizen ekran altı ve altısının hepsi `stock={[]}`. Not: 0103'ün Görsel kanıtı da dört saymış ve `musteri-formu-hata`'yı atlamıştı; o spec kapandığı için orada bir şey yapılmaz, 0104'ün iş raporunda altı ekranın 0 piksel verdiği gösterilir.

**Karar 21 (onaylandı, Küçük): 0103 ile eşzamanlılık notu kalkar.** Gerekçe ölçüm 21: 0103 uygulandı ve `specs/done` altına taşındı. 0104'ün tabanı 0103 sonrası kodla çekilir ve `musteri-formu-0103-parti` ekranı da 0 piksel verir.

**Karar 22 (onaylandı, Küçük): AC-7 yeni kod istemiyor, kriter bunu yazar.** Gerekçe: üç geçişin üçü de bugün `serialNo`'yu temizliyor ve `_stokSerisiz`'i kapatıyor (`:205`, `:214`, `:218`). Test davranışı sabitler, DoD yeni iş saymaz.

**Karar 23 (onaylandı, Küçük): C4 altın dosya yerine tam nesne karşılaştırmasıyla ölçülür.** Kaydedilen nesne küçük ve tam sayılabilir olduğu için testte `toEqual` ile anahtar kümesi ve değerler karşılaştırılır. Altın dosya istenirse adı `tests/fixtures/0104-govde-once.json` ve bayrağı `YAZ_0104=1` olur (0092 deseni). Gerekçe: fikstürün adı, üretim yolu ve içeriği yazılı değildi, yani kriter uygulanamazdı.

**Karar 24 (onaylandı, Küçük): mükerrer kayıt uyarısının bu yolda çalışmaya başlaması kriter olur (AC-29).** Gerekçe ölçüm 22: bugün serisiz satışın numarası hep boş olduğu için "seri no aynı" denetimi o yolda hiç çalışmıyordu; numara girilebilir olunca çalışacak ve bu bir kazançtır, yazılı olmalı.

**Karar 25 (onaylandı, Küçük): yalnız boşluk içeren numara bugünkü gibi dolu sayılır (X9).** Gerekçe ölçüm 23: kırpma kayıt yolunu değiştirir (C1) ve bu davranış bugünkü manuel girişin aynısıdır. Reddedilenin bedeli: `" "` yazan kullanıcının kaydı ne numaralı ne bekleyen olur; sınır yazılı olduğu için görülebilir.

**Karar 26 (onaylandı, Küçük): 0103'ün beş kriteri "aynen yeşil kalacaklar" listesine girer (C8).** Gerekçe ölçüm 24: 0104 aynı form dosyasını değiştiriyor ve 0103'ün taramaları o dosyanın ifadelerini birebir sabitliyor.

### Plan turu kararları (2026-10-23)

**Karar 27 (onaylandı): R16'nın düz girişi `_manualSerial` işaretler.** `sourceStockId` taşıyan seri bekleyen kaydın düz
girişine o modelin serili bir stok satırının numarası yazılırsa düzenleme kolunun serili dalı o satırı bulup ikinci kez
düşer ve `sourceStockId`'nin üzerine yazardı (R16/2'yi bozar). Bu kipte giriş yazılınca formda `_manualSerial: true`
işaretlenir; kayıt yolu işareti zaten okuyor ve düşmez (C1 bozulmaz). Aynı kipte manuel ipucusu ve "Stoktan seçime dön"
düğmesi çizilmez (o kayıt için stoktan seçim yolu yok). Yan kazanç: `stok-seri` kilidi alınmaz, 0103'ün parti seçicisi
gizlenmez.

**Karar 28 (onaylandı): R17/a'nın sıfırlaması daraltılır.** Model seçici düzenleme formunda da çiziliyor; koşulsuz sıfırlama
var olan kaydın modeli düzeltilirken seri numarasını silerdi. Sıfırlama yalnız serisiz seçim açıkken (`_stokSerisiz`) ve
model gerçekten değiştiğinde yapılır; kit ve çap dokunulmaz (X10).

**Karar 29 (onaylandı): R18'in eşleşmesi kırpılmış ve Türkçe küçültülmüş** (`trLower`) karşılaştırmadır, mükerrer kayıt
denetiminin kuralıyla aynı (ölçüm 22); ipucu engellemediği için gevşek eşleşme güvenli, kayıt yolu kırpmaz (X9).

**Karar 30 (onaylandı): alanların sırası** seçici → seri numarası girişi → Karar 1 metni → (gerekirse) R18 ipucusu.

**Karar 31 (onaylandı): görüntü aracına `secenek:<metnin başı>` adımı** eklenir (o metinle başlayan seçeneği taşıyan
listeyi seçer); stok seçicisine spec dışı bir erişilebilir ad eklenmez.

**Karar 32 (onaylandı): AC-6** Karar 23'ün tam nesne karşılaştırmasıyla ölçülür; test önce eski kodla yazılıp yeşil görülür,
yeni kodla değiştirilmeden yeniden koşulur (altın dosya gerekmez). Ekleme kolunun damgalarını görmek için güncelleyici
ertelenir (spec 0103'ün dersi).

**Karar 33 (onaylandı): yeni ekran testleri ayrı dosyada:** `tests/ui/serisiz-seri-0104.test.jsx` (düzenek
`stok-durumu-0100-satis`'ten kopyalanır, o dosyaya dokunulmaz); taramalar `tests/serisiz-seri-0104.test.js`.

**Karar 34 (onaylandı): R17/b'nin bildirimi** spec'teki metinle ve hata değil uyarı tonunda verilir (kayıt yapılıyor).

**Karar 35 (onaylandı): DoD 9'un iki README maddesi** kapanış commit'ine girer (0101–0103'te README satırı da oradaydı).

### Uygulama turu kararı (2026-10-23)

**Karar 36 (onaylandı, Takım Yöneticisi 2026-10-23): ekleme kolunun stok düşümü kayıt yazılmadan önceye alınır (C1'in ikinci
istisnası).** Uçtan uca test (AC-27) ölçtü: gerçek App'te stoktan yeni müşteri eklenince stok satırı düşülüyor ama kayda
`sourceStockId`, `partiId` ve `uretimTarihi` **girmiyor**; spec öncesi kodda (`d9033b6`) serili seçimde de aynı. Neden:
`Customers.jsx`'in ekleme kolu `setCustomers(p => [...{ ...clean, id }])` ile kaydın **kopyasını** veriyor ve
`deductMachineStock` (damgalar `clean`'e yazılır) ondan **sonra** çağrılıyordu; React güncelleyiciyi hemen hesapladığı için
kopya damgasız alınıyordu. Düzenleme kolu kaydı kopyalamadan (`clean` referansıyla) yazdığı için orada sorun yoktu. Test
düzenekleri güncelleyiciyi anında çalıştırdığı için hata yalnız gerçek App'te görünüyordu (0101 ve 0103'te "düzenek yapaylığı"
sanılan durum buydu). Düzeltme tek satırın yeri: `deductMachineStock` `setCustomers`'tan önce çağrılır; yazılan ve silinen
anahtarlar, satır seçimi ve damgalama kuralı aynı. Ölçüm: gerçek App'te serili (Karar 36 testi) ve serisiz (AC-27) ekleme;
satır eski yerine dönünce ikisi de kırılır. **Bilinen sınır:** bu sürümden önce stoktan eklenmiş satışların damgaları eksik
olabilir; partisi 0103'ün düzenleme seçicisiyle düzeltilir, `sourceStockId` ve `uretimTarihi` için düzeltme yolu yok (açık
bulgu).

**Karar 37 (onaylandı, triyaj 2026-10-23): eski kayıtlarda çift düşüm uyarısı.** Karar 36'dan önce stoktan serisiz eklenen
satışlar stoğu düşmüş ama `sourceStockId` almamış ve `seriNoBekliyor: true` kalmıştı; R16'nın kapısı onlarda açılmıyor ve
"Seri no'suz stoktan düş" seçilirse ikinci bir satır düşülür. Veri bu kaydı "manuel girişle boş seriyle doğmuş" kayıttan
ayırt etmediği için kesin engel yazılamaz: seri bekleyen düzenlemenin stok seçicisinin üstünde engellemeyen uyarı
(`SERI_BEKLEYEN_CIFT_DUSUM_IPUCU`) çizilir ve sürüm notu numaranın "Manuel gir" ile yazılmasını söyler. Kullanıcının
yedeğinde etkilenen kayıtların sayımı (`seriNoBekliyor && !serialNo && !sourceStockId`) bu turda yapılmadı (yedek çalışma
kopyasında yok); açık bulgu. Aynı turda R18'in ipucusu sözlüğün `Ipucu`'suna çevrildi (kırmızı satır içi kopya kalktı).

---

## Acceptance Criteria

### Serisiz düşümde seri numarası

- **AC-1.** Serisiz stok seçeneği seçildiğinde seri numarası girişi çizilir ve boş gelir; alan `aria-label="Seri numarası"` ile bulunur (R1/2, ölçüm 13).
- **AC-2.** Alan seçicinin hemen altındadır ve güncellenmiş metinle birlikte görünür.
- **AC-3.** Numara girilip kaydedilince satış kaydının `serialNo` alanı o numaradır.
- **AC-4.** Numara girilip kaydedilince kayıt `seriNoBekliyor` taşımaz ve "Seri No Bekleyen" süzgecinde görünmez.
- **AC-5.** Numara boş bırakılıp kaydedilince kayıt bugünkü gibi `seriNoBekliyor` ile doğar.
- **AC-6.** Boş numarayla kaydedilen satış, spec öncesi kodun ürettiği kayıtla birebir aynıdır (C4, kıyas fikstürü).
- **AC-7.** Serisiz seçenekten boş seçeneğe, serili bir satıra ya da manuel girişe geçilince girilen numara temizlenir ve kullanıcı yanlış kipte eski numarayla kalmaz. Bu bugünkü davranıştır (`:205`, `:214`, `:218` üçü de `serialNo`'yu yazar ve `_stokSerisiz`'i kapatır); kriter onu sabitler, yeni kod istemez (Karar 22).
- **AC-8.** Seçici serisiz seçenekte kalır: numara dolsa da seçenek işareti değişmez (C5).

### Kayıt yolu

- **AC-9.** Numara girilmiş serisiz satışta stoktan düşülen satır, motorun seçtiği satırdır: önce satışa hazır olanların en eskisi, sonra montajdakilerin en eskisi (spec 0100 R6/3).
- **AC-10.** Girilen numara düşülecek satırın seçimini etkilemez: stokta o numarayla bir satır dursa bile motorun seçimi değişmez. O durumda kullanıcı AC-24'ün ipucusunu görür, kayıt engellenmez (R18, ölçüm 14).
- **AC-11.** Numara girilmiş serisiz satışta `sourceStockId`, `uretimTarihi` ve `partiId` düşülen satırdan damgalanır.
- **AC-12.** Düşülen stok satırına seri numarası yazılmaz; satır diziden çıkarılır.
- **AC-13.** Kit ön doldurması ve kalıp çapı ön doldurması seçenek seçildiği anda motorun seçtiği satırdan gelir; seri numarası girişi ikisini de değiştirmez.
- **AC-14.** Serisiz seçim varken üretim partisi seçicisi çizilmez ve formda seçilmiş parti kayda girmez (spec 0100 AC-54 aynen).
- **AC-15.** Satır yarışında (başka bilgisayar aynı makinayı az önce sattı) bugünkü kural sürer: parti ve kaynak yazılmaz, girilen seri numarası kayda yazılır ve kayıt seri numarası bekleyen olmaz. Kullanıcı bunu bir bildirimle görür (AC-25, R17/b); bugün onu görünür kılan `seriNoBekliyor` işareti numara girildiğinde doğmuyor (ölçüm 15).
- **AC-16.** Numara girilmiş serisiz satış sonrası makina Parti Üretim Panosu'nun Satıldı sütununda o partinin satırında sayılır.

### Değişmeyenler

- **AC-17.** Serili seçenek, metni ve seri numarası kilidi değişmez.
- **AC-18.** Manuel giriş seçeneği çalışmaya devam eder: stok düşülmez, `sourceStockId` yazılmaz ve numara kayda girer; ipucusu Karar 5'teki cümledir, son cümlesi "Stoktan seçime dön" düğmesini gösterir ve yalnız o modelden stok varken çizilir (R12/2, ölçüm 16). "Manuel girilen seri no stoktan düşülmez" ön eki aynen kalır ve metin `<Ipucu>` içindedir (C7).
- **AC-19.** Manuel girişte üretim partisi seçicisi bugünkü gibi çizilir (spec 0103 ile düzenlemede de).
- **AC-20.** Düşüm kuralı değişmez; ölçümü içerik taramasıdır (ölçüm 17): `deductMachineStock`'un serisiz dalı `delete clean.partiId`, `serisizDusulecek(stock, clean.model)` ve kimlikle filtre satırlarını aynen taşır, serili dalın koşulu aynı kalır, `src/lib/satisKaydi.js` ile `src/lib/stokDurumu.js` bu işin adlarını anmaz. Fonksiyona eklenen tek şey R17/b'nin bildirimidir (C1 istisnası).
- **AC-21.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı, yeni kilit alanı ve yeni birleştirme kuralı eklenmez. Ölçümü spec 0103'ün dört taramasının tekrarıdır: `ALAN_IZINLERI`'nde `customers` yok, `KILIT_ALANLARI` listesi aynı, `MERGE_KEYS`'in müşteri satırı aynı, `db.cjs`'de yeni sütun sabiti yok.
- **AC-22.** Seri numarası bekleyen kaydın düzenlemesinde yeni alan aynı kurallarla çalışır; stok seçicisinin kapısı AC-23'teki gibidir.

### QA turu kriterleri (2026-10-23)

- **AC-23.** `sourceStockId` taşıyan seri numarası bekleyen kaydın düzenlemesinde stok seçicisi **çizilmez**, yerine düz seri numarası girişi çizilir; kaydedilince ikinci bir stok satırı düşülmez, `sourceStockId` ve `partiId` değişmez (R16, R16/2, ölçüm 11).
- **AC-24.** Serisiz dalda girilen numara o modelin canlı bir stok satırında duruyorsa engellemeyen ipucu çizilir; numara dolu olsa da seçici serisiz seçenekte kalır, motorun seçimi ve kayıt değişmez (R18, ölçüm 14).
- **AC-25.** Serisiz dalda düşülecek satır bulunamazsa kullanıcı bildirim görür ve kaydın gövdesi bugünküyle aynı kalır (R17/b, ölçüm 15).
- **AC-26.** Model değiştirilince `_stokSerisiz` işareti ve girilen seri numarası sıfırlanır; stoğu olmayan bir modele geçilince kayıt serisiz işareti taşımaz (R17/a, ölçüm 15).
- **AC-27.** Uçtan uca (gerçek App): serisiz seçenekle seri numarası girilerek yapılan satıştan sonra Stok › Parti Üretim Panosu'nda o partinin satılan adedi bir artar (ölçüm 18'deki düzenek).
- **AC-28.** `musteri-formu-0104-stok` ekranının kanıt kaydı `docs/evidence/0104-kapanis-piksel-raporu.json`'u gösterir, `beklenen: "ayni"` taşır ve o raporda iki temada da `piksel: 0` verir (Karar 9, ölçüm 12).
- **AC-29.** Serisiz satışta girilen numara başka bir canlı müşteri kaydında varsa mükerrer kayıt uyarısı çıkar ve kayıt "Yine de Kaydet" ile geçer (ölçüm 22).
- **AC-30.** Spec 0103'ün beş kriteri dokunulmadan yeşil kalır: `stokSecicisiKipi` ve `partiSecicisi` ifadeleri, `useLock(` çağrı sayısı iki, `stok-seri` kilidinin kipi, ipucunun `PANO_SEKME_ADI`'ndan gelmesi, üretim tarihi bloğunun koşulu ve yeri (C8, ölçüm 24).

---

## Görsel kanıt

Ölçüm 9: stok seçicisi bugün hiçbir kanıt ekranında çizilmiyor, çünkü müşteri formunu çeken **altı** ekranın hepsi boş stokla kuruluyor. Bu yüzden:

- Mevcut altı müşteri formu ekranı (`musteri-formu`, `musteri-formu-hata`, `musteri-formu-ilk-odeme`, `musteri-formu-0079`, `musteri-formu-0094-ilce` ve 0103'ün eklediği `musteri-formu-0103-parti`) **0 piksel** fark vermelidir. Fark çıkarsa yeni alanın kapısı yanlış kurulmuş demektir (altısında da stok yok, yani serisiz dal hiç çizilmiyor).
- Yeni ekran **`musteri-formu-0104-stok`** eklenir (Karar 7): model seçili, stokta o modelden en az iki serisiz ve bir serili satır, serisiz seçenek seçili, seri numarası alanı ve güncellenmiş metin görünür.

**Üç rapor ve kaydın yeri (Karar 9, ölçüm 12).** Eşlemede yalnız iki durum var (`ayni`, `degisti`) ve `ayni` kayıt kendi raporunda `piksel === 0` ister; yeni bir ekranın ilk raporundaki satırı ise `fark: "önce görüntüsü yok"` taşır ve `piksel` anahtarı hiç yoktur. Bu yüzden:

1. `docs/evidence/0104-taban-piksel-raporu.json`: uygulama öncesi kodla (spec 0103 **sonrası** taban, ölçüm 21) çekilir, yeni ekranı içermez.
2. `docs/evidence/0104-piksel-raporu.json`: iş raporu; mevcut altı ekran 0 piksel, yeni ekran "önce görüntüsü yok".
3. `docs/evidence/0104-kapanis-piksel-raporu.json`: spec `done`'a taşınırken bugünkü kodla çekilir; eşleme kaydı (`CustomerAddEditForm.jsx` altında, `ekran: "musteri-formu-0104-stok"`, `beklenen: "ayni"`) **bu** raporu gösterir ve iki temada da `piksel: 0` verir (AC-28).

Emsal ölçüldü (ölçüm 20): `musteri-formu-0103-parti` kaydı `0103-kapanis-piksel-raporu.json`'u gösteriyor ve o raporun iki satırı da `piksel: 0`.

---

## Ters çevrilen kriterler

Yok (ölçüm 8). Serisiz dalın uyarı cümlesi değişiyor ama o cümleyi okuyan test ve kriter bulunmuyor; spec 0100'ün R6/2 kriteri seçeneğin **metnini** sabitler ve o metin değişmez.

Aynen yeşil kalması beklenen kriterler: spec 0100 **R6/3** ve motor testleri (satır seçimi), **AC-54** (serisiz seçimde parti seçicisi çizilmez ve değer kayda girmez), triyaj testi `bulgu 3` (satır yarışı), spec 0101 **AC-20** (çap ön doldurması motorun seçtiği satırdan) ve spec 0103'ün beş kriteri (C8, AC-30, ölçüm 24): `stokSecicisiKipi` ile `partiSecicisi` ifadeleri, `useLock(` çağrı sayısının iki olması, `stok-seri` kilidinin kipi, ipucunun `PANO_SEKME_ADI`'ndan gelmesi, üretim tarihi bloğunun koşulu ve yeri.

**Dikkat, ters çevirme değil ama daralma:** seri numarası bekleyen kaydın düzenlemesinde stok seçicisinin kapısı daralır (R16). Hiçbir spec'in kriteri o kipte seçicinin `sourceStockId` taşıyan kayıtta da çizildiğini sabitlemiyor; üç test dosyasındaki `BEKLEYEN` fikstürlerinin hiçbirinde `sourceStockId` yok (ölçüm 11), yani kapı mevcut hiçbir kriteri ters çevirmez.

---

## Definition of Done

1. Serisiz dalda `aria-label="Seri numarası"` taşıyan seri numarası girişi çizilir ve iki ekran metni güncellenir (R1, R1/2, R4, R5, R12/2, Karar 1, Karar 5, Karar 12). Manuel ipucusunun pinli ön eki korunur (C7).
2. Seri numarası bekleyen düzenlemede stok seçicisinin kapısı daraltılır (R16, R16/2): kaydın `sourceStockId`'si varsa düz seri numarası girişi çizilir. Serisiz seçim boşa çıktığında kullanıcı görür: model değişiminde işaretler sıfırlanır ve satır bulunamazsa bildirim çıkar (R17). Stokta duran numara için engellemeyen ipucu eklenir (R18). Serisiz seçenekten çıkışta numaranın temizlenmesi bugünkü davranıştır, yalnız test sabitler (AC-7, Karar 22).
3. Ölçüm yerleri kriter kriter yazılı: `tests/ui/stok-durumu-0100-satis.test.jsx`'in yeni bloğu (ya da yeni bir test dosyası) AC-1…AC-15 ile AC-17, AC-18, AC-22, AC-23, AC-24, AC-25, AC-26 ve AC-29'u ölçer; `tests/ui/stok-durumu-0100-app.test.jsx` AC-16'yı ve AC-27'yi ölçer; AC-19, AC-20, AC-21 ve AC-30 kaynak taramalarıdır; AC-28 kanıt turunda ölçülür. Serisiz düşümü ölçen üç mevcut dosya ve `tests/parti-duzeltme-0103.test.js` dokunulmadan yeşil kalır (ölçüm 8, ölçüm 24).
4. C4 testte tam nesne karşılaştırmasıyla sabitlenir (Karar 23): boş numarayla kaydedilen satışın gövdesi `toEqual` ile anahtar anahtar ölçülür; altın dosya istenirse `tests/fixtures/0104-govde-once.json` ve `YAZ_0104=1`.
5. AC-20 ve AC-21'in içerik taramaları yazılır (Karar 15) ve commit'in değişen dosya listesi (`git diff --name-only`) SCORECARD'ın "ölçülen sapmalar" hücresine konur.
6. Görüntü aracına `musteri-formu-0104-stok` ekranı ve stoklu fikstürü eklenir; **üç rapor** çekilir (taban, iş, kapanış) ve mevcut altı müşteri formu ekranının 0 piksel verdiği iş raporunda gösterilir (Karar 20, Karar 21).
7. `docs/evidence/kanit-eslemesi.json` yeni ekranın kaydını **kapanış raporunu göstererek** ve `beklenen: "ayni"` ile alır (Karar 9, AC-28).
8. `npm test` ve `npm run lint` tam yeşil.
9. Spec `specs/done/` altına taşınır, SCORECARD doldurulur, `specs/README.md` tablosu ve sıra paragrafı güncellenir; README'nin açık bulgular bölümündeki kök neden maddesi bu spec'e bağlanır ve model değişiminde kit ile çapın eski satırdan kalması yeni bir açık bulgu olarak yazılır (X10).
10. Sürüm notu: yeni alan ve karışık sürüm riski yok. Kullanıcıya duyurulacak tek şey davranış değişikliğidir: stoktan serisiz satışta seri numarası artık satış anında girilebilir ve o satış partiye kendiliğinden bağlanır.

---

## Karar kaydı (QA turu 2026-10-23)

| Kod | Derece | Boşluk | Karar | İşlendiği yer |
|---|---|---|---|---|
| **B-1** | Bloklayıcı | Yeni kanıt ekranının eşleme kaydının durumu temsil edilemiyor | Kayıt `0104-kapanis-piksel-raporu.json`'u gösterir, `beklenen: "ayni"`, üç rapor çekilir | Karar 9, ölçüm 12, ölçüm 20, AC-28, Görsel kanıt, DoD 6, DoD 7 |
| **B-2** | Bloklayıcı | Seri bekleyen düzenlemede serisiz seçenek ikinci kez stok düşüyor, yeni metin oraya yönlendiriyor | Seçici yalnız `sourceStockId` yokken çizilir, varsa düz seri girişi | Karar 10, ölçüm 11, R16, R16/2, AC-22, AC-23, DoD 2 |
| **Ö-1** | Önemli | Yeni alanın erişilebilir adı tanımsız | `aria-label="Seri numarası"` | Karar 11, ölçüm 13, R1/2, AC-1, DoD 1 |
| **Ö-2** | Önemli | Girilen numara stokta duran satırla eşleşirse sonucu yazılı değil | Engellemeyen ipucu, motorun seçimi değişmez | Karar 13, ölçüm 14, R18, AC-10, AC-24 |
| **Ö-3** | Önemli | Serisiz seçim boşa çıkınca kayıt sessiz bozuk doğuyor | Model değişiminde sıfırlama ve satır bulunamazsa bildirim | Karar 14, ölçüm 15, R17, C1, X10, AC-15, AC-25, AC-26 |
| **Ö-4** | Önemli | Karar 5'in cümlesi görünmeyen seçeneği gösteriyor, stoksuz modelde de çiziliyor | Hedef adıyla ("Stoktan seçime dön") ve stok koşuluna bağlı | Karar 12, ölçüm 16, R12, R12/2, AC-18, Karar 5 |
| **Ö-5** | Önemli | AC-20 ve AC-21 bir testle ölçülemiyor | İçerik taramaları ve commit dosya listesi | Karar 15, ölçüm 17, AC-20, AC-21, DoD 5 |
| **Ö-6** | Önemli | Kriterlerin ölçüm yeri yazılı değil, AC-16'nın uçtan uca testi yok | DoD'da kriter kriter eşleme, üçüncü uçtan uca test | Karar 16, ölçüm 18, AC-27, DoD 3 |
| **K-1** | Küçük | Form dosyasındaki dokuz satır atfı üç satır kaymış | Atıflar güncellenir (0103 uygulandı) | Karar 17, ölçüm 1, 2, 5, 9, 10, 21, başlık |
| **K-2** | Küçük | Test atıfları bayat | Atıflar güncellenir, dördüncü dosya anılır | Karar 18, ölçüm 8, C8 |
| **K-3** | Küçük | Manuel ipucusunun ön eki `form-kaynak` ile pinli | Kısıt olarak yazılır | Karar 19, ölçüm 19, C7, AC-18 |
| **K-4** | Küçük | Görsel kanıttaki ekran sayısı yanlış ve liste eksik | Sayı altı olur, liste altısını sayar | Karar 20, ölçüm 9, Görsel kanıt |
| **K-5** | Küçük | 0103 ile eşzamanlılık notu geçersiz | Not kalkar, taban 0103 sonrası koddur | Karar 21, ölçüm 21, Görsel kanıt, başlık |
| **K-6** | Küçük | AC-7 yeni kod istemiyor | Kriter bugünkü davranışı sabitler | Karar 22, AC-7, DoD 2 |
| **K-7** | Küçük | C4'ün kıyas ölçümü tanımsız | Tam nesne karşılaştırması, altın dosya adı ve bayrağı yazılı | Karar 23, C4, DoD 4 |
| **K-8** | Küçük | Mükerrer kayıt uyarısı bu yolda ilk kez çalışacak | Kazanç kriter olur | Karar 24, ölçüm 22, AC-29 |
| **K-9** | Küçük | Yalnız boşluk içeren numara dolu sayılıyor | Bugünkü davranış yazılı sınır olur | Karar 25, ölçüm 23, X9 |
| **K-10** | Küçük | "Aynen yeşil kalacaklar" listesi 0103'ü saymıyor | 0103'ün beş kriteri eklenir | Karar 26, ölçüm 24, C8, AC-30, Ters çevrilen kriterler |

Toplam **18 bulgu: 2 Bloklayıcı, 6 Önemli, 10 Küçük**; tamamı Takım Yöneticisi tarafından 2026-10-23'te kabul edildi ve bu spec'e işlendi.

---

## SCORECARD

| | |
|---|---|
| **Uygulama commit** | |
| **Dal** | |
| **Kapsam dışı kalanlar** | |
| **Ölçülen sapmalar** | |
| **Görsel kanıt** | |
