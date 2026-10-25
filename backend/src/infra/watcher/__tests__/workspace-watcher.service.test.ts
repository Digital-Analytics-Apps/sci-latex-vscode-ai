import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceWatcherService } from '../workspace-watcher.service';

vi.mock('../../../modules/events/events.manager', () => ({
  eventsManager: {
    broadcastToProject: vi.fn(),
  },
}));

describe('WorkspaceWatcherService', () => {
  let watcherService: WorkspaceWatcherService;
  beforeEach(() => {
    vi.clearAllMocks();
    watcherService = new WorkspaceWatcherService();
  });

  it('should initialize watcher service cleanly', () => {
    expect(watcherService).toBeDefined();
  });

  it('should safe unwatch non-existing project without throwing errors', () => {
    expect(() => watcherService.unwatchProject('non-existing-proj')).not.toThrow();
  });
});
