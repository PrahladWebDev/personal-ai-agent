import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { AuthedRequest } from '../middleware/auth';
import { getProjectCounts } from '../rag/knowledgeBase';

export const getDashboardStats = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const [
    projectCounts, skills, documents, repos, chunks, certifications, services,
    questionsToday, questionsMonth, conversations, topQuestions,
  ] = await Promise.all([
    getProjectCounts(true),
    pool.query('SELECT COUNT(*) FROM skills'),
    pool.query('SELECT COUNT(*) FROM documents'),
    pool.query('SELECT COUNT(*) FROM github_repositories'),
    pool.query('SELECT COUNT(*) FROM document_chunks'),
    pool.query('SELECT COUNT(*) FROM certifications'),
    pool.query('SELECT COUNT(*) FROM services'),
    pool.query(`SELECT COUNT(*) FROM chat_analytics WHERE created_at >= now() - interval '1 day'`),
    pool.query(`SELECT COUNT(*) FROM chat_analytics WHERE created_at >= now() - interval '30 days'`),
    pool.query('SELECT COUNT(*) FROM conversations'),
    pool.query(
      `SELECT question, COUNT(*) as count FROM chat_analytics
       GROUP BY question ORDER BY count DESC LIMIT 10`
    ),
  ]);

  return ok(res, {
    projects: projectCounts.totalUniqueProjects,
    portfolioProjects: projectCounts.portfolioProjects,
    githubOnlyRepositories: projectCounts.githubOnlyRepositories,
    skills: Number(skills.rows[0].count),
    documents: Number(documents.rows[0].count),
    githubRepositories: Number(repos.rows[0].count),
    knowledgeChunks: Number(chunks.rows[0].count),
    certifications: Number(certifications.rows[0].count),
    services: Number(services.rows[0].count),
    questionsToday: Number(questionsToday.rows[0].count),
    questionsThisMonth: Number(questionsMonth.rows[0].count),
    totalConversations: Number(conversations.rows[0].count),
    mostCommonQuestions: topQuestions.rows,
  });
});
