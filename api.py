import json
import logging
from urllib.parse import urlparse

import bottle
import requests

FRONTEND_DIST_DIR = "./frontend/dist"
READWISE_TOKEN = os.environ['READWISE_TOKEN']
HEADERS = {"X-Accept": "application/json", "Authorization": f"Token {TOKEN}"}


class JSONErrorBottle(bottle.Bottle):
    """JSONErrorBottle represents Bottle object with JSON error handler"""

    def default_error_handler(self, res):
        bottle.response.content_type = "application/json"
        return json.dumps(
            {
                "message": res.body,
            }
        )


app = bottle.Bottle()
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

sh = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(message)s")
sh.setFormatter(formatter)
logger.addHandler(sh)


@app.hook("after_request")
def log_request():
    req, res = bottle.request, bottle.response
    logger.info("%s %s (%s)", req.method, req.fullpath, res.status)


@app.get("/")
@app.get("/:filename#(assets/)?.*#")
def serve_static(filename="index.html"):
    return bottle.static_file(filename, root=FRONTEND_DIST_DIR)


api = JSONErrorBottle()
app.mount("/api", api)


@api.delete("/articles/<article_id>")
def archive_article(article_id):
    rv = requests.patch(
        f'https://readwise.io/api/v3/update/{article_id}/',
        headers=HEADERS,
        json={"location": "archive"},
    )
    
    bottle.response.status = rv.status_code
    bottle.response.content_type = "application/json"
    return {}


@api.get("/articles")
def get_articles():
    rv = requests.get('https://readwise.io/api/v3/list/', headers=HEADERS, params={'location': 'new'})
    try:
        content = rv.json()
    except json.decoder.JSONDecodeError:
        raise bottle.HTTPError(rv.status_code, rv.text)

    try:
        items = list(content["results"])
    except AttributeError:
        items = []

    return {"articles": [{"id": obj['id'], 'url': obj['source_url'], 'title': obj['title'] or obj['source_url'], 'excerpt': ''} for obj in items]}


try:
    import cheroot
    server = "cheroot"
except ImportError:
    server = "wsgiref"

app.run(host="0.0.0.0", port=8080, server=server, quiet=False)
