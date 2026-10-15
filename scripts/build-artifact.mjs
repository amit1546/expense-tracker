// Bundles the Vite build (dist/) into one self-contained HTML file, dist/expense-tracker.html,
// for hosting as a claude.ai Artifact. The Artifact tool wraps the file in <html>/<body>, so this
// writes page content only. Run via `npm run build:artifact`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const assets = readdirSync('dist/assets');
const read = (ext) => readFileSync(`dist/assets/${assets.find((f) => f.endsWith(ext))}`, 'utf8');

const css = read('.css');
const js = read('.js').replaceAll('</script', '<\\/script'); // keep the inline script from closing early

const page = `<title>מעקב הוצאות</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap">
<style>${css}</style>
<div id="root" dir="rtl" lang="he"></div>
<script type="module">${js}</script>
`;

writeFileSync('dist/expense-tracker.html', page);
console.log(`dist/expense-tracker.html (${Math.round(page.length / 1024)} KB)`);
