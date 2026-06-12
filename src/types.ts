import React from 'react';

export interface WeatherInfo {
  icon: React.ComponentType<{ className?: string }>;
  temp: string;
}

export interface TripDate {
  id: string;
  date: string;
  label: string;
  weather: WeatherInfo | null;
}

export interface GalleryImageMeta {
  url: string;
  date?: string;
  time?: string;
  place?: string;
  imgNote?: string;
  lat?: number | null;
  lng?: number | null;
  excludeFromMap?: boolean;
}

export interface Trip {
  id: number;
  title: string;
  date: string;
  tags: string[];
  img: string;
  mapImg: string;
  locationStr: string;
  lat?: number;
  lng?: number;
  gallery?: (string | GalleryImageMeta)[];
  deletedAt?: number | null; // Soft-delete timestamp (null = active)
  displayOrder?: number;
  weatherData?: {
    [date: string]: {
      type: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'snowy' | 'stormy' | '';
      temp: string;
    };
  };
  members?: string[];
  customExpenses?: CustomExpenseItem[];
}

export interface CustomExpenseItem {
  id: string;
  name: string;
  date: string;        // YYYY.MM.DD format
  cost: string;
  currency: string;
  paidBy: string;
  attachments?: string[]; // Firebase Storage URLs (images or PDFs)
}

export interface Plan extends Trip {}

export interface TimelineItem {
  id: number;
  time: string;
  type: string;
  place: string;
  cost: string;
  memo: string;
  x?: number;
  y?: number;
  location?: string;
  hours?: string;
  link?: string;
  img?: string | null;
  imgNote?: string;    // Per-image memo displayed in gallery
  lat?: number;
  lng?: number;
  date?: string;
  tripId?: number;
  excludeFromMap?: boolean;
  originDate?: string;
  paidBy?: string;
  currency?: string;
}

export interface TimelineData {
  [date: string]: TimelineItem[];
}

export interface FlightItem {
  id: number;
  title: string; // e.g. "OUTBOUND FLIGHT"
  date: string;
  fromCode: string;
  fromTerminal: string;
  fromTime: string;
  toCode: string;
  toTerminal: string;
  toTime: string;
  flightNo: string;
  seat: string;
  pnr: string;
  layoverCode?: string;
  layoverTime?: string;
  tripId?: number;
  cost?: string;
  paidBy?: string;
  currency?: string;
}

export interface StayItem {
  id: number;
  status: string; // e.g. "BOOKING CONFIRMED"
  title: string;
  dateRange: string;
  address: string;
  memo: string;
  confNo: string;
  img: string;
  lat?: number;
  lng?: number;
  additionalImages?: string[];
  cost?: string;
  paidBy?: string;
  currency?: string;
}

export interface TransitItem {
  id: number;
  ticketType: string; // e.g. "TRAIN TICKET"
  date: string;
  title: string;
  route: string;
  time: string;
  seat: string;
  bookingRef: string;
  transitType?: 'train' | 'bus' | 'taxi';
  departPlace?: string;
  departLat?: number;
  departLng?: number;
  arrivePlace?: string;
  arriveLat?: number;
  arriveLng?: number;
  boardingPlace?: string;
  boardingLat?: number;
  boardingLng?: number;
  boardingImg?: string | null;
  tripId?: number;
  memo?: string;
  displayOrder?: number;
  cost?: string;
  paidBy?: string;
  currency?: string;
}

export type TabType = 'timeline' | 'flights' | 'stays' | 'transit' | 'gallery' | 'settlement';


