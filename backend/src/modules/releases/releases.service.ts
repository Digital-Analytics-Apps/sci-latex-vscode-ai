import { prisma } from '../../db/prisma';

export interface CreateRCDTO {
  projectId: string;
  versionTag: string; // ex: RC-1, RC-2
  reviewerId?: string;
  feedback?: string;
}

export interface CreateReleaseDTO {
  projectId: string;
  versionTag: string; // ex: v1.0, v1.1
  title: string;
  conference?: string;
}

export class ReleasesService {
  // 1. Criar nova Release Candidate (Snapshot para o Revisor Técnico)
  async createReleaseCandidate(dto: CreateRCDTO) {
    const rcCount = await prisma.releaseCandidate.count({
      where: { projectId: dto.projectId },
    });

    const versionTag = dto.versionTag || `RC-${rcCount + 1}`;

    const rc = await prisma.releaseCandidate.create({
      data: {
        projectId: dto.projectId,
        versionTag,
        commitSha: `sha-${Date.now().toString(36)}`,
        status: 'SUBMITTED',
        feedback: dto.feedback,
        reviewerId: dto.reviewerId,
      },
    });

    return rc;
  }

  // 2. Listar Release Candidates do Projeto
  async listReleaseCandidates(projectId: string) {
    return prisma.releaseCandidate.findMany({
      where: { projectId },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Publicar Release Oficial na branch main (v1.0, v1.1, v2.0)
  async createRelease(dto: CreateReleaseDTO) {
    const release = await prisma.release.create({
      data: {
        projectId: dto.projectId,
        versionTag: dto.versionTag,
        commitSha: `main-sha-${Date.now().toString(36)}`,
        title: dto.title,
        conference: dto.conference,
      },
    });

    // Atualiza o status de submissão do projeto para COMPLETED_PUBLISHED se aplicável
    await prisma.project.update({
      where: { id: dto.projectId },
      data: {
        publishedAt: new Date(),
      },
    });

    return release;
  }

  // 4. Listar Releases publicadas do Projeto
  async listReleases(projectId: string) {
    return prisma.release.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const releasesService = new ReleasesService();
