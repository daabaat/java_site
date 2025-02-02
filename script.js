// 원하는 시험 문제 수 (각 유형별)
const desiredCounts = {
  mcq: 10,
  code: 5,
  subjective: 5,
};

let currentQuestions = [];

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

// 단원 선택 시 JSON 파일에서 문제 로드 후, 각 유형별로 랜덤 추출
document.getElementById("unit-select").addEventListener("change", function () {
  const unit = this.value;
  const container = document.getElementById("questions-container");
  container.innerHTML = "";
  document.getElementById("result").innerHTML = "";
  if (unit) {
    fetch("questions.json")
      .then((response) => response.json())
      .then((data) => {
        if (data[unit]) {
          const allQuestions = data[unit];
          // 각 유형별로 분리
          const mcqQuestions = allQuestions.filter((q) => q.type === "mcq");
          const codeQuestions = allQuestions.filter((q) => q.type === "code");
          const subjQuestions = allQuestions.filter(
            (q) => q.type === "subjective"
          );

          // 원하는 수만큼 랜덤 추출
          const selectedMCQ = sampleArray(mcqQuestions, desiredCounts.mcq);
          const selectedCode = sampleArray(codeQuestions, desiredCounts.code);
          const selectedSubj = sampleArray(
            subjQuestions,
            desiredCounts.subjective
          );

          // 합친 후 전체 셔플
          currentQuestions = shuffleArray([
            ...selectedMCQ,
            ...selectedCode,
            ...selectedSubj,
          ]);
          renderQuestions(currentQuestions);
          document.getElementById("submit-btn").style.display = "block";
        } else {
          container.innerHTML = "<p>선택된 단원의 문제가 없습니다.</p>";
          document.getElementById("submit-btn").style.display = "none";
        }
      })
      .catch((error) => {
        container.innerHTML = "<p>문제 데이터를 불러오는 데 실패했습니다.</p>";
        console.error(error);
      });
  } else {
    container.innerHTML = "<p>단원을 선택해 주세요.</p>";
    document.getElementById("submit-btn").style.display = "none";
  }
});

// --- 문제 렌더링 함수 ---
function renderQuestions(questions) {
  const container = document.getElementById("questions-container");
  container.innerHTML = "";
  questions.forEach((q, index) => {
    let qHTML = `<div class="question" id="question-${q.id}">`;
    qHTML += `<p class="question-text">${index + 1}. ${q.question.replace(
      /\n/g,
      "<br>"
    )}</p>`;

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
      // 코드 문제: 미리 작성된 코드 스니펫 내에 빈칸(마커 __)이 있음.
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
      qHTML += `<textarea id="input-${q.id}" rows="4" placeholder="답안을 작성하세요."></textarea>`;
      qHTML += `<div class="feedback"></div>`;
      qHTML += `<div class="correct-answer" id="answer-${q.id}" style="display:none;">정답: ${q.correctAnswer}</div>`;
    }

    qHTML += `</div>`;
    container.innerHTML += qHTML;
  });
}

// --- 제출 버튼 클릭 시 채점 ---
document.getElementById("submit-btn").addEventListener("click", function () {
  let score = 0;
  let totalAuto = 0; // 객관식 + 코드 문제 수

  currentQuestions.forEach((q) => {
    const qDiv = document.getElementById(`question-${q.id}`);
    const feedbackDiv = qDiv.querySelector(".feedback");
    feedbackDiv.innerHTML = ""; // 초기화

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
          feedbackDiv.innerHTML = `<span class="incorrect">오답입니다. 정답: ${q.answers.join(
            ", "
          )}</span>`;
        }
      } else {
        const userAnswer = document
          .getElementById(`input-${q.id}`)
          .value.trim();
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

  document.getElementById(
    "result"
  ).innerHTML = `자동 채점 점수: ${score} / ${totalAuto}`;
  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
});
