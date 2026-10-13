# 0081 — Dönem Raporu: stopaj kartı kalkar, yan kutular kapalı başlar

| | |
|---|---|
| **Durum** | Uygulanıyor (dal `feat/0081-kutular-kapali`; plan `specs/0081-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme atanmadı |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Mali İşler › Giderler (Dönem Raporu); paylaşılan tasarım sözlüğünün katlanan kartı (iki varyant); Ayarlar'ın altı katlanan kartı (R14'ün aynası) |
| **Bağımlı spec'ler** | 0067 (kutu sırası), 0009 ve 0016 (katlanan kart), 0001, 0041, 0060, 0061, 0075, 0076, 0079 (kutuların içeriği ve donmuş iddiaları) |
| **Taban** | 0080 uygulanmış hâli (`specs/README.md` sırası: 0080 → 0081 → 0082); satır numaraları ona göre verildi |
| **Revizyon** | · 1 · 2026-10-13 QA turu (B-1…B-5, Ö-6…Ö-12, K-13…K-16 işlendi) · 2 · 2026-10-13 plan onayı (P1–P7, `specs/0081-uygulama-plani.md`) · 3 · 2026-10-13 triyaj (AC-30 metni yedi dosya ve genel yokluk kuralı) |

---

## Intent

Dönem Raporu ekranı uzadı: üstte beş özet kartı, altında kalem listesi ve borç özeti, onların
altında beş tablo kutusu. Fabrika yönetimi bu ekrana ayın kalemlerini ve kime ne kadar borçlu
olduğunu görmek için giriyor; kovalar, tür kırılımı, KDV karşılaştırması, tedarikçi kırılımı ve
ödeme yöntemi kırılımı ara sıra bakılan tablolar ama her açılışta ekranı dolduruyor ve kaydırma
mesafesini uzatıyor. Üstteki "Kesilen kira stopajı" kartı da günlük bakılan bir rakam değil;
stopaj yine lazım olduğunda Aylık Gider ve Kasa Raporu'nda yazıyor.

Başarı şu: ekran açıldığında özet kartları, kalem listesi ve borç özeti görünür; beş tablo kutusu
başlık satırı hâlinde durur ve tıklayınca açılır. Özet kartı dörde iner.

---

## Requirements

### Özet kartı

- **R1.** Dönem Raporu'nun **"Kesilen kira stopajı"** özet kartı kaldırılır. Kalan dört kart ve
  sırası: Toplam gider · Ödenmemiş gider · Tedarikçilere açık borç (KDV dâhil) · **İndirilecek
  KDV**. Yani İndirilecek KDV kartı, kaldırılan kartın yerine geçerek dördüncü sıraya oturur.
- **R2.** Stopaj rakamı kaybolmaz: Aylık Gider ve Kasa Raporu'nun gider özetindeki stopaj satırı
  ve **"GİDER · STOPAJ"** kutusu (ayın kira kalemleri) aynen kalır. Bu rakama bakılacak yer
  burasıdır ve kartın kaldırılma gerekçesinde bu yazılıdır.
- **R3.** Gider raporu motorunun stopaj alanları (dönem stopaj toplamı ve kira satırları)
  **değişmez**; yalnız ekrandaki kart okumayı bırakır.

### Yan kutular

- **R4.** Şu beş kutu **kapalı başlar** ve başlığına tıklanınca açılır:
  **Makina Maliyeti Kovaları**, **Gider Türü Kırılımı**, **KDV Karşılaştırması**,
  **Tedarikçi Kırılımı**, **Ödeme Yöntemi Kırılımı**. Üç alt kuralı var:
  - **R4/1.** Kural o dönemde **çizilen** kutular için geçerlidir. Beşi her zaman birlikte
    çizilmez: **Ödeme Yöntemi Kırılımı** yalnız ödeme hareketi bölümü yüklüyken var (Context).
    Kriterler "beş kutu" değil "çizilen kutular" diye ölçülür.
  - **R4/2.** KDV Karşılaştırması kartı yalnız **karşılaştırma yapılabilen** dalda katlanır. Tam
    ay olmayan aralıkta ve yürürlük öncesi dönemde kart iki satırlık bir açıklamadan ibarettir;
    orada katlama kullanıcıya bilgi değil engel olur, kart bugünkü gibi açık çizilir.
  - **R4/3.** Tür ve KDV kutularının durduğu satırın hizalaması `stretch` yerine `flex-start`
    olur. Bugün `stretch`, yani biri açık biri kapalıyken kapalı kart açığın boyuna uzayıp
    başlıktan ibaret kocaman bir boş kart hâline gelir. Hepsi açıkken görünüm değişmez.
- **R5.** Kapalı kutu başlığını, alt başlığını ve açık/kapalı işaretini gösterir; gövdesini
  çizmez. Tekrar tıklanınca kapanır.
- **R6.** Katlama durumu **saklanmaz** (bulgu B2, öneri): kullanıcı başına ya da bilgisayar
  başına tercih tutulmaz. Durum kutunun kendi ömrü kadar yaşar ve bu şu demektir:
  - **R6/1.** Dönem değişimi (ay seçimi, Ay ↔ Tarih Aralığı) ve süzgeç değişimi durumu
    **korur** (R13).
  - **R6/2.** Şu üç durumda kutular yeniden kapanır, çünkü ekranın o dalı bütünüyle yeniden
    kurulur: **görünüm değişimi** (Dönem Raporu ↔ Tedarikçiler ↔ Makina ve Model ↔ …),
    **kip değişimi** (hatırlatma kipi ve Açık kalemler kipi normal dalı tamamen kaldırıyor) ve
    **geçersiz tarih aralığı** (başlangıç bitişten sonra olunca rapor üretilmiyor). Üçü de
    beklenen davranıştır ve kriterleriyle sabitlenir (AC-24, AC-25, AC-26).
- **R7.** Beş kutunun **içeriği, başlıkları, alt başlıkları, sırası ve test kimlikleri değişmez**;
  açıldıklarında bugünkü tabloyu birebir gösterirler. Tek görünüm farkı başlık satırındadır:
  katlanan kart başlığın soluna açık/kapalı işareti (▸/▾) ve 6 piksel boşluk ekler, yani başlık
  metni **açık hâlde de** sağa kayar. Bu bilinçli bir görünüm değişikliğidir ve görsel kanıtın
  kapsamına girer.
- **R8.** **Gider Kalemleri** listesi ve **"Kime Ne Kadar Borçluyuz"** kutusu katlanmaz; bugünkü
  gibi her zaman açık çizilir.
- **R9.** Dört özet kartı katlanmaz.
- **R10.** **Finans** ekranındaki KDV Karşılaştırması kartı katlanmaz: aynı bileşen iki ekranda
  kullanılıyor, katlama kararı Dönem Raporu'nun kararıdır. R15'in prop varsayılanı kapalı olduğu
  için Finans kendiliğinden korunur; korunduğu kaynak taramasıyla sabitlenir.
- **R11.** **Makina ve Model** görünümündeki dört kova kartı değişmez (0072 R15: "dört kova kartı
  değişmez" kararı yerinde).
- **R12.** Hatırlatma kipi ve **Açık kalemler** kipi değişmez: o kiplerde bu beş kutu bugün de
  çizilmiyor, borç özeti ise açık kalır.
- **R13.** Dönem değişince (ay seçimi, Ay ↔ Tarih Aralığı) açılmış bir kutu açık kalır; dönem
  değişimi katlama durumunu sıfırlamaz (R6/1).
- **R14.** Katlanan kutu başlığı **klavyeyle** açılıp kapanır ve açık/kapalı durumu yardımcı
  teknolojiye bildirilir (bulgu B3). Düzeltme paylaşılan katlanan kartın kendisinde yapılır:
  - **R14/1.** `KartBolum`'un **iki başlık yolu da** düzeltilir. Katlama iki ayrı kod bloğundan
    çiziliyor: `kart` varyantının başlık satırı ve `ayar` varyantının başlık satırı, her biri
    kendi `onClick`'iyle. Yalnız biri düzeltilirse Ayarlar'ın katlanan kartları eksik kalır.
  - **R14/2.** Uygulama yolu başlığı `<button>` öğesine çevirmek **değildir**: başlık içinde
    `<div>`'ler var, `<button>` içine `<div>` konmaz ve düğmenin tarayıcı varsayılanları yerleşimi
    kaydırır. Mevcut başlık öğesine `role="button"`, `tabIndex={0}`, `aria-expanded` ve boşluk ile
    giriş tuşu dinleyicisi eklenir; görünüm değişmez, yalnız odak çerçevesi gelir.
  - **R14/3.** Emsal uygulamanın kendi içinde var: `AcKapa` (`src/components/gider/DonemRaporu.jsx:20`)
    gerçek bir düğme ve `aria-expanded` taşıyor. R14 bu desenle tutarlı olur, sıfırdan tasarlanmaz.
  - **R14/4.** Düzeltme bugün katlanan **dokuz** kartı birden etkiler: 0016'nın iki kartı (müşteri
    detayındaki Görüşmeler ve Dosyalar), **Ayarlar'ın altı kartı** (Firma Bilgileri, Çalışma
    Saatleri, Banka ve Ödeme Bilgileri, Kaşe / İmza, Gönderilen E-postalar, Silinen E-postalar) ve
    bu spec'in kutuları. Hepsinin bugünkü davranışı korunur (AC-21, AC-31).
- **R15.** Katlama **tek mekanizmadan** geçer: beş bileşen `katlanir` adlı boolean bir prop alır ve
  onu paylaşılan kartın `collapsible`'ına geçirir; açık/kapalı durumu kartın kendi iç durumudur
  (denetimli `acik` / `onAcikDegis` kullanılmaz, R6/2 bu yüzden böyle davranır). **Prop'un adı
  `acik` olamaz:** `TurKirilimi` ve `YontemKirilimi` içinde `acik` adlı yerel durum zaten var ve o
  personel ayrıntısının aç/kapasıdır (0001 K21 gizlilik kuralı); aynı adı prop olarak kullanmak iki
  kavramı karıştırır. Prop'u yalnız Dönem Raporu geçirir.
- **R16.** Kutu içeriğini doğrulayan **her test ve her görsel kanıt ekranı kutuyu önce açar.**
  Ölçülen etki: sekiz UI test dosyası ve üç kanıt ekranı bugün kapalı kutunun içini okuyor
  (Context). Listeler spec'te adıyla duruyor ve DoD'de tek tek işaretlenir.

---

## Constraints

### Uyulması zorunlu

- **C1.** Katlama, paylaşılan tasarım sözlüğünün **mevcut** katlanan kart mekanizmasıyla yapılır
  (`collapsible` + varsayılan kapalı; 0016 G10 ile zaten var). Kutuların içine ikinci bir katlama
  düzeneği yazılmaz, sözlük dışında yerel kopya çıkarılmaz (0009 kuralı).
- **C2.** Katlama kararı **çağıranda** verilir (Dönem Raporu ekranı), bileşenin içine gömülmez;
  gömülürse Finans'ın KDV kartı da katlanır (R10 ihlali). Taşıyıcı R15'in `katlanir` prop'udur ve
  kaynak taraması üç şeyi birlikte sabitler: beş bileşen prop'u alır, Dönem Raporu geçirir, Finans
  geçirmez.
- **C3.** Kapalı kutu da belgede **başlığıyla ve kendi test kimliğiyle** durur. Test kimliği kabın
  üzerinde olduğu için kapalı hâlde de bulunur (ölçüldü); kimlik başlığa taşınmaz. 0067'nin
  Electron yerleşim testi beş kutuyu kimlikle bulup konumlarını ölçüyor; sıra ve üst üste binmeme
  kuralları kapalı hâlde yeniden ölçülmeli. Yerleşim düzeneği ödeme hareketi bölümünü **dizi**
  olarak vermeye devam eder, yoksa yöntem kutusu hiç çizilmez (R4/1) ve ölçüm kurulamaz.
- **C4.** Bu spec **salt gösterim** işidir: motor, kalıcı alan, veri bölümü, izin, sunucu
  denetimi, birleştirme ve yazdırma çıktısı değişmez.
- **C5.** Aylık Gider ve Kasa Raporu ekrandaki katlama durumunu görmez: raporda bütün bölümler
  bugünkü gibi tam basılır.
- **C6.** Kaldırılan stopaj kartının rakamı başka bir ekranda yeniden hesaplanmaz; tek kaynak
  kuralı gereği rapor motorundaki alanlar olduğu gibi kalır (R3).
- **C7.** Bir şeyin **yokluğunu** iddia eden kutu testi, kutuyu açtıktan sonra ölçer. Kapalı kutuda
  her iç öğe yok görünür, yani "şu satır çizilmez" iddiası kutu kapalıyken **yanlış nedenle**
  geçer ve testin koruduğu kural sessizce ölür. Bu tuzağın bilinen bir örneği var (Context) ve
  DoD'de ayrı satırdır.

### KAPSAM DIŞI

- **X1.** Uygulamanın diğer ekranlarındaki kutuların katlanması (Finans, Anasayfa, Kasa, Makina
  ve Model) — *neden:* istek Dönem Raporu için geldi; başka ekranda uzunluk şikâyeti yok. R14'ün
  erişilebilirlik düzeltmesi bütün katlanan kartlara yayılır, ama **hangi kartın katlandığı**
  değişmez.
- **X2.** Hangi kutunun açık kaldığının hatırlanması — *neden:* 0050 böyle bir yerel tercih
  (`maliyetKutusuAcik`) getirmiş, 0067 onu **silmişti**; geri getirmek hem beş yeni yerel anahtar
  hem de görüntü aracına beş temizleme adımı demek. R6 bilinçli olarak tercihsizdir.
- **X3.** Kutuların sırasının değişmesi — *neden:* sıra 0067'de karara bağlandı (kalem listesi →
  borç özeti → kovalar → tür ve KDV → tedarikçi ve yöntem) ve bu spec onu korur. R4/3 yalnız
  satırın dikey hizalamasını düzeltir, sırayı değiştirmez.
- **X4.** Stopaj rakamının ekranda başka bir kutuya taşınması ya da yeni bir stopaj kutusu açılması
  — *neden:* istek rakamı taşımak değil, kartı kaldırmak; rakam raporda duruyor (R2).
- **X5.** Kutuların "hepsini aç / hepsini kapat" düğmesi — *neden:* beş kutu için tık başına bir
  başlık yeterli; istenmedi.
- **X6.** Özet kartlarının sayısının ya da içeriğinin başka biçimde değişmesi (yeni kart, kart
  birleştirme) — *neden:* bu spec tek kartı kaldırır, kart düzenini yeniden tasarlamaz.

---

## Context

**Bugünkü ekran (0080 uygulanmış hâliyle ölçüldü).** `src/components/Giderler.jsx:344-366`,
normal kip:

1. Beş özet kartı (`:345-349`): toplam gider, ödenmemiş gider, tedarikçilere açık borç,
   **Kesilen kira stopajı** (`:348`), **İndirilecek KDV** (`:349`).
2. Gider Kalemleri listesi (`:353`), sonra Kime Ne Kadar Borçluyuz (`:357`), 0067'nin sırası.
3. Makina Maliyeti Kovaları (`:358`).
4. Yan yana Gider Türü Kırılımı (`:360`) ve KDV Karşılaştırması (`:361`).
5. Yan yana Tedarikçi Kırılımı (`:364`) ve Ödeme Yöntemi Kırılımı (`:365`).

**Taban 0080'dir.** Bu spec'in dalı 0080'in üstüne açılır (README sırası). 0080 `Giderler.jsx` ve
`gider/DonemRaporu.jsx`'i değiştirdiği için satır numaraları bir iki satır kaydı; yukarıdakiler ve
aşağıdakiler **0080 sonrası** değerlerdir.

**Katlama altyapısı hazır.** Beş kutunun hepsi paylaşılan karta sarılı
(`src/components/tasarim.jsx:82` `KartBolum`, `varyant="kart"`, `baslikStili="baslik"`):
`KovaKarti` (`gider/DonemRaporu.jsx:46`), `TurKirilimi` (`:70`), `TedarikciKirilimi` (`:122`),
`YontemKirilimi` (`:207`), `KdvKarsilastirmaKarti` (`gider/KdvKarsilastirmaKarti.jsx:34`, `:50`).
Kart `collapsible` + `defaultOpen` (iç durum) ya da denetimli `acik` + `onAcikDegis` destekliyor
ve varsayılanı **zaten kapalı** (`tasarim.jsx:83` `defaultOpen = false`). Yani iş, beş çağrıya
katlama bayrağını geçirmek ve R14'ün erişilebilirlik eksiğini kapatmak.

**Beş bileşenin hiçbiri bugün katlama prop'u almıyor:** `KartBolum` çağrısını kendi içinde sabit
yazıyorlar, yani prop yüzeyi genişleyecek (R15). Ad seçimi önemli: `TurKirilimi` (`:67`) ve
`YontemKirilimi` (`:196`) içinde **`acik` adlı yerel durum zaten var** ve o personel ayrıntısının
aç kapasıdır (K21). Bu yüzden prop `katlanir` olur.

**KDV kartı iki `KartBolum` döndürüyor, ikisi de aynı test kimliğiyle.**
`KdvKarsilastirmaKarti.jsx:34` tam ay olmayan ya da yürürlük öncesi aralığın "karşılaştırma
yapılamıyor" kartı, `:50` normal kart; ikisinin `testId`'i de `kdv-karsilastirma`. Prop ikisine de
geçmezse aynı ekranda kutulardan biri tutarsız davranır; katlama ise yalnız normal dalda etkin olur
(R4/2).

**Beş kutudan biri koşullu.** `Ödeme Yöntemi Kırılımı` yalnız `donemKirilimi` doluyken çiziliyor
(`Giderler.jsx:365`) ve o değer ancak ödeme hareketi bölümü bir **dizi** olduğunda hesaplanıyor
(`:109`). Güncellenmemiş sunucuda bölüm `null` geliyor (0024 göç durumu; ekranda
`hareket-bolumu-yok` şeridi var), yani o durumda dört kutu çizilir. Kriterler bu yüzden "çizilen
kutular" diye yazıldı (R4/1).

**Hizalama tuzağı.** Tür ve KDV satırı `alignItems: "stretch"` (`Giderler.jsx:359`), tedarikçi ve
yöntem satırı `alignItems: "flex-start"` (`:363`). Birinci satırda biri açık biri kapalıyken kapalı
kart açığın yüksekliğine uzar. Bugün iki kart da dolu olduğu için `stretch` doğru görünüyordu;
kutular katlanabilir olduğu anda yanlış hizalama hâline geliyor (R4/3).
**Revizyon 2 (P1):** "hepsi açıkken görünüm değişmez" tutmuyor: `stretch` iki açık kartı aynı boya
uzatıyordu, `flex-start` ile kısa olan kendi içeriği kadar kalır. Eşit boy için açıklık durumunun
`Giderler`'e taşınması gerekir, bu R6/2'yi bozar; fark kabul edildi ve görsel kanıtta `degisti`.

**Katlama durumunun ömrü.** Kutular `rapor`'un normal dalında çiziliyor ve o dal üç durumda
bütünüyle kalkıyor: `donemsizKip` (hatırlatma ve açık kalemler kipleri, `Giderler.jsx:333`),
`gorunum` değişimi ve `aralikGecerli` false (geçersiz tarih aralığı, `rapor` null). İç durumla
çalışıldığında bu üç durumda kutular kapanır, durum `Giderler.jsx`'te tutulup denetimli verilirse
açık kalır. R6/2 iç durumu seçti ve üç durumu adıyla saydı, çünkü iki uygulama iki farklı cevap
veriyor ve yazılmazsa R6 ile R13 çelişiyormuş gibi görünüyor.

**Kullanım yerleri (ölçüldü).** Kovalar, tür, tedarikçi ve yöntem kutuları **yalnız**
`Giderler.jsx`'te çiziliyor. **KDV Karşılaştırması iki yerde:** `Giderler.jsx:361` ve
`src/components/Finance.jsx:617`. Bu yüzden C2 zorunlu.

**Stopaj rakamının diğer yerleri.** Ekranda yalnız o kart okuyor (`Giderler.jsx:348`); kaynakta
başka kullanım yok. Yazdırılan rapor okumaya devam ediyor:
`src/lib/giderRaporu.js:145` (`ozet.stopaj`) ve 0060 ile eklenen "GİDER · STOPAJ" kutusu.
Motor alanları `src/lib/gider.js:1204`'te üretiliyor ve bu spec'te dokunulmuyor. Hiçbir test bugün
"Kesilen kira stopajı" metnini aramıyor (tarandı), yani kartın kalkması test kırmaz.

**Katlanan kart bugün dokuz yerde ve iki kod yolunda (R14).** `collapsible` kullanımları: 0016'nın
denetimli iki kartı (`customers/CustomerDetailModal.jsx:947` Görüşmeler,
`customers/detail/CustomerFilesSection.jsx:102` Dosyalar) ve **Ayarlar'ın altı kartı**
(`settings/SettingsCompany.jsx:109, :161, :211, :260` ve `settings/SettingsSentMail.jsx:71, :133`).
Son altısı `ayar` varyantını kullanıyor, yani `tasarim.jsx`'in **ikinci** başlık bloğunu
(`:128-133`); `kart` varyantının bloğu `:100-102`. İki blok ayrı `onClick` taşıyor, bu yüzden R14
ikisini birden kapsamak zorunda. Bugünkü eksiklik ölçüldü: başlık tıklama dinleyen bir kutu, düğme
rolü yok, odaklanamıyor, ok işareti `aria-hidden="true"` olduğu için yardımcı teknoloji açık kapalı
durumunu hiç duymuyor.

**Testler: bir değil dokuz dosya.**

- `tests/ui/kutu-duzeni-0067.test.jsx` sırayı metinle ve kimlikle doğruluyor (`:41-53`: kalem
  listesi → borç özeti → kovalar → tedarikçi kırılımı; kova kutusunu başlık metniyle, yani
  `getByText` ile buluyor). Başlıklar kapalıyken de görünür olduğu için sıra doğrulaması yaşar, ama
  **başlığa tıklama adımı eklenmeli.**
- **Şu sekiz dosya gerçek `Giderler` bileşenini çizip kapalı kutunun içini okuyor**, yani 0081 ile
  hepsi elden geçer: `ui/giderler`, `ui/hedef-adlari-0060`, **`ui/gider-coklu-odeme`** (dokuz atıf;
  `:174-180` kutunun **içindeki** `AcKapa`'ya da tıklıyor, yani başlık tıklaması ondan önce
  gelmeli), `ui/giderler-kdv-memo`, `ui/gider-ek-odeme`, `ui/kisitli-gider-0076` (`:193` KDV
  kartının bilgi satırları), `ui/satis-tevkifat-0079` (altı atıf), `ui/acik-kalemler`.
- **Yanlış nedenle yeşil kalan iddia (C7'nin örneği).**
  `ui/satis-tevkifat-0079.test.jsx:242-243` (0079 AC-27'nin ikinci yarısı) gerçek `Giderler`'i
  çiziyor ve `satis-tevkifat-bilgi`'nin **yok** olmasını, yani "tevkifatlı satış yoksa satır
  çizilmez"i iddia ediyor. Kutu kapalıyken o satır da yok görünür: test geçer, kural ölür. Aynı
  yarının ilk kısmı yüksek sesle kırılacağı için geliştirici oraya tıklama ekleyip ikinciyi olduğu
  gibi bırakabilir. `ui/kisitli-gider-0076`'nın bilgi satırı iddialarında aynı desen var.
- **Revizyon 2 (P2): sekiz değil on dosya.** `ui/sgk-turu-0074` (`:189`) ve `ui/calisan-sgk-0070`
  (`:116-121`) da gerçek `Giderler`'i çizip Gider Türü Kırılımı'nın içindeki `personel-ayrinti`'yi
  okuyor. AC-30'un listesi bu on dosyadır.
- `tests/liste-kaynak.test.js:118` ve `:121` 0016'nın iki kartının **denetimli** biçimini birebir
  sabitliyor (`collapsible acik={…} onAcikDegis={…}`); R14 yalnız erişilebilirlik eklediği için bu
  taramalar yaşar, ama R14'ten sonra yeniden koşulmalı.
- Electron yerleşim testi `scripts/tests/donem-raporu-yerlesim.cjs` beş kutuyu kimlikle arıyor ve
  altısının **hepsinin** bulunmasını şart koşuyor; kimlik kapta olduğu için kapalı hâlde de bulunur
  (C3). İki kartlı satırlarda üst üste binme ve taşma ölçülüyor; kapalı hâlde yükseklikler
  düşeceği için yeniden ölçülmeli.

**Görsel kanıt: üç ekran konusunu kaybediyor.** Görüntü aracında şu üç ekran **kutu içeriğini
fotoğraflamak için** var: `giderler-yontem-kirilimi` (`scripts/evidence/0009-sayfa.jsx:714`,
0041'in kanıtı), `giderler-0076-kdv` (`:999`, 0076'nın `kisit-kdv-bilgi` kanıtı) ve
`giderler-0079-kdv` (`:1025`, 0079'un `satis-tevkifat-bilgi` kanıtı). Üçünün adımı `kaydir:<başlık>`
ve başlık kapalı kutuda da duruyor, yani **araç uyarı bile basmaz**: ekran çizilir, içinde
kanıtlanacak şey olmaz. Üçüne başlık tıklaması eklenir ve kayıtları yenilenir (R16, AC-32).
`docs/evidence/kanit-eslemesi.json` ayrıca bu dosyalar için başka kayıtlar da tutuyor; normal Dönem
Raporu'nu çizen bütün `giderler-*` ekranları (seksen bir ekranın büyük kısmı) bilinçli olarak
değişecek (`beklenen: "degisti"` + onay satırı).

**Tasarım sözlüğünde çelişki.** `docs/tasarim-sozlugu.md:90` "Katlanabilirlik **yalnız bu
varyantta** var" diyor (`ayar` varyantı için), ama aynı belge `:98`'de `kart` varyantının
katlanmasını anlatıyor (0016 eklemiş, eski cümle düzeltilmemiş). DoD zaten o bölümü güncelliyor;
çelişki de orada düzeltilir.

### Ölçüm sonuçları (uygulama, 2026-10-13)

- **AC-28 (Electron, `donem-raporu-yerlesim`):** tür açık + KDV kapalıyken KDV kartı uzamıyor ve üst kenarlar hizalı (1280 ve
  1024 px); hepsi açıkken tür 175 px, KDV 265 px (P1: artık eşit boya uzatılmıyor). `stretch` geri konunca ölçüm düşüyor.
- **C7 tuzağı gerçek:** 0079 AC-27'nin yokluk satırından önceki açma adımı silinince o test **yeşil kalıyor** (yanlış nedenle);
  yalnız 0081'in taraması (`AC-30 / C7`) yakalıyor.
- **Kutu içini okuyan dosyalar yedi:** spec'in on dosyalık listesinden `ui/hedef-adlari-0060` (kalem listesini okuyor),
  `ui/giderler-kdv-memo` (kutunun varlığı ve motor sayacı) ve `ui/acik-kalemler` (kendi yaş kovası düğmeleri aynı kimliği
  taşıyor) kutu içi okumuyor; değişmeden yeşil. AC-30 yedi dosyayı kapsar (plan §6).

### Plan onayı kararları (revizyon 2, Takım Yöneticisi, 2026-10-13)

Planın yedi önerisinin hepsi kabul edildi; ayrıntı `specs/0081-uygulama-plani.md` §4.

- **P1.** AC-28'in ikinci yarısı yeniden yazıldı: hepsi açıkken kartlar kendi içeriği kadar, üstten hizalı; fark `degisti`.
- **P2.** Kutu içini okuyan test dosyası on (iki dosya eklendi); AC-30 bu on dosyayı kapsar. Uygulamada ölçülen sayı yediydi; sapma `specs/0081-uygulama-plani.md` §6'da çözüldü (üç dosya kutu içi okumuyor).
- **P3.** AC-30'un taraması ortak `tests/ui/kutuAc.js` yardımcısıyla: on dosya onu içe alıp kullanır, yardımcı açıldığını
  `aria-expanded="true"` ile kanıtlar (C7). Mutasyonla gösterilir (0079 AC-27'den açma adımı silinince test düşer).
- **P4.** R14 sonrası rol sorgusu çakışırsa testin sorgusu daraltılır, bileşene kimlik eklenmez.
- **P5.** Ayarlar ve müşteri detayı ekranlarında 0 piksel beklenir (odak çerçevesi yalnız odakta).
- **P6.** AC-11 `Giderler`'in kaldırılıp yeniden çizilmesiyle ve App'in koşullu çizim taramasıyla kanıtlanır.
- **P7.** Değişen `giderler-*` ekranları dosya bazında `degisti` + onay satırıyla (0067, 0076 emsali).

### Bulgular (öneri kuralı 5)

- **B1. "İndirilecek KDV kutusunu stopajın yerine koy" isteği zaten kısmen yapılmış durumda.**
  İndirilecek KDV kartı **bugün de var** ve stopaj kartının hemen sağında (`Giderler.jsx:349`,
  0001'den beri). Yani isteğin net sonucu **stopaj kartının kaldırılması** ve İndirilecek
  KDV'nin bir sıra sola kayması. **Önerim: R1 bu şekilde uygulanır.** Eğer Takım Yöneticisi
  stopaj yerine başka bir rakam (örneğin tevkifatla beyan edilecek KDV, ya da indirilemeyen KDV)
  kastettiyse R1 yeniden yazılmalıdır; bu durumda haber verin.
  **Durum (2026-10-13):** bulgu Takım Yöneticisi'ne bildirildi, başka bir rakam istenmedi;
  **R1 yazıldığı gibi geçerlidir.**
- **B2. Katlama durumu hatırlanmalı mı?** İki yol var. (a) **Hatırlanmaz** (önerim): her girişte
  kapalı, yeni yerel tercih yok, 0067'de silinen anahtar ve görüntü aracının temizleme adımı geri
  gelmez, görsel kanıt sade kalır. (b) Bilgisayar başına hatırlanır (`maliIslerAcik` emsali): KDV
  karşılaştırmasına her gün bakan kullanıcı bir kez açar. *Gerekçem:* isteğin harfi "varsayılan
  kapalı gelsin", ve beş kutu için beş kalıcı tercih, karşılığına göre pahalı. İhtiyaç sürüm
  sonrası hissedilirse (b) ayrı ve küçük bir iştir.
  **Karar (Takım Yöneticisi, 2026-10-13): (a) kabul edildi.** Katlama durumu hatırlanmaz; R6 ve
  X2 yazıldığı gibi geçerlidir. İhtiyaç sürüm sonrası doğarsa kendi spec'iyle gelir.
  **QA turu eki (2026-10-13):** "hatırlanmaz" kararı durumun **nerede tutulduğu** sorusunu açıkta
  bırakıyordu; R6/2 iç durumu seçti ve kutuların hangi üç durumda yeniden kapandığını saydı.
- **B3. Katlanan başlık bugün klavyeyle açılmıyor.** Paylaşılan kartın katlanan başlığı tıklama
  dinleyen bir kutu (`tasarim.jsx:100-102`, `ayar` varyantında `:128-133`): düğme rolü yok,
  odaklanamıyor, açık kapalı durumu yardımcı teknolojiye bildirilmiyor (ok işareti
  `aria-hidden="true"`). Bu eksik bugün de var (0016'nın iki kartı ve Ayarlar'ın altı kartı) ama
  beş kutu daha buna geçerse yayılır. **Önerim: R14 ile tek yerde düzeltilir**, iki kod yolunda
  birden, başlık `<button>`'a çevrilmeden (`role="button"` + `tabIndex` + `aria-expanded` + tuş
  dinleyicisi; gerekçesi R14/2). Görünüm değişmez, yalnız odak çerçevesi eklenir; maliyeti tek
  dosyada birkaç satır ve emsali aynı depoda duruyor (R14/3).

---

## Acceptance Criteria

- **AC-1.** Dönem Raporu'nda "Kesilen kira stopajı" metni ekranda hiç geçmez ve kalan dört kartın
  etiketi görünür. Sayım kartları saran kabın çocuk sayısıyla ölçülür; `StatKart`'a yeni bir test
  kimliği eklenmez (C4).
- **AC-2.** Dört kartın sırası: Toplam gider, Ödenmemiş gider, Tedarikçilere açık borç,
  İndirilecek KDV.
- **AC-3.** İndirilecek KDV kartının değeri değişmez. Ölçüm için yeni bir düzenek kurulmaz:
  `tests/ui/kisitli-gider-0076.test.jsx` kartın değerini (240 ₺) zaten sabitliyor, kriter ona atıf
  yapar ve o testin yeşil kaldığı gösterilir.
- **AC-4.** Aylık Gider ve Kasa Raporu'nun çıktısında stopaj satırı ve "GİDER · STOPAJ" kutusu,
  kira kalemi olan bir ayda bugünkü rakamlarla basılır.
- **AC-5.** Kaynak taraması: gider rapor motorunun stopaj alanları duruyor ve ekranda okuyan tek
  satır kaldırılmış.
- **AC-6.** Dönem Raporu ilk açıldığında **çizilen kutuların** hiçbirinin gövdesi görünmez:
  kovaların tutarları, tür satırları, KDV karşılaştırma satırları, tedarikçi satırları ve yöntem
  satırları ekranda yok.
- **AC-7.** Çizilen kutuların başlığı ve alt başlığı ilk açılışta görünür.
- **AC-8.** "Gider Türü Kırılımı" başlığına tıklanınca tür satırları görünür; ikinci tıklamada
  yeniden gizlenir.
- **AC-9.** AC-8 aynı davranış çizilen diğer kutular için ayrı ayrı doğrulanır (kovalar, KDV
  karşılaştırması, tedarikçi kırılımı, yöntem kırılımı).
- **AC-10.** Bir kutu açıkken dönem ayı değiştirilince kutu açık kalır ve yeni dönemin verisini
  gösterir.
- **AC-11.** Giderler sekmesinden çıkıp yeniden girilince kutular yine kapalıdır (tercih
  saklanmaz).
- **AC-12.** Gider Kalemleri listesi ve "Kime Ne Kadar Borçluyuz" kutusu ilk açılışta açıktır ve
  katlama işareti taşımaz.
- **AC-13.** Finans ekranının KDV Karşılaştırması kartı ilk açılışta içeriğiyle görünür ve
  katlanamaz.
- **AC-14.** Makina ve Model görünümünün dört kova kartı ilk açılışta içeriğiyle görünür.
- **AC-15.** Açık kalemler kipinde beş kutu bugün olduğu gibi hiç çizilmez; borç özeti açıktır.
- **AC-16.** Hatırlatma kipinde beş kutu çizilmez (bugünkü davranış korunur).
- **AC-17.** Dönemde hiç gider kaydı yokken bugünkü boş durum ve borç özeti görünür; katlanan kutu
  çizilmez.
- **AC-18.** Yürürlük ayından önceki bir dönemde bugünkü "gider verisi girilmemiş" ekranı ve borç
  özeti görünür.
- **AC-19.** Katlanan başlık klavyeyle odaklanır ve boşluk ya da giriş tuşuyla açılıp kapanır;
  `kart` ve `ayar` varyantları için ayrı ayrı doğrulanır (R14/1).
- **AC-20.** Katlanan başlık açık/kapalı durumunu erişilebilir biçimde bildirir; kapalıyken ve
  açıkken ayrı ayrı doğrulanır.
- **AC-21.** 0016'nın katlanan kartları (müşteri detayındaki Görüşmeler ve Dosyalar) R14'ten sonra
  bugünkü davranışını korur: dışarıdan açma hâlâ çalışır ve `liste-kaynak` taraması yeşil.
- **AC-22.** Yerleşim: 1280 ve 1024 piksel genişlikte kutular kapalıyken sıra 0067'nin kararına
  uyar, yan yana duran kutular üst üste binmez, belge yatay taşmaz.
- **AC-23.** Yerleşim: hepsi açıkken aynı üç kural geçerlidir (0067'nin bugünkü ölçümü).
- **AC-24.** Görünüm değişimi durumu sıfırlar: bir kutu açılıp Tedarikçiler görünümüne geçilip
  Dönem Raporu'na dönülünce kutu kapalıdır (R6/2).
- **AC-25.** Kip değişimi durumu sıfırlar: bir kutu açılıp hatırlatma kipine (ve ayrıca Açık
  kalemler kipine) geçilip dönülünce kutu kapalıdır (R6/2).
- **AC-26.** Geçersiz tarih aralığı girilip düzeltilince kutular kapalıdır (R6/2).
- **AC-27.** KDV Karşılaştırması kartı, tam ay olmayan aralıkta ve yürürlük öncesi dönemde
  katlanmaz: "karşılaştırma yapılamıyor" açıklaması ilk açılışta görünür ve başlıkta açık/kapalı
  işareti yoktur (R4/2).
- **AC-28.** Tür ve KDV satırının hizalaması `flex-start`: biri açık biri kapalıyken kapalı kart
  açığın boyuna uzamaz (yükseklikler ölçülür). Hepsi açıkken her kart kendi içeriği kadar uzundur
  ve üst kenarları hizalıdır (R4/3; revizyon 2, P1).
- **AC-29.** Kaynak taraması (R15, C2): beş bileşen `katlanir` prop'unu alır, Dönem Raporu beşine
  de geçirir, `Finance.jsx` geçirmez; hiçbirine `acik` adlı prop eklenmemiş ve kutularda denetimli
  katlama (`onAcikDegis`) kullanılmamış.
- **AC-30.** Kaynak taraması (R16): kutu içeriğini okuyan **yedi** UI test dosyası (plan §6) ortak `kutuAc`
  yardımcısını kullanır ve Giderler'i çizen her UI test dosyasında, kutuların içindeki bir kimliğe giden her yokluk iddiasından
  önce aynı testte kutuyu açan adım vardır (revizyon 3, triyaj).
- **AC-31.** Ayarlar'ın altı katlanan kartı (Firma Bilgileri, Çalışma Saatleri, Banka ve Ödeme
  Bilgileri, Kaşe / İmza, Gönderilen E-postalar, Silinen E-postalar) R14'ten sonra bugünkü
  davranışını korur: kapalı başlar, tıklamayla açılır, dolgusu değişir (R14/4).
- **AC-32.** Görüntü aracı taraması (R16): `giderler-yontem-kirilimi`, `giderler-0076-kdv` ve
  `giderler-0079-kdv` ekranlarının adım listesinde kutuyu açan tıklama var ve
  `kanit-eslemesi.json` kayıtları yenilenmiş.
- **AC-33.** Ödeme hareketi bölümü yüklü değilken (bölüm `null`) Dönem Raporu dört kutu çizer,
  dördü de kapalıdır ve "Ödeme Yöntemi Kırılımı" başlığı ekranda hiç geçmez (R4/1).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Dal 0080'in üstüne açıldı (README sırası) ve spec'teki satır numaraları o tabanla tutuyor.
- [ ] Hesap içeren iş yok; motor, kalıcı alan, veri bölümü, izin, sunucu ve birleştirme
      dosyalarına dokunulmadı (kaynak taramasıyla gösterildi). **Yeni izin eklenmedi: salt
      gösterim işi.**
- [ ] Katlama tek mekanizmadan geliyor: beş kutuda yerel katlama kodu yok, prop adı `katlanir`,
      durum kartın iç durumu (AC-29).
- [ ] Katlama kararı çağıranda; Finans'ın kartı etkilenmedi (AC-13, AC-29).
- [ ] KDV kartının iki dönüşü de prop'u alıyor, katlama yalnız normal dalda etkin (AC-27).
- [ ] Tür ve KDV satırının hizalaması düzeltildi ve kapalı kartın uzamadığı ölçüldü (AC-28).
- [ ] **Kutu içeriğini okuyan yedi UI test dosyası (plan §6) tek tek elden geçti** ve listesi spec'te
      duruyor (AC-30).
- [ ] **Yokluk iddiaları (C7) kutu açıkken ölçülüyor**; bilinen örnek (0079 AC-27'nin ikinci
      yarısı) ve 0076'nın bilgi satırı iddiaları adıyla kontrol edildi.
- [ ] Aynı sayıyı üreten başka ekran yok; kaldırılan kartın rakamı raporda tek kaynaktan basılıyor.
- [ ] Yazdırma çıktısı değişmedi: Aylık Gider ve Kasa Raporu ile Aylık Faaliyet Raporu'nun altın
      çıktıları aynı.
- [ ] Erişilebilirlik düzeltmesi (R14) tasarım sözlüğünde **iki varyat için birden** yapıldı,
      `docs/tasarim-sozlugu.md` katlanan kart bölümüne yazıldı ve o bölümdeki "katlanabilirlik
      yalnız bu varyantta var" çelişkisi düzeltildi.
- [ ] Ayarlar'ın altı katlanan kartı denendi ve bugünkü davranışını koruyor (AC-31).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi: kapalı hâl, bir kutu açık hâl, hepsi açık hâl,
      boş dönem ve yürürlük öncesi dönem; aydınlık ve karanlık tema. Açık hâlin de başlık kayması
      yüzünden değiştiği yazılı (R7).
- [ ] **Üç kanıt ekranı kutuyu açacak adımı aldı** ve `kanit-eslemesi.json` kayıtları yenilendi
      (AC-32); değişen `giderler-*` ekranları `beklenen: "degisti"` + onay satırıyla işaretlendi.
- [ ] Electron yerleşim testi kapalı ve açık hâl için yeniden ölçüldü (AC-22, AC-23) ve düzeneği
      ödeme hareketi bölümünü dizi olarak vermeye devam ediyor (C3).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0067 bölümü yeni kart sayısı ve katlanan kutularla güncellendi; 0009 ve 0016
      bölümlerine katlanan başlığın erişilebilirlik düzeltmesi not düşüldü.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

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
