import chokidar, { FSWatcher } from 'chokidar';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env';
import { eventsManager } from '../../modules/events/events.manager';
import { GitService } from '../git/git.service';

const IGNORED_PATTERNS = [
  '**/.git/**',
  '**/node_modules/**',
  '**/.vscode/**',
  '**/*.aux',
  '**/*.log',
  '**/*.out',
  '**/*.toc',
  '**/*.fls',
  '**/*.fdb_latexmk',
  '**/*.synctex.gz',
  '**/*.bbl',
  '**/*.blg',
];

export class WorkspaceWatcherService {
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly stateCache = new Map<string, boolean>();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly gitService: GitService;

  constructor(gitService?: GitService) {
    this.gitService = gitService || new GitService();
  }

  // Inicia o monitoramento reativo de arquivos do disco do projeto (usando chokidar no Linux)
  watchProject(projectId: string, userId?: string): void {
    let targetDir = path.resolve(env.STORAGE_PATH, 'projects', projectId);
    if (userId) {
      const userDir = path.resolve(env.STORAGE_PATH, 'projects', projectId, 'users', userId);
      if (fs.existsSync(userDir)) {
        targetDir = userDir;
      }
    }

    if (!fs.existsSync(targetDir)) {
      return;
    }

    // Se já existia watcher ativo, encerra o antigo para atualizar o diretório alvo
    if (this.watchers.has(projectId)) {
      this.unwatchProject(projectId);
    }

    try {
      const watcher = chokidar.watch(targetDir, {
        ignored: IGNORED_PATTERNS,
        ignoreInitial: true,
        persistent: true,
        depth: 99,
      });

      watcher.on('all', (_event, _filePath) => {
        this.triggerDebouncedCheck(projectId, userId);
      });

      this.watchers.set(projectId, watcher);

      // Realiza a checagem inicial de prontidão do estado
      this.triggerDebouncedCheck(projectId, userId);
    } catch (err: any) {
      console.warn(
        `⚠️ Warning setting up workspace FS watcher for ${projectId}:`,
        err.message || err
      );
    }
  }

  // Interrompe o monitoramento do projeto
  unwatchProject(projectId: string): void {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      watcher.close().catch(() => {});
      this.watchers.delete(projectId);
    }

    const timer = this.debounceTimers.get(projectId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(projectId);
    }

    this.stateCache.delete(projectId);
  }

  // Executa checagem com Debounce de 300ms e dispara SSE SOMENTE em mudanças de estado
  private triggerDebouncedCheck(projectId: string, userId?: string): void {
    if (this.debounceTimers.has(projectId)) {
      clearTimeout(this.debounceTimers.get(projectId));
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(projectId);

      try {
        const dirtyCheck = await this.gitService.checkUncommittedChanges(projectId, userId);
        const previousState = this.stateCache.get(projectId);

        // Dispara o evento SSE SOMENTE se o estado transicionou (ex: false -> true ou true -> false)
        if (previousState !== dirtyCheck.hasUncommittedChanges) {
          this.stateCache.set(projectId, dirtyCheck.hasUncommittedChanges);

          eventsManager.broadcastToProject(projectId, 'WORKSPACE_DIRTY_CHANGED', {
            projectId,
            hasUncommittedChanges: dirtyCheck.hasUncommittedChanges,
            dirtyFiles: dirtyCheck.dirtyFiles,
          });
        }
      } catch (err: any) {
        console.warn(
          `⚠️ Error checking git status in watcher for ${projectId}:`,
          err.message || err
        );
      }
    }, 300);

    this.debounceTimers.set(projectId, timer);
  }
}

export const workspaceWatcher = new WorkspaceWatcherService();
