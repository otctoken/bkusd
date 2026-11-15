# SEO build and deployment

`npm run build` generates static page descriptions, canonical URLs, Open Graph / Twitter metadata, WebSite / WebPage JSON-LD, robots.txt and sitemap.xml. `npm run check:seo` validates the output. Metadata and public routes are maintained in `seo/config.json`.

Publish **dist/**, using the existing build command. A visible informational section is included in HTML for readers and crawlers without JavaScript; the existing interactive app remains responsible for wallet and live chain data. No balances, rankings or security scores are fabricated at build time. SPA navigation updates only the SEO metadata and informational section. Private/unknown routes use noindex; robots.txt permits crawling so search engines can see that directive.

The Vercel routing configuration serves generated route HTML before the SPA fallback. Other hosts must serve existing files first and send unmatched SPA routes to `404.html` (which retains the app scripts and contains noindex). `/Home` is an alias of `/` only in Savings Game. Keep canonical domain redirects at the hosting layer, and redirect HTTP to HTTPS. Do not add hreflang for browser-only language switches without separate translated URLs.

After deployment, verify the raw HTML of each sitemap URL, robots.txt and sitemap.xml over HTTPS. Submit the sitemap in Google Search Console and Bing Webmaster Tools using an owner account. Request indexing for the homepage and key documentation pages. Check indexing, canonical selection and impressions over the following weeks; deployment and sitemap submission do not guarantee indexing or rankings.

Keep project descriptions and documentation accurate as products change. Directory HTML is regenerated from the existing catalog on every build. Do not create keyword-only pages, invented reviews or guaranteed-return claims. Search Console verification tokens must come from the site owner.

Validation command: `npm run build && npm run check:seo`. The checks fail on duplicate canonical/title tags, missing page descriptions, invalid JSON-LD, missing referenced build assets, or indexing private routes.

`src/seo-config.ts` is generated from `seo/config.json` before the build; edit the JSON source, then run the build.
