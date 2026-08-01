import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, username, password, name, role, managerId } = req.body;

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

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'User with this username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: creatorId,
        action: 'CREATE_USER',
        details: `Created user ${name} (${role}) - ID: ${newUser.id}`
      }
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    if (!requesterRole || !requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let users;

    if (requesterRole === 'ADMIN') {
      // Admins see everyone
      users = await prisma.user.findMany({
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
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

    // Permissions check
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (username) data.username = username;
    if (status) data.status = status;

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

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

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'UPDATE_USER',
        details: `Updated user ${updatedUser.name} (ID: ${updatedUser.id})`
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'DELETE_USER',
        details: `Deleted user ${targetUser.name} (ID: ${targetUser.id})`
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
