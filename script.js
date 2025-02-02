// 전역 변수
let currentQuestions = [];
let allUnitQuestions = []; // 선택된 단원의 전체 문제들을 저장

// --- 유틸리티 함수 ---
// 배열 셔플 (Fisher-Yates)
function shuffleArray(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 배열에서 원하는 개수만큼 랜덤 샘플링
function sampleArray(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

// --- UI 요소 선택 ---
const unitSelectEl = document.getElementById("unit-select");
const genMenuEl = document.getElementById("generation-menu");
const countSelectionEl = document.getElementById("question-count-selection");
const countOptionsEl = document.getElementById("question-count-options");
const generateBtn = document.getElementById("generate-btn");
const questionsContainer = document.getElementById("questions-container");
const submitBtn = document.getElementById("submit-btn");
const resultEl = document.getElementById("result");

// 단원 선택 시 JSON 파일에서 문제 로드 후 단원 전체 문제 저장
unitSelectEl.addEventListener("change", function () {
  const unit = this.value;
  questionsContainer.innerHTML = "";
  resultEl.innerHTML = "";
  submitBtn.style.display = "none";
  genMenuEl.style.display = "none";
  if (unit) {
    fetch("questions.json")
      .then((response) => response.json())
      .then((data) => {
        if (data[unit]) {
          allUnitQuestions = data[unit];
          // 단원 선택 후 문제 생성 옵션 메뉴 표시
          genMenuEl.style.display = "block";
          // 초기화: 어떤 옵션도 선택되지 않은 상태
          document.querySelectorAll("input[name='genMode']").forEach((el) => {
            el.checked = false;
          });
          countSelectionEl.style.display = "none";
          generateBtn.style.display = "none";
        } else {
          questionsContainer.innerHTML = "<p>선택된 단원의 문제가 없습니다.</p>";
        }
      })
      .catch((error) => {
        questionsContainer.innerHTML = "<p>문제 데이터를 불러오는 데 실패했습니다.</p>";
        console.error(error);
      });
  } else {
    questionsContainer.innerHTML = "<p>단원을 선택해 주세요.</p>";
  }
});

// --- 문제 생성 옵션 변경 시 ---
document.querySelectorAll("input[name='genMode']").forEach((el) => {
  el.addEventListener("change", function () {
    const mode = this.value;
    // "무작위" 모드는 고정 20문제이므로 문제 수 선택 영역 감춤
    if (mode === "random") {
      countSelectionEl.style.display = "none";
      generateBtn.style.display = "block";
    } else {
      // 주관식, 빈칸, 객관식 모드: 문제 수 선택 영역 표시
      countSelectionEl.style.display = "block";
      // 라디오버튼으로 문제 수 선택 (5문제 단위)
      // subjective, code: 최대 25문제, mcq: 최대 50문제
      let maxCount = mode === "mcq" ? 50 : 25;
      countOptionsEl.innerHTML = "";
      for (let i = 5; i <= maxCount; i += 5) {
        const id = `count-${i}`;
        const radioHTML = `<input type="radio" name="qCount" id="${id}" value="${i}">
                           <label for="${id}">${i}문제</label>`;
        countOptionsEl.innerHTML += radioHTML;
      }
      // 기본값 선택(최소 5문제)
      document.getElementById("count-5").checked = true;
      generateBtn.style.display = "block"; // 문제 수 변경 시 항상 버튼 노출
    }
  });
});

// "문제 생성하기" 버튼 클릭 시 문제 생성
generateBtn.addEventListener("click", function () {
  const selectedModeEl = document.querySelector("input[name='genMode']:checked");
  if (!selectedModeEl) return; // 선택된 옵션이 없으면 동작하지 않음
  const selectedMode = selectedModeEl.value;
  let numQuestions = 0;
  if (selectedMode === "random") {
    numQuestions = 20; // 무작위 모드는 고정 20문제
  } else {
    numQuestions = parseInt(document.querySelector("input[name='qCount']:checked").value, 10);
  }
  
  // 문제 유형에 따른 필터링
  let filteredQuestions = [];
  if (selectedMode === "random") {
    filteredQuestions = allUnitQuestions;
  } else if (selectedMode === "subjective") {
    filteredQuestions = allUnitQuestions.filter(q => q.type === "subjective");
  } else if (selectedMode === "code") {
    filteredQuestions = allUnitQuestions.filter(q => q.type === "code");
  } else if (selectedMode === "mcq") {
    filteredQuestions = allUnitQuestions.filter(q => q.type === "mcq");
  }
  
  // 추출할 문제 수가 해당 필터의 문제 수보다 많으면 최대한 추출
  const selectedQuestions = sampleArray(filteredQuestions, numQuestions);
  currentQuestions = shuffleArray(selectedQuestions);
  renderQuestions(currentQuestions);
  submitBtn.style.display = "block";
  resultEl.innerHTML = "";
  
  // 문제 생성 후 문제 생성 옵션 영역 숨김(다시 단원 선택 시까지)
  genMenuEl.style.display = "none";
});

// --- 문제 렌더링 함수 ---
function renderQuestions(questions) {
  questionsContainer.innerHTML = "";
  questions.forEach((q, index) => {
    let qHTML = `<div class="question" id="question-${q.id}">`;
    qHTML += `<p class="question-text">${index + 1}. ${q.question.replace(/\n/g, "<br>")}</p>`;
    
    if (q.type === "mcq") {
      qHTML += `<ul>`;
      for (let option in q.options) {
        qHTML += `<li>
                      <label>
                        <input type="radio" name="q_${q.id}" value="${option}"> ${option}) ${q.options[option]}
                      </label>
                    </li>`;
      }
      qHTML += `</ul>`;
      qHTML += `<div class="feedback"></div>`;
    } else if (q.type === "code") {
      if (q.hasOwnProperty("codeSnippet") && q.hasOwnProperty("answers")) {
        let parts = q.codeSnippet.split("__");
        qHTML += `<pre><code>`;
        for (let i = 0; i < parts.length - 1; i++) {
          qHTML += parts[i];
          qHTML += `<input type="text" class="code-blank" data-index="${i}" id="input-${q.id}-${i}">`;
        }
        qHTML += parts[parts.length - 1];
        qHTML += `</code></pre>`;
        qHTML += `<div class="feedback"></div>`;
      } else {
        qHTML += `<textarea id="input-${q.id}" rows="3" placeholder="여기에 코드를 입력하세요."></textarea>`;
        qHTML += `<div class="feedback"></div>`;
      }
    } else if (q.type === "subjective") {
      qHTML += `<textarea id="input-${q.id}" rows="6" placeholder="답안을 작성하세요."></textarea>`;
      qHTML += `<div class="feedback"></div>`;
      qHTML += `<div class="correct-answer" id="answer-${q.id}" style="display:none;">정답: ${q.correctAnswer}</div>`;
    }
    
    qHTML += `</div>`;
    questionsContainer.innerHTML += qHTML;
  });
}

// --- 제출 버튼 클릭 시 채점 ---
submitBtn.addEventListener("click", function () {
  let score = 0;
  let totalAuto = 0; // 객관식 + 코드 문제 수
  
  currentQuestions.forEach((q) => {
    const qDiv = document.getElementById(`question-${q.id}`);
    const feedbackDiv = qDiv.querySelector(".feedback");
    feedbackDiv.innerHTML = "";
    
    if (q.type === "mcq") {
      totalAuto++;
      const radios = document.getElementsByName(`q_${q.id}`);
      let answered = "";
      radios.forEach((radio) => {
        if (radio.checked) answered = radio.value;
      });
      if (answered === q.correctAnswer) {
        score++;
        feedbackDiv.innerHTML = `<span class="correct">정답입니다.</span>`;
      } else {
        feedbackDiv.innerHTML = `<span class="incorrect">오답입니다. 정답: ${q.correctAnswer}</span>`;
      }
    } else if (q.type === "code") {
      totalAuto++;
      if (q.hasOwnProperty("codeSnippet") && q.hasOwnProperty("answers")) {
        let correct = true;
        let numBlanks = q.answers.length;
        for (let i = 0; i < numBlanks; i++) {
          const inputElem = document.getElementById(`input-${q.id}-${i}`);
          let userAns = inputElem ? inputElem.value.trim() : "";
          if (userAns !== q.answers[i].trim()) {
            correct = false;
          }
        }
        if (correct) {
          score++;
          feedbackDiv.innerHTML = `<span class="correct">정답입니다.</span>`;
        } else {
          feedbackDiv.innerHTML = `<span class="incorrect">오답입니다. 정답: ${q.answers.join(", ")}</span>`;
        }
      } else {
        const userAnswer = document.getElementById(`input-${q.id}`).value.trim();
        if (userAnswer === q.correctAnswer.trim()) {
          score++;
          feedbackDiv.innerHTML = `<span class="correct">정답입니다.</span>`;
        } else {
          feedbackDiv.innerHTML = `<span class="incorrect">오답입니다. 정답: ${q.correctAnswer}</span>`;
        }
      }
    } else if (q.type === "subjective") {
      const answerDiv = document.getElementById(`answer-${q.id}`);
      answerDiv.style.display = "block";
      feedbackDiv.innerHTML = `<span>주관식 문제는 직접 채점하세요.</span>`;
    }
  });
  
  resultEl.innerHTML = `자동 채점 점수: ${score} / ${totalAuto}`;
  resultEl.scrollIntoView({ behavior: "smooth" });
});

// --- 문제 렌더링 함수 ---
function renderQuestions(questions) {
  const container = document.getElementById("questions-container");
  container.innerHTML = "";
  questions.forEach((q, index) => {
    let qHTML = `<div class="question" id="question-${q.id}">`;
    qHTML += `<p class="question-text">${index + 1}. ${q.question.replace(/\n/g, "<br>")}</p>`;
    
    if (q.type === "mcq") {
      qHTML += `<ul>`;
      for (let option in q.options) {
        qHTML += `<li>
                      <label>
                        <input type="radio" name="q_${q.id}" value="${option}"> ${option}) ${q.options[option]}
                      </label>
                    </li>`;
      }
      qHTML += `</ul>`;
      qHTML += `<div class="feedback"></div>`;
    } else if (q.type === "code") {
      if (q.hasOwnProperty("codeSnippet") && q.hasOwnProperty("answers")) {
        let parts = q.codeSnippet.split("__");
        qHTML += `<pre><code>`;
        for (let i = 0; i < parts.length - 1; i++) {
          qHTML += parts[i];
          qHTML += `<input type="text" class="code-blank" data-index="${i}" id="input-${q.id}-${i}">`;
        }
        qHTML += parts[parts.length - 1];
        qHTML += `</code></pre>`;
        qHTML += `<div class="feedback"></div>`;
      } else {
        qHTML += `<textarea id="input-${q.id}" rows="3" placeholder="여기에 코드를 입력하세요."></textarea>`;
        qHTML += `<div class="feedback"></div>`;
      }
    } else if (q.type === "subjective") {
      qHTML += `<textarea id="input-${q.id}" rows="6" placeholder="답안을 작성하세요."></textarea>`;
      qHTML += `<div class="feedback"></div>`;
      qHTML += `<div class="correct-answer" id="answer-${q.id}" style="display:none;">정답: ${q.correctAnswer}</div>`;
    }
    
    // 각 문제 하단에 오류 신고 링크 추가 (문제 ID를 URL에 포함)
    const issueURL = "https://github.com/daabaat/java_site/issues/new?title=" +
                     encodeURIComponent("문제 오류 신고: " + q.id);
    qHTML += `<div class="report-container"><a href="${issueURL}" target="_blank" class="report-issue">문제 오류 신고</a></div>`;
    
    qHTML += `</div>`;
    container.innerHTML += qHTML;
  });
}
