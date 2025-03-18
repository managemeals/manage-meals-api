from flask import Flask, request
from recipe_scrapers import scrape_html
from flask_caching import Cache
import os
import requests
import json
from urllib.parse import urlparse

PPLX_API_KEY = os.environ.get("PPLX_API_KEY", "")
DEFAULT_RECIPE_IMG = os.environ.get("DEFAULT_RECIPE_IMG", "https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/images/default1.jpg")
CACHE_TIMEOUT = int(os.environ.get("SCRAPER_CACHE_TIMEOUT", 10))
PROXY_URL = os.environ.get("SCRAPER_PROXY_URL", "")

config = {
  "DEBUG": False,
}
if os.environ.get("CACHE_REDIS_HOST", ""):
  config.update({
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_REDIS_HOST": os.environ["CACHE_REDIS_HOST"],
    "CACHE_REDIS_PORT": os.environ["CACHE_REDIS_PORT"],
    "CACHE_REDIS_DB": os.environ["CACHE_REDIS_DB"],
    "CACHE_REDIS_URL": os.environ["CACHE_REDIS_URL"],
    "CACHE_KEY_PREFIX": os.environ["CACHE_KEY_PREFIX"],
  })
else:
  config.update({
    "CACHE_TYPE": "NullCache",
  })
app = Flask(__name__)
app.config.from_mapping(config)
cache = Cache(app)
app.logger.setLevel("INFO")

shutdown = False

@app.route("/", methods=["GET"])
@cache.cached(timeout=CACHE_TIMEOUT, query_string=True)
def scrape_route():
  proxies=None
  if PROXY_URL:
      proxies = {
        'http': PROXY_URL,
        'https': PROXY_URL
      }
  url = request.args.get("url")
  html = requests.get(
    url,
    headers={
      "User-Agent": "ManageMeals (https://managemeals.com/)",
    },
    timeout=60,
    proxies=proxies
  ).content
  app.logger.info(f"Scraping URL {url}")
  ai_res_json = None
  try:
    data = scrape_html(html, org_url=url)
    if not data.title():
      raise Exception("Recipe has no title")
    return data.to_json()
  except Exception as e1:
    app.logger.error(f"scrape_html normal mode did not work on URL {url}, trying wild_mode: {str(e1)}")
    try:
      data = scrape_html(html, org_url=url, wild_mode=True)
      if not data.title():
        raise Exception("Recipe has no title in wild_mode")
      return data.to_json()
    except Exception as e2:
      if not PPLX_API_KEY:
        return (getattr(e2, 'message', str(e2)), 500)
      app.logger.error(f"scrape_html wild_mode did not work on URL {url}, trying AI: {str(e2)}")
      try:
        headers = {
          "accept": "application/json",
          "content-type": "application/json",
          "authorization": f"Bearer {PPLX_API_KEY}"
        }
        payload = {
          "model": "sonar",
          "messages": [
            {
              "role": "system",
              "content": "Extract recipe data, with a single featured image, from a URL and return a JSON string. The JSON should contain the following keys: ingredients, instructions, title, description and image. The key ingredients should be a list of strings, the key instructions should be a list of strings, the key title should be a string, the key description should be a string, the key image should be a string. Do not return any alternatives, only return a JSON string. Do not add any backticks or syntax highlighting, only return the JSON string as is. If no image is found, then set the image field to https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/images/default1.jpg. If nothing is found return a string that only says ERROR."
            },
            {
              "role": "user",
              "content": f"Extract recipe data from URL {url}"
            }
          ]
        }
        res = requests.post(
          "https://api.perplexity.ai/chat/completions",
          json=payload,
          headers=headers,
        )
        ai_res_json = res.json()
        if not "id" in ai_res_json or not "choices" in ai_res_json or not len(ai_res_json["choices"]) or not "message" in ai_res_json["choices"][0]:
          app.logger.error(str(ai_res_json))
          raise Exception("Invalid JSON from AI")
        msg_content = ai_res_json["choices"][0]["message"]["content"]
        msg_content = msg_content[msg_content.find('{'):msg_content.rfind('}') + 1]
        msg_content_json = json.loads(msg_content)
        if isinstance(msg_content_json["ingredients"], str):
          msg_content_json["ingredients"] = [msg_content_json["ingredients"]]
        if len(msg_content_json["ingredients"]) and not isinstance(msg_content_json["ingredients"][0], str):
          msg_content_json["ingredients"] = [" ".join(ingredient.values()) for ingredient in msg_content_json["ingredients"]]
        if isinstance(msg_content_json["instructions"], str):
          msg_content_json["instructions"] = [msg_content_json["instructions"]]
        scrape_html_json = {
          "canonical_url": url,
          "description": msg_content_json["description"],
          "host": urlparse(url).netloc,
          "image": msg_content_json.get("image", DEFAULT_RECIPE_IMG),
          "ingredient_groups": [
            {
              "ingredients": msg_content_json["ingredients"],
              "purpose": None
            }
          ],
          "ingredients": msg_content_json["ingredients"],
          "instructions": '\n'.join(msg_content_json["instructions"]),
          "instructions_list": msg_content_json["instructions"],
          "title": msg_content_json["title"],
        }
        return scrape_html_json
      except Exception as e3:
        app.logger.error(f"AI did not work on URL {url}: {str(e3)}, got {ai_res_json}")
        return (getattr(e3, 'message', str(e3)), 500)

@app.route("/health", methods=["GET"])
def health_route():
  if shutdown:
    return "Shutdown", 503
  return "Healthy"

@app.route("/shutdown", methods=["GET"])
def shutdown_route():
  global shutdown
  shutdown = True
  return "Shutdown"

@app.route("/startup", methods=["GET"])
def startup_route():
  global shutdown
  shutdown = False
  return "Startup"
