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
  country?: string;
  locations?: { name: string; lat?: number; lng?: number; country?: string }[];
  videoUrl?: string;
  heroImg?: string;
  heroVideoUrl?: string;
  description?: string;
  subtitle?: string;
  gallery?: (string | GalleryImageMeta)[];
  deletedAt?: number | null; // Soft-delete timestamp (null = active)
  displayOrder?: number;
  statusBadge?: 'NEW' | 'EDITING' | 'PLAN' | '';
  isPlan?: boolean;
  weatherData?: {
    [date: string]: {
      type: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'snowy' | 'stormy' | '';
      temp: string;
    };
  };
  members?: string[];
  customExpenses?: CustomExpenseItem[];
  pocketSpots?: SpotPocketItem[];
  ownerId?: string;
  ownerEmail?: string;
  allowedEditors?: string[];
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
  vehicleType?: 'car' | 'train' | null;
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
  attachments?: string[];
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
  transitType?: 'train' | 'bus' | 'taxi' | 'car';
  carModel?: string;
  carNumber?: string;
  rentalDropoffDate?: string;
  rentalDropoffTime?: string;
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
  attachments?: string[];
}

export type TabType = 'summary' | 'timeline' | 'flights' | 'stays' | 'transit' | 'gallery' | 'settlement' | 'pocket';

export type PocketCategory = 'food' | 'cafe' | 'spot' | 'shopping' | 'tip';
export type SpotPocketPlatform = 'instagram' | 'youtube' | 'blog' | 'maps' | 'web';

export interface PocketComment {
  id: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
  authorId: string;
  authorName: string;
  authorEmail?: string;
}

export interface SpotPocketItem {
  id: string;
  tripId?: number | null;
  title: string;
  category: PocketCategory;
  memo?: string;
  sourceUrl?: string;
  platform?: SpotPocketPlatform;
  thumbnailUrl?: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  address?: string;
  isFavorite?: boolean;
  createdAt: number;
  order?: number;
  likes?: number;
  likedBy?: string[];
  comments?: PocketComment[];
}

export interface MagazineMoment {
  id: string;
  tripId?: number;
  timelineItemId?: number;
  title: string;
  date?: string;
  location?: string;
  placeName?: string;
  caption?: string;
  img: string;
  quote?: string;
  order?: number;
  layoutType?: 'landscape' | 'portrait' | 'normal' | 'tall' | 'wide' | 'large';
  isTextOnly?: boolean;
  textContent?: string;
  textBgStyle?: 'dark' | 'light' | 'accent';
}

export type MagazineItem = MagazineMoment;

export interface MagazineSection {
  id: string;
  title: string;
  subtitle?: string;
  heroImg?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDate?: string;
  heroLocation?: string;
  heroTripId?: number;
  items: MagazineItem[];
  order: number;
  isDefault?: boolean;
}

export interface TrashedMagazineSection extends MagazineSection {
  deletedType?: 'magazine_section';
  deletedAt?: number;
  docId?: string;
}

export interface MagazineHubConfig {
  mainTitle?: string;
  subtitle?: string;
  badgeText?: string;
  volumeText?: string;
}

export interface ArchiveHubConfig {
  mainTitle?: string;
  subtitle?: string;
  badgeText?: string;
  volumeText?: string;
}

export type TrashedItem = (Trip & { deletedType?: 'journey' }) | TrashedMagazineSection;

export interface CalendarCustomEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  category: 'work' | 'family' | 'personal' | 'blocked';
  color?: string;
  memo?: string;
  createdAt: number;
}

export interface LandingHeroMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  title?: string;
}

export interface UserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  lastName: string;
  firstName: string;
  birthdate: string;
  phone: string;
  role: 'admin' | 'user';
  permissions: UserPermissions;
  createdAt: number;
}

