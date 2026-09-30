import { describe, it, expect } from "vitest";
import { chooseChannel } from "./routing";

describe("chooseChannel (severity routing)", () => {
  it("HIGH faults page a servicer by SMS", () => {
    expect(chooseChannel("HIGH")).toBe("SMS");
  });

  it("NORMAL faults go by email", () => {
    expect(chooseChannel("NORMAL")).toBe("EMAIL");
  });
});

describe("chooseChannel without an SMS provider", () => {
  it("routes HIGH to email when SMS is not available", () => {
    expect(chooseChannel("HIGH", false)).toBe("EMAIL");
    expect(chooseChannel("NORMAL", false)).toBe("EMAIL");
  });
});
