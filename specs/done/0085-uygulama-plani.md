# 0085 Uygulama Planı: İstemci sürümü görünür olur

Spec: `specs/done/0085-istemci-surumu-gorunur-olur.md` (revizyon 3). Tamamlandı: commit `27d294e`. Dal `feat/0085-istemci-surumu` (taban `7768968`).

## 1. Kodda bulunanlar (spec'e ek, revizyon 3'e işlendi)

- **P1.** Görüntü aracında `ayarlar-server` sunucu kipinde çizilmiyor (`window.appServer` yok; ekran "yalnızca
  Electron uygulamasında" kutusu, `docs/evidence/0062-ayarlar-server-aydinlik.jpg`). Kartın kanıtı yeni
  `ayarlar-server-sunucu` ekranı; `ayarlar-server` 0 fark.
- **P2.** Sunucu kurulum akışı (`server:setupAdmin`, `electron/ipc/data.cjs:514`) `authenticateLogin`'i
  `ip: "127.0.0.1"` ile çağırıp başlıksız `giris_basarili` yazıyor. Özet geri döngü satırlarını atlar.
  Sunucu PC'nin diğer HTTP istekleri (`server:apiRequest`, yönetici jetonu, `data.cjs:474`) `/auth/login` ya da
  `/auth/me` değil; kayıt üretmez. Sunucu PC'de `server:refreshToken` `cfg.token` olmadığı için çalışmaz.
- **R4 taraması:** düz `"x.y.z"` araması tarihleri (`SettingsImport.jsx:322`), GTİP kodunu
  (`FaturaFormModal.jsx:97`) ve `utils.js:491`'in yorum örneklerini buluyor. Desen yorumları atar ve
  `["'`]v?\d{1,2}\.\d{1,3}\.\d{1,3}["'`]` kullanır (bugün yalnız `APP_VERSION` satırı).
- Sabit modülü `electron/istemciSurum.mjs`: `kasaGocuSaf.mjs` emsali (`db.cjs` `require(esm)`, `SettingsBackup`
  doğrudan içe aktarır).

## 2. Kararlar (TY onayı, 2026-10-14)

P1 yeni kanıt ekranı; P2 geri döngü satırları atlanır; P3 satır anahtarı kullanıcı adı; P4 rozet Eylem
hücresinde düz öğe, boş sürümde metinler hiç çizilmez. Ayrıntı spec'in "Plan onayı kararları" tablosunda.

## 3. Dosyalar

**Yeni:** `electron/istemciSurum.mjs` (başlık ve alan sabitleri, `istemciSurumKirp`, `surumBasligiEkle`),
`src/lib/surumOzeti.js` (saf özet), `src/components/settings/BagliBilgisayarlar.jsx` (kart); testler
`tests/surum-gorunurlugu-0085.test.js`, `tests/ui/surum-gorunurlugu-0085.test.jsx`.

**Kaynak:** `src/lib/constants.js` (`APP_VERSION` silinir), `src/lib/utils.js` (`surumDahaYeni` kapısı),
`src/App.jsx` (boş başlangıç, kenar çubuğu ve şerit kapısı), `src/components/settings/SettingsApp.jsx`,
`src/components/Settings.jsx` (`version` → `SettingsServer`), `src/components/settings/SettingsServer.jsx`
(kart), `src/components/settings/SettingsSecurityLog.jsx` (rozet, CSV), `electron/ipc/data.cjs`
(`clientFetch` ve giriş isteği), `electron/server.cjs` (giriş, `/auth/me`, `veri_kaydedildi`).

**Testler ve araçlar:** `scripts/tests/server-security.cjs`, `scripts/tests/db-roundtrip.cjs`,
`scripts/evidence/0009-sayfa.jsx` (`ayarlar-server-sunucu`, `ayarlar-guvenlik-gecmisi`),
`docs/evidence/kanit-eslemesi.json`, `tests/spec-atiflari.test.js` (`TASINACAK`), `tests/utils.test.js`
(boş sürüm satırı).

## 4. Adım sırası

1. Saf katman: `istemciSurum.mjs`, `surumOzeti.js`, `surumDahaYeni` kapısı; motor testleri.
2. Sunucu: `server.cjs` üç kayıt; `server-security.cjs` bloğu.
3. İstemci köprüsü: `data.cjs`'in iki ekleme yeri; tarama.
4. Renderer sürüm kaynağı: `APP_VERSION` silinir; App ve `SettingsApp` kapıları; yedek damgaları.
5. Ekranlar: Kullanıcı Geçmişi rozeti ve CSV; kart ve `version` prop'u.
6. Electron testleri (`db-roundtrip`, `server-security`), tam `npm test`, lint.
7. Görsel kanıt (taban worktree `7768968` + yeni araç kopyası, parçalı), `kanit-eslemesi`.
8. CLAUDE.md, `specs/README.md`, `TASINACAK`.

## 5. Kriter ↔ test

M = `tests/surum-gorunurlugu-0085.test.js`, U = `tests/ui/surum-gorunurlugu-0085.test.jsx`,
SS = `scripts/tests/server-security.cjs`, DB = `scripts/tests/db-roundtrip.cjs`.

| AC | Kanıt |
|---|---|
| AC-1, AC-6, AC-7 | M taramaları (sabit sürüm dizesi yok, `APP_VERSION` yok, testler rakam sabitlemez, `scripts/` istisnaları) |
| AC-2 | U gerçek App: köprü geciktirilir; kenar çubuğu, "Kurulu sürüm", iki şerit metni |
| AC-3 | U otomatik (gerçek App) ve elle (`SettingsBackup`) yedek damgası; 0082 taraması dokunulmadan yeşil |
| AC-4 | M `surumDahaYeni(x, "")` false; U boş sürümde şerit yok |
| AC-5 | U köprüsüz App ve `SettingsApp` |
| AC-8 | SS `veri_kaydedildi` detayı; DB iki alan birlikte; M adlar sabitten |
| AC-9, AC-10 | M `surumBasligiEkle` + tarama (iki yer); SS başlıklı giriş, veri, dosya yükleme |
| AC-11 | SS başlıksız istekte anahtar yok; U "bilinmiyor" |
| AC-12 | M `istemciSurumKirp`; SS kırpılmış başlık, yazım 200 |
| AC-13 | SS beş giriş dalı, `/auth/me`, veri yazımı; DB sütunlar aynı |
| AC-14 | M tarama; U yerel modda ek çağrı yok |
| AC-15…AC-20 | U `SettingsSecurityLog` (rozet, iki okuma yolu, neden, detay dökümü, CSV, etiket haritası) |
| AC-21…AC-29 | U `SettingsServer` sunucu/istemci kipi, sahte `securityLog`; M özet |
| AC-30 | M özet (en yeni, adsız, bozuk JSON, geri döngü) |
| AC-31 | M tarama |
| AC-32 | SS eski sürüm başlığıyla yazım 200 |
| AC-33 | `0085-piksel-raporu.json`, `0085-taban-piksel-raporu.json` |

## 6. Sapmalar ve notlar

- **AC-9 dosya ve giriş isteği:** `data.cjs` Electron ve IPC olmadan koşmadığı için başlığın dosya isteğinde gittiği
  saf `surumBasligiEkle` birimi ve kaynak taramasıyla sabitlendi (`apiFetch` ve `fileFetch` ikisi de `clientFetch`'ten geçer,
  kendi başlık eklemeleri yok). Sunucu tarafı gerçek HTTP ile ölçüldü (`server-security.cjs`).
- **AC-13 dört başarısız dal:** üçü uçtan uca ölçüldü (yanlış şifre HTTP'den; kullanıcı adı yok ve kademeli kilit
  `authenticateLogin`'e sahte IP'yle, 127.0.0.1 kaba kuvvet sayacına dokunmamak için). Yanlış 2FA dalı kaynak taramasıyla
  (dört `giris_basarisiz` satırı da `detayaSurumEkle` çağırır).
- **AC-20:** etiket haritası tabanda 29 anahtar; test sayıyı ve sürüm adlı anahtar olmadığını sabitler.
- **AC-6:** `tests/ui/standart-kalkar-0082.test.jsx` bir bileşene `version: "3.45.0"` prop'u veriyor; bu bir iddia değil,
  sürüm yükseltmesinde kırılmaz. Tarama yalnız `expect(` satırlarında paket sürümünü yasaklar.
- **Kasa göçü taraması:** `scripts/tests/kasa-goc.cjs` R4 `server.cjs`'te `kasaGocu` adının geçmemesini istiyor; yeni modülün
  açıklama yorumu bu yüzden göç çekirdeğinin adını anmaz.
- Mutasyonla ölçüldü: kenar çubuğu kapısı, `surumDahaYeni` boş sürüm kapısı, geri döngü atlaması ve eski sabit başlangıç
  değeri kaldırılınca testler düşüyor.
- **Görsel kanıt (AC-33):** taban `7768968` (yeni araç kopyasıyla) ↔ bu iş, 678 görüntü, çizim hatası yok. Bilinçli değişen:
  beş `uygulama-menu-*` ekranı (kenar çubuğundaki eski "v3.42.0" kalktı), `ayarlar-server-sunucu`, `ayarlar-guvenlik-gecmisi`.
  **`uygulama-menu-dar` 0 fark:** dar kipte kenar çubuğu sürüm yazısını zaten çizmiyor; spec C7 "altı" diyordu, ölçüm beş.
  `ayarlar-server`, `ayarlar-server-istemci`, `ayarlar-app` 0 fark.
- **`ayarlar-app` ilk çekimde 175 piksel fark verdi:** "Kurulu sürüm" cümlesi koşullu yazılınca devam metni ayrı bir DOM metin
  düğümüne bölünmüş, birleşim yerinde harf aralığı değişmişti. Devam cümlesi tek düğüm olarak basılınca 0 fark.
- **Gürültü:** on form/detay ekranı (`evrak-*`, `bayi-formu`, `servis-formu`, `makina-stok-formu`, `not-formu`,
  `katalog-model`, `musteri-detay`, `ayarlar-company-acik`) ilk taban çekimine göre 58–249 piksel farklıydı; taban kodun
  ikinci çekimi aynı farkı verdi (bu işten değil). Bu ekranların tabanı ikinci çekimle alındı, dal çekimi 0 fark.
  `uygulama-menu-kasali` aydınlık ilk dal çekiminde kenar çubuğunun altında 31 piksellik geçici çizim gösterdi; yeniden
  çekildi. Taban raporu (değişen 7 ekran bugünkü kodla) 0 fark.
- **Triyaj (2026-10-14):** (1) sunucunun kendi sürümü bilinmezken sürümü bilinen satır `karsilastirilmadi` durumundadır,
  "hepsi güncel" şeridi çizilmez (`surumOzeti` `karsilastirildi`); (2) README sıra cümlesi "0085 uygulanıyor, sonra 0086";
  (3) commit kapsamı: README'nin 0086 satırı ve "Sonra 0086" satırı analistin 0086 commit'ine kalır, 0085 commit'ine
  parça sahnelemeyle girmez; `docs/rehber/` ve `scripts/rehber-pdf.cjs` commit dışında. Koruma: `spec-durumlari` README
  tablosundaki her 0070+ satırın spec dosyasını ister.
