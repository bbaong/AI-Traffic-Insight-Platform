-- checklist_items 시드 (상담 저장·리포트 요약용)
-- item_key는 프론트 ChecklistAnswers 키와 동일 (camelCase)
-- 이미 있으면면 IGNORE / 수동 확인 후 실행하세요.

INSERT IGNORE INTO checklist_items
  (item_key, item_label, input_type, options, allow_unknown, parent_item_key, trigger_value, is_rider_judgment, display_order, is_active)
VALUES
  ('mileage', '연간 예상 주행거리', 'SINGLE_CHOICE',
   '["5,000km 이하","5,000 ~ 10,000km","10,000 ~ 15,000km","15,000km 이상"]',
   1, NULL, NULL, 1, 1, 1),
  ('blackbox', '블랙박스 장착', 'SINGLE_CHOICE',
   '["미장착","일반형 고정 장착","상시녹화형 장착"]',
   1, NULL, NULL, 1, 2, 1),
  ('safedrive', '안전운전점수 서비스', 'SINGLE_CHOICE',
   '["이용 중","미이용"]',
   1, NULL, NULL, 1, 3, 1),
  ('safedriveService', '안전운전점수 서비스명', 'SINGLE_CHOICE',
   NULL, 1, 'safedrive', '이용 중', 1, 4, 1),
  ('safedriveScore', '안전운전점수', 'NUMBER',
   NULL, 1, 'safedrive', '이용 중', 1, 5, 1),
  ('fcw', '전방충돌방지장치', 'SINGLE_CHOICE',
   '["출고 시 장착","미장착","확인 필요"]',
   1, NULL, NULL, 1, 6, 1),
  ('ldw', '차선이탈경고장치', 'SINGLE_CHOICE',
   '["출고 시 장착","미장착","확인 필요"]',
   1, NULL, NULL, 1, 7, 1);
