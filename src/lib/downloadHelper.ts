// Download helper that resolves direct download links via KTM API

const KTM_API_URL = 'https://ktm.discloud.app/api';

interface DownloadResult {
  success: boolean;
  directLink?: string;
  fallback?: boolean;
  error?: string;
  ms?: number;
}

export async function resolveDownloadLink(originalUrl: string): Promise<DownloadResult> {
  // Check if it's a BuzzHeavier or Trashbytes link that needs resolving
  if (originalUrl.includes('buzzheavier.com') || originalUrl.includes('trashbytes.net')) {
    try {
      const response = await fetch(KTM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: originalUrl }),
      });

      const data = await response.json();

      if (data.error && !data.success) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        directLink: data.directLink,
        fallback: data.fallback,
        ms: data.ms,
      };
    } catch (error) {
      console.error('Error resolving download link:', error);
      // Fallback to original URL on error
      return { 
        success: true, 
        directLink: originalUrl,
        fallback: true,
        error: 'فشل في استخراج رابط التحميل - استخدام الرابط الأصلي'
      };
    }
  }

  // For all other links, return the original URL directly
  return {
    success: true,
    directLink: originalUrl,
  };
}

export async function handleWebDownload(downloadUrl: string): Promise<void> {
  const result = await resolveDownloadLink(downloadUrl);
  
  if (result.success && result.directLink) {
    // Open the direct download link in the same tab
    window.location.href = result.directLink;
  } else {
    throw new Error(result.error || 'فشل في الحصول على رابط التحميل');
  }
}
