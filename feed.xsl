<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/rss/channel">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title><xsl:value-of select="title"/></title>
        <style>
          :root {
            --bg: #0f0f10; --bg-elev: #18181b; --fg: #d6d6d4;
            --fg-muted: #8c8c8a; --accent: #7eb88c; --rule: #26262a;
          }
          * { box-sizing: border-box; }
          html { background: var(--bg); }
          body {
            margin: 0; color: var(--fg); background: var(--bg);
            font-family: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
            font-size: 0.9375rem; line-height: 1.65;
            padding: 4rem 1.25rem 3rem;
            display: flex; flex-direction: column; align-items: center;
            min-height: 100vh;
          }
          main { width: 100%; max-width: 38rem; }
          a { color: var(--accent); text-decoration: none; }
          a:hover { text-decoration: underline; }
          h1 { font-size: 1rem; font-weight: 700; margin: 0 0 0.5rem; }
          .sub { color: var(--fg-muted); margin: 0 0 2rem; font-size: 0.875rem; }
          .banner {
            border: 1px solid var(--rule); border-radius: 6px;
            background: var(--bg-elev); padding: 0.9rem 1rem;
            margin-bottom: 2.5rem; color: var(--fg-muted); font-size: 0.875rem;
          }
          .banner code { color: var(--fg); }
          .item { padding: 1.4rem 0; border-top: 1px solid var(--rule); }
          .item-date { color: var(--fg-muted); font-size: 0.8125rem; margin: 0 0 0.35rem; }
          .item-title { font-size: 1.05rem; margin: 0; }
          .item-title a { text-decoration: underline; text-underline-offset: 2px; }
        </style>
      </head>
      <body>
        <main>
          <h1><xsl:value-of select="title"/></h1>
          <p class="sub"><xsl:value-of select="description"/></p>
          <div class="banner">
            This is an <strong>RSS feed</strong>. Copy the page URL into a feed
            reader to subscribe, or visit the
            <a href="{link}">diary</a> to read in your browser.
          </div>
          <xsl:for-each select="item">
            <div class="item">
              <p class="item-date"><xsl:value-of select="pubDate"/></p>
              <p class="item-title">
                <a href="{link}"><xsl:value-of select="title"/></a>
              </p>
            </div>
          </xsl:for-each>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
