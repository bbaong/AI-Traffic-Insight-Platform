import { Request, Response } from 'express';
import {
  listCustomers,
  listCustomerConsultations,
} from '../services/customer.service';

// GET /api/customers
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const q =
      typeof req.query.q === 'string' && req.query.q.trim()
        ? req.query.q.trim()
        : undefined;

    const data = await listCustomers(q);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '고객 목록 조회 실패' });
  }
};

// GET /api/customers/:id/consultations
export const getCustomerConsultations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: '고객 id가 필요합니다.' });
    }

    const result = await listCustomerConsultations(id as string);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      customerId: id,
      customer: result.customer,
      data: result.consultations,
    });
  } catch (error) {
    console.error(error);
    // BigInt("abc") 같은 잘못된 id
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return res.status(400).json({ success: false, message: '잘못된 고객 id입니다.' });
    }
    return res.status(500).json({ success: false, message: '상담 이력 조회 실패' });
  }
};