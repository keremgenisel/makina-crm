# 0054 — Ek Ödeme Maaştan Ayrı Bir Ödeme Hedefi Olsun

| | |
|---|---|
| **Durum** | Tamamlandı (commit `6cdc177`, dal `feat/0054-ek-odeme-hedefi`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Personel gider kaleminin ödeme hedefleri, gider formu ve ödeme penceresi, borç özeti, ödeme hatırlatıcısı, çalışan ekstresi |
| **Bağımlı spec'ler** | 0021 (ödeme hedefleri) · 0023 (ek ödemeler) · 0042 (personelin iki hedefi) · 0046, 0048, 0053 (form ödemesi) · 0047 (aylık rapor) · 0051 (hedef etiketi ve `hareketHedefPaylari`) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 15 bulgu işlendi, 5'i bloklayıcıydı. Hedef kimlikleri ve **sıra** tanımlandı (R14; sıra R9'un doğruluk kaynağı), "okuma anında görünür" iddiası satırsız ve satırlı diye ikiye bölündü (R9), satırlı doğma kapısı hedef sayısına çevrildi (R15), bölünmezlik korumasının asıl durumu yazıldı (R10), `hedefAdi` imzası ve ad çözümü düzeltildi (R16). E bölümü (R14–R20) ve AC-22…AC-34 eklendi.<br>**R2 (2026-10-01, plan onayı):** R10'un koruma koşulu taraf başına ve ölçülebilir hâle getirildi: o taraftaki ödeme almış satırların tutarı yeni maaş hedefini aşıyorsa ayrılmaz (Q1, R21); bölünmez tarafta ek ödeme maaş hedefinin içinde kalır, tutarlar `personelHedefKirilimi`'nin ayırma yapısından (Q2); "Elden vadesi" alanının kapısı elden maaşına bağlandı, `personelIkiHedef` motorda değişmedi (Q3); ek ödeme hedeflerinde çek yok (Q4, R22); ad değişikliği bütün çok hedefli personel kalemlerine uygulanır, mevcut testler güncellenir (Q5). F bölümü (R21–R22) eklendi. |

---

## Intent

Bugünkü akış kullanıcıyı yoruyor. Ayın maaşı ödenmiş durumda; sonradan prim ya da fazla mesai çıkıyor.
Kullanıcı o personel kalemini düzenlemeye açıyor, ek ödemeyi ekliyor, kaydediyor. Ek ödeme **daha önce
ödenmiş** resmi ya da elden tutarın üstüne biniyor: o hedef bir anda "kısmen ödenmiş" oluyor ve kullanıcı
ödeme ekranına gidip kalanı bulup ödemek zorunda kalıyor. Oysa yapmak istediği tek şey var: **yeni çıkan
primi ödemek.**

Sebep kuralda: 0023 C8 ek ödemeyi maaşla **aynı borç** saydı, 0042 de personeli yalnız resmi ve elden
diye ikiye ayırdı. İkisi birlikte, sonradan eklenen bir ek ödemenin kapanmış bir borcu yeniden açmasına
yol açıyor.

Başarı şu demek: ek ödeme kendi ödeme satırı olarak görünüyor, maaş hedefleri ödenmiş kalıyor ve
kullanıcı ek ödemeyi tek başına, formdan ya da ödeme penceresinden ödeyebiliyor.

---

## Requirements

- **R1.** Personel kaleminde **ek ödemeler maaştan ayrı bir ödeme hedefidir** ve resmi ile elden ayrımını
  korur. Hedefler: **maaş (resmi)**, **maaş (elden)**, **ek ödeme (resmi)**, **ek ödeme (elden)**.
- **R2.** Tutarı sıfır olan hedef çizilmez; bir kalemde en çok dört, en az bir hedef olur.
- **R3.** Ek ödeme hedefi **tek başına ödenebilir**: gider formunun ödeme bölümünden ve ödeme
  penceresinden, maaş hedeflerine hiç dokunmadan. **İki yolun koşulu farklıdır:** formda hedef, doğduğu
  **aynı yazımda** ödenebilir (0053 R24 bu kısıtı kaldırdı: kalem ile ödeme tek yazımda gider);
  **pencereden** ödenmesi için kalemin önce kaydedilmiş olması gerekir, çünkü pencere kayıtlı kalemi öder
  (0048'in kuralı orada sürüyor).
- **R4.** Maaşı ödenmiş bir kaleme ek ödeme eklendiğinde **maaş hedefleri "Ödendi" kalır**; yalnız yeni
  ek ödeme hedefi "Ödenmedi" olarak doğar. Bugünkü "kapanmış borç yeniden açılıyor" davranışı biter.
- **R5.** Ek ödeme hedefinin **vadesi kalemin vadesidir**; ayrı vade alanı açılmaz.
- **R6.** Ek ödeme hedefi **taksitlenmez**, tek satırdır (elden hedefinin bugünkü deseni). Resmi maaş
  hedefi taksitli olsa bile ek ödeme hedefi tek satır kalır ve `planYenidenBol` yalnız maaş satırlarını
  yeniden böler. 0053'ün "taksitli hedef formda pasif" kuralı ek ödeme hedefini etkilemez: tek satırlı
  olduğu için formdan ödenebilir.
- **R7.** Aynı ay içinde birden çok ek ödeme (prim ve fazla mesai birlikte) girilirse bunlar **tek** ek
  ödeme hedefinde toplanır; ayrı ayrı ödenmek isteniyorsa 0053'ün çok satırlı ödemesi kullanılır (iki
  satır, kendi tutarı, yöntemi ve hesabıyla).
- **R8.** Hedef adları birden çok hedef varken ayırt edicidir: "Maaş (resmi)", "Maaş (elden)",
  "Ek ödeme (resmi)", "Ek ödeme (elden)". Tek hedefli personel kaleminde bugünkü **"Çalışana"** korunur;
  bu, yalnız ek ödemesi olan kalem (maaşı sıfır, yalnız ikramiyeli ay; 0023 bunu kaydediyor) için de
  geçerlidir, çünkü tek hedefte ayırt etmeye gerek yoktur. Ad çözümünün tek kaynağı R16'dadır.
- **R9.** **Göç yoktur**, ama dönüşüm iki dallıdır:
  - **Satırsız** personel kalemi **okuma anında** dört hedefle görünür (0042'nin `satirsizHedefler`
    deseni); ödenmiş tutar hedef sırasıyla (R14) dağılır ve toplam değişmediği için durum bozulmaz.
  - **Satırlı** kalem (0042'den beri yeni personel kayıtlarının normali) hedeflerini `k.taksitler`
    satırlarından okur ve eski satırlar yalnız `ana`/`elden` taşır; bu kalem **ilk kaydedildiğinde**
    `odemeSatirlariKur` ile dört satıra geçer (0042'nin `eskiHedef` yolu). Intent'in senaryosu zaten bir
    kayıttır (kullanıcı ek ödemeyi ekleyip kaydeder), yani akış bozulmaz.

  AC-13 ile AC-14 bu iki dalı ayrı ayrı ölçer.
- **R10.** **Ayrılamayan kalem korunur:** satır (taksit) tutan bir kalemde **bir hedefin satırı ödeme
  almışsa ve o hedefin ek ödeme bileşeni varsa**, o hedef ayrılmaz; bütün kalır ve nedeni tek sabitten
  yazılır (`PERSONEL_BOLUNMEZ_NEDENI` deseni). Somut risk şudur: ana satırı **39.500** (maaş 30.000 + eski
  prim 9.500) olan ve tamamen ödenmiş bir kalem bölünürse ana satır 30.000'e düşer, ödenen yeni toplamı
  aşar ve `planYenidenBol` hata verir. Bu kalemlerde Intent'in sorunu sürer; **kabul edilen sınırdır** ve
  kullanıcı ödemeyi silip yeniden girerek bölmeyi sağlayabilir. Bugünkü `personelBolunmezMi`
  (`gider.js:272`) yalnız "elden satırı yok + ana satırı ödeme almış" durumunu koruyor, yani koruma
  genişletilir.
- **R11.** Borç özeti, ödeme hatırlatıcısı ve çalışan ekstresi yeni hedefleri okur. Hatırlatıcı personeli
  **kalem başına birleştirmeye devam eder** ve sayılar kalem sayar (0042 kuralı korunur).
- **R12.** **Gizlilik değişmez:** yeni hedef adları ve tutarları hiçbir yazdırma ve dışa aktarma
  çıktısına girmez.
- **R13.** Kalemin toplam tutarı, KDV'si, kova dağılımı ve makina maliyeti **değişmez**; bu iş yalnız
  ödeme tarafını böler.

### QA turunda eklenenler (R1)

- **R14.** **Hedef kimlikleri ve sıra.** `HEDEF`'e iki değer eklenir: **`EK_RESMI = "ekResmi"`** ve
  **`EK_ELDEN = "ekElden"`** (bugün `gider.js:142` `{ANA, ELDEN, STOPAJ}`). `HEDEF_SIRASI`
  **maaş resmi → maaş elden → ek resmi → ek elden → stopaj** olur. **Sıra R9'un doğruluk kaynağıdır:**
  satırsız kalemde `odemeleriUygula` ödemeyi tam olarak bu sırayla doldurur, yani maaş önce kapanır ve
  sonradan çıkan ek ödeme en sona düşer; Intent'in senaryosu ancak bu sırada doğru çalışır.
  **Bilinen sınır:** satırsız kalemde dağıtım sıraya baktığı için yalnız eldeni ödenmiş eski bir kalemde
  ödeme yine resmiye yazılır (0042'den beri var olan sınır; hedef sayısı arttıkça büyür).
- **R15.** **Satırlı doğmanın kapısı hedef sayısıdır.** Bugün `gider.js:117`
  `personelIkiHedef(k, dav) = resmiK > 0 && eldenK > 0` ve `odemeSatirlariKur` bu kapıya bakıyor; yeni
  modelde yalnız resmi maaşı ve resmi primi olan kalem de iki hedeflidir ama bu kapı onu satırsız bırakır
  ve ödeme hedefe bağlanamaz (0042'nin "iki hedef ⇒ satırlı" gerekçesi). Yeni kapı
  **`personelCokHedef(k, dav)`** = sıfırdan büyük hedef sayısı ≥ 2 olur ve `odemeSatirlariKur` onu kullanır.
  `personelIkiHedef` anlamı değişmeden kalır, çünkü 0042'nin "elden vadesi" dalı ona bakıyor.
- **R16.** **Ad çözümü hedef kimliğinden gelir.** `GiderAlanlari.jsx:187`
  `hedefAdi(hedef, davranis, ikiHedef = false)` üçüncü parametresi `cokHedef` olarak kalır ve adlar hedefe
  göre çözülür (ANA → "Maaş (resmi)", ELDEN → "Maaş (elden)", EK_RESMI → "Ek ödeme (resmi)", EK_ELDEN →
  "Ek ödeme (elden)"; `cokHedef` false → "Çalışana"). Bütün çağıranlar (`hedefEtiketi`, çalışan ekstresi,
  ödeme penceresi, 0051) **`cokHedefliMi(kalem, davranis)`** kullanmaya geçer; bugünkü
  `eldenHedefliMi(kalem.taksitler) || personelIkiHedef(kalem, davranis)` birleşimi kaldırılır, çünkü dört
  hedefte eksik kalır (ek ödemesi olan ama eldeni olmayan kalem).
- **R17.** **Yeni hedeflerin vadesi `plan.ilkVade`'dir** (R5) ve `odemeSatirlariKur`'un `vadeOf(h)` dalına
  açıkça eklenir (bugün üç dallı: STOPAJ → `stopajVade`, ELDEN → `eldenVade || ilkVade`, diğer →
  `ilkVade`). Böylece X2'nin "ayrı vade alanı açılmaz" kuralı kodda da görünür.
- **R18.** **Hedef tutarı `personelHedefKirilimi`'nden okunur** (C2'nin kaynağı): ANA → maaşın resmi
  kısmı, ELDEN → maaşın elden kısmı, EK_RESMI → ek ödemenin resmi kısmı, EK_ELDEN → ek ödemenin elden
  kısmı. Dördün toplamı `personelHedefKurus`'un toplamına eşit kalır (C1, AC-4). Bugünkü
  `hedefToplamKurus(..., { bol })` iki hedefe göre yazılmış (`hedef === ELDEN ? eldenK : resmiK`), yani
  genişletilir.
- **R19.** **Gizlilik testine eklenecekler:** `gider-gizlilik.test.js` yasaklı ad listesine `"ekResmi"`,
  `"ekElden"`, `"Ek ödeme (resmi)"`, `"Ek ödeme (elden)"` ve `personelHedefKirilimi` girer; 0042'nin
  `"elden"`, `hedefAdi`, `personelHedefKurus` kayıtları aynen kalır.
- **R20.** **Tüketicilerin okunurluğu:** borç özetinde çalışanın altındaki kırılım dört satır olur (yalnız
  ayrıntı açıkken, 0001 K21) ve kalem tekil kalır; çalışan ekstresinde ödeme satırı hedefini `hedefAdi` ile
  yazar (0051 deseni), devreden bakiye hesabı değişmez; yeni bir toplama eklenmez. 0051'in Kasa hareket
  etiketi ve 0047'nin raporu yeni hedefleri kendiliğinden doğru gösterir (ad R16'nın tek kaynağından) ve
  0047'nin personel gizliliği değişmez, çünkü rapor hedef adı basmaz, "Personel gideri" tek satır yazar.

### F. Plan onayında eklenenler (R2)

- **R21.** **R10'un koşulu (Q1).** R10'un harfiyen okuması ("o hedefin satırı ödeme almış ve ek ödeme bileşeni
  var") Intent'in senaryosunu satırlı kalemlerde (0042'den beri normal) engellerdi: ana satırı 30.000 ödenmiş
  kaleme sonradan prim eklenince tam bu koşul oluşur. Gerçek risk, ödenmiş eski satırın tutarının primi zaten
  **içermesidir**. Koşul taraf başınadır (resmi, elden): **o taraftaki ödeme almış satırların tutarlarının toplamı
  yeni maaş hedefinin tutarını aşıyorsa** o tarafın ek ödemesi ayrılmaz ve maaş hedefinin içinde kalır; bu tam
  `planYenidenBol`'un hata verdiği durumdur. 30.000 ödenmiş + 9.500 yeni prim ayrılır (Intent), 39.500 ödenmiş
  (prim içinde) ayrılmaz (AC-26). Bölünmez tarafta tutarlar `personelHedefKirilimi`'nin ayırma yapısından gelir
  (Q2): ANA = maaş + prim, ek resmi hedefi yok; toplam değişmez (AC-4).
- **R22.** **Ek ödeme hedefinde çek yok (Q4).** 0053 R12'nin "çek yalnız ANA hedefte" kuralı gereği ek ödeme
  hedeflerinde "Çek (ciro)" ve "Çek (kendi)" çıkmaz; nedeni tek sabitten yazılır.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla; dört hedefin toplamı kalemin ödenecek tutarına **tam** eşittir.
- **C2.** **Tek kaynak:** hedefler yine `gider.odemeHedefleri` yolundan gelir; maaş ile ek ödeme ayrımı
  zaten hesaplanan `personelHedefKirilimi`'nden okunur (R18), ikinci bir hesap yazılmaz. Ad çözümü de tek
  yerdedir (R16).
- **C3.** Yeni kalıcı sütun yoktur: ek hedefler `gider_taksitleri.hedef` sütununda yeni değerlerdir
  (0042'nin `"elden"` değerini eklerken izlediği yol). **Merge'de değişiklik yok** (taksit satırları
  kalemle birlikte yazılıp siliniyor, kimlik remap'i zaten var); `db-roundtrip.cjs` ve
  `db-clean-install.cjs` dört hedefli bir personel kalemiyle genişletilir (AC-21).
- **C4.** Yeni izin ve sunucu değişikliği yoktur.
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Her ek ödeme satırının (prim ayrı, fazla mesai ayrı) kendi hedefi olması — *neden:* R7; hedef
  sayısı ek ödeme sayısıyla büyürse borç özeti, hatırlatıcı ve ekstre okunmaz hâle gelir. Ayrı ayrı ödeme
  ihtiyacı çok satırlı ödemeyle karşılanır.
- **X2.** Ek ödemeye ayrı vade — *neden:* R5; ayrı vade hatırlatıcıda ikinci bir satır açar ve ek ödeme
  çoğunlukla maaşla aynı dönemde ödenir. İhtiyaç doğarsa ayrı iş.
- **X3.** Ek ödemenin taksitlendirilmesi — *neden:* R6; prim ve mesai tek seferde ödenir.
- **X4.** Ek ödemenin gider toplamından, kovadan ya da makina maliyetinden ayrılması — *neden:* R13;
  0023'te ek ödeme kalemin tutarının parçasıdır ve bu doğrudur. Değişen yalnız **ödeme** tarafı.
- **X5.** Çalışan bazlı ek ödeme ayrıntısının raporlara ya da çıktılara açılması — *neden:* R12;
  gizlilik kuralı 0001'den beri yerinde.

---

## Context

- **Bugünkü kural ve nereden geldiği.** 0023 C8: "ek ödemeler maaşla aynı ödemedir (ayrı vade/ödendi
  yok)". 0042: personel resmi ve elden diye iki hedef, tutarlar `personelHedefKurus` ile **maaş + ek
  ödemelerin kendi kısmı**. Yani prim bugün resmi ya da elden hedefinin içinde eriyor. İki karar da tek
  tek doğruydu; birlikte, sonradan eklenen bir ek ödemenin kapanmış hedefi yeniden açması sonucunu
  veriyor. Bu spec 0023 C8'i **ödeme tarafında** geri alır, gider tarafında (toplam, kova, maliyet)
  aynen bırakır.
- **Ayrım zaten hesaplanıyor.** `gider.js personelHedefKirilimi(k, hedef, ikiHedef)` her hedef için
  `maasK` ve `ekOdemeK` döndürüyor; 0048 bu değerleri forma taşıdı (hedef satırında maaş ile ek ödemenin
  ayrı okunması). Yani motor sayıyı biliyor, yalnız onu **hedefe** çevirmiyor. İş, var olan türetilmiş
  ayrımı ödeme hedefine yükseltmek.
- **Dört hedef sınırı.** Ek ödeme sayısı kaç olursa olsun hedef sayısı dörtle sınırlı kalır, çünkü ayrım
  ek ödeme **satırı** başına değil, resmi/elden bileşeni başına yapılır. Bu, borç özetinin ve
  hatırlatıcının okunur kalmasının şartıdır (X1).
- **Göç neden gerekmiyor.** 0042 aynı sorunu çözdü: satırsız personel kalemi okuma anında iki hedefle
  görünüyor, ödenen tutar hedef sırasıyla dağılıyor, toplam değişmediği için durum korunuyor. Aynı yol
  dört hedefe genişler (R9).
- **Ayrılamayan kalem (R10).** 0042'de `personelBolunmezMi` şunu koruyordu: satır (taksit) tutan ve ana
  satırı ödeme almış eski bir kalem resmi/elden diye bölünmez, çünkü bölmek o satırın tutarını düşürür ve
  ödenmiş tutar yeni toplamı aşar (`planYenidenBol` hatası). Ek ödemeyi ayırmak da aynı riski taşır;
  koruma aynı mantıkla genişletilmeli. Satırsız kalemde böyle bir risk yok (toplam sabit).
- **0053 ile ilişki.** 0053'te bu ayrım **kapsam dışı** bırakılmıştı (X1) ve istenen ayrımın çok satırlı
  ödemeyle karşılanacağı yazılmıştı. Takım Yöneticisi bunu gözden geçirip reddetti: çok satırlı ödeme
  "aynı hedefi iki parçada ödemeyi" çözüyor, ama "kapanmış bir hedefin yeniden açılması" sorununu
  çözmüyor. 0053'ün X1'i bu spec'e devredilir; **0053 tamamlandı** (commit `6ce79bc`, tek ödeme editörü
  `OdemeGirisi`) ve geri kalanı (yöntem satırın alanı, çek her yerde, her şey formda) aynen geçerli olup
  bu işi tamamlar: ek ödeme hedefi, doğduğu formda tek başına ödenir. Özellikle **0053 R24** 0048'in
  "Kaydedince ödenebilir" kısıtını formda kaldırdığı için yeni doğan hedef aynı yazımda ödenebilir (R3).
- **Motorun bugünkü şekli (QA turunda ölçüldü).** `HEDEF` üç değerli (`gider.js:142`) ve `HEDEF_SIRASI`
  sabit (`:143`); `personelHedefKurus` maaş ile ek ödemeyi **toplayıp** `{resmiK, eldenK}` döndürüyor
  (`:101-107`); ayrımı veren `personelHedefKirilimi` (`:110`, 0048 R13); satırlı doğma kapısı
  `personelIkiHedef` (`:117`) yalnız resmi ve elden ikisi de sıfırdan büyükken açılıyor; bölünmezlik
  koruması `personelBolunmezMi` (`:272`); `odemeSatirlariKur` içinde `personelIki` kapısı, `hedefTop(h)` ve
  üç dallı `vadeOf(h)`. R14–R18 bu beş noktayı tek tek genişletiyor.

---

## Acceptance Criteria

### Hedefler

- **AC-1.** Maaşı ve ek ödemesi olan personel kaleminde maaş ve ek ödeme ayrı hedefler olarak görünür.
- **AC-2.** Resmi ve elden ayrımı her ikisinde de korunur; dört hedef en çok dört satır çizer.
- **AC-3.** Tutarı sıfır olan hedef çizilmez (yalnız resmi maaş ve resmi prim varsa iki satır).
- **AC-4.** Dört hedefin toplamı kalemin ödenecek tutarına tam eşittir.
- **AC-5.** Tek hedefli personel kaleminde ad bugünkü gibi "Çalışana" kalır.
- **AC-6.** Birden çok hedefte adlar "Maaş (resmi)", "Maaş (elden)", "Ek ödeme (resmi)",
  "Ek ödeme (elden)" olarak ayırt edilir ve ad hedef kimliğinden çözülür (R16).

### Asıl senaryo

- **AC-7.** Maaşı tamamen ödenmiş bir kaleme ek ödeme eklendiğinde maaş hedefleri "Ödendi" kalır.
- **AC-8.** Aynı durumda ek ödeme hedefi "Ödenmedi" olarak ve kendi tutarıyla doğar.
- **AC-9.** Ek ödeme hedefi gider düzenleme formundan, **doğduğu aynı yazımda** tek başına ödenir; maaş
  hedeflerine dokunulmaz (0053 R24).
- **AC-10.** Aynı ödeme, ödeme penceresinden de yapılabilir ve aynı hareket kaydını üretir.
- **AC-11.** Ek ödeme ödendikten sonra kalem "Ödendi" olur.
- **AC-12.** Aynı ay içinde iki ek ödeme (prim ve fazla mesai) tek hedefte toplanır ve iki ödeme
  satırıyla ayrı ayrı ödenebilir.

### Koruma

- **AC-13.** Göç yok: mevcut, tamamen ödenmiş **satırsız** personel kalemi okuma anında dört hedefle
  görünür ve "Ödendi" kalır.
- **AC-14.** Kısmen ödenmiş mevcut satırsız kalemde ödenen tutar R14'ün sırasıyla dağılır ve toplam kalan
  değişmez. Mevcut **satırlı** kalem ise ilk kaydedilene kadar iki hedefli kalır, kaydedilince dört satıra
  geçer ve ödenmiş satırların tutarı korunur.
- **AC-15.** Taksit satırı olan ve o hedefi ödeme almış kalemde ayırma yapılmaz ve nedeni yazılır.
- **AC-16.** Borç özetinde personel kalemi tekil kalır; hedef kırılımı ayrıntı açıkken görünür.
- **AC-17.** Ödeme hatırlatıcısı personeli kalem başına birleştirmeye devam eder; sayılar kalem sayar.
- **AC-18.** Çalışan ekstresinde yeni hedefler ayrı okunur.
- **AC-19.** Hedef adları ve tutarları hiçbir yazdırma ve dışa aktarma çıktısında görünmez.
- **AC-20.** Kalemin toplamı, KDV'si, kova dağılımı ve makina maliyeti bu işten önce ve sonra aynıdır.
- **AC-21.** Veritabanına yeni sütun eklenmez; hedef değerleri yazılıp geri okunur.

### QA turunda eklenen kriterler

- **AC-22.** Hedef sırası maaş resmi → maaş elden → ek resmi → ek elden → stopaj olarak sabittir (R14).
- **AC-23.** Maaşı ödenmiş satırsız kaleme ek ödeme eklenince ödenen tutar maaş hedeflerinde kalır, ek
  ödeme hedefi açık doğar (R14'ün sırası).
- **AC-24.** Yalnız resmi maaşı ve resmi ek ödemesi olan kalem **satırlı** doğar ve ödeme hedefe bağlanır
  (R15).
- **AC-25.** `personelIkiHedef`'in anlamı değişmez; "elden vadesi" alanı yalnız elden maaşı olan kalemde
  çizilir (R15).
- **AC-26.** Ana satırı ödeme almış ve ek ödeme bileşeni olan satırlı kalem ayrılmaz; neden tek sabitten
  yazılır ve `planYenidenBol` hatası oluşmaz (R10).
- **AC-27.** Ek ödeme hedeflerinin vadesi kalemin ilk vadesidir; formda ek ödeme için vade alanı çizilmez
  (R17, X2).
- **AC-28.** Resmi maaş taksitliyken ek ödeme hedefi tek satır kalır ve formdan ödenebilir (R6).
- **AC-29.** Dört hedefin tutarı `personelHedefKirilimi`'nden okunur; ikinci bir toplama yazılmaz (R18).
- **AC-30.** Yalnız ek ödemesi olan (maaşı sıfır) kalemde tek hedef görünür ve adı "Çalışana" olur (R8).
- **AC-31.** Gizlilik testi yeni hedef değerlerini ve adlarını da yasaklar (R19).
- **AC-32.** Çalışan ekstresinde ödeme satırı hedefini yazar ve devreden bakiye değişmez (R20).
- **AC-33.** 0051'in Kasa hareket etiketi yeni hedefleri doğru gösterir (R20).
- **AC-34.** 0047 aylık raporu bu işten önce ve sonra aynıdır (R20).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Hedefler tek yoldan (`odemeHedefleri` + `personelHedefKirilimi`) geliyor; ikinci hesap yazılmadı (C2).
- [x] Göçsüzlük **iki dal için** testle gösterildi: satırsız kalem okuma anında, satırlı kalem ilk
      kayıtta (AC-13, AC-14).
- [x] Hedef sırası ve satırlı doğma kapısı testli (AC-22, AC-23, AC-24); `personelIkiHedef`'in anlamı
      değişmedi (AC-25).
- [x] Bölünmezlik koruması genişletildi ve `planYenidenBol` hatası üretilemiyor (AC-26).
- [x] Ad çözümü tek kaynaktan; `eldenHedefliMi || personelIkiHedef` birleşimi kaldırıldı (R16, kaynak
      taraması).
- [x] `db-roundtrip.cjs` ve `db-clean-install.cjs` dört hedefli personel kalemini kapsıyor (AC-21, C3).
- [x] Gider tarafının değişmediği çapraz testle gösterildi (AC-20).
- [x] Gizlilik testi yeni hedef adlarını da yasaklıyor (AC-19).
- [x] Görsel kanıt eklendi (`docs/evidence/0054-*.jpg`): dört hedefli ödeme bölümü, ödenmiş maaşın
      yanında yeni ek ödeme hedefi.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: 0023 C8'in ödeme tarafında geri alındığı ve dört hedefli personel modeli.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R1 QA turu (15 bulgu, 5'i bloklayıcı), R2 plan onayı (Q1–Q9; R21, R22). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 0 | Triyaj turu olmadı. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 0 / 0 | Gözden geçirme bulgusu gelmedi. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | 0042/0048/0051/0053'ün "Resmi"/"Elden" ad beklentileri bilinçli olarak yeni adlara çevrildi (Q5); değişmemesi gereken 22 aday ekran 0 piksel, 0047 raporu birebir aynı (AC-34). Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir koruma kuralının harfiyen okunuşu spec'in Intent'ini engelleyebilir: R10 "ödeme almış satır + ek ödeme bileşeni" diyordu ve 0042'den beri satırlı doğan bütün personel kalemlerinde tam Intent'in senaryosunu yasaklıyordu. Plan aşamasında ölçülebilir koşula (taraf başına ödenmiş tutar > yeni maaş hedefi, R21) çevrilmesi asıl riski (ödenenin altına düşen satır) korurken senaryoyu açtı. İkincisi: görüntü aracının adımları ekrandaki etiketlere bağlıdır; bir ad değişikliği adımları yalnız konsola uyarı yazarak sessizce kırar ve çekim "fark var" gösterse de fark adımın çalışmamasından gelir. Ad değiştiren işte eski adı arayan adımlar çekimden önce taranmalı. Üçüncüsü: `EKRAN_ATLA` listesi kaynaktaki sabit anahtarlardan çıkarılırsa üretilen ekran adları (`ayarlar-*`) kaçar ve çekim gereksiz ekranlara koşar; liste önceki raporun ekran adlarıyla birleştirilmeli.
