import React from 'react';

function ColorGrid({ grid, onCellClick, playerColor, currentTurn, username, readOnly = false }) {
  const safeGrid = Array.isArray(grid) ? grid : Array(5).fill().map(() => Array(5).fill(null));
  
  const isPlayerTurn = currentTurn === username;
  
  return (
    <div className="grid">
      {safeGrid.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid-row">
          {row.map((cell, colIndex) => {
            const isEmpty = cell === null || cell === 0;
            const isClickable = !readOnly && isPlayerTurn && isEmpty;
            
            const cellStyle = {
              backgroundColor: cell || 'rgba(255, 255, 255, 0.1)',
              cursor: isClickable ? 'pointer' : 'default'
            };
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="cell"
                style={cellStyle}
                onClick={() => {
                  if (isClickable) {
                    onCellClick(rowIndex, colIndex);
                  }
                }}
                data-row={rowIndex}
                data-col={colIndex}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default ColorGrid;