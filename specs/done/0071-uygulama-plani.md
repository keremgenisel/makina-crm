# 0071 Uygulama Planı: KDV Dâhil Tutar Girişi ve Tutarı Sonra Girilen Tekrarlayan Kalem

| | |
|---|---|
| **Bağlı spec** | `specs/done/0071-kdv-dahil-giris-ve-sifir-tutarli-tekrarlayan.md` (R2, plan onayıyla) |
| **Dal** | `feat/0071-kdv-dahil` (main `d4f1a7e` üstünde) |
| **Onay** | Takım Yöneticisi, 2026-10-06: bütün öneriler (Q1–Q7) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Kira ileri yönü KDV'yi **brüt** üzerinden hesaplıyor (`kiraHesapla`: `kdv = round(brut × oran)`). Net girişte
  "önce KDV ayır" sırası girilen rakamla tutmayan ödenecek tutar üretir (Q1 → R6 revizyonu).
- `GiderForm` normal kalemde KDV'yi kendi float formülüyle hesaplıyor (`normalKdv`, C8 hedefi).
- Tanım doğrulaması `SettingsGiderTanimlari.kaydet` içinde; `modelSatirlariDogrula(tutar ?? 0, …)` tanımın
  tutarıyla karşılaştırıyor (Q5 → R25).
- `tekrarlayanUret` normal kalemi `Number(t.tutar) || 0` ile doğuruyor; sıfır tutar üretimde zaten yazılabiliyor,
  engel yalnız formda (kalem `giderKalemDogrula`, tanım bileşen).
- `giderler` ve `gider_tanimlari` tabloları `SELECT *` + `...rest` ile okunuyor; yeni TEXT sütunu için şema, sütun göçü
  ve INSERT yeterli.
- `tutarMetni(0)` → `"0"` (boş değil); üretilmiş sıfır kalem formda "0" ile açılır.

## 2. Dosyalar

- Motor: `src/lib/gider.js` (`kdvAyir`, `KDV_YONU`, `kdvYonuOf`, `giderKalemDogrula`, `tekrarlayanUret`).
- Veritabanı: `electron/db.cjs` (`GIDER_KDV_YONU_COLUMN`, iki tablo).
- Arayüz: `src/components/GiderForm.jsx`, `src/components/settings/SettingsGiderTanimlari.jsx`,
  `src/components/gider/DonemRaporu.jsx` (rozet, süzgeç, ödeme hücresi), gerekirse `gider/GiderAlanlari.jsx`
  (ortak `KdvYonuSecici`).
- Testler: `tests/kdv-dahil-0071.test.js`, `tests/ui/kdv-dahil-0071.test.jsx`, ek bloklar `tests/ui/gider-settings`,
  `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx` (yeni ekranlar), `docs/evidence/0071-*`, `docs/evidence/kanit-eslemesi.json`.
- Belgeler: `CLAUDE.md`.

`serverAuth.cjs`, `merge.js`, izinler, `giderRaporu.js`, `printTemplates.js`, `aramaGider.js`, `utils.extractKDV`,
`kiraHesapla`, `kdvKurus` değişmez.

## 3. Kararlar

Q1 → R6 revizyonu, AC-13, AC-44 · Q2 → R28 · Q3 → R23, AC-39 · Q4 → R24, AC-40 · Q5 → R25, AC-41 · Q6 → R26, AC-42 ·
Q7 → R27, AC-43.

## 4. Adım sırası

1. Taban çekimi (main durumu, 270 ekran × 2 tema): `docs/evidence/0071-taban-piksel-raporu.json`.
2. Motor + motor testleri; `gider.test.js`, `makina-maliyeti.test.js`, `gider-kdv-capraz.test.js` dokunulmadan yeşil.
3. Veritabanı dört nokta + roundtrip / temiz kurulum.
4. Gider formu → tanım ekranı → kalem listesi; arayüz testleri.
5. Kaynak taraması (AC-15), tam takım, Electron testleri, lint.
6. Görsel kanıt, `kanit-eslemesi.json`, `CLAUDE.md`.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, 2, 6, 7, 11, 14, 39, 43 | `ui/kdv-dahil-0071` (form) |
| AC-3, 4, 5 | `kdv-dahil-0071` (motor) + `ui/kdv-dahil-0071` (fark satırı) |
| AC-8, 9, 44 | `kdv-dahil-0071` (`tekrarlayanUret`) + `ui/gider-settings` (seçici) |
| AC-10, 17, 18, 40, 41 | `ui/gider-settings` 0071 bloğu |
| AC-12, 13 | `kdv-dahil-0071` + `ui/kdv-dahil-0071` (kira özeti) |
| AC-15 | `kdv-dahil-0071` kaynak taraması |
| AC-16 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-19, 20, 25, 26, 32 | `kdv-dahil-0071` (motor) |
| AC-21, 22, 23, 24, 31, 33, 42 | `ui/kdv-dahil-0071` (liste, süzgeç, form) |
| AC-27, 28, 29, 30 | `kdv-dahil-0071` (borç, hatırlatıcı, açık kalemler, rapor, yöntem kırılımı) |
| AC-34 | `kdv-dahil-0071` (`giderKasaRaporu` HTML) |
| AC-35, 36, 37, 38 | mevcut üç dosya dokunulmadan yeşil; çıktı karşılaştırması; değişmeyen dosyaların diff'i boş |

## 6. Uygulama notları

- **Tek sıfır kuralı:** `gider.sifirTutarSerbestMi(dav)` (yalnız normal); kalem doğrulaması ve tanım ekranı onu çağırır. Tanım
  ekranındaki `dav === DAVRANIS.NORMAL` satırları yalnız atama kapılarıdır (spec 0020 X5 taraması iki kapı sayar).
- **AC-33 ölçümü:** kalanı sıfır olan kalemin türetilmiş durumu **"ödenmemiş"** (`odendi: false`, `odemeDurumu` "odenmedi");
  "Ödenmemiş" süzgecinde görünür, "Ödenmiş"te görünmez. Liste hücresi R26 ile "—" yazar.
- **AC-29 için tek motor değişikliği:** `hesaplaGiderRaporu` ödenmemiş toplamına ve sayısına yalnız tutarı sıfırdan büyük kalemi
  katar (`else if (tut > 0)`). Sıfır kalem tutarı zaten 0 olduğu için toplam değişmezdi; yalnız kartın "n kalem" sayısı
  değişiyordu. Tutarlı kalemde çıktı aynı (AC-35: `gider.test.js`, `makina-maliyeti.test.js`, `gider-kdv-capraz.test.js`
  dokunulmadan yeşil).
- **AC-34:** raporun para biçimi `fmtCur` ("₺0"); sıfır kalem kalem listesinde tutarıyla ve bugünkü "Ödenmedi" durumuyla basılır,
  rozet basılmaz (C7).
- **Form:** tutar alanı tek (R23); KDV ileri yönde `kalemKdv` (C8), dâhil girişte `kdvAyir`; yuvarlama farkı satırı
  `kdv-yuvarlama-farki` ("KDV hariç tutar ile KDV toplamı, girilen X tutarından Y fazla/az"; kirada da aynı cümle).
- **Okuma:** boş `kdvYonu` blob'a yazılmaz (alanı tanımayan istemcinin blob'u sunucu karşılaştırmasında değişmiş görünmesin).
- **Güncellenen eski testler (spec atfıyla):** `ui/gider-settings` (normal tanımda sıfır artık serbest; sıfır reddi kira
  tanımında), `ui/acik-kalemler` AC-24 (süzgeç değerleri altı), `ui/form-pencere-boyutu` AC-4 (formda KDV yönü alanı),
  `spec-atiflari` (TASINACAK).
- **Karışık sürüm (triyaj):** güncellenmemiş istemci `kdvYonu`'yu okumaz ve "dâhil" tanımdan girilen tutarı KDV hariç sayarak
  kalem üretir (gider, KDV, kova ve makina maliyeti yaklaşık KDV oranı kadar şişer); güncellenmemiş sunucu PC sütunu bilmediği
  için alanı sessizce düşürür, tanım yeniden yüklenince "hariç" görünür. Göç bu durumu çözemez (0065 emsali: sürüm notu). §7.
- **Görsel kanıt (`docs/evidence/0071-piksel-raporu.json`):** "önce" main `d4f1a7e` durumunda 270 ekran × 2 tema, "sonra" 278 ekran
  (8 yeni `0071` ekranı); 556 görüntünün 501'i 0 piksel. Değişenler gider formu ekranları (tutarın üstünde KDV yönü alanı; kaydırılmış
  form ekranlarında içerik kayar) ve tanım listesi/formu ("KDV hariç girildi" satırı, seçici). Kanıt eşlemesinde `degisti` + TY onayı.
  - Üç ekranın (`yedek-parca-formu-kargo`, `servis-formu-tahsilat-hesap`, `servis-formu-tahsilat-neden`) ilk tabanı eşzamanlı lint
    yükü altında kararsız çizilmişti (83/249 piksel); aynı ekranlar main'den yeniden çekildi ve sonrayla 0 piksel, rapordaki taban
    bunlar (`not` alanı).
  - `uygulama-menu-kasali` karanlık: 37 piksel, kenar çubuğu alt kutularının kenar yumuşatması; kırpılmış karşılaştırmada gözle
    fark yok. main'den iki çekim kendi aralarında, daldan iki çekim kendi aralarında aynı; kenar çubuğuna bu işte dokunulmadı
    (paket farkından doğan çizim zamanlaması). App sözlük eşlemesinde değil.

## 7. Sürüm notu metni

"Gider girerken faturadaki KDV dâhil tutarı olduğu gibi yazabilirsiniz; uygulama KDV'yi kendisi ayırır. Her ay tutarı değişen
tekrarlayan giderler (elektrik, su) tutarsız tanımlanabilir; üretilen kalem listede "Tutar girilmedi" işaretiyle durur ve ödeme
süzgecindeki "Tutar girilmedi" seçeneğiyle toplanır. ÖNEMLİ: önce sunucu bilgisayarı, sonra bütün istemciler güncellenmelidir;
güncelleme bitene kadar tekrarlayan tanımda "KDV dâhil" seçmeyin. Güncellenmemiş bir bilgisayar dâhil tanımdan kalem üretirse
KDV'yi tutara katarak gideri şişirir."
