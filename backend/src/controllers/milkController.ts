import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

// Clean helper to calculate milk rate based on standard Fat & SNF pricing
// Cows typically have Fat 3-5%, SNF 8-9%. Buffalos have Fat 6-9%, SNF 9-10%.
// Standard Formula: Rate = (Fat * 5.0) + (SNF * 3.5)
export const calculateMilkRate = (fat: number, snf: number): number => {
  const rate = (fat * 5.0) + (snf * 3.5);
  return Math.round(rate * 100) / 100; // Round to 2 decimal places
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

    // Verify farmer exists
    const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const qty = parseFloat(quantityLitres);
    const fat = parseFloat(fatPercent);
    const snf = parseFloat(snfPercent);
    const clrVal = clr ? parseFloat(clr) : null;

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



    // Log action
    await prisma.auditLog.create({
      data: {
        userId: collectorId,
        action: 'RECORD_MILK',
        details: `Recorded ${qty}L from Farmer ${farmer.name} (ID: ${farmerId})`
      }
    });

    res.status(201).json(collection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCollections = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, farmerId, village } = req.query;

  try {
    const filters: any = {};

    if (farmerId) {
      filters.farmerId = String(farmerId);
    }

    if (village) {
      filters.farmer = { village: String(village) };
    }

    if (startDate && endDate) {
      filters.date = {
        gte: String(startDate),
        lte: String(endDate)
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
