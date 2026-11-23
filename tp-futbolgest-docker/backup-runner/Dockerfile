# Microservicio HTTP que ejecuta pg_dump y guarda el backup en /backups.
# Lo invoca n8n (Flujo 4) via HTTP Request porque la imagen hardened de n8n
# no incluye el nodo Execute Command.
FROM python:3.12-alpine
RUN apk add --no-cache postgresql16-client
COPY backup_server.py /app.py
EXPOSE 8080
CMD ["python", "/app.py"]
