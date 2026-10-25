CREATE DATABASE IF NOT EXISTS carbon_db;
USE carbon_db;

CREATE TABLE IF NOT EXISTS Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Vehicle_Types (
    vehicle_type_id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL,
    emission_factor FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS Vehicles (
    vehicle_id INT PRIMARY KEY AUTO_INCREMENT,
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type_id INT DEFAULT 1,
    owner_name VARCHAR(255),
    dob DATE,
    valid_till DATE,
    profile_image VARCHAR(255),
    FOREIGN KEY (vehicle_type_id) REFERENCES Vehicle_Types(vehicle_type_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Emission_Records (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    vehicle_id INT,
    distance FLOAT,
    electricity_kwh FLOAT,
    total_emission FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Tracking_History (
    tracking_id INT PRIMARY KEY AUTO_INCREMENT,
    plate_number VARCHAR(50) NOT NULL,
    emission FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default vehicle type if not exists
INSERT IGNORE INTO Vehicle_Types (vehicle_type_id, type, emission_factor) VALUES (1, 'petrol', 0.192);

-- Required ALTER statement (for existing database)
-- ALTER TABLE Emission_Records ADD COLUMN electricity_kwh FLOAT AFTER distance;
