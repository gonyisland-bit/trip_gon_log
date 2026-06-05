export interface GPSCoordinates {
  lat: number;
  lng: number;
}

/**
 * exif-js를 이용하여 이미지 파일에서 GPS 위경도를 추출합니다.
 */
export function extractGpsFromImage(file: File): Promise<GPSCoordinates | null> {
  return new Promise((resolve) => {
    const EXIF = (window as any).EXIF;
    if (!EXIF) {
      console.warn("EXIF-js library not loaded yet.");
      resolve(null);
      return;
    }

    EXIF.getData(file, function (this: any) {
      const lat = EXIF.getTag(this, 'GPSLatitude');
      const lng = EXIF.getTag(this, 'GPSLongitude');
      const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N';
      const lngRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E';

      if (!lat || !lng) {
        resolve(null);
        return;
      }

      // EXIF GPS Coordinates conversion helper
      const convertDMSToDD = (dms: any[], ref: string): number => {
        if (!dms || dms.length < 3) return 0;
        
        // Handle rational fractions or plain numbers
        const getVal = (val: any): number => {
          if (typeof val === 'object' && val !== null) {
            return (val.numerator / val.denominator) || 0;
          }
          return Number(val) || 0;
        };

        const d = getVal(dms[0]);
        const m = getVal(dms[1]);
        const s = getVal(dms[2]);

        let dd = d + m / 60 + s / 3600;
        if (ref === 'S' || ref === 'W') {
          dd = -dd;
        }
        return dd;
      };

      const decimalLat = convertDMSToDD(lat, latRef);
      const decimalLng = convertDMSToDD(lng, lngRef);

      if (decimalLat && decimalLng && !isNaN(decimalLat) && !isNaN(decimalLng)) {
        resolve({ lat: decimalLat, lng: decimalLng });
      } else {
        resolve(null);
      }
    });
  });
}
