# 0103 — Satılmış makinanın üretim partisi sonradan düzeltilebilir

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 4; uygulama commit `be86973`, dal `feat/0103-parti-duzeltme`, 2026-10-23) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteri ekleme ve düzenleme formu (`src/components/customers/CustomerAddEditForm.jsx`: `partiSecicisi` koşulu ve parti seçicisinin ipucu metni; `isStockSerialPick`'in kip koşuluna dokunulmaz); `scripts/evidence/0009-sayfa.jsx` (yeni kanıt ekranı ve fikstürü); `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0103-taban-piksel-raporu.json`, `docs/evidence/0103-piksel-raporu.json`, `docs/evidence/0103-kapanis-piksel-raporu.json`; `tests/ui/stok-durumu-0100-satis.test.jsx` (düzenleme kipinde seçicinin çizilmediğini sabitleyen testin yeniden yazılması) ve `tests/ui/stok-durumu-0100-app.test.jsx` (AC-41'in düzenleme ikizi) |
| **Bağımlı spec'ler** | 0100 (parti seçicisinin kendisi, panonun Satıldı sütunu ve sayımı), 0022 (üretim partisi ve makina bağı), 0090 (parti genel gider payları ve kapanış görüntüsü), 0097 (Parti Hesabı'nın partili makina kümesi), 0002 (üretim tarihi alanı, seçicinin komşusu ve emsali) |
| **Ters çevrilen kriterler** | spec 0100 **X8** (satılmış makinanın partisinin sonradan düzeltilmesi bilinçli kapsam dışıydı), spec 0100 **R7/2a**'nın kip yarısı ve **R7/3**, ve bunları sabitleyen tek test (`tests/ui/stok-durumu-0100-satis.test.jsx:131`). Ayrıntı "Ters çevrilen kriterler" tablosunda. Görsel kanıtta bir yeni ekran eklenir, mevcut ekranlar değişmez, ayrıntı "Görsel kanıt" bölümünde |

---

## Intent

Parti Üretim Panosu'nun Satıldı sütunu, satış anında partiye bağlanmamış makinaları hiç saymıyor ve bu kayıtlar arayüzden düzeltilemiyor. Üretim partisi seçicisi yalnız yeni müşteri eklerken ve seri numarası bekleyen kaydı düzenlerken çiziliyor; seri numarası dolu bir satışın partisi kaydedildikten sonra değiştirilemiyor.

Sonuç ölçüldü (ölçüm 7, ölçüm 8): kullanıcının 22 Ekim 2026 yedeğinde panonun bir satırı 1 satılmış makina gösteriyor, doğrusu 2. Eksik kayıt partisiz ve düzeltme yolu kapalı, yani pano kalıcı olarak yanlış sayıyor.

Kök neden ölçüldü ve bu spec'in kapsamı dışındadır (X9): stoğa makinalar seri numarası olmadan giriliyor (ölçüm 13) ve satış formu, seri numarasını satış anında yazmak isteyen kullanıcıya stok bağını koparan tek yolu bırakıyor (ölçüm 14). Partisiz kalan satışlar bu yoldan doğdu; parti seçicisi de o satışlar yapılırken uygulamada henüz yoktu (ölçüm 15). Bu spec doğan kaydı düzeltilebilir kılar, kaydın doğuş yolunu değiştirmez.

Bu spec tek bir kapıyı açar: parti seçicisi müşteri düzenleme formunda da çizilir. Veri modeli, panonun motoru, sayım kuralı, izinler ve sunucu kuralları değişmez; yalnız var olan alanın düzeltilebilmesi sağlanır.

---

## Requirements

### Parti seçicisinin çizilmesi

- **R1.** Üretim partisi seçicisi müşteri **düzenleme** formunda da çizilir. Bugün çizildiği iki kip (ekleme, seri numarası bekleyen kaydın düzenlemesi) aynen korunur; eklenen şey tek bir kip değil **düzenleme kipinin tamamıdır**.
- **R1/2.** Koşul tek bir ifadeye indirgenir ve "dolu seri" kapısı yazılmaz: `stokSecicisiKipi = modal === "add" || seriBekleyenDuzenleme`, `partiSecicisi = giderYetki && !(stokSecicisiKipi && stoktanSecildi)`. Üç kipli yazım bir hâli dışarıda bırakıyordu: seri numarası boş ama `seriNoBekliyor` işareti olmayan kayıt (ölçüm 17) ne ikinci ne üçüncü kipe girer, yani düzeltme yolu onda yine kapalı kalırdı. İfadenin `modal` null olduğu hâli yok, çünkü form yalnız `"add"` ya da `{edit}` ile çizilir.
- **R2.** Yetki kuralı değişmez: seçici yalnız **gider yetkisi** olan kullanıcıya çizilir (spec 0100 R7/2a'nın yetki yarısı, C3).
- **R3.** Stok seçicisinin çizildiği iki kipte bugünkü kural birebir korunur: stoktan bir satır seçildiği anda (serili ya da serisiz) seçici çizilmez ve daha önce seçilmiş değer kayda girmez (spec 0100 R7/2b).
- **R4.** `stoktanSecildi` ölçütü **yalnız stok seçicisinin çizildiği iki kipte** uygulanır, başka hiçbir düzenlemede uygulanmaz. O kiplerin dışında stok seçicisi hiç çizilmediği için ölçüt bir seçimi değil bir rastlantıyı ölçer: stokta aynı model ve aynı seri numarasıyla duran bir satır varsa seçiciyi sessizce gizler (ölçüm 6).
- **R5.** Stoktan düşülmüş kayıtta (`sourceStockId` dolu) da seçici çizilir; stoktan gelen ve elle girilen satış arasında ayrım yapılmaz (Karar 2).
- **R6.** Boş seçim ("Partisiz") alanı kayıttan siler; bu bugünkü davranıştır ve değişmez.
- **R7.** Çöpteki ya da kaydı bulunamayan partiye bağlı satışta bugünkü "Silinmiş parti" seçeneği değeri korumaya devam eder.
- **R8.** Seçicinin ipucu metni düzenleme kipini de kapsayacak biçimde güncellenir ve seçilmemesinin **panoya** etkisini söyler: satış partisiz kalır ve Parti Üretim Panosu'nun satılan adedinde görünmez (Karar 8). Bugünkü metin "seçilmezse satış partisiz kalır" cümlesini zaten taşıyor (ölçüm 30), eksik olan yalnız panoya yapılan atıf ve düzenleme kipi.
- **R8/2.** Cümle satır içinde kalır (Karar 8) ama panonun adı düz yazılmaz: `stokDurumu.js`'in `PANO_SEKME_ADI` sabitinden şablonla gelir (ölçüm 27). Form dosyası o modülden zaten içe aktarma yapıyor, yeni sabit açılmaz ve `stokDurumu.js` değişmez (C4 bozulmaz).

### Kayıt yolu

- **R9.** Kayıt yolu değişmez. Düzenleme kolu stok düşümünü yalnız seri numarası bekleyen kayıtta çağırır; normal düzenlemede `partiId` form değerinden aynen yazılır (ölçüm 4). `satisKaydi.partiDamgala`'ya dokunulmaz.
- **R10.** Parti seçilmemiş kayda `partiId` anahtarı yazılmaz; `null` da yazılmaz (bugünkü davranış, sunucu karşılaştırmasının null ile yokluk ayrımı, C5).
- **R11.** Form açılışında kaydın mevcut partisi seçicide dolu gelir; bu bugünkü form kurulumundan kendiliğinden gelir (ölçüm 3), ayrı bir dolum kodu yazılmaz.

### Değişmeyenler

- **R12.** Panonun motoru, beş sayısı, kırpma kuralı ve model satırları değişmez (`src/lib/stokDurumu.js`). Düzeltilen kayıt bir sonraki çizimde kendiliğinden doğru sayılır.
- **R13.** Parti genel gider payları, Parti Hesabı ve makina maliyeti motorları değişmez. Partisi düzeltilen makina bu hesaplara bugünkü kurallarla girer: açık partide pay yeniden bölünür, kapanmış partinin kaydedilmiş kapanış görüntüsü değişmez (X6).
- **R14.** Üretim tarihi alanı değişmez: bugün de gider yetkisiyle her kipte çizilir (ölçüm 2) ve seçicinin hemen üstünde durur.
- **R15.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı, yeni kilit alanı ve yeni birleştirme kuralı yok. Parti değişikliği bugünkü `cust_edit` izniyle ve `customer` kaydı kilidiyle yazılır (ölçüm 5).
- **R15/2.** Parti düzeltmesi bugünkü müşteri düzenlemesinin çakışma sınırını paylaşır: çakışma birleştirmesi var olan kaydın düzenlemesini yeniden uygulamaz (ölçüm 25), yani aynı anda başka bilgisayarda düzenlenen kaydın parti düzeltmesi sunucu kopyasına yenilebilir. Bu iş o sınırı değiştirmez (X10).
- **R16.** Bayiler sekmesi etkilenmez: o sekme ayrı bir bileşendir ve bu formu kullanmaz (ölçüm 12, ölçüm 28).
- **R17.** `isStockSerialPick`'in (seri numarası yarışı kilidi) kip koşulu **aynen kalır**: yalnız stok seçicisinin çizildiği iki kip. R1/2'nin `stokSecicisiKipi` değişkeni o satırda okunmaz; genişlerse satılmış her kaydın düzenlemesi `stok-seri` kilidi alır ve başka kullanıcıyı nedeni görünmeyen biçimde engeller (ölçüm 19). Üçüncü kipte yeni kilit alınmaz.

---

## Constraints

### Uyulması zorunlu

- **C1.** Seçicinin çizilme kararı **tek yerde** kalır (`CustomerAddEditForm.jsx` `partiSecicisi`). İkinci bir koşul, ikinci bir kip bayrağı ya da ekranın içinde yerel bir karar yazılmaz.
- **C2.** Spec 0100 R7/2b bozulmaz: stoktan seçim varken seçici kaybolur ve formdaki değer kayda girmez. 0100'ün bunu sabitleyen kriterleri (AC-42, AC-54) ve triyaj testleri dokunulmadan yeşil kalır.
- **C3.** Parti adının gizliliği hiçbir yeni yerde gevşemez (spec 0100 C13): gider yetkisi olmayan kullanıcı seçiciyi düzenleme kipinde de görmez.
- **C4.** `src/lib/satisKaydi.js`, `src/lib/stokDurumu.js`, `src/lib/makinaStandartMaliyet.js` ve `src/lib/makinaMaliyeti.js` değişmez. Bu iş bir çizim koşulu değişikliğidir.
- **C5.** Kaydedilen gövde bugünkü şekliyle kalır: parti seçilmemiş satışta anahtar hiç yoktur. Tersi, sekmesi kısıtlı kullanıcının her kaydında sahte değişiklik üretirdi.
- **C6.** Kaydın partisini değiştirmek bugünkü kilidi aşmaz: müşteri düzenleme formu `customer` kaydı kilidini zaten tutar, yeni kilit alanı açılmaz.
- **C7.** Düzenlemede parti değiştirmek stok tarafına hiçbir şey yazmaz: stok satırı, stok hareketi ve `sourceStockId` dokunulmaz kalır.

### KAPSAM DIŞI

- **X1.** Partisiz satışları listeleyip partiye bağlayan ayrı araç (Sahipsiz Kayıtlar emsali) — *neden:* bugünkü elde on üç kayıt var ve seçici açılınca tek tek düzeltilebilir; liste, süzgeç ve toplu atama kendi kararlarını ve kendi spec'ini ister.
- **X2.** Parti boş bırakıldığında kayıt sırasında uyarı ya da onay — *neden:* yedekte 1259 satışın hepsi partisiz ve bu normaldir; her kayıtta uyarı gürültü olur ve kullanıcıyı uyarıyı görmemeye alıştırır.
- **X3.** Parti seçilip üretim tarihi boş bırakıldığında uyarı — *neden:* iki alan komşudur ve ikisi de isteğe bağlıdır; birini ötekine bağlamak satış kaydını kilitler ve bugünkü tahmin zinciri (stok hareketi, satış tarihi) zaten tarihsiz kaydı karşılar.
- **X4.** Parti değişikliğinin ayrı işlem geçmişi izi — *neden:* müşteri düzenlemesi bugün de iz bırakıyor; alan bazlı iz bütün müşteri alanları için ayrı bir karardır.
- **X5.** Düzenleme formunda stok seçicisinin açılması, yani satılmış kaydın bir stok satırına yeniden bağlanması — *neden:* stok satırı satışta diziden çıkarıldı, geri bağlanacak satır yok; dönen satır yalnız müşteri silinince doğar ve onun kendi yolu var.
- **X6.** Kapanmış partinin kaydedilmiş kapanış görüntüsünün yeniden hesaplanması — *neden:* görüntü spec 0090'da bilinçli olarak kaydedilen veridir; partiye makina eklenince makina başı pay yeniden bölünür ve bu düzeltmenin beklenen sonucudur.
- **X7.** Devredilmiş (`isResale`) kaydın partisi — *neden:* devir yeni kayıt açmaz, parti ilk satış kaydındadır ve o kayıt bu spec'le düzenlenebilir hâle gelir.
- **X8.** Satılmış makinanın üretim durumunun (montajda, satışa hazır) müşteri kaydında taşınması — *neden:* bu başka bir eksikliktir (panoda "satıldı ama hâlâ montajda" ayrımı yok), yeni kalıcı alan ister ve panonun kapsamını sipariş takibine genişletir.
- **X9.** Satış formundaki "seri no'suz stoktan düş" ile "manuel gir" ikileminin kaldırılması, yani serisiz bir stok satırı düşülürken aynı ekranda seri numarasının girilebilmesi — *neden:* bu, partisiz satışların **kök nedenidir** (ölçüm 14) ve 0103'ten bağımsızdır: 0103 doğmuş kaydı düzeltir, bu madde kaydın doğru doğmasını sağlar. Kendi kararını ister, çünkü seri numarasının stok satırına mı, satış kaydına mı yoksa ikisine mi yazılacağı sorusunu açar ve stok satırının kimlikle düşülme kuralına dokunur. **Spec 0104 olarak yazıldı ve onaylandı** (`specs/0104-serisiz-dusumde-seri-numarasi.md`, revizyon 2, 2026-10-22); sıra 0103 sonra 0104 ve aynı sürümde gitmeleri önerilir (`specs/README.md` sıra paragrafı). İki iş aynı dosyayı (`CustomerAddEditForm.jsx`) ve aynı kanıt aracını paylaşır.
- **X10.** Parti düzeltmesinin çakışma birleştirmesinde korunması — *neden:* birleştirme yalnız `MERGE_KEYS` eklemelerini yeniden uygular, var olan kaydın düzenlemesi sunucu kopyasına yenilir (ölçüm 25); bu bütün müşteri alanları için geçerli bugünkü sınırdır (spec 0073 R24 emsali) ve tek alan için ayrıcalık açmak birleştirme kuralını değiştirir.
- **X11.** "Silinmiş parti" seçeneğinin terk edildikten sonra geri getirilebilmesi — *neden:* seçenek yalnız `form.partiId` canlı listede yokken çizilir (ölçüm 26), kullanıcı başka bir seçeneğe geçtiği anda koşul bozulur ve çöpteki partinin kimliği aynı formda geri gelmez; tek çıkış Vazgeç'tir. Değeri kaydın kendisinden (`modal.edit.partiId`) çizmek C1'i bozmadan yapılabilir ama ayrı bir karardır ve kaybedilen değer yalnız çöpteki bir partiye yapılan atıftır.
- **X12.** Planı girilmemiş modele bağlanan satışın panoda "plandan fazla üretildi" işaretini tetiklemesinin bastırılması — *neden:* işaret spec 0100 R24'ün bugünkü kuralıdır (ölçüm 24); planı girilmemiş model planlanan 0 sayılır ve üretilmişse satır işaretlenir. Kullanıcı planı Parti Hesabı'nın planlanan adetler penceresinden girer; kuralı bu işte değiştirmek panonun motoruna dokunur (C4).

---

## Context

**Ölçüm 1, seçicinin bugünkü koşulu.** `src/components/customers/CustomerAddEditForm.jsx:32`:

```js
const partiSecicisi = giderYetki && (modal === "add" || seriBekleyenDuzenleme) && !stoktanSecildi;
```

`seriBekleyenDuzenleme` (`:30`) kaydın seri numarası bekleyen bir düzenleme olmasını ister (`modal?.edit && form.seriNoBekliyor && !modal.edit.serialNo`). Seri numarası dolu bir satış bu kapıdan geçmez. Seçicinin kendisi `:378-389`, ipucusu `:388`.

**Ölçüm 2, komşu alanın emsali.** Aynı dosyada `:365-373` üretim tarihi alanı yalnız `giderYetki` ile kapılıdır, kip ayrımı yoktur: ekleme ve düzenleme kiplerinde çizilir. Yani aynı bölümde, aynı yetkiyle ve aynı maliyet amacıyla duran komşu alan düzenlemede zaten açıktır. Bugünkü durumda kullanıcı satılmış bir makinanın üretim tarihini düzeltebilir ama partisini düzeltemez.

**Ölçüm 3, mevcut değer forma giriyor.** `Customers.jsx:250-254` `openEdit` formu `setForm({ ...c, kaliplar, kalipSayisi })` ile kurar, yani kaydın `partiId` alanı forma olduğu gibi girer. Seçici çizildiği anda değer dolu gelir ve `:385` zaten çöpteki parti için "Silinmiş parti" seçeneğini üretir.

**Ölçüm 4, düzenleme kolu partiye dokunmuyor.** `Customers.jsx:361-362` düzenleme kolunda `setCustomers(p => p.map(...))` formun temizlenmiş kopyasını yazar ve `deductMachineStock`'u yalnız `wasSerialPending` doğruyken çağırır. Yani seri numarası dolu kaydın düzenlemesinde `partiId` yalnız form değerinden gelir ve `partiDamgala` (`satisKaydi.js:37-40`, mevcut değeri koruyan muhafız) hiç çalışmaz. Kayıt yolu için ek kod gerekmez.

**Ölçüm 5, sunucu tarafı.** `electron/serverAuth.cjs:569-573` `ALAN_IZINLERI` yalnız `services`, `partSales` ve `yedekParcaSatislar` bölümlerinin birer alanını izler; `customers` bu haritada yok. `partiId` değişikliği bugün de bölüm düzeyinde `cust_edit` iznine tabidir ve yeni bir sunucu kuralı gerekmez.

**Ölçüm 6, `stoktanSecildi` düzenleme kipinde yanıltıcı.** `:31`:

```js
const stoktanSecildi = !!form._stokSerisiz || (!form._manualSerial && !!form.serialNo && stokSatirlari.some(s => s.serialNo === form.serialNo));
```

`openEdit` `_manualSerial` yazmaz, yani seri numarası dolu kaydın düzenlemesinde ifadenin ikinci kolu "stokta aynı model ve seriyle bir satır var mı" sorusuna döner. Böyle bir satır normalde olmaz (satışta silinir) ama elle girilen satışta hayalet satır olarak kalabilir. O durumda seçici tam ihtiyaç duyulan kayıtta gizlenirdi, bu yüzden R4.

**Ölçüm 7, kullanıcının 22 Ekim 2026 yedeği.** Yedek izole bir dizine açılıp panonun motoru birebir yeniden hesaplandı. Canlı müşteri makina kaydı 1265; `partiId` taşıyan **6**, taşımayan **1259**. 1 Ağustos 2026'dan sonraki 19 satışın 6'sı partili, 13'ü partisiz. `sourceStockId` dolu olup `partiId` boş kalan kayıt sayısı **0**, yani stoktan düşümdeki damgalama hiç şaşmıyor; eksiklerin tamamı stoktan seçilmeden girilen satışlar.

**Ölçüm 8, panonun yanlış saydığı satır.** Üç partinin bütün model satırları tarandı; Satıldı sütunu tam 1 olan **tek** satır açık partinin bir modelidir: planlanan 5, montajda 0, satışa hazır 3, satıldı 1, planlanandan kalan 1. O modelin 30 Eylül 2026 tarihli ikinci satışı partisiz olduğu için sayılmıyor. Düzeltilince satıldı 2 ve kalan 0 olur; 3 stok artı 2 satış planın tamamını tüketir. Aynı eksiklik iki model satırında daha var (biri 2 yerine 5, biri 0 yerine 3 göstermeli), orada sayı 1 olmadığı için gözle yakalanmamış.

**Ölçüm 9, kanıt boşluğu.** Görüntü aracında müşteri formunu çizen ekranlar `scripts/evidence/0009-sayfa.jsx:743` (`musteri-formu`), `:1127` (`musteri-formu-ilk-odeme`), `:1247` (`musteri-formu-0079`, düzenleme kipi) ve `:1282` (`musteri-formu-0094-ilce`, düzenleme kipi). Hiçbirine `giderYetki` verilmiyor, yani **parti seçicisi bugün hiçbir kanıt ekranında çizilmiyor**: spec 0100 onu kanıt turuna hiç sokmamış. Bu işin kanıtı için yeni bir ekran gerekir, yoksa değişiklik 0 piksel verir ve bu doğru da olur.

**Ölçüm 10, ters çevrilecek tek test.** `tests/ui/stok-durumu-0100-satis.test.jsx:131` "R7/2a: satılmış (seri no'su olan) kaydın düzenlemesinde seçici çizilmez (X8)" tam bu davranışı sabitliyor. Aynı dosyanın diğer parti testleri (`:88-124`, `:126-129`, `:138-166`) ekleme ve seri bekleyen düzenleme kiplerini ölçer ve değişmez.

**Ölçüm 11, dizinin kapısı App'te.** `src/App.jsx:1702` forma `uretimPartileri={giderYetki ? liveUretimPartileri : []}` geçiriyor, yani liste hem yetkiyle hem çöp süzmesiyle geliyor. Ekran ikinci bir kapı yazmaz.

**Ölçüm 12, formun kapsamı.** `CustomerAddEditForm` yalnız `Customers.jsx:724`'ten çağrılır (`:733` o çağrının `giderYetki` prop satırıdır) ve `Customers` yalnız müşteriler sekmesinde kurulur (`App.jsx:1702`); bayiler sekmesi `SimpleDealers`'tır (`:1703`) ve bu formu kullanmaz. Bayi formunda parti seçicisi riski yok.

**Ölçüm 13, stok tarafında parti eksikliği yok.** Yedekteki 21 canlı stok satırının **18'i seri numarasız**, ama **21'inin hepsinde** `partiId` dolu. Yani makinalar stoğa eklenirken parti düzgün seçiliyor; eksik satış tarafında doğuyor. Panonun yanlış saydığı modelin üç stok satırı da serisiz ve aynı güne (20 Eylül 2026) ait.

**Ölçüm 14, satış formunun ikilemi (kök neden).** `CustomerAddEditForm.jsx:197-241` stok seçicisi üç seçenek sunar ve seri numarasıyla stok bağı birbirini dışlar:

- `:220` serisiz seçenek (`__serisiz__`) stoğu düşer, partiyi ve üretim tarihini damgalar, ama seçildiği anda `serialNo` boşaltılır ve seri numarası alanı **hiç çizilmez**; `:224-226` metni "Seri no'yu sonra Müşteriyi Düzenle bölümünden girebilirsiniz" der.
- `:221` manuel seçenek (`__manual__`) `_manualSerial` yazar, seri numarası alanını açar ve stok düşümünü kapatır; `:253-257` ipucusu "Manuel girilen seri no stoktan düşülmez (eski müşteri kaydı için uygundur)" der.

Satış anında gerçek seri numarasını girmek isteyen kullanıcının tek yolu manuel giriştir ve o yol `sourceStockId`, `uretimTarihi` ve `partiId`'yi **birlikte** koparır. Doğru yol (serisiz düş, sonra düzenlemede seri numarası gir) stok düşümünü seri numarası bekleyen düzenlemede yapar ve partiyi damgalar, yani sorun o yolda hiç doğmaz. Bu spec ikilemi çözmez (X9).

**Ölçüm 15, seçici o satışlar yapılırken yoktu.** Yedek **v3.49.0** ile alınmış ve parti seçicisi spec 0100 ile aynı sürümde (22 Ekim 2026) yayınlandı. Partili altı kaydın **altısında da** `sourceStockId` dolu, yani altısı da stoktan düşümle otomatik damgalanmış; seçiciden elle seçilmiş kayıt **yok**. Partisiz on üç satış bir kullanıcı ihmali değil, alanın henüz bulunmadığı dönemin sonucudur.

**Ölçüm 16, stok tarihçesi log'dan okunamıyor.** `partStockLog`'un 1001 kaydında `makina_uretimi` ve `makina_uretimi_iade` tipi **hiç yok** (tipler: `servis` 874, `bayi_satis` 71, `manuel_duzelt` 33, `stok_girisi` 18, `servis_iade` 5), çünkü stoğa eklenen makinaların kiti boş ve hareket ancak parça düşülürse yazılıyor. Sonuç: bir makinanın hiç stoğa girmediği ile stoğa girip elle silindiği **ayırt edilemiyor**, yani kayıp stok satırının izini süren bir kriter yazılamaz. **Kayıp makina yok:** ölçüm 8 o modelin beş planlanan makinasını üç stok satırı, stoktan düşülerek satılan bir makina ve elle girilen bir satış olarak kapatıyor (3 + 2 = 5). Log'dan okunamayan şey beşinci makinanın nerede olduğu değil, stoğa hiç girip girmediğidir.

### QA turu ölçümleri (2026-10-23)

**Ölçüm 17, dördüncü hâl: seri numarası boş ama işareti olmayan kayıt.** `seriNoBekliyor: true` kaynakta yalnız üç yerde yazılır: `Customers.jsx:305` (ekleme, seri numarası boşsa), `settings/SettingsImport.jsx:157` (içe aktarma) ve `src/lib/merge.js:223` (satılan makinanın stoğa dönmesi). Düzenleme kolu onu yalnız **temizler** (`:357`, `if (clean.serialNo && clean.seriNoBekliyor) clean.seriNoBekliyor = false;`), hiçbir koşulda yazmaz. Düzenleme formunun seri numarası alanı ise serbest bir `Input`'tur (`CustomerAddEditForm.jsx:246`), yani kullanıcı dolu bir seriyi silip kaydedince kayıt `serialNo: ""` ve `seriNoBekliyor: false` olur. Böyle bir kayıtta `seriBekleyenDuzenleme` false, "seri numarası dolu düzenleme" de false olur; stok seçicisi de çizilmez (`isSerialPendingEdit` false). Üç kipli yazımla o kayıt hiçbir yoldan partiye bağlanamazdı. Aynı boşluk alan öncesi eski ve dış kaynaklı kayıtları da kapsar.

**Ölçüm 18, kayıt yolu parti dışında da alan yazıyor.** Düzenleme kolu sırayla `satisTevkifatUygula` (`Customers.jsx:353`), `satisKuruUygula` (`:359`) ve `calcKalanBorc` (`:360`) çağırır, sonra kaydı **bütün olarak** değiştirir (`:361`, `c.id === clean.id ? clean : c`). `satisKuruUygula` para birimi TL olan her kayda `satisKuru: null` yazar (`satisKaydi.js:17`) ve `null` gövdede bir değerdir, yokluk değildir. `openEdit` ayrıca forma `kaliplar` ve `kalipSayisi` normalleştirmesini koyar (`:251-254`), yani bu alanları taşımayan eski kayıt onları kazanır. Sonuç: "yalnız `partiId` farkını gönderir" hiçbir kayıtta doğru değil. Bunun bir bedeli yok, çünkü `customers` bölümü alan düzeyinde denetlenmiyor (ölçüm 5); yalnız kriterin yazımı düzeltilir.

**Ölçüm 19, seri numarası yarışı kilidi ikinci bir kip koşulu taşıyor.** `CustomerAddEditForm.jsx:39-41`:

```js
const isStockSerialPick = !form._manualSerial && !form._stokSerisiz && !!form.serialNo && !!form.model
  && (modal === "add" || (modal?.edit && form.seriNoBekliyor && !modal.edit.serialNo));
const { lockConflict: serialLock, forceAcquire: forceSerialLock } =
  useLock("stok-seri", isStockSerialPick ? `${form.model}::${form.serialNo}` : null);
```

Kip koşulu `partiSecicisi`'nin satırındakiyle aynı ifadenin kopyasıdır. C1 "koşul tek yerde" dediği için geliştirici kipi paylaşılan bir değişkene çıkarmaya yönelir; o değişken bu satıra da girerse satılmış her kaydın düzenlemesi `model::seri` kilidi almaya başlar ve aynı seriyle satış yapmak isteyen başka kullanıcı nedeni ekranda görünmeyen bir uyarı alır. Dosyada bugün iki `useLock(` çağrısı var: `customer` (`:33`) ve `stok-seri` (`:40`).

**Ölçüm 20, yeni kanıt ekranının kaydı için üçüncü bir durum yok.** `tests/kanit-eslemesi.test.js:19` yalnız iki değeri kabul eder (`ayni`, `degisti`) ve `:25` done'a taşınmış spec'in `degisti` kaydını yasaklar. `tests/tasarim-kaynak.test.js:160` `ayni` kaydın raporundaki satırda `piksel === 0` ister. Yeni bir ekranın kendi raporundaki satırı ise `scripts/evidence/0009-ekran.cjs:68` yüzünden `fark: "önce görüntüsü yok"` taşır ve **`piksel` anahtarı hiç yoktur**; ölçülen örnek `docs/evidence/0101-piksel-raporu.json`'daki dört satır (`stok-0101-kalip-capi-*`, `stok-0101-form-capli-*`). Yerleşik çözüm kapanış raporudur: eşlemede `stok-0101-kalip-capi` kaydı `0101-kapanis-piksel-raporu.json`'u, `stok-0102-uzun-liste` kaydı `0102-kapanis-piksel-raporu.json`'u gösteriyor ve o raporların bütün satırları `piksel: 0`. 0099, 0100, 0101 ve 0102 yeni ekranlarını bu yoldan kaydetti.

**Ölçüm 21, "dosya değişmedi" kriteri testle ölçülemiyor.** Depoda bir dosyanın değişmediğini sabitleyen test yok; spec 0084 AC-25 tam bu yüzden SHA yerine ekran adlarına çevrildi. Yerleşik desen içerik taramasıdır: `tests/kalip-capi-0101.test.js:101-140` yasaklı dizeyi, çağrı sayısını ve beklenen çağrı biçimini ölçer, yani kural eskiyince kırılır. Bu işte denetlenebilecek kayıtlar: `serverAuth.cjs:569-573` `ALAN_IZINLERI` (bugün `services`, `partSales`, `yedekParcaSatislar`; `customers` yok), `src/lib/kilitAlanlari.js` `KILIT_ALANLARI`, `src/lib/merge.js` `MERGE_KEYS`'in `customers` satırı ve `electron/db.cjs`'in sütun sabitleri.

**Ölçüm 22, uçtan uca emsal aynı dosyada.** `tests/ui/stok-durumu-0100-app.test.jsx:60-71` (AC-41) gerçek App'te Müşteriler'e geçer, "Yeni Müşteri" açar, firma adını yazar, `getByLabelText("Üretim partisi")` ile partiyi seçer, kaydeder, kaydın gövdeye düştüğünü bekler ve Stok › Parti Üretim Panosu'nda `pano-sayi-satildi` hücresinin "Satıldı2" olduğunu okur. Düzenleme yolunun ikizi yok; eklenecek test bu düzeneğin aynısıdır, yalnız "Yeni Müşteri" yerine var olan kaydın düzenlemesi açılır.

**Ölçüm 23, düzeltme öteki hak sahiplerinin payını da değiştirir.** `src/lib/makinaStandartMaliyet.js:476-490` ayın genel havuzunu o ay hak sahibi olanlar arasında bölüyor: o ay açık ve makinası olan partiler (ağırlık = partinin **güncel** canlı makina adedi) ve o ay üretilmiş partisiz makinalar (ağırlık 1). `:461` tarihsiz partisiz makinayı hiçbir ayın hak sahibi saymaz. Yani bir satışa parti verilince o makina ayın havuzundan çıkıp partinin havuzuna girer; o ayları paylaşan bütün hak sahiplerinin payı ve bütün partilerin makina başı payı yeniden hesaplanır. Tarihsiz bir satışa parti verilmesi onu ilk kez pay sahibi yapar. Kapanmış partinin kaydedilmiş kapanış görüntüsü yine değişmez, çünkü görüntü ayın **genel havuzunu** tutar (`kapanisGenelHavuzlari`, spec 0090) ve havuz makina adedinden bağımsızdır.

**Ölçüm 24, planı girilmemiş modelde "plandan fazla üretildi".** `src/lib/stokDurumu.js:138-163` planlanan adedi olmayan modele de satır açar; `fark = planlanan − (montajda + hazir + satildi)` negatif olunca `kalan` sıfıra kırpılır ve `fazla: true` olur, ekranda `FAZLA_IBARESI` çizilir. Yani planı girilmemiş bir modele yapılan parti düzeltmesi, düzeltmenin hemen ardından bu işareti üretir. Bu spec 0100 R24'ün bugünkü kuralıdır.

**Ölçüm 25, çakışma birleştirmesi düzenlemeyi geri uygulamaz.** Birleştirme yalnız `MERGE_KEYS` **eklemelerini** yeniden uygular; var olan kaydın düzenlemesi yeniden yüklenen sunucu kopyasına yenilir (CLAUDE.md'nin birleştirme kuralı, spec 0073 R24 ile aynı sınır). `merge.js` `customers.partiId`'yi yalnız yeniden atanan parti kimliğini izlemek için remap eder, değeri korumaz.

**Ölçüm 26, "Silinmiş parti" seçeneği tek yönlü.** `CustomerAddEditForm.jsx:385` seçeneği yalnız `form.partiId != null` **ve** kimlik canlı listede yokken çizer. Kullanıcı başka bir partiye ya da "Partisiz"e geçtiği anda koşul bozulur (`onChange` anahtarı siler ya da canlı bir kimlik yazar), seçenek listeden kalkar ve çöpteki partinin kimliği aynı form oturumunda geri getirilemez; tek çıkış Vazgeç'tir.

**Ölçüm 27, panonun adı tek sabitte.** "Parti Üretim Panosu" dizesi `src` altında yalnız `src/lib/stokDurumu.js:111`'de (`PANO_SEKME_ADI`) geçiyor; spec 0102 Karar 18 panonun adlarını o dosyada topladı (`PANO_KALAN_ADI`, `PANO_KALAN_IPUCU`). Form dosyası aynı modülden zaten içe aktarma yapıyor (`:6`: `serisizDusulecek`, `serisizSecenekMetni`, `seriliSecenekMetni`, `partiSecenekAdi`). Hiçbir tarama dizeyi yasaklamıyor, yani düz yazmak testi kırmaz; kuralı bozar.

**Ölçüm 28, formun tek çağıranı ve `isCustomer`.** `CustomerAddEditForm` yalnız `Customers.jsx:724`'ten çağrılır; `Customers` App'te tek satırda ve yalnız müşteriler sekmesinde çizilir (`App.jsx:1702`, spec 0100 AC-60 taraması bu satırın tekliğini zaten sabitliyor). `Customers`'ın `isCustomer` prop'u `:42`'de `true` varsayılanıyla gelir ve `src` altında hiçbir çağrı onu `false` vermiyor; bayiler ekranı `SimpleDealers`'tır ve bu formu içe aktarmaz. Yani "bayi formunda seçici çizilmez" ekranda ölçülemez, yalnız kaynakta ölçülür.

**Ölçüm 29, kayıt kilidi bugün de her düzenlemede alınıyor.** `CustomerAddEditForm.jsx:33` `useLock("customer", modal?.edit?.id ?? null)` kip ayrımı yapmaz, yani çatışma ekranı ve devralma düğmesi satılmış kaydın düzenlemesinde bugün de çalışıyor (spec 0064'ün davranışı ve testleri). Bu iş o yolda hiçbir şey değiştirmez; ölçülmesi gereken tek yeni şey `stok-seri` kilidinin genişlememesidir (ölçüm 19).

**Ölçüm 30, bugünkü ipucu metninin tam hâli.** `CustomerAddEditForm.jsx:388`: "Stoktan makina seçilmeden yapılan satış (ön sipariş) partiye buradan bağlanır; seçilmezse satış partisiz kalır." Yani boş bırakmanın sonucu (satışın partisiz kalması) zaten yazılı; eksik olan panoya yapılan atıf ve düzenleme kipini kapsayan ifade. Metni hiçbir test sabitlemiyor (depoda "ön sipariş" dizesini arayan tek yer yok; testlerdeki "Ön Sipariş AŞ" bir müşteri adıdır), yani değiştirmek serbesttir.

---

## Kararlar (Takım Yöneticisi, 2026-10-22)

**Karar 1 (onaylandı): parti seçicisi müşteri düzenleme formunda da çizilir.** Gerekçe ölçüm 8: düzeltme yolu olmadan pano kalıcı olarak yanlış sayıyor ve elde düzeltilemeyen on üç kayıt var. Reddedilenin bedeli olurdu: panonun Satıldı sütunu ve Parti Hesabı bu kayıtları hiç görmemeye devam eder. Alternatif olan toplu düzeltme aracı daha pahalı ve X1'de gerekçesiyle kapsam dışı.

**Karar 2 (onaylandı): stoktan düşülmüş kayıtta da çizilir, ayrım yapılmaz.** Gerekçe: ayrım kullanıcıya açıklanamaz ("bu makinanın partisi düzeltilebilir, şunun düzeltilemez") ve stok satırının partisi de yanlış girilmiş olabilir. Reddedilenin bedeli olurdu: koşul bir dal daha kazanır ve yanlış damgalanmış satıştan dönen kayıt düzeltilemez kalır.

**Karar 3 (onaylandı): düzenleme kipinde `stoktanSecildi` ölçütü uygulanmaz.** Gerekçe ölçüm 6: o kipte stok seçicisi çizilmediği için ölçüt bir kullanıcı seçimini değil stoktaki bir rastlantıyı ölçer ve seçiciyi tam ihtiyaç anında gizler. Reddedilenin bedeli olurdu: hayalet stok satırı olan kayıtta seçici sessizce kaybolur ve kullanıcı nedenini anlayamaz.

**Karar 4 (onaylandı): yetki gider yetkisi olarak kalır.** Gerekçe spec 0100 C13 ve Karar 21: parti adı gider bilgisidir ve komşu üretim tarihi alanı da aynı yetkiye bağlı (ölçüm 2). Bu, bugünkü kuralın korunmasıdır.

**Karar 5 (onaylandı): toplu düzeltme aracı yazılmaz.** Kapsam dışı X1. Gerekçe: bugün on üç kayıt var ve seçici açılınca tek tek düzeltilir. Reddedilenin bedeli: kayıt sayısı büyürse elle düzeltme yorucu olur; o noktada araç kendi spec'iyle gelir.

**Karar 6 (onaylandı): parti boş bırakılınca uyarı verilmez.** Kapsam dışı X2. Gerekçe: 1259 eski satışın hepsi partisiz ve bu normal; her kayıtta uyarı gürültü olur ve kullanıcıyı uyarıyı görmemeye alıştırır. Reddedilenin bedeli: aynı eksiklik yeni satışlarda yine doğabilir. Bunun asıl çözümü X9'daki kök nedendir, uyarı değil.

**Karar 7 (onaylandı): parti seçilip üretim tarihi boş kalınca uyarı verilmez.** Kapsam dışı X3. Gerekçe: iki alan da isteğe bağlı ve tarihsiz kayıt için bugünkü tahmin zinciri var. Reddedilenin bedeli: partisi düzeltilen ama tarihi boş kalan makina maliyet hesabında tahmine düşer, panoda ise doğru sayılır.

**Karar 8 (onaylandı): ipucu metni güncellenir ve boş bırakmanın sonucunu söyler.** Metin: "Stoktan makina seçilmeden yapılan satış partiye buradan bağlanır. Kaydedilmiş bir satışın partisi de buradan düzeltilir; seçilmezse satış partisiz kalır ve Parti Üretim Panosu'nun satılan adedinde görünmez." Gerekçe: bugünkü metin "ön sipariş" diyor ve düzenleme kipini kapsamıyor; boş bırakmanın **panoya etkisi** de hiçbir yerde yazılı değil. Boş bırakmanın sonucunun kendisi ("seçilmezse satış partisiz kalır") bugünkü metinde zaten var (ölçüm 30, Karar 17). Metin satır içinde kalır, sabite taşınmaz: tek kullanım yeri var ve spec 0100'ün komşu ipucuları da satır içi.

**Karar 9 (onaylandı): yeni bir kanıt ekranı eklenir.** Adı `musteri-formu-0103-parti`: gider yetkisi açık, canlı parti listesi dolu, seri numarası dolu bir kaydın düzenleme kipi. Gerekçe ölçüm 9: parti seçicisi bugün hiçbir kanıt ekranında çizilmiyor, yani yeni ekran olmadan bu işin görsel kanıtı 0 piksel verir ve değişikliği hiç göstermez. Reddedilenin bedeli: seçicinin yerleşimi ve ipucu metni kanıt turuna hiç girmez, sonraki bir iş onu farkında olmadan bozabilir.


### QA turu kararları (2026-10-23)

**Karar 10 (onaylandı, Bloklayıcı): yeni ekranın kanıt kaydı kapanış raporunu gösterir.** Taban `0103-taban-piksel-raporu.json` yeni ekranı içermez, iş raporu `0103-piksel-raporu.json` onu "önce görüntüsü yok" ile kaydeder, eşleme kaydı `docs/evidence/0103-kapanis-piksel-raporu.json` + `ekran: "musteri-formu-0103-parti"` + `beklenen: "ayni"` olur. Gerekçe ölçüm 20: eşlemede yalnız iki durum var ve `ayni` kayıt raporda `piksel === 0` ister, yeni ekranın kendi raporundaki satırda ise `piksel` anahtarı hiç yok. Reddedilenin bedeli olurdu: kayıt `ayni` ile iş raporunu gösterirse `tasarim-kaynak` testi kırılır, `degisti` ile gösterirse spec done'a taşınırken AC-11c'ye takılır. 0099, 0100, 0101 ve 0102 yeni ekranlarını bu yoldan kaydetti.

**Karar 11 (onaylandı, Önemli): kapı "düzenleme kipinin tamamı" olarak yazılır, "dolu seri" kapısı yazılmaz.** Koşul `giderYetki && !(stokSecicisiKipi && stoktanSecildi)` biçimine indirgenir (R1/2). Gerekçe ölçüm 17: üç kipli yazım, seri numarası boş ama `seriNoBekliyor` işareti olmayan kaydı (seriyi silip kaydetmek, alan öncesi ve dış kaynaklı veri) dışarıda bırakır ve o kayıtta düzeltme yolu yine kapalı kalır. Reddedilenin bedeli olurdu: spec'in düzeltmek istediği kümenin bir alt kümesi erişilemez kalır ve kullanıcı nedenini anlayamaz.

**Karar 12 (onaylandı, Önemli): AC-17 gövdeyi daraltmaz, bugünkü normalleştirmeleri sayar.** Gerekçe ölçüm 18: kayıt yolu TL kayda her kaydedişte `satisKuru: null`, alanı olmayan eski kayda `kaliplar` ve `kalipSayisi` yazar ve `kalanBorc`'u yeniden hesaplar. Reddedilenin bedeli olurdu: kriter ya atlanır ya geliştirici gövdeyi daraltan yeni bir kod yolu açar; oysa alan düzeyinde sunucu denetimi yok (ölçüm 5), yani fazladan alanların bir bedeli yok.

**Karar 13 (onaylandı, Önemli): `stok-seri` kilidinin kipi genişlemez (R17).** Gerekçe ölçüm 19: kilidin kip koşulu `partiSecicisi`'nin kopyasıdır ve C1 koşulu tek değişkene çıkarmaya yönelttiği için o değişken bu satıra da sızabilir; sızarsa satılmış her kaydın düzenlemesi `model::seri` kilidi alır. Reddedilenin bedeli olurdu: başka kullanıcı aynı seriyle satış yapamaz ve nedeni ekranda görünmez.

**Karar 14 (onaylandı, Önemli): ölçüm 16'nın "beşinci makina kayıp" sonucu silinir.** Gerekçe: ölçüm 8 beş makinayı üç stok satırı, stoktan düşülerek satılan bir makina ve elle girilen bir satış olarak kapatıyor; iki ölçüm çelişiyordu. Ölçüm 16'nın taşıdığı gerçek bilgi (log'dan stoğa hiç girmediği ile girip silindiği ayırt edilemez) korunur. Reddedilenin bedeli olurdu: geliştirici olmayan bir kayıp stok satırını arar.

**Karar 15 (onaylandı, Önemli): "değişmedi" kriterleri içerik taramasına çevrilir.** AC-20 mevcut motor testlerinin yeşil kalmasını, AC-25 dört kayıt üzerinde içerik taramasını ölçer; commit'in dosya listesi SCORECARD'a yazılır. Gerekçe ölçüm 21: dosya değişmezliğini sabitleyen test deponun deseninde yok, spec 0084 AC-25 bu yüzden SHA'dan vazgeçti, spec 0101 içerik taramasıyla ölçtü. Reddedilenin bedeli olurdu: kriter boş geçer ya da kırılgan bir hash testine dönüşür.

**Karar 16 (onaylandı, Önemli): AC-41'in düzenleme ikizi yazılır ve DoD kriter kriter eşleme verir.** Gerekçe ölçüm 22: spec'in Intent'i panodaki bir sayının düzelmesi ve o sayı bugün yalnız ekleme yolunda uçtan uca ölçülüyor; emsal aynı dosyada ve ucuz. Reddedilenin bedeli olurdu: iş "seçici çizildi" düzeyinde kanıtlanmış olur, asıl sonuç ölçülmez.

**Karar 17 (onaylandı, Küçük): Karar 8'in gerekçesi düzeltilir, metin değişmez.** Gerekçe ölçüm 30: bugünkü ipucu "seçilmezse satış partisiz kalır" cümlesini zaten taşıyor; eksik olan panoya atıf ve düzenleme kipi. Reddedilenin bedeli olurdu: spec ölçümle çelişen bir gerekçe taşır.

**Karar 18 (onaylandı, Küçük): panonun adı yeni ipucuda `PANO_SEKME_ADI`'ndan gelir (R8/2).** Gerekçe ölçüm 27: dize bugün yalnız `stokDurumu.js:111`'de ve spec 0102 Karar 18 panonun adlarını orada topladı; form dosyası o modülden zaten içe aktarma yapıyor. Reddedilenin bedeli olurdu: ikinci bir düz kopya 0102'nin kararını sessizce geri alır (tarama olmadığı için testler susar).

**Karar 19 (onaylandı, Küçük): AC-11 "partisi olmayan kayıtta" diye daraltılır.** Çöpteki partili ve canlı liste boş hâli AC-10'un ikinci cümlesi olur. Gerekçe: iki kriter aynı sınırda çelişiyordu, çünkü "Silinmiş parti" seçeneği canlı liste boşken de çizilir (`:385`).

**Karar 20 (onaylandı, Küçük): AC-26 kaynak taramasına çevrilir.** Gerekçe ölçüm 28: formun tek çağıranı `Customers.jsx:724`, `Customers` App'te tek satır ve `isCustomer` hiçbir yerde `false` verilmiyor, yani iddia ekranda ölçülemez. Reddedilenin bedeli olurdu: kriter ya atlanır ya yapay bir düzenekle ölçülür.

**Karar 21 (onaylandı, Küçük): AC-18 ikiye bölünür.** Çatışma yarısı spec 0064'ün bugünkü davranışı olarak kalır ve yeni test istemez (ölçüm 29); ölçülecek yarısı Karar 13'ün kriteridir. Gerekçe: kriter bugünkü davranışı tekrar ediyordu ve asıl risk yazılı değildi.

**Karar 22 (onaylandı, Küçük): "plandan fazla üretildi" işareti bastırılmaz (X12), yazılı hâle gelir.** Gerekçe ölçüm 24: işaret spec 0100 R24'ün bugünkü kuralıdır ve kuralı değiştirmek panonun motoruna dokunur (C4). Reddedilenin bedeli olurdu: düzeltmenin hemen ardından beklenmeyen bir uyarı çıkar ve kullanıcı düzeltmeyi hatalı sanar; bu yüzden sonucu spec'te yazılı.

**Karar 23 (onaylandı, Küçük): düzeltmenin yan etkisinin kapsamı yazılır.** Gerekçe ölçüm 23: düzeltme yalnız o partinin değil, o ayları paylaşan bütün hak sahiplerinin payını değiştirir ve tarihsiz bir satışa parti verilmesi onu ilk kez pay sahibi yapar; kapanmış partinin kaydedilmiş görüntüsü yine değişmez. Reddedilenin bedeli olurdu: uygulama turunda başka makinaların rakam değişimi gerileme sanılır.

**Karar 24 (onaylandı, Küçük): çakışma sınırı yazılır (R15/2, X10), değiştirilmez.** Gerekçe ölçüm 25: birleştirme yalnız eklemeleri geri uygular ve bu bütün müşteri alanları için geçerli bugünkü sınırdır (spec 0073 R24). Reddedilenin bedeli olurdu: panonun doğruluğu hedefken sessizce kaybolan bir düzeltme hiçbir yerde yazılı olmaz.

**Karar 25 (onaylandı, Küçük): "Silinmiş parti" seçeneğinin tek yönlülüğü yazılı sınır olur (X11).** Gerekçe ölçüm 26: seçenek terk edildiği anda listeden kalkar ve kimlik aynı formda geri gelmez; kaybedilen değer yalnız çöpteki bir partiye yapılan atıftır. Düzeltilmesi (seçeneğin `modal.edit.partiId`'den çizilmesi) C1'i bozmadan yapılabilir ama ayrı bir karardır.

**Karar 26 (onaylandı, Küçük): X9 spec 0104'ü adıyla gösterir.** Gerekçe: 0104 yazıldı ve onaylandı, `specs/README.md` sırayı "0103 sonra 0104, aynı sürümde" diye yazıyor; iki iş aynı dosyayı ve aynı kanıt aracını paylaşıyor. Reddedilenin bedeli olurdu: bayat atıf geliştiriciyi 0104'ün varlığını bilmeden ilerletir.

**Karar 27 (onaylandı, Küçük): dört satır atfı düzeltilir.** İpucu `:388`, formun çağrısı `Customers.jsx:724`, 0100 testinin aynen kalan parti testleri `:88-124`, triyaj bloğu `:138-166`. Gerekçe: satır atıfları geliştiricinin tek navigasyon aracıdır. Doğrulanıp aynen bırakılanlar: `:30`, `:31`, `:32`, `:365-373`, `:378-389`, `:385`, `:220`, `:221`, `:224-226`, `:253-257`, `Customers.jsx:250-254`, `:361-362`, `satisKaydi.js:37-40`, `serverAuth.cjs:569-573`, `App.jsx:1702`, test `:131` ve dört kanıt ekranının satırları (`:743`, `:1127`, `:1247`, `:1282`).

### Plan turu kararları (2026-10-23)

**Karar 28 (onaylandı): 0 fark listesi beş müşteri formu ekranıdır.** Görüntü aracında `musteri-formu-hata` da aynı formu
çiziyor; Görsel kanıt bölümündeki dört ekranın yanına girer.

**Karar 29 (onaylandı): AC-23 casusla da ölçülür.** DoD 3'ün "AC-19…AC-24 için yeni test yazılmaz" kuralından küçük bir
sapma: `vi.mock` ile `satisKaydi.partiDamgala`'ya casus konur; seri numarası dolu düzenlemede çağrı sayısı 0, seri numarası
bekleyen düzenlemede en az 1. Gerekçe: maliyetsiz ve kayıt yolunun sessizce damgalamaya başlamasını yakalar. AC-19…AC-22 ve
AC-24 DoD 3'teki gibi kalır.

**Karar 30 (onaylandı): AC-25'in taramaları içerik ölçer.** `KILIT_ALANLARI`'nın anahtarları bugünkü listeyle karşılaştırılır
(alan ekleyen spec listeyi günceller), `MERGE_KEYS`'in `customers` satırı birebir, `CUSTOMERS_MALIYET_COLUMNS` bugünkü üç
alanla, `ALAN_IZINLERI.customers` tanımsız.

**Karar 31 (onaylandı): AC-17'nin ölçüsü** kaydetmeden önceki ve sonraki kaydın farkıdır: değişen anahtarlar `partiId` ve
AC-17'nin saydığı normalleştirmelerin alt kümesi, `partiId` farkın içinde.

**Karar 32 (onaylandı): AC-29** `window.crmLocks` sahtesinin `acquire` çağrılarıyla ölçülür (spec 0064 deseni).

**Karar 33 (onaylandı): AC-31** kendi verisini kurar; paylaşılan `veri()` fikstürü (AC-37, AC-41) değişmez.

**Karar 34 (onaylandı): AC-16** stok tarafının üç setter'ının (`setStock`, `setPartStockLog`, `setPartStock`) parti
düzeltmesinde hiç çağrılmamasıyla ölçülür (dizinin aynı kalmasından güçlü).

**Karar 35 (onaylandı): AC-9** aynı model ve seriyle duran hayalet stok satırıyla ölçülür; aynı testte stok seçicisinin
çizilmediği de doğrulanır (X5).

**Karar 36 (onaylandı): ipucu şablonu** `${PANO_SEKME_ADI}'nun` ekiyle Karar 8'deki cümleyi birebir verir; AC-12 cümlenin
tamamını sınar.

**Karar 37 (onaylandı): değişiklik yüzeyi 0104'ten ayrık tutulur:** bu iş formun yalnız kapı satırlarına (`:28-32`) ve seçici
bloğuna dokunur, stok seçicisinin içine dokunmaz.

---

## Acceptance Criteria

### Parti seçicisinin çizilmesi

- **AC-1.** Gider yetkisi olan kullanıcı, seri numarası dolu bir müşteri kaydını düzenlerken "Üretim partisi" seçicisini görür.
- **AC-2.** Seçici kaydın mevcut partisini seçili gösterir.
- **AC-3.** Partisi olmayan kayıtta seçici "Partisiz" seçili açılır.
- **AC-4.** Gider yetkisi olmayan kullanıcı seçiciyi düzenleme kipinde de görmez (spec 0100 AC-53'ün kapsamı genişler).
- **AC-5.** Ekleme kipinde bugünkü davranış birebir aynıdır: seçici çizilir, bütün canlı partileri açıklar "(açık)" ekiyle listeler.
- **AC-6.** Seri numarası bekleyen kaydın düzenlemesinde bugünkü davranış birebir aynıdır.
- **AC-7.** Ekleme kipinde stoktan serili bir satır seçilince seçici kaybolur ve formda seçilmiş parti kayda girmez (spec 0100 AC-42, AC-54 aynen).
- **AC-8.** Ekleme kipinde serisiz stok seçeneği seçilince de seçici kaybolur ve seçilmiş parti kayda girmez.
- **AC-9.** Seri numarası dolu kaydın düzenlemesinde, stokta aynı model ve aynı seri numarasıyla bir satır dursa bile seçici çizilir.
- **AC-10.** Çöpteki bir partiye bağlı satışın düzenlemesinde seçici "Silinmiş parti" seçeneğiyle değeri korur. Canlı parti listesi bütünüyle boş olsa da bu seçenek çizilir (ölçüm 26); seçenek terk edilince geri gelmez (X11).
- **AC-11.** Partisi **olmayan** kayıtta ve hiç canlı parti yokken seçici yalnız "Partisiz" seçeneğiyle çizilir; kayıt `partiId` kazanmadan kaydedilir (gövdede anahtar yoktur; AC-17'nin saydığı bugünkü normalleştirmeler dışında yeni fark üretilmez).
- **AC-12.** Seçicinin ipucu metni Karar 8'deki cümledir ve düzenleme kipinde de görünür.

### Kayıt

- **AC-13.** Düzenlemede parti seçilip kaydedilince müşteri kaydının `partiId` alanı o partinin kimliğidir.
- **AC-14.** Düzenlemede parti "Partisiz" yapılıp kaydedilince `partiId` anahtarı kayıttan **silinir**, `null` olarak kalmaz.
- **AC-15.** Düzenlemede parti değiştirilince kaydın `sourceStockId`, `uretimTarihi`, `serialNo` ve kalıp alanları değişmez.
- **AC-16.** Düzenlemede parti değiştirilince stok dizisi, stok hareketleri ve parça stoğu değişmez.
- **AC-17.** Parti dışında hiçbir alanı **elle** değiştirmeyen kayıt `cust_edit` izniyle geçer; gövdede `partiId` yanında yalnız bugünkü kayıt yolunun ürettiği normalleştirmeler (`satisKuru`, `kalanBorc`, `kaliplar`, `kalipSayisi`, tevkifat alanları) bulunur ve bu iş yeni bir fark üretmez (ölçüm 18).
- **AC-18.** Kaydı başka bir kullanıcı düzenliyorsa form bugünkü kayıt kilidi çatışmasını gösterir. Bu spec 0064'ün bugünkü davranışıdır (`useLock("customer", …)` kip ayrımı yapmaz, ölçüm 29), yeni test yazılmaz; seçicinin yeni kilit almadığı AC-28 ve AC-29 ile ölçülür.

### Değişmeyenler

- **AC-19.** Partisi düzeltilen makina Parti Üretim Panosu'nun Satıldı sütununda o partinin satırında sayılır; planlanandan kalan bugünkü formülle yeniden hesaplanır. Modelin planlanan adedi girilmemişse satır bugünkü kuralla "plandan fazla üretildi" işaretini alır (ölçüm 24, X12); bu beklenen sonuçtur.
- **AC-20.** Panonun motoru (`stokDurumu.js`) ve beş sayısı bu işte değişmez: mevcut motor testleri (`tests/stok-durumu-0100.test.js`) **dokunulmadan** yeşil kalır.
- **AC-21.** Parti genel gider payları partiye eklenen makinayla bugünkü kuralla yeniden bölünür; kapanmış partinin kaydedilmiş kapanış görüntüsü değişmez. Yeniden bölme düzeltilen partiyle sınırlı değildir: o ayları paylaşan bütün hak sahiplerinin payı ve bütün partilerin makina başı payı değişir, tarihsiz bir satışa parti verilmesi onu ilk kez pay sahibi yapar (ölçüm 23).
- **AC-22.** Parti Hesabı partisi düzeltilen makinayı bugünkü kurallarıyla (üretim gününün parça maliyeti, partinin payı) hesaba katar.
- **AC-23.** `satisKaydi.partiDamgala` değişmez ve seri numarası dolu kaydın düzenlemesinde hiç çağrılmaz.
- **AC-24.** Üretim tarihi alanının çizilme koşulu ve yeri değişmez.
- **AC-25.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı, yeni kilit alanı ve yeni birleştirme kuralı eklenmez. Ölçümü dört içerik taraması (ölçüm 21): `serverAuth.cjs` `ALAN_IZINLERI`'nde `customers` anahtarı yok, `src/lib/kilitAlanlari.js` `KILIT_ALANLARI`'nda yeni alan yok, `src/lib/merge.js` `MERGE_KEYS`'inin `customers` satırı değişmedi, `electron/db.cjs`'de yeni sütun sabiti yok.
- **AC-26.** Bayiler sekmesinin formlarında parti seçicisi çizilmez; ölçümü kaynak taramasıdır (ölçüm 28): `SimpleDealers.jsx` `CustomerAddEditForm`'u içe aktarmaz, formun tek çağıranı `Customers.jsx`'tir ve `Customers` App'te tek satırda çizilir. Ekranda ölçülmez.

### QA turu kriterleri (2026-10-23)

- **AC-27.** Seri numarası boş ve `seriNoBekliyor` işareti olmayan kaydın düzenlemesinde de seçici çizilir ve mevcut partisi seçili gelir (R1/2, ölçüm 17). Aynı kipte stok seçicisi çizilmez, yani `stoktanSecildi` ölçütü uygulanmaz.
- **AC-28.** Kaynak taraması: `CustomerAddEditForm.jsx`'te `useLock(` çağrısı **iki** kalır (`customer`, `stok-seri`) ve `stok-seri` çağrısı `partiSecicisi`'nin kip değişkenini okumaz (R17, ölçüm 19).
- **AC-29.** Seri numarası dolu kaydın düzenlemesinde `stok-seri` kilidi **istenmez** (testte `window.crmLocks` sahtesiyle ölçülür); ekleme ve seri numarası bekleyen düzenleme kiplerinde bugünkü gibi istenir.
- **AC-30.** Yeni ipucu cümlesinde panonun adı `PANO_SEKME_ADI`'ndan gelir; "Parti Üretim Panosu" dizesi form dosyasına düz yazılmaz (R8/2, ölçüm 27) ve `src/lib/stokDurumu.js` değişmez.
- **AC-31.** Uçtan uca (gerçek App): partisiz satılmış bir kaydın düzenlemesinde parti seçilip kaydedilince Stok › Parti Üretim Panosu'nda o partinin satılan adedi bir artar ve planlanandan kalan bir azalır (ölçüm 22'deki AC-41 düzeneğinin düzenleme ikizi).
- **AC-32.** `musteri-formu-0103-parti` ekranının kanıt kaydı `docs/evidence/0103-kapanis-piksel-raporu.json`'u gösterir, `beklenen: "ayni"` taşır ve o raporda iki temada da `piksel: 0` verir (Karar 10, ölçüm 20).

---

## Görsel kanıt

Ölçüm 9'un sonucu: parti seçicisi bugün hiçbir kanıt ekranında çizilmiyor, çünkü müşteri formunu çeken dört ekranın hiçbirine `giderYetki` verilmiyor. Bu yüzden:

- Mevcut beş müşteri formu ekranı (`musteri-formu`, `musteri-formu-hata`, `musteri-formu-ilk-odeme`, `musteri-formu-0079`, `musteri-formu-0094-ilce`; beşincisi plan turunda eklendi, Karar 28) **0 piksel** fark vermelidir. Fark çıkarsa yetki kapısı yanlış kurulmuş demektir.
- Yeni ekran **`musteri-formu-0103-parti`** eklenir (Karar 9): gider yetkisi açık, canlı parti listesi en az iki parti (biri açık biri kapalı), seri numarası dolu bir kaydın düzenleme kipi, görünümde üretim tarihi ve parti seçicisi birlikte. Kaydın para birimi TL seçilir, yoksa gider yetkisi satış kuru bilgi satırını da açar (`:426`) ve ekran bu işin konusu olmayan bir satır taşır.
- İkinci yeni ekran gerekmez: ekleme kipindeki seçici aynı koddan çizilir ve yeni ekranla birlikte kapsanır.

**Üç rapor ve kaydın yeri (Karar 10, ölçüm 20).** Eşlemede yalnız iki durum var (`ayni`, `degisti`) ve `ayni` kayıt kendi raporunda `piksel === 0` ister; yeni bir ekranın ilk raporundaki satırı ise `fark: "önce görüntüsü yok"` taşır ve `piksel` anahtarı hiç yoktur. Bu yüzden:

1. `docs/evidence/0103-taban-piksel-raporu.json`: uygulama öncesi kodla çekilir, yeni ekranı **içermez** (ekran görüntü aracına uygulama turunda eklenir).
2. `docs/evidence/0103-piksel-raporu.json`: iş raporu; mevcut dört müşteri formu ekranı 0 piksel, yeni ekran "önce görüntüsü yok".
3. `docs/evidence/0103-kapanis-piksel-raporu.json`: spec `done`'a taşınırken bugünkü kodla çekilir; eşleme kaydı (`CustomerAddEditForm.jsx` altında, `ekran: "musteri-formu-0103-parti"`, `beklenen: "ayni"`) **bu** raporu gösterir ve iki temada da `piksel: 0` verir (AC-32).

Emsal ölçüldü: `stok-0101-kalip-capi` kaydı `0101-kapanis-piksel-raporu.json`'u, `stok-0102-uzun-liste` kaydı `0102-kapanis-piksel-raporu.json`'u gösteriyor.

**Spec 0104 ile ortak dosya.** 0104 de aynı kanıt aracına kendi ekranını ekler ve aynı form dosyasına dokunur (X9, Karar 26); sıra 0103 sonra 0104 olduğu için 0104'ün tabanı 0103'ün kapanış turunu taban alır.

---

## Ters çevrilen kriterler

| Spec | Kriter | Bugünkü hâli | Bu spec'le |
|---|---|---|---|
| 0100 | **X8** | Satılmış makinanın partisinin sonradan düzeltilmesi, yani düzenleme formunda seçicinin açılması kapsam dışı | Kapsam içine alınır; gerekçe ölçüm 8, düzeltme yolu olmadan pano kalıcı olarak yanlış sayıyor |
| 0100 | **R7/2a**'nın kip yarısı | Seçici yalnız stok seçicisinin çizildiği kiplerde (ekleme, seri numarası bekleyen düzenleme) | Kip kapısı **bütünüyle kalkar**: seçici ekleme ve bütün düzenleme kiplerinde çizilir, `stoktanSecildi` yalnız stok seçicisinin çizildiği iki kipte uygulanır (R1/2, Karar 11); **yetki yarısı aynen korunur** |
| 0100 | **R7/3** | "Satılmış eski bir kaydın partisinin sonradan düzeltilmesi bu işin kapsamında değildir" | Bu spec'in kapsamıdır |
| 0100 | `tests/ui/stok-durumu-0100-satis.test.jsx:131` | "satılmış (seri no'su olan) kaydın düzenlemesinde seçici çizilmez (X8)" | Silinip tersi yazılır: seçici çizilir ve mevcut parti seçili gelir (AC-1, AC-2) |

Ters çevrilmeyenler, yani aynen yeşil kalması beklenen 0100 kriterleri: **AC-42**, **AC-54** (stoktan seçim varken seçici çizilmez ve değer kayda girmez), **AC-53** (yetki kapısı), **AC-39** ve **AC-40** (ekleme kipi), ve aynı dosyanın üç triyaj testi (`bulgu 3`, `bulgu 4`, `bulgu 3 sınırı`). Panonun motor testleri (`tests/stok-durumu-0100.test.js`) ve `AC-41`'in ekleme yolu da dokunulmaz; AC-41'in yanına yalnız düzenleme ikizi eklenir (Karar 16, AC-31).

---

## Definition of Done

1. `partiSecicisi` koşulu tek yerde güncellenir: kip kapısı `stokSecicisiKipi`'ne indirgenir, `stoktanSecildi` ölçütü yalnız stok seçicisinin çizildiği iki kipte uygulanır (R1, R1/2, R3, R4, C1). `isStockSerialPick`'in kip koşuluna dokunulmaz (R17).
2. İpucu metni Karar 8'deki cümleye güncellenir; panonun adı `PANO_SEKME_ADI`'ndan gelir (R8, R8/2, AC-12, AC-30).
3. Ölçüm yerleri kriter kriter yazılı: `tests/ui/stok-durumu-0100-satis.test.jsx`'in yeni bloğu AC-1…AC-18 ile AC-27, AC-29 ve AC-30'u ölçer ve `:131`'deki test silinip tersi yazılır; `tests/ui/stok-durumu-0100-app.test.jsx` AC-31'i (AC-41'in düzenleme ikizi) ölçer; AC-25, AC-26 ve AC-28 kaynak taramalarıdır; AC-19…AC-24 için yeni test yazılmaz, mevcut motor testlerinin dokunulmadan yeşil kalması ölçülür; AC-32 kanıt turunda ölçülür. `stok-durumu-0100-satis.test.jsx`'in diğer parti testleri dokunulmadan yeşil kalır.
4. AC-25'in dört içerik taraması yazılır (`ALAN_IZINLERI`'nde `customers` yok, `KILIT_ALANLARI`'nda yeni alan yok, `MERGE_KEYS`'in `customers` satırı değişmedi, `db.cjs`'de yeni sütun sabiti yok) ve commit'in değişen dosya listesi (`git diff --name-only`) SCORECARD'ın "ölçülen sapmalar" hücresine yazılır (Karar 15).
5. Görüntü aracına `musteri-formu-0103-parti` ekranı ve fikstürü eklenir; **üç rapor** çekilir (taban, iş, kapanış) ve mevcut dört müşteri formu ekranının 0 piksel verdiği iş raporunda gösterilir (Görsel kanıt bölümü).
6. `docs/evidence/kanit-eslemesi.json` yeni ekranın kaydını **kapanış raporunu göstererek** ve `beklenen: "ayni"` ile alır (Karar 10, AC-32).
7. `npm test` ve `npm run lint` tam yeşil; Electron testleri bu işten etkilenmez ama kayıt kilidi testleri (`ui/kilit-0064`) koşulur.
8. Spec `specs/done/` altına taşınır, SCORECARD doldurulur, `specs/README.md` tablosu ve sıra paragrafı güncellenir.
9. Sürüm notu gerekmez: yeni alan ve karışık sürüm riski yok, güncellenmemiş istemci yalnız seçiciyi görmez ve kaydettiği gövde bugünküyle aynı kalır.

---

## Karar kaydı (QA turu 2026-10-23)

| Kod | Derece | Boşluk | Karar | İşlendiği yer |
|---|---|---|---|---|
| **B-1** | Bloklayıcı | Yeni kanıt ekranının eşleme kaydının durumu temsil edilemiyor | Kayıt `0103-kapanis-piksel-raporu.json`'u gösterir, `beklenen: "ayni"`, üç rapor çekilir | Karar 10, ölçüm 20, AC-32, Görsel kanıt, DoD 5, DoD 6 |
| **Ö-1** | Önemli | Üç kipli yazım, seri numarası boş ama işareti olmayan kaydı dışarıda bırakıyor | Kip kapısı kalkar, koşul `giderYetki && !(stokSecicisiKipi && stoktanSecildi)` | Karar 11, ölçüm 17, R1, R1/2, R4, AC-27, DoD 1 |
| **Ö-2** | Önemli | AC-17 ölçülemez: kayıt yolu parti dışında da alan yazıyor | Kriter bugünkü normalleştirmeleri sayar, gövde daraltılmaz | Karar 12, ölçüm 18, AC-17, AC-11 |
| **Ö-3** | Önemli | `stok-seri` kilidi üçüncü kipe sızabilir | Kip koşulu aynen kalır, iki taramalı ve testli ölçüm | Karar 13, ölçüm 19, R17, AC-28, AC-29, DoD 1 |
| **Ö-4** | Önemli | Ölçüm 16 ile ölçüm 8 çelişiyor (kayıp beşinci makina) | Yanlış sonuç silinir, log tespiti korunur | Karar 14, ölçüm 16 |
| **Ö-5** | Önemli | AC-20 ve AC-25 bir testle ölçülemiyor | İçerik taramaları ve commit dosya listesi | Karar 15, ölçüm 21, AC-20, AC-25, DoD 4 |
| **Ö-6** | Önemli | AC-19…AC-26'nın ölçüm yeri yazılı değil, uçtan uca test yok | AC-41'in düzenleme ikizi, DoD'da kriter kriter eşleme | Karar 16, ölçüm 22, AC-31, DoD 3 |
| **K-1** | Küçük | Karar 8'in gerekçesi ölçümle çelişiyor | Gerekçe "panoya etkisi yazılı değil" olur, metin değişmez | Karar 17, ölçüm 30, Karar 8, R8 |
| **K-2** | Küçük | Panonun adı yeni ipucuda düz yazılacak | `PANO_SEKME_ADI` sabitinden şablonla gelir | Karar 18, ölçüm 27, R8/2, AC-30 |
| **K-3** | Küçük | AC-11 ile AC-10 aynı sınırda çelişiyor | AC-11 "partisi olmayan kayıtta" diye daralır | Karar 19, AC-10, AC-11 |
| **K-4** | Küçük | AC-26 ekranda ölçülemez | Kaynak taramasına çevrilir | Karar 20, ölçüm 28, AC-26, R16 |
| **K-5** | Küçük | AC-18'in ilk yarısı bugünkü davranışı tekrarlıyor | İkiye bölünür, ölçülecek yarısı AC-28 ve AC-29 | Karar 21, ölçüm 29, AC-18 |
| **K-6** | Küçük | Planı girilmemiş modelde "plandan fazla üretildi" işareti | Kural değişmez, sonucu yazılı olur | Karar 22, ölçüm 24, X12, AC-19 |
| **K-7** | Küçük | Düzeltmenin yan etkisinin kapsamı yazılı değil | Bütün hak sahiplerinin payının değiştiği yazılır | Karar 23, ölçüm 23, AC-21 |
| **K-8** | Küçük | Çakışma birleştirmesi parti düzeltmesini geri uygulamaz | Bugünkü sınır yazılı olur, değiştirilmez | Karar 24, ölçüm 25, R15/2, X10 |
| **K-9** | Küçük | "Silinmiş parti" seçeneği terk edilince geri gelmiyor | Yazılı sınır olur, düzeltmesi ayrı karar | Karar 25, ölçüm 26, X11, AC-10 |
| **K-10** | Küçük | X9 bayat: spec 0104 yazıldı ve onaylandı | X9 0104'ü adıyla gösterir, sıra yazılır | Karar 26, X9, Görsel kanıt |
| **K-11** | Küçük | Dört satır atfı kaymış | `:388`, `Customers.jsx:724`, `:88-124`, `:138-166` | Karar 27, ölçüm 1, ölçüm 10, ölçüm 12 |

Toplam **18 bulgu: 1 Bloklayıcı, 6 Önemli, 11 Küçük**; tamamı Takım Yöneticisi tarafından 2026-10-23'te kabul edildi ve bu spec'e işlendi.

---

## SCORECARD

| | |
|---|---|
| **Uygulama commit** | `be86973` (kapanış ayrı commit) |
| **Dal** | `feat/0103-parti-duzeltme` (taban `520bcdb`) |
| **Spec revizyon sayısı** | 4 (revizyon 3 QA turu, 18 bulgu; revizyon 4 plan onayı, on öneri, Karar 28–37) |
| **Düzeltme turu sayısı** | 1. Triyaj: 2 düşük bulgu; AC-7 testi kaydın partisini ölçmüyordu (düzenek anında yazıyordu, `ertele` kipi eklendi, triyajın mutasyonu artık kırıyor), belge düzeni (iki spec kopyası, CLAUDE.md plan yolu) kapanışta |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 |
| **Regresyon / kaçan hata** | 0 / 0. Tam takım 400 dosya, 5.261 test yeşil (Electron dahil, `ui/kilit-0064` dahil) |
| **Kapsam dışı kalanlar** | X1–X12 aynen; kök neden (X9) spec 0104'te |
| **Ölçülen sapmalar** | `git diff --name-only 520bcdb be86973` (kanıt görüntüleri hariç): `CLAUDE.md`, `docs/evidence/kanit-eslemesi.json`, `docs/tasarim-sozlugu.md` (HataMetni örneği 120 → 123; BolumBasligi örneğinin `:150` atfı bu işten önce de yanlış satırı gösteriyordu, kapsam dışı, dokunulmadı), `scripts/evidence/0009-sayfa.jsx`, iki spec dosyası, `src/components/customers/CustomerAddEditForm.jsx` (tek kaynak dosyası), `tests/parti-duzeltme-0103.test.js`, `tests/ui/stok-durumu-0100-app.test.jsx`, `tests/ui/stok-durumu-0100-satis.test.jsx`. DoD 3'ten sapma: AC-23 casusla da ölçüldü (Karar 29) |
| **Görsel kanıt** | Taban `0103-taban-piksel-raporu.json` (eski kod ↔ eski kod, 12 görüntü 0 fark), iş raporu `0103-piksel-raporu.json` (beş müşteri formu ekranı ve müşteri detayı 0 fark, yeni ekran "önce görüntüsü yok"), kapanış `0103-kapanis-piksel-raporu.json` (2 görüntü 0 fark; eşleme kaydı buraya `ayni`) |

**Bu spec'ten çıkarılan ders:** Test düzeneği güncelleyiciyi anında çalıştırıyorsa, kaydı `setCustomers` çağrısından **sonra** değiştiren kod yolu (ekleme kolunun stoktan damgalaması) testte görünmez ve test damgadan önceki kaydı ölçer; 0101'de `sourceStockId`'de, burada `partiId`'de aynı tuzağa düşüldü. Kural: ekleme kolunun kayda yazdığı alanı ölçen test React'ın sırasıyla (ertelenen güncelleyici) çalışır.
