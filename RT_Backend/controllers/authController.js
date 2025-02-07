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

  await mssql.close();
  const dbConfig = {
    user: process.env.DB_USER,      // Database username
    password: process.env.DB_PASSWORD,  // Database password
    server: process.env.DB_SERVER,        // Database server address
    database: process.env.DB_DATABASE1,  // Database name
    options: {
      encrypt: false,            // Disable encryption
      trustServerCertificate: true // Trust server certificate (useful for local databases)
    },
    port: 1443                   // Default MSSQL port (1433)
  };
  await mssql.connect(dbConfig);

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const userCheckRequest = new mssql.Request();
    userCheckRequest.input("username", mssql.VarChar, username);

    const loginResult = await userCheckRequest.query(
      "USE [RTPOS_MAIN] SELECT * FROM tb_USERS WHERE username = @username"
    );

    if (loginResult.recordset.length === 0) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const user = loginResult.recordset[0];
    let PORT = user.port;
    let IP = user.ip_address;

    if (!PORT || !IP) {
      return res.status(400).json({
        message: "Connection hasn't been established yet! Please contact the system support team.",
      });
    }

    PORT = PORT.trim();
    IP = IP.trim();
    PORT = parseInt(PORT);

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

    // Connect to the dynamic database
    await mssql.connect(dynamicDbConfig);
    console.log("Successfully connected to the dynamic database");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await mssql.close();
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        dashboard: user.dashboard,
        email: user.email,
        admin: user.admin,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error:", error);
    // await mssql.close();
    res.status(500).json({ message: "Failed to log in" });
  }
};

// Register function
exports.register = async (req, res) => {
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
  
  const databaseResult = await mssql.query`SELECT DB_NAME() AS DatabaseName;`;
    console.log("Connected to database:", databaseResult.recordset[0].DatabaseName);
  try {
    const dashboardOptionsResult = await mssql.query`
    USE [RT_WEB]
      SELECT COMPANY_CODE, COMPANY_NAME FROM tb_COMPANY;
    `;

    if (dashboardOptionsResult.recordset.length === 0) {
      console.log("no companies found");
      return res.status(404).json({ message: "User not found" });
    }
    console.log("companies", dashboardOptionsResult.recordset);
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
              await mssql.query`EXEC Sp_SalesCurView @COMPANY_CODE = ${companyCodeString}, @DATE = ${formattedCurrentDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;

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
              await mssql.query`EXEC Sp_SalesView @COMPANY_CODE = ${companyCodeString}, @DATE1 = ${formattedFromDate}, @DATE2 = ${formattedToDate}, @REPUSER = ${username}, @REPORT_TYPE = ${reportType}`;

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
      

      console.log("result1",  categoryTableRecords.recordset);
      // console.log("result2", categoryBarChart.recordset);


      res.status(200).json({
        message: "Processed parameters for company codes",
        success: true,
        categoryTableRecords:  categoryTableRecords ?  categoryTableRecords.recordset : [],
        categoryAmountBarChart: categoryAmountBarChart ? categoryAmountBarChart.recordset : [],
        categoryQuantityBarChart: categoryQuantityBarChart ? categoryQuantityBarChart.recordset : [],
      });
    });
  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to process parameters" });
  }
};

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

      console.log("result1",  subCategoryTableRecords.recordset);
      console.log("result2", subCategoryAmountBarChart.recordset);


      res.status(200).json({
        message: "Processed parameters for company codes",
        success: true,
        subCategoryTableRecords:  subCategoryTableRecords ?  subCategoryTableRecords.recordset : [],
        subCategoryAmountBarChart: subCategoryAmountBarChart ? subCategoryAmountBarChart.recordset : [],
        subCategoryQuantityBarChart: subCategoryQuantityBarChart ? subCategoryQuantityBarChart.recordset : [],
      });
    });
  } catch (error) {
    console.error("Error processing parameters:", error);
    res.status(500).json({ message: "Failed to process parameters" });
  }
};

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
        vendorTableRecords:  vendorTableRecords ?  vendorTableRecords.recordset : [],
        vendorAmountBarChart: vendorAmountBarChart ? vendorAmountBarChart.recordset : [],
        vendorQuantityBarChart: vendorQuantityBarChart ? vendorQuantityBarChart.recordset : [],
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

exports.closeConnection = async (req, res) => {
  try {
    await mssql.close();
    const dbConfig = {
      user: process.env.DB_USER,      // Database username
      password: process.env.DB_PASSWORD,  // Database password
      server: process.env.DB_SERVER,        // Database server address
      database: process.env.DB_DATABASE1,  // Database name
      options: {
        encrypt: false,            // Disable encryption
        trustServerCertificate: true // Trust server certificate (useful for local databases)
      },
      port: 1443                   // Default MSSQL port (1433)
    };
    await mssql.connect(dbConfig);
    res.status(201).json({ message: "Connection Closed successfully" });
  } catch (err) {
    console.error("Error during connection closing:", err);
    res
      .status(500)
      .json({ message: "Failed to close the connection" });
  }
};