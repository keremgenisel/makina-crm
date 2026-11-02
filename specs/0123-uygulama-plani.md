# 0123 uygulama planı — Sette ve kitte geçen parça silinirken koruma

Spec: `specs/0123-set-bileseni-silme-korumasi.md` (plan turu Karar 34–42, uygulama Karar 43–45). Dal `feat/0123-set-silme`, taban
`9ecb2ed`. Salt koruma işi: yeni kalıcı alan, veri bölümü, izin, sunucu ya da birleştirme kuralı yok.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/urunAgaci.js` | `setteGecenParcalar`, `parcaKullanimi`, `setteGecenParcaMi`, `setKullanimAdlari`, `parcaKullanimMetni`, `SETTE_PARCA_NEDENI`, `SETTE_PARCA_RED_METNI`; `adListesi` dışa verildi. `parcayiIcerenSetler` ve `parcaKitAdetleri` gövdeleri aynı. |
| `src/components/PartManager.jsx` | Silme onayının `message`'ı bugünkü cümle + `parca-kullanim` satırı (ham diziden, onay başına bir kez). |
| `src/components/settings/SettingsTrash.jsx` | İki harita (bütün / kalacak), `purgePart` reddi, parça satırında `neden`, "çöpü boşalt" korunanları bırakır. |
| `src/App.jsx` | Otuz günlük temizliğin `koru`'su süpürmeden önceki `data.parts`'tan. |
| Testler | `tests/set-silme-0123.test.js`, `tests/ui/set-silme-0123.test.jsx`. |
| Kanıt | `scripts/evidence/0009-sayfa.jsx` iki ekran, `docs/evidence/0123-*`, eşleme kayıtları. |
| Belge | `CLAUDE.md`, spec, bu plan; `specs/README.md` satırı kapanışta. |

## 2. Adım sırası

1. Çalışma kopyası, kurulum, R9 ölçümü (Karar 34). 2. Taban kanıtı. 3. Saf yardımcılar ve testleri. 4. Dört kapı ve ekran testleri.
5. Mutasyonlar. 6. Sonra çekimi, eşleme, taban raporu. 7. Belgeler, tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

Spec'te Karar 34–45: R9 ölçümü; R1/7 çelişkisi; çöpteki setin eki; set adları yardımcısı; ret metni; AC-15'in satır metni;
otuz günlük temizliğin gerçek App testi; kanıt ölçümü; ters çevrilen kriter taraması; 0096'nın düğmesinin gerçek hâli.

## 4. Kriter ↔ test eşlemesi

`saf` = `tests/set-silme-0123.test.js`, `ekran` = `tests/ui/set-silme-0123.test.jsx`.

| AC | Test |
|---|---|
| 1, 2, 3, 4, 22 | ekran "AC-1 / AC-22", "AC-22 (R3/6)", "AC-3 / AC-22", "AC-2 (Karar 30)", "AC-4"; saf "AC-22" (iki blok) |
| 5, 12, 18, 26, 27 | ekran "AC-5 / AC-12 / AC-18 / AC-26 / AC-27"; saf "AC-26 / AC-27 (metin)", "AC-27 / R4/5", "AC-17 / AC-18 / C5" |
| 6 | ekran "AC-6" |
| 7, 20 | ekran "AC-7 / AC-20" |
| 8, 21 | ekran "AC-8 / AC-21" (gerçek App); saf "AC-21" (iki tur), "AC-21 / AC-32" |
| 9, 19, 25 | ekran "AC-9 / AC-19 / R7"; saf "AC-19 / AC-25", "AC-19" (tarama) |
| 10, 11 | saf "AC-10 / AC-11 / AC-26" |
| 13, 28, 29, 33 | saf "AC-13 / AC-28 / AC-29 / AC-33" + kapanışta `git diff --stat` |
| 14, 16, 34 | saf "AC-14", "AC-16", "AC-34" |
| 15 | saf "AC-15" (casus), "AC-15 (Karar 39)" |
| 17 | saf "AC-17 / AC-18 / C5" |
| 23 | saf "AC-23"; `tests/urun-agaci-0087.test.js` ve 0121 testleri dokunulmadan |
| 24 | saf "AC-24" |
| 30 | saf "AC-30"; maliyet testleri dokunulmadan |
| 31 | spec Karar 34 |
| 32 | saf "AC-21 / AC-32" |

## 5. Ölçümler

- **R9 (Karar 34):** 01.11.2026 yedeği: 380 parça, 380 canlı, çöpte 0, içerikli 0, 22 canlı modelde 1.436 kit satırı, 135 ayrı parça.
- **Mutasyonlar:** kapı yalnız `set`'e bakınca AC-9/19/21 ve gerçek App kırıldı; onay canlı diziyle kurulunca AC-22 (R3/6) ve tarama; App `koru` kaldırılınca AC-8/21; "çöpü boşalt" bütün haritayı kullanınca AC-7/20; kendine atıf atlanmayınca AC-14/34; `purgePart` kapısı kaldırılınca AC-5/9/27. Hepsi test kırdı.
- **Kanıt (Karar 45):** var olan sekiz ekran 0 piksel; iki yeni ekran; taban son kodla 20 görüntüde 0 fark.
- **Ters çevirme (Karar 44):** yok; 0108'in eşleme testi yüzünden `ayarlar-cop-0108-uretim` eşlemeye eklenmedi.
- **Takım:** `npm test` 457 dosya, 6296 test yeşil; `npm run lint` 0 hata. İlk koşuda tek kırılan 0108 eşleme testiydi (Karar 44).

## 6. Triyaj düzeltmeleri (2026-11-02)

1. "Çöpü boşalt" bildirimi bırakılan parçaları sayar (Karar 46, `setteBirakilanEki`); ek kaldırılınca ekran testi kırılıyor, bırakılan yoksa bugünkü metin.
2. Yinelenen içerik satırı tek sayılır: saf test; `gorulen` denetimi kaldırılınca kırılıyor (Karar 47).
3. Taban raporu son kodla yenilendi (20 görüntü, 0 fark); 0108 notu ve README kapanışta.
