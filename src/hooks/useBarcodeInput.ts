import { useEffect, useRef } from "react";

/**
 * Captura a digitação enviada por leitores de código de barras (emulam teclado HID)
 * Acumula caracteres rapidamente digitados (normalmente em < 100 ms) até receber ENTER.
 * Quando ENTER é detectado, chama o callback com o código lido.
 */
export const useBarcodeInput = (onBarcode: (code: string) => void, idleTimeout = 100) => {
  const buffer = useRef<string>("");
  const lastTime = useRef<number>(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastTime.current > idleTimeout) {
        buffer.current = ""; // expirou, começa novo código
      }
      lastTime.current = now;

      if (e.key === "Enter") {
        if (buffer.current.length > 0) {
          onBarcode(buffer.current);
          buffer.current = "";
        }
        return;
      }
      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBarcode, idleTimeout]);
};
