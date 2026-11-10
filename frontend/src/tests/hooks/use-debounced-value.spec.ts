// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the input as-is on first render", () => {
    const { result } = renderHook(() => useDebouncedValue("first", 400));
    expect(result.current).toBe("first");
  });

  it("does not update before the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 400),
      { initialProps: { value: "first" } },
    );
    rerender({ value: "second" });
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe("first");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("second");
  });

  it("coalesces a burst of changes into the latest value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 400),
      { initialProps: { value: "a" } },
    );
    rerender({ value: "ab" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: "abc" });
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe("abc");
  });
});
