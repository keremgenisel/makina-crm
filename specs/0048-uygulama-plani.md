# 0048 Uygulama Planı: Düzenleme Formunda Ödeme Bölümünün Canlı Olması

| | |
|---|---|
| **Bağlı spec** | `specs/0048-duzenleme-formunda-odeme-bolumu-canli.md` (R2, plan onayıyla onaylandı) |
| **Dal** | `feat/0048-duzenleme-odeme` (`feat/0047-gider-kasa-raporu` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-30: bütün öneriler (Q1–Q11) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/gider.js` | `PERSONEL_BOLUNMEZ_NEDENI` (R7, tek sabit); `personelHedefKirilimi(k, hedef, ikiHedef)` → `{maasK, ekOdemeK}` |
| `src/lib/formOdemesi.js` | `formOdemeHedefleri` nesnesine `odenenK` (ham, R12), `maasK`/`ekOdemeK` (R13; personel dışında `null`); mevcut alanlar aynen (AC-28). Yeni saf `duzenlemeOdemeDurumu` (R4, R5, R12, R14, R15, R16 kararları) |
| `src/components/GiderForm.jsx` | Düzenleme dalı canlı önizleme kalemini gerçek kimlikle `odemeleriUygula`'dan geçirir (Q1) ve `duzenlemeOdemeDurumu`'nu çağırır; bölünmezlik ipucusu sabitten |
| `src/components/gider/OdemeFormSatirlari.jsx` | `OdemeDurumSatirlari`: üst notlar, kırılım ipucusu, aşım, "Kaydedince ödenebilir", kaybolan hedef satırı; `OdemeFormSatirlari` değişmez (R9) |
| `src/components/Giderler.jsx` | Forma hareket bölümünün varlığı (Q7) |
| Testler | yeni `tests/duzenleme-odeme.test.js`, `tests/ui/gider-form-duzenleme-odeme.test.jsx`; `ui/gider-form-odeme` aynen (AC-28) |
| `scripts/evidence/0009-sayfa.jsx`, `CLAUDE.md` | Kanıt ekranları; 0046 bölümüne not |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Ödenen tutar: canlı önizleme kalemi (gerçek `id`) kayıtlı hareketlerle `odemeleriUygula`'dan geçer; form durumundaki `_odenen`/`odendi` taşınmaz |
| Q2 | Motor değişmez; aşım satırsız kalemde ibare, satırlı kalemde plan hatası (R14 dalı) |
| Q3 | Taksit yapısı kayıttakiyle aynı hedefte düğme korunur; değişmiş ya da yeni hedefte "Kaydedince ödenebilir" |
| Q4 | Aşım = kayıtlı hedefin ham `odenenK`'sı − canlı `toplamK` |
| Q5 | Canlıda olmayan, kayıtta ödeme almış hedef için ayrı aşım satırı |
| Q6 | Tür uyarısı davranış değişince ve kayıtlı ödeme varken |
| Q7 | Hareket bölümü yoksa saklı durum taşınır |
| Q8 | Kırılım ipucusu yalnız ek ödeme varken |
| Q9 | Yeni kalem kipi aynen |
| Q10 | Kararlar saf `duzenlemeOdemeDurumu`'da; form yalnız çizer |
| Q11 | Yeni kanıt ekranları; değişen mevcut ekran `degisti` + TY onayı |

## 3. Adım sırası

1. Motor (sabit, kırılım, hedef genişlemesi, `duzenlemeOdemeDurumu`) ve testleri; 0046 testleri aynen.
2. Bileşen.
3. Form bağlantısı.
4. Arayüz testleri, tam paket, lint.
5. Görsel kanıt, TY onayı, belgeler.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-3, AC-4, AC-10, AC-15 | `ui/gider-form-duzenleme-odeme` + `duzenleme-odeme.test` |
| AC-5, AC-17, AC-18 | `duzenleme-odeme.test` (Q1) + arayüz |
| AC-6, AC-22, AC-26 | `duzenleme-odeme.test` + arayüz |
| AC-7, AC-19, AC-20, AC-21 | `duzenleme-odeme.test` (Q3 kuralı) + arayüz |
| AC-8, AC-13, AC-28 | `ui/gider-form-odeme` aynen + `ui/gider-form-duzenleme-odeme` |
| AC-9, AC-27 | arayüz + kaynak taraması |
| AC-11, AC-23 | `duzenleme-odeme.test` + arayüz |
| AC-12 | arayüz |
| AC-14, AC-16 | arayüz |
| AC-24 | `duzenleme-odeme.test` + arayüz |
| AC-25 | `duzenleme-odeme.test` + arayüz |

## 5. Uygulama notları
- `formOdemeHedefleri` nesnesine ayrıca `satirSayisi` eklendi (Q3'ün "aynı satır yapısı" ölçütü); eski alanlar aynen.
- `GiderForm`'un `hareketBolumu` prop'u varsayılan `false`: yalnız Giderler (`Array.isArray(hesapHareketleri)`) ve görüntü aracı açar; kalemi doğrudan veren eski bileşen testleri saklı durumla çizmeye devam eder.
- Aşım ibaresi `HataMetni` ile (alan uyarısı sözlük kuralı), kaydı engellemez.
- Triyaj (2026-09-30), bulgu 1: düğme ölçütü satır sayısı değil taksit sayısıdır; satırsız hedef (0 satır) tek satırlı hedefle eşdeğerdir. Göçsüz eski kalemler (0042 öncesi iki hedefli personel, 0021 öncesi stopajlı kira) önizlemede satırlıya döndüğü için hiçbir şey değişmemişken düğme kayboluyordu. Motor ve arayüz testleri eklendi.
- Triyaj bulgu 2: 0046'nın yeni kalem testinin başlığı 0048 AC-13 atfını taşır.
