import { useEffect, RefObject } from "react";

/**
 * Hook que rola o elemento até o final sempre que o array `deps` mudar.
 * Útil para listas de carrinho que crescem dinamicamente.
 */
export const useAutoScroll = (ref: RefObject<HTMLElement>, deps: unknown[]) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
};
