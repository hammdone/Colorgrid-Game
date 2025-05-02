export function maxAreaOfIsland(grid) {
  if (!grid || grid.length === 0) {
    return 0;
  }
  const gridCopy = JSON.parse(JSON.stringify(grid));
  
  const rows = gridCopy.length;
  const cols = gridCopy[0].length;
  
  function dfs(row, col, isLandArea) {
    if (row < 0 || row >= rows || col < 0 || col >= cols || gridCopy[row][col] === 0) {
      return;
    }
    gridCopy[row][col] = 0; 
    isLandArea.value += 1;

    dfs(row + 1, col, isLandArea);
    dfs(row - 1, col, isLandArea);
    dfs(row, col + 1, isLandArea);
    dfs(row, col - 1, isLandArea);
  }

  let maxArea = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (gridCopy[row][col] === 1) {
        let isLandArea = { value: 0 };
        dfs(row, col, isLandArea);

        if (isLandArea.value > maxArea) {
          maxArea = isLandArea.value;
        }
      }
    }
  }
  return maxArea;
}