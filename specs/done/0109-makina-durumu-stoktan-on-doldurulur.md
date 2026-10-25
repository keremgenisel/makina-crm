# 0109 — Müşteri formunda makina durumu stoktan ön doldurulur

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2, plan turu 2026-10-25; uygulama commit `802744f`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteri ekleme formunun stok seçicisi (`src/components/customers/CustomerAddEditForm.jsx:227-256`; dalları `:234-235` Manuel gir, `:236-240` serisiz, `:241-244` boş seçenek, `:247-248` serili) ve makina durumu alanı (`:432-437`); model kartının sıfırlaması (`:198`); satış kaydının damgalayıcısı (`src/lib/satisKaydi.js:43-49`); kayıt yolu (`src/components/Customers.jsx:274-295`) ve işaretin dört noktası: iki kayıt kolunun geçici alan ayıklaması (`:310`, `:363`) ile `deductMachineStock`'un iki çağrısı ve ikinci argümanı (`:328`, `:373`) |
| **Bağımlı spec'ler** | 0106 (makina durumu alanı, damgalama ve Karar 42), 0100 (stok üretim durumu ve `uretimDurumuOf`, kit ön doldurması, `serisizDusulecek`), 0101 (kalıp çapı ön doldurması, boş seçenek kuralı), 0104 (seri numarası dalı, damgalama sırası, model değişiminde sıfırlama) |
| **Ters çevrilen kriterler** | **0106 Karar 42** ("ekleme formunda stok satırı seçilince makina durumu seçicisi önizleme göstermez ve Seçilmedi kalır") ve onu sabitleyen tek test satırı (`tests/ui/musteri-durumu-0106-app.test.jsx` AC-1, `onizleme` beklentisi). **0106 R2'nin yazma şartı** form yolunda daralır: kapı `deductMachineStock`'ta kurulur (R10/2), damgalayıcının kendi kuralı ve imzası değişmez, bu yüzden ikinci bir bağlı test (`tests/musteri-durumu-0106.test.js:42-44`, "formda elle seçilmiş değer önceliklidir") dokunulmadan yeşil kalır ve "tek test satırı" sayısı korunur (ölçüm 16, Karar 9). 0106 R1, R3, R4, R6/2 ve R2/2'nin tek çağrı kuralı aynen kalır |

---

## Intent

Kullanıcı yeni müşteri kaydederken stoktan bir makina seçiyor ama o makinanın montajda mı yoksa satışa hazır mı olduğu formda görünmüyor. Makina durumu alanı "Seçilmedi" olarak duruyor ve doğru değer ancak kayıttan sonra, müşteri listesindeki pilde ortaya çıkıyor.

Kullanıcı aynı bilgiyi stok seçicisinin satırında zaten okuyor, sonra aşağıda bir kez daha elle seçmesi gerektiğini sanıyor. Seçmezse kaydın doğru damgalandığını göremiyor, seçerse aynı bilgiyi iki kez girmiş oluyor.

Bu iş bittiğinde stoktan bir satır seçilince makina durumu kendiliğinden o satırın durumundan dolacak ve seçicide görünecek: montajdaki makina "Montajda", satışa hazır makina "Hazır". Değer düzenlenebilir kalacak; kullanıcı dokunursa onun seçimi, dokunmazsa gerçekten düşülen stok satırının durumu kaydedilecek.

---

## Requirements

### Ön doldurma

- **R1.** Müşteri **ekleme** formunda ve seri numarası bekleyen kaydın düzenlenmesinde, stok seçicisinden bir satır seçilince makina durumu alanı o satırın görünen üretim durumundan ön doldurulur ve seçicide görünür.
- **R1/2.** Ön doldurma koşulsuzdur: kullanıcı daha önce elle bir değer seçmiş olsa da stok satırı seçilince ön doldurulan değer onu **ezer** ve işaret `ondoldu`ya döner (R17). Kalıp çapının emsali de böyle davranır (0101 R12), ve seçicide görünen değer değiştiği için eylem sessiz değildir (Karar 11).
- **R2.** Eşleme bugünkü damgalama kuralının aynısıdır, yeni bir eşleme tanımlanmaz: stok satırı montajda ise "Montajda", satışa hazır ise "Hazır". Üretim durumu alanı **boş** olan stok satırı Makina Stoğu'nda "Satışa hazır" durduğu için "Hazır" verir (0106 R2/2).
- **R2/2.** Eşlemenin "yeni kavram yok" olması iki ayrı donmuş sözlüğün (`stokDurumu.URETIM_DURUMU`, `musteriDurumu.MAKINA_DURUMU`) `montaj` ve `hazir` değerlerinin birebir aynı olmasına dayanır; bu eşitlik bugün hiçbir testte sabit değildir (ölçüm 22) ve saf teste iki satırlık bir iddia olarak eklenir.
- **R3.** Serisiz seçenekte ön doldurma, motorun düşeceğini öngördüğü satırdan okunur; bu satır kit ve kalıp çapı ön doldurmasının okuduğu satırın aynısıdır.
- **R4.** Ön doldurulan değer düzenlenebilir kalır. Kullanıcı başka bir değer ya da "Seçilmedi" seçebilir.

### Ön doldurmanın temizlendiği üç hâl

- **R5.** Stok seçicisinin boş seçeneği ("Stoktan seçin...") bir makina seçimi değildir ve alanı temizler (0101 R11/2'nin kuralı).
- **R6.** "Manuel gir (stok dışı / eski müşteri)" seçilince alan temizlenir. Stok dışı satışta alan boş doğar; 0106 R3 korunur.
- **R6/2.** "Stoktan seçime dön" düğmesi (`CustomerAddEditForm.jsx:289`) dördüncü geçiştir ve makina durumuna **dokunmaz**: alan R6 ile zaten temizlenmiştir, işaret `elle` kalır ve yeniden stok satırı seçilince R1/2 onu `ondoldu`ya çevirir.
- **R7.** Model değiştirilince alan temizlenir, çünkü önceki stok satırı artık geçerli değildir.
- **R7/2.** Bu temizlik **koşulsuzdur** (tek şart modelin gerçekten değişmesi): bugünkü sıfırlama yalnız serisiz seçimde çalışıyor (`:198`, `p._stokSerisiz &&`), yani serili bir satır seçilmişken model değişince seri numarası bile duruyor (ölçüm 18). Makina durumunun temizliği o koşulun içine yazılmaz. Serili dalın seri numarası kusuru X1'in yanında açık bulgu olarak kalır.

### Yazma anı

- **R8.** Kullanıcı seçiciye **dokunduysa** değeri kayıt anında korunur; bu "Seçilmedi" seçmeyi de kapsar ve alan kayda yazılmaz.
- **R8/2.** "Dokunduysa" bu form oturumunda seçiciye dokunmak demektir, kayıttaki değeri miras almak değil (R17'nin üç kaynağı). Kullanıcının seçtiği değer `durumYaz` ile yazıldığı için "Seçilmedi" alanı siler; bu yüzden "dokunuldu ve alan boş" ile "dokunulmadı ve alan boş" ayırt edilemez ve kapı yazma anında işarete bakmak zorundadır (ölçüm 15).
- **R9.** Kullanıcı dokunmadıysa kayıt anında **gerçekten düşülen** stok satırının durumu yazılır. Ön doldurma bir öngörüdür; satır yarışında başka bir satır düşülürse doğru değer o satırdan gelir (ölçüm 5).
- **R9/2.** Ön doldurulan değer kayıt anında **düşürülür** ve damga gerçek satırdan yeniden yazar; düşülecek satır hiç bulunamazsa alan kayda **hiç yazılmaz**. İki dalın ikisi de satırı bulamayabilir: serisiz dalda uyarı basılır (`Customers.jsx:288-289`), serili dalda sessizce hiçbir şey olmaz (`:291-293`), ve ön doldurulan değer düşürülmezse hiç düşülmemiş bir satırın durumuyla ve stok bağı olmadan kaydedilir (ölçüm 13, Karar 7).
- **R9/3.** İşareti olmayan değer (kayıttan gelen, R17) bugünkü kuralla korunur: damga dolu alana dokunmaz. Seri numarası bekleyen kaydın düzenlenmesinde kullanıcı seçiciye dokunmazsa kayıttaki değer ne silinir ne ezilir (ölçüm 14, Karar 8).
- **R10.** Yazma tek yerde kalır (`satisKaydi.makinaDurumuDamgala`); form yolunun kuralı "alan boşsa yaz"dan "kullanıcı dokunmadıysa yaz"a döner.
- **R10/2.** Kapı `Customers.deductMachineStock` içinde kurulur; damgalayıcının **imzası ve davranışı değişmez** (`makinaDurumuDamgala(kayit, stokSatiri)`, dolu alana dokunmaz). Böylece ikinci bağlı test dokunulmadan yeşil kalır (ölçüm 16). Üçüncü parametreli bir imza da kabul edilebilir, ama o zaman `tests/musteri-durumu-0106.test.js:42-44` de ters çevrilir ve başlıktaki test sayısı güncellenir (Karar 9).
- **R11.** `uretimDurumuOf` müşteri tarafında yalnız `satisKaydi.js`'te çağrılmaya devam eder (0106 R2/2, AC-35). Formun ön doldurması o dosyadan dışa verilen saf bir yardımcıyı çağırır; kaynak taraması aynen geçerli kalır.
- **R11/2.** Yardımcı `kalipCapiOnDoldur` emsalindedir (`utils.js:278-279`): "yazılacak alanlar nesnesi, satır yoksa boş nesne", yani `makinaDurumuOnDoldur(stokSatiri)` → `{ makinaDurumu: … }` ya da `{}`; form onu bugünkü iki satırda yayarak kullanır (`:240`, `:248`). `makinaDurumuDamgala` da aynı yardımcıyı çağırır, böylece aynı değeri üreten iki yer tek koddan okur (Karar 10, DoD).
- **R12.** "Dokunuldu" işareti geçici bir form alanıdır ve kayda yazılmaz (`_manualSerial`, `_stokSerisiz` emsali).
- **R12/2.** İşaret kayda sızarsa sonuç yalnız kozmetik değildir: `db.cjs` tanımadığı anahtarı düşürür, istemcinin gönderdiği fazla alan sunucu karşılaştırmasında hayalet fark üretir (`satisTevkifat.js:29-30`'da yazılı sınıf) ve sekmesi kısıtlı kullanıcı her kayıtta 403 alabilir. Bu yüzden işaret dört noktanın hepsinde ele alınır (R18) ve AC-16 kaynak taramasıyla değil gerçek App'in kaydettiği gövdesiyle ölçülür.

### Değişmeyenler

- **R13.** Müşteri detay penceresinin makina durumu seçicisi değişmez (orada stok seçicisi yok).
- **R14.** Kalıp durumu seçicisi, "Otomatik (…)" etiketi, pil çizimi, "Teslim Bekleyenler" süzgeci ve stok tarafının kuralı değişmez.
- **R15.** Seçenek listesi değişmez: "Seçilmedi", "Montajda", "Hazır", "Teslim edildi".
- **R16.** Kit ve kalıp çapı ön doldurmasının bugünkü davranışı değişmez.
- **R16/2.** Stoktan satışta **kaydedilen** `makinaDurumu` değeri bu işten önceki ile aynıdır; tek sapma R8'in "Seçilmedi" hâlidir. Bunu `musteri-durumu-0106-app` AC-1'in dokunulmayan damga beklentileri gösterir (yalnız `onizleme` satırı ters çevrilir).

### İşaretin şekli ve yolu

- **R17.** İşaret **üç değerlidir**, çünkü `form.makinaDurumu`'nun üç kaynağı var ve tek boolean ikisini ayırt edemez (ölçüm 14, Karar 8): kayıt (düzenlemede `openEdit` kaydı forma kopyalar, `Customers.jsx:264-265`), ön doldurma ve kullanıcının seçimi. Kayıt anındaki kural kaynağa göredir:

| İşaret | Nasıl doğar | Kayıt anında |
|---|---|---|
| yok | değer kayıttan geldi, form ona dokunmadı | bugünkü kural: damga yalnız alan boşsa yazar (R9/3) |
| `ondoldu` | stok satırı seçildi (R1, R1/2) | alan düşürülür, damga gerçek satırdan yazar; satır yoksa alan hiç yazılmaz (R9, R9/2) |
| `elle` | kullanıcı seçiciye dokundu, ya da R5/R6/R7 alanı temizledi | hiç damgalanmaz; değer ne ise o kaydedilir, silinmişse silinmiş kalır (R8, AC-13) |

- **R18.** İşaretin adı `_makinaDurumuKaynak`'tır ve dört noktada ele alınır: iki kayıt kolunun geçici alan ayıklaması (`Customers.jsx:310` ve `:363`, bugün yalnız dört geçici alanı düşürüyor) ile `deductMachineStock`'un iki çağrısı ve ikinci argümanı (`:328`, `:373`). Dördünden biri atlanırsa ya işaret kayda sızar (R12/2) ya da kapı kurulamaz.

---

## Constraints

### Uyulması zorunlu

- **C1.** Yeni kalıcı alan yok, göç yok. "Dokunuldu" işareti geçicidir ve kayıt yolunun temizlediği alanlarla aynı sınıftadır (R12).
- **C2.** Eşleme tek kaynaktan gelir (R2, R11); ikinci bir "montaj ise şu, hazır ise bu" karşılaştırması yazılmaz.
- **C2/2.** Bu güvence için **yeni tarama yazılmaz**: 0106 AC-28/AC-41 `src/components` altında durum dizesi literalini dört gerekçeli istisna dışında ve `makinaDurumu ===` karşılaştırmasını zaten yasaklıyor (`tests/musteri-durumu-0106.test.js:188-210`). Spec o testlere atıf yapar; ikinci bir tarama bakım borcu olur.
- **C3.** 0106 R3 korunur: stok dışı satışta alan hiç doğmaz, varsayılan yazılmaz.
- **C4.** Yeni eylem izni, veri bölümü, sunucu kuralı, birleştirme kuralı ve kilit alanı yok. **İzin eklenmediği açıkça yazılıdır.**
- **C5.** Yarış durumunda gerçek satır kazanır (R9). Ön doldurma bir öngörüdür, kaydın kaynağı değildir.
- **C6.** 0104 Karar 36'nın sırası korunur: damgalar kayıt yazılmadan önce uygulanır (`deductMachineStock`, `setCustomers`'tan önce).
- **C7.** Kanıtta hiçbir mevcut kaydın görünümü gereksiz yere `degisti` işaretlenmez. Ön doldurmanın pikselini değiştirebilecek **tek** mevcut ekran `musteri-formu-0104-stok`'tur (ölçüm 19); öteki yedi `musteri-formu*` kaydı `ayni` kalır. O ekranın farkı sıfır çıkarsa (alan pencerenin görünen bölgesinin altında kalabilir) kaydı da `ayni` kalır ve kanıt yalnız yeni ekranlardan gelir.
- **C7/2.** Yeni ekranların ilk kaydı `fark: "önce görüntüsü yok"` ile doğar ve `piksel` anahtarı taşımaz (`tests/kanit-eslemesi.test.js` ile `tests/tasarim-kaynak.test.js` bu şekli bekler).

### KAPSAM DIŞI

- **X1.** Kit ve kalıp çapı ön doldurmasının model değişiminde temizlenmemesi — *neden:* `specs/README.md`'de açık bulgu ve kendi spec'ini hak ediyor; bu spec yalnız yeni alanın o kusuru devralmaması için makina durumunu temizler (R7).
- **X2.** Makina durumu seçicisinin kalıp seçicisi gibi "Otomatik (…)" biçimine çevrilmesi — *neden:* 0106 R10'un gerekçesi geçerli, satışta stok satırı siliniyor ve türetecek canlı kaynak kalmıyor; "Otomatik" yalnız ekleme formunda anlamlı olur, düzenlemede ve detay penceresinde boş kalırdı.
- **X3.** Alanın salt okunur yapılması — *neden:* 0106 R4, makina teslim edilince durum değişir ve kullanıcı onu elle yazar.
- **X4.** Detay penceresinde ön doldurma — *neden:* orada stok seçicisi yok, bağlanacak satır da yok.
- **X5.** Satıştan sonra durumun stok satırıyla canlı bağlı kalması — *neden:* satışta satır siliniyor (0106 Karar 13); damgalama bu yüzden var.
- **X6.** Stok seçicisinin satır metninin değişmesi — *neden:* durum zaten orada yazıyor (0100 R6); ön doldurma onu tekrar etmez.
- **X7.** Seri numarası bekleyen kaydın düzenlenmesinde stok bağı zaten kurulmuş (`sourceStockId`'li) kayıt — *neden:* o kipte stok seçicisi hiç çizilmiyor (0104 R16), ön doldurulacak satır yok.
- **X8.** Form taslağının (`useFormDraft`) işareti saklaması — *neden:* taslak bütün formu saklıyor ve `restoreDraft` `setForm(data)` yapıyor (`Customers.jsx:56`), yani değer ve işaret birlikte geri gelir ve tutarlı kalır; bilinen sınır olarak yazılır, kod gerekmez (ölçüm 24; 0107 X9 emsali).
- **X9.** Ön doldurulan değer ile elle seçilen değerin **ekranda** ayırt edilebilir olması — *neden:* 0106 Karar 42'nin asıl gerekçesi buydu ve bu iş o ayrımı kod tarafında işaretle çözüyor, kullanıcı tarafında ikisi aynı görünmeye devam ediyor (Karar 12). Durum stok satırının kendi seçenek metninde zaten yazıyor (0100 R6, X6) ve Intent kullanıcının okuyacağı şeyi azaltmak istiyor; üçüncü bir ibare onu tersine çevirirdi.

---

## Context

Müşteri ekleme formunda model seçildikten sonra stok seçicisi çiziliyor (`CustomerAddEditForm.jsx:227-256`; seçenekler `:251-255`) ve dört dalı var: serili satır (`:247-248`), serisiz satır (`:236-240`), boş seçenek (`:241-244`) ve "Manuel gir" (`:234-235`). "Manuel gir"den geri dönüş yolu da var (`:289` "Stoktan seçime dön"). Serili ve serisiz dallar bugün iki şeyi ön dolduruyor: makina kiti (`getKitAutoFill`, spec 0100 R6/3) ve kalıp çapı (`kalipCapiOnDoldur`, spec 0101 R13). Makina durumu ön doldurulmuyor.

Makina durumu alanı formun Garanti Bitiş ızgarasının altında, gider yetkisi bloğunun önünde çiziliyor (`:432-437`, 0106 R4/2) ve seçeneklerini `musteriDurumu.makinaSecenekleri()`'nden alıyor.

Değer kayıt anında yazılıyor: `Customers.deductMachineStock` (`:274-295`) düşülen satırı bulup `stoktanDamgala` ile parti, üretim tarihi ve makina durumu damgalarını birlikte uyguluyor (`:280`). Fonksiyon geçici form işaretlerini ikinci argümanla alıyor (`:274`) ve iki kayıt kolundan çağrılıyor (`:328` ekleme, `:373` seri bekleyen düzenleme); geçici alanlar o kolların destructuring satırlarında düşüyor (`:310`, `:363`). Makina durumu damgası `satisKaydi.makinaDurumuDamgala` (`:46-49`) ve bugünkü kuralı "kayıtta alan doluysa dokunma", yani formda elle seçilmiş değer öncelikli (0106 Karar 42).

Bilinen tuzaklar: yeni kalıcı alan olmadığı için dört nokta kuralı devreye girmez; `uretimDurumuOf`'un müşteri tarafında tek yerden çağrılması kaynak taramasıyla sabit (0106 R2/2, AC-35), bu yüzden ön doldurma yardımcısı da `satisKaydi.js`'ten gelmek zorunda. Damgalama sırası 0104 Karar 36 ile sabitlendi ve bir gerçek App testiyle korunuyor.

---

## Ölçümler

Hepsi 2026-10-25, kaynak okumasıyla.

1. **Ön doldurma altyapısı aynı satırda hazır.** Stok seçicisinin serili dalı `getKitAutoFill(stockEntry)` ve `kalipCapiOnDoldur(stockEntry)` yayıyor (`CustomerAddEditForm.jsx:247-248`), serisiz dalı aynısını motorun seçtiği satırla yapıyor (`:239-240`). Makina durumu bu iki ön doldurmanın yanında yok.
2. **Eşleme zaten yazılı ve tek yerde.** `satisKaydi.makinaDurumuDamgala` (`:46-49`) stok satırının görünen durumunu `stokDurumu.uretimDurumuOf` ile okuyor; alanı boş satır "hazir" veriyor. Yeni bir eşleme kurulmasına gerek yok.
3. **Bugünkü davranış bilinçli seçilmişti.** 0106 Karar 42: "ekleme formunda stok satırı seçilince makina durumu seçicisi önizleme göstermez ve Seçilmedi kalır, değer kayıttan sonra görünür"; gerekçesi "önizleme göstermek formda damgayla elle seçimi ayırt edilemez kılardı". Bu istek o gerekçeyi ortadan kaldırmıyor, çözümünü değiştiriyor: ayrım önizlemeyi gizlemekle değil "dokunuldu" işaretiyle yapılır (Karar 1).
4. **Tek test satırı bağlı.** `tests/ui/musteri-durumu-0106-app.test.jsx` AC-1 dört satışın her birinde seçicinin değerini topluyor ve `["", "", "", ""]` bekliyor. Aynı testin damga beklentileri (`makinaDurumu: "montaj"` / `"hazir"`) aynen geçerli kalır.
5. **Yarış ölçüldü ve ön doldurma bir öngörüdür.** Form serisiz dalda `serisizDusulecek(stockForModel, form.model)` ile satırı öngörüyor (`:239`), kayıt yolu `serisizDusulecek(stock, clean.model)` ile düşüyor (`Customers.jsx:288`). İkisi arasında başka bir kullanıcı o satırı satabilir; o zaman düşülen satır farklı olur ve durumu da farklı olabilir. Bugün damga gerçek satırdan geldiği için bu sorun yok; ön doldurma tek yazıcı yapılırsa sorun doğar (Karar 1).
6. **"Manuel gir" dalı kiti yarım temizliyor, çapı hiç temizlemiyor.** Tek satır (`:235`) `_kitTipler: []` yazıyor; `tipSecimleri` formda kalıyor ve kalıp çapına dokunulmuyor, yani kit de tam temizlenmiyor (emsal alınacak kadar temiz değil). Makina durumu eklenip temizlenmezse stoktan bir satır seçip sonra "Manuel gir"e dönen kullanıcının stok dışı satışı, satın almadığı bir makinanın durumuyla kaydedilir ve 0106 R3 kırılır.
7. **0106 AC-2 bu senaryoyu kapsamıyor.** Testi `v.stock = []` ile kuruluyor, yani stok seçicisi hiç çizilmiyor; "stok satırı seçildi, sonra Manuel gir'e dönüldü" yolu bugün hiçbir testte yok.
8. **Boş seçenek dalı 0101 ile sadeleşmiş.** `:241-244` yalnız `_stokSerisiz` ve `serialNo`'yu temizliyor; kit ve çap formda kalıyor (0101'in bilinen sınırı).
9. **Model değişimi iki şeyi sıfırlıyor, o da koşullu.** 0104 Karar 28 serisiz seçimi ve seri numarasını sıfırlıyor, kit ve çapı sıfırlamıyor (`specs/README.md` açık bulgusu); üstelik koşul `p._stokSerisiz &&` olduğu için (`:198`) serili bir satır seçilmişken model değişince seri numarası bile duruyor (ölçüm 18).
10. **Damgalayıcının tek çağrısı var.** `makinaDurumuDamgala` yalnız `Customers.deductMachineStock`'tan çağrılıyor (`:280`), o da yalnız formun kayıt yolundan. Yani form ile damga arasında üçüncü bir yazıcı yok.
11. **Seçenek listesi dört değerli** ve "Seçilmedi" boş değeri temsil ediyor; 0106 R1'e göre boş değer "bilinmiyor" demek ve hiçbir pil çizdirmiyor.
12. **Stok tarafının durum dağılımı bu oturumda ölçülemedi** (kullanıcı yedeği elde yok). Spec 0100'ün ölçümü 21 canlı stok satırının 10'unun montajda olduğunu söylüyordu; yani ön doldurmanın iki değeri de gerçek veride görülüyor.

### QA turu (2026-10-25)

13. **Kayıt yolunun iki dalı da düşülecek satırı bulamayabiliyor.** Serisiz dalda `serisizDusulecek(stock, clean.model)` null dönerse yalnız uyarı basılıyor ve `stoktanDamgala` hiç çağrılmıyor (`Customers.jsx:288-289`); serili dalda `stock.find(...)` bulamazsa hiçbir şey olmuyor, uyarı da yok (`:291-293`). Ön doldurulan değer form durumunda olduğu için `clean`'e giriyor ve kaydediliyor, yani yarış kaybedilince kayıt hiç düşülmemiş bir satırın durumuyla ve stok bağı olmadan yazılır. Bu C5'in ve R10'un yasakladığı şey ve AC-14'ün tersi (AC-14 başka bir satırın düşüldüğü hâli yazıyor, hiçbir satırın düşülmediği hâli yazmıyor).
14. **`form.makinaDurumu`'nun üç kaynağı var.** Düzenlemede `openEdit` kaydı forma bütün olarak kopyalıyor (`Customers.jsx:264-265`), yani alan kayıttan gelebiliyor; ikinci kaynak ön doldurma, üçüncüsü kullanıcının seçimi. Tek boolean birinciyle ikinciyi ayırt etmiyor: seri numarası bekleyen (`sourceStockId` taşımayan) kaydın düzenlemesinde kullanıcı dokunmazsa "dokunulmadı" olur ve kayıttaki değer ya düşürülür ya damgayla ezilir. İkisi de bugün olmayan bir gerilemedir, çünkü `makinaDurumuDamgala` dolu alana dokunmuyor (`satisKaydi.js:47`).
15. **"Seçilmedi" alanı siliyor, yani boşluk iki anlama geliyor.** Seçicinin yazıcısı `durumYaz` alanı her çağrıda silip yalnız geçerli değeri geri yazıyor (`musteriDurumu.js:43-47`), bu yüzden "kullanıcı bilerek Seçilmedi seçti" ile "form hiç dokunmadı" kayıt anında aynı görünüyor ve damga boş alana yazdığı için AC-13 işaret olmadan sağlanamıyor.
16. **Bağlı test iki, biri saf dosyada.** `tests/ui/musteri-durumu-0106-app.test.jsx:51` `onizleme` beklentisi (`["", "", "", ""]`) ve `tests/musteri-durumu-0106.test.js:42-44` ("R2: formda elle seçilmiş değer önceliklidir"). İkincisi damgalayıcının kuralını sabitliyor, yani kapı imzaya eklenirse o da ters çevrilir; kapı `deductMachineStock`'ta kurulursa dokunulmadan yeşil kalır. İşaretin dört noktası da yazılı değildi (`Customers.jsx:310`, `:363`, `:328`, `:373`) ve işaret kayda sızarsa hayalet fark sınıfına girer (`satisTevkifat.js:29-30`).
17. **Ön doldurma yardımcısının emsali belli.** `kalipCapiOnDoldur(stokSatiri)` "yazılacak alanlar nesnesi, yoksa boş nesne" döndürüyor (`utils.js:278-279`) ve form onu yayarak kullanıyor (`:240`, `:248`); `getKitAutoFill` de boş nesne döndürüyor (`:96-108`). Yeni yardımcının adı, imzası ve satır yokken dönüşü spec'te yazılı değildi.
18. **Model değişiminin sıfırlaması koşullu.** Model kartının `onClick`'i `...(p._stokSerisiz && p.model !== m.model ? { _stokSerisiz: false, serialNo: "" } : {})` (`CustomerAddEditForm.jsx:198`); serili bir satır seçilmişken model değişince seri numarası bile sıfırlanmıyor. Makina durumunun temizliği bu koşulun içine yazılırsa R7 yarım uygulanır.
19. **Ön doldurmanın pikselini değiştirebilecek tek mevcut ekran var.** `CustomerAddEditForm.jsx`'in kanıt kayıtlarındaki sekiz ekrandan yalnız `musteri-formu-0104-stok` stok satırı seçiyor (`secenek:Seri no'suz stoktan düş`, `scripts/evidence/0009-sayfa.jsx:1338-1339`) ve STOK_0104 ile ön doldurma "Hazır" verir (9502 satışa hazır ve en eski). `musteri-formu`, `-hata`, `-ilk-odeme`, `-0079`, `-0094-ilce`, `-0103-parti` düzenekleri `stock={[]}` ile kuruluyor; `musteri-formu-0105-model` yalnız model ızgarasını açıyor.
20. **AC-1'in istediği satır hiçbir fikstürde yok.** STOK_0104'ün montajdaki satırı serisiz (`:619`), STOK_0105'in serili satırı satışa hazır (`:628`); montajda **serili** bir stok satırı yok, yani yeni ekranların kendi fikstürü gerekiyor. Kanıt aracı bulunamayan adımı yalnız uyarıyla geçiyor (0089'da ölçülmüş borç), yani eksik düzenek sessizce yanlış ekran çeker.
21. **Seri bekleyen düzenlemede seçici her zaman çizilmiyor.** Koşul `isSerialPendingEdit && !stokBagliBekleyen` (`CustomerAddEditForm.jsx:222`, `:227`), yani stok bağı kurulmuş kayıtta seçici yok (X7). AC-5 bunu söylemediği için testi `sourceStockId`'li bir fikstürle yazılabilir ve kriter sessizce boş geçer.
22. **İki sözlüğün değer eşitliği testsiz.** `URETIM_DURUMU` (`stokDurumu.js:8`) ve `MAKINA_DURUMU` (`musteriDurumu.js:5`) ayrı modüllerde ayrı ayrı donuyor; R2'nin "yeni eşleme tanımlanmaz"ı `montaj` ve `hazir` değerlerinin birebir aynı olmasına dayanıyor ama bunu sabitleyen bir iddia yok. Biri değişirse damga tanınmayan bir durum yazar ve pil hiç çizilmez (`makinaDurumuOf` null döner, `musteriDurumu.js:40`).
23. **Dördüncü geçiş var.** "Stoktan seçime dön" düğmesi `_manualSerial: false, serialNo: ""` yazıyor (`CustomerAddEditForm.jsx:289`) ve yalnız `_manualSerial` ile dönülecek stok varken çiziliyor (`:288`). Spec üç hâl sayıyor, uygulayan dördüncüsünü görünce karar vermek zorunda kalır.
24. **Taslak işareti de saklıyor.** `useFormDraft(draftKey, modal ? form : null, setForm)` bütün formu saklıyor (`Customers.jsx:56`) ve `restoreDraft` `setForm(data)` yapıyor, yani değer ve işaret birlikte geri gelir; sonuç tutarlı ama yazılı değildi.
25. **Satır atıfları ölçüldü.** Düzeltilenler: stok seçicisi bloğu 227-256 (seçenekler 251-255), makina durumu bloğu 432-437, serili dal 247-248, serisiz dal 239-240, boş seçenek dalı 241-244, "Manuel gir" dalının tek satırı 235. Doğru çıkanlar: `serisizDusulecek` çağrısı `:239`, `satisKaydi.js:43-49` ve `:46-49`, `Customers.jsx:274-295` ve `:280`, `tests/ui/musteri-durumu-0106-app.test.jsx` AC-1'in `onizleme` beklentisi, `uretimDurumuOf` taramasının üç dosyalı beklentisi (`tests/musteri-durumu-0106.test.js:211-214`).

---

## Kararlar (Takım Yöneticisi, 2026-10-25)

Üç karar da onaylandı.

- **Karar 1. Çatışma "dokunuldu" işaretiyle çözülür** (R8, R9, R12): kullanıcı seçiciye dokunduysa değeri kaydedilir ("Seçilmedi" dahil, yani alan kayda hiç yazılmaz), dokunmadıysa kayıt anında gerçekten düşülen stok satırının durumu yazılır. Damgalayıcının bugünkü "alan boşsa yaz" kuralının korunması reddedildi: kullanıcının bilerek seçtiği "Seçilmedi"yi kayıt anında sessizce ezer, yani bu oturumda 0107 ve 0108 ile kapatılan "sessizce üzerine yazma" sınıfının yenisini açar. Damgalayıcının kaldırılıp formun tek yazıcı olması da reddedildi: ön doldurma bir öngörüdür (ölçüm 5, form `stockForModel`, kayıt canlı `stock` üzerinden aynı motoru çağırıyor) ve satır yarışında yanlış satırın durumunu kaydeder; ayrıca `uretimDurumuOf`'un tek çağrı kuralını (0106 R2/2) forma taşımaya zorlardı. İşaretin bedeli bir geçici form alanıdır ve formda zaten üç benzeri var (`_manualSerial`, `_stokSerisiz`, `_kartYeniTaban`).
- **Karar 2. Ön doldurma üç hâlde temizlenir** (R5, R6, R7): stok seçicisinin boş seçeneği, "Manuel gir" ve model değişimi. Yalnız "Manuel gir"de temizlenmesi reddedildi: o hâl 0106 R3 gereği zorunlu (ölçüm 6), ama makina durumu kitten ve kalıp çapından farklıdır, çünkü müşteri listesinde pil çizdiriyor ve "Teslim Bekleyenler" süzgecine giriyor; bayat bir değer yalnız formda kalmaz, listede yanlış bilgi gösterir. Üçünü birlikte temizlemek tutarlıdır ve her biri bir satırdır.
- **Karar 3. Kit ve kalıp çapının model değişiminde temizlenmemesi bu spec'te düzeltilmez** (X1). Üçünün birlikte düzeltilmesi reddedildi: kapsamı 0100'ün kit ve 0101'in çap kurallarına genişletir, kanıt turunu büyütür ve o açık bulgunun kendi kararları var (kit sıfırlanınca kullanıcının elle seçtiği parça tipleri de gider mi). Yeni alanın aynı kusuru devralmaması yeterlidir; `specs/README.md`'deki bulgu satırı bu spec'e atıfla güncellendi.

### Analistin spec'te verdiği kararlar

- **Karar 4.** Ön doldurma yardımcısı `satisKaydi.js`'ten dışa verilir (R11), forma `uretimDurumuOf` çağrısı taşınmaz. Gerekçe: 0106 R2/2'nin tek çağrı kuralı bir kaynak taramasıyla sabit ve o kuralın amacı stok tarafının "boş değer satışa hazırdır" yorumunun tek yerde kalması; `kalipCapiOnDoldur` emsali de aynı şekilde yardımcıyı kütüphanede tutuyor.
- **Karar 5.** Makina durumu seçicisi "Otomatik (…)" biçimine çevrilmez (X2). Gerekçe: 0106 R10'un gerekçesi geçerli, satışta stok satırı siliniyor ve türetecek canlı kaynak kalmıyor; "Otomatik" yalnız ekleme formunda anlamlı olur, düzenlemede ve detay penceresinde boş kalırdı.
- **Karar 6.** Ön doldurulan değer salt okunur yapılmaz (R4, X3). Makina teslim edilince durum değişir ve kullanıcı onu elle yazar (0106 R4).

### QA turunda verilen kararlar (2026-10-25)

Yirmi bir bulgunun tamamı onaylandı; altısı kararla kayda geçti.

- **Karar 7. Ön doldurulan değer kayıt anında düşürülür** (R9/2): düşülecek satır bulunamazsa alan kayda hiç yazılmaz. Ön doldurmayı olduğu gibi bırakmak reddedildi, çünkü alanın anlamı "bu makina satılırken şu durumdaydı" ve düşülmemiş bir satırın durumu o anlamı taşımıyor; üstelik yanlış değer formda kalmıyor, müşteri listesinde pil çizdiriyor ve "Teslim Bekleyenler" süzgecine giriyor. Düşürmek aynı zamanda C5'in "ön doldurma kaydın kaynağı değildir" cümlesini kodda da doğru kılıyor.
- **Karar 8. İşaret üç değerlidir** (R17): yok, `ondoldu`, `elle`. Tek boolean reddedildi, çünkü R8 ile R9'un ayrımı "kullanıcı mı yazdı" sorusu, Karar 7'nin çözümü ise "formu kim doldurdu" sorusu; bunlar iki ayrı soru ve tek bitle ikisi birden cevaplanmaya zorlanırsa seri numarası bekleyen kaydın düzenlemesinde kayıttaki değer silinir ya da ezilir (ölçüm 14). Üç değer bir alan maliyetiyle ikisini de kapatıyor ve C1'i bozmuyor.
- **Karar 9. Kapı `deductMachineStock` içinde kurulur, damgalayıcının imzası değişmez** (R10/2, R18): böylece ikinci bağlı test (`tests/musteri-durumu-0106.test.js:42-44`) dokunulmadan yeşil kalır ve başlıktaki "tek test satırı" sayısı doğru olur. Üçüncü parametreli imza da kabul edilebilir ama o zaman o test de ters çevrilir ve başlık güncellenir. İşaretin adı `_makinaDurumuKaynak` ve dört noktası spec'te yazılı, çünkü biri atlanırsa sonucu görünür bir hata değil, 403 sınıfı bir hata olur (R12/2).
- **Karar 10. Ön doldurma yardımcısı `kalipCapiOnDoldur` biçiminde yazılır** (R11/2): `makinaDurumuOnDoldur(stokSatiri)` → `{ makinaDurumu: … }` ya da `{}`, ve `makinaDurumuDamgala` da onu çağırır. Gerekçe: DoD'nin "aynı değeri üreten iki yer aynı yardımcıyı kullanıyor" maddesi ancak böyle ölçülebilir olur, ve yayma biçimi formun bugünkü iki satırını değiştirmeden çalışır.
- **Karar 11. Ön doldurma kullanıcının elle seçtiği değeri ezer** (R1/2): başka bir makina seçmek bilinçli bir eylem ve sonucu seçicide görünüyor. İşaretin `elle` kalması reddedildi, çünkü o zaman kayıt öngörülen değeri yazar ve yarışta yanlış satırın durumu kaydedilir (C5).
- **Karar 12. Ekranda ön doldurulan ile elle seçilen değer ayırt edilemez kalır** (X9): yeni ibare eklenmez. 0106 Karar 42'nin asıl gerekçesi bu ayrımdı ve bu iş onu yalnız kod tarafında çözüyor; durum stok satırının seçenek metninde zaten yazıyor (0100 R6, X6) ve Intent kullanıcının okuyacağı şeyi azaltmak istiyor, üçüncü bir ibare onu tersine çevirirdi. Kabul edilen sınır olarak yazıldı.

### Plan turunda verilen kararlar (2026-10-25, Takım Yöneticisi bütün önerileri onayladı)

- **Karar 13 (U1).** Ön doldurulan değer `deductMachineStock`'un başında, dallardan önce silinir; iki dalda da satır bulunamazsa alan yazılmaz. **Bilinen sınır:** `deductMachineStock` yalnız `setStock` verilmişse çağrılır; `setStock` vermeyen bir çağıranda ön doldurulmuş değer kayda girer (App ve bütün çizim yerleri `setStock` veriyor).
- **Karar 14 (U2).** `elle` kapısı yalnız makina durumu damgasını atlar (parti ve üretim tarihi damgaları aynen); damgalayıcının imzası değişmez.
- **Karar 15 (U3).** Model temizliği `p.model !== m.model` şartıyla, serisiz koşulun dışında; serili satırda seri numarasının durması (X1 yanındaki bulgu) değişmez.
- **Karar 16 (U4). Kanıt 0107/0108'in yolu:** `tasarim-kaynak` `ayni` kayıtta `piksel: 0` istediği için C7/2'nin "önce görüntüsü yok" kaydı bu depoda geçmez (0107'de ölçüldü). Yeni ekranlar araca önce eklenir, iş raporu eski ↔ yeni çekilir, taban son kodla çekilir ve kayıtlar açıkça `beklenen: "ayni"` ile tabana bağlanır. `musteri-formu-0104-stok` değişirse `degisti` yapılmaz, son kodla çekilmiş tabana yeniden bağlanır; değişim iş raporunda görünür. AC-33 bu yolla sağlanır.
- **Karar 17 (U5).** AC-16 gerçek App'te `window.crmStorage.save` yüküyle ölçülür (ekleme ve seri bekleyen düzenleme); ayıklamalardan biri silinince testin kırıldığı mutasyonla gösterilir.
- **Karar 18 (U6).** Yarış testleri `Customers` düzeneğinde form açıkken stok dizisi değiştirilip yeniden çizilerek yazılır.
- **Karar 19 (U7).** Düzenleme kolunun `setCustomers`'ı `deductMachineStock`'tan önce çağırması değişmez (kayıt `clean`'in kendisidir, sonraki silme ve damga görünür); AC-28 gerçek App'te ölçülür.
- **Karar 20 (U8–U11).** 0106 AC-1'in `onizleme` beklentisi ön doldurulmuş değerlere çevrilir, damga beklentileri aynen (AC-34). İşaretin değerleri `satisKaydi.MAKINA_DURUMU_KAYNAK`'ta sabittir; form ve kayıt yolu oradan okur. Ardışık seçim ve "önce elle sonra satır" yeniden ön doldurur. AC-5/AC-27 düzeneği `seriNoBekliyor: true`, `serialNo: ""`, `sourceStockId` yok.

### Triyaj kararları (2026-10-25, Takım Yöneticisi önerileri onayladı)

- **Karar 21. R5/R6/R7'nin temizliği yalnız değer bir stok satırından geldiyse çalışır** (işaret `ondoldu`). Gerekçeleri "önceki stok satırı artık geçerli değil"di; bu ancak değer o satırdan gelmişse doğrudur. Şartsız temizlik üç gerileme üretiyordu: satılmış makinanın düzenlenmesinde model düzeltilince kayıttaki değer siliniyordu (P1), stoğa bağlı seri bekleyen kayıtta model değişince satışta damgalanmış değer siliniyordu (P2), stoğa bağsız seri bekleyen kayıtta doğrudan "Manuel gir" R9/3'e aykırı olarak kayıttaki değeri siliyordu (P4). Kayıttan gelen ve elle seçilen değer artık bu üç yolda korunur; AC-7, AC-8, AC-10, AC-31 (stok satırı seçildikten sonra temizlik) aynen geçerlidir. R6'nın "stok dışı satışta alan boş doğar" yarısı değişmez: ekleme formunda değer ya stok satırından (temizlenir) ya kullanıcıdan gelir.

---

## Acceptance Criteria

### Ön doldurma

- **AC-1.** Ekleme formunda stok seçicisinden üretim durumu "montajda" olan serili bir satır seçilince makina durumu seçicisi "Montajda" gösterir.
- **AC-2.** Üretim durumu "satışa hazır" olan serili satır seçilince seçici "Hazır" gösterir.
- **AC-3.** Üretim durumu alanı **boş** olan serili satır seçilince seçici "Hazır" gösterir.
- **AC-4.** Serisiz seçenek seçilince seçici, motorun düşeceğini öngördüğü satırın durumunu gösterir: iki serisiz satırlı (biri montajda ve daha eski, biri satışa hazır) bir düzenekte beklenen değer **"Hazır"**, çünkü motor önce satışa hazır olanların en eskisini seçiyor.
- **AC-5.** Seri numarası bekleyen ve **stok bağı kurulmamış** (`sourceStockId` taşımayan) kaydın düzenlenmesinde ön doldurma aynı çalışır. Düzenek bu şartı taşımak zorundadır, çünkü stok bağı kurulmuş kayıtta seçici hiç çizilmiyor (X7, ölçüm 21).
- **AC-6.** Bir satır seçildikten sonra başka bir satır seçilince seçici yeni satırın durumunu gösterir.

### Temizlenme

- **AC-7.** Stok seçicisinin boş seçeneği seçilince makina durumu "Seçilmedi"ye döner.
- **AC-8.** "Manuel gir" seçilince makina durumu "Seçilmedi"ye döner.
- **AC-9.** Stoktan bir satır seçip sonra "Manuel gir"e dönen kullanıcının kaydında makina durumu alanı **hiç yazılmaz** (0106 R3).
- **AC-10.** Model değiştirilince makina durumu "Seçilmedi"ye döner.

### Yazma anı

- **AC-11.** Seçiciye dokunulmadan kaydedilen stoktan satışta kayda gerçekten düşülen satırın durumu yazılır.
- **AC-12.** Ön doldurulan değer elle başka bir değere çevrilip kaydedilince kayda kullanıcının değeri yazılır.
- **AC-13.** Ön doldurulan değer elle "Seçilmedi"ye çevrilip kaydedilince kayda alan **hiç yazılmaz**.
- **AC-14.** Serisiz satışta ön doldurulan satır kayıt anında bulunamaz ve başka bir satır düşülürse kayda düşülen satırın durumu yazılır.
- **AC-15.** Stok dışı (manuel seri) satışta kayda alan hiç yazılmaz.
- **AC-16.** Kayda "dokunuldu" işareti yazılmaz; ölçüm kaynak taraması değil gerçek App'in kaydettiği gövdedir (`window.crmStorage.save` yükü) ve iki yolu da kapsar: ekleme ve seri numarası bekleyen kaydın düzenlenmesi (R12/2).
- **AC-17.** Kaynak taraması: `uretimDurumuOf` müşteri tarafında yalnız `satisKaydi.js`'te çağrılır; form ön doldurmayı o dosyadan dışa verilen yardımcıyla yapar.

### Değişmeyenler

- **AC-18.** Makina durumu seçicisinin seçenek listesi ve etiketi değişmez.
- **AC-19.** Detay penceresinin makina durumu seçicisi ön doldurma yapmaz ve bugünkü gibi davranır.
- **AC-20.** Kalıp durumu seçicisinin "Otomatik (…)" davranışı değişmez.
- **AC-21.** Kit ve kalıp çapı ön doldurması bugünkü gibi çalışır (model değişiminde temizlenmez).
- **AC-22.** Damgalama sırası korunur: damgalar kayıt yazılmadan önce uygulanır (0104 Karar 36).
- **AC-23.** Müşteri listesinin durum pilleri ve "Teslim Bekleyenler" süzgeci bu işten etkilenmez.
- **AC-24.** Kaynak taraması: bu iş yeni kalıcı alan, yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı eklemez.

### QA turu kriterleri (2026-10-25)

- **AC-25.** Serisiz satışta kayıt anında düşülecek satır hiç bulunamazsa (uyarı basılır) kayda makina durumu alanı **hiç yazılmaz**.
- **AC-26.** Serili satışta seçilen seri kayıt anında stokta bulunamazsa kayda makina durumu alanı **hiç yazılmaz**.
- **AC-27.** Seri numarası bekleyen kaydın düzenlenmesinde kullanıcı seçiciye dokunmaz ve stok satırı da seçmezse kayıttaki makina durumu değeri aynen korunur.
- **AC-28.** Aynı düzenlemede stok satırı seçilirse kayıttaki değer düşer ve kayda **gerçekten düşülen** satırın durumu yazılır.
- **AC-29.** Kapı `deductMachineStock` içindedir: `makinaDurumuDamgala`'nın imzası ve "dolu alana dokunmaz" davranışı değişmez, bu yüzden `tests/musteri-durumu-0106.test.js:42-44` dokunulmadan yeşil kalır.
- **AC-30.** Ön doldurma yardımcısı stok satırı yokken boş nesne döndürür ve `makinaDurumuDamgala` da aynı yardımcıyı çağırır.
- **AC-31.** Serili bir stok satırı seçiliyken model değiştirilince makina durumu "Seçilmedi"ye döner (temizlik serisiz seçime bağlı değildir).
- **AC-32.** Kullanıcı elle bir değer seçtikten sonra stok satırı seçilirse seçici ön doldurulan değeri gösterir ve kayda **düşülen satırın** durumu yazılır.
- **AC-33.** Kanıt kayıtları: üç yeni ekran `fark: "önce görüntüsü yok"` ile doğar ve `piksel` anahtarı taşımaz; mevcut `musteri-formu*` kayıtlarından yalnız `musteri-formu-0104-stok` `degisti` olabilir, farkı sıfırsa o da `ayni` kalır; öteki yedi kayıt `ayni` kalır.
- **AC-34.** Stoktan satışta kaydedilen `makinaDurumu` değeri bu işten önceki ile aynıdır; tek sapma R8'in "Seçilmedi" hâlidir.
- **AC-35.** `stokDurumu.URETIM_DURUMU` ile `musteriDurumu.MAKINA_DURUMU`'nun `montaj` ve `hazir` değerleri birebir eşittir (R2/2'nin dayanağı).

---

## Görsel kanıt

| Kriter | Ekran | Ne gösterir |
|---|---|---|
| AC-1 | `musteri-formu-0109-montaj` (yeni müşteri formu, montajdaki **serili** satır seçili) | Seçici "Montajda" gösteriyor |
| AC-2 | `musteri-formu-0109-hazir` (aynı form, satışa hazır serili satır seçili) | Seçici "Hazır" gösteriyor |
| AC-8 | `musteri-formu-0109-manuel` (aynı form, "Manuel gir" seçili) | Seçici "Seçilmedi"ye dönmüş |

Üç ekranın kendi stok fikstürü gerekir: bugünkü fikstürlerde montajda **serili** satır yok (STOK_0104'ün montajdaki satırı serisiz, STOK_0105'in serili satırı satışa hazır; ölçüm 20). Fikstür en az iki satır taşır, biri montajda ve serili, biri satışa hazır ve serili; adımlar "Yeni Müşteri", model seçimi, `secenek:` ile satırın seçilmesi ve `kaydir:` ile makina durumu alanına inilmesidir.

Kanıt kayıtları `docs/evidence/kanit-eslemesi.json`'a eklenir. Üç yeni kaydın ilk hâli `fark: "önce görüntüsü yok"`tur ve `piksel` anahtarı taşımaz (C7/2). Mevcut `CustomerAddEditForm.jsx` kayıtlarından yalnız `musteri-formu-0104-stok` görünümünü değiştirebilir (ölçüm 19); farkı sıfırdan büyükse kaydı `beklenen: "degisti"` + Takım Yöneticisi onayıyla işaretlenir ve spec `done`'a taşınırken `ayni`ye çevrilir, sıfırsa `ayni` kalır. Öteki yedi kayıt (`musteri-formu`, `-hata`, `-ilk-odeme`, `-0079`, `-0094-ilce`, `-0103-parti`, `-0105-model`) `ayni` kalır (C7).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Eşleme tek kaynaktan okunuyor; `uretimDurumuOf`'un tek çağrı kuralı korunuyor ve AC-17 ile gösterildi.
- [x] Aynı değeri üreten iki yer (formun ön doldurması ve kayıt anındaki damga) aynı yardımcıyı kullanıyor.
- [x] Yeni kalıcı alan yok; dört nokta kuralı devreye girmiyor ve bu AC-24 ile gösterildi.
- [x] Yeni veri bölümü yok; `BLOB_SECTIONS` / `MERGE_KEYS` dokunulmadı.
- [x] **Yeni eylem izni eklenmedi** (C4); sunucu tarafı değişmedi ve bu kaynak taramasıyla gösterildi.
- [x] Soft-delete ve çöp kutusu simetrisi etkilenmiyor (bu iş kayıt silmiyor).
- [x] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı yok, çeviri anahtarı eklenmedi.
- [x] Para gösterilmiyor; çoklu para kuralı devreye girmiyor.
- [x] Arayüz kriterlerinin görsel kanıtı eklendi (ön doldurulmuş ve temizlenmiş hâl dâhil).
- [x] 0106'nın ters çevrilen tek test satırı güncellendi ve yorumunda "spec 0109 ile" yazıyor; aynı testin damga beklentileri dokunulmadan yeşil.
- [x] İşaretin üç değeri ve kayıt anındaki kuralı R17'nin tablosuyla uygulandı; `deductMachineStock`'un kapısı tek yerde.
- [x] İşaret dört noktanın hepsinde ele alındı (`Customers.jsx:310`, `:363`, `:328`, `:373`) ve kaydedilen gövdede yok; bu AC-16 ile gerçek App'te ölçüldü.
- [x] Düşülecek satır bulunamadığında alanın hiç yazılmadığı iki dalda da gösterildi (AC-25, AC-26).
- [x] `tests/musteri-durumu-0106.test.js:42-44` dokunulmadan yeşil; dokunulduysa başlıktaki bağlı test sayısı güncellendi (AC-29).
- [x] İki durum sözlüğünün değer eşitliği saf testte sabitlendi (AC-35).
- [x] Yeni kanıt ekranlarının kaydı `fark: "önce görüntüsü yok"` ile doğdu; mevcut kayıtlardan yalnız gerçekten değişen `degisti` oldu (AC-33).
- [x] Stoktan satışta kaydedilen değerin değişmediği gösterildi (AC-34).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'nin 0106 bölümü güncellendi: damga artık "alan boşsa" değil "kullanıcı dokunmadıysa" yazıyor ve form stoktan ön dolduruyor.
- [x] `specs/README.md`'nin model değişimi açık bulgusu bu spec'e atıfla güncellendi (makina durumu temizleniyor, kit ve çap duruyor).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu, 2026-10-25)

Yirmi bir bulgu, hepsi onaylandı.

| # | Derece | Bulgu | Karşılığı |
|---|---|---|---|
| B-1 | Bloklayıcı | "Dokunulmadı ve düşülecek satır bulunamadı" hâli tanımsız; ön doldurma kaydın kaynağı oluyor | R9/2, Karar 7, AC-25, AC-26, ölçüm 13 |
| B-2 | Bloklayıcı | Tek boolean üç kaynağı ayırt edemiyor; seri bekleyen düzenlemede kayıttaki değer kayboluyor | R8/2, R9/3, R17, Karar 8, AC-27, AC-28, ölçüm 14, ölçüm 15 |
| B-3 | Bloklayıcı | İşaretin yazıcıya nasıl ulaştığı, nerede düşürüldüğü ve kaç testi bağladığı yazılı değil | R10/2, R12/2, R18, başlık, Karar 9, AC-29, ölçüm 16 |
| Ö-1 | Önemli | Ön doldurma yardımcısının adı, imzası ve dönüş şekli tanımsız | R11/2, Karar 10, AC-30, ölçüm 17 |
| Ö-2 | Önemli | R7'nin temizliği bugünkü koşullu sıfırlamanın içine yazılırsa yalnız serisiz seçimde çalışır | R7/2, AC-31, ölçüm 9, ölçüm 18 |
| Ö-3 | Önemli | "Önce elle seç, sonra stok satırı seç" sırası tanımsız | R1/2, Karar 11, AC-32 |
| Ö-4 | Önemli | Hangi mevcut kanıt ekranının `degisti` olacağı ölçülmedi | C7, AC-33, Görsel kanıt, ölçüm 19 |
| Ö-5 | Önemli | Üç yeni ekranın adı ve düzeneği yazılı değil, biri bugünkü fikstürlerle çekilemiyor | C7/2, Görsel kanıt, ölçüm 20 |
| Ö-6 | Önemli | AC-5'in düzeneği imkânsız yazılabilir | AC-5, ölçüm 21 |
| Ö-7 | Önemli | AC-16 kaynak taramasıyla değil kaydedilen gövdeyle ölçülmeli | AC-16, R12/2 |
| Ö-8 | Önemli | Ekleme yolunun kaydettiği kaydın değişmeyeceği yazılı değil | R16/2, AC-34 |
| K-1 | Küçük | İki donmuş sözlüğün değer eşitliği hiçbir testte sabit değil | R2/2, AC-35, ölçüm 22 |
| K-2 | Küçük | "Stoktan seçime dön" düğmesi dördüncü geçiş | R6/2, ölçüm 23 |
| K-3 | Küçük | Form taslağı işareti de saklıyor | X8, ölçüm 24 |
| K-4 | Küçük | Satır atıfları kayık | Başlık, Context, ölçüm 1, 8, 9, 25 |
| K-5 | Küçük | Ölçüm 6 "kiti temizliyor" diyor, yarısını temizliyor | ölçüm 6 |
| K-6 | Küçük | Kullanıcı için ön doldurulan ile elle seçilen değer ayırt edilemez kalıyor | X9, Karar 12 |
| K-7 | Küçük | C2 yeni tarama istemiyor, 0106'nın taraması zaten yasaklıyor | C2/2 |
| K-8 | Küçük | AC-4 ölçülebilir bir değer yazmıyor | AC-4 |
| K-9 | Küçük | "Etkilenen alanlar" satırı işaretin dört noktasını saymıyor | Başlık, Context |
| K-10 | Küçük | DoD'de yeni kanıt kayıtlarının doğuş kuralı yok | C7/2, DoD |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `802744f` | Dal `feat/0109-makina-durumu-ondoldur`, taban `6140673`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | Revizyon 1 QA turu (21 bulgu), revizyon 2 plan turu (Karar 13–20); triyajda Karar 21 |
| **Düzeltme turu sayısı** | 1 | Triyaj: üç bulgu (1 orta-yüksek, 2 düşük): şartsız temizlik kayıttan gelen değeri üç yolda siliyordu (Karar 21); `CLAUDE.md` 0106 bölümü kendisiyle çelişiyordu; kapanış belge adımları |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 414 dosya, 5539 test (Electron dahil); lint 0 hata; tip denetimi temiz |
| **Kaçan hata** | 1 | Triyaj bulgu 1: spec'in R5–R7 metni temizliği değerin kaynağına bağlamıyordu, uygulama da bağlamadı; AC-5 testi yolu koşuyor ama iddiayı başka teste bırakıyordu. Triyaj yakaladı |

**Görsel kanıt:** 16 ekran × 2 tema; iş raporunda yalnız `musteri-formu-0104-stok` ve iki ön doldurma ekranı değişti, "Manuel gir" ekranı ve öteki müşteri ekranları 0 fark; taban son kodla 32 görüntü 0 fark.

**Bu spec'ten çıkarılan ders:** Bir alanı temizleyen kural, alanın değerinin nereden geldiğine bağlanmalı; üç kaynaklı bir alanda (kayıt, ön doldurma, kullanıcı) "önceki stok satırı geçersiz" gerekçesi yalnız ön doldurulmuş değeri kapsar. Bir test bir yolu koşuyorsa o yolun iddiasını da taşımalı; "ayrı testte" diye atlanan iddia kaçar.
