# Digital Product Store

A full-stack Digital Product Store application built using FastAPI, React Vite, SQLAlchemy, JWT Authentication, and Stripe Checkout.

## Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- JWT Authentication
- Stripe
- Uvicorn
- Pytest

### Frontend
- React
- Vite
- React Router
- Axios
- React Toastify

### Payment
- Stripe Checkout
- Stripe Webhooks
- Stripe Test Mode

---

# Features

## Authentication

- User registration
- User login
- JWT-based authentication
- Protected APIs
- User profile
- Duplicate email validation
- Invalid login handling
- Unauthorized access handling

## Product Management

- Create product
- Update product
- Delete product
- Get product by ID
- Get products
- Product search
- Product pagination

Example:

```text
GET /products?page=1&limit=10&search=python
