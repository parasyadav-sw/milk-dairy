import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const createRoute = async (req: AuthRequest, res: Response) => {
  const { name, description, village, assignedEmployeeId } = req.body;

  try {
    const adminId = req.user?.id;
    const role = req.user?.role;

    if (!adminId || role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Admins can manage routes' });
    }

    if (!name || !village) {
      return res.status(400).json({ error: 'Route name and village are required' });
    }

    const route = await prisma.route.create({
      data: {
        name,
        description,
        village,
        adminId,
        assignedEmployeeId: assignedEmployeeId ? parseInt(assignedEmployeeId) : null
      }
    });

    res.status(201).json(route);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoutes = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let routes;

    if (role === 'ADMIN') {
      routes = await prisma.route.findMany({
        include: {
          admin: { select: { name: true } },
          assignedEmployee: { select: { name: true } }
        }
      });
    } else {
      // Employee sees their assigned routes
      routes = await prisma.route.findMany({
        where: { assignedEmployeeId: userId },
        include: {
          admin: { select: { name: true } }
        }
      });
    }

    res.json(routes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRoute = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, village, assignedEmployeeId } = req.body;

  try {
    const routeId = parseInt(id);
    const role = req.user?.role;
    const userId = req.user?.id;

    const existingRoute = await prisma.route.findUnique({ where: { id: routeId } });
    if (!existingRoute) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (role !== 'ADMIN' && existingRoute.adminId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this route' });
    }

    const updated = await prisma.route.update({
      where: { id: routeId },
      data: {
        name: name !== undefined ? name : existingRoute.name,
        description: description !== undefined ? description : existingRoute.description,
        village: village !== undefined ? village : existingRoute.village,
        assignedEmployeeId: assignedEmployeeId !== undefined ? (assignedEmployeeId ? parseInt(assignedEmployeeId) : null) : existingRoute.assignedEmployeeId
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteRoute = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const routeId = parseInt(id);
    const role = req.user?.role;
    const userId = req.user?.id;

    const existingRoute = await prisma.route.findUnique({ where: { id: routeId } });
    if (!existingRoute) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (role !== 'ADMIN' && existingRoute.adminId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.route.delete({ where: { id: routeId } });
    res.json({ message: 'Route deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
