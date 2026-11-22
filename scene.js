// ─────────────────────────────────────────────
//  SCENE — 어두운 방의 소품 중 글자가 필요한 것만 채운다
//  (방 자체는 room.css 가 그림)
//  · 왼쪽 보조 모니터: 흐릿한 코드 화면
// ─────────────────────────────────────────────
(() => {
  const code = document.getElementById("code");
  if (!code) return;
  const D = window.BR_DATA;
  const lines = [
    "// program.c  —  관리 시스템 2.1",
    "#include <island.h>",
    "",
    "int tick(state_t *s) {",
    "  for (int i = 0; i < 20; i++) {",
    "    student_t *p = &s->roll[i];",
    "    if (p->dead) continue;",
    "    if (in_zone(p->pos, s->zones))",
    "      collar_trigger(p);",
    "  }",
    "  return alive(s);",
    "}",
    "",
    `/* zones: ${D.dangerZones.join(" ")} */`,
    `/* next : ${D.upcomingZones.join(" ")} */`,
    "",
    "void broadcast(int hour) {",
    "  speaker_on();",
    "  read_deaths(hour);",
    "  read_zones(hour);",
    "}",
    "",
    "> run --day 2 --hour 18",
    `> alive ${D.students.filter((s) => s.status !== "dead").length}/${D.students.length}`,
    "> _",
  ];
  code.textContent = lines.join("\n");
})();
