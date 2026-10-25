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

            let parsedTitle = "";
            if (dataStr) {
              try {
                const parsed: unknown = JSON.parse(dataStr);
                if (parsed && typeof parsed === "object" && "title" in parsed && typeof parsed.title === "string") {
                  parsedTitle = parsed.title;
                }
              } catch {
                // Ignore parse errors for raw event strings
              }
            }

            if (eventName === "TASK_CREATED" || chunk.includes("TASK_CREATED")) {
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              if (projectId) {
                queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
              }
              dispatch(
                showNotification({
                  message: parsedTitle ? `Nova tarefa criada: ${parsedTitle}` : "Nova tarefa criada no projeto!",
                  severity: "info",
                }),
              );
            } else if (
              eventName === "TASK_CLAIMED" ||
              eventName === "TASK_UNCLAIMED" ||
              chunk.includes("TASK_CLAIMED")
            ) {
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              if (projectId) {
                queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
              }
            } else if (
              eventName === "TASK_COMPLETED" ||
              eventName === "TASK_STATUS_UPDATED" ||
              chunk.includes("TASK_COMPLETED")
            ) {
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              if (projectId) {
                queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
                queryClient.invalidateQueries({ queryKey: ["project", projectId] });
              }
              if (eventName === "TASK_COMPLETED") {
                dispatch(
                  showNotification({
                    message: "Tarefa concluída com sucesso!",
                    severity: "success",
                  }),
                );
              }
            } else if (
              eventName === "ARTICLE_CREATED" ||
              eventName === "ARTICLE_UPDATED"
            ) {
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              queryClient.invalidateQueries({ queryKey: ["articles"] });
              queryClient.invalidateQueries({ queryKey: ["user-articles"] });
            } else if (
              eventName === "PDF_COMPILED" ||
              chunk.includes("PDF_COMPILED")
            ) {
              dispatch(
                showNotification({
                  message: "PDF compilado com sucesso!",
                  severity: "success",
                }),
              );
            }
          }
        }
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        if (!isAbort) {
          setIsConnected(false);
        }
      }
    }

    connectSSE();

    return () => {
      controller.abort();
      setIsConnected(false);
    };
  }, [token, projectId, taskId, dispatch, queryClient]);

  return { isConnected: Boolean(token) && isConnected };
}
