import { describe, expect, it } from "vitest";
import {
  amountDesdeCommit,
  webpayCommitFueAprobado,
} from "./webpayCommitResultado";

describe("webpayCommitFueAprobado", () => {
  it("aprobado con response_code 0 y amount > 0", () => {
    expect(
      webpayCommitFueAprobado({
        status: "AUTHORIZED",
        response_code: 0,
        amount: 5900,
      })
    ).toBe(true);
  });

  it("rechazado si status distinto", () => {
    expect(
      webpayCommitFueAprobado({
        status: "FAILED",
        response_code: 0,
        amount: 5900,
      })
    ).toBe(false);
  });

  it("rechazado si response_code distinto de 0", () => {
    expect(
      webpayCommitFueAprobado({
        status: "AUTHORIZED",
        response_code: -1,
        amount: 5900,
      })
    ).toBe(false);
  });

  it("aprobado con response_code string \"0\"", () => {
    expect(
      webpayCommitFueAprobado({
        status: "AUTHORIZED",
        response_code: "0",
        amount: 1000,
      })
    ).toBe(true);
  });

  it("rechazado si amount ausente, 0 o negativo", () => {
    expect(
      webpayCommitFueAprobado({
        status: "AUTHORIZED",
        response_code: 0,
      })
    ).toBe(false);
    expect(
      webpayCommitFueAprobado({
        status: "AUTHORIZED",
        response_code: 0,
        amount: 0,
      })
    ).toBe(false);
    expect(
      webpayCommitFueAprobado({
        status: "AUTHORIZED",
        response_code: 0,
        amount: -1,
      })
    ).toBe(false);
  });

  it("rechazado si data es null o vacío", () => {
    expect(webpayCommitFueAprobado(null)).toBe(false);
    expect(webpayCommitFueAprobado(undefined)).toBe(false);
  });
});

describe("amountDesdeCommit", () => {
  it("lee number", () => {
    expect(amountDesdeCommit({ amount: 5900 })).toBe(5900);
  });

  it("lee string numérico", () => {
    expect(amountDesdeCommit({ amount: "5900" })).toBe(5900);
  });
});
