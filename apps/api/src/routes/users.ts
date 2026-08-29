// ============================================
// User Management Routes (Admin Only)
// ============================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { requireAdmin } from '../middleware/auth';

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email('Formato de correo electrónico inválido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres'),
  role: z.enum(['ADMIN', 'STAFF']).optional().default('STAFF'),
});

const updateUserSchema = z.object({
  email: z.string().email('Formato de correo electrónico inválido').optional(),
  name: z.string().min(2).optional(),
  password: z.string().min(10, 'La nueva contraseña debe tener al menos 10 caracteres').optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
});

// Protect all user management endpoints with requireAdmin
usersRouter.use(requireAdmin);

// GET /api/users — List all users
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error al obtener la lista de usuarios' });
  }
});

// POST /api/users — Create a new user (Staff or Admin)
usersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Datos inválidos' });
    }

    const { email, name, password, role } = parseResult.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || null,
        password: hashedPassword,
        role: role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

// PATCH /api/users/:id — Update user details or role
usersRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Datos inválidos' });
    }

    const { email, name, password, role } = parseResult.data;

    const dataToUpdate: any = {};
    if (email) dataToUpdate.email = email.toLowerCase().trim();
    if (name !== undefined) dataToUpdate.name = name;
    if (role) dataToUpdate.role = role;
    if (password) dataToUpdate.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

// DELETE /api/users/:id — Remove a user
usersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});
