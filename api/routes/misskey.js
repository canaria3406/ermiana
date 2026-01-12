import express from 'express';
import { MisskeyService } from '../services/misskeyService.js';

const router = express.Router();

/**
 * GET /api/v1/misskey/:noteId
 * Get Misskey note data
 */
router.get('/:noteId', async (req, res, next) => {
  try {
    const { noteId } = req.params;

    if (!noteId || !/^[a-zA-Z0-9]{10,16}$/.test(noteId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid note ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await MisskeyService.getNoteData(noteId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
