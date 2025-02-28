const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("../Database.db");

db.serialize(() => {
  db.run(`
      CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    credits INTEGER DEFAULT 20,
    
    last_reset DATETIME DEFAULT CURRENT_TIMESTAMP
  )
    `);

  db.run(`
        CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
    `);

  db.run(`
      
    CREATE TABLE credit_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
        `);

  db.run(
    `
        CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'scan', 'credit_request', 'login', etc.
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
        `
  );
});

// Close the database connection when done
db.close();
