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
    const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Check if already clocked in today
    const existing = await prisma.attendance.findFirst({
      where: { userId, date: dateToday }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    const record = await prisma.attendance.create({
      data: {
        userId,
        date: dateToday,
        status: 'PRESENT',
        clockIn: timeNow
      }
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const clockOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dateToday = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    const existing = await prisma.attendance.findFirst({
      where: { userId, date: dateToday }
    });

    if (!existing) {
      return res.status(400).json({ error: 'No clock-in record found for today' });
    }

    if (existing.clockOut) {
      return res.status(400).json({ error: 'Already clocked out today' });
    }

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        clockOut: timeNow
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    } else if (role === 'MANAGER') {
      records = await prisma.attendance.findMany({
        where: {
          user: { managerId: userId }
        },
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
