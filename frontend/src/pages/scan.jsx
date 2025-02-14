import { useState, useEffect, useContext } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import toast, { Toaster } from "react-hot-toast";
import { Navigate } from "react-router-dom";
import Navbar from "../components/NavBar";
import Sidebar from "../components/SideBar";
import { AuthContext } from "../AuthContext";
import Heading from "../components/Heading";
import Alert from "../components/Alert";
import { CameraOff } from "lucide-react";
import { FadeLoader } from "react-spinners";
import config from "../config";
import axios, { all } from "axios";

function App() {
  const { authToken } = useContext(AuthContext);
  const [currentData, setCurrentData] = useState("No result");
  const [cameraError, setCameraError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyName, setSelectedCompanyName] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCount, setSelectedCount] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [error, setError] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [typeError, setTypeError] = useState("");
  const [countError, setCountError] = useState("");
  const [code, setCode] = useState("");
  const [initialData, setInitialData] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [alert, setAlert] = useState(null);
  const [quantityError, setQuantityError] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [salesData, setSalesData] = useState([]);

  const token = localStorage.getItem("authToken");

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

  const countOptions = ["COUNT 01", "COUNT 02", "COUNT 03"];
  const typeOptions = ["STOCK", "GRN"];

  const getCameraStream = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "environment" },
      });
      // setHasCameraPermission(true);
    } catch (error) {
      console.error("Camera Error:", error);
      setCameraError("Camera access denied or not available.");
      // setHasCameraPermission(false);
    }
  };

  useEffect(() => {
    if (!token) {
      console.error("No token found in localStorage");
      setError("No token found");
      setLoading(true);
      return;
    }
    fetchCompanies();
  }, []);

  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  const requestData = async (data) => {
    setLoading(true);
    try {
      const response = await axios.get(`${config.baseURL}scan`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          data: data,
          company: selectedCompany,
        },
      });

      setSalesData(response.data.salesData[0]);
      setAmount(response.data.amount);
      console.log("new data", salesData);
      setLoading(false);
    } catch (err) {
      setSalesData([]);
      setAmount("");
      setAlert({
        message: err.response?.data?.message || "Item finding failed",
        type: "error",
      });

      // Dismiss alert after 3 seconds
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleScan = (err, result) => {
    if (err) {
      if (err.name === "NotFoundException") {
        return; // Ignore NotFoundException to prevent screen blocking
      }
      console.warn("Scan Error:", err);
      toast.error("Scanner encountered an issue.");
    }

    if (result) {
      // Play beep sound on a successful scan
      const beep = new Audio(
        "https://www.myinstants.com/media/sounds/beep.mp3"
      );
      beep.play().catch((error) => console.error("Beep sound error:", error));

      setCurrentData(result.text);
      setCode("");
      // console.log('current data', result.text);
      // setScanHistory((prevHistory) => [...prevHistory, result.text]);
      toast.success(`Product scanned: ${result.text}`);

      requestData(result.text);
    }
  };

  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
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

  const handleCountChange = (event) => {
    setSelectedCount(event.target.value);
  };

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  let valid = true;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCodeError("");

    if (!code) {
      setCodeError("Code is required.");
      valid = false;
    }
    if (valid) {
      setCurrentData("");
      requestData(code);
    }
  };

  const handleDataSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCompany) {
      setCompanyError("Company is required.");
      valid = false;
    }
    if (selectedCompany) {
      setCompanyError("");
      valid = true;
    }
    if (!selectedCount) {
      setCountError("Count is required.");
      valid = false;
    }
    if (selectedCount) {
      setCountError("");
      valid = true;
    }
    if (!selectedType) {
      setTypeError("Type is required.");
      valid = false;
    }
    if (selectedType) {
      setTypeError("");
      valid = true;
    }
    if (selectedType && selectedCount && selectedCompany) {
      setInitialData(true);
      setHasCameraPermission(true);
      getCameraStream();
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!quantity) {
      setQuantityError("Quantity is required.");
      valid = false;
    } else {
      setQuantityError("");
      console.log(
        "quantity",
        selectedCompany,
        selectedCount,
        selectedType,
        salesData.PRODUCT_CODE,
        salesData.PRODUCT_NAMELONG,
        salesData.COSTPRICE,
        salesData.SCALEPRICE,
        amount,
        quantity
      );

      try {
        const response = await axios.post(
          `${config.baseURL}update-temp-sales-table`,
          {
            company: selectedCompany,
            count: selectedCount,
            type: selectedType,
            productCode: salesData.PRODUCT_CODE,
            productName: salesData.PRODUCT_NAMELONG,
            costPrice: salesData.COSTPRICE,
            scalePrice: salesData.SCALEPRICE,
            stock: amount,
            quantity: quantity,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.message === "Table Updated successfully") {
          setAlert({
            message: "Table Updated successfully",
            type: "success",
          });

          // Dismiss alert after 3 seconds
          setTimeout(() => setAlert(null), 1000);
        }
      } catch (err) {
        setAlert({
          message: err.response?.data?.message || "Table updating failed",
          type: "error",
        });

        // Dismiss alert after 3 seconds
        setTimeout(() => setAlert(null), 3000);
      }
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
            <Heading text="Scan" />
          </div>

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

                {/* Count Dropdown */}
                <div className="relative flex flex-col gap-2 w-full lg:w-60">
                  <label className="block text-sm font-medium text-gray-700">
                    Select a Count
                  </label>
                  <select
                    value={selectedCount}
                    onChange={handleCountChange}
                    className="w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-left overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ minHeight: "40px" }}
                  >
                    <option value="" disabled>
                      Select a Count
                    </option>
                    {countOptions.map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {countError && (
                    <p className="text-red-500 text-sm mt-1 mb-4">
                      {countError}
                    </p>
                  )}
                </div>

                {/* Type Dropdown */}
                <div className="relative flex flex-col gap-2 w-full lg:w-60">
                  <label className="block text-sm font-medium text-gray-700">
                    Select a Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={handleTypeChange}
                    className="w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-left overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ minHeight: "40px" }}
                  >
                    <option value="" disabled>
                      Select a Type
                    </option>
                    {typeOptions.map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {typeError && (
                    <p className="text-red-500 text-sm mt-1 mb-4">
                      {typeError}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button - Responsive Positioning */}
              <div className="flex justify-center lg:justify-end mt-2">
                <button
                  onClick={handleDataSubmit}
                  className="bg-black hover:bg-gray-800 text-white font-semibold py-2 px-5 rounded-md shadow-md transition-all"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {initialData && (
            <div className="mt-10">
              {alert && (
                <Alert
                  message={alert.message}
                  type={alert.type}
                  onClose={() => setAlert(null)}
                />
              )}
              <div>
                <Navbar />
                <div className="flex">
                  {/* Sidebar */}
                  <div
                    className="sidebar bg-gradient-to-t from-[#ce521a] to-[#000000] text-white shadow-md fixed top-24 left-0 z-40"
                    style={{
                      height: "calc(100vh - 96px)",
                      width: isSidebarOpen ? "15rem" : "4rem",
                      transition: "width 0.3s",
                    }}
                  >
                    <Sidebar onToggle={handleSidebarToggle} />
                  </div>

                  {/* Main Content */}
                  <div className="flex flex-col flex-grow justify-center items-center w-full ">
                    <div className="flex items-center  mb-3">
                      <form
                        onSubmit={handleSubmit}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="text"
                          id="code"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          className="px-3 py-2 w-64 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none"
                          placeholder="Enter Code"
                        />
                        <button
                          type="submit"
                          className="bg-[#f17e21] hover:bg-[#efa05f] text-white px-4 py-2 rounded-lg"
                        >
                          Search
                        </button>
                      </form>
                    </div>
                    {codeError && (
                      <p className="text-red-500 text-sm mt-1 mb-4">
                        {codeError}
                      </p>
                    )}
                    <Toaster position="top-right" reverseOrder={false} />
                    {cameraError && <div className="error">{cameraError}</div>}

                    {hasCameraPermission ? (
                      <div className="text-center">
                        <div
                          className="scan border border-gray-400 rounded-lg bg-gray-200 flex justify-center items-center"
                          style={{
                            width: "320px", // Default size
                            height: "320px",
                            maxWidth: "100vw",
                          }}
                        >
                          {scannerEnabled ? (
                            <BarcodeScannerComponent
                              width={320}
                              height={320}
                              className="w-full h-full object-cover"
                              onUpdate={handleScan}
                              delay={1000}
                              onError={(error) => {
                                console.error("Scanner Error:", error);
                                toast.error("Scanner error: Please try again.");
                              }}
                            />
                          ) : (
                            <CameraOff size={80} className="text-gray-600" /> // Icon stays centered inside fixed box
                          )}
                        </div>
                        <button
                          className="bg-[#f17e21] hover:bg-[#efa05f] text-white px-4 py-2 rounded mt-6"
                          onClick={() => setScannerEnabled(!scannerEnabled)}
                        >
                          {scannerEnabled
                            ? "Disable Scanner"
                            : "Enable Scanner"}
                        </button>
                      </div>
                    ) : (
                      <div className="error">
                        Camera access is not granted. Please check permissions.
                      </div>
                    )}

                    <div className="bg-white p-5 rounded-md shadow-md mb-5 mt-10">
                      <div className="text-lg font-semibold mb-4 text-[#f17e21]">
                        Product Details
                      </div>

                      <div className="space-y-2">
                        <div className="border-t pt-2">
                          <p className="font-medium text-[#bc4a17] mb-3">
                            Scanned Data
                          </p>
                          <p className="text-gray-700">
                            <strong>Readed code:</strong>{" "}
                            {code ? code : currentData}
                          </p>
                        </div>

                        <div className="border-t pt-2">
                          <p className="font-medium text-[#bc4a17] mb-3">
                            Company Information
                          </p>
                          <p className="text-gray-700">
                            <strong>Company Code:</strong> {selectedCompany}
                          </p>
                          <p className="text-gray-700">
                            <strong>Company Name:</strong> {selectedCompanyName}
                          </p>
                          <p className="text-gray-700">
                            <strong>Count Status:</strong> {selectedCount}
                          </p>
                          <p className="text-gray-700">
                            <strong>Type:</strong> {selectedType}
                          </p>
                        </div>

                        <div className="border-t pt-2">
                          <p className="font-medium text-[#bc4a17] mb-3">
                            Product Information
                          </p>
                          <p className="text-gray-700">
                            <strong>Product Code:</strong>{" "}
                            {salesData.PRODUCT_CODE}
                          </p>
                          <p className="text-gray-700">
                            <strong>Product Name:</strong>{" "}
                            {salesData.PRODUCT_NAMELONG}
                          </p>
                          <p className="text-gray-700">
                            <strong>Cost Price:</strong> {salesData.COSTPRICE}
                          </p>
                          <p className="text-gray-700">
                            <strong>Scale Price: </strong>{" "}
                            {salesData.SCALEPRICE}
                          </p>
                        </div>

                        <div className="border-t pt-2">
                          <p className="font-medium text-[#bc4a17] mb-3">
                            Amount
                          </p>
                          <p className="text-gray-700">
                            <strong>Stock: </strong> {amount}
                          </p>
                          <form
                            onSubmit={handleSubmit}
                            className="flex flex-col space-y-4"
                          >
                            <div className="flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                <p className="text-gray-700">
                                  <strong>Quantity: </strong>
                                </p>
                                <input
                                  type="number"
                                  id="quantity"
                                  value={quantity}
                                  onChange={(e) => setQuantity(e.target.value)}
                                  className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 focus:outline-none"
                                  placeholder="Enter quantity"
                                  step="1" // This ensures only integers are allowed
                                  min="0" // Optional: restrict to positive numbers only
                                />
                              </div>

                              {/* Display error message under the input field */}
                              {quantityError && (
                                <p className="text-red-500 text-sm mt-1">
                                  {quantityError}
                                </p>
                              )}
                            </div>

                            <div className="flex justify-center items-center">
                              <button
                                onClick={handleProductSubmit}
                                disabled={loading}
                                className={`bg-[#f17e21] hover:bg-[#efa05f] text-white px-4 py-2 rounded-lg mt-5 w-1/2 ${
                                  loading ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              >
                                Enter
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>

                    {alert && (
                      <Alert
                        message={alert.message}
                        type={alert.type}
                        onClose={() => setAlert(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
