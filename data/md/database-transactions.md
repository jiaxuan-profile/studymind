# Database Transactions & Concurrency Control

**Course:** CS 330 - Database Systems  
**Topic:** Transaction Processing and Concurrency Control  
**Date:** May 20, 2025  
**Author:** Alex Chen

## Transaction Fundamentals

### What is a Transaction?
A transaction is a logical unit of database processing that includes one or more database access operations (read, insert, delete, update).

#### Properties: ACID

**Atomicity**
- Transaction is treated as a single, indivisible unit
- Either all operations complete successfully or none do
- "All or nothing" principle

**Consistency** 
- Transaction must take database from one valid state to another
- Database constraints must be satisfied before and after transaction
- Business rules must be preserved

**Isolation**
- Concurrent transactions should not interfere with each other
- Each transaction should appear to execute alone
- Intermediate transaction results should not be visible to other transactions

**Durability**
- Once transaction commits, changes are permanent
- Survive system failures, power outages, crashes
- Changes must be stored in non-volatile storage

### Transaction States

```
Active → Partially Committed → Committed
  ↓              ↓
Failed ← ← ← ← Aborted
```

1. **Active**: Transaction is executing
2. **Partially Committed**: Final statement executed, but not yet committed
3. **Committed**: Transaction completed successfully
4. **Failed**: Transaction cannot proceed
5. **Aborted**: Transaction rolled back, database restored to pre-transaction state

### Transaction Operations

```sql
-- Begin transaction (implicit or explicit)
BEGIN TRANSACTION;
START TRANSACTION;

-- Database operations
UPDATE accounts SET balance = balance - 100 WHERE account_id = 123;
UPDATE accounts SET balance = balance + 100 WHERE account_id = 456;

-- Commit changes
COMMIT;

-- OR rollback changes
ROLLBACK;
```

## Concurrency Control Problems

### 1. Lost Update Problem
Two transactions read same data, modify it, and update - one update is lost.

```sql
-- Time  Transaction T1              Transaction T2
-- 1     READ(X) = 100               
-- 2                                 READ(X) = 100
-- 3     X = X + 50 = 150            
-- 4                                 X = X + 25 = 125
-- 5     WRITE(X) = 150              
-- 6                                 WRITE(X) = 125  ← Lost T1's update!
```

### 2. Dirty Read Problem
Transaction reads uncommitted changes from another transaction.

```sql
-- Time  Transaction T1              Transaction T2
-- 1     READ(X) = 100               
-- 2     X = X + 50 = 150            
-- 3     WRITE(X) = 150              
-- 4                                 READ(X) = 150  ← Dirty read!
-- 5     ROLLBACK                    
-- 6                                 -- T2 read uncommitted data
```

### 3. Unrepeatable Read Problem
Transaction reads same data twice but gets different values.

```sql
-- Time  Transaction T1              Transaction T2
-- 1     READ(X) = 100               
-- 2                                 READ(X) = 100
-- 3                                 X = X + 50 = 150
-- 4                                 WRITE(X) = 150
-- 5                                 COMMIT
-- 6     READ(X) = 150               ← Different value!
```

### 4. Phantom Read Problem
Transaction re-executes query and finds new rows that satisfy condition.

```sql
-- Transaction T1: Count employees with salary > 50000
-- Transaction T2: Inserts new employee with salary 60000
-- T1 re-executes count and finds different result
```

## Isolation Levels

### 1. Read Uncommitted
- Lowest isolation level
- Allows dirty reads, unrepeatable reads, phantom reads
- Fastest performance but least consistent

### 2. Read Committed  
- Prevents dirty reads
- Still allows unrepeatable reads and phantom reads
- Default in many databases

### 3. Repeatable Read
- Prevents dirty reads and unrepeatable reads
- Still allows phantom reads
- Locks all read data until transaction completes

### 4. Serializable
- Highest isolation level
- Prevents all concurrency problems
- Transactions appear to execute serially
- Slowest performance but most consistent

```sql
-- Setting isolation level
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

## Locking Mechanisms

### Lock Types

**Shared Lock (S)**
- Multiple transactions can hold shared locks on same item
- Used for read operations
- Compatible with other shared locks

**Exclusive Lock (X)**  
- Only one transaction can hold exclusive lock
- Used for write operations
- Not compatible with any other locks

### Lock Compatibility Matrix
```
        S    X
    S   ✓    ✗
    X   ✗    ✗
```

### Two-Phase Locking (2PL)
Protocol ensuring serializability:

**Phase 1: Growing Phase**
- Transaction may obtain locks
- Cannot release any locks

**Phase 2: Shrinking Phase**  
- Transaction may release locks
- Cannot obtain any locks

```python
class TwoPhaseLocking:
    def __init__(self):
        self.locks_held = set()
        self.growing_phase = True
    
    def acquire_lock(self, resource, lock_type):
        if not self.growing_phase:
            raise Exception("Cannot acquire locks in shrinking phase")
        
        # Acquire lock logic
        self.locks_held.add((resource, lock_type))
        return True
    
    def release_lock(self, resource, lock_type):
        self.growing_phase = False  # Enter shrinking phase
        
        if (resource, lock_type) in self.locks_held:
            self.locks_held.remove((resource, lock_type))
            return True
        return False
```

### Deadlock

#### Detection
Use wait-for graph to detect cycles.

```python
def has_deadlock(wait_for_graph):
    """
    wait_for_graph: dict where key waits for values
    Returns True if cycle exists (deadlock)
    """
    def dfs(node, visited, rec_stack):
        visited[node] = True
        rec_stack[node] = True
        
        for neighbor in wait_for_graph.get(node, []):
            if not visited.get(neighbor, False):
                if dfs(neighbor, visited, rec_stack):
                    return True
            elif rec_stack.get(neighbor, False):
                return True
        
        rec_stack[node] = False
        return False
    
    visited = {}
    rec_stack = {}
    
    for node in wait_for_graph:
        if not visited.get(node, False):
            if dfs(node, visited, rec_stack):
                return True
    return False
```

#### Prevention
1. **Timeout**: Abort transaction after timeout
2. **Wait-Die**: Older transaction waits, younger dies
3. **Wound-Wait**: Older transaction wounds younger, younger waits

## Recovery Mechanisms

### Write-Ahead Logging (WAL)
- Log changes before applying them to database
- Enables recovery after crashes

#### Log Record Structure
```
<Transaction_ID, Data_Item, Old_Value, New_Value>
<T1, X, 100, 150>
<T1, Y, 200, 175>
<T1, COMMIT>
```

### Recovery Algorithms

#### ARIES (Algorithm for Recovery and Isolation Exploiting Semantics)
1. **Analysis Phase**: Scan log to identify dirty pages and active transactions
2. **Redo Phase**: Repeat all operations from crash point
3. **Undo Phase**: Undo operations of uncommitted transactions

```python
def aries_recovery(log_records, checkpoint):
    # Phase 1: Analysis
    dirty_pages = set()
    active_transactions = set()
    
    for record in log_records[checkpoint:]:
        if record.type == 'UPDATE':
            dirty_pages.add(record.page)
            active_transactions.add(record.transaction_id)
        elif record.type == 'COMMIT':
            active_transactions.discard(record.transaction_id)
    
    # Phase 2: Redo
    for record in log_records[checkpoint:]:
        if record.type == 'UPDATE':
            if record.page in dirty_pages:
                apply_change(record)
    
    # Phase 3: Undo
    for transaction in active_transactions:
        undo_transaction(transaction, log_records)
```

## Distributed Transactions

### Two-Phase Commit (2PC)
Ensures atomicity across multiple databases.

**Phase 1: Prepare**
- Coordinator asks all participants to prepare
- Participants vote READY or ABORT

**Phase 2: Commit**
- If all vote READY, coordinator sends COMMIT
- If any vote ABORT, coordinator sends ABORT

```python
class TwoPhaseCommit:
    def __init__(self, coordinator, participants):
        self.coordinator = coordinator
        self.participants = participants
    
    def execute_transaction(self, transaction):
        # Phase 1: Prepare
        votes = []
        for participant in self.participants:
            vote = participant.prepare(transaction)
            votes.append(vote)
        
        # Phase 2: Commit or Abort
        if all(vote == 'READY' for vote in votes):
            # All ready - commit
            for participant in self.participants:
                participant.commit(transaction)
            return 'COMMITTED'
        else:
            # At least one abort - abort all
            for participant in self.participants:
                participant.abort(transaction)
            return 'ABORTED'
```

## Performance Optimization

### Index-Based Concurrency Control
- Use indexes to reduce lock granularity
- Lock individual index entries instead of entire tables

### Optimistic Concurrency Control
- Assume conflicts are rare
- Validate at commit time instead of locking

```python
class OptimisticTransaction:
    def __init__(self):
        self.read_set = {}
        self.write_set = {}
        self.start_timestamp = get_timestamp()
    
    def read(self, item):
        value, timestamp = database.read_with_timestamp(item)
        self.read_set[item] = timestamp
        return value
    
    def write(self, item, value):
        self.write_set[item] = value
    
    def validate_and_commit(self):
        # Validation phase
        for item, timestamp in self.read_set.items():
            current_timestamp = database.get_timestamp(item)
            if current_timestamp > timestamp:
                return False  # Validation failed
        
        # Commit phase
        commit_timestamp = get_timestamp()
        for item, value in self.write_set.items():
            database.write_with_timestamp(item, value, commit_timestamp)
        return True
```

## Key SQL Transaction Examples

### Bank Transfer
```sql
BEGIN TRANSACTION;

DECLARE @source_balance DECIMAL(10,2);
DECLARE @target_balance DECIMAL(10,2);

-- Check source account balance
SELECT @source_balance = balance 
FROM accounts 
WHERE account_id = 123;

IF @source_balance >= 500 BEGIN
    -- Debit source account
    UPDATE accounts 
    SET balance = balance - 500 
    WHERE account_id = 123;
    
    -- Credit target account
    UPDATE accounts 
    SET balance = balance + 500 
    WHERE account_id = 456;
    
    -- Log transaction
    INSERT INTO transaction_log (from_account, to_account, amount, timestamp)
    VALUES (123, 456, 500, GETDATE());
    
    COMMIT;
END ELSE BEGIN
    ROLLBACK;
    RAISERROR('Insufficient funds', 16, 1);
END
```

### Inventory Management
```sql
BEGIN TRANSACTION;

-- Check inventory
DECLARE @current_stock INT;
SELECT @current_stock = quantity 
FROM inventory 
WHERE product_id = 'P001';

IF @current_stock >= 5 BEGIN
    -- Update inventory
    UPDATE inventory 
    SET quantity = quantity - 5 
    WHERE product_id = 'P001';
    
    -- Create order
    INSERT INTO orders (product_id, quantity, order_date)
    VALUES ('P001', 5, GETDATE());
    
    COMMIT;
END ELSE BEGIN
    ROLLBACK;
    PRINT 'Insufficient inventory';
END
```

## Study Tips

1. **Understand ACID properties** - fundamental to all transaction processing
2. **Practice concurrency problems** - know how each isolation level prevents specific issues
3. **Master locking protocols** - especially two-phase locking
4. **Learn recovery algorithms** - understand WAL and checkpoint mechanisms
5. **Implement examples** - write code for 2PC, optimistic concurrency control
6. **Analyze real scenarios** - bank transfers, inventory systems, booking systems

## Common Interview Questions

1. Explain ACID properties with examples
2. What's the difference between pessimistic and optimistic locking?
3. How does two-phase commit work?
4. When would you use different isolation levels?
5. How do you detect and resolve deadlocks?
6. Implement a simple transaction manager