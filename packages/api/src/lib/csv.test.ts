import { describe, expect, test } from "bun:test";

import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  test("quotes cells with commas, quotes and line breaks", () => {
    expect(csvCell("Moyo, Rudo")).toBe('"Moyo, Rudo"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(12.5)).toBe("12.5");
  });

  test("neutralises spreadsheet formulas in text", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+263772123456")).toBe("'+263772123456");
    expect(csvCell(-5)).toBe("-5");
  });

  test("joins rows with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\r\n1,x");
  });
});
