try {
  require('pdf-parse');
  console.log("pdf-parse required successfully without polyfill!");
} catch (e) {
  console.error("Failed without polyfill:", e.message);
}
