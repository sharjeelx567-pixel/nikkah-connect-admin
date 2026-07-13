import { Request, Response } from 'express';
import { db, admin } from '../config/firebase';
import { successResponse, errorResponse, createAuditLog, getClientIp, serverTimestamp } from '../utils/helpers';
import { AppSettings } from '../types';

const SETTINGS_DOC_ID = 'config';

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const doc = await db.collection('app_settings').doc(SETTINGS_DOC_ID).get();
    if (!doc.exists) {
      const defaultSettings: AppSettings = {
        maintenanceMode: false,
        premiumMonthlyPrice: 9.99,
        premiumYearlyPrice: 79.99,
        maxPhotosPerUser: 5,
        allowRegistration: true,
        requireEmailVerification: true,
        matchingEnabled: true,
        chatEnabled: true,
        featureFlags: {
          videoVerification: true,
          socialLogin: true,
          dailyMatchesLimit: false,
        },
      };
      
      await db.collection('app_settings').doc(SETTINGS_DOC_ID).set(defaultSettings);
      res.json(successResponse(defaultSettings));
      return;
    }
    
    res.json(successResponse(doc.data()));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch settings', error));
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const settingsData = req.body as Partial<AppSettings>;

    await db.collection('app_settings').doc(SETTINGS_DOC_ID).set(settingsData, { merge: true });

    await createAuditLog({
      adminId: req.admin!.uid,
      adminEmail: req.admin!.email,
      action: 'UPDATE_SETTINGS',
      targetId: SETTINGS_DOC_ID,
      targetType: 'setting',
      details: settingsData,
      timestamp: new Date(),
      ip: getClientIp(req),
    });

    res.json(successResponse(settingsData, 'App configurations updated successfully.'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to update settings', error));
  }
}
