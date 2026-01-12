import express from 'express';
import { PchomeService } from '../services/pchomeService.js';

const router = express.Router();

/**
 * GET /api/v1/pchome/:productId
 * Get PChome product data
 */
router.get('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId || !/^[A-Z0-9]{6}-[A-Z0-9]{9}$/.test(productId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid product ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await PchomeService.getProductData(productId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
