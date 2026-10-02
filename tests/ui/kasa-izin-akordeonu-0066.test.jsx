// @vitest-environment jsdom
// Spec 0066: izin ekranında Kasa işlemleri Gider işlemlerinden ayrı akordeonda; iki akordeon aynı giderActions dizisini
// ve aynı "özelleştir" durumunu paylaşır. Gerçek UserManager, sahte sunucu köprüsü.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UserManager } from "../../src/components/settings/UserManager";
import { GIDER_KASA_ORTAK_NOT, GIDER_VARSAYILAN_METNI, KASA_VARSAYILAN_METNI, KASA_ETKISIZ_IPUCU, GIDER_ACTION_GROUPS } from "../../src/components/settings/serverPermissionDefs";

afterEach(() => { cleanup(); delete window.appServer; });

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
// Akordeon kabı: başlık satırının ebeveyni.
const akordeon = (baslik) => screen.getByText(baslik).parentElement.parentElement;
// Açık değilse açar (akordeonların açık durumu düzenleme pencereleri arasında korunur).
const ac = (baslik) => { if (!within(akordeon(baslik)).queryByText("Bu kullanıcı için özelleştir")) fireEvent.click(screen.getByText(baslik)); };
const kaydet = async (istekler) => {
  const once = istekler.filter(r => r.method === "PATCH").length;
  fireEvent.click(screen.getByText("Kaydet"));
  await waitFor(() => expect(istekler.filter(r => r.method === "PATCH")).toHaveLength(once + 1));
  return JSON.parse(istekler.filter(r => r.method === "PATCH").pop().body.permissions);
};
const KASA_ETIKETLERI = ["Hesap ekle, düzenle, kapat ve sil ve kasa iş listesini düzenleme", "Hesaplar arası virman", "Çalışana avans ver ve sil"];
const TUM_GIDER = GIDER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));

describe("Spec 0066: Kasa işlemleri akordeonu (R1, R2, R7)", () => {
  it("AC-1 / AC-2 / AC-3 / AC-18 / AC-7: kasa kutuları ayrı akordeonda, 'Hesaplar ve hareketler' altında; Gider'de kasa kutusu ve ipucu yok; ipucu tek kez", async () => {
    yonetici([kul(2, "veli", { tabs: ["dashboard", "gider", "finance"], giderActions: ["kasa_hesap", "virman"] })]);
    await duzenle("veli");
    ac("Gider işlemleri");
    ac("Kasa işlemleri");
    const kasa = akordeon("Kasa işlemleri"), gider = akordeon("Gider işlemleri");
    expect(within(kasa).getByText("Hesaplar ve hareketler")).toBeTruthy();
    for (const e of KASA_ETIKETLERI) {
      expect(within(kasa).getByText(e)).toBeTruthy();
      expect(within(gider).queryByText(e)).toBeNull();
    }
    expect(within(gider).getByText("Gider ekle")).toBeTruthy();
    expect(within(kasa).queryByText("Gider ekle")).toBeNull();
    expect(screen.getAllByTestId("kasa-etkisiz-ipucu")).toHaveLength(1);
    expect(within(kasa).getByTestId("kasa-etkisiz-ipucu").textContent).toBe(KASA_ETKISIZ_IPUCU);
    expect(within(gider).queryByTestId("kasa-etkisiz-ipucu")).toBeNull();
  });
  it("AC-4 / AC-19: akordeon sırası müşteri, bayi, stok, finans, gider, kasa, evrak, notlar, servis, ayarlar", async () => {
    yonetici([kul(1, "ali", { tabs: ["gider", "finance", "kasa"] })]);
    await duzenle("ali");
    const basliklar = ["Müşteri işlemleri", "Bayi işlemleri", "Stok işlemleri", "Finans işlemleri", "Gider işlemleri", "Kasa işlemleri",
      "Evrak işlemleri", "Notlar işlemleri", "Servis Panosu işlemleri", "Ayarlar bölümleri"];
    const ogeler = basliklar.map(b => screen.getByText(b));
    for (let i = 1; i < ogeler.length; i++) {
      expect(ogeler[i - 1].compareDocumentPosition(ogeler[i]) & Node.DOCUMENT_POSITION_FOLLOWING, basliklar[i]).toBeTruthy();
    }
  });
});

describe("Spec 0066: ortak durum (R5, R9, R17, C5)", () => {
  it("AC-5: iki akordeondaki tek tek kutular aynı diziye yazılır ve birbirini etkilemez", async () => {
    const istekler = yonetici([kul(1, "ali", { tabs: ["gider", "finance", "kasa"], giderActions: ["gider_add"] })]);
    await duzenle("ali");
    ac("Gider işlemleri");
    ac("Kasa işlemleri");
    fireEvent.click(within(akordeon("Kasa işlemleri")).getByLabelText("Hesaplar arası virman"));
    fireEvent.click(within(akordeon("Gider işlemleri")).getByLabelText("Gider düzenle"));
    expect(within(akordeon("Gider işlemleri")).getByLabelText("Gider ekle").checked).toBe(true);
    const p = await kaydet(istekler);
    expect(p.giderActions).toEqual(["gider_add", "virman", "gider_edit"]);
  });
  it("AC-5b: Kasa akordeonundan 'özelleştir' açılınca iki akordeonda bütün kimlikler işaretli; kapatınca ikisi birden varsayılan ve kayıt null", async () => {
    const istekler = yonetici([kul(1, "ali", { tabs: ["gider", "finance", "kasa"] })]);
    await duzenle("ali");
    ac("Gider işlemleri");
    ac("Kasa işlemleri");
    const ozellestir = (b) => within(akordeon(b)).getByText("Bu kullanıcı için özelleştir").previousSibling;
    fireEvent.click(ozellestir("Kasa işlemleri"));
    const isaretli = (b) => within(akordeon(b)).getAllByRole("checkbox").filter(c => c.checked && !c.closest("label").textContent.includes("özelleştir")).length;
    expect(isaretli("Gider işlemleri")).toBe(9);
    expect(isaretli("Kasa işlemleri")).toBe(3);
    expect(ozellestir("Gider işlemleri").checked).toBe(true);
    expect(within(akordeon("Gider işlemleri")).getByText("Özel")).toBeTruthy();
    expect((await kaydet(istekler)).giderActions).toEqual(TUM_GIDER);
    // Kapatma: özelleştirilmiş kullanıcıda Kasa akordeonundan kapatılınca ikisi birden varsayılana döner.
    cleanup();
    const istekler2 = yonetici([kul(2, "veli", { tabs: ["gider", "finance", "kasa"], giderActions: ["virman", "gider_add"] })]);
    await duzenle("veli");
    ac("Gider işlemleri");
    ac("Kasa işlemleri");
    fireEvent.click(ozellestir("Kasa işlemleri"));
    expect(within(akordeon("Gider işlemleri")).getByText("Varsayılan", { selector: "span" })).toBeTruthy();
    expect(within(akordeon("Kasa işlemleri")).getByText(KASA_VARSAYILAN_METNI)).toBeTruthy();
    expect(within(akordeon("Gider işlemleri")).getByText(GIDER_VARSAYILAN_METNI)).toBeTruthy();
    expect((await kaydet(istekler2)).giderActions).toBeNull();
  });
  it("AC-6 / AC-25: ortak anahtar notu iki akordeonda, anahtar açık ya da kapalıyken; iki varsayılan metni gider ve kasayı birlikte söyler", async () => {
    yonetici([kul(1, "ali", { tabs: ["gider", "finance", "kasa"] })]);
    await duzenle("ali");
    ac("Gider işlemleri");
    ac("Kasa işlemleri");
    expect(screen.getByTestId("ortak-anahtar-notu-gider").textContent).toBe(GIDER_KASA_ORTAK_NOT);
    expect(screen.getByTestId("ortak-anahtar-notu-kasa").textContent).toBe(GIDER_KASA_ORTAK_NOT);
    expect(GIDER_VARSAYILAN_METNI).toMatch(/gider ve kasa işlemleri/);
    expect(KASA_VARSAYILAN_METNI).toMatch(/kasa ve gider işlemleri/);
    fireEvent.click(within(akordeon("Kasa işlemleri")).getByText("Bu kullanıcı için özelleştir").previousSibling);
    expect(screen.getByTestId("ortak-anahtar-notu-gider")).toBeTruthy();
    expect(screen.getByTestId("ortak-anahtar-notu-kasa")).toBeTruthy();
  });
  it("AC-9: bilinen giderActions dizisi dokunulmadan kaydedilince sıra dahil birebir; özelleştirilmemiş kullanıcıda null kalır", async () => {
    const dizi = ["virman", "gider_odeme", "kasa_hesap", "gider_add", "tedarikci_edit"];
    const istekler = yonetici([kul(1, "ali", { tabs: ["gider", "finance", "kasa"], giderActions: dizi }), kul(2, "veli", { tabs: ["gider", "finance", "kasa"] })]);
    await duzenle("ali");
    ac("Gider işlemleri");
    ac("Kasa işlemleri");
    expect((await kaydet(istekler)).giderActions).toEqual(dizi);
    await duzenle("veli");
    expect((await kaydet(istekler)).giderActions).toBeNull();
  });
});

describe("Spec 0066: etkisizlik ipucunun koşulu (R6, R16, R18)", () => {
  const ipucuVarMi = async (perms) => {
    cleanup();
    yonetici([kul(1, "ali", perms)]);
    await duzenle("ali");
    ac("Kasa işlemleri");
    return within(akordeon("Kasa işlemleri")).queryByTestId("kasa-etkisiz-ipucu") !== null;
  };
  it("AC-16 / AC-17 / AC-24: kasa yazılı ama Finans'sız kullanıcıda ipucu var; kasa + gider + finansta yok; varsayılan sekmelerle açılan kullanıcıda var", async () => {
    // Triyaj: izin listesinde sekme olmayan kullanıcı ekranda DEFAULT_USER_TABS ile açılır (editTabs hiç tanımsız olmaz);
    // ipucu, varsayılan listede Giderler ve Finans olmadığı için görünür.
    expect(await ipucuVarMi({ tabs: ["kasa", "gider"], giderActions: ["virman"] })).toBe(true);
    expect(await ipucuVarMi({ tabs: ["kasa", "gider", "finance"], giderActions: ["virman"] })).toBe(false);
    expect(await ipucuVarMi({ giderActions: ["virman"] })).toBe(true);
  });
  it("AC-26: 'özelleştir' kapalıyken kutu ve ipucu çizilmez; yalnız varsayılan metni", async () => {
    expect(await ipucuVarMi({ tabs: ["gider"] })).toBe(false);
    expect(within(akordeon("Kasa işlemleri")).getByText(KASA_VARSAYILAN_METNI)).toBeTruthy();
  });
});

describe("Spec 0066: kaynak taraması (C5, R4)", () => {
  const um = readFileSync(resolve(__dirname, "../../src/components/settings/UserManager.jsx"), "utf-8");
  it("AC-15: ayrı 'özelleştir' durumu, ayrı seçim dizisi ya da ayrı setSelected yok; Kasa girdisi gider durumlarını kullanır", () => {
    expect(um).not.toMatch(/editKasa|setEditKasa|kasaActions/);
    const kasa = um.match(/\{ key: "kasa"[^}]*\}/)[0];
    expect(kasa).toMatch(/on: editGiderActionsOn, selected: editGiderActions, setSelected: setEditGiderActions/);
    expect(kasa).toMatch(/setOn: giderOn/);
    expect(um.match(/\{ key: "gider"[^}]*\}/)[0]).toMatch(/setOn: giderOn/);
  });
  it("triyaj: akordeon sırasını anlatan yorum AC-19 sırasıyla güncel", () => {
    expect(um).toMatch(/Müşteriler, Bayiler, Stok, Finans, Gider, Kasa,\s*\/\/\s*Evrak, Notlar, Servis Panosu, Ayarlar/);
  });
  it("AC-11 / AC-23: ayrım tanım dosyasındaki görünümlerle; ipucu koşulu gorunurSekmeler çağrısı", () => {
    expect(um).toMatch(/groups: GIDER_AKORDEON_GRUPLARI/);
    expect(um).toMatch(/KASA_AKORDEON_GRUPLARI\.map/);
    expect(um).toMatch(/gorunurSekmeler\(ALL_TABS, "active"/);
    expect(um).not.toMatch(/KASA_EYLEM_IDLERI|editTabs\.includes\("kasa"\)/);
  });
});
