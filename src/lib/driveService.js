import { getAccessToken } from './googleAuth';

const BACKUP_FILENAME = 'daily-diet-backup.json';

/**
 * Find the backup file in Google Drive AppDataFolder
 */
async function findBackupFile(token) {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,name,size,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

/**
 * Get info about the current backup on Drive
 */
export async function getBackupInfo() {
  const token = getAccessToken();
  if (!token) return null;
  return await findBackupFile(token);
}

/**
 * Upload backup to Google Drive
 */
export async function uploadToDrive(jsonData) {
  const token = getAccessToken();
  if (!token) throw new Error("Not logged in to Google");

  const existingFile = await findBackupFile(token);
  
  const metadata = {
    name: BACKUP_FILENAME,
    parents: existingFile ? [] : ['appDataFolder']
  };

  const fileContent = JSON.stringify(jsonData);
  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = 
    delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
    delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent +
    closeDelimiter;

  const url = existingFile 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, {
    method: existingFile ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error.message || "Failed to upload to Google Drive");
  }

  return await res.json();
}

/**
 * Download backup from Google Drive
 */
export async function downloadFromDrive() {
  const token = getAccessToken();
  if (!token) throw new Error("Not logged in to Google");

  const existingFile = await findBackupFile(token);
  if (!existingFile) return null;

  const url = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error("Failed to download from Google Drive");
  }

  return await res.json();
}
