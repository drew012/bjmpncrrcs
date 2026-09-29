const mssql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // rjdrew06-63682.portmap.host
  port: parseInt(process.env.DB_PORT, 10) || 63682,
  database: process.env.DB_NAME, // BJMP_NCR_DB
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000 // 15s connection timeout
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Global pool connection cache for Netlify warm starts
let poolPromise;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      jailSelections,
      valuesFocus,
      activityDate,
      senderName,
      fileName,
      fileData
    } = body;

    if (!activityDate || !senderName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Activity date and sender name are required.' })
      };
    }

    // Convert Base64 data string to Buffer safely
    let fileBuffer = null;
    if (fileData) {
      const cleanBase64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      fileBuffer = Buffer.from(cleanBase64, 'base64');
    }

    // Reuse pool connection if existing
    if (!poolPromise) {
      poolPromise = mssql.connect(dbConfig);
    }
    const pool = await poolPromise;

    await pool.request()
      .input('JailSelections', mssql.NVarChar(mssql.MAX), jailSelections || '')
      .input('ValuesFocus', mssql.NVarChar(mssql.MAX), valuesFocus || '')
      .input('ActivityDate', mssql.Date, activityDate)
      .input('SenderName', mssql.NVarChar(200), senderName)
      .input('FileName', mssql.NVarChar(255), fileName || '')
      .input('FileData', mssql.VarBinary(mssql.MAX), fileBuffer)
      .query(`
        INSERT INTO AAR_Submissions (
          JailSelections,
          ValuesFocus,
          ActivityDate,
          SenderName,
          FileName,
          FileData,
          SubmittedAt
        )
        VALUES (
          @JailSelections,
          @ValuesFocus,
          @ActivityDate,
          @SenderName,
          @FileName,
          @FileData,
          GETDATE()
        )
      `);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: 'AAR submitted successfully.' })
    };

  } catch (error) {
    // Reset pool on connection error so it can retry next call
    poolPromise = null;
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};