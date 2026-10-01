# 0056 Uygulama Planı: Deneme Döneminde Kasa Hesaplarının Silinebilmesi

| | |
|---|---|
| **Bağlı spec** | `specs/0056-deneme-doneminde-hesap-duzenleme.md` (R2, plan onayıyla) |
| **Dal** | `feat/0056-deneme-donemi` (`feat/0058-kapsam-disi` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q7) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Taşıma yalnız `yazmaYetkisiVar`'a değil `eylemDenetimi`'ne de takılır: hareket düzenlemesi türünün iznini, verilen çek
  `gider_odeme` ister (R14 ile R15 çelişkisi; R25 ile çözüldü).
- `hesapKullanimi` satış/müşteri tahsilatında yalnız canlıları sayar; taşıma tam diziler üzerinde çöptekileri de taşır (R27).
- Para birimi kilidi ve serbest açılış bakiyesi bugün de var (AC-15, AC-16).

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kasa.js` | `DENEME_DONEMI_VARSAYILAN`, `denemeDonemiBitisi`, `denemeDonemiAcik(ayar, bugun)`, `hesapKullanimDetayi`, `hesapTasimaPlani`; `hesapKullanimi` aynen. |
| `src/components/kasa/HesapSilPenceresi.jsx` | Yeni: sayım, iki yol, hedef seçici, nedenler, R21 cümlesi; `wide`. |
| `src/components/Kasa.jsx` | Deneme ibaresi, dönem kapılı silme, tek işleyicide taşıma, R13 ipucu, işlem geçmişi, `setPayments` prop'u. |
| `src/App.jsx` | Kasa'ya `setPayments`. |
| `src/components/settings/SettingsGider.jsx` | Deneme dönemi bitiş tarihi alanı. |
| `electron/serverAuth.cjs` | `TAHSILAT_HESAP_BOLUMLERI` + `payments`, `cekler`; R25 hesap taşıma yazımı istisnası. |
| `src/components/settings/SettingsAuditLog.jsx` | `hareket_tasindi`. |
| Testler | `tests/kasa-deneme-donemi.test.js`, `tests/ui/kasa-deneme-donemi.test.jsx`; ek bloklar `server-authz`, `server-security.cjs` (`tasiyici`), `ui/gider-settings`. |
| Kanıt, belge | `0009-sayfa.jsx` üç ekran, `kanit-eslemesi.json`, `CLAUDE.md`. |

## 3. Kararlar

- **Q1 / R25.** Dar hesap taşıma istisnası, yalnız `kasa_hesap`.
- **Q2.** Pencere `wide`.
- **Q3 / R26.** Ret nedenleri kaydın adıyla, düğmeler pasif.
- **Q4 / R27.** Çöpteki kayıtlar da taşınır; sayım canlı.
- **Q5.** Ayar formu varsayılanı gösterir ve yazar; boş = kapalı; biçimsiz tarih reddedilir.
- **Q6.** 0058 ile ek iş yok.
- **Q7.** Kapı `bugun` parametreli; Kasa `useBugun`; TZ sınırı testli.

## 4. Adım sırası

1. Motor ve motor testleri. 2. Sunucu istisnaları ve testleri. 3. Gider ayarı. 4. Pencere ve Kasa, App. 5. Etiket, UI ve
uçtan uca testler, tam takım, lint. 6. Kanıt, TY onayı, `CLAUDE.md`.

## 5. Kriter ↔ test eşlemesi

M = `tests/kasa-deneme-donemi.test.js`, U = `tests/ui/kasa-deneme-donemi.test.jsx`.

| AC | Test |
|---|---|
| 1, 4 | M; `ui/gider-settings` |
| 2, 31 | U |
| 3, 27, 28 | M (TZ); U |
| 5 | M |
| 6, 13, 18 | U |
| 7, 29 | M; U |
| 8, 19 | M; U |
| 9 | U; M |
| 10, 11, 12 | M |
| 14, 30 | U; etiket taraması |
| 15, 16, 17, 32 | U |
| 20, 21 | M |
| 22 | M |
| 23 | `server-authz`; `server-security.cjs` |
| 24 | U (gerçek App) |
| 25, 26 | M |

## 6. Uygulama notları

- **Hesapsız bırakmada verilen çek de engel:** R8 hesapsız bırakmayı serbest bırakıyor ama hesapsız bir verilen çek ödendiğinde hiçbir bakiyeye ve hiçbir hesapsız listeye girmezdi (R9 ve C6 çiğnenirdi); virman gibi engellendi, neden "bir TL banka hesabına taşıyın".
- **Mevcut testler:** deneme dönemi varsayılan olarak açık olduğu için (testlerin bugünü 2027 öncesi) "hareketi olan hesap silinemez" testleri (`ui/kasa`, `ui/tahsilat-hesap`) dönem kapalı ayarla koşuldu; Gider Ayarları kaydı yeni alanı yazar (`ui/gider-settings`); R20 ile `payments` istisnaya girdi (`server-authz` 0044 Q5).
- **Dönem kapısının bugünü:** `yerelBugun` argüman almaz; TZ sınırı sahte saatle sınandı (UTC'de 31 Aralık, İstanbul'da 1 Ocak 01:30 → kapalı).
- **Sunucu kapsamı:** R25 istisnası `cekler`'de yalnız `hesapId` değişen çekte bağsız çek kuralını atlar; ciro/verilen çek doğuş kuralları aynen.
- **Triyaj (2 bulgu):** (1) Silme penceresinin kanıt kaydı yoktu (CI kırmızı): `0056-piksel-raporu.json` üretildi (33 aday kasa ekranı; 23 bilinçli fark: deneme şeridi, hareketli hesapta "Sil", genişleyen işlem sütunu, silme penceresinin iki kipi ve ret nedeni, hesap formu ipucu, Gider Ayarları tarih alanı; çek portföyü 0 piksel), kayıtlar TY onayıyla. Çekimde "N hareket" yazısının işlem sütununda kırıldığı görüldü, sütun 190 → 230 px. (2) Sunucudaki taşıma istisnası dönemden bağımsızdı: `hesapTasimaYazimiMi` artık KAYITLI blob'un `giderAyarlari`'ndan `denemeDonemiAcikSunucu` ile dönemi okur (istemciyle aynı kural; aynı yazımda ayar değiştirilerek açılamaz); testler gerçek tarihten bağımsız (açık uçlu tarih, kapalı dönem 403).
