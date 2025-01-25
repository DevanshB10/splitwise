from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from . import crud, models, schemas
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Splitwise API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "Welcome to Splitwise API"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db=db, user=user)

@app.get("/users/", response_model=List[schemas.User])
def read_users(db: Session = Depends(get_db)):
    return crud.get_users(db)

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    if crud.delete_user(db, user_id):
        return {"message": "User deleted"}
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/groups/", response_model=schemas.Group)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    return crud.create_group(db=db, group=group)

@app.get("/groups/", response_model=List[schemas.Group])
def read_groups(db: Session = Depends(get_db)):
    return crud.get_groups(db)

@app.get("/groups/{group_id}", response_model=schemas.Group)
def read_group(group_id: int, db: Session = Depends(get_db)):
    db_group = crud.get_group(db, group_id=group_id)
    if db_group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_group

@app.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db)):
    if crud.delete_group(db, group_id):
        return {"message": "Group deleted"}
    raise HTTPException(status_code=404, detail="Group not found")

@app.post("/groups/{group_id}/expenses/", response_model=schemas.Expense)
def create_group_expense(
    group_id: int, expense: schemas.ExpenseCreate, db: Session = Depends(get_db)
):
    return crud.create_expense(db=db, group_id=group_id, expense=expense)

@app.get("/groups/{group_id}/expenses/", response_model=List[schemas.Expense])
def read_group_expenses(group_id: int, db: Session = Depends(get_db)):
    return crud.get_group_expenses(db, group_id=group_id)

@app.get("/groups/{group_id}/balances/", response_model=schemas.GroupBalance)
def read_group_balances(group_id: int, db: Session = Depends(get_db)):
    return crud.get_group_balances(db, group_id=group_id)

@app.get("/users/{user_id}/balances/", response_model=schemas.UserGroupBalances)
def read_user_balances(user_id: int, db: Session = Depends(get_db)):
    group_balances = crud.get_user_balances(db, user_id=user_id)
    return {"group_balances": group_balances} 