try { require('dotenv').config(); } catch (e) {}
const mysql = require('mysql2');
const initializeDatabase = require('./init');

let poolConfig;

let dbName = process.env.DB_NAME || (process.env.DB_HOST ? 'test' : 'temple_db');
if (dbName === 'sys') {
    dbName = 'test'; // 'sys' is a reserved system schema; 'test' is the default writable database in TiDB/MySQL
}

if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    poolConfig = {
        uri: dbUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    };
    if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || dbUrl.includes('sslmode') || dbUrl.includes('ssl=')) {
        poolConfig.ssl = {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
        };
    }
} else {
    const isCloudHost = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1';
    const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || isCloudHost;

    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'N@2006',
        database: dbName,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    };

    if (useSSL) {
        poolConfig.ssl = {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
        };
    }
}

const pool = mysql.createPool(poolConfig);

// Test pool connection and auto-initialize tables
pool.getConnection((err, conn) => {
    if (err) {
        console.error('[Database Connection Failed]:', err.message);
        console.error('[Database Config Used]:', {
            host: poolConfig.host,
            user: poolConfig.user,
            port: poolConfig.port,
            database: poolConfig.database,
            ssl: !!poolConfig.ssl
        });
    } else {
        console.log(`[Database] MySQL Connected successfully to database '${poolConfig.database || dbName}' via Connection Pool`);
        conn.release();
        initializeDatabase(pool);
    }
});

module.exports = pool;