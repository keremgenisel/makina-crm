import { useState } from "react";
import { today } from "../../lib/utils";
import { CURRENCIES } from "../../lib/constants";
import { bagsizCekDogrula, CEK_TURLERI, BAGSIZ_GELIR_NOTU } from "../../lib/cek";
import { Btn, Field, Input, Select, Modal, Icon } from "../ui";
import { HataMetni, UyariSeridi } from "../tasarim";
import { TutarInput } from "../gider/GiderAlanlari";

// Spec 0049 R1, R3 (Q11; AC-1, AC-2): tahsilata bağlı olmayan alınan çeki portföye elle ekler. Kimden serbest metin ya da
// müşteri. Çek gelir değildir; bilgi şeridi bunu söyler. Doğrulama saf motorda (bagsizCekDogrula).
export const CekEklePenceresi = ({ cekler = [], customers = [], onKaydet, onClose }) => {
  const [form, setForm] = useState({ no: "", banka: "", kesideci: "", tur: "hamiline", tutar: "", currency: "TRY", vadeTarihi: "", tarih: today(), kimden: "", customerId: "" });
  const [hatalar, setHatalar] = useState({});
  const [uyari, setUyari] = useState(null);
  const set = (p) => setForm(f => ({ ...f, ...p }));
  const kaydet = () => {
    const r = bagsizCekDogrula({ ...form, customerId: form.customerId === "" ? null : Number(form.customerId) }, { cekler });
    setUyari(r.uyari);
    if (!r.kayit) { setHatalar(r.hatalar); return; }
    onKaydet(r.kayit);
  };
  return (
    <Modal title="Portföye Çek Ekle" onClose={onClose} maxWidth={640}
      footer={<><Btn variant="ghost" onClick={onClose}>Vazgeç</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Çeki Ekle</Btn></>}>
      <div data-testid="cek-ekle-penceresi">
        <div style={{ marginBottom: 12 }}><UyariSeridi aile="bilgi" testId="bagsiz-gelir-notu">{BAGSIZ_GELIR_NOTU}</UyariSeridi></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Çek numarası *"><Input aria-label="Çek numarası" value={form.no} onChange={e => set({ no: e.target.value })} /><HataMetni>{hatalar.no}</HataMetni></Field>
          <Field label="Banka *"><Input aria-label="Banka" value={form.banka} onChange={e => set({ banka: e.target.value })} /><HataMetni>{hatalar.banka}</HataMetni></Field>
          <Field label="Keşideci"><Input aria-label="Keşideci" value={form.kesideci} onChange={e => set({ kesideci: e.target.value })} /></Field>
          <Field label="Tür"><Select aria-label="Çek türü" value={form.tur} onChange={e => set({ tur: e.target.value })}>{CEK_TURLERI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
          <Field label="Tutar *"><TutarInput ariaLabel="Çek tutarı" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hatalar.tutar} /><HataMetni>{hatalar.tutar}</HataMetni></Field>
          <Field label="Para birimi"><Select aria-label="Para birimi" value={form.currency} onChange={e => set({ currency: e.target.value })}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Vade *"><Input aria-label="Vade" type="date" value={form.vadeTarihi} onChange={e => set({ vadeTarihi: e.target.value })} /><HataMetni>{hatalar.vadeTarihi}</HataMetni></Field>
          <Field label="Alınma tarihi *"><Input aria-label="Alınma tarihi" type="date" value={form.tarih} onChange={e => set({ tarih: e.target.value })} /><HataMetni>{hatalar.tarih}</HataMetni></Field>
          <Field label="Müşteri"><Select aria-label="Müşteri" value={form.customerId} onChange={e => set({ customerId: e.target.value })}>
            <option value="">Müşteri değil</option>{customers.filter(c => !c.deletedAt).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          {form.customerId === "" && <Field label="Kimden alındı *"><Input aria-label="Kimden alındı" value={form.kimden} onChange={e => set({ kimden: e.target.value })} placeholder="Unvan ya da ad" /><HataMetni>{hatalar.kimden}</HataMetni></Field>}
        </div>
        {uyari && <div style={{ marginTop: 10 }}><UyariSeridi aile="uyari" testId="cek-ekle-uyari">{uyari}</UyariSeridi></div>}
      </div>
    </Modal>
  );
};
