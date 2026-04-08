import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import {
  triggerClass,
  abilityClass,
  TRIGGER_FALLBACK,
  ABILITY_FALLBACK,
} from "@/components/CardDescription";

// ── badge helpers ─────────────────────────────────────────────────────────────

const TRIGGER_LIGHT = "bg-gray-100 text-gray-700";
const ABILITY_LIGHT = "border-gray-300 bg-gray-50 text-gray-700";

function TBadge({ name }: { name: string }) {
  const cls = triggerClass(name);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold",
        cls === TRIGGER_FALLBACK ? TRIGGER_LIGHT : cls,
      )}
    >
      {name}
    </span>
  );
}

function ABadge({ name }: { name: string }) {
  const cls = abilityClass(name);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold",
        cls === ABILITY_FALLBACK ? ABILITY_LIGHT : cls,
      )}
    >
      {name}
    </span>
  );
}

// ── layout helpers ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <span className="font-semibold text-sm flex-1">{title}</span>
        <ChevronRightIcon
          className={cn(
            "size-4 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 flex flex-col gap-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-md px-3 py-2 text-xs text-muted-foreground leading-relaxed">
      {children}
    </div>
  );
}

// ── data ──────────────────────────────────────────────────────────────────────

const PHASES = [
  {
    label: "스타트 페이즈",
    color: "bg-blue-50 border-blue-200",
    headColor: "text-blue-700",
    steps: [
      {
        name: "액티브 스텝",
        desc: "자신 필드(배틀 에어리어·리소스 에어리어·베이스 존)의 레스트 카드 전부를 동시에 액티브로.",
      },
      { name: "스타트 스텝", desc: "「턴 개시 시」 효과 발동." },
    ],
  },
  {
    label: "드로우 페이즈",
    color: "bg-green-50 border-green-200",
    headColor: "text-green-700",
    steps: [
      {
        name: "드로우",
        desc: "덱 위에서 1장 드로우. 덱이 0장이 되면 그 시점에 패배.",
      },
    ],
  },
  {
    label: "리소스 페이즈",
    color: "bg-yellow-50 border-yellow-200",
    headColor: "text-yellow-700",
    steps: [
      {
        name: "리소스 추가",
        desc: "리소스 덱 위에서 1장을 리소스 에어리어에 앞면 액티브 상태로 배치.",
      },
    ],
  },
  {
    label: "메인 페이즈",
    color: "bg-orange-50 border-orange-200",
    headColor: "text-orange-700",
    steps: [
      {
        name: "패 플레이",
        desc: "코스트를 지불해 유닛 배치 / 베이스 배치 / 파일럿 세트 / 【메인】 커맨드 발동.",
      },
      {
        name: "【기동･메인】 발동",
        desc: "유닛 어택 중이 아닐 때 기동메인 효과 발동.",
      },
      {
        name: "유닛 어택",
        desc: "액티브 유닛으로 상대 플레이어 또는 레스트 상태 상대 유닛을 어택.",
      },
    ],
    note: "위 3가지를 원하는 순서로 몇 번이고 반복. 「메인 페이즈 종료」를 선언하면 엔드 페이즈로.",
  },
  {
    label: "엔드 페이즈",
    color: "bg-purple-50 border-purple-200",
    headColor: "text-purple-700",
    steps: [
      {
        name: "액션 스텝",
        desc: "비 턴 플레이어부터 교대로 【액션】/【기동･액션】 발동 가능. 양측 연속 패스로 종료.",
      },
      { name: "엔드 스텝", desc: "「턴 종료 시」 효과 발동." },
      {
        name: "핸드 스텝",
        desc: "패가 10장 초과 시 10장이 되도록 카드를 선택해 버림.",
      },
      {
        name: "클린업 스텝",
        desc: "「이 턴 중」 효과 소멸. 발생한 효과 해결 후 상대에게 턴 이동.",
      },
    ],
  },
];

const BATTLE_STEPS = [
  {
    name: "어택 스텝",
    desc: "액티브 유닛 1기를 레스트시키고, 상대 플레이어 또는 레스트 상태 상대 유닛을 어택 대상으로 선언. 【어택 시】 효과 발동.",
  },
  {
    name: "블록 스텝",
    desc: "비 턴 플레이어는 《블로커》 보유 유닛을 레스트시켜 어택 대상을 변경 가능. 1회의 어택에 1번만.",
  },
  {
    name: "액션 스텝",
    desc: "양측 교대로 【액션】/【기동･액션】 발동 가능. 양측 연속 패스로 종료.",
  },
  {
    name: "대미지 스텝",
    desc: "어택 성립. 유닛끼리 어택 시 서로 AP만큼 배틀 대미지 교환. 플레이어 어택 시 실드 에어리어에 순서대로 대미지.",
  },
  {
    name: "배틀 종료 스텝",
    desc: "「이 배틀 중」 효과 전부 소멸. 메인 페이즈로 복귀.",
  },
];

// ── page ──────────────────────────────────────────────────────────────────────

export function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4 w-full">
      <div>
        <h1 className="text-lg font-bold">게임 규칙</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          건담 카드 게임 종합 규칙 Ver. 1.4.1 요약
        </p>
      </div>

      {/* ── 게임 목표 ── */}
      <Section title="게임 목표와 승패" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-700 mb-1.5">승리 조건</p>
            <ul className="text-xs text-green-800 flex flex-col gap-1">
              <li>· 상대 실드 에어리어가 0장인 상태에서 유닛으로 배틀 대미지를 줌</li>
              <li>· 상대 덱을 0장으로 만듦</li>
            </ul>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">패배 조건</p>
            <ul className="text-xs text-red-800 flex flex-col gap-1">
              <li>· 실드 에어리어 0장 상태에서 배틀 대미지를 받음</li>
              <li>· 덱이 0장이 됨 (드로우 시점 포함)</li>
              <li>· 투료 선언 → 즉시 패배</li>
            </ul>
          </div>
        </div>
        <Note>
          카드 텍스트가 종합 규칙과 모순될 경우 카드 텍스트가 우선합니다.
          금지 효과는 항상 허용 효과보다 우선합니다.
        </Note>
      </Section>

      {/* ── 덱 구성 ── */}
      <Section title="덱 구성 규칙">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold mb-2">메인 덱 — 50장</p>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1">
              <li>· 유닛 / 파일럿 / 커맨드 / 베이스 카드로 구성</li>
              <li>· 1색 또는 2색으로만 구성</li>
              <li>· 같은 카드 No. 최대 4장</li>
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold mb-2">리소스 덱 — 10장</p>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1">
              <li>· 리소스 카드로만 구성</li>
              <li>· 같은 카드 No. 제한 없음</li>
            </ul>
          </div>
        </div>
        <div className="rounded-md border p-3 flex flex-col gap-2 text-xs">
          <p className="font-semibold">카드 플레이 조건</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Lv.(레벨)</span>
              <p>자신의 리소스 총 수 ≥ 카드 Lv. 이면 플레이 가능. 액티브/레스트 불문.</p>
            </div>
            <div>
              <span className="font-medium text-foreground">코스트</span>
              <p>액티브 리소스를 필요한 수만큼 레스트시켜 지불.</p>
            </div>
          </div>
        </div>
        <Note>
          리소스 에어리어 최대 15장 (EX 리소스는 최대 5장 포함).
          패 상한은 10장 (엔드 페이즈 핸드 스텝에 초과분 버림).
        </Note>
      </Section>

      {/* ── 카드 타입 ── */}
      <Section title="카드 타입 (5종)">
        <div className="flex flex-col gap-2">
          {(
            [
              {
                name: "유닛",
                color: "bg-blue-50 border-blue-200",
                head: "text-blue-700",
                desc: "플레이 시 배틀 에어리어에 배치. 상한 6기.",
                attrs: ["AP (공격력)", "HP (내구력)", "링크 조건"],
                notes: [
                  "배치 직후 그 턴에는 어택 불가 (링크 유닛 예외).",
                  "링크 조건 만족 파일럿 세트 = 링크 유닛 → 배치 턴 즉시 어택 가능.",
                  "HP 0 → 파괴 → 트래시.",
                  "배틀 에어리어의 유닛 색은 세트된 파일럿 색 영향 없음.",
                ],
              },
              {
                name: "파일럿",
                color: "bg-pink-50 border-pink-200",
                head: "text-pink-700",
                desc: "플레이 시 배틀 에어리어 유닛 아래에 세트. 유닛 1기에 1명.",
                attrs: ["AP 수정치 (+N)", "HP 수정치 (+N)"],
                notes: [
                  "카드 명 위 텍스트 → 파일럿 자신의 효과 (주로 【버스트】).",
                  "카드 명 아래 텍스트 → 세트된 유닛이 얻는 효과.",
                  "파일럿의 특징은 유닛에 추가되지 않음.",
                  "임의 교체/제거 불가. 유닛 이동 시 파일럿도 함께 이동.",
                ],
              },
              {
                name: "커맨드",
                color: "bg-teal-50 border-teal-200",
                head: "text-teal-700",
                desc: "플레이 시 커맨드 효과를 발동. 발동 후 트래시 (효과로 이동 지정 없을 경우).",
                attrs: ["【메인】 또는 【액션】 타이밍"],
                notes: [
                  "효과 발동 중에는 어느 영역에도 없는 것으로 취급.",
                  "【파일럿】 보유 시: 효과 발동 대신 파일럿으로 유닛에 세트 가능.",
                  "【버스트】 보유 가능.",
                  "커맨드 효과 대상 선택 불가 시 플레이 불가.",
                ],
              },
              {
                name: "베이스",
                color: "bg-gray-50 border-gray-200",
                head: "text-gray-700",
                desc: "플레이 시 실드 에어리어 베이스 존에 배치. 상한 1장.",
                attrs: ["AP (공격력)", "HP (내구력)"],
                notes: [
                  "베이스가 있는 동안 실드 에어리어에 가해지는 대미지는 베이스가 우선 흡수.",
                  "HP 0 → 파괴 → 트래시.",
                ],
              },
              {
                name: "리소스",
                color: "bg-yellow-50 border-yellow-200",
                head: "text-yellow-700",
                desc: "리소스 덱에서 리소스 에어리어에 직접 배치. 코스트 지불에 사용.",
                attrs: [],
                notes: [
                  "액티브 리소스를 레스트시켜 코스트 지불.",
                  "Lv. 판정은 액티브/레스트 불문 총 수 기준.",
                ],
              },
            ] as const
          ).map((ct) => (
            <div key={ct.name} className={cn("rounded-md border p-3", ct.color)}>
              <p className={cn("text-xs font-bold mb-1", ct.head)}>{ct.name}</p>
              <p className="text-xs mb-2">{ct.desc}</p>
              {ct.attrs.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {ct.attrs.map((a) => (
                    <span
                      key={a}
                      className="text-[10px] bg-white/70 border rounded px-1.5 py-0.5"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {ct.notes.map((n, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    · {n}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Note>
          <span className="font-medium">EX 베이스:</span> AP 0 / HP 3 베이스 토큰. 게임 시작 시 베이스 존에 자동 배치.
          {"\n"}
          <span className="font-medium">EX 리소스:</span> 코스트 지불 1회용 리소스 토큰. 후공 플레이어에게 1장 제공. 사용 후 제거.
        </Note>
      </Section>

      {/* ── 게임 준비 ── */}
      <Section title="게임 준비 순서">
        <ol className="flex flex-col gap-2">
          {[
            "덱(50장)과 리소스 덱(10장)을 준비하고 충분히 셔플.",
            "가위바위보 등으로 선공·후공 결정.",
            "각 플레이어 덱에서 5장 드로우해 첫 패로.",
            "선공 플레이어부터 순서대로 1회 멀리건 가능 (패 전체를 덱 아래에 돌려놓고 5장 다시 드로우 후 덱 셔플). 선택 사항.",
            "각 플레이어 덱 위에서 6장을 뒷면으로 실드 존에 배치.",
            "각 플레이어 베이스 존에 EX 베이스 토큰 1장 배치.",
            "후공 플레이어만 리소스 에어리어에 EX 리소스 토큰 1장 배치.",
            "선공 플레이어 턴으로 게임 시작.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-xs">
              <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <Note>
          실드는 앞에서부터 바깥쪽으로 쌓음 (앞이 아래). 실드 존 카드는 뒷면 비공개이며 각각 HP 1로 취급.
          멀리건은 선공 플레이어 선언 후 후공 플레이어가 진행.
        </Note>
      </Section>

      {/* ── 턴 진행 ── */}
      <Section title="턴 진행 흐름">
        <div className="flex flex-col gap-2">
          {PHASES.map((phase) => (
            <div
              key={phase.label}
              className={cn("rounded-md border p-3", phase.color)}
            >
              <p className={cn("text-xs font-bold mb-2", phase.headColor)}>
                {phase.label}
              </p>
              <div className="flex flex-col gap-1.5">
                {phase.steps.map((step) => (
                  <div key={step.name} className="flex gap-2 text-xs">
                    <span className="shrink-0 font-semibold">{step.name}</span>
                    <span className="text-[11px] opacity-75 leading-relaxed">
                      {step.desc}
                    </span>
                  </div>
                ))}
              </div>
              {"note" in phase && phase.note && (
                <p className="text-[11px] mt-2 opacity-60 border-t border-current/20 pt-2">
                  {phase.note}
                </p>
              )}
            </div>
          ))}
        </div>
        <Note>
          각 페이즈/스텝에서 유발된 효과가 있으면 전부 해결 후 다음으로 진행.
          어택 중에는 패 플레이·기동메인 발동 불가.
        </Note>
      </Section>

      {/* ── 어택과 배틀 ── */}
      <Section title="어택과 배틀">
        <div className="flex flex-col gap-3">
          <Note>
            <span className="font-medium">어택 가능 조건:</span> 액티브 상태의 자신 유닛. 배치 직후 그 턴은 어택 불가 (링크 유닛 제외).
            상대 플레이어 또는 레스트 상태의 상대 유닛을 대상 선언.
          </Note>

          <div className="flex flex-col">
            {BATTLE_STEPS.map((step, i) => (
              <div key={step.name} className="flex gap-3 text-xs">
                <div className="shrink-0 flex flex-col items-center">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  {i < BATTLE_STEPS.length - 1 && (
                    <div className="w-px flex-1 min-h-2 bg-border my-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <p className="font-semibold">{step.name}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold mb-2">
              플레이어 어택 시 — 실드 에어리어 처리 순서
            </p>
            <ol className="flex flex-col gap-1 text-xs text-muted-foreground">
              <li>
                1. 베이스 있으면 → 베이스에 AP만큼 배틀 대미지. HP 0이면 파괴.
              </li>
              <li>
                2. 베이스 없고 실드 있으면 → 맨 위 실드 1장 파괴. 앞면으로 한 뒤
                【버스트】 확인 후 트래시.
              </li>
              <li>
                3. 베이스도 실드도 없으면 → 플레이어에게 배틀 대미지 → 즉시 패배.
              </li>
            </ol>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold mb-2">유닛 어택 시</p>
            <p className="text-xs text-muted-foreground">
              어택 유닛·어택 대상 유닛이 서로 AP만큼 배틀 대미지를 동시에 교환.
              HP 0이 된 유닛은 트래시에. 《선제공격》 보유 시 먼저 대미지를 주고,
              그 대미지로 상대가 파괴되면 반격 대미지를 받지 않음.
              양측 동시 파괴도 가능.
            </p>
          </div>

          <Note>
            어택 스텝/블록 스텝 종료 시 유닛이 영역 이동했다면 다음 스텝을 건너뛰고 배틀 종료 스텝으로.
            《블로커》는 1회의 어택에 1번만 발동 가능. 원래 어택 대상 유닛은 《블로커》 발동 불가.
          </Note>
        </div>
      </Section>

      {/* ── 게임 영역 ── */}
      <Section title="게임 영역 (존)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {(
            [
              {
                name: "덱 에어리어",
                type: "비공개",
                desc: "게임 덱을 두는 곳. 위에서 1장씩 드로우.",
              },
              {
                name: "리소스 덱 에어리어",
                type: "비공개",
                desc: "리소스 덱을 두는 곳.",
              },
              {
                name: "리소스 에어리어",
                type: "공개",
                desc: "리소스를 두는 곳. 최대 15장.",
              },
              {
                name: "배틀 에어리어",
                type: "공개",
                desc: "유닛·파일럿을 두는 곳. 유닛 최대 6기.",
              },
              {
                name: "실드 에어리어",
                type: "혼합",
                desc: "베이스 존(공개) + 실드 존(비공개).",
              },
              {
                name: "패",
                type: "비공개",
                desc: "드로우한 카드. 상한 10장. 자신만 열람 가능.",
              },
              {
                name: "트래시",
                type: "공개",
                desc: "파괴·사용된 카드. 순서 변경 가능.",
              },
              {
                name: "제외 에어리어",
                type: "공개",
                desc: "제외된 카드. 파괴와는 다른 처리.",
              },
            ] as const
          ).map((z) => (
            <div key={z.name} className="rounded border p-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold">{z.name}</span>
                <span
                  className={cn(
                    "text-[9px] px-1 rounded",
                    z.type === "공개"
                      ? "bg-green-100 text-green-700"
                      : z.type === "비공개"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-yellow-100 text-yellow-700",
                  )}
                >
                  {z.type}
                </span>
              </div>
              <p className="text-muted-foreground">{z.desc}</p>
            </div>
          ))}
        </div>
        <Note>
          카드가 영역 간 이동 시, 특별한 지시 없이는 새로운 카드로 취급 (이전 효과 소멸).
          리소스 에어리어·배틀 에어리어·실드 에어리어를 합쳐 「필드」라고 부르기도 함.
        </Note>
      </Section>

      {/* ── 키워드 효과 ── */}
      <Section title="키워드 효과 (어빌리티)">
        <div className="flex flex-col gap-4">
          {[
            {
              badge: <ABadge name="리페어" />,
              timing: "자신의 턴 종료 시",
              desc: "《리페어 N》: 자신의 턴 종료 시 N 회복. 여러 개 보유 시 수치 합산.",
            },
            {
              badge: <ABadge name="돌파" />,
              timing: "자신의 턴 중, 배틀 대미지로 상대 유닛 파괴 시",
              desc: "《돌파 N》: 배틀 대미지로 상대 유닛 파괴 시 상대 실드 에어리어에 N 대미지. (베이스 우선, 없으면 실드 1장.) 상대 실드/베이스가 0장이면 발동하지 않음. 여러 개 보유 시 수치 합산.",
            },
            {
              badge: <ABadge name="원호" />,
              timing: "【기동･메인】 이 유닛을 레스트",
              desc: "《원호 N》: 【기동･메인】 이 유닛을 레스트 : 다른 아군 유닛 1기를 골라 이 턴 중 AP +N. 여러 개 보유 시 수치 합산.",
            },
            {
              badge: <ABadge name="블로커" />,
              timing: "블록 스텝",
              desc: "《블로커》: 블록 스텝에 이 유닛을 레스트시켜 어택 대상을 이 유닛으로 변경. 1회 어택에 1번. 원래 어택 대상 유닛은 《블로커》 발동 불가. 한 유닛이 다수 보유 불가.",
            },
            {
              badge: <ABadge name="선제공격" />,
              timing: "대미지 스텝",
              desc: "《선제공격》: 배틀 시 상대보다 먼저 배틀 대미지 부여. 이 대미지로 상대 유닛/베이스가 파괴되면 반격 대미지를 받지 않음. 한 유닛이 다수 보유 불가.",
            },
            {
              badge: <ABadge name="고기동" />,
              timing: "어택하는 동안 상시",
              desc: "《고기동》: 이 유닛이 어택하는 동안, 상대 유닛은 《블로커》를 발동할 수 없다. 한 유닛이 다수 보유 불가.",
            },
            {
              badge: <ABadge name="제압" />,
              timing: "플레이어 어택 시",
              desc: "《제압》: 실드에 배틀 대미지를 줄 때 위에서 2개 실드에 동시 대미지. 실드 1개뿐이면 1개만. 동시 파괴된 두 실드 모두에 【버스트】가 있으면 소유자가 처리 순서 결정. 한 유닛이 다수 보유 불가.",
            },
          ].map((kw, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {kw.badge}
                <span className="text-[11px] text-muted-foreground">
                  {kw.timing}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {kw.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 키워드 (트리거) ── */}
      <Section title="키워드 (트리거)">
        <div className="flex flex-col gap-3">
          {[
            {
              badge: <TBadge name="기동･메인" />,
              desc: "자신의 메인 페이즈(유닛 어택 중 제외)에 조건을 만족해 발동하는 기동 효과.",
            },
            {
              badge: <TBadge name="기동･액션" />,
              desc: "액션 스텝에 조건을 만족해 발동하는 기동 효과.",
            },
            {
              badge: <TBadge name="메인" />,
              desc: "커맨드 카드 전용. 자신의 메인 페이즈(어택 중 제외)에 플레이해 커맨드 효과 발동.",
            },
            {
              badge: <TBadge name="액션" />,
              desc: "커맨드 카드 전용. 액션 스텝에 플레이해 커맨드 효과 발동. 【파일럿】 보유 커맨드 카드는 액션 타이밍에 파일럿으로 세트 불가.",
            },
            {
              badge: <TBadge name="버스트" />,
              desc: "실드가 파괴되어 앞면이 되었을 때, 코스트 없이 효과 발동 가능. 발동 여부는 선택. 트래시에 놓이기 전에 발동. 【버스트】 효과는 다른 유발 효과보다 최우선으로 처리.",
            },
            {
              badge: <TBadge name="배치 시" />,
              desc: "카드가 배치되었을 때 발동.",
            },
            {
              badge: <TBadge name="어택 시" />,
              desc: "유닛이 어택 스텝에 어택을 선언했을 때 발동.",
            },
            {
              badge: <TBadge name="파괴 시" />,
              desc: "유닛/베이스가 배틀 또는 효과로 파괴되어 트래시에 놓였을 때 발동. 트래시에서 발동. 카드 상태는 파괴 직전 필드 상태를 참조.",
            },
            {
              badge: <TBadge name="세트 시" />,
              desc: "유닛에 파일럿이 세트되었을 때 발동. 「【세트 시•조건】」 형식으로 조건 지정 가능.",
            },
            {
              badge: <TBadge name="세트 중" />,
              desc: "파일럿이 세트되어 있는 동안 효과를 가짐. 「【세트 중•조건】」 형식으로 조건(특징 등) 지정 가능.",
            },
            {
              badge: <TBadge name="링크 시" />,
              desc: "링크 조건을 만족하는 파일럿이 세트되었을 때 발동.",
            },
            {
              badge: <TBadge name="링크 중" />,
              desc: "링크 조건을 만족하는 파일럿이 세트되어 있는 동안 효과를 가짐.",
            },
            {
              badge: <TBadge name="턴 1회" />,
              desc: "그 턴 중 1번만 발동 가능. 같은 효과를 가진 카드가 여러 장 있어도 각각 1번씩 발동 가능.",
            },
          ].map((kw, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div>{kw.badge}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {kw.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 효과 종류 ── */}
      <Section title="효과의 종류와 해결">
        <div className="flex flex-col gap-2 text-xs">
          {[
            {
              name: "상시 효과",
              desc: "항상 발동 중. 유발 대기 없이 해당 영역에 나온 즉시 적용. 모순되는 상시 효과가 여럿이면 금지 효과 우선.",
            },
            {
              name: "유발 효과",
              desc: "특정 사건 발생 시 자동으로 유발. 동시 유발 시 턴 플레이어 효과를 먼저 해결. 새로운 효과가 유발되면 새것을 먼저 해결. 【버스트】 효과는 최우선 처리.",
            },
            {
              name: "기동 효과",
              desc: "플레이어가 임의로 발동. 「조건 : 효과」 형식. 모든 조건 만족 시 효과 발동.",
            },
            {
              name: "커맨드 효과",
              desc: "커맨드 카드를 지정 타이밍에 플레이해 발동. 대상 선택 불가 시 플레이 불가.",
            },
            {
              name: "치환 효과",
              desc: "「(A)하는 대신 (B)한다」 형식. 사건 A를 사건 B로 대체.",
            },
          ].map((e) => (
            <div key={e.name} className="rounded border p-2">
              <p className="font-semibold mb-0.5">{e.name}</p>
              <p className="text-muted-foreground leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>
        <Note>
          「한다」→ 가능한 한 처리.　「해도 좋다」→ 발동 여부 선택 가능.{"\n"}
          「그렇게 했다면」→ 앞 문장 미해결 시 뒷 문장 해결 불가.　「그 후」→ 앞 문장 결과 무관하게 뒷 문장 해결 가능.
        </Note>
      </Section>

      {/* ── 주요 용어 ── */}
      <Section title="주요 용어 정리">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            {
              term: "액티브 / 레스트",
              def: "카드를 세로로 놓은 상태 / 가로로 놓은 상태. 필드·리소스 에어리어·베이스 존 카드에 적용.",
            },
            {
              term: "배치",
              def: "유닛이나 베이스를 필드에 놓는 것.",
            },
            {
              term: "세트",
              def: "파일럿 카드(또는 【파일럿】 커맨드)가 유닛 아래에 겹쳐지는 것.",
            },
            {
              term: "파괴",
              def: "HP ≥ 대미지 or 효과로 필드에서 트래시로 이동. 실드 파괴 시 앞면으로 해 【버스트】 확인 후 트래시.",
            },
            {
              term: "제외",
              def: "어느 영역에서 제외 에어리어로 이동. 파괴와 다름.",
            },
            {
              term: "버리다",
              def: "패에서 트래시로 이동.",
            },
            {
              term: "드로우",
              def: "덱 맨 위의 카드를 비공개로 자신의 패에 더하는 것.",
            },
            {
              term: "플레이",
              def: "패의 카드를 공개하고 코스트를 지불해 사용하는 것.",
            },
            {
              term: "회복",
              def: "유닛/베이스의 대미지 카운터를 지정 수만큼 제거. HP 이상으로 회복되지는 않음.",
            },
            {
              term: "배틀 대미지 / 효과 대미지",
              def: "배틀 결과로 발생하는 대미지 / 카드 효과로 발생하는 대미지.",
            },
            {
              term: "턴 플레이어",
              def: "현재 진행 중인 턴의 플레이어.",
            },
            {
              term: "/ (슬래시)",
              def: "특징 등에서 사용 시 「또는」의 의미. 예: 〔지온〕/〔네오지온〕 = 둘 중 하나.",
            },
          ].map((e) => (
            <div key={e.term} className="rounded border p-2">
              <p className="font-semibold mb-0.5">{e.term}</p>
              <p className="text-muted-foreground leading-relaxed">{e.def}</p>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-[10px] text-muted-foreground text-center">
        건담 카드 게임 종합 규칙 Ver. 1.4.1 (2026년 1월 16일 원문 기준)
      </p>
    </div>
  );
}
