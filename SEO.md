# SEO build and deployment

`npm run build` generates page-specific descriptions in the document head, canonical URLs, Open Graph / Twitter metadata, WebSite / WebPage JSON-LD, robots.txt and sitemap.xml. `npm run check:seo` validates the output. Metadata and public routes are maintained in `seo/config.json`.

Publish **dist/**, using the existing build command. No SEO-only informational section or sitewide link list is appended to the visible page. The existing interactive app remains responsible for visible content, wallet interaction and live chain data. Search engines discover the XML sitemap through the `Sitemap:` entry in `robots.txt`; no visible sitemap link is required. No balances, rankings or security scores are fabricated at build time. SPA navigation updates only document-head metadata. Static catalog listings remain available in directory HTML. Private/unknown routes use noindex; robots.txt permits crawling so search engines can see that directive.

The Vercel routing configuration serves generated route HTML before the SPA fallback. Other hosts must serve existing files first and send unmatched SPA routes to `404.html` (which retains the app scripts and contains noindex). `/Home` is an alias of `/` only in Savings Game. Keep canonical domain redirects at the hosting layer, and redirect HTTP to HTTPS. Do not add hreflang for browser-only language switches without separate translated URLs.

After deployment, verify the raw HTML of each sitemap URL, robots.txt and sitemap.xml over HTTPS. Submit the sitemap in Google Search Console and Bing Webmaster Tools using an owner account. Request indexing for the homepage and key documentation pages. Check indexing, canonical selection and impressions over the following weeks; deployment and sitemap submission do not guarantee indexing or rankings.

Keep project descriptions and documentation accurate as products change. Directory HTML is regenerated from the existing catalog on every build. Do not create keyword-only pages, invented reviews or guaranteed-return claims. Search Console verification tokens must come from the site owner.

Validation command: `npm run build && npm run check:seo`. The checks fail on duplicate canonical/title tags, missing page descriptions, invalid JSON-LD, missing referenced build assets, incorrect sitemap URLs, missing social images, injected SEO footers, or indexing private routes. Alias canonical URLs and the document language are checked as well.

`src/seo-config.ts` is generated from `seo/config.json` before the build; edit the JSON source, then run the build.
