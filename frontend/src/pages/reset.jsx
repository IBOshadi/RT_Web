import React, { useState, useContext } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/SideBar";
import Heading from "../components/Heading";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import Alert from '../components/Alert';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import config from '../config';

const Reset = () => {
  const { authToken } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [nameError, setNameError] = useState("");
  const [ipError, setIpError] = useState("");
  const [portError, setPortError] = useState("");
  const [alert, setAlert] = useState(null); // State to hold the alert message and type
  
  
  const token = localStorage.getItem("authToken");
  const navigate = useNavigate();
  let username;
 
  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  if (token) {
    // Split the token into its parts
    const decodedToken = jwtDecode(token);
    username = decodedToken.username;
  } else {
      console.error("No token found in localStorage");
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setNameError("");
    setIpError("");
    setPortError("");

    let isValid = true;


    if (!name) {
      setNameError("Username is required.");
      isValid = false;
    }


    // Proceed if form is valid
    if (isValid) {
      const data = { name, ip, port,username };

      const config1 = {
        headers: {
          "Content-Type": "application/json", // Specify the data format
          Authorization: `Bearer ${token}`,  // Include authorization token if required
        },
        params: {
          debug: true, // Example query parameter
        },
      };
    
      axios
        .put(`${config.baseURL}reset-database-connection`, data,config1)
        .then((response) => {
          if (response.data.message === "Database connection updated successfully") {
            setAlert({
              message: "Database connection successful!",
              type: "success",
            });
    
            // Dismiss alert automatically after 3 seconds
            setTimeout(() => {
              setAlert(null);
              navigate("/login"); // Navigate to login page
            }, 1000);
          
    
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
          console.error("There was an error when establishing the connection:", error);
          const errorMessage = error.response?.data?.message || "Connection failed. Please try again.";
          setAlert({
            message: errorMessage,
            type: "error",
          });
    
          // Dismiss alert automatically after 3 seconds
          setTimeout(() => setAlert(null), 3000);
        });
    }
    
  };

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };
  
  return (
    <div>
      <Navbar />
      <div className="flex">
        <Sidebar onToggle={handleSidebarToggle} />
        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "ml-60" : "ml-16"
          } flex-1 p-10`}
        >
          <div className="mt-20 mb-10">
            <Heading text="Reset Database Connection" />
          </div>

      {/* Alert Component: Display if alert state is set */}
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)} // Close alert when clicked
        />
      )}

<div className="flex items-center justify-center mt-20">
  <div className="w-full md:w-1/4 md:max-w-md">
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter Username"
        />
        {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
      </div>

      {/* IP Input */}
      <div>
        <label htmlFor="ip" className="block text-sm font-medium text-gray-700">
          IP Address
        </label>
        <input
          type="text"
          id="ip"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter IP Address"
        />
      </div>

      {/* Port Input */}
      <div>
        <label htmlFor="port" className="block text-sm font-medium text-gray-700">
          Port
        </label>
        <input
          type="text"
          id="port"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="mt-1 block w-full px-3 py-2 mb-5 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter Port"
        />
      </div>

      {/* Register Button */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800"
      >
        Reset
      </button>
    </form>
  </div>
</div>


          
        </div>
      </div>
    </div>
  );
};

export default Reset;

