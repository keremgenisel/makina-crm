# 0053 Uygulama Planı: Yöntem Satırın Alanı, Hedef Başına Çok Satır, Çek Her Ödeme Yolundan

| | |
|---|---|
| **Bağlı spec** | `specs/done/0053-odeme-satiri-basina-yontem-ve-cek.md` (R4, plan onayıyla) |
| **Dal** | `feat/0053-odeme-satiri` (`feat/0052-kasa-sekme-izni` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q15) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kasa.js` | `sonKullanilanYontem(hareketler)` (R23; ciro, kendi çek ve boş yöntem hariç, `sonKullanilanHesap` sırası). `cokluOdemeDogrula`'ya hedef katmanı (R6): satırlı kalemde satırlar taksitlerinin hedefine göre toplanır ve hedefin kalanıyla sınanır; mesaj `hedefEtiketi` seçeneğiyle hedefin adını söyler. |
| `src/lib/formOdemesi.js` | Tek giriş fonksiyonu `odemeGirisiHazirla(kalem, baglam)` (R8, R29): satır listesi `{anahtar, hedef, sira, tutar, yontem, hesapId, aciklama, cekId, cekNo, cekHesapId, cekVade}`, kip `odeme`/`mahsup`. Normal satırlar `cokluOdemeDogrula`, ciro `ciroAdaylari`+`ciroPlani`, kendi çek `kendiCekPlani`, mahsup `mahsupDogrula`. Taksit kimliği satırın hedefi ve sırasından kayıt anında çözülür (`satirTaksitId`). Çek satırı aynı hedefteki normal satırlardan sonra kalanı kapatır (Q3). En çok bir çek satırı (R12, AC-43). `formOdemeHedefleri` R30 için `taksitler` listesi taşır. `hepsiniOde` R25. `duzenlemeOdemeDurumu` formda `kaydedinceOdenir` vermez, R30'un taksit planı değişti nedenini verir. `odemeGirisiYaz` ortak yazım (Q8). `formOdemesiHazirla` kalkar. |
| `src/lib/gider.js` | `tekrarlayanUret` yöntemi kopyalamaz (R26). Doğrulama mesajı her zaman "Son ödeme tarihi" (R31). |
| `src/components/gider/OdemeGirisi.jsx` (yeni) | Tek bileşen (R17, `testId="odeme-girisi"`), `kapsam: "form" \| "pencere"`. Hedef başlıkları ve 0048 göstergeleri, hedef başına satırlar, satır ekleme (hedef başına 10), "Hepsini ödendi işaretle" (form), çek yöntemleri (ANA, `ciroYetkisi`), mahsup kipi, kayıtlı ödemeler ve silme (`cekId`'li hareket yönlendirme). |
| `src/components/gider/OdemeKayitPenceresi.jsx` | `Modal` + `OdemeGirisi` (pencere). "Kendi çekiyle öde" ve `onKendiCek` kalkar (R10). Kayıt `{hareketler, cek}` ile. |
| `src/components/gider/OdemeFormSatirlari.jsx` | Kaldırılır. |
| `src/components/GiderForm.jsx` | Yöntem alanı kalkar (R1), vade etiketi (R4), kayıtlı yöntem korunur (R3), ödeme bölümü `OdemeGirisi` (form) yeni kalemde ve düzenlemede, silmeler bekler (Q4), kayıt öncesi doğrulama geçici kimlikle (R24). |
| `src/components/Giderler.jsx` | `kaydet` iki kolda ödeme planını alır; kalem, yeni ve silinen hareketler, çek tek işleyicide (R18, C3). `kendiCekKalemi` yolu kalkar. Pencere yazımı `odemeGirisiYaz`. |
| `src/components/Dashboard.jsx`, `src/App.jsx` | Anasayfa penceresi çek verisini `kasaYetki` ile alır (Q9), yazım `odemeGirisiYaz`. |
| `src/components/settings/SettingsGiderTanimlari.jsx` | Yöntem alanı kalkar, eski değer korunur. |
| `src/components/gider/DonemRaporu.jsx` | "çek vade" → "vade" (R31). |
| Testler | Yeni `tests/odeme-girisi.test.js`, `tests/ui/odeme-girisi.test.jsx`; güncellenenler §5'te. `scripts/tests/server-security.cjs` Q12. |
| Kanıt, belge | `scripts/evidence/0009-sayfa.jsx` ekranları, `docs/evidence/kanit-eslemesi.json` (`degisti` + onay), `CLAUDE.md`. |

## 2. Kararlar

- **Q1 / R30.** Taksitli hedef yeni kalemde pasif; düzenlemede yapı aynıysa taksit seçiciyle açık, değiştiyse pasif ve nedenli.
- **Q2 / R32.** Hedef katmanı `cokluOdemeDogrula`'da; satırsız eski çok hedefli kalemde pencere hedef seçemez (bilinen sınır).
- **Q3.** Çek satırı aynı hedefteki normal satırlardan sonra kalanı kapatır; ciro tutarı = çek ile bu kalanın küçüğü.
- **Q4.** Formda silme Kaydet'e kadar bekler (geri alınabilir), pencerede bugünkü onaylı anında silme.
- **Q5.** Pencere hedefle açılınca o hedefe iner; hedefsiz açılışta bütün hedefler.
- **Q6.** Mahsup kipi formda da (personel, açık avans, kapsamda); bir kayıtta ya ödeme satırları ya tek mahsup.
- **Q7.** Yeni satır `sonKullanilanYontem` + `sonKullanilanHesap`; hareket yoksa yöntem boş.
- **Q8.** Ortak yazım `odemeGirisiYaz`.
- **Q9.** Anasayfa penceresine çek verisi yalnız `kasaYetki` ile.
- **Q10 / R31.** Dönem Raporu ve doğrulama mesajındaki yöntem gösterimi kalkar.
- **Q11.** Eski kalemin ve tanımın yöntem alanı kayıtta aynen geri yazılır; yeni kalemde boş.
- **Q12.** Uçtan uca: düzenleme + yeni ödeme + silinen ödeme tek POST'ta 200.
- **Q13.** Satır kartları pencerenin bugünkü düzeni; form ve pencere `wide`.
- **Q14.** Geri alınan davranışları bekleyen mevcut testler yeni davranışa çevrilir, gerekçe teste yazılır.
- **Q15.** Kanıt ekranları ve `degisti` + onay kayıtları.

## 3. Adım sırası

1. Motor (`kasa.js`, `formOdemesi.js`, `gider.js`) ve motor testleri.
2. `OdemeGirisi` bileşeni; pencere ona inceltilir; Giderler ve Anasayfa pencere yazımı.
3. Form: alan, etiket, ödeme bölümü, düzenleme kaydı.
4. Tanım formu, Dönem Raporu.
5. Mevcut testlerin güncellenmesi, yeni UI testleri, uçtan uca kontrol.
6. Görsel kanıt, kanıt eşlemesi, `CLAUDE.md`, TY onayı.

## 4. Kriter ↔ test eşlemesi

Onaylanan planın tablosu: `tests/odeme-girisi.test.js` (motor: AC-6, 8, 9, 10, 11, 17, 20, 21, 31–34, 38, 39, 41–43, 45, 46), `tests/ui/odeme-girisi.test.jsx` (AC-1, 3–5, 7, 12–16, 18, 19, 22–30, 35–37, 40, 44, 47), `ui/gider-settings` (AC-2), `kanit-eslemesi.test.js` (AC-48), `server-security.cjs` (AC-29 sunucu yanı).

## 5. Uygulama notları

- **Hedef katmanı (R6, Q2):** `cokluOdemeDogrula`'ya ayrı bir "aynı hedefe giden satırların toplamı" katmanı eklenip çıkarıldı: satırlı kalemde her hedef taksitlerinden oluştuğu için taksit katmanı her taksidin toplamını sınırlayınca hedefin toplamı da sınırlanır, ayrı katman hiç tetiklenemez (ölü kod). R6 böyle karşılanır; aşım mesajı hedefin adını (taksitli hedefte "Resmi 2/3. taksit") söyler (AC-42). Hedef başına 10 satır sınırı `odemeGirisiHazirla`'nın hedef hedef çağrısından gelir (AC-41).
- **Pencere hedefe iner (Q5):** Ödeme Planı satırından açılan pencere o satırın hedefini çizer. 0042'nin "tek pencerede Resmi ve Elden" UI testi (AC-21) iki pencereye (ya da düzenleme formuna) çevrildi; aynı kayıtta iki hedef artık formdan girilir (R15).
- **`Btn` `aria-label`:** paylaşılan `ui.jsx` `Btn` `aria-label`'ı iletmiyordu; hedef başına "Başka yöntemle satır ekle" ve "Hepsini ödendi işaretle" düğmelerine ad vermek için isteğe bağlı iletim eklendi (tanımsızken öznitelik yok).
- **Geri alınan davranışları bekleyen testler (Q14):** `ui/gider-form` (alan, "Çek vade tarihi" → AC-1, AC-5, AC-71), `gider.test` AC-71 mesajı, `ui/gider-form-odeme` (0046 R15 "düzenlemede ödeme girişi yok" → 0053 AC-23; "Kendi çekiyle öde" → AC-26/AC-36; triyaj Q7 formdan), `ui/gider-form-duzenleme-odeme` (0048 "Kaydedince ödenebilir" → AC-40; R30), `ui/gider-coklu-odeme` (kalemin varsayılanı → AC-39; ciro yönlendirmesi kalktı), `ui/gider-settings` (0042 tanım alanı → AC-2/AC-4). Motor testleri (`gider-form-odeme`, `cek-0049`, `personel-hedef`) eski hedef haritasını satır listesine çeviren yardımcıyla 0046 beklentilerini yeni motorda aynen sınıyor.
- **Kendi yakaladığım test hatası:** AC-21'in ilk yazımı olmayan bir alanı (`kdvToplam`) karşılaştırıyordu (iki taraf tanımsız, test boş geçiyordu) ve makina maliyetine yanlış parametre veriyordu; 0046 desenine (`toplam`, `indirilecekKdv`, `stopajToplam`, makinaya atanmış kalem) çevrildi.
- **Koruma doğrulaması:** pencerenin çek yetkisi geçici olarak kapatılınca `ui/odeme-girisi`'nden 3 test kırılıyor.
