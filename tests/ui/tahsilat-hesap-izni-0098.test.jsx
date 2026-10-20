// @vitest-environment jsdom
// Spec 0098: izin ekranında "Tahsilat hesabı" grubu (gerçek UserManager, sahte sunucu köprüsü; 0066'nın düzeneği). Yeni grup Kasa
// akordeonunda önde, kendi notunu ayrı testId ile taşır; "Kasa sekmesi olmayanda etkisiz" ipucusu yalnız Kasa'nın kendi grubunda.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { UserManager } from "../../src/components/settings/UserManager";
import { TAHSILAT_HESAP_IPUCU, KASA_ETKISIZ_IPUCU, GIDER_ACTION_GROUPS } from "../../src/components/settings/serverPermissionDefs";

afterEach(() => { cleanup(); delete window.appServer; });

const ETIKET = "Tahsilat hesabını seçme (servis, Extra Kalıp, yedek parça ve makina tahsilatı)";
const kul = (id, username, perms) => ({ id, username, role: "user", is_active: 1, permissions: JSON.stringify(perms) });
const yonetici = (users) => {
  const istekler = [];
  window.appServer = { apiRequest: vi.fn(async (r) => { istekler.push(r); return r.method === "GET" ? { ok: true, data: users } : { ok: true, data: {} }; }) };
  render(<UserManager flash={vi.fn()} />);
  return istekler;
};
const duzenle = async (ad) => {
  await waitFor(() => expect(screen.getByText(ad)).toBeTruthy());
  fireEvent.click(within(screen.getByText(ad).closest("tr")).getByText("Düzenle"));
};
const akordeon = (baslik) => screen.getByText(baslik).parentElement.parentElement;
const ac = (baslik) => { if (!within(akordeon(baslik)).queryByText("Bu kullanıcı için özelleştir")) fireEvent.click(screen.getByText(baslik)); };
const kaydet = async (istekler) => {
  const once = istekler.filter(r => r.method === "PATCH").length;
  fireEvent.click(screen.getByText("Kaydet"));
  await waitFor(() => expect(istekler.filter(r => r.method === "PATCH")).toHaveLength(once + 1));
  return JSON.parse(istekler.filter(r => r.method === "PATCH").pop().body.permissions);
};
// Grubun kabı: başlık metninin ebeveyni (başlık, notlar ve kutular aynı kapta).
const grup = (ad) => within(akordeon("Kasa işlemleri")).getByText(ad).parentElement;
const kutu = () => within(akordeon("Kasa işlemleri")).getByText(ETIKET).closest("label").querySelector("input");

describe("Spec 0098: izin ekranının Kasa akordeonu (R2, R2/2, R13, R13/2)", () => {
  it("AC-23 / AC-24 / AC-26 / AC-53: kendi başlıklı grubunda tek kutu, kendi notuyla, Hesaplar ve hareketler'in önünde", async () => {
    yonetici([kul(1, "satis", { tabs: ["dashboard", "customers"], giderActions: [] })]);
    await duzenle("satis");
    ac("Kasa işlemleri");
    const g = grup("Tahsilat hesabı");
    expect(within(g).getAllByRole("checkbox")).toHaveLength(1);
    expect(within(g).getByText(ETIKET)).toBeTruthy();
    expect(within(g).getByTestId("tahsilat-hesap-ipucu").textContent).toBe(TAHSILAT_HESAP_IPUCU);
    const sonraki = grup("Hesaplar ve hareketler");
    expect(g.compareDocumentPosition(sonraki) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(akordeon("Gider işlemleri")).queryByText(ETIKET)).toBeNull();
  });
  it("AC-25 / AC-54: Kasa'sız kullanıcıda etkisizlik ipucusu yeni grupta yok, Kasa grubunda var ve ekranda bir kez", async () => {
    yonetici([kul(1, "satis", { tabs: ["dashboard", "customers"], giderActions: [] })]);
    await duzenle("satis");
    ac("Kasa işlemleri");
    expect(within(grup("Tahsilat hesabı")).queryByTestId("kasa-etkisiz-ipucu")).toBeNull();
    expect(within(grup("Hesaplar ve hareketler")).getByTestId("kasa-etkisiz-ipucu").textContent).toBe(KASA_ETKISIZ_IPUCU);
    expect(screen.getAllByTestId("kasa-etkisiz-ipucu")).toHaveLength(1);
    expect(screen.getAllByTestId("tahsilat-hesap-ipucu")).toHaveLength(1);
  });
  it("AC-25: Kasa'lı kullanıcıda etkisizlik ipucusu hiç yok, yeni grubun notu yine var", async () => {
    yonetici([kul(1, "kasaci", { tabs: ["gider", "finance", "kasa"], giderActions: [] })]);
    await duzenle("kasaci");
    ac("Kasa işlemleri");
    expect(screen.queryAllByTestId("kasa-etkisiz-ipucu")).toHaveLength(0);
    expect(screen.getByTestId("tahsilat-hesap-ipucu")).toBeTruthy();
  });
  it("AC-27: kutu işaretlenip kaydedilince kimlik giderActions'a yazılır; yeni izin alanı oluşmaz", async () => {
    const istekler = yonetici([kul(1, "satis", { tabs: ["dashboard", "customers"], giderActions: ["gider_add"] })]);
    await duzenle("satis");
    ac("Kasa işlemleri");
    expect(kutu().checked).toBe(false);
    fireEvent.click(kutu());
    const izin = await kaydet(istekler);
    expect(izin.giderActions).toEqual(expect.arrayContaining(["gider_add", "tahsilat_hesap"]));
    expect(Object.keys(izin).some(k => /tahsilat/i.test(k))).toBe(false);
  });
  it("AC-28: özelleştir kapalıyken kutu çizilmez ve kayıtta giderActions tanımsız kalır", async () => {
    const istekler = yonetici([kul(1, "satis", { tabs: ["dashboard", "customers"] })]);
    await duzenle("satis");
    ac("Kasa işlemleri");
    expect(within(akordeon("Kasa işlemleri")).queryByText(ETIKET)).toBeNull();
    expect((await kaydet(istekler)).giderActions ?? null).toBeNull();
  });
  it("AC-29: özelleştir açılınca yeni kutu da işaretli gelir", async () => {
    const istekler = yonetici([kul(1, "satis", { tabs: ["dashboard", "customers"] })]);
    await duzenle("satis");
    ac("Kasa işlemleri");
    fireEvent.click(within(akordeon("Kasa işlemleri")).getByText("Bu kullanıcı için özelleştir").previousSibling);
    expect(kutu().checked).toBe(true);
    expect((await kaydet(istekler)).giderActions).toEqual(GIDER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id)));
  });
});
