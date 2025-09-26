import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch current user
  const { 
    data: user, 
    isLoading, 
    error, 
    refetch: refetchUser 
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.clear();
      window.location.href = "/login";
    },
    onError: () => {
      // Even if logout fails, clear local state
      setIsAuthenticated(false);
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  // Update authentication status based on user data
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else if (error) {
      setIsAuthenticated(false);
    }
  }, [user, error]);

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const contextValue: AuthContextType = {
    user: user || null,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}