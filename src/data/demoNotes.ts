import { Note } from '../types';

export const demoNotes: Note[] = [
  {
    id: '1',
    title: 'Introduction to Neural Networks',
    content: `# Neural Networks

Neural networks are a series of algorithms that aim to recognize underlying relationships in a set of data through a process that mimics the way the human brain operates.

## Key Components

### Neurons
The basic unit of computation in a neural network. Each neuron receives input, processes it, and passes it on.

### Layers
- **Input Layer**: Receives the initial data
- **Hidden Layers**: Perform computations and feature extraction
- **Output Layer**: Produces the final result

### Activation Functions
Functions that determine the output of a neural network node given a set of inputs:
- Sigmoid
- ReLU (Rectified Linear Unit)
- Tanh
- Softmax

## Training Process
1. **Forward Propagation**: Data flows through the network
2. **Loss Calculation**: Measure of how far the prediction is from the target
3. **Backpropagation**: Adjusts weights to minimize loss
4. **Optimization**: Updates weights using algorithms like Gradient Descent

Neural networks are the foundation of many modern AI systems and deep learning applications.`,
    tags: ['AI', 'Machine Learning', 'Neural Networks'],
    createdAt: new Date('2023-05-15'),
    updatedAt: new Date('2023-05-15'),
  },
  {
    id: '2',
    title: 'Cell Biology Fundamentals',
    content: `# Cell Biology Fundamentals

The cell is the fundamental unit of life, capable of replicating independently and consisting of a cell membrane, cytoplasm, and genetic material.

## Cell Structure

### Cell Membrane
- Phospholipid bilayer with embedded proteins
- Controls what enters and exits the cell
- Maintains cell integrity

### Cytoplasm
- Gel-like substance where cellular components are suspended
- Contains cytoskeleton for structure and mobility
- Houses various organelles

### Nucleus
- Command center of the cell
- Contains DNA (genetic material)
- Surrounded by nuclear membrane

## Organelles and Their Functions

### Mitochondria
- Powerhouse of the cell
- Produces ATP through cellular respiration
- Has its own DNA (mitochondrial DNA)

### Endoplasmic Reticulum (ER)
- **Rough ER**: Contains ribosomes, involved in protein synthesis
- **Smooth ER**: Involved in lipid synthesis and detoxification

### Golgi Apparatus
- Modifies, sorts, and packages proteins for secretion or use within the cell
- Forms vesicles for transport

### Lysosomes
- Contain digestive enzymes
- Break down cellular waste and foreign materials

## Cell Division

### Mitosis
- Division of somatic cells
- Results in two identical daughter cells
- Important for growth and repair

### Meiosis
- Division for sexual reproduction
- Results in four haploid cells
- Involves genetic recombination`,
    tags: ['Biology', 'Cell', 'Organelles'],
    createdAt: new Date('2023-05-20'),
    updatedAt: new Date('2023-05-21'),
  },
  {
    id: '3',
    title: 'Introduction to Calculus',
    content: `# Introduction to Calculus

Calculus is the mathematical study of continuous change, divided into differential calculus and integral calculus.

## Limits

A limit is the value that a function approaches as the input approaches some value.

### Notation
$$\\lim_{x \\to a} f(x) = L$$

This means that as $x$ gets closer and closer to $a$, $f(x)$ gets closer and closer to $L$.

### Properties of Limits
- $\\lim_{x \\to a} [f(x) + g(x)] = \\lim_{x \\to a} f(x) + \\lim_{x \\to a} g(x)$
- $\\lim_{x \\to a} [f(x) \\cdot g(x)] = \\lim_{x \\to a} f(x) \\cdot \\lim_{x \\to a} g(x)$
- $\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\frac{\\lim_{x \\to a} f(x)}{\\lim_{x \\to a} g(x)}$, provided $\\lim_{x \\to a} g(x) \\neq 0$

## Derivatives

The derivative of a function represents the rate at which the value of the function changes with respect to the change of the input variable.

### Notation
$$f'(x) = \\frac{d}{dx}f(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

### Basic Rules
- Power Rule: $\\frac{d}{dx}(x^n) = nx^{n-1}$
- Product Rule: $\\frac{d}{dx}[f(x)g(x)] = f'(x)g(x) + f(x)g'(x)$
- Chain Rule: $\\frac{d}{dx}[f(g(x))] = f'(g(x))g'(x)$

## Integrals

The integral of a function represents the area under the curve of the function.

### Notation
$$\\int f(x) dx = F(x) + C$$

where $F'(x) = f(x)$ and $C$ is a constant.

### Properties
- $\\int [f(x) + g(x)] dx = \\int f(x) dx + \\int g(x) dx$
- $\\int cf(x) dx = c \\int f(x) dx$ for any constant $c$

## Fundamental Theorem of Calculus

The fundamental theorem of calculus establishes the connection between differentiation and integration:

$$\\int_a^b f(x) dx = F(b) - F(a)$$

where $F'(x) = f(x)$.`,
    tags: ['Mathematics', 'Calculus', 'Derivatives', 'Integrals'],
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-02'),
  }
];