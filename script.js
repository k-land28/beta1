let mode = 'open_none';
let currentQuestion = null;
let awaiting4BetResponse = false;
let correct4BetAction = '';
let resultText = document.getElementById('resultText');

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    mode = button.getAttribute('data-mode');
    resetUI();
    loadNextQuestion();
  });
});

document.getElementById('nextButton').addEventListener('click', () => {
  resetUI();
  loadNextQuestion();
});

function resetUI() {
  document.getElementById('situationText').textContent = '';
  document.getElementById('handText').textContent = '';
  document.getElementById('actionButtons').innerHTML = '';
  resultText.textContent = '';
  awaiting4BetResponse = false;
  correct4BetAction = '';
}

async function loadNextQuestion() {
  const response = await fetch(`${mode}.json`);
  const ranges = await response.json();
  const positions = ["EP", "MP", "CO", "BTN", "SB", "BB"];
  const opener = positions[Math.floor(Math.random() * positions.length)];
  let responderOptions = positions.filter(pos => pos !== opener);
  let responder = responderOptions[Math.floor(Math.random() * responderOptions.length)];
  const betSizes = ["2bb", "3bb"];
  const betSize = betSizes[Math.floor(Math.random() * betSizes.length)];

  if (!ranges[opener] || !ranges[opener][responder] || !ranges[opener][responder][betSize]) {
    loadNextQuestion(); // 無効な組み合わせはスキップ
    return;
  }

  const hands = Object.keys(ranges[opener][responder][betSize]);
  const hand = hands[Math.floor(Math.random() * hands.length)];
  const answer = ranges[opener][responder][betSize][hand];

  currentQuestion = { opener, responder, betSize, hand, answer };

  document.getElementById('situationText').textContent = `${opener} opened ${betSize}, ${responder} のアクションは？`;
  document.getElementById('handText').textContent = `Your hand: ${hand}`;
  showAnswerButtons();
}

function showAnswerButtons() {
  const actions = ["Call", "Fold", "3Bet"];
  const container = document.getElementById('actionButtons');
  container.innerHTML = '';
  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.textContent = action;
    btn.onclick = () => handleAnswer(action);
    container.appendChild(btn);
  });
}

function handleAnswer(answer) {
  if (awaiting4BetResponse) {
    if (answer === correct4BetAction) {
      resultText.textContent = "正解！（4Betに対しての対応）";
    } else {
      resultText.textContent = `不正解！正解は ${correct4BetAction} でした`;
    }
    awaiting4BetResponse = false;
    correct4BetAction = '';
    return;
  }

  if (answer === currentQuestion.answer.action) {
    resultText.textContent = "正解！";

    if (answer === "3Bet" && currentQuestion.answer.nextAction) {
      awaiting4BetResponse = true;
      correct4BetAction = currentQuestion.answer.nextAction;
      show4BetResponseButtons();
    }
  } else {
    resultText.textContent = `不正解！正解は ${currentQuestion.answer.action} でした`;
  }
}

function show4BetResponseButtons() {
  const responses = ["5Bet", "Call 4Bet", "Fold 4Bet"];
  const container = document.getElementById('actionButtons');
  container.innerHTML = '<p>相手から4Betが返ってきたら？</p>';
  responses.forEach(response => {
    const btn = document.createElement('button');
    btn.textContent = response;
    btn.onclick = () => handleAnswer(response);
    container.appendChild(btn);
  });
}