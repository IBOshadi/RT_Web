import React, { useState } from "react";

const DatePicker = ({ label, onDateChange }) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleFromDateChange = (event) => {
    const selectedDate = event.target.value;
    setFromDate(selectedDate);

    // Reset `toDate` if it is earlier than the new `fromDate`
    if (toDate && new Date(selectedDate) > new Date(toDate)) {
      setToDate("");
    }

    // Notify parent about date changes
    onDateChange({ fromDate: selectedDate, toDate });
  };

  const handleToDateChange = (event) => {
    const selectedDate = event.target.value;
    setToDate(selectedDate);

    // Notify parent about date changes
    onDateChange({ fromDate, toDate: selectedDate });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Dynamic Label */}
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="flex items-center gap-4">
        {/* From Date Section */}
        <div className="flex items-center gap-2">
          <label htmlFor="from-date" className="text-gray-700">
            From:
          </label>
          <input
            type="date"
            id="from-date"
            value={fromDate}
            onChange={handleFromDateChange}
            className="border border-gray-300 p-2 rounded-md shadow-sm w-full"
          />
        </div>

        {/* To Date Section */}
        <div className="flex items-center gap-2">
          <label htmlFor="to-date" className="text-gray-700">
            To:
          </label>
          <input
            type="date"
            id="to-date"
            value={toDate}
            onChange={handleToDateChange}
            min={fromDate} // Prevent selecting dates earlier than `fromDate`
            className="border border-gray-300 p-2 rounded-md shadow-sm w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
