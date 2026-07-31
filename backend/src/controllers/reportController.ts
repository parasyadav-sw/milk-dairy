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
      allAuditLogs
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
        totalEmployees,
        totalFarmers,
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
