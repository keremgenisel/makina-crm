import { useState, useMemo } from "react";
import { logAction } from "../lib/audit";
import { Field, Input, Btn, Modal } from "./ui";
import { HataMetni, Ipucu, BolumBasligi, UyariSeridi } from "./tasarim";
import { maliyetMetniKurus } from "../lib/urunAgaci";
import { kurOnerisi } from "../lib/malzeme";
import { disIslemFormu, disIslemDogrula, fiyatGecmisiYaz, BIRIM_ADI, birimOf } from "../lib/disIslem";
import { disIslemFiyatEtkisi, etkiMetni, fiyatEtkiMetni } from "../lib/disIslemEtkisi";
import { turetilmisFiyatMetni } from "../lib/parcaFiyati";
import { parseMoney } from "../lib/utils";
import { IslemFiyatAlanlari } from "./DisIslemManager";

// Spec 0137 R6–R9/2 (AC-15–AC-25, AC-127): fiyat kümesinin tarihli güncellemesi (malzeme penceresinin ikizi). Etki önizlemesi
// kaydetmeden önce bütün canlı parçalardan; yazım yalnız işleme (parçaya dokunulmaz). Panelin `ayar:disislemler` kilidi altında.
export const FIYAT_PENCERE_BASLIGI = "Dış İşlem Fiyatını Güncelle";
export const GECERLILIK_IPUCU = "Bu tarihten önceki tarihli maliyet sorguları eski fiyatla kalır; bugünden sonraki tarih seçilemez.";
export const ORNEK_SATIR = 5;
const FIYAT_ANAHTARLARI = ["birimFiyati", "paraBirimi", "kur"];

export const DisIslemFiyatPenceresi = ({ islem, disIslemler = [], setDisIslemler, parts = [], malzemeler = [], rates = null, ratesErr = false, bugun, onClose,
  fiyatAyarlari = null, showToast = () => {}, serverPermissions = null }) => {
  const [form, setForm] = useState(() => {
    const f = disIslemFormu(islem);
    // R7, AC-15: kur alanı KAYITLI kurla açılır; kayıtlı kur yoksa günün kuru öneri olarak gelir (0132 Karar 41).
    if (!(f.paraBirimi === "USD" || f.paraBirimi === "EUR") || String(f.kur || "").trim()) return f;
    const o = kurOnerisi(f.paraBirimi, rates, ratesErr);
    return { ...f, kur: o.deger ? String(o.deger).replace(".", ",") : "" };
  });
  const [tarih, setTarih] = useState(bugun || "");
  const [hatalar, setHatalar] = useState({});
  const set = (alan, v) => setForm(f => ({ ...f, [alan]: v }));
  // Pencere birim ve adı değiştirmez; doğrulama kayıttaki birimle (R2/2: birim kümeye girmez).
  const v = useMemo(() => disIslemDogrula({ ...form, ad: islem.ad, birim: birimOf(islem) }, disIslemler, islem.id), [form, disIslemler, islem]);
  const yeni = useMemo(() => {
    if (!v.gecerli) return null;
    const o = { ...islem };
    for (const a of FIYAT_ANAHTARLARI) { if (v.kayit[a] === undefined) delete o[a]; else o[a] = v.kayit[a]; }
    return o;
  }, [v, islem]);
  const etki = useMemo(() => (yeni ? disIslemFiyatEtkisi(islem, yeni, parts, { disIslemler, malzemeler, fiyatAyarlari }) : null), [yeni, islem, parts, disIslemler, malzemeler, fiyatAyarlari]);

  const kaydet = () => {
    if (!v.gecerli) { setHatalar(v.hatalar); return; }
    const r = fiyatGecmisiYaz(islem, yeni, { tarih, bugun });
    if (r.hata) { setHatalar({ tarih: r.hata }); return; }
    const kayit = { ...yeni, ...(r.gecmis.length ? { fiyatGecmisi: r.gecmis } : {}) };
    if (!r.gecmis.length) delete kayit.fiyatGecmisi;
    setDisIslemler(p => p.map(m => (String(m.id) === String(islem.id) ? kayit : m)));
    logAction({ serverPermissions, action: "fiyat_guncellendi", entity: "dis_islem", entityId: islem.id, entityName: islem.ad, detail: { gecerli: tarih, degisen: etki?.degisen ?? 0 } });
    onClose();
    showToast(etki?.degisen ? `Fiyat güncellendi; ${etki.degisen} parçanın maliyeti yeni fiyatla okunuyor.` : "Fiyat güncellendi.");
  };

  return (
    <Modal title={FIYAT_PENCERE_BASLIGI} onClose={onClose} wide
      footer={<><Btn variant="ghost" onClick={onClose}>Vazgeç</Btn><Btn onClick={kaydet}>Fiyatı Kaydet</Btn></>}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{islem.ad} · {BIRIM_ADI[birimOf(islem)].toLocaleLowerCase("tr-TR")}</div>
      <IslemFiyatAlanlari form={{ ...form, birim: birimOf(islem) }} set={set} hatalar={hatalar} rates={rates} ratesErr={ratesErr} />
      <Field label="Geçerlilik tarihi">
        <Input type="date" value={tarih} max={bugun} onChange={e => setTarih(e.target.value)} aria-label="Geçerlilik tarihi" />
        <HataMetni>{hatalar.tarih}</HataMetni>
        <Ipucu>{GECERLILIK_IPUCU}</Ipucu>
      </Field>
      <BolumBasligi ust>Etkisi</BolumBasligi>
      {!etki ? <Ipucu>Alanlardaki hata düzelince etki burada görünür.</Ipucu> : (
        <div data-testid="fiyat-etkisi">
          <UyariSeridi aile={etki.degisen ? "uyari" : "bilgi"}><span data-testid="fiyat-etki-metni">{etkiMetni(etki)}</span></UyariSeridi>
          {/* R8/2, AC-127: satış fiyatı özeti (fiyatı değişen parça sayısı, sıfır dahil). */}
          {etki.bagli > 0 && <div data-testid="fiyat-etki-satis" style={{ fontSize: 12.5, marginTop: 6, color: "var(--n600, #475569)" }}>{fiyatEtkiMetni(etki)}</div>}
          {etki.satirlar.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginTop: 8 }}>
              <thead><tr style={{ color: "var(--n500, #64748b)", textAlign: "left" }}><th style={{ padding: "4px 6px" }}>Parça</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Eski maliyet</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Yeni maliyet</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Eski fiyat</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Yeni fiyat</th></tr></thead>
              <tbody>{etki.satirlar.slice(0, ORNEK_SATIR).map(s => (
                <tr key={s.id} data-testid="fiyat-etki-satiri" style={{ borderTop: "1px solid var(--n100, #f1f5f9)" }}>
                  <td style={{ padding: "4px 6px" }}>{s.ad}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>{maliyetMetniKurus(s.once)}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{maliyetMetniKurus(s.sonra)}</td>
                  <td data-testid="fiyat-etki-eski-fiyat" style={{ padding: "4px 6px", textAlign: "right" }}>{s.oncekiFiyat === "" || s.oncekiFiyat == null ? "—" : turetilmisFiyatMetni(parseMoney(s.oncekiFiyat))}</td>
                  <td data-testid="fiyat-etki-yeni-fiyat" style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{s.yeniFiyat === "" || s.yeniFiyat == null ? "—" : turetilmisFiyatMetni(parseMoney(s.yeniFiyat))}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      )}
    </Modal>
  );
};
