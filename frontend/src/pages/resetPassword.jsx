import React, { useState } from "react";
import AuthCard from "../components/AuthCard";
import Alert from "../components/Alert";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import axios from "axios";
import config from '../config';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      setAlert({ message: "Please enter a new password", type: "error" });

      // Automatically dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    try {
      const token = new URLSearchParams(window.location.search).get("token");
      const response = await axios.post(`${config.baseURL}reset-password`, { token, newPassword });
      setAlert({ message: response.data.message, type: "success" });

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        setAlert(null); // Clear the alert before redirect
        window.location.href = "/login";
      }, 3000);
    } catch (err) {
      setAlert({
        message: err.response?.data?.message || "Something went wrong",
        type: "error",
      });

      // Automatically dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    }
  };

  return (
    <AuthCard linkText="Back to Login" linkHref="/login" fullWidth={true}>
      {alert && <Alert message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
      <h2 className="text-xl font-semibold text-center mb-4">Reset Password</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="relative">
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none"
            placeholder="Enter new password"
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
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800"
        >
          Reset Password
        </button>
      </form>
    </AuthCard>
  );
};

export default ResetPassword;
