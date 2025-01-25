from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas
from typing import List, Dict

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session):
    return db.query(models.User).all()

def create_user(db: Session, user: schemas.UserCreate):
    print(user)
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user(db, user_id)
    if db_user:
        # Remove user from all groups
        db_user.groups = []
        # Delete user's expense splits
        db.query(models.ExpenseSplit).filter(models.ExpenseSplit.user_id == user_id).delete()
        # Delete expenses where user is the payer
        db.query(models.Expense).filter(models.Expense.paid_by_id == user_id).delete()
        # Delete the user
        db.delete(db_user)
        db.commit()
        return True
    return False

def get_group(db: Session, group_id: int):
    return db.query(models.Group).filter(models.Group.id == group_id).first()

def get_groups(db: Session):
    return db.query(models.Group).all()

def create_group(db: Session, group: schemas.GroupCreate):
    group_data = group.dict(exclude={'member_ids'})
    db_group = models.Group(**group_data)
    
    # Add members to the group
    for user_id in group.member_ids:
        user = get_user(db, user_id)
        if user:
            db_group.members.append(user)
    
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

def delete_group(db: Session, group_id: int) -> bool:
    db_group = get_group(db, group_id)
    if db_group:
        # Remove all members from the group
        db_group.members = []
        # Delete all expenses in the group
        db.query(models.ExpenseSplit).filter(
            models.ExpenseSplit.expense_id.in_(
                db.query(models.Expense.id).filter(models.Expense.group_id == group_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.Expense).filter(models.Expense.group_id == group_id).delete()
        # Delete the group
        db.delete(db_group)
        db.commit()
        return True
    return False

def create_expense(db: Session, group_id: int, expense: schemas.ExpenseCreate):
    # Create expense
    expense_data = expense.dict(exclude={'splits'})
    db_expense = models.Expense(**expense_data, group_id=group_id)
    db.add(db_expense)
    db.flush()  # Get expense ID without committing
    
    # Create splits
    total_share = sum(split.share for split in expense.splits)
    
    for split in expense.splits:
        if expense.split_type == models.SplitType.EQUAL:
            amount = expense.amount // len(expense.splits)  # Integer division for cents
        else:  # PERCENTAGE
            amount = int((split.share / total_share) * expense.amount)
        
        db_split = models.ExpenseSplit(
            expense_id=db_expense.id,
            user_id=split.user_id,
            share=split.share,
            amount=amount
        )
        db.add(db_split)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

def get_group_expenses(db: Session, group_id: int):
    return db.query(models.Expense).filter(models.Expense.group_id == group_id).all()

def calculate_simplified_transactions(balances: Dict[int, int]) -> List[Dict]:
    transactions = []
    # Copy balances to avoid modifying the original
    working_balances = balances.copy()
    
    # Find people who owe money (negative balance) and who are owed money (positive balance)
    while any(abs(amount) > 100 for amount in working_balances.values()):  # 100 cents = $1 threshold
        # Find the person who owes the most and is owed the most
        debtor = min(working_balances.items(), key=lambda x: x[1])
        creditor = max(working_balances.items(), key=lambda x: x[1])
        
        if abs(debtor[1]) < 100 and abs(creditor[1]) < 100:
            break
            
        # Calculate the transaction amount
        amount = min(abs(debtor[1]), abs(creditor[1]))
        if amount < 100:  # Skip tiny transactions
            continue
            
        # Record the transaction
        transactions.append({
            "from_user_id": debtor[0],
            "to_user_id": creditor[0],
            "amount": amount
        })
        
        # Update balances
        working_balances[debtor[0]] += amount
        working_balances[creditor[0]] -= amount
    
    return transactions

def get_group_balances(db: Session, group_id: int) -> Dict:
    # Get all expenses in the group
    expenses = get_group_expenses(db, group_id)
    
    # Calculate balances
    balances: Dict[int, int] = {}  # user_id -> balance in cents
    
    for expense in expenses:
        # Add amount paid to payer's balance
        balances[expense.paid_by_id] = balances.get(expense.paid_by_id, 0) + expense.amount
        
        # Subtract amounts owed from each user's balance
        for split in expense.splits:
            balances[split.user_id] = balances.get(split.user_id, 0) - split.amount
    
    # Convert to list of balances
    balance_list = [
        schemas.Balance(user_id=user_id, amount=amount) 
        for user_id, amount in balances.items()
    ]
    
    # Calculate simplified transactions for this group
    transactions = calculate_simplified_transactions(balances)
    
    # Get all groups to calculate smart transactions
    all_groups = get_groups(db)
    all_balances: Dict[int, int] = {}  # user_id -> total balance across all groups
    
    # Calculate total balances across all groups
    for group in all_groups:
        group_expenses = get_group_expenses(db, group.id)
        for expense in group_expenses:
            all_balances[expense.paid_by_id] = all_balances.get(expense.paid_by_id, 0) + expense.amount
            for split in expense.splits:
                all_balances[split.user_id] = all_balances.get(split.user_id, 0) - split.amount
    
    # Calculate smart transactions across all groups
    smart_transactions = calculate_simplified_transactions(all_balances)
    
    return {
        "balances": balance_list,
        "transactions": transactions,
        "smartTransactions": smart_transactions
    }

def get_user_balances(db: Session, user_id: int) -> Dict[int, Dict]:
    # Get all groups the user is in
    user = get_user(db, user_id)
    if not user:
        return {}
    
    # Calculate balances for each group
    group_balances = {}
    for group in user.groups:
        group_balance = get_group_balances(db, group.id)
        if any(b.user_id == user_id for b in group_balance["balances"]):
            group_balances[group.id] = group_balance 