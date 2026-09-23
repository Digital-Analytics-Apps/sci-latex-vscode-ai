import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import type { RootState } from "../store";
import { showNotification } from "../store/slices/notificationSlice";

export function useSSEEventSource(projectId?: string, taskId?: string) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const token = useSelector((state: RootState) => state.auth.token);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";

    const params = new URLSearchParams();
    if (projectId) params.append("projectId", projectId);
    if (taskId) params.append("taskId", taskId);

    const queryString = params.toString();
    const streamUrl = queryString
      ? `${baseUrl}/events/stream?${queryString}`
      : `${baseUrl}/events/stream`;

    // Função auxiliar para enviar o batimento HTTP que renova o Redis e cancela destruição de Pod
    async function sendHeartbeatPing() {
      if (!projectId) return;
      try {
        const heartbeatUrl = queryString
          ? `${baseUrl}/events/heartbeat?${queryString}`
          : `${baseUrl}/events/heartbeat`;
        await fetch(heartbeatUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Ignora falhas temporárias de ping
      }
    }

    // Criar Web Worker dedicado para batimentos em segundo plano (Web Workers NÃO são desacelerados pelos navegadores quando a aba perde o foco)
    let pingWorker: Worker | null = null;
    let workerUrl = "";
    try {
      const workerBlob = new Blob(
        [
          `
          let timer = null;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              if (timer) clearInterval(timer);
              timer = setInterval(function() {
                self.postMessage('ping');
              }, 20000); // Envia ping a cada 20s em segundo plano
            } else if (e.data === 'stop') {
              if (timer) clearInterval(timer);
              timer = null;
            }
          };
        `,
        ],
        { type: "application/javascript" }
      );
      workerUrl = URL.createObjectURL(workerBlob);
      pingWorker = new Worker(workerUrl);
      pingWorker.onmessage = (e) => {
        if (e.data === "ping") {
          sendHeartbeatPing();
        }
      };
      pingWorker.postMessage("start");
    } catch {
      // Fallback para setInterval se Web Workers forem bloqueados por CSP
      const fallbackInterval = setInterval(() => {
        sendHeartbeatPing();
      }, 20000);
      controller.signal.addEventListener("abort", () => {
        clearInterval(fallbackInterval);
      });
    }

    // Escuta a volta do foco da aba para enviar batimento e reconectar o SSE imediatamente
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        sendHeartbeatPing();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    async function connectSSE() {
      try {
        const response = await fetch(streamUrl, {
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

            if (dataStr) {
              try {
                JSON.parse(dataStr);
              } catch {
                // Ignore parse errors for raw event strings
              }
            }

            if (
              eventName === "WORK_ITEM_UPDATED" ||
              eventName === "PROJECT_ITEM_UPDATED" ||
              chunk.includes("WORK_ITEM_UPDATED")
            ) {
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              queryClient.invalidateQueries({ queryKey: ["work-items"] });
              queryClient.invalidateQueries({ queryKey: ["projects"] });
            } else if (
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
      if (pingWorker) {
        pingWorker.postMessage("stop");
        pingWorker.terminate();
      }
      if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setIsConnected(false);
    };
  }, [token, projectId, taskId, dispatch, queryClient]);

  return { isConnected: Boolean(token) && isConnected };
}
