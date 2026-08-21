/**
 * checklist_items 시드 실행.
 * 사용: cd backend && npx tsx scripts/seedChecklistItems.ts
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

const ITEMS = [
  {
    item_key: 'mileage',
    item_label: '연간 예상 주행거리',
    input_type: 'SINGLE_CHOICE' as const,
    options:
      '["5,000km 이하","5,000 ~ 10,000km","10,000 ~ 15,000km","15,000km 이상"]',
    parent_item_key: null as string | null,
    trigger_value: null as string | null,
    display_order: 1,
  },
  {
    item_key: 'blackbox',
    item_label: '블랙박스 장착',
    input_type: 'SINGLE_CHOICE' as const,
    options: '["미장착","일반형 고정 장착","상시녹화형 장착"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 2,
  },
  {
    item_key: 'safedrive',
    item_label: '안전운전점수 서비스',
    input_type: 'SINGLE_CHOICE' as const,
    options: '["이용 중","미이용"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 3,
  },
  {
    item_key: 'safedriveService',
    item_label: '안전운전점수 서비스명',
    input_type: 'SINGLE_CHOICE' as const,
    options: null,
    parent_item_key: 'safedrive',
    trigger_value: '이용 중',
    display_order: 4,
  },
  {
    item_key: 'safedriveScore',
    item_label: '안전운전점수',
    input_type: 'NUMBER' as const,
    options: null,
    parent_item_key: 'safedrive',
    trigger_value: '이용 중',
    display_order: 5,
  },
  {
    item_key: 'fcw',
    item_label: '전방충돌방지장치',
    input_type: 'SINGLE_CHOICE' as const,
    options: '["출고 시 장착","미장착","확인 필요"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 6,
  },
  {
    item_key: 'ldw',
    item_label: '차선이탈경고장치',
    input_type: 'SINGLE_CHOICE' as const,
    options: '["출고 시 장착","미장착","확인 필요"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 7,
  },
];

async function main() {
  for (const item of ITEMS) {
    await prisma.checklist_items.upsert({
      where: { item_key: item.item_key },
      create: {
        ...item,
        allow_unknown: true,
        is_rider_judgment: true,
        is_active: true,
      },
      update: {
        item_label: item.item_label,
        is_active: true,
        options: item.options,
        parent_item_key: item.parent_item_key,
        trigger_value: item.trigger_value,
        display_order: item.display_order,
      },
    });
    console.log('ok', item.item_key);
  }
  const rows = await prisma.checklist_items.findMany({
    where: { is_active: true },
    select: { item_key: true, item_id: true },
    orderBy: { display_order: 'asc' },
  });
  console.log('active checklist_items:', rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
