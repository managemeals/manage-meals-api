from flask import Flask, request
from recipe_scrapers import scrape_me
from flask_caching import Cache
import os
import requests
import json
from urllib.parse import urlparse

PPLX_API_KEY = os.environ["PPLX_API_KEY"]
DEFAULT_RECIPE_IMG = os.environ["DEFAULT_RECIPE_IMG"]

config = {
  "DEBUG": False,
  "CACHE_TYPE": "RedisCache",
  "CACHE_DEFAULT_TIMEOUT": 300,
  "CACHE_REDIS_HOST": os.environ["CACHE_REDIS_HOST"],
  "CACHE_REDIS_PORT": os.environ["CACHE_REDIS_PORT"],
  "CACHE_REDIS_DB": os.environ["CACHE_REDIS_DB"],
  "CACHE_REDIS_URL": os.environ["CACHE_REDIS_URL"],
  "CACHE_KEY_PREFIX": os.environ["CACHE_KEY_PREFIX"],
}
app = Flask(__name__)
app.config.from_mapping(config)
cache = Cache(app)
app.logger.setLevel("INFO")

shutdown = False

@app.route("/", methods=["GET"])
@cache.cached(timeout=10, query_string=True)
def scrape_route():
  url = request.args.get("url")
  app.logger.info(f"Scraping URL {url}")
  try:
    data = scrape_me(url)
    return data.to_json()
  except Exception as e1:
    app.logger.error(f"scrape_me normal mode did not work on URL {url}, trying wild_mode: {str(e1)}")
    try:
      data = scrape_me(url, wild_mode=True)
      return data.to_json()
    except Exception as e2:
      app.logger.error(f"scrape_me wild_mode did not work on URL {url}, trying AI: {str(e2)}")
      try:
        headers = {
          "accept": "application/json",
          "content-type": "application/json",
          "authorization": f"Bearer {PPLX_API_KEY}"
        }
        payload = {
          "model": "sonar-small-online",
          "messages": [
            {
              "role": "system",
              "content": "Extract recipe data, with a single featured image, from URL and return JSON only. The JSON should contain the keys ingredients, instructions, title, description and image. The key ingredients should be a list of strings, the key instructions should be a list of strings, the key title should be a string, the key description should be a string, the key image should be a string."
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
        res_json = res.json()
        if not "id" in res_json or not "choices" in res_json or not len(res_json["choices"]) or not "message" in res_json["choices"][0]:
          app.logger.error(str(res_json))
          raise Exception("Invalid JSON from AI")
        msg_content = res_json["choices"][0]["message"]["content"]
        msg_content = msg_content[msg_content.find('{'):msg_content.rfind('}') + 1]
        msg_content_json = json.loads(msg_content)
        if isinstance(msg_content_json["ingredients"], str):
          msg_content_json["ingredients"] = [msg_content_json["ingredients"]]
        if len(msg_content_json["ingredients"]) and not isinstance(msg_content_json["ingredients"][0], str):
          msg_content_json["ingredients"] = [" ".join(ingredient.values()) for ingredient in msg_content_json["ingredients"]]
        if isinstance(msg_content_json["instructions"], str):
          msg_content_json["instructions"] = [msg_content_json["instructions"]]
        scrape_me_json = {
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
        return scrape_me_json
      except Exception as e3:
        app.logger.error(f"AI did not work on URL {url}: {str(e3)}")
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
