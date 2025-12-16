import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  ListObjectsV2Command,
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'machinehealth-reports';

/**
 * Upload file to S3 (used by samples)
 */
export async function uploadToS3(
  key: string, 
  content: string | Buffer, 
  contentType: string = 'application/json'
): Promise<{ key: string; url: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: contentType,
  });
  
  await s3Client.send(command);
  
  const url = await generatePresignedUrl(key);
  
  return { key, url };
}

/**
 * Generate presigned URL for download (used by samples)
 */
export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate S3 key path with folder structure:
 * users/{userId}/companies/{companyId}/factories/{factoryId}/machines/{machineId}/reports/{date}/{filename}
 */
export function generateReportKey(params: {
  userId: string;
  companyId?: string;
  factoryId?: string;
  machineId?: string;
  filename: string;
  date?: Date;
}): string {
  const { userId, companyId, factoryId, machineId, filename, date = new Date() } = params;
  
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = date.getTime();
  
  let path = `users/${userId}`;
  
  if (companyId) {
    path += `/companies/${companyId}`;
  }
  
  if (factoryId) {
    path += `/factories/${factoryId}`;
  }
  
  if (machineId) {
    path += `/machines/${machineId}`;
  }
  
  path += `/reports/${dateStr}/${timestamp}-${filename}`;
  
  return path;
}

/**
 * Upload a report to S3
 */
export async function uploadReport(params: {
  userId: string;
  companyId?: string;
  factoryId?: string;
  machineId?: string;
  filename: string;
  content: string | Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<{ key: string; url: string }> {
  const { userId, companyId, factoryId, machineId, filename, content, contentType, metadata } = params;
  
  const key = generateReportKey({
    userId,
    companyId,
    factoryId,
    machineId,
    filename,
  });
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: contentType || 'application/json',
    Metadata: {
      userId,
      ...(companyId && { companyId }),
      ...(factoryId && { factoryId }),
      ...(machineId && { machineId }),
      createdAt: new Date().toISOString(),
      ...metadata,
    },
  });
  
  await s3Client.send(command);
  
  const url = await getSignedDownloadUrl(key);
  
  return { key, url };
}

/**
 * Get a signed URL for downloading a report
 */
export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * List reports for a user with optional filters
 */
export async function listReports(params: {
  userId: string;
  companyId?: string;
  factoryId?: string;
  machineId?: string;
  limit?: number;
}): Promise<Array<{
  key: string;
  filename: string;
  size: number;
  lastModified: Date;
  url?: string;
}>> {
  const { userId, companyId, factoryId, machineId, limit = 50 } = params;
  
  let prefix = `users/${userId}`;
  
  if (companyId) {
    prefix += `/companies/${companyId}`;
  }
  
  if (factoryId) {
    prefix += `/factories/${factoryId}`;
  }
  
  if (machineId) {
    prefix += `/machines/${machineId}`;
  }
  
  prefix += '/reports/';
  
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: limit,
  });
  
  const response = await s3Client.send(command);
  
  if (!response.Contents) {
    return [];
  }
  
  const sorted = response.Contents.sort((a, b) => {
    return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
  });
  
  const reports = await Promise.all(
    sorted.map(async (item) => {
      const key = item.Key || '';
      const filename = key.split('/').pop() || '';
      
      return {
        key,
        filename: filename.replace(/^\d+-/, ''),
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        url: await getSignedDownloadUrl(key),
      };
    })
  );
  
  return reports;
}

/**
 * Delete a report from S3
 */
export async function deleteReport(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await s3Client.send(command);
}

/**
 * Get report content
 */
export async function getReportContent(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('Report not found');
  }
  
  return response.Body.transformToString();
}

export default {
  uploadToS3,
  generatePresignedUrl,
  uploadReport,
  getSignedDownloadUrl,
  listReports,
  deleteReport,
  getReportContent,
  generateReportKey,
};
