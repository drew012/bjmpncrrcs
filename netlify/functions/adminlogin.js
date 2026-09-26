const mssql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // rjdrew06-63682.portmap.host
  port: parseInt(process.env.DB_PORT, 10) || 63682,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000 // Increases timeout limit to 30 seconds
  }
};

exports.handler = async (event, context) => {
    // Restrict request method to POST
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) 
        };
    }

    try {
        const { adminusername, adminpassword } = JSON.parse(event.body);

        // Connect to SQL Server
        let pool = await mssql.connect(dbConfig);
        
        // Query to check if user exists
        let result = await pool.request()
            .input('adminusername', mssql.VarChar, adminusername)
            .query('SELECT * FROM Users WHERE adminusername = @adminusername');

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            
            // NOTE: Replace with bcrypt password comparison for security in production
            if (user.adminpassword === adminpassword) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'Login successful' })
                };
            }
        }

        return {
            statusCode: 401,
            body: JSON.stringify({ success: false, message: 'Invalid username or password' })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};