import React, { useEffect, useState, useContext, useRef } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/SideBar";
import Heading from "../components/Heading";
import DatePicker from "../components/DatePicker";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import Alert from "../components/Alert";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import BarChart from "../components/BarChart";
import axios from "axios";
// import PieChart from "../components/PieChart";
import NestedDynamicTable from "../components/DynamicTable";
import config from "../config";
import { FadeLoader } from "react-spinners";

const Dashboard = () => {
  const { authToken } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [amountBarChartRecords, setAmountBarChartRecords] = useState([]);
  const [quantityBarChartRecords, setQuantityBarChartRecords] = useState([]);
  const [amountBarChartLabels, setAmountBarChartLabels] = useState([]);
  const [quantityBarChartLabels, setQuantityBarChartLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState({});
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [firstOption, setFirstOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const now = new Date();
  const [alert, setAlert] = useState(null);
  const [tableRecords, setTableRecords] = useState(null);
  const [tableHeadings, setTableHeadings] = useState(null);

  const token = localStorage.getItem("authToken");

  // function generateColorGradient(startColor, endColor, steps) {
  //   const start = parseInt(startColor.slice(1), 16); // Convert hex to int
  //   const end = parseInt(endColor.slice(1), 16); // Convert hex to int

  //   const startR = (start >> 16) & 0xff;
  //   const startG = (start >> 8) & 0xff;
  //   const startB = start & 0xff;

  //   const endR = (end >> 16) & 0xff;
  //   const endG = (end >> 8) & 0xff;
  //   const endB = end & 0xff;

  //   const colorArray = [];
  //   for (let i = 0; i < steps; i++) {
  //     const r = Math.round(startR + ((endR - startR) * i) / (steps - 1));
  //     const g = Math.round(startG + ((endG - startG) * i) / (steps - 1));
  //     const b = Math.round(startB + ((endB - startB) * i) / (steps - 1));

  //     colorArray.push(
  //       `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
  //     );
  //   }
  //   return colorArray;
  // }
  // const additionalColors = 10; // Total colors needed
  // const colors = generateColorGradient("#e8b8a0", "#872d00", additionalColors);

  const formatDate = (date) => {
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    const year = localDate.getFullYear();
    const month = (localDate.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based
    const day = localDate.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formattedDate = formatDate(now);

  let newFromDate;
  let newToDate;
  const displayFromDate = selectedDates.fromDate
    ? formatDate(selectedDates.fromDate)
    : null;
  const displayToDate = selectedDates.toDate
    ? formatDate(selectedDates.toDate)
    : null;

  if (displayFromDate && displayToDate && displayFromDate > displayToDate) {
    newFromDate = displayToDate;
    newToDate = displayFromDate;
  } else {
    newFromDate = displayFromDate;
    newToDate = displayToDate;
  }

  const displayDate =
    submitted && selectedDates.fromDate && selectedDates.toDate
      ? `Date: ${newFromDate} - ${newToDate}`
      : submitted && selectedDates.fromDate
      ? `Date: ${formatDate(selectedDates.fromDate)}`
      : submitted && selectedDates.toDate
      ? `Date: ${formatDate(selectedDates.toDate)}`
      : `Date: ${formattedDate}`;

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${config.baseURL}companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUserData(response.data.userData);

      if (response.data.userData && response.data.userData.length > 0) {
        // Map through all userData and get all options
        const allOptions = response.data.userData.map((data) => ({
          code: data.COMPANY_CODE.trim(),
          name: data.COMPANY_NAME.trim(),
        }));

        // Set the first option to include all options
        setFirstOption(allOptions);
        setSelectedOptions(allOptions); // Set the selected options to all options as well
      }
    } catch (err) {
      setError("Failed to fetch dashboard data");

      console.error("Error fetching dashboard data:", err);
    }
  };

  const fetchData = async () => {
    if (firstOption) {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      try {
        const response = await axios.get(`${config.baseURL}department-data`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            currentDate: formattedDate,
            fromDate: newFromDate,
            toDate: newToDate,
            selectedOptions: selectedOptions.map((option) => option.code),
          },
        });

        const amountBarChartData = response.data.amountBarChart;
        const quantityBarChartData = response.data.quantityBarChart;
        const tableData = response.data.tableRecords;

        const amountLabels = amountBarChartData.map((item) => item.DEPTNAME);
        setAmountBarChartLabels(amountLabels);

        const amountData = amountBarChartData.map((item) => item.AMOUNT);
        setAmountBarChartRecords(amountData);

        const quantityLabels = quantityBarChartData.map(
          (item) => item.DEPTNAME
        );
        setQuantityBarChartLabels(quantityLabels);

        const quantityData = quantityBarChartData.map((item) => item.QUANTITY);
        setQuantityBarChartRecords(quantityData);

        const updatedTableData = tableData.map((item) => {
          const matchingOption = firstOption.find(
            (option) => option.code === item.COMPANY_CODE
          );
          const companyName = matchingOption ? matchingOption.name : "UNKNOWN"; // Company name or 'UNKNOWN'

          return {
            DEPARTMENT_NAME: item.DEPARTMENT_NAME,
            DEPARTMENT_CODE: item.DEPARTMENT_CODE,
            COMPANY_NAME: companyName, // Company name
            [`${companyName}_QUANTITY`]: item.QUANTITY, // Dynamic key with company name
            [`${companyName}_AMOUNT`]: item.AMOUNT, // Dynamic key with company name
          };
        });

        const namesArray = firstOption.map((option) => option.name);
        const filteredNames = namesArray.filter((name) =>
          updatedTableData.some((record) => record.COMPANY_NAME === name)
        );
        const mainHeadings = [
          { label: "DEPARTMENT", subHeadings: ["CODE", "NAME"] },
          ...filteredNames.map((name) => ({
            // Replace spaces with underscores
            label: name.replace(/\s+/g, "_"),
            subHeadings: ["AMOUNT", "QUANTITY"],
          })),
        ];

        setTableHeadings(mainHeadings);

        const transformedData = updatedTableData.map((row) => {
          const newRow = {};
          for (let key in row) {
            // Replace spaces with underscores in the keys
            const normalizedKey = key.replace(/\s+/g, "_");
            newRow[normalizedKey] = row[key];
          }
          filteredNames.forEach((name) => {
            const formattedName = name.replace(/\s+/g, "_");

            if (!newRow.hasOwnProperty(`${formattedName}_AMOUNT`)) {
              newRow[`${formattedName}_AMOUNT`] = "";
            }
            if (!newRow.hasOwnProperty(`${formattedName}_QUANTITY`)) {
              newRow[`${formattedName}_QUANTITY`] = "";
            }
          });
          return newRow;
        });

        function aggregateData(data) {
          const aggregatedData = {};

          data.forEach((record) => {
            const { DEPARTMENT_NAME, DEPARTMENT_CODE, ...rest } = record;

            if (!aggregatedData[DEPARTMENT_NAME]) {
              aggregatedData[DEPARTMENT_NAME] = {
                DEPARTMENT_NAME,
                DEPARTMENT_CODE,
              };
            }

            Object.keys(rest).forEach((key) => {
              const value = rest[key];
              if (!aggregatedData[DEPARTMENT_NAME][key] && value !== "") {
                aggregatedData[DEPARTMENT_NAME][key] = parseFloat(value); // Convert to number
              } else if (value !== "") {
                aggregatedData[DEPARTMENT_NAME][key] += parseFloat(value);
              }
            });
          });

          return Object.values(aggregatedData);
        }

        // Aggregating the sample data
        const aggregatedResults = aggregateData(transformedData);

        setTableRecords(aggregatedResults);
        setLoading(false);
      } catch (err) {
        console.error("Error sending parameters:", err);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      console.error("No token found in localStorage");
      setError("No token found");

      return;
    }
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchData();
    if (isChecked) {
      // Log the message every 3 seconds when the checkbox is checked
      const intervalId = setInterval(() => {
        window.location.reload();
      }, 180000);

      // Cleanup the interval when the checkbox is unchecked or the component unmounts
      return () => clearInterval(intervalId);
    } else {
      console.log("Checkbox is unchecked.");
    }
  }, [firstOption, isChecked]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-100 z-50">
        <FadeLoader
          cssOverride={null}
          height={50}
          loading
          margin={30}
          radius={30}
          speedMultiplier={1}
          width={8}
          color="#ce521a"
        />
      </div>
    );
  }

  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  const handleDateChange = (dates) => {
    setSelectedDates(dates);
  };

  const handleDropdownChange = (options) => {
    setSelectedOptions(options);
  };

  const handleCheckboxChange = () => {
    setIsChecked((prevState) => !prevState); // Toggle the checkbox state
  };

  const handleSubmit = async () => {
    // if (selectedRowData) {
    //   setSelectedRowData(null);
    // }
    // if (selectedRowLabels) {
    //   setSelectedRowLabels(null);
    // }

    if (newToDate === null && newFromDate === null) {
      setAlert({
        message: "Please select the from date and to date",
        type: "error",
      });
      setTimeout(() => setAlert(null), 3000);
    } else if (newFromDate === null) {
      setAlert({ message: "Please select the from date", type: "error" });
      setTimeout(() => setAlert(null), 3000);
    } else if (newToDate === null) {
      setAlert({ message: "Please select the to date", type: "error" });
      setTimeout(() => setAlert(null), 3000);
    }

    if (newFromDate !== null && newToDate !== null) {
      setSubmitted(true);
      fetchData();
    }
  };

  const handleRefresh = async () => {
    window.location.reload();
  };

  // const renderAmountPieChart = (amountValues, amountLabels, colors) => {
  //   if (amountValues && amountValues.length > 0) {
  //     return (
  //       <div className="w-1/2 md:w-3/4 lg:w-100 mx-auto">
  //         <PieChart
  //           data={amountValues}
  //           labels={amountLabels}
  //           colors={colors}
  //           title="Amount"
  //           position="bottom"
  //           align="start"
  //         />
  //       </div>
  //     );
  //   } else {
  //     return <p>No data available</p>;
  //   }
  // };

  // const renderQuantityPieChart = (
  //   quantityValues,
  //   quantityLabels,
  //   colors,
  //   position
  // ) => {
  //   if (quantityValues && quantityValues.length > 0) {
  //     return (
  //       <div className="w-1/2 md:w-3/4 lg:w-100 mx-auto">
  //         <PieChart
  //           data={quantityValues}
  //           labels={quantityLabels}
  //           colors={colors}
  //           title="Quantity"
  //           position="bottom"
  //           align="start"
  //         />
  //       </div>
  //     );
  //   } else {
  //     return <p>No data available</p>;
  //   }
  // };

  const companyOptions = userData
    ? userData.map((item) => ({
        code: item.COMPANY_CODE.trim(),
        name: item.COMPANY_NAME.trim(),
      }))
    : [];

  return (
    <div>
      <Navbar />

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar */}
        <div
          className="sidebar bg-gradient-to-t from-[#ce521a] to-[#000000] text-white shadow-md fixed top-24 left-0 z-40"
          style={{
            height: "calc(100vh - 96px)", // Sidebar height fills remaining screen below Navbar
            width: isSidebarOpen ? "15rem" : "4rem", // Adjust width based on state
            transition: "width 0.3s",
          }}
        >
          <Sidebar onToggle={handleSidebarToggle} />
        </div>

        {/* Page Content */}
        <div
          className={`transition-all duration-300 flex-1 p-10`}
          style={{
            marginLeft: isSidebarOpen ? "15rem" : "4rem", // Space for sidebar
            marginTop: "96px", // Space for Navbar
          }}
        >
          <div className="mt-10">
            <Heading text="Department Sales Dashboard" />
          </div>
          <div className="mt-10">
            {alert && (
              <Alert
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert(null)}
              />
            )}
            <div
              className="bg-white p-5 rounded-md shadow-md mb-5"
              style={{ backgroundColor: "#d8d8d8" }}
            >
              {isChecked ? (
                <div className="flex items-center w-full">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={handleCheckboxChange}
                      id="checkbox"
                    />
                    <label htmlFor="checkbox" className="ml-3">
                      <strong>Current Department Sales</strong>
                    </label>
                  </div>

                  <div className="flex font-bold mb-3 text-2xl flex-grow justify-center">
                    Current Department Sales
                  </div>

                  <div>
                  <button
                      onClick={handleRefresh}
                      className="bg-black text-white px-4 py-2 rounded-md shadow-md hover:bg-gray-800"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                  <DatePicker
                    label="Select Date Range:"
                    onDateChange={handleDateChange}
                  />
                  <MultiSelectDropdown
                    label="Select Company:"
                    options={companyOptions}
                    onDropdownChange={handleDropdownChange}
                    selected={selectedOptions}
                  />
                  <div className="space-x-4 ml-12 md:ml-0 md:mt-0 mt-4">
                    <button
                      onClick={handleSubmit}
                      className="bg-black text-white px-4 py-2 rounded-md shadow-md hover:bg-gray-800"
                    >
                      Submit
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="bg-black text-white px-4 py-2 rounded-md shadow-md hover:bg-gray-800"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!isChecked && (
              <div
                className="bg-white p-5 rounded-md shadow-md mt-5 mb-5"
                style={{ backgroundColor: "#d8d8d8" }}
              >
                <div className="flex justify-start font-bold mb-3">
                  <p>{displayDate}</p>
                </div>

                <div className="flex justify-center text-2xl font-bold text-black">
                  {/* {displayCompany()} */} Department Sales Summary
                </div>
              </div>
            )}

            {(submitted || isChecked) && (
              <div
                className="flex flex-col lg:flex-row bg-white p-5 rounded-md shadow-md w-full"
                style={{ backgroundColor: "#d8d8d8" }}
              >
                <div className="flex flex-col w-full space-y-5 ">
                  <div className="flex-1 bg-white p-5 rounded-md shadow-md">
                    {/* {renderTable(tableLabels, tableData, handleRowClick)} */}
                    <NestedDynamicTable
                      data={tableRecords}
                      mainHeadings={tableHeadings}
                    />
                  </div>

                  <div className="flex flex-col lg:flex-row w-full space-y-4 lg:space-y-0 lg:space-x-3 text-center bg-white p-5 rounded-md shadow-md justify-center items-center">
                    <BarChart
                      data={amountBarChartRecords}
                      labels={amountBarChartLabels}
                      colors="#ce521a"
                      title="Amount"
                    />
                  </div>

                  <div className="flex flex-col lg:flex-row w-full space-y-4 lg:space-y-0 lg:space-x-3 text-center bg-white p-5 rounded-md shadow-md justify-center items-center">
                    <BarChart
                      data={quantityBarChartRecords}
                      labels={quantityBarChartLabels}
                      colors="#000000"
                      title="Quantity"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
