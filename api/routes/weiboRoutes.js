import express from 'express';
import { getWeiboData } from '../services/weiboService.js';

const router = express.Router();

router.get('/:statusId', async (req, res, next) => {
  try {
    const { statusId } = req.params;

    if (!statusId) {
      return res.status(400).json({
        success: false,
        error: 'Status ID is required',
      });
    }

    const data = await getWeiboData(statusId);

    if (data.error) {
      return res.status(200).json({
        success: true,
        data,
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
