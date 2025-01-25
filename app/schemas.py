from pydantic import BaseModel, EmailStr, conint, confloat
from typing import List, Optional, Dict
from datetime import datetime
from .models import SplitType

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    member_ids: List[int]

class Group(GroupBase):
    id: int
    created_at: datetime
    members: List[User]
    
    class Config:
        from_attributes = True

class ExpenseSplitBase(BaseModel):
    user_id: int
    share: float  # Percentage or equal share amount

class ExpenseSplitCreate(ExpenseSplitBase):
    pass

class ExpenseSplit(ExpenseSplitBase):
    id: int
    amount: int  # Final amount in cents/paise
    expense_id: int
    
    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    description: str
    amount: conint(gt=0)  # Amount in cents/paise
    split_type: SplitType
    splits: List[ExpenseSplitCreate]

class ExpenseCreate(ExpenseBase):
    paid_by_id: int

class Expense(ExpenseBase):
    id: int
    group_id: int
    paid_by_id: int
    created_at: datetime
    splits: List[ExpenseSplit]
    
    class Config:
        from_attributes = True

class Balance(BaseModel):
    user_id: int
    amount: int  # Positive means user is owed money, negative means user owes money

class Transaction(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: int  # Amount in cents

class GroupBalance(BaseModel):
    balances: List[Balance]
    transactions: List[Transaction]
    smartTransactions: List[Transaction]  # Optimized transactions across all groups

class UserGroupBalances(BaseModel):
    group_balances: Dict[int, GroupBalance]  # group_id -> GroupBalance 