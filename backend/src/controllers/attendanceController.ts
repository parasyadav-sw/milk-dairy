import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const clockIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dateToday = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Use create with unique constraint to prevent race condition
    try {
      const record = await prisma.attendance.create({
        data: {
          userId,
          date: dateToday,
          status: 'PRESENT',
          clockIn: timeNow
        }
      });
      res.status(201).json(record);
    } catch (e: any) {
      if (e.code === 'P2002') {
        return res.status(400).json({ error: 'Already clocked in today' });
      }
      throw e;
    }
  } catch (error) {
    console.error('[ATTENDANCE] Clock-in error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clockOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dateToday = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Atomic update: only update if clockOut is null (prevents race condition)
    const result = await prisma.attendance.updateMany({
      where: { userId, date: dateToday, clockOut: null },
      data: { clockOut: timeNow }
    });

    if (result.count === 0) {
      // Check if already clocked out or never clocked in
      const existing = await prisma.attendance.findFirst({
        where: { userId, date: dateToday }
      });
      if (!existing) {
        return res.status(400).json({ error: 'No clock-in record found for today' });
      }
      if (existing.clockOut) {
        return res.status(400).json({ error: 'Already clocked out today' });
      }
      return res.status(400).json({ error: 'Clock out failed' });
    }

    const updated = await prisma.attendance.findFirst({
      where: { userId, date: dateToday }
    });

    res.json(updated);
  } catch (error) {
    console.error('[ATTENDANCE] Clock-out error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let records;

    if (role === 'ADMIN') {
      records = await prisma.attendance.findMany({
        include: { user: { select: { name: true, role: true } } },
        orderBy: { date: 'desc' }
      });
    } else {
      records = await prisma.attendance.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
      });
    }

    res.json(records);
  } catch (error) {
    console.error('[ATTENDANCE] Get error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
