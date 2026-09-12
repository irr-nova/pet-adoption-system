from datetime import datetime, timedelta, timezone
import os
import re

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker


# ============================================================
# Configuration
# ============================================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not configured")


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ============================================================
# Database
# ============================================================

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


# ============================================================
# Models
# ============================================================

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
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    adopted_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    adopted_at = Column(
        DateTime(timezone=True),
        nullable=True
    )


class FavoriteModel(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    pet_id = Column(
        Integer,
        ForeignKey("pets.id", ondelete="CASCADE"),
        nullable=False
    )


class AdoptionRequestModel(Base):
    __tablename__ = "adoption_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    pet_id = Column(
        Integer,
        ForeignKey("pets.id", ondelete="CASCADE"),
        nullable=False
    )

    requester_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    message = Column(Text, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="Pending"
    )

    requested_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    responded_at = Column(
        DateTime(timezone=True),
        nullable=True
    )


Base.metadata.create_all(bind=engine)


# ============================================================
# Schemas
# ============================================================

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    phone: str | None = Field(default=None, max_length=20)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    animal_type: str = Field(min_length=1, max_length=50)
    age: int = Field(ge=0, le=100)
    available_for_adoption: bool = True


class Pet(PetCreate):
    id: int
    owner_id: int
    adopted_by: int | None = None
    adopted_at: datetime | None = None


class AdoptionRequestCreate(BaseModel):
    message: str | None = Field(default=None, max_length=1000)


class AdoptionDecision(BaseModel):
    decision: str


# ============================================================
# Authentication
# ============================================================

password_hash = PasswordHash.recommended()
security = HTTPBearer()


def create_access_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        return int(user_id)

    except (
        jwt.ExpiredSignatureError,
        jwt.InvalidTokenError,
        ValueError
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )


# ============================================================
# FastAPI
# ============================================================

app = FastAPI(
    title="PawConnect API",
    description="Pet adoption platform API",
    version="1.0"
)


# ============================================================
# Registration
# ============================================================

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate):

    name = user.name.strip()
    email = str(user.email).strip().lower()

    if len(name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Name must contain at least 2 characters"
        )

    if not re.fullmatch(r"[A-Za-z][A-Za-z .'-]*", name):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid name"
        )

    if len(user.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters"
        )

    db = SessionLocal()

    try:
        existing_user = db.execute(
            select(UserModel).where(UserModel.email == email)
        ).scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists"
            )

        new_user = UserModel(
            name=name,
            email=email,
            password_hash=password_hash.hash(user.password),
            phone=user.phone.strip() if user.phone else None
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

    finally:
        db.close()


# ============================================================
# Login
# ============================================================

@app.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest):

    email = str(credentials.email).strip().lower()

    db = SessionLocal()

    try:
        user = db.execute(
            select(UserModel).where(UserModel.email == email)
        ).scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not password_hash.verify(
            credentials.password,
            user.password_hash
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        token = create_access_token(user.id)

        return {
            "access_token": token,
            "token_type": "bearer"
        }

    finally:
        db.close()


# ============================================================
# Current User
# ============================================================

@app.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user)):

    db = SessionLocal()

    try:
        user = db.get(UserModel, user_id)

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        return user

    finally:
        db.close()


# ============================================================
# Get Pets
# ============================================================

@app.get("/pets", response_model=list[Pet])
def get_pets():

    db = SessionLocal()

    try:
        pets = db.execute(
            select(PetModel)
        ).scalars().all()

        return pets

    finally:
        db.close()


# ============================================================
# Get Single Pet
# ============================================================

@app.get("/pets/{pet_id}", response_model=Pet)
def get_pet(pet_id: int):

    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found"
            )

        return pet

    finally:
        db.close()


# ============================================================
# Add Pet
# ============================================================

@app.post("/pets", response_model=Pet)
def add_pet(
    pet: PetCreate,
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        new_pet = PetModel(
            name=pet.name.strip(),
            animal_type=pet.animal_type.strip(),
            age=pet.age,
            available_for_adoption=pet.available_for_adoption,
            owner_id=user_id
        )

        db.add(new_pet)
        db.commit()
        db.refresh(new_pet)

        return new_pet

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

    finally:
        db.close()


# ============================================================
# Update Pet
# ============================================================

@app.put("/pets/{pet_id}", response_model=Pet)
def update_pet(
    pet_id: int,
    pet_data: PetCreate,
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found"
            )

        if pet.owner_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own pets"
            )

        if pet.adopted_by is not None:
            raise HTTPException(
                status_code=400,
                detail="An adopted pet cannot be edited"
            )

        pet.name = pet_data.name.strip()
        pet.animal_type = pet_data.animal_type.strip()
        pet.age = pet_data.age
        pet.available_for_adoption = pet_data.available_for_adoption

        db.commit()
        db.refresh(pet)

        return pet

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

    finally:
        db.close()


# ============================================================
# Delete Pet
# ============================================================

@app.delete("/pets/{pet_id}")
def delete_pet(
    pet_id: int,
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found"
            )

        if pet.owner_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own pets"
            )

        if pet.adopted_by is not None:
            raise HTTPException(
                status_code=400,
                detail="An adopted pet cannot be deleted"
            )

        db.delete(pet)
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
            detail="Database error"
        )

    finally:
        db.close()


# ============================================================
# Adoption Requests - Request Adoption
# ============================================================

@app.post("/pets/{pet_id}/adoption-request")
def create_adoption_request(
    pet_id: int,
    request_data: AdoptionRequestCreate,
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found"
            )

        if not pet.available_for_adoption:
            raise HTTPException(
                status_code=400,
                detail="This pet is no longer available for adoption"
            )

        if pet.owner_id == user_id:
            raise HTTPException(
                status_code=400,
                detail="You cannot request your own pet"
            )

        existing_request = db.execute(
            select(AdoptionRequestModel).where(
                AdoptionRequestModel.pet_id == pet_id,
                AdoptionRequestModel.requester_id == user_id,
                AdoptionRequestModel.status == "Pending"
            )
        ).scalar_one_or_none()

        if existing_request:
            raise HTTPException(
                status_code=400,
                detail="You already have a pending request for this pet"
            )

        adoption_request = AdoptionRequestModel(
            pet_id=pet_id,
            requester_id=user_id,
            message=request_data.message.strip()
            if request_data.message
            else None,
            status="Pending"
        )

        db.add(adoption_request)
        db.commit()
        db.refresh(adoption_request)

        return {
            "message": "Adoption request sent successfully",
            "request_id": adoption_request.id,
            "status": adoption_request.status
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

    finally:
        db.close()


# ============================================================
# My Adoption Requests
# ============================================================

@app.get("/adoption-requests/mine")
def get_my_adoption_requests(
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        requests = db.execute(
            select(
                AdoptionRequestModel,
                PetModel,
                UserModel
            )
            .join(
                PetModel,
                AdoptionRequestModel.pet_id == PetModel.id
            )
            .join(
                UserModel,
                PetModel.owner_id == UserModel.id
            )
            .where(
                AdoptionRequestModel.requester_id == user_id
            )
            .order_by(
                AdoptionRequestModel.requested_at.desc()
            )
        ).all()

        return [
            {
                "id": request.id,
                "pet_id": pet.id,
                "pet_name": pet.name,
                "owner_name": owner.name,
                "owner_email": owner.email,
                "owner_phone": owner.phone,
                "message": request.message,
                "status": request.status,
                "requested_at": request.requested_at,
                "responded_at": request.responded_at
            }
            for request, pet, owner in requests
        ]

    finally:
        db.close()


# ============================================================
# Owner's Adoption Requests
# ============================================================

@app.get("/adoption-requests/received")
def get_received_adoption_requests(
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        requests = db.execute(
            select(
                AdoptionRequestModel,
                PetModel,
                UserModel
            )
            .join(
                PetModel,
                AdoptionRequestModel.pet_id == PetModel.id
            )
            .join(
                UserModel,
                AdoptionRequestModel.requester_id == UserModel.id
            )
            .where(
                PetModel.owner_id == user_id
            )
            .order_by(
                AdoptionRequestModel.requested_at.desc()
            )
        ).all()

        return [
            {
                "id": request.id,
                "pet_id": pet.id,
                "pet_name": pet.name,
                "requester_name": requester.name,
                "requester_email": requester.email,
                "requester_phone": requester.phone,
                "message": request.message,
                "status": request.status,
                "requested_at": request.requested_at,
                "responded_at": request.responded_at
            }
            for request, pet, requester in requests
        ]

    finally:
        db.close()


# ============================================================
# Accept / Reject Adoption Request
# ============================================================

@app.put("/adoption-requests/{request_id}")
def decide_adoption_request(
    request_id: int,
    decision: AdoptionDecision,
    user_id: int = Depends(get_current_user)
):

    decision_value = decision.decision.strip().lower()

    if decision_value not in ["accept", "reject"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be accept or reject"
        )

    db = SessionLocal()

    try:
        adoption_request = db.get(
            AdoptionRequestModel,
            request_id
        )

        if adoption_request is None:
            raise HTTPException(
                status_code=404,
                detail="Adoption request not found"
            )

        pet = db.get(
            PetModel,
            adoption_request.pet_id
        )

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found"
            )

        if pet.owner_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Only the pet owner can manage this request"
            )

        if adoption_request.status != "Pending":
            raise HTTPException(
                status_code=400,
                detail="This request has already been processed"
            )

        if not pet.available_for_adoption:
            raise HTTPException(
                status_code=400,
                detail="This pet is no longer available for adoption"
            )

        now = datetime.now(timezone.utc)

        if decision_value == "reject":

            adoption_request.status = "Rejected"
            adoption_request.responded_at = now

            db.commit()

            return {
                "message": "Adoption request rejected",
                "status": "Rejected"
            }

        # ACCEPT

        adoption_request.status = "Accepted"
        adoption_request.responded_at = now

        pet.adopted_by = adoption_request.requester_id
        pet.adopted_at = now
        pet.available_for_adoption = False

        # Reject all other pending requests for this pet
        other_requests = db.execute(
            select(AdoptionRequestModel).where(
                AdoptionRequestModel.pet_id == pet.id,
                AdoptionRequestModel.id != adoption_request.id,
                AdoptionRequestModel.status == "Pending"
            )
        ).scalars().all()

        for other_request in other_requests:
            other_request.status = "Rejected"
            other_request.responded_at = now

        db.commit()

        return {
            "message": "Adoption request accepted",
            "status": "Accepted"
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

    finally:
        db.close()


# ============================================================
# Favorites
# ============================================================

@app.get("/favorites")
def get_favorites(
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        favorites = db.execute(
            select(FavoriteModel).where(
                FavoriteModel.user_id == user_id
            )
        ).scalars().all()

        return [
            {
                "id": favorite.id,
                "pet_id": favorite.pet_id
            }
            for favorite in favorites
        ]

    finally:
        db.close()


@app.post("/favorites/{pet_id}")
def add_favorite(
    pet_id: int,
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(
                status_code=404,
                detail="Pet not found"
            )

        existing_favorite = db.execute(
            select(FavoriteModel).where(
                FavoriteModel.user_id == user_id,
                FavoriteModel.pet_id == pet_id
            )
        ).scalar_one_or_none()

        if existing_favorite:
            return {
                "message": "Pet is already in favorites",
                "favorite": True
            }

        favorite = FavoriteModel(
            user_id=user_id,
            pet_id=pet_id
        )

        db.add(favorite)
        db.commit()
        db.refresh(favorite)

        return {
            "message": "Pet added to favorites",
            "favorite": True
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

    finally:
        db.close()


@app.delete("/favorites/{pet_id}")
def remove_favorite(
    pet_id: int,
    user_id: int = Depends(get_current_user)
):

    db = SessionLocal()

    try:
        favorite = db.execute(
            select(FavoriteModel).where(
                FavoriteModel.user_id == user_id,
                FavoriteModel.pet_id == pet_id
            )
        ).scalar_one_or_none()

        if favorite is None:
            raise HTTPException(
                status_code=404,
                detail="Pet is not in favorites"
            )

        db.delete(favorite)
        db.commit()

        return {
            "message": "Pet removed from favorites",
            "favorite": False
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

    finally:
        db.close()