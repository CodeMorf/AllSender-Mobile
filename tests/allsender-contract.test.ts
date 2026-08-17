import { describe, expect, it } from "vitest";

import { ALLSENDER_REDIRECT_URI, ALLSENDER_SCOPES } from "@/constants/allsender";

describe("AllSender Mobile production contract", () => {
  it("usa el callback nativo registrado", () => {
    expect(ALLSENDER_REDIRECT_URI).toBe("manusomnichannelmobile://oauth/callback");
  });

  it("solicita solo scopes publicados por el OAuth actual", () => {
    expect(ALLSENDER_SCOPES).toEqual([
      "openid",
      "profile",
      "email",
      "team",
      "offline_access",
    ]);
  });
});
