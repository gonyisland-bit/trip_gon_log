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
}

export interface TimelineData {
  [date: string]: TimelineItem[];
}
