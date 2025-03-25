export interface User {
  userID: number
  userName: string
  email: string
  phone?: string
  userType: string
}

export interface LoginResponse {
  token: string
  userId: number
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch("http://localhost:8000/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error("Invalid credentials")
  }

  return response.json()
}

export const getCurrentUser = async (): Promise<User | null> => {
  const token = localStorage.getItem("token")
  const userId = localStorage.getItem("userId")

  if (!token || !userId) {
    return null
  }

  try {
    const response = await fetch(`http://localhost:8000/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user data")
    }

    return response.json()
  } catch (error) {
    console.error("Error fetching user data:", error)
    return null
  }
}

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token")
}

export const logout = (): void => {
  localStorage.removeItem("token")
  localStorage.removeItem("userId")
} 