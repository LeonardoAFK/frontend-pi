export type CategoryValue = number;
export type ReactionType = 1 | 2 | 3 | 4 | 5;

export const CATEGORY_OPTIONS = [
  { value: 0, label: "Deportes" },
  { value: 1, label: "Musica" },
  { value: 2, label: "Fiestas" },
  { value: 3, label: "Educacion" },
  { value: 4, label: "Tecnologia" },
  { value: 5, label: "Gastronomia" },
  { value: 6, label: "Videojuegos" },
  { value: 7, label: "Arte" },
  { value: 8, label: "Bienestar" },
  { value: 9, label: "Viajes" },
] as const;

export const REACTION_OPTIONS: {
  id: ReactionType;
  emoji: string;
  label: string;
  key: keyof ReactionSummary;
}[] = [
  { id: 1, emoji: "👍", label: "Like", key: "like" },
  { id: 2, emoji: "❤️", label: "Love", key: "love" },
  { id: 3, emoji: "😂", label: "Laugh", key: "laugh" },
  { id: 4, emoji: "😮", label: "Wow", key: "wow" },
  { id: 5, emoji: "😢", label: "Sad", key: "sad" },
];

export function getCategoryLabel(category: number) {
  return (
    CATEGORY_OPTIONS.find((item) => item.value === category)?.label ??
    `Categoría ${category}`
  );
}

export interface ReactionSummary {
  like: number;
  love: number;
  laugh: number;
  wow: number;
  sad: number;
}

export interface UserResponse {
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
  createDate?: string | null;
  updateDate?: string | null;
}

export interface EventResponse {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  address: string;
  maxParticipants: number;
  isPublic: boolean;
  imageUrl?: string | null;
  price?: number | null;
  reactions?: ReactionSummary | null;
  myReaction?: ReactionType | null;
  category: CategoryValue;
  createdByUserId?: string | null;
  createdByUser?: UserResponse | null;
  createdByUserName: string;
}

export interface EventFilter {
  category?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  radiusInKm?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreateEventPayload {
  id?: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  address: string;
  maxParticipants: number;
  isPublic: boolean;
  category: number;
  price?: number | null;
  imageUrl?: string | null;
  createdByUserName?: string;
}
export type EventItem = EventResponse;

export interface EventParticipantPayload {
  eventId: number;
  cancellationReason?: string;
}

export interface EventParticipantPayload {
  eventId: number;
  cancellationReason?: string;
}

export interface ApproveOrRejectParticipantPayload {
  eventId: number;
  userId: string;
  approve: boolean;
}

export interface EventParticipantResponse {
  id?: number;
  eventId?: number;
  userId?: string;
  userName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  isApproved?: boolean;
  createDate?: string;
}