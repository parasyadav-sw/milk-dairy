import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const assignVisit = async (req: AuthRequest, res: Response) => {
  const { date, time, employeeId, farmerId, remarks, nextVisitDate, gpsLocation } = req.body;

  try {
    const creatorId = req.user?.id;
    const role = req.user?.role;

    if (!creatorId || (role !== 'ADMIN' && role !== 'MANAGER')) {
      return res.status(403).json({ error: 'Access denied: Only Admins and Managers can assign visits' });
    }

    if (!date || !time || !employeeId || !farmerId) {
      return res.status(400).json({ error: 'Date, time, employeeId, and farmerId are required' });
    }

    // Verify employee exists and is an employee
    const employee = await prisma.user.findUnique({ where: { id: parseInt(employeeId) } });
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(400).json({ error: 'Invalid Employee ID' });
    }

    // Determine Manager ID
    const managerId = role === 'ADMIN' ? (employee.managerId || creatorId) : creatorId;

    const newVisit = await prisma.visit.create({
      data: {
        date,
        time,
        employeeId: parseInt(employeeId),
        managerId,
        farmerId,
        remarks,
        nextVisitDate,
        gpsLocation,
        status: 'PENDING'
      }
    });

    res.status(201).json(newVisit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getVisits = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let visits;

    const includeBlock = {
      employee: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      farmer: { select: { id: true, name: true, village: true } },
      milkCollections: true
    };

    if (role === 'ADMIN') {
      visits = await prisma.visit.findMany({
        include: includeBlock,
        orderBy: { date: 'desc' }
      });
    } else if (role === 'MANAGER') {
      visits = await prisma.visit.findMany({
        where: { managerId: userId },
        include: includeBlock,
        orderBy: { date: 'desc' }
      });
    } else {
      // Employee visits
      visits = await prisma.visit.findMany({
        where: { employeeId: userId },
        include: includeBlock,
        orderBy: { date: 'desc' }
      });
    }

    res.json(visits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVisit = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { remarks, nextVisitDate, gpsLocation, status, photos } = req.body;

  try {
    const visitId = parseInt(id);
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existingVisit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!existingVisit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Employees can update visits assigned to them.
    // Managers/Admins can update visits they manage.
    if (role === 'EMPLOYEE' && existingVisit.employeeId !== userId) {
      return res.status(403).json({ error: 'Access denied: You can only update visits assigned to you' });
    }

    const updateData: any = {};
    if (remarks !== undefined) updateData.remarks = remarks;
    if (nextVisitDate !== undefined) updateData.nextVisitDate = nextVisitDate;
    if (gpsLocation !== undefined) updateData.gpsLocation = gpsLocation;
    if (status !== undefined) updateData.status = status;
    if (photos !== undefined) updateData.photos = photos; // Comma separated URLs

    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: updateData,
      include: {
        farmer: { select: { name: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_VISIT',
        details: `Updated visit ID ${visitId} for farmer ${updated.farmer.name} - Status: ${updated.status}`
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
