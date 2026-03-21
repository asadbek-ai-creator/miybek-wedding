export interface Event {
  id: string;
  name: string;
  date: string;
  coupleName: string;
  coverPhotoURL?: string;
  createdAt: number;
  hostUID: string;
  guestCount: number;
  photoCount: number;
}

export interface Photo {
  id: string;
  eventId: string;
  imageURL: string;
  thumbnailURL?: string;
  filter: string;
  guestName: string;
  guestUID: string;
  createdAt: number;
  width: number;
  height: number;
}

export interface Guest {
  uid: string;
  name: string;
  eventId: string;
  joinedAt: number;
  photoCount: number;
}
