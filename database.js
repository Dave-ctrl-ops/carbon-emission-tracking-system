const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('carbon.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS emissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vehicle_type TEXT,
    distance REAL,
    electricity REAL,
    total_co2 REAL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT UNIQUE NOT NULL,
    emission_kg REAL NOT NULL
  );
`);

// Seed data
const seed = () => {
  // Seed User
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('carbon', 10);
    const insertUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    insertUser.run('admin', hash);
    console.log('Seeded admin user.');
  }

  // Seed Vehicles
  const vehicleCount = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
  if (vehicleCount === 0) {
    const insertVehicle = db.prepare('INSERT INTO vehicles (plate_number, emission_kg) VALUES (?, ?)');
    insertVehicle.run('KA01AB1234', 6.2);
    insertVehicle.run('MH20XY5678', 4.8);
    insertVehicle.run('DL05PQ1111', 8.3);
    console.log('Seeded vehicles.');
  }
};

seed();

module.exports = db;
