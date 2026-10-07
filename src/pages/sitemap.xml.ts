import type { APIRoute } from 'astro';
import { site } from '../config';
import { defaultLang, langs, routes, type PageKey } from '../i18n';

const abs = (path: string) => new URL(path, site.url).href;

export const GET: APIRoute = () => {
  const urls = (Object.keys(routes) as PageKey[]).flatMap((page) =>
    langs.map((lang) => {
      const alternates = [
        ...langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(routes[page][l])}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(routes[page][defaultLang])}"/>`,
      ].join('\n');
      return `  <url>\n    <loc>${abs(routes[page][lang])}</loc>\n${alternates}\n  </url>`;
    }),
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
