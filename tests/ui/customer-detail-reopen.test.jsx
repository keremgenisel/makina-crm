// @vitest-environment jsdom
// Regresyon: "genisel yazıp müşteriye tıkladım, modalı kapattım, aramadan AYNI müşteriye
// tekrar tıklayınca açılmıyor." Kök neden: Customers detay modalı `initialDetailId` DEĞİŞİNCE
// açılır (Customers.jsx:40). Kapanınca parent aynı id'yi tuttuğu için tekrar set etmek değişiklik
// sayılmaz → açılmaz. Düzeltme: parent (App) modal kapanınca custDetailId'yi null'a çeker
// (onDetailClosed). Bu test her iki yolu da gerçek Customers bileşeniyle kanıtlar.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { Customers } from "../../src/components/Customers";

const CUST = [{ id: 1, name: "Genisel Catering", serialNo: "GEN-1", model: "AK100" }];

// initialDetailId'yi kapanışta null'a çeken (düzeltilmiş App) VEYA çekmeyen (eski hata) parent.
function Harness({ resetOnClose }) {
  const [id, setId] = useState(null);
  return (
    <div>
      <button onClick={() => setId(1)}>aç</button>
      <Customers
        customers={CUST} setCustomers={() => {}} services={[]} setServices={() => {}}
        dealers={[]} models={[]} factory={{ name: "Altuntaş" }} parts={[]}
        partSales={[]} setPartSales={() => {}} yedekParcaSatislar={[]} setYedekParcaSatislar={() => {}}
        initialDetailId={id}
        onDetailClosed={() => { if (resetOnClose) setId(null); }}
      />
    </div>
  );
}

// Detay modalı açık mı? Footer'daki "Kapat" butonu yalnız detay modalında var.
const modalAcik = () => !!screen.queryByRole("button", { name: "Kapat" });

describe("Müşteri detay modalı — aynı id ile yeniden açma", () => {
  it("düzeltme: kapanınca parent id'yi null'a çekerse AYNI müşteri tekrar açılır", () => {
    render(<Harness resetOnClose={true} />);
    fireEvent.click(screen.getByText("aç"));
    expect(modalAcik()).toBe(true);                          // ilk açılış
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(modalAcik()).toBe(false);                         // kapandı (id → null)
    fireEvent.click(screen.getByText("aç"));                 // null → 1 (gerçek değişim)
    expect(modalAcik()).toBe(true);                          // tekrar açıldı ✔
  });

  it("eski hata: parent id'yi tutarsa AYNI müşteriye tekrar tıklamak açmaz", () => {
    render(<Harness resetOnClose={false} />);
    fireEvent.click(screen.getByText("aç"));
    expect(modalAcik()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(modalAcik()).toBe(false);
    fireEvent.click(screen.getByText("aç"));                 // set(1) ama zaten 1 → değişim yok
    expect(modalAcik()).toBe(false);                         // açılmaz (hatanın kanıtı)
  });
});
