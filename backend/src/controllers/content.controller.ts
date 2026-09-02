import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { successResponse, errorResponse, serverTimestamp } from '../utils/helpers';
import { logAction } from './audit.controller';
import { APP_NAME } from '../config/branding';

// ── Public Endpoints (For Mobile / Web Clients) ──────────────────────────────

export async function getPublicLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const docRef = db.collection('legal_documents').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Legal document not found'));
      return;
    }

    const data = snap.data()!;
    if (data.status !== 'published') {
      res.status(404).json(errorResponse('This document is currently not published'));
      return;
    }

    res.json(successResponse({
      id: snap.id,
      title: data.title,
      slug: data.slug || snap.id,
      content: data.publishedContent || data.content,
      version: data.publishedVersion || data.version || 1,
      updatedAt: data.publishedAt || data.updatedAt,
      summary: data.summary || '',
    }));
  } catch (error) {
    console.error('[Content] getPublicLegalDocument error:', error);
    res.status(500).json(errorResponse('Failed to fetch legal document', error));
  }
}

export async function getAllPublicLegalDocuments(_req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('legal_documents')
      .where('status', '==', 'published')
      .get();

    const docs = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title,
        slug: d.slug || doc.id,
        content: d.publishedContent || d.content,
        version: d.publishedVersion || d.version || 1,
        updatedAt: d.publishedAt || d.updatedAt,
        summary: d.summary || '',
      };
    });

    res.json(successResponse(docs));
  } catch (error) {
    console.error('[Content] getAllPublicLegalDocuments error:', error);
    res.status(500).json(errorResponse('Failed to fetch legal documents', error));
  }
}

// ── Admin Endpoints (RBAC Protected) ──────────────────────────────────────────

export async function getAdminLegalDocuments(_req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('legal_documents').get();

    if (snapshot.empty) {
      // Seed initial default documents if none exist
      await seedDefaultsInternal();
      const freshSnap = await db.collection('legal_documents').get();
      const docs = freshSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(successResponse(docs));
      return;
    }





  

    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort published first, then by title
    docs.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));

    res.json(successResponse(docs));
  } catch (error) {
    console.error('[Content] getAdminLegalDocuments error:', error);
    res.status(500).json(errorResponse('Failed to list legal documents', error));
  }
}

export async function getAdminLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const snap = await db.collection('legal_documents').doc(slug).get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Document not found'));
      return;
    }

    res.json(successResponse({ id: snap.id, ...snap.data() }));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch document', error));
  }
}

export async function createLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { title, slug, content, summary, status } = req.body;

    if (!title || !slug || !content) {
      res.status(400).json(errorResponse('Title, slug, and content are required'));
      return;
    }

    const sanitizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
    const existing = await db.collection('legal_documents').doc(sanitizedSlug).get();

    if (existing.exists) {
      res.status(409).json(errorResponse('A document with this slug already exists'));
      return;
    }

    const docStatus = status === 'published' ? 'published' : 'draft';
    const isPublished = docStatus === 'published';

    const docData: any = {
      id: sanitizedSlug,
      title,
      slug: sanitizedSlug,
      content,
      publishedContent: isPublished ? content : '',
      status: docStatus,
      version: 1,
      publishedVersion: isPublished ? 1 : 0,
      summary: summary || '',
      updatedBy: req.admin?.email || 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: isPublished ? serverTimestamp() : null,
    };

    await db.collection('legal_documents').doc(sanitizedSlug).set(docData);

    // Save initial version
    await db.collection('legal_documents').doc(sanitizedSlug).collection('versions').doc('v1').set({
      version: 1,
      title,
      content,
      status: docStatus,
      changeLog: 'Initial creation',
      createdBy: req.admin?.email || 'admin',
      createdAt: serverTimestamp(),
    });

    // Audit log
    if (req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'legal_document_created',
        sanitizedSlug,
        'legal_document',
        { title, slug: sanitizedSlug, status: docStatus },
        req.ip || ''
      );
    }

    res.json(successResponse(docData, 'Document created successfully'));
  } catch (error) {
    console.error('[Content] createLegalDocument error:', error);
    res.status(500).json(errorResponse('Failed to create document', error));
  }
}

export async function updateLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const { title, content, summary, changeLog } = req.body;

    const docRef = db.collection('legal_documents').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Document not found'));
      return;
    }

    const current = snap.data()!;
    const newVersion = (current.version || 1) + 1;

    const updates: any = {
      updatedAt: serverTimestamp(),
      updatedBy: req.admin?.email || 'admin',
    };

    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (summary !== undefined) updates.summary = summary;
    updates.version = newVersion;

    await docRef.update(updates);

    // Record draft version
    await docRef.collection('versions').doc(`v${newVersion}`).set({
      version: newVersion,
      title: title || current.title,
      content: content || current.content,
      status: current.status,
      changeLog: changeLog || 'Draft update',
      createdBy: req.admin?.email || 'admin',
      createdAt: serverTimestamp(),
    });

    if (req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'legal_document_updated',
        slug,
        'legal_document',
        { version: newVersion, changeLog },
        req.ip || ''
      );
    }

    res.json(successResponse({ id: slug, ...current, ...updates }, 'Draft saved successfully'));
  } catch (error) {
    console.error('[Content] updateLegalDocument error:', error);
    res.status(500).json(errorResponse('Failed to update document', error));
  }
}

export async function publishLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const { changeLog } = req.body;

    const docRef = db.collection('legal_documents').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Document not found'));
      return;
    }

    const current = snap.data()!;
    const publishedVersion = (current.publishedVersion || 0) + 1;

    const updates = {
      status: 'published',
      publishedContent: current.content,
      publishedVersion,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: req.admin?.email || 'admin',
    };

    await docRef.update(updates);

    // Record published version snapshot
    await docRef.collection('versions').doc(`v${current.version}_published`).set({
      version: current.version,
      publishedVersion,
      title: current.title,
      content: current.content,
      status: 'published',
      changeLog: changeLog || `Published as release v${publishedVersion}`,
      createdBy: req.admin?.email || 'admin',
      createdAt: serverTimestamp(),
    });

    if (req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'legal_document_published',
        slug,
        'legal_document',
        { publishedVersion, title: current.title },
        req.ip || ''
      );
    }

    res.json(successResponse({ id: slug, ...current, ...updates }, 'Document published successfully'));
  } catch (error) {
    console.error('[Content] publishLegalDocument error:', error);
    res.status(500).json(errorResponse('Failed to publish document', error));
  }
}

export async function unpublishLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const docRef = db.collection('legal_documents').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Document not found'));
      return;
    }

    await docRef.update({
      status: 'unpublished',
      updatedAt: serverTimestamp(),
      updatedBy: req.admin?.email || 'admin',
    });

    if (req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'legal_document_unpublished',
        slug,
        'legal_document',
        {},
        req.ip || ''
      );
    }

    res.json(successResponse(null, 'Document unpublished successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to unpublish document', error));
  }
}

export async function archiveLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const docRef = db.collection('legal_documents').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Document not found'));
      return;
    }

    // Archiving never deletes content — it only flips status, exactly like
    // unpublish, so the page still exists in Firestore for later restore.
    await docRef.update({
      status: 'archived',
      updatedAt: serverTimestamp(),
      updatedBy: req.admin?.email || 'admin',
    });

    if (req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'legal_document_archived',
        slug,
        'legal_document',
        {},
        req.ip || ''
      );
    }

    res.json(successResponse(null, 'Document archived successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to archive document', error));
  }
}

export async function restoreLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const docRef = db.collection('legal_documents').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Document not found'));
      return;
    }

    // Bring an archived page back into the editable pool as a draft; admin
    // can then Publish it again from the normal editor flow.
    await docRef.update({
      status: 'draft',
      updatedAt: serverTimestamp(),
      updatedBy: req.admin?.email || 'admin',
    });

    if (req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'legal_document_restored',
        slug,
        'legal_document',
        {},
        req.ip || ''
      );
    }

    res.json(successResponse(null, 'Document restored to draft'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to restore document', error));
  }
}

export async function deleteLegalDocument(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const docRef = db.collection('legal_documents').doc(slug);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json(errorResponse('Document not found'));
      return;
    }

    await docRef.delete();

    if (req.admin) {
      await logAction(
        req.admin.uid,
        req.admin.email,
        'legal_document_deleted',
        slug,
        'legal_document',
        {},
        req.ip || ''
      );
    }

    res.json(successResponse(null, 'Document deleted successfully'));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to delete document', error));
  }
}

export async function getDocumentVersions(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const snapshot = await db.collection('legal_documents').doc(slug).collection('versions')
      .orderBy('createdAt', 'desc')
      .get();

    const versions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(successResponse(versions));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to fetch versions', error));
  }
}

// ── Default Policy Seeder ───────────────────────────────────────────────────

async function seedDefaultsInternal(): Promise<void> {
  const defaultDocs = [
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      summary: 'Data protection, biometric security, photo privacy controls, and user confidentiality rights.',
      content: `# Privacy Policy\n\n**Last Updated: August 2026**\n\nWelcome to **${APP_NAME}**. We respect your personal privacy and are committed to safeguarding your private matrimonial data with highest Islamic integrity and digital security standards.\n\n### 1. Information Security & Encryption\nAll personal biodata details, private messaging sessions, and candidate photos are encrypted both in transit (TLS 1.3) and at rest (AES-256). Your critical identity documents and CNIC data are hosted exclusively in restricted access vaults.\n\n### 2. Profile & Photo Privacy Controls\n* **Photo Blurring**: Candidates can enable automatic photo blurring by default.\n* **Access Requests**: Other members must request explicit approval before viewing unblurred images.\n* **Watermarking & Protection**: Screenshot prevention safeguards are active across all profile views.\n\n### 3. Contact & Phone Confidentiality\n${APP_NAME} will **never** display your phone number, email address, or exact location coordinates publicly to other seekers. Contact exchanges only occur upon mutual guardian/Wali consent.\n\n### 4. Right to Deletion & Data Erasure\nYou can permanently delete your candidate profile and erase all associated compatibility traits, photos, voice notes, and preferences at any time from Settings.`,
    },
    {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      summary: 'User eligibility, matrimonial conduct, subscription policies, and account rules.',
      content: `# Terms of Service\n\n**Effective Date: August 2026**\n\nBy creating an account on **${APP_NAME}**, you agree to be bound by these Terms of Service.\n\n### 1. User Eligibility\nYou must be a practicing Muslim of legal marriageable age (at least 18 years old) seeking a genuine, halal marital partnership. Casual dating, hookups, or friendships are strictly prohibited.\n\n### 2. Profile Authenticity & Verification\nYou agree to provide accurate, honest, and complete information during signup. Misrepresentation of marital status, age, or identity will result in immediate permanent expulsion.\n\n### 3. Family Involvement & Wali Access\nWe encourage family involvement throughout the matrimonial journey. Guardians/Walis can be invited as chaperones to monitor conversations and ensure respectful, halal communication.\n\n### 4. Subscription & Transactions\nPremium packages grant enhanced visibility and priority matching. All subscription fees are processed securely through certified payment gateways.`,
    },
    {
      slug: 'community-guidelines',
      title: 'Community Guidelines',
      summary: 'Halal communication standards, respectful conduct, and zero-tolerance harassment rules.',
      content: `# Community Guidelines\n\n${APP_NAME} is built on respect, Islamic values, and genuine matrimonial intentions.\n\n### 1. Halal Intentions Only\nThis platform is exclusively dedicated to marriage (Nikkah). Any users seeking casual relationships, dating, or commercial arrangements will be permanently banned.\n\n### 2. Respectful Communication\n* Treat all candidates and their families with courtesy and Islamic etiquette (Adab).\n* No foul language, harassment, discrimination, or offensive remarks.\n* Respect decisions gracefully when another seeker declines a connection.\n\n### 3. Safety & Reporting\nNever share banking information or send money to other members. Report any suspicious behavior immediately to our moderation team.`,
    },
    {
      slug: 'halal-usage-policy',
      title: 'Halal Usage Policy',
      summary: 'Islamic matchmaking principles, chaperone tools, and modesty guidelines.',
      content: `# Halal Usage Policy\n\n${APP_NAME} was created to provide a dignified, Sharia-compliant alternative to modern dating applications.\n\n### 1. Moderated Interactions\nAll candidate profiles and photos undergo strict moderation to preserve modesty (Haya). Inappropriate or suggestive content is promptly removed.\n\n### 2. Chaperone System (Wali / Guardian)\nOur system provides built-in tools for parents and guardians to oversee chats and join the matching process, ensuring peace of mind for candidates and their families.\n\n### 3. Identity & Gender Verification\nEvery profile undergoes mandatory gender and identity verification via voice introduction and CNIC review to eliminate fraudulent accounts.`,
    },
    {
      slug: 'refund-policy',
      title: 'Refund & Cancellation Policy',
      summary: 'Pricing clarity, subscription cancellations, and refund terms.',
      content: `# Refund & Cancellation Policy\n\n### 1. Digital Services\n${APP_NAME} provides digital matchmaking subscriptions and verification services. Once verification or profile boosting has been activated, fees are generally non-refundable.\n\n### 2. Technical Errors\nIf you were double-charged due to a technical error, our support team will process a full refund within 5–7 business days upon receipt of transaction proof.\n\n### 3. Subscription Management\nYou can cancel auto-renewing subscriptions at any time via your account settings.`,
    },
    {
      slug: 'safety-guidelines',
      title: 'Safety & Anti-Fraud Guidelines',
      summary: 'Best practices for safe interactions, scam prevention, and secure meetings.',
      content: `# Safety & Anti-Fraud Guidelines\n\nYour safety is our highest priority.\n\n### 1. Financial Safety\n* **NEVER send money** or financial assistance to anyone you meet online, regardless of their story.\n* Report anyone who requests funds or promotes investment opportunities immediately.\n\n### 2. Safe Meetings\n* Always involve your family or Wali before meeting a candidate in person.\n* Schedule first meetings in public venues with family members present.\n\n### 3. Guarding Personal Information\nDo not share sensitive credentials, home addresses, or financial documents in initial chat sessions.`,
    },
    {
      slug: 'verification-policy',
      title: 'Verification & KYC Policy',
      summary: 'CNIC identity verification, voice gender review, and verification badge criteria.',
      content: `# Verification & KYC Policy\n\n### 1. Mandatory Identity Checks\nTo maintain a secure community, candidates can submit their government-issued CNIC/Passport for private KYC review by authorized verification staff.\n\n### 2. Private Voice Verification\nVoice recordings are reviewed privately by administrators solely for gender verification and are **never** shared with or made audible to other users.\n\n### 3. Verified Badge\nThe Verified Badge indicates that a candidate's identity and gender have been validated by our team.`,
    },
    {
      slug: 'about-us',
      title: `About ${APP_NAME}`,
      summary: 'Our story, mission, and commitment to halal matchmaking across Pakistan.',
      content: `# About ${APP_NAME}\n\n**Helping Pakistani Muslims find their life partner through a halal, trustworthy, and family-oriented platform.**\n\n### Our Mission\nMarriage (Nikkah) is half our Deen. We believe the process of finding a spouse should be dignified, respectful, and transparent. ${APP_NAME} combines modern design and cutting-edge technology with timeless Islamic principles to help families connect safely.\n\n### Our Core Values\n* **Modesty (Haya)**: Privacy first, blurred photo controls, and respectful interactions.\n* **Authenticity**: Rigorous identity verification to eliminate fake profiles.\n* **Family-Centric**: Empowering guardians and parents to actively support their children.\n\nMade with ❤️ in Pakistan 🇵🇰 · © 2026 ${APP_NAME}. All rights reserved.`,
    },
  ];

  for (const doc of defaultDocs) {
    const docRef = db.collection('legal_documents').doc(doc.slug);
    const snap = await docRef.get();
    if (!snap.exists) {
      await docRef.set({
        id: doc.slug,
        title: doc.title,
        slug: doc.slug,
        content: doc.content,
        publishedContent: doc.content,
        summary: doc.summary,
        status: 'published',
        version: 1,
        publishedVersion: 1,
        updatedBy: 'system@wud.app',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
      });

      await docRef.collection('versions').doc('v1_published').set({
        version: 1,
        publishedVersion: 1,
        title: doc.title,
        content: doc.content,
        status: 'published',
        changeLog: 'Initial seeded policy',
        createdBy: 'system@wud.app',
        createdAt: serverTimestamp(),
      });
    }
  }
}
