// Spec 0087: aktarmanın spec öncesi çıktısını üretir (taşınmış çekirdek henüz maliyet bilmezken bir kez çalıştırıldı).
import { writeFileSync } from "node:fs";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula } from "../../src/lib/parcaAktarma.js";
import { MEVCUT_PARCALAR, ESKI_SATIRLAR } from "../../tests/fixtures/0087-aktarma-girdisi.js";
// Spec 0097 ile (R20/2, plan P11): içe aktarma yerel günü zorunlu parametre olarak alır.
const BUGUN = "2026-10-20";
const coz = parcaSatirlariniCoz(ESKI_SATIRLAR, MEVCUT_PARCALAR, 1000, BUGUN);
const cikti = { disa: MEVCUT_PARCALAR.map(parcaDisaAktarmaSatiri), coz, uygulanan: parcaIceAktarmaUygula(MEVCUT_PARCALAR, coz.parts) };
writeFileSync("tests/fixtures/0087-aktarma-once.json", JSON.stringify(cikti, null, 2) + "\n");
