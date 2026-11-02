import { useCallback, useEffect, useRef, useState } from "react";

export function useToast(duration = 4500) {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => setToast(""), []);
  const show = useCallback(
    (message: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(message);
      timer.current = setTimeout(() => setToast(""), duration);
    },
    [duration],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { toast, show, dismiss };
}
