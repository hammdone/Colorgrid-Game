# ColorGrid Game

A 2-player, turn-based color conquest game built with the MERN stack.

## Setup Instructions

### Server Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

### Client Setup
1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the client:
   ```bash
   npm run dev
   ```

The app will be running at http://localhost:5173

## Game Rules
- Each player is assigned a random color
- Players take turns selecting cells on a 5x5 grid
- Game ends when all cells are filled
- Winner is determined by the largest connected block of their color
- Connected blocks are counted horizontally and vertically (no diagonals)
- Draws are possible