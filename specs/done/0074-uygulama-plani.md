# 0074 Uygulama Planı: SGK Kendi Gider Türü

| | |
|---|---|
| **Bağlı spec** | `specs/done/0074-sgk-kendi-gider-turu.md` (R2, plan onayıyla) |
| **Dal** | `feat/0074-sgk-turu` (`feat/0072-gider-dagitim` `17f8256` üstünde, R32) |
| **Onay** | Takım Yöneticisi, 2026-10-07: bütün öneriler (S1–S12) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- **R25 dayanağı ölçüldü (S2):** son yayın v3.43.0 (`25ce74e`, GitHub "Latest"); `git show 25ce74e:src/lib/gider.js` içinde
  `HEDEF.SGK` ve `sgkTutar` 0 kez geçer, `14b74b4` (0070) main'de değildir. Yerel depoda `v3.43.0` etiketi yok, ölçüm
  commit üstünden. Göç yazılmaz.
- `GiderForm` KDV ve tedarikçi alanlarını `dav !== PERSONEL` ile açıyor (yedi yer), tanım formu dört yerde; SGK bu
  kapılardan normal gibi geçerdi (S3 → R33).
- `hesaplaGiderRaporu`'nun tedarikçi kırılımı personeli dışarıda bırakıyor, SGK'yı bırakmıyor (S4 → R19 revizyonu, AC-47).
- `tekrarlayanUret` personel kalemine kartın `sgkMaliyet`'ini kopyalıyor; normal dalı tanımda oran yoksa tarih oranını
  alıyor (S5 → R34, AC-48).
- `mahsupDogrula` personel dışını kendi metniyle reddediyor; SGK denetimi önce gelmezse SGK metni görünmez (S6).

## 2. Dosyalar

- Motor: `src/lib/gider.js`, `src/lib/odemeYontemi.js`, `src/lib/formOdemesi.js`, `src/lib/kasa.js`,
  `src/lib/acikKalemler.js`, `src/lib/odemeHatirlatma.js`, `src/lib/giderRaporu.js`, `src/lib/kilitAlanlari.js`;
  silinen `src/lib/sgkOdeme.js`.
- Arayüz: `src/components/GiderForm.jsx`, `src/components/settings/SettingsGiderTanimlari.jsx`,
  `src/components/gider/GiderAlanlari.jsx`, `src/components/settings/GiderTurManager.jsx`,
  `src/components/gider/DonemRaporu.jsx`, `src/components/Giderler.jsx`, `src/components/CalisanManager.jsx`,
  `src/components/gider/OdemeGirisi.jsx`; silinen `src/components/gider/SgkToplamOdeme.jsx`.
- Testler: yeni `tests/sgk-turu-0074.test.js`, `tests/ui/sgk-turu-0074.test.jsx`, `tests/gider-kasa-raporu-0074.test.js`;
  0070'in üç dosyası (S10); güncellenen `ek-odeme-hedefi`, `gider-kasa-raporu-0059`, `gider-gizlilik`, `ui/gider-ek-odeme`,
  `ui/gider-form`, `ui/gider-perdesi`, `ui/tahsilat-hesap`, `db-roundtrip.cjs`, `db-clean-install.cjs`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0074-*`.
- Belgeler: `CLAUDE.md` 0070 bölümü; `specs/done/0070-uygulama-plani.md` §7'ye yönlendirme satırı (R36).

Sunucu, izin, `merge.js` ve DB şeması değişmez.

## 3. Kararlar

S1 → R32 · S2 → R25 · S3 → R33, AC-45 · S4 → R19, AC-47 · S5 → R34, AC-48 · S6 → R22, AC-28 · S7 → R35 ·
S8, S9 → R36 · S10 → R18 · S11 → R2 · S12 → R14.

## 4. Adım sırası

1. Dal, taban çekimi ayrı çalışma ağacından (`17f8256`); çekim sürerken test koşulmaz.
2. `gider.js` (kapılar, SGK davranışı, 0070 hedef mekanizmasının silinmesi, borç özeti, tedarikçi kırılımı, `sgkOzeti`,
   tekrarlayan üretim) ve motor testleri.
3. Diğer kitaplıklar; `sgkOdeme.js` silinir.
4. Arayüz; `SgkToplamOdeme` ve kilit kaydı silinir.
5. Eski testlerin yeniden yazımı (yol parası blokları değişmeden), veritabanı testleri.
6. Görüntü aracı, kanıt eşlemesi; tam takım, Electron testleri, lint; görsel kanıt, `CLAUDE.md`, sürüm notu.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–5 | `ui/sgk-turu-0074` (tür yöneticisi) + `tema-degisken` |
| AC-6–9 | motor + ui |
| AC-10–12 | motor + ui + kaynak taraması |
| AC-13, 14, 36, 48 | motor + ui |
| AC-15, 46 | motor + ui + kaynak taraması |
| AC-16, 37 | motor + kaynak taraması |
| AC-17, 18, 19, 38, 39 | motor + ui |
| AC-20, 40, 41 | kaynak taraması + ui + `tasarim-kaynak`, `kanit-eslemesi`, `kilit-alanlari` |
| AC-21, 22, 23, 24, 27, 47 | motor (+ ui AC-47) |
| AC-25, 26, 42 | `gider-kasa-raporu-0074` + 0059 altın dosyaları |
| AC-28, 43 | motor + ui |
| AC-29, 30, 44 | `gider-gizlilik` + ui |
| AC-31, 32 | kaynak taraması + motor |
| AC-33 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-34, 35, 45 | kaynak taramaları |

## 6. Uygulama notları

- **Taban:** ayrı çalışma ağacından (`17f8256`), üç parçada; sonra çekimi aynı parçalarla.
- **0070 testleri (S10):** `calisan-sgk-0070` ve `ui/calisan-sgk-0070` yalnız yol parası bloklarıyla kaldı, silinen her SGK
  bloğunun 0074 karşılığı dosya başında yazılı; `gider-kasa-raporu-0070` silindi (yerini `gider-kasa-raporu-0074` aldı).
- **Gizlilik testi:** `gider-gizlilik` 0070 bloğunun fikstürü SGK davranışlı tek kaleme çevrildi; personel kalemine verilen
  eski `sgkTutar` değerleri (4.111, 5.222) yok sayılıp hiçbir yerde basılmadığı da sınanıyor. `YASAKLI` aynen (AC-44).
- **Tekrarlayan üretimde atama (R8):** tanım formu davranış değişince atamayı temizliyordu (0072) ama motor korumuyordu;
  `tekrarlayanUret` atanamayan davranışta tanımın atamasını kaleme taşımaz (sgk-turu AC-48 bloğu).
- **Veritabanı (AC-33):** şema değişmedi; `db-roundtrip.cjs` ve `db-clean-install.cjs`'e SGK türü ve SGK kalemi eklendi.
  0070'in `sgkTutar` sütun denetimleri yerinde (sütun şemada durur, eski veri okunur, R2).
- **Görüntü aracı:** 0070'in üç ekranı SGK kalemiyle yeniden kuruldu, `giderler-0070-sgk-odeme` silindi; yeni ekranlar
  `ayarlar-gidertur-0074`, `gider-formu-0074-sgk`, `gider-formu-0074-sgk-oneri`, `ayarlar-gidertanim-0074-sgk`,
  `giderler-0074-sgk-odeme` (ayrı `TURLER_0074`; mevcut ekranların tür listesi değişmesin diye ortak `TURLER`'e eklenmedi).

### Kullanıcı rehberinde değişmesi gereken yerler (R35, analist uygular)

`docs/rehber/gider-kasa-kurulum.html`:
- Satır 94: "Çalışanların aylık resmi (SGK dâhil) ve elden ödenen tutarları" → SGK artık ayrı gider kalemidir; resmi
  tutar SGK içermez, aylık SGK bildirgesinin toplamı ayrı bir SGK kalemiyle girilir.
- Satır 183–188 (davranış tablosu): "SGK" davranışı eklenir: tek tutar, KDV ve tedarikçi yok, makinaya atanmaz, kendi
  kalemiyle ödenir; tekrarlayan tanımla her ay sıfır tutarla üretilip bildirge gelince tutar girilir.
- Satır 192–194 (önerilen türler): listeye "SGK" eklendi; "Sosyal güvenlik (Bağkur)" şirket sahibinin primi olarak normal kalır.
- Satır 235: "Resmi işveren maliyeti (SGK dâhil)" → "Resmi işveren maliyeti"; SGK alanı yalnız aylık SGK kaleminin
  önerisidir ("Çalışanların SGK toplamını kullan").

## 7. Sürüm notu (R36)

> **SGK artık ayrı bir gider türü.** Ayarlar › Giderler › Gider Türleri'nde "SGK" davranışlı bir tür açın (Önerilen
> türleri ekle onu da getirir). Her ayın SGK'sı bu türde tek kalem olarak girilir ve diğer giderler gibi kendi
> kaleminden ödenir; tekrarlayan tanım kurarsanız kalem her ay tutarsız doğar, bildirge gelince tutarı girersiniz.
> Gider formundaki "Çalışanların SGK toplamını kullan" düğmesi çalışan kartlarındaki SGK tutarlarını toplar. Personel
> kaleminin tutarı SGK içermez. **Önce sunucu bilgisayarını, sonra bütün istemcileri güncelleyin.**
