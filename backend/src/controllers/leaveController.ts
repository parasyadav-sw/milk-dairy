import { Response } from 'express';
import prisma, { TransactionClient } from '../db';
import { AuthRequest } from '../middleware/auth';

export const applyLeave = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, reason } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Start date, end date, and reason are required' });
    }

    if (typeof startDate !== 'string' || typeof endDate !== 'string') {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'Start date must be before or equal to end date' });
    }

    const leave = await prisma.leave.create({
      data: {
        userId,
        startDate,
        endDate,
        reason,
        status: 'PENDING'
      }
    });

    res.status(201).json(leave);
  } catch (error) {
    console.error('[LEAVE] Apply error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveOrRejectLeave = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const approverId = req.user?.id;
    const role = req.user?.role;

    if (!approverId || role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Admins can approve/reject leaves' });
    }

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const leaveId = parseInt(id);
    if (isNaN(leaveId)) {
      return res.status(400).json({ error: 'Invalid leave ID' });
    }

    const existingLeave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { user: true }
    });

    if (!existingLeave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Use transaction for leave approval and attendance creation
    const updated = await prisma.$transaction(async (tx: TransactionClient) => {
      const leaveUpdate = await tx.leave.update({
        where: { id: leaveId },
        data: {
          status,
          approvedById: approverId
        }
      });

      if (status === 'APPROVED') {
        const start = new Date(existingLeave.startDate);
        const end = new Date(existingLeave.endDate);
        const loop = new Date(start);

        while (loop <= end) {
          const dateStr = loop.toISOString().split('T')[0];

          try {
            await tx.attendance.create({
              data: {
                userId: existingLeave.userId,
                date: dateStr,
                status: 'LEAVE'
              }
            });
          } catch (e: any) {
            // Skip if attendance already exists for this date
            if (e.code !== 'P2002') throw e;
          }
          loop.setDate(loop.getDate() + 1);
        }
      }

      await tx.auditLog.create({
        data: {
          userId: approverId,
          action: `${status}_LEAVE`,
          details: `${status} leave for employee ${existingLeave.user.name} (ID: ${existingLeave.userId})`
        }
      });

      return leaveUpdate;
    });

    res.json(updated);
  } catch (error) {
    console.error('[LEAVE] Approve/reject error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let leaves;

    if (role === 'ADMIN') {
      leaves = await prisma.leave.findMany({
        include: {
          user: { select: { name: true, role: true } },
          approvedBy: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      leaves = await prisma.leave.findMany({
        where: { userId },
        include: {
          approvedBy: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json(leaves);
  } catch (error) {
    console.error('[LEAVE] Get error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
