import { describe, expect, it } from "vitest";
import { calcularSena, calcularSaldo, formatMoney, formatHoraSlot, hoy } from "../utils/format";

describe("utils/format", () => {
  it("calcula la seña redondeada de una cancha", () => {
    expect(calcularSena({ precio: 20000, porcentajeSena: 30 })).toBe(6000);
    expect(calcularSena({ precio: 15333, porcentajeSena: 33 })).toBe(5060);
    expect(calcularSena(null)).toBe(0);
  });

  it("calcula el saldo de mostrador", () => {
    expect(calcularSaldo({ precio: 20000, porcentajeSena: 30 })).toBe(14000);
  });

  it("formatea montos y horas", () => {
    expect(formatMoney(6000)).toBe("6.000");
    expect(formatHoraSlot("2026-08-21T19:30:00Z")).toBe("19:30");
    expect(formatHoraSlot(null)).toBe("--:--");
  });

  it("hoy devuelve YYYY-MM-DD", () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
