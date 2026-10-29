try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./database/db');

const app = express();

// Trust proxy for Render / Cloud hosting
app.set('trust proxy', 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'temple_secret_key_default',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// LOGIN PAGE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

// LOGIN
// LOGIN
// LOGIN
app.post('/login', (req, res) => {

    const { username, password } = req.body;

    if (username === 'Nainar' && password === 'Nainar') {

        req.session.loggedIn = true;

        const sql = 'SELECT * FROM financial_years LIMIT 1';

        db.query(sql, (err, result) => {

            if (err) {

                console.log(err);

                console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

            }

            if (result.length > 0) {

                return res.redirect('/home');

            } else {

                return res.sendFile(
                    path.join(
                        __dirname,
                        'views/financial-year.html'
                    )
                );

            }

        });

    } else {

        return res.send(`

            <script>

                alert(
                    'Invalid Username or Password'
                );

                window.location.href = '/';

            </script>

        `);

    }

});

// SAVE FIRST FINANCIAL YEAR
app.post('/financial-year', (req, res) => {

    const { name, mobile, financial_year } = req.body;
    const cleanYear = (financial_year || '').trim();

    // Check if financial year already exists
    const checkSql = 'SELECT id FROM financial_years WHERE TRIM(LOWER(financial_year)) = TRIM(LOWER(?))';
    db.query(checkSql, [cleanYear], (err, checkResult) => {
        if (err) {
            console.error('[Financial Year Check Error]:', err);
            return res.send('Database Error: ' + err.message);
        }

        if (checkResult.length > 0) {
            return res.send(`
                <script>
                    alert('Financial Year "' + ${JSON.stringify(cleanYear)} + '" already exists!');
                    window.history.back();
                </script>
            `);
        }

        db.query(
            'UPDATE financial_years SET is_selected = false',
            () => {

                const sql = `
                    INSERT INTO financial_years
                    (name,mobile,financial_year,is_selected)
                    VALUES (?,?,?,true)
                `;

                db.query(
                    sql,
                    [name, mobile, cleanYear],
                    (err, result) => {

                        if (err) {
                            return res.send(`
                                <script>
                                    alert('Financial Year already exists!');
                                    window.history.back();
                                </script>
                            `);
                        }

                        res.sendFile(
                            path.join(__dirname, 'views/current-balance.html')
                        );

                    }
                );

            }
        );
    });

});

// ADD NEW FINANCIAL YEAR
app.post('/add-financial-year', (req, res) => {

    const {
        name,
        mobile,
        financial_year
    } = req.body;

    const cleanYear = (financial_year || '').trim();

    // ==========================================
    // CHECK IF FINANCIAL YEAR ALREADY EXISTS
    // ==========================================
    const checkSql = 'SELECT id FROM financial_years WHERE TRIM(LOWER(financial_year)) = TRIM(LOWER(?))';
    db.query(checkSql, [cleanYear], (err, checkResult) => {

        if (err) {
            console.error('[Financial Year Check Error]:', err);
            return res.send('Database Error: ' + err.message);
        }

        if (checkResult.length > 0) {
            return res.send(`
                <script>
                    alert('Financial Year "' + ${JSON.stringify(cleanYear)} + '" already exists! Please enter a different financial year.');
                    window.history.back();
                </script>
            `);
        }

        // ==========================================
        // GET PREVIOUS SELECTED FINANCIAL YEAR BALANCE
        // ==========================================

        const getCurrentSql = `
            SELECT cb.amount
            FROM financial_years fy

            LEFT JOIN current_balance cb
            ON fy.id = cb.financial_year_id

            WHERE fy.is_selected = true

            LIMIT 1
        `;


        db.query(
            getCurrentSql,
            (err, currentResult) => {

                if (err) {

                    console.log(err);

                    console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                }


                // ==========================================
                // PREVIOUS BALANCE
                // ==========================================

                let previousAmount = 0;


                if (
                    currentResult.length > 0 &&
                    currentResult[0].amount !== null
                ) {

                    previousAmount =
                    Number(currentResult[0].amount);

                }


                // ==========================================
                // UNSELECT OLD FINANCIAL YEAR
                // ==========================================

                const updateSql = `
                    UPDATE financial_years
                    SET is_selected = false
                `;


                db.query(
                    updateSql,
                    (err) => {

                        if (err) {

                            console.log(err);

                            console.error('[Error Occurred]: Financial Year Update Error', typeof err !== 'undefined' ? err : ''); return res.send('Financial Year Update Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                        }


                        // ==========================================
                        // INSERT NEW FINANCIAL YEAR
                        // ==========================================

                        const insertYearSql = `
                            INSERT INTO financial_years
                            (
                                name,
                                mobile,
                                financial_year,
                                is_selected
                            )
                            VALUES (?,?,?,true)
                        `;


                        db.query(
                            insertYearSql,
                            [
                                name,
                                mobile,
                                cleanYear
                            ],
                            (err, yearResult) => {

                                if (err) {

                                    console.log(err);

                                    return res.send(`
                                        <script>
                                            alert('Financial Year already exists!');
                                            window.history.back();
                                        </script>
                                    `);

                                }


                                const newFinancialYearId =
                                yearResult.insertId;


                                // ==========================================
                                // INSERT CURRENT BALANCE
                                // ==========================================

                                const insertBalanceSql = `
                                    INSERT INTO current_balance
                                    (
                                        financial_year_id,
                                        financial_year,
                                        initial_balance,
                                        amount
                                    )
                                    VALUES (?,?,?,?)
                                `;


                                db.query(
                                    insertBalanceSql,
                                    [
                                        newFinancialYearId,
                                        cleanYear,
                                        previousAmount,
                                        previousAmount
                                    ],
                                    (err) => {

                                        if (err) {

                                            console.log(err);

                                            console.error('[Error Occurred]: Current Balance Insert Error', typeof err !== 'undefined' ? err : ''); return res.send('Current Balance Insert Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                                        }


                                        // ==========================================
                                        // SUCCESS
                                        // ==========================================

                                        res.redirect(
                                            '/financial-years'
                                        );

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    });

});

// SAVE CURRENT BALANCE
// ==========================
// CURRENT BALANCE SAVE
// ==========================
app.post('/current-balance',(req,res)=>{

    const { amount } = req.body;

    const getYearSql = `
        SELECT id, financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(getYearSql,(err,result)=>{

        if(err) throw err;

        const financialYearId =
        result[0].id;

        const financialYear =
        result[0].financial_year;

        const sql = `
            INSERT INTO current_balance
            (
                financial_year_id,
                financial_year,
                initial_balance,
                amount
            )
            VALUES (?,?,?,?)
        `;

        db.query(
            sql,
            [
                financialYearId,
                financialYear,
                amount,
                amount
            ],
            (err,result)=>{

                if(err) throw err;

                res.redirect('/home');

            }
        );

    });

});

// HOME PAGE
app.get('/home', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const sql = `
        SELECT financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(sql, (err, result) => {

        if (err) throw err;

        let financialYear = '';

        if (result.length > 0) {
            financialYear = result[0].financial_year;
        }

        res.send(`

            <!DOCTYPE html>

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>Home</title>

                <link rel="stylesheet" href="/css/style.css">

                <style>

                    .top-bar{
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        padding:15px;
                        background:#f4f4f4;
                    }

                    .left-buttons,
                    .right-buttons{
                        display:flex;
                        gap:15px;
                    }

                    .top-btn{
                        padding:10px 18px;
                        border:none;
                        background-color:#ffa500;
                        color:white;
                        border-radius:6px;
                        cursor:pointer;
                        font-size:14px;
                    }

                    .top-btn:hover{
                        background-color:#e69500;
                    }

                    .container{
                        text-align:center;
                        margin-top:100px;
                    }

                    .menu-buttons{
                        display:flex;
                        justify-content:center;
                        gap:20px;
                        flex-wrap:wrap;
                        margin-top:40px;
                    }

                </style>
<style>

.top-btn {

    width: 146px;
    height: 46px;

    padding: 0;

    font-size: 16px;

    background: #ffa500;
    color: white;

    border: none;
    border-radius: 7px;

    cursor: pointer;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    box-sizing: border-box;

}

</style>
            </head>

            <body>

            <div class="top-bar">

                <div class="left-buttons">

                    <a href="/financial-years">
                        <button class="top-btn">
                            Financial Years
                        </button>
                    </a>

                    <a href="/create-financial-year">
                        <button class="top-btn">
                            Create Financial Year
                        </button>
                    </a>

                </div>

                <div class="right-buttons">

                    <a href="/profile">
                        <button class="top-btn">
                            Profile
                        </button>
                    </a>

                    <a href="/logout">
                        <button class="top-btn">
                            Logout
                        </button>
                    </a>

                </div>

            </div>

            <div class="container">
            <h1>அருள்மிகு நயினார் சுவாமி துணை</h1>
                <h1>
                    Welcome To ${financialYear}
                </h1>
                <div class="menu-buttons">

                    <a href="/income">
    <button class="top-btn">
        Sivarathri Income
    </button>
</a>
<form action="/total-income" method="GET">

    <button
        class="top-btn"
        type="submit">

        Sivarathri Total Income

    </button>

</form>
<a href="/other-income">
    <button class="top-btn">
        Other Income
    </button>
</a>


                    <a href="/total-other-income">

    <button class="top-btn">

        Total Other Income

    </button>

</a>

                    <a href="/expenses">

    <button class="top-btn">

        Sivarathri Expenses

    </button>

</a>

                    <a href="/total-expenses">

    <button class="top-btn">

        Sivarathri Total Expenses

    </button>

</a>
<a href="/other-expenses">
    <button class="top-btn">
        Other Expenses
    </button>
</a>

<a href="/total-other-expenses">
    <button class="top-btn">
        Total Other Expenses
    </button>
</a>
                </div>

            </div>

            </body>

            </html>

        `);

    });

});

// CREATE FINANCIAL YEAR PAGE
app.get('/create-financial-year', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    res.send(`

        <html>

        <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <title>Create Financial Year</title>

            <link
            rel="stylesheet"
            href="/css/style.css">

        </head>

        <body>

        <div class="container">

            <h2>
                Create Financial Year
            </h2>

            <form
            action="/add-financial-year"
            method="POST">

                <input
                type="text"
                name="name"
                placeholder="Enter Name"
                required
                >

                <input
                type="text"
                name="mobile"
                placeholder="Enter Mobile Number"
                required
                >

                <input
                type="text"
                name="financial_year"
                placeholder="Enter Financial Year"
                required
                >

                <button type="submit">

                    Add

                </button>

            </form>


            <a href="/home">

                <button>Back</button>

            </a>

        </div>

        </body>

        </html>

    `);

});


// FINANCIAL YEAR LIST
app.get('/financial-years', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const sql = `
        SELECT fy.id,
       fy.name,
       fy.mobile,
       fy.financial_year,
       fy.is_selected,
       cb.initial_balance,
       cb.amount
        FROM financial_years fy
        LEFT JOIN current_balance cb
        ON fy.id = cb.financial_year_id
        ORDER BY fy.id ASC
    `;

    db.query(sql, (err, result) => {

        if (err) throw err;

        let rows = '';

        result.forEach((data) => {

            const isSelected = data.is_selected == 1 || data.is_selected === true || data.is_selected === '1';
            const selectButton = isSelected
                ? `<button type="button" style="background-color: #28a745; cursor: default;" disabled>Active</button>`
                : `<a href="/select-financial-year/${data.id}"><button type="button">Select</button></a>`;

            rows += `

                <tr>

                    <td>${data.name}</td>

                    <td>${data.mobile}</td>

                    <td>${data.financial_year} ${isSelected ? '<span style="color:#28a745; font-size:12px; font-weight:bold;">(Active)</span>' : ''}</td>

                    <td>
    ₹${data.initial_balance || 0}
</td>

<td>
    ₹${data.amount || 0}
</td>

                    <td>

                        <div class="action-buttons">

                            ${selectButton}

                            <a href="/edit-financial-year/${data.id}">
                                <button>Edit</button>
                            </a>

                            <a href="/delete-financial-year/${data.id}"
                            onclick="return confirm('Are you sure you want to delete?')">
                                <button>Delete</button>
                            </a>

                        </div>

                    </td>

                </tr>

            `;

        });

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>Financial Years</title>

                <link rel="stylesheet" href="/css/style.css">

            </head>

            <body>

            <div class="container" style="width:95%;">

                <h2>Financial Year List</h2>

                <table border="1" width="100%" cellpadding="10">

                    <tr>

                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Financial Year</th>
                        <th>Initial Balance</th>
                        <th>Current Balance</th>
                        <th>Actions</th>

                    </tr>

                    ${rows}

                </table>

             

                <a href="/home">
                    <button>Back</button>
                </a>

            </div>

            </body>

            </html>

        `);

    });

});

// SELECT FINANCIAL YEAR
app.get('/select-financial-year/:id', (req, res) => {

    const id = req.params.id;

    db.query(
        'UPDATE financial_years SET is_selected = false',
        () => {

            db.query(
                'UPDATE financial_years SET is_selected = true WHERE id=?',
                [id],
                () => {

                    res.redirect('/home');

                }
            );

        }
    );

});

// EDIT FINANCIAL YEAR PAGE
// EDIT FINANCIAL YEAR PAGE
app.get('/edit-financial-year/:id',(req,res)=>{

    const id = req.params.id;

    const sql = `
        SELECT
            fy.id,
            fy.name,
            fy.mobile,
            fy.financial_year,
            cb.amount
        FROM financial_years fy

        LEFT JOIN current_balance cb
        ON fy.id = cb.financial_year_id

        WHERE fy.id=?
    `;

    db.query(
        sql,
        [id],
        (err,result)=>{

            if(err) throw err;

            if(result.length === 0){

                return res.send(
                    'Financial Year Not Found'
                );
            }

            const data = result[0];

            res.send(`

                <html>

                <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <title>
                        Edit Financial Year
                    </title>

                    <link rel="stylesheet"
                    href="/css/style.css">

                    <style>

                        input{

                            width:100%;
                            padding:12px;
                            margin-top:15px;
                            border:1px solid #ccc;
                            border-radius:5px;
                            font-size:16px;
                            box-sizing:border-box;

                        }

                    </style>

                </head>

                <body>

                <div class="container">

                    <h2>
                        Edit Financial Year
                    </h2>

                    <form
                    action="/update-financial-year/${data.id}"
                    method="POST">

                        <input
                        type="text"
                        name="name"
                        value="${data.name}"
                        required>

                        <input
                        type="text"
                        name="mobile"
                        value="${data.mobile}"
                        required>

                        <input
                        type="text"
                        name="financial_year"
                        value="${data.financial_year}"
                        required>

                        <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value="${data.amount || 0}"
                        required>

                        <button type="submit">

                            Save

                        </button>

                    </form>

                    

                    <a href="/financial-years">

                        <button>Back</button>

                    </a>

                </div>

                </body>

                </html>

            `);

        }
    );

});

// UPDATE FINANCIAL YEAR
app.post('/update-financial-year/:id',(req,res)=>{

    const id = req.params.id;

    const {
        name,
        mobile,
        financial_year,
        amount
    } = req.body;

    const cleanYear = (financial_year || '').trim();

    // Check if another financial year with this name already exists
    const checkSql = 'SELECT id FROM financial_years WHERE TRIM(LOWER(financial_year)) = TRIM(LOWER(?)) AND id != ?';
    db.query(checkSql, [cleanYear, id], (err, checkResult) => {

        if (err) {
            console.error('[Financial Year Check Error]:', err);
            return res.send('Database Error: ' + err.message);
        }

        if (checkResult.length > 0) {
            return res.send(`
                <script>
                    alert('Financial Year "' + ${JSON.stringify(cleanYear)} + '" already exists! Please choose a different year.');
                    window.history.back();
                </script>
            `);
        }

        // UPDATE FINANCIAL YEAR TABLE
        const updateYearSql = `
            UPDATE financial_years
            SET
                name=?,
                mobile=?,
                financial_year=?
            WHERE id=?
        `;

        db.query(
            updateYearSql,
            [
                name,
                mobile,
                cleanYear,
                id
            ],
            (err,result)=>{

                if(err){

                    console.log(err);

                    console.error('[Error Occurred]: Financial Year Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Financial Year Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                }

                // UPDATE CURRENT BALANCE TABLE
                const updateBalanceSql = `
                    UPDATE current_balance
                    SET
                        financial_year=?,
                        amount=?
                    WHERE financial_year_id=?
                `;

                db.query(
                    updateBalanceSql,
                    [
                        cleanYear,
                        amount,
                        id
                    ],
                    (err,result)=>{

                        if(err){

                            console.log(err);

                            console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                        }

                        // UPDATE INCOME TABLE
                        const updateIncomeSql = `
                            UPDATE income
                            SET financial_year=?
                            WHERE financial_year_id=?
                        `;

                        db.query(
                            updateIncomeSql,
                            [
                                cleanYear,
                                id
                            ],
                            (err,result)=>{

                                if(err){

                                    console.log(err);

                                    console.error('[Error Occurred]: Income Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Income Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                                }

                                res.redirect(
                                    '/financial-years'
                                );

                            }
                        );

                    }
                );

            }
        );

    });

});

// DELETE FINANCIAL YEAR
// DELETE FINANCIAL YEAR
// ==========================
// DELETE FINANCIAL YEAR
// ==========================
app.get('/delete-financial-year/:id', (req, res) => {

    const id = req.params.id;


    // ==========================================
    // DELETE SIVARATHRI INCOME RECORDS
    // ==========================================

    db.query(
        'DELETE FROM income WHERE financial_year_id=?',
        [id],
        (err) => {

            if (err) {

                console.log(err);

                console.error('[Error Occurred]: Income Delete Error', typeof err !== 'undefined' ? err : ''); return res.send('Income Delete Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

            }


            // ==========================================
            // DELETE OTHER INCOME RECORDS
            // ==========================================

            db.query(
                'DELETE FROM other_income WHERE financial_year_id=?',
                [id],
                (err) => {

                    if (err) {

                        console.log(err);

                        console.error('[Error Occurred]: Other Income Delete Error', typeof err !== 'undefined' ? err : ''); return res.send('Other Income Delete Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                    }


                    // ==========================================
                    // DELETE EXPENSE RECORDS
                    // ==========================================

                    db.query(
                        'DELETE FROM expenses WHERE financial_year_id=?',
                        [id],
                        (err) => {

                            if (err) {

                                console.log(err);

                                console.error('[Error Occurred]: Expense Delete Error', typeof err !== 'undefined' ? err : ''); return res.send('Expense Delete Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                            }


                            // ==========================================
                            // DELETE CURRENT BALANCE
                            // ==========================================

                            db.query(
                                'DELETE FROM current_balance WHERE financial_year_id=?',
                                [id],
                                (err) => {

                                    if (err) {

                                        console.log(err);

                                        console.error('[Error Occurred]: Current Balance Delete Error', typeof err !== 'undefined' ? err : ''); return res.send('Current Balance Delete Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                                    }


                                    // ==========================================
                                    // DELETE FINANCIAL YEAR
                                    // ==========================================

                                    db.query(
                                        'DELETE FROM financial_years WHERE id=?',
                                        [id],
                                        (err) => {

                                            if (err) {

                                                console.log(err);

                                                console.error('[Error Occurred]: Financial Year Delete Error', typeof err !== 'undefined' ? err : ''); return res.send('Financial Year Delete Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                                            }

                                            // Check if any financial year is currently selected. If none, auto-activate the latest remaining one
                                            db.query('SELECT id FROM financial_years WHERE is_selected = true LIMIT 1', (selErr, selRes) => {
                                                if (!selErr && (!selRes || selRes.length === 0)) {
                                                    db.query('UPDATE financial_years SET is_selected = true ORDER BY id DESC LIMIT 1', () => {
                                                        res.redirect('/financial-years');
                                                    });
                                                } else {
                                                    res.redirect('/financial-years');
                                                }
                                            });

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});

// PROFILE PAGE
app.get('/profile', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const sql = `
        SELECT *
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(sql, (err, result) => {

        if (err) throw err;

        // NO FINANCIAL YEAR
        if(result.length === 0){

            return res.send(`

                <html>

                <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <title>Profile</title>

                    <link rel="stylesheet"
                    href="/css/style.css">

                </head>

                <body>

                <div class="container">

                    <h2>
                        No Financial Year Found
                    </h2>

                    <h2>
                        Please create a financial year first.
                    </h2>

                    </a>

                    

                    <a href="/home">

                        <button>Back</button>

                    </a>

                </div>

                </body>

                </html>

            `);

        }

        const user = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>Profile</title>

                <link rel="stylesheet"
                href="/css/style.css">

            </head>

            <body>

            <div class="container">

                <h2>Profile Details</h2>

                <p>
                    <b>Name:</b>
                    ${user.name}
                </p>

                <p>
                    <b>Mobile:</b>
                    ${user.mobile}
                </p>

                <p>
                    <b>Financial Year:</b>
                    ${user.financial_year}
                </p>

                <a href="/home">

                    <button>Back</button>

                </a>

                

                <a href="/logout">

                    <button>

                        Logout

                    </button>

                </a>

            </div>

            </body>

            </html>

        `);

    });

});

// ==========================
// INCOME PAGE
// ==========================
app.get('/income', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    res.send(`

        <html>

        <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <title>Income Entry</title>

            <link rel="stylesheet"
            href="/css/style.css">

            <style>

                form select{

                    width:100%;
                    padding:12px;
                    margin-top:15px;
                    border:1px solid #ccc;
                    border-radius:5px;
                    font-size:16px;
                    box-sizing:border-box;
                    background:white;

                }

            </style>

        </head>

        <body>

        <div class="container">

            <h2>
                Sivarathri Income Entry
            </h2>

            <form
            action="/save-income"
            method="POST">

                <input
                    type="text"
                    name="name"
                    placeholder="Enter Name"
                    required
                >

                <input
                    type="text"
                    name="place"
                    placeholder="Enter Place"
                    required
                >

                <input
                    type="text"
                    name="mobile"
                    placeholder="Enter Mobile Number"
                    required
                >

                <input
type="number"
name="type_number"
id="type_number"
placeholder="
1=Thalakattu Vari, 2=Nankodai, 3=Thirumana Vari
"
required
>

<input
type="hidden"
name="type"
id="final_type"
>

                <input
                    type="number"
                    step="0.01"
                    name="amount"
                    placeholder="Enter Amount"
                    required
                >

                <input
type="number"
name="payment_number"
id="payment_number"

placeholder="
1=Cash, 2=GPay, 3=Account Number Transfer
"

required
>

<input
type="hidden"
name="payment_method"
id="final_payment_method"
>

                <button type="submit">

                    Save

                </button>
<script> document .getElementById('type_number') .addEventListener( 'input', function(){ const value = this.value; let finalType = ''; if(value == '1'){ finalType = 'Thalakattu Vari'; } else if(value == '2'){ finalType = 'Nankodai'; } else if(value == '3'){ finalType = 'Thirumana Vari'; } else{ if(value !== ''){ alert( 'Invalid Type Number' ); } finalType = ''; } document .getElementById('final_type') .value = finalType; }); </script>
<script>

    document
.getElementById('payment_number')

.addEventListener(
'input',

function(){

    const value =
    this.value;

    let finalPayment = '';

    if(value == '1'){

        finalPayment =
        'Cash';

    }
    else if(value == '2'){

        finalPayment =
        'GPay';

    }
    else if(value == '3'){

        finalPayment =
        'Account Number Transfer';

    }
    else{

        if(value !== ''){

            alert(
            'Invalid Payment Method Number'
            );

        }

        finalPayment = '';

    }

    document
    .getElementById(
    'final_payment_method'
    ).value = finalPayment;

});

</script>
            </form>

            

            <a href="/home">

                <button>Back</button>

            </a>

        </div>

        </body>

        </html>

    `);

});



// ==========================
// SAVE INCOME
// ==========================
app.post('/save-income', (req, res) => {

    const {
        name,
        place,
        mobile,
        type,
        amount,
        payment_method
    } = req.body;

    // ==========================
    // GET CURRENT FINANCIAL YEAR
    // ==========================
    const getYearSql = `
        SELECT id, financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(getYearSql, (err, result) => {

        if (err) {

            console.log(err);

            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if (result.length === 0) {

            return res.send(
                'No Financial Year Selected'
            );
        }

        const financialYearId =
        result[0].id;

        const financialYear =
        result[0].financial_year;

        // ==========================
        // GENERATE RECEIPT NUMBER
        // ==========================
        const receiptSql = `
            SELECT COUNT(*) AS total
            FROM income
            WHERE financial_year_id = ?
        `;

        db.query(
            receiptSql,
            [financialYearId],
            (err, receiptResult) => {

                if(err){
                    console.error(err);
                    return res.send('Receipt Number Error: ' + err.message);
                }

                // NEXT NUMBER
                const nextNo = receiptResult[0].total + 1;

                // RECEIPT FORMAT
                const receiptNo = financialYear + '/' + nextNo;

                // ==========================
                // INSERT INCOME
                // ==========================
                const insertSql = `
                    INSERT INTO income
                    (
                        financial_year_id,
                        financial_year,
                        receipt_no,
                        name,
                        place,
                        mobile,
                        type,
                        amount,
                        payment_method
                    )
                    VALUES (?,?,?,?,?,?,?,?,?)
                `;

                db.query(
                    insertSql,
                    [
                        financialYearId,
                        financialYear,
                        receiptNo,
                        name,
                        place,
                        mobile,
                        type,
                        amount,
                        payment_method
                    ],
                    (err, insertResult) => {

                        if (err) {
                            console.error('[Income Save Error]:', err);
                            return res.send('Income Save Failed: ' + err.message);
                        }

                        // ==========================
                        // UPDATE CURRENT BALANCE
                        // ==========================
                        const updateBalanceSql = `
                            UPDATE current_balance
                            SET amount = amount + ?
                            WHERE financial_year_id = ?
                        `;

                        db.query(
                            updateBalanceSql,
                            [
                                parseFloat(amount) || 0,
                                financialYearId
                            ],
                            (err, updateResult) => {

                                if (err) {
                                    console.error('[Balance Update Error]:', err);
                                    return res.send('Balance Update Failed: ' + err.message);
                                }

                                // ==========================
                                // PRINT OPTION
                                // ==========================
                                res.send(`
                                    <script>
                                        const printReceipt = confirm("Do you want to print receipt?");
                                        if(printReceipt){
                                            window.location.href = "/view-receipt/${insertResult.insertId}?from=income";
                                        } else {
                                            window.location.href = "/income";
                                        }
                                    </script>
                                `);

                            }
                        );

                    }
                );

            }
        );

    });

});

// ==========================
// VIEW RECEIPT
// ==========================
app.get('/view-receipt/:id', (req, res) => {

    const id = req.params.id;

    const from =
    req.query.from || 'income';

    const sql = `
        SELECT *
        FROM income
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) throw err;

        if(result.length === 0){

            return res.send(
                'Receipt Not Found'
            );
        }

        const data = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    Receipt
                </title>
    <link rel="stylesheet" href="/css/style.css">

                <link rel="stylesheet"
                href="/css/style.css">

                <style>

                    body{

                        background:#f5f5f5;

                    }

                    .receipt{

                        width:350px;
                        margin:auto;
                        border:1px solid black;
                        padding:20px;
                        margin-top:50px;
                        border-radius:10px;
                        background:white;

                    }

                    .receipt h2{

                        text-align:center;
                        margin-bottom:20px;

                    }

                    .receipt p{

                        font-size:18px;
                        margin:10px 0;

                    }

                    .receipt-no{

                        font-size:20px;
                        font-weight:bold;
                        margin-bottom:20px;

                    }

                    .btn-box{

                        display:flex;
                        justify-content:center;
                        gap:20px;
                        margin-top:30px;

                    }

                    .btn{

                        width:120px;
                        height:40px;
                        font-size:16px;
                        border:none;
                        border-radius:5px;
                        cursor:pointer;
                        background:#ffa500;
                        color:white;

                    }

                    @media print {

                        .btn-box{

                            display:none;

                        }

                        body{

                            background:white;

                        }

                    }

                </style>

            </head>

            <body>

                <div class="receipt">

                    <h2>
                        அருள்மிகு நயினார் சுவாமி துணை
                    </h2>

                    <hr>

                    <p class="receipt-no">

                        Receipt No :
                        ${data.receipt_no}

                    </p>

                    <p>

                        <b>Name :</b>
                        ${data.name}

                    </p>

                    <p>

                        <b>Place :</b>
                        ${data.place}

                    </p>

                    <p>

                        <b>Mobile :</b>
                        ${data.mobile}

                    </p>

                    <p>

                        <b>Type :</b>
                        ${data.type}

                    </p>

                    <p>

                        <b>Amount :</b>
                        ₹${data.amount}

                    </p>

                    <p>

                        <b>Payment Method :</b>
                        ${data.payment_method}

                    </p>

                    <p>

                        <b>Financial Year :</b>
                        ${data.financial_year}

                    </p>

                    <div class="btn-box">

                        <button
                        class="btn"
                        onclick="printReceipt()">

                            Print

                        </button>

                        <button
                        class="btn"
                        onclick="goBack()">Back</button>

                    </div>

                </div>

                <script>

                    function printReceipt(){

                        window.print();

                    }

                    function goBack(){

                        const from =
                        "${from}";

                        if(from === 'income'){

                            window.location.href =
                            '/income';

                        }
                        else{

                            window.location.href =
                            '/total-income';

                        }

                    }

                </script>

            </body>

            </html>

        `);

    });

});

// PRINT RECEIPT
// PRINT RECEIPT
// ==========================
// PRINT RECEIPT
// ==========================
// ==========================
// PRINT RECEIPT
// ==========================
// ==========================
// PRINT RECEIPT
// ==========================
// ==========================
// PRINT RECEIPT
// ==========================
// ==========================
// PRINT RECEIPT
// ==========================
// ==========================
// PRINT RECEIPT
// ==========================
// ==========================
// PRINT RECEIPT
// ==========================
// ==========================
// PRINT RECEIPT
// ==========================
app.get('/print-receipt/:id',(req,res)=>{

    const id = req.params.id;

    // FROM WHICH PAGE
    const from =
    req.query.from || 'income';

    const sql = `
        SELECT *
        FROM income
        WHERE id=?
    `;

    db.query(sql,[id],(err,result)=>{

        if(err) throw err;

        if(result.length === 0){

            return res.send(
                'Receipt Not Found'
            );
        }

        const data = result[0];

        // BACK PAGE
        let backPage = '/income';

        if(from === 'total-income'){

            backPage = '/total-income';

        }

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    Receipt
                </title>
    <link rel="stylesheet" href="/css/style.css">

                <style>

                    body{

                        font-family:Arial;
                        text-align:center;
                        padding-top:30px;
                        background:#f5f5f5;

                    }

                    .receipt{

                        width:350px;
                        margin:auto;
                        border:1px solid #000;
                        padding:20px;
                        border-radius:10px;
                        background:white;

                    }

                    h2{

                        margin-bottom:20px;
                        font-size:22px;

                    }

                    p{

                        font-size:18px;
                        margin:10px 0;
                        text-align:left;

                    }

                    .btn{

                        padding:10px 20px;
                        border:none;
                        background:#ffa500;
                        color:white;
                        border-radius:5px;
                        cursor:pointer;
                        font-size:16px;
                        margin:10px;

                    }

                    .buttons{

                        margin-top:20px;

                    }

                    hr{

                        margin:20px 0;

                    }

                    /* PRINT SETTINGS */
                    @media print{

                        .buttons{

                            display:none !important;

                        }

                        button{

                            display:none !important;

                        }

                        body{

                            margin:0;
                            padding:0;
                            background:white;

                        }

                        .receipt{

                            border:none;
                            box-shadow:none;

                        }

                    }

                </style>

            </head>

            <body>

                <div class="receipt">

                    <h2>

                        அருள்மிகு நயினார் சுவாமி துணை

                    </h2>

                    <hr>

                    <p>

                        <b>Name:</b>
                        ${data.name}

                    </p>

                    <p>

                        <b>Place:</b>
                        ${data.place}

                    </p>

                    <p>

                        <b>Mobile:</b>
                        ${data.mobile}

                    </p>

                    <p>

                        <b>Type:</b>
                        ${data.type}

                    </p>

                    <p>

                        <b>Amount:</b>
                        ₹${data.amount}

                    </p>

                    <p>

                        <b>Payment Method:</b>
                        ${data.payment_method}

                    </p>

                    <p>

                        <b>Financial Year:</b>
                        ${data.financial_year}

                    </p>

                    <div class="buttons">

                        <button
                        class="btn"

                        onclick="window.print()">

                            Print

                        </button>

                        <button
                        class="btn"

                        onclick="
                        window.location.href='${backPage}'
                        ">Back</button>

                    </div>

                </div>

            </body>

            </html>

        `);

    });

});


// TOTAL INCOME PAGE
// TOTAL INCOME PAGE
// ==========================
// TOTAL INCOME PAGE
// ==========================
// ==========================
// TOTAL INCOME PAGE
// ==========================
// ==========================
// TOTAL INCOME PAGE
// ==========================
app.get('/total-income', (req, res) => {

    if (!req.session.loggedIn) {

        return res.redirect('/');

    }

    const yearSql = `
        SELECT financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(yearSql, (err, yearResult) => {

        if (err) throw err;

        if (yearResult.length === 0) {

            return res.send(
                'No Financial Year Selected'
            );

        }

        const financialYear =
        yearResult[0].financial_year;

        // FILTER VALUES
        const date =
        req.query.date || '';

        const place =
        req.query.place || '';

        const mobile =
        req.query.mobile || '';

        const type =
        req.query.type || '';

        const amount =
        req.query.amount || '';

        const payment_method =
        req.query.payment_method || '';

        let sql = `
            SELECT *
            FROM income
            WHERE financial_year=?
        `;

        let values = [financialYear];

        // DATE FILTER
        if (date) {

            sql += `
                AND DATE(created_at)=?
            `;

            values.push(date);

        }

        // PLACE FILTER
        if (place) {

            sql += `
                AND place LIKE ?
            `;

            values.push(
                '%' + place + '%'
            );

        }

        // MOBILE FILTER
        if (mobile) {

            sql += `
                AND mobile LIKE ?
            `;

            values.push(
                '%' + mobile + '%'
            );

        }

        // TYPE FILTER
        if (type) {

            sql += `
                AND type=?
            `;

            values.push(type);

        }

        // AMOUNT FILTER
        if (amount) {

            sql += `
                AND amount=?
            `;

            values.push(amount);

        }

        // PAYMENT METHOD FILTER
        if (payment_method) {

            sql += `
                AND payment_method=?
            `;

            values.push(
                payment_method
            );

        }

        // FIFO ORDER
        sql += `
            ORDER BY id ASC
        `;

        db.query(
            sql,
            values,
            (err, result) => {

                if (err) throw err;

                let rows = '';

                let total = 0;

                result.forEach((data,index) => {

                    total += Number(
                        data.amount
                    );

                    rows += `

                        <tr>

    <td>
        ${index + 1}
    </td>

    <td>
        ${data.receipt_no || '-'}
    </td>

    <td>
        ${data.name}
    </td>

    <td>
        ${data.place}
    </td>

    <td>
        ${data.mobile}
    </td>

    <td>
        ${data.type}
    </td>

    <td>
        ₹${data.amount}
    </td>

    <td>
        ${data.payment_method}
    </td>

                            <td class="no-print">

                                <div style="
                                    display:flex;
                                    gap:10px;
                                    justify-content:center;
                                    flex-wrap:wrap;
                                ">

                                    <a href="/view-receipt/${data.id}?from=total">

                                        <button>
                                            View
                                        </button>

                                    </a>

                                    <a href="/edit-income/${data.id}">

                                        <button>
                                            Edit
                                        </button>

                                    </a>

                                    <a
                                    href="/delete-income/${data.id}"

                                    onclick="return confirm(
                                    'Delete this income?')">

                                        <button>
                                            Delete
                                        </button>

                                    </a>

                                </div>

                            </td>

                        </tr>

                    `;

                });

                res.send(`

                    <html>

                    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                        <title>
                        Total Income
                        </title>

                        <link
                        rel="stylesheet"
                        href="/css/style.css">

                        <style>

                            #filterBox input,
                            #filterBox select{

                                width:100%;
                                padding:12px;
                                margin-top:5px;
                                border:1px solid #ccc;
                                border-radius:5px;
                                font-size:16px;
                                box-sizing:border-box;
                                background:white;

                            }

                            @media print{

                                .no-print,
                                button,
                                #filterBox{

                                    display:none !important;

                                }

                            }

                        </style>

                    </head>

                    <body>

                    <div
                    class="container"
                    style="width:95%;">

                        <h2>
                            Sivarathri Total Income
                        </h2>

                        <!-- FILTER BUTTON -->
                        <div style="
                            display:flex;
                            justify-content:flex-end;
                            width:100%;
                            margin-bottom:20px;
                        ">

                            <button
                            onclick="toggleFilter()">

                                Filter

                            </button>

                        </div>

                        <!-- FILTER BOX -->
                        <div
                        id="filterBox"

                        style="
                            display:none;
                            border:1px solid #ccc;
                            padding:20px;
                            border-radius:10px;
                            margin-bottom:20px;
                        ">

                            <form
                            method="GET"
                            action="/total-income">

                                <div style="
                                    display:grid;
                                    grid-template-columns:
                                    repeat(
                                    auto-fit,
                                    minmax(200px,1fr)
                                    );
                                    gap:15px;
                                ">

                                    <div>

                                        <label>
                                            Date
                                        </label>

                                        <input
                                        type="date"
                                        name="date"
                                        value="${date}"
                                        >

                                    </div>

                                    <div>

                                        <label>
                                            Place
                                        </label>

                                        <input
                                        type="text"
                                        name="place"
                                        value="${place}"
                                        >

                                    </div>

                                    <div>

                                        <label>
                                            Mobile
                                        </label>

                                        <input
                                        type="text"
                                        name="mobile"
                                        value="${mobile}"
                                        >

                                    </div>

                                    <div>

                                        <label>
                                            Type
                                        </label>

                                        <select
                                        name="type">

                                            <option value="">
                                                All
                                            </option>

                                            <option
                                            value="Thalakattu Vari"

                                            ${type ===
                                            'Thalakattu Vari'
                                            ? 'selected'
                                            : ''}>

                                                Thalakattu Vari

                                            </option>

                                            <option
                                            value="Nankodai"

                                            ${type ===
                                            'Nankodai'
                                            ? 'selected'
                                            : ''}>

                                                Nankodai

                                            </option>

                                            <option
                                            value="Thirumana Vari"

                                            ${type ===
                                            'Thirumana Vari'
                                            ? 'selected'
                                            : ''}>

                                                Thirumana Vari

                                            </option>

                                        </select>

                                    </div>

                                    <div>

                                        <label>
                                            Amount
                                        </label>

                                        <input
                                        type="number"
                                        name="amount"
                                        value="${amount}"
                                        >

                                    </div>

                                    <div>

                                        <label>
                                            Payment Method
                                        </label>

                                        <select
                                        name="payment_method">

                                            <option value="">
                                                All
                                            </option>

                                            <option
                                            value="Cash"

                                            ${payment_method ===
                                            'Cash'
                                            ? 'selected'
                                            : ''}>

                                                Cash

                                            </option>

                                            <option
                                            value="GPay"

                                            ${payment_method ===
                                            'GPay'
                                            ? 'selected'
                                            : ''}>

                                                GPay

                                            </option>

                                            <option
value="Account Number Transfer"

${payment_method ===
'Account Number Transfer'
? 'selected'
: ''}>

    Account Number Transfer

</option>

                                        </select>

                                    </div>

                                </div>

                                <br>

                                <div style="
                                    display:flex;
                                    justify-content:center;
                                    gap:20px;
                                    flex-wrap:wrap;
                                ">

                                    <button type="submit">

                                        Apply Filter

                                    </button>

                                    <a href="/total-income">

                                        <button
                                        type="button">

                                            Clear

                                        </button>

                                    </a>

                                </div>

                            </form>

                        </div>

                        <!-- TABLE -->
                        <table
                        border="1"
                        width="100%"
                        cellpadding="10">

                            <tr>

                                <th>S.No</th>

<th>Receipt No</th>

<th>Name</th>

<th>Place</th>

<th>Mobile Number</th>

<th>Type</th>

<th>Amount</th>

<th>Payment Method</th>

<th class="no-print">
    Action
</th>

                            </tr>

                            ${rows}

                        </table>

                        <br>

                        <h2>

                            Grand Total :
                            ₹${total}

                        </h2>

                        <br>

                        <!-- BACK BUTTON -->
<div
class="no-print"
style="
display:flex;
justify-content:center;
gap:15px;
margin-top:20px;
">

    <a
    href="/home"
    style="text-decoration:none;">

        <button
        type="button"
        style="
        width:140px;
        height:45px;
        font-size:14px;
        background:#ffa500;
        color:white;
        border:none;
        border-radius:8px;
        cursor:pointer;
        ">Back</button>

    </a>

    <button
    type="button"
    onclick="window.print()"
    style="
    width:140px;
    height:45px;
    font-size:14px;
    background:#ffa500;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    ">

        Print

    </button>

</div>

                            

                        </div>

                        <br>

                        

                    </div>

                    <script>

                        function toggleFilter(){

                            const box =
                            document.getElementById(
                            'filterBox'
                            );

                            if(
                                box.style.display ===
                                'none'
                                ||
                                box.style.display === ''
                            ){

                                box.style.display =
                                'block';

                            }
                            else{

                                box.style.display =
                                'none';

                            }

                        }

                    </script>

                    </body>

                    </html>

                `);

            }
        );

    });

});


// ==========================
// EXPENSES PAGE
// ==========================
app.get('/expenses', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    res.send(`

        <html>

        <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <title>
                Expense Entry
            </title>

            <link rel="stylesheet"
            href="/css/style.css">

            <style>

                form input{

                    width:100%;
                    padding:12px;
                    margin-top:15px;
                    border:1px solid #ccc;
                    border-radius:5px;
                    font-size:16px;
                    box-sizing:border-box;

                }

                .type-box{

                    margin-top:15px;
                    text-align:left;

                }

                .type-box label{

                    font-size:16px;
                    font-weight:bold;

                }

                .type-box input{

                    margin-top:8px;

                }

            </style>

        </head>

        <body>

        <div class="container">

            <h2>
                Expense Entry
            </h2>

            <form
            action="/save-expense"
            method="POST"
            onsubmit="return validateExpenseForm()">

                <input
                    type="text"
                    name="details"
                    placeholder="Enter Expense Details"
                    required
                >

                <!-- EXPENSE TYPE -->

                <div class="type-box">

                    <label>
                        
                    </label>

                    <input
                        type="number"
                        name="expense_type_number"
                        id="expense_type_number"
                        min="1"
                        max="3"
                        placeholder="1=Temple  2=Food  3=Other"
                        required
                    >

                    <input
                        type="hidden"
                        name="expense_type"
                        id="final_expense_type"
                    >

                </div>

                <input
                    type="number"
                    step="0.01"
                    name="amount"
                    placeholder="Enter Amount"
                    required
                >

                <!-- PAYMENT METHOD -->

                <input
                    type="number"
                    name="payment_number"
                    id="payment_number"
                    min="1"
                    max="3"
                    placeholder="1=Cash 2=GPay 3=Account Number Transfer"
                    required
                >

                <input
                    type="hidden"
                    name="payment_method"
                    id="final_payment_method"
                >

                <button type="submit">

                    Save

                </button>

            </form>

            <br>

            <a href="/home">

                <button type="button">

                    Back

                </button>

            </a>

        </div>

        <script>

            function validateExpenseForm(){

                const type =
                document.getElementById(
                    'expense_type_number'
                ).value;

                const payment =
                document.getElementById(
                    'payment_number'
                ).value;

                let finalType = '';

                if(type === '1'){

                    finalType = 'Temple Expenses';

                }
                else if(type === '2'){

                    finalType = 'Food Expenses';

                }
                else if(type === '3'){

                    finalType = 'Other Expenses';

                }
                else{

                    alert(
                        'Invalid Expense Type Number'
                    );

                    return false;

                }

                let finalPayment = '';

                if(payment === '1'){

                    finalPayment = 'Cash';

                }
                else if(payment === '2'){

                    finalPayment = 'GPay';

                }
                else if(payment === '3'){

                    finalPayment =
                    'Account Number Transfer';

                }
                else{

                    alert(
                        'Invalid Payment Method Number'
                    );

                    return false;

                }

                document.getElementById(
                    'final_expense_type'
                ).value = finalType;

                document.getElementById(
                    'final_payment_method'
                ).value = finalPayment;

                return true;

            }

        </script>

        </body>

        </html>

    `);

});



// ==========================
// SAVE EXPENSE
// ==========================
// ==========================
// ==========================
// SAVE EXPENSE
// ==========================
app.post('/save-expense', (req, res) => {

    const {
        details,
        expense_type,
        amount,
        payment_method
    } = req.body;

    // ==========================
    // GET SELECTED FINANCIAL YEAR
    // ==========================

    const yearSql = `
        SELECT id, financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(yearSql, (err, result) => {

        if(err){

            console.log(err);

            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if(result.length === 0){

            return res.send(
                'No Financial Year Selected'
            );
        }

        const financialYearId =
        result[0].id;

        const financialYear =
        result[0].financial_year;

        // ==========================
        // CHECK CURRENT BALANCE
        // ==========================

        const balanceSql = `
            SELECT amount
            FROM current_balance
            WHERE financial_year_id=?
        `;

        db.query(
            balanceSql,
            [financialYearId],
            (err, balanceResult) => {

                if(err){

                    console.log(err);

                    console.error('[Error Occurred]: Balance Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Balance Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                }

                if(balanceResult.length === 0){

                    return res.send(
                        'Current Balance Record Missing'
                    );
                }

                const currentBalance =
                parseFloat(
                    balanceResult[0].amount
                ) || 0;

                const expenseAmount =
                parseFloat(amount) || 0;

                // ==========================
                // INSUFFICIENT BALANCE
                // ==========================

                if(
                    expenseAmount >
                    currentBalance
                ){

                    return res.send(`

                        <script>

                            alert(
                                'Insufficient Balance'
                            );

                            window.location.href =
                            '/expenses';

                        </script>

                    `);
                }

                // ==========================
                // INSERT EXPENSE
                // ==========================

                const insertSql = `
                    INSERT INTO expenses
                    (
                        financial_year_id,
                        financial_year,
                        details,
                        expense_type,
                        amount,
                        payment_method
                    )
                    VALUES (?,?,?,?,?,?)
                `;

                db.query(
                    insertSql,
                    [
                        financialYearId,
                        financialYear,
                        details,
                        expense_type,
                        expenseAmount,
                        payment_method
                    ],
                    (err, insertResult) => {

                        if(err){

                            console.log(err);

                            console.error('[Error Occurred]: Expense Save Failed', typeof err !== 'undefined' ? err : ''); return res.send('Expense Save Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                        }

                        // ==========================
                        // UPDATE CURRENT BALANCE
                        // ==========================

                        const updateBalanceSql = `
                            UPDATE current_balance
                            SET amount = amount - ?
                            WHERE financial_year_id=?
                        `;

                        db.query(
                            updateBalanceSql,
                            [
                                expenseAmount,
                                financialYearId
                            ],
                            (err, updateResult) => {

                                if(err){

                                    console.log(err);

                                    console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                                }

                                // ==========================
                                // SUCCESS
                                // ==========================

                                res.send(`

                                    <script>

                                        alert(
                                            'Expense Saved Successfully'
                                        );

                                        window.location.href =
                                        '/expenses';

                                    </script>

                                `);

                            }
                        );

                    }
                );

            }
        );

    });

});



// ==========================
// TOTAL EXPENSE PAGE
// ==========================
// ==========================
// TOTAL EXPENSE PAGE
// ==========================
app.get('/total-expenses', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const yearSql = `
        SELECT financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(yearSql, (err, yearResult) => {

        if(err){

            console.log(err);

            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if(yearResult.length === 0){

            return res.send(
                'No Financial Year Selected'
            );
        }

        const financialYear =
        yearResult[0].financial_year;

        let sql = `
            SELECT *
            FROM expenses
            WHERE financial_year=?
        `;

        let values = [financialYear];

        // DATE FILTER

        if(req.query.date){

            sql += `
                AND DATE(created_at)=?
            `;

            values.push(req.query.date);

        }

        // DETAILS FILTER

        if(req.query.details){

            sql += `
                AND details LIKE ?
            `;

            values.push(
                '%' +
                req.query.details +
                '%'
            );

        }

        // EXPENSE TYPE FILTER

        if(req.query.expense_type){

            sql += `
                AND expense_type=?
            `;

            values.push(
                req.query.expense_type
            );

        }

        // AMOUNT FILTER

        if(req.query.amount){

            sql += `
                AND amount=?
            `;

            values.push(
                req.query.amount
            );

        }

        // PAYMENT FILTER

        if(req.query.payment_method){

            sql += `
                AND payment_method=?
            `;

            values.push(
                req.query.payment_method
            );

        }

        // FIFO ORDER

        sql += `
            ORDER BY id ASC
        `;

        db.query(
            sql,
            values,
            (err, result) => {

                if(err){

                    console.log(err);

                    console.error('[Error Occurred]: Expense Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Expense Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                }

                let rows = '';

                let total = 0;

                result.forEach((data, index) => {

                    total +=
                    Number(data.amount);

                    rows += `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${data.details}
                            </td>

                            <td>
                                ${data.expense_type || ''}
                            </td>

                            <td>
                                ₹${data.amount}
                            </td>

                            <td>
                                ${data.payment_method}
                            </td>

                            <td class="no-print">

                                <div style="
                                    display:flex;
                                    gap:10px;
                                    justify-content:center;
                                    flex-wrap:wrap;
                                ">

                                    <a
                                    href="/view-expense/${data.id}">

                                        <button>
                                            View
                                        </button>

                                    </a>

                                    <a
                                    href="/edit-expense/${data.id}">

                                        <button>
                                            Edit
                                        </button>

                                    </a>

                                    <a
                                    href="/delete-expense/${data.id}"

                                    onclick="return confirm(
                                    'Delete this expense?'
                                    )">

                                        <button>
                                            Delete
                                        </button>

                                    </a>

                                </div>

                            </td>

                        </tr>

                    `;

                });

                res.send(`

                    <html>

                    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                        <title>
                            Sivarathri Total Expenses
                        </title>

                        <link rel="stylesheet"
                        href="/css/style.css">

                        <style>

                            #filterBox input,
                            #filterBox select{

                                width:100%;
                                padding:12px;
                                margin-top:5px;
                                border:1px solid #ccc;
                                border-radius:5px;
                                font-size:16px;
                                box-sizing:border-box;
                                background:white;

                            }

                            @media print {

                                .no-print,
                                #filterBox,
                                button,
                                a {

                                    display:none !important;

                                }

                                table {

                                    width:100%;
                                    border-collapse:collapse;

                                }

                                body {

                                    margin:0;
                                    padding:0;

                                }

                            }

                        </style>

                    </head>

                    <body>

                    <div class="container"
                    style="width:95%;">

                        <h2>
                            Sivarathri Total Expenses
                        </h2>

                        <!-- FILTER BUTTON -->

                        <div class="no-print"
                        style="
                            display:flex;
                            justify-content:flex-end;
                            width:100%;
                            margin-bottom:20px;
                        ">

                            <button
                            onclick="toggleFilter()">

                                Filter

                            </button>

                        </div>

                        <!-- FILTER BOX -->

                        <div
                        id="filterBox"
                        class="no-print"

                        style="
                            display:none;
                            border:1px solid #ccc;
                            padding:20px;
                            border-radius:10px;
                            margin-bottom:20px;
                        ">

                            <form
                            method="GET"
                            action="/total-expenses">

                                <div style="
                                    display:grid;
                                    grid-template-columns:
                                    repeat(
                                    auto-fit,
                                    minmax(200px,1fr)
                                    );
                                    gap:15px;
                                ">

                                    <!-- DATE -->

                                    <div>

                                        <label>
                                            Date
                                        </label>

                                        <input
                                        type="date"
                                        name="date"
                                        value="${
                                            req.query.date || ''
                                        }">

                                    </div>

                                    <!-- DETAILS -->

                                    <div>

                                        <label>
                                            Details
                                        </label>

                                        <input
                                        type="text"
                                        name="details"
                                        value="${
                                            req.query.details || ''
                                        }">

                                    </div>

                                    <!-- EXPENSE TYPE -->

                                    <div>

                                        <label>
                                            Expense Type
                                        </label>

                                        <select
                                        name="expense_type">

                                            <option value="">
                                                All
                                            </option>

                                            <option
                                            value="Temple Expenses"
                                            ${
                                            req.query.expense_type ===
                                            'Temple Expenses'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Temple Expenses

                                            </option>

                                            <option
                                            value="Food Expenses"
                                            ${
                                            req.query.expense_type ===
                                            'Food Expenses'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Food Expenses

                                            </option>

                                            <option
                                            value="Other Expenses"
                                            ${
                                            req.query.expense_type ===
                                            'Other Expenses'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Other Expenses

                                            </option>

                                        </select>

                                    </div>

                                    <!-- AMOUNT -->

                                    <div>

                                        <label>
                                            Amount
                                        </label>

                                        <input
                                        type="number"
                                        step="0.01"
                                        name="amount"
                                        value="${
                                            req.query.amount || ''
                                        }">

                                    </div>

                                    <!-- PAYMENT -->

                                    <div>

                                        <label>
                                            Payment Method
                                        </label>

                                        <select
                                        name="payment_method">

                                            <option value="">
                                                All
                                            </option>

                                            <option
                                            value="Cash"
                                            ${
                                            req.query.payment_method ===
                                            'Cash'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Cash

                                            </option>

                                            <option
                                            value="GPay"
                                            ${
                                            req.query.payment_method ===
                                            'GPay'
                                            ? 'selected'
                                            : ''
                                            }>

                                                GPay

                                            </option>

                                            <option
                                            value="Account Number Transfer"
                                            ${
                                            req.query.payment_method ===
                                            'Account Number Transfer'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Account Number Transfer

                                            </option>

                                        </select>

                                    </div>

                                </div>

                                <br>

                                <div style="
                                    display:flex;
                                    justify-content:center;
                                    gap:20px;
                                ">

                                    <button
                                    type="submit">

                                        Apply Filter

                                    </button>

                                    <a
                                    href="/total-expenses">

                                        <button
                                        type="button">

                                            Clear

                                        </button>

                                    </a>

                                </div>

                            </form>

                        </div>

                        <!-- TABLE -->

                        <table
                        border="1"
                        width="100%"
                        cellpadding="10">

                            <tr>

                                <th>
                                    S.No
                                </th>

                                <th>
                                    Details
                                </th>

                                <th>
                                    Expense Type
                                </th>

                                <th>
                                    Amount
                                </th>

                                <th>
                                    Payment Method
                                </th>

                                <th class="no-print">
                                    Actions
                                </th>

                            </tr>

                            ${rows}

                        </table>

                        <br>

                        <h2>

                            Grand Total :
                            ₹${total.toFixed(2)}

                        </h2>

                        <br>

                        <!-- BACK + PRINT -->

                        <div
                        class="no-print"
                        style="
                            display:flex;
                            justify-content:center;
                            gap:15px;
                            margin-top:20px;
                        ">

                            <a
                            href="/home"
                            style="text-decoration:none;">

                                <button
                                type="button"
                                style="
                                    width:140px;
                                    height:45px;
                                    font-size:14px;
                                    background:#ffa500;
                                    color:white;
                                    border:none;
                                    border-radius:8px;
                                    cursor:pointer;
                                ">

                                    Back

                                </button>

                            </a>

                            <button
                            type="button"
                            onclick="window.print()"
                            style="
                                width:140px;
                                height:45px;
                                font-size:14px;
                                background:#ffa500;
                                color:white;
                                border:none;
                                border-radius:8px;
                                cursor:pointer;
                            ">

                                Print

                            </button>

                        </div>

                    </div>

                    <script>

                        function toggleFilter(){

                            const box =
                            document.getElementById(
                                'filterBox'
                            );

                            if(
                                box.style.display === 'none' ||
                                box.style.display === ''
                            ){

                                box.style.display =
                                'block';

                            }
                            else{

                                box.style.display =
                                'none';

                            }

                        }

                    </script>

                    </body>

                    </html>

                `);

            }

        );

    });

});


// ==========================
// VIEW EXPENSE
// ==========================
app.get('/view-expense/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM expenses
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if(err) throw err;

        if(result.length === 0){

            return res.send(
                'Expense Not Found'
            );

        }

        const data = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    View Expense
                </title>

                <link rel="stylesheet"
                href="/css/style.css">

            </head>

            <body>

            <div class="container">

                <h2>
                    Expense Details
                </h2>

                <table
                border="1"
                cellpadding="15"
                width="60%">

                    <tr>

                        <th>
                            Details
                        </th>

                        <td>
                            ${data.details}
                        </td>

                    </tr>

                    <tr>

                        <th>
                            Expense Type
                        </th>

                        <td>
                            ${data.expense_type || ''}
                        </td>

                    </tr>

                    <tr>

                        <th>
                            Amount
                        </th>

                        <td>
                            ₹${data.amount}
                        </td>

                    </tr>

                    <tr>

                        <th>
                            Payment Method
                        </th>

                        <td>
                            ${data.payment_method}
                        </td>

                    </tr>

                    <tr>

                        <th>
                            Date
                        </th>

                        <td>
                            ${new Date(
                                data.created_at
                            ).toLocaleString()}
                        </td>

                    </tr>

                </table>

                <br>

                <a href="/total-expenses">

                    <button>
                        Back
                    </button>

                </a>

            </div>

            </body>

            </html>

        `);

    });

});



// ==========================
// EDIT EXPENSE PAGE
// ==========================
app.get('/edit-expense/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM expenses
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if(err) throw err;

        if(result.length === 0){

            return res.send(
                'Expense Not Found'
            );

        }

        const data = result[0];

        let expenseTypeNumber = '';

        if(data.expense_type === 'Temple Expenses'){

            expenseTypeNumber = '1';

        }
        else if(data.expense_type === 'Food Expenses'){

            expenseTypeNumber = '2';

        }
        else if(data.expense_type === 'Other Expenses'){

            expenseTypeNumber = '3';

        }

        let paymentNumber = '';

        if(data.payment_method === 'Cash'){

            paymentNumber = '1';

        }
        else if(data.payment_method === 'GPay'){

            paymentNumber = '2';

        }
        else if(
            data.payment_method ===
            'Account Number Transfer'
        ){

            paymentNumber = '3';

        }

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    Edit Expense
                </title>

                <link rel="stylesheet"
                href="/css/style.css">

                <style>

                    input{

                        width:100%;
                        padding:12px;
                        margin-top:15px;
                        border:1px solid #ccc;
                        border-radius:5px;
                        font-size:16px;
                        box-sizing:border-box;

                    }

                </style>

            </head>

            <body>

            <div class="container">

                <h2>
                    Edit Expense
                </h2>

                <form
                action="/update-expense/${data.id}"
                method="POST"
                onsubmit="return validateEditExpense()">

                    <input
                        type="text"
                        name="details"
                        value="${data.details}"
                        required
                    >

                    <!-- EXPENSE TYPE -->

                    <input
                        type="number"
                        name="expense_type_number"
                        id="expense_type_number"
                        value="${expenseTypeNumber}"
                        min="1"
                        max="3"
                        placeholder="1=Temple  2=Food  3=Other"
                        required
                    >

                    <input
                        type="hidden"
                        name="expense_type"
                        id="final_expense_type"
                        value="${data.expense_type || ''}"
                    >

                    <!-- AMOUNT -->

                    <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value="${data.amount}"
                        required
                    >

                    <!-- PAYMENT -->

                    <input
                        type="number"
                        name="payment_number"
                        id="payment_number"
                        value="${paymentNumber}"
                        min="1"
                        max="3"
                        placeholder="1=Cash  2=GPay  3=Account Transfer"
                        required
                    >

                    <input
                        type="hidden"
                        name="payment_method"
                        id="final_payment_method"
                        value="${data.payment_method || ''}"
                    >

                    <br>

                    <button type="submit">

                        Save

                    </button>

                </form>

                <br>

                <a href="/total-expenses">

                    <button type="button">

                        Back

                    </button>

                </a>

            </div>

            <script>

                function validateEditExpense(){

                    const type =
                    document.getElementById(
                        'expense_type_number'
                    ).value;

                    const payment =
                    document.getElementById(
                        'payment_number'
                    ).value;

                    let finalType = '';

                    if(type === '1'){

                        finalType =
                        'Temple Expenses';

                    }
                    else if(type === '2'){

                        finalType =
                        'Food Expenses';

                    }
                    else if(type === '3'){

                        finalType =
                        'Other Expenses';

                    }
                    else{

                        alert(
                            'Invalid Expense Type Number'
                        );

                        return false;

                    }

                    let finalPayment = '';

                    if(payment === '1'){

                        finalPayment =
                        'Cash';

                    }
                    else if(payment === '2'){

                        finalPayment =
                        'GPay';

                    }
                    else if(payment === '3'){

                        finalPayment =
                        'Account Number Transfer';

                    }
                    else{

                        alert(
                            'Invalid Payment Method Number'
                        );

                        return false;

                    }

                    document.getElementById(
                        'final_expense_type'
                    ).value = finalType;

                    document.getElementById(
                        'final_payment_method'
                    ).value = finalPayment;

                    return true;

                }

            </script>

            </body>

            </html>

        `);

    });

});



// ==========================
// UPDATE EXPENSE
// ==========================
app.post('/update-expense/:id', (req, res) => {

    const id = req.params.id;

    const {
        details,
        expense_type,
        amount,
        payment_method
    } = req.body;

    // GET OLD EXPENSE

    const oldSql = `
        SELECT *
        FROM expenses
        WHERE id=?
    `;

    db.query(
        oldSql,
        [id],
        (err, oldResult) => {

            if(err) throw err;

            if(oldResult.length === 0){

                return res.send(
                    'Expense Not Found'
                );

            }

            const oldData =
            oldResult[0];

            const oldAmount =
            Number(oldData.amount);

            const newAmount =
            Number(amount);

            const difference =
            newAmount - oldAmount;

            // UPDATE EXPENSE

            const updateSql = `
                UPDATE expenses
                SET
                    details=?,
                    expense_type=?,
                    amount=?,
                    payment_method=?
                WHERE id=?
            `;

            db.query(
                updateSql,
                [
                    details,
                    expense_type,
                    newAmount,
                    payment_method,
                    id
                ],
                (err, result) => {

                    if(err) throw err;

                    // UPDATE CURRENT BALANCE

                    const balanceSql = `
                        UPDATE current_balance
                        SET amount = amount - ?
                        WHERE financial_year_id=?
                    `;

                    db.query(
                        balanceSql,
                        [
                            difference,
                            oldData.financial_year_id
                        ],
                        (err, result) => {

                            if(err) throw err;

                            res.redirect(
                                '/total-expenses'
                            );

                        }
                    );

                }
            );

        }
    );

});



// ==========================
// DELETE EXPENSE
// ==========================
app.get('/delete-expense/:id', (req, res) => {

    const id = req.params.id;

    // GET EXPENSE

    const sql = `
        SELECT *
        FROM expenses
        WHERE id=?
    `;

    db.query(
        sql,
        [id],
        (err, result) => {

            if(err) throw err;

            if(result.length === 0){

                return res.send(
                    'Expense Not Found'
                );

            }

            const data = result[0];

            // DELETE EXPENSE

            db.query(
                'DELETE FROM expenses WHERE id=?',
                [id],
                (err, deleteResult) => {

                    if(err) throw err;

                    // ADD BACK TO CURRENT BALANCE

                    const balanceSql = `
                        UPDATE current_balance
                        SET amount = amount + ?
                        WHERE financial_year_id=?
                    `;

                    db.query(
                        balanceSql,
                        [
                            data.amount,
                            data.financial_year_id
                        ],
                        (err, result) => {

                            if(err) throw err;

                            res.redirect(
                                '/total-expenses'
                            );

                        }
                    );

                }
            );

        }
    );

});

// EDIT INCOME PAGE
app.get('/edit-income/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM income
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) throw err;

        if(result.length === 0){

            return res.send(
                'Income Record Not Found'
            );
        }

        const data = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    Edit Income
                </title>

                <link rel="stylesheet"
                href="/css/style.css">

            </head>

            <body>

            <div class="container">

                <h2>
                    Edit Income
                </h2>

                <form
                action="/update-income/${data.id}"
                method="POST">

                    <input
                    type="text"
                    name="name"
                    value="${data.name}"
                    placeholder="Enter Name"
                    required>

                    <input
                    type="text"
                    name="place"
                    value="${data.place}"
                    placeholder="Enter Place"
                    required>

                    <input
                    type="text"
                    name="mobile"
                    value="${data.mobile}"
                    placeholder="Enter Mobile Number"
                    required>

                    <!-- TYPE -->
                    <div style="
                        width:100%;
                        margin-top:15px;
                        text-align:left;
                    ">

                        <label>
                            Type
                        </label>

                        <input
type="number"
name="type_number"
id="type_number"

value="${
data.type === 'Thalakattu Vari'
? '1'
: data.type === 'Nankodai'
? '2'
: data.type === 'Thirumana Vari'
? '3'
: ''
}"

placeholder="1=Thalakattu Vari, 2=Nankodai, 3=Thirumana Vari"
required>

<input
type="hidden"
name="type"
id="final_type"
value="${data.type}">

<script>

document
.getElementById('type_number')
.addEventListener(
'input',

function(){

    const value = this.value;

    let finalType = '';

    if(value == '1'){

        finalType =
        'Thalakattu Vari';

    }
    else if(value == '2'){

        finalType =
        'Nankodai';

    }
    else if(value == '3'){

        finalType =
        'Thirumana Vari';

    }
    else{

        if(value !== ''){

            alert(
            'Invalid Type Number'
            );

        }

        finalType = '';

    }

    document
    .getElementById(
    'final_type'
    ).value = finalType;

});

</script>

                    </div>

                    <!-- AMOUNT -->
                    <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value="${data.amount}"
                    placeholder="Enter Amount"
                    required>

                    <!-- PAYMENT METHOD -->
                    <div style="
                        width:100%;
                        margin-top:15px;
                        text-align:left;
                    ">

                        <label>
                            Payment Method
                        </label>

                        <input
type="number"
name="payment_number"
id="payment_number"

value="${
data.payment_method === 'Cash'
? '1'
: data.payment_method === 'GPay'
? '2'
: data.payment_method === 'Account Number Transfer'
? '3'
: ''
}"

placeholder="1=Cash 2=GPay 3=Account Number Transfer"
required>

<input
type="hidden"
name="payment_method"
id="final_payment_method"
value="${data.payment_method}">

<script>

document
.getElementById('payment_number')
.addEventListener(
'input',

function(){

    const value = this.value;

    let finalPayment = '';

    if(value == '1'){

        finalPayment = 'Cash';

    }
    else if(value == '2'){

        finalPayment = 'GPay';

    }
    else if(value == '3'){

        finalPayment =
        'Account Number Transfer';

    }
    else{

        if(value !== ''){

            alert(
            'Invalid Payment Method Number'
            );

        }

        finalPayment = '';

    }

    document
    .getElementById(
    'final_payment_method'
    ).value = finalPayment;

});

</script>

                    </div>

                    <br>

                    <button type="submit">

                        Save

                    </button>

                </form>

            

                <a href="/total-income">

                    <button>Back</button>

                </a>

            </div>

            </body>

            </html>

        `);

    });

});

// UPDATE INCOME
// ==========================
// UPDATE INCOME
// ==========================
app.post('/update-income/:id', (req, res) => {

    const id = req.params.id;

    const {
        name,
        place,
        mobile,
        type,
        amount,
        payment_method
    } = req.body;

    // ==========================
    // GET OLD INCOME DATA
    // ==========================
    const oldSql = `
        SELECT *
        FROM income
        WHERE id=?
    `;

    db.query(oldSql, [id], (err, result) => {

        if (err){

            console.log(err);

            console.error('[Error Occurred]: Old Data Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Old Data Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if(result.length === 0){

            return res.send(
                'Income Record Not Found'
            );
        }

        const oldData = result[0];

        const oldAmount =
        parseFloat(oldData.amount) || 0;

        const newAmount =
        parseFloat(amount) || 0;

        // ==========================
        // DIFFERENCE CALCULATION
        // ==========================
        const difference =
        newAmount - oldAmount;

        // ==========================
        // UPDATE INCOME TABLE
        // ==========================
        const updateSql = `
            UPDATE income
            SET
                name=?,
                place=?,
                mobile=?,
                type=?,
                amount=?,
                payment_method=?
            WHERE id=?
        `;

        db.query(
            updateSql,
            [
                name,
                place,
                mobile,
                type,
                newAmount,
                payment_method,
                id
            ],
            (err, updateResult) => {

                if (err){

                    console.log(err);

                    console.error('[Error Occurred]: Income Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Income Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                }

                // ==========================
                // UPDATE CURRENT BALANCE
                // ==========================
                const balanceSql = `
                    UPDATE current_balance
                    SET amount = amount + ?
                    WHERE financial_year_id=?
                `;

                db.query(
                    balanceSql,
                    [
                        difference,
                        oldData.financial_year_id
                    ],
                    (err, balanceResult) => {

                        if (err){

                            console.log(err);

                            console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                        }

                        // ==========================
                        // SUCCESS
                        // ==========================
                        res.send(`

                            <script>

                                alert(
                                    'Income Updated Successfully'
                                );

                                window.location.href =
                                '/total-income';

                            </script>

                        `);

                    }
                );

            }
        );

    });

});

// DELETE INCOME
app.get('/delete-income/:id', (req, res) => {

    const id = req.params.id;

    // ==========================
    // GET INCOME DETAILS
    // ==========================
    const getSql = `
        SELECT *
        FROM income
        WHERE id=?
    `;

    db.query(getSql, [id], (err, result) => {

        if (err) {

            console.log(err);

            console.error('[Error Occurred]: Income Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Income Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if (result.length === 0) {

            return res.send(
                'Income Record Not Found'
            );
        }

        const data = result[0];

        const amount =
        parseFloat(data.amount) || 0;

        const financialYearId =
        data.financial_year_id;

        const financialYear =
        data.financial_year;


        // ==========================
        // DELETE INCOME
        // ==========================
        db.query(
            'DELETE FROM income WHERE id=?',
            [id],
            (err, deleteResult) => {

                if (err) {

                    console.log(err);

                    console.error('[Error Occurred]: Income Delete Failed', typeof err !== 'undefined' ? err : ''); return res.send('Income Delete Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                }


                // ==========================
                // UPDATE CURRENT BALANCE
                // ==========================
                const updateBalanceSql = `
                    UPDATE current_balance
                    SET amount = amount - ?
                    WHERE financial_year_id=?
                `;

                db.query(
                    updateBalanceSql,
                    [
                        amount,
                        financialYearId
                    ],
                    (err, balanceResult) => {

                        if (err) {

                            console.log(err);

                            console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                        }


                        // ==========================
                        // GET REMAINING INCOME
                        // ==========================
                        const remainingSql = `
                            SELECT id
                            FROM income
                            WHERE financial_year_id=?
                            ORDER BY id ASC
                        `;

                        db.query(
                            remainingSql,
                            [financialYearId],
                            (err, remainingResult) => {

                                if (err) {

                                    console.log(err);

                                    console.error('[Error Occurred]: Receipt Renumber Error', typeof err !== 'undefined' ? err : ''); return res.send('Receipt Renumber Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                                }


                                // ==========================
                                // RENUMBER RECEIPTS
                                // ==========================
                                let count = 0;

                                const updateNext = () => {

                                    if (
                                        count >=
                                        remainingResult.length
                                    ) {

                                        return res.redirect(
                                            '/total-income'
                                        );

                                    }

                                    const incomeId =
                                    remainingResult[count].id;

                                    const newReceiptNo =
                                    financialYear +
                                    '/' +
                                    (count + 1);


                                    const updateReceiptSql = `
                                        UPDATE income
                                        SET receipt_no=?
                                        WHERE id=?
                                    `;

                                    db.query(
                                        updateReceiptSql,
                                        [
                                            newReceiptNo,
                                            incomeId
                                        ],
                                        (err) => {

                                            if (err) {

                                                console.log(err);

                                                console.error('[Error Occurred]: Receipt Number Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Receipt Number Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                                            }

                                            count++;

                                            updateNext();

                                        }
                                    );

                                };


                                updateNext();

                            }
                        );

                    }
                );

            }
        );

    });

});

// ==========================
// VIEW INCOME
// ==========================
app.get('/view-income/:id',(req,res)=>{

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM income
        WHERE id=?
    `;

    db.query(sql,[id],(err,result)=>{

        if(err) throw err;

        if(result.length === 0){

            return res.send(
                'Income Record Not Found'
            );
        }

        const data = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    View Income
                </title>

                <link rel="stylesheet"
                href="/css/style.css">

                <style>

                    body{

                        font-family:Arial;
                        text-align:center;
                        padding-top:30px;
                        background:#f5f5f5;

                    }

                    .receipt{

                        width:350px;
                        margin:auto;
                        border:1px solid #000;
                        padding:20px;
                        border-radius:10px;
                        background:white;

                    }

                    p{

                        font-size:18px;
                        margin:10px 0;

                    }

                    .btn{

                        padding:10px 20px;
                        border:none;
                        background:#ffa500;
                        color:white;
                        border-radius:5px;
                        cursor:pointer;
                        font-size:16px;
                        margin:10px;

                    }

                    @media print{

                        .buttons{

                            display:none;

                        }

                    }

                </style>

            </head>

            <body onload="startPrint()">

                <div class="receipt">

                    <h2>
                        அருள்மிகு நயினார் சுவாமி துணை
                    </h2>

                    <hr>

                    <p>
                        <b>Name:</b>
                        ${data.name}
                    </p>

                    <p>
                        <b>Place:</b>
                        ${data.place}
                    </p>

                    <p>
                        <b>Mobile:</b>
                        ${data.mobile}
                    </p>

                    <p>
                        <b>Type:</b>
                        ${data.type}
                    </p>

                    <p>
                        <b>Payment Method:</b>
                        ${data.payment_method}
                    </p>

                    <p>
                        <b>Amount:</b>
                        ₹${data.amount}
                    </p>

                    <p>
                        <b>Financial Year:</b>
                        ${data.financial_year}
                    </p>

                    <p>

                        <b>Date:</b>

                        ${new Date(
                            data.created_at
                        ).toLocaleString()}

                    </p>

                    <div class="buttons">

                        <button
                        class="btn"

                        onclick="printReceipt()">

                            Print

                        </button>

                        <button
                        class="btn"

                        onclick="
                        window.location.href='/total-income'
                        ">Back</button>

                    </div>

                </div>

                <script>

    function startPrint(){

        window.print();

    }

    window.onafterprint = function(){

        window.location.href =
        '/total-income';

    };

</script>

            </body>

            </html>

        `);

    });

});


app.get('/other-income', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    res.send(`

<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Other Income</title>

    <link rel="stylesheet"
    href="/css/style.css">

</head>

<body>

<div class="container">

    <h2>
        Other Income Entry
    </h2>

    <form
    id="otherIncomeForm"
    action="/save-other-income"
    method="POST"
    onsubmit="return validatePaymentMethod()">

        <input
        type="text"
        name="details"
        placeholder="Enter Details"
        required>

        <input
        type="text"
        name="name"
        placeholder="Enter Name"
        required>

        <input
        type="text"
        name="mobile"
        placeholder="Enter Mobile Number"
        required>

        <input
        type="number"
        step="0.01"
        name="amount"
        placeholder="Enter Amount"
        required>

        <!-- PAYMENT METHOD NUMBER -->

        <input
        type="number"
        name="payment_number"
        id="payment_number"
        min="1"
        max="3"
        step="1"
        placeholder="1=Cash 2=GPay 3=Account Number Transfer"
        required>

        <!-- FINAL PAYMENT METHOD -->

        <input
        type="hidden"
        name="payment_method"
        id="final_payment_method">

        <p id="paymentError"
        style="
            color:red;
            display:none;
            margin-top:10px;
        ">

            Enter only 1, 2 or 3.

        </p>

        <button type="submit">

            Save

        </button>

    </form>


    <br>


    <a href="/home">

        <button type="button">
            Back
        </button>

    </a>

</div>


<script>

function validatePaymentMethod() {

    const paymentNumber =
    document.getElementById(
        'payment_number'
    ).value;

    const error =
    document.getElementById(
        'paymentError'
    );

    const finalPayment =
    document.getElementById(
        'final_payment_method'
    );

    let paymentMethod = '';


    if (paymentNumber === '1') {

        paymentMethod = 'Cash';

    }

    else if (paymentNumber === '2') {

        paymentMethod = 'GPay';

    }

    else if (paymentNumber === '3') {

        paymentMethod =
        'Account Number Transfer';

    }

    else {

        error.style.display = 'block';

        finalPayment.value = '';

        alert(
            'Invalid Payment Method! Enter only 1, 2 or 3.'
        );

        return false;

    }


    error.style.display = 'none';

    finalPayment.value =
    paymentMethod;

    return true;

}

</script>


</body>

</html>

    `);

});


app.post('/save-other-income', (req, res) => {

    const {
        details,
        name,
        mobile,
        amount,
        payment_number,
        payment_method
    } = req.body;


    // ==========================
    // PAYMENT METHOD VALIDATION
    // ==========================

    let finalPaymentMethod = '';


    if (payment_number === '1') {

        finalPaymentMethod = 'Cash';

    }

    else if (payment_number === '2') {

        finalPaymentMethod = 'GPay';

    }

    else if (payment_number === '3') {

        finalPaymentMethod =
        'Account Number Transfer';

    }

    else {

        return res.send(`

            <script>

                alert(
                    'Invalid Payment Method!\\n\\n' +
                    'Only 1, 2 or 3 are allowed.'
                );

                window.location.href =
                '/other-income';

            </script>

        `);

    }


    // ==========================
    // EXTRA SECURITY CHECK
    // ==========================

    if (
        payment_method !== finalPaymentMethod
    ) {

        return res.send(`

            <script>

                alert(
                    'Invalid Payment Method!'
                );

                window.location.href =
                '/other-income';

            </script>

        `);

    }


    // ==========================
    // GET SELECTED FINANCIAL YEAR
    // ==========================

    const yearSql = `
        SELECT *
        FROM financial_years
        WHERE is_selected=true
        LIMIT 1
    `;


    db.query(
        yearSql,
        (err, result) => {

            if (err) {

                console.log(err);

                console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

            }


            if (result.length === 0) {

                return res.send(
                    'No Financial Year Selected'
                );

            }


            const financialYearId =
            result[0].id;

            const financialYear =
            result[0].financial_year;


            // ==========================
            // INSERT OTHER INCOME
            // ==========================

            const insertSql = `
                INSERT INTO other_income
                (
                    financial_year_id,
                    financial_year,
                    details,
                    name,
                    mobile,
                    amount,
                    payment_method
                )
                VALUES (?,?,?,?,?,?,?)
            `;


            db.query(
                insertSql,
                [
                    financialYearId,
                    financialYear,
                    details,
                    name,
                    mobile,
                    parseFloat(amount),
                    finalPaymentMethod
                ],
                (err, insertResult) => {

                    if (err) {

                        console.log(err);

                        console.error('[Error Occurred]: Other Income Save Failed', typeof err !== 'undefined' ? err : ''); return res.send('Other Income Save Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                    }


                    // ==========================
                    // UPDATE CURRENT BALANCE
                    // ==========================

                    const balanceSql = `
                        UPDATE current_balance
                        SET amount = amount + ?
                        WHERE financial_year_id=?
                    `;


                    db.query(
                        balanceSql,
                        [
                            parseFloat(amount),
                            financialYearId
                        ],
                        (err) => {

                            if (err) {

                                console.log(err);

                                console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                            }


                            // ==========================
                            // SUCCESS
                            // ==========================

                            res.send(`

                                <script>

                                    alert(
                                        'Other Income Saved Successfully'
                                    );

                                    window.location.href =
                                    '/other-income';

                                </script>

                            `);

                        }
                    );

                }
            );

        }
    );

});

// ==========================================
// TOTAL OTHER INCOME
// ==========================================
app.get('/total-other-income', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    // ==========================================
    // GET SELECTED FINANCIAL YEAR
    // ==========================================
    const yearSql = `
        SELECT financial_year
        FROM financial_years
        WHERE is_selected=true
        LIMIT 1
    `;

    db.query(yearSql, (err, yearResult) => {

        if (err) {

            console.log(err);

            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

        }

        if (yearResult.length === 0) {

            return res.send(
                'No Financial Year Selected'
            );

        }

        const financialYear =
        yearResult[0].financial_year;


        // ==========================================
        // FILTER VALUES
        // ==========================================

        const date =
        req.query.date || '';

        const details =
        req.query.details || '';

        const name =
        req.query.name || '';

        const mobile =
        req.query.mobile || '';

        const amount =
        req.query.amount || '';

        const payment_method =
        req.query.payment_method || '';


        // ==========================================
        // BASE SQL
        // ==========================================

        let sql = `
            SELECT *
            FROM other_income
            WHERE financial_year=?
        `;

        let values = [
            financialYear
        ];


        // ==========================================
        // DATE FILTER
        // ==========================================

        if (date) {

            sql += `
                AND DATE(created_at)=?
            `;

            values.push(date);

        }


        // ==========================================
        // DETAILS FILTER
        // ==========================================

        if (details) {

            sql += `
                AND details LIKE ?
            `;

            values.push(
                '%' + details + '%'
            );

        }


        // ==========================================
        // NAME FILTER
        // ==========================================

        if (name) {

            sql += `
                AND name LIKE ?
            `;

            values.push(
                '%' + name + '%'
            );

        }


        // ==========================================
        // MOBILE FILTER
        // ==========================================

        if (mobile) {

            sql += `
                AND mobile LIKE ?
            `;

            values.push(
                '%' + mobile + '%'
            );

        }


        // ==========================================
        // AMOUNT FILTER
        // ==========================================

        if (amount) {

            sql += `
                AND amount=?
            `;

            values.push(amount);

        }


        // ==========================================
        // PAYMENT METHOD FILTER
        // ==========================================

        if (payment_method) {

            sql += `
                AND payment_method=?
            `;

            values.push(
                payment_method
            );

        }


        // ==========================================
        // FIFO ORDER
        // ==========================================

        sql += `
            ORDER BY id ASC
        `;


        // ==========================================
        // GET RECORDS
        // ==========================================

        db.query(
            sql,
            values,
            (err, result) => {

                if (err) {

                    console.log(err);

                    console.error('[Error Occurred]: Other Income Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Other Income Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                }


                let rows = '';

                let total = 0;


                // ==========================================
                // CREATE TABLE ROWS
                // ==========================================

                result.forEach(
                (data, index) => {

                    total +=
                    Number(data.amount) || 0;


                    rows += `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>


                            <td>
                                ${data.details || '-'}
                            </td>


                            <td>
                                ${data.name || '-'}
                            </td>


                            <td>
                                ${data.mobile || '-'}
                            </td>


                            <td>
                                ₹${data.amount || 0}
                            </td>


                            <td>
                                ${data.payment_method || '-'}
                            </td>


                            <td class="no-print">

                                <div style="
                                    display:flex;
                                    gap:10px;
                                    justify-content:center;
                                    flex-wrap:wrap;
                                ">


                                    <!-- VIEW -->

                                    <a
                                    href="/view-other-income/${data.id}">

                                        <button>

                                            View

                                        </button>

                                    </a>


                                    <!-- EDIT -->

                                    <a
                                    href="/edit-other-income/${data.id}">

                                        <button>

                                            Edit

                                        </button>

                                    </a>


                                    <!-- DELETE -->

                                    <a
                                    href="/delete-other-income/${data.id}"

                                    onclick="return confirm(
                                    'Delete this other income?'
                                    )">

                                        <button>

                                            Delete

                                        </button>

                                    </a>


                                </div>

                            </td>

                        </tr>

                    `;

                });


                // ==========================================
                // SEND HTML
                // ==========================================

                res.send(`

                    <html>

                    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                        <title>
                            Total Other Income
                        </title>


                        <link
                        rel="stylesheet"
                        href="/css/style.css">


                        <style>


                            /* ==========================
                               FILTER INPUTS
                            ========================== */

                            #filterBox input,
                            #filterBox select {

                                width:100%;

                                padding:12px;

                                margin-top:5px;

                                border:1px solid #ccc;

                                border-radius:5px;

                                font-size:16px;

                                box-sizing:border-box;

                                background:white;

                            }


                            /* ==========================
                               TABLE
                            ========================== */

                            table {

                                border-collapse:collapse;

                            }


                            th {

                                background:#f2f2f2;

                            }


                            td,
                            th {

                                text-align:center;

                                vertical-align:middle;

                            }


                            /* ==========================
                               PRINT
                            ========================== */

                            @media print {

                                .no-print,
                                #filterBox,
                                button,
                                a {

                                    display:none !important;

                                }

                                table {

                                    width:100%;

                                    border-collapse:collapse;

                                }

                                body {

                                    margin:0;

                                    padding:0;

                                }

                            }


                        </style>

                    </head>


                    <body>


                    <div
                    class="container"
                    style="width:95%;">


                        <h2>

                            Total Other Income

                        </h2>


                        <!-- ==================================
                             FILTER BUTTON
                        ================================== -->

                        <div
                        class="no-print"

                        style="
                            display:flex;
                            justify-content:flex-end;
                            width:100%;
                            margin-bottom:20px;
                        ">

                            <button
                            onclick="toggleFilter()">

                                Filter

                            </button>

                        </div>


                        <!-- ==================================
                             FILTER BOX
                        ================================== -->

                        <div
                        id="filterBox"
                        class="no-print"

                        style="
                            display:none;
                            border:1px solid #ccc;
                            padding:20px;
                            border-radius:10px;
                            margin-bottom:20px;
                        ">


                            <form
                            method="GET"
                            action="/total-other-income">


                                <div style="
                                    display:grid;
                                    grid-template-columns:
                                    repeat(
                                        auto-fit,
                                        minmax(200px,1fr)
                                    );
                                    gap:15px;
                                ">


                                    <!-- DATE -->

                                    <div>

                                        <label>

                                            Date

                                        </label>

                                        <input
                                        type="date"
                                        name="date"
                                        value="${date}">

                                    </div>


                                    <!-- DETAILS -->

                                    <div>

                                        <label>

                                            Details

                                        </label>

                                        <input
                                        type="text"
                                        name="details"
                                        value="${details}"
                                        placeholder="Enter Details">

                                    </div>


                                    <!-- NAME -->

                                    <div>

                                        <label>

                                            Name

                                        </label>

                                        <input
                                        type="text"
                                        name="name"
                                        value="${name}"
                                        placeholder="Enter Name">

                                    </div>


                                    <!-- MOBILE -->

                                    <div>

                                        <label>

                                            Mobile Number

                                        </label>

                                        <input
                                        type="text"
                                        name="mobile"
                                        value="${mobile}"
                                        placeholder="Enter Mobile Number">

                                    </div>


                                    <!-- AMOUNT -->

                                    <div>

                                        <label>

                                            Amount

                                        </label>

                                        <input
                                        type="number"
                                        step="0.01"
                                        name="amount"
                                        value="${amount}"
                                        placeholder="Enter Amount">

                                    </div>


                                    <!-- PAYMENT -->

                                    <div>

                                        <label>

                                            Payment Method

                                        </label>


                                        <select
                                        name="payment_method">


                                            <option value="">

                                                All

                                            </option>


                                            <option
                                            value="Cash"

                                            ${
                                            payment_method ===
                                            'Cash'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Cash

                                            </option>


                                            <option
                                            value="GPay"

                                            ${
                                            payment_method ===
                                            'GPay'
                                            ? 'selected'
                                            : ''
                                            }>

                                                GPay

                                            </option>


                                            <option
                                            value="Account Number Transfer"

                                            ${
                                            payment_method ===
                                            'Account Number Transfer'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Account Number Transfer

                                            </option>


                                        </select>

                                    </div>


                                </div>


                                <br>


                                <!-- ==================================
                                     FILTER BUTTONS
                                ================================== -->

                                <div style="
                                    display:flex;
                                    justify-content:center;
                                    gap:20px;
                                    flex-wrap:wrap;
                                ">


                                    <button
                                    type="submit">

                                        Apply Filter

                                    </button>


                                    <a
                                    href="/total-other-income">

                                        <button
                                        type="button">

                                            Clear

                                        </button>

                                    </a>


                                </div>


                            </form>


                        </div>


                        <!-- ==================================
                             TABLE
                        ================================== -->

                        <table
                        border="1"
                        width="100%"
                        cellpadding="10">


                            <tr>


                                <th>

                                    S.No

                                </th>


                                <th>

                                    Details

                                </th>


                                <th>

                                    Name

                                </th>


                                <th>

                                    Mobile

                                </th>


                                <th>

                                    Amount

                                </th>


                                <th>

                                    Payment Method

                                </th>


                                <th
                                class="no-print">

                                    Actions

                                </th>


                            </tr>


                            ${rows}


                        </table>


                        <br>


                        <!-- ==================================
                             GRAND TOTAL
                        ================================== -->

                        <h2>

                            Grand Total :
                            ₹${total.toFixed(2)}

                        </h2>


                        <br>


                        <!-- ==================================
                             BACK + PRINT
                        ================================== -->

                        <div
                        class="no-print"

                        style="
                            display:flex;
                            justify-content:center;
                            align-items:center;
                            gap:15px;
                            width:100%;
                        ">


                            <a
                            href="/home"
                            style="
                                display:block;
                                width:120px;
                            ">

                                <button
                                style="
                                    width:120px;
                                    height:45px;
                                    padding:10px;
                                ">Back</button>

                            </a>


                            <button
                            onclick="window.print()"

                            style="
                                width:120px;
                                height:45px;
                                padding:10px;
                            ">

                                Print

                            </button>


                        </div>


                    </div>


                    <!-- ==================================
                         FILTER JAVASCRIPT
                    ================================== -->

                    <script>


                        function toggleFilter(){

                            const box =
                            document.getElementById(
                                'filterBox'
                            );


                            if(
                                box.style.display ===
                                'none'
                                ||
                                box.style.display === ''
                            ){

                                box.style.display =
                                'block';

                            }
                            else{

                                box.style.display =
                                'none';

                            }

                        }


                    </script>


                    </body>

                    </html>

                `);

            }

        );

    });

});
// ==========================
// VIEW OTHER INCOME
// ==========================
app.get('/view-other-income/:id', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM other_income
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.log(err);
            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if (result.length === 0) {
            return res.send('Other Income Not Found');
        }

        const data = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    View Other Income
                </title>

                <link rel="stylesheet"
                href="/css/style.css">

            </head>

            <body>

            <div class="container">

                <h2>
                    Other Income Details
                </h2>

                <table
                border="1"
                cellpadding="15"
                width="70%">

                    <tr>
                        <th>Details</th>
                        <td>${data.details || '-'}</td>
                    </tr>

                    <tr>
                        <th>Name</th>
                        <td>${data.name || '-'}</td>
                    </tr>

                    <tr>
                        <th>Mobile Number</th>
                        <td>${data.mobile || '-'}</td>
                    </tr>

                    <tr>
                        <th>Amount</th>
                        <td>₹${data.amount || '0'}</td>
                    </tr>

                    <tr>
                        <th>Payment Method</th>
                        <td>${data.payment_method || '-'}</td>
                    </tr>

                    <tr>
                        <th>Date</th>
                        <td>
                            ${
                                data.created_at
                                ? new Date(
                                    data.created_at
                                  ).toLocaleString()
                                : '-'
                            }
                        </td>
                    </tr>

                </table>

                
                <a href="/total-other-income">

                    <button>Back</button>

                </a>

            </div>

            </body>

            </html>

        `);

    });

});
// ==========================
// EDIT OTHER INCOME
// ==========================
app.get('/edit-other-income/:id', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM other_income
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.log(err);
            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if (result.length === 0) {
            return res.send('Other Income Not Found');
        }

        const data = result[0];

        let paymentNumber = '';

        if (data.payment_method === 'Cash') {
            paymentNumber = '1';
        }
        else if (data.payment_method === 'GPay') {
            paymentNumber = '2';
        }
        else if (
            data.payment_method ===
            'Account Number Transfer'
        ) {
            paymentNumber = '3';
        }

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    Edit Other Income
                </title>

                <link rel="stylesheet"
                href="/css/style.css">

                <style>

                    input {

                        width:100%;
                        padding:12px;
                        margin-top:15px;
                        border:1px solid #ccc;
                        border-radius:5px;
                        font-size:16px;
                        box-sizing:border-box;

                    }

                </style>

            </head>

            <body>

            <div class="container">

                <h2>
                    Edit Other Income
                </h2>

                <form
                action="/update-other-income/${data.id}"
                method="POST">

                    <input
                    type="text"
                    name="details"
                    value="${data.details || ''}"
                    placeholder="Enter Details"
                    required>

                    <input
                    type="text"
                    name="name"
                    value="${data.name || ''}"
                    placeholder="Enter Name"
                    required>

                    <input
                    type="text"
                    name="mobile"
                    value="${data.mobile || ''}"
                    placeholder="Enter Mobile Number"
                    required>

                    <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value="${data.amount || ''}"
                    placeholder="Enter Amount"
                    required>

                    <input
                    type="number"
                    name="payment_number"
                    id="payment_number"
                    value="${paymentNumber}"
                    placeholder="1=Cash, 2=GPay, 3=Account Number Transfer"
                    required>

                    <input
                    type="hidden"
                    name="payment_method"
                    id="final_payment_method"
                    value="${data.payment_method || ''}"
                    >

                    <br><br>

                    <button type="submit">
                        Save
                    </button>

                </form>

                

                <a href="/total-other-income">

                    <button>Back</button>

                </a>

            </div>

            <script>

                document
                .getElementById('payment_number')
                .addEventListener(
                    'input',
                    function(){

                        const value = this.value;

                        let finalPayment = '';

                        if(value == '1'){

                            finalPayment = 'Cash';

                        }
                        else if(value == '2'){

                            finalPayment = 'GPay';

                        }
                        else if(value == '3'){

                            finalPayment =
                            'Account Number Transfer';

                        }
                        else{

                            finalPayment = '';

                        }

                        document
                        .getElementById(
                            'final_payment_method'
                        )
                        .value = finalPayment;

                    }
                );

            </script>

            </body>

            </html>

        `);

    });

});
// ==========================
// UPDATE OTHER INCOME
// ==========================
app.post('/update-other-income/:id', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const id = req.params.id;

    const {
        details,
        name,
        mobile,
        amount,
        payment_method
    } = req.body;

    const oldSql = `
        SELECT *
        FROM other_income
        WHERE id=?
    `;

    db.query(oldSql, [id], (err, result) => {

        if (err) {
            console.log(err);
            console.error('[Error Occurred]: Old Data Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Old Data Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if (result.length === 0) {
            return res.send('Other Income Not Found');
        }

        const oldData = result[0];

        const oldAmount =
        Number(oldData.amount) || 0;

        const newAmount =
        Number(amount) || 0;

        const difference =
        newAmount - oldAmount;

        const updateSql = `
            UPDATE other_income
            SET
                details=?,
                name=?,
                mobile=?,
                amount=?,
                payment_method=?
            WHERE id=?
        `;

        db.query(
            updateSql,
            [
                details,
                name,
                mobile,
                newAmount,
                payment_method,
                id
            ],
            (err) => {

                if (err) {
                    console.log(err);
                    console.error('[Error Occurred]: Other Income Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Other Income Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                }

                // ADD DIFFERENCE TO BALANCE
                const balanceSql = `
                    UPDATE current_balance
                    SET amount = amount + ?
                    WHERE financial_year_id=?
                `;

                db.query(
                    balanceSql,
                    [
                        difference,
                        oldData.financial_year_id
                    ],
                    (err) => {

                        if (err) {
                            console.log(err);
                            console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                        }

                        res.send(`

                            <script>

                                alert(
                                    'Other Income Updated Successfully'
                                );

                                window.location.href =
                                '/total-other-income';

                            </script>

                        `);

                    }
                );

            }
        );

    });

});
// ==========================
// DELETE OTHER INCOME
// ==========================
app.get('/delete-other-income/:id', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM other_income
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.log(err);
            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if (result.length === 0) {
            return res.send(
                'Other Income Not Found'
            );
        }

        const data = result[0];

        const deleteSql = `
            DELETE FROM other_income
            WHERE id=?
        `;

        db.query(
            deleteSql,
            [id],
            (err) => {

                if (err) {
                    console.log(err);
                    console.error('[Error Occurred]: Delete Failed', typeof err !== 'undefined' ? err : ''); return res.send('Delete Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                }

                // REMOVE AMOUNT FROM BALANCE
                const balanceSql = `
                    UPDATE current_balance
                    SET amount = amount - ?
                    WHERE financial_year_id=?
                `;

                db.query(
                    balanceSql,
                    [
                        Number(data.amount) || 0,
                        data.financial_year_id
                    ],
                    (err) => {

                        if (err) {
                            console.log(err);
                            console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
                        }

                        res.redirect(
                            '/total-other-income'
                        );

                    }
                );

            }
        );

    });

});

app.get('/other-expenses', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    res.send(`

        <html>

        <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <title>Other Expense Entry</title>

            <link rel="stylesheet"
            href="/css/style.css">

            <style>

                form input,
                form select {

                    width:100%;
                    padding:12px;
                    margin-top:15px;
                    border:1px solid #ccc;
                    border-radius:5px;
                    font-size:16px;
                    box-sizing:border-box;

                }

            </style>

        </head>

        <body>

        <div class="container">

            <h2>
                Other Expense Entry
            </h2>

            <form
            action="/save-other-expense"
            method="POST">

                <input
                    type="text"
                    name="details"
                    placeholder="Enter Expense Details"
                    required
                >

                <input
                    type="number"
                    step="0.01"
                    name="amount"
                    placeholder="Enter Amount"
                    required
                >

<input
    type="number"
    name="payment_number"
    id="payment_number"
    placeholder="1=Cash, 2=GPay, 3=Account Number Transfer"
    min="1"
    max="3"
    required
>

<input
    type="hidden"
    name="payment_method"
    id="final_payment_method"
>
<script>

document
.getElementById('payment_number')
.addEventListener('input', function(){

    const value = this.value;

    let finalPayment = '';

    if(value == '1'){

        finalPayment = 'Cash';

    }
    else if(value == '2'){

        finalPayment = 'GPay';

    }
    else if(value == '3'){

        finalPayment =
        'Account Number Transfer';

    }
    else{

        finalPayment = '';

    }

    document
    .getElementById('final_payment_method')
    .value = finalPayment;

});

</script>

                <br>

                <button type="submit">
                    Save
                </button>

            </form>

            <br>

            <a href="/home">

                <button type="button">
                    Back
                </button>

            </a>

        </div>

        </body>

        </html>

    `);

});

app.post('/save-other-expense', (req, res) => {

    const {
        details,
        amount,
        payment_method
    } = req.body;

    const expenseAmount =
    parseFloat(amount);

    if (
        !details ||
        !expenseAmount ||
        expenseAmount <= 0 ||
        !payment_method
    ) {

        return res.send(`
            <script>

                alert('Please enter valid details');

                window.location.href =
                '/other-expenses';

            </script>
        `);

    }

    // GET SELECTED FINANCIAL YEAR

    const yearSql = `
        SELECT id, financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(
        yearSql,
        (err, yearResult) => {

            if (err) {

                console.log(err);

                console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

            }

            if (yearResult.length === 0) {

                return res.send(`
                    <script>

                        alert(
                            'No Financial Year Selected'
                        );

                        window.location.href =
                        '/home';

                    </script>
                `);

            }

            const financialYearId =
            yearResult[0].id;

            const financialYear =
            yearResult[0].financial_year;

            // GET CURRENT BALANCE

            const balanceSql = `
                SELECT amount
                FROM current_balance
                WHERE financial_year_id=?
            `;

            db.query(
                balanceSql,
                [financialYearId],
                (err, balanceResult) => {

                    if (err) {

                        console.log(err);

                        console.error('[Error Occurred]: Balance Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Balance Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                    }

                    if (balanceResult.length === 0) {

                        return res.send(
                            'Current Balance Record Missing'
                        );

                    }

                    const currentBalance =
                    parseFloat(
                        balanceResult[0].amount
                    ) || 0;

                    // CHECK BALANCE

                    if (
                        expenseAmount >
                        currentBalance
                    ) {

                        return res.send(`
                            <script>

                                alert(
                                    'Insufficient Balance'
                                );

                                window.location.href =
                                '/other-expenses';

                            </script>
                        `);

                    }

                    // INSERT OTHER EXPENSE

                    const insertSql = `
                        INSERT INTO other_expenses
                        (
                            financial_year_id,
                            financial_year,
                            details,
                            amount,
                            payment_method
                        )
                        VALUES (?,?,?,?,?)
                    `;

                    db.query(
                        insertSql,
                        [
                            financialYearId,
                            financialYear,
                            details,
                            expenseAmount,
                            payment_method
                        ],
                        (err, insertResult) => {

                            if (err) {

                                console.log(err);

                                console.error('[Error Occurred]: Other Expense Save Failed', typeof err !== 'undefined' ? err : ''); return res.send('Other Expense Save Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                            }

                            // UPDATE CURRENT BALANCE

                            const updateBalanceSql = `
                                UPDATE current_balance
                                SET amount = amount - ?
                                WHERE financial_year_id=?
                            `;

                            db.query(
                                updateBalanceSql,
                                [
                                    expenseAmount,
                                    financialYearId
                                ],
                                (err) => {

                                    if (err) {

                                        console.log(err);

                                        console.error('[Error Occurred]: Balance Update Failed', typeof err !== 'undefined' ? err : ''); return res.send('Balance Update Failed: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                                    }

                                    res.send(`

                                        <script>

                                            alert(
                                                'Other Expense Saved Successfully'
                                            );

                                            window.location.href =
                                            '/other-expenses';

                                        </script>

                                    `);

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});

app.get('/total-other-expenses', (req, res) => {

    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const yearSql = `
        SELECT id, financial_year
        FROM financial_years
        WHERE is_selected = true
        LIMIT 1
    `;

    db.query(yearSql, (err, yearResult) => {

        if (err) {
            console.log(err);
            console.error('[Error Occurred]: Database Error', typeof err !== 'undefined' ? err : ''); return res.send('Database Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));
        }

        if (yearResult.length === 0) {
            return res.send(`
                <script>
                    alert('No Financial Year Selected');
                    window.location.href='/home';
                </script>
            `);
        }

        const financialYearId =
        yearResult[0].id;

        const financialYear =
        yearResult[0].financial_year;

        // ==========================
        // BASE QUERY
        // ==========================

        let sql = `
            SELECT *
            FROM other_expenses
            WHERE financial_year_id=?
        `;

        let values = [financialYearId];

        // ==========================
        // DATE FILTER
        // ==========================

        if (req.query.date) {

            sql += `
                AND DATE(created_at)=?
            `;

            values.push(req.query.date);

        }

        // ==========================
        // DETAILS FILTER
        // ==========================

        if (req.query.details) {

            sql += `
                AND details LIKE ?
            `;

            values.push(
                '%' + req.query.details + '%'
            );

        }

        // ==========================
        // AMOUNT FILTER
        // ==========================

        if (req.query.amount) {

            sql += `
                AND amount=?
            `;

            values.push(
                req.query.amount
            );

        }

        // ==========================
        // PAYMENT METHOD FILTER
        // ==========================

        if (req.query.payment_method) {

            sql += `
                AND payment_method=?
            `;

            values.push(
                req.query.payment_method
            );

        }

        sql += `
            ORDER BY id ASC
        `;

        db.query(
            sql,
            values,
            (err, result) => {

                if (err) {

                    console.log(err);

                    console.error('[Error Occurred]: Other Expense Fetch Error', typeof err !== 'undefined' ? err : ''); return res.send('Other Expense Fetch Error: ' + (typeof err !== 'undefined' && err && err.message ? err.message : ''));

                }

                let rows = '';

                let total = 0;

                result.forEach((data, index) => {

                    total += Number(data.amount);

                    rows += `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${data.details}
                            </td>

                            <td>
                                ₹${Number(data.amount).toFixed(2)}
                            </td>

                            <td>
                                ${data.payment_method}
                            </td>

                            <td class="no-print">

                                <div style="
                                    display:flex;
                                    gap:10px;
                                    justify-content:center;
                                    flex-wrap:wrap;
                                ">

                                    <a
                                    href="/view-other-expense/${data.id}">

                                        <button type="button">
                                            View
                                        </button>

                                    </a>

                                    <a
                                    href="/edit-other-expense/${data.id}">

                                        <button type="button">
                                            Edit
                                        </button>

                                    </a>

                                    <a
                                    href="/delete-other-expense/${data.id}"

                                    onclick="
                                    return confirm(
                                    'Delete this other expense?'
                                    );
                                    ">

                                        <button type="button">
                                            Delete
                                        </button>

                                    </a>

                                </div>

                            </td>

                        </tr>

                    `;

                });

                res.send(`

                    <html>

                    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                        <title>
                            Total Other Expenses
                        </title>

                        <link
                        rel="stylesheet"
                        href="/css/style.css">

                        <style>

                            #filterBox input,
                            #filterBox select {

                                width:100%;
                                padding:12px;
                                margin-top:5px;
                                border:1px solid #ccc;
                                border-radius:5px;
                                font-size:16px;
                                box-sizing:border-box;
                                background:white;

                            }

                            table {

                                border-collapse:collapse;

                            }

                            th,
                            td {

                                text-align:center;

                            }

                            @media print {

                                .no-print,
                                #filterBox,
                                button,
                                a {

                                    display:none !important;

                                }

                                table {

                                    width:100%;
                                    border-collapse:collapse;

                                }

                                body {

                                    margin:0;
                                    padding:0;

                                }

                            }

                        </style>

                    </head>

                    <body>

                    <div
                    class="container"
                    style="width:95%;">

                        <h2>
                            Total Other Expenses
                        </h2>

                        <h3>
                            Financial Year :
                            ${financialYear}
                        </h3>


                        <!-- FILTER BUTTON -->

                        <div
                        class="no-print"
                        style="
                            display:flex;
                            justify-content:flex-end;
                            width:100%;
                            margin-bottom:20px;
                        ">

                            <button
                            type="button"
                            onclick="toggleFilter()">

                                Filter

                            </button>

                        </div>


                        <!-- FILTER BOX -->

                        <div
                        id="filterBox"
                        class="no-print"
                        style="
                            display:none;
                            border:1px solid #ccc;
                            padding:20px;
                            border-radius:10px;
                            margin-bottom:20px;
                        ">

                            <form
                            method="GET"
                            action="/total-other-expenses">

                                <div style="
                                    display:grid;
                                    grid-template-columns:
                                    repeat(
                                        auto-fit,
                                        minmax(200px,1fr)
                                    );
                                    gap:15px;
                                ">


                                    <!-- DATE -->

                                    <div>

                                        <label>
                                            Date
                                        </label>

                                        <input
                                        type="date"
                                        name="date"
                                        value="${
                                            req.query.date || ''
                                        }">

                                    </div>


                                    <!-- DETAILS -->

                                    <div>

                                        <label>
                                            Details
                                        </label>

                                        <input
                                        type="text"
                                        name="details"
                                        placeholder="Enter Details"
                                        value="${
                                            req.query.details || ''
                                        }">

                                    </div>


                                    <!-- AMOUNT -->

                                    <div>

                                        <label>
                                            Amount
                                        </label>

                                        <input
                                        type="number"
                                        step="0.01"
                                        name="amount"
                                        placeholder="Enter Amount"
                                        value="${
                                            req.query.amount || ''
                                        }">

                                    </div>


                                    <!-- PAYMENT METHOD -->

                                    <div>

                                        <label>
                                            Payment Method
                                        </label>

                                        <select
                                        name="payment_method">

                                            <option value="">
                                                All
                                            </option>

                                            <option
                                            value="Cash"
                                            ${
                                            req.query.payment_method ===
                                            'Cash'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Cash

                                            </option>

                                            <option
                                            value="GPay"
                                            ${
                                            req.query.payment_method ===
                                            'GPay'
                                            ? 'selected'
                                            : ''
                                            }>

                                                GPay

                                            </option>

                                            <option
                                            value="Account Number Transfer"
                                            ${
                                            req.query.payment_method ===
                                            'Account Number Transfer'
                                            ? 'selected'
                                            : ''
                                            }>

                                                Account Number Transfer

                                            </option>

                                        </select>

                                    </div>

                                </div>


                                <br>


                                <div style="
                                    display:flex;
                                    justify-content:center;
                                    gap:20px;
                                ">

                                    <button
                                    type="submit">

                                        Apply Filter

                                    </button>


                                    <a
                                    href="/total-other-expenses">

                                        <button
                                        type="button">

                                            Clear

                                        </button>

                                    </a>

                                </div>

                            </form>

                        </div>


                        <!-- TABLE -->

                        <table
                        border="1"
                        width="100%"
                        cellpadding="10">

                            <tr>

                                <th>
                                    S.No
                                </th>

                                <th>
                                    Details
                                </th>

                                <th>
                                    Amount
                                </th>

                                <th>
                                    Payment Method
                                </th>

                                <th class="no-print">
                                    Actions
                                </th>

                            </tr>

                            ${rows}

                        </table>


                        <br>


                        <!-- GRAND TOTAL -->

                        <h2>

                            Grand Total :
                            ₹${total.toFixed(2)}

                        </h2>


                        <br>


                        <!-- BACK + PRINT -->

                        <div
                        class="no-print"
                        style="
                            display:flex;
                            justify-content:center;
                            gap:15px;
                            margin-top:20px;
                        ">

                            <a
                            href="/home"
                            style="text-decoration:none;">

                                <button
                                type="button"
                                style="
                                    width:140px;
                                    height:45px;
                                ">

                                    Back

                                </button>

                            </a>


                            <button
                            type="button"
                            onclick="window.print()"
                            style="
                                width:140px;
                                height:45px;
                            ">

                                Print

                            </button>

                        </div>

                    </div>


                    <script>

                        function toggleFilter() {

                            const box =
                            document.getElementById(
                                'filterBox'
                            );

                            if (
                                box.style.display === 'none' ||
                                box.style.display === ''
                            ) {

                                box.style.display = 'block';

                            }
                            else {

                                box.style.display = 'none';

                            }

                        }

                    </script>

                    </body>

                    </html>

                `);

            }

        );

    });

});

app.get('/view-other-expense/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM other_expenses
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) throw err;

        if (result.length === 0) {
            return res.send('Other Expense Not Found');
        }

        const data = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    View Other Expense
                </title>

                <link
                rel="stylesheet"
                href="/css/style.css">

            </head>

            <body>

            <div class="container">

                <h2>
                    Other Expense Details
                </h2>

                <table
                border="1"
                cellpadding="15"
                width="60%">

                    <tr>

                        <th>
                            Details
                        </th>

                        <td>
                            ${data.details}
                        </td>

                    </tr>

                    <tr>

                        <th>
                            Amount
                        </th>

                        <td>
                            ₹${Number(data.amount).toFixed(2)}
                        </td>

                    </tr>

                    <tr>

                        <th>
                            Payment Method
                        </th>

                        <td>
                            ${data.payment_method}
                        </td>

                    </tr>

                    <tr>

                        <th>
                            Date
                        </th>

                        <td>
                            ${new Date(
                                data.created_at
                            ).toLocaleString()}
                        </td>

                    </tr>

                </table>

                <br>

                <a href="/total-other-expenses">

                    <button>
                        Back
                    </button>

                </a>

            </div>

            </body>

            </html>

        `);

    });

});
app.get('/edit-other-expense/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM other_expenses
        WHERE id=?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) throw err;

        if (result.length === 0) {
            return res.send('Other Expense Not Found');
        }

        const data = result[0];

        res.send(`

            <html>

            <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>
                    Edit Other Expense
                </title>

                <link
                rel="stylesheet"
                href="/css/style.css">

                <style>

                    input,
                    select {

                        width:100%;
                        padding:12px;
                        margin-top:15px;
                        border:1px solid #ccc;
                        border-radius:5px;
                        font-size:16px;
                        box-sizing:border-box;

                    }

                </style>

            </head>

            <body>

            <div class="container">

                <h2>
                    Edit Other Expense
                </h2>

                <form
                action="/update-other-expense/${data.id}"
                method="POST">

                    <input
                    type="text"
                    name="details"
                    value="${data.details}"
                    required>


                    <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value="${data.amount}"
                    required>


                    <input
                    type="number"
                    name="payment_number"
                    id="payment_number"
                    min="1"
                    max="3"
                    value="${
                        data.payment_method === 'Cash'
                        ? '1'
                        : data.payment_method === 'GPay'
                        ? '2'
                        : data.payment_method ===
                        'Account Number Transfer'
                        ? '3'
                        : ''
                    }"
                    placeholder="Enter Payment Method Number"
                    required>


                    <input
                    type="hidden"
                    name="payment_method"
                    id="final_payment_method"
                    value="${data.payment_method}">

                    <button
                    type="submit">

                        Save

                    </button>

                </form>

                <br>

                <a href="/total-other-expenses">

                    <button type="button">
                        Back
                    </button>

                </a>

            </div>


            <script>

                document
                .getElementById('payment_number')
                .addEventListener(
                    'input',
                    function() {

                        const value = this.value;

                        let finalPayment = '';

                        if (value == '1') {

                            finalPayment = 'Cash';

                        }
                        else if (value == '2') {

                            finalPayment = 'GPay';

                        }
                        else if (value == '3') {

                            finalPayment =
                            'Account Number Transfer';

                        }

                        document
                        .getElementById(
                            'final_payment_method'
                        )
                        .value = finalPayment;

                    }
                );

            </script>

            </body>

            </html>

        `);

    });

});
app.post('/update-other-expense/:id', (req, res) => {

    const id = req.params.id;

    const {
        details,
        amount,
        payment_method
    } = req.body;

    const newAmount =
    Number(amount);

    const oldSql = `
        SELECT *
        FROM other_expenses
        WHERE id=?
    `;

    db.query(
        oldSql,
        [id],
        (err, oldResult) => {

            if (err) throw err;

            if (oldResult.length === 0) {
                return res.send(
                    'Other Expense Not Found'
                );
            }

            const oldData =
            oldResult[0];

            const oldAmount =
            Number(oldData.amount);

            // New - Old
            const difference =
            newAmount - oldAmount;

            // If expense increased,
            // balance must be sufficient.

            if (difference > 0) {

                const balanceSql = `
                    SELECT amount
                    FROM current_balance
                    WHERE financial_year_id=?
                `;

                db.query(
                    balanceSql,
                    [oldData.financial_year_id],
                    (err, balanceResult) => {

                        if (err) throw err;

                        const balance =
                        Number(
                            balanceResult[0].amount
                        );

                        if (difference > balance) {

                            return res.send(`
                                <script>

                                    alert(
                                    'Insufficient Balance'
                                    );

                                    window.location.href =
                                    '/edit-other-expense/${id}';

                                </script>
                            `);

                        }

                        updateOtherExpense();

                    }
                );

            }
            else {

                updateOtherExpense();

            }


            function updateOtherExpense() {

                const updateSql = `
                    UPDATE other_expenses
                    SET
                        details=?,
                        amount=?,
                        payment_method=?
                    WHERE id=?
                `;

                db.query(
                    updateSql,
                    [
                        details,
                        newAmount,
                        payment_method,
                        id
                    ],
                    (err) => {

                        if (err) throw err;

                        const balanceSql = `
                            UPDATE current_balance
                            SET amount = amount - ?
                            WHERE financial_year_id=?
                        `;

                        db.query(
                            balanceSql,
                            [
                                difference,
                                oldData.financial_year_id
                            ],
                            (err) => {

                                if (err) throw err;

                                res.redirect(
                                    '/total-other-expenses'
                                );

                            }
                        );

                    }
                );

            }

        }
    );

});
app.get('/delete-other-expense/:id', (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM other_expenses
        WHERE id=?
    `;

    db.query(
        sql,
        [id],
        (err, result) => {

            if (err) throw err;

            if (result.length === 0) {

                return res.send(
                    'Other Expense Not Found'
                );

            }

            const data =
            result[0];

            // DELETE RECORD

            db.query(
                `DELETE FROM other_expenses
                 WHERE id=?`,
                [id],
                (err) => {

                    if (err) throw err;

                    // ADD AMOUNT BACK

                    const balanceSql = `
                        UPDATE current_balance
                        SET amount = amount + ?
                        WHERE financial_year_id=?
                    `;

                    db.query(
                        balanceSql,
                        [
                            Number(data.amount),
                            data.financial_year_id
                        ],
                        (err) => {

                            if (err) throw err;

                            res.redirect(
                                '/total-other-expenses'
                            );

                        }
                    );

                }
            );

        }
    );

});

// LOGOUT
app.get('/logout', (req, res) => {

    req.session.destroy(() => {
        res.redirect('/');
    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

