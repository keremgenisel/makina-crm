# 0089 Uygulama Planı: Giderler'deki iki maliyet görünümü kalkar

| | |
|---|---|
| **Spec** | `specs/0089-gider-maliyet-gorunumleri-kalkar.md` (revizyon 3) |
| **Dal** | `feat/0089-gorunumler-kalkar` (taban `0874b26`, 0088 kapanışı) |
| **Onay** | Takım Yöneticisi · 2026-10-17 · bütün öneriler (K1–K10) kabul |

## 1. Değişecek ve eklenecek dosyalar

**Silinir:** `src/components/gider/MakinaKarliligi.jsx`, `MakinaModelGorunumu.jsx`, `MakinaMaliyetDetay.jsx` (`MaliyetNotlari` dahil),
`FiyatOnerisi.jsx`; `tests/ui/makina-karliligi.test.jsx`.

**Kaynak:**

| Dosya | Değişiklik |
|---|---|
| `src/components/Giderler.jsx` | `GORUNUMLER` iki öğe (tek satır); iki import, `makinaMaliyet` prop'u, `donemAnahtari`, iki görünüm dalı kalkar. `modeller` (gider formu) ve `rates` (KDV) kalır. `DONEMSIZ` dokunulmaz (K8). |
| `src/App.jsx` | Maliyet memosu `maliyetYetki` ile kapılı (R4/2); Giderler'e `makinaMaliyet` geçmez; Makina Maliyeti ekranına aynen. |
| `src/components/gider/UretimPartileri.jsx` | "Kapanmış partilerin aylarında değişen ortak gider" kutusu (R11), veri `makinaMaliyet.partiler[].degisimler`, yeni prop yok. |
| `src/components/gider/DonemRaporu.jsx` | `KovaKarti` gövdesine kopmuş atama satırı (R12; benzersiz kalem, `dusen-atama-sayisi`, sıfırda yok). |
| `src/components/maliyet/PayOzeti.jsx` | R16 düzeltme cümlesi. |
| `src/lib/kilitAlanlari.js` | Dört girdi çıkar (R14). |
| `src/lib/makinaMaliyeti.js` | **Dokunulmaz** (R5, X1). |
| `docs/tasarim-sozlugu.md` | `:387-388` iki örnek (R15). |
| `scripts/evidence/0009-sayfa.jsx` | `MakinaMaliyetDetay` import'u ve on sekiz ad ad listesiyle çıkar (C9); `0089-*` ekranları eklenir. |
| `docs/evidence/kanit-eslemesi.json` | Üç kayıt çıkar; değişen ekranlar `degisti` + onay. |
| `CLAUDE.md` | 0089 bölümü; 0002/0022/0088 atıfları. |

**Testler (C8, yirmi sekiz satır):** `yerlesim-0083` (iki), `ui/standart-kalkar-0082`, `scripts/tests/donem-raporu-yerlesim.cjs`,
`ui/uretim-partisi`, `gider-dagitim-0072` (iki), `ui/personel-atama`, `ui/kisitli-gider-0076`, `ui/kutu-duzeni-0067`, `ui/kutular-kapali-0081`,
`ui/stopaj-donemi-0084`, `sayfalama-0062` (iki), `sayfalama-kalkar-0080`, `ui/gider-perdesi`, `gider-gizlilik` (`:42` yorum), `tasarim-kaynak` (`:113`).

**Eklenen:** `tests/gider-gorunum-0089.test.js` (taramalar), `tests/ui/gider-gorunum-0089.test.jsx` (Giderler),
`tests/ui/gider-gorunum-0089-app.test.jsx` (gerçek App), `tests/ui/gider-gorunum-0089-kiyas.test.jsx` (C4 kıyası; `YAZ_0089=1` ile spec
öncesi kodda altın üretir, 0079 `ekran-once` emsali; planda adı geçen ayrı `.mjs` üretici yerine bu yol seçildi çünkü kutu metni jsdom
çizimi ister), `tests/fixtures/0089-veri.js`, `0089-donem-raporu-once.json`, `0089-gider-kasa-raporu-once.html`; kanıt
`docs/evidence/0089-piksel-raporu.json`, `0089-taban-piksel-raporu.json`.

**Yeni veri bölümü, alan, izin, sunucu ve birleştirme kuralı yok.** `db.cjs`, `serverAuth.cjs`, `merge.js`, `SettingsBackup` değişmez.

## 2. Adım sırası

0. Dal, spec revizyon 3, bu plan.
1. Kıyas fikstürü spec öncesi kodla (**yapıldı**, 2026-10-17: rapor nesnesi, kutu metinleri, yazdırma HTML'i).
2. App kapısı ve Giderler prop'u.
3. Giderler çubuğu ve dallar.
4. Kutu taşıma (R11), sayı satırı (R12), `PayOzeti` cümlesi (R16).
5. Dosya silme; `kilitAlanlari`, sözlük, `tasarim-kaynak`.
6. Yeni testler; C8'in yirmi sekiz yeri; C7'nin on yedi kriteri "spec 0089 ile" notuyla; mutasyon ölçümü.
7. Görsel kanıt (taban worktree `0874b26`, parçalı çekim, gürültü ayıklama).
8. Rehberin beş atfı ve PDF (commit dışı, K1); CLAUDE.md; sürüm notu (§7).
9. `npm test` (Electron dahil) ve lint; elle deneme (K7); triyaj; kapanış.

## 3. Kararlar (spec revizyon 3)

| No | Karar |
|---|---|
| K1 | Rehber: beş atıf düzeltilir, PDF üretilir, commitlenmez; AC-28 el ölçümü (§6) |
| K2 | AC-22 taraması `src/components` |
| K3 | R12 benzersiz kalem sayar |
| K4 | R12 satırı kutu gövdesinde |
| K5 | AC-9 kutu metinleri spec öncesi koddan |
| K6 | AC-8 gerçek App'te motor casusu + tarama |
| K7 | Elle deneme gerçek verinin kopyasıyla |
| K8 | `DONEMSIZ` dokunulmaz |
| K9 | Bulunamayan kanıt adımının sessiz geçişi bilinen borç (kapsam dışı) |
| K10 | Parti değişim kutusu yalnız maliyet sekmeli kullanıcıda; sürüm notunda |

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1…4 | `ui/gider-gorunum-0089` |
| AC-5, 6, 7, 22, 23, 26 | `gider-gorunum-0089` (taramalar); 23 ayrıca `kilit-alanlari`, 26 `sayfalama-0062` |
| AC-8 | `ui/gider-gorunum-0089-app` (casus) + `gider-gorunum-0089` (tarama) |
| AC-9, 16, 17, 18 | `ui/gider-gorunum-0089-kiyas` |
| AC-10, 11, 12, 13 | `ui/gider-gorunum-0089`; ayrıca `kutular-kapali-0081`, `ui/tedarikciler`, `ui/gider-form` yeşil |
| AC-14, 15, 19, 21, 27 | `ui/gider-gorunum-0089-app`; 19 ayrıca `ui/uretim-partisi`, `cop-kutusu-0068`, `ui/genel-arama-0026`, `yedek-paketleri-0086` |
| AC-20 | `gider-gorunum-0089` (üç dosya taban `0874b26` ile aynı) + `server-authz` |
| AC-24 | `tasarim-kaynak` |
| AC-25 | `donem-raporu-yerlesim` (Electron) |
| AC-28 | El ölçümü (§6) |
| AC-29 | `kanit-eslemesi`, `tasarim-kaynak`, `gider-gorunum-0089` (ad taraması), `0089-piksel-raporu.json` |
| AC-30 | `gider-gorunum-0089` (C7 notlarının varlığı) |

## 5. Ölçümler

- **Kıyas fikstürü** (adım 1, spec öncesi kod `0874b26`): rapor nesnesinde `dusenAtamalar` üç kayıt / iki kalem (iki silinmiş model
  satırı tek kalemde + takip edilemeyen makina), kovalar `{makina 600, model 300, dagitma 300, ortak 54.420}`, kısıtlı kalem 1.
  Uygulamadan sonra rapor nesnesi, beş kutunun metni, ekranın tam metni ve yazdırma HTML'i birebir aynı (tek fark R12 satırı ve
  çubuğun kalkan iki düğmesi, ayıklanır).
- **Spec'te olmayan bir ölçüm (AC-8):** maliyet sekmesi olmayan kullanıcıda motor bir kez çalışıyordu: sunucu ayarı okunmadan
  (`serverMode` null) `gorunurSekmeler` bütün sekmeleri görünür sayar ve ilk çizimde `maliyetYetki` doğrudur (boş veriyle). Kapıya
  `serverMode !== null` eklendi; casus testi bunu ölçer (mutasyon M2).
- **C8 tablosu dışında kırılan yerler** (spec sayımı 28; uygulamada ek dört): `tests/yerlesim-0083.test.js` AC-21 (kanıt kaydı olan
  dosya sayısı 19 → 16) ve AC-25 (0083 raporundaki on sekiz ad araçta yok, tam listeyle istisna); 0082 AC-11…AC-15 (`MaliyetNotlari`
  ve `MakinaKarliligi` çizimleri) motor düzeyine indi; 0020 R10 ("Kira ve atanmamış personel dahil" alt yazısı) ve R11 ("Model havuzu
  payları" etiketi) ekranla kalktı; 0022 AC-9/AC-10/AC-13 ve triyaj bulgusu motor düzeyine indi. Hepsi "spec 0089 ile" notlu.
- **Mutasyon ölçümü** (her biri en az bir testi kırdı): M1 kapı `giderYetki`, M2 `serverMode` şartı yok, M3 kopmuş atama satır
  sayar, M4 sıfırda çizer, M5 parti kutusu yok, M6 çubuğa görünüm eklenir.
- **Lint:** 0 hata, 69 uyarı (taban).
- **Tam takım:** 349 dosya / 4.438 test yeşil (Electron dahil).
- **Görsel kanıt:** `0089-piksel-raporu.json`, 688 görüntü (344 ekran × 2 tema), çizim hatası yok; 79 ekran bilinçli değişti:
  66 Giderler ekranı (iki düğmeli çubuk; sağ grup artık aynı satıra sığıyor), formun ya da pencerenin arkasındaki çubuk
  (`gider-formu*` dört, `kilit-gider-formu`, `kilit-odeme-penceresi`, `kayit-perdesi`), menü ekranları (`uygulama-menu-*` üç,
  Giderler açık), parti kutusu (`maliyet-uretim-partileri`, `-formu`, yeni `maliyet-0089-parti-degisim`). Değişen her ekran bu
  çubukla ya da kutuyla açıklanıyor; açıklanamayan küçük fark yok, bu yüzden taban kendisiyle ayrıca yeniden çekilmedi. Kanıt
  eşlemesine 14 dosyada 181 `degisti` kaydı (onay `spec 0089 R10`; iki yeni ekran R11, R12).
- **Sözlük atıfları:** kod çıkınca `Giderler.jsx:302/337/370` → `:295/330/363`, `DonemRaporu.jsx:73` → `:85` (yeni yardımcı iki fonksiyon).

## 6. El ölçümleri

- **AC-28 el ölçümü: rehberde kaldırılan ekran adı kalmadı** (2026-10-17). `docs/rehber/gider-kasa-rehberi.html`'de beş atıf
  düzeltildi: §3.1 tablosundan "Makina ve Model", "Üretim Partileri", "Makina Kârlılığı" satırları çıktı ve yerine Makina Maliyeti
  sekmesini gösteren cümle; §6 "hangi soru nerede" tablosunda "Bu makina kâr ettirdi mi?" satırı Model Maliyetleri'ne; §7.3 yeni
  ekranı anlatacak biçimde yeniden yazıldı. Sonrası `grep "Makina Kârlılığı\|Makina ve Model"` yalnız "artık yok" cümlesini bulur.
  PDF `scripts/rehber-pdf.cjs` ile yeniden üretildi (`Altunmak-CRM-Gider-ve-Kasa-Rehberi.pdf`, 17.10.2026 18:53, 333 KB).
  İki dosya analistin; **commitlenmedi** (K1). Rehberin 0080-0083 borcu (ör. §3.1 başlığı "altı görünüm", "Standart Genel
  Giderler" satırı, "Tedarikçiler" adı) bu işte düzeltilmedi (X3).
- **AC-15 elle deneme (K7):** gerçek verinin kopyası (`data.db` + anahtar, geçici `userData`; gerçek klasöre yazılmadı, kopya
  sonra silindi) Electron'da açıldı (şifreli, 33 bölüm), bugünkü motor çalıştırıldı ve tek canlı açık parti ("2026-2") Eylül 2026
  bitişiyle `partiKapanisUygula`'dan geçirildi: `kapanisOrtaklari` = `{"2026-09": 83001100}` (dolu); üç sütun 1 makina,
  969.005,50 ₺ havuz, 969.005,50 ₺ makina başı. Deneme motor ve kapanış fonksiyonu düzeyindedir (arayüz tıklaması gerçek App
  testinde, `ui/gider-gorunum-0089-app` AC-15).

## 7. Sürüm notu

> Giderler sadeleşti: görünüm çubuğunda yalnız **Dönem Raporu** ve **Tedarikler ve Ekstre** kaldı. Makina maliyeti, önerilen fiyat
> ve üretim partileri **Mali İşler › Makina Maliyeti** sekmesindedir. Kaldırılan **Makina Kârlılığı** ve **Makina ve Model**
> görünümleriyle birlikte şunlar ekrandan kalktı: makina (seri) başına maliyet, kâr ve marj; stokta duran makinaların taşıdığı
> maliyet ve parti kırılımı; dağıtılmamış ortak gider; fiyat önerisinin marj ve ekle yöntemleri (yeni ekranın kâr katsayısı
> eski "kat" yönteminin aynısıdır). Gider kayıtları, tutarlar, atama alanları ve izinler değişmedi. Atandığı makina ya da model
> silinmiş kalemlerin sayısı Dönem Raporu'nun "Makina Maliyeti Kovaları" kutusunda yazar; kapanmış partilerin değişen ortak
> gideri Makina Maliyeti › Üretim Partileri'nde görünür (yalnız Makina Maliyeti sekmesi açık kullanıcılarda). Bu sürümde sunucu
> ve istemci sırası önemli değildir (veri ve sunucu değişmedi).

## 8. Triyaj (2026-10-17)

| No | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Kopmuş atama satırı dar neden söylüyor ve tutarı sıfır kalemi sayıyor (motor `kv.makina === 0`) | `dusenAtamaKalemSayisi(rapor, turMap)` tutarı sıfır kalemi saymaz (motor C4 gereği değişmedi); metin geniş neden ve çöpten geri alma; `KovaKarti` `turMap` alır; tek kanıt ekranı yeniden çekildi | `ui/gider-gorunum-0089` iki yeni AC-13 testi (mutasyonla ölçüldü), `ui/personel-atama`, `kutular-kapali-0081` imza |
| 2 | README başlığı "üç", CLAUDE.md 0083 maddesinde iki sıra karışık | README "iki"; madde 0083 sırası ve 0089 sonrası ayrı | `gider-gorunum-0089` triyaj (bulgu 2) taraması |

Sonrası: 349 dosya / 4.441 test yeşil (Electron dahil), lint 0 hata (69 uyarı).
