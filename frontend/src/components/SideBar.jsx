import React, { useState } from "react";
import { FaBars, FaTimes, FaChevronDown } from "react-icons/fa";
import {  MdManageAccounts,MdSpaceDashboard } from "react-icons/md";
import { MdCalculate } from "react-icons/md";
import { BiSolidReport } from "react-icons/bi";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";


const Sidebar = ({ onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false); // Admin dropdown toggle
  const [dashboardOpen, setDashboardOpen] = useState(false); // HR dropdown toggle
  const [reportOpen, setReportOpen] = useState(false); // HR dropdown toggle

  // Get the token from localStorage
const token = localStorage.getItem("authToken");
let admin = "";
let dashboardAccess = "";

if (token) {
    const decodedToken = jwtDecode(token);
    dashboardAccess = decodedToken.dashboard;
    admin = decodedToken.admin;
   
} else {
    console.error("No token found in localStorage");
}


  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (onToggle) {
      onToggle(!isOpen); // Notify parent component about the state
    }
  };

  const toggleAdmin = () => {
    setIsOpen(true); // Expand sidebar when Admin is clicked
    setAdminOpen(!adminOpen); // Toggle Admin dropdown
  };

  const toggleDashboard= () => {
    setIsOpen(true); // Expand sidebar when HR is clicked
    setDashboardOpen(!dashboardOpen); // Toggle dashboard dropdown
  };

  const toggleReport= () => {
    setIsOpen(true); // Expand sidebar when HR is clicked
    setReportOpen(!reportOpen); // Toggle dashboard dropdown
  };

  return (
    <div
    className={`flex ${isOpen ? "w-60" : "w-16"} bg-gradient-to-t from-[#ce521a] to-[#000000] text-white shadow-md transition-all duration-300 h-screen`}
    style={{
      // height: "calc(100vh - 96px)", // Adjust for navbar height
      position: "fixed", // Fix the sidebar to the left
      top: "96px", // Align with the navbar height
      left: 0,
      zIndex: 40, // Ensure the sidebar stays below the navbar
    }}>
 
      <div className="flex flex-col w-full h-full">
        <div className="flex items-center justify-between p-4">
          <button onClick={toggleSidebar} className="focus:outline-none">
            {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
          <span className={isOpen ? "block text-lg font-semibold" : "hidden"} />
        </div>

        <ul className="mt-4 flex-1 overflow-y-auto">
          
          {/* dashboard */}
          {(dashboardAccess === "t" || dashboardAccess === "T") && (
        <li
          className="flex items-center p-2 hover:bg-[#000000] cursor-pointer"
          onClick={toggleDashboard}
          aria-haspopup="true"
          aria-expanded={dashboardOpen}
        >
          <MdSpaceDashboard size={20} className="mr-2 ml-2 mb-4 mt-3" />
          <span className={`${isOpen ? "block" : "hidden"} ml-4`}>Dashboard</span>
          {isOpen && (
            <FaChevronDown
              size={14}
              className={`ml-auto transition-transform ${dashboardOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          )}
        </li>
      )}

      {/* submenu of dashboard */}
      {(dashboardAccess === "t" || dashboardAccess === "T") && dashboardOpen && isOpen && (
        <ul className="ml-8 pl-8">
          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/company-dashboard" className="w-full">
              Summary
            </NavLink>
          </li>

          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/department-dashboard" className="w-full">
              Departments
            </NavLink>
          </li>

          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/category-dashboard" className="w-full">
              Category
            </NavLink>
          </li>

          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/sub-category-dashboard" className="w-full">
              Sub Category
            </NavLink>
          </li>

          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/vendor-dashboard" className="w-full">
              Vendor
            </NavLink>
          </li>
        </ul>
      )}

       {/* report */}
       {(dashboardAccess === "t" || dashboardAccess === "T") && (
        <li
          className="flex items-center p-2 hover:bg-[#000000] cursor-pointer"
          onClick={toggleReport}
          aria-haspopup="true"
          aria-expanded={reportOpen}
        >
          <MdCalculate size={20} className="mr-2 ml-2 mb-4 mt-3" />
          <span className={`${isOpen ? "block" : "hidden"} ml-4`}>Transaction</span>
          {isOpen && (
            <FaChevronDown
              size={14}
              className={`ml-auto transition-transform ${reportOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          )}
        </li>
      )}

      {/* submenu of report */}
      {(dashboardAccess === "t" || dashboardAccess === "T") && reportOpen && isOpen && (
        <ul className="ml-8 pl-8">
          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/scan" className="w-full">
              Scan
            </NavLink>
          </li>

          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/stock-update" className="w-full">
              Stock Data
            </NavLink>
          </li>

          
        </ul>
      )}

          {/* admin */}
          {(admin === "t" || admin === "T") && (
        <li
          className="flex items-center p-2 hover:bg-[#000000] cursor-pointer"
          onClick={toggleAdmin}
          aria-haspopup="true"
          aria-expanded={adminOpen}
        >
          <MdManageAccounts size={20} className="mr-2 ml-2 mb-4 mt-3" />
          <span className={`${isOpen ? "block" : "hidden"} ml-4`}>Administration</span>
          {isOpen && (
            <FaChevronDown
              size={14}
              className={`ml-auto transition-transform ${adminOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          )}
        </li>
      )}

      {/* submenu of admin */}
      {(admin === "t" || admin === "T") && adminOpen && isOpen && (
        <ul className="ml-8 pl-8">
          <li className="flex items-center p-2 mt-4 hover:bg-[#000000]">
            <NavLink to="/reset" className="w-full">
              Reset Connection
            </NavLink>
          </li>
        </ul>
      )}

        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
