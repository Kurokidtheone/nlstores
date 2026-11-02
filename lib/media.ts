// R2 media helpers. Keys look like stores/<storeId>/<uuid>.webp
import { storeKeyRe } from "./products";

export const mediaUrl = (key: string) => `/api/media/${key}`;

/** Deletes R2 files, but only ones that belong to this store */
export async function deleteStoreMedia(bucket: R2Bucket, storeId: number, keys: Iterable<string>): Promise<void> {
  const re = storeKeyRe(storeId);
  const own = [...new Set(keys)].filter((k) => re.test(k));
  if (own.length) await bucket.delete(own);
}

/** Copies files to new keys (used by "Duplicate product" so both products own their files) */
export async function copyStoreMedia(bucket: R2Bucket, storeId: number, keys: string[]): Promise<Map<string, string>> {
  const re = storeKeyRe(storeId);
  const map = new Map<string, string>();
  for (const key of keys) {
    if (!re.test(key) || map.has(key)) continue;
    const obj = await bucket.get(key);
    if (!obj) continue;
    const ext = key.split(".").pop();
    const newKey = `stores/${storeId}/${crypto.randomUUID()}.${ext}`;
    await bucket.put(newKey, await obj.arrayBuffer(), { httpMetadata: obj.httpMetadata });
    map.set(key, newKey);
  }
  return map;
}
