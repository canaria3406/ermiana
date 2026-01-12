import express from 'express';
import { EhService } from '../services/ehService.js';

const router = express.Router();

/**
 * GET /api/v1/eh/:galleryId/:token
 * Get E-Hentai gallery data
 */
router.get('/:galleryId/:token', async (req, res, next) => {
  try {
    const { galleryId, token } = req.params;

    if (!galleryId || !token) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid gallery ID or token',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await EhService.getGalleryData(galleryId, token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
