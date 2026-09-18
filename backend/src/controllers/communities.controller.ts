// @ts-nocheck
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, createAuditLog, getClientIp, serverTimestamp } from '../utils/helpers';

// Communities are admin-authored content, the same shape as
// legal_documents — no separate posts.* permission needed, reuses the
// existing content.* permissions already granted to admin/content_moderator.

export async function listCommunities(req: Request, res: Response): Promise<void> {
  try {
    const snap = await db.collection('communities').orderBy('createdAt', 'desc').get();
    res.json(successResponse(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch communities', error));
  }
}

export async function createCommunity(req: Request, res: Response): Promise<void> {
  try {
    const { id, name, description, coverImageUrl, category } = req.body as {
      id: string; name: string; description?: string; coverImageUrl?: string; category?: string;
    };
    if (!id || !/^[a-z0-9_]+$/.test(id)) {
      res.status(400).json(errorResponse('id is required and must be lowercase letters/digits/underscores only'));
      return;
    }
    if (!name || typeof name !== 'string') {
      res.status(400).json(errorResponse('name is required'));
      return;
    }

    const ref = db.collection('communities').doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      res.status(409).json(errorResponse('A community with this id already exists'));
      return;
    }

    await ref.set({
      id, name, description: description || '', coverImageUrl: coverImageUrl || null,
      category: category || 'general', isActive: true, memberCount: 0, postCount: 0,
      createdBy: req.admin!.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });

    await createAuditLog({
      adminId: req.admin!.uid, adminEmail: req.admin!.email, action: 'CREATE_COMMUNITY',
      targetId: id, targetType: 'community', details: { name },
      timestamp: serverTimestamp() as any, ip: getClientIp(req) as string,
    });

    res.status(201).json(successResponse({ id }, 'Community created'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to create community', error));
  }
}

export async function updateCommunity(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { name, description, coverImageUrl, category, isActive } = req.body as {
      name?: string; description?: string; coverImageUrl?: string; category?: string; isActive?: boolean;
    };

    const ref = db.collection('communities').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json(errorResponse('Community not found'));
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
    if (category !== undefined) updates.category = category;
    if (isActive !== undefined) updates.isActive = isActive;

    await ref.update(updates);

    await createAuditLog({
      adminId: req.admin!.uid, adminEmail: req.admin!.email, action: 'UPDATE_COMMUNITY',
      targetId: id, targetType: 'community', details: updates,
      timestamp: serverTimestamp() as any, ip: getClientIp(req) as string,
    });

    res.json(successResponse(null, 'Community updated'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to update community', error));
  }
}
