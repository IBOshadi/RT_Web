const mssql = require("mssql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { sendPasswordResetEmail } = require("../utils/nodemailer");

const JWT_SECRET = process.env.JWT_SECRET;
let IP;
let PORT;

const dbConfig = {
  user: process.env.DB_USER, // Database username
  password: process.env.DB_PASSWORD, // Database password
  server: process.env.DB_SERVER, // Database server address
  database: process.env.DB_DATABASE1, // Database name
  options: {
    encrypt: false, // Disable encryption
    trustServerCertificate: true, // Trust server certificate (useful for local databases)
  },
  port: 1443, // Default MSSQL port (1433)
};

function formatDate(dateString) {
  // Convert the input string to a Date object
  const dateObject = new Date(dateString);

  // Extract day, month, and year
  const day = String(dateObject.getDate()).padStart(2, "0"); // Ensures two digits
  const month = String(dateObject.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed, so add 1
  const year = dateObject.getFullYear();

  // Return the formatted date as 'DD/MM/YYYY'
  return `${day}/${month}/${year}`;
}

// Login function
exports.login = async (req, res) => {
  try {
    // Close any existing connection before starting a new one
    await mssql.close();
    await mssql.connect(dbConfig);

    // Get username, password, and IP from request
    const { username, password, ip } = req.body;
    const date = require("moment")().format("YYYY-MM-DD HH:mm:ss"); // Format timestamp

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Check if user exists
    const userCheckRequest = new mssql.Request();
    userCheckRequest.input("username", mssql.VarChar, username);

    const loginResult = await userCheckRequest.query(
      "USE [RTPOS_MAIN] SELECT * FROM tb_USERS WHERE username = @username"
    );

    if (loginResult.recordset.length === 0) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const user = loginResult.recordset[0];
    PORT = user.port;
    IP = user.ip_address;

    if (!PORT || !IP) {
      return res.status(400).json({
        message:
          "Connection hasn't been established yet! Please contact the system support team.",
      });
    }

    //Insert user log (if it fails, continue login process)
    try {
      const insertQuery = `
        USE [RTPOS_MAIN]
        INSERT INTO tb_LOG (username, ip, datetime)
        VALUES (@username, @ip, @datetime)
      `;

      const insertRequest = new mssql.Request();
      insertRequest.input("username", mssql.VarChar, username);
      insertRequest.input("ip", mssql.VarChar, ip);
      insertRequest.input("datetime", mssql.VarChar, date);

      await insertRequest.query(insertQuery);
      console.log("User log successfully added");
    } catch (err) {
      console.error("Error during user log adding:", err);
      // Log error but don't stop login process
    }

    //Prepare for dynamic database connection
    PORT = PORT.trim();
    IP = IP.trim();
    PORT = parseInt(PORT);

    // Close previous connection before connecting to dynamic database
    await mssql.close();

    const dynamicDbConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: IP,
      database: process.env.DB_DATABASE2,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      port: PORT,
    };

    //Connect to dynamic database
    await mssql.connect(dynamicDbConfig);
    console.log("Successfully connected to the dynamic database");

    //Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await mssql.close();
      return res.status(400).json({ message: "Invalid password" });
    }

    //Generate JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        dashboard: user.dashboard,
        email: user.email,
        admin: user.admin,
      },
      process.env.JWT_SECRET, // Use environment variable
      { expiresIn: "1h" }
    );

    //Close database connection & send response
    return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error:", error);

    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to log in" });
    }
  }
};

// Register function
exports.register = async (req, res) => {
  await mssql.close();
  await mssql.connect(dbConfig);

  const { username, email, password } = req.body;
  console.log("request body", req.body);
  try {
    const userCheckQuery = `
    USE [RTPOS_MAIN]
      SELECT * FROM tb_USERS WHERE username = @username OR email = @email
    `;
    const userCheckRequest = new mssql.Request();
    userCheckRequest.input("username", mssql.VarChar, username);
    userCheckRequest.input("Email", mssql.VarChar, email);

    const userResult = await userCheckRequest.query(userCheckQuery);
    if (userResult.recordset.length > 0) {
      const existingUser = userResult.recordset[0];
      if (existingUser.username === username) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `
    USE [RTPOS_MAIN]
      INSERT INTO tb_USERS (username, email, password)
      VALUES (@username, @Email, @Password)
    `;
    const insertRequest = new mssql.Request();
    insertRequest.input("username", mssql.VarChar, username);
    insertRequest.input("Email", mssql.VarChar, email);
    insertRequest.input("Password", mssql.VarChar, hashedPassword);

    await insertRequest.query(insertQuery);

    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    console.error("Error during registration:", err);
    res
      .status(500)
      .json({ message: "Failed to register. Try different username" });
  }
};

// Forgot password function
exports.forgotPassword = async (req, res) => {
  const { username } = req.body;
  if (!username)
    return res.status(400).json({ message: "Username is required" });

  try {
    await mssql.close();
    await mssql.connect(dbConfig);
    const passwordResult =
      await mssql.query`USE [RTPOS_MAIN] SELECT * FROM tb_USERS WHERE username = ${username}`;
    if (passwordResult.recordset.length === 0)
      return res
        .status(400)
        .json({ message: "No user found with this username" });

    const user = passwordResult.recordset[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    await mssql.query`
    USE [RTPOS_MAIN]
      UPDATE tb_USERS SET resetToken = ${resetToken}, resetTokenExpiry = ${resetTokenExpiry} WHERE username = ${username}
    `;

    await sendPasswordResetEmail(user.email, resetToken);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send password reset email" });
  }
};

// Reset password function
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token and new password are required" });
  }

  try {
    const resetPasswordResult = await mssql.query`
    USE [RTPOS_MAIN]
      SELECT * FROM tb_USERS WHERE resetToken = ${token}
    `;

    if (resetPasswordResult.recordset.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = resetPasswordResult.recordset[0];

    if (Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await mssql.query`
    USE [RTPOS_MAIN]
      UPDATE tb_USERS
      SET password = ${hashedPassword}, resetToken = NULL, resetTokenExpiry = NULL
      WHERE resetToken = ${token}
    `;
    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

// Get dashboard data function
exports.dashboardOptions = async (req, res) => {
  try {
    const dashboardOptionsResult = await mssql.query`
    USE [RT_WEB]
      SELECT COMPANY_CODE, COMPANY_NAME FROM tb_COMPANY;
    `;

    if (dashboardOptionsResult.recordset.length === 0) {
      console.log("no companies found");
      return res.status(404).json({ message: "User not found" });
    }
    // Trim any trailing spaces from COMPANY_CODE
    const userData = dashboardOptionsResult.recordset.map((row) => ({
      COMPANY_CODE: row.COMPANY_CODE.trim(), // Remove the trailing spaces
      COMPANY_NAME: row.COMPANY_NAME.trim(),
    }));

    res.status(200).json({
      message: "Dashboard data retrieved successfully",
      userData,
    });
  } catch (error) {
    console.error("Error retrieving dashboard data:", error);
    res.status(500).json({ message: "Failed to retrieve dashboard data" });
  }
};

//company dashboard
exports.loadingDashboard = async (req, res) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(403)
        .json({ message: "No authorization token provided" });
    }
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "Token is missing" });
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      const username = decoded.username; // Assuming 'username' is part of the token payload

      const { currentDate, fromDate, toDate, selectedOptions } = req.query;

      let loadingDashboardResult;
      let record;
      let cashierPointRecord;
      let spResult;
      let reportType = "SALESSUM1";

      try {
        const deleteResult = await mssql.query`USE [RT_WEB]
         DELETE FROM tb_SALES_DASHBOARD_VIEW WHERE REPUSER = ${username}`;
        console.log("delete query executed");
      } catch (error) {
        console.error("Error executing the delete query:", error);
      }

      const formattedCurrentDate = formatDate(currentDate);
      const formattedFromDate = formatDate(fromDate);
      const formattedToDate = formatDate(toDate);

      if (!toDate && !fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string
            spResult =
              await mssql.query`EXEC Sp_SalesCurView @COMPANY_CODE = ${companyCodeString},
               @DATE = ${formattedCurrentDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;

            // Check if spResult has data (depending on what your SP returns)
            // if (spResult.recordset && spResult.recordset.length > 0) {
            //   console.log(
            //     `Result for COMPANY_CODE: ${companyCodeString} `
            //   );
            // } else {
            //   console.log(
            //     `No data returned for COMPANY_CODE: ${companyCodeString}`
            //   );
            // }
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      } else if (toDate && fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string

            spResult =
              await mssql.query`EXEC Sp_SalesView @COMPANY_CODE = ${companyCodeString}, @DATE1 = ${formattedFromDate}, 
              @DATE2 = ${formattedToDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;

            // Check if spResult has data (depending on what your SP returns)
            // if (spResult.recordset && spResult.recordset.length > 0) {
            //   console.log(
            //     `Result for COMPANY_CODE: ${companyCodeString} -`
            //   );
            // } else {
            //   console.log(
            //     `No data returned for COMPANY_CODE: ${companyCodeString}`
            //   );
            // }
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      }

      //one row
      loadingDashboardResult = await mssql.query`
USE [RT_WEB]
          SELECT 
          SUM(NETSALES) AS NETSALES,
          SUM(CASHSALES) AS CASHSALES,
          SUM(CARDSALES) AS CARDSALES,
          SUM(CREDITSALES) AS CREDITSALES,
          SUM(OTHER_PAYMENT) AS OTHER_PAYMENT
          FROM 
          tb_SALES_DASHBOARD_VIEW
          WHERE 
          REPUSER = ${username}
          AND COMPANY_CODE IN (${selectedOptions})`;

      //return rows of data
      record = await mssql.query`
USE [RT_WEB]
      SELECT 
      COMPANY_CODE,      
      SUM(NETSALES) AS NETSALES, 
      SUM(CASHSALES) AS CASHSALES, 
      SUM(CARDSALES) AS CARDSALES, 
      SUM(CREDITSALES) AS CREDITSALES, 
      SUM(OTHER_PAYMENT) AS OTHER_PAYMENT
  FROM 
      tb_SALES_DASHBOARD_VIEW
  WHERE 
      REPUSER = ${username}
      AND COMPANY_CODE IN (${selectedOptions})
  GROUP BY 
      COMPANY_CODE`;

      cashierPointRecord = await mssql.query`
      USE [RT_WEB]
          SELECT 
            COMPANY_CODE, 
            UNITNO, 
            SUM(NETSALES) AS NETSALES, 
            SUM(CASHSALES) AS CASHSALES, 
            SUM(CARDSALES) AS CARDSALES, 
            SUM(CREDITSALES) AS CREDITSALES, 
            SUM(OTHER_PAYMENT) AS OTHER_PAYMENT
          FROM tb_SALES_DASHBOARD_VIEW
          WHERE REPUSER = ${username}
          AND COMPANY_CODE IN (${selectedOptions})
          GROUP BY COMPANY_CODE, UNITNO`;
      // Format the result to ensure two decimal places
      const formattedResult = loadingDashboardResult.recordset.map((row) => ({
        ...row,
        NETSALES: parseFloat(row.NETSALES).toFixed(2),
        CASHSALES: parseFloat(row.CASHSALES).toFixed(2),
        CARDSALES: parseFloat(row.CARDSALES).toFixed(2),
        CREDITSALES: parseFloat(row.CREDITSALES).toFixed(2),
        OTHER_PAYMENT: parseFloat(row.OTHER_PAYMENT).toFixed(2),
      }));

      // Respond with the result
      res.status(200).json({
        message: "Processed parameters for company codes",
        success: true,
        result: formattedResult, // Assuming you want to return the result from the query
        record: record ? record.recordset : [], // Include additional records if available
        cashierPointRecord: cashierPointRecord
          ? cashierPointRecord.recordset
          : [], // Include additional records if available
      });
    });
  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to process parameters" });
  }
};

//department dashboard
exports.departmentDashboard = async (req, res) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(403)
        .json({ message: "No authorization token provided" });
    }
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "Token is missing" });
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      const username = decoded.username; // Assuming 'username' is part of the token payload

      const { currentDate, fromDate, toDate, selectedOptions } = req.query;

      let tableRecords;
      let amountBarChart;
      let quantityBarChart;
      // let amountChart;
      // let quantityChart;
      let spResult;
      let reportType = "SALESDET";

      const formattedCurrentDate = formatDate(currentDate);
      const formattedFromDate = formatDate(fromDate);
      const formattedToDate = formatDate(toDate);

      try {
        const deleteResult = await mssql.query`USE [RT_WEB] 
        DELETE FROM tb_SALESVIEW WHERE REPUSER = ${username}`;
        console.log("delete query executed");
      } catch (error) {
        console.error("Error executing the delete query", error);
      }

      if (!toDate && !fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string
            spResult =
              await mssql.query`EXEC Sp_SalesCurView @COMPANY_CODE = ${companyCodeString}, @DATE = ${formattedCurrentDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      } else if (toDate && fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string

            spResult =
              await mssql.query`EXEC Sp_SalesView @COMPANY_CODE = ${companyCodeString}, @DATE1 = ${formattedFromDate}, @DATE2 = ${formattedToDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      }

      tableRecords = await mssql.query`
          USE [RT_WEB]
                SELECT   
         LTRIM(RTRIM(COMPANY_CODE)) AS COMPANY_CODE,
         LTRIM(RTRIM(DEPTCODE)) AS DEPARTMENT_CODE,
         DEPTNAME AS DEPARTMENT_NAME,
                SUM(QTY) AS QUANTITY,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY COMPANY_CODE,DEPTCODE,DEPTNAME`;

      amountBarChart = await mssql.query`
          USE [RT_WEB]
            SELECT   
          DEPTNAME,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY DEPTNAME`;

      quantityBarChart = await mssql.query`
          USE [RT_WEB]
            SELECT   
          DEPTNAME,
                SUM(QTY) AS QUANTITY             
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY DEPTNAME`;
      //       amountChart = await mssql.query`
      //                 USE [RT_WEB];
      // SELECT
      // 		DEPTNAME,
      //           SUM(Amount) AS AMOUNT
      //           FROM
      //           tb_SALESVIEW
      //           WHERE
      //           REPUSER = ${username}
      //           AND COMPANY_CODE IN (${selectedOptions})
      //           GROUP BY DEPTNAME`;

      //       quantityChart = await mssql.query`
      //                 USE [RT_WEB];
      // SELECT
      // 		DEPTNAME,
      //           SUM(QTY) AS QTY
      //           FROM
      //           tb_SALESVIEW
      //           WHERE
      //           REPUSER = ${username}
      //           AND COMPANY_CODE IN (${selectedOptions})
      //           GROUP BY DEPTNAME`;

      console.log("result1", tableRecords.recordset);
      console.log("result3", amountBarChart.recordset);
      console.log("result4", quantityBarChart.recordset);

      res.status(200).json({
        message: "Processed parameters for company codes",
        success: true,
        tableRecords: tableRecords ? tableRecords.recordset : [],
        amountBarChart: amountBarChart ? amountBarChart.recordset : [],
        quantityBarChart: quantityBarChart ? quantityBarChart.recordset : [],
        // amountChart: amountChart ? amountChart.recordset : [],
        // quantityChart: quantityChart ? quantityChart.recordset : [],
      });
    });
  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to process parameters" });
  }
};

//category dashboard
exports.categoryDashboard = async (req, res) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(403)
        .json({ message: "No authorization token provided" });
    }
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "Token is missing" });
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      const username = decoded.username; // Assuming 'username' is part of the token payload

      const { currentDate, fromDate, toDate, selectedOptions } = req.query;

      let categoryTableRecords;
      let categoryAmountBarChart;
      let categoryQuantityBarChart;
      let spResult;
      let reportType = "SALESDET";

      const formattedCurrentDate = formatDate(currentDate);
      const formattedFromDate = formatDate(fromDate);
      const formattedToDate = formatDate(toDate);

      try {
        const deleteResult = await mssql.query`USE [RT_WEB] 
        DELETE FROM tb_SALESVIEW WHERE REPUSER = ${username}`;
        console.log("delete query executed");
      } catch (error) {
        console.error("Error executing the delete query", error);
      }

      if (!toDate && !fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string
            spResult =
              await mssql.query`EXEC Sp_SalesCurView @COMPANY_CODE = ${companyCodeString}, @DATE = ${formattedCurrentDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      } else if (toDate && fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string

            spResult =
              await mssql.query`EXEC Sp_SalesView @COMPANY_CODE = ${companyCodeString}, @DATE1 = ${formattedFromDate}, @DATE2 = ${formattedToDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      }

      categoryTableRecords = await mssql.query`
          USE [RT_WEB]
                SELECT   
         LTRIM(RTRIM(COMPANY_CODE)) AS COMPANY_CODE,
         LTRIM(RTRIM(CATCODE)) AS CATEGORY_CODE,
         CATNAME AS CATEGORY_NAME,
                SUM(QTY) AS QUANTITY,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY COMPANY_CODE,CATCODE,CATNAME`;

      categoryAmountBarChart = await mssql.query`
          USE [RT_WEB]
            SELECT   
          CATNAME,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY CATNAME`;

      categoryQuantityBarChart = await mssql.query`
                USE [RT_WEB]
                  SELECT   
                CATNAME,
                      SUM(QTY) AS QUANTITY
                      FROM 
                      tb_SALESVIEW
                      WHERE 
                      REPUSER = ${username}
                      AND COMPANY_CODE IN (${selectedOptions})
                      GROUP BY CATNAME`;

      console.log("result1", categoryTableRecords.recordset);
      // console.log("result2", categoryBarChart.recordset);

      res.status(200).json({
        message: "Processed parameters for company codes",
        success: true,
        categoryTableRecords: categoryTableRecords
          ? categoryTableRecords.recordset
          : [],
        categoryAmountBarChart: categoryAmountBarChart
          ? categoryAmountBarChart.recordset
          : [],
        categoryQuantityBarChart: categoryQuantityBarChart
          ? categoryQuantityBarChart.recordset
          : [],
      });
    });
  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to process parameters" });
  }
};

//sub category dashboard
exports.subCategoryDashboard = async (req, res) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(403)
        .json({ message: "No authorization token provided" });
    }
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "Token is missing" });
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      const username = decoded.username; // Assuming 'username' is part of the token payload

      const { currentDate, fromDate, toDate, selectedOptions } = req.query;

      let subCategoryTableRecords;
      let subCategoryAmountBarChart;
      let subCategoryQuantityBarChart;
      let spResult;
      let reportType = "SALESDET";

      const formattedCurrentDate = formatDate(currentDate);
      const formattedFromDate = formatDate(fromDate);
      const formattedToDate = formatDate(toDate);

      try {
        const deleteResult = await mssql.query`USE [RT_WEB] 
        DELETE FROM tb_SALESVIEW WHERE REPUSER = ${username}`;
        console.log("delete query executed");
      } catch (error) {
        console.error("Error executing the delete query", error);
      }

      if (!toDate && !fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string
            spResult =
              await mssql.query`EXEC Sp_SalesCurView @COMPANY_CODE = ${companyCodeString}, @DATE = ${formattedCurrentDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      } else if (toDate && fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string

            spResult =
              await mssql.query`EXEC Sp_SalesView @COMPANY_CODE = ${companyCodeString}, @DATE1 = ${formattedFromDate}, @DATE2 = ${formattedToDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      }

      subCategoryTableRecords = await mssql.query`
          USE [RT_WEB]
                SELECT   
         LTRIM(RTRIM(COMPANY_CODE)) AS COMPANY_CODE,
         LTRIM(RTRIM(SCATCODE)) AS SUBCATEGORY_CODE,
         SCATNAME AS SUBCATEGORY_NAME,
                SUM(QTY) AS QUANTITY,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY COMPANY_CODE,SCATCODE,SCATNAME`;

      subCategoryAmountBarChart = await mssql.query`
          USE [RT_WEB]
            SELECT   
          SCATNAME,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY SCATNAME`;

      subCategoryQuantityBarChart = await mssql.query`
                USE [RT_WEB]
                  SELECT   
                SCATNAME,
                      SUM(QTY) AS QUANTITY
                      FROM 
                      tb_SALESVIEW
                      WHERE 
                      REPUSER = ${username}
                      AND COMPANY_CODE IN (${selectedOptions})
                      GROUP BY SCATNAME`;

      console.log("result1", subCategoryTableRecords.recordset);
      console.log("result2", subCategoryAmountBarChart.recordset);

      res.status(200).json({
        message: "Processed parameters for company codes",
        success: true,
        subCategoryTableRecords: subCategoryTableRecords
          ? subCategoryTableRecords.recordset
          : [],
        subCategoryAmountBarChart: subCategoryAmountBarChart
          ? subCategoryAmountBarChart.recordset
          : [],
        subCategoryQuantityBarChart: subCategoryQuantityBarChart
          ? subCategoryQuantityBarChart.recordset
          : [],
      });
    });
  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to process parameters" });
  }
};

//vendor dashboard
exports.vendorDashboard = async (req, res) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(403)
        .json({ message: "No authorization token provided" });
    }
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "Token is missing" });
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      const username = decoded.username; // Assuming 'username' is part of the token payload

      const { currentDate, fromDate, toDate, selectedOptions } = req.query;

      let vendorTableRecords;
      let vendorAmountBarChart;
      let vendorQuantityBarChart;
      let spResult;
      let reportType = "SALESDET";

      const formattedCurrentDate = formatDate(currentDate);
      const formattedFromDate = formatDate(fromDate);
      const formattedToDate = formatDate(toDate);

      try {
        const deleteResult = await mssql.query`USE [RT_WEB] 
        DELETE FROM tb_SALESVIEW WHERE REPUSER = ${username}`;
        console.log("delete query executed");
      } catch (error) {
        console.error("Error executing the delete query", error);
      }

      if (!toDate && !fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string
            spResult =
              await mssql.query`EXEC Sp_SalesCurView @COMPANY_CODE = ${companyCodeString}, @DATE = ${formattedCurrentDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      } else if (toDate && fromDate) {
        try {
          for (let i = 0; i < selectedOptions.length; i++) {
            const companyCodeString = String(selectedOptions[i]); // Convert to string

            spResult =
              await mssql.query`EXEC Sp_SalesView @COMPANY_CODE = ${companyCodeString}, @DATE1 = ${formattedFromDate}, @DATE2 = ${formattedToDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;
          }
        } catch (error) {
          console.error("Error executing stored procedure:", error);
        }
      }

      vendorTableRecords = await mssql.query`
          USE [RT_WEB]
                SELECT   
         LTRIM(RTRIM(COMPANY_CODE)) AS COMPANY_CODE,
         LTRIM(RTRIM(VENDORCODE)) AS VENDOR_CODE,
         VENDORNAME AS VENDOR_NAME,
                SUM(QTY) AS QUANTITY,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY COMPANY_CODE,VENDORCODE,VENDORNAME`;

      vendorAmountBarChart = await mssql.query`
          USE [RT_WEB]
            SELECT   
          VENDORNAME,
                SUM(AMOUNT) AS AMOUNT
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY VENDORNAME`;

      vendorQuantityBarChart = await mssql.query`
          USE [RT_WEB]
            SELECT   
          VENDORNAME,
                SUM(QTY) AS QUANTITY
                FROM 
                tb_SALESVIEW
                WHERE 
                REPUSER = ${username}
                AND COMPANY_CODE IN (${selectedOptions})
                GROUP BY VENDORNAME`;

      res.status(200).json({
        message: "Processed parameters for company codes",
        success: true,
        vendorTableRecords: vendorTableRecords
          ? vendorTableRecords.recordset
          : [],
        vendorAmountBarChart: vendorAmountBarChart
          ? vendorAmountBarChart.recordset
          : [],
        vendorQuantityBarChart: vendorQuantityBarChart
          ? vendorQuantityBarChart.recordset
          : [],
      });
    });
  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to process parameters" });
  }
};

// Reset database connection
exports.resetDatabaseConnection = async (req, res) => {
  const { name, ip, port, username } = req.body;
  const newPort = port.trim();
  const newName = name.trim();
  const newIP = ip.trim();
  console.log("request body", newName, newPort, newIP);

  try {
    // Check for authorization token in the header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(403)
        .json({ message: "No authorization token provided" });
    }

    // Extract the token from the authorization header
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(403).json({ message: "Token is missing" });
    }

    // Verify the token asynchronously and wait for the result
    try {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Validate the incoming data
    if (ip === "" && port === "") {
      return res.status(400).json({ message: "Please enter data to update" });
    }

    // Prepare SQL query based on the given data
    let databaseConnectionResult;

    await mssql.close();
    const dynamicDbConfigRP = {
      user: process.env.DB_USER, // Database username
      password: process.env.DB_PASSWORD, // Database password
      server: process.env.DB_SERVER, // Dynamically set IP address
      database: process.env.DB_DATABASE1,
      options: {
        encrypt: false, // Disable encryption
        trustServerCertificate: true, // Trust server certificate (useful for local databases)
      },
      port: 1443,
    };

    try {
      await mssql.connect(dynamicDbConfigRP);

      if (ip === "") {
        databaseConnectionResult = await mssql.query`
                USE [RTPOS_MAIN]
                UPDATE tb_USERS
                SET port = ${newPort}, registered_by = ${username}
                WHERE username = ${newName};
              `;
      } else if (port === "") {
        databaseConnectionResult = await mssql.query`
                USE [RTPOS_MAIN]
                UPDATE tb_USERS
                SET ip_address = ${newIP}, registered_by = ${username}
                WHERE username = ${newName};
              `;
      } else {
        databaseConnectionResult = await mssql.query`
                USE [RTPOS_MAIN]
                UPDATE tb_USERS
                SET ip_address = ${newIP}, port = ${newPort}, registered_by = ${username}
                WHERE username = ${newName};
              `;
      }
      console.log("Successfully connected to the dynamic database");
    } catch (err) {
      console.error("Failed to connect to the database:", err);
      return res
        .status(500)
        .json({ message: "Failed to connect to the database" });
    }

    if (databaseConnectionResult.rowsAffected[0] === 0) {
      // No rows were updated
      return res
        .status(404)
        .json({ message: "Please check the provided data." });
    }

    // Return success response
    return res
      .status(200)
      .json({ message: "Database connection updated successfully" });
  } catch (err) {
    console.error("Error:", err);
    return res
      .status(500)
      .json({ message: "Failed to establish the connection." });
  }
};

//log out
exports.closeConnection = async (req, res) => {
  try {
    await mssql.close();

    res.status(201).json({ message: "Connection Closed successfully" });
  } catch (err) {
    console.error("Error during connection closing:", err);
    res.status(500).json({ message: "Failed to close the connection" });
  }
};

//sales scan
exports.scan = async (req, res) => {
  const codeData = req.query.data;
  const company = req.query.company;
  let salesData;
  let quantity;
  try {
   if(codeData!=="No result" && codeData!=="" && codeData!==null){

    const product = await mssql.query`
    USE [POSBACK_SYSTEM] SELECT PRODUCT_CODE FROM tb_BARCODELINK 
      WHERE BARCODE = ${codeData};
    `;

    if (product.recordset.length === 0) {
      salesData = await mssql.query`
      USE [POSBACK_SYSTEM] SELECT PRODUCT_CODE, PRODUCT_NAMELONG, COSTPRICE, SCALEPRICE FROM tb_PRODUCT 
        WHERE PRODUCT_CODE = ${codeData}  OR BARCODE = ${codeData} OR BARCODE2 = ${codeData} ;
      `;
    }
    else{
      const productCode = product.recordset[0]?.PRODUCT_CODE;
      salesData = await mssql.query`
      USE [POSBACK_SYSTEM] SELECT PRODUCT_CODE, PRODUCT_NAMELONG, COSTPRICE, SCALEPRICE FROM tb_PRODUCT 
        WHERE PRODUCT_CODE = ${productCode};
      `;
    }

    const code = salesData.recordset[0]?.PRODUCT_CODE;
    quantity = await mssql.query`
    SELECT ISNULL(SUM(STOCK),0) AS STOCK FROM tb_STOCK WHERE COMPANY_CODE = ${company} 
    AND (BIN = 'F' OR BIN IS NULL)
     AND PRODUCT_CODE = ${code}
    `;
    }
    else{
      console.log('no code provided')
      return res.status(404).json({ message: "Please provide code or scanned barcode" });
    }
    
    if (salesData.recordset.length === 0) {
      console.log("no product found");
      return res.status(404).json({ message: "Product not found" });
    }
 
    res.status(200).json({
      message: "Item Found Successfully",
      salesData: salesData.recordset,
      amount:quantity.recordset[0]?.STOCK
    });
  } catch (error) {
    console.error("Error retrieving barcode data:", error);
    res.status(500).json({ message: "Failed to retrieve barcode data" });
  }
};

//sales temp sales table
exports.updateTempSalesTable = async (req, res) => {
  let username;
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(403)
        .json({ message: "No authorization token provided" });
    }
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "Token is missing" });
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
     username = decoded.username; // Assuming 'username' is part of the token payload
    });

    const { company, count, type, productCode, productName, costPrice, scalePrice, stock, quantity } = req.body;

      const insertQuery = `
    USE [RT_WEB]
      INSERT INTO tb_STOCKRECONCILATION_DATAENTRYTEMP 
      (COMPANY_CODE, COUNT_STATUS, TYPE, PRODUCT_CODE, PRODUCT_NAMELONG, COSTPRICE, UNITPRICE, CUR_STOCK, PHY_STOCK, REPUSER)
      VALUES (@company, @count, @type, @productCode, @productName, @costPrice, @scalePrice, @stock, @quantity, @username)
    `;
    const insertRequest = new mssql.Request();
    insertRequest.input("company", mssql.NChar(10), company);
    insertRequest.input("count", mssql.NChar(10), count);
    insertRequest.input("type", mssql.NChar(10), type);
    insertRequest.input("productCode", mssql.NChar(30), productCode);
    insertRequest.input("productName", mssql.NChar(50), productName);
    insertRequest.input("costPrice", mssql.Money, costPrice);
    insertRequest.input("scalePrice", mssql.Money, scalePrice);
    insertRequest.input("stock", mssql.Float, stock);
    insertRequest.input("quantity", mssql.Float, quantity);
    insertRequest.input("username", mssql.NChar(10), username);

  // Execute Query
  await insertRequest.query(insertQuery);
    res.status(201).json({ message: "Table Updated successfully" });

  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to update table" });
  }
};

//stock update
exports.stockUpdate = async (req, res) => { // Ensure req and res are passed properly
  const { name,code } = req.query;
  const username = String(name);
  const company = String(code);

  
  try {
    // Query the database
    const stockData = await mssql.query(`
      USE [RT_WEB]
      SELECT IDX,COMPANY_CODE, COUNT_STATUS, TYPE, PRODUCT_CODE, PRODUCT_NAMELONG, COSTPRICE, UNITPRICE, CUR_STOCK, PHY_STOCK
       FROM tb_STOCKRECONCILATION_DATAENTRYTEMP WHERE REPUSER = '${username}' AND COMPANY_CODE = '${company}'
    `);

    // Check if data is found
    if (stockData.recordset.length === 0) {
      console.log("No stock data found");
      return res.status(404).json({ message: "Stock data not found" });
    }
    
    // Send the response
    res.status(200).json({
      message: "Stock data Found Successfully",
      stockData: stockData.recordset,
    });
  } catch (error) {
    console.error("Error retrieving stock data:", error);
    res.status(500).json({ message: "Failed to retrieve data" });
  }
};

//stock update delete
exports.stockUpdateDelete = async (req, res) => {
  try {
    const idx = req.query.idx;
    
    if (!idx) {
      return res.status(400).json({ message: "Missing 'idx' parameter" });
    }

    // Execute the query with a parameter
    const result = await mssql.query(`
      USE [RT_WEB]
      DELETE FROM tb_STOCKRECONCILATION_DATAENTRYTEMP WHERE IDX = ${idx}
    `);

    // Check if any rows were affected (i.e., data was deleted)
    if (result.rowsAffected[0] === 0) {
      console.log("No stock data found to delete");
      return res.status(404).json({ message: "Stock data not found" });
    }

    res.status(200).json({
      message: "Stock data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting stock data:", error);
    res.status(500).json({ message: "Failed to delete stock data" });
  }
};

// stock update final
exports.finalStockUpdate = async (req, res) => {
  const { username, company } = req.query;
  console.log(req.query);

  if (!username) {
    return res.status(400).json({ success: false, message: "Missing 'username' parameter" });
  }
  if (!company) {
    return res.status(400).json({ success: false, message: "Missing 'company' parameter" });
  }

  let transaction;

  try {
    transaction = new mssql.Transaction();
    await transaction.begin();

    // Step 1: Retrieve data
    const selectResult = await new mssql.Request(transaction).query(`
      SELECT * FROM [RT_WEB].dbo.tb_STOCKRECONCILATION_DATAENTRYTEMP 
      WHERE REPUSER = '${username}' AND COMPANY_CODE = '${company}'
    `);

    if (selectResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "No data found" });
    }

    // Step 2: Insert data into the new table
    const insertQuery = `
      INSERT INTO [RT_WEB].dbo.tb_STOCKRECONCILATION_DATAENTRY (
        COMPANY_CODE, PRODUCT_CODE, PRODUCT_NAMELONG, COSTPRICE, UNITPRICE,
        CUR_STOCK, PHY_STOCK, TYPE, COUNT_STATUS, REPUSER
      )
      VALUES (
        @COMPANY_CODE, @PRODUCT_CODE, @PRODUCT_NAMELONG, @COSTPRICE, @UNITPRICE,
        @CUR_STOCK, @PHY_STOCK, @TYPE, @COUNT_STATUS, @REPUSER
      )
    `;

    for (const row of selectResult.recordset) {
      await new mssql.Request(transaction)
        .input("COMPANY_CODE", mssql.NChar(10), row.COMPANY_CODE)
        .input("PRODUCT_CODE", mssql.NChar(30), row.PRODUCT_CODE)
        .input("PRODUCT_NAMELONG", mssql.NVarChar(50), row.PRODUCT_NAMELONG)
        .input("COSTPRICE", mssql.Money, row.COSTPRICE)
        .input("UNITPRICE", mssql.Money, row.UNITPRICE)
        .input("CUR_STOCK", mssql.Float, row.CUR_STOCK)
        .input("PHY_STOCK", mssql.Float, row.PHY_STOCK)
        .input("TYPE", mssql.NChar(10), row.TYPE)
        .input("COUNT_STATUS", mssql.NChar(10), row.COUNT_STATUS)
        .input("REPUSER", mssql.NVarChar(10), row.REPUSER)
        .query(insertQuery);
    }

    // Step 3: Delete original data
    const deleteResult = await new mssql.Request(transaction)
      .input("REPUSER", mssql.NVarChar(10), username)
      .input("COMPANY_CODE", mssql.NChar(10), company)
      .query(`
        DELETE FROM [RT_WEB].dbo.tb_STOCKRECONCILATION_DATAENTRYTEMP
        WHERE REPUSER = @REPUSER AND COMPANY_CODE = @COMPANY_CODE
      `);

    if (deleteResult.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "No records found to delete in the temporary table." });
    }

    // Step 4: Commit the transaction
    await transaction.commit();
    console.log('Transaction committed successfully.');
    res.status(200).json({ success: true, message: "Data moved and deleted successfully" });

  } catch (generalError) {
    console.error("Unexpected error during the process:", generalError.message);
    if (transaction && !transaction._aborted) {
      await transaction.rollback();
    }
    res.status(500).json({
      success: false,
      message: "Unexpected error occurred during the process.",
      error: generalError.message,
    });
  }
};





