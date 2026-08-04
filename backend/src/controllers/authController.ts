import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET!;

// Helper to seed initial admin if DB is empty
export const seedInitialAdmin = async () => {
  try {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount === 0) {
      const randomPassword = Math.random().toString(36).slice(-12) + 'A1!';
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
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
      console.log('=================================================');
      console.log('  INITIAL ADMIN CREATED');
      console.log('  Email: admin@dairy.com');
      console.log('  Username: admin');
      console.log(`  Password: ${randomPassword}`);
      console.log('  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN');
      console.log('=================================================');
    }
  } catch (error) {
    console.error('Failed to seed default admin:', error);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  const identifier = req.body.email || req.body.username;
  const { password } = req.body;

  try {
    if (!identifier || !password) {
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

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
  } catch (error) {
    console.error('[AUTH] Login error');
    res.status(500).json({ error: 'Internal server error' });
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
  } catch (error) {
    console.error('[AUTH] Profile error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
