# B2Boost CRM Backend

This is the backend API for the B2Boost CRM application. It provides endpoints for authentication, leads management, deals tracking, and team management.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb+srv://n210038:asdf@cluster0.ah6vp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   PORT=5000
   JWT_SECRET=b2boost-crm-secret-key
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register a user coming from Kinde
- `GET /api/auth/me`: Get current user info

### Leads

- `GET /api/leads`: Get all leads for the organization
- `GET /api/leads/:id`: Get a single lead by ID
- `POST /api/leads`: Create a new lead
- `PUT /api/leads/:id`: Update a lead
- `DELETE /api/leads/:id`: Delete a lead (restricted to managers and owners)

### Deals

- `GET /api/deals`: Get all deals for the organization
- `GET /api/deals/by-stage`: Get deals grouped by stage
- `GET /api/deals/:id`: Get a single deal by ID
- `POST /api/deals`: Create a new deal
- `PUT /api/deals/:id`: Update a deal
- `DELETE /api/deals/:id`: Delete a deal (restricted to managers and owners)

### Teams

- `GET /api/teams`: Get all team members for the organization
- `GET /api/teams/:id`: Get a single team member by ID
- `PUT /api/teams/:id`: Update a team member's role (restricted to owners)
- `POST /api/teams/invite`: Generate invitation link for a new team member (restricted to owners and managers)

## Models

- **User**: Represents a user in the system
- **Organization**: Represents a tenant/organization in the system
- **Lead**: Represents a sales lead
- **Deal**: Represents a sales deal

## Authentication

The API uses JWT tokens for authentication. The token should be included in the Authorization header:

```
Authorization: Bearer <token>
```

## Multi-Tenancy

The API implements multi-tenancy at the application level. Each user is associated with an organization, and all data is filtered by the organization ID of the authenticated user. 