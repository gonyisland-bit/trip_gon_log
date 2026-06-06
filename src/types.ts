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
  gallery?: string[];
  deletedAt?: number | null; // Soft-delete timestamp (null = active)
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
  transitType?: 'train' | 'bus';
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
}

