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
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) 
        };
    }

    try {
        const { firstname, lastname, rank, age, jail_destination, username, password } = JSON.parse(event.body);

        if (!firstname || !lastname || !rank || !age || !jail_destination || !username || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: 'All fields are required.' })
            };
        }

        let pool = await mssql.connect(dbConfig);

        // 1. Check if Username already exists
        let checkUser = await pool.request()
            .input('username', mssql.VarChar, username)
            .query('SELECT Username FROM Users WHERE Username = @username');

        if (checkUser.recordset.length > 0) {
            return {
                statusCode: 409, // Conflict
                body: JSON.stringify({ success: false, message: 'Username is already taken.' })
            };
        }

        // 2. Insert new user into database
        await pool.request()
            .input('FirstName', mssql.VarChar, firstname)
            .input('LastName', mssql.VarChar, lastname)
            .input('Rank', mssql.VarChar, rank)
            .input('Age', mssql.Int, age)
            .input('JailDestination', mssql.VarChar, jail_destination)
            .input('Username', mssql.VarChar, username)
            .input('Password', mssql.VarChar, password) // Note: Consider hashing with bcrypt in production
            .query(`
                INSERT INTO Users (FirstName, LastName, Rank, Age, JailDestination, Username, Password)
                VALUES (@firstName, @lastName, @rank, @age, @jailDestination, @username, @password)
            `);

        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, message: 'User registered successfully!' })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};