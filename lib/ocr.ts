const OCR_POLL_INTERVAL_MS = 1500;
const OCR_POLL_MAX_ATTEMPTS = 12;

export type OcrResult = {
  text: string;
  confidence: number;
};

type AzureReadStatus = "notStarted" | "running" | "failed" | "succeeded";

type AzureReadOperationResult = {
  status: AzureReadStatus;
  analyzeResult?: {
    readResults?: Array<{
      lines?: Array<{
        text?: string;
        confidence?: number;
      }>;
    }>;
  };
};

function requireEnv(name: "AZURE_VISION_ENDPOINT" | "AZURE_VISION_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

/**
 * Normalize OCR output: lowercase, strip noisy characters.
 */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[^\w\s\d.,:/\-]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

async function pollReadOperation(operationUrl: string, key: string): Promise<OcrResult> {
  for (let attempt = 0; attempt < OCR_POLL_MAX_ATTEMPTS; attempt += 1) {
    const pollRes = await fetch(operationUrl, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
      },
      cache: "no-store",
    });

    if (!pollRes.ok) {
      throw new Error(`Azure Vision polling failed: ${pollRes.status}`);
    }

    const payload = (await pollRes.json()) as AzureReadOperationResult;
    if (payload.status === "succeeded") {
      const lines =
        payload.analyzeResult?.readResults?.flatMap((page) =>
          (page.lines ?? []).map((line) => ({
            text: line.text ?? "",
            confidence: typeof line.confidence === "number" ? line.confidence : null,
          }))
        ) ?? [];

      const text = normalizeOcrText(lines.map((line) => line.text).join("\n"));
      const validConf = lines
        .map((line) => line.confidence)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const confidence =
        validConf.length > 0
          ? validConf.reduce((sum, val) => sum + val, 0) / validConf.length
          : 0;

      return { text, confidence };
    }

    if (payload.status === "failed") {
      throw new Error("Azure Vision OCR failed");
    }

    await sleep(OCR_POLL_INTERVAL_MS);
  }

  throw new Error("Azure Vision OCR timed out");
}

async function startReadOperation(
  body: BodyInit,
  contentType: string
): Promise<{ operationUrl: string; key: string }> {
  const endpoint = normalizeEndpoint(requireEnv("AZURE_VISION_ENDPOINT"));
  const key = requireEnv("AZURE_VISION_KEY");

  const startRes = await fetch(`${endpoint}/vision/v3.2/read/analyze`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": contentType,
    },
    body,
    cache: "no-store",
  });

  if (!startRes.ok) {
    throw new Error(`Azure Vision start request failed: ${startRes.status}`);
  }

  const operationUrl = startRes.headers.get("operation-location");
  if (!operationUrl) {
    throw new Error("Azure Vision missing operation-location header");
  }

  return { operationUrl, key };
}

export async function runOcrFromImageUrl(imageUrl: string): Promise<OcrResult> {
  const { operationUrl, key } = await startReadOperation(
    JSON.stringify({ url: imageUrl }),
    "application/json"
  );
  return pollReadOperation(operationUrl, key);
}

/**
 * Fallback OCR path using image bytes directly.
 */
export async function runOcrFromBuffer(imageBuffer: Buffer): Promise<OcrResult> {
  const { operationUrl, key } = await startReadOperation(
    new Uint8Array(imageBuffer),
    "application/octet-stream"
  );
  return pollReadOperation(operationUrl, key);
}
