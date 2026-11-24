# 0160 Uygulama planı: Yedek parça kodu, ölçüsü ve cinsiyle bulunur

| | |
|---|---|
| **Spec** | `specs/done/0160-parca-arama-kod-olcu-cins.md` (Onaylandı, 2026-11-24) |
| **Onay** | Takım Yöneticisi, 2026-11-24 ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0160-parca-arama` (main `b5536882` üstünde) |
| **Durum** | Tamamlandı (commit `b2a2819b`) |

## 1. Dosyalar

- **`src/lib/parcaBilgi.js`:** `parcaAramaDegerleri(p)` (ad, İngilizce ad, kod, ölçü, hammadde, cins; kırpılmış, dolu), `parcaAramaSatiri(p)` (kod + `parcaBilgiDegerleri`, " · "), `parcaNedenBasliklari(p)`, `parcaNedenAlanlari(p)` (P2). Yaprak kalır.
- **`src/lib/analiz.js`:** parça satırına `partId` (ham, kimliksizde `null`; R4/5).
- **`src/components/ui.jsx`:** `SearchPick` `aramaDegerleri` ve `getAlt` (isteğe bağlı), `SearchSelect` seçenek anahtarları `ara` ve `alt`, `AramaAltSatir` (P3); verilmeyince HTML birebir eski (P4).
- **`src/components/documents/KalemSecPenceresi.jsx`:** iki prop'u iletir.
- **On kutu:** `PartManager.jsx` (liste `searchFn`, bileşen seçicisi), `stock/PartStokTab.jsx` (liste araması, hücre alt satırı P7, `SearchSelect` seçenekleri), `ServiceForm.jsx`, `YedekParcaSatisForm.jsx` (iki kutu, etiketten kod çıkar, P5), `Documents.jsx` (etiketten kod çıkar), `ModelsManager.jsx`, `Analiz.jsx` (katalog haritası P8, satır yapısı R4/4).
- **`src/components/GlobalSearch.jsx`:** yardımcıları çağırır (R1/5, P2).
- **Testler:** `parca-arama-0160` (saf, motor, taramalar), `ui/parca-arama-0160` (on kutu, R7 kutuları, kayıt listeleri), `ui/parca-arama-0160-kiyas` (spec öncesi altın `0160-once.json`), `parca-arama-yerlesim-0160` (Electron); `0160-veri.js`, `0160-ayikla.js`; güncellenenler "spec 0160 ile".
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` (dolu fikstür, kutuların ekranları), `docs/evidence/kanit-eslemesi.json` (P9), rapor ve taban.
- **Belgeler:** `CLAUDE.md`, `specs/README.md` (X1, X4, X8 açık bulgu), `docs/tasarim-sozlugu.md`.

## 2. Adım sırası

0. Spec öncesi altın (kod değişmeden; yapıldı). 1. Saf yardımcılar. 2. Motor ve 0121 kıyası. 3. Ortak bileşenler (önce R7 testi, sonra 0122 güncellemesi). 4. Liste ekranları, seçiciler, Analiz. 5. Genel arama. 6. Taramalar. 7. Electron yerleşim testi. 8. Kanıt. 9. Belgeler, tam takım, lint.

## 3. Kararlar

Spec'te P1–P12 (plan turu).

## 4. Kriter ↔ test

`P` = `tests/parca-arama-0160.test.js`, `K` = `tests/ui/parca-arama-0160-kiyas.test.jsx`, `U` = `tests/ui/parca-arama-0160.test.jsx`, `E` = `tests/parca-arama-yerlesim-0160.test.js`.

| Kriterler | Test |
|---|---|
| AC-1–AC-5, AC-7, AC-8 | U (katalog listesi) |
| AC-6, AC-30, AC-33 | K |
| AC-9, AC-10, AC-27 | U (Parça Stoğu) |
| AC-11–AC-13 | U (servis formu) |
| AC-14, AC-15 | U (yedek parça satış formu) |
| AC-16, AC-17, AC-63 | U (Evrak'ın penceresi) |
| AC-18 | U (bileşen seçicisi) |
| AC-19 | U (model kartı) |
| AC-20, AC-21, AC-51–AC-53, AC-55, AC-56 | U (Analiz) |
| AC-22–AC-25, AC-49 | P (saf), U |
| AC-26, AC-44, AC-45 | U |
| AC-28, AC-50, AC-64 | U |
| AC-29 | U |
| AC-31, AC-59 | U |
| AC-32 | E |
| AC-34, AC-65 | `parca-bilgi-0158` dokunulmadan + P |
| AC-35 | P ve U (genel arama) |
| AC-36, AC-54 | P (motor), `set-icerigi-0121-kiyas`, `ui/parca-musteri-kirilimi-0154-kiyas` |
| AC-37, AC-39, AC-40, AC-48, AC-57, AC-62 | P (taramalar) |
| AC-38 | 0149'un iki taraması dokunulmadan |
| AC-41–AC-43 | U (Stok'un seçicisi) |
| AC-46, AC-47 | P, U |
| AC-58 | U (iki kayıt listesi) |
| AC-60, AC-61 | `kanit-eslemesi`, kanıt aracı |
| AC-66 | `ui/set-aramasi-0122` |
