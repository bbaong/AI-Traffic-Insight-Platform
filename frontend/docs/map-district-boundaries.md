# 대구 구·군 경계 · Choropleth 렌더링 개선

## 개요

공유 경계 이중 획·과도한 단순화·본토·군위 복도 연결을 정리했다. 선보다 위험도 색 영역이 중심이 되도록 스타일을 바꿨다.

## 원인과 대응

| 문제 | 원인 | 대응 |
|------|------|------|
| 공유 경계가 유난히 굵음 | 구·군마다 청록 strokeWeight 2로 이중 획 | 내부 경계 흰색 1px + 외곽만 청록 2px |
| 경계 찌그러짐 | light 좌표를 링당 ~100점으로 추가 솎음 | 추가 단순화 제거, light 원본 유지 |
| 본토·군위 사선/복도 | 시도 dissolve가 맞닿은 점으로 하나로 연결 | 외곽 = 본토 dissolve + 군위 path 분리 |
| 달성군 분리 영역 | MultiPolygon | `paths[][]`, path마다 별도 Polygon |

## 스타일

```text
구·군 내부: stroke #FFF / 1px / fillOpacity 0.58 (위험색)
대구 외곽:  stroke #0E7C86 / 2px / fill 0
Hover:      stroke 2px accent, fill 0.68
선택:       stroke 3px accent, fill 0.72
```

## 파일

| 파일 | 변경 |
|------|------|
| `src/constants/daeguBoundaries.ts` | 좌표 재추출 + `DAEGU_OUTLINE_PATHS` |
| `src/components/dashboard/MapCard.tsx` | Choropleth·hover/select·외곽 레이어 |
| `src/components/dashboard/MapCard.module.css` | 선택 힌트 |

## 데이터

- 출처: vuski/admdongkor `20251231` light
- 군위 포함 (27720)
- 임시 위험도: `DISTRICT_RISK_MOCK` (`riskByCode` prop으로 교체 가능)

## 한계

- light 단순화라 하천·행정선 굴곡은 개략적
- 공유 경계는 여전히 두 폴리곤이 맞닿아 그리지만, 흰색 1px라 이중 획이 덜 눈에 띔
- 군위 때문에 전체 bounds 시 본토가 다소 작게 보일 수 있음 (padding 40 적용)
