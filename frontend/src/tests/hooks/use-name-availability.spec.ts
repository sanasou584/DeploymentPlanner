// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNameAvailability } from "@/hooks/use-name-availability";
import { takenNameKeysOf } from "@/utils/names";

const queryMock = vi.hoisted(() => vi.fn());
const mockState = vi.hoisted(() => ({
  exists: false,
  isFetching: false,
}));

vi.mock("@/store/projects-api", () => ({
  useCheckProjectAvailabilityQuery: (arg: { name: string }, opts: { skip: boolean }) => {
    queryMock(arg, opts);
    return {
      data: mockState.exists
        ? { message: "Availability checked", data: { name: arg.name, exists: true } }
        : undefined,
      isFetching: mockState.isFetching,
    };
  },
}));

const taken = takenNameKeysOf(["blog-engine", "shopflow-store"]);

beforeEach(() => {
  vi.useFakeTimers();
  queryMock.mockClear();
  mockState.exists = false;
  mockState.isFetching = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNameAvailability", () => {
  it("probes the backend only when the visible catalog cannot cover the workspace", () => {
    const { rerender } = renderHook(
      ({ value }) =>
        useNameAvailability({
          name: value,
          taken,
          catalogComplete: true,
          enabled: true,
        }),
      { initialProps: { value: "brand-new-name" } },
    );
    expect(queryMock.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
    rerender({ value: "another-valid-name" });
    expect(queryMock.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
  });

  it("never probes for locally taken names, even on an incomplete catalog", () => {
    renderHook(() =>
      useNameAvailability({
        name: "Blog-Engine",
        taken,
        catalogComplete: false,
        enabled: true,
      }),
    );
    expect(queryMock.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
  });

  it("never probes for empty or overlong names", () => {
    const empty = renderHook(() =>
      useNameAvailability({ name: "", taken, catalogComplete: false, enabled: true }),
    );
    expect(queryMock.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
    empty.unmount();
    renderHook(() =>
      useNameAvailability({ name: "x".repeat(121), taken, catalogComplete: false, enabled: true }),
    );
    expect(queryMock.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
  });

  it("never probes when the caller disables the check (edit mode)", () => {
    renderHook(() =>
      useNameAvailability({
        name: "brand-new-name",
        taken,
        catalogComplete: false,
        enabled: false,
      }),
    );
    expect(queryMock.mock.calls.at(-1)?.[1]).toEqual({ skip: true });
  });

  it("probes immediately on mount for a valid candidate on an incomplete catalog", () => {
    renderHook(() =>
      useNameAvailability({
        name: "brand-new-name",
        taken,
        catalogComplete: false,
        enabled: true,
      }),
    );
    expect(queryMock.mock.calls.at(-1)?.[1]).toEqual({ skip: false });
  });

  it("marks the name as existing when the backend says so", () => {
    mockState.exists = true;
    const { result } = renderHook(() =>
      useNameAvailability({
        name: "brand-new-name",
        taken,
        catalogComplete: false,
        enabled: true,
      }),
    );
    expect(result.current.exists).toBe(true);
  });

  it("reports checking while the candidate is newer than the debounced value", () => {
    const { result, rerender } = renderHook(
      ({ value }) =>
        useNameAvailability({
          name: value,
          taken,
          catalogComplete: false,
          enabled: true,
        }),
      { initialProps: { value: "brand-new-name" } },
    );
    rerender({ value: "brand-newer-name" });
    expect(result.current.checking).toBe(true);
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.checking).toBe(false);
  });
});
