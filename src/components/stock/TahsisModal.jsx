import { useState, useMemo } from "react";
import { today } from "../../lib/utils";
import { Icon, Btn, Modal, Input, SearchPick } from "../ui";

// Bir yedek parça satışındaki parçaların makinalara tahsis edildiği modal. Hem Stok > Yedek Parça
// Satışı sekmesi hem Kargo Panosu kart detayı bunu kullanır — tek kaynak, ikisi ayrışmaz. Müşteri/makina
// seç + adet gir (kalan kadar), ya da sistemde olmayan makina için serbest metin yaz.
export const TahsisModal = ({ customers = [], kalan, onEkle, onClose, showToast = () => {} }) => {
  const custMap = useMemo(() => { const m = {}; for (const c of customers) m[c.id] = c; return m; }, [customers]);
  const [customerId, setCustomerId] = useState("");
  const [serbest, setSerbest] = useState("");
  const [adet, setAdet] = useState(String(kalan > 0 ? 1 : 0));
  const secili = customerId ? custMap[Number(customerId)] : null;

  const ekle = () => {
    const n = parseInt(adet) || 0;
    if (!(n > 0)) { showToast("Adet 0'dan büyük olmalı.", "err"); return; }
    if (n > kalan) { showToast(`En fazla ${kalan} adet tahsis edebilirsiniz.`, "err"); return; }
    if (!customerId && !serbest.trim()) { showToast("Makina seçin veya serbest yazın.", "err"); return; }
    onEkle({
      miktar: n,
      customerId: customerId ? Number(customerId) : null,
      serialNo: secili?.serialNo || "",
      makinaSerbest: customerId ? "" : serbest.trim(),
      tarih: today(),
    });
  };

  return (
    <Modal title="Makinaya Tahsis Et" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", marginBottom: 12 }}>Bu satıştan tahsis edilebilecek kalan: <strong>{kalan} adet</strong></div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 4 }}>Makina (müşteri)</div>
        {secili ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", border: "2px solid #e85d1a", borderRadius: 8, background: "var(--ambBg3, #fff7ed)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{secili.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{secili.model || "Model yok"}{secili.serialNo ? ` · S/N ${secili.serialNo}` : ""}</div>
            </div>
            <button onClick={() => setCustomerId("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }}><Icon name="close" size={13} /></button>
          </div>
        ) : (
          <SearchPick items={customers} getLabel={c => `${c.name}${c.serialNo ? " · " + c.serialNo : ""}`} getKey={c => c.id}
            placeholder="Firma / model / seri no ara..." onPick={c => { setCustomerId(String(c.id)); setSerbest(""); }} />
        )}
      </div>
      {!customerId && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 4 }}>veya sistemde olmayan makina (serbest)</div>
          <Input value={serbest} onChange={e => setSerbest(e.target.value)} placeholder="örn: Bayi X'in kendi müşterisi, S/N 1234" />
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 4 }}>Adet</div>
        <Input type="number" min="1" max={String(kalan)} value={adet} onChange={e => setAdet(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Vazgeç</Btn>
        <Btn onClick={ekle}><Icon name="check" size={14} /> Tahsis Et</Btn>
      </div>
    </Modal>
  );
};

// Toplam tahsis edilen adet + satışın makina-bağ durumu (bekliyor/kısmi/tam). Stok listesi ve Kargo
// panosu aynı hesabı kullansın diye burada.
export const tahsisToplam = (s) => (s?.tahsisler || []).reduce((t, x) => t + (parseInt(x.miktar) || 0), 0);

// Yedek parça satışının alıcısı: bayi VEYA müşteri (aliciTipi). Legacy kayıtlarda aliciTipi yok → bayi.
export const aliciAd = (s, dealers = [], customers = []) => {
  if (s?.aliciTipi === "musteri") return (customers.find(c => c.id === s.musteriId)?.name) || "(müşteri yok)";
  if (s?.disFirma) return s.disFirmaAd || "(dış firma)"; // anlaşmasız dış firma alıcı (kayıtlı bayi değil)
  return (dealers.find(d => d.id === s?.dealerId)?.name) || "(bayi yok)";
};

// Alıcı türü rozeti (etiket + renk). 3 tür: müşteri (mavi), anlaşmasız servis (mor), bayi (amber).
// Anlaşmasız dış firma (disFirma) artık "BAYİ" değil "ANLAŞMASIZ SERVİS" olarak gösterilir.
export const aliciRozet = (s) => {
  if (s?.aliciTipi === "musteri") return { label: "MÜŞTERİ", bg: "var(--bluBg2, #dbeafe)", color: "var(--blu700, #1d4ed8)" };
  if (s?.disFirma) return { label: "ANLAŞMASIZ SERVİS", bg: "var(--purBg2, #ede9fe)", color: "var(--pur700, #6d28d9)" };
  return { label: "BAYİ", bg: "var(--ambBg2, #fef3c7)", color: "var(--amb800, #92400e)" };
};
