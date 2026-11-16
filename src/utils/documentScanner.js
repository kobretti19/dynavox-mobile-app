import { Platform } from 'react-native';

// Takes photos through the native document scanner (Google ML Kit on Android,
// VisionKit on iOS): it finds the edges, crops, straightens the perspective
// and cleans the image up, like a scanned page.
//
// Returns an ImagePicker-shaped result ({ canceled, assets: [{ uri, fileName,
// mimeType }] }) so callers can treat it like a camera photo, or null when the
// scanner isn't available (web, or an app build without the native module) --
// the caller then falls back to the plain camera.
export const scanWithDocumentScanner = async () => {
  if (Platform.OS === 'web') return null;
  let DocumentScanner;
  try {
    // Lazy: the native module only exists in builds made after it was added.
    DocumentScanner = require('react-native-document-scanner-plugin').default;
  } catch {
    return null;
  }
  if (!DocumentScanner?.scanDocument) return null;

  let res;
  try {
    res = await DocumentScanner.scanDocument({ croppedImageQuality: 85, maxNumDocuments: 10 });
  } catch {
    return null;
  }
  if (!res || res.status === 'cancel' || !res.scannedImages?.length) return { canceled: true, assets: [] };

  const stamp = Date.now();
  return {
    canceled: false,
    assets: res.scannedImages.map((path, i) => ({
      uri: path.startsWith('/') ? `file://${path}` : path,
      fileName: `scan-${stamp}-${i + 1}.jpg`,
      mimeType: 'image/jpeg',
    })),
  };
};

export default scanWithDocumentScanner;
