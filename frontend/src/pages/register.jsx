import React, { useState } from "react";
import AuthCard from "../components/AuthCard";
import Alert from '../components/Alert';
import axios from "axios";
import config from '../config';

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const [alert, setAlert] = useState(null); // State to hold the alert message and type
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate password strength on frontend
  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setUsernameError("");
    setEmailError("");
    setPasswordError("");

    let isValid = true;

    // Validate username, email, and password
    if (!username) {
      setUsernameError("Username is required.");
      isValid = false;
    }

    if (!email) {
      setEmailError("Email is required.");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters long, include uppercase, lowercase, a number, and a special character.");
      isValid = false;
    }

    // Proceed if form is valid
    if (isValid) {
      const data = { username, email, password };
    
      axios
        .post(`${config.baseURL}register`, data)
        .then((response) => {
          if (response.data.message === "User added successfully") {
            setAlert({
              message: "Registration successful!",
              type: "success",
            });
    
            // Dismiss alert automatically after 3 seconds
            setTimeout(() => setAlert(null), 3000);
    
            // Navigate to login page after 3 seconds
            setTimeout(() => {
              window.location.href = "/login";
            }, 3000);
          } else {
            setAlert({
              message: response.data.message,
              type: "error",
            });
    
            // Dismiss alert automatically after 3 seconds
            setTimeout(() => setAlert(null), 3000);
          }
        })
        .catch((error) => {
          console.error("There was an error with the registration:", error);
          const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
          setAlert({
            message: errorMessage,
            type: "error",
          });
    
          // Dismiss alert automatically after 3 seconds
          setTimeout(() => setAlert(null), 3000);
        });
    }
    
  };

  return (
    <AuthCard
      buttonLabel="Register"
      linkText="Already have an account?"
      linkHref="/login"
      fullWidth={false}
    >
      {/* Alert Component: Display if alert state is set */}
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)} // Close alert when clicked
        />
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Username Input */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Create Username"
          />
          {usernameError && <p className="text-red-500 text-sm mt-1">{usernameError}</p>}
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter Email"
          />
          {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Create Password"
          />
          {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
        </div>

        {/* Show Password Toggle */}
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="show-password"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)} // Toggle visibility
            className="mr-2"
          />
          <label htmlFor="show-password" className="text-xs text-gray-700">Show Password</label>
        </div>

        {/* Register Button */}
        <button
          type="submit"
         className="w-full px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800"
        >
          Register
        </button>
      </form>
    </AuthCard>
  );
};

export default Register;
