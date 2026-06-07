export interface ExifData {
  dateTime?: string; // Format: YYYY:MM:DD HH:MM:SS
  latitude?: number;
  longitude?: number;
}

/**
 * Reads the EXIF headers of a JPEG File to extract shooting date/time and GPS coordinates.
 * Operates purely client-side without external dependencies.
 */
export function readExif(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const view = new DataView(buffer);
        
        // JPEG starts with SOI marker (0xFFD8)
        if (view.getUint16(0, false) !== 0xFFD8) {
          resolve({});
          return;
        }

        let offset = 2;
        const length = view.byteLength;
        let app1Offset = -1;

        // Scan for APP1 marker (0xFFE1)
        while (offset < length - 2) {
          const marker = view.getUint16(offset, false);
          if (marker === 0xFFE1) {
            app1Offset = offset;
            break;
          }
          const sectionLength = view.getUint16(offset + 2, false);
          offset += 2 + sectionLength;
        }

        if (app1Offset === -1) {
          resolve({});
          return;
        }

        // Validate EXIF Header: "Exif\0\0" (0x45786966 0x0000)
        const exifHeader = view.getUint32(app1Offset + 4, false);
        if (exifHeader !== 0x45786966) {
          resolve({});
          return;
        }

        // TIFF Header starts at app1Offset + 10
        const tiffOffset = app1Offset + 10;
        const byteOrder = view.getUint16(tiffOffset, false);
        const bigEndian = byteOrder === 0x4D4D; // 0x4D4D = "MM" (Motorola), 0x4949 = "II" (Intel)

        // Magic number validation (0x002A)
        if (view.getUint16(tiffOffset + 2, !bigEndian) !== 0x002A) {
          resolve({});
          return;
        }

        const firstIFDOffset = view.getUint32(tiffOffset + 4, !bigEndian);
        const exifData: ExifData = {};

        // Helper to parse directory entries (IFD)
        function parseIFD(ifdOffset: number) {
          if (ifdOffset + 2 > view.byteLength - tiffOffset) return;
          const numEntries = view.getUint16(tiffOffset + ifdOffset, !bigEndian);
          
          for (let i = 0; i < numEntries; i++) {
            const entryOffset = tiffOffset + ifdOffset + 2 + i * 12;
            if (entryOffset + 12 > view.byteLength) break;

            const tag = view.getUint16(entryOffset, !bigEndian);
            const valueOffset = view.getUint32(entryOffset + 8, !bigEndian);

            // DateTimeOriginal (0x9003) or DateTime (0x0132)
            if (tag === 0x9003 || tag === 0x0132) {
              const count = view.getUint32(entryOffset + 4, !bigEndian);
              let strOffset = tiffOffset + valueOffset;
              let dateStr = "";
              for (let j = 0; j < count - 1; j++) {
                if (strOffset + j >= view.byteLength) break;
                dateStr += String.fromCharCode(view.getUint8(strOffset + j));
              }
              exifData.dateTime = dateStr;
            }
            // Exif SubIFD Offset pointer (0x8769)
            else if (tag === 0x8769) {
              parseIFD(valueOffset);
            }
            // GPS Info IFD Offset pointer (0x8825)
            else if (tag === 0x8825) {
              parseGPS(valueOffset);
            }
          }
        }

        // Helper to parse GPS directory entries
        function parseGPS(gpsOffset: number) {
          if (gpsOffset + 2 > view.byteLength - tiffOffset) return;
          const numEntries = view.getUint16(tiffOffset + gpsOffset, !bigEndian);
          let latVal: number[] = [];
          let latRef = 'N';
          let lngVal: number[] = [];
          let lngRef = 'E';

          for (let i = 0; i < numEntries; i++) {
            const entryOffset = tiffOffset + gpsOffset + 2 + i * 12;
            if (entryOffset + 12 > view.byteLength) break;

            const tag = view.getUint16(entryOffset, !bigEndian);
            const valueOffset = view.getUint32(entryOffset + 8, !bigEndian);

            // GPSLatitudeRef (tag 0x0001)
            if (tag === 0x0001) {
              latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
            }
            // GPSLatitude (tag 0x0002)
            else if (tag === 0x0002) {
              const count = view.getUint32(entryOffset + 4, !bigEndian);
              latVal = readRationalArray(valueOffset, count);
            }
            // GPSLongitudeRef (tag 0x0003)
            else if (tag === 0x0003) {
              lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
            }
            // GPSLongitude (tag 0x0004)
            else if (tag === 0x0004) {
              const count = view.getUint32(entryOffset + 4, !bigEndian);
              lngVal = readRationalArray(valueOffset, count);
            }
          }

          // Convert GPS coordinates to decimal representation
          if (latVal.length === 3 && lngVal.length === 3) {
            let lat = latVal[0] + latVal[1] / 60 + latVal[2] / 3600;
            let lng = lngVal[0] + lngVal[1] / 60 + lngVal[2] / 3600;
            if (latRef === 'S') lat = -lat;
            if (lngRef === 'W') lng = -lng;
            exifData.latitude = lat;
            exifData.longitude = lng;
          }
        }

        // Helper to read raw rational values
        function readRationalArray(offset: number, count: number): number[] {
          const arr: number[] = [];
          let currentOffset = tiffOffset + offset;
          for (let i = 0; i < count; i++) {
            if (currentOffset + 8 > view.byteLength) break;
            const num = view.getUint32(currentOffset, !bigEndian);
            const den = view.getUint32(currentOffset + 4, !bigEndian);
            arr.push(den === 0 ? num : num / den);
            currentOffset += 8;
          }
          return arr;
        }

        parseIFD(firstIFDOffset);
        
        // Fallback: If no EXIF dateTime was found, use the file's last modified timestamp
        if (!exifData.dateTime && file.lastModified) {
          const d = new Date(file.lastModified);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          exifData.dateTime = `${yyyy}:${mm}:${dd} ${hh}:${min}:${ss}`;
        }
        
        resolve(exifData);
      } catch (err) {
        console.error("EXIF binary parsing error:", err);
        resolve({});
      }
    };
    reader.onerror = () => resolve({});
    // Read the first 128KB of the file (typically contains metadata APP1 header)
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024));
  });
}

/**
 * Convenience wrapper for ImageEditOverlay:
 * Returns only the GPS coords (or null if not found).
 */
export async function extractGpsFromImage(file: File): Promise<{ lat: number; lng: number } | null> {
  const exif = await readExif(file);
  if (exif.latitude !== undefined && exif.longitude !== undefined) {
    return { lat: exif.latitude, lng: exif.longitude };
  }
  return null;
}
