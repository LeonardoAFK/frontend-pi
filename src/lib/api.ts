import type {
  ApproveOrRejectParticipantPayload,
  CreateEventPayload,
  EventFilter,
  EventParticipantPayload,
  EventParticipantResponse,
  EventResponse,
  LoginPayload,
  ReactionSummary,
  ReactionType,
  RegisterPayload,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5160";

export const routes = {
  // Usuario
  login: `${API_URL}/User/Login`,
  register: `${API_URL}/User/Register`,
  me: `${API_URL}/User/GetUserAuthenticated`,
  changePassword: `${API_URL}/User/ChangePassword`,
  uploadProfileImage: `${API_URL}/User/UploadImageProfileAsync`,

  // Eventos
  getEvents: `${API_URL}/Event/GetEvents`,
  getMyRegisteredEvents: `${API_URL}/Event/GetEventsIAmRegistered`,
  createEvent: `${API_URL}/Event/Create`,
  updateEvent: `${API_URL}/Event/Update`,
  deleteEvent: (id: number) => `${API_URL}/Event/Delete/${id}`,
  uploadEventImage: `${API_URL}/Event/UploadImageAsync`,

  // Participantes
  registerToEvent: `${API_URL}/EventParticipant/RegisterToEvent`,
  cancelRegistration: `${API_URL}/EventParticipant/CancelRegistration`,
  approveOrRejectParticipant: `${API_URL}/EventParticipant/ApproveOrRejectParticipant`,
  getParticipantsByEventId: `${API_URL}/EventParticipant/GetParticipantsByEventId`,
  getPendingRequests: `${API_URL}/EventParticipant/GetPendingRequestsAsync`,

  // Reacciones
  reactToEvent: `${API_URL}/Reaction/ReactToEvent`,
  getReactionsByEventId: `${API_URL}/Reaction/GetReactionsByEventId`,
  deleteReaction: (eventId: number) =>
    `${API_URL}/Reaction/Delete/${eventId}`,
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    let errorMessage = "Error en la petición";

    try {
      if (contentType.includes("application/json")) {
        const errorData = await response.json();

        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } else {
        const text = await response.text();
        if (text) errorMessage = text;
      }
    } catch {
      errorMessage = "Error en la petición";
    }

    throw new Error(errorMessage);
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

function buildQueryParams(filter: EventFilter) {
  const params = new URLSearchParams();

  if (typeof filter.category === "number") {
    params.set("Category", String(filter.category));
  }

  if (filter.search) {
    params.set("Search", filter.search);
  }

  if (filter.startDate) {
    params.set("StartDate", filter.startDate);
  }

  if (filter.endDate) {
    params.set("EndDate", filter.endDate);
  }

  return params.toString();
}

export const api = {
  login: async (payload: LoginPayload) => {
    return apiFetch<{ token: string }>(routes.login, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  register: async (payload: RegisterPayload) => {
    return apiFetch<string>(routes.register, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMe: async () => {
    const token = getToken();

    return apiFetch<{
      firstName?: string | null;
      lastName?: string | null;
      userName?: string | null;
      email?: string | null;
      message?: string | null;
    }>(routes.me, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getEvents: async (filter: EventFilter = {}) => {
    const token = getToken();

    const query = buildQueryParams(filter);
    const url = query ? `${routes.getEvents}?${query}` : routes.getEvents;

    return apiFetch<EventResponse[]>(url, {
      method: "GET",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
  },

  getMyRegisteredEvents: async () => {
    const token = getToken();

    return apiFetch<EventResponse[]>(routes.getMyRegisteredEvents, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  createEvent: async (payload: CreateEventPayload) => {
    const token = getToken();

    return apiFetch<EventResponse>(routes.createEvent, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  updateEvent: async (payload: CreateEventPayload) => {
    const token = getToken();

    return apiFetch<EventResponse>(routes.updateEvent, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  deleteEvent: async (id: number) => {
    const token = getToken();

    return apiFetch<string>(routes.deleteEvent(id), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  uploadEventImage: async (eventId: number, file: File) => {
    const token = getToken();

    const formData = new FormData();
    formData.append("EventId", String(eventId));
    formData.append("FormFile", file);

    return apiFetch<{ url: string; publicId: string }>(
      routes.uploadEventImage,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );
  },

  uploadProfileImage: async (file: File) => {
    const token = getToken();

    const formData = new FormData();
    formData.append("file", file);

    return apiFetch<{ url: string; publicId: string }>(
      routes.uploadProfileImage,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );
  },

  


    registerToEvent: async (eventId: number) => {
    const token = getToken();

    const payload: EventParticipantPayload = {
      eventId,
      cancellationReason: "",
    };

    return apiFetch<string>(routes.registerToEvent, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  cancelRegistration: async (
    eventId: number,
    cancellationReason = "Cancelado por el usuario"
  ) => {
    const token = getToken();

    const payload: EventParticipantPayload = {
      eventId,
      cancellationReason,
    };

    return apiFetch<string>(routes.cancelRegistration, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  getParticipantsByEventId: async (eventId: number) => {
    const token = getToken();

    const url = `${routes.getParticipantsByEventId}?eventId=${eventId}`;

    return apiFetch<EventParticipantResponse[]>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getPendingRequests: async (eventId: number) => {
    const token = getToken();

    const url = `${routes.getPendingRequests}?eventId=${eventId}`;

    return apiFetch<EventParticipantResponse[]>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  approveOrRejectParticipant: async (
    payload: ApproveOrRejectParticipantPayload
  ) => {
    const token = getToken();

    return apiFetch<string>(routes.approveOrRejectParticipant, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },


  reactToEvent: async (eventId: number, reactionTypeId: ReactionType) => {
    const token = getToken();

    const url = `${routes.reactToEvent}?eventId=${eventId}&reactionTypeId=${reactionTypeId}`;

    return apiFetch<void>(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  getReactionsByEventId: async (eventId: number) => {
    const token = getToken();

    const url = `${routes.getReactionsByEventId}?eventId=${eventId}`;

    return apiFetch<ReactionSummary>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  deleteReaction: async (eventId: number) => {
    const token = getToken();

    return apiFetch<void>(routes.deleteReaction(eventId), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};