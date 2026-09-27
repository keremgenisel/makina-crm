# 0020 Uygulama Planı: Personel Giderinin Makinaya ve Modele Atanabilmesi

| | |
|---|---|
| **Bağlı spec** | `specs/0020-personel-giderinin-atanabilmesi.md` (R2, plan onayıyla onaylandı) |
| **Durum** | Uygulandı, commit bekliyor. 2026-09-27: P1–P9 kullanıcı tarafından onaylandı; spec R2 ile güncellendi; görünüm Takım Yöneticisi tarafından onaylandı. Dal `feat/0020-personel-atama`. |
| **Önkoşul** | 0001 (gider motoru), 0002 (makina maliyeti), 0030 (dal tabanı) |

---

## 0. Kodda doğrulanan dayanaklar (2026-09-27)

| Konu | Bulgu |
|---|---|
| Kova kuralı | `gider.js:256` `if (davranis !== DAVRANIS.NORMAL) r.ortak = top;`; makina çözümü `:272`, `:276`, rapor `:446` aynı `=== NORMAL` kapısıyla. |
| Doğrulama tabanı | `giderKalemDogrula` personelde `kayit.tutar = null` (`:148`), model doğrulaması `kayit.tutar ?? 0` (`:201`); atama bloğu `dav !== NORMAL` ise boşaltıyor (`:190`). |
| Düşen atamalar | `:454-455` yalnız normal davranış. |
| Etiket | Tekrarlayan üretimde personel açıklaması `t.ad \|\| c.ad` (`:325`): çoğu zaman çalışanın adı. Makina kırılımı `x.aciklama \|\| "—"` (`MakinaModelGorunumu.jsx:38`, ayrıca `:52`, `:58`, `:65`, `:74`), maliyet detayı `k.aciklama \|\| "gider"` (`MakinaMaliyetDetay.jsx:54`); maliyet motoru açıklamayı `:160`, `:171`'de taşır. |
| Spec'in saymadığı yerler | `DonemRaporu.jsx:204` atama sütunu kira dışı her non-normal kalemi "Ortak gider" yazar; `MakinaModelGorunumu.jsx:20` "Kira ve personel dahil"; maliyet detayının "Malzeme payları (model havuzları)" satırı personel havuzunu da alacak. |
| Form | `GiderForm.jsx:226-228` `dav === NORMAL` kapısı ve `tutar={form.tutar}`; `turDegis` (`:42`) non-normal türe geçince atamayı temizler. |
| Kilitleyen test | `tests/makina-maliyeti.test.js` AC-70 ("kira veya personel kalemi atama taşısa bile ... ortağa girer"). `gider.test.js` AC-78 ve `ui/gider-form` AC-78 yalnız kira türüyle çalışıyor, etkilenmez. |
| Sunucu | Yeni alan yok; `tanimliUretimMi` yalnız eklemede bakar, düzenleme engellenmez. |

## 1. Kararlar

| No | Karar | Gerekçe |
|---|---|---|
| P1 | "Personel gideri" etiketi açıklama yazılmış olsa bile her zaman; tek yardımcı `gider.js kalemGorunenAd(k, dav)`. Maliyet motoru türettiği satırlara etiketi yazar, arayüz ham kalem listelerinde aynı yardımcıyı kullanır. | Açıklama çoğunlukla çalışan adı; tek kaynak. |
| P2 | AC-9 "çalışan bazlı tutar" = ad ve resmi/elden kırılımı; kalem toplamı görünür. | AC-8 satırın görünmesini istiyor; ekranı gören zaten gider yetkilisi. |
| P3 | Makinaya atanmış her personel kalemi ayrı satır. | Spec yazımı, model satırlarıyla tutarlılık. |
| P4 | Tekrarlayan tanımda atama kapalı (X5); üretilen kalemin sonradan düzenlenmesi sunucuda serbest, `server-authz` iddiasıyla sabitlenir. | Sunucu değişmeden doğru. |
| P5 | `DonemRaporu` atama sütunu yalnız kirada zorla ortak; "Ortak gider" alt yazısı "Kira ve atanmamış personel dahil". | Kural değişince eski metin yanlış olur. |
| P6 | Maliyet detayında "Model havuzu payları (malzeme ve işçilik)". Ayrı işçilik satırı yok. | Kapsam; hesap değişmez. |
| P7 | `makina-maliyeti.test.js` AC-70'in personel yarısı ters çevrilir (C6 istisnası); kira yarısı aynen. | Test bugünkü kuralı kilitliyor. |
| P8 | Veri taşıma yok. | Doğrulama her kayıtta personel atamasını boşaltıyordu, üretim de boş yazıyor. |
| P9 | `specs/done/0001` notu çalışma kopyasına eklenir, commit'e yalnız o bölüm alınır (`git apply --cached`). Görsel kanıtta personel atamalı veri yalnız yeni ekranlara özel; bilinçli değişen ekranlar `degisti` + TY onayı. Uyarı `UyariSeridi aile="uyari"`, yalnız makina seçiliyken. | Analistin değişikliği korunur; mevcut ekranlar 0 piksel kalır. |

## 2. Dosyalar ve adım sırası

1. Koruma testleri bugünkü kodda yeşil: AC-6 (kira), AC-16 (tanım), gizlilik taraması.
2. Motor `src/lib/gider.js`: kova (`kovaKurus`, `kalemKovalariKurus`, `kovaDagilimi`), doğrulama (atama yalnız kirada boşalır; model tabanı personelde resmi + elden), rapor (makina çözümü, düşen atamalar, model satırı etiketi), `kalemGorunenAd`. Motor testleri; AC-70 istisnası.
3. `src/lib/makinaMaliyeti.js`: doğrudan kalem ve havuz satırlarında etiket.
4. Form: `GiderAlanlari.jsx` (`AtamaAlani davranis`, uyarı, personel ipucu), `GiderForm.jsx` (kapı, taban, `turDegis`).
5. Görünümler: `MakinaModelGorunumu.jsx`, `DonemRaporu.jsx`, `MakinaMaliyetDetay.jsx`.
6. `npm test`, `npm run lint`.
7. Görsel kanıt (`scripts/evidence/0009-sayfa.jsx` yeni ekranlar), `docs/evidence/0020-*`, `kanit-eslemesi.json`; TY onayı.
8. Belgeler: `CLAUDE.md`, `docs/tasarim-sozlugu.md` satır kayması, `specs/done/0001` R21, `specs/done/0002` R21, `0001-uygulama-plani.md` K33/K38, `0002-uygulama-plani.md` AC-70 notları.

## 3. Kriter ↔ test eşlemesi

| AC | Test | Nasıl |
|---|---|---|
| AC-1 | `ui/personel-atama` | Personel türünde atama çubuğunda dört seçenek |
| AC-2 | `personel-atama.test.js` | Makina kovası = resmi + elden; `dogrudan` aynı tutar |
| AC-3 | `ui/personel-atama` | Makina seçilince sabit metin; Kaydet'te `onSave` çağrılır |
| AC-4 | `personel-atama.test.js` | Model havuzu kurulur ve pay dağılır; kalan ortak kovada |
| AC-5 | `personel-atama.test.js` | Atamasız personel ayın makinalarına eşit ortak pay |
| AC-6 | `ui/personel-atama` + `personel-atama.test.js` + `makina-maliyeti` AC-70 kira yarısı | Kirada atama çizilmez; atama taşısa bile ortak |
| AC-7 | `gider.test.js` AC-82 bloğu | Makinaya atanmış personel + kısmi model + dağıtılmayan personel; dört kova = toplam |
| AC-8 | `ui/personel-atama` | Maliyet detayı doğrudan gider satırında "Personel gideri" ve tutar |
| AC-9 | `ui/personel-atama` | Maliyet detayı, Makina ve Model, kârlılık listesi: çalışan adı ve resmi/elden bileşeni yok |
| AC-10 | `gider-gizlilik.test.js` | Yasaklı ifadelere maliyet çıktı adları; yazdırma/rapor/dışa aktarma okumuyor |
| AC-11 | `personel-atama.test.js` | Makina çöpteyken ortak kovada |
| AC-12 | `personel-atama.test.js` | Dağıtılmasın kovası; hiçbir makina maliyetine girmez |
| AC-13 | `personel-atama.test.js` + `ui/personel-atama` | 30.000 + 20.000: 50.000 geçer, 50.000,01 hata, 40.000'de "Dağıtılmayan 10.000 ₺" uyarısı; formda kalem tutarı 50.000 |
| AC-14 | `personel-atama.test.js` + `ui/personel-atama` | Düşen atamalarda personel kalemi, "Personel gideri" etiketiyle |
| AC-15 | `ui/personel-atama` | Boş açıklamalı ve çalışan adlı açıklamalı iki kalem: "Personel gideri", "—" ve ad yok |
| AC-16 | `personel-atama.test.js` + `ui/gider-settings` | Atama taşıyan personel tanımından üretilen kalem ortak; tanım formunda atama yok |

## 4. Uygulama notları (2026-09-27)

- **Testler önce:** yeni davranış testleri eski kodda kırmızıydı (20); koruma testleri (AC-5, AC-6, AC-11, AC-16, AC-9 gizlilik, AC-10) eski kodda yeşildi.
- **Test verisi düzeltmesi:** model havuzu kalem tarihinden sonra (dahil) üretilen makinaya pay verir (0002 M13); ilk yazımda kalem tarihi makinalardan sonraydı, veri düzeltildi (kod değil).
- **Mevcut test değişikliği:** yalnız onaylı istisna `makina-maliyeti.test.js` AC-70 (personel yarısı: doğrudan 25.000, ortak 30.000). Diğer eklemeler yeni `it`/`describe` blokları.
- **Tam koşu:** `npm test` 214 dosya, 2329 test yeşil (Electron dahil); `npm run lint` 0 hata.
- **Kanıt:** 208 ekranlık çekimde 198 ekran 0 piksel; değişen 5 ekran × 2 tema bilinçli (`docs/evidence/0020-*`, `0020-piksel-raporu.json`), kanıt eşlemesinde `degisti` + TY onayı (2026-09-27). Yeni ekranlar: `gider-formu-personel-makina`, `giderler-model-personel`, `maliyet-detay-personel`.
- **Belgeler:** `CLAUDE.md` (kova cümlesi + 0020 bölümü); tarihli notlar `specs/done/0001` R21 (analistin commit edilmemiş değişikliğinden ayrı bölüm), `specs/done/0002` R21, `0001-uygulama-plani.md` K33/K38, `0002-uygulama-plani.md` AC-70.

## 5. Triyaj düzeltmeleri (2026-09-27)

- **Bulgu 1 (kanıt):** yeni ekran `giderler-rapor-personel-acik` (personel grubu açık, atamalı kalemler); görüntü aracına tablo satırı içindeki düğmeye tıklayan `dugme:` adımı eklendi. Önce/sonra `0020-piksel-raporu.json`'a eklendi, `DonemRaporu.jsx` için `degisti` + TY onayı (spec 0020 R10).
- **Bulgu 2 (atıflar):** `tests/spec-atiflari.test.js` belgelerdeki `specs/done/*.md` atıflarının dosyaya çıktığını denetler; done'a taşınmayı bekleyen 0020 dosyaları `TASINACAK` listesinde. **Done'a taşırken bu listeden 0020 satırlarını çıkarın**; unutulursa test kırılır.
- **Bulgu 3 (yorum):** `SettingsGiderTanimlari.jsx` iki `DAVRANIS.NORMAL` kapısına "spec 0020 X5" gerekçe yorumu; `personel-atama.test.js` kapıların ve yorumun yerinde durduğunu, `atanabilirMi` çağrılmadığını denetler.
