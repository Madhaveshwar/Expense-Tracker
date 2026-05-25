import { parseReceipt } from '../services/geminiService.js';

export async function scanReceipt(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a receipt image file (PNG, JPEG, WEBP)' });
    }

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Uploaded file must be a valid image' });
    }

    console.log(`Starting receipt scan for file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Call our Gemini Multimodal Service
    const parsedData = await parseReceipt(fileBuffer, mimeType);

    return res.status(200).json({
      message: 'Receipt parsed successfully',
      data: {
        merchant: parsedData.merchant || 'Unknown Merchant',
        amount: parsedData.amount || 0,
        tax: parsedData.tax || 0,
        date: parsedData.date || new Date().toISOString().split('T')[0],
        items: parsedData.items || []
      }
    });
  } catch (error) {
    console.error('Receipt Scan Controller Error:', error.message);
    next(error);
  }
}
