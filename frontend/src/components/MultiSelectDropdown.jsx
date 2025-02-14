import React, { useState, useRef, useEffect } from "react";

const MultiSelectDropdown = ({ label, options, onDropdownChange }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOptionChange = (option) => {
    const exists = selectedOptions.some((item) => item.code === option.code);
    const updatedOptions = exists
      ? selectedOptions.filter((item) => item.code !== option.code) // Remove if exists
      : [...selectedOptions, option]; // Add if not exists

    setSelectedOptions(updatedOptions);
    onDropdownChange(updatedOptions); // Notify parent about the change
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative flex flex-col gap-2" ref={dropdownRef}>
      {/* Render dynamic label */}
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="relative w-60">
        <button
          onClick={toggleDropdown}
          className="w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-left overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ minHeight: "40px" }} // Keep button height fixed
        >
          {selectedOptions.length > 0
            ? selectedOptions
                .map((opt) => `${opt.code} - ${opt.name}`)
                .join(", ")
            : "Select Options"}
        </button>

        {isDropdownOpen && (
          <div className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-md w-full mt-1">
            {options.map((option) => (
              <label
                key={option.code} // Use code as unique key
                className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.some(
                    (item) => item.code === option.code
                  )}
                  onChange={() => handleOptionChange(option)}
                  className="mr-2"
                />
                {option.code} {option.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectDropdown;
