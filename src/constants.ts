import { Color } from "./types";

// Generate a grid of colors similar to Hues and Cues
// The original has 480 colors. Let's do a 16x30 grid.
export const generateColorGrid = (): Color[] => {
  const rows = 24;
  const cols = 30;
  const grid: Color[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Generate a smooth spectrum
      // Hue varies by column
      const h = (c / cols) * 360;
      
      // Saturation: Peak in the middle-top, then fade out as we get lighter
      const s = r < 8 
        ? 60 + (r / 8) * 40 
        : Math.max(10, 100 - ((r - 8) / (rows - 8)) * 80);
      
      // Lightness: 20% (dark) to 96% (near white)
      const l = 20 + (r / (rows - 1)) * 76;
      
      grid.push({
        id: `${r}-${c}`,
        hex: `hsl(${h}, ${s}%, ${l}%)`,
        row: r,
        col: c,
      });
    }
  }

  return grid;
};

export const COLOR_GRID = generateColorGrid();
