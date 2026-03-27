import { BlobServiceClient } from "@azure/storage-blob";
import { randomUUID } from "crypto";

const UPLOAD_MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 300;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

/**
 * Upload receipt bytes to Azure Blob Storage; returns public blob URL.
 * Ensure container allows blob public read, or switch to SAS URLs later.
 */
export async function uploadReceiptImage(
  buffer: Buffer,
  contentType: string,
  filenameHint: string
): Promise<string> {
  const connectionString = requireEnv("AZURE_STORAGE_CONNECTION_STRING");
  const containerName = requireEnv("AZURE_CONTAINER_NAME");

  const safeName = filenameHint.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobName = `${Date.now()}-${randomUUID()}-${safeName}`;

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists({
    access: "blob",
  });

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  for (let attempt = 1; attempt <= UPLOAD_MAX_RETRIES; attempt += 1) {
    try {
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType || "image/jpeg" },
      });
      return blockBlobClient.url;
    } catch (error) {
      if (attempt >= UPLOAD_MAX_RETRIES) {
        throw error;
      }
      const delay = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Azure upload failed after retries");
}
