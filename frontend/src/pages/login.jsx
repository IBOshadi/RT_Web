import React, { useEffect, useState, useContext } from "react"; // Add useContext here
import AuthCard from "../components/AuthCard";
import Alert from '../components/Alert';
import axios from 'axios';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Cookies from "js-cookie";
import { AuthContext } from "../AuthContext"; // Make sure AuthContext is properly imported
import config from '../config';

const Login = ({ setAuthToken }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [alert, setAlert] = useState(null);
  const { login } = useContext(AuthContext); // Use useContext here
  const [ip, setIp] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://api64.ipify.org?format=json") // Fetch public IP
        .then(res => res.json())
        .then(data => setIp(data.ip))
        .catch(err => console.error("Error fetching IP:", err));
}, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUsernameError("");
    setPasswordError("");
    setServerError("");
  
    let valid = true;
    if (!username) {
      setUsernameError("Username is required.");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    }
  
    if (valid) {
      try {
        
        const res = await axios.post(`${config.baseURL}login`, { username, password,ip });
        if (res.data.message === "Login successful") {
          const token = res.data.token; 
          const storage = rememberMe ? localStorage : sessionStorage;
          
          // Extract token
          login(token); // Update AuthContex
          
          navigate("/profile");
          
        } else {
          setAlert({ message: res.data.message || "Login failed", type: "error" });
          setServerError(res.data.message || "Login failed");
  
          // Dismiss alert after 3 seconds
          setTimeout(() => setAlert(null), 3000);
        }
      } catch (err) {
        setServerError(err.response?.data?.message || "Login failed");
        setAlert({ message: err.response?.data?.message || "Login failed", type: "error" });
  
        // Dismiss alert after 3 seconds
        setTimeout(() => setAlert(null), 3000);
      }
    }

  };
  
  const handleForgotPassword = async () => {
    if (!username) {
      setAlert({ message: "Please enter your username to reset your password", type: "error" });
      
      // Dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
      return;
    }
  
    try {
      const res = await axios.post(`${config.baseURL}forgot-password`, { username });
      setAlert({ message: res.data.message, type: "success" });
  
      // Dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ message: err.response?.data?.message || "Error sending email", type: "error" });
  
      // Dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    }
  };

  return (
    <AuthCard linkText="Don't have an account?" linkHref="/register" fullWidth={true}>
      {alert && <Alert message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none"
            placeholder="Enter Username"
          />
          {usernameError && <p className="text-red-500 text-sm mt-1">{usernameError}</p>}
        </div>

        <div className="relative">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none"
            placeholder="Enter password"
          />
          {showPassword ? (
            <FaEyeSlash
              className="absolute right-3 top-10 text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            />
          ) : (
            <FaEye
              className="absolute right-3 top-10 text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            />
          )}
          {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              className="mr-2"
            />
            <label htmlFor="remember-me" className="text-xs text-gray-700">
              Remember Me
            </label>
          </div>

          <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-600 hover:underline">
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800"
        >
          Login
        </button>
      </form>
    </AuthCard>
  );
};

export default Login;
