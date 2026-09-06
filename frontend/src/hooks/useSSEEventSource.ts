import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { showNotification } from "../store/slices/notificationSlice";

export function useSSEEventSource() {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";

    async function connectSSE() {
      try {
        const response = await fetch(`${baseUrl}/events/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setIsConnected(false);
          return;
        }

        setIsConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const chunk of lines) {
            if (!chunk.trim()) continue;

            if (chunk.includes("PDF_COMPILED")) {
              dispatch(
                showNotification({
                  message: "PDF compilado com sucesso para o projeto!",
                  severity: "success",
                }),
              );
            } else if (chunk.includes("MERGE_UNLOCKED")) {
              dispatch(
                showNotification({
                  message:
                    "Parecer do NIT aprovado! O botão de Merge foi liberado.",
                  severity: "success",
                }),
              );
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setIsConnected(false);
        }
      }
    }

    connectSSE();

    return () => {
      controller.abort();
      setIsConnected(false);
    };
  }, [token, dispatch]);

  return { isConnected: Boolean(token) && isConnected };
}
