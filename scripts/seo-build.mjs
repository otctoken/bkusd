import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const config = JSON.parse(await readFile('seo/config.json', 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
let directory;
if (config.origin === 'https://nav.dappnav.org') {
  const ts = await import('typescript');
  const source = await readFile('src/data.ts', 'utf8');
  const code = ts.default.transpileModule(source, { compilerOptions: { module: ts.default.ModuleKind.ESNext } }).outputText;
  directory = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  for (const category of directory.categories) config.pages.push({path:'/categories/'+category.toLowerCase().replace(/[^a-z0-9]+/g,'-'), title:`Sui ${category} Projects | DappNav`, description:`Explore ${category} projects in the Sui ecosystem, with project descriptions and website links from the DappNav directory.`, paragraphs:[`Browse Sui ${category} projects below. Return to the interactive directory to search across all categories. Listings are discovery resources, not endorsements.`], category});
}
const file = path => path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
const content = page => `<section id="seo-content" aria-label="About this page" style="max-width:72rem;margin:2rem auto;padding:1.5rem;line-height:1.7"><h2>${esc(page.title)}</h2>${page.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}<nav aria-label="Explore ${esc(config.name)}">${config.pages.map(p => `<a style="margin-right:1rem" href="${esc(p.path)}">${esc(p.title)}</a>`).join(' ')}</nav></section>`;

if (!process.argv.includes('--check')) {
  let template = await readFile('dist/index.html', 'utf8');
  template = template.replace(/<title>[\s\S]*?<\/title>/gi, '').replace(/<meta\b(?=[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["']og:[^"']+["']))[^>]*>/gi, '').replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi, '');
  // Rebuilding starts from the original Vite/static build, never the prior SEO output.
  let catalog = '';
  if (config.origin === 'https://nav.dappnav.org') {
    const { projects, categories } = directory;
    catalog = `<main style="max-width:72rem;margin:auto;padding:2rem"><h1>Sui DApp Directory</h1>${categories.map(category => `<section><h2>${esc(category)}</h2><ul>${projects.filter(p => p.category === category).map(p => `<li><a href="${esc(new URL(p.url).href)}" rel="noopener noreferrer">${esc(p.name)}</a> — ${esc(p.description)}</li>`).join('')}</ul></section>`).join('')}</main>`;
    template = template.replace(/<div id="root">[\s\S]*<\/div>\s*(?=<\/body>)/, `<div id="root">${catalog}</div>\n`);
    // Vite moves module scripts to head, leaving only the loader in the root.
    assert(!template.includes('SuiNav Loading'), 'Directory loader must be replaced by catalog HTML');
  }
  if (config.origin === 'https://www.dappnav.org') {
    const apps = JSON.parse(await readFile('data/dapps.json', 'utf8'));
    const { card } = await import('../assets/card.mjs');
    template = template.replace(/(<div class="app-grid" id="app-grid" aria-busy=")true("><\/div>)/, `$1false">${apps.map(card).join('')}</div>`);
    template = template.replace('<main aria-label="DApp Nav">', '<main aria-label="DApp Nav"><h1>Sui 生态应用导航</h1>');
    template = template.replace('<p class="status" id="status" role="status">....</p>', '<p class="status" id="status" role="status" hidden></p>');
  }
  const render = (page, index = true, canonicalPath = page.path) => {
    const url = config.origin + canonicalPath;
    const head = `<title>${esc(page.title)}</title>\n<meta name="description" content="${esc(page.description)}">\n<meta name="robots" content="${index ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">\n${index ? `<link rel="canonical" href="${esc(url)}">` : ''}\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="${esc(config.name)}">\n<meta property="og:title" content="${esc(page.title)}">\n<meta property="og:description" content="${esc(page.description)}">\n${index ? `<meta property="og:url" content="${esc(url)}">` : ''}\n<meta name="twitter:card" content="summary">\n<meta name="twitter:title" content="${esc(page.title)}">\n<meta name="twitter:description" content="${esc(page.description)}">\n${config.image ? `<meta property="og:image" content="${config.origin}${config.image}"><meta name="twitter:image" content="${config.origin}${config.image}">` : ''}\n${index ? `<script id="seo-schema" type="application/ld+json">${json({'@context':'https://schema.org','@type':page.path === '/' ? 'WebSite' : 'WebPage',name:page.title,description:page.description,url,inLanguage:config.lang})}</script>` : ''}`;
    let base = template;
    if (page.category) {
      // Static category pages keep the complete catalog visible without JS or wallet providers.
      const entries = directory.projects.filter(p=>p.category===page.category);
      const listing = `<main style="max-width:72rem;margin:auto;padding:2rem"><h1>${esc(page.title)}</h1><a href="/">Search all Sui projects</a><ul>${entries.map(p=>`<li><h2><a href="${esc(new URL(p.url).href)}" rel="noopener noreferrer">${esc(p.name)}</a></h2><p>${esc(p.description)}</p></li>`).join('')}</ul></main>`;
      base = base.replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<div id="root">[\s\S]*<\/div>\s*(?=<\/body>)/,`<div id="root">${listing}</div>\n`);
    }
    return base.replace('</head>', head + '\n</head>').replace('</body>', (index ? content(page) : '') + '\n</body>');
  };
  for (const page of config.pages) {
    const target = file(page.path); await mkdir(target.slice(0,target.lastIndexOf('/')), {recursive:true}); await writeFile(target, render(page));
  }
  for (const [alias, canonical] of Object.entries(config.aliases)) {
    await mkdir(`dist${alias}`, {recursive:true}); await writeFile(file(alias), render(config.pages.find(p=>p.path===canonical),true,canonical));
  }
  const fallback = render({path:'/404',title:config.name,description:'Open the application to view this page.'}, false);
  await writeFile('dist/404.html', fallback);
  for (const path of config.private) { await mkdir(`dist${path}`,{recursive:true}); await writeFile(file(path),fallback); }
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${config.origin}/sitemap.xml\n`);
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${config.pages.map(p=>`<url><loc>${esc(config.origin+p.path)}</loc></url>`).join('')}</urlset>\n`);
}
for (const page of config.pages) {
  const html = await readFile(file(page.path),'utf8');
  assert.equal((html.match(/<title>/g)||[]).length,1);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  assert(html.includes(`href="${esc(config.origin+page.path)}"`));
  assert(html.includes(esc(page.description)) && html.includes('id="seo-content"'));
  assert(!html.includes('noindex'));
  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) JSON.parse(match[1]);
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) await access('dist'+match[1]);
}
assert((await readFile('dist/404.html','utf8')).includes('noindex, follow'));
const sitemap = await readFile('dist/sitemap.xml','utf8');
assert.equal((sitemap.match(/<loc>/g)||[]).length,config.pages.length);
for (const path of config.private) { assert(!sitemap.includes(`<loc>${config.origin}${path}</loc>`)); assert((await readFile(file(path),'utf8')).includes('noindex, follow')); }
assert((await readFile('dist/robots.txt','utf8')).includes(config.origin+'/sitemap.xml'));
console.log(`SEO verified: ${config.name}, ${config.pages.length} public pages, crawlable HTML and metadata.`);
