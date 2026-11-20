# 0151 Uygulama planı: Kasa bakiyesi düzeltme hareketiyle ayarlanır

| | |
|---|---|
| **Spec** | `specs/0151-kasa-bakiye-duzeltmesi.md` (Onaylandı, 2026-11-20) |
| **Onay** | Takım Yöneticisi, 2026-11-20 ("tüm önerilerini kabul ediyorum, spece işle, planı yaz ve uygula") |
| **Dal** | `feat/0151-kasa-duzeltme` (main `09fe50df` üstünde) |
| **Durum** | Uygulandı, commit bekliyor |

## 1. Dosyalar

- **Motor `src/lib/kasa.js`:** tek sabitler (`DUZELTME_TUR`, `DUZELTME_TUR_ADI`, `DUZELTME_YON`, etiketler, nedenler, `duzeltmeIbaresi`,
  `duzeltmeYonAdi`), `hesapBakiyeleri`'nin dördüncü kolu (yön `yon`'dan, tutar pozitif), saf `duzeltmePlani` (fark toplam bakiyeden,
  kuruşla; kartta hedef borç), `hareketOzeti` (düzeltme yalnız varsa), `hesapsizOdemeler` / `hesapsizOzeti` (hesabı bulunamayan
  düzeltme, anahtar yalnız varsa), `hesapKullanimDetayi` (kendi kovası, yalnız varsa), `hesapTasimaPlani` (hesapsız bırakma nedeni),
  `hareketDuzenlemeDurumu` (düzenlenmez, silinir).
- **`src/lib/copKutusu.js`** (tür adı, isteğe bağlı para birimi), **`src/lib/yedekKasa.js`** (koruma), **`src/lib/giderRaporu.js`**
  (HAREKETLER satırı, koşullu `BAKİYE DÜZELTMELERİ`, hesapsız listede ad), **`src/lib/kilitAlanlari.js`** (pencere dosyası).
- **Veri ve sunucu:** `electron/db.cjs` `hesap_hareketleri.yon` (dört nokta, okumada boşsa yok), `electron/serverAuth.cjs`
  (`hareketIzni` → `kasa_hesap`, `KASA_SEKMELI_HAREKETLER`).
- **Ekran:** yeni `src/components/kasa/BakiyeDuzeltPenceresi.jsx`; `Kasa.jsx` (başlık düğmesi ve ibare, kilit, kayıt, satır, silme
  onayı, iz, hesapsız liste), `kasa/HesapSilPenceresi.jsx`, `settings/SettingsTrash.jsx`, `settings/SettingsAuditLog.jsx`.
- **Testler:** `kasa-duzeltme-0151` (S), `kasa-duzeltme-0151-kiyas` (K, `0151-once.json`), `ui/kasa-duzeltme-0151` (U),
  `ui/kasa-duzeltme-0151-yedek` (A: gerçek geri yükleme + sunucu denetimi), `server-authz` 0151 bloğu, `db-roundtrip.cjs`,
  `server-security.cjs`; "spec 0151 ile" `cop-kutusu-0078` (tür haritası).

## 2. Adım sırası

1. Kıyas altını spec öncesi koddan. 2. Motor ve saf testler. 3. Veri ve sunucu (Electron dahil). 4. Ekran. 5. Tam doğrulama ve
mutasyon. 6. Kanıt. 7. Belgeler.

## 3. Kararlar (hepsi 2026-11-20'de onaylandı)

| No | Konu | Karar |
|---|---|---|
| P1 | Kartta yön | `giren` bakiyeyi artırır (kartta borcu azaltır); ekran "borç azalır / artar". |
| P2 | Kayıt anında yeniden hesap | En son çizimin verisiyle `duzeltmePlani` yeniden çağrılır. |
| P3 | Hesabı bulunamayan düzeltme | Hesapsız listede yalnız "Sil"; hesap atama ve kapsam dışı yok. |
| P4 | Hedef girdisi | Kuruşlu tutar alanı; kartta mutlak değer borç. |
| P5 | Kasa sekmesi şartı | `KASA_SEKMELI_HAREKETLER`. |
| P6 | Deneme dönemi taşıma | Var olan istisna kapsar; ek kod yok. |
| P7 | Satır açıklaması | Tür adı, yön, açıklama; rapor açıklama basmaz. |
| P8 | Kart başlığı ibaresi | Düzeltme sayısıyla. |
| P9 | Kanıt eşlemesi | Değişen Kasa ve çöp ekranları "değişti" + onay, kapanışta "aynı". |
| P10 | Uçtan uca | Üç kullanıcı: Kasa'sız (403), kasa_hesap'sız (403), kasa_hesap'lı ödemesiz (200). |

## 4. Kriter ↔ test

S = saf, K = kıyas, U = ekran, A = geri yükleme, E = Electron, SA = `server-authz`.

| AC | Test |
|---|---|
| 1, 2, 3, 4 | S + U |
| 5, 6, 7 | S + U (Kasa silme, Çöp Kutusu geri alma) |
| 8, 9, 10 | S (çapraz) |
| 11 | S + U |
| 12 | S |
| 13, 14, 35 | S + U |
| 15, 32 | S + U |
| 16, 41 | U + SA + E |
| 17, 18, 40 | SA + E (+ U, AC-40) |
| 19, 48 | U |
| 20, 50, 51 | S |
| 21 | U |
| 22, 46 | K (+ S, U) |
| 23 | S (tarama) + E |
| 24 | E (`db-roundtrip`) + K |
| 25, 26, 27, 28, 29, 30 | S + U |
| 31, 33, 34, 36, 37, 38, 39 | U (+ S) |
| 42, 49 | U (+ S) |
| 43 | U |
| 44 | A |
| 45, 47 | S + U |
| 52 | S (tarama) |

## 5. Uygulamada verilen kararlar

| No | Konu | Karar |
|---|---|---|
| P11 | Düzeltmesiz çıktının korunması | `hareketOzeti.duzeltme`, `hesapsizOdemeler.duzeltmeAdet`, `hesapsizOzeti.gizli.duzeltme`, `hesapKullanimDetayi.duzeltme` ve rapor nesnesinin `kasa.duzeltmeler`'i yalnız düzeltme varken döner; düzeltmesiz veride motor, rapor nesnesi, rapor HTML'i, çöp etiketi ve yedek yardımcısı spec öncesi altınla birebir (`0151-once.json`, 0059 verisi). Rapor şablonundaki tablo, boş satır bırakmasın diye HAREKETLER tablosuyla aynı satıra yazıldı. |
| P12 | AC-44'ün ölçümü | Gerçek `SettingsBackup` geri yüklemesinin ürettiği hareket dizisi sunucunun `eylemDenetimi`'nden Kasa'sız izinle geçirilir; korumasız (yedek aynen) hâlin reddedildiği de aynı testte gösterilir (`ui/kasa-duzeltme-0151-yedek`). |
| P13 | Ters çevrilen test | `cop-kutusu-0078` AC-6'nın tür haritası beşinci türle ("spec 0151 ile"). Başka eski test kırılmadı; sözlükte bir dosya:satır atfı kaydı (`Kasa.jsx:635`). |
| P14 | Mutasyon | Sunucu eşlemesi kaldırılınca `server-authz` 0151'in ikisi, bakiye kolu ve yedek koruması kaldırılınca 0151 testlerinin yirmisi kırıldı. |
| P15 | Kanıt | Eski kodun iki çekiminde çek ekranları 96–384 piksel oynuyor (rapora alınmadı). Bilinçli değişen: hesap seçili her Kasa ekranı (başlıktaki düğme, ~3.000 piksel), yeni yedi ekran. `kasa-0073-odeme-duzenle` ve `-virman-duzenle` adımları eski kodda da hedefsiz (bilinen borç). Eşlemede eski kayıtlar korunur, değişen ekranlara 58 "değişti" kaydı eklendi. |
