import { describe, expect, it } from "vitest";
import {
  apiErrorCode,
  apiErrorMessage,
  apiFieldErrorsOf,
} from "@/utils/api-error";

describe("api error extraction", () => {
  it("reads the code from the backend envelope inside an RTK error", () => {
    expect(
      apiErrorCode({ status: 409, data: { error: { code: "DUPLICATE_PROJECT_NAME", message: "taken" } } }),
    ).toBe("DUPLICATE_PROJECT_NAME");
  });

  it("reads the envelope itself when passthrough failures are raw", () => {
    expect(apiErrorCode({ error: { code: "VALIDATION_ERROR", message: "no" } })).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("returns null for network failures without a backend envelope", () => {
    expect(apiErrorCode(undefined)).toBeNull();
    expect(apiErrorCode(null)).toBeNull();
    expect(apiErrorCode("FetchError: unable to reach")).toBeNull();
    expect(apiErrorCode({ status: 500, data: { message: "no envelope" } })).toBeNull();
  });

  it("prefers the backend message over a given fallback", () => {
    expect(
      apiErrorMessage(
        { status: 409, data: { error: { code: "DUPLICATE_PROJECT_NAME", message: "name already in use" } } },
        "fallback",
      ),
    ).toBe("name already in use");
  });

  it("falls back when the envelope carries no usable message", () => {
    expect(apiErrorMessage({ error: { code: "X" } }, "fallback text")).toBe("fallback text");
    expect(apiErrorMessage(undefined, "fallback text")).toBe("fallback text");
  });

  it("extracts per-field validation messages", () => {
    expect(
      apiFieldErrorsOf({
        status: 400,
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed. Verify the highlighted fields.",
            details: { fieldErrors: { name: ["Name is required."], description: [] } },
          },
        },
      }),
    ).toEqual({ name: ["Name is required."] });
  });

  it("ignores malformed or empty detail shapes", () => {
    expect(apiFieldErrorsOf({ error: { code: "VALIDATION_ERROR" } })).toEqual({});
    expect(
      apiFieldErrorsOf({
        error: { code: "VALIDATION_ERROR", details: { fieldErrors: "nope" } },
      }),
    ).toEqual({});
    expect(
      apiFieldErrorsOf({
        error: {
          code: "VALIDATION_ERROR",
          details: { fieldErrors: { name: [42] } },
        },
      }),
    ).toEqual({});
  });
});
