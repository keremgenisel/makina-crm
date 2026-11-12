# 0144 Uygulama planı: sipariş belgesinde parça altı malzeme ve fiyatlı nüsha

| | |
|---|---|
| **Spec** | `specs/0144-siparis-belgesi-parca-alti-ve-fiyatli-nusha.md` (revizyon 2) |
| **Onay** | Takım Yöneticisi, 2026-11-12 (on bir öneri onaylandı, spec'e Karar 34–44 olarak işlendi) |
| **Dal** | `feat/0144-siparis-fiyatli` (`15dda61d` üstünde) |
| **Durum** | Uygulandı, commit bekliyor (2026-11-12). Tam takım yeşil (Electron dışı 7430, Electron 25), lint 0 hata, tip denetimi temiz. Kanıt `0144-piksel-raporu.json`: 17 eski pencere ve katalog ekranı 0 piksel, iki eski belge ekranı bilinçli değişti (eşlemede kaydı yok, işaretleme gerekmedi), dört yeni ekran; aynı kodla ikinci çekim 0 fark. Mutasyon ölçümü AC-48'in eksik testini buldu (iki boylu tek parça kesidi), eklendi. Uygulamada `payBoy` adı 0141'in kaldırılan işleme payı alanıyla çakıştığı için `kesirliBoy` oldu. |

## 1. Dosyalar

- **Motor:** `src/lib/siparisIhtiyaci.js`: `belgeBolumleriKur` parça satırına `malzemeSatirlari` (parça ve kesit anahtarı başına pay,
  kesit metni, kapalı, tedarikçisiz, birim fiyat, tutar, neden), `malzemeKalemli`, `parcaTutarlari`, hazır parçada `birimK`/`tutarK`/
  `tutarNeden` (bölüm kurucusunun değeri `partId` haritasıyla, yeniden hesap yok); bölüme `payFarkKg`, `toplamlar`, `toplamTLK`,
  `dovizVar`, `tutarsizSayi`. Yeni metin yardımcıları ve sabitler. Kesit satırları ve `parcalar` dokunulmaz (C2/2).
- **Para biçimi:** `src/lib/malzeme.js` `kiloFiyatMetni` (`kumeOzeti` de çağırır).
- **Belge:** `src/lib/siparisRaporu.js` (`fiyatli` seçeneği, `belgeSutunlari`, fark notu, ibare).
- **Arayüz:** yeni `src/components/rapor/NushaSecPenceresi.jsx`; `rapor/SiparisRaporuDugmesi.jsx` (soru, dosya adı);
  `stock/SiparisPenceresi.jsx` (soru durumu, Escape koruması).
- **Testler:** `tests/fixtures/0144-veri.js`, `0144-belge-once.json` (spec öncesi kodla), `0144-ayikla.js`;
  `siparis-0144` (motor, taramalar), `siparis-raporu-0144` (belge), `siparis-0144-kiyas`, `ui/siparis-0144` (pencere, soru, Escape),
  `ui/siparis-0144-app` (gerçek App). "spec 0144 ile" güncellenenler: `siparis-raporu-0142` AC-8, Yazdır'a tıklayan UI testleri.
- **Kanıt ve belgeler:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0144-*`, `kanit-eslemesi.json`, `CLAUDE.md`, `specs/README.md`.

## 2. Adım sırası

1. Altın önce (kod değişmeden): `0144-veri.js`, `YAZ_0144=1` ile fiyatsız belgenin HTML'i.
2. Motor ve `malzeme.js`; altı kıyas dokunulmadan koşar (AC-74).
3. Belge; AC-42 kıyası.
4. Arayüz; eski UI testlerinde nüsha seçme adımı.
5. Kanıt, `CLAUDE.md`, README; tam takım, lint, mutasyonlar.

## 3. Kararlar (onaylı öneriler)

| No | Konu | Karar | Spec |
|---|---|---|---|
| 34 | C4 ile A-R6 çelişiyor | Kıyas fark notunun sabitini de ayıklar | C4/2 |
| 35 | Seçenek adı | `fiyatli` | C5/2 |
| 36 | Tedarikçisiz satırın tutarı | Parça satırına girer, bölüm toplamına girmez | A-R10/3 |
| 37 | Kapalı kesitin fiyatlı satırı | Birim ve tutar boş, sayaca girmez | A-R9/3 |
| 38 | Elle küçültülen toplam | Not yalnız toplam büyükken | A-R6/3 |
| 39 | Toplam tablosunun boy satırı | Fiyatlıda kilogram eki | B-R4/4 |
| 40 | B-R5/2 ölçütü | Malzeme kalemi var, pay taşıyan satır yok | B-R5/6 |
| 41 | Pencerede para | Yeni alanlar yalnız `belge` dizisinde | C2/2, AC-37 |
| 42 | İç içe Modal | Soru penceresini düğme çizer (sonra çizilen üstte) | B-R1/3 |
| 43 | Kanıt | Değişen eski belge ekranları `degisti`, kapanışta `ayni` | DoD |
| 44 | Beş sütun | Yerleşim ölçütü yok | B-R3/2 |

## 4. Kriter ↔ test

| AC | Test |
|---|---|
| 1–7, 10, 11, 13, 14, 47, 48, 52 (motor), 54, 56, 57; C3 çapraz | `siparis-0144` (motor) |
| 8, 9, 12, 15, 16, 20–35, 40, 43, 49–51, 53, 55, 58–63, 65, 67–72 | `siparis-raporu-0144` |
| 44, 45, 46, 64, 73 | `siparis-0144` taramaları |
| 17–19, 38, 39, 41, 66 | `ui/siparis-0144` |
| 36, 37 | `ui/siparis-0144-app` |
| 42 | `siparis-0144-kiyas` |
| 74 | altı kıyas dosyası dokunulmadan yeşil + `siparis-0144` kesit anahtar kümesi |

## 5. Sürüm notu

Sipariş listesinin belgesinde her parçanın altında o parça için alınacak malzeme (kesit ve miktar) yazar; kesidi birden çok parça
paylaşıyorsa parçanın payı yuvarlanmadan yazılır, yuvarlama ve asgari sipariş yalnız bölümün toplamındadır. "Yazdır" fiyatlı mı
fiyatsız mı diye sorar; fiyatlı nüsha birim fiyat ve tutar sütunları taşır, dosya adının sonunda "Fiyatli" eki vardır ve
tedarikçiye verilmemelidir. Ekranda para yine görünmez.
