// test-db.js
const sql = require("mssql");

const config = {
  user: "sa",
  password: "0Quenmatkhau",
  server: "localhost",
  database: "LoginDB",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function testConnection() {
  try {
    await sql.connect(config);
    console.log("✅ Database connection successful!");

    // Test query
    const result = await sql.query("SELECT @@VERSION as version");
    console.log("✅ SQL Server version:", result.recordset[0].version);

    await sql.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
}

testConnection();

//<-- sk-proj-ETZTTv6GQaP7ItsOVMfp5URFW_mhfDBcFrkk2ZBgkr7nUrmngazGREffnJ6svkHer1HndcQnO1T3BlbkFJkeZwSF_rJDl-DAUa_h0TaQtrYDKNQ1seljLJBdATxY42QyLPN1j9fIGo_bnYoRsW8xbuw7nOgA-->
