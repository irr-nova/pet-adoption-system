# Pet Adoption System

A cloud-based Pet Adoption System that provides RESTful APIs for managing pets available for adoption. The system uses FastAPI for the backend and a cloud-hosted PostgreSQL database for storing pet information.

## Features

* Add a new pet
* View all pets
* View details of a specific pet
* Update pet information
* Delete a pet
* Store pet data in a cloud-hosted database
* RESTful API communication
* Cloud deployment

## Technologies Used

* Python
* FastAPI
* SQLAlchemy
* PostgreSQL
* Supabase
* Render
* GitHub

## REST API Endpoints

| Method | Endpoint         | Description            |
| ------ | ---------------- | ---------------------- |
| POST   | `/pets`          | Add a new pet          |
| GET    | `/pets`          | View all pets          |
| GET    | `/pets/{pet_id}` | View a specific pet    |
| PUT    | `/pets/{pet_id}` | Update pet information |
| DELETE | `/pets/{pet_id}` | Delete a pet           |

## Database

The application uses PostgreSQL hosted on Supabase. The database connection is configured using an environment variable stored in a `.env` file.

The `.env` file is excluded from GitHub to protect sensitive database credentials.

## Running the Application Locally

1. Create and activate the Python virtual environment.
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file and add the database connection string:

```text
DATABASE_URL=your_database_connection_string
```

4. Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

5. Open the API documentation in a browser:

```text
http://127.0.0.1:8000/docs
```

## Project Structure

```text
pet adoption system/
├── app/
│   ├── main.py
│   └── __init__.py
├── .env
├── .gitignore
├── README.md
└── requirements.txt
```

## Cloud Deployment

The backend API is deployed using Render and connected to a PostgreSQL database hosted on Supabase.

## Future Development

A user-friendly web frontend will be integrated with the REST API to provide an interactive pet adoption experience.
