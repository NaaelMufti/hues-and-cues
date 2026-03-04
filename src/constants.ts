import { Color } from "./types";

// Generate a grid of colors similar to Hues and Cues
// The original has 480 colors. Let's do a 16x30 grid.
export const generateColorGrid = (): Color[] => {
  const rows = 16;
  const cols = 30;
  const grid: Color[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Generate a smooth spectrum
      // Hue varies by column, Lightness/Saturation by row
      const h = (c / cols) * 360;
      const s = 60 + (r < rows / 2 ? (r / (rows / 2)) * 40 : ((rows - r) / (rows / 2)) * 40);
      const l = 20 + (r / rows) * 60;
      
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
