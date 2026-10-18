import { KartBolum, BosDurum, Ipucu } from "../tasarim";
import { kurusMetni } from "../../lib/makinaStandartMaliyet";

// Spec 0088 R8, R9: genel gider payının özeti. Pay VARSAYILAN adede bölünür (fiyatlama ileriye dönük); gerçekte üretilmiş
// adede göre pay yalnız kıyastır. Durum boş durumlarla söylenir, sessiz sıfır yok (R6, C2/2).
export const HAVUZ_KDV_NOTU = "Havuz gider kayıtlarının tutarlarından gelir; indirilemeyen KDV dahildir (KDV hariç matrah + indirilemeyen KDV).";
const BOS = {
  ayarsiz: ["Hesap ayarları girilmedi", "Genel gider payı için dönem ve dönemde varsayılan üretim adedi Hesap Ayarları görünümünde girilir."],
  yururlukOncesi: ["Seçilen dönem gider takibinin yürürlüğünden önce", "Bu dönemde hiçbir gider kaydı havuza girmez; genel gider payı 0 ₺."],
  rolYok: ["Hiçbir gider türü genel gidere girmiyor", "Genel gider payı 0 ₺. Hesap Ayarları'nda gider türlerine \"Genel gidere girer\" rolü verin."],
};
const Rakam = ({ etiket, deger, alt, testId }) => (
  <div data-testid={testId} style={{ minWidth: 150 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase", letterSpacing: 0.3 }}>{etiket}</div>
    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{deger}</div>
    {alt && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{alt}</div>}
  </div>
);

// Spec 0089 R16: kalkan Makina Kârlılığı ekranının düzeltme cümlesi (tarihsiz makina sayısı burada zaten vardı).
export const URETIM_TARIHI_DUZELTME = "Makina düzenleme formundan üretim tarihi girilebilir.";
// Spec 0092 R21, R22: dönemde yayılmış kalem bilgisi (sayı motordan, `yayilanAdet`; ekran saymaz). Üretim Partileri de kullanır.
export const yayilanKalemMetni = (n) => `${n} gider kalemi kapsadığı aylara yayıldı; havuza her aya düşen payı girer.`;

export const PayOzeti = ({ pay, gercek }) => {
  if (BOS[pay.durum]) {
    const [baslik, metin] = BOS[pay.durum];
    return <div style={{ marginBottom: 16 }}><BosDurum testId={`pay-bos-${pay.durum}`} baslik={baslik} metin={metin} /></div>;
  }
  const gercekAlt = gercek.payK != null ? `Gerçek adede göre pay: ${kurusMetni(gercek.payK)} (kıyas)`
    : gercek.neden === "uretimYok" ? "Dönemde üretilmiş makina yok; kıyas payı hesaplanmadı." : null;
  return (
    <KartBolum varyant="kart" title="Genel gider payı" style={{ marginBottom: 16 }} testId="pay-ozeti">
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <Rakam testId="pay-havuz" etiket={`Dönem havuzu (${pay.baslangicAy} – ${pay.bitisAy})`} deger={kurusMetni(pay.havuzK)} />
        <Rakam testId="pay-adet" etiket="Dönemde varsayılan üretim adedi" deger={`${pay.varsayilanAdet} makina`} alt={pay.aylik != null ? `≈ ${String(pay.aylik).replace(".", ",")} makina/ay` : null} />
        <Rakam testId="pay-makina" etiket="Makina başına genel gider payı" deger={kurusMetni(pay.payK)} />
        <Rakam testId="pay-gercek" etiket="Dönemde gerçekte üretilen" deger={`${gercek.adet} makina`} alt={gercekAlt} />
      </div>
      <Ipucu>{HAVUZ_KDV_NOTU} Hesapta varsayılan adet kullanılır; gerçek adet yalnız kıyastır.</Ipucu>
      {gercek.cozulemeyen > 0 && <Ipucu>{`${gercek.cozulemeyen} makinanın üretim tarihi çözülemediği için gerçek adede girmedi. ${URETIM_TARIHI_DUZELTME}`}</Ipucu>}
      {pay.roller.rolsuzTurSayisi > 0 && <Ipucu>{`${pay.roller.rolsuzTurSayisi} gider türünün rolü belirtilmedi; bu türler maliyete girmez.`}</Ipucu>}
      {pay.havuz?.tursuzAdet > 0 && <Ipucu>{`Türü seçilmemiş ${pay.havuz.tursuzAdet} gider kalemi hiçbir havuza girmez.`}</Ipucu>}
      {pay.havuz?.yayilanAdet > 0 && <div data-testid="pay-yayilan"><Ipucu>{yayilanKalemMetni(pay.havuz.yayilanAdet)}</Ipucu></div>}
    </KartBolum>
  );
};
