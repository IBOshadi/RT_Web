import React, { createContext, useState, useEffect } from "react";
import Cookies from 'js-cookie';

// Create the Auth Context
export const AuthContext = createContext();

// Provide the Auth Context
export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken")|| null);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem("authToken", authToken);
    } else {
      localStorage.removeItem("authToken");
    }
  }, [authToken]);

  const login = (token) => {
    setAuthToken(token);
    localStorage.setItem("authToken", token);
    Cookies.set("authToken", token, { expires: 7, secure: true, sameSite: "Strict" });
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem("authToken");
    Cookies.remove("authToken");
  };

  return (
    <AuthContext.Provider value={{ authToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
