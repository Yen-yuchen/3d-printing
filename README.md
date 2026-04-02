# Web-Based Generative Design & Simulation for Elastic 3D Prints

## Overview
This project is a web-based application that enables users to design, simulate, and export elastic 3D-printable models. It combines generative design techniques (perforation and lattice structures) with physics-based simulation to allow rapid iteration of functional designs.

Users can upload 3D models, apply constraints, simulate deformation using Finite Element Analysis (FEA), and export optimized models for 3D printing.

---

## Features

- 3D Model Upload
  - Supports STL, OBJ, and GLTF file formats

- Generative Design
  - Automated perforation
  - Heterogeneous lattice generation

- Interactive Constraints
  - Adjust stiffness regions
  - Set target deformation
  - Define load points and boundary conditions
  - Choose material properties

- Simulation
  - Deformation simulation using FEA metrics
  - Visualization of results

- Export
  - Export optimized models for 3D printing

---

## Workflow

Upload Model → Set Constraints → Generate Design → Simulate → Refine → Export

---

## System Architecture

The system follows a hybrid architecture:

- Client–Server Architecture
  - Frontend handles UI and visualization
  - Backend performs computation and simulation

- MVC Pattern (Frontend)
  - Separation of UI, logic, and data handling

- Pipe-and-Filter Pipeline (Backend)
  - Mesh processing pipeline:
    1. Upload & repair mesh  
    2. Volumetric meshing  
    3. Lattice/perforation generation  
    4. FEA simulation  
    5. Refinement  
    6. Export  

- Repository Pattern
  - Central storage for models, simulations, and metadata

---

## Tech Stack (Planned)

### Frontend
- HTML, CSS, TypeScript
- Web-based 3D visualization (e.g., Three.js)

### Backend
- Server for computation-heavy tasks (CPU/GPU)
- Mesh processing and simulation modules

### Tools
- GitHub (version control)
- Trello / Discord (project management)
- Draw.io (UML diagrams)
- VS Code / JetBrains IDEs

---

## Functional Requirements

- Upload 3D models (STL/OBJ/GLTF)
- Apply generative design (lattice + perforation)
- Adjust constraints through UI
- Run deformation simulations (FEA)
- Export modified models

---

## Non-Functional Requirements

- Handle files up to ~1 GB
- Simulation completes within ~5 minutes
- System available during institutional operating hours
- Exported models must be valid for 3D printing

---

## Testing Strategy

- Format Compatibility Test
  - Validate supported file formats

- Constraint Validation Test
  - Ensure valid user input (e.g., no negative stiffness)

- Mesh Integrity Test
  - Detect non-manifold geometry

- Simulation Accuracy Test
  - Compare FEA results with known benchmarks

- Export Validation Test
  - Ensure printable, valid mesh output

---
