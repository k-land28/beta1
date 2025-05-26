'use strict';

const positions = ['EP', 'MP', 'CO', 'BTN', 'SB', 'BB'];

let openraiseRangeData = null;  // openraise.jsonのデータ
let allOpenraiseHandsList = null; // openraise用の全ハンド展開

let vsOpenRangeData = null; // vs_open.jsonのデータ
let vsOpenQuestionPool = []; // vs_open用の全問題プール

// openraise.jsonの読み込み
async function loadOpenraiseRange() {
  try {
    const res = await fetch('openraise.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    openraiseRangeData = await res.json();
    allOpenraiseHandsList = buildAllHandsList(openraiseRangeData);
  } catch (e) {
    console.error('openraise.jsonの読み込みに失敗しました:', e);
  }
}

// openraise用全展開リストの生成
function buildAllHandsList(rangeData) {
  const list = [];
  for (const pos in rangeData) {
    if (pos === 'BB') continue; // openraiseではBB除外
    const hands = rangeData[pos].hands;
    for (const hand in hands) {
      list.push({
        position: pos,
        hand: hand,
        correct: hands[hand]
      });
    }
  }
  return list;
}

// openraiseモードの問題生成
function generateOpenraiseQuestion() {
  if (!allOpenraiseHandsList || allOpenraiseHandsList.length === 0) {
    return {
      situation: 'openraise.jsonのデータが読み込まれていません、または問題がありません。',
      correct: null,
      choices: [],
      position: null,
      hand: null,
      stage: 'openraise'
    };
  }
  const item = allOpenraiseHandsList[Math.floor(Math.random() * allOpenraiseHandsList.length)];
  return {
    situation: `${item.position}からOpen Raiseしますか？ハンド：${item.hand}`,
    correct: item.correct,
    choices: ['Raise', 'Fold'],
    position: item.position,
    hand: item.hand,
    stage: 'openraise'
  };
}

// vs_open.jsonの読み込みと問題プール生成
async function loadVsOpenRange() {
  try {
    const res = await fetch('vs_open.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    vsOpenRangeData = await res.json();
    buildVsOpenQuestionPool();
  } catch (e) {
    console.error('vs_open.jsonの読み込みに失敗:', e);
  }
}

function buildVsOpenQuestionPool() {
  vsOpenQuestionPool = [];
  for (const opener in vsOpenRangeData) {
    for (const hero in vsOpenRangeData[opener]) {
      const hands = vsOpenRangeData[opener][hero].hands;
      for (const hand in hands) {
        vsOpenQuestionPool.push({
          opener,
          hero,
          hand,
          answer: hands[hand]
        });
      }
    }
  }
}

// vs_openモードの問題生成
function generateVsOpenQuestion() {
  const q = vsOpenQuestionPool[Math.floor(Math.random() * vsOpenQuestionPool.length)];
  return {
    situation: `${q.opener}がオープン。あなた（${q.hero}）のハンド：${q.hand}。どうする？`,
    correct: q.answer,
    choices: [
      'Call',
      'Fold',
      '3Bet / Fold 4Bet',
      '3Bet / Call 4Bet',
      '3Bet / Raise 4Bet'
    ],
    position: q.hero,
    hand: q.hand,
    stage: 'vs_open'
  };
}

// モードに応じた問題生成
function generateRandomQuestion(mode) {
  if (mode === 'vs_open') {
    return generateVsOpenQuestion();
  }
  return {
    situation: `モード「${mode}」の問題をまだ実装していません。`,
    correct: null,
    choices: [],
    position: null,
    hand: null,
    stage: mode
  };
}

let currentMode = 'openraise';
let currentQuestion = null;

const situationText = document.getElementById('situationText');
const handText = document.getElementById('handText');
const actionButtons = document.getElementById('actionButtons');
const resultText = document.getElementById('resultText');
const nextButton = document.getElementById('nextButton');
const tabs = document.querySelectorAll('.tab-button');
const table = document.getElementById('table');

function renderPositions(selectedPosition) {
  table.innerHTML = '';
  const W = table.clientWidth;
  const H = table.clientHeight;
  const cx = W / 2;
  const cy = H / 2;
  const rx = W / 2 * 0.78;
  const ry = H / 2 * 0.78;
  const selfIndex = positions.indexOf(selectedPosition);
  if (selfIndex < 0) console.warn('renderPositions: selectedPositionが不正です。', selectedPosition);
  positions.forEach((pos, i) => {
    const relativeIndex = (i - selfIndex + positions.length) % positions.length;
    const deg = relativeIndex * (360 / positions.length) + 90;
    const rad = deg * Math.PI / 180;
    const x = cx + rx * Math.cos(rad);
    const y = cy + ry * Math.sin(rad);
    const div = document.createElement('div');
    div.className = 'position';
    div.textContent = pos;
    div.style.left = `${x - 25}px`;
    div.style.top = `${y - 15}px`;
    if (pos === selectedPosition) div.classList.add('active-position');
    table.appendChild(div);
  });
}

async function displayQuestion() {
  if (currentMode === 'openraise') {
    if (!openraiseRangeData) {
      await loadOpenraiseRange();
      if (!openraiseRangeData) {
        situationText.textContent = '問題データの読み込みに失敗しました。';
        return;
      }
    }
    currentQuestion = generateOpenraiseQuestion();
  } else if (currentMode === 'vs_open') {
    if (!vsOpenRangeData) {
      await loadVsOpenRange();
      if (!vsOpenRangeData) {
        situationText.textContent = 'vs_open.jsonの読み込みに失敗しました。';
        return;
      }
    }
    currentQuestion = generateVsOpenQuestion();
  } else {
    currentQuestion = generateRandomQuestion(currentMode);
  }

  const q = currentQuestion;
  situationText.textContent = q.situation;
  handText.textContent = '';
  resultText.textContent = '';
  actionButtons.innerHTML = '';

  if (q.position) {
    renderPositions(q.position);
  } else {
    renderPositions(null);
  }

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    if (/fold/i.test(choice)) {
      btn.classList.add('fold');
    } else if (/call/i.test(choice)) {
      btn.classList.add('call');
    } else {
      btn.classList.add('raise');
    }
    btn.addEventListener('click', () => {
      if (choice === q.correct) {
        resultText.style.color = '#0faa00';
        resultText.textContent = '正解！🎉';
      } else {
        resultText.style.color = '#ff2200';
        resultText.textContent = `不正解。正解は「${q.correct}」です。`;
      }
    });
    actionButtons.appendChild(btn);
  });
}

function switchMode(newMode) {
  currentMode = newMode;
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === newMode));
  displayQuestion();
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.mode !== currentMode) {
      switchMode(tab.dataset.mode);
    }
  });
});

nextButton.addEventListener('click', displayQuestion);

window.addEventListener('load', () => switchMode(currentMode));
