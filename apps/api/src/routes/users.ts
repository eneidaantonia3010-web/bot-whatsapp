// ============================================
// User Management Routes (Admin Only)
// ============================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma';
import { requireAdmin } from '../middleware/auth';

export const usersRouter = Router();

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
    const { email, name, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (email, contraseña)' });
    }

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
        role: role === 'STAFF' ? 'STAFF' : 'ADMIN',
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
    const { id } = req.params;
    const { email, name, password, role } = req.body;

    const dataToUpdate: any = {};
    if (email) dataToUpdate.email = email.toLowerCase().trim();
    if (name !== undefined) dataToUpdate.name = name;
    if (role) dataToUpdate.role = role === 'STAFF' ? 'STAFF' : 'ADMIN';
    if (password) dataToUpdate.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
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
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});
