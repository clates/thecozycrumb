# The Cozy Crumb

Static site for Ashley's home bakery in Herndon, VA. Plain HTML/CSS: no build step, no JS framework.

- `index.html`: the whole site (single page)
- `style.css`: styles; palette and fonts (Playfair Display / Open Sans) come from her original Google Sites design
- `images/`: photos and icons from the original design, resized for the web
- `CNAME`: tells GitHub Pages which custom domain to serve. **Do not delete it.**

Keep photos at ~900px wide or less before committing (`magick in.jpg -auto-orient -resize 900x -strip -quality 82 out.jpg`).

## Network topology

```
Visitor's browser
   │  https://thecozycrumb.ashleylates.com
   ▼
DNS lookup ── ashleylates.com nameservers: ns-cloud-d{1..4}.googledomains.com
   │          (old Google Domains, now managed in Squarespace Domains)
   │          Record:  thecozycrumb  CNAME  clates.github.io.   (TTL 4h)
   ▼
clates.github.io → GitHub Pages edge (Fastly CDN)
   │  Request still carries  Host: thecozycrumb.ashleylates.com
   ▼
GitHub Pages matches that Host header against this repo's custom domain
(CNAME file + repo Settings → Pages) and serves the `main` branch root.
TLS cert for the subdomain is issued automatically by GitHub (Let's Encrypt).
```

Key points:

- **No redirect and no proxy.** The CNAME is only a DNS alias. The browser keeps showing
  `thecozycrumb.ashleylates.com`. The one redirect goes the *other* way: `clates.github.io/thecozycrumb`
  redirects to the custom domain.
- **Hosting:** GitHub Pages, repo `clates/thecozycrumb` (public, required for free Pages),
  source = `main` branch, `/` folder. Every push to `main` redeploys in about a minute.
- **DNS** lives with the registrar (Squarespace Domains, Google Domains' successor), not in this repo.
  Only the `thecozycrumb` CNAME record matters for this site. The apex `ashleylates.com` is separate
  and unaffected.
- **HTTPS:** once the cert is issued, "Enforce HTTPS" should be on (repo Settings → Pages, or
  `gh api -X PUT repos/clates/thecozycrumb/pages -F https_enforced=true`).
- **Takeover protection (recommended):** verify `ashleylates.com` under GitHub account
  Settings → Pages → Verified domains (adds a TXT record). This stops other GitHub users from
  claiming `*.ashleylates.com` if this repo's Pages site is ever disabled while the CNAME still exists.

## Troubleshooting

```sh
dig +short thecozycrumb.ashleylates.com            # should print clates.github.io. + GitHub IPs
gh api repos/clates/thecozycrumb/pages              # Pages status, cname, https_enforced
gh api repos/clates/thecozycrumb/pages/builds/latest
curl -sI https://thecozycrumb.ashleylates.com       # expect HTTP/2 200, server: GitHub.com
```

If you delete the CNAME DNS record, also disable Pages or remove the custom domain. A dangling
record pointing at github.io is the classic subdomain-takeover setup.

## Git

Commits are authored as `Lates <christopherlates@gmail.com>` (set in this repo's local git config).
The remote uses HTTPS with `gh` as the credential helper, because the SSH key is passphrase-protected.
