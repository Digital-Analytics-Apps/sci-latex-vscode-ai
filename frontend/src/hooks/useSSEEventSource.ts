import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import type { RootState } from "../store";
import { showNotification } from "../store/slices/notificationSlice";

export function useSSEEventSource(projectId?: string) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const token = useSelector((state: RootState) => state.auth.token);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";

    const url = projectId
      ? `${baseUrl}/events/stream?projectId=${projectId}`
      : `${baseUrl}/events/stream`;

    async function connectSSE() {
      try {
        const response = await fetch(url, {
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

            let eventName = "";
            let dataStr = "";

            for (const line of chunk.split("\n")) {
              if (line.startsWith("event:")) {
                eventName = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                dataStr = line.replace("data:", "").trim();
              }
            }

            let dataObj: any = null;
            if (dataStr) {
              try {
                dataObj = JSON.parse(dataStr);
              } catch {
                dataObj = dataStr;
              }
            }

            if (
              eventName === "PDF_COMPILED" ||
              chunk.includes("PDF_COMPILED")
            ) {
              dispatch(
                showNotification({
                  message: "PDF compilado com sucesso para o projeto!",
                  severity: "success",
                }),
              );
            } else if (
              eventName === "MERGE_UNLOCKED" ||
              chunk.includes("MERGE_UNLOCKED")
            ) {
              dispatch(
                showNotification({
                  message:
                    "Parecer do NIT aprovado! O botão de Merge foi liberado.",
                  severity: "success",
                }),
              );
              if (projectId) {
                queryClient.invalidateQueries({
                  queryKey: ["pull-requests", projectId],
                });
              }
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
  }, [token, projectId, dispatch, queryClient]);

  return { isConnected: Boolean(token) && isConnected };
}
