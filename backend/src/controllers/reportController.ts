import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      totalEmployees,
      totalFarmers,
      todayMilk,
      totalPayments,
      pendingCollections,
      allAuditLogs,
      totalSurveysCompleted,
      totalAnimalsAgg,
      employeesCurrentlyOnSurvey,
      todayAttendance,
      recentSurveys
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'EMPLOYEE' } }),
      prisma.farmer.count(),
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
      }),
      prisma.survey.count(),
      prisma.survey.aggregate({
        _sum: { totalAnimals: true }
      }),
      prisma.attendance.count({
        where: { date: todayStr, status: 'PRESENT', clockOut: null }
      }),
      prisma.attendance.count({
        where: { date: todayStr, status: 'PRESENT' }
      }),
      prisma.survey.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { name: true } } }
      })
    ]);

    // Graph aggregates
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

    // Village wise collection using groupBy instead of loading all records
    const farmerVillageMap = await prisma.farmer.findMany({
      select: { id: true, village: true }
    });
    const villageLookup: { [key: string]: string } = {};
    farmerVillageMap.forEach((f: any) => { villageLookup[f.id] = f.village; });

    // Get aggregated collections per farmer
    const farmerCollections = await prisma.milkCollection.groupBy({
      by: ['farmerId'],
      _sum: { quantityLitres: true }
    });

    const villageMap: { [key: string]: number } = {};
    farmerCollections.forEach((fc: any) => {
      const village = villageLookup[fc.farmerId];
      if (village) {
        villageMap[village] = (villageMap[village] || 0) + (fc._sum.quantityLitres || 0);
      }
    });

    const villageWise = Object.entries(villageMap)
      .map(([name, litres]) => ({ name, litres: Math.round(litres * 100) / 100 }))
      .sort((a, b) => b.litres - a.litres)
      .slice(0, 5);

    // Employee performance (litres collected)
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
        totalEmployees,
        totalFarmers,
        todayMilk: Math.round((todayMilk._sum.quantityLitres || 0) * 100) / 100,
        totalRevenue: Math.round((totalPayments._sum.amount || 0) * 100) / 100,
        pendingPayments: Math.round((pendingCollections._sum.totalAmount || 0) * 100) / 100,
        totalSurveysCompleted,
        totalAnimalsSurveyed: totalAnimalsAgg._sum.totalAnimals || 0,
        employeesCurrentlyOnSurvey,
        todayAttendance
      },
      charts: {
        dailyTrends,
        villageWise,
        employeePerformance
      },
      auditLogs: allAuditLogs,
      recentSurveys: recentSurveys.map((s: any) => ({
        ...s,
        animals: JSON.parse(s.animals)
      }))
    });
  } catch (error) {
    console.error('[REPORT] Dashboard stats error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { timestamp: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('[REPORT] Audit logs error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
