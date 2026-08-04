import { Response } from 'express';
import prisma, { TransactionClient } from '../db';
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

    if (typeof mobile !== 'string' || !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ error: 'Invalid age' });
    }

    const cows = cowCount ? parseInt(cowCount) : 0;
    const buffalos = buffaloCount ? parseInt(buffaloCount) : 0;

    if (isNaN(cows) || isNaN(buffalos) || cows < 0 || buffalos < 0) {
      return res.status(400).json({ error: 'Invalid animal count' });
    }

    const totalAnimals = cows + buffalos;

    const cowYield = cowMilkYield ? parseFloat(cowMilkYield) : 0;
    const buffaloYield = buffaloMilkYield ? parseFloat(buffaloMilkYield) : 0;

    if (isNaN(cowYield) || isNaN(buffaloYield) || cowYield < 0 || buffaloYield < 0) {
      return res.status(400).json({ error: 'Invalid milk yield value' });
    }

    // Generate farmer ID atomically using transaction
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const lastFarmer = await tx.farmer.findFirst({ orderBy: { id: 'desc' } });
      const nextNum = lastFarmer ? parseInt(lastFarmer.id.split('-')[1]) + 1 : 1;
      const farmerId = `FMR-${String(nextNum).padStart(4, '0')}`;

      const newFarmer = await tx.farmer.create({
        data: {
          id: farmerId,
          name,
          mobile,
          altMobile,
          gender,
          age: ageNum,
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
          cowMilkYield: cowYield,
          buffaloMilkYield: buffaloYield,
          registeredById: employeeId
        }
      });

      await tx.auditLog.create({
        data: {
          userId: employeeId,
          action: 'REGISTER_FARMER',
          details: `Registered farmer ${name} with ID ${farmerId}`
        }
      });

      return newFarmer;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('[FARMER] Register error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFarmers = async (req: AuthRequest, res: Response) => {
  const { search, village } = req.query;

  try {
    const filters: any = {};

    if (village && typeof village === 'string') {
      filters.village = village;
    }

    if (search && typeof search === 'string') {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } }
      ];
    }

    const farmers = await prisma.farmer.findMany({
      where: filters,
      include: {
        registeredBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(farmers);
  } catch (error) {
    console.error('[FARMER] Get all error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFarmerById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    if (typeof id !== 'string' || id.length === 0) {
      return res.status(400).json({ error: 'Invalid farmer ID' });
    }

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
  } catch (error) {
    console.error('[FARMER] Get by ID error');
    res.status(500).json({ error: 'Internal server error' });
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
  } catch (error) {
    console.error('[FARMER] Update error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFarmer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const farmer = await prisma.farmer.findUnique({ where: { id } });
    if (!farmer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Delete in a transaction to ensure atomicity
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.milkCollection.deleteMany({ where: { farmerId: id } });
      await tx.payment.deleteMany({ where: { farmerId: id } });
      await tx.farmer.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE_FARMER',
          details: `Deleted customer ${farmer.name} (ID: ${id})`
        }
      });
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('[FARMER] Delete error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
