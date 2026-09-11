FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core fontconfig curl && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /usr/share/fonts/truetype/heebo \
 && curl -fsSL -o /usr/share/fonts/truetype/heebo/Heebo.ttf "https://github.com/google/fonts/raw/main/ofl/heebo/Heebo%5Bwght%5D.ttf" \
 && fc-cache -f
WORKDIR /app
COPY services/menifa-studio/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY tools/video/reel.py /app/reel.py
COPY services/menifa-studio/pipeline.py services/menifa-studio/app.py /app/
COPY services/menifa-studio/static /app/static
ENV STUDIO_DATA=/data CAPTION_FONT=Heebo PYTHONUNBUFFERED=1
VOLUME ["/data"]
EXPOSE 8765
HEALTHCHECK --interval=60s CMD curl -fs http://localhost:8765/api/health || exit 1
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8765"]
