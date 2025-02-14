import React, { useEffect, useState, useContext } from 'react';
import RTLogo from "../assets/images/rt.png";
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import config from '../config';
import { AuthContext } from "../AuthContext";
import { jwtDecode } from "jwt-decode";

const Navbar = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);

   useEffect(() => {
      // Retrieve token and decode it
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
  setUsername(decodedToken.username)
        } catch (error) {
          console.error("Error decoding token:", error.message);
         
        }
      } else {
        console.error("No token found in localStorage");
      }
    }, []);

  const handleLogout = async () => {
    localStorage.removeItem("authToken");
    logout();
    console.log("User logged out.");
    const res = await axios.post(`${config.baseURL}close-connection`, { username });

    if (res.data.message === "Connection Closed successfully") {
      navigate("/login", { replace: true }); 
    }
    else{
      console.log('Connection closing failed')
    }
      
  };

  return (
    <nav className="bg-black p-4 flex justify-between items-center shadow fixed w-full top-0 left-0 z-50">
  {/* Logo Section */}
  <div className="flex items-center">
    <img 
      src={RTLogo} // Adjust the path as needed
      alt="Logo"
      className="w-40 h-auto ml-5" // Adjust size as needed
    />
  </div>
  

  {/* Navigation Section */}
  <div className="flex items-center ml-auto mr-5">
  {/* Home Link */}
  <div className='text-white'>
  <Link 
    to="/profile" 
    className="text-[#f17e21] font-semibold mr-2 md:mr-10" // Adjust the margin for smaller screens
    style={{ 
      transition: "color 0.3s", // Smooth transition for hover effect
    }}
    onMouseEnter={(e) => (e.target.style.color = "#ffffff")} // Custom hover color
    onMouseLeave={(e) => (e.target.style.color = "#f17e21")} // Revert to original color
  >
    {username}
  </Link>
  </div>
  <Link 
    to="/" 
    className="text-[#f17e21] font-semibold mr-2 md:mr-10" // Adjust the margin for smaller screens
    style={{ 
      transition: "color 0.3s", // Smooth transition for hover effect
    }}
    onMouseEnter={(e) => (e.target.style.color = "#ffffff")} // Custom hover color
    onMouseLeave={(e) => (e.target.style.color = "#f17e21")} // Revert to original color
  >
    Home
  </Link>

  {/* Logout Button */}
  <button 
    onClick={handleLogout}
    className="w-full px-4 py-2 bg-[#f17e21] text-black font-semibold rounded-md hover:bg-[#efa05f] "
  >
    Logout
  </button>
</div>

</nav>

  );
};

export default Navbar;