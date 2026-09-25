// Asynchronous helper bridge for running heavy HTML parsing and processing off the main UI thread via Web Worker

import type { WorkerInputMessage, WorkerOutputMessage } from "./htmlProcessor.worker";

let workerInstance: Worker | null = null;
const pendingCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL("./htmlProcessor.worker.ts", import.meta.url), {
        type: "module"
      });

      workerInstance.onmessage = (e: MessageEvent<WorkerOutputMessage>) => {
        const { id, success, result, error } = e.data;
        const cb = pendingCallbacks.get(id);
        if (cb) {
          pendingCallbacks.delete(id);
          if (success) {
            cb.resolve(result);
          } else {
            cb.reject(new Error(error || "Worker operation failed"));
          }
        }
      };

      workerInstance.onerror = (err) => {
        console.warn("HTML Processor Web Worker error:", err);
      };
    } catch (e) {
      console.warn("Could not instantiate HTML Processor Web Worker, falling back to main thread:", e);
      workerInstance = null;
    }
  }
  return workerInstance;
}

export function executeWorkerTask<T>(type: WorkerInputMessage["type"], payload: WorkerInputMessage["payload"]): Promise<T> {
  const worker = getWorker();
  if (!worker) {
    return Promise.reject(new Error("Web Worker unavailable"));
  }

  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return new Promise<T>((resolve, reject) => {
    // Timeout fallback after 5 seconds
    const timer = setTimeout(() => {
      if (pendingCallbacks.has(id)) {
        pendingCallbacks.delete(id);
        reject(new Error("Worker operation timed out"));
      }
    }, 5000);

    pendingCallbacks.set(id, {
      resolve: (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      }
    });

    worker.postMessage({ id, type, payload } as WorkerInputMessage);
  });
}
