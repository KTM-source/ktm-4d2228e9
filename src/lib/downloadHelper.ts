// Download helper that resolves direct download links via KTM API

const KTM_API_URL = 'https://ktm.discloud.app/api';

interface DownloadResult {
  success: boolean;
  directLink?: string;
  filename?: string;
  size?: number;
  error?: string;
}

export async function resolveDownloadLink(originalUrl: string): Promise<DownloadResult> {
  // Check if it's a Gofile link that needs resolving
  if (originalUrl.includes('gofile.io/d/')) {
    try {
      const response = await fetch(KTM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: originalUrl }),
      });

      const data = await response.json();

      if (data.error) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        directLink: data.directLink,
        filename: data.filename,
        size: data.size,
      };
    } catch (error) {
      console.error('Error resolving download link:', error);
      return { success: false, error: 'فشل في استخراج رابط التحميل' };
    }
  }

  // For non-Gofile links, return the original URL
  return {
    success: true,
    directLink: originalUrl,
  };
}

export async function handleWebDownload(downloadUrl: string): Promise<void> {
  const result = await resolveDownloadLink(downloadUrl);
  
  if (result.success && result.directLink) {
    // Open the direct download link in a new tab
    window.open(result.directLink, '_blank');
  } else {
    throw new Error(result.error || 'فشل في الحصول على رابط التحميل');
  }
}
