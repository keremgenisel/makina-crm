// @vitest-environment jsdom
// Spec 0050: Gider ve Kasa form pencerelerinin boyutu. Değerler burada (gerçek bileşen, pencere kabının stili); gerçek
// yerleşim tests/form-pencere-yerlesim.test.js'te Electron'da ölçülür (R13).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { GiderForm } from "../../src/components/GiderForm";
import { OdemeKayitPenceresi } from "../../src/components/gider/OdemeKayitPenceresi";
import { OdemePlaniPenceresi } from "../../src/components/gider/OdemePlaniPenceresi";
import { EkstrePenceresi } from "../../src/components/gider/EkstrePenceresi";
import { CiroPenceresi } from "../../src/components/cek/CiroPenceresi";
import { CekEklePenceresi } from "../../src/components/cek/CekEklePenceresi";
import { ConfirmDialog } from "../../src/components/ui";
import { turHaritasi } from "../../src/lib/gider";

afterEach(cleanup);
const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const kap = () => document.querySelector(".modal-backdrop > div");
const boyut = () => ({ w: kap().style.maxWidth, h: kap().style.maxHeight });
const GENIS = { w: "900px", h: "94vh" };
const KALEM = { id: 1, tarih: "2026-09-01", turId: 4, tutar: 5000, kdvOrani: 0, tedarikciId: 11 };

describe("Spec 0050: Sınıf 1 pencereleri tek geniş boyutta (bileşen)", () => {
  const pencereler = [
    ["Gider formu (yeni, kira dışı)", () => <GiderForm kalem={null} giderTurleri={TURLER} onSave={vi.fn()} onCancel={vi.fn()} />],
    ["Gider formu (düzenle)", () => <GiderForm kalem={KALEM} giderTurleri={TURLER} onSave={vi.fn()} onCancel={vi.fn()} />],
    ["Gider formu (kira)", () => <GiderForm kalem={{ ...KALEM, turId: 1 }} giderTurleri={TURLER} onSave={vi.fn()} onCancel={vi.fn()} />],
    ["Ödeme Kaydet", () => <OdemeKayitPenceresi kalem={KALEM} davranis="normal" turAd="Hammadde" turMap={turMap} hareketler={[]} hesaplar={[]} odemeYetkisi bugun="2026-09-30" onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} />],
    ["Ödeme Planı", () => <OdemePlaniPenceresi kalem={{ ...KALEM, taksitler: [{ id: 1, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 5000 }] }} davranis="normal" onClose={vi.fn()} />],
    ["Ekstre", () => <EkstrePenceresi baslik="X" tur="tedarikci" hesapla={() => ({ satirlar: [], sonBakiyeK: 0 })} onClose={vi.fn()} />],
    ["Çeki Ciro Et", () => <CiroPenceresi satir={{ cek: { id: 1, no: "1", banka: "Z" }, tutarK: 100000, currency: "TRY", vade: "" }} giderTurleri={TURLER} onKaydet={vi.fn()} onClose={vi.fn()} />],
    ["Kendi Çekimizi Yaz", () => <CiroPenceresi kip="kendi" giderTurleri={TURLER} onKaydet={vi.fn()} onClose={vi.fn()} />],
    ["Portföye Çek Ekle", () => <CekEklePenceresi onKaydet={vi.fn()} onClose={vi.fn()} />],
  ];
  for (const [ad, ciz] of pencereler) {
    it(`AC-1 / AC-2 / AC-16 / AC-17 / AC-18: ${ad} 900 genişlik, 94vh yükseklik`, () => {
      render(ciz());
      expect(boyut()).toEqual(GENIS);
    });
  }
  it("AC-6: onay penceresi bugünkü küçük boyutunda (400)", () => {
    render(<ConfirmDialog title="Silinsin mi?" message="x" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Silinsin mi?").closest("div[style*='max-width']").style.maxWidth).toBe("400px");
  });
  it("AC-4 / AC-5: genişleyen gider formunda alan sırası aynı; kaydedilen kalem birebir aynı", () => {
    const onSave = vi.fn();
    render(<GiderForm kalem={null} giderTurleri={TURLER} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "4" } });
    const etiketler = [...document.querySelectorAll("label")].map(l => l.textContent.trim()).filter(Boolean).slice(0, 7);
    // Spec 0071 R1 ile güncellendi: tutarın üstünde KDV yönü seçicisi; diğer alanların sırası aynı.
    expect(etiketler).toEqual(["Tarih *", "Gider türü *", "Tedarikçi", "Açıklama", "Tutar KDV hariç mi, dâhil mi?", "Tutar (KDV hariç) *", "KDV oranı"]);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "20" } });
    fireEvent.click(screen.getAllByText("Kaydet").filter(e => e.closest("button")).pop());
    const k = onSave.mock.calls[0][0];
    expect({ turId: k.turId, tutar: k.tutar, kdvOrani: k.kdvOrani, tedarikciId: k.tedarikciId, odendi: k.odendi }).toEqual({ turId: 4, tutar: 1000, kdvOrani: 20, tedarikciId: null, odendi: false });
  });
});

// AC-15 (Q3): pencere bazında kaynak taraması. Sınıf 1 açılışı `wide` taşır, maxWidth/maxHeight taşımaz; Sınıf 2 kendi sayısında.
const acilis = (dosya, baslik) => {
  const s = readFileSync(dosya, "utf-8");
  const i = s.indexOf(baslik);
  expect(i, `${dosya}: ${baslik}`).toBeGreaterThan(-1);
  const bas = s.lastIndexOf("<Modal", i);
  return s.slice(bas, s.indexOf("\n", bas)); // açılış satırı (boyut özellikleri bu satırda)
};
// Spec 0073 ile güncellendi: virman, avans ve ödeme penceresinin başlığı düzenleme kipine göre değişir (title={…}); arama
// başlık metninin kendisiyle yapılır, açılış satırı aynıdır.
const SINIF1 = [
  ["src/components/GiderForm.jsx", '"Yeni Gider"'], ["src/components/Kasa.jsx", '"Yeni Hesap"'], ["src/components/Kasa.jsx", '"Virmanı Düzenle"'],
  ["src/components/gider/OdemeKayitPenceresi.jsx", '"Ödeme Kaydet"'], ["src/components/kasa/CalisanAvanslari.jsx", '"Avans Ver"'],
  ["src/components/cek/CiroPenceresi.jsx", '"Kendi Çekimizi Yaz"'], ["src/components/cek/CekEklePenceresi.jsx", 'title="Portföye Çek Ekle"'],
  ["src/components/gider/Tedarikciler.jsx", '"Yeni Tedarikçi"'], ["src/components/gider/UretimPartileri.jsx", '"Yeni Üretim Partisi"'],
  ["src/components/gider/OdemePlaniPenceresi.jsx", 'title="Ödeme Planı"'], ["src/components/gider/EkstrePenceresi.jsx", 'Ekstresi`}'],
];
const SINIF2 = [
  ["src/components/cek/CekPortfoyu.jsx", 'title="Verilen Çek Durumu"', 560], ["src/components/cek/CekPortfoyu.jsx", 'title="Verilen Çek Geçmişi"', 600],
  ["src/components/cek/CekPortfoyu.jsx", 'title="Çek Durumu"', 560], ["src/components/cek/CekPortfoyu.jsx", 'title="Çek Geçmişi"', 600],
];
describe("Spec 0050: boyut tek yerde (kaynak taraması)", () => {
  it("AC-15: Sınıf 1 pencereleri yalnız `wide` geçer, maxWidth/maxHeight yazmaz", () => {
    for (const [f, b] of SINIF1) {
      const a = acilis(f, b);
      expect(a, `${f} ${b}`).toMatch(/\bwide\b/);
      expect(a, `${f} ${b}`).not.toMatch(/maxWidth|maxHeight/);
    }
  });
  it("AC-14: Sınıf 2 pencereleri (Verilen ve Alınan Çek Durumu/Geçmişi) bugünkü boyutunda", () => {
    for (const [f, b, w] of SINIF2) expect(acilis(f, b), b).toContain(`maxWidth={${w}}`);
  });
  it("AC-23 / X6: müşteri detay modalının genişliği değişmedi", () => {
    expect(readFileSync("src/components/customers/CustomerDetailModal.jsx", "utf-8")).toContain("<Modal wide maxWidth={1080} title={detailView.name}");
  });
});
