export async function uploadTextAsset(bucket: R2Bucket, key: string, body: string, contentType = 'text/plain;charset=UTF-8') {
  await bucket.put(key, body, {
    httpMetadata: {
      contentType
    }
  });

  return key;
}

export function getPublicAssetUrl(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
}
