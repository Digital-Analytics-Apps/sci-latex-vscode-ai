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

# Remover extensões embutidas de Chat/Copilot e Terminal Suggest do code-server
RUN rm -rf /usr/lib/code-server/lib/vscode/extensions/copilot \
           /usr/lib/code-server/lib/vscode/extensions/prompt-basics \
           /usr/lib/code-server/lib/vscode/extensions/terminal-suggest

# Configurar o Git para considerar todos os diretórios como seguros
RUN git config --system safe.directory "*"

# Copiar e registrar a classe IEEEtran.cls oficial no TeX Live do sistema e do usuário
RUN mkdir -p /home/coder/texmf/tex/latex/IEEEtran /usr/share/texmf/tex/latex/IEEEtran
COPY IEEEtran.cls /home/coder/texmf/tex/latex/IEEEtran/IEEEtran.cls
COPY IEEEtran.cls /usr/share/texmf/tex/latex/IEEEtran/IEEEtran.cls
RUN chown -R coder:coder /home/coder/texmf && texhash

# Alternar para o usuário coder (padrao do code-server)
USER coder
RUN git config --global safe.directory "*"

# Instalar a extensão oficial LaTeX Workshop no VS Code Web
RUN code-server --install-extension James-Yu.latex-workshop || true

# Pre-instalar o arquivo de configurações padrao settings.json, keybindings.json e config.yaml nos diretórios de usuário
RUN mkdir -p /home/coder/.local/share/code-server/User /home/coder/.config/code-server/User /home/coder/.config/code-server
COPY settings.json /home/coder/.local/share/code-server/User/settings.json
COPY settings.json /home/coder/.config/code-server/User/settings.json
COPY keybindings.json /home/coder/.local/share/code-server/User/keybindings.json
COPY keybindings.json /home/coder/.config/code-server/User/keybindings.json
COPY config.yaml /home/coder/.config/code-server/config.yaml
