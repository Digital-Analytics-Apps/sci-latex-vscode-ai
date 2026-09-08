FROM codercom/code-server:latest

# Instalar pacotes do TeX Live e utilitários de compilação LaTeX como root
USER root
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-extra-utils \
    libyaml-tiny-perl \
    libfile-homedir-perl \
    latexmk \
    chktex \
    ca-certificates \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copiar e registrar a classe IEEEtran.cls oficial no TeX Live do sistema e do usuário
RUN mkdir -p /home/coder/texmf/tex/latex/IEEEtran /usr/share/texmf/tex/latex/IEEEtran
COPY IEEEtran.cls /home/coder/texmf/tex/latex/IEEEtran/IEEEtran.cls
COPY IEEEtran.cls /usr/share/texmf/tex/latex/IEEEtran/IEEEtran.cls
RUN chown -R coder:coder /home/coder/texmf && texhash

# Alternar para o usuário coder (padrao do code-server)
USER coder

# Instalar a extensão oficial LaTeX Workshop no VS Code Web
RUN code-server --install-extension James-Yu.latex-workshop || true

# Pre-instalar o arquivo de configurações padrao settings.json nos diretórios de usuário
RUN mkdir -p /home/coder/.local/share/code-server/User /home/coder/.config/code-server/User
COPY settings.json /home/coder/.local/share/code-server/User/settings.json
COPY settings.json /home/coder/.config/code-server/User/settings.json
