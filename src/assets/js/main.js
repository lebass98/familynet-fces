// 평가 페이지: .eval-radio-wrap 안의 라디오 변경 시 textarea readonly 토글.
// 규칙
//   - 첫 번째 라디오(이견 없음)가 체크되면 → textarea readonly + .bg-gray 추가
//   - 두 번째 라디오(의견 작성)가 체크되면 → readonly 해제 + .bg-gray 제거
function initEvalRadioToggle() {
  document.querySelectorAll('.eval-radio-wrap').forEach((wrap) => {
    const radios = wrap.querySelectorAll('input[type="radio"]');
    const textarea = wrap.querySelector('textarea');
    if (!textarea || radios.length < 2) return;

    const apply = () => {
      const noOpinion = radios[0].checked;
      if (noOpinion) {
        textarea.setAttribute('readonly', '');
        textarea.classList.add('bg-gray');
      } else {
        textarea.removeAttribute('readonly');
        textarea.classList.remove('bg-gray');
      }
    };

    radios.forEach((r) => r.addEventListener('change', apply));
    apply(); // 초기 상태 동기화 (HTML 의 checked 속성 기준)
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEvalRadioToggle);
} else {
  initEvalRadioToggle();
}
