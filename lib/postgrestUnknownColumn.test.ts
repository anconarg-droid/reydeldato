import { describe, expect, it } from "vitest";
import {
  isPostgrestUnknownColumnError,
  unknownColumnNameFromDbErrorMessage,
} from "./postgrestUnknownColumn";

describe("unknownColumnNameFromDbErrorMessage", () => {
  it("PostgREST schema cache", () => {
    expect(
      unknownColumnNameFromDbErrorMessage(
        "Could not find the 'keywords_usuario_json' column of 'emprendedores' in the schema cache"
      )
    ).toBe("keywords_usuario_json");
  });

  it("Postgres column … does not exist", () => {
    expect(
      unknownColumnNameFromDbErrorMessage(
        "column emprendedores.keywords does not exist"
      )
    ).toBe("keywords");
  });
});

describe("isPostgrestUnknownColumnError", () => {
  it("PGRST204", () => {
    expect(isPostgrestUnknownColumnError({ code: "PGRST204", message: "x" })).toBe(
      true
    );
  });

  it("column does not exist", () => {
    expect(
      isPostgrestUnknownColumnError({
        message: "column emprendedores.foo does not exist",
      })
    ).toBe(true);
  });
});
