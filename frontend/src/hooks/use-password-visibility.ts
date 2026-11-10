import { useCallback, useState } from "react";

interface PasswordVisibility {
  visible: boolean;
  toggle: () => void;
}

export function usePasswordVisibility(): PasswordVisibility {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => {
    setVisible((current) => !current);
  }, []);
  return { visible, toggle };
}
