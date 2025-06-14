import B2 from 'backblaze-b2';
import fs from 'fs';
import path from 'path';

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// Authorize once and cache for session
let authorized = false;
async function authorizeIfNeeded() {
  if (!authorized) {
    await b2.authorize();
    authorized = true;
  }
}

export async function uploadFile(filePath, fileNameInBucket, mimeType = 'image/png') {
  await authorizeIfNeeded();

  const { data: uploadUrlData } = await b2.getUploadUrl({
    bucketId: process.env.B2_BUCKET_ID,
  });

  const fileData = fs.readFileSync(filePath);

  const { data: uploadResponse } = await b2.uploadFile({
    uploadUrl: uploadUrlData.uploadUrl,
    uploadAuthToken: uploadUrlData.authorizationToken,
    fileName: fileNameInBucket,
    data: fileData,
    mime: mimeType,
  });

  console.log('Uploaded file:', uploadResponse);

  return `https://f004.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileNameInBucket}`;
}

export async function generatePrivateDownloadUrl(fileName, validDurationSeconds = 3600) {
  await authorizeIfNeeded();

  const { data } = await b2.getDownloadAuthorization({
    bucketId: process.env.B2_BUCKET_ID,
    fileNamePrefix: fileName,
    validDurationInSeconds: validDurationSeconds,
  });

  const baseUrl = `https://f004.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}`;
  const signedUrl = `${baseUrl}?Authorization=${encodeURIComponent(data.authorizationToken)}`;

  return signedUrl;
}
