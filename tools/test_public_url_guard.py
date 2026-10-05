#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Run the public URL guard against tests/fixtures and require BOTH failures:
github.io in a canonical tag, and the fixture article missing from sitemap.xml.

The fixture lives outside the published tree. This command exits 0 only when
the guard itself exits non-zero and reports both errors. It also checks that
a scan of the repository root does not see the fixture article.
"""

import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUARD = os.path.join(ROOT, "tools", "check_public_urls.py")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "bad-public-urls")


def run(args):
    proc = subprocess.run(
        [sys.executable, GUARD] + args,
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    return proc.returncode, proc.stdout + proc.stderr


def main():
    code, output = run(["--root", FIXTURE])
    sys.stdout.write(output)
    missing = []
    if code == 0:
        missing.append("guard exited 0 on the bad fixture")
    if 'rel="canonical"' not in output or "github.io" not in output:
        missing.append("guard did not report a github.io canonical")
    if "sitemap.xml is missing /blog/art-999.html" not in output:
        missing.append("guard did not report art-999 missing from sitemap.xml")
    repo_code, repo_output = run([])
    if "art-999" in repo_output:
        missing.append("fixture article leaked into the published-tree scan")
    if missing:
        print("FAIL fixture assertions (published-tree exit %s):" % repo_code)
        for item in missing:
            print("- %s" % item)
        return 1
    print("PASS fixture assertions: guard exited %s with canonical and sitemap errors" % code)
    print("published-tree scan did not mention art-999 (exit %s)" % repo_code)
    return 0


if __name__ == "__main__":
    sys.exit(main())
