// Spec 0079: tevkifatlı satış faturası alanı (makina, servis, Extra Kalıp, yedek parça formları). Kapı, doğrulama ve metinler
// lib/satisTevkifat.js'ten; bu dosya yalnız çizer. Kutu yalnız faturalı yurtiçide çizilir (R2) ve varsayılan kapalıdır (R1, R3).
import { HataMetni, Ipucu, UyariSeridi } from "./tasarim";
import { fmtCur } from "../lib/utils";
import {
  TEVKIFAT_ORANLARI, satisTevkifatOranEtiketi, satisTevkifatSecilebilirMi, satisTevkifatDogrula,
  SATIS_TEVKIFAT_NOTU_TAHSIL, SATIS_TEVKIFAT_NOTU_CIRO, SATIS_TEVKIFAT_NOTU_SINIR, SATIS_TEVKIFAT_KART_UYARISI,
} from "../lib/satisTevkifat";

// form.tevkifatli / tevkifatPay / tevkifatPayda formun durumudur; kayıt kurucusu (satisTevkifatUygula) kapı kapalıysa ya da kutu
// kapalıysa üç alanı siler (R5). hataGoster: servis formu hatayı kayıtta bildirimle verir (R6/2), diğer üçü HataMetni ile.
// kartUyarisi: R13/2 koşulu çağırandan (kartTabaniEskiMi / makinaKartTabaniEskiMi); onYeniTaban verilirse "yeni tabanla hesapla".
export const SatisTevkifatAlani = ({ form, setForm, saleType, hataGoster = true, kartUyarisi = false, onYeniTaban = null }) => {
  if (!satisTevkifatSecilebilirMi(saleType)) return null;
  const acik = !!form?.tevkifatli;
  const hata = hataGoster ? satisTevkifatDogrula(form, saleType) : null;
  const deger = acik && form.tevkifatPay && form.tevkifatPayda ? `${form.tevkifatPay}/${form.tevkifatPayda}` : "";
  return (
    <div data-testid="satis-tevkifat" style={{ marginBottom: 12 }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--n700, #334155)" }}>
        <input type="checkbox" aria-label="Bu fatura tevkifatlı" checked={acik}
          onChange={e => setForm(p => ({ ...p, tevkifatli: e.target.checked }))}
          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--brand, #e85d1a)" }} />
        Bu fatura tevkifatlı
      </label>
      {acik && (
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          <select aria-label="Tevkifat oranı" className="input" value={deger} style={{ maxWidth: 200 }}
            onChange={e => {
              const [pay, payda] = e.target.value.split("/").map(Number);
              setForm(p => ({ ...p, tevkifatPay: pay || null, tevkifatPayda: payda || null }));
            }}>
            <option value="">Oran seçin…</option>
            {TEVKIFAT_ORANLARI.map(o => <option key={satisTevkifatOranEtiketi(o)} value={satisTevkifatOranEtiketi(o)}>{satisTevkifatOranEtiketi(o)}</option>)}
          </select>
          {hata && <HataMetni>{hata}</HataMetni>}
          <Ipucu>{SATIS_TEVKIFAT_NOTU_TAHSIL}</Ipucu>
          <Ipucu>{SATIS_TEVKIFAT_NOTU_CIRO}</Ipucu>
          <Ipucu>{SATIS_TEVKIFAT_NOTU_SINIR}</Ipucu>
        </div>
      )}
      {kartUyarisi && (
        <div data-testid="satis-tevkifat-kart-uyarisi" style={{ marginTop: 8 }}>
          <UyariSeridi aile="uyari">
            {SATIS_TEVKIFAT_KART_UYARISI}
            {onYeniTaban && (
              <> <button type="button" onClick={onYeniTaban} style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, background: "none", border: "none", padding: 0, color: "var(--brand, #e85d1a)", cursor: "pointer", textDecoration: "underline" }}>
                Kart komisyonunu yeni tabanla hesapla
              </button></>
            )}
          </UyariSeridi>
        </div>
      )}
    </div>
  );
};

// R23: formun MEVCUT KDV kutusunun içindeki satırlar (yeni kutu açılmaz). Blok faturayı temsil eder, tahsilat kapsamını değil.
export const SatisTevkifatOzetSatirlari = ({ ozet, currency = "TRY" }) => {
  if (!ozet?.tevkifatli) return null;
  const satir = (a, b, kalin = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: kalin ? 700 : 500, color: "var(--grn800, #065f46)", padding: "2px 0" }}>
      <span>{a}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{b}</span>
    </div>
  );
  return (
    <div data-testid="satis-tevkifat-ozet" style={{ marginTop: 6, borderTop: "1px dashed var(--grnBr, #bbf7d0)", paddingTop: 6 }}>
      {satir("Matrah", fmtCur(ozet.matrah, currency))}
      {satir("Toplam KDV", fmtCur(ozet.toplamKdv, currency))}
      {satir("Tevkifat (alıcı beyan edecek)", `− ${fmtCur(ozet.tevkifat, currency)}`)}
      {satir("Tahsil edilecek KDV", fmtCur(ozet.bizKdv, currency))}
      {satir("Fatura toplamı (tahsil edilecek)", fmtCur(ozet.faturaToplami, currency), true)}
    </div>
  );
};
