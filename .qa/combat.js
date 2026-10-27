// Runs inside the combat/teacher controller, sharing its DOM and audio helpers.
const problems = [
  { q: 'Which condition checks whether health is below 50?', a: ['if (health < 50)', 'for (health = 50)', 'repeat(50)'], correct: 0, why: 'An if statement runs its branch when the condition is true. health < 50 checks for health below 50.' },
  { q: 'How many times does for(let i=0;i<4;i++) execute?', a: ['3', '4', '5'], correct: 1, why: 'The counter starts at 0. The loop runs for 0, 1, 2 and 3, then stops when i reaches 4.' },
  { q: 'Which branch executes when the if condition is false?', a: ['return', 'else', 'break'], correct: 1, why: 'The else branch handles the alternative when the if condition is false.' },
  { q: 'What stops an endless while loop?', a: ['A condition eventually becoming false', 'More semicolons', 'A bigger variable'], correct: 0, why: 'A while loop checks its condition before each iteration. The loop stops when that condition becomes false.' },
  { q: 'Which protects an app from untrusted input?', a: ['Disabling all validation', 'Validating input on the server', 'Printing passwords'], correct: 1, why: 'Server-side validation checks input independently of the client, where browser checks can be bypassed.' },
  { q: 'What does && mean in a condition?', a: ['Logical AND', 'Logical OR', 'Assignment'], correct: 0, why: 'Logical AND requires both expressions to be true for the whole condition to be true.' }
];
let hp = 100, enemy = 100, repairs = 2, round = 0;
let awaiting = null, combatWon = false, roundComplete = false, animating = false;
let activeSequence = null;
const resultPanel = $('combatResult');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const reduceCombatMotion = () => motionPreference.matches || document.body.classList.contains('reduce-motion') || !!$('reducedMotion')?.checked;

// Every animation and delay belongs to one cancellable turn. Restarting or
// leaving the arena cannot let an old impact change the next battle's health.
function cancelCombatSequence() {
  if (activeSequence) {
    activeSequence.controller.abort();
    activeSequence.animations.forEach(animation => animation.cancel());
    activeSequence = null;
  }
  animating = false;
  $('combatEffects').replaceChildren();
  $('combatScene').setAttribute('aria-busy', 'false');
  $('combatStage').dataset.phase = 'ready';
  ['playerFighter', 'enemyFighter'].forEach(id => $(id).classList.remove('is-defeated'));
  const screen = $('combatScreen');
  screen.scrollTo({ top: screen.scrollTop, behavior: 'instant' });
}

function combatDelay(milliseconds, sequence) {
  return new Promise(resolve => {
    const signal = sequence.controller.signal;
    if (signal.aborted) return resolve(false);
    const done = value => { clearTimeout(timer); signal.removeEventListener('abort', abort); resolve(value); };
    const abort = () => done(false);
    const timer = setTimeout(() => done(true), milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function combatAnimate(element, frames, options, sequence) {
  if (sequence.controller.signal.aborted) return false;
  if (reduceCombatMotion() || !element.animate) return true;
  const animation = element.animate(frames, { easing: 'cubic-bezier(.22,.68,.2,1)', ...options });
  sequence.animations.add(animation);
  try { await animation.finished; return !sequence.controller.signal.aborted; }
  catch { return false; }
  finally { animation.cancel(); sequence.animations.delete(animation); }
}

function combatAnchor(fighter) {
  const scene = $('combatScene').getBoundingClientRect(), box = fighter.getBoundingClientRect();
  return { x: box.left - scene.left + box.width * .5, y: box.top - scene.top + box.height * .45, width: box.width };
}

async function combatEffect(className, anchor, text, frames, duration, sequence) {
  const effect = document.createElement('span');
  effect.className = className;
  effect.style.left = anchor.x + 'px';
  effect.style.top = anchor.y + 'px';
  if (text) effect.textContent = text;
  $('combatEffects').append(effect);
  try { return await combatAnimate(effect, frames, { duration }, sequence); }
  finally { effect.remove(); }
}

async function revealCombatStage(sequence) {
  const stage = $('combatStage').getBoundingClientRect(), screen = $('combatScreen');
  const top = screen.getBoundingClientRect().top;
  const visibleBottom = innerHeight - (innerWidth < 900 ? 80 : 20);
  // Keep the full fight in view before either character moves.
  if (stage.top < top + 12 || $('combatScene').getBoundingClientRect().bottom > visibleBottom) {
    screen.scrollTo({ top: Math.max(0, screen.scrollTop + stage.top - top - 16), behavior: reduceCombatMotion() ? 'instant' : 'smooth' });
    return combatDelay(reduceCombatMotion() ? 0 : 320, sequence);
  }
  return !sequence.controller.signal.aborted;
}

async function combatAttack(attackerId, targetId, { shielded = false, onImpact, narration }, sequence) {
  if (sequence.controller.signal.aborted) return false;
  const attacker = $(attackerId), target = $(targetId);
  const guardianAttacks = attackerId === 'playerFighter';
  const direction = guardianAttacks ? 1 : -1;
  const attackerBox = attacker.getBoundingClientRect(), targetBox = target.getBoundingClientRect();
  const distance = Math.min(180, Math.abs(targetBox.left - attackerBox.left) * .57) * direction;
  const anchor = combatAnchor(target);
  $('combatStage').dataset.phase = guardianAttacks ? 'guardian-attack' : 'sentinel-attack';
  $('combatNarration').textContent = narration;
  const movement = combatAnimate(attacker, [
    { transform: 'translateX(0) translateY(0) rotate(0deg)', offset: 0 },
    { transform: 'translateX(' + (-direction * 9) + 'px) translateY(2px) rotate(' + (-direction * 3) + 'deg)', offset: .2 },
    { transform: 'translateX(' + distance + 'px) translateY(-7px) rotate(' + (direction * 6) + 'deg)', offset: .49 },
    { transform: 'translateX(' + (distance * .94) + 'px) translateY(-3px) rotate(' + (direction * 3) + 'deg)', offset: .61 },
    { transform: 'translateX(0) translateY(0) rotate(0deg)', offset: 1 }
  ], { duration: 720, easing: 'cubic-bezier(.4,0,.2,1)' }, sequence);
  if (!await combatDelay(reduceCombatMotion() ? 65 : 340, sequence)) return false;
  const damage = onImpact();
  drawBattle();
  beep(guardianAttacks ? 'attack' : shielded ? 'defend' : 'error');
  const color = shielded ? 'is-shield' : guardianAttacks ? 'is-guardian' : 'is-sentinel';
  const recoil = combatAnimate(target, [
    { transform: 'translateX(0) rotate(0deg)' },
    { transform: 'translateX(' + (direction * (shielded ? 4 : 14)) + 'px) rotate(' + (direction * (shielded ? 1 : 4)) + 'deg)', offset: .22 },
    { transform: 'translateX(' + (-direction * 3) + 'px) rotate(' + (-direction) + 'deg)', offset: .62 },
    { transform: 'translateX(0) rotate(0deg)' }
  ], { duration: 380 }, sequence);
  const ring = combatEffect('combat-impact ' + color, anchor, '', [
    { opacity: 0, transform: 'translate(-50%,-50%) scale(.35)' },
    { opacity: .85, transform: 'translate(-50%,-50%) scale(.7)', offset: .18 },
    { opacity: 0, transform: 'translate(-50%,-50%) scale(1.55)' }
  ], 440, sequence);
  const slash = combatEffect('combat-slash ' + color, anchor, '', [
    { opacity: 0, transform: 'translate(-50%,-50%) rotate(-28deg) scaleX(.2)' },
    { opacity: .9, transform: 'translate(-50%,-50%) rotate(-28deg) scaleX(1)', offset: .2 },
    { opacity: 0, transform: 'translate(-50%,-50%) rotate(-28deg) scaleX(1.25)' }
  ], 280, sequence);
  const number = combatEffect('combat-damage ' + color, { x: anchor.x, y: anchor.y - anchor.width * .23 }, '-' + damage + ' HP', [
    { opacity: 0, transform: 'translate(-50%,0) scale(.85)' },
    { opacity: 1, transform: 'translate(-50%,-12px) scale(1)', offset: .2 },
    { opacity: 1, transform: 'translate(-50%,-27px) scale(1)', offset: .72 },
    { opacity: 0, transform: 'translate(-50%,-42px) scale(.96)' }
  ], 750, sequence);
  await Promise.all([movement, recoil, ring, slash, number]);
  return !sequence.controller.signal.aborted;
}

async function combatRestore(sequence, onRestore) {
  $('combatStage').dataset.phase = 'repair';
  $('combatNarration').textContent = 'Guardian is restoring its systems.';
  const anchor = combatAnchor($('playerFighter'));
  const healed = onRestore(); drawBattle(); beep('defend');
  await Promise.all([combatEffect('combat-impact is-healing', anchor, '', [
    { opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' },
    { opacity: .8, transform: 'translate(-50%,-50%) scale(1.15)', offset: .4 },
    { opacity: 0, transform: 'translate(-50%,-50%) scale(1.5)' }
  ], 620, sequence), combatEffect('combat-damage is-healing', { x: anchor.x, y: anchor.y - anchor.width * .23 }, '+' + healed + ' HP', [
    { opacity: 0, transform: 'translate(-50%,0)' },
    { opacity: 1, transform: 'translate(-50%,-16px)', offset: .25 },
    { opacity: 0, transform: 'translate(-50%,-40px)' }
  ], 620, sequence)]);
  return !sequence.controller.signal.aborted;
}

function focusCombatQuestion() {
  requestAnimationFrame(() => {
    if ($('combatScreen').hidden || roundComplete || animating) return;
    $('combatPrompt').focus({ preventScroll: true });
    const question = $('combatPrompt').closest('.combat-challenge'), screen = $('combatScreen');
    if (question.getBoundingClientRect().bottom > innerHeight - 72 || question.getBoundingClientRect().top < screen.getBoundingClientRect().top) {
      screen.scrollTo({ top: Math.max(0, screen.scrollTop + question.getBoundingClientRect().top - screen.getBoundingClientRect().top - 16), behavior: 'instant' });
    }
  });
}

function closeCombatResult() {
  resultPanel.hidden = true;
  roundComplete = false;
}

function resetBattle() {
  cancelCombatSequence();
  closeCombatResult();
  hp = enemy = 100;
  repairs = 2; round = 0; awaiting = null; combatWon = false;
  $('combatNarration').textContent = 'Answer correctly to launch your attack.';
  startQuestion('attack');
}

function drawBattle() {
  $('playerHp').textContent = hp + ' HP';
  $('enemyHp').textContent = enemy + ' HP';
  $('playerHpFill').style.width = hp + '%';
  $('enemyHpFill').style.width = enemy + '%';
  $('playerHpFill').parentElement.setAttribute('aria-valuenow', hp);
  $('enemyHpFill').parentElement.setAttribute('aria-valuenow', enemy);
  $('combatRound').textContent = 'ROUND ' + String(roundComplete || animating ? round || 1 : round + 1).padStart(2, '0');
  $('healBtn').textContent = 'Repair (+15 HP \u00b7 ' + repairs + (repairs === 1 ? ' charge)' : ' charges)');
  const locked = roundComplete || animating || hp === 0 || enemy === 0;
  $('attackBtn').disabled = $('defendBtn').disabled = locked;
  $('healBtn').disabled = locked || !repairs || hp === 100;
  $('combatNext').disabled = animating || !roundComplete;
  for (const action of ['attack', 'defend']) $(action + 'Btn').setAttribute('aria-pressed', String(awaiting === action));
  $('combatScene').setAttribute('aria-busy', String(animating));
}

function startQuestion(action) {
  if (roundComplete || animating || hp === 0 || enemy === 0) return;
  awaiting = action;
  $('combatStage').dataset.phase = 'ready';
  $('combatNarration').textContent = 'Answer correctly to ' + (action === 'attack' ? 'launch your attack.' : 'raise your shield.');
  const problem = problems[round % problems.length];
  $('combatPrompt').textContent = problem.q;
  $('combatMode').textContent = action === 'attack' ? 'ATTACK MODE' : 'DEFENSE MODE';
  $('combatQuestionHelp').textContent = action === 'attack' ? 'Choose the correct answer to deal 27 damage.' : 'Choose the correct answer to block 75% of the next strike.';
  $('combatQuestionStatus').textContent = 'Select one answer';
  $('combatAnswers').replaceChildren();
  problem.a.forEach((answer, index) => {
    const button = document.createElement('button'); button.type = 'button';
    const number = document.createElement('span'); number.className = 'combat-answer-number'; number.textContent = String(index + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.className = 'combat-answer-text'; label.textContent = answer;
    const mark = document.createElement('span'); mark.className = 'combat-answer-mark'; mark.setAttribute('aria-hidden', 'true');
    button.append(number, label, mark);
    button.onclick = () => answerCombat(problem, index, action);
    $('combatAnswers').append(button);
  });
  drawBattle(); focusCombatQuestion();
}

function strike(shielded = false) {
  if (enemy <= 0 || hp <= 0) return 0;
  const raw = 11 + (round % 3) * 3;
  const damage = Math.min(hp, shielded ? Math.ceil(raw * .25) : raw);
  hp -= damage;
  return damage;
}

function showCombatResult({ outcome, title, message, problem, damageTaken = 0, damageDealt = 0, healed = 0 }) {
  animating = false; roundComplete = true;
  $('combatStage').dataset.phase = 'complete';
  resultPanel.dataset.outcome = outcome;
  $('combatResultRound').textContent = 'ROUND ' + String(round || 1).padStart(2, '0');
  $('combatResultTitle').textContent = title;
  $('combatResultKicker').textContent = ({ correct: 'ANSWER VERIFIED', incorrect: 'LEARNING OPPORTUNITY', victory: 'MISSION COMPLETE', defeat: 'SIMULATION COMPLETE', repair: 'SYSTEMS RESTORED' })[outcome];
  $('combatLog').textContent = message;
  $('combatRoundDamage').textContent = (healed ? '+' + healed + ' HP repaired / ' : damageDealt + ' damage dealt / ') + damageTaken + ' damage taken';
  $('combatAnswerReview').hidden = !problem;
  $('combatCorrectAnswer').textContent = problem ? problem.a[problem.correct] : '';
  $('combatExplanation').textContent = problem ? problem.why : '';
  const finished = hp === 0 || enemy === 0;
  $('combatNextLabel').textContent = finished ? 'New battle' : 'Attack next';
  $('combatAbort').textContent = finished ? 'Return to deck' : 'Abort battle';
  $('combatNarration').textContent = title + ' ' + (finished ? message : 'Review the round below when you are ready.');
  resultPanel.hidden = false;
  drawBattle();
  resultPanel.scrollIntoView({ block: 'nearest', behavior: reduceCombatMotion() ? 'instant' : 'smooth' });
  $('combatNext').focus({ preventScroll: true });
}

async function resolveCombatTurn({ correct = false, action = 'attack', problem = null, repair = false }) {
  cancelCombatSequence();
  const sequence = { controller: new AbortController(), animations: new Set() };
  activeSequence = sequence;
  animating = true; awaiting = null;
  drawBattle();
  const beforeEnemy = enemy;
  let damageTaken = 0, healed = 0;
  if (!await revealCombatStage(sequence)) return;
  if (repair) {
    if (!await combatRestore(sequence, () => { healed = Math.min(15, 100 - hp); hp += healed; return healed; })) return;
  } else if (correct && action === 'attack') {
    if (!await combatAttack('playerFighter', 'enemyFighter', { narration: 'Correct! Guardian launches a strike.', onImpact: () => { const damage = Math.min(27, enemy); enemy -= damage; return damage; } }, sequence)) return;
  } else if (correct) {
    $('combatStage').dataset.phase = 'shield';
    $('combatNarration').textContent = 'Correct! Guardian raises its shield.';
    await combatEffect('combat-impact is-shield', combatAnchor($('playerFighter')), '', [
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.65)' },
      { opacity: .65, transform: 'translate(-50%,-50%) scale(1)', offset: .5 },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(1.08)' }
    ], 380, sequence);
    if (sequence.controller.signal.aborted) return;
  }
  if (enemy > 0) {
    if (!await combatDelay(reduceCombatMotion() ? 0 : 140, sequence)) return;
    if (!await combatAttack('enemyFighter', 'playerFighter', {
      shielded: correct && action === 'defend',
      narration: correct && action === 'defend' ? 'Sentinel strikes. Guardian blocks with its shield.' : correct ? 'Sentinel counters the attack.' : repair ? 'Sentinel counters while Guardian recovers.' : 'Incorrect answer. Sentinel launches a strike.',
      onImpact: () => { damageTaken = strike(correct && action === 'defend'); return damageTaken; }
    }, sequence)) return;
  }
  if (sequence.controller.signal.aborted) return;
  let outcome = repair ? 'repair' : correct ? 'correct' : 'incorrect';
  let title = repair ? 'Systems restored.' : correct ? 'Correct answer!' : 'Incorrect answer.';
  let message = repair ? 'Repair charge used. The Sentinel countered while your systems recovered.' : correct ? action === 'attack' ? 'Your strike landed. The Sentinel returned fire.' : 'Shield activated. You blocked most of the Sentinel\'s strike.' : 'The Sentinel landed a hit. Review the answer, then make your next move.';
  if (enemy === 0 || hp === 0) {
    const won = enemy === 0;
    outcome = won ? 'victory' : 'defeat';
    title = won ? 'Sentinel defeated!' : 'Guardian offline.';
    message = won ? 'Battle won. Your combat win has been saved to your progress.' : 'This simulation is over. Review the answer and try a new strategy.';
    const fighter = $(won ? 'enemyFighter' : 'playerFighter');
    await combatAnimate(fighter, [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: 'translateY(14px) rotate(' + (won ? 9 : -7) + 'deg)', opacity: .35 }], { duration: 500 }, sequence);
    if (sequence.controller.signal.aborted) return;
    fighter.classList.add('is-defeated');
    if (won && !combatWon) { combatWon = true; const data = loadCombat(); data.wins++; saveCombat(data); beep('success'); }
  }
  activeSequence = null;
  showCombatResult({ outcome, title, message, problem, damageTaken, damageDealt: beforeEnemy - enemy, healed });
}

function answerCombat(problem, choice, action) {
  if (!awaiting || roundComplete || animating || hp === 0 || enemy === 0) return;
  awaiting = null; round++;
  const correct = choice === problem.correct;
  [...$('combatAnswers').children].forEach((button, index) => {
    button.disabled = true;
    button.classList.toggle('is-correct', index === problem.correct);
    button.classList.toggle('is-incorrect', index === choice && !correct);
    if (index === problem.correct || index === choice) {
      const mark = button.querySelector('.combat-answer-mark'); mark.removeAttribute('aria-hidden'); mark.textContent = index === problem.correct ? 'Correct' : 'Your answer';
    }
  });
  $('combatQuestionStatus').textContent = correct ? 'Correct. Watch the arena.' : 'Incorrect. Watch the arena.';
  runCombatTurn({ correct, action, problem });
}

function runCombatTurn(turn) {
  resolveCombatTurn(turn).catch(error => {
    console.error('Combat animation:', error);
    cancelCombatSequence();
    resetBattle();
    $('combatNarration').textContent = 'The simulation restarted. Choose an answer to try again.';
  });
}

function loadCombat() {
  try { const value = JSON.parse(localStorage.getItem('cb-combat-stats')); return { wins: Number.isSafeInteger(value?.wins) && value.wins >= 0 ? value.wins : 0 }; }
  catch { return { wins: 0 }; }
}
function saveCombat(value) { try { localStorage.setItem('cb-combat-stats', JSON.stringify(value)); } catch {} }

function abortBattle() {
  cancelCombatSequence(); closeCombatResult(); awaiting = null;
  openExtra('menuScreen');
  requestAnimationFrame(() => document.querySelector('.rail-item[data-go="combat"]')?.focus());
}
$('attackBtn').onclick = () => startQuestion('attack');
$('defendBtn').onclick = () => startQuestion('defend');
$('healBtn').onclick = () => {
  if (!repairs || roundComplete || animating || hp <= 0 || enemy <= 0 || hp === 100) return;
  repairs--;
  [...$('combatAnswers').children].forEach(button => { button.disabled = true; });
  runCombatTurn({ repair: true });
};
$('combatReset').onclick = resetBattle;
$('combatNext').onclick = () => {
  if (animating || !roundComplete) return;
  const finished = hp === 0 || enemy === 0;
  closeCombatResult();
  if (finished) resetBattle(); else startQuestion('attack');
};
$('combatAbort').onclick = abortBattle;
new MutationObserver(() => { if ($('combatScreen').hidden) cancelCombatSequence(); }).observe($('combatScreen'), { attributes: true, attributeFilter: ['hidden'] });
function finishReducedMotion() { if (reduceCombatMotion()) activeSequence?.animations.forEach(animation => animation.finish()); }
motionPreference.addEventListener('change', finishReducedMotion);
$('reducedMotion')?.addEventListener('change', finishReducedMotion);
document.addEventListener('keydown', event => {
  if ($('combatScreen').hidden || roundComplete || animating || event.altKey || event.ctrlKey || event.metaKey || event.repeat || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (/^[1-3]$/.test(event.key)) {
    const button = $('combatAnswers').children[Number(event.key) - 1];
    if (button && !button.disabled) { event.preventDefault(); button.click(); }
  }
});
