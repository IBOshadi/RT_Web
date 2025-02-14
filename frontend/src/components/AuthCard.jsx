import React from "react";

const AuthCard = ({ children, linkText, linkHref, fullWidth }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-t from-[#ce521a] to-[#000000]">
      <div className={`bg-white shadow-lg rounded-lg p-8 ${fullWidth ? "w-full max-w-sm" : "w-3/4 md:w-2/4 lg:w-1/4"}`}>
        {/* Logo Section */}
        <div className="flex justify-center mb-4">
          
        </div>

        {/* Form Section */}
        {children}


        {/* Link Section */}
        <div className="mt-5 text-center">
          <a href={linkHref} className="text-xs text-blue-600 hover:underline">
            {linkText}
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthCard;