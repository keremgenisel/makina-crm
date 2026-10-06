# 0072 Uygulama Planı: Peşin Ödenen Giderin Aylara Dağıtılması

| | |
|---|---|
| **Bağlı spec** | `specs/0072-pesin-giderin-aylara-dagitilmasi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0072-gider-dagitim` (`feat/0073-hareket-duzenleme` `ef4f18a` üstünde, R27) |
| **Onay** | Takım Yöneticisi, 2026-10-06: bütün öneriler (S1–S10) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Maliyet motorunda ortak gider kalemin kendi ayına yazılır (`ortakGercek`, `makinaMaliyeti.js`); değişikliğin tek giriş
  noktası budur. Aynı döngüdeki `sinifAy` (ay bazında kova toplamları) hiçbir ekranda okunmaz ve kalemin ayında kalır.
- Makina ve Model'in "Ortak gider" kartı maliyet motorundan değil dönem raporunun kovalarından gelir ve "dört kovanın
  toplamı = dönem toplamı" cümlesi taşır; ortak kalemlerin ham listesi yoktur (S2 → R16 revizyonu, AC-38).
- Gider formunun atama bölümü kirada çizilmez (0020); dağıtım alanı atama bölümünden bağımsızdır (S3 → R25, AC-35).
- Maliyet detayında ortak pay tek satırdır, kalem listesi yoktur (S6 → R14 revizyonu).
- `kalemKovalariKurus` çözücüsüz çağrıda makinaya atanmış kalemi ortak sayar (S5 → R20 revizyonu).
- `MakinaMaliyetDetay.jsx` tasarım sözlüğünü kullanmaz, kanıt eşlemesinde kaydı yoktur (R30).

## 2. Dosyalar

- Motor: `src/lib/gider.js` (`DAGITIM_AY_MAX`, `dagitimAySayisiCoz`, `dagitimAyOf`, `dagitimPaylari`, `dagitimAraligi`,
  `dagitimRozetMetni`; `giderKalemDogrula` normalize; `tekrarlayanUret` kopyalar), `src/lib/makinaMaliyeti.js`
  (`dagitimPayKapsami` süzgeci, dağıtımlı `ortakGercek`, ay satırında `dagitimlar`, sonuçta `dagitimVar`).
- Arayüz: `src/components/GiderForm.jsx`, `src/components/settings/SettingsGiderTanimlari.jsx`,
  `src/components/gider/GiderAlanlari.jsx` (paylaşılan `DagitimAlani`), `src/components/gider/DonemRaporu.jsx` (rozet),
  `src/components/gider/MakinaMaliyetDetay.jsx` (pay satırı, notlar), `src/components/gider/MakinaKarliligi.jsx`,
  `src/components/gider/MakinaModelGorunumu.jsx` ve `src/components/Giderler.jsx` (yeni kutu).
- DB: `electron/db.cjs` (`GIDER_DAGITIM_COLUMN`, iki tablo, dört nokta).
- Testler: `tests/gider-dagitim-0072.test.js`, `tests/ui/gider-dagitim-0072.test.jsx`; ek bloklar `gider.test.js`,
  `gider-gizlilik.test.js`, `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0072-*`, `kanit-eslemesi.json`. Belgeler: `CLAUDE.md`.

Sunucu, izin, `merge.js`, `giderRaporu.js` ve `printTemplates.js` değişmez.

## 3. Kararlar

S1 → R27 · S2 → R16, AC-38 · S3 → R17, R25, AC-22, AC-35 · S4 → R19, AC-36 · S5 → R20, AC-37 · S6 → R14 ·
S7 → R13 · S8 → R28, §7 · S9 → R29, AC-29 · S10 → R26, AC-37.

## 4. Adım sırası

1. Dal, taban çekimi ayrı çalışma ağacından (`ef4f18a`); çekim sürerken test koşulmaz.
2. `gider.js` (çözüm, paylar, doğrulama, tekrarlayan üretim) ve motor testleri.
3. `makinaMaliyeti.js`; `makina-maliyeti.test.js` dokunulmadan.
4. `db.cjs` ve iki veritabanı testi.
5. Arayüz (form, tanım, rozet, detay, notlar, Makina ve Model).
6. Tam takım, Electron testleri, lint; görsel kanıt, `CLAUDE.md`.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, 2, 3, 4 | `gider-dagitim-0072` (motor) + ui (form alanı) |
| AC-5, 21 | motor (`tekrarlayanUret`) + ui (tanım formu, ipucu) |
| AC-6 | `gider.test.js` bloğu |
| AC-22, 35, 36 | ui + motor (doğrulama temizliği) |
| AC-23 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-7, 8, 24, 25, 26, 12, 27, 28, 33 | motor |
| AC-9, 10, 11 | motor (dağıtımlı/dağıtımsız aynı veride dönem raporu, KDV, borç özeti, hatırlatıcı eşit) |
| AC-13, 37 | motor (süzgeç yardımcısı, "kalemin ayından önceye pay yok", makina boş, tek giriş) |
| AC-14 | `makina-maliyeti.test.js` dokunulmadan yeşil |
| AC-29 | mevcut C9 + dağıtımlı süre testi |
| AC-15, 16, 17, 18, 30, 31, 38 | ui |
| AC-31, 32 | `gider-gizlilik` |
| AC-19, 20, 34 | kaynak taramaları + mevcut testler |

## 6. Uygulama notları

- `dagitimPaylari` "makina atamasında boş" kuralı kesinleşti: ortak kovası sıfır olan kalemde boş liste; makina ve
  "dağıtılmasın" atamasında ay sayısı 1 sayılır. Makinası silinmiş (düşen) atamanın ortak gideri böylece bugünkü gibi kendi
  ayında kalır (C3). R20 ve AC-37 metni buna göre düzeltildi.
- Ay süzgeci (`dagitimPayKapsami`) kalemin kendi ayını her zaman tutar: gelecek tarihli dağıtımsız kalem bugün de ay
  tablosuna giriyordu; yalnız sonraki aylar içinde bulunulan aya kadar kesilir. Motor kalemin ayını, ortak kovası sıfır
  olsa da tabloya ekler (bugünkü davranış).
- Kalıcı alan blob'da 1 ya da boşken hiç yoktur (null değil); doğrulama anahtarı siler, okuma boş değeri yazmaz.
- **Triyaj bulgu 2:** App'in `makinaMaliyet` memosu `today()` (UTC) ile çağrılıyor ve tarihe bağlı değildi; R12'nin "o ay
  gelince kendiliğinden girer" sözü ay dönümünde (Türkiye'de 1'inde 00:00–03:00 arası ve uygulama açık kaldıkça) tutmuyordu.
  Memo `useBugun`'un yerel gününü alır ve ona bağlıdır; motorun yedek "bugün"ü `yerelBugun`. TZ sabitli test (0003 emsali).
- **Triyaj bulgu 1:** görsel kanıt üretildi (taban `ef4f18a` çalışma ağacından, 592 görüntü; detay ekranının adımı Ege Köfte).
- Görüntü aracında kalemler `G_0072` fikstüründe (Eylül internet, Ağustos peşin kira), sabit bugün 2026-09-23.

## 7. Sürüm notu (karışık sürüm, R28)

> **Peşin ödenen gider aylara dağıtılabilir.** Gider formunda "Maliyete dağıtım (ay)" alanı: örneğin 12 ay peşin
> ödenen internet aboneliği makina maliyetine her ay on ikide biri olarak girer. Dönem raporu, KDV ve ödeme
> değişmez; kalem gider tarihinin ayında tam tutarıyla durur. **Önce sunucu bilgisayarını, sonra bütün istemcileri
> güncelleyin;** güncelleme bitene kadar dağıtım girmeyin: güncellenmemiş sunucu alanı kaydetmez, güncellenmemiş
> istemci farklı makina maliyeti gösterir.
