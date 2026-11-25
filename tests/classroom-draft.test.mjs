import assert from 'node:assert/strict';
import test from 'node:test';
import { classroomPage } from '../pptmaster-service/classroom-draft.mjs';
import { templateCatalog, templateLesson } from '../worker/template-catalog.js';

test('paper bridge lesson keeps the experiment sequence and projects the exit question', () => {
  const template = templateCatalog.find(entry => entry.id === 'science');
  const job = {
    lesson: templateLesson(template),
    brief: { grade: template.grade, subject: template.subject },
    count: 8,
  };
  const page = number => classroomPage(job, number);
  assert.match(page(4).svg, /两端距离.*纸张大小.*积木规格/);
  assert.match(page(5).svg, /分别测试平纸和折扇形纸.*逐个轻放积木.*重复两次/);
  assert.match(page(5).notes, /积木跌落风险/);
  assert.match(page(7).svg, /另一组纸更厚，能直接比较折法吗？/);
  assert.doesNotMatch(page(7).svg, /建议同纸测试/);
  assert.match(page(7).notes, /建议同纸测试/);
  assert.doesNotMatch(page(1).svg, /<image/);
  const image = { href: '../images/paper-bridge.jpg' };
  assert.match(classroomPage(job, 1, image).svg, /<image/);
  assert.doesNotMatch(classroomPage(job, 4, image).svg, /<image/);
});
