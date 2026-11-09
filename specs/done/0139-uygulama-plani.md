# 0139 Uygulama planı: kilogram fire ve malzeme listesinden parça içe aktarma

| | |
|---|---|
| **Spec** | `specs/0139-fire-kilogram-ve-parca-ice-aktarma.md` (Onaylandı, 2026-11-09) |
| **Dal** | `feat/0139-fire-ice-aktarma` (worktree `../wt0139`, `main` `cba7d828` üstünde) |
| **Durum** | **Tamamlandı** (2026-11-09, commit `1c61b714`); onay: Takım Yöneticisi 2026-11-09, on altı önerinin hepsi; spec revizyon 2, kararlar 30–45 |

---

## 0. Ölçüm: kaynağın sütun haritası (Ek 3, B-R3/3'ün ön koşulu)

Kaynak `MALZEME LİSTESİ (1) (1).xlsx` salt okunarak ölçüldü (2026-11-09). Müşteri verisidir; depoya girmez, testler
sentetik çalışma kitabıyla yürür.

| Sayfa | Veri satırları | Ad | Ölçü | Adet | Malzeme | Not |
|---|---|---|---|---|---|---|
| AK100_AK120 PASLANMAZ | 7–37 (24 dolu; 32 ve 33 özel) | C | G = biçim işareti ("Ø"; özel satırda sayı), H = çap / genişlik, I = H'nin kopyası, K = boy | Q | yok (sayfa varsayılanı) | R (ör. "ADET 70 MAKİNALIK") |
| AK140_SWP PASLANMAZ | 7–37 (19 dolu; 32 ve 33 özel) | C | aynı | Q | yok | R |
| 100_120_PLASTİKLER | 28–58 (26 dolu; 54–58 boş şablon) | G | J = çap / en, K = kalınlık (yalnız levhada), L = "Ø" ya da "x", M = J'nin kopyası, O = boy | U | **E** (POM DELRİN, DELRİN LEVHA, POM KESTAMİD, POM TEFLON) | V |
| AK140_SWP PLASTİKLER | 28–58 (22 dolu; 50–58 boş şablon) | G | aynı | U | **E** | V |

Ölçümün spec'le çeliştiği üç yer (R1–R3'te öneri var):

1. Hesap yapan dört sayfada ölçü **tek metin hücresinde değil, ayrı sütunlardadır.** AC-23'ün `Ø60X175XYUVARLAK`'ı,
   AC-24'ün `70X390X390`'ı ve AC-25'in `Ø150X42`'si yalnız kapsam dışı sayfalarda (ALÜMİNYUM D8, D3; 8620 SEMENTE M3) geçer.
2. Plastik sayfalarında malzeme **kendi sütununda** (E) yazılı ve dört değer Context'teki kart adlarıyla birebir aynı.
3. Dört satırın adedi 0 (100_KALIP SOMUNU, 100_GRAMAJ PARÇASI, 140_KALIP ERKEK, 140_KALIP SOMUNU; hepsi "DİŞİ KALIPLARIN
   İÇİNDEN ÇIKIYOR"). Context'in "dördü boş, 87 satır" sayımı bunlardır. Satır 49 (AK140 plastik, DELRİN LEVHA) L sütunu boş.

Satır sayıları Ek 2 ile tutuyor: 24 + 19 + 26 + 22 = 91, adedi sıfır dördü çıkınca 87.

---

## 1. Değişecek ve eklenecek dosyalar

### Kaynak

| Dosya | Değişiklik |
|---|---|
| `src/lib/malzeme.js` | `fireBantlariOf`, `fireBantlariDogrula` (A-R9, ayrı; ilk band serbest, kg zorunlu, sıfır geçerli, belirsiz sayı reddi), `ekFireKg(m, satir, hamCap)` (A-R5/6/6-2: yalnız `BICIMLER[bicim].capli`, `bantSec` ile ham çap, band yoksa 0). `malzemeOzeti`'nin **iki** dalında `fireliKg = hamKg × (1 + yüzde/100) + ekFireKg` (A-R11/2); dönüşe `ekFireKg` alanı (sipariş uyarısı için). Boy dalı değişmez (A-R13). `malzemeDogrula` `fireBantlari`'nı doğrular, boşsa yazmaz; `malzemeFormu` metne çevirir. Metin sabitleri (A-R14): `FIRE_KG_BASLIK`, `FIRE_KG_LAMA_NOTU`, `FIRE_KG_SIRA_HATASI`, `FIRE_KG_HATASI`, `FIRE_KG_BOY_NEDENI`, `FIRE_ETKI_BASLIGI`. `FIYAT_ALANLARI` değişmez (A-R10). |
| `electron/db.cjs` | `malzemeler.fireBantlari TEXT` JSON: `SCHEMA_SQL`, `applyColumnMigrations` (`MALZEME_FIRE_BANT_COLUMN`), INSERT, SELECT ayıklaması (`bantlar`, `fiyatGecmisi` yanında; boş liste NULL, gövdede anahtar yok; C7, AC-19). |
| `src/lib/siparisIhtiyaci.js` | Kilo yolundaki parça girişine `ekFireKg`; boy adedi uyarısının koşulu `p.fire > 0 \|\| p.ekFireKg > 0` (A-R12/2); `FIRE_BOY_UYARISI` metni kilogramı da anar. Boy yöntemi yolu (satır 272/278) ve sipariş kilosu (`boyAdedi × tamKg`) dokunulmaz (AC-50). `fireKg` sütunu zaten `fireliKg − hamKg`'den türüyor, kendiliğinden kilogramı içerir. |
| `src/components/MalzemeManager.jsx` | `FireBantlariAlani` (fiyat bandı düzenleyicisinin şeklinde, `FiyatAlanlari`'nın **dışında**, iki kipte, fire ve emniyet payının yanında; lama/sac notu). `kaydet` beyaz listesine `fireBantlari` (A-R1/2, AC-47). Düzenlemede yüzde ya da kilogram tablosu değiştiyse kayıttan önce `fiyatEtkisi(eski, yeni, parts, malzemeler, { fiyatAyarlari })` onay penceresi (A-R16, AC-53); pencerenin özet metni fiyat penceresinin bileşeninden (ikinci kopya yazılmaz). |
| `src/components/MalzemeFiyatPenceresi.jsx` | Değişmez (yalnız `FIYAT_ANAHTARLARI` yazar). AC-48 için kanıt testi. Etki özeti çizimi paylaşılacaksa ortak parça buradan dışa verilir. |
| `src/components/MalzemeSatiriAlani.jsx` | Boy yönteminde ve malzemenin tablosu doluyken `data-testid="fire-kg-uygulanmadi"` satırı (`FIRE_KG_BOY_NEDENI`; A-R13/2). Ağırlık satırları değişmez (değer motordan gelir, A-R11). |
| `src/lib/ornekKatalog.js` | "8620 mil" örneğine `fireBantlari: [{ alt: "0", kg: "0" }, { alt: "50", kg: "0,30" }]` (A-R15). |
| `src/lib/malzemeListesiAktarma.js` **(yeni)** | Saf modül (C3, B-R16). React, xlsx, `uid()`, saat yok. Girdi: sayfa adı → satır dizisi (`Object.create(null)`, `__proto__`/`constructor` yok sayılır), `malzemeler`, `parts`, `standardModels`, `customModels`, girdiler `{ parti: { [sayfa]: n }, modelAdet: { AK100, AK120, AK140, SWP140 } }`, `yeniId`. Çıktı: `{ onKosul: [eksik kart adları], yeniParcalar, standardModels, customModels, rapor }`. Alt fonksiyonlar dışa verilir: `sayfaEsle`, `satirOku` (Ek 3 haritası), `adTemizle`, `onekBul`, `biçimVeOlcu`, `malzemeEsle`, `kitAdedi`, `adCakismaCoz`, `dogrulamaTuru` (B-R13/2). Ek 1'in dört satırı ve teyit #1'in iki öneksiz satırı modülde **adlı sabit** tablolar. Metinler (`MALZEME_AKTAR_PANEL_ADI`, neden metinleri, rapor satırları) burada. |
| `src/components/settings/SettingsMalzemeAktar.jsx` **(yeni)** | Dosya seç (20 MB sınırı, `XLSX.read`, `sheet_to_json({ header: 1, raw: false, defval: "" })`, toplam 50.000 satır sınırı; C5), girdiler (parti 70/10 ön dolu, model adetleri boş), önizleme, ön koşul listesi ve pasif düğme, "Aktar" (kayıt anında `baskasiKilitli("ayar","yedekparca")` ve `("ayar","models")`), tek iz satırı, sonuç raporu ve canlı doğrulama turu. Ham HTML ve yazdırma yok (AC-42). |
| `src/components/Settings.jsx` | Veri Yönetimi'ne `{ id: "malzemeaktar", label: MALZEME_AKTAR_PANEL_ADI }`, panel çizimi; prop'lar `parts/setParts`, `standardModels/setStandardModels`, `customModels/setCustomModels`, `malzemeler`, `serverPermissions`, `baskasiKilitli` (var olan `useKilitListesi`). |
| `src/lib/kilitAlanlari.js` | `AYAR_KILITLI.malzemeaktar`, `AYAR_PANEL_DOSYALARI`'na yeni panel dosyası (AC-56). |
| `src/components/settings/SettingsAuditLog.jsx` | `ice_aktarildi` eylem etiketi (yoksa; `parca_tanimi` var). |
| `CLAUDE.md` | 0139 bölümü. |
| `specs/0139-fire-kilogram-ve-parca-ice-aktarma.md` | Ek 3'ün doldurulması ve onaylanan revizyonlar (bölüm 3). |

Dokunulmayanlar: `parcaAktarma.js` ve 0124 şablonu (C4), `SettingsImport.jsx`, sunucu ve izinler (C6), `merge.js`
(`malzemeler` zaten `MERGE_KEYS`'te, yeni alan kaydın içinde taşınır), yedek (bütün nesne).

### Testler

| Dosya | Kapsam |
|---|---|
| `tests/fire-kg-0139.test.js` **(yeni)** | Motor (AC-1…AC-10, AC-15, AC-16, AC-44…AC-46, AC-49'un motor yarısı), doğrulayıcı (AC-12…AC-14, AC-45), sipariş (AC-17, AC-51), örnek (AC-54), taramalar (C2 tek yer, AC-55 metin, A-R10 fiyat kümesi). |
| `tests/fire-kg-0139-kiyas.test.js` **(yeni)** | C1, AC-1, AC-18, AC-50: tablosuz veride parça maliyeti, satış fiyatı, model maliyetleri, parti hesabı, sipariş ihtiyacı, Excel dışa aktarması **spec öncesi altınla** birebir (`tests/fixtures/0139-once.json`, `YAZ_0139=1` ile `main`'den üretilir); ek olarak tablolu veride boy adedi kesitinin sipariş kilosu altınla aynı. |
| `tests/ui/fire-kg-0139.test.jsx` **(yeni)** | Kart iki kipte düzenleyici, pencerede yok (AC-48), ad değişince tablo aynen (AC-47, kaydedilen gövde), sıra/negatif/boş hatası alanın altında (AC-12, AC-45), etki özeti var/yok (AC-53), parça kartında fire dahil satırı (AC-49), boy nedeni satırı (AC-11, AC-52). |
| `tests/malzeme-aktarma-0139.test.js` **(yeni)** | Saf modül: AC-23…AC-41, AC-43, AC-58, AC-60…AC-70, AC-74, AC-75 (sentetik satır dizileriyle). |
| `tests/ui/malzeme-aktarma-0139.test.jsx` **(yeni)** | Gerçek `Settings` paneli: AC-21, AC-40, AC-42, AC-56, AC-57, AC-59, AC-71, AC-72, AC-73. |
| `tests/ui/malzeme-aktarma-0139-app.test.jsx` **(yeni)** | Gerçek App: aktarmanın kaydettiği gövdede yalnız `parts`, `standardModels`, `customModels` değişir (AC-22). |
| `tests/fixtures/0139-kaynak.js` **(yeni)** | Sentetik çalışma kitabı kurucusu (`XLSX.utils.aoa_to_sheet`, Ek 3 düzeniyle, uydurma adlar, dört sayfa + üç kapsam dışı sayfa + boş şablon satırları + adet 0 satırı + Ek 1 satırları). |
| `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs` | AC-19, AC-20. |
| `tests/kilit-alanlari.test.js`, `tests/islem-gecmisi-etiketleri.test.js` | Var olan bekçiler; yeni panel ve etiketle yeşil kalmalı (AC-56, AC-71). |
| `scripts/olc/0139-kaynak-kiyas.mjs` **(yeni, isteğe bağlı ölçüm)** | Gerçek dosya yerelde verilirse satır satır sapma ve dört sayfa toplamı; CI'da koşmaz, sonucu SCORECARD'a yazılır (AC-43'ün gerçek veri yarısı). |

---

## 2. Adım sırası

1. **Worktree ve altınlar.** `../wt0139` kurulumu (npm ci, Electron programı, `ensure-native --denetle`). `main` kodundan
   `0139-once.json` altını (C1) ve kanıt tabanı (`0139-taban-piksel-raporu.json`) üretilir. Önce altın, sonra kod.
2. **Malzeme motoru** (`malzeme.js`): doğrulayıcı, `ekFireKg`, iki dal, metinler. Motor testleri ve kıyas yeşil.
3. **Veritabanı** (`db.cjs` dört nokta) ve iki Electron testi.
4. **Sipariş motoru**: uyarı koşulu ve metni. Kıyasın AC-50 bloğu.
5. **Ekranlar (kilogram fire)**: `MalzemeManager` düzenleyici, beyaz liste, etki onayı; `MalzemeSatiriAlani` nedeni;
   `ornekKatalog`. UI testleri.
6. **Saf aktarma modülü** ve sentetik çalışma kitabı; saf testler. Ek 3 haritası koda bu adımda girer.
7. **Panel**: `SettingsMalzemeAktar`, `Settings` menü ve prop'lar, `kilitAlanlari`, iz etiketi. Panel ve App testleri.
8. **Ölçüm**: gerçek dosyayla `0139-kaynak-kiyas.mjs` (yerelde, salt okuma; altı kart sentetik değerlerle bellek içinde
   kurularak), sonuç plana ve SCORECARD'a.
9. **Kanıt**: yeni ekranlar görüntü aracına, `kanit-eslemesi.json` kayıtları (`degisti` + onay), rapor.
10. **Kapanış hazırlığı**: `npm run lint`, `npm test` (Electron dahil), CLAUDE.md, spec'in Ek 3'ü, sürüm notu (bölüm 5).

---

## 3. Riskler ve emin olmadığım noktalar (her birinde öneri ve gerekçe)

**R1. AC-23, AC-24, AC-25 ve B-R5'in metin kuralı kapsam dışı sayfalara ait (spec revizyonu gerekir).**
Hesap yapan dört sayfada ölçü ayrı sütunlarda. Metin ayrıştırıcısı yazılırsa hiçbir sayfa onu kullanmaz (ölü kod).
*Önerim:* B-R5 ve üç kriter sütun düzenine çevrilir: paslanmazda G = "Ø" → yuvarlak mil (çap H, boy K); plastikte E =
"DELRİN LEVHA" → sac (kalınlık K, en J, boy O), öteki E değerleri → yuvarlak mil (çap J, boy O). AC-23: "G = Ø, H = 60,
K = 175 olan satır yuvarlak mil, çap 60, boy 175"; AC-24: "DELRİN LEVHA, K = 70, J = 390, O = 390 olan satır sac,
kalınlık 70, en 390, boy 390"; AC-25: "POM DELRİN, J = 150, O = 42 olan satır yuvarlak mil, çap 150, boy 42". Rakamlar
korunur, yalnız okunduğu yer değişir. *Gerekçe:* spec'in amacı biçimin kaynaktan doğru türemesi; o kaynak sütunlardır.
Metin kuralı X9 sayfaları açıldığında (ayrı spec) yazılır.

**R2. Plastikte malzeme E sütunundan gelir; B-R3/2'nin metin kuralı yalnız yedek (spec revizyonu).**
*Önerim:* sıra (1) satırın E hücresi, kart adıyla `trLower` eşlemesi; (2) E boşsa sayfa varsayılanı (paslanmaz:
`PASLANMAZ 304 ÇUBUK`; plastik sayfalarının varsayılanı yok); (3) metin anahtar sözcüğü yalnız E boşken. Paslanmaz
sayfalarında E yok, varsayılan + Ek 1 (boru satırı `PASLANMAZ 304 BORU`). *Gerekçe:* metin kuralı "KESTAMİT ÖN
KESTAMİT KAM" satırında `KESTAMİT` sözcüğünü hangi karta bağlayacağını bilmiyor (kart adı "POM KESTAMİD", D ile), "SİYAH
DERLİN YATAK" yazım hatası yüzünden `DELRİN`'i hiç bulmuyor; E sütunu ikisinde de doğru kartı söylüyor.

**R3. Adedi sıfır dört satır.** *Önerim:* atlanır, nedeni "adet 0 (kaynakta ayrı malzeme alınmıyor)" raporda sayılır;
parça oluşturulmaz. *Gerekçe:* bu dördü dişi kalıbın malzemesinden çıkıyor; malzeme kalemiyle oluşturulsa maliyeti çift
sayılır, kalemsiz oluşturulsa "girilmedi" görünür. Context'in 87 satır beklentisiyle de tutar.

**R4. Teyit #1'in iki öneksiz satırı (PASLANMAZ KALIP MİLİ 40, YAN SIYIRICI GRAMAJ İÇİN 40).**
Kaynakta önek yok; B-R6 gereği 40 / 70 = 0,571 bütün AK100 **ve AK120** varyantlarına yazılırdı. Spec'in tam olarak
kaçınmak istediği "makul görünen ve kimsenin yakalamayacağı hata" bu. *Önerim:* modülde adlı sabit tablo
(`ONEK_DUZELTMELERI`, Ek 1 emsali): bu iki satır `AK100` önekli sayılır, kit adedi B-R6/2 ile model adedinden (boşsa
kitsiz ve "adedi doğrulanmalı"). Teyit gelmeden yanlış rakam yazılmaz, teyit gelince AK100 = 40 girilip tekrar
çalıştırılmaz (parça var, B-R9 atlar); kit elle girilir ya da araç teyitten sonra ilk kez çalıştırılır. *Gerekçe:* yanlış
ama sessiz bir ondalık yerine görünür boş kit.

**R5. Aynı ad farklı sayfada (en sık durum, spec'te tanımsız).**
İki paslanmaz sayfası ve iki plastik sayfası aynı adlı parçaları farklı ölçüyle taşıyor (KONVEYÖR BORU MİLİ Ø16×235 ve
Ø16×285 gibi). İkisi de öneksiz; B-R8/3 "iki satır da öneksizse ölçü" diyor ama karar 28 bunu "aynı sayfadaki" diye
daraltıyor. *Önerim:* ad çakışması **bütün sayfalar üzerinden** çözülür: temiz ad aynı, (malzeme, biçim, ölçüler) aynı
→ tek parça, kitine bütün ilgili modeller girer (B-R8, AC-34). Farklıysa **her** parçaya ek yazılır (ilk gelen çıplak
kalmaz; sıra bağımsız): önekliyse model öneki `(AK100)`, öneksizse sayfanın önek kümesi `(AK100-AK120)` /
`(AK140-SWP140)`; iki ek yine aynı çıkıyorsa (aynı sayfada iki öneksiz satır) ölçü `(Ø60×175)`. *Gerekçe:* her parça
adından hangi makina ailesine ait olduğu okunur; simetrik ek, aracın satır sırasına göre farklı ad üretmesini önler.

**R6. Kesirli kitin raporu.** Teyit #2'nin üç satırı (3,571 / 1,429 / 1,014) B-R6 ile yazılır. *Önerim:* "MAKİNALIK" notu
taşımayan ve kit adedi tam sayı olmayan öneksiz satırlar raporda ayrı listede ("kesirli kit, doğrulanmalı"), kit yine
yazılır. Notlu metrelik satırlar (9 satır) listede yer almaz. *Gerekçe:* spec "araç bu satırları raporda işaretler"
diyor; notlu satırların kesri tasarım gereği, işaretlemek gürültü olur.

**R7. Altı malzeme kartını kim kurar (B-R2 ↔ B-R11/2, DoD).**
B-R2 aracın kart yazmadığını, B-R11/2 ve DoD altı kartın "kurulduğunu" söylüyor. *Önerim:* kartlar **kullanıcının**
gerçek verisinde Ayarlar › Katalog › Malzemeler'den girilir (kod kart yazmaz, örnek katalog da yazmaz). Plan sürüm
notuna altı kartın değerlerini tablo olarak koyar; araç eksik kartı adıyla listeler (AC-59). DoD maddesini testler
sentetik kartlarla, ölçüm (adım 8) bellek içi kartlarla karşılar; gerçek verideki kurulum kullanıcının işi olarak
sürüm notunda. *Gerekçe:* kart fiyatları müşteri verisi ve teyit bekliyor (boru ~4,08 $); koda gömülürse yanlış fiyat
kalıcılaşır. İsterseniz alternatif: panelde "Önerilen kartları ekle" düğmesi (örnek katalog deseni). Önermiyorum; B-R2'yi
deler.

**R8. Paslanmaz boru kartının kilogram tablosu.** Context "kg tablosu ya da yüzde" diyor. *Önerim:* sürüm notunda boş
önerilir. *Gerekçe:* tek boru satırı Ø19, yani Ø0–21 bandına düşer ve fire 0 kg; tablo yazılsa da sonuç değişmez, teyit
gelmeden kural uydurulmaz.

**R9. Ad temizliği.** "SWP_", "SWP " (boşluklu), "100_", "120_", "140_", "(120 İÇİN) 120 KALIP YATAK MİLİ". *Önerim:*
baştan `^(100|120|140)[_ ]+`, `^SWP[_ ]+` ve `\((\d+)\s+İÇİN\)` (önek bilgisi olarak okunur, adından silinir), sonra
kırpılır. "(120 İÇİN) 120 KALIP YATAK MİLİ" → "KALIP YATAK MİLİ" + AK120. Ek 1'in iki satırının uzun not metni
("KONVEYÖR BORUSU 70 MAKİNALIK 2 BOY …") Ek 1 tablosundaki adla değiştirilir ("KONVEYÖR BORUSU", "KAZAN İÇ
ÇUBUKLARI"). *Gerekçe:* B-R8/2'nin tek yer kuralı ve önekin adla birlikte "120 " olarak kalmaması; notlu ad kataloğa
girerse bir daha eşlenemez.

**R10. Biçimlenmiş değer okuması (C5 `raw: false`).** Hücrelerin biçimli değeri "29.0", "11.5" gibi noktalı ondalık.
*Önerim:* modülde tek `hucreSayisi`: tek ayırıcılı (nokta ya da virgül) sayı ondalık sayılır, iki ayırıcı ya da harf
→ okunamadı (satır AC-41 ile atlanır). Kaynakta binlik ayırıcılı ölçü yok (en büyüğü 3000, ayırıcısız). *Gerekçe:*
`tutarCoz`'un "2.955 = 2955" kuralı burada yanlış okur; ölçü sütununda belirsiz sayı yok sayılmaz, reddedilir.

**R11. Satır içi tutarlılık.** Paslanmazda H ile I, plastikte J ile M aynı ölçünün kopyası. *Önerim:* farklıysa satır
"ölçü tutarsız" nedeniyle atlanır. Biçim plastikte E'den (L işareti kullanılmaz; satır 49'da L boş). *Gerekçe:* iki
kopya ayrışırsa hangisinin doğru olduğunu araç bilemez; sessizce birini seçmek yerine rapora düşer. Kaynakta hiçbir
satırda fark yok, yani gerçek veride etkisi sıfır.

**R12. Doğrulama turu (B-R13/2).** Kayıt asenkron, çakışmada kit satırları sunucu kopyasına yenilebilir. *Önerim:*
sonuç raporundaki "beklenen n kit satırı, bulunan m" **canlı** türetilir: panel açık kaldıkça bugünkü model dizilerinden
yeniden sayılır; yeniden yükleme kit satırlarını düşürürse sayı kendiliğinden düşer ve eksikler listelenir. *Gerekçe:*
tek seferlik kontrol kayıt yolda iken çalışır ve hep "tuttu" der.

**R13. Kit yazım yolu.** *Önerim:* her yeni parça için `urunAgaci.kitleriGuncelle` (B-R3/4 ve 0087 tek yazma yolu),
iki model dizisinin işlevsel güncelleyicisinde, tam dizi üzerinde; parçanın `models` işareti aynı kümeden. Kalem
`maliyetKalemleri: [{ tur: "malzeme", malzemeId, bicim, yontem: "kilo", ölçüler, adet: "1" }]` (0135 biçimi; eski
`malzemeSatiri` yazılmaz). *Gerekçe:* 0135'ten beri kalem listesi tek kaynak; eski alana yazmak türetme kuralını
(Karar 31) gereksiz yere devreye sokar.

**R14. Etki özetinin pencere bileşeni (A-R16).** *Önerim:* fiyat penceresinin özet çizimi (`etkiMetni`,
`fiyatEtkiMetni`, beş örnek satır) küçük bir dışa verilen bileşene ayrılır ve iki yer onu çizer; özet boşsa (bağlı parça
yok) onay yine gösterilir ama tek satırla. *Gerekçe:* spec "aynı etki özeti" diyor; ikinci kopya iki metnin ayrışmasına
yol açar.

**R15. Model adedi girdileri.** *Önerim:* dört alan (AK100, AK120, AK140, SWP140), hepsi boş başlar; parti 70 ve 10 Ek 2'den
ön dolu ve düzenlenebilir. Girdiler saklanmaz. *Gerekçe:* spec teyit gelene kadar boş istiyor; saklamak yeni ayar alanı
demek.

**R16. Gerçek dosyayla AC-43.** *Önerim:* CI'da sentetik satırlar kaynağın formülüyle (paslanmaz `d² × L × 0,0000062`,
plastik `0,785`, kilogram bant ve yüzde) hesaplanan beklenen tutara karşı ölçülür; gerçek dosya yalnız adım 8'de yerelde.
*Gerekçe:* müşteri verisi depoya girmez; formül sentetikte de aynı sapmayı (milde %0,075, levhada ~0) verir.

---

## 4. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` taşır. Kısaltmalar: **M** `fire-kg-0139.test.js`, **K** `fire-kg-0139-kiyas.test.js`,
**MU** `ui/fire-kg-0139.test.jsx`, **A** `malzeme-aktarma-0139.test.js`, **AU** `ui/malzeme-aktarma-0139.test.jsx`,
**AA** `ui/malzeme-aktarma-0139-app.test.jsx`, **DB** `db-roundtrip.cjs` / `db-clean-install.cjs`.

| AC | Test |
|---|---|
| 1 | K (altın) + M (tablosuz kartta `fireliKg` eski formülle) |
| 2, 3, 4, 5, 6, 7, 8, 9, 10 | M (`malzemeOzeti` sayısal) |
| 11 | MU (`fire-kg-uygulanmadi`) + M (boy dalı kilogram eklemez) |
| 12, 13, 14 | M (`fireBantlariDogrula`) + MU (hata alanın altında) |
| 15 | M (`fiyatGecmisiYaz` çağrılmaz; kartın kaydında geçmiş aynen) + MU (gövde) |
| 16 | M (geçmiş tarihli `parcaMaliyetKurus` bugünkü tabloyla) |
| 17 | M (`siparisIhtiyaci` Fire kg sütunu) |
| 18 | K (emniyet payı, asgari sipariş altınla) |
| 19, 20 | DB |
| 21 | AU (önizleme sayıları, setter çağrılmaz) |
| 22 | AA (kaydedilen gövde) |
| 23, 24, 25, 26 | A (R1 revizyonuyla sütun düzeni) |
| 27 | A (pay alanları kalemde yok) |
| 28, 29 | A (kit 1 ve 0,029) |
| 30, 31, 32 | A (önek eşlemesi) |
| 33, 34 | A (R5 kuralı) |
| 35 | A (canlı aynı ad atlanır, neden) |
| 36 | A (Ek 1 dört satır) |
| 37 | A (fiyatsız kart, maliyet `null`, rapor sayısı) |
| 38 | A (modeli olmayan önek: kitsiz, raporda) |
| 39 | A (planı uygula, ikinci plan sıfır parça) + AU |
| 40 | AU (bozuk dosya, sayfasız dosya; setter yok, neden ekranda) + A (`sayfaEsle`) |
| 41 | A (okunamayan ölçü, tutarsız ölçü) |
| 42 | AU (kaynak taraması: `dangerouslySetInnerHTML`, `printHtml` yok) |
| 43 | A (sentetik, kaynağın formülüyle) + adım 8 ölçümü |
| 44, 45, 46 | M |
| 47 | MU (ad değişiminde gövdede tablo) |
| 48 | MU (iki kip, pencerede yok, pencere kaydı tabloya dokunmaz) |
| 49 | M + MU |
| 50 | K (tablolu veride boy adedi kesiti altınla) |
| 51 | M (uyarı yüzdesiz, kilogramlı kartta) |
| 52 | MU |
| 53 | MU (değiştiyse onay, değişmediyse doğrudan) |
| 54 | M (`ornekMalzemeler` çıktısı `malzemeDogrula`'dan geçer, tablo var) |
| 55 | M (kaynak taraması: `MalzemeManager.jsx` ve `MalzemeSatiriAlani.jsx`'te sabitlerin düz metni yok) |
| 56 | AU + `kilit-alanlari` bekçisi |
| 57 | AU (iki kilit ayrı ayrı başkasında; setter yok, bildirim kaydın adıyla) |
| 58 | A + AU (üç sayfa okunmaz, satır yazılır) |
| 59 | AU (kartsız önizleme, düğme pasif) |
| 60 | A (E sütunu, sayfa varsayılanı, eşlenemeyen satır) |
| 61, 62, 63, 64 | A |
| 65 | A (`adTemizle`) |
| 66 | A (R5) |
| 67 | A (atlanan satırın kiti yok, ayrı sayı) |
| 68 | A |
| 69 | A (`models` var; `fiyatKipi`, `kod`, `tip` anahtarı yok) |
| 70 | A |
| 71 | AU (tek `logAction`) + `islem-gecmisi-etiketleri` |
| 72 | AU (model dizisi sonradan küçültülünce fark listelenir) |
| 73 | AU (20 MB üstü dosya, 50.000 satır üstü) |
| 74 | A (`__proto__` sayfa ve anahtar; formül hücresi önbellekli değerle) |
| 75 | A (kaynak taraması: `uid(`, `Date`, `new Date`, `yerelBugun` yok) |

C1–C7 ve DoD'nin tarama maddeleri: C2 (kilogram bandının seçimi yalnız `malzeme.js`; yüzdenin `siparisIhtiyaci.js`
boy yolundaki kopyası tam yollu istisna) M'de; C3 (panelde `kitleriGuncelle(`, `trLower(` dışında karar yok) AU'da;
C4 (`parcaAktarma.js` dokunulmadı) A'da dosya özetiyle; C6 (sunucu dosyaları dokunulmadı) A'da.

---

## 5. Sürüm notu taslağı

- Malzeme kartında "Çap bandına göre ek fire (kg)" tablosu. Tablo boşken hiçbir rakam değişmez.
- Ayarlar › Veri Yönetimi › "Malzeme Listesinden Aktar". **Sunucu PC'de ve başka kullanıcı yazmazken çalıştırın.** Önce
  altı malzeme kartını kurun (değerler aşağıda); parti adetleri 70 ve 10 hazır gelir, model adetleri teyit gelene kadar
  boş bırakılabilir (o satırlar kitsiz oluşur ve raporda listelenir). Rapordaki "beklenen / bulunan kit satırı" tutmazsa
  aracı tekrar çalıştırın; var olan parçalar ikinci kez oluşmaz.
- Altı kartın önerilen değerleri: Context tablosu (PASLANMAZ 304 ÇUBUK kg tablosuyla; boru kartında tablo boş).
- Oluşan parçaların satış fiyatı elle sabit kalır; maliyete bağlamak için Parça kataloğundaki toplu düğme.

---

## 6. Uygulama notları (2026-11-09)

**Plandan sapmalar (hepsi küçük):**
- Panel `ilkSayfalar` prop'u alır (yalnız görüntü aracı için; görüntü aracında dosya seçilemiyor). Uygulama vermez.
- Etki özeti çizimi `src/components/MalzemeEtkiOzeti.jsx`'e taşındı (karar 43); fiyat penceresi onu çizer, test kimlikleri aynı.
- Bozuk bayt dizisini xlsx paketi çoğu zaman hata vermeden tek sayfalı kitap olarak okuyor; AC-40'ın reddini o durumda sayfa
  eşlemesi yapıyor (`SAYFA_YOK`). Test ikisini birlikte ölçer.
- Rapor satırlarının biçimi modülde (`ATLANAN_SATIR`, `KESIRLI_SATIR`, `EKSIK_KIT_SATIRI`); ekran metin yazmaz.

**"spec 0139 ile" güncellenen testler:** `ui/malzeme-0132` AC-14 (fire değişince onay adımı), `urun-agaci-0087` AC-19
(`defaultParcalar`'ı anan dosyalara aktarma modülü; yalnız okur, `kitleriGuncelle` ile yazar), `parca-fiyati-0133` AC-74 (etki
özetinin tek bileşeni), `maliyet-kalemleri-0135-kiyas` ve `dis-islem-kalkar-0138-kiyas` (`tests/fixtures/0139-ayikla.js`: boy adedi
fire uyarısının metni değişti, varlığı karşılaştırılır; yeni `ekFireKg` alanı çıkarılır).

**Mutasyonla ölçüldü (dosya kopyasıyla):** eksik dalda kilogramın kaldırılması, beyaz listeden `fireBantlari`'nın çıkarılması,
sipariş uyarısının yalnız yüzdeye dönmesi, teyit #1 tablosunun boşaltılması, aynı ad atlamasının kaldırılması, etki onayının
kaldırılması: altısı test düşürdü. "Çaplı biçim kapısı"nın kaldırılması eşdeğer mutasyon (lama ve sacın ölçüsünde çap yok).

**Gerçek dosyayla ölçüm (adım 8, `scripts/olc/0139-kaynak-kiyas.mjs`, kartlar bellekte Context değerleriyle):** plan 91 kaynak
satırından 81 parça ve 236 kit satırı üretir (model adetleri AK100 40, AK120 30 girilince); adedi sıfır dört satır atlanır.
83 satırda birim maliyet kaynağın ham "adet TL" hücresiyle karşılaştırıldı: 78'i sınır içinde. Kalan beş: üç küçük mil (9-12 TL)
%0,11 (kuruşa yuvarlama payı; geometri sapması %0,075) ve iki teflon satırı %−4,50 (kaynak teflonu ₺550/kg ile hesaplıyor,
Context 10,5 $ × kur 50 = ₺525 öneriyor; kart ₺550 girilirse tutar). Kod değil kart değeri; sürüm notunda.

**Kanıt:** `0139-piksel-raporu.json` (38 ekran × 2 tema). Değişenler: Veri Yönetimi grubundaki Ayarlar ekranları (yeni menü
öğesi, 10.788 piksel), malzeme kartının üç ekranı (fire bölümü), sipariş ihtiyacının iki ekranı (uyarı metni). Fiyat penceresi,
parça kartı ve boş/hatalı sipariş ekranlarındaki 96-288 piksel spec öncesi kodda iki çekim arasında da çıkıyor (gürültü); eşlemeye
bağlanmadı. Yeni on bir ekran.

## 7. Sürüm notu (güncel)

- Önce sunucu PC, sonra istemciler (yeni `fireBantlari` sütunu; güncellenmemiş bilgisayar kartı düzenlerse tablo silinmez ama
  kilogram fire o bilgisayarda hesaba girmez).
- Malzeme Listesinden Aktar: sunucu PC'de ve başka kullanıcı yazmazken. Önce altı malzeme kartını kurun:

| Kart | ρ | Fiyat | Fire |
|---|---|---|---|
| PASLANMAZ 304 ÇUBUK | 7,9 | USD, kur 50; bantlar Ø0 2,85 · Ø101 2,95 · Ø151 3,40 $; kilo fiyatı 3,20 $ (lama) | kg tablosu: Ø0 0 · Ø21 0,05 · Ø36 0,30 · Ø91 0,35 · Ø101 1,00 · Ø141 1,75 |
| PASLANMAZ 304 BORU | 8,0 | USD, kur 50; kilo fiyatı ~4,08 $ (teyit) | boş |
| POM DELRİN | 1,42 | Ø0 175 · Ø151 190 TL | %10 |
| DELRİN LEVHA | 1,42 | 190 TL | %10 |
| POM KESTAMİD | 1,15 | Ø0 1.270 · Ø20 1.180 · Ø30 1.015 · Ø50 880 · Ø80 330 TL | %10 |
| POM TEFLON | 2,2 | **550 TL** (kaynak böyle hesaplıyor; 10,5 $ × 50 = 525 TL kaynakla %4,5 ayrışır) | %10 |

- Model adetleri (AK100 40, AK120 30) teyit gelene kadar boş bırakılabilir; o satırlar kitsiz oluşur ve raporda listelenir.
  Teyit gelince kitler Makina Modelleri'nden elle girilir (araç var olan parçayı güncellemez).
- Oluşan parçaların satış fiyatı elle sabit kalır; maliyete bağlamak için Parça kataloğundaki toplu düğme.

## 8. Triyaj düzeltmeleri (2026-11-09)

1. **Satır sınırı çevirmeden önce (C5, AC-73):** `XLSX.read` `sheetRows: 50.001` ile ayrıştırmayı sınırlar; sayfanın bildirdiği
   aralık (`!fullref` / `!ref`, `decode_range`) yalnız eşlenen dört sayfa için toplanır ve sınır çeviriden önce uygulanır; öteki
   sayfalar (kapsam dışı üç sayfa dahil) çevrilmez, adları boş diziyle döner. Tek hücreli, A1:CV1048576 aralıklı 15 KB dosya artık
   4 ms'de reddedilir (önce 35 sn ve 1,5 GB). Fikstür `tests/fixtures/0139-dev-aralik.xlsx` (yazımı 30 sn sürdüğü için saklı).
   `SettingsImport.jsx`'teki aynı kalıp ayrı iş (dokunulmadı).
2. **Kitsiz parçanın işareti:** kit adedi yazılamayan satırda da hedef modellerin uyumluluk işareti yazılır (spec AC-69 ve B-R3/4
   notu); Makina Modelleri kartının parça seçicisi onu listeler, sürüm notundaki "kiti Makina Modelleri'nden girin" yolu çalışır.
3. **AC-43 eşiği:** "%0,1 (levhada %0,01) artı 1 kuruş" (spec notu). Önerilen "ya da" okuması iki küçük mili yine kaçırıyordu
   (10,19 TL ile 10,178 TL farkı 1,2 kuruş: %0,075 geometri + kuruş yuvarlaması). Gerçek dosyada eşiği aşan yalnız iki teflon satırı
   (kart değeri, sürüm notunda ₺550).
4. **Parti adedi:** geçersizse (boş, ondalıklı, sıfır) alanın altında `HataMetni` ve yazma düğmesi pasif (`partiGirdiHatalari`,
   metin `urunAgaci.PARTI_BUYUKLUGU_HATASI`); kayıt yolu da aynı denetimi yapar.

## 9. Kapanış (2026-11-09)

Spec ve plan `specs/done/`'a taşındı, SCORECARD dolduruldu, README'ye satır eklendi. Kanıt eşlemesinin on yedi `degisti` kaydı
`ayni`ye ve `0139-taban-piksel-raporu.json`'a çevrildi (15 ekran × 2 tema). Taban son koddan: görüntü aracının tıklama adımı dört
çekimin ikisinde birer ekranda kaçtı (katalog-malzeme-yeni, katalog-parca-0139-fire: pencere açılmadan çekildi); doğru iki çekim (t2,
t3) 30 görüntünün hepsinde bayt bayt aynıydı, taban raporu bu iki çekimden kuruldu (rapordaki pikseller t3'ün t2'ye göre farkı, 0).
