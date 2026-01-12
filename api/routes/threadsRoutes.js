import express from 'express';
import { getThreadsData } from '../services/threadsService.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    const data = await getThreadsData(url);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
