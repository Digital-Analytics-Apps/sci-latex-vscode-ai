import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyJwt } from '../../middlewares/auth.middleware';
import { PrismaProjectsRepository } from '../../repositories/projects.repository';

export async function editorProxyRoutes(app: FastifyInstance) {
  const projectsRepository = new PrismaProjectsRepository();

  app.addHook('onRequest', verifyJwt);

  app.get(
    '/:projectId',
    {
      schema: {
        tags: ['EditorProxy'],
        summary: 'VS Code Web Editor Proxy para Workspace de Escrita LaTeX',
        description:
          'Carrega a interface de escrita em LaTeX no iframe do Autor com barra de ferramentas e arquivo main.tex.',
        security: [{ bearerAuth: [] }],
        params: z.object({
          projectId: z.string().uuid(),
        }),
        querystring: z.object({
          token: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };

      const project = await projectsRepository.findById(projectId);
      if (!project) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Projeto acadêmico não encontrado.',
        });
      }

      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VS Code Web Editor - ${project.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Consolas', 'Fira Code', 'Monaco', monospace; }
    body, html { height: 100%; background-color: #0b0f17; color: #e2e8f0; overflow: hidden; }
    .vs-container { display: flex; flex-direction: column; height: 100vh; }
    
    /* Top Toolbar */
    .vs-toolbar { background: #161b22; border-bottom: 1px solid #30363d; padding: 6px 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .vs-btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
    .vs-btn:hover { background: #30363d; color: #10b981; border-color: #10b981; }
    .vs-divider { width: 1px; height: 16px; background: #30363d; margin: 0 4px; }

    /* Main Workspace */
    .vs-body { display: flex; flex: 1; overflow: hidden; }
    
    /* Sidebar */
    .vs-sidebar { width: 220px; background: #0d1117; border-right: 1px solid #30363d; padding: 12px; font-size: 12px; display: flex; flex-direction: column; gap: 8px; }
    .vs-sidebar-title { font-weight: 700; text-transform: uppercase; color: #8b949e; font-size: 10px; letter-spacing: 0.5px; margin-bottom: 4px; }
    .vs-file-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 4px; cursor: pointer; color: #8b949e; transition: background 0.15s; }
    .vs-file-item:hover, .vs-file-item.active { background: #161b22; color: #10b981; font-weight: 600; }

    /* Editor Area */
    .vs-editor-area { flex: 1; display: flex; flex-direction: column; background: #0b0f17; }
    .vs-tabs { background: #0d1117; border-bottom: 1px solid #30363d; display: flex; }
    .vs-tab { padding: 8px 16px; background: #161b22; color: #10b981; border-right: 1px solid #30363d; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; border-top: 2px solid #10b981; }

    .vs-code-wrapper { display: flex; flex: 1; overflow: hidden; position: relative; }
    .vs-line-numbers { width: 45px; background: #0d1117; color: #484f58; padding: 12px 8px; text-align: right; user-select: none; font-size: 13px; line-height: 1.6; border-right: 1px solid #21262d; }
    .vs-textarea { flex: 1; background: #0b0f17; color: #e6edf3; border: none; outline: none; padding: 12px; font-size: 13px; line-height: 1.6; resize: none; font-family: 'Fira Code', 'Consolas', monospace; tab-size: 2; }

    /* Statusbar */
    .vs-statusbar { background: #10b981; color: #052e16; padding: 4px 12px; font-size: 11px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
    .vs-status-item { display: flex; align-items: center; gap: 12px; }
  </style>
</head>
<body>
  <div class="vs-container">
    <!-- Toolbar de Estilos LaTeX -->
    <div class="vs-toolbar">
      <button class="vs-btn" onclick="insertLatex('\\\\textbf{', '}')"><b>B</b> Negrito</button>
      <button class="vs-btn" onclick="insertLatex('\\\\textit{', '}')"><i>I</i> Itálico</button>
      <div class="vs-divider"></div>
      <button class="vs-btn" onclick="insertLatex('\\\\section{', '}')">§ Seção</button>
      <button class="vs-btn" onclick="insertLatex('\\\\subsection{', '}')">§§ Subseção</button>
      <div class="vs-divider"></div>
      <button class="vs-btn" onclick="insertLatex('\\\\begin{equation}\\n  ', '\\n\\\\end{equation}')">∑ Equação</button>
      <button class="vs-btn" onclick="insertLatex('\\\\cite{', '}')">📖 Citação</button>
      <button class="vs-btn" onclick="insertLatex('\\\\begin{figure}[h]\\n  \\\\centering\\n  \\\\caption{', '}\\n\\\\end{figure}')">🖼️ Figura</button>
      <div style="margin-left: auto; color: #10b981; font-size: 11px; font-weight: 600;">
        🟢 SCI-LaTeX TeX Live Engine Ready
      </div>
    </div>

    <!-- Body -->
    <div class="vs-body">
      <!-- Sidebar Explorer -->
      <div class="vs-sidebar">
        <div class="vs-sidebar-title">Arquivos do Projeto</div>
        <div class="vs-file-item active">📄 main.tex</div>
        <div class="vs-file-item">📁 sections/</div>
        <div class="vs-file-item" style="padding-left: 20px;">📄 01-introduction.tex</div>
        <div class="vs-file-item" style="padding-left: 20px;">📄 02-methodology.tex</div>
        <div class="vs-file-item" style="padding-left: 20px;">📄 03-results.tex</div>
        <div class="vs-file-item">📚 references.bib</div>
        <div class="vs-file-item">⚙️ ieee.cls</div>
      </div>

      <!-- Editor Container -->
      <div class="vs-editor-area">
        <div class="vs-tabs">
          <div class="vs-tab">📄 main.tex (LaTeX)</div>
        </div>
        <div class="vs-code-wrapper">
          <div class="vs-line-numbers" id="lineNumbers">1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>10<br>11<br>12<br>13<br>14<br>15<br>16<br>17<br>18<br>19<br>20</div>
          <textarea class="vs-textarea" id="codeEditor" spellcheck="false">\\documentclass[conference]{IEEEtran}
\\usepackage[utf8]{utf8}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}

\\title{${project.name}}
\\author{\\IEEEauthorblockN{Gilson Russo}\\IEEEauthorblockA{Programa de Pós-Graduação em Computação}}

\\begin{document}
\\maketitle

\\begin{abstract}
Este artigo apresenta uma abordagem inovadora utilizando aprendizado profundo e processamento de sinais para otimização de redes.
\\end{abstract}

\\section{Introdução}
A escrita científica estruturada garante o rigor metodológico e a reprodutibilidade dos experimentos...

\\input{sections/01-introduction.tex}
\\input{sections/02-methodology.tex}
\\input{sections/03-results.tex}

\\bibliographystyle{IEEEtran}
\\bibliography{references}
\\end{document}</textarea>
        </div>
      </div>
    </div>

    <!-- Statusbar -->
    <div class="vs-statusbar">
      <div class="vs-status-item">
        <span>⚡ SCI-LaTeX Workspace Server</span>
        <span>|</span>
        <span>Projeto: ${project.name}</span>
      </div>
      <div class="vs-status-item">
        <span>UTF-8</span>
        <span>LF</span>
        <span>LaTeX</span>
        <span>🟢 Ready</span>
      </div>
    </div>
  </div>

  <script>
    const textarea = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');

    function updateLineNumbers() {
      const lines = textarea.value.split('\\n').length;
      let numHtml = '';
      for (let i = 1; i <= Math.max(lines, 20); i++) {
        numHtml += i + '<br>';
      }
      lineNumbers.innerHTML = numHtml;
    }

    function insertLatex(before, after) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selected = text.substring(start, end);
      const replacement = before + selected + after;
      textarea.value = text.substring(0, start) + replacement + text.substring(end);
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
      updateLineNumbers();
    }

    textarea.addEventListener('input', updateLineNumbers);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        insertLatex('  ', '');
      }
    });

    updateLineNumbers();
  </script>
</body>
</html>`;

      return reply.type('text/html').send(htmlContent);
    }
  );
}
