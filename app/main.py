from typing import List
from fastapi import FastAPI, HTTPException
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