// Spec 0140 E: sipariş listesinin belgesi (`lib/siparisRaporu.js`). Tek belge, tedarikçi başına bölüm ve sayfa sonu, sütunlar tek
// yerde, elle düzenlenmiş satır işaretli, kaçış. Spec 0142 ile para sütunları kalktı (AC-16, AC-44, AC-45, AC-90 ters çevrildi).
import { describe, it, expect } from "vitest";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, basilacakBolumler, belgeDurumu, BELGE_SUTUNLARI, ELLE_ISARETI, TOPLAM_BASLIGI } from "../src/lib/siparisRaporu";
import * as F from "./fixtures/0134-veri";

const parcalar = (ek = {}) => [{ ...F.KESME, ...(ek[41] || {}) }, { ...F.PUL, ...(ek[42] || {}) }, { ...F.SOMUN, ...(ek[43] || {}) }, { ...F.SET, ...(ek[44] || {}) }];
const sonuc = (o = {}, secenek = {}) => S.siparisIhtiyaci(F.veri({ parts: parcalar({ 42: { tedarikciId: 13 } }), ...o }), { tedarikciOdakli: true, ...secenek });
const html = (r, o = {}) => siparisRaporuHtml(r, { bugun: "2026-11-09", factory: { name: "Altuntaş Makina", city: "Konya" }, partiAd: "Güz Partisi", ...o });
const bolumSayisi = (h) => (h.match(/class="siparis-bolum"/g) || []).length;

describe("Spec 0140 E: belge", () => {
  it("AC-42: tek tedarikçi seçiliyken belge yalnız o tedarikçinin satırlarını basar", () => {
    const h = html(sonuc({}, { secilenTedarikciler: ["13"] }));
    expect(h).toContain("Beta Metal"); expect(h).toContain("Pul");
    expect(h).not.toContain("Ana Çelik"); expect(bolumSayisi(h)).toBe(1);
  });
  it("AC-43: firma bilgisi, tedarikçi adı, tarih ve girdinin tanımı basılır", () => {
    const h = html(sonuc());
    expect(h).toContain("Altuntaş Makina"); expect(h).toContain("Konya"); expect(h).toContain("Beta Metal");
    expect(h).toContain("09.11.2026"); expect(h).toContain("Üretim partisi: Güz Partisi");
    expect(html(sonuc(), { partiAd: null })).toContain("Elle girilen model satırları");
  });
  // Spec 0142 ile (C1, C7: 0140 B-R4, E-R3/2, E-R4 ve AC-16, AC-44, AC-45, AC-90 ters çevrildi): sütunlar yine tek listeden, ama
  // para sütunu hiç yok ve eski `paraGoster` seçeneği etkisiz (belge her zaman parasız, 0142 A-R6, A-R6/2).
  it("AC-44 / AC-45 / AC-90 / AC-16 (spec 0142 ile): sütunlar tek listeden; para sütunu hiçbir seçenekte basılmaz", () => {
    for (const secenek of [{ paraGoster: true }, { paraGoster: false }, {}]) {
      const h = html(sonuc(), secenek);
      for (const s of [...BELGE_SUTUNLARI.parca, ...BELGE_SUTUNLARI.toplam]) expect(h, s).toContain(s);
      for (const s of ["Birim maliyet", "Birim fiyat", "Tutar"]) expect(h, s).not.toContain(s);
      expect(h).not.toMatch(/\d,\d{2} (TL|\$|€|₺)/);
    }
  });
  // Spec 0142 ile: belge tek parça tablosu ve toplam tablosudur; "Hazır parçalar" ve "Malzemeler" tabloları yoktur.
  it("AC-46 (spec 0142 ile): eski iki tablo basılmaz; bölümde parça tablosu ve toplam tablosu vardır", () => {
    const h = html(sonuc({}, { secilenTedarikciler: ["12"] }));
    expect(h).toContain(TOPLAM_BASLIGI); expect(h).not.toContain("Hazır parçalar"); expect(h).not.toContain(">Malzemeler<");
  });
  it("AC-30 / AC-31 / AC-47: sıfır adetli ve kapatılan satır basılmaz; elle düzenlenmiş satır işaretli", () => {
    expect(html(sonuc({}, { duzenleme: { parca: { 42: { adet: "0" } } } }))).not.toContain("Pul");
    expect(html(sonuc({}, { duzenleme: { parca: { 42: { kapali: true } } } }))).not.toContain("Pul");
    const h = html(sonuc({}, { duzenleme: { parca: { 42: { adet: "120" } } } }));
    expect(h).toContain(`Pul${ELLE_ISARETI}`); expect(h).toContain("120");
  });
  it("AC-48 / AC-91 / AC-92: tek belge, başlık bandı bir kez; ilk bölüm hariç her bölümün üstünde sayfa sonu (iki seçimde de)", () => {
    for (const secim of [[], ["12", "13"]]) {
      const h = html(sonuc({}, { secilenTedarikciler: secim }));
      expect((h.match(/<html/g) || []).length).toBe(1);
      expect((h.match(/SİPARİŞ LİSTESİ/g) || []).length).toBe(1);
      expect(bolumSayisi(h)).toBe(2);
      expect((h.match(/page-break-before:always/g) || []).length).toBe(1);
    }
  });
  it("AC-49 / AC-40: basılacak satır yoksa ya da geçersiz satır varsa belge basılamaz, nedeni döner", () => {
    expect(belgeDurumu(sonuc(), { hata: "H", bos: "B" })).toEqual({ etkin: true, neden: null });
    expect(belgeDurumu(sonuc({ partStock: [{ id: 1, partId: 42, miktar: 9999 }, { id: 2, partId: 41, miktar: 9999 }] }, { secilenTedarikciler: ["13"] }), { hata: "H", bos: "B" }).neden).toBe("B");
    expect(belgeDurumu(sonuc({}, { duzenleme: { parca: { 42: { adet: "-1" } } } }), { hata: "H", bos: "B" }).neden).toBe("H");
    // Triyaj bulgu 3: seçim dışındaki tedarikçinin (Beta Metal, Pul) hatası belgeyi kilitlemez; seçiliyken kilitler.
    expect(belgeDurumu(sonuc({}, { secilenTedarikciler: ["12"], duzenleme: { parca: { 42: { adet: "-1" } } } }), { hata: "H", bos: "B" })).toEqual({ etkin: true, neden: null });
    expect(belgeDurumu(sonuc({}, { secilenTedarikciler: ["13"], duzenleme: { parca: { 42: { adet: "-1" } } } }), { hata: "H", bos: "B" }).neden).toBe("H");
  });
  it("AC-76: silinmiş tedarikçinin bölümü belgeye girmez", () => {
    const r = sonuc({ tedarikciler: [F.TED[1]], hamTedarikciler: [{ id: 12, ad: "Ana Çelik", deletedAt: "2026-09-01" }, F.TED[1]] });
    expect(basilacakBolumler(r).map(x => x.ad)).toEqual(["Beta Metal"]); // spec 0142 ile: dönüş bölümün kendisi
  });
  it("AC-80 / AC-78: MODELLER kutusu basılır; PARÇA İHTİYACI tablosu ve tedarikçisi belirtilmemiş bölümü basılmaz", () => {
    const h = html(sonuc());
    expect(h).toContain("MODELLER"); expect(h).not.toContain("PARÇA İHTİYACI");
    expect(h).not.toContain(S.TEDARIKCI_BELIRTILMEMIS); expect(h).not.toContain("Somun");
  });
  it("AC-50: kullanıcı metinleri kaçışlanır", () => {
    const r = S.siparisIhtiyaci(F.veri({ parts: parcalar({ 42: { ad: "Pul <b>", tedarikciId: 13 } }), tedarikciler: [F.TED[0], { id: 13, ad: "Beta & <Metal>", hammadde: true }] }), { tedarikciOdakli: true });
    const h = html(r, { partiAd: "<script>" });
    expect(h).toContain("Pul &lt;b&gt;"); expect(h).toContain("Beta &amp; &lt;Metal&gt;"); expect(h).toContain("&lt;script&gt;");
    expect(h).not.toContain("<script>"); expect(h).not.toContain("Pul <b>");
  });
});
