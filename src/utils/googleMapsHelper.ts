export const GOOGLE_MAPS_API_KEY = 'AIzaSyD3v6WKVr8wXirD5npL-DVDJMWrZUFm7xY';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 구글 Geocoding API를 호출하여 장소명/주소를 위도, 경도로 변환합니다.
 */
export const fetchCoordinates = async (address: string): Promise<Coordinates | null> => {
  if (!address || address.trim() === '') return null;
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    } else {
      console.warn(`Geocoding failed for address "${address}":`, data.status);
    }
  } catch (error) {
    console.error('Error fetching coordinates:', error);
  }
  return null;
};

/**
 * Web Mercator Projection 공식을 사용하여 특정 위경도가 
 * 중심점(centerLat, centerLng) 및 줌 레벨(zoom)을 가진 정적 지도(가로 w, 세로 h) 상의 
 * 상대 % 좌표(x, y)의 어느 곳에 매핑되는지 계산합니다.
 */
export const latLngToPoint = (
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  width: number,
  height: number
): { x: number; y: number } => {
  const TILE_SIZE = 256;
  
  // 1. 위경도를 World Coordinate (0 ~ 256)로 변환
  const siny = Math.sin((lat * Math.PI) / 180);
  // 위도가 극지방에 가까워질 때 발산하는 것 방지
  const cappedSiny = Math.min(Math.max(siny, -0.9999), 0.9999);
  const latValue = Math.log((1 + cappedSiny) / (1 - cappedSiny));
  
  const x = (lng + 180) * (TILE_SIZE / 360);
  const y = TILE_SIZE / 2 - (latValue * TILE_SIZE) / (4 * Math.PI);
  
  // 2. 중심점의 World Coordinate 변환
  const cSiny = Math.sin((centerLat * Math.PI) / 180);
  const cCappedSiny = Math.min(Math.max(cSiny, -0.9999), 0.9999);
  const cLatValue = Math.log((1 + cCappedSiny) / (1 - cCappedSiny));
  
  const cx = (centerLng + 180) * (TILE_SIZE / 360);
  const cy = TILE_SIZE / 2 - (cLatValue * TILE_SIZE) / (4 * Math.PI);
  
  // 3. 줌 레벨 스케일 적용 (2^zoom)
  const scale = Math.pow(2, zoom);
  
  // 4. 중심점 기준의 픽셀 오프셋 구하기
  const pixelX = (x - cx) * scale + width / 2;
  const pixelY = (y - cy) * scale + height / 2;
  
  // 5. 이미지 크기 대비 % 좌표로 변환
  return {
    x: (pixelX / width) * 100,
    y: (pixelY / height) * 100
  };
};

/**
 * 여러 개의 좌표 목록을 감싸는 최적의 지도 중심과 줌 레벨을 동적으로 계산합니다.
 */
export const calculateMapBounds = (
  coords: Coordinates[],
  mapWidth: number,
  mapHeight: number
): { center: Coordinates; zoom: number } => {
  const WORLD_DIM = { height: 256, width: 256 };
  const ZOOM_MAX = 21;
  const ZOOM_MIN = 1;
  const PADDING = 1.35; // 지도 경계 주변의 패딩 팩터 (여유 공간)

  if (coords.length === 0) {
    // 좌표가 없으면 기본값 (예: 교토 중심) 반환
    return { center: { lat: 35.0116, lng: 135.7681 }, zoom: 12 };
  }

  if (coords.length === 1) {
    return { center: coords[0], zoom: 14 };
  }

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  coords.forEach((c) => {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // 줌 레벨 계산 헬퍼 함수
  const latRad = (lat: number) => {
    const sin = Math.sin((lat * Math.PI) / 180);
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
  };

  const zoom = (mapPx: number, worldPx: number, fraction: number): number => {
    return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
  };

  const latFraction = (latRad(maxLat) - latRad(minLat)) / Math.PI;
  let lngDiff = maxLng - minLng;
  if (lngDiff < 0) lngDiff += 360;
  const lngFraction = lngDiff / 360;

  const latZoom = zoom(mapHeight, WORLD_DIM.height, latFraction * PADDING);
  const lngZoom = zoom(mapWidth, WORLD_DIM.width, lngFraction * PADDING);

  // 화면 크기에 맞게 가로/세로 중 더 제한적인(더 낮은) 줌 레벨 선택
  const calculatedZoom = Math.min(latZoom, lngZoom);
  const finalZoom = Math.max(ZOOM_MIN, Math.min(calculatedZoom, ZOOM_MAX));

  return {
    center: { lat: centerLat, lng: centerLng },
    zoom: finalZoom
  };
};

/**
 * Google Static Maps API URL을 조립합니다. (다크/라이트 모드 대응)
 */
export const getStaticMapUrl = (
  centerLat: number,
  centerLng: number,
  zoom: number,
  width: number,
  height: number,
  isDarkMode: boolean,
  coords: Coordinates[]
): string => {
  // 프리미엄 매거진 감성을 위한 미니멀 스타일링 쿼리 적용
  // 그레이스케일 및 심플 도로망만 렌더링
  const lightStyles = [
    'feature:all|element:labels.icon|visibility:off',
    'feature:all|element:labels.text.stroke|visibility:on|color:0xffffff|weight:2',
    'feature:all|element:labels.text.fill|color:0x444444',
    'feature:landscape|element:geometry|color:0xf5f5f3',
    'feature:water|element:geometry|color:0xe0e5eb',
    'feature:road|element:geometry.fill|color:0xffffff',
    'feature:road|element:geometry.stroke|color:0xe6e6e6',
    'feature:poi|element:geometry|color:0xf0f0ed',
    'feature:transit|element:geometry|color:0xf5f5f3'
  ];

  const darkStyles = [
    'feature:all|element:labels.icon|visibility:off',
    'feature:all|element:labels.text.stroke|visibility:on|color:0x111111|weight:2',
    'feature:all|element:labels.text.fill|color:0xbbbbbb',
    'feature:landscape|element:geometry|color:0x1b1b1b',
    'feature:water|element:geometry|color:0x0f172a',
    'feature:road|element:geometry.fill|color:0x2d2d2d',
    'feature:road|element:geometry.stroke|color:0x1f1f1f',
    'feature:poi|element:geometry|color:0x222222',
    'feature:transit|element:geometry|color:0x1b1b1b'
  ];

  const styles = isDarkMode ? darkStyles : lightStyles;
  const styleString = styles.map((s) => `&style=${encodeURIComponent(s)}`).join('');

  // 맵에 표시할 실제 핀들도 static map 이미지에 백그라운드로 희미하게 찍어두고 싶다면 markers 추가 가능
  // 하지만 React가 그 위에 정확한 마커를 그리므로, 맵 이미지 자체는 깨끗하게 그립니다.
  // 단, 줌/센터 자동 계산 시 마커들의 범위를 구글맵이 강제 인지하도록 하려면 visible 파라미터를 추가할 수 있습니다.
  const visibleString = coords.length > 0 
    ? `&visible=${coords.map((c) => `${c.lat},${c.lng}`).join('|')}` 
    : '';

  return `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=${zoom}&size=${width}x${height}&scale=2&maptype=roadmap${styleString}${visibleString}&key=${GOOGLE_MAPS_API_KEY}`;
};
