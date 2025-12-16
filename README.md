# TSPFlights – Air Route Optimization Using Graph Theory

*Academic project focused on applying graph theory and optimization algorithms to a real-world aviation scenario.*

## Project Overview

TSPFlights is a Python-based application that simulates an air route optimization system using graph theory and the Travelling Salesman Problem (TSP).
The goal of the project is to determine the shortest possible route that connects a selected set of airports, visiting each airport exactly once and returning to the starting point.

This project addresses inefficiencies in long or poorly planned flight routes, contributing to operational cost reduction and environmental impact mitigation in commercial aviation.

---

## Objectives

* Model a global air route network as a weighted graph.
* Compute real-world distances between airports using the Haversine formula.
* Solve the Travelling Salesman Problem using Dynamic Programming (DP).
* Visually compare the original route and the optimized route.

---

## Dataset

The project uses the OpenFlights dataset, which contains real-world aviation data including:

* 3,090 airports (nodes)
* ~31,090 air routes (edges)

### Main attributes:

**Nodes (Airports):**

* Airport ID
* Name
* IATA / ICAO codes
* City and country
* Latitude and longitude
* Altitude

**Edges (Routes):**

* Source and destination airport IDs
* Airline
* Number of stops
* Distance (calculated using the Haversine formula)

---

## Methodology and Algorithms

* Travelling Salesman Problem (TSP) – NP-Hard problem
* Dynamic Programming (Memorization)
  Time complexity: `O(n² · 2ⁿ)`
* Graph Traversal (Depth-First Search – DFS) for connectivity exploration
* Haversine Formula for accurate geodesic distance calculation

---

## Technologies Used

* **Python**
* **Flask** (backend framework)
* **HTML & CSS** (frontend)
* **Figma** (UX/UI design)
* **Graph theory and data structures**
* **OpenFlights Dataset**

---

## Key Features

* Interactive map visualization of airports
* User-defined airport selection (minimum 2, maximum 25)
* Node and connectivity validation
* Original route vs optimized route comparison
* Graphical visualization of results:

  * Original route (gray)
  * Optimized route (green)
* Distance metrics and optimization percentage

---

## How to Run the Project

1. Clone the repository:

   ```bash
   git clone https://github.com/bogosorts-team/TSPFlights.git
   ```
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:

   ```bash
   python app.py
   ```
4. Open in your browser:

   ```
   http://localhost:5000
   ```

---

## Results

* Accurate computation of optimal Hamiltonian cycles
* Detection of non-connected routes
* Visual comparison between selected and optimized paths
* Realistic simulation based on real-world aviation data

---

## Authors

* Vanessa Jazmin Barrientos Villalta
* Matías Javier Del Castillo Mendoza
* Vivianne Fátima Ríos Hasegawa

Course: *Algorithmic Complexity*
Universidad Peruana de Ciencias Aplicadas (UPC)

---
