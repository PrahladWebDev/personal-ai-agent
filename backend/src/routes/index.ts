import { Router } from 'express';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import skillsRoutes from './skills.routes';
import experienceRoutes from './experience.routes';
import educationRoutes from './education.routes';
import achievementsRoutes from './achievements.routes';
import projectsRoutes from './projects.routes';
import socialLinksRoutes from './socialLinks.routes';
import documentsRoutes from './documents.routes';
import githubRoutes from './github.routes';
import aiRoutes from './ai.routes';
import analyticsRoutes from './analytics.routes';
import certificationsRoutes from './certifications.routes';
import servicesRoutes from './services.routes';
import personalRoutes from './personal.routes';
import careerRoutes from './career.routes';
import aiInstructionsRoutes from './aiInstructions.routes';
import { generalApiLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(generalApiLimiter);

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/skills', skillsRoutes);
router.use('/experience', experienceRoutes);
router.use('/education', educationRoutes);
router.use('/achievements', achievementsRoutes);
router.use('/projects', projectsRoutes);
router.use('/certifications', certificationsRoutes);
router.use('/services', servicesRoutes);
router.use('/personal', personalRoutes);
router.use('/career', careerRoutes);
router.use('/ai-instructions', aiInstructionsRoutes);
router.use('/social-links', socialLinksRoutes);
router.use('/documents', documentsRoutes);
router.use('/github', githubRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
