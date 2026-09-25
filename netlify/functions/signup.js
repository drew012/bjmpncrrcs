const mssql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10) || 63682,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000
  }
};

exports.handler = async (event, context) => {
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
        statusCode: 409,
        body: JSON.stringify({ success: false, message: 'Username is already taken.' })
      };
    }

    // 2. Insert new user into database (Notice matching parameter names @firstName, @lastName, etc.)
    await pool.request()
      .input('firstName', mssql.VarChar, firstname)
      .input('lastName', mssql.VarChar, lastname)
      .input('rank', mssql.VarChar, rank)
      .input('age', mssql.Int, parseInt(age, 10))
      .input('jailDestination', mssql.VarChar, jail_destination)
      .input('username', mssql.VarChar, username)
      .input('password', mssql.VarChar, password)
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