# 0127 uygulama planı — Servis formu çıktısında ve Excel'inde kalıbın dönüşü

Spec: `specs/0127-servis-ciktisinda-kalip-donusu.md` (QA turu Karar 1–15, plan turu Karar 16–25, uygulama Karar 26–27). Dal `feat/0127-kalip-donusu`,
taban `037dbe80`. Yeni kalıcı alan, veri bölümü, izin, sunucu ya da birleştirme kuralı yok.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kalipTamiri.js` | `kalipListesiMetni`, `kalipDonusuParcalari` (saklı alan kapısı), `kalipDonusuMetni(servis, teslimMetni)`. |
| `src/lib/printTemplates.js` | `kalipDonusuLabel` (TR "Kalıbın Dönüşü", EN "Mold Return"); kalıp satırının ardına yeni satır; kalıp satırı `kalipListesiMetni`'ne bağlanır. |
| `src/components/settings/SettingsTranslations.jsx` | Servis "Bilgi Tablosu" grubunda yeni anahtar. |
| `src/components/settings/SettingsExport.jsx` | Saf `SERVIS_EXPORT_HEAD` / `servisExportRow`; altı sütun tevkifat bloğunun önünde. |
| Testler | Yeni `tests/kalip-donusu-0127.test.js`, kıyas `tests/ui/kalip-donusu-0127-kiyas.test.jsx` ve verisi `tests/fixtures/0127-veri.js`, altın `tests/fixtures/0127-cikti-once.json` (spec öncesi kod, `YAZ_0127=1`); `ceviri-kapsam`, `print-templates` ek blokları; "spec 0127 ile" `ui/ucretsiz-yedek-parca-0095-kiyas`, `ui/ihrac-kayitli-0114-kiyas`. |
| Kanıt | `ayarlar-ceviri` taban ve sonra çekimi: 0 piksel, yeni kayıt gerekmedi (Karar 26). |
| Belge | `CLAUDE.md`, spec, bu plan; `specs/README.md` satırı kapanışta. |

## 2. Adım sırası

1. R13 ölçümü (plan turunda yedekten yapıldı). 2. Altın fikstür spec öncesi kodla (çıktı HTML'leri, etiket verisi, Excel satırları).
3. Kanıt tabanı. 4. `kalipTamiri`. 5. `printTemplates`. 6. Çeviriler ekranı. 7. `SettingsExport` (önce çıkarma, altınla ölç; sonra
sütunlar). 8. Testler, iki ters çevirme, mutasyonlar. 9. Sonra çekimi, belgeler, tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

Spec'te Karar 16–25: iki çeviri ad alanı; sütun sırasıyla karşılaştıran iki kıyas; teslim şeklinin her zaman basılması; Excel'in
aynı kapıdan geçmesi; saf satır fonksiyonu; yardımcı adları; latinize edilmeyen adlar; `gecerliGun`; ölçüm; altının içeriği.

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC‑1, AC‑15 | `kalip-donusu-0127`: satır biçimi ve konumu |
| AC‑2, AC‑14 | Aynı dosya: altınla iki dilde birebir (kalıpsız, kalıplı sevksiz, tevkifatlı, dış servis) |
| AC‑3 | Yalnız kişi → "Kargo · kişi", ayraç kalıntısı yok |
| AC‑4 | Fabrika Teslim TR/EN; değer anahtarı kümesi değişmedi |
| AC‑5 | Geçersiz/boş tarih basılmaz, servis tarihine düşülmez |
| AC‑6 | `ceviri-kapsam` |
| AC‑7 | `print-templates`: kullanıcı çevirisi |
| AC‑8 | Tarama: yardımcı imzası, şablonda birleştirme yok, `transPlace`/`PLACE_KEY_MAP` dışa verilmemiş |
| AC‑9, AC‑16, AC‑17 | `servisExportRow`: başlıklar, sıra, 31 sabit sütun, ihraç yok, `fmtTR`, ham teslim |
| AC‑10 | Kalıplı/kalıpsız/sevksiz satırlar |
| AC‑11 | İlk 25 sütun ve tevkifat hücreleri spec öncesi Excel altınıyla birebir |
| AC‑12 | `tamirEtiketVerisi` altınla aynı |
| AC‑13 | Tarama |
| AC‑18 | Servis ad alanı iki satırda; makina raporu değişmez |
| AC‑19 | Spec ölçüm 14 |
