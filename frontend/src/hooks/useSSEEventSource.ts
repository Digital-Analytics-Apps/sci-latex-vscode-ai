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

    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";
    const sseUrl = `${baseUrl}/events/stream?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    eventSource.addEventListener("PDF_COMPILED", (_event: MessageEvent) => {
      try {
        dispatch(
          showNotification({
            message: `PDF compilado com sucesso para o projeto!`,
            severity: "success",
          }),
        );
      } catch (err) {
        console.error("Erro ao processar evento SSE PDF_COMPILED:", err);
      }
    });

    eventSource.addEventListener("MERGE_UNLOCKED", (_event: MessageEvent) => {
      try {
        dispatch(
          showNotification({
            message: "Parecer do NIT aprovado! O botão de Merge foi liberado.",
            severity: "success",
          }),
        );
      } catch (err) {
        console.error("Erro ao processar evento SSE MERGE_UNLOCKED:", err);
      }
    });

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [token, dispatch]);

  return { isConnected: Boolean(token) && isConnected };
}
