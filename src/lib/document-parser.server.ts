import { fork, type ForkOptions } from "node:child_process";
import path from "node:path";
import { BoundedQueue, QueueFullError } from "@/lib/bounded-queue";
import { RequestValidationError } from "@/lib/ai/request-validation";

const queue = new BoundedQueue(2, 4);
export type ParseJob = { kind: "document"; name: string; buffer: Buffer } | { kind: "ocr"; buffers: Buffer[] };

/** CPU-heavy parsers run outside the request process, with bounded admission and lifetime. */
export async function parseDocumentJob(job: ParseJob, requestSignal: AbortSignal): Promise<string> {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(45_000)]);
  let release: () => void;
  try { release = await queue.acquire(signal); }
  catch (error) {
    if (error instanceof QueueFullError) throw new RequestValidationError(error.message, 503);
    throw error;
  }
  try {
    signal.throwIfAborted();
    return await new Promise<string>((resolve, reject) => {
      const child = fork(path.join(process.cwd(), "scripts", "document-worker.cjs"), [], {
        serialization: "advanced", stdio: ["ignore", "ignore", "ignore", "ipc"],
        execArgv: ["--max-old-space-size=192"], windowsHide: true,
        // Parsing workers never need provider credentials.
        env: { NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP },
      } as ForkOptions & { windowsHide: boolean });
      let result: string | undefined;
      let failure: Error | undefined;
      const abort = () => { failure = new Error("文件解析已取消或超时"); child.kill(); };
      signal.addEventListener("abort", abort, { once: true });
      child.on("message", (message: unknown) => {
        if (message && typeof message === "object") {
          const data = message as { text?: unknown; error?: unknown };
          if (typeof data.text === "string" && data.text.length <= 100_000) result = data.text;
          else failure = new RequestValidationError(typeof data.error === "string" ? data.error : "解析结果超过限制");
        }
        child.kill();
      });
      child.on("error", error => { failure = error; child.kill(); });
      child.on("close", () => {
        signal.removeEventListener("abort", abort);
        if (failure) reject(failure);
        else if (result !== undefined) resolve(result);
        else reject(new RequestValidationError("文件解析失败或超出资源限制"));
      });
      child.send(job, error => { if (error) { failure = error; child.kill(); } });
      if (signal.aborted) abort();
    });
  } finally { release(); }
}
