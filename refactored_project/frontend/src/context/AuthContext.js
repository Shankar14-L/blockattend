import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

// Configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';
const API = `${BACKEND_URL}/api`;

// Create Auth Context
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            const role = localStorage.getItem('role') || userData.role || 'student';
            setUser({ ...userData, role });
          } catch (e) {
            console.error('Error parsing user data:', e);
            clearAuthData();
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const login = async (email, password, role = 'student') => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password, role });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      const userWithRole = { ...userData, role };
      localStorage.setItem('user', JSON.stringify(userWithRole));
      
      setToken(access_token);
      setUser(userWithRole);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const register = async (studentData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, studentData);
      const { role } = studentData;
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      const userWithRole = { ...userData, role };
      localStorage.setItem('user', JSON.stringify(userWithRole));
      
      setToken(access_token);
      setUser(userWithRole);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
      return false;
    }
  };

  const logout = useCallback(() => {
    clearAuthData();
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, [clearAuthData]);

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Hook with error handling
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Axios Interceptor Setup
axios.defaults.timeout = 10000; // 10 second timeout

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject(error);
  }
);

export { API };
