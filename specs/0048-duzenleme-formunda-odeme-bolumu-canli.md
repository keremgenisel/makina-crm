# 0048 — Gider Düzenleme Formunda Ödeme Bölümünün Canlı Olmaması

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-30, plan onayıyla; plan `specs/0048-uygulama-plani.md` Q1–Q11). Uygulanıyor, dal `feat/0048-duzenleme-odeme`. |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi formunun "Ödeme" bölümü (düzenleme kipi) |
| **Bağımlı spec'ler** | 0021 (ödeme hedefleri) · 0023 (ek ödemeler) · 0024 (ödeme hareketleri, `odemeleriUygula`) · 0041 (`_odenen` kırılımı ve fazla ödeme) · 0042 (personelin iki hedefi) · 0046 (formdan ödeme) — hepsi tamamlandı |
| **Revizyon** | R1 (QA turu, 2026-09-30): geliştirici hazırlığı denetimi, 15 bulgu işlendi, 5'i bloklayıcıydı. Düzeltmenin doğru biçimi yazıldı (önizleme kalemi ödenen tutarı taşımıyor, R11), "Ödeme gir" düğmesinin kayıtta olmayan hedefte ölü kalması (R5), R4 ile R8'in motor çıktısında karşılığı olmaması (R12, R13), plan hatası dalı (R14) ve R7'nin yanlış "sessiz" iddiası (Ö-6) çözüldü.<br>**R2 (2026-09-30, plan onayı):** ödenen tutar form durumundan değil, canlı önizleme kaleminin kaydın motorundan (`odemeleriUygula`) geçirilmesiyle bulunur (R11/Q1); satırlı kalemde aşım motorun plan hatasına düşer (R4/Q2); taksit yapısı değişmemiş hedefte "Ödeme gir" korunur, AC-20 buna göre (R5/Q3); aşım kayıtlı hedefin ödenen tutarından (R12/Q4); kaybolan hedef satırı (R16/Q5); tür uyarısı davranış değişimiyle (R15/Q6); hareket bölümü yoksa saklı durum (Q7); kırılım yalnız ek ödeme varken (R13/Q8); yeni kalem kipi aynen (Q9); kararlar saf `duzenlemeOdemeDurumu`'da (C2/Q10); görsel kanıt (Q11). |

---

## Intent

Bildirilen durum: Mali İşler › Giderler'de bir **personel kalemi düzenlenirken ek ödeme eklendiğinde
aşağıdaki ödeme bölümü buna karşılık vermiyor.**

Doğrulandı ve sebebi bulundu. Formun içinde iki komşu kutu var ve ikisi farklı kaynaktan besleniyor:

- **"Ödeme planı" önizlemesi** formdaki canlı değerlerden hesaplanıyor; ek ödeme girilir girilmez
  güncelleniyor, gerekirse iki satıra (resmi ve elden) bölünüyor.
- Hemen altındaki **"Ödeme" kutusu** ise **kaydedilmiş kalemden** besleniyor
  (`GiderForm.jsx`'te düzenleme kipinde `formOdemeHedefleri(kalem)`, canlı önizleme kalemi değil).

Sonuç: kullanıcı ek ödeme yazıyor, üstteki plan iki satır oluyor, alttaki ödeme kutusu kıpırdamıyor.
Elden kısmı ek ödemeyle ilk kez doğuyorsa o hedefin satırı hiç görünmüyor; ek ödeme resmi tarafındaysa
satırdaki toplam ve kalan eski tutarı göstermeye devam ediyor. Kullanıcı bunu "ödeme çıkmıyor" diye
görüyor ve haklı: ekran, kaydedince ne olacağını yanlış gösteriyor.

Başarı şu demek: düzenleme formundaki ödeme kutusu, kaydedilince oluşacak hedefleri ve tutarları anında
gösteriyor; ödenmiş tutarlar ise kayıttan gelmeye devam ediyor.

---

## Requirements

- **R1.** Düzenleme kipindeki "Ödeme" kutusunun **hedef listesi ve tutarları formdaki canlı değerlerden**
  türetilir: maaş, ek ödemeler, tutar, KDV, stopaj ve taksit alanları değişince kutu anında güncellenir.
- **R2.** **Ödenen tutar kayıttan gelir** ve formda değiştirilemez. Kalan = canlı toplam − ödenen; sıfırın
  altına inmez. **Önkoşul:** ödenen tutarlar `GiderForm.jsx:50-52`'deki etki üzerinden gelir; o etki
  `form.taksitler`, `form.odendi`, `form.odemeTarihi` ve **`form._odenen`**'i canlı `kalem` prop'undan
  senkronluyor ve aynı zamanda 0046 triyajının ödenmiş taksit korumasının dayanağıdır. Etki kaldırılır ya
  da bağımlılıkları daraltılırsa hem bu iş hem o koruma bozulur.
- **R3.** Ek ödeme eklenmesi elden hedefini ilk kez doğuruyorsa o satır **anında görünür**; ek ödeme
  kaldırılınca satır kaybolur.
- **R4.** Ödenen tutar yeni toplamı **aşıyorsa** satır bunu söyler (örnek: "ödenen 39.500, yeni toplam
  30.000") ve kullanıcı kaydetmeden önce uyarılır. Uyarı **kaydı engellemez**: para zaten ödenmiştir,
  kullanıcı tutarı düzeltiyor olabilir ve 0021 `planYenidenBol` ödenmiş satırları zaten koruyor, 0041 ise
  fazla ödeme durumunu (kalem tutarı ödemeden sonra düşürülmüş) zaten karşılıyor. Rakamın nereden geldiği
  R12'de.
  **Uygulama (R2, Q2):** motor değişmez (C3). Satırsız kalemde aşım ibaresi görünür ve kayıt geçer. Satırlı kalemde
  ödenmiş taksitlerin toplamı yeni toplamı aşarsa `planYenidenBol` bugün de hata verir (0021 R10 koruması); bu durum R14
  dalına düşer (plan hatası ve kayıtlı hâl).
- **R5.** "Ödeme gir" düğmesi üç koşulun tamamıyla çizilir: (a) canlı kalan sıfırdan büyük, (b) hedef
  **kayıtlı kalemde de var**, (c) hedef pasif değil. **Canlı doğmuş hedefte düğme yerine "Kaydedince
  ödenebilir" ibaresi durur.** Sebep ölçülebilir: `OdemeDurumSatirlari.jsx:115` düğmeyi yalnız
  `h.kalanK > 0` ile çiziyor ve `GiderForm.jsx:352` onu `(h) => onHedefOde(kalem, h)` ile **kayıtlı**
  kaleme bağlıyor; ek ödemeyle yeni doğan elden hedefi kayıtlı kalemde bulunmadığı için pencere satır
  bulamaz ve satırlı kalemde `kasa.odemeDogrula` "Taksitli kalemde ödeme bir taksite bağlanır" hatası
  verir, yani düğme ölü kalır. Bu, X5'in ("kaydedilmemiş tutarla ödeme kaydı üretilmez") görünür hâlidir.
  **Pasif hedef:** `formOdemeHedefleri` çok taksitli hedefe `pasif: true` ve `PASIF_TAKSIT_NEDENI` veriyor;
  kalan sıfırdan büyük olsa da düğme çizilmez ve mevcut neden metni yazılır (bugünkü davranış korunur).
  **Taksit sayısı canlı değişirse** ölçüt yine kayıtlı kalemdir: kayıtta tek satırken formda ikiye
  çıkarıldıysa düğme çizilmez, "Kaydedince ödenebilir" yazar.
  **Uygulama (R2, Q3):** bugün düzenleme kipinde pasif hedefte de "Ödeme gir" çiziliyor ve ödeme penceresi taksit
  seçicisiyle doğru ödüyor; bu yol korunur. Ölçüt: hedef kayıtlı kalemde **aynı taksit yapısıyla** (aynı satır sayısı)
  varsa ve canlı kalan sıfırdan büyükse düğme çizilir; yapı değiştiyse ya da hedef yeni doğduysa "Kaydedince
  ödenebilir" yazar. `PASIF_TAKSIT_NEDENI` ("kayıttan sonra ödenir") kaydedilmiş kalemde anlamsız olduğu için
  düzenleme kipinde yazılmaz.
  **Triyaj (2026-09-30):** ölçüt satır sayısı değil taksit sayısıdır: kayıtta satırsız hedef (0 satır) önizlemedeki tek
  satırlı hedefle eşdeğerdir. Göçsüz eski kalemler (0042 öncesi iki hedefli personel, 0021 öncesi stopajlı kira) önizlemede
  satırlıya döner; hiçbir şey değişmemişken düğme kaybolmaz.
- **R6.** Düzenleme kipinde **ödeme girişi yine açılmaz** (0046 R15 kararı korunur); bu iş yalnız
  gösterimi düzeltir, ödeme yine listedeki ödeme penceresinden kaydedilir ve silinir.
- **R7.** Personel kalemi 0042 Q4 gereği **bölünemiyorsa** (eski satırlı kalemin ana satırı ödeme almış ve
  elden satırı yok) kutu tek hedef gösterir ve **nedenini kutunun içinde de yazar**. Bu bir yer
  değişikliğidir, eksik mesaj değil: `GiderForm.jsx:308-310` bugün zaten "Bu kalem eski planla ödendiği
  için resmi ve elden olarak ayrılmaz." ipucusunu basıyor, ama vade alanlarının yanında. Metin **tek
  sabitten** okunur, iki yerde iki ayrı cümle yazılmaz.
- **R8.** Hedef satırında tutarın neyden oluştuğu görünür: maaş ile ek ödemelerin toplamı ayrı ayrı
  okunabilir (ipucu düzeyinde yeterli, örnek "maaş 30.000 + ek ödeme 9.500"). Veri R13'ten gelir.
- **R9.** Yeni kalem kipindeki bugünkü davranış aynen korunur (orada kutu zaten canlı).
- **R10.** Ödeme kutusu ile "Ödeme planı" önizlemesi **aynı girdi kaleminden** türer; ikisi bir daha
  ayrışmaz. İkisi aynı **fonksiyonu** çağırmaz ve çağıramaz: plan taksit satırlarını gösterir (hedef başına
  N satır, vade ve tutar), kutu hedef satırlarını (hedef başına bir satır, durum ve kalan). Ölçülebilir
  bağ şudur: kutudaki bir hedefin toplamı, plandaki o hedefe ait satırların tutar toplamına eşittir.

### QA turunda eklenenler (R1)

- **R11.** **Önizleme kalemi ödenen tutarı taşır.** `GiderForm.jsx:115-122` `onizlemeKalem` nesnesinde
  bugün `_odenen` ve `odendi` **yok**; `gider.odemeHedefleri` satırsız kalemde kalanı `k._odenen`'den
  hesapladığı için düzenleme dalı basitçe `onizlemeKalem`'e çevrilirse kısmen ödenmiş satırsız kalemde
  kalan **tam tutar** görünür, yani ödenmiş para ekranda yok olur. Kural: önizleme kalemine
  `_odenen: form._odenen` ve `odendi: form.odendi` eklenir (ikisi de R2'deki etki sayesinde form
  durumunda hazırdır). Satırlı kalemde ek kural: önizleme satırlarından **gerçek kimlikli** olanlar
  `_odenenK`'sını korur, `onizleme-*` kimlikli **yeni** satırlar sıfırla doğar.
  **Uygulama (R2, Q1):** önizleme kalemi form durumundaki `_odenen`/`odendi`'yi taşımaz; kalemin gerçek kimliğiyle
  kayıtlı hareketlerden `odemeleriUygula` ile zenginleştirilir, yani kaydedince listede görünecek durumun kendisidir.
  Form durumunu taşımak iki yerde yanlıştı: tamamen ödenmiş satırsız kaleme ek ödeme eklenince `odendi: true` kalanı
  0 bırakıyordu; kısmen ödenmiş satırsız kalem ek ödemeyle satırlıya geçince yeni satırlar ödenmemiş doğuyor, ödenen para
  kayboluyordu. Taksite bağlı hareket gerçek kimlikli satırda kalır, `onizleme-*` satırı sıfır ödenmiş doğar (R11'in
  amacı). Hareket bölümü olmayan eski sunucuda (Q7) saklı durum (`_odenen`, `odendi`) taşınır.
- **R12.** **Hedef nesnesi ham ödenen tutarı taşır.** `odemeHedefleri` kalanı `Math.max(0, toplam − ödenen)`
  ile kırptığı için `toplamK − kalanK` = min(ödenen, toplam)'dır ve aşım bu çıktıdan türetilemez.
  `formOdemeHedefleri`'nin döndürdüğü nesneye **`odenenK` (ham, kırpılmamış)** eklenir; aşım =
  `odenenK − toplamK`. Değer `_odenen` ve satır `_odenenK`'sından okunur, yeni bir hesap yazılmaz (C2).
  **Uygulama (R2, Q4):** aşım, **kayıtlı** hedefin ham `odenenK`'sı ile canlı `toplamK` karşılaştırılarak bulunur;
  canlı motor satırsız dağılımda ödeneni yeni toplamda kırpar.
- **R13.** **Hedef nesnesi maaş ile ek ödeme kırılımını taşır.** Bugün `OdemeDurumSatirlari` bir satırda
  yalnız `hedefAdi · toplam`, durum ve düğme çiziyor; kırılım için alan yok. Hedef nesnesine **`maasK` ve
  `ekOdemeK`** eklenir (personelde `personelHedefKurus` ve ek ödeme toplamından; diğer davranışlarda
  `null`) ve satırın altında ipucu olarak basılır. Alanlar `null` olduğunda ipucu çizilmez.
  **Uygulama (R2, Q8):** ipucu yalnız `ekOdemeK > 0` iken çizilir. Bölünmez ya da tek hedefli personelde maaş ve ek
  ödemenin tamamı o hedefe toplanır.
- **R14.** **Plan hatası dalı tanımlıdır.** Bugün `onizlemeKalem.taksitler = onizleme.hata ? [] : (onizleme.satirlar || [])`
  olduğu için plan hatalıyken taksitler boşalır, `satirliMi` false olur ve taksitli bir kalem **tek hedefe**
  düşer; kalan ve durum yanlış görünür. Kural: `onizleme.hata` varken kutu **kayıtlı kalemi** gösterir ve
  üstünde tek satır ibare durur ("Ödeme planında hata var; aşağıdaki durum kayıtlı hâli gösteriyor").
- **R15.** **Düzenleme sırasında tür (davranış) değişirse** kutu canlı davranışı izler; kalemin **kayıtlı
  ödemesi varsa** satırların üstünde uyarı çıkar ("bu kalemin kayıtlı ödemesi var; türü değiştirmek
  hedefleri ve ödeme bağlarını etkiler"). Kayıt engellenmez: engellemek kullanıcıyı kilitler, sessiz kalmak
  ödemeyi görünmez yere taşır.
  **Uygulama (R2, Q6):** uyarı **davranış** değişince çıkar (normal, kira, personel); aynı davranıştaki tür değişimi
  hedeflere dokunmaz. "Kayıtlı ödemesi var" = kayıtlı hedeflerden birinde ödenen tutar sıfırdan büyük.
- **R16.** **Toplamı sıfıra düşen hedefin satırı kalkar** (`formOdemeHedefleri` `toplamK > 0` süzüyor); bu
  R3'ün ters yönüdür ve doğru davranıştır. Kayıtlı ödemesi olan bir hedef sıfırlanırsa R4'ün aşım ibaresi
  görünür, böylece satır kaybolup ödeme görünmez kalmaz.
  **Uygulama (R2, Q5):** canlı listede olmayan ama kayıtta ödeme almış hedef için ayrı bir aşım satırı çizilir
  ("ödenen X, yeni toplam 0"). Satırlı kalemde bu durum motorda plan hatasıdır (R4 uygulama notu).
- **R17.** **Formun kapatılıp yeniden açılması:** kaydetmeden kapatıp yeniden açınca kutu **kayıtlı**
  duruma döner (form değişiklikleri atılır); kaydedip yeniden açınca canlı ile kayıtlı birebir aynıdır.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır.
- **C2.** **Tek motor:** hedefler yine `formOdemeHedefleri` ile, ödenen tutarlar yine kayıtlı hareketlerden
  (`odemeleriUygula`) gelir. Forma özel ikinci bir hedef ya da kalan hesabı yazılmaz. **Motor çıktısında
  olmayan bir bilgi gerekiyorsa hedef nesnesi genişletilir** (R12 `odenenK`, R13 `maasK`/`ekOdemeK`),
  formda yeniden hesaplanmaz; genişletme mevcut çağrıların davranışını değiştirmez.
- **C3.** Bu iş hiçbir kaydı, tutarı ya da ödemeyi değiştirmez; yalnız formun gösterdiğini düzeltir.
- **C4.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C5.** Gizlilik kuralları aynen geçerlidir: hedef adları ve tutarlar ekranda kalır, hiçbir çıktıya
  girmez.
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Her ek ödeme için ayrı ödeme satırı (mesai ayrı, prim ayrı ödensin) — *neden:* 0023 C8'de ek
  ödeme maaşla **aynı ödemedir**, kendi vadesi ve ödendi durumu yoktur. Ek ödeme resmi ya da elden
  olmasına göre iki hedeften birine katılır. Bu karar değişmiyor; R8 yalnız bunu görünür kılıyor.
- **X2.** Düzenleme formuna ödeme girişi eklemek — *neden:* 0046 R15; iki ödeme editörü er geç ayrışır.
- **X3.** Personelin bölünmezlik kuralının (0042 Q4) gevşetilmesi — *neden:* hareketler ana satırlara
  bağlı; kuralı değiştirmek kayıtlı ödemeleri taşımak demek. R7 yalnız nedeni yazdırır.
- **X4.** Ödenmiş tutarın forma göre yeniden dağıtılması — *neden:* ödeme kaydı formun işi değil.
- **X5.** Kaydedilmemiş form değişikliğinin ödeme penceresine taşınması ("Ödeme gir" düğmesine basınca
  formdaki yeni tutarla açılması) — *neden:* pencere kayıtlı kalemi öder; kaydedilmemiş tutarla ödeme
  kaydı üretmek veriyi tutarsız bırakır. Kullanıcı önce kaydeder.

---

## Context

- **Kök sebep (doğrulandı).** `src/components/GiderForm.jsx`:
  `odemeHedefListesi = formOdemeHedefleri(yeniKalem ? onizlemeKalem : kalem, turMap)`. Düzenleme kipinde
  ikinci dal çalışıyor ve `kalem`, `Giderler.jsx`'in kayıtlı diziden bulduğu kayıt
  (`giderler.find(k => k.id === form.kalemId)`). Form alanları değişse de bu nesne değişmiyor, dolayısıyla
  kutu kaydedilene kadar eski hâli gösteriyor.
- **Yanındaki kutu canlı.** Aynı formdaki `onizleme` (Ödeme planı) `form.ekOdemeler`'i bağımlılığında
  taşıyor ve `odemeSatirlariKur`'u canlı değerlerle çağırıyor. Yani iki komşu kutudan biri güncelleniyor,
  öbürü donuyor; tutarsızlık kullanıcının gözünün önünde.
- **Motor zaten doğru.** `gider.js` `personelHedefKurus` ek ödemelerin resmi ve elden kısımlarını maaşa
  ekliyor, `personelIkiHedef` ikisi de sıfırdan büyükse iki hedef veriyor. Yani hesapta eksik yok; eksik
  olan formun motora **hangi kalemi** verdiği.
- **Ek ödeme ayrı ödenmez.** 0023 C8 gereği ek ödemenin kendi vadesi ve ödendi durumu yok; resmi ya da
  elden hedefine katılıyor. Kullanıcının "ek ödemenin ödemesi çıkmıyor" beklentisi bu yüzden kısmen
  tasarım gereği; ama tutarların ve hedeflerin güncellenmemesi tasarım değil, hata. Spec ikisini
  ayırıyor: X1 beklentiyi reddediyor, R1–R3 hatayı düzeltiyor.
- **Bölünmezlik aslında sessiz değil (QA turunda düzeltildi).** 0042 Q4: satırlı eski personel kaleminin
  ana satırı ödeme almışsa ve elden satırı yoksa kalem ikiye bölünmez; elden tutarı ana hedefe katılır
  (para kaybolmaz). Spec'in ilk taslağı "formda bunun nedeni yazmıyor" diyordu, oysa
  `GiderForm.jsx:308-310` bu durumda zaten bir `Ipucu` basıyor ("Bu kalem eski planla ödendiği için resmi
  ve elden olarak ayrılmaz."), yalnız vade alanlarının yanında duruyor. R7 bu yüzden bir **yer
  değişikliğidir**, eksik mesaj değil.
- **Önizleme kalemi eksik (QA turunda ölçüldü).** `onizlemeKalem` (`GiderForm.jsx:115-122`) id, turId,
  tedarikciId, calisanId, tutar, kdvOrani, stopajOrani, resmiTutar, eldenTutar, girisYonu, netTutar,
  ekOdemeler ve taksitler taşıyor; **`_odenen` ve `odendi` yok**. Buna karşılık `GiderForm.jsx:50-52`
  ikisini de form durumuna senkronluyor (0046 triyajı), yani düzeltme için gereken veri elde hazır (R11).
- **Önizleme satırlarının kimliği karışıktır.** `onizleme` memosu `odemeSatirlariKur`'u
  `{ uid: () => "onizleme-" + (++n), eskiSatirlar: form.taksitler, ... }` ile çağırıyor: var olan satırlar
  gerçek kimliklerini korur, yeni satırlar `onizleme-1`, `onizleme-2` gibi geçici kimlik alır. Bu yüzden
  "kayıtta var mı" sorusunun cevabı kimlikten okunabilir (R5, R11).
- **Hedef nesnesinin şekli sabit.** `formOdemeHedefleri` her hedef için
  `{hedef, taksitId, toplamK, kalanK, odendi, pasif, neden, ciroOlur}` döndürüyor; ham ödenen tutar ve
  maaş/ek ödeme kırılımı yok. R4 ile R8 bu yüzden nesne genişletilmeden yazılamaz (R12, R13).
- **Bileşenin şekli sabit.** `OdemeDurumSatirlari` (`gider/OdemeFormSatirlari.jsx:104-121`) bir satırda
  `hedefAdi · toplam`, durum metni ve "Ödeme gir" düğmesini çiziyor; düğme koşulu yalnız `h.kalanK > 0`.
  R5'in üç koşulu ve R13'ün ipucusu bu bileşende yer açmayı gerektirir.
- **Etki alanı dar.** Değişen tek şey formun düzenleme kipindeki gösterimi; kayıt, ödeme, borç özeti,
  hatırlatıcı ve rapor bu işten etkilenmiyor (C3). Mevcut testlerden
  `tests/ui/gider-form-odeme.test.jsx`'in düzenleme kipi blokları (durum satırı, "Ödeme gir") yeni
  davranışa göre genişletilir.

---

## Acceptance Criteria

- **AC-1.** Yalnız resmi tutarı olan personel kalemi düzenlenirken elden tutarlı bir ek ödeme eklenince
  "Ödeme" kutusunda elden satırı **anında** görünür.
- **AC-2.** O ek ödeme kaldırılınca elden satırı kutudan kalkar.
- **AC-3.** Resmi tutarlı ek ödeme eklenince resmi satırının toplamı ve kalanı anında artar.
- **AC-4.** Maaş tutarı değiştirilince satırdaki toplam ve kalan anında güncellenir.
- **AC-5.** Kısmen ödenmiş kalemde ödenen tutar değişmez; kalan, canlı toplamdan ödenen düşülerek
  hesaplanır.
- **AC-6.** Tutar ödenenin altına düşürülünce kalan sıfır olur ve satır ödenenin yeni toplamı aştığını
  söyler.
- **AC-7.** Kalanı sıfır olan hedefte "Ödeme gir" düğmesi çizilmez.
- **AC-8.** Düzenleme kipinde ödeme girişi (tutar, yöntem, hesap alanları) çizilmez.
- **AC-9.** 0042 Q4 gereği bölünemeyen personel kaleminde tek hedef görünür ve nedeni yazılır.
- **AC-10.** Ek ödeme başına ayrı ödeme satırı **oluşmaz**; ek ödeme resmi ya da elden hedefine katılır.
- **AC-11.** Hedef satırında maaş ile ek ödeme toplamı ayrı okunur.
- **AC-12.** Kutudaki bir hedefin toplamı, "Ödeme planı" önizlemesinde o hedefe ait satırların tutar
  toplamına eşittir (ikisi aynı girdi kaleminden türer).
- **AC-13.** Yeni kalem kipinde bugünkü davranış değişmez.
- **AC-14.** Kaydetmeden kapatıp yeniden açınca kutu kayıtlı duruma döner; kaydedip yeniden açınca canlı
  ile kayıtlı birebir aynıdır (R17).
- **AC-15.** Kira ve normal kalemlerde kutu aynı kuralla çalışır (stopaj hedefi, tutar değişimi).
- **AC-16.** Bu iş hiçbir kaydı değiştirmez: form açılıp kapatılınca kalem, ödemeler ve borç özeti aynı
  kalır.

### QA turunda eklenen kriterler

- **AC-17.** Kısmen ödenmiş **satırsız** bir kalemde ek ödeme eklenince kalan, ödenen düşülerek hesaplanır;
  ödenen tutar ekranda kaybolmaz (R11).
- **AC-18.** Satırlı kalemde gerçek kimlikli satırların ödenen tutarı korunur; yeni doğan satır sıfır
  ödenmiş olarak görünür (R11).
- **AC-19.** Ek ödemeyle yeni doğan hedefte "Ödeme gir" düğmesi çizilmez, yerine "Kaydedince ödenebilir"
  ibaresi görünür (R5).
- **AC-20.** ~~Çok taksitli (pasif) hedefte kalan sıfırdan büyük olsa da düğme çizilmez ve mevcut neden
  metni yazılır (R5).~~ **(R2, Q3):** taksit yapısı kayıttakiyle aynı olan çok taksitli hedefte kalan sıfırdan
  büyükse düğme çizilir ve pencereyi açar; yapısı değişmiş hedefte düğme yerine "Kaydedince ödenebilir" yazar.
- **AC-21.** Kayıtta tek satırken formda taksit sayısı ikiye çıkarıldığında düğme çizilmez (R5).
- **AC-22.** Aşım ibaresi ham ödenen tutarı yazar ("ödenen 39.500, yeni toplam 30.000") ve kayıt
  engellenmez (R4, R12). (R2, Q2: satırsız kalemde; satırlı kalemde AC-24 dalı.)
- **AC-23.** Personel hedefinin altında maaş ile ek ödeme toplamı ayrı okunur; kira ve normal kalemde bu
  ipucu çizilmez (R13).
- **AC-24.** Ödeme planında hata varken kutu kayıtlı durumu gösterir ve nedenini yazar; taksitli kalem tek
  hedefe düşmez (R14).
- **AC-25.** Kayıtlı ödemesi olan kalemde tür değiştirilince uyarı görünür ve kayıt engellenmez (R15).
- **AC-26.** Ek ödeme silinip hedefin toplamı sıfırlanınca satır kalkar; o hedefin kayıtlı ödemesi varsa
  aşım ibaresi görünür (R16).
- **AC-27.** Bölünmezlik nedeni ödeme kutusunun içinde de görünür ve iki yerdeki metin tek sabittendir
  (R7).
- **AC-28.** `formOdemeHedefleri`'nin genişlemesi mevcut çağıranların davranışını değiştirmez (0046'nın
  yeni kalem kipi ve ciro satırı testleri aynen geçer).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hedefler tek motordan (`formOdemeHedefleri`) geliyor; forma özel ikinci hesap yazılmadı (C2).
- [ ] Ödeme planı önizlemesi ile ödeme kutusunun aynı kaynağı kullandığı testle sabitlendi (AC-12).
- [ ] Ödenen tutarın formdan etkilenmediği testle gösterildi (AC-5, AC-16, AC-17, AC-18).
- [ ] "Ödeme gir" düğmesinin üç koşulu testli; kayıtta olmayan hedefte düğme yok ve ölü tıklama üretilemez
      (AC-19, AC-20, AC-21).
- [ ] Hedef nesnesinin genişlemesi (ham ödenen, maaş ve ek ödeme kırılımı) motorda; formda ikinci hesap
      yazılmadı (R12, R13, C2) ve 0046'nın mevcut testleri aynen geçiyor (AC-28).
- [ ] Plan hatası dalı ve tür değişikliği uyarısı testli (AC-24, AC-25).
- [ ] Görsel kanıt eklendi (`docs/evidence/0048-*.jpg`): ek ödeme öncesi ve sonrası ödeme kutusu,
      bölünemeyen kalemin nedeni.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` 0046 bölümü güncellendi: düzenleme kipinde durum satırlarının canlı kalemden geldiği,
      ödenen tutarın kayıttan geldiği yazıldı.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
