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

    const fileBuffer = fileData ? Buffer.from(fileData, 'base64') : null;

    const pool = await mssql.connect(dbConfig);

    await pool.request()
      .input('JailSelections', mssql.NVarChar(mssql.MAX), jailSelections || '')
      .input('ValuesFocus', mssql.NVarChar(mssql.MAX), valuesFocus || '')
      .input('ActivityDate', mssql.Date, activityDate)
      .input('SenderName', mssql.NVarChar(200), senderName)
      .input('FileName', mssql.NVarChar(255), fileName || '')
      .input('FileData', fileBuffer ? mssql.VarBinary(mssql.MAX) : mssql.VarBinary(mssql.MAX), fileBuffer)
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
      body: JSON.stringify({ success: true, message: 'AAR submitted successfully.' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
