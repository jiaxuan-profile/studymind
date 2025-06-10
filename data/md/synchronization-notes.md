# Process Synchronization - Operating Systems

**Course:** CS 310 - Operating Systems  
**Topic:** Process Synchronization and Concurrency  
**Date:** May 25, 2025  
**Author:** Alex Chen

## Concurrency Problems

### Race Conditions
- Multiple processes/threads access shared data concurrently
- Final result depends on timing of access
- Need synchronization to prevent inconsistent states

#### Example: Bank Account Problem
```c
// Without synchronization - RACE CONDITION!
int balance = 1000;

void withdraw(int amount) {
    int temp = balance;    // Read
    temp = temp - amount;  // Modify  
    balance = temp;        // Write
}

// If two threads call withdraw(100) simultaneously:
// Thread 1: reads 1000, calculates 900
// Thread 2: reads 1000, calculates 900  
// Both write 900 → Balance = 900 (should be 800!)
```

### Critical Section Problem
- Section of code accessing shared resources
- Only one process should execute in critical section at a time

#### Requirements for Solution:
1. **Mutual Exclusion**: Only one process in critical section
2. **Progress**: If no process in critical section, selection cannot be postponed indefinitely
3. **Bounded Waiting**: Limit on waiting time for critical section entry

## Synchronization Mechanisms

### 1. Mutex (Mutual Exclusion)
- Binary lock: either locked or unlocked
- Only lock holder can access critical section

```c
mutex_t lock;

void critical_section() {
    mutex_lock(&lock);
    // Critical section code here
    shared_resource++;
    mutex_unlock(&lock);
}
```

### 2. Semaphores
- Integer variable with atomic operations: wait() and signal()
- **Binary Semaphore**: Acts like mutex (0 or 1)
- **Counting Semaphore**: Counts available resources

```c
semaphore sem = 1;  // Binary semaphore

void wait(semaphore *s) {
    while (*s <= 0);  // Busy wait
    (*s)--;
}

void signal(semaphore *s) {
    (*s)++;
}

// Usage:
void process() {
    wait(&sem);
    // Critical section
    signal(&sem);
}
```

#### Producer-Consumer with Semaphores
```c
#define BUFFER_SIZE 10

int buffer[BUFFER_SIZE];
int in = 0, out = 0;

semaphore empty = BUFFER_SIZE;  // Empty slots
semaphore full = 0;             // Full slots  
semaphore mutex = 1;            // Mutual exclusion

void producer() {
    int item;
    while (true) {
        item = produce_item();
        
        wait(&empty);   // Wait for empty slot
        wait(&mutex);   // Enter critical section
        
        buffer[in] = item;
        in = (in + 1) % BUFFER_SIZE;
        
        signal(&mutex); // Exit critical section
        signal(&full);  // Signal full slot
    }
}

void consumer() {
    int item;
    while (true) {
        wait(&full);    // Wait for full slot
        wait(&mutex);   // Enter critical section
        
        item = buffer[out];
        out = (out + 1) % BUFFER_SIZE;
        
        signal(&mutex); // Exit critical section
        signal(&empty); // Signal empty slot
        
        consume_item(item);
    }
}
```

### 3. Monitors
- High-level synchronization construct
- Encapsulates shared data and procedures
- Only one process can be active in monitor at a time

```java
public class BankAccount {
    private int balance = 0;
    
    public synchronized void deposit(int amount) {
        balance += amount;
        notifyAll();  // Wake up waiting threads
    }
    
    public synchronized void withdraw(int amount) {
        while (balance < amount) {
            try {
                wait();  // Wait until sufficient balance
            } catch (InterruptedException e) {}
        }
        balance -= amount;
    }
    
    public synchronized int getBalance() {
        return balance;
    }
}
```

### 4. Condition Variables
- Used with monitors for thread coordination
- Operations: wait(), signal(), broadcast()

```c
pthread_mutex_t mutex;
pthread_cond_t condition;
int count = 0;

void wait_for_condition() {
    pthread_mutex_lock(&mutex);
    while (count < 10) {
        pthread_cond_wait(&condition, &mutex);
    }
    // Condition met, proceed
    pthread_mutex_unlock(&mutex);
}

void signal_condition() {
    pthread_mutex_lock(&mutex);
    count++;
    if (count >= 10) {
        pthread_cond_signal(&condition);
    }
    pthread_mutex_unlock(&mutex);
}
```

## Classic Synchronization Problems

### 1. Dining Philosophers
- 5 philosophers sit around table with 5 chopsticks
- Each needs 2 chopsticks to eat
- Avoid deadlock and starvation

```c
semaphore chopstick[5] = {1, 1, 1, 1, 1};
semaphore room = 4;  // Limit philosophers in room

void philosopher(int i) {
    while (true) {
        think();
        
        wait(&room);           // Enter room
        wait(&chopstick[i]);   // Left chopstick
        wait(&chopstick[(i+1)%5]); // Right chopstick
        
        eat();
        
        signal(&chopstick[(i+1)%5]); // Release right
        signal(&chopstick[i]);       // Release left
        signal(&room);               // Leave room
    }
}
```

### 2. Readers-Writers Problem
- Multiple readers can read simultaneously
- Only one writer can write at a time
- Writer has exclusive access

```c
semaphore mutex = 1;        // Protect readcount
semaphore write_mutex = 1;  // Mutual exclusion for writers
int readcount = 0;

void reader() {
    while (true) {
        wait(&mutex);
        readcount++;
        if (readcount == 1) {
            wait(&write_mutex);  // First reader blocks writers
        }
        signal(&mutex);
        
        // Read data
        
        wait(&mutex);
        readcount--;
        if (readcount == 0) {
            signal(&write_mutex); // Last reader unblocks writers
        }
        signal(&mutex);
    }
}

void writer() {
    while (true) {
        wait(&write_mutex);
        
        // Write data
        
        signal(&write_mutex);
    }
}
```

### 3. Sleeping Barber Problem
- Barber shop with limited waiting chairs
- Barber sleeps when no customers
- Customers leave if shop full

```c
semaphore customers = 0;    // Number of customers
semaphore barber = 0;       // Barber availability  
semaphore mutex = 1;        // Protect waiting count
int waiting = 0;
const int CHAIRS = 5;

void barber() {
    while (true) {
        wait(&customers);   // Sleep until customer arrives
        wait(&mutex);
        waiting--;          // Customer being served
        signal(&barber);    // Ready to cut hair
        signal(&mutex);
        
        cut_hair();         // Serve customer
    }
}

void customer() {
    wait(&mutex);
    if (waiting < CHAIRS) {
        waiting++;
        signal(&customers); // Wake up barber
        signal(&mutex);
        
        wait(&barber);      // Wait for service
        get_haircut();      // Receive service
    } else {
        signal(&mutex);     // Shop full, leave
    }
}
```

## Deadlock

### Conditions for Deadlock (Coffman Conditions):
1. **Mutual Exclusion**: Resources cannot be shared
2. **Hold and Wait**: Process holds resources while waiting for others
3. **No Preemption**: Resources cannot be forcibly taken
4. **Circular Wait**: Circular chain of waiting processes

### Deadlock Prevention
- Negate one of the four conditions

#### Techniques:
1. **Mutual Exclusion**: Make resources shareable (not always possible)
2. **Hold and Wait**: Require processes to request all resources at once
3. **No Preemption**: Allow resource preemption
4. **Circular Wait**: Order resources, request in ascending order

### Deadlock Avoidance
- **Banker's Algorithm**: Check if resource allocation leads to safe state

```c
bool is_safe(int allocation[][], int max[][], int available[]) {
    int work[RESOURCES];
    bool finish[PROCESSES] = {false};
    
    // Copy available to work
    for (int i = 0; i < RESOURCES; i++) {
        work[i] = available[i];
    }
    
    int count = 0;
    while (count < PROCESSES) {
        bool found = false;
        for (int p = 0; p < PROCESSES; p++) {
            if (!finish[p]) {
                bool can_finish = true;
                for (int r = 0; r < RESOURCES; r++) {
                    if (max[p][r] - allocation[p][r] > work[r]) {
                        can_finish = false;
                        break;
                    }
                }
                
                if (can_finish) {
                    for (int r = 0; r < RESOURCES; r++) {
                        work[r] += allocation[p][r];
                    }
                    finish[p] = true;
                    found = true;
                    count++;
                }
            }
        }
        
        if (!found) {
            return false;  // Unsafe state
        }
    }
    
    return true;  // Safe state
}
```

## Key Takeaways

1. **Synchronization** prevents race conditions in concurrent systems
2. **Mutual exclusion** ensures only one process in critical section
3. **Semaphores** provide flexible synchronization mechanism
4. **Monitors** offer high-level synchronization abstraction
5. **Deadlock** can be prevented, avoided, or detected and recovered
6. **Classic problems** demonstrate common synchronization patterns

## Study Tips

- Practice implementing synchronization solutions
- Understand the trade-offs between different mechanisms
- Analyze real-world concurrency problems
- Learn to identify potential race conditions
- Master the classic synchronization problems