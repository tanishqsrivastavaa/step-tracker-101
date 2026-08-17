// Tailwind CSS v4 is wired in as a PostCSS plugin. All theme/config lives in
// app/globals.css via the @theme block — there is no tailwind.config.js in v4.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
