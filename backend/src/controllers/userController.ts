import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, username, password, name, role } = req.body;

  try {
    const creatorRole = req.user?.role;
    const creatorId = req.user?.id;

    if (!creatorRole || !creatorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (creatorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Admins can manage users' });
    }

    // Validation
    if (!email || !username || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, username, password, name, and role are required' });
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['ADMIN', 'EMPLOYEE'].includes(role)) {
      return res.status(400).json({ error: 'Role must be ADMIN or EMPLOYEE' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      const newUser = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          name,
          role,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          status: true,
          createdAt: true
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: creatorId,
          action: 'CREATE_USER',
          details: `Created user ${name} (${role})`
        }
      });

      res.status(201).json(newUser);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'User with this email or username already exists' });
      }
      throw error;
    }
  } catch (error) {
    console.error('[USER] Create error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    if (!requesterRole || !requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: { id: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error('[USER] Get all error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, status, password, username } = req.body;

  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const targetUserId = parseInt(id);

    if (!requesterRole || !requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }

    // Permissions check
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-deactivation
    if (targetUserId === requesterId && status === 'INACTIVE') {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const data: any = {};
    if (name && typeof name === 'string') data.name = name;
    if (email && typeof email === 'string') data.email = email;
    if (username && typeof username === 'string') data.username = username;
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) data.status = status;

    if (password && typeof password === 'string') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      data.password = await bcrypt.hash(password, 12);
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          status: true
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: requesterId,
          action: 'UPDATE_USER',
          details: `Updated user ${updatedUser.name}`
        }
      });

      res.json(updatedUser);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Email or username already in use' });
      }
      throw error;
    }
  } catch (error) {
    console.error('[USER] Update error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const targetUserId = parseInt(id);

    if (!requesterRole || !requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Admins can delete users' });
    }

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin account' });
      }
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    await prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'DELETE_USER',
        details: `Deleted user ${targetUser.name}`
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[USER] Delete error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
