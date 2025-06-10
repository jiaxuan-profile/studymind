# Software Design Patterns

**Course:** CS 340 - Software Engineering  
**Topic:** Object-Oriented Design Patterns  
**Date:** May 18, 2025  
**Author:** Alex Chen

## Introduction to Design Patterns

### What are Design Patterns?
Design patterns are reusable solutions to commonly occurring problems in software design. They represent best practices and provide a template for solving problems that can be used in many different situations.

### Benefits of Design Patterns
- **Reusability**: Solutions can be applied to similar problems
- **Communication**: Common vocabulary for developers
- **Best Practices**: Proven solutions that work
- **Maintainability**: Well-structured, easier to modify code
- **Design Quality**: Promote loose coupling and high cohesion

### Pattern Categories (Gang of Four)

1. **Creational Patterns**: Object creation mechanisms
2. **Structural Patterns**: Object composition and relationships  
3. **Behavioral Patterns**: Communication between objects

## Creational Patterns

### 1. Singleton Pattern
Ensures a class has only one instance and provides global access to it.

#### Use Cases:
- Database connections
- Logger classes
- Configuration settings
- Thread pools

#### Implementation:
```java
public class Singleton {
    private static volatile Singleton instance;
    private static final Object lock = new Object();
    
    private Singleton() {
        // Private constructor to prevent instantiation
    }
    
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (lock) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

#### Thread-Safe Enum Implementation:
```java
public enum DatabaseConnection {
    INSTANCE;
    
    private Connection connection;
    
    private DatabaseConnection() {
        // Initialize connection
        connection = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/mydb", "user", "password");
    }
    
    public Connection getConnection() {
        return connection;
    }
}

// Usage
DatabaseConnection.INSTANCE.getConnection();
```

### 2. Factory Method Pattern
Creates objects without specifying exact classes to create.

#### Use Cases:
- UI components for different operating systems
- Database drivers for different databases
- Payment processors for different providers

#### Implementation:
```java
// Product interface
interface Animal {
    void makeSound();
}

// Concrete products
class Dog implements Animal {
    public void makeSound() { System.out.println("Woof!"); }
}

class Cat implements Animal {
    public void makeSound() { System.out.println("Meow!"); }
}

// Creator abstract class
abstract class AnimalFactory {
    abstract Animal createAnimal();
    
    public void playWithAnimal() {
        Animal animal = createAnimal();
        animal.makeSound();
    }
}

// Concrete creators
class DogFactory extends AnimalFactory {
    Animal createAnimal() { return new Dog(); }
}

class CatFactory extends AnimalFactory {
    Animal createAnimal() { return new Cat(); }
}

// Usage
AnimalFactory factory = new DogFactory();
factory.playWithAnimal(); // Output: Woof!
```

### 3. Builder Pattern
Constructs complex objects step by step.

#### Use Cases:
- SQL query builders
- Configuration objects
- Complex UI components
- HTTP request builders

#### Implementation:
```java
public class Car {
    private String engine;
    private String transmission;
    private String color;
    private boolean hasGPS;
    private boolean hasAirConditioning;
    
    private Car(CarBuilder builder) {
        this.engine = builder.engine;
        this.transmission = builder.transmission;
        this.color = builder.color;
        this.hasGPS = builder.hasGPS;
        this.hasAirConditioning = builder.hasAirConditioning;
    }
    
    public static class CarBuilder {
        private String engine;
        private String transmission;
        private String color;
        private boolean hasGPS = false;
        private boolean hasAirConditioning = false;
        
        public CarBuilder setEngine(String engine) {
            this.engine = engine;
            return this;
        }
        
        public CarBuilder setTransmission(String transmission) {
            this.transmission = transmission;
            return this;
        }
        
        public CarBuilder setColor(String color) {
            this.color = color;
            return this;
        }
        
        public CarBuilder setGPS(boolean hasGPS) {
            this.hasGPS = hasGPS;
            return this;
        }
        
        public CarBuilder setAirConditioning(boolean hasAirConditioning) {
            this.hasAirConditioning = hasAirConditioning;
            return this;
        }
        
        public Car build() {
            return new Car(this);
        }
    }
}

// Usage
Car car = new Car.CarBuilder()
    .setEngine("V6")
    .setTransmission("Automatic")
    .setColor("Red")
    .setGPS(true)
    .setAirConditioning(true)
    .build();
```

## Structural Patterns

### 1. Adapter Pattern
Allows incompatible interfaces to work together.

#### Use Cases:
- Legacy system integration
- Third-party library integration
- Data format conversion

#### Implementation:
```java
// Target interface (what client expects)
interface MediaPlayer {
    void play(String audioType, String fileName);
}

// Adaptee (existing incompatible interface)
interface AdvancedMediaPlayer {
    void playVlc(String fileName);
    void playMp4(String fileName);
}

class VlcPlayer implements AdvancedMediaPlayer {
    public void playVlc(String fileName) {
        System.out.println("Playing vlc file: " + fileName);
    }
    
    public void playMp4(String fileName) {
        // Do nothing
    }
}

class Mp4Player implements AdvancedMediaPlayer {
    public void playVlc(String fileName) {
        // Do nothing
    }
    
    public void playMp4(String fileName) {
        System.out.println("Playing mp4 file: " + fileName);
    }
}

// Adapter
class MediaAdapter implements MediaPlayer {
    AdvancedMediaPlayer advancedPlayer;
    
    public MediaAdapter(String audioType) {
        if (audioType.equalsIgnoreCase("vlc")) {
            advancedPlayer = new VlcPlayer();
        } else if (audioType.equalsIgnoreCase("mp4")) {
            advancedPlayer = new Mp4Player();
        }
    }
    
    public void play(String audioType, String fileName) {
        if (audioType.equalsIgnoreCase("vlc")) {
            advancedPlayer.playVlc(fileName);
        } else if (audioType.equalsIgnoreCase("mp4")) {
            advancedPlayer.playMp4(fileName);
        }
    }
}

// Client
class AudioPlayer implements MediaPlayer {
    MediaAdapter mediaAdapter;
    
    public void play(String audioType, String fileName) {
        if (audioType.equalsIgnoreCase("mp3")) {
            System.out.println("Playing mp3 file: " + fileName);
        } else if (audioType.equalsIgnoreCase("vlc") || 
                   audioType.equalsIgnoreCase("mp4")) {
            mediaAdapter = new MediaAdapter(audioType);
            mediaAdapter.play(audioType, fileName);
        } else {
            System.out.println("Invalid media. " + audioType + " format not supported");
        }
    }
}
```

### 2. Decorator Pattern
Adds new functionality to objects dynamically without altering structure.

#### Use Cases:
- UI component enhancement
- Data stream processing
- Web application middleware
- Coffee shop ordering system

#### Implementation:
```java
// Component interface
interface Coffee {
    double getCost();
    String getDescription();
}

// Concrete component
class SimpleCoffee implements Coffee {
    public double getCost() { return 2.0; }
    public String getDescription() { return "Simple coffee"; }
}

// Base decorator
abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;
    
    public CoffeeDecorator(Coffee coffee) {
        this.coffee = coffee;
    }
    
    public double getCost() { return coffee.getCost(); }
    public String getDescription() { return coffee.getDescription(); }
}

// Concrete decorators
class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) { super(coffee); }
    
    public double getCost() { return coffee.getCost() + 0.5; }
    public String getDescription() { return coffee.getDescription() + ", Milk"; }
}

class SugarDecorator extends CoffeeDecorator {
    public SugarDecorator(Coffee coffee) { super(coffee); }
    
    public double getCost() { return coffee.getCost() + 0.2; }
    public String getDescription() { return coffee.getDescription() + ", Sugar"; }
}

class WhipDecorator extends CoffeeDecorator {
    public WhipDecorator(Coffee coffee) { super(coffee); }
    
    public double getCost() { return coffee.getCost() + 0.7; }
    public String getDescription() { return coffee.getDescription() + ", Whip"; }
}

// Usage
Coffee coffee = new SimpleCoffee();
coffee = new MilkDecorator(coffee);
coffee = new SugarDecorator(coffee);
coffee = new WhipDecorator(coffee);

System.out.println(coffee.getDescription() + " $" + coffee.getCost());
// Output: Simple coffee, Milk, Sugar, Whip $3.4
```

### 3. Facade Pattern
Provides simplified interface to complex subsystem.

#### Use Cases:
- API simplification
- Legacy system wrapping
- Complex library interfaces
- Microservice orchestration

#### Implementation:
```java
// Complex subsystem classes
class CPU {
    public void freeze() { System.out.println("CPU frozen"); }
    public void jump(long position) { System.out.println("CPU jumping to " + position); }
    public void execute() { System.out.println("CPU executing"); }
}

class Memory {
    public void load(long position, byte[] data) {
        System.out.println("Loading data to memory at " + position);
    }
}

class HardDrive {
    public byte[] read(long lba, int size) {
        System.out.println("Reading " + size + " bytes from sector " + lba);
        return new byte[size];
    }
}

// Facade
class Computer {
    private CPU cpu;
    private Memory memory;
    private HardDrive hardDrive;
    
    public Computer() {
        cpu = new CPU();
        memory = new Memory();
        hardDrive = new HardDrive();
    }
    
    public void startComputer() {
        cpu.freeze();
        memory.load(0, hardDrive.read(0, 1024));
        cpu.jump(0);
        cpu.execute();
        System.out.println("Computer started successfully!");
    }
}

// Usage
Computer computer = new Computer();
computer.startComputer(); // Simple interface hides complexity
```

## Behavioral Patterns

### 1. Observer Pattern
Defines one-to-many dependency between objects.

#### Use Cases:
- Model-View architectures
- Event handling systems
- News subscription services
- Stock price monitoring

#### Implementation:
```java
import java.util.*;

// Subject interface
interface Subject {
    void registerObserver(Observer observer);
    void removeObserver(Observer observer);
    void notifyObservers();
}

// Observer interface
interface Observer {
    void update(float temperature, float humidity, float pressure);
}

// Concrete subject
class WeatherData implements Subject {
    private List<Observer> observers;
    private float temperature;
    private float humidity;
    private float pressure;
    
    public WeatherData() {
        observers = new ArrayList<>();
    }
    
    public void registerObserver(Observer observer) {
        observers.add(observer);
    }
    
    public void removeObserver(Observer observer) {
        observers.remove(observer);
    }
    
    public void notifyObservers() {
        for (Observer observer : observers) {
            observer.update(temperature, humidity, pressure);
        }
    }
    
    public void measurementsChanged() {
        notifyObservers();
    }
    
    public void setMeasurements(float temperature, float humidity, float pressure) {
        this.temperature = temperature;
        this.humidity = humidity;
        this.pressure = pressure;
        measurementsChanged();
    }
}

// Concrete observers
class CurrentConditionsDisplay implements Observer {
    private float temperature;
    private float humidity;
    
    public void update(float temperature, float humidity, float pressure) {
        this.temperature = temperature;
        this.humidity = humidity;
        display();
    }
    
    public void display() {
        System.out.println("Current conditions: " + temperature + "°F and " + humidity + "% humidity");
    }
}

class StatisticsDisplay implements Observer {
    private List<Float> temperatures = new ArrayList<>();
    
    public void update(float temperature, float humidity, float pressure) {
        temperatures.add(temperature);
        display();
    }
    
    public void display() {
        float avg = (float) temperatures.stream().mapToDouble(Float::doubleValue).average().orElse(0.0);
        float max = (float) temperatures.stream().mapToDouble(Float::doubleValue).max().orElse(0.0);
        float min = (float) temperatures.stream().mapToDouble(Float::doubleValue).min().orElse(0.0);
        
        System.out.println("Avg/Max/Min temperature: " + avg + "/" + max + "/" + min);
    }
}

// Usage
WeatherData weatherData = new WeatherData();
CurrentConditionsDisplay currentDisplay = new CurrentConditionsDisplay();
StatisticsDisplay statsDisplay = new StatisticsDisplay();

weatherData.registerObserver(currentDisplay);
weatherData.registerObserver(statsDisplay);

weatherData.setMeasurements(80, 65, 30.4f);
weatherData.setMeasurements(82, 70, 29.2f);
```

### 2. Strategy Pattern
Defines family of algorithms and makes them interchangeable.

#### Use Cases:
- Payment processing systems
- Sorting algorithms
- Compression algorithms
- Route calculation

#### Implementation:
```java
// Strategy interface
interface PaymentStrategy {
    void pay(double amount);
}

// Concrete strategies
class CreditCardPayment implements PaymentStrategy {
    private String cardNumber;
    private String name;
    
    public CreditCardPayment(String cardNumber, String name) {
        this.cardNumber = cardNumber;
        this.name = name;
    }
    
    public void pay(double amount) {
        System.out.println("Paid $" + amount + " using Credit Card " + cardNumber);
    }
}

class PayPalPayment implements PaymentStrategy {
    private String email;
    
    public PayPalPayment(String email) {
        this.email = email;
    }
    
    public void pay(double amount) {
        System.out.println("Paid $" + amount + " using PayPal account " + email);
    }
}

class BitcoinPayment implements PaymentStrategy {
    private String walletAddress;
    
    public BitcoinPayment(String walletAddress) {
        this.walletAddress = walletAddress;
    }
    
    public void pay(double amount) {
        System.out.println("Paid $" + amount + " using Bitcoin wallet " + walletAddress);
    }
}

// Context
class ShoppingCart {
    private List<Item> items;
    private PaymentStrategy paymentStrategy;
    
    public ShoppingCart() {
        items = new ArrayList<>();
    }
    
    public void addItem(Item item) {
        items.add(item);
    }
    
    public void setPaymentStrategy(PaymentStrategy paymentStrategy) {
        this.paymentStrategy = paymentStrategy;
    }
    
    public void checkout() {
        double total = items.stream().mapToDouble(Item::getPrice).sum();
        paymentStrategy.pay(total);
    }
}

class Item {
    private String name;
    private double price;
    
    public Item(String name, double price) {
        this.name = name;
        this.price = price;
    }
    
    public double getPrice() { return price; }
}

// Usage
ShoppingCart cart = new ShoppingCart();
cart.addItem(new Item("Book", 15.99));
cart.addItem(new Item("Pen", 2.50));

cart.setPaymentStrategy(new CreditCardPayment("1234-5678-9012-3456", "John Doe"));
cart.checkout(); // Paid $18.49 using Credit Card

cart.setPaymentStrategy(new PayPalPayment("john@example.com"));
cart.checkout(); // Paid $18.49 using PayPal
```

### 3. Command Pattern
Encapsulates requests as objects, allowing parameterization and queuing.

#### Use Cases:
- GUI buttons and menu items
- Macro recording
- Undo/redo functionality
- Job queues and scheduling

#### Implementation:
```java
// Command interface
interface Command {
    void execute();
    void undo();
}

// Receiver
class Light {
    private boolean isOn = false;
    
    public void turnOn() {
        isOn = true;
        System.out.println("Light is ON");
    }
    
    public void turnOff() {
        isOn = false;
        System.out.println("Light is OFF");
    }
}

// Concrete commands
class LightOnCommand implements Command {
    private Light light;
    
    public LightOnCommand(Light light) {
        this.light = light;
    }
    
    public void execute() {
        light.turnOn();
    }
    
    public void undo() {
        light.turnOff();
    }
}

class LightOffCommand implements Command {
    private Light light;
    
    public LightOffCommand(Light light) {
        this.light = light;
    }
    
    public void execute() {
        light.turnOff();
    }
    
    public void undo() {
        light.turnOn();
    }
}

// Invoker
class RemoteControl {
    private Command[] onCommands;
    private Command[] offCommands;
    private Command lastCommand;
    
    public RemoteControl() {
        onCommands = new Command[7];
        offCommands = new Command[7];
        
        Command noCommand = new NoCommand();
        for (int i = 0; i < 7; i++) {
            onCommands[i] = noCommand;
            offCommands[i] = noCommand;
        }
        lastCommand = noCommand;
    }
    
    public void setCommand(int slot, Command onCommand, Command offCommand) {
        onCommands[slot] = onCommand;
        offCommands[slot] = offCommand;
    }
    
    public void onButtonPressed(int slot) {
        onCommands[slot].execute();
        lastCommand = onCommands[slot];
    }
    
    public void offButtonPressed(int slot) {
        offCommands[slot].execute();
        lastCommand = offCommands[slot];
    }
    
    public void undoButtonPressed() {
        lastCommand.undo();
    }
}

class NoCommand implements Command {
    public void execute() {}
    public void undo() {}
}

// Usage
RemoteControl remote = new RemoteControl();
Light livingRoomLight = new Light();

LightOnCommand livingRoomLightOn = new LightOnCommand(livingRoomLight);
LightOffCommand livingRoomLightOff = new LightOffCommand(livingRoomLight);

remote.setCommand(0, livingRoomLightOn, livingRoomLightOff);
remote.onButtonPressed(0);  // Light is ON
remote.offButtonPressed(0); // Light is OFF
remote.undoButtonPressed(); // Light is ON (undo off command)
```

## Modern Patterns

### 1. Model-View-Controller (MVC)
Separates application logic into three interconnected components.

#### Components:
- **Model**: Data and business logic
- **View**: User interface
- **Controller**: Handles user input and updates model/view

### 2. Dependency Injection
Provides dependencies to an object rather than having it create them.

```java
// Without DI - tight coupling
class OrderService {
    private EmailService emailService = new EmailService(); // Hard dependency
    
    public void processOrder(Order order) {
        // Process order
        emailService.sendConfirmation(order.getCustomerEmail());
    }
}

// With DI - loose coupling
class OrderService {
    private EmailService emailService;
    
    public OrderService(EmailService emailService) {
        this.emailService = emailService; // Injected dependency
    }
    
    public void processOrder(Order order) {
        // Process order
        emailService.sendConfirmation(order.getCustomerEmail());
    }
}
```

## Anti-Patterns to Avoid

### 1. God Object
- Single class that knows too much or does too much
- Violates single responsibility principle

### 2. Spaghetti Code
- Complex and tangled control structure
- Difficult to follow program flow

### 3. Copy-Paste Programming
- Duplicating code instead of creating reusable solutions
- Makes maintenance difficult

## Best Practices

1. **Understand the Problem**: Don't force patterns where they don't fit
2. **Start Simple**: Add patterns when complexity justifies them
3. **Favor Composition**: Over inheritance when possible
4. **Program to Interfaces**: Not concrete implementations
5. **Keep It Simple**: Don't over-engineer solutions

## Study Tips

1. **Implement Examples**: Code each pattern yourself
2. **Identify Use Cases**: Think of real-world applications
3. **Understand Relationships**: How patterns work together
4. **Practice Recognition**: Identify patterns in existing codebases
5. **Learn Trade-offs**: When to use each pattern and when not to