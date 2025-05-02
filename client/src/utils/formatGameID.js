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
    
    // Convert MongoDB ObjectId to a numeric value by taking the timestamp portion
    // This will ensure consistent numbering between sessions
    if (gameId.length >= 8) {
      // Extract the first 8 characters (timestamp portion of ObjectId)
      // and convert to a decimal number, then take modulo 1000 to get a 3-digit number
      const timestampHex = gameId.substring(0, 8);
      const numericId = parseInt(timestampHex, 16) % 1000;
      return `Game #${numericId}`;
    }
    
    // Fallback for non-standard IDs
    return `Game #${gameId.length + 100}`;
  };