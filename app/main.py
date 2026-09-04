from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, select
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in .env")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PetModel(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    animal_type = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    available_for_adoption = Column(Boolean, default=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pet Adoption System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PetCreate(BaseModel):
    name: str = Field(..., description="Name of the pet")
    animal_type: str = Field(..., description="Species or type of the pet")
    age: int = Field(..., description="Age of the pet in years")
    available_for_adoption: bool = Field(default=True, description="Whether the pet is available for adoption")

class Pet(PetCreate):
    id: int

    class Config:
        from_attributes = True

@app.post("/pets", response_model=Pet, status_code=201)
def create_pet(pet: PetCreate):
    db = SessionLocal()
    try:
        db_pet = PetModel(
            name=pet.name,
            animal_type=pet.animal_type,
            age=pet.age,
            available_for_adoption=pet.available_for_adoption,
        )
        db.add(db_pet)
        db.commit()
        db.refresh(db_pet)
        return db_pet
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        db.close()

@app.get("/pets", response_model=List[Pet])
def get_pets():
    db = SessionLocal()
    try:
        stmt = select(PetModel)
        pets = db.execute(stmt).scalars().all()
        return list(pets)
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        db.close()

@app.get("/pets/{pet_id}", response_model=Pet)
def get_pet(pet_id: int):
    db = SessionLocal()
    try:
        pet = db.get(PetModel, pet_id)

        if pet is None:
            raise HTTPException(status_code=404, detail="Pet not found")

        return pet

    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        db.close()

@app.put("/pets/{pet_id}", response_model=Pet)
def update_pet(pet_id: int, pet: PetCreate):
    db = SessionLocal()
    try:
        db_pet = db.get(PetModel, pet_id)

        if db_pet is None:
            raise HTTPException(status_code=404, detail="Pet not found")

        db_pet.name = pet.name
        db_pet.animal_type = pet.animal_type
        db_pet.age = pet.age
        db_pet.available_for_adoption = pet.available_for_adoption

        db.commit()
        db.refresh(db_pet)

        return db_pet

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        db.close()

@app.delete("/pets/{pet_id}")
def delete_pet(pet_id: int):
    db = SessionLocal()
    try:
        db_pet = db.get(PetModel, pet_id)

        if db_pet is None:
            raise HTTPException(status_code=404, detail="Pet not found")

        db.delete(db_pet)
        db.commit()

        return {"message": "Pet deleted successfully"}

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        db.close()