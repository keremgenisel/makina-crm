import { useState } from "react";
import { fmtTR } from "../../lib/utils";
import { hareketTipAdi, iadeMi, MUTLAK_TIPLER } from "../../lib/stokHareketi";
import { logAction } from "../../lib/audit";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { useKilitListesi } from "../../hooks/useKilitListesi";
import { useBugun } from "../../hooks/useBugun";
import { setGeriAlPlani, hazirlamaGeriAlindiMi, setHareketleriniUygula, SET_GIRIS_TIPI, GERI_AL_DUGMESI, GERI_ALINDI_IBARESI,
  setParcalaGeriAlPlani, parcalamaGeriAlindiMi, SET_CIKIS_TIPI } from "../../lib/setUretimi";
import { Btn, Modal } from "../ui";
import { KartBolum, BosDurum, Ipucu, UyariSeridi } from "../tasarim";

// Spec 0065 R8, R18 (AC-25): bir parçanın stok hareketleri. Karşı hareket (iade) okunur adıyla ve notuyla görünür; sayım
// düzeltmesi mutlak değerdir ("= n"). Yazdırılmaz, satırlar düzenlenmez.
// Spec 0121 R25, R25/2 (Karar 41, 44, 45): tek yazma noktası setin kendi `set_girisi` satırındaki "Geri Al" düğmesidir; yalnız
// `stock_parca_edit` ile çizilir (pencerenin kendisi kapısız). Tıklamada setin `partstock` kilidine anlık bakılır; ya hep ya hiç
// reddinin nedeni pencerenin üstünde yazar. Geri alınmış hazırlamada düğme yerine ibare.
const miktarMetni = (l) => {
  const n = Number(l.miktar) || 0;
  if (MUTLAK_TIPLER.has(l.tip)) return `= ${n}`;
  return n > 0 ? `+${n}` : String(n);
};

export const StokHareketleriPenceresi = ({ part, partStockLog = [], onClose, partStock = [], setPartStock = null, setPartStockLog = null,
  canDoStock = () => true, aktifKullanici = null, showToast = () => {}, serverPermissions = null }) => {
  const bugun = useBugun();
  const { baskasiKilitli } = useKilitListesi(aktifKullanici);
  const [hata, setHata] = useState(null);
  const geriAlabilir = canDoStock("stock_parca_edit") && !!setPartStock && !!setPartStockLog;
  const geriAl = (l) => {
    const kilit = baskasiKilitli("partstock", String(part.id));
    if (kilit) { showToast(kilitRedMesaji(kilit), "err"); return; }
    const plan = setGeriAlPlani({ islemId: l.referansId, partStock, partStockLog, tarih: bugun });
    if (plan.etkisiz) return;
    if (!plan.ok) { setHata(plan.hata); return; }
    setHata(null);
    setHareketleriniUygula(setPartStock, setPartStockLog, plan.hareketler);
    logAction({ serverPermissions, action: "set_geri_alindi", entity: "stok_parca", entityId: Number(part.id), entityName: part.ad, detail: { adet: Math.abs(Number(l.miktar) || 0) } });
    showToast("Set hazırlama geri alındı.");
  };
  // Spec 0130 R10–R13, R17, R19 (Karar 5): parçalamanın geri alınması; düğme yalnız setin kendi `set_parcalama` satırında.
  const parcalamaGeriAl = (l) => {
    const kilit = baskasiKilitli("partstock", String(part.id));
    if (kilit) { showToast(kilitRedMesaji(kilit), "err"); return; }
    const plan = setParcalaGeriAlPlani({ islemId: l.referansId, partStock, partStockLog, tarih: bugun });
    if (plan.etkisiz) return;
    if (!plan.ok) { setHata(plan.hata); return; }
    setHata(null);
    setHareketleriniUygula(setPartStock, setPartStockLog, plan.hareketler);
    logAction({ serverPermissions, action: "set_parcalama_geri_alindi", entity: "stok_parca", entityId: Number(part.id), entityName: part.ad, detail: { adet: Math.abs(Number(l.miktar) || 0) } });
    showToast("Set parçalama geri alındı.");
  };
  const satirlar = (partStockLog || [])
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l && String(l.partId) === String(part?.id))
    .sort((a, b) => String(b.l.tarih || "").localeCompare(String(a.l.tarih || "")) || b.i - a.i)
    .map(({ l }) => l);
  return (
    <Modal title={`Stok Hareketleri · ${part?.ad || "Parça"}`} onClose={onClose} wide
      footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="stok-hareketleri" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Ipucu>Saat tutulmadığı için aynı gündeki hareketlerin sırası kesin değildir. Sayım düzeltmesi adedi doğrudan o değere çeker.</Ipucu>
        {hata && <UyariSeridi aile="hata" testId="set-geri-al-red">{hata}</UyariSeridi>}
        {satirlar.length === 0 ? (
          <BosDurum testId="bos-stok-hareketi" baslik="Bu parçanın kayıtlı stok hareketi yok" />
        ) : (
          <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--n100, #f8fafc)" }}>
                  {["Tarih", "Hareket", "Miktar", "Not", ""].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Miktar" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satirlar.map(l => (
                  <tr key={l.id} data-testid="stok-hareket-satiri" style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, whiteSpace: "nowrap" }}>{l.tarih ? fmtTR(l.tarih) : "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: iadeMi(l.tip) ? 700 : 500, color: iadeMi(l.tip) ? "var(--grn700, #15803d)" : "var(--n900, #0f172a)" }}>{hareketTipAdi(l.tip)}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}>{miktarMetni(l)}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--n600, #475569)" }}>{l.notlar || "—"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {l.tip === SET_GIRIS_TIPI && (hazirlamaGeriAlindiMi(partStockLog, l.referansId)
                        ? <span data-testid="set-geri-alindi" style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{GERI_ALINDI_IBARESI}</span>
                        : geriAlabilir && <Btn small variant="ghost" onClick={() => geriAl(l)} testId="set-geri-al">{GERI_AL_DUGMESI}</Btn>)}
                      {l.tip === SET_CIKIS_TIPI && (parcalamaGeriAlindiMi(partStockLog, l.referansId)
                        ? <span data-testid="parcalama-geri-alindi" style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{GERI_ALINDI_IBARESI}</span>
                        : geriAlabilir && <Btn small variant="ghost" onClick={() => parcalamaGeriAl(l)} testId="parcalama-geri-al">{GERI_AL_DUGMESI}</Btn>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KartBolum>
        )}
      </div>
    </Modal>
  );
};
