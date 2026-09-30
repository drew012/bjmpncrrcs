const mssql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
  }

  let pool;
  try {
    const { submissionIds, fileNames } = JSON.parse(event.body || '{}');

    pool = await mssql.connect(dbConfig);

    // Delete by SubmissionID if provided, otherwise fallback to matching FileName/SubmittedAt
    if (submissionIds && submissionIds.length > 0) {
      await pool.request().query(`
        DELETE FROM AAR_Submissions 
        WHERE SubmissionID IN (${submissionIds.map(id => parseInt(id, 10)).join(',')})
      `);
    } else if (fileNames && fileNames.length > 0) {
      const nameList = fileNames.map(f => `'${f.replace(/'/g, "''")}'`).join(',');
      await pool.request().query(`
        DELETE FROM AAR_Submissions 
        WHERE FileName IN (${nameList})
      `);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: 'Submissions deleted successfully.' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: error.message })
    };
  } finally {
    if (pool) await pool.close();
  }
};