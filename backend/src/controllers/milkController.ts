import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const calculateMilkRate = (fat: number, snf: number): number => {
  const rate = (fat * 5.0) + (snf * 3.5);
  return Math.round(rate * 100) / 100;
};

export const recordCollection = async (req: AuthRequest, res: Response) => {
  const {
    date,
    timeOfDay,
    quantityLitres,
    fatPercent,
    snfPercent,
    clr,
    farmerId
  } = req.body;

  try {
    const collectorId = req.user?.id;
    if (!collectorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!date || !timeOfDay || !quantityLitres || !fatPercent || !snfPercent || !farmerId) {
      return res.status(400).json({ error: 'Missing required milk collection details' });
    }

    const qty = parseFloat(quantityLitres);
    const fat = parseFloat(fatPercent);
    const snf = parseFloat(snfPercent);
    const clrVal = clr ? parseFloat(clr) : null;

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    if (isNaN(fat) || fat < 0 || fat > 100) {
      return res.status(400).json({ error: 'Invalid fat percentage' });
    }
    if (isNaN(snf) || snf < 0 || snf > 100) {
      return res.status(400).json({ error: 'Invalid SNF percentage' });
    }

    // Verify farmer exists
    const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const rate = calculateMilkRate(fat, snf);
    const amount = Math.round((qty * rate) * 100) / 100;

    const collection = await prisma.milkCollection.create({
      data: {
        date,
        timeOfDay,
        quantityLitres: qty,
        fatPercent: fat,
        snfPercent: snf,
        clr: clrVal,
        ratePerLitre: rate,
        totalAmount: amount,
        collectedById: collectorId,
        farmerId,
        paymentStatus: 'PENDING'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: collectorId,
        action: 'RECORD_MILK',
        details: `Recorded ${qty}L from Farmer ${farmer.name} (ID: ${farmerId})`
      }
    });

    res.status(201).json(collection);
  } catch (error) {
    console.error('[MILK] Record error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCollections = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, farmerId, village } = req.query;

  try {
    const filters: any = {};

    if (farmerId && typeof farmerId === 'string') {
      filters.farmerId = farmerId;
    }

    if (village && typeof village === 'string') {
      filters.farmer = { village };
    }

    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      filters.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const collections = await prisma.milkCollection.findMany({
      where: filters,
      include: {
        farmer: { select: { name: true, village: true } },
        collectedBy: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(collections);
  } catch (error) {
    console.error('[MILK] Get collections error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
