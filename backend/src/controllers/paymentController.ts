import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const getPendingPayments = async (req: AuthRequest, res: Response) => {
  try {
    const pendingCollections = await prisma.milkCollection.findMany({
      where: { paymentStatus: 'PENDING' },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            village: true,
            mobile: true
          }
        }
      }
    });

    const aggregated: { [key: string]: any } = {};

    pendingCollections.forEach((col: any) => {
      if (!aggregated[col.farmerId]) {
        aggregated[col.farmerId] = {
          farmerId: col.farmerId,
          farmerName: col.farmer.name,
          village: col.farmer.village,
          mobile: col.farmer.mobile,
          pendingLitres: 0,
          pendingAmount: 0,
          collectionIds: []
        };
      }
      aggregated[col.farmerId].pendingLitres += col.quantityLitres;
      aggregated[col.farmerId].pendingAmount += col.totalAmount;
      aggregated[col.farmerId].collectionIds.push(col.id);
    });

    const results = Object.values(aggregated).map(item => ({
      ...item,
      pendingLitres: Math.round(item.pendingLitres * 100) / 100,
      pendingAmount: Math.round(item.pendingAmount * 100) / 100
    }));

    res.json(results);
  } catch (error) {
    console.error('[PAYMENT] Get pending error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const processPayment = async (req: AuthRequest, res: Response) => {
  const { farmerId, transactionRef } = req.body;

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!farmerId || typeof farmerId !== 'string') {
      return res.status(400).json({ error: 'Farmer ID is required' });
    }

    // Fetch all pending milk collections for the farmer
    const pendingCollections = await prisma.milkCollection.findMany({
      where: {
        farmerId,
        paymentStatus: 'PENDING'
      }
    });

    if (pendingCollections.length === 0) {
      return res.status(400).json({ error: 'No pending payments found for this farmer' });
    }

    const totalAmount = pendingCollections.reduce((sum: number, col: any) => sum + col.totalAmount, 0);
    const roundedAmount = Math.round(totalAmount * 100) / 100;
    const dateToday = new Date().toISOString().split('T')[0];

    const result = await prisma.$transaction(async (tx: any) => {
      const payment = await tx.payment.create({
        data: {
          farmerId,
          amount: roundedAmount,
          paymentDate: dateToday,
          status: 'COMPLETED',
          transactionRef: transactionRef || `TXN-${Date.now()}`,
          processedById: adminId
        }
      });

      await tx.milkCollection.updateMany({
        where: {
          id: { in: pendingCollections.map((c: any) => c.id) }
        },
        data: {
          paymentStatus: 'PAID',
          paymentId: payment.id
        }
      });

      return payment;
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PROCESS_PAYMENT',
        details: `Processed payment ID ${result.id} of Amount ${roundedAmount} for Farmer ${farmerId}`
      }
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('[PAYMENT] Process error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        farmer: { select: { name: true, village: true } },
        processedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('[PAYMENT] Get history error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
