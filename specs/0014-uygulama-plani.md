# 0014: Uygulama Planı, Sekme ve Süzgeç Birliği

| | |
|---|---|
| **Bağlı spec** | `specs/0014-sekme-ve-suzgec-birligi.md` (R3, plan onayıyla onaylandı) |
| **Durum** | 2026-09-25: Z1–Z12 kullanıcı tarafından onaylandı; spec R3 ile güncellendi; uygulanıyor. |
| **Önkoşul** | 0009 (sözlük), 0011 (kanıt eşlemesi, `beklenen`/`onay`) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar Z1–Z12) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Müşteriler | 5 süzgeç, etiket `{l} ({count})`, tıklama `setListFilter` + `setPage(1)`; `role`/`aria-*` **yok**; dolu turuncu hap, içerik genişliği, `flexWrap`. Yanında "Firmaya Göre Grupla" mavi hap aç/kapa (aynı pil stili) | `Customers.jsx:468-494` |
| Bayiler | 4 süzgeç, aynı desen, `setPage(1)` | `SimpleDealers.jsx:349-362` |
| Stok | Alt çizgili 4 sekme (`Makina Stoğu`, `Parça/Yedek Parça Stoğu`, `Yedek Parça Satışı`, `Kalıp Üretim`), `role` yok; derin bağlantı: `defaultSubTab` + `yedekOdakId` etkisi | `Stock.jsx:31-34, 50-58` |
| **Stok içinde ikinci çubuk (spec'te yok)** | "Yedek Parça Satışı" alt sekmesinde `Tümü (n)` / `Tahsisi eksik (n)` süzgeci: 999 köşeli pil, metinde sayı. **Testi var:** `getByRole("button", { name: /Tahsisi eksik/ })` | `stock/YedekParcaSatisTab.jsx:307-314`, `tests/ui/yedek-parca-satis.test.jsx:69, 155` |
| Evrak | Alt çizgili 3 sekme; tıklama `setSubTab` + `setPage(1)` + `setSearch("")` + `setOdakDocId(null)` | `Documents.jsx:843-852` |
| Finans | İzne bağlı aralık pilleri (`izinliAraliklar`, yasaklı aktifte ilk izinliye, hiç yoksa `thisMonth`); `custom` seçilince çubuğun **altında** tarih alanları; aynı dosyada çubuk dışı bir pil daha var (tutar göster/gizle) | `Finance.jsx:16, 26-34, 566, 573-592` |
| Notlar | İki süzgeç, **eşit genişlik** (`flex: 1`), yalnız `coklu` (aktif kullanıcı) ve izinliyken; yasaklı aktif → izinliye; tıklama `setPage(1)`. **Testi var:** `getByRole("button", { name: "Tümü" })` | `Notes.jsx:12-22, 122-134`, `tests/ui/notes-ownership.test.jsx` |
| Analiz | Yerel `Chip` (yalnız bu 4 ön ayarda kullanılıyor) `aria-pressed` taşıyor; sarıcı `role="group"` `aria-label="Tarih aralığı"` ve içinde "Aralık" etiketi; `ozel` seçilince altta tarih alanları. **Testi var:** `getByRole("button", { name: "Tüm zamanlar" })` + `aria-pressed` | `Analiz.jsx:103-108, 324-339`, `tests/ui/analiz.test.jsx:24-49` |
| Hedef bileşen | `Segment`: kip `radyo` (radiogroup/radio/aria-checked) / `dugme` (group/aria-pressed); görünüm `hap` (eşit genişlik `flex: 1 1 0`, `nowrap`, kap `flexWrap`) / `cerceve`. Rozet, sekme kipi, içerik genişliği **yok** | `tasarim.jsx:14-41` |
| **Rol çakışması** | `radyo` kipi düğmeleri `role="radio"` yapar; yukarıdaki üç test `getByRole("button")` ile sorguladığı için kırılır (C3). `dugme` kipi rolü `button` bırakır | yukarıdaki testler |
| Mevcut kanıt | `Documents.jsx`'in 0009 kayıtları (`evrak-musteri`, `evrak-bayi`) sabit 0009 raporunu gösterir; rapor yeniden üretilmediği için Evrak'taki sekme değişikliğini **görmez** | `docs/evidence/kanit-eslemesi.json` |
| Görüntü aracı | Birleştirme betiği 0011'den beri önek alıyor (`0009-birlestir.cjs … <onek>`); çekim ve karşılaştırma zaten çıktı klasörüyle çalışıyor. Önek yalnız dosya adlarında (`0009-*`) | `scripts/evidence/` |

---

## 1. Mimari özet

- **Sözlüğe üç ekleme, tek bileşende (`Segment`):**
  1. **Sayı rozeti:** `options[].sayi`. Görünen: etiket + rozet. Düğmenin metni gizli parçalarla `Etiket (n)` olarak kalır (Z2), böylece erişilebilir ad ve `getByText` bugünkü metne birebir eşit (R3, AC-4).
  2. **Sekme kipi:** `kip="sekme"` → `role="tablist"` + `role="tab"` + `aria-selected` (R6).
  3. **İçerik genişliği:** `genislik="icerik"` → düğmeler içerik kadar, kap satır sarar. **Varsayılan `"esit"`** (bugünkü davranış); Giderler ve 0009/0011 kanıtları değişmez (R9).
- **İzin, sayfa, seçim durumu ekranlarda kalır** (R4, R5): bileşene yalnız görünür seçenek listesi ve değer geçer; `setPage(1)`, arama sıfırlama ve derin bağlantı etkileri çağıranın `onChange`'inde aynen durur. İzin süzmesi bileşene taşınmaz (spec tuzak 3).
- **Süzgeç çubukları `dugme` kipinde** (Z1). **Görünüm her yerde `hap`**; `cerceve` yalnız Evrak'ın alıcı tipi seçicisinde kalır (form, X5).

---

## 2. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/tasarim.jsx` | `Segment`: `sayi` rozeti, `kip="sekme"`, `genislik`; varsayılanlar bugünkü çıktıyı birebir korur |
| `Customers.jsx`, `SimpleDealers.jsx` | Süzgeç çubuğu → `Segment` (dugme, hap, içerik, sayı rozeti); "Firmaya Göre Grupla" aynen kalır (Z6) |
| `Stock.jsx` | Alt sekmeler → `Segment kip="sekme"` (içerik) |
| `stock/YedekParcaSatisTab.jsx` | `Tümü` / `Tahsisi eksik` → `Segment` (dugme, içerik, rozet) (Z5; spec revizyonu) |
| `Documents.jsx` | Alt sekmeler → `Segment kip="sekme"`; yan etkiler `onChange`'de |
| `Finance.jsx` | Aralık pilleri → `Segment` (dugme, içerik); özel tarih alanları yerinde |
| `Notes.jsx` | İki süzgeç → `Segment` (dugme, **eşit**); `coklu` ve izin koşulu çağıranda |
| `Analiz.jsx` | `Chip` silinir → `Segment` (dugme, içerik, `ariaLabel="Tarih aralığı"`); "Aralık" etiketi segmentin önünde |
| `docs/tasarim-sozlugu.md` | Üç eklemenin ne zaman kullanılır/kullanılmaz kuralı; bilinen borç güncellemesi (Grupla aç/kapa, Finans tutar düğmesi, sekme klavye gezinmesi) |
| `CLAUDE.md` | Sözlük satırına üç ekleme |
| `scripts/evidence/0009-sayfa.jsx` | Yedi ekran: `musteriler-liste`, `bayiler-liste`, `stok-alt-sekme`, `evrak-sekme`, `finans-aralik`, `notlar-suzgec`, `analiz-onayar` (+ `stok-yedek-parca-suzgec`) |
| `docs/evidence/0014-*.jpg`, `0014-piksel-raporu.json`, `kanit-eslemesi.json` | Kanıt ve kayıtlar (`degisti` + `onay`, Z9) |
| `vite.config.js` | Yeni Electron yerleşim testi `ELECTRON_TESTLERI`'ne (AC-17, Z8) |
| Testler (yeni) | bkz. §5. Mevcut test dosyalarına dokunulmaz (C3) |

---

## 3. Adım sırası

1. **Dal:** `feat/0011-uyari-seridi-serbest` ucundan `feat/0014-sekme-suzgec` (Z11).
2. **Davranış testleri önce, eski kodda yeşil** (Z7). AC-2…12, 15, 18, 19, 20 davranış testleri bugünkü koda yazılır ve geçer.
   Düğmeleri rolden bağımsız, yalnız erişilebilir adla sorgular; sekmeler `button`'dan `tab`'a geçtiği için iki hâlde de çalışması gerekiyor.
3. **Önce görüntüleri** (kod değişmeden): yedi ekran düzeneğe eklenir, aracın kararlılığı ölçülür, "önce" çekilir.
4. **Bileşen:** `Segment` eklemeleri + birim testleri (varsayılan çıktı değişmedi kanıtı dahil) + kontrast testi.
5. **Ekranlar**, her birinden sonra o ekranın mevcut testleri ve 2. adımın testleri koşulur:
   1. Analiz;
   2. Notlar;
   3. Finans;
   4. Bayiler;
   5. Müşteriler;
   6. Yedek parça süzgeci;
   7. Stok ve Evrak sekmeleri.

   Kırılan test olursa **kod düzeltilir**.
6. **Kaynak taraması testi** (AC-1) ve **Electron yerleşim testi** (AC-17).
7. **Sonra görüntüleri**, yan yana JPEG'ler; sizin incelemeniz (AC-13) → onay tarihiyle `kanit-eslemesi.json` kayıtları (`degisti`).
8. Sözlük, `CLAUDE.md`, tam paket (`npm test`, `lint`, `build`), `git diff --name-status -- tests` yalnız yeni dosyalar.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**Z1. Süzgeç çubukları hangi kipte?**
*Öneri:* **`dugme`** (`role` = button, `aria-pressed`). *Gerekçe:*
- `radyo` kipi düğmeleri `role="radio"` yapar. Analiz, Notlar ve yedek parça testleri `getByRole("button", { name })` ile sorguladığı için kırılır; C3 bunu yasaklıyor.
- Analiz bugün zaten `aria-pressed` kullanıyor.
- Müşteriler, Bayiler, Finans ve Notlar'a `aria-pressed` **eklenir**, bu bir erişilebilirlik eklemesi. Mevcut bir niteliği değiştirmediği için C1'i çiğnemiyor; spec'e not olarak yazılmalı.

**Z2. Rozet ve erişilebilir ad (R3, AC-4).**
*Öneri:* düğme içeriği `Etiket` + görsel olarak gizli ` (` + rozet `n` + gizli `)`.
- Metin içeriği tam olarak `Borçlu Firmalar (3)` olur; erişilebilir ad da içerikten aynı çıkar. `aria-label` gerekmez.
- Gizleme klasik "görsel gizli" stilidir (1 piksel, `clip`); ekran okuyucu okur, göze görünmez.

*Gerekçe:* `aria-label` yalnız erişilebilir adı korur. `getByText("Hepsi (12)")` gibi metin sorguları ve kullanıcı metin seçimi
ise metin içeriğine bakar. Bu yol ikisini de birebir korur.

**Z3. Genişlik varsayılanı.**
*Öneri:* `genislik` varsayılanı `"esit"` (bugünkü `Segment`). Bugün içerik genişliğinde çalışan çubuklar `"icerik"` alır: Müşteriler, Bayiler, Finans, Analiz, yedek parça süzgeci, Stok ve Evrak sekmeleri. Notlar bugün eşit, `"esit"` kalır.
*Gerekçe:* R9 "bugün nasılsa öyle"; varsayılanı değiştirmek Giderler'in segmentlerini ve 0009/0011 kanıtlarını bozar.

**Z4. Sekme kipinin kapsamı.**
*Öneri:* yalnız nitelikler: `tablist` / `tab` / `aria-selected`. Ok tuşu gezinmesi (roving tabindex) ve `tabpanel` bağlantısı **eklenmez**; sözlükte bilinen erişilebilirlik borcu olarak yazılır.
*Gerekçe:* spec yalnız nitelikleri istiyor. Klavye davranışı eklemek davranış değişikliği olur (C1) ve kendi testini ister; ayrı iş.

**Z5. Spec'in saymadığı çubuk: Stok > Yedek Parça Satışı'ndaki `Tümü (n)` / `Tahsisi eksik (n)`.**
*Öneri:* kapsama alınır (dugme, içerik, rozet). Spec'e revizyonla eklenir.
*Gerekçe:* R1 "bütün sekme ve süzgeç çubukları". Stok ekranında kalırsa aynı ekranda iki farklı çubuk görünür, üstelik R2'nin
yasakladığı "sayı metinde" deseniyle. Testi rol ve ad desenli (`/Tahsisi eksik/`) sorguluyor; `dugme` kipi ve Z2 ile değişmeden geçer.

**Z6. "Firmaya Göre Grupla" ve AC-1'in pil taraması.**
Aç/kapa düğmesi de bugün pil stilinde. AC-1 "yedi dosyada pil stili tanımı kalmaz" diyor, R1 ise onu segmentin dışında kendi düğmesi olarak bırakıyor.
*Öneri:* görünümü ve davranışı **aynen** kalır. Tarama onu ve Finans'taki tutar göster/gizle pilini **adıyla** istisna tutar; sözlüğün bilinen borç listesine "tekil aç/kapa düğmesi, sözlükte karşılığı yok" diye yazılır.
*Gerekçe:* sözlükte aç/kapa yapı taşı yok. Onu `Segment`'e sıkıştırmak R1'e aykırı, yeni bir yapı taşı icat etmek ise bu işin
kapsamını aşıyor (C2 "gerekirse sözlüğe", ama aç/kapa için somut ikinci kullanım yok).

**Z7. "Dönüşüm öncesiyle aynı" nasıl kanıtlanacak (AC-2…AC-12, AC-15, AC-18…20)?**
*Öneri:* davranış testleri **önce, bugünkü koda** yazılır ve yeşil geçer; dönüşümden sonra da aynı kalır.
- Her ekran örnek veriyle çizilir; her seçenek erişilebilir adıyla tıklanır; görünen kayıt adları ve sayılar beklenen listelerle karşılaştırılır.
- Sorgular rolden bağımsız ad eşleşmesiyle yazılır, çünkü sekmeler `button`'dan `tab`'a geçiyor.

*Gerekçe:* 0011'de "önce sabitle, sonra karşılaştır" yöntemi ucuz ve güçlüydü. Burada görünüm bilerek değiştiği için piksel
karşılaştırması davranışı kanıtlayamaz, davranış testleri kanıtlar.

**Z8. AC-17 (dar pencerede satır sarma).**
*Öneri:* 0007'deki `bayi-modal-layout` deseniyle bir Electron yerleşim testi.
- Müşteriler çubuğu (5 süzgeç + Grupla) 1280, 900, 700 ve 480 piksel genişlikte ölçülür.
- Hiçbir düğme kaptan taşmaz ve kırpılmaz; dar pencerede birden çok satır oluşur; hiçbir düğme kap genişliğine yayılmaz.
- Test `ELECTRON_TESTLERI`'ne eklenir.

*Gerekçe:* jsdom yerleşim hesaplamıyor. Görüntü tek genişlikte (1440) alınıyor, sarmayı göstermez.

**Z9. `degisti` kayıtlarının onayı (AC-11b, AC-13).**
*Öneri:*
- Önce/sonra görüntülerini size sunarım; siz inceleyip onay verdiğinizde kayıtları o günün tarihiyle yazarım: `Takım Yöneticisi · <tarih> · spec 0014 AC-13`.
- Kayıt açılacak dosyalar: sözlüğü yeni kullanmaya başlayanlar (Customers, SimpleDealers, Stock, YedekParcaSatisTab, Finance, Notes, Analiz) ve Documents.jsx (0014 raporuyla ek kayıt).
- Spec `done`'a taşınırken hepsi `ayni`ye çevrilir (AC-11c).

*Gerekçe:* AC-11b onayı yalnız Takım Yöneticisi'ne bırakıyor; ben kendi başıma `degisti` açamam. Documents için yeni kayıt
gerekli, çünkü 0009 kaydı sabit bir raporu gösteriyor ve Evrak'taki sekme değişikliğini hiç görmüyor (§0).

**Z10. Görüntü aracının "genelleştirilmesi" (C6, DoD).**
*Öneri:* dosyaları yeniden adlandırmam. Önek 0011'den beri birleştirme betiğinde parametre; çekim ve karşılaştırma zaten öneksiz.
Bu işte yalnız yedi ekran eklenir. Spec DoD'deki madde "0011 ile karşılandı" diye düzeltilir.
*Gerekçe:* `0009-*` adları `CLAUDE.md`, sözlük ve iki `done` spec'inde geçiyor. Yeniden adlandırmak kapanmış belgeleri bozar,
kazancı yalnız isim. İsterseniz ayrı bir temizlik işi olarak yapılır.

**Z11. Hangi dal?**
*Öneri:* `feat/0011-uyari-seridi-serbest` ucundan `feat/0014-sekme-suzgec`. *Gerekçe:* 0014, 0011'in kanıt eşlemesi kurallarına
(AC-11b/c) dayanıyor; 0009 ve 0011 henüz `main`'de değil.

**Z12. Analiz'in "Aralık" etiketi ve grup adı.**
*Öneri:* segment `ariaLabel="Tarih aralığı"` alır (bugünkü grup adı), görünen "Aralık" etiketi segmentin hemen önünde ayrı bir öğe olarak kalır.
*Gerekçe:* bugün etiket grubun içinde, `Segment` ise yalnız düğme çizer. Grup adı korunur, görünen düzen aynı kalır.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` biçiminde. "Davranış testi" = Z7'ye göre önce eski kodda yeşil yazılan test.

| AC | Test | Nasıl |
|---|---|---|
| AC-1 | `tests/suzgec-kaynak.test.js` | Yedi dosya + `YedekParcaSatisTab`: `Segment`'i `tasarim`'dan içe aktarır; `borderBottom: subTab ===`, `const Chip`, süzgeç `.map(` içinde `borderRadius: 20/999` pil stili yok; istisnalar yalnız adıyla (Grupla, Finans tutar düğmesi, Z6) |
| AC-2, AC-3 | `ui/suzgec-musteri-bayi.test.jsx` (davranış) | Her süzgecin adı ve sayısı beklenen listeyle birebir (Müşteriler 5, Bayiler 4) |
| AC-4 | aynı + `ui/segment-eklemeler.test.jsx` | Düğmenin erişilebilir adı ve metin içeriği `Borçlu Firmalar (3)`; `getByText` ve `getByRole(…, { name })` ikisi de bulur; rozet görsel öğe |
| AC-5 | davranış testleri (yedi ekran) | Her seçimde görünen kayıt adları beklenen kümeyle aynı |
| AC-6, AC-7 | `ui/suzgec-finans.test.jsx` (davranış) | İzinsiz aralık yok; aktif aralık yasaklıysa ilk izinliye, hiç izin yoksa "Bu Ay" seçili |
| AC-8, AC-19 | `ui/suzgec-notlar.test.jsx` (davranış) | İzin süzmesi ve düşme; tek kullanıcı modunda çubuk yok, çoklu modda var |
| AC-9, AC-16, AC-18 | `ui/sekme-stok-evrak.test.jsx` (davranış) | Stok 4 sekme aynı sıra, seçim içeriği değiştirir; `tablist`/`tab`/`aria-selected`, radyo değil; `defaultSubTab="yedeksatis"` ve `yedekOdakId` ile hedef sekme açık |
| AC-10 | aynı | Evrak 3 sekme; sekme değişince sayfa 1, arama boş, odak temiz |
| AC-11, AC-20 | `ui/suzgec-analiz-finans-tarih.test.jsx` (davranış) | Analiz ön ayarlarının ürettiği aralık (motorun aldığı `baslangic`/`bitis`); "Özel…" ve "Özel Tarih" tarih alanlarını segmentin **dışında**, bugünkü yerinde açar |
| AC-12 | davranış testleri | Müşteriler/Bayiler/Notlar/Evrak: 2. sayfadayken seçim değişince sayfa 1; Stok sekmesi bugünkü davranış |
| AC-13 | `tests/segment-kontrast.test.js` + görüntü | Rozet (seçili/seçili değil) ve sekme kipinin token çiftleri karanlıkta 0009 ölçüsüyle; yedi ekranın önce/sonra görüntüleri iki temada, karar sizde (Z9) |
| AC-14 | tam paket + DoD | `git diff --name-status -- tests` yalnız yeni dosyalar |
| AC-15 | `ui/suzgec-musteri-bayi.test.jsx` (davranış) | Grupla segmentin dışında ayrı düğme; açma/kapama ve gruplu şerit bugünkü gibi |
| AC-17 | `tests/suzgec-yerlesim.test.js` (Electron) | Z8 |
| (Z2/Z3 bileşen) | `ui/segment-eklemeler.test.jsx` | Varsayılan `Segment` çıktısı (radyo + hap + eşit) değişiklik öncesi HTML'le birebir; `genislik="icerik"`; `kip="sekme"` nitelikleri; `sayi` rozeti |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| Z1 | Süzgeç kipi | `dugme` (mevcut testler `button` rolüyle sorguluyor) |
| Z2 | Rozet ve ad | Gizli ` (` / `)` ile metin içeriği `Etiket (n)` kalır |
| Z3 | Genişlik varsayılanı | `esit`; içerik genişlikli çubuklar `icerik`, Notlar eşit |
| Z4 | Sekme kipi | Yalnız nitelikler; klavye gezinmesi borç |
| Z5 | Yedek parça süzgeci | Kapsama alınır (spec revizyonu) |
| Z6 | Grupla ve tutar düğmesi | Aynen kalır, taramada adıyla istisna, sözlükte borç |
| Z7 | Davranış kanıtı | Testler önce eski kodda yeşil |
| Z8 | AC-17 | Electron yerleşim testi |
| Z9 | `degisti` onayı | Görüntüleri incelemenizden sonra, sizin onay tarihinizle |
| Z10 | Araç | Yeniden adlandırma yok; DoD maddesi "0011 ile karşılandı" |
| Z11 | Dal | `feat/0011`'den `feat/0014-sekme-suzgec` |
| Z12 | Analiz etiketi | `ariaLabel="Tarih aralığı"`, "Aralık" segmentin önünde |

---

## 7. Uygulama notları (2026-09-25, ara durum)

- **Davranış testleri önce yazıldı ve eski kodda yeşildi** (Z7), 25 test:
  - `ui/suzgec-musteri-bayi`, `ui/suzgec-finans-analiz`, `ui/suzgec-notlar`, `ui/sekme-stok-evrak`.
  - Dönüşümden sonra da yeşil.
- **Z2 düzeltmesi (iki bulgu):**
  1. Erişilebilir ad hesabı, gizli ve satır içi blok öğelerin çevresine boşluk ekleyip çıkarıyor (ad "Borçlu Firmalar( 3 )" çıkıyordu). Sayı verildiğinde ad `aria-label="Etiket (n)"` ile sabitlendi; gizli parantezler metin içeriği için duruyor.
  2. `getByText` varsayılan olarak yalnız öğenin **kendi** metin düğümlerine bakar. Sayı rozet öğesine taşınınca tam metinli `getByText("Borçlu Firmalar (3)")` artık eşleşmiyor. Korunanlar: erişilebilir ad (`getByRole(…, { name })`) ve metin içeriği.
  - Mevcut testlerin hiçbiri bu süzgeçleri tam metinle aramıyordu (taranmıştı). Bu işte yazılan iki test tam metinle arıyordu; metin içeriği ve ad üzerinden doğrulayacak şekilde düzeltildi (eski kodda yine yeşil).
- **Bileşen:** `Segment`'e `sayi`, `kip="sekme"`, `genislik`. Varsayılan çıktı değişiklik öncesi HTML'le birebir (`ui/segment-eklemeler`).
- **Ekranlar:** Analiz, Notlar, Finans, Bayiler, Müşteriler, Stok > Yedek Parça Satışı süzgeci, Stok ve Evrak sekmeleri taşındı.
- **Yeni testler:**
  - `ui/sekme-kipi-ekran` (AC-16, Z1);
  - `suzgec-kaynak` (AC-1; eski kodda 14 noktada kalıyor);
  - `segment-kontrast` (AC-13 rozet);
  - `suzgec-yerlesim` (AC-17, Electron; eşit genişlikte kaldığı denendi, `ELECTRON_TESTLERI`'ne eklendi).
- **Görüntü:**
  - 57 ekran × 2 tema = 114 görüntü çekildi, çizim hatası yok.
  - Değişenler 0014'ün 8 ekranı ile aynı çubukları taşıyan 0009'un `evrak-musteri`, `evrak-bayi` ve `finans` ekranları. Geri kalan her şey 0 fark (Giderler, Ayarlar, 0011).
  - Kanıt `docs/evidence/0014-*.jpg` (16) + `0014-piksel-raporu.json`.
- **Bekleyen iki karar (kullanıcıya soruldu):**
  1. AC-13 onayı ve `kanit-eslemesi.json` `degisti` kayıtları.
  2. 0009'un `tasarim-kaynak.test.js` AC-18 testi `Analiz.jsx`'te `const Chip` bulunmasını şart koşuyor. 0014 bu borcu kapatıyor, bu yüzden testin o satırı değişmeli; bu, C3 için ikinci bir istisna demek.
- **İlgisiz bulgu:** `tests/makina-odeme.test.js` bu işten önce de kalıyor. Sabit tarih (2026-08-16) + 40 günlük blokaj bugün (2026-09-25) doldu; test gerçek tarihe bağlı.

## 8. Kapanış notları (2026-09-25)

- **Kullanıcı kararları:**
  - AC-13 görünüm değişikliği onaylandı. `kanit-eslemesi.json`'a 8 `degisti` kaydı açıldı (7 yeni kullanan dosya + Documents'a 0014 kaydı); onay: `Takım Yöneticisi · 2026-09-25 · spec 0014 AC-13`.
  - C3'e ikinci istisna onaylandı (spec R4). 0009 testindeki `const Chip` satırı, sözlüğün "Ödenen borç" bölümünü denetleyen satırla değişti.
- **Sözlük:**
  - `Segment` bölümüne üç ekleme (kip, genişlik, sayı rozeti) için ne zaman kullanılır / kullanılmaz kuralları ve beş örnek yazıldı.
  - Bilinen borçta "Ödenen borç (spec 0014)" bölümü açıldı.
  - Grupla ve Finans tutar düğmesi kapsam dışı aç/kapa olarak yazıldı.
  - Sekme kipinin klavye gezinmesi erişilebilirlik borcu olarak eklendi.
  - Evrak satır numaraları güncellendi.
- **Sonuç:** 192 dosya / 2049 test.
  - Tek kırmızı, bu işten önce de kalan `makina-odeme.test.js` (tarih bombası, §7).
  - Lint 0 hata, `npm run build` başarılı.
  - Mevcut test dosyalarından yalnız `tasarim-kaynak.test.js` değişti (R4 istisnası).
- **`done`'a taşırken:** bu spec'in 8 `degisti` kaydı `ayni`ye çevrilecek (0011 AC-11c).
