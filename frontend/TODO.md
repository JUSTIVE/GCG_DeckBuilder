# TODO

1. 카드 검색 결과에 연관된 카드도 찾아주기
2. 대회 일정 시트 보고 업뎃하기
3. ~~link pilot 처리에 오류가 있음. 덱에 카드를 추가하면 항상 true가 되어버림. 덱에 카드가 추가되고 삭제될 때에 덱의 카드들의 링크 여부를 재계산 해야 함.~~ 해결: fieldResolver.ts의 `buildTaggedDeckCards`가 raw 카드 데이터를 `computeDeckLinkSets` 등에 넘기고 있었는데, 헬퍼는 GraphQL 해상 후 shape (`card.pilot.name.ko`, `card.links[].pilot.name.ko`)를 기대해서 매칭이 전부 실패함. `normalizeRawCardForLinks`로 raw → normalized 변환 후 헬퍼에 넘기도록 수정.
