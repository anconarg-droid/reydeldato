const path = require("path");

/**
 * Sin esto, `@import "tailwindcss"` se resuelve desde `process.cwd()` (p. ej. Desktop)
 * si el dev server no arranca en la raíz del repo → "Can't resolve 'tailwindcss'".
 */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {
      base: path.resolve(__dirname),
    },
  },
};
