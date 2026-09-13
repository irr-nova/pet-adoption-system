from datetime import datetime, timezone
import os

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv(
    "SUPABASE_PUBLISHABLE_KEY"
)
SUPABASE_SECRET_KEY = os.getenv(
    "SUPABASE_SECRET_KEY"
)

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured"
    )

if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is not configured"
    )

if not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError(
        "SUPABASE_PUBLISHABLE_KEY is not configured"
    )

if not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_SECRET_KEY is not configured"
    )


# ============================================================
# DATABASE
# ============================================================

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# DATABASE MODELS
# ============================================================

class UserModel(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    name = Column(
        String,
        nullable=False,
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash = Column(
        String,
        nullable=True,
    )

    phone = Column(
        String,
        nullable=True,
    )

    supabase_user_id = Column(
        String,
        unique=True,
        nullable=True,
        index=True,
    )


class PetModel(Base):
    __tablename__ = "pets"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    name = Column(
        String,
        nullable=False,
    )

    animal_type = Column(
        String,
        nullable=False,
    )

    age = Column(
        Integer,
        nullable=False,
    )

    available_for_adoption = Column(
        Boolean,
        default=True,
    )

    owner_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    adopted_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    adopted_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )


class FavoriteModel(Base):
    __tablename__ = "favorites"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    pet_id = Column(
        Integer,
        ForeignKey(
            "pets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


class AdoptionRequestModel(Base):
    __tablename__ = "adoption_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    pet_id = Column(
        Integer,
        ForeignKey(
            "pets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    requester_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="Pending",
    )

    requested_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            timezone.utc
        ),
    )

    responded_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None


class PetCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    animal_type: str = Field(
        min_length=1,
        max_length=50,
    )

    age: int = Field(
        ge=0,
        le=100,
    )

    available_for_adoption: bool = True


class Pet(PetCreate):
    id: int
    owner_id: int
    adopted_by: int | None = None
    adopted_at: datetime | None = None


class AdoptionRequestCreate(BaseModel):
    message: str | None = Field(
        default=None,
        max_length=1000,
    )


class AdoptionDecision(BaseModel):
    decision: str


# ============================================================
# AUTHENTICATION
# ============================================================

security = HTTPBearer()


async def get_supabase_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
):
    token = credentials.credentials

    try:
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:

            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "apikey":
                        SUPABASE_PUBLISHABLE_KEY,
                    "Authorization":
                        f"Bearer {token}",
                },
            )

        if response.status_code != 200:

            print(
                "SUPABASE AUTH ERROR:",
                response.status_code,
                response.text,
            )

            raise HTTPException(
                status_code=401,
                detail=(
                    "Invalid or expired "
                    "authentication session"
                ),
            )

        return response.json()

    except httpx.RequestError as error:

        print(
            "SUPABASE AUTH REQUEST ERROR:",
            str(error),
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Authentication service is "
                "temporarily unavailable"
            ),
        )


async def get_current_user(
    supabase_user=Depends(
        get_supabase_user
    ),
    db=Depends(get_db),
):
    supabase_user_id = supabase_user.get(
        "id"
    )

    email = supabase_user.get(
        "email"
    )

    if not supabase_user_id or not email:

        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid authentication "
                "information"
            ),
        )

    user_metadata = (
        supabase_user.get(
            "user_metadata"
        )
        or {}
    )

    name = (
        user_metadata.get("name")
        or user_metadata.get(
            "full_name"
        )
        or user_metadata.get(
            "display_name"
        )
        or email.split("@")[0]
    )

    phone = user_metadata.get(
        "phone"
    )

    user = (
        db.query(UserModel)
        .filter(
            UserModel.supabase_user_id
            == supabase_user_id
        )
        .first()
    )

    if not user:

        user = (
            db.query(UserModel)
            .filter(
                UserModel.email
                == email
            )
            .first()
        )

        if user:

            user.supabase_user_id = (
                supabase_user_id
            )

            if name and not user.name:
                user.name = name

            if phone and not user.phone:
                user.phone = phone

            db.commit()

            db.refresh(user)

    if not user:

        user = UserModel(
            name=name,
            email=email,
            phone=phone,
            password_hash=None,
            supabase_user_id=supabase_user_id,
        )

        db.add(user)

        db.commit()

        db.refresh(user)

    return user


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="PawConnect Pet Adoption System"
)


# ============================================================
# CORS
# ============================================================

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


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def root():

    return {
        "message":
            "PawConnect API is running"
    }


@app.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(
    current_user=Depends(
        get_current_user
    ),
):

    return current_user


# ============================================================
# DELETE ACCOUNT
# ============================================================

@app.delete("/account")
async def delete_account(
    supabase_user=Depends(
        get_supabase_user
    ),
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    supabase_user_id = (
        supabase_user.get("id")
    )

    if not supabase_user_id:

        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid authentication "
                "information"
            ),
        )

    try:

        # Delete the user from Supabase Auth
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:

            response = await client.delete(
                (
                    f"{SUPABASE_URL}"
                    "/auth/v1/admin/users/"
                    f"{supabase_user_id}"
                ),
                headers={
                    "apikey":
                        SUPABASE_SECRET_KEY,
                    "Authorization":
                        (
                            "Bearer "
                            f"{SUPABASE_SECRET_KEY}"
                        ),
                },
            )

        if response.status_code not in [
            200,
            204,
        ]:

            print(
                "SUPABASE DELETE USER ERROR:",
                response.status_code,
                response.text,
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Unable to delete "
                    "Supabase account"
                ),
            )

        # Delete the local PawConnect user.
        # Related records such as favorites,
        # pets and adoption requests are handled
        # by database foreign key rules.
        db.delete(current_user)

        db.commit()

        return {
            "message":
                "Account deleted successfully"
        }

    except httpx.RequestError as error:

        print(
            "SUPABASE DELETE REQUEST ERROR:",
            str(error),
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to contact "
                "authentication service"
            ),
        )


# ============================================================
# PET ROUTES
# ============================================================

@app.get(
    "/pets",
    response_model=list[Pet],
)
def get_pets(
    db=Depends(get_db),
):

    return (
        db.query(PetModel)
        .order_by(
            PetModel.id
        )
        .all()
    )


@app.post(
    "/pets",
    response_model=Pet,
)
async def create_pet(
    pet: PetCreate,
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    new_pet = PetModel(
        name=pet.name,
        animal_type=pet.animal_type,
        age=pet.age,
        available_for_adoption=(
            pet.available_for_adoption
        ),
        owner_id=current_user.id,
    )

    db.add(new_pet)

    db.commit()

    db.refresh(new_pet)

    return new_pet


@app.put(
    "/pets/{pet_id}",
    response_model=Pet,
)
async def update_pet(
    pet_id: int,
    pet: PetCreate,
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    existing_pet = (
        db.query(PetModel)
        .filter(
            PetModel.id == pet_id
        )
        .first()
    )

    if not existing_pet:

        raise HTTPException(
            status_code=404,
            detail="Pet not found",
        )

    if (
        existing_pet.owner_id
        != current_user.id
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You can only update "
                "your own pets"
            ),
        )

    existing_pet.name = pet.name

    existing_pet.animal_type = (
        pet.animal_type
    )

    existing_pet.age = pet.age

    existing_pet.available_for_adoption = (
        pet.available_for_adoption
    )

    db.commit()

    db.refresh(existing_pet)

    return existing_pet


@app.delete(
    "/pets/{pet_id}",
)
async def delete_pet(
    pet_id: int,
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    existing_pet = (
        db.query(PetModel)
        .filter(
            PetModel.id == pet_id
        )
        .first()
    )

    if not existing_pet:

        raise HTTPException(
            status_code=404,
            detail="Pet not found",
        )

    if (
        existing_pet.owner_id
        != current_user.id
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You can only delete "
                "your own pets"
            ),
        )

    db.delete(existing_pet)

    db.commit()

    return {
        "message":
            "Pet deleted successfully"
    }


# ============================================================
# FAVORITES
# ============================================================

@app.get("/favorites")
async def get_favorites(
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    favorites = (
        db.query(FavoriteModel)
        .filter(
            FavoriteModel.user_id
            == current_user.id
        )
        .all()
    )

    return [
        favorite.pet_id
        for favorite in favorites
    ]


@app.post(
    "/favorites/{pet_id}",
)
async def add_favorite(
    pet_id: int,
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    pet = (
        db.query(PetModel)
        .filter(
            PetModel.id == pet_id
        )
        .first()
    )

    if not pet:

        raise HTTPException(
            status_code=404,
            detail="Pet not found",
        )

    existing = (
        db.query(FavoriteModel)
        .filter(
            FavoriteModel.user_id
            == current_user.id,
            FavoriteModel.pet_id
            == pet_id,
        )
        .first()
    )

    if existing:

        return {
            "message":
                "Pet is already "
                "in favorites"
        }

    favorite = FavoriteModel(
        user_id=current_user.id,
        pet_id=pet_id,
    )

    db.add(favorite)

    db.commit()

    return {
        "message":
            "Pet added to favorites"
    }


@app.delete(
    "/favorites/{pet_id}",
)
async def remove_favorite(
    pet_id: int,
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    favorite = (
        db.query(FavoriteModel)
        .filter(
            FavoriteModel.user_id
            == current_user.id,
            FavoriteModel.pet_id
            == pet_id,
        )
        .first()
    )

    if not favorite:

        raise HTTPException(
            status_code=404,
            detail=(
                "Favorite not found"
            ),
        )

    db.delete(favorite)

    db.commit()

    return {
        "message":
            "Pet removed from favorites"
    }


# ============================================================
# ADOPTION REQUESTS
# ============================================================

@app.post(
    "/pets/{pet_id}/adoption-request",
)
async def create_adoption_request(
    pet_id: int,
    request: AdoptionRequestCreate,
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    pet = (
        db.query(PetModel)
        .filter(
            PetModel.id == pet_id
        )
        .first()
    )

    if not pet:

        raise HTTPException(
            status_code=404,
            detail="Pet not found",
        )

    if (
        not pet.available_for_adoption
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "This pet is no longer "
                "available for adoption"
            ),
        )

    if (
        pet.owner_id
        == current_user.id
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "You cannot request "
                "adoption of your own pet"
            ),
        )

    existing_request = (
        db.query(
            AdoptionRequestModel
        )
        .filter(
            AdoptionRequestModel.pet_id
            == pet_id,
            AdoptionRequestModel.requester_id
            == current_user.id,
            AdoptionRequestModel.status
            == "Pending",
        )
        .first()
    )

    if existing_request:

        raise HTTPException(
            status_code=400,
            detail=(
                "You already have a "
                "pending request for this pet"
            ),
        )

    adoption_request = (
        AdoptionRequestModel(
            pet_id=pet_id,
            requester_id=current_user.id,
            message=request.message,
            status="Pending",
            requested_at=datetime.now(
                timezone.utc
            ),
        )
    )

    db.add(adoption_request)

    db.commit()

    db.refresh(
        adoption_request
    )

    return {
        "message":
            "Adoption request "
            "submitted successfully",
        "request_id":
            adoption_request.id,
        "status":
            adoption_request.status,
    }


@app.get(
    "/adoption-requests/mine",
)
async def get_my_adoption_requests(
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    requests = (
        db.query(
            AdoptionRequestModel,
            PetModel,
        )
        .join(
            PetModel,
            AdoptionRequestModel.pet_id
            == PetModel.id,
        )
        .filter(
            AdoptionRequestModel.requester_id
            == current_user.id
        )
        .order_by(
            AdoptionRequestModel.requested_at
            .desc()
        )
        .all()
    )

    result = []

    for request, pet in requests:

        result.append(
            {
                "id":
                    request.id,
                "pet_id":
                    pet.id,
                "pet_name":
                    pet.name,
                "animal_type":
                    pet.animal_type,
                "age":
                    pet.age,
                "message":
                    request.message,
                "status":
                    request.status,
                "requested_at":
                    request.requested_at,
                "responded_at":
                    request.responded_at,
            }
        )

    return result


@app.get(
    "/adoption-requests/received",
)
async def get_received_adoption_requests(
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    requests = (
        db.query(
            AdoptionRequestModel,
            PetModel,
            UserModel,
        )
        .join(
            PetModel,
            AdoptionRequestModel.pet_id
            == PetModel.id,
        )
        .join(
            UserModel,
            AdoptionRequestModel.requester_id
            == UserModel.id,
        )
        .filter(
            PetModel.owner_id
            == current_user.id
        )
        .order_by(
            AdoptionRequestModel.requested_at
            .desc()
        )
        .all()
    )

    result = []

    for (
        request,
        pet,
        requester,
    ) in requests:

        result.append(
            {
                "id":
                    request.id,
                "pet_id":
                    pet.id,
                "pet_name":
                    pet.name,
                "animal_type":
                    pet.animal_type,
                "age":
                    pet.age,
                "requester_id":
                    requester.id,
                "requester_name":
                    requester.name,
                "requester_email":
                    requester.email,
                "requester_phone":
                    requester.phone,
                "message":
                    request.message,
                "status":
                    request.status,
                "requested_at":
                    request.requested_at,
                "responded_at":
                    request.responded_at,
            }
        )

    return result


@app.put(
    "/adoption-requests/{request_id}",
)
async def respond_to_adoption_request(
    request_id: int,
    decision: AdoptionDecision,
    current_user=Depends(
        get_current_user
    ),
    db=Depends(get_db),
):

    request = (
        db.query(
            AdoptionRequestModel
        )
        .filter(
            AdoptionRequestModel.id
            == request_id
        )
        .first()
    )

    if not request:

        raise HTTPException(
            status_code=404,
            detail=(
                "Adoption request "
                "not found"
            ),
        )

    pet = (
        db.query(PetModel)
        .filter(
            PetModel.id
            == request.pet_id
        )
        .first()
    )

    if not pet:

        raise HTTPException(
            status_code=404,
            detail="Pet not found",
        )

    if (
        pet.owner_id
        != current_user.id
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You can only respond "
                "to requests for your "
                "own pets"
            ),
        )

    if request.status != "Pending":

        raise HTTPException(
            status_code=400,
            detail=(
                "This request has already "
                "been responded to"
            ),
        )

    normalized_decision = (
        decision.decision
        .strip()
        .lower()
    )

    if normalized_decision not in [
        "accepted",
        "rejected",
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Decision must be "
                "Accepted or Rejected"
            ),
        )

    now = datetime.now(
        timezone.utc
    )

    if (
        normalized_decision
        == "rejected"
    ):

        request.status = (
            "Rejected"
        )

        request.responded_at = now

        db.commit()

        return {
            "message":
                "Adoption request "
                "rejected",
            "status":
                "Rejected",
        }

    # Accepted

    if (
        not pet.available_for_adoption
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "This pet is no longer "
                "available for adoption"
            ),
        )

    pet.available_for_adoption = False

    pet.adopted_by = (
        request.requester_id
    )

    pet.adopted_at = now

    request.status = (
        "Accepted"
    )

    request.responded_at = now

    other_requests = (
        db.query(
            AdoptionRequestModel
        )
        .filter(
            AdoptionRequestModel.pet_id
            == pet.id,
            AdoptionRequestModel.id
            != request.id,
            AdoptionRequestModel.status
            == "Pending",
        )
        .all()
    )

    for other_request in other_requests:

        other_request.status = (
            "Rejected"
        )

        other_request.responded_at = (
            now
        )

    db.commit()

    return {
        "message":
            "Adoption request "
            "accepted",
        "status":
            "Accepted",
    }