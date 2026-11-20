// Spec 0151: bakiye düzeltme penceresi (R1/7, R1/8, R1/3, R2/2, R5/2, R9–R9/3). Saf motor `kasa.duzeltmePlani` önizlemeyi ve
// doğrulamayı verir; pencere aritmetik yazmaz (Karar 21). Kayıt Kasa'dadır: `onKaydet(form)` en son çizimin verisiyle planı
// yeniden kurar (R1/5, P2) ve hata varsa `{ hatalar }` döner. Kilit Kasa'da tutulur (hesabın `kasa_hesap` kilidi, hesap formu
// ve silme penceresiyle aynı alan; R10/3).
import { useState } from "react";
import { Modal, Field, Btn, Icon, TutarInput, Input } from "../ui";
import { HataMetni, UyariSeridi, Ipucu } from "../tasarim";
import { fmtCur } from "../../lib/utils";
import { tl } from "../../lib/gider";
import { duzeltmePlani, duzeltmeYonAdi, HEDEF_BAKIYE_ETIKETI, HEDEF_BORC_ETIKETI } from "../../lib/kasa";

const SEMBOL = { TRY: "₺", USD: "$", EUR: "€" };
export const DUZELTME_PENCERE_BASLIGI = "Bakiyeyi Düzelt";
export const BUGUNKU_BAKIYE_ETIKETI = "Bugünkü bakiye";
export const BUGUNKU_BORC_ETIKETI = "Bugünkü borç";
export const FARK_ETIKETI = "Yazılacak düzeltme";

export const BakiyeDuzeltPenceresi = ({ hesap, hareketler = [], veri = {}, bugun, onKaydet, onClose }) => {
  const [form, setForm] = useState({ hedef: "", tarih: bugun, aciklama: "" });
  const [hatalar, setHatalar] = useState({});
  const pb = hesap?.paraBirimi || "TRY";
  const kart = hesap?.tur === "kart";
  const para = (k) => fmtCur(tl(k), pb);
  const on = duzeltmePlani(hesap, hareketler, veri, { ...form, bugun });
  const set = (p) => { setForm(f => ({ ...f, ...p })); setHatalar({}); };
  const mevcutMetni = kart ? para(Math.max(0, -on.mevcutK)) : para(on.mevcutK);
  const kaydet = () => {
    const r = onKaydet(form);
    if (r && r.hatalar) setHatalar(r.hatalar);
  };
  // Triyaj (bulgu 2, AC-14): boş hedefin nedeni sessiz bir ipucu olarak hep yazar; yazılmış ama geçersiz ya da eşit hedef hata olarak.
  const bos = String(form.hedef ?? "").trim() === "";
  const hata = (alan) => hatalar[alan] || (!bos && alan === "hedef" ? on.hatalar?.hedef : null);
  return (
    <Modal title={`${DUZELTME_PENCERE_BASLIGI} · ${hesap?.ad || ""} · ${pb}`} onClose={onClose} wide
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Vazgeç</Btn>
        <Btn onClick={kaydet} disabled={!on.ok}><Icon name="check" size={14} /> Kaydet</Btn>
      </>}>
      <div data-testid="bakiye-duzelt-penceresi" style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <div data-testid="duzelt-bugunku" style={{ fontSize: 13 }}>{kart ? BUGUNKU_BORC_ETIKETI : BUGUNKU_BAKIYE_ETIKETI}: <b>{mevcutMetni}</b></div>
        <Field label={kart ? HEDEF_BORC_ETIKETI : HEDEF_BAKIYE_ETIKETI}>
          <TutarInput ariaLabel={kart ? HEDEF_BORC_ETIKETI : HEDEF_BAKIYE_ETIKETI} value={form.hedef} onChange={v => set({ hedef: v })} sym={SEMBOL[pb] || pb} />
          <HataMetni>{hata("hedef")}</HataMetni>
          {bos && !hatalar.hedef && <Ipucu><span data-testid="duzelt-hedef-bos">{on.hatalar?.hedef}</span></Ipucu>}
        </Field>
        {on.farkK != null && on.farkK !== 0 && (
          <div data-testid="duzelt-fark" style={{ fontSize: 13 }}>{FARK_ETIKETI}: <b>{para(Math.abs(on.farkK))}</b> · {duzeltmeYonAdi(on.yon, kart)}</div>
        )}
        {on.uyari && <UyariSeridi aile="uyari" testId="duzelt-negatif">{on.uyari}</UyariSeridi>}
        <Field label="Tarih">
          <Input type="date" aria-label="Düzeltme tarihi" value={form.tarih} max={bugun} onChange={e => set({ tarih: e.target.value })} />
          <HataMetni>{hatalar.tarih || on.hatalar?.tarih}</HataMetni>
        </Field>
        <Field label="Açıklama (isteğe bağlı)">
          <Input aria-label="Düzeltme açıklaması" value={form.aciklama} onChange={e => set({ aciklama: e.target.value })} placeholder="Örn: Banka ekstresiyle mutabakat" />
        </Field>
        {(hatalar.hesap || on.hatalar?.hesap) && <HataMetni>{hatalar.hesap || on.hatalar.hesap}</HataMetni>}
      </div>
    </Modal>
  );
};
