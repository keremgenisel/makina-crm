# 0090 Uygulama Planı: Gider ataması ve aylara dağıtım kalkar, parti payı rolden gelir

| | |
|---|---|
| **Spec** | `specs/done/0090-gider-atamasi-kalkar-parti-payi-rolden.md` (revizyon 3) · Tamamlandı: commit `58175b5` |
| **Dal** | `feat/0090-atama-kalkar` (taban `26779e0`, 0089 kapanışı) |
| **Onay** | Takım Yöneticisi · 2026-10-17 · bütün öneriler (K1–K9) kabul |

## 1. Değişecek ve eklenecek dosyalar

**Motor ve veri:**

| Dosya | Değişiklik |
|---|---|
| `src/lib/gider.js` | `ATAMA_ANAHTARLARI`, `atamaVerisiKoru` (R5/2, R5/3: taşıyorsa birebir, taşımıyorsa anahtar yok; hata ve uyarı yok); `giderKalemDogrula`'nın atama bloğu bu tek kurala indi; `tekrarlayanUret` temel kalemine boş atama anahtarı yazmaz. Kova alanları ve `dusenAtamalar` motorda kalır (C9, X6). |
| `src/lib/makinaStandartMaliyet.js` | `aylikGenelHavuzlar` (C15: ay başına `rolHavuzlari(veri, ay, ay).genelK`, tek yol), `partiGenelPaylari` (R14–R22, R31–R33, R36/2, R37/2), `PARTI_DURUM`, `PARTI_NEDEN`, `PARTI_KAYNAK_IBARESI`; ağırlıklı bölme ve üretim sırası bu dosyada yeniden yazıldı (K3). Parti nesnesi ayrıca `makinaPaylari` taşır (AC-27: artık kuruş en önce üretilene). |
| `src/lib/uretimPartisi.js` | `kapanisAnlikGoruntusu`, `KAPANIS_HARITA_YOK`; `partiKapanisUygula(eski, yeni, havuz, simdi)` → `{ kayit }` ya da `{ hata }` (R23, R26, R36, R36/2, R37). Eski `kapanisOrtaklari` okunmaz ve dokunulmaz (C7). |
| `src/lib/giderRaporu.js` | "GİDER · MALİYET DAĞILIMI" kutusu ve gider dizisindeki yeri kalktı; rapor nesnesinin `kovalar` alanı ölü alan (R11/2). |
| `electron/db.cjs` | `uretim_partileri.kapanisGenelHavuzlari TEXT` (`URETIM_PARTI_GENEL_HAVUZ_COLUMN`), dört nokta; boş nesne yazılmaz, boşken gövdeye anahtar konmaz (R36, C8). |
| `src/lib/makinaMaliyeti.js` | **Dokunulmadı** (C10, X3). |

**Ekran:** `GiderForm.jsx` ve `SettingsGiderTanimlari.jsx` (atama ve dağıtım alanı, atama sütunu ve ölü prop'lar), `GiderAlanlari.jsx`
(`MakinaSecici`, `ModelSatirlari`, `AtamaAlani`, `DagitimAlani` silindi), `DonemRaporu.jsx` (`KovaKarti`, `dusenAtama*`, atama sütunu,
dağıtım rozeti, makina çözücü; sekiz sütun), `Giderler.jsx` (kova kutusu, `modeller` memosu), `Settings.jsx`, üç silme onayı
(`Customers.jsx`, `stock/MakinaStokTab.jsx`, `ModelsManager.jsx`; `modelAdiTasi` duruyor), `MakinaMaliyeti.jsx` (parti hesabı
`useMemo` + `useBugun`, `tumMusteriler` prop'u, K8), `gider/UretimPartileri.jsx` (yeni nesneden dört hücre, neden ve kaynak, başlık ve
boş metin, kapanış hatası bildirimi), `maliyet/PartiHesabi.jsx` (`PAY_AYRIM_IBARESI`), `App.jsx` (eski motor memosu ve import'u kalktı,
`tumMusteriler={customers}`).

**Kayıtlar:** `docs/tasarim-sozlugu.md` (R41), `scripts/evidence/0009-sayfa.jsx` (R42), `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md`.
Rehber (`docs/rehber/`, analistin) düzeltildi ve PDF'ler üretildi, **commitlenmedi** (K7).

**Eklenen testler:** `tests/parti-genel-payi-0090.test.js` (motor, AC-17…38/4, 39…45/3, 48, 51, 52), `tests/gider-atama-kalkar-0090.test.js`
(giriş kapıları motor düzeyi, raporlar, taramalar, kanıt aracı, kriter kapsamı), `tests/ui/gider-atama-kalkar-0090.test.jsx`,
`tests/ui/parti-genel-payi-0090-app.test.jsx`, `tests/ui/gider-atama-kalkar-0090-kiyas.test.jsx` (C16 ek altın ve AC-36 altını;
`YAZ_0090=1` ile spec öncesi kodda üretildi); fikstürler `0090-veri.js`, `0090-bos-atama.js` (`bosAtamaAyikla`), `0090-ekran-once.json`,
`0090-parti-once.json`.

**Yeni veri bölümü, izin, sunucu ve birleştirme kuralı yok** (C13, tarama).

## 2. Adım sırası

0. Dal, spec revizyon 3, bu plan.
1. Kıyas altınları spec öncesi kodla (`0090-ekran-once.json`, `0090-parti-once.json`).
2. Motor: `atamaVerisiKoru`, `partiGenelPaylari`, kapanış yardımcısı; veritabanı alanı.
3. Ekran: form, tanım, Dönem Raporu, silme onayları, Makina Maliyeti ve Üretim Partileri; App memosu kalkar.
4. Ters çevrilen ve kırılan testler (spec Context'teki iki tablo + ek on dosya), "spec 0090 ile" notuyla; yeni testler; mutasyon.
5. Electron betikleri (dört kutu, yedi başlık); görüntü aracı ve görsel kanıt.
6. Rehber ve PDF'ler (commit dışı); CLAUDE.md; sürüm notu.
7. `npm test` (Electron dahil), lint; gerçek verinin kopyasıyla elle deneme; triyaj; kapanış.

## 3. Kararlar (spec revizyon 3)

| No | Karar |
|---|---|
| K1 | Atama taşıyan kalemde hata ve uyarı yok; biçim çözülür, iki tutarlılık kuralı kalır (R5/3) |
| K2 | Kalem listesi ve tam metin için ek `0090-ekran-once.json` (atama hücreleri DOM'da çıkarılarak); 0089 altını yenilenmez (C16) |
| K3 | Ağırlıklı bölme yeni motorda; eski dosyaya dokunulmaz; eşdeğerlik AC-36 ile |
| K4 | Ay haritası yürürlükten en geç aya; eksik ayda kapanış reddi (R36/2) |
| K5 | Durum önceliği baslamadi → makinaYok → yururlukOncesi → rolYok → tamam |
| K6 | AC-52 2 sn sınırı kalır |
| K7 | Rehber düzeltilir, PDF üretilir, commitlenmez; AC-58 el ölçümü (§6) |
| K8 | Parti hesabı Makina Maliyeti ekranında (`useMemo`, `useBugun`) |
| K9 | Eski kapalı partilerin değişim kutusu susar; sürüm notunda (§7) |

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, 2, 3, 6, 7, 9–13, 12/2 | `ui/gider-atama-kalkar-0090`; ayrıca `ui/gider-form`, `ui/gider-settings`, `ui/gider-tanim-tablo`, `kutular-kapali-0081` |
| AC-4, 5, 6, 8 | `gider-atama-kalkar-0090` (motor) + `ui/gider-atama-kalkar-0090` (form) |
| AC-12/2 (1280 px) | `gider-tanim-yerlesim` (Electron) |
| AC-14, 15, 16 | `gider-atama-kalkar-0090`; 15 ayrıca `ui/gider-gorunum-0089-kiyas` (AC-18), `ui/gider-atama-kalkar-0090-kiyas` |
| AC-17–38/4 | `parti-genel-payi-0090` (motor); 31–35, 37, 38, 38/5, 38/6 ayrıca `ui/parti-genel-payi-0090-app` |
| AC-36 | `parti-genel-payi-0090` + `ui/gider-atama-kalkar-0090-kiyas` (altının kendisi, C10) |
| AC-39–45/3 | `parti-genel-payi-0090` (motor) + `ui/parti-genel-payi-0090-app` (ekran, gerçek App) |
| AC-44, 45 | ayrıca `db-roundtrip.cjs` (Electron, `db-electron.test.js`) |
| AC-46, 47, 53–56 | `gider-atama-kalkar-0090` (taramalar); 47 ayrıca `ui/parti-genel-payi-0090-app` ve `ui/gider-gorunum-0089-app` (casus) |
| AC-48, 51, 52 | `parti-genel-payi-0090` |
| AC-49, 50 | `ui/parti-genel-payi-0090-app` |
| AC-57 | `gider-atama-kalkar-0090` (araç ve kanıt eşlemesi) + `kanit-eslemesi` |
| AC-58 | El ölçümü (§6) |

## 5. Ölçümler

- **Kıyas altınları (adım 1, spec öncesi kod `26779e0`):** `0090-ekran-once.json` (kalem listesi ve tam ekran metni, atama sütunu DOM'da
  hücre düzeyinde ve kovalar kutusu bütünüyle çıkarılarak) ve `0090-parti-once.json` (bugünkü motorun parti havuzu ve makina başı payı).
  Uygulamadan sonra ikisi de birebir: AC-15/C16 (`ui/gider-atama-kalkar-0090-kiyas`) ve AC-36 (yeni motor eski motorun rakamlarını
  verir; 901 `[3, 3.450.003, 1.150.001]`, 902 `[2, 1.700.000, 850.000]`, 903 makinaYok, 904 baslamadi, Şubat–Haziran ay havuzları
  aynı). 0089'un iki altını ve 0059 altınları yenilenmedi; karşılaştırma `bosAtamaAyikla` ve kutu ayıklamasıyla daraltıldı.
- **AC-52:** 36 ay, üç parti, 3.000 kalem, 60 makina: hesap ~19 ms; `hesaplaGiderRaporu` çağrısı ay başına bir (36), test çıktısında yazılı.
- **Spec'te olmayan bir bulgu (AC-45/2 testi):** ay tablosu `null` verilince kapanış yardımcısı nedenli ret yerine çöküyordu
  (`kapanisAnlikGoruntusu` varsayılan parametresi `null`'da işlemez); düzeltildi.
- **AC-27 için motora ekleme:** parti nesnesi `makinaPaylari` taşır (artık kuruş en önce üretilen makinaya; paylar toplamı = havuz).
- **Kırılan ve ters çevrilen testler:** spec'in iki tablosu ve ek on dosya; hepsi "spec 0090 ile" notlu (CLAUDE.md'deki liste).
- **Mutasyon ölçümü** (her biri en az bir testi kırdı): kapanış haritası kaydedilen partiden kurulmaz (triyaj bulgu 2), "Tüm
  çalışanlar" yolu boş atama yazar (triyaj bulgu 3), `null` ay tablosu (AC-45/2).
- **Lint:** 0 hata, 66 uyarı (taban 69).
- **Tam takım:** 354 dosya / 4.513 test yeşil (Electron dahil, `npm test` çıkış 0).
- **Görsel kanıt:** `0090-piksel-raporu.json`, 680 görüntü (340 ekran × 2 tema; taban `26779e0` worktree'de yeni araçla, beş parça),
  çizim hatası yok; 84 ekranda (168 görüntü) bilinçli değişiklik: 112 görüntüde sayfa boyu değişti (kovalar kutusu ve formun atama ve
  dağıtım bölümü kalktı), 56'sında aynı boyda içerik (kalem listesinin atama sütunu ve dağıtım rozeti, Tekrarlayan Giderler'in atama
  sütunu, tanım formunun alanları, Üretim Partileri'nin yeni sütun adı, kaynak ibaresi ve kuruşlu rakamları, Parti Hesabı'nın ayrım
  ibaresi, yazdırılan raporun kalkan kutusu). Formun ya da pencerenin arkasında Giderler çizen ekranlar (`kilit-*`, `kayit-perdesi`)
  da bu yüzden değişti. `uygulama-menu-kasali-aydinlik` 31 piksellik gürültüydü (0089'daki gibi), tek başına yeniden çekilince 0.
  Kanıt eşlemesine 175 kayıt (139 `degisti`, onay `spec 0090 R42`; iki yeni ekran `maliyet-0090-parti-neden`, `giderler-0090-rapor`).
- **Sözlük atıfları:** kod çıkınca `Giderler.jsx:294/361/329`, `DonemRaporu.jsx:44`, `Customers.jsx:489/523`, `Stock.jsx:54`
  (triyajda ölü prop satırı çıkınca bir satır kaydı).

## 6. El ölçümleri

- **AC-58 el ölçümü: rehberde atama ve dağıtım atfı kalmadı** (2026-10-17). `docs/rehber/gider-kasa-rehberi.html`: içindekiler
  satırında "atama" → "maliyete giriş"; §3 adım listesinden "Gerekiyorsa atama yapın (bkz. 3.7)" satırı çıktı; §3.7 "Atama: bu gider
  kime ait?" (dört kova tablosu) yerine "Gider makina maliyetine nasıl girer?" (üç rol tablosu, Hesap Ayarları); §7 kutusunun son
  cümlesi atamanın ve dağıtımın kalktığını söyler (eski "Makina Maliyeti Kovaları kutusunda toplam olarak görünür" kalktı); SSS'te
  "stopajı ve kova dağılımı bozulur" → "stopajı bozulur". `docs/rehber/gider-kasa-kurulum.html`: tanım alanlarından "Makina maliyeti
  ataması" çıktı. Sonrası `grep "atama\|kova\|dağıt"` yalnız yaşlandırma kovalarının üç satırını (`:286`, `:548`, `:558`; R43 gereği
  aynen), "aylara dağıtım da kaldırıldı" cümlesini ve Kasa'nın "hesap atama"sını bulur. İki PDF `scripts/rehber-pdf.cjs` ile yeniden
  üretildi (`Altunmak-CRM-Gider-ve-Kasa-Rehberi.pdf` 332 KB, `Altunmak-CRM-Gider-ve-Kasa-Kurulum-Rehberi.pdf` 233 KB, 17.10.2026
  21:35). Dosyalar analistin; **commitlenmedi** (K7).
- **Elle deneme (K7):** gerçek verinin kopyası (`data.db` + WAL + anahtar, geçici `userData`; gerçek klasöre yazılmadı, kopya ve döküm
  sonra silindi) Electron'da açıldı (şifreli, 33 bölüm) ve bugünkü motorlar çalıştırıldı. 20 canlı kalemin hiçbiri atama ya da
  dağıtım taşımıyor (R4 dalı gerçek veride boş; doğrulama hatası 0). 13 canlı türün 12'si "genel", 1'i "ürün ağacı", rolsüz yok.
  `partiGenelPaylari` 5 ms (ay haritası iki ay, yürürlük 2026-09). Tek canlı açık parti ("2026-2"): 1 makina, havuz 874.005,50 ₺,
  makina başı aynı, durum tamam (ayın geri kalanı o ay üretilmiş partisiz makinalara düştü). Ekim 2026 bitişiyle
  `partiKapanisUygula`: `kapanisGenelHavuzlari` = `{"2026-09": 64001100, "2026-10": 55400000}` (dolu); eski `kapanisOrtaklari`
  yazılmadı. Kapalı parti yok, yani K9'un susan kutusu gerçek veride görünmez.

## 7. Sürüm notu

> Gider kalemlerinde ve tekrarlayan tanımlarda **makina maliyeti ataması** ve **aylara dağıtım** alanları kalktı; Dönem Raporu'ndaki
> **Makina Maliyeti Kovaları** kutusu, Gider Kalemleri'nin **Atama** sütunu ve dağıtım rozeti, Tekrarlayan Giderler'in **Atama** sütunu
> ve yazdırılan Aylık Gider ve Kasa Raporu'ndaki **Maliyet dağılımı** kutusu da yok. Eski kayıtların atama ve dağıtım verisi silinmedi;
> kalem düzenlenip kaydedildiğinde aynen korunur. Makina Maliyeti › Üretim Partileri'ndeki **genel gider havuzu** ve **makina başı
> pay** artık gider türlerinin maliyet rolünden gelir: yalnız rolü "Genel gidere girer" olan türlerin kalemleri sayılır (rol Makina
> Maliyeti › Hesap Ayarları'nda verilir; hiçbir türün rolü yoksa satır nedenini yazar). **Bu sürümden önce kapatılmış partilerde
> "Kapanmış partilerin aylarında değişen ortak gider" kutusu artık satır göstermez** (eski kapanış kaydı yeni hesapla
> karşılaştırılmaz, silinmez); kutu bu sürümden sonra kapatılan partiler için çalışır. Veritabanına yeni bir alan eklendi: önce sunucu
> PC, sonra istemciler güncellenmeli; güncellenmemiş bilgisayarda kapatılan partinin kapanış kaydı tutulmaz.

## 8. Triyaj (2026-10-17)

| No | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Görsel kanıt yok, tam takım kırmızı, plan §5–§6 boş | Taban ve sonrası çekildi, kanıt eşlemesi yazıldı, §5–§6 dolduruldu; AC-57 testi eşleme dosyasının yapısını yanlış okuyordu (`dosyalar` altı), düzeltildi | `gider-atama-kalkar-0090` AC-57, `tasarim-kaynak`, `kanit-eslemesi` |
| 2 | Yürürlük boşken ya da bitiş haritanın dışındayken parti kapatılamıyor | `makinaStandartMaliyet.partiKapanisHavuzu(veri, parti, bugun)`: harita kaydedilen partinin aralığından, tek yol `aylikGenelHavuzlar` (C15; kalemsiz ay 0, yürürlük öncesi ay girmez); Makina Maliyeti `kapanisHavuzu` olarak verir | `parti-genel-payi-0090` dört senaryo, `ui/parti-genel-payi-0090-app` (mutasyonla ölçüldü) |
| 3 | "Tüm çalışanlar için tanım oluştur" boş atama anahtarı yazıyor | Dört anahtar satırdan çıktı | `ui/gider-atama-kalkar-0090` AC-7 (mutasyonla ölçüldü), `gider-atama-kalkar-0090` `atamaTur: ""` taraması |
| 4 | Ölü `giderler` prop'ları ve dört ölü yardımcı | App → Customers/Stock ve Stock → MakinaStokTab prop'u kalktı; `dagitimRozetMetni`, `makinaGiderSayisi`, `modelKullanim`, `modelSatirlariDogrula` silindi (yalnız onları sınayan testler notla kalktı) | `gider-atama-kalkar-0090` R40 taraması; güncellenen `gider.test`, `gider-dagitim-0072` |

Sonrası: 354 dosya / 4.513 test yeşil (Electron dahil), lint 0 hata (66 uyarı).
