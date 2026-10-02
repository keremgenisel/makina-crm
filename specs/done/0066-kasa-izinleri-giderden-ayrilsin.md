# 0066 — Kasa İşlemleri İzin Ekranında Giderden Ayrılsın

| | |
|---|---|
| **Durum** | Tamamlandı (commit `169e508`, dal `feat/0066-kasa-izin`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar > Sunucu > Kullanıcı Yönetimi > İşlem İzinleri (yalnız izin ekranı) |
| **Bağımlı spec'ler** | 0009/0011 (görsel kanıt kuralı) · 0024 (kasa izinleri) · 0052 (Kasa sekme izni) · 0058 (kasa iş listesi izni) |
| **Revizyon** | R1 (QA turu, 2026-10-02): geliştirici hazırlığı denetimi, 16 bulgu işlendi, 3'ü bloklayıcıydı. Emsalin **grup adına göre değil bayrağa göre** süzdüğü ve Kasa için hazır bir anahtar (`KASA_EYLEM_IDLERI`) olduğu bulundu (R4), paylaşılan anahtarın sonucunun eksik anlatıldığı ve ayrı durum yazılırsa izinlerin sessizce daralacağı görüldü (R5, AC-5), akordeon başlığı ile grup adının birbirini tekrarladığı tespit edildi (R1, R8). R9–R14, C5, X4 ve AC-11…AC-22 eklendi.<br>**R2 (2026-10-02, plan onayı):** bütün öneriler kabul (Q1–Q7): ayrım grup düzeyinde, tanım dosyasındaki tek yardımcıyla (R15), ipucu koşulu 0052'nin `gorunurSekmeler` kuralını çağırır (R16), ortak anahtar notu ve varsayılan metinleri tek sabit (R17), ipucu yalnız kutular çizilirken (R18), grup adları testi yeni yazılır (R19, AC-20 düzeltmesi), AC-10 sürüm karşılaştırmasıyla ölçülür (R20), görsel kanıt düzeneği (R21). AC-23…AC-26. |

---

## Intent

İşlem izinleri ekranında **Kasa işlemleri, Gider işlemlerinin içinde** duruyor: hesap ekleme, virman ve
avans kutuları "Gider işlemleri" akordeonunun son grubu. Oysa Kasa kendi sekmesi, kendi ekranı ve
0052'den beri kendi sekme izni olan ayrı bir bölüm. Yöneticinin "bu kullanıcı kasaya dokunabilsin mi"
sorusunu, gider izinlerinin arasında aramak zorunda kalması yanlış.

Başarı şu demek: izin ekranında Kasa işlemleri kendi başlığı altında duruyor ve yönetici iki bölümü
ayrı ayrı okuyabiliyor.

---

## Requirements

- **R1.** İzin ekranında **"Kasa işlemleri" kendi akordeonunda** çizilir: hesap ekleme/düzenleme/kapatma
  ve silme, virman, çalışana avans. **Grup adı "Hesaplar ve hareketler" olur** (bugün "Kasa ve hesaplar"):
  akordeonda tek grup olduğu için başlık ile grup adı "Kasa işlemleri → Kasa ve hesaplar" diye birbirini
  tekrarlardı. Servis emsalinde bu sorun yok çünkü orada dört anlamlı alt başlık var. Grup adı kullanıcıya
  görünür bir **alt başlıktır ama bir izin etiketi değildir**, bu yüzden R8 ihlal edilmez;
  `tests/server-permission-defs.test.js` grup adlarını birebir sabitlediği için o test de güncellenir.
- **R2.** Gider işlemleri akordeonunda yalnız gider izinleri kalır (kalem işlemleri, tanım yönetimi,
  tedarikçi yönetimi). **Gider akordeonu kasa ipucunu artık üretmez:** bugün ipucu gider grupları üzerinde
  hesaplanıyor (`UserManager.jsx:179` `giderGruplari` map'i); hesaplama Kasa akordeonuna taşınır ve gider
  tarafındaki dal kaldırılır, yoksa ipucu iki yerde çizilir ya da ölü kod kalır.
- **R3.** **İzin boyutu değişmez:** iki akordeon da bugünkü `giderActions` dizisini yazar. Sunucu
  denetimi, veritabanındaki kullanıcı izinleri ve mevcut kullanıcıların yetkileri **aynı kalır**; göç
  gerekmez.
- **R4.** Ayrım **`KASA_EYLEM_IDLERI` kümesine göre** yapılır; kaynakta izin listesi **tek** kalır
  (`GIDER_ACTION_GROUPS`), ikinci bir liste kopyalanmaz. **Ad eşleşmesi ve yeni bayrak yazılmaz.**
  Düzeltme (QA turu): Servis Panosu emsali grup adına göre değil, grup üzerindeki **boolean bayrağa** göre
  süzüyor (`UserManager.jsx:176` `servisPanoGrubuMu = (g) => g.servisPano === true`); Kasa için ise anahtar
  **zaten var**, `serverPermissionDefs.js:27` `KASA_EYLEM_IDLERI = new Set(["kasa_hesap", "virman", "avans"])`
  ve `UserManager.jsx:179` 0052 ipucunu bugün tam olarak bu kümeyle eşleştiriyor. Ad eşleşmesi kırılgandır
  (grup yeniden adlandırılınca ayrım sessizce bozulur, R1 zaten adı değiştiriyor), yeni bayrak gereksiz bir
  meta alandır; mevcut küme hem tek kaynak hem ipucu mantığıyla ortaktır.
- **R5.** İki akordeon aynı "özelleştir" anahtarını paylaşır ve ekranda bu **yazılı** olur: gider
  izinlerini özelleştiren yönetici kasa izinlerini de özelleştirmiş olur. **Üç durum paylaşılır, ayrı durum
  yazılmaz:** `on: editGiderActionsOn`, `selected: editGiderActions`, `setSelected: setEditGiderActions`
  (`UserManager.jsx:192-194`). Sonuçları:
  **(a)** anahtarı iki akordeondan biri açarsa `setOn` bütün `allGiderActionIds`'i ön işaretler, yani
  Kasa akordeonundan açmak gider kimliklerini de işaretler;
  **(b)** kapatınca ikisi birden varsayılana döner;
  **(c)** tek tek kutular birbirini etkilemez (aynı dizi, farklı kimlikler).
  Ayrı bir `editKasaActionsOn` durumu yazılırsa kısmi dizi kaydedilir ve C3 ihlal edilir; bu yüzden ayrı
  durum **yasaktır**.
- **R6.** 0052'nin "Kasa sekmesi olmayan kullanıcıda bu kutular etkisizdir" ipucu **Kasa akordeonunda**
  durur. `data-testid="kasa-etkisiz-ipucu"` **korunur** (yalnız hangi akordeonun içinde olduğu değişir),
  böylece 0052'nin `ui/kasa-sekme-izni.test.jsx` testi kırılmadan geçer. **Koşulu düzeltilir:** bugün yalnız
  `!editTabs.includes("kasa")` denetleniyor (`UserManager.jsx:179`), oysa 0052 Kasa'nın görünürlüğünü
  **kasa + Giderler + Finans** üçlüsüne bağladı; `tabs: ["kasa"]` ama finansı olmayan kullanıcıda Kasa
  görünmez ama ipucu çizilmez. İpucunun koşulu 0052'nin görünürlük kuralını birebir yansıtır.
- **R7.** Kasa akordeonu Gider akordeonundan **hemen sonra** gelir (menüdeki sıra: Giderler, sonra Kasa).
  Bu, servis emsalinin konumundan **bilinçli bir sapmadır**: bugünkü sıra müşteri, bayi, stok, finans,
  gider, evrak, notlar, **servis**, ayarlar; yani Servis Panosu akordeonu ebeveyninin yanında değil sonda.
  Kasa gider'in arkasına konur ve bu sıra bir AC ile sabitlenir, yoksa uygulamada "emsale uyalım" diye sona
  atılır.
- **R8.** Kutuların **etiketleri ve kimlikleri** değişmez. Grup adı bir izin etiketi değildir ve R1 gereği
  değişir; bu ayrım burada yazılıdır.

### QA turunda eklenenler (R1)

- **R9.** **İki akordeonun "varsayılan" metni tek dizi gerçeğini söyler.** Bugün gider girdisi
  `emptyText: "Varsayılan (Giderler sekmesi açıksa tüm gider işlemleri açık)"` taşıyor
  (`UserManager.jsx:194`); ayrımdan sonra bu metin kasa kutularını da kapsamaya devam eder ama ekranda
  görünmez. Gider metni "…tüm gider **ve kasa** işlemleri açık" olarak düzeltilir ve Kasa akordeonuna aynı
  gerçeği söyleyen kendi metni yazılır. Yöneticinin "özelleştirmedim, kasa serbest mi" sorusu tam burada
  doğar ve R5'in amacı bu.
- **R10.** **Yeni bir kasa izni sessizce Gider akordeonuna düşemez.** Ayrım `KASA_EYLEM_IDLERI`'ye
  dayandığı için `GIDER_ACTION_GROUPS`'a eklenen ama kümeye eklenmeyen bir kimlik gider akordeonunda
  görünür. `tests/server-permission-defs.test.js`'e servisPano testinin üç iddiasının karşılığı eklenir:
  (1) kasa grubunun kimlikleri `KASA_EYLEM_IDLERI` ile **birebir eşit**, (2) gider akordeonuna kasa kimliği
  sızmaz, (3) iki akordeonun kimliklerinin birleşimi `GIDER_ACTION_GROUPS`'un tamamı.
- **R11.** **AC-9'un ölçüsü:** bilinen bir `giderActions` dizisi olan kullanıcı izin ekranında açılır,
  **hiçbir şeye dokunulmadan** kaydedilir ve kaydedilen dizi birebir aynı çıkar (sıra dahil). Bu işin tek
  gerçek riski kaydetme yolunun diziyi yeniden kurmasıdır.
- **R12.** **AC-10'un ölçüsü:** `electron/serverAuth.cjs` bu işte hiç değişmez (diff boş) ve
  `server-authz.test.js` ile `scripts/tests/server-security.cjs` dokunulmadan yeşil kalır.
- **R13.** **Görsel kanıt:** izin ekranı görüntü aracında çekilebiliyor (0052'nin kanıt raporu "izin
  ekranı"nı içeriyor) ve `UserManager` `tasarim.jsx` kullanmadığı için `kanit-eslemesi.json` kaydı yoktur.
  İki akordeonu birlikte gösteren bir görünüm üretilir, `0066-piksel-raporu.json` ve taban raporu yazılır;
  fark **bilinçlidir** (yeni akordeon).
- **R14.** **"Tek liste"nin kapsamı:** `GIDER_ACTION_GROUPS` tek tanımdır, iki akordeon aynı diziden
  süzülür ve `allGiderActionIds` tek yerde hesaplanır. İki ayrı süzülmüş **görünüm** olması tek liste
  kuralını bozmaz.

### Plan onayında eklenenler (R2)

- **R15.** **Ayrım grup düzeyindedir ve tek yardımcıdadır.** İçinde `KASA_EYLEM_IDLERI` kimliği olan grup bütün olarak
  Kasa akordeonuna gider; `serverPermissionDefs.js` `kasaGrubuMu(g)` ile `GIDER_AKORDEON_GRUPLARI` /
  `KASA_AKORDEON_GRUPLARI` görünümlerini verir (ikisi de `GIDER_ACTION_GROUPS`'tan süzülür, R14). UserManager ve testler
  aynı yardımcıyı kullanır. Kasa grubuna kümede olmayan bir kimlik eklenirse AC-12 kırılır (R10).
- **R16.** **İpucunun koşulu tek kuraldan:** UserManager `gorunurSekmeler(ALL_TABS, "active", { role: "user",
  permissions: JSON.stringify({ tabs: editTabs }) })` sonucunda Kasa yoksa ipucunu çizer; 0052'nin üçlü kuralı elle
  yeniden yazılmaz (sekme listesi tanımsız kullanıcı da doğru ele alınır).
- **R17.** **Ortak anahtar notu ve varsayılan metinleri tek sabit:** iki akordeonda "Bu kullanıcı için özelleştir"
  satırının altında, anahtar açık ya da kapalıyken görünen not `GIDER_KASA_ORTAK_NOT` ("Bu ayar Gider ve Kasa
  işlemlerini birlikte yönetir; birini özelleştirmek ikisini de özelleştirir."). Varsayılan metinleri: Gider
  "Varsayılan (Giderler sekmesi açıksa tüm gider ve kasa işlemleri açık)", Kasa "Varsayılan (Kasa sekmesi açıksa tüm
  kasa ve gider işlemleri açık)". Hepsi `serverPermissionDefs.js`'te; testler oradan okur.
- **R18.** **İpucu yalnız kutular çizilirken görünür** (bugünkü davranış): "özelleştir" kapalıyken kutu yoktur, ipucunun
  söyleyeceği bir şey yoktur.
- **R19.** **AC-20 düzeltmesi:** `tests/server-permission-defs.test.js` bugün yalnız servis gruplarının adlarını
  sabitliyor, gider gruplarını değil (R1'deki iddia yanlıştı). Gider ve kasa akordeonlarının grup adlarını birebir
  sabitleyen yeni test yazılır.
- **R20.** **AC-10'un ölçüsü sürüm karşılaştırmasıdır:** `git diff -- electron/serverAuth.cjs` boş çıktısı ve
  `server-authz.test.js` ile Electron'da `server-security.test.js` raporda çıktılarıyla gösterilir; dosyanın özetini
  sabitleyen bir test yazılmaz (sonraki her serverAuth işini kırardı).
- **R21.** **Görsel kanıt:** `kullanici-izin-kasa-ipucu` ekranının adımları Kasa akordeonunu açar; yeni
  `kullanici-izin-kasa-0066` ekranı iki akordeonu birlikte açık gösterir. UserManager sözlüğü kullanmadığı için
  `kanit-eslemesi.json` kaydı yoktur; TY onayı rapor üzerinden alınır.

---

## Constraints

- **C1.** Yeni izin boyutu, yeni izin kimliği ve yeni kalıcı alan yoktur.
- **C2.** Sunucu yazma denetimi (`serverAuth.cjs`) değişmez.
- **C3.** Bu yalnız **izin ekranının düzeni**dir; hiçbir kullanıcının yetkisi bu işle genişlemez ya da
  daralmaz.
- **C4.** Kullanıcıya görünen metinler Türkçedir.
- **C5.** **İki akordeon durumlarını paylaşır** (R5); ayrı bir "özelleştir" durumu, ayrı bir seçim dizisi ya
  da ayrı bir `setSelected` yazılmaz.

### KAPSAM DIŞI

- **X1.** **Yeni `kasaActions` izin boyutu** — *neden:* gerçek ayrım demek sunucuda yeni bölüm eşlemesi,
  veritabanındaki kullanıcı izinlerinin göçü (bugün kasa kimlikleri `giderActions` dizisinde duruyor) ve
  uçtan uca güvenlik testlerinin yeniden yazılması. Karşılığı yok, çünkü **Kasa sekmesi Giderler'i
  önkoşul tutuyor** (0052): ikisi zaten birlikte veriliyor. İstenirse ayrı ve çok daha büyük iştir.
- **X2.** Sunucu, kullanıcı yönetimi ve geçmiş ekranlarının yeniden düzenlenmesi — *neden:* istenen tek
  şey Kasa'nın giderden ayrılması.
- **X3.** Kasa izinlerinin Kasa sekmesi olmadan verilebilmesi — *neden:* 0052'nin önkoşul kuralı
  korunuyor.
- **X4.** Kasa izinlerinin alt gruplara bölünmesi (hesaplar / hareketler ayrı alt başlık) — *neden:* üç
  kimlik tek başlıkta okunur; bölmek akordeonu gereksiz derinleştirir. Servis emsalinde dört alt grup var
  çünkü orada on bir izin vardı.

---

## Context

- **Bugünkü yapı (doğrulandı).** İzin tanımlarında "Kasa ve hesaplar" bir **grup** ve bu grup
  `GIDER_ACTION_GROUPS` dizisinin içinde: yani ekranda Gider işlemleri akordeonunun son bölümü ve aynı
  `giderActions` iznini yazıyor.
- **Hazır emsal var, ama mekanizması ad değil bayrak (QA turu düzeltmesi).** Servis Panosu izinleri de
  müşteri izinleriyle aynı boyutta (`customerActions`) duruyor ve ekranda kendi akordeonunda; süzme
  **grup üzerindeki `servisPano: true` bayrağıyla** yapılıyor (`UserManager.jsx:176`), grup adıyla değil.
  `CLAUDE.md`'nin "grup adı `Makina Geçmişi — Servisler` ile süzülüyor" cümlesi eskimiştir ve bu işle
  düzeltilir. Kasa için ise hazır bir anahtar var: `KASA_EYLEM_IDLERI` kümesi, ipucu mantığında bugün de
  kullanılıyor (R4).
- **Durumlar zorunlu olarak paylaşılır.** Gider girdisi üç durumu birlikte taşıyor
  (`on` / `selected` / `setSelected`) ve `setOn` açılışta bütün `allGiderActionIds`'i işaretliyor
  (`UserManager.jsx:192-194`). İki akordeon aynı diziyi yazdığı için bu paylaşım zorunludur; ayrı durum
  yazmak kısmi dizi kaydetmek demektir (R5, C5).
- **Akordeon sırası.** Bugünkü sıra: müşteri, bayi, stok, finans, **gider**, evrak, notlar, **servis**,
  ayarlar. Servis akordeonu ebeveyninin yanında değil sonda; Kasa bilinçli olarak gider'in arkasına konur
  (R7).
- **Boyutu ayırmak neden gereksiz.** 0052 Kasa sekmesini Giderler **ve** Finans'ın görünür olmasına
  bağladı. Kasa'yı görebilen kullanıcı zaten gider sekmesine de sahip; "gider yok ama kasa var" diye bir
  kullanıcı tanımlanamıyor. Bu yüzden tek dizi pratikte sorun çıkarmıyor ve ayrı boyutun göç maliyetine
  değmiyor (X1).
- **Paylaşılan anahtarın dürüst yazılması önemli.** Servis Panosu'nda da aynı durum var ve kabul
  edilmişti; ama orada iki akordeon aynı ekranın iki yüzü. Burada iki **ayrı sekme** söz konusu olduğu
  için yöneticinin "gider izinlerini özelleştirdim, kasa izinleri serbest kaldı" diye düşünmemesi
  gerekiyor; R5 bunu ekranda yazılı hâle getiriyor.

---

## Acceptance Criteria

- **AC-1.** İzin ekranında "Kasa işlemleri" başlıklı ayrı bir akordeon vardır.
- **AC-2.** Hesap, virman ve avans kutuları bu akordeonun içinde, "Hesaplar ve hareketler" alt başlığı
  altındadır.
- **AC-3.** Gider işlemleri akordeonunda kasa kutusu yoktur.
- **AC-4.** Kasa akordeonu gider akordeonundan sonra gelir.
- **AC-5.** İki akordeondaki **tek tek kutular** aynı izin dizisine yazılır ve birbirini etkilemez (aynı
  dizi, farklı kimlikler).
- **AC-5b.** "Özelleştir" anahtarı iki akordeonu **birlikte** yönetir: biri açınca bütün `giderActions`
  kimlikleri ön işaretlenir, kapatınca ikisi birden varsayılana döner.
- **AC-6.** "Özelleştir" anahtarının iki bölümü birlikte kapsadığı ekranda yazılıdır; iki akordeonun
  "varsayılan" metni de gider **ve** kasa işlemlerini birlikte söyler (R9).
- **AC-7.** Kasa sekmesi olmayan kullanıcıda etkisizlik ipucu Kasa akordeonunda görünür ve
  `data-testid="kasa-etkisiz-ipucu"` korunur; ipucu **yalnız bir kez** çizilir.
- **AC-8.** `GIDER_ACTION_GROUPS` tek tanımdır, iki akordeon aynı diziden süzülür ve `allGiderActionIds`
  tek yerde hesaplanır; ikinci bir liste kopyalanmamıştır (R14).
- **AC-9.** Bilinen bir `giderActions` dizisi olan kullanıcı izin ekranında açılıp hiçbir şeye dokunulmadan
  kaydedilince dizi sırası dahil birebir aynı kalır (R11).
- **AC-10.** `electron/serverAuth.cjs` değişmez (diff boş) ve sunucu yetki testleri dokunulmadan yeşil
  kalır (R12).

### QA turunda eklenenler (R1)

- **AC-11.** Ayrım `KASA_EYLEM_IDLERI` kümesine göre yapılır; kaynakta grup adı eşleşmesi ve yeni bayrak
  yoktur (R4).
- **AC-12.** Kasa grubunun kimlikleri `KASA_EYLEM_IDLERI` ile birebir eşittir (R10).
- **AC-13.** Gider akordeonunun kimlikleri arasında hiçbir kasa kimliği yoktur (R10).
- **AC-14.** İki akordeonun kimliklerinin birleşimi `GIDER_ACTION_GROUPS`'un tamamıdır (R10).
- **AC-15.** Ayrı bir "özelleştir" durumu, ayrı seçim dizisi ya da ayrı `setSelected` yoktur (C5, kaynak
  taraması).
- **AC-16.** `tabs: ["kasa"]` ama Finans'ı olmayan kullanıcıda da etkisizlik ipucu görünür (R6).
- **AC-17.** `tabs` içinde kasa, gider ve finans birlikte olan kullanıcıda ipucu görünmez (R6).
- **AC-18.** Gider akordeonu kasa ipucunu üretmez (R2).
- **AC-19.** Akordeon sırası müşteri, bayi, stok, finans, gider, **kasa**, evrak, notlar, servis, ayarlar
  olarak sabittir (R7).
- **AC-20.** Grup adı değişikliği `tests/server-permission-defs.test.js`'teki grup adı listesine
  yansıtılmıştır (R1).
- **AC-21.** Kutu etiketleri ve kimlikleri bu işten önce ve sonra birebir aynıdır (R8).
- **AC-22.** Görsel kanıt iki akordeonu birlikte gösterir ve kanıt raporu üretilmiştir (R13).

### Plan onayında eklenenler (R2)

- **AC-23.** Ayrım `kasaGrubuMu` yardımcısıyla yapılır; iki görünüm de `GIDER_ACTION_GROUPS`'tan süzülür (R15).
- **AC-24.** İpucunun koşulu `gorunurSekmeler` çağrısıdır; sekme listesi tanımsız kullanıcıda da ipucu görünür (R16).
- **AC-25.** Ortak anahtar notu iki akordeonda, anahtar açık ya da kapalıyken görünür (R17).
- **AC-26.** "Özelleştir" kapalıyken ipucu çizilmez (R18).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Kaynak taraması izin listesinin tek yerde olduğunu ve ayrı durum yazılmadığını doğruluyor
      (AC-8, AC-15).
- [x] `tests/server-permission-defs.test.js`'e üç ayrım iddiası eklendi ve grup adı listesi güncellendi
      (R10, R1, AC-12, AC-13, AC-14, AC-20).
- [x] İzin dizisinin dokunulmadan kaydedildiğinde birebir aynı kaldığı testle gösterildi (R11, AC-9).
- [x] `serverAuth.cjs` diff'i boş ve sunucu yetki testleri dokunulmadan yeşil (R12, AC-10).
- [x] İpucunun koşulu 0052'nin görünürlük kuralını yansıtıyor ve yalnız bir kez çiziliyor
      (R6, AC-7, AC-16, AC-17, AC-18).
- [x] Görsel kanıt eklendi (`docs/evidence/0066-*.jpg` + `0066-piksel-raporu.json`, yeni taban): iki ayrı
      akordeon birlikte (R13, AC-22).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: Kasa izinlerinin ekranda ayrı akordeonda olduğu, boyutun yine
      `giderActions` olduğu ve nedeni, ayrımın `KASA_EYLEM_IDLERI` ile yapıldığı, iki akordeonun durumlarını
      paylaştığı; ayrıca **eskimiş** "Servis Panosu ayrımı grup adına göre süzülüyor" cümlesi düzeltildi
      (gerçekte `servisPano: true` bayrağı).
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 plan onayı (Q1–Q7; R15–R21, AC-23…AC-26); R19 R1'deki yanlış iddiayı düzeltti (test gider grup adlarını sabitlemiyordu). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: eskimiş sıra yorumu düzeltildi; AC-24 test adı ölçtüğü durumla netleştirildi. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | İkisi de küçük ve gerçek (yorum, test adı); davranış bulgusu yok. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Tam çekimde değişen yalnız izin ekranları; `serverAuth.cjs` diff'i boş, sunucu yetki testleri dokunulmadan yeşil. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Spec'in "şu test zaten şunu sabitliyor" iddiaları da kod iddiasıdır ve doğrulanmalıdır; R1 gider grup adlarının testte sabit olduğunu söylüyordu, değildi. İkincisi: bir koşulu "tek kurala bağladık, tanımsız durumu da kapsar" diye yazarken o durumun ekranda gerçekten oluşup oluşmadığına bakılmalı; burada sekme listesi tanımsız kullanıcı ekrana hiç gelmiyordu (varsayılan sekmelerle açılıyor).
