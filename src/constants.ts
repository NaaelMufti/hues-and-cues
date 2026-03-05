import { Color } from "./types";

// Generate a grid of colors similar to Hues and Cues
// The original has 480 colors. Let's do a 16x30 grid.
export const generateColorGrid = (): Color[] => {
  const rows = 20;
  const cols = 30;
  const grid: Color[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Generate a smooth spectrum
      // Hue varies by column
      const h = (c / cols) * 360;
      
      // Saturation: Peak in the middle-top, then fade out
      // We use 24 as the base to keep the colors identical to the previous version
      const s = r < 8 
        ? 60 + (r / 8) * 40 
        : Math.max(10, 100 - ((r - 8) / (24 - 8)) * 80);
      
      // Lightness: 20% (dark) to 96% (near white)
      // We use (24 - 1) as the denominator to keep the colors identical
      const l = 20 + (r / (24 - 1)) * 76;
      
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
