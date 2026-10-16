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
   │          (Google Cloud DNS infrastructure, managed via Squarespace Domains)
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
- **DNS** is managed in Squarespace Domains (domains.squarespace.com → ashleylates.com → DNS), not in
  this repo. The nameservers are Google's `ns-cloud-d*` servers, but Squarespace publishes to them, so
  edit records in Squarespace, not in a Google Cloud console. Only the `thecozycrumb` CNAME record matters for this site.
  The same zone also holds Proton Mail MX/TXT records for the apex; leave those alone.
- **Squarespace gotcha:** the Name field is relative. Enter `thecozycrumb`, not
  `thecozycrumb.ashleylates.com`, or you get `thecozycrumb.ashleylates.com.ashleylates.com`.
- **HTTPS:** Let's Encrypt cert issued by GitHub (auto-renews). "Enforce HTTPS" is on, so
  http:// gets a 301 redirect to https://. If the cert ever gets stuck (e.g. DNS was wrong when GitHub checked),
  remove and re-add the custom domain in Settings → Pages. Doing this via the API makes GitHub commit
  "Delete CNAME" / "Create CNAME" to `main`, so pull afterwards.
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
