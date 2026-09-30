# 0046 Uygulama Planı: Gider Formundan Hedef Bazlı Ödeme, Hesap Seçimi ve Çek Cirosu

| | |
|---|---|
| **Bağlı spec** | `specs/done/0046-gider-formundan-hedef-bazli-odeme.md` (R2, plan onayıyla onaylandı) |
| **Dal** | `feat/0046-form-odeme` (`feat/0045-tutar-bicimi` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-29: bütün öneriler (Q1–Q12) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kasa.js` | `tamOdemeHareketleri` kalkar (C2). Yeni saf `formOdemeHedefleri(kalem, turMap)` (çizilecek hedef satırları, `HEDEF_SIRASI` sırası, pasif neden, ciro olur mu), `formOdemesiHazirla(kalem, {...})` (işaretli satırlar `cokluOdemeDogrula`'dan, ciro satırı `ciroAdaylari` + `ciroPlani`'dan), `hepsiniOde` |
| `src/components/GiderForm.jsx` | Eski kutu yerine ödeme bölümü (yeni kalem) ve hedef durum satırları (düzenleme); kayıttan önce doğrulama |
| `src/components/gider/OdemeFormSatirlari.jsx` (yeni) | Satır bileşeni |
| `src/components/Giderler.jsx` | `kaydet(kayit, odemePlani)`: gerçek kimlik + aynı fonksiyon + üç yazım aynı işleyicide; `onHedefOde`; canlı kalem; pencere sırası |
| `src/App.jsx` | `Giderler`'e `cekler`/`setCekler`/`payments` yalnız `kasaYetki` ile |
| `scripts/tests/server-security.cjs` | Tek yazımda yeni kalem + ciro hareketi + çek durumu (AC-22) |
| Belgeler, kanıt | `CLAUDE.md`, `0009-sayfa.jsx` ekranları |
| Testler | yeni `gider-form-odeme.test.js`, `ui/gider-form-odeme.test.jsx`; ek bloklar `server-authz`, `server-security.cjs`; güncellenen `ui/gider-form`, `ui/gider-taksit`, `ui/kasa-app`, `personel-hedef.test.js` |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Form geçici kimlikle doğrular, Giderler gerçek kimlikle aynı saf fonksiyonu yeniden çağırır; üç `set*` aynı işleyicide |
| Q2 | Satır hedefe bağlı; taksit kimliği kayıttaki kalemden çözülür |
| Q3 | `tamOdemeHareketleri` kalkar; AC-40 eski beklentilerle karşılaştırır |
| Q4 | Tek "Ödeme tarihi"; ciro tarihi de odur |
| Q5 | Ciro tutarı salt okunur (çek ile kalanın küçüğü); liste portföy + TL, vade sırası |
| Q6 | Alacaklı kalemden: tedarikçi / çalışan / serbest (ad kutusu) |
| Q7 | Düzenlemede "Ödeme gir" pencereyi formun üstünde açar; form canlı kalemi okur |
| Q8 | Çek verisi Giderler'e yalnız `kasaYetki` ile gelir |
| Q9 | Sunucu değişmez; `server-authz` + gerçek sunucu testi |
| Q10 | "Hepsini ödendi" varsayılan yöntemle doldurur, ciro seçmez; kaldırılınca temizler |
| Q11 | Eski kutuyu arayan testler yeni bölüme çevrilir; kayıt ve bakiye beklentileri aynı |
| Q12 | Değişen ekranlar `degisti` + TY onayı; yeni ekranlar eklenir |

## 3. Adım sırası

1. Motor ve testleri (AC-40, AC-29 dahil).
2. Kayıt yolu ve App bağlantıları.
3. Form arayüzü; eski testlerin güncellenmesi.
4. Sunucu testleri.
5. Görsel kanıt, TY onayı, belgeler.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-4, AC-6, AC-7, AC-8, AC-38 | `gider-form-odeme.test` + `ui/gider-form-odeme` |
| AC-2, AC-3, AC-5, AC-13, AC-14, AC-35 | `ui/gider-form-odeme` |
| AC-9, AC-10, AC-12, AC-31 | `gider-form-odeme.test` + `ui/gider-form-odeme` |
| AC-11, AC-32 | `ui/gider-form-odeme` |
| AC-15, AC-16, AC-18, AC-21, AC-33, AC-39 | `gider-form-odeme.test` + `ui/gider-form-odeme` |
| AC-17, AC-28, AC-29, AC-40 | `gider-form-odeme.test` |
| AC-19, AC-20, AC-23, AC-24, AC-25, AC-26, AC-27, AC-30, AC-34, AC-36, AC-37 | `ui/gider-form-odeme` |
| AC-22 | `server-authz` + `server-security.cjs` + `ui/gider-form-odeme` |

## 5. Uygulama notları

- Motor planda `kasa.js` olarak yazılmıştı; `cek.js` zaten `kasa.js`'i içe aktardığı için döngüsel içe aktarma olmasın diye ayrı saf modül `src/lib/formOdemesi.js`'e kondu. `tamOdemeHareketleri` `kasa.js`'ten kaldırıldı (kaynak taraması AC-40 testinde).
- R22: işaretli satırda boş tutar sessizce atılmasın diye motor boş tutarı "0" olarak `cokluOdemeDogrula`'ya verir; hata `odemeDogrula`'nın "Tutar sıfırdan büyük olmalı." metnidir.
- Ciro fark uyarısı kayıttan önce de görünür: form yalnız ciro satırıyla `formOdemesiHazirla`'yı önizleme kalemiyle çağırıp `uyari`'yı gösterir (R12 metni birebir).
- Denetim kaydı: formdan ciro `ciro_edildi` / `cek` (Çek Portföyü ile aynı eylem ve ad biçimi).
- Görüntü aracına `etiket:` adımı eklendi (aria-label ile onay kutusuna tıklar).
- Güncellenen testler (Q11): `ui/gider-form` (üç test eski kutudan yeni satırlara), `ui/gider-taksit` (AC-6 durum metni), `personel-hedef.test.js` (AC-15 kısayolu `hepsiniOde` + `formOdemesiHazirla`). Kaydedilen hareket beklentileri değişmedi. `ui/kasa-app` eski kutuya dayanmıyordu, değişmedi.
- Triyaj (2026-09-30), bulgu 1: düzenleme formu açıkken pencereden girilen ödeme formun açılıştaki taksit satırlarına yansımıyordu; kayıt eski satırlarla yapılıp "ödenmiş taksit korunur" kuralını (0021 R10, 0024 R18) atlıyordu. Form ödeme durumunu (`taksitler`, satırsızda `odendi`/`odemeTarihi`/`_odenen`) canlı kalemden izler; kullanıcının düzenlediği alanlara dokunulmaz. Test: `ui/gider-form-odeme` "triyaj (Q7)".
- Triyaj bulgu 2: görsel kanıt `0046-piksel-raporu.json` (11 ekran × 2 tema; 6'sı değişen yeni gider formu, 5'i yeni ödeme ekranı), `OdemeFormSatirlari.jsx` kanıt kaydı; TY onayı 2026-09-30.
