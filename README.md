
# Pump Radar — Camera + Upload + OCR (No keys)

- **Camera** uses getUserMedia (mobile/desktop) to capture a frame.
- **Upload** reads JPG/PNG.
- **OCR** via Tesseract.js extracts text (name + set/number) and auto-searches.
- Results repaint the dashboard via serverless scrapers.

## Deploy
1) Push this folder to a GitHub repo (root should have package.json, next.config.js, pages/, styles/).
2) In Vercel: New Project → Import from GitHub → Deploy.

## Local
npm i
npm run dev
