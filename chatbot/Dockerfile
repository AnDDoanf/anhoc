FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5002

ENV PORT=5002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request, os; urllib.request.urlopen('http://localhost:' + os.environ.get('PORT', '5002') + '/health').getcode() == 200 or exit(1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5002"]
