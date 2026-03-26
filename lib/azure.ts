import { BlobServiceClient } from "@azure/storage-blob";

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
  const blobName = `${Date.now()}-${safeName}`;

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists({
    access: "blob",
  });

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType || "image/jpeg" },
  });

  return blockBlobClient.url;
}
