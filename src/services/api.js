export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) {
        message = Array.isArray(data.detail)
          ? data.detail.map((d) => d.msg || d).join(", ")
          : data.detail;
      }
    } catch {
      // Ignore JSON parse errors and fall back to default message
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

export const api = {
  async fetchSpecies() {
    const response = await fetch(`${API_BASE_URL}/species`);
    return handleResponse(response);
  },

  async createSpecies(payload) {
    const response = await fetch(`${API_BASE_URL}/species`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async updateSpecies(id, payload) {
    const response = await fetch(`${API_BASE_URL}/species/${id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async fetchTrees() {
    const response = await fetch(`${API_BASE_URL}/trees`);
    return handleResponse(response);
  },

  async fetchTreeDetail(id) {
    const response = await fetch(`${API_BASE_URL}/trees/${id}`);
    return handleResponse(response);
  },

  async createTree(payload) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (key === "initialPhoto" && value instanceof File) {
        formData.append("initial_photo", value);
      } else if (key === "initialPhotoDescription") {
        formData.append("initial_photo_description", value);
      } else if (key === "initialPhotoDate") {
        formData.append("initial_photo_date", value);
      } else {
        formData.append(key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`), value);
      }
    });

    const response = await fetch(`${API_BASE_URL}/trees`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(response);
  },

  async updateTree(id, payload) {
    const response = await fetch(`${API_BASE_URL}/trees/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async deleteTree(id) {
    const response = await fetch(`${API_BASE_URL}/trees/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },

  async uploadTreePhoto(treeId, { file, description, photoDate }) {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }
    if (photoDate) {
      formData.append("photo_date", photoDate);
    }

    const response = await fetch(`${API_BASE_URL}/trees/${treeId}/photos`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(response);
  },

  async deleteTreePhoto(treeId, photoId) {
    const response = await fetch(`${API_BASE_URL}/trees/${treeId}/photos/${photoId}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },

  async createTreeUpdate(treeId, payload) {
    const response = await fetch(`${API_BASE_URL}/trees/${treeId}/updates`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async deleteTreeUpdate(treeId, updateId) {
    const response = await fetch(`${API_BASE_URL}/trees/${treeId}/updates/${updateId}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },

  async fetchReminders() {
    const response = await fetch(`${API_BASE_URL}/reminders`);
    return handleResponse(response);
  },

  async createReminder(payload) {
    const response = await fetch(`${API_BASE_URL}/reminders`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async updateReminder(id, payload) {
    const response = await fetch(`${API_BASE_URL}/reminders/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async deleteReminder(id) {
    const response = await fetch(`${API_BASE_URL}/reminders/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },

  async moveTreeToGraveyard(treeId, payload) {
    const response = await fetch(`${API_BASE_URL}/trees/${treeId}/graveyard`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async fetchGraveyard() {
    const response = await fetch(`${API_BASE_URL}/graveyard`);
    return handleResponse(response);
  },

  async deleteGraveyardEntry(id) {
    const response = await fetch(`${API_BASE_URL}/graveyard/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};

export default api;
