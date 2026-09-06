import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '../../config/env';

const execAsync = promisify(exec);

export class GitService {
  private baseStoragePath: string;

  constructor() {
    this.baseStoragePath = path.resolve(env.STORAGE_PATH, 'git');
  }

  // Garante que o diretório base de repositórios exista
  private async ensureStorageDir() {
    await fs.mkdir(this.baseStoragePath, { recursive: true });
  }

  // Obtém o caminho do repositório bare de um projeto
  getRepoPath(projectId: string): string {
    return path.join(this.baseStoragePath, `${projectId}.git`);
  }

  // Inicializa um novo repositório Git Bare e cria a primeira versão com o template main.tex
  async initBareRepository(projectId: string, projectTitle: string): Promise<string> {
    await this.ensureStorageDir();
    const bareRepoPath = this.getRepoPath(projectId);

    // Se já existir, lança erro
    try {
      await fs.stat(bareRepoPath);
      throw new Error('REPOSITORY_ALREADY_EXISTS');
    } catch (err: any) {
      if (err.message === 'REPOSITORY_ALREADY_EXISTS') throw err;
      // OK - diretório não existe
    }

    // 1. Criar repositório bare
    await fs.mkdir(bareRepoPath, { recursive: true });
    await execAsync(`git init --bare --initial-branch=main`, { cwd: bareRepoPath });

    // 2. Criar repositório temporário para efetuar o commit inicial do main.tex
    const tempDir = path.join(this.baseStoragePath, `temp-${projectId}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      await execAsync(`git init --initial-branch=main`, { cwd: tempDir });

      const templateContent = `% SCI-LaTeX Paper Template
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}

\\title{${projectTitle.replace(/[\{\}\\]/g, '')}}
\\author{SCI-LaTeX Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introdução}
Bem-vindo ao seu novo artigo científico! Escreva a introdução aqui.

\\section{Metodologia}
Descreva os métodos e experimentos realizados.

\\section{Resultados e Discussão}
Apresente os resultados obtidos.

\\section{Conclusão}
Resuma os achados do trabalho.

\\end{document}
`;

      await fs.writeFile(path.join(tempDir, 'main.tex'), templateContent, 'utf-8');

      // Configura autor do commit inicial
      await execAsync(`git config user.name "SCI-LaTeX System"`, { cwd: tempDir });
      await execAsync(`git config user.email "system@sci-latex.org"`, { cwd: tempDir });

      await execAsync(`git add main.tex`, { cwd: tempDir });
      await execAsync(`git commit -m "Initial commit: LaTeX paper template main.tex"`, { cwd: tempDir });

      // Push para o repositório bare
      await execAsync(`git remote add origin "${bareRepoPath}"`, { cwd: tempDir });
      await execAsync(`git push origin main`, { cwd: tempDir });
    } finally {
      // Limpa o diretório temporário
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    return bareRepoPath;
  }

  // Realiza o commit silencioso de uma alteração em um arquivo do projeto
  async commitFile(data: {
    projectId: string;
    branchName: string;
    filePath: string;
    content: string;
    commitMessage: string;
    authorName: string;
    authorEmail: string;
  }): Promise<string> {
    const bareRepoPath = this.getRepoPath(data.projectId);
    const tempDir = path.join(this.baseStoragePath, `temp-commit-${data.projectId}-${Date.now()}`);

    try {
      // Clona a branch do repositório bare
      await execAsync(`git clone --branch ${data.branchName} "${bareRepoPath}" "${tempDir}"`, {
        cwd: this.baseStoragePath,
      });

      const fullFilePath = path.join(tempDir, data.filePath);
      await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
      await fs.writeFile(fullFilePath, data.content, 'utf-8');

      await execAsync(`git config user.name "${data.authorName.replace(/"/g, '')}"`, { cwd: tempDir });
      await execAsync(`git config user.email "${data.authorEmail.replace(/"/g, '')}"`, { cwd: tempDir });

      await execAsync(`git add "${data.filePath}"`, { cwd: tempDir });
      await execAsync(`git commit -m "${data.commitMessage.replace(/"/g, '')}"`, { cwd: tempDir });
      await execAsync(`git push origin ${data.branchName}`, { cwd: tempDir });

      // Retorna o hash do commit gerado
      const { stdout } = await execAsync(`git rev-parse HEAD`, { cwd: tempDir });
      return stdout.trim();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
