#!/usr/bin/env python3
"""Blog generator. Tina edits content/blog/*.json only; this writes the HTML.

published:false does not hide a post, it removes it: the file is deleted from
disk and dropped from the sitemap, so the URL genuinely 404s.

Each post's "body" is a list of blocks. Two formats are accepted so old and
new posts both work:
  - new (Tina "Post" list, no markdown needed): {"_template": "paragraph"|"heading"|"quote", "text": "..."}
  - legacy (plain string): "## text" -> heading, "> text" -> pull quote, anything else -> paragraph

A post that is missing optional fields (meta description, reading time, a
formatted date, etc.) still renders correctly: sensible values are filled in
automatically instead of crashing the whole site build. A single post with a
genuine problem (bad JSON, empty body, etc.) is skipped with a warning rather
than taking every other post down with it.
"""
import os, json, glob, re, html, sys, traceback

ROOT = os.path.join(os.path.dirname(__file__), '..')
BASE = "https://rootedresonancetherapy.com/"
TEMPLATE_SRC = os.path.join(ROOT, 'blog-adaptation.html')

STAGE_NUMERALS = {"Awaken": "I", "Understand": "II", "Reconnect": "III",
                  "Become": "IV", "Relate": "V"}
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def esc(s):
    return html.escape(s, quote=True)


def short_date(date_str):
    """'2026-08-07' -> 'Aug 7, 2026'. Falls back to the raw string if it isn't
    a plain YYYY-MM-DD (so a hand-typed date still shows *something*)."""
    try:
        y, m, d = date_str.split('-')
        return "%s %d, %s" % (MONTHS[int(m) - 1], int(d), y)
    except Exception:
        return date_str


def long_date(date_str):
    """'2026-08-07' -> 'August 7, 2026', for the byline. Same fallback idea."""
    try:
        y, m, d = date_str.split('-')
        full_months = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"]
        return "%s %d, %s" % (full_months[int(m) - 1], int(d), y)
    except Exception:
        return date_str


def estimate_reading_time(blocks):
    """~200 words/minute, minimum 1 min. Only used when the field is left blank."""
    words = 0
    for b in blocks:
        text = b['text'] if isinstance(b, dict) else b
        words += len(text.split())
    minutes = max(1, round(words / 200))
    return "%d min" % minutes


def normalize_blocks(raw_blocks):
    """Turn either block format into a uniform list of (kind, text) tuples.
    Also recovers gracefully if someone pastes a whole post into one legacy
    string block: embedded '## '/'> ' markers and run-on sentences (no blank
    line between paragraphs) are split back apart instead of showing up as
    literal '##'/'>' on the page."""
    out = []
    for b in raw_blocks:
        if isinstance(b, dict):
            kind = b.get('_template', 'paragraph')
            text = (b.get('text') or '').strip()
            if text:
                out.append((kind, text))
            continue

        # legacy plain-string block. Recover multiple paragraphs pasted into
        # a single box: split on newlines, on any '## '/'> ' that appears
        # even mid-string, and on run-on sentence boundaries with no space.
        s = str(b).replace('### ', '## ')
        for part in re.split(r'(?=##\s|>\s)', s):
            part = part.strip()
            if not part:
                continue
            if part.startswith('## '):
                rest = part[3:]
                m = re.search(r',(?=[A-Z])|\n', rest)
                head, remainder = (rest[:m.start()], rest[m.end():]) if m else (rest, '')
                out.append(('heading', head.rstrip('.,').strip()))
                pieces = remainder
            elif part.startswith('> '):
                rest = part[2:]
                m = re.search(r',(?=[A-Z])|\n', rest)
                quote, remainder = (rest[:m.start()], rest[m.end():]) if m else (rest, '')
                out.append(('quote', quote.rstrip('.,').strip()))
                pieces = remainder
            else:
                pieces = part
            for p in re.split(r'\n+|(?<=[.!?]),(?=[A-Z])|(?<=[a-z][.!?])(?=[A-Z])', pieces):
                p = p.strip().rstrip(',').strip()
                if p:
                    out.append(('paragraph', p))
    return out


def render_body(raw_blocks):
    out, first = [], True
    for kind, text in normalize_blocks(raw_blocks):
        if kind == 'heading':
            out.append('    <h2>%s</h2>' % esc(text))
            first = False
        elif kind == 'quote':
            out.append('    <blockquote>%s</blockquote>' % esc(text))
            first = False
        else:
            cls = ' class="drop"' if first else ''
            out.append('    <p%s>%s</p>' % (cls, esc(text)))
            first = False
    return '\n\n'.join(out)


def load():
    posts = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'content/blog/*.json'))):
        try:
            p = json.load(open(f, encoding='utf-8'))
        except Exception as e:
            print('  SKIPPED (invalid JSON):', f, '-', e)
            continue
        p.setdefault('slug', os.path.splitext(os.path.basename(f))[0])
        p['_source'] = f
        posts.append(p)
    posts.sort(key=lambda p: p.get('date', ''), reverse=True)
    return posts


SHELL = None
def shell():
    """Reuse the existing post page as the chrome, so the design cannot drift."""
    global SHELL
    if SHELL is None:
        SHELL = open(TEMPLATE_SRC, encoding='utf-8').read()
    return SHELL


def fill_defaults(p):
    """Every field here is optional in Tina. If Annie leaves one blank, fill
    in something sensible instead of crashing the build or showing nothing."""
    p.setdefault('author', 'Annie Memmott, LPC')
    if not p.get('dateLabel'):
        p['dateLabel'] = long_date(p.get('date', ''))
    if not p.get('stageLabel') and p.get('stage'):
        numeral = STAGE_NUMERALS.get(p['stage'], '')
        p['stageLabel'] = ('Stage %s - %s' % (numeral, p['stage'])) if numeral else p['stage']
    p.setdefault('stageLabel', '')
    if not p.get('readingTime'):
        p['readingTime'] = estimate_reading_time(p.get('body', []))
    if not p.get('metaDescription'):
        p['metaDescription'] = p.get('excerpt', p.get('title', ''))
    if not p.get('titleHtml'):
        p['titleHtml'] = esc(p.get('title', ''))
    return p


def build_post(p):
    p = fill_defaults(p)
    s = shell()
    title = p['title'].rstrip('.')
    full = f"{title} | Rooted Resonance"
    url = BASE + p['slug']
    s = re.sub(r'<title>.*?</title>', '<title>%s</title>' % esc(full), s, flags=re.S)
    for attr in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        s = re.sub(r'<meta %s content="[^"]*">' % re.escape(attr),
                   '<meta %s content="%s">' % (attr, esc(p['metaDescription'])), s)
    for attr in ('property="og:title"', 'name="twitter:title"'):
        s = re.sub(r'<meta %s content="[^"]*">' % re.escape(attr),
                   '<meta %s content="%s">' % (attr, esc(full)), s)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % url, s)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="%s">' % url, s)
    s = re.sub(r'"headline":"[^"]*"', '"headline":%s' % json.dumps(p['title']), s)
    s = re.sub(r'"datePublished":"[^"]*"', '"datePublished":"%s"' % p['date'], s)

    header = (
      '<header class="post">\n  <div class="wrap col">\n'
      '    <div class="crumb"><a href="blog.html">Journal</a> &nbsp;/&nbsp; %s</div>\n'
      '    <h1>%s</h1>\n    <div class="byline">\n      <span>%s</span>\n'
      '      <span>%s</span>\n    </div>\n  </div>\n</header>'
      % (esc(p.get('stageLabel', '')), p.get('titleHtml') or esc(p['title']),
         esc(p.get('author', 'Annie Memmott, LPC')), esc(p.get('dateLabel', p['date'])))
    )
    s = re.sub(r'<header class="post">.*?</header>', lambda _: header, s, flags=re.S)

    endnote = ''
    if p.get('endnoteTitle') and p.get('endnoteBody'):
        endnote = ('\n\n    <div class="rule"></div>\n\n    <div class="endnote">\n'
                   '      <div class="k">%s</div>\n      <p>%s</p>\n    </div>'
                   % (esc(p['endnoteTitle']), esc(p['endnoteBody'])))
    article = ('<article>\n  <div class="wrap col">\n%s%s\n  </div>\n</article>'
               % (render_body(p['body']), endnote))
    s = re.sub(r'<article>.*?</article>', lambda _: article, s, flags=re.S)
    return s


LIST_ENTRY = ('      <a class="entry" href="{slug}.html">\n'
              '        <span class="meta">{meta}</span>\n'
              '        <div>\n          <h2>{title}</h2>\n          <p>{excerpt}</p>\n        </div>\n'
              '        <span class="arw">&rarr;</span>\n      </a>')


def build_index(live):
    idx = os.path.join(ROOT, 'blog.html')
    s = open(idx, encoding='utf-8').read()
    if live:
        entries = '\n\n'.join(LIST_ENTRY.format(
            slug=p['slug'],
            meta=esc(('%s - %s' % (short_date(p['date']), p.get('readingTime', ''))).strip(' -')),
            title=esc(p['title']), excerpt=esc(p.get('excerpt', ''))) for p in live)
        soon = '<div class="soon rv"><span class="dot"></span> More entries as they\'re written.</div>'
    else:
        entries = ''
        soon = '<div class="soon rv"><span class="dot"></span> First entry coming soon.</div>'
    block = ('<div class="list rv">\n%s\n    </div>\n\n    %s' % (entries, soon))
    s = re.sub(r'<div class="list rv">.*?<div class="soon rv">.*?</div>',
               lambda _: block, s, flags=re.S)
    open(idx, 'w', encoding='utf-8').write(s)


def update_sitemap(live):
    f = os.path.join(ROOT, 'sitemap.xml')
    s = open(f, encoding='utf-8').read()
    urls = '\n'.join(
        '<url><loc>%s%s</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq>'
        '<priority>0.6</priority></url>' % (BASE, p['slug'], p['date']) for p in live)
    block = '<!-- blog:start -->\n%s\n<!-- blog:end -->' % urls
    if '<!-- blog:start -->' in s:
        s = re.sub(r'<!-- blog:start -->.*?<!-- blog:end -->', lambda _: block, s, flags=re.S)
    else:
        # first run: drop any hand-written post URLs, then insert the managed block
        s = re.sub(r'\s*<url><loc>[^<]*blog-[^<]*</loc>.*?</url>', '', s, flags=re.S)
        s = s.replace('</urlset>', block + '\n</urlset>')
    open(f, 'w', encoding='utf-8').write(s)


def main():
    posts = load()
    candidates = [p for p in posts if p.get('published')]

    live = []
    for p in candidates:
        try:
            html_out = build_post(p)
        except Exception as e:
            # One bad post must never take the whole site down. Skip it,
            # print exactly what went wrong, and keep building everything else.
            print('  SKIPPED (failed to render):', p.get('_source', p.get('slug')))
            print('    ', type(e).__name__, e)
            traceback.print_exc()
            continue
        open(os.path.join(ROOT, p['slug'] + '.html'), 'w', encoding='utf-8').write(html_out)
        print('  wrote', p['slug'] + '.html')
        live.append(p)

    # unpublishing (or a post that failed to render) must remove the URL, not merely unlink it
    published_slugs = {p['slug'] for p in live}
    for p in posts:
        if p['slug'] not in published_slugs:
            f = os.path.join(ROOT, p['slug'] + '.html')
            if os.path.exists(f):
                os.remove(f)
                print('  removed', p['slug'] + '.html')

    build_index(live)
    update_sitemap(live)
    print('blog: %d published, %d total' % (len(live), len(posts)))


if __name__ == '__main__':
    main()
