FROM python:3.12-slim

# Instala curl para healthchecks do docker
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia binários do uv a partir da imagem oficial
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copia manifestos de dependências para aproveitar cache de build
COPY pyproject.toml uv.lock ./

# Instala dependências de produção
RUN uv sync --frozen --no-dev --no-install-project

# Copia todo o código-fonte da aplicação
COPY . .

# Finaliza a sincronização do projeto no ambiente virtual
RUN uv sync --frozen --no-dev

ENV HOST=0.0.0.0
ENV PORT=8000
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
