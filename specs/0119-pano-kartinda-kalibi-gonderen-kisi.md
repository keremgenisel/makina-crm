# 0119 — Panodaki servis kartında kalıbı gönderen kişi

| | |
|---|---|
| **Durum** | Uygulandı, kapanış bekliyor (plan `specs/0119-uygulama-plani.md`, plan turu Karar 36–45) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/ServisPanosu.jsx` (servis kartının kontrol bölümü, yeni yazıcı çağrısı, işlem geçmişi), `src/lib/kalipTamiri.js` (yeni saf yazıcı ve seçicinin metin sabiti), `src/components/settings/SettingsAuditLog.jsx` (yeni eylemin etiketi). **Kanıt ve test:** `scripts/evidence/0009-sayfa.jsx`, `tests/kalip-sevki-0117.test.js`, `tests/ui/kalip-sevki-0117.test.jsx`, `tests/islem-gecmisi-etiketleri.test.js`, yeni `tests/kalip-sorumlusu-0119.test.js` ve `tests/ui/kalip-sorumlusu-0119.test.jsx`. **Belge:** `CLAUDE.md`, `specs/README.md`. Veri şeması, göç, izin tanımları, sunucu kuralları, birleştirme ve etiket çıktısı dokunulmaz. |
| **Bağımlı spec'ler** | 0117 (beş sevk alanını ve panodaki etiket düğmesini kuran spec), 0115 (kalıp tamiri zinciri). 0118 ile ortak dosyası yoktur. |
| **Ters çevrilen kriterler** | 0117 **AC-55'in ikinci yarısı** ("kartta yalnız bugünkü onarım yeri metni durur"): kart artık kalıbı gönderen kişiyi de gösterir. **Ters çevrilme yalnız kriterin METNİNDEDİR; testin iddiası değişmez** (ölçüm 22): `tests/ui/kalip-sevki-0117.test.jsx:211-216` **İşlemde** kartını ve yalnız "Fabrika Teslim" dizesini ölçüyor, yeni satır o kartta çizilmiyor ve Tamamlandı kartında bile o dizeyi basmıyor. **İlk yarısı aynen korunur** (kart kalıbın teslim şeklini basmaz) ve 0117 C12'nin kaynak taraması (`tests/kalip-sevki-0117.test.js:118`) **dokunulmaz**. 0117 AC-40, AC-41, AC-38 ve AC-52 etkilenmez (ölçüm 5, ölçüm 15, ölçüm 11, ölçüm 20). |

---

## Intent

Spec 0117 kalıbın dönüşünü kayda yazdı: teslim şekli, kargo firması, takip numarası, tarih ve kargoyu veren kişi artık servis kaydında duruyor. Ama bu beş alanın hiçbiri panoda görünmüyor; kalıbı kutulayan kişi kartta yalnız "Etiket" düğmesini görüyor, kalıbı kimin göndereceğini öğrenmek ya da yazmak için servis formunu açması gerekiyor. Oysa panonun kargo kartlarında ve Extra Kalıp kartlarında bu soru yıllardır kartın üstünde duruyor ve kullanılıyor: kayıtların dörtte birinde sorumlu dolu (ölçüm 4). Takım Yöneticisi aynı şeyi servis kartı için istiyor, dar bir yerde: kalıbı atölyeye girmiş servis Tamamlandı sütununa geldiğinde, servisi yapanın hemen altında kalıbı gönderen kişi görünsün ve oradan seçilebilsin. Bu iş bittiğinde kalıbın sevki, kalıbın sevk edildiği ekranda kapanır; kartın bugünkü kontrol satırı ve 0117'nin ad tuzağı koruması olduğu gibi kalır.

---

## Requirements

### A. Kartın ikinci kontrol satırı

- **R1.** Servis kartının eylem satırının altına ikinci bir satır eklenir: kalıbı gönderen kişinin seçicisi.
- **R1/2.** Bugünkü eylem satırı (teknisyen seçicisi, "Etiket", "Yazdır", "🗄 Kaldır") **hiç değişmez**; yeni satır onun altında ve tam genişlikte çizilir. Böylece 0117 AC-40'ın "Etiket düğmesi teknisyen seçicisinin hemen sağında, Yazdır'ın solunda" iddiası aynen ölçülebilir kalır (ölçüm 5).
- **R1/3.** İki satır **tek kapta** toplanır: dış kap kesikli üst çizgiyi (`marginTop`, `paddingTop`, `borderTop`), `onClick={e => e.stopPropagation()}` ve iki fare işleyicisini (`onMouseEnter`/`onMouseLeave` → `dragKapaliId`) taşır; içindeki iki satır yalnız kendi `display: flex` yerleşimini taşır ve aralarında ikinci bir kesikli çizgi yoktur (`gap` ile ayrılırlar). Korumanın iki kardeş satıra **kopyalanması yasaktır** (ölçüm 16: fareyi birinden ötekine geçirmek `mouseLeave` ile `mouseEnter` çiftini üretir ve davranış sıraya bağlı kalır). Ölçüldü ve güvenli: 0117 AC-40 düğmenin `parentElement`'ini okuyor (`tests/ui/kalip-sevki-0117.test.jsx:185-190`), o da **iç** eylem satırı olarak kalır; 0117 AC-41 arşiv kartında `select` istemiyor (`:209`) ve yeni satır arşiv dalına girmez.
- **R2.** Satır yalnız iki koşul birlikte sağlanınca çizilir: servisin durumu **Tamamlandı** ve kalıbı atölyede (`kalipAtolyedeMi(sv)`). Bekliyor ve Yapılıyor kartlarında, kalıpsız serviste ve arşivlenmiş kartta çizilmez.
- **R2/2.** Kalıp ölçütü etiket düğmesinin ölçütüyle aynı fonksiyondan okunur; yeni bir "kalıbı var mı" kuralı yazılmaz.
- **R2/3.** **Müşteri kapısı yoktur:** müşterisi çözülmeyen ("(müşteri yok)") Tamamlandı ve kalıplı kartta da satır çizilir. Etiket düğmesinin müşteri kapısı (`custMap[Number(sv.customerId)]`, ölçüm 20) etiketin alıcı bloğunu doldurabilmesi içindi; burada öyle bir bağımlılık yok ve teknisyen seçicisi de müşterisiz kartta çiziliyor. Böyle bir kayıtta işlem geçmişinin `entityName`'i boş kalır (`auditServis`, ölçüm 20); bu kabul edilir.
- **R3.** Seçici teknisyen seçicisinin ikizidir: **satır içi biçimi birebir teknisyen seçicisinden** alınır (aynı yükseklik, kenarlık, zemin, `cursor: "pointer"`; boş değerde soluk ve normal kalınlıkta, dolu değerde koyu ve kalın). Kargo kartının seçicisi biçim kaynağı **değildir** (orada `cursor` izne bağlı, `KargoPanosu.jsx:83`); kargo kartından alınan tek şey ikondur (R5/2). Listesi firma çalışanlarının canlı adlarıdır.
- **R3/2.** Çalışan listesi boş olsa da satır çizilir ve kayıtta duran ad seçicide görünür kalır; satırın görünürlüğü yalnız R2'nin iki koşuluna bağlıdır.
- **R4.** Kayıtta duran ad çalışan listesinde yoksa listenin başına eklenir; serbest yazılmış ya da silinmiş çalışandan kalan değer seçicide kaybolmaz (teknisyen seçicisinin bugünkü `teknListe` kuralı).
- **R4/2.** Liste `Kart`'ın dışında bir kez hesaplanan `tekAdlari`'nı (`ServisPanosu.jsx:619`) **yeniden kullanır**; ikinci bir çalışan okuması yazılmaz. Kart içindeki değişkenin adı `sevkListe`'dir (`teknListe` deseni, `:629`).
- **R5.** Boş seçeneğin metni teslim şeklinden **bağımsız tek nötr sorudur**: `Kalıbı kim veriyor?`. Metin tek sabittir ve `lib/kalipTamiri.js`'in metin bölümünde `SEVK_SORUMLU_SORUSU` adıyla durur (0115 R39 deseni); ekranda ikinci kopyası yazılmaz.
- **R5/2.** Satırın başındaki ikon kargo kartının kullandığı **🚚** ikonudur (Takım Yöneticisi kararı, 2026-10-30). **Yeni** ikon `aria-hidden="true"` taşır; kargo kartının ikonunda bu özellik bugün **yok** (`KargoPanosu.jsx:80`, ölçüm 19) ve ona dokunulmaz (X4'ün bilinen borcuna yazılır).
- **R5/3.** Seçicinin erişilebilir adı `aria-label="Kalıbı gönderen kişi"`dir. Kartta artık iki seçici olduğu için ad zorunludur: teknisyen seçicisinin `aria-label`'ı yok ve testler onu seçeneğin metniyle buluyor (ölçüm 19); iki adsız seçici hem ekran okuyucuda hem testte ayırt edilemez.
- **R6.** Bir ad seçilince değer servis kaydının `kalipKargoSorumlusu` alanına yazılır; boş seçenek seçilince alan kayıttan **silinir** (boş dize yazılmaz).
- **R7.** Yazma kapısı teknisyen seçicisiyle aynıdır: `cust_service_edit` ve `setServices`'in gelmiş olması. İzni olmayan kullanıcıda seçici pasif çizilir (gizlenmez), değeri okunabilir kalır.
- **R7/2.** İş bölümü teknisyen seçicisinin bugünkü bölümüdür: `disabled` **yalnız** izne bakar (`disabled={!canDo("cust_service_edit")}`, `:702`), `setServices` denetimi **işleyicide** durur (`teknisyenDegistir`, `:435`). `setServices` gelmeyen bağlamda seçici etkin görünür ama hiçbir şey yazmaz; bu bugünkü teknisyen davranışının aynısıdır ve canlı hiçbir bağlamda oluşmaz (ölçüm 6: üç bağlamın üçü de `setServices` geçiriyor), yani AC-18 savunma kriteridir.
- **R8.** Satır panonun üç bağlamında da çalışır: ana penceredeki sekme, kiosk ve ayrı pencere. Üçüne de `calisanlar` ve `setServices` bugün zaten geliyor (ölçüm 6).

### B. Tek yazıcı

- **R9.** Alanı servis kaydına yazan tek yer `lib/kalipTamiri.js` olarak **kalır**. Pano kendi kayıt nesnesini kurmaz; yeni saf yazıcıyı çağırır: `sevkSorumluYaz(servis, ad)`.
- **R9/2.** Yazıcının kuralı üç cümledir: değer `String(ad ?? "").trim()` ile kırpılır, kırpılmış değer boşsa anahtar kayıttan **silinir**, doluysa yazılır. Doğrulama yoktur (0117 R7/2 aynen).
- **R9/3.** Yazıcı `tamirSevkKur`'un **kutu kapısını taşımaz:** o fonksiyon ilk satırında `if (!kutuAcikMi(form)) return {}` yapıyor ve `kutuAcikMi` geçici `_kalipAtolye` alanını ya da kalıp listesini okuyor (`kalipTamiri.js:104`, `:66`, ölçüm 21). Pano kayıtlı servisi yazar ve o kayıtta geçici alan yoktur; kapı kopyalanırsa kalıp listesi boşalmış bir kayıtta değer **sessizce düşer**. Çizim ölçütü panonun kendisindedir (R2).
- **R10.** Yazıcı yalnız bu alana dokunur: kalıp listesi, teslim şekli, kargo firması, takip numarası ve tarih olduğu gibi kalır.
- **R10/2.** Yasak **kayıt nesnesine** özgüdür: pano `{ ...s, kalipKargoSorumlusu }` yazmaz, kaydı yalnız `sevkSorumluYaz` kurar. 0117'nin yazıcı taraması iki nokta arıyor ve kısayol onu sessizce atlatır (ölçüm 15), bu yüzden kural kaynakta değil **spec'te** yazılı tutulur.
- **R10/3.** İşlem geçmişi ayrıntısı bu yasağın **dışındadır ve kısayolla yazılır**: işleyicinin parametresi `kalipKargoSorumlusu` adını taşır, ayrıntı `{ kalipKargoSorumlusu }` olur. Gerekçe ölçülmüştür (ölçüm 15): `{ kalipKargoSorumlusu: ad }` biçiminde iki noktalı yazım 0117 AC-38 taramasını düşürür (`tests/kalip-sevki-0117.test.js:104`), oysa Definition of Done o taramanın dokunulmadan geçmesini istiyor. Kısayol hem ayrıntı anahtarının alan adı olması geleneğini korur (`teknisyen_degisti` → `{ tech }`, `sorumlu_degisti` → `{ kargoSorumlusu }`) hem taramayı geçirir.

### C. İz

- **R11.** Seçim değişikliği İşlem Geçmişi'ne yazılır: eylem `kalip_sorumlu_degisti`, varlık `servis`, ad müşterinin adı, ayrıntı `{ kalipKargoSorumlusu }` (R10/3). Varlık, ad ve `serverPermissions` bugünkü `auditServis` yardımcısından gelir (`ServisPanosu.jsx:176`); yeni bir audit yardımcısı yazılmaz.
- **R11/2.** Var olan `sorumlu_degisti` eylemi **kullanılmaz**: etiketi "Kargo Sorumlusu Değişti" ve yedek parça ile Extra Kalıp kargosuna ait (ölçüm 8). Yeni eylemin etiketi `ACTION_LABELS` haritasına `kalip_sorumlu_degisti: "Kalıp Sorumlusu Değişti"` olarak eklenir.
- **R11/3.** **Etiketi paylaşılan tarama korumuyor** (ölçüm 14): `tests/islem-gecmisi-etiketleri.test.js` yalnız `logAction(` içindeki `action:` **sabitlerini** topluyor, panonun üç yardımcısı ise `action`'ı değişken kısayolu olarak geçiyor; testin kendi yorumu da eylem haritasının bilerek tek yönlü kaldığını yazıyor (`:68`). Bu yüzden etiketin varlığını **0119'un kendi testi** iddia eder ve paylaşılan tarama **değiştirilmez** (0082'nin bilinçli kararı).

### D. Değişmeyenler

- **R12.** Kart kalıbın teslim şeklini, kargo firmasını, takip numarasını ve kargo tarihini **basmaz** (0117 C12 aynen).
- **R12/2.** Sütun değişimi `kalipKargoSorumlusu`'na **dokunmaz:** kart Tamamlandı'dan çıkarılınca satır çizilmez ama değer kayıtta durur. Pano bugün sütun değişiminde `panoGizli`'yi temizliyor (`durumDegistir`), yani "sütun değişince alana dokunan" bir emsal var; bu alan o emsale **katılmaz**.
- **R13.** Makina Geçmişi'nin servis satırı, servis formunun sevk bölümü ve kargo etiketi çıktısı değişmez.
- **R14.** Kargo kartının ve Extra Kalıp kartının sorumlu seçicileri değişmez.

### E. Kanıt

- **R15.** Görsel kanıt aracına kalıbı atölyede olan, Tamamlandı sütununda duran ve sorumlusu dolu bir kartın ekranı eklenir. **Bilinçli değişen üç ekran:** `servis-pano-0115-onay`, `servis-pano-0115-kiosk` (ikisi de aynı kalıplı servisi Tamamlandı'ya sürüklüyor, ölçüm 17) ve yeni 0119 ekranı. `servis-pano-0115-rozet` (kart Yapılıyor'da kalıyor) ve öteki pano ekranları 0 piksel.
- **R15/2.** `ServisPanosu.jsx` kanıt eşlemesinde kayıt istemez (`tasarim.jsx`'i kullanmıyor, 0117 R32'de ölçüldü).
- **R15/3.** Yeni ekranın adı `servis-pano-0119-sorumlu`; verisi `scripts/evidence/0009-sayfa.jsx` **içinde yerel olarak** kurulur (0115 verisinin servisine `durum: "Tamamlandı"` ve `kalipKargoSorumlusu` eklenmiş bir kopya, `SERVIS_0115` deseni). `tests/fixtures/0115-veri.js` **dokunulmaz:** o fikstür 0115'in kıyas altınını (`tests/fixtures/0115-once.json`) üretti ve değiştirmek altını geçersiz kılar (ölçüm 18).

### F. Adlar, taramalar ve kapanış (QA turu, 2026-10-30)

- **R16.** Panodaki işleyicinin adı `sevkSorumluDegistir(id, kalipKargoSorumlusu)`'dur. **Ad tuzağı ölçüldü (ölçüm 13):** `kalipSorumluDegistir` adı `ServisPanosu.jsx:353`'te **doludur** ve Extra Kalıp kargo kartının `partSales.kargoSorumlusu`'nu yazar; kardeşi `kargoSorumluDegistir` (`:312`) yedek parça satışını yazar. Bir tarama `kalipSorumluDegistir` gövdesinin `setPartSales` yazmaya devam ettiğini sabitler, yani ad sonradan bu iş için kullanılamaz.
- **R17.** "Hook eklenmez" kuralı (C4) taramayla ölçülür: `ServisPanosu.jsx`'in `const Kart = ` ile başlayan diliminde (bir sonraki üst düzey bildirime kadar) `/\buse[A-Z]/` eşleşmesi **sıfırdır**.
- **R18.** Dokunulmayan taramalar adlarıyla yazılır ve hepsi **değiştirilmeden** geçer: 0117 AC-38 yazıcı listesi (`tests/kalip-sevki-0117.test.js:104`), C12 ad tuzağı (`:118`), AC-52 sunucu alan denetimi (`:132`), C4 izin tanımları (`:137`, `/sevk|kalipKargo/i`) ve 0117 AC-40 ile AC-41 (`tests/ui/kalip-sevki-0117.test.jsx:182-191`, `:203-210`).
- **R19.** Kapanış bekçisi 0118'in desenidir (`tests/manuel-satir-0118.test.js:88-100`): plan `specs/done/`'daysa `CLAUDE.md`'nin `(spec 0119, plan` ile `(spec 0118, plan` arasındaki dilimi "Tamamlandı: commit `<sha>`" taşır, dilimde `specs/0119-` yolu geçmez, `specs/0119-pano-kartinda-kalibi-gonderen-kisi.md` kalmaz ve `specs/README.md` satırı `(Tamamlandı)` olur. **Kanıt eşlemesi maddesi bu spec'te boş geçer,** çünkü `ServisPanosu.jsx` eşlemede kayıtlı değildir (R15/2, ölçüm 12).

---

## Zorunlu kısıtlar

- **C1.** **Ad tuzağı (0117 C1 ve C12 aynen):** pano `kalipFabrikaTeslim`, `sevkTeslimSekli` ve `sevkFabrikaTeslimMi` adlarını okumaz. Kart onarım yerini düz metin basıyor ve değerlerinden biri "Fabrika Teslim"; kalıbın teslim şekli aynı kartta basılırsa iki ibare yan yana durur. `tests/kalip-sevki-0117.test.js:118` dokunulmaz.
- **C2.** 0117 AC-38'in yazıcı taramasının dosya listesi (`KalipAtolyeAlani.jsx`, `kalipTamiri.js`) **değişmez**; yeni yazıcı ikinci dosyanın içinde doğar.
- **C3.** Yeni satır, kartın bugünkü kontrol kabıyla aynı davranışı taşır: tıklama kartın düzenleme açmasını yutar (`stopPropagation`) ve fare üstündeyken kartın sürüklenmesi kapanır (`dragKapaliId`). macOS'ta `draggable` bir atanın içindeki `select` açılıp seçimi işlemiyor; bu koruma yazılmazsa seçici kiosk ekranında çalışmaz.
- **C4.** Kart bir bileşen olarak değil doğrudan çağrıyla çiziliyor (saniyelik saat kartı söküp takmasın diye); yeni satır **hook getirmez**.
- **C5.** Yeni veri alanı, sütun, göç, izin kimliği, sunucu kuralı ve birleştirme kuralı yoktur. `ALAN_IZINLERI.services` yalnız `durum`u izlemeye devam eder (0117 AC-52 geçerli kalır); alan bölüm düzeyinde güvenilir, tıpkı teknisyen gibi.
- **C6.** Boş değer servis kaydının gövdesine yazılmaz; veritabanı okuması boş alanı zaten gövdeye koymuyor (0117 C3).
- **C7.** Seçici kayıt kilidine bakmaz, çünkü teknisyen seçicisi de bakmıyor; iki anlık eylem aynı kuralı taşır (ölçüm 7). Panonun sürükleme kilidi değişmez.

---

## Kapsam dışı

- **X1.** Kalıbın teslim şekli, kargo firması, takip numarası ve tarihinin kartta gösterilmesi — *neden:* 0117 C12 ve X11; kart onarım yerini zaten basıyor, ikinci bir "Fabrika Teslim" ibaresi aynı karışıklığı üretir.
- **X2.** Satırın Bekliyor ve Yapılıyor sütunlarında da çizilmesi — *neden:* Takım Yöneticisi Tamamlandı sütununu adlandırdı; alternatifi Karar 4'te yazılı, tek satırda açılır.
- **X3.** Kargo ve Extra Kalıp kartlarının sorumlu seçicilerine dokunulması — *neden:* ayrı kayıtlar ve ayrı alanlar; bu iş yalnız servis kaydının kalıp sorumlusunu ekler.
- **X4.** Üç sorumlu seçicisinin ortak bir bileşene çıkarılması — *neden:* tasarım sözlüğünün "Bilinen borç" işi; üçüncü kopya borcu adlandırır, ödemek ayrı spec'tir.
- **X5.** Makina Geçmişi'nin servis satırına aynı seçicinin eklenmesi — *neden:* orada kaydın kendi formu bir tık uzakta; pano eylem ekranıdır, geçmiş okuma ekranıdır.
- **X6.** Kalıbı gönderen kişi girilmeden kartın Tamamlandı'ya taşınmasının engellenmesi ya da uyarılması — *neden:* 0117 R7 hiçbir sevk alanını zorunlu yapmıyor; zorunluluk ayrı bir karardır.
- **X7.** Servis formundan girilmiş değerin Bekliyor ve Yapılıyor kartlarında da görünmesi — *neden:* R2'nin durum kapısı, yani "satır yok" ile "değer yok" aynı şey değildir: formdan girilen değer kayıtta durur ve kartta yalnız Tamamlandı sütununda görünür. Karar 4'ün asimetrisinin ekrandaki yüzüdür ve `specs/README.md`'nin açık bulgular tablosunda aynı satırda yazılıdır.

---

## Ölçümler (2026-10-30, kod `ca82fa9` ve 2026-10-27 yedeği)

1. **Beş sevk alanının hiçbiri bugün hiçbir ekranda görünmüyor.** Alanlar yalnız servis formunun sevk bölümünde yazılıyor, etiket adaptöründe teslim şekli ve tarih olarak okunuyor. `kalipKargoSorumlusu` hiçbir yerde **okunmuyor**: etikete basılmıyor, karta basılmıyor, Makina Geçmişi'nde yok.
2. **Yedekte sevk verisi yok, ama kullanılmaya başlandı.** 2026-10-27 yedeğinde 883 canlı servis var; panoda yalnız 2 (1 Yapılıyor, 1 Tamamlandı), arşivlenmiş 0, kalıp listesi taşıyan 0, beş sevk alanının her biri 0 kayıt. Bunun nedeni 0117'nin yedekten sonra yayınlanması; Takım Yöneticisi'nin 29.10.2026 tarihli ekran görüntüsünde Tamamlandı sütununda "KALIP ATÖLYEDE 1/1" rozetli gerçek bir kart var. Yani ölçüm yedekten, kullanım yedekten sonra başladı.
3. **Seçiciyi 15 canlı çalışan besliyor** (YUNUS ALTUNTAŞ, MUHAMMED SAKİ ÖZKAN, BURAK YÜCE ve ötekiler). Panodaki iki servisin ikisinde de teknisyen dolu.
4. **Aynı desen panoda zaten iki kez var ve kullanılıyor:** yedek parça satışlarının **273/992**'sinde, Extra Kalıp satışlarının **85/1214**'ünde `kargoSorumlusu` dolu. Kargo kartı bu alanı 🚚 ikonu ve "Kim gönderiyor?" boş seçeneğiyle gösteriyor (`KargoPanosu.jsx:80-85`).
5. **Kartın kontrol satırı bugün tek satır ve dört öğe taşıyor:** teknisyen seçicisi (esner), "Etiket" (kalıp varsa), "Yazdır" (Tamamlandı), "🗄 Kaldır" (Tamamlandı ve izin). 0117 AC-40 düğmenin yerini bu satırda sabitliyor; bu yüzden yeni seçici satıra sıkıştırılamaz.
6. **`calisanlar` ve `setServices` üç bağlama da geliyor:** sekme (`App.jsx:1738`), kiosk (`App.jsx:1424`), ayrı pencere (`ServisPencere.jsx:83-84`; yazma köprü üstünden `servis:mutate` ile ana pencereye gidiyor).
7. **Teknisyen değişikliği kilide bakmıyor,** yalnız `setServices` ve `cust_service_edit` kapısından geçip işlem geçmişine yazıyor (`ServisPanosu.jsx:435-439`). Panonun kilit denetimi yalnız sürükleme bırakmada.
8. **`sorumlu_degisti` etiketi haritada var** ama değeri "Kargo Sorumlusu Değişti" (`SettingsAuditLog.jsx:27`) ve bugün yedek parça ile Extra Kalıp kargosunda kullanılıyor. Servis kaydında aynı kimliği kullanmak geçmişte iki farklı işi aynı adla gösterir.
9. **0117'nin yazıcı taraması iki nokta arıyor:** `/\b(kalipFabrikaTeslim|...|kalipKargoSorumlusu)\s*:/`. Kısayol özellik yazımı iki nokta taşımadığı için taramayı geçer; yani tarama tek başına "tek yazıcı" kuralını korumuyor, kuralı spec yazılı tutmalı.
10. **İki sorumlu değiştirici bugün panonun kendi içinde:** `kargoSorumluDegistir` (`:312`) ve `kalipSorumluDegistir` (`:353`); ikisi de parti kimliklerine yayılıyor ve audit yazıyor. Servis tarafında eşdeğeri yok.
11. **Sunucu tarafı hazır:** `services` bölümü `customerActions` grubunda ve `BOLUM_SEKMELERI` "servis" sekmesini içeriyor, yani kiosk kullanıcısı bu yazımı bugün de yapabiliyor (teknisyen değişikliği aynı yoldan geçiyor). `ALAN_IZINLERI.services` yalnız `durum`.
12. **Kanıt ekranları:** `servis-pano-0115-rozet`, `-onay` (kartı Tamamlandı'ya sürüklüyor) ve `-kiosk` (aynı sürükleme) aynı fikstürden besleniyor ve fikstürde sevk alanı yok. `ServisPanosu.jsx` `docs/evidence/kanit-eslemesi.json`'da kayıtlı değil.

### QA turu ölçümleri (2026-10-30)

13. **`kalipSorumluDegistir` adı dolu:** `ServisPanosu.jsx:353` o adla **Extra Kalıp** kargo kartının `partSales.kargoSorumlusu`'nu yazıyor; kardeşi `kargoSorumluDegistir` (`:312`) yedek parça satışını yazıyor. İkisi de parti kimliklerine yayılıyor ve `sorumlu_degisti` audit'i atıyor. Aynı dosyada ikinci bir `kalipSorumlu...` hangi kaydın yazıldığını okunamaz kılar (R16).
14. **Etiket haritasını koruyan test panonun eylemlerini hiç görmüyor:** `tests/islem-gecmisi-etiketleri.test.js` yalnız `logAction(` çağrılarının içindeki `action:` sabitlerini topluyor (`:26-32`), panonun üç yardımcısı ise `logAction({ serverPermissions, action, ... })` ile **değişken kısayolu** geçiyor (`:176-178`), yani `action:` hiç oluşmuyor ve dinamik listeye de girmiyor. Testin kendi yorumu bunu yazıyor: "Eylem haritası bilerek tek yönlü kalır" (`:68`). Sonuç: `kalip_sorumlu_degisti` etiketsiz kalsa bile paylaşılan tarama yeşil kalır (R11/3).
15. **0117'nin yazıcı taraması iki nokta arıyor:** `/\b(kalipFabrikaTeslim|...|kalipKargoSorumlusu)\s*:/` ve yazan dosyaların yalnız `KalipAtolyeAlani.jsx` ile `kalipTamiri.js` olmasını istiyor (`tests/kalip-sevki-0117.test.js:104`). İşlem geçmişi ayrıntısı `{ kalipKargoSorumlusu: ad }` biçiminde yazılırsa `ServisPanosu.jsx` o listeye girer ve tarama düşer; kısayol (`{ kalipKargoSorumlusu }`) iki nokta taşımadığı için geçer (R10/2, R10/3).
16. **Sürükleme ve tıklama koruması eylem satırının kendi `<div>`'inde:** `onClick={e => e.stopPropagation()}`, `onMouseEnter={() => setDragKapaliId(sv.id)}`, `onMouseLeave={() => setDragKapaliId(id => id === sv.id ? null : id)}` (`ServisPanosu.jsx:697-701`) ve kesikli üst çizgi aynı kapta. Koruma iki kardeş satıra kopyalanırsa fareyi birinden ötekine geçirmek `mouseLeave` (null) ile `mouseEnter` (id) çiftini üretir ve sonuç sıraya bağlı kalır; ayrıca var olan test kontrol satırını `getByRole("combobox").closest("div")` ile buluyor (`tests/ui/servis-panosu.test.jsx:188`). R1/3 tek kap diyor.
17. **`-kiosk` kanıt ekranı da kartı Tamamlandı'ya sürüklüyor:** `scripts/evidence/0009-sayfa.jsx`'te `servis-pano-0115-onay` ve `servis-pano-0115-kiosk` adımları aynı (`surukle-servis:41>Tamamlandı`) ve servis 41 kalıp listesi taşıyor, yani yeni satır **iki ekranda** da çizilir. `-rozet` adımsızdır ve kart Yapılıyor'da kalır (R15).
18. **0115 fikstürü altını üretti:** `tests/fixtures/0115-veri.js` başlığında "veriyi değiştirmek altını geçersiz kılar" yazıyor ve `tests/fixtures/0115-once.json` o veriyle üretildi; fikstürde Tamamlandı, kalıplı ve sorumlusu dolu servis yok. Yeni kanıt ekranının verisi bu yüzden araç dosyasında yerel kurulur (R15/3).
19. **Erişilebilirlik:** kargo kartının ikonu `<span style={{ fontSize: 12 }}>🚚</span>` (`KargoPanosu.jsx:80`) `aria-hidden` **taşımıyor**; teknisyen seçicisinin `aria-label`'ı yok ve testler onu seçeneğin metniyle buluyor (`tests/ui/servis-panosu.test.jsx:447`). Kartta ikinci bir seçici doğduğu için yeni seçici ad ister (R5/2, R5/3).
20. **Etiket düğmesinin müşteri kapısı var, yeni satırın yok:** düğmenin kapısı `kalipAtolyedeMi(sv) && custMap[Number(sv.customerId)]` (`ServisPanosu.jsx:716`) ve 0117 AC-15 müşterisiz kartta düğmenin olmadığını ölçüyor (`tests/ui/kalip-sevki-0117.test.jsx:179`, fikstürde servis 46). `auditServis` adı `custMap`'ten okuduğu için müşterisiz kayıtta `entityName` boş kalır (`:176`). R2/3 kapıyı eklemiyor.
21. **`tamirSevkKur` kutu kapısı taşıyor:** ilk satırı `if (!kutuAcikMi(form)) return {}` (`kalipTamiri.js:104`) ve `kutuAcikMi` geçici `_kalipAtolye` alanını ya da kalıp listesini okuyor (`:66`). Pano kayıtlı servisi yazar, o kayıtta geçici alan yoktur; kapının kopyalanması kalıp listesi boşalmış kayıtta sessiz veri kaybı üretir (R9/3).
22. **0117 AC-55'in testi yalnız "İşlemde" kartını ölçüyor:** `tests/ui/kalip-sevki-0117.test.jsx:211-216` o karttan "Fabrika Teslim" dizesinin yokluğunu ve "Fabrikada Onarım" dizesinin varlığını istiyor. Yeni satır o kartta çizilmiyor ve Tamamlandı kartında bile o iki dizeyi basmıyor, yani **iddia dokunulmadan geçer**; ters çevrilme yalnız kriterin metnindedir.
23. **İki test kart içinde TEKİL `getByRole("combobox")` kullanıyor** (`tests/ui/servis-panosu.test.jsx:176`, `:188`) ve ilk sürüklenebilir kartı okuyor. O dosyanın fikstüründe `atolyeKaliplari` yok (`services: [{ id: 10, durum: "Bekliyor" }, { id: 11, durum: "Yapılıyor" }, { id: 99 }]`), yani yeni satır çizilmiyor ve iki test geçiyor (ölçüldü). O fikstüre kalıp listesi eklenirse iki sorgu çoğula çevrilmelidir.
24. **Anahtarın silinmesi veritabanında güvenli:** `kalipSevkYaz` beş alanı `s.<alan> || null` ile yazıyor (`electron/db.cjs:447-451`), yani eksik anahtar `NULL` olur ve bağlama hatası doğmaz; okuma `kalipSevkOku` ile boş değeri gövdeye hiç koymuyor (`:452-455`). AC-12 uygulanabilir.
25. **0117'nin pano fikstürü 0119'un ihtiyacı olan altı hâli zaten taşıyor:** `SV_PANO` (`tests/ui/kalip-sevki-0117.test.jsx:159-165`) 44 (Tamamlandı + kalıp), 45 (aynısı + `panoGizli`), 43 ve 46 (Bekliyor + kalıp, 46'nın müşterisi çözülmez), 41 (Yapılıyor + kalıp) ve 42 (kalıpsız) servislerini içeriyor. 0119'un UI testi bu şekli devralabilir; 0117'nin kendi pano testleri de kart 44'te yeni satırı çizecek ve yapısal iddiaları etkilenmiyor (ölçüm 22, R18).
26. **Üç ölçüm bu turda yeniden doğrulanamadı:** ölçüm 2, 3 ve 4 canlı veri sayılarıdır; bu makinede yerel veritabanı (`~/Library/Application Support/makina-crm/`), proje kökünde `*.db` ve yedek JSON bulunamadı. Üçü 2026-10-27 yedeğine dayalı olarak kabul edildi; kodla doğrulanabilen her ölçüm doğrulandı.
27. **`specs/README.md` 0119'u zaten anlatıyor:** kuyruk cümlesi (`:31`), spec satırı (`:176`) ve Karar 4'ün asimetrisi açık bulgular tablosunda (`:188`) yazılı. Kalan belge işi `CLAUDE.md`'nin Servis Panosu bölümüdür.
28. **Şablon sapması:** bu spec'in SCORECARD ölçütleri ("Kapsam netliği" vb.) `specs/TEMPLATE.md:152-158`'in beş ölçütünden ("Spec revizyon sayısı", "Düzeltme turu sayısı", "Bulgu gerçek/gürültü oranı", "Regresyon sayısı", "Kaçan hata" ve "Bu spec'ten çıkarılan ders") ve 0114-0118'in doldurduğu tablodan farklı; Definition of Done da `- [ ]` kutusu yerine numaralı liste kullanıyor ve şablonun son maddesini ("Commit ve sürüm yayını yalnız açık talimatla yapılır", `TEMPLATE.md:137`) **taşımıyor**.

---

## Kararlar

1. **Seçici okunur değil, yazılabilir olur** (R1, R6, R7). **Takım Yöneticisi kararı, 2026-10-30.** Gerekçe: alan yalnız servis formundan doldurulabildiği için salt okunur satır Tamamlandı kartlarının çoğunda boş görünür ve kullanıcıyı formu açmaya zorlar; panoda aynı desenin iki kullanılan örneği var (ölçüm 4, ölçüm 10). Maliyet: bir yazma yolu, bir audit eylemi, üç bağlamda ölçüm.
2. **Metin teslim şeklinden bağımsız tek nötr sorudur** (R5). **Takım Yöneticisi kararı, 2026-10-30.** Gerekçe: formdaki etiket Fabrika Teslim'de "Teslim Eden Kişi"ye dönüyor, ama kartın aynı dili kullanması 0117'nin C1 taramasını ters çevirip panoya teslim şeklini okutur ve kartta iki teslim ibaresi yan yana durur (C1, ölçüm 5). Alternatif: kart teslim şeklini okur ve etiketi değiştirir; bu seçilirse `tests/kalip-sevki-0117.test.js:118` gevşetilir ve 0117 AC-55'in ilk yarısı da ters çevrilir.
3. **Yeni satır, var olan satırın altında ve tam genişlikte** (R1/2). Gerekçe: aynı satıra sıkıştırmak Tamamlandı kartında beş öğe yapar (ölçüm 5), "Etiket" ile "Yazdır" sıkışır ve 0117 AC-40'ın konum iddiası ölçülemez olur. Takım Yöneticisi'nin cümlesi de alt alta diyor ("servisi yapanın altında yazsın").
4. **Satır yalnız Tamamlandı sütununda ve kalıp varken çizilir** (R2, X2). Gerekçe: Takım Yöneticisi sütunu adlandırdı. **Bilinen asimetri:** 0117 Karar 12 etiket düğmesini bilerek durumdan bağımsız yaptı, çünkü kalıp genellikle kart Yapılıyor'dayken kutulanıyor; aynı gerekçe seçici için de geçerli olabilir. **Alternatif (tek satırda açılır):** ölçüt yalnız `kalipAtolyedeMi` olur, durum kapısı düşer; o zaman satır üç sütunda da görünür ve etiket düğmesiyle aynı yaşam süresini taşır. Önerim Takım Yöneticisi'nin istediği gibi Tamamlandı ile başlamak, kullanımda dar gelirse tek satırla açmak.
5. **Yazıcı kitaplıkta kalır** (R9, R10/2, C2). Gerekçe: kısayol yazım taramayı atlatıyor (ölçüm 9) ve pano kendi nesnesini kurarsa 0117'nin "tek yazıcı" kuralı kaynakta değil yalnız testte yaşar. Maliyet: `kalipTamiri.js`'e üç satırlık saf fonksiyon.
6. **Yeni audit eylemi açılır** (R11/2). Gerekçe: var olan kimlik kargo kayıtlarına ait ve etiketi yanlış okunur (ölçüm 8); etiket haritası testle korunuyor, yani yeni kimlik etiketsiz kalamaz.
7. **Kilit denetimi yok** (C7). Gerekçe: teknisyen seçicisi de bakmıyor; anlık iki eylemden birine kilit koymak panoda tutarsız davranış üretir. Kilit istenirse iki seçiciye birden ayrı işte gelir.
8. **İkon kargo kartıyla aynıdır (🚚)** (R5/2). **Takım Yöneticisi kararı, 2026-10-30.** Gerekçe: analist iki satır karışmasın diye ayrı bir ikon önermişti; Takım Yöneticisi mockup turunda panonun kendi dilini tek tutmayı seçti. Satırların ayrımı kart türünden ve seçicinin erişilebilir adından okunur.

### QA turunda verilen kararlar (2026-10-30)

9. **İşlem geçmişi ayrıntısı kısayolla yazılır, kayıt nesnesi yalnız yazıcıdan kurulur** (R10/2, R10/3). *Gerekçe:* ölçüm 15; iki noktalı ayrıntı 0117 AC-38 taramasını düşürür ve Definition of Done'un "dokunulmadan geçer" maddesiyle çelişir. Kısayol hem alan adı geleneğini korur hem taramayı geçirir.
10. **Etiketin varlığını 0119'un kendi testi iddia eder; paylaşılan tarama değiştirilmez** (R11/3, AC-40). *Gerekçe:* ölçüm 14; panonun eylemleri taramaya görünmüyor, yani R11/2'nin ve eski Karar 6'nın "etiketsiz kalamaz" gerekçesi yanlıştı. Etiket eklenmezse ekranda ham anahtar görünür ve hiçbir test ötmez.
11. **Panodaki işleyicinin adı `sevkSorumluDegistir`** (R16). *Gerekçe:* ölçüm 13; `kalipSorumluDegistir` adı Extra Kalıp kargosunda dolu ve 0115 B-1 ile 0117 C1 sınıfı bir ad tuzağı doğar.
12. **İki satır tek kapta toplanır** (R1/3). *Gerekçe:* ölçüm 16; korumanın kopyalanması macOS'ta seçiciyi kullanılamaz kılabilir ya da davranışı fare sırasına bağlar. Tek kap 0117 AC-40 ve AC-41 ile uyumludur (ölçüldü).
13. **`-kiosk` ekranı da bilinçli değişenler arasındadır** (R15, AC-45). *Gerekçe:* ölçüm 17; "0 piksel beklenir" yazılı kalırsa kanıt turu sahte gerileme olarak okunur.
14. **Yeni kanıt ekranının verisi araç dosyasında yerel kurulur** (R15/3). *Gerekçe:* ölçüm 18; 0115 fikstürünü düzenlemek bu işle ilgisi olmayan bir kıyas testini düşürür.
15. **Yeni seçici `aria-label` taşır, yeni ikon `aria-hidden` olur** (R5/2, R5/3). *Gerekçe:* ölçüm 19; kartta iki adsız seçici hem ekran okuyucuda hem testte ayırt edilemez. Kargo kartının eksik `aria-hidden`'ı dokunulmaz ve X4'ün borcuna yazılır.
16. **Müşteri kapısı eklenmez** (R2/3). *Gerekçe:* ölçüm 20; etiket düğmesinin kapısı etiketin alıcı bloğu içindi, burada öyle bir bağımlılık yok ve teknisyen seçicisi de müşterisiz kartta çiziliyor. İşlem geçmişinde adın boş kalması kabul edilir.
17. **`disabled` yalnız izne bakar, `setServices` denetimi işleyicide kalır** (R7/2). *Gerekçe:* teknisyen seçicisinin bugünkü iş bölümü; `disabled`'a `setServices` konursa AC-18 ölçülemez hâle gelir ve iki seçici ayrışır.
18. **Yazıcı kutu kapısı taşımaz** (R9/3). *Gerekçe:* ölçüm 21; "`tamirSevkKur` ile aynıdır" ibaresi kopyalamaya davet ediyordu ve kalıp listesi boşalmış kayıtta sessiz veri kaybı üretirdi.
19. **Liste `tekAdlari`'nı yeniden kullanır, boş listede satır yine çizilir** (R3/2, R4/2). *Gerekçe:* ikinci bir çalışan okuması gereksiz; satırın boş listede kaybolması kayıtlı değeri de gizler.
20. **Biçim kaynağı teknisyen seçicisi, ikon kaynağı kargo kartıdır** (R3, R5/2). *Gerekçe:* kargo kartının `cursor`'u izne bağlı (`KargoPanosu.jsx:83`), teknisyeninki değil; "ikizi" ibaresi hangi ikiz olduğunu söylemeliydi.
21. **Sütun değişimi alana dokunmaz** (R12/2, AC-42). *Gerekçe:* "satır yok" ile "değer yok" aynı şey değil; panoda sütun değişiminde `panoGizli`'yi temizleyen bir emsal var ve bu alanın o emsale katılmadığı yazılı olmalı.
22. **Formdan girilen değerin kartta yalnız Tamamlandı'da görünmesi kapsam dışıdır** (X7). *Gerekçe:* Karar 4'ün asimetrisinin ekrandaki yüzü; README'nin açık bulgu satırıyla aynı kararın parçası.
23. **"Hook eklenmez" taraması tanımlanır** (R17, AC-43). *Gerekçe:* ölçülemeyen kriter koruma değildir ve burada korunan şey kiosk'ta açık `<select>`'in kapanmaması.
24. **Metin sabiti `SEVK_SORUMLU_SORUSU` adını alır** (R5). *Gerekçe:* 0115 R39'un "metinler tek yerde ve adıyla" kuralı; adsız sabit ikinci kopyayı davet eder.
25. **Dokunulmayan taramalar adlarıyla yazılır** (R18, AC-47). *Gerekçe:* Definition of Done "0117'nin dört taraması" diyordu ama hangileri olduğu dosya ve satırla yazılı değildi.
26. **Kapanış bekçisi 0118'in deseniyle tanımlanır ve kanıt maddesinin boş geçeceği yazılır** (R19, AC-49). *Gerekçe:* `ServisPanosu.jsx` kanıt eşlemesinde kayıtlı olmadığı için o madde bu spec'te hiçbir şey ölçmez; yazılı olmazsa sonraki okuyucu eksik sanır.
27. **Definition of Done ve SCORECARD şablona çevrilir** (ölçüm 28). *Gerekçe:* eksik olan satır duran bir politikadır ("Commit ve sürüm yayını yalnız açık talimatla yapılır", `TEMPLATE.md:137`); SCORECARD ölçütleri de 0114-0118 ile karşılaştırılabilir kalmalı.
28. **Sütunun ekrandaki adı kriterlere yazılır** (AC-4). *Gerekçe:* Yapılıyor sütununun başlığı ekranda "İşlemde"; ölçüt saklanan `durum` değeridir ama kriteri okuyan geliştirici ekranda o adı aramaz.
29. **Üç ölçümün yeniden doğrulanamadığı yazılır** (ölçüm 26). *Gerekçe:* "Belirsizlikte varsayma" kuralı; sayıların yeniden ölçülmediği yazılı olmadan kabul edilmesi sessiz varsayım olurdu.
30. **README'nin yazılı olduğu doğrulanır** (ölçüm 27, Definition of Done). *Gerekçe:* yapılmış işi yeniden yapmak spec'i kirletir; kalan iş `CLAUDE.md`'dir.
31. **Tekil `combobox` sorgusu kuralı yazılır** (ölçüm 23). *Gerekçe:* bugün güvenli ama fikstür değişirse sessizce kırılır; kural yazılı olmalı.
32. **Panoyu ölçen Electron testi olmadığı yazılır** (Definition of Done). *Gerekçe:* madde "Electron testleri de koşuldu" diyor, oysa bu işte risk altındaki bir Electron testi yok; rutin tam koşudur.
33. **Veritabanı tarafının güvenli olduğu ölçüldü ve yazıldı** (ölçüm 24). *Gerekçe:* anahtarın silinmesi `undefined` bağlama hatası üretebilirdi; ölçüm bunu dışarıda bıraktı ve AC-12'yi uygulanabilir kıldı.
34. **0117'nin pano fikstürünün devralınacağı yazıldı** (ölçüm 25). *Gerekçe:* altı hâl zaten kurulu; yeni bir fikstür icat etmek hem iş hem sapma riskidir.
35. **0117 AC-55'in ters çevrilmesinin yalnız metinde olduğu yazıldı** (başlık satırı, AC-46). *Gerekçe:* ölçüm 22; iddiayı gereksiz yere değiştiren bir geliştirici 0117'nin korumasını zayıflatır, hiç dokunmayan ise güncellemeyi atladığını sanır.

### Plan turunda verilen kararlar (2026-10-30)

Takım Yöneticisi uygulama planındaki on önerinin hepsini onayladı (`specs/0119-uygulama-plani.md`).

36. **Ana dizinde commit'lenmemiş iki düzeltme 0119'dan önce main'e kendi commit'iyle alınır** (plan Ö1). Servis Formu'nun kalıp başlığının büyük harften çıkması ve panonun "Yazdır"ının dil sorması (`DilSecPenceresi`) `ServisPanosu.jsx`'e ve 0117 testlerine dokunuyordu; dal onların üstünden açıldı (commit `e20e249`). *Gerekçe:* iki iş karışmaz, kanıt tabanı bugünkü ekranı gösterir.
37. **AC-16'nın taraması izin listesiyle kurulur** (plan Ö2). `ServisPanosu.jsx`'te `kalipKargoSorumlusu` yalnız dört biçimde geçer: okuma (`sv.kalipKargoSorumlusu`), işleyicinin parametresi, `sevkSorumluYaz(s, kalipKargoSorumlusu)` ve `auditServis("kalip_sorumlu_degisti", id, { kalipKargoSorumlusu })`; öteki dört sevk alanı dosyada hiç geçmez. *Gerekçe:* AC-16 kısayolu yasaklıyor, R10/3 iz ayrıntısında kısayolu istiyor; düz tarama ikisini ayıramaz, izin listesi asıl tehlike olan `{ ...s, kalipKargoSorumlusu }` biçimini yakalar.
38. **İşleyici teknisyen işleyicisinin birebir ikizidir** (plan Ö3): `if (!setServices || !canDo("cust_service_edit")) return;`, yazım `sevkSorumluYaz` ile, ardından iz. *Gerekçe:* iki seçici ayrışmasın.
39. **Kabın bölünmesi var olan testi kırarsa yalnız sorgusu düzeltilir** (plan Ö4). *Ölçüldü:* `tests/ui/servis-panosu.test.jsx:188` dokunulmadan geçti (React'in sentetik `mouseenter`'ı dış kaba ulaşıyor), düzeltme gerekmedi.
40. **AC-43'ün dilimi** `  const Kart = ` satırından aynı girintideki bir sonraki `  const ` ya da `  return (` satırına kadardır (plan Ö5). *Gerekçe:* `Kart` iç içe girintili bir değişken; "üst düzey bildirim" bu dosyada girintiyle anlam kazanır.
41. **0117 AC-55'in metnine done klasöründe tek cümlelik not eklenir, testin yalnız adı güncellenir** (plan Ö6). *Gerekçe:* AC-46 metin notunu istiyor; not 0117'nin kapanış bekçisini etkilemez.
42. **README'ye dalda 0119 satırı ve Karar 4 bulgu satırı analistin metninden alınır, kuyruk cümlesi güncellenir** (plan Ö7). *Gerekçe:* DoD satırların yazılı olduğunun doğrulanmasını istiyor.
43. **Yeni kanıt ekranının verisi `SERVIS_0115`'in kopyası, `Pano0115`'e isteğe bağlı `ilk` prop'u eklenir** (plan Ö8). Öteki ekranların verisi değişmez; `ServisPanosu.jsx` eşlemede kayıtlı olmadığı için `kanit-eslemesi.json`'a kayıt eklenmez. *Gerekçe:* R15/3.
44. **AC-22 tek kabın asıl amacıyla ölçülür** (plan Ö9): kaba girince kart sürüklenmez, iki iç satır arasında gezinmek açmaz, kaptan çıkınca açılır.
45. **AC-20 0117'nin `servisBridge` düzeneğiyle ölçülür** (plan Ö10): köprünün `mutate` çağrısı `services` anahtarıyla yapılır ve gövdedeki kayıtta değer bulunur.

### Karar kaydı

| # | Bulgu | Derece | Karar |
|---|---|---|---|
| B-1 | Ayrıntı anahtarı 0117 AC-38 taramasını kırar; R10/2 ikisini ayırmıyor | Bloklayıcı | R10/2, R10/3, Karar 9, AC-39, ölçüm 15 |
| B-2 | Etiket haritası taraması yeni eylemi görmez; R11/2 ve AC-25 boş | Bloklayıcı | R11/3, Karar 10, AC-40, ölçüm 14 |
| B-3 | `kalipSorumluDegistir` adı Extra Kalıp kargosunda dolu | Bloklayıcı | R16, Karar 11, AC-41, ölçüm 13 |
| B-4 | İkinci satırın sürükleme ve tıklama korumasının yeri tanımsız | Bloklayıcı | R1/3, Karar 12, AC-33, ölçüm 16 |
| Ö-1 | `-kiosk` kanıt ekranı da değişir, R15 kendisiyle çelişiyor | Önemli | R15, Karar 13, AC-45, ölçüm 17 |
| Ö-2 | Yeni kanıt ekranının adı ve verisi; 0115 fikstürü tuzağı | Önemli | R15/3, Karar 14, AC-44, ölçüm 18 |
| Ö-3 | Erişilebilir ad yok; "`aria-hidden` kalır" iddiası yanlış | Önemli | R5/2, R5/3, Karar 15, AC-35, ölçüm 19 |
| Ö-4 | Müşterisi çözülmeyen kartta satır çizilir mi | Önemli | R2/3, Karar 16, AC-34, ölçüm 20 |
| Ö-5 | R7'nin iki parçalı kapısı ile AC-17 ve AC-18'in iş bölümü | Önemli | R7/2, Karar 17, AC-36 |
| Ö-6 | 0117 AC-55'in ters çevrilmesi yalnız metinde | Önemli | Başlık satırı, Karar 35, AC-46, ölçüm 22 |
| Ö-7 | AC-23'ün "hook eklenmez" taraması tanımsız | Önemli | R17, Karar 23, AC-43 |
| Ö-8 | Seçenek listesinin değişkeni ve boş çalışan listesi | Önemli | R3/2, R4/2, Karar 19, AC-37, AC-48 |
| Ö-9 | Yazıcı `tamirSevkKur`'un kutu kapısını taşımamalı | Önemli | R9/3, Karar 18, AC-38, ölçüm 21 |
| Ö-10 | Definition of Done'da commit ve sürüm politikası satırı yok | Önemli | Definition of Done, Karar 27, ölçüm 28 |
| Ö-11 | Sütun değişiminde değerin ne olacağı ve formdan girilenin görünmemesi | Önemli | R12/2, X7, Karar 21, Karar 22, AC-42, AC-50 |
| K-1 | `ServisPencere.jsx` satır atfı (`:85` → `:83-84`) | Küçük | ölçüm 6 |
| K-2 | Metin sabitinin adı yok | Küçük | R5, Karar 24 |
| K-3 | Yapılıyor sütununun ekrandaki adı "İşlemde" | Küçük | AC-4, Karar 28 |
| K-4 | "İkizi" hangi seçici: biçim ve ikon kaynağı ayrı | Küçük | R3, R5/2, Karar 20 |
| K-5 | Kapanış bekçisi tanımsız; kanıt maddesi boş geçecek | Küçük | R19, Karar 26, AC-49 |
| K-6 | AC-29'un taraması adlandırılmamış | Küçük | R18, Karar 25, AC-47 |
| K-7 | Üç canlı veri ölçümü yeniden doğrulanamadı | Küçük | ölçüm 26, Karar 29 |
| K-8 | Tekil `combobox` sorgusu iki testte, bugün güvenli | Küçük | ölçüm 23, Karar 31 |
| K-9 | AC-30'un uyarı iddiası adıyla bağlanmalı | Küçük | AC-30 |
| K-10 | SCORECARD ve Definition of Done şablondan sapıyor | Küçük | Karar 27, ölçüm 28 |
| K-11 | İki Definition of Done maddesinin bir kısmı zaten yapılmış | Küçük | Karar 30, ölçüm 27 |
| K-12 | Definition of Done 8'in Electron kapsamı | Küçük | Karar 32 |
| P-1 | Commit'lenmemiş iki düzeltme dalın dokunacağı dosyalarda | Önemli | Karar 36 |
| P-2 | AC-16 ile R10/3 çelişiyor | Önemli | Karar 37, AC-16 |
| P-3 | İşleyicinin kapısı | Küçük | Karar 38, AC-17, AC-18, AC-36 |
| P-4 | Kabın bölünmesi var olan sürükleme testini etkileyebilir | Önemli | Karar 39 |
| P-5 | AC-43'ün dilimi tanımsız | Küçük | Karar 40, AC-43 |
| P-6 | 0117 AC-55'in metni done klasöründe | Küçük | Karar 41, AC-46 |
| P-7 | README satırları dalda yok | Küçük | Karar 42, AC-32 |
| P-8 | Kanıt ekranının verisi | Küçük | Karar 43, AC-44 |
| P-9 | AC-22'nin ölçümü | Küçük | Karar 44, AC-22 |
| P-10 | AC-20'nin ölçümü | Küçük | Karar 45, AC-20 |

---

## Kabul kriterleri

- **AC-1.** Kalıbı atölyede olan servis Tamamlandı sütunundayken kartta teknisyen seçicisinin **altında** ikinci bir seçici çizilir.
- **AC-2.** Yeni seçici kartın eylem satırını değiştirmez: teknisyen seçicisi, "Etiket", "Yazdır" ve "🗄 Kaldır" bugünkü sıra ve yerlerinde kalır (0117 AC-40 aynen geçer).
- **AC-3.** Seçici Bekliyor sütunundaki kartta çizilmez.
- **AC-4.** Seçici Yapılıyor sütunundaki kartta çizilmez (sütunun ekrandaki başlığı "İşlemde"; ölçüt saklanan `durum` değeridir).
- **AC-5.** Kalıp listesi olmayan Tamamlandı kartında seçici çizilmez.
- **AC-6.** Arşivlenmiş (panodan kaldırılmış) kartta seçici çizilmez.
- **AC-7.** Kalıp ölçütü etiket düğmesiyle aynı fonksiyondan (`kalipAtolyedeMi`) okunur; panoda ikinci bir kalıp ölçütü yazılmaz (kaynak taraması).
- **AC-8.** Seçicinin boş seçeneği `Kalıbı kim veriyor?` yazar; metin `lib/kalipTamiri.js`'teki tek sabitten (`SEVK_SORUMLU_SORUSU`) gelir ve `src/components` altında düz metin olarak geçmez (kaynak taraması). Satırın başında kargo kartındaki 🚚 ikonu durur.
- **AC-9.** Seçici firma çalışanlarının canlı adlarını listeler.
- **AC-10.** Kayıtta duran ad çalışan listesinde yoksa listenin başında görünür ve seçili kalır.
- **AC-11.** Bir ad seçilince servis kaydına `kalipKargoSorumlusu` o değerle yazılır.
- **AC-12.** Boş seçenek seçilince anahtar servis kaydından **silinir** (`"kalipKargoSorumlusu" in kayit === false`), boş dize yazılmaz.
- **AC-13.** Yazım kaydın öteki sevk alanlarına ve `atolyeKaliplari`'na dokunmaz.
- **AC-14.** Yazıcı saf fonksiyondur, `lib/kalipTamiri.js`'te durur, değeri kırpar ve kırpılmış değer boşsa anahtarı siler.
- **AC-15.** 0117'nin yazıcı taraması aynen geçer: beş alanı iki nokta ile yazan dosyalar yalnız `KalipAtolyeAlani.jsx` ve `kalipTamiri.js`'tir.
- **AC-16.** `ServisPanosu.jsx` beş alandan hiçbirini kısayol özellik yazımıyla da yazmaz (kaynak taraması; kayıt nesnesini yalnız yazıcı kurar).
- **AC-17.** `cust_service_edit` izni olmayan kullanıcıda seçici **pasif** çizilir ve değeri okunur; gizlenmez.
- **AC-18.** `setServices` gelmeyen bağlamda seçim kayda yazmaz ve hata vermez.
- **AC-19.** Seçici kiosk bağlamında çizilir ve çalışır.
- **AC-20.** Seçici ayrı pencere bağlamında çizilir ve seçim köprü üstünden ana pencereye gider.
- **AC-21.** Seçiciye tıklamak kartın düzenleme penceresini açmaz.
- **AC-22.** Fare seçicinin üstündeyken kart sürüklenebilir olmaktan çıkar (macOS `select` koruması).
- **AC-23.** Yeni satır panoya hook eklemez; kart doğrudan çağrı olmaya devam eder (kaynak taraması).
- **AC-24.** Seçim değişikliği İşlem Geçmişi'ne `kalip_sorumlu_degisti` eylemi, `servis` varlığı ve müşterinin adıyla yazılır.
- **AC-25.** `kalip_sorumlu_degisti`'nin etiketi Ayarlar'ın eylem haritasında "Kalıp Sorumlusu Değişti" olarak vardır. Paylaşılan etiket kapsamı testi bu eylemi **ölçmez** (ölçüm 14), bu yüzden iddiayı AC-40 taşır.
- **AC-26.** Var olan `sorumlu_degisti` eylemi ve etiketi değişmez; kargo ile Extra Kalıp kartlarının davranışı aynıdır.
- **AC-27.** Kart kalıbın teslim şeklini, kargo firmasını, takip numarasını ve kargo tarihini basmaz; `ServisPanosu.jsx` `kalipFabrikaTeslim`, `sevkTeslimSekli` ve `sevkFabrikaTeslimMi` adlarını anmaz (0117 C12 taraması dokunulmadan geçer).
- **AC-28.** Makina Geçmişi'nin servis satırı, servis formunun sevk bölümü ve kargo etiketi çıktısı bu işle değişmez.
- **AC-29.** Yeni veri alanı, sütun, göç, izin kimliği, sunucu kuralı ve birleştirme kuralı yoktur; `ALAN_IZINLERI.services` yalnız `durum`u izler (0117 AC-52 geçer).
- **AC-30.** Kanıt aracına kalıbı atölyede, Tamamlandı sütununda ve sorumlusu dolu bir kartın ekranı eklenir; çekim raporunda `adimUyarilari` alanı yoktur (0117 Karar 51 ile eklenen alan).
- **AC-31.** Bilinçli değişen ekran yalnız yeni satırı gösterenlerdir; öteki pano ekranları 0 piksel farkla çıkar ve değişenler rapora adıyla yazılır.
- **AC-32.** `CLAUDE.md`'nin Servis Panosu bölümü ve `specs/README.md` yeni satırı ve kararlarını anlatır; spec `specs/done/`'a taşınır (kapanış bekçisi).

### QA turu kriterleri (2026-10-30)

- **AC-33.** İki kontrol satırı tek kapta durur: kap kesikli üst çizgiyi, `stopPropagation`'ı ve iki fare işleyicisini taşır; iç eylem satırının çocukları bugünkü dört öğedir ve koruma kardeş satıra kopyalanmamıştır (kaynak taraması).
- **AC-34.** Müşterisi çözülmeyen ("(müşteri yok)") Tamamlandı ve kalıplı kartta satır çizilir; aynı kartta etiket düğmesi yoktur (0117 AC-17 aynen) ve işlem geçmişi kaydının adı boş kalabilir.
- **AC-35.** Yeni seçici `aria-label="Kalıbı gönderen kişi"` taşır ve yeni ikon `aria-hidden="true"`dır; kargo kartının ikonu değişmez.
- **AC-36.** Seçicinin `disabled`'ı yalnız `cust_service_edit`'e bakar; `setServices` denetimi işleyicidedir (kaynak taraması).
- **AC-37.** Çalışan listesi boşken satır yine çizilir ve kayıtta duran ad seçicide görünür.
- **AC-38.** Yazıcı kalıp kutusu kapısı taşımaz: kalıp listesi boş bir kayıtta da çağrıldığında değeri yazar (birim testi).
- **AC-39.** İşlem geçmişi ayrıntısı kısayolla yazılır ve 0117 AC-38 yazıcı taraması dokunulmadan geçer: beş alanı iki noktayla yazan dosyalar yalnız `KalipAtolyeAlani.jsx` ve `kalipTamiri.js`'tir.
- **AC-40.** `SettingsAuditLog.jsx`'in `ACTION_LABELS` haritasında `kalip_sorumlu_degisti: "Kalıp Sorumlusu Değişti"` girdisi birebir vardır (0119'un kendi iddiası; paylaşılan tarama değiştirilmemiştir).
- **AC-41.** Panodaki işleyicinin adı `sevkSorumluDegistir`'dir ve `kalipSorumluDegistir` `setPartSales` yazmaya devam eder (kaynak taraması).
- **AC-42.** Kart Tamamlandı'dan Yapılıyor'a taşınınca satır çizilmez ama `kalipKargoSorumlusu` kayıtta durur.
- **AC-43.** `ServisPanosu.jsx`'in `Kart` diliminde `use[A-Z]` ile başlayan hiçbir çağrı yoktur (kaynak taraması).
- **AC-44.** Yeni kanıt ekranının adı `servis-pano-0119-sorumlu`'dur ve verisi araç dosyasında kurulur; `tests/fixtures/0115-veri.js` değişmemiştir.
- **AC-45.** Bilinçli değişen pano ekranları `servis-pano-0115-onay`, `servis-pano-0115-kiosk` ve `servis-pano-0119-sorumlu`'dur; `servis-pano-0115-rozet` ve öteki pano ekranları 0 piksel farkla çıkar.
- **AC-46.** 0117 AC-55'in testi (`tests/ui/kalip-sevki-0117.test.jsx:211-216`) **iddiası değişmeden** geçer; ters çevrilme yalnız kriterin metnindedir ve metin ile testin adı "spec 0119 ile" notu taşır.
- **AC-47.** 0117'nin beş taraması dokunulmadan geçer: AC-38 (`:104`), C12 (`:118`), AC-52 (`:132`), C4 izin tanımları (`:137`) ve 0117 AC-40 ile AC-41.
- **AC-48.** Seçenek listesi `tekAdlari`'nı yeniden kullanır; panoda ikinci bir `calisanlar` okuması yoktur (kaynak taraması).
- **AC-49.** Kapanış bekçisi: plan `specs/done/`'daysa `CLAUDE.md`'nin 0119 dilimi "Tamamlandı: commit" taşır, eski spec kopyası kalmaz ve README satırı `(Tamamlandı)` olur.
- **AC-50.** Servis formundan girilmiş sorumlu, kart Bekliyor ya da Yapılıyor sütunundayken kartta görünmez; değer kayıtta durur (X7'nin ölçümü).

---

## Definition of Done

- [ ] Yeni saf yazıcı (`sevkSorumluYaz`) ve metin sabiti (`SEVK_SORUMLU_SORUSU`) `lib/kalipTamiri.js`'te; birim testleri yazılı (kırpma, boş değerde anahtarın silinmesi, öteki alanlara ve kalıp listesine dokunmama, **kutu kapısının olmaması**).
- [ ] Pano kartının ikinci kontrol satırı yazılı; iki satır tek kapta, çizim ölçütü (durum ve kalıp, müşteri kapısı yok), pasiflik, erişilebilir ad, boş seçenek ve liste kuralı ölçülü.
- [ ] Panodaki işleyicinin adı `sevkSorumluDegistir`; `kalipSorumluDegistir` Extra Kalıp kargosunda kalmaya devam ediyor (tarama).
- [ ] Üç bağlamın üçünde de (sekme, kiosk, ayrı pencere) seçim kayda gidiyor; ayrı pencerede köprü üstünden ölçüldü.
- [ ] İşlem geçmişi eylemi eklendi, ayrıntı kısayolla yazıldı ve etiket `ACTION_LABELS`'ta; etiketin varlığını **0119'un kendi testi** iddia ediyor (paylaşılan tarama bu eylemi ölçmüyor, ölçüm 14).
- [ ] 0117'nin beş taraması (AC-38 yazıcı listesi, C12 ad tuzağı, AC-52 sunucu, C4 izin tanımları, AC-40 ile AC-41 düğme ve arşiv) **dokunulmadan** yeşil.
- [ ] 0117 AC-55'in ikinci yarısının metni ve testin adı "spec 0119 ile" notuyla güncellendi; **testin iddiası değişmedi** (ölçüm 22).
- [ ] Yeni testler: `tests/kalip-sorumlusu-0119.test.js` (saf yazıcı, taramalar, etiket iddiası, kapanış bekçisi) ve `tests/ui/kalip-sorumlusu-0119.test.jsx` (kart, sütun kapısı, müşterisiz kart, izin, kiosk, ayrı pencere, audit); düzenek 0117'nin `SV_PANO` şeklini devralır (ölçüm 25).
- [ ] `npm test` **tamamı** yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır; Electron testleri de koşuldu (panoyu ölçen Electron testi **yoktur**, bu rutin tam koşudur).
- [ ] Görsel kanıt raporu alındı; bilinçli değişen üç ekran adıyla sayıldı, ötekiler 0 piksel ve çekimde `adimUyarilari` yok.
- [ ] `CLAUDE.md`'nin Servis Panosu bölümü güncel; `specs/README.md`'nin 0119 satırı, kuyruk cümlesi ve Karar 4 asimetrisi **yazılı olduğu doğrulandı** (ölçüm 27).
- [ ] Spec `specs/done/`'a taşındı, uygulama planı yazıldı ve SCORECARD dolduruldu.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
