const tables = [
    {
        name: 'financial_years',
        sql: `CREATE TABLE IF NOT EXISTS financial_years (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            mobile VARCHAR(50) NOT NULL,
            financial_year VARCHAR(50) NOT NULL,
            is_selected BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    },
    {
        name: 'current_balance',
        sql: `CREATE TABLE IF NOT EXISTS current_balance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            financial_year_id INT NOT NULL,
            financial_year VARCHAR(50) NOT NULL,
            initial_balance DECIMAL(15,2) DEFAULT 0.00,
            amount DECIMAL(15,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    },
    {
        name: 'income',
        sql: `CREATE TABLE IF NOT EXISTS income (
            id INT AUTO_INCREMENT PRIMARY KEY,
            financial_year_id INT NOT NULL,
            financial_year VARCHAR(50) NOT NULL,
            receipt_no VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            place VARCHAR(255) DEFAULT '',
            mobile VARCHAR(50) DEFAULT '',
            type VARCHAR(100) NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    },
    {
        name: 'other_income',
        sql: `CREATE TABLE IF NOT EXISTS other_income (
            id INT AUTO_INCREMENT PRIMARY KEY,
            financial_year_id INT NOT NULL,
            financial_year VARCHAR(50) NOT NULL,
            details TEXT,
            name VARCHAR(255) DEFAULT '',
            mobile VARCHAR(50) DEFAULT '',
            amount DECIMAL(15,2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    },
    {
        name: 'expenses',
        sql: `CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            financial_year_id INT NOT NULL,
            financial_year VARCHAR(50) NOT NULL,
            details TEXT,
            expense_type VARCHAR(100) NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    },
    {
        name: 'other_expenses',
        sql: `CREATE TABLE IF NOT EXISTS other_expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            financial_year_id INT NOT NULL,
            financial_year VARCHAR(50) NOT NULL,
            details TEXT,
            amount DECIMAL(15,2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    }
];

function initializeDatabase(pool) {
    return new Promise((resolve) => {
        let completed = 0;
        let hasError = false;

        tables.forEach((t) => {
            pool.query(t.sql, (err) => {
                completed++;
                if (err) {
                    hasError = true;
                    console.error(`[DB Init] Failed to create table ${t.name}:`, err.message);
                }
                if (completed === tables.length) {
                    // Auto-migrate receipt_no to VARCHAR(100) if it was previously created as INT
                    pool.query('ALTER TABLE income MODIFY COLUMN receipt_no VARCHAR(100) NOT NULL;', (alterErr) => {
                        if (alterErr && !alterErr.message.includes('Duplicate')) {
                            // Non-fatal if table is newly created with VARCHAR(100)
                        }
                        if (!hasError) {
                            console.log('[DB Init] All database tables verified, migrated and ready.');
                        }
                        resolve();
                    });
                }
            });
        });
    });
}

module.exports = initializeDatabase;
