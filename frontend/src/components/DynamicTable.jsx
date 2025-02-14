import React from "react";

const NestedDynamicTable = ({ data, mainHeadings }) => {
  // Ensure data exists
  if (!data || data.length === 0) {
    return <p>No data available</p>;
  }

  // Format function for Amount
  const formatAmount = (value) => {
    if (!value) return "0.00"; // Handle empty or null values
    const num = parseFloat(value); // Ensure the value is a number
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-96 max-w-screen-lg mx-auto rounded-lg border border-gray-400">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        <thead className="bg-gray-100">
          {/* Main Headings */}
          <tr>
            {mainHeadings.map((main, index) => (
              <th
                key={index}
                colSpan={main.subHeadings.length}
                className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
              >
                {main.label}
              </th>
            ))}
          </tr>
          {/* Subheadings */}
          <tr>
            {mainHeadings.map((main, index) =>
              main.subHeadings.map((sub, subIndex) => (
                <th
                  key={`${index}-${subIndex}`}
                  className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
                >
                  {sub}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-100">
              {mainHeadings.map((main, index) =>
                main.subHeadings.map((sub, subIndex) => {
                  // Construct key based on main heading and subheading
                  const dataKey = `${main.label.replace(/\s+/g, '_')}_${sub}`;
                  const cellValue = row[dataKey] || "";

                  return (
                    <td
                      key={`${rowIndex}-${index}-${subIndex}`}
                      className={`px-6 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300 ${
                        ["amount", "quantity"].includes(sub.toLowerCase()) ? "text-right" : "text-center"
                      }`}
                    >
                      {/* Format Amount values; otherwise, render as-is */}
                      {sub.toLowerCase() === "amount" || sub.toLowerCase() === "quantity" ? formatAmount(cellValue) : cellValue}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NestedDynamicTable;


// 0:
// COMPANY_NAME: "SUPER MARKET 1"
// DEPARTMENT_CODE: "BA"
// DEPARTMENT_NAME: "BABY PRODUCTS"
// SUPER_MARKET_1_AMOUNT: 1
// SUPER_MARKET_1_QUANTITY: 1
// SUPER_MARKET_2_AMOUNT: ""
// SUPER_MARKET_2_QUANTITY: ""

// 1:
// COMPANY_NAME: "SUPER MARKET 2"
// DEPARTMENT_CODE: "BA"
// DEPARTMENT_NAME: "BABY PRODUCTS"
// SUPER_MARKET_1_AMOUNT: ""
// SUPER_MARKET_1_QUANTITY: ""
// SUPER_MARKET_2_AMOUNT: 2
// SUPER_MARKET_2_QUANTITY: 2
