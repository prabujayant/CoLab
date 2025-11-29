import { Router } from 'express';
import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument, getDocumentHistory, getSnapshot, restoreSnapshot, trackVisit } from '../controllers/document.controller';

const router = Router();

router.get('/', listDocuments);
router.post('/', createDocument);
router.get('/:slug', getDocument);
router.put('/:slug', updateDocument);
router.delete('/:slug', deleteDocument);
router.get('/:slug/history', getDocumentHistory);
router.get('/:slug/snapshot/:snapshotId', getSnapshot);
router.post('/:slug/restore/:snapshotId', restoreSnapshot);
router.post('/:slug/visit', trackVisit);

export default router;
