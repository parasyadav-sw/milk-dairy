import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const registerFarmer = async (req: AuthRequest, res: Response) => {
  const {
    name,
    mobile,
    altMobile,
    gender,
    age,
    aadhaar,
    village,
    taluka,
    district,
    address,
    gpsLocation,
    animalType,
    cowCount,
    buffaloCount,
    cowMilkYield,
    buffaloMilkYield
  } = req.body;

  try {
    const employeeId = req.user?.id;
    if (!employeeId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !mobile || !gender || !age || !village || !taluka || !district || !address || !animalType) {
      return res.status(400).json({ error: 'Missing required farmer registration details' });
    }

    // Auto-generate farmer ID (e.g., FMR-0001)
    const farmerCount = await prisma.farmer.count();
    const farmerId = `FMR-${String(farmerCount + 1).padStart(4, '0')}`;

    const cows = cowCount ? parseInt(cowCount) : 0;
    const buffalos = buffaloCount ? parseInt(buffaloCount) : 0;
    const totalAnimals = cows + buffalos;

    const newFarmer = await prisma.farmer.create({
      data: {
        id: farmerId,
        name,
        mobile,
        altMobile,
        gender,
        age: parseInt(age),
        aadhaar,
        village,
        taluka,
        district,
        address,
        gpsLocation,
        animalType,
        cowCount: cows,
        buffaloCount: buffalos,
        totalAnimals,
        cowMilkYield: cowMilkYield ? parseFloat(cowMilkYield) : 0.0,
        buffaloMilkYield: buffaloMilkYield ? parseFloat(buffaloMilkYield) : 0.0,
        registeredById: employeeId
      }
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: employeeId,
        action: 'REGISTER_FARMER',
        details: `Registered farmer ${name} with ID ${farmerId}`
      }
    });

    res.status(201).json(newFarmer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFarmers = async (req: AuthRequest, res: Response) => {
  const { search, village } = req.query;

  try {
    const filters: any = {};

    if (village) {
      filters.village = String(village);
    }

    if (search) {
      filters.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { id: { contains: String(search), mode: 'insensitive' } },
        { mobile: { contains: String(search) } }
      ];
    }

    // If Employee, we could restrict them to only see their registered/route farmers,
    // but the prompt says they can "View all Farmers" or registers. Let's make it open.
    const farmers = await prisma.farmer.findMany({
      where: filters,
      include: {
        registeredBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(farmers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFarmerById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: {
        registeredBy: { select: { name: true } },
        milkCollections: { orderBy: { createdAt: 'desc' }, take: 10 },
        payments: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json(farmer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateFarmer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    mobile,
    altMobile,
    gender,
    age,
    aadhaar,
    village,
    taluka,
    district,
    address,
    gpsLocation,
    animalType,
    cowCount,
    buffaloCount,
    cowMilkYield,
    buffaloMilkYield
  } = req.body;

  try {
    const updaterId = req.user?.id;
    if (!updaterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const farmer = await prisma.farmer.findUnique({ where: { id } });
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const cows = cowCount !== undefined ? parseInt(cowCount) : farmer.cowCount;
    const buffalos = buffaloCount !== undefined ? parseInt(buffaloCount) : farmer.buffaloCount;
    const totalAnimals = cows + buffalos;

    const updated = await prisma.farmer.update({
      where: { id },
      data: {
        name: name !== undefined ? name : farmer.name,
        mobile: mobile !== undefined ? mobile : farmer.mobile,
        altMobile: altMobile !== undefined ? altMobile : farmer.altMobile,
        gender: gender !== undefined ? gender : farmer.gender,
        age: age !== undefined ? parseInt(age) : farmer.age,
        aadhaar: aadhaar !== undefined ? aadhaar : farmer.aadhaar,
        village: village !== undefined ? village : farmer.village,
        taluka: taluka !== undefined ? taluka : farmer.taluka,
        district: district !== undefined ? district : farmer.district,
        address: address !== undefined ? address : farmer.address,
        gpsLocation: gpsLocation !== undefined ? gpsLocation : farmer.gpsLocation,
        animalType: animalType !== undefined ? animalType : farmer.animalType,
        cowCount: cows,
        buffaloCount: buffalos,
        totalAnimals,
        cowMilkYield: cowMilkYield !== undefined ? parseFloat(cowMilkYield) : farmer.cowMilkYield,
        buffaloMilkYield: buffaloMilkYield !== undefined ? parseFloat(buffaloMilkYield) : farmer.buffaloMilkYield
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: updaterId,
        action: 'UPDATE_FARMER',
        details: `Updated details for farmer ${farmer.name} (ID: ${id})`
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
