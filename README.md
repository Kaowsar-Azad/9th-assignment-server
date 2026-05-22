# Adopets Backend Server

This is the backend REST API server for the **Adopets** Pet Adoption Platform.

## Purpose
The server handles authentication token verification (via JWT/Better Auth integration), stores and manages adoptable pets data, tracks adoption requests (enrollments), and supports updating and deleting pet listings securely in MongoDB.

## Features
- **JWT Verification**: Implements robust JWT verification middleware using JWKS (JSON Web Key Set) fetched from the frontend auth endpoints.
- **RESTful Endpoints**: Dedicated routes for `/courses` (pets), `/enrollments` (adoption requests), and `/card` (featured listings).
- **Adoption Control**: Restricts users from adopting their own listed pets and handles approved/rejected statuses.
- **Advanced Search & Filtering**: Integrates MongoDB regex-based query pipelines for pet searches and category-based species filtering.
- **Secure Configuration**: Uses dotenv for securing credentials, database URLs, and API endpoints.

## NPM Packages Used
- **express**: Minimalist web framework for Node.js.
- **mongodb**: Official MongoDB driver for database interactions.
- **cors**: Middleware for enabling Cross-Origin Resource Sharing.
- **dotenv**: Module to load environment variables.
- **jose-cjs**: CJS package for JSON Web Token signatures and verification.

## Local Setup
1. Clone the backend server directory.
2. Run `npm install` to install dependencies.
3. Configure the environment variables in a `.env` file:
   ```env
   port=3137
   MONGODB_URL=your_mongodb_connection_string
   CLIENT_URL=http://localhost:3000
   ```
4. Run the server using `node index.js` or `npm run dev` (if scripts are configured).
