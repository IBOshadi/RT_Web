import React, { useContext } from "react"; // Import useContext
import { Navigate } from "react-router-dom"; // Import Navigate
import  {AuthContext} from "./AuthContext.jsx"; // Import AuthContext

const ProtectedRoute = ({ children }) => {
  const { authToken } = useContext(AuthContext); // Access authToken from AuthContext
  return authToken ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

