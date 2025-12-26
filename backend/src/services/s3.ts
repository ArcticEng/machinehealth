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
 * Upload file to S3 (generic)
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
 * Generate presigned URL for download
 */
export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get file content from S3
 */
export async function getS3Content(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('File not found');
  }
  
  return response.Body.transformToString();
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await s3Client.send(command);
}

// ============================================
// SAMPLE RAW DATA FUNCTIONS
// ============================================

/**
 * Generate S3 key for sample raw data:
 * rawdata/users/{userId}/companies/{companyId}/factories/{factoryId}/machines/{machineId}/{filename}-{timestamp}.json
 */
export function generateSampleDataKey(params: {
  userId: string;
  companyId: string;
  factoryId: string;
  machineId: string;
  sampleName: string;
  date?: Date;
}): string {
  const { userId, companyId, factoryId, machineId, sampleName, date = new Date() } = params;
  
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = date.getTime();
  const safeName = sampleName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `rawdata/users/${userId}/companies/${companyId}/factories/${factoryId}/machines/${machineId}/${dateStr}/${safeName}-${timestamp}.json`;
}

/**
 * Upload sample raw data to S3
 */
export async function uploadSampleData(params: {
  userId: string;
  companyId: string;
  factoryId: string;
  machineId: string;
  sampleName: string;
  rawData: any[];
  metrics: any;
  metadata?: Record<string, string>;
}): Promise<{ key: string; url: string }> {
  const { userId, companyId, factoryId, machineId, sampleName, rawData, metrics, metadata } = params;
  
  const key = generateSampleDataKey({
    userId,
    companyId,
    factoryId,
    machineId,
    sampleName,
  });
  
  // Store both raw data and metrics in the file
  const content = JSON.stringify({
    metadata: {
      userId,
      companyId,
      factoryId,
      machineId,
      sampleName,
      dataPoints: rawData.length,
      createdAt: new Date().toISOString(),
      ...metadata,
    },
    metrics,
    rawData,
  }, null, 2);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'application/json',
    Metadata: {
      userId,
      companyId,
      factoryId,
      machineId,
      dataPoints: String(rawData.length),
    },
  });
  
  await s3Client.send(command);
  
  const url = await generatePresignedUrl(key);
  
  return { key, url };
}

/**
 * Get sample raw data from S3
 */
export async function getSampleData(key: string): Promise<{
  metadata: any;
  metrics: any;
  rawData: any[];
}> {
  const content = await getS3Content(key);
  return JSON.parse(content);
}

/**
 * Delete sample data from S3
 */
export async function deleteSampleData(key: string): Promise<void> {
  await deleteFromS3(key);
}

// ============================================
// COMPARISON FUNCTIONS
// ============================================

/**
 * Generate S3 key for comparison PDF:
 * comparisons/users/{userId}/companies/{companyId}/factories/{factoryId}/machines/{machineId}/{date}/{filename}.pdf
 */
export function generateComparisonKey(params: {
  userId: string;
  companyId: string;
  factoryId: string;
  machineId: string;
  filename: string;
  date?: Date;
}): string {
  const { userId, companyId, factoryId, machineId, filename, date = new Date() } = params;
  
  const dateStr = date.toISOString().split('T')[0];
  const timestamp = date.getTime();
  const safeName = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `comparisons/users/${userId}/companies/${companyId}/factories/${factoryId}/machines/${machineId}/${dateStr}/${safeName}-${timestamp}.pdf`;
}

/**
 * Upload comparison PDF to S3
 */
export async function uploadComparisonPDF(params: {
  userId: string;
  companyId: string;
  factoryId: string;
  machineId: string;
  filename: string;
  pdfBuffer: Buffer;
  metadata?: Record<string, string>;
}): Promise<{ key: string; url: string }> {
  const { userId, companyId, factoryId, machineId, filename, pdfBuffer, metadata } = params;
  
  const key = generateComparisonKey({
    userId,
    companyId,
    factoryId,
    machineId,
    filename,
  });
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    Metadata: {
      userId,
      companyId,
      factoryId,
      machineId,
      ...metadata,
    },
  });
  
  await s3Client.send(command);
  
  const url = await generatePresignedUrl(key);
  
  return { key, url };
}

// ============================================
// REPORT FUNCTIONS
// ============================================

/**
 * Generate S3 key path for reports:
 * reports/users/{userId}/companies/{companyId}/factories/{factoryId}/machines/{machineId}/{date}/{filename}
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
  
  const dateStr = date.toISOString().split('T')[0];
  const timestamp = date.getTime();
  
  let path = `reports/users/${userId}`;
  
  if (companyId) {
    path += `/companies/${companyId}`;
  }
  
  if (factoryId) {
    path += `/factories/${factoryId}`;
  }
  
  if (machineId) {
    path += `/machines/${machineId}`;
  }
  
  path += `/${dateStr}/${timestamp}-${filename}`;
  
  return path;
}

/**
 * Upload a report (JSON) to S3
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
 * Upload a report PDF to S3
 */
export async function uploadReportPDF(params: {
  userId: string;
  companyId?: string;
  factoryId?: string;
  machineId?: string;
  filename: string;
  pdfBuffer: Buffer;
  metadata?: Record<string, string>;
}): Promise<{ key: string; url: string }> {
  const { userId, companyId, factoryId, machineId, filename, pdfBuffer, metadata } = params;
  
  // Use .pdf extension
  const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  
  const key = generateReportKey({
    userId,
    companyId,
    factoryId,
    machineId,
    filename: pdfFilename,
  });
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
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
  
  let prefix = `reports/users/${userId}`;
  
  if (companyId) {
    prefix += `/companies/${companyId}`;
  }
  
  if (factoryId) {
    prefix += `/factories/${factoryId}`;
  }
  
  if (machineId) {
    prefix += `/machines/${machineId}`;
  }
  
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
  await deleteFromS3(key);
}

/**
 * Get report content
 */
export async function getReportContent(key: string): Promise<string> {
  return getS3Content(key);
}

export default {
  // Generic
  uploadToS3,
  generatePresignedUrl,
  getS3Content,
  deleteFromS3,
  // Sample data
  generateSampleDataKey,
  uploadSampleData,
  getSampleData,
  deleteSampleData,
  // Comparisons
  generateComparisonKey,
  uploadComparisonPDF,
  // Reports
  generateReportKey,
  uploadReport,
  uploadReportPDF,
  getSignedDownloadUrl,
  listReports,
  deleteReport,
  getReportContent,
};
