import React from 'react';

const Alert = ({ message, type = "info", onClose }) => {
  // Determine the background color based on the alert type
  let alertStyle = "bg-blue-100 text-blue-800"; // Default style for info
  switch (type) {
    case "success":
      alertStyle = "bg-green-100 text-green-800";
      break;
    case "error":
      alertStyle = "bg-red-100 text-red-800";
      break;
    case "warning":
      alertStyle = "bg-yellow-100 text-yellow-800";
      break;
    default:
      break;
  }

  return (
    <div className={`p-4 mb-4 rounded-md shadow-md ${alertStyle} flex items-center justify-between`}>
      <span>{message}</span>
      <button 
        onClick={onClose} 
        className="ml-4 text-lg font-bold focus:outline-none"
      >
        &times; {/* Close icon */}
      </button>
    </div>
  );
};

export default Alert;
