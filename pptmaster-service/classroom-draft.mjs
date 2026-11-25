const profiles = {
  young: {
    label: '幼儿园与小学低年级',
    guide: '每页只交代一个动作或问题，用大字和贴合课题的情境图。教学步骤和提示放在备注。',
    paper: '#FBF2E2', ink: '#263441', accent: '#265D58', pale: '#EFE4C9', body: 39,
  },
  primary: {
    label: '小学中高年级',
    guide: '用题目相关的观察素材、实验步骤和对照。让学生先预测和记录，再根据证据解释。',
    paper: '#F7F4EA', ink: '#20382F', accent: '#275445', pale: '#E6EADC', body: 34,
  },
  middle: {
    label: '初中',
    guide: '用概念关系、实验变量和流程图解释原理。先展示证据，再提问。',
    paper: '#F2F5F8', ink: '#202F43', accent: '#304F72', pale: '#DFE9F1', body: 32,
  },
  senior: {
    label: '高中及以上',
    guide: '围绕假设、证据和推理安排可比较的图表，区分观察结果与待验证猜想。',
    paper: '#F5F4EF', ink: '#232E34', accent: '#3A5158', pale: '#E5EBE8', body: 30,
  },
};

export function classroomProfile(brief = {}) {
  const grade = String(brief.grade || '');
  const detected = /高中|高[一二三]|大学|成人|十[一二]?年级|(?:10|11|12)年级/.test(grade) ? 'senior'
    : /幼儿|学前|小班|中班|大班|低年级|小学低段|[一1][至到-][三3]年级|(?:^|[^至到])(?:[一二三]|[123])年级|(?:^|[^0-9])[3-8]岁/.test(grade) ? 'young'
    : /初中|初[一二三]|[七八九789]年级/.test(grade) ? 'middle' : 'primary';
  return profiles[Object.hasOwn(profiles, brief.audience) ? brief.audience : detected];
}

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const xml = value => String(value ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\uD800-\uDFFF]/gu, '')
  .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const rect = (x, y, width, height, fill) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
const group = (name, bounds, children) => `<g id="${name}" data-pptx-bounds="${bounds}">${children}</g>`;
const textBox = (content, x, y, size, color, bold) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}"${bold ? ' font-weight="bold"' : ''}>${content}</text>`;
const text = (value, x, y, size, color, bold = false) =>
  textBox(xml(value), x, y, size, color, bold);

// Reserve width for font differences in PowerPoint and LibreOffice. Keep
// punctuation with the previous line and fit the slide, not the complete notes.
function wrap(value, width, size) {
  const max = width / size * 0.91;
  const rows = [];
  let row = '';
  let used = 0;
  for (const char of clean(value)) {
    const units = /[\x20-\x7e]/.test(char) ? 0.62 : 1.04;
    if (row && used + units > max && !/[，。；、？！：）】」》]/.test(char)) {
      rows.push(row.trim());
      row = '';
      used = 0;
    }
    row += char;
    used += units;
  }
  if (row) rows.push(row.trim());
  return rows;
}

function fit(value, width, size, limit) {
  const rows = wrap(value, width, size);
  if (rows.length <= limit) return rows;
  const sentences = clean(value).match(/[^。！？；]+[。！？；]*/g) || [];
  let excerpt = '';
  for (const sentence of sentences) {
    const next = excerpt + sentence;
    if (wrap(next, width, size).length > limit) break;
    excerpt = next;
  }
  if (excerpt) return wrap(excerpt, width, size);
  return [...rows.slice(0, limit - 1), Array.from(rows[limit - 1]).slice(0, -2).join('') + '…'];
}

function block(rows, x, y, size, spacing, color, bold = false) {
  if (!rows.length) return '';
  const [first, ...rest] = rows;
  const content = xml(first) + rest.map(row => `<tspan x="${x}" dy="${spacing}">${xml(row)}</tspan>`).join('');
  return textBox(content, x, y, size, color, bold);
}
const phaseNotes = phase => [
  phase.name + '（' + phase.minutes + ' 分钟）',
  '教师指导：' + phase.teacher,
  '学生活动：' + phase.student,
  '观察与评价：' + phase.check,
].join('\n');
function projectedQuestion(phase) {
  if (!/出口题|提问|讨论|迁移|猜想|预测/.test(phase.name)) return undefined;
  return clean(phase.teacher).match(/[“「"]([^”」"]+[？?])[”」"]/u)?.[1];
}

function cover(lesson, brief, profile, asset) {
  const { ink, accent } = profile;
  // The existing paper-bridge asset is a 4:3 illustrative photograph.
  const hasPhoto = asset?.href === '../images/paper-bridge.jpg';
  const width = hasPhoto ? 462 : 1060;
  const titleSize = hasPhoto ? 70 : 76;
  const heading = fit(lesson.title, width, titleSize, 4);
  const context = [brief?.grade || profile.label, brief?.subject].filter(Boolean).join(' · ');
  const photo = hasPhoto
    ? group('main-visual', '558 90 654 490', `<image href="${asset.href}" x="558" y="90" width="652" height="489"/>`)
    : '';
  return group('cover-title', hasPhoto ? '68 106 478 478' : '68 106 1144 478',
    rect(76, 133, 52, 6, accent)
    + block(fit(context, width, 25, 2), 76, 188, 25, 33, accent)
    + block(heading, 76, 292, titleSize, titleSize + 13, ink, true))
    + photo;
}

function goals(lesson, profile) {
  const { ink, accent, pale, body } = profile;
  const entries = lesson.objectives.map(clean).filter(Boolean).slice(0, 3);
  const size = entries.length === 1 ? body + 10 : Math.min(body + 1, 38);
  const spacing = entries.length > 1 ? 146 : 0;
  return group('heading', '68 57 1144 116', text('学习目标', 76, 142, 60, ink, true))
    + group('goals', '68 200 1144 440', entries.map((value, index) => {
      if (entries.length === 1) {
        return rect(76, 224, 52, 4, accent)
          + block(fit(value, 1060, size, 5), 76, 324, size, size + 15, ink);
      }
      const y = 258 + index * spacing;
      return rect(76, y - 46, 1100, 2, pale)
        + text(String(index + 1).padStart(2, '0'), 76, y + 8, 27, accent, true)
        + block(fit(value, 968, size, entries.length > 1 ? 2 : 5), 175, y + 10, size, 54, ink);
    }).join(''));
}

function activities(phases, part, parts, profile) {
  const { ink, accent, pale, paper, body } = profile;
  if (phases.length > 1) {
    const groups = phases.length > 3 ? phases.slice(0, 3) : phases;
    const col = Math.floor(1130 / groups.length);
    return group('heading', '68 57 1144 116', text(phases.length > 3 ? '课堂活动预览' : '课堂活动', 76, 142, 60, ink, true))
      + group('activity-sequence', '68 202 1144 438', groups.map((phase, i) => {
        const x = 76 + i * col;
        return rect(x, 224, col - 27, 3, accent)
          + block(fit(phase.name, col - 40, 33, 2), x, 296, 33, 44, accent, true)
          + block(fit(phase.student, col - 40, Math.min(body, 32), 5), x, 414, Math.min(body, 32), 43, ink);
      }).join(''));
  }
  const phase = phases[0];
  const studentTask = clean(phase.student);
  const question = projectedQuestion(phase);
  if (parts === 1 && question) {
    return group('heading', '68 53 1144 110', text(phase.name, 76, 124, 32, accent, true))
      + group('question', '68 190 1144 246', rect(76, 216, 52, 5, accent)
        + block(fit(question, 1070, 62, 2), 76, 333, 62, 75, ink, true))
      + group('student-task', '68 463 1144 175',
        block(fit(studentTask, 1060, body, 3), 76, 510, body, body + 10, ink));
  }
  if (parts === 1 && phase.name === '公平比较' && /保持不变.{0,4}改变/.test(studentTask)) {
    const fixed = clean(phase.teacher).match(/保持(.{1,32}?)一致[。；，]?$/)?.[1];
    if (fixed) {
      return group('heading', '68 57 1144 116', text('公平比较', 76, 142, 60, ink, true))
        + group('question', '68 205 1144 100', text('怎样确保两次测试可以比较？', 76, 268, 39, ink))
        + group('comparison', '68 340 1144 300', rect(76, 364, 1100, 3, accent)
          + text('保持不变', 76, 436, 34, accent, true)
          + block(fit(fixed.replace(/、(.+)和/, '、$1、'), 540, 33, 3), 76, 524, 33, 45, ink)
          + rect(640, 390, 2, 225, pale)
          + text('只改变什么？', 704, 436, 34, accent, true)
          + block(['选出要测试的一项，', '说说你的理由。'], 704, 525, 37, 46, ink));
    }
  }
  if (parts === 1 && /测试|实验/.test(phase.name)) {
    const steps = clean(phase.teacher).match(/组织测试([^，。；]+)[，；](逐[个位][^，。；]+)/u);
    if (steps) {
      const directions = ['分别测试' + steps[1].replace('、', '和'), steps[2], studentTask];
      return group('heading', '68 57 1144 116', text(phase.name, 76, 142, 60, ink, true))
        + group('experiment-steps', '68 198 1144 442', directions.map((value, index) => {
          const y = 245 + index * 132;
          return rect(76, y - 30, 1100, 2, pale)
            + text(String(index + 1).padStart(2, '0'), 76, y + 18, 28, accent, true)
            + block(fit(value, 930, body, 2), 175, y + 18, body, body + 10, ink);
        }).join(''));
    }
  }
  const steps = studentTask.match(/[^。！？；]+[。！？；]*/g) || [studentTask];
  const from = Math.floor(part * steps.length / parts);
  const to = Math.floor((part + 1) * steps.length / parts);
  const task = to > from ? steps.slice(from, to).join('') : studentTask;
  const focus = /预测|猜想|提问|导入|交流|讨论|反思/.test(phase.name);
  const mainSize = focus ? Math.max(body + 16, 46) : body + 6;
  const label = parts > 1 ? phase.name + ' · ' + (part + 1) + '/' + parts : phase.name;
  return group('heading', '68 52 1144 160',
    block(fit(label, 1100, focus ? 31 : 55, 2), 76, focus ? 122 : 135, focus ? 31 : 55, 62, focus ? pale : ink, true))
    + group('student-task', '68 226 1144 419',
      rect(76, 250, focus ? 48 : 1080, 3, focus ? pale : accent)
      + block(fit(task, 1050, mainSize, 5), 76, 340, mainSize, mainSize + 14, focus ? paper : ink, focus));
}

function closing(lesson, profile) {
  const { ink, accent, pale, body } = profile;
  const homework = lesson.homework.map(clean).find(Boolean);
  const objective = lesson.objectives.map(clean).find(Boolean);
  const action = homework || objective;
  const heading = homework ? '课后任务' : '课堂回顾';
  const size = body + 14;
  return group('heading', '68 53 1144 125', text(heading, 76, 143, 56, accent, true))
    + group('closing-task', '68 210 1144 428',
      rect(76, 236, 54, 5, accent)
      + block(fit(action, 1030, size, 5), 76, 332, size, size + 13, ink, true));
}

export function classroomPage(job, number, asset) {
  const { lesson, count, brief = {} } = job;
  const profile = classroomProfile(brief);
  const opening = number === 1;
  const ending = number === count;
  let background = profile.paper;
  let artwork;
  let notes;

  if (opening) {
    artwork = cover(lesson, brief, profile, asset);
    notes = [lesson.title, ...lesson.preparation,
      asset ? '题图为纸桥示意图，用于导入，不代表实际课堂或实验结果。' : ''].filter(Boolean);
  } else if (number === 2) {
    artwork = goals(lesson, profile);
    notes = [...lesson.objectives, ...(lesson.keypoints || []), ...(lesson.difficulties || [])];
  } else if (ending) {
    background = profile.pale;
    artwork = closing(lesson, profile);
    notes = [...lesson.assessment, ...lesson.homework];
  } else {
    const index = number - 3;
    const slots = count - 3;
    const length = lesson.phases.length;
    const phaseIndex = Math.floor(index * length / slots);
    const nextIndex = Math.floor((index + 1) * length / slots);
    const phases = lesson.phases.slice(phaseIndex, Math.max(phaseIndex + 1, nextIndex));
    const first = Math.ceil(phaseIndex * slots / length);
    const last = Math.ceil((phaseIndex + 1) * slots / length);
    if (phases.length === 1 && !(last - first === 1 && projectedQuestion(phases[0]))
      && /预测|猜想|提问|导入|交流|讨论|反思/.test(phases[0].name)) background = profile.accent;
    artwork = activities(phases, index - first, Math.max(1, last - first), profile);
    notes = phases.map(phaseNotes);
  }

  const role = opening ? 'cover' : ending ? 'ending' : 'content';
  const footer = opening ? '' : group('page-number', '1130 650 84 44',
    text(String(number).padStart(2, '0'), 1163, 681, 21, background === profile.accent ? profile.pale : profile.accent));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" data-pptx-page-role="${role}" font-family="Microsoft YaHei">`
    + rect(0, 0, 1280, 720, background) + artwork + footer + '</svg>';
  return { number, svg, notes: notes.map(note => String(note || '').trim()).filter(Boolean).join('\n\n') || lesson.title };
}
