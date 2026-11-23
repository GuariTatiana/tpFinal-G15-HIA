# syntax=docker/dockerfile:1
# Imagen custom de n8n con pg_dump (postgresql-client) para crear backups.
# La imagen base n8nio/n8n es "Docker Hardened" (sin apk), por eso compilamos
# pg_dump en una etapa alpine y copiamos binario + librerias compartidas.

FROM alpine:3.24 AS pgclient
RUN apk add --no-cache postgresql16-client
RUN mkdir -p /pgout/bin /pgout/lib && \
    REAL=$(readlink -f /usr/bin/pg_dump) && \
    cp "$REAL" /pgout/bin/pg_dump && \
    ldd "$REAL" | grep -o '/[^ ]*\.so[^ ]*' | sort -u | while read -r lib; do \
      cp -aL "$lib" /pgout/lib/; \
    done && \
    echo "pg_dump: $REAL" && ls -la /pgout/bin /pgout/lib

FROM n8nio/n8n:latest
USER root
COPY --from=pgclient /pgout/bin/pg_dump /usr/local/bin/pg_dump
COPY --from=pgclient /pgout/lib/ /usr/local/pglibs/
ENV LD_LIBRARY_PATH=/usr/local/pglibs
USER node
