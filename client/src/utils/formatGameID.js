/**
 * Formats a MongoDB ObjectId into a user-friendly game ID
 * @param {string} gameId - The full MongoDB game ID
 * @param {number} index - Optional index for fallback
 * @returns {string} Formatted game ID for display (e.g., "Game #123")
 */
export const formatGameId = (gameId, index = 0) => {
    if (!gameId) {
      return `Game #${100 + index}`;
    }
    
    if (gameId.length >= 8) {
      const timestampHex = gameId.substring(0, 8);
      const numericId = parseInt(timestampHex, 16) % 1000;
      return `Game #${numericId}`;
    }
    

    return `Game #${gameId.length + 100}`;
  };