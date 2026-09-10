FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir anthropic
COPY services/wa-collector/collector.py /app/collector.py
COPY tools/whatsapp_digest.py /app/whatsapp_digest.py
ENV TZ=Asia/Jerusalem WA_DB=/data/wa.sqlite WA_OUT=/data/digests PORT=8080
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=60s CMD python3 -c "import urllib.request;urllib.request.urlopen('http://localhost:8080/health')" || exit 1
CMD ["python3", "collector.py", "serve"]
