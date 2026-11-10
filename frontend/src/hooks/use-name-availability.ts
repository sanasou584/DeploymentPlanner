import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCheckProjectAvailabilityQuery } from "@/store/projects-api";
import { isTakenName, nameKeyOf } from "@/utils/names";

const NAME_MAX = 120;
const DEBOUNCE_MS = 400;

export interface NameAvailabilityState {
  checking: boolean;
  exists: boolean;
}

export function useNameAvailability({
  name,
  taken,
  catalogComplete,
  enabled,
}: {
  name: string;
  taken: ReadonlySet<string>;
  catalogComplete: boolean;
  enabled: boolean;
}): NameAvailabilityState {
  const key = nameKeyOf(name);
  const valid = key.length > 0 && key.length <= NAME_MAX;
  const localTaken = valid && isTakenName(taken, name);
  const mayProbe = enabled && valid && !localTaken && !catalogComplete;

  const debouncedName = useDebouncedValue(name, DEBOUNCE_MS);
  const debouncedKey = nameKeyOf(debouncedName);
  const settled = mayProbe && debouncedKey === key;

  const { data, isFetching } = useCheckProjectAvailabilityQuery(
    { name: debouncedName.trim() },
    { skip: !settled },
  );

  return {
    checking: mayProbe && (debouncedKey !== key || isFetching),
    exists: settled && data?.data.exists === true,
  };
}
