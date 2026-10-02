# 0060 — Ödeme Neyin Ödemesi Olduğunu Söylesin (Stopaj, Fazla Mesai, Prim, İkramiye, Avans)

| | |
|---|---|
| **Durum** | Tamamlandı (commit `8ae43df`, dal `feat/0060-hedef-adlari`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler (kalem listesi, dönem raporu), Kasa hareket listesi, çalışan ekstresi, ödeme penceresi, Aylık Gider ve Kasa Raporu |
| **Bağımlı spec'ler** | 0021 (stopaj hedefi) · 0023 (ek ödeme türleri) · 0041 (yöntem kırılımı, `YONTEM_MAHSUP`) · 0042 (resmi/elden hedefi) · 0051 B (hedef etiketi) · 0054 (ek ödeme ayrı hedef) · 0024 B (avans ve mahsup) · 0047 (rapor gizliliği, K21 personel ayrıntısı) · 0059 (rapor detayı ve tasarımı) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 17 bulgu işlendi, 4'ü bloklayıcıydı. "Fazla mesai" etiketinin bugün yeşil olan gizlilik testine takıldığı bulundu (R11, R21), **gevşetmenin gereksiz olduğu** ölçüldü (R17 tersine çevrildi), tek kaynaktaki adların yönelme hâlinde olduğu ve rozetin yalın hâl istediği görüldü (R3), rozet koşulunun ve dört hedefli personelin yerleşiminin tanımsız olduğu tespit edildi (R1, R2). R21–R27, C8–C10 ve AC-24…AC-38 eklendi. **Onayla birlikte üç karar (2026-10-01, Takım Yöneticisi):** (1) gizlilik yasağı **dar** gevşetilir, raporda yalnız **tür bazında toplam** basılır, çalışan adı ve kişi bazlı tutar basılmaz, resmi/elden yasağı aynen durur (R16, R17, R18); (2) az kadrolu ayda tür toplamının kişiyi dolaylı belli etmesi **kabul edilen risktir**, belgenin kapısı dar tutulur (R20); (3) prim, ikramiye ve fazla mesainin ayrı ayrı ödenebilmesi **kapsam dışıdır**, bu iş adlandırma ve gösterme işidir (C3, X1).<br>**R2 (2026-10-01, plan onayı):** bütün öneriler kabul (Q1–Q10). **R17 düzeltildi:** spec'in "tek daraltma R21" iddiası tutmuyordu; 0047 ve 0059 çıktı testleri `"2.345"`, `"Prim"`, `"Fazla mesai"`, `"ikramiye"`'yi yasaklıyor ve `giderRaporu.js`'te `ekOdemeler` kaynak yasağı var. Kaynak yasağı aynen kalır (tür toplamı `gider.js`'te), çıktı yasakları yeni ek ödeme kutusu dışındaki belgeye aynen uygulanır (R28). Yalın adlar (R29), AC-6 taramasının kapsamı (R30), stopaj özetinin kapsamı (R31), personel yöntem kırılımının mevcut motordan gelmesi (R32), avans satırlarının mevcut kutuya eklenmesi (R33), kısa rozet (R34), Kasa'da taksit adı (R35) eklendi; AC-39…AC-42.<br>**R3 (2026-10-01, uygulamada bulunan çelişki, Takım Yöneticisi kararı):** R14 (personel ödemelerinin yöntem kırılımı raporda) R16 ve AC-21 ile çatıştı: elden genelde nakit, resmi havaleyle ödendiği için kırılım resmi/elden ayrımını, tek çalışanlı ayda kişinin maaşını birebir açığa çıkarıyordu (0047'nin mevcut gizlilik testi düştü). **R14 rapordan çıkarıldı (X8)**; toplu "Personel ödemeleri" satırı kalır. AC-16 ve AC-31 buna göre yeniden yazıldı, R32 geçersiz. |

---

## Intent

Bir ödemenin ekranda ve kâğıtta **neyin ödemesi olduğu** yazmıyor. İki somut şikâyet:

1. **Taksitlendirilmiş stopaj Giderler listesinde "Kira" diye görünüyor**, stopaj diye görünmüyor.
2. **Personele ödenen avans, fazla mesai, prim ve ikramiye belirtilmiyor.** Kalem "Personel gideri",
   hedef en iyi hâlde "Ek ödeme (resmi)"; hangi ek ödeme olduğu yazmıyor.

Ve bunların hiçbiri Aylık Gider ve Kasa Raporu'nda detaylanmıyor: rapor personeli tek satırda toplar,
ek ödeme türünü hiç yazmaz.

Birinci şikâyetin sebebi dar ve bulundu (aşağıda Context): kiranın hedef başına durum rozetleri
**yalnız taksitsiz** kira kaleminde çiziliyor; stopaj taksitlendirilince satır tek bir toplu rozete
düşüyor ve geriye yalnız tür sütunundaki "Kira" kalıyor.

Başarı şu demek: bir ödemeye, bir borca ya da bir taksite nerede bakılırsa bakılsın yanında ne
olduğu yazıyor (kiraya veren mi vergi dairesi mi, maaş mı prim mi ikramiye mi fazla mesai mi,
ödeme mi avanstan mahsup mu) ve rapor bunları tür bazında detaylandırıyor.

---

## Requirements

### A. Hedef adı her yerde yazılır

- **R1.** **Taksitli kalemde de hedef başına durum görünür.** Giderler kalem listesinde kiranın hedef
  rozetleri taksitsiz kalemde olduğu gibi **taksitlendirilmiş kalemde de** çizilir; stopajı olan kira
  hiçbir durumda yalnız "Kira" diye görünmez. **Koşul taksit sayısına bakmaz, hedef sayısına bakar:**
  bugünkü `tekSatirliKira = d === DAVRANIS.KIRA && hedefler.every(h => h.toplamAdet === 1)`
  (`DonemRaporu.jsx:281`) yerine ölçüt **sıfırdan büyük hedef sayısı > 1** olur (ölçüt zaten var:
  `cokHedefliMi`). Hedefi tek olan kalem bugünkü tek rozetini korur (AC-3). Rozetin bugünkü tıklama
  davranışı (`onHedefDegistir`, `gider_odeme` ile ödeme penceresini açar) aynen kalır.
- **R2.** Aynı kural **personel kaleminde** de işler: maaş resmi, maaş elden, ek ödeme resmi ve ek
  ödeme elden hedeflerinin durumu kalem satırında okunur. **Taksitli hedefin rozeti kısaltılır**
  ("Vergi dairesi: Kısmen 2/6"), yoksa resmi'si on iki taksitli dört hedefli bir personel kaleminde dört
  rozet ve dört "Kısmen · kalan X" satırı tablo hücresini şişirir.
- **R3.** Hedef adları **tek modülden ve tek tablodan** gelir; ekran içinde yerel ad sabiti yazılmaz
  (bugün `DonemRaporu.jsx:284` `h.hedef === HEDEF.STOPAJ ? "Vergi dairesi" : "Kiraya veren"` diye elle
  yazıyor). **İki hâl, tek tablo:** bugünkü adlar yönelme hâlinde
  (`hedefAdi(ANA, KIRA)` → "Kiraya verene", `HEDEF_AD[STOPAJ]` → "Vergi dairesine (stopaj)",
  `HEDEF_AD[ANA]` → "Tedarikçiye"), çünkü ödeme cümlesi ve hata metni için tasarlandılar; rozet ve başlık
  **yalın hâl** ister. Bu yüzden aynı tablodan iki yardımcı türer: bugünkü `hedefAdi` (yönelme; Kasa
  satırı, ekstre, hata metinleri) ve yeni `hedefBasligi` (yalın; rozet ve başlık). İkinci bir ad listesi
  açılmaz.
- **R4.** Kasa hareket listesinde bir gider ödemesinin satırı, kalemin tarafı (tedarikçi, çalışan ya
  da tür) **yanında** ödemenin neyi kapattığını yazar. **Tek hedefli taksitli kalemde yazılacak bir hedef
  yoktur** (`hedefEtiketi` `cokHedefliMi` değilse `null` döner, `odemeYontemi.js:146`); orada eksik olan
  şey **taksit numarasıdır** ve Kasa satırında bugün hiç yok (`Kasa.jsx:221-224` yalnız taraf + hedef
  yazıyor). Bu yüzden Kasa satırı ödeme penceresindeki önceliği kullanır
  (`taksitAdi(h.taksitId) || hedefEtiketi(…)`, `OdemeGirisi.jsx:357`); çok hedefli taksitli kalemde ikisi
  birlikte okunur ("Vergi dairesine (stopaj) · 2/6. taksit"). `taksitAdi` de R3'ün tek kaynağına taşınır.
- **R5.** Ödeme penceresinin "Kayıtlı ödemeler" listesinde taksit adı hedefi zaten taşır; bu davranış
  korunur ve hedefsiz kalan satır kalmaz.

### B. Personel ödemesinin içeriği belirtilir

- **R6.** Personel kaleminin **ek ödeme türleri** (Fazla mesai, Prim, İkramiye) tutarlarıyla okunur.
  **K21 bozulmaz:** kalem listesinde personel kalemleri tek **kapalı** grup satırındadır ve tür kırılımı
  bugün yalnız grup açılınca yazılıyor (`DonemRaporu.jsx:97`, `EK_ODEME_TUR_AD`). Kırılım **grup
  açıldığında** çalışanın altındaki satırlarda tutarıyla okunur (bugünkü yer korunur); ek ödeme
  **hedefinin rozetinin** yanında yalnız tür adları özet olarak görünür ("Prim, İkramiye"), tutarsız.
  Kapalı grup satırı değişmez.
- **R7.** Ek ödeme hedefinin durumu gösterilirken türlerin kırılımı da okunur, böylece "Ek ödeme
  (resmi) ödendi" satırının neyi kapattığı belli olur.
- **R8.** **Avanstan mahsup ödemeden ayırt edilir** ve bu **zaten yapılmıştır** (QA turu ölçümü):
  `odemeYontemi.js:5,78` mahsubu `YONTEM_MAHSUP` ("Avanstan mahsup") olarak adlandırıyor, `YontemOzeti`
  karma kalemde yöntem bazında tutarları basıyor (`kalem-yontem-kirilimi`), yalnız mahsupla kapanan
  kalemde de etiket onu söylüyor. Bu madde **regresyon korumasıdır**, yeni iş değil: davranış bir AC ile
  sabitlenir.
- **R9.** Çalışan ekstresinde avans, mahsup ve ödeme satırları türüyle ve hedefiyle okunur; bu da **zaten
  yapılmıştır**: `EkstrePenceresi.jsx:12`'deki `ISLEM_AD` haritası borç, ödeme, maaş, "Avanstan mahsup" ve
  "Avans" adlarını veriyor, `:28` ise ödeme ve mahsup satırında `hedefEtiketi` ile hedefi yazıyor.
  Bu madde de regresyon korumasıdır.
- **R10.** Ek ödeme türleri **tek kaynaktan** adlandırılır (bugünkü `EK_ODEME_TUR_AD`); yeni bir ad
  listesi açılmaz.

### C. Rapor bunları detaylandırır

- **R11.** Aylık Gider ve Kasa Raporu'nda **ek ödemeler tür bazında** yazılır: Fazla mesai, Prim,
  İkramiye; her biri **tek** toplam tutarıyla. **Tutar resmi ve eldenin toplamıdır, ayrı yazılmaz**
  (R16 ve R21'in ölçüsü; mevcut çıktı testleri `"Resmi"`, `"Elden"`, `"Maaş ("`, `"Ek ödeme ("` dizelerini
  ve bileşen tutarlarını zaten yasaklıyor). Tek bileşenli ayda (yalnız resmi prim) tutar yine tür toplamı
  olarak basılır, kişi bazlı yorumlanacak bir ayrım yazılmaz.
- **R12.** **Stopaj raporda kendi satırındadır:** ayın kesilen stopajı, ödenen ve ay sonunda açık
  kalan stopaj borcu kira toplamından ayrı okunur. Bugün yalnız kesilen var (`gr.stopajToplam`); ödenen ve
  açık `odemeHedefleri(k, dav)`'ın `HEDEF.STOPAJ` hedefinden türer ve bu hedef kaynak yasağında **değildir**
  (yalnız `HEDEF.EK_RESMI` ve `HEDEF.EK_ELDEN` yasak). C2 gereği saf motora **tek** fonksiyon eklenir
  (`stopajOzeti`); rapor kurucusu kendi döngüsünü yazmaz.
- **R13.** **Çalışan avansları kendi kutusunda** detaylanır: ay içinde verilen, ay içinde mahsup
  edilen ve ay sonunda açık kalan avans (veri hazır: `hareketOzeti`'nin avans ve mahsup toplamları,
  `kasa.avansBorclari`). **Bugünkü "Açık çalışan avansı" bölümü kaldırılmaz**: o bölüm sıfırken de
  basılıyor; kaldırılırsa belge değişir ve AC-18 ile çatışır. Yeni kutu eklenir, eski satır ya yerinde
  kalır ya kutunun içine taşınır ama **sıfırken de basılır**.
- **R14.** *(R3 ile kaldırıldı, bkz. X8.)* Personel ödemelerinin **yöntem kırılımı** (nakit, havale, ...) toplu olarak okunur; bugün
  `donemYontemKirilimi` personel ödemelerini tek `personelK` sayısında topluyor ve yöntem bazında kırılım
  yok. C2 gereği `odemeYontemi`'ye bu kırılımı veren **tek** saf fonksiyon eklenir; fonksiyon kişi bilgisi
  taşımaz, rapor onu çağırır.
- **R15.** **Ek ödeme ve stopaj** bölümleri boşsa hiç basılmaz (0059 R14'ün yeni tablo kuralı). Avans
  bölümü R13 gereği bu kuralın dışındadır.

### D. Gizlilik sınırı yeniden çizilir

- **R16.** **Çalışan adı ve kişi bazlı tutar raporda yine yazılmaz.** Detay **yalnız tür bazında
  toplamdır**; hangi çalışanın prim aldığı, kimin eldeni ne kadar olduğu ve kimin avansı olduğu
  kâğıda girmez.
- **R17.** **Hiçbir kaynak yasağı gevşetilmez** (QA turu ölçümü; onay metnindeki "dar gevşetme" kararının
  gerekçesi ortadan kalktı, çünkü yasak zaten yolda değil). Ölçüm: `YASAKLI` regex'i
  (`ekOdemeler|EK_ODEME_TUR|fazlaCalisma` içerir) `giderRaporu.js`'i **taramıyor**; taranan dosyalar
  `printTemplates.js`, `raporSunumu.js`, `aylikRapor.js` ve `SettingsExport.jsx`. `giderRaporu.js`'i tarayan
  tek desen 0054'ün `DESEN`'i ve onda `ekOdemeler` / `EK_ODEME_TUR` / `fazlaCalisma` **yok**; yalnız
  `"ekResmi"`, `"ekElden"`, `HEDEF.EK_RESMI`, `HEDEF.EK_ELDEN`, dört hedef adının düz metni ve
  `personelHedefKirilimi` / `personelHedefTutarlari` / `PERSONEL_HEDEFLERI` yasak. Tür toplamı
  `ekOdemeler` + `EK_ODEME_TUR_AD` ile (ya da C2'nin tek fonksiyonuyla) üretilir, resmi/elden makinesine
  hiç dokunulmaz. **Tek daraltma R21'dedir** ve o bir kaynak yasağı değil, bir çıktı dizesi yasağıdır.
- **R18.** Koruma **çıktı temellidir**: ayırt edici çalışan adı ve tutarlarla üretilen belgede hiçbiri
  geçmez (0047'nin yöntemi).
- **R19.** Müşteriye giden şablonlar ve dışa aktarma **değişmez**; gider verisi yine yalnız bu
  belgeye girer.
- **R20.** **Bilinen sınır, kabul edilmesi gereken:** az çalışanlı bir ayda tür toplamı kişiyi
  dolaylı belli edebilir ("İkramiye 20.000" o ay tek kişiye verilmişse). Belge yalnız Giderler **ve**
  Finans **ve** Kasa'yı birlikte gören kullanıcıya açıktır; bu kitle için risk kabul edilir ve spec'te
  yazılı kalır.

### E. QA turunda eklenenler (R1)

- **R21.** **Tek çıktı yasağı daraltılır: `"mesai"` → `"Cumartesi mesaisi"`.**
  `tests/gider-gizlilik.test.js:128` yasaklı dizeler listesinde küçük harfli **`"mesai"`** var ve
  `toContain` büyük/küçük duyarlı olduğu için **"Fazla mesai" bu yasağa takılır**. Yasak, fixture'ın
  açıklaması için konmuştu (`aciklama: "Cumartesi mesaisi"`, yanında `"Cumartesi"` da yasaklı). Yasak
  **açıklamanın tamamına** daraltılır (`"Cumartesi mesaisi"`), tür adı serbest kalır; açıklamanın kâğıda
  girmemesi kuralı aynen sürer. Başka hiçbir yasak dize gevşetilmez.
- **R22.** **Yeni bölümler eklemelidir; mevcut dizeler ve satır biçimleri değişmez.** Çıktı testleri
  birebir sabitliyor: "Personel gideri", "Personel ödemeleri · N adet", "Çalışan avansları · N adet",
  "Avanstan mahsup · N adet", "Silinmiş kalem ödemeleri · N adet" ve `Ay geneli</td>…` satır kalıbı.
  R11–R14 bunlara dokunmaz, yalnız yeni kutu ekler.
- **R23.** **`giderRaporu.js` üzerindeki üç kaynak kısıtı korunur** (`tests/gider-gizlilik.test.js:157-163`):
  o dosyada `v.kalem` / `oge.kalem` / `o.kalem` okunmaz, `.taraf` geçen satır sayısı **bir** kalır ve
  `if (v.tur === "personel") return { personel: true, … tedarikci: "" … }` biçimi bozulmaz. Yeni toplamalar
  bu kısıtların içinde yazılır.
- **R24.** **"Vergi dairesi" iki ayrı kavramdır, ikisi de kalır.** `gider.VERGI_DAIRESI = "Vergi dairesi"`
  borç özetindeki **taraf (alacaklı)** adıdır; `HEDEF_AD[HEDEF.STOPAJ] = "Vergi dairesine (stopaj)"` ise
  **hedef** adıdır. Kaldırılan tek şey `DonemRaporu.jsx`'teki yerel kopyadır. R3'ün "tek kaynak" ve AC-5'in
  "aynı ad" ölçüsü bu iki kavramı tek dizeye indirmeyi istemez.
- **R25.** **Determinizm ölçüsü 0059 R24'tür:** aynı **girdiyle** iki çağrı birebir aynı HTML üretir,
  sıralamalar kararlıdır ve belge `new Date()` / `yerelBugun` okumaz.
- **R26.** **Görsel kanıt var olan ekrandan çıkar:** görüntü aracındaki `gider-kasa-raporu-belge` ekranı
  (0059) belgeyi satır içi çiziyor. Yeni bölümlerin farkı **bilinçlidir**; `0060-piksel-raporu.json` ve
  taban raporu üretilir. Kalem listesindeki yeni rozetler için Giderler ekranları kullanılır.
- **R27.** **Hedef adlarının tek kaynağı kaynak taramasıyla ölçülür:** `src/components/` altında hedef
  adlarının düz metni (ör. "Kiraya veren", "Vergi dairesi") yazılı kalmaz; adlar yalnız `odemeYontemi.js`'in
  tablosundan gelir. `VERGI_DAIRESI`'nin taraf adı olarak kullanımı bu taramanın dışındadır (R24).

### F. Plan onayında eklenenler (R2)

- **R28.** **Çıktı yasaklarının dar güncellenmesi (R17'nin düzeltmesi):** `giderRaporu.js`'te `ekOdemeler` kaynak yasağı
  (0047) **aynen kalır**; tür toplamı saf `gider.ekOdemeTurToplamlari`'ndan gelir. 0047 ve 0059 çıktı testleri, yeni
  ek ödeme kutusunu (`data-bolum="ek-odeme"`) belgeden çıkardıktan sonra eski yasak listesini kalan belgeye aynen uygular;
  kutu ayrıca sınanır: yalnız tür adları ve tür toplamları vardır, çalışan adı, açıklama, resmi/elden ve bileşen tutarı
  yoktur. Kutu dışındaki hiçbir koruma gevşemez. R21 (`"mesai"` → `"Cumartesi mesaisi"`) aynen.
- **R29.** **Yalın adlar:** kira ana hedef "Kiraya veren", stopaj "Vergi dairesi" (taksitsiz kiranın bugünkü rozetiyle
  birebir), normal kalemin ana hedefi "Tedarikçi", çok hedefli personel "Maaş (resmi)" / "Maaş (elden)" / "Ek ödeme
  (resmi)" / "Ek ödeme (elden)", tek hedefli personel "Çalışan", elden (personel dışı) "Elden". Yönelme adları
  (`hedefAdi`) değişmez.
- **R30.** **AC-6 taramasının kapsamı:** hedef adına birebir eşit dize ya da JSX metni aranır; gerekçeli istisnalar
  tedarikçinin "Vergi dairesi" alanı (başka kavram) ve cümle içi notlardır (`STOPAJ_KDV_NOTU`, `CIRO_YALNIZ_ANA_NEDENI`).
  Gider formunun stopaj bölüm başlığı ve satırı tablodan gelir.
- **R31.** **Stopaj özetinin kapsamı ayın kira kalemleridir:** kesilen = ödenen + ay sonunda açık.
- **R32.** *(R3 ile geçersiz: R14 rapordan çıkarıldı.)*
- **R33.** **Avans:** mevcut "KASA · AÇIK ÇALIŞAN AVANSI" kutusuna "Ay içinde verilen" ve "Ay içinde mahsup edilen"
  satırları eklenir (`hareketOzeti`'nin toplamları); başlık ve "Açık avans toplamı" satırı aynen kalır.
- **R34.** **Kısa rozet:** taksitli hedefte "Ad: Ödendi n/m", "Ad: Kısmen n/m", "Ad: Ödenmedi 0/m" (n = ödenmiş taksit);
  taksitsiz hedefte bugünkü metin.
- **R35.** **Kasa'da taksit adı ödeme penceresiyle aynıdır** (`taksitAdi`, tek kaynak): taksitli kalemde "Ad n/m. taksit",
  tek satırlı hedefte ad.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla.
- **C2.** **Yeni hesap yazılmaz:** tutarlar bugünkü motorlardan gelir (hedefler, ek ödeme kırılımı,
  avans borcu, yöntem kırılımı); rapor yalnız çağırır ve dizer. Tür bazında toplama gerekiyorsa saf
  motora **tek** fonksiyon eklenir, rapor kurucusu kendi döngüsünü yazmaz.
- **C3.** **Yeni ödeme hedefi açılmaz.** Prim ve ikramiye ayrı ayrı ödenebilir hâle gelmez; 0054'ün
  "aynı ayın bütün ek ödemeleri tek hedefte" kararı sürüyor. Bu iş **adlandırma ve gösterme** işidir.
- **C4.** Kalem tutarı, KDV, kova, makina maliyeti ve raporun bugünkü toplamları değişmez.
- **C5.** Dönem kilidi korunur: rapordaki her şey ay sonuna sabittir (0047 R26).
- **C6.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C7.** Kullanıcıya görünen metinler Türkçedir.
- **C8.** **Kaynak yasakları gevşetilmez** (R17); tek istisna R21'in çıktı dizesi daraltmasıdır ve o bir
  kaynak taraması değildir.
- **C9.** **K21 korunur:** kalem listesinde personel ayrıntısı varsayılan kapalıdır; tür kırılımı yalnız
  grup açılınca okunur (R6).
- **C10.** Raporun bugünkü bölümleri, dizeleri ve satır biçimleri **değişmez**; bu iş eklemelidir (R22).

### KAPSAM DIŞI

- **X1.** Prim, ikramiye ve fazla mesainin **ayrı ayrı ödenebilmesi** (her birinin kendi hedefi,
  kendi vadesi) — *neden:* C3; model, taksit satırları, sunucu ve birleştirme etkilenir. Ayrı iştir;
  istenirse yeni spec açılır.
- **X2.** Çalışan adının ya da kişi bazlı tutarın rapora girmesi — *neden:* R16; gizlilik sınırı
  bilinçli olarak korunur.
- **X3.** Gider türünün adının değişmesi (kira kaleminin türünün "Stopaj" olması) — *neden:* kalem
  bir **kira** giderdir; stopaj onun ödeme hedefidir. Türü değiştirmek tahakkuku, kovayı ve raporu
  bozar; doğru yer hedef adıdır (R1).
- **X4.** Avansın gider sayılması — *neden:* 0024 B kararı sürüyor; avans bir harekettir, gider değil.
- **X5.** Aylık faaliyet raporunun değişmesi ve dışa aktarma — *neden:* R19.
- **X6.** Bugünkü "Açık çalışan avansı" bölümünün sıfırken gizlenmesi — *neden:* R13; bugün her zaman
  basılıyor, gizlemek belgeyi değiştirir.
- **X8.** *(R3)* Personel ödemelerinin yöntem kırılımının rapora girmesi — *neden:* elden genelde nakit, resmi havaleyle
  ödendiği için kırılım resmi/elden ayrımını ve az kadroda kişinin maaşını açığa çıkarır (R16, AC-21). Ekranda (Giderler ›
  Dönem Raporu, ayrıntı açıkken) durur.
- **X7.** Ek ödeme tutarının resmi ve elden olarak ayrı yazılması — *neden:* R11, R16; tür toplamı tek
  tutardır.

---

## Context

- **Birinci şikâyetin kökü bulundu (doğrulandı).** Giderler kalem listesinin ödeme hücresinde kira
  kaleminin hedef başına rozetleri **yalnız her hedefi tek taksitli olan** kira kaleminde çiziliyor
  (`DonemRaporu.jsx` `planliHucre`, `tekSatirliKira` koşulu). Stopaj ya da kira taksitlendirilince
  satır tek bir toplu duruma düşüyor ("Kısmen ödendi n/m") ve hedef adları yalnız "Ödeme planı"
  penceresinin içinde kalıyor. Geriye tür sütunundaki "Kira" kalıyor; kullanıcının gördüğü tam olarak
  bu. Rozetteki adlar da o hücrede **yerel olarak** yazılı (kiranın iki adı elle), bu yüzden personelin
  dört hedefi için kullanılamıyor (R3 bunu tek kaynağa çeker).
- **Hedef adı aslında birçok yerde doğru.** Ödeme hatırlatıcısı stopaj satırına "Vergi dairesi"
  yazıyor, ödeme planı penceresi "Vergi dairesine (stopaj)" yazıyor, ödeme penceresindeki kayıtlı
  ödemeler taksit adıyla hedefi taşıyor, Kasa hareket listesi 0051 B'den beri hedefi ekliyor. Yani iş
  **yeni bir kavram kurmak değil**, var olan adı eksik kalan yerlere taşımak. Bu da işi küçültüyor.
- **Ek ödeme türü ekranda tek bir yerde var.** Dönem Raporu'nun tür kırılımındaki personel ayrıntısı
  (varsayılan kapalı) ek ödeme satırlarını türüyle yazıyor. Kalem listesinde yalnız "Ek ödeme
  <toplam>" var; ödeme hedefi 0054'ten beri "Ek ödeme (resmi)" / "Ek ödeme (elden)" diyor, hangi ek
  ödeme olduğunu söylemiyor. Tür adları `EK_ODEME_TUR_AD`'de hazır (R10).
- **Raporda ek ödeme hiç yok; kaynak yasağı ise sanıldığı yerde değil (QA turu düzeltmesi).** 0047
  personeli bilerek tek satıra indirdi. `ekOdemeler` / `EK_ODEME_TUR` / `fazlaCalisma` yasağı (`YASAKLI`)
  `printTemplates.js`, `raporSunumu.js`, `aylikRapor.js` ve `SettingsExport.jsx`'i tarıyor,
  **`giderRaporu.js`'i taramıyor**. `giderRaporu.js`'i tarayan tek desen 0054'ün `DESEN`'i ve o yalnız
  `"ekResmi"`, `"ekElden"`, `HEDEF.EK_RESMI`, `HEDEF.EK_ELDEN`, dört hedef adının düz metni ve
  `personelHedefKirilimi` / `personelHedefTutarlari` / `PERSONEL_HEDEFLERI`'yi yasaklıyor. Yani R11'in
  önünde **kaynak yasağı yok**; önündeki tek engel bir **çıktı dizesi** yasağıdır (`"mesai"`, R21). Bu
  yüzden R17 "gevşetme yok" diye yazıldı: gereksiz gevşetme duvarı kalıcı olarak zayıflatırdı.
- **İki şey zaten yapılmış.** Avanstan mahsubun ödemeden ayırt edilmesi (`YONTEM_MAHSUP` + `YontemOzeti`
  karma kırılımı) ve çalışan ekstresinde tür ile hedefin okunması (`ISLEM_AD` + `hedefEtiketi`) bugün
  çalışıyor; R8 ve R9 bu yüzden regresyon korumasına indirildi. İşin gerçek yükü hedef rozetleri (R1, R2),
  tek ad kaynağı (R3, R27) ve raporun yeni bölümleri (R11–R14).
- **Adlar yönelme hâlinde yazılmış.** Tek kaynaktaki adlar ödeme cümlesi için tasarlandı
  (`hedefAdi(ANA, KIRA)` → "Kiraya verene", `HEDEF_AD[STOPAJ]` → "Vergi dairesine (stopaj)"), oysa rozet
  yalın hâl istiyor ve bugün yerel olarak "Kiraya veren" / "Vergi dairesi" yazıyor. Tek dizeye indirmek
  ya rozeti ya ödeme metnini bozardı; çözüm tek tablodan iki hâl türetmek (R3).
- **Avans raporda var ama dağınık.** Hareket özetinde "Avans" ve "Mahsup" adetleri, hesapsız
  listesinde toplu bir satır, altta "Açık çalışan avansı" toplamı var; ay içinde verilen, mahsup
  edilen ve açık kalan tek yerde yan yana okunmuyor (R13 bunu bir kutuda toplar).
- **Gizlilik ve okunurluk burada çatışıyor.** Kullanıcının istediği ayrıntı (prim, ikramiye) personel
  verisidir; 0047 sınırı adı ve kişi bazlı tutarı yasaklıyordu. Tür bazında toplam bu sınırın içinde
  kalır, ama küçük kadroda dolaylı tanınma riski doğar (R20). Bunu gizlemek belgeyi yine işe yaramaz
  hâle getirirdi; doğru yol riski yazıp kapıyı (Giderler + Finans + Kasa) dar tutmaktır.

---

## Acceptance Criteria

### Hedef adları

- **AC-1.** Stopajı olan ve **taksitlendirilmiş** kira kaleminin listedeki satırında kiraya veren ve
  vergi dairesi hedeflerinin durumu ayrı ayrı okunur.
- **AC-2.** Aynı kalem hiçbir durumda yalnız "Kira" diye görünmez; stopaj tarafı adıyla yazılır.
- **AC-3.** Taksitsiz kira kaleminin bugünkü görünümü bozulmaz.
- **AC-4.** Personel kaleminin satırında maaş ve ek ödeme hedeflerinin durumu okunur.
- **AC-5.** Hedef adları listede, Kasa'da, ekstrede, hatırlatıcıda ve ödeme penceresinde **aynı tablodan**
  gelir (hâl eki bağlama göre: rozette yalın, ödeme metninde yönelme); iki ayrı ad listesi yoktur.
- **AC-6.** Ekranlarda yerel hedef adı sabiti kalmaz; kaynak taraması `src/components/` altında hedef
  adlarının düz metnini bulamaz (`VERGI_DAIRESI`'nin taraf adı kullanımı hariç, R24).
- **AC-7.** Kasa hareket listesinde **tek hedefli** taksitli bir kalemin ödemesi taksit numarasını, **çok
  hedefli** taksitli kalemin ödemesi hedef adını ve taksit numarasını birlikte yazar.

### Personel içeriği

- **AC-8.** Kalem satırında ek ödemeler türüyle ve tutarıyla okunur (Fazla mesai, Prim, İkramiye).
- **AC-9.** Ek ödeme hedefinin rozetinin yanında tür adları özet olarak okunur; tutarlı kırılım yalnız
  personel grubu açılınca görünür (K21 bozulmaz).
- **AC-10.** Bir kalemin kapanan tutarının avanstan mahsup kısmı para ödemesinden ayırt edilir
  (**bugünkü davranış korunur**, regresyon).
- **AC-11.** Çalışan ekstresinde avans, mahsup ve ödeme satırları türüyle ve hedefiyle okunur
  (**bugünkü davranış korunur**, regresyon).
- **AC-12.** Ek ödeme türü adları tek kaynaktan gelir.

### Rapor

- **AC-13.** Raporda ek ödemeler tür bazında **tek** toplam tutarıyla basılır (resmi + elden birlikte);
  "Fazla mesai" etiketi belgede geçebilir.
- **AC-14.** Raporda ayın kesilen, ödenen ve ay sonunda açık stopajı kira toplamından ayrı okunur.
- **AC-15.** Raporda ay içinde verilen, mahsup edilen ve ay sonunda açık avans okunur; **açık avans satırı
  sıfırken de basılır** (R13, X6).
- **AC-16.** *(R3)* Personel ödemelerinin yöntem kırılımı rapora girmez; toplu "Personel ödemeleri" satırı korunur.
- **AC-17.** O ay ek ödeme ya da stopaj yoksa ilgili bölüm hiç basılmaz; avans bölümü bu kuralın
  dışındadır (R15).
- **AC-18.** Raporun bugünkü toplamları (gider toplamı, KDV, ödenen, ödenmeyen, bakiyeler) bu işten
  önce ve sonra aynıdır.
- **AC-19.** Aynı **girdiyle** iki çağrı birebir aynı HTML üretir; sıralamalar kararlıdır ve belge
  `new Date()` / `yerelBugun` okumaz (0059 R24).

### Gizlilik

- **AC-20.** Ayırt edici çalışan adlarıyla üretilen belgede hiçbir çalışan adı geçmez.
- **AC-21.** Ayırt edici kişi bazlı tutarlarla üretilen belgede resmi/elden ayrımı ve kişi bazlı tutar
  geçmez.
- **AC-22.** Kişi bazlı alan adlarının rapor kurucusundaki yasağı yürürlüktedir ve **hiçbir kaynak
  taraması gevşetilmemiştir** (R17).
- **AC-23.** Müşteri şablonları, e-posta şablonları, aylık faaliyet raporu ve dışa aktarma gider
  alanlarını yine okumaz.

### QA turunda eklenenler (R1)

- **AC-24.** Rozet koşulu hedef sayısına bakar: tek hedefli taksitli kalem tek rozetini korur, çok hedefli
  taksitli kalem hedef rozetlerini gösterir (R1).
- **AC-25.** Dört hedefli, resmi'si taksitli personel kaleminin satırı dört rozeti kısa biçimde gösterir
  ("… Kısmen 2/6") ve hücre taşmaz (R2).
- **AC-26.** Rozete tıklamak ödeme penceresini o hedefle açar ve bu yalnız `gider_odeme` ile görünür
  (bugünkü davranış).
- **AC-27.** `hedefAdi` (yönelme) ve `hedefBasligi` (yalın) aynı tablodan türer; tablo tek yerdedir (R3).
- **AC-28.** `VERGI_DAIRESI` taraf adı olarak, `HEDEF_AD[STOPAJ]` hedef adı olarak kalır; yalnız
  `DonemRaporu.jsx`'teki yerel kopya kaldırılmıştır (R24).
- **AC-29.** `taksitAdi` tek kaynaktadır ve Kasa satırı ile ödeme penceresi aynı adı kullanır (R4).
- **AC-30.** Stopaj özeti saf motorda tek fonksiyondan gelir; rapor kurucusu kendi döngüsünü yazmaz
  (R12, C2).
- **AC-31.** *(R3)* Rapor nesnesi personel ödemelerinin yöntem kırılımını taşımaz; tek çalışanlı ayda maaş tutarı yöntem
  tablosunda geçmez (X8).
- **AC-32.** Çıktı testindeki tek daraltma `"mesai"` → `"Cumartesi mesaisi"`'dir; başka yasak dize
  gevşetilmemiştir (R21).
- **AC-33.** Mevcut toplu satır metinleri ve `Ay geneli` satır kalıbı değişmemiştir (R22).
- **AC-34.** `giderRaporu.js`'te `v.kalem` okunmaz, `.taraf` geçen satır sayısı birdir ve personel dalının
  biçimi korunur (R23).
- **AC-35.** Yalnız resmi primi olan bir ayda tür toplamı tek tutar olarak basılır ve resmi/elden ayrımı
  çıkarılamaz (R11, X7).
- **AC-36.** Grup kapalıyken personel kaleminin satırında ek ödeme türü ve tutarı görünmez (C9).
- **AC-37.** Raporun bugünkü bölümleri ve dizeleri korunarak yeni kutular eklenmiştir (C10).
- **AC-38.** Görsel kanıt `gider-kasa-raporu-belge` ekranından ve Giderler ekranlarından üretilmiştir
  (R26).

### Plan onayında eklenenler (R2)

- **AC-39.** Ek ödeme kutusu dışındaki belgeye 0047 ve 0059'un yasak listeleri aynen uygulanır; kutu yalnız tür adı ve
  tür toplamı içerir (R28).
- **AC-40.** Taksitsiz kiranın rozet metni bu işten önceki ile birebir aynıdır ("Kiraya veren: …", "Vergi dairesi: …")
  (R29).
- **AC-41.** Stopaj kutusunda kesilen = ödenen + açık (R31).
- **AC-42.** Avans kutusunda başlık ve "Açık avans toplamı" satırı korunur, ay içi verilen ve mahsup satırları eklenir
  (R33).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Hedef adı tek tablodan geliyor; `hedefAdi` (yönelme) ve `hedefBasligi` (yalın) aynı tablodan türüyor
      ve yerel ad sabitleri kaldırıldı (R3, AC-6, AC-27, kaynak taraması).
- [x] **Hiçbir kaynak taraması gevşetilmedi**; tek daraltma çıktı testindeki yasak dizenin
      `"mesai"` yerine `"Cumartesi mesaisi"` olmasıdır (R17, R21, AC-22, AC-32).
- [x] `giderRaporu.js`'in üç kaynak kısıtı (`v.kalem` yok, tek `.taraf`, personel dalının biçimi) yeşil
      (R23, AC-34).
- [x] Mevcut toplu satır metinleri, `Ay geneli` satır kalıbı ve "Açık çalışan avansı" bölümü korundu
      (R13, R22, AC-33, AC-37).
- [x] R8 ve R9'un bugünkü davranışı regresyon testiyle sabitlendi (AC-10, AC-11).
- [x] Çıktı temelli gizlilik testi yeni bölümleri kapsıyor (AC-20, AC-21, AC-35).
- [x] Raporun bugünkü toplamlarının değişmediği çapraz testle gösterildi (AC-18).
- [x] Görsel kanıt eklendi (`docs/evidence/0060-*.jpg` + `0060-piksel-raporu.json`, yeni taban): araçtaki
      `gider-kasa-raporu-belge` ekranından raporun yeni bölümleri, Giderler ekranlarından taksitli stopajın
      yeni rozetleri ve personel kaleminin açılmış grup kırılımı (R26, AC-38).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: hedef adının tek tablosu ve iki hâli, rozet koşulunun hedef sayısına
      bakması, ek ödeme türünün görüldüğü yerler (K21 kapalı grup kuralı dahil), gizlilik sınırının yeni
      çizgisi (tür bazında evet, kişi bazında hayır) ve kaynak yasaklarının gevşetilmediği.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R2 plan onayı (Q1–Q10; R28–R35, AC-39…AC-42; R17 düzeltildi), R3 uygulamada bulunan çelişki (R14 rapordan çıkarıldı, X8). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: 4 bulgu (ek ödeme özeti hedef başına değildi, kira özetinde elle ad, AC-5/AC-23 adlı test, plan satırı). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Dördü de gerçekti; biri doğruluk (yanlış tür özeti), üçü kapsam/belge. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Toplu rozet → hedef rozetleri ve rapor şerit listesi bilinçli değişti (TY onaylı); taksitsiz kira 0 piksel. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir gizlilik sınırını "tür bazında evet" diye çizerken her yeni kırılımın tek kişilik durumda neyi açığa çıkardığı ayrıca sorulmalı: yöntem kırılımı tür bazında görünüyordu ama elden = nakit olduğu için resmi/elden ayrımını taşıyordu ve ancak mevcut sabit sayılı test düşünce görüldü. İkincisi: "tek daraltma" gibi bir iddiayı spec'e yazmadan önce bütün test dosyalarındaki yasak listeleri taranmalı; aynı sınırı koruyan üç ayrı test vardı.
