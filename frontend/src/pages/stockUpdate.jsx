import { useState, useEffect, useContext } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/NavBar";
import Sidebar from "../components/SideBar";
import { AuthContext } from "../AuthContext";
import Heading from "../components/Heading";
import Table from "../components/EditableTable";
import Alert from "../components/Alert";
import { FadeLoader } from "react-spinners";
import config from "../config";
import axios, { all } from "axios";
import { jwtDecode } from "jwt-decode";

function App() {
  const { authToken } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState(null);
  const [initialData, setInitialData] = useState(false);
  const [disable, setDisable] = useState(false);

  const token = localStorage.getItem("authToken");
  const editableColumns = [{ index: 10, type: "number", step: "any" }];

  useEffect(() => {
    if (!token) {
      console.error("No token found in localStorage");
      setError("No token found");
      return;
    } else {
      fetchCompanies();
    }
  }, []);

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

  const requestData = async () => {
    try {
      const decodedToken = jwtDecode(token);
      const username = decodedToken.username;
      setLoading(true);
      const response = await axios.get(`${config.baseURL}stock-update`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          name: username,
          code: selectedCompany,
        },
      });
      console.log(response.data.stockData);
      const stockData = response.data.stockData;

      if (stockData.length > 0) {
        // Extract keys from the first object, excluding "IDX"
        const keys = Object.keys(stockData[0]).filter((key) => key !== "IDX");

        // Custom heading mapping
        const customHeadingMap = {
          COMPANY_CODE: "Company Code",
          COUNT_STATUS: "Count Status",
          TYPE: "Stock Type",
          PRODUCT_CODE: "Product Code",
          PRODUCT_NAMELONG: "Product Name",
          COSTPRICE: "Cost Price",
          UNITPRICE: "Unit Price",
          CUR_STOCK: "Current Stock",
          PHY_STOCK: "Physical Stock",
        };

        const customHeaders = keys.map((key) => customHeadingMap[key] || key);

        setHeaders(customHeaders);

        // Map the data, include "IDX" as hidden in each row
        const orderedData = stockData.map((row) => ({
          idx: row.IDX, // Store IDX for later reference
          rowData: keys.map((key) => row[key]), // Data excluding IDX
        }));

        setData(orderedData);
        setInitialData(true);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setAlert({
        message: err.response?.data?.message || "Stock data finding failed",
        type: "error",
      });

      // Dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${config.baseURL}companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.userData && response.data.userData.length > 0) {
        // Map through all userData and get all options
        const companies = response.data.userData.map((data) => ({
          code: data.COMPANY_CODE.trim(),
          name: data.COMPANY_NAME.trim(),
        }));
        setCompanies(companies);
      }
    } catch (err) {
      setError("Failed to fetch dashboard data");

      console.error("Error fetching dashboard data:", err);
    }
  };

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  // const handleRowChange = (rowIndex, columnIndex, newValue) => {
  //   const updatedData = [...data];
  //   updatedData[rowIndex][columnIndex] = newValue;
  //   setData(updatedData);

  // };

  const handleDeleteRow = async (rowIndex) => {
    const deletedRow = data[rowIndex];
    const idxValue = deletedRow.idx; // Access the IDX value of the row being deleted

    try {
      const response = await axios.delete(
        `${config.baseURL}stock-update-delete`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            idx: idxValue,
          },
        }
      );

      if (response.data.message === "Stock data deleted successfully") {
        requestData();
        setAlert({
          message: response.data.message || "Stock item deleted successfully",
          type: "success",
        });
        // Dismiss alert after 3 seconds
        setTimeout(() => setAlert(null), 3000);
      }
    } catch (err) {
      // Handle any errors that occur
      setAlert({
        message: err.response?.data?.message || "Stock data deletion failed",
        type: "error",
      });

      // Dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleSubmit = async () => {
    try {
      setDisable(true);
      const decodedToken = jwtDecode(token);
      const username = decodedToken.username;
      const response = await axios.get(`${config.baseURL}final-stock-update`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          username: username,
          company: selectedCompany,
        },
      });

      if (response.data.message === "Data moved and deleted successfully") {
        setInitialData(false);
        setDisable(false);
        setAlert({
          message: response.data.message || "Stock item deleted successfully",
          type: "success",
        });
        // Dismiss alert after 3 seconds
        setTimeout(() => setAlert(null), 3000);
      }
      setDisable(false);
    } catch (err) {
      setDisable(false);
      // Handle any errors that occur
      setAlert({
        message: err.response?.data?.message || "Stock data deletion failed",
        type: "error",
      });

      // Dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleCompanyChange = (event) => {
    const selectedCode = event.target.value;
    const selectedCompanyObj = companies.find(
      (company) => company.code === selectedCode
    );

    // Store the company code in setSelectedCompany
    setSelectedCompany(selectedCode);

    // Store the company name in setSelectedCompanyName
    if (selectedCompanyObj) {
      setSelectedCompanyName(selectedCompanyObj.name);
    }
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    let valid = true;
    if (!selectedCompany) {
      setCompanyError("Company is required.");
      valid = false;
    }
    if (selectedCompany) {
      setCompanyError("");
      valid = true;
      requestData();
    }
  };

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
          <div>
            <Heading text="Stock Update" />
          </div>
          <div className="mt-2">
            {alert && (
              <Alert
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert(null)}
              />
            )}

            <div className="p-4">
              {!initialData && (
                <div
                  className="bg-white p-5 rounded-md shadow-md mb-5 mt-10"
                  style={{ backgroundColor: "#d8d8d8" }}
                >
                  {/* Flex container for responsive layout */}
                  <div className="flex flex-col sm:flex-col lg:flex-row justify-between gap-4">
                    {/* Company Dropdown */}
                    <div className="relative flex flex-col gap-2 w-full lg:w-60">
                      <label className="block text-sm font-medium text-gray-700">
                        Select a Company
                      </label>
                      <select
                        value={selectedCompany}
                        onChange={handleCompanyChange}
                        className="w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-left overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{ minHeight: "40px" }}
                      >
                        <option value="" disabled>
                          Select a Company
                        </option>
                        {companies.map((company) => (
                          <option key={company.code} value={company.code}>
                            {company.code} {company.name}
                          </option>
                        ))}
                      </select>
                      {companyError && (
                        <p className="text-red-500 text-sm mt-1 mb-4">
                          {companyError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button - Responsive Positioning */}
                  <div className="flex justify-center lg:justify-end mt-2">
                    <button
                      onClick={handleCompanySubmit}
                      className="bg-black hover:bg-gray-800 text-white font-semibold py-2 px-5 rounded-md shadow-md transition-all"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}

              {initialData && (
                <div>
                  <div className="flex justify-start p-3">
                    <button
                      onClick={handleSubmit}
                      disabled={disable}
                      className={`bg-[#f17e21] hover:bg-[#efa05f] text-white px-4 py-2 rounded-lg w-1/4 text-center ${
                        disable ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Enter
                    </button>
                  </div>
                  <div className="flex justify-start overflow-x-auto">
                    <Table
                      headers={headers}
                      data={data.map((item) => item.rowData)}
                      editableColumns={editableColumns}
                      // onRowChange={handleRowChange}
                      onDeleteRow={handleDeleteRow}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
