import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const GameContext = createContext();

export function GameProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to game server');
    });

    newSocket.on('gameState', (state) => {
      setGameState(state);
    });

    newSocket.on('gameOver', (result) => {
      setGameState((prev) => ({
        ...prev,
        status: result.draw ? 'draw' : 'finished',
        winner: result.winner
      }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinGame = () => {
    if (socket) {
      socket.emit('joinGame');
    }
  };

  const makeMove = (row, col) => {
    if (socket) {
      socket.emit('makeMove', { row, col });
    }
  };

  const value = {
    socket,
    gameState,
    joinGame,
    makeMove
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
