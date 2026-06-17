/**
 * Compresses an image file on the client side using Canvas API.
 * Resizes the image to fit within maxWidth/maxHeight (maintaining aspect ratio)
 * and compresses it using JPEG format with the specified quality.
 */
export function compressImage(
  file: File,
  maxWidth = 2560,
  maxHeight = 2560,
  quality = 0.88
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while keeping aspect ratio mathematically perfect
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas conversion to blob failed.'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  }).then((compressedBlob) => {
    // If it's a JPEG, restore the original EXIF headers after canvas compression
    if (file.type === 'image/jpeg') {
      return restoreExif(file, compressedBlob);
    }
    return compressedBlob;
  });
}

/**
 * Extracts the APP1 (EXIF) segment from the source file array buffer,
 * and inserts it right after the SOI (0xFFD8) marker of the destination JPEG blob.
 */
function restoreExif(srcFile: File, destBlob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const srcReader = new FileReader();
    srcReader.readAsArrayBuffer(srcFile);
    srcReader.onload = () => {
      const srcBuffer = srcReader.result as ArrayBuffer;
      const srcView = new DataView(srcBuffer);
      
      // Check if source is a valid JPEG
      if (srcView.byteLength < 4 || srcView.getUint16(0, false) !== 0xFFD8) {
        resolve(destBlob);
        return;
      }
      
      let offset = 2;
      let app1Buffer: ArrayBuffer | null = null;
      
      // Find APP1 marker (0xFFE1) in source JPEG
      while (offset < srcView.byteLength - 2) {
        const marker = srcView.getUint16(offset, false);
        if (marker === 0xFFE1) {
          const length = srcView.getUint16(offset + 2, false);
          app1Buffer = srcBuffer.slice(offset, offset + 2 + length);
          break;
        }
        if ((marker & 0xFF00) !== 0xFF00 || marker === 0xFFDA) {
          // SOS or invalid marker, stop scanning
          break;
        }
        const length = srcView.getUint16(offset + 2, false);
        offset += 2 + length;
      }
      
      if (!app1Buffer) {
        resolve(destBlob);
        return;
      }
      
      const destReader = new FileReader();
      destReader.readAsArrayBuffer(destBlob);
      destReader.onload = () => {
        const destBuffer = destReader.result as ArrayBuffer;
        const destView = new DataView(destBuffer);
        
        // Check if destination is a valid JPEG
        if (destView.byteLength < 4 || destView.getUint16(0, false) !== 0xFFD8) {
          resolve(destBlob);
          return;
        }
        
        const header = destBuffer.slice(0, 2);
        const rest = destBuffer.slice(2);
        
        const newBlob = new Blob([header, app1Buffer, rest], { type: 'image/jpeg' });
        resolve(newBlob);
      };
      destReader.onerror = () => resolve(destBlob);
    };
    srcReader.onerror = () => resolve(destBlob);
  });
}
