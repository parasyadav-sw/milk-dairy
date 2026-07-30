import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      totalManagers,
      totalEmployees,
      totalFarmers,
      todayVisits,
      todayCompletedVisits,
      todayMilk,
      totalPayments,
      pendingCollections,
      allAuditLogs
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'MANAGER' } }),
      prisma.user.count({ where: { role: 'EMPLOYEE' } }),
      prisma.farmer.count(),
      prisma.visit.count({ where: { date: todayStr } }),
      prisma.visit.count({ where: { date: todayStr, status: 'COMPLETED' } }),
      prisma.milkCollection.aggregate({
        where: { date: todayStr },
        _sum: { quantityLitres: true }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true }
      }),
      prisma.milkCollection.aggregate({
        where: { paymentStatus: 'PENDING' },
        _sum: { totalAmount: true }
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, role: true } } }
      })
    ]);

    // Graph aggregates
    // 1. Daily milk collection trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const dailyCollections = await prisma.milkCollection.groupBy({
      by: ['date'],
      where: { date: { in: last7Days } },
      _sum: { quantityLitres: true, totalAmount: true }
    });

    const dailyTrends = last7Days.map(date => {
      const match = dailyCollections.find((dc: any) => dc.date === date);
      return {
        date,
        litres: match?._sum.quantityLitres || 0,
        revenue: match?._sum.totalAmount || 0
      };
    });

    // 2. Village wise collection (top 5)
    const villageCollections = await prisma.milkCollection.findMany({
      include: { farmer: { select: { village: true } } }
    });

    const villageMap: { [key: string]: number } = {};
    villageCollections.forEach((col: any) => {
      const v = col.farmer.village;
      villageMap[v] = (villageMap[v] || 0) + col.quantityLitres;
    });

    const villageWise = Object.entries(villageMap)
      .map(([name, litres]) => ({ name, litres: Math.round(litres * 100) / 100 }))
      .sort((a, b) => b.litres - a.litres)
      .slice(0, 5);

    // 3. Employee performance (litres collected)
    const employeeCollections = await prisma.milkCollection.groupBy({
      by: ['collectedById'],
      _sum: { quantityLitres: true }
    });

    const employeeIds = employeeCollections.map((ec: any) => ec.collectedById);
    const employees = await prisma.user.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true }
    });

    const employeePerformance = employeeCollections.map((ec: any) => {
      const emp = employees.find((e: any) => e.id === ec.collectedById);
      return {
        name: emp?.name || `Employee #${ec.collectedById}`,
        litres: Math.round((ec._sum.quantityLitres || 0) * 100) / 100
      };
    });

    res.json({
      cards: {
        totalManagers,
        totalEmployees,
        totalFarmers,
        todayVisits,
        completedVisits: todayCompletedVisits,
        todayMilk: Math.round((todayMilk._sum.quantityLitres || 0) * 100) / 100,
        totalRevenue: Math.round((totalPayments._sum.amount || 0) * 100) / 100,
        pendingPayments: Math.round((pendingCollections._sum.totalAmount || 0) * 100) / 100
      },
      charts: {
        dailyTrends,
        villageWise,
        employeePerformance
      },
      auditLogs: allAuditLogs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getManagerDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const managerId = req.user?.id;
    if (!managerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const [
      assignedEmployees,
      todayVisits,
      todayPendingVisits,
      todayMilk,
      pendingLeaves,
      todayAttendance
    ] = await Promise.all([
      prisma.user.findMany({ where: { managerId, role: 'EMPLOYEE' } }),
      prisma.visit.count({ where: { managerId, date: todayStr } }),
      prisma.visit.count({ where: { managerId, date: todayStr, status: 'PENDING' } }),
      prisma.milkCollection.aggregate({
        where: {
          date: todayStr,
          collectedBy: { managerId }
        },
        _sum: { quantityLitres: true }
      }),
      prisma.leave.count({
        where: {
          status: 'PENDING',
          user: { managerId }
        }
      }),
      prisma.attendance.count({
        where: {
          date: todayStr,
          status: 'PRESENT',
          user: { managerId }
        }
      })
    ]);

    // Village collection for this manager
    const managerCollections = await prisma.milkCollection.findMany({
      where: { collectedBy: { managerId } },
      include: { farmer: { select: { village: true } } }
    });

    const villageMap: { [key: string]: number } = {};
    managerCollections.forEach((col: any) => {
      const v = col.farmer.village;
      villageMap[v] = (villageMap[v] || 0) + col.quantityLitres;
    });

    const villageWise = Object.entries(villageMap)
      .map(([name, litres]) => ({ name, litres: Math.round(litres * 100) / 100 }))
      .sort((a, b) => b.litres - a.litres);

    // Employee completion rates
    const employeeVisits = await prisma.visit.groupBy({
      by: ['employeeId', 'status'],
      where: { managerId }
    });

    const empStats: { [key: number]: { completed: number; total: number } } = {};
    employeeVisits.forEach((v: any) => {
      if (!empStats[v.employeeId]) {
        empStats[v.employeeId] = { completed: 0, total: 0 };
      }
      if (v.status === 'COMPLETED') {
        empStats[v.employeeId].completed += 1;
      }
      empStats[v.employeeId].total += 1;
    });

    const employeesList = await prisma.user.findMany({
      where: { managerId },
      select: { id: true, name: true }
    });

    const performance = employeesList.map((emp: any) => {
      const stats = empStats[emp.id] || { completed: 0, total: 0 };
      const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      return {
        name: emp.name,
        completionRate: rate,
        totalVisits: stats.total
      };
    });

    res.json({
      cards: {
        employeesCount: assignedEmployees.length,
        todayVisits,
        pendingVisits: todayPendingVisits,
        todayMilk: Math.round((todayMilk._sum.quantityLitres || 0) * 100) / 100,
        pendingLeaves,
        attendanceToday: todayAttendance
      },
      charts: {
        villageWise,
        performance
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { timestamp: 'desc' }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
