const mysql = require('mysql2');
 
// create the connection to database
const connection = mysql.createConnection({
  host: 'sql12.freemysqlhosting.net',
  user: 'sql12381296',
  database: 'sql12381296',
  password: 'f1lvaeuXZF'
});

module.exports = connection