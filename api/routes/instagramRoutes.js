import express from 'express';
import { getInstagramData } from '../services/instagramService.js';

const router = express.Router();

router.get('/:postId', async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required',
      });
    }

    const data = await getInstagramData(postId);

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
