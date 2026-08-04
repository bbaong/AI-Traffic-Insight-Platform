import { Request, Response } from 'express';

// GET /api/customers
export const getCustomers = async (_req: Request, res: Response) => {
  try {
    // TODO: customers 목록 조회
    return res.status(200).json({ success: true, data: [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '고객 목록 조회 실패' });
  }
};

// GET /api/customers/:id/consultations
export const getCustomerConsultations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: 고객별 상담 이력 조회
    return res.status(200).json({ success: true, data: [], customerId: id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '상담 이력 조회 실패' });
  }
};
