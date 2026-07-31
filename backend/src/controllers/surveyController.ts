import { Response } from 'express';
import prisma from '../db';
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

    // Create the survey record in the database, serializing animals as string
    const newSurvey = await prisma.survey.create({
      data: {
        customerName,
        mobile,
        village,
        address,
        animals: JSON.stringify(animals),
        totalAnimals: parseInt(totalAnimals),
        totalMilkProduction: parseFloat(totalMilkProduction),
        interested: !!interested,
        remarks,
        employeeId,
        surveyDate: surveyDate || new Date().toISOString().split('T')[0]
      },
      include: {
        employee: { select: { name: true } }
      }
    });

    // Check if farmer (customer) exists by mobile number
    const existingFarmer = await prisma.farmer.findFirst({
      where: { mobile }
    });

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

    if (existingFarmer) {
      // Update existing farmer details
      await prisma.farmer.update({
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
      // Register a new farmer
      const farmerCount = await prisma.farmer.count();
      const farmerId = `FMR-${String(farmerCount + 1).padStart(4, '0')}`;

      await prisma.farmer.create({
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

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: employeeId,
        action: 'SUBMIT_SURVEY',
        details: `Submitted survey for customer ${customerName} (Animals: ${totalAnimals}, Milk: ${totalMilkProduction}L)`
      }
    });

    const parsedSurvey = {
      ...newSurvey,
      animals: JSON.parse(newSurvey.animals)
    };

    res.status(201).json(parsedSurvey);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
