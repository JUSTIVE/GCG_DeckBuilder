# 애니메이션 패턴

## 단계별 상태 기계 (Step State Machine)

`setTimeout` 체인으로 구현. `delays` 배열의 각 항목이 해당 단계 진입 시각:

```ts
delays.forEach((delay, i) =>
  timers.push(setTimeout(() => setStep(i + 1), delay))
);
```

- step 0 = 초기 상태 (딜레이 전)
- step N = delays[N-1] ms 후 상태
- `delays.length === steps.length - 1` (마지막 스텝은 즉시 도달)

## IntersectionObserver — 뷰포트 진입 시 재생

```ts
const observer = new IntersectionObserver(
  ([entry]) => { if (entry.isIntersecting) setTriggered(true); },
  { threshold: 0.4 },   // 40% 보일 때 트리거
);
observer.observe(el);
```

- `triggered` 플래그가 true가 되면 애니메이션 시작
- `replay()` 함수: `setTriggered(true)` + `setKey(k => k + 1)` → useEffect 재실행

## HandStrip 멀리건 애니메이션

phase별 카드 transform:
| phase | transform | 설명 |
|-------|-----------|------|
| returning | `translateY(±55px) scale(0.1)`, opacity 0 | 덱으로 날아감 |
| shuffling | 즉시 숨김 (`transition: none`) | 셔플 상태 |
| drawing | `translateY(0) scale(1)`, opacity 1 | 다시 날아옴 |
| initial | 즉시 숨김 (drawPhase) | |
| drawing (draw) | scale 1로 spring 애니 | |

stagger: `transitionDelay: i * 45ms` (returning), `i * 65ms` (drawing)

## 덱 셔플 keyframe 애니

```css
@keyframes deck-shuffle {
  0%   { transform: translateY(0) rotate(0deg); }
  20%  { transform: translateY(-4px) rotate(-5deg); }
  40%  { transform: translateY(-4px) rotate(5deg); }
  60%  { transform: translateY(-2px) rotate(-3deg); }
  80%  { transform: translateY(-1px) rotate(2deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
```
`animation="deck-shuffle 0.42s ease-in-out 2"` — 2회 반복

## MiniCard 애니메이션

- `rested`: `rotate(90deg)` — spring easing `cubic-bezier(0.34,1.56,0.64,1)` 350ms
- `destroyed / dim`: `opacity: 0.25`
- `highlight`: `ring-2 ring-offset-1 ring-primary shadow-md`
- `apBoost > 0`: AP 텍스트 `text-primary`로 색상 변경
- `hp <= 0`: HP 텍스트 `text-red-500 line-through`

## Tailwind transition 클래스 패턴

존 강조 전환: `transition-all duration-300`
ShieldSlots 개별 슬롯: `transitionDelay: ${i * 45}ms`
ZoneBox delay prop: `style={{ transitionDelay: '${delay}ms' }}`
