import { Response } from 'express';
import prisma, { TransactionClient } from '../db';
import { AuthRequest } from '../middleware/auth';

export const createSurvey = async (req: AuthRequest, res: Response) => {
  const { customerName, mobile, village, address, animals, totalAnimals, totalMilkProduction, interested, remarks, surveyDate } = req.body;
  const employeeId = req.user?.id;

  try {
    if (!employeeId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!customerName || !mobile || !village || !address || !animals || totalAnimals === undefined || totalMilkProduction === undefined) {
      return res.status(400).json({ error: 'Missing required survey details' });
    }

    if (typeof mobile !== 'string' || !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }

    const totalAnimalsNum = parseInt(totalAnimals);
    const totalMilkNum = parseFloat(totalMilkProduction);

    if (isNaN(totalAnimalsNum) || totalAnimalsNum < 0) {
      return res.status(400).json({ error: 'Invalid total animals' });
    }

    if (isNaN(totalMilkNum) || totalMilkNum < 0) {
      return res.status(400).json({ error: 'Invalid total milk production' });
    }

    // Parse counts and milk yields from animals array
    let cowCount = 0;
    let buffaloCount = 0;
    let cowMilkYieldTotal = 0;
    let buffaloMilkYieldTotal = 0;
    let cowCountForYield = 0;
    let buffaloCountForYield = 0;

    if (Array.isArray(animals)) {
      animals.forEach((item: any) => {
        const count = parseInt(item.count) || 0;
        const yieldVal = parseFloat(item.milkPerAnimal) || 0;
        if (item.type === 'COW') {
          cowCount += count;
          cowMilkYieldTotal += yieldVal * count;
          cowCountForYield += count;
        } else if (item.type === 'BUFFALO') {
          buffaloCount += count;
          buffaloMilkYieldTotal += yieldVal * count;
          buffaloCountForYield += count;
        }
      });
    }

    const finalCowMilkYield = cowCountForYield > 0 ? (cowMilkYieldTotal / cowCountForYield) : 0;
    const finalBuffaloMilkYield = buffaloCountForYield > 0 ? (buffaloMilkYieldTotal / buffaloCountForYield) : 0;

    let animalType = 'COW';
    if (cowCount > 0 && buffaloCount > 0) {
      animalType = 'BOTH';
    } else if (buffaloCount > 0) {
      animalType = 'BUFFALO';
    }

    const dateStr = surveyDate || new Date().toISOString().split('T')[0];

    // Use a transaction for atomicity
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const newSurvey = await tx.survey.create({
        data: {
          customerName,
          mobile,
          village,
          address,
          animals: JSON.stringify(animals),
          totalAnimals: totalAnimalsNum,
          totalMilkProduction: totalMilkNum,
          interested: !!interested,
          remarks,
          employeeId,
          surveyDate: dateStr
        },
        include: {
          employee: { select: { name: true } }
        }
      });

      // Check if farmer exists by mobile number
      const existingFarmer = await tx.farmer.findFirst({
        where: { mobile }
      });

      if (existingFarmer) {
        await tx.farmer.update({
          where: { id: existingFarmer.id },
          data: {
            name: customerName,
            village,
            address,
            animalType,
            cowCount,
            buffaloCount,
            totalAnimals: cowCount + buffaloCount,
            cowMilkYield: finalCowMilkYield,
            buffaloMilkYield: finalBuffaloMilkYield,
            surveyDate: dateStr,
            notes: remarks
          }
        });
      } else {
        const lastFarmer = await tx.farmer.findFirst({ orderBy: { id: 'desc' } });
        const nextNum = lastFarmer ? parseInt(lastFarmer.id.split('-')[1]) + 1 : 1;
        const farmerId = `FMR-${String(nextNum).padStart(4, '0')}`;

        await tx.farmer.create({
          data: {
            id: farmerId,
            name: customerName,
            mobile,
            gender: 'MALE',
            age: 30,
            village,
            taluka: 'Jaipur',
            district: 'Jaipur',
            address,
            animalType,
            cowCount,
            buffaloCount,
            totalAnimals: cowCount + buffaloCount,
            cowMilkYield: finalCowMilkYield,
            buffaloMilkYield: finalBuffaloMilkYield,
            registeredById: employeeId,
            surveyDate: dateStr,
            notes: remarks
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: employeeId,
          action: 'SUBMIT_SURVEY',
          details: `Submitted survey for customer ${customerName} (Animals: ${totalAnimalsNum}, Milk: ${totalMilkNum}L)`
        }
      });

      return newSurvey;
    });

    const parsedSurvey = {
      ...result,
      animals: JSON.parse(result.animals)
    };

    res.status(201).json(parsedSurvey);
  } catch (error) {
    console.error('[SURVEY] Create error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSurveys = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const employeeId = req.user?.id;

    if (!employeeId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let surveys;
    if (role === 'ADMIN') {
      surveys = await prisma.survey.findMany({
        include: {
          employee: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      surveys = await prisma.survey.findMany({
        where: { employeeId },
        include: {
          employee: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    const parsedSurveys = surveys.map((s: any) => ({
      ...s,
      animals: JSON.parse(s.animals)
    }));

    res.json(parsedSurveys);
  } catch (error) {
    console.error('[SURVEY] Get all error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
