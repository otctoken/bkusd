import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import config from './seo-config';

// Isolated SEO effects: no wallet, network, transaction or router mutations.
export default function Seo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.replace(/\/$/, '') || '/';
    const aliases = config.aliases as Record<string, string>;
    const alias = Object.keys(aliases).find(key => key.toLowerCase() === path.toLowerCase());
    const canonicalPath = alias ? aliases[alias] : path;
    const page = config.pages.find(p => p.path.toLowerCase() === canonicalPath.toLowerCase());
    const title = page?.title || config.name;
    const description = page?.description || 'Open the application to view this page.';
    document.title = title;
    const meta = (key: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attribute, key); document.head.appendChild(el); }
      el.content = content;
    };
    meta('description', description);
    meta('robots', page ? 'index, follow, max-image-preview:large' : 'noindex, follow');
    meta('og:title', title, true); meta('og:description', description, true);
    meta('twitter:title', title); meta('twitter:description', description);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (page) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = config.origin + page.path;
      meta('og:url', canonical.href, true);
    } else { canonical?.remove(); document.head.querySelector('meta[property="og:url"]')?.remove(); }
    document.getElementById('seo-schema')?.remove();
    if (page) {
      const schema = document.createElement('script'); schema.id = 'seo-schema'; schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: config.origin + page.path });
      document.head.appendChild(schema);
    }
    let section = document.getElementById('seo-content');
    if (!section) { section = document.createElement('section'); section.id = 'seo-content'; document.body.appendChild(section); }
    section.replaceChildren();
    if (page) {
      section.setAttribute('aria-label', 'About this page');
      section.style.cssText = 'max-width:72rem;margin:2rem auto;padding:1.5rem;line-height:1.7;font:inherit';
      const heading = document.createElement('h2'); heading.textContent = page.title; section.appendChild(heading);
      for (const text of page.paragraphs) { const p = document.createElement('p'); p.textContent = text; section.appendChild(p); }
      const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Explore ' + config.name);
      for (const item of config.pages) { const a = document.createElement('a'); a.href = item.path; a.textContent = item.title; a.style.marginRight = '1rem'; nav.appendChild(a); }
      section.appendChild(nav);
    }
  }, [pathname]);
  return null;
}
