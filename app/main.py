from datetime import datetime, timedelta, timezone
from typing import List

import os
import jwt

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pwdlib import PasswordHash
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, select
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in .env")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not found in .env")


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# -------------------------
# Authentication settings
# -------------------------

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

password_hash = PasswordHash.recommended()
security = HTTPBearer()


# -------------------------
# Database models
# -------------------------

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    phone = Column(String, nullable=True)


class PetModel(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    animal_type = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    available_for_adoption = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

class FavoriteModel(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False)


# -------------------------
# FastAPI setup
# -------------------------

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pet Adoption System")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://pet-adoption-frontend-svts.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Pydantic models
# -------------------------

class UserCreate(BaseModel):
    name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=6, description="Password")
    phone: str | None = Field(default=None, description="Phone number")


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class PetCreate(BaseModel):
    name: str = Field(..., description="Name of the pet")
    animal_type: str = Field(..., description="Species or type of the pet")
    age: int = Field(..., ge=0, description="Age of the pet in years")
    available_for_adoption: bool = Field(
        default=True,
        description="Whether the pet is available for adoption"
    )


class Pet(PetCreate):
    id: int
    owner_id: int

    class Config:
        from_attributes = True


# -------------------------
# Authentication helpers
# -------------------------

def create_access_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

        return int(user_id)

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        )


# -------------------------
# User registration
# -------------------------

@app.post("/register", response_model=UserResponse, status_code=201)
def register_user(user: UserCreate):
    db = SessionLocal()

    try:
        existing_user = db.execute(
            select(UserModel).where(UserModel.email == user.email)
        ).scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email is already registered",
            )

        db_user = UserModel(
            name=user.name,
            email=user.email,
            password_hash=password_hash.hash(user.password),
            phone=user.phone,
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return db_user

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()


# -------------------------
# Login
# -------------------------

@app.post("/login", response_model=TokenResponse)
def login_user(login: LoginRequest):
    db = SessionLocal()

    try:
        user = db.execute(
            select(UserModel).where(UserModel.email == login.email)
        ).scalar_one_or_none()

        if not user or not password_hash.verify(
            login.password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        token = create_access_token(user.id)

        return {
            "access_token": token,
            "token_type": "bearer",
        }

    finally:
        db.close()


# -------------------------
# Current user
# -------------------------

@app.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user)):
    db = SessionLocal()

    try:
        user = db.get(UserModel, user_id)

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        return user

    finally:
        db.close()


# -------------------------
# PETS
# -------------------------

# Public: anyone can browse pets
@app.get("/pets", response_model=List[Pet])
def get_pets():
    db = SessionLocal()

    try:
        stmt = select(PetModel)
        pets = db.execute(stmt).scalars().all()

        return list(pets)

    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()


# Public: anyone can view a pet
@app.get("/pets/{pet_id}", response_model=Pet)
def get_pet(pet_id: int):
    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found",
            )

        return pet

    finally:
        db.close()


# Protected: only logged-in users can add pets
@app.post("/pets", response_model=Pet, status_code=201)
def create_pet(
    pet: PetCreate,
    user_id: int = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        db_pet = PetModel(
            name=pet.name,
            animal_type=pet.animal_type,
            age=pet.age,
            available_for_adoption=pet.available_for_adoption,
            owner_id=user_id,
        )

        db.add(db_pet)
        db.commit()
        db.refresh(db_pet)

        return db_pet

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()


# Protected: only the owner can edit
@app.put("/pets/{pet_id}", response_model=Pet)
def update_pet(
    pet_id: int,
    pet: PetCreate,
    user_id: int = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        db_pet = db.get(PetModel, pet_id)

        if db_pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found",
            )

        if db_pet.owner_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only edit your own pets",
            )

        db_pet.name = pet.name
        db_pet.animal_type = pet.animal_type
        db_pet.age = pet.age
        db_pet.available_for_adoption = pet.available_for_adoption

        db.commit()
        db.refresh(db_pet)

        return db_pet

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()


# Protected: only the owner can delete
@app.delete("/pets/{pet_id}")
def delete_pet(
    pet_id: int,
    user_id: int = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        db_pet = db.get(PetModel, pet_id)

        if db_pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found",
            )

        if db_pet.owner_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own pets",
            )

        db.delete(db_pet)
        db.commit()

        return {
            "message": "Pet deleted successfully"
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()

# Protected: logged-in users can adopt an available pet
@app.post("/pets/{pet_id}/adopt", response_model=Pet)
def adopt_pet(
    pet_id: int,
    user_id: int = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found",
            )

        if not pet.available_for_adoption:
            raise HTTPException(
                status_code=400,
                detail="This pet is not available for adoption",
            )

        if pet.owner_id == user_id:
            raise HTTPException(
                status_code=400,
                detail="You cannot adopt your own pet",
            )

        pet.adopted_by = user_id
        pet.adopted_at = datetime.now(timezone.utc)
        pet.available_for_adoption = False

        db.commit()
        db.refresh(pet)

        return pet

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()

# -------------------------
# FAVORITES
# -------------------------

# Get current user's favorite pets
@app.get("/favorites")
def get_favorites(
    user_id: int = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        favorites = db.execute(
            select(FavoriteModel).where(FavoriteModel.user_id == user_id)
        ).scalars().all()

        return [
            {
                "id": favorite.id,
                "pet_id": favorite.pet_id,
            }
            for favorite in favorites
        ]

    finally:
        db.close()


# Add a pet to favorites
@app.post("/favorites/{pet_id}")
def add_favorite(
    pet_id: int,
    user_id: int = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found",
            )

        existing_favorite = db.execute(
            select(FavoriteModel).where(
                FavoriteModel.user_id == user_id,
                FavoriteModel.pet_id == pet_id,
            )
        ).scalar_one_or_none()

        if existing_favorite:
            return {
                "message": "Pet is already in favorites",
                "favorite": True,
            }

        favorite = FavoriteModel(
            user_id=user_id,
            pet_id=pet_id,
        )

        db.add(favorite)
        db.commit()
        db.refresh(favorite)

        return {
            "message": "Pet added to favorites",
            "favorite": True,
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()


# Remove a pet from favorites
@app.delete("/favorites/{pet_id}")
def remove_favorite(
    pet_id: int,
    user_id: int = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        favorite = db.execute(
            select(FavoriteModel).where(
                FavoriteModel.user_id == user_id,
                FavoriteModel.pet_id == pet_id,
            )
        ).scalar_one_or_none()

        if favorite is None:
            raise HTTPException(
                status_code=404,
                detail="Pet is not in favorites",
            )

        db.delete(favorite)
        db.commit()

        return {
            "message": "Pet removed from favorites",
            "favorite": False,
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error",
        )

    finally:
        db.close()