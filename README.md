# Splitwise Clone

A full-stack Splitwise clone built with FastAPI (Backend) and React (Frontend) that helps groups track and split expenses.

## Features

- Create and manage users
- Create groups with multiple members
- Add expenses to groups with different splitting methods:
  - Equal split
  - Percentage based split
- View outstanding balances:
  - Per group balances
  - Smart settlement suggestions across groups
- Delete users and groups

## Tech Stack

### Backend
- Python 3.11
- FastAPI (Web Framework)
- PostgreSQL (Database)
- SQLAlchemy (ORM)
- Alembic (Database Migrations)
- Docker & Docker Compose

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI Components

## Prerequisites

- Docker and Docker Compose
- Node.js (v16 or higher)
- npm or yarn
- Git

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd splitwise
   ```

2. Start the backend services using Docker Compose:
   ```bash
   docker-compose up --build
   ```
   This will start:
   - PostgreSQL database on port 5432
   - FastAPI backend server on port 8000
   - API documentation will be available at http://localhost:8000/docs

3. Set up the frontend:
   ```bash
   # Navigate to frontend directory
   cd frontend

   # Install dependencies
   npm install
   # or if using yarn
   yarn install

   # Start development server
   npm run dev
   # or
   yarn dev
   ```
   The frontend will be available at http://localhost:5173

## Development

### Backend Development

- The backend code is in the `app` directory
- Database models are in `app/models.py`
- API routes are in `app/main.py`
- Database operations are in `app/crud.py`
- Pydantic schemas are in `app/schemas.py`

To add new database migrations:
```bash
docker-compose exec api alembic revision -m "description of changes"
docker-compose exec api alembic upgrade head
```

### Frontend Development

- The frontend code is in the `frontend/src` directory
- Main application logic is in `App.tsx`
- UI components are in `frontend/src/components`
- Styles are managed with Tailwind CSS

## API Endpoints

### Users
- `POST /users/` - Create a new user
- `GET /users/` - List all users
- `GET /users/{user_id}` - Get user details
- `DELETE /users/{user_id}` - Delete a user

### Groups
- `POST /groups/` - Create a new group
- `GET /groups/` - List all groups
- `GET /groups/{group_id}` - Get group details
- `DELETE /groups/{group_id}` - Delete a group

### Expenses
- `POST /groups/{group_id}/expenses/` - Add new expense to group
- `GET /groups/{group_id}/expenses/` - List all expenses in group

### Balances
- `GET /groups/{group_id}/balances/` - Get balances for all users in group
- `GET /users/{user_id}/balances/` - Get balances for specific user

## Database Schema

The application uses the following main tables:
- `users` - Store user information
- `groups` - Store group information
- `group_members` - Many-to-many relationship between users and groups
- `expenses` - Store expense information
- `expense_splits` - Store how expenses are split between users

## Assumptions and Limitations

1. Authentication is not implemented - all endpoints are public
2. All amounts are stored in cents/paise to avoid floating-point precision issues
3. All expenses are in the same currency (no currency conversion implemented)
4. Settlements/payments between users are not tracked
5. Smart settlement suggestions assume all users can settle with each other

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.