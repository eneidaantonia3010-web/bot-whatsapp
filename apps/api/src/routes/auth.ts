// ============================================
// Authentication Routes (Login & Profile)
// ============================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';
import { config } from '../config';

export const authRouter = Router();

// POST /api/auth/login — Authenticate user
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida').max(100, 'Contraseña demasiado larga'),
});

// Constant-time dummy hash to normalize bcrypt comparison time and prevent user enumeration
const DUMMY_HASH = '$2a$10$e8wF40dO2zN/JbXj2N8Fuu7K9C.4qF1E2mD4tB3sA5wG6yH7zI8k.';

authRouter.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Credenciales inválidas o formato incorrecto' });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    const hashToCompare = user ? user.password : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Error en el servidor de autenticación' });
  }
});

// GET /api/auth/me — Return current user profile
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});
