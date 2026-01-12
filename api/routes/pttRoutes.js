import express from 'express';
import { getPttData } from '../services/pttService.js';

const router = express.Router();

router.get('/:board/:postId', async (req, res, next) => {
  try {
    const { board, postId } = req.params;

    if (!board || !postId) {
      return res.status(400).json({
        success: false,
        error: 'Board and post ID are required',
      });
    }

    const data = await getPttData(board, postId);

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
