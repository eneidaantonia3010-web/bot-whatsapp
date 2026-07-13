// ============================================
// Gallery Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

export const galleryRouter = Router();

// GET /api/gallery — List all gallery images
galleryRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const where: any = { active: true };
    if (category && category !== 'todos') {
      where.category = category;
    }

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    res.json(images);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});
