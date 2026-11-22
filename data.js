// ─────────────────────────────────────────────
//  CW BATTLE ROYALE — 시안용 더미 데이터
//  이름/설정은 모두 임시값입니다. 자유롭게 바꿔 쓰세요.
// ─────────────────────────────────────────────

window.BR_DATA = {
  game: {
    title: "CW BATTLE ROYALE",
    classLabel: "3학년 B반",
    day: 2,
    time: "18:00",
  },

  // 정기 방송 (상단 왼쪽 패널)
  broadcasts: [
    { time: "18:00", text: "정기 방송. 지금부터 사망자를 발표합니다. 금지구역은 C-4, F-7입니다." },
    { time: "12:00", text: "오전 동안 3명이 탈락했습니다. 남은 인원은 열심히 해주세요." },
    { time: "06:00", text: "좋은 아침입니다. 오늘의 첫 금지구역은 H-2입니다." },
  ],

  // 공지 / 규칙 (상단 오른쪽 패널)
  notices: [
    "6시간마다 정기 방송으로 사망자와 금지구역이 발표됩니다.",
    "금지구역에 머무르면 목걸이가 작동합니다.",
    "24시간 동안 사망자가 없으면 전원 실격.",
  ],

  // 금지구역 — 지도 좌표 (열 A~J, 행 1~10)
  dangerZones: ["C4", "F7", "H2"],
  // 예정 금지구역
  upcomingZones: ["E5"],

  // 학생 명부 — stats: 체력/근력/민첩/지능/운/멘탈 (0~100)
  students: [
    { id: 1,  no: "남 01", name: "강도윤", status: "alive", pos: "D3", weapon: "쇠파이프",  club: "야구부",  stats: [70, 82, 60, 45, 50, 66], note: "말수가 적지만 의리가 강하다." },
    { id: 2,  no: "남 02", name: "권시우", status: "dead",  pos: "C4", weapon: "냄비뚜껑",  club: "요리부",  stats: [40, 35, 55, 70, 20, 48], note: "1일차 12:00 방송에서 이름이 불렸다.", killedAt: "1일차 11:40" },
    { id: 3,  no: "남 03", name: "김하준", status: "alive", pos: "G6", weapon: "석궁",     club: "궁도부",  stats: [65, 58, 80, 62, 70, 55], note: "멀리서 지켜보는 쪽을 택했다." },
    { id: 4,  no: "남 04", name: "박서진", status: "alive", pos: "E8", weapon: "노트북",    club: "컴퓨터부", stats: [45, 30, 50, 95, 60, 72], note: "섬의 통신망을 노리고 있다." },
    { id: 5,  no: "남 05", name: "신우현", status: "dead",  pos: "H2", weapon: "낫",       club: "원예부",  stats: [60, 70, 52, 40, 15, 30], note: "금지구역 근처에서 발견되었다.", killedAt: "2일차 06:10" },
    { id: 6,  no: "남 06", name: "오건우", status: "alive", pos: "B7", weapon: "권총",     club: "무소속",  stats: [88, 90, 85, 75, 55, 40], note: "자원 참가자라는 소문이 돈다." },
    { id: 7,  no: "남 07", name: "윤재민", status: "hurt",  pos: "F5", weapon: "구급상자",  club: "보건부",  stats: [35, 40, 45, 80, 65, 85], note: "다친 친구를 먼저 챙긴다." },
    { id: 8,  no: "남 08", name: "정태오", status: "alive", pos: "I5", weapon: "망원경",    club: "천문부",  stats: [50, 45, 62, 78, 75, 60], note: "등대에서 섬 전체를 내려다본다." },
    { id: 9,  no: "남 09", name: "조은찬", status: "dead",  pos: "F7", weapon: "하모니카",  club: "음악부",  stats: [42, 38, 58, 60, 25, 70], note: "마지막까지 노래를 불렀다고 한다.", killedAt: "1일차 20:15" },
    { id: 10, no: "남 10", name: "한지호", status: "alive", pos: "D6", weapon: "도끼",     club: "유도부",  stats: [85, 88, 50, 40, 45, 62], note: "덩치와 달리 겁이 많다." },
    { id: 11, no: "여 01", name: "고서연", status: "alive", pos: "D3", weapon: "가위",     club: "미술부",  stats: [48, 32, 66, 74, 62, 68], note: "강도윤과 함께 움직인다." },
    { id: 12, no: "여 02", name: "남유나", status: "alive", pos: "G3", weapon: "기관총",    club: "무소속",  stats: [80, 70, 88, 82, 50, 35], note: "누구도 믿지 않는다." },
    { id: 13, no: "여 03", name: "문채원", status: "dead",  pos: "C4", weapon: "독약",     club: "과학부",  stats: [38, 25, 48, 90, 30, 42], note: "1일차 첫 방송에서 이름이 불렸다.", killedAt: "1일차 05:30" },
    { id: 14, no: "여 04", name: "배수아", status: "alive", pos: "E8", weapon: "드라이버",  club: "로봇부",  stats: [52, 44, 60, 88, 58, 64], note: "박서진의 계획을 돕는 중." },
    { id: 15, no: "여 05", name: "서하린", status: "hurt",  pos: "F5", weapon: "붕대",     club: "육상부",  stats: [62, 50, 92, 55, 48, 58], note: "다리를 다쳐 속도가 줄었다." },
    { id: 16, no: "여 06", name: "안지우", status: "alive", pos: "H8", weapon: "식칼",     club: "요리부",  stats: [55, 48, 64, 60, 52, 50], note: "무언가 숨기고 있다." },
    { id: 17, no: "여 07", name: "유다인", status: "dead",  pos: "B5", weapon: "우산",     club: "방송부",  stats: [40, 30, 52, 72, 18, 66], note: "확성기로 휴전을 외쳤다.", killedAt: "1일차 16:50" },
    { id: 18, no: "여 08", name: "이소율", status: "alive", pos: "G6", weapon: "활",       club: "궁도부",  stats: [58, 52, 76, 64, 68, 74], note: "김하준과 같은 부 출신." },
    { id: 19, no: "여 09", name: "장예린", status: "alive", pos: "C8", weapon: "손전등",    club: "문예부",  stats: [44, 30, 56, 84, 72, 80], note: "모든 일을 수첩에 기록한다." },
    { id: 20, no: "여 10", name: "최나은", status: "alive", pos: "I7", weapon: "삽",       club: "농구부",  stats: [72, 68, 74, 50, 60, 55], note: "산으로 올라가는 길을 찾는다." },
  ],

  statLabels: ["체력", "근력", "민첩", "지능", "운", "멘탈"],
};
