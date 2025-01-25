# Splitwise Clone API

A simple version of Splitwise backend API server built with FastAPI and PostgreSQL.

## Features

- Create groups with users
- Add expenses to groups with different splitting methods:
  - Equal split
  - Percentage based split
- View outstanding balances for users in groups

## Tech Stack

- Python 3.11
- FastAPI (Web Framework)
- PostgreSQL (Database)
- SQLAlchemy (ORM)
- Docker & Docker Compose (Containerization)
- Alembic (Database Migrations)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd splitwise
   ```

2. Start the application using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. The API will be available at: http://localhost:8000
4. API Documentation (Swagger UI) will be available at: http://localhost:8000/docs

## API Schema

### Groups
- `POST /api/groups` - Create a new group
- `GET /api/groups` - List all groups
- `GET /api/groups/{group_id}` - Get group details

### Expenses
- `POST /api/groups/{group_id}/expenses` - Add new expense to group
- `GET /api/groups/{group_id}/expenses` - List all expenses in group

### Balances
- `GET /api/groups/{group_id}/balances` - Get balances for all users in group
- `GET /api/users/{user_id}/balances` - Get balances for specific user

## Assumptions

1. Authentication is not implemented - all endpoints are public
2. Users are pre-created in the system
3. All amounts are stored in cents/paise to avoid floating-point precision issues
4. All expenses are in the same currency (no currency conversion implemented)
5. Settlements/payments between users are not implemented