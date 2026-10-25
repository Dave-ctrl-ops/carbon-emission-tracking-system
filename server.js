require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const db = new Database('carbon.db');

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS Vehicles (
    vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT UNIQUE NOT NULL,
    owner_name TEXT NOT NULL,
    vehicle_type TEXT CHECK(vehicle_type IN ('petrol','diesel')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Vehicle_Types (
    vehicle_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    emission_factor REAL
  );

  CREATE TABLE IF NOT EXISTS Emission_Records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vehicle_id INTEGER NOT NULL,
    distance REAL NOT NULL,
    mileage REAL NOT NULL,
    fuel_used REAL NOT NULL,
    co2_emission REAL NOT NULL,
    status TEXT CHECK(status IN ('PASS','FAIL')) NOT NULL,
    validity TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
  );

  CREATE TABLE IF NOT EXISTS Tracking_History (
    tracking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    plate_number TEXT,
    emission REAL,
    status TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure 'status' column exists
try {
  db.prepare("ALTER TABLE Emission_Records ADD COLUMN status TEXT").run();
  console.log("Migration: Added status column to Emission_Records");
} catch (e) {}

try {
  db.prepare("ALTER TABLE Emission_Records ADD COLUMN mileage REAL").run();
  console.log("Migration: Added mileage column to Emission_Records");
} catch (e) {}

try {
  db.prepare("ALTER TABLE Emission_Records ADD COLUMN fuel_used REAL").run();
  console.log("Migration: Added fuel_used column to Emission_Records");
} catch (e) {}

try {
  db.prepare("ALTER TABLE Tracking_History ADD COLUMN status TEXT").run();
  console.log("Migration: Added status column to Tracking_History");
} catch (e) {}

const usedNames = new Set();

function generateRandomOwnerName() {
  const firstNames = [
    "Rahul","Amit","Karthik","Vikram","Arjun","Rohit",
    "Ananya","Priya","Sneha","Aisha","Neha","Pooja"
  ];

  const lastNames = [
    "Sharma","Reddy","Shetty","Verma","Nair","Rao",
    "Gupta","Iyer","Patel","Khan","Singh","Das"
  ];

  let name;
  let attempts = 0;

  do {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    name = `${first} ${last}`;
    attempts++;
  } while (usedNames.has(name) && attempts < 50);

  usedNames.add(name);

  if (usedNames.size > 100) {
    usedNames.clear();
  }

  return name;
}

// Seed Data
const seedData = () => {
  // Cleanup dummy data
  db.prepare(
    "DELETE FROM Emission_Records WHERE vehicle_id IN (SELECT vehicle_id FROM Vehicles WHERE plate_number LIKE 'TEST%')"
  ).run();

  db.prepare(
    "DELETE FROM Vehicles WHERE plate_number LIKE 'TEST%'"
  ).run();

  const typeCount = db.prepare(
    'SELECT COUNT(*) as count FROM Vehicle_Types'
  ).get();

  if (typeCount.count === 0) {
    db.prepare(
      "INSERT INTO Vehicle_Types (type, emission_factor) VALUES ('petrol', 0.192)"
    ).run();

    db.prepare(
      "INSERT INTO Vehicle_Types (type, emission_factor) VALUES ('diesel', 0.171)"
    ).run();
  }

  // Update existing legacy users
  try {
    db.prepare(
      "UPDATE Users SET username = 'KA01AB1234' WHERE username = 'user1'"
    ).run();
  } catch (e) {}

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;
  const defaultUserPassword = process.env.DEFAULT_USER_PASSWORD;

  if (!adminPassword || !defaultUserPassword) {
    console.error(
      'Missing ADMIN_PASSWORD or DEFAULT_USER_PASSWORD in .env'
    );
    process.exit(1);
  }

  const isBcryptHash = (value) =>
    typeof value === 'string' &&
    /^\$2[aby]\$\d{2}\$/.test(value);

  const hashPassword = (password) =>
    bcrypt.hashSync(password, 10);

  // Create or migrate the admin account
  let adminUser = db.prepare(
    'SELECT * FROM Users WHERE username = ?'
  ).get(adminUsername);

  if (!adminUser) {
    db.prepare(
      'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)'
    ).run(
      adminUsername,
      hashPassword(adminPassword),
      'admin'
    );
  } else {
    const passwordNeedsMigration =
      !isBcryptHash(adminUser.password);

    const passwordIsValid =
      !passwordNeedsMigration &&
      bcrypt.compareSync(
        adminPassword,
        adminUser.password
      );

    if (
      passwordNeedsMigration ||
      !passwordIsValid ||
      adminUser.role !== 'admin'
    ) {
      db.prepare(
        'UPDATE Users SET password = ?, role = ? WHERE username = ?'
      ).run(
        hashPassword(adminPassword),
        'admin',
        adminUsername
      );
    }
  }

  // Create or migrate the default vehicle user
  const defaultUsername = 'KA01AB1234';

  let defaultUser = db.prepare(
    'SELECT * FROM Users WHERE username = ?'
  ).get(defaultUsername);

  if (!defaultUser) {
    db.prepare(
      'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)'
    ).run(
      defaultUsername,
      hashPassword(defaultUserPassword),
      'user'
    );
  } else {
    const passwordNeedsMigration =
      !isBcryptHash(defaultUser.password);

    const passwordIsValid =
      !passwordNeedsMigration &&
      bcrypt.compareSync(
        defaultUserPassword,
        defaultUser.password
      );

    if (
      passwordNeedsMigration ||
      !passwordIsValid ||
      defaultUser.role !== 'user'
    ) {
      db.prepare(
        'UPDATE Users SET password = ?, role = ? WHERE username = ?'
      ).run(
        hashPassword(defaultUserPassword),
        'user',
        defaultUsername
      );
    }
  }

  // Seed realistic vehicles if they don't exist
  const plates = [
    'KA01AB1234',
    'MH20XY5678'
  ];

  plates.forEach(plate => {
    const exists = db.prepare(
      'SELECT * FROM Vehicles WHERE plate_number = ?'
    ).get(plate);

    if (!exists) {
      const owner_name = generateRandomOwnerName();

      db.prepare(
        "INSERT INTO Vehicles (plate_number, vehicle_type, owner_name) VALUES (?, ?, ?)"
      ).run(
        plate,
        'petrol',
        owner_name
      );

      console.log(`Seeded vehicle: ${plate}`);
    }
  });
};

seedData();

// POST API: /login
app.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const adminUsername =
      process.env.ADMIN_USERNAME || 'admin';

    const adminPassword =
      process.env.ADMIN_PASSWORD;

    const defaultUserPassword =
      process.env.DEFAULT_USER_PASSWORD;

    if (!adminPassword || !defaultUserPassword) {
      return res.status(500).json({
        success: false,
        message: 'Authentication configuration is missing'
      });
    }

    // Admin login
    if (username === adminUsername) {
      const user = db.prepare(
        'SELECT user_id, password FROM Users WHERE username = ? AND role = ?'
      ).get(
        adminUsername,
        'admin'
      );

      if (
        !user ||
        !bcrypt.compareSync(password, user.password)
      ) {
        return res.json({
          success: false,
          message: 'Invalid admin password'
        });
      }

      return res.json({
        success: true,
        role: 'admin',
        user_id: user.user_id
      });
    }

    const cleanPlate = username
      .toUpperCase()
      .replace(/\s+/g, '');

    let vehicle = db.prepare(
      'SELECT * FROM Vehicles WHERE plate_number = ?'
    ).get(cleanPlate);

    if (!vehicle) {
      return res.json({
        success: false,
        message: 'Vehicle not found. Please check your number plate.'
      });
    }

    let user = db.prepare(
      'SELECT * FROM Users WHERE username = ?'
    ).get(cleanPlate);

    let userId;

    if (user) {
      if (!bcrypt.compareSync(password, user.password)) {
        return res.json({
          success: false,
          message: 'Invalid password'
        });
      }

      userId = user.user_id;
    } else {
      if (password !== defaultUserPassword) {
        return res.json({
          success: false,
          message: 'Invalid password'
        });
      }

      const insertUser = db.prepare(
        'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)'
      ).run(
        cleanPlate,
        bcrypt.hashSync(defaultUserPassword, 10),
        'user'
      );

      userId = insertUser.lastInsertRowid;
    }

    res.json({
      success: true,
      role: 'user',
      plate_number: cleanPlate,
      user_id: userId
    });

  } catch (error) {
    console.error('Error during login:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper to ensure vehicle has all required metadata
function ensureVehicleData(vehicleId) {
  const vehicle = db.prepare(
    'SELECT * FROM Vehicles WHERE vehicle_id = ?'
  ).get(vehicleId);

  if (!vehicle) return null;

  let updates = [];
  let values = [];

  // Update placeholder names or empty names
  if (
    !vehicle.owner_name ||
    vehicle.owner_name === 'New Owner' ||
    vehicle.owner_name === 'John Doe'
  ) {
    const name = generateRandomOwnerName();

    updates.push('owner_name = ?');
    values.push(name);
  }

  if (updates.length > 0) {
    values.push(vehicleId);

    db.prepare(
      `UPDATE Vehicles SET ${updates.join(', ')} WHERE vehicle_id = ?`
    ).run(...values);

    return db.prepare(
      'SELECT * FROM Vehicles WHERE vehicle_id = ?'
    ).get(vehicleId);
  }

  return vehicle;
}

// POST API: /calculate
app.post('/calculate', (req, res) => {
  try {
    const {
      plate_number,
      distance,
      mileage,
      vehicle_type,
      role,
      session_plate,
      user_id
    } = req.body;

    if (
      !plate_number ||
      distance === undefined ||
      mileage === undefined
    ) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    if (distance <= 0 || mileage <= 0) {
      return res.status(400).json({
        error: 'Distance and mileage must be greater than 0'
      });
    }

    // Role-based restriction
    if (
      role === 'user' &&
      session_plate &&
      plate_number
        .toUpperCase()
        .replace(/\s+/g, '') !==
      session_plate
        .toUpperCase()
        .replace(/\s+/g, '')
    ) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Normalize plate number
    const cleanPlate = plate_number
      .toUpperCase()
      .replace(/\s+/g, '');

    // Check if vehicle exists
    let vehicle = db.prepare(
      'SELECT * FROM Vehicles WHERE plate_number = ?'
    ).get(cleanPlate);

    let vehicleId;

    if (vehicle) {
      vehicleId = vehicle.vehicle_id;
    } else {
      const vType =
        vehicle_type === 'diesel'
          ? 'diesel'
          : 'petrol';

      const owner_name =
        generateRandomOwnerName();

      const insertResult = db.prepare(
        'INSERT INTO Vehicles (plate_number, vehicle_type, owner_name) VALUES (?, ?, ?)'
      ).run(
        cleanPlate,
        vType,
        owner_name
      );

      vehicleId = insertResult.lastInsertRowid;
    }

    ensureVehicleData(vehicleId);

    // Calculate emission using fuel-based model
    const fuel_used = distance / mileage;

    const emissionFactor =
      vehicle_type === 'diesel'
        ? 2.68
        : 2.31;

    const co2_emission =
      fuel_used * emissionFactor;

    const status =
      co2_emission < 5
        ? 'PASS'
        : 'FAIL';

    const validity =
      status === 'PASS'
        ? 'Valid for 6 months'
        : 'Not issued';

    // Store in Emission_Records
    db.prepare(`
      INSERT INTO Emission_Records
      (user_id, vehicle_id, distance, mileage, fuel_used, co2_emission, status, validity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user_id || null,
      vehicleId,
      distance,
      mileage,
      fuel_used,
      co2_emission,
      status,
      validity
    );

    // Store in Tracking_History
    db.prepare(`
      INSERT INTO Tracking_History
      (vehicle_id, plate_number, emission, status)
      VALUES (?, ?, ?, ?)
    `).run(
      vehicleId,
      cleanPlate,
      co2_emission,
      status
    );

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error(
      'Error processing /calculate:',
      error
    );

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET API: /api/latest-status
app.get('/api/latest-status', (req, res) => {
  try {
    const {
      role,
      session_plate
    } = req.query;

    if (
      role !== 'user' ||
      !session_plate
    ) {
      return res.status(403).json({
        error: 'Access denied: User session required'
      });
    }

    const cleanPlate = session_plate
      .toUpperCase()
      .replace(/\s+/g, '');

    const vehicle = db.prepare(
      'SELECT * FROM Vehicles WHERE plate_number = ?'
    ).get(cleanPlate);

    if (!vehicle) {
      return res.json({
        found: false,
        message: 'Vehicle not found'
      });
    }

    const latestRecord = db.prepare(`
      SELECT co2_emission, status, validity, timestamp
      FROM Emission_Records
      WHERE vehicle_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(vehicle.vehicle_id);

    if (!latestRecord) {
      return res.json({
        found: false,
        message: 'No records available'
      });
    }

    res.json({
      found: true,
      plate_number: cleanPlate,
      co2_emission: latestRecord.co2_emission,
      status: latestRecord.status,
      validity: latestRecord.validity,
      last_inspection: latestRecord.timestamp
    });

  } catch (error) {
    console.error(
      'Error fetching latest status:',
      error
    );

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET API: /track/:plate_number
app.get('/track/:plate_number', (req, res) => {
  try {
    const cleanPlate = req.params.plate_number
      .toUpperCase()
      .replace(/\s+/g, '');

    const {
      role,
      session_plate
    } = req.query;

    // Role-based restriction: Users ONLY get their own session data
    if (
      role === 'user' &&
      session_plate
    ) {
      const targetSession = session_plate
        .toUpperCase()
        .replace(/\s+/g, '');

      if (cleanPlate !== targetSession) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
    }

    // Find vehicle
    const existingVehicle = db.prepare(
      'SELECT * FROM Vehicles WHERE plate_number = ?'
    ).get(cleanPlate);

    if (!existingVehicle) {
      return res.json({
        found: false,
        message: 'No emission data yet'
      });
    }

    const vehicleId =
      existingVehicle.vehicle_id;

    // Fetch LATEST emission from Emission_Records
    const latestRecord = db.prepare(`
      SELECT co2_emission, status, mileage, fuel_used, validity
      FROM Emission_Records
      WHERE vehicle_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(vehicleId);

    if (!latestRecord) {
      return res.json({
        found: false,
        message: 'No emission data yet'
      });
    }

    // Ensure data exists and is stored permanently
    const finalVehicle =
      ensureVehicleData(vehicleId);

    // Fetch HISTORY from Tracking_History
    const history = db.prepare(`
      SELECT tracking_id, emission, status, timestamp
      FROM Tracking_History
      WHERE plate_number = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(cleanPlate);

    res.json({
      found: true,
      plate_number: cleanPlate,
      owner_name: finalVehicle.owner_name,
      dob: 'N/A',
      valid_till: 'N/A',
      vehicle_type:
        finalVehicle.vehicle_type === 'diesel'
          ? 'Diesel'
          : 'Petrol',
      profile_image: '/images/logo.png',
      co2_emission:
        latestRecord.co2_emission,
      mileage:
        latestRecord.mileage,
      fuel_used:
        latestRecord.fuel_used,
      status:
        latestRecord.status,
      timestamp:
        latestRecord.timestamp,
      validity:
        latestRecord.validity,
      category:
        latestRecord.status === 'PASS'
          ? 'Low'
          : 'High',
      history: history,
      message:
        'Latest emission and history fetched'
    });

  } catch (error) {
    console.error(
      'Error processing /track request:',
      error
    );

    res.status(500).json({
      error:
        'Internal server error while processing tracking data'
    });
  }
});

// GET API: /report
app.get('/report', (req, res) => {
  try {
    const {
      plate_number,
      role,
      session_plate
    } = req.query;

    // Role-based restriction: Users ONLY get their own session data
    const targetPlate =
      (role === 'user' && session_plate)
        ? session_plate
        : plate_number;

    if (!targetPlate) {
      return res.status(400).json({
        error: 'Plate number is required'
      });
    }

    const cleanPlate = targetPlate
      .toUpperCase()
      .replace(/\s+/g, '');

    const existingVehicle = db.prepare(
      'SELECT * FROM Vehicles WHERE plate_number = ?'
    ).get(cleanPlate);

    if (!existingVehicle) {
      return res.json({
        found: false,
        message: 'No report data available'
      });
    }

    const latestRecord = db.prepare(`
      SELECT co2_emission, status, timestamp
      FROM Emission_Records
      WHERE vehicle_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(existingVehicle.vehicle_id);

    if (!latestRecord) {
      return res.json({
        found: false,
        message: 'No report data available'
      });
    }

    res.json({
      found: true,
      report: {
        plate_number: cleanPlate,
        co2_emission:
          latestRecord.co2_emission,
        status:
          latestRecord.status,
        timestamp:
          latestRecord.timestamp
      }
    });

  } catch (error) {
    console.error(
      'Error processing /report request:',
      error
    );

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET API: /history
app.get('/history', (req, res) => {
  try {
    const {
      plate_number,
      all,
      role,
      session_plate
    } = req.query;

    let query = `
      SELECT
        er.record_id,
        v.plate_number,
        er.co2_emission,
        er.status,
        er.timestamp
      FROM Emission_Records er
      JOIN Vehicles v
        ON er.vehicle_id = v.vehicle_id
    `;

    let params = [];

    // Role-based restriction for User
    if (
      role === 'user' &&
      session_plate
    ) {
      query += `
        WHERE v.plate_number = ?
      `;

      params.push(
        session_plate
          .toUpperCase()
          .replace(/\s+/g, '')
      );

    } else if (
      all !== 'true' &&
      plate_number
    ) {
      const cleanPlate =
        plate_number
          .toUpperCase()
          .replace(/\s+/g, '');

      query += `
        WHERE v.plate_number = ?
      `;

      params.push(cleanPlate);
    }

    query += `
      ORDER BY er.timestamp DESC
      LIMIT 10
    `;

    const records =
      db.prepare(query).all(...params);

    res.json({
      found: records.length > 0,
      records
    });

  } catch (error) {
    console.error(
      'Error processing /history request:',
      error
    );

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// DELETE API: /delete-record/:id
app.delete('/delete-record/:id', (req, res) => {
  try {
    const { id } = req.params;

    const role =
      req.body.role ||
      req.query.role;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message:
          'Unauthorized: Admin access required'
      });
    }

    // Delete from Emission_Records
    const result = db.prepare(
      'DELETE FROM Emission_Records WHERE record_id = ?'
    ).run(id);

    // Also attempt to delete from Tracking_History if it matches
    db.prepare(
      'DELETE FROM Tracking_History WHERE tracking_id = ?'
    ).run(id);

    if (result.changes > 0) {
      res.json({
        success: true,
        message:
          'Record deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

  } catch (error) {
    console.error(
      'Error deleting record:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Failed to delete record'
    });
  }
});

// DELETE API: /delete-vehicle/:plate_number
app.delete('/delete-vehicle/:plate_number', (req, res) => {
  try {
    const { plate_number } = req.params;

    const role =
      req.body.role ||
      req.query.role;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const cleanPlate =
      plate_number
        .toUpperCase()
        .replace(/\s+/g, '');

    const vehicle = db.prepare(
      'SELECT vehicle_id FROM Vehicles WHERE plate_number = ?'
    ).get(cleanPlate);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    db.prepare(
      'DELETE FROM Emission_Records WHERE vehicle_id = ?'
    ).run(vehicle.vehicle_id);

    db.prepare(
      'DELETE FROM Tracking_History WHERE vehicle_id = ?'
    ).run(vehicle.vehicle_id);

    res.json({
      success: true
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(
    `Server is running on http://localhost:${PORT}`
  );
});