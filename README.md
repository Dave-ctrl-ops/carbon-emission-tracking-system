Carbon Emission Tracking System

A full-stack web application for tracking vehicle carbon emissions based on distance, mileage, and fuel type.



Features:

\- Admin and vehicle-user authentication

\- Vehicle emission calculation

\- CO₂ emission tracking and history

\- Vehicle status and report generation

\- SQLite database

\- REST API

\- Input validation

\- Password hashing with bcrypt

\- Automated database setup



Tech Stack:

\- Node.js

\- Express.js

\- SQLite

\- JavaScript

\- Bootstrap

\- bcryptjs



Run Locally:

npm install

node server.js



Open:

http://localhost:3000



Environment Variables:

Create a `.env` file:

PORT=3000

SESSION\_SECRET=your\_session\_secret

ADMIN\_USERNAME=admin

ADMIN\_PASSWORD=your\_admin\_password

DEFAULT\_USER\_PASSWORD=your\_default\_user\_password

Do not commit `.env` or `carbon.db` to the repository.

