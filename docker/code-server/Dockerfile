FROM codercom/code-server:latest

# Instalar pacotes do TeX Live e utilitários de compilação LaTeX como root
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-publishers \
    texlive-science \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-lang-portuguese \
    latexmk \
    chktex \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Alternar para o usuário coder (padrao do code-server)
USER coder

# Instalar a extensão oficial LaTeX Workshop no VS Code Web
RUN code-server --install-extension James-Yu.latex-workshop || true

# Pre-instalar o arquivo de configurações padrao settings.json nos diretórios de usuário
RUN mkdir -p /home/coder/.local/share/code-server/User /home/coder/.config/code-server/User
COPY settings.json /home/coder/.local/share/code-server/User/settings.json
COPY settings.json /home/coder/.config/code-server/User/settings.json
