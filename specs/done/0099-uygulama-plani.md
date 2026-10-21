# 0099 Uygulama Planı: hammadde kırılımının toplamı satırların altında

Spec: `specs/done/0099-kirilim-toplami-satirlarin-altinda.md` (revizyon 3). Onay: Takım Yöneticisi, 2026-10-21 (on öneri, P1–P10).
Çalışma yeri: `../wt-0099`, dal `feat/0099-kirilim-toplami`, taban `main` `250dd16`.

## 1. Ölçülen taban

- `src/components/PartManager.jsx`: `formMaliyeti(` 2 çağrı, `parcaMaliyetKurus(` 2 çağrı; `reduce(`, `+=`, `\bkurus(` sıfır.
- `kaynakKartMetni` ve `KAYNAK_KIRILIM_YETKISIZ` kaynakta yalnız `PartManager.jsx`'te, testlerde yalnız spec'in saydığı altı yerde.
- `Modal`'ın rolü ya da kimliği yok; kap `.modal-backdrop`.
- Parça listesi verildiği sırayla çizilir; kanıt aracının `baslik:Düzenle` adımı ilk satırı açar (`PARCA_0096` → Ayna, `[MIL_0096, …]` → Tahrik mili, `PARCA_0087` → Rulman 6204).

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/urunAgaci.js` | `HAMMADDE_TOPLAM_ETIKETI`, `hammaddeToplamSayisi(n)`, `HAMMADDE_TOPLAM_HATALI`; `KAYNAK_KIRILIM_YETKISIZ` → `KAYNAK_KIRILIM`; `kaynakKartMetni` silinir |
| `src/components/PartManager.jsx` | `MaliyetAlani`: rakamlı satır yalnız yetkisizde, kaynak ibaresi tek metin; `HammaddeAlani` `toplam` prop'u ve `hammadde-toplam` kutusu; iki pencerede `formMaliyeti` sonucu bir değişkende |
| `tests/ui/kirilim-toplami-0099.test.jsx` | yeni (gerçek Settings, 0096 düzeneği) |
| `tests/kirilim-toplami-0099.test.js` | yeni (kaynak taramaları AC-26/27/28) |
| `tests/ui/hammadde-0096.test.jsx` | `:11`, `:81`, `:82`, `:85`, `:215` "spec 0099 ile" |
| `tests/ui/maliyet-gecmisi-0097.test.jsx` | `:149` "spec 0099 ile" |
| `scripts/evidence/0009-sayfa.jsx` | `katalog-parca-0099-yetkisiz`, `-ekle`, `-elle` |
| `docs/evidence/` | `0099-taban-piksel-raporu.json`, `0099-piksel-raporu.json`, JPEG'ler; `kanit-eslemesi.json` |
| `docs/tasarim-sozlugu.md` | "Kapsam içindeki yakın kopyalar"a hammadde toplam kutusu |
| `CLAUDE.md` | 0096 bölümünde toplamın yeri |

## 3. Adım sırası

1. Kanıt tabanı: üç yeni ekran araca eklenir, sekiz ilgili ekran (`katalog-parca`, `-yeni`, `-0096-kirilim`, `-tutarsiz`, `-bos`, `-hata`, `-0097-gecmis`, `-0097-hata`, `ayarlar-yedekparca-0096-yetkisiz` ve üç yeni) spec öncesi kodla iki kez çekilir; taban 0 fark (gürültü yok). `-ekle` adımları görüntüyle doğrulanır (P8).
2. Sabitler (`urunAgaci.js`).
3. Ekran (`PartManager.jsx`).
4. Ters çevrilen altı test yeri; yeni iki test dosyası.
5. Bozma denemeleri (§6).
6. Tam takım (Electron dahil) ve lint.
7. Son kanıt çekimi, eşleme kayıtları, sözlük, CLAUDE.md, SCORECARD.

## 4. Tasarım kararları (onaylı)

- **P1:** hata ibaresi canlıdır; `HammaddeAlani`'nın tutarsız uyarısı için zaten yaptığı `hammaddeDogrula(satirlar)` sonucunun `gecerli`'sinden.
- **P2:** geçerli tutarlı satır yoksa kutu ve ibare yok (R3, Karar 4).
- **P3:** ibare tutarın altında ayrı satır; hatalı durumda metin dört parça.
- **P4:** AC-14 `.modal-backdrop` içinde sayılır.
- **P10:** kutu tam genişlik, `marginTop: 8`; stil `normal-ozet` emsali (`--n100` zemin, `--n200` kenarlık, 12 px köşe, `12px 14px`, 13 punto), tutar kalın `--blu700`; parçalar ayrı `span`, aralarında metin düğümü yok.
- Toplam ve sayı ebeveynin `formMaliyeti` sonucundan (`kirilimK`, `kaynak.n`) prop olarak iner (C1/2); bölüm maliyet okuma yolunu çağırmaz.

## 5. Kanıt

- Değişen (`degisti` + onay `Takım Yöneticisi · 2026-10-21 · spec 0099 Karar 5`, P9): `katalog-parca-0096-kirilim`, `-tutarsiz`, `-hata`, yeni `katalog-parca-0099-ekle`.
- 0 piksel: `katalog-parca`, `katalog-parca-yeni`, `katalog-parca-0096-bos`, `katalog-parca-0097-gecmis`, `katalog-parca-0097-hata` (P7), `ayarlar-yedekparca-0096-yetkisiz`, yeni `katalog-parca-0099-yetkisiz` ve `-elle` (spec öncesi kodla çekilmiş tabanlarına göre; C3'ün görsel kanıtı).
- `-elle`: `PARCA_0087`, `baslik:Düzenle`, `kaydir:Alış maliyeti` (P6).
- Karanlık tema işi yok: üç token `theme.js`'te tanımlı, kontrast iki temada AA üstü (spec ölçüm 14); `tasarim-kontrast`'a satır eklenmez.

## 6. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1, AC-2, AC-3 | `ui/kirilim-toplami-0099`: Ayna düzenlenir, kutu var, `textContent` = etiket + `hammaddeToplamSayisi(3)` + "17.000,00 ₺" (tam eşitlik) |
| AC-4 | satır eklenince metin aynı; 500 yazılınca n=4, "17.500,00 ₺" |
| AC-5, AC-6 | tutar silinince n=2 ve 10.000; satır silinince 8.000 |
| AC-7, AC-7/2 | 8.000,55 + 9.000,45 → "17.001,00 ₺"; tek satır 4.250 → n=1 |
| AC-8, AC-9 | tutarsız tek satır → kutu yok; satırsız parça → kutu yok |
| AC-10 | bütün satırlar 0 → "0,00 ₺" |
| AC-10/2 | iki satır biri tutarsız → n=1, `hammadde-tutarsiz` metni aynen |
| AC-11 | `compareDocumentPosition`: düğme < kutu < uyarı < ipucu |
| AC-12 | üç tedarikçi seçili: düğme yok, kutu var |
| AC-13 | yetkili: `maliyet-kirilimdan` yok, `maliyet-kaynagi` = `KAYNAK_KIRILIM` |
| AC-14 | `.modal-backdrop` içinde `/\d+ tedarikçi/` tek eşleşme, kutunun içinde |
| AC-15, AC-16 | yetkisiz: rakamlı satır bugünkü metni, kutu yok, gövdede sayı yok |
| AC-17 | Rulman: "Elle girildi", alan etkin, kutu yok |
| AC-18 | üç tutar boşaltılır: alan etkin, kutu yok, ibare "Elle girildi" ya da yok |
| AC-19 | ekleme penceresinde kutu doğar ve büyür |
| AC-20 | kayıttan sonra liste hücresi kutunun tutarıyla başlar |
| AC-21 | yetkili, dokunmadan kaydet → kayıt başlangıç nesnesine `toEqual` |
| AC-22 | `hammadde-0096-app.test.jsx:55` ve içe aktarma testleri dokunulmadan yeşil |
| AC-23, AC-24, AC-25 | tedarikçisiz satır / -5 / aynı tedarikçi iki kez: toplam ve n aynı, ibare var; AC-24 kayıt ve kit yazılmaz; AC-25 düzeltince ibare gider |
| AC-26, AC-27, AC-28 | `kirilim-toplami-0099.test.js` taramaları |
| AC-29 | 0097 geçmişli parçada blok yeri ve eski/yeni rakam |
| P2 | geçerli tutarlı satır yokken hatalı satır: kutu yok |

Bozma denemeleri (`scratchpad/mut99.sh`): kutuyu "Tedarikçi ekle" koşuluna bağlamak, rakamlı satırı yetkilide bırakmak, sayıyı `satirlar.length`'ten almak, toplamı bölümde `reduce` ile hesaplamak, ibareyi kaldırmak, kutuyu satır varlığına bağlamak, parçalar arasına ayraç eklemek. Her biri en az bir testi kırmalı.

## 7. Değişmeyenler

Yeni kalıcı alan, veri bölümü, tablo, eylem izni, sunucu kuralı, birleştirme kuralı, kilit alanı yok; dört nokta kuralı uygulanmaz. Liste hücresi, Excel aktarımı, maliyet geçmişi ve geçerlilik tarihi değişmez. Kırılım TL olduğu için çoklu para birimi kuralı doğmaz (X3). Yazdırma çıktısı yok.

## 8. Sonuçlar (2026-10-21)

- **Testler:** `npm test` 387 dosya, 5.047 test yeşil (Electron dahil); `npm run lint` 0 hata, 66 uyarı (öncesiyle aynı). Yeni: `ui/kirilim-toplami-0099` 27 test, `kirilim-toplami-0099` 4 test.
- **Bozma denemeleri:** on denemenin onu yakalandı. İlk "ibare tutarın üstünde" denemesi eşdeğerdi (`{null}` eklemek hiçbir şeyi taşımıyordu); ibareyi gerçekten taşıyan deneme 3 testi kırdı.
- **AC-21 (P5):** yetkili kullanıcının dokunmadan kaydı gövdeyi birebir korur; 0096'dan kalan bir sapma çıkmadı.
- **Kanıt aracı düzeltmesi:** textarea boyutlandırma tutamağı çalıştırmadan çalıştırmaya iki hâlde çiziliyordu (iki Tanım kutusunun köşesinde 16×16 kare, 166 piksel sahte fark; spec öncesi kodla iki çekim arasında da). `scripts/evidence/0009-sayfa.html`'e `textarea { resize: none !important; }` eklendi (`hide-scrollbars` emsali; formlar `resize` stilini satır içi verdiği için `!important`). Düzeltmeden sonra spec öncesi kodla üç çekim ve spec sonrası kodla iki çekim kendi aralarında 0 piksel. Uygulamanın kendisine dokunulmadı.
- **Kanıt:** taban `0099-taban-piksel-raporu.json` (13 ekran × 2 tema, 0 fark); `0099-piksel-raporu.json`: `katalog-parca-0096-kirilim`, `-tutarsiz`, `-hata` ve `katalog-parca-0099-ekle` değişti (onaylı); `katalog-parca`, `-yeni`, `-0096-bos`, `-0097-gecmis`, `-0097-hata`, `ayarlar-yedekparca-0096-yetkisiz`, `ayarlar-yedekparca-maliyetsiz`, `katalog-parca-0099-yetkisiz` ve `-elle` 0 piksel. Çizim hatası yok.
- **Atıf:** CLAUDE.md'nin `specs/done/0099-uygulama-plani.md` atfı done'a taşınana kadar `tests/spec-atiflari.test.js` `TASINACAK` listesinde.
- **Triyaj (4 bulgu):** AC-21 artık kaydın yapıldığını (yazım casusu, pencere kapanır) ölçer; AC-24 kitli parçada adet değiştirilerek kurulur ve geçerli tutarlı kontrol testiyle eşleşir; `toplam.kaynak.n` yedeksiz; araç kuralı CLAUDE.md'de. İki bozmayla ölçüldü (kayıt hep engelli → AC-20/21/24 kontrol kırılır; negatif tutar engellemez → AC-24 kırılır).
- **Kapanış kanıtı:** `0099-kapanis-piksel-raporu.json` (son kod ↔ son kod, 26 görüntü, 0 fark); eşlemedeki dört `degisti` kaydı bu rapora `ayni` olarak yönlendirildi.
