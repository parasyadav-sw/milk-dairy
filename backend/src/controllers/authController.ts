import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dairy_key';

// Helper to seed initial admin if DB is empty
export const seedInitialAdmin = async () => {
  try {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@dairy.com',
          username: 'admin',
          password: hashedPassword,
          name: 'System Admin',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });
      console.log('Seeded default admin user: admin@dairy.com / admin123 (username: admin)');
    }
  } catch (error) {
    console.error('Failed to seed default admin:', error);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  const identifier = req.body.email || req.body.username;
  const { password } = req.body;

  console.log(`[AUTH] Login attempt for identifier: "${identifier}"`);

  try {
    if (!identifier || !password) {
      console.log('[AUTH] Login failed: Missing identifier or password');
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Lookup user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      console.log(`[AUTH] Login failed: No user found matching identifier "${identifier}"`);
      return res.status(401).json({ error: `Authentication failed: User "${identifier}" not found` });
    }

    if (user.status !== 'ACTIVE') {
      console.log(`[AUTH] Login failed: User "${identifier}" is inactive (Status: ${user.status})`);
      return res.status(403).json({ error: 'Your account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH] Login failed: Incorrect password for user "${identifier}"`);
      return res.status(401).json({ error: 'Authentication failed: Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[AUTH] Login successful for user: "${user.name}" (Role: ${user.role}, ID: ${user.id})`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error(`[AUTH] Error during login for identifier "${identifier}":`, error);
    res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
