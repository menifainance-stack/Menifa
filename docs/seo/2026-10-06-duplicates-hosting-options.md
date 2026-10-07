# Duplicate URLs: GitHub Pages stubs vs real Vercel redirects

Checked 6 October 2026. This note compares two ways to retire old URLs that still 404 on the live site. Live `menifa.org` is GitHub Pages. Vercel builds previews and already applies `vercel.json`, but those rules do not run on the apex until DNS and hosting move.

## Decision (Tamir, 6 October 2026, 09:31 IDT)

GitHub Pages stubs are the chosen fix. Hosting stays on GitHub Pages. The 82 `blog/art-N.html` duplicates are closed only by the Pages stubs already in this PR (`noindex, follow`, canonical, meta refresh, and `location.replace`). `vercel.json` stays as it is.

The Vercel/DNS option below is **not relevant for now**. No further work on a hosting move, DNS, or the `CNAME` file.

Nothing in this change edits DNS, the repo `CNAME` file, GitHub Pages settings, or the Vercel project.

## What is live today

Queried from this environment on 6 October 2026:

| Record | Value |
| --- | --- |
| `menifa.org` A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (GitHub Pages) |
| `menifa.org` AAAA | none |
| `www.menifa.org` CNAME | `menifainance-stack.github.io.` |
| NS | `dns1.registrar-servers.com.`, `dns2.registrar-servers.com.` |
| MX | `10 mx1.privateemail.com.`, `10 mx2.privateemail.com.` |
| TXT | Google site verification; SPF `v=spf1 include:spf.privateemail.com ~all` |
| Repo `CNAME` | exactly `menifa.org` |

`vercel.json` `permanent: true` rules are HTTP 308 on `*.vercel.app` previews. The `X-Robots-Tag: noindex, nofollow` header in that file is limited to hosts matching `.*\.vercel\.app`. GitHub Pages ignores `vercel.json`.

## Option 1 — GitHub Pages stubs (this PR)

Static `index.html` files for old paths that Pages would otherwise 404. Each file has `noindex, follow`, a canonical and `og:url` pointing at the new absolute URL, `<meta http-equiv="refresh" content="0;url=...">`, `location.replace(target + location.search + location.hash)`, and a visible link.

Covered here:

- `lp/ihud-halvaot/index.html` → `https://menifa.org/lp/ihud/`
- `lp/mihzur-mashkanta/index.html` → `https://menifa.org/lp/mihzur/`
- `lp/pikdonot-300k/index.html` → `https://menifa.org/`
- `blog/art-1.html` … `blog/art-82.html` → the Hebrew article URLs already listed in `vercel.json`

These files are not added to the sitemap. The locked paid URLs stay where they are: `/lp/mihzur/`, `/lp/ihud/`, `yoetz-mashkantaot.html`, `mashkanta-dira-rishona.html`, `mashkanta-yad-shniya.html`, `masurvei-bankim.html`, `alut-mashkanta-kolel-bituach.html`.

`lp/pikdonot-300k/` had no product successor in `vercel.json` or `redirects.csv` (the old file canonicalized to itself). The stub now goes to `https://menifa.org/`, the homepage, which is the target that was decided for it. It is not in the sitemap.

Trade-off: Google treats a meta refresh plus a canonical as a soft redirect. It is not an HTTP 301 or 308. The query string survives only in the script (`location.search` and `location.hash`). The meta refresh URL itself does not carry UTMs. Pages will keep returning 200 for the stub URL.

## Option 2 — real 301s via Vercel (not relevant for now)

Status: not relevant for now. No further work. The notes below are only a record of what a move would have involved.

The existing `vercel.json` redirect rules already return 308 on Vercel previews. They apply to `menifa.org` only if the apex stops being served by GitHub Pages and is served by the Vercel project `menifa`. `permanent: true` is 308 (a permanent redirect that keeps the method), which is the Vercel equivalent of a 301 for these GET document URLs.

A move would have to change all of the following. None of it is part of this PR.

1. DNS at the registrar (nameservers stay `dns1.registrar-servers.com` / `dns2.registrar-servers.com` unless someone deliberately switches the domain onto Vercel DNS).
   - Replace the four apex A records (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) with Vercel's apex: A `76.76.21.21`, or an ALIAS / ANAME to `cname.vercel-dns.com` if the registrar supports it.
   - Change `www` from CNAME `menifainance-stack.github.io.` to CNAME `cname.vercel-dns.com.`.
   - Leave MX on `mx1.privateemail.com` and `mx2.privateemail.com`, and leave the SPF TXT record. Mail is unrelated to the site host.
2. Repo `CNAME` file and GitHub Pages.
   - The file contains `menifa.org` and is what Pages uses to claim the custom domain.
   - Remove `menifa.org` from the GitHub Pages custom-domain setting, and remove or stop publishing that `CNAME` file, so Pages releases the hostname. Leaving both hosts claiming `menifa.org` makes the cutover fail.
3. Vercel project domain settings.
   - Add `menifa.org` and `www.menifa.org` to project `menifa` and finish the verification Vercel shows.
   - Production must be the branch that should be live (`main` today).
   - Confirm the production host does not receive `X-Robots-Tag: noindex`. The current rule is already limited to `*.vercel.app`.

`lp/ihud-halvaot/`, `lp/mihzur-mashkanta/`, and `lp/pikdonot-300k/` are not in `vercel.json`. After a move they would still be the HTML stubs (soft redirect) until explicit redirect rules are added. The art-1…art-82 rules would become real 308s without new config.

### Risks

- Cutover window. Cached A records (TTL seen here was about 185 seconds) and longer resolver caches can split traffic between Pages and Vercel.
- TLS. Vercel has to issue a certificate for the apex and for `www` after DNS points at it. Until that finishes, the site can fail HTTPS.
- Both hosts claiming the domain if the Pages custom domain or the `CNAME` file is left in place.
- Mail. Moving nameservers to Vercel without recreating MX and SPF would break `privateemail.com`. Keeping the current nameservers and editing only A and www CNAME avoids that.
- The preview `noindex` header must stay host-limited. A header on `/` without the `*.vercel.app` condition would noindex the production site.
- Locked paid URLs (`/lp/mihzur/`, `/lp/ihud/`, and the four root landing pages listed above) must still resolve on the new host. They are files in the repo, so a normal Vercel static deploy serves them. Do not add redirects that move them.
- Google has to recrawl. A 308 is a stronger signal than the stub, but it does not itself remove the old URL from the index on day one.
