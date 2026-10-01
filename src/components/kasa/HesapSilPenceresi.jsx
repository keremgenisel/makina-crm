import { useState } from "react";
import { Modal, Btn, Field, Select, Icon } from "../ui";
import { Segment, HataMetni, Ipucu, UyariSeridi, BolumBasligi } from "../tasarim";
import { HESAP_TUR_AD } from "../../lib/kasa";

// Spec 0056 B (R6–R11, R17–R27): deneme döneminde hareketi olan kasa hesabının silinmesi. Bağlı kayıtlar türüyle sayılır;
// iki yol: başka hesaba taşı (varsayılan) ya da hesapsız bırak. Kurallar ve güncelleyiciler saf kasa.hesapTasimaPlani'dan;
// pencere yalnız seçer ve gösterir. Veri girme penceresi olduğu için `wide` (0050, plan Q2).
export const HESAP_ACILIS_TASINMAZ = "Silinen hesabın açılış bakiyesi taşınmaz; gerekirse hedef hesabın açılış bakiyesini güncelleyin.";
export const HESAPSIZ_BIRAK_ACIKLAMA = "Kayıtlar silinmez; hesabı belirtilmemiş kayıt listelerine düşer ve oradan yeniden hesaba atanabilir.";
const TUR_AD = { odeme: "Gider ödemesi", virman: "Virman", avans: "Çalışan avansı", diger: "Diğer hareket", payments: "Makina tahsilatı",
  servis: "Servis tahsilatı", kalip: "Extra Kalıp tahsilatı", yedekParca: "Yedek parça tahsilatı", verilenCek: "Verilen çek" };
const SIRA = ["odeme", "virman", "avans", "diger", "payments", "servis", "kalip", "yedekParca", "verilenCek"];

export const HesapSilPenceresi = ({ hesap, plan, onTasi, onHesapsiz, onClose }) => {
  const toplam = plan.detay.toplam;
  const [yol, setYol] = useState(plan.uygunHedefler.length ? "tasi" : "hesapsiz");
  const [hedef, setHedef] = useState(plan.uygunHedefler[0]?.id ?? "");
  const engel = toplam === 0 ? [] : yol === "tasi" ? plan.nedenler.tasi : plan.nedenler.hesapsiz;
  const silinebilir = toplam === 0 || (!engel.length && (yol === "hesapsiz" || hedef !== ""));
  const onayla = () => {
    if (!silinebilir) return;
    if (toplam === 0 || yol === "hesapsiz") onHesapsiz();
    else onTasi(plan.uygunHedefler.find(h => String(h.id) === String(hedef))?.id ?? null);
  };
  return (
    <Modal title={`Hesabı Sil: ${hesap.ad}`} onClose={onClose} wide
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Vazgeç</Btn>
        <Btn variant="danger" onClick={onayla} disabled={!silinebilir}><Icon name="trash" size={14} /> Hesabı Sil</Btn>
      </>}>
      <div data-testid="hesap-sil-penceresi">
        {toplam === 0 ? (
          <p style={{ fontSize: 13 }}>“{hesap.ad}” hesabının hiç hareketi yok; kalıcı olarak silinecek.</p>
        ) : (<>
          <BolumBasligi>Bu hesaba bağlı kayıtlar</BolumBasligi>
          <ul data-testid="hesap-sil-sayim" style={{ margin: "6px 0 12px", paddingLeft: 18, fontSize: 13 }}>
            {SIRA.filter(k => plan.detay[k] > 0).map(k => <li key={k}>{TUR_AD[k]}: <b>{plan.detay[k]}</b></li>)}
          </ul>
          <Field label="Bağlı kayıtlar ne olsun?">
            <Segment ariaLabel="Bağlı kayıtlar" kip="dugme" value={yol} onChange={setYol}
              options={[{ value: "tasi", label: "Başka hesaba taşı" }, { value: "hesapsiz", label: "Hesapsız bırak" }]} />
          </Field>
          {yol === "tasi" && plan.uygunHedefler.length > 0 && (
            <div style={{ maxWidth: 360, marginTop: 8 }}>
              <Field label="Taşınacak hesap">
                <Select aria-label="Taşınacak hesap" value={hedef} onChange={e => setHedef(e.target.value)}>
                  {plan.uygunHedefler.map(h => <option key={h.id} value={h.id}>{h.ad} ({HESAP_TUR_AD[h.tur] || h.tur}, {h.paraBirimi})</option>)}
                </Select>
              </Field>
              <Ipucu>Yalnız açık ve aynı para birimindeki hesaplar listelenir.</Ipucu>
            </div>
          )}
          {yol === "hesapsiz" && !engel.length && <div style={{ marginTop: 8 }}><Ipucu>{HESAPSIZ_BIRAK_ACIKLAMA}</Ipucu></div>}
          {engel.length > 0 && (
            <div data-testid="hesap-sil-engel" style={{ marginTop: 8 }}>
              {engel.map((m, i) => <HataMetni key={i}>{m}</HataMetni>)}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <UyariSeridi aile="bilgi" testId="hesap-sil-acilis">{HESAP_ACILIS_TASINMAZ} Hiçbir ödeme, tahsilat, avans ya da çek kaydı silinmez; yalnız hesap bağı değişir.</UyariSeridi>
          </div>
        </>)}
      </div>
    </Modal>
  );
};
