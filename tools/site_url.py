# -*- coding: utf-8 -*-
"""The only public origin for menifa.org generation.

Sitemap, RSS, llms.txt, Blog schema, and IndexNow all import SITE from
here. There is no alternate host.
"""

import csv
import os
from urllib.parse import unquote

SITE = "https://menifa.org"


def redirect_map(root):
    """old path -> new path from <root>/redirects.csv, both percent-decoded.

    A file whose path is a redirect source is not published: vercel.json
    sends it to the new path with a 301. Empty when the CSV is absent.
    """
    path = os.path.join(root, "redirects.csv")
    if not os.path.isfile(path):
        return {}
    with open(path, encoding="utf-8") as fh:
        return {unquote(row["old_path"]): unquote(row["new_path"])
                for row in csv.DictReader(fh)
                if row.get("old_path") and row.get("new_path")}
