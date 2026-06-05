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
  lat?: number;
  lng?: number;
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
}

