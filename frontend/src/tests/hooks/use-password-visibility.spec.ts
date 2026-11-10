// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { usePasswordVisibility } from "@/hooks/use-password-visibility";

afterEach(cleanup);

describe("usePasswordVisibility", () => {
  it("starts hidden", () => {
    const { result } = renderHook(() => usePasswordVisibility());
    expect(result.current.visible).toBe(false);
  });

  it("toggles visibility on and off", () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.visible).toBe(false);
  });

  it("keeps a stable toggle callback", () => {
    const { result, rerender } = renderHook(() => usePasswordVisibility());
    const first = result.current.toggle;
    rerender();
    expect(result.current.toggle).toBe(first);
  });
});
