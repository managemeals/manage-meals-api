FROM python:3

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

COPY scraper /app/scraper

WORKDIR /app/scraper

RUN pip install -r requirements.txt

# CMD [ "flask", "run", "--host=0.0.0.0" ]
CMD [ "gunicorn", "-w", "1", "-b", "0.0.0.0", "-t", "60", "app:app" ]
