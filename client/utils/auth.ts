// Helper functions for authentication

// Check if user is logged in
export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem("token")
}

// Get the current user's ID
export const getUserId = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("userId")
}

// Get the authentication token
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

// Log the user out
export const logout = (): void => {
  if (typeof window === "undefined") return
  localStorage.removeItem("token")
  localStorage.removeItem("userId")
  window.location.href = "/"
}

// Add token to fetch requests
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken()

  const headers = {
    ...options.headers,
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

