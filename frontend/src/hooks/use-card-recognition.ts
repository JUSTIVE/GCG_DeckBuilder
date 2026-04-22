import { useCallback, useEffect, useRef, useState } from "react";
import type { RecognizedCard, WorkerOutMessage } from "../lib/card-recognition-types";

type State = "idle" | "initializing" | "ready" | "processing" | "done" | "error";

interface Progress {
  stage: string;
  percent: number;
}

export function useCardRecognition() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState<Progress>({ stage: "", percent: 0 });
  const [results, setResults] = useState<RecognizedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/card-recognition.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case "init-progress":
          setProgress({ stage: msg.stage, percent: msg.percent });
          break;
        case "init-done":
          setState("ready");
          setProgress({ stage: "", percent: 100 });
          break;
        case "init-error":
          setState("error");
          setError(msg.error);
          break;
        case "recognize-progress":
          setProgress({ stage: msg.stage, percent: msg.percent });
          if (msg.partialResults) setResults(msg.partialResults);
          break;
        case "recognize-done":
          setState("done");
          setResults(msg.results);
          setProgress({ stage: "", percent: 100 });
          break;
        case "recognize-error":
          setState("error");
          setError(msg.error);
          break;
      }
    };

    workerRef.current = worker;
    setState("initializing");
    worker.postMessage({ type: "init" });

    return () => worker.terminate();
  }, [version]);

  const recognize = useCallback(
    async (file: File) => {
      if (!workerRef.current || state !== "ready") return;

      setState("processing");
      setResults([]);
      setError(null);
      setProgress({ stage: "Loading image...", percent: 0 });

      const bitmap = await createImageBitmap(file);
      workerRef.current.postMessage({ type: "recognize", imageData: bitmap }, [bitmap]);
    },
    [state],
  );

  const reset = useCallback(() => {
    setResults([]);
    setError(null);
    setProgress({ stage: "", percent: 0 });
    if (state === "error") {
      // Worker may be in a broken state — recreate it via useEffect.
      setVersion((v) => v + 1);
    } else {
      setState("ready");
    }
  }, [state]);

  return { state, progress, results, error, recognize, reset };
}
